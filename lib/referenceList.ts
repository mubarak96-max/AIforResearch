/**
 * Reference list helpers for the free browser tools (reference-list-sorter and
 * citation-coverage-checker): split a pasted list into entries, read the first authors, year and
 * title of each, sort by APA 7 or MLA 9 rules and find duplicates. Pure functions, no I/O.
 */

export type SortStyle = 'apa' | 'mla';

export type Person = { family: string; given: string };

export type ParsedReference = {
  /** The entry as pasted, with wrapped lines joined and list numbering removed. */
  text: string;
  /** The list number the entry carried ("[3]" or "3."), if any. */
  number: number | null;
  /** People named as authors, in order. Empty for group authors and title-first entries. */
  authors: Person[];
  /** A group author ("World Health Organization") or, for title-first entries, the title. */
  lead: string;
  /** True when the entry starts with the title (no author). */
  titleFirst: boolean;
  /** Four-digit year, or null for "n.d." and "in press" and when none is found. */
  year: number | null;
  /** "n.d." entries, "in press" entries and dated ones sort differently. */
  yearKind: 'dated' | 'nd' | 'in-press' | 'none';
  /** The a/b/c letter after the year ("2020a"). */
  suffix: string;
  title: string;
  doi: string | null;
};

// ------------------------------------------------------------------ splitting

const NUMBERING = /^\s*(?:\[(\d{1,4})\]|(\d{1,4})\.(?=\s)|(\d{1,4})\)(?=\s))\s*/;
const ENDS_ENTRY = /(?:[.)\]]|https?:\/\/\S+|\b10\.\d{4,9}\/\S+)\s*$/i;
const HEADING = /^\s*(references?|reference list|works cited|bibliography|literature cited|sources)\s*:?\s*$/i;

/**
 * Split a pasted list into entries. Blank lines separate entries when the list uses them;
 * otherwise each line is an entry, and a line that clearly continues the one before (it starts
 * in lower case, with a DOI or URL, or the previous line stopped mid-sentence) is joined to it.
 */
export function splitReferences(raw: string): string[] {
  const lines = raw.replace(/\r\n?/g, '\n').split('\n').map((line) => line.replace(/\s+$/, ''));
  const filled = lines.filter((line) => line.trim() && !HEADING.test(line));
  if (filled.length === 0) return [];

  const blocks = raw.replace(/\r\n?/g, '\n').split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
  // Blank-line mode: when blocks hold more than one line, blank lines are the separators.
  const multiLineBlocks = blocks.some((block) => block.includes('\n'));
  if (blocks.length > 1 && multiLineBlocks) {
    return blocks
      .map((block) => block.split('\n').filter((line) => !HEADING.test(line)).map((line) => line.trim()).join(' '))
      .map(joinHyphens)
      .filter(Boolean);
  }

  const entries: string[] = [];
  for (const line of filled) {
    const trimmed = line.trim();
    const previous = entries[entries.length - 1];
    if (previous !== undefined && continues(previous, trimmed)) {
      entries[entries.length - 1] = previous.endsWith('-') && /^[a-z]/.test(trimmed) && !/https?:\/\/\S*-$/.test(previous)
        ? previous.slice(0, -1) + trimmed
        : `${previous} ${trimmed}`;
    } else {
      entries.push(trimmed);
    }
  }
  return entries;
}

