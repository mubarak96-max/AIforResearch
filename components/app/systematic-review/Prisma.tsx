'use client';

/**
 * The PRISMA 2020 flow diagram, drawn from the review's own counts as SVG (so it can be saved
 * as SVG or PNG for the paper). Colours are fixed black on white: it goes into documents.
 */
import { forwardRef } from 'react';
import type { Prisma } from './types';

const W = 760;
const BOX = 300;
const LEFT = 30;
const RIGHT = 430;
const LINE = 17;

function wrap(text: string, max = 44): string[] {
  const words = text.split(/\s+/);
  const out: string[] = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > max) { if (line) out.push(line); line = word; } else line = `${line} ${word}`.trim();
  }
  if (line) out.push(line);
  return out;
}

type Box = { x: number; y: number; lines: string[] };
const height = (box: Box) => 20 + box.lines.length * LINE;

export const PrismaDiagram = forwardRef<SVGSVGElement, { prisma: Prisma }>(function PrismaDiagram({ prisma }, ref) {
  const n = (value: number) => value.toLocaleString('en-US');
  const identified: Box = { x: LEFT, y: 50, lines: [`Records identified (n = ${n(prisma.identified_total)})`, ...prisma.identified.slice(0, 8).flatMap((item) => wrap(`${item.source} (n = ${n(item.count)})`))] };
  const removed: Box = { x: RIGHT, y: 50, lines: ['Records removed before screening:', `Duplicate records (n = ${n(prisma.duplicates)})`] };
  const y2 = identified.y + Math.max(height(identified), height(removed)) + 40;
  const screened: Box = { x: LEFT, y: y2, lines: [`Records screened (n = ${n(prisma.screened)})`, ...(prisma.awaiting_title || prisma.conflicts_title ? [`Not yet decided (n = ${n(prisma.awaiting_title + prisma.conflicts_title)})`] : [])] };
  const excluded: Box = { x: RIGHT, y: y2, lines: [`Records excluded (n = ${n(prisma.excluded_title)})`] };
  const y3 = y2 + Math.max(height(screened), height(excluded)) + 40;
  const sought: Box = { x: LEFT, y: y3, lines: [`Reports sought for retrieval (n = ${n(prisma.sought)})`] };
  const notRetrieved: Box = { x: RIGHT, y: y3, lines: [`Reports not retrieved (n = ${n(prisma.not_retrieved ?? 0)})`, `Awaiting a decision (n = ${n(prisma.awaiting_full + prisma.conflicts_full)})`] };
  const y4 = y3 + Math.max(height(sought), height(notRetrieved)) + 40;
  const assessed: Box = { x: LEFT, y: y4, lines: [`Reports assessed for eligibility (n = ${n(prisma.assessed)})`] };
  const reasons: Box = { x: RIGHT, y: y4, lines: [`Reports excluded (n = ${n(prisma.excluded_full_total)})`, ...prisma.excluded_full.slice(0, 10).flatMap((item) => wrap(`${item.reason} (n = ${n(item.count)})`))] };
  const y5 = y4 + Math.max(height(assessed), height(reasons)) + 40;
  const included: Box = { x: LEFT, y: y5, lines: [`Reports included in review (n = ${n(prisma.included)})`] };
  const total = y5 + height(included) + 30;
  const boxes = [identified, removed, screened, excluded, sought, notRetrieved, assessed, reasons, included];
  const down = (from: Box, to: Box) => ({ x1: LEFT + BOX / 2, y1: from.y + height(from), x2: LEFT + BOX / 2, y2: to.y });
  const across = (from: Box, to: Box) => ({ x1: LEFT + BOX, y1: from.y + 22, x2: RIGHT, y2: to.y + 22 });
  const arrows = [down(identified, screened), down(screened, sought), down(sought, assessed), down(assessed, included), across(identified, removed), across(screened, excluded), across(sought, notRetrieved), across(assessed, reasons)];

  return (
    <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${total}`} width="100%" role="img" aria-label="PRISMA 2020 flow diagram" style={{ background: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <defs><marker id="prisma-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 10 5 0 10z" fill="#1c1917" /></marker></defs>
      <rect width={W} height={total} fill="#ffffff" />
      <text x={LEFT} y={30} fontSize="15" fontWeight="700" fill="#1c1917">Records from databases, registers and other sources</text>
      {arrows.map((arrow, index) => <line key={index} {...arrow} stroke="#1c1917" strokeWidth="1.4" markerEnd="url(#prisma-arrow)" />)}
      {boxes.map((box, index) => (
        <g key={index}>
          <rect x={box.x} y={box.y} width={BOX} height={height(box)} fill="#ffffff" stroke="#1c1917" strokeWidth="1.2" rx="3" />
          {box.lines.map((line, at) => (
            <text key={at} x={box.x + 12} y={box.y + 22 + at * LINE} fontSize="13" fill="#1c1917" fontWeight={at === 0 ? 700 : 400}>{line}</text>
          ))}
        </g>
      ))}
    </svg>
  );
});

/** Saves the diagram as an SVG file, or as a PNG at twice its size. */
export async function downloadPrisma(svg: SVGSVGElement, format: 'svg' | 'png', name: string) {
  const markup = new XMLSerializer().serializeToString(svg);
  const save = (blob: Blob, extension: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name}-prisma.${extension}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  if (format === 'svg') { save(new Blob([markup], { type: 'image/svg+xml' }), 'svg'); return; }
  const box = svg.viewBox.baseVal;
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; });
  const canvas = document.createElement('canvas');
  canvas.width = box.width * 2;
  canvas.height = box.height * 2;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  canvas.toBlob((blob) => { if (blob) save(blob, 'png'); }, 'image/png');
}
