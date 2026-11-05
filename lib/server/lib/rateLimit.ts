import { createHash } from 'node:crypto';
import type { MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { C, col, db } from '../firebase.js';

/**
 * Fixed-window limiter per client address. App Hosting runs several instances, so the count
 * lives in Firestore (`rate_limits`, with a TTL policy on `expires_at` that clears old windows).
 * A small in-memory window in front saves the Firestore round trip for obvious floods.
 */
const local = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(options: { key: string; limit: number; windowSeconds: number }): MiddlewareHandler {
  return async (c, next) => {
    const address = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || c.req.header('cf-connecting-ip') || 'local';
    const now = Date.now();
    const windowMs = options.windowSeconds * 1000;
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const id = `${options.key}:${createHash('sha256').update(address).digest('hex').slice(0, 24)}:${windowStart}`;

    const seen = local.get(id);
    if (seen && seen.resetAt > now && seen.count > options.limit) throw tooMany();
    local.set(id, { count: (seen?.count ?? 0) + 1, resetAt: windowStart + windowMs });
    if (local.size > 20_000) local.clear();

    const ref = col(C.rateLimits).doc(id);
    const count = await db().runTransaction(async (tx) => {
      const current = await tx.get(ref);
      const next = (current.exists ? Number(current.get('count')) : 0) + 1;
      tx.set(ref, { count: next, expires_at: new Date(windowStart + windowMs * 2) });
      return next;
    }).catch(() => 0); // never lock people out because the limiter itself failed
    if (count > options.limit) throw tooMany();
    await next();
  };
}

const tooMany = () => new HTTPException(429, { message: 'Too many attempts. Try again in a few minutes.' });
