import type { Metadata } from 'next';

// A signed-in screen: keep it out of search results.
export const metadata: Metadata = { title: 'API keys', robots: { index: false, follow: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
