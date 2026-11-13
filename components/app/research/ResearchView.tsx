'use client';

/**
 * A Deep Research result, live or saved: the answer with citation chips, the consensus line,
 * the sources (cited, all read, web), follow-on tools and follow-up questions.
 */
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { LuArrowRight, LuCopy, LuFilePen, LuLibrary, LuLoaderCircle, LuRotateCcw, LuSend } from 'react-icons/lu';
import { api } from '@/lib/session';
import { Button } from '@/components/app/ui';
import { SHOW_PROVIDERS } from '@/lib/devInfo';
import { CitedMarkdown, ConsensusBar, CreditCost, SourceRow, creditsChanged, saveToLibrary, showError, type Source } from './parts';
import { Check } from './controls';
import { followOnLinks, openResultInEditor } from './handoff';
import { AskComposer, type AskRequest } from './AskComposer';
import { ResearchSteps, VerifyFlags, type StepView } from './ResearchSteps';
import type { ResearchFigure } from './figures';
import { figuresAsText } from '@/lib/server/lib/researchFigures';

export type ResearchState = {
  taskId: string | null;
  question: string;
  depth: string;
  groups: string[];
  /** The seven steps (Plan … Verify), live or as saved; empty on answers saved before the steps. */
  steps: StepView[];
  markdown: string;
  /** A report's figures (Deep and Detailed), drawn where the text has a figure block. */
  figures?: ResearchFigure[];
  sources: Source[];
  allSources: Source[];
  web: Source[];
  consensus: { applicable: boolean; line: string | null; counts: Record<string, number>; total: number } | null;
  verification?: { flags: { kind: string; text: string; revised?: string | null; note: string | null; n?: number | null }[] } | null;
  searched: { counts: Record<string, number>; errors: { provider: string; message: string }[]; queries?: string[] } | null;
  followUps: { question: string; answer: string }[];
  /** A saved task already holds a version with headings, so turning them back on is free. */
  headedCopy?: boolean;
  running: boolean;
  error: string | null;
  /** What was asked, so a run that failed or found nothing can be changed and run again. */
  request?: Partial<AskRequest>;
};

const GROUP_LABELS: Record<string, string> = { papers: 'All papers', medical: 'Medical', preprints: 'Preprints', trials: 'Clinical trials', datasets: 'Datasets', dblp: 'Computer science', web: 'Web', library: 'My Library', 'life-sciences': 'Life sciences databases', chemistry: 'Chemistry databases' };
const hasHeadings = (markdown: string) => /^#{1,6}[ \t]+\S/m.test(markdown);

const PROVIDER_LABELS: Record<string, string> = { openalex: 'OpenAlex', semantic_scholar: 'Semantic Scholar', core: 'CORE', pubmed: 'PubMed', europepmc: 'Europe PMC', arxiv: 'arXiv', clinicaltrials: 'ClinicalTrials.gov', datacite: 'DataCite', dblp: 'DBLP', web: 'Web', library: 'Library',
  ncbi_gene: 'NCBI Gene', uniprot: 'UniProt', ensembl: 'Ensembl', reactome: 'Reactome', pdb: 'RCSB PDB', alphafold: 'AlphaFold DB', gwas: 'GWAS Catalog', clinvar: 'ClinVar', pubchem: 'PubChem', chembl: 'ChEMBL' };

