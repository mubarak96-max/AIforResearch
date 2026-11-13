import { beforeEach, describe, expect, it, vi } from 'vitest';

const fake = await vi.hoisted(async () => (await import('./fakeFirestore.js')).createFakeFirestore());
vi.mock('../../lib/server/firebase.js', async (original) => ({ ...(await original<typeof import('../../lib/server/firebase.js')>()), ...fake.module }));
vi.mock('../../lib/server/usage.js', () => ({ recordUsage: async () => undefined }));

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppVariables } from '../../lib/server/auth.js';
import { forgetPlans } from '../../lib/server/lib/plans.js';
import { systematicReviewRoutes } from '../../lib/server/routes/systematicReview.js';
import { exclusionReasons, reasonKey, screeningDocuments, type DocumentsInput, type DocumentsRecord } from '../../lib/server/lib/systematicReviewDocuments.js';
import { PRESETS } from '../../lib/server/lib/systematicReviewStats.js';
import { USER, fakeLlm, fakePapers } from './assist-helpers.js';

const final = (decision: 'include' | 'exclude' | 'maybe', reason: string | null = null) => ({ status: 'final' as const, decision, reason });
const pending = { status: 'pending' as const, decision: null, reason: null };
const record = (id: string, title: string, title_state: DocumentsRecord['title_state'], full_state: DocumentsRecord['full_state'] = null, extra: Partial<DocumentsRecord> = {}): DocumentsRecord =>
  ({ id, title, authors: ['Ana Silva', 'Ben Ode'], year: 2021, duplicate_of: null, title_state, full_state, ...extra });

const INPUT: DocumentsInput = {
  review: {
    title: 'Naps in shift workers', question: 'Do naps improve alertness in night-shift nurses?', review_type: 'systematic', framework: 'PICO',
    framework_fields: { population: 'Night-shift nurses', intervention: 'Planned naps', outcome: 'Alertness' },
    include_criteria: ['Adults working night shifts', 'Randomised or controlled design'], exclude_criteria: ['Animal studies'],
  },
  records: [
    record('r1', 'Planned naps and alertness', final('include'), final('include')),
    record('r2', 'Naps in pilots', final('exclude', 'Wrong population: pilots, not nurses')),
    record('r3', 'Caffeine in nurses', final('include'), final('exclude', 'Wrong intervention or exposure')),
    record('r4', 'A blinded record', pending, null, { blinded: { title: true, full: false } }),
    record('r5', 'Duplicate of r1', final('include'), null, { duplicate_of: 'r1' }),
    record('r6', 'Napping editorial', final('exclude', 'Editorial only')),
  ],
  reviewers: [{ id: 'u1', name: 'Ana' }],
  audit: [
    { action: 'vote', actor: 'u1', record_id: 'r2', stage: 'title', after: { decision: 'exclude', reason: 'Wrong population' }, at: '2026-11-02T10:00:00.000Z' },
    { action: 'ai_suggestion', actor: 'ai', record_id: 'r1', stage: 'title', after: { decision: 'include', reason: 'Fits.' }, at: '2026-11-01T09:00:00.000Z' },
    { action: 'vote', actor: 'u2', record_id: 'r4', stage: 'title', after: null, at: '2026-11-03T10:00:00.000Z', blinded: true },
    { action: 'protocol_updated', actor: 'u1', record_id: null, stage: null, at: '2026-10-01T10:00:00.000Z' },
  ],
  generated: '2026-11-13T12:00:00.000Z',
};

