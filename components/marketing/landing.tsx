/**
 * Content and sections shared by the public pages (home, /features, /how-it-works): the
 * features with their visuals, the three steps, the comparison band, the writing types and
 * the closing call to action. Type scale: 52/34 hero, 40/30 sections (desktop/phone).
 */
import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  LuArrowRight, LuBookOpen, LuCheck, LuClipboardCheck, LuFileInput, LuFileOutput, LuFlaskConical, LuGraduationCap,
  LuLandmark, LuLibrary, LuMessagesSquare, LuMic, LuNewspaper, LuPenLine, LuSearch, LuSmartphone, LuSparkles, LuSquarePen,
} from 'react-icons/lu';
import {
  AutocompleteVisual, ChatVisual, CloseMark, COMPARISON_ROWS, ExportVisual, FindPapersVisual, ImportVisual, PhoneVisual, ReviewVisual,
} from './LandingVisuals';
import { AuthAware } from './AuthAware';
import { PenCircle } from './Marginalia';
import { btnGhost, btnPrimary, container } from './styles';

export const h1 = 'text-balance font-serif text-[34px] font-semibold leading-[1.08] tracking-[-0.02em] text-ink sm:text-[44px] md:text-[52px]';
export const h2 = 'text-balance font-serif text-[30px] font-semibold leading-[1.12] tracking-[-0.02em] text-ink md:text-[40px]';
/** Feature and step titles on /features and /how-it-works. */
export const h2Item = 'text-balance font-serif text-[25px] font-semibold leading-[1.2] tracking-[-0.015em] text-ink md:text-[32px]';
/** The tinted backdrop behind a product visual. */
export const visualPanel = 'min-w-0 rounded-[24px] bg-panel p-4 ring-1 ring-line-2 sm:p-7';
export const lead = 'text-balance text-[16px] leading-[1.6] text-muted md:text-[17px]';
const cta = `${btnPrimary} h-11 rounded-[10px] px-5 text-[15px]`;

/** "Start writing free", or "Open your documents" for someone signed in. */
export function StartButton({ label = 'Start writing free' }: { label?: string }) {
  return (
    <AuthAware
      signedIn={<Link href="/editor" className={cta}>Open your documents  <LuArrowRight className="h-4 w-4" aria-hidden="true" /></Link>}
      signedOut={<Link href="/signup" className={cta}>{label} <LuArrowRight className="h-4 w-4" aria-hidden="true" /></Link>}
    />
  );
}

export type Feature = { id: string; name: string; icon: ReactNode; title: string; short: string; body: string; points: string[]; visual: ReactNode };

