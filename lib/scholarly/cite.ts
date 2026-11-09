/**
 * "Cite this paper" on the public paper pages: APA 7, MLA 9, Chicago (author-date), Harvard and
 * BibTeX, built from an index record. The editor uses citation-js with full CSL styles; these
 * pages only need the common styles for one record, so they use these small formatters.
 *
 * Output uses the marketing citation markup (*italic*), so the page can show italics and the
 * copy button can strip them (plainCitation). Titles are left as the index gives them:
 * re-casing a title by rule gets names and acronyms wrong.
 */

export type CiteRecord = {
  title: string;
  authors: string[];
  year: number | null;
  venue: string | null;
  volume?: string | null;
  issue?: string | null;
  firstPage?: string | null;
  lastPage?: string | null;
  doi?: string | null;
  type?: string | null;
  /** Authors the record has beyond `authors`. */
  moreAuthors?: number;
};

export type Name = { family: string; given: string };

const PARTICLES = new Set(['van', 'von', 'de', 'der', 'den', 'del', 'della', 'di', 'da', 'du', 'la', 'le', 'dos', 'das', 'ter', 'ten', 'bin', 'al']);
const SUFFIX = /^(jr\.?|sr\.?|ii|iii|iv)$/i;

/** "James D. Watson" or "Watson, James D." -> { family: "Watson", given: "James D." }. */
export function parseName(raw: string): Name {
  const name = raw.replace(/\s+/g, ' ').trim();
  if (!name) return { family: 'Unknown', given: '' };
  if (name.includes(',')) {
    const [family, ...rest] = name.split(',');
    return { family: family.trim(), given: rest.join(',').trim() };
  }
  const parts = name.split(' ');
  if (parts.length === 1) return { family: parts[0], given: '' };
  let end = parts.length;
  if (SUFFIX.test(parts[end - 1]) && end > 2) end -= 1;
  let start = end - 1;
  while (start > 1 && PARTICLES.has(parts[start - 1].toLowerCase())) start -= 1;
  const suffix = parts.slice(end).join(' ');
  return { family: parts.slice(start, end).join(' ') + (suffix ? ` ${suffix}` : ''), given: parts.slice(0, start).join(' ') };
}

/** "James Dewey" -> "J. D."; "Jean-Paul" -> "J.-P."; `spaced` false gives "J.D.". */
export function initials(given: string, { spaced = true, dots = true } = {}): string {
  const out = given
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.split('-').map((part) => {
      const letter = part.replace(/[^\p{L}]/gu, '').charAt(0).toUpperCase();
      return letter ? (dots ? `${letter}.` : letter) : '';
    }).filter(Boolean).join('-'));
  return out.join(spaced && dots ? ' ' : '');
}

function pages(record: CiteRecord, dash = '–'): string {
  const first = (record.firstPage || '').trim();
  const last = (record.lastPage || '').trim();
  if (first && last && last !== first) return `${first}${dash}${last}`;
  return first;
}

/** MLA and Chicago shorten a page range: 737–738 -> 737–38, 1250–1259 -> 1250–59. */
export function shortRange(first: string, last: string): string {
  if (!/^\d+$/.test(first) || !/^\d+$/.test(last) || last.length !== first.length || Number(last) <= Number(first)) return last;
  let i = 0;
  while (i < first.length - 2 && first[i] === last[i]) i += 1;
  return last.slice(i);
}

function shortPages(record: CiteRecord): string {
  const first = (record.firstPage || '').trim();
  const last = (record.lastPage || '').trim();
  if (first && last && last !== first) return `${first}–${shortRange(first, last)}`;
  return first;
}

const doiUrl = (doi?: string | null) => (doi ? `https://doi.org/${doi}` : '');
const end = (text: string) => (/[.?!]$/.test(text) ? text : `${text}.`);
const year = (record: CiteRecord) => (record.year ? String(record.year) : 'n.d.');
const names = (record: CiteRecord) => (record.authors.length ? record.authors.map(parseName) : []);

/** Joins with commas and a final connector: [a, b, c] -> "a, b, & c" (serial comma always). */
function joinList(items: string[], connector: string, serialForTwo: boolean): string {
  if (items.length <= 1) return items[0] || '';
  if (items.length === 2) return `${items[0]}${serialForTwo ? ',' : ''} ${connector} ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, ${connector} ${items[items.length - 1]}`;
}

export function apa(record: CiteRecord): string {
  const list = names(record).map((name) => (name.given ? `${name.family}, ${initials(name.given)}` : name.family));
  let authors: string;
  if (list.length > 20) authors = `${list.slice(0, 19).join(', ')}, . . . ${list[list.length - 1]}`;
  else authors = joinList(list, '&', true);
  const parts = [`${authors ? `${end(authors)} ` : ''}(${year(record)}). ${end(record.title)}`];
  if (record.venue) {
    let source = `*${record.venue}*`;
    if (record.volume) source += `, *${record.volume}*${record.issue ? `(${record.issue})` : ''}`;
    const range = pages(record);
    if (range) source += `, ${range}`;
    parts.push(`${source}.`);
  }
  if (record.doi) parts.push(doiUrl(record.doi));
  return parts.join(' ');
}

