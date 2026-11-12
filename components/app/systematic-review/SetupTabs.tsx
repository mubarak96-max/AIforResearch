'use client';

/** The Protocol and Search tabs of a systematic review. */
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { LuLoaderCircle, LuSearch, LuSparkles, LuUpload } from 'react-icons/lu';
import { api, authHeaders, ApiError } from '@/lib/session';
import { Button, Card, inputClass } from '@/components/app/ui';
import { CitedMarkdown, CreditCost, creditsChanged, showError } from '@/components/app/research/parts';
import type { TaskRecord } from '@/components/app/research/handoff';
import { FRAMEWORK_FIELDS, REVIEW_TYPE_OPTIONS, type ReviewState } from './types';

const label = 'mb-1.5 block text-[13.5px] font-semibold text-ink-2';
const lines = (text: string) => text.split('\n').map((line) => line.trim()).filter(Boolean);

export function ProtocolTab({ state, reload }: { state: ReviewState; reload: () => Promise<void> }) {
  const { review, can_edit: canEdit } = state;
  const [question, setQuestion] = useState(review.question);
  const [type, setType] = useState(review.review_type);
  const [framework, setFramework] = useState(review.framework);
  const [fields, setFields] = useState(review.framework_fields);
  const [include, setInclude] = useState(review.include_criteria.join('\n'));
  const [exclude, setExclude] = useState(review.exclude_criteria.join('\n'));
  const [protocol, setProtocol] = useState(review.protocol);
  const [preview, setPreview] = useState(Boolean(review.protocol));
  const [busy, setBusy] = useState<'save' | 'draft' | null>(null);

  const save = async () => {
    setBusy('save');
    try {
      await api(`/api/systematic-reviews/${review.id}`, { method: 'PATCH', body: JSON.stringify({ question, review_type: type, framework, framework_fields: fields, include_criteria: lines(include), exclude_criteria: lines(exclude), protocol }) });
      toast.success('Saved');
      await reload();
    } catch (error) { showError(error); } finally { setBusy(null); }
  };
  const draft = async () => {
    setBusy('draft');
    try {
      await api(`/api/systematic-reviews/${review.id}`, { method: 'PATCH', body: JSON.stringify({ question, review_type: type, framework, framework_fields: fields, include_criteria: lines(include), exclude_criteria: lines(exclude) }) });
      const result = await api<{ protocol: string }>(`/api/systematic-reviews/${review.id}/protocol/draft`, { method: 'POST' });
      setProtocol(result.protocol);
      setPreview(true);
      await reload();
    } catch (error) { showError(error); } finally { setBusy(null); creditsChanged(); }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card className="p-5">
        <h2 className="text-[16px] font-bold">Question and criteria</h2>
        <p className="mt-1 text-[13.5px] text-muted">{state.preset.note}</p>
        <fieldset disabled={!canEdit} className="mt-4 grid gap-4">
          <label><span className={label}>Review question</span><textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows={2} className={`${inputClass} h-auto py-2.5`} /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className={label}>Type of review</span>
              <select value={type} onChange={(event) => setType(event.target.value)} className={inputClass}>{REVIEW_TYPE_OPTIONS.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
            </label>
            <label><span className={label}>Framework</span>
              <select value={framework} onChange={(event) => setFramework(event.target.value as typeof framework)} className={inputClass}><option>PICO</option><option>PCC</option><option>SPIDER</option></select>
            </label>
          </div>
          {FRAMEWORK_FIELDS[framework].map(([key, name]) => (
            <label key={key}><span className={label}>{name}</span><input value={fields[key] ?? ''} onChange={(event) => setFields({ ...fields, [key]: event.target.value })} className={inputClass} /></label>
          ))}
          <label><span className={label}>Include when (one per line)</span><textarea value={include} onChange={(event) => setInclude(event.target.value)} rows={4} className={`${inputClass} h-auto py-2.5`} /></label>
          <label><span className={label}>Exclude when (one per line)</span><textarea value={exclude} onChange={(event) => setExclude(event.target.value)} rows={4} className={`${inputClass} h-auto py-2.5`} /></label>
        </fieldset>
      </Card>
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="flex-1 text-[16px] font-bold">Protocol</h2>
          {protocol && <button type="button" onClick={() => setPreview(!preview)} className="text-[13.5px] font-semibold text-brand hover:underline">{preview ? 'Edit' : 'Preview'}</button>}
        </div>
        <p className="mt-1 text-[13.5px] text-muted">In the structure PROSPERO asks for. Draft it from your criteria, then edit it.</p>
        {preview && protocol
          ? <div className="mt-3 max-h-[640px] overflow-y-auto rounded-xl bg-soft px-4 py-2"><CitedMarkdown markdown={protocol} className="text-[15px]" /></div>
          : <textarea value={protocol} disabled={!canEdit} onChange={(event) => setProtocol(event.target.value)} rows={20} placeholder="## Review title&#10;…" className={`${inputClass} mt-3 h-auto py-2.5 font-[inherit] text-[14px]`} />}
        {canEdit && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button variant="primary" onClick={save} disabled={busy !== null}>{busy === 'save' ? 'Saving…' : 'Save'}</Button>
            <Button onClick={draft} disabled={busy !== null}>{busy === 'draft' ? <LuLoaderCircle className="h-4 w-4 animate-spin" /> : <LuSparkles className="h-4 w-4" />}Draft the protocol with AI</Button>
            <CreditCost credits={3} />
          </div>
        )}
      </Card>
    </div>
  );
}

