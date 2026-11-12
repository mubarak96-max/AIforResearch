'use client';

import Link from 'next/link';
import { Suspense, useMemo, useState } from 'react';
import { LuArrowRight, LuSearch } from 'react-icons/lu';
import { AppFrame } from '@/components/app/AppFrame';
import { useSignedIn } from '@/components/app/useSignedIn';
import { CATALOG, HUBS } from '@/lib/catalog';

/** Every workspace and tool, grouped by hub, with what each costs. */
function AllTools() {
  useSignedIn();
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const items = useMemo(
    () => CATALOG.filter((item) => !needle || [item.name, item.description, ...(item.keywords ?? [])].join(' ').toLowerCase().includes(needle)),
    [needle],
  );
  return (
    <AppFrame title="All tools" subtitle="Every workspace and tool, and what each one costs. Paper search, citations and the Library cost no credits." wide>
      <label className="relative mb-6 block max-w-md">
        <span className="sr-only">Search tools</span>
        <LuSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tools, e.g. PRISMA, abstract, t-test" className="h-10 w-full rounded-[10px] border border-line bg-surface pl-9 pr-3 text-[14.5px]" />
      </label>
      {!items.length && <p className="text-[15px] text-muted">Nothing matches “{query}”.</p>}
      {HUBS.map((hub) => {
        const list = items.filter((item) => item.hub === hub.id);
        if (!list.length) return null;
        return (
          <section key={hub.id} aria-labelledby={`hub-${hub.id}`} className="mb-8">
            <h2 id={`hub-${hub.id}`} className="text-[17px] font-bold text-ink">{hub.name}</h2>
            <p className="text-[14px] text-muted">{hub.blurb}</p>
            <ul className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((item) => (
                <li key={item.id}>
                  <Link href={item.href} className="group flex h-full flex-col rounded-xl border border-line bg-surface px-4 py-3 transition-colors hover:border-brand-100 hover:bg-soft">
                    <span className="flex items-center gap-2">
                      <span className="text-[15px] font-semibold text-ink">{item.name}</span>
                      {item.workspace && <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[11px] font-semibold text-brand-600">Workspace</span>}
                      <LuArrowRight className="ml-auto h-4 w-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </span>
                    <span className="mt-1 flex-1 text-[14px] leading-[1.5] text-muted">{item.description}</span>
                    <span className="mt-2 text-[12.5px] font-medium text-ink-2">{item.credits}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </AppFrame>
  );
}

export default function Page() {
  return <Suspense fallback={null}><AllTools /></Suspense>;
}
