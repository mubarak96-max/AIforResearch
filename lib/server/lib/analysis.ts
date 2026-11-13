/**
 * Citation Map, snowballing, review citation search and Landscape, all from OpenAlex (the
 * configured Scholar index first, public OpenAlex as fallback) with OpenCitations, then Semantic
 * Scholar, when OpenAlex has no links for a paper. No credits: these are searches, not AI jobs.
 *
 * OpenAlex: https://api.openalex.org (works/{id}, works?filter=cites:…, works?filter=openalex_id:…,
 * works?group_by=…). OpenCitations: https://api.opencitations.net/index/v2/references|citations/doi:….
 * Semantic Scholar: https://api.semanticscholar.org/graph/v1/paper/{id}/references|citations.
 */
import { cleanQuery } from '../slots/papers.js';
import { papersSlots } from './directory.js';
import { classifyStudy, doiKey } from './sources/classify.js';
import { openAlexToFound } from './sources/providers.js';
import { openCitationsLinks, semanticScholarLinks } from './sources/index.js';
import type { FoundPaper } from './sources/types.js';

/** A paper as the map draws and lists it. */
export type MapNode = {
  id: string;
  title: string;
  authors: string[];
  year: number | null;
  venue: string | null;
  doi: string | null;
  cited_by_count: number;
  study_type: string | null;
  is_oa: boolean;
  is_retracted: boolean;
  url: string | null;
  pdf_url: string | null;
  abstract: string | null;
  /** In snowballing: how many papers of the set link to it. */
  links?: number;
};

