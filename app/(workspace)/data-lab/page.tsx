'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
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
import { BoxPlot, Columns, CurveChart, Scatter, bins } from '@/components/app/analysis/charts';
import {
  chooseTest, download, powerT, sampleSizeProportions, sampleSizeT, toCsv, type ChooserAnswers, type PowerDesign,
} from '@/components/app/analysis/stats';
import { sampleSizeCorrelation, sampleSizeDiagnostic, sampleSizePrevalence } from '@/lib/statsMore';
import { COMPATIBLE_VERSIONS, DATA_LAB_VERSION, analysisColumns, datasetHash, parseAnalysisBundle, rerunAnalyses, runAnalysis, type AnalysisBundle, type AnalysisResult, type AnalysisSpec, type DataTransformation, type Reproducibility } from '@/lib/dataLabReproducibility';
import { ANALYSES, ANALYSIS_GROUPS, analysisDef, type AnalysisOptions, type AnalysisTest } from '@/lib/dataLabAnalyses';
import { analysisScript, type CodeLanguage } from '@/lib/dataLabCode';
import { applyScoring, type ScaleScoring } from '@/lib/surveyScoring';
import type { XlsxWorkbook } from '@/lib/dataLabXlsx';

type Tab = 'data' | 'describe' | 'tests' | 'chooser' | 'power' | 'report';

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

