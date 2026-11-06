/**
 * The "marked-up paper" layer of the public pages: a supervisor's pen (underline, circle, tick),
 * section marks, figure captions, and footnotes that cite the page's own claims.
 * All server-rendered; the pen strokes draw themselves via CSS (see "Marketing motion" in globals.css).
 */
import type { ReactNode } from 'react';

const pen = 'pointer-events-none absolute text-accent';

/** A hand-drawn underline under a short phrase. `when` decides whether it draws on load or on scroll. */
export function PenUnderline({ children, when = 'load' }: { children: ReactNode; when?: 'load' | 'view' }) {
  return (
    <span className="relative inline-block whitespace-nowrap">
      {children}
      <svg aria-hidden="true" viewBox="0 0 300 20" preserveAspectRatio="none" className={`wo-pen wo-pen-${when} ${pen} -bottom-[0.16em] left-[-2%] h-[0.32em] w-[104%]`}>
        <path pathLength={1} d="M3 13 C 60 6, 130 4, 200 7 S 280 11, 297 6" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      </svg>
    </span>
  );
}

/** A loose pen circle around one word. */
export function PenCircle({ children, when = 'view' }: { children: ReactNode; when?: 'load' | 'view' }) {
  return (
    <span className="relative mx-[0.18em] inline-block whitespace-nowrap">
      {children}
      <svg aria-hidden="true" viewBox="0 0 200 80" preserveAspectRatio="none" className={`wo-pen wo-pen-${when} ${pen} -left-[0.28em] -top-[0.12em] h-[calc(100%+0.24em)] w-[calc(100%+0.56em)]`}>
        <path pathLength={1} d="M120 6 C 60 2, 8 14, 6 40 C 4 66, 70 77, 120 74 C 170 71, 197 58, 194 36 C 191 14, 150 3, 96 8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </span>
  );
}

/** A handwritten tick, for lists. */
export function PenTick({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={`h-4 w-4 shrink-0 text-accent ${className}`}>
      <path d="M3.5 13.5 C 5.5 14.5, 7.5 16.5, 9 19.5 C 11.5 13, 15.5 7.5, 21 3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** "Fig. 1. …" under a product visual. */
export function FigCaption({ n, children, className = '' }: { n: number; children: ReactNode; className?: string }) {
  return (
    <p className={`mt-3 px-1 font-serif text-[13.5px] italic leading-snug text-muted ${className}`}>
      <span className="font-semibold not-italic text-ink-2">Fig. {n}.</span> {children}
    </p>
  );
}

/** The sources for the numbers on the public pages, in APA 7. Numbered in the order they are cited. */
export const PAGE_REFERENCES = [
  {
    id: 'openalex',
    text: (
      <>
        Priem, J., Piwowar, H., &amp; Orr, R. (2022). <i>OpenAlex: A fully-open index of scholarly works, authors, venues, institutions, and concepts</i>. arXiv.{' '}
        <a href="https://doi.org/10.48550/arXiv.2205.01833" className="break-all underline decoration-line-3 underline-offset-2 hover:text-brand">https://doi.org/10.48550/arXiv.2205.01833</a>
      </>
    ),
  },
  {
    id: 'csl',
    text: (
      <>
        Citation Style Language. (n.d.). <i>Official repository for Citation Style Language (CSL) citation styles</i> [Data set]. GitHub.{' '}
        <a href="https://github.com/citation-style-language/styles" className="break-all underline decoration-line-3 underline-offset-2 hover:text-brand">https://github.com/citation-style-language/styles</a>
      </>
    ),
  },
] as const;

export type ReferenceId = (typeof PAGE_REFERENCES)[number]['id'];

const refNumber = (id: ReferenceId) => PAGE_REFERENCES.findIndex((ref) => ref.id === id) + 1;

/** A superscript footnote mark that jumps to the reference list (and back). */
export function Footnote({ id }: { id: ReferenceId }) {
  const n = refNumber(id);
  return (
    <sup className="ml-0.5 font-sans text-[0.7em] font-semibold">
      <a id={`cite-${id}`} href={`#ref-${id}`} aria-label={`Source ${n}`} className="rounded px-0.5 text-accent no-underline hover:bg-accent-50">
        {n}
      </a>
    </sup>
  );
}

/** The reference list at the foot of a page that uses <Footnote>. */
export function PageReferences({ className = '' }: { className?: string }) {
  return (
    <section aria-labelledby="references-title" className={className}>
      <h2 id="references-title" className="border-t border-line pt-6 font-serif text-[17px] font-semibold text-ink">References</h2>
      <ol className="mt-3 flex flex-col gap-2.5">
        {PAGE_REFERENCES.map((ref, index) => (
          <li key={ref.id} id={`ref-${ref.id}`} className="flex scroll-mt-24 gap-3 font-serif text-[14px] leading-[1.6] text-ink-2 target:[&>span]:bg-accent-50">
            <span className="w-5 shrink-0 rounded text-right font-sans text-[12.5px] font-semibold leading-[1.9] text-accent">{index + 1}.</span>
            <span className="min-w-0 rounded pl-[2em] -indent-[2em] transition-colors">
              {ref.text}{' '}
              <a href={`#cite-${ref.id}`} aria-label="Back to the text" className="font-sans text-[12.5px] text-muted no-underline hover:text-brand">↩</a>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
