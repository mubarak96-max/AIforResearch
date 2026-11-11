/**
 * The scholarly services behind the source groups. Each takes a query and filters and returns
 * FoundPapers; filters a service cannot apply are applied after merging (sources/index.ts).
 *
 * - OpenAlex (or CitedEvidence Scholar's OpenAlex-compatible index): api.openalex.org, free.
 * - Semantic Scholar Graph API: api.semanticscholar.org, free; a key raises the rate limit.
 * - PubMed E-utilities: eutils.ncbi.nlm.nih.gov, free; a key raises 3 to 10 requests a second.
 * - Europe PMC REST: ebi.ac.uk/europepmc, free (biomedical papers and bioRxiv/medRxiv preprints).
 * - arXiv API: export.arxiv.org, free (asks for at most one request every 3 seconds).
 * - Web: Tavily, Brave Search or Exa, paid per search, chosen with WEB_SEARCH_PROVIDER.
 *
 * Google Scholar (no API) and Scopus (licence only) are deliberately absent.
 */
import { env } from '../../env.js';
import { cleanQuery, workToPaper } from '../../slots/papers.js';
import { papersSlots } from '../directory.js';
import { classifyStudy, doiKey } from './classify.js';
import { SourceError, decodeXml, fetchSource, stripTags, xmlAll, xmlFirst } from './http.js';
import { emptyPaper, type FoundPaper, type JournalTier, type SearchFilters, type SearchSort, type StudyType, type WebResult } from './types.js';

export type ProviderSearch = { query: string; filters: SearchFilters; limit: number; sort: SearchSort };

const doiUrl = (doi: string | null) => (doi ? `https://doi.org/${doi}` : null);
const yearOf = (value: unknown) => {
  const match = String(value ?? '').match(/\b(1[5-9]\d{2}|20\d{2})\b/);
  return match ? Number(match[1]) : null;
};

// ------------------------------------------------------------------ OpenAlex

/** Journal standing from the h-index OpenAlex computes for each journal. */
export function journalTier(hIndex: number | null): JournalTier | null {
  if (hIndex === null || !Number.isFinite(hIndex)) return null;
  if (hIndex >= 200) return 'top';
  if (hIndex >= 80) return 'high';
  if (hIndex >= 25) return 'medium';
  return 'low';
}

const OPENALEX_SELECT = 'id,doi,title,display_name,publication_year,publication_date,type,authorships,primary_location,best_oa_location,locations,open_access,cited_by_count,abstract_inverted_index,is_retracted,ids,biblio';

export function openAlexParams(input: ProviderSearch): Record<string, string> {
  const filters: string[] = [];
  const { filters: f } = input;
  if (f.fromYear) filters.push(`from_publication_date:${f.fromYear}-01-01`);
  if (f.toYear) filters.push(`to_publication_date:${f.toYear}-12-31`);
  if (f.openAccess) filters.push('open_access.is_oa:true');
  if (f.minCitations && f.minCitations > 0) filters.push(`cited_by_count:>${f.minCitations - 1}`);
  if (f.excludeRetracted !== false) filters.push('is_retracted:false');
  if (f.excludePreprints) filters.push('type:!preprint');
  // Reviews are the one study type OpenAlex labels itself; the rest are filtered after merging.
  if (f.studyTypes?.length && f.studyTypes.every((type) => type === 'review' || type === 'systematic-review' || type === 'meta-analysis')) filters.push('type:review');
  const params: Record<string, string> = { search: cleanQuery(input.query), per_page: String(Math.min(50, input.limit)), select: OPENALEX_SELECT };
  if (filters.length) params.filter = filters.join(',');
  if (input.sort === 'cited') params.sort = 'cited_by_count:desc';
  if (input.sort === 'newest') params.sort = 'publication_date:desc';
  return params;
}

