import { HTTPException } from 'hono/http-exception';
import type { AuthUser } from '../auth.js';
import { col, db, deleteDeep, newId, row, rows } from '../firebase.js';
import { getProjectFor, listProjects } from './projects.js';
import { activeUser } from './users.js';
import { crossrefUpdates, doiKey, searchSources, sourceGroups, type SourceGroup } from './sources/index.js';
import { diffMonitorSnapshots, nextMonitorRun, type ResearchMonitor, type MonitorRun, type MonitorSource } from '../../monitoring.js';

export const MONITORS_COLLECTION = 'research_monitors';
const ref = (id: string) => col(MONITORS_COLLECTION).doc(id);
const PAUSED_DATE = '9999-01-01T00:00:00.000Z';
const ROLES = ['owner', 'edit', 'comment', 'view'] as const;
type Role = typeof ROLES[number];
type MonitorInput = Pick<ResearchMonitor, 'title' | 'query' | 'groups' | 'filters' | 'interval_hours' | 'tracked_dois' | 'retraction_checks' | 'enabled'>;

export async function getMonitorFor(user: AuthUser, id: string, need: readonly Role[] = ROLES): Promise<ResearchMonitor & { role: Role }> {
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) throw new HTTPException(404, { message: 'Monitor not found.' });
  const monitor = row<ResearchMonitor>(await ref(id).get());
  if (!monitor) throw new HTTPException(404, { message: 'Monitor not found.' });
  const role = monitor.project_id ? (await getProjectFor(user, monitor.project_id)).role : monitor.owner_user_id === user.id ? 'owner' : null;
  if (!role) throw new HTTPException(404, { message: 'Monitor not found.' });
  if (!need.includes(role)) throw new HTTPException(403, { message: 'Your project role does not allow this action.' });
  return { ...monitor, role };
}

export async function listMonitors(user: AuthUser) {
  const found = new Map<string, ResearchMonitor>();
  const projects = await listProjects(user);
  const accessible = new Set(projects.map((p) => p.id));
  for (const item of rows<ResearchMonitor>(await col(MONITORS_COLLECTION).where('owner_user_id', '==', user.id).get())) if (!item.project_id || accessible.has(item.project_id)) found.set(item.id, item);
  for (let i = 0; i < projects.length; i += 30) for (const item of rows<ResearchMonitor>(await col(MONITORS_COLLECTION).where('project_id', 'in', projects.slice(i, i + 30).map((p) => p.id)).get())) found.set(item.id, item);
  return [...found.values()].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).map(({ snapshot: _snapshot, lease: _lease, ...monitor }) => monitor);
}

function checkedInput(input: MonitorInput): MonitorInput {
  const unavailable = new Set(sourceGroups().filter((group) => !group.available).map((group) => group.id));
  if (input.groups.some((group) => unavailable.has(group as SourceGroup))) throw new HTTPException(422, { message: 'One selected source is not configured. Choose an available source.' });
  const dois = input.tracked_dois.map(doiKey);
  if (dois.some((doi) => !doi)) throw new HTTPException(422, { message: 'Use valid DOIs for tracked publications.' });
  return { ...input, groups: [...new Set(input.groups)], tracked_dois: [...new Set(dois as string[])] };
}

export async function createMonitor(user: AuthUser, input: MonitorInput & { project_id?: string | null }) {
  if (input.project_id) await getProjectFor(user, input.project_id, ['owner', 'edit']);
  const count = (await col(MONITORS_COLLECTION).where('owner_user_id', '==', user.id).count().get()).data().count;
  if (count >= 30) throw new HTTPException(422, { message: 'You can keep up to 30 monitors. Delete an unused monitor before adding another.' });
  const now = new Date().toISOString(); const id = newId();
  const values = checkedInput(input);
  const monitor: Omit<ResearchMonitor, 'id'> = { ...values, owner_user_id: user.id, project_id: input.project_id || null, next_run_at: input.enabled ? now : PAUSED_DATE, last_run_at: null, last_error: null, failures: 0, revision: 1, snapshot: [], pending_runs: 0, lease: null, lease_until: null, created_at: now, updated_at: now };
  await ref(id).create(monitor);
  return getMonitorFor(user, id);
}

export async function updateMonitor(user: AuthUser, id: string, revision: number, input: MonitorInput) {
  await getMonitorFor(user, id, ['owner', 'edit']); const values = checkedInput(input);
  await db().runTransaction(async (tx) => {
    const current = row<ResearchMonitor>(await tx.get(ref(id)));
    if (!current) throw new HTTPException(404, { message: 'Monitor not found.' });
    if (current.revision !== revision) throw new HTTPException(409, { message: 'This monitor changed. Reload it before saving.' });
    if (current.lease_until && Date.parse(current.lease_until) > Date.now()) throw new HTTPException(409, { message: 'Wait for the current check to finish before editing the monitor.' });
    const searchChanged = JSON.stringify([current.query, current.groups, current.filters]) !== JSON.stringify([values.query, values.groups, values.filters]);
    tx.update(ref(id), { ...values, revision: current.revision + 1, next_run_at: values.enabled ? new Date().toISOString() : PAUSED_DATE, updated_at: new Date().toISOString(), ...(searchChanged ? { snapshot: [], last_run_at: null } : {}) });
  });
  return getMonitorFor(user, id);
}

