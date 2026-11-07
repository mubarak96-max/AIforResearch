/**
 * Plain-text tools for the evidence check: sentences of a paragraph (with its citation
 * placeholders), and how closely a sentence repeats a source passage word for word. No AI:
 * these run on every sentence for free.
 */

export const CITATION_PLACEHOLDER = /\[\[CITATION_\d+\]\]/g;

/** Lower-case words (letters and digits), apostrophes and hyphens kept inside a word. */
export function words(text: string): string[] {
  return (text.toLowerCase().normalize('NFKC').match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).map((word) => word.replace(/’/g, "'"));
}

/** The longest run of consecutive words the two texts share, and that run's text. */
export function longestSharedRun(a: string[], b: string[]): { length: number; start: number } {
  if (!a.length || !b.length) return { length: 0, start: 0 };
  let best = 0;
  let bestEnd = 0;
  let previous = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    const current = new Array<number>(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        current[j] = previous[j - 1] + 1;
        if (current[j] > best) { best = current[j]; bestEnd = i; }
      }
    }
    previous = current;
  }
  return { length: best, start: bestEnd - best };
}

/** Share of the sentence's n-word sequences that also appear in the passage (0–1). */
export function ngramContainment(sentence: string[], passage: string[], n = 4): number {
  if (sentence.length < n || passage.length < n) return 0;
  const grams = new Set<string>();
  for (let i = 0; i + n <= passage.length; i++) grams.add(passage.slice(i, i + n).join(' '));
  let found = 0;
  let total = 0;
  for (let i = 0; i + n <= sentence.length; i++) {
    total++;
    if (grams.has(sentence.slice(i, i + n).join(' '))) found++;
  }
  return total ? found / total : 0;
}

export type Overlap = { run: number; runText: string; containment: number; tooClose: boolean };

/** Thresholds: 8 words in a row, or half the sentence's 4-word sequences, is copying, not paraphrase. */
export const RUN_LIMIT = 8;
export const CONTAINMENT_LIMIT = 0.5;

export function overlap(sentence: string, passage: string): Overlap {
  const a = words(sentence);
  const b = words(passage);
  const { length, start } = longestSharedRun(a, b);
  const containment = ngramContainment(a, b);
  const tooClose = length >= RUN_LIMIT || (a.length >= 10 && containment >= CONTAINMENT_LIMIT);
  return { run: length, runText: a.slice(start, start + length).join(' '), containment, tooClose };
}

/** A sentence inside quotation marks is a direct quote: copying it is fine when it is cited. */
export function isQuotation(sentence: string): boolean {
  const quoted = sentence.match(/["“][^"”]{12,}["”]/g);
  if (!quoted) return false;
  const inside = quoted.reduce((sum, part) => sum + words(part).length, 0);
  return inside >= Math.max(6, words(sentence).length * 0.4);
}

export type Sentence = {
  /** The sentence as written, placeholders included. */
  raw: string;
  /** Without citation placeholders, spaces tidied. */
  plain: string;
  /** Citation placeholders in it ([[CITATION_n]]). */
  citations: string[];
  /** The longest stretch with no placeholder: text that occurs exactly in the paragraph. */
  anchor: string;
};

/**
 * A paragraph's sentences. A citation written after the full stop ("… claim. (Smith, 2020)")
 * belongs to the sentence before it.
 */
export function splitSentences(text: string): Sentence[] {
  // Whitespace is left as written: each sentence's anchor must be found verbatim in the paragraph.
  const parts = text
    .trim()
    // Split after . ! ? when the next thing starts a sentence (or is a citation); not inside "e.g. x", "et al. 2020", "Fig. 2".
    .split(/(?<=[.!?]["”’)]?)\s+(?=[A-Z0-9"“(\[])/u)
    .filter(Boolean);
  const merged: string[] = [];
  for (let part of parts) {
    // "… half. [[CITATION_1]] Then …": the leading citation closes the previous sentence.
    const leading = /^(?:\s*\[\[CITATION_\d+\]\][.,;]?)+/.exec(part)?.[0];
    if (leading && merged.length && part.slice(leading.length).trim()) {
      merged[merged.length - 1] = `${merged[merged.length - 1]} ${leading.trim()}`;
      part = part.slice(leading.length).trim();
    }
    const withoutCitations = part.replace(CITATION_PLACEHOLDER, '').trim();
    const previous = merged[merged.length - 1];
    const abbreviation = previous && /\b(?:e\.g|i\.e|et al|cf|Fig|Figs|Eq|No|vs|approx|Dr|Prof|ca)\.$/i.test(previous);
    if (previous && (!words(withoutCitations).length || /^[.!?]?$/.test(withoutCitations) || abbreviation)) {
      merged[merged.length - 1] = `${previous} ${part}`;
    } else {
      merged.push(part);
    }
  }
  return merged.map((raw) => {
    const citations = raw.match(CITATION_PLACEHOLDER) || [];
    const plain = raw.replace(CITATION_PLACEHOLDER, ' ').replace(/\s+([.,;:!?)])/g, '$1').replace(/\(\s*\)/g, '').replace(/\s+/g, ' ').trim();
    const anchor = raw
      .split(CITATION_PLACEHOLDER)
      .map((segment) => segment.trim())
      .sort((x, y) => y.length - x.length)[0] || '';
    return { raw, plain, citations: [...new Set(citations)], anchor };
  });
}
