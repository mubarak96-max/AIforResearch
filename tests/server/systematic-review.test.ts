import { beforeEach, describe, expect, it, vi } from 'vitest';

const fake = await vi.hoisted(async () => (await import('./fakeFirestore.js')).createFakeFirestore());
vi.mock('../../lib/server/firebase.js', async (original) => ({ ...(await original<typeof import('../../lib/server/firebase.js')>()), ...fake.module }));
vi.mock('../../lib/server/usage.js', () => ({ recordUsage: async () => undefined }));

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppVariables } from '../../lib/server/auth.js';
import { PlanLimitError, forgetPlans } from '../../lib/server/lib/plans.js';
import { systematicReviewRoutes } from '../../lib/server/routes/systematicReview.js';
import { findDuplicates, parseCsvRecords, parseExport, parseNbib, toCsv } from '../../lib/server/lib/systematicReviewParse.js';
import { agreement, kappaLabel, prismaCounts, stageState, type ScreeningRecord } from '../../lib/server/lib/systematicReviewStats.js';
import { USER, fakeLlm, fakePapers } from './assist-helpers.js';

const CSV = `Authors,Title,Year,Source title,DOI,Abstract
"Smith, J.; Lee, K.","Napping on night shifts improves alertness",2019,Sleep Medicine,10.1000/nap.1,"Nurses who napped, were more alert."
"Brown, A.","A trial of planned naps in shift workers",2021,Occup Med,10.1000/nap.2,Planned naps reduced fatigue.
"Smith, J.","Napping on night shifts improves alertness.",2019,Sleep Medicine,https://doi.org/10.1000/NAP.1,Same paper again.`;

const NBIB = `PMID- 31234567
TI  - Shift work, naps and reaction time: a randomized
      controlled trial.
AB  - We randomized 40 nurses.
FAU - Garcia, Maria
DP  - 2020 Mar
JT  - Journal of Sleep Research
LID - 10.1000/nap.3 [doi]

PMID- 31234568
TI  - Night shift naps and alertness.
DP  - 2018
JT  - Ergonomics
`;

describe('imports', () => {
  it('reads Scopus-style CSV with quoted commas and semicolon-separated authors', () => {
    const records = parseCsvRecords(CSV);
    expect(records).toHaveLength(3);
    expect(records[0]).toMatchObject({ title: 'Napping on night shifts improves alertness', authors: ['Smith, J.', 'Lee, K.'], year: 2019, venue: 'Sleep Medicine', doi: '10.1000/nap.1', abstract: 'Nurses who napped, were more alert.' });
    expect(records[2].doi).toBe('10.1000/nap.1');
  });

  it('reads PubMed .nbib with continuation lines and the DOI', () => {
    const records = parseNbib(NBIB);
    expect(records.map((record) => record.pmid)).toEqual(['31234567', '31234568']);
    expect(records[0]).toMatchObject({ title: 'Shift work, naps and reaction time: a randomized controlled trial.', authors: ['Maria Garcia'], year: 2020, doi: '10.1000/nap.3' });
    expect(parseExport('pubmed.nbib', NBIB).format).toBe('PubMed (.nbib)');
    expect(parseExport('x.ris', 'TY  - JOUR\nTI  - A title long enough\nER  - ').records[0].title).toBe('A title long enough');
    expect(() => parseExport('x.pdf', '%PDF')).toThrow('RIS, BibTeX, CSV or PubMed');
  });

  it('finds duplicates by DOI, PubMed id and title, against existing records and within the file', () => {
    let n = 0;
    const existing = new Map([['pmid:31234568', 'old-1']]);
    const { fresh, duplicates } = findDuplicates([...parseCsvRecords(CSV), ...parseNbib(NBIB)], existing, () => `r${(n += 1)}`);
    expect(fresh.map((record) => record.title)).toEqual(['Napping on night shifts improves alertness', 'A trial of planned naps in shift workers', 'Shift work, naps and reaction time: a randomized controlled trial.']);
    expect(duplicates.map((record) => [record.reason, record.duplicate_of])).toEqual([['doi', 'r1'], ['pmid', 'old-1']]);
  });

  it('quotes CSV cells that need it', () => {
    expect(toCsv([['a,b', 'say "hi"', 3]])).toBe('"a,b","say ""hi""",3');
  });
});

