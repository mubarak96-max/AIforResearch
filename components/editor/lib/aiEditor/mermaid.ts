'use client';

import { getAuthHeader } from '../../utils/auth/api';
import { notePlanLimit } from '../planLimit';

/**
 * Mermaid for the diagram block: loaded on first use (a dynamic import, so the editor bundle
 * does not carry it), rendered one diagram at a time, and exported as SVG or PNG. Labels are SVG
 * text (no HTML labels), so a PNG can be drawn from the SVG on a canvas. Word and PDF exports get
 * each diagram as a PNG image block.
 */

type Mermaid = typeof import('mermaid').default;
let loading: Promise<Mermaid> | null = null;

export function loadMermaid(): Promise<Mermaid> {
  if (!loading) {
    loading = import('mermaid').then(({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: 'neutral',
        htmlLabels: false,
        flowchart: { htmlLabels: false },
        fontFamily: 'Arial, Helvetica, sans-serif',
      } as Parameters<Mermaid['initialize']>[0]);
      return mermaid;
    }).catch((error) => {
      loading = null;
      throw error;
    });
  }
  return loading;
}

/** Checks the source with mermaid's own parser: null when it is a valid diagram, else the error. */
export async function mermaidError(source: string): Promise<string | null> {
  if (!source.trim()) return 'The diagram is empty.';
  const mermaid = await loadMermaid();
  try {
    await mermaid.parse(source);
    return null;
  } catch (error) {
    return String((error as Error)?.message || error).split('\n').slice(0, 4).join(' ').slice(0, 300);
  }
}

const rendered = new Map<string, string>();
let queue: Promise<unknown> = Promise.resolve();
let counter = 0;

/** The last SVG drawn for a source, if any (for copy and paste). */
export const cachedSvg = (source: string) => rendered.get(source) ?? '';

/** The diagram as SVG markup. Mermaid draws one diagram at a time, so calls wait their turn. */
export function renderMermaid(source: string): Promise<string> {
  const known = rendered.get(source);
  if (known) return Promise.resolve(known);
  const run = queue.then(async () => {
    const mermaid = await loadMermaid();
    counter += 1;
    const { svg } = await mermaid.render(`ce-mermaid-${Date.now().toString(36)}-${counter}`, source);
    if (rendered.size > 60) rendered.clear();
    rendered.set(source, svg);
    return svg;
  });
  queue = run.catch(() => undefined);
  return run;
}

/** The SVG's drawing size in pixels (from its viewBox, else its width and height). */
export function svgSize(svg: string): { width: number; height: number } {
  const box = svg.match(/viewBox="\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*"/);
  if (box) return { width: Math.max(1, Math.ceil(Number(box[1]))), height: Math.max(1, Math.ceil(Number(box[2]))) };
  const width = Number(svg.match(/<svg[^>]*\swidth="([\d.]+)/)?.[1]) || 800;
  const height = Number(svg.match(/<svg[^>]*\sheight="([\d.]+)/)?.[1]) || 600;
  return { width, height };
}

/** A standalone SVG file: explicit size, the XML namespace and no max-width style. */
export function standaloneSvg(svg: string): string {
  const { width, height } = svgSize(svg);
  let out = svg.replace(/<svg([^>]*)>/, (_, attributes: string) => {
    const kept = attributes.replace(/\s(width|height|style)="[^"]*"/g, '');
    return `<svg${kept} width="${width}" height="${height}">`;
  });
  if (!/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/.test(out)) out = out.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  return `<?xml version="1.0" encoding="UTF-8"?>\n${out}`;
}

/** The SVG drawn on a white canvas as PNG, at `scale` times its size. */
export async function svgToPng(svg: string, scale = 2): Promise<{ blob: Blob; width: number; height: number }> {
  const { width, height } = svgSize(svg);
  const image = new Image();
  image.decoding = 'async';
  const loaded = new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('The diagram could not be drawn as an image.'));
  });
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(standaloneSvg(svg).replace(/^<\?xml[^>]*>\s*/, ''))}`;
  await loaded;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width * scale);
  canvas.height = Math.ceil(height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('The diagram could not be drawn as an image.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('The diagram could not be drawn as an image.');
  return { blob, width, height };
}

export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadDiagram(source: string, format: 'svg' | 'png', name = 'diagram') {
  const svg = await renderMermaid(source);
  if (format === 'svg') saveBlob(new Blob([standaloneSvg(svg)], { type: 'image/svg+xml' }), `${name}.svg`);
  else saveBlob((await svgToPng(svg, 3)).blob, `${name}.png`);
}

const dataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

/**
 * The document's blocks with every diagram as a PNG image block (for Word and PDF export, which
 * know images but not Mermaid). A diagram that cannot be drawn becomes a short note. Documents
 * without diagrams come back unchanged, without loading mermaid.
 */
export async function blocksWithDiagramImages(blocks: any[]): Promise<any[]> {
  const has = (items: any[]): boolean => (items ?? []).some((block) => block?.type === 'mermaid' || has(block?.children ?? []));
  if (!has(blocks)) return blocks;
  const convert = async (items: any[]): Promise<any[]> => Promise.all((items ?? []).map(async (block) => {
    const children = block?.children?.length ? await convert(block.children) : block?.children ?? [];
    if (block?.type !== 'mermaid') return { ...block, children };
    const source = String(block.props?.source || '');
    try {
      const svg = await renderMermaid(source);
      const png = await svgToPng(svg, 2);
      return {
        id: block.id, type: 'image', children,
        props: { url: await dataUrl(png.blob), name: 'diagram.png', caption: '', showPreview: true, previewWidth: Math.min(640, png.width), textAlignment: 'center' },
      };
    } catch {
      return { id: block.id, type: 'paragraph', children, props: {}, content: [{ type: 'text', text: '[Diagram]', styles: { italic: true } }] };
    }
  }));
  // One diagram at a time: renderMermaid queues, so mapping in parallel stays safe.
  return convert(blocks);
}

export const DIAGRAM_KINDS: [string, string][] = [['flowchart', 'Flowchart'], ['framework', 'Conceptual framework'], ['study-flow', 'Study flow (CONSORT / PRISMA)'], ['timeline', 'Timeline']];

/** "Draw with AI": Mermaid source from a description (1 credit, returned if nothing usable comes back). */
export async function drawDiagramWithAI(prompt: string, kind: string): Promise<string> {
  const response = await fetch('/api/ai-editor/diagram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ prompt, kind }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = (body && typeof body.detail === 'string' && body.detail) || 'The diagram could not be drawn. Try again.';
    if (response.status === 402) notePlanLimit(message, true);
    throw new Error(message);
  }
  return String(body?.source || '');
}
