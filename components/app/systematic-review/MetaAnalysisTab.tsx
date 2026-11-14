'use client';

/**
 * The Meta-analysis step of a systematic review: one analysis per outcome, with its data grid,
 * model, results, forest and funnel plots, GRADE certainty and the summary of findings.
 * Every number is calculated in the browser by lib/metaAnalysis.ts; nothing here costs credits.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { LuCopy, LuDownload, LuLoaderCircle, LuPlus, LuTrash2 } from 'react-icons/lu';
import { api } from '@/lib/session';
import { Button, Card, Segmented, StatusPill, inputClass } from '@/components/app/ui';
import { showError } from '@/components/app/research/parts';
import {
  CERTAINTY, DATA_TYPES, DOWNGRADE_DOMAINS, FIELDS, MEASURES, MEASURE_LABELS, MEASURE_SHORT, METHODS, METHOD_LABELS, UPGRADE_DOMAINS,
  analyse, certainty, formatEffect, formatInterval, formatPValue, gradeHints, isRatio, looksNumeric, parseNumber, resultSentences, summaryCsv, summaryRow,
  type Analysis, type DataType, type Grade, type InputRow, type Judgement, type Measure, type Method, type Model, type NumberField,
} from '@/lib/metaAnalysis';
import { downloadSvg } from './Prisma';
import { ForestPlot, FunnelPlot } from './MetaPlots';
import { included, shortCite } from './ResultTabs';
import type { ReviewState, SavedAnalysis } from './types';

const MODEL_HELP: Record<Model, string> = {
  fixed: 'Assumes every study estimates one true effect and differences are chance alone. Suits studies that are very alike.',
  random: 'Assumes true effects vary between studies and estimates their average. Usually the safer choice when people, settings or methods differ.',
};
const METHOD_HELP: Record<Method, string> = {
  IV: 'Weights each study by the inverse of its variance.',
  MH: 'Weights from the 2×2 counts. More reliable than inverse variance when events are few.',
  REML: 'Restricted maximum likelihood estimate of the between-study variance (tau²). The usual default in current software.',
  DL: 'DerSimonian-Laird moment estimate of tau². The classic default; it can underestimate tau² when there are few studies.',
};
const HKSJ_HELP = 'Hartung-Knapp-Sidik-Jonkman: a t-based interval that allows for uncertainty in tau². Recommended when there are few studies; it is often wider.';
const LEVEL_LABELS = ['No', 'Serious (−1)', 'Very serious (−2)'];
const CERTAINTY_TONE: Record<string, 'positive' | 'brand' | 'warning' | 'negative'> = { high: 'positive', moderate: 'brand', low: 'warning', 'very low': 'negative' };

const slug = (text: string) => text.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'outcome';
const setupOf = (analysis: SavedAnalysis) => ({ data_type: analysis.data_type, measure: analysis.measure, model: analysis.model, method: analysis.method, hksj: analysis.hksj });
const editable = (analysis: SavedAnalysis) => JSON.stringify({ ...setupOf(analysis), outcome: analysis.outcome, favours: analysis.favours, rows: analysis.rows, grade: analysis.grade });

function download(text: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function sofCsvFor(analyses: SavedAnalysis[]) {
  return `﻿${summaryCsv(analyses.map((analysis) => summaryRow(analysis.outcome, analyse(analysis.rows, setupOf(analysis)), analysis.grade)))}`;
}

function NumCell({ value, onChange, disabled, label }: { value: number | null | undefined; onChange: (value: number | null) => void; disabled: boolean; label: string }) {
  const [text, setText] = useState(value === null || value === undefined ? '' : String(value));
  useEffect(() => { setText(value === null || value === undefined ? '' : String(value)); }, [value]);
  const invalid = text.trim() !== '' && !Number.isFinite(Number(text.trim()));
  return (
    <input aria-label={label} inputMode="decimal" value={text} disabled={disabled} aria-invalid={invalid}
      onChange={(event) => {
        const next = event.target.value;
        setText(next);
        if (!next.trim()) onChange(null);
        else if (Number.isFinite(Number(next.trim()))) onChange(Number(next.trim()));
      }}
      className={`h-9 w-[84px] rounded-lg border bg-surface px-2 text-right text-[13.5px] tabular-nums text-ink focus:border-brand focus:outline-none ${invalid ? 'border-red-500' : 'border-line'}`} />
  );
}

export function MetaAnalysisTab({ state }: { state: ReviewState }) {
  const { review, can_edit: canEdit } = state;
  const base = `/api/systematic-reviews/${review.id}/analyses`;
  const [analyses, setAnalyses] = useState<SavedAnalysis[] | null>(null);
  const [rowLimit, setRowLimit] = useState(50);
  const [maxAnalyses, setMaxAnalyses] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<SavedAnalysis | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await api<{ analyses: SavedAnalysis[]; row_limit: number; max_analyses: number }>(base);
      setAnalyses(result.analyses);
      setRowLimit(result.row_limit);
      setMaxAnalyses(result.max_analyses);
      setError(null);
      return result.analyses;
    } catch (caught) { setError((caught as Error).message); return null; }
  }, [base]);
  useEffect(() => {
    load().then((found) => { if (found?.length) { setSelected(found[0].id); setDraft(found[0]); } });
  }, [load]);

  const saved = analyses?.find((analysis) => analysis.id === selected) ?? null;
  const dirty = Boolean(draft && saved && editable(draft) !== editable(saved));

  const choose = (id: string) => {
    if (id === selected) return;
    if (dirty && !window.confirm('This outcome has unsaved changes. Leave without saving?')) return;
    setSelected(id);
    setDraft(analyses?.find((analysis) => analysis.id === id) ?? null);
  };
  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const { analysis } = await api<{ analysis: SavedAnalysis }>(`${base}/${draft.id}`, { method: 'PUT', body: JSON.stringify({ ...draft, base_revision: draft.revision }) });
      setAnalyses((current) => current?.map((item) => (item.id === analysis.id ? analysis : item)) ?? null);
      setDraft(analysis);
      toast.success('Saved');
    } catch (caught) { showError(caught); } finally { setSaving(false); }
  };
  const remove = async () => {
    if (!draft || !window.confirm(`Delete the outcome "${draft.outcome}" with its data and GRADE judgements?`)) return;
    try {
      await api(`${base}/${draft.id}`, { method: 'DELETE' });
      const rest = (analyses ?? []).filter((item) => item.id !== draft.id);
      setAnalyses(rest);
      setSelected(rest[0]?.id ?? null);
      setDraft(rest[0] ?? null);
    } catch (caught) { showError(caught); }
  };
  const created = (analysis: SavedAnalysis) => {
    if (dirty && !window.confirm('This outcome has unsaved changes. Leave without saving?')) {
      setAnalyses((current) => [...(current ?? []), analysis]);
      return;
    }
    setAnalyses((current) => [...(current ?? []), analysis]);
    setSelected(analysis.id);
    setDraft(analysis);
  };

  const all = useMemo(() => (analyses ?? []).map((analysis) => (draft && analysis.id === draft.id ? draft : analysis)), [analyses, draft]);

  if (error) return <Card className="px-5 py-6 text-[14px] text-red-700">{error}</Card>;
  if (!analyses) return <p className="text-[14px] text-muted">Loading…</p>;
  return (
    <div className="grid gap-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="flex-1 text-[16px] font-bold">Outcomes</h2>
          <span className="text-[13px] text-muted">Calculated in your browser · free</span>
        </div>
        <p className="mt-1 text-[13.5px] text-muted">One meta-analysis per outcome. Enter each study’s numbers, or bring them in from Extraction, then check the model, the plots and the GRADE certainty.</p>
        {analyses.length > 0 && (
          <div role="tablist" aria-label="Outcomes" className="mt-4 flex flex-wrap gap-2">
            {all.map((analysis) => {
              const label = certainty(analysis.grade).label;
              return (
                <button key={analysis.id} type="button" role="tab" aria-selected={analysis.id === selected} onClick={() => choose(analysis.id)}
                  className={`inline-flex min-h-[38px] max-w-full items-center gap-2 rounded-xl border px-3 text-left text-[14px] font-semibold ${analysis.id === selected ? 'border-brand bg-brand-50 text-brand-600' : 'border-line bg-surface text-ink hover:bg-soft'}`}>
                  <span className="truncate">{analysis.outcome}</span>
                  <span className="shrink-0 text-[12px] font-medium text-muted">{MEASURE_SHORT[analysis.measure]} · {label}</span>
                </button>
              );
            })}
          </div>
        )}
        {canEdit && (analyses.length < maxAnalyses ? <AddOutcome base={base} onCreated={created} /> : <p className="mt-4 text-[13px] text-muted">A review can have up to {maxAnalyses} outcomes.</p>)}
        {!canEdit && !analyses.length && <p className="mt-4 text-[14px] text-muted">No meta-analyses yet.</p>}
      </Card>

      {draft && (
        <OutcomeEditor key={draft.id} draft={draft} setDraft={setDraft} state={state} canEdit={canEdit} rowLimit={rowLimit}
          dirty={dirty} saving={saving} onSave={save} onDelete={remove} />
      )}

      {all.length > 0 && <SummaryOfFindings analyses={all} name={review.title} />}
    </div>
  );
}

function AddOutcome({ base, onCreated }: { base: string; onCreated: (analysis: SavedAnalysis) => void }) {
  const [outcome, setOutcome] = useState('');
  const [dataType, setDataType] = useState<DataType>('binary');
  const [measure, setMeasure] = useState<Measure>('RR');
  const [busy, setBusy] = useState(false);
  const add = async () => {
    if (!outcome.trim()) return;
    setBusy(true);
    try {
      const { analysis } = await api<{ analysis: SavedAnalysis }>(base, { method: 'POST', body: JSON.stringify({ outcome: outcome.trim(), data_type: dataType, measure, model: 'random', method: 'REML' }) });
      setOutcome('');
      onCreated(analysis);
    } catch (caught) { showError(caught); } finally { setBusy(false); }
  };
  return (
    <div className="mt-4 grid gap-2 border-t border-line-2 pt-4 sm:grid-cols-[minmax(0,1fr)_200px_220px_auto] sm:items-end">
      <label className="text-[13px] font-semibold">New outcome<input value={outcome} onChange={(event) => setOutcome(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') add(); }} placeholder="e.g. Mortality at 30 days" className={`${inputClass} mt-1 h-10`} /></label>
      <label className="text-[13px] font-semibold">Data<select value={dataType} onChange={(event) => { const next = event.target.value as DataType; setDataType(next); setMeasure(MEASURES[next][0]); }} className={`${inputClass} mt-1 h-10`}>{DATA_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
      <label className="text-[13px] font-semibold">Effect measure<select value={measure} onChange={(event) => setMeasure(event.target.value as Measure)} className={`${inputClass} mt-1 h-10`}>{MEASURES[dataType].map((item) => <option key={item} value={item}>{MEASURE_LABELS[item]}</option>)}</select></label>
      <Button variant="primary" onClick={add} disabled={busy || !outcome.trim()}>{busy ? <LuLoaderCircle className="h-4 w-4 animate-spin" /> : <LuPlus className="h-4 w-4" />}Add outcome</Button>
    </div>
  );
}

type EditorProps = {
  draft: SavedAnalysis; setDraft: (next: SavedAnalysis) => void; state: ReviewState; canEdit: boolean; rowLimit: number;
  dirty: boolean; saving: boolean; onSave: () => void; onDelete: () => void;
};

function OutcomeEditor({ draft, setDraft, state, canEdit, rowLimit, dirty, saving, onSave, onDelete }: EditorProps) {
  const analysis = useMemo(() => analyse(draft.rows, setupOf(draft)), [draft]);
  const update = (patch: Partial<SavedAnalysis>) => setDraft({ ...draft, ...patch });
  const setRows = (rows: InputRow[]) => update({ rows });
  const fields = FIELDS[draft.data_type];

  const changeType = (dataType: DataType) => {
    const measure = MEASURES[dataType].includes(draft.measure) ? draft.measure : MEASURES[dataType][0];
    update({ data_type: dataType, measure, method: draft.method === 'MH' && dataType !== 'binary' ? 'IV' : draft.method });
  };
  const changeModel = (model: Model) => update({ model, method: model === 'fixed' ? 'IV' : 'REML', hksj: model === 'random' ? draft.hksj : false });
  const methods = METHODS[draft.model].filter((method) => method !== 'MH' || draft.data_type === 'binary');

  return (
    <>
      <Card className="p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[220px] flex-1 text-[13px] font-semibold">Outcome<input value={draft.outcome} disabled={!canEdit} onChange={(event) => update({ outcome: event.target.value })} className={`${inputClass} mt-1 h-10 text-[15px] font-semibold`} /></label>
          {canEdit && <>
            <span className="pb-2.5 text-[13px] text-muted" aria-live="polite">{saving ? 'Saving…' : dirty ? 'Unsaved changes' : 'Saved'}</span>
            <Button variant="primary" onClick={onSave} disabled={saving || !dirty || !draft.outcome.trim()}>{saving && <LuLoaderCircle className="h-4 w-4 animate-spin" />}Save</Button>
            <Button variant="ghost" onClick={onDelete} aria-label="Delete outcome"><LuTrash2 className="h-4 w-4" /></Button>
          </>}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="grid gap-3">
            <label className="text-[13px] font-semibold">Data<select value={draft.data_type} disabled={!canEdit} onChange={(event) => changeType(event.target.value as DataType)} className={`${inputClass} mt-1 h-10`}>{DATA_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
            <p className="-mt-1 text-[12.5px] text-muted">{DATA_TYPES.find((type) => type.value === draft.data_type)?.hint}{draft.data_type === 'generic' && isRatio(draft.measure) ? ' Enter ratios as reported (e.g. 0.75); an SE you give is taken as the SE of the log ratio.' : ''}</p>
            <label className="text-[13px] font-semibold">Effect measure<select value={draft.measure} disabled={!canEdit} onChange={(event) => update({ measure: event.target.value as Measure })} className={`${inputClass} mt-1 h-10`}>{MEASURES[draft.data_type].map((item) => <option key={item} value={item}>{MEASURE_LABELS[item]}</option>)}</select></label>
          </div>
          <div className="grid gap-3">
            <div>
              <p className="text-[13px] font-semibold">Model</p>
              <div className="mt-1">{canEdit ? <Segmented label="Model" value={draft.model} onChange={changeModel} options={[{ value: 'random', label: 'Random effects' }, { value: 'fixed', label: 'Fixed effect' }]} /> : <p className="text-[14px]">{draft.model === 'random' ? 'Random effects' : 'Fixed effect'}</p>}</div>
              <p className="mt-1 text-[12.5px] text-muted">{MODEL_HELP[draft.model]}</p>
            </div>
            <label className="text-[13px] font-semibold">{draft.model === 'random' ? 'Between-study variance' : 'Method'}<select value={draft.method} disabled={!canEdit} onChange={(event) => update({ method: event.target.value as Method })} className={`${inputClass} mt-1 h-10`}>{methods.map((method) => <option key={method} value={method}>{METHOD_LABELS[method]}</option>)}</select></label>
            <p className="-mt-1 text-[12.5px] text-muted">{METHOD_HELP[draft.method]}</p>
            {draft.model === 'random' && (
              <label className="flex items-start gap-2 text-[13.5px]"><input type="checkbox" className="mt-1" checked={draft.hksj} disabled={!canEdit} onChange={(event) => update({ hksj: event.target.checked })} /><span><span className="font-semibold">Hartung-Knapp adjustment</span><span className="block text-[12.5px] text-muted">{HKSJ_HELP}</span></span></label>
            )}
          </div>
        </div>
      </Card>

      <DataGrid draft={draft} analysis={analysis} fields={fields} canEdit={canEdit} rowLimit={rowLimit} state={state} setRows={setRows} />

      <Results analysis={analysis} draft={draft} canEdit={canEdit} update={update} name={state.review.title} />

      <GradePanel analysis={analysis} grade={draft.grade} canEdit={canEdit} state={state} onChange={(grade) => update({ grade })} />
    </>
  );
}

function DataGrid({ draft, analysis, fields, canEdit, rowLimit, state, setRows }: { draft: SavedAnalysis; analysis: Analysis; fields: (typeof FIELDS)[DataType]; canEdit: boolean; rowLimit: number; state: ReviewState; setRows: (rows: InputRow[]) => void }) {
  const rows = draft.rows;
  const setCell = (index: number, patch: Partial<InputRow>) => setRows(rows.map((row, at) => (at === index ? { ...row, ...patch } : row)));
  const status = (index: number) => {
    const error = analysis.errors.find((item) => item.index === index);
    if (error) return <span className="text-red-700">{error.message}</span>;
    const excluded = analysis.excluded.find((item) => item.index === index);
    if (excluded) return <span className="text-muted">{excluded.reason}</span>;
    const at = analysis.studies.findIndex((study) => study.index === index);
    if (at < 0) return null;
    const study = analysis.studies[at];
    return <span className="tabular-nums text-ink-2">{formatEffect(study.yi, draft.measure)} [{formatInterval(study.yi - 1.959963984540054 * study.se, study.yi + 1.959963984540054 * study.se, draft.measure).replace(' to ', ', ')}]{analysis.pooled ? ` · ${analysis.pooled.weights[at].toFixed(1)}%` : ''}{study.corrected ? ' · 0.5 added' : ''}</span>;
  };
  const hasArms = fields.some((field) => field.arm);
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 border-b border-line-2 px-5 py-4">
        <h2 className="flex-1 text-[16px] font-bold">Study data ({rows.length})</h2>
        {canEdit && <Button size="sm" disabled={rows.length >= rowLimit} onClick={() => setRows([...rows, { record_id: null, label: '', subgroup: null }])}><LuPlus className="h-4 w-4" />Add a study</Button>}
      </div>
      {canEdit && <Prefill draft={draft} state={state} rowLimit={rowLimit} setRows={setRows} />}
      {rows.length >= rowLimit && <p className="px-5 pt-3 text-[13px] text-amber-800">Your plan allows up to {rowLimit} studies in one meta-analysis.</p>}
      {rows.length === 0 ? <p className="px-5 py-6 text-[14px] text-muted">No studies yet. Add them from Extraction above, or one by one.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13.5px]">
            <thead>
              {hasArms && (
                <tr className="text-[12px] text-muted">
                  <th colSpan={2} />
                  <th colSpan={fields.filter((field) => field.arm === 1).length} className="border-b border-line-2 px-2 pt-2 text-center font-semibold">Intervention</th>
                  <th colSpan={fields.filter((field) => field.arm === 2).length} className="border-b border-line-2 px-2 pt-2 text-center font-semibold">Comparison</th>
                  <th colSpan={2} />
                </tr>
              )}
              <tr className="text-left text-[12.5px] text-muted">
                <th className="px-3 py-2 pl-5 font-medium">Study</th>
                <th className="px-2 py-2 font-medium">Subgroup</th>
                {fields.map((field) => <th key={field.field} className="px-1 py-2 text-right font-medium">{field.label}{draft.data_type === 'generic' && field.field === 'se' && isRatio(draft.measure) ? ' (log)' : ''}</th>)}
                <th className="min-w-[180px] px-3 py-2 font-medium">{MEASURE_SHORT[draft.measure]} [95% CI] · weight</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${index}-${row.record_id ?? ''}`} className="border-t border-line-2 align-top">
                  <td className="py-1.5 pl-5 pr-2"><input aria-label={`Study ${index + 1}`} value={row.label} disabled={!canEdit} onChange={(event) => setCell(index, { label: event.target.value })} placeholder="Author year" className="h-9 w-[180px] rounded-lg border border-line bg-surface px-2 text-[13.5px] text-ink focus:border-brand focus:outline-none" /></td>
                  <td className="px-2 py-1.5"><input aria-label={`Subgroup of study ${index + 1}`} value={row.subgroup ?? ''} disabled={!canEdit} onChange={(event) => setCell(index, { subgroup: event.target.value || null })} className="h-9 w-[120px] rounded-lg border border-line bg-surface px-2 text-[13.5px] text-ink focus:border-brand focus:outline-none" /></td>
                  {fields.map((field) => (
                    <td key={field.field} className="px-1 py-1.5"><NumCell value={row[field.field]} disabled={!canEdit} label={`${field.label}${field.arm ? (field.arm === 1 ? ' (intervention)' : ' (comparison)') : ''} for ${row.label || `study ${index + 1}`}`} onChange={(value) => setCell(index, { [field.field]: value } as Partial<InputRow>)} /></td>
                  ))}
                  <td className="px-3 py-2.5 text-[12.5px]">{status(index)}</td>
                  <td className="py-1.5 pr-3">{canEdit && <Button size="sm" variant="ghost" aria-label={`Remove ${row.label || `study ${index + 1}`}`} onClick={() => setRows(rows.filter((_, at) => at !== index))}><LuTrash2 className="h-4 w-4" /></Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function Prefill({ draft, state, rowLimit, setRows }: { draft: SavedAnalysis; state: ReviewState; rowLimit: number; setRows: (rows: InputRow[]) => void }) {
  const records = useMemo(() => included(state.records), [state.records]);
  const columns = useMemo(() => state.review.extraction_columns.map((column) => ({ ...column, numeric: looksNumeric(records.map((record) => record.extraction?.[column.id]?.value)) })), [state.review.extraction_columns, records]);
  const numeric = columns.filter((column) => column.numeric);
  const [mapping, setMapping] = useState<Partial<Record<NumberField, string>>>({});
  const [subgroupColumn, setSubgroupColumn] = useState('');
  const fields = FIELDS[draft.data_type];

  const apply = () => {
    const value = (record: (typeof records)[number], field: NumberField) => {
      const column = mapping[field];
      return column ? parseNumber(record.extraction?.[column]?.value) : null;
    };
    let added = 0;
    let filled = 0;
    const next = draft.rows.map((row) => {
      const record = row.record_id ? records.find((item) => item.id === row.record_id) : undefined;
      if (!record) return row;
      const patch: Partial<InputRow> = {};
      for (const { field } of fields) if ((row[field] === null || row[field] === undefined) && value(record, field) !== null) { patch[field] = value(record, field); filled += 1; }
      if (!row.subgroup && subgroupColumn && record.extraction?.[subgroupColumn]?.value) patch.subgroup = record.extraction[subgroupColumn].value.slice(0, 80);
      return { ...row, ...patch };
    });
    for (const record of records) {
      if (next.length >= rowLimit) break;
      if (next.some((row) => row.record_id === record.id)) continue;
      const row: InputRow = { record_id: record.id, label: shortCite(record), subgroup: subgroupColumn ? record.extraction?.[subgroupColumn]?.value?.slice(0, 80) || null : null };
      for (const { field } of fields) row[field] = value(record, field);
      next.push(row);
      added += 1;
    }
    setRows(next);
    toast(`${added} ${added === 1 ? 'study' : 'studies'} added${filled ? `, ${filled} empty cells filled` : ''}. Check every number against the report.`);
  };

  if (!records.length) return <p className="px-5 pt-3 text-[13px] text-muted">Studies you include at full text can be brought in from Extraction.</p>;
  return (
    <details className="border-b border-line-2 px-5 py-3">
      <summary className="cursor-pointer text-[14px] font-semibold text-brand">Fill from included studies ({records.length})</summary>
      <p className="mt-2 text-[13px] text-muted">Choose which extraction column feeds each input. Only columns whose values look numeric are offered; the first number in each cell is used. Studies already here keep what you typed: only empty cells are filled.</p>
      {numeric.length === 0 && <p className="mt-2 text-[13px] text-amber-800">No extraction column looks numeric yet. Add columns such as “Events (intervention)” in Extraction, or type the numbers here.</p>}
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map(({ field, label, arm }) => (
          <label key={field} className="text-[12.5px] font-semibold">{label}{arm ? ` (${arm === 1 ? 'intervention' : 'comparison'})` : ''}
            <select value={mapping[field] ?? ''} onChange={(event) => setMapping({ ...mapping, [field]: event.target.value })} className={`${inputClass} mt-1 h-9 text-[13.5px]`}>
              <option value="">Leave empty</option>
              {numeric.map((column) => <option key={column.id} value={column.id}>{column.label}</option>)}
            </select>
          </label>
        ))}
        <label className="text-[12.5px] font-semibold">Subgroup
          <select value={subgroupColumn} onChange={(event) => setSubgroupColumn(event.target.value)} className={`${inputClass} mt-1 h-9 text-[13.5px]`}>
            <option value="">None</option>
            {columns.map((column) => <option key={column.id} value={column.id}>{column.label}</option>)}
          </select>
        </label>
      </div>
      <Button size="sm" className="mt-3" onClick={apply}>Add included studies</Button>
    </details>
  );
}

function Results({ analysis, draft, canEdit, update, name }: { analysis: Analysis; draft: SavedAnalysis; canEdit: boolean; update: (patch: Partial<SavedAnalysis>) => void; name: string }) {
  const forest = useRef<SVGSVGElement>(null);
  const funnel = useRef<SVGSVGElement>(null);
  const { pooled } = analysis;
  const m = draft.measure;
  const file = `${slug(name)}-${slug(draft.outcome)}`;
  const sentences = resultSentences(analysis, draft.outcome);
  if (!pooled) {
    return <Card className="px-5 py-6 text-[14px] text-muted">{analysis.errors.length ? 'Fix the rows marked in red to see results.' : 'Enter the numbers for at least one study to see results.'}</Card>;
  }
  const stat = (label: string, value: string) => <div className="rounded-xl bg-soft px-3 py-2"><p className="text-[12px] text-muted">{label}</p><p className="text-[15px] font-semibold tabular-nums">{value}</p></div>;
  return (
    <>
      <Card className="p-5">
        <h2 className="text-[16px] font-bold">Result</h2>
        <p className="mt-2 text-[22px] font-bold tabular-nums">{MEASURE_SHORT[m]} {formatEffect(pooled.estimate, m)} <span className="text-[16px] font-semibold text-ink-2">(95% CI {formatInterval(pooled.lower, pooled.upper, m)})</span></p>
        <p className="text-[13.5px] text-muted">{formatPValue(pooled.p)} · {pooled.k} {pooled.k === 1 ? 'study' : 'studies'}{analysis.participants ? ` · ${analysis.participants.toLocaleString('en-US')} participants` : ''}{analysis.events !== null ? ` · ${analysis.events.toLocaleString('en-US')} events` : ''} · {pooled.model === 'fixed' ? 'fixed effect' : 'random effects'}, {METHOD_LABELS[pooled.method]}{pooled.hksj ? ', Hartung-Knapp' : ''}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {stat('I²', pooled.k > 1 ? `${pooled.I2.toFixed(1)}%` : '—')}
          {stat('Q (df)', pooled.k > 1 ? `${pooled.Q.toFixed(2)} (${pooled.df})` : '—')}
          {stat('Heterogeneity p', pooled.k > 1 ? formatPValue(pooled.pQ).replace('p ', '').replace('= ', '') : '—')}
          {stat('tau²', pooled.model === 'random' ? pooled.tau2.toFixed(4) : '—')}
          {stat('Prediction interval', pooled.prediction ? formatInterval(pooled.prediction[0], pooled.prediction[1], m) : pooled.model === 'random' ? 'Needs 3+ studies' : 'Random effects only')}
          {stat(pooled.df_test ? `t (${pooled.df_test} df)` : 'z', pooled.statistic.toFixed(2))}
        </div>
        {[...pooled.warnings, ...(analysis.excluded.filter((item) => item.reason.includes('arm')).map((item) => `${item.label}: ${item.reason}`))].map((warning) => <p key={warning} className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-800">{warning}</p>)}
        {analysis.errors.length > 0 && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">{analysis.errors.length} {analysis.errors.length === 1 ? 'row has' : 'rows have'} a problem and {analysis.errors.length === 1 ? 'is' : 'are'} left out until fixed.</p>}
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="flex-1 text-[16px] font-bold">Forest plot</h2>
          <Button size="sm" onClick={() => forest.current && downloadSvg(forest.current, 'svg', `${file}-forest`)}><LuDownload className="h-4 w-4" />SVG</Button>
          <Button size="sm" onClick={() => forest.current && downloadSvg(forest.current, 'png', `${file}-forest`).catch(showError)}><LuDownload className="h-4 w-4" />PNG</Button>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="text-[12.5px] font-semibold">Left of the line<input value={draft.favours.left} disabled={!canEdit} maxLength={80} onChange={(event) => update({ favours: { ...draft.favours, left: event.target.value } })} className={`${inputClass} mt-1 h-9 text-[13.5px]`} /></label>
          <label className="text-[12.5px] font-semibold">Right of the line<input value={draft.favours.right} disabled={!canEdit} maxLength={80} onChange={(event) => update({ favours: { ...draft.favours, right: event.target.value } })} className={`${inputClass} mt-1 h-9 text-[13.5px]`} /></label>
        </div>
        <p className="mt-1 text-[12.5px] text-muted">Values {isRatio(m) ? 'below 1' : 'below 0'} are on the left. Which side favours which arm depends on whether the outcome is good or bad, so check these labels.</p>
        <div className="mt-4 overflow-x-auto"><div className="min-w-[760px]"><ForestPlot ref={forest} analysis={analysis} rows={draft.rows} outcome={draft.outcome} favours={draft.favours} /></div></div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="flex-1 text-[16px] font-bold">Funnel plot and Egger’s test</h2>
          <Button size="sm" onClick={() => funnel.current && downloadSvg(funnel.current, 'svg', `${file}-funnel`)}><LuDownload className="h-4 w-4" />SVG</Button>
          <Button size="sm" onClick={() => funnel.current && downloadSvg(funnel.current, 'png', `${file}-funnel`).catch(showError)}><LuDownload className="h-4 w-4" />PNG</Button>
        </div>
        {analysis.egger ? (
          <p className="mt-1 text-[13.5px] text-ink-2">Egger’s intercept {analysis.egger.intercept.toFixed(2)} (SE {analysis.egger.se.toFixed(2)}), t({analysis.egger.df}) = {analysis.egger.t.toFixed(2)}, {formatPValue(analysis.egger.p)}.</p>
        ) : <p className="mt-1 text-[13.5px] text-muted">Egger’s test needs at least 3 studies.</p>}
        {(analysis.egger?.warning || pooled.k < 3) && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-800">{analysis.egger?.warning ?? 'With fewer than 10 studies, funnel asymmetry can’t be assessed reliably.'}</p>}
        <div className="mt-4 overflow-x-auto"><div className="min-w-[420px] max-w-[600px]"><FunnelPlot ref={funnel} analysis={analysis} outcome={draft.outcome} /></div></div>
      </Card>

      {analysis.subgroups && (
        <Card>
          <h2 className="border-b border-line-2 px-5 py-4 text-[16px] font-bold">Subgroups</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-[13.5px]">
              <thead><tr className="text-left text-[12.5px] text-muted"><th className="px-5 py-2 font-medium">Subgroup</th><th className="px-2 py-2 font-medium">Studies</th><th className="px-2 py-2 font-medium">{MEASURE_SHORT[m]} (95% CI)</th><th className="px-2 py-2 font-medium">p</th><th className="px-2 py-2 font-medium">I²</th><th className="px-2 py-2 font-medium">tau²</th></tr></thead>
              <tbody>
                {analysis.subgroups.groups.map((group) => (
                  <tr key={group.name} className="border-t border-line-2 tabular-nums"><td className="px-5 py-2 font-semibold">{group.name}</td><td className="px-2 py-2">{group.pooled.k}</td><td className="px-2 py-2">{formatEffect(group.pooled.estimate, m)} ({formatInterval(group.pooled.lower, group.pooled.upper, m)})</td><td className="px-2 py-2">{formatPValue(group.pooled.p)}</td><td className="px-2 py-2">{group.pooled.k > 1 ? `${group.pooled.I2.toFixed(0)}%` : '—'}</td><td className="px-2 py-2">{group.pooled.model === 'random' ? group.pooled.tau2.toFixed(3) : '—'}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-5 py-3 text-[13.5px]">Test for subgroup differences: Q = {analysis.subgroups.Q.toFixed(2)}, df = {analysis.subgroups.df}, {formatPValue(analysis.subgroups.p)}. <span className="text-muted">Subgroup comparisons are observational, even within randomised trials.</span></p>
        </Card>
      )}

      {analysis.leaveOneOut.length > 0 && (
        <Card>
          <details>
            <summary className="cursor-pointer px-5 py-4 text-[16px] font-bold">Leave-one-out sensitivity analysis</summary>
            <div className="overflow-x-auto border-t border-line-2">
              <table className="w-full text-[13.5px]">
                <thead><tr className="text-left text-[12.5px] text-muted"><th className="px-5 py-2 font-medium">Omitting</th><th className="px-2 py-2 font-medium">{MEASURE_SHORT[m]} (95% CI)</th><th className="px-2 py-2 font-medium">p</th><th className="px-2 py-2 font-medium">I²</th></tr></thead>
                <tbody>
                  {analysis.leaveOneOut.map((item) => {
                    const crosses = item.lower <= 0 && item.upper >= 0;
                    const changed = crosses !== (pooled.lower <= 0 && pooled.upper >= 0);
                    return <tr key={item.index} className={`border-t border-line-2 tabular-nums ${changed ? 'bg-amber-50 text-amber-900' : ''}`}><td className="px-5 py-2">{item.label}</td><td className="px-2 py-2">{formatEffect(item.estimate, m)} ({formatInterval(item.lower, item.upper, m)}){changed ? ' · conclusion changes' : ''}</td><td className="px-2 py-2">{formatPValue(item.p)}</td><td className="px-2 py-2">{item.I2.toFixed(0)}%</td></tr>;
                  })}
                </tbody>
              </table>
            </div>
          </details>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="flex-1 text-[16px] font-bold">Results in words</h2>
          <Button size="sm" onClick={() => navigator.clipboard.writeText(sentences.join(' ')).then(() => toast.success('Copied'))}><LuCopy className="h-4 w-4" />Copy</Button>
        </div>
        <p className="mt-3 text-[15px] leading-relaxed">{sentences.join(' ')}</p>
        <p className="mt-2 text-[12.5px] text-muted">Written from the numbers above by fixed rules, not by AI. Add your interpretation and the GRADE certainty.</p>
      </Card>
    </>
  );
}

function GradePanel({ analysis, grade, canEdit, state, onChange }: { analysis: Analysis; grade: Grade; canEdit: boolean; state: ReviewState; onChange: (grade: Grade) => void }) {
  const rob = useMemo(() => new Map(state.records.map((record) => [record.id, record.rob])), [state.records]);
  const hints = gradeHints(analysis, rob, grade.design);
  const result = certainty(grade);
  const setDown = (id: keyof Grade['downgrade'], patch: Partial<Judgement>) => onChange({ ...grade, downgrade: { ...grade.downgrade, [id]: { ...grade.downgrade[id], ...patch } } });
  const setUp = (id: keyof Grade['upgrade'], patch: Partial<Judgement>) => onChange({ ...grade, upgrade: { ...grade.upgrade, [id]: { ...grade.upgrade[id], ...patch } } });
  const domain = (id: string, label: string, judgement: Judgement, options: string[], set: (patch: Partial<Judgement>) => void) => (
    <div key={id} className="border-t border-line-2 py-3 first:border-t-0">
      <div className="grid gap-2 sm:grid-cols-[200px_200px_minmax(0,1fr)] sm:items-start">
        <p className="pt-2 text-[14px] font-semibold">{label}</p>
        <select aria-label={label} value={judgement.level} disabled={!canEdit} onChange={(event) => set({ level: Number(event.target.value) as Judgement['level'] })} className={`${inputClass} h-9 text-[13.5px]`}>
          {options.map((option, level) => <option key={option} value={level}>{option}</option>)}
        </select>
        <input aria-label={`Reason for ${label}`} value={judgement.reason} disabled={!canEdit} maxLength={1000} onChange={(event) => set({ reason: event.target.value })} placeholder="Reason" className={`${inputClass} h-9 text-[13.5px]`} />
      </div>
      {hints[id as keyof typeof hints]?.map((hint) => <p key={hint} className="mt-1.5 text-[12.5px] text-muted sm:ml-[208px]">Suggestion: {hint}</p>)}
    </div>
  );
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="flex-1 text-[16px] font-bold">GRADE certainty of evidence</h2>
        <StatusPill tone={CERTAINTY_TONE[result.label]}>{result.label[0].toUpperCase() + result.label.slice(1)}</StatusPill>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {canEdit ? <Segmented label="Study design" value={grade.design} onChange={(design) => onChange({ ...grade, design })} options={[{ value: 'randomised', label: 'Randomised trials' }, { value: 'observational', label: 'Observational studies' }]} /> : <p className="text-[14px]">{grade.design === 'randomised' ? 'Randomised trials' : 'Observational studies'}</p>}
        <p className="text-[13px] text-muted">Starts at {result.start}. {CERTAINTY.slice().reverse().join(' · ')}</p>
      </div>
      <p className="mt-2 text-[12.5px] text-muted">Suggestions come from the numbers and the Extraction ratings. They are prompts for the review team, not decisions: you set each judgement.</p>
      <h3 className="mt-4 text-[13px] font-semibold uppercase tracking-wide text-muted">Reasons to rate down</h3>
      <div className="mt-1">{DOWNGRADE_DOMAINS.map(([id, label]) => domain(id, label, grade.downgrade[id], LEVEL_LABELS, (patch) => setDown(id, patch)))}</div>
      {grade.design === 'observational' && <>
        <h3 className="mt-4 text-[13px] font-semibold uppercase tracking-wide text-muted">Reasons to rate up</h3>
        <div className="mt-1">{UPGRADE_DOMAINS.map(([id, label]) => domain(id, label, grade.upgrade[id], id === 'large_effect' ? ['No', 'Large (+1)', 'Very large (+2)'] : ['No', 'Yes (+1)'], (patch) => setUp(id, patch)))}</div>
      </>}
    </Card>
  );
}

function SummaryOfFindings({ analyses, name }: { analyses: SavedAnalysis[]; name: string }) {
  const rows = useMemo(() => analyses.map((analysis) => summaryRow(analysis.outcome, analyse(analysis.rows, setupOf(analysis)), analysis.grade)), [analyses]);
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 border-b border-line-2 px-5 py-4">
        <h2 className="flex-1 text-[16px] font-bold">Summary of findings</h2>
        <Button size="sm" onClick={() => download(sofCsvFor(analyses), `${slug(name)}-summary-of-findings.csv`, 'text/csv;charset=utf-8')}><LuDownload className="h-4 w-4" />CSV</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13.5px]">
          <thead><tr className="text-left text-[12.5px] text-muted"><th className="px-5 py-2 font-medium">Outcome</th><th className="px-2 py-2 font-medium">Studies</th><th className="px-2 py-2 font-medium">Participants</th><th className="px-2 py-2 font-medium">Effect (95% CI)</th><th className="px-2 py-2 font-medium">Certainty</th><th className="px-2 py-2 pr-5 font-medium">Reasons</th></tr></thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-t border-line-2 align-top">
                <td className="px-5 py-2 font-semibold">{row.outcome}</td>
                <td className="px-2 py-2 tabular-nums">{row.studies}</td>
                <td className="px-2 py-2 tabular-nums">{row.participants?.toLocaleString('en-US') ?? '—'}</td>
                <td className="px-2 py-2 tabular-nums">{row.effect}</td>
                <td className="px-2 py-2"><StatusPill tone={CERTAINTY_TONE[row.certainty]}>{row.certainty}</StatusPill></td>
                <td className="min-w-[240px] px-2 py-2 pr-5 text-[12.5px] text-ink-2">{row.reasons}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-5 py-3 text-[12.5px] text-muted">Includes unsaved changes to the outcome open above. Participants are counted from the studies with arm totals.</p>
    </Card>
  );
}