function joinHyphens(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function continues(previous: string, line: string): boolean {
  if (NUMBERING.test(line)) return false;
  if (/^(https?:\/\/|doi:|www\.|10\.\d{4,9}\/)/i.test(line)) return true;
  if (/^[a-z(&,;:–-]/.test(line)) return true;
  if (/^\d/.test(line)) return true;
  if (/[-–,&:;]$/.test(previous) || /\band$/i.test(previous)) return true;
  return !ENDS_ENTRY.test(previous);
}

// ------------------------------------------------------------------ parsing

const YEAR_PAREN = /\s*\((?:(\d{4})([a-z])?(?:[,/–-][^)]*)?|n\.\s?d\.(?:-([a-z]))?|(in press)(?:-([a-z]))?)\)\.?/i;
const PERSON_APA = /((?:(?:van|von|de|der|den|du|da|di|del|della|la|le|ten|ter|al|el|bin|ibn)\s+)*[\p{Lu}][\p{L}'’\- ]*?),\s*((?:[\p{Lu}]\.(?:\s?-?\s?[\p{Lu}]\.)*\s?)+)/gu;
const ARTICLE = /^(a|an|the)\s+/i;

export function normaliseDoi(value: string): string {
  return value.trim().toLowerCase().replace(/^(?:https?:\/\/(?:dx\.)?doi\.org\/|doi:\s*)/, '').replace(/[.,;)\]]+$/, '');
}

export function findDoi(text: string): string | null {
  const match = /\b(10\.\d{4,9}\/[^\s"<>]+)/i.exec(text);
  return match ? normaliseDoi(match[1]) : null;
}

/** Letters and digits only, lower case, accents removed: the letter-by-letter sort form. */
export function letters(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/ß/g, 'ss').replace(/[^\p{L}\p{N}]/gu, '');
}

/** Lower case words with punctuation removed, for comparing titles. */
export function normaliseTitle(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/<[^>]+>/g, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

/** Read one entry. `style` decides where to look for the year and title. */
export function parseReference(raw: string, style: SortStyle = 'apa'): ParsedReference {
  const numbering = NUMBERING.exec(raw);
  const text = (numbering ? raw.slice(numbering[0].length) : raw).replace(/\s+/g, ' ').trim();
  const number = numbering ? Number(numbering[1] ?? numbering[2] ?? numbering[3]) : null;
  const doi = findDoi(text);
  return { ...(style === 'mla' ? parseMla(text) : parseAuthorDate(text)), text, number, doi };
}

type Core = Omit<ParsedReference, 'text' | 'number' | 'doi'>;

function yearOf(match: RegExpExecArray | null): Pick<Core, 'year' | 'yearKind' | 'suffix'> {
  if (!match) return { year: null, yearKind: 'none', suffix: '' };
  if (match[1]) return { year: Number(match[1]), yearKind: 'dated', suffix: (match[2] ?? '').toLowerCase() };
  if (match[4]) return { year: null, yearKind: 'in-press', suffix: (match[5] ?? '').toLowerCase() };
  return { year: null, yearKind: 'nd', suffix: (match[3] ?? '').toLowerCase() };
}

/** APA, Harvard and Chicago author-date: authors, then the year, then the title. */
function parseAuthorDate(text: string): Core {
  let authorPart = '';
  let rest = text;
  let dates: Pick<Core, 'year' | 'yearKind' | 'suffix'> = { year: null, yearKind: 'none', suffix: '' };
  const paren = YEAR_PAREN.exec(text);
  // Chicago author-date ("Smith, John. 2020. Title.") and Harvard without brackets.
  const bare = /(^|[.,]\s)(?:(\d{4})([a-z])?|(n\.\s?d\.)|(forthcoming|in press))[.,]\s/i.exec(text);
  if (paren && paren.index > 0) {
    authorPart = text.slice(0, paren.index);
    rest = text.slice(paren.index + paren[0].length);
    dates = yearOf(paren);
  } else if (bare) {
    authorPart = text.slice(0, bare.index + (bare[1] ? 1 : 0));
    rest = text.slice(bare.index + bare[0].length);
    dates = bare[2] ? { year: Number(bare[2]), yearKind: 'dated', suffix: (bare[3] ?? '').toLowerCase() }
      : { year: null, yearKind: bare[4] ? 'nd' : 'in-press', suffix: '' };
  } else {
    const any = /(1[5-9]\d{2}|20\d{2})([a-z])?/.exec(text);
    if (any) dates = { year: Number(any[1]), yearKind: 'dated', suffix: (any[2] ?? '').toLowerCase() };
  }
  const authors = readPeople(authorPart.trim().replace(/,$/, ''));
  authorPart = authorPart.replace(/[.,\s]+$/, '').trim();
  rest = rest.trim();

  // A title before the date (APA's no-author form: "Title of work. (2020).") or a group author.
  const titleFirst = !authorPart || (authors.length === 0 && looksLikeTitle(authorPart, rest));
  const lead = authors.length ? '' : authorPart || firstSentence(rest);
  const title = titleFirst ? lead : firstSentence(rest);
  return { authors, lead, titleFirst, title, ...dates };
}

function looksLikeTitle(authorPart: string, rest: string): boolean {
  // "Title. (2020). Publisher." vs "World Health Organization. (2020). Title." Group names are
  // short and capitalised; if what follows the date reads like a title, the lead is the author.
  const words = authorPart.split(/\s+/);
  const capitalised = words.filter((word) => /^[\p{Lu}]/u.test(word)).length / words.length;
  if (/[?:]/.test(authorPart)) return true;
  if (words.length >= 4 && capitalised < 0.6) return true;
  const after = firstSentence(rest);
  return !after || /^(retrieved|in |https?:)/i.test(after);
}

function firstSentence(value: string): string {
  const match = /^(.+?[.?!])(?:\s|$)/.exec(value.replace(/^[\s.]+/, ''));
  return (match ? match[1] : value).replace(/[.]$/, '').trim();
}

/** "Smith, J. A., Lee, K., & Wu, X." or "Smith, John, and Kim Lee" -> people. */
export function readPeople(authorPart: string): Person[] {
  if (!authorPart) return [];
  const people: Person[] = [];
  const cleaned = authorPart.replace(/\s*\(Eds?\.\)|\s*\[[^\]]*\]/g, '').replace(/\s*(?:…|\.\.\.)\s*/g, ', ');
  PERSON_APA.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = PERSON_APA.exec(cleaned))) {
    const family = match[1].replace(/^\s*(?:&|and)\s+/, '').trim();
    if (family) people.push({ family, given: match[2].trim() });
  }
  if (people.length) return people;

  // Chicago and MLA: "Smith, John, and Kim Lee" / "Smith, John Q., et al."
  const first = /^([^,]+),\s*([^,]+?)(?:,|$)/.exec(cleaned);
  if (!first || first[1].trim().split(/\s+/).length > 4) return [];
  if (!/^[\p{Lu}]/u.test(first[2].trim())) return [];
  people.push({ family: first[1].trim(), given: first[2].trim().replace(/\.$/, '') });
  const others = cleaned.slice(first[0].length).split(/,\s*(?:and\s+)?|\s+and\s+|\s*&\s*/).map((name) => name.trim().replace(/\.$/, '')).filter(Boolean);
  for (const name of others) {
    if (/^et al/i.test(name)) break;
    const parts = name.split(/\s+/);
    if (parts.length < 2 || !/^[\p{Lu}]/u.test(parts[parts.length - 1])) continue;
    people.push({ family: parts[parts.length - 1], given: parts.slice(0, -1).join(' ') });
  }
  return people;
}

