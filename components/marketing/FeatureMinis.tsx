/**
 * Small looping illustrations for the feature cards on the home page, one per feature.
 * HTML/CSS only: they reuse the demo keyframes in globals.css ("Marketing motion": wo-step-*,
 * wo-ac-*, wo-press, wo-sweep) plus wo-third (a three-way rotation) and wo-roam-* (cursors).
 * Each stage starts at a different point of its loop (--wo-shift) so the cards don't move in step.
 * The markup's own classes are the still picture shown with reduced motion.
 * Every paper and citation shown is real.
 */
import type { CSSProperties, ReactNode } from 'react';
import { LuArrowRight, LuCircleCheck, LuFileText, LuSparkles } from 'react-icons/lu';

const vars = (v: Record<string, string | number>) => v as CSSProperties;

function Stage({ shift, cycle, className = '', children }: { shift: number; cycle?: number; className?: string; children: ReactNode }) {
  return (
    <div
      aria-hidden="true"
      className={`wo-demo relative flex min-h-[164px] flex-col justify-center overflow-hidden rounded-[14px] bg-panel p-4 ring-1 ring-line-2 ${className}`}
      style={vars({ '--wo-shift': `${-shift}s`, ...(cycle ? { '--wo-cycle': `${cycle}s` } : {}) })}
    >
      {children}
    </div>
  );
}

/* 1. Autocomplete: the sentence finishes itself, with a citation; Tab accepts it. */
const GHOST = 'and slows the transfer of memories to the cortex'.split(' ');
function AutocompleteMini({ className }: { className?: string }) {
  return (
    <Stage shift={0} className={className}>
      <div className="rounded-[10px] bg-surface p-3.5 shadow-[0_1px_2px_rgb(28_25_23/.05)] ring-1 ring-line">
        <p className="font-serif text-[14px] leading-[1.65] text-ink-2">
          Restricted sleep reduces recall of declarative material
          <span className="wo-caret -mr-[1.5px] inline-block h-[1.05em] w-[1.5px] translate-y-[0.18em] bg-brand" />
          {GHOST.map((word, i) => (
            <span key={i} className="wo-ac-word text-subtle" style={vars({ '--i': i })}> {word}</span>
          ))}{' '}
          <span className="wo-ac-cite whitespace-nowrap text-accent-300" style={vars({ '--i': GHOST.length })}>(Diekelmann &amp; Born, 2010)</span>
          <span className="wo-ac-word text-subtle" style={vars({ '--i': GHOST.length + 1 })}>.</span>
        </p>
      </div>
      <span className="wo-press mt-3 inline-flex self-start h-7 items-center gap-1.5 rounded-[8px] bg-ink px-2.5 text-[11.5px] font-semibold text-on-ink">
        <LuSparkles className="h-3 w-3" /> Accept <kbd className="rounded bg-white/15 px-1 font-sans text-[10.5px]">Tab</kbd>
      </span>
    </Stage>
  );
}

/* 2. Citation generator: the same source in APA, MLA and Chicago; switching style rewrites both. */
const STYLES: { name: string; inText: string; ref: ReactNode }[] = [
  {
    name: 'APA 7',
    inText: '(Diekelmann & Born, 2010)',
    ref: <>Diekelmann, S., &amp; Born, J. (2010). The memory function of sleep. <i>Nature Reviews Neuroscience, 11</i>(2), 114–126.</>,
  },
  {
    name: 'MLA 9',
    inText: '(Diekelmann and Born 114)',
    ref: <>Diekelmann, Susanne, and Jan Born. “The Memory Function of Sleep.” <i>Nature Reviews Neuroscience</i>, vol. 11, no. 2, 2010, pp. 114–26.</>,
  },
  {
    name: 'Chicago',
    inText: '(Diekelmann and Born 2010, 114)',
    ref: <>Diekelmann, Susanne, and Jan Born. 2010. “The Memory Function of Sleep.” <i>Nature Reviews Neuroscience</i> 11 (2): 114–26.</>,
  },
];
function CitationMini({ className }: { className?: string }) {
  return (
    <Stage shift={1.5} cycle={9} className={className}>
      <div className="flex gap-1.5">
        {STYLES.map((style, n) => (
          <span key={style.name} className={`wo-third-chip rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium ${n ? 'border-line bg-surface text-ink-2' : 'border-brand-100 bg-brand-50 text-brand-600'}`} style={vars({ '--n': n })}>{style.name}</span>
        ))}
      </div>
      <p className="mt-3 font-serif text-[13.5px] leading-snug text-ink-2">
        Sleep strengthens new memories{' '}
        <span className="inline-grid align-top">
          {STYLES.map((style, n) => (
            <span key={style.name} className={`wo-third col-start-1 row-start-1 whitespace-nowrap text-accent ${n ? 'opacity-0' : ''}`} style={vars({ '--n': n })}>{style.inText}.</span>
          ))}
        </span>
      </p>
      <div className="mt-2.5 grid border-t border-line pt-2.5">
        {STYLES.map((style, n) => (
          <p key={style.name} className={`wo-third col-start-1 row-start-1 pl-[1.4em] -indent-[1.4em] font-serif text-[12px] leading-[1.5] text-ink-2 ${n ? 'opacity-0' : ''}`} style={vars({ '--n': n })}>{style.ref}</p>
        ))}
      </div>
    </Stage>
  );
}

