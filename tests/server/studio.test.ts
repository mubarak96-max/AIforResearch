import { beforeEach, describe, expect, it, vi } from 'vitest';

const fake = await vi.hoisted(async () => (await import('./fakeFirestore.js')).createFakeFirestore());
vi.mock('../../lib/server/firebase.js', async (original) => ({ ...(await original<typeof import('../../lib/server/firebase.js')>()), ...fake.module }));
vi.mock('../../lib/server/usage.js', () => ({ recordUsage: vi.fn(async () => undefined) }));
vi.mock('../../lib/server/lib/users.js', () => ({
  activeUser: async () => null, ensureUser: async () => null,
  researchProfile: async () => ({ role: 'masters', field: 'psychology', citation_style: null, language: null }),
}));

const search = vi.hoisted(() => ({ calls: [] as any[], papers: [] as any[] }));
vi.mock('../../lib/server/lib/sources/index.js', async (original) => {
  const real = await original<typeof import('../../lib/server/lib/sources/index.js')>();
  return {
    ...real,
    searchSources: vi.fn(async (input: any) => { search.calls.push(input); return { papers: search.papers, web: [], counts: { openalex: search.papers.length }, errors: [] }; }),
    semanticScholarSimilar: vi.fn(async () => []),
  };
});
vi.mock('../../lib/server/lib/sources/providers.js', async (original) => ({
  ...(await original<typeof import('../../lib/server/lib/sources/providers.js')>()),
  searchSemanticScholar: vi.fn(async () => []),
}));

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { PlanLimitError, creditSummary, forgetPlans } from '../../lib/server/lib/plans.js';
import { studioRoutes, checkInputs, taskTitle } from '../../lib/server/routes/studio.js';
import { STUDIO_MODULES, studioCredits, studioModule, rewriteUnits, workspaceModules } from '../../lib/server/lib/studioCatalog.js';
import { batches, buildStudioPrompt, cleanDeck, hasStudioPrompt, paragraphsOf } from '../../lib/server/lib/studioModules.js';
import { CREDIT_COSTS } from '../../lib/server/lib/plans.js';
import { emptyPaper } from '../../lib/server/lib/sources/types.js';
import { fakeLlm, USER } from './assist-helpers.js';
import type { LlmSlot } from '../../lib/server/slots/types.js';
import { wordDiff } from '../../components/app/studio/diff.js';

const ACCOUNT = USER.account_id;

function app(llm: LlmSlot) {
  const hono = new Hono<{ Variables: { user: typeof USER } }>();
  hono.use('*', async (c, next) => { c.set('user', USER); await next(); });
  hono.route('/api/studio', studioRoutes({ llm, papers: {} as any }) as any);
  hono.onError((error, c) => {
    if (error instanceof PlanLimitError) return c.json({ detail: error.message, code: 'plan_limit', limit: error.key }, 402);
    if (error instanceof HTTPException) return c.json({ detail: error.message }, error.status);
    return c.json({ detail: String(error) }, 500);
  });
  return hono;
}

