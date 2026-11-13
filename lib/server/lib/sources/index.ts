/**
 * One search across the source groups people choose (All papers, Medical, Preprints, Web, My
 * Library): every service is asked at once, results are merged by DOI or title, filters that a
 * service could not apply are applied here, and the list is ranked. A service that fails is
 * reported, never fatal.
 */
import { libraryHits } from '../assist-papers.js';
import { doiKey, titleKey } from './classify.js';
import {
  coreAvailable, searchArxiv, searchClinicalTrials, searchCore, searchDatacite, searchEuropePmc, searchOpenAlex, searchPubmed, searchSemanticScholar,
  searchWeb, webSearchAvailable, type ProviderSearch,
} from './providers.js';
import {
  JOURNAL_TIER_ORDER, emptyPaper, type FoundPaper, type ProviderId, type SearchFilters, type SearchInput, type SearchOutput, type SourceGroup,
} from './types.js';

export * from './types.js';
export { classifyStudy, doiKey, titleKey } from './classify.js';
export {
  crossrefUpdates, crossrefWork, openCitationsLinks, pubmedCount, pubmedRecords, pubmedTerm, searchWeb, semanticScholarLinks, semanticScholarPaper,
  semanticScholarSimilar, unpaywall, webSearchAvailable,
} from './providers.js';

/** Which services answer for each group (CORE joins All papers only when its key is set). */
export const GROUP_PROVIDERS: Record<SourceGroup, ProviderId[]> = {
  papers: ['openalex', 'semantic_scholar', 'core'],
  medical: ['pubmed', 'europepmc'],
  preprints: ['arxiv', 'europepmc'],
  trials: ['clinicaltrials'],
  datasets: ['datacite'],
  web: ['web'],
  library: ['library'],
};

/** What the source picker shows, and whether each group can be used on this server. */
export function sourceGroups() {
  return [
    { id: 'papers', label: 'All papers', detail: 'OpenAlex and Semantic Scholar: 250M+ works in every field', available: true },
    { id: 'medical', label: 'Medical', detail: 'PubMed and Europe PMC', available: true },
    { id: 'preprints', label: 'Preprints', detail: 'arXiv, bioRxiv and medRxiv', available: true },
    { id: 'trials', label: 'Clinical trials', detail: 'Registered trials, including ones not yet published', available: true },
    { id: 'datasets', label: 'Datasets', detail: 'Research datasets with DOIs', available: true },
    { id: 'web', label: 'Web', detail: 'Web pages, reports and news', available: webSearchAvailable() },
    { id: 'library', label: 'My Library', detail: 'Your PDFs and saved papers', available: true },
  ] as const;
}

/** Two records are the same paper when their DOIs, PubMed ids or titles match. */
function mergeKey(paper: FoundPaper): string[] {
  const keys: string[] = [];
  const doi = doiKey(paper.doi);
  if (doi) keys.push(`doi:${doi}`);
  if (paper.pmid) keys.push(`pmid:${paper.pmid}`);
  if (paper.arxiv_id) keys.push(`arxiv:${paper.arxiv_id.replace(/v\d+$/, '')}`);
  const title = titleKey(paper.title);
  if (title.length > 20) keys.push(`title:${title}`);
  return keys;
}

/** Fills the gaps of `into` from `from` (the record with an abstract keeps its text). */
function combine(into: FoundPaper, from: FoundPaper): FoundPaper {
  const pick = <K extends keyof FoundPaper>(key: K) => (into[key] === null || into[key] === undefined || into[key] === '' ? from[key] : into[key]);
  return {
    ...into,
    providers: [...new Set([...into.providers, ...from.providers])],
    doi: pick('doi'), pmid: pick('pmid'), pmcid: pick('pmcid'), arxiv_id: pick('arxiv_id'), year: pick('year'), venue: pick('venue'),
    abstract: (into.abstract?.length ?? 0) >= (from.abstract?.length ?? 0) ? into.abstract : from.abstract,
    cited_by_count: Math.max(into.cited_by_count ?? -1, from.cited_by_count ?? -1) < 0 ? null : Math.max(into.cited_by_count ?? 0, from.cited_by_count ?? 0),
    is_oa: into.is_oa || from.is_oa, pdf_url: pick('pdf_url'), oa_url: pick('oa_url'), url: pick('url'),
    study_type: into.study_type ?? from.study_type,
    // A paper is a preprint only when no service knows it as published.
    is_preprint: into.is_preprint && from.is_preprint,
    is_retracted: Boolean(into.is_retracted || from.is_retracted),
    journal: into.journal?.tier ? into.journal : from.journal?.tier ? from.journal : into.journal ?? from.journal,
    tldr: pick('tldr'),
    authors: into.authors.length >= from.authors.length ? into.authors : from.authors,
  };
}

