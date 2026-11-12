'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, authHeaders } from '@/lib/session';
import { Button, Card, inputClass } from './ui';
import { showError } from './research/parts';

type Finding = { id: string; finding: string; quote: string; page: number | null; interpretation: boolean; status: string; reviewed_by?: string; reviews?: { id: string; decision: string; note: string; reviewer_name: string; created_at: string }[] };
type Source = { id: string; title: string; basis: string; source_type: string; sha256: string; has_file?: boolean; pages?: { page: number; text: string }[]; findings?: Finding[] };
type LibraryDocument = { id: string; title?: string; filename: string };
type LibraryPage = { documents: LibraryDocument[]; page: number; total: number; has_more: boolean };
export function ProjectEvidence({ projectId, role }: { projectId: string; role: 'owner' | 'edit' | 'comment' | 'view' }) {
  const base = `/api/projects/${encodeURIComponent(projectId)}/evidence`;
  const params = useSearchParams();
  const router = useRouter();
  const requestedSource = params.get('evidence'); const requestedFinding = params.get('finding');
  const [sources, setSources] = useState<Source[]>([]);
  const [library, setLibrary] = useState<LibraryDocument[]>([]);
  const [librarySearch, setLibrarySearch] = useState(''); const [libraryQuery, setLibraryQuery] = useState('');
  const [libraryPage, setLibraryPage] = useState(0); const [libraryTotal, setLibraryTotal] = useState(0);
  const [libraryMore, setLibraryMore] = useState(false); const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState(''); const libraryRequest = useRef(0); const sourceRequest = useRef(0);
  const lastLibraryRequest = useRef({ query: '', page: 1 });
  const [selected, setSelected] = useState<Source | null>(null);
  const [documentId, setDocumentId] = useState('');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [sourceType, setSourceType] = useState('paper');
  const [edition, setEdition] = useState('');
  const [language, setLanguage] = useState('');
  const [url, setUrl] = useState('');
  const [interpretation, setInterpretation] = useState(false);
  const [finding, setFinding] = useState('');
  const [quote, setQuote] = useState('');
  const [page, setPage] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const canEdit = role === 'owner' || role === 'edit';
  const load = () => api<{ sources: Source[] }>(base).then((data) => setSources(data.sources));
  const loadLibrary = async (query: string, page: number) => {
    lastLibraryRequest.current = { query, page };
    const request = ++libraryRequest.current; setLibraryLoading(true); setLibraryError('');
    if (page === 1) setDocumentId('');
    try {
      const queryParams = new URLSearchParams({ page: String(page), page_size: '100' });
      if (query.trim()) queryParams.set('search', query.trim());
      const result = await api<LibraryPage>(`/api/library/documents?${queryParams}`);
      if (request !== libraryRequest.current) return;
      setLibrary((previous) => [...new Map([...(page === 1 ? [] : previous), ...result.documents].map((doc) => [doc.id, doc])).values()]);
      setLibraryPage(result.page); setLibraryTotal(result.total); setLibraryMore(result.has_more); setLibraryQuery(query.trim());
    } catch (error) { if (request === libraryRequest.current) setLibraryError((error as Error).message); }
    finally { if (request === libraryRequest.current) setLibraryLoading(false); }
  };
  useEffect(() => { setSelected(null); load().catch(showError); if (canEdit) void loadLibrary('', 1); return () => { libraryRequest.current += 1; sourceRequest.current += 1; }; }, [projectId, canEdit]); // eslint-disable-line react-hooks/exhaustive-deps
  const open = async (id: string) => {
    const request = ++sourceRequest.current;
    try { const source = await api<Source>(`${base}/${encodeURIComponent(id)}`); if (request === sourceRequest.current) setSelected(source); }
    catch (error) { if (request === sourceRequest.current) showError(error); }
  };
  useEffect(() => { if (requestedSource) void open(requestedSource); }, [projectId, requestedSource]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (requestedFinding && selected?.id === requestedSource) document.getElementById(`project-finding-${requestedFinding}`)?.scrollIntoView({ block: 'center' }); }, [selected, requestedSource, requestedFinding]);
  const changed = () => window.dispatchEvent(new CustomEvent('project-evidence-changed', { detail: projectId }));
  const selectSource = (id: string) => {
    const query = new URLSearchParams(params.toString()); query.set('evidence', id); query.delete('finding');
    router.replace(`/projects/${encodeURIComponent(projectId)}?${query}#project-evidence-title`, { scroll: false });
  };
  const add = async () => {
    setBusy(true);
    try {
      const doc = library.find((item) => item.id === documentId);
      const source = await api<Source>(base, { method: 'POST', body: JSON.stringify({ title: title || doc?.title || doc?.filename, library_document_id: documentId || undefined, text, source_type: sourceType, edition, language, url: url || undefined }) });
      setTitle(''); setText(''); setDocumentId(''); await load(); selectSource(source.id);
    } catch (error) { showError(error); } finally { setBusy(false); }
  };
  const addFinding = async () => {
    if (!selected) return;
    setBusy(true);
    try { await api(`${base}/${selected.id}/findings`, { method: 'POST', body: JSON.stringify({ finding, quote, page: page ? Number(page) : null, interpretation }) }); setFinding(''); setQuote(''); await open(selected.id); changed(); }
    catch (error) { showError(error); } finally { setBusy(false); }
  };
  const review = async (id: string, decision: string) => {
    if (!selected) return;
    setBusy(true);
    try { await api(`${base}/${selected.id}/findings/${id}/reviews`, { method: 'POST', body: JSON.stringify({ decision, note }) }); setNote(''); await open(selected.id); changed(); }
    catch (error) { showError(error); } finally { setBusy(false); }
  };
  const download = () => {
    if (!selected) return;
    const blob = new Blob([JSON.stringify(selected, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'evidence-bundle.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const downloadPdf = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const response = await fetch(`${base}/${selected.id}/file`, { headers: await authHeaders() });
      if (!response.ok) throw new Error('The shared PDF could not be downloaded.');
      const href = URL.createObjectURL(await response.blob()); const link = document.createElement('a'); link.href = href; link.download = `${selected.title.replace(/[^\p{L}\p{N}\s-]/gu, '').slice(0, 100) || 'source'}.pdf`; link.click(); setTimeout(() => URL.revokeObjectURL(href), 1000);
    } catch (error) { showError(error); } finally { setBusy(false); }
  };
  return <section aria-labelledby="project-evidence-title" className="mt-8">
    <h2 id="project-evidence-title" className="text-lg font-bold">Shared evidence</h2>
    <p className="mt-1 text-sm text-muted">Keep source snapshots and findings here so everyone in this project can inspect the same evidence.</p>
    {canEdit && <Card className="mt-3 space-y-3 p-4">
      <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => { event.preventDefault(); void loadLibrary(librarySearch, 1); }}><label className="block min-w-0 flex-1 text-sm font-medium">Find a Library source<input className={`${inputClass} mt-1 w-full`} value={librarySearch} onChange={(event) => setLibrarySearch(event.target.value)} maxLength={300} placeholder="Title, filename or DOI" /></label><Button type="submit" disabled={busy || libraryLoading}>Search Library</Button>{libraryQuery && <Button disabled={busy || libraryLoading} onClick={() => { setLibrarySearch(''); void loadLibrary('', 1); }}>Browse all</Button>}</form>
      {libraryError && <p role="alert" className="text-sm text-red-700">{libraryError} <button type="button" className="font-semibold underline" onClick={() => void loadLibrary(lastLibraryRequest.current.query, lastLibraryRequest.current.page)}>Retry</button></p>}
      <label className="block text-sm font-medium">Source from your Library<select disabled={libraryLoading || busy} className={`${inputClass} mt-1 w-full`} value={documentId} onChange={(event) => setDocumentId(event.target.value)}><option value="">Paste source text instead</option>{library.map((doc) => <option key={doc.id} value={doc.id}>{doc.title || doc.filename}</option>)}</select></label>
      <div className="flex flex-wrap items-center gap-3"><p role="status" className="text-xs text-muted">{libraryLoading ? 'Loading Library sources…' : `${library.length.toLocaleString()} of ${libraryTotal.toLocaleString()} ${libraryQuery ? 'matching ' : ''}sources loaded`}</p>{libraryMore && <Button size="sm" disabled={busy || libraryLoading} onClick={() => void loadLibrary(libraryQuery, libraryPage + 1)}>Load more sources</Button>}</div>
      {libraryQuery && <p className="text-xs text-muted">Library search checks the latest 10,000 sources. Browse all and load more to reach older sources.</p>}
      <label className="block text-sm font-medium">Source title<input className={`${inputClass} mt-1 w-full`} value={title} onChange={(event) => setTitle(event.target.value)} placeholder={documentId ? 'Use the Library title' : 'Name this source'} /></label>
      <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-medium">Source type<select className={`${inputClass} mt-1 w-full`} value={sourceType} onChange={(event) => setSourceType(event.target.value)}>{['paper', 'book', 'archive', 'report', 'dataset', 'filing', 'guideline', 'other'].map((value) => <option key={value}>{value}</option>)}</select></label><label className="block text-sm font-medium">Edition or version<input className={`${inputClass} mt-1 w-full`} value={edition} onChange={(event) => setEdition(event.target.value)} maxLength={150} /></label><label className="block text-sm font-medium">Original language<input className={`${inputClass} mt-1 w-full`} value={language} onChange={(event) => setLanguage(event.target.value)} maxLength={80} /></label><label className="block text-sm font-medium">Source URL<input type="url" className={`${inputClass} mt-1 w-full`} value={url} onChange={(event) => setUrl(event.target.value)} maxLength={2000} /></label></div>
      {!documentId && <label className="block text-sm font-medium">Source text<textarea className={`${inputClass} mt-1 h-28 w-full py-2`} value={text} onChange={(event) => setText(event.target.value)} /></label>}
      <p className="text-xs text-muted">Adding a source shares its text snapshot and available PDF with this project's members.</p>
      <Button disabled={busy || libraryLoading || (!documentId && (!title.trim() || !text.trim()))} onClick={add}>Add shared source</Button>
    </Card>}
    <ul className="my-3 space-y-2">{sources.map((source) => <li key={source.id}><button className="w-full rounded-lg border border-line p-3 text-left hover:bg-soft" onClick={() => selectSource(source.id)}><span className="font-medium">{source.title}</span><span className="ml-2 text-xs text-muted">{source.basis.replaceAll('_', ' ')}</span></button></li>)}</ul>
    {!sources.length && <p className="py-4 text-sm text-muted">No shared sources yet.</p>}
    {selected && <Card className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">{selected.title}</h3><Button size="sm" onClick={download}>Export evidence</Button></div>
      {selected.has_file && <Button size="sm" disabled={busy} onClick={downloadPdf}>Download source PDF</Button>}
      <details><summary className="cursor-pointer text-sm font-semibold">Inspect source text</summary><div className="mt-3 max-h-80 overflow-auto">{selected.pages?.map((item) => <div key={item.page} className="mb-4"><h4 className="text-xs font-bold">Page {item.page}</h4><p className="whitespace-pre-wrap text-sm">{item.text}</p></div>)}</div></details>
      {selected.findings?.map((item) => <article id={`project-finding-${item.id}`} key={item.id} className="scroll-mt-24 rounded-lg border border-line p-3"><p className="font-medium">{item.finding}</p><blockquote className="mt-2 border-l-2 border-brand pl-3 text-sm text-muted">{item.quote}</blockquote><p className="mt-2 text-xs">{item.page ? `Page ${item.page} · ` : ''}{item.status.replaceAll('_', ' ')}{item.reviewed_by ? ` · ${item.reviewed_by}` : ''}</p>{role !== 'view' && <div className="mt-2 flex flex-wrap gap-2"><Button size="sm" disabled={busy || !note.trim()} onClick={() => review(item.id, 'approved')}>Approve finding</Button><Button size="sm" disabled={busy || !note.trim()} onClick={() => review(item.id, 'needs_revision')}>Request revision</Button></div>}</article>)}
      {role !== 'view' && <label className="block text-sm font-medium">Review note<textarea className={`${inputClass} mt-1 h-20 w-full py-2`} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Explain your approval or the change needed, then select a finding above." /></label>}
      {selected.findings?.some((item) => item.reviews?.length) && <details><summary className="cursor-pointer text-sm font-semibold">Decision history</summary><ul className="mt-3 space-y-3">{selected.findings.flatMap((item) => (item.reviews || []).map((review) => <li key={review.id} className="rounded-lg bg-soft p-3 text-sm"><p className="font-medium">{item.finding}</p><p>{review.reviewer_name}: {review.decision.replaceAll('_', ' ')} · {new Date(review.created_at).toLocaleString()}</p><p className="mt-1 whitespace-pre-wrap">{review.note}</p></li>))}</ul></details>}
      {canEdit && <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={interpretation} onChange={(event) => setInterpretation(event.target.checked)} />The next finding is my interpretation of the passage</label>}
      {canEdit && <div className="space-y-3 border-t border-line pt-4"><h4 className="font-semibold">Record a finding</h4><label className="block text-sm">Finding<textarea className={`${inputClass} mt-1 h-20 w-full py-2`} value={finding} onChange={(event) => setFinding(event.target.value)} /></label><label className="block text-sm">Exact supporting quotation<textarea className={`${inputClass} mt-1 h-20 w-full py-2`} value={quote} onChange={(event) => setQuote(event.target.value)} /></label><label className="block text-sm">Page (optional)<input type="number" min="1" className={`${inputClass} ml-2 w-24`} value={page} onChange={(event) => setPage(event.target.value)} /></label><Button disabled={busy || !finding.trim() || !quote.trim()} onClick={addFinding}>Save for review</Button></div>}
    </Card>}
  </section>;
}
