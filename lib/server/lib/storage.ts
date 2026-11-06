import { Readable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import { bucket } from '../firebase.js';

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

const file = (key: string) => bucket().file(checkKey(key));

export async function saveFile(key: string, bytes: Uint8Array, contentType: string) {
  await file(key).save(Buffer.from(bytes), { contentType, resumable: bytes.byteLength > 8 * 1024 * 1024 });
}

export async function openFile(key: string): Promise<StoredFile | null> {
  const target = file(key);
  const [metadata] = await target.getMetadata().catch(() => [null] as const);
  if (!metadata) return null;
  return {
    body: Readable.toWeb(target.createReadStream()) as ReadableStream<Uint8Array>,
    size: metadata.size === undefined ? null : Number(metadata.size),
    contentType: metadata.contentType ?? null,
  };
}

export async function readFileBytes(key: string): Promise<Buffer | null> {
  try {
    const [bytes] = await file(key).download();
    return bytes;
  } catch (error) {
    if ((error as { code?: number }).code === 404) return null;
    throw error;
  }
}

export async function fileExists(key: string): Promise<boolean> {
  const [exists] = await file(key).exists();
  return exists;
}

export async function deleteFile(key: string) {
  await file(key).delete({ ignoreNotFound: true }).catch((error) => console.error(`storage: delete ${key} failed: ${(error as Error).message}`));
}

/** Removes every file under a prefix (a deleted document's blocks, versions and Yjs state). */
export async function deletePrefix(prefix: string) {
  await bucket().deleteFiles({ prefix: checkKey(prefix.replace(/\/+$/, '')) + '/', force: true }).catch((error) => {
    console.error(`storage: delete ${prefix}/ failed: ${(error as Error).message}`);
  });
}

/** A short-lived download link (for the converter, or a browser that needs the raw file). */
export async function signedUrl(key: string, minutes = 15): Promise<string> {
  const [url] = await file(key).getSignedUrl({ action: 'read', expires: Date.now() + minutes * 60_000 });
  return url;
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
  return { provider: 'firebase' as const, bucket: bucket().name, ms: Date.now() - started };
}

const TYPES: Record<string, string> = {
  pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  json: 'application/json', bin: 'application/octet-stream',
};
export const contentTypeFor = (key: string) => TYPES[key.split('.').pop()?.toLowerCase() ?? ''] ?? 'application/octet-stream';
