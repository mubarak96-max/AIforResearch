'use client';

/** Reviewer: set up a review of a thesis, proposal or manuscript, then read the scorecard and comments. */
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { LuCopy, LuFilePen, LuLoaderCircle, LuLock } from 'react-icons/lu';
import { api } from '@/lib/session';
import { openPricing } from '@/lib/billing';
import { Button, Card, Segmented } from '@/components/app/ui';
import { openInEditor } from '@/components/tools/editorHandoff';
import { markdownToHtml } from '@/components/tools/toolOutput';
import { CreditCost, creditsChanged, showError, Tag } from '@/components/app/research/parts';
import { usePlanLimits } from '@/components/app/research/AskComposer';
import { DocumentInput, documentFields, type DocumentChoice } from './DocumentInput';
import { CitationResults, type CitationCheck } from './CitationsPanel';

type Check = 'structure' | 'method' | 'citations' | 'clarity' | 'formatting';
const CHECKS: { id: Check; label: string; detail: string }[] = [
  { id: 'structure', label: 'Structure and argument', detail: 'Question, logic from aims to conclusions, order of sections' },
  { id: 'method', label: 'Method and statistics', detail: 'Design, sampling, analysis, how results are reported' },
  { id: 'citations', label: 'Citations', detail: 'Claims that need a source; every reference looked up' },
  { id: 'clarity', label: 'Clarity and style', detail: 'Plain academic English, paragraphs, terms, grammar' },
  { id: 'formatting', label: 'Formatting', detail: 'Against the template or style you describe' },
];

export type ReviewResult = {
  task_id?: string; title: string; doc_type: string; level: string; quality: string;
  scores: { criterion: string; label: string; score: number; reason: string }[]; overall: number; verdict: string; strengths: string[];
  comments: { severity: 'major' | 'minor'; criterion: string; section: string; quote: string | null; issue: string; fix: string }[];
  issues_by_section: { section: string; major: number; minor: number }[]; words_reviewed: number; words_total: number; preview: boolean;
  hidden_comments: number; markdown: string;
  citations: { checks: CitationCheck[]; summary: { total: number; counts: Record<string, number> }; limited: boolean } | null;
};

const LEVEL_LABELS: Record<string, string> = { undergraduate: 'Undergraduate', honours: 'Honours', masters: 'Master’s', phd: 'PhD' };

