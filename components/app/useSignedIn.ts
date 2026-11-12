'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/lib/session';

/** Sends signed-out visitors to sign in and back here afterwards. Returns the session. */
export function useSignedIn() {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  useEffect(() => {
    if (session.loading || session.user) return;
    const here = `${pathname}${search.toString() ? `?${search}` : ''}`;
    router.replace(`/login?next=${encodeURIComponent(here)}`);
  }, [session.loading, session.user, pathname, search, router]);
  return session;
}