/**
 * Merges ranked lists from several services. A paper's score adds 1/(rank+1) for every list it
 * appears in, so papers several services agree on rise; citations break near-ties.
 */
export function mergeResults(lists: FoundPaper[][]): FoundPaper[] {
  const byKey = new Map<string, FoundPaper>();
  const merged: FoundPaper[] = [];
  for (const list of lists) {
    list.forEach((paper, rank) => {
      const keys = mergeKey(paper);
      const existing = keys.map((key) => byKey.get(key)).find(Boolean);
      const score = 1 / (rank + 1);
      if (existing) {
        const index = merged.indexOf(existing);
        const combined = { ...combine(existing, paper), score: (existing.score ?? 0) + score };
        merged[index] = combined;
        for (const key of [...mergeKey(existing), ...keys]) byKey.set(key, combined);
      } else {
        const fresh = { ...paper, score };
        merged.push(fresh);
        for (const key of keys) byKey.set(key, fresh);
      }
    });
  }
  return merged;
}

/** The filters every service may have missed. Pure, for tests. */
export function applyFilters(papers: FoundPaper[], filters: SearchFilters): FoundPaper[] {
  const minTier = filters.journalTier ? JOURNAL_TIER_ORDER.indexOf(filters.journalTier) : -1;
  return papers.filter((paper) => {
    if (filters.excludeRetracted !== false && paper.is_retracted) return false;
    if (filters.excludePreprints && paper.is_preprint) return false;
    if (filters.fromYear && (paper.year === null || paper.year < filters.fromYear)) return false;
    if (filters.toYear && (paper.year === null || paper.year > filters.toYear)) return false;
    if (filters.openAccess && !paper.is_oa && !paper.pdf_url) return false;
    if (filters.minCitations && (paper.cited_by_count ?? 0) < filters.minCitations) return false;
    if (filters.studyTypes?.length && (!paper.study_type || !filters.studyTypes.includes(paper.study_type))) return false;
    if (minTier >= 0 && (!paper.journal?.tier || JOURNAL_TIER_ORDER.indexOf(paper.journal.tier) > minTier)) return false;
    return true;
  });
}

export function sortPapers(papers: FoundPaper[], sort: SearchInput['sort'] = 'relevance'): FoundPaper[] {
  const list = [...papers];
  if (sort === 'cited') return list.sort((a, b) => (b.cited_by_count ?? 0) - (a.cited_by_count ?? 0));
  if (sort === 'newest') return list.sort((a, b) => (b.publication_date || String(b.year ?? '')).localeCompare(a.publication_date || String(a.year ?? '')));
  // Relevance: agreement across services, then a little for citations and for having an abstract.
  const value = (paper: FoundPaper) => (paper.score ?? 0) + Math.log10((paper.cited_by_count ?? 0) + 1) * 0.08 + (paper.abstract ? 0.1 : 0);
  return list.sort((a, b) => value(b) - value(a));
}