export const FEATURES: Feature[] = [
  {
    id: 'autocomplete',
    name: 'AI autocomplete',
    icon: <LuSparkles className="h-5 w-5" />,
    title: 'Your next sentence, already cited',
    short: 'Suggestions that cite real papers as you write.',
    body: 'Pause at the end of a sentence and WriteOrbit suggests what comes next, with a real reference. Press Tab to accept it.',
    points: ['Follows your argument and your tone', 'Every citation opens the paper behind it', 'AI Edit improves, shortens or expands a passage'],
    visual: <AutocompleteVisual />,
  },
  {
    id: 'find-papers',
    name: 'Citation generator',
    icon: <LuSearch className="h-5 w-5" />,
    title: 'Find a source and cite it in one click',
    short: 'Search 250M+ works. Cite in APA, MLA, Chicago and more.',
    body: 'Search 250M+ scholarly works, or type @ as you write. WriteOrbit formats each citation and builds your reference list or works cited page.',
    points: ['APA, MLA, Chicago, Harvard, AMA, ACS and 10,000+ styles', 'Change the style and every citation updates', 'Filter by year, citation count and open access'],
    visual: <FindPapersVisual />,
  },
  {
    id: 'chat',
    name: 'Research assistant',
    icon: <LuMessagesSquare className="h-5 w-5" />,
    title: 'Ask your papers, get the page number',
    short: 'Chat with your PDFs. Answers point to the page.',
    body: 'Upload PDFs to your Library and ask about one paper or a whole folder. Each answer shows the page it came from.',
    points: ['Cite a source straight from the answer', 'Draft a literature review from papers you choose', 'Import from Zotero and Mendeley'],
    visual: <ChatVisual />,
  },
  {
    id: 'review',
    name: 'Claim check',
    icon: <LuSquarePen className="h-5 w-5" />,
    title: 'Check every claim before you submit',
    short: 'Flags unsupported claims, weak sources and unclear sentences.',
    body: 'Claim check finds claims that are unsupported or overstated and shows where to cite. Peer review, source quality and proofreading catch the rest.',
    points: ['Major and Minor comments, like a real referee', 'Spots retracted papers and wrong DOIs', 'Fix or dismiss each comment in one click'],
    visual: <ReviewVisual />,
  },
  {
    id: 'export',
    name: 'Word, PDF and LaTeX',
    icon: <LuFileOutput className="h-5 w-5" />,
    title: 'Open your Word template, export anything',
    short: 'Word templates in. Word, PDF or LaTeX out.',
    body: 'Open your university’s .docx template and keep its styles. Export to Word, PDF or LaTeX with your references formatted.',
    points: ['Headings, tables, equations and images kept', 'Comments and tracked changes come with it', 'LaTeX export opens in Overleaf'],
    visual: <ExportVisual />,
  },
  {
    id: 'phone',
    name: 'Write together',
    icon: <LuSmartphone className="h-5 w-5" />,
    title: 'Write together, on any device',
    short: 'Share a draft and write at the same time, anywhere.',
    body: 'Invite co-authors, supervisors or editors and work in the same document at the same time. It works on your phone too.',
    points: ['Editor, commenter and viewer roles', 'Comments and version history', 'Works in the browser on phone, tablet and computer'],
    visual: <PhoneVisual />,
  },
];

export type Step = { id: string; icon: ReactNode; title: string; short: string; body: string; points: string[]; visual: ReactNode };

export const STEPS: Step[] = [
  {
    id: 'start',
    icon: <LuFileInput className="h-5 w-5" />,
    title: 'Start or import',
    short: 'Start blank, pick a template, or open your Word file.',
    body: 'Start blank or from a template, or open the Word file you already have. Its styles, comments and tracked changes come with it.',
    points: ['Templates for literature reviews, research proposals and essays', 'Opens .docx, .doc, .odt and .rtf', 'Upload PDFs to your Library to read, cite and ask about'],
    visual: <ImportVisual />,
  },
  {
    id: 'write',
    icon: <LuSparkles className="h-5 w-5" />,
    title: 'Write with AI that cites',
    short: 'Autocomplete, AI Edit and chat. Type @ to cite.',
    body: 'Autocomplete suggests your next sentence with a source. AI Edit improves a passage, and chat answers from papers and your PDFs. Type @ to cite.',
    points: ['Tab accepts a suggestion, Refine asks again', 'AI Edit: improve, shorten, expand or make it more academic', 'Find papers and cite them without leaving the page'],
    visual: <AutocompleteVisual />,
  },
  {
    id: 'review',
    icon: <LuClipboardCheck className="h-5 w-5" />,
    title: 'Check and export',
    short: 'Fix what the checks find, then export.',
    body: 'Run Claim check and peer review, fix or dismiss each comment, then export to Word, PDF or LaTeX with your reference list.',
    points: ['Comments on claims, sources and clarity', 'Version history keeps every earlier draft', 'References in the style you need'],
    visual: <ReviewVisual />,
  },
];

const AUDIENCE: { icon: ReactNode; label: string }[] = [
  { icon: <LuGraduationCap className="h-4 w-4" />, label: 'Theses and dissertations' },
  { icon: <LuNewspaper className="h-4 w-4" />, label: 'Journal and conference papers' },
  { icon: <LuLibrary className="h-4 w-4" />, label: 'Literature reviews' },
  { icon: <LuFlaskConical className="h-4 w-4" />, label: 'Lab reports' },
  { icon: <LuLandmark className="h-4 w-4" />, label: 'Grant and research proposals' },
  { icon: <LuPenLine className="h-4 w-4" />, label: 'Essays and assignments' },
  { icon: <LuBookOpen className="h-4 w-4" />, label: 'Research and policy reports' },
  { icon: <LuMic className="h-4 w-4" />, label: 'Articles and features' },
];

