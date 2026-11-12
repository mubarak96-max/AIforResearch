import { describe, expect, it } from 'vitest';
import { checkedEffect, figuresAsText, numbersIn } from '../../lib/server/lib/researchFigures.js';
import { buildFigures, cleanOutline, comparisonTable, methodsText } from '../../lib/server/lib/researchReport.js';
import { orderedOutput } from '../../lib/server/lib/researchPipeline.js';
import type { ResearchSource } from '../../lib/server/lib/research.js';

const source = (n: number, over: Partial<ResearchSource> = {}): ResearchSource => ({
  n, marker: `S${n}`, kind: 'paper', id: `W${n}`, title: `Paper ${n}`, authors: ['Ana Silva', 'Ben Okoro'], more_authors: 0, year: 2020, venue: 'J',
  doi: null, url: null, pdf_url: null, is_oa: false, cited_by_count: 0, study_type: null, study_type_label: null, journal_tier: null,
  is_preprint: false, is_retracted: false, providers: ['openalex'], abstract: null, tldr: null, ...over,
});

const prisma = { identified: 300, chased: 40, duplicates: 60, unscreened: 0, screened: 240, excluded: 190, reasons: [{ label: 'Off-topic', count: 150 }], relevant: 50, included: 45, full_text: 12, gap_added: 5, files: 0, web: 2 };

describe('effect sizes', () => {
  const text = 'Sleep improved recall (OR 1.32, 95% CI 1.10-1.58; n = 1,204). Risk fell by −0.41 (−0.62 to −0.20).';

  it('reads every number in a text, including ranges and minus signs', () => {
    expect(numbersIn('OR 1.32 (1.10-1.58), d = −0.4')).toEqual([1.32, 1.1, -1.58, -0.4]);
  });

  it('keeps an effect only when all three numbers are written in the paper', () => {
    expect(checkedEffect({ measure: 'odds ratio', value: 1.32, low: 1.1, high: 1.58, outcome: 'recall' }, text)).toEqual({ measure: 'OR', value: 1.32, low: 1.1, high: 1.58, outcome: 'recall' });
    expect(checkedEffect({ measure: 'MD', value: -0.41, low: -0.62, high: -0.2 }, text)).toMatchObject({ measure: 'MD', value: -0.41 });
    // A rounded or invented number, an interval that does not hold the estimate, an unknown measure, a ratio below zero.
    expect(checkedEffect({ measure: 'OR', value: 1.3, low: 1.1, high: 1.58 }, text)).toBeNull();
    expect(checkedEffect({ measure: 'OR', value: 1.32, low: 1.58, high: 1.1 }, text)).toBeNull();
    expect(checkedEffect({ measure: 'NNT', value: 1.32, low: 1.1, high: 1.58 }, text)).toBeNull();
    expect(checkedEffect({ measure: 'RR', value: -0.41, low: -0.62, high: -0.2 }, text)).toBeNull();
    expect(checkedEffect(null, text)).toBeNull();
  });
});

describe('figures', () => {
  it('draws the flow of sources, years in five-year bins, designs, stances and a forest plot from three studies on one measure', () => {
    const papers = [
      source(1, { year: 1990, study_type: 'rct', study_type_label: 'Randomized controlled trial', stance: 'supports', effect: { measure: 'OR', value: 1.3, low: 1.1, high: 1.6, outcome: 'recall' } }),
      source(2, { year: 2001, study_type: 'cohort', study_type_label: 'Cohort study', stance: 'supports', effect: { measure: 'OR', value: 0.9, low: 0.7, high: 1.2, outcome: null } }),
      source(3, { year: 2012, study_type: 'rct', study_type_label: 'Randomized controlled trial', stance: 'mixed', effect: { measure: 'OR', value: 2.1, low: 1.4, high: 3.2, outcome: null } }),
      source(4, { year: 2020, stance: 'against', effect: { measure: 'SMD', value: 0.3, low: 0.1, high: 0.5, outcome: null } }),
      source(5, { year: 2024, stance: 'unclear' }),
    ];
    const { figures, methods, glance } = buildFigures({ depth: 'deep', plan: { sub_questions: [] }, papers, prisma });
    expect(figures.map((figure) => [figure.id, figure.kind])).toEqual([['fig-1', 'prisma'], ['fig-2', 'bars'], ['fig-3', 'bars'], ['fig-4', 'stacked'], ['fig-5', 'forest']]);
    expect(methods).toEqual(['```figure\nfig-1\n```']);
    expect(glance).toHaveLength(4);
    const years = figures[1];
    expect(years.kind === 'bars' && years.data.bars.map((bar) => bar.label)).toEqual(['1990–94', '1995–99', '2000–04', '2005–09', '2010–14', '2015–19', '2020–24']);
    const forest = figures[4];
    expect(forest.kind === 'forest' && forest.data).toMatchObject({ measure: 'OR', log: true, null_value: 1 });
    expect(forest.kind === 'forest' && forest.data.rows.map((row) => row.label)).toEqual(['Silva et al. 1990', 'Silva et al. 2001', 'Silva et al. 2012']);
  });

  it('leaves out the forest plot under three studies, and shows sub-question coverage on Detailed only', () => {
    const papers = [source(1, { effect: { measure: 'HR', value: 1.2, low: 1.1, high: 1.4, outcome: null }, sub_questions: [0] }), source(2, { sub_questions: [0, 1] })];
    const plan = { sub_questions: [{ question: 'A?', queries: [] }, { question: 'B?', queries: [] }] };
    expect(buildFigures({ depth: 'deep', plan, papers, prisma }).figures.map((figure) => figure.kind)).toEqual(['prisma']);
    const detailed = buildFigures({ depth: 'detailed', plan, papers, prisma }).figures;
    expect(detailed[1]).toMatchObject({ kind: 'bars', title: 'Figure 2. Included papers for each sub-question', data: { bars: [{ label: 'Q1. A?', value: 2 }, { label: 'Q2. B?', value: 1 }] } });
  });

  it('turns figures into tables for the editor and the clipboard', () => {
    const { figures } = buildFigures({ depth: 'deep', plan: { sub_questions: [] }, papers: [], prisma });
    const text = figuresAsText('Before.\n\n```figure\nfig-1\n```\n\nAfter. ```figure\nfig-9\n```', figures);
    expect(text).toContain('**Figure 1. How the sources were found and chosen**');
    expect(text).toContain('| Found by citation chasing | 40 |');
    expect(text).toContain('| Added by the gap searches | 5 |');
    expect(text).not.toContain('```');
  });
});

