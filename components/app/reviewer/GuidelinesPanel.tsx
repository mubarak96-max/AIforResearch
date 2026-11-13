'use client';

/** Reporting-guideline check: choose CONSORT, STROBE, PRISMA … (or the add-ons SAGER and SAMPL) and see each item reported, partly, missing or to check. */
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { LuCopy, LuDownload, LuExternalLink, LuFilePen, LuLoaderCircle, LuSparkles } from 'react-icons/lu';
import { api } from '@/lib/session';
import { Button, Card } from '@/components/app/ui';
import { openInEditor } from '@/components/tools/editorHandoff';
import { markdownToHtml } from '@/components/tools/toolOutput';
import { CreditCost, creditsChanged, showError, Tag } from '@/components/app/research/parts';
import { download, toCsv } from '@/components/app/analysis/stats';
import { GUIDELINES, guideline as findGuideline, suggestGuideline, type Guideline } from '@/lib/reportingGuidelines';
import { DocumentInput, documentFields, type DocumentChoice } from './DocumentInput';

type Status = 'reported' | 'partial' | 'missing' | 'not_applicable' | 'check';
export type GuidelineResult = {
  task_id?: string; guideline: Guideline['id']; name: string; version: string; url: string; citation: string; title: string;
  findings: { id: string; section: string; topic: string; text: string; status: Status; where: string | null; quote: string | null; note: string; fix: string | null }[];
  counts: Record<Status, number>; words_checked: number; words_total: number; truncated: boolean; summary: string; markdown: string;
};

const STATUS: Record<Status, { label: string; tone: 'positive' | 'warning' | 'negative' | 'neutral' | 'brand' }> = {
  reported: { label: 'Reported', tone: 'positive' }, partial: { label: 'Partly reported', tone: 'warning' }, missing: { label: 'Missing', tone: 'negative' },
  not_applicable: { label: 'Not applicable', tone: 'neutral' }, check: { label: 'Check by hand', tone: 'brand' },
};

