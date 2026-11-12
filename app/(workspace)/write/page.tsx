'use client';

import { Suspense } from 'react';
import { StudioWorkspace } from '@/components/app/studio/StudioWorkspace';
import { WriteIntro } from '@/components/app/studio/WriteIntro';

export default function Page() {
  return <Suspense fallback={null}><StudioWorkspace workspace="write" intro={<WriteIntro />} /></Suspense>;
}
