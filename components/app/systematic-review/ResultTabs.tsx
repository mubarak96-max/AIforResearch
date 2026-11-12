'use client';

/** The Extraction and Report tabs of a systematic review. */
import { useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { LuDownload, LuLoaderCircle, LuPlus, LuSparkles } from 'react-icons/lu';
import { api } from '@/lib/session';
import { Button, Card, inputClass } from '@/components/app/ui';
import { CitedMarkdown, CreditCost, creditsChanged, showError } from '@/components/app/research/parts';
import { downloadFile } from './client';
import { PrismaDiagram, downloadPrisma } from './Prisma';
import type { ReviewState, SrRecord } from './types';

const ROB = [['randomisation', 'Randomisation'], ['allocation', 'Allocation concealment'], ['blinding', 'Blinding']] as const;
const ROB_VALUES = ['low', 'some concerns', 'high', 'unclear', 'not applicable'];

const included = (records: SrRecord[]) => records.filter((record) => !record.duplicate_of && record.full_state?.status === 'final' && record.full_state.decision === 'include');
const shortCite = (record: SrRecord) => `${record.authors[0]?.split(/\s+/).pop() ?? 'Unknown'}${record.authors.length > 1 ? ' et al.' : ''} ${record.year ?? 'n.d.'}`;

function Cell({ record, column, canEdit, onSave }: { record: SrRecord; column: { id: string; label: string }; canEdit: boolean; onSave: (value: string) => void }) {
  const cell = record.extraction?.[column.id];
  const [value, setValue] = useState(cell?.value ?? '');
  return (
    <td className="min-w-[180px] border-t border-line-2 px-2 py-1.5 align-top">
      <textarea aria-label={`${column.label} for ${shortCite(record)}`} value={value} disabled={!canEdit} rows={2} onChange={(event) => setValue(event.target.value)}
        onBlur={() => { if (value !== (cell?.value ?? '')) onSave(value); }} className="w-full resize-y rounded-md border border-transparent bg-transparent px-1.5 py-1 text-[13.5px] hover:border-line focus:border-brand focus:outline-none" />
      {cell?.ai && cell.quote && <p className="px-1.5 text-[12px] italic text-muted" title="The words in the abstract this came from">“{cell.quote}”</p>}
    </td>
  );
}

export function ExtractionTab({ state, reload }: { state: ReviewState; reload: () => Promise<void> }) {
  const { review, can_edit: canEdit } = state;
  const rows = useMemo(() => included(state.records), [state.records]);
  const [busy, setBusy] = useState(false);
  const [newColumn, setNewColumn] = useState('');
  const columns = review.extraction_columns;
  const pending = rows.filter((record) => !Object.values(record.extraction ?? {}).some((cell) => cell.ai)).length;

  const save = async (record: SrRecord, values: Record<string, string>, rob: Record<string, string> = {}) => {
    try {
      await api(`/api/systematic-reviews/${review.id}/records/${record.id}`, { method: 'PATCH', body: JSON.stringify({ values, rob }) });
    } catch (error) { showError(error); }
  };
  const fill = async () => {
    setBusy(true);
    try {
      const result = await api<{ filled: number }>(`/api/systematic-reviews/${review.id}/extract/ai`, { method: 'POST', body: JSON.stringify({ limit: 10 }) });
      toast.success(`${result.filled} studies filled from their abstracts. Check each against the full text.`);
      await reload();
    } catch (error) { showError(error); } finally { setBusy(false); creditsChanged(); }
  };
  const addColumn = async () => {
    const labelText = newColumn.trim();
    if (!labelText) return;
    const id = `c_${labelText.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30)}_${Date.now().toString(36).slice(-4)}`;
    try {
      await api(`/api/systematic-reviews/${review.id}`, { method: 'PATCH', body: JSON.stringify({ extraction_columns: [...columns, { id, label: labelText, custom: true }] }) });
      setNewColumn('');
      await reload();
    } catch (error) { showError(error); }
  };

  if (!rows.length) {
    return <Card className="px-5 py-8 text-center text-[15px] text-muted">Studies you include at full text appear here, ready for data extraction.</Card>;
  }
  return (
    <div className="grid gap-4">
      {canEdit && (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" onClick={fill} disabled={busy || !pending}>{busy ? <LuLoaderCircle className="h-4 w-4 animate-spin" /> : <LuSparkles className="h-4 w-4" />}{pending ? `Fill the next ${Math.min(10, pending)} with AI` : 'All studies filled'}</Button>
          {pending > 0 && <CreditCost credits={3} />}
          <div className="ml-auto flex items-center gap-2">
            <input value={newColumn} onChange={(event) => setNewColumn(event.target.value)} placeholder="New column, e.g. Follow-up" className={`${inputClass} h-10 w-56`} aria-label="New column" />
            <Button onClick={addColumn} disabled={!newColumn.trim()}><LuPlus className="h-4 w-4" />Add column</Button>
          </div>
        </div>
      )}
      <p className="text-[13.5px] text-muted">AI values come from the abstract only, with the words they are based on. Check them against the full text; anything you type is never overwritten.</p>
      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="text-[13.5px]">
          <thead>
            <tr className="bg-soft text-left text-[12.5px] text-muted">
              <th className="sticky left-0 z-10 min-w-[220px] bg-soft px-3 py-2 font-medium">Study</th>
              {columns.map((column) => <th key={column.id} className="px-3 py-2 font-medium">{column.label}</th>)}
              {ROB.map(([, name]) => <th key={name} className="px-3 py-2 font-medium">{name}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((record) => (
              <tr key={record.id}>
                <td className="sticky left-0 z-10 border-t border-line-2 bg-surface px-3 py-2 align-top">
                  <p className="font-semibold text-ink">{shortCite(record)}</p>
                  <p className="line-clamp-3 text-[12.5px] text-muted">{record.title}</p>
                </td>
                {columns.map((column) => <Cell key={column.id} record={record} column={column} canEdit={canEdit} onSave={(value) => save(record, { [column.id]: value })} />)}
                {ROB.map(([key, name]) => (
                  <td key={key} className="border-t border-line-2 px-2 py-1.5 align-top">
                    <select aria-label={`${name} for ${shortCite(record)}`} disabled={!canEdit} defaultValue={record.rob?.[key] ?? ''} onChange={(event) => save(record, {}, { [key]: event.target.value })} className="h-8 rounded-md border border-line px-1.5 text-[13px]">
                      <option value="">Not rated</option>{ROB_VALUES.map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ReportTab({ state, reload }: { state: ReviewState; reload: () => Promise<void> }) {
  const { review, prisma, can_edit: canEdit } = state;
  const svg = useRef<SVGSVGElement>(null);
  const [methods, setMethods] = useState(review.methods);
  const [busy, setBusy] = useState(false);
  const rows = useMemo(() => included(state.records), [state.records]);
  const name = review.title.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'review';
  const keyColumns = review.extraction_columns.slice(0, 4);

  const draft = async () => {
    setBusy(true);
    try {
      const result = await api<{ methods: string }>(`/api/systematic-reviews/${review.id}/methods/draft`, { method: 'POST' });
      setMethods(result.methods);
      await reload();
    } catch (error) { showError(error); } finally { setBusy(false); creditsChanged(); }
  };
  const saveMethods = async () => {
    try {
      await api(`/api/systematic-reviews/${review.id}`, { method: 'PATCH', body: JSON.stringify({ methods }) });
      toast.success('Saved');
    } catch (error) { showError(error); }
  };
  const exportAs = (format: 'csv' | 'ris', records: 'all' | 'included') => downloadFile(`/api/systematic-reviews/${review.id}/export?format=${format}&records=${records}`, `${name}.${format}`).catch(showError);

  return (
    <div className="grid gap-6">
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="flex-1 text-[16px] font-bold">PRISMA 2020 flow diagram</h2>
          <Button size="sm" onClick={() => svg.current && downloadPrisma(svg.current, 'svg', name)}><LuDownload className="h-4 w-4" />SVG</Button>
          <Button size="sm" onClick={() => svg.current && downloadPrisma(svg.current, 'png', name).catch(showError)}><LuDownload className="h-4 w-4" />PNG</Button>
        </div>
        <p className="mt-1 text-[13.5px] text-muted">Counted from your records and decisions as they stand.</p>
        <div className="mt-4 overflow-x-auto"><div className="min-w-[560px] max-w-[760px]"><PrismaDiagram ref={svg} prisma={prisma} /></div></div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-line-2 px-5 py-4">
          <h2 className="flex-1 text-[16px] font-bold">Included studies ({rows.length})</h2>
          <Button size="sm" onClick={() => exportAs('csv', 'all')}><LuDownload className="h-4 w-4" />All records and decisions (CSV)</Button>
          <Button size="sm" onClick={() => exportAs('ris', 'all')}><LuDownload className="h-4 w-4" />All records (RIS)</Button>
          <Button size="sm" onClick={() => exportAs('ris', 'included')}><LuDownload className="h-4 w-4" />Included (RIS)</Button>
        </div>
        {rows.length === 0 ? <p className="px-5 py-6 text-[14px] text-muted">No studies included yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13.5px]">
              <thead><tr className="text-left text-[12.5px] text-muted"><th className="px-5 py-2 font-medium">Study</th>{keyColumns.map((column) => <th key={column.id} className="px-2 py-2 font-medium">{column.label}</th>)}</tr></thead>
              <tbody>
                {rows.map((record) => (
                  <tr key={record.id} className="border-t border-line-2 align-top">
                    <td className="px-5 py-2"><span className="font-semibold">{shortCite(record)}</span><span className="block text-[12.5px] text-muted">{record.title}</span></td>
                    {keyColumns.map((column) => <td key={column.id} className="px-2 py-2 text-ink-2">{record.extraction?.[column.id]?.value || '–'}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="flex-1 text-[16px] font-bold">Methods section</h2>
          {canEdit && <><Button onClick={draft} disabled={busy}>{busy ? <LuLoaderCircle className="h-4 w-4 animate-spin" /> : <LuSparkles className="h-4 w-4" />}Draft from this review</Button><CreditCost credits={3} /></>}
        </div>
        <p className="mt-1 text-[13.5px] text-muted">Written from your search log, criteria, screening and counts. Facts it does not have are marked [To add: …].</p>
        {methods ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <textarea value={methods} disabled={!canEdit} onChange={(event) => setMethods(event.target.value)} rows={18} className={`${inputClass} h-auto py-2.5 text-[14px]`} aria-label="Methods text" />
            <div className="max-h-[480px] overflow-y-auto rounded-xl bg-soft px-4 py-2"><CitedMarkdown markdown={methods} className="text-[15px]" /></div>
          </div>
        ) : null}
        {methods && canEdit && <div className="mt-3 flex gap-2"><Button variant="primary" size="sm" onClick={saveMethods}>Save</Button><Button size="sm" onClick={() => navigator.clipboard.writeText(methods).then(() => toast.success('Copied'))}>Copy</Button></div>}
      </Card>
    </div>
  );
}
