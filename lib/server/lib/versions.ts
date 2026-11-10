import { createHash } from 'node:crypto';
import { C, db, newId, row, rows } from '../firebase.js';
import type { AuthUser } from '../auth.js';
import type { DocumentRow } from './access.js';
import { displayName } from './access.js';
import { blocksToText, countWords, countBlocks } from './blocks.js';
import { documentRef } from './documents.js';
import { deleteVersionBlocks, readVersionBlocks, writeVersionBlocks } from './documentStore.js';

export type VersionReason = 'auto' | 'import' | 'manual' | 'before-restore' | 'restore' | 'ai';
export const AI_AUTHOR = 'AI for Research AI';
const AI_MERGE_MS = 5 * 60 * 1000;
const AUTO_INTERVAL_MS = 10 * 60 * 1000;
const KEEP_UNNAMED = 60;

/**
 * Version metadata lives in `documents/{id}/versions/{versionId}`; its blocks in Storage
 * (`documents/{id}/versions/{versionId}.json`). `blocks_hash` lets "same content as the newest
 * version" be checked without downloading that version's blocks.
 */
export type VersionRow = {
  id: string; created_at: Date; author_name: string; reason: VersionReason; label: string | null;
  title: string; word_count: number; block_count: number; blocks_hash?: string;
  author_user_id?: string | null; word_settings?: Record<string, any> | null;
  /** YYYY-MM-DD: the day's snapshot for the authorship record, kept like a named version. */
  daily_key?: string | null;
};

export const versionsRef = (documentId: string) => documentRef(documentId).collection(C.versions);
const hashBlocks = (blocks: unknown) => createHash('sha256').update(JSON.stringify(blocks ?? [])).digest('hex');

export function versionSummary(version: VersionRow) {
  return {
    id: version.id,
    createdAt: new Date(version.created_at).toISOString(),
    authorName: version.author_name,
    reason: version.reason,
    label: version.label ?? null,
    title: version.title,
    wordCount: version.word_count,
    blockCount: version.block_count,
  };
}

export async function listVersions(documentId: string, limit = 200): Promise<VersionRow[]> {
  return rows<VersionRow>(await versionsRef(documentId).orderBy('created_at', 'desc').limit(limit).get());
}

/** One version with its blocks, or null. */
export async function getVersion(documentId: string, versionId: string): Promise<(VersionRow & { blocks: unknown[] }) | null> {
  if (!versionId || versionId.includes('/')) return null;
  const version = row<VersionRow>(await versionsRef(documentId).doc(versionId).get());
  if (!version) return null;
  return { ...version, blocks: await readVersionBlocks(documentId, versionId) };
}

export async function renameVersion(documentId: string, versionId: string, label: string | null): Promise<VersionRow | null> {
  if (!versionId || versionId.includes('/')) return null;
  const ref = versionsRef(documentId).doc(versionId);
  const current = row<VersionRow>(await ref.get());
  if (!current) return null;
  await ref.update({ label });
  return { ...current, label };
}

/** Keeps the document's current content as a version. Same content as the newest version → that one. */
export async function createVersion(document: DocumentRow, user: AuthUser | null, reason: VersionReason, label: string | null = null): Promise<VersionRow> {
  const [latest] = await listVersions(document.id, 1);
  const hash = hashBlocks(document.blocks);
  if (latest && latest.blocks_hash === hash && latest.title === document.title) {
    if (label && !latest.label) {
      await versionsRef(document.id).doc(latest.id).update({ label });
      return { ...latest, label };
    }
    return latest;
  }
  const text = blocksToText(document.blocks);
  const counts = { word_count: countWords(text), block_count: countBlocks(document.blocks) };
  // Accepted AI text: one history entry per burst of suggestions (newest five minutes), not one per Tab.
  if (reason === 'ai' && latest && latest.reason === 'ai' && Date.now() - new Date(latest.created_at).getTime() < AI_MERGE_MS) {
    const merged = { title: document.title, label, ...counts, blocks_hash: hash, created_at: new Date() };
    await writeVersionBlocks(document.id, latest.id, document.blocks);
    await versionsRef(document.id).doc(latest.id).update(merged);
    return { ...latest, ...merged };
  }
  const id = newId();
  const version: Omit<VersionRow, 'id'> = {
    author_user_id: user?.id ?? null,
    author_name: reason === 'ai' ? AI_AUTHOR : user ? displayName(user) : '',
    reason, label, title: document.title,
    word_settings: document.word_settings ?? null,
    ...counts, blocks_hash: hash, created_at: new Date(),
  };
  // Blocks first: a version listed without its blocks would restore as an empty document.
  await writeVersionBlocks(document.id, id, document.blocks);
  await versionsRef(document.id).doc(id).set(version);
  await pruneVersions(document.id).catch((error) => console.error('version prune failed', error));
  return { id, ...version } as VersionRow;
}

/** Keep named versions and daily snapshots forever, and the newest unnamed ones. */
async function pruneVersions(documentId: string) {
  const all = await listVersions(documentId, 1000);
  const extra = all.filter((version) => !version.label && !version.daily_key).slice(KEEP_UNNAMED);
  if (!extra.length) return;
  const batch = db().batch();
  for (const version of extra) batch.delete(versionsRef(documentId).doc(version.id));
  await batch.commit();
  await Promise.all(extra.map((version) => deleteVersionBlocks(documentId, version.id)));
}

/** At most one automatic version every 10 minutes per document. */
export async function maybeAutoVersion(document: DocumentRow, user: AuthUser) {
  const [latest] = await listVersions(document.id, 1);
  if (latest && Date.now() - new Date(latest.created_at).getTime() < AUTO_INTERVAL_MS) return null;
  return createVersion(document, user, 'auto');
}

export const dayKey = (date = new Date()) => date.toISOString().slice(0, 10);

/**
 * One snapshot a day while someone writes, kept forever (pruning skips it), so the authorship
 * record can show how the document grew over weeks and months, not only the last hours.
 * Cheap when today's exists: one indexed query, and the blocks are only read when needed.
 */
export async function ensureDailyVersion(documentId: string, user: AuthUser, load: () => Promise<DocumentRow | null>) {
  const today = dayKey();
  const existing = await versionsRef(documentId).where('daily_key', '==', today).limit(1).get();
  if (!existing.empty) return null;
  const document = await load();
  if (!document) return null;
  const version = await createVersion(document, user, 'auto');
  // Same content as an older day's snapshot: nothing changed today worth keeping separately.
  if (version.daily_key) return version;
  await versionsRef(documentId).doc(version.id).update({ daily_key: today });
  return { ...version, daily_key: today };
}
