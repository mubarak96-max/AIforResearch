import { beforeEach, describe, expect, it, vi } from 'vitest';
const fake = await vi.hoisted(async () => (await import('./fakeFirestore.js')).createFakeFirestore());
vi.mock('../../lib/server/firebase.js', async (original) => ({ ...(await original<typeof import('../../lib/server/firebase.js')>()), ...fake.module }));
vi.mock('../../lib/server/lib/projects.js', async () => {
  const { HTTPException } = await import('hono/http-exception');
  return {
    getProjectFor: async () => { throw new HTTPException(404, { message: 'Project not found' }); },
    listProjects: async () => [],
  };
});

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppVariables, AuthUser } from '../../lib/server/auth.js';
import type { Slots } from '../../lib/server/slots/types.js';
import { workflowRoutes } from '../../lib/server/routes/workflows.js';
import { fakeLlm, fakePapers } from './assist-helpers.js';
import { forgetPlans } from '../../lib/server/lib/plans.js';
import { codeFrequency, locateExcerpt, quoteLocator, speakerAt, verifyCodeSuggestions, type WorkbookEntry } from '../../lib/workflows.js';

const USER: AuthUser = { id: 'writer', email: 'writer@example.test', full_name: 'Writer', account_id: 'account', is_admin: false };
const make = (slots?: Slots) => {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use('*', async (c, next) => { c.set('user', USER); await next(); });
  app.route('/api/workbooks', workflowRoutes(slots));
  app.onError((error, c) => error instanceof HTTPException ? c.json({ detail: error.message }, error.status) : c.json({ detail: error.message }, 500));
  return app;
};
const request = (app: ReturnType<typeof make>, path: string, method = 'GET', data?: unknown) => app.request(`/api/workbooks${path}`, { method, headers: { 'content-type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data) });
const entry = (id: string, section: string, values: Record<string, string>): WorkbookEntry => ({ id, section, values, created_at: '', updated_at: '', updated_by: 'writer' });

const TRANSCRIPT = 'Interviewer: How do you get to the clinic?\nP1: I could not travel because the bus was cancelled.\nP1: My sister drove me in the end.\n';
const credits = () => [...fake.store].filter(([path]) => path.includes('/plan_usage/credits__')).reduce((sum, [, value]) => sum + Number(value.amount), 0);

async function workbookWithTranscript(app: ReturnType<typeof make>) {
  let w = await (await request(app, '', 'POST', { kind: 'qualitative', title: 'Access study' })).json() as any;
  w = await (await request(app, `/${w.id}/entries`, 'POST', { revision: w.revision, section: 'sources', values: { title: 'Interview 1', kind: 'transcript', consent: 'approved private use', text: TRANSCRIPT } })).json();
  return w;
}

beforeEach(() => { fake.clear(); forgetPlans(); });

describe('quote locations', () => {
  it('records line numbers and character offsets, and finds the excerpt again', () => {
    const start = TRANSCRIPT.indexOf('the bus was cancelled');
    const locator = quoteLocator(TRANSCRIPT, start, start + 21);
    expect(locator).toBe(`Line 2, characters ${start}–${start + 21}`);
    expect(locateExcerpt(TRANSCRIPT, 'the bus was cancelled', locator)).toEqual({ start, end: start + 21 });
    const across = TRANSCRIPT.indexOf('cancelled.');
    expect(quoteLocator(TRANSCRIPT, across, TRANSCRIPT.indexOf('drove') + 5)).toMatch(/^Lines 2–3, /);
    expect(speakerAt(TRANSCRIPT, start)).toBe('P1');
    expect(locateExcerpt(TRANSCRIPT, 'not in the text')).toBeNull();
  });
});

describe('AI code suggestions are checked against the transcript', () => {
  it('drops suggestions whose quote is not verbatim in the transcript or outside the chosen passage', () => {
    const raw = [
      { label: 'Transport barriers', definition: 'Problems getting there', quote: 'the bus was cancelled' },
      { label: 'Transport barriers', definition: 'Duplicate', quote: 'the bus was cancelled' },
      { label: 'Family support', definition: 'Help from relatives', quote: 'My sister drove me' },
      { label: 'Invented', definition: 'Paraphrase', quote: 'the bus never came' },
      { label: 'Case', definition: 'Wrong letter case', quote: 'The bus was cancelled' },
      { label: '', quote: 'P1' },
      'not an object',
    ];
    const all = verifyCodeSuggestions(TRANSCRIPT, raw, ['transport barriers']);
    expect(all.suggestions.map((item) => item.label)).toEqual(['transport barriers', 'Family support']);
    expect(all.suggestions[0]).toMatchObject({ existing: true, speaker: 'P1', locator: expect.stringMatching(/^Line 2, characters/) });
    expect(all.suggestions[1].existing).toBe(false);
    expect(all.dropped).toBe(5);
    const passage = verifyCodeSuggestions(TRANSCRIPT, raw, [], 'P1: I could not travel because the bus was cancelled.');
    expect(passage.suggestions.map((item) => item.quote)).toEqual(['the bus was cancelled']);
    expect(verifyCodeSuggestions(TRANSCRIPT, null, []).suggestions).toEqual([]);
  });

  it('charges the workbook suggestion price, returns only verified codes, and saves nothing', async () => {
    const llm = fakeLlm(() => JSON.stringify({ codes: [{ label: 'Transport barriers', definition: 'Problems getting there', quote: 'the bus was cancelled' }, { label: 'Made up', definition: 'x', quote: 'I loved the clinic' }] }));
    const app = make({ llm, papers: fakePapers() });
    const w = await workbookWithTranscript(app);
    const response = await request(app, `/${w.id}/suggest-codes`, 'POST', { source_id: w.entries[0].id });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.credits).toBe(3);
    expect(data.dropped).toBe(1);
    expect(data.suggestions).toHaveLength(1);
    expect(data.suggestions[0].quote).toBe('the bus was cancelled');
    expect(credits()).toBe(3);
    expect(fake.read(`workflows/${w.id}`)?.entries).toHaveLength(1);
  });

  it('refunds when no suggestion quotes the transcript', async () => {
    const llm = fakeLlm(() => JSON.stringify({ codes: [{ label: 'Made up', definition: 'x', quote: 'I loved the clinic' }] }));
    const app = make({ llm, papers: fakePapers() });
    const w = await workbookWithTranscript(app);
    const response = await request(app, `/${w.id}/suggest-codes`, 'POST', { source_id: w.entries[0].id, passage: 'My sister drove me in the end.' });
    expect(response.status).toBe(422);
    expect((await response.json()).detail).toContain('credits were returned');
    expect(credits()).toBe(0);
    const outside = await request(app, `/${w.id}/suggest-codes`, 'POST', { source_id: w.entries[0].id, passage: 'Not from this transcript.' });
    expect(outside.status).toBe(422);
  });
});

describe('coding a selected passage', () => {
  it('saves a new code and its excerpt in one revision, then reuses the code', async () => {
    const app = make();
    let w = await workbookWithTranscript(app);
    const sourceId = w.entries[0].id;
    const start = TRANSCRIPT.indexOf('the bus was cancelled');
    const values = { source_id: sourceId, quote: 'the bus was cancelled', locator: quoteLocator(TRANSCRIPT, start, start + 21), speaker: 'P1', codes: 'Transport barriers', negative_case: 'supports', interpretation: '' };
    const missingDefinition = await request(app, `/${w.id}/code-excerpt`, 'POST', { revision: w.revision, values, new_codes: [{ label: 'Transport barriers', definition: '' }] });
    expect(missingDefinition.status).toBe(422);
    const undefinedCode = await request(app, `/${w.id}/code-excerpt`, 'POST', { revision: w.revision, values });
    expect((await undefinedCode.json()).detail).toContain('Define the code');
    const saved = await request(app, `/${w.id}/code-excerpt`, 'POST', { revision: w.revision, values, new_codes: [{ label: 'Transport barriers', definition: 'Problems getting to care' }] });
    expect(saved.status).toBe(200);
    w = await saved.json();
    expect(w.revision).toBe(3);
    expect(w.entries.map((item: WorkbookEntry) => item.section)).toEqual(['sources', 'codes', 'excerpts']);
    // Codebook labels are matched ignoring case; the codebook's wording is kept.
    const again = await request(app, `/${w.id}/code-excerpt`, 'POST', { revision: w.revision, values: { ...values, quote: 'My sister drove me', locator: '', codes: 'transport BARRIERS' }, new_codes: [{ label: 'TRANSPORT barriers', definition: 'dup' }] });
    w = await again.json();
    expect(w.entries.filter((item: WorkbookEntry) => item.section === 'codes')).toHaveLength(1);
    expect(w.entries.at(-1).values.codes).toBe('Transport barriers');
    const fabricated = await request(app, `/${w.id}/code-excerpt`, 'POST', { revision: w.revision, values: { ...values, quote: 'the bus arrived' } });
    expect(fabricated.status).toBe(422);
  });
});

describe('code frequency', () => {
  it('counts coded excerpts by source and by participant, and co-occurrence within excerpts', () => {
    const entries = [
      entry('s1', 'sources', { title: 'Interview 1' }), entry('s2', 'sources', { title: 'Interview 2' }),
      entry('c1', 'codes', { label: 'Transport' }), entry('c2', 'codes', { label: 'Family' }), entry('c3', 'codes', { label: 'Unused' }),
      entry('e1', 'excerpts', { source_id: 's1', speaker: 'P1', codes: 'Transport, Family' }),
      entry('e2', 'excerpts', { source_id: 's1', speaker: 'P1', codes: 'transport' }),
      entry('e3', 'excerpts', { source_id: 's2', speaker: 'P2', codes: 'Transport, Cost' }),
      entry('e4', 'excerpts', { source_id: 's2', speaker: 'P2', codes: '' }),
      entry('e5', 'excerpts', { source_id: 's2', speaker: 'p2', codes: 'Family, Family' }),
    ];
    const bySource = codeFrequency(entries, 'source');
    expect(bySource.codes).toEqual([{ label: 'Transport', total: 3 }, { label: 'Family', total: 2 }, { label: 'Cost', total: 1 }, { label: 'Unused', total: 0 }]);
    expect(bySource.columns.map((column) => column.label)).toEqual(['Interview 1', 'Interview 2']);
    expect(bySource.counts).toEqual([[2, 1], [1, 1], [0, 1], [0, 0]]);
    expect(bySource.cooccurrence[0]).toEqual([3, 1, 1, 0]);
    expect(bySource.cooccurrence[1][0]).toBe(1);
    expect(bySource.uncoded).toBe(1);
    const bySpeaker = codeFrequency(entries, 'speaker');
    expect(bySpeaker.columns.map((column) => column.label)).toEqual(['P1', 'P2']);
    expect(bySpeaker.counts[1]).toEqual([1, 1]);
  });
});
