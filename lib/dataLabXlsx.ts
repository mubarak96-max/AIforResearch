/** Browser-local SpreadsheetML import. Values only: formulas are never executed.
 * Layout: https://learn.microsoft.com/en-us/office/open-xml/spreadsheet/working-with-sheets
 */
import JSZip from 'jszip';

export type XlsxSheet = { name: string; path: string };
export type XlsxWorkbook = { sheets: XlsxSheet[]; read: (path: string) => Promise<{ csv: string; warnings: string[] }> };
const MAX_PART = 24 * 1024 * 1024;
const xml = (text: string) => {
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error('This workbook contains unsupported XML declarations.');
  const document = new DOMParser().parseFromString(text, 'application/xml');
  if (document.getElementsByTagName('parsererror').length) throw new Error('The workbook contains invalid XML.');
  return document;
};
const children = (parent: Document | Element, name: string) => Array.from(parent.getElementsByTagNameNS('*', name));
/** Visible cell text: phonetic guides (rPh) hold reading aids, not the value, and are skipped. */
const visibleText = (parent: Element) => children(parent, 't')
  .filter((item) => !item.parentElement || item.parentElement.localName !== 'rPh')
  .map((item) => item.textContent ?? '').join('');
const valueOf = (parent: Element, name: string) => children(parent, name)[0]?.textContent ?? '';
const escapeCsv = (value: string) => /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;

/** Stop decompression as soon as a document part exceeds the budget. */
async function readPart(zip: JSZip, name: string, required = true): Promise<string> {
  const file = zip.file(name);
  if (!file) { if (required) throw new Error(`The workbook is missing ${name}.`); return ''; }
  return new Promise((resolve, reject) => {
    const parts: Uint8Array[] = []; let size = 0; let stopped = false;
    // This public JSZip API is omitted from its JSZipObject declaration.
    // https://stuk.github.io/jszip/documentation/api_zipobject/internal_stream.html
    const stream = (file as JSZip.JSZipObject & { internalStream(type: 'uint8array'): JSZip.JSZipStreamHelper<Uint8Array> }).internalStream('uint8array');
    stream.on('data', (part: Uint8Array) => {
      if (stopped) return;
      size += part.byteLength;
      if (size > MAX_PART) { stopped = true; stream.pause(); reject(new Error('This sheet is too large to import safely. Save a smaller CSV.')); return; }
      parts.push(part);
    }).on('error', reject).on('end', () => {
      if (stopped) return;
      const bytes = new Uint8Array(size); let offset = 0;
      for (const part of parts) { bytes.set(part, offset); offset += part.byteLength; }
      resolve(new TextDecoder().decode(bytes));
    }).resume();
  });
}

export function sheetToCsv(text: string, shared: string[]): { csv: string; warnings: string[] } {
  const document = xml(text);
  const rows: string[][] = [];
  const warnings = ['Only stored cell values are imported. Formatting and units are not inferred; date/time cells may contain spreadsheet serial numbers.'];
  let formulas = 0; let missingFormulas = 0; let cells = 0;
  for (const row of children(document, 'row')) {
    if (rows.length >= 50_001) throw new Error('This sheet has more than 50,000 data rows. Save a smaller CSV.');
    const values: string[] = [];
    let next = 0;
    for (const cell of Array.from(row.children).filter((element) => element.localName === 'c')) {
      cells += 1;
      if (cells > 1_000_000) throw new Error('This sheet contains too many cells. Save a smaller CSV.');
      const letters = cell.getAttribute('r')?.match(/^([A-Z]+)\d+$/)?.[1];
      const column = letters ? [...letters].reduce((index, letter) => index * 26 + letter.charCodeAt(0) - 64, 0) - 1 : next;
      if (column < 0 || column >= 200) throw new Error('Data Lab imports up to 200 columns. Select a narrower table.');
      next = column + 1;
      const type = cell.getAttribute('t');
      let value = valueOf(cell, 'v');
      if (children(cell, 'f').length) { formulas += 1; if (!children(cell, 'v').length) missingFormulas += 1; }
      if (type === 's') {
        const index = Number(value);
        if (!Number.isInteger(index) || index < 0 || shared[index] === undefined) throw new Error('The workbook contains an invalid shared-string reference.');
        value = shared[index];
      } else if (type === 'inlineStr') value = visibleText(cell);
      else if (type === 'b') value = value === '1' ? 'true' : 'false';
      values[column] = value;
    }
    if (values.some((value) => value?.trim())) rows.push(Array.from({ length: values.length }, (_, index) => values[index] ?? ''));
  }
  if (!rows.length) throw new Error('This sheet has no tabular data.');
  if (formulas) warnings.push(`${formulas} formula cells imported their cached values. Recalculate and save the workbook first if values may be stale.`);
  if (missingFormulas) warnings.push(`${missingFormulas} formula cells had no cached value and were imported as empty.`);
  if (children(document, 'mergeCell').length) warnings.push('Merged cells are not filled across rows or columns. Check the header and missing values.');
  return { csv: rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n'), warnings };
}

export async function openXlsx(bytes: ArrayBuffer): Promise<XlsxWorkbook> {
  if (bytes.byteLength > 20 * 1024 * 1024) throw new Error('Choose a workbook smaller than 20 MB.');
  const zip = await JSZip.loadAsync(bytes);
  if (Object.keys(zip.files).length > 5000) throw new Error('This workbook contains too many archive entries. Save the data sheet as CSV.');
  const workbook = xml(await readPart(zip, 'xl/workbook.xml'));
  const relationships = xml(await readPart(zip, 'xl/_rels/workbook.xml.rels'));
  const targets = new Map(children(relationships, 'Relationship').filter((item) => item.getAttribute('TargetMode') !== 'External').map((item) => [item.getAttribute('Id'), item.getAttribute('Target') ?? '']));
  const sheets = children(workbook, 'sheet').map((sheet) => {
    const id = sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') || sheet.getAttribute('r:id');
    const target = targets.get(id) ?? '';
    const path = target.startsWith('/xl/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
    return { name: sheet.getAttribute('name') ?? 'Sheet', path };
  }).filter((sheet) => /^xl\/worksheets\/[A-Za-z0-9_. -]+\.xml$/.test(sheet.path));
  if (!sheets.length) throw new Error('No readable worksheets were found. Choose an unencrypted .xlsx file.');
  if (sheets.length > 100) throw new Error('Choose a workbook with fewer than 100 sheets.');
  const sharedText = await readPart(zip, 'xl/sharedStrings.xml', false);
  const shared = sharedText ? children(xml(sharedText), 'si').map(visibleText) : [];
  return { sheets, read: async (path) => {
    if (!sheets.some((sheet) => sheet.path === path)) throw new Error('Choose a worksheet from this workbook.');
    return sheetToCsv(await readPart(zip, path), shared);
  } };
}