describe('screening rules', () => {
  const record = (votes: ScreeningRecord['votes'], extra: Partial<ScreeningRecord> = {}): ScreeningRecord => ({ id: 'x', duplicate_of: null, source: 'PubMed', votes, ...extra });

  it('takes one reviewer’s vote as final, needs two that agree with two reviewers, and lets a resolution settle a conflict', () => {
    expect(stageState(record({ title: { a: { decision: 'exclude', reason: 'Wrong population' } } }), 'title', { dual: false, aiSecond: false })).toEqual({ status: 'final', decision: 'exclude', reason: 'Wrong population' });
    const dual = { dual: true, aiSecond: false };
    expect(stageState(record({ title: { a: { decision: 'include' } } }), 'title', dual).status).toBe('pending');
    expect(stageState(record({ title: { a: { decision: 'include' }, b: { decision: 'include' } } }), 'title', dual)).toMatchObject({ status: 'final', decision: 'include' });
    const conflict = record({ title: { a: { decision: 'include' }, b: { decision: 'exclude' } } });
    expect(stageState(conflict, 'title', dual).status).toBe('conflict');
    expect(stageState({ ...conflict, resolved: { title: { decision: 'exclude', reason: 'Wrong outcomes' } } }, 'title', dual)).toMatchObject({ status: 'final', decision: 'exclude' });
    // The AI as second reviewer.
    expect(stageState(record({ title: { a: { decision: 'include' } } }, { ai: { title: { decision: 'exclude', reason: 'r' } } }), 'title', { dual: true, aiSecond: true }).status).toBe('conflict');
  });

  it('computes Cohen’s kappa and percent agreement', () => {
    // 10 records: 4 both include, 4 both exclude, 2 disagree. po = .8, pe = .5 → kappa .6.
    const pairs = [...Array(4).fill(['include', 'include']), ...Array(4).fill(['exclude', 'exclude']), ['include', 'exclude'], ['exclude', 'include']] as [any, any][];
    expect(agreement(pairs)).toEqual({ n: 10, percent: 80, kappa: 0.6 });
    expect(kappaLabel(0.6)).toBe('moderate');
    expect(agreement([])).toEqual({ n: 0, percent: null, kappa: null });
  });

  it('counts the PRISMA flow from records and decisions', () => {
    const solo = { dual: false, aiSecond: false };
    const records: ScreeningRecord[] = [
      record({ title: { a: { decision: 'include' } }, full: { a: { decision: 'include' } } }),
      record({ title: { a: { decision: 'maybe' } }, full: { a: { decision: 'exclude', reason: 'Wrong outcomes' } } }),
      record({ title: { a: { decision: 'exclude', reason: 'Wrong population' } } }),
      record({ title: { a: { decision: 'include' } } }),
      record({}),
      { ...record({}), source: 'Scopus', duplicate_of: 'x' },
    ];
    expect(prismaCounts(records, solo)).toMatchObject({
      identified: [{ source: 'PubMed', count: 5 }, { source: 'Scopus', count: 1 }], identified_total: 6, duplicates: 1, screened: 5,
      excluded_title: 1, awaiting_title: 1, sought: 3, assessed: 2, excluded_full: [{ reason: 'Wrong outcomes', count: 1 }], awaiting_full: 1, included: 1,
    });
  });
});

