/**
 * Document converter (/convert): a PDF, Word (.docx) or PowerPoint (.pptx) file as Markdown.
 * PDFs go through the converter service (fileText.ts, CONVERT_URL); Word through mammoth;
 * PowerPoint is read here from its slide XML (titles, bullets with their levels, tables and
 * speaker notes). Nothing is stored.
 */
import { HTTPException } from 'hono/http-exception';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import { extractText } from './fileText.js';

export const CONVERT_TYPES = ['pdf', 'docx', 'pptx'] as const;
export type ConvertType = (typeof CONVERT_TYPES)[number];
/** The most any plan converts at once; plans with a smaller upload size stop earlier (checkUploadSize). */
export const MAX_CONVERT_BYTES = 50 * 1024 * 1024;
/** Characters of Markdown kept (about 75,000 words). */
export const MAX_MARKDOWN_CHARS = 500_000;

export type Converted = { title: string; kind: ConvertType; markdown: string; words: number; truncated: boolean; warnings: string[] };

/** The file's type from its name, or null when the converter does not take it. */
export function convertType(name: string): ConvertType | null {
  const extension = name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? '';
  return (CONVERT_TYPES as readonly string[]).includes(extension) ? extension as ConvertType : null;
}

/** Checks a file before any work: a supported type whose bytes look like it (a PDF header, or a zip for Office files). */
export function checkConvertFile(name: string, bytes: Uint8Array): ConvertType {
  const kind = convertType(name);
  if (!kind) throw new HTTPException(415, { message: 'Choose a PDF, Word (.docx) or PowerPoint (.pptx) file.' });
  if (!bytes.byteLength) throw new HTTPException(422, { message: 'The file is empty.' });
  if (bytes.byteLength > MAX_CONVERT_BYTES) throw new HTTPException(413, { message: `Files can be up to ${MAX_CONVERT_BYTES / 1024 / 1024} MB.` });
  const head = new TextDecoder('latin1').decode(bytes.slice(0, 1024));
  if (kind === 'pdf' && !head.includes('%PDF-')) throw new HTTPException(422, { message: 'This is not a PDF file.' });
  if (kind !== 'pdf' && !head.startsWith('PK')) {
    throw new HTTPException(422, { message: kind === 'docx' ? 'This is not a .docx file. Older .doc files: save as .docx in Word first.' : 'This is not a .pptx file. Older .ppt files: save as .pptx in PowerPoint first.' });
  }
  return kind;
}

const decodeXml = (text: string) => text
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
  .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
  .replace(/&amp;/g, '&');

/** The text of each <a:p> paragraph in a piece of DrawingML, with its list level. */
export function drawingParagraphs(xml: string): { text: string; level: number }[] {
  return [...xml.matchAll(/<a:p>([\s\S]*?)<\/a:p>|<a:p\s[^>]*>([\s\S]*?)<\/a:p>/g)].map((match) => {
    const body = match[1] ?? match[2] ?? '';
    const level = Number(body.match(/<a:pPr[^>]*\slvl="(\d+)"/)?.[1] ?? 0);
    const text = [...body.matchAll(/<a:t>([\s\S]*?)<\/a:t>|<a:t\s[^>]*>([\s\S]*?)<\/a:t>|<a:br\s*\/>/g)]
      .map((part) => (part[0].startsWith('<a:br') ? ' ' : decodeXml(part[1] ?? part[2] ?? ''))).join('');
    return { text: text.replace(/\s+/g, ' ').trim(), level };
  }).filter((paragraph) => paragraph.text);
}

const cellText = (text: string) => text.replace(/\|/g, '\\|');