/** A lease makes scheduled retries and simultaneous manual runs idempotent. */
export async function runMonitor(id: string, force = false): Promise<{ claimed: boolean; status?: MonitorRun['status'] }> {
  const lease = newId(); const started = new Date();
  const monitor = await db().runTransaction(async (tx) => {
    const current = row<ResearchMonitor>(await tx.get(ref(id)));
    if (!current || (!force && (!current.enabled || current.next_run_at > started.toISOString()))) return null;
    if (current.lease_until && Date.parse(current.lease_until) > started.getTime()) return null;
    tx.update(ref(id), { lease, lease_until: new Date(started.getTime() + 10 * 60000).toISOString() });
    return current;
  });
  if (!monitor) return { claimed: false };
  let status: MonitorRun['status'] = 'failed';
  let next: MonitorSource[] = monitor.snapshot; let counts: Record<string, number> = {}; const errors: string[] = [];
  let changes: MonitorRun['changes'] = [];
  try {
    const user = await activeUser(monitor.owner_user_id);
    if (!user) throw new Error('The monitor owner is unavailable.');
    if (monitor.project_id) await getProjectFor(user, monitor.project_id, ['owner', 'edit']);
    checkedInput(monitor);
    const result = await searchSources({ query: monitor.query, groups: monitor.groups as SourceGroup[], filters: monitor.filters, limit: 75, sort: 'newest' }, { userId: monitor.owner_user_id });
    counts = result.counts;
    errors.push(...result.errors.map((error) => `${error.provider}: search unavailable`));
    if (!Object.keys(counts).length) throw new Error('No selected search provider completed. The previous evidence snapshot was retained.');
    next = [
      ...result.papers.map((paper): MonitorSource => ({ key: paper.doi ? `doi:${doiKey(paper.doi)}` : `paper:${paper.id}`, title: paper.title, doi: doiKey(paper.doi), url: paper.url || (paper.doi ? `https://doi.org/${paper.doi}` : null), published: paper.publication_date || (paper.year ? String(paper.year) : null), summary: (paper.abstract || paper.tldr || '').slice(0, 2400), retracted: Boolean(paper.is_retracted), notices: [], providers: paper.providers })),
      ...result.web.map((item): MonitorSource => ({ key: `web:${item.url}`, title: item.title, doi: null, url: item.url, published: item.published, summary: item.snippet.slice(0, 2400), retracted: false, notices: [], providers: ['web'] })),
    ];
    // A search result without a flag is not evidence that an earlier notice was withdrawn.
    // Keep known notices even when checks are disabled or this DOI falls outside the budget.
    for (const source of next) {
      const prior = monitor.snapshot.find((item) => item.key === source.key || (source.doi && item.doi === source.doi));
      source.notices = prior?.notices || [];
      source.retracted ||= Boolean(prior?.retracted);
    }
    if (monitor.retraction_checks) {
      const candidates = [...new Set([...monitor.tracked_dois, ...next.map((s) => s.doi).filter((doi): doi is string => Boolean(doi))])];
      const tracked = candidates.slice(0, 25);
      if (candidates.length > tracked.length) errors.push(`Crossref: notice checks were limited to ${tracked.length} of ${candidates.length} DOIs; remaining notices were not refreshed.`);
      // Bounded concurrency avoids a burst against Crossref.
      for (let i = 0; i < tracked.length; i += 4) await Promise.all(tracked.slice(i, i + 4).map(async (doi) => {
        let source = next.find((s) => s.doi === doi);
        const prior = monitor.snapshot.find((s) => s.doi === doi);
        if (!source) { source = { key: `doi:${doi}`, title: prior?.title || doi, doi, url: `https://doi.org/${doi}`, published: prior?.published || null, summary: prior?.summary || '', retracted: prior?.retracted || false, notices: [], providers: ['crossref'] }; next.push(source); }
        try {
          const notices = (await crossrefUpdates(doi)).map(({ doi: noticeDoi, type, date }) => ({ doi: noticeDoi, type, date }));
          source.notices = [...new Map([...(prior?.notices || []), ...notices].map((notice) => [notice.doi, notice])).values()];
          source.retracted ||= source.notices.some((notice) => /retract/i.test(notice.type));
        } catch { source.notices = prior?.notices || []; source.retracted ||= Boolean(prior?.retracted); errors.push(`Crossref: notices could not be checked for ${doi}`); }
      }));
    }
    next = [...new Map(next.map((source) => [source.key, source])).values()];
    // Missing providers must not manufacture disappearance alerts or erase prior evidence.
    changes = monitor.last_run_at ? diffMonitorSnapshots(monitor.snapshot, next, errors.length === 0) : [];
    if (errors.length) for (const source of monitor.snapshot) if (!next.some((item) => item.key === source.key)) next.push(source);
    if (new TextEncoder().encode(JSON.stringify(next)).length > 300000 || new TextEncoder().encode(JSON.stringify(changes)).length > 700000) throw new Error('The evidence snapshot is too large. Narrow the saved query; the previous snapshot was retained.');
    status = errors.length ? 'partial' : 'complete';
  } catch (error) {
    next = monitor.snapshot; changes = [];
    errors.push(error instanceof HTTPException ? 'The owner no longer has permission to run this project monitor.' : (error as Error).message.slice(0, 300));
  }
  const finished = new Date();
  // Only a run with something to decide on (changes, notices or errors) waits for review.
  const needsReview = changes.length > 0 || errors.length > 0;
  const run: Omit<MonitorRun, 'id'> = { at: finished.toISOString(), status, baseline: !monitor.last_run_at, changes, result_count: next.length, search: { query: monitor.query, groups: monitor.groups, filters: monitor.filters, tracked_dois: monitor.tracked_dois, retraction_checks: monitor.retraction_checks, revision: monitor.revision }, errors, counts,
    review: { status: needsReview ? 'pending' : 'not_needed', by: null, at: null, note: '' } };
  await db().runTransaction(async (tx) => {
    const current = row<ResearchMonitor>(await tx.get(ref(id)));
    if (!current || current.lease !== lease) return;
    const failures = status === 'failed' ? current.failures + 1 : 0;
    tx.create(ref(id).collection('runs').doc(lease), run);
    tx.update(ref(id), {
      ...(status === 'failed' ? {} : { snapshot: next, last_run_at: finished.toISOString() }),
      last_error: errors.length ? errors.join('; ').slice(0, 2000) : null, failures, pending_runs: current.pending_runs + (needsReview ? 1 : 0), lease: null, lease_until: null,
      next_run_at: current.enabled ? nextMonitorRun(current.interval_hours, finished, failures) : PAUSED_DATE, revision: current.revision + 1, updated_at: finished.toISOString(),
    });
  });
  return { claimed: true, status };
}

