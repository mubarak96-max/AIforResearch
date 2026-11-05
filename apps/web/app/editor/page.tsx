'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { EditorHost } from '@/components/app/EditorHost';
import { MobileTabBar } from '@/components/app/MobileTabBar';

// The editor is browser-only (ProseMirror, IndexedDB, WebSockets).
const ResearchCoveEditor = dynamic(() => import('@researchcove/editor').then((mod) => mod.ResearchCoveEditor), {
  ssr: false,
  loading: () => <div className="grid min-h-dvh place-items-center text-sm text-muted">Opening your documents…</div>,
});

export default function EditorPage() {
  return (
    <Suspense fallback={null}>
      <EditorHost>
        <ResearchCoveEditor />
        <MobileTabBar />
      </EditorHost>
    </Suspense>
  );
}
