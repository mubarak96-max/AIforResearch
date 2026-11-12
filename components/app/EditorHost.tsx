'use client';

import { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { WriteOrbitEditorProvider, type WriteOrbitEditorConfig } from '@/components/editor';
import { getToken, useSession } from '@/lib/session';
import { openPricing } from '@/lib/billing';
import { AppNav } from '@/components/app/AppNav';

/** Connects the editor package to this app: session, sign-in, upgrades and analytics. */
export function EditorHost({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const config = useMemo<WriteOrbitEditorConfig>(() => ({
    apiBase: '',
    // services/collab on Cloud Run, e.g. wss://collab-xyz.a.run.app/collab (live text and presence).
    realtimeUrl: process.env.NEXT_PUBLIC_REALTIME_URL || undefined,
    getToken,
    user: user ? { id: user.id, email: user.email, full_name: user.full_name } : null,
    userLoading: loading,
    onRequireSignIn: () => {
      const here = `${pathname}${searchParams.toString() ? `?${searchParams}` : ''}`;
      router.push(`/login?next=${encodeURIComponent(here)}`);
    },
    onUpgrade: (info) => openPricing(info?.message ?? null),
    // One navigation everywhere: the editor shows the app's own.
    renderNavigation: () => <AppNav className="flex h-full" />,
    onEvent: () => {},
  }), [user, loading, pathname, searchParams, router]);

  return <WriteOrbitEditorProvider config={config}>{children}</WriteOrbitEditorProvider>;
}
