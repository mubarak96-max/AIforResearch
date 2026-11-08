import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import { bucketName, deleteObject, deletePrefixed, downloadObject, objectMetadata, signedReadUrl, uploadObject } from '../google/storage.js';

/**
 * Uploaded files, in the project's Cloud Storage for Firebase bucket. Files are addressed by a
 * key such as `library/<user>/<id>.pdf`; storage.rules keeps the bucket closed to browsers, so
 * every read and write goes through the API (which checks access) or a signed URL.
 */

export type StoredFile = { body: ReadableStream<Uint8Array>; size: number | null; contentType: string | null };

const KEY = /^[A-Za-z0-9][A-Za-z0-9._-]*(\/[A-Za-z0-9][A-Za-z0-9._-]*)*$/;

/** Keys are relative paths of plain characters; no `..`, no leading slash. */
export function checkKey(key: string): string {
  if (!KEY.test(key) || key.split('/').some((part) => part === '..' || part === '.') || key.length > 500) {
    throw new Error(`Invalid file key: ${key.slice(0, 80)}`);
  }
  return key;
}

/** A stored reference as a key (rows imported from Postgres may hold an absolute path). */
export function keyFromRef(ref: string | null | undefined): string | null {
  if (!ref) return null;
  const key = ref.startsWith('/') ? ref.replace(/^.*?\/(library|documents|assets|imports)\//, '$1/') : ref;
  try { return checkKey(key); } catch { return null; }
}

export async function saveFile(key: string, bytes: Uint8Array, contentType: string) {
  await uploadObject(checkKey(key), bytes, contentType);
}

export async function openFile(key: string): Promise<StoredFile | null> {
  const response = await downloadObject(checkKey(key));
  if (!response?.body) return null;
  const length = response.headers.get('content-length');
  return {
    body: response.body,
    size: length === null ? null : Number(length),
    contentType: response.headers.get('content-type'),
  };
}

export async function readFileBytes(key: string): Promise<Buffer | null> {
  const response = await downloadObject(checkKey(key));
  return response ? Buffer.from(await response.arrayBuffer()) : null;
}

export async function fileExists(key: string): Promise<boolean> {
  return (await objectMetadata(checkKey(key))) !== null;
}

export async function deleteFile(key: string) {
  await deleteObject(checkKey(key)).catch((error) => console.error(`storage: delete ${key} failed: ${(error as Error).message}`));
}

/** Removes every file under a prefix (a deleted document's blocks, versions and Yjs state). */
export async function deletePrefix(prefix: string) {
  await deletePrefixed(checkKey(prefix.replace(/\/+$/, '')) + '/').catch((error) => {
    console.error(`storage: delete ${prefix}/ failed: ${(error as Error).message}`);
  });
}

/** A short-lived download link (for the converter, or a browser that needs the raw file). */
export async function signedUrl(key: string, minutes = 15): Promise<string> {
  return signedReadUrl(checkKey(key), minutes * 60);
}

/** Saves, reads back and deletes a small file (Admin › Storage "Test"). */
export async function testStorage() {
  const started = Date.now();
  const key = `writeorbit-check/${randomUUID()}.txt`;
  const body = new TextEncoder().encode(`WriteOrbit storage check ${new Date().toISOString()}`);
  await saveFile(key, body, 'text/plain');
  const read = await readFileBytes(key);
  await deleteFile(key);
  if (!read || read.toString('utf8') !== new TextDecoder().decode(body)) throw new Error('The test file could not be read back.');
  return { provider: 'firebase' as const, bucket: await bucketName(), ms: Date.now() - started };
}

const TYPES: Record<string, string> = {
  pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  json: 'application/json', bin: 'application/octet-stream',
};
export const contentTypeFor = (key: string) => TYPES[key.split('.').pop()?.toLowerCase() ?? ''] ?? 'application/octet-stream';