describe('screening documents built from a review', () => {
  const docs = screeningDocuments(INPUT);

  it('builds both screening forms from the framework and the eligibility criteria', () => {
    expect(docs.title).toBe('Naps in shift workers: screening documents');
    expect(docs.markdown).toContain('# Title and abstract screening form');
    expect(docs.markdown).toContain('# Full-text screening form');
    expect(docs.markdown).toContain('| Population | Night-shift nurses | ☐ Yes   ☐ No   ☐ Unclear |');
    expect(docs.markdown).toContain('| Comparison | [Not set in the protocol] |');
    expect(docs.markdown).toContain('| Adults working night shifts | ☐ Yes   ☐ No   ☐ Unclear |');
    expect(docs.markdown).toContain('| Animal studies |');
    expect(docs.markdown).toContain('☐ Include   ☐ Exclude   ☐ Maybe');
    expect(docs.markdown).toContain('Full text obtained');
    for (const reason of PRESETS.systematic.reasons) expect(docs.markdown).toContain(`- ☐ ${reason}`);
    expect(docs.blocks.filter((block) => block.type === 'pageBreak')).toHaveLength(3);
  });

  it('lists the exclusion reasons in use with counts, free-text reasons after the listed ones', () => {
    const reasons = exclusionReasons('systematic', INPUT.records);
    expect(reasons.find((item) => item.reason === 'Wrong population')).toEqual({ reason: 'Wrong population', title: 1, full: 0, listed: true });
    expect(reasons.find((item) => item.reason === 'Wrong intervention or exposure')).toMatchObject({ title: 0, full: 1 });
    expect(reasons.at(-1)).toEqual({ reason: 'Editorial only', title: 1, full: 0, listed: false });
    expect(reasonKey('wrong population: adults', ['Wrong population'])).toBe('Wrong population');
    expect(docs.markdown).toContain('| Editorial only | 1 | 0 | No (free text) |');
  });

  it('logs decisions by record without duplicates or blinded decisions, and the screening history in order', () => {
    expect(docs.markdown).toContain('5 records screened (1 duplicate removed before screening)');
    expect(docs.markdown).toContain('| 1 | Silva et al. 2021: Planned naps and alertness | Include | Include |');
    expect(docs.markdown).toContain('| 3 | Silva et al. 2021: Caffeine in nurses | Include | Exclude | Wrong intervention or exposure |');
    expect(docs.markdown).toContain('| 4 | Silva et al. 2021: A blinded record | Not shown until you decide |');
    expect(docs.markdown).not.toContain('Duplicate of r1');
    const history = docs.markdown.slice(docs.markdown.indexOf('## Screening history'));
    expect(history.indexOf('AI suggestion')).toBeLessThan(history.indexOf('Reviewer decision'));
    expect(history).toContain('| 2026-11-02 10:00 | Reviewer decision | Silva et al. 2021: Naps in pilots | Title and abstract | Ana | Exclude: Wrong population |');
    expect(history).toContain('| Reviewer | Not shown until you decide |');
    expect(history).not.toContain('protocol');
  });
});

describe('GET /api/systematic-reviews/:id/screening-documents', () => {
  beforeEach(() => { fake.clear(); forgetPlans(); });

  it('returns blocks and Markdown for the review, free', async () => {
    const app = new Hono<{ Variables: AppVariables }>();
    app.use('*', async (c, next) => { c.set('user', USER); await next(); });
    app.route('/api/systematic-reviews', systematicReviewRoutes({ llm: fakeLlm(''), papers: fakePapers() }));
    app.onError((caught, c) => c.json({ detail: caught.message }, caught instanceof HTTPException ? caught.status : 500));
    const json = (path: string, method = 'GET', body?: unknown) => app.request(path, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    const created = await (await json('/api/systematic-reviews', 'POST', { title: 'Naps', question: 'Do naps help?', review_type: 'scoping', include_criteria: ['Nurses'] })).json();
    const response = await json(`/api/systematic-reviews/${created.id}/screening-documents`);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.title).toBe('Naps: screening documents');
    expect(body.blocks[0]).toMatchObject({ type: 'heading', props: { level: 1 } });
    expect(body.markdown).toContain('# PCC elements');
    expect(body.markdown).toContain('| Nurses |');
    expect(body.markdown).toContain('- ☐ Wrong concept');
    expect((await json('/api/systematic-reviews/missing/screening-documents')).status).toBe(404);
  });
});
