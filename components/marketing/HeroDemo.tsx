/**
 * The animated product tour under the hero: the WriteOrbit editor drawn in HTML/CSS, playing one
 * 16-second loop of the real workflow. No client JS; the timeline lives in globals.css
 * ("Hero demo"), one keyframe per element, all on the same cycle:
 *
 *   0–25%  Write   ghost suggestion types in with a citation, Tab accepts it, the reference is added
 *  25–50%  Cite    the writer types @nap, picks a paper from the pop-up, the citation goes in
 *  50–75%  Check   Claim check scans, flags an unsupported claim, Fix adds a source
 *  75–100% Export  Export is pressed, a Word file downloads with its references
 *
 * The markup's own classes are the still frame (everything done) shown with reduced motion.
 * Real papers only: every citation and reference below exists.
 */
import type { CSSProperties, ReactNode } from 'react';
import {
  LuBold, LuCircleAlert, LuCircleCheck, LuDownload, LuFileText, LuHeading2, LuItalic, LuLibrary, LuList,
  LuMessagesSquare, LuPlus, LuQuote, LuSearch, LuShieldCheck, LuSparkles, LuUnderline,
} from 'react-icons/lu';

const nth = (i: number) => ({ '--i': i }) as CSSProperties;

const SUGGESTION = 'measurably, even when study time is held constant'.split(' ');
const TYPED = 'Even a short nap improves recall'.split(' ');

const NAV: [ReactNode, string][] = [
  [<LuFileText key="d" />, 'Documents'],
  [<LuLibrary key="l" />, 'Library'],
  [<LuSearch key="f" />, 'Find papers'],
  [<LuMessagesSquare key="c" />, 'AI chat'],
];
const RECENT = ['Thesis — Chapter 2', 'Literature review', 'Grant proposal'];

/** One reference-list entry; `step` names the keyframe that adds it (none: there from the start). */
function Ref({ step, children }: { step?: string; children: ReactNode }) {
  return (
    <li className={`${step ?? ''} max-h-[1.75em] overflow-hidden truncate pl-[1.5em] -indent-[1.5em]`}>{children}</li>
  );
}

function Issue({ className = '' }: { className?: string }) {
  return (
    <div className={`wo-h-issue rounded-[12px] border border-red-200 bg-surface p-3 opacity-0 shadow-[0_12px_28px_-18px_rgba(28,25,23,.5)] ${className}`}>
      <div className="flex items-center gap-1.5">
        <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-[10.5px] font-bold text-red-700">Major</span>
        <span className="text-[11px] text-muted">Claim check</span>
      </div>
      <p className="mt-1.5 text-[12px] leading-snug text-ink-2">This claim needs a citation. One source in your Library supports it.</p>
      <div className="mt-2 flex gap-1.5 text-[11.5px] font-semibold">
        <span className="wo-h-fix rounded-[8px] bg-brand px-2.5 py-1 text-on-brand">Fix: add source</span>
        <span className="rounded-[8px] border border-line px-2.5 py-1 text-ink-2">Dismiss</span>
      </div>
    </div>
  );
}

