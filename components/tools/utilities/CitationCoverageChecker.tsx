'use client';

/**
 * Citation coverage checker (/tools/citation-coverage-checker): matches the in-text citations of
 * a paper to its reference list. It shows works cited but not listed, listed but never cited,
 * and year mismatches. It does not check whether a source supports a claim. Runs in the browser.
 */
import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { checkCoverage, splitPaper, type Citation, type CoverageReport } from '@/lib/citationCoverage';
import { btnPrimary, focusRing } from '@/components/marketing/styles';

const control = `w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-[15px] leading-[1.55] text-ink placeholder:text-subtle ${focusRing}`;
const tab = (active: boolean) => `inline-flex h-9 items-center rounded-lg px-3 text-[14px] ${focusRing} ${active ? 'bg-ink text-on-ink' : 'text-ink-2 hover:bg-soft'}`;
const MAX = 120000;

const MARK: Record<'matched' | 'missing' | 'year-mismatch', string> = {
  matched: 'bg-emerald-100 decoration-emerald-600',
  missing: 'bg-rose-100 decoration-rose-600',
  'year-mismatch': 'bg-amber-100 decoration-amber-600',
};
const LABEL = { matched: 'In the list', missing: 'Not in the list', 'year-mismatch': 'Year differs' };

const EXAMPLE_TEXT = `Sleep supports memory consolidation (Walker, 2017; Diekelmann & Born, 2010). Rasch and Born (2013) reviewed the evidence, and Stickgold et al. (2001, p. 1052) described the role of REM sleep. Sleep also changes with age (Mander et al., 2017).`;
const EXAMPLE_LIST = `Diekelmann, S., & Born, J. (2010). The memory function of sleep. Nature Reviews Neuroscience, 11(2), 114–126. https://doi.org/10.1038/nrn2762
Rasch, B., & Born, J. (2013). About sleep's role in memory. Physiological Reviews, 93(2), 681–766. https://doi.org/10.1152/physrev.00032.2012
Stickgold, R., Hobson, J. A., Fosse, R., & Fosse, M. (2002). Sleep, learning, and dreams: Off-line memory reprocessing. Science, 294(5544), 1052–1057.
Tononi, G., & Cirelli, C. (2014). Sleep and the price of plasticity. Neuron, 81(1), 12–34. https://doi.org/10.1016/j.neuron.2013.12.025
Walker, M. P. (2017). Why we sleep. Scribner.`;

function statusOf(citation: Citation): 'matched' | 'missing' | 'year-mismatch' {
  if (citation.status.includes('missing')) return 'missing';
  if (citation.status.includes('year-mismatch')) return 'year-mismatch';
  return 'matched';
}

function Highlighted({ text, report }: { text: string; report: CoverageReport }) {
  const parts: ReactNode[] = [];
  let last = 0;
  report.citations.forEach((citation, index) => {
    if (citation.start > last) parts.push(text.slice(last, citation.start));
    const status = statusOf(citation);
    parts.push(
      <mark key={index} title={LABEL[status]} className={`rounded px-0.5 text-ink underline decoration-2 underline-offset-2 ${MARK[status]}`}>
        {text.slice(citation.start, citation.end)}
        <span className="sr-only"> ({LABEL[status]})</span>
      </mark>,
    );
    last = citation.end;
  });
  parts.push(text.slice(last));
  return <>{parts}</>;
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3">
      <p className="text-[24px] font-semibold text-ink">{value}</p>
      <p className="text-[13px] leading-snug text-muted">{label}</p>
    </div>
  );
}

