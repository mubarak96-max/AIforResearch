import { describe, expect, it } from 'vitest';
import { classifyStudy } from '../../lib/server/lib/sources/classify.js';
import { applyFilters, mergeResults, sortPapers } from '../../lib/server/lib/sources/index.js';
import { europePmcToFound, journalTier, parseArxivAtom, parsePubmedXml, pubmedTerm } from '../../lib/server/lib/sources/providers.js';
import { emptyPaper, type FoundPaper } from '../../lib/server/lib/sources/types.js';
import { consensusOf, parseJson, relevantPassages, type ResearchSource } from '../../lib/server/lib/research.js';

const PUBMED = `<?xml version="1.0"?><PubmedArticleSet><PubmedArticle><MedlineCitation><PMID Version="1">20046194</PMID><Article>
<Journal><Title>Nature reviews. Neuroscience</Title><JournalIssue><PubDate><Year>2010</Year></PubDate></JournalIssue></Journal>
<ArticleTitle>The memory function of sleep.</ArticleTitle>
<Abstract><AbstractText Label="BACKGROUND">Sleep has been identified as a state that optimizes the consolidation of newly acquired information &amp; memory.</AbstractText><AbstractText>Second part.</AbstractText></Abstract>
<AuthorList><Author><LastName>Diekelmann</LastName><ForeName>Susanne</ForeName></Author><Author><LastName>Born</LastName><ForeName>Jan</ForeName></Author></AuthorList>
<PublicationTypeList><PublicationType UI="D016428">Journal Article</PublicationType><PublicationType UI="D016454">Review</PublicationType></PublicationTypeList>
</Article></MedlineCitation><PubmedData><ArticleIdList><ArticleId IdType="pubmed">20046194</ArticleId><ArticleId IdType="doi">10.1038/nrn2762</ArticleId></ArticleIdList></PubmedData></PubmedArticle></PubmedArticleSet>`;

const ARXIV = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><id>http://arxiv.org/abs/2101.00001v2</id><published>2021-01-01T00:00:00Z</published>
<title>Sleep  and
 memory in neural networks</title><summary>We study replay.</summary><author><name>A. Researcher</name></author>
