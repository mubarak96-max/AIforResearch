import { describe, expect, it } from 'vitest';
import { citedClaims, cleanPlan, evidenceScore, fetchableUrl, mapLimit, openFullText, pickPapers, planSearches } from '../../lib/server/lib/researchPipeline.js';
import { net } from '../../lib/server/lib/sources/http.js';

const paper = (over: Partial<Parameters<typeof evidenceScore>[0]> = {}) => ({ study_type: null, cited_by_count: 0, year: 2020, journal: null, is_preprint: false, ...over });

describe('Plan', () => {
  it('caps the plan, drops repeats and fills empty searches from the sub-question', () => {
    const plan = cleanPlan({
      sub_questions: [
        { question: 'Does sleep improve recall?', queries: ['"sleep" (recall)', 'sleep recall'] },
        { question: 'does sleep improve recall?', queries: ['duplicate'] },
        { question: 'x', queries: [] },
        { question: 'How do naps compare with a night of sleep for memory?', queries: [] },
        { question: 'Too many', queries: ['a b c d'] },
      ],
    }, 2, 3);
    expect(plan.sub_questions).toHaveLength(2);
    expect(plan.sub_questions[0].queries).toEqual(['sleep recall']);
    expect(plan.sub_questions[1].queries[0]).toMatch(/naps/);
    expect(cleanPlan(null, 5, 2)).toEqual({ sub_questions: [] });
  });

  it('searches the question first, then each sub-question in turn', () => {
    const plan = { sub_questions: [{ question: 'A?', queries: ['a one', 'a two'] }, { question: 'B?', queries: ['b one', 'b two'] }] };
    expect(planSearches('The question', plan, 4).map((item) => item.query)).toEqual(['The question', 'a one', 'b one', 'a two']);
    expect(planSearches('The question', plan, 4).map((item) => item.sub)).toEqual([-1, 0, 1, 0]);
  });
});

describe('Rank', () => {
  it('puts a relevant meta-analysis above a relevant case report, and relevance above design', () => {
    const meta = evidenceScore(paper({ study_type: 'meta-analysis', cited_by_count: 300, year: 2021, journal: { name: 'J', h_index: 200, tier: 'top' } }), 3, 2026);
    const caseReport = evidenceScore(paper({ study_type: 'case-report', year: 2021 }), 3, 2026);
    const offTopicMeta = evidenceScore(paper({ study_type: 'meta-analysis', cited_by_count: 300, year: 2021 }), 1, 2026);
    expect(meta).toBeGreaterThan(caseReport);
    expect(caseReport).toBeGreaterThan(offTopicMeta);
    expect(evidenceScore(paper({ is_preprint: true }), 2, 2026)).toBeLessThan(evidenceScore(paper(), 2, 2026));
    expect(meta).toBeLessThanOrEqual(1);
  });

  it('keeps every sub-question covered before filling by score', () => {
    const items = [
      { id: 'a', score: 0.9, subs: [0] }, { id: 'b', score: 0.85, subs: [0] }, { id: 'c', score: 0.8, subs: [0] },
      { id: 'd', score: 0.2, subs: [1] }, { id: 'e', score: 0.1, subs: [] },
    ];
    expect(pickPapers(items, 3, 2).map((item) => item.id)).toEqual(['a', 'b', 'd']);
    expect(pickPapers(items, 3, 1).map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('Verify', () => {
  it('finds the cited sentences and table rows, skipping headings and uncited text', () => {
    const markdown = [
      '## Summary',
      '',
      'Sleep improves recall [S1, S3]. Some say otherwise. Naps help a little in older adults [S2].',
      '- Effects fade after a week [S4].',
      '',
      '| Source | Finding |',
      '| --- | --- |',
      '| Smith 2020 [S1] | Better recall after sleep |',
    ].join('\n');
    expect(citedClaims(markdown)).toEqual([
      { text: 'Sleep improves recall [S1, S3].', markers: [1, 3] },
      { text: 'Naps help a little in older adults [S2].', markers: [2] },
      { text: 'Effects fade after a week [S4].', markers: [4] },
      { text: '| Smith 2020 [S1] | Better recall after sleep |', markers: [1] },
    ]);
  });
});

describe('Read', () => {
  it('fetches only public https links', () => {
    expect(fetchableUrl('https://europepmc.org/article.pdf')?.hostname).toBe('europepmc.org');
    for (const bad of ['http://example.org/a.pdf', 'https://localhost/a.pdf', 'https://10.0.0.5/a.pdf', 'https://[::1]/a.pdf', 'https://metadata.internal/x', 'file:///etc/passwd', null, 'nonsense']) {
      expect(fetchableUrl(bad)).toBeNull();
    }
  });

  it('skips a landing page served instead of a PDF', async () => {
    const real = net.fetch;
    net.fetch = async () => new Response('<html>Sign in</html>', { status: 200, headers: { 'content-type': 'text/html' } });
    try {
      expect(await openFullText('https://publisher.example/paper.pdf', 'sleep')).toBeNull();
    } finally {
      net.fetch = real;
    }
  });

  it('runs work a few at a time, in order', async () => {
    let running = 0;
    let most = 0;
    const out = await mapLimit([1, 2, 3, 4, 5], 2, async (value) => {
      running += 1;
      most = Math.max(most, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running -= 1;
      return value * 2;
    });
    expect(out).toEqual([2, 4, 6, 8, 10]);
    expect(most).toBe(2);
  });
});
