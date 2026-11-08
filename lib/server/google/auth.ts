import type { DecodedIdToken, UserRecord } from 'firebase-admin/auth';
import { googleFetch, projectId } from './credentials.js';
import { decodeJwt, verifyRs256 } from './jwt.js';

/**
 * Firebase Authentication (the admin parts lib/server uses) over the Identity Toolkit REST API,
 * and App Check token verification: fetch and WebCrypto only, like credentials.ts.
 * Errors carry firebase-admin's codes ('auth/user-not-found', …).
 */

const ID_TOKEN_KEYS = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const APP_CHECK_KEYS = 'https://firebaseappcheck.googleapis.com/v1/jwks';
const SKEW_SECONDS = 300;

export class FirebaseAuthError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'FirebaseAuthError';
  }
}

/** Which setting projectId() took the project from (mirrors its order), for error messages. */
function projectSource(): string {
  const names = ['FIREBASE_PROJECT_ID', 'GCLOUD_PROJECT', 'GOOGLE_CLOUD_PROJECT'] as const;
  const fromEnv = names.find((name) => process.env[name]);
  if (fromEnv) return fromEnv;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS) return 'the service-account key';
  return 'NEXT_PUBLIC_FIREBASE_PROJECT_ID / FIREBASE_CONFIG / metadata server';
}

const authEmulator = () => process.env.FIREBASE_AUTH_EMULATOR_HOST?.trim() || '';

/** Verifies a Firebase ID token (signature, project, issuer, times) and returns its claims. */
export async function verifyIdToken(token: string): Promise<DecodedIdToken> {
  const project = await projectId();
  // The Auth emulator signs nothing; firebase-admin skips the signature check there too.
  const { payload } = authEmulator() ? decodeJwt(token) : await verifyRs256(token, ID_TOKEN_KEYS);
  const now = Math.floor(Date.now() / 1000);
  const fail = (why: string) => { throw new FirebaseAuthError('auth/argument-error', `Invalid ID token: ${why}`); };
  // Project ids are not secret (every ID token carries one); naming both makes a mismatch fixable.
  if (payload.aud !== project) fail(`wrong audience (token is for "${payload.aud}", server project is "${project}" from ${projectSource()})`);
  if (payload.iss !== `https://securetoken.google.com/${project}`) fail(`wrong issuer (${payload.iss})`);
  if (typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 128) fail('no subject');
  if (typeof payload.exp !== 'number' || payload.exp + SKEW_SECONDS < now) throw new FirebaseAuthError('auth/id-token-expired', 'The ID token has expired');
  if (typeof payload.iat === 'number' && payload.iat - SKEW_SECONDS > now) fail('issued in the future');
  if (typeof payload.auth_time === 'number' && payload.auth_time - SKEW_SECONDS > now) fail('authenticated in the future');
  return { ...payload, uid: payload.sub } as DecodedIdToken;
}

/** Verifies an App Check token for this project. */
export async function verifyAppCheckToken(token: string): Promise<{ appId: string; token: Record<string, unknown> }> {
  const project = await projectId();
  const { header, payload } = await verifyRs256(token, APP_CHECK_KEYS);
  if (header.typ !== 'JWT') throw new Error('App Check token: wrong type');
  if (typeof payload.iss !== 'string' || !payload.iss.startsWith('https://firebaseappcheck.googleapis.com/')) throw new Error('App Check token: wrong issuer');
  const audiences: string[] = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  const number = payload.iss.slice('https://firebaseappcheck.googleapis.com/'.length);
  if (!audiences.includes(`projects/${project}`) && !audiences.includes(`projects/${number}`)) throw new Error('App Check token: wrong audience');
  if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) throw new Error('App Check token: expired');
  if (typeof payload.sub !== 'string' || !payload.sub) throw new Error('App Check token: no app');
  return { appId: payload.sub, token: payload };
}

// ---- User management (Identity Toolkit) ----------------------------------------------------

const ERRORS: Record<string, string> = {
  USER_NOT_FOUND: 'auth/user-not-found',
  EMAIL_EXISTS: 'auth/email-already-exists',
  DUPLICATE_LOCAL_ID: 'auth/uid-already-exists',
  DUPLICATE_EMAIL: 'auth/email-already-exists',
  INVALID_EMAIL: 'auth/invalid-email',
  WEAK_PASSWORD: 'auth/invalid-password',
  INVALID_PASSWORD: 'auth/invalid-password',
};