/** MLA 9: "Author. Title. Container, ..., Year." The author element ends at the first full stop that is not an initial. */
function parseMla(text: string): Core {
  let end = -1;
  const stop = /\.(\s|$)/g;
  let match: RegExpExecArray | null;
  while ((match = stop.exec(text))) {
    const before = text.slice(0, match.index);
    if (/(?:^|[\s.])[\p{Lu}]$/u.test(before) || /\bet al$/i.test(before) || /\b(?:Jr|Sr|eds?|trans|St|Dr)$/i.test(before)) continue;
    end = match.index;
    break;
  }
  const head = end >= 0 ? text.slice(0, end).trim() : text;
  const rest = end >= 0 ? text.slice(end + 1).trim() : '';
  const quoted = /^[“"]/.test(head);
  const authors = quoted ? [] : readPeople(head);
  const years = [...text.matchAll(/\b(1[5-9]\d{2}|20\d{2})\b/g)];
  // The publication year is the last one in an MLA entry, before any access date.
  const access = text.search(/\bAccessed\b/i);
  const candidates = years.filter((year) => access < 0 || (year.index ?? 0) < access);
  const pick = candidates[candidates.length - 1] ?? years[years.length - 1];
  const dates = pick ? { year: Number(pick[1]), yearKind: 'dated' as const, suffix: '' } : { year: null, yearKind: 'none' as const, suffix: '' };
  const titleFirst = quoted || (authors.length === 0 && /[“"]|[?:]/.test(head));
  const title = titleFirst ? head.replace(/^[“"]|[”"]$/g, '').replace(/[.,]$/, '') : (/^[“"]([^”"]+)[”"]/.exec(rest)?.[1] ?? firstSentence(rest)).replace(/[.,]$/, '');
  return { authors, lead: authors.length ? '' : head.replace(/^[“"]|[”"]$/g, ''), titleFirst, title, ...dates };
}

// ------------------------------------------------------------------ sorting

const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

function compareText(a: string, b: string): number {
  // Letter by letter: spaces and punctuation are ignored, and a shorter string that is the start
  // of the longer one comes first ("nothing precedes something": Brown before Browning).
  const x = letters(a);
  const y = letters(b);
  if (x === y) return 0;
  if (y.startsWith(x)) return -1;
  if (x.startsWith(y)) return 1;
  return collator.compare(x, y);
}

/** What an entry sorts under: the first author's surname, a group name or a title without A/An/The. */
export function leadKey(entry: ParsedReference): string {
  if (entry.authors.length) return entry.authors[0].family;
  return entry.lead.replace(/^[“"‘']/, '').replace(ARTICLE, '');
}

function initialsOf(person: Person): string {
  return letters(person.given);
}

function compareAuthors(a: ParsedReference, b: ParsedReference): number {
  const lead = compareText(leadKey(a), leadKey(b));
  if (lead) return lead;
  // Same surname: initials, then the rest of the author list person by person. A one-author
  // entry comes before a multi-author entry with the same first author.
  const length = Math.max(a.authors.length, b.authors.length);
  for (let i = 0; i < length; i++) {
    const x = a.authors[i];
    const y = b.authors[i];
    if (!x && !y) break;
    if (!x) return -1;
    if (!y) return 1;
    if (i > 0) {
      const family = compareText(x.family, y.family);
      if (family) return family;
    }
    const given = compareText(initialsOf(x), initialsOf(y));
    if (given) return given;
  }
  return 0;
}

const YEAR_RANK: Record<ParsedReference['yearKind'], number> = { nd: 0, dated: 1, none: 1, 'in-press': 2 };

export function compareReferences(a: ParsedReference, b: ParsedReference, style: SortStyle = 'apa'): number {
  const authors = compareAuthors(a, b);
  if (authors) return authors;
  const title = compareText(a.title.replace(ARTICLE, ''), b.title.replace(ARTICLE, ''));
  if (style === 'mla') return title || collator.compare(a.text, b.text);
  // APA: same authors -> n.d. first, then by year, in press last; same year by the a/b letter, then title.
  const rank = YEAR_RANK[a.yearKind] - YEAR_RANK[b.yearKind];
  if (rank) return rank;
  const year = (a.year ?? 0) - (b.year ?? 0);
  if (year) return year;
  if (a.suffix !== b.suffix) return a.suffix && b.suffix ? a.suffix.localeCompare(b.suffix) : a.suffix ? 1 : -1;
  return title || collator.compare(a.text, b.text);
}

export function sortReferences(entries: ParsedReference[], style: SortStyle = 'apa'): ParsedReference[] {
  return entries.map((entry, index) => ({ entry, index }))
    .sort((x, y) => compareReferences(x.entry, y.entry, style) || x.index - y.index)
    .map(({ entry }) => entry);
}

// ------------------------------------------------------------------ duplicates

export type DuplicateKind = 'duplicate' | 'likely';

export type DuplicatePair = {
  /** Indexes into the list that was checked. `keep` is the earlier entry. */
  keep: number;
  drop: number;
  kind: DuplicateKind;
  reason: string;
};

function bigrams(value: string): Map<string, number> {
  const s = value.replace(/\s+/g, ' ');
  const grams = new Map<string, number>();
  for (let i = 0; i < s.length - 1; i++) {
    const gram = s.slice(i, i + 2);
    grams.set(gram, (grams.get(gram) ?? 0) + 1);
  }
  return grams;
}

/** Dice similarity of two strings' character pairs, 0 to 1. */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const x = bigrams(a);
  const y = bigrams(b);
  let shared = 0;
  for (const [gram, count] of x) shared += Math.min(count, y.get(gram) ?? 0);
  return (2 * shared) / (a.length - 1 + (b.length - 1));
}

/**
 * Pairs of entries that are the same work. "duplicate": same DOI, the same text, or the same
 * title (near-identical after normalising) and year. "likely": very similar titles with a
 * different or missing year, or similar titles with the same first author and year.
 */
export function findDuplicates(entries: ParsedReference[]): DuplicatePair[] {
  const pairs: DuplicatePair[] = [];
  const dropped = new Set<number>();
  const titles = entries.map((entry) => normaliseTitle(entry.title || entry.text));
  const texts = entries.map((entry) => normaliseTitle(entry.text));
  for (let j = 0; j < entries.length; j++) {
    for (let i = 0; i < j; i++) {
      if (dropped.has(i)) continue;
      const a = entries[i];
      const b = entries[j];
      const sameYear = a.yearKind === b.yearKind && a.year === b.year && a.suffix === b.suffix;
      let found: Omit<DuplicatePair, 'keep' | 'drop'> | null = null;
      if (a.doi && b.doi) {
        if (a.doi === b.doi) found = { kind: 'duplicate', reason: `Same DOI (${a.doi})` };
        else continue; // different DOIs: different works, however alike the titles
      } else if (texts[i] === texts[j]) {
        found = { kind: 'duplicate', reason: 'Same entry' };
      } else if (titles[i].length >= 12) {
        const score = similarity(titles[i], titles[j]);
        const sameLead = letters(leadKey(a)) === letters(leadKey(b));
        if (score >= 0.92 && sameYear) found = { kind: 'duplicate', reason: 'Same title and year' };
        else if (score >= 0.92) found = { kind: 'likely', reason: 'Same title, different year' };
        else if (score >= 0.8 && sameYear && sameLead) found = { kind: 'likely', reason: 'Very similar title, same first author and year' };
      }
      if (found) {
        pairs.push({ keep: i, drop: j, ...found });
        dropped.add(j);
        break;
      }
    }
  }
  return pairs;
}

/** The whole sorter in one call: split, parse, sort and find duplicates in the sorted list. */
export function sortReferenceList(raw: string, style: SortStyle = 'apa'): { entries: ParsedReference[]; duplicates: DuplicatePair[] } {
  const entries = sortReferences(splitReferences(raw).map((entry) => parseReference(entry, style)), style);
  return { entries, duplicates: findDuplicates(entries) };
}
