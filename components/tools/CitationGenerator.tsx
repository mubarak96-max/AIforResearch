'use client';

/**
 * The free citation generator (/tools/citation-generator and each style page). Finds a work by
 * DOI or title (GET /api/tools/cite), or takes a website, book or article typed in, and formats
 * it with citation-js in any CSL style. The list is kept in this browser only.
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import { Cite } from '@citation-js/core';
import '@citation-js/plugin-csl';
import { LuLoaderCircle, LuPlus, LuSearch, LuTrash2, LuX } from 'react-icons/lu';
import { api } from '@/lib/session';
import { COMMON_STYLES, loadCslStyle, normalizeStyleId, searchStyles, type CslStyleInfo } from '@/components/editor/lib/citations/cslStyles';
import { btnPrimary, focusRing } from '@/components/marketing/styles';

export type Csl = Record<string, unknown> & { id: string; type: string; title: string };
type Mode = 'search' | 'webpage' | 'book' | 'article-journal';

const STORAGE_KEY = 'writeorbit_citation_list';
export const control = `w-full rounded-xl border border-line bg-surface px-3.5 text-[15px] text-ink placeholder:text-subtle ${focusRing}`;
const tab = (active: boolean) => `inline-flex h-9 items-center rounded-lg px-3 text-[14px] ${focusRing} ${active ? 'bg-ink text-on-ink' : 'text-ink-2 hover:bg-soft'}`;

/** "Jane Smith; World Health Organization" -> CSL names. One word, or a name with "Organization"-style words, is a literal. */
export function parseAuthors(raw: string): ({ family: string; given: string } | { literal: string })[] {
  return raw.split(/;|\n/).map((part) => part.trim()).filter(Boolean).map((name) => {
    if (name.includes(',')) {
      const [family, ...given] = name.split(',');
      return { family: family.trim(), given: given.join(',').trim() };
    }
    const parts = name.split(/\s+/);
    if (parts.length === 1 || /\b(organi[sz]ation|association|institute|university|department|ministry|council|agency|foundation|society|group|inc|ltd|bbc|who|un)\b/i.test(name)) return { literal: name };
    return { family: parts[parts.length - 1], given: parts.slice(0, -1).join(' ') };
  });
}

function dateParts(value: string): { 'date-parts': number[][] } | undefined {
  const match = /^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?/.exec(value.trim());
  if (!match) return undefined;
  return { 'date-parts': [[Number(match[1]), ...(match[2] ? [Number(match[2])] : []), ...(match[3] ? [Number(match[3])] : [])]] };
}

