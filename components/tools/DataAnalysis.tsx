'use client';

/** The quick data analysis tool: a CSV in, column summaries and one test at a time out. All in the browser. */
import { useMemo, useState } from 'react';
import { LuUpload } from 'react-icons/lu';
import { anova, chiSquare, describe, fixed, frequencies, pairedT, parseCsv, pearson, toColumns, welch, type Column, type TestResult } from '@/lib/stats';
import { btnPrimary, focusRing } from '@/components/marketing/styles';
import { CopyButton } from '@/components/marketing/CopyButton';

type TestId = 'pearson' | 'welch' | 'paired' | 'anova' | 'chi';

const TESTS: { id: TestId; name: string; needs: ['numeric' | 'categorical', 'numeric' | 'categorical']; labels: [string, string]; when: string }[] = [
  { id: 'pearson', name: 'Correlation (Pearson)', needs: ['numeric', 'numeric'], labels: ['Variable 1', 'Variable 2'], when: 'Are two numeric variables related?' },
  { id: 'welch', name: 'Independent t-test (Welch)', needs: ['numeric', 'categorical'], labels: ['Outcome', 'Group (two groups)'], when: 'Do two groups differ on a numeric outcome?' },
  { id: 'paired', name: 'Paired t-test', needs: ['numeric', 'numeric'], labels: ['Before / first measure', 'After / second measure'], when: 'Did the same cases change between two measures?' },
  { id: 'anova', name: 'One-way ANOVA', needs: ['numeric', 'categorical'], labels: ['Outcome', 'Group (two or more)'], when: 'Do three or more groups differ on a numeric outcome?' },
  { id: 'chi', name: 'Chi-square test', needs: ['categorical', 'categorical'], labels: ['Variable 1', 'Variable 2'], when: 'Are two categorical variables associated?' },
];

const SAMPLE = `group,score,hours,passed
tutoring,78,6,yes
tutoring,85,8,yes
tutoring,72,5,yes
tutoring,90,9,yes
tutoring,66,4,no
tutoring,81,7,yes
control,64,3,no
control,70,5,yes
control,58,2,no
control,75,6,yes
control,61,3,no
control,69,4,no`;

const select = `h-11 w-full rounded-xl border border-line bg-surface px-3 text-[15px] text-ink ${focusRing}`;

function Summary({ column }: { column: Column }) {
  if (column.kind === 'numeric') {
    const d = describe(column.values);
    if (!d) return <p className="text-muted">No values</p>;
    return <span>n = {d.n}{d.missing ? ` (${d.missing} missing)` : ''} · M = {fixed(d.mean)} · SD = {fixed(d.sd)} · Mdn = {fixed(d.median)} · range {fixed(d.min)}–{fixed(d.max)}</span>;
  }
  const f = frequencies(column.labels);
  return <span>{f.length} categories: {f.slice(0, 5).map((item) => `${item.value} (${item.count}, ${item.percent.toFixed(0)}%)`).join(', ')}{f.length > 5 ? ', …' : ''}</span>;
}

