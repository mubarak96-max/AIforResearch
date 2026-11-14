/**
 * Helpers for the citation formatter (/tools/citation-formatter): split a pasted reference list
 * into entries, find a DOI in an entry, and judge whether a search result is the same work.
 * Pure functions, no DOM.
 */

export const MAX_REFERENCES = 50;

/**
 * One reference per entry. A list with blank lines between entries is split on the blank lines
 * (so a reference may wrap); otherwise each line is an entry. Leading "1.", "[1]" or "-" go.
 */
export function splitReferences(raw: string): string[] {
  const text = raw.replace(/\r\n?/g, '\n').trim();
  if (!text) return [];
  const blocks = /\n\s*\n/.test(text) ? text.split(/\n\s*\n+/) : text.split('\n');
  return blocks
    .map((block) => block.replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim())
    .map((line) => line.replace(/^(?:\[\d{1,3}\]|\(\d{1,3}\)|\d{1,3}[.)]|[-•*])\s+/, ''))
    .filter((line) => line.length >= 3);
}

/** The first DOI in a line, without a trailing full stop or bracket. */
export function findDoi(line: string): string | null {
  const match = /\b(10\.\d{4,9}\/[^\s"<>]+)/i.exec(line);
  if (!match) return null;
  return match[1].replace(/[.,;:)\]]+$/, '');
}

const STOP = new Set(['the', 'and', 'for', 'with', 'from', 'into', 'that', 'this', 'are', 'its', 'their', 'between', 'about', 'among', 'using', 'versus', 'via', 'des', 'les', 'und', 'der', 'die']);

/** Distinct content words (three letters or more), lower case, accents removed. */
export function words(text: string): string[] {
  const clean = text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return Array.from(new Set(clean.match(/[a-z0-9]{3,}/g) ?? [])).filter((word) => !STOP.has(word));
}

/** Share of the result title's words that appear in the pasted line (0 to 1). */
export function titleOverlap(line: string, title: string): number {
  const wanted = words(title);
  if (!wanted.length) return 0;
  const have = new Set(words(line));
  return wanted.filter((word) => have.has(word)).length / wanted.length;
}

export type MatchStatus = 'matched' | 'check' | 'not-found';

type Candidate = { title?: unknown; DOI?: unknown; issued?: unknown };

const yearOf = (item: Candidate): number | null => {
  const parts = (item.issued as { 'date-parts'?: unknown[][] } | undefined)?.['date-parts'];
  const year = Number(parts?.[0]?.[0]);
  return Number.isFinite(year) && year > 0 ? year : null;
};

/**
 * Picks the best result for a pasted line and says how sure the match is.
 * A DOI found in the line and returned by the lookup is a match. Otherwise most of the result's
 * title words must appear in the line, and a year in the line must agree.
 */
export function bestMatch<T extends Candidate>(line: string, results: T[], doi: string | null): { item: T | null; status: MatchStatus; score: number } {
  if (!results.length) return { item: null, status: 'not-found', score: 0 };
  if (doi) {
    const same = results.find((item) => String(item.DOI || '').toLowerCase() === doi.toLowerCase()) ?? (results.length === 1 ? results[0] : undefined);
    if (same) return { item: same, status: 'matched', score: 1 };
  }
  const years = (line.match(/\b(1[5-9]\d{2}|20\d{2})\b/g) ?? []).map(Number);
  const scored = results.map((item) => {
    let score = titleOverlap(line, String(item.title || ''));
    const year = yearOf(item);
    const yearAgrees = !years.length || (year !== null && years.some((y) => Math.abs(y - year) <= 1));
    if (!yearAgrees) score -= 0.3;
    // Very short titles ("Editorial") match too easily.
    if (words(String(item.title || '')).length < 3) score -= 0.15;
    return { item, score };
  }).sort((a, b) => b.score - a.score);
  const top = scored[0];
  if (top.score >= 0.8) return { item: top.item, status: 'matched', score: top.score };
  if (top.score >= 0.5) return { item: top.item, status: 'check', score: top.score };
  return { item: null, status: 'not-found', score: top.score };
}

/**
 * The likely title in a formatted reference: a quoted title (MLA, Chicago, IEEE, Harvard web),
 * or the sentence after "(2020)." (APA) or after a "2020." year (Harvard, Vancouver-like). Null if unsure.
 */
export function guessTitle(line: string): string | null {
  const quoted = /[“"]([^”"]{12,300})[”"]/.exec(line);
  if (quoted) return quoted[1].replace(/[.,]$/, '').trim();
  const afterYear = /\(\s*(?:1[5-9]\d{2}|20\d{2})[a-z]?(?:,[^)]*)?\)\.?\s+([^.?!]{12,300}[.?!])/.exec(line)
    ?? /\b(?:1[5-9]\d{2}|20\d{2})[a-z]?\.\s+([^.?!]{12,300}[.?!])/.exec(line);
  return afterYear ? afterYear[1].replace(/[.]$/, '').trim() : null;
}

/** The search sent for a line: its DOI, else its likely title, else the line without URLs (300 characters at most). */
export function lookupQuery(line: string): string {
  const doi = findDoi(line);
  if (doi) return doi;
  const title = guessTitle(line);
  return (title || line).replace(/https?:\/\/\S+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);
}
