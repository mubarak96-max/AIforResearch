'use client';

import { useEffect, useState } from 'react';
import { LuSearch } from 'react-icons/lu';
import { focusRing } from './styles';

/**
 * Filters the help center in place: every answer stays in the server-rendered HTML (so search
 * engines and no-JS readers see it all); this only hides items that do not match.
 */
export function HelpSearch() {
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState<number | null>(null);

  useEffect(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    let count = 0;
    document.querySelectorAll<HTMLElement>('[data-help-section]').forEach((section) => {
      let visible = 0;
      section.querySelectorAll<HTMLElement>('[data-help-item]').forEach((item) => {
        const match = words.every((word) => (item.textContent || '').toLowerCase().includes(word));
        item.hidden = !match;
        if (match) visible += 1;
      });
      section.hidden = visible === 0;
      count += visible;
    });
    setShown(words.length ? count : null);
  }, [query]);

  return (
    <div className="mb-10">
      <label className="relative block max-w-[560px]">
        <span className="sr-only">Search help</span>
        <LuSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search help, e.g. “export”, “cite”, “shortcut”"
          className={`h-12 w-full rounded-xl border border-line bg-surface pl-11 pr-4 text-[15px] text-ink placeholder:text-subtle ${focusRing}`} />
      </label>
      <p aria-live="polite" className="mt-2 text-[13.5px] text-muted">
        {shown === null ? '' : shown === 0 ? <>No answers match. Try another word, or <a href="/help#start" onClick={() => setQuery('')} className="underline">browse all topics</a>.</> : `${shown} ${shown === 1 ? 'answer' : 'answers'}`}
      </p>
    </div>
  );
}
