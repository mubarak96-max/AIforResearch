'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  createUserWithEmailAndPassword, onIdTokenChanged, sendEmailVerification, signInWithEmailAndPassword, signOut, updateProfile,
  type User,
} from 'firebase/auth';
import { appCheckHeader, firebaseAuth, firebaseCode, firebaseMessage } from '@/lib/firebase';

/**
 * The signed-in person. Firebase Authentication keeps the sign-in (and refreshes the ID token
 * every hour); this module mirrors it for the app: the latest ID token for synchronous callers
 * (the editor's fetch helpers), the person's WriteOrbit profile from /api/auth/me, and the
 * `writeorbit_signed_in` cookie the server uses to render signed-in pages without a flash.
 */

/** The signed-in person, as returned by the API. */
export type SessionUser = {
  id: string; email: string; full_name: string | null; plan?: string; plan_name?: string; is_admin?: boolean; email_verified?: boolean;
};

const TOKEN_KEY = 'writeorbit_token';
const USER_KEY = 'writeorbit_user';
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

function read<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch { /* storage blocked: the session lasts for this page only */ }
}

let memoryToken: string | null = null;

function tokenExpiry(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return Number(payload.exp) * 1000;
  } catch {
    return 0;
  }
}

/** The current ID token, or null when signed out (or before Firebase has restored the sign-in). */
export function getToken(): string | null {
  const token = memoryToken ?? read<string>(TOKEN_KEY);
  if (!token) return null;
  return tokenExpiry(token) > Date.now() + 10_000 ? token : null;
}

/** True when this browser has a session (also while an hour-old token is being refreshed). */
export function hasSession(): boolean {
  return Boolean(getToken() || read<SessionUser>(USER_KEY));
}

/** Stores the token and profile (called whenever Firebase gives a new token). */
export function setSession(token: string, user: SessionUser) {
  memoryToken = token;
  write(TOKEN_KEY, token);
  write(USER_KEY, user);
  try { document.cookie = 'writeorbit_signed_in=1; path=/; max-age=2592000; samesite=lax'; } catch { /* ignore */ }
  emit();
}

function forget() {
  memoryToken = null;
  write(TOKEN_KEY, null);
  write(USER_KEY, null);
  try { document.cookie = 'writeorbit_signed_in=; path=/; max-age=0'; } catch { /* ignore */ }
  emit();
}

/** Signs out of Firebase and forgets the session. */
export function clearSession() {
  forget();
  void signOut(firebaseAuth()).catch(() => undefined);
}

let cachedUser: SessionUser | null | undefined;
function snapshot(): SessionUser | null {
  if (cachedUser === undefined) cachedUser = read<SessionUser>(USER_KEY);
  return cachedUser;
}
listeners.add(() => { cachedUser = undefined; });

// ---- Following Firebase -------------------------------------------------------------------

let resolveReady: () => void = () => {};
const readyPromise: Promise<void> = typeof window === 'undefined' ? Promise.resolve() : new Promise((resolve) => { resolveReady = resolve; });
let started = false;
let lastUid: string | null = null;

async function loadProfile(token: string): Promise<SessionUser> {
  const response = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error((body && body.detail) || `Request failed (${response.status})`);
  return body as SessionUser;
}

function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  onIdTokenChanged(firebaseAuth(), async (user: User | null) => {
    try {
      if (!user) { if (read(USER_KEY) || memoryToken) forget(); return; }
      const token = await user.getIdToken();
      memoryToken = token;
      write(TOKEN_KEY, token);
      const known = read<SessionUser>(USER_KEY);
      // A new person, or the first token of this page: (re)load the profile. Hourly refreshes keep it.
      if (!known || known.id !== user.uid || lastUid !== user.uid) {
        lastUid = user.uid;
        setSession(token, await loadProfile(token));
      } else {
        setSession(token, known);
      }
    } catch (error) {
      console.warn('session: could not load the profile', error);
    } finally {
      resolveReady();
    }
  });
}

