'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { PdfReader } from '@/components/reader/PdfReader';

/** Reads a Library PDF with highlights and notes (?page=n&highlight=id open at a passage). */
export default function LibraryReaderPage() {
  const { id } = useParams<{ id: string }>();
  return <Suspense fallback={null}><PdfReader id={id} /></Suspense>;
}
