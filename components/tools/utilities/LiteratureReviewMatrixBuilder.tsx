'use client';

/**
 * An editable literature review (synthesis) matrix in the browser: columns, rows, DOI or title lookup
 * (GET /api/tools/cite), themes, and CSV, Markdown and HTML export. Saved in this browser only.
 */
import Link from 'next/link';
import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import { LuArrowDown, LuArrowRight, LuArrowUp, LuDownload, LuLoaderCircle, LuPlus, LuSearch, LuTrash2, LuX } from 'react-icons/lu';
import { api } from '@/lib/session';
import {
  PRESETS, addColumn, addRow, cellsFromDetails, detailsFromCsl, groupByTheme, moveRow, newMatrix, parseMatrix, removeColumn, removeRow,
  renameColumn, rowHasTheme, themeColumnId, themesOf, toCsv, toHtml, toMarkdown, updateCell,
  type CslLike, type Matrix, type MatrixRow, type Preset,
} from '@/lib/reviewMatrix';
import { CopyButton } from '@/components/marketing/CopyButton';
import { btnGhost, btnPrimary, focusRing } from '@/components/marketing/styles';

const STORAGE_KEY = 'writeorbit_review_matrix';
const control = `w-full rounded-xl border border-line bg-surface px-3.5 text-[15px] text-ink placeholder:text-subtle ${focusRing}`;
const small = `inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-line bg-surface px-2 text-[13px] text-ink-2 hover:bg-soft disabled:opacity-40 ${focusRing}`;

type Found = CslLike & { id: string };

async function copyRich(html: string, text: string): Promise<boolean> {
  try {
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
      await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) })]);
    } else {
      await navigator.clipboard.writeText(text);
    }
    return true;
  } catch {
    return false;
  }
}

