import type { Metadata } from 'next';
import { VerifyReport } from './VerifyReport';

export const metadata: Metadata = {
  title: 'Authorship report',
  description: 'A WriteOrbit authorship report: how a document was written.',
  // Reports are private to whoever has the link.
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VerifyReport id={id} />;
}
