import { createHash, randomBytes } from 'node:crypto';
import { C, col, newId, rows } from '../firebase.js';

export type ApiKeyRow = { id: string; account_id: string; name: string; prefix: string; mode: 'test' | 'live'; monthly_credit_cap: number | null; allowed_services: string[] | null; revoked_at: Date | null };

export const hashKey = (key: string) => createHash('sha256').update(key).digest('hex');

const toRow = (value: Record<string, any>): ApiKeyRow => ({
  id: value.id, account_id: value.account_id, name: value.name, prefix: value.prefix, mode: value.mode,
  monthly_credit_cap: value.monthly_credit_cap ?? null, allowed_services: value.allowed_services ?? null, revoked_at: value.revoked_at ?? null,
});

/** Creates a key; the full key is returned once and only its hash is stored. */
export async function createApiKey(accountId: string, name: string, mode: 'test' | 'live') {
  const secret = randomBytes(24).toString('base64url');
  const key = `rc_${mode}_${secret}`;
  const id = newId();
  const data = {
    account_id: accountId, name, prefix: key.slice(0, 12), key_hash: hashKey(key), mode,
    monthly_credit_cap: null, allowed_services: null, created_at: new Date(), last_used_at: null, revoked_at: null,
  };
  await col(C.apiKeys).doc(id).set(data);
  return { key, row: toRow({ id, ...data }) };
}

const cache = new Map<string, { row: ApiKeyRow | null; at: number }>();

export async function findApiKey(key: string): Promise<ApiKeyRow | null> {
  if (!/^vm_(test|live)_[A-Za-z0-9_-]{20,}$/.test(key)) return null;
  const hashed = hashKey(key);
  const cached = cache.get(hashed);
  if (cached && Date.now() - cached.at < 30_000) return cached.row;
  const [found] = rows<Record<string, any>>(await col(C.apiKeys).where('key_hash', '==', hashed).limit(1).get());
  const result = found && !found.revoked_at ? toRow(found) : null;
  cache.set(hashed, { row: result, at: Date.now() });
  if (result) void col(C.apiKeys).doc(result.id).update({ last_used_at: new Date() }).catch(() => undefined);
  return result;
}

/** Forget cached lookups (after a key is revoked or its cap changes). Other instances forget within 30 s. */
export function forgetApiKeys() {
  cache.clear();
}
