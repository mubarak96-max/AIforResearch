/**
 * Firestore access for the editor assistant: chat threads and search over the writer's
 * Library chunks (by meaning with embeddings on, else by shared words).
 */
import { randomUUID } from 'node:crypto';
import { C, col, db, getMany, row, rows } from '../firebase.js';
import { embedOne } from './embeddings.js';

export type StoredChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  selection?: string;
  sources?: unknown[];
};

export type ChatThread = {
  id: string;
  document_id: string | null;
  user_id: string;
  title: string;
  messages: StoredChatMessage[];
  updated_at: Date;
};

export type ChatThreadSummary = { id: string; title: string; updated_at: Date; message_count: number };

export type LibraryDocument = {
  id: string;
  filename: string;
  title: string | null;
  authors: unknown;
  doi: string | null;
  publisher: string | null;
  publication_date: string | null;
  abstract: string | null;
  metadata: Record<string, unknown> | null;
};

export type LibraryHit = { document: LibraryDocument; passages: { content: string; page: number | null }[] };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID.test(value);

// ------------------------------------------------------------------ chat threads

const threads = () => col(C.chatThreads);
/** Firestore documents stop at 1 MiB: past this size the oldest messages go first. */
const MAX_THREAD_BYTES = 800_000;

/** A document's threads, or the writer's standalone threads (AI Chat page) when documentId is null. */
export async function listChatThreads(userId: string, documentId: string | null): Promise<ChatThreadSummary[]> {
  const snapshot = await threads().where('user_id', '==', userId).where('document_id', '==', documentId)
    .orderBy('updated_at', 'desc').limit(50).select('title', 'updated_at', 'message_count').get();
  return rows<{ id: string; title: string; updated_at: Date; message_count?: number }>(snapshot)
    .map((thread) => ({ id: thread.id, title: thread.title, updated_at: thread.updated_at, message_count: Number(thread.message_count ?? 0) }));
}

export async function getChatThread(threadId: string, userId: string): Promise<ChatThread | null> {
  if (!isUuid(threadId)) return null;
  const thread = row<ChatThread>(await threads().doc(threadId).get());
  if (!thread || thread.user_id !== userId) return null;
  return { id: thread.id, document_id: thread.document_id ?? null, user_id: thread.user_id, title: thread.title, messages: thread.messages || [], updated_at: thread.updated_at };
}

export async function createChatThread(documentId: string | null, userId: string, title: string): Promise<ChatThread> {
  const ref = threads().doc(randomUUID());
  const now = new Date();
  await ref.create({ document_id: documentId, user_id: userId, title, messages: [], message_count: 0, created_at: now, updated_at: now });
  return { id: ref.id, document_id: documentId, user_id: userId, title, messages: [], updated_at: now };
}

/** Adds messages to a thread, keeping the newest 200 (and under Firestore's size limit). */
export async function appendChatMessages(threadId: string, messages: StoredChatMessage[]): Promise<void> {
  const ref = threads().doc(threadId);
  await db().runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) return;
    const current = snapshot.get('messages');
    let next = [...(Array.isArray(current) ? current : []), ...messages].slice(-200);
    while (next.length > 2 && Buffer.byteLength(JSON.stringify(next)) > MAX_THREAD_BYTES) next = next.slice(2);
    tx.update(ref, { messages: next, message_count: next.length, updated_at: new Date() });
  });
}

export async function deleteChatThread(threadId: string, userId: string): Promise<boolean> {
  if (!isUuid(threadId)) return false;
  const ref = threads().doc(threadId);
  return db().runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists || snapshot.get('user_id') !== userId) return false;
    tx.delete(ref);
    return true;
  });
}

// ------------------------------------------------------------------ Library

function toLibraryDocument(doc: Record<string, any>): LibraryDocument {
  return {
    id: doc.id, filename: doc.filename, title: doc.title ?? null, authors: doc.authors ?? [], doi: doc.doi ?? null,
    publisher: doc.publisher ?? null, publication_date: doc.publication_date ?? null, abstract: doc.abstract ?? null, metadata: doc.metadata ?? {},
  };
}

type ChunkHit = { document_id: string; content: string; page: number | null; score: number };

const chunkHit = (doc: FirebaseFirestore.DocumentSnapshot, score: number): ChunkHit => ({
  document_id: String(doc.get('document_id')), content: String(doc.get('content')), page: (doc.get('page') ?? null) as number | null, score,
});

