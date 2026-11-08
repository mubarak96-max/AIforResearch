import { base64url, importPrivateKey, signRs256, type Key } from './jwt.js';

/**
 * Google credentials over plain fetch and WebCrypto, so the server runs anywhere: Cloudflare
 * Workers (which cannot run the firebase-admin / google-gax stack), Cloud Run, Cloud Functions,
 * App Hosting and Node locally.
 *
 * Where the credentials come from, first match wins:
 *   1. the emulators (FIRESTORE_EMULATOR_HOST etc.): no credentials, the token `owner`
 *   2. GOOGLE_SERVICE_ACCOUNT_JSON: a service-account key's JSON (a Worker secret)
 *   3. GOOGLE_APPLICATION_CREDENTIALS: the path of such a key file (Node only)
 *   4. the metadata server of a Google runtime (Cloud Run, Functions, App Hosting)
 */

export type ServiceAccount = { project_id?: string; client_email: string; private_key: string };

const SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
const METADATA = 'http://metadata.google.internal/computeMetadata/v1';

export const emulated = () => Boolean(process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIREBASE_STORAGE_EMULATOR_HOST);

/** The build prerenders pages without the Worker's secrets: fail fast, so callers' fallbacks apply. */
function assertAvailable() {
  if (process.env.VINEXT_PRERENDER === '1') throw new Error('Google services are not available while prerendering');
}

let accountPromise: Promise<ServiceAccount | null> | null = null;
/** The service-account key (from the environment or a key file), or null on a Google runtime. */
export function serviceAccount(): Promise<ServiceAccount | null> {
  accountPromise ??= (async () => {
    const text = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
    if (text) return parseAccount(text);
    const file = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
    if (file) {
      const { readFile } = await import('node:fs/promises');
      return parseAccount(await readFile(file, 'utf8'));
    }
    return null;
  })();
  return accountPromise;
}

function parseAccount(text: string): ServiceAccount {
  const key = JSON.parse(text) as ServiceAccount;
  return { ...key, private_key: key.private_key.replace(/\\n/g, '\n') };
}

async function metadata(path: string): Promise<string> {
  const response = await fetch(`${METADATA}/${path}`, { headers: { 'Metadata-Flavor': 'Google' } });
  if (!response.ok) throw new Error(`No Google credentials: set GOOGLE_SERVICE_ACCOUNT_JSON (metadata server answered ${response.status})`);
  return response.text();
}

let projectPromise: Promise<string> | null = null;
/** The Google Cloud / Firebase project id. */
export function projectId(): Promise<string> {
  projectPromise ??= (async () => {
    const fromEnv = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
    if (fromEnv) return fromEnv;
    const account = await serviceAccount().catch(() => null);
    if (account?.project_id) return account.project_id;
    if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    try {
      const firebaseConfig = process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG) : null;
      if (firebaseConfig?.projectId) return firebaseConfig.projectId as string;
    } catch { /* not JSON */ }
    return (await metadata('project/project-id')).trim();
  })();
  projectPromise.catch(() => { projectPromise = null; });
  return projectPromise;
}

let cached: { token: string; until: number } | null = null;
let pending: Promise<string> | null = null;

/** An OAuth access token for Google APIs (cloud-platform scope), cached until shortly before it expires. */
export async function accessToken(): Promise<string> {
  assertAvailable();
  if (emulated()) return 'owner';
  if (cached && cached.until > Date.now()) return cached.token;
  pending ??= fetchToken().finally(() => { pending = null; });
  return pending;
}

async function fetchToken(): Promise<string> {
  const account = await serviceAccount();
  let token: string;
  let expiresIn: number;
  if (account) {
    const now = Math.floor(Date.now() / 1000);
    const assertion = await signJwt(account, { iss: account.client_email, scope: SCOPE, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    });
    const body = await response.json().catch(() => null) as { access_token?: string; expires_in?: number; error_description?: string } | null;
    if (!response.ok || !body?.access_token) throw new Error(`Google token exchange failed (${response.status}): ${body?.error_description || 'no token'}`);
    token = body.access_token;
    expiresIn = body.expires_in ?? 3600;
  } else {
    const body = JSON.parse(await metadata('instance/service-accounts/default/token')) as { access_token: string; expires_in: number };
    token = body.access_token;
    expiresIn = body.expires_in;
  }
  cached = { token, until: Date.now() + Math.max(60, expiresIn - 300) * 1000 };
  return token;
}