async function toolkit<T>(action: string, body: Record<string, unknown>): Promise<T> {
  const project = await projectId();
  const emulator = authEmulator();
  const base = emulator ? `http://${emulator}/identitytoolkit.googleapis.com` : 'https://identitytoolkit.googleapis.com';
  const response = await googleFetch(`${base}/v1/projects/${project}/${action}`, { method: 'POST', body: JSON.stringify(body) });
  const answer = await response.json().catch(() => null) as any;
  if (!response.ok) {
    const message = String(answer?.error?.message || `Identity Toolkit ${response.status}`);
    const reason = message.split(/[ :]/)[0];
    throw new FirebaseAuthError(ERRORS[reason] || 'auth/internal-error', message);
  }
  return answer as T;
}

type RawUser = {
  localId: string; email?: string; emailVerified?: boolean; displayName?: string; photoUrl?: string; phoneNumber?: string;
  disabled?: boolean; createdAt?: string; lastLoginAt?: string; customAttributes?: string;
  providerUserInfo?: { providerId: string; rawId?: string; email?: string; displayName?: string; photoUrl?: string; phoneNumber?: string }[];
};

function userRecord(raw: RawUser): UserRecord {
  const record = {
    uid: raw.localId,
    email: raw.email,
    emailVerified: Boolean(raw.emailVerified),
    displayName: raw.displayName,
    photoURL: raw.photoUrl,
    phoneNumber: raw.phoneNumber,
    disabled: Boolean(raw.disabled),
    metadata: {
      creationTime: raw.createdAt ? new Date(Number(raw.createdAt)).toUTCString() : undefined,
      lastSignInTime: raw.lastLoginAt ? new Date(Number(raw.lastLoginAt)).toUTCString() : undefined,
    },
    customClaims: raw.customAttributes ? JSON.parse(raw.customAttributes) : undefined,
    providerData: (raw.providerUserInfo || []).map((info) => ({
      uid: info.rawId ?? '', providerId: info.providerId, email: info.email, displayName: info.displayName, photoURL: info.photoUrl, phoneNumber: info.phoneNumber,
    })),
  };
  return record as unknown as UserRecord;
}

export async function getUser(uid: string): Promise<UserRecord> {
  const answer = await toolkit<{ users?: RawUser[] }>('accounts:lookup', { localId: [uid] });
  const user = answer.users?.[0];
  if (!user) throw new FirebaseAuthError('auth/user-not-found', 'There is no user record corresponding to the provided identifier.');
  return userRecord(user);
}

export type CreateUser = { uid?: string; email?: string; password?: string; displayName?: string | null; emailVerified?: boolean; disabled?: boolean };
export async function createUser(input: CreateUser): Promise<UserRecord> {
  const answer = await toolkit<{ localId: string }>('accounts', {
    ...(input.uid ? { localId: input.uid } : {}),
    ...(input.email ? { email: input.email } : {}),
    ...(input.password ? { password: input.password } : {}),
    ...(input.displayName ? { displayName: input.displayName } : {}),
    ...(input.emailVerified !== undefined ? { emailVerified: input.emailVerified } : {}),
    ...(input.disabled !== undefined ? { disabled: input.disabled } : {}),
  });
  return getUser(answer.localId);
}

export type UpdateUser = { displayName?: string | null; password?: string; email?: string; emailVerified?: boolean; disabled?: boolean; providersToUnlink?: string[] };
export async function updateUser(uid: string, input: UpdateUser): Promise<UserRecord> {
  const deleteAttribute: string[] = [];
  const body: Record<string, unknown> = { localId: uid };
  if (input.displayName === null) deleteAttribute.push('DISPLAY_NAME');
  else if (input.displayName !== undefined) body.displayName = input.displayName;
  if (input.password !== undefined) body.password = input.password;
  if (input.email !== undefined) body.email = input.email;
  if (input.emailVerified !== undefined) body.emailVerified = input.emailVerified;
  if (input.disabled !== undefined) body.disableUser = input.disabled;
  if (input.providersToUnlink?.length) body.deleteProvider = input.providersToUnlink;
  if (deleteAttribute.length) body.deleteAttribute = deleteAttribute;
  await toolkit('accounts:update', body);
  return getUser(uid);
}

export async function deleteUser(uid: string): Promise<void> {
  await toolkit('accounts:delete', { localId: uid });
}
