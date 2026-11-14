/**
 * Boolean search strings from concept rows: OR within a concept, AND between concepts, an optional
 * NOT row. Output for PubMed, Europe PMC and a generic form most databases accept, a syntax check
 * for any string, and the hand-off format the PICO question builder uses to send concepts here.
 * Pure functions, used by components/tools/utilities/BooleanSearchStringBuilder.
 */

export type Concept = {
  name: string;
  /** Free-text terms: words or phrases, with * for truncation where you want it. */
  terms: string[];
  /** Controlled vocabulary (MeSH) headings, used by PubMed and Europe PMC only. */
  mesh: string[];
  /** Terms to exclude. Use with care. */
  not?: boolean;
};

export type Database = 'pubmed' | 'europepmc' | 'generic';
export type FieldScope = 'tiab' | 'title' | 'all';
export type SearchOptions = { truncation: boolean; phrases: boolean; field: FieldScope };

export const DEFAULT_OPTIONS: SearchOptions = { truncation: true, phrases: true, field: 'tiab' };

export const DATABASES: { id: Database; name: string; note: string }[] = [
  { id: 'pubmed', name: 'PubMed', note: 'Field tags [tiab] or [ti]; MeSH rows as [MeSH Terms]. Paste into the PubMed search box or Advanced Search.' },
  { id: 'europepmc', name: 'Europe PMC', note: 'Field prefixes TITLE_ABS: or TITLE:; MeSH rows as MESH:. Paste into the Europe PMC search box.' },
  { id: 'generic', name: 'Generic (most databases)', note: 'Plain terms with AND, OR, quotes and *. Add the database’s own field codes after you paste.' },
];

