import { beforeEach, describe, expect, it, vi } from 'vitest';

const fake = await vi.hoisted(async () => (await import('./fakeFirestore.js')).createFakeFirestore());
vi.mock('../../lib/server/firebase.js', async (original) => ({ ...(await original<typeof import('../../lib/server/firebase.js')>()), ...fake.module }));

// Who is signed in, per test.
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

// The scholarly services: two papers for any search.
const search = vi.hoisted(() => ({ fail: false }));
vi.mock('../../lib/server/lib/sources/index.js', async (original) => {
  const real = await original<typeof import('../../lib/server/lib/sources/index.js')>();
  const paper = (id: string, title: string, abstract: string) => ({ ...real.emptyPaper(id, 'openalex'), title, abstract, year: 2020, doi: `10.1234/${id.toLowerCase()}`, authors: [{ name: 'Jane Smith' }] });
  return {
    ...real,
    unpaywall: async () => null,
    semanticScholarLinks: async () => [],
    // Crossref: both DOIs exist; the second paper has been retracted.
    crossrefWork: async (doi: string) => ({ doi, title: doi.endsWith('w1') ? 'Sleep improves recall' : 'Napping and memory', authors: [], year: 2020, container: null, type: 'journal-article' }),
    crossrefUpdates: async (doi: string) => (doi.endsWith('w2') ? [{ doi: '10.1/notice', type: 'retraction', date: '2024-01-02', source: 'retraction-watch' }] : []),
    searchSources: async () => {
      if (search.fail) return { papers: [], web: [], counts: {}, errors: [] };
      return { papers: [paper('W1', 'Sleep improves recall', 'Recall was better after sleep.'), paper('W2', 'Napping and memory', 'Naps helped memory.')], web: [], counts: { openalex: 2 }, errors: [] };
    },
  };
});

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { researchRoutes } from '../../lib/server/routes/research.js';
import { PlanLimitError, creditSummary, forgetPlans } from '../../lib/server/lib/plans.js';
import type { Slots } from '../../lib/server/slots/types.js';

const answer = 'Sleep after learning improves recall [S1]. Naps help too [S2]. An invented one [S9].';
const llm = {
  provider: 'fake',
  complete: vi.fn(async (input: { messages: { content: string }[] }) => {
    const system = input.messages[0].content;
    const user = input.messages[1]?.content ?? '';
    const ids = (key: string) => [...user.matchAll(new RegExp(`^${key}=(\\d+)`, 'gm'))].map((match) => Number(match[1]));
    const json = (value: unknown) => ({ text: JSON.stringify(value), usage: { inputTokens: 10, outputTokens: 5 } });
    if (system.includes('You plan literature reviews')) return json({ sub_questions: [{ question: 'Does sleep improve recall?', queries: ['sleep recall'] }, { question: 'Do naps help memory?', queries: ['nap memory'] }, { question: 'Who benefits most?', queries: ['sleep memory age'] }] });
    if (system.includes('You screen papers')) return json({ items: ids('i').map((i) => ({ i, r: 3 })) });
    if (system.includes('You extract evidence')) return json({ items: [{ n: 1, stance: 'supports', finding: 'Better recall after sleep.', sample: '40 students', limits: 'Small sample' }, { n: 2, stance: 'supports', finding: 'Naps helped.', sample: null, limits: null }] });
    if (system.includes('You check citations')) return json({ items: ids('i').map((i) => (user.includes(`i=${i}: Naps`) ? { i, v: 'partly', note: 'One small study of naps.' } : { i, v: 'yes' })) });
    if (system.includes('You correct sentences')) return json({ items: [{ i: 0, text: 'One small study found naps may help memory [S2].' }] });
    if (system.includes('You add section headings')) return { text: '{"headings":[{"before":0,"level":2,"text":"Summary [S1]"},{"before":7,"level":2,"text":"Out of range"}]}', usage: { inputTokens: 10, outputTokens: 5 } };
    if (system.includes('You plan literature searches')) return { text: '{"queries":["sleep recall","nap memory"]}', usage: { inputTokens: 10, outputTokens: 5 } };
    return { text: 'A follow-up answer [S1].', usage: { inputTokens: 10, outputTokens: 5 } };
  }),
  stream: vi.fn(async (_input: unknown, onDelta: (text: string) => void) => {
    onDelta(answer.slice(0, 30));
    onDelta(answer.slice(30));
    return { text: answer, usage: { inputTokens: 100, outputTokens: 40 } };
  }),
};
const slots = { llm, papers: { provider: 'fake' } } as unknown as Slots;

