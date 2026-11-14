/**
 * BibTeX helpers for the BibTeX to APA converter (/tools/bibtex-to-apa): parse BibTeX into
 * CSL-JSON with citation-js, list the fields a reference is missing, and write RIS.
 * Runs in the browser (and in tests); nothing is uploaded.
 */
import { Cite } from '@citation-js/core';
import '@citation-js/plugin-bibtex';

export type CslItem = Record<string, unknown> & { id: string; type: string; title?: string };

/** Entries are split where a line starts with "@type{"; @string and @preamble stay with every entry. */
function splitEntries(text: string): { shared: string; entries: string[] } {
  const chunks = text.split(/(?=^[ \t]*@[a-zA-Z]+\s*[{(])/m).map((chunk) => chunk.trim()).filter((chunk) => chunk.startsWith('@'));
  const shared = chunks.filter((chunk) => /^@(string|preamble)\b/i.test(chunk)).join('\n');
  const entries = chunks.filter((chunk) => !/^@(string|preamble|comment)\b/i.test(chunk));
  return { shared, entries };
}

const keyOf = (entry: string) => /^@[a-zA-Z]+\s*[{(]\s*([^,\s]+)/.exec(entry)?.[1] ?? entry.slice(0, 40);

/**
 * Parses BibTeX. The whole text is tried first; if citation-js refuses it, each entry is parsed
 * on its own so one broken entry does not hide the others.
 */
export function parseBibtex(text: string): { items: CslItem[]; errors: { key: string; message: string }[] } {
  const { shared, entries } = splitEntries(text);
  if (!entries.length) return { items: [], errors: [] };
  try {
    const items = normalize(new Cite(text).data);
    if (items.length >= entries.length) return { items, errors: [] };
  } catch { /* fall through to one entry at a time */ }
  const items: CslItem[] = [];
  const errors: { key: string; message: string }[] = [];
  for (const entry of entries) {
    try {
      const parsed = normalize(new Cite(`${shared}\n${entry}`).data);
      if (parsed.length) items.push(...parsed);
      else errors.push({ key: keyOf(entry), message: 'Could not read this entry.' });
    } catch (error) {
      errors.push({ key: keyOf(entry), message: (error as Error).message?.slice(0, 160) || 'Could not read this entry.' });
    }
  }
  return { items, errors };
}

function normalize(data: unknown[]): CslItem[] {
  const seen = new Set<string>();
  return (data as CslItem[]).filter(Boolean).map((item, index) => {
    let id = String(item['citation-key'] || item.id || `entry-${index + 1}`);
    while (seen.has(id)) id = `${id}-${index + 1}`;
    seen.add(id);
    // citation-js keeps the BibTeX type as the genre ("phdthesis"); APA prints the genre in brackets.
    const genre = String(item.genre || '');
    if (item.type === 'thesis' && /^phd/i.test(genre)) return { ...item, id, genre: 'Doctoral dissertation' };
    if (item.type === 'thesis' && /^master/i.test(genre)) return { ...item, id, genre: 'Master’s thesis' };
    return { ...item, id };
  });
}

const CONTAINER_TYPES = new Set(['article-journal', 'article-magazine', 'article-newspaper', 'paper-conference', 'chapter', 'entry-encyclopedia']);
const PUBLISHER_TYPES = new Set(['book', 'report', 'thesis', 'manuscript']);
const DOI_TYPES = new Set(['article-journal', 'paper-conference', 'chapter', 'book', 'report', 'dataset']);

const names = (value: unknown) => Array.isArray(value) && value.length > 0;
const hasYear = (item: CslItem) => {
  const issued = item.issued as { 'date-parts'?: unknown[][]; raw?: string; literal?: string } | undefined;
  return Boolean(issued && (issued['date-parts']?.[0]?.[0] || issued.raw || issued.literal));
};

/** What a reference lacks for a complete APA entry. DOI is only expected for kinds of work that usually have one. */
export function missingFields(item: CslItem): string[] {
  const missing: string[] = [];
  if (!names(item.author) && !names(item.editor)) missing.push('author');
  if (!hasYear(item)) missing.push('year');
  if (!String(item.title || '').trim()) missing.push('title');
  if (CONTAINER_TYPES.has(item.type) && !String(item['container-title'] || '').trim()) missing.push(item.type === 'article-journal' ? 'journal' : 'container title (journal, book or proceedings)');
  if ((PUBLISHER_TYPES.has(item.type) || item.type === 'chapter') && !String(item.publisher || '').trim()) missing.push(item.type === 'thesis' ? 'publisher (university)' : 'publisher');
  if (DOI_TYPES.has(item.type) && !String(item.DOI || '').trim() && !String(item.URL || '').trim()) missing.push('DOI');
  return missing;
}

const RIS_TYPES: Record<string, string> = {
  'article-journal': 'JOUR', 'article-magazine': 'MGZN', 'article-newspaper': 'NEWS', book: 'BOOK', chapter: 'CHAP',
  'paper-conference': 'CPAPER', thesis: 'THES', report: 'RPRT', webpage: 'ELEC', dataset: 'DATA', manuscript: 'UNPB',
};

type Name = { family?: string; given?: string; literal?: string };
const risName = (name: Name) => (name.literal ? name.literal : [name.family, name.given].filter(Boolean).join(', '));

/** CSL-JSON to RIS (for Zotero, Mendeley, EndNote and most reference managers). */
export function toRis(items: CslItem[]): string {
  return items.map((item) => {
    const lines: string[] = [`TY  - ${RIS_TYPES[item.type] || 'GEN'}`];
    const add = (tag: string, value: unknown) => { const text = String(value ?? '').replace(/\s+/g, ' ').trim(); if (text) lines.push(`${tag}  - ${text}`); };
    for (const name of (item.author as Name[] | undefined) ?? []) add('AU', risName(name));
    for (const name of (item.editor as Name[] | undefined) ?? []) add('ED', risName(name));
    add('TI', item.title);
    add('T2', item['container-title']);
    const parts = (item.issued as { 'date-parts'?: number[][] } | undefined)?.['date-parts']?.[0];
    if (parts?.[0]) add('PY', parts[0]);
    if (parts?.[0]) add('DA', [parts[0], parts[1], parts[2]].map((part) => (part ? String(part).padStart(2, '0') : '')).join('/').replace(/\/+$/, ''));
    add('VL', item.volume);
    add('IS', item.issue);
    const [start, end] = String(item.page ?? '').split(/[-–]+/);
    add('SP', start);
    add('EP', end);
    add('ET', item.edition);
    add('PB', item.publisher);
    add('CY', item['publisher-place']);
    add('SN', item.ISSN || item.ISBN);
    add('DO', item.DOI);
    add('UR', item.URL);
    add('AB', item.abstract);
    add('ID', item.id);
    lines.push('ER  - ');
    return lines.join('\r\n');
  }).join('\r\n\r\n') + (items.length ? '\r\n' : '');
}
