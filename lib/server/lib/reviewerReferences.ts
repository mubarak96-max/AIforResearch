/**
 * Reference list formatter (/reviewer?module=references): a pasted or uploaded reference list is
 * split and parsed, duplicates are merged (same DOI, else the same normalised title and year),
 * and each reference is looked up the way the Citation check does it (Crossref by DOI, OpenAlex by
 * title; lib/server/lib/reviewerCitations.ts). Verified references come back as CSL-JSON for the
 * browser to format in any CSL style (citation-js), and as RIS and BibTeX. References that could
 * not be verified are kept exactly as typed. Free; an optional AI cleanup (CREDIT_COSTS.ai_edit)
 * fills in the fields of the entries that could not be read, and those are looked up again.
 */
import type { LlmSlot, LlmUsage } from '../slots/types.js';
import { parseJson } from './research.js';
import { parseReference, splitReferences, titleSimilarity, type ReferenceCheck, type ReferenceInput } from './reviewerCitations.js';
import { bibtex, bibtexKey, parseName, type CiteRecord } from '../../scholarly/cite.js';
import { doiKey } from './sources/index.js';

export const MAX_REFERENCES = 200;

export type ParsedReference = {
  /** Position in the pasted list (0-based). */
  index: number;
  text: string;
  doi: string | null;
  title: string | null;
  year: number | null;
  firstAuthor: string | null;
  /** Other entries in the list merged into this one, as typed. */
  duplicates: string[];
};

export type CslItem = {
  id: string; type: string; title: string;
  author?: ({ family: string; given?: string } | { literal: string })[];
  issued?: { 'date-parts': number[][] };
  'container-title'?: string; volume?: string; issue?: string; page?: string; DOI?: string; URL?: string; note?: string;
};

export type FormattedStatus = 'verified' | 'cleaned' | 'unverified';

export type FormattedReference = {
  index: number;
  /** The reference as typed. */
  text: string;
  status: FormattedStatus;
  duplicates: string[];
  /** For verified and AI-cleaned references; null when the reference is kept as typed. */
  csl: CslItem | null;
  /** Warnings worth seeing (retracted, details differ, not found). */
  problems: string[];
  url: string | null;
};

