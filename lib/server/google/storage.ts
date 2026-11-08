import { clientEmail, emulated, googleFetch, projectId, readError, signBytes } from './credentials.js';

/**
 * Cloud Storage (the project's Firebase bucket) over the JSON API: fetch only, so it runs on
 * Cloudflare Workers as well as Node. The Storage emulator (FIREBASE_STORAGE_EMULATOR_HOST)
 * answers the same API.
 */

export async function bucketName(): Promise<string> {
  return process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${await projectId()}.firebasestorage.app`;
}

const host = () => {
  const emulator = process.env.FIREBASE_STORAGE_EMULATOR_HOST?.trim();
  return emulator ? `http://${emulator.replace(/^https?:\/\//, '')}` : 'https://storage.googleapis.com';
};
const objectUrl = async (key: string) => `${host()}/storage/v1/b/${encodeURIComponent(await bucketName())}/o/${encodeURIComponent(key)}`;

export type ObjectMetadata = { name: string; size?: string; contentType?: string; updated?: string };

export async function uploadObject(key: string, bytes: Uint8Array, contentType: string): Promise<void> {
  const url = `${host()}/upload/storage/v1/b/${encodeURIComponent(await bucketName())}/o?uploadType=media&name=${encodeURIComponent(key)}`;
  const response = await googleFetch(url, { method: 'POST', headers: { 'content-type': contentType }, body: bytes as unknown as RequestInit['body'] });
  if (!response.ok) throw await readError(response, `Storage upload ${key}`);
  await response.body?.cancel();
}

/** The object's metadata, or null when it does not exist. */
export async function objectMetadata(key: string): Promise<ObjectMetadata | null> {
  const response = await googleFetch(await objectUrl(key));
  if (response.status === 404) { await response.body?.cancel(); return null; }
  if (!response.ok) throw await readError(response, `Storage metadata ${key}`);
  return response.json() as Promise<ObjectMetadata>;
}

/** The object's bytes as a response (body streamed), or null when it does not exist. */
export async function downloadObject(key: string): Promise<Response | null> {
  const response = await googleFetch(`${await objectUrl(key)}?alt=media`);
  if (response.status === 404) { await response.body?.cancel(); return null; }
  if (!response.ok) throw await readError(response, `Storage download ${key}`);
  return response;
}

/** Deletes an object; a missing one is fine. */
export async function deleteObject(key: string): Promise<void> {
  const response = await googleFetch(await objectUrl(key), { method: 'DELETE' });
  await response.body?.cancel();
  if (!response.ok && response.status !== 404) throw await readError(response, `Storage delete ${key}`);
}

/** Deletes every object whose name starts with `prefix`. */
export async function deletePrefixed(prefix: string): Promise<void> {
  const bucket = encodeURIComponent(await bucketName());
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({ prefix, fields: 'items(name),nextPageToken', maxResults: '1000' });
    if (pageToken) params.set('pageToken', pageToken);
    const response = await googleFetch(`${host()}/storage/v1/b/${bucket}/o?${params}`);
    if (!response.ok) throw await readError(response, `Storage list ${prefix}`);
    const body = await response.json() as { items?: { name: string }[]; nextPageToken?: string };
    const names = (body.items || []).map((item) => item.name);
    for (let index = 0; index < names.length; index += 20) await Promise.all(names.slice(index, index + 20).map(deleteObject));
    pageToken = body.nextPageToken;
  } while (pageToken);
}

const hex = (bytes: ArrayBuffer | Uint8Array) => [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
// RFC 3986 unreserved characters stay; everything else (except the path's slashes) is escaped.
const encodeRfc3986 = (text: string) => encodeURIComponent(text).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);

/** A V4 signed URL to read the object, valid for `seconds` (at most 7 days). */
export async function signedReadUrl(key: string, seconds: number): Promise<string> {
  const bucket = await bucketName();
  if (emulated() && process.env.FIREBASE_STORAGE_EMULATOR_HOST) return `${host()}/download/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(key)}?alt=media`;
  const now = new Date();
  const datetime = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); // 20260101T000000Z
  const date = datetime.slice(0, 8);
  const scope = `${date}/auto/storage/goog4_request`;
  const email = await clientEmail();
  const path = `/${bucket}/${key.split('/').map(encodeRfc3986).join('/')}`;
  const query: [string, string][] = [
    ['X-Goog-Algorithm', 'GOOG4-RSA-SHA256'],
    ['X-Goog-Credential', `${email}/${scope}`],
    ['X-Goog-Date', datetime],
    ['X-Goog-Expires', String(Math.min(Math.max(1, Math.round(seconds)), 604800))],
    ['X-Goog-SignedHeaders', 'host'],
  ];
  const canonicalQuery = query.map(([name, value]) => `${encodeRfc3986(name)}=${encodeRfc3986(value)}`).sort().join('&');
  const canonicalRequest = ['GET', path, canonicalQuery, 'host:storage.googleapis.com', '', 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const digest = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalRequest)));
  const stringToSign = ['GOOG4-RSA-SHA256', datetime, scope, digest].join('\n');
  const signature = hex(await signBytes(new TextEncoder().encode(stringToSign)));
  return `https://storage.googleapis.com${path}?${canonicalQuery}&X-Goog-Signature=${signature}`;
}
