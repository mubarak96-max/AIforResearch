/**
 * Citation check: a reference list in, one verdict per reference out. Each reference is looked
 * up by DOI at Crossref, else by title in OpenAlex; retractions, corrections and expressions of
 * concern come from Crossref's update notices (with Retraction Watch data); preprints and
 * metadata that does not match (year, first author) are flagged. These checks use no AI and
 * cost no credits. An optional AI pass checks that the sentences citing a source say what its
 * abstract says.
 */
import type { LlmSlot, LlmUsage } from '../slots/types.js';
import { cleanQuery, reconstructAbstract } from '../slots/papers.js';
import { papersSlots } from './directory.js';
import { crossrefUpdates, crossrefWork, doiKey } from './sources/index.js';
import { parseJson } from './research.js';

export type ReferenceInput = { text: string; doi?: string | null; title?: string | null; year?: number | null; authors?: string[] | null };

export type ReferenceStatus = 'ok' | 'not_found' | 'retracted' | 'concern' | 'corrected' | 'mismatch' | 'preprint';

export type ReferenceCheck = {
  index: number;
  text: string;
  status: ReferenceStatus;
  /** Plain-language problems found, most serious first. */
  problems: string[];
  found: { title: string | null; authors: string[]; year: number | null; venue: string | null; doi: string | null; url: string | null; type: string | null } | null;
  notices: { type: string; doi: string; date: string | null }[];
  /** Filled by the optional AI pass. */
  support?: { verdict: 'consistent' | 'not_consistent' | 'unclear'; sentence: string; note: string }[];
  abstract?: string | null;
  /** Fuller metadata for formatting the reference (the reference list formatter); not saved by the citation check. */
  biblio?: { authors: string[]; more_authors: number; volume: string | null; issue: string | null; first_page: string | null; last_page: string | null } | null;
};

const DOI_PATTERN = /10\.\d{4,9}\/[^\s"<>,;]+[^\s"<>,;.)\]]/i;

/** Splits a pasted reference list into references (numbered, bulleted or one per paragraph). */
export function splitReferences(text: string): string[] {
  const body = text.replace(/\r\n/g, '\n').replace(/^\s*(references|bibliography|works cited|reference list)\s*:?\s*$/gim, '').trim();
  if (!body) return [];
  const starts = /^\s*(\[\d+\]|\d+[.)]|[-*•])\s+/;
  const lines = body.split('\n');
  const numbered = lines.filter((line) => starts.test(line)).length >= 2;
  let items: string[];
  if (numbered) {
    items = [];
    for (const line of lines) {
      if (starts.test(line) || !items.length) items.push(line.replace(starts, ''));
      else items[items.length - 1] += ` ${line}`;
    }
  } else if (/\n\s*\n/.test(body)) {
    items = body.split(/\n\s*\n/);
  } else {
    items = lines;
  }
  return items.map((item) => item.replace(/\s+/g, ' ').trim()).filter((item) => item.length >= 15).slice(0, 200);
}

/** DOI, title, year and first author's family name from a formatted reference. Pure, for tests. */
export function parseReference(text: string): { doi: string | null; title: string | null; year: number | null; firstAuthor: string | null } {
  const doi = doiKey(text.match(DOI_PATTERN)?.[0]?.replace(/[.]$/, '') ?? null);
  const yearMatch = text.match(/\((\d{4})[a-z]?\)|\b(19\d{2}|20\d{2})[a-z]?\b/);
  const year = yearMatch ? Number(yearMatch[1] || yearMatch[2]) : null;
  const firstAuthor = text.match(/^([A-Z][A-Za-z'’-]+(?:\s+(?:van|von|de|der|da|di|du|la|le)\s+[A-Z][A-Za-z'’-]+)?)/)?.[1] ?? null;
  let title: string | null = null;
  // APA/Harvard: Authors (2020). Title. Journal…
  const afterYear = text.match(/\(\d{4}[a-z]?\)\.?\s+(.+?)(?:\.\s|\?\s|$)/);
  // Vancouver/IEEE: Authors. Title. Journal. 2020; or "Title," in quotes.
  const quoted = text.match(/[“"]([^”"]{12,})[”"]/);
  if (quoted) title = quoted[1];
  else if (afterYear) title = afterYear[1];
  else {
    const parts = text.replace(DOI_PATTERN, '').split(/\.\s+/).map((part) => part.trim()).filter(Boolean);
    title = parts.length > 1 ? parts.slice(1).sort((a, b) => b.length - a.length)[0] : parts[0] ?? null;
  }
  title = title ? title.replace(/[.,;:\s]+$/, '').slice(0, 300) : null;
  return { doi, title: title && title.length >= 8 ? title : null, year, firstAuthor };
}