export function openAlexToFound(work: any): FoundPaper {
  const paper = workToPaper(work);
  const ids = work?.ids || {};
  const pmid = String(ids.pmid || '').match(/(\d+)\/?$/)?.[1] ?? null;
  const pmcid = String(ids.pmcid || '').match(/(PMC\d+)/i)?.[1] ?? null;
  const source = work?.primary_location?.source;
  const isPreprint = paper.type === 'preprint' || source?.type === 'repository' && /arxiv|biorxiv|medrxiv|ssrn|preprint/i.test(String(source?.display_name || ''));
  return {
    ...emptyPaper(paper.id, 'openalex'),
    ...paper,
    providers: ['openalex'],
    pmid, pmcid, arxiv_id: null,
    url: doiUrl(paper.doi) ?? paper.oa_url ?? (paper.id ? `https://openalex.org/${paper.id}` : null),
    study_type: classifyStudy({ title: paper.title, labels: [paper.type === 'review' ? 'review' : null] }),
    is_preprint: Boolean(isPreprint),
    journal: source?.display_name ? { name: String(source.display_name), h_index: null, tier: null, ...(source.id ? { source_id: String(source.id).replace(/^https?:\/\/openalex\.org\//, '') } : {}) } : null,
    tldr: null,
  };
}

/** Adds each journal's h-index and tier in one request (OpenAlex sources endpoint). */
async function addJournalStats(papers: FoundPaper[]) {
  const ids = [...new Set(papers.map((paper) => paper.journal?.source_id).filter((id): id is string => /^S\d+$/.test(id || '')))].slice(0, 50);
  if (!ids.length) return;
  for (const slot of papersSlots()) {
    try {
      const data = await slot.get('sources', { filter: `openalex_id:${ids.join('|')}`, per_page: '50', select: 'id,summary_stats' });
      const stats = new Map<string, number>();
      for (const source of Array.isArray(data?.results) ? data.results : []) {
        const id = String(source?.id || '').replace(/^https?:\/\/openalex\.org\//, '');
        const h = Number(source?.summary_stats?.h_index);
        if (id && Number.isFinite(h)) stats.set(id, h);
      }
      if (!stats.size) continue;
      for (const paper of papers) {
        const journal = paper.journal;
        if (!journal?.source_id || !stats.has(journal.source_id)) continue;
        journal.h_index = stats.get(journal.source_id)!;
        journal.tier = journalTier(journal.h_index);
      }
      return;
    } catch {
      /* the next index, or no tiers */
    }
  }
}

export async function searchOpenAlex(input: ProviderSearch): Promise<FoundPaper[]> {
  const params = openAlexParams(input);
  if (!params.search) return [];
  let lastError: unknown = null;
  for (const slot of papersSlots()) {
    try {
      const data = await slot.get('works', params);
      const works = (Array.isArray(data?.results) ? data.results : []).filter((work: any) => work?.id && !['paratext', 'erratum', 'retraction', 'editorial'].includes(String(work?.type)));
      const papers = works.map(openAlexToFound);
      if (!papers.length && slot !== papersSlots().at(-1)) continue;
      await addJournalStats(papers);
      return papers;
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError) throw new SourceError('OpenAlex', (lastError as Error).message || 'OpenAlex is busy.');
  return [];
}

// ------------------------------------------------------------------ Semantic Scholar

const S2_BASE = 'https://api.semanticscholar.org/graph/v1';
const S2_FIELDS = 'title,abstract,year,venue,authors,citationCount,externalIds,isOpenAccess,openAccessPdf,publicationTypes,publicationDate,tldr,journal';
const s2Headers = (): Record<string, string> => (env.semanticScholarApiKey ? { 'x-api-key': env.semanticScholarApiKey } : {});
const S2_TYPES: Partial<Record<StudyType, string>> = { 'meta-analysis': 'MetaAnalysis', review: 'Review', 'systematic-review': 'Review', 'clinical-trial': 'ClinicalTrial', rct: 'ClinicalTrial', 'case-report': 'CaseReport' };

export function s2ToFound(item: any): FoundPaper {
  const ids = item?.externalIds || {};
  const doi = doiKey(ids.DOI);
  const arxiv = ids.ArXiv ? String(ids.ArXiv) : null;
  const paper = emptyPaper(`S2:${item?.paperId}`, 'semantic_scholar');
  const types: string[] = Array.isArray(item?.publicationTypes) ? item.publicationTypes : [];
  return {
    ...paper,
    title: String(item?.title || 'Untitled'),
    authors: (Array.isArray(item?.authors) ? item.authors : []).slice(0, 5).map((author: any) => ({ name: String(author?.name || 'Unknown') })),
    extra_author_count: Math.max(0, (item?.authors?.length || 0) - 5),
    year: Number.isInteger(item?.year) ? item.year : null,
    publication_date: item?.publicationDate ?? null,
    venue: item?.journal?.name || item?.venue || null,
    doi,
    abstract: item?.abstract ?? null,
    cited_by_count: Number.isFinite(item?.citationCount) ? item.citationCount : null,
    is_oa: Boolean(item?.isOpenAccess),
    pdf_url: item?.openAccessPdf?.url || null,
    oa_url: item?.openAccessPdf?.url || null,
    pmid: ids.PubMed ? String(ids.PubMed) : null,
    pmcid: ids.PubMedCentral ? `PMC${String(ids.PubMedCentral).replace(/^PMC/i, '')}` : null,
    arxiv_id: arxiv,
    url: doiUrl(doi) ?? (item?.paperId ? `https://www.semanticscholar.org/paper/${item.paperId}` : null),
    study_type: classifyStudy({ title: item?.title, labels: types }),
    is_preprint: !doi && Boolean(arxiv),
    journal: item?.journal?.name || item?.venue ? { name: item?.journal?.name || item?.venue, h_index: null, tier: null } : null,
    tldr: item?.tldr?.text ?? null,
  };
}

export async function searchSemanticScholar(input: ProviderSearch): Promise<FoundPaper[]> {
  const query = cleanQuery(input.query);
  if (!query) return [];
  const url = new URL(`${S2_BASE}/paper/search`);
  url.searchParams.set('query', query);
  url.searchParams.set('limit', String(Math.min(100, input.limit)));
  url.searchParams.set('fields', S2_FIELDS);
  const f = input.filters;
  if (f.fromYear || f.toYear) url.searchParams.set('year', `${f.fromYear ?? ''}-${f.toYear ?? ''}`);
  if (f.minCitations) url.searchParams.set('minCitationCount', String(f.minCitations));
  if (f.openAccess) url.searchParams.set('openAccessPdf', '');
  const mapped = (f.studyTypes ?? []).map((type) => S2_TYPES[type]);
  if (mapped.length && mapped.every(Boolean)) url.searchParams.set('publicationTypes', [...new Set(mapped)].join(','));
  const data = await fetchSource(url, { source: 'Semantic Scholar', headers: s2Headers() });
  return (Array.isArray(data?.data) ? data.data : []).map(s2ToFound);
}

/** One paper with its references or citations, for Citation Map and snowballing. */
export async function semanticScholarLinks(paperId: string, direction: 'references' | 'citations', limit = 50): Promise<FoundPaper[]> {
  const url = new URL(`${S2_BASE}/paper/${encodeURIComponent(paperId)}/${direction}`);
  url.searchParams.set('limit', String(Math.min(1000, limit)));
  url.searchParams.set('fields', S2_FIELDS.replace(',tldr', ''));
  const data = await fetchSource(url, { source: 'Semantic Scholar', headers: s2Headers() });
  const key = direction === 'references' ? 'citedPaper' : 'citingPaper';
  return (Array.isArray(data?.data) ? data.data : []).map((row: any) => row?.[key]).filter((item: any) => item?.paperId).map(s2ToFound);
}

/** A paper by DOI, arXiv id, PMID or Semantic Scholar id (`DOI:10…`, `ARXIV:…`, `PMID:…`). */
export async function semanticScholarPaper(id: string): Promise<FoundPaper | null> {
  const data = await fetchSource(`${S2_BASE}/paper/${encodeURIComponent(id)}?fields=${S2_FIELDS}`, { source: 'Semantic Scholar', headers: s2Headers() });
  return data?.paperId ? s2ToFound(data) : null;
}

/** Papers like the given ones (Semantic Scholar's recommendations), for "Similar papers". */
export async function semanticScholarSimilar(paperIds: string[], limit = 20): Promise<FoundPaper[]> {
  const ids = paperIds.filter(Boolean).slice(0, 20);
  if (!ids.length) return [];
  const data = await fetchSource(`https://api.semanticscholar.org/recommendations/v1/papers?limit=${Math.min(100, limit)}&fields=${S2_FIELDS.replace(',tldr', '')}`, {
    source: 'Semantic Scholar', method: 'POST', headers: s2Headers(), body: { positivePaperIds: ids },
  });
  return (Array.isArray(data?.recommendedPapers) ? data.recommendedPapers : []).map(s2ToFound);
}

// ------------------------------------------------------------------ PubMed

const EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const PUBMED_TYPES: Partial<Record<StudyType, string>> = {
  'meta-analysis': 'meta-analysis[pt]', 'systematic-review': 'systematic review[pt]', rct: 'randomized controlled trial[pt]',
  'clinical-trial': 'clinical trial[pt]', review: 'review[pt]', 'case-report': 'case reports[pt]', cohort: 'observational study[pt]',
};

function eutilsParams(url: URL) {
  url.searchParams.set('tool', 'aiforresearch');
  if (env.contactEmail) url.searchParams.set('email', env.contactEmail);
  if (env.ncbiApiKey) url.searchParams.set('api_key', env.ncbiApiKey);
}

/** The PubMed search term with the filters PubMed applies itself. */
export function pubmedTerm(query: string, filters: SearchFilters): string {
  let term = `(${cleanQuery(query)})`;
  const types = (filters.studyTypes ?? []).map((type) => PUBMED_TYPES[type]).filter(Boolean);
  if (types.length) term += ` AND (${types.join(' OR ')})`;
  if (filters.openAccess) term += ' AND "free full text"[sb]';
  if (filters.excludeRetracted !== false) term += ' NOT "retracted publication"[pt]';
  return term;
}

/** PubMed efetch XML to papers. Pure, for tests. */
export function parsePubmedXml(xml: string): FoundPaper[] {
  return xmlAll(xml, 'PubmedArticle').map((article) => {
    const pmid = stripTags(xmlFirst(article, 'PMID') || '');
    const title = stripTags(xmlFirst(article, 'ArticleTitle') || '') || 'Untitled';
    const abstractParts = [...article.matchAll(/<AbstractText(?:\s+[^>]*?Label="([^"]*)")?[^>]*>([\s\S]*?)<\/AbstractText>/g)]
      .map(([, label, text]) => `${label ? `${decodeXml(label)}: ` : ''}${stripTags(text)}`);
    const authors = xmlAll(xmlFirst(article, 'AuthorList') || '', 'Author').map((author) => {
      const collective = xmlFirst(author, 'CollectiveName');
      if (collective) return stripTags(collective);
      return [stripTags(xmlFirst(author, 'ForeName') || ''), stripTags(xmlFirst(author, 'LastName') || '')].filter(Boolean).join(' ');
    }).filter(Boolean);
    const journal = stripTags(xmlFirst(xmlFirst(article, 'Journal') || '', 'Title') || '') || null;
    const pubDate = xmlFirst(article, 'PubDate') || '';
    const year = yearOf(xmlFirst(pubDate, 'Year') || xmlFirst(pubDate, 'MedlineDate'));
    const ids = Object.fromEntries([...article.matchAll(/<ArticleId IdType="([^"]+)">([^<]+)<\/ArticleId>/g)].map(([, type, value]) => [type, value.trim()]));
    const types = xmlAll(xmlFirst(article, 'PublicationTypeList') || '', 'PublicationType').map(stripTags);
    const doi = doiKey(ids.doi);
    const pmcid = ids.pmc ? String(ids.pmc) : null;
    return {
      ...emptyPaper(`PMID:${pmid}`, 'pubmed'),
      title, authors: authors.slice(0, 5).map((name) => ({ name })), extra_author_count: Math.max(0, authors.length - 5), year,
      venue: journal, doi, abstract: abstractParts.join(' ') || null, pmid, pmcid,
      is_oa: Boolean(pmcid), oa_url: pmcid ? `https://www.ncbi.nlm.nih.gov/pmc/articles/${pmcid}/` : null,
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      study_type: classifyStudy({ title, labels: types }),
      is_retracted: types.some((type) => /retracted publication/i.test(type)),
      journal: journal ? { name: journal, h_index: null, tier: null } : null,
      type: types.includes('Review') ? 'review' : 'article',
    };
  }).filter((paper) => paper.pmid);
}

export async function searchPubmed(input: ProviderSearch): Promise<FoundPaper[]> {
  if (!cleanQuery(input.query)) return [];
  const search = new URL(`${EUTILS}/esearch.fcgi`);
  search.searchParams.set('db', 'pubmed');
  search.searchParams.set('term', pubmedTerm(input.query, input.filters));
  search.searchParams.set('retmax', String(Math.min(100, input.limit)));
  search.searchParams.set('retmode', 'json');
  search.searchParams.set('sort', input.sort === 'newest' ? 'pub_date' : 'relevance');
  if (input.filters.fromYear || input.filters.toYear) {
    search.searchParams.set('datetype', 'pdat');
    search.searchParams.set('mindate', String(input.filters.fromYear ?? 1800));
    search.searchParams.set('maxdate', String(input.filters.toYear ?? 3000));
  }
  eutilsParams(search);
  const found = await fetchSource(search, { source: 'PubMed' });
  const ids: string[] = found?.esearchresult?.idlist ?? [];
  if (!ids.length) return [];
  const fetchUrl = new URL(`${EUTILS}/efetch.fcgi`);
  fetchUrl.searchParams.set('db', 'pubmed');
  fetchUrl.searchParams.set('id', ids.join(','));
  fetchUrl.searchParams.set('retmode', 'xml');
  eutilsParams(fetchUrl);
  const xml = await fetchSource<string>(fetchUrl, { source: 'PubMed', as: 'text' });
  const byId = new Map(parsePubmedXml(xml || '').map((paper) => [paper.pmid, paper]));
  return ids.map((id) => byId.get(id)).filter((paper): paper is FoundPaper => Boolean(paper));
}

/** The number of PubMed records a search term finds (systematic-review search builder). */
export async function pubmedCount(term: string): Promise<number> {
  const url = new URL(`${EUTILS}/esearch.fcgi`);
  url.searchParams.set('db', 'pubmed');
  url.searchParams.set('term', term);
  url.searchParams.set('retmax', '0');
  url.searchParams.set('retmode', 'json');
  eutilsParams(url);
  const data = await fetchSource(url, { source: 'PubMed' });
  return Number(data?.esearchresult?.count ?? 0) || 0;
}

/** Up to `max` PubMed records for an exact search term, in pages (systematic reviews). */
export async function pubmedRecords(term: string, max = 500): Promise<FoundPaper[]> {
  const url = new URL(`${EUTILS}/esearch.fcgi`);
  url.searchParams.set('db', 'pubmed');
  url.searchParams.set('term', term);
  url.searchParams.set('retmax', String(Math.min(max, 2000)));
  url.searchParams.set('retmode', 'json');
  eutilsParams(url);
  const ids: string[] = (await fetchSource(url, { source: 'PubMed' }))?.esearchresult?.idlist ?? [];
  const papers: FoundPaper[] = [];
  for (let start = 0; start < ids.length; start += 200) {
    const fetchUrl = new URL(`${EUTILS}/efetch.fcgi`);
    fetchUrl.searchParams.set('db', 'pubmed');
    fetchUrl.searchParams.set('id', ids.slice(start, start + 200).join(','));
    fetchUrl.searchParams.set('retmode', 'xml');
    eutilsParams(fetchUrl);
    papers.push(...parsePubmedXml((await fetchSource<string>(fetchUrl, { source: 'PubMed', as: 'text', timeoutMs: 30_000 })) || ''));
  }
  return papers;
}

// ------------------------------------------------------------------ Europe PMC

const EUROPE_PMC = 'https://www.ebi.ac.uk/europepmc/webservices/rest/search';

export function europePmcQuery(query: string, filters: SearchFilters, mode: 'medical' | 'preprints'): string {
  let q = `(${cleanQuery(query)})`;
  if (filters.fromYear || filters.toYear) q += ` AND PUB_YEAR:[${filters.fromYear ?? 1800} TO ${filters.toYear ?? 3000}]`;
  if (filters.openAccess) q += ' AND OPEN_ACCESS:y';
  q += mode === 'preprints' ? ' AND SRC:PPR' : ' AND NOT SRC:PPR';
  return q;
}

export function europePmcToFound(item: any): FoundPaper {
  const types: string[] = item?.pubTypeList?.pubType ?? [];
  const doi = doiKey(item?.doi);
  const isPreprint = item?.source === 'PPR';
  const fullText: any[] = item?.fullTextUrlList?.fullTextUrl ?? [];
  const pdf = fullText.find((link) => link?.documentStyle === 'pdf' && /free|open/i.test(String(link?.availability || '')))?.url ?? null;
  const html = fullText.find((link) => /free|open/i.test(String(link?.availability || '')))?.url ?? null;
  const authors: string[] = Array.isArray(item?.authorList?.author)
    ? item.authorList.author.map((author: any) => String(author?.fullName || author?.collectiveName || '')).filter(Boolean)
    : String(item?.authorString || '').split(/,\s*/).map((name) => name.replace(/\.$/, '')).filter(Boolean);
  const venue = item?.journalInfo?.journal?.title || item?.bookOrReportDetails?.publisher || (isPreprint ? item?.publisher || 'Preprint' : null);
  return {
    ...emptyPaper(`EPMC:${item?.source}:${item?.id}`, 'europepmc'),
    title: stripTags(String(item?.title || 'Untitled')),
    authors: authors.slice(0, 5).map((name) => ({ name })), extra_author_count: Math.max(0, authors.length - 5),
    year: yearOf(item?.pubYear), publication_date: item?.firstPublicationDate ?? null,
    venue, doi, abstract: item?.abstractText ? stripTags(String(item.abstractText)) : null,
    cited_by_count: Number.isFinite(Number(item?.citedByCount)) ? Number(item.citedByCount) : null,
    is_oa: item?.isOpenAccess === 'Y', pdf_url: pdf, oa_url: html,
    pmid: item?.pmid ? String(item.pmid) : null, pmcid: item?.pmcid ? String(item.pmcid) : null,
    url: doiUrl(doi) ?? `https://europepmc.org/article/${item?.source}/${item?.id}`,
    study_type: classifyStudy({ title: item?.title, labels: types }),
    is_preprint: isPreprint,
    is_retracted: types.some((type) => /retracted publication/i.test(type)),
    journal: venue && !isPreprint ? { name: venue, h_index: null, tier: null } : null,
    type: isPreprint ? 'preprint' : types.some((type) => /review/i.test(type)) ? 'review' : 'article',
  };
}

export async function searchEuropePmc(input: ProviderSearch, mode: 'medical' | 'preprints'): Promise<FoundPaper[]> {
  if (!cleanQuery(input.query)) return [];
  const url = new URL(EUROPE_PMC);
  url.searchParams.set('query', europePmcQuery(input.query, input.filters, mode));
  url.searchParams.set('format', 'json');
  url.searchParams.set('resultType', 'core');
  url.searchParams.set('pageSize', String(Math.min(100, input.limit)));
  if (input.sort === 'cited') url.searchParams.set('sort', 'CITED desc');
  if (input.sort === 'newest') url.searchParams.set('sort', 'P_PDATE_D desc');
  const data = await fetchSource(url, { source: 'Europe PMC' });
  return (data?.resultList?.result ?? []).map(europePmcToFound);
}

// ------------------------------------------------------------------ arXiv

/** arXiv Atom feed to papers. Pure, for tests. */
export function parseArxivAtom(xml: string): FoundPaper[] {
  return xmlAll(xml, 'entry').map((entry) => {
    const absUrl = stripTags(xmlFirst(entry, 'id') || '');
    const arxivId = absUrl.match(/abs\/(.+?)(v\d+)?$/)?.[1] ?? null;
    const authors = xmlAll(entry, 'author').map((author) => stripTags(xmlFirst(author, 'name') || '')).filter(Boolean);
    const pdf = entry.match(/<link[^>]*title="pdf"[^>]*href="([^"]+)"/)?.[1] ?? entry.match(/<link[^>]*href="([^"]+)"[^>]*title="pdf"/)?.[1] ?? null;
    const doi = doiKey(stripTags(xmlFirst(entry, 'arxiv:doi') || ''));
    const journalRef = stripTags(xmlFirst(entry, 'arxiv:journal_ref') || '') || null;
    const title = stripTags(xmlFirst(entry, 'title') || '') || 'Untitled';
    return {
      ...emptyPaper(`arXiv:${arxivId}`, 'arxiv'),
      title, authors: authors.slice(0, 5).map((name) => ({ name })), extra_author_count: Math.max(0, authors.length - 5),
      year: yearOf(xmlFirst(entry, 'published')), publication_date: (xmlFirst(entry, 'published') || '').slice(0, 10) || null,
      venue: journalRef ?? 'arXiv', doi, abstract: stripTags(xmlFirst(entry, 'summary') || '') || null,
      is_oa: true, pdf_url: pdf, oa_url: absUrl || null, arxiv_id: arxivId, url: absUrl || null,
      study_type: classifyStudy({ title }), is_preprint: !journalRef, type: 'preprint',
    };
  }).filter((paper) => paper.arxiv_id);
}

export async function searchArxiv(input: ProviderSearch): Promise<FoundPaper[]> {
  const words = cleanQuery(input.query).replace(/"/g, '').split(/\s+/).filter((word) => word.length > 1).slice(0, 8);
  if (!words.length) return [];
  const url = new URL('https://export.arxiv.org/api/query');
  url.searchParams.set('search_query', words.map((word) => `all:${word}`).join(' AND '));
  url.searchParams.set('max_results', String(Math.min(50, input.limit)));
  url.searchParams.set('sortBy', input.sort === 'newest' ? 'submittedDate' : 'relevance');
  const xml = await fetchSource<string>(url, { source: 'arXiv', as: 'text' });
  return parseArxivAtom(xml || '');
}

// ------------------------------------------------------------------ Web

/** Is the Web source set up (a provider and its key)? */
export const webSearchAvailable = () => ['tavily', 'brave', 'exa'].includes(env.webSearchProvider) && Boolean(env.webSearchApiKey);

const siteOf = (url: string) => {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
};

export async function searchWeb(query: string, limit = 8): Promise<WebResult[]> {
  if (!webSearchAvailable()) return [];
  const q = query.trim().slice(0, 300);
  const results: { title: string; url: string; snippet: string; published?: string | null }[] = [];
  if (env.webSearchProvider === 'tavily') {
    const data = await fetchSource('https://api.tavily.com/search', {
      source: 'Web search', method: 'POST', headers: { Authorization: `Bearer ${env.webSearchApiKey}` },
      body: { query: q, max_results: Math.min(20, limit), search_depth: 'basic', include_answer: false },
    });
    for (const item of data?.results ?? []) results.push({ title: item.title, url: item.url, snippet: item.content, published: item.published_date ?? null });
  } else if (env.webSearchProvider === 'brave') {
    const url = new URL('https://api.search.brave.com/res/v1/web/search');
    url.searchParams.set('q', q);
    url.searchParams.set('count', String(Math.min(20, limit)));
    const data = await fetchSource(url, { source: 'Web search', headers: { 'X-Subscription-Token': env.webSearchApiKey } });
    for (const item of data?.web?.results ?? []) results.push({ title: item.title, url: item.url, snippet: stripTags(item.description || ''), published: item.page_age ?? null });
  } else {
    const data = await fetchSource('https://api.exa.ai/search', {
      source: 'Web search', method: 'POST', headers: { 'x-api-key': env.webSearchApiKey },
      body: { query: q, numResults: Math.min(20, limit), contents: { text: { maxCharacters: 1200 } } },
    });
    for (const item of data?.results ?? []) results.push({ title: item.title, url: item.url, snippet: item.text || '', published: item.publishedDate ?? null });
  }
  return results
    .filter((item) => item?.url && /^https?:\/\//.test(item.url))
    .slice(0, limit)
    .map((item, index) => ({
      id: `web:${index}:${item.url}`, title: String(item.title || item.url).slice(0, 300), url: item.url, site: siteOf(item.url),
      snippet: String(item.snippet || '').replace(/\s+/g, ' ').slice(0, 1200), published: item.published ? String(item.published).slice(0, 10) : null,
    }));
}

// ------------------------------------------------------------------ Crossref and Unpaywall (checks, not search)

const mailto = () => (env.contactEmail ? `mailto=${encodeURIComponent(env.contactEmail)}` : '');

export type CrossrefRecord = { doi: string; title: string | null; authors: string[]; year: number | null; container: string | null; type: string | null };

/** A DOI's record at Crossref, or null when the DOI does not exist there. */
export async function crossrefWork(doi: string): Promise<CrossrefRecord | null> {
  const clean = doiKey(doi);
  if (!clean) return null;
  const data = await fetchSource(`https://api.crossref.org/works/${encodeURIComponent(clean)}?${mailto()}`, { source: 'Crossref' });
  const work = data?.message;
  if (!work) return null;
  return {
    doi: clean,
    title: Array.isArray(work.title) ? work.title[0] ?? null : null,
    authors: (work.author ?? []).map((author: any) => [author.given, author.family].filter(Boolean).join(' ') || author.name).filter(Boolean),
    year: work.issued?.['date-parts']?.[0]?.[0] ?? null,
    container: Array.isArray(work['container-title']) ? work['container-title'][0] ?? null : null,
    type: work.type ?? null,
  };
}

export type UpdateNotice = { doi: string; type: string; date: string | null; source: string | null };

/** Retractions, corrections and expressions of concern recorded against a DOI (Crossref, with Retraction Watch data). */
export async function crossrefUpdates(doi: string): Promise<UpdateNotice[]> {
  const clean = doiKey(doi);
  if (!clean) return [];
  const data = await fetchSource(`https://api.crossref.org/works?filter=updates:${encodeURIComponent(clean)}&rows=20&${mailto()}`, { source: 'Crossref' });
  const notices: UpdateNotice[] = [];
  for (const item of data?.message?.items ?? []) {
    for (const update of item?.['update-to'] ?? []) {
      if (doiKey(update?.DOI) !== clean) continue;
      notices.push({ doi: String(item.DOI), type: String(update.type || 'update'), date: update.updated?.['date-time']?.slice(0, 10) ?? null, source: update.source ?? null });
    }
  }
  return notices;
}

/** The legal open-access copy of a DOI (Unpaywall), or null. */
export async function unpaywall(doi: string): Promise<{ url: string; pdf: string | null; version: string | null; license: string | null } | null> {
  const clean = doiKey(doi);
  if (!clean || !env.contactEmail) return null;
  const data = await fetchSource(`https://api.unpaywall.org/v2/${encodeURIComponent(clean)}?email=${encodeURIComponent(env.contactEmail)}`, { source: 'Unpaywall' });
  const best = data?.best_oa_location;
  if (!best?.url) return null;
  return { url: best.url, pdf: best.url_for_pdf ?? null, version: best.version ?? null, license: best.license ?? null };
}
