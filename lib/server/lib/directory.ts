/**
 * The public research directory (/research): paper and author records from the papers slot
 * (Scholar's OpenAlex-compatible index, public OpenAlex as fallback). Read-only and anonymous:
 * no account, no metering. The mappers are pure, for tests.
 */
import { createPapersSlot, PapersError, workToPaper, type PagedPapersSlot, type RichPaper } from '../slots/papers.js';
import { env } from '../env.js';

export const WORK_ID = /^W\d{1,12}$/;
export const AUTHOR_ID = /^A\d{1,12}$/;

export type DirectoryAuthor = { id: string | null; name: string; institution: string | null };

export type PaperRecord = {
  paper: RichPaper;
  /** Every author (up to 50), in order, with their directory ids. */
  authors: DirectoryAuthor[];
  moreAuthors: number;
  topics: { id: string; name: string }[];
  keywords: string[];
  relatedIds: string[];
  referenceCount: number;
  language: string | null;
  landingUrl: string | null;
  /** Which index answered. */
  source: string;
};

export type AuthorRecord = {
  id: string;
  name: string;
  orcid: string | null;
  institution: string | null;
  country: string | null;
  worksCount: number;
  citedByCount: number;
  hIndex: number | null;
  topics: string[];
  otherNames: string[];
  source: string;
};

const short = (id: unknown) => (typeof id === 'string' ? id.replace(/^https?:\/\/openalex\.org\//i, '') : '');
const str = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);
const num = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

export function toPaperRecord(work: any, source: string): PaperRecord | null {
  if (!work || typeof work !== 'object' || !work.id) return null;
  const authorships: any[] = Array.isArray(work.authorships) ? work.authorships : [];
  const topics: any[] = Array.isArray(work.topics) ? work.topics : work.primary_topic ? [work.primary_topic] : [];
  return {
    paper: workToPaper(work),
    authors: authorships.slice(0, 50).map((authorship) => ({
      id: AUTHOR_ID.test(short(authorship?.author?.id)) ? short(authorship.author.id) : null,
      name: String(authorship?.author?.display_name || authorship?.raw_author_name || 'Unknown'),
      institution: str(authorship?.institutions?.[0]?.display_name),
    })),
    moreAuthors: Math.max(0, authorships.length - 50),
    topics: topics.slice(0, 6).map((topic) => ({ id: short(topic?.id), name: String(topic?.display_name || '') })).filter((topic) => topic.name),
    keywords: (Array.isArray(work.keywords) ? work.keywords : []).map((keyword: any) => str(keyword?.display_name)).filter(Boolean).slice(0, 8) as string[],
    relatedIds: (Array.isArray(work.related_works) ? work.related_works : []).map(short).filter((id: string) => WORK_ID.test(id)).slice(0, 8),
    referenceCount: Array.isArray(work.referenced_works) ? work.referenced_works.length : num(work.referenced_works_count),
    language: str(work.language),
    landingUrl: str(work.primary_location?.landing_page_url),
    source,
  };
}

export function toAuthorRecord(author: any, source: string): AuthorRecord | null {
  const id = short(author?.id);
  if (!author || !AUTHOR_ID.test(id)) return null;
  const institution = author.last_known_institutions?.[0] ?? author.last_known_institution ?? author.affiliations?.[0]?.institution ?? null;
  const topics: any[] = Array.isArray(author.topics) ? author.topics : Array.isArray(author.x_concepts) ? author.x_concepts : [];
  const name = String(author.display_name || 'Unknown author');
  return {
    id,
    name,
    orcid: str(author.orcid)?.replace(/^https?:\/\/orcid\.org\//i, '') ?? null,
    institution: str(institution?.display_name),
    country: str(institution?.country_code),
    worksCount: num(author.works_count),
    citedByCount: num(author.cited_by_count),
    hIndex: typeof author.summary_stats?.h_index === 'number' ? author.summary_stats.h_index : null,
    topics: topics.map((topic) => str(topic?.display_name)).filter(Boolean).slice(0, 8) as string[],
    otherNames: (Array.isArray(author.display_name_alternatives) ? author.display_name_alternatives : [])
      .filter((alt: unknown) => typeof alt === 'string' && alt !== name)
      .slice(0, 5),
    source,
  };
}

// ------------------------------------------------------------------ fetching

let configured: PagedPapersSlot | null = null;
let publicOpenAlex: PagedPapersSlot | null = null;

/** The configured index, then public OpenAlex (when the configured one is something else). */
export function papersSlots(): PagedPapersSlot[] {
  configured ??= createPapersSlot();
  const list = [configured];
  if (configured.provider !== 'openalex') {
    publicOpenAlex ??= createPapersSlot({ settings: { ...env, papersProvider: 'openalex' } });
    list.push(publicOpenAlex);
  }
  return list;
}

/** The configured index first; public OpenAlex when it has no such record (Scholar may not serve every entity type). */
export async function getFirst(path: string, params: Record<string, string> = {}): Promise<{ data: any; source: string } | null> {
  let lastError: unknown = null;
  for (const slot of papersSlots()) {
    try {
      const data = await slot.get(path, params);
      if (data) return { data, source: slot.provider };
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError) throw lastError;
  return null;
}

/** A record worth citing: a titled work with authors, not an index page, erratum or cover. */
export function isCitableWork(work: any): boolean {
  const type = String(work?.type || '');
  const title = String(work?.title || work?.display_name || '').trim();
  return Boolean(work?.id) && !['paratext', 'erratum', 'retraction', 'editorial', 'peer-review', 'supplementary-materials'].includes(type)
    && title.length >= 12 && Array.isArray(work?.authorships) && work.authorships.length > 0 && !work?.is_retracted;
}

export class DirectoryBusyError extends Error {
  constructor() { super('The research directory is busy. Try again in a minute.'); this.name = 'DirectoryBusyError'; }
}

async function guarded<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof PapersError) throw new DirectoryBusyError();
    throw error;
  }
}

