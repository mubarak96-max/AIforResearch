'use client';

/**
 * Shared pieces of the research workspaces (Home, Deep Research, Find Papers, and the other
 * workspaces): the source picker, depth switch, filters, attachments, credit costs, cited
 * Markdown and source rows. Styled with the app's tokens (components/app/ui.tsx).
 */
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';
import {
  LuBookmarkPlus, LuCheck, LuChevronDown, LuExternalLink, LuFileText, LuFilter, LuLibrary, LuLock, LuPaperclip, LuUpload, LuX,
} from 'react-icons/lu';
import { api, ApiError } from '@/lib/session';
import { openPricing, refreshCredits, useCredits } from '@/lib/billing';
import { fileText } from './stream';

// ------------------------------------------------------------------ types shared with the API

export type SourceGroup = 'papers' | 'medical' | 'preprints' | 'web' | 'library';
export type Depth = 'summary' | 'deep' | 'detailed';
export type Filters = {
  from_year?: number | null; to_year?: number | null; study_types?: string[] | null; open_access?: boolean | null;
  min_citations?: number | null; journal_tier?: string | null; exclude_retracted?: boolean | null; exclude_preprints?: boolean | null;
};
export type Attachment = { name: string; text: string; words: number };
export type LibraryPick = { id: string; title: string };

export type Source = {
  n: number; marker: string; kind: 'paper' | 'web' | 'file' | 'library'; id: string; title: string; authors: string[]; more_authors: number;
  year: number | null; venue: string | null; doi: string | null; url: string | null; pdf_url: string | null; is_oa: boolean;
  cited_by_count: number | null; study_type: string | null; study_type_label: string | null; journal_tier: string | null;
  is_preprint: boolean; is_retracted: boolean; providers: string[]; abstract: string | null; tldr: string | null;
  stance?: 'supports' | 'mixed' | 'against' | 'unclear' | null; finding?: string | null;
};

/** A paper from POST /api/sources/search. */
export type FoundPaper = {
  id: string; title: string; authors: { name: string }[]; extra_author_count?: number; year: number | null; venue: string | null; doi: string | null;
  abstract: string | null; cited_by_count: number | null; is_oa: boolean; oa_url: string | null; pdf_url: string | null; type: string | null;
  providers: string[]; pmid: string | null; arxiv_id: string | null; url: string | null; study_type: string | null; is_preprint: boolean;
  is_retracted?: boolean; journal: { name: string | null; h_index: number | null; tier: string | null } | null; tldr: string | null;
};

export const STUDY_TYPE_LABELS: Record<string, string> = {
  'meta-analysis': 'Meta-analysis', 'systematic-review': 'Systematic review', rct: 'Randomized controlled trial', 'clinical-trial': 'Clinical trial',
  cohort: 'Cohort study', 'case-control': 'Case-control', 'cross-sectional': 'Cross-sectional', qualitative: 'Qualitative', 'case-report': 'Case report',
  review: 'Review', experiment: 'Experiment', other: 'Other',
};
export const TIER_LABELS: Record<string, string> = { top: 'Top journal', high: 'High-impact journal', medium: 'Established journal', low: 'Smaller journal' };
export const ROLE_OPTIONS: [string, string][] = [
  ['undergraduate', 'Undergraduate'], ['honours', 'Honours student'], ['masters', 'Master’s student'], ['phd', 'PhD candidate'],
  ['academic', 'Academic staff'], ['researcher', 'Researcher'], ['clinician', 'Clinician'], ['industry', 'Industry or policy'], ['other', 'Other'],
];
export const DEPTHS: { value: Depth; label: string; detail: string; credits: number; paid?: boolean }[] = [
  { value: 'summary', label: 'Summary', detail: 'A short cited answer from about 8 papers', credits: 1 },
  { value: 'deep', label: 'Deep', detail: 'A structured report from 20–40 papers', credits: 5 },
  { value: 'detailed', label: 'Detailed', detail: 'A long report with tables from 50+ papers', credits: 20, paid: true },
];

// ------------------------------------------------------------------ errors and credits

