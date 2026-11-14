'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LuBookOpen, LuChevronRight, LuCopy, LuExternalLink, LuFileText, LuFolder, LuHighlighter, LuLibrary, LuMessageCircle, LuQuote, LuSearch, LuUpload, LuX } from 'react-icons/lu';
import { toast } from 'react-hot-toast';
import { getDocuments, getFolders, type FolderResponse, type LibraryDocumentResponse } from '../../../utils/libraryApi';
import { copyLibraryReference, LIBRARY_CHANGED_EVENT } from '../../../lib/aiEditor/references';
import LibraryAddDialog, { type AddTab } from './LibraryAddDialog';
import { askAboutInSideloadChat } from '../../../lib/sideloads';
import { listHighlights, type LibraryHighlight } from '../../../lib/aiEditor/assistApi';

type Props = {
  /** In a document: cite into it. Elsewhere "Copy" puts the reference on the clipboard. */
  onCite?: (document: LibraryDocumentResponse) => void;
  /** In a document: cite a highlight from the reader, with its passage and page as the citation's evidence. */
  onCiteHighlight?: (document: LibraryDocumentResponse, highlight: LibraryHighlight) => void;
  /** Defaults to the app's AI Chat with this source attached. */
  onAsk?: (document: LibraryDocumentResponse) => void;
  citing?: boolean;
  /** False while the panel waits hidden behind another tab; showing it again reloads the list. */
  visible?: boolean;
};

export function libraryDocumentYear(document: Pick<LibraryDocumentResponse, 'publication_date'>) {
  const match = /\d{4}/.exec(String(document.publication_date || ''));
  return match ? match[0] : '';
}

export function libraryDocumentUrl(document: LibraryDocumentResponse) {
  const metadata = (document.metadata || {}) as Record<string, unknown>;
  if (document.doi) return `https://doi.org/${String(document.doi).replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')}`;
  if (typeof metadata.url === 'string') return metadata.url;
  if (typeof metadata.original_url === 'string') return metadata.original_url;
  return '';
}

