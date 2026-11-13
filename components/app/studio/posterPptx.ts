'use client';

/**
 * A poster as one large PowerPoint slide at its print size (pptxgenjs, in the browser): a title
 * band, then the blocks in balanced columns, each with a heading bar, its text and bullets;
 * suggested figures as dashed placeholder boxes; the numbered references in the last column.
 * The body font is sized so the fullest column fits.
 */
import type { Source } from '@/components/app/research/parts';
import { POSTER_SIZES, posterColumns, posterSize, type Poster } from '@/lib/server/lib/posterModule';
import { blockWeight, numberCitations, posterBlocks, posterFileName, splitColumns, type PosterBlock } from './poster';

// The deck's ink-and-paper colours (pptx.ts).
const INK = '1C1917';
const BRAND = '1E3A5F';
const ACCENT = 'C2410C';
const PAPER = 'FFFDF9';
const MUTED = '78716C';
const LINE = 'D6D0C7';

export async function downloadPosterPptx(poster: Poster, sources: Source[], inputs: { size?: string; layout?: string }) {
  const { default: PptxGenJS } = await import('pptxgenjs');
  const size = POSTER_SIZES[posterSize(inputs.size)];
  const { poster: numbered, references } = numberCitations(poster, sources);
  const columns = splitColumns(posterBlocks(numbered, references), posterColumns(inputs.layout), blockWeight).filter((column) => column.length);

  const W = size.width;
  const H = size.height;
  const s = Math.min(W, H) / 33.11; // 1 on A0 portrait
  const margin = 0.8 * s;
  const gap = 0.5 * s;
  const header = Math.max(4.2 * s, H * 0.12);
  const bar = 1.15 * s;
  const columnWidth = (W - 2 * margin - (columns.length - 1) * gap) / columns.length;
  const columnTop = header + margin;
  const columnHeight = H - columnTop - margin;

  // The largest body size at which the fullest column's text fits its boxes (about 0.5 em a character, 1.3 em a line).
  const fits = columns.map((blocks) => {
    const textHeight = columnHeight - blocks.length * (bar + gap);
    const chars = blocks.reduce((sum, block) => sum + blockWeight(block), 0);
    return Math.sqrt(((columnWidth - 0.4 * s) * 72 * Math.max(1, textHeight) * 72) / (0.5 * 1.3 * 1.35 * chars));
  });
  const body = Math.round(Math.max(14 * s, Math.min(34 * s, ...fits)));

  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'POSTER', width: W, height: H });
  pptx.layout = 'POSTER';
  pptx.title = numbered.title;
  const slide = pptx.addSlide();
  slide.background = { color: PAPER };

  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: header, fill: { color: BRAND }, line: { color: BRAND } });
  slide.addText(numbered.title, { x: margin, y: 0.35 * header - 0.2 * s, w: W - 2 * margin, h: header * 0.45, fontFace: 'Georgia', fontSize: Math.round(84 * s), bold: true, color: 'FFFFFF', valign: 'middle', fit: 'shrink' });
  slide.addText([
    { text: numbered.authors, options: { fontSize: Math.round(40 * s), bold: true, breakLine: true } },
    { text: [numbered.affiliations, numbered.contact].filter(Boolean).join('  ·  '), options: { fontSize: Math.round(30 * s) } },
  ], { x: margin, y: header * 0.62, w: W - 2 * margin, h: header * 0.32, color: 'DBE3EE', valign: 'top' });

  columns.forEach((blocks, index) => {
    const x = margin + index * (columnWidth + gap);
    const total = blocks.reduce((sum, block) => sum + blockWeight(block), 0);
    const free = columnHeight - blocks.length * bar - (blocks.length - 1) * gap;
    let y = columnTop;
    for (const block of blocks) {
      const height = bar + (free * blockWeight(block)) / total;
      addBlock(slide, pptx, block, { x, y, w: columnWidth, h: height, bar, body, s });
      y += height + gap;
    }
  });

  await pptx.writeFile({ fileName: `${posterFileName(numbered.title)}.pptx` });
}

type Box = { x: number; y: number; w: number; h: number; bar: number; body: number; s: number };

function addBlock(slide: any, pptx: any, block: PosterBlock, box: Box) {
  const { x, y, w, h, bar, body, s } = box;
  const heading = block.kind === 'section' ? block.section.heading : block.kind === 'figure' ? `Figure: ${block.figure.title || 'Key figure'}` : 'References';
  slide.addShape(pptx.ShapeType.rect, { x, y, w, h: bar, fill: { color: block.kind === 'figure' ? ACCENT : BRAND }, line: { color: block.kind === 'figure' ? ACCENT : BRAND } });
  slide.addText(heading, { x: x + 0.25 * s, y, w: w - 0.5 * s, h: bar, fontFace: 'Georgia', fontSize: Math.round(Math.max(body * 1.35, 30 * s)), bold: true, color: 'FFFFFF', valign: 'middle', fit: 'shrink' });
  const inner = { x: x + 0.2 * s, y: y + bar + 0.15 * s, w: w - 0.4 * s, h: Math.max(0.5, h - bar - 0.25 * s) };
  slide.addShape(pptx.ShapeType.rect, { x, y: y + bar, w, h: h - bar, fill: { color: 'FFFFFF' }, line: { color: LINE, width: 1 } });

  if (block.kind === 'figure') {
    slide.addShape(pptx.ShapeType.rect, { ...inner, fill: { color: PAPER }, line: { color: MUTED, width: 1.5, dashType: 'dash' } });
    slide.addText(block.figure.description || 'Figure to add', { ...inner, fontSize: body, italic: true, color: MUTED, align: 'center', valign: 'middle', fit: 'shrink' });
    return;
  }
  if (block.kind === 'references') {
    slide.addText(block.references.map((line, index) => ({ text: `[${index + 1}] ${line}`, options: { breakLine: true, paraSpaceAfter: 4 } })), {
      ...inner, fontSize: Math.max(10, Math.round(body * 0.6)), color: INK, valign: 'top', fit: 'shrink',
    });
    return;
  }
  const runs: any[] = [];
  if (block.section.text) runs.push({ text: block.section.text, options: { breakLine: true, paraSpaceAfter: Math.round(body * 0.4) } });
  block.section.bullets.forEach((bullet) => runs.push({ text: bullet, options: { bullet: { code: '25A0' }, breakLine: true, paraSpaceAfter: Math.round(body * 0.3) } }));
  slide.addText(runs, { ...inner, fontSize: body, color: INK, valign: 'top', fit: 'shrink' });
}