/** Shows an API error: plan limits open the pricing dialog with the reason, everything else is a toast. */
export function showError(error: unknown) {
  if (error instanceof ApiError && error.status === 402) {
    openPricing(error.message);
    return;
  }
  toast.error((error as Error)?.message || 'Something went wrong. Try again.');
}

/** "5 credits · 412 left", beside every start button. */
export function CreditCost({ credits, className = '' }: { credits: number; className?: string }) {
  const summary = useCredits();
  if (!credits) return <span className={`text-[13px] text-muted ${className}`}>No credits</span>;
  const left = summary?.left;
  const short = left !== null && left !== undefined && left < credits;
  return (
    <span className={`text-[13px] ${short ? 'text-red-700' : 'text-muted'} ${className}`}>
      {credits} credit{credits === 1 ? '' : 's'}
      {left !== null && left !== undefined ? ` · ${left.toLocaleString('en-US')} left` : ''}
    </span>
  );
}

/** Refreshes the credit meter after a job (call when a job ends, either way). */
export const creditsChanged = () => { refreshCredits().catch(() => {}); };

// ------------------------------------------------------------------ pickers

/** Pill toggles, several may be on. */
export function Chips<T extends string>({ options, value, onChange, label }: { options: { value: T; label: string; title?: string; disabled?: boolean }[]; value: T[]; onChange: (value: T[]) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const on = value.includes(option.value);
        return (
          <button key={option.value} type="button" aria-pressed={on} disabled={option.disabled} title={option.title}
            onClick={() => onChange(on ? (value.length > 1 ? value.filter((item) => item !== option.value) : value) : [...value, option.value])}
            className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13.5px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${on ? 'border-brand bg-brand-50 text-brand' : 'border-line bg-surface text-ink-2 hover:bg-soft'}`}>
            {on && <LuCheck className="h-3.5 w-3.5" aria-hidden="true" />}{option.label}
          </button>
        );
      })}
    </div>
  );
}

type GroupInfo = { id: SourceGroup; label: string; detail: string; available: boolean };
let groupsRequest: Promise<GroupInfo[]> | null = null;
export function useSourceGroups() {
  const [groups, setGroups] = useState<GroupInfo[] | null>(null);
  useEffect(() => {
    groupsRequest ??= api<{ groups: GroupInfo[] }>('/api/sources/groups').then((result) => result.groups);
    groupsRequest.then(setGroups).catch(() => { groupsRequest = null; });
  }, []);
  return groups;
}

export function SourcePicker({ value, onChange }: { value: SourceGroup[]; onChange: (value: SourceGroup[]) => void }) {
  const groups = useSourceGroups();
  const options = (groups ?? [
    { id: 'papers', label: 'All papers', detail: '', available: true }, { id: 'medical', label: 'Medical', detail: '', available: true },
    { id: 'preprints', label: 'Preprints', detail: '', available: true }, { id: 'web', label: 'Web', detail: '', available: true },
    { id: 'library', label: 'My Library', detail: '', available: true },
  ] as GroupInfo[]).map((group) => ({ value: group.id, label: group.label, title: group.available ? group.detail : `${group.label} is not set up on this server yet`, disabled: !group.available }));
  return <Chips label="Sources" options={options} value={value} onChange={onChange} />;
}

/** Summary / Deep / Detailed, each with its credits; Detailed shows a lock on plans without it. */
export function DepthSwitch({ value, onChange, detailedAllowed }: { value: Depth; onChange: (value: Depth) => void; detailedAllowed: boolean }) {
  return (
    <div role="radiogroup" aria-label="Depth" className="inline-flex max-w-full overflow-x-auto rounded-xl bg-line-2 p-1">
      {DEPTHS.map((depth) => {
        const locked = depth.paid && !detailedAllowed;
        const on = value === depth.value;
        return (
          <button key={depth.value} type="button" role="radio" aria-checked={on} title={`${depth.detail} · ${depth.credits} credit${depth.credits === 1 ? '' : 's'}${locked ? ' · paid plans' : ''}`}
            onClick={() => (locked ? openPricing('Detailed reports read 50+ papers and are part of the paid plans.') : onChange(depth.value))}
            className={`flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[9px] px-3.5 text-[14px] font-semibold transition-colors ${on ? 'bg-surface text-ink shadow-[0_1px_3px_rgba(15,23,42,.12)]' : 'text-muted hover:text-ink-2'}`}>
            {locked && <LuLock className="h-3.5 w-3.5" aria-hidden="true" />}{depth.label}
          </button>
        );
      })}
    </div>
  );
}

export function RoleSelect({ value, onChange, className = '' }: { value: string; onChange: (value: string) => void; className?: string }) {
  return (
    <select aria-label="Your role" value={value} onChange={(event) => onChange(event.target.value)}
      className={`h-8 rounded-full border border-line bg-surface px-3 text-[13.5px] font-medium text-ink-2 ${className}`}>
      <option value="">Role: not set</option>
      {ROLE_OPTIONS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
    </select>
  );
}

// ------------------------------------------------------------------ filters

const YEAR = new Date().getFullYear();

export function filterCount(filters: Filters) {
  return [filters.from_year, filters.to_year, filters.study_types?.length, filters.open_access, filters.min_citations, filters.journal_tier, filters.exclude_preprints, filters.exclude_retracted === false].filter(Boolean).length;
}

export function FiltersPanel({ value, onChange }: { value: Filters; onChange: (value: Filters) => void }) {
  const set = (patch: Filters) => onChange({ ...value, ...patch });
  const input = 'h-9 w-full rounded-[10px] border border-line bg-surface px-3 text-[14px]';
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <fieldset>
        <legend className="mb-1.5 text-[13px] font-semibold text-ink-2">Published</legend>
        <div className="flex items-center gap-2">
          <input aria-label="From year" type="number" min={1800} max={YEAR} placeholder="From" value={value.from_year ?? ''} onChange={(event) => set({ from_year: event.target.value ? Number(event.target.value) : null })} className={input} />
          <span className="text-muted">to</span>
          <input aria-label="To year" type="number" min={1800} max={YEAR} placeholder="To" value={value.to_year ?? ''} onChange={(event) => set({ to_year: event.target.value ? Number(event.target.value) : null })} className={input} />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[5, 10].map((years) => (
            <button key={years} type="button" onClick={() => set({ from_year: YEAR - years, to_year: null })} className="h-7 rounded-full bg-line-2 px-2.5 text-[12.5px] font-medium text-ink-2 hover:bg-line">Last {years} years</button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-1.5 text-[13px] font-semibold text-ink-2">Journal and citations</legend>
        <select aria-label="Journal quality" value={value.journal_tier ?? ''} onChange={(event) => set({ journal_tier: event.target.value || null })} className={input}>
          <option value="">Any journal</option>
          <option value="top">Top journals only</option>
          <option value="high">High-impact and above</option>
          <option value="medium">Established and above</option>
        </select>
        <input aria-label="At least this many citations" type="number" min={0} placeholder="At least … citations" value={value.min_citations ?? ''} onChange={(event) => set({ min_citations: event.target.value ? Number(event.target.value) : null })} className={`${input} mt-2`} />
      </fieldset>
      <fieldset className="sm:col-span-2">
        <legend className="mb-1.5 text-[13px] font-semibold text-ink-2">Study type and method</legend>
        <Chips label="Study type" value={(value.study_types ?? []) as string[]}
          onChange={(types) => set({ study_types: types })}
          options={Object.entries(STUDY_TYPE_LABELS).filter(([id]) => id !== 'other').map(([id, label]) => ({ value: id, label }))} />
        {(value.study_types?.length ?? 0) > 0 && <button type="button" onClick={() => set({ study_types: null })} className="mt-2 text-[13px] font-semibold text-brand hover:underline">Any study type</button>}
      </fieldset>
      <div className="flex flex-wrap gap-x-5 gap-y-2 sm:col-span-2">
        {([
          ['open_access', 'Open access only', Boolean(value.open_access)],
          ['exclude_preprints', 'Peer-reviewed only (no preprints)', Boolean(value.exclude_preprints)],
          ['exclude_retracted', 'Leave out retracted papers', value.exclude_retracted !== false],
        ] as const).map(([key, label, checked]) => (
          <label key={key} className="flex items-center gap-2 text-[14px] text-ink-2">
            <input type="checkbox" checked={checked} onChange={(event) => set({ [key]: event.target.checked } as Filters)} className="h-4 w-4 accent-[var(--color-brand)]" />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
}

/** A "Filters (2)" button that opens the panel below it. */
export function FiltersToggle({ value, onChange }: { value: Filters; onChange: (value: Filters) => void }) {
  const [open, setOpen] = useState(false);
  const count = filterCount(value);
  return (
    <>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13.5px] font-medium ${count ? 'border-brand bg-brand-50 text-brand' : 'border-line bg-surface text-ink-2 hover:bg-soft'}`}>
        <LuFilter className="h-3.5 w-3.5" aria-hidden="true" />Filters{count ? ` (${count})` : ''}<LuChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && <div className="basis-full rounded-xl bg-soft p-4"><FiltersPanel value={value} onChange={onChange} /></div>}
    </>
  );
}