export function GuidelinesPanel({ onDone }: { onDone: (result: GuidelineResult) => void }) {
  const [chosen, setChosen] = useState<Guideline['id']>('strobe');
  const [doc, setDoc] = useState<DocumentChoice>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const suggested = useMemo(() => (doc?.kind === 'text' ? suggestGuideline(doc.text) : null), [doc]);

  useEffect(() => { if (suggested) setChosen(suggested); }, [suggested]);
  useEffect(() => {
    api<{ credits: number }>('/api/reviewer/guidelines/quote', { method: 'POST', body: JSON.stringify({ words: doc?.words ?? 0 }) }).then((quote) => setCredits(quote.credits)).catch(() => setCredits(null));
  }, [doc?.words]);

  const start = async () => {
    if (!doc) return;
    setBusy(true);
    try {
      onDone(await api<GuidelineResult>('/api/reviewer/guidelines', { method: 'POST', body: JSON.stringify({ guideline: chosen, ...documentFields(doc) }) }));
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
      creditsChanged();
    }
  };

  const current = findGuideline(chosen)!;
  return (
    <Card className="p-5">
      <p className="mb-1.5 text-[13px] font-semibold text-ink-2">Guideline</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {GUIDELINES.map((item) => (
          <button key={item.id} type="button" aria-pressed={chosen === item.id} onClick={() => setChosen(item.id)}
            className={`rounded-xl border px-3.5 py-2.5 text-left ${chosen === item.id ? 'border-brand bg-brand-50' : 'border-line hover:bg-soft'}`}>
            <span className="flex items-center gap-1.5 text-[15px] font-semibold text-ink">{item.name} <span className="text-[12px] font-normal text-muted">{item.version}</span>{suggested === item.id && <Tag tone="brand">Suggested</Tag>}{item.complements && <Tag tone="neutral">Add-on</Tag>}</span>
            <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">{item.for}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-[13px] text-muted">{current.items.length} items. {current.note ?? ''} <a href={current.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-semibold text-brand hover:underline">Official checklist<LuExternalLink className="h-3 w-3" /></a></p>
      <div className="mt-5">
        <p className="mb-1.5 text-[13px] font-semibold text-ink-2">Manuscript</p>
        <DocumentInput value={doc} onChange={setDoc} pastePlaceholder="Paste the whole manuscript, from the title to the funding statement" />
        {current.complements && <p className="mt-2 text-[13px] text-muted">{current.name} is checked on its own here. Run a second check with your study-design checklist as well.</p>}
        {suggested && suggested !== chosen && <p className="mt-2 text-[13px] text-muted">{findGuideline(suggested)!.complements ? `This text reports ${suggested === 'sager' ? 'sex or gender results' : 'statistics'} and no study design was recognised` : `This reads like a ${findGuideline(suggested)!.for.toLowerCase()} paper`}:{' '}<button type="button" className="font-semibold text-brand hover:underline" onClick={() => setChosen(suggested)}>use {findGuideline(suggested)!.name}</button>.</p>}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
        {credits !== null && <CreditCost credits={credits} />}
        <Button variant="primary" onClick={start} disabled={!doc || busy}>{busy ? <><LuLoaderCircle className="h-4 w-4 animate-spin" />Checking {current.items.length} items…</> : <><LuSparkles className="h-4 w-4" />Check against {current.name}</>}</Button>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-muted">An item counts as reported only when the passage that reports it is found in your text. The result is a draft of the checklist: add your page or line numbers and submit the official version.</p>
    </Card>
  );
}

export function GuidelineResults({ result }: { result: GuidelineResult }) {
  const [filter, setFilter] = useState<Status | 'all' | 'todo'>('todo');
  const shown = result.findings.filter((finding) => filter === 'all' || (filter === 'todo' ? ['partial', 'missing', 'check'].includes(finding.status) : finding.status === filter));
  const exportCsv = () => download(`${result.name}-${result.version}-checklist.csv`, toCsv([
    ['Item', 'Section', 'Topic', 'Requirement', 'Status', 'Where reported', 'Quoted passage', 'Note', 'What to add', 'Page or line'],
    ...result.findings.map((finding) => [finding.id, finding.section, finding.topic, finding.text, STATUS[finding.status].label, finding.where, finding.quote, finding.note, finding.fix, '']),
  ]), 'text/csv');
  const open = () => openInEditor({ title: `${result.name} checklist: ${result.title}`, html: markdownToHtml(result.markdown), markdown: result.markdown, style: 'apa' });
  const todo = result.counts.partial + result.counts.missing + result.counts.check;
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2"><Tag tone="brand">{result.name} {result.version}</Tag><span className="text-[14px] text-muted">{result.title}</span></div>
        <p className="mt-2 text-[15.5px] leading-relaxed text-ink">{result.summary}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {(Object.keys(STATUS) as Status[]).map((status) => (
            <div key={status} className="rounded-xl border border-line px-3 py-2"><p className="text-[22px] font-bold tabular-nums text-ink">{result.counts[status]}</p><p className="text-[12.5px] text-muted">{STATUS[status].label}</p></div>
          ))}
        </div>
        {result.truncated && <p className="mt-3 text-[13px] text-amber-800">Only the first {result.words_checked.toLocaleString('en-US')} of {result.words_total.toLocaleString('en-US')} words were checked.</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="primary" onClick={open}><LuFilePen className="h-4 w-4" />Open checklist in editor</Button>
          <Button size="sm" onClick={exportCsv}><LuDownload className="h-4 w-4" />CSV with a page column</Button>
          <Button size="sm" onClick={() => navigator.clipboard.writeText(result.markdown).then(() => toast.success('Copied'))}><LuCopy className="h-4 w-4" />Copy</Button>
          <a href={result.url} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1 px-2 text-[13.5px] font-semibold text-brand hover:underline">Official checklist<LuExternalLink className="h-3.5 w-3.5" /></a>
        </div>
      </Card>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Show items">
        {([['todo', `To fix (${todo})`], ['all', `All (${result.findings.length})`], ['reported', `Reported (${result.counts.reported})`], ['not_applicable', `Not applicable (${result.counts.not_applicable})`]] as [typeof filter, string][]).map(([value, label]) => (
          <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`rounded-full border px-3 py-1 text-[13px] ${filter === value ? 'border-brand bg-brand-50 font-semibold' : 'border-line text-ink-2 hover:bg-soft'}`}>{label}</button>
        ))}
      </div>
      {!shown.length && <p className="text-[14.5px] text-muted">Nothing here. {filter === 'todo' ? 'Every applicable item is reported.' : ''}</p>}
      <ol className="space-y-2.5">
        {shown.map((finding) => (
          <li key={finding.id}>
            <Card className="p-4">
              <div className="flex flex-wrap items-start gap-2">
                <span className="rounded-md bg-soft px-2 py-0.5 text-[13px] font-bold tabular-nums">{finding.id}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-semibold text-ink">{finding.topic} <span className="font-normal text-muted">· {finding.section}</span></p>
                  <p className="text-[13.5px] text-ink-2">{finding.text}</p>
                </div>
                <Tag tone={STATUS[finding.status].tone}>{STATUS[finding.status].label}</Tag>
              </div>
              {finding.quote && <blockquote className="mt-2 border-l-2 border-line-3 pl-3 text-[13.5px] italic text-ink-2">“{finding.quote}”{finding.where && <span className="not-italic text-muted"> · {finding.where}</span>}</blockquote>}
              {finding.note && <p className="mt-2 text-[13.5px] text-ink-2">{finding.note}</p>}
              {finding.fix && <p className="mt-1 text-[13.5px]"><span className="font-semibold">Add:</span> {finding.fix}</p>}
            </Card>
          </li>
        ))}
      </ol>
      <p className="text-[12.5px] text-muted">{result.citation}</p>
    </div>
  );
}
