/**
 * Citation coverage: match the in-text citations of a paper to its reference list. Finds
 * author-date citations (APA, Harvard, Chicago author-date) and numeric ones ([1], [2–4]) and
 * reports works cited but not listed, listed but never cited, and year mismatches. It checks
 * that citations and the list agree, not whether a source supports a claim. Pure functions.
 */
import { letters, parseReference, splitReferences, type ParsedReference } from './referenceList';

export type CitationStatus = 'matched' | 'missing' | 'year-mismatch';

export type CitedWork = {
  /** Surnames as written ("Smith", "Lee") or a group name ("World Health Organization"). */
  authors: string[];
  etAl: boolean;
  /** "2020", "2020a", "n.d." or "in press". */
  year: string;
};

export type Citation = {
  kind: 'author-date' | 'numeric';
  /** Character range of the whole citation in the text, for highlighting. */
  start: number;
  end: number;
  raw: string;
  /** Author-date: each work in the citation. Numeric: empty. */
  works: CitedWork[];
  /** Numeric: the reference numbers cited. */
  numbers: number[];
  /** One status per work (author-date) or per number (numeric). */
  status: CitationStatus[];
  /** Index into the reference list for each work or number, or -1. */
  refs: number[];
};

export type CoverageReport = {
  citations: Citation[];
  references: ParsedReference[];
  /** Unique works cited but not found in the list ("Smith, 2020"). */
  missing: { label: string; count: number }[];
  /** Cited with a year the list does not have for that author. */
  yearMismatches: { label: string; listed: string[]; count: number }[];
  /** List entries no citation points to. */
  uncited: number[];
  counts: { citations: number; authorDate: number; numeric: number; references: number; citedReferences: number };
};

// ------------------------------------------------------------------ splitting the paper

