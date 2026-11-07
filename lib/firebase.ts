'use client';

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { getToken, initializeAppCheck, ReCaptchaEnterpriseProvider, type AppCheck } from 'firebase/app-check';

/**
 * Firebase in the browser: Authentication (every sign-in method) and, when a reCAPTCHA
 * Enterprise site key is set, App Check (which replaces the old Cloudflare Turnstile check;
 * enforce it in Firebase console › App Check › Authentication).
 *
 * The browser never reads or writes Firestore or Storage for app data: every change goes
 * through the API (/api/*), which checks access, plan limits and credits.
 */

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let appCheck: AppCheck | null = null;

export function firebaseApp(): FirebaseApp {
  if (app) return app;
  app = getApps().length ? getApp() : initializeApp(config);
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (siteKey && typeof window !== 'undefined') {
    if (process.env.NEXT_PUBLIC_APP_CHECK_DEBUG === '1') (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    try {
      appCheck = initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(siteKey), isTokenAutoRefreshEnabled: true });
    } catch (error) {
      console.warn('App Check could not start', error);
    }
  }
  return app;
}

/**
 * The App Check header for calls to the API ({} when App Check is off or cannot get a token,
 * so the server decides: APP_CHECK_ENFORCE=on refuses those requests).
 */
export async function appCheckHeader(): Promise<Record<string, string>> {
  firebaseApp();
  if (!appCheck) return {};
  try {
    const { token } = await getToken(appCheck);
    return { 'X-Firebase-AppCheck': token };
  } catch {
    return {};
  }
}

export function firebaseAuth(): Auth {
  if (auth) return auth;
  auth = getAuth(firebaseApp());
  if (process.env.NEXT_PUBLIC_USE_EMULATORS === '1') {
    const host = process.env.NEXT_PUBLIC_AUTH_EMULATOR_URL || 'http://127.0.0.1:9099';
    connectAuthEmulator(auth, host, { disableWarnings: true });
  }
  return auth;
}

const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'That email and password do not match.',
  'auth/wrong-password': 'That email and password do not match.',
  'auth/user-not-found': 'That email and password do not match.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/email-already-in-use': 'An account with this email already exists. Sign in instead.',
  'auth/weak-password': 'Use at least 8 characters for your password.',
  'auth/too-many-requests': 'Too many attempts. Try again in a few minutes.',
  'auth/user-disabled': 'This account is turned off. Contact support for help.',
  'auth/network-request-failed': 'We could not reach WriteOrbit. Check your connection and try again.',
  'auth/popup-blocked': 'Your browser blocked the sign-in window. Allow pop-ups for this site and try again.',
  'auth/popup-closed-by-user': '',
  'auth/cancelled-popup-request': '',
  'auth/account-exists-with-different-credential': 'This email already has a WriteOrbit account. Sign in the way you did before, then connect this method from your account page.',
  'auth/credential-already-in-use': 'That account is already connected to another WriteOrbit account.',
  'auth/provider-already-linked': 'That method is already connected.',
  'auth/requires-recent-login': 'For your security, sign out and sign in again, then retry.',
  'auth/expired-action-code': 'This link has expired. Ask for a new one.',
  'auth/invalid-action-code': 'This link has expired or was already used. Ask for a new one.',
  'auth/operation-not-allowed': 'This sign-in method is not turned on for this site.',
  'auth/unauthorized-domain': 'Sign-in is not set up for this web address yet (Firebase console › Authentication › Authorized domains).',
  'auth/firebase-app-check-token-is-invalid': 'The security check failed. Reload the page and try again.',
};

/** A Firebase error code, if this is one. */
export const firebaseCode = (error: unknown): string | null => {
  const code = (error as { code?: unknown })?.code;
  return typeof code === 'string' && code.startsWith('auth/') ? code : null;
};

/** A message people can act on ('' for "they closed the window", which needs none). */
export function firebaseMessage(error: unknown): string | null {
  const code = firebaseCode(error);
  if (!code) return null;
  return code in MESSAGES ? MESSAGES[code] : 'Something went wrong signing in. Please try again.';
}
