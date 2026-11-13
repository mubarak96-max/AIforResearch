'use client';

/**
 * The research steps the person watches: Plan, Search, Screen, Rank, Read, Fill gaps, Write, Verify.
 * Live, each step shows what it is doing and, when done, its result; every finished step opens to
 * the details behind it. On a saved answer the same list is "How this answer was made".
 * Also the plan review a Detailed report stops at before any credits are spent.
 */
import { useEffect, useState } from 'react';
import {
  LuBookOpen, LuCheck, LuChevronDown, LuCircleAlert, LuFilter, LuListOrdered, LuListTree, LuLoaderCircle, LuMinus, LuPenLine, LuPlus, LuSearch, LuSearchCheck,
  LuShieldCheck, LuTrash2,
} from 'react-icons/lu';
import { Button } from '@/components/app/ui';
import { SHOW_PROVIDERS } from '@/lib/devInfo';
import { CreditCost } from './parts';

export type StepId = 'plan' | 'search' | 'screen' | 'rank' | 'read' | 'gaps' | 'write' | 'verify';
export type StepView = { id: StepId; state: 'pending' | 'active' | 'done' | 'skipped' | 'failed'; detail: string; data: Record<string, any> | null; ms: number | null };
export type SubQuestion = { question: string; queries: string[] };

export const STEP_ORDER: StepId[] = ['plan', 'search', 'screen', 'rank', 'read', 'gaps', 'write', 'verify'];

const STEPS: Record<StepId, { label: string; what: string; icon: React.ReactNode }> = {
  plan: { label: 'Plan', what: 'Split the question into sub-questions and searches', icon: <LuListTree /> },
  search: { label: 'Search', what: 'Search the chosen sources and remove duplicates', icon: <LuSearch /> },
  screen: { label: 'Screen', what: 'Read titles and abstracts; keep what is on the question', icon: <LuFilter /> },
  rank: { label: 'Rank', what: 'Rank sources for the selected research approach', icon: <LuListOrdered /> },
  read: { label: 'Read', what: 'Pull each paper’s finding, sample, limits and effect size', icon: <LuBookOpen /> },
  gaps: { label: 'Fill gaps', what: 'Search again where the evidence is thin or conflicting', icon: <LuSearchCheck /> },
  write: { label: 'Write', what: 'Outline, write each section and draw the figures, citing every claim', icon: <LuPenLine /> },
  verify: { label: 'Verify', what: 'Check cited narrative within the depth limit; show unverified claims and reference notices', icon: <LuShieldCheck /> },
};

const PROVIDERS: Record<string, string> = { openalex: 'OpenAlex', semantic_scholar: 'Semantic Scholar', core: 'CORE', pubmed: 'PubMed', europepmc: 'Europe PMC', arxiv: 'arXiv', clinicaltrials: 'ClinicalTrials.gov', datacite: 'DataCite', dblp: 'DBLP', web: 'Web', library: 'My Library',
  ncbi_gene: 'NCBI Gene', uniprot: 'UniProt', ensembl: 'Ensembl', reactome: 'Reactome', pdb: 'RCSB PDB', alphafold: 'AlphaFold DB', gwas: 'GWAS Catalog', clinvar: 'ClinVar', pubchem: 'PubChem', chembl: 'ChEMBL' };
const RELEVANCE = [
  { label: 'On the question', className: 'bg-green-600' },
  { label: 'On a sub-question', className: 'bg-green-400' },
  { label: 'Background only', className: 'bg-amber-400' },
  { label: 'Off-topic', className: 'bg-line' },
];

/**
 * The steps in order, filling in any the server has not reported yet. Answers saved before the
 * Fill gaps step (Verify reported, no gaps step) show the seven steps they ran.
 */
export function withAllSteps(steps: StepView[] | null | undefined): StepView[] {
  const older = Boolean(steps?.some((step) => step.id === 'verify' && step.state !== 'pending')) && !steps?.some((step) => step.id === 'gaps');
  return STEP_ORDER.filter((id) => !(older && id === 'gaps')).map((id) => steps?.find((step) => step.id === id) ?? { id, state: 'pending', detail: '', data: null, ms: null });
}