/* 3. Research assistant: ask your PDF, get an answer that points to the page. */
function ChatMini({ className }: { className?: string }) {
  return (
    <Stage shift={3} className={`!flex-row items-center gap-3 ${className}`}>
      {/* The PDF, with the passage the answer came from */}
      <div className="relative w-[74px] shrink-0 rounded-[6px] bg-surface p-2 shadow-[0_6px_16px_-10px_rgb(28_25_23/.5)] ring-1 ring-line">
        <span className="block h-1.5 w-3/4 rounded-full bg-ink/70" />
        {[100, 92, 96, 84, 100, 70, 94, 88, 60].map((w, i) => (
          <span key={i} className="mt-[5px] block h-1 rounded-full bg-line-3" style={{ width: `${w}%` }} />
        ))}
        <span className="wo-step-4 absolute inset-x-1.5 top-[46px] h-[15px] rounded-[3px] bg-amber-300/45 ring-1 ring-amber-400/60" />
        <span className="absolute bottom-1.5 right-2 font-sans text-[9px] font-semibold text-muted">p. 4</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="wo-step-1 self-end rounded-[12px] rounded-br-[4px] bg-brand px-2.5 py-1.5 text-[11.5px] leading-snug text-on-brand">How does sleep help memory?</p>
        <p className="wo-step-2 text-[12px] leading-snug text-ink-2">
          Slow-wave sleep replays new hippocampal memories
          <sup className="ml-0.5 rounded bg-brand-50 px-1 text-[9.5px] font-bold text-brand-600">1</sup>.
        </p>
        <span className="wo-step-3 flex items-center gap-1.5 rounded-[8px] border border-line bg-surface px-2 py-1 text-[11px]">
          <LuFileText className="h-3.5 w-3.5 shrink-0 text-subtle" />
          <span className="min-w-0 flex-1 truncate font-medium text-ink">Rasch &amp; Born (2013)</span>
          <span className="shrink-0 text-muted">p. 4</span>
        </span>
      </div>
    </Stage>
  );
}

/* 4. Claim check: an unsupported claim is flagged, then a source is suggested. */
function ReviewMini({ className }: { className?: string }) {
  return (
    <Stage shift={4.5} className={className}>
      <p className="font-serif text-[13.5px] leading-[1.65] text-ink-2">
        <span className="wo-sweep rounded bg-[linear-gradient(#fee2e2,#fee2e2)]">Most students sleep less than six hours before exams</span>, which lowers their grades.
      </p>
      <div className="wo-step-3 mt-2.5 rounded-[10px] border border-line bg-surface p-2.5">
        <p className="flex items-center gap-1.5 text-[11px]">
          <span className="rounded-md bg-red-50 px-1.5 py-0.5 font-bold text-red-700">Major</span>
          <span className="text-ink-2">No source supports this claim.</span>
        </p>
        <p className="wo-step-5 mt-1.5 flex items-center gap-1.5 text-[11px] text-ink-2">
          <LuCircleCheck className="h-3.5 w-3.5 shrink-0 text-green-600" />
          <span className="truncate">Suggested: <span className="text-accent">Hershner &amp; Chervin (2014)</span></span>
        </p>
      </div>
    </Stage>
  );
}