/** One slide's XML as Markdown: "## Slide N: title", body paragraphs as bullets by level, tables as Markdown tables. */
export function slideMarkdown(xml: string, number: number, notes = ''): string {
  let title = '';
  const lines: string[] = [];
  // Shapes and tables in document order.
  for (const match of xml.matchAll(/<p:sp>[\s\S]*?<\/p:sp>|<p:graphicFrame>[\s\S]*?<\/p:graphicFrame>/g)) {
    const part = match[0];
    if (part.startsWith('<p:graphicFrame')) {
      const rows = [...part.matchAll(/<a:tr[\s>][\s\S]*?<\/a:tr>/g)].map((row) => [...row[0].matchAll(/<a:tc[\s>][\s\S]*?<\/a:tc>/g)].map((cell) => cellText(drawingParagraphs(cell[0]).map((p) => p.text).join(' '))));
      if (rows.length && rows[0].length) {
        const width = Math.max(...rows.map((row) => row.length));
        const pad = (row: string[]) => [...row, ...Array(width - row.length).fill('')];
        lines.push('', `| ${pad(rows[0]).join(' | ')} |`, `| ${Array(width).fill('---').join(' | ')} |`, ...rows.slice(1).map((row) => `| ${pad(row).join(' | ')} |`), '');
      }
      continue;
    }
    const paragraphs = drawingParagraphs(part);
    if (!paragraphs.length) continue;
    if (!title && /<p:ph[^>]*type="(?:title|ctrTitle)"/.test(part)) {
      title = paragraphs.map((p) => p.text).join(' ');
      continue;
    }
    const isBody = !/<p:ph[^>]*type="(?:subTitle|sldNum|dt|ftr)"/.test(part);
    if (/<p:ph[^>]*type="(?:sldNum|dt|ftr)"/.test(part)) continue;
    for (const paragraph of paragraphs) lines.push(isBody ? `${'  '.repeat(Math.min(paragraph.level, 4))}- ${paragraph.text}` : paragraph.text);
  }
  const out = [`## Slide ${number}${title ? `: ${title}` : ''}`, '', ...lines];
  if (notes.trim()) out.push('', `> **Notes:** ${notes.trim()}`);
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** A .pptx file as Markdown, slide by slide in presentation order. */
export async function pptxMarkdown(bytes: Uint8Array): Promise<{ markdown: string; warnings: string[] }> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch {
    throw new HTTPException(422, { message: 'This PowerPoint file could not be read.' });
  }
  const read = async (path: string) => (await zip.file(path)?.async('string')) ?? '';
  // Presentation order from presentation.xml and its relationships; file-name order otherwise.
  const presentation = await read('ppt/presentation.xml');
  const rels = await read('ppt/_rels/presentation.xml.rels');
  const targets = new Map([...rels.matchAll(/<Relationship\s[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)].map((match) => [match[1], match[2]]));
  let slides = [...presentation.matchAll(/<p:sldId\s[^>]*r:id="([^"]+)"/g)].map((match) => targets.get(match[1])).filter((target): target is string => Boolean(target)).map((target) => `ppt/${target.replace(/^\/?ppt\//, '').replace(/^\.\.\//, '')}`);
  if (!slides.length) {
    slides = Object.keys(zip.files).filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path)).sort((a, b) => Number(a.match(/(\d+)\.xml$/)![1]) - Number(b.match(/(\d+)\.xml$/)![1]));
  }
  if (!slides.length) throw new HTTPException(422, { message: 'No slides found in this PowerPoint file.' });
  const parts: string[] = [];
  for (const [index, path] of slides.slice(0, 500).entries()) {
    const xml = await read(path);
    const slideRels = await read(path.replace(/slides\/(slide\d+\.xml)$/, 'slides/_rels/$1.rels'));
    const notesTarget = slideRels.match(/Target="\.\.\/notesSlides\/(notesSlide\d+\.xml)"/)?.[1];
    const notesXml = notesTarget ? await read(`ppt/notesSlides/${notesTarget}`) : '';
    // The notes body placeholder only (not the slide image or the slide number).
    const notes = [...notesXml.matchAll(/<p:sp>[\s\S]*?<\/p:sp>/g)].filter((shape) => /<p:ph[^>]*type="body"/.test(shape[0])).flatMap((shape) => drawingParagraphs(shape[0]).map((p) => p.text)).join(' ');
    parts.push(slideMarkdown(xml, index + 1, notes));
  }
  return { markdown: parts.join('\n\n'), warnings: slides.length > 500 ? ['Only the first 500 slides were converted.'] : [] };
}

/** A .docx file as Markdown (headings, lists, tables, bold and italic; images left out). */
export async function docxMarkdown(bytes: Uint8Array): Promise<{ markdown: string; warnings: string[] }> {
  try {
    const convert = (mammoth as unknown as { convertToMarkdown: typeof mammoth.convertToHtml }).convertToMarkdown;
    const result = await convert({ buffer: Buffer.from(bytes) }, { convertImage: mammoth.images.imgElement(async () => ({ src: '' })) });
    const markdown = result.value.replace(/!\[[^\]]*\]\(\)/g, '').replace(/<a id="[^"]*"><\/a>/g, '');
    const images = (result.value.match(/!\[[^\]]*\]\(\)/g) || []).length;
    return { markdown, warnings: images ? [`${images} image${images === 1 ? ' was' : 's were'} left out.`] : [] };
  } catch {
    throw new HTTPException(422, { message: 'This Word file could not be read. Save it again as .docx and try once more.' });
  }
}

/** PDF text (through the converter service) as Markdown paragraphs; bullet characters become list items. */
export function pdfPagesMarkdown(pages: { page: number; text: string }[]): string {
  return pages.filter((page) => page.text.trim()).map((page) => page.text
    .replace(/\r\n/g, '\n')
    .replace(/^[ \t]*[•●▪◦‣∙·][ \t]*/gm, '- ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()).join('\n\n---\n\n');
}

/** The file as Markdown. Callers check the type and size first (checkConvertFile, the plan's upload size). */
export async function convertToMarkdown(name: string, bytes: Uint8Array): Promise<Converted> {
  const kind = checkConvertFile(name, bytes);
  let markdown = '';
  let warnings: string[] = [];
  if (kind === 'pdf') {
    const result = await extractText(name, bytes);
    markdown = pdfPagesMarkdown(result.pages ?? [{ page: 1, text: result.text }]);
    warnings = result.warnings ?? [];
  } else if (kind === 'docx') {
    ({ markdown, warnings } = await docxMarkdown(bytes));
  } else {
    ({ markdown, warnings } = await pptxMarkdown(bytes));
  }
  markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();
  if (!markdown) throw new HTTPException(422, { message: 'No text found in this file.' });
  const truncated = markdown.length > MAX_MARKDOWN_CHARS;
  if (truncated) markdown = markdown.slice(0, MAX_MARKDOWN_CHARS);
  const title = name.replace(/\.[a-z0-9]+$/i, '').replace(/[_]+/g, ' ').trim().slice(0, 200) || 'Converted document';
  return { title, kind, markdown, words: (markdown.match(/\S+/g) || []).length, truncated, warnings };
}
