'use client';

import { useState } from 'react';
import { Button, inputClass } from '@/components/app/ui';
import { readWorkflowTable, transcriptExcerpts, workflowSectionCsv, type ImportTable } from '@/lib/workflowFiles';
import { validateEntry, type Workbook, type WorkflowSection } from '@/lib/workflows';

type Props = { workbook: Workbook; busy: boolean; save: (path: string, body: Record<string, unknown>) => Promise<boolean> };
const label = 'grid gap-1.5 text-sm font-semibold';
const normal = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const download = (filename: string, text: string) => { const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };

export function WorkbookTableImport({ workbook, section, busy, save }: Props & { section: WorkflowSection }) {
  const [table, setTable] = useState<ImportTable | null>(null);
  const [mapping, setMapping] = useState<string[]>([]);
  const [sourceId, setSourceId] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{ revision: number; values: Record<string, string>[]; errors: string[] } | null>(null);
  const read = async (file: File | undefined) => {
    if (!file) return;
    setError(''); setPreview(null); setTable(null);
    try {
      if (file.size > 1_000_000) throw new Error('Choose a CSV or TSV file under 1 MB.');
      const parsed = readWorkflowTable(await file.text());
      setTable(parsed); setMapping(parsed.headers.map((header) => section.fields.find((field) => [field.key, field.label].some((name) => normal(name) === normal(header)))?.key || ''));
    } catch (e) { setError((e as Error).message); }
  };
  const prepare = () => {
    if (!table) return; setError('');
    if (mapping.some((key) => !key)) { setError('Map every column, or explicitly choose to omit it.'); return; }
    const fields = mapping.filter((key) => key !== '__omit__');
    if (!fields.length || new Set(fields).size !== fields.length) { setError('Map at least one field, and use each field only once.'); return; }
    const errors: string[] = [];
    const values = table.rows.map((row, index) => {
      const raw = Object.fromEntries(row.flatMap((value, column) => mapping[column] === '__omit__' ? [] : [[mapping[column], value]]));
      if (sourceId && !raw.source_id) raw.source_id = sourceId;
      try { return validateEntry(workbook.kind, section.key, raw, workbook.entries); }
      catch (e) { errors.push(`Data row ${index + 1}: ${(e as Error).message}`); return raw; }
    });
    if (values.length + workbook.entries.length > 500) errors.push('This import exceeds the workbook’s 500-entry capacity. Split the work into another workbook.');
    setPreview({ revision: workbook.revision, values, errors });
  };
  return <details className="mb-5 rounded-2xl border border-line bg-surface p-5"><summary className="cursor-pointer font-semibold">Import {section.title.toLowerCase()} from CSV or TSV</summary>
    <p className="mt-3 text-sm leading-relaxed text-muted">Map the columns and inspect every row before saving. All rows are saved together, or none are saved. Imports add entries; they never overwrite existing entries.</p>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    <div className="mt-4 flex flex-wrap items-end gap-3"><label className={`${label} min-w-0 flex-1`}>Choose a table<input disabled={busy} type="file" accept=".csv,.tsv" className="min-h-11 text-sm" onChange={(e) => { void read(e.target.files?.[0]); e.target.value = ''; }} /></label><Button size="sm" onClick={() => download(`${section.key}-template.csv`, workflowSectionCsv(workbook, section.key, true))}>Download column template</Button><Button size="sm" onClick={() => download(`${section.key}.csv`, workflowSectionCsv(workbook, section.key))}>Export this section</Button></div>
    {table && <>
      <p className="mt-3 text-sm text-muted">{table.rows.length} data rows · {table.headers.length} columns{table.empty_rows ? ` · ${table.empty_rows} empty records omitted` : ''}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{table.headers.map((header, index) => <label key={index} className={label}>{header}<select disabled={busy} className={inputClass} value={mapping[index] || ''} onChange={(e) => { setMapping(mapping.map((key, i) => i === index ? e.target.value : key)); setPreview(null); }}><option value="">Choose a field…</option><option value="__omit__">Omit this column from the import</option>{section.fields.map((field) => <option value={field.key} key={field.key}>{field.label}{field.required ? ' *' : ''}</option>)}</select></label>)}</div>
      {section.fields.some((field) => field.type === 'source') && <label className={`${label} mt-3`}>Supporting source for rows without a source ID<select disabled={busy} className={inputClass} value={sourceId} onChange={(e) => { setSourceId(e.target.value); setPreview(null); }}><option value="">No default source</option>{workbook.entries.filter((entry) => entry.section === 'sources').map((entry) => <option value={entry.id} key={entry.id}>{entry.values.title}</option>)}</select></label>}
      <Button className="mt-3" disabled={busy} onClick={prepare}>Validate and preview all rows</Button>
    </>}
    {preview && <div className="mt-4 border-t border-line pt-4">
      <p className="font-semibold">Preview · {preview.values.length} rows · workbook revision {preview.revision}</p>
      {mapping.includes('__omit__') && <p className="mt-1 text-sm text-muted">Omitted by your mapping: {table?.headers.filter((_, index) => mapping[index] === '__omit__').join(', ')}</p>}
      {preview.errors.length > 0 && <ul role="alert" className="mt-2 max-h-48 list-disc overflow-y-auto pl-5 text-sm text-red-700">{preview.errors.map((message, index) => <li key={index}>{message}</li>)}</ul>}
      <div className="mt-3 max-h-96 overflow-auto rounded-xl border border-line"><table className="w-full text-left text-xs"><thead><tr><th className="p-2">Row</th>{section.fields.map((field) => <th key={field.key} className="min-w-32 p-2">{field.label}</th>)}</tr></thead><tbody>{preview.values.map((values, index) => <tr key={index} className="border-t border-line"><th className="p-2 align-top">{index + 1}</th>{section.fields.map((field) => <td key={field.key} className="max-w-sm whitespace-pre-wrap break-words p-2 align-top">{values[field.key] || '—'}</td>)}</tr>)}</tbody></table></div>
      <Button className="mt-3" variant="primary" disabled={busy || preview.errors.length > 0 || preview.revision !== workbook.revision} onClick={() => void save('/import-entries', { revision: preview.revision, section: section.key, rows: preview.values }).then((ok) => { if (ok) { setPreview(null); setTable(null); } })}>Import {preview.values.length} rows</Button>
      {preview.revision !== workbook.revision && <p role="status" className="mt-2 text-sm text-amber-700">The workbook changed. Validate again against its current sources before importing.</p>}
    </div>}
  </details>;
}

