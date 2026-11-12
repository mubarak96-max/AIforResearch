import { beforeEach, describe, expect, it, vi } from 'vitest';

const fake = await vi.hoisted(async () => (await import('./fakeFirestore.js')).createFakeFirestore());
vi.mock('../../lib/server/firebase.js', async (original) => ({ ...(await original<typeof import('../../lib/server/firebase.js')>()), ...fake.module }));
const search = vi.hoisted(() => ({ papers: [] as any[] }));
vi.mock('../../lib/server/lib/sources/index.js', async (original) => ({
  ...(await original<typeof import('../../lib/server/lib/sources/index.js')>()),
  searchSources: async () => ({ papers: search.papers, web: [], counts: {}, errors: [] }),
}));

import { Hono } from 'hono';
import type { LlmSlot } from '../../lib/server/slots/types.js';
import { emptyPaper } from '../../lib/server/lib/sources/types.js';
import { evidenceStrength, firstWords, mergeReviews, partsOf, quoteInText, referenceSection, runClaimCheck, splitSections } from '../../lib/server/lib/reviewer.js';
import { parseReference, splitReferences, titleSimilarity, citingSentences, type ReferenceCheck } from '../../lib/server/lib/reviewerCitations.js';
import { blocksToText, reviewCredits, reviewerRoutes } from '../../lib/server/routes/reviewer.js';
import { creditSummary, forgetPlans } from '../../lib/server/lib/plans.js';

const THESIS = `# Introduction
${'Sleep matters for learning in students. '.repeat(60)}
# Methods
We recruited 40 students and compared recall after sleep or wake. ${'The design was simple and repeated. '.repeat(60)}
# Results
${'Recall was higher after sleep in most participants. '.repeat(40)}
# References
Diekelmann, S., & Born, J. (2010). The memory function of sleep. Nature Reviews Neuroscience, 11(2), 114-126. https://doi.org/10.1038/nrn2762
`;

