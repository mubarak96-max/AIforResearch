import { WORKFLOW_CATALOG, csvCell, type Workbook, type WorkbookEntry } from './workflows';

export type ImportTable = { headers: string[]; rows: string[][]; empty_rows: number };
/** Strict quoted CSV/TSV parser. Malformed, extra and oversized records never disappear. */
export function readWorkflowTable(input: string): ImportTable {
  if (input.length > 800000) throw new Error('Choose a table under 800,000 characters. Split larger files before importing.');
  const text = input.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const first = text.split('\n', 1)[0];
  let inside = false; const counts = { ',': 0, ';': 0, '\t': 0 };
  for (let i = 0; i < first.length; i += 1) { if (first[i] === '"') { if (inside && first[i + 1] === '"') i += 1; else inside = !inside; } else if (!inside && first[i] in counts) counts[first[i] as keyof typeof counts] += 1; }
  const delimiter = (Object.keys(counts) as (keyof typeof counts)[]).sort((a, b) => counts[b] - counts[a])[0];
  const records: string[][] = []; let record: string[] = []; let field = ''; let quoted = false; let closed = false; let empty = 0;
  const cell = () => { record.push(field); field = ''; closed = false; };
  const row = () => { cell(); if (record.every((value) => !value.trim())) empty += 1; else records.push(record); record = []; if (records.length > 251) throw new Error('Import up to 250 data rows at a time. No rows were discarded.'); };
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) { if (char === '"' && text[i + 1] === '"') { field += '"'; i += 1; } else if (char === '"') { quoted = false; closed = true; } else field += char; }
    else if (char === delimiter) cell();
    else if (char === '\n') row();
    else if (char === '"' && !field && !closed) quoted = true;
    else if (closed || char === '"') throw new Error('Malformed CSV quotation. Close each quoted field before the delimiter or line break.');
    else field += char;
  }
  if (quoted) throw new Error('The final quoted field is not closed.');
  if (field || record.length || closed) row();
  const [header, ...rows] = records;
  if (!header || !rows.length) throw new Error('Include a header row and at least one data row.');
  if (header.length > 40) throw new Error('Import up to 40 columns.');
  const headers = header.map((value) => value.trim());
  if (headers.some((value) => !value) || new Set(headers.map((value) => value.toLowerCase())).size !== headers.length) throw new Error('Use a unique, non-empty name for each column.');
  for (const [index, values] of rows.entries()) if (values.length !== headers.length) throw new Error(`Data row ${index + 1} has ${values.length} fields; the header has ${headers.length}. No rows were discarded.`);
  return { headers, rows, empty_rows: empty };
}

export function transcriptExcerpts(source: WorkbookEntry): { values: Record<string, string>[]; blank_lines: number; cue_lines: number } {
  if (source.section !== 'sources' || source.values.kind !== 'transcript') throw new Error('Choose a saved transcript source.');
  const lines = source.values.text.split(/\r\n|\n|\r/); const values: Record<string, string>[] = []; let blank = 0; let cues = 0; let timestamp = '';
  for (const [index, line] of lines.entries()) {
    const text = line.trim();
    if (!text) { blank += 1; continue; }
    if (/^(?:\d{2}:)?\d{2}:\d{2}[.,]\d{3}\s*-->/.test(text)) { timestamp = text; cues += 1; continue; }
    if (text === 'WEBVTT' || (/^\d+$/.test(text) && /-->/.test(lines[index + 1] || ''))) { cues += 1; continue; }
    const speaker = text.match(/^([^:\n]{1,80}):\s+\S/);
    values.push({ source_id: source.id, quote: text, locator: `Line ${index + 1}${timestamp ? ` · ${timestamp}` : ''}`, speaker: speaker?.[1] || '', codes: '', negative_case: 'mixed / uncertain', interpretation: '' });
  }
  if (!values.length) throw new Error('This transcript has no spoken text to import.');
  if (values.length > 250) throw new Error('This transcript has more than 250 spoken lines. Split it into smaller sources; no lines were discarded.');
  return { values, blank_lines: blank, cue_lines: cues };
}

export function workflowSectionCsv(workbook: Workbook, section: string, template = false): string {
  const fields = WORKFLOW_CATALOG[workbook.kind].sections.find((item) => item.key === section)?.fields || [];
  const keys = fields.filter((field) => !(section === 'sources' && field.key === 'text')).map((field) => field.key);
  return [keys.map(csvCell).join(','), ...(!template ? workbook.entries.filter((entry) => entry.section === section).map((entry) => keys.map((key) => csvCell(entry.values[key])).join(',')) : [])].join('\r\n');
}

const xml = (value: string) => {
  if (value.length > 32767 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value)) throw new Error('A value cannot be represented safely in Excel. Export the JSON evidence bundle to retain the full original.');
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
};
const letters = (index: number): string => index < 26 ? String.fromCharCode(65 + index) : `${letters(Math.floor(index / 26) - 1)}${String.fromCharCode(65 + index % 26)}`;

/** SpreadsheetML inline strings cannot execute formulas. Original source text stays in JSON. */
export async function exportWorkflowXlsx(workbook: Workbook): Promise<Uint8Array> {
  const { default: JSZip } = await import('jszip'); const zip = new JSZip();
  const sheets: { name: string; rows: string[][] }[] = [{ name: 'Brief', rows: [['Field', 'Value'], ['Title', workbook.title], ['Question', workbook.question], ['Audience', workbook.audience || ''], ['Deliverable', workbook.deliverable || ''], ['Success criteria', workbook.success_criteria || ''], ['Sources and scope', workbook.source_constraints || ''], ['Deadline', workbook.deadline], ['Status', workbook.status], ['Revision', String(workbook.revision)], ['Export note', 'Values are text, preserving units and identifiers. Full source text and history are in the JSON evidence bundle.']] }];
  for (const section of WORKFLOW_CATALOG[workbook.kind].sections) {
    const entries = workbook.entries.filter((entry) => entry.section === section.key); if (!entries.length) continue;
    const fields = section.fields.filter((field) => !(section.key === 'sources' && field.key === 'text'));
    sheets.push({ name: section.title.slice(0, 31), rows: [['entry_id', ...fields.map((field) => field.key)], ...entries.map((entry) => [entry.id, ...fields.map((field) => entry.values[field.key] || '')])] });
  }
  const start = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  zip.file('[Content_Types].xml', `${start}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`);
  zip.file('_rels/.rels', `${start}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  zip.file('xl/workbook.xml', `${start}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((sheet, i) => `<sheet name="${xml(sheet.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`);
  zip.file('xl/_rels/workbook.xml.rels', `${start}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}</Relationships>`);
  sheets.forEach((sheet, i) => zip.file(`xl/worksheets/sheet${i + 1}.xml`, `${start}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheet.rows.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((value, columnIndex) => `<c r="${letters(columnIndex)}${rowIndex + 1}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`));
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}
