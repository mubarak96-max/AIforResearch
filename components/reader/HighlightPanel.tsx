'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { LuFolderPlus, LuTable2, LuTrash2 } from 'react-icons/lu';
import { api } from '@/lib/session';
import { Button, StatusPill, inputClass } from '@/components/app/ui';
import { showError } from '@/components/app/research/parts';
import { COLORS, STATUS_LABELS, colorOf, type Highlight, type HighlightColor } from './pdf';

export type ProjectOption = { id: string; name: string; role: string };
export type MatrixOption = { id: string; title: string; columns: { id: string; label: string }[]; archived?: boolean };

type Props = {
  documentId: string; highlights: Highlight[]; selectedId: string | null; projects: ProjectOption[]; matrices: MatrixOption[];
  onPick: (highlight: Highlight) => void; onChanged: (highlight: Highlight) => void; onDeleted: (id: string) => void; onReload: () => Promise<void>;
};

export function ColorDots({ value, onChange, label }: { value?: HighlightColor; onChange: (color: HighlightColor) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-1.5">
      {COLORS.map((color) => (
        <button key={color.value} type="button" aria-label={color.label} aria-pressed={value === color.value} title={color.label}
          onMouseDown={(event) => event.preventDefault()} onClick={() => onChange(color.value)}
          className={`h-6 w-6 rounded-full border-2 ${value === color.value ? 'border-ink' : 'border-transparent'}`} style={{ background: color.dot }} />
      ))}
    </div>
  );
}

/** The highlights list: notes, colours, and sending a highlight to a project or a matrix. */
export function HighlightPanel({ documentId, highlights, selectedId, projects, matrices, onPick, onChanged, onDeleted, onReload }: Props) {
  useEffect(() => {
    if (selectedId) document.getElementById(`reader-highlight-${selectedId}`)?.scrollIntoView({ block: 'nearest' });
  }, [selectedId]);
  if (!highlights.length) {
    return <p className="px-4 py-10 text-center text-[14px] leading-relaxed text-muted">Select text on a page, then pick a colour to highlight it. Your highlights and notes appear here.</p>;
  }
  return (
    <ul className="space-y-2 p-3">
      {highlights.map((highlight) => (
        <HighlightItem key={highlight.id} documentId={documentId} highlight={highlight} selected={highlight.id === selectedId}
          projects={projects} matrices={matrices} onPick={onPick} onChanged={onChanged} onDeleted={onDeleted} onReload={onReload} />
      ))}
    </ul>
  );
}

