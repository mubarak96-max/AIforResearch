'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { hasSession } from '@/lib/session';

/**
 * Shows `signedIn` or `signedOut`. The server decides first from the `researchcove_signed_in`
 * cookie (no flash); the browser then checks the session token in case the cookie is stale.
 */
export function AuthAware({ initial, signedIn, signedOut }: { initial: boolean; signedIn: ReactNode; signedOut: ReactNode }) {
  const [isSignedIn, setSignedIn] = useState(initial);
  useEffect(() => {
    const hasToken = Boolean(hasSession());
    if (hasToken !== initial) setSignedIn(hasToken);
    // A cookie left behind without a session: drop it so the next page renders signed out.
    if (initial && !hasToken) document.cookie = 'researchcove_signed_in=; path=/; max-age=0';
  }, [initial]);
  return <>{isSignedIn ? signedIn : signedOut}</>;
}