const app = new Hono();
app.route('/api', researchRoutes(slots));
app.onError((error, c) => {
  if (error instanceof PlanLimitError) return c.json({ detail: error.message, code: 'plan_limit', limit: error.key }, 402);
  if (error instanceof HTTPException) return c.json({ detail: error.message }, error.status);
  return c.json({ detail: String(error) }, 500);
});

const ME = { id: 'user-1', email: 'amina@example.edu', full_name: 'Amina Njeri', account_id: 'acc-1', is_admin: false };
const call = (path: string, init: { method?: string; body?: unknown } = {}) =>
  app.request(path, { method: init.method ?? 'GET', body: init.body === undefined ? undefined : JSON.stringify(init.body), headers: { 'content-type': 'application/json' } });

/** The events of an SSE answer, in order. */
async function events(response: Response) {
  const text = await response.text();
  if (!text.startsWith('event:')) throw new Error(`not a stream (${response.status}): ${text}`);
  return text.split('\n\n').filter(Boolean).map((chunk) => ({ event: chunk.match(/^event: (.+)$/m)![1], data: JSON.parse(chunk.match(/^data: (.+)$/m)![1]) }));
}

// No real network in these tests.
globalThis.fetch = (async (input: unknown) => { throw new TypeError(`unexpected fetch: ${String(input)}`); }) as typeof fetch;
beforeEach(() => {
  fake.clear();
  fake.put('accounts/acc-1', { plan: 'free', plan_status: 'none', plan_source: 'default' });
  fake.put('users/user-1', { email: ME.email, full_name: ME.full_name, account_id: 'acc-1' });
  auth.user = ME;
  search.fail = false;
  forgetPlans();
  llm.stream.mockClear();
});

