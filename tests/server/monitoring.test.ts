import { beforeEach, describe, expect, it, vi } from 'vitest';
const fake = await vi.hoisted(async () => (await import('./fakeFirestore.js')).createFakeFirestore());
const state = vi.hoisted(() => ({ roles: new Map<string, string>(), result: { papers: [], web: [], counts: { openalex: 0 }, errors: [] } as any, notices: [] as any[], searchCalls: 0, failedNotices: false }));
vi.mock('../../lib/server/firebase.js', async (original) => ({ ...(await original<typeof import('../../lib/server/firebase.js')>()), ...fake.module }));
vi.mock('../../lib/server/lib/users.js', () => ({ activeUser: async (id: string) => { const user = fake.read(`users/${id}`); return user && !user.disabled_at ? { ...user, id } : null; } }));
vi.mock('../../lib/server/lib/sources/index.js', async (original) => ({
  ...(await original<typeof import('../../lib/server/lib/sources/index.js')>()),
  searchSources: async () => { state.searchCalls += 1; return state.result; },
  crossrefUpdates: async () => { if (state.failedNotices) throw new Error('unavailable'); return state.notices; },
  sourceGroups: () => [{ id: 'papers', label: 'All papers', available: true }, { id: 'medical', label: 'Medical', available: true }, { id: 'web', label: 'Web', available: false }],
}));
vi.mock('../../lib/server/lib/projects.js', async () => {
  const { HTTPException } = await import('hono/http-exception');
  return {
    getProjectFor: async (user: { id: string }, id: string, need = ['owner', 'edit', 'comment', 'view']) => {
      const role = state.roles.get(`${id}:${user.id}`);
      if (!role) throw new HTTPException(404, { message: 'Project not found' });
      if (!need.includes(role)) throw new HTTPException(403, { message: 'Permission denied' });
      return { id, role };
    },
    listProjects: async (user: { id: string }) => [...state.roles].filter(([key]) => key.endsWith(`:${user.id}`)).map(([key, role]) => ({ id: key.split(':')[0], role })),
  };
});
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppVariables, AuthUser } from '../../lib/server/auth.js';
import { monitoringRoutes } from '../../lib/server/routes/monitoring.js';
import { runDueMonitors, runMonitor } from '../../lib/server/lib/monitoring.js';
import { diffMonitorSnapshots, nextMonitorRun, type MonitorSource } from '../../lib/monitoring.js';