/** Straight quotes only; no stray quotes inside a term. */
function tidy(term: string): string {
  return term.replace(/[“”„‟"]/g, '').replace(/\s+/g, ' ').trim();
}

/** One term in one database's syntax. */
export function formatTerm(raw: string, db: Database, options: SearchOptions): string {
  let term = tidy(raw);
  if (!options.truncation) term = term.replace(/\*/g, '');
  if (!term) return '';
  const multi = /\s/.test(term);
  const tag = (text: string) => {
    if (db === 'pubmed') return options.field === 'all' ? text : `${text}[${options.field === 'tiab' ? 'tiab' : 'ti'}]`;
    if (db === 'europepmc') return options.field === 'all' ? text : `${options.field === 'tiab' ? 'TITLE_ABS' : 'TITLE'}:${text}`;
    return text;
  };
  if (!multi) return tag(term);
  if (options.phrases) return tag(`"${term}"`);
  // Without phrase quotes, every word must still be there (and tagged, where the database has tags).
  return `(${term.split(' ').map(tag).join(' AND ')})`;
}

function formatHeading(raw: string, db: Database): string {
  const heading = tidy(raw).replace(/\*/g, '');
  if (!heading) return '';
  if (db === 'pubmed') return `"${heading}"[MeSH Terms]`;
  if (db === 'europepmc') return `MESH:"${heading}"`;
  return '';
}

/** The OR group for one concept, in parentheses when it has more than one part. */
export function conceptGroup(concept: Concept, db: Database, options: SearchOptions): string {
  const seen = new Set<string>();
  const parts = [...concept.mesh.map((heading) => formatHeading(heading, db)), ...concept.terms.map((term) => formatTerm(term, db, options))]
    .filter((part) => {
      if (!part || seen.has(part.toLowerCase())) return false;
      seen.add(part.toLowerCase());
      return true;
    });
  if (parts.length === 0) return '';
  return parts.length === 1 ? parts[0] : `(${parts.join(' OR ')})`;
}

/** The full string: (A1 OR A2) AND (B1 OR B2) NOT (X1 OR X2). */
export function buildSearch(concepts: Concept[], db: Database, options: SearchOptions = DEFAULT_OPTIONS): string {
  const include = concepts.filter((concept) => !concept.not).map((concept) => conceptGroup(concept, db, options)).filter(Boolean);
  const excludeTerms = concepts.filter((concept) => concept.not);
  const exclude = conceptGroup({ name: 'NOT', terms: excludeTerms.flatMap((c) => c.terms), mesh: excludeTerms.flatMap((c) => c.mesh) }, db, options);
  if (include.length === 0) return '';
  const main = include.join(' AND ');
  if (!exclude) return main;
  // Wrap the included part so NOT applies to all of it, whatever the database's operator order.
  return `${include.length > 1 ? `(${main})` : main} NOT ${exclude}`;
}

/** Numbered lines for a search log: #1, #2 … then the line that combines them. */
export function buildSearchLines(concepts: Concept[], db: Database, options: SearchOptions = DEFAULT_OPTIONS): string[] {
  const lines: string[] = [];
  const include: number[] = [];
  const exclude: number[] = [];
  for (const concept of concepts) {
    const group = conceptGroup(concept, db, options);
    if (!group) continue;
    lines.push(group);
    (concept.not ? exclude : include).push(lines.length);
  }
  if (include.length === 0) return [];
  if (include.length + exclude.length > 1) {
    let combined = include.map((n) => `#${n}`).join(' AND ');
    if (exclude.length) combined = `${include.length > 1 ? `(${combined})` : combined} NOT ${exclude.length > 1 ? `(${exclude.map((n) => `#${n}`).join(' OR ')})` : `#${exclude[0]}`}`;
    lines.push(combined);
  }
  return lines.map((line, index) => `#${index + 1} ${line}`);
}

/** Free-text words from the concepts, for a plain keyword search (the first term of each included concept). */
export function plainKeywords(concepts: Concept[]): string {
  return concepts.filter((concept) => !concept.not).map((concept) => tidy(concept.terms[0] ?? '').replace(/\*/g, '')).filter(Boolean).join(' ');
}

export type SyntaxIssue = { level: 'error' | 'warning'; message: string };

/** Characters above which some databases refuse or time out. A rule of thumb, not a published limit. */
export const LONG_SEARCH = 4000;

/** Problems in a search string: quotes, parentheses, operators, truncation, length. */
export function checkSearch(search: string): SyntaxIssue[] {
  const issues: SyntaxIssue[] = [];
  const text = search.trim();
  if (!text) return issues;

  if (/[“”„‟]/.test(text)) issues.push({ level: 'error', message: 'Curly quotes (“ ”) found. Databases need straight quotes ("). Retype them or paste from a plain-text editor.' });
  if (((text.match(/"/g) ?? []).length) % 2 === 1) issues.push({ level: 'error', message: 'Unbalanced quotes: there is an odd number of " marks.' });

  // Parentheses outside quotes.
  let depth = 0;
  let early = false;
  let inQuote = false;
  for (const char of text) {
    if (char === '"') inQuote = !inQuote;
    if (inQuote) continue;
    if (char === '(') depth++;
    if (char === ')') { depth--; if (depth < 0) { early = true; depth = 0; } }
  }
  if (early) issues.push({ level: 'error', message: 'A closing parenthesis ")" comes before its opening one.' });
  if (depth > 0) issues.push({ level: 'error', message: `${depth} opening parenthes${depth === 1 ? 'is is' : 'es are'} never closed.` });
  if (/\(\s*\)/.test(text)) issues.push({ level: 'error', message: 'Empty parentheses "()".' });

  const unquoted = text.replace(/"[^"]*"/g, '"x"');
  if (/^\s*(AND|OR|NOT)\b/.test(unquoted)) issues.push({ level: 'error', message: 'The search starts with an operator.' });
  if (/\b(AND|OR|NOT)\s*$/.test(unquoted)) issues.push({ level: 'error', message: 'The search ends with an operator.' });
  if (/\b(AND|OR|NOT)\s+(AND|OR|NOT)\b/.test(unquoted)) issues.push({ level: 'error', message: 'Two operators in a row (for example "AND OR").' });
  if (/\(\s*(AND|OR|NOT)\b|\b(AND|OR|NOT)\s*\)/.test(unquoted)) issues.push({ level: 'error', message: 'An operator sits right next to a parenthesis, with no term on one side.' });
  if (/\s(and|or|not)\s/.test(unquoted)) issues.push({ level: 'warning', message: 'Lower-case "and", "or" or "not" found. Many databases, PubMed included, read operators only in capitals; lower-case ones may be searched as words.' });

  // AND and OR at the same level without parentheses depend on each database's precedence.
  if (/\bOR\b/.test(unquoted) && /\bAND\b/.test(unquoted)) {
    const flat = unquoted.replace(/\([^()]*\)/g, 'x');
    let previous = '';
    let reduced = flat;
    while (reduced !== previous) { previous = reduced; reduced = reduced.replace(/\([^()]*\)/g, 'x'); }
    if (/\bOR\b/.test(reduced) && /\bAND\b/.test(reduced)) issues.push({ level: 'warning', message: 'AND and OR are mixed without parentheses. Put each set of synonyms in brackets so every database reads it the same way.' });
  }

  const stems = unquoted.match(/(?:^|[\s("(:])([A-Za-z]{1,3})\*/g);
  if (stems) issues.push({ level: 'warning', message: `Very short truncation (${stems.map((s) => s.replace(/^[\s("(:]/, '')).slice(0, 3).join(', ')}) matches many unrelated words, and some databases refuse it. Use a longer stem.` });

  if (/\bNOT\b/.test(unquoted)) issues.push({ level: 'warning', message: 'NOT removes every record that mentions the excluded terms, including relevant studies that mention them in passing. Use it sparingly, and test what it removes.' });
  if (text.length > LONG_SEARCH) issues.push({ level: 'warning', message: `The search is ${text.length.toLocaleString('en-US')} characters. Very long strings can fail or time out in some databases; run each concept as a numbered line and combine the lines instead.` });
  return issues;
}

// ------------------------------------------------------------------ hand-off from the PICO builder

export type HandoffConcept = { name: string; terms: string[] };

const MAX_CONCEPTS = 8;
const MAX_TERMS = 30;
const MAX_CHARS = 200;

/** The URL hash the PICO builder links to: #concepts=<encoded JSON>. Kept in the hash, so it never reaches a server. */
export function encodeHandoff(concepts: HandoffConcept[]): string {
  const data = concepts.slice(0, MAX_CONCEPTS).map((concept) => ({ n: concept.name.slice(0, MAX_CHARS), t: concept.terms.slice(0, MAX_TERMS).map((term) => term.slice(0, MAX_CHARS)) }));
  return `concepts=${encodeURIComponent(JSON.stringify(data))}`;
}

/** Reads a hash written by encodeHandoff ("#concepts=…" or "concepts=…"); null when there is none or it is malformed. */
export function decodeHandoff(hash: string): HandoffConcept[] | null {
  const match = /(?:^#?|&)concepts=([^&]*)/.exec(hash);
  if (!match) return null;
  try {
    const data: unknown = JSON.parse(decodeURIComponent(match[1]));
    if (!Array.isArray(data)) return null;
    const concepts = data.slice(0, MAX_CONCEPTS).flatMap((item): HandoffConcept[] => {
      if (!item || typeof item !== 'object') return [];
      const { n, t } = item as { n?: unknown; t?: unknown };
      const terms = Array.isArray(t) ? t.filter((term): term is string => typeof term === 'string').map((term) => term.slice(0, MAX_CHARS).trim()).filter(Boolean).slice(0, MAX_TERMS) : [];
      if (!terms.length) return [];
      return [{ name: typeof n === 'string' ? n.slice(0, MAX_CHARS) : 'Concept', terms }];
    });
    return concepts.length ? concepts : null;
  } catch {
    return null;
  }
}
