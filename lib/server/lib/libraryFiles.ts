import { createHash } from 'node:crypto';
import { C, col, db, deleteDeep, FieldValue, newId, row, searchTerms } from '../firebase.js';
import { env } from '../env.js';
import { pdfAuthors, pdfDoi, pdfTitle } from './pdfMetadata.js';
import { deleteFile, keyFromRef, readFileBytes, saveFile } from './storage.js';
import { embed } from './embeddings.js';

/**
 * Library documents in Firestore: `library_documents/{id}` with its text in
 * `library_documents/{id}/chunks/{chunk_index}` and the PDF in Storage
 * `library/{uid}/{id}.pdf`. Uploading the PDF is all a request does; the
 * `onLibraryPdfUploaded` Storage trigger (functions/) then calls processPdf.
 */

const CHUNK_CHARS = 1800;

export type LibraryRow = {
  id: string; user_id: string; folder_id: string | null; filename: string; file_type: string; file_path: string | null;
  file_size: number | null; title: string | null; authors: string[]; doi: string | null; doi_lower?: string | null; publisher: string | null;
  publication_date: string | null; abstract: string | null; metadata: Record<string, unknown>; processing_status: string;
  processing_error: string | null; chunk_count: number; external_id?: string | null; created_at: Date; updated_at: Date; processed_at: Date | null;
};

export const libraryDoc = (id: string) => col(C.libraryDocuments).doc(id);

/** The person's own Library document, or null (also for ids that are not theirs). */
export async function ownLibraryDocument(userId: string, id: string): Promise<LibraryRow | null> {
  if (!id || id.includes('/')) return null;
  const found = row<LibraryRow>(await libraryDoc(id).get());
  return found && found.user_id === userId ? found : null;
}

/** Splits page text into ~1,800-character chunks on paragraph or sentence edges. */
export function chunkPages(pages: { page: number; text: string }[]) {
  const chunks: { page: number; content: string }[] = [];
  for (const { page, text } of pages) {
    const clean = text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    let rest = clean;
    while (rest.length > 0) {
      if (rest.length <= CHUNK_CHARS) { chunks.push({ page, content: rest }); break; }
      let cut = rest.lastIndexOf('\n\n', CHUNK_CHARS);
      if (cut < CHUNK_CHARS * 0.5) cut = rest.lastIndexOf('. ', CHUNK_CHARS) + 1;
      if (cut < CHUNK_CHARS * 0.5) cut = CHUNK_CHARS;
      chunks.push({ page, content: rest.slice(0, cut).trim() });
      rest = rest.slice(cut).trim();
    }
  }
  return chunks.filter((chunk) => chunk.content.length > 20);
}

// ------------------------------------------------------------------ uniqueness markers

const sha1 = (value: string) => createHash('sha1').update(value).digest('hex');
export const normalizeDoi = (doi: string | null | undefined) => (doi || '').replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').trim().toLowerCase() || null;
/** `library_doi/{user}__{sha1(doi)}` (one document per DOI per person); source ids use `{user}__ext_{sha1}`. */
const doiMarker = (userId: string, doiLower: string) => col(C.libraryDoi).doc(`${userId}__${sha1(doiLower)}`);
const externalMarker = (userId: string, externalId: string) => col(C.libraryDoi).doc(`${userId}__ext_${sha1(externalId)}`);

/** The id of the person's document with this DOI, if any. */
export async function documentWithDoi(userId: string, doi: string | null | undefined): Promise<string | null> {
  const lower = normalizeDoi(doi);
  if (!lower) return null;
  const marker = await doiMarker(userId, lower).get();
  const documentId = marker.exists ? String(marker.get('document_id')) : null;
  if (!documentId) return null;
  return (await libraryDoc(documentId).get()).exists ? documentId : null;
}

/**
 * Creates a Library document unless one with the same DOI or source id exists (the markers are
 * claimed in the same transaction, which is what the unique indexes did in Postgres).
 * Returns the new id, or null for a duplicate.
 */
export async function createLibraryDocument(userId: string, fields: Partial<LibraryRow>): Promise<string | null> {
  const id = newId();
  const doiLower = normalizeDoi(fields.doi);
  const externalId = fields.external_id || null;
  const created = await db().runTransaction(async (tx) => {
    const markers = [
      ...(doiLower ? [doiMarker(userId, doiLower)] : []),
      ...(externalId ? [externalMarker(userId, externalId)] : []),
    ];
    const snapshots = markers.length ? await tx.getAll(...markers) : [];
    for (const marker of snapshots) {
      if (!marker.exists) continue;
      const other = await tx.get(libraryDoc(String(marker.get('document_id'))));
      if (other.exists) return false; // a stale marker (its document was deleted) is taken over
    }
    const now = new Date();
    tx.create(libraryDoc(id), {
      user_id: userId, folder_id: null, file_type: 'pdf', file_path: null, file_size: null, title: null, authors: [],
      doi: null, publisher: null, publication_date: null, abstract: null, metadata: {}, processing_status: 'pending',
      processing_error: null, chunk_count: 0, external_id: null, created_at: now, updated_at: now, processed_at: null,
      ...fields,
      doi_lower: doiLower,
    });
    for (const marker of markers) tx.set(marker, { user_id: userId, document_id: id, created_at: now });
    return true;
  });
  return created ? id : null;
}

