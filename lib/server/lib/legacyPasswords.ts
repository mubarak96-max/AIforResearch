import bcrypt from 'bcryptjs';
import { C, col, row } from '../firebase.js';

/**
 * Passwords Firebase Authentication could not import. tools/migrate imports bcrypt hashes into
 * Firebase directly; argon2 hashes (accounts made on the self-hosted version) go to
 * `legacy_passwords/{email}`. The first time such a person signs in, the API checks the old
 * hash, sets the same password in Firebase Auth and deletes the entry (routes/auth.ts).
 */

export type LegacyPassword = { id: string; hash: string; user_id: string; created_at?: Date };

/** Bcrypt hashes come from accounts imported from another app (Laravel writes `$2y$`). */
export const isImportedHash = (hashed: string) => /^\$2[aby]\$\d{2}\$/.test(hashed);

export async function verifyLegacyPassword(hashed: string, password: string): Promise<boolean> {
  if (isImportedHash(hashed)) return bcrypt.compare(password, hashed.replace(/^\$2y\$/, '$2b$')).catch(() => false);
  return verifyArgon2(hashed, password).catch(() => false);
}

/**
 * Checks a PHC-format argon2 hash (`$argon2id$v=19$m=…,t=…,p=…$salt$hash`) in pure JS, so it
 * runs on Cloudflare Workers as well as Node (Workers cannot load native modules).
 */
async function verifyArgon2(hashed: string, password: string): Promise<boolean> {
  const m = /^\$(argon2(?:id|i|d))\$(?:v=(\d+)\$)?m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/.exec(hashed);
  if (!m) return false;
  const [, variant, version, mem, time, par, salt64, hash64] = m;
  const { argon2idAsync, argon2iAsync, argon2dAsync } = await import('@noble/hashes/argon2.js');
  const fn = variant === 'argon2id' ? argon2idAsync : variant === 'argon2i' ? argon2iAsync : argon2dAsync;
  const expected = fromB64(hash64);
  const actual = await fn(new TextEncoder().encode(password), fromB64(salt64), {
    t: Number(time), m: Number(mem), p: Number(par), version: version ? Number(version) : 0x10, dkLen: expected.length,
  });
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}

const fromB64 = (s: string) => Uint8Array.from(atob(s + '='.repeat((4 - (s.length % 4)) % 4)), (c) => c.charCodeAt(0));

export const legacyKey = (email: string) => email.trim().toLowerCase();

export async function legacyPassword(email: string): Promise<LegacyPassword | null> {
  const key = legacyKey(email);
  if (!key || key.includes('/')) return null;
  return row<LegacyPassword>(await col(C.legacyPasswords).doc(key).get());
}

export async function forgetLegacyPassword(email: string) {
  await col(C.legacyPasswords).doc(legacyKey(email)).delete();
}