/** Called by the existing scheduled Firebase worker. Alerts are in-app only. */
export async function runDueMonitors(limit = 20) {
  const due = rows<ResearchMonitor>(await col(MONITORS_COLLECTION).where('next_run_at', '<=', new Date().toISOString()).limit(Math.min(50, Math.max(1, limit))).get());
  let completed = 0;
  const deadline = Date.now() + 420000;
  // Keep external API work bounded across the scheduled batch.
  for (let i = 0; i < due.length && Date.now() < deadline; i += 2) await Promise.all(due.slice(i, i + 2).map(async (monitor) => { const result = await runMonitor(monitor.id); if (result.claimed) completed += 1; }));
  return { due: due.length, completed };
}

export async function monitorRuns(user: AuthUser, id: string): Promise<MonitorRun[]> {
  await getMonitorFor(user, id);
  return rows<MonitorRun>(await ref(id).collection('runs').get()).sort((a, b) => b.at.localeCompare(a.at));
}
export async function reviewMonitorRun(user: AuthUser, id: string, runId: string, note: string) {
  await getMonitorFor(user, id, ['owner', 'edit', 'comment']);
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(runId)) throw new HTTPException(404, { message: 'Update not found.' });
  await db().runTransaction(async (tx) => {
    const monitor = row<ResearchMonitor>(await tx.get(ref(id)));
    const runRef = ref(id).collection('runs').doc(runId);
    const run = row<MonitorRun>(await tx.get(runRef));
    if (!monitor || !run) throw new HTTPException(404, { message: 'Update not found.' });
    if (run.review.status === 'reviewed') throw new HTTPException(409, { message: 'This update already has a review decision.' });
    if (run.review.status === 'not_needed') throw new HTTPException(409, { message: 'This check found no changes, so it does not need a review decision.' });
    tx.update(runRef, { review: { status: 'reviewed', by: user.id, at: new Date().toISOString(), note } });
    tx.update(ref(id), { pending_runs: Math.max(0, monitor.pending_runs - 1), revision: monitor.revision + 1, updated_at: new Date().toISOString() });
  });
}
export async function deleteMonitor(user: AuthUser, id: string) { await getMonitorFor(user, id, ['owner']); await deleteDeep(ref(id)); }