export function getPaperRecord(id: string): Promise<PaperRecord | null> {
  if (!WORK_ID.test(id)) return Promise.resolve(null);
  return guarded(async () => {
    const hit = await getFirst(`works/${id}`);
    return hit ? toPaperRecord(hit.data, hit.source) : null;
  });
}

/** Short records for a list of work ids (related papers), in the order given. */
export function getPapersByIds(ids: string[]): Promise<RichPaper[]> {
  const clean = ids.filter((id) => WORK_ID.test(id)).slice(0, 25);
  if (!clean.length) return Promise.resolve([]);
  return guarded(async () => {
    const hit = await getFirst('works', { filter: `openalex_id:${clean.join('|')}`, per_page: String(clean.length) });
    const results: RichPaper[] = (Array.isArray(hit?.data?.results) ? hit!.data.results : []).map(workToPaper);
    const order = new Map(clean.map((id, index) => [id, index]));
    return results.filter((paper) => order.has(paper.id)).sort((a, b) => order.get(a.id)! - order.get(b.id)!);
  });
}

export function getAuthorRecord(id: string): Promise<AuthorRecord | null> {
  if (!AUTHOR_ID.test(id)) return Promise.resolve(null);
  return guarded(async () => {
    const hit = await getFirst(`authors/${id}`);
    return hit ? toAuthorRecord(hit.data, hit.source) : null;
  });
}

/** An author's most-cited works. */
export function getAuthorWorks(id: string, limit = 12): Promise<RichPaper[]> {
  if (!AUTHOR_ID.test(id)) return Promise.resolve([]);
  return guarded(async () => {
    const hit = await getFirst('works', { filter: `author.id:${id}`, sort: 'cited_by_count:desc', per_page: String(Math.min(limit, 50)) });
    return (Array.isArray(hit?.data?.results) ? hit!.data.results : []).map(workToPaper);
  });
}

export function searchDirectory(query: string, page = 1): Promise<{ results: RichPaper[]; total: number }> {
  return guarded(() => papersSlots()[0].searchPage({ query, limit: 20, page: Math.max(1, Math.min(page, 25)) }));
}

// ------------------------------------------------------------------ CSL-JSON (citation generator)

const CSL_TYPES: Record<string, string> = {
  article: 'article-journal',
  book: 'book',
  'book-chapter': 'chapter',
  dissertation: 'thesis',
  preprint: 'article',
  'proceedings-article': 'paper-conference',
  dataset: 'dataset',
  report: 'report',
  review: 'article-journal',
  editorial: 'article-journal',
  letter: 'article-journal',
};

export type CslItem = Record<string, unknown> & { id: string; type: string; title: string };

/** A work as CSL-JSON, every author included, for citation-js in the browser. */
export function workToCsl(work: any): CslItem | null {
  const record = toPaperRecord(work, '');
  if (!record) return null;
  const { paper } = record;
  const author = record.authors.map(({ name }) => {
    const clean = name.trim();
    if (clean.includes(',')) {
      const [family, ...given] = clean.split(',');
      return { family: family.trim(), given: given.join(',').trim() };
    }
    const parts = clean.split(/\s+/);
    return parts.length > 1 ? { family: parts[parts.length - 1], given: parts.slice(0, -1).join(' ') } : { literal: clean };
  });
  const dateParts = paper.publication_date && /^\d{4}-\d{2}-\d{2}$/.test(paper.publication_date)
    ? [paper.publication_date.split('-').map(Number)]
    : paper.year ? [[paper.year]] : undefined;
  const pages = paper.first_page ? (paper.last_page && paper.last_page !== paper.first_page ? `${paper.first_page}-${paper.last_page}` : paper.first_page) : undefined;
  const item: CslItem = {
    id: paper.id,
    type: CSL_TYPES[paper.type || ''] || 'article-journal',
    title: paper.title,
    author,
    ...(dateParts ? { issued: { 'date-parts': dateParts } } : {}),
    ...(paper.venue ? { 'container-title': paper.venue } : {}),
    ...(paper.volume ? { volume: paper.volume } : {}),
    ...(paper.issue ? { issue: paper.issue } : {}),
    ...(pages ? { page: pages } : {}),
    ...(paper.doi ? { DOI: paper.doi } : {}),
    ...(!paper.doi && record.landingUrl ? { URL: record.landingUrl } : {}),
  };
  return item;
}
