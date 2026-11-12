/**
 * Systematic Review imports: database exports (RIS, BibTeX, CSV, PubMed .nbib / MEDLINE) to one
 * record shape, and duplicate detection by DOI, PubMed id and normalized title. Pure, for tests.
 *
 * Scopus and Web of Science have no search API a product like this can use: people upload their
 * export (RIS or CSV) instead.
 */
import { parseBibtex, parseRis } from './referenceFiles.js';
import { doiKey, titleKey } from './sources/classify.js';

export type ImportedRecord = {
  title: string;
  authors: string[];
  year: number | null;
  venue: string | null;
  doi: string | null;
  pmid: string | null;
  abstract: string | null;
  url: string | null;
};

const yearOf = (value: unknown) => {
  const match = String(value ?? '').match(/\b(1[5-9]\d{2}|20\d{2})\b/);
  return match ? Number(match[1]) : null;
};

/** One CSV line set to rows of cells (quotes, doubled quotes, commas and newlines inside quotes). */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const input = text.replace(/^﻿/, '');
  // Semicolon-separated exports (some European locales) when the header has no commas.
  const firstLine = input.split(/\r?\n/, 1)[0] ?? '';
  const sep = !firstLine.includes(',') && firstLine.includes(';') ? ';' : firstLine.includes('\t') && !firstLine.includes(',') ? '\t' : ',';
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quoted) {
      if (char === '"') {
        if (input[index + 1] === '"') { cell += '"'; index += 1; } else quoted = false;
      } else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === sep) { row.push(cell); cell = ''; }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[index + 1] === '\n') index += 1;
      row.push(cell); cell = '';
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
    } else cell += char;
  }
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

/** Column names that Scopus, Web of Science, PubMed and reference managers use. */
const COLUMNS: Record<keyof ImportedRecord, RegExp> = {
  title: /^(title|article title|document title|ti)$/i,
  authors: /^(authors?|author full names|author names|au|af)$/i,
  year: /^(year|publication year|py|pubyear|date|publication date)$/i,
  venue: /^(source title|journal|journal\/book|source|publication title|so|journal title)$/i,
  doi: /^(doi|di)$/i,
  pmid: /^(pmid|pubmed id|pm)$/i,
  abstract: /^(abstract|ab)$/i,
  url: /^(link|url)$/i,
};

export function parseCsvRecords(text: string): ImportedRecord[] {
  const [header, ...rows] = parseCsvRows(text);
  if (!header) return [];
  const index: Partial<Record<keyof ImportedRecord, number>> = {};
  header.forEach((name, at) => {
    const key = (Object.keys(COLUMNS) as (keyof ImportedRecord)[]).find((field) => COLUMNS[field].test(name.trim()));
    if (key && index[key] === undefined) index[key] = at;
  });
  if (index.title === undefined) return [];
  const get = (row: string[], key: keyof ImportedRecord) => (index[key] === undefined ? '' : (row[index[key]!] ?? '').trim());
  return rows.map((row) => {
    const authorsText = get(row, 'authors');
    return {
      title: get(row, 'title'),
      authors: authorsText ? authorsText.split(/\s*;\s*|\s+and\s+/).filter(Boolean).slice(0, 50) : [],
      year: yearOf(get(row, 'year')), venue: get(row, 'venue') || null, doi: doiKey(get(row, 'doi')), pmid: get(row, 'pmid').match(/\d{1,9}/)?.[0] ?? null,
      abstract: get(row, 'abstract') || null, url: get(row, 'url') || null,
    };
  }).filter((record) => record.title.length > 2);
}

/** PubMed's .nbib / MEDLINE text format ("PMID- 123", "TI  - Title", continuation lines indented). */
export function parseNbib(text: string): ImportedRecord[] {
  const out: ImportedRecord[] = [];
  for (const block of text.replace(/\r\n/g, '\n').split(/\n\s*\n(?=PMID-)/)) {
    const fields: [string, string][] = [];
    for (const line of block.split('\n')) {
      const match = line.match(/^([A-Z]{2,4})\s*-\s(.*)$/);
      if (match) fields.push([match[1], match[2].trim()]);
      else if (/^\s{4,}\S/.test(line) && fields.length) fields[fields.length - 1][1] += ` ${line.trim()}`;
    }
    const all = (tag: string) => fields.filter(([key]) => key === tag).map(([, value]) => value);
    const one = (tag: string) => all(tag)[0] ?? null;
    const title = one('TI');
    if (!title) continue;
    const doi = [...all('LID'), ...all('AID')].map((value) => value.match(/(10\.\S+)\s*\[doi\]/)?.[1]).find(Boolean) ?? null;
    out.push({
      title, authors: (all('FAU').length ? all('FAU') : all('AU')).map((name) => (name.includes(',') ? name.split(',').reverse().map((part) => part.trim()).join(' ') : name)),
      year: yearOf(one('DP')), venue: one('JT') ?? one('TA'), doi: doiKey(doi), pmid: one('PMID'), abstract: one('AB'), url: one('PMID') ? `https://pubmed.ncbi.nlm.nih.gov/${one('PMID')}/` : null,
    });
  }
  return out;
}

