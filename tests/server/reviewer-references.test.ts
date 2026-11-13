import { beforeEach, describe, expect, it, vi } from 'vitest';

const fake = await vi.hoisted(async () => (await import('./fakeFirestore.js')).createFakeFirestore());
vi.mock('../../lib/server/firebase.js', async (original) => ({ ...(await original<typeof import('../../lib/server/firebase.js')>()), ...fake.module }));
const lookups = vi.hoisted(() => ({ checkReference: vi.fn() }));
vi.mock('../../lib/server/lib/reviewerCitations.js', async (original) => ({ ...(await original<typeof import('../../lib/server/lib/reviewerCitations.js')>()), checkReference: lookups.checkReference }));

import { Hono } from 'hono';
import type { LlmSlot } from '../../lib/server/slots/types.js';
import type { ReferenceCheck } from '../../lib/server/lib/reviewerCitations.js';
import { cslFromCheck, dedupeKey, formatCheck, mergeResolved, normaliseTitle, parseReferenceList, toBibtex, toRis, type FormattedReference } from '../../lib/server/lib/reviewerReferences.js';
import { reviewerRoutes } from '../../lib/server/routes/reviewer.js';
import { creditSummary, forgetPlans } from '../../lib/server/lib/plans.js';

const LIST = `References
1. Diekelmann S, Born J. The memory function of sleep. Nat Rev Neurosci. 2010;11:114-26. doi:10.1038/nrn2762
2. Walker, M. P. (2009). The role of sleep in cognition and emotion. Annals of the New York Academy of Sciences, 1156, 168–197.
3. Diekelmann, S., & Born, J. (2010). The memory function of sleep. Nature Reviews Neuroscience, 11(2), 114–126. https://doi.org/10.1038/NRN2762
4. Walker MP. The Role of Sleep in Cognition and Emotion. Ann N Y Acad Sci. 2009;1156:168-97.
5. Smith J. Notes I took at a seminar about sleep, unpublished, no year`;

const found = (title: string, doi: string | null, year: number): ReferenceCheck => ({
  index: 0, text: '', status: 'ok', problems: [], notices: [],
  found: { title, authors: ['Susanne Diekelmann', 'Jan Born'], year, venue: 'Nature Reviews Neuroscience', doi, url: doi ? `https://doi.org/${doi}` : null, type: 'journal-article' },
  biblio: { authors: ['Susanne Diekelmann', 'Jan Born'], more_authors: 0, volume: '11', issue: '2', first_page: '114', last_page: '126' },
});
const missing = (): ReferenceCheck => ({ index: 0, text: '', status: 'not_found', problems: ['No paper with this title was found in Crossref or OpenAlex.'], found: null, notices: [] });

describe('parsing and deduplicating a reference list', () => {
  it('splits a numbered list, merges the same DOI first, then the same normalised title and year', () => {
    const parsed = parseReferenceList(LIST);
    expect(parsed.total).toBe(5);
    expect(parsed.duplicates_removed).toBe(2);
    expect(parsed.references).toHaveLength(3);
    const [sleep, walker, notes] = parsed.references;
    expect(sleep.doi).toBe('10.1038/nrn2762');
    expect(sleep.duplicates).toHaveLength(1);
    expect(sleep.duplicates[0]).toMatch(/^Diekelmann, S\., & Born/);
    expect(walker).toMatchObject({ year: 2009, title: 'The role of sleep in cognition and emotion' });
    expect(walker.duplicates).toHaveLength(1);
    expect(notes.text).toMatch(/^Smith J/);
  });

  it('keeps two entries with the same title apart when their DOIs differ', () => {
    const parsed = parseReferenceList('1. A. Author (2020). A long enough title for testing. J. doi:10.1000/one\n2. A. Author (2020). A long enough title for testing. J. doi:10.1000/two');
    expect(parsed.references).toHaveLength(2);
  });

  it('normalises titles for comparison', () => {
    expect(normaliseTitle('The Rôle of Sleep: in Cognition & Emotion!')).toBe('the role of sleep in cognition emotion');
    expect(dedupeKey({ text: 'x', doi: '10.1/ABC', title: 'T', year: 1 })).toBe('doi:10.1/abc');
    expect(dedupeKey({ text: 'x', doi: null, title: 'The Title.', year: 2001 })).toBe('title:the title|2001');
  });
});

