import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

const fake = await vi.hoisted(async () => (await import('./fakeFirestore.js')).createFakeFirestore());
vi.mock('../../lib/server/firebase.js', async (original) => ({ ...(await original<typeof import('../../lib/server/firebase.js')>()), ...fake.module }));

import type { AppVariables, AuthUser } from '../../lib/server/auth.js';
import type { LlmSlot } from '../../lib/server/slots/types.js';
import { projectProgressRoutes } from '../../lib/server/routes/projectProgress.js';
import { forgetRoles, progressDigest } from '../../lib/server/lib/projects.js';
import { creditSummary, forgetPlans } from '../../lib/server/lib/plans.js';

const llm = {
  provider: 'fake',
  complete: vi.fn(async () => ({ text: '## Summary\nI finished the pilot survey.\n\n## Next steps\n- Write the methods.', usage: { inputTokens: 10, outputTokens: 10 } })),
  stream: vi.fn(),
} as unknown as LlmSlot;

const person = (id: string): AuthUser => ({ id, email: `${id}@example.test`, full_name: id, account_id: `account-${id}`, is_admin: false });
const make = (id: string) => {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use('*', async (c, next) => { c.set('user', person(id)); await next(); });
  app.route('/api/projects', projectProgressRoutes({ llm, papers: {} } as any));
  app.onError((error, c) => c.json({ detail: error.message }, error instanceof HTTPException ? error.status : 500));
  return app;
};
const call = (id: string, path: string, method = 'GET', body?: unknown) => make(id).request(`/api/projects/p1/progress${path}`, { method, headers: { 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });

beforeEach(() => {
  fake.clear(); forgetRoles('p1'); forgetPlans(); (llm.complete as any).mockClear();
  fake.put('projects/p1', {
    owner_user_id: 'owner', owner_account_id: 'account-owner', owner_email: 'owner@example.test', name: 'Thesis', description: '',
    members: ['editor', 'other-editor', 'commenter', 'viewer'].map((id, i) => ({ user_id: id, email: `${id}@example.test`, name: id, role: ['edit', 'edit', 'comment', 'view'][i], added_at: new Date() })),
    member_ids: ['owner', 'editor', 'other-editor', 'commenter', 'viewer'], invite_emails: [], created_at: new Date(), updated_at: new Date(),
  });
  for (const id of ['owner', 'editor', 'viewer']) fake.put(`accounts/account-${id}`, { plan: 'free', plan_status: 'none', plan_source: 'default' });
});

describe('progress entries and project roles', () => {
  it('lets editors write, commenters comment and viewers only read', async () => {
    const created = await call('editor', '', 'POST', { date: '2026-11-10', done: 'Finished the pilot survey', blockers: 'Ethics form pending', next: 'Write methods', status: 'at_risk', mood: 4 });
    expect(created.status).toBe(201);
    const entry = await created.json() as any;
    expect(entry).toMatchObject({ date: '2026-11-10', status: 'at_risk', mood: 4, author_user_id: 'editor', comments: [] });

    expect((await call('commenter', '', 'POST', { date: '2026-11-11', done: 'x' })).status).toBe(403);
    expect((await call('viewer', '', 'POST', { date: '2026-11-11', done: 'x' })).status).toBe(403);
    expect((await call('outsider', '')).status).toBe(404);

    expect((await call('commenter', `/${entry.id}/comments`, 'POST', { text: 'Send me the ethics form.' })).status).toBe(201);
    expect((await call('viewer', `/${entry.id}/comments`, 'POST', { text: 'Hi' })).status).toBe(403);

    const read = await (await call('viewer', '')).json() as any;
    expect(read.role).toBe('view');
    expect(read.entries).toHaveLength(1);
    expect(read.entries[0].comments).toEqual([expect.objectContaining({ name: 'commenter', text: 'Send me the ethics form.' })]);
  });

  it('lets an editor change only their own entries, and the owner any', async () => {
    const entry = await (await call('editor', '', 'POST', { date: '2026-11-10', done: 'Draft chapter 2' })).json() as any;
    expect((await call('other-editor', `/${entry.id}`, 'PATCH', { date: '2026-11-10', done: 'Changed' })).status).toBe(403);
    expect((await call('commenter', `/${entry.id}`, 'DELETE')).status).toBe(403);
    expect((await call('editor', `/${entry.id}`, 'PATCH', { date: '2026-11-12', done: 'Draft chapter 2 and 3' })).status).toBe(200);
    expect(fake.read(`projects/p1/progress/${entry.id}`)).toMatchObject({ date: '2026-11-12', done: 'Draft chapter 2 and 3' });
    expect((await call('owner', `/${entry.id}`, 'DELETE')).status).toBe(200);
    expect(fake.read(`projects/p1/progress/${entry.id}`)).toBeUndefined();
  });

  it('removes a comment only for its author or the owner', async () => {
    const entry = await (await call('editor', '', 'POST', { date: '2026-11-10', next: 'Meet supervisor' })).json() as any;
    const comment = await (await call('commenter', `/${entry.id}/comments`, 'POST', { text: 'Thursday works.' })).json() as any;
    expect((await call('editor', `/${entry.id}/comments/${comment.id}`, 'DELETE')).status).toBe(403);
    expect((await call('commenter', `/${entry.id}/comments/${comment.id}`, 'DELETE')).status).toBe(200);
  });

  it('rejects an entry without a date or any content', async () => {
    expect((await call('editor', '', 'POST', { date: 'yesterday', done: 'x' })).status).toBe(422);
    expect((await call('editor', '', 'POST', { date: '2026-11-10', done: '  ' })).status).toBe(422);
  });

  it('lists entries newest first within a period', async () => {
    for (const date of ['2026-10-01', '2026-11-05', '2026-11-12']) await call('editor', '', 'POST', { date, done: `Work on ${date}` });
    const list = await (await call('viewer', '?from=2026-11-01&to=2026-11-30')).json() as any;
    expect(list.entries.map((entry: any) => entry.date)).toEqual(['2026-11-12', '2026-11-05']);
  });
});

describe('Summarise for my supervisor', () => {
  it('charges CREDIT_COSTS.short, uses only the period, and saves to the project and History', async () => {
    await call('editor', '', 'POST', { date: '2026-10-01', done: 'Old work outside the period' });
    await call('editor', '', 'POST', { date: '2026-11-05', done: 'Finished the pilot survey', blockers: 'Ethics form' });
    const response = await call('owner', '/summary', 'POST', { from: '2026-11-01', to: '2026-11-30' });
    expect(response.status).toBe(200);
    const body = await response.json() as any;
    expect(body.credits).toBe(1);
    expect(body.summary).toMatchObject({ from: '2026-11-01', to: '2026-11-30', entries: 1, markdown: expect.stringContaining('pilot survey') });
    const prompt = (llm.complete as any).mock.calls[0][0].messages[1].content as string;
    expect(prompt).toContain('Finished the pilot survey');
    expect(prompt).not.toContain('Old work outside the period');
    expect((await creditSummary('account-owner')).used).toBe(1);
    expect(fake.read(`tasks/${body.task_id}`)).toMatchObject({ kind: 'tool', module: 'progress-summary', project_id: 'p1', status: 'done' });
    const listed = await (await call('viewer', '')).json() as any;
    expect(listed.summaries).toHaveLength(1);
  });

  it('refuses an empty period and refunds when the model fails', async () => {
    expect((await call('owner', '/summary', 'POST', { from: '2026-01-01', to: '2026-01-31' })).status).toBe(422);
    await call('editor', '', 'POST', { date: '2026-11-05', done: 'Something' });
    (llm.complete as any).mockRejectedValueOnce(new Error('down'));
    expect((await call('owner', '/summary', 'POST', { from: '2026-11-01', to: '2026-11-30' })).status).toBe(503);
    expect((await creditSummary('account-owner')).used).toBe(0);
  });

  it('writes a plain digest of the entries, oldest first', () => {
    const digest = progressDigest([
      { date: '2026-11-12', done: 'B', blockers: '', next: 'C', status: 'blocked', mood: 2, author_name: 'Ana', comments: [{ id: 'c', user_id: 'u', name: 'Prof', text: 'OK', at: new Date() }] },
      { date: '2026-11-01', done: 'A', blockers: '', next: '', status: null, mood: null, author_name: 'Ana', comments: [] },
    ]);
    expect(digest).toBe('## 2026-11-01 (Ana)\nDone: A\n\n## 2026-11-12 (Ana) · status: blocked · mood 2/5\nDone: B\nNext: C\nComment from Prof: OK');
  });
});