/** Share of the shorter title's words found in the other one. */
export function titleSimilarity(a: string, b: string): number {
  const words = (value: string) => new Set((value.toLowerCase().match(/[a-z0-9]{3,}/g) || []));
  const left = words(a);
  const right = words(b);
  if (!left.size || !right.size) return 0;
  const [small, large] = left.size <= right.size ? [left, right] : [right, left];
  let shared = 0;
  small.forEach((word) => { if (large.has(word)) shared += 1; });
  return shared / small.size;
}

async function openAlexByTitle(title: string): Promise<any | null> {
  const query = cleanQuery(title);
  if (!query) return null;
  for (const slot of papersSlots()) {
    try {
      const data = await slot.get('works', { search: query, per_page: '5' });
      const works: any[] = Array.isArray(data?.results) ? data.results : [];
      const best = works
        .map((work) => ({ work, score: titleSimilarity(title, String(work?.title || work?.display_name || '')) }))
        .sort((a, b) => b.score - a.score)[0];
      if (best && best.score >= 0.8) return best.work;
      if (works.length) return null;
    } catch {
      /* next index */
    }
  }
  return null;
}

async function openAlexByDoi(doi: string): Promise<any | null> {
  for (const slot of papersSlots()) {
    try {
      const data = await slot.get(`works/doi:${encodeURI(doi)}`, {});
      if (data?.id) return data;
    } catch { /* next */ }
  }
  return null;
}

/** Runs `work` over `items` with at most `limit` at a time. */
export async function mapLimit<T, R>(items: T[], limit: number, work: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      out[index] = await work(items[index], index);
    }
  }));
  return out;
}

