import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Email link', robots: { index: false, follow: false } };

export default function ActionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