export function HeroDemo() {
  return (
    <div
      role="img"
      aria-label="An animation of the WriteOrbit editor. Autocomplete suggests the next sentence with a citation and it is accepted with Tab; typing @ finds a paper and cites it; Claim check flags an unsupported claim and adds a source; the paper is exported to Word with its reference list."
      className="wo-hero"
    >
      <div aria-hidden="true" className="overflow-hidden rounded-[12px] border border-line bg-surface text-left shadow-[0_40px_80px_-44px_rgba(15,23,42,.45)] md:rounded-[16px]">
        {/* Browser bar */}
        <div className="flex h-8 items-center gap-[7px] border-b border-line bg-line-2 px-3 md:h-9">
          <i className="size-2 rounded-full bg-line-3 md:size-2.5" />
          <i className="size-2 rounded-full bg-line-3 md:size-2.5" />
          <i className="size-2 rounded-full bg-line-3 md:size-2.5" />
          <span className="mx-auto flex h-5 min-w-0 items-center rounded-[6px] bg-surface px-2.5 font-mono text-[10.5px] text-muted md:text-[11.5px]">app.example.com/editor</span>
        </div>

        <div className="grid h-[440px] grid-cols-1 grid-rows-1 sm:h-[480px] md:h-[520px] md:grid-cols-[176px_1fr_264px] lg:grid-cols-[196px_1fr_288px]">
          {/* Sidebar */}
          <aside className="hidden flex-col gap-1 border-r border-line-2 bg-soft p-3 md:flex">
            <span className="mb-2 flex h-8 items-center justify-center gap-1.5 rounded-[9px] bg-brand text-[12px] font-semibold text-on-brand"><LuPlus className="h-3.5 w-3.5" /> New document</span>
            {NAV.map(([icon, label], i) => (
              <span key={label} className={`flex h-7 items-center gap-2 rounded-[8px] px-2 text-[12px] [&>svg]:h-3.5 [&>svg]:w-3.5 ${i ? 'text-ink-2' : 'bg-surface font-semibold text-ink ring-1 ring-line'}`}>{icon}{label}</span>
            ))}
            <p className="mt-4 px-2 text-[10px] font-semibold uppercase tracking-[.1em] text-subtle">Recent</p>
            {RECENT.map((name, i) => (
              <span key={name} className={`truncate rounded-[8px] px-2 py-1 text-[12px] ${i ? 'text-muted' : 'font-medium text-brand'}`}>{name}</span>
            ))}
          </aside>

          {/* Document */}
          <div className="relative flex min-w-0 flex-col">
            <div className="flex h-11 shrink-0 items-center gap-2 border-b border-line-2 px-3 sm:px-4">
              <span className="min-w-0 truncate text-[12.5px] font-semibold text-ink">Thesis — Chapter 2</span>
              <span className="ml-1 hidden items-center gap-2.5 text-muted lg:flex [&>svg]:h-3.5 [&>svg]:w-3.5">
                <LuBold /><LuItalic /><LuUnderline /><LuHeading2 /><LuList /><LuQuote />
              </span>
              <span className="ml-auto hidden rounded-full border border-line px-2 py-0.5 text-[11px] font-medium text-ink-2 sm:inline">APA 7</span>
              <span className="flex -space-x-1">
                <span className="grid size-6 place-items-center rounded-full bg-[#3f7d58] text-[9.5px] font-bold text-white ring-2 ring-surface">JM</span>
                <span className="grid size-6 place-items-center rounded-full bg-brand text-[9.5px] font-bold text-on-brand ring-2 ring-surface">You</span>
              </span>
              <span className="wo-h-export ml-auto inline-flex h-7 items-center gap-1.5 rounded-[8px] bg-ink px-2.5 text-[11.5px] font-semibold text-on-ink sm:ml-0">
                <LuDownload className="h-3.5 w-3.5" /> Export
              </span>
            </div>

            <div className="relative min-h-0 flex-1 overflow-hidden px-4 pt-5 font-serif text-[13.5px] leading-[1.75] text-ink sm:px-8 sm:text-[14.5px] lg:px-12">
              <p className="text-[19px] font-bold leading-tight sm:text-[22px]">2.1 Sleep and memory</p>

              {/* Paragraph 1, with a co-author's cursor drifting through it. */}
              <p className="relative mt-3 text-ink-2">
                Sleep actively supports the stabilisation of new memories <span className="whitespace-nowrap text-accent">(Walker &amp; Stickgold, 2004)</span>.
                <span className="wo-h-peer absolute left-[38%] top-[0.15em] inline-block">
                  <span className="block h-[1.25em] w-[2px] bg-[#3f7d58]" />
                  <span className="absolute -top-[1.35em] left-0 whitespace-nowrap rounded-[4px] rounded-bl-none bg-[#3f7d58] px-1 font-sans text-[9.5px] font-semibold leading-[1.5] text-white">Jamie</span>
                </span>
              </p>

              {/* Paragraph 2: the autocomplete scene. */}
              <p className="mt-3 text-ink-2">
                When sleep is restricted after learning, retention of declarative material declines
                <span className="wo-h-caret inline-block w-0 opacity-0"><span className="wo-h-blink inline-block h-[1.05em] w-[1.5px] translate-y-[0.18em] bg-brand" /></span>
                {SUGGESTION.map((word, i) => (
                  <span key={i} className="wo-h-ghost" style={nth(i)}> {word}</span>
                ))}{' '}
                <span className="wo-h-citeA whitespace-nowrap text-accent" style={nth(SUGGESTION.length)}>(Diekelmann &amp; Born, 2010)</span>
                <span className="wo-h-ghost" style={nth(SUGGESTION.length + 1)}>.</span>
                <span className="wo-h-tab ml-1.5 inline-flex translate-y-[-1px] items-center gap-1 rounded-[6px] bg-ink px-1.5 py-px align-middle font-sans text-[10.5px] font-semibold leading-[1.6] text-on-ink opacity-0">
                  <LuSparkles className="h-3 w-3" /> Tab
                </span>
              </p>

              {/* Paragraph 3: the claim check scene, then the @ cite scene typed at its end. Inserted
                  text grows from zero size (font-size), so nothing leaves a gap before it appears. */}
              <p className="relative mt-3 text-ink-2">
                <span className="wo-h-flag rounded bg-[linear-gradient(#fee2e2,#fee2e2)] [background-size:0%_100%]">Most adults need seven to nine hours of sleep each night</span>
                <span className="wo-h-citeC text-accent"> <span className="whitespace-nowrap">(Hirshkowitz et al., 2015)</span></span>.
                {TYPED.map((word, i) => (
                  <span key={i} className="wo-h-type" style={nth(i)}> {word}</span>
                ))}
                <span className="wo-h-at text-[0px] opacity-0"> <span className="rounded bg-brand-50 px-[0.15em] font-sans text-[0.9em] text-brand">@nap</span></span>
                <span className="wo-h-citeB text-accent"> <span className="whitespace-nowrap">(Mednick et al., 2003)</span><span className="text-ink-2">.</span></span>
                {/* The cite pop-up, under the line being typed. */}
                <span className="wo-h-pop absolute left-0 top-[calc(100%+6px)] z-10 block w-[250px] rounded-[12px] border border-line bg-surface p-1.5 font-sans opacity-0 shadow-[0_18px_40px_-20px_rgba(28,25,23,.55)] sm:left-auto sm:right-0 sm:w-[290px]">
                  <span className="flex items-center gap-1.5 px-2 py-1 text-[10.5px] font-semibold uppercase tracking-[.08em] text-subtle"><LuSearch className="h-3 w-3" /> Papers for “nap”</span>
                  <span className="wo-h-pick block rounded-[8px] px-2 py-1.5">
                    <span className="block truncate text-[12px] font-semibold leading-snug text-ink">Sleep-dependent learning: A nap is as good as a night</span>
                    <span className="block truncate text-[11px] leading-snug text-muted">Mednick, Nakayama, Stickgold · Nat Neurosci · 2003</span>
                  </span>
                  <span className="block rounded-[8px] px-2 py-1.5">
                    <span className="block truncate text-[12px] font-semibold leading-snug text-ink">The memory function of sleep</span>
                    <span className="block truncate text-[11px] leading-snug text-muted">Diekelmann, Born · Nat Rev Neurosci · 2010</span>
                  </span>
                </span>
              </p>

              {/* The reference list builds itself, in alphabetical order. */}
              <div className="mt-5 border-t border-line-2 pt-3">
                <p className="font-sans text-[10.5px] font-semibold uppercase tracking-[.1em] text-subtle">References</p>
                <ol className="mt-1.5 text-[12px] leading-[1.75] text-ink-2 sm:text-[12.5px]">
                  <Ref step="wo-h-refA">Diekelmann, S., &amp; Born, J. (2010). The memory function of sleep. <i>Nature Reviews Neuroscience</i>.</Ref>
                  <Ref step="wo-h-refC">Hirshkowitz, M., et al. (2015). National Sleep Foundation’s sleep time duration recommendations. <i>Sleep Health</i>.</Ref>
                  <Ref step="wo-h-refB">Mednick, S., Nakayama, K., &amp; Stickgold, R. (2003). Sleep-dependent learning: A nap is as good as a night. <i>Nature Neuroscience</i>.</Ref>
                  <Ref>Walker, M. P., &amp; Stickgold, R. (2004). Sleep-dependent learning and memory consolidation. <i>Neuron</i>.</Ref>
                </ol>
              </div>

              {/* Phones have no side panel: the claim check comment floats over the page. */}
              <Issue className="absolute inset-x-3 bottom-3 font-sans md:hidden" />

              {/* Export toast */}
              <div className="wo-h-toast absolute bottom-3 right-3 flex w-[250px] items-center gap-2.5 rounded-[12px] border border-line bg-surface p-2.5 font-sans opacity-0 shadow-[0_18px_40px_-20px_rgba(28,25,23,.55)] max-md:left-3 max-md:w-auto">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] bg-[#2b579a] text-[10px] font-bold text-white">DOCX</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-semibold text-ink">Thesis-chapter-2.docx</span>
                  <span className="block truncate text-[11px] text-muted">Downloaded · 4 references in APA 7</span>
                </span>
                <LuCircleCheck className="h-4 w-4 shrink-0 text-green-600" />
              </div>
            </div>
          </div>

          {/* Review panel */}
          <aside className="hidden min-w-0 flex-col border-l border-line-2 bg-soft md:flex">
            <div className="flex h-11 shrink-0 items-center gap-4 border-b border-line-2 px-4 text-[12px]">
              <span className="text-muted">Chat</span>
              <span className="relative font-semibold text-ink after:absolute after:inset-x-0 after:-bottom-[14px] after:h-0.5 after:bg-ink">Review</span>
              <span className="text-muted">Sources</span>
            </div>
            <div className="flex flex-col gap-3 p-4">
              <div className="grid">
                {/* Before the check runs */}
                <div className="wo-h-idle col-start-1 row-start-1 opacity-0">
                  <p className="text-[13px] font-semibold text-ink">Claim check</p>
                  <p className="mt-1 text-[12px] leading-snug text-muted">Reads each claim and looks for a source that supports it.</p>
                  <span className="wo-h-run mt-3 inline-flex h-8 items-center gap-1.5 rounded-[9px] bg-brand px-3 text-[12px] font-semibold text-on-brand"><LuShieldCheck className="h-3.5 w-3.5" /> Run Claim check</span>
                </div>
                {/* While it runs */}
                <div className="wo-h-scan col-start-1 row-start-1 opacity-0">
                  <p className="text-[13px] font-semibold text-ink">Checking 6 claims…</p>
                  <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-line"><span className="wo-h-bar block h-full origin-left rounded-full bg-brand" /></span>
                </div>
                {/* The result */}
                <div className="col-start-1 row-start-1 grid">
                  <Issue className="col-start-1 row-start-1" />
                  <div className="wo-h-resolved col-start-1 row-start-1 rounded-[12px] border border-green-200 bg-surface p-3">
                    <p className="flex items-center gap-1.5 text-[12px] font-semibold text-green-700"><LuCircleCheck className="h-3.5 w-3.5" /> Source added</p>
                    <p className="mt-1 text-[12px] leading-snug text-ink-2">Hirshkowitz et al. (2015), <i>Sleep Health</i>. Cited in APA 7.</p>
                  </div>
                </div>
              </div>
              <div className="wo-h-sq flex flex-col gap-1.5 border-t border-line-2 pt-3 text-[12px] text-ink-2">
                <p className="flex items-center gap-1.5"><LuCircleCheck className="h-3.5 w-3.5 text-green-600" /> 4 sources, none retracted</p>
                <p className="flex items-center gap-1.5"><LuCircleCheck className="h-3.5 w-3.5 text-green-600" /> Every DOI resolves</p>
                <p className="flex items-center gap-1.5"><LuCircleAlert className="h-3.5 w-3.5 text-amber-600" /> 1 long sentence to split</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

const SCENES = ['Write', 'Cite', 'Check', 'Export'];

/** The four steps under the demo; the one playing lights up. */
export function HeroDemoSteps() {
  return (
    <ol aria-hidden="true" className="wo-hero mx-auto mt-5 flex max-w-[520px] justify-center gap-1.5 sm:gap-2">
      {SCENES.map((scene, i) => (
        <li key={scene} className="wo-h-chip flex h-8 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-[12.5px] font-medium text-muted" style={nth(i)}>
          <span className="font-serif italic">{i + 1}</span> {scene}
        </li>
      ))}
    </ol>
  );
}