function ResultCard({ result, onRemove }: { result: AnalysisResult; onRemove?: () => void }) {
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
      {result.chart && <div className="mt-3"><CurveChart chart={result.chart} label={result.title} /></div>}
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
        {field('goal', 'What do you want to do?', [['compare', 'Compare groups or times'], ['relate', 'See if two variables are related'], ['predict', 'Predict an outcome'], ['describe', 'Describe the data'], ['diagnostic', 'Check how accurate a test or score is'], ['survival', 'Compare time until an event (survival)'], ['reliability', 'Check the reliability of a questionnaire scale']])}
        {!['survival', 'reliability'].includes(answers.goal) && field('outcome', answers.goal === 'diagnostic' ? 'What does the test give?' : 'What kind of outcome?', answers.goal === 'diagnostic' ? [['categorical', 'A positive or negative result'], ['numeric', 'A score or measurement']] : [['numeric', 'Numbers (scores, times, amounts)'], ['ordinal', 'Ranks or ratings (e.g. Likert)'], ['categorical', 'Categories (yes/no, groups)']])}
        {answers.goal === 'compare' && field('groups', 'How many groups or times?', [['two', 'Two'], ['three-plus', 'Three or more']])}
        {answers.goal === 'compare' && field('paired', 'Same people measured more than once?', [[false, 'No: different people in each group'], [true, 'Yes: the same people (before and after, repeated)']])}
        {answers.outcome === 'numeric' && ['compare', 'relate', 'predict'].includes(answers.goal) && field('normal', 'Is the outcome roughly normal?', [['unsure', 'Not sure (check the histogram)'], ['yes', 'Yes, or 30+ per group'], ['no', 'No: skewed or with outliers']])}
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

/** Adds scale scores (sum or mean, reverse-coded items, bands) as new columns; a survey can supply the scales. */
function ScaleScorer({ columns, preset, onApply }: { columns: Column[]; preset: { title: string; scales: ScaleScoring[] } | null; onApply: (scales: ScaleScoring[], from: string) => void }) {
  const numericColumns = columns.filter((column) => column.kind === 'numeric' || column.labels.some((label) => label !== null && /^\d+$/.test(label)));
  const [name, setName] = useState('');
  const [items, setItems] = useState<string[]>([]);
  const [reverse, setReverse] = useState<string[]>([]);
  const [min, setMin] = useState('1');
  const [max, setMax] = useState('5');
  const [method, setMethod] = useState<'sum' | 'mean'>('mean');
  const input = 'h-9 w-full rounded-[10px] border border-line px-3 text-[14px]';
  const toggle = (list: string[], set: (next: string[]) => void, value: string) => set(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  const presetMissing = preset ? [...new Set(preset.scales.flatMap((scale) => scale.items))].filter((item) => !columns.some((column) => column.name === item)) : [];
  return (
    <Card className="p-4">
      <h2 className="text-[15px] font-bold">Score a questionnaire scale</h2>
      <p className="mt-1 text-[13px] text-muted">Adds a score column from the items of a scale: reverse-scored items flipped, missing items prorated. Then run Reliability (Cronbach’s alpha) on the items, or tests on the score.</p>
      {preset && (
        <div className="mt-3 rounded-xl bg-soft px-3.5 py-3">
          <p className="text-[14px]"><span className="font-semibold">{preset.title}</span>: {preset.scales.map((scale) => scale.name).join(', ')}</p>
          {presetMissing.length > 0
            ? <p className="mt-1 text-[13px] text-amber-800">This data has no column {presetMissing.slice(0, 4).map((item) => `“${item}”`).join(', ')}{presetMissing.length > 4 ? ` and ${presetMissing.length - 4} more` : ''}. Upload the responses exported from the survey, with its variable names as the header.</p>
            : <Button size="sm" variant="primary" className="mt-2" onClick={() => onApply(preset.scales, preset.title)}>Add the survey’s scale scores</Button>}
        </div>
      )}
      <details className="mt-3">
        <summary className="cursor-pointer text-[13.5px] font-semibold">Define a scale yourself</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <label className="block sm:col-span-2 text-[13px] font-semibold">Scale name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Anxiety" className={`${input} mt-1 font-normal`} /></label>
          <label className="block text-[13px] font-semibold">Lowest answer<input type="number" value={min} onChange={(event) => setMin(event.target.value)} className={`${input} mt-1 font-normal`} /></label>
          <label className="block text-[13px] font-semibold">Highest answer<input type="number" value={max} onChange={(event) => setMax(event.target.value)} className={`${input} mt-1 font-normal`} /></label>
        </div>
        <p className="mt-3 text-[13px] font-semibold">Items <span className="font-normal text-muted">(click once to include, then mark reversed items)</span></p>
        <div className="mt-1.5 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
          {numericColumns.map((column) => {
            const on = items.includes(column.name);
            return <button key={column.name} type="button" aria-pressed={on} onClick={() => { toggle(items, setItems, column.name); if (on) setReverse(reverse.filter((item) => item !== column.name)); }} className={`rounded-full border px-3 py-1 text-[13px] ${on ? 'border-brand bg-brand-50 font-semibold' : 'border-line text-ink-2 hover:bg-soft'}`}>{column.name}</button>;
          })}
        </div>
        {items.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[13px]">
            <span className="font-semibold">Reverse-scored:</span>
            {items.map((item) => <label key={item} className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-0.5"><input type="checkbox" checked={reverse.includes(item)} onChange={() => toggle(reverse, setReverse, item)} />{item}</label>)}
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <select aria-label="Score" value={method} onChange={(event) => setMethod(event.target.value as 'sum' | 'mean')} className={`${select} max-w-[220px]`}><option value="mean">Mean of the items</option><option value="sum">Sum of the items</option></select>
          <Button size="sm" variant="primary" disabled={!name.trim() || !items.length} onClick={() => onApply([{ name: name.trim(), items, reverse, min: Number(min), max: Number(max), method, min_answered: Math.max(1, Math.ceil(items.length * 0.8)) }], name.trim())}>Add score column</Button>
          <span className="text-xs text-muted">A score needs at least 80% of the items answered.</span>
        </div>
      </details>
    </Card>
  );
}

type PowerKind = 't' | 'prop' | 'prevalence' | 'correlation' | 'diagnostic';

function Power() {
  const [kind, setKind] = useState<PowerKind>('t');
  const [d, setD] = useState('0.5');
  const [design, setDesign] = useState<PowerDesign>('two-sample');
  const [alpha, setAlpha] = useState('0.05');
  const [power, setPower] = useState('0.8');
  const [p1, setP1] = useState('0.5');
  const [p2, setP2] = useState('0.6');
  const [n, setN] = useState('');
  const [expected, setExpected] = useState('0.5');
  const [precision, setPrecision] = useState('0.05');
  const [population, setPopulation] = useState('');
  const [deff, setDeff] = useState('1');
  const [r, setR] = useState('0.3');
  const [sens, setSens] = useState('0.9');
  const [spec, setSpec] = useState('0.85');
  const [prevalence, setPrevalence] = useState('0.2');
  const a = Number(alpha); const pw = Number(power);
  const diagnostic = sampleSizeDiagnostic(Number(sens), Number(spec), Number(precision), Number(prevalence), 1 - a);
  const needed = kind === 't' ? sampleSizeT(Number(d), a, pw, design)
    : kind === 'prop' ? sampleSizeProportions(Number(p1), Number(p2), a, pw)
      : kind === 'prevalence' ? sampleSizePrevalence(Number(expected), Number(precision), 1 - a, population ? Number(population) : null, Number(deff) || 1)
        : kind === 'correlation' ? sampleSizeCorrelation(Number(r), a, pw) : diagnostic.total;
  const achieved = kind === 't' && n ? powerT(Number(d), Number(n), a, design) : NaN;
  const unit = kind === 't' ? (design === 'two-sample' ? 'per group' : design === 'paired' ? 'pairs' : 'cases') : kind === 'prop' ? 'per group' : kind === 'correlation' ? 'cases' : 'people';
  const input = 'h-10 w-full rounded-[10px] border border-line px-3 text-[14.5px]';
  const num = (label: string, value: string, set: (value: string) => void, step = '0.01', extra: Record<string, string> = {}) => (
    <label className="block"><span className="mb-1 block text-[13px] font-semibold text-ink-2">{label}</span><input type="number" step={step} value={value} onChange={(event) => set(event.target.value)} className={input} {...extra} /></label>
  );
  const estimating = kind === 'prevalence' || kind === 'diagnostic';
  const confidence = Math.round((1 - a) * 100);
  const shown = Number.isFinite(needed) ? needed : 'N';
  const effect = kind === 't' ? `to detect d = ${d}` : kind === 'prop' ? `to detect a difference between ${p1} and ${p2}` : `to detect r = ${r}`;
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="space-y-3">
        <label className="block"><span className="mb-1 block text-[13px] font-semibold text-ink-2">Study</span>
          <select value={kind} onChange={(event) => setKind(event.target.value as PowerKind)} className={select}>
            <option value="t">Compare means (t-test)</option><option value="prop">Compare two proportions</option>
            <option value="prevalence">Estimate a prevalence or proportion (survey)</option>
            <option value="correlation">Detect a correlation</option><option value="diagnostic">Diagnostic accuracy (sensitivity and specificity)</option>
          </select></label>
        {kind === 't' && (
          <>
            <label className="block"><span className="mb-1 block text-[13px] font-semibold text-ink-2">Design</span>
              <select value={design} onChange={(event) => setDesign(event.target.value as PowerDesign)} className={select}><option value="two-sample">Two independent groups</option><option value="paired">Paired (before and after)</option><option value="one-sample">One sample</option></select></label>
            {num('Effect size (Cohen’s d): 0.2 small, 0.5 medium, 0.8 large', d, setD, '0.05', { min: '0.05' })}
          </>
        )}
        {kind === 'prop' && <div className="grid grid-cols-2 gap-3">{num('Proportion in group 1', p1, setP1)}{num('Proportion in group 2', p2, setP2)}</div>}
        {kind === 'prevalence' && (
          <>
            <div className="grid grid-cols-2 gap-3">{num('Expected proportion (0.5 if unknown)', expected, setExpected)}{num('Precision (± margin, e.g. 0.05)', precision, setPrecision, '0.005')}</div>
            <div className="grid grid-cols-2 gap-3">{num('Population size (optional)', population, setPopulation, '1', { min: '1', placeholder: 'e.g. 2000' })}{num('Design effect (1 for simple random)', deff, setDeff, '0.1', { min: '1' })}</div>
          </>
        )}
        {kind === 'correlation' && num('Expected correlation r: 0.1 small, 0.3 medium, 0.5 large', r, setR, '0.05')}
        {kind === 'diagnostic' && (
          <>
            <div className="grid grid-cols-2 gap-3">{num('Expected sensitivity', sens, setSens)}{num('Expected specificity', spec, setSpec)}</div>
            <div className="grid grid-cols-2 gap-3">{num('Prevalence in the study population', prevalence, setPrevalence)}{num('Precision (± margin)', precision, setPrecision, '0.005')}</div>
          </>
        )}
        <div className="grid grid-cols-2 gap-3">
          {num(estimating ? 'Alpha (1 − confidence level)' : 'Alpha (two-tailed)', alpha, setAlpha)}
          {!estimating && num('Power', power, setPower, '0.05')}
        </div>
        {kind === 't' && num(`Or: the power of a sample you have (${unit})`, n, setN, '1', { min: '2', placeholder: 'e.g. 40' })}
      </div>
      <Card className="p-5">
        <p className="text-[13px] font-semibold text-muted">You need</p>
        <p className="mt-1 text-[32px] font-bold tabular-nums text-ink">{Number.isFinite(needed) ? needed.toLocaleString('en-US') : '–'} <span className="text-[16px] font-medium text-muted">{unit}</span></p>
        {kind === 'diagnostic' && Number.isFinite(needed) && <p className="mt-2 text-[14px] text-ink-2">{diagnostic.sensitivity.toLocaleString('en-US')} for sensitivity and {diagnostic.specificity.toLocaleString('en-US')} for specificity; the larger covers both.</p>}
        {Number.isFinite(achieved) && <p className="mt-3 text-[15px]">With {n} {unit}, power is <strong>{(achieved * 100).toFixed(0)}%</strong>.</p>}
        <p className="mt-4 text-[13px] leading-relaxed text-muted">
          {kind === 'prevalence' && <>n = z²p(1 − p)/d², times the design effect, with the finite population correction when you give a population size (Cochran). Add 10–20% for non-response. Report: “A sample of {shown} estimates a prevalence of {Math.round(Number(expected) * 100)}% to within ±{Math.round(Number(precision) * 1000) / 10} percentage points with {confidence}% confidence.”</>}
          {kind === 'diagnostic' && <>Buderer’s method: the cases needed for each estimate, divided by the share of people with (or without) the condition. Report: “{shown} participants give a {confidence}% confidence interval of ±{Math.round(Number(precision) * 1000) / 10} points around the expected sensitivity and specificity.”</>}
          {!estimating && <>{kind === 'correlation' ? 'Fisher’s z approximation.' : 'Normal approximation with the usual small-sample correction; it agrees with G*Power to within a case for common designs.'} Add 10–20% for drop-out. Report: “A sample of {shown} {unit} gives {Math.round(pw * 100)}% power {effect} at α = {alpha}.”</>}
        </p>
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
  const [test, setTest] = useState<AnalysisTest>('welch');
  const [vars, setVars] = useState<string[]>([]);
  const [many, setMany] = useState<string[]>([]);
  const [opts, setOpts] = useState<AnalysisOptions>({});
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [scoring, setScoring] = useState<{ id: string; title: string; scales: ScaleScoring[]; responses: number } | null>(null);
  const [chart, setChart] = useState<{ type: 'histogram' | 'bar' | 'box' | 'scatter'; a: string; b: string }>({ type: 'histogram', a: '', b: '' });
  const [question, setQuestion] = useState('');
  const [report, setReport] = useState('');
  const [busy, setBusy] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [saveDataset, setSaveDataset] = useState(false);
  const [includeDownloadData, setIncludeDownloadData] = useState(false);
  const [analysisSpecs, setAnalysisSpecs] = useState<AnalysisSpec[]>([]);
  const [transformations, setTransformations] = useState<DataTransformation[]>([]);
  const [analysisNotes, setAnalysisNotes] = useState('');
  const [loadedReproduction, setLoadedReproduction] = useState<Reproducibility | null>(null);
  const [workbook, setWorkbook] = useState<{ file: string; data: XlsxWorkbook } | null>(null);
  const [sheetPath, setSheetPath] = useState('');
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [runningTest, setRunningTest] = useState(false);
  const datasetRevision = useRef(0);
  const importing = useRef(0);

  const parsed = useMemo(() => (text ? parseCsv(text) : null), [text]);
  const datasetBytes = useMemo(() => new TextEncoder().encode(text).byteLength, [text]);
  const columns = useMemo(() => text ? analysisColumns(text, kinds) : [], [text, kinds]);
  const byName = (columnName: string) => columns.find((column) => column.name === columnName);

  useEffect(() => {
    const survey = params.get('survey');
    if (!user || !survey) return;
    api<{ title: string; scales: ScaleScoring[]; responses: number }>(`/api/surveys/${encodeURIComponent(survey)}/scoring`).then((result) => setScoring({ ...result, id: survey })).catch(showError);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const task = params.get('task');
    if (!user || !task) return;
    api<TaskRecord>(`/api/history/${encodeURIComponent(task)}`).then((record) => {
      setTaskId(record.id);
      setName(String(record.result?.dataset ?? record.title));
      setResults((record.result?.results ?? []).map((result: TestResult) => ({ ...result, warnings: result.warnings ?? [], apa: result.apa ?? '' })));
      setReport(String(record.result?.markdown ?? ''));
      setQuestion(String(record.result?.question ?? ''));
      const reproduction = record.result?.reproducibility as Reproducibility | undefined;
      if (reproduction) { setLoadedReproduction(reproduction); setAnalysisSpecs(reproduction.analyses); setTransformations(reproduction.transformations); setKinds(reproduction.column_kinds); setAnalysisNotes(reproduction.notes); }
      if (typeof record.result?.dataset_snapshot === 'string') { setText(record.result.dataset_snapshot); setSaveDataset(true); }
      setTab(record.result?.markdown ? 'report' : 'tests');
    }).catch(showError);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = async (file: File | null) => {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast.error('Files up to 20 MB. Save a smaller CSV.'); return; }
    if (/\.xls$/i.test(file.name)) { toast.error('Save this older Excel format as .xlsx or CSV, then import it.'); return; }
    const request = ++importing.current;
    try {
      if (/\.xlsx$/i.test(file.name)) {
        const { openXlsx } = await import('@/lib/dataLabXlsx');
        const data = await openXlsx(await file.arrayBuffer());
        if (request !== importing.current) return;
        const selected = data.sheets[0];
        const imported = await data.read(selected.path);
        if (request !== importing.current) return;
        const matchesSaved = loadedReproduction && await datasetHash(imported.csv) === loadedReproduction.dataset_sha256;
        if (request !== importing.current) return;
        if (matchesSaved) { setText(imported.csv); toast.success('Original worksheet matched. You can rerun the saved analyses.'); }
        else { replaceData(imported.csv, `Imported ${file.name}, sheet ${selected.name}`, 'load'); setKinds({}); setTaskId(null); }
        setWorkbook({ file: file.name, data }); setSheetPath(selected.path); setImportWarnings(imported.warnings);
        setName(`${file.name} — ${selected.name}`.slice(0, 180)); setTab('data'); return;
      }
      const content = await file.text();
      if (request !== importing.current) return;
      if (/\.json$/i.test(file.name)) {
        const bundle = parseAnalysisBundle(content);
        if (bundle.dataset_csv && await datasetHash(bundle.dataset_csv) !== bundle.reproducibility.dataset_sha256) throw new Error('The dataset in this bundle does not match its fingerprint.');
        datasetRevision.current += 1; setWorkbook(null); setImportWarnings([]);
        setName(bundle.dataset_name); setText(bundle.dataset_csv ?? ''); setLoadedReproduction(bundle.reproducibility); setAnalysisSpecs(bundle.reproducibility.analyses); setTransformations(bundle.reproducibility.transformations); setAnalysisNotes(bundle.reproducibility.notes); setKinds(bundle.reproducibility.column_kinds); setResults(bundle.results); setReport(''); setTaskId(null); setSaveDataset(false); setTab('data'); return;
      }
      if (loadedReproduction && await datasetHash(content) === loadedReproduction.dataset_sha256) { setText(content); setTab('data'); toast.success('Original dataset matched. You can rerun the saved analyses.'); return; }
      setName(file.name); replaceData(content, `Loaded ${file.name}`, 'load'); setKinds({}); setTaskId(null); setTab('data');
    } catch (error) { showError(error); }
  };
  const replaceData = (content: string, detail: string, action: DataTransformation['action'] = 'edit_data') => {
    datasetRevision.current += 1; setWorkbook(null); setImportWarnings([]);
    setText(content); setResults([]); setAnalysisSpecs([]); setReport(''); setLoadedReproduction(null);
    setSaveDataset(false); setIncludeDownloadData(false);
    setTransformations((previous) => [...previous, { at: new Date().toISOString(), action, detail }].slice(-300));
  };
  const selectSheet = async (path: string) => {
    if (!workbook) return;
    const request = ++importing.current;
    try {
      const imported = await workbook.data.read(path);
      if (request !== importing.current) return;
      const sheet = workbook.data.sheets.find((item) => item.path === path)!;
      replaceData(imported.csv, `Selected ${workbook.file}, sheet ${sheet.name}`, 'load');
      setWorkbook(workbook); setSheetPath(path); setImportWarnings(imported.warnings);
      setName(`${workbook.file} — ${sheet.name}`.slice(0, 180)); setKinds({}); setTaskId(null);
    } catch (error) { showError(error); }
  };
  const changeKind = (column: string, kind: 'numeric' | 'categorical') => {
    setKinds({ ...kinds, [column]: kind });
    setTransformations((previous) => [...previous, { at: new Date().toISOString(), action: 'column_type' as const, detail: `${column}: ${kind}` }].slice(-300));
  };
  const loadSurveyResponses = async () => {
    if (!scoring) return;
    try {
      const result = await api<{ csv: string; count: number }>(`/api/surveys/${encodeURIComponent(scoring.id)}/responses`);
      if (!result.count) { toast.error('This survey has no responses yet.'); return; }
      setName(`${scoring.title} responses`.slice(0, 180)); replaceData(result.csv, `Loaded ${result.count} responses from the survey “${scoring.title}”`, 'load'); setKinds({}); setTaskId(null); setTab('data');
    } catch (error) { showError(error); }
  };
  const scoreScales = (scales: ScaleScoring[], from: string) => {
    try {
      const out = applyScoring(text, scales);
      const detail = `Added ${out.added.join(', ')} from ${from}: ${scales.map((scale) => `${scale.name} = ${scale.method} of ${scale.items.length} items (${scale.min}–${scale.max}${scale.reverse.length ? `, reversed ${scale.reverse.join(' ')}` : ''})`).join('; ')}`.slice(0, 500);
      replaceData(out.csv, detail, 'derive');
      // Scored items and scores are numbers, even when only two answers were used.
      const numeric = [...scales.flatMap((scale) => scale.items), ...out.added.filter((name) => !/_band$/.test(name))];
      setKinds((previous) => ({ ...previous, ...Object.fromEntries(numeric.map((name) => [name, 'numeric' as const])) }));
      setImportWarnings(out.warnings);
      toast.success(`Added ${out.added.length} column${out.added.length === 1 ? '' : 's'}: ${out.added.join(', ')}`);
    } catch (error) { showError(error); }
  };
  const run = async () => {
    if (runningTest) return;
    if (loadedReproduction && !COMPATIBLE_VERSIONS.has(loadedReproduction.software)) { toast.error('This saved analysis uses a different calculation version. Remove the dataset and load it again to start a new analysis.'); return; }
    if (results.length >= 30) { toast.error('Save this analysis, then start a new one for additional tests. Up to 30 tests fit in one analysis.'); return; }
    if (parsed && new Set(parsed.header).size !== parsed.header.length) { toast.error('Give every column a distinct name before running tests.'); return; }
    const def = analysisDef(test)!;
    const singles = def.slots.filter((slot) => !slot.multiple);
    const missing = singles.findIndex((slot, at) => !slot.optional && !vars[at]);
    if (missing >= 0) { toast.error(`Choose ${singles[missing].label.toLowerCase()}.`); return; }
    const multiple = def.slots.find((slot) => slot.multiple);
    if (multiple?.multiple && (many.length < multiple.multiple.min || many.length > multiple.multiple.max)) { toast.error(`Choose ${multiple.multiple.min} to ${multiple.multiple.max} ${multiple.label.toLowerCase()}.`); return; }
    const variables = [...singles.map((_, at) => vars[at] ?? '').filter(Boolean), ...many];
    const options: AnalysisOptions = Object.fromEntries((def.options ?? []).map((option) => [option.key, opts[option.key]]).filter(([, value]) => value));
    let run: ReturnType<typeof runAnalysis>;
    try { run = runAnalysis(text, { test, variables, kinds, ...(Object.keys(options).length ? { options } : {}) }); } catch (error) { showError(error); return; }
    const { result, rows_used, rows_omitted } = run;
    if (!result.rows.length) { toast.error(result.warnings[0] || `${def.name} could not run on these columns.`); return; }
    const revision = datasetRevision.current;
    setRunningTest(true);
    try {
      const fingerprint = await datasetHash(text);
      if (revision !== datasetRevision.current) return;
      setResults((previous) => [...previous, result]); setReport('');
      setAnalysisSpecs((previous) => [...previous, { test, variables, ...(Object.keys(options).length ? { options } : {}), kinds: { ...kinds }, at: new Date().toISOString(), dataset_sha256: fingerprint, missing: 'complete_observations', rows_used, rows_omitted }]);
    } catch (error) { showError(error); } finally { setRunningTest(false); }
  };
  const reproduction = async (): Promise<Reproducibility | undefined> => {
    if (!text || !parsed) return loadedReproduction ? { ...loadedReproduction, analyses: analysisSpecs, notes: analysisNotes, transformations } : undefined;
    // A saved analysis from a compatible version continues under the current one (its calculations are unchanged).
    const software = loadedReproduction && !COMPATIBLE_VERSIONS.has(loadedReproduction.software) ? loadedReproduction.software : DATA_LAB_VERSION;
    return { schema: 1, software, created_at: loadedReproduction?.created_at ?? new Date().toISOString(), dataset_sha256: await datasetHash(text), rows: parsed.rows.length, columns: parsed.header, truncated: parsed.truncated, column_kinds: kinds, transformations, analyses: analysisSpecs, notes: analysisNotes };
  };
  const payload = async () => ({
    title: name ? `Analysis of ${name}`.slice(0, 200) : 'Data analysis', question, dataset: (name || 'Pasted data').slice(0, 200), n: parsed?.rows.length ?? loadedReproduction?.rows ?? 0,
    columns: columns.map((column) => ({ name: column.name, kind: column.kind, summary: summaryOf(column).slice(0, 600) })),
    results: results.map(({ title, rows, apa, warnings }) => ({ title, rows, apa, warnings })), task_id: taskId,
    reproducibility: await reproduction(), save_dataset: saveDataset && Boolean(text), ...(saveDataset && text ? { dataset_snapshot: text } : {}),
  });
  const save = async () => {
    try {
      const result = await api<{ task_id: string }>('/api/analysis/data/save', { method: 'POST', body: JSON.stringify(await payload()) });
      setTaskId(result.task_id);
      window.history.replaceState(null, '', `/data-lab?task=${result.task_id}`);
      toast.success('Saved to History');
    } catch (error) { showError(error); }
  };
  const writeReport = async () => {
    setBusy(true);
    try {
      const result = await api<{ task_id: string; markdown: string }>('/api/analysis/data/report', { method: 'POST', body: JSON.stringify(await payload()) });
      setReport(result.markdown);
      setTaskId(result.task_id);
      window.history.replaceState(null, '', `/data-lab?task=${result.task_id}`);
    } catch (error) { showError(error); } finally { setBusy(false); creditsChanged(); }
  };
  const exportResults = () => download('results.csv', toCsv([['Analysis', 'Statistic', 'Value'], ...results.flatMap((result) => result.rows.map(([label, value]) => [result.title, label, value]))]), 'text/csv');
  const exportDescriptives = () => download('descriptives.csv', toCsv([['Variable', 'Type', 'Summary'], ...columns.map((column) => [column.name, column.kind, summaryOf(column)])]), 'text/csv');
  const exportBundle = async () => {
    try {
      const provenance = await reproduction();
      if (!provenance) throw new Error('Load a dataset or saved reproducibility bundle first.');
      const bundle: AnalysisBundle = { format: 'aiforresearch-data-lab', reproducibility: provenance, dataset_name: name || 'Pasted data', results, ...(includeDownloadData && text ? { dataset_csv: text } : {}) };
      download('analysis-reproducibility.json', JSON.stringify(bundle, null, 2), 'application/json');
    } catch (error) { showError(error); }
  };
  const rerun = async () => {
    try {
      // Compare against the saved fingerprint, not one recomputed from whatever data is loaded now.
      const provenance = loadedReproduction ? { ...loadedReproduction, analyses: analysisSpecs } : await reproduction();
      if (!provenance || !text) throw new Error('Load the original dataset first. Its fingerprint must match the saved analysis.');
      setResults(await rerunAnalyses(text, provenance)); setReport(''); toast.success('Saved analyses rerun from their specifications.');
    } catch (error) { showError(error); }
  };

  const def = analysisDef(test)!;
  const singleSlots = def.slots.filter((slot) => !slot.multiple);
  const multipleSlot = def.slots.find((slot) => slot.multiple);
  const options = (kind: 'numeric' | 'categorical' | 'any') => columns.filter((column) => kind === 'any' || column.kind === kind);
  const chooseTest_ = (next: AnalysisTest) => { setTest(next); setVars([]); setMany([]); setOpts({}); };
  /** The categories of the column chosen for a slot (for settings such as "positive result"). */
  const levelsOf = (slot: number) => { const column = byName(vars[slot] ?? ''); return column ? frequencies(column.labels).map((item) => item.value).slice(0, 50) : []; };
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
                <LuUpload className="h-4 w-4" />Upload data or saved bundle<input type="file" accept=".csv,.tsv,.txt,.xls,.xlsx,.json" className="hidden" onChange={(event) => { load(event.target.files?.[0] ?? null); event.target.value = ''; }} />
              </label>
              <Button onClick={() => { setName('sample.csv'); replaceData(SAMPLE, 'Loaded example data', 'load'); setKinds({}); setTaskId(null); }}>Use sample data</Button>
            </div>
            {workbook && <label className="block text-sm font-semibold">Worksheet<select value={sheetPath} onChange={(event) => selectSheet(event.target.value)} className={`${select} mt-1`}>{workbook.data.sheets.map((sheet) => <option key={sheet.path} value={sheet.path}>{sheet.name}</option>)}</select><span className="mt-1 block text-xs font-normal text-muted">Changing sheets starts a new analysis. Workbook values are read on this device.</span></label>}
            {importWarnings.map((warning) => <p key={warning} className="text-xs text-amber-800">{warning}</p>)}
            {!parsed && <textarea value={text} onChange={(event) => { replaceData(event.target.value, 'Replaced pasted data'); setName('Pasted data'); }} rows={6} placeholder="Or paste data with a header row (from Excel, Google Sheets or SPSS)" aria-label="Paste dataset" className="w-full rounded-xl border border-line p-3 font-mono text-[13px]" />}
            {!parsed && results.length > 0 && <p className="text-[14px] text-muted">Raw data was not saved with this analysis. Upload the original dataset to match its fingerprint and rerun saved tests.</p>}
            {parsed && (
              <>
                <p className="text-[14px] text-muted">{name}: {parsed.rows.length.toLocaleString('en-US')} rows, {columns.length} columns{parsed.truncated ? ' (first 50,000 rows)' : ''}. <button type="button" onClick={() => { replaceData('', 'Removed dataset'); setName(''); setSaveDataset(false); }} className="font-semibold text-brand hover:underline">Remove</button></p>
                <div className="overflow-x-auto rounded-xl border border-line">
                  <table className="min-w-full text-[13.5px]">
                    <thead><tr>{columns.map((column) => (
                      <th key={column.name} className="whitespace-nowrap px-3 py-2 text-left align-bottom font-semibold">
                        {column.name}
                        <select aria-label={`Type of ${column.name}`} value={column.kind} onChange={(event) => changeKind(column.name, event.target.value as 'numeric' | 'categorical')} className="mt-1 block rounded-md border border-line bg-surface px-1 text-[12px] font-normal text-muted">
                          <option value="numeric">Numeric</option><option value="categorical">Categorical</option>
                        </select>
                      </th>
                    ))}</tr></thead>
                    <tbody>{parsed.rows.slice(0, 12).map((row, index) => <tr key={index} className="border-t border-line-2">{columns.map((column, at) => <td key={column.name} className={`whitespace-nowrap px-3 py-1.5 ${column.kind === 'numeric' ? 'text-right tabular-nums' : ''}`}>{row[at]}</td>)}</tr>)}</tbody>
                  </table>
                </div>
              </>
            )}
            {(parsed || loadedReproduction) && <Card className="p-4">
              <h2 className="text-[15px] font-bold">Reproduce this analysis</h2>
              <p className="mt-1 text-[13px] text-muted">Keep the dataset fingerprint, column types, test settings, missing-observation counts and calculation version with your results. A saved bundle can be reopened here and rerun.</p>
              <label className="mt-3 flex items-start gap-2 text-[13px]"><input type="checkbox" checked={saveDataset} disabled={!text || datasetBytes > 2_000_000} onChange={(event) => setSaveDataset(event.target.checked)} className="mt-0.5" />Save a raw-data snapshot with this analysis when I save or generate a report (up to 2 MB). Project members with access to the task can read it.</label>
              {datasetBytes > 2_000_000 && <p className="mt-1 text-xs text-muted">This dataset is larger than the saved snapshot limit. Download a local bundle with data instead.</p>}
              <label className="mt-2 flex items-start gap-2 text-[13px]"><input type="checkbox" checked={includeDownloadData} disabled={!text} onChange={(event) => setIncludeDownloadData(event.target.checked)} className="mt-0.5" />Include raw data in the downloaded bundle (kept on this device).</label>
              <label className="mt-3 block text-[13px] font-semibold">Data dictionary and analysis decisions<textarea value={analysisNotes} onChange={(event) => setAnalysisNotes(event.target.value)} rows={3} maxLength={10000} placeholder="Variable definitions and units; exclusions; missing-data choices; design assumptions." className="mt-1 w-full rounded-lg border border-line p-2 text-sm font-normal" /></label>
              <div className="mt-3 flex flex-wrap gap-2"><Button onClick={exportBundle}><LuDownload className="h-4 w-4" />Download reproducibility bundle</Button>{analysisSpecs.length > 0 && <Button onClick={rerun} disabled={!text}>Rerun {analysisSpecs.length} saved tests</Button>}{parsed && <Button onClick={() => download('dataset.csv', toCsv([parsed.header, ...parsed.rows]), 'text/csv')}>Download dataset CSV</Button>}</div>
              {analysisSpecs.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-semibold">The same analyses as code:</span>
                  {([['r', 'R', 'analyses.R'], ['python', 'Python', 'analyses.py'], ['spss', 'SPSS syntax', 'analyses.sps']] as [CodeLanguage, string, string][]).map(([language, label, file]) => (
                    <Button key={language} size="sm" onClick={async () => { const provenance = await reproduction(); if (provenance) download(file, analysisScript(language, provenance), 'text/plain'); }}><LuDownload className="h-4 w-4" />{label}</Button>
                  ))}
                  <span className="text-xs text-muted">Reads dataset.csv; check each step before you report it.</span>
                </div>
              )}
              <p className="mt-2 break-all text-xs text-muted">{loadedReproduction?.software ?? DATA_LAB_VERSION}{(loadedReproduction?.dataset_sha256 || analysisSpecs[0]?.dataset_sha256) ? ` · SHA-256: ${loadedReproduction?.dataset_sha256 || analysisSpecs[0]?.dataset_sha256}` : ''}</p>
              {analysisSpecs.length > 0 && <ul className="mt-3 space-y-1 text-xs text-muted">{analysisSpecs.map((item, index) => <li key={`${item.at}-${index}`}>{item.test}: {item.variables.join(' / ')} · {item.rows_used} complete observations, {item.rows_omitted} omitted · {new Date(item.at).toLocaleString()}</li>)}</ul>}
              {transformations.length > 0 && <details className="mt-3 text-xs"><summary className="cursor-pointer font-semibold">Dataset change log ({transformations.length})</summary><ul className="mt-2 space-y-1">{transformations.map((item, index) => <li key={`${item.at}-${index}`}>{new Date(item.at).toLocaleString()} · {item.detail}</li>)}</ul></details>}
            </Card>}
            {!parsed && scoring && (
              <Card className="p-4">
                <h2 className="text-[15px] font-bold">{scoring.title}</h2>
                <p className="mt-1 text-[13.5px] text-muted">{scoring.responses ? `${scoring.responses.toLocaleString('en-US')} responses so far. Load them here; nothing is copied until you do.` : 'No responses yet. Share the survey link first, or upload data entered from paper questionnaires.'}</p>
                {scoring.responses > 0 && <Button variant="primary" size="sm" className="mt-3" onClick={loadSurveyResponses}>Load the responses</Button>}
              </Card>
            )}
            {parsed && <ScaleScorer columns={columns} preset={scoring?.scales.length ? scoring : null} onApply={scoreScales} />}
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
                <div className="grid gap-2 sm:grid-cols-[1.2fr_2fr]">
                  <select aria-label="Test" value={test} onChange={(event) => chooseTest_(event.target.value as AnalysisTest)} className={select}>
                    {ANALYSIS_GROUPS.map((group) => <optgroup key={group} label={group}>{ANALYSES.filter((item) => item.group === group).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</optgroup>)}
                  </select>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {singleSlots.map((slot, at) => (
                      <select key={`${test}-${at}`} aria-label={slot.label} value={vars[at] ?? ''} onChange={(event) => { const next = [...vars]; next[at] = event.target.value; setVars(next); setOpts((previous) => Object.fromEntries(Object.entries(previous).filter(([key]) => def.options?.find((option) => option.key === key)?.slot !== at))); }} className={select}>
                        <option value="">{slot.label}</option>{options(slot.kind).map((column) => <option key={column.name} value={column.name}>{column.name}</option>)}
                      </select>
                    ))}
                    {(def.options ?? []).map((option) => {
                      const levels = levelsOf(option.slot);
                      return (
                        <select key={option.key} aria-label={option.label} value={opts[option.key] ?? ''} disabled={!levels.length} onChange={(event) => setOpts({ ...opts, [option.key]: event.target.value })} className={select}>
                          <option value="">{option.label}{levels.length ? '' : ' (choose the column first)'}</option>{levels.map((level) => <option key={level} value={level}>{level}</option>)}
                        </select>
                      );
                    })}
                  </div>
                </div>
                {multipleSlot && (
                  <fieldset className="mt-3">
                    <legend className="mb-1.5 text-[13px] font-semibold text-ink-2">{multipleSlot.label} ({many.length} chosen{multipleSlot.multiple ? `, ${multipleSlot.multiple.min}–${multipleSlot.multiple.max}` : ''})</legend>
                    <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
                      {options(multipleSlot.kind).filter((column) => !vars.includes(column.name)).map((column) => {
                        const on = many.includes(column.name);
                        return <button key={column.name} type="button" aria-pressed={on} onClick={() => setMany(on ? many.filter((name) => name !== column.name) : [...many, column.name])} className={`rounded-full border px-3 py-1 text-[13px] ${on ? 'border-brand bg-brand-50 font-semibold text-ink' : 'border-line text-ink-2 hover:bg-soft'}`}>{column.name}{multipleSlot.kind === 'any' && <span className="ml-1 text-[11px] text-muted">{column.kind === 'numeric' ? 'num' : 'cat'}</span>}</button>;
                      })}
                    </div>
                  </fieldset>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Button variant="primary" onClick={run} disabled={runningTest}>Run</Button>
                  <p className="text-[13px] text-muted">{def.hint ? `${def.hint} ` : ''}Not sure which test? Open “Which test?”.</p>
                </div>
              </Card>
            ) : <p className="text-[14.5px] text-muted">Upload data to run tests.</p>}
            {results.map((result, index) => <ResultCard key={index} result={result} onRemove={() => { setResults(results.filter((_, at) => at !== index)); setAnalysisSpecs(analysisSpecs.filter((_, at) => at !== index)); setReport(''); }} />)}
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
                <p className="mt-2 text-[13px] text-muted">The AI receives the {results.length} result{results.length === 1 ? '' : 's'} and variable summaries, never the raw data. An optional dataset snapshot is stored separately. The AI may not add or change any number.</p>
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