export function LiteratureReviewMatrixBuilder() {
  const id = useId();
  const [matrix, setMatrix] = useState<Matrix>(() => newMatrix('review'));
  const [loaded, setLoaded] = useState(false);
  const [preset, setPreset] = useState<Preset>('review');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [found, setFound] = useState<Found[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [themeColumn, setThemeColumn] = useState<string>('');
  const [filter, setFilter] = useState('');
  const [grouped, setGrouped] = useState(false);
  const [status, setStatus] = useState('');

  // The matrix is a per-browser convenience; storage may be blocked or empty.
  useEffect(() => {
    try { const saved = parseMatrix(localStorage.getItem(STORAGE_KEY)); if (saved) setMatrix(saved); } catch { /* blocked */ }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(matrix)); } catch { /* blocked or full */ }
  }, [loaded, matrix]);

  const themeId = matrix.columns.some((column) => column.id === themeColumn) ? themeColumn : themeColumnId(matrix) ?? '';
  const themes = useMemo(() => (themeId ? themesOf(matrix, themeId) : []), [matrix, themeId]);
  const activeFilter = themes.some((theme) => theme.toLowerCase() === filter.toLowerCase()) ? filter : '';
  const visible = useMemo(() => (themeId && activeFilter ? matrix.rows.filter((row) => rowHasTheme(row, themeId, activeFilter)) : matrix.rows), [matrix.rows, themeId, activeFilter]);
  const groups = useMemo(() => (grouped && themeId ? groupByTheme({ ...matrix, rows: visible }, themeId) : null), [grouped, themeId, matrix, visible]);
  const reorderable = !groups && !activeFilter;

  const say = (message: string) => { setStatus(message); window.setTimeout(() => setStatus(''), 2500); };

  function startNew() {
    if (matrix.rows.length && !window.confirm('Start a new matrix? The rows in this one will be deleted from this browser.')) return;
    setMatrix(newMatrix(preset));
    setFilter('');
    setGrouped(false);
    say(`New ${PRESETS[preset].name.toLowerCase()} started.`);
  }

  async function lookup(event: FormEvent) {
    event.preventDefault();
    if (query.trim().length < 3) return;
    setSearching(true);
    setError(null);
    try {
      const response = await api<{ results: Found[] }>(`/api/tools/cite?q=${encodeURIComponent(query.trim())}`);
      setFound(response.results.slice(0, 5));
      if (!response.results.length) setError('Nothing found. Check the DOI, try fewer words, or add the row by hand.');
    } catch (caught) {
      setError((caught as Error).message || 'The lookup failed. Try again, or add the row by hand.');
    } finally {
      setSearching(false);
    }
  }

  function addFound(item: Found) {
    const details = detailsFromCsl(item);
    setMatrix((current) => addRow(current, cellsFromDetails(current, details), details.doi || undefined));
    say(`Added ${details.citation.split('.')[0]}.`);
  }

  function download() {
    const blob = new Blob([`﻿${toCsv(matrix)}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'literature-review-matrix.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    say('CSV downloaded.');
  }

  function renderRow(row: MatrixRow, position: number, keyPrefix = '') {
    const index = matrix.rows.findIndex((other) => other.id === row.id);
    return (
      <tr key={`${keyPrefix}${row.id}`} className="align-top">
        <th scope="row" className="sticky left-0 z-[1] bg-surface px-2 py-2 text-left">
          <span className="block pb-1 text-[12.5px] font-medium text-muted">{position}</span>
          <div className="flex gap-1">
            <button type="button" onClick={() => setMatrix((m) => moveRow(m, row.id, -1))} disabled={!reorderable || index === 0} aria-label={`Move row ${position} up`} className={small}><LuArrowUp className="h-3.5 w-3.5" aria-hidden="true" /></button>
            <button type="button" onClick={() => setMatrix((m) => moveRow(m, row.id, 1))} disabled={!reorderable || index === matrix.rows.length - 1} aria-label={`Move row ${position} down`} className={small}><LuArrowDown className="h-3.5 w-3.5" aria-hidden="true" /></button>
            <button type="button" onClick={() => { if (!Object.values(row.cells).some((v) => v.trim()) || window.confirm(`Delete row ${position}?`)) setMatrix((m) => removeRow(m, row.id)); }} aria-label={`Delete row ${position}`} className={small}><LuTrash2 className="h-3.5 w-3.5" aria-hidden="true" /></button>
          </div>
        </th>
        {matrix.columns.map((column) => (
          <td key={column.id} className="px-1.5 py-1.5">
            <textarea value={row.cells[column.id] ?? ''} onChange={(event) => setMatrix((m) => updateCell(m, row.id, column.id, event.target.value.slice(0, 4000)))}
              aria-label={`${column.name || 'Untitled column'}, row ${position}`} rows={3}
              className={`block w-full min-w-[180px] resize-y rounded-lg border border-line-2 bg-surface px-2.5 py-1.5 text-[13.5px] leading-[1.5] text-ink ${focusRing}`} />
          </td>
        ))}
      </tr>
    );
  }

  const markdown = toMarkdown(matrix);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <label>
          <span className="mb-1.5 block text-[14px] font-medium text-ink">Template</span>
          <select value={preset} onChange={(event) => setPreset(event.target.value as Preset)} aria-describedby={`${id}-preset`} className={`${control} h-11`}>
            {(Object.keys(PRESETS) as Preset[]).map((key) => <option key={key} value={key}>{PRESETS[key].name}</option>)}
          </select>
          <span id={`${id}-preset`} className="mt-1 block text-[13px] text-muted">{PRESETS[preset].help}</span>
        </label>
        <button type="button" onClick={startNew} className={`${btnGhost} h-11 px-4 text-[14px] sm:mb-[22px]`}>Start a new matrix</button>
      </div>

      <section aria-labelledby={`${id}-lookup`}>
        <h2 id={`${id}-lookup`} className="mb-1.5 text-[14px] font-medium text-ink">Add a paper by DOI or title</h2>
        <form onSubmit={lookup} role="search" className="flex gap-2">
          <label className="relative flex-1">
            <span className="sr-only">DOI or title</span>
            <LuSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} minLength={3} required placeholder="Paste a DOI, or type a title" className={`${control} h-11 pl-11`} />
          </label>
          <button type="submit" disabled={searching} className={`${btnPrimary} h-11 rounded-xl px-5 text-[15px]`}>
            {searching ? <><LuLoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /><span className="sr-only">Searching</span></> : 'Find'}
          </button>
        </form>
        <div aria-live="polite">
          {error && <p role="alert" className="mt-3 text-[14px] text-amber-800">{error}</p>}
          {found && found.length > 0 && (
            <ul className="mt-3 divide-y divide-line-2 rounded-xl border border-line">
              {found.map((item) => {
                const details = detailsFromCsl(item);
                return (
                  <li key={item.id} className="flex items-start gap-3 px-4 py-3">
                    <p className="min-w-0 flex-1 text-[14px] leading-[1.5] text-ink-2 [overflow-wrap:anywhere]">{details.citation}</p>
                    <button type="button" onClick={() => addFound(item)} className={small}><LuPlus className="h-3.5 w-3.5" aria-hidden="true" /> Add row</button>
                  </li>
                );
              })}
              <li className="flex justify-end px-4 py-2"><button type="button" onClick={() => setFound(null)} className={small}><LuX className="h-3.5 w-3.5" aria-hidden="true" /> Close results</button></li>
            </ul>
          )}
        </div>
      </section>

      <div className="flex flex-wrap items-end gap-3">
        <button type="button" onClick={() => { setMatrix((m) => addRow(m)); say('Row added.'); }} className={`${btnGhost} h-10 px-4 text-[14px]`}><LuPlus className="h-4 w-4" aria-hidden="true" /> Add a row</button>
        <button type="button" onClick={() => { setMatrix((m) => addColumn(m)); say('Column added at the end.'); }} className={`${btnGhost} h-10 px-4 text-[14px]`}><LuPlus className="h-4 w-4" aria-hidden="true" /> Add a column</button>
        {matrix.columns.length > 0 && (
          <label className="text-[13.5px] text-ink-2">
            <span className="mb-1 block">Theme column</span>
            <select value={themeId} onChange={(event) => { setThemeColumn(event.target.value); setFilter(''); }} className={`${control} h-10 w-auto text-[14px]`}>
              <option value="">None</option>
              {matrix.columns.map((column) => <option key={column.id} value={column.id}>{column.name || 'Untitled column'}</option>)}
            </select>
          </label>
        )}
        {themeId && themes.length > 0 && (
          <>
            <label className="text-[13.5px] text-ink-2">
              <span className="mb-1 block">Show</span>
              <select value={activeFilter} onChange={(event) => setFilter(event.target.value)} className={`${control} h-10 w-auto text-[14px]`}>
                <option value="">All themes</option>
                {themes.map((theme) => <option key={theme} value={theme}>{theme}</option>)}
              </select>
            </label>
            <label className="flex h-10 items-center gap-2 text-[14px] text-ink-2">
              <input type="checkbox" checked={grouped} onChange={(event) => setGrouped(event.target.checked)} className="h-4 w-4 accent-[var(--color-brand)]" /> Group by theme
            </label>
          </>
        )}
      </div>
      <p role="status" className="sr-only">{status}</p>

      <div role="region" aria-label="Literature review matrix" tabIndex={0} className={`max-h-[70vh] overflow-auto rounded-2xl border border-line bg-surface ${focusRing}`}>
        <table className="w-max min-w-full border-collapse text-left">
          <thead className="sticky top-0 z-[2] bg-soft">
            <tr>
              <th scope="col" className="sticky left-0 z-[3] w-[112px] bg-soft px-2 py-2 text-[12.5px] font-medium text-muted">Row</th>
              {matrix.columns.map((column, index) => (
                <th key={column.id} scope="col" className="px-1.5 py-2 align-top">
                  <div className="flex items-center gap-1">
                    <input value={column.name} onChange={(event) => setMatrix((m) => renameColumn(m, column.id, event.target.value.slice(0, 80)))} aria-label={`Column ${index + 1} name`}
                      className={`h-8 min-w-[140px] flex-1 rounded-lg border border-line-2 bg-surface px-2 text-[13.5px] font-semibold text-ink ${focusRing}`} />
                    <button type="button" aria-label={`Remove column ${column.name || index + 1}`} className={small}
                      onClick={() => { if (!matrix.rows.some((row) => (row.cells[column.id] ?? '').trim()) || window.confirm(`Remove the column "${column.name}" and its notes?`)) setMatrix((m) => removeColumn(m, column.id)); }}>
                      <LuX className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          {groups ? groups.map((group) => (
            <tbody key={group.theme ?? '__none'} className="divide-y divide-line-2">
              <tr><th scope="rowgroup" colSpan={matrix.columns.length + 1} className="bg-brand-50 px-3 py-1.5 text-[13.5px] font-semibold text-ink">{group.theme ?? 'No theme yet'} <span className="font-normal text-muted">({group.rows.length})</span></th></tr>
              {group.rows.map((row) => renderRow(row, matrix.rows.indexOf(row) + 1, `${group.theme}-`))}
            </tbody>
          )) : (
            <tbody className="divide-y divide-line-2">
              {visible.map((row) => renderRow(row, matrix.rows.indexOf(row) + 1))}
            </tbody>
          )}
        </table>
        {matrix.rows.length === 0 && <p className="px-5 py-6 text-center text-[14px] text-muted">No rows yet. Add a paper by DOI or title, or add a row and type.</p>}
      </div>
      {!reorderable && <p className="-mt-3 text-[13px] text-muted">Show all themes, ungrouped, to reorder rows.</p>}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={download} disabled={!matrix.rows.length} className={`${btnPrimary} h-10 px-4 text-[14px]`}><LuDownload className="h-4 w-4" aria-hidden="true" /> Download CSV</button>
        <CopyButton text={markdown} label="Copy as Markdown" />
        <button type="button" disabled={!matrix.rows.length} onClick={async () => { const html = toHtml(matrix); say((await copyRich(html, html)) ? 'HTML table copied.' : 'Copying was blocked by the browser.'); }}
          className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-[13px] text-ink-2 hover:bg-soft disabled:opacity-50 ${focusRing}`}>
          {status === 'HTML table copied.' ? 'Copied' : 'Copy as HTML table'}
        </button>
        <span className="text-[13px] text-muted">Exports include every row. Saved in this browser only; download a copy to keep it.</span>
      </div>

      <div className="rounded-2xl border border-line bg-soft px-5 py-4 text-[14px] leading-[1.55] text-ink-2">
        <p className="font-medium text-ink">Next step: fill the matrix from the papers</p>
        <p className="mt-1">Signed in, the <Link href="/matrix" className="underline hover:text-ink">evidence matrix</Link> reads the PDFs in your Library and fills each column for you, with the quote and page behind every cell, so you can check each answer.</p>
        <Link href="/features/literature-review" className={`mt-2 inline-flex items-center gap-1.5 rounded font-medium text-brand hover:text-brand-600 ${focusRing}`}>How the evidence matrix works <LuArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
      </div>
    </div>
  );
}