const USER: AuthUser = { id: 'writer', email: 'writer@example.test', full_name: 'Writer', account_id: 'account', is_admin: false };
const make = (id = 'writer') => {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use('*', async (c, next) => { c.set('user', { ...USER, id }); await next(); });
  app.route('/api/monitoring', monitoringRoutes());
  app.onError((error, c) => error instanceof HTTPException ? c.json({ detail: error.message }, error.status) : c.json({ detail: error.message }, 500));
  return app;
};
const request = (app: ReturnType<typeof make>, path: string, method = 'GET', body?: unknown) => app.request(`/api/monitoring${path}`, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
const defaultInput = { title: 'Research update', query: '睡眠 memory', groups: ['papers'], interval_hours: 168, tracked_dois: [], retraction_checks: true, enabled: true, filters: {} };
const create = async (app: ReturnType<typeof make>, patch: Record<string, unknown> = {}) => { const response = await request(app, '', 'POST', { ...defaultInput, ...patch }); expect(response.status).toBe(201); return response.json() as Promise<any>; };
const source = (key: string, extra: Partial<MonitorSource> = {}): MonitorSource => ({ key, title: key, doi: null, url: null, published: '2025', summary: 'Finding', retracted: false, notices: [], providers: ['openalex'], ...extra });
const paper = (id: string, extra: Record<string, unknown> = {}) => ({ id, doi: `10.1234/${id}`, title: `Paper ${id}`, abstract: 'Original finding.', publication_date: '2025-02-01', url: `https://doi.org/10.1234/${id}`, providers: ['openalex'], is_retracted: false, ...extra });

describe('monitoring changes and scheduling', () => {
  it('distinguishes additions, metadata changes and non-returned sample entries', () => {
    const diff = diffMonitorSnapshots([source('old'), source('changed')], [source('new'), source('changed', { summary: 'Revised finding' })]);
    expect(diff.map((item) => [item.kind, item.key])).toEqual([['added', 'new'], ['changed', 'changed'], ['not_returned', 'old']]);
    expect(diffMonitorSnapshots([source('old')], [], false)).toEqual([]);
  });
  it('ignores provider ordering but detects retractions', () => {
    expect(diffMonitorSnapshots([source('a', { providers: ['pubmed', 'openalex'] })], [source('a', { providers: ['openalex', 'pubmed'] })])).toEqual([]);
    expect(diffMonitorSnapshots([source('a')], [source('a', { retracted: true })])[0].kind).toBe('changed');
  });
  it('uses bounded failure retries rather than waiting a week or retrying continuously', () => {
    const now = new Date('2026-11-12T00:00:00Z');
    expect(nextMonitorRun(168, now)).toBe('2026-11-19T00:00:00.000Z');
    expect(nextMonitorRun(168, now, 1)).toBe('2026-11-12T01:00:00.000Z');
    expect(nextMonitorRun(24, now, 10)).toBe('2026-11-13T00:00:00.000Z');
  });
});

describe('saved monitors', () => {
  beforeEach(() => {
    fake.clear(); state.roles.clear(); state.searchCalls = 0; state.notices = []; state.failedNotices = false;
    state.result = { papers: [paper('a')], web: [], counts: { openalex: 1 }, errors: [] };
    fake.put('users/writer', { ...USER, disabled_at: null });
  });
  it('creates a baseline, records later changes and preserves a review journal', async () => {
    const app = make(); const monitor = await create(app);
    expect((await runMonitor(monitor.id, true)).status).toBe('complete');
    let detail = await (await request(app, `/${monitor.id}`)).json();
    expect(detail.runs[0]).toMatchObject({ baseline: true, changes: [], result_count: 1, review: { status: 'not_needed' } });
    // A baseline or a check without changes never waits for review.
    expect(fake.read(`research_monitors/${monitor.id}`)?.pending_runs).toBe(0);
    expect((await request(app, `/${monitor.id}/runs/${detail.runs[0].id}/review`, 'POST', { note: 'Nothing to decide' })).status).toBe(409);
    expect(detail.runs[0].search).toMatchObject({ query: monitor.query, groups: monitor.groups, revision: 1 });
    state.result.papers = [paper('a', { abstract: 'Updated finding.' }), paper('b')];
    await runMonitor(monitor.id, true);
    detail = await (await request(app, `/${monitor.id}`)).json();
    const update = detail.runs.find((run: any) => !run.baseline);
    expect(update.changes.map((change: any) => change.kind)).toEqual(['changed', 'added']);
    expect((await request(app, `/${monitor.id}/runs/${update.id}/review`, 'POST', { note: 'Read paper B before revising the report.' })).status).toBe(200);
    expect((await request(app, `/${monitor.id}/runs/${update.id}/review`, 'POST', { note: 'Overwrite decision' })).status).toBe(409);
    expect(fake.read(`research_monitors/${monitor.id}`)?.pending_runs).toBe(0);
  });
  it('retains prior evidence on provider failures and does not invent disappearance alerts', async () => {
    const app = make(); const monitor = await create(app);
    await runMonitor(monitor.id, true);
    state.result = { papers: [], web: [], counts: {}, errors: [{ provider: 'openalex', message: 'down' }] };
    expect((await runMonitor(monitor.id, true)).status).toBe('failed');
    let saved = fake.read(`research_monitors/${monitor.id}`)!;
    expect(saved.snapshot).toHaveLength(1); expect(saved.failures).toBe(1);
    state.result = { papers: [paper('b')], web: [], counts: { openalex: 1 }, errors: [{ provider: 'semantic_scholar', message: 'down' }] };
    expect((await runMonitor(monitor.id, true)).status).toBe('partial');
    saved = fake.read(`research_monitors/${monitor.id}`)!;
    expect(saved.snapshot.map((s: any) => s.doi).sort()).toEqual(['10.1234/a', '10.1234/b']);
    const runs = (await (await request(app, `/${monitor.id}`)).json()).runs;
    expect(runs.find((r: any) => r.status === 'partial').changes.every((c: any) => c.kind !== 'not_returned')).toBe(true);
  });
  it('records correction/retraction changes and preserves notices when notice checks fail', async () => {
    const app = make(); const monitor = await create(app, { tracked_dois: ['10.1234/a'] });
    await runMonitor(monitor.id, true);
    state.notices = [{ doi: '10.1234/retraction', type: 'retraction', date: '2026-11-12', source: 'publisher' }];
    await runMonitor(monitor.id, true);
    let saved = fake.read(`research_monitors/${monitor.id}`)!;
    expect(saved.snapshot[0]).toMatchObject({ retracted: true, notices: [{ type: 'retraction' }] });
    state.failedNotices = true;
    await runMonitor(monitor.id, true);
    saved = fake.read(`research_monitors/${monitor.id}`)!;
    expect(saved.snapshot[0].notices).toHaveLength(1); expect(saved.snapshot[0].retracted).toBe(true); expect(saved.last_error).toContain('could not be checked');
  });
  it('honours active leases, recovers expired leases and ignores future schedules', async () => {
    const app = make(); const monitor = await create(app);
    const path = `research_monitors/${monitor.id}`;
    fake.put(path, { ...fake.read(path), lease: 'other-worker', lease_until: new Date(Date.now() + 60000).toISOString() });
    expect((await runMonitor(monitor.id, true)).claimed).toBe(false); expect(state.searchCalls).toBe(0);
    fake.put(path, { ...fake.read(path), lease_until: new Date(Date.now() - 60000).toISOString() });
    expect(await runMonitor(monitor.id, true)).toMatchObject({ claimed: true, status: 'complete' });
    expect((await runMonitor(monitor.id)).claimed).toBe(false);
    expect((await runDueMonitors()).completed).toBe(0);
  });
  it('retains known notices when checks are disabled or later responses omit them', async () => {
    const app = make(); const monitor = await create(app);
    state.notices = [{ doi: '10.1234/retraction', type: 'retraction', date: '2026-11-12' }];
    await runMonitor(monitor.id, true);
    state.notices = [];
    await runMonitor(monitor.id, true);
    const path = `research_monitors/${monitor.id}`;
    expect(fake.read(path)?.snapshot[0]).toMatchObject({ retracted: true, notices: [{ doi: '10.1234/retraction' }] });
    fake.put(path, { ...fake.read(path), retraction_checks: false });
    expect((await runMonitor(monitor.id, true)).status).toBe('complete');
    expect(fake.read(path)?.snapshot[0]).toMatchObject({ retracted: true, notices: [{ doi: '10.1234/retraction' }] });
  });
  it('reports the notice-check limit and retains evidence outside the checked set', async () => {
    const app = make(); const monitor = await create(app);
    state.notices = [{ doi: '10.1234/retraction', type: 'retraction', date: '2026-11-12' }];
    await runMonitor(monitor.id, true);
    state.notices = [];
    state.result.papers = [...Array.from({ length: 25 }, (_, i) => paper(`new${i}`)), paper('a')];
    expect((await runMonitor(monitor.id, true)).status).toBe('partial');
    const saved = fake.read(`research_monitors/${monitor.id}`)!;
    expect(saved.last_error).toContain('25 of 26');
    expect(saved.snapshot.find((item: MonitorSource) => item.doi === '10.1234/a')).toMatchObject({ retracted: true, notices: [{ doi: '10.1234/retraction' }] });
  });
  it('enforces project permissions and prevents removed owners from continuing scheduled sharing', async () => {
    state.roles.set('p:writer', 'edit'); state.roles.set('p:reader', 'view'); state.roles.set('p:supervisor', 'comment');
    const app = make(); const monitor = await create(app, { project_id: 'p' });
    expect((await request(make('outsider'), `/${monitor.id}`)).status).toBe(404);
    expect((await request(make('reader'), `/${monitor.id}/run`, 'POST')).status).toBe(403);
    await runMonitor(monitor.id, true);
    state.result.papers = [...state.result.papers, paper('later')];
    await runMonitor(monitor.id, true);
    const detail = await (await request(make('supervisor'), `/${monitor.id}`)).json();
    const update = detail.runs.find((run: any) => !run.baseline);
    expect((await request(make('reader'), `/${monitor.id}/runs/${update.id}/review`, 'POST', { note: 'No.' })).status).toBe(403);
    expect((await request(make('supervisor'), `/${monitor.id}/runs/${update.id}/review`, 'POST', { note: 'Update inspected.' })).status).toBe(200);
    state.roles.delete('p:writer'); const priorCalls = state.searchCalls;
    expect((await runMonitor(monitor.id, true)).status).toBe('failed'); expect(state.searchCalls).toBe(priorCalls);
    expect((await request(app, `/${monitor.id}`)).status).toBe(404);
  });
  it('rejects unavailable sources and invalid DOI/year filters', async () => {
    const app = make();
    expect((await request(app, '', 'POST', { ...defaultInput, groups: ['web'] })).status).toBe(422);
    expect((await request(app, '', 'POST', { ...defaultInput, tracked_dois: ['not-a-doi'] })).status).toBe(422);
    expect((await request(app, '', 'POST', { ...defaultInput, filters: { fromYear: 2026, toYear: 2020 } })).status).toBe(422);
  });
  it('pauses scheduling and starts a fresh baseline after a query edit while retaining old runs', async () => {
    const app = make(); let monitor = await create(app); await runMonitor(monitor.id, true);
    monitor = await (await request(app, `/${monitor.id}`)).json();
    const changed = await request(app, `/${monitor.id}`, 'PATCH', { ...defaultInput, revision: monitor.revision, query: 'new work requirement', enabled: false });
    expect(changed.status).toBe(200);
    const saved = await changed.json(); expect(saved.last_run_at).toBeNull(); expect(saved.snapshot).toEqual([]);
    expect(saved.next_run_at).toBe('9999-01-01T00:00:00.000Z');
    expect((await (await request(app, `/${monitor.id}`)).json()).runs).toHaveLength(1);
    expect((await runDueMonitors()).completed).toBe(0);
  });
});