export function mla(record: CiteRecord): string {
  const list = names(record);
  let authors = '';
  if (list.length === 1) authors = list[0].given ? `${list[0].family}, ${list[0].given}` : list[0].family;
  else if (list.length === 2) authors = `${list[0].family}, ${list[0].given}, and ${[list[1].given, list[1].family].filter(Boolean).join(' ')}`;
  else if (list.length > 2) authors = `${list[0].family}, ${list[0].given}, et al`;
  const container: string[] = [];
  if (record.venue) container.push(`*${record.venue}*`);
  if (record.volume) container.push(`vol. ${record.volume}`);
  if (record.issue) container.push(`no. ${record.issue}`);
  if (record.year) container.push(String(record.year));
  const range = shortPages(record);
  if (range) container.push(range.includes('–') ? `pp. ${range}` : `p. ${range}`);
  if (record.doi) container.push(doiUrl(record.doi));
  return [authors ? end(authors) : '', `“${end(record.title)}”`, container.length ? `${container.join(', ')}.` : ''].filter(Boolean).join(' ');
}

export function chicago(record: CiteRecord): string {
  const list = names(record);
  const shown = list.length > 10 ? list.slice(0, 7) : list;
  const formatted = shown.map((name, index) => (index === 0 ? (name.given ? `${name.family}, ${name.given}` : name.family) : [name.given, name.family].filter(Boolean).join(' ')));
  const authors = list.length > 10 ? `${formatted.join(', ')}, et al` : joinList(formatted, 'and', true);
  const parts = [authors ? end(authors) : '', `${year(record)}.`, `“${end(record.title)}”`];
  if (record.venue) {
    let source = `*${record.venue}*`;
    if (record.volume) source += ` ${record.volume}${record.issue ? ` (${record.issue})` : ''}`;
    const range = shortPages(record);
    if (range) source += `: ${range}`;
    parts.push(`${source}.`);
  }
  if (record.doi) parts.push(`${doiUrl(record.doi)}.`);
  return parts.filter(Boolean).join(' ');
}

export function harvard(record: CiteRecord): string {
  const list = names(record).map((name) => (name.given ? `${name.family}, ${initials(name.given, { spaced: false })}` : name.family));
  const authors = list.length > 3 ? `${list[0]} et al.` : list.length === 3 ? `${list[0]}, ${list[1]} and ${list[2]}` : joinList(list, 'and', false);
  let text = `${authors ? `${authors} ` : ''}(${year(record)}) ‘${record.title.replace(/[.]$/, '')}’`;
  if (record.venue) {
    text += `, *${record.venue}*`;
    if (record.volume) text += `, ${record.volume}${record.issue ? `(${record.issue})` : ''}`;
    const range = pages(record);
    if (range) text += `, ${range.includes('–') ? 'pp.' : 'p.'} ${range}`;
  }
  text += '.';
  if (record.doi) text += ` Available at: ${doiUrl(record.doi)}.`;
  return text;
}

function bibtexType(type?: string | null): string {
  switch (type) {
    case 'book': return 'book';
    case 'book-chapter': return 'incollection';
    case 'dissertation': return 'phdthesis';
    case 'proceedings-article': return 'inproceedings';
    case 'preprint':
    case 'dataset':
    case 'other': return 'misc';
    default: return 'article';
  }
}

const escapeBibtex = (value: string) => value.replace(/([{}])/g, '\\$1');

/** A key like "watson1953molecular". */
export function bibtexKey(record: CiteRecord): string {
  const family = record.authors[0] ? parseName(record.authors[0]).family : 'anon';
  const word = record.title.toLowerCase().split(/[^\p{L}\p{N}]+/u).find((w) => w.length > 3 && !['with', 'from', 'into', 'that', 'this', 'their'].includes(w)) || 'paper';
  const clean = (value: string) => value.normalize('NFKD').replace(/[^\w]/g, '').toLowerCase();
  return `${clean(family) || 'anon'}${record.year ?? ''}${clean(word)}`;
}

export function bibtex(record: CiteRecord): string {
  const type = bibtexType(record.type);
  const venueField = type === 'inproceedings' || type === 'incollection' ? 'booktitle' : type === 'book' ? 'publisher' : type === 'phdthesis' ? 'school' : 'journal';
  const fields: [string, string | null | undefined][] = [
    ['title', `{${escapeBibtex(record.title)}}`],
    ['author', record.authors.map((raw) => { const name = parseName(raw); return name.given ? `${name.family}, ${name.given}` : name.family; }).map(escapeBibtex).join(' and ') + (record.moreAuthors ? ' and others' : '')],
    [venueField, record.venue ? escapeBibtex(record.venue) : null],
    ['volume', record.volume],
    ['number', record.issue],
    ['pages', pages(record, '--') || null],
    ['year', record.year ? String(record.year) : null],
    ['doi', record.doi],
  ];
  const body = fields.filter(([, value]) => value).map(([key, value]) => `  ${key} = {${value}}`).join(',\n');
  return `@${type}{${bibtexKey(record)},\n${body}\n}`;
}

export const CITE_FORMATS = [
  { id: 'apa', name: 'APA 7', format: apa, style: '/tools/citation-generator/apa' },
  { id: 'mla', name: 'MLA 9', format: mla, style: '/tools/citation-generator/mla' },
  { id: 'chicago', name: 'Chicago', format: chicago, style: '/tools/citation-generator/chicago' },
  { id: 'harvard', name: 'Harvard', format: harvard, style: '/tools/citation-generator/harvard' },
] as const;