const LIST_HEADING = /^[ \t]*(?:#+\s*)?(?:\d+\.?\s+)?(references|reference list|works cited|bibliography|literature cited|sources cited)[ \t]*:?[ \t]*$/gim;

/** Split one pasted document at its last "References", "Works Cited" or "Bibliography" heading. */
export function splitPaper(full: string): { text: string; references: string; heading: string | null } {
  let last: RegExpExecArray | null = null;
  let match: RegExpExecArray | null;
  LIST_HEADING.lastIndex = 0;
  while ((match = LIST_HEADING.exec(full))) last = match;
  if (!last) return { text: full, references: '', heading: null };
  return { text: full.slice(0, last.index), references: full.slice(last.index + last[0].length), heading: last[1] };
}

// ------------------------------------------------------------------ finding citations

const YEAR = String.raw`(?:(?:1[5-9]\d{2}|20\d{2})[a-z]?|n\.\s?d\.(?:-[a-z])?|in press|forthcoming)`;
const PARTICLE = String.raw`(?:(?:[Vv]an|[Vv]on|[Dd]e|[Dd]er|[Dd]en|[Dd]u|[Dd]a|[Dd]i|[Dd]el|[Ll]a|[Ll]e|ten|ter|al|el)\s+)*`;
/** A surname: "Smith", "O’Brien", "Lopez-Diaz", "De Vries" (a possessive "’s" is not part of it). */
const SURNAME = String.raw`${PARTICLE}[\p{Lu}][\p{L}-]+(?:['’](?!s\b)[\p{L}-]+)?`;
/** "Smith (2020)", "Smith and Lee (2019)", "Smith & Lee (2019)", "Wu et al. (2021, p. 4)", "Smith 2020" is not narrative. */
const NARRATIVE = new RegExp(String.raw`(${SURNAME}(?:(?:,\s*${SURNAME})*,?\s+(?:and|&)\s+${SURNAME}|\s+et\s+al\.?)?)(?:’s|'s)?\s+\((${YEAR}(?:,\s*${YEAR})*)((?:,|;)\s*[^()]*)?\)`, 'gu');
const PAREN = /\(([^()]{4,400})\)/g;
const PART = new RegExp(String.raw`^(?:(?:see also|see|e\.g\.,?|cf\.|i\.e\.,?|as cited in|also|for example,?|for a review,? see)\s+)*(.+?),?\s+(${YEAR}(?:\s*,\s*${YEAR})*)(?=$|[,\s.:])(.*)$`, 'iu');
const NUMERIC = /\[(\s*\d{1,4}(?:\s*[-–—]\s*\d{1,4})?(?:\s*[,;]\s*\d{1,4}(?:\s*[-–—]\s*\d{1,4})?)*\s*)\]/g;

function splitYears(value: string): string[] {
  return value.split(/\s*,\s*/).map((year) => year.trim().toLowerCase().replace(/^n\.\s?d\./, 'n.d.')).filter(Boolean);
}

/** "Smith, Lee, and Wu" / "Smith & Lee" / "Wu et al." / "World Health Organization [WHO]" -> names. */
const NOT_NAMES = new Set(['the', 'this', 'these', 'that', 'in', 'on', 'at', 'since', 'from', 'until', 'by', 'table', 'figure', 'fig', 'results', 'study', 'version', 'year', 'and', 'or', 'but', 'see', 'appendix', 'section', 'chapter', 'note', 'model', 'phase', 'wave', 'cohort', 'between', 'during', 'after', 'before']);

function readCitedAuthors(value: string): { authors: string[]; etAl: boolean } | null {
  // APA's no-author form cites a short title in quotation marks: ("Title of Work," 2020).
  const quoted = /^[“"‘']\s*(.+?)[,.]?\s*[”"’']$/.exec(value.trim());
  if (quoted) return { authors: [quoted[1].replace(/[,.]$/, '')], etAl: false };
  let text = value.trim().replace(/\s*\[[^\]]+\]\s*/g, ' ').trim();
  if (!text || text.length > 90 || /\d/.test(text)) return null;
  if (!/^[\p{Lu}]|^(?:van|von|de|der|den|du|da|di|del|la|le|ten|ter|al|el)\s/u.test(text)) return null;
  const etAl = /\bet\s+al\.?$/i.test(text);
  text = text.replace(/,?\s*et\s+al\.?$/i, '').trim();
  const authors = text.split(/\s*,\s*(?:and\s+|&\s*)?|\s+and\s+|\s*&\s*/).map((name) => name.trim()).filter(Boolean);
  if (authors.length === 0 || authors.length > 8) return null;
  // Every name starts with a capital (or a particle); sentences in brackets do not pass.
  if (NOT_NAMES.has(authors[0].toLowerCase())) return null;
  if (authors.some((name) => name.split(/\s+/).length > 6 || !/^[\p{Lu}]|^(?:van|von|de|der|den|du|da|di|del|la|le|ten|ter|al|el)\s/u.test(name))) return null;
  return { authors, etAl };
}

/** Expand "2–4, 7" into [2, 3, 4, 7]. */
export function expandNumbers(value: string): number[] {
  const numbers: number[] = [];
  for (const part of value.split(/[,;]/)) {
    const range = /^\s*(\d+)\s*(?:[-–—]\s*(\d+))?\s*$/.exec(part);
    if (!range) continue;
    const from = Number(range[1]);
    const to = range[2] ? Number(range[2]) : from;
    if (to < from || to - from > 200) { numbers.push(from); continue; }
    for (let n = from; n <= to; n++) numbers.push(n);
  }
  return numbers;
}

/** Find the citations in a text. Superscript numbers are skipped. */
export function findCitations(text: string): Citation[] {
  const found: Citation[] = [];
  const taken: [number, number][] = [];
  const overlaps = (start: number, end: number) => taken.some(([a, b]) => start < b && end > a);
  const base = { numbers: [] as number[], status: [] as CitationStatus[], refs: [] as number[] };

  NARRATIVE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = NARRATIVE.exec(text))) {
    const who = readCitedAuthors(match[1]);
    if (!who) continue;
    const start = match.index;
    const end = start + match[0].length;
    found.push({ ...base, kind: 'author-date', start, end, raw: match[0], works: splitYears(match[2]).map((year) => ({ ...who, year })) });
    taken.push([start, end]);
  }

  PAREN.lastIndex = 0;
  while ((match = PAREN.exec(text))) {
    const start = match.index;
    const end = start + match[0].length;
    if (overlaps(start, end)) continue;
    const works: CitedWork[] = [];
    for (const part of match[1].split(/\s*;\s*/)) {
      const piece = PART.exec(part.trim());
      if (!piece) continue;
      const who = readCitedAuthors(piece[1]);
      if (!who) continue;
      for (const year of splitYears(piece[2])) works.push({ ...who, year });
    }
    if (works.length === 0) continue;
    found.push({ ...base, kind: 'author-date', start, end, raw: match[0], works });
    taken.push([start, end]);
  }

  NUMERIC.lastIndex = 0;
  while ((match = NUMERIC.exec(text))) {
    const start = match.index;
    const end = start + match[0].length;
    if (overlaps(start, end)) continue;
    const numbers = expandNumbers(match[1]);
    if (numbers.length === 0) continue;
    found.push({ ...base, kind: 'numeric', start, end, raw: match[0], works: [], numbers });
  }

  return found.sort((a, b) => a.start - b.start);
}