describe('Deep Research', () => {
  it('needs a sign-in', async () => {
    auth.user = null;
    expect((await call('/api/research', { method: 'POST', body: { question: 'Does sleep help memory?' } })).status).toBe(401);
  });

  it('runs the seven steps, drops invented citations, narrows an overstated claim, flags a retraction, saves the task and charges 7 credits', async () => {
    const response = await call('/api/research', { method: 'POST', body: { question: 'Does sleep after learning improve memory?', depth: 'deep' } });
    const list = await events(response);
    expect(list.map((item) => (item.event === 'step' ? `${item.data.id}:${item.data.state}` : item.event))).toEqual([
      'task', 'plan:active', 'plan:done', 'search:active', 'search:done', 'screen:active', 'screen:done', 'rank:active', 'rank:done', 'sources',
      'read:active', 'read:done', 'sources', 'write:active', 'delta', 'delta', 'write:done', 'verify:active', 'verify:done', 'done',
    ]);
    const step = (id: string) => list.find((item) => item.event === 'step' && item.data.id === id && item.data.state === 'done')!.data;
    expect(step('plan').data.sub_questions).toHaveLength(3);
    // 4 searches (the question and one per sub-question) each return the same 2 papers.
    expect(step('search').data).toMatchObject({ found: 8, unique: 2, duplicates: 6, queries: ['Does sleep after learning improve memory?', 'sleep recall', 'nap memory', 'sleep memory age'] });
    expect(step('screen').data).toMatchObject({ screened: 2, kept: 2, excluded: 0 });
    expect(step('read').data).toMatchObject({ read: 2, stances: { supports: 2 } });

    const done = list.at(-1)!.data;
    expect(done.markdown).toBe('Sleep after learning improves recall [S1]. One small study found naps may help memory [S2]. An invented one.');
    expect(done.sources.map((source: { marker: string; stance: string; check: { status: string } }) => [source.marker, source.stance, source.check.status])).toEqual([['S1', 'supports', 'confirmed'], ['S2', 'supports', 'retracted']]);
    expect(done.sources[0]).toMatchObject({ sample: '40 students', limits: 'Small sample', relevance: 3 });
    expect(done.verification).toMatchObject({
      claims: { checked: 2, supported: 1, partly: 1, revised: 1 }, references: { checked: 2, confirmed: 1, retracted: 1 }, dropped_markers: 1,
      flags: [{ kind: 'revised', text: 'Naps help too [S2].', revised: 'One small study found naps may help memory [S2].' }, { kind: 'retracted', n: 2 }],
    });
    expect(done.steps.map((item: { state: string }) => item.state)).toEqual(Array(7).fill('done'));
    expect(done.consensus).toMatchObject({ applicable: true, line: '2 of 2 studies that test the question support it.' });
    expect((await creditSummary('acc-1')).used).toBe(7);
    const task = await (await call(`/api/history/${done.task_id}`)).json();
    expect(task).toMatchObject({ kind: 'research', module: 'deep', status: 'done', credits: 7, title: 'Does sleep after learning improve memory?' });
    expect(task.result.steps).toHaveLength(7);
    expect(task.result.verification.claims.revised).toBe(1);
  });

  it('plans a Detailed report for free and runs the plan the person edited', async () => {
    expect((await call('/api/research/plan', { method: 'POST', body: { question: 'Does sleep help memory?' } })).status).toBe(402);
    fake.put('accounts/acc-1', { plan: 'plus', plan_status: 'active', plan_source: 'dodo' });
    forgetPlans();
    const plan = await (await call('/api/research/plan', { method: 'POST', body: { question: 'Does sleep help memory?' } })).json();
    expect(plan.sub_questions).toHaveLength(3);
    expect((await creditSummary('acc-1')).used).toBe(0);

    const edited = { sub_questions: [plan.sub_questions[0], { question: 'Does sleep help older adults remember?', queries: [] }] };
    const list = await events(await call('/api/research', { method: 'POST', body: { question: 'Does sleep help memory?', depth: 'detailed', plan: edited } }));
    const planStep = list.find((item) => item.event === 'step' && item.data.id === 'plan' && item.data.state === 'done')!.data;
    expect(planStep.data.reviewed).toBe(true);
    expect(planStep.data.sub_questions.map((sub: { question: string }) => sub.question)).toEqual(['Does sleep improve recall?', 'Does sleep help older adults remember?']);
    // An edited sub-question without searches gets keywords from its wording.
    expect(planStep.data.sub_questions[1].queries[0]).toMatch(/sleep/);
    expect(list.at(-1)!.event).toBe('done');
    expect((await creditSummary('acc-1')).used).toBe(25);
  });

  it('refunds the credits and marks the task failed when nothing is found', async () => {
    search.fail = true;
    const list = await events(await call('/api/research', { method: 'POST', body: { question: 'An obscure question', depth: 'summary' } }));
    expect(list.at(-1)).toMatchObject({ event: 'error', data: { status: 422 } });
    expect((await creditSummary('acc-1')).used).toBe(0);
    const { tasks } = await (await call('/api/history')).json();
    expect(tasks[0]).toMatchObject({ status: 'failed', credits: 0 });
  });

  it('keeps Detailed and High quality for the plans that include them', async () => {
    const detailed = await call('/api/research', { method: 'POST', body: { question: 'Does sleep help memory?', depth: 'detailed' } });
    expect(detailed.status).toBe(402);
    expect(await detailed.json()).toMatchObject({ limit: 'detailed_mode' });
    fake.put('accounts/acc-1', { plan: 'plus', plan_status: 'active', plan_source: 'dodo' });
    forgetPlans();
    expect((await call('/api/research', { method: 'POST', body: { question: 'Does sleep help memory?', depth: 'deep', high_quality: true } })).status).toBe(402);
    const ok = await call('/api/research', { method: 'POST', body: { question: 'Does sleep help memory?', depth: 'detailed' } });
    expect(ok.status).toBe(200);
    await events(ok);
    expect((await creditSummary('acc-1')).used).toBe(25);
  });

  it('refuses a job when the credits are not enough, before any work', async () => {
    fake.put('accounts/acc-1/plan_usage/credits__' + new Date().toISOString().slice(0, 7), { key: 'credits', amount: 28 });
    const response = await call('/api/research', { method: 'POST', body: { question: 'Does sleep help memory?', depth: 'deep' } });
    expect(response.status).toBe(402);
    expect(llm.stream).not.toHaveBeenCalled();
  });

  it('answers follow-ups from the same sources for 1 credit', async () => {
    const done = (await events(await call('/api/research', { method: 'POST', body: { question: 'Does sleep help memory?', depth: 'summary' } }))).at(-1)!.data;
    const response = await call(`/api/research/${done.task_id}/follow-up`, { method: 'POST', body: { question: 'What about naps?' } });
    expect(await response.json()).toMatchObject({ answer: 'A follow-up answer [S1].', follow_ups: [{ question: 'What about naps?' }] });
    expect((await creditSummary('acc-1')).used).toBe(2);
  });

  it('turns headings on (1 credit, text unchanged) and off and on again (free, from the saved copies)', async () => {
    const done = (await events(await call('/api/research', { method: 'POST', body: { question: 'Does sleep help memory?', depth: 'summary', headings: false } }))).at(-1)!.data;
    const toggle = async (headings: boolean) => (await call(`/api/research/${done.task_id}/headings`, { method: 'POST', body: { headings } })).json();
    const on = await toggle(true);
    expect(on).toMatchObject({ headings: true, headed_copy: true, credits: 1 });
    expect(on.markdown).toBe(`## Summary

${done.markdown}`);
    expect((await creditSummary('acc-1')).used).toBe(2);
    expect(await toggle(false)).toMatchObject({ markdown: done.markdown, headings: false, headed_copy: true, credits: 0 });
    expect(await toggle(true)).toMatchObject({ markdown: on.markdown, credits: 0 });
    expect((await creditSummary('acc-1')).used).toBe(2);
    expect((await (await call(`/api/history/${done.task_id}`)).json()).result.markdown).toBe(on.markdown);
  });
});

