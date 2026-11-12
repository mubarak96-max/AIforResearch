/**
 * Text from a file someone attaches to a job (Deep Research, Reviewer, Writing Studio…): PDF
 * through the converter's /pdf/text, Word .docx with mammoth here, older Word, .odt and .rtf
 * through the converter's /word/import, web pages and XML with their tags stripped, and Markdown,
 * plain text, CSV/TSV, JSON, LaTeX and BibTeX/RIS as they are. The file is not
 * stored; only its text goes into the job.
 */
import { HTTPException } from 'hono/http-exception';
import mammoth from 'mammoth';
import { env } from '../env.js';
import { serviceAuthHeaders } from './serviceAuth.js';

export const ATTACHMENT_TYPES = [
  'pdf', 'docx', 'doc', 'odt', 'rtf', 'md', 'markdown', 'txt', 'csv', 'tsv', 'json', 'html', 'htm', 'xml', 'tex', 'bib', 'ris',
] as const;
const MARKUP_TYPES = ['html', 'htm', 'xml'];

/** Readable text from HTML or XML: scripts, styles and tags dropped, common entities decoded. */
function markupText(source: string): string {
  return source
    .replace(/<(script|style|noscript|svg|head)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|div|section|article|li|tr|h[1-6]|blockquote|pre|table)>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n');
}

export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
/** Characters of text kept per file (about 30,000 words). */
export const MAX_ATTACHMENT_CHARS = 200_000;

export type ExtractionQuality = { status: string; ocr_pages: number[]; pages_without_text: number[]; ocr_languages: string[]; requires_review: boolean };
export type FileText = { name: string; kind: string; text: string; words: number; pages: { page: number; text: string }[] | null; truncated: boolean; warnings?: string[]; extraction?: ExtractionQuality };

const extensionOf = (name: string) => (name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? '');

/** Words in BlockNote blocks (the converter's Word import), in reading order. */
function blocksText(blocks: any[]): string {
  const out: string[] = [];
  const walk = (items: any[]) => {
    for (const block of items ?? []) {
      const content = Array.isArray(block?.content) ? block.content.map((part: any) => part?.text ?? '').join('') : '';
      if (block?.type === 'table') {
        for (const rowItem of block?.content?.rows ?? []) out.push((rowItem.cells ?? []).map((cell: any) => (Array.isArray(cell) ? cell : cell?.content ?? []).map((part: any) => part?.text ?? '').join('')).join(' | '));
      } else if (content.trim()) {
        out.push(block?.type === 'heading' ? `${'#'.repeat(Math.min(3, Number(block?.props?.level) || 1))} ${content}` : content);
      }
      if (Array.isArray(block?.children)) walk(block.children);
    }
  };
  walk(blocks);
  return out.join('\n\n');
}

const OCR_LANGUAGE_CODE = /^[A-Za-z0-9_]+(?:\/[A-Za-z0-9_]+)?$/;
export function checkedOcrLanguages(languages: string[]): string[] {
  if (languages.length > 8 || languages.some((code) => typeof code !== 'string' || !OCR_LANGUAGE_CODE.test(code))) {
    throw new HTTPException(422, { message: 'Choose up to eight available OCR languages.' });
  }
  return [...new Set(languages)];
}

async function converter(path: string, name: string, bytes: Uint8Array, type: string, ocrLanguages?: string[]) {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(bytes)], { type }), name);
  if (ocrLanguages?.length) form.append('ocr_languages', ocrLanguages.join('+'));
  const response = await fetch(`${env.convertUrl}${path}`, { method: 'POST', headers: await serviceAuthHeaders(env.convertUrl), body: form, signal: AbortSignal.timeout(180_000) }).catch(() => null);
  if (!response) throw new HTTPException(503, { message: 'The file reader is not available right now. Try again, or paste the text.' });
  if (!response.ok) {
    const body: any = await response.json().catch(() => null);
    throw new HTTPException(422, { message: (body && typeof body.detail === 'string' && body.detail) || 'This file could not be read.' });
  }
  return response.json() as Promise<any>;
}

