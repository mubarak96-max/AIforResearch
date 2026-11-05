import { deleteFile, deletePrefix, readFileBytes, saveFile } from './storage.js';

/**
 * The large parts of a document, kept in Storage instead of Firestore (whose documents stop at
 * 1 MiB, which a long thesis passes): the readable block JSON, each version's blocks, and the
 * live Yjs state the collab service saves.
 *
 *   documents/<id>/blocks.json
 *   documents/<id>/ydoc.bin
 *   documents/<id>/versions/<versionId>.json
 */

const blocksKey = (documentId: string) => `documents/${documentId}/blocks.json`;
const ydocKey = (documentId: string) => `documents/${documentId}/ydoc.bin`;
const versionKey = (documentId: string, versionId: string) => `documents/${documentId}/versions/${versionId}.json`;

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const bytes = await readFileBytes(key);
  if (!bytes) return fallback;
  try { return JSON.parse(bytes.toString('utf8')) as T; } catch { return fallback; }
}

const writeJson = (key: string, value: unknown) => saveFile(key, new TextEncoder().encode(JSON.stringify(value)), 'application/json');

export const readBlocks = (documentId: string) => readJson<unknown[]>(blocksKey(documentId), []);
export const writeBlocks = (documentId: string, blocks: unknown[]) => writeJson(blocksKey(documentId), blocks);

export async function readYdoc(documentId: string): Promise<Uint8Array | null> {
  const bytes = await readFileBytes(ydocKey(documentId));
  return bytes ? new Uint8Array(bytes) : null;
}
export const writeYdoc = (documentId: string, state: Uint8Array) => saveFile(ydocKey(documentId), state, 'application/octet-stream');
export const deleteYdoc = (documentId: string) => deleteFile(ydocKey(documentId));

export const readVersionBlocks = (documentId: string, versionId: string) => readJson<unknown[]>(versionKey(documentId, versionId), []);
export const writeVersionBlocks = (documentId: string, versionId: string, blocks: unknown[]) => writeJson(versionKey(documentId, versionId), blocks);
export const deleteVersionBlocks = (documentId: string, versionId: string) => deleteFile(versionKey(documentId, versionId));

/** Everything a deleted document kept in Storage. */
export const deleteDocumentFiles = (documentId: string) => deletePrefix(`documents/${documentId}`);