export function CitationCoverageChecker() {
  const [mode, setMode] = useState<'two' | 'one'>('two');
  const [text, setText] = useState('');
  const [list, setList] = useState('');
  const [submitted, setSubmitted] = useState<{ text: string; list: string; heading: string | null; mode: 'two' | 'one' } | null>(null);

  const report = useMemo(() => (submitted ? checkCoverage(submitted.text, submitted.list) : null), [submitted]);

  const run = () => {
    if (mode === 'one') {
      const split = splitPaper(text);
      setSubmitted({ text: split.text, list: split.references, heading: split.heading, mode });
    } else {
      setSubmitted({ text, list, heading: null, mode });
    }
  };

  const noHeading = submitted?.mode === 'one' && !submitted.heading;
  const problems = report ? report.missing.length + report.yearMismatches.length + report.uncited.length : 0;

  return (
    <div className="flex flex-col gap-6">
      <div role="group" aria-label="How to paste" className="flex flex-wrap gap-1.5">
        <button type="button" aria-pressed={mode === 'two'} onClick={() => setMode('two')} className={tab(mode === 'two')}>Text and list separately</button>
        <button type="button" aria-pressed={mode === 'one'} onClick={() => setMode('one')} className={tab(mode === 'one')}>Whole paper in one box</button>
      </div>

      <div className={mode === 'two' ? 'grid gap-4 md:grid-cols-2' : 'flex flex-col gap-4'}>
        <label>
          <span className="mb-1.5 block text-[14px] font-medium text-ink">{mode === 'two' ? 'Your text' : 'Your paper, with the reference list at the end'}</span>
          <textarea value={text} onChange={(event) => setText(event.target.value.slice(0, MAX))} rows={mode === 'two' ? 10 : 14} placeholder={mode === 'two' ? 'Paste the body of the paper.' : 'Paste the paper. The list is read from after a "References", "Works Cited" or "Bibliography" heading.'} className={control} />
        </label>
        {mode === 'two' && (
          <label>
            <span className="mb-1.5 block text-[14px] font-medium text-ink">Your reference list</span>
            <textarea value={list} onChange={(event) => setList(event.target.value.slice(0, MAX))} rows={10} placeholder="Paste the reference list, one entry per line or separated by blank lines." className={control} />
          </label>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={run} disabled={!text.trim()} className={`${btnPrimary} h-11 px-5 text-[15px]`}>Check citations</button>
        <button type="button" onClick={() => { setMode('two'); setText(EXAMPLE_TEXT); setList(EXAMPLE_LIST); setSubmitted(null); }} className={`rounded text-[14px] text-muted underline underline-offset-2 hover:text-ink ${focusRing}`}>Try an example</button>
      </div>

      <div aria-live="polite" className="flex flex-col gap-6">
        {noHeading && (
          <p className="rounded-xl border border-amber/40 bg-amber-50 px-4 py-3 text-[14px] text-ink-2">No “References”, “Works Cited” or “Bibliography” heading was found, so there is no list to compare. Put the heading on its own line, or paste the list separately.</p>
        )}
        {report && !noHeading && (
          <>
            <p className="text-[15px] text-ink-2">
              {report.counts.citations === 0
                ? 'No citations were found in the text. The checker reads author-date citations such as (Smith, 2020) or Smith (2020) and numbers in square brackets such as [1].'
                : problems === 0
                  ? `All ${report.counts.citations} citations match the list, and every entry in the list is cited.`
                  : `${report.counts.citations} citation${report.counts.citations === 1 ? '' : 's'} checked against ${report.counts.references} list entr${report.counts.references === 1 ? 'y' : 'ies'}. ${problems} thing${problems === 1 ? '' : 's'} to fix.`}
            </p>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat value={report.counts.citations} label={`citations (${report.counts.authorDate} author-date, ${report.counts.numeric} numbered)`} />
              <Stat value={report.missing.length} label="cited but not in the list" />
              <Stat value={report.uncited.length} label="in the list but never cited" />
              <Stat value={report.yearMismatches.length} label="year mismatches" />
            </div>

            {report.missing.length > 0 && (
              <section aria-labelledby="missing-title">
                <h3 id="missing-title" className="text-[16px] font-semibold text-ink">Cited but not in the list</h3>
                <ul className="mt-2 flex flex-col gap-1.5 text-[14.5px] text-ink-2">
                  {report.missing.map((item) => <li key={item.label} className="rounded-lg border border-line px-3 py-2">{item.label}{item.count > 1 ? ` (cited ${item.count} times)` : ''}</li>)}
                </ul>
              </section>
            )}

            {report.yearMismatches.length > 0 && (
              <section aria-labelledby="years-title">
                <h3 id="years-title" className="text-[16px] font-semibold text-ink">Year mismatches</h3>
                <ul className="mt-2 flex flex-col gap-1.5 text-[14.5px] text-ink-2">
                  {report.yearMismatches.map((item) => <li key={item.label} className="rounded-lg border border-line px-3 py-2">Cited as {item.label}; the list has {item.listed.join(', ')}{item.count > 1 ? ` (cited ${item.count} times)` : ''}</li>)}
                </ul>
              </section>
            )}

            {report.uncited.length > 0 && (
              <section aria-labelledby="uncited-title">
                <h3 id="uncited-title" className="text-[16px] font-semibold text-ink">In the list but never cited</h3>
                <ul className="mt-2 flex flex-col gap-1.5 text-[14.5px] text-ink-2">
                  {report.uncited.map((index) => <li key={index} className="rounded-lg border border-line px-3 py-2 [overflow-wrap:anywhere]">{report.references[index].number !== null ? `[${report.references[index].number}] ` : ''}{report.references[index].text}</li>)}
                </ul>
              </section>
            )}

            {report.counts.citations > 0 && submitted && (
              <section aria-labelledby="text-title">
                <h3 id="text-title" className="text-[16px] font-semibold text-ink">Citations in your text</h3>
                <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted" aria-label="Key">
                  {(Object.keys(MARK) as (keyof typeof MARK)[]).map((key) => <li key={key} className="flex items-center gap-1.5"><span className={`inline-block h-3 w-5 rounded ${MARK[key]}`} aria-hidden="true" />{LABEL[key]}</li>)}
                </ul>
                <div className="mt-3 max-h-[480px] overflow-y-auto rounded-2xl border border-line bg-surface px-5 py-4 font-serif text-[15.5px] leading-[1.75] whitespace-pre-wrap text-ink-2 [overflow-wrap:anywhere]">
                  <Highlighted text={submitted.text} report={report} />
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <p className="text-[13px] leading-[1.5] text-muted">
        This checks that your citations and your list match. It does not read the sources or check what they say. To check whether cited studies support your claims, use the <Link href="/features/citation-checker" className="underline hover:text-ink">citation checker in the editor</Link>.
      </p>
    </div>
  );
}
