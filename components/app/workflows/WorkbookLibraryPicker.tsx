'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, inputClass } from '@/components/app/ui';
import { api } from '@/lib/session';

type LibraryItem = { id: string; title?: string; filename: string };
type LibraryPage = { documents: LibraryItem[]; total: number; page: number; has_more: boolean };

/** Uses the Library's existing pagination; selecting older sources never requires a re-upload. */
export function WorkbookLibraryPicker({ busy, onImport }: { busy: boolean; onImport: (documentId: string) => Promise<boolean> }) {
  const [documents, setDocuments] = useState<LibraryItem[]>([]);
  const [search, setSearch] = useState(''); const [activeSearch, setActiveSearch] = useState('');
  const [page, setPage] = useState(0); const [total, setTotal] = useState(0); const [more, setMore] = useState(false);
  const [selected, setSelected] = useState(''); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const generation = useRef(0);
  const lastRequest = useRef({ query: '', page: 1 });
  const load = async (query: string, nextPage: number) => {
    lastRequest.current = { query, page: nextPage };
    const request = ++generation.current; setLoading(true); setError('');
    if (nextPage === 1) setSelected('');
    try {
      const params = new URLSearchParams({ page: String(nextPage), page_size: '100' }); if (query.trim()) params.set('search', query.trim());
      const result = await api<LibraryPage>(`/api/library/documents?${params}`);
      if (request !== generation.current) return;
      setDocuments((current) => [...new Map([...(nextPage === 1 ? [] : current), ...result.documents].map((document) => [document.id, document])).values()]);
      setPage(result.page); setTotal(result.total); setMore(result.has_more); setActiveSearch(query.trim());
    } catch (e) { if (request === generation.current) setError((e as Error).message); }
    finally { if (request === generation.current) setLoading(false); }
  };
  useEffect(() => { void load('', 1); return () => { generation.current += 1; }; }, []);
  return <div className="min-w-0 w-full">
    <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); void load(search, 1); }}>
      <label className="grid min-w-0 flex-1 gap-1.5 text-sm font-semibold">Find a Library source<input className={inputClass} maxLength={300} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Title, filename or DOI" /></label>
      <Button type="submit" disabled={busy || loading}>Search Library</Button>
      {activeSearch && <Button disabled={busy || loading} onClick={() => { setSearch(''); void load('', 1); }}>Browse all</Button>}
    </form>
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error} <button type="button" className="font-semibold underline" onClick={() => void load(lastRequest.current.query, lastRequest.current.page)}>Retry</button></p>}
    <div className="mt-3 flex flex-wrap items-end gap-3"><label className="grid min-w-0 flex-1 gap-1.5 text-sm font-semibold">Import a Library source<select disabled={busy || loading} className={inputClass} value={selected} onChange={(e) => setSelected(e.target.value)}><option value="">Choose a document</option>{documents.map((document) => <option key={document.id} value={document.id}>{document.title || document.filename}</option>)}</select></label><Button disabled={busy || loading || !selected} onClick={() => void onImport(selected)}>Import source text</Button></div>
    <div className="mt-2 flex flex-wrap items-center gap-3"><p role="status" className="text-xs text-muted">{loading ? 'Loading Library sources…' : `${documents.length.toLocaleString()} of ${total.toLocaleString()} ${activeSearch ? 'matching ' : ''}sources loaded`}</p>{more && <Button size="sm" disabled={busy || loading} onClick={() => void load(activeSearch, page + 1)}>Load more sources</Button>}{!loading && !error && !documents.length && <p className="text-xs text-muted">{activeSearch ? 'No matching sources. Change the search or browse all.' : 'Add sources to your Library to import them here.'}</p>}</div>
    {activeSearch && <p className="mt-2 text-xs text-muted">Library search checks the latest 10,000 items. Browse all and load more to reach older sources.</p>}
  </div>;
}
