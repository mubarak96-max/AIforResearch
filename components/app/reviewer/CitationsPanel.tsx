'use client';

/** Citation check: every reference looked up, retractions and mismatches flagged, optional source check. */
import { useEffect, useState } from 'react';
import { LuExternalLink, LuLoaderCircle } from 'react-icons/lu';
import { api } from '@/lib/session';
import { Button, Card } from '@/components/app/ui';
import { CreditCost, creditsChanged, showError, Tag, type Source } from '@/components/app/research/parts';
import { DocumentInput, documentFields, type DocumentChoice } from './DocumentInput';

export type CitationCheck = {
  index: number; text: string; status: 'ok' | 'not_found' | 'retracted' | 'concern' | 'corrected' | 'mismatch' | 'preprint'; problems: string[];
  found: { title: string | null; authors: string[]; year: number | null; venue: string | null; doi: string | null; url: string | null; type: string | null } | null;
  notices: { type: string; doi: string; date: string | null }[];
  support?: { verdict: 'consistent' | 'not_consistent' | 'unclear'; sentence: string; note: string }[];
};
export type CitationsResult = { task_id?: string; checks: CitationCheck[]; counts: Record<string, number>; total: number; summary: string };

const STATUS: Record<CitationCheck['status'], { label: string; tone: 'positive' | 'neutral' | 'warning' | 'negative' }> = {
  ok: { label: 'Found', tone: 'positive' }, not_found: { label: 'Not found', tone: 'negative' }, retracted: { label: 'Retracted', tone: 'negative' },
  concern: { label: 'Expression of concern', tone: 'negative' }, corrected: { label: 'Corrected', tone: 'warning' }, mismatch: { label: 'Details differ', tone: 'warning' },
  preprint: { label: 'Preprint', tone: 'warning' },
};
const SUPPORT = { consistent: ['Matches the source', 'positive'], not_consistent: ['Does not match the source', 'negative'], unclear: ['Source does not say', 'neutral'] } as const;
const ORDER: CitationCheck['status'][] = ['retracted', 'concern', 'not_found', 'mismatch', 'corrected', 'preprint', 'ok'];

export function CitationResults({ checks, counts }: { checks: CitationCheck[]; counts: Record<string, number> }) {
  const sorted = [...checks].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || a.index - b.index);
  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-1.5">
        {ORDER.filter((status) => counts[status]).map((status) => <Tag key={status} tone={STATUS[status].tone}>{counts[status]} {STATUS[status].label.toLowerCase()}</Tag>)}
      </div>
      <ol className="mt-3 space-y-2.5">
        {sorted.map((check) => (
          <li key={check.index} className="rounded-xl border border-line px-4 py-3">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-[13px] font-semibold tabular-nums text-muted">{check.index + 1}.</span>
              <div className="min-w-0 flex-1">
                <p className="text-[14.5px] text-ink">{check.text}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Tag tone={STATUS[check.status].tone}>{STATUS[check.status].label}</Tag>
                  {check.found?.url && <a href={check.found.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand hover:underline">Open record<LuExternalLink className="h-3 w-3" aria-hidden="true" /></a>}
                </div>
                {check.problems.length > 0 && <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-[13.5px] text-ink-2">{check.problems.map((problem) => <li key={problem}>{problem}</li>)}</ul>}
                {check.support?.map((item, index) => (
                  <div key={index} className="mt-2 rounded-lg bg-soft px-3 py-2 text-[13.5px]">
                    <Tag tone={SUPPORT[item.verdict][1]}>{SUPPORT[item.verdict][0]}</Tag>
                    <p className="mt-1 italic text-ink-2">“{item.sentence}”</p>
                    {item.note && <p className="mt-1 text-ink-2">{item.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** A research result's sources as references to check. */
function fromSources(sources: Source[]) {
  return sources.filter((source) => source.kind === 'paper').map((source) => ({
    text: `${source.authors.slice(0, 3).join(', ')}${source.authors.length > 3 ? ' et al.' : ''} (${source.year ?? 'n.d.'}). ${source.title}. ${source.venue ?? ''}${source.doi ? ` https://doi.org/${source.doi}` : ''}`,
    doi: source.doi, title: source.title, year: source.year, authors: source.authors,
  }));
}

export function CitationsPanel({ onDone, fromSourcesList }: { onDone: (result: CitationsResult) => void; fromSourcesList?: Source[] | null }) {
  const [list, setList] = useState('');
  const [doc, setDoc] = useState<DocumentChoice>(null);
  const [support, setSupport] = useState(false);
  const [busy, setBusy] = useState(false);
  const preset = fromSourcesList?.length ? fromSources(fromSourcesList) : null;
  useEffect(() => { if (preset && !list) setList(preset.map((item) => item.text).join('\n')); }, [fromSourcesList]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = async () => {
    setBusy(true);
    try {
      const fields = documentFields(doc);
      const body = {
        ...(preset && list === preset.map((item) => item.text).join('\n') ? { references: preset } : { text: list }),
        ...('document_id' in fields ? { document_id: fields.document_id } : 'text' in fields ? { document_text: fields.text } : {}),
        title: doc?.title, check_support: support,
      };
      onDone(await api<CitationsResult>('/api/reviewer/citations', { method: 'POST', body: JSON.stringify(body) }));
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
      creditsChanged();
    }
  };

  return (
    <Card className="p-5">
      <p className="text-[14.5px] text-ink-2">Each reference is looked up by DOI at Crossref, or by title in OpenAlex. Retractions, corrections and expressions of concern come from Crossref, which includes Retraction Watch data. These checks are free.</p>
      <label htmlFor="ref-list" className="mt-4 block text-[13px] font-semibold text-ink-2">Reference list</label>
      <textarea id="ref-list" value={list} onChange={(event) => setList(event.target.value)} rows={8} placeholder={'One reference per line, or numbered:\n1. Diekelmann, S., & Born, J. (2010). The memory function of sleep. Nature Reviews Neuroscience, 11, 114–126.'}
        className="mt-1.5 w-full rounded-xl border border-line px-3.5 py-3 text-[14.5px] leading-relaxed focus:border-brand focus:outline-none" />
      <p className="mt-1 text-[13px] text-muted">Leave it empty to use the References section of the document below.</p>
      <div className="mt-4">
        <p className="mb-1.5 text-[13px] font-semibold text-ink-2">Document (optional: for the References section and the source check)</p>
        <DocumentInput value={doc} onChange={setDoc} pastePlaceholder="Paste the text that cites these references" />
      </div>
      <label className="mt-4 flex items-start gap-3 text-[14.5px] text-ink-2">
        <input type="checkbox" checked={support} onChange={(event) => setSupport(event.target.checked)} className="mt-1 h-4 w-4 accent-[var(--color-brand)]" />
        <span>Also check that the sentences citing each source say what its abstract says<span className="block text-[13px] text-muted">Uses AI; needs the document. Abstracts only: read the paper before you change a citation.</span></span>
      </label>
      <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
        <CreditCost credits={support ? 2 : 0} />
        <Button variant="primary" onClick={start} disabled={busy || (!list.trim() && !doc)}>{busy ? <><LuLoaderCircle className="h-4 w-4 animate-spin" />Checking…</> : 'Check citations'}</Button>
      </div>
    </Card>
  );
}
