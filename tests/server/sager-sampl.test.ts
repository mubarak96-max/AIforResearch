import { beforeEach, describe, expect, it, vi } from 'vitest';

const fake = await vi.hoisted(async () => (await import('./fakeFirestore.js')).createFakeFirestore());
vi.mock('../../lib/server/firebase.js', async (original) => ({ ...(await original<typeof import('../../lib/server/firebase.js')>()), ...fake.module }));

import { Hono } from 'hono';
import type { LlmSlot } from '../../lib/server/slots/types.js';
import { GUIDELINE_IDS, guideline, suggestGuideline } from '../../lib/reportingGuidelines';
import { batchPrompt } from '../../lib/server/lib/guidelineCheck.js';
import { reviewerRoutes } from '../../lib/server/routes/reviewer.js';
import { forgetPlans } from '../../lib/server/lib/plans.js';

const STATS_PAPER = `# Statistical reporting in a laboratory note
## Statistical analysis
${'Values are given as mean and standard deviation; skewed values as median and interquartile range. '.repeat(8)}
${'We report exact P values from two-sided tests with 95% confidence intervals. '.repeat(8)}
${'A linear regression model was fitted and checked. '.repeat(20)}
## Results
${'The difference was 4.2 units (95% confidence interval 1.1 to 7.3). '.repeat(20)}`;

describe('SAGER and SAMPL checklists', () => {
  it('load with paraphrased items, an EQUATOR link and a note that they complement a design checklist', () => {
    const sager = guideline('sager')!;
    const sampl = guideline('sampl')!;
    expect(GUIDELINE_IDS).toEqual(expect.arrayContaining(['sager', 'sampl']));
    expect(sager).toMatchObject({ name: 'SAGER', version: '2016', complements: true });
    expect(sampl).toMatchObject({ name: 'SAMPL', version: '2013', complements: true });
    expect(sager.url).toMatch(/^https:\/\/www\.equator-network\.org\/reporting-guidelines\//);
    expect(sampl.url).toMatch(/^https:\/\/www\.equator-network\.org\/reporting-guidelines\//);
    expect(sager.items.map((item) => item.id)).toEqual(['1', '2a', '2b', '3', '4a', '4b', '4c', '5a', '5b', '5c', '6a', '6b']);
    expect(sager.items.map((item) => item.section)).toContain('Discussion');
    expect(sampl.items.filter((item) => item.id.startsWith('M'))).toHaveLength(10);
    expect(sampl.items.filter((item) => item.id.startsWith('R'))).toHaveLength(12);
    for (const g of [sager, sampl]) {
      expect(g.for).toBeTruthy();
      expect(g.note).toMatch(/complements a study-design checklist/);
      expect(new Set(g.items.map((item) => item.id)).size).toBe(g.items.length);
    }
  });

  it('tells the model the checklist sits alongside a design checklist', () => {
    const prompt = batchPrompt(guideline('sampl')!, guideline('sampl')!.items.slice(0, 2), 'text', 'Title');
    expect(prompt[0].content).toMatch(/alongside a study-design checklist/);
    expect(batchPrompt(guideline('strobe')!, [], 'text', 'Title')[0].content).not.toMatch(/alongside/);
  });

  it('suggests them only when no study-design checklist fits', () => {
    expect(suggestGuideline(STATS_PAPER)).toBe('sampl');
    expect(suggestGuideline('We examined sex differences and gender differences; data were disaggregated by sex. Sex and gender analysis followed SAGER.')).toBe('sager');
    // A cohort study that also reports statistics is still a STROBE paper.
    expect(suggestGuideline(`A prospective cohort study. Odds ratio, confounder adjustment, retrospective data. ${STATS_PAPER}`)).toBe('strobe');
  });
});

describe('POST /api/reviewer/guidelines with an add-on checklist', () => {
  const llm = {
    provider: 'fake',
    complete: vi.fn(async ({ messages }: { messages: { content: string }[] }) => {
      const ids = [...messages[1].content.matchAll(/^- (\w+) \(/gm)].map((match) => match[1]);
      return {
        text: JSON.stringify({ items: ids.map((id) => (id === 'R5'
          ? { id, status: 'reported', where: 'Statistical analysis', quote: 'We report exact P values from two-sided tests with 95% confidence intervals', note: 'Exact P values.' }
          : { id, status: 'missing', note: 'Not found.', fix: 'Report it.' })) }),
        usage: { inputTokens: 10, outputTokens: 10 },
      };
    }),
    stream: vi.fn(),
  } as unknown as LlmSlot;
  const app = new Hono<{ Variables: { user: any } }>();
  app.use('*', async (c, next) => { c.set('user', { id: 'u1', account_id: 'acc-1', email: 'a@b.c', full_name: 'A', is_admin: false }); await next(); });
  app.route('/api/reviewer', reviewerRoutes({ llm, papers: {} as any }) as any);
  app.onError((error: any, c) => c.json({ detail: error.message }, error.status ?? 500));
  const post = (body: unknown) => app.request('/api/reviewer/guidelines', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

  beforeEach(() => {
    fake.clear();
    fake.put('accounts/acc-1', { plan: 'free', plan_status: 'none', plan_source: 'default' });
    forgetPlans();
  });

  it('accepts SAMPL and SAGER and checks every item', async () => {
    const sampl = await post({ guideline: 'sampl', text: STATS_PAPER, title: 'Lab note' });
    expect(sampl.status).toBe(200);
    const body = await sampl.json();
    expect(body.findings).toHaveLength(22);
    expect(body.findings.find((finding: any) => finding.id === 'R5')).toMatchObject({ status: 'reported' });
    expect(body.counts).toMatchObject({ reported: 1, missing: 21 });
    expect(fake.read(`tasks/${body.task_id}`)).toMatchObject({ kind: 'guideline_check', module: 'sampl', status: 'done' });
    const sager = await post({ guideline: 'sager', text: STATS_PAPER });
    expect(sager.status).toBe(200);
    expect((await sager.json()).findings).toHaveLength(12);
    expect((await post({ guideline: 'unknown', text: STATS_PAPER })).status).toBe(422);
  });
});
