import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ calls: [] as { path: string; params: Record<string, string> }[], tasks: [] as any[], spent: 0, refunded: 0, llm: '' }));

// OpenAlex: answers by path and filter, like api.openalex.org.
vi.mock('../../lib/server/lib/directory.js', () => {
  const work = (id: string, title: string, extra: Record<string, unknown> = {}) => ({
    id: `https://openalex.org/${id}`, title, publication_year: 2020, cited_by_count: Number(id.slice(1)) || 0, type: 'article',
    authorships: [{ author: { display_name: 'Ada Lovelace' } }], referenced_works: [], ...extra,
  });
  const get = async (path: string, params: Record<string, string>) => {
    state.calls.push({ path, params });
    if (params.group_by === 'publication_year') return { group_by: [{ key: '2019', key_display_name: '2019', count: 3 }, { key: '2021', key_display_name: '2021', count: 5 }] };
    if (params.group_by === 'open_access.is_oa') return { group_by: [{ key: 'true', key_display_name: 'true', count: 6 }, { key: 'false', key_display_name: 'false', count: 2 }] };
    if (params.group_by) return { group_by: [{ key: 'https://openalex.org/T1', key_display_name: 'Sleep and memory', count: 7 }, { key: 'unknown', key_display_name: 'unknown', count: 1 }] };
    if (path === 'works/W1') return work('W1', 'Seed paper on sleep', { referenced_works: ['https://openalex.org/W10', 'https://openalex.org/W20'] });
    const filter = params.filter || '';
    if (filter.startsWith('openalex_id:')) {
      return { results: filter.slice(12).split('|').map((id) => work(id, `Paper ${id}`, { referenced_works: id === 'W1' || id === 'W2' ? ['https://openalex.org/W10', `https://openalex.org/W${id === 'W1' ? 20 : 30}`] : [] })) };
    }
    if (filter.startsWith('cites:') && filter.includes('type:review')) return { results: [work('W77', 'A review of sleep', { type: 'review', referenced_works: ['https://openalex.org/W1', 'https://openalex.org/W2'] })] };
    if (filter.startsWith('cites:')) return { results: [work('W40', 'A meta-analysis of napping'), work('W41', 'Ordinary follow-up study')], meta: { count: 2 } };
    if (params.sort === 'cited_by_count:desc') return { meta: { count: 8 }, results: [work('W5', 'Most cited')] };
    return { results: [] };
  };
  return { papersSlots: () => [{ provider: 'openalex', get }] };
});
vi.mock('../../lib/server/lib/sources/index.js', () => ({ semanticScholarLinks: async () => [] }));
vi.mock('../../lib/server/auth.js', async () => {
  const { createMiddleware } = await import('hono/factory');
  return { requireUser: createMiddleware(async (c, next) => { c.set('user', { id: 'u1', email: 'a@b.c', full_name: null, account_id: 'acc', is_admin: false }); await next(); }) };
});
vi.mock('../../lib/server/lib/history.js', () => ({
  createTask: async (_user: unknown, task: any) => { state.tasks.push(task); return `task-${state.tasks.length}`; },
  finishTask: async (id: string, result: any) => { state.tasks[Number(id.split('-')[1]) - 1].result = result; },
  getTaskFor: async () => ({ id: 'task-1', kind: 'citation_map', result: {} }),
  updateTaskResult: async () => undefined,
}));
vi.mock('../../lib/server/lib/plans.js', () => ({
  CREDIT_COSTS: { data_ai: 2 },
  spendCredits: async (_account: string, amount: number) => { state.spent += amount; return { accountId: 'acc', fromPlan: amount, fromTopup: 0, month: '2026-11' }; },
  refundCredits: async (charge: any) => { if (charge) state.refunded += charge.fromPlan; },
}));
vi.mock('../../lib/server/lib/assist-store.js', () => ({ getLibraryDocuments: async () => [] }));
vi.mock('../../lib/server/lib/users.js', () => ({ researchProfile: async () => ({ role: 'masters', field: null, citation_style: null, language: null }) }));
vi.mock('../../lib/server/lib/rateLimit.js', () => ({ rateLimit: () => async (_c: unknown, next: () => Promise<void>) => next() }));
vi.mock('../../lib/server/usage.js', () => ({ recordUsage: async () => undefined }));

import { Hono } from 'hono';
import { analysisRoutes } from '../../lib/server/routes/analysis.js';
import { dataReportPrompt, groupCounts, rankByLinks, yearSeries, type MapNode } from '../../lib/server/lib/analysis.js';
import {
  chooseTest, linearRegression, mannWhitney, normalCdf, normalQuantile, powerT, sampleSizeProportions, sampleSizeT, toCsv, toRis,
} from '../../components/app/analysis/stats.js';

