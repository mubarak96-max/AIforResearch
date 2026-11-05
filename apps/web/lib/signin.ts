'use client';

import {
  GoogleAuthProvider, linkWithPopup, OAuthProvider, sendPasswordResetEmail, signInWithPopup, signInWithRedirect,
  type AuthProvider,
} from 'firebase/auth';
import { firebaseAuth, firebaseCode } from '@/lib/firebase';
import { api, friendly, refreshSession, setSession, type SessionUser } from '@/lib/session';

/**
 * Sign-in methods in the browser: which this site offers (Admin › Sign-in), and Google,
 * Microsoft and Apple through Firebase Authentication. Firebase keeps one account per email:
 * a provider whose email already has an account must be connected from the account page.
 */

export type Provider = 'google' | 'microsoft' | 'apple';
/** `password_reset`: Firebase sends reset links, so it is always true now. */
export type Methods = { password: boolean; password_reset?: boolean; support_email?: string | null } & Record<Provider, boolean>;
export const PROVIDERS: Provider[] = ['google', 'microsoft', 'apple'];
export const PROVIDER_NAMES: Record<Provider, string> = { google: 'Google', microsoft: 'Microsoft', apple: 'Apple' };

let methodsRequest: Promise<Methods> | null = null;
export function getMethods(): Promise<Methods> {
  methodsRequest ||= api<Methods>('/api/auth/methods').catch((error) => {
    methodsRequest = null;
    throw error;
  });
  return methodsRequest;
}

function providerFor(provider: Provider): AuthProvider {
  if (provider === 'google') {
    const google = new GoogleAuthProvider();
    google.setCustomParameters({ prompt: 'select_account' });
    return google;
  }
  const oauth = new OAuthProvider(provider === 'microsoft' ? 'microsoft.com' : 'apple.com');
  oauth.addScope('email');
  if (provider === 'microsoft') oauth.setCustomParameters({ prompt: 'select_account' });
  else oauth.addScope('name');
  return oauth;
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
};
export const getMyMethods = () => api<MyMethods>('/api/auth/sign-in-methods/me');
export const disconnectProvider = (provider: Provider) => api(`/api/auth/identities/${provider}`, { method: 'DELETE' });