/** Runs a module and returns the parsed SSE events. */
async function run(llm: LlmSlot, module: string, body: Record<string, unknown>) {
  const response = await app(llm).request(`/api/studio/run/${module}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!response.headers.get('content-type')?.includes('event-stream')) return { status: response.status, json: await response.json(), events: [] as { event: string; data: any }[] };
  const text = await response.text();
  const events = text.split('\n\n').filter(Boolean).map((chunk) => ({ event: chunk.match(/^event: (.+)$/m)![1], data: JSON.parse(chunk.match(/^data: (.+)$/m)![1]) }));
  return { status: response.status, json: null, events };
}
const last = (events: { event: string; data: any }[], name: string) => [...events].reverse().find((item) => item.event === name)?.data;

beforeEach(() => {
  fake.clear();
  fake.put(`accounts/${ACCOUNT}`, { plan: 'free', plan_status: 'none', plan_source: 'default' });
  forgetPlans();
  search.calls = [];
  search.papers = [
    { ...emptyPaper('W1', 'openalex'), title: 'Sleep and memory consolidation', authors: [{ name: 'Jane Smith' }], year: 2020, abstract: 'Sleep helps memory.', doi: '10.1/a' },
    { ...emptyPaper('W2', 'openalex'), title: 'Naps and recall in students', authors: [{ name: 'Ali Khan' }], year: 2021, abstract: 'Naps improve recall.', doi: '10.1/b' },
  ];
});

describe('the studio catalogue', () => {
  it('has a prompt for every module except the two that do not write prose', () => {
    for (const module of STUDIO_MODULES) {
      if (module.output === 'papers' || module.output === 'compare') continue;
      expect(hasStudioPrompt(module.id), module.id).toBe(true);
    }
    expect(workspaceModules('thesis').map((module) => module.id)).toEqual(['similar', 'question', 'hypothesis', 'outline', 'methodology', 'framework', 'gaps', 'timeline', 'defence', 'auto-proposal']);
  });

  it('prices runs from the credit list: drafts, sections, rewrites per 2,000 words, high quality ×3, similar papers free', () => {
    expect(studioCredits(studioModule('literature-review')!, {}, CREDIT_COSTS)).toBe(CREDIT_COSTS.draft);
    expect(studioCredits(studioModule('outline')!, {}, CREDIT_COSTS, true)).toBe(CREDIT_COSTS.section * 3);
    expect(studioCredits(studioModule('research-proposal')!, { part: 'methods' }, CREDIT_COSTS)).toBe(CREDIT_COSTS.section);
    expect(studioCredits(studioModule('improve')!, { text: 'word '.repeat(4500) }, CREDIT_COSTS)).toBe(CREDIT_COSTS.ai_edit * 3);
    expect(rewriteUnits('word '.repeat(500_000))).toBe(10);
    expect(studioCredits(studioModule('similar')!, { text: 'x' }, CREDIT_COSTS)).toBe(0);
  });

  it('checks inputs: required fields, limits, and unknown select values fall back to the first option', () => {
    const outline = studioModule('outline')!;
    expect(() => checkInputs(outline, { topic: '' })).toThrow('Add thesis topic or title');
    expect(checkInputs(outline, { topic: 'Sleep in nurses', degree: 'hack' }).degree).toBe('masters');
    expect(taskTitle(studioModule('improve')!, { text: 'One two three four five six seven eight nine ten eleven twelve' })).toBe('Improve document: One two three four five six seven eight nine ten…');
  });

  it('builds grounded prompts with the sources, the reader and the citation rules', () => {
    const prompt = buildStudioPrompt(studioModule('gaps')!, {
      inputs: { topic: 'microplastics in fish', notes: '' }, sources: [{ n: 1, marker: 'S1', kind: 'paper', title: 'Plastic', authors: ['A'], year: 2020, abstract: 'x' } as any],
      role: 'phd', field: 'ecology', headings: true, length: 'standard', language: null, highQuality: false,
    });
    expect(prompt.messages[0].content).toContain('a doctoral researcher in ecology');
    expect(prompt.messages[0].content).toContain('[S2] or [S1, S4]');
    expect(prompt.messages[1].content).toContain('[S1] A (2020). Plastic.');
  });

  it('splits documents into paragraphs and batches of about 1,500 words', () => {
    expect(paragraphsOf('One.\n\nTwo.\r\n\r\n\nThree.')).toEqual(['One.', 'Two.', 'Three.']);
    const long = Array.from({ length: 5 }, () => 'word '.repeat(700).trim());
    expect(batches(long).map((group) => group.length)).toEqual([2, 2, 1]);
  });

  it('cleans a model deck: drops empty slides and charts whose numbers do not match their labels', () => {
    const deck = cleanDeck({ title: 'Talk', slides: [{ title: 'A', bullets: ['x'], chart: { labels: ['a', 'b'], values: [1] } }, { title: '', bullets: [] }, { title: 'B', bullets: ['y'], chart: { label: 'n', labels: ['a', 'b'], values: [1, 2] } }] }, 'Fallback');
    expect(deck?.slides).toHaveLength(2);
    expect(deck?.slides[0].chart).toBeNull();
    expect(deck?.slides[1].chart).toMatchObject({ labels: ['a', 'b'], values: [1, 2] });
    expect(cleanDeck({ slides: [] }, 'x')).toBeNull();
  });
});

describe('POST /api/studio/run/:module', () => {
  it('searches, streams a cited answer, drops invented markers, saves it to History and takes the credits', async () => {
    const llm = fakeLlm((messages) => (messages[0].content.includes('plan literature searches') ? '{"queries":["sleep memory","naps recall"]}' : '## Gaps\n\nSleep helps [S1]. Naps help [S2]. Made up [S9].'));
    const { events } = await run(llm, 'gaps', { inputs: { topic: 'sleep and memory' }, groups: ['papers'] });
    const done = last(events, 'done');
    expect(done.markdown).toBe('## Gaps\n\nSleep helps [S1]. Naps help [S2]. Made up.');
    expect(done.sources.map((source: any) => source.marker)).toEqual(['S1', 'S2']);
    expect(search.calls.length).toBeGreaterThanOrEqual(1);
    const task = fake.read(`tasks/${done.task_id}`);
    expect(task).toMatchObject({ kind: 'thesis', module: 'gaps', status: 'done', credits: CREDIT_COSTS.section });
    expect((await creditSummary(ACCOUNT)).used).toBe(CREDIT_COSTS.section);
  });

  it('reuses the sources of the research task it continues instead of searching', async () => {
    fake.put('tasks/research-1', { user_id: USER.id, account_id: ACCOUNT, project_id: null, kind: 'research', title: 'Sleep', status: 'done', result: { all_sources: [{ n: 3, marker: 'S3', kind: 'paper', id: 'W9', title: 'Earlier paper', authors: [], abstract: 'x' }] }, created_at: new Date(), updated_at: new Date() });
    const llm = fakeLlm('Review text [S1].');
    const { events } = await run(llm, 'literature-review', { inputs: { topic: 'sleep' }, from_task: 'research-1' });
    expect(search.calls).toHaveLength(0);
    expect(last(events, 'done').sources[0]).toMatchObject({ marker: 'S1', title: 'Earlier paper' });
  });

  it('returns the credits and records the failure when the model fails', async () => {
    const { events } = await run(fakeLlm('', new Error('boom')), 'outline', { inputs: { topic: 'nurse burnout' } });
    expect(last(events, 'error').detail).toContain('Your credits were returned');
    expect((await creditSummary(ACCOUNT)).used).toBe(0);
  });

  it('refuses High quality on Free and a run that needs more credits than are left', async () => {
    expect((await run(fakeLlm('x'), 'outline', { inputs: { topic: 'nurse burnout' }, high_quality: true })).status).toBe(402);
    fake.put(`accounts/${ACCOUNT}/plan_usage/credits__${new Date().toISOString().slice(0, 7)}`, { key: 'credits', amount: 25 });
    const refused = await run(fakeLlm('x'), 'paper', { inputs: { topic: 'a study' } });
    expect(refused.status).toBe(402);
    expect(refused.json).toMatchObject({ code: 'plan_limit', limit: 'credits' });
  });

  it('improves a document paragraph by paragraph and keeps the original where the model miscounts', async () => {
    const llm = fakeLlm('{"paragraphs":[{"text":"First, better.","note":"Shorter"},{"text":"Second, better.","note":""}]}');
    const { events } = await run(llm, 'improve', { inputs: { text: 'The first paragraph is here and it is long enough.\n\nThe second paragraph is also here for the test.', goal: 'clarity' } });
    const done = last(events, 'done');
    expect(done.pairs).toEqual([
      { before: 'The first paragraph is here and it is long enough.', after: 'First, better.', note: 'Shorter' },
      { before: 'The second paragraph is also here for the test.', after: 'Second, better.', note: '' },
    ]);
    expect(done.summary).toBe('2 of 2 paragraphs changed');
  });

  it('makes a deck from pasted content without searching, keeping only real source markers', async () => {
    const llm = fakeLlm('```json\n{"title":"Sleep","slides":[{"title":"Findings","bullets":["Sleep helps [S1]","Invented [S7]"],"notes":"Say this."}]}\n```');
    const { events } = await run(llm, 'slides', { inputs: { topic: 'Sleep talk', text: 'Our study found that sleep helps memory in 40 students.' }, attachments: [{ name: 'study.md', text: 'Sleep helps memory.' }] });
    const done = last(events, 'done');
    expect(search.calls).toHaveLength(0);
    expect(done.deck.slides[0].bullets).toEqual(['Sleep helps [S1]', 'Invented']);
    // Free has no PowerPoint export: the five-slide preview is priced as a preview.
    expect(fake.read(`tasks/${done.task_id}`)).toMatchObject({ kind: 'slides', credits: CREDIT_COSTS.review_preview });
  });
});

describe('decks on plans without PowerPoint export', () => {
  it('shows the first five slides and counts the rest', async () => {
    const slides = Array.from({ length: 8 }, (_, index) => ({ title: `Slide ${index + 1}`, bullets: ['Point'] }));
    const { events } = await run(fakeLlm(JSON.stringify({ title: 'Deck', slides })), 'slides', { inputs: { topic: 'Talk', text: 'Content long enough to build slides from.' } });
    const done = last(events, 'done');
    expect(done.deck.slides).toHaveLength(5);
    expect(done.locked_slides).toBe(3);
  });
});

describe('word diff', () => {
  it('marks removed and added words and keeps the rest', () => {
    expect(wordDiff('the results was clear', 'the results were clear')).toEqual([
      { kind: 'same', text: 'the results ' }, { kind: 'removed', text: 'was' }, { kind: 'added', text: 'were' }, { kind: 'same', text: ' clear' },
    ]);
  });
});

describe('Similar papers and PowerPoint export', () => {
  it('falls back to a search when Semantic Scholar has nothing, costs no credits and saves the list', async () => {
    const response = await app(fakeLlm('x')).request('/api/studio/similar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'Sleep after learning improves memory consolidation in adults' }) });
    const body = await response.json();
    expect(body.via).toBe('search');
    expect(body.sources.map((source: any) => source.title)).toEqual(['Sleep and memory consolidation', 'Naps and recall in students']);
    expect((await creditSummary(ACCOUNT)).used).toBe(0);
    expect(fake.read(`tasks/${body.task_id}`)).toMatchObject({ kind: 'thesis', module: 'similar' });
  });

  it('allows PowerPoint export on paid plans only', async () => {
    expect((await app(fakeLlm('x')).request('/api/studio/slides/export-allowed')).status).toBe(402);
    fake.put(`accounts/${ACCOUNT}`, { plan: 'plus', plan_status: 'active', plan_source: 'dodo' });
    forgetPlans();
    expect((await app(fakeLlm('x')).request('/api/studio/slides/export-allowed')).status).toBe(200);
  });
});
