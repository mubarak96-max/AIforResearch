import type { Metadata } from 'next';

/** Survey forms are private links: never indexed, never in the sitemap. */
export const metadata: Metadata = { title: 'Survey', robots: { index: false, follow: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
