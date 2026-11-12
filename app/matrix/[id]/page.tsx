'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { LuDownload, LuFileText, LuPencil, LuPlay, LuPlus, LuRotateCw, LuSquare, LuTrash2, LuX } from 'react-icons/lu';
import { AppFrame } from '@/components/app/AppFrame';
import { Button, inputClass } from '@/components/app/ui';
import { PaperPicker } from '@/components/matrix/PaperPicker';
import { matrixDocumentBlocks } from '@/components/matrix/document';
import { api, useSession } from '@/lib/session';

type Column = { id: string; label: string; prompt: string };
type Cell = { value: string; quote: string | null; page: number | null; status: 'done' | 'empty' | 'error'; basis: 'full_text' | 'abstract' | 'none' | 'writer'; edited: boolean };
type Paper = { id: string; title: string; authors: string[]; year: string | null; doi: string | null; has_abstract: boolean; departed?: boolean };
type Row = { paper: Paper; cells: Record<string, Cell> };
type Matrix = { id: string; title: string; columns: Column[]; paper_count: number; rows: Row[]; project_id?: string | null; can_edit?: boolean; can_share?: boolean; can_delete?: boolean; archived?: boolean };

const CONCURRENCY = 3;

function shortAuthors(authors: string[]) {
  const last = (name: string) => name.split(/[\s,]+/).filter(Boolean).slice(-1)[0] || name;
  if (!authors.length) return '';
  if (authors.length === 1) return last(authors[0]);
  if (authors.length === 2) return `${last(authors[0])} & ${last(authors[1])}`;
  return `${last(authors[0])} et al.`;
}
const paperLabel = (paper: Paper) => [shortAuthors(paper.authors), paper.year ? `(${paper.year})` : ''].filter(Boolean).join(' ') || paper.title;

