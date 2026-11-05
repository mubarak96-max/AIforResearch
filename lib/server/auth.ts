import type { Context, MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from './firebase.js';
import { env } from './env.js';
import { activeUser, ensureUser } from './lib/users.js';

/**
 * Who is calling. The browser signs in with Firebase Authentication and sends its ID token
 * (`Authorization: Bearer <token>`, or `?token=` on WebSocket URLs). The token's uid is the
 * id of the person's `users/{uid}` document, created on first use (lib/users.ts ensureUser).
 */

export type AuthUser = { id: string; email: string; full_name: string | null; account_id: string; is_admin: boolean };
export type AppVariables = { user: AuthUser | null };

// verifyIdToken is local after the first key fetch, but the user lookup is a Firestore read
// and the editor sends many requests at once: keep verified tokens for a minute.
const verified = new Map<string, { user: AuthUser; until: number }>();
const CACHE_MS = 60_000;

export async function decodeToken(token: string): Promise<DecodedIdToken | null> {
  try {
    return await adminAuth().verifyIdToken(token);
  } catch {
    return null;
  }
}

export async function userFromToken(token: string | null | undefined): Promise<AuthUser | null> {
  if (!token) return null;
  const cached = verified.get(token);
  if (cached && cached.until > Date.now()) return cached.user;
  const decoded = await decodeToken(token);
  if (!decoded || !decoded.email) return null;
  const user = (await activeUser(decoded.uid)) ?? (await ensureUser(decoded));
  if (!user) return null;
  if (verified.size > 5000) verified.clear();
  verified.set(token, { user, until: Math.min(Date.now() + CACHE_MS, decoded.exp * 1000) });
  return user;
}

/** Drops cached sign-ins for a person (after an admin change, a disable or a deletion). */
export function forgetUser(userId: string) {
  for (const [token, entry] of verified) if (entry.user.id === userId) verified.delete(token);
}

export function bearer(c: Context): string | null {
  const header = c.req.header('authorization') || '';
  if (header.toLowerCase().startsWith('bearer ')) return header.slice(7).trim();
  return c.req.query('token') || null;
}

/** Sets c.var.user when a valid ID token is present; never rejects. */
export const optionalUser: MiddlewareHandler<{ Variables: AppVariables }> = async (c, next) => {
  c.set('user', await userFromToken(bearer(c)));
  await next();
};

/** Rejects with 401 unless a valid ID token is present. */
export const requireUser: MiddlewareHandler<{ Variables: AppVariables }> = async (c, next) => {
  const user = c.get('user') ?? (await userFromToken(bearer(c)));
  if (!user) throw new HTTPException(401, { message: 'Sign in to continue.' });
  c.set('user', user);
  await next();
};

/** Rejects with 403 unless the signed-in person is an admin. */
export const requireAdmin: MiddlewareHandler<{ Variables: AppVariables }> = async (c, next) => {
  const user = c.get('user') ?? (await userFromToken(bearer(c)));
  if (!user) throw new HTTPException(401, { message: 'Sign in to continue.' });
  if (!user.is_admin) throw new HTTPException(403, { message: 'Admins only.' });
  c.set('user', user);
  await next();
};

/** Calls from the converter, the collab service and Cloud Functions carry INTERNAL_SECRET. */
export const requireInternal: MiddlewareHandler = async (c, next) => {
  const sent = c.req.header('x-internal-secret') || '';
  if (!env.internalSecret || sent !== env.internalSecret) throw new HTTPException(403, { message: 'Forbidden' });
  await next();
};