// ------------------------------------------------------------------ attachments

const ACCEPT = '.pdf,.doc,.docx,.odt,.rtf,.md,.markdown,.txt';

/** Attach files (read to text), pick from the Library, or go to Zotero / Mendeley import. */
export function AttachMenu({ files, onFiles, library, onLibrary, max = 5 }: { files: Attachment[]; onFiles: (files: Attachment[]) => void; library: LibraryPick[]; onLibrary: (picks: LibraryPick[]) => void; max?: number }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const add = async (list: FileList | null) => {
    if (!list?.length) return;
    setOpen(false);
    setBusy(true);
    const next = [...files];
    for (const file of Array.from(list).slice(0, Math.max(0, max - files.length))) {
      try {
        const read = await fileText(file);
        next.push({ name: read.name, text: read.text, words: read.words });
        if (read.truncated) toast(`${read.name} is long; the first 30,000 words are used.`);
      } catch (error) {
        showError(error);
      }
    }
    onFiles(next);
    setBusy(false);
  };
  return (
    <div className="relative">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} disabled={busy} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-[13.5px] font-medium text-ink-2 hover:bg-soft disabled:opacity-60">
        <LuPaperclip className="h-3.5 w-3.5" aria-hidden="true" />{busy ? 'Reading…' : 'Attach'}
      </button>
      <input ref={input} type="file" multiple accept={ACCEPT} className="hidden" onChange={(event) => { add(event.target.files); event.target.value = ''; }} />
      {open && (
        <div role="menu" className="absolute left-0 top-10 z-30 w-64 rounded-xl border border-line bg-surface p-1.5 shadow-float">
          <button role="menuitem" type="button" onClick={() => input.current?.click()} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[14px] hover:bg-soft">
            <LuUpload className="h-4 w-4 text-muted" aria-hidden="true" /><span>Upload a file<span className="block text-[12.5px] text-muted">PDF, Word, Markdown or text</span></span>
          </button>
          <button role="menuitem" type="button" onClick={() => { setPicker(true); setOpen(false); }} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[14px] hover:bg-soft">
            <LuLibrary className="h-4 w-4 text-muted" aria-hidden="true" />Add from my Library
          </button>
          <Link role="menuitem" href="/editor?tool=library&import=zotero" className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[14px] hover:bg-soft">
            <LuBookmarkPlus className="h-4 w-4 text-muted" aria-hidden="true" />Import from Zotero or Mendeley
          </Link>
        </div>
      )}
      {picker && <LibraryPicker selected={library} onClose={() => setPicker(false)} onDone={(picks) => { onLibrary(picks); setPicker(false); }} />}
    </div>
  );
}