/** Lower case, accents and punctuation removed, spaces collapsed: for comparing titles. */
export function normaliseTitle(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

/** The key two entries share when they are the same reference: the DOI, else title and year, else the whole text. */
export function dedupeKey(ref: { text: string; doi: string | null; title: string | null; year: number | null }): string {
  if (ref.doi) return `doi:${ref.doi.toLowerCase()}`;
  if (ref.title) return `title:${normaliseTitle(ref.title)}|${ref.year ?? ''}`;
  return `text:${normaliseTitle(ref.text)}`;
}

/** Splits, parses and deduplicates a reference list. Pure, for tests. */
export function parseReferenceList(text: string): { references: ParsedReference[]; total: number; duplicates_removed: number } {
  const entries = splitReferences(text);
  const byKey = new Map<string, ParsedReference>();
  const byDoi = new Map<string, ParsedReference>();
  const references: ParsedReference[] = [];
  entries.forEach((entry, index) => {
    const parsed = parseReference(entry);
    const ref: ParsedReference = { index, text: entry, ...parsed, duplicates: [] };
    // The DOI decides first. Without a DOI on both sides, the normalised title and year decide.
    const doi = ref.doi?.toLowerCase() ?? null;
    const textKey = dedupeKey({ ...ref, doi: null });
    let existing = doi ? byDoi.get(doi) ?? null : null;
    if (!existing) {
      const sameTitle = byKey.get(textKey) ?? null;
      if (sameTitle && (!doi || !sameTitle.doi)) existing = sameTitle;
    }
    if (existing) {
      existing.duplicates.push(entry);
      if (!existing.doi && ref.doi) { existing.doi = ref.doi; byDoi.set(doi!, existing); }
      return;
    }
    references.push(ref);
    if (doi) byDoi.set(doi, ref);
    if (!byKey.has(textKey)) byKey.set(textKey, ref);
  });
  return { references: references.slice(0, MAX_REFERENCES), total: entries.length, duplicates_removed: entries.length - references.length };
}

/** CSL type for a Crossref or OpenAlex work type. */
export function cslType(type: string | null | undefined): string {
  switch (type) {
    case 'book': case 'monograph': case 'edited-book': return 'book';
    case 'book-chapter': case 'book-section': return 'chapter';
    case 'proceedings-article': return 'paper-conference';
    case 'posted-content': case 'preprint': return 'article';
    case 'dissertation': return 'thesis';
    case 'report': return 'report';
    case 'dataset': return 'dataset';
    case 'web': case 'webpage': return 'webpage';
    default: return 'article-journal';
  }
}

const RIS_TYPES: Record<string, string> = { book: 'BOOK', chapter: 'CHAP', 'paper-conference': 'CPAPER', article: 'GEN', thesis: 'THES', report: 'RPRT', dataset: 'DATA', webpage: 'ELEC', 'article-journal': 'JOUR' };
const CITE_TYPES: Record<string, string> = { book: 'book', chapter: 'book-chapter', 'paper-conference': 'proceedings-article', article: 'preprint', thesis: 'dissertation', dataset: 'dataset', webpage: 'other', report: 'other', 'article-journal': 'article' };

const nameOf = (raw: string) => {
  if (/\b(group|consortium|collaboration|organi[sz]ation|association|institute|university|committee|council|agency|society|ministry|department)\b/i.test(raw)) return { literal: raw.trim() };
  const name = parseName(raw);
  return name.given ? { family: name.family, given: name.given } : { literal: name.family };
};

/** CSL-JSON for a reference found at Crossref or OpenAlex. */
export function cslFromCheck(check: ReferenceCheck, id: string): CslItem | null {
  if (!check.found?.title) return null;
  const biblio = check.biblio;
  const authors = biblio?.authors?.length ? biblio.authors : check.found.authors;
  const item: CslItem = { id, type: cslType(check.found.type), title: check.found.title };
  if (authors.length) item.author = authors.map(nameOf);
  if (check.found.year) item.issued = { 'date-parts': [[check.found.year]] };
  if (check.found.venue) item['container-title'] = check.found.venue;
  if (biblio?.volume) item.volume = biblio.volume;
  if (biblio?.issue) item.issue = biblio.issue;
  if (biblio?.first_page) item.page = biblio.last_page && biblio.last_page !== biblio.first_page ? `${biblio.first_page}-${biblio.last_page}` : biblio.first_page;
  if (check.found.doi) item.DOI = check.found.doi;
  else if (check.found.url && /^https?:/.test(check.found.url)) item.URL = check.found.url;
  return item;
}

export type CleanedFields = { authors?: unknown; title?: unknown; year?: unknown; container?: unknown; volume?: unknown; issue?: unknown; pages?: unknown; doi?: unknown; type?: unknown };
const field = (value: unknown, max = 300) => (typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null);

/** CSL-JSON from fields the AI cleanup read out of a reference (not verified). */
export function cslFromFields(fields: CleanedFields, id: string): CslItem | null {
  const title = field(fields.title, 500);
  if (!title) return null;
  const item: CslItem = { id, type: cslType(field(fields.type, 40)), title };
  const authors = Array.isArray(fields.authors) ? fields.authors.map((value) => field(value, 200)).filter((value): value is string => Boolean(value)).slice(0, 30) : [];
  if (authors.length) item.author = authors.map(nameOf);
  const year = Number(fields.year);
  if (Number.isInteger(year) && year > 1400 && year < 2100) item.issued = { 'date-parts': [[year]] };
  const container = field(fields.container);
  if (container) item['container-title'] = container;
  const volume = field(fields.volume, 40);
  if (volume) item.volume = volume;
  const issue = field(fields.issue, 40);
  if (issue) item.issue = issue;
  const pages = field(fields.pages, 40);
  if (pages) item.page = pages.replace(/[–—]/g, '-');
  const doi = doiKey(field(fields.doi));
  if (doi) item.DOI = doi;
  return item;
}

/** The result for one reference after its lookup. A found record whose title is clearly different is not used. */
export function formatCheck(ref: ParsedReference, check: ReferenceCheck): FormattedReference {
  const id = `ref${ref.index + 1}`;
  const base = { index: ref.index, text: ref.text, duplicates: ref.duplicates, url: check.found?.url ?? null };
  const differentPaper = Boolean(ref.title && check.found?.title && titleSimilarity(ref.title, check.found.title) < 0.6);
  const csl = check.status === 'not_found' || differentPaper ? null : cslFromCheck(check, id);
  if (!csl) {
    const problems = differentPaper ? [`The closest record found has a different title (“${check.found!.title}”), so this reference is kept as typed.`] : check.problems.length ? check.problems : ['No matching record was found.'];
    return { ...base, status: 'unverified', csl: null, problems, url: differentPaper ? null : base.url };
  }
  return { ...base, status: 'verified', csl, problems: check.status === 'ok' ? [] : check.problems };
}

/** Two typed references that turned out to be the same paper are merged. Pure, for tests. */
export function mergeResolved(items: FormattedReference[]): FormattedReference[] {
  const seen = new Map<string, FormattedReference>();
  const out: FormattedReference[] = [];
  for (const item of items) {
    const key = item.csl?.DOI ? `doi:${item.csl.DOI.toLowerCase()}` : item.csl ? `title:${normaliseTitle(item.csl.title)}|${item.csl.issued?.['date-parts']?.[0]?.[0] ?? ''}` : null;
    const existing = key ? seen.get(key) : null;
    if (existing) { existing.duplicates.push(item.text, ...item.duplicates); continue; }
    if (key) seen.set(key, item);
    out.push(item);
  }
  return out;
}

const citeRecord = (item: CslItem): CiteRecord => {
  const [first, last] = (item.page ?? '').split('-');
  return {
    title: item.title,
    authors: (item.author ?? []).map((name) => ('literal' in name ? name.literal : [name.given, name.family].filter(Boolean).join(' '))),
    year: item.issued?.['date-parts']?.[0]?.[0] ?? null,
    venue: item['container-title'] ?? null, volume: item.volume ?? null, issue: item.issue ?? null,
    firstPage: first || null, lastPage: last || null, doi: item.DOI ?? null, type: CITE_TYPES[item.type] ?? 'article',
  };
};

/** The reference as a CSL item: verified and cleaned ones as found, the rest as a minimal record with the typed text. */
export function exportItem(ref: FormattedReference): CslItem {
  if (ref.csl) return ref.status === 'cleaned' ? { ...ref.csl, note: 'Not verified: fields read by AI from the typed reference.' } : ref.csl;
  const parsed = parseReference(ref.text);
  const item: CslItem = { id: `ref${ref.index + 1}`, type: 'article', title: parsed.title ?? ref.text, note: `Not verified. As typed: ${ref.text}` };
  if (parsed.year) item.issued = { 'date-parts': [[parsed.year]] };
  if (parsed.firstAuthor) item.author = [{ literal: parsed.firstAuthor }];
  if (parsed.doi) item.DOI = parsed.doi;
  return item;
}

const risLine = (tag: string, value: string | number | null | undefined) => (value === null || value === undefined || value === '' ? null : `${tag}  - ${String(value).replace(/\s+/g, ' ').trim()}`);

/** RIS for a list of references. Pure, for tests. */
export function toRis(refs: FormattedReference[]): string {
  return refs.map((ref) => {
    const item = exportItem(ref);
    const [first, last] = (item.page ?? '').split('-');
    const lines = [
      risLine('TY', RIS_TYPES[item.type] ?? 'GEN'),
      ...(item.author ?? []).map((name) => risLine('AU', 'literal' in name ? name.literal : `${name.family}, ${name.given ?? ''}`.replace(/, $/, ''))),
      risLine('TI', item.title),
      risLine(item.type === 'article-journal' ? 'JO' : 'T2', item['container-title']),
      risLine('PY', item.issued?.['date-parts']?.[0]?.[0]),
      risLine('VL', item.volume), risLine('IS', item.issue), risLine('SP', first), risLine('EP', last),
      risLine('DO', item.DOI), risLine('UR', item.DOI ? `https://doi.org/${item.DOI}` : item.URL), risLine('N1', item.note),
      'ER  - ',
    ];
    return lines.filter(Boolean).join('\r\n');
  }).join('\r\n\r\n') + '\r\n';
}

/** BibTeX for a list of references, with unique keys. Pure, for tests. */
export function toBibtex(refs: FormattedReference[]): string {
  const used = new Map<string, number>();
  return refs.map((ref) => {
    const item = exportItem(ref);
    const record = citeRecord(item);
    let entry = bibtex(record);
    const key = bibtexKey(record);
    const count = used.get(key) ?? 0;
    used.set(key, count + 1);
    if (count) entry = entry.replace(`{${key},`, `{${key}${String.fromCharCode(96 + count + 1)},`);
    if (item.note) entry = entry.replace(/\n}$/, `,\n  note = {${item.note.replace(/([{}])/g, '\\$1')}}\n}`);
    return entry;
  }).join('\n\n') + '\n';
}

