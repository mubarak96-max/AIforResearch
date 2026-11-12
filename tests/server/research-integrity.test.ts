import { describe, expect, it, vi } from 'vitest';
import { checkClaims, checkReferences, claimCoverage, evidenceScore, planResearch, publicSource, uncitedSentences } from '../../lib/server/lib/researchPipeline.js';
import { net } from '../../lib/server/lib/sources/http.js';
import { consensusOf, researchPrompt, usage0, type ResearchInput, type ResearchSource } from '../../lib/server/lib/research.js';
import { methodsText } from '../../lib/server/lib/researchReport.js';
import { titleKey } from '../../lib/server/lib/sources/classify.js';
import type { LlmSlot } from '../../lib/server/slots/types.js';

const source = (n = 1, overrides: Partial<ResearchSource> = {}): ResearchSource => ({
  n, marker: `S${n}`, kind: 'paper', id: `paper-${n}`, title: `Paper ${n}`, authors: [], more_authors: 0, year: 2020,
  venue: null, doi: null, url: null, pdf_url: null, is_oa: false, cited_by_count: 0, study_type: null,
  study_type_label: null, journal_tier: null, is_preprint: false, is_retracted: false, providers: ['openalex'],
  abstract: 'Participants reported greater confidence after practice.', tldr: null, ...overrides,
});
const claim = (n = 1) => ({ text: `Practice improved confidence [S${n}].`, markers: [n] });
const model = (response: unknown) => ({
  complete: vi.fn(async () => ({ text: typeof response === 'string' ? response : JSON.stringify(response), usage: usage0() })),
}) as unknown as LlmSlot;