const llm = {
  provider: 'test',
  complete: async (input: any) => { state.llm = input.messages.map((message: any) => message.content).join('\n'); return { text: '## Results\nThe groups differed.', usage: { inputTokens: 10, outputTokens: 5 } }; },
  stream: async () => ({ text: '', usage: { inputTokens: 0, outputTokens: 0 } }),
};
const app = new Hono().route('/api/analysis', analysisRoutes({ llm, papers: {} } as any));
const post = (path: string, body: unknown) => app.request(`/api/analysis${path}`, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });

beforeEach(() => { state.calls = []; state.tasks = []; state.spent = 0; state.refunded = 0; });

describe('citation map', () => {
  it('shows a seed with its references and citing papers, and saves it to History', async () => {
    const response = await post('/citation-map', { seeds: [{ work_id: 'W1' }] });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.seeds.map((node: MapNode) => node.id)).toEqual(['W1']);
    expect(body.references.map((node: MapNode) => node.id).sort()).toEqual(['W10', 'W20']);
    expect(body.citations.map((node: MapNode) => node.id)).toEqual(['W40', 'W41']);
    expect(state.calls.some((call) => call.params.filter === 'cites:W1')).toBe(true);
    expect(state.tasks[0]).toMatchObject({ kind: 'citation_map', title: 'Seed paper on sleep' });
  });

  it('ranks the next snowball round by how many papers of the set link to each one', async () => {
    const response = await post('/citation-map/snowball', { ids: ['W1', 'W2'], direction: 'backward' });
    const { candidates } = await response.json();
    expect(candidates[0]).toMatchObject({ id: 'W10', links: 2 });
    expect(candidates.slice(1).map((node: MapNode) => node.links)).toEqual([1, 1]);
  });

  it('finds reviews that cite the set and counts how many set papers each cites', async () => {
    const { reviews } = await (await post('/citation-map/reviews', { ids: ['W1', 'W2'] })).json();
    expect(reviews.map((node: MapNode) => node.id)).toEqual(['W77', 'W40']);
    expect(reviews[0]).toMatchObject({ links: 2, study_type: 'review' });
    expect(reviews[1].study_type).toBe('meta-analysis');
  });

  it('ranks by links, then citations, leaving out papers already in the set', () => {
    const node = (id: string, cited: number) => ({ id, cited_by_count: cited } as MapNode);
    const ranked = rankByLinks([{ from: 'A', nodes: [node('X', 1), node('Y', 50), node('A', 9)] }, { from: 'B', nodes: [node('X', 1)] }], new Set(['A']));
    expect(ranked.map((item) => [item.id, item.links])).toEqual([['X', 2], ['Y', 1]]);
  });
});

describe('landscape', () => {
  it('counts works by year (gaps filled), topic and open access, labelled as OpenAlex', async () => {
    const { landscape } = await (await post('/landscape', { query: 'sleep memory', from_year: 2019 })).json();
    expect(landscape.years).toEqual([
      { key: '2019', label: '2019', count: 3 }, { key: '2020', label: '2020', count: 0 }, { key: '2021', label: '2021', count: 5 },
    ]);
    expect(landscape.topics).toEqual([{ key: 'T1', label: 'Sleep and memory', count: 7 }]);
    expect(landscape.open_access).toEqual({ open: 6, closed: 2, share: 0.75 });
    expect(landscape).toMatchObject({ total: 8, source: 'OpenAlex' });
    expect(state.calls.find((call) => call.params.group_by === 'publication_year')?.params.filter).toBe('from_publication_date:2019-01-01');
  });

  it('reads group_by rows and fills missing years', () => {
    expect(groupCounts({ group_by: [{ key: 'https://openalex.org/S1', key_display_name: 'Nature', count: 4 }] })).toEqual([{ key: 'S1', label: 'Nature', count: 4 }]);
    expect(yearSeries([{ key: '2001', label: '2001', count: 1 }, { key: '2003', label: '2003', count: 2 }]).map((row) => row.count)).toEqual([1, 0, 2]);
  });
});