/** Resolves once Firebase has said whether someone is signed in. */
export function authReady(): Promise<void> {
  start();
  return readyPromise;
}

async function freshToken(force = false): Promise<string | null> {
  await authReady();
  const user = firebaseAuth().currentUser;
  if (!user) return null;
  const token = await user.getIdToken(force);
  memoryToken = token;
  write(TOKEN_KEY, token);
  return token;
}

/** Calls the WriteOrbit API with the ID token; throws an Error with the server's message. */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const send = async (token: string | null) => {
    const headers: Record<string, string> = { ...(await appCheckHeader()), ...(init.headers as Record<string, string> | undefined) };
    if (init.body && !(init.body instanceof FormData) && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(path, { ...init, headers });
  };
  let token = await freshToken().catch(() => getToken());
  let response = await send(token);
  // A token refused: try once with a brand-new one before giving up on the session.
  if (response.status === 401 && token) {
    token = await freshToken(true).catch(() => null);
    if (token) response = await send(token);
    if (response.status === 401) clearSession();
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error((body && (body.detail || body.error)) || `Request failed (${response.status})`);
  return body as T;
}

/** Kept for callers of the old API; nothing is offered after a sign-in any more (no passkeys). */
export function markSignedIn() { /* no-op */ }

async function afterSignIn(user: User): Promise<SessionUser> {
  const token = await user.getIdToken(true);
  lastUid = user.uid;
  const profile = await loadProfile(token);
  setSession(token, profile);
  return profile;
}

/**
 * Email and password. A password from the self-hosted version (which Firebase could not import)
 * is checked by the API once, moved into Firebase, and the sign-in is tried again.
 */
export async function signIn(email: string, password: string) {
  const auth = firebaseAuth();
  try {
    return await afterSignIn((await signInWithEmailAndPassword(auth, email, password)).user);
  } catch (error) {
    const code = firebaseCode(error);
    if (code !== 'auth/invalid-credential' && code !== 'auth/user-not-found' && code !== 'auth/wrong-password') throw friendly(error);
    const moved = await fetch('/api/auth/legacy-login', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await appCheckHeader()) }, body: JSON.stringify({ email, password }),
    }).then((response) => response.ok).catch(() => false);
    if (!moved) throw friendly(error);
    try {
      return await afterSignIn((await signInWithEmailAndPassword(auth, email, password)).user);
    } catch (retry) {
      throw friendly(retry);
    }
  }
}

export async function signUp(input: { email: string; password: string; full_name: string }) {
  try {
    const { user } = await createUserWithEmailAndPassword(firebaseAuth(), input.email, input.password);
    if (input.full_name) await updateProfile(user, { displayName: input.full_name });
    void sendEmailVerification(user, { url: `${window.location.origin}/editor` }).catch(() => undefined);
    return await afterSignIn(user);
  } catch (error) {
    throw friendly(error);
  }
}

/** A Firebase error as an Error with a message people can act on ('' = nothing to show). */
export function friendly(error: unknown): Error {
  const message = firebaseMessage(error);
  if (message === null) return error instanceof Error ? error : new Error(String(error));
  const wrapped = new Error(message) as Error & { code?: string };
  wrapped.code = firebaseCode(error) ?? undefined;
  return wrapped;
}

/** Reloads the person from the API (after a plan change, or with forceToken after confirming the email). */
export async function refreshSession(options: { forceToken?: boolean } = {}) {
  const token = await freshToken(options.forceToken);
  if (!token) return;
  setSession(token, await loadProfile(token));
}

/** The current person (from storage, kept in step with Firebase). */
export function useSession(): { user: SessionUser | null; loading: boolean } {
  const user = useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    snapshot,
    () => null,
  );
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    void authReady().finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);
  return { user, loading };
}

if (typeof window !== 'undefined') start();
