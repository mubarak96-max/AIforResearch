import { beforeEach, describe, expect, it, vi } from 'vitest';

const fake = await vi.hoisted(async () => (await import('./fakeFirestore.js')).createFakeFirestore());
vi.mock('../../lib/server/firebase.js', async (original) => ({ ...(await original<typeof import('../../lib/server/firebase.js')>()), ...fake.module }));
vi.mock('../../lib/server/usage.js', () => ({ recordUsage: async () => undefined }));

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppVariables } from '../../lib/server/auth.js';
import { forgetPlans } from '../../lib/server/lib/plans.js';
import { systematicReviewRoutes } from '../../lib/server/routes/systematicReview.js';
import { USER, fakeLlm, fakePapers } from './assist-helpers.js';

describe('meta-analyses on a review', () => {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use('*', async (c, next) => { c.set('user', USER); await next(); });
  app.route('/api/systematic-reviews', systematicReviewRoutes({ llm: fakeLlm(''), papers: fakePapers() }));
  app.onError((caught, c) => (caught instanceof HTTPException ? c.json({ detail: caught.message }, caught.status) : c.json({ detail: String(caught) }, 500)));
  const json = (path: string, method = 'GET', body?: unknown) =>
    app.request(path, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });

  beforeEach(() => { fake.clear(); forgetPlans(); });

  it('creates, saves with a base revision, refuses stale saves, records audit events and deletes', async () => {
    const { id } = await (await json('/api/systematic-reviews', 'POST', { title: 'BCG' })).json();
    const base = `/api/systematic-reviews/${id}/analyses`;
    const created = await json(base, 'POST', { outcome: 'Tuberculosis', data_type: 'binary', measure: 'RR', model: 'random', method: 'REML' });
    expect(created.status).toBe(201);
    const { analysis } = await created.json();
    expect(analysis).toMatchObject({ outcome: 'Tuberculosis', revision: 1, rows: [], grade: { design: 'randomised', downgrade: { imprecision: { level: 0 } } }, favours: { left: 'Favours intervention' } });

    const rows = [{ record_id: null, label: 'Aronson 1948', subgroup: ' random ', e1: 4, n1: 123, e2: 11, n2: 139 }];
    const saved = await (await json(`${base}/${analysis.id}`, 'PUT', { ...analysis, rows, hksj: true, base_revision: 1 })).json();
    expect(saved.analysis).toMatchObject({ revision: 2, hksj: true, rows: [{ label: 'Aronson 1948', subgroup: 'random', e1: 4 }] });
    expect((await json(`${base}/${analysis.id}`, 'PUT', { ...analysis, base_revision: 1 })).status).toBe(409);

    // HKSJ is only kept for random effects; MH only for events and totals.
    const fixed = await (await json(`${base}/${analysis.id}`, 'PUT', { ...analysis, model: 'fixed', method: 'MH', hksj: true, base_revision: 2 })).json();
    expect(fixed.analysis).toMatchObject({ model: 'fixed', method: 'MH', hksj: false });
    expect((await json(base, 'POST', { outcome: 'Pain', data_type: 'continuous', measure: 'RR' })).status).toBe(422);
    expect((await json(base, 'POST', { outcome: 'Pain', data_type: 'continuous', measure: 'MD', model: 'fixed', method: 'MH' })).status).toBe(422);
    expect((await json(base, 'POST', { outcome: 'Pain', data_type: 'continuous', measure: 'MD', model: 'random', method: 'IV' })).status).toBe(422);

    const listed = await (await json(base)).json();
    expect(listed).toMatchObject({ row_limit: 50, max_analyses: 30 });
    expect(listed.analyses).toHaveLength(1);

    expect((await json(`${base}/${analysis.id}`, 'DELETE')).status).toBe(200);
    expect((await (await json(base)).json()).analyses).toHaveLength(0);
    const audit = (await (await json(`/api/systematic-reviews/${id}/audit`)).json()).events.map((event: any) => event.action);
    expect(audit.filter((action: string) => action.startsWith('analysis_')).sort()).toEqual(['analysis_created', 'analysis_deleted', 'analysis_updated', 'analysis_updated']);
  });

  it('caps the Free plan at 50 studies per analysis', async () => {
    const { id } = await (await json('/api/systematic-reviews', 'POST', { title: 'Big' })).json();
    const rows = Array.from({ length: 51 }, (_, index) => ({ record_id: null, label: `S${index}`, est: 1, se: 0.1 }));
    const response = await json(`/api/systematic-reviews/${id}/analyses`, 'POST', { outcome: 'Mortality', data_type: 'generic', measure: 'HR', rows });
    expect(response.status).toBe(402);
  });
});
