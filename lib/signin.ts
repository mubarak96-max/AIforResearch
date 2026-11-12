'use client';

import {
  GoogleAuthProvider, OAuthProvider, SAMLAuthProvider, getRedirectResult, linkWithPopup, sendPasswordResetEmail, signInWithPopup, signInWithRedirect,
  type AuthProvider,
} from 'firebase/auth';
import { firebaseAuth, firebaseCode } from '@/lib/firebase';
import { api, friendly, refreshSession, setSession, type SessionUser } from '@/lib/session';

/**
 * Sign-in methods in the browser: email and password, and Google, through Firebase
 * Authentication. Firebase keeps one account per email:
 * a provider whose email already has an account must be connected from the account page.
 */

export type Provider = 'google';
export type InstitutionalProvider = { id: string; label: string; protocol: 'saml' | 'oidc' };
/** `password_reset`: Firebase sends reset links, so it is always true now. */
export type Methods = { password: boolean; password_reset?: boolean; support_email?: string | null; sso?: InstitutionalProvider[] } & Record<Provider, boolean>;
export const PROVIDERS: Provider[] = ['google'];
export const PROVIDER_NAMES: Record<Provider, string> = { google: 'Google' };

let methodsRequest: Promise<Methods> | null = null;
export function getMethods(): Promise<Methods> {
  methodsRequest ||= api<Methods>('/api/auth/methods').catch((error) => {
    methodsRequest = null;
    throw error;
  });
  return methodsRequest;
}

function providerFor(_provider: Provider): AuthProvider {
  const google = new GoogleAuthProvider();
  google.setCustomParameters({ prompt: 'select_account' });
  return google;
}

async function finish(user: { getIdToken: (force?: boolean) => Promise<string>; uid: string }): Promise<SessionUser> {
  const token = await user.getIdToken(true);
  const profile = await api<SessionUser>('/api/auth/me');
  setSession(token, profile);
  return profile;
}

/**
 * Signs in with a provider in a pop-up (a full-page redirect where pop-ups cannot open);
 * `connect` adds the provider to the signed-in account instead.
 */
export async function startProvider(provider: Provider, options: { mode?: 'signin' | 'connect' } = {}): Promise<SessionUser | null> {
  const auth = firebaseAuth();
  try {
    if (options.mode === 'connect') {
      if (!auth.currentUser) throw new Error('Sign in first.');
      await linkWithPopup(auth.currentUser, providerFor(provider));
      await refreshSession({ forceToken: true });
      return null;
    }
    const result = await signInWithPopup(auth, providerFor(provider));
    return await finish(result.user);
  } catch (error) {
    if (firebaseCode(error) === 'auth/popup-blocked' && options.mode !== 'connect') {
      await signInWithRedirect(auth, providerFor(provider));
      return null;
    }
    throw friendly(error);
  }
}

/** Optional configured institutional identity, using the same Firebase user/session as Google. */
export async function startInstitutionalProvider(id: string, options: { mode?: 'signin' | 'connect' } = {}): Promise<SessionUser | null> {
  const configured = (await getMethods()).sso?.find((provider) => provider.id === id);
  if (!configured) throw new Error('This institutional sign-in is not available. Use another sign-in method.');
  const provider = configured.protocol === 'saml' ? new SAMLAuthProvider(configured.id) : new OAuthProvider(configured.id);
  const auth = firebaseAuth();
  try {
    if (options.mode === 'connect') {
      if (!auth.currentUser) throw new Error('Sign in first.');
      await linkWithPopup(auth.currentUser, provider);
      await refreshSession({ forceToken: true });
      return null;
    }
    const result = await signInWithPopup(auth, provider);
    return finish(result.user);
  } catch (error) {
    if (firebaseCode(error) === 'auth/popup-blocked' && options.mode !== 'connect') {
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw friendly(error);
  }
}

let redirectRequest: Promise<SessionUser | null> | null = null;
/** Complete a blocked-popup redirect for either Google or a configured institution. */
export function finishProviderRedirect(): Promise<SessionUser | null> {
  redirectRequest ||= getRedirectResult(firebaseAuth()).then((result) => result ? finish(result.user) : null).catch((error) => { throw friendly(error); });
  return redirectRequest;
}

/** Sends Firebase's password reset email; continues to the sign-in page afterwards. */
export async function sendPasswordReset(email: string) {
  try {
    await sendPasswordResetEmail(firebaseAuth(), email, { url: `${window.location.origin}/login` });
  } catch (error) {
    // Never tell whether an account exists.
    if (firebaseCode(error) === 'auth/user-not-found') return;
    throw friendly(error);
  }
}

export type MyMethods = {
  password: boolean;
  providers: Record<Provider, { connected: boolean; email: string | null }>;
  email_verified: boolean;
  available: Methods;
  sso?: (InstitutionalProvider & { connected: boolean; email: string | null })[];
};
export const getMyMethods = () => api<MyMethods>('/api/auth/sign-in-methods/me');
export const disconnectProvider = (provider: Provider) => api(`/api/auth/identities/${provider}`, { method: 'DELETE' });
export const disconnectInstitutionalProvider = (id: string) => api(`/api/auth/identities/${encodeURIComponent(id)}`, { method: 'DELETE' });