/** The writer's Library (beside the document or in the app's left drawer): search, cite, ask about a PDF, upload. */
/** A paper's reader highlights, each citable with its passage. Loaded when the paper is opened in the list. */
function PaperHighlights({ document, citing, onCite }: { document: LibraryDocumentResponse; citing?: boolean; onCite: (highlight: LibraryHighlight) => void }) {
  const [highlights, setHighlights] = useState<LibraryHighlight[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    listHighlights(document.id)
      .then((result) => { if (live) setHighlights(result.highlights); })
      .catch((reason: Error) => { if (live) setError(reason.message); });
    return () => { live = false; };
  }, [document.id]);
  if (error) return <p className="text-[12.5px] text-muted">{error}</p>;
  if (!highlights) return <p className="text-[12.5px] text-muted">Loading highlights…</p>;
  if (!highlights.length) return <p className="text-[12.5px] text-muted">No highlights yet. Open the paper in the reader and highlight the passages you want to cite.</p>;
  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1 text-[12px] font-semibold text-muted"><LuHighlighter className="h-3.5 w-3.5" />Your highlights</p>
      {highlights.slice(0, 30).map((highlight) => (
        <div key={highlight.id} className="rounded-lg border border-line px-2 py-1.5">
          <p className="line-clamp-3 text-[12.5px] leading-[1.45] text-ink-2">“{highlight.quote}”</p>
          {highlight.note ? <p className="mt-0.5 line-clamp-2 text-[12px] text-muted">{highlight.note}</p> : null}
          <div className="mt-1 flex items-center gap-2 text-[11.5px] text-muted">
            <span>Page {highlight.page}{highlight.project_links?.length ? ' · in a project' : ''}</span>
            <button type="button" disabled={citing} onClick={() => onCite(highlight)} className="ml-auto inline-flex h-6 items-center gap-1 rounded-md px-1.5 font-semibold text-[var(--theme-primary,var(--color-brand))] hover:bg-soft disabled:opacity-60">
              <LuQuote className="h-3 w-3" />Cite this
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LibraryPanel({ onCite, onCiteHighlight, onAsk, citing, visible = true }: Props) {
  const ask = onAsk || ((document: LibraryDocumentResponse) => askAboutInSideloadChat({ id: document.id, title: document.title || document.filename }));
  const cite = (document: LibraryDocumentResponse) => {
    if (onCite) {
      onCite(document);
      return;
    }
    copyLibraryReference(document)
      .then(() => toast.success('Reference copied'))
      .catch(() => toast.error('The reference could not be copied.'));
  };
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'sources' | 'collections'>('sources');
  const [folderId, setFolderId] = useState('');
  const [folders, setFolders] = useState<FolderResponse[]>([]);
  const [documents, setDocuments] = useState<LibraryDocumentResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adding, setAdding] = useState<AddTab | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(async (search: string, folder: string) => {
    const request = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const response = await getDocuments({
        search: search.trim() || undefined,
        folder_id: folder || undefined,
        page_size: 40,
        order_by: 'created_at',
        order_desc: true,
      });
      if (request !== requestRef.current) return;
      setDocuments(response.documents);
      setTotal(response.total);
    } catch (caught) {
      if (request === requestRef.current) setError((caught as Error).message || 'Your Library could not be loaded.');
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    getFolders().then(setFolders).catch(() => setFolders([]));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(query, folderId), query ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [folderId, load, query]);

  // Saved papers and uploads from other panels show up without a page reload.
  const latest = useRef({ query, folderId });
  latest.current = { query, folderId };
  const wasVisible = useRef(visible);
  useEffect(() => {
    if (visible && !wasVisible.current) {
      void load(latest.current.query, latest.current.folderId);
      getFolders().then(setFolders).catch(() => undefined);
    }
    wasVisible.current = visible;
  }, [load, visible]);
  useEffect(() => {
    const reload = () => void load(latest.current.query, latest.current.folderId);
    window.addEventListener(LIBRARY_CHANGED_EVENT, reload);
    return () => window.removeEventListener(LIBRARY_CHANGED_EVENT, reload);
  }, [load]);

  // Back from connecting Zotero or Mendeley: reopen the add dialog on that service.
  useEffect(() => {
    const hash = window.location.hash;
    const connected = /library-connected=(zotero|mendeley)/.exec(hash)?.[1] as AddTab | undefined;
    const failed = /library-error=([^&]+)/.exec(hash)?.[1];
    if (!connected && !failed) return;
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    if (connected) {
      toast.success(`${connected === 'zotero' ? 'Zotero' : 'Mendeley'} is connected.`);
      setAdding(connected);
    } else if (failed) {
      toast.error(decodeURIComponent(failed));
    }
  }, []);

  const smallButton = 'inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[12.5px] font-medium text-ink-3 transition-colors hover:bg-line-2 hover:text-ink disabled:opacity-60';

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="px-3 pt-3">
        <div className="flex items-center gap-1.5">
          <div className="group relative min-w-0 flex-1">
            <LuSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle group-focus-within:text-[var(--theme-primary,var(--color-brand))]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={total ? `Search ${total} source${total === 1 ? '' : 's'}` : 'Search Library'}
              aria-label="Search your Library"
              className="h-9 w-full rounded-[10px] border border-line bg-surface pl-9 pr-3 text-[14px] text-ink outline-none transition-[border,box-shadow] placeholder:text-subtle focus:border-[var(--theme-primary,var(--color-brand))] focus:shadow-[0_0_0_3px_var(--color-brand-50)]"
            />
          </div>
          <button
            type="button"
            onClick={() => setAdding('pdfs')}
            aria-label="Add to Library"
            title="Upload PDFs, or import from Zotero, Mendeley, .bib/.ris or IDs"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[10px] bg-brand-50 px-3 text-[13px] font-semibold text-brand-600 transition-colors hover:bg-brand-100"
          >
            <LuUpload className="h-4 w-4" />
            Add
          </button>
        </div>
        {/* Sources and Collections (folders). */}
        <div className="mt-2 flex items-center gap-4 border-b border-line-2 px-1">
          {(['sources', 'collections'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={view === value}
              onClick={() => setView(value)}
              className={`-mb-px h-9 border-b-2 text-[13.5px] transition-colors ${view === value ? 'border-[var(--theme-primary,var(--color-brand))] font-semibold text-ink' : 'border-transparent font-medium text-muted hover:text-ink'}`}
            >
              {value === 'sources' ? 'Sources' : 'Collections'}
              <span className="ml-1.5 font-normal text-subtle">{value === 'sources' ? total || '' : folders.length || ''}</span>
            </button>
          ))}
          {folderId ? (
            <span className="ml-auto inline-flex max-w-[50%] items-center gap-1 rounded-md bg-brand-50 px-1.5 py-0.5 text-[12px] text-brand-600">
              <LuFolder className="h-3 w-3 shrink-0" />
              <span className="truncate">{folders.find((folder) => folder.id === folderId)?.name || 'Folder'}</span>
              <button type="button" aria-label="All sources" onClick={() => setFolderId('')}><LuX className="h-3 w-3" /></button>
            </span>
          ) : null}
        </div>
      </div>

      {view === 'collections' ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-2">
          {folders.length === 0 ? <p className="py-8 text-center text-[13px] text-subtle">No collections yet</p> : null}
          {folders.map((folder) => (
            <button
              key={folder.id}
              type="button"
              onClick={() => {
                setFolderId(folder.id);
                setView('sources');
              }}
              className="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left hover:bg-soft"
            >
              <LuFolder className="h-[18px] w-[18px] shrink-0 text-[var(--theme-primary,var(--color-brand))]" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium text-ink">{folder.name}</span>
                <span className="block text-[12px] text-muted">{folder.document_count} source{folder.document_count === 1 ? '' : 's'}</span>
              </span>
              <LuChevronRight className="h-4 w-4 text-line-3" />
            </button>
          ))}
        </div>
      ) : (
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4 pt-1">
        {error ? <div className="mt-2 rounded-[12px] border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[13px] text-[#991b1b]">{error}</div> : null}
        {!loading && !error && documents.length === 0 ? (
          query ? (
            <p className="py-8 text-center text-[13px] text-subtle">No matches</p>
          ) : (
            <div className="flex flex-col items-center px-6 pt-14 text-center">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-line-2 text-subtle"><LuLibrary className="h-5 w-5" /></span>
              <p className="mt-3 text-[14px] font-semibold text-ink">Your Library is empty</p>
              <p className="mt-1 text-[13px] text-muted">Add PDFs, or import from Zotero, Mendeley or a .bib file.</p>
              <button type="button" onClick={() => setAdding('pdfs')} className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-50 px-3 text-[13px] font-semibold text-brand-600 transition-colors hover:bg-brand-100">
                <LuUpload className="h-4 w-4" />Add to Library
              </button>
            </div>
          )
        ) : null}
        <div>
          {documents.map((document) => {
            const year = libraryDocumentYear(document);
            const url = libraryDocumentUrl(document);
            const authors = (document.authors || []).filter(Boolean);
            const expanded = expandedId === document.id;
            const processing = ['pending', 'processing', 'reprocessing'].includes(String(document.processing_status));
            const failed = String(document.processing_status) === 'failed';
            const isPdf = /pdf/i.test(String(document.file_type || document.filename || ''));
            const extractionWarnings = Array.isArray(document.metadata?.extraction_warnings) ? document.metadata.extraction_warnings.filter((value): value is string => typeof value === 'string') : [];
            const importConflicts = Array.isArray(document.metadata?.import_conflicts) ? document.metadata.import_conflicts.filter((value): value is { field: string; local: unknown; incoming: unknown } => Boolean(value && typeof value === 'object' && typeof value.field === 'string')) : [];
            // "Diekelmann, Susanne" and "Susanne Diekelmann" both give "Diekelmann".
            const surname = (name: string) => (name.includes(',') ? name.split(',')[0].trim() : name.trim().split(/\s+/).pop() || name);
            const authorLabel = authors.length
              ? authors.length > 2
                ? `${surname(authors[0])} et al.`
                : authors.map(surname).join(' & ')
              : 'Unknown authors';
            return (
              <article key={document.id} className="group flex gap-2.5 rounded-[12px] px-2 py-2.5 transition-colors hover:bg-soft">
                <span
                  className={`mt-0.5 grid h-10 w-8 shrink-0 place-items-center rounded-md text-[9.5px] font-bold ${isPdf ? 'bg-[#fef2f2] text-[#dc2626]' : 'bg-line-2 text-subtle'}`}
                  aria-hidden="true"
                >
                  {isPdf ? 'PDF' : <LuFileText className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <button type="button" onClick={() => setExpandedId(expanded ? null : document.id)} aria-expanded={expanded} className="block w-full text-left">
                    <h4 className={`text-[13.5px] font-semibold leading-[1.35] text-ink ${expanded ? '' : 'line-clamp-2'}`}>{document.title || document.filename}</h4>
                    <p className="mt-0.5 truncate text-[12.5px] text-muted">
                      {authorLabel}
                      {year ? ` · ${year}` : ''}
                      {document.publisher && !expanded ? <span className="italic"> · {document.publisher}</span> : null}
                    </p>
                    {processing ? (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-[#fffbeb] px-1.5 py-0.5 text-[11.5px] font-medium text-[#b45309]">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#f59e0b]" />Processing
                      </span>
                    ) : failed ? (
                      <span className="mt-1 inline-flex rounded-md bg-[#fef2f2] px-1.5 py-0.5 text-[11.5px] font-medium text-[#b91c1c]">Could not read</span>
                    ) : null}
                    {(extractionWarnings.length > 0 || importConflicts.length > 0) && <span className="mt-1 inline-flex rounded-md bg-[#fffbeb] px-1.5 py-0.5 text-[11.5px] font-medium text-[#b45309]">{extractionWarnings.length ? 'Check extracted text' : 'Local edits preserved'}</span>}
                    {(document as { folder_id?: string | null }).folder_id && !folderId ? (
                      <span className="mt-1 inline-flex max-w-full items-center gap-1 rounded-md border border-line px-1.5 py-0.5 text-[11.5px] text-ink-3">
                        <LuFolder className="h-3 w-3 shrink-0 text-[var(--theme-primary,var(--color-brand))]" />
                        <span className="truncate">{folders.find((folder) => folder.id === (document as { folder_id?: string | null }).folder_id)?.name || 'Folder'}</span>
                      </span>
                    ) : null}
                  </button>
                  {expanded ? (
                    <div className="mt-2 space-y-1.5 text-[13px] text-ink-2">
                      {document.publisher ? <p className="text-[12.5px] italic text-muted">{document.publisher}</p> : null}
                      {document.abstract ? <p className="leading-[1.5]">{document.abstract}</p> : <p className="text-muted">No abstract.</p>}
                      {extractionWarnings.length > 0 && <details className="text-[#b45309]"><summary className="cursor-pointer">Text extraction notes</summary><ul className="mt-1 list-disc space-y-1 pl-4">{extractionWarnings.map((warning, at) => <li key={at}>{warning}</li>)}</ul></details>}
                      {importConflicts.length > 0 && <details><summary className="cursor-pointer text-[#b45309]">Compare imported values with your saved values</summary><p className="mt-1 text-muted">Your saved values are retained. Changed DOI identities require a separate reference.</p><dl className="mt-2 space-y-2">{importConflicts.map((conflict, at) => <div key={at}><dt className="font-medium">{conflict.field.replaceAll('_', ' ')}</dt><dd className="break-words">Saved: {Array.isArray(conflict.local) ? conflict.local.join('; ') : String(conflict.local ?? 'Empty')}</dd><dd className="break-words text-muted">Imported: {Array.isArray(conflict.incoming) ? conflict.incoming.join('; ') : String(conflict.incoming ?? 'Empty')}</dd></div>)}</dl></details>}
                      {document.doi ? (
                        <button
                          type="button"
                          onClick={() => void navigator.clipboard?.writeText(String(document.doi)).then(() => toast.success('DOI copied')).catch(() => undefined)}
                          className="inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-ink"
                        >
                          <LuCopy className="h-3.5 w-3.5" /> {document.doi}
                        </button>
                      ) : null}
                      {onCiteHighlight && document.file_type === 'pdf' ? <PaperHighlights document={document} citing={citing} onCite={(highlight) => onCiteHighlight(document, highlight)} /> : null}
                    </div>
                  ) : null}
                  <div className="-ml-0.5 mt-1.5 flex flex-wrap gap-0.5">
                    <button
                      type="button"
                      disabled={citing}
                      onClick={() => cite(document)}
                      className="mr-1 inline-flex h-7 items-center gap-1 rounded-lg bg-[var(--theme-primary,var(--color-brand))] px-2.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
                    >
                      {onCite ? <><LuQuote className="h-3.5 w-3.5" />Cite</> : <><LuCopy className="h-3.5 w-3.5" />Copy</>}
                    </button>
                    <button type="button" onClick={() => ask(document)} className={smallButton}>
                      <LuMessageCircle className="h-3.5 w-3.5" />Ask
                    </button>
                    {document.file_type === 'pdf' ? (
                      <a href={`/library/${encodeURIComponent(document.id)}`} target="_blank" rel="noopener" className={smallButton}>
                        <LuBookOpen className="h-3.5 w-3.5" />Read
                      </a>
                    ) : null}
                    {url ? (
                      <button type="button" onClick={() => window.open(url, '_blank', 'noopener')} className={smallButton}>
                        <LuExternalLink className="h-3.5 w-3.5" />Open
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        {loading ? (
          <div className="space-y-3 pt-3">
            {[0, 1, 2].map((index) => <div key={index} className="h-[72px] animate-pulse rounded-[12px] bg-soft" />)}
          </div>
        ) : null}
      </div>
      )}
      <LibraryAddDialog open={adding !== null} initialTab={adding ?? 'pdfs'} folderId={folderId || null} onClose={() => setAdding(null)} />
    </div>
  );
}
