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

/**
 * How many proxies in front of the app append to X-Forwarded-For (TRUSTED_PROXY_HOPS, default 1).
 * The client can write anything at the start of the header, so the address is read from the
 * right: with 1 hop, the last entry (what the nearest proxy saw); behind a load balancer that adds
 * its own entry too, 2. Cloudflare's CF-Connecting-IP wins when present (it cannot be forged
 * through Cloudflare).
 */
const HOPS = Math.max(1, Number(process.env.TRUSTED_PROXY_HOPS) || 1);

export function clientAddress(header: (name: string) => string | undefined): string {
  const cloudflare = header('cf-connecting-ip')?.trim();
  if (cloudflare) return cloudflare;
  const hops = (header('x-forwarded-for') || '').split(',').map((part) => part.trim()).filter(Boolean);
  if (hops.length) return hops[Math.max(0, hops.length - HOPS)];
  return header('x-real-ip')?.trim() || 'local';
}

export function rateLimit(options: { key: string; limit: number; windowSeconds: number }): MiddlewareHandler {
  return async (c, next) => {
    const address = clientAddress((name) => c.req.header(name));
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
