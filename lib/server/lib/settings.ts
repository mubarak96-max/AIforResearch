import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { env } from '../env.js';

/**
 * The server's settings: read from the environment only (see env.ts and .env.example). To change
 * one, change the environment variable or secret and redeploy.
 */
export type EffectiveSettings = typeof env;

export function settings(): EffectiveSettings {
  return env;
}

/** Settings never change while the server runs; callers that cache on this never rebuild. */
export function settingsVersion() {
  return 0;
}

function cipherKey() {
  // SETTINGS_KEY. Installs moved from the Postgres version that never set one encrypted with
  // their JWT_SECRET instead: keep it in the environment and those values still open.
  const secret = env.settingsKey || (process.env.JWT_SECRET ?? '').trim();
  if (!secret) throw new Error('SETTINGS_KEY must be set to save or read encrypted values.');
  return createHash('sha256').update(`writeorbit-settings:${secret}`).digest();
}

/** Encrypts a secret for storage (reference manager tokens), AES-256-GCM with SETTINGS_KEY. */
export function sealSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', cipherKey(), iv);
  const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((part) => part.toString('base64')).join('.');
}

export function openSecret(stored: string) {
  const [iv, tag, data] = stored.split('.').map((part) => Buffer.from(part, 'base64'));
  const decipher = createDecipheriv('aes-256-gcm', cipherKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}
