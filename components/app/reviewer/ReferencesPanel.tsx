'use client';

/**
 * Reference list formatter: paste or upload a list; it is parsed, duplicates are merged and each
 * reference is verified at Crossref or OpenAlex (free). Verified references are formatted here in
 * the chosen CSL style (citation-js); the rest are kept as typed and marked "Could not verify".
 * RIS and BibTeX come from the server. The optional AI cleanup costs CREDIT_COSTS.ai_edit.
 */
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import DOMPurify from 'isomorphic-dompurify';
import { Cite } from '@citation-js/core';
import '@citation-js/plugin-csl';
import { LuCopy, LuDownload, LuExternalLink, LuLoaderCircle, LuUpload } from 'react-icons/lu';
import { api } from '@/lib/session';
import { Button, Card, inputClass } from '@/components/app/ui';
import { CreditCost, creditsChanged, showError, Tag } from '@/components/app/research/parts';
import { fileText } from '@/components/app/research/stream';
import { download } from '@/components/app/analysis/stats';
import { COMMON_STYLES, isNumericStyle, loadCslStyle, normalizeStyleId } from '@/components/editor/lib/citations/cslStyles';

type Csl = { id: string; type: string; title: string; [key: string]: unknown };
export type FormattedReference = { index: number; text: string; status: 'verified' | 'cleaned' | 'unverified'; duplicates: string[]; csl: Csl | null; problems: string[]; url: string | null };
export type ReferencesResult = {
  task_id?: string; references: FormattedReference[]; counts: { verified: number; cleaned: number; unverified: number }; total: number;
  duplicates_removed: number; ris: string; bibtex: string; summary: string; ai_cleanup: boolean;
};

const STATUS = { verified: { label: 'Verified', tone: 'positive' }, cleaned: { label: 'Cleaned by AI, not verified', tone: 'warning' }, unverified: { label: 'Could not verify', tone: 'negative' } } as const;
const STYLE_OPTIONS = COMMON_STYLES.filter((style) => style.category !== 'note');

export function ReferencesPanel({ onDone }: { onDone: (result: ReferencesResult) => void }) {
  const [list, setList] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [cleanup, setCleanup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setReading(true);
    try {
      const read = await fileText(file);
      setList(read.text);
      setFileName(read.name);
    } catch (error) {
      showError(error);
    } finally {
      setReading(false);
    }
  };

  const start = async () => {
    setBusy(true);
    try {
      onDone(await api<ReferencesResult>('/api/reviewer/references', { method: 'POST', body: JSON.stringify({ text: list, ai_cleanup: cleanup, title: fileName?.replace(/\.[a-z0-9]+$/i, '') || undefined }) }));
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
      if (cleanup) creditsChanged();
    }
  };

  return (
    <Card className="p-5">
      <p className="text-[14.5px] text-ink-2">Paste a reference list in any style. Duplicates are merged, each reference is looked up by DOI at Crossref or by title in OpenAlex, and the list is rewritten in the style you choose. References that cannot be verified are kept exactly as you typed them. This is free.</p>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-2">
        <label htmlFor="ref-format-list" className="block text-[13px] font-semibold text-ink-2">Reference list</label>
        <input ref={input} type="file" accept=".pdf,.doc,.docx,.odt,.rtf,.md,.markdown,.txt,.bib,.ris" className="hidden" onChange={(event) => { upload(event.target.files?.[0]); event.target.value = ''; }} />
        <Button size="sm" onClick={() => input.current?.click()} disabled={reading}>{reading ? <LuLoaderCircle className="h-4 w-4 animate-spin" /> : <LuUpload className="h-4 w-4" />}{fileName ?? 'Upload a file'}</Button>
      </div>
      <textarea id="ref-format-list" value={list} onChange={(event) => setList(event.target.value)} rows={10} placeholder={'One reference per line, or numbered:\n1. Diekelmann S, Born J. The memory function of sleep. Nat Rev Neurosci. 2010;11:114-26.'}
        className="mt-1.5 w-full rounded-xl border border-line px-3.5 py-3 text-[14.5px] leading-relaxed focus:border-brand focus:outline-none" />
      <p className="mt-1 text-[13px] text-muted">A whole paper works too: its References section is used. Up to 200 references.</p>
      <label className="mt-4 flex items-start gap-3 text-[14.5px] text-ink-2">
        <input type="checkbox" checked={cleanup} onChange={(event) => setCleanup(event.target.checked)} className="mt-1 h-4 w-4 accent-[var(--color-brand)]" />
        <span>AI cleanup for references that cannot be read<span className="block text-[13px] text-muted">AI reads the authors, title, year and source out of those entries, and they are looked up again. Charged only if some references could not be verified.</span></span>
      </label>
      <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
        <CreditCost credits={cleanup ? 1 : 0} />
        <Button variant="primary" onClick={start} disabled={busy || reading || !list.trim()}>{busy ? <><LuLoaderCircle className="h-4 w-4 animate-spin" />Checking references…</> : 'Format references'}</Button>
      </div>
    </Card>
  );
}

type Entry = { index: number; html: string | null; text: string; ref: FormattedReference };

