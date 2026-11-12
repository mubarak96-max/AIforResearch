'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { showSideload, useMobileTabBarHidden, useSideloads, type SideloadTool } from '@/components/editor';

const glyph = (paths: React.ReactNode) => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths}</svg>
);
const HOME_ICON = glyph(<><path d="M3 11 12 4l9 7" /><path d="M5 10v10h14V10" /></>);
const RESEARCH_ICON = glyph(<><path d="M12 3v3M12 18v3M3 12h3M18 12h3" /><circle cx="12" cy="12" r="4" /></>);
const DOCS_ICON = glyph(<><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></>);
// Library, Papers and Chat open full-screen panels over the page, never separate pages.
const TOOLS: { id: SideloadTool; label: string; icon: React.ReactNode }[] = [
  { id: 'library', label: 'Library', icon: glyph(<path d="M4 19V5M8 19V5M12 19l4-14 4 14" />) },
  { id: 'papers', label: 'Papers', icon: glyph(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>) },
  { id: 'chat', label: 'Chat', icon: glyph(<path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.6A8 8 0 1 1 21 12z" />) },
];

/** True while the on-screen keyboard is open (the visible viewport shrinks). */
function useKeyboardOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => setOpen(window.innerHeight - viewport.height > 140);
    viewport.addEventListener('resize', update);
    return () => viewport.removeEventListener('resize', update);
  }, []);
  return open;
}

/** The phone tab bar: Home, Research, a centre button for new research, Library and Documents. */
export function MobileTabBar() {
  const pathname = usePathname() || '';
  const hiddenByEditor = useMobileTabBarHidden();
  const keyboardOpen = useKeyboardOpen();
  const sideloads = useSideloads();
  if (hiddenByEditor || keyboardOpen) return null;
  const label = (active: boolean) => `flex flex-col items-center gap-[3px] text-[11px] font-semibold ${active ? 'text-brand' : 'text-subtle'}`;
  const link = (href: string, text: string, icon: React.ReactNode) => {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={label(active && !sideloads.drawer)}>{icon}{text}</Link>;
  };
  return (
    <>
      <div className="h-[84px] md:hidden" aria-hidden="true" />
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-[60] grid h-[84px] grid-cols-5 border-t border-line bg-surface px-1.5 pt-2 pb-[max(22px,env(safe-area-inset-bottom))] md:hidden">
        {link('/home', 'Home', HOME_ICON)}
        {link('/deep-research', 'Research', RESEARCH_ICON)}
        <Link href="/home?new=1" aria-label="New research" className="flex justify-center">
          <span className="-mt-3.5 grid h-12 w-12 place-items-center rounded-2xl bg-brand shadow-[0_10px_20px_-8px_rgba(var(--brand-rgb),.8)]">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          </span>
        </Link>
        <button type="button" onClick={() => showSideload('library')} aria-pressed={sideloads.drawer === 'library'} className={label(sideloads.drawer === 'library')}>
          {TOOLS[0].icon}{TOOLS[0].label}
        </button>
        {link('/editor', 'Docs', DOCS_ICON)}
      </nav>
    </>
  );
}
