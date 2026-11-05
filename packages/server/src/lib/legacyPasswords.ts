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
  // A native module: loaded when needed and kept out of the Next.js bundle (webpackIgnore).
  const { verify } = await import(/* webpackIgnore: true */ '@node-rs/argon2');
  return verify(hashed, password).catch(() => false);
}

export const legacyKey = (email: string) => email.trim().toLowerCase();

export async function legacyPassword(email: string): Promise<LegacyPassword | null> {
  const key = legacyKey(email);
  if (!key || key.includes('/')) return null;
  return row<LegacyPassword>(await col(C.legacyPasswords).doc(key).get());
}

export async function forgetLegacyPassword(email: string) {
  await col(C.legacyPasswords).doc(legacyKey(email)).delete();
}
