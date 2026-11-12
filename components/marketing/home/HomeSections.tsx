/**
 * The home page's sections below the hero: how it works (three interface fragments), who it is
 * for, features and tools. Built from lib/catalog.ts. Server components; links that differ
 * signed in and signed out go through SmartLink (AuthAware).
 */
import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  LuArrowRight, LuBookOpen, LuBriefcase, LuCheck, LuFileText, LuFilter, LuGraduationCap, LuLibrary, LuMessagesSquare, LuNotebookPen,
  LuPresentation, LuQuote, LuSearch, LuSparkles, LuStethoscope, LuUsers, LuWandSparkles, LuSchool, LuFlaskConical, LuShare2,
} from 'react-icons/lu';
import { AuthAware } from '../AuthAware';
import { container, focusRing } from '../styles';
import { h2, lead } from '../landing';
import { AUDIENCES, CATALOG, FIELDS, type CatalogItem } from '@/lib/catalog';
import { signupHref } from '@/lib/features';

/** A link to the app for people signed in, and to sign-up (or a public page) for everyone else. */
export function SmartLink({ app, out, className, children, label }: { app: string; out: string; className?: string; children: ReactNode; label?: string }) {
  return (
    <AuthAware
      signedIn={<Link href={app} aria-label={label} className={className}>{children}</Link>}
      signedOut={<Link href={out} aria-label={label} className={className}>{children}</Link>}
    />
  );
}

const outHref = (item: CatalogItem) => item.marketing ?? signupHref(item.href);
const more = `inline-flex items-center gap-1.5 rounded text-[14.5px] font-medium text-brand hover:text-brand-600 ${focusRing}`;
const frame = 'overflow-hidden rounded-[16px] border border-line bg-surface text-left shadow-[0_24px_50px_-36px_rgba(15,23,42,.5)]';
const cite = (n: number) => <span className="mx-[1px] inline-grid h-[16px] min-w-[16px] -translate-y-[1px] place-items-center rounded-[4px] bg-accent-50 px-1 align-middle text-[10.5px] font-bold text-accent-600">{n}</span>;
const chip = (text: string, on = false) => <span className={`inline-flex h-6 items-center rounded-full border px-2 text-[11.5px] font-medium ${on ? 'border-brand bg-brand-50 text-brand' : 'border-line text-ink-2'}`}>{text}</span>;

// ------------------------------------------------------------------ the three fragments

function AskFragment() {
  return (
    <div className={frame} aria-hidden="true">
      <div className="p-4">
        <p className="text-[14px] leading-relaxed text-ink">Does sleep after learning improve memory consolidation?</p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex rounded-lg bg-line-2 p-0.5 text-[11.5px] font-semibold">
            <span className="rounded-md px-2 py-1 text-muted">Summary</span>
            <span className="rounded-md bg-surface px-2 py-1 text-ink shadow-[0_1px_2px_rgba(15,23,42,.12)]">Deep</span>
            <span className="rounded-md px-2 py-1 text-muted">Detailed</span>
          </span>
          <span className="ml-auto text-[11.5px] text-muted">15 credits</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line-2 pt-3">
          {chip('✓ All papers', true)}{chip('✓ Medical', true)}{chip('Preprints')}{chip('Web')}{chip('My Library')}
        </div>
      </div>
    </div>
  );
}