describe('History and projects', () => {
  it('lists, stars and deletes tasks; other people cannot read them', async () => {
    const done = (await events(await call('/api/research', { method: 'POST', body: { question: 'Does sleep help memory?', depth: 'summary' } }))).at(-1)!.data;
    expect((await call(`/api/history/${done.task_id}`, { method: 'PATCH', body: { starred: true } })).status).toBe(200);
    expect((await (await call('/api/history')).json()).tasks[0]).toMatchObject({ starred: true });
    auth.user = { ...ME, id: 'user-2', email: 'other@example.com', account_id: 'acc-2' };
    expect((await call(`/api/history/${done.task_id}`)).status).toBe(404);
    auth.user = ME;
    expect((await call(`/api/history/${done.task_id}`, { method: 'DELETE' })).status).toBe(200);
    expect((await (await call('/api/history')).json()).tasks).toHaveLength(0);
  });

  it('shares a project: an invited supervisor sees its work, read-only; Free allows one project and one person', async () => {
    const project = await (await call('/api/projects', { method: 'POST', body: { name: 'MSc thesis' } })).json();
    expect((await call('/api/projects', { method: 'POST', body: { name: 'Second' } })).status).toBe(402);
    fake.put('users/user-2', { email: 'supervisor@uni.edu', full_name: 'Dr. Lindqvist', account_id: 'acc-2' });
    const shared = await (await call(`/api/projects/${project.id}/members`, { method: 'POST', body: { email: 'Supervisor@uni.edu', role: 'comment' } })).json();
    expect(shared.members).toEqual([{ email: 'supervisor@uni.edu', name: 'Dr. Lindqvist', role: 'comment', pending: false }]);
    expect((await call(`/api/projects/${project.id}/members`, { method: 'POST', body: { email: 'third@uni.edu' } })).status).toBe(402);

    const done = (await events(await call('/api/research', { method: 'POST', body: { question: 'Does sleep help memory?', depth: 'summary', project_id: project.id } }))).at(-1)!.data;
    auth.user = { ...ME, id: 'user-2', email: 'supervisor@uni.edu', account_id: 'acc-2' };
    const seen = await (await call(`/api/projects/${project.id}`)).json();
    expect(seen).toMatchObject({ role: 'comment', tasks: [{ id: done.task_id }] });
    expect((await call(`/api/history/${done.task_id}`)).status).toBe(200);
    expect((await call(`/api/history/${done.task_id}`, { method: 'DELETE' })).status).toBe(404);
    expect((await call('/api/research', { method: 'POST', body: { question: 'Can I add work?', project_id: project.id } })).status).toBe(403);
  });
});
