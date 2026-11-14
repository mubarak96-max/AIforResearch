'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { LuArrowLeft, LuHighlighter, LuMinus, LuPlus, LuStickyNote, LuX } from 'react-icons/lu';
import { api, authHeaders } from '@/lib/session';
import { Button, inputClass } from '@/components/app/ui';
import { showError } from '@/components/app/research/parts';
import { ThemeToggle } from '@/components/theme/theme';
import { useSignedIn } from '@/components/app/useSignedIn';
import { openPdf, selectionRects, type Highlight, type HighlightColor, type Rect } from './pdf';
import { PdfPage, TEXT_LAYER_CSS } from './PdfPage';
import { ColorDots, HighlightPanel, type MatrixOption, type ProjectOption } from './HighlightPanel';

const EditorToaster = dynamic(() => import('@/components/editor').then((mod) => mod.EditorToaster), { ssr: false });

type LibraryDocument = {
  id: string; filename: string; file_type: string; title?: string; authors?: string[]; doi?: string; publisher?: string;
  publication_date?: string; abstract?: string; processing_status: string; processing_error?: string;
};
type FileState = 'loading' | 'ready' | 'none' | 'processing' | 'error';
type Pending = { page: number; quote: string; rects: Rect[] };

const ZOOMS = [0.5, 0.67, 0.8, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];
const GAP = 16;
const byPosition = (a: Highlight, b: Highlight) => a.page - b.page || a.created_at.localeCompare(b.created_at);

function metadataLine(doc: LibraryDocument) {
  const authors = doc.authors?.length ? `${doc.authors.slice(0, 3).join(', ')}${doc.authors.length > 3 ? ' et al.' : ''}` : '';
  const year = doc.publication_date?.match(/\d{4}/)?.[0] ?? '';
  return [authors, year, doc.publisher, doc.doi ? `doi:${doc.doi}` : ''].filter(Boolean).join(' · ');
}