export function TranscriptExcerptImport({ workbook, busy, save }: Props) {
  const sources = workbook.entries.filter((entry) => entry.section === 'sources' && entry.values.kind === 'transcript');
  const [sourceId, setSourceId] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{ revision: number; values: Record<string, string>[]; omitted: number; selected: boolean[] } | null>(null);
  if (!sources.length) return null;
  const prepare = () => {
    setError(''); setPreview(null);
    try { const source = sources.find((item) => item.id === sourceId); if (!source) throw new Error('Choose a transcript.'); const parsed = transcriptExcerpts(source); setPreview({ revision: workbook.revision, values: parsed.values, omitted: parsed.blank_lines + parsed.cue_lines, selected: parsed.values.map(() => true) }); }
    catch (e) { setError((e as Error).message); }
  };
  const count = preview?.selected.filter(Boolean).length || 0;
  return <details className="mb-5 rounded-2xl border border-line bg-surface p-5"><summary className="cursor-pointer font-semibold">Create excerpts from transcript lines</summary><p className="mt-3 text-sm text-muted">Save the transcript source first. Each spoken line keeps its exact text, speaker label when present, line number and subtitle timestamp. Codes and interpretations remain for you to add.</p>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    <label className={`${label} mt-3`}>Transcript<select disabled={busy} value={sourceId} className={inputClass} onChange={(e) => { setSourceId(e.target.value); setPreview(null); }}><option value="">Choose a saved transcript</option>{sources.map((source) => <option value={source.id} key={source.id}>{source.values.title}</option>)}</select></label><Button className="mt-3" disabled={busy || !sourceId} onClick={prepare}>Preview lines</Button>
    {preview && <><p className="mt-3 text-sm text-muted">{preview.values.length} spoken lines · {preview.omitted} blank or subtitle-control lines omitted · {count} selected</p><div className="mt-3 grid max-h-96 gap-3 overflow-y-auto">{preview.values.map((values, index) => <div key={index} className="rounded-xl border border-line p-3"><label className="flex items-center gap-2 text-sm font-semibold"><input disabled={busy} type="checkbox" checked={preview.selected[index]} onChange={(e) => setPreview({ ...preview, selected: preview.selected.map((value, i) => i === index ? e.target.checked : value) })} />{values.locator}</label><p className="mt-2 whitespace-pre-wrap text-sm">{values.quote}</p><label className={`${label} mt-2`}>Speaker (optional)<input disabled={busy} maxLength={1000} className={inputClass} value={values.speaker} onChange={(e) => setPreview({ ...preview, values: preview.values.map((value, i) => i === index ? { ...value, speaker: e.target.value } : value) })} /></label></div>)}</div><Button className="mt-3" variant="primary" disabled={busy || !count || count + workbook.entries.length > 500 || preview.revision !== workbook.revision} onClick={() => void save('/import-entries', { revision: preview.revision, section: 'excerpts', rows: preview.values.filter((_, index) => preview.selected[index]) }).then((ok) => { if (ok) setPreview(null); })}>Save {count} excerpts</Button>{preview.revision !== workbook.revision && <p className="mt-2 text-sm text-amber-700">The workbook changed. Preview the current transcript again before saving.</p>}{count + workbook.entries.length > 500 && <p className="mt-2 text-sm text-red-700">This selection exceeds the workbook’s 500-entry capacity.</p>}</>}
  </details>;
}