/** Applies one `step` event to the list. */
export function applyStep(steps: StepView[] | null | undefined, step: StepView): StepView[] {
  return withAllSteps(steps).map((item) => (item.id === step.id ? step : item));
}

const seconds = (ms: number | null) => (ms === null ? '' : ms < 1000 ? '<1 s' : `${Math.round(ms / 1000)} s`);

export function ResearchSteps({ steps, running }: { steps: StepView[]; running: boolean }) {
  const all = withAllSteps(steps);
  const [open, setOpen] = useState<StepId | null>(null);
  const [shown, setShown] = useState(running);
  useEffect(() => { if (running) setShown(true); }, [running]);
  const byId = (id: StepId) => all.find((step) => step.id === id);
  const plan = (byId('plan')?.data?.sub_questions ?? []) as SubQuestion[];
  const done = all.filter((step) => step.state === 'done' || step.state === 'skipped').length;

  if (!running && !shown) {
    const search = byId('search')?.data;
    const screen = byId('screen')?.data;
    const verify = byId('verify')?.data;
    const gaps = byId('gaps')?.data;
    const facts = [
      search?.found ? `${Number(search.found).toLocaleString('en-US')} found` : null,
      screen ? `${screen.kept} relevant` : null,
      byId('rank')?.data?.kept ? `${Number(byId('rank')!.data!.kept) + Number(gaps?.added ?? 0)} used` : null,
      verify?.claims ? verifySummary(verify.claims) : null,
    ].filter(Boolean);
    return (
      <button type="button" onClick={() => setShown(true)} aria-expanded="false"
        className="mt-4 flex w-full items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-left hover:bg-soft">
        <LuShieldCheck className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
        <span className="text-[14px] font-semibold text-ink">How this answer was made</span>
        <span className="min-w-0 flex-1 truncate text-[13px] text-muted">{facts.join(' → ')}</span>
        <LuChevronDown className="h-4 w-4 shrink-0 text-subtle" aria-hidden="true" />
      </button>
    );
  }

  return (
    <section aria-label="Research steps" className="mt-4 rounded-2xl border border-line bg-surface px-4 py-3">
      <div className="flex items-center gap-2">
        <h2 className="text-[14px] font-bold text-ink">{running ? 'Researching' : 'How this answer was made'}</h2>
        <span className="text-[12.5px] text-muted">{done} of {all.length} steps</span>
        {!running && (
          <button type="button" onClick={() => setShown(false)} className="ml-auto text-[13px] font-semibold text-brand hover:underline">Hide</button>
        )}
      </div>
      <ol className="mt-2" aria-live="polite">
        {all.map((step, index) => {
          const meta = STEPS[step.id];
          const expandable = step.state === 'done' && Boolean(step.data);
          const isOpen = open === step.id && expandable;
          return (
            <li key={step.id} className="relative flex gap-3">
              {index < all.length - 1 && (
                <span aria-hidden="true" className={`absolute left-[13px] top-7 bottom-0 w-px ${step.state === 'done' ? 'bg-brand/40' : 'bg-line'}`} />
              )}
              <StepMark state={step.state} icon={meta.icon} />
              <div className="min-w-0 flex-1 pb-3">
                <button type="button" disabled={!expandable} onClick={() => setOpen(isOpen ? null : step.id)} aria-expanded={expandable ? isOpen : undefined}
                  className="group flex w-full items-baseline gap-2 text-left disabled:cursor-default">
                  <span className={`shrink-0 text-[14.5px] ${step.state === 'pending' || step.state === 'skipped' ? 'font-medium text-muted' : 'font-semibold text-ink'}`}>{meta.label}</span>
                  <span className={`min-w-0 flex-1 text-[13.5px] ${step.state === 'failed' ? 'text-red-700' : step.state === 'pending' || step.state === 'skipped' ? 'text-subtle' : 'text-ink-2'}`}>
                    {step.state === 'pending' ? meta.what : step.state === 'active' ? `${step.detail}…` : step.detail}
                  </span>
                  {step.state === 'done' && <span className="shrink-0 text-[12px] tabular-nums text-subtle">{seconds(step.ms)}</span>}
                  {expandable && <LuChevronDown className={`h-3.5 w-3.5 shrink-0 self-center text-subtle transition-transform group-hover:text-ink-2 ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />}
                </button>
                {isOpen && <div className="mt-2 rounded-xl bg-soft px-3 py-2.5 text-[13.5px] text-ink-2"><StepDetails step={step} plan={plan} /></div>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function StepMark({ state, icon }: { state: StepView['state']; icon: React.ReactNode }) {
  const base = 'relative z-[1] grid h-7 w-7 shrink-0 place-items-center rounded-full [&>svg]:h-3.5 [&>svg]:w-3.5';
  if (state === 'done') return <span className={`${base} bg-brand text-on-brand`}><LuCheck aria-label="Done" /></span>;
  if (state === 'active') return <span className={`${base} bg-brand-50 text-brand ring-2 ring-brand`}><LuLoaderCircle className="animate-spin" aria-label="Working" /></span>;
  if (state === 'skipped') return <span className={`${base} border border-line bg-soft text-subtle`}><LuMinus aria-label="Skipped" /></span>;
  if (state === 'failed') return <span className={`${base} bg-red-50 text-red-700`}><LuCircleAlert aria-label="Stopped" /></span>;
  return <span className={`${base} border border-line bg-surface text-subtle`} aria-hidden="true">{icon}</span>;
}

function Bar({ parts }: { parts: { value: number; className: string; label: string }[] }) {
  const total = parts.reduce((sum, part) => sum + part.value, 0) || 1;
  return (
    <div>
      <div className="flex h-2 overflow-hidden rounded-full bg-line-2" aria-hidden="true">
        {parts.map((part) => <span key={part.label} className={part.className} style={{ width: `${(part.value / total) * 100}%` }} />)}
      </div>
      <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[12.5px] text-muted">
        {parts.map((part) => (
          <span key={part.label} className="inline-flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${part.className}`} aria-hidden="true" />{part.label} {part.value}</span>
        ))}
      </p>
    </div>
  );
}

function StepDetails({ step, plan }: { step: StepView; plan: SubQuestion[] }) {
  const data = step.data ?? {};
  switch (step.id) {
    case 'plan':
      return (
        <>
          {data.reviewed && <p className="mb-1.5 text-[12.5px] font-semibold text-brand">You reviewed this plan before the research started.</p>}
          <ol className="list-decimal space-y-1.5 pl-5">
            {(data.sub_questions as SubQuestion[] ?? []).map((sub, index) => (
              <li key={index}>
                <span className="text-ink">{sub.question}</span>
                <span className="mt-0.5 flex flex-wrap gap-1">{sub.queries.map((query) => <code key={query} className="rounded bg-surface px-1.5 py-0.5 text-[12px] text-muted">{query}</code>)}</span>
              </li>
            ))}
          </ol>
        </>
      );
    case 'search':
      return (
        <>
          {SHOW_PROVIDERS && (
            <p className="flex flex-wrap gap-1.5">
              {Object.entries((data.counts ?? {}) as Record<string, number>).map(([provider, count]) => (
                <span key={provider} className="rounded-md bg-surface px-2 py-0.5 text-[12.5px]"><span className="font-semibold text-ink">{PROVIDERS[provider] || provider}</span> {count}</span>
              ))}
            </p>
          )}
          <p className="mt-2">
            {Number(data.found ?? 0).toLocaleString('en-US')} results from {(data.queries ?? []).length} {(data.queries ?? []).length === 1 ? 'search' : 'searches'}, {Number(data.unique ?? 0).toLocaleString('en-US')} distinct papers
            {data.chased ? `, ${data.chased} of them found by following the references and citations of the best papers (citation chasing)` : ''}.
          </p>
          {data.errors?.length ? <p className="mt-1 text-[12.5px] text-amber-800">{SHOW_PROVIDERS ? `${(data.errors as { provider: string }[]).map((error) => PROVIDERS[error.provider] || error.provider).join(', ')} did not answer.` : 'Some sources did not answer.'}</p> : null}
        </>
      );
    case 'screen': {
      const levels = (data.by_relevance ?? [0, 0, 0, 0]) as number[];
      return (
        <>
          <Bar parts={RELEVANCE.map((level, index) => ({ ...level, value: levels[index] ?? 0 }))} />
          {data.examples?.length ? (
            <details className="mt-2">
              <summary className="cursor-pointer text-[13px] font-semibold text-brand">Excluded papers ({data.excluded})</summary>
              <ul className="mt-1.5 space-y-1">
                {(data.examples as { title: string; year: number | null; reason: string }[]).map((item, index) => (
                  <li key={index} className="text-[13px]"><span className="text-ink">{item.title}</span>{item.year ? ` (${item.year})` : ''} <span className="text-muted">— {item.reason}</span></li>
                ))}
              </ul>
            </details>
          ) : null}
        </>
      );
    }
    case 'rank':
      return (
        <>
          {plan.length > 1 && data.covered && (
            <ul className="mb-2 space-y-0.5 text-[13px]">
              {plan.map((sub, index) => <li key={index}><span className="font-semibold text-ink">{data.covered[index] ?? 0}</span> <span className="text-muted">for</span> {sub.question}</li>)}
            </ul>
          )}
          <ol className="space-y-1">
            {(data.top ?? []).map((item: { n: number; title: string; year: number | null; design: string | null; score: number | null }) => (
              <li key={item.n} className="flex items-center gap-2 text-[13px]">
                <span className="grid h-5 min-w-5 place-items-center rounded bg-accent-50 px-1 text-[11px] font-bold text-accent-600">{item.n}</span>
                <span className="min-w-0 flex-1 truncate text-ink" title={item.title}>{item.title}</span>
                {item.design && <span className="hidden shrink-0 text-[12px] text-muted sm:inline">{item.design}</span>}
                  <span className="h-1.5 w-12 shrink-0 overflow-hidden rounded-full bg-line-2" title={`Retrieval rank ${Math.round((item.score ?? 0) * 100)}; not a certainty rating`}>
                  <span className="block h-full bg-brand" style={{ width: `${Math.round((item.score ?? 0) * 100)}%` }} />
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-[12px] text-muted">{data.ranking_description ?? 'Legacy ranking: relevance 45%, study design 25%, citations a year 15%, recency 8%, journal 7%. This is not a quality assessment.'}</p>
        </>
      );
    case 'read': {
      const stances = data.stances ?? {};
      return (
        <>
          <p>{data.read} papers read{data.full_texts ? `, ${data.full_texts} of them from the open full text` : ' from their abstracts'}.{data.effects ? ` ${data.effects} reported an effect size with a confidence interval that was found word for word in the paper.` : ''}</p>
          <div className="mt-2">
            <Bar parts={[
              { label: 'Support', value: stances.supports ?? 0, className: 'bg-green-600' },
              { label: 'Mixed', value: stances.mixed ?? 0, className: 'bg-amber-400' },
              { label: 'Against', value: stances.against ?? 0, className: 'bg-red-500' },
              { label: 'Not tested', value: stances.unclear ?? 0, className: 'bg-line' },
            ]} />
          </div>
        </>
      );
    }
    case 'gaps': {
      const gaps = (data.gaps ?? []) as { sub: number; gap: string; query: string }[];
      if (!gaps.length) return <p>The first reading covered every sub-question well enough; no second search was needed.</p>;
      return (
        <>
          <ul className="space-y-1.5">
            {gaps.map((gap, index) => (
              <li key={index}>
                <span className="text-ink">{gap.gap}</span>
                {gap.sub > 0 && plan[gap.sub - 1] && <span className="text-[12.5px] text-muted"> · sub-question {gap.sub}</span>}
                <span className="mt-0.5 block"><code className="rounded bg-surface px-1.5 py-0.5 text-[12px] text-muted">{gap.query}</code></span>
              </li>
            ))}
          </ul>
          <p className="mt-2">{Number(data.screened ?? 0).toLocaleString('en-US')} new papers screened, {Number(data.added ?? 0).toLocaleString('en-US')} added to the report.</p>
          {data.papers?.length ? (
            <ul className="mt-1.5 space-y-0.5 text-[13px]">
              {(data.papers as { n: number; title: string; year: number | null }[]).map((paper) => (
                <li key={paper.n} className="flex gap-2"><span className="grid h-5 min-w-5 place-items-center rounded bg-accent-50 px-1 text-[11px] font-bold text-accent-600">{paper.n}</span><span className="min-w-0 truncate text-ink">{paper.title}{paper.year ? ` (${paper.year})` : ''}</span></li>
              ))}
            </ul>
          ) : null}
        </>
      );
    }
    case 'write':
      return (
        <>
          <p>{Number(data.words ?? 0).toLocaleString('en-US')} words, written only from the numbered sources{data.sections?.length ? ', each thematic section from its own sources' : ''}.</p>
          {data.sections?.length ? <p className="mt-1.5"><span className="font-semibold text-ink">Sections:</span> {(data.sections as string[]).join(' · ')}</p> : null}
          {data.figures?.length ? <p className="mt-1"><span className="font-semibold text-ink">Figures:</span> {(data.figures as string[]).join(' · ')}</p> : null}
        </>
      );
    case 'verify':
      return <VerifyDetails data={data} />;
    default:
      return null;
  }
}

/** Older reports counted failed checks as supported and recorded no coverage, so they get no N/N figure. */
function verifySummary(claims: Record<string, any>): string {
  if (!Number.isFinite(claims.total) || !Number.isFinite(claims.completed)) return 'Older report: check coverage not recorded';
  const unverified = claims.unverified ? `, ${claims.unverified} unverified` : '';
  return `${claims.completed}/${claims.total} cited sentences checked${unverified}`;
}

type Flag = { kind: string; text: string; revised?: string | null; note: string | null; n?: number | null };
const FLAG_LABEL: Record<string, string> = {
  revised: 'Narrower draft — review the revision', unsupported: 'Not supported by the source excerpts', partly_supported: 'Only partly supported', unverified: 'Claim not verified', retracted: 'Retracted paper',
  corrected: 'Correction published', concern: 'Expression of concern', unconfirmed: 'Reference not confirmed', reference_unverified: 'Reference check incomplete',
};

function VerifyDetails({ data }: { data: Record<string, any> }) {
  const claims = data.claims ?? {};
  const refs = data.references ?? {};
  const flags = (data.flags ?? []) as Flag[];
  const coverageRecorded = Number.isFinite(claims.total) && Number.isFinite(claims.completed);
  return (
    <>
      <ul className="space-y-0.5">
        {coverageRecorded ? <li><span className="font-semibold text-ink">{claims.completed} of {claims.total}</span> cited narrative sentences in the initial draft received an assessment; {claims.attempted ?? 0} were sent for checking{claims.no_source_text ? ` and ${claims.no_source_text} could not be checked because a cited source had no usable text` : ''}.</li> : <li className="text-amber-700">This older report did not record complete verification coverage. Its saved assessment counts cannot establish how much of the report was checked.</li>}
        <li><span className="font-semibold text-ink">{claims.supported ?? 0}</span> judged supported by AI against the source excerpts{claims.partly ? `; ${claims.partly} partly supported` : ''}{claims.unsupported ? `; ${claims.unsupported} unsupported` : ''}.</li>
        {claims.unverified ? <li className="text-amber-700"><span className="font-semibold">{claims.unverified} unverified</span>{claims.not_checked ? `, including ${claims.not_checked} outside this depth’s check limit` : ''}. These do not count as supported.</li> : null}
        {claims.revised ? <li><span className="font-semibold text-ink">{claims.revised}</span> sentence{claims.revised === 1 ? ' was' : 's were'} rewritten. The counts describe the initial draft; inspect each revision against its sources before accepting it.</li> : null}
        {refs.checked ? <li><span className="font-semibold text-ink">{refs.confirmed} of {refs.checked}</span> references confirmed at Crossref{refs.retracted ? `; ${refs.retracted} retracted` : ''}{refs.corrected ? `; ${refs.corrected} with a correction or concern` : ''}.</li> : null}
        {refs.total != null && <li>{refs.attempted ?? 0} of {refs.total} reference checks attempted{refs.unverified ? `; ${refs.unverified} unverified` : ''}{refs.no_doi ? `; ${refs.no_doi} without a DOI` : ''}{refs.notices_unverified ? `; ${refs.notices_unverified} notice checks incomplete or outside coverage` : ''}.</li>}
        {data.dropped_markers ? <li>{data.dropped_markers} citation marker{data.dropped_markers === 1 ? '' : 's'} pointing at no source {data.dropped_markers === 1 ? 'was' : 'were'} removed.</li> : null}
      </ul>
      <p className="mt-2 text-[12px] text-muted">These checks cover cited narrative sentences, not uncited statements or computed tables. A found DOI establishes a reference’s identity, not support for a claim.</p>
      {Array.isArray(claims.uncited_sentences) && claims.uncited_sentences.length > 0 && <details className="mt-3"><summary className="cursor-pointer font-semibold text-amber-700">{claims.uncited_sentences.length} uncited sentences to review</summary><p className="mt-1 text-[12px] text-muted">A conservative prose heuristic found no citation markers in these sentences. They were not assessed for support. This list is not a factual-claim classification or a complete count of claims.</p><ul className="mt-2 max-h-72 list-disc space-y-2 overflow-y-auto pl-5">{claims.uncited_sentences.map((sentence: string, at: number) => <li key={at}>{sentence}</li>)}</ul></details>}
      {Array.isArray(claims.items) && claims.items.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer font-semibold text-ink">Inspect sentence checks and source basis</summary>
          <ol className="mt-2 max-h-96 space-y-3 overflow-y-auto pr-2">
            {claims.items.map((item: { text: string; verdict: string; note?: string | null; sources?: { n: number; basis: string }[]; revised_text?: string }, index: number) => (
              <li key={index} className="rounded-lg border border-line bg-surface p-3">
                <p className="font-semibold text-ink">{item.verdict === 'yes' ? 'AI judged supported' : item.verdict === 'partly' ? 'Partly supported' : item.verdict === 'no' ? 'Unsupported' : 'Unverified'}</p>
                <p className="mt-1">{item.text}</p>
                <p className="mt-1 flex flex-wrap gap-x-3 text-[12px]">{item.sources?.map((source) => <a key={source.n} href={`#source-${source.n}`} className="text-brand hover:underline">Source {source.n}: {source.basis.replaceAll('_', ' ')}</a>)}</p>
                {item.note && <p className="mt-1 text-[12px] text-muted">{item.note}</p>}
                {item.revised_text && <p className="mt-1 text-[12px] text-muted">Revision awaiting review: {item.revised_text}</p>}
              </li>
            ))}
          </ol>
        </details>
      )}
      {flags.length > 0 && <VerifyFlags flags={flags} />}
    </>
  );
}

/** What Verify changed or could not fix, shown under the answer too. */
export function VerifyFlags({ flags, className = 'mt-2.5' }: { flags: Flag[]; className?: string }) {
  if (!flags.length) return null;
  return (
    <ul className={`space-y-2 ${className}`}>
      {flags.map((flag, index) => {
        const tone = flag.kind === 'revised' ? 'border-brand/30' : flag.kind === 'retracted' || flag.kind === 'unsupported' ? 'border-red-300' : 'border-amber-300';
        return (
          <li key={index} className={`rounded-lg border-l-[3px] bg-surface px-3 py-2 text-[13px] ${tone}`}>
            <p className="font-semibold text-ink">{FLAG_LABEL[flag.kind] ?? flag.kind}{flag.n ? ` · source ${flag.n}` : ''}</p>
            {flag.kind === 'revised' ? (
              <>
                <p className="mt-0.5 text-muted line-through decoration-subtle">{flag.text}</p>
                <p className="mt-0.5 text-ink-2">{flag.revised}</p>
              </>
            ) : <p className="mt-0.5 text-ink-2">{flag.text}</p>}
            {flag.note && <p className="mt-0.5 text-[12.5px] text-muted">{flag.note}</p>}
          </li>
        );
      })}
    </ul>
  );
}

/** A Detailed report's plan, before any credits are spent: edit, remove or add sub-questions, then start. */
export function PlanReview({ question, plan, credits, onStart, onCancel }: {
  question: string; plan: SubQuestion[] | null; credits: number; onStart: (plan: SubQuestion[]) => void; onCancel: () => void;
}) {
  const [subs, setSubs] = useState<SubQuestion[]>(plan ?? []);
  useEffect(() => { if (plan) setSubs(plan); }, [plan]);
  const valid = subs.filter((sub) => sub.question.trim().length >= 3);
  const edit = (index: number, value: string) => setSubs(subs.map((sub, at) => (at === index ? { question: value, queries: [] } : sub)));

  return (
    <section aria-labelledby="plan-title" className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-50 text-brand"><LuListTree className="h-3.5 w-3.5" aria-hidden="true" /></span>
        <h2 id="plan-title" className="text-[16px] font-bold text-ink">Review the research plan</h2>
      </div>
      <p className="mt-2 text-[14px] text-muted">
        A Detailed report researches each of these sub-questions. Change, remove or add any, then start. Nothing is charged until you start.
      </p>
      <p className="mt-3 text-[14.5px] font-semibold text-ink">{question}</p>
      {!plan ? (
        <p className="mt-4 flex items-center gap-2 text-[14px] text-ink-2"><LuLoaderCircle className="h-4 w-4 animate-spin text-brand" aria-hidden="true" />Planning the sub-questions…</p>
      ) : (
        <ol className="mt-3 space-y-2">
          {subs.map((sub, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="mt-2 w-5 shrink-0 text-right text-[13px] font-semibold text-muted">{index + 1}.</span>
              <div className="min-w-0 flex-1">
                <textarea value={sub.question} onChange={(event) => edit(index, event.target.value)} rows={1} maxLength={300} aria-label={`Sub-question ${index + 1}`}
                  className="field-sizing-content w-full resize-none rounded-lg border border-line bg-surface px-3 py-2 text-[14.5px] text-ink outline-none focus:border-brand" />
                <p className="mt-0.5 truncate px-1 text-[12px] text-muted">
                  {sub.queries.length ? `Searches: ${sub.queries.join(' · ')}` : 'Searches will be written from your wording'}
                </p>
              </div>
              <button type="button" onClick={() => setSubs(subs.filter((_, at) => at !== index))} disabled={subs.length <= 1} aria-label={`Remove sub-question ${index + 1}`}
                className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-soft hover:text-red-700 disabled:opacity-40">
                <LuTrash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ol>
      )}
      {plan && subs.length < 8 && (
        <button type="button" onClick={() => setSubs([...subs, { question: '', queries: [] }])} className="mt-2 inline-flex items-center gap-1.5 pl-7 text-[13.5px] font-semibold text-brand hover:underline">
          <LuPlus className="h-4 w-4" aria-hidden="true" />Add a sub-question
        </button>
      )}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button variant="primary" disabled={!plan || !valid.length} onClick={() => onStart(valid.map((sub) => ({ question: sub.question.trim(), queries: sub.queries })))}>Start research</Button>
        <CreditCost credits={credits} />
        <Button variant="ghost" onClick={onCancel} className="ml-auto">Cancel</Button>
      </div>
    </section>
  );
}
