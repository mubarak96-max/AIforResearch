'use client';

import dynamic from 'next/dynamic';
import { Suspense, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { LuMenu, LuX } from 'react-icons/lu';
import { useSideloads } from '@/components/editor';
import { EditorHost } from '@/components/app/EditorHost';
import { MobileTabBar } from '@/components/app/MobileTabBar';
import { AppNav } from '@/components/app/AppNav';
import { ThemeToggle } from '@/components/theme/theme';

// Library and Find papers slide in from the left in place of the menu; AI Chat opens on the right.
const AppToolDrawer = dynamic(() => import('@/components/editor').then((mod) => mod.AppToolDrawer), { ssr: false });
const AppChatSideload = dynamic(() => import('@/components/editor').then((mod) => mod.AppChatSideload), { ssr: false });
const EditorToaster = dynamic(() => import('@/components/editor').then((mod) => mod.EditorToaster), { ssr: false });
const docked = 'lg:sticky lg:top-0 lg:h-dvh';

/** The phone menu: the same navigation as a sheet. */
function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  return (
    <>
      <button type="button" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(true)} className="grid h-[34px] w-[34px] place-items-center rounded-full text-ink-2 hover:bg-soft"><LuMenu className="h-5 w-5" /></button>
      {open && (
        <div className="fixed inset-0 z-[90] md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-ink/30" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex">
            <AppNav className="flex" onNavigate={() => setOpen(false)} />
            <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="m-2 grid h-9 w-9 place-items-center rounded-full bg-surface text-ink shadow-float"><LuX className="h-4 w-4" /></button>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * The signed-in frame: the app navigation on the left (desktop), the page title and actions, and
 * on phones a title bar with the menu and the tab bar. `wide` pages (results, tables) get more room.
 */
export function AppFrame({ title, actions, children, wide = false, subtitle }: { title: string; subtitle?: React.ReactNode; crumbs?: { label: string; href?: string }[]; actions?: React.ReactNode; children: React.ReactNode; wide?: boolean }) {
  const sideloads = useSideloads();
  return (
    <div className="min-h-dvh bg-surface md:flex">
      <AppNav className={`sticky top-0 h-dvh ${sideloads.drawer && !sideloads.menu ? 'hidden md:flex lg:hidden' : 'hidden md:flex'}`} />
      <Suspense fallback={null}><EditorHost><AppToolDrawer className={docked} /></EditorHost></Suspense>

      <main className="min-w-0 flex-1">
        <div className="flex h-14 items-center gap-2 px-[18px] md:hidden">
          <MobileMenu />
          <h1 className="min-w-0 flex-1 truncate text-[20px] font-extrabold tracking-[-0.02em]">{title}</h1>
          <ThemeToggle />
        </div>
        <div className={`mx-auto px-[18px] pb-8 md:px-10 md:pt-7 ${wide ? 'max-w-6xl' : 'max-w-4xl'}`}>
          <div className="mb-6 hidden items-start gap-3.5 md:flex">
            <div className="min-w-0 flex-1">
              <h1 className="text-[26px] font-bold tracking-[-0.02em]">{title}</h1>
              {subtitle && <p className="mt-1 text-[15px] text-muted">{subtitle}</p>}
            </div>
            {actions}
          </div>
          {subtitle && <p className="-mt-1 mb-4 text-[14px] text-muted md:hidden">{subtitle}</p>}
          {actions && <div className="mb-4 flex flex-wrap gap-2 md:hidden">{actions}</div>}
          {children}
        </div>
        <MobileTabBar />
      </main>
      <Suspense fallback={null}><EditorHost><AppChatSideload className={docked} /></EditorHost></Suspense>
      <EditorToaster />
    </div>
  );
}