describe('formatting resolved references', () => {
  const ref = (text: string, title: string | null) => ({ index: 0, text, doi: null, title, year: 2010, firstAuthor: null, duplicates: [] as string[] });

  it('builds CSL-JSON from the record found, and keeps unfound references as typed', () => {
    const csl = cslFromCheck(found('The memory function of sleep', '10.1038/nrn2762', 2010), 'ref1')!;
    expect(csl).toMatchObject({ type: 'article-journal', title: 'The memory function of sleep', volume: '11', issue: '2', page: '114-126', DOI: '10.1038/nrn2762', issued: { 'date-parts': [[2010]] } });
    expect(csl.author).toEqual([{ family: 'Diekelmann', given: 'Susanne' }, { family: 'Born', given: 'Jan' }]);
    const kept = formatCheck(ref('Smith J. Notes.', 'Notes about sleep at a seminar'), missing());
    expect(kept).toMatchObject({ status: 'unverified', csl: null, text: 'Smith J. Notes.' });
  });

  it('does not use a record whose title is clearly a different paper', () => {
    const result = formatCheck(ref('X', 'Quantum chromodynamics of heavy mesons'), found('The memory function of sleep', '10.1038/nrn2762', 2010));
    expect(result.status).toBe('unverified');
    expect(result.problems[0]).toMatch(/different title/);
  });

  it('merges two typed references that resolve to the same DOI', () => {
    const a: FormattedReference = { index: 0, text: 'a', status: 'verified', duplicates: [], csl: { id: 'ref1', type: 'article-journal', title: 'T', DOI: '10.1/x' }, problems: [], url: null };
    const b: FormattedReference = { ...a, index: 1, text: 'b', duplicates: [], csl: { ...a.csl!, id: 'ref2' } };
    const merged = mergeResolved([a, b]);
    expect(merged).toHaveLength(1);
    expect(merged[0].duplicates).toEqual(['b']);
  });

  it('writes RIS and BibTeX, with unverified references kept and noted', () => {
    const verified: FormattedReference = { index: 0, text: 'typed', status: 'verified', duplicates: [], csl: cslFromCheck(found('The memory function of sleep', '10.1038/nrn2762', 2010), 'ref1'), problems: [], url: null };
    const unverified: FormattedReference = { index: 1, text: 'Smith J (2001). Notes about sleep at a seminar. Unpublished.', status: 'unverified', duplicates: [], csl: null, problems: [], url: null };
    const ris = toRis([verified, unverified]);
    expect(ris).toContain('TY  - JOUR\r\nAU  - Diekelmann, Susanne\r\nAU  - Born, Jan\r\nTI  - The memory function of sleep');
    expect(ris).toContain('SP  - 114\r\nEP  - 126\r\nDO  - 10.1038/nrn2762');
    expect(ris).toContain('N1  - Not verified. As typed: Smith J (2001). Notes about sleep at a seminar. Unpublished.');
    expect(ris.match(/ER {2}- /g)).toHaveLength(2);
    const bib = toBibtex([verified, verified, unverified]);
    expect(bib).toContain('@article{diekelmann2010memory,');
    expect(bib).toContain('@article{diekelmann2010memoryb,');
    expect(bib).toContain('pages = {114--126}');
    expect(bib).toContain('note = {Not verified. As typed:');
  });
});

describe('POST /api/reviewer/references', () => {
  const llm = {
    provider: 'fake',
    complete: vi.fn(async () => ({ text: JSON.stringify({ items: [{ i: 0, authors: ['John Smith'], title: 'Notes about sleep at a seminar', year: 2001, container: null, type: 'report' }] }), usage: { inputTokens: 5, outputTokens: 5 } })),
    stream: vi.fn(),
  } as unknown as LlmSlot;
  const app = new Hono<{ Variables: { user: any } }>();
  app.use('*', async (c, next) => { c.set('user', { id: 'u1', account_id: 'acc-1', email: 'a@b.c', full_name: 'A', is_admin: false }); await next(); });
  app.route('/api/reviewer', reviewerRoutes({ llm, papers: {} as any }) as any);
  app.onError((error: any, c) => c.json({ detail: error.message }, error.status ?? 500));
  const post = (body: unknown) => app.request('/api/reviewer/references', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

  beforeEach(() => {
    fake.clear();
    fake.put('accounts/acc-1', { plan: 'free', plan_status: 'none', plan_source: 'default' });
    forgetPlans();
    lookups.checkReference.mockReset();
    lookups.checkReference.mockImplementation(async (input: { text: string; doi?: string | null; title?: string | null }) => (input.doi || /cognition/i.test(input.title ?? '')
      ? found(input.doi ? 'The memory function of sleep' : 'The role of sleep in cognition and emotion', input.doi ?? '10.1111/j.1749-6632.2008.04416.x', input.doi ? 2010 : 2009)
      : missing()));
    (llm.complete as any).mockClear();
  });

  it('is free without the cleanup and keeps unverified references as typed', async () => {
    const response = await post({ text: LIST });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.credits).toBe(0);
    expect(body.references).toHaveLength(3);
    expect(body.counts).toEqual({ verified: 2, cleaned: 0, unverified: 1 });
    expect(body.duplicates_removed).toBe(2);
    expect(body.references[2]).toMatchObject({ status: 'unverified', csl: null });
    expect(body.ris).toContain('TY  - JOUR');
    expect(body.bibtex).toContain('@article{');
    expect(llm.complete).not.toHaveBeenCalled();
    expect((await creditSummary('acc-1')).used).toBe(0);
    expect(fake.read(`tasks/${body.task_id}`)).toMatchObject({ kind: 'citation_check', module: 'references', status: 'done' });
  });

  it('charges ai_edit for the cleanup and refunds it when the AI fails', async () => {
    const cleaned = await (await post({ text: LIST, ai_cleanup: true })).json();
    expect(cleaned.credits).toBe(1);
    expect(cleaned.counts).toEqual({ verified: 2, cleaned: 1, unverified: 0 });
    expect(cleaned.references[2].csl).toMatchObject({ title: 'Notes about sleep at a seminar', type: 'report' });
    expect((await creditSummary('acc-1')).used).toBe(1);
    (llm.complete as any).mockRejectedValueOnce(new Error('down'));
    expect((await post({ text: LIST, ai_cleanup: true })).status).toBe(503);
    expect((await creditSummary('acc-1')).used).toBe(1);
  });

  it('does not charge the cleanup when everything was verified', async () => {
    const body = await (await post({ text: LIST.split('\n').slice(0, 5).join('\n'), ai_cleanup: true })).json();
    expect(body.credits).toBe(0);
    expect(llm.complete).not.toHaveBeenCalled();
  });

  it('refuses an empty list', async () => {
    expect((await post({ text: '   ' })).status).toBe(422);
  });
});
