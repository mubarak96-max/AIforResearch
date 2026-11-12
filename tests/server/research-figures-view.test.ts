import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FigureView } from '../../components/app/research/figures.js';
import { CitedMarkdown } from '../../components/app/research/parts.js';
import { buildFigures } from '../../lib/server/lib/researchReport.js';
import type { ResearchSource } from '../../lib/server/lib/research.js';

const paper = (n: number, year: number, over: Partial<ResearchSource> = {}): ResearchSource => ({
  n, marker: `S${n}`, kind: 'paper', id: `W${n}`, title: `Paper ${n}`, authors: ['Ana Silva'], more_authors: 0, year, venue: 'J', doi: null, url: null, pdf_url: null,
  is_oa: false, cited_by_count: 0, study_type: 'rct', study_type_label: 'Randomized controlled trial', journal_tier: null, is_preprint: false, is_retracted: false,
  providers: ['openalex'], abstract: null, tldr: null, stance: 'supports', ...over,
});

const papers = [
  paper(1, 2016, { effect: { measure: 'OR', value: 1.3, low: 1.1, high: 1.6, outcome: 'recall' } }),
  paper(2, 2018, { effect: { measure: 'OR', value: 0.9, low: 0.7, high: 1.2, outcome: null }, stance: 'mixed' }),
  paper(3, 2019, { effect: { measure: 'OR', value: 2.1, low: 1.4, high: 3.2, outcome: null }, study_type: 'cohort', study_type_label: 'Cohort study' }),
  paper(4, 2021, { stance: 'against', sub_questions: [0] }),
  paper(5, 2024, { stance: 'unclear', sub_questions: [1] }),
];
const plan = { sub_questions: [{ question: 'Does it work?', queries: [] }, { question: 'For whom?', queries: [] }] };
const prisma = { identified: 300, chased: 40, duplicates: 60, unscreened: 10, screened: 230, excluded: 180, reasons: [{ label: 'Off-topic', count: 150 }], relevant: 50, included: 45, full_text: 12, gap_added: 5, files: 1, web: 2 };
const { figures } = buildFigures({ depth: 'detailed', plan, papers, prisma });

describe('figures in the browser', () => {
  it('draws every kind of figure without errors', () => {
    expect(figures.map((figure) => figure.kind)).toEqual(['prisma', 'bars', 'bars', 'stacked', 'bars', 'forest']);
    for (const figure of figures) {
      const html = renderToStaticMarkup(createElement(FigureView, { figure }));
      expect(html).toContain(figure.title);
      expect(html).not.toContain('NaN');
    }
    const forest = renderToStaticMarkup(createElement(FigureView, { figure: figures.at(-1) }));
    expect(forest).toContain('OR and 95% CI (log scale)');
    expect(forest).toContain('2.10 <span class="text-muted">(1.40–3.20)</span>');
  });

  it('draws a figure block inside a report and leaves other code blocks as code', () => {
    const html = renderToStaticMarkup(createElement(CitedMarkdown, { markdown: 'Text [S1].\n\n```figure\nfig-1\n```\n\n```\nplain code\n```', figures }));
    expect(html).toContain('Figure 1. How the sources were found and chosen');
    expect(html).toContain('Papers in the report');
    expect(html).toContain('plain code');
    expect(renderToStaticMarkup(createElement(CitedMarkdown, { markdown: '```figure\nfig-1\n```' }))).toContain('Figure loading');
  });
});