const SELECT = 'id,doi,title,display_name,publication_year,publication_date,type,authorships,primary_location,best_oa_location,open_access,cited_by_count,abstract_inverted_index,is_retracted,ids,referenced_works';
const shortId = (value: unknown) => String(value ?? '').replace(/^https?:\/\/openalex\.org\//i, '');
export const isWorkId = (value: unknown): value is string => typeof value === 'string' && /^W\d{1,12}$/.test(value);

export function toNode(paper: FoundPaper): MapNode {
  return {
    id: paper.id, title: paper.title, authors: paper.authors.map((author) => author.name), year: paper.year, venue: paper.venue, doi: paper.doi,
    cited_by_count: paper.cited_by_count ?? 0, study_type: paper.study_type ?? classifyStudy({ title: paper.title, labels: [paper.type] }),
    is_oa: paper.is_oa, is_retracted: Boolean(paper.is_retracted), url: paper.url, pdf_url: paper.pdf_url,
    abstract: paper.abstract ? paper.abstract.slice(0, 1200) : null,
  };
}

/**
 * One OpenAlex call across the indexes: the configured one first, the next when it fails or its
 * answer lacks what `usable` needs (Scholar may not serve every endpoint, e.g. group_by).
 */
export async function openAlex(path: string, params: Record<string, string>, usable: (data: any) => boolean = (data) => Boolean(data)): Promise<any | null> {
  let lastError: unknown = null;
  for (const slot of papersSlots()) {
    try {
      const data = await slot.get(path, params);
      if (data && usable(data)) return data;
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError) throw lastError;
  return null;
}

const works = (data: any): any[] => (Array.isArray(data?.results) ? data.results : []);

/** A seed paper from an OpenAlex id, a DOI or a title (the best title match). */
export async function resolveSeed(input: { work_id?: string | null; doi?: string | null; title?: string | null }): Promise<{ work: any; node: MapNode } | null> {
  let work: any = null;
  if (isWorkId(input.work_id)) work = await openAlex(`works/${input.work_id}`, { select: SELECT });
  const doi = doiKey(input.doi);
  if (!work && doi) work = await openAlex(`works/doi:${encodeURI(doi).replace(/#/g, '%23').replace(/\?/g, '%3F')}`, { select: SELECT });
  if (!work && input.title && cleanQuery(input.title)) {
    work = works(await openAlex('works', { search: cleanQuery(input.title), per_page: '1', select: SELECT }))[0] ?? null;
  }
  if (!work?.id) return null;
  return { work, node: toNode(openAlexToFound(work)) };
}

/** OpenAlex works by id, in batches of 50 (the filter's limit). */
export async function worksByIds(ids: string[]): Promise<MapNode[]> {
  const unique = [...new Set(ids.filter(isWorkId))];
  const out: MapNode[] = [];
  for (let start = 0; start < unique.length; start += 50) {
    const batch = unique.slice(start, start + 50);
    const data = await openAlex('works', { filter: `openalex_id:${batch.join('|')}`, per_page: '50', select: SELECT });
    out.push(...works(data).map((work) => toNode(openAlexToFound(work))));
  }
  return out;
}

/** What a seed cites (backward), most cited first. */
export async function referencesOf(work: any, limit = 60): Promise<MapNode[]> {
  const ids = (Array.isArray(work?.referenced_works) ? work.referenced_works : []).map(shortId).filter(isWorkId);
  let nodes = ids.length ? await worksByIds(ids.slice(0, 200)) : [];
  if (!nodes.length) nodes = await openCitationsNodes(work, 'references');
  if (!nodes.length) nodes = await s2Links(work, 'references', limit);
  return nodes.sort((a, b) => b.cited_by_count - a.cited_by_count).slice(0, limit);
}

/** What cites a seed (forward), most cited first. */
export async function citationsOf(work: any, limit = 60): Promise<MapNode[]> {
  const id = shortId(work?.id);
  let nodes: MapNode[] = [];
  if (isWorkId(id)) {
    const data = await openAlex('works', { filter: `cites:${id}`, per_page: String(Math.min(100, limit)), sort: 'cited_by_count:desc', select: SELECT });
    nodes = works(data).map((item) => toNode(openAlexToFound(item)));
  }
  if (!nodes.length) nodes = (await openCitationsNodes(work, 'citations')).sort((a, b) => b.cited_by_count - a.cited_by_count);
  if (!nodes.length) nodes = await s2Links(work, 'citations', limit);
  return nodes.slice(0, limit);
}

/**
 * OpenCitations' links for a paper OpenAlex has none for (by DOI), looked up in OpenAlex by the
 * OpenAlex ids OpenCitations gives, else by DOI.
 */
async function openCitationsNodes(work: any, direction: 'references' | 'citations'): Promise<MapNode[]> {
  const doi = doiKey(work?.doi);
  if (!doi) return [];
  const links = await openCitationsLinks(doi, direction, 200).catch(() => []);
  if (!links.length) return [];
  const nodes = await worksByIds(links.map((link) => link.openalex).filter(isWorkId)).catch(() => [] as MapNode[]);
  const known = new Set(nodes.map((node) => doiKey(node.doi)).filter(Boolean));
  const dois = [...new Set(links.filter((link) => !link.openalex && link.doi && !known.has(link.doi)).map((link) => link.doi!))].slice(0, 50);
  if (dois.length) {
    const data = await openAlex('works', { filter: `doi:${dois.join('|')}`, per_page: '50', select: SELECT }).catch(() => null);
    nodes.push(...works(data).map((item) => toNode(openAlexToFound(item))));
  }
  return nodes;
}

/** Semantic Scholar's links for a paper OpenAlex has none for (by DOI). */
async function s2Links(work: any, direction: 'references' | 'citations', limit: number): Promise<MapNode[]> {
  const doi = doiKey(work?.doi);
  if (!doi) return [];
  const found = await semanticScholarLinks(`DOI:${doi}`, direction, limit).catch(() => []);
  return found.map(toNode);
}

/** Map for up to 10 seeds: each seed with its references and citations. */
export async function citationMap(seeds: { work_id?: string | null; doi?: string | null; title?: string | null }[], limit = 40) {
  const resolved = (await Promise.all(seeds.slice(0, 10).map((seed) => resolveSeed(seed).catch(() => null)))).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const perSeed = Math.max(10, Math.floor(limit / Math.max(1, resolved.length)));
  const [references, citations] = await Promise.all([
    Promise.all(resolved.map((seed) => referencesOf(seed.work, perSeed).catch(() => []))),
    Promise.all(resolved.map((seed) => citationsOf(seed.work, perSeed).catch(() => []))),
  ]);
  const seedIds = new Set(resolved.map((seed) => seed.node.id));
  const dedupe = (lists: MapNode[][]) => {
    const seen = new Map<string, MapNode>();
    for (const list of lists) for (const node of list) if (!seedIds.has(node.id) && !seen.has(node.id)) seen.set(node.id, node);
    return [...seen.values()];
  };
  return { seeds: resolved.map((seed) => seed.node), references: dedupe(references), citations: dedupe(citations) };
}

/**
 * Ranks candidate papers by how many papers of the set link to them: backward, papers the set
 * cites (co-citation: "cited by 2+ of your set"); forward, papers that cite the set. Papers
 * already in the set are left out. Pure, for tests.
 */
export function rankByLinks(lists: { from: string; nodes: MapNode[] }[], exclude: Set<string>): MapNode[] {
  const counts = new Map<string, { node: MapNode; from: Set<string> }>();
  for (const { from, nodes } of lists) {
    for (const node of nodes) {
      if (exclude.has(node.id)) continue;
      const entry = counts.get(node.id) ?? { node, from: new Set<string>() };
      entry.from.add(from);
      counts.set(node.id, entry);
    }
  }
  return [...counts.values()]
    .map(({ node, from }) => ({ ...node, links: from.size }))
    .sort((a, b) => (b.links ?? 0) - (a.links ?? 0) || b.cited_by_count - a.cited_by_count);
}

/** The next snowballing round from the whole set. */
export async function snowball(ids: string[], direction: 'backward' | 'forward' | 'both', exclude: string[] = [], limit = 60) {
  const set = [...new Set(ids.filter(isWorkId))].slice(0, 25);
  const seeds = await worksByIdsRaw(set);
  const lists: { from: string; nodes: MapNode[] }[] = [];
  await Promise.all(seeds.map(async (work) => {
    const from = shortId(work.id);
    if (direction !== 'forward') lists.push({ from, nodes: await referencesOf(work, 80).catch(() => []) });
    if (direction !== 'backward') lists.push({ from, nodes: await citationsOf(work, 50).catch(() => []) });
  }));
  return rankByLinks(lists, new Set([...set, ...exclude])).slice(0, limit);
}

async function worksByIdsRaw(ids: string[]): Promise<any[]> {
  const out: any[] = [];
  for (let start = 0; start < ids.length; start += 50) {
    out.push(...works(await openAlex('works', { filter: `openalex_id:${ids.slice(start, start + 50).join('|')}`, per_page: '50', select: SELECT })));
  }
  return out;
}

const REVIEW_TYPES = new Set(['review', 'systematic-review', 'meta-analysis']);

/** Review articles and meta-analyses that cite papers of the set, most links first. */
export async function reviewsCiting(ids: string[], limit = 40): Promise<MapNode[]> {
  const set = [...new Set(ids.filter(isWorkId))].slice(0, 50);
  if (!set.length) return [];
  const cites = `cites:${set.join('|')}`;
  const [typed, all] = await Promise.all([
    openAlex('works', { filter: `${cites},type:review`, per_page: '100', sort: 'cited_by_count:desc', select: SELECT }).catch(() => null),
    openAlex('works', { filter: cites, per_page: '100', sort: 'cited_by_count:desc', select: SELECT }).catch(() => null),
  ]);
  const seen = new Map<string, { node: MapNode; links: number }>();
  for (const work of [...works(typed), ...works(all)]) {
    const node = toNode(openAlexToFound(work));
    const isReview = work?.type === 'review' || REVIEW_TYPES.has(node.study_type || '');
    // Papers already in the set are not news.
    if (!isReview || seen.has(node.id) || set.includes(node.id)) continue;
    if (node.study_type === null || node.study_type === 'other') node.study_type = 'review';
    const refs = new Set((work?.referenced_works ?? []).map(shortId));
    seen.set(node.id, { node, links: set.filter((id) => refs.has(id)).length || 1 });
  }
  return [...seen.values()].map(({ node, links }) => ({ ...node, links })).sort((a, b) => (b.links ?? 0) - (a.links ?? 0) || b.cited_by_count - a.cited_by_count).slice(0, limit);
}

// ------------------------------------------------------------------ Landscape

export type Count = { key: string; label: string; count: number };
export type Landscape = {
  query: string;
  total: number;
  years: Count[];
  topics: Count[];
  journals: Count[];
  authors: Count[];
  institutions: Count[];
  open_access: { open: number; closed: number; share: number | null };
  top_works: MapNode[];
  retrieved: string;
  source: 'OpenAlex';
};

/** group_by rows to counts (labels as OpenAlex names them). Pure, for tests. */
export function groupCounts(data: any, limit = 10): Count[] {
  return (Array.isArray(data?.group_by) ? data.group_by : [])
    .map((row: any) => ({ key: shortId(row?.key), label: String(row?.key_display_name ?? row?.key ?? ''), count: Number(row?.count) || 0 }))
    .filter((row: Count) => row.label && row.label !== 'unknown' && row.count > 0)
    .slice(0, limit);
}

/** Works per year in order, with missing years as zero between the first and last. Pure, for tests. */
export function yearSeries(rows: Count[], fromYear?: number | null, toYear?: number | null): Count[] {
  const byYear = new Map(rows.map((row) => [Number(row.key), row.count]));
  const years = [...byYear.keys()].filter(Number.isFinite);
  if (!years.length) return [];
  const thisYear = new Date().getUTCFullYear();
  const first = Math.max(fromYear ?? Math.min(...years), Math.min(...years), 1900);
  const last = Math.min(toYear ?? Math.max(...years), Math.max(...years), thisYear);
  const out: Count[] = [];
  for (let year = first; year <= last; year += 1) out.push({ key: String(year), label: String(year), count: byYear.get(year) ?? 0 });
  return out;
}

export async function landscape(query: string, options: { fromYear?: number | null; toYear?: number | null } = {}): Promise<Landscape> {
  const search = cleanQuery(query);
  const filters: string[] = [];
  if (options.fromYear) filters.push(`from_publication_date:${options.fromYear}-01-01`);
  if (options.toYear) filters.push(`to_publication_date:${options.toYear}-12-31`);
  const base: Record<string, string> = { search, ...(filters.length ? { filter: filters.join(',') } : {}) };
  const grouped = (field: string) => openAlex('works', { ...base, group_by: field }, (data) => Array.isArray(data?.group_by)).catch(() => null);
  const [years, topics, journals, authors, institutions, oa, top] = await Promise.all([
    grouped('publication_year'), grouped('primary_topic.id'), grouped('primary_location.source.id'), grouped('authorships.author.id'),
    grouped('authorships.institutions.id'), grouped('open_access.is_oa'),
    openAlex('works', { ...base, sort: 'cited_by_count:desc', per_page: '10', select: SELECT }).catch(() => null),
  ]);
  const oaRows = groupCounts(oa, 5);
  const open = oaRows.find((row) => row.key === 'true' || row.label === 'true')?.count ?? 0;
  const closed = oaRows.find((row) => row.key === 'false' || row.label === 'false')?.count ?? 0;
  const yearRows = groupCounts(years, 400);
  return {
    query: search,
    total: Number(top?.meta?.count ?? yearRows.reduce((sum, row) => sum + row.count, 0)) || 0,
    years: yearSeries(yearRows, options.fromYear, options.toYear),
    topics: groupCounts(topics), journals: groupCounts(journals), authors: groupCounts(authors), institutions: groupCounts(institutions),
    open_access: { open, closed, share: open + closed ? open / (open + closed) : null },
    top_works: works(top).map((work) => toNode(openAlexToFound(work))),
    retrieved: new Date().toISOString().slice(0, 10),
    source: 'OpenAlex',
  };
}

// ------------------------------------------------------------------ Data Lab report

export type DataResult = { title: string; rows: [string, string][]; apa?: string; warnings?: string[] };

/**
 * The prompt for a Data Lab results section: only the numbers the browser computed, which the
 * model may report but never change or add to.
 */
export function dataReportPrompt(input: { question: string; dataset: string; n: number; columns: { name: string; kind: string; summary: string }[]; results: DataResult[]; level: string }) {
  const results = input.results.map((result, index) => `Result ${index + 1}: ${result.title}\n${result.rows.map(([label, value]) => `- ${label}: ${value}`).join('\n')}${result.apa ? `\nAPA line: ${result.apa}` : ''}${result.warnings?.length ? `\nNotes: ${result.warnings.join(' ')}` : ''}`).join('\n\n');
  return [
    {
      role: 'system' as const,
      content: 'You write the results section of a research report from statistics that were already calculated. Use only the numbers given, exactly as written; never compute, round differently, estimate or add any number, test or variable that is not listed. ' +
        `Write for ${input.level}. Use APA 7 style for statistics. Plain, formal language. Markdown with "##" headings: ## Sample, ## Results (one paragraph per result), ## Interpretation (what the results do and do not show, without claiming causation from correlations), ## Limitations (from the notes, sample size and the tests used). No title line, no preamble.`,
    },
    {
      role: 'user' as const,
      content: `Research question: ${input.question || 'Not given'}\nDataset: ${input.dataset} (${input.n} rows)\nVariables:\n${input.columns.map((column) => `- ${column.name} (${column.kind}): ${column.summary}`).join('\n')}\n\n${results}`,
    },
  ];
}
