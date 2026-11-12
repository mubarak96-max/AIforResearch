'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/session';
import { Button, inputClass } from '@/components/app/ui';
import { showError } from '@/components/app/research/parts';
import type { SrRecord } from './types';

type LibraryFile = { id: string; title?: string; filename: string };
type Page = { page: number | null; text: string; order: number };

export function FullTextPanel({ reviewId, record, canEdit, reload }: { reviewId: string; record: SrRecord; canEdit: boolean; reload: () => Promise<void> }) {
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [selected, setSelected] = useState('');
  const [pages, setPages] = useState<Page[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const base = `/api/systematic-reviews/${reviewId}/records/${record.id}/full-text`;

  useEffect(() => {
    setPages(null); setError(null); setSelected('');
  }, [record.id, record.full_text?.revision]);

  const find = async () => {
    setBusy(true); setError(null);
    try {
      const result = await api<{ documents: LibraryFile[] }>(`/api/library/documents?status=completed&page_size=100&search=${encodeURIComponent(query)}`);
      setFiles(result.documents);
      if (!result.documents.length) setError('No processed documents found. Add a PDF in your Library, then search again.');
    } catch (caught) { setError((caught as Error).message); } finally { setBusy(false); }
  };
  const attach = async () => {
    if (!selected) return;
    setBusy(true); setError(null);
    try {
      await api(base, { method: 'POST', body: JSON.stringify({ library_document_id: selected }) });
      await reload();
    } catch (caught) { showError(caught); } finally { setBusy(false); }
  };
  const read = async () => {
    setBusy(true); setError(null);
    try { setPages((await api<{ pages: Page[] }>(base)).pages); }
    catch (caught) { setError((caught as Error).message); } finally { setBusy(false); }
  };

  return <section aria-label="Full-text evidence" className="mt-4 rounded-xl border border-line bg-soft p-4">
    <h3 className="text-[15px] font-semibold">Full-text evidence</h3>
    {record.full_text ? <>
      <p className="mt-1 text-[13px] text-ink-2">{record.full_text.title} · {record.full_text.pages} pages · Attached {new Date(record.full_text.attached_at).toLocaleDateString()}</p>
      <Button className="mt-2" size="sm" onClick={read} disabled={busy}>{busy ? 'Loading…' : 'Read attached text'}</Button>
    </> : <p className="mt-1 text-[13px] text-muted">No full text attached. AI cannot screen or extract from the full text until one is attached.</p>}
    {pages && <div className="mt-3 max-h-[420px] overflow-y-auto rounded-lg bg-surface p-3" tabIndex={0} aria-label="Extracted full text">
      {pages.map((page) => <div key={page.order} className="mb-4"><p className="text-xs font-semibold text-muted">Page {page.page ?? 'unknown'}</p><p className="mt-1 whitespace-pre-wrap text-[14px] leading-6">{page.text}</p></div>)}
    </div>}
    {canEdit && <details className="mt-3 text-[13px]">
      <summary className="cursor-pointer font-semibold text-brand">{record.full_text ? 'Replace attached text' : 'Attach from your Library'}</summary>
      <p className="mt-2 text-muted">The selected text is copied into this review and shared with its members. Replacing it resets full-text decisions, extraction, and appraisal; earlier decisions remain in the audit history.</p>
      <div className="mt-2 flex gap-2"><input value={query} onChange={(event) => setQuery(event.target.value)} className={`${inputClass} min-w-0 flex-1`} aria-label="Search Library documents" placeholder="Title or DOI" /><Button onClick={find} disabled={busy}>Find</Button></div>
      {files.length > 0 && <div className="mt-2 flex gap-2"><select className={`${inputClass} min-w-0 flex-1`} value={selected} onChange={(event) => setSelected(event.target.value)} aria-label="Full-text document"><option value="">Choose a document</option>{files.map((file) => <option key={file.id} value={file.id}>{file.title || file.filename}</option>)}</select><Button onClick={attach} disabled={busy || !selected}>Attach</Button></div>}
      <Link href="/library" className="mt-2 inline-block text-brand underline">Open Library to upload a document</Link>
    </details>}
    {error && <p role="alert" className="mt-2 text-[13px] text-red-700">{error}</p>}
  </section>;
}