function HighlightItem({ documentId, highlight, selected, projects, matrices, onPick, onChanged, onDeleted, onReload }: Omit<Props, 'highlights' | 'selectedId'> & { highlight: Highlight; selected: boolean }) {
  const path = `/api/library/documents/${encodeURIComponent(documentId)}/highlights/${encodeURIComponent(highlight.id)}`;
  const [note, setNote] = useState(highlight.note);
  const [mode, setMode] = useState<'project' | 'matrix' | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => setNote(highlight.note), [highlight.note]);

  const patch = async (body: { note?: string; color?: HighlightColor }) => {
    try { onChanged({ ...highlight, ...(await api<Highlight>(path, { method: 'PATCH', body: JSON.stringify(body) })), project_links: highlight.project_links }); }
    catch (error) { showError(error); }
  };
  const remove = async () => {
    if (!window.confirm('Delete this highlight? Findings and matrix cells made from it stay where they are.')) return;
    setBusy(true);
    try { await api(path, { method: 'DELETE' }); onDeleted(highlight.id); } catch (error) { showError(error); setBusy(false); }
  };
  const matrixTitle = (id: string) => matrices.find((matrix) => matrix.id === id)?.title ?? 'a matrix';
  const columnLabel = (matrixId: string, columnId: string) => matrices.find((matrix) => matrix.id === matrixId)?.columns.find((column) => column.id === columnId)?.label;

  return (
    <li id={`reader-highlight-${highlight.id}`} className={`scroll-mt-3 rounded-xl border p-3 ${selected ? 'border-brand bg-brand-50/40' : 'border-line bg-surface'}`}>
      <button type="button" onClick={() => onPick(highlight)} className="block w-full text-left">
        <span className="flex items-center gap-2 text-[12.5px] font-semibold text-muted">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorOf(highlight.color).dot }} aria-hidden="true" />
          Page {highlight.page}
          {!highlight.verified && <StatusPill tone="warning">Not matched to the extracted text</StatusPill>}
        </span>
        <span className="mt-1.5 line-clamp-4 block border-l-2 pl-2.5 text-[13.5px] leading-relaxed text-ink-2" style={{ borderColor: colorOf(highlight.color).dot }}>{highlight.quote}</span>
      </button>
      <label className="mt-2 block">
        <span className="sr-only">Note</span>
        <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={4000} rows={note ? 3 : 1} placeholder="Add a note"
          onBlur={() => { if (note.trim() !== highlight.note) void patch({ note }); }}
          className="w-full resize-y rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[13.5px] text-ink placeholder:text-subtle focus:border-brand focus:outline-none" />
      </label>
      {(highlight.project_links.length > 0 || highlight.matrix_links.length > 0) && (
        <ul className="mt-1.5 space-y-1 text-[12.5px] text-muted">
          {highlight.project_links.map((link) => (
            <li key={link.finding_id}>
              <Link className="font-medium text-brand-600 hover:underline" href={`/projects/${encodeURIComponent(link.project_id)}?evidence=${encodeURIComponent(link.source_id)}&finding=${encodeURIComponent(link.finding_id)}#project-evidence-title`}>
                In {link.project_name ?? 'a project'}
              </Link>
              {link.status ? ` · ${STATUS_LABELS[link.status] ?? link.status.replaceAll('_', ' ')}` : link.project_name ? ' · finding removed' : ''}
            </li>
          ))}
          {highlight.matrix_links.map((link) => (
            <li key={`${link.matrix_id}-${link.column_id}`}>
              <Link className="font-medium text-brand-600 hover:underline" href={`/matrix/${encodeURIComponent(link.matrix_id)}`}>In {matrixTitle(link.matrix_id)}</Link>
              {columnLabel(link.matrix_id, link.column_id) ? ` · ${columnLabel(link.matrix_id, link.column_id)}` : ''}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <ColorDots label="Highlight colour" value={highlight.color} onChange={(color) => { if (color !== highlight.color) void patch({ color }); }} />
        <span className="flex-1" />
        <Button size="sm" variant={mode === 'project' ? 'primary' : 'ghost'} aria-expanded={mode === 'project'} onClick={() => setMode(mode === 'project' ? null : 'project')}><LuFolderPlus aria-hidden="true" /> Project</Button>
        <Button size="sm" variant={mode === 'matrix' ? 'primary' : 'ghost'} aria-expanded={mode === 'matrix'} onClick={() => setMode(mode === 'matrix' ? null : 'matrix')}><LuTable2 aria-hidden="true" /> Matrix</Button>
        <Button size="sm" variant="ghost" aria-label="Delete highlight" disabled={busy} onClick={remove}><LuTrash2 aria-hidden="true" /></Button>
      </div>
      {mode === 'project' && <ToProject path={path} highlight={highlight} note={note} projects={projects} onDone={async () => { setMode(null); await onReload(); }} />}
      {mode === 'matrix' && <ToMatrix path={path} matrices={matrices} onDone={async () => { setMode(null); await onReload(); }} />}
    </li>
  );
}

function ToProject({ path, highlight, note, projects, onDone }: { path: string; highlight: Highlight; note: string; projects: ProjectOption[]; onDone: () => Promise<void> }) {
  const editable = projects.filter((project) => project.role === 'owner' || project.role === 'edit');
  const [projectId, setProjectId] = useState(editable[0]?.id ?? '');
  const [finding, setFinding] = useState(note.trim());
  const [interpretation, setInterpretation] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!editable.length) return <p className="mt-3 rounded-lg bg-soft p-3 text-[13px] text-muted">You need a project you can edit. <Link className="font-semibold text-brand-600 underline" href="/projects">Open Projects</Link></p>;
  const send = async () => {
    setBusy(true);
    try { await api(`${path}/project`, { method: 'POST', body: JSON.stringify({ project_id: projectId, finding, interpretation }) }); await onDone(); }
    catch (error) { showError(error); } finally { setBusy(false); }
  };
  return (
    <form className="mt-3 space-y-2 rounded-lg bg-soft p-3" onSubmit={(event) => { event.preventDefault(); void send(); }}>
      <label className="block text-[13px] font-medium">Project
        <select className={`${inputClass} mt-1 h-10 text-[14px]`} value={projectId} onChange={(event) => setProjectId(event.target.value)}>
          {editable.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
      </label>
      <label className="block text-[13px] font-medium">Finding
        <textarea className={`${inputClass} mt-1 h-20 py-2 text-[14px]`} value={finding} onChange={(event) => setFinding(event.target.value)} maxLength={4000} placeholder="What this passage shows" />
      </label>
      <label className="flex min-h-9 items-center gap-2 text-[13px]"><input type="checkbox" checked={interpretation} onChange={(event) => setInterpretation(event.target.checked)} />This is my interpretation of the passage</label>
      <p className="text-[12px] text-muted">The quote and page {highlight.page} go with it. Project members review it before it counts as evidence; the first finding shares this paper&apos;s text and PDF with the project.</p>
      <Button type="submit" size="sm" variant="primary" disabled={busy || !projectId || !finding.trim()}>{busy ? 'Sending…' : 'Send for review'}</Button>
    </form>
  );
}

function ToMatrix({ path, matrices, onDone }: { path: string; matrices: MatrixOption[]; onDone: () => Promise<void> }) {
  const open = matrices.filter((matrix) => !matrix.archived);
  const [matrixId, setMatrixId] = useState(open[0]?.id ?? '');
  const matrix = open.find((item) => item.id === matrixId);
  const [columnId, setColumnId] = useState(open[0]?.columns[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  if (!open.length) return <p className="mt-3 rounded-lg bg-soft p-3 text-[13px] text-muted">No review matrix yet. Create one from the Library, then add highlights to its cells.</p>;
  const send = async () => {
    setBusy(true);
    try { await api(`${path}/matrix`, { method: 'POST', body: JSON.stringify({ matrix_id: matrixId, column_id: columnId }) }); await onDone(); }
    catch (error) { showError(error); } finally { setBusy(false); }
  };
  return (
    <form className="mt-3 space-y-2 rounded-lg bg-soft p-3" onSubmit={(event) => { event.preventDefault(); void send(); }}>
      <label className="block text-[13px] font-medium">Matrix
        <select className={`${inputClass} mt-1 h-10 text-[14px]`} value={matrixId} onChange={(event) => { setMatrixId(event.target.value); setColumnId(open.find((item) => item.id === event.target.value)?.columns[0]?.id ?? ''); }}>
          {open.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
      </label>
      <label className="block text-[13px] font-medium">Column
        <select className={`${inputClass} mt-1 h-10 text-[14px]`} value={columnId} onChange={(event) => setColumnId(event.target.value)}>
          {matrix?.columns.map((column) => <option key={column.id} value={column.id}>{column.label}</option>)}
        </select>
      </label>
      <p className="text-[12px] text-muted">The cell gets your note (or the quote) with the quote and page as its evidence. The paper is added to the matrix if it is not in it yet; a cell you already wrote is replaced.</p>
      <Button type="submit" size="sm" variant="primary" disabled={busy || !matrixId || !columnId}>{busy ? 'Adding…' : 'Add to matrix'}</Button>
    </form>
  );
}
