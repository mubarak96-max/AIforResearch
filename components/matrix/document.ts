type DocumentCell = { value: string; quote: string | null; page: number | null; status: 'done' | 'empty' | 'error'; basis: 'full_text' | 'abstract' | 'none' | 'writer'; edited: boolean };
type MatrixForDocument = {
  title: string; archived?: boolean; columns: { id: string; label: string }[];
  rows: { paper: { title: string; authors: string[]; year: string | null; doi: string | null }; cells: Record<string, DocumentCell> }[];
};
const text = (value: string, bold = false) => value ? [{ type: 'text', text: value, styles: bold ? { bold: true } : {} }] : [];
const paragraph = (value: string) => ({ type: 'paragraph', content: text(value) });
const heading = (value: string, level: number) => ({ type: 'heading', props: { level }, content: text(value) });

function cellValue(cell?: DocumentCell) {
  if (!cell) return 'Not yet extracted';
  if (cell.status === 'error') return cell.value ? `Unverified extraction: ${cell.value}` : 'Extraction unavailable or unverified';
  if (cell.value) return cell.value;
  return cell.status === 'empty' ? 'Not reported in the available text' : 'No saved value';
}

/** Existing BlockNote handoff, with a readable appendix linking every value to its saved evidence. */
export function matrixDocumentBlocks(matrix: MatrixForDocument) {
  const reference = (paper: MatrixForDocument['rows'][number]['paper']) => [paper.authors.join('; '), paper.year ? `(${paper.year})` : '', paper.title, paper.doi ? `DOI: ${paper.doi}` : 'DOI unavailable'].filter(Boolean).join('. ');
  return [
    heading(matrix.title, 1),
    paragraph(`Literature review matrix of ${matrix.rows.length} papers. Saved quotations and page references are included in the evidence appendix. Check each interpretation against its source before citing it.${matrix.archived ? ' This is an archived project snapshot.' : ''}`),
    {
      type: 'table', content: {
        type: 'tableContent', rows: [
          { cells: [text('Paper', true), ...matrix.columns.map((column) => text(column.label, true))] },
          ...matrix.rows.map((row, index) => ({ cells: [text(`[${index + 1}] ${reference(row.paper)}`), ...matrix.columns.map((column) => text(cellValue(row.cells[column.id])))] })),
        ],
      },
    },
    heading('Evidence appendix', 1),
    ...matrix.rows.flatMap((row, index) => [
      heading(`[${index + 1}] ${row.paper.title}`, 2), paragraph(reference(row.paper)),
      ...matrix.columns.flatMap((column) => {
        const cell = row.cells[column.id];
        const basis = cell?.edited || cell?.basis === 'writer' ? 'Writer-entered text' : cell?.basis === 'abstract' ? 'Abstract' : cell?.basis === 'full_text' ? 'Full text' : 'Source text unavailable';
        return [heading(column.label, 3), paragraph(`Value: ${cellValue(cell)}`),
          paragraph(cell?.quote ? `Supporting quotation: ${cell.quote}` : 'Supporting quotation: not recorded'),
          paragraph(`Source basis: ${basis}. ${cell?.page != null ? `Page ${cell.page}.` : 'Page unavailable.'}`),
        ];
      }),
    ]),
  ];
}