/** The AI cleanup: read the fields out of references that could not be parsed or found. */
export async function cleanupReferences(llm: LlmSlot, refs: FormattedReference[], usage: LlmUsage): Promise<Map<number, CleanedFields>> {
  const batch = refs.slice(0, 60);
  const out = new Map<number, CleanedFields>();
  if (!batch.length) return out;
  const { text, usage: used } = await llm.complete({
    task: 'fast', temperature: 0, json: true, maxTokens: 300 + batch.length * 180,
    messages: [
      {
        role: 'system',
        content: 'You read bibliographic references that a parser could not read. For each, give its fields exactly as written in the reference: fix only splitting, spacing and order. ' +
          'Never invent a field that is not in the text (no guessed DOI, pages or volume); use null when absent. Authors as "Given Family" strings. ' +
          'type is one of journal-article, book, book-chapter, proceedings-article, dissertation, report, preprint, webpage. ' +
          'Answer with JSON only: {"items": [{"i": 0, "authors": ["..."], "title": "...", "year": 2020, "container": "journal or book or null", "volume": null, "issue": null, "pages": null, "doi": null, "type": "journal-article"}]}',
      },
      { role: 'user', content: batch.map((ref, i) => `i=${i}: ${ref.text}`).join('\n') },
    ],
  });
  usage.inputTokens += used.inputTokens;
  usage.outputTokens += used.outputTokens;
  for (const item of parseJson<{ items?: (CleanedFields & { i?: unknown })[] }>(text)?.items ?? []) {
    const ref = batch[Number(item?.i)];
    if (ref) out.set(ref.index, item);
  }
  return out;
}

/** Turns the fields from the cleanup into a lookup input for a second try. */
export function cleanedInput(ref: FormattedReference, fields: CleanedFields): ReferenceInput {
  const year = Number(fields.year);
  return {
    text: ref.text,
    doi: doiKey(field(fields.doi)),
    title: field(fields.title, 500),
    year: Number.isInteger(year) ? year : null,
    authors: Array.isArray(fields.authors) ? fields.authors.map((value) => field(value, 200)).filter((value): value is string => Boolean(value)) : null,
  };
}

export function referenceSummary(items: FormattedReference[], duplicatesRemoved: number) {
  const counts = { verified: 0, cleaned: 0, unverified: 0 };
  for (const item of items) counts[item.status] += 1;
  const parts = [`${items.length} reference${items.length === 1 ? '' : 's'}: ${counts.verified} verified`];
  if (counts.cleaned) parts.push(`${counts.cleaned} cleaned by AI but not verified`);
  parts.push(`${counts.unverified} could not be verified`);
  return { counts, summary: `${parts.join(', ')}${duplicatesRemoved ? `; ${duplicatesRemoved} duplicate${duplicatesRemoved === 1 ? '' : 's'} merged` : ''}.` };
}