/** The top of a page other than home: title, one line, optional buttons. */
export function PageIntro({ title, intro, children }: { title: string; intro: string; children?: ReactNode }) {
  return (
    <section aria-labelledby="page-title" className="pt-14 text-center md:pt-20" style={{ background: 'radial-gradient(900px 340px at 50% -8%, var(--color-brand-50) 0%, transparent 70%)' }}>
      <div className={container}>
        <h1 id="page-title" className={`mx-auto max-w-[760px] ${h1}`}>{title}</h1>
        <p className={`mx-auto mt-5 max-w-[540px] ${lead}`}>{intro}</p>
        {children && <div className="mt-7 flex flex-wrap justify-center gap-3">{children}</div>}
      </div>
    </section>
  );
}

/** Ticks under a feature or a step. */
export function Points({ items }: { items: string[] }) {
  return (
    <ul className="mt-5 flex flex-col gap-2.5">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5 text-[15px] text-ink-2">
          <LuCheck className="mt-[3px] h-4 w-4 shrink-0 text-green-600" aria-hidden="true" />{item}
        </li>
      ))}
    </ul>
  );
}

/** "Not another AI chatbot": what WriteOrbit does that a general AI chat does not. */
export function ComparisonBand() {
  return (
    <section aria-labelledby="compare-title" className={`${container} wo-reveal pt-24 md:pt-32`}>
      <h2 id="compare-title" className={`mx-auto max-w-[620px] text-center ${h2}`}>Not <em>another</em> AI chatbot</h2>
      <p className={`mx-auto mt-4 max-w-[480px] text-center ${lead}`}>General AI chat can invent sources. WriteOrbit cites real papers, inside your document.</p>
      <div className="mx-auto mt-10 max-w-[760px]">
        <div className="hidden grid-cols-[1fr_1.3fr_1.3fr] gap-4 border-b border-line pb-3 text-[13px] md:grid">
          <span />
          <span className="font-semibold text-ink">WriteOrbit</span>
          <span className="text-muted">General AI chat</span>
        </div>
        <ul>
          {COMPARISON_ROWS.map((row) => (
            <li key={row.label} className="grid gap-1.5 border-b border-line py-4 text-[15px] md:grid-cols-[1fr_1.3fr_1.3fr] md:gap-4">
              <span className="font-medium text-ink">{row.label}</span>
              <span className="flex gap-2 text-ink-2"><LuCheck className="mt-[3px] h-4 w-4 shrink-0 text-green-600" aria-hidden="true" /><span><span className="sr-only">WriteOrbit: </span>{row.writeorbit}</span></span>
              <span className="flex gap-2 text-muted"><span className="mt-[3px]"><CloseMark /></span><span><span className="sr-only">General AI chat: </span>{row.chatbot}</span></span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function AudienceSection() {
  return (
    <section aria-labelledby="audience-title" className={`${container} pt-24 text-center md:pt-32`}>
      <h2 id="audience-title" className={`mx-auto max-w-[620px] ${h2}`}>For students, researchers and anyone who writes with sources</h2>
      <ul className="mx-auto mt-8 flex max-w-[820px] flex-wrap justify-center gap-2.5">
        {AUDIENCE.map((item) => (
          <li key={item.label} className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 text-[14px] text-ink-2">
            <span className="text-brand" aria-hidden="true">{item.icon}</span>
            {item.label}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function FinalCta() {
  return (
    <section aria-labelledby="cta-title" className={`${container} pb-20 pt-28 text-center md:pb-28 md:pt-36`}>
      <h2 id="cta-title" className="mx-auto max-w-[640px] text-balance font-serif text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink md:text-[48px]">Write your next paper with <PenCircle>real</PenCircle> sources</h2>
      <p className={`mx-auto mt-4 max-w-[440px] ${lead}`}>Free to start, no credit card needed. Upgrade when you need more AI.</p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <StartButton />
        <Link href="/pricing" className={`${btnGhost} h-11 rounded-[10px] px-5 text-[15px]`}>See pricing</Link>
      </div>
    </section>
  );
}