/** A PubMed search string from the framework fields: each field in parentheses, joined by AND. */
function suggestedTerm(fields: Record<string, string>) {
  return Object.values(fields).map((value) => value.trim()).filter(Boolean).map((value) => `(${value})`).join(' AND ');
}

const UPLOAD_SOURCES = ['Scopus', 'Web of Science', 'PubMed', 'Embase', 'CINAHL', 'PsycINFO', 'Cochrane Library', 'ERIC', 'Other database'];

export function SearchTab({ state, reload }: { state: ReviewState; reload: () => Promise<void> }) {
  const { review, can_edit: canEdit } = state;
  const [database, setDatabase] = useState<'pubmed' | 'europepmc' | 'openalex'>('pubmed');
  const [query, setQuery] = useState(() => suggestedTerm(review.framework_fields));
  const [count, setCount] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);
  const [max, setMax] = useState(500);
  const [busy, setBusy] = useState(false);
  const [uploadSource, setUploadSource] = useState('Scopus');
  const [research, setResearch] = useState<TaskRecord[]>([]);
  const file = useRef<HTMLInputElement>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => { api<{ tasks: TaskRecord[] }>('/api/history?kind=research&limit=20').then((result) => setResearch(result.tasks.filter((task) => task.status === 'done'))).catch(() => {}); }, []);
  // A live count as the search string changes.
  useEffect(() => {
    window.clearTimeout(timer.current);
    setCount(null);
    if (query.trim().length < 3) return;
    timer.current = window.setTimeout(async () => {
      setCounting(true);
      try {
        const result = await api<{ count: number }>(`/api/systematic-reviews/${review.id}/searches/count`, { method: 'POST', body: JSON.stringify({ database, query }) });
        setCount(result.count);
      } catch { setCount(null); } finally { setCounting(false); }
    }, 900);
    return () => window.clearTimeout(timer.current);
  }, [query, database, review.id]);

  const report = (result: { added: number; duplicates: number; over_limit?: number; limit?: number }) => {
    toast.success(`${result.added} records added, ${result.duplicates} duplicates set aside`);
    if (result.over_limit) toast.error(`${result.over_limit} records were not added: this plan holds ${result.limit} records per review. Upgrade for more.`);
  };
  const run = async () => {
    setBusy(true);
    try {
      report(await api(`/api/systematic-reviews/${review.id}/searches/run`, { method: 'POST', body: JSON.stringify({ database, query, max }) }));
      await reload();
    } catch (error) { showError(error); } finally { setBusy(false); }
  };
  const upload = async (picked: File | undefined) => {
    if (!picked) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append('file', picked, picked.name);
      form.append('database', uploadSource);
      const response = await fetch(`/api/systematic-reviews/${review.id}/import`, { method: 'POST', headers: await authHeaders(), body: form });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new ApiError(json?.detail || 'This file could not be read.', response.status, json);
      report(json);
      await reload();
    } catch (error) { showError(error); } finally { setBusy(false); }
  };
  const fromResearch = async (taskId: string) => {
    if (!taskId) return;
    setBusy(true);
    try {
      report(await api(`/api/systematic-reviews/${review.id}/records/from-task`, { method: 'POST', body: JSON.stringify({ task_id: taskId }) }));
      await reload();
    } catch (error) { showError(error); } finally { setBusy(false); }
  };

  const unique = state.records.filter((record) => !record.duplicate_of).length;
  return (
    <div className="grid gap-6">
      {canEdit && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Card className="p-5">
            <h2 className="text-[16px] font-bold">Search a database</h2>
            <p className="mt-1 text-[13.5px] text-muted">Each search is recorded with its date, string and count for your methods and PRISMA flow.</p>
            <div className="mt-4 grid gap-3">
              <div role="radiogroup" aria-label="Database" className="flex flex-wrap gap-1.5">
                {([['pubmed', 'PubMed'], ['europepmc', 'Europe PMC'], ['openalex', 'OpenAlex']] as const).map(([id, name]) => (
                  <button key={id} type="button" role="radio" aria-checked={database === id} onClick={() => setDatabase(id)}
                    className={`h-8 rounded-full border px-3 text-[13.5px] font-medium ${database === id ? 'border-brand bg-brand-50 text-brand' : 'border-line text-ink-2 hover:bg-soft'}`}>{name}</button>
                ))}
              </div>
              <label><span className={label}>Search string</span>
                <textarea value={query} onChange={(event) => setQuery(event.target.value)} rows={4} className={`${inputClass} h-auto py-2.5 text-[14px]`}
                  placeholder={database === 'pubmed' ? '("shift work"[tiab] OR "night shift"[tiab]) AND (nap*[tiab]) AND (alertness OR fatigue)' : 'shift work nap alertness'} />
              </label>
              <p className="text-[13.5px] text-ink-2" aria-live="polite">
                {counting ? 'Counting…' : count !== null ? <><strong className="tabular-nums">{count.toLocaleString('en-US')}</strong> records in {database === 'pubmed' ? 'PubMed' : database === 'europepmc' ? 'Europe PMC' : 'OpenAlex'}</> : 'Type a search to see how many records it finds.'}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-[13.5px] text-ink-2">Add up to
                  <select value={max} onChange={(event) => setMax(Number(event.target.value))} className="h-9 rounded-[10px] border border-line px-2 text-[14px]">
                    {[100, 500, 1000, 2000].map((value) => <option key={value} value={value}>{value.toLocaleString('en-US')}</option>)}
                  </select> records
                </label>
                <Button variant="primary" onClick={run} disabled={busy || query.trim().length < 3}><LuSearch className="h-4 w-4" />{busy ? 'Working…' : 'Run and add'}</Button>
                <span className="text-[13px] text-muted">No credits</span>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="text-[16px] font-bold">Upload an export</h2>
            <p className="mt-1 text-[13.5px] text-muted">RIS, BibTeX, CSV or PubMed .nbib. Scopus and Web of Science have no open search API, so export your search there and upload it here.</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <select aria-label="Where the export comes from" value={uploadSource} onChange={(event) => setUploadSource(event.target.value)} className="h-10 rounded-[10px] border border-line px-2 text-[14px]">
                {UPLOAD_SOURCES.map((source) => <option key={source}>{source}</option>)}
              </select>
              <Button onClick={() => file.current?.click()} disabled={busy}><LuUpload className="h-4 w-4" />Choose file</Button>
              <input ref={file} type="file" accept=".ris,.bib,.csv,.tsv,.txt,.nbib,.medline" className="hidden" onChange={(event) => { upload(event.target.files?.[0]); event.target.value = ''; }} />
            </div>
            {research.length > 0 && (
              <label className="mt-5 block"><span className={label}>Or add the papers of a Deep Research result</span>
                <select defaultValue="" onChange={(event) => { fromResearch(event.target.value); event.target.value = ''; }} className={inputClass} disabled={busy}>
                  <option value="">Choose a result…</option>
                  {research.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
                </select>
              </label>
            )}
            <p className="mt-4 text-[13px] text-muted">{unique.toLocaleString('en-US')} of {state.limit.toLocaleString('en-US')} records on your plan.</p>
          </Card>
        </div>
      )}

      <Card>
        <div className="border-b border-line-2 px-5 py-4"><h2 className="text-[16px] font-bold">Search log</h2></div>
        {review.searches.length === 0 ? <p className="px-5 py-6 text-[14px] text-muted">No searches yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-[14px]">
              <thead><tr className="text-left text-[12.5px] text-muted"><th className="px-5 py-2 font-medium">Date</th><th className="px-2 py-2 font-medium">Source</th><th className="px-2 py-2 font-medium">Search string</th><th className="px-2 py-2 text-right font-medium">Found</th><th className="px-2 py-2 text-right font-medium">Added</th><th className="px-5 py-2 text-right font-medium">Duplicates</th></tr></thead>
              <tbody>
                {review.searches.map((search) => (
                  <tr key={search.id} className="border-t border-line-2 align-top">
                    <td className="whitespace-nowrap px-5 py-2.5 tabular-nums">{search.date.slice(0, 10)}</td>
                    <td className="px-2 py-2.5">{search.database}{search.kind === 'upload' ? ' (export)' : ''}</td>
                    <td className="max-w-[420px] break-words px-2 py-2.5 text-ink-2">{search.query || '–'}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{search.count?.toLocaleString('en-US') ?? '–'}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{search.added.toLocaleString('en-US')}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">{search.duplicates.toLocaleString('en-US')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {review.dedupe_log.length > 0 && (
          <details className="border-t border-line-2 px-5 py-3">
            <summary className="cursor-pointer text-[14px] font-semibold text-ink-2">Duplicates removed ({review.dedupe_log.length})</summary>
            <ul className="mt-2 max-h-72 overflow-y-auto text-[13.5px] text-ink-2">
              {review.dedupe_log.slice(-300).reverse().map((entry, index) => <li key={index} className="py-1">{entry.title} <span className="text-muted">· same {entry.reason === 'doi' ? 'DOI' : entry.reason === 'pmid' ? 'PubMed id' : 'title'}</span></li>)}
            </ul>
          </details>
        )}
      </Card>
    </div>
  );
}
