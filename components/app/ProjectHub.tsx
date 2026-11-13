'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/session';
import { Button, Card, inputClass } from './ui';
import toast from 'react-hot-toast';
import { LuCopy, LuLoaderCircle, LuSparkles, LuTrash2, LuX } from 'react-icons/lu';
import { CreditCost, creditsChanged, showError, Tag } from './research/parts';
import { markdownToHtml } from '@/components/tools/toolOutput';
import { openResultInEditor } from './research/handoff';

type Item = { id: string; kind: string; title: string; status: string; href: string; pending: number };
type InboxItem = { id: string; kind: string; title: string; href: string; count: number; detail: string };
type Governance = { transfer: { target_email: string; expires_at: string; can_accept: boolean } | null; retention_review_at: string; retention_note: string; events: { action: string; at: string }[] };
type Bundle = { project: { name: string }; evidence: { title: string; doi: string | null; url: string | null; sha256: string; findings: { finding: string; quote: string; page: number | null; status: string; reviewed_by?: string }[] }[] };
const save = (name: string, text: string, type: string) => { const url = URL.createObjectURL(new Blob([text], { type })); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
function appendix(bundle: Bundle) {
  const lines = [`# ${bundle.project.name}: reviewed evidence`, '', 'Only findings marked approved by a project reviewer are included. Approval records a human decision; it is not a guarantee that the conclusion is correct.', ''];
  for (const [index, source] of bundle.evidence.entries()) {
    const findings = source.findings.filter((finding) => finding.status === 'approved');
    if (!findings.length) continue;
    lines.push(`## Source ${index + 1}: ${source.title}`, '', source.doi ? `DOI: ${source.doi}` : source.url || '', `Snapshot SHA-256: ${source.sha256}`, '');
    for (const finding of findings) lines.push(`**Finding:** ${finding.finding}`, '', `> ${finding.quote.replaceAll('\n', '\n> ')}`, '', `${finding.page ? `Page ${finding.page}. ` : ''}Reviewed by ${finding.reviewed_by || 'a project reviewer'}.`, '');
  }
  return lines.join('\n');
}

/** A small addition to the existing project page; each workspace retains its own interface. */
export function ProjectHub({ id, role, members, onChange }: { id: string; role: string; members: { email: string; pending: boolean }[]; onChange: () => void }) {
  const base = `/api/projects/${encodeURIComponent(id)}`;
  const [items, setItems] = useState<Item[]>([]);
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [governance, setGovernance] = useState<Governance | null>(null);
  const [target, setTarget] = useState('');
  const [reviewAt, setReviewAt] = useState('');
  const [retentionNote, setRetentionNote] = useState('');
  const [busy, setBusy] = useState(false);
  const load = async () => {
    const [resources, policy] = await Promise.all([api<{ items: Item[]; review_inbox: InboxItem[] }>(`${base}/resources`), api<Governance>(`${base}/governance`)]);
    setItems(resources.items); setInbox(resources.review_inbox || []); setGovernance(policy); setReviewAt(policy.retention_review_at); setRetentionNote(policy.retention_note);
  };
  useEffect(() => { load().catch(showError); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const changed = (event: Event) => { if ((event as CustomEvent<string>).detail === id) load().catch(showError); };
    window.addEventListener('project-evidence-changed', changed);
    return () => window.removeEventListener('project-evidence-changed', changed);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const action = async (path: string, method: string, body?: unknown) => {
    setBusy(true);
    try { await api(`${base}${path}`, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }); await load(); onChange(); }
    catch (error) { showError(error); } finally { setBusy(false); }
  };
  const exportBundle = async (format: 'json' | 'markdown' | 'editor') => {
    setBusy(true);
    try {
      const bundle = await api<Bundle>(`${base}/bundle`);
      if (format === 'json') save('project-evidence.json', JSON.stringify(bundle, null, 2), 'application/json');
      else if (format === 'markdown') save('reviewed-evidence.md', appendix(bundle), 'text/markdown');
      else openResultInEditor(`${bundle.project.name}: reviewed evidence`, appendix(bundle), []);
    } catch (error) { showError(error); } finally { setBusy(false); }
  };
  return <section className="mt-6 space-y-4" aria-label="Connected project work">
    <Card className="p-4">
      <h2 className="font-bold">Connected workspaces</h2>
      {items.length ? <ul className="mt-3 divide-y divide-line">{items.map((item) => <li key={`${item.kind}:${item.id}`}><Link className="flex items-center justify-between gap-3 py-3 text-sm hover:text-brand" href={item.href}><span className="font-medium">{item.title}</span><span className="text-xs text-muted">{item.kind}{item.status ? ` · ${item.status.replaceAll('_', ' ')}` : ''}{item.pending ? ` · ${item.pending} updates` : ''}</span></Link></li>)}</ul> : <p className="mt-2 text-sm text-muted">Choose this project when creating a workbook, matrix, review or evidence monitor.</p>}
      <div className="mt-3 flex flex-wrap gap-4 text-sm font-semibold text-brand"><Link href={`/workbooks?new=1&project_id=${encodeURIComponent(id)}`}>Workbooks</Link><Link href="/matrix">Evidence matrices</Link><Link href="/systematic-review">Systematic reviews</Link><Link href={`/monitoring?project_id=${encodeURIComponent(id)}`}>Evidence updates</Link></div>
      <div className="mt-4 border-t border-line pt-4"><div className="flex items-center justify-between gap-3"><h3 className="font-semibold">Review inbox</h3><Button size="sm" disabled={busy} onClick={async () => { setBusy(true); try { await load(); } catch (error) { showError(error); } finally { setBusy(false); } }}>Refresh inbox</Button></div><p className="mt-1 text-xs text-muted">Shared findings, submitted workbooks, evidence updates and screening conflicts visible under your review permissions. Blind screening decisions remain concealed until you submit your own vote.</p>{inbox.length ? <ul className="mt-3 divide-y divide-line">{inbox.map((item) => <li key={`${item.kind}:${item.id}`}><Link href={item.href} className="block py-3 text-sm hover:text-brand"><span className="font-medium">{item.title}</span><span className="mt-1 block text-xs text-muted">{item.detail}</span></Link></li>)}</ul> : <p className="mt-3 text-sm text-muted">No review items visible to you right now.</p>}</div>
    </Card>
    <Card className="p-4">
      <h2 className="font-bold">Evidence handoff</h2><p className="mt-1 text-sm text-muted">Download shared source text, findings, review histories, workbooks, matrices and saved task results. Build a reviewed evidence appendix in the existing editor for Word/PDF export.</p>
      <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" disabled={busy} onClick={() => exportBundle('json')}>Export project bundle</Button><Button size="sm" disabled={busy} onClick={() => exportBundle('markdown')}>Reviewed appendix</Button><Button size="sm" disabled={busy} onClick={() => exportBundle('editor')}>Open appendix in editor</Button></div>
    </Card>
    {governance?.transfer && <Card className="p-4"><p className="text-sm">Ownership transfer requested for <strong>{governance.transfer.target_email}</strong>. Expires {new Date(governance.transfer.expires_at).toLocaleDateString()}.</p><p className="mt-1 text-xs text-muted">Project sources and access stay together. Personal task, Library and document ownership remain with their creators.</p><div className="mt-3 flex gap-2">{governance.transfer.can_accept && <Button disabled={busy} onClick={() => action('/transfer/accept', 'POST')}>Accept ownership</Button>}{role === 'owner' && <Button disabled={busy} onClick={() => action('/transfer', 'DELETE')}>Cancel transfer</Button>}</div></Card>}
    <details className="rounded-xl border border-line bg-surface p-4"><summary className="cursor-pointer font-semibold">Project continuity and retention review</summary>
      {role === 'owner' ? <div className="mt-4 space-y-4">
        <div><label className="block text-sm font-medium">Transfer project ownership<select className={`${inputClass} mt-1 w-full`} value={target} onChange={(event) => setTarget(event.target.value)}><option value="">Select a joined member</option>{members.filter((member) => !member.pending).map((member) => <option key={member.email}>{member.email}</option>)}</select></label><Button size="sm" className="mt-2" disabled={busy || !target} onClick={() => action('/transfer', 'POST', { email: target })}>Request transfer</Button></div>
        <label className="block text-sm font-medium">Retention review date<input type="date" className={`${inputClass} mt-1 w-full`} value={reviewAt} onChange={(event) => setReviewAt(event.target.value)} /></label>
        <label className="block text-sm font-medium">Retention and consent notes<textarea className={`${inputClass} mt-1 min-h-20 w-full py-2`} value={retentionNote} onChange={(event) => setRetentionNote(event.target.value)} maxLength={3000} /></label>
        <p className="text-xs text-muted">This records a review deadline. It does not automatically delete records or enforce an institution's retention policy.</p><Button size="sm" disabled={busy} onClick={() => action('/governance', 'PATCH', { retention_review_at: reviewAt, retention_note: retentionNote })}>Save retention review</Button>
      </div> : <p className="mt-3 whitespace-pre-wrap text-sm">{governance?.retention_review_at ? `Review due ${governance.retention_review_at}. ` : ''}{governance?.retention_note || 'No retention review recorded.'}</p>}
      {governance?.retention_review_at && governance.retention_review_at <= new Date().toISOString().slice(0, 10) && <p role="status" className="mt-3 text-sm font-semibold text-brand">The retention review is due.</p>}
      {!!governance?.events.length && <details className="mt-4"><summary className="cursor-pointer text-sm">Ownership and retention history</summary><ul className="mt-2 space-y-1 text-xs text-muted">{governance.events.map((event, index) => <li key={index}>{new Date(event.at).toLocaleString()}: {event.action.replaceAll('_', ' ')}</li>)}</ul></details>}
    </details>
  </section>;
}

type ProgressStatus = 'on_track' | 'at_risk' | 'blocked' | 'done';
type ProgressComment = { id: string; user_id: string; name: string; text: string; at: string };
type ProgressEntry = { id: string; date: string; done: string; blockers: string; next: string; status: ProgressStatus | null; mood: number | null; author_user_id: string; author_name: string; comments: ProgressComment[]; created_at: string };
type ProgressSummary = { id: string; from: string; to: string; markdown: string; entries: number; author_name: string; created_at: string };
type Draft = { date: string; done: string; blockers: string; next: string; status: ProgressStatus | ''; mood: string };

const PROGRESS_STATUS: Record<ProgressStatus, { label: string; tone: 'positive' | 'warning' | 'negative' | 'brand' }> = {
  on_track: { label: 'On track', tone: 'positive' }, at_risk: { label: 'At risk', tone: 'warning' }, blocked: { label: 'Blocked', tone: 'negative' }, done: { label: 'Done', tone: 'brand' },
};
const MOODS = ['', 'Very low', 'Low', 'Okay', 'Good', 'Very good'];
const isoDay = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
const emptyDraft = (): Draft => ({ date: isoDay(new Date()), done: '', blockers: '', next: '', status: '', mood: '' });

/** The Progress tab: dated entries (owners and editors write, commenters comment, viewers read) and a summary for a supervisor. */
export function ProjectProgress({ id, role, userId }: { id: string; role: string; userId: string | null }) {
  const base = `/api/projects/${encodeURIComponent(id)}/progress`;
  const canWrite = role === 'owner' || role === 'edit';
  const canComment = canWrite || role === 'comment';
  const [entries, setEntries] = useState<ProgressEntry[] | null>(null);
  const [summaries, setSummaries] = useState<ProgressSummary[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editing, setEditing] = useState<string | null>(null);
  const [comment, setComment] = useState<Record<string, string>>({});
  const [from, setFrom] = useState(() => isoDay(new Date(Date.now() - 14 * 86_400_000)));
  const [to, setTo] = useState(() => isoDay(new Date()));
  const [busy, setBusy] = useState(false);
  const [summarising, setSummarising] = useState(false);

  const load = async () => {
    const data = await api<{ entries: ProgressEntry[]; summaries: ProgressSummary[] }>(base);
    setEntries(data.entries); setSummaries(data.summaries);
  };
  useEffect(() => { load().catch(showError); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (work: () => Promise<unknown>) => {
    setBusy(true);
    try { await work(); await load(); } catch (error) { showError(error); } finally { setBusy(false); }
  };
  const submit = () => run(async () => {
    const body = JSON.stringify({ date: draft.date, done: draft.done, blockers: draft.blockers, next: draft.next, status: draft.status || null, mood: draft.mood ? Number(draft.mood) : null });
    await api(editing ? `${base}/${encodeURIComponent(editing)}` : base, { method: editing ? 'PATCH' : 'POST', body });
    setDraft(emptyDraft()); setEditing(null);
  });
  const edit = (entry: ProgressEntry) => {
    setEditing(entry.id);
    setDraft({ date: entry.date, done: entry.done, blockers: entry.blockers, next: entry.next, status: entry.status ?? '', mood: entry.mood ? String(entry.mood) : '' });
  };
  const summarise = async () => {
    setSummarising(true);
    try {
      const result = await api<{ summary: ProgressSummary }>(`${base}/summary`, { method: 'POST', body: JSON.stringify({ from, to }) });
      setSummaries((list) => [result.summary, ...list]);
    } catch (error) {
      showError(error);
    } finally {
      setSummarising(false);
      creditsChanged();
    }
  };

  return (
    <section className="mt-2.5 space-y-4" aria-label="Progress">
      {canWrite && (
        <Card className="p-4">
          <h3 className="font-bold">{editing ? 'Edit entry' : 'New entry'}</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="block text-sm font-medium">Date<input type="date" className={`${inputClass} mt-1 w-full`} value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label>
            <label className="block text-sm font-medium">Status (optional)<select className={`${inputClass} mt-1 w-full`} value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as Draft['status'] })}><option value="">None</option>{(Object.keys(PROGRESS_STATUS) as ProgressStatus[]).map((status) => <option key={status} value={status}>{PROGRESS_STATUS[status].label}</option>)}</select></label>
            <label className="block text-sm font-medium">Mood (optional)<select className={`${inputClass} mt-1 w-full`} value={draft.mood} onChange={(event) => setDraft({ ...draft, mood: event.target.value })}><option value="">None</option>{[1, 2, 3, 4, 5].map((mood) => <option key={mood} value={mood}>{mood}: {MOODS[mood]}</option>)}</select></label>
          </div>
          {([['done', 'Done', 'What you finished or moved forward'], ['blockers', 'Blockers', 'What is in the way, and what help you need'], ['next', 'Next actions', 'What you will do next']] as const).map(([key, label, hint]) => (
            <label key={key} className="mt-3 block text-sm font-medium">{label}<textarea className={`${inputClass} mt-1 min-h-20 w-full py-2`} placeholder={hint} maxLength={4000} value={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} /></label>
          ))}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="primary" size="sm" disabled={busy || !draft.date || !(draft.done.trim() || draft.blockers.trim() || draft.next.trim())} onClick={submit}>{editing ? 'Save changes' : 'Add entry'}</Button>
            {editing && <Button size="sm" disabled={busy} onClick={() => { setEditing(null); setDraft(emptyDraft()); }}>Cancel</Button>}
          </div>
        </Card>
      )}
      <Card className="p-4">
        <h3 className="font-bold">Summarise for my supervisor</h3>
        <p className="mt-1 text-sm text-muted">An AI summary of the entries in a period, written from your log only: done, blockers, next steps and questions for your meeting.</p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="block text-sm font-medium">From<input type="date" className={`${inputClass} mt-1`} value={from} onChange={(event) => setFrom(event.target.value)} /></label>
          <label className="block text-sm font-medium">To<input type="date" className={`${inputClass} mt-1`} value={to} onChange={(event) => setTo(event.target.value)} /></label>
          <CreditCost credits={1} />
          <Button size="sm" variant="primary" disabled={summarising || !from || !to || !entries?.length} onClick={summarise}>{summarising ? <><LuLoaderCircle className="h-4 w-4 animate-spin" />Writing…</> : <><LuSparkles className="h-4 w-4" />Summarise</>}</Button>
        </div>
        {summaries.length > 0 && (
          <ul className="mt-4 space-y-3">
            {summaries.map((summary) => (
              <li key={summary.id} className="rounded-xl border border-line p-3">
                <p className="text-xs text-muted">{summary.from} to {summary.to} · {summary.entries} entries · by {summary.author_name}</p>
                <div className="wo-prose mt-2 text-sm leading-relaxed text-ink [&_h2]:mt-3 [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:font-semibold [&_li]:my-0.5 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5" dangerouslySetInnerHTML={{ __html: markdownToHtml(summary.markdown) }} />
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => navigator.clipboard.writeText(summary.markdown).then(() => toast.success('Copied'))}><LuCopy className="h-4 w-4" />Copy</Button>
                  <Button size="sm" onClick={() => openResultInEditor(`Progress update ${summary.from} to ${summary.to}`, summary.markdown, [])}>Open in editor</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {entries === null ? <p className="text-sm text-muted">Loading…</p> : !entries.length ? (
        <Card className="px-5 py-6 text-sm text-muted">{canWrite ? 'No entries yet. Add one after each working session or each week.' : 'No progress entries yet.'}</Card>
      ) : (
        <ol className="space-y-3">
          {entries.map((entry) => (
            <li key={entry.id}>
              <Card className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{new Date(`${entry.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <span className="text-xs text-muted">{entry.author_name}</span>
                  {entry.status && <Tag tone={PROGRESS_STATUS[entry.status].tone}>{PROGRESS_STATUS[entry.status].label}</Tag>}
                  {entry.mood && <Tag>Mood: {MOODS[entry.mood]}</Tag>}
                  {canWrite && (role === 'owner' || entry.author_user_id === userId) && (
                    <span className="ml-auto flex gap-1">
                      <Button size="sm" disabled={busy} onClick={() => edit(entry)}>Edit</Button>
                      <Button size="sm" disabled={busy} onClick={() => { if (window.confirm('Delete this entry?')) run(() => api(`${base}/${encodeURIComponent(entry.id)}`, { method: 'DELETE' })); }}><LuTrash2 className="h-4 w-4" /></Button>
                    </span>
                  )}
                </div>
                {([['done', 'Done'], ['blockers', 'Blockers'], ['next', 'Next actions']] as const).filter(([key]) => entry[key]).map(([key, label]) => (
                  <div key={key} className="mt-2"><p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p><p className="whitespace-pre-wrap text-sm text-ink">{entry[key]}</p></div>
                ))}
                {(entry.comments.length > 0 || canComment) && (
                  <div className="mt-3 border-t border-line pt-3">
                    {entry.comments.map((item) => (
                      <div key={item.id} className="mb-2 flex items-start gap-2 text-sm">
                        <p className="min-w-0 flex-1"><span className="font-semibold">{item.name}</span> <span className="text-xs text-muted">{new Date(item.at).toLocaleDateString()}</span><span className="block whitespace-pre-wrap text-ink-2">{item.text}</span></p>
                        {(role === 'owner' || item.user_id === userId) && <button type="button" aria-label="Remove comment" className="grid h-7 w-7 place-items-center rounded-md text-subtle hover:bg-soft hover:text-ink" onClick={() => run(() => api(`${base}/${encodeURIComponent(entry.id)}/comments/${encodeURIComponent(item.id)}`, { method: 'DELETE' }))}><LuX className="h-3.5 w-3.5" /></button>}
                      </div>
                    ))}
                    {canComment && (
                      <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); const text = (comment[entry.id] ?? '').trim(); if (text) run(async () => { await api(`${base}/${encodeURIComponent(entry.id)}/comments`, { method: 'POST', body: JSON.stringify({ text }) }); setComment((all) => ({ ...all, [entry.id]: '' })); }); }}>
                        <input aria-label="Comment" className={`${inputClass} h-9 flex-1 text-sm`} placeholder="Add a comment" maxLength={2000} value={comment[entry.id] ?? ''} onChange={(event) => setComment((all) => ({ ...all, [entry.id]: event.target.value }))} />
                        <Button size="sm" type="submit" disabled={busy || !(comment[entry.id] ?? '').trim()}>Comment</Button>
                      </form>
                    )}
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
