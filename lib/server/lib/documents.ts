import { createHash } from 'node:crypto';
import { C, col, db, rows } from '../firebase.js';
import { searchTerms } from '../firebase.js';
import type { DocumentRow, Role } from './access.js';
import { blocksToText, countWords } from './blocks.js';
import { writeBlocks } from './documentStore.js';

/**
 * Writing documents: metadata in `documents/{id}`, blocks in Storage (documentStore). Callers
 * pass the row they already loaded and get back the row as saved (no read-back), the way
 * `update … returning *` worked before.
 */

export const documentRef = (id: string) => col(C.documents).doc(id);
export const membersRef = (documentId: string) => documentRef(documentId).collection(C.members);
/** Member document id: one per (document, email), as the old unique index was. */
export const memberDocId = (email: string) => createHash('sha1').update(email.trim().toLowerCase()).digest('hex');

const MAX_SEARCH_TEXT = 200_000;
const searchFor = (title: string, text: string) => searchTerms(`${title}\n${text.slice(0, MAX_SEARCH_TEXT)}`);

export type NewDocument = {
  id: string; ownerUserId: string; title: string; blocks: unknown[]; comments?: unknown[];
  shareSettings: Record<string, any>; activity: unknown[]; wordSettings?: Record<string, any> | null;
};

/** Creates a document; fails (ALREADY_EXISTS, code 6) when the id is taken. */
export async function createDocument(input: NewDocument): Promise<DocumentRow> {
  const text = blocksToText(input.blocks);
  const now = new Date();
  const fields = {
    owner_user_id: input.ownerUserId,
    title: input.title,
    comments: input.comments ?? [],
    share_settings: input.shareSettings,
    activity: input.activity,
    word_settings: input.wordSettings ?? null,
    word_count: countWords(text),
    has_ydoc: false,
    member_ids: [input.ownerUserId],
    member_roles: {},
    member_emails: [],
    member_count: 0,
    search_terms: searchFor(input.title, text),
    created_at: now,
    updated_at: now,
  };
  await documentRef(input.id).create(fields);
  await writeBlocks(input.id, input.blocks);
  return { id: input.id, ...fields, blocks: input.blocks } as DocumentRow;
}

export type DocumentChanges = Partial<Pick<DocumentRow, 'title' | 'blocks' | 'comments' | 'share_settings' | 'activity' | 'word_settings'>>;

/**
 * Saves changes to a loaded document. New blocks or a new title recompute the word count and
 * search terms; blocks go to Storage first so the metadata never points at text not yet saved.
 */
export async function updateDocument(current: DocumentRow, changes: DocumentChanges, options: { sessionId?: string | null } = {}): Promise<DocumentRow> {
  const next: DocumentRow = { ...current, ...changes, updated_at: new Date() };
  // `updated_by_session`: the collab service skips echoing this change back to the tab that made it.
  const fields: Record<string, unknown> = { updated_at: next.updated_at, updated_by_session: options.sessionId ?? null };
  for (const key of ['title', 'comments', 'share_settings', 'word_settings'] as const) {
    if (changes[key] !== undefined) fields[key] = changes[key] ?? null;
  }
  if (changes.activity !== undefined) fields.activity = changes.activity.slice(0, 40);
  if (changes.blocks !== undefined || (changes.title !== undefined && changes.title !== current.title)) {
    const text = blocksToText(next.blocks);
    next.word_count = countWords(text);
    fields.word_count = next.word_count;
    fields.search_terms = searchFor(next.title, text);
  }
  if (changes.blocks !== undefined) await writeBlocks(current.id, changes.blocks);
  await documentRef(current.id).update(fields);
  return next;
}

type MemberDoc = { user_id: string | null; invite_email: string; role: Role; status: string };

/**
 * Recomputes the member index on the document from its `members` subcollection:
 * `member_ids` (owner + active members: "shared with me" queries and firestore.rules),
 * `member_roles` (uid → role), `member_emails` and `member_count` (the documents list).
 * Call after any member is added, changed, claimed or removed.
 */
export async function syncMemberIndex(documentId: string) {
  await db().runTransaction(async (tx) => {
    const ref = documentRef(documentId);
    const [document, members] = await Promise.all([tx.get(ref), tx.get(membersRef(documentId))]);
    if (!document.exists) return;
    const list = rows<MemberDoc>(members);
    const active = list.filter((member) => member.status === 'active' && member.user_id);
    const roles: Record<string, Role> = {};
    for (const member of active) roles[member.user_id!] = member.role;
    tx.update(ref, {
      member_ids: [...new Set([document.get('owner_user_id') as string, ...active.map((member) => member.user_id!)])],
      member_roles: roles,
      member_emails: list.map((member) => member.invite_email),
      member_count: list.length,
    });
  });
}