/** Available local OCR packs, without downloading anything or exposing the converter address. */
export async function ocrCapabilities(): Promise<{ available: boolean; languages: string[]; default_languages: string[]; warning?: string }> {
  try {
    const response = await fetch(`${env.convertUrl}/pdf/ocr`, { headers: await serviceAuthHeaders(env.convertUrl), signal: AbortSignal.timeout(12_000) });
    const body: any = response.ok ? await response.json() : null;
    const clean = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && OCR_LANGUAGE_CODE.test(item)).slice(0, 300) : [];
    return { available: body?.available === true, languages: clean(body?.languages), default_languages: clean(body?.default_languages) };
  } catch {
    return { available: false, languages: [], default_languages: [], warning: 'Scanned-page recognition is unavailable right now.' };
  }
}

/**
 * `pageMarkers` prefixes each PDF page with [Page N] for callers that cite pages. It is opt-in so callers
 * that match quotations against the plain text are unaffected. Word counts never include the markers.
 */
export async function extractText(
  name: string, bytes: Uint8Array, options?: { ocrLanguages?: string[]; pageMarkers?: boolean },
): Promise<FileText> {
  const ocrLanguages = checkedOcrLanguages(options?.ocrLanguages ?? []);
  const kind = extensionOf(name);
  if (!(ATTACHMENT_TYPES as readonly string[]).includes(kind)) throw new HTTPException(415, { message: 'Attach a PDF, Word, Markdown, text, CSV, JSON, HTML, LaTeX or BibTeX file.' });
  if (bytes.byteLength > MAX_ATTACHMENT_BYTES) throw new HTTPException(413, { message: 'Files can be up to 25 MB.' });
  if (!bytes.byteLength) throw new HTTPException(422, { message: 'The file is empty.' });
  let text = '';
  let pages: FileText['pages'] = null;
  let warnings: string[] | undefined;
  let extraction: ExtractionQuality | undefined;
  if (kind === 'pdf') {
    const result = await converter('/pdf/text', 'document.pdf', bytes, 'application/pdf', ocrLanguages);
    pages = (result.pages ?? []).map((page: any) => ({ page: Number(page.page), text: String(page.text ?? '') }));
    warnings = Array.isArray(result.warnings) ? result.warnings.filter((warning: unknown) => typeof warning === 'string').slice(0, 250) : [];
    extraction = result.extraction && typeof result.extraction === 'object' ? result.extraction : undefined;
    if (!pages!.some((page) => page.text.trim())) throw new HTTPException(422, { message: warnings?.[0] || 'No text found in this PDF. Scanned pages need OCR with the document’s language.' });
    const kept = pages!.filter((page) => page.text.trim());
    text = kept.map((page) => (options?.pageMarkers ? `[Page ${page.page}]\n${page.text}` : page.text)).join('\n\n');
  } else if (kind === 'docx') {
    text = (await mammoth.extractRawText({ buffer: Buffer.from(bytes) })).value;
  } else if (kind === 'doc' || kind === 'odt' || kind === 'rtf') {
    const result = await converter('/word/import', name, bytes, 'application/octet-stream');
    text = blocksText(result.blocks ?? []);
  } else if (MARKUP_TYPES.includes(kind)) {
    text = markupText(new TextDecoder('utf-8').decode(bytes));
  } else {
    text = new TextDecoder('utf-8').decode(bytes);
  }
  text = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const truncated = text.length > MAX_ATTACHMENT_CHARS;
  if (truncated) text = text.slice(0, MAX_ATTACHMENT_CHARS);
  const words = (text.replace(/\[Page \d+\]/g, ' ').match(/\S+/g) || []).length;
  return { name, kind, text, words, pages, truncated, ...(warnings ? { warnings } : {}), ...(extraction ? { extraction } : {}) };
}