export function ResearchView({ state, onRetry }: { state: ResearchState; onRetry?: (request: AskRequest) => void }) {
  const [tab, setTab] = useState<'cited' | 'all' | 'web' | 'records'>('cited');
  const [highlight, setHighlight] = useState<number | null>(null);
  const [followUps, setFollowUps] = useState(state.followUps);
  const [asking, setAsking] = useState(false);
  const [followUp, setFollowUp] = useState('');
  const [markdown, setMarkdown] = useState(state.markdown);
  const [headedCopy, setHeadedCopy] = useState(Boolean(state.headedCopy));
  const [formatting, setFormatting] = useState(false);
  const sourcesRef = useRef<HTMLDivElement>(null);
  useEffect(() => setFollowUps(state.followUps), [state.followUps]);
  useEffect(() => setMarkdown(state.markdown), [state.markdown]);
  useEffect(() => setHeadedCopy(Boolean(state.headedCopy)), [state.headedCopy]);
  const withHeadings = hasHeadings(markdown);
  const addCost = withHeadings || headedCopy ? 0 : 1;
  useEffect(() => { if (!state.running && state.sources.length === 0 && state.allSources.length) setTab('all'); }, [state.running, state.sources.length, state.allSources.length]);

  const cite = (n: number) => {
    const inCited = state.sources.some((source) => source.n === n);
    const extra = state.web.find((source) => source.n === n);
    setTab(inCited ? 'cited' : extra ? (extra.database ? 'records' : 'web') : 'all');
    setHighlight(n);
    requestAnimationFrame(() => document.getElementById(`source-${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    window.setTimeout(() => setHighlight(null), 2200);
  };
  // Database records (life sciences, chemistry) travel with the web results and get their own tab.
  const webPages = state.web.filter((source) => !source.database);
  const records = state.web.filter((source) => source.database);
  const shown = tab === 'cited' ? (state.running && !state.sources.length ? state.allSources : state.sources) : tab === 'all' ? state.allSources : tab === 'records' ? records : webPages;
  const everySource = [...state.allSources, ...state.web];
  const cited = state.sources.length;
  // Under the answer: what the reader must know (changed sentences, unsupported claims, retracted or corrected papers).
  const attention = (state.verification?.flags ?? []).filter((flag) => flag.kind !== 'unconfirmed');
  const searchedTotal = Object.values(state.searched?.counts ?? {}).reduce((sum, value) => sum + value, 0);
  /** The report as text, each figure as a table: for the editor and the clipboard. */
  const asText = () => figuresAsText(markdown, state.figures);

  const ask = async () => {
    if (!state.taskId || followUp.trim().length < 2) return;
    setAsking(true);
    try {
      const result = await api<{ follow_ups: { question: string; answer: string }[] }>(`/api/research/${state.taskId}/follow-up`, { method: 'POST', body: JSON.stringify({ question: followUp.trim() }) });
      setFollowUps(result.follow_ups);
      setFollowUp('');
    } catch (error) {
      showError(error);
    } finally {
      setAsking(false);
      creditsChanged();
    }
  };
  const toggleHeadings = async (on: boolean) => {
    if (!state.taskId || formatting) return;
    setFormatting(true);
    try {
      const result = await api<{ markdown: string; headed_copy: boolean; credits: number }>(`/api/research/${state.taskId}/headings`, { method: 'POST', body: JSON.stringify({ headings: on }) });
      setMarkdown(result.markdown);
      setHeadedCopy(result.headed_copy);
      if (result.credits) creditsChanged();
    } catch (error) {
      showError(error);
    } finally {
      setFormatting(false);
    }
  };
  const saveAll = async () => {
    const papers = state.sources.filter((source) => source.kind === 'paper');
    for (const paper of papers) await saveToLibrary(paper).catch(() => undefined);
    toast.success(`${papers.length} paper${papers.length === 1 ? '' : 's'} saved to your Library`);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0">
        <p className="text-[13.5px] text-muted">
          {[state.depth && `${state.depth[0].toUpperCase()}${state.depth.slice(1)}`, state.groups.map((group) => GROUP_LABELS[group] || group).join(', '),
            searchedTotal ? `${searchedTotal} results searched` : null, cited ? `${cited} cited` : null].filter(Boolean).join(' · ')}
        </p>
        {state.searched?.errors?.length ? (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
            {SHOW_PROVIDERS ? state.searched.errors.map((error) => PROVIDER_LABELS[error.provider] || error.provider).join(', ') : 'Some sources'} did not answer this time; the answer uses the other sources.
          </p>
        ) : null}
        {state.steps.length > 0 && <ResearchSteps key={state.taskId ?? 'live'} steps={state.steps} running={state.running} />}
        {state.error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-[14.5px] text-red-700">{state.error}</p>}
        {state.error && !state.running && onRetry && (
          <section aria-labelledby="retry-title" className="mt-5">
            <h2 id="retry-title" className="flex items-center gap-2 text-[15px] font-bold text-ink">
              <LuRotateCcw className="h-4 w-4 text-brand" aria-hidden="true" />Try again
            </h2>
            <p className="mt-1 text-[14px] text-muted">Your question and settings are below. Change the wording, the sources or the filters, then press Enter or the arrow to search again.</p>
            <div className="mt-3">
              <AskComposer key={state.taskId ?? state.question} onSubmit={onRetry} autoFocus initialRequest={{ ...state.request, question: state.request?.question ?? state.question }} />
            </div>
          </section>
        )}
        {state.consensus && <div className="mt-4"><ConsensusBar consensus={state.consensus} /></div>}
        {markdown && <CitedMarkdown className={`mt-2 transition-opacity ${formatting ? 'opacity-50' : ''}`} markdown={markdown} sources={everySource} onCite={cite} figures={state.figures} />}
        {!state.running && attention.length > 0 && (
          <section aria-labelledby="checks-title" className="mt-5 rounded-xl bg-soft px-4 py-3">
            <h2 id="checks-title" className="text-[14px] font-bold text-ink">Notes from the citation check</h2>
            <VerifyFlags flags={attention} />
          </section>
        )}

        {!state.running && markdown && state.taskId && (
          <>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Button variant="primary" size="sm" onClick={() => openResultInEditor(state.question, asText(), everySource)}><LuFilePen className="h-4 w-4" />Open in editor</Button>
              <Button size="sm" onClick={() => navigator.clipboard.writeText(asText()).then(() => toast.success('Copied'))}><LuCopy className="h-4 w-4" />Copy</Button>
              <Button size="sm" onClick={() => saveAll().catch(showError)}><LuLibrary className="h-4 w-4" />Save cited papers</Button>
              <Check size="sm" className="ml-1" checked={withHeadings} onChange={toggleHeadings}
                title={withHeadings ? 'Show the answer as flowing paragraphs' : addCost ? 'Add section headings; the text and citations stay the same (1 credit)' : 'Show the version with section headings'}>
                Headings
                {formatting ? <LuLoaderCircle className="h-3.5 w-3.5 animate-spin text-brand" aria-label="Updating" /> : !withHeadings && addCost > 0 && <span className="text-[12.5px] text-muted">· {addCost} credit</span>}
              </Check>
            </div>
            <section aria-labelledby="next-title" className="mt-8">
              <h2 id="next-title" className="text-[15px] font-bold text-ink">Build on this</h2>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {followOnLinks(state.taskId).map((link) => (
                  <Link key={link.href} href={link.href} className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-line bg-surface px-3 text-[14px] font-medium text-ink-2 hover:bg-soft">
                    {link.label}<LuArrowRight className="h-3.5 w-3.5 text-subtle" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </section>
            <section aria-labelledby="followups-title" className="mt-8">
              <h2 id="followups-title" className="text-[15px] font-bold text-ink">Ask a follow-up</h2>
              {followUps.map((item, index) => (
                <div key={index} className="mt-4 rounded-xl bg-soft px-4 py-3">
                  <p className="text-[15px] font-semibold text-ink">{item.question}</p>
                  <CitedMarkdown markdown={item.answer} sources={everySource} onCite={cite} className="text-[15px]" />
                </div>
              ))}
              <form onSubmit={(event) => { event.preventDefault(); ask(); }} className="mt-3 flex items-center gap-2 rounded-xl border border-line bg-surface p-2">
                <input value={followUp} onChange={(event) => setFollowUp(event.target.value)} placeholder="Ask about these sources" aria-label="Follow-up question" className="h-9 min-w-0 flex-1 bg-transparent px-2 text-[15px] outline-none" />
                <CreditCost credits={1} className="hidden sm:inline" />
                <button type="submit" disabled={asking || followUp.trim().length < 2} aria-label="Send" className="grid h-9 w-9 place-items-center rounded-full bg-brand text-on-brand disabled:bg-subtle">
                  {asking ? <LuLoaderCircle className="h-4 w-4 animate-spin" /> : <LuSend className="h-4 w-4" />}
                </button>
              </form>
            </section>
          </>
        )}
      </div>

      <aside ref={sourcesRef} aria-label="Sources" className="min-w-0 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-48px)] lg:overflow-y-auto">
        <div className="rounded-2xl border border-line bg-surface">
          <div role="tablist" aria-label="Sources" className="flex gap-1 border-b border-line-2 px-3 pt-3">
            {([['cited', `Cited (${cited || (state.running ? '…' : 0)})`], ['all', `All read (${state.allSources.length})`], ...(webPages.length ? [['web', `Web (${webPages.length})`]] : []), ...(records.length ? [['records', `Databases (${records.length})`]] : [])] as [typeof tab, string][]).map(([id, label]) => (
              <button key={id} role="tab" type="button" aria-selected={tab === id} onClick={() => setTab(id)}
                className={`-mb-px border-b-2 px-2.5 pb-2.5 text-[14px] font-semibold ${tab === id ? 'border-brand text-ink' : 'border-transparent text-muted hover:text-ink-2'}`}>{label}</button>
            ))}
          </div>
          <ul className="p-1.5">
            {shown.length === 0 && <li className="px-3 py-6 text-center text-[14px] text-muted">{state.running ? 'Searching…' : 'No sources here.'}</li>}
            {shown.map((source) => <SourceRow key={source.n} source={source} highlighted={highlight === source.n} />)}
          </ul>
        </div>
      </aside>
    </div>
  );
}