describe('the workspace routes', () => {
  const papers = fakePapers();
  const makeApp = (reply: string | ((messages: any[]) => string), error?: Error) => {
    const app = new Hono<{ Variables: AppVariables }>();
    app.use('*', async (c, next) => { c.set('user', USER); await next(); });
    app.route('/api/systematic-reviews', systematicReviewRoutes({ llm: fakeLlm(reply, error), papers }));
    app.onError((caught, c) => {
      if (caught instanceof PlanLimitError) return c.json({ detail: caught.message, code: 'plan_limit' }, 402);
      if (caught instanceof HTTPException) return c.json({ detail: caught.message }, caught.status);
      console.error(caught);
      return c.json({ detail: 'error' }, 500);
    });
    return app;
  };
  const json = (app: Hono<any>, path: string, method = 'GET', body?: unknown) =>
    app.request(path, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const upload = (app: Hono<any>, id: string, name: string, text: string, database = 'Scopus') => {
    const form = new FormData();
    form.append('file', new File([text], name));
    form.append('database', database);
    return app.request(`/api/systematic-reviews/${id}/import`, { method: 'POST', body: form });
  };
  const credits = () => Number(fake.read(`accounts/${USER.account_id}/plan_usage/credits__${new Date().toISOString().slice(0, 7)}`)?.amount ?? 0);

  beforeEach(() => {
    fake.clear();
    forgetPlans();
  });

  it('creates a review mirrored in History, imports with duplicates set aside, screens with AI for credits, and reports', async () => {
    const app = makeApp((messages) => {
      const ids = [...String(messages[1].content).matchAll(/id=(\S+)/g)].map((match) => match[1]);
      return JSON.stringify({ items: ids.map((id, index) => ({ id, decision: index ? 'exclude' : 'include', reason: 'Fits the criteria.', exclusion_reason: 'Wrong population' })) });
    });
    const created = await json(app, '/api/systematic-reviews', 'POST', { title: 'Naps in shift workers', question: 'Do naps help?', review_type: 'systematic', include_criteria: ['Adults'] });
    expect(created.status).toBe(201);
    const { id, task_id } = await created.json();
    expect(fake.read(`tasks/${task_id}`)).toMatchObject({ kind: 'systematic_review', title: 'Naps in shift workers', inputs: { review_id: id } });

    // Free plan: one review only.
    expect((await json(app, '/api/systematic-reviews', 'POST', { title: 'Second' })).status).toBe(402);

    const imported = await (await upload(app, id, 'scopus.csv', CSV)).json();
    expect(imported).toMatchObject({ added: 2, duplicates: 1, format: 'CSV' });
    const again = await (await upload(app, id, 'pubmed.nbib', NBIB, 'PubMed')).json();
    expect(again).toMatchObject({ added: 2, duplicates: 0 });

    const suggested = await (await json(app, `/api/systematic-reviews/${id}/screen/ai`, 'POST', { stage: 'title' })).json();
    expect(suggested).toEqual({ suggested: 4, credits: 1 });
    expect(credits()).toBe(1);

    let state = await (await json(app, `/api/systematic-reviews/${id}`)).json();
    expect(state.prisma).toMatchObject({ identified_total: 5, duplicates: 1, screened: 4, awaiting_title: 4 });
    const first = state.records.find((record: any) => !record.duplicate_of && record.ai.title.decision === 'include');
    expect((await json(app, `/api/systematic-reviews/${id}/records/${first.id}/vote`, 'POST', { stage: 'title', decision: 'include' })).status).toBe(200);
    expect((await json(app, `/api/systematic-reviews/${id}/records/${first.id}/vote`, 'POST', { stage: 'full', decision: 'include' })).status).toBe(200);
    state = await (await json(app, `/api/systematic-reviews/${id}`)).json();
    expect(state.prisma).toMatchObject({ screened: 4, awaiting_title: 3, sought: 1, included: 1 });
    expect(fake.read(`tasks/${task_id}`)?.result?.summary).toBe('4 records, 1 screened, 1 included.');

    const ris = await (await app.request(`/api/systematic-reviews/${id}/export?format=ris&records=included`)).text();
    expect(ris.match(/ER {2}- /g)).toHaveLength(1);

    // AI as second reviewer: the AI agreed on the one record voted, so kappa can be computed.
    await json(app, `/api/systematic-reviews/${id}`, 'PATCH', { ai_second_reviewer: true });
    state = await (await json(app, `/api/systematic-reviews/${id}`)).json();
    expect(state.dual).toBe(true);
    expect(state.agreement.title).toMatchObject({ n: 1, percent: 100, with: 'AI suggestions' });

    const csv = await (await app.request(`/api/systematic-reviews/${id}/export?format=csv`)).text();
    expect(csv.split('\r\n')).toHaveLength(6);
    expect(csv).toContain('Napping on night shifts improves alertness');
  });

  it('refunds credits when the AI fails, and caps the Free plan at 50 records', async () => {
    const app = makeApp('', new Error('down'));
    const { id } = await (await json(app, '/api/systematic-reviews', 'POST', { title: 'Big' })).json();
    const rows = ['Title,Year', ...Array.from({ length: 60 }, (_, index) => `Study number ${index} about naps and alertness,${2000 + (index % 20)}`)].join('\n');
    expect(await (await upload(app, id, 'many.csv', rows)).json()).toMatchObject({ added: 50, over_limit: 10, limit: 50 });
    const failed = await json(app, `/api/systematic-reviews/${id}/screen/ai`, 'POST', { stage: 'title' });
    expect(failed.status).toBe(500);
    expect(credits()).toBe(0);
  });

  it('drafts the protocol for 3 credits', async () => {
    const app = makeApp('## Review title\nNaps\n\n## Review question\n[To decide: population]');
    const { id } = await (await json(app, '/api/systematic-reviews', 'POST', { title: 'Naps' })).json();
    const result = await (await json(app, `/api/systematic-reviews/${id}/protocol/draft`, 'POST')).json();
    expect(result.protocol).toContain('## Review question');
    expect(credits()).toBe(3);
    expect(fake.read(`systematic_reviews/${id}`)?.protocol).toContain('## Review title');
  });
});