const familyOf = (name: string) => (name.trim().split(/\s+/).pop() || '').toLowerCase().replace(/[^a-z'’-]/g, '');

export async function checkReference(input: ReferenceInput, index: number): Promise<ReferenceCheck> {
  const parsed = parseReference(input.text);
  const doi = doiKey(input.doi ?? null) ?? parsed.doi;
  const title = input.title || parsed.title;
  const year = input.year ?? parsed.year;
  const firstAuthor = input.authors?.[0] ? familyOf(input.authors[0]) : parsed.firstAuthor?.toLowerCase() ?? null;
  const check: ReferenceCheck = { index, text: input.text, status: 'ok', problems: [], found: null, notices: [], abstract: null };

  let work: any = null;
  let crossref = doi ? await crossrefWork(doi).catch(() => null) : null;
  if (doi) work = await openAlexByDoi(doi).catch(() => null);
  if (doi && !crossref && !work) {
    check.problems.push(`The DOI ${doi} does not resolve at Crossref or OpenAlex.`);
  }
  if (!crossref && !work && title) work = await openAlexByTitle(title).catch(() => null);
  if (!crossref && work?.doi) crossref = await crossrefWork(work.doi).catch(() => null);

  if (!crossref && !work) {
    check.status = 'not_found';
    if (!check.problems.length) check.problems.push(title ? 'No paper with this title was found in Crossref or OpenAlex.' : 'This reference has no DOI or readable title to look up.');
    return check;
  }
  const foundDoi = doiKey(crossref?.doi ?? work?.doi ?? null);
  const authors: string[] = crossref?.authors?.length ? crossref.authors : (work?.authorships ?? []).map((item: any) => String(item?.author?.display_name || '')).filter(Boolean);
  check.found = {
    title: crossref?.title ?? work?.title ?? work?.display_name ?? null,
    authors: authors.slice(0, 6),
    year: crossref?.year ?? work?.publication_year ?? null,
    venue: crossref?.container ?? work?.primary_location?.source?.display_name ?? null,
    doi: foundDoi,
    url: foundDoi ? `https://doi.org/${foundDoi}` : work?.id ?? null,
    type: crossref?.type ?? work?.type ?? null,
  };
  check.abstract = work?.abstract_inverted_index ? reconstructAbstract(work.abstract_inverted_index) : null;
  const text = (value: unknown) => (value === null || value === undefined || value === '' ? null : String(value).slice(0, 40));
  check.biblio = {
    authors: authors.slice(0, 30), more_authors: Math.max(0, authors.length - 30),
    volume: text(work?.biblio?.volume), issue: text(work?.biblio?.issue), first_page: text(work?.biblio?.first_page), last_page: text(work?.biblio?.last_page),
  };

  // Problems, most serious first.
  const notices = foundDoi ? await crossrefUpdates(foundDoi).catch(() => []) : [];
  check.notices = notices.map((notice) => ({ type: notice.type, doi: notice.doi, date: notice.date }));
  const types = notices.map((notice) => notice.type.toLowerCase());
  if (types.includes('retraction') || work?.is_retracted) {
    check.status = 'retracted';
    check.problems.push('This paper has been retracted. Do not cite it as evidence.');
  } else if (types.some((type) => type.includes('concern'))) {
    check.status = 'concern';
    check.problems.push('The publisher has issued an expression of concern about this paper.');
  } else if (types.some((type) => type.includes('correction') || type.includes('erratum'))) {
    check.status = 'corrected';
    check.problems.push('A correction was published for this paper; check that you cite the corrected version.');
  }
  if (check.status === 'ok' && (check.found.type === 'posted-content' || check.found.type === 'preprint')) {
    check.status = 'preprint';
    check.problems.push('This is a preprint and has not been peer reviewed.');
  }
  const mismatches: string[] = [];
  if (year && check.found.year && Math.abs(year - check.found.year) > 1) mismatches.push(`the year is ${check.found.year}, not ${year}`);
  if (firstAuthor && authors.length && !authors.some((name) => familyOf(name) === firstAuthor || name.toLowerCase().includes(firstAuthor))) mismatches.push(`the first author is ${authors[0]}`);
  if (title && check.found.title && titleSimilarity(title, check.found.title) < 0.6) mismatches.push(`the title is “${check.found.title}”`);
  if (mismatches.length) {
    check.problems.push(`The record found differs from your reference: ${mismatches.join('; ')}.`);
    if (check.status === 'ok') check.status = 'mismatch';
  }
  if (doi && foundDoi && doi !== foundDoi) check.problems.push(`The DOI should be ${foundDoi}.`);
  return check;
}

export function citationSummary(checks: ReferenceCheck[]) {
  const counts: Record<ReferenceStatus, number> = { ok: 0, not_found: 0, retracted: 0, concern: 0, corrected: 0, mismatch: 0, preprint: 0 };
  for (const check of checks) counts[check.status] += 1;
  return { total: checks.length, counts };
}

/** Sentences of the document that cite a reference (its first author and year, or its number). */
export function citingSentences(documentText: string, check: ReferenceCheck, max = 2): string[] {
  const sentences = documentText.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+(?=[A-Z(“"])/);
  const family = check.found?.authors?.[0] ? familyOf(check.found.authors[0]) : null;
  const year = check.found?.year ? String(check.found.year) : null;
  const number = new RegExp(`\\[(?:[^\\]]*[,\\s–-])?${check.index + 1}(?:[,\\s–-][^\\]]*)?\\]`);
  return sentences.filter((sentence) => {
    const lower = sentence.toLowerCase();
    if (family && year && lower.includes(family) && sentence.includes(year)) return true;
    return number.test(sentence);
  }).slice(0, max).map((sentence) => sentence.slice(0, 600));
}

/** The optional AI pass: does each citing sentence say what the cited abstract says? */
export async function checkSupport(llm: LlmSlot, documentText: string, checks: ReferenceCheck[], usage: LlmUsage) {
  const pairs: { check: ReferenceCheck; sentence: string }[] = [];
  for (const check of checks) {
    if (!check.abstract) continue;
    for (const sentence of citingSentences(documentText, check)) pairs.push({ check, sentence });
  }
  const batch = pairs.slice(0, 30);
  if (!batch.length) return 0;
  const { text, usage: used } = await llm.complete({
    task: 'fast', temperature: 0, json: true, maxTokens: 200 + batch.length * 80,
    messages: [
      { role: 'system', content: 'You check citations. For each pair, say whether the sentence makes a claim the abstract supports. Answer with JSON only: {"items": [{"i": 0, "verdict": "consistent|not_consistent|unclear", "note": "one short sentence"}]}. "unclear" when the abstract does not address the claim.' },
      { role: 'user', content: batch.map((pair, i) => `i=${i}\nSentence: ${pair.sentence}\nCited abstract: ${(pair.check.abstract || '').slice(0, 1200)}`).join('\n\n') },
    ],
  });
  usage.inputTokens += used.inputTokens;
  usage.outputTokens += used.outputTokens;
  for (const item of parseJson<{ items?: { i: number; verdict: string; note: string }[] }>(text)?.items ?? []) {
    const pair = batch[item.i];
    if (!pair) continue;
    const verdict = (['consistent', 'not_consistent', 'unclear'] as const).find((value) => value === item.verdict) ?? 'unclear';
    (pair.check.support ??= []).push({ verdict, sentence: pair.sentence, note: String(item.note || '').slice(0, 300) });
  }
  return batch.length;
}

