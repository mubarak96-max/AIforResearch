import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
const fake = await vi.hoisted(async () => (await import('./fakeFirestore.js')).createFakeFirestore());
vi.mock('../../lib/server/firebase.js', async (original) => ({ ...(await original<typeof import('../../lib/server/firebase.js')>()), ...fake.module,
  getMany: async (collection: string, ids: string[]) => ids.flatMap((id) => { const data = fake.read(`${collection}/${id}`); return data ? [{ id, ...data }] : []; }),
}));
import { matrixRoutes } from '../../lib/server/routes/matrix.js';
import { saveMatrixFill } from '../../lib/server/lib/matrix.js';
import type { AppVariables } from '../../lib/server/auth.js';
import type { Slots } from '../../lib/server/slots/types.js';
const sourceId = '11111111-1111-4111-8111-111111111111';
const make = (id = 'owner') => {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use('*', async (c, next) => { c.set('user', { id, email: `${id}@example.test`, full_name: id, account_id: `account-${id}`, is_admin: false }); await next(); });
  app.route('/api/matrices', matrixRoutes({} as Slots));
  app.onError((e, c) => c.json({ detail: e.message }, e instanceof HTTPException ? e.status : 500));
  return app;
};
const request = (path: string, method = 'GET', body?: unknown, actor = 'owner') => make(actor).request(`/api/matrices${path}`, { method, headers: { 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
beforeEach(() => { fake.clear(); fake.put(`library_documents/${sourceId}`, { user_id: 'owner', title: 'Saved source' }); });

describe('matrix structure and source audit', () => {
  it('exports title/column/source decisions and the removed row evidence without rewriting earlier events', async () => {
    const created = await request('', 'POST', { title: 'Before', columns: [{ label: 'Finding' }] });
    expect(created.status).toBe(201); const matrix = await created.json() as any;
    const findingId = matrix.columns[0].id;
    expect((await request(`/${matrix.id}/papers`, 'POST', { document_ids: [sourceId] })).status).toBe(200);
    expect((await request(`/${matrix.id}`, 'PATCH', { title: 'After', columns: [{ id: findingId, label: 'Finding', prompt: 'Read the finding' }, { label: 'Limitations' }] })).status).toBe(200);
    await saveMatrixFill(matrix.id, 'owner', sourceId, [findingId], { [findingId]: { value: '24 participants', quote: 'We interviewed 24 participants.', page: 7, status: 'done', basis: 'full_text', edited: false, updated_at: new Date() } });
    const firstUpdate = [...fake.store.values()].find((entry) => entry.action === 'matrix_updated');
    const unchangedEvent = JSON.stringify(firstUpdate);
    expect((await request(`/${matrix.id}`, 'PATCH', { columns: [{ label: 'Different question' }] })).status).toBe(200);
    expect((await request(`/${matrix.id}/papers/${sourceId}`, 'DELETE')).status).toBe(200);
    expect(fake.read(`review_matrices/${matrix.id}/rows/${sourceId}`)).toBeUndefined();
    const response = await request(`/${matrix.id}/export`); expect(response.status).toBe(200);
    const bundle = await response.json() as any;
    expect(bundle.events.find((event: any) => event.action === 'created').after.title).toBe('Before');
    expect(bundle.events.find((event: any) => event.action === 'sources_added')).toMatchObject({ by: 'owner', document_ids: [sourceId], before: { document_ids: [] }, after: { document_ids: [sourceId] } });
    const updates = bundle.events.filter((event: any) => event.action === 'matrix_updated');
    expect(updates).toHaveLength(2);
    expect(updates[0]).toMatchObject({ before: { title: 'Before' }, after: { title: 'After' } });
    expect(updates[1].before.columns).toHaveLength(2);
    expect(updates[1].after.columns[0].label).toBe('Different question');
    expect(bundle.events.find((event: any) => event.action === 'source_removed')).toMatchObject({ by: 'owner', document_id: sourceId, before: { cells: { [findingId]: { quote: 'We interviewed 24 participants.', page: 7 } } }, after: { document_ids: [] } });
    expect(JSON.stringify(firstUpdate)).toBe(unchangedEvent);
    expect((await request(`/${matrix.id}/export`, 'GET', undefined, 'outsider')).status).toBe(404);
  });

  it('does not add misleading change events for no-op or refused edits', async () => {
    const matrix = await (await request('', 'POST', { title: 'Same', document_ids: [sourceId] })).json() as any;
    expect((await request(`/${matrix.id}`, 'PATCH', { title: 'Same' })).status).toBe(200);
    expect((await request(`/${matrix.id}/papers`, 'POST', { document_ids: [sourceId] })).status).toBe(200);
    expect((await request(`/${matrix.id}`, 'PATCH', { title: 'Unauthorized' }, 'outsider')).status).toBe(404);
    const bundle = await (await request(`/${matrix.id}/export`)).json() as any;
    expect(bundle.events.map((event: any) => event.action)).toEqual(['created']);
    expect(bundle.matrix.title).toBe('Same');
  });
});
