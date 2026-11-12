'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { LuDownload, LuFilePen, LuLoaderCircle, LuSave, LuSparkles, LuUpload, LuX } from 'react-icons/lu';
import { AppFrame } from '@/components/app/AppFrame';
import { Button, Card } from '@/components/app/ui';
import { useSignedIn } from '@/components/app/useSignedIn';
import { api } from '@/lib/session';
import { CitedMarkdown, CreditCost, creditsChanged, showError } from '@/components/app/research/parts';
import type { TaskRecord } from '@/components/app/research/handoff';
import { openInEditor } from '@/components/tools/editorHandoff';
import { markdownToHtml } from '@/components/tools/toolOutput';
import {
  anova, chiSquare, describe, fixed, frequencies, pairedT, parseCsv, pearson, toColumns, welch, type Column, type TestResult,
} from '@/lib/stats';
import { BoxPlot, Columns, Scatter, bins } from '@/components/app/analysis/charts';
import {
  chooseTest, download, linearRegression, mannWhitney, powerT, sampleSizeProportions, sampleSizeT, toCsv, type ChooserAnswers, type PowerDesign,
} from '@/components/app/analysis/stats';

type Tab = 'data' | 'describe' | 'tests' | 'chooser' | 'power' | 'report';
type TestId = 'pearson' | 'regression' | 'welch' | 'mann' | 'paired' | 'anova' | 'chi';

const TESTS: { id: TestId; name: string; needs: ['numeric' | 'categorical', 'numeric' | 'categorical']; labels: [string, string] }[] = [
  { id: 'welch', name: 'Independent t-test (Welch)', needs: ['numeric', 'categorical'], labels: ['Outcome', 'Group (two groups)'] },
  { id: 'mann', name: 'Mann-Whitney U', needs: ['numeric', 'categorical'], labels: ['Outcome', 'Group (two groups)'] },
  { id: 'paired', name: 'Paired t-test', needs: ['numeric', 'numeric'], labels: ['First measure', 'Second measure'] },
  { id: 'anova', name: 'One-way ANOVA', needs: ['numeric', 'categorical'], labels: ['Outcome', 'Group'] },
  { id: 'pearson', name: 'Correlation (Pearson)', needs: ['numeric', 'numeric'], labels: ['Variable 1', 'Variable 2'] },
  { id: 'regression', name: 'Linear regression', needs: ['numeric', 'numeric'], labels: ['Predictor (x)', 'Outcome (y)'] },
  { id: 'chi', name: 'Chi-square', needs: ['categorical', 'categorical'], labels: ['Variable 1', 'Variable 2'] },
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

const select = 'h-10 w-full rounded-[10px] border border-line bg-surface px-3 text-[14.5px] text-ink';

function summaryOf(column: Column): string {
  if (column.kind === 'numeric') {
    const d = describe(column.values);
    return d ? `n = ${d.n}${d.missing ? ` (${d.missing} missing)` : ''}, M = ${fixed(d.mean)}, SD = ${fixed(d.sd)}, Mdn = ${fixed(d.median)}, range ${fixed(d.min)}–${fixed(d.max)}` : 'no values';
  }
  const top = frequencies(column.labels).slice(0, 5);
  return top.map((item) => `${item.value} ${item.count} (${fixed(item.percent, 1)}%)`).join(', ');
}

function ResultCard({ result, onRemove }: { result: TestResult; onRemove?: () => void }) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-2">
        <h3 className="flex-1 text-[15px] font-bold">{result.title}</h3>
        {onRemove && <button type="button" aria-label="Remove result" onClick={onRemove} className="grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-soft"><LuX className="h-4 w-4" /></button>}
      </div>
      {result.rows.length > 0 && (
        <table className="mt-2 w-full text-[14px]">
          <tbody>{result.rows.map(([label, value]) => <tr key={label} className="border-t border-line-2"><td className="py-1.5 pr-3 text-ink-2">{label}</td><td className="py-1.5 text-right tabular-nums">{value}</td></tr>)}</tbody>
        </table>
      )}
      {result.apa && <p className="mt-3 rounded-lg bg-soft px-3 py-2 text-[14px] leading-relaxed">{result.apa}</p>}
      {result.warnings.map((warning) => <p key={warning} className="mt-2 text-[13px] text-amber-800">{warning}</p>)}
    </Card>
  );
}