const today = () => new Date().toISOString().slice(0, 10);
const newId = () => `manual-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export async function format(items: Csl[], styleId: string): Promise<{ entries: { id: string; html: string; inText: string }[]; numeric: boolean } | null> {
  const id = normalizeStyleId(styleId);
  const loaded = await loadCslStyle(id);
  if (!loaded) return null;
  // A missing style falls back to APA inside loadCslStyle, which answers with APA's bundled marker.
  const template = loaded.startsWith('bundled:') ? loaded.slice('bundled:'.length) : id;
  const entries = items.map((item) => {
    const cite = new Cite(item);
    const html = String(cite.format('bibliography', { format: 'html', template, lang: 'en-US' }) || '');
    const inText = String(cite.format('citation', { format: 'text', template, lang: 'en-US' }) || '');
    return { id: item.id, html: DOMPurify.sanitize(html, { ALLOWED_TAGS: ['i', 'em', 'b', 'strong', 'span', 'sup', 'sub', 'div', 'a'], ALLOWED_ATTR: ['href', 'class', 'style'] }), inText };
  });
  return { entries, numeric: /<category citation-format="numeric"/.test(loaded) || template === 'vancouver' };
}

export const textOf = (html: string) => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || '').replace(/\s+/g, ' ').trim();
};

export async function copyRich(html: string, text: string) {
  try {
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
      await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) })]);
    } else {
      await navigator.clipboard.writeText(text);
    }
    return true;
  } catch {
    return false;
  }
}

export function StylePicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CslStyleInfo[]>([]);
  const common = COMMON_STYLES.slice(0, 22);
  const current = common.find((style) => style.id === value);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const timer = window.setTimeout(() => {
      searchStyles(query, { limit: 8 }).then((found) => setResults(found.styles)).catch(() => setResults([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <label>
        <span className="mb-1.5 block text-[14px] font-medium text-ink">Style</span>
        <select value={current ? value : '__other'} onChange={(event) => event.target.value !== '__other' && onChange(event.target.value)} className={`${control} h-11`}>
          {common.map((style) => <option key={style.id} value={style.id}>{style.title}</option>)}
          {!current && <option value="__other">{value}</option>}
        </select>
      </label>
      <div className="relative">
        <label>
          <span className="mb-1.5 block text-[14px] font-medium text-ink">Or search 10,000+ styles</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="e.g. Nature, Lancet, Leeds Harvard" className={`${control} h-11`} />
        </label>
        {results.length > 0 && (
          <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-line bg-surface py-1 shadow-lg">
            {results.map((style) => (
              <li key={style.id}>
                <button type="button" onClick={() => { onChange(style.id); setQuery(''); setResults([]); }} className={`block w-full px-3.5 py-2 text-left text-[14px] text-ink-2 hover:bg-soft ${focusRing}`}>{style.title}</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ManualForm({ mode, onAdd }: { mode: Exclude<Mode, 'search'>; onAdd: (item: Csl) => void }) {
  const [v, setV] = useState<Record<string, string>>({ accessed: today() });
  const set = (key: string) => (event: { target: { value: string } }) => setV((current) => ({ ...current, [key]: event.target.value }));
  const input = (key: string, label: string, placeholder = '', required = false, type = 'text') => (
    <label className="block">
      <span className="mb-1.5 block text-[14px] font-medium text-ink">{label}{required ? '' : <span className="font-normal text-subtle"> (optional)</span>}</span>
      <input type={type} value={v[key] ?? ''} onChange={set(key)} placeholder={placeholder} required={required} className={`${control} h-11`} />
    </label>
  );
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const base: Csl = { id: newId(), type: mode, title: (v.title || '').trim(), author: parseAuthors(v.authors || '') };
    const issued = dateParts(v.date || '');
    if (issued) base.issued = issued;
    if (mode === 'webpage') Object.assign(base, { 'container-title': v.site || undefined, URL: v.url || undefined, accessed: dateParts(v.accessed || '') });
    if (mode === 'book') Object.assign(base, { publisher: v.publisher || undefined, 'publisher-place': v.place || undefined, edition: v.edition || undefined, ISBN: v.isbn || undefined, DOI: v.doi || undefined });
    if (mode === 'article-journal') Object.assign(base, { 'container-title': v.journal || undefined, volume: v.volume || undefined, issue: v.issue || undefined, page: v.pages || undefined, DOI: v.doi || undefined, URL: v.url || undefined });
    onAdd(JSON.parse(JSON.stringify(base)) as Csl);
    setV({ accessed: today() });
  };
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">{input('authors', 'Authors', 'Jane Smith; John Doe — or an organisation')}</div>
      <div className="sm:col-span-2">{input('title', mode === 'webpage' ? 'Page title' : 'Title', '', true)}</div>
      {mode === 'webpage' && <>{input('site', 'Website name', 'e.g. BBC News')}{input('url', 'URL', 'https://…', true, 'url')}{input('date', 'Published', 'YYYY-MM-DD')}{input('accessed', 'Accessed', 'YYYY-MM-DD')}</>}
      {mode === 'book' && <>{input('publisher', 'Publisher', '', true)}{input('date', 'Year', 'YYYY', true)}{input('edition', 'Edition', 'e.g. 2')}{input('place', 'Place of publication')}{input('isbn', 'ISBN')}{input('doi', 'DOI')}</>}
      {mode === 'article-journal' && <>{input('journal', 'Journal', '', true)}{input('date', 'Year', 'YYYY', true)}{input('volume', 'Volume')}{input('issue', 'Issue')}{input('pages', 'Pages', 'e.g. 12-34')}{input('doi', 'DOI')}</>}
      <div className="sm:col-span-2"><button type="submit" className={`${btnPrimary} h-11 rounded-[10px] px-5 text-[15px]`}><LuPlus className="h-4 w-4" aria-hidden="true" /> Add to list</button></div>
    </form>
  );
}

export function CitationGenerator({ defaultStyle = 'apa' }: { defaultStyle?: string }) {
  const [mode, setMode] = useState<Mode>('search');
  const [style, setStyle] = useState(defaultStyle);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [found, setFound] = useState<Csl[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [list, setList] = useState<Csl[]>([]);
  const [formatted, setFormatted] = useState<{ entries: { id: string; html: string; inText: string }[]; numeric: boolean } | null>(null);
  const [preview, setPreview] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);

  // The list is a per-browser convenience; it may come back empty.
  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); if (Array.isArray(saved)) setList(saved); } catch { /* blocked */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* blocked */ }
  }, [list]);

  useEffect(() => {
    let cancelled = false;
    format(list, style).then((result) => { if (!cancelled) setFormatted(result); }).catch(() => !cancelled && setFormatted(null));
    return () => { cancelled = true; };
  }, [list, style]);

  // Search results are previewed in the chosen style too.
  useEffect(() => {
    if (!found?.length) { setPreview({}); return; }
    let cancelled = false;
    format(found, style).then((result) => { if (!cancelled && result) setPreview(Object.fromEntries(result.entries.map((entry) => [entry.id, entry.html]))); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [found, style]);

  async function search(event: FormEvent) {
    event.preventDefault();
    setSearching(true);
    setError(null);
    try {
      const response = await api<{ results: Csl[] }>(`/api/tools/cite?q=${encodeURIComponent(query)}`);
      setFound(response.results);
      if (!response.results.length) setError('Nothing found. Check the DOI, try fewer words, or enter the source by hand.');
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setSearching(false);
    }
  }

  const add = useCallback((item: Csl) => setList((current) => (current.some((other) => other.id === item.id) ? current : [...current, item])), []);

  const ordered = useMemo(() => {
    if (!formatted) return [];
    if (formatted.numeric) return formatted.entries;
    return [...formatted.entries].sort((a, b) => textOf(a.html).localeCompare(textOf(b.html)));
  }, [formatted]);

  const flash = (id: string) => { setCopied(id); window.setTimeout(() => setCopied(null), 1600); };

  return (
    <div className="flex flex-col gap-6">
      <StylePicker value={style} onChange={setStyle} />

      <div>
        <div role="tablist" aria-label="Source" className="flex flex-wrap gap-1">
          {([['search', 'DOI or title'], ['webpage', 'Website'], ['book', 'Book'], ['article-journal', 'Journal article']] as [Mode, string][]).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={mode === id} onClick={() => setMode(id)} className={tab(mode === id)}>{label}</button>
          ))}
        </div>
        <div className="mt-4">
          {mode === 'search' ? (
            <>
              <form onSubmit={search} role="search" className="flex gap-2">
                <label className="relative flex-1">
                  <span className="sr-only">DOI, title or keywords</span>
                  <LuSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} required minLength={3} placeholder="Paste a DOI, or type a title or keywords" className={`${control} h-12 pl-11`} />
                </label>
                <button type="submit" disabled={searching} className={`${btnPrimary} h-12 rounded-xl px-5 text-[15px]`}>
                  {searching ? <LuLoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : 'Find'}
                </button>
              </form>
              {error && <p role="alert" className="mt-3 text-[14px] text-amber-800">{error}</p>}
              {found && found.length > 0 && (
                <ul className="mt-4 divide-y divide-line-2 rounded-xl border border-line">
                  {found.map((item) => (
                    <li key={item.id} className="flex items-start gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1 font-serif text-[15px] leading-[1.55] text-ink-2 [overflow-wrap:anywhere]"
                        dangerouslySetInnerHTML={{ __html: preview[item.id] || DOMPurify.sanitize(String(item.title)) }} />
                      <button type="button" onClick={() => add(item)} disabled={list.some((other) => other.id === item.id)}
                        className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-line px-2.5 text-[13px] text-ink-2 hover:bg-soft disabled:opacity-50 ${focusRing}`}>
                        <LuPlus className="h-3.5 w-3.5" aria-hidden="true" />{list.some((other) => other.id === item.id) ? 'Added' : 'Add'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : <ManualForm key={mode} mode={mode} onAdd={add} />}
        </div>
      </div>

      <section aria-labelledby="list-title" className="rounded-2xl border border-line bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-2 px-5 py-3">
          <h2 id="list-title" className="text-[15px] font-semibold text-ink">Your list {list.length > 0 && <span className="font-normal text-muted">({list.length})</span>}</h2>
          {ordered.length > 0 && (
            <div className="flex gap-2">
              <button type="button" onClick={async () => { const html = ordered.map((entry) => entry.html).join(''); if (await copyRich(html, ordered.map((entry) => textOf(entry.html)).join('\n'))) flash('all'); }}
                className={`inline-flex h-8 items-center rounded-lg bg-brand px-2.5 text-[13px] font-medium text-on-brand hover:bg-brand-600 ${focusRing}`}>{copied === 'all' ? 'Copied' : 'Copy all'}</button>
              <button type="button" onClick={() => setList([])} className={`inline-flex h-8 items-center gap-1 rounded-lg border border-line px-2.5 text-[13px] text-ink-2 hover:bg-soft ${focusRing}`}><LuTrash2 className="h-3.5 w-3.5" aria-hidden="true" />Clear</button>
            </div>
          )}
        </div>
        {list.length === 0 ? (
          <p className="px-5 py-8 text-center text-[14.5px] text-muted">Sources you add appear here, formatted in your style.</p>
        ) : !formatted ? (
          <p className="flex items-center gap-2 px-5 py-6 text-[14px] text-muted"><LuLoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />Loading the style…</p>
        ) : (
          <ol className="divide-y divide-line-2">
            {ordered.map((entry) => (
              <li key={entry.id} className="flex items-start gap-3 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="pl-8 -indent-8 font-serif text-[15.5px] leading-[1.6] text-ink [overflow-wrap:anywhere]" dangerouslySetInnerHTML={{ __html: entry.html }} />
                  {entry.inText && <p className="mt-1.5 text-[13px] text-muted">In the text: <span className="font-serif text-ink-2">{entry.inText}</span></p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button type="button" onClick={async () => { if (await copyRich(entry.html, textOf(entry.html))) flash(entry.id); }} className={`inline-flex h-8 items-center rounded-lg border border-line px-2.5 text-[13px] text-ink-2 hover:bg-soft ${focusRing}`}>{copied === entry.id ? 'Copied' : 'Copy'}</button>
                  <button type="button" aria-label="Remove" onClick={() => setList((current) => current.filter((item) => item.id !== entry.id))} className={`grid size-8 place-items-center rounded-lg border border-line text-muted hover:bg-soft ${focusRing}`}><LuX className="h-3.5 w-3.5" aria-hidden="true" /></button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
      <p className="text-[13px] text-muted">Your list stays in this browser. Copy keeps italics when you paste into Word or Google Docs. Check every citation against the source.</p>
    </div>
  );
}