export function ReviewerPanel({ onDone }: { onDone: (result: ReviewResult) => void }) {
  const limits = usePlanLimits();
  const [docType, setDocType] = useState<'thesis' | 'proposal' | 'manuscript'>('thesis');
  const [level, setLevel] = useState<'undergraduate' | 'honours' | 'masters' | 'phd'>('masters');
  const [quality, setQuality] = useState<'standard' | 'high'>('standard');
  const [checks, setChecks] = useState<Check[]>(['structure', 'method', 'citations', 'clarity']);
  const [template, setTemplate] = useState('');
  const [doc, setDoc] = useState<DocumentChoice>(null);
  const [quote, setQuote] = useState<{ preview: boolean; credits: number; preview_words: number } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ preview: boolean; credits: number; preview_words: number }>('/api/reviewer/review/quote', { method: 'POST', body: JSON.stringify({ words: doc?.words ?? 0, quality }) })
      .then(setQuote).catch(() => setQuote(null));
  }, [doc?.words, quality]);

  const start = async () => {
    if (!doc) return;
    setBusy(true);
    try {
      const result = await api<ReviewResult>('/api/reviewer/review', { method: 'POST', body: JSON.stringify({ doc_type: docType, level, quality, checks, template, ...documentFields(doc) }) });
      onDone(result);
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
      creditsChanged();
    }
  };

  return (
    <Card className="p-5">
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <p className="mb-1.5 text-[13px] font-semibold text-ink-2">What are you reviewing?</p>
          <Segmented label="Document type" value={docType} onChange={setDocType} options={[{ value: 'thesis', label: 'Thesis' }, { value: 'proposal', label: 'Proposal' }, { value: 'manuscript', label: 'Manuscript' }]} />
        </div>
        <div>
          <p className="mb-1.5 text-[13px] font-semibold text-ink-2">Level</p>
          <Segmented label="Level" value={level} onChange={setLevel} options={Object.entries(LEVEL_LABELS).map(([value, label]) => ({ value: value as typeof level, label }))} />
        </div>
      </div>
      <div className="mt-5">
        <p className="mb-1.5 text-[13px] font-semibold text-ink-2">Quality</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {([['standard', 'Standard', 'A scorecard and comments in the text. 10 credits per 10,000 words.'], ['high', 'High quality', 'A deeper review with a score chart and issues by section. 30 credits per 10,000 words. Pro.']] as const).map(([id, label, detail]) => (
            <button key={id} type="button" aria-pressed={quality === id}
              onClick={() => (id === 'high' && !limits.highQuality ? openPricing('High-quality reviews are part of the Pro plan.') : setQuality(id))}
              className={`rounded-xl border px-4 py-3 text-left ${quality === id ? 'border-brand bg-brand-50' : 'border-line hover:bg-soft'}`}>
              <span className="flex items-center gap-1.5 text-[15px] font-semibold text-ink">{label}{id === 'high' && !limits.highQuality && <LuLock className="h-3.5 w-3.5 text-muted" aria-label="Pro" />}</span>
              <span className="mt-0.5 block text-[13px] text-muted">{detail}</span>
            </button>
          ))}
        </div>
      </div>
      <fieldset className="mt-5">
        <legend className="mb-1.5 text-[13px] font-semibold text-ink-2">Checks</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {CHECKS.map((check) => (
            <label key={check.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-line px-3.5 py-2.5 hover:bg-soft">
              <input type="checkbox" checked={checks.includes(check.id)} onChange={() => setChecks(checks.includes(check.id) ? (checks.length > 1 ? checks.filter((item) => item !== check.id) : checks) : [...checks, check.id])} className="mt-1 h-4 w-4 accent-[var(--color-brand)]" />
              <span><span className="block text-[14.5px] font-medium text-ink">{check.label}</span><span className="text-[13px] text-muted">{check.detail}</span></span>
            </label>
          ))}
        </div>
        {checks.includes('formatting') && (
          <textarea value={template} onChange={(event) => setTemplate(event.target.value)} rows={3} aria-label="Formatting rules"
            placeholder="Describe the template, e.g. APA 7, numbered headings to three levels, tables titled above, 1.5 line spacing"
            className="mt-2 w-full rounded-xl border border-line px-3.5 py-2.5 text-[14.5px] focus:border-brand focus:outline-none" />
        )}
      </fieldset>
      <div className="mt-5">
        <p className="mb-1.5 text-[13px] font-semibold text-ink-2">Document</p>
        <DocumentInput value={doc} onChange={setDoc} pastePlaceholder="Paste a chapter, proposal or manuscript (at least 150 words)" />
      </div>
      {quote?.preview && (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-[14px] text-amber-900">
          On the Free plan you get a preview: the full scorecard for the first {quote.preview_words.toLocaleString('en-US')} words and the three most important comments.{' '}
          <button type="button" onClick={() => openPricing('Upgrade for the complete review of every page.')} className="font-semibold underline">Upgrade for the full review</button>
        </p>
      )}
      <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
        {quote && <CreditCost credits={quote.credits} />}
        {doc?.kind === 'document' && !doc.words && <span className="text-[13px] text-muted">Priced by length</span>}
        <Button variant="primary" onClick={start} disabled={!doc || busy}>{busy ? <><LuLoaderCircle className="h-4 w-4 animate-spin" />Reviewing…</> : 'Start review'}</Button>
      </div>
      {busy && <p className="mt-2 text-right text-[13px] text-muted" aria-live="polite">Long documents are read section by section; this can take a few minutes.</p>}
    </Card>
  );
}

const barColour = (score: number) => (score >= 7 ? 'bg-green-600' : score >= 5 ? 'bg-amber-400' : 'bg-red-500');

