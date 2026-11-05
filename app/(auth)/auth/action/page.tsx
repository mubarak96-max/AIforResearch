'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { btnPrimary } from '@/components/marketing/styles';

/**
 * Where Firebase's emailed links land (set as the action URL in Firebase console ›
 * Authentication › Templates): sends each one to the page that handles it.
 */
export default function EmailActionPage() {
  const router = useRouter();
  const [unknown, setUnknown] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const code = params.get('oobCode');
    const query = code ? `?oobCode=${encodeURIComponent(code)}` : '';
    if (mode === 'resetPassword') router.replace(`/reset-password${query}`);
    else if (mode === 'verifyEmail' || mode === 'verifyAndChangeEmail' || mode === 'recoverEmail') router.replace(`/confirm-email${query}`);
    else setUnknown(true);
  }, [router]);

  return (
    <div className="text-center">
      <h1 className="text-[26px] font-bold tracking-[-0.02em]">{unknown ? 'This link is not complete' : 'One moment…'}</h1>
      {unknown ? (
        <Link href="/login" className={`${btnPrimary} mt-6 h-12 w-full text-base`}>Back to sign in</Link>
      ) : (
        <span className="mx-auto mt-6 block h-8 w-8 animate-spin rounded-full border-[3px] border-brand-100 border-t-brand" aria-hidden="true" />
      )}
    </div>
  );
}
