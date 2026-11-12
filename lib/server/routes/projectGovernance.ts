/** Project continuity, a review inbox and portable evidence, using the existing project roles. */
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { requireUser, type AppVariables, type AuthUser } from '../auth.js';
import { C, col, db, newId, row, rows } from '../firebase.js';
import { currentUser, parseBody } from '../lib/assist-llm.js';
import { getProjectFor, publicProject, forgetRoles, type Project } from '../lib/projects.js';
import { checkTotal } from '../lib/plans.js';
import { getTaskFor } from '../lib/history.js';
import { getWorkbookFor, publicWorkbook, workbookEvents } from '../lib/workflows.js';
import { matrixFor, matrixRows } from '../lib/matrix.js';
import { projectEvidenceBundle } from './projectEvidence.js';
import { rateLimit } from '../lib/rateLimit.js';
import { reviewState } from '../lib/systematicReview.js';

type Transfer = { target_user_id: string; target_email: string; requested_by: string; expires_at: Date };
type ManagedProject = Project & { transfer?: Transfer | null; retention_review_at?: string; retention_note?: string };
const ref = (id: string) => col(C.projects).doc(id);

/** Runs `work` over `items` with at most `limit` in flight, keeping the input order. */
async function mapLimited<T, R>(items: readonly T[], limit: number, work: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await work(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function resources(projectId: string) {
  const collections = [
    ['workbook', 'workflows', '/workbooks/'], ['matrix', C.reviewMatrices, '/matrix/'],
    ['review', C.reviews, '/systematic-review/'], ['monitor', 'research_monitors', '/monitoring?monitor='],
  ] as const;
  const found = await Promise.all(collections.map(async ([kind, collection, path]) => {
    const linked = rows(await col(collection).where('project_id', '==', projectId).get());
    return linked.map((item) => ({
      id: item.id, kind, title: item.title || 'Untitled', status: item.status || '',
      href: `${path}${encodeURIComponent(item.id)}`, pending: Number(item.pending_runs || 0),
    }));
  }));
  return found.flat();
}

/** Uses the systematic review's authorized, blinded state rather than raw peer votes. */
async function reviewInbox(user: AuthUser, projectId: string, items: Awaited<ReturnType<typeof resources>>) {
  const inbox: { id: string; kind: string; title: string; href: string; count: number; detail: string }[] = [];
  for (const item of items) {
    if (item.kind === 'workbook' && item.status === 'in_review') inbox.push({ ...item, count: 1, detail: 'Workbook submitted for review' });
    if (item.kind === 'monitor' && item.pending > 0) {
      const detail = `${item.pending} evidence update${item.pending === 1 ? '' : 's'} awaiting review`;
      inbox.push({ ...item, count: item.pending, detail });
    }
  }
  // Each review state loads every record; a small bound keeps large projects responsive.
  const reviews = items.filter((item) => item.kind === 'review');
  const conflicts = await mapLimited(reviews, 4, async (item) => {
    const records = (await reviewState(user, item.id)).records.filter((record) => !record.duplicate_of);
    const title = records.filter((record) => record.title_state.status === 'conflict').length;
    const full = records.filter((record) => record.full_state?.status === 'conflict').length;
    return { item, title, full };
  });
  for (const { item, title, full } of conflicts) {
    if (!(title + full)) continue;
    const detail = `${title} title/abstract and ${full} full-text conflicts visible to you`;
    inbox.push({ id: item.id, kind: 'review_conflict', title: item.title, href: item.href, count: title + full, detail });
  }
  const evidence = col(C.projects).doc(projectId).collection('evidence');
  const sourceFindings = await mapLimited(rows(await evidence.get()), 8, async (source) => {
    const all = rows(await evidence.doc(source.id).collection('findings').get());
    return { source, findings: all.filter((finding) => finding.status !== 'approved') };
  });
  for (const { source, findings } of sourceFindings) {
    if (!findings.length) continue;
    const revisions = findings.filter((finding) => finding.status === 'needs_revision').length;
    const query = new URLSearchParams({ evidence: source.id, finding: findings[0].id });
    inbox.push({ id: source.id, kind: 'findings', title: source.title || 'Shared source', href: `/projects/${encodeURIComponent(projectId)}?${query}#project-evidence-title`, count: findings.length, detail: `${findings.length} finding${findings.length === 1 ? '' : 's'} awaiting review${revisions ? `; ${revisions} need revision` : ''}` });
  }
  return inbox;
}

export async function acceptProjectTransfer(user: AuthUser, id: string) {
  const project = await getProjectFor(user, id) as ManagedProject;
  if (project.transfer?.target_user_id !== user.id) throw new HTTPException(403, { message: 'This transfer is addressed to another project member.' });
  await db().runTransaction(async (tx) => {
    const latest = row<ManagedProject>(await tx.get(ref(id)));
    const transfer = latest?.transfer;
    const current = transfer && transfer.target_user_id === user.id && transfer.requested_by === latest.owner_user_id;
    if (!latest || !current || transfer.expires_at.getTime() < Date.now()) {
      throw new HTTPException(409, { message: 'The transfer expired or changed. Ask the owner to request it again.' });
    }
    if (!latest.members.some((member) => member.user_id === user.id)) throw new HTTPException(403, { message: 'You are no longer a project member.' });
    const members = latest.members.filter((member) => member.user_id !== user.id);
    members.push({ user_id: latest.owner_user_id, email: latest.owner_email, name: null, role: 'edit', added_at: new Date() });
    // The new owner's plan must cover both one more owned project and everyone already on this one.
    // Counted inside the transaction so a concurrent create or accept cannot slip past the limit.
    const owned = (await tx.get(col(C.projects).where('owner_user_id', '==', user.id).select())).size;
    await checkTotal(user.account_id, 'projects', owned);
    await checkTotal(user.account_id, 'collaborators', members.length, 0);
    tx.update(ref(id), { owner_user_id: user.id, owner_email: user.email, owner_account_id: user.account_id, members, transfer: null, updated_at: new Date() });
    tx.create(ref(id).collection('governance_events').doc(newId()), { action: 'ownership_transferred', from: latest.owner_user_id, to: user.id, at: new Date() });
  });
  forgetRoles(id);
}

export function projectGovernanceRoutes() {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use('*', requireUser);
  app.get('/:id/resources', async (c) => {
    const user = currentUser(c);
    const project = await getProjectFor(user, c.req.param('id'));
    const items = await resources(project.id);
    c.header('Cache-Control', 'private, no-store');
    return c.json({ items, review_inbox: await reviewInbox(user, project.id, items) });
  });
  app.get('/:id/governance', async (c) => {
    const user = currentUser(c);
    const project = await getProjectFor(user, c.req.param('id')) as ManagedProject & { role: string };
    return c.json({ transfer: project.transfer ? { target_email: project.transfer.target_email, expires_at: project.transfer.expires_at, can_accept: project.transfer.target_user_id === user.id } : null, retention_review_at: project.retention_review_at || '', retention_note: project.retention_note || '', events: rows(await ref(project.id).collection('governance_events').get()) });
  });
  app.post('/:id/transfer', async (c) => {
    const user = currentUser(c); const project = await getProjectFor(user, c.req.param('id'), ['owner']);
    const { email } = await parseBody(c, z.object({ email: z.string().email().max(254) }));
    const target = project.members.find((member) => member.email.toLowerCase() === email.toLowerCase() && member.user_id);
    if (!target?.user_id) throw new HTTPException(422, { message: 'Choose a member who has already joined this project.' });
    await db().runTransaction(async (tx) => {
      const current = row<Project>(await tx.get(ref(project.id)));
      if (current?.owner_user_id !== user.id || !current.members.some((member) => member.user_id === target.user_id)) throw new HTTPException(409, { message: 'Project membership changed. Reload before transferring.' });
      tx.update(ref(project.id), { transfer: { target_user_id: target.user_id, target_email: target.email, requested_by: user.id, expires_at: new Date(Date.now() + 7 * 86400_000) }, updated_at: new Date() });
      tx.create(ref(project.id).collection('governance_events').doc(newId()), { action: 'transfer_requested', from: user.id, to: target.user_id, at: new Date() });
    });
    return c.json({ ok: true });
  });
  app.post('/:id/transfer/accept', async (c) => { await acceptProjectTransfer(currentUser(c), c.req.param('id')); return c.json({ ok: true }); });
  app.delete('/:id/transfer', async (c) => {
    const user = currentUser(c); const project = await getProjectFor(user, c.req.param('id'), ['owner']);
    await db().runTransaction(async (tx) => {
      const latest = await tx.get(ref(project.id));
      if (latest.get('owner_user_id') !== user.id) throw new HTTPException(409, { message: 'Project ownership changed. Reload first.' });
      tx.update(ref(project.id), { transfer: null });
      tx.create(ref(project.id).collection('governance_events').doc(newId()), { action: 'transfer_cancelled', by: user.id, at: new Date() });
    });
    return c.json({ ok: true });
  });
  app.patch('/:id/governance', async (c) => {
    const user = currentUser(c); const project = await getProjectFor(user, c.req.param('id'), ['owner']);
    const body = await parseBody(c, z.object({ retention_review_at: z.string().refine((value) => !value || (/^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value)), retention_note: z.string().max(3000) }));
    await db().runTransaction(async (tx) => {
      const latest = await tx.get(ref(project.id));
      if (latest.get('owner_user_id') !== user.id) throw new HTTPException(409, { message: 'Project ownership changed. Reload first.' });
      tx.update(ref(project.id), { ...body, updated_at: new Date() });
      tx.create(ref(project.id).collection('governance_events').doc(newId()), { action: 'retention_review_set', by: user.id, ...body, at: new Date() });
    });
    return c.json({ ok: true });
  });
  app.get('/:id/bundle', rateLimit({ key: 'project-export', limit: 20, windowSeconds: 3600 }), async (c) => {
    const user = currentUser(c); const project = await getProjectFor(user, c.req.param('id'));
    const started = new Date().toISOString();
    const items = await resources(project.id);
    const evidence = await projectEvidenceBundle(project.id);
    const workbookItems = items.filter((item) => item.kind === 'workbook');
    const workbooks = await mapLimited(workbookItems, 6, async (item) => {
      const [workbook, events] = await Promise.all([getWorkbookFor(user, item.id), workbookEvents(user, item.id)]);
      return { ...publicWorkbook(workbook, user.id), events };
    });
    const matrixItems = items.filter((item) => item.kind === 'matrix');
    const matrices = await mapLimited(matrixItems, 6, async (item) => {
      const [matrix, matrixRowMap, events] = await Promise.all([
        matrixFor(user, item.id), matrixRows(item.id), col(C.reviewMatrices).doc(item.id).collection('events').get(),
      ]);
      return { ...matrix, rows: Object.fromEntries(matrixRowMap), events: rows(events) };
    });
    const taskDocs = (await col(C.tasks).where('project_id', '==', project.id).select().get()).docs;
    const tasks = await mapLimited(taskDocs, 6, async (task) => {
      const { result_ref: _ref, result_sha256: _hash, ...value } = await getTaskFor(user, task.id);
      return value;
    });
    // Review votes stay behind the systematic-review's blind-review export rules.
    c.header('Cache-Control', 'private, no-store');
    return c.json({ schema_version: 1, started_at: started, exported_at: new Date().toISOString(), project: publicProject(project), evidence, workbooks, matrices, tasks, linked_workspaces: items, governance: rows(await ref(project.id).collection('governance_events').get()), limitations: ['Resources are read at their recorded revisions, not in a single database snapshot.', 'PDF originals and systematic-review records are available through their own authorized workspace exports.'] });
  });
  return app;
}