describe('data lab report', () => {
  const body = { title: 'Tutoring', dataset: 'scores.csv', n: 12, columns: [{ name: 'score', kind: 'numeric', summary: 'M = 72.42' }], results: [{ title: 'Welch t-test', rows: [['t', '2.31']], apa: 't(9.8) = 2.31, p = .044' }] };

  it('costs 2 credits, sends only the computed numbers and saves the report', async () => {
    const response = await post('/data/report', body);
    expect(response.status).toBe(200);
    expect(state.spent).toBe(2);
    expect(state.refunded).toBe(0);
    expect(state.llm).toContain('t(9.8) = 2.31, p = .044');
    expect(state.llm).toContain('never compute');
    expect(state.tasks[0]).toMatchObject({ kind: 'data', credits: 2 });
  });

  it('builds a prompt that lists each result and forbids new numbers', () => {
    const messages = dataReportPrompt({ question: 'Does tutoring help?', dataset: 'x.csv', n: 3, columns: [], results: [{ title: 'R', rows: [['r', '.42']] }], level: 'a student' });
    expect(messages[1].content).toContain('- r: .42');
    expect(messages[0].content).toContain('Use only the numbers given');
  });

  it('rejects a raw dataset unless saving it was explicitly selected', async () => {
    const response = await post('/data/save', { ...body, dataset_snapshot: 'secret,values\n1,2' });
    expect(response.status).toBe(422);
    expect(state.tasks).toHaveLength(0);
  });

  it('checks the fingerprint, saves opted-in data separately, and keeps it out of the AI prompt', async () => {
    const { createHash } = await import('node:crypto');
    const snapshot = 'private_record,score\nCONFIDENTIAL_PARTICIPANT,81';
    const sha = createHash('sha256').update(snapshot).digest('hex');
    const reproduction = { schema: 1, software: 'data-lab-2026-11-12', created_at: new Date().toISOString(), dataset_sha256: sha, rows: 1, columns: ['private_record', 'score'], truncated: false, column_kinds: {}, transformations: [], analyses: [], notes: '' };
    expect((await post('/data/save', { ...body, save_dataset: true, dataset_snapshot: snapshot + 'tampered', reproducibility: reproduction })).status).toBe(422);
    const response = await post('/data/report', { ...body, save_dataset: true, dataset_snapshot: snapshot, reproducibility: reproduction });
    expect(response.status).toBe(200);
    expect(state.tasks[0].result.dataset_snapshot).toBe(snapshot);
    expect(state.tasks[0].result.reproducibility.dataset_sha256).toBe(sha);
    expect(state.llm).not.toContain('CONFIDENTIAL_PARTICIPANT');
  });
});

describe('data lab statistics', () => {
  it('has a normal distribution accurate to published values', () => {
    expect(normalQuantile(0.975)).toBeCloseTo(1.959964, 5);
    expect(normalQuantile(0.8)).toBeCloseTo(0.841621, 5);
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 4);
  });

  it('fits a line: slope 0.6, intercept 2.2, R² .60 on a textbook example', () => {
    const result = linearRegression([1, 2, 3, 4, 5], [2, 4, 5, 4, 5], ['x', 'y']);
    expect(Object.fromEntries(result.rows)).toMatchObject({ 'Slope (b)': '0.600', Intercept: '2.200', 'R²': '.60', t: '2.12', df: '3' });
  });

  it('runs Mann-Whitney U with fully separated groups (U = 0, p ≈ .05)', () => {
    const result = mannWhitney([1, 2, 3, 4, 5, 6], ['a', 'a', 'a', 'b', 'b', 'b'], ['score', 'group']);
    expect(Object.fromEntries(result.rows)).toMatchObject({ U: '0.0', z: '-1.96', 'p (two-tailed)': 'p = .050' });
  });

  it('matches G*Power sample sizes for t-tests and two proportions', () => {
    expect(sampleSizeT(0.5)).toBe(64);
    expect(sampleSizeT(0.8)).toBe(26);
    expect(sampleSizeT(0.5, 0.05, 0.8, 'paired')).toBe(34);
    expect(sampleSizeProportions(0.5, 0.6)).toBe(388);
    expect(powerT(0.5, 64)).toBeCloseTo(0.807, 2);
  });

  it('recommends the test for the design', () => {
    expect(chooseTest({ goal: 'compare', outcome: 'numeric', groups: 'two', paired: false, normal: 'yes' }).test).toBe('Independent t-test (Welch)');
    expect(chooseTest({ goal: 'compare', outcome: 'numeric', groups: 'two', paired: false, normal: 'no' }).test).toBe('Mann-Whitney U test');
    expect(chooseTest({ goal: 'compare', outcome: 'numeric', groups: 'three-plus', paired: true, normal: 'yes' }).test).toBe('Repeated-measures ANOVA');
    expect(chooseTest({ goal: 'relate', outcome: 'categorical', groups: 'none', paired: false, normal: 'unsure' }).test).toBe('Chi-square test of independence');
    expect(chooseTest({ goal: 'predict', outcome: 'categorical', groups: 'none', paired: false, normal: 'unsure' }).test).toBe('Logistic regression');
  });

  it('exports CSV and RIS', () => {
    expect(toCsv([['a', 'b, c'], [1, null]])).toBe('a,"b, c"\r\n1,');
    expect(toRis([{ title: 'T', authors: ['A B'], year: 2020, doi: '10.1/x' }])).toBe('TY  - JOUR\r\nTI  - T\r\nAU  - A B\r\nPY  - 2020\r\nDO  - 10.1/x\r\nER  - ');
  });
});