function Chooser() {
  const [answers, setAnswers] = useState<ChooserAnswers>({ goal: 'compare', outcome: 'numeric', groups: 'two', paired: false, normal: 'unsure' });
  const result = chooseTest(answers);
  const field = <K extends keyof ChooserAnswers>(key: K, label: string, options: [ChooserAnswers[K], string][]) => (
    <label className="block">
      <span className="mb-1 block text-[13px] font-semibold text-ink-2">{label}</span>
      <select value={String(answers[key])} onChange={(event) => setAnswers({ ...answers, [key]: (options.find(([value]) => String(value) === event.target.value)?.[0]) as ChooserAnswers[K] })} className={select}>
        {options.map(([value, text]) => <option key={String(value)} value={String(value)}>{text}</option>)}
      </select>
    </label>
  );
  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div className="space-y-3">
        {field('goal', 'What do you want to do?', [['compare', 'Compare groups or times'], ['relate', 'See if two variables are related'], ['predict', 'Predict an outcome'], ['describe', 'Describe the data']])}
        {field('outcome', 'What kind of outcome?', [['numeric', 'Numbers (scores, times, amounts)'], ['ordinal', 'Ranks or ratings (e.g. Likert)'], ['categorical', 'Categories (yes/no, groups)']])}
        {answers.goal === 'compare' && field('groups', 'How many groups or times?', [['two', 'Two'], ['three-plus', 'Three or more']])}
        {answers.goal === 'compare' && field('paired', 'Same people measured more than once?', [[false, 'No: different people in each group'], [true, 'Yes: the same people (before and after, repeated)']])}
        {answers.outcome === 'numeric' && answers.goal !== 'describe' && field('normal', 'Is the outcome roughly normal?', [['unsure', 'Not sure (check the histogram)'], ['yes', 'Yes, or 30+ per group'], ['no', 'No: skewed or with outliers']])}
      </div>
      <Card className="p-5">
        <p className="text-[13px] font-semibold text-muted">Recommended</p>
        <p className="mt-1 text-[22px] font-bold text-ink">{result.test}</p>
        <p className="mt-2 text-[14.5px] text-ink-2">{result.why}</p>
        {result.assumptions.length > 0 && (<><p className="mt-4 text-[13.5px] font-semibold">Check first</p><ul className="mt-1 list-disc pl-5 text-[14px] text-ink-2">{result.assumptions.map((item) => <li key={item}>{item}</li>)}</ul></>)}
        <p className="mt-4 text-[13.5px] font-semibold">How to report it (APA)</p>
        <p className="mt-1 rounded-lg bg-soft px-3 py-2 text-[14px]">{result.report}</p>
        {result.alternative && <p className="mt-3 text-[14px] text-ink-2"><span className="font-semibold">If not:</span> {result.alternative}</p>}
        <p className="mt-3 text-[13px] text-muted">{result.inDataLab ? `Run it here under Tests: ${result.inDataLab}.` : 'Not in Data Lab yet: use a statistics package (SPSS, R, jamovi, JASP) for this one.'}</p>
      </Card>
    </div>
  );
}

