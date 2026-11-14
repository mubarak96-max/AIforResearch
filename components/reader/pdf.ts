/** pdf.js for the reader, loaded in the browser only; plus the geometry of selections and highlights. */
import type { PDFDocumentProxy } from 'pdfjs-dist';

export type Rect = { x: number; y: number; w: number; h: number };
export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink';
export type ProjectLink = { project_id: string; source_id: string; finding_id: string; project_name?: string | null; status?: string | null };
export type MatrixLink = { matrix_id: string; column_id: string };
export type Highlight = {
  id: string; page: number; quote: string; note: string; color: HighlightColor; rects: Rect[]; verified: boolean;
  created_at: string; updated_at: string; project_links: ProjectLink[]; matrix_links: MatrixLink[];
};

export const COLORS: { value: HighlightColor; label: string; fill: string; dot: string }[] = [
  { value: 'yellow', label: 'Yellow', fill: 'rgb(250 204 21 / 0.38)', dot: '#facc15' },
  { value: 'green', label: 'Green', fill: 'rgb(74 222 128 / 0.36)', dot: '#4ade80' },
  { value: 'blue', label: 'Blue', fill: 'rgb(96 165 250 / 0.36)', dot: '#60a5fa' },
  { value: 'pink', label: 'Pink', fill: 'rgb(244 114 182 / 0.36)', dot: '#f472b6' },
];
export const colorOf = (value: HighlightColor) => COLORS.find((color) => color.value === value) ?? COLORS[0];

type PdfJs = typeof import('pdfjs-dist');
let loaded: Promise<PdfJs> | null = null;

/** pdf.js with its worker; the worker file is bundled next to the page. */
export function loadPdfJs(): Promise<PdfJs> {
  loaded ??= import('pdfjs-dist').then((pdfjs) => {
    if (!pdfjs.GlobalWorkerOptions.workerSrc) pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
    return pdfjs;
  });
  return loaded;
}

/**
 * Opens the PDF bytes. When the worker file cannot be loaded (a bundler that leaves the worker URL
 * unresolved), pdf.js runs on the page instead: slower for big files, but the paper still opens.
 */
export async function openPdf(bytes: ArrayBuffer): Promise<PDFDocumentProxy> {
  const pdfjs = await loadPdfJs();
  const cdn = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}`;
  const options = { cMapUrl: `${cdn}/cmaps/`, cMapPacked: true, standardFontDataUrl: `${cdn}/standard_fonts/`, isEvalSupported: false };
  try {
    return await pdfjs.getDocument({ ...options, data: new Uint8Array(bytes.slice(0)) }).promise;
  } catch (error) {
    if (!/worker/i.test(String((error as Error)?.message ?? error))) throw error;
    await import('pdfjs-dist/build/pdf.worker.min.mjs');
    return pdfjs.getDocument({ ...options, data: new Uint8Array(bytes) }).promise;
  }
}

/** Client rects of a selection as fractions of the page box, one rect per line where possible. */
export function selectionRects(range: Range, page: DOMRect): Rect[] {
  const boxes = [...range.getClientRects()]
    .map((box) => ({
      left: Math.max(box.left, page.left), right: Math.min(box.right, page.right),
      top: Math.max(box.top, page.top), bottom: Math.min(box.bottom, page.bottom),
    }))
    .filter((box) => box.right - box.left > 1 && box.bottom - box.top > 1)
    .sort((a, b) => a.top - b.top || a.left - b.left);
  const lines: typeof boxes = [];
  for (const box of boxes) {
    const line = lines.find((item) => {
      const overlap = Math.min(item.bottom, box.bottom) - Math.max(item.top, box.top);
      return overlap > 0.5 * Math.min(item.bottom - item.top, box.bottom - box.top) && box.left <= item.right + 6 && box.right >= item.left - 6;
    });
    if (line) Object.assign(line, { left: Math.min(line.left, box.left), right: Math.max(line.right, box.right), top: Math.min(line.top, box.top), bottom: Math.max(line.bottom, box.bottom) });
    else lines.push({ ...box });
  }
  const clamp = (value: number) => Math.min(1, Math.max(0, value));
  return lines.slice(0, 60).map((box) => ({
    x: clamp((box.left - page.left) / page.width), y: clamp((box.top - page.top) / page.height),
    w: clamp((box.right - box.left) / page.width), h: clamp((box.bottom - box.top) / page.height),
  }));
}

export const STATUS_LABELS: Record<string, string> = { needs_review: 'needs review', needs_revision: 'needs revision', approved: 'approved' };