/** Any supported export, by file name or content. */
export function parseExport(name: string, text: string): { format: string; records: ImportedRecord[] } {
  const extension = name.toLowerCase().match(/\.([a-z]+)$/)?.[1] ?? '';
  const trimmed = text.trimStart();
  if (extension === 'nbib' || extension === 'medline' || /^PMID-\s/m.test(trimmed.slice(0, 200))) return { format: 'PubMed (.nbib)', records: parseNbib(text) };
  if (extension === 'bib' || trimmed.startsWith('@')) {
    return { format: 'BibTeX', records: parseBibtex(text).map((item) => ({ title: item.title, authors: item.authors, year: yearOf(item.year), venue: item.journal, doi: doiKey(item.doi), pmid: null, abstract: item.abstract, url: item.url })) };
  }
  if (extension === 'ris' || extension === 'txt' && /^TY\s+-/m.test(trimmed) || /^TY\s+-/.test(trimmed)) {
    return { format: 'RIS', records: parseRis(text).map((item) => ({ title: item.title, authors: item.authors, year: yearOf(item.year), venue: item.journal, doi: doiKey(item.doi), pmid: null, abstract: item.abstract, url: item.url })) };
  }
  if (extension === 'csv' || extension === 'tsv' || extension === 'txt') return { format: 'CSV', records: parseCsvRecords(text) };
  throw new Error('Upload an export as RIS, BibTeX, CSV or PubMed .nbib.');
}

/** Keys that identify the same study across databases. */
export function recordKeys(record: Pick<ImportedRecord, 'doi' | 'pmid' | 'title'>): string[] {
  const keys: string[] = [];
  const doi = doiKey(record.doi);
  if (doi) keys.push(`doi:${doi}`);
  if (record.pmid) keys.push(`pmid:${record.pmid}`);
  const title = titleKey(record.title);
  if (title.length >= 20) keys.push(`title:${title}`);
  return keys;
}

export type DedupeEntry = { title: string; reason: 'doi' | 'pmid' | 'title'; kept_id: string };

/**
 * Splits incoming records into new ones and duplicates of what is already there (or of each
 * other). `existing` maps keys to record ids.
 */
export function findDuplicates<T extends ImportedRecord>(incoming: T[], existing: Map<string, string>, newId: () => string) {
  const seen = new Map(existing);
  const fresh: (T & { id: string })[] = [];
  const duplicates: (T & { id: string; duplicate_of: string; reason: DedupeEntry['reason'] })[] = [];
  for (const record of incoming) {
    const keys = recordKeys(record);
    const hit = keys.find((key) => seen.has(key));
    const id = newId();
    if (hit) {
      duplicates.push({ ...record, id, duplicate_of: seen.get(hit)!, reason: hit.split(':')[0] as DedupeEntry['reason'] });
    } else {
      fresh.push({ ...record, id });
      for (const key of keys) seen.set(key, id);
    }
  }
  return { fresh, duplicates };
}

/** Records as RIS, for reference managers. */
export function toRis(records: (ImportedRecord & { decision?: string | null; reason?: string | null })[]): string {
  return records.map((record) => [
    'TY  - JOUR', `TI  - ${record.title}`, ...record.authors.map((author) => `AU  - ${author}`),
    record.year ? `PY  - ${record.year}` : '', record.venue ? `JO  - ${record.venue}` : '', record.doi ? `DO  - ${record.doi}` : '',
    record.pmid ? `AN  - ${record.pmid}` : '', record.abstract ? `AB  - ${record.abstract.replace(/\s+/g, ' ')}` : '', record.url ? `UR  - ${record.url}` : '',
    record.decision ? `N1  - Decision: ${record.decision}${record.reason ? ` (${record.reason})` : ''}` : '', 'ER  - ',
  ].filter(Boolean).join('\n')).join('\n\n');
}

export const csvCell = (value: unknown) => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
export const toCsv = (rows: unknown[][]) => rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