// ------------------------------------------------------------------ matching

/** The names an entry can be cited by: the first author's surname, or a group name and its abbreviation. */
function entryNames(entry: ParsedReference): string[] {
  if (entry.authors.length) return [letters(entry.authors[0].family)];
  const names = [letters(entry.lead)];
  const short = /\[([^\]]+)\]|\(([A-Z]{2,})\)/.exec(entry.lead);
  if (short) names.push(letters(short[1] ?? short[2]));
  return names.filter(Boolean);
}

function entryYear(entry: ParsedReference): string {
  if (entry.yearKind === 'nd') return `n.d.${entry.suffix ? `-${entry.suffix}` : ''}`;
  if (entry.yearKind === 'in-press') return 'in press';
  return entry.year ? `${entry.year}${entry.suffix}` : '';
}

function sameYear(cited: string, listed: string): boolean {
  if (cited === listed) return true;
  // "forthcoming" and "in press" mean the same thing.
  if (/^(in press|forthcoming)$/.test(cited) && /^(in press|forthcoming)$/.test(listed)) return true;
  return false;
}

export const workLabel = (work: CitedWork) => `${work.authors[0]}${work.etAl ? ' et al.' : work.authors.length === 2 ? ` & ${work.authors[1]}` : work.authors.length > 2 ? ' et al.' : ''}, ${work.year}`;

/** Match citations to a parsed list and build the report. */
export function checkCoverage(text: string, referenceText: string): CoverageReport {
  const references = splitReferences(referenceText).map((entry) => parseReference(entry, 'apa'));
  const citations = findCitations(text);
  const cited = new Set<number>();
  const missing = new Map<string, number>();
  const mismatches = new Map<string, { listed: string[]; count: number }>();

  const numbered = references.some((entry) => entry.number !== null);
  const byNumber = new Map<number, number>();
  references.forEach((entry, index) => byNumber.set(numbered ? entry.number ?? -1 : index + 1, index));

  for (const citation of citations) {
    if (citation.kind === 'numeric') {
      citation.refs = citation.numbers.map((n) => byNumber.get(n) ?? -1);
      citation.status = citation.refs.map((ref) => (ref >= 0 ? 'matched' : 'missing'));
      citation.refs.forEach((ref, i) => {
        if (ref >= 0) cited.add(ref);
        else missing.set(`[${citation.numbers[i]}]`, (missing.get(`[${citation.numbers[i]}]`) ?? 0) + 1);
      });
      continue;
    }
    citation.refs = [];
    citation.status = [];
    for (const work of citation.works) {
      const name = letters(work.authors[0]);
      let candidates = references.map((entry, index) => ({ entry, index }))
        .filter(({ entry }) => entryNames(entry).some((known) => known === name || (name.length >= 6 && !entry.authors.length && known.startsWith(name))));
      // Two named authors: prefer entries whose second author matches too.
      if (work.authors.length >= 2 && !work.etAl) {
        const second = letters(work.authors[1]);
        const narrowed = candidates.filter(({ entry }) => entry.authors[1] && letters(entry.authors[1].family) === second);
        if (narrowed.length) candidates = narrowed;
      }
      const label = workLabel(work);
      // "2020" cited with only "2020a" and "2020b" listed is a mismatch: the letter is missing.
      const hit = candidates.find(({ entry }) => sameYear(work.year, entryYear(entry)));
      if (hit) {
        citation.refs.push(hit.index);
        citation.status.push('matched');
        cited.add(hit.index);
      } else if (candidates.length) {
        citation.refs.push(candidates[0].index);
        citation.status.push('year-mismatch');
        const previous = mismatches.get(label);
        mismatches.set(label, { listed: [...new Set(candidates.map(({ entry }) => entryYear(entry) || 'no year'))], count: (previous?.count ?? 0) + 1 });
        // The author is listed, so the entry counts as cited for "listed but never cited".
        candidates.forEach(({ index }) => cited.add(index));
      } else {
        citation.refs.push(-1);
        citation.status.push('missing');
        missing.set(label, (missing.get(label) ?? 0) + 1);
      }
    }
  }

  const authorDate = citations.filter((citation) => citation.kind === 'author-date').length;
  return {
    citations,
    references,
    missing: [...missing].map(([label, count]) => ({ label, count })),
    yearMismatches: [...mismatches].map(([label, value]) => ({ label, ...value })),
    uncited: references.map((_, index) => index).filter((index) => !cited.has(index)),
    counts: {
      citations: citations.length,
      authorDate,
      numeric: citations.length - authorDate,
      references: references.length,
      citedReferences: cited.size,
    },
  };
}
