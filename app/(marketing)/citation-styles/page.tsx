import Link from 'next/link';
import { pageMetadata } from '@/components/marketing/seo';
import { btnPrimary, container } from '@/components/marketing/styles';

export const metadata = pageMetadata({
  title: 'Free citation generator: APA, MLA, Chicago, AMA',
  path: '/citation-styles',
  description:
    'Free citation generator for APA 7, MLA 9, Chicago, Harvard, AMA, ACS, Bluebook and 10,000+ styles. Find the source, cite it, and your reference list is done.',
});

const STYLES: { name: string; kind: string; inText: string; field: string }[] = [
  { name: 'APA 7th', kind: 'Author–date', inText: '(Walker & Stickgold, 2005)', field: 'Psychology, education, social sciences' },
  { name: 'APA 6th', kind: 'Author–date', inText: '(Walker & Stickgold, 2005)', field: 'Courses that still ask for APA 6' },
  { name: 'MLA 9th', kind: 'Author–page', inText: '(Walker and Stickgold)', field: 'Literature, languages, humanities' },
  { name: 'Chicago (Author-Date)', kind: 'Author–date', inText: '(Walker and Stickgold 2005)', field: 'Sciences and social sciences' },
  { name: 'Chicago (Notes)', kind: 'Notes', inText: 'Footnote', field: 'History, arts, humanities' },
  { name: 'Turabian', kind: 'Notes', inText: 'Footnote', field: 'Student papers in the humanities' },
  { name: 'Harvard', kind: 'Author–date', inText: '(Walker and Stickgold, 2005)', field: 'Many UK and Australian universities' },
  { name: 'IEEE', kind: 'Numbered', inText: '[1]', field: 'Engineering, computer science' },
  { name: 'Vancouver', kind: 'Numbered', inText: '(1)', field: 'Medicine, health sciences' },
  { name: 'AMA', kind: 'Numbered', inText: 'Superscript ¹', field: 'Medicine, nursing, public health' },
  { name: 'ACS', kind: 'Numbered', inText: 'Superscript ¹', field: 'Chemistry' },
  { name: 'Nature', kind: 'Numbered', inText: 'Superscript ¹', field: 'Natural sciences' },
  { name: 'Science', kind: 'Numbered', inText: '(1)', field: 'Natural sciences' },
  { name: 'Bluebook', kind: 'Notes', inText: 'Footnote', field: 'Law (US)' },
  { name: 'OSCOLA', kind: 'Notes', inText: 'Footnote', field: 'Law (UK)' },
];

const STEPS: [string, string][] = [
  ['Find the source', 'Type @ in your document, or open Find papers and search 250M+ scholarly works. You can also add a source by hand.'],
  ['Cite it', 'Click Cite. WriteOrbit adds the in-text citation in your style and adds the source to your reference list or works cited page.'],
  ['Change the style any time', 'Pick another style in the status bar. Every citation and the whole reference list update at once.'],
];

export default function CitationStylesPage() {
  return (
    <div className={container}>
      <div className="pb-6 pt-10 md:pt-[46px]">
        <h1 className="text-[34px] font-bold tracking-[-0.03em] text-ink sm:text-[42px]">Citation generator for every style</h1>
        <p className="mt-2 max-w-[680px] text-[17px] text-ink-2">
          Cite in APA, MLA, Chicago, Harvard, AMA, ACS and over 10,000 other styles, right in your document. Choose a style in the editor&apos;s status bar and every citation and the reference list update. Search the style menu for journal and university versions, such as BMJ, The Lancet, PLOS, ACM, Springer and Elsevier.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[640px] border-collapse text-left text-[15px]">
          <caption className="sr-only">Common citation styles, how they cite in the text and where they are used</caption>
          <thead>
            <tr className="bg-soft text-[13px] text-muted">
              <th scope="col" className="px-5 py-3 font-semibold">Style</th>
              <th scope="col" className="px-5 py-3 font-semibold">Type</th>
              <th scope="col" className="px-5 py-3 font-semibold">In the text</th>
              <th scope="col" className="px-5 py-3 font-semibold">Common in</th>
            </tr>
          </thead>
          <tbody>
            {STYLES.map((style) => (
              <tr key={style.name} className="border-t border-line-2">
                <th scope="row" className="px-5 py-3 font-semibold text-ink">{style.name}</th>
                <td className="px-5 py-3 text-ink-2">{style.kind}</td>
                <td className="px-5 py-3 font-serif text-ink-2">{style.inText}</td>
                <td className="px-5 py-3 text-ink-2">{style.field}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section aria-labelledby="how-to-cite" className="pb-20 pt-14">
        <h2 id="how-to-cite" className="text-[26px] font-bold tracking-[-0.02em] text-ink md:text-[30px]">How to cite in WriteOrbit</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {STEPS.map(([title, text], index) => (
            <li key={title} className="rounded-2xl border border-line bg-surface p-5">
              <p className="text-[13px] font-semibold text-subtle">Step {index + 1}</p>
              <h3 className="mt-1 text-[17px] font-semibold text-ink">{title}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 max-w-[680px] text-[15px] text-muted">
          Every source comes from a scholarly database, so the details are real and each citation opens the paper. The citation generator is included on the free plan.
        </p>
        <Link href="/signup" className={`${btnPrimary} mt-6 h-11 rounded-[10px] px-5 text-[15px]`}>Start citing free</Link>
      </section>
    </div>
  );
}