export function DataAnalysis() {
  const [raw, setRaw] = useState('');
  const [testId, setTestId] = useState<TestId>('welch');
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [result, setResult] = useState<TestResult | null>(null);

  const parsed = useMemo(() => (raw.trim() ? parseCsv(raw) : null), [raw]);
  const columns = useMemo(() => (parsed && parsed.header.length ? toColumns(parsed.header, parsed.rows) : []), [parsed]);
  const test = TESTS.find((item) => item.id === testId)!;
  const options = (kind: 'numeric' | 'categorical') => columns.filter((column) => column.kind === kind || (kind === 'categorical' && column.kind === 'numeric' && new Set(column.labels.filter(Boolean)).size <= 10));

  const load = async (file: File) => setRaw(await file.text());

  const run = () => {
    const first = columns.find((column) => column.name === a);
    const second = columns.find((column) => column.name === b);
    if (!first || !second || first === second) return;
    const names: [string, string] = [first.name, second.name];
    setResult(
      testId === 'pearson' ? pearson(first.values, second.values, names)
        : testId === 'paired' ? pairedT(first.values, second.values, names)
          : testId === 'welch' ? welch(first.values, second.labels, names)
            : testId === 'anova' ? anova(first.values, second.labels, names)
              : chiSquare(first.labels, second.labels, names),
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <label className={`${btnPrimary} h-11 cursor-pointer rounded-[10px] px-5 text-[15px]`}>
          <LuUpload className="h-4 w-4" aria-hidden="true" /> Upload a CSV
          <input type="file" accept=".csv,.tsv,.txt,text/csv" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void load(file); }} />
        </label>
        <button type="button" onClick={() => { setRaw(SAMPLE); setA('score'); setB('group'); setTestId('welch'); setResult(null); }} className={`rounded text-[14px] text-brand underline underline-offset-4 ${focusRing}`}>Try sample data</button>
        <span className="text-[13px] text-muted">Your data stays on this device.</span>
      </div>
      <label>
        <span className="mb-1.5 block text-[14px] font-medium text-ink">Or paste rows (first row: column names)</span>
        <textarea value={raw} onChange={(event) => { setRaw(event.target.value); setResult(null); }} rows={6} spellCheck={false} placeholder="group,score&#10;A,12&#10;B,15" className={`w-full rounded-xl border border-line bg-surface px-3.5 py-3 font-mono text-[13px] text-ink ${focusRing}`} />
      </label>

      {columns.length > 0 && (
        <>
          <section aria-labelledby="columns-title" className="rounded-2xl border border-line bg-surface">
            <h2 id="columns-title" className="border-b border-line-2 px-5 py-3 text-[15px] font-semibold text-ink">
              {parsed!.rows.length.toLocaleString('en-US')} rows, {columns.length} columns{parsed!.truncated ? ' (first 50,000 rows)' : ''}
            </h2>
            <ul className="divide-y divide-line-2 text-[14px]">
              {columns.map((column) => (
                <li key={column.name} className="grid gap-1 px-5 py-3 sm:grid-cols-[200px_90px_1fr]">
                  <span className="font-medium text-ink [overflow-wrap:anywhere]">{column.name}</span>
                  <span className="text-muted">{column.kind === 'numeric' ? 'Numeric' : 'Category'}</span>
                  <span className="text-ink-2"><Summary column={column} /></span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="test-title" className="rounded-2xl border border-line bg-surface px-5 py-5">
            <h2 id="test-title" className="text-[15px] font-semibold text-ink">Run a test</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <label>
                <span className="mb-1.5 block text-[14px] font-medium text-ink">Test</span>
                <select value={testId} onChange={(event) => { setTestId(event.target.value as TestId); setResult(null); }} className={select}>
                  {TESTS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              {[0, 1].map((slot) => (
                <label key={slot}>
                  <span className="mb-1.5 block text-[14px] font-medium text-ink">{test.labels[slot]}</span>
                  <select value={slot ? b : a} onChange={(event) => { (slot ? setB : setA)(event.target.value); setResult(null); }} className={select}>
                    <option value="">Choose a column</option>
                    {options(test.needs[slot]).map((column) => <option key={column.name} value={column.name}>{column.name}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <p className="mt-2 text-[13px] text-muted">{test.when}</p>
            <button type="button" onClick={run} disabled={!a || !b || a === b} className={`${btnPrimary} mt-4 h-11 rounded-[10px] px-5 text-[15px]`}>Run</button>

            {result && (
              <div aria-live="polite" className="mt-6">
                <h3 className="text-[16px] font-semibold text-ink">{result.title}</h3>
                {result.rows.length > 0 && (
                  <table className="mt-3 w-full max-w-[560px] border-collapse text-[14px]">
                    <tbody>
                      {result.rows.map(([label, value]) => (
                        <tr key={label} className="border-b border-line-2"><th scope="row" className="py-2 pr-4 text-left font-normal text-muted">{label}</th><td className="py-2 font-medium tabular-nums text-ink">{value}</td></tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {result.apa && (
                  <div className="mt-4 rounded-xl bg-soft px-4 py-3">
                    <div className="flex items-center justify-between gap-3"><p className="text-[12px] font-medium uppercase tracking-[.1em] text-subtle">APA write-up</p><CopyButton text={result.apa} /></div>
                    <p className="mt-1.5 font-serif text-[15.5px] leading-[1.6] text-ink">{result.apa}</p>
                  </div>
                )}
                {result.warnings.map((warning) => <p key={warning} className="mt-3 text-[13.5px] text-amber-800">{warning}</p>)}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
