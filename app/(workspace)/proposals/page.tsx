'use client';

import { Suspense } from 'react';
import { StudioWorkspace } from '@/components/app/studio/StudioWorkspace';

export default function Page() {
  return <Suspense fallback={null}><StudioWorkspace workspace="proposals" /></Suspense>;
}
