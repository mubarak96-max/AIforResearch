'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppFrame } from '@/components/app/AppFrame';
import { Button, Card, inputClass, StatusPill } from '@/components/app/ui';
import { useSignedIn } from '@/components/app/useSignedIn';
import { api } from '@/lib/session';
import {
  CONSENT_OPTIONS, CORE_WORKBOOK_KINDS, exportWorkbookCsv, exportWorkbookMarkdown, indicatorProgress, metricGroups, validateEntry, WORKFLOW_CATALOG,
  type RecallState, type Workbook, type WorkbookEntry, type WorkbookEvent,
} from '@/lib/workflows';
import { exportWorkflowXlsx } from '@/lib/workflowFiles';
import { TranscriptExcerptImport, WorkbookTableImport } from './WorkbookImport';
import { WorkbookLibraryPicker } from './WorkbookLibraryPicker';
import { WorkbookConnections } from './WorkbookConnections';

type Loaded = Workbook & { events?: WorkbookEvent[]; suggestion_cost?: number };
const labelClass = 'grid gap-1.5 text-[14px] font-semibold';
function download(filename: string, text: string | Blob, type: string) {
  const url = URL.createObjectURL(text instanceof Blob ? text : new Blob([text], { type }));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function WorkbookWorkspace() {
  const { user } = useSignedIn();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [workbook, setWorkbook] = useState<Loaded | null>(null);
  const [sectionKey, setSectionKey] = useState('sources');
  const [editing, setEditing] = useState<{ id?: string; values: Record<string, string> } | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [redactions, setRedactions] = useState('');
  const [showRedact, setShowRedact] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [details, setDetails] = useState({ title: '', question: '', language: '', deadline: '', deliverable: '', audience: '', success_criteria: '', source_constraints: '' });
  const [recallId, setRecallId] = useState<string | null>(null);
  const [response, setResponse] = useState('');
  const [answerVisible, setAnswerVisible] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);
  const [suggestSourceIds, setSuggestSourceIds] = useState<string[]>([]);
  const [suggestInstruction, setSuggestInstruction] = useState('');
  const [suggestions, setSuggestions] = useState<{ values: Record<string, string> }[]>([]);
  const [importConsent, setImportConsent] = useState<string>('approved private use');
  const fileInput = useRef<HTMLInputElement>(null);
  const topForm = useRef<HTMLDivElement>(null);
  const base = `/api/workbooks/${encodeURIComponent(id)}`;
  const load = async () => {
    const data = await api<Loaded>(base); setWorkbook(data); return data;
  };
  useEffect(() => {
    if (!user || !id) return;
    let alive = true;
    api<Loaded>(base).then((data) => { if (alive) { setWorkbook(data); const requested = new URLSearchParams(window.location.search).get('section'); if (requested && WORKFLOW_CATALOG[data.kind].sections.some((section) => section.key === requested)) setSectionKey(requested); } }).catch((e) => { if (alive) setError((e as Error).message); });
    return () => { alive = false; };
  }, [user, id, base]);

  const mutate = async (path: string, body: Record<string, unknown>, method = 'POST'): Promise<boolean> => {
    if (!workbook || busy) return false;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await api<Loaded>(`${base}${path}`, { method, body: JSON.stringify({ revision: workbook.revision, ...body }) });
      setWorkbook(result); setNotice('Saved.');
      // Events are appended server-side; reload them without interfering with edited fields.
      void api<Loaded>(base).then((fresh) => setWorkbook((current) => current && fresh.revision >= current.revision ? fresh : current)).catch(() => undefined);
      return true;
    } catch (e) { setError((e as Error).message); return false; }
    finally { setBusy(false); }
  };

  const saveEntry = async () => {
    if (!workbook || !editing) return;
    try { validateEntry(workbook.kind, sectionKey, editing.values, workbook.entries, editing.id); }
    catch (e) { setError((e as Error).message); return; }
    if (await mutate('/entries', { ...editing, section: sectionKey })) setEditing(null);
  };
  const editEntry = (entry?: WorkbookEntry) => { setEditing({ id: entry?.id, values: { ...(entry?.values || {}) } }); setError(''); setTimeout(() => topForm.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 0); };
  const removeEntry = async (entry: WorkbookEntry) => {
    if (!window.confirm('Delete this entry? Sources used by other entries must be relinked first.')) return;
    await mutate(`/entries/${entry.id}`, {}, 'DELETE');
  };
  const exportJson = async () => {
    setBusy(true); setError('');
    try { download(`${workbook?.title || 'workbook'}.json`, JSON.stringify(await api(`${base}/export`), null, 2), 'application/json'); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const exportExcel = async () => {
    if (!workbook) return;
    setBusy(true); setError('');
    try { const bytes = await exportWorkflowXlsx(workbook); download(`${workbook.title}.xlsx`, new Blob([new Uint8Array(bytes).buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), ''); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const importText = async (file: File | undefined) => {
    if (!file || !workbook) return;
    if (file.size > 640000 || !/\.(txt|md|csv|tsv|srt|vtt)$/i.test(file.name)) { setError('Choose a text, Markdown, CSV, TSV or transcript file up to 640 KB. Import PDFs through your Library.'); return; }
    const text = await file.text();
    if (text.length > 160000) { setError('Split this source into sections of up to 160,000 characters. Nothing was truncated.'); return; }
    setSectionKey('sources'); setEditing({ values: { title: file.name, kind: workbook.kind === 'qualitative' ? 'transcript' : 'other', text, reference: file.name } });
    setNotice('Review the source and choose its permission before saving.');
  };
  const rateRecall = async (rating: RecallState['rating']) => {
    if (await mutate('/recall', { card_id: recallId, rating, response })) { setRecallId(null); setAnswerVisible(false); setResponse(''); }
  };
  const suggest = async () => {
    setBusy(true); setError(''); setSuggestions([]);
    try {
      const result = await api<{ entries: { values: Record<string, string> }[]; rejected: number; coverage: { title: string; characters_read: number; partial: boolean }[] }>(`${base}/suggest`, { method: 'POST', body: JSON.stringify({ section: sectionKey, source_ids: suggestSourceIds, instruction: suggestInstruction }) });
      setSuggestions(result.entries);
      setNotice(`Suggestions ready for your review. ${result.coverage.map((s) => `${s.title}: ${s.partial ? 'first ' : ''}${s.characters_read.toLocaleString()} characters`).join('; ')}.${result.rejected ? ` ${result.rejected} invalid suggestions were discarded.` : ''}`);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const deleteWorkbook = async () => {
    if (!window.confirm('Delete this workbook, its sources and audit history? Export a copy first if you need it.')) return;
    setBusy(true);
    try { await api(base, { method: 'DELETE' }); router.push('/workbooks'); } catch (e) { setError((e as Error).message); setBusy(false); }
  };

  if (!workbook) return <AppFrame title="Workbook"><p role={error ? 'alert' : 'status'}>{error || 'Loading your work…'}</p><Link href="/workbooks" className="mt-4 block text-brand">All workbooks</Link></AppFrame>;
  const catalog = WORKFLOW_CATALOG[workbook.kind];
  const section = catalog.sections.find((item) => item.key === sectionKey) || catalog.sections[0];
  const entries = workbook.entries.filter((item) => item.section === section.key);
  const sources = workbook.entries.filter((item) => item.section === 'sources');
  const canEdit = workbook.role === 'owner' || workbook.role === 'edit';
  const canReview = workbook.role === 'owner' || workbook.role === 'comment';
  const cards = workbook.entries.filter((item) => item.section === 'cards');
  const due = cards.filter((card) => !workbook.recalls.find((r) => r.card_id === card.id) || Date.parse(workbook.recalls.find((r) => r.card_id === card.id)!.due_at) <= Date.now());
  const recall = cards.find((card) => card.id === recallId);
  const metrics = workbook.kind === 'finance' && section.key === 'metrics' ? metricGroups(entries) : [];

  return <AppFrame wide title={workbook.title} subtitle={catalog.description} actions={<Link href="/workbooks" className="text-sm font-semibold text-brand">All workbooks</Link>}>
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <StatusPill tone={workbook.status === 'approved' ? 'positive' : workbook.status === 'changes_requested' ? 'warning' : 'neutral'}>{workbook.status.replaceAll('_', ' ')}</StatusPill>
      <span className="text-sm text-muted">Revision {workbook.revision} · {workbook.entries.length} entries{workbook.deadline ? ` · Due ${workbook.deadline}` : ''}{workbook.language ? ` · ${workbook.language}` : ''}</span>
      {workbook.project_id && <Link href={`/projects/${workbook.project_id}`} className="text-sm text-brand">Shared project</Link>}
    </div>
    {workbook.question && <p className="mb-5 max-w-3xl whitespace-pre-wrap text-[15px] leading-relaxed text-ink-2">{workbook.question}</p>}
    {(workbook.deliverable || workbook.audience || workbook.success_criteria || workbook.source_constraints) && <details className="mb-5 rounded-2xl border border-line bg-surface p-5" open><summary className="cursor-pointer font-semibold">Deliverable brief</summary><dl className="mt-3 grid gap-3 sm:grid-cols-2">{[['Deliverable', workbook.deliverable], ['Audience', workbook.audience], ['Success criteria', workbook.success_criteria], ['Sources and scope', workbook.source_constraints]].filter(([, value]) => value).map(([label, value]) => <div key={label}><dt className="text-xs font-semibold text-muted">{label}</dt><dd className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{value}</dd></div>)}</dl></details>}
    {CORE_WORKBOOK_KINDS.includes(workbook.kind) && (
      <WorkbookConnections workbook={workbook} busy={busy} canEdit={canEdit} save={mutate} onError={setError} onNotice={setNotice} />
    )}
    <div className="mb-5 flex flex-wrap gap-2">
      <Button size="sm" onClick={() => download(`${workbook.title}.md`, exportWorkbookMarkdown(workbook), 'text/markdown')}>Export report</Button>
      <Button size="sm" onClick={() => download(`${workbook.title}.csv`, exportWorkbookCsv(workbook), 'text/csv;charset=utf-8')}>Export table</Button>
      <Button size="sm" onClick={() => void exportExcel()} disabled={busy}>Export Excel</Button>
      <Button size="sm" onClick={() => void exportJson()} disabled={busy}>Evidence bundle</Button>
      <Button size="sm" onClick={() => setShowReview(!showReview)}>Review</Button>
      {canEdit && <><Button size="sm" onClick={() => { setShowSettings(!showSettings); setDetails({ title: workbook.title, question: workbook.question, language: workbook.language, deadline: workbook.deadline, deliverable: workbook.deliverable || '', audience: workbook.audience || '', success_criteria: workbook.success_criteria || '', source_constraints: workbook.source_constraints || '' }); }}>Details</Button><Button size="sm" onClick={() => setShowRedact(!showRedact)}>Redact</Button></>}
      <Button size="sm" disabled={busy} onClick={() => void load().then(() => setNotice('Latest saved version loaded.')).catch((e) => setError((e as Error).message))}>Reload saved version</Button>
    </div>
    <p className="mb-4 text-xs text-muted">Reports omit full source texts. The evidence bundle contains source text, entries and audit events; share it according to your sources’ permissions.</p>
    {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
    {notice && <p role="status" className="mb-4 text-sm text-brand">{notice}</p>}
    {showSettings && canEdit && <Card className="mb-5 p-5"><form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void mutate('', details, 'PATCH').then((ok) => { if (ok) setShowSettings(false); }); }}>
      <label className={`${labelClass} sm:col-span-2`}>Title<input required maxLength={200} className={inputClass} value={details.title} onChange={(e) => setDetails({ ...details, title: e.target.value })} /></label>
      <label className={`${labelClass} sm:col-span-2`}>Question / deliverable<textarea rows={3} maxLength={5000} className={`${inputClass} h-auto py-3`} value={details.question} onChange={(e) => setDetails({ ...details, question: e.target.value })} /></label>
      <label className={labelClass}>Working language<input maxLength={100} className={inputClass} value={details.language} onChange={(e) => setDetails({ ...details, language: e.target.value })} /></label>
      <label className={labelClass}>Deadline<input type="date" className={inputClass} value={details.deadline} onChange={(e) => setDetails({ ...details, deadline: e.target.value })} /></label>
      <label className={labelClass}>Deliverable<input maxLength={200} className={inputClass} value={details.deliverable} onChange={(e) => setDetails({ ...details, deliverable: e.target.value })} /></label>
      <label className={labelClass}>Intended audience<input maxLength={1000} className={inputClass} value={details.audience} onChange={(e) => setDetails({ ...details, audience: e.target.value })} /></label>
      <label className={`${labelClass} sm:col-span-2`}>Success criteria<textarea rows={2} maxLength={5000} className={`${inputClass} h-auto py-3`} value={details.success_criteria} onChange={(e) => setDetails({ ...details, success_criteria: e.target.value })} /></label>
      <label className={`${labelClass} sm:col-span-2`}>Sources and scope<textarea rows={2} maxLength={5000} className={`${inputClass} h-auto py-3`} value={details.source_constraints} onChange={(e) => setDetails({ ...details, source_constraints: e.target.value })} /></label>
      <div className="flex gap-2 sm:col-span-2"><Button type="submit" variant="primary" disabled={busy}>Save details</Button>{workbook.role === 'owner' && <Button variant="danger" disabled={busy} onClick={() => void deleteWorkbook()}>Delete workbook</Button>}</div>
    </form></Card>}
    {showReview && <Card className="mb-5 p-5"><h2 className="font-bold">Review and sign-off</h2><p className="mt-1 text-sm text-muted">Review applies to the saved revision. Content changes return the workbook to draft. Project owners and comment reviewers can record a decision.</p>
      {workbook.review_note && <blockquote className="my-3 whitespace-pre-wrap border-l-2 border-brand pl-3 text-sm">{workbook.review_note}</blockquote>}
      {(canEdit || canReview) && <label className={`${labelClass} mt-3`}>Review note<textarea maxLength={5000} rows={3} className={`${inputClass} h-auto py-3`} value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} /></label>}
      <div className="mt-3 flex flex-wrap gap-2">{canEdit && <Button disabled={busy} onClick={() => void mutate('/review', { status: 'in_review', note: reviewNote })}>Submit for review</Button>}{canReview && workbook.status === 'in_review' && <><Button variant="primary" disabled={busy} onClick={() => void mutate('/review', { status: 'approved', note: reviewNote })}>Approve saved work</Button><Button disabled={busy} onClick={() => void mutate('/review', { status: 'changes_requested', note: reviewNote })}>Request changes</Button></>}</div>
    </Card>}
    {showRedact && canEdit && <Card className="mb-5 p-5"><h2 className="font-bold">Redact workbook text</h2><p className="mt-1 text-sm text-muted">Enter exact words or phrases, one per line. Matching free text in this workbook, its excerpts and historical review notes becomes [REDACTED]. Review actions and timestamps are retained, with a record of who redacted the note. Numeric fields, dates and dropdown choices need individual edits. Redactions that detach a supporting quotation are rejected. Matching ignores letter case. It does not change the original Library file or previously downloaded exports.</p><label className={`${labelClass} mt-3`}>Words or phrases<textarea rows={3} className={`${inputClass} h-auto py-3`} value={redactions} onChange={(e) => setRedactions(e.target.value)} /></label><Button className="mt-3" variant="danger" disabled={busy || !redactions.trim()} onClick={() => { if (window.confirm('Replace these exact phrases in workbook free text and historical review notes? This cannot be undone.')) void mutate('/redact', { terms: redactions.split('\n').filter((t) => t.trim()) }).then((ok) => { if (ok) setRedactions(''); }); }}>Redact matching text</Button></Card>}
    {workbook.kind === 'study' && cards.length > 0 && <Card className="mb-5 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Recall practice</h2><p className="mt-1 text-sm text-muted">{due.length} questions due · Your review schedule is private to you.</p></div><Button disabled={!due.length || busy} onClick={() => { setRecallId(due[0].id); setAnswerVisible(false); setResponse(''); }}>Practise next question</Button></div>
      {recall && <div className="mt-4 border-t border-line pt-4"><p className="whitespace-pre-wrap font-semibold">{recall.values.question}</p><label className={`${labelClass} mt-3`}>Your answer<textarea rows={3} maxLength={5000} className={`${inputClass} h-auto py-3`} value={response} onChange={(e) => setResponse(e.target.value)} /></label>
        {!answerVisible ? <Button className="mt-3" onClick={() => setAnswerVisible(true)}>Show answer and explanation</Button> : <><div className="mt-3 whitespace-pre-wrap rounded-xl bg-soft p-4 text-sm">{recall.values.answer}{recall.values.quote && <blockquote className="mt-3 border-l-2 border-brand pl-3">{recall.values.quote}<p className="mt-1 text-xs text-muted">{sources.find((s) => s.id === recall.values.source_id)?.values.title} · {recall.values.locator}</p></blockquote>}</div><p className="mb-2 mt-3 text-sm">How well did you recall it?</p><div className="flex flex-wrap gap-2">{(['again', 'hard', 'good', 'easy'] as const).map((rating) => <Button key={rating} disabled={busy} onClick={() => void rateRecall(rating)}>{rating[0].toUpperCase() + rating.slice(1)}</Button>)}</div></>}
      </div>}
    </Card>}
    <nav aria-label="Workbook sections" className="mb-5 flex flex-wrap gap-2">{catalog.sections.map((item) => <button key={item.key} type="button" disabled={busy} aria-current={section.key === item.key ? 'page' : undefined} onClick={() => { if (!editing || window.confirm('Discard the unsaved entry?')) { setSectionKey(item.key); setEditing(null); setShowSuggest(false); setSuggestions([]); } }} className={`min-h-11 rounded-xl px-3.5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${section.key === item.key ? 'bg-brand text-on-brand' : 'border border-line bg-surface hover:bg-soft'}`}>{item.title} <span className="opacity-70">{workbook.entries.filter((e) => e.section === item.key).length}</span></button>)}</nav>
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold">{section.title}</h2><p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">{section.description}</p></div>{canEdit && <div className="flex gap-2">{section.key !== 'sources' && <Button disabled={busy || !sources.length} onClick={() => { setShowSuggest(!showSuggest); setSuggestSourceIds(sources.slice(0, 5).map((s) => s.id)); }}>Suggest from sources</Button>}<Button variant="primary" onClick={() => editEntry()} disabled={busy}>Add entry</Button></div>}</div>
    {showSuggest && section.key !== 'sources' && canEdit && <Card className="mb-5 p-5"><h3 className="font-bold">Source-grounded suggestions</h3><p className="mt-1 text-sm text-muted">Choose up to five sources. AI reads the first 12,000 characters of each and proposes entries for you to edit and save. Exact quotations and reported numbers are checked; you review the interpretation.</p>
      <fieldset className="mt-4"><legend className="mb-2 text-sm font-semibold">Sources to use</legend><div className="grid gap-2 sm:grid-cols-2">{sources.map((source) => <label key={source.id} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={suggestSourceIds.includes(source.id)} disabled={busy || (!suggestSourceIds.includes(source.id) && suggestSourceIds.length >= 5)} onChange={(e) => setSuggestSourceIds(e.target.checked ? [...suggestSourceIds, source.id] : suggestSourceIds.filter((id) => id !== source.id))} />{source.values.title}</label>)}</div></fieldset>
      <label className={`${labelClass} mt-3`}>Focus (optional)<textarea rows={2} maxLength={2000} className={`${inputClass} h-auto py-3`} value={suggestInstruction} onChange={(e) => setSuggestInstruction(e.target.value)} /></label>
      <Button className="mt-3" variant="primary" disabled={busy || !suggestSourceIds.length} onClick={() => void suggest()}>{busy ? 'Reading selected sources…' : `Suggest entries · ${workbook.suggestion_cost ?? 3} credits`}</Button>
      {suggestions.length > 0 && <div className="mt-4 grid gap-3">{suggestions.map((suggestion, index) => <div key={index} className="rounded-xl border border-line p-4"><dl className="grid gap-2">{section.fields.filter((f) => suggestion.values[f.key]).map((f) => <div key={f.key}><dt className="text-xs font-semibold text-muted">{f.label}</dt><dd className="whitespace-pre-wrap text-sm">{f.type === 'source' ? sources.find((s) => s.id === suggestion.values[f.key])?.values.title : suggestion.values[f.key]}</dd></div>)}</dl><Button className="mt-3" size="sm" onClick={() => { if (!editing || window.confirm('Replace the unsaved form with this suggestion?')) { setEditing({ values: suggestion.values }); setTimeout(() => topForm.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 0); } }}>Review and edit before saving</Button></div>)}</div>}
    </Card>}
    {section.key === 'sources' && canEdit && <Card className="mb-5 p-4"><WorkbookLibraryPicker busy={busy} onImport={(documentId) => mutate('/import', { document_id: documentId, consent: importConsent })} />
      <label className="mt-3 grid max-w-sm gap-1.5 text-sm font-semibold">Permission to use imported sources<select className={inputClass} value={importConsent} onChange={(e) => setImportConsent(e.target.value)}>{CONSENT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></label><div className="mt-4"><Button disabled={busy} onClick={() => fileInput.current?.click()}>Add text file</Button><input type="file" ref={fileInput} accept=".txt,.md,.csv,.tsv,.srt,.vtt" className="hidden" aria-label="Add source text file" onChange={(e) => { void importText(e.target.files?.[0]); e.target.value = ''; }} /></div><p className="mt-2 text-xs text-muted">Library imports copy source text into this workbook. Project members can read the copy. Add PDF or Word material to your Library first.</p></Card>}
    {canEdit && section.key !== 'sources' && <WorkbookTableImport key={section.key} workbook={workbook} section={section} busy={busy} save={mutate} />}
    {canEdit && workbook.kind === 'qualitative' && section.key === 'sources' && <TranscriptExcerptImport workbook={workbook} busy={busy} save={mutate} />}
    {editing && canEdit && <div ref={topForm}><Card className="mb-5 p-5"><form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void saveEntry(); }}>
      <h3 className="font-bold sm:col-span-2">{editing.id ? 'Edit entry' : 'New entry'}</h3>
      {section.fields.filter((f) => f.type !== 'hidden').map((f) => <label key={f.key} className={`${labelClass} ${f.type === 'long' || f.type === 'source' ? 'sm:col-span-2' : ''}`}>{f.label}{f.required ? ' *' : ''}
        {f.type === 'long' ? <textarea rows={f.key === 'text' ? 10 : 4} required={f.required} maxLength={f.max || 16000} className={`${inputClass} h-auto py-3 font-normal`} value={editing.values[f.key] || ''} onChange={(e) => setEditing({ ...editing, values: { ...editing.values, [f.key]: e.target.value } })} /> : f.type === 'select' || f.type === 'source' ? <select required={f.required} className={inputClass} value={editing.values[f.key] || ''} onChange={(e) => setEditing({ ...editing, values: { ...editing.values, [f.key]: e.target.value } })}><option value="">Choose…</option>{f.type === 'source' ? sources.map((s) => <option key={s.id} value={s.id}>{s.values.title}</option>) : f.options?.map((option) => <option key={option} value={option}>{option}</option>)}</select> : <input type={f.type === 'date' ? 'date' : 'text'} inputMode={f.type === 'number' ? 'decimal' : undefined} required={f.required} maxLength={1000} className={inputClass} value={editing.values[f.key] || ''} onChange={(e) => setEditing({ ...editing, values: { ...editing.values, [f.key]: e.target.value } })} />}
        {f.help && <span className="text-xs font-normal text-muted">{f.help}</span>}
      </label>)}
      <div className="flex gap-2 sm:col-span-2"><Button variant="primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save entry'}</Button><Button disabled={busy} onClick={() => setEditing(null)}>Cancel</Button></div>
    </form></Card></div>}
    {metrics.length > 0 && <Card className="mb-5 p-5"><h3 className="font-bold">Comparable groups</h3><p className="mt-1 text-sm text-muted">Different periods, units, currencies, definitions and restatement versions stay in separate groups. These are reported values, not investment recommendations.</p>{metrics.map((group) => <div key={group.key} className="mt-4"><p className="text-sm font-semibold">{group.label}</p><div className="mt-2 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-line"><th className="py-2">Company</th><th>Value</th><th>Filing date</th></tr></thead><tbody>{group.entries.map((entry) => <tr key={entry.id} className="border-b border-line-2"><td className="py-2">{entry.values.company}</td><td>{entry.values.value}</td><td>{entry.values.filed_at}</td></tr>)}</tbody></table></div></div>)}</Card>}
    {!entries.length && !editing && <Card className="p-8 text-center text-sm text-muted">No entries yet. {canEdit ? 'Add your first entry to begin.' : 'An editor can add entries to this workbook.'}</Card>}
    <div className="grid gap-4">{entries.map((entry) => <Card key={entry.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><h3 className="font-bold">{entry.values.title || entry.values.name || entry.values.label || entry.values.question || entry.values.claim || entry.values.objective || entry.values.criterion || entry.values.company || entry.values.result || entry.values.scenario || section.title}</h3>{canEdit && <div className="flex gap-2"><Button size="sm" disabled={busy} onClick={() => editEntry(entry)}>Edit</Button><Button size="sm" variant="danger" disabled={busy} onClick={() => void removeEntry(entry)}>Delete</Button></div>}</div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">{section.fields.filter((f) => entry.values[f.key] && f.type !== 'hidden').map((f) => <div key={f.key} className={f.type === 'long' || f.type === 'source' ? 'sm:col-span-2' : ''}><dt className="text-xs font-semibold text-muted">{f.label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed">{f.type === 'source' ? sources.find((s) => s.id === entry.values[f.key])?.values.title || 'Source missing' : f.key === 'text' && section.key === 'sources' ? <details><summary className="cursor-pointer font-medium text-brand">Read source text ({entry.values.text.length.toLocaleString()} characters)</summary><div className="mt-3 max-h-96 overflow-y-auto rounded-xl bg-soft p-4">{entry.values.kind === 'transcript' ? entry.values.text.split(/\r\n|\n|\r/).map((line, index) => `${index + 1}  ${line}`).join('\n') : entry.values.text}</div></details> : entry.values[f.key]}</dd></div>)}</dl>
      {section.key === 'indicators' && indicatorProgress(entry.values) !== null && <p className="mt-3 text-sm font-semibold text-brand">Progress from baseline toward target: {indicatorProgress(entry.values)!.toFixed(1)}%</p>}
      <p className="mt-4 select-all text-xs text-muted">Entry {entry.id}</p>
    </Card>)}</div>
    {!!workbook.events?.length && <details className="mt-8 rounded-2xl border border-line bg-surface p-5"><summary className="cursor-pointer font-semibold">Decision history · latest {workbook.events.length} events</summary><ol className="mt-4 grid gap-3">{[...workbook.events].reverse().map((event) => <li key={event.id} className="border-b border-line-2 pb-3 text-sm"><span className="font-medium">Revision {event.revision}: {event.action.replaceAll('_', ' ')}</span><span className="ml-2 text-xs text-muted">{new Date(event.at).toLocaleString()}</span>{event.note && <p className="mt-1 whitespace-pre-wrap text-muted">{event.note}</p>}{event.review_note !== undefined && <blockquote className="mt-2 whitespace-pre-wrap border-l-2 border-brand pl-3">{event.review_note || 'No review rationale supplied.'}</blockquote>}{event.redacted_at && <p className="mt-1 text-xs text-muted">Review note redacted {new Date(event.redacted_at).toLocaleString()} by {event.redacted_by}</p>}<p className="mt-1 text-xs text-muted">Reviewer / editor: {event.user_id}</p></li>)}</ol></details>}
  </AppFrame>;
}