describe('claim verification integrity', () => {
  it('finds uncited prose candidates without counting tables, captions, headings or references', () => {
    const uncited = 'Participants reported improved confidence after regular practice.';
    const markdown = [
      '# A descriptive heading without a source',
      `${uncited} A separate result was reported by the study [S1].`,
      'Is there a difference between the treatment and comparison groups?',
      'This report summarizes the current evidence and its limitations.',
      '| Sample | Participants reported improved confidence after regular practice. |',
      'Sample | Participants reported improved confidence after regular practice.',
      'Figure 1: Participants reported improved confidence after regular practice.',
      'Table 2. Participants reported improved confidence after regular practice.',
      '![Participants reported improved confidence after regular practice.](figure.png)',
      '```text', uncited, '```',
      '## 7. References', 'Author A. A long article title describing improved confidence after practice. 2024.',
    ].join('\n');
    expect(uncitedSentences(markdown)).toEqual([uncited]);
  });

  it('finds long uncited sentences in non-Latin prose without making a factuality judgment', () => {
    const sentence = '参加者は毎日の練習を続けることで学習の成果に対する自信が改善したと報告しました。';
    expect(uncitedSentences(`${sentence}\n## 参考文献\n${sentence}`)).toEqual([sentence]);
  });

  it('keeps unavailable reference checks and excluded registries distinct from absent DOIs', async () => {
    const sources = [source(1, { doi: '10.1234/integrity-unavailable' }), source(2, { doi: '10.48550/arXiv.2401.12345' }), source(3), source(4, { doi: '10.1234/over-limit' })];
    const original = net.fetch;
    net.fetch = async () => new Response(null, { status: 403 });
    try { await checkReferences(sources, 1); } finally { net.fetch = original; }
    expect(sources.map((item) => item.check?.status)).toEqual(['unverified', 'unverified', 'no_doi', 'unverified']);
    expect(sources[0].check).toMatchObject({ attempted: true, notices_checked: false });
    expect(sources[3].check).toMatchObject({ attempted: false });
  });

  it('does not claim a notice check succeeded just because the DOI record matched', async () => {
    const sources = [source(1, { doi: '10.1234/integrity-notices-fail' })];
    const original = net.fetch;
    net.fetch = async (url) => String(url).includes('/works?') ? new Response(null, { status: 403 }) : Response.json({ message: { title: ['Paper 1'] } });
    try { await checkReferences(sources, 1); } finally { net.fetch = original; }
    expect(sources[0].check).toMatchObject({ status: 'confirmed', notices_checked: false, note: expect.stringContaining('did not complete') });
  });

  it('leaves malformed Crossref responses unverified rather than treating them as missing records', async () => {
    const sources = [source(1, { doi: '10.1234/integrity-malformed' })];
    const original = net.fetch;
    net.fetch = async () => Response.json({});
    try { await checkReferences(sources, 1); } finally { net.fetch = original; }
    expect(sources[0].check).toMatchObject({ status: 'unverified', attempted: true, notices_checked: false });
  });
  it.each([
    'not JSON', {}, { items: {} }, { items: [] }, { items: [{ i: 0, v: 'probably' }] },
    { items: [{ i: '0', v: 'yes' }] }, { items: [{ i: 99, v: 'yes' }] },
    { items: [{ i: 0, v: 'yes' }, { i: 0, v: 'no' }] },
  ])('does not convert incomplete or malformed assessments into support: %j', async (response) => {
    const result = await checkClaims(model(response), [claim()], [source()], usage0());
    expect(result[0].verdict).toBe('unverified');
  });

  it('leaves failed checks unverified while propagating an explicit cancellation', async () => {
    const llm = { complete: vi.fn(async () => { throw new Error('provider unavailable'); }) } as unknown as LlmSlot;
    expect((await checkClaims(llm, [claim()], [source()], usage0()))[0].verdict).toBe('unverified');
    const cancelled = new AbortController();
    cancelled.abort();
    await expect(checkClaims(llm, [claim()], [source()], usage0(), cancelled.signal)).rejects.toThrow('provider unavailable');
  });

  it('accepts only returned valid assessments and keeps omitted claims unverified', async () => {
    const results = await checkClaims(model({ items: [{ i: 0, v: 'yes' }, { i: 2, v: 'no', note: 'The passage reports the opposite.' }] }),
      [claim(1), claim(2), claim(3)], [source(1), source(2), source(3)], usage0());
    expect(results.map((item) => item.verdict)).toEqual(['yes', 'unverified', 'no']);
  });

  it('refuses to verify unavailable source text or partially missing references', async () => {
    const llm = model({ items: [{ i: 0, v: 'yes' }, { i: 1, v: 'yes' }] });
    const result = await checkClaims(llm, [claim(1), { ...claim(2), markers: [2, 3] }], [source(1, { abstract: null }), source(2)], usage0());
    expect(result.map((item) => item.verdict)).toEqual(['unverified', 'unverified']);
    expect(llm.complete).not.toHaveBeenCalled();
  });

  it('checks original source text rather than laundering an AI-generated finding as evidence', async () => {
    const llm = model({ items: [{ i: 0, v: 'yes' }] });
    await checkClaims(llm, [claim()], [source(1, { finding: 'Fabricated extra finding 7777', passage: '[Page 4] Original passage.' })], usage0());
    const prompt = vi.mocked(llm.complete).mock.calls[0][0].messages.map((message) => message.content).join(' ');
    expect(prompt).toContain('[Page 4] Original passage.');
    expect(prompt).toContain('Basis: full_text_excerpt');
    expect(prompt).not.toContain('Fabricated extra finding 7777');
  });

  it('accounts for failed assessments and claims beyond the depth limit separately', () => {
    expect(claimCoverage(5, [{ verdict: 'yes', note: null }, { verdict: 'unverified', note: 'failed' }, { verdict: 'no', note: null }]))
      .toEqual({
        total: 5, attempted: 3, completed: 2, checked: 2, no_source_text: 0,
        supported: 1, partly: 0, unsupported: 1, unverified: 3, not_checked: 2,
      });
  });

  it('does not count claims without source text as attempted checks', () => {
    const coverage = claimCoverage(3, [
      { verdict: 'yes', note: null },
      { verdict: 'unverified', note: 'no text', skipped: 'no_source_text' },
      { verdict: 'unverified', note: 'failed' },
    ]);
    expect(coverage).toMatchObject({ attempted: 2, no_source_text: 1, completed: 1, unverified: 2 });
  });

  it('retains evidence passages in saved/public sources and labels metadata-only material', () => {
    expect(publicSource(source(1, { passage: '[Page 7] Exact passage.', full_text: true })))
      .toMatchObject({ passage: '[Page 7] Exact passage.', evidence_basis: 'full_text_excerpt' });
    expect(publicSource(source(1, { abstract: null }))).toMatchObject({ evidence_basis: 'metadata_only' });
    expect(publicSource(source(1, { abstract: null, tldr: 'An automated source summary.' }))).toMatchObject({ evidence_basis: 'source_summary' });
  });
});

