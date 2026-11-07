'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LuPlus, LuTable2, LuX } from 'react-icons/lu';
import { AppFrame } from '@/components/app/AppFrame';
import { Button, Card, EmptyState, inputClass } from '@/components/app/ui';
import { PaperPicker } from '@/components/matrix/PaperPicker';
import { api, useSession } from '@/lib/session';

type Column = { id: string; label: string; prompt: string };
type MatrixSummary = { id: string; title: string; columns: Column[]; paper_count: number; updated_at: string };

/** Literature review matrices: the list, and a new one from Library papers. */
export default function MatricesPage() {
  const router = useRouter();
  const { user, loading } = useSession();
  const [matrices, setMatrices] = useState<MatrixSummary[] | null>(null);
  const [defaults, setDefaults] = useState<Column[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login?next=/matrix'); return; }
    api<{ matrices: MatrixSummary[]; default_columns: Column[] }>('/api/matrices')
      .then((result) => { setMatrices(result.matrices); setDefaults(result.default_columns); })
      .catch((caught) => setError((caught as Error).message));
  }, [loading, router, user]);

  return (
    <AppFrame title="Review matrix" wide actions={<Button variant="primary" onClick={() => setCreating(true)}><LuPlus className="h-4 w-4" />New matrix</Button>}>
      <p className="-mt-2 mb-5 max-w-2xl text-[15px] leading-relaxed text-muted">
        Compare papers side by side. Each row is a paper from your Library, each column a question (aim, method, sample, findings, limitations, or your own).
        WriteOrbit reads each paper and fills the cells, with the quote and page every answer comes from.
      </p>
      {error ? <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-700">{error}</p> : null}
      {matrices === null && !error ? <p className="text-[14px] text-muted">Loading…</p> : null}
      {matrices?.length === 0 ? (
        <Card>
          <EmptyState title="No matrices yet" action={<Button variant="primary" onClick={() => setCreating(true)}><LuPlus className="h-4 w-4" />New matrix</Button>}>
            Choose papers from your Library and WriteOrbit builds the comparison table for your literature review.
          </EmptyState>
        </Card>
      ) : null}
      {matrices?.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {matrices.map((matrix) => (
            <Link key={matrix.id} href={`/matrix/${matrix.id}`} className="rounded-2xl border border-line bg-surface px-5 py-4 transition-colors hover:border-brand-100 hover:bg-soft">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-brand"><LuTable2 className="h-[18px] w-[18px]" /></span>
                <span className="min-w-0 flex-1 truncate text-[15.5px] font-semibold">{matrix.title}</span>
              </div>
              <p className="mt-2 text-[13.5px] text-muted">{matrix.paper_count} paper{matrix.paper_count === 1 ? '' : 's'} · {matrix.columns.length} columns · updated {new Date(matrix.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
              <p className="mt-1 truncate text-[12.5px] text-subtle">{matrix.columns.map((column) => column.label).join(' · ')}</p>
            </Link>
          ))}
        </div>
      ) : null}
      {creating ? <NewMatrixDialog defaults={defaults} onClose={() => setCreating(false)} onCreated={(id) => router.push(`/matrix/${id}?fill=1`)} /> : null}
    </AppFrame>
  );
}

function NewMatrixDialog({ defaults, onClose, onCreated }: { defaults: Column[]; onClose: () => void; onCreated: (id: string) => void }) {
  const [title, setTitle] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [columns, setColumns] = useState<{ label: string; prompt: string; on: boolean }[]>(() => defaults.map((column) => ({ label: column.label, prompt: column.prompt, on: true })));
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addCustom = () => {
    const label = custom.trim();
    if (!label) return;
    setColumns((current) => [...current, { label, prompt: label, on: true }]);
    setCustom('');
  };

  const create = async () => {
    setBusy(true); setError(null);
    try {
      const matrix = await api<{ id: string }>('/api/matrices', {
        method: 'POST',
        body: JSON.stringify({ title, document_ids: selected, folder_ids: folders, columns: columns.filter((column) => column.on).map(({ label, prompt }) => ({ label, prompt })) }),
      });
      onCreated(matrix.id);
    } catch (caught) { setError((caught as Error).message); setBusy(false); }
  };

  const chosen = columns.filter((column) => column.on).length;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(15,23,42,0.4)] p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="New review matrix">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative flex max-h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-surface shadow-xl sm:rounded-2xl">
        <div className="flex items-center gap-3 border-b border-line-2 px-5 py-4">
          <h2 className="flex-1 text-[18px] font-bold">New review matrix</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-soft"><LuX className="h-5 w-5" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <label className="block text-[13px] font-medium text-muted" htmlFor="matrix-title">Name</label>
          <input id="matrix-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Exercise and memory in older adults" className={`${inputClass} mt-1`} />

          <h3 className="mb-2 mt-5 text-[15px] font-semibold">Papers</h3>
          <PaperPicker selected={selected} onSelected={setSelected} folders={folders} onFolders={setFolders} />

          <h3 className="mb-2 mt-5 text-[15px] font-semibold">Columns</h3>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {columns.map((column, index) => (
              <li key={`${column.label}-${index}`}>
                <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-line-2 px-3 py-2 hover:bg-soft">
                  <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--color-brand)]" checked={column.on} onChange={() => setColumns((current) => current.map((item, i) => (i === index ? { ...item, on: !item.on } : item)))} />
                  <span className="min-w-0">
                    <span className="block text-[14px] font-medium">{column.label}</span>
                    {column.prompt !== column.label ? <span className="block text-[12.5px] leading-snug text-muted">{column.prompt}</span> : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex gap-2">
            <input value={custom} onChange={(event) => setCustom(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCustom(); } }} placeholder="Add your own column, e.g. Theoretical framework" className={inputClass} />
            <Button onClick={addCustom} disabled={!custom.trim()}>Add</Button>
          </div>
          {error ? <p className="mt-3 text-[13.5px] text-red-600">{error}</p> : null}
        </div>
        <div className="flex items-center gap-3 border-t border-line-2 px-5 py-3.5">
          <p className="min-w-0 flex-1 text-[13px] text-muted">Filling uses AI credits, about one answer per paper.</p>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={create} disabled={busy || (!selected.length && !folders.length) || !chosen || chosen > 12}>{busy ? 'Creating…' : 'Create and fill'}</Button>
        </div>
      </div>
    </div>
  );
}
