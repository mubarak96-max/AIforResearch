'use client';

/**
 * The app's one left navigation (232px, soft grey), shared by every signed-in page and the
 * editor (EditorHost passes it as the editor's renderNavigation). Destinations follow
 * docs/redesign/01-product-structure.md: research first, then the workspaces, then history.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LuBookOpen, LuChartBar, LuClipboardCheck, LuFileText, LuFolderKanban, LuGraduationCap, LuHistory, LuHouse,
  LuLayoutGrid, LuLibrary, LuListChecks, LuNotebookPen, LuSearch, LuSparkles, LuUser, LuCircleHelp, LuPlus,
} from 'react-icons/lu';
import { toggleSideload, useSideloads } from '@/components/editor';
import { Logo } from '@/components/Logo';
import { useSession } from '@/lib/session';
import { openPricing, useCredits } from '@/lib/billing';
import { ThemeToggle } from '@/components/theme/theme';

type Item = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; match?: string[] };

export const NAV_MAIN: Item[] = [
  { href: '/home', label: 'Home', icon: LuHouse },
  { href: '/deep-research', label: 'Deep Research', icon: LuSparkles },
  { href: '/papers', label: 'Find Papers', icon: LuSearch, match: ['/papers', '/citation-map', '/landscape'] },
];
export const NAV_WORKSPACES: Item[] = [
  { href: '/write', label: 'Writing Studio', icon: LuNotebookPen, match: ['/write', '/editor', '/slides'] },
  { href: '/thesis', label: 'Thesis Suite', icon: LuGraduationCap },
  { href: '/proposals', label: 'Proposal Studio', icon: LuFileText },
  { href: '/systematic-review', label: 'Systematic Review', icon: LuListChecks },
  { href: '/reviewer', label: 'Reviewer', icon: LuClipboardCheck, match: ['/reviewer', '/matrix', '/authorship'] },
  { href: '/data-lab', label: 'Data Lab', icon: LuChartBar },
];
export const NAV_MORE: Item[] = [
  { href: '/all-tools', label: 'All tools', icon: LuLayoutGrid },
  { href: '/history', label: 'History', icon: LuHistory },
  { href: '/projects', label: 'Projects', icon: LuFolderKanban },
];

const itemClass = (active: boolean) =>
  `flex h-[34px] w-full shrink-0 items-center gap-[10px] rounded-[9px] px-2.5 text-left text-[14.5px] font-medium ${active ? 'bg-surface text-ink shadow-[0_1px_2px_rgba(15,23,42,.06),0_0_0_1px_var(--color-line)]' : 'text-ink-2 hover:bg-surface/70'}`;

/** The credits left this month, with the date they renew; a bar on plans with an allowance. */
export function CreditMeter() {
  const credits = useCredits();
  if (!credits) return null;
  const { allowance, left, topup, plan, resets_on } = credits;
  const share = allowance ? Math.min(1, Math.max(0, (left ?? 0) - topup) / allowance) : 1;
  const low = allowance !== null && left !== null && left < Math.max(5, allowance * 0.1);
  return (
    <div className="mt-2 shrink-0 rounded-[10px] bg-surface/70 px-2.5 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-semibold text-ink">{left === null ? 'Unlimited credits' : `${left.toLocaleString('en-US')} credits left`}</span>
        {plan.is_default || low ? <button type="button" onClick={() => openPricing(low ? 'You are running low on credits.' : null)} className="text-[12.5px] font-semibold text-brand hover:underline">{plan.is_default ? 'Upgrade' : 'Add'}</button> : null}
      </div>
      {allowance !== null && (
        <>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line-2" aria-hidden="true"><div className={`h-full rounded-full ${low ? 'bg-red-500' : 'bg-brand'}`} style={{ width: `${share * 100}%` }} /></div>
          <p className="mt-1 text-[11.5px] text-muted">{plan.name} · renews {new Date(`${resets_on}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}{topup ? ` · ${topup.toLocaleString('en-US')} extra` : ''}</p>
        </>
      )}
    </div>
  );
}

export function AppNav({ className = '', onNavigate }: { className?: string; onNavigate?: () => void }) {
  const pathname = usePathname() || '';
  const { user } = useSession();
  const sideloads = useSideloads();
  const name = user?.full_name || user?.email?.split('@')[0] || '';
  const active = (item: Item) => (item.match ?? [item.href]).some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const link = (item: Item) => {
    const Icon = item.icon;
    const on = active(item);
    return (
      <Link key={item.href} href={item.href} onClick={onNavigate} aria-current={on ? 'page' : undefined} className={itemClass(on)}>
        <Icon className="h-[17px] w-[17px] shrink-0" />{item.label}
      </Link>
    );
  };
  const group = (label: string) => <p className="px-2.5 pb-1 pt-4 text-[12px] font-medium text-subtle">{label}</p>;
  return (
    <aside aria-label="App" className={`h-full w-[232px] shrink-0 flex-col overflow-y-auto border-r border-line bg-soft px-3 pb-3 pt-4 ${className}`}>
      <Link href="/home" onClick={onNavigate} className="px-2 pb-3" aria-label="AI for Research home"><Logo size={32} /></Link>
      <Link href="/home?new=1" onClick={onNavigate} className="mb-2 flex h-[38px] shrink-0 items-center justify-center gap-2 rounded-[10px] bg-brand text-[14.5px] font-semibold text-on-brand shadow-brand hover:bg-brand-600">
        <LuPlus className="h-4 w-4" aria-hidden="true" />New research
      </Link>
      {NAV_MAIN.map(link)}
      <button type="button" onClick={() => { toggleSideload('library'); onNavigate?.(); }} aria-pressed={sideloads.drawer === 'library'} className={itemClass(sideloads.drawer === 'library')}>
        <LuLibrary className="h-[17px] w-[17px] shrink-0" />My Library
      </button>
      <Link href="/editor" onClick={onNavigate} aria-current={pathname === '/editor' ? 'page' : undefined} className={itemClass(pathname === '/editor')}>
        <LuBookOpen className="h-[17px] w-[17px] shrink-0" />Documents
      </Link>
      {group('Workspaces')}
      {NAV_WORKSPACES.map(link)}
      {group('More')}
      {NAV_MORE.map(link)}
      <div className="min-h-4 flex-1" />
      <Link href="/account" onClick={onNavigate} className={itemClass(pathname.startsWith('/account'))}><LuUser className="h-[17px] w-[17px] shrink-0" />Account</Link>
      <Link href="/help" onClick={onNavigate} className={itemClass(false)}><LuCircleHelp className="h-[17px] w-[17px] shrink-0" />Help</Link>
      <CreditMeter />
      <div className="flex shrink-0 items-center gap-1 pb-0.5 pt-3">
        <Link href="/account" onClick={onNavigate} className="flex min-w-0 flex-1 items-center gap-2.5 px-2 text-[14px] font-medium text-ink">
          <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-brand-100 text-[13px] font-bold text-brand-600">{(name[0] || '·').toUpperCase()}</span>
          <span className="truncate">{name || 'Account'}</span>
        </Link>
        <ThemeToggle />
      </div>
    </aside>
  );
}