describe('research approach and language', () => {
  const paper = (overrides: Partial<Parameters<typeof evidenceScore>[0]> = {}) => ({ study_type: null, cited_by_count: 0, year: 1900, journal: null, is_preprint: false, ...overrides });

  it('does not demote primary texts for age, journal standing or citation count in humanities/general research', () => {
    for (const method of ['humanities', 'general'] as const) {
      expect(evidenceScore(paper(), 3, 2026, method)).toBe(evidenceScore(paper({ year: 2026, cited_by_count: 50000, study_type: 'rct' }), 3, 2026, method));
    }
  });

  it('prefers qualitative-method fit for qualitative inquiry while keeping the clinical score compatible', () => {
    expect(evidenceScore(paper({ study_type: 'qualitative' }), 3, 2026, 'qualitative'))
      .toBeGreaterThan(evidenceScore(paper({ study_type: 'rct' }), 3, 2026, 'qualitative'));
    expect(evidenceScore(paper({ study_type: 'rct' }), 3, 2026, 'clinical'))
      .toBe(evidenceScore(paper({ study_type: 'rct' }), 3, 2026));
    expect(consensusOf([source(1, { stance: 'supports' }), source(2, { stance: 'supports' })], 'humanities')).toBeNull();
  });

  it('retains distinct non-Latin titles during deduplication', () => {
    expect(titleKey('研究甲')).not.toBe(titleKey('研究乙'));
    expect(titleKey('الصحة والتعليم')).not.toBe(titleKey('الصحة والعمل'));
    expect(titleKey('Éducation: 2026')).toBe(titleKey('Education 2026'));
    expect(titleKey('अनुसंधान')).not.toBe('');
    expect(titleKey('कि')).not.toBe(titleKey('कु'));
  });

  it('plans in user-selected source languages without restricting by location', async () => {
    const llm = model({ sub_questions: [{ question: 'どのように学ぶか', queries: ['学習 記憶'] }] });
    await planResearch(llm, 'どのように学ぶか', 'deep', usage0(), undefined, { method: 'qualitative', searchLanguages: ['Japanese', 'Arabic'] });
    const prompt = vi.mocked(llm.complete).mock.calls[0][0].messages.map((message) => message.content).join(' ');
    expect(prompt).toContain('Japanese, Arabic');
    expect(prompt).toContain('reflexivity');
    expect(prompt).not.toContain('keywords for a scholarly search engine, in English');
  });

  it('uses task-appropriate appraisal instructions and honest methods disclosures', () => {
    const input = { question: 'How do accounts differ?', depth: 'summary', groups: ['papers'], filters: {}, headings: true, highQuality: false,
      libraryDocumentIds: [], attachments: [], profile: { role: null, field: null, citation_style: null, language: null }, method: 'humanities' } as ResearchInput;
    expect(researchPrompt(input, [source()])[0].content).toContain('Distinguish primary texts and later interpretations');
    expect(researchPrompt(input, [source()])[0].content).not.toContain('meta-analyses and systematic reviews outweigh');
    const text = methodsText({ groups: [], searches: 1, subQuestions: 1, seeds: 0, prisma: { identified: 1, chased: 0, duplicates: 0, unscreened: 0, screened: 1, excluded: 0, reasons: [], relevant: 1, included: 1, full_text: 0, gap_added: 0, files: 0, web: 0 }, gapSearches: 0, filters: {}, method: 'humanities' });
    expect(text).toContain('unverified claims');
    expect(text).not.toContain('Every cited sentence was then checked');
  });
});
