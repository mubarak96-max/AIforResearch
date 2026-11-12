import { beforeEach, describe, expect, it, vi } from 'vitest';

const fake = await vi.hoisted(async () => (await import('./fakeFirestore.js')).createFakeFirestore());
vi.mock('../../lib/server/firebase.js', async (original) => ({ ...(await original<typeof import('../../lib/server/firebase.js')>()), ...fake.module }));

import { Hono } from 'hono';
import type { LlmSlot } from '../../lib/server/slots/types.js';
import { GUIDELINES, guideline, suggestGuideline } from '../../lib/reportingGuidelines';
import { mergeFindings } from '../../lib/server/lib/guidelineCheck.js';
import { norm } from '../../lib/server/lib/reviewer.js';
import { guidelineCredits, reviewerRoutes } from '../../lib/server/routes/reviewer.js';
import { creditSummary, forgetPlans } from '../../lib/server/lib/plans.js';

const MANUSCRIPT = `# A cross-sectional study of sleep and grades
## Methods
We conducted a cross-sectional survey of 412 first-year students at two universities between March and May 2025. ${'Participants completed the questionnaire online. '.repeat(40)}
## Statistical analysis
Logistic regression estimated odds ratios with 95% confidence intervals, adjusting for age and sex. ${'Analyses used R version 4.4. '.repeat(30)}
## Results
${'Short sleep was associated with lower grades. '.repeat(30)}
## Funding
This work received no specific funding.`;

describe('reporting guideline data', () => {
  it('numbers every checklist as published, with unique item ids', () => {
    const counts = Object.fromEntries(GUIDELINES.map((item) => [item.id, item.items.length]));
    expect(counts).toEqual({ consort: 37, strobe: 34, prisma: 42, care: 30, stard: 34, coreq: 32, srqr: 21, squire: 22 });
    for (const g of GUIDELINES) expect(new Set(g.items.map((item) => item.id)).size).toBe(g.items.length);
    expect(guideline('prisma')!.items.map((item) => item.id).slice(-4)).toEqual(['24c', '25', '26', '27']);
  });

  it('suggests a guideline from the manuscript’s words, or none when unsure', () => {
    expect(suggestGuideline(MANUSCRIPT)).toBe('strobe');
    expect(suggestGuideline('We report the case of a 54-year-old woman with a rare rash. This case report describes …')).toBe('care');
    expect(suggestGuideline('A systematic review and meta-analysis. We searched MEDLINE; risk of bias was assessed. PRISMA was followed.')).toBe('prisma');
    expect(suggestGuideline('Participants were randomly assigned to two arms; allocation concealment used sealed envelopes. Randomized.')).toBe('consort');
    expect(suggestGuideline('An essay on Shakespeare.')).toBeNull();
  });
});

describe('merging the model’s answers', () => {
  const items = guideline('strobe')!.items.slice(0, 5);
  const text = norm(MANUSCRIPT);

  it('keeps a reported item only when its quote is in the text, and marks skipped items for a check', () => {
    const findings = mergeFindings(items, [
      { id: '1a', status: 'reported', where: 'Title', quote: 'A cross-sectional study of sleep and grades', note: 'Design named in the title.' },
      { id: '1b', status: 'reported', where: 'Abstract', quote: 'an abstract sentence the model made up entirely', note: 'Abstract present.' },
      { id: '2', status: 'missing', where: 'Introduction', quote: 'anything', note: 'No background.', fix: 'Add a paragraph on why sleep matters.' },
      { id: '3', status: 'maybe', note: 'Unclear' },
    ], text);
    expect(findings.map((finding) => [finding.id, finding.status])).toEqual([['1a', 'reported'], ['1b', 'check'], ['2', 'missing'], ['3', 'check'], ['4', 'check']]);
    expect(findings[0].quote).toBe('A cross-sectional study of sleep and grades');
    expect(findings[1].note).toMatch(/No exact passage/);
    expect(findings[2]).toMatchObject({ quote: null, where: null, fix: 'Add a paragraph on why sleep matters.' });
    expect(findings[4].note).toMatch(/Not assessed/);
  });
});

describe('POST /api/reviewer/guidelines', () => {
  const llm = {
    provider: 'fake',
    complete: vi.fn(async ({ messages }: { messages: { content: string }[] }) => {
      const ids = [...messages[1].content.matchAll(/^- (\w+) \(/gm)].map((match) => match[1]);
      return {
        text: JSON.stringify({ items: ids.map((id) => (id === '12a'
          ? { id, status: 'reported', where: 'Statistical analysis', quote: 'Logistic regression estimated odds ratios with 95% confidence intervals', note: 'Methods given.' }
          : id === '22' ? { id, status: 'reported', where: 'Funding', quote: 'This work received no specific funding', note: 'Stated.' }
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

  it('checks every item in batches, charges per 10,000 words and saves the checklist', async () => {
    const response = await post({ guideline: 'strobe', text: MANUSCRIPT, title: 'Sleep and grades' });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.findings).toHaveLength(34);
    expect(body.counts).toMatchObject({ reported: 2, missing: 32 });
    expect(body.summary).toBe('2 of 34 applicable STROBE items are reported, 0 partly, 32 missing.');
    expect(body.markdown).toContain('| 12a | Methods | Statistical methods | Reported | Statistical analysis');
    expect((llm.complete as any).mock.calls.length).toBe(3);
    expect(body.credits).toBe(5);
    expect(guidelineCredits(1)).toBe(5);
    expect((await creditSummary('acc-1')).used).toBe(5);
    expect(fake.read(`tasks/${body.task_id}`)).toMatchObject({ kind: 'guideline_check', module: 'strobe', status: 'done' });
  });

  it('refuses short text and returns the credits when every batch fails', async () => {
    expect((await post({ guideline: 'care', text: 'Too short.' })).status).toBe(422);
    (llm.complete as any).mockRejectedValue(new Error('down'));
    const failed = await post({ guideline: 'care', text: MANUSCRIPT });
    expect(failed.status).toBe(503);
    expect((await creditSummary('acc-1')).used).toBe(0);
    (llm.complete as any).mockReset();
  });

  it('prices longer documents per 10,000 words, capped at what is read', () => {
    expect(guidelineCredits(25_000)).toBe(15);
    expect(guidelineCredits(120_000)).toBe(20);
  });
});