function Power() {
  const [kind, setKind] = useState<'t' | 'prop'>('t');
  const [d, setD] = useState('0.5');
  const [design, setDesign] = useState<PowerDesign>('two-sample');
  const [alpha, setAlpha] = useState('0.05');
  const [power, setPower] = useState('0.8');
  const [p1, setP1] = useState('0.5');
  const [p2, setP2] = useState('0.6');
  const [n, setN] = useState('');
  const a = Number(alpha); const pw = Number(power);
  const needed = kind === 't' ? sampleSizeT(Number(d), a, pw, design) : sampleSizeProportions(Number(p1), Number(p2), a, pw);
  const achieved = kind === 't' && n ? powerT(Number(d), Number(n), a, design) : NaN;
  const unit = kind === 't' ? (design === 'two-sample' ? 'per group' : design === 'paired' ? 'pairs' : 'cases') : 'per group';
  const input = 'h-10 w-full rounded-[10px] border border-line px-3 text-[14.5px]';
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="space-y-3">
        <label className="block"><span className="mb-1 block text-[13px] font-semibold text-ink-2">Test</span>
          <select value={kind} onChange={(event) => setKind(event.target.value as 't' | 'prop')} className={select}><option value="t">t-test (means)</option><option value="prop">Two proportions</option></select></label>
        {kind === 't' ? (
          <>
            <label className="block"><span className="mb-1 block text-[13px] font-semibold text-ink-2">Design</span>
              <select value={design} onChange={(event) => setDesign(event.target.value as PowerDesign)} className={select}><option value="two-sample">Two independent groups</option><option value="paired">Paired (before and after)</option><option value="one-sample">One sample</option></select></label>
            <label className="block"><span className="mb-1 block text-[13px] font-semibold text-ink-2">Effect size (Cohen&apos;s d): 0.2 small, 0.5 medium, 0.8 large</span><input type="number" step="0.05" min="0.05" value={d} onChange={(event) => setD(event.target.value)} className={input} /></label>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="mb-1 block text-[13px] font-semibold text-ink-2">Proportion in group 1</span><input type="number" step="0.01" min="0.01" max="0.99" value={p1} onChange={(event) => setP1(event.target.value)} className={input} /></label>
            <label className="block"><span className="mb-1 block text-[13px] font-semibold text-ink-2">Proportion in group 2</span><input type="number" step="0.01" min="0.01" max="0.99" value={p2} onChange={(event) => setP2(event.target.value)} className={input} /></label>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="mb-1 block text-[13px] font-semibold text-ink-2">Alpha (two-tailed)</span><input type="number" step="0.01" value={alpha} onChange={(event) => setAlpha(event.target.value)} className={input} /></label>
          <label className="block"><span className="mb-1 block text-[13px] font-semibold text-ink-2">Power</span><input type="number" step="0.05" value={power} onChange={(event) => setPower(event.target.value)} className={input} /></label>
        </div>
        {kind === 't' && <label className="block"><span className="mb-1 block text-[13px] font-semibold text-ink-2">Or: the power of a sample you have ({unit})</span><input type="number" min="2" value={n} onChange={(event) => setN(event.target.value)} placeholder="e.g. 40" className={input} /></label>}
      </div>
      <Card className="p-5">
        <p className="text-[13px] font-semibold text-muted">You need</p>
        <p className="mt-1 text-[32px] font-bold tabular-nums text-ink">{Number.isFinite(needed) ? needed.toLocaleString('en-US') : '–'} <span className="text-[16px] font-medium text-muted">{unit}</span></p>
        {Number.isFinite(achieved) && <p className="mt-3 text-[15px]">With {n} {unit}, power is <strong>{(achieved * 100).toFixed(0)}%</strong>.</p>}
        <p className="mt-4 text-[13px] leading-relaxed text-muted">Normal approximation with the usual small-sample correction; it agrees with G*Power to within a case for common designs. Add 10–20% for drop-out. Report: “A sample of {Number.isFinite(needed) ? needed : 'N'} {unit} gives {Math.round(pw * 100)}% power to detect {kind === 't' ? `d = ${d}` : `a difference between ${p1} and ${p2}`} at α = {alpha}.”</p>
      </Card>
    </div>
  );
}

function DataLab() {
  const { user } = useSignedIn();
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>('data');
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [kinds, setKinds] = useState<Record<string, 'numeric' | 'categorical'>>({});
  const [test, setTest] = useState<TestId>('welch');
  const [vars, setVars] = useState<[string, string]>(['', '']);
  const [results, setResults] = useState<TestResult[]>([]);
  const [chart, setChart] = useState<{ type: 'histogram' | 'bar' | 'box' | 'scatter'; a: string; b: string }>({ type: 'histogram', a: '', b: '' });
  const [question, setQuestion] = useState('');
  const [report, setReport] = useState('');
  const [busy, setBusy] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);

  const parsed = useMemo(() => (text ? parseCsv(text) : null), [text]);
  const columns = useMemo(() => {
    if (!parsed) return [];
    return toColumns(parsed.header, parsed.rows).map((column, index) => {
      const forced = kinds[column.name];
      if (!forced || forced === column.kind) return column;
      return toColumns([column.name], parsed.rows.map((row) => [row[index] ?? '']))
        .map((one) => (forced === 'categorical' ? { ...one, kind: 'categorical' as const, values: one.values.map(() => null) } : { ...one, kind: 'numeric' as const, values: one.labels.map((label) => (label === null ? null : Number(label.replace(',', '.')))).map((value) => (Number.isFinite(value) ? value : null)) }))[0];
    });
  }, [parsed, kinds]);
  const byName = (columnName: string) => columns.find((column) => column.name === columnName);

  useEffect(() => {
    const task = params.get('task');
    if (!user || !task) return;
    api<TaskRecord>(`/api/history/${encodeURIComponent(task)}`).then((record) => {
      setTaskId(record.id);
      setName(String(record.result?.dataset ?? record.title));
      setResults((record.result?.results ?? []).map((result: TestResult) => ({ ...result, warnings: result.warnings ?? [], apa: result.apa ?? '' })));
      setReport(String(record.result?.markdown ?? ''));
      setQuestion(String(record.result?.question ?? ''));
      setTab(record.result?.markdown ? 'report' : 'tests');
    }).catch(showError);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = async (file: File | null) => {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast.error('Files up to 20 MB. Save a smaller CSV.'); return; }
    if (/\.xlsx?$/i.test(file.name)) { toast.error('Save the sheet as CSV first (File › Save as › CSV), then upload it.'); return; }
    setName(file.name);
    setText(await file.text());
    setKinds({});
    setTab('data');
  };
  const run = () => {
    const spec = TESTS.find((item) => item.id === test)!;
    const [a, b] = [byName(vars[0]), byName(vars[1])];
    if (!a || !b) { toast.error('Choose both variables.'); return; }
    const names: [string, string] = [a.name, b.name];
    const result = test === 'pearson' ? pearson(a.values, b.values, names)
      : test === 'regression' ? linearRegression(a.values, b.values, names)
        : test === 'paired' ? pairedT(a.values, b.values, names)
          : test === 'welch' ? welch(a.values, b.labels, names)
            : test === 'mann' ? mannWhitney(a.values, b.labels, names)
              : test === 'anova' ? anova(a.values, b.labels, names)
                : chiSquare(a.labels, b.labels, names);
    if (!result.rows.length) { toast.error(result.warnings[0] || `${spec.name} could not run on these columns.`); return; }
    setResults([...results, result]);
  };
  const payload = () => ({
    title: name ? `Analysis of ${name}` : 'Data analysis', question, dataset: name || 'Pasted data', n: parsed?.rows.length ?? 0,
    columns: columns.map((column) => ({ name: column.name, kind: column.kind, summary: summaryOf(column).slice(0, 600) })),
    results: results.map(({ title, rows, apa, warnings }) => ({ title, rows, apa, warnings })), task_id: taskId,
  });
  const save = async () => {
    try {
      const result = await api<{ task_id: string }>('/api/analysis/data/save', { method: 'POST', body: JSON.stringify(payload()) });
      setTaskId(result.task_id);
      window.history.replaceState(null, '', `/data-lab?task=${result.task_id}`);
      toast.success('Saved to History');
    } catch (error) { showError(error); }
  };
  const writeReport = async () => {
    setBusy(true);
    try {
      const result = await api<{ task_id: string; markdown: string }>('/api/analysis/data/report', { method: 'POST', body: JSON.stringify(payload()) });
      setReport(result.markdown);
      setTaskId(result.task_id);
      window.history.replaceState(null, '', `/data-lab?task=${result.task_id}`);
    } catch (error) { showError(error); } finally { setBusy(false); creditsChanged(); }
  };
  const exportResults = () => download('results.csv', toCsv([['Analysis', 'Statistic', 'Value'], ...results.flatMap((result) => result.rows.map(([label, value]) => [result.title, label, value]))]), 'text/csv');
  const exportDescriptives = () => download('descriptives.csv', toCsv([['Variable', 'Type', 'Summary'], ...columns.map((column) => [column.name, column.kind, summaryOf(column)])]), 'text/csv');

  const spec = TESTS.find((item) => item.id === test)!;
  const options = (kind: 'numeric' | 'categorical') => columns.filter((column) => column.kind === kind);
  const chartA = byName(chart.a); const chartB = byName(chart.b);

  return (
    <AppFrame wide title="Data Lab" subtitle="Upload your data, describe it, run the right test and write up the results. Statistics are calculated in your browser.">
      <div role="tablist" aria-label="Data Lab" className="flex flex-wrap gap-1 border-b border-line-2">
        {([['data', 'Data'], ['describe', 'Describe and chart'], ['tests', `Tests${results.length ? ` (${results.length})` : ''}`], ['chooser', 'Which test?'], ['power', 'Sample size'], ['report', 'Report']] as [Tab, string][]).map(([id, label]) => (
          <button key={id} role="tab" type="button" aria-selected={tab === id} onClick={() => setTab(id)} className={`-mb-px border-b-2 px-3 pb-2.5 text-[14px] font-semibold ${tab === id ? 'border-brand text-ink' : 'border-transparent text-muted hover:text-ink-2'}`}>{label}</button>
        ))}
      </div>

      <div className="mt-5">
        {tab === 'data' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex h-[42px] cursor-pointer items-center gap-2 rounded-[11px] bg-brand px-[18px] text-[15px] font-semibold text-on-brand shadow-brand">
                <LuUpload className="h-4 w-4" />Upload CSV or TSV<input type="file" accept=".csv,.tsv,.txt,.xls,.xlsx" className="hidden" onChange={(event) => { load(event.target.files?.[0] ?? null); event.target.value = ''; }} />
              </label>
              <Button onClick={() => { setName('sample.csv'); setText(SAMPLE); setKinds({}); }}>Use sample data</Button>
            </div>
            {!parsed && <textarea value={text} onChange={(event) => { setText(event.target.value); setName('Pasted data'); }} rows={6} placeholder="Or paste data with a header row (from Excel, Google Sheets or SPSS)" className="w-full rounded-xl border border-line p-3 font-mono text-[13px]" />}
            {taskId && !parsed && results.length > 0 && <p className="text-[14px] text-muted">This saved analysis keeps its results, not the data. Upload the data again to run more tests.</p>}
            {parsed && (
              <>
                <p className="text-[14px] text-muted">{name}: {parsed.rows.length.toLocaleString('en-US')} rows, {columns.length} columns{parsed.truncated ? ' (first 50,000 rows)' : ''}. <button type="button" onClick={() => { setText(''); setName(''); }} className="font-semibold text-brand hover:underline">Remove</button></p>
                <div className="overflow-x-auto rounded-xl border border-line">
                  <table className="min-w-full text-[13.5px]">
                    <thead><tr>{columns.map((column) => (
                      <th key={column.name} className="whitespace-nowrap px-3 py-2 text-left align-bottom font-semibold">
                        {column.name}
                        <select aria-label={`Type of ${column.name}`} value={column.kind} onChange={(event) => setKinds({ ...kinds, [column.name]: event.target.value as 'numeric' | 'categorical' })} className="mt-1 block rounded-md border border-line bg-surface px-1 text-[12px] font-normal text-muted">
                          <option value="numeric">Numeric</option><option value="categorical">Categorical</option>
                        </select>
                      </th>
                    ))}</tr></thead>
                    <tbody>{parsed.rows.slice(0, 12).map((row, index) => <tr key={index} className="border-t border-line-2">{columns.map((column, at) => <td key={column.name} className={`whitespace-nowrap px-3 py-1.5 ${column.kind === 'numeric' ? 'text-right tabular-nums' : ''}`}>{row[at]}</td>)}</tr>)}</tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'describe' && (!parsed ? <p className="text-[14.5px] text-muted">Upload data first.</p> : (
          <div className="space-y-5">
            <Card className="p-4">
              <div className="flex items-center gap-2"><h2 className="flex-1 text-[15px] font-bold">Variables</h2><Button size="sm" onClick={exportDescriptives}><LuDownload className="h-4 w-4" />CSV</Button></div>
              <table className="mt-2 w-full text-[14px]"><tbody>{columns.map((column) => <tr key={column.name} className="border-t border-line-2"><td className="py-2 pr-3 align-top font-medium">{column.name}<span className="block text-[12px] font-normal text-muted">{column.kind}</span></td><td className="py-2 text-ink-2">{summaryOf(column)}</td></tr>)}</tbody></table>
            </Card>
            <Card className="p-4">
              <h2 className="text-[15px] font-bold">Chart</h2>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <select aria-label="Chart type" value={chart.type} onChange={(event) => setChart({ ...chart, type: event.target.value as typeof chart.type })} className={select}>
                  <option value="histogram">Histogram (one numeric)</option><option value="bar">Bar chart (one categorical)</option><option value="box">Box plot (numeric by group)</option><option value="scatter">Scatter (two numeric)</option>
                </select>
                <select aria-label="Variable" value={chart.a} onChange={(event) => setChart({ ...chart, a: event.target.value })} className={select}>
                  <option value="">Choose a variable</option>{options(chart.type === 'bar' ? 'categorical' : 'numeric').map((column) => <option key={column.name} value={column.name}>{column.name}</option>)}
                </select>
                {(chart.type === 'box' || chart.type === 'scatter') && (
                  <select aria-label="Second variable" value={chart.b} onChange={(event) => setChart({ ...chart, b: event.target.value })} className={select}>
                    <option value="">{chart.type === 'box' ? 'Group by' : 'Y variable'}</option>{options(chart.type === 'box' ? 'categorical' : 'numeric').map((column) => <option key={column.name} value={column.name}>{column.name}</option>)}
                  </select>
                )}
              </div>
              <div className="mt-4">
                {chartA && chart.type === 'histogram' && <Columns label={`Histogram of ${chartA.name}`} data={bins(chartA.values.filter((value): value is number => value !== null))} />}
                {chartA && chart.type === 'bar' && <Columns label={`Counts of ${chartA.name}`} data={frequencies(chartA.labels).slice(0, 30).map((item) => ({ label: item.value.slice(0, 12), value: item.count }))} />}
                {chartA && chartB && chart.type === 'box' && <BoxPlot label={`${chartA.name} by ${chartB.name}`} groups={frequencies(chartB.labels).slice(0, 12).map((item) => ({ name: item.value, values: chartA.values.filter((value, index): value is number => value !== null && chartB.labels[index] === item.value) }))} />}
                {chartA && chartB && chart.type === 'scatter' && <Scatter label={`${chartB.name} against ${chartA.name}`} x={chartA.values} y={chartB.values} names={[chartA.name, chartB.name]} />}
              </div>
            </Card>
          </div>
        ))}

        {tab === 'tests' && (
          <div className="space-y-4">
            {parsed ? (
              <Card className="p-4">
                <div className="grid gap-2 sm:grid-cols-[1.2fr_1fr_1fr_auto]">
                  <select aria-label="Test" value={test} onChange={(event) => { setTest(event.target.value as TestId); setVars(['', '']); }} className={select}>{TESTS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
                  {[0, 1].map((at) => (
                    <select key={at} aria-label={spec.labels[at]} value={vars[at]} onChange={(event) => setVars(at === 0 ? [event.target.value, vars[1]] : [vars[0], event.target.value])} className={select}>
                      <option value="">{spec.labels[at]}</option>{options(spec.needs[at]).map((column) => <option key={column.name} value={column.name}>{column.name}</option>)}
                    </select>
                  ))}
                  <Button variant="primary" onClick={run}>Run</Button>
                </div>
                <p className="mt-2 text-[13px] text-muted">Not sure which test? Open “Which test?”.</p>
              </Card>
            ) : <p className="text-[14.5px] text-muted">Upload data to run tests.</p>}
            {results.map((result, index) => <ResultCard key={index} result={result} onRemove={() => setResults(results.filter((_, at) => at !== index))} />)}
            {results.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Button onClick={save}><LuSave className="h-4 w-4" />Save to History</Button>
                <Button onClick={exportResults}><LuDownload className="h-4 w-4" />Results as CSV</Button>
                <Button variant="primary" onClick={() => setTab('report')}><LuSparkles className="h-4 w-4" />Write the results section</Button>
              </div>
            )}
          </div>
        )}

        {tab === 'chooser' && <Chooser />}
        {tab === 'power' && <Power />}

        {tab === 'report' && (
          <div className="space-y-4">
            {!results.length ? <p className="text-[14.5px] text-muted">Run at least one test first. The report is written only from the numbers you calculated.</p> : (
              <Card className="p-4">
                <label htmlFor="question" className="text-[14px] font-semibold">Research question (optional)</label>
                <input id="question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="e.g. Does tutoring improve exam scores?" className="mt-1.5 h-10 w-full rounded-[10px] border border-line px-3 text-[14.5px]" />
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Button variant="primary" disabled={busy} onClick={writeReport}>{busy ? <LuLoaderCircle className="h-4 w-4 animate-spin" /> : <LuSparkles className="h-4 w-4" />}Write the results section</Button>
                  <CreditCost credits={2} />
                </div>
                <p className="mt-2 text-[13px] text-muted">Sends the {results.length} result{results.length === 1 ? '' : 's'} and the variable summaries, never the raw data. The AI may not add or change any number.</p>
              </Card>
            )}
            {report && (
              <Card className="p-5">
                <CitedMarkdown markdown={report} />
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="primary" size="sm" onClick={() => openInEditor({ title: name ? `Results: ${name}` : 'Results', html: markdownToHtml(report), markdown: report, style: 'apa' })}><LuFilePen className="h-4 w-4" />Open in editor</Button>
                  <Button size="sm" onClick={() => navigator.clipboard.writeText(report).then(() => toast.success('Copied'))}>Copy</Button>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </AppFrame>
  );
}

export default function Page() {
  return <Suspense fallback={null}><DataLab /></Suspense>;
}
