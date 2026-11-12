'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/session';
import { Button, Card, inputClass } from './ui';
import { showError } from './research/parts';
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
