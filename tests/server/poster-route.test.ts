import { beforeEach, describe, expect, it, vi } from 'vitest';

const fake = await vi.hoisted(async () => (await import('./fakeFirestore.js')).createFakeFirestore());
vi.mock('../../lib/server/firebase.js', async (original) => ({ ...(await original<typeof import('../../lib/server/firebase.js')>()), ...fake.module }));
vi.mock('../../lib/server/usage.js', () => ({ recordUsage: vi.fn(async () => undefined) }));
vi.mock('../../lib/server/lib/users.js', () => ({
  activeUser: async () => null, ensureUser: async () => null,
  researchProfile: async () => ({ role: 'masters', field: 'psychology', citation_style: null, language: null }),
}));
const search = vi.hoisted(() => ({ calls: 0 }));
vi.mock('../../lib/server/lib/sources/index.js', async (original) => {
  const real = await original<typeof import('../../lib/server/lib/sources/index.js')>();
  return {
    ...real,
    searchSources: vi.fn(async () => {
      search.calls += 1;
      return { papers: [{ ...real.emptyPaper('W1', 'openalex'), title: 'Sleep and memory', authors: [{ name: 'Jane Smith' }], year: 2020, abstract: 'Sleep helps memory.' }], web: [], counts: {}, errors: [] };
    }),
  };
});
// The lead's two hook lines, simulated: the module in STUDIO_MODULES and its prompt builder.
vi.mock('../../lib/server/lib/studioCatalog.js', async (original) => {
  const real = await original<typeof import('../../lib/server/lib/studioCatalog.js')>();
  const { POSTER_MODULE } = await import('../../lib/server/lib/posterModule.js');
  const modules = [...real.STUDIO_MODULES, POSTER_MODULE as any];
  return { ...real, STUDIO_MODULES: modules, studioModule: (id: string) => modules.find((module) => module.id === id) ?? null };
});
vi.mock('../../lib/server/lib/studioModules.js', async (original) => {
  const real = await original<typeof import('../../lib/server/lib/studioModules.js')>();
  const { posterBuilder } = await import('../../lib/server/lib/posterModule.js');
  return {
    ...real,
    hasStudioPrompt: (id: string) => id === 'poster' || real.hasStudioPrompt(id),
    buildStudioPrompt: (module: any, context: any) => {
      if (module.id !== 'poster') return real.buildStudioPrompt(module, context);
      const built = posterBuilder(context);
      return { messages: [{ role: 'system', content: built.system }, { role: 'user', content: built.user }], maxTokens: built.maxTokens, task: 'fast', temperature: 0.3, json: true };
    },
  };
});

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { PlanLimitError, creditSummary, forgetPlans } from '../../lib/server/lib/plans.js';
import { studioRoutes } from '../../lib/server/routes/studio.js';
import { fakeLlm, USER } from './assist-helpers.js';
import type { LlmSlot } from '../../lib/server/slots/types.js';

function app(llm: LlmSlot) {
  const hono = new Hono<{ Variables: { user: typeof USER } }>();
  hono.use('*', async (c, next) => { c.set('user', USER); await next(); });
  hono.route('/api/studio', studioRoutes({ llm, papers: {} as any }) as any);
  hono.onError((error, c) => {
    if (error instanceof PlanLimitError) return c.json({ detail: error.message }, 402);
    if (error instanceof HTTPException) return c.json({ detail: error.message }, error.status);
    return c.json({ detail: String(error) }, 500);
  });
  return hono;
}
async function run(llm: LlmSlot, inputs: Record<string, string>) {
  const response = await app(llm).request('/api/studio/run/poster', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ inputs }) });
  const text = await response.text();
  return text.split('\n\n').filter(Boolean).map((chunk) => ({ event: chunk.match(/^event: (.+)$/m)![1], data: JSON.parse(chunk.match(/^data: (.+)$/m)![1]) }));
}

const POSTER = JSON.stringify({ title: 'Sleep and memory', sections: [{ heading: 'Results', text: 'Sleep helps memory [S1]. Invented [S7].', bullets: ['Recall rose [S1, S7]'] }], figures: [{ title: 'Recall', description: 'Bar chart' }] });

beforeEach(() => {
  fake.clear();
  fake.put(`accounts/${USER.account_id}`, { plan: 'free', plan_status: 'none', plan_source: 'default' });
  forgetPlans();
  search.calls = 0;
});

describe('POST /api/studio/run/poster (once registered)', () => {
  it('searches, returns the poster with only real markers, and charges a section on the free plan', async () => {
    const events = await run(fakeLlm(POSTER), { topic: 'Sleep and memory', size: 'a1-portrait', layout: '2-column' });
    const done = events.find((item) => item.event === 'done')!.data;
    expect(search.calls).toBe(1);
    expect(done.poster.sections[0].text).toBe('Sleep helps memory [S1]. Invented.');
    expect(done.poster.sections[0].bullets).toEqual(['Recall rose [S1]']);
    expect(done.sources.map((source: any) => source.marker)).toEqual(['S1']);
    expect((await creditSummary(USER.account_id)).used).toBe(3);
  });

  it('builds from the writer’s content without searching, and refunds a poster that does not parse', async () => {
    const events = await run(fakeLlm('not json'), { topic: 'Sleep', text: 'Our study of 120 students found recall rose after sleep.' });
    expect(search.calls).toBe(0);
    expect(events.find((item) => item.event === 'error')!.data.detail).toMatch(/poster could not be made/);
    expect((await creditSummary(USER.account_id)).used).toBe(0);
  });

  it('gates the LaTeX download to plans with LaTeX export', async () => {
    const response = await app(fakeLlm('')).request('/api/studio/poster/latex-allowed');
    expect(response.status).toBe(402);
  });
});