/** The chosen files and Library papers, each removable. */
export function AttachmentList({ files, onFiles, library, onLibrary }: { files: Attachment[]; onFiles: (files: Attachment[]) => void; library: LibraryPick[]; onLibrary: (picks: LibraryPick[]) => void }) {
  if (!files.length && !library.length) return null;
  const chip = 'inline-flex h-8 max-w-[260px] items-center gap-1.5 rounded-lg bg-line-2 pl-2.5 pr-1 text-[13px] text-ink-2';
  return (
    <div className="flex flex-wrap gap-1.5">
      {files.map((file, index) => (
        <span key={`f${index}`} className={chip} title={`${file.words.toLocaleString('en-US')} words`}>
          <LuFileText className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" /><span className="truncate">{file.name}</span>
          <button type="button" aria-label={`Remove ${file.name}`} onClick={() => onFiles(files.filter((_, at) => at !== index))} className="grid h-6 w-6 place-items-center rounded-md hover:bg-line"><LuX className="h-3.5 w-3.5" /></button>
        </span>
      ))}
      {library.map((pick) => (
        <span key={pick.id} className={chip}>
          <LuLibrary className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" /><span className="truncate">{pick.title}</span>
          <button type="button" aria-label={`Remove ${pick.title}`} onClick={() => onLibrary(library.filter((item) => item.id !== pick.id))} className="grid h-6 w-6 place-items-center rounded-md hover:bg-line"><LuX className="h-3.5 w-3.5" /></button>
        </span>
      ))}
    </div>
  );
}