describe('Reviewer helpers', () => {
  it('splits a document by headings and finds the reference list', () => {
    const sections = splitSections(THESIS.replace(/# References[\s\S]+$/, ''));
    expect(sections.map((section) => section.heading)).toEqual(['Introduction', 'Methods', 'Results']);
    expect(referenceSection(THESIS)).toContain('Diekelmann');
    expect(splitSections('2.1 Sampling strategy\nWe sampled schools.\nCHAPTER 3\nText.').map((section) => section.heading)).toEqual(['2.1 Sampling strategy', 'CHAPTER 3']);
  });

  it('groups sections into parts of a set size and cuts long sections at paragraphs', () => {
    const long = { heading: 'Long', text: Array.from({ length: 10 }, () => 'word '.repeat(100)).join('\n\n'), words: 1000 };
    const parts = partsOf([{ heading: 'A', text: 'a', words: 1 }, long], 300);
    expect(parts.length).toBeGreaterThan(3);
    expect(parts.flat().reduce((sum, piece) => sum + piece.words, 0)).toBe(1001);
    expect(firstWords('one two three four', 2)).toBe('one two');
  });

  it('keeps a comment’s quote only when it is in the text, and weights scores by length', () => {
    const merged = mergeReviews(
      { text: '', title: '', docType: 'thesis', level: 'masters', checks: ['structure', 'clarity'], template: '', highQuality: false, preview: false },
      [
        { words: 3000, review: { scores: { structure: { score: 8, reason: 'Clear' }, clarity: { score: 6 } }, comments: [
          { severity: 'minor', criterion: 'clarity', section: 'Methods', quote: 'We recruited 40 students and compared recall', issue: 'Say how they were recruited.', fix: 'Add the sampling.' },
          { severity: 'major', criterion: 'structure', section: 'Results', quote: 'a sentence that is not in the text at all', issue: 'No hypothesis.', fix: 'State it.' },
        ] } },
        { words: 1000, review: { scores: { structure: { score: 4 } }, comments: [{ severity: 'minor', issue: 'Say how they were recruited.' }] } },
      ],
      THESIS,
    );
    expect(merged.scores.find((score) => score.criterion === 'structure')?.score).toBe(7);
    expect(merged.comments.map((comment) => [comment.severity, comment.quote !== null])).toEqual([['major', false], ['minor', true]]);
    expect(merged.issues_by_section).toEqual([{ section: 'Results', major: 1, minor: 0 }, { section: 'Methods', major: 0, minor: 1 }]);
    expect(quoteInText('Recall was higher after sleep', THESIS.toLowerCase().replace(/[^a-z0-9]+/g, ' '))).toBe(true);
  });

  it('prices reviews per 10,000 words, three times in High quality, and the preview flat', () => {
    expect(reviewCredits(9000, 'standard', false)).toBe(10);
    expect(reviewCredits(25000, 'standard', false)).toBe(30);
    expect(reviewCredits(25000, 'high', false)).toBe(90);
    expect(reviewCredits(80000, 'high', true)).toBe(3);
  });

  it('reads an editor document as text with its headings', () => {
    expect(blocksToText([
      { type: 'heading', props: { level: 2 }, content: [{ type: 'text', text: 'Methods' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'We ' }, { type: 'link', content: [{ type: 'text', text: 'sampled' }] }], children: [{ type: 'paragraph', content: [{ type: 'text', text: 'Nested.' }] }] },
    ])).toBe('## Methods\n\nWe sampled\n\nNested.');
  });
});

describe('Citation check helpers', () => {
  it('splits numbered and plain reference lists', () => {
    expect(splitReferences('References\n1. Smith, J. (2020). A first long title here. Journal.\n2. Lee, A. (2019). Second paper title that is long.\n   continued line.')).toEqual([
      'Smith, J. (2020). A first long title here. Journal.', 'Lee, A. (2019). Second paper title that is long. continued line.',
    ]);
    expect(splitReferences('Smith, J. (2020). A first long title here.\nLee, A. (2019). Second paper title here.')).toHaveLength(2);
  });

  it('reads the DOI, title, year and first author of APA, Vancouver and quoted styles', () => {
    expect(parseReference('Diekelmann, S., & Born, J. (2010). The memory function of sleep. Nature Reviews Neuroscience, 11(2). https://doi.org/10.1038/nrn2762.')).toEqual({
      doi: '10.1038/nrn2762', title: 'The memory function of sleep', year: 2010, firstAuthor: 'Diekelmann',
    });
    expect(parseReference('Stickgold R. Sleep-dependent memory consolidation. Nature. 2005;437:1272-8.')).toMatchObject({ title: 'Sleep-dependent memory consolidation', year: 2005 });
    expect(parseReference('J. Smith, “Deep nets for sleep staging,” IEEE Trans., 2021.').title).toBe('Deep nets for sleep staging');
    expect(titleSimilarity('The memory function of sleep', 'The Memory Function of Sleep.')).toBe(1);
  });

  it('finds the sentences that cite a reference by author and year or by number', () => {
    const check = { index: 1, found: { authors: ['Susanne Diekelmann'], year: 2010 } } as unknown as ReferenceCheck;
    const text = 'Sleep helps memory (Diekelmann & Born, 2010). Other work disagrees [3]. Replay matters [2].';
    expect(citingSentences(text, check)).toEqual(['Sleep helps memory (Diekelmann & Born, 2010).', 'Replay matters [2].']);
  });
});

describe('Claim check', () => {
  it('labels each claim from its papers and rates strength from study types, not the model', async () => {
    search.papers = [
      { ...emptyPaper('W1', 'openalex'), title: 'Sleep and memory: a meta-analysis', study_type: 'meta-analysis', abstract: 'Sleep improves recall.' },
      { ...emptyPaper('W2', 'openalex'), title: 'A small study', study_type: null, abstract: 'Mixed.' },
    ];
    const llm = { provider: 'fake', complete: vi.fn(async () => ({ text: JSON.stringify({ items: [{ claim: 0, verdict: 'supported', explanation: 'A meta-analysis supports it.', cited: [1, 9] }] }), usage: { inputTokens: 1, outputTokens: 1 } })), stream: vi.fn() } as unknown as LlmSlot;
    const [result] = await runClaimCheck(llm, ['Sleep improves memory.'], { userId: 'u1' }, { inputTokens: 0, outputTokens: 0 });
    expect(result).toMatchObject({ verdict: 'supported', cited: [1], strength: 'strong' });
    expect(evidenceStrength([{ study_type: 'cohort' }])).toBe('moderate');
    expect(evidenceStrength([])).toBeNull();
  });
});

describe('POST /api/reviewer/review', () => {
  const llm = {
    provider: 'fake',
    complete: vi.fn(async ({ json }: { json?: boolean }) => ({
      text: json ? JSON.stringify({ scores: { structure: { score: 7, reason: 'Clear aims.' }, method: { score: 5 }, clarity: { score: 8 } }, strengths: ['Clear writing'], comments: [
        { severity: 'major', criterion: 'method', section: 'Methods', quote: 'We recruited 40 students', issue: 'No power analysis.', fix: 'Justify the sample size.' },
        { severity: 'minor', criterion: 'clarity', section: 'Results', quote: 'Recall was higher after sleep', issue: 'Report the effect size.', fix: 'Add d and its CI.' },
        { severity: 'minor', criterion: 'clarity', section: 'Results', issue: 'Name the test.', fix: '' },
        { severity: 'minor', criterion: 'structure', section: 'Introduction', issue: 'State the hypothesis.', fix: '' },
      ] }) : 'Ready after the method is justified.',
      usage: { inputTokens: 10, outputTokens: 10 },
    })),
    stream: vi.fn(),
  } as unknown as LlmSlot;
  const app = new Hono<{ Variables: { user: any } }>();
  app.use('*', async (c, next) => { c.set('user', { id: 'u1', account_id: 'acc-1', email: 'a@b.c', full_name: 'A', is_admin: false }); await next(); });
  app.route('/api/reviewer', reviewerRoutes({ llm, papers: {} as any }) as any);
  app.onError((error: any, c) => c.json({ detail: error.message }, error.status ?? 500));

  beforeEach(() => {
    fake.clear();
    fake.put('accounts/acc-1', { plan: 'free', plan_status: 'none', plan_source: 'default' });
    forgetPlans();
  });

  it('gives Free the preview for 3 credits: the scorecard and the top three comments', async () => {
    const response = await app.request('/api/reviewer/review', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: THESIS.replace(/# References[\s\S]+$/, ''), title: 'Chapter 2', checks: ['structure', 'method', 'clarity'] }) });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ preview: true, credits: 3, overall: 6.7, hidden_comments: 1, verdict: 'Ready after the method is justified.' });
    expect(body.comments).toHaveLength(3);
    expect(body.comments[0].severity).toBe('major');
    expect((await creditSummary('acc-1')).used).toBe(3);
    expect(fake.read(`tasks/${body.task_id}`)).toMatchObject({ kind: 'review', status: 'done', credits: 3 });
  });

  it('refuses High quality below Pro and returns the credits when the review fails', async () => {
    fake.put('accounts/acc-1', { plan: 'plus', plan_status: 'active', plan_source: 'dodo' });
    forgetPlans();
    const high = await app.request('/api/reviewer/review', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: THESIS, quality: 'high' }) });
    expect(high.status).toBe(402);
    (llm.complete as any).mockRejectedValueOnce(new Error('down')).mockRejectedValueOnce(new Error('down')).mockRejectedValueOnce(new Error('down'));
    const failed = await app.request('/api/reviewer/review', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: THESIS.slice(0, 2500), checks: ['clarity'] }) });
    expect(failed.status).toBe(503);
    expect((await creditSummary('acc-1')).used).toBe(0);
  });
});