function EvidenceFragment() {
  return (
    <div className={frame} aria-hidden="true">
      <div className="p-4">
        <div className="rounded-lg bg-soft px-3 py-2">
          <p className="text-[12.5px] font-semibold text-ink">14 of 18 studies that test the question support it, 3 are mixed, 1 does not.</p>
          <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-line-2"><span className="w-[78%] bg-green-600" /><span className="w-[16%] bg-amber-400" /><span className="w-[6%] bg-red-500" /></div>
        </div>
        <p className="mt-3 text-[13px] leading-[1.6] text-ink-2">
          Sleep in the hours after learning improves later recall compared with an equal period awake{cite(1)}{cite(2)}. The effect is linked to slow-wave sleep and hippocampal replay{cite(3)}.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-muted"><LuFilter className="h-3 w-3" />Filters</span>
          {chip('2010–2026')}{chip('Meta-analysis')}{chip('No retracted')}
        </div>
        <div className="mt-3 rounded-lg border border-line-2 px-3 py-2">
          <p className="text-[12.5px] font-semibold text-ink"><span className="mr-1.5 rounded bg-accent-50 px-1 text-[10.5px] font-bold text-accent-600">2</span>About sleep’s role in memory</p>
          <p className="mt-0.5 text-[11.5px] text-muted">Rasch, Born · 2013 · Physiological Reviews</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-green-800">Supports</span>
            <span className="rounded bg-line-2 px-1.5 py-0.5 text-[10.5px] font-semibold text-ink-2">Review</span>
            <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-brand-600">Top journal</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function BuildFragment() {
  const next = ['Write a literature review', 'Find gaps', 'Make slides', 'Thesis outline', 'Check citations'];
  return (
    <div className={frame} aria-hidden="true">
      <div className="p-4">
        <p className="text-[12.5px] font-semibold text-ink">Build on this</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {next.map((item) => <span key={item} className="inline-flex h-7 items-center gap-1 rounded-lg border border-line px-2 text-[11.5px] font-medium text-ink-2">{item}<LuArrowRight className="h-3 w-3 text-subtle" /></span>)}
        </div>
        <div className="mt-3 rounded-lg border border-line-2">
          <div className="flex items-center gap-2 border-b border-line-2 px-3 py-1.5 text-[11.5px] font-semibold text-ink"><LuFileText className="h-3.5 w-3.5 text-brand" />Chapter 2: Literature review<span className="ml-auto rounded-full border border-line px-1.5 text-[10.5px] font-medium text-muted">APA 7</span></div>
          <p className="px-3 py-2 font-serif text-[13px] leading-[1.6] text-ink">Sleep supports the consolidation of newly learned material <span className="text-accent-600">(Diekelmann &amp; Born, 2010)</span>, and the benefit is largest for…</p>
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  { title: 'Ask', text: 'Type a question, pick the depth and where to look: papers, PubMed, preprints, the web or your own Library. Attach your PDFs.', visual: <AskFragment /> },
  { title: 'Read the evidence', text: 'Get an answer where every claim cites a real paper, a consensus line counted from the studies, and sources you can filter by year, study type and journal.', visual: <EvidenceFragment /> },
  { title: 'Build on it', text: 'Turn the answer into a literature review, a thesis outline, a gap analysis or slides, or open it in the editor with live citations.', visual: <BuildFragment /> },
];

export function HowItWorks() {
  return (
    <section aria-labelledby="how-title" className={`${container} pt-24 md:pt-32`}>
      <div className="text-center">
        <h2 id="how-title" className={`mx-auto max-w-[640px] ${h2}`}>From a question to work you can <em>defend</em></h2>
        <p className={`mx-auto mt-4 max-w-[520px] ${lead}`}>Three steps, one project. Nothing is copied between tools by hand.</p>
      </div>
      <ol className="mt-10 grid gap-6 md:mt-14 lg:grid-cols-3">
        {STEPS.map((step, index) => (
          <li key={step.title} className="wo-reveal flex flex-col">
            <h3 className="text-[17px] font-semibold text-ink"><span className="font-serif italic text-accent">{index + 1}. </span>{step.title}</h3>
            <p className="mt-1.5 text-[15px] leading-[1.6] text-muted">{step.text}</p>
            <div className="mt-4 flex-1 rounded-[22px] bg-panel p-4 ring-1 ring-line-2 sm:p-5">{step.visual}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ------------------------------------------------------------------ who it is for

const AUDIENCE_ICONS: Record<string, ReactNode> = {
  undergraduates: <LuSchool className="h-5 w-5" />, masters: <LuGraduationCap className="h-5 w-5" />, phd: <LuFlaskConical className="h-5 w-5" />,
  academics: <LuUsers className="h-5 w-5" />, medicine: <LuStethoscope className="h-5 w-5" />, industry: <LuBriefcase className="h-5 w-5" />,
};

export function WhoItsFor() {
  return (
    <section aria-labelledby="audience-title" className="mt-24 border-y border-line-2 bg-panel py-20 md:mt-32 md:py-24">
      <div className={container}>
        <div className="text-center">
          <h2 id="audience-title" className={`mx-auto max-w-[620px] ${h2}`}>Who is it for?</h2>
          <p className={`mx-auto mt-4 max-w-[560px] ${lead}`}>Anyone whose work has to stand on evidence, from a first essay to a PhD defence.</p>
        </div>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 md:mt-12 lg:grid-cols-3">
          {AUDIENCES.map((audience) => (
            <li key={audience.id} className="wo-reveal">
              <Link href={audience.now} className={`group flex h-full flex-col rounded-[16px] border border-line bg-surface p-5 transition-[border-color,box-shadow] hover:border-line-3 hover:shadow-[0_20px_40px_-30px_rgba(15,23,42,.45)] ${focusRing}`}>
                <span className="flex items-center gap-3">
                  <span className="text-brand" aria-hidden="true">{AUDIENCE_ICONS[audience.id]}</span>
                  <h3 className="font-serif text-[18px] font-semibold text-ink">{audience.name}</h3>
                </span>
                <p className="mt-2 flex-1 text-[15px] leading-[1.6] text-muted">{audience.text}</p>
                <span className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-medium text-brand">{audience.nowLabel}<LuArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mx-auto mt-8 max-w-[760px] text-balance text-center text-[15px] leading-[1.7] text-muted">
          In every field: {FIELDS.join(', ')}. Search all papers, or narrow to PubMed and Europe PMC for medicine and health.
        </p>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ features

function Fragment({ children }: { children: ReactNode }) {
  return <div aria-hidden="true" className="rounded-[14px] border border-line bg-surface p-3.5 text-left">{children}</div>;
}

const FEATURES: { title: string; text: string; icon: ReactNode; visual: ReactNode }[] = [
  {
    title: 'Answers cite real papers, never invented ones',
    text: 'Citations come from the search results, not the AI’s memory. Every number opens the paper it came from.',
    icon: <LuQuote className="h-5 w-5" />,
    visual: (
      <Fragment>
        <p className="text-[13px] leading-[1.6] text-ink-2">Forgetting was shown to be slower across sleep than across the same time awake as early as 1924{cite(5)}.</p>
        <p className="mt-2 border-t border-line-2 pt-2 text-[11.5px] text-muted"><span className="font-semibold text-ink-2">5</span> · Jenkins &amp; Dallenbach, 1924 · American Journal of Psychology</p>
      </Fragment>
    ),
  },
  {
    title: 'Search papers, the web, PubMed or your own Library',
    text: 'OpenAlex and Semantic Scholar for every field, PubMed and Europe PMC for medicine, arXiv and bioRxiv preprints, the web, and your PDFs.',
    icon: <LuSearch className="h-5 w-5" />,
    visual: <Fragment><div className="flex flex-wrap gap-1.5">{chip('✓ All papers', true)}{chip('✓ Medical', true)}{chip('Preprints')}{chip('Web')}{chip('✓ My Library', true)}</div></Fragment>,
  },
  {
    title: 'Filter by year, study type, journal and citations',
    text: 'Keep only meta-analyses or randomized trials, the last five years, top journals or open access. Retracted papers are left out.',
    icon: <LuFilter className="h-5 w-5" />,
    visual: <Fragment><div className="flex flex-wrap gap-1.5">{chip('Last 5 years', true)}{chip('Meta-analysis', true)}{chip('RCT', true)}{chip('Top journals')}{chip('Open access')}</div></Fragment>,
  },
  {
    title: 'Research in chat, or write with suggestions',
    text: 'Let the AI research the question for you, or write in the editor while it suggests the next sentence with a citation. Any answer opens in the editor.',
    icon: <LuMessagesSquare className="h-5 w-5" />,
    visual: (
      <Fragment>
        <p className="font-serif text-[13px] leading-[1.6] text-ink">Practice followed by a night of sleep <span className="rounded bg-brand-50 px-1 text-brand">improved motor skill more than the same time awake (Walker et al., 2002).</span></p>
        <p className="mt-1.5 text-[11.5px] text-muted">Tab to accept · Esc to dismiss</p>
      </Fragment>
    ),
  },
  {
    title: 'Share a project with your supervisor or co-authors',
    text: 'One project holds the questions, papers, documents and reviews. Invite people to view, comment or edit.',
    icon: <LuShare2 className="h-5 w-5" />,
    visual: (
      <Fragment>
        <p className="text-[12.5px] font-semibold text-ink">MSc thesis: sleep and memory</p>
        <div className="mt-2 flex flex-col gap-1 text-[12px] text-ink-2">
          <span className="flex justify-between"><span>Dr. T. Lindqvist</span><span className="text-muted">Can comment</span></span>
          <span className="flex justify-between"><span>A. Njeri</span><span className="text-muted">Owner</span></span>
        </div>
      </Fragment>
    ),
  },
];

export function Features() {
  return (
    <section aria-labelledby="features-title" className={`${container} pt-24 md:pt-32`}>
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between md:gap-10">
        <div>
          <h2 id="features-title" className={`max-w-[600px] ${h2}`}>Built for evidence, <em>not</em> guesswork</h2>
          <p className={`mt-4 max-w-[500px] ${lead}`}>General AI chat can invent sources. Here every answer, draft and review stands on papers you can open.</p>
        </div>
        <Link href="/features" className={`shrink-0 md:mb-1.5 ${more}`}>See all features <LuArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
      </div>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 md:mt-12 lg:grid-cols-3">
        {FEATURES.map((feature, index) => (
          <li key={feature.title} className={`wo-reveal flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-5 ${index === 0 ? 'lg:col-span-2' : ''}`}>
            <div className="rounded-[16px] bg-panel p-3.5 ring-1 ring-line-2">{feature.visual}</div>
            <div>
              <span className="flex items-center gap-2">
                <span className="text-brand" aria-hidden="true">{feature.icon}</span>
                <h3 className="text-[16px] font-semibold text-ink">{feature.title}</h3>
              </span>
              <p className="mt-1.5 text-[14.5px] leading-[1.55] text-muted">{feature.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ------------------------------------------------------------------ tools

const TOOL_IDS = ['deep-research', 'find-papers', 'chat-with-pdf', 'library', 'thesis-suite', 'proposal-studio', 'thesis-to-manuscript', 'citation-generator', 'humanizer'] as const;
const TOOL_ICONS: Record<string, ReactNode> = {
  'deep-research': <LuSparkles className="h-5 w-5" />, 'find-papers': <LuSearch className="h-5 w-5" />, 'chat-with-pdf': <LuMessagesSquare className="h-5 w-5" />,
  library: <LuLibrary className="h-5 w-5" />, 'thesis-suite': <LuGraduationCap className="h-5 w-5" />, 'proposal-studio': <LuNotebookPen className="h-5 w-5" />,
  'thesis-to-manuscript': <LuBookOpen className="h-5 w-5" />, 'citation-generator': <LuQuote className="h-5 w-5" />, humanizer: <LuWandSparkles className="h-5 w-5" />,
};
const TOOL_NAMES: Record<string, string> = { 'thesis-suite': 'Thesis Suite (AI thesis)' };

export function Tools() {
  const items = TOOL_IDS.map((id) => CATALOG.find((item) => item.id === id)!).filter(Boolean);
  return (
    <section aria-labelledby="tools-title" className={`${container} pt-24 md:pt-32`}>
      <div className="text-center">
        <h2 id="tools-title" className={`mx-auto max-w-[620px] ${h2}`}>Every step, one workspace</h2>
        <p className={`mx-auto mt-4 max-w-[520px] ${lead}`}>From the first search to the final draft. Paper search, citations and the Library cost no credits.</p>
      </div>
      <ul className="mt-10 grid gap-3 sm:grid-cols-2 md:mt-12 lg:grid-cols-3">
        {items.map((item) => (
          <li key={item.id} className="wo-reveal">
            <SmartLink app={item.href} out={outHref(item)} className={`group flex h-full gap-3.5 rounded-[16px] border border-line bg-surface p-4 transition-[border-color,box-shadow] hover:border-line-3 hover:shadow-[0_20px_40px_-30px_rgba(15,23,42,.45)] ${focusRing}`}>
              <span className="mt-0.5 text-brand" aria-hidden="true">{TOOL_ICONS[item.id] ?? <LuPresentation className="h-5 w-5" />}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-[15.5px] font-semibold text-ink">{TOOL_NAMES[item.id] ?? item.name}</span>
                  <LuArrowRight className="ml-auto h-4 w-4 shrink-0 text-subtle transition-[color,translate] group-hover:translate-x-0.5 group-hover:text-brand" aria-hidden="true" />
                </span>
                <span className="mt-1 block text-[14px] leading-[1.55] text-muted">{item.description}</span>
                <span className="mt-2 block text-[12.5px] text-subtle">{item.credits}</span>
              </span>
            </SmartLink>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        <SmartLink app="/all-tools" out="/tools" className={more}>See all tools <LuArrowRight className="h-4 w-4" aria-hidden="true" /></SmartLink>
        <span className="flex items-center gap-1.5 text-[14px] text-muted"><LuCheck className="h-4 w-4 text-green-600" aria-hidden="true" />Reviewer, Systematic Review, Data Lab and more inside</span>
      </div>
    </section>
  );
}