<link title="pdf" href="http://arxiv.org/pdf/2101.00001v2" rel="related" type="application/pdf"/></entry></feed>`;

const paper = (over: Partial<FoundPaper>): FoundPaper => ({ ...emptyPaper(over.id ?? 'x', 'openalex'), ...over });

describe('scholarly sources', () => {
  it('reads PubMed records: authors, abstract sections, DOI, year and study type', () => {
    const [record] = parsePubmedXml(PUBMED);
    expect(record).toMatchObject({
      pmid: '20046194', doi: '10.1038/nrn2762', year: 2010, venue: 'Nature reviews. Neuroscience', title: 'The memory function of sleep.',
      study_type: 'review', url: 'https://pubmed.ncbi.nlm.nih.gov/20046194/',
    });
    expect(record.authors.map((author) => author.name)).toEqual(['Susanne Diekelmann', 'Jan Born']);
    expect(record.abstract).toBe('BACKGROUND: Sleep has been identified as a state that optimizes the consolidation of newly acquired information & memory. Second part.');
  });

  it('builds PubMed terms with study types, free full text and no retracted papers', () => {
    expect(pubmedTerm('sleep memory', { studyTypes: ['rct', 'meta-analysis'], openAccess: true })).toBe(
      '(sleep memory) AND (randomized controlled trial[pt] OR meta-analysis[pt]) AND "free full text"[sb] NOT "retracted publication"[pt]',
    );
  });

  it('reads arXiv entries as open preprints with their PDF', () => {
    const [record] = parseArxivAtom(ARXIV);
    expect(record).toMatchObject({ arxiv_id: '2101.00001', title: 'Sleep and memory in neural networks', year: 2021, is_preprint: true, is_oa: true, pdf_url: 'http://arxiv.org/pdf/2101.00001v2' });
  });

  it('reads Europe PMC preprints and marks retractions', () => {
    const preprint = europePmcToFound({ id: 'PPR1', source: 'PPR', title: 'A <i>preprint</i>', pubYear: '2024', authorString: 'Doe J, Roe K.', pubTypeList: { pubType: ['Preprint'] } });
    expect(preprint).toMatchObject({ is_preprint: true, title: 'A preprint', year: 2024, type: 'preprint' });
    expect(preprint.authors.map((author) => author.name)).toEqual(['Doe J', 'Roe K']);
    const retracted = europePmcToFound({ id: '1', source: 'MED', title: 'X', pubTypeList: { pubType: ['Retracted Publication'] } });
    expect(retracted.is_retracted).toBe(true);
  });

  it('classifies study types from labels first, then the title', () => {
    expect(classifyStudy({ title: 'Anything', labels: ['Journal Article', 'Randomized Controlled Trial'] })).toBe('rct');
    expect(classifyStudy({ title: 'A meta-analysis of randomized trials of napping' })).toBe('meta-analysis');
    expect(classifyStudy({ title: 'Teachers’ experiences: a qualitative interview study' })).toBe('qualitative');
    expect(classifyStudy({ title: 'Sleep and memory' })).toBeNull();
  });

  it('rates journals from their h-index', () => {
    expect([journalTier(450), journalTier(120), journalTier(30), journalTier(4), journalTier(null)]).toEqual(['top', 'high', 'medium', 'low', null]);
  });

  it('merges the same paper from several services by DOI and ranks agreement higher', () => {
    const a = paper({ id: 'W1', title: 'Sleep and memory consolidation in adults', doi: '10.1/abc', providers: ['openalex'], cited_by_count: 10 });
    const b = paper({ id: 'W2', title: 'Another paper about something else', doi: '10.1/xyz', providers: ['openalex'] });
    const c = paper({ id: 'PMID:1', title: 'Sleep and memory consolidation in adults.', doi: 'https://doi.org/10.1/ABC', pmid: '1', providers: ['pubmed'], abstract: 'Longer abstract.' });
    const merged = mergeResults([[b, a], [c]]);
    expect(merged).toHaveLength(2);
    const joined = merged.find((item) => item.pmid === '1')!;
    expect(joined.providers).toEqual(['openalex', 'pubmed']);
    expect(joined.abstract).toBe('Longer abstract.');
    expect(sortPapers(merged)[0].pmid).toBe('1');
  });

  it('applies the filters a service could not: years, study type, journal tier, retractions, preprints', () => {
    const list = [
      paper({ id: '1', year: 2020, study_type: 'rct', journal: { name: 'J', h_index: 300, tier: 'top' } }),
      paper({ id: '2', year: 2012, study_type: 'rct' }),
      paper({ id: '3', year: 2021, study_type: 'review', is_retracted: true }),
      paper({ id: '4', year: 2022, study_type: 'rct', is_preprint: true }),
    ];
    expect(applyFilters(list, {}).map((item) => item.id)).toEqual(['1', '2', '4']);
    expect(applyFilters(list, { fromYear: 2015, studyTypes: ['rct'], excludePreprints: true }).map((item) => item.id)).toEqual(['1']);
    expect(applyFilters(list, { journalTier: 'high' }).map((item) => item.id)).toEqual(['1']);
  });
});

describe('deep research helpers', () => {
  const source = (n: number, stance: ResearchSource['stance'], kind: ResearchSource['kind'] = 'paper') => ({ n, marker: `S${n}`, kind, stance } as ResearchSource);

  it('counts the consensus line from the labels, not from the model’s words', () => {
    const consensus = consensusOf([source(1, 'supports'), source(2, 'supports'), source(3, 'mixed'), source(4, 'against'), source(5, 'unclear'), source(6, 'supports', 'web')]);
    expect(consensus).toMatchObject({ applicable: true, total: 5, counts: { supports: 2, mixed: 1, against: 1, unclear: 1 } });
    expect(consensus?.line).toBe('2 of 4 studies that test the question support it, 1 is mixed, 1 does not.');
    expect(consensusOf([source(1, 'unclear'), source(2, 'unclear'), source(3, 'supports')])?.applicable).toBe(false);
  });

  it('reads JSON from a fenced or chatty model answer', () => {
    expect(parseJson<{ queries: string[] }>('Here you go:\n```json\n{"queries": ["a b"]}\n```')).toEqual({ queries: ['a b'] });
    expect(parseJson('no json here')).toBeNull();
  });

  it('keeps the passages of a long attached file that match the question', () => {
    const text = `${'Intro words. '.repeat(100)}${'Unrelated filler text here. '.repeat(400)}Sleep consolidation memory findings here. ${'More filler. '.repeat(400)}`;
    const kept = relevantPassages(text, 'Does sleep help memory consolidation?', 2400);
    expect(kept.length).toBeLessThanOrEqual(2500);
    expect(kept).toContain('Sleep consolidation memory');
  });
});

describe('rate-limit address', () => {
  it('reads the client from the right of X-Forwarded-For, so a forged first entry does not reset the limit', async () => {
    const { clientAddress } = await import('../../lib/server/lib/rateLimit.js');
    const headers = (values: Record<string, string>) => (name: string) => values[name];
    expect(clientAddress(headers({ 'x-forwarded-for': '1.1.1.1, 203.0.113.9' }))).toBe('203.0.113.9');
    expect(clientAddress(headers({ 'x-forwarded-for': '203.0.113.9' }))).toBe('203.0.113.9');
    expect(clientAddress(headers({ 'cf-connecting-ip': '198.51.100.2', 'x-forwarded-for': '1.1.1.1' }))).toBe('198.51.100.2');
    expect(clientAddress(headers({}))).toBe('local');
  });
});