describe('the report', () => {
  it('falls back to a section per sub-question when the outline is unusable, and keeps only real sources', () => {
    const sources = [source(1, { sub_questions: [0] }), source(2, { sub_questions: [1] })];
    const plan = { sub_questions: [{ question: 'Does it work?', queries: [] }, { question: 'For whom?', queries: [] }] };
    expect(cleanOutline('not json', 'deep', plan, sources).sections).toEqual([
      { heading: 'Does it work', focus: 'Does it work?', sources: [1] }, { heading: 'For whom', focus: 'For whom?', sources: [2] },
    ]);
    const outline = cleanOutline(JSON.stringify({ sections: [{ heading: '1. ## Effects [S2]', sources: ['S1', 7] }, { heading: 'Who', sources: [2] }], labels: { summary: 'Resumen' } }), 'deep', plan, sources);
    expect(outline.sections).toEqual([{ heading: 'Effects', focus: '', sources: [1] }, { heading: 'Who', focus: '', sources: [2] }]);
    expect(outline.labels).toMatchObject({ summary: 'Resumen', methods: 'How this review was done' });
  });

  it('says how the review was done from the counts', () => {
    const text = methodsText({ groups: ['papers', 'medical'], searches: 11, subQuestions: 5, seeds: 3, prisma, gapSearches: 4, filters: { fromYear: 2015, excludePreprints: true }, date: new Date('2026-11-12T00:00:00Z') });
    expect(text).toContain('We searched OpenAlex, Semantic Scholar, PubMed and Europe PMC on 12 November 2026, with 11 searches built from the question and 5 sub-questions, limited to papers published from 2015 and peer reviewed (no preprints).');
    expect(text).toContain('which added 40 records');
    expect(text).toContain('the 240 best-matching records were screened by title and abstract and 50 were judged relevant');
    expect(text).toContain('The 40 strongest papers');
    expect(text).toContain('A second round of 4 searches aimed at the gaps the first reading left added 5 papers.');
  });

  it('builds the comparison table from what Read found, and only with three or more papers', () => {
    const rows = [1, 2, 3].map((n) => source(n, { finding: `Finding ${n} | with a pipe`, sample: '40 adults', study_type_label: 'Cohort study' }));
    expect(comparisonTable(rows.slice(0, 2))).toBe('');
    expect(comparisonTable(rows).split('\n')[2]).toBe('| Silva et al. 2020 [S1] | Cohort study | 40 adults | Finding 1 / with a pipe | – |');
  });
});

describe('writers running at once', () => {
  it('sends their text in order, holding later writers until the earlier ones finish', () => {
    const sent: string[] = [];
    const out = orderedOutput(3, (text) => sent.push(text));
    out.push(1, 'B1 ');
    out.push(0, 'A1 ');
    out.push(2, 'C1 ');
    out.finish(1);
    expect(sent).toEqual(['A1 ']);
    out.push(0, 'A2 ');
    out.finish(0);
    expect(sent).toEqual(['A1 ', 'A2 ', 'B1 ', 'C1 ']);
    out.push(2, 'C2');
    out.finish(2);
    expect(sent.join('')).toBe('A1 A2 B1 C1 C2');
  });
});