/* 5. Word, PDF and LaTeX: your template goes in, three formats come out. */
const OUT = [
  { ext: 'DOCX', color: 'bg-[#2b579a]', step: 'wo-step-2' },
  { ext: 'PDF', color: 'bg-[#dc2626]', step: 'wo-step-3' },
  { ext: 'TEX', color: 'bg-[#0f766e]', step: 'wo-step-4' },
];
function ExportMini({ className }: { className?: string }) {
  return (
    <Stage shift={6} className={className}>
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="wo-step-1 flex w-[84px] shrink-0 flex-col items-center sm:w-[108px] rounded-[10px] border border-dashed border-line-3 bg-surface px-2 py-3 text-center">
          <span className="grid h-8 w-8 place-items-center rounded-[7px] bg-[#2b579a] text-[9px] font-bold text-white">DOCX</span>
          <span className="mt-1.5 text-[10.5px] font-semibold leading-tight text-ink">University template</span>
        </div>
        <LuArrowRight className="wo-step-2 h-4 w-4 shrink-0 text-subtle" />
        <ul className="flex min-w-0 flex-1 flex-col gap-1.5">
          {OUT.map((file) => (
            <li key={file.ext} className={`${file.step} flex items-center gap-2 rounded-[8px] border border-line bg-surface px-2 py-1.5`}>
              <span className={`grid h-6 w-8 shrink-0 place-items-center rounded-[5px] text-[8.5px] font-bold text-white ${file.color}`}>{file.ext}</span>
              <span className="min-w-0 flex-1 truncate text-[11.5px] font-medium text-ink">Thesis.{file.ext.toLowerCase()}</span>
              <LuCircleCheck className="hidden h-3.5 w-3.5 shrink-0 text-green-600 min-[380px]:block" />
            </li>
          ))}
        </ul>
      </div>
      <p className="wo-step-5 mt-2.5 text-center text-[11px] text-muted">Styles, headings and references kept</p>
    </Stage>
  );
}

/* 6. Write together: two people in the same draft, and a comment. */
function Cursor({ name, color, roam, className }: { name: string; color: string; roam: string; className: string }) {
  return (
    <span className={`${roam} absolute ${className}`}>
      <span className="block h-[14px] w-[2px]" style={{ background: color }} />
      <span className="absolute -top-[13px] left-0 whitespace-nowrap rounded-[3px] rounded-bl-none px-1 text-[9px] font-semibold leading-[13px] text-white" style={{ background: color }}>{name}</span>
    </span>
  );
}
function TogetherMini({ className }: { className?: string }) {
  return (
    <Stage shift={7.5} className={className}>
      <div className="relative rounded-[10px] bg-surface p-3 pt-3.5 ring-1 ring-line">
        <span className="block h-2 w-1/2 rounded-full bg-ink/70" />
        {[96, 88, 100, 72, 92].map((w, i) => (
          <span key={i} className={`mt-[9px] block h-1.5 rounded-full ${i === 2 ? 'bg-accent-100' : 'bg-line-3'}`} style={{ width: `${w}%` }} />
        ))}
        <Cursor name="Jamie" color="#3f7d58" roam="wo-roam-a" className="left-[38%] top-[26px]" />
        <Cursor name="You" color="var(--color-brand)" roam="wo-roam-b" className="left-[70%] top-[58px]" />
      </div>
      <div className="wo-step-3 absolute bottom-3 right-3 flex max-w-[78%] items-start gap-1.5 rounded-[10px] border border-line bg-surface p-2 shadow-[0_10px_24px_-14px_rgb(28_25_23/.5)]">
        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#3f7d58] text-[8.5px] font-bold text-white">JM</span>
        <span className="text-[11px] leading-snug text-ink-2">Can we cite the 2013 review here?</span>
      </div>
    </Stage>
  );
}

const MINIS: Record<string, (props: { className?: string }) => ReactNode> = {
  autocomplete: AutocompleteMini,
  'find-papers': CitationMini,
  chat: ChatMini,
  review: ReviewMini,
  export: ExportMini,
  phone: TogetherMini,
};

/** The illustration for a feature card (FEATURES[].id), or nothing for an unknown id. */
export function FeatureMini({ id, className }: { id: string; className?: string }) {
  const Mini = MINIS[id];
  return Mini ? <Mini className={className} /> : null;
}
