import { beforeEach, describe, expect, it, vi } from 'vitest';

const fake = await vi.hoisted(async () => (await import('./fakeFirestore.js')).createFakeFirestore());
vi.mock('../../lib/server/firebase.js', async (original) => ({ ...(await original<typeof import('../../lib/server/firebase.js')>()), ...fake.module }));
vi.mock('../../lib/server/env.js', async (original) => {
  const real = await original<typeof import('../../lib/server/env.js')>();
  return { ...real, env: { ...real.env, researchJobsEnabled: true } };
});
const auth = vi.hoisted(() => ({ user: { id: 'user-1', email: 'a@example.edu', full_name: 'A', account_id: 'acc-1', is_admin: false } }));
vi.mock('../../lib/server/auth.js', async () => {
  const { createMiddleware } = await import('hono/factory');
  return { requireUser: createMiddleware(async (c, next) => { c.set('user', auth.user); await next(); }) };
});
// enqueue: `commits` decides whether the job document is written before the (ambiguous) failure.
const enqueue = vi.hoisted(() => ({ commits: false }));
vi.mock('../../lib/server/lib/researchJobs.js', async (original) => {
  const real = await original<typeof import('../../lib/server/lib/researchJobs.js')>();
  const { col } = await import('../../lib/server/firebase.js');
  return {
    ...real,
    enqueueResearch: async (_user: unknown, taskId: string) => {
      if (enqueue.commits) await col(real.RESEARCH_JOBS).doc(taskId).set({ task_id: taskId, status: 'queued', refunded: false });
      throw new Error('deadline exceeded');
    },
  };
});

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { researchRoutes } from '../../lib/server/routes/research.js';
import { creditSummary, forgetPlans } from '../../lib/server/lib/plans.js';
import type { Slots } from '../../lib/server/slots/types.js';

const slots = { llm: { provider: 'fake', complete: vi.fn(), stream: vi.fn() }, papers: { provider: 'fake' } } as unknown as Slots;
const app = new Hono();
app.route('/api', researchRoutes(slots));
app.onError((error, c) => (error instanceof HTTPException ? c.json({ detail: error.message }, error.status) : c.json({ detail: String(error) }, 500)));
const start = () => app.request('/api/research', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ question: 'Does sleep improve recall?', depth: 'summary', background: true }),
});
const taskOf = () => [...fake.store.entries()].find(([path]) => /^tasks\/[^/]+$/.test(path))?.[1];

beforeEach(() => {
  fake.clear();
  fake.put('accounts/acc-1', { plan: 'free', plan_status: 'none', plan_source: 'default' });
  fake.put('users/user-1', { email: auth.user.email, full_name: 'A', account_id: 'acc-1' });
  forgetPlans();
});

describe('ambiguous background enqueue', () => {
  it('refunds and fails the task when no job was created', async () => {
    enqueue.commits = false;
    const before = (await creditSummary('acc-1')).used;
    const response = await start();
    expect(response.status).toBe(500);
    expect(taskOf()).toMatchObject({ status: 'failed' });
    expect((await creditSummary('acc-1')).used).toBe(before);
  });
  it('keeps the charge with the job when create() committed but reported an error', async () => {
    enqueue.commits = true;
    const before = (await creditSummary('acc-1')).used;
    const response = await start();
    expect(response.status).toBe(202);
    expect(taskOf()).toMatchObject({ status: 'running' });
    expect((await creditSummary('acc-1')).used).toBeGreaterThan(before);
  });
});
