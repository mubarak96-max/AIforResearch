import type { Metadata } from 'next';

// Signed-in workspaces (Home, Deep Research, Find Papers, the studios…): keep them out of search results.
export const metadata: Metadata = { title: { default: 'AI for Research', template: '%s · AI for Research' }, robots: { index: false, follow: false } };

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
