'use client';

import { useEffect, type ReactNode } from 'react';
import { hasSession } from '@/lib/session';
import { SIGNED_IN_COOKIE } from './authScript';

/**
 * Shows `signedIn` or `signedOut`. Both are in the HTML, so the page can be static; CSS hides one
 * by <html data-auth>, which the head script sets from the sign-in cookie before first paint (no
 * flash). After hydration the browser checks the session token in case the cookie is stale.
 */
export function AuthAware({ signedIn, signedOut }: { signedIn: ReactNode; signedOut: ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    const hasToken = Boolean(hasSession());
    if (hasToken) root.setAttribute('data-auth', 'in');
    else if (root.getAttribute('data-auth') === 'in') {
      root.removeAttribute('data-auth');
      // A cookie left behind without a session: drop it so the next page paints signed out.
      document.cookie = `${SIGNED_IN_COOKIE}=; path=/; max-age=0`;
    }
  }, []);
  return (
    <>
      {signedIn != null && <div className="wo-auth-in">{signedIn}</div>}
      {signedOut != null && <div className="wo-auth-out">{signedOut}</div>}
    </>
  );
}