async function formatAll(references: FormattedReference[], styleId: string): Promise<Entry[]> {
  const id = normalizeStyleId(styleId);
  const loaded = await loadCslStyle(id);
  const template = loaded?.startsWith('bundled:') ? loaded.slice('bundled:'.length) : id;
  const entries = references.map((ref) => {
    if (!ref.csl || !loaded) return { index: ref.index, html: null, text: ref.text, ref };
    try {
      const html = String(new Cite(ref.csl).format('bibliography', { format: 'html', template, lang: 'en-US' }) || '');
      const clean = DOMPurify.sanitize(html, { ALLOWED_TAGS: ['i', 'em', 'b', 'strong', 'span', 'sup', 'sub', 'div', 'a'], ALLOWED_ATTR: ['href', 'class', 'style'] });
      const div = document.createElement('div');
      div.innerHTML = clean;
      // Numeric styles number each entry "[1]" on its own; the list numbers them instead.
      const text = (div.textContent || '').replace(/\s+/g, ' ').trim().replace(/^(\[\d+\]|\d+\.)\s*/, '');
      return { index: ref.index, html: clean.replace(/<div class="csl-left-margin">[^<]*<\/div>/g, ''), text, ref };
    } catch {
      return { index: ref.index, html: null, text: ref.text, ref };
    }
  });
  return isNumericStyle(id) ? entries : [...entries].sort((a, b) => a.text.localeCompare(b.text, 'en', { sensitivity: 'base' }));
}

export function ReferenceResults({ result }: { result: ReferencesResult }) {
  const [style, setStyle] = useState('apa');
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const numeric = isNumericStyle(style);

  useEffect(() => {
    let live = true;
    setEntries(null);
    formatAll(result.references, style).then((next) => { if (live) setEntries(next); }).catch(showError);
    return () => { live = false; };
  }, [result, style]);

  const plain = () => (entries ?? []).map((entry, i) => `${numeric ? `${i + 1}. ` : ''}${entry.text}`).join('\n');
  const name = result.task_id ? `references-${result.task_id.slice(0, 6)}` : 'references';
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <p className="text-[15.5px] leading-relaxed text-ink">{result.summary}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(Object.keys(STATUS) as (keyof typeof STATUS)[]).filter((status) => result.counts[status]).map((status) => <Tag key={status} tone={STATUS[status].tone}>{result.counts[status]} {STATUS[status].label.toLowerCase()}</Tag>)}
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <label className="block text-[13px] font-semibold text-ink-2">Citation style
            <select className={`${inputClass} mt-1 w-64`} value={style} onChange={(event) => setStyle(event.target.value)}>
              {STYLE_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.title}</option>)}
            </select>
          </label>
          <Button size="sm" onClick={() => navigator.clipboard.writeText(plain()).then(() => toast.success('Copied'))} disabled={!entries}><LuCopy className="h-4 w-4" />Copy list</Button>
          <Button size="sm" onClick={() => download(`${name}.ris`, result.ris, 'application/x-research-info-systems')}><LuDownload className="h-4 w-4" />RIS</Button>
          <Button size="sm" onClick={() => download(`${name}.bib`, result.bibtex, 'application/x-bibtex')}><LuDownload className="h-4 w-4" />BibTeX</Button>
        </div>
        <p className="mt-3 text-[13px] text-muted">References marked “Could not verify” are kept as you typed them, in every style and in the RIS and BibTeX files (with a note). Check them by hand.</p>
      </Card>
      {!entries && <p className="flex items-center gap-2 text-[14.5px] text-muted"><LuLoaderCircle className="h-4 w-4 animate-spin" />Formatting…</p>}
      {entries && (
        <ol className="space-y-2.5">
          {entries.map((entry, i) => (
            <li key={entry.index} className="rounded-xl border border-line px-4 py-3">
              <div className="flex items-start gap-3">
                {numeric && <span className="mt-0.5 text-[13px] font-semibold tabular-nums text-muted">{i + 1}.</span>}
                <div className="min-w-0 flex-1">
                  {entry.html ? <div className="text-[14.5px] text-ink [&_i]:italic" dangerouslySetInnerHTML={{ __html: entry.html }} /> : <p className="text-[14.5px] text-ink">{entry.text}</p>}
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Tag tone={STATUS[entry.ref.status].tone}>{STATUS[entry.ref.status].label}</Tag>
                    {entry.ref.duplicates.length > 0 && <Tag>{entry.ref.duplicates.length} duplicate{entry.ref.duplicates.length === 1 ? '' : 's'} merged</Tag>}
                    {entry.ref.url && <a href={entry.ref.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand hover:underline">Open record<LuExternalLink className="h-3 w-3" aria-hidden="true" /></a>}
                  </div>
                  {entry.ref.problems.length > 0 && <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-[13.5px] text-ink-2">{entry.ref.problems.map((problem) => <li key={problem}>{problem}</li>)}</ul>}
                  {entry.ref.status !== 'unverified' && <p className="mt-1 text-[12.5px] text-muted">You typed: {entry.ref.text}</p>}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