export function ReviewResultView({ result }: { result: ReviewResult }) {
  const major = result.comments.filter((comment) => comment.severity === 'major');
  const minor = result.comments.filter((comment) => comment.severity === 'minor');
  const maxIssues = Math.max(1, ...result.issues_by_section.map((row) => row.major + row.minor));
  const open = () => openInEditor({ title: `Review: ${result.title}`, html: markdownToHtml(result.markdown), markdown: result.markdown, style: 'apa' });
  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-wrap items-start gap-5">
          <div className="text-center">
            <p className="text-[44px] font-bold leading-none tabular-nums text-ink">{result.overall}</p>
            <p className="mt-1 text-[13px] text-muted">out of 10</p>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-1.5">
              <Tag>{result.doc_type[0].toUpperCase() + result.doc_type.slice(1)}</Tag><Tag>{LEVEL_LABELS[result.level] || result.level}</Tag>
              <Tag tone={result.quality === 'high' ? 'brand' : 'neutral'}>{result.quality === 'high' ? 'High quality' : 'Standard'}</Tag>
              {result.preview && <Tag tone="warning">Preview</Tag>}
            </div>
            <p className="mt-2 text-[15.5px] leading-relaxed text-ink">{result.verdict}</p>
          </div>
        </div>
        <ul className="mt-5 space-y-3" aria-label="Scores">
          {result.scores.map((score) => (
            <li key={score.criterion}>
              <div className="flex items-baseline justify-between gap-3 text-[14px]"><span className="font-semibold text-ink">{score.label}</span><span className="tabular-nums text-ink-2">{score.score}/10</span></div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-line-2" aria-hidden="true"><div className={`h-full rounded-full ${barColour(score.score)}`} style={{ width: `${score.score * 10}%` }} /></div>
              {score.reason && <p className="mt-1 text-[13px] text-muted">{score.reason}</p>}
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button size="sm" variant="primary" onClick={open}><LuFilePen className="h-4 w-4" />Open in editor</Button>
          <Button size="sm" onClick={() => navigator.clipboard.writeText(result.markdown).then(() => toast.success('Copied'))}><LuCopy className="h-4 w-4" />Copy as Markdown</Button>
        </div>
      </Card>

      {result.preview && (
        <Card className="border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-[15px] font-semibold text-amber-900">This is a preview of {result.words_reviewed.toLocaleString('en-US')} of {result.words_total.toLocaleString('en-US')} words{result.hidden_comments ? `, with ${result.hidden_comments} more comment${result.hidden_comments === 1 ? '' : 's'} found` : ''}.</p>
          <p className="mt-1 text-[14px] text-amber-900">Upgrade to review every page, see every comment and check the whole reference list.</p>
          <Button size="sm" variant="primary" className="mt-3" onClick={() => openPricing('Upgrade for the complete review.')}>See plans</Button>
        </Card>
      )}

      {result.quality === 'high' && result.issues_by_section.length > 0 && (
        <Card className="p-5">
          <h2 className="text-[17px] font-bold">Issues by section</h2>
          <table className="mt-3 w-full text-[14px]">
            <thead><tr className="text-left text-[12.5px] text-muted"><th className="py-1.5 font-medium">Section</th><th className="py-1.5 text-right font-medium">Major</th><th className="py-1.5 text-right font-medium">Minor</th><th className="w-2/5 py-1.5" /></tr></thead>
            <tbody>
              {result.issues_by_section.map((row) => (
                <tr key={row.section} className="border-t border-line-2">
                  <td className="py-2 pr-3 text-ink">{row.section}</td>
                  <td className="py-2 text-right tabular-nums">{row.major}</td>
                  <td className="py-2 text-right tabular-nums">{row.minor}</td>
                  <td className="py-2 pl-4"><div className="flex h-2 overflow-hidden rounded-full bg-line-2" aria-hidden="true"><span className="bg-red-500" style={{ width: `${(row.major / maxIssues) * 100}%` }} /><span className="bg-amber-400" style={{ width: `${(row.minor / maxIssues) * 100}%` }} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {result.strengths.length > 0 && (
        <section><h2 className="text-[17px] font-bold">Strengths</h2><ul className="mt-2 list-disc space-y-1 pl-6 text-[15px] text-ink-2">{result.strengths.map((item) => <li key={item}>{item}</li>)}</ul></section>
      )}
      {[['Major comments', major], ['Minor comments', minor]].map(([label, list]) => (list as ReviewResult['comments']).length ? (
        <section key={label as string}>
          <h2 className="text-[17px] font-bold">{label as string} ({(list as ReviewResult['comments']).length})</h2>
          <ol className="mt-3 space-y-3">
            {(list as ReviewResult['comments']).map((comment, index) => (
              <li key={index} className="rounded-xl border border-line px-4 py-3">
                <p className="text-[13px] font-semibold text-muted">{comment.section}</p>
                <p className="mt-1 text-[15px] text-ink">{comment.issue}</p>
                {comment.quote && <blockquote className="mt-2 border-l-2 border-accent-300 pl-3 text-[14px] italic text-ink-2">“{comment.quote}”</blockquote>}
                {comment.fix && <p className="mt-2 text-[14px] text-ink-2"><span className="font-semibold text-ink">Suggested fix: </span>{comment.fix}</p>}
              </li>
            ))}
          </ol>
        </section>
      ) : null)}
      {result.citations && (
        <section>
          <h2 className="text-[17px] font-bold">Reference list</h2>
          {result.citations.limited && <p className="mt-1 text-[13.5px] text-muted">The preview checks the first 10 references.</p>}
          <CitationResults checks={result.citations.checks} counts={result.citations.summary.counts} />
        </section>
      )}
    </div>
  );
}