const keys = new Map<string, Promise<Key>>();
function privateKey(account: ServiceAccount): Promise<Key> {
  let key = keys.get(account.client_email);
  if (!key) { key = importPrivateKey(account.private_key); keys.set(account.client_email, key); }
  return key;
}

async function signJwt(account: ServiceAccount, claims: Record<string, unknown>): Promise<string> {
  const header = base64url(new TextEncoder().encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const payload = base64url(new TextEncoder().encode(JSON.stringify(claims)));
  const signature = await signRs256(await privateKey(account), `${header}.${payload}`);
  return `${header}.${payload}.${base64url(signature)}`;
}

/** The service account's email (the signer of signed URLs). */
export async function clientEmail(): Promise<string> {
  const account = await serviceAccount();
  return account ? account.client_email : (await metadata('instance/service-accounts/default/email')).trim();
}

/**
 * Signs bytes as the service account (RSA-SHA256): locally with the key, or on a Google runtime
 * through IAM's signBlob (the runtime account needs the Service Account Token Creator role).
 */
export async function signBytes(data: Uint8Array): Promise<Uint8Array> {
  const account = await serviceAccount();
  if (account) return signRs256(await privateKey(account), data);
  const email = await clientEmail();
  const response = await fetch(`https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(email)}:signBlob`, {
    method: 'POST',
    headers: { authorization: `Bearer ${await accessToken()}`, 'content-type': 'application/json' },
    body: JSON.stringify({ payload: base64(data) }),
  });
  const body = await response.json().catch(() => null) as { signedBlob?: string; error?: { message?: string } } | null;
  if (!response.ok || !body?.signedBlob) throw new Error(`signBlob failed (${response.status}): ${body?.error?.message || ''}`);
  return Uint8Array.from(atob(body.signedBlob), (char) => char.charCodeAt(0));
}

function base64(bytes: Uint8Array): string {
  let text = '';
  for (let index = 0; index < bytes.length; index += 0x8000) text += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  return btoa(text);
}

/** Calls a Google JSON API with the access token; throws GoogleApiError on an error answer. */
export async function googleFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('authorization', `Bearer ${await accessToken()}`);
  if (init.body && typeof init.body === 'string' && !headers.has('content-type')) headers.set('content-type', 'application/json');
  return fetch(url, { ...init, headers });
}

/** An error answer from a Google API: `status` is the canonical name (NOT_FOUND, ABORTED…). */
export class GoogleApiError extends Error {
  constructor(message: string, readonly httpStatus: number, readonly status: string, readonly body: unknown) {
    super(message);
    this.name = 'GoogleApiError';
  }
}

export async function readError(response: Response, what: string): Promise<GoogleApiError> {
  const text = await response.text().catch(() => '');
  let body: any = null;
  try { body = JSON.parse(text); } catch { /* not JSON */ }
  const error = Array.isArray(body) ? body[0]?.error : body?.error;
  const status = String(error?.status || (typeof error?.message === 'string' && /^[A-Z_]+$/.test(error.message) ? error.message : '') || httpToStatus(response.status));
  const message = String(error?.message || text || response.statusText || 'request failed').slice(0, 500);
  return new GoogleApiError(`${what}: ${status}: ${message}`, response.status, status, body);
}

function httpToStatus(code: number): string {
  return ({ 400: 'INVALID_ARGUMENT', 401: 'UNAUTHENTICATED', 403: 'PERMISSION_DENIED', 404: 'NOT_FOUND', 409: 'ABORTED', 412: 'FAILED_PRECONDITION', 429: 'RESOURCE_EXHAUSTED', 499: 'CANCELLED', 500: 'INTERNAL', 501: 'UNIMPLEMENTED', 503: 'UNAVAILABLE', 504: 'DEADLINE_EXCEEDED' } as Record<number, string>)[code] || 'UNKNOWN';
}
