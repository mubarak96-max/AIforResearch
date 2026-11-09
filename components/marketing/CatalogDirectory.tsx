'use client';

/**
 * A searchable, filterable list of cards (the /tools page). Every card is in the HTML, so crawlers
 * and readers without JavaScript see them all; filtering only hides cards.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { LuSearch } from 'react-icons/lu';
import { focusRing } from './styles';

type Item = { slug: string; name: string; short: string; category: string; keywords: string[] };

const chip = (active: boolean) =>
  `inline-flex h-9 items-center rounded-full border px-3.5 text-[13.5px] transition-colors ${focusRing} ${
    active ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface text-ink-2 hover:border-brand-100 hover:text-brand'
  }`;

export function CatalogDirectory({ items, categories, cards, noun = 'tools', placeholder }: {
  items: Item[];
  categories: { id: string; name: string; blurb: string }[];
  cards: Record<string, ReactNode>;
  noun?: string;
  placeholder: string;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const visible = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return new Set(items
      .filter((item) => category === 'all' || item.category === category)
      .filter((item) => words.every((word) => [item.name, item.short, ...item.keywords].join(' ').toLowerCase().includes(word)))
      .map((item) => item.slug));
  }, [category, items, query]);

  return (
    <>
      <div className="mx-auto flex max-w-[860px] flex-col items-center gap-4">
        <label className="relative w-full max-w-[520px]">
          <span className="sr-only">Search {noun}</span>
          <LuSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder}
            className={`h-12 w-full rounded-xl border border-line bg-surface pl-11 pr-4 text-[15px] text-ink placeholder:text-subtle ${focusRing}`} />
        </label>
        <div role="group" aria-label="Filter by category" className="flex flex-wrap justify-center gap-2">
          <button type="button" aria-pressed={category === 'all'} onClick={() => setCategory('all')} className={chip(category === 'all')}>All</button>
          {categories.map((item) => (
            <button key={item.id} type="button" aria-pressed={category === item.id} onClick={() => setCategory(item.id)} className={chip(category === item.id)}>{item.name}</button>
          ))}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">{visible.size} {noun} shown</p>
      <div className="mt-12 flex flex-col gap-14">
        {categories.map((item) => {
          const inCategory = items.filter((entry) => entry.category === item.id);
          if (!inCategory.some((entry) => visible.has(entry.slug))) return null;
          return (
            <section key={item.id} aria-labelledby={`cat-${item.id}`}>
              <h2 id={`cat-${item.id}`} className="font-serif text-[26px] font-semibold tracking-[-0.015em] text-ink">{item.name}</h2>
              <p className="mt-1 text-[15px] text-muted">{item.blurb}</p>
              <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {inCategory.map((entry) => <li key={entry.slug} hidden={!visible.has(entry.slug)}>{cards[entry.slug]}</li>)}
              </ul>
            </section>
          );
        })}
        {visible.size === 0 && (
          <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
            <p className="text-[16px] font-medium text-ink">Nothing matches “{query}”.</p>
            <p className="mt-1 text-[14.5px] text-muted">Try another word, or <button type="button" onClick={() => { setQuery(''); setCategory('all'); }} className={`rounded text-brand underline underline-offset-4 ${focusRing}`}>show everything</button>.</p>
          </div>
        )}
      </div>
    </>
  );
}
