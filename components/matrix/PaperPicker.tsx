'use client';

import { useEffect, useMemo, useState } from 'react';
import { LuSearch } from 'react-icons/lu';
import { Chip, StatusPill, inputClass } from '@/components/app/ui';
import { api } from '@/lib/session';

type LibraryItem = { id: string; title?: string; filename: string; authors?: string[]; publication_date?: string; chunk_count: number; doi?: string };
type Folder = { id: string; name: string; document_count: number };

/** Choose papers from the Library: whole folders, or papers one by one (searchable). */
export function PaperPicker({ selected, onSelected, folders, onFolders, exclude = [] }: {
  selected: string[];
  onSelected: (ids: string[]) => void;
  folders: string[];
  onFolders: (ids: string[]) => void;
  /** Papers already in the matrix (shown as added). */
  exclude?: string[];
}) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [folderList, setFolderList] = useState<Folder[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const excluded = useMemo(() => new Set(exclude), [exclude]);

  useEffect(() => {
    api<Folder[]>('/api/library/folders').then(setFolderList).catch(() => setFolderList([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      const query = new URLSearchParams({ page: String(page), page_size: '50' });
      if (search.trim()) query.set('search', search.trim());
      api<{ documents: LibraryItem[]; has_more: boolean }>(`/api/library/documents?${query}`)
        .then((result) => {
          if (cancelled) return;
          setItems((current) => (page === 1 ? result.documents : [...current, ...result.documents]));
          setHasMore(result.has_more);
          setError(null);
        })
        .catch((caught) => !cancelled && setError((caught as Error).message))
        .finally(() => !cancelled && setLoading(false));
    }, search ? 250 : 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [page, search]);

  const toggle = (id: string) => onSelected(selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id]);
  const toggleFolder = (id: string) => onFolders(folders.includes(id) ? folders.filter((value) => value !== id) : [...folders, id]);
  const selectable = items.filter((item) => !excluded.has(item.id));
  const allShown = selectable.length > 0 && selectable.every((item) => selected.includes(item.id));

  return (
    <div>
      {folderList.length ? (
        <div className="mb-3">
          <p className="mb-1.5 text-[12.5px] font-medium text-muted">Whole folders</p>
          <div className="flex flex-wrap gap-1.5">
            {folderList.map((folder) => (
              <Chip key={folder.id} active={folders.includes(folder.id)} onClick={() => toggleFolder(folder.id)}>
                {folder.name}<span className="text-subtle">{folder.document_count}</span>
              </Chip>
            ))}
          </div>
        </div>
      ) : null}
      <div className="relative">
        <LuSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
        <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search your Library by title or DOI" className={`${inputClass} pl-10`} />
      </div>
      <div className="mt-2 flex items-center justify-between text-[13px] text-muted">
        <span>{selected.length} paper{selected.length === 1 ? '' : 's'} chosen{folders.length ? `, plus ${folders.length} folder${folders.length === 1 ? '' : 's'}` : ''}</span>
        {selectable.length ? (
          <button type="button" className="font-semibold text-brand hover:underline" onClick={() => onSelected(allShown ? selected.filter((id) => !selectable.some((item) => item.id === id)) : [...new Set([...selected, ...selectable.map((item) => item.id)])])}>
            {allShown ? 'Clear these' : 'Choose all shown'}
          </button>
        ) : null}
      </div>
      {error ? <p className="mt-2 text-[13px] text-red-600">{error}</p> : null}
      <ul className="mt-2 max-h-[46vh] overflow-y-auto rounded-xl border border-line">
        {items.map((item) => {
          const added = excluded.has(item.id);
          const year = String(item.publication_date || '').match(/\d{4}/)?.[0];
          return (
            <li key={item.id} className="border-b border-line-2 last:border-b-0">
              <label className={`flex items-start gap-3 px-3.5 py-2.5 ${added ? 'opacity-60' : 'cursor-pointer hover:bg-soft'}`}>
                <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--color-brand)]" disabled={added} checked={added || selected.includes(item.id)} onChange={() => toggle(item.id)} />
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-[14px] font-medium text-ink">{item.title || item.filename}</span>
                  <span className="mt-0.5 block truncate text-[12.5px] text-muted">{[(item.authors || []).slice(0, 3).join(', '), year].filter(Boolean).join(' · ') || 'No details'}</span>
                </span>
                {added ? <StatusPill>In matrix</StatusPill> : item.chunk_count > 0 ? <StatusPill tone="positive">Full text</StatusPill> : <StatusPill tone="warning">Abstract only</StatusPill>}
              </label>
            </li>
          );
        })}
        {!items.length && !loading ? <li className="px-4 py-8 text-center text-[14px] text-muted">{search ? 'No papers match.' : 'Your Library is empty. Add papers from Find papers or upload PDFs first.'}</li> : null}
        {loading ? <li className="px-4 py-3 text-center text-[13px] text-muted">Loading…</li> : null}
      </ul>
      {hasMore && !loading ? <button type="button" onClick={() => setPage((value) => value + 1)} className="mt-2 text-[13.5px] font-semibold text-brand hover:underline">Show more</button> : null}
    </div>
  );
}