/** Sets a DOI found later (in the PDF) when no other document of the person has it. */
async function adoptDoi(userId: string, documentId: string, doi: string, tx: FirebaseFirestore.Transaction): Promise<boolean> {
  const lower = normalizeDoi(doi);
  if (!lower) return false;
  const marker = doiMarker(userId, lower);
  const existing = await tx.get(marker);
  if (existing.exists && existing.get('document_id') !== documentId) {
    const other = await tx.get(libraryDoc(String(existing.get('document_id'))));
    if (other.exists) return false;
  }
  tx.set(marker, { user_id: userId, document_id: documentId, created_at: new Date() });
  return true;
}

// ------------------------------------------------------------------ chunks

type ChunkInput = { page: number | null; content: string };

/** How long writeChunks may spend on embeddings when the caller gives no deadline. */
const DEFAULT_EMBED_BUDGET_MS = 60_000;

/**
 * Replaces a document's chunks (with embeddings when they are on). Returns the count.
 * The vectors are made first, while the old chunks stay searchable, and only until `deadline`:
 * chunks past it are stored with their words only, so a huge book never loses its search to a
 * timeout (re-processing the PDF fills in the rest).
 */
export async function writeChunks(userId: string, documentId: string, chunks: ChunkInput[], options: { deadline?: number } = {}): Promise<number> {
  const chunksRef = libraryDoc(documentId).collection(C.chunks);
  const deadline = options.deadline ?? Date.now() + DEFAULT_EMBED_BUDGET_MS;
  const vectors = await embed(chunks.map((chunk) => chunk.content), 'passage', { deadline });
  await db().recursiveDelete(chunksRef);
  for (let start = 0; start < chunks.length; start += 300) {
    const batch = db().batch();
    chunks.slice(start, start + 300).forEach((chunk, offset) => {
      const index = start + offset;
      const vector = vectors?.vectors[index];
      batch.set(chunksRef.doc(String(index)), {
        user_id: userId, document_id: documentId, chunk_index: index, page: chunk.page, content: chunk.content,
        terms: searchTerms(chunk.content, 200),
        ...(vector ? { embedding: FieldValue.vector(vector), embedding_model: vectors!.model } : {}),
      });
    });
    await batch.commit();
  }
  return chunks.length;
}

/** Extracts a PDF's text through the converter and stores it as searchable chunks. */
/**
 * Embeddings stop this long after processPdf starts. The function may run 540 s; the rest is
 * room for deleting the old chunks, writing the new ones and the final update.
 */
const PDF_EMBED_DEADLINE_MS = 470_000;

export async function processPdf(documentId: string, fileKey: string) {
  const started = Date.now();
  const ref = libraryDoc(documentId);
  try {
    const current = row<LibraryRow>(await ref.get());
    if (!current) return; // deleted before the trigger ran
    await ref.update({ processing_status: 'processing', updated_at: new Date() });
    const form = new FormData();
    const bytes = await readFileBytes(fileKey);
    if (!bytes) throw new Error('The PDF file is missing.');
    form.append('file', new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }), 'document.pdf');
    const response = await fetch(`${env.convertUrl}/pdf/text`, { method: 'POST', body: form, signal: AbortSignal.timeout(180_000) });
    if (!response.ok) throw new Error(`text extraction failed (${response.status})`);
    const result = (await response.json()) as { pages: { page: number; text: string }[]; title?: string | null; metadata?: Record<string, unknown> };
    // The PDF's own title, authors and DOI, when they look real (the upload starts with the file name).
    const title = pdfTitle(result.title);
    const authors = pdfAuthors(result.metadata?.Author);
    const doi = pdfDoi(result.pages?.[0]?.text || '');
    const chunks = chunkPages(result.pages || []);
    const count = await writeChunks(current.user_id, documentId, chunks, { deadline: started + PDF_EMBED_DEADLINE_MS });
    await db().runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists) return;
      const doc = snapshot.data() as LibraryRow;
      const update: Record<string, unknown> = {
        processing_status: count ? 'completed' : 'failed',
        processing_error: count ? null : 'No text found in this PDF (it may be a scan).',
        chunk_count: count, processed_at: new Date(), updated_at: new Date(),
      };
      const fileTitle = (doc.filename || '').replace(/\.pdf$/i, '');
      if (title && (!doc.title || doc.title === fileTitle)) update.title = title;
      if (!(doc.authors || []).length && authors.length) update.authors = authors;
      if (!doc.doi && doi && (await adoptDoi(doc.user_id, documentId, doi, tx))) { update.doi = doi; update.doi_lower = normalizeDoi(doi); }
      tx.update(ref, update);
    });
  } catch (error) {
    await ref.update({ processing_status: 'failed', processing_error: (error as Error).message.slice(0, 300), updated_at: new Date() }).catch(() => undefined);
  }
}

/** Saves the PDF in Storage; the document keeps its key (`library/<user>/<id>.pdf`). */
export async function storeFile(userId: string, documentId: string, data: Uint8Array) {
  const key = `library/${userId}/${documentId}.pdf`;
  await saveFile(key, data, 'application/pdf');
  return key;
}

/** Removes a Library document: its chunks, its PDF and its DOI/source markers. */
export async function deleteLibraryDocument(document: LibraryRow) {
  const key = keyFromRef(document.file_path);
  await deleteDeep(libraryDoc(document.id));
  const markers = [
    ...(document.doi_lower || document.doi ? [doiMarker(document.user_id, document.doi_lower || normalizeDoi(document.doi)!)] : []),
    ...(document.external_id ? [externalMarker(document.user_id, document.external_id)] : []),
  ];
  for (const marker of markers) {
    const snapshot = await marker.get();
    if (snapshot.exists && snapshot.get('document_id') === document.id) await marker.delete();
  }
  if (key) await deleteFile(key);
}