/** Library documents as papers (title, authors, year and the matching passages as the abstract). */
async function libraryPapers(userId: string, query: string, documentIds: string[], limit: number): Promise<FoundPaper[]> {
  const hits = await libraryHits(userId, query, documentIds, limit);
  return hits.map(({ document, passages }) => {
    const authors = Array.isArray(document.authors) ? document.authors.map((author: any) => ({ name: String(author?.name ?? author ?? '') })).filter((author) => author.name) : [];
    const pages = passages.map((passage) => `${passage.page ? `(p. ${passage.page}) ` : ''}${passage.content}`).join(' … ');
    return {
      ...emptyPaper(`LIB:${document.id}`, 'library'),
      title: document.title || document.filename,
      authors, year: Number(String(document.publication_date || '').slice(0, 4)) || null, venue: document.publisher,
      doi: doiKey(document.doi), abstract: (pages || document.abstract || '').slice(0, 4000) || null, url: null,
      score: 2,
    };
  });
}

export type SearchContext = { userId?: string };

/** Searches the chosen groups. `limit` is the number of papers wanted after merging. */
export async function searchSources(input: SearchInput, context: SearchContext = {}): Promise<SearchOutput> {
  const filters: SearchFilters = { excludeRetracted: true, ...input.filters };
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);
  // Each service is asked for more than wanted when filters are applied here afterwards.
  const ask: ProviderSearch = { query: input.query, filters, limit: Math.min(100, Math.ceil(limit * (filters.studyTypes?.length || filters.journalTier ? 2.5 : 1.3))), sort: input.sort ?? 'relevance' };
  const groups = new Set(input.groups.length ? input.groups : (['papers'] as SourceGroup[]));
  const tasks: { provider: ProviderId; run: () => Promise<FoundPaper[]> }[] = [];
  if (groups.has('papers')) {
    tasks.push({ provider: 'openalex', run: () => searchOpenAlex(ask) });
    tasks.push({ provider: 'semantic_scholar', run: () => searchSemanticScholar({ ...ask, limit: Math.min(ask.limit, 40) }) });
    if (coreAvailable()) tasks.push({ provider: 'core', run: () => searchCore(ask) });
  }
  if (groups.has('medical')) {
    tasks.push({ provider: 'pubmed', run: () => searchPubmed(ask) });
    tasks.push({ provider: 'europepmc', run: () => searchEuropePmc(ask, 'medical') });
  }
  if (groups.has('preprints')) {
    tasks.push({ provider: 'arxiv', run: () => searchArxiv({ ...ask, limit: Math.min(ask.limit, 30) }) });
    tasks.push({ provider: 'europepmc', run: () => searchEuropePmc({ ...ask, filters: { ...filters, excludePreprints: false } }, 'preprints') });
  }
  if (groups.has('trials')) tasks.push({ provider: 'clinicaltrials', run: () => searchClinicalTrials(ask) });
  if (groups.has('datasets')) tasks.push({ provider: 'datacite', run: () => searchDatacite(ask) });
  if (groups.has('library') && context.userId) {
    tasks.push({ provider: 'library', run: () => libraryPapers(context.userId!, input.query, input.libraryDocumentIds ?? [], Math.min(limit, 12)) });
  }
  const webTask = groups.has('web') && webSearchAvailable() ? searchWeb(input.query, Math.min(10, limit)) : Promise.resolve([]);

  const [settled, web] = await Promise.all([Promise.allSettled(tasks.map((task) => task.run())), webTask.then((value) => ({ ok: true as const, value }), (error) => ({ ok: false as const, error }))]);
  const counts: SearchOutput['counts'] = {};
  const errors: SearchOutput['errors'] = [];
  const lists: FoundPaper[][] = [];
  settled.forEach((result, index) => {
    const { provider } = tasks[index];
    if (result.status === 'fulfilled') {
      counts[provider] = (counts[provider] ?? 0) + result.value.length;
      lists.push(result.value);
    } else {
      errors.push({ provider, message: (result.reason as Error)?.message || 'failed' });
    }
  });
  if (!web.ok) errors.push({ provider: 'web', message: (web.error as Error)?.message || 'failed' });
  else if (groups.has('web')) counts.web = web.value.length;

  // Library first in its own list so the person's own papers are never crowded out.
  const papers = sortPapers(applyFilters(mergeResults(lists), filters), input.sort).slice(0, limit);
  return { papers, web: web.ok ? web.value : [], counts, errors };
}