function csvCell(value: string) {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** One literature review matrix: papers as rows, questions as columns, filled from the papers. */
export default function MatrixPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useSession();
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filling, setFilling] = useState<{ done: number; total: number } | null>(null);
  const [rowState, setRowState] = useState<Record<string, 'filling' | 'error'>>({});
  const [editing, setEditing] = useState<{ row: Row; column: Column } | null>(null);
  const [columnDialog, setColumnDialog] = useState<Column | 'new' | null>(null);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState<string | null>(null);
  const [projects, setProjects] = useState<{ id: string; name: string; role: string }[]>([]);
  const stopRef = useRef(false);
  const autoFilled = useRef(false);

  const path = `/api/matrices/${encodeURIComponent(id)}`;
  const load = useCallback(async () => {
    try { setMatrix(await api<Matrix>(path)); } catch (caught) { setError((caught as Error).message); }
  }, [path]);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace(`/login?next=/matrix/${encodeURIComponent(id)}`); return; }
    void load();
    api<{ projects: typeof projects }>('/api/projects').then((data) => setProjects(data.projects)).catch(() => undefined);
  }, [id, load, loading, router, user]);

  const missing = useCallback((current: Matrix, columnIds?: string[]) =>
    current.rows.filter((row) => (columnIds ?? current.columns.map((column) => column.id)).some((columnId) => {
      const cell = row.cells[columnId];
      return columnIds ? !cell?.edited : !cell || cell.status === 'error';
    })), []);

  /** Fills rows a few at a time; each answer appears as soon as it arrives. */
  const fill = useCallback(async (rows: Row[], columnIds?: string[]) => {
    if (!rows.length || filling || matrix?.can_edit === false) return;
    stopRef.current = false;
    setError(null);
    setFilling({ done: 0, total: rows.length });
    let next = 0;
    let failures = 0;
    const worker = async () => {
      while (next < rows.length && !stopRef.current) {
        const row = rows[next++];
        setRowState((current) => ({ ...current, [row.paper.id]: 'filling' }));
        try {
          const result = await api<{ cells: Record<string, Cell> }>(`${path}/fill`, { method: 'POST', body: JSON.stringify({ document_id: row.paper.id, column_ids: columnIds }) });
          failures = 0;
          setMatrix((current) => current && { ...current, rows: current.rows.map((item) => (item.paper.id === row.paper.id ? { ...item, cells: result.cells } : item)) });
          setRowState((current) => { const { [row.paper.id]: _done, ...rest } = current; return rest; });
        } catch (caught) {
          failures++;
          setRowState((current) => ({ ...current, [row.paper.id]: 'error' }));
          // Out of credit, or the AI is down: stop instead of failing every row.
          if (failures >= 2 || /credit|upgrade|not configured/i.test((caught as Error).message)) {
            stopRef.current = true;
            setError((caught as Error).message);
          }
        }
        setFilling((current) => current && { ...current, done: current.done + 1 });
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, rows.length) }, worker));
    setFilling(null);
  }, [filling, path, matrix?.can_edit]);

  useEffect(() => {
    if (!matrix || autoFilled.current || new URLSearchParams(window.location.search).get('fill') !== '1') return;
    autoFilled.current = true;
    window.history.replaceState(null, '', `/matrix/${id}`);
    void fill(missing(matrix));
  }, [fill, id, matrix, missing]);

  const saveColumns = async (columns: Column[]) => {
    const updated = await api<{ columns: Column[] }>(path, { method: 'PATCH', body: JSON.stringify({ columns }) });
    setMatrix((current) => current && { ...current, columns: updated.columns });
    return updated.columns;
  };

  const saveTitle = async () => {
    if (title === null || !matrix) return;
    const next = title.trim();
    setTitle(null);
    if (!next || next === matrix.title) return;
    setMatrix({ ...matrix, title: next });
    await api(path, { method: 'PATCH', body: JSON.stringify({ title: next }) }).catch((caught) => setError((caught as Error).message));
  };

  const removePaper = async (row: Row) => {
    if (!window.confirm(`Remove "${row.paper.title}" from this matrix? It stays in your Library.`)) return;
    await api(`${path}/papers/${encodeURIComponent(row.paper.id)}`, { method: 'DELETE' });
    setMatrix((current) => current && { ...current, rows: current.rows.filter((item) => item.paper.id !== row.paper.id) });
  };

  const deleteMatrix = async () => {
    if (!matrix || !window.confirm(`Delete "${matrix.title}"? The papers stay in your Library.`)) return;
    await api(path, { method: 'DELETE' });
    router.push('/matrix');
  };

  const exportCsv = () => {
    if (!matrix) return;
    const header = ['Paper', 'Title', 'DOI', ...matrix.columns.map((column) => column.label), ...matrix.columns.map((column) => `${column.label} (source)`)];
    const lines = matrix.rows.map((row) => [
      paperLabel(row.paper), row.paper.title, row.paper.doi || '',
      ...matrix.columns.map((column) => row.cells[column.id]?.value || ''),
      ...matrix.columns.map((column) => {
        const cell = row.cells[column.id];
        if (!cell?.value) return '';
        return [cell.page ? `p. ${cell.page}` : cell.basis === 'abstract' ? 'abstract' : '', cell.quote ? `"${cell.quote}"` : ''].filter(Boolean).join(' ');
      }),
    ]);
    const csv = [header, ...lines].map((line) => line.map(csvCell).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${matrix.title.replace(/[^\w\s-]/g, '').trim() || 'matrix'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const openAsDocument = async () => {
    if (!matrix) return;
    const blocks = matrixDocumentBlocks(matrix);
    try {
      const created = await api<{ id: string }>('/api/ai-editor/documents', { method: 'POST', body: JSON.stringify({ title: matrix.title, blocks }) });
      router.push(`/editor?doc=${encodeURIComponent(created.id)}`);
    } catch (caught) { setError((caught as Error).message); }
  };

  const exportAudit = async () => {
    if (!matrix) return;
    try {
      const bundle = await api<unknown>(`${path}/export`);
      const url = URL.createObjectURL(new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url; link.download = `${matrix.title.replace(/[^\w\s-]/g, '').trim() || 'matrix'}-audit.json`;
      link.click(); URL.revokeObjectURL(url);
    } catch (caught) { setError((caught as Error).message); }
  };

  const toFill = useMemo(() => (matrix ? missing(matrix) : []), [matrix, missing]);

  return (
    <AppFrame
      title={matrix?.title || 'Review matrix'}
      wide
      actions={matrix ? (
        <>
          {filling ? (
            <Button onClick={() => { stopRef.current = true; }}><LuSquare className="h-4 w-4" />Stop ({filling.done}/{filling.total})</Button>
          ) : toFill.length && matrix.can_edit !== false ? (
            <Button variant="primary" onClick={() => void fill(toFill)}><LuPlay className="h-4 w-4" />Fill {toFill.length} paper{toFill.length === 1 ? '' : 's'}</Button>
          ) : null}
          <Button disabled={matrix.can_edit === false} onClick={() => setAdding(true)}><LuPlus className="h-4 w-4" />Papers</Button>
          <Button onClick={exportCsv}><LuDownload className="h-4 w-4" />CSV</Button>
          <Button onClick={() => void exportAudit()}><LuDownload className="h-4 w-4" />Evidence and audit</Button>
          <Button onClick={() => void openAsDocument()}><LuFileText className="h-4 w-4" />Open as document</Button>
        </>
      ) : null}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[14px]">
        <Link href="/matrix" className="font-semibold text-brand hover:underline">All matrices</Link>
        {matrix ? (
          <>
            <span className="text-subtle">/</span>
            {title !== null ? (
              <input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} onBlur={() => void saveTitle()} onKeyDown={(event) => { if (event.key === 'Enter') void saveTitle(); if (event.key === 'Escape') setTitle(null); }} className={`${inputClass} h-9 max-w-md`} />
            ) : (
              <button type="button" disabled={matrix.can_edit === false} onClick={() => setTitle(matrix.title)} className="inline-flex items-center gap-1.5 rounded-lg px-1.5 py-0.5 font-medium hover:bg-soft">{matrix.title}<LuPencil className="h-3.5 w-3.5 text-subtle" /></button>
            )}
            <button type="button" disabled={!matrix.can_delete} onClick={() => void deleteMatrix()} className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"><LuTrash2 className="h-4 w-4" />Delete matrix</button>
          </>
        ) : null}
      </div>

      {matrix?.can_share && matrix.can_edit !== false && <label className="mb-4 block text-sm font-medium">Share this matrix and its selected evidence
        <select className={`${inputClass} ml-2 max-w-xs`} value={matrix.project_id || ''} onChange={async (event) => { try { await api(path, { method: 'PATCH', body: JSON.stringify({ project_id: event.target.value || null }) }); await load(); } catch (caught) { setError((caught as Error).message); } }}>
          <option value="">Private</option>{projects.filter((project) => ['owner', 'edit'].includes(project.role)).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
      </label>}
      {matrix?.archived ? <p className="mb-4 rounded-xl border border-line bg-soft p-3 text-sm text-muted">This project was deleted. Your matrix retains its saved findings, audit history and source summaries as a read-only snapshot. It no longer reads collaborators' Library documents. Create a new matrix from your own sources to continue editing.</p> : matrix?.can_edit === false && <p className="mb-4 text-sm text-muted">You can inspect and export this shared matrix. Your project role does not allow changes.</p>}

      {filling ? (
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-line-2" role="progressbar" aria-valuemin={0} aria-valuemax={filling.total} aria-valuenow={filling.done}>
          <div className="h-full bg-brand transition-all" style={{ width: `${(filling.done / Math.max(1, filling.total)) * 100}%` }} />
        </div>
      ) : null}
      {error ? <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-700">{error}</p> : null}
      {!matrix && !error ? <p className="text-[14px] text-muted">Loading…</p> : null}

      {matrix ? (
        matrix.rows.length ? (
          <div className="overflow-x-auto rounded-2xl border border-line">
            <table className="w-full min-w-[720px] border-collapse text-left text-[13.5px]">
              <thead>
                <tr className="bg-soft">
                  <th className="sticky left-0 z-10 w-[220px] min-w-[200px] border-b border-r border-line bg-soft px-3 py-2.5 font-semibold">Paper</th>
                  {matrix.columns.map((column) => (
                    <th key={column.id} className="min-w-[200px] border-b border-line px-3 py-2.5 align-top font-semibold">
                      <div className="flex items-start gap-1">
                        <span className="min-w-0 flex-1" title={column.prompt}>{column.label}</span>
                        <button type="button" disabled={matrix.can_edit === false} onClick={() => setColumnDialog(column)} aria-label={`Edit column ${column.label}`} className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-subtle hover:bg-line-2 hover:text-ink"><LuPencil className="h-3.5 w-3.5" /></button>
                      </div>
                    </th>
                  ))}
                  <th className="w-[52px] border-b border-line px-2 py-2.5">
                    {matrix.columns.length < 12 && matrix.can_edit !== false ? <button type="button" onClick={() => setColumnDialog('new')} aria-label="Add column" title="Add column" className="grid h-7 w-7 place-items-center rounded-md text-brand hover:bg-brand-50"><LuPlus className="h-4 w-4" /></button> : null}
                  </th>
                </tr>
              </thead>
              <tbody>
                {matrix.rows.map((row) => (
                  <tr key={row.paper.id} className="align-top">
                    <td className="sticky left-0 z-10 border-b border-r border-line bg-surface px-3 py-2.5">
                      <div className="font-semibold text-ink">{paperLabel(row.paper)}</div>
                      <div className="mt-0.5 line-clamp-3 text-[12.5px] leading-snug text-muted">{row.paper.title}</div>
                      {row.paper.departed ? <div className="mt-1 text-[11.5px] text-muted">Contributor left the project · values kept, no refill</div> : null}
                      <div className="mt-1.5 flex items-center gap-1">
                        {rowState[row.paper.id] === 'filling' ? <span className="text-[12px] text-brand">Reading…</span> : null}
                        {rowState[row.paper.id] === 'error' ? <span className="text-[12px] text-red-600">Could not fill</span> : null}
                        <button type="button" disabled={Boolean(filling) || matrix.can_edit === false} onClick={() => void fill([row])} title="Fill this paper again" aria-label="Fill this paper again" className="ml-auto grid h-6 w-6 place-items-center rounded-md text-subtle hover:bg-line-2 hover:text-ink disabled:opacity-40"><LuRotateCw className="h-3.5 w-3.5" /></button>
                        <button type="button" disabled={matrix.can_edit === false} onClick={() => void removePaper(row)} title="Remove from matrix" aria-label="Remove from matrix" className="grid h-6 w-6 place-items-center rounded-md text-subtle hover:bg-red-50 hover:text-red-600"><LuX className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                    {matrix.columns.map((column) => {
                      const cell = row.cells[column.id];
                      return (
                        <td key={column.id} className="border-b border-line p-0">
                          <button type="button" onClick={() => setEditing({ row, column })} className="block min-h-[64px] w-full px-3 py-2.5 text-left hover:bg-soft">
                            {cell?.value ? (
                              <>
                                <span className="text-ink-2">{cell.value}</span>
                                <span className="mt-1 flex flex-wrap gap-1">
                                  {cell.edited ? <span className="rounded bg-line-2 px-1 text-[11px] font-medium text-ink-3">Your text</span> : null}
                                  {cell.page ? <span className="rounded bg-brand-50 px-1 text-[11px] font-medium text-brand-600">p. {cell.page}</span> : null}
                                  {cell.basis === 'abstract' && !cell.edited ? <span className="rounded bg-amber-50 px-1 text-[11px] font-medium text-amber-800">Abstract</span> : null}
                                </span>
                              </>
                            ) : cell?.status === 'empty' ? (
                              <span className="text-[12.5px] italic text-subtle">{cell.basis === 'none' ? 'No text: add the PDF' : 'Not reported'}</span>
                            ) : rowState[row.paper.id] === 'filling' ? (
                              <span className="block h-3 w-2/3 animate-pulse rounded bg-line-2" />
                            ) : <span className="text-[12.5px] text-subtle">—</span>}
                          </button>
                        </td>
                      );
                    })}
                    <td className="border-b border-line" />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-2xl border border-line px-6 py-12 text-center">
            <p className="text-[16px] font-semibold">No papers in this matrix</p>
            <div className="mt-4"><Button disabled={matrix.can_edit === false} variant="primary" onClick={() => setAdding(true)}><LuPlus className="h-4 w-4" />Add papers</Button></div>
          </div>
        )
      ) : null}

      {matrix ? <p className="mt-3 text-[12.5px] text-subtle">Answers come from each paper&apos;s PDF where your Library has it, otherwise from its abstract. Click a cell to see the quote it came from or to write your own; your text is never overwritten.</p> : null}

      {editing && matrix ? (
        <CellDialog
          readOnly={matrix.can_edit === false}
          row={editing.row}
          column={editing.column}
          cell={matrix.rows.find((row) => row.paper.id === editing.row.paper.id)?.cells[editing.column.id]}
          onClose={() => setEditing(null)}
          onSave={async (value) => {
            await api(`${path}/rows/${encodeURIComponent(editing.row.paper.id)}/cells/${encodeURIComponent(editing.column.id)}`, { method: 'PUT', body: JSON.stringify({ value }) });
            setEditing(null);
            if (value.trim()) {
              setMatrix((current) => current && { ...current, rows: current.rows.map((row) => (row.paper.id === editing.row.paper.id ? { ...row, cells: { ...row.cells, [editing.column.id]: { value: value.trim(), quote: null, page: null, status: 'done', basis: 'writer', edited: true } } } : row)) });
            } else {
              // Handed back to the AI: fill that cell again.
              const target = matrix.rows.find((row) => row.paper.id === editing.row.paper.id);
              if (target) void fill([{ ...target, cells: {} }], [editing.column.id]);
            }
          }}
        />
      ) : null}

      {columnDialog && matrix ? (
        <ColumnDialog
          column={columnDialog === 'new' ? null : columnDialog}
          onClose={() => setColumnDialog(null)}
          onDelete={columnDialog === 'new' || matrix.columns.length <= 1 ? undefined : async () => {
            await saveColumns(matrix.columns.filter((column) => column.id !== (columnDialog as Column).id));
            setColumnDialog(null);
          }}
          onSave={async (label, prompt) => {
            const isNew = columnDialog === 'new';
            const original = isNew ? null : (columnDialog as Column);
            const columns = isNew ? [...matrix.columns, { id: '', label, prompt }] : matrix.columns.map((column) => (column.id === original!.id ? { ...column, label, prompt } : column));
            const saved = await saveColumns(columns.map(({ id: columnId, ...rest }) => (columnId ? { id: columnId, ...rest } : rest) as Column));
            setColumnDialog(null);
            // A new column, or a changed question: fill it for every paper (your own cells stay).
            const target = isNew ? saved[saved.length - 1] : original!.prompt !== prompt ? saved.find((column) => column.id === original!.id) : null;
            if (target && matrix.rows.length) {
              const current = { ...matrix, columns: saved };
              void fill(missing(current, [target.id]), [target.id]);
            }
          }}
        />
      ) : null}

      {adding && matrix ? (
        <AddPapersDialog
          exclude={matrix.rows.map((row) => row.paper.id)}
          onClose={() => setAdding(false)}
          onAdd={async (documentIds, folderIds) => {
            await api(`${path}/papers`, { method: 'POST', body: JSON.stringify({ document_ids: documentIds, folder_ids: folderIds }) });
            setAdding(false);
            const fresh = await api<Matrix>(path);
            setMatrix(fresh);
            void fill(missing(fresh));
          }}
        />
      ) : null}
    </AppFrame>
  );
}

function Dialog({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(15,23,42,0.4)] sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl bg-surface shadow-xl sm:rounded-2xl">
        <div className="flex items-center gap-3 border-b border-line-2 px-5 py-3.5">
          <h2 className="min-w-0 flex-1 truncate text-[17px] font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-soft"><LuX className="h-5 w-5" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line-2 px-5 py-3">{footer}</div>
      </div>
    </div>
  );
}

function CellDialog({ row, column, cell, onClose, onSave, readOnly = false }: { row: Row; column: Column; cell?: Cell; onClose: () => void; onSave: (value: string) => Promise<void>; readOnly?: boolean }) {
  const [value, setValue] = useState(cell?.value || '');
  const [busy, setBusy] = useState(false);
  const save = async (next: string) => { setBusy(true); try { await onSave(next); } finally { setBusy(false); } };
  return (
    <Dialog
      title={column.label}
      onClose={onClose}
      footer={(
        <>
          {cell?.edited && !readOnly ? <Button variant="ghost" disabled={busy} onClick={() => void save('')} className="mr-auto">Let AI for Research fill it</Button> : null}
          <Button onClick={onClose}>Cancel</Button>
          {!readOnly && <Button variant="primary" disabled={busy || !value.trim() || value.trim() === cell?.value} onClick={() => void save(value)}>Save</Button>}
        </>
      )}
    >
      <p className="text-[13px] font-medium text-muted">{paperLabel(row.paper)}. {row.paper.title}</p>
      {cell?.quote ? (
        <blockquote className="mt-3 rounded-xl border-l-4 border-brand bg-brand-50 px-3.5 py-2.5 text-[13.5px] leading-relaxed text-ink-2">
          “{cell.quote}”
          <span className="mt-1 block text-[12px] font-semibold text-brand-600">{cell.page ? `Page ${cell.page}` : cell.basis === 'abstract' ? 'From the abstract' : 'From the full text'}</span>
        </blockquote>
      ) : cell?.value && !cell.edited ? (
        <p className="mt-3 rounded-xl bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-800">No exact quote was found for this answer{cell.page ? ` (around page ${cell.page})` : ''}. Check it in the paper.</p>
      ) : null}
      <label className="mt-4 block text-[13px] font-medium text-muted" htmlFor="cell-value">Cell</label>
      <textarea id="cell-value" readOnly={readOnly} value={value} onChange={(event) => setValue(event.target.value)} rows={5} className="mt-1 w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[15px] text-ink focus:border-brand focus:outline-none" />
      <p className="mt-1 text-[12px] text-subtle">Text you write here is kept when the matrix is filled again.</p>
    </Dialog>
  );
}

function ColumnDialog({ column, onClose, onSave, onDelete }: { column: Column | null; onClose: () => void; onSave: (label: string, prompt: string) => Promise<void>; onDelete?: () => Promise<void> }) {
  const [label, setLabel] = useState(column?.label || '');
  const [prompt, setPrompt] = useState(column && column.prompt !== column.label ? column.prompt : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (work: () => Promise<void>) => { setBusy(true); setError(null); try { await work(); } catch (caught) { setError((caught as Error).message); setBusy(false); } };
  return (
    <Dialog
      title={column ? 'Edit column' : 'Add column'}
      onClose={onClose}
      footer={(
        <>
          {onDelete ? <Button variant="danger" disabled={busy} onClick={() => void run(onDelete)} className="mr-auto"><LuTrash2 className="h-4 w-4" />Delete column</Button> : null}
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={busy || !label.trim()} onClick={() => void run(() => onSave(label.trim(), prompt.trim() || label.trim()))}>{column ? 'Save' : 'Add and fill'}</Button>
        </>
      )}
    >
      <label className="block text-[13px] font-medium text-muted" htmlFor="column-label">Column name</label>
      <input id="column-label" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="e.g. Theoretical framework" className={`${inputClass} mt-1`} />
      <label className="mt-4 block text-[13px] font-medium text-muted" htmlFor="column-prompt">What to look for (optional)</label>
      <textarea id="column-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={3} placeholder="e.g. Which theory or model frames the study, and how is it used?" className="mt-1 w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[15px] text-ink focus:border-brand focus:outline-none" />
      {column ? <p className="mt-1 text-[12px] text-subtle">Changing the question fills the column again; cells you wrote yourself stay.</p> : null}
      {error ? <p className="mt-2 text-[13px] text-red-600">{error}</p> : null}
    </Dialog>
  );
}

function AddPapersDialog({ exclude, onClose, onAdd }: { exclude: string[]; onClose: () => void; onAdd: (documentIds: string[], folderIds: string[]) => Promise<void> }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Dialog
      title="Add papers"
      onClose={onClose}
      footer={(
        <>
          {error ? <p className="mr-auto text-[13px] text-red-600">{error}</p> : null}
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={busy || (!selected.length && !folders.length)} onClick={async () => {
            setBusy(true); setError(null);
            try { await onAdd(selected, folders); } catch (caught) { setError((caught as Error).message); setBusy(false); }
          }}>{busy ? 'Adding…' : 'Add and fill'}</Button>
        </>
      )}
    >
      <PaperPicker selected={selected} onSelected={setSelected} folders={folders} onFolders={setFolders} exclude={exclude} />
    </Dialog>
  );
}
