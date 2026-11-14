/**
 * A literature review (synthesis) matrix kept in the browser: columns, rows, themes, and export as
 * CSV, Markdown or HTML. Pure functions, used by components/tools/utilities/LiteratureReviewMatrixBuilder.
 */

export type MatrixColumn = { id: string; name: string };
export type MatrixRow = { id: string; cells: Record<string, string>; doi?: string };
export type Matrix = { columns: MatrixColumn[]; rows: MatrixRow[] };

export type Preset = 'review' | 'synthesis';

export const PRESETS: Record<Preset, { name: string; help: string; columns: string[] }> = {
  review: {
    name: 'Literature review matrix',
    help: 'One row per study: what it did, what it found and how good it is.',
    columns: ['Citation', 'Aim', 'Design', 'Sample/setting', 'Key findings', 'Limitations', 'Theme(s)'],
  },
  synthesis: {
    name: 'Synthesis essay (sources × ideas)',
    help: 'One row per source, one column per idea. Write what each source says about each idea, then read down the columns.',
    columns: ['Citation', 'Main claim', 'Idea 1', 'Idea 2', 'Idea 3', 'Quote and page', 'How I will use it', 'Theme(s)'],
  },
};

let counter = 0;
/** Short ids, unique within a session; enough for keys and cell maps. */
export function makeId(prefix: string): string {
  counter += 1;
  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function newMatrix(preset: Preset = 'review'): Matrix {
  return { columns: PRESETS[preset].columns.map((name) => ({ id: makeId('c'), name })), rows: [] };
}

export function addColumn(matrix: Matrix, name = 'New column'): Matrix {
  return { ...matrix, columns: [...matrix.columns, { id: makeId('c'), name }] };
}

export function renameColumn(matrix: Matrix, id: string, name: string): Matrix {
  return { ...matrix, columns: matrix.columns.map((column) => (column.id === id ? { ...column, name } : column)) };
}

export function removeColumn(matrix: Matrix, id: string): Matrix {
  return {
    columns: matrix.columns.filter((column) => column.id !== id),
    rows: matrix.rows.map((row) => {
      const { [id]: _removed, ...cells } = row.cells;
      return { ...row, cells };
    }),
  };
}

export function addRow(matrix: Matrix, cells: Record<string, string> = {}, doi?: string): Matrix {
  return { ...matrix, rows: [...matrix.rows, { id: makeId('r'), cells, ...(doi ? { doi } : {}) }] };
}

export function removeRow(matrix: Matrix, id: string): Matrix {
  return { ...matrix, rows: matrix.rows.filter((row) => row.id !== id) };
}

/** Moves a row up (-1) or down (+1); a move past either end does nothing. */
export function moveRow(matrix: Matrix, id: string, by: -1 | 1): Matrix {
  const index = matrix.rows.findIndex((row) => row.id === id);
  const target = index + by;
  if (index < 0 || target < 0 || target >= matrix.rows.length) return matrix;
  const rows = [...matrix.rows];
  [rows[index], rows[target]] = [rows[target], rows[index]];
  return { ...matrix, rows };
}

export function updateCell(matrix: Matrix, rowId: string, columnId: string, value: string): Matrix {
  return { ...matrix, rows: matrix.rows.map((row) => (row.id === rowId ? { ...row, cells: { ...row.cells, [columnId]: value } } : row)) };
}

/** The column that holds themes: the first whose name mentions "theme", else none. */
export function themeColumnId(matrix: Matrix): string | null {
  return matrix.columns.find((column) => /theme/i.test(column.name))?.id ?? null;
}

/** "Access; cost, Trust" -> ["Access", "cost", "Trust"]. */
export function splitThemes(value: string | undefined): string[] {
  return (value ?? '').split(/[;,\n]/).map((theme) => theme.trim()).filter(Boolean);
}

/** Every theme used in a column, case-insensitively unique, in first-seen order. */
export function themesOf(matrix: Matrix, columnId: string): string[] {
  const seen = new Map<string, string>();
  for (const row of matrix.rows) for (const theme of splitThemes(row.cells[columnId])) if (!seen.has(theme.toLowerCase())) seen.set(theme.toLowerCase(), theme);
  return [...seen.values()];
}

export function rowHasTheme(row: MatrixRow, columnId: string, theme: string): boolean {
  return splitThemes(row.cells[columnId]).some((value) => value.toLowerCase() === theme.toLowerCase());
}

/** Rows by theme; a row with two themes appears in both, and rows with none come last. */
export function groupByTheme(matrix: Matrix, columnId: string): { theme: string | null; rows: MatrixRow[] }[] {
  const groups = themesOf(matrix, columnId).map((theme) => ({ theme: theme as string | null, rows: matrix.rows.filter((row) => rowHasTheme(row, columnId, theme)) }));
  const none = matrix.rows.filter((row) => splitThemes(row.cells[columnId]).length === 0);
  return none.length ? [...groups, { theme: null, rows: none }] : groups;
}

// ------------------------------------------------------------------ export

/** A CSV field: quoted when needed, and with a leading ' when a spreadsheet would read it as a formula. */
export function csvField(value: string): string {
  let text = value ?? '';
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(matrix: Matrix, rows: MatrixRow[] = matrix.rows): string {
  const lines = [matrix.columns.map((column) => csvField(column.name)).join(',')];
  for (const row of rows) lines.push(matrix.columns.map((column) => csvField(row.cells[column.id] ?? '')).join(','));
  return `${lines.join('\r\n')}\r\n`;
}

const mdCell = (value: string) => (value ?? '').replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>').trim();

export function toMarkdown(matrix: Matrix, rows: MatrixRow[] = matrix.rows): string {
  const head = `| ${matrix.columns.map((column) => mdCell(column.name)).join(' | ')} |`;
  const rule = `| ${matrix.columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${matrix.columns.map((column) => mdCell(row.cells[column.id] ?? '')).join(' | ')} |`);
  return [head, rule, ...body].join('\n');
}

export function escapeHtml(value: string): string {
  return (value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function toHtml(matrix: Matrix, rows: MatrixRow[] = matrix.rows): string {
  const cell = (tag: 'th' | 'td', value: string) => `<${tag}>${escapeHtml(value).replace(/\r?\n/g, '<br>')}</${tag}>`;
  const head = `<tr>${matrix.columns.map((column) => cell('th', column.name)).join('')}</tr>`;
  const body = rows.map((row) => `<tr>${matrix.columns.map((column) => cell('td', row.cells[column.id] ?? '')).join('')}</tr>`).join('\n');
  return `<table>\n<thead>${head}</thead>\n<tbody>\n${body}\n</tbody>\n</table>`;
}

// ------------------------------------------------------------------ lookup and storage

type CslName = { family?: string; given?: string; literal?: string };
export type CslLike = { title?: unknown; author?: unknown; issued?: unknown; DOI?: unknown; 'container-title'?: unknown };

export type PaperDetails = { authors: string; year: string; title: string; venue: string; doi: string; citation: string };

const text = (value: unknown) => (Array.isArray(value) ? String(value[0] ?? '') : typeof value === 'string' || typeof value === 'number' ? String(value) : '').replace(/\s+/g, ' ').trim();

/** Authors, year, title and a short citation ("Watson & Crick (1953). Title. Nature.") from a CSL-JSON record. */
export function detailsFromCsl(csl: CslLike): PaperDetails {
  const names = (Array.isArray(csl.author) ? csl.author : []) as CslName[];
  const family = names.map((name) => (name.literal || name.family || '').trim()).filter(Boolean);
  const full = names.map((name) => name.literal || [name.given, name.family].filter(Boolean).join(' ')).filter(Boolean);
  const issued = csl.issued as { 'date-parts'?: unknown[][] } | undefined;
  const year = String(issued?.['date-parts']?.[0]?.[0] ?? '').trim();
  const title = text(csl.title);
  const venue = text(csl['container-title']);
  const doi = text(csl.DOI);
  const who = family.length === 0 ? '' : family.length === 1 ? family[0] : family.length === 2 ? `${family[0]} & ${family[1]}` : `${family[0]} et al.`;
  const citation = [
    `${who || title || 'Untitled'}${year ? ` (${year})` : who ? ' (n.d.)' : ''}.`,
    who && title ? `${title.replace(/[.]$/, '')}.` : '',
    venue ? `${venue}.` : '',
    doi ? `https://doi.org/${doi}` : '',
  ].filter(Boolean).join(' ');
  return { authors: full.join('; '), year, title, venue, doi, citation };
}

/** Cells for a looked-up paper: the citation column, plus Authors, Year or Title columns if the matrix has them. */
export function cellsFromDetails(matrix: Matrix, details: PaperDetails): Record<string, string> {
  const cells: Record<string, string> = {};
  for (const column of matrix.columns) {
    const name = column.name.trim().toLowerCase();
    if (/^(citation|source|reference|study)/.test(name)) cells[column.id] = details.citation;
    else if (/^authors?$/.test(name)) cells[column.id] = details.authors;
    else if (/^year$/.test(name)) cells[column.id] = details.year;
    else if (/^title$/.test(name)) cells[column.id] = details.title;
  }
  if (!Object.keys(cells).length && matrix.columns[0]) cells[matrix.columns[0].id] = details.citation;
  return cells;
}

/** A saved matrix, checked; null when it is missing or not a matrix. */
export function parseMatrix(json: string | null): Matrix | null {
  if (!json) return null;
  try {
    const data = JSON.parse(json) as Partial<Matrix>;
    if (!Array.isArray(data.columns) || !Array.isArray(data.rows)) return null;
    const columns = data.columns.filter((column): column is MatrixColumn => Boolean(column) && typeof column.id === 'string' && typeof column.name === 'string');
    const rows = data.rows.flatMap((row): MatrixRow[] => {
      if (!row || typeof row.id !== 'string' || !row.cells || typeof row.cells !== 'object') return [];
      const cells = Object.fromEntries(Object.entries(row.cells).filter(([, value]) => typeof value === 'string')) as Record<string, string>;
      return [{ id: row.id, cells, ...(typeof row.doi === 'string' ? { doi: row.doi } : {}) }];
    });
    return columns.length ? { columns, rows } : null;
  } catch {
    return null;
  }
}