/** Nearest chunks by embedding (only when embeddings are on and the chunks have them). */
async function vectorChunks(userId: string, query: string, ids: string[], limit: number): Promise<ChunkHit[] | null> {
  const embedded = await embedOne(query);
  if (!embedded) return null;
  try {
    let base: FirebaseFirestore.Query = db().collectionGroup(C.chunks).where('user_id', '==', userId).where('embedding_model', '==', embedded.model);
    // One `in` filter of up to 30 values; larger scopes are filtered afterwards.
    const narrow = ids.length > 0 && ids.length <= 30;
    if (narrow) base = base.where('document_id', 'in', ids);
    const snapshot = await base.findNearest({
      vectorField: 'embedding', queryVector: embedded.vector, limit: Math.min(1000, ids.length && !narrow ? limit * 30 : limit * 6),
      distanceMeasure: 'COSINE', distanceResultField: 'vector_distance',
    }).get();
    const scope = ids.length ? new Set(ids) : null;
    const hits = snapshot.docs
      .map((doc) => chunkHit(doc, 1 - Number(doc.get('vector_distance') ?? 1)))
      .filter((hit) => !scope || scope.has(hit.document_id));
    return hits.length ? hits : null;
  } catch (error) {
    // No vector index yet, or chunks from before embeddings were turned on: use words.
    console.error(`library vector search: ${(error as Error).message.slice(0, 200)}`);
    return null;
  }
}

/** Chunks sharing words with the query, most shared words first. */
async function wordChunks(userId: string, terms: string[], ids: string[], limit: number): Promise<ChunkHit[]> {
  const base = db().collectionGroup(C.chunks).where('user_id', '==', userId).where('terms', 'array-contains-any', terms.slice(0, 30));
  const queries = ids.length
    ? Array.from({ length: Math.ceil(ids.length / 30) }, (_, index) => base.where('document_id', 'in', ids.slice(index * 30, index * 30 + 30)).limit(400))
    : [base.limit(600)];
  const snapshots = await Promise.all(queries.map((query) => query.select('document_id', 'content', 'page', 'terms').get()));
  const wanted = new Set(terms);
  const hits: ChunkHit[] = [];
  for (const snapshot of snapshots) {
    for (const doc of snapshot.docs) {
      const chunkTerms: string[] = doc.get('terms') || [];
      const score = chunkTerms.reduce((sum, term) => sum + (wanted.has(term) ? 1 : 0), 0);
      if (score) hits.push(chunkHit(doc, score));
    }
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit * 6);
}

/**
 * Passages from the writer's Library that match `query`, grouped by document. With embeddings
 * on, by meaning (Firestore vector search); otherwise by shared words (any of them; more
 * matches rank higher). `documentIds` narrows the search when given.
 */
export async function searchLibrary(userId: string, query: string, documentIds: string[], limit: number): Promise<LibraryHit[]> {
  const terms = [...new Set((query.toLowerCase().normalize('NFKC').match(/[\p{L}\p{N}][\p{L}\p{N}-]{2,}/gu) || []))].slice(0, 12);
  if (!terms.length) return [];
  const ids = documentIds.filter(isUuid);
  if (documentIds.length && !ids.length) return [];
  const chunks = (await vectorChunks(userId, query, ids, limit)) ?? (await wordChunks(userId, terms, ids, limit));
  const documents = new Map((await getLibraryDocuments(userId, [...new Set(chunks.map((chunk) => chunk.document_id))])).map((doc) => [doc.id, doc]));
  const hits = new Map<string, LibraryHit>();
  for (const { document_id, content, page } of chunks) {
    const doc = documents.get(document_id);
    if (!doc) continue;
    const hit = hits.get(doc.id) ?? { document: doc, passages: [] };
    if (!hits.has(doc.id)) {
      if (hits.size >= limit) continue;
      hits.set(doc.id, hit);
    }
    if (hit.passages.length < 2) hit.passages.push({ content, page });
  }
  return [...hits.values()];
}

/** The writer's Library documents in these folders (Autocomplete's "limit Library to"). */
export async function libraryDocumentIdsInFolders(userId: string, folderIds: string[]): Promise<string[]> {
  const ids = folderIds.filter(isUuid);
  if (!ids.length) return [];
  const found: string[] = [];
  for (let index = 0; index < ids.length && found.length < 300; index += 30) {
    const snapshot = await col(C.libraryDocuments).where('user_id', '==', userId).where('folder_id', 'in', ids.slice(index, index + 30))
      .select().limit(300 - found.length).get();
    found.push(...snapshot.docs.map((doc) => doc.id));
  }
  return found;
}

/** The writer's own Library documents, by id (others' ids are ignored). */
export async function getLibraryDocuments(userId: string, documentIds: string[]): Promise<LibraryDocument[]> {
  const ids = documentIds.filter(isUuid);
  if (!ids.length) return [];
  const docs = await getMany<Record<string, any>>(C.libraryDocuments, ids);
  return docs.filter((doc) => doc.user_id === userId).map(toLibraryDocument);
}
