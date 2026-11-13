'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppFrame } from '@/components/app/AppFrame';
import { SHOW_PROVIDERS } from '@/lib/devInfo';
import { SourcesNav } from '@/components/app/SourcesNav';
import { Button, Card, inputClass, StatusPill } from '@/components/app/ui';
import { useSignedIn } from '@/components/app/useSignedIn';
import { api } from '@/lib/session';
import { monitorRunMarkdown, type MonitorRun, type ResearchMonitor } from '@/lib/monitoring';

type Group = { id: string; label: string; available: boolean };
type Detail = ResearchMonitor & { runs: MonitorRun[] };
type Form = { title: string; query: string; groups: string[]; interval_hours: 24 | 168 | 720; tracked: string; from: string; to: string; openAccess: boolean; excludePreprints: boolean; enabled: boolean; retraction_checks: boolean; project_id: string };
const emptyForm: Form = { title: '', query: '', groups: ['papers'], interval_hours: 168, tracked: '', from: '', to: '', openAccess: false, excludePreprints: false, enabled: true, retraction_checks: true, project_id: '' };
const label = 'grid gap-1.5 text-sm font-semibold';
const time = (value: string | null) => value ? new Date(value).toLocaleString() : 'Not checked yet';
function download(name: string, value: string, type: string) { const url = URL.createObjectURL(new Blob([value], { type })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function safeLink(value: string | null) { try { const u = new URL(value || ''); return ['https:', 'http:'].includes(u.protocol) ? u.href : null; } catch { return null; } }

function MonitoringPage() {
  const { user } = useSignedIn();
  const params = useSearchParams();
  const monitorId = params.get('monitor');
  const projectId = params.get('project_id') || '';
  const [monitors, setMonitors] = useState<ResearchMonitor[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string; role: string }[]>([]);
  const [selected, setSelected] = useState<Detail | null>(null);
  const [form, setForm] = useState<Form | null>(() => projectId && !monitorId ? { ...emptyForm, project_id: projectId } : null);
  const [editId, setEditId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const load = async () => { const result = await api<{ monitors: ResearchMonitor[]; source_groups: Group[] }>('/api/monitoring'); setMonitors(result.monitors); setGroups(result.source_groups); };
  const open = async (id: string) => { setError(''); try { setSelected(await api<Detail>(`/api/monitoring/${id}`)); setForm(null); } catch (e) { setError((e as Error).message); } };
  useEffect(() => {
    if (!user) return;
    void Promise.all([load(), api<{ projects: typeof projects }>('/api/projects').then((result) => setProjects(result.projects))]).catch((e) => setError((e as Error).message)).finally(() => setLoading(false));
  }, [user]);
  useEffect(() => { if (user && monitorId) void open(monitorId); }, [user, monitorId]);
  const save = async () => {
    if (!form) return;
    setBusy(true); setError('');
    const body = { title: form.title, query: form.query, groups: form.groups, interval_hours: form.interval_hours, tracked_dois: form.tracked.split(/[\n,]/).map((s) => s.trim()).filter(Boolean), enabled: form.enabled, retraction_checks: form.retraction_checks,
      filters: { ...(form.from ? { fromYear: Number(form.from) } : {}), ...(form.to ? { toYear: Number(form.to) } : {}), openAccess: form.openAccess, excludePreprints: form.excludePreprints, excludeRetracted: false }, ...(editId ? { revision: selected?.revision } : { project_id: form.project_id || null }) };
    try { const result = await api<ResearchMonitor>(`/api/monitoring${editId ? `/${editId}` : ''}`, { method: editId ? 'PATCH' : 'POST', body: JSON.stringify(body) }); await load(); await open(result.id); setNotice('Saved. Scheduled checks appear here; you can also check now.'); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const run = async () => { if (!selected) return; setBusy(true); setError(''); setNotice('Checking the selected sources…'); try { await api(`/api/monitoring/${selected.id}/run`, { method: 'POST' }); await load(); await open(selected.id); setNotice('Check finished. Review the update before changing your conclusions.'); } catch (e) { setError((e as Error).message); setNotice(''); } finally { setBusy(false); } };
  const review = async (runId: string) => { if (!selected) return; setBusy(true); setError(''); try { await api(`/api/monitoring/${selected.id}/runs/${runId}/review`, { method: 'POST', body: JSON.stringify({ note: reviewNotes[runId] || '' }) }); await load(); await open(selected.id); setNotice('Review decision saved. Existing documents and conclusions were not changed.'); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } };
  const edit = () => { if (!selected) return; setEditId(selected.id); setForm({ title: selected.title, query: selected.query, groups: selected.groups, interval_hours: selected.interval_hours, tracked: selected.tracked_dois.join('\n'), from: String(selected.filters.fromYear || ''), to: String(selected.filters.toYear || ''), openAccess: Boolean(selected.filters.openAccess), excludePreprints: Boolean(selected.filters.excludePreprints), enabled: selected.enabled, retraction_checks: selected.retraction_checks, project_id: selected.project_id || '' }); };
  const exportAll = async () => { if (!selected) return; setBusy(true); try { download(`${selected.title}-monitor.json`, JSON.stringify(await api(`/api/monitoring/${selected.id}/export`), null, 2), 'application/json'); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } };
  const remove = async () => { if (!selected || !window.confirm('Delete this monitor and its update history? Export it first if needed.')) return; setBusy(true); try { await api(`/api/monitoring/${selected.id}`, { method: 'DELETE' }); setSelected(null); await load(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } };
  const canEdit = selected?.role === 'owner' || selected?.role === 'edit';
  const canReview = canEdit || selected?.role === 'comment';

  return <AppFrame wide title="Saved searches" subtitle="Save a search, inspect what changed since last time and keep a review journal. Alerts stay in your workspace." actions={<Button variant="primary" disabled={busy} onClick={() => { setEditId(null); setForm({ ...emptyForm, project_id: projectId }); }}>New saved search</Button>}>
    <SourcesNav />
    {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}{notice && <p role="status" className="mb-4 text-sm text-brand">{notice}</p>}
    {form && <Card className="mb-6 p-5"><form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <h2 className="text-lg font-bold sm:col-span-2">{editId ? 'Edit saved search' : 'New saved search'}</h2>
      <label className={`${label} sm:col-span-2`}>Name<input required maxLength={200} className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
      <label className={`${label} sm:col-span-2`}>Search query<textarea required minLength={2} maxLength={1000} rows={3} className={`${inputClass} h-auto py-3`} value={form.query} onChange={(e) => setForm({ ...form, query: e.target.value })} /><span className="text-xs font-normal text-muted">Use terms in the languages relevant to your work. The query is sent as written.</span></label>
      <fieldset className="sm:col-span-2"><legend className="mb-2 text-sm font-semibold">Sources</legend><div className="flex flex-wrap gap-4">{groups.map((group) => <label key={group.id} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={form.groups.includes(group.id)} disabled={!group.available} onChange={(e) => setForm({ ...form, groups: e.target.checked ? [...form.groups, group.id] : form.groups.filter((g) => g !== group.id) })} />{group.label}{!group.available && ' (not configured)'}</label>)}</div></fieldset>
      <label className={label}>Check frequency<select className={inputClass} value={form.interval_hours} onChange={(e) => setForm({ ...form, interval_hours: Number(e.target.value) as Form['interval_hours'] })}><option value={24}>Daily</option><option value={168}>Weekly</option><option value={720}>Every 30 days</option></select></label>
      {!editId && <label className={label}>Sharing<select className={inputClass} value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}><option value="">Private monitor</option>{projects.filter((p) => ['owner', 'edit'].includes(p.role)).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
      <label className={label}>Publication year from<input type="number" min={1000} max={2200} className={inputClass} value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} /></label>
      <label className={label}>Publication year to<input type="number" min={1000} max={2200} className={inputClass} value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} /></label>
      <div className="flex flex-wrap gap-4 sm:col-span-2">{([['openAccess', 'Open access only'], ['excludePreprints', 'Exclude preprints'], ['retraction_checks', 'Check retractions and corrections'], ['enabled', 'Scheduled checks enabled']] as const).map(([key, text]) => <label className="flex min-h-11 items-center gap-2 text-sm" key={key}><input type="checkbox" checked={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} />{text}</label>)}</div>
      <label className={`${label} sm:col-span-2`}>Specific DOIs to track (optional, up to 20)<textarea rows={3} maxLength={6000} className={`${inputClass} h-auto py-3`} value={form.tracked} onChange={(e) => setForm({ ...form, tracked: e.target.value })} placeholder="One DOI per line" /></label>
      <p className="text-xs leading-relaxed text-muted sm:col-span-2">Each check samples up to 75 scholarly results and 10 web results. Crossref notice checks cover your listed DOIs first, then returned papers, up to 25 DOIs per run. Shared monitors expose result snippets to project members, including results from My Library. Scheduled checks require the background service to be deployed.</p>
      {editId && <p className="text-sm text-muted sm:col-span-2">Changing the query, source groups or filters starts a new baseline. Earlier update history remains available.</p>}
      <div className="flex gap-2 sm:col-span-2"><Button type="submit" variant="primary" disabled={busy || !form.groups.length}>Save monitor</Button><Button disabled={busy} onClick={() => setForm(null)}>Cancel</Button></div>
    </form></Card>}
    <div className="grid items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)]"><aside aria-label="Saved searches" className="grid gap-3">{loading && <p role="status" className="text-sm text-muted">Loading monitors…</p>}{!loading && !monitors.length && <Card className="p-5 text-sm text-muted">Create a monitor for a topic you need to keep current.</Card>}{monitors.map((monitor) => <button type="button" key={monitor.id} disabled={busy} onClick={() => void open(monitor.id)} aria-pressed={selected?.id === monitor.id} className={`rounded-2xl border p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${selected?.id === monitor.id ? 'border-brand bg-brand-50' : 'border-line bg-surface hover:bg-soft'}`}><span className="block font-semibold">{monitor.title}</span><span className="mt-1 block text-xs text-muted">{monitor.enabled ? 'Monitoring' : 'Paused'} · {monitor.pending_runs} updates to review</span>{monitor.last_error && <span className="mt-2 block text-xs text-amber-700">Last check has a coverage issue</span>}</button>)}</aside>
      <div className="min-w-0">{selected ? <>
        <Card className="mb-5 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold">{selected.title}</h2><p className="mt-2 whitespace-pre-wrap text-sm">{selected.query}</p></div><StatusPill tone={selected.enabled ? 'positive' : 'neutral'}>{selected.enabled ? 'Active' : 'Paused'}</StatusPill></div><p className="mt-3 text-xs text-muted">Last successful check: {time(selected.last_run_at)}<br />{selected.enabled ? `Next scheduled check: ${time(selected.next_run_at)}` : 'Scheduled checks paused'}</p>{selected.project_id && <Link href={`/projects/${selected.project_id}`} className="mt-2 block text-sm text-brand">Open shared project</Link>}
          {selected.last_error && <p role="status" className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{selected.last_error}</p>}
          <div className="mt-4 flex flex-wrap gap-2">{canEdit && <><Button variant="primary" disabled={busy} onClick={() => void run()}>{busy ? 'Working…' : 'Check now'}</Button><Button disabled={busy} onClick={edit}>Edit or pause</Button></>}<Button disabled={busy} onClick={() => void open(selected.id)}>Reload</Button><Button disabled={busy} onClick={() => void exportAll()}>Export history</Button>{selected.role === 'owner' && <Button disabled={busy} variant="danger" onClick={() => void remove()}>Delete</Button>}</div>
        </Card>
        <p className="mb-4 text-sm leading-relaxed text-muted">“New to results” means new to this saved search sample. “Not returned” can reflect ranking or coverage changes; it does not establish that a publication was withdrawn. Review each update before changing an approved report.</p>
        {!selected.runs.length && <Card className="p-6 text-sm text-muted">No checks yet. Check now to establish the baseline.</Card>}
        <div className="grid gap-4">{selected.runs.map((run) => <Card key={run.id} className="p-5"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">{run.baseline ? 'Baseline check' : 'Evidence update'} · {time(run.at)}</h3><StatusPill tone={run.status === 'complete' ? 'positive' : 'warning'}>{run.status}</StatusPill></div><p className="mt-2 text-sm text-muted">{run.result_count} results · {run.changes.length} changes · {run.review.status === 'reviewed' ? 'Reviewed' : run.review.status === 'not_needed' ? 'No changes to review' : 'Needs review'}</p>{run.errors.length > 0 && <ul className="mt-3 list-disc pl-5 text-sm text-amber-700">{run.errors.map((error, i) => <li key={i}>{error}</li>)}</ul>}
          {run.changes.map((change) => { const source = change.after || change.before!; const href = safeLink(source.url); return <details key={`${change.kind}:${change.key}`} className="mt-3 rounded-xl border border-line p-3"><summary className="cursor-pointer text-sm font-semibold">{change.kind === 'added' ? 'New to results' : change.kind === 'changed' ? 'Changed' : 'Not returned in sample'}: {source.title}</summary><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{source.summary || 'No abstract or snippet available.'}</p>{change.before && change.after && <p className="mt-2 text-xs text-muted">Previous summary: {change.before.summary}</p>}{source.notices.map((n, index) => <p key={index} className="mt-2 text-sm text-amber-700">{n.type} · {n.doi} · {n.date || 'Date unavailable'}</p>)}{href && <a href={href} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-brand">Open source</a>}</details>; })}
          <div className="mt-4 flex flex-wrap gap-2"><Button size="sm" onClick={() => download(`${selected.title}-update.md`, monitorRunMarkdown(selected.title, run), 'text/markdown')}>Export update draft</Button></div>
          {run.review.status === 'reviewed' ? <blockquote className="mt-4 whitespace-pre-wrap border-l-2 border-brand pl-3 text-sm">{run.review.note}<p className="mt-1 text-xs text-muted">Reviewed {time(run.review.at)}</p></blockquote> : canReview && run.review.status === 'pending' && <div className="mt-4"><label className={label}>Review decision<textarea rows={2} maxLength={5000} className={`${inputClass} h-auto py-3`} value={reviewNotes[run.id] || ''} onChange={(e) => setReviewNotes({ ...reviewNotes, [run.id]: e.target.value })} placeholder="What should change, what stays the same, and why?" /></label><Button className="mt-2" size="sm" disabled={busy || !reviewNotes[run.id]?.trim()} onClick={() => void review(run.id)}>Record review decision</Button></div>}
        </Card>)}</div>
        {selected.snapshot.length > 0 && <details className="mt-5 rounded-2xl border border-line bg-surface p-5"><summary className="cursor-pointer font-semibold">Current evidence sample · {selected.snapshot.length} sources</summary><ol className="mt-4 grid gap-3">{selected.snapshot.map((source) => <li key={source.key} className="border-b border-line pb-3 text-sm"><p className="font-medium">{source.title}</p><p className="mt-1 text-xs text-muted">{source.published || 'Date unavailable'}{SHOW_PROVIDERS ? ` · ${source.providers.join(', ')}` : ''}</p>{source.retracted && <p className="mt-1 font-semibold text-red-700">Retraction recorded</p>}{source.notices.map((n, i) => <p key={i} className="mt-1 text-xs text-amber-700">{n.type}: {n.doi}</p>)}{safeLink(source.url) && <a target="_blank" rel="noreferrer" href={safeLink(source.url)!} className="mt-1 inline-block text-brand">Open source</a>}</li>)}</ol></details>}
      </> : <Card className="p-8 text-sm text-muted">Choose a saved search to inspect its evidence updates.</Card>}</div>
    </div>
  </AppFrame>;
}

export default function Page() { return <Suspense fallback={null}><MonitoringPage /></Suspense>; }
