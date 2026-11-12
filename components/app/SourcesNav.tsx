'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { expansionWorkbooksEnabled } from '@/lib/workflows';

/** One "Find Papers" area: scholarly search, official records and saved searches share a sidebar entry. */
const LINKS = [
  { href: '/papers', label: 'Search papers' },
  { href: '/official-sources', label: expansionWorkbooksEnabled() ? 'Official sources' : 'Trial registries' },
  { href: '/monitoring', label: 'Saved searches' },
];

export function SourcesNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Find sources" className="mb-5 flex flex-wrap gap-2">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={`inline-flex min-h-9 items-center rounded-full px-3.5 text-sm font-semibold ${
              active ? 'bg-brand text-on-brand' : 'border border-line bg-surface text-ink-2 hover:bg-soft'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