type LibraryRow = { id: string; title: string | null; filename: string; publication_date?: string | null; file_type?: string };

/** A dialog listing the Library, with search, for picking papers to use. */
export function LibraryPicker({ selected, onClose, onDone }: { selected: LibraryPick[]; onClose: () => void; onDone: (picks: LibraryPick[]) => void }) {
  const [docs, setDocs] = useState<LibraryRow[] | null>(null);
  const [query, setQuery] = useState('');
  const [picks, setPicks] = useState<LibraryPick[]>(selected);
  useEffect(() => {
    api<{ documents: LibraryRow[] }>('/api/library/documents?page_size=200').then((result) => setDocs(result.documents)).catch((error) => { setDocs([]); showError(error); });
  }, []);
  const shown = useMemo(() => (docs ?? []).filter((doc) => `${doc.title || ''} ${doc.filename}`.toLowerCase().includes(query.toLowerCase())).slice(0, 200), [docs, query]);
  return (
    <div role="dialog" aria-modal="true" aria-label="Add from my Library" className="fixed inset-0 z-[80] grid place-items-center bg-ink/30 p-4" onClick={onClose}>
      <div className="flex max-h-[80dvh] w-full max-w-lg flex-col rounded-2xl bg-surface shadow-float" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-line-2 px-5 py-4">
          <h2 className="flex-1 text-[17px] font-bold">Add from my Library</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-soft"><LuX className="h-4 w-4" /></button>
        </div>
        <div className="px-5 pt-3"><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your Library" className="h-10 w-full rounded-[10px] border border-line px-3 text-[14px]" /></div>
        <ul className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
          {docs === null && <li className="px-2 py-6 text-center text-[14px] text-muted">Loading…</li>}
          {docs?.length === 0 && <li className="px-2 py-6 text-center text-[14px] text-muted">Your Library is empty. Upload PDFs or save papers from search.</li>}
          {shown.map((doc) => {
            const on = picks.some((pick) => pick.id === doc.id);
            const title = doc.title || doc.filename;
            return (
              <li key={doc.id}>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-soft">
                  <input type="checkbox" checked={on} onChange={() => setPicks(on ? picks.filter((pick) => pick.id !== doc.id) : [...picks, { id: doc.id, title }])} className="mt-1 h-4 w-4 accent-[var(--color-brand)]" />
                  <span className="min-w-0 text-[14px]"><span className="line-clamp-2 font-medium text-ink">{title}</span>{doc.publication_date && <span className="text-[12.5px] text-muted">{String(doc.publication_date).slice(0, 4)}</span>}</span>
                </label>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center justify-end gap-2 border-t border-line-2 px-5 py-3">
          <span className="mr-auto text-[13px] text-muted">{picks.length} selected</span>
          <button type="button" onClick={onClose} className="h-9 rounded-[10px] px-3 text-[14px] font-semibold text-ink-2 hover:bg-soft">Cancel</button>
          <button type="button" onClick={() => onDone(picks)} className="h-9 rounded-[10px] bg-brand px-4 text-[14px] font-semibold text-on-brand">Use {picks.length || ''}</button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ answers and sources

/** Markdown with [S1]-style markers shown as numbered citation chips that jump to the source. */
export function CitedMarkdown({ markdown, sources, onCite, className = '' }: { markdown: string; sources?: { n: number; title: string }[]; onCite?: (n: number) => void; className?: string }) {
  const titles = useMemo(() => new Map((sources ?? []).map((source) => [source.n, source.title])), [sources]);
  const linked = useMemo(() => markdown.replace(/\[(S\d+(?:\s*[,;]\s*S?\d+)*)\]/g, (_, group: string) =>
    [...group.matchAll(/S?(\d+)/g)].map((match) => `[${match[1]}](#cite-${match[1]})`).join('')), [markdown]);
  return (
    <div className={`wo-prose text-[16px] leading-[1.7] text-ink [&_h2]:mt-7 [&_h2]:text-[20px] [&_h2]:font-bold [&_h3]:mt-5 [&_h3]:text-[17px] [&_h3]:font-semibold [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-3 [&_table]:my-4 [&_table]:w-full [&_table]:text-[14px] [&_td]:border-t [&_td]:border-line-2 [&_td]:px-2 [&_td]:py-1.5 [&_td]:align-top [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
        table: ({ children }) => <div className="overflow-x-auto"><table>{children}</table></div>,
        a: ({ href, children }) => {
          const n = Number(href?.match(/^#cite-(\d+)$/)?.[1]);
          if (n) {
            return (
              <button type="button" onClick={() => onCite?.(n)} title={titles.get(n) || `Source ${n}`}
                className="mx-[1px] inline-grid h-[18px] min-w-[18px] -translate-y-[2px] place-items-center rounded-[5px] bg-accent-50 px-1 align-middle text-[11.5px] font-bold text-accent-600 hover:bg-accent-100">
                {n}
              </button>
            );
          }
          return <a href={href} target="_blank" rel="noreferrer" className="font-medium text-brand underline">{children}</a>;
        },
      }}>{linked}</ReactMarkdown>
    </div>
  );
}

const STANCE = {
  supports: { label: 'Supports', className: 'bg-green-100 text-green-800' },
  mixed: { label: 'Mixed', className: 'bg-amber-50 text-amber-800' },
  against: { label: 'Does not support', className: 'bg-red-50 text-red-700' },
  unclear: { label: 'Not tested', className: 'bg-line-2 text-ink-2' },
};

export function Tag({ children, tone = 'neutral', title }: { children: React.ReactNode; tone?: 'neutral' | 'positive' | 'warning' | 'negative' | 'brand'; title?: string }) {
  const style = { neutral: 'bg-line-2 text-ink-2', positive: 'bg-green-100 text-green-800', warning: 'bg-amber-50 text-amber-800', negative: 'bg-red-50 text-red-700', brand: 'bg-brand-50 text-brand-600' }[tone];
  return <span title={title} className={`inline-flex h-[22px] shrink-0 items-center rounded-md px-2 text-[11.5px] font-semibold ${style}`}>{children}</span>;
}

/** Saves a paper to the Library (POST /api/library/papers/import). */
export async function saveToLibrary(paper: { title: string; authors: string[]; doi: string | null; year: number | null; abstract: string | null; pdf_url: string | null; url: string | null; id?: string }) {
  const result = await api<{ message?: string }>('/api/library/papers/import', {
    method: 'POST',
    body: JSON.stringify({
      title: paper.title, authors: paper.authors, doi: paper.doi ?? undefined, year: paper.year ?? undefined, abstract: paper.abstract?.slice(0, 20000) ?? undefined,
      pdf_url: paper.pdf_url ?? undefined, url: paper.url ?? undefined, source: 'research', scholar_id: /^W\d+$/.test(paper.id || '') ? paper.id : undefined,
    }),
  });
  toast.success(result.message || 'Saved to your Library');
}

/** One numbered source: what it is, how strong, how it bears on the question, and links. */
export function SourceRow({ source, highlighted = false, extra }: { source: Source; highlighted?: boolean; extra?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const authors = source.authors.length > 3 ? `${source.authors.slice(0, 3).join(', ')} et al.` : source.authors.join(', ');
  return (
    <li id={`source-${source.n}`} className={`scroll-mt-24 rounded-xl px-3 py-3 transition-colors ${highlighted ? 'bg-accent-50' : 'hover:bg-soft'}`}>
      <div className="flex gap-3">
        <span className="mt-0.5 grid h-6 min-w-6 place-items-center rounded-md bg-accent-50 px-1 text-[12px] font-bold text-accent-600">{source.n}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold leading-snug text-ink">{source.url ? <a href={source.url} target="_blank" rel="noreferrer" className="hover:underline">{source.title}</a> : source.title}</p>
          <p className="mt-0.5 text-[13px] text-muted">{[authors, source.year, source.venue].filter(Boolean).join(' · ')}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {source.stance && <span className={`inline-flex h-[22px] items-center rounded-md px-2 text-[11.5px] font-semibold ${STANCE[source.stance].className}`}>{STANCE[source.stance].label}</span>}
            {source.study_type_label && <Tag>{source.study_type_label}</Tag>}
            {source.journal_tier && <Tag tone="brand" title="From the journal's h-index in OpenAlex">{TIER_LABELS[source.journal_tier]}</Tag>}
            {source.cited_by_count ? <Tag>{source.cited_by_count.toLocaleString('en-US')} citations</Tag> : null}
            {source.is_preprint && <Tag tone="warning" title="Not peer reviewed">Preprint</Tag>}
            {source.is_retracted && <Tag tone="negative">Retracted</Tag>}
            {source.is_oa && source.kind === 'paper' && <Tag tone="positive">Open access</Tag>}
          </div>
          {source.finding && <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{source.finding}</p>}
          {open && source.abstract && <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{source.abstract}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] font-semibold">
            {source.abstract && <button type="button" onClick={() => setOpen(!open)} className="text-brand hover:underline">{open ? 'Hide' : source.kind === 'file' ? 'Show excerpt' : 'Abstract'}</button>}
            {source.pdf_url && <a href={source.pdf_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand hover:underline">PDF<LuExternalLink className="h-3 w-3" aria-hidden="true" /></a>}
            {(source.kind === 'paper') && (
              <button type="button" onClick={() => saveToLibrary(source).catch(showError)} className="text-brand hover:underline">Save to Library</button>
            )}
            {extra}
          </div>
        </div>
      </div>
    </li>
  );
}

/** The bar and line under an answer: "14 of 18 studies that test the question support it". */
export function ConsensusBar({ consensus }: { consensus: { applicable: boolean; line: string | null; counts: Record<string, number> } | null | undefined }) {
  if (!consensus?.applicable || !consensus.line) return null;
  const { supports = 0, mixed = 0, against = 0 } = consensus.counts;
  const total = supports + mixed + against || 1;
  return (
    <div className="rounded-xl bg-soft px-4 py-3">
      <p className="text-[15px] font-semibold text-ink">{consensus.line}</p>
      <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-line-2" aria-hidden="true">
        <span className="bg-green-600" style={{ width: `${(supports / total) * 100}%` }} />
        <span className="bg-amber-400" style={{ width: `${(mixed / total) * 100}%` }} />
        <span className="bg-red-500" style={{ width: `${(against / total) * 100}%` }} />
      </div>
      <p className="mt-1.5 text-[12.5px] text-muted">Counted from how each cited study bears on the question. Check the studies before you rely on it.</p>
    </div>
  );
}

/** The plan's features from the pricing data, for locks. */
export function usePlanFeatures() {
  const credits = useCredits();
  return { isFree: !credits || credits.plan.is_default, planId: credits?.plan.id ?? 'free' };
}