/** The Library PDF reader: pages rendered as they scroll into view, a selectable text layer, highlights and notes. */
export function PdfReader({ id }: { id: string }) {
  const params = useSearchParams();
  const { user, loading } = useSignedIn();
  const base = `/api/library/documents/${encodeURIComponent(id)}`;
  const [doc, setDoc] = useState<LibraryDocument | null>(null);
  const [docError, setDocError] = useState('');
  const [fileState, setFileState] = useState<FileState>('loading');
  const [fileError, setFileError] = useState('');
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [sizes, setSizes] = useState<{ w: number; h: number }[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [highlightsLoaded, setHighlightsLoaded] = useState(false);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [matrices, setMatrices] = useState<MatrixOption[]>([]);
  const [zoom, setZoom] = useState<number | 'fit'>('fit');
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState<Set<number>>(new Set());
  const [current, setCurrent] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [pending, setPending] = useState<Pending | null>(null);
  const [noteDraft, setNoteDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef(new Map<number, HTMLDivElement>());
  const noteOpen = useRef(false);
  noteOpen.current = noteDraft !== null;

  const loadHighlights = useCallback(async () => {
    const data = await api<{ highlights: Highlight[] }>(`${base}/highlights`);
    setHighlights(data.highlights); setHighlightsLoaded(true);
  }, [base]);

  // The document, its PDF and highlights, and where highlights can be sent.
  useEffect(() => {
    if (loading || !user) return;
    let live = true;
    let opened: PDFDocumentProxy | null = null;
    (async () => {
      let found: LibraryDocument;
      try { found = await api<LibraryDocument>(base); } catch (error) { if (live) setDocError((error as Error).message); return; }
      if (!live) return;
      setDoc(found);
      void loadHighlights().catch((error) => { if (live) { setHighlightsLoaded(true); showError(error); } });
      if (found.file_type !== 'pdf') { setFileState('none'); return; }
      try {
        const response = await fetch(`${base}/file`, { headers: await authHeaders() });
        if (response.status === 404) { setFileState(found.processing_status === 'pending' ? 'processing' : 'none'); return; }
        if (!response.ok) throw new Error(`The PDF could not be loaded (${response.status}).`);
        opened = await openPdf(await response.arrayBuffer());
        if (!live) { void opened.destroy(); return; }
        const first = (await opened.getPage(1)).getViewport({ scale: 1 });
        setSizes(Array.from({ length: opened.numPages }, () => ({ w: first.width, h: first.height })));
        setPdf(opened); setFileState('ready');
      } catch (error) {
        if (live) { setFileError((error as Error).message || 'The PDF could not be opened.'); setFileState('error'); }
      }
    })();
    api<{ projects: ProjectOption[] }>('/api/projects').then((data) => { if (live) setProjects(data.projects); }).catch(() => undefined);
    api<{ matrices: MatrixOption[] }>('/api/matrices').then((data) => { if (live) setMatrices(data.matrices); }).catch(() => undefined);
    return () => { live = false; void opened?.destroy(); };
  }, [base, loading, user, loadHighlights]);

  // Fit width follows the reading column.
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [fileState]);
  const fitScale = sizes[0] && width ? Math.min(4, Math.max(0.3, (width - 2 * GAP) / sizes[0].w)) : 1;
  const scale = zoom === 'fit' ? fitScale : zoom;

  // Pages near the viewport are drawn; the rest stay as sized placeholders.
  useEffect(() => {
    const root = scrollRef.current;
    if (!root || !pdf) return;
    const observer = new IntersectionObserver((entries) => {
      setVisible((previous) => {
        const next = new Set(previous);
        for (const entry of entries) {
          const page = Number((entry.target as HTMLElement).dataset.readerPage);
          if (entry.isIntersecting) next.add(page); else next.delete(page);
        }
        return next;
      });
    }, { root, rootMargin: '1200px 0px' });
    for (const element of pageRefs.current.values()) observer.observe(element);
    return () => observer.disconnect();
  }, [pdf, sizes.length]);

  const pageTop = (page: number) => pageRefs.current.get(page)?.offsetTop ?? 0;
  const jumpToPage = useCallback((page: number, behavior: ScrollBehavior = 'auto') => {
    const target = Math.min(Math.max(1, page), sizes.length || 1);
    scrollRef.current?.scrollTo({ top: pageTop(target) - GAP / 2, behavior });
  }, [sizes.length]);
  const focusHighlight = useCallback((highlight: Highlight, behavior: ScrollBehavior = 'smooth') => {
    setSelectedId(highlight.id);
    const size = sizes[highlight.page - 1];
    const offset = size && highlight.rects[0] ? highlight.rects[0].y * size.h * scale : 0;
    scrollRef.current?.scrollTo({ top: Math.max(0, pageTop(highlight.page) + offset - 96), behavior });
    setFlashId(null);
    requestAnimationFrame(() => setFlashId(highlight.id));
  }, [sizes, scale]);
  useEffect(() => { if (!flashId) return; const timer = setTimeout(() => setFlashId(null), 1700); return () => clearTimeout(timer); }, [flashId]);

  // Keep the reading position when the zoom changes.
  const currentRef = useRef(current);
  currentRef.current = current;
  useEffect(() => { if (pdf) jumpToPage(currentRef.current); }, [scale]); // eslint-disable-line react-hooks/exhaustive-deps

  // Links from the editor's evidence cards: ?page=n&highlight=id.
  const deepLinked = useRef(false);
  useEffect(() => {
    if (deepLinked.current || !pdf || !highlightsLoaded || !width) return;
    deepLinked.current = true;
    const wanted = params.get('highlight');
    const target = wanted ? highlights.find((item) => item.id === wanted) : undefined;
    const page = Number(params.get('page'));
    requestAnimationFrame(() => {
      if (target) focusHighlight(target, 'auto');
      else if (page >= 1) jumpToPage(page);
    });
  }, [pdf, highlightsLoaded, width, highlights, params, focusHighlight, jumpToPage]);

  const onScroll = () => {
    const top = (scrollRef.current?.scrollTop ?? 0) + 80;
    let page = 1;
    for (let index = 1; index <= sizes.length; index += 1) {
      if (pageTop(index) <= top) page = index; else break;
    }
    if (page !== current) { setCurrent(page); setPageInput(String(page)); }
  };

  // A text selection on a page offers the highlight toolbar.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const update = () => {
      if (noteOpen.current) return;
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.rangeCount) { setPending(null); return; }
      const range = selection.getRangeAt(0);
      const node = range.startContainer;
      const pageElement = (node instanceof Element ? node : node.parentElement)?.closest<HTMLElement>('[data-reader-page]');
      if (!pageElement || !scrollRef.current?.contains(pageElement)) { setPending(null); return; }
      const quote = selection.toString().replace(/\s+/g, ' ').trim().slice(0, 4000);
      const rects = selectionRects(range, pageElement.getBoundingClientRect());
      setPending(quote && rects.length ? { page: Number(pageElement.dataset.readerPage), quote, rects } : null);
    };
    const onChange = () => { clearTimeout(timer); timer = setTimeout(update, 150); };
    document.addEventListener('selectionchange', onChange);
    return () => { document.removeEventListener('selectionchange', onChange); clearTimeout(timer); };
  }, []);

  const save = async (color: HighlightColor, note = '') => {
    if (!pending || saving) return;
    setSaving(true);
    try {
      const created = await api<Highlight>(`${base}/highlights`, { method: 'POST', body: JSON.stringify({ page: pending.page, quote: pending.quote, rects: pending.rects, color, note }) });
      setHighlights((list) => [...list, created].sort(byPosition));
      setSelectedId(created.id);
      window.getSelection()?.removeAllRanges();
      setPending(null); setNoteDraft(null);
    } catch (error) { showError(error); } finally { setSaving(false); }
  };

  const zoomBy = (direction: 1 | -1) => {
    const next = direction > 0 ? ZOOMS.find((step) => step > scale + 0.01) : [...ZOOMS].reverse().find((step) => step < scale - 0.01);
    if (next) setZoom(next);
  };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.metaKey || event.ctrlKey || event.altKey || target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key === '+' || event.key === '=') { event.preventDefault(); zoomBy(1); }
      else if (event.key === '-') { event.preventDefault(); zoomBy(-1); }
      else if (event.key === '0') { event.preventDefault(); setZoom('fit'); }
      else if (event.key === 'Escape') { setPending(null); setNoteDraft(null); setSheet(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const onSize = useCallback((page: number, size: { w: number; h: number }) => {
    setSizes((list) => list.map((item, index) => (index === page - 1 ? size : item)));
  }, []);
  const onPick = useCallback((highlight: Highlight) => { focusHighlight(highlight); setSheet(true); }, [focusHighlight]);
  const byPage = useMemo(() => {
    const map = new Map<number, Highlight[]>();
    for (const highlight of highlights) map.set(highlight.page, [...(map.get(highlight.page) ?? []), highlight]);
    return map;
  }, [highlights]);

  if (loading || (!user && !docError)) return <p className="p-10 text-center text-muted">Loading…</p>;

  const toolbar = pending && sizes[pending.page - 1] && (() => {
    const last = pending.rects[pending.rects.length - 1];
    const first = pending.rects[0];
    const pageWidth = sizes[pending.page - 1].w * scale;
    const left = Math.min(Math.max(0, first.x * pageWidth), Math.max(0, pageWidth - 260));
    return (
      <div className="absolute z-[5] w-max max-w-[min(320px,calc(100vw-32px))] rounded-xl border border-line bg-surface p-2 text-ink shadow-[0_8px_24px_rgba(15,23,42,.18)]"
        style={{ left, top: `calc(${(last.y + last.h) * 100}% + 8px)` }} onMouseDown={(event) => { if (!(event.target as HTMLElement).closest('textarea')) event.preventDefault(); }}>
        {noteDraft === null ? (
          <div className="flex items-center gap-2">
            <LuHighlighter className="h-4 w-4 text-muted" aria-hidden="true" />
            <ColorDots label="Highlight in colour" onChange={(color) => void save(color)} />
            <Button size="sm" variant="ghost" disabled={saving} onClick={() => setNoteDraft('')}><LuStickyNote aria-hidden="true" /> Add note</Button>
          </div>
        ) : (
          <form className="w-[260px] max-w-full space-y-2" onSubmit={(event) => { event.preventDefault(); void save('yellow', noteDraft); }}>
            <textarea autoFocus className={`${inputClass} h-20 py-2 text-[14px]`} value={noteDraft} maxLength={4000} placeholder="Your note on this passage"
              onChange={(event) => setNoteDraft(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); void save('yellow', noteDraft); } }} />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => { setNoteDraft(null); setPending(null); window.getSelection()?.removeAllRanges(); }}>Cancel</Button>
              <Button size="sm" variant="primary" type="submit" disabled={saving}>Save highlight</Button>
            </div>
          </form>
        )}
      </div>
    );
  })();

  const title = doc?.title || doc?.filename || 'Library source';
  const panel = (
    <HighlightPanel documentId={id} highlights={highlights} selectedId={selectedId} projects={projects} matrices={matrices}
      onPick={(highlight) => { focusHighlight(highlight); if (window.matchMedia('(max-width: 1023px)').matches) setSheet(false); }}
      onChanged={(highlight) => setHighlights((list) => list.map((item) => (item.id === highlight.id ? highlight : item)))}
      onDeleted={(removed) => { setHighlights((list) => list.filter((item) => item.id !== removed)); if (selectedId === removed) setSelectedId(null); }}
      onReload={() => loadHighlights().catch(showError)} />
  );

  return (
    <div className="flex h-dvh flex-col bg-surface text-ink">
      <style>{TEXT_LAYER_CSS}</style>
      <header className="flex shrink-0 items-start gap-2 border-b border-line px-3 py-2.5 md:px-5">
        <Link href="/editor?tool=library" aria-label="Back to the Library" title="Back to the Library" className="mt-0.5 grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full text-ink-2 hover:bg-soft"><LuArrowLeft className="h-5 w-5" /></Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-bold tracking-[-0.01em] md:text-[19px]">{docError ? 'Library source' : title}</h1>
          {doc && metadataLine(doc) && <p className="truncate text-[13px] text-muted">{metadataLine(doc)}</p>}
        </div>
        {fileState === 'ready' && (
          <Button size="sm" className="lg:hidden" onClick={() => setSheet(true)} aria-label={`Highlights (${highlights.length})`}><LuHighlighter aria-hidden="true" /> {highlights.length}</Button>
        )}
        <ThemeToggle />
      </header>

      {fileState === 'ready' && pdf && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line bg-soft px-3 py-1.5 text-[13.5px] md:px-5">
          <form className="flex items-center gap-1.5" onSubmit={(event) => { event.preventDefault(); const page = Number(pageInput); if (page >= 1) jumpToPage(page, 'smooth'); }}>
            <label htmlFor="reader-page" className="sr-only">Page number</label>
            <input id="reader-page" inputMode="numeric" className="h-8 w-14 rounded-lg border border-line bg-surface px-2 text-center text-[13.5px] focus:border-brand focus:outline-none"
              value={pageInput} onChange={(event) => setPageInput(event.target.value.replace(/\D/g, ''))} onBlur={() => setPageInput(String(current))} />
            <span className="text-muted">of {pdf.numPages}</span>
          </form>
          <span className="flex-1" />
          <Button size="sm" variant="ghost" aria-label="Zoom out (-)" onClick={() => zoomBy(-1)}><LuMinus aria-hidden="true" /></Button>
          <span className="w-12 text-center tabular-nums text-muted" aria-live="polite">{Math.round(scale * 100)}%</span>
          <Button size="sm" variant="ghost" aria-label="Zoom in (+)" onClick={() => zoomBy(1)}><LuPlus aria-hidden="true" /></Button>
          <Button size="sm" variant={zoom === 'fit' ? 'secondary' : 'ghost'} aria-pressed={zoom === 'fit'} onClick={() => setZoom('fit')}>Fit width</Button>
        </div>
      )}
      {fileState === 'ready' && doc && doc.processing_status !== 'completed' && (
        <p className="shrink-0 border-b border-line bg-amber-50 px-4 py-1.5 text-[13px] text-amber-800">
          {doc.processing_status === 'failed'
            ? 'The text of this PDF could not be extracted, so highlights cannot be matched to it. You can still highlight and take notes.'
            : 'Still reading the text of this PDF. Highlights you make now are kept but will show as not matched.'}
        </p>
      )}

      <div className="flex min-h-0 flex-1">
        {docError ? (
          <Message title="This source could not be opened">{docError} <Link className="font-semibold text-brand-600 underline" href="/editor?tool=library">Back to the Library</Link></Message>
        ) : fileState === 'loading' ? (
          <Message title="Opening the PDF…" />
        ) : fileState !== 'ready' || !pdf ? (
          <NoPdf doc={doc} state={fileState} error={fileError} />
        ) : (
          <>
            <div ref={scrollRef} onScroll={onScroll} tabIndex={0} aria-label="PDF pages"
              className="relative min-w-0 flex-1 overflow-auto bg-line-2 focus:outline-none">
              <div className="flex w-max min-w-full flex-col items-center px-4 py-4" style={{ gap: GAP }}>
                {sizes.map((size, index) => (
                  <div key={index + 1} ref={(element) => { if (element) pageRefs.current.set(index + 1, element); else pageRefs.current.delete(index + 1); }} data-reader-page={index + 1}>
                    <PdfPage pdf={pdf} number={index + 1} scale={scale} size={size} render={visible.has(index + 1)}
                      highlights={byPage.get(index + 1) ?? []} selectedId={selectedId} flashId={flashId} onSize={onSize} onPick={onPick}>
                      {pending?.page === index + 1 ? toolbar : null}
                    </PdfPage>
                  </div>
                ))}
              </div>
            </div>
            <aside aria-label="Highlights" className="hidden w-[360px] shrink-0 flex-col border-l border-line bg-surface lg:flex">
              <h2 className="shrink-0 border-b border-line-2 px-4 py-3 text-[15px] font-bold">Highlights <span className="font-medium text-muted">{highlights.length || ''}</span></h2>
              <div className="min-h-0 flex-1 overflow-y-auto">{panel}</div>
            </aside>
            {sheet && (
              <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true" aria-label="Highlights">
                <button type="button" aria-label="Close highlights" className="absolute inset-0 bg-ink/30" onClick={() => setSheet(false)} />
                <div className="absolute inset-x-0 bottom-0 flex max-h-[75dvh] flex-col rounded-t-2xl bg-surface shadow-float">
                  <div className="flex shrink-0 items-center border-b border-line-2 px-4 py-3">
                    <h2 className="flex-1 text-[15px] font-bold">Highlights <span className="font-medium text-muted">{highlights.length || ''}</span></h2>
                    <button type="button" aria-label="Close" onClick={() => setSheet(false)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-soft"><LuX className="h-4 w-4" /></button>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">{panel}</div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <EditorToaster />
    </div>
  );
}

function Message({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      <p className="text-[16px] font-semibold">{title}</p>
      {children && <p className="mt-2 text-[14px] leading-relaxed text-muted">{children}</p>}
    </div>
  );
}

function NoPdf({ doc, state, error }: { doc: LibraryDocument | null; state: FileState; error: string }) {
  const message = state === 'processing'
    ? 'This PDF is still being saved to your Library. Reload in a minute to read it.'
    : state === 'error' ? `${error} Reload to try again.` : 'There is no PDF for this source in your Library, so it cannot be read here. Upload the PDF to read and highlight it.';
  return (
    <div className="mx-auto w-full max-w-2xl overflow-y-auto px-5 py-8">
      <p role={state === 'error' ? 'alert' : 'status'} className={`rounded-xl px-4 py-3 text-[14px] ${state === 'error' ? 'bg-red-50 text-red-700' : 'bg-soft text-ink-2'}`}>{message}</p>
      {doc?.abstract && (
        <section className="mt-6">
          <h2 className="text-[15px] font-bold">Abstract</h2>
          <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-2">{doc.abstract}</p>
        </section>
      )}
      {doc?.doi && <p className="mt-4 text-[14px]"><a className="font-semibold text-brand-600 underline" href={`https://doi.org/${encodeURIComponent(doc.doi).replace(/%2F/g, '/')}`} target="_blank" rel="noreferrer">Open at the publisher (doi:{doc.doi})</a></p>}
    </div>
  );
}
