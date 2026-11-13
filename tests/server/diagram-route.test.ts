import { beforeEach, describe, expect, it, vi } from 'vitest';

const fake = await vi.hoisted(async () => (await import('./fakeFirestore.js')).createFakeFirestore());
vi.mock('../../lib/server/firebase.js', async (original) => ({ ...(await original<typeof import('../../lib/server/firebase.js')>()), ...fake.module }));

const auth = vi.hoisted(() => ({ user: null as null | { id: string; email: string; full_name: string | null; account_id: string; is_admin: boolean } }));
vi.mock('../../lib/server/auth.js', async () => {
  const { createMiddleware } = await import('hono/factory');
  const { HTTPException } = await import('hono/http-exception');
  return {
    requireUser: createMiddleware(async (c, next) => {
      if (!auth.user) throw new HTTPException(401, { message: 'Sign in' });
      c.set('user', auth.user);
      await next();
    }),
  };
});

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { diagramRoutes } from '../../lib/server/routes/diagram.js';
import { PlanLimitError, creditSummary, forgetPlans } from '../../lib/server/lib/plans.js';
import type { Slots } from '../../lib/server/slots/types.js';

const answers: string[] = [];
const llm = { provider: 'fake', complete: vi.fn(async () => ({ text: answers.shift() ?? '', usage: { inputTokens: 10, outputTokens: 5 } })) };
const app = new Hono();
app.route('/api/ai-editor/diagram', diagramRoutes({ llm, papers: { provider: 'fake' } } as unknown as Slots));
app.onError((error, c) => {
  if (error instanceof PlanLimitError) return c.json({ detail: error.message }, 402);
  if (error instanceof HTTPException) return c.json({ detail: error.message }, error.status);
  return c.json({ detail: String(error) }, 500);
});
const draw = (body: unknown) => app.request('/api/ai-editor/diagram', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });
const used = async () => (await creditSummary('acc-1')).used;

beforeEach(() => {
  fake.clear();
  fake.put('accounts/acc-1', { plan: 'free', plan_status: 'none', plan_source: 'default' });
  auth.user = { id: 'user-1', email: 'a@example.edu', full_name: null, account_id: 'acc-1', is_admin: false };
  forgetPlans();
  answers.length = 0;
  llm.complete.mockClear();
});

describe('Draw with AI route', () => {
  it('returns cleaned Mermaid source for 1 credit', async () => {
    answers.push('```mermaid\nflowchart TD\n  A["Start"] --> B["End"]\n```');
    const response = await draw({ prompt: 'A two-step process', kind: 'flowchart' });
    expect(response.status).toBe(200);
    expect((await response.json()).source).toBe('flowchart TD\n  A["Start"] --> B["End"]');
    expect(await used()).toBe(1);
  });

  it('retries once, then gives the credit back when no diagram comes back', async () => {
    answers.push('Sorry, I cannot.', 'Still no.');
    const response = await draw({ prompt: 'Something odd', kind: 'timeline' });
    expect(response.status).toBe(422);
    expect(llm.complete).toHaveBeenCalledTimes(2);
    expect(await used()).toBe(0);
  });

  it('checks the request', async () => {
    expect((await draw({ prompt: 'x' })).status).toBe(422);
    expect((await draw({ prompt: 'A flow', kind: 'pie-chart' })).status).toBe(422);
    expect(llm.complete).not.toHaveBeenCalled();
  });
});
