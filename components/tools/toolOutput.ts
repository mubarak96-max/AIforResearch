/**
 * What the AI tools do with an answer: show [S1] markers as in-text citations that link to the
 * paper pages, build the HTML the editor imports (real, editable citations carrying BibTeX), and
 * make a plain-text copy with a reference list. Pure, for tests.
 */
import { bibtex, CITE_FORMATS, parseName, type CiteRecord } from '@/lib/scholarly/cite';

export type ResultSource = {
  marker: string;
  id: string;
  title: string;
  authors: string[];
  moreAuthors: number;
  year: number | null;
  venue: string | null;
  volume: string | null;
  issue: string | null;
  firstPage: string | null;
  lastPage: string | null;
  doi: string | null;
  type: string | null;
};

export type StyleId = 'apa' | 'mla' | 'chicago' | 'harvard';

/** The editor's CSL style ids for the tools' four styles. */
export const EDITOR_STYLE: Record<StyleId, string> = {
  apa: 'apa',
  mla: 'modern-language-association',
  chicago: 'chicago-author-date',
  harvard: 'harvard-cite-them-right',
};

export function toCiteRecord(source: ResultSource): CiteRecord {
  return { ...source };
}

/** "Smith, 2020", "Smith & Lee, 2020", "Smith et al., 2020"; MLA drops the year, Chicago the comma. */
export function inTextLabel(source: ResultSource, style: StyleId = 'apa'): string {
  const families = source.authors.map((name) => parseName(name).family);
  const and = style === 'apa' ? '&' : 'and';
  const who = families.length === 0 ? (source.title.split(/\s+/).slice(0, 3).join(' ') || 'Anon.')
    : families.length === 1 && !source.moreAuthors ? families[0]
      : families.length === 2 && !source.moreAuthors ? `${families[0]} ${and} ${families[1]}`
        : `${families[0]} et al.`;
  const year = source.year ? String(source.year) : 'n.d.';
  if (style === 'mla') return who;
  if (style === 'chicago') return `${who} ${year}`;
  return `${who}, ${year}`;
}

const MARKERS = /\[((?:S\d+\s*[,;]?\s*)+)\]/g;

function markerList(inner: string, sources: Map<string, ResultSource>) {
  return inner.split(/[,;]/).map((part) => sources.get(part.trim())).filter((s): s is ResultSource => Boolean(s));
}

/** Markers -> "([Smith, 2020](/research/papers/W1); [Lee, 2019](/research/papers/W2))" for display. */
export function linkMarkers(markdown: string, sources: ResultSource[], style: StyleId = 'apa'): string {
  const byMarker = new Map(sources.map((source) => [source.marker, source]));
  return markdown.replace(MARKERS, (whole, inner: string) => {
    const cited = markerList(inner, byMarker);
    if (!cited.length) return '';
    return `(${cited.map((source) => `[${inTextLabel(source, style)}](/research/papers/${source.id})`).join('; ')})`;
  });
}

/** Markers -> "(Smith, 2020; Lee, 2019)" for plain text. */
export function plainMarkers(markdown: string, sources: ResultSource[], style: StyleId = 'apa'): string {
  const byMarker = new Map(sources.map((source) => [source.marker, source]));
  return markdown.replace(MARKERS, (_whole, inner: string) => {
    const cited = markerList(inner, byMarker);
    return cited.length ? `(${cited.map((source) => inTextLabel(source, style)).join('; ')})` : '';
  });
}

/** The reference list, formatted in the style, in order of first citation. */
export function referenceList(sources: ResultSource[], style: StyleId = 'apa'): string[] {
  const format = CITE_FORMATS.find((item) => item.id === style) ?? CITE_FORMATS[0];
  return sources.map((source) => format.format(toCiteRecord(source)));
}

const stripMarks = (text: string) => text.replace(/\*\*([^*]+)\*\*|\*([^*]+)\*|\^\^([^^]+)\^\^/g, (_, a, b, c) => a ?? b ?? c);

/** Plain text for the clipboard: the answer with readable citations, then the references. */
export function plainText(markdown: string, sources: ResultSource[], style: StyleId = 'apa'): string {
  const body = plainMarkers(markdown, sources, style)
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1$2');
  if (!sources.length) return body.trim();
  const heading = style === 'mla' ? 'Works Cited' : style === 'chicago' ? 'Bibliography' : 'References';
  return `${body.trim()}\n\n${heading}\n\n${referenceList(sources, style).map(stripMarks).join('\n')}`;
}

// ------------------------------------------------------------------ Markdown -> HTML (editor import)

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Inline marks on already-escaped text: **bold**, *italic*, `code`, [text](url). Placeholders \u0000n\u0000 pass through. */
function inline(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
}

const isTableRow = (line: string) => /^\s*\|.*\|\s*$/.test(line);
const isTableRule = (line: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);
const cells = (line: string) => {
  const input = line.trim().replace(/^\||\|$/g, '');
  const values: string[] = []; let value = '';
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (char === '\\' && (input[index + 1] === '|' || input[index + 1] === '\\')) { value += input[index + 1]; index += 1; }
    else if (char === '|') { values.push(value.trim()); value = ''; }
    else value += char;
  }
  values.push(value.trim());
  return values;
};

/**
 * The Markdown the tools produce, as HTML: headings, paragraphs, bullet and numbered lists, tables,
 * bold, italic, code and links. Enough for the editor's HTML import; not a general converter.
 */
export function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  let paragraph: string[] = [];
  let list: { tag: 'ul' | 'ol'; items: string[] } | null = null;
  const flushParagraph = () => {
    if (paragraph.length) out.push(`<p>${inline(paragraph.join(' '))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (list) out.push(`<${list.tag}>${list.items.map((item) => `<li>${inline(item)}</li>`).join('')}</${list.tag}>`);
    list = null;
  };
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    const bullet = /^\s*[-*+]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (!line.trim()) { flushParagraph(); flushList(); continue; }
    if (heading) {
      flushParagraph(); flushList();
      const level = Math.min(3, heading[1].length);
      out.push(`<h${level}>${inline(heading[2].trim())}</h${level}>`);
      continue;
    }
    if (isTableRow(line) && i + 1 < lines.length && isTableRule(lines[i + 1])) {
      flushParagraph(); flushList();
      const head = cells(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && isTableRow(lines[i])) rows.push(cells(lines[i++]));
      i -= 1;
      out.push(`<table><thead><tr>${head.map((cell) => `<th>${inline(cell)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
      continue;
    }
    if (bullet || numbered) {
      flushParagraph();
      const tag = bullet ? 'ul' : 'ol';
      if (list && list.tag !== tag) flushList();
      list ??= { tag, items: [] };
      list.items.push((bullet ?? numbered)![1]);
      continue;
    }
    if (list) flushList();
    paragraph.push(line.trim());
  }
  flushParagraph(); flushList();
  return out.join('\n');
}

function toBase64(text: string): string {
  if (typeof Buffer !== 'undefined') return Buffer.from(text, 'utf8').toString('base64');
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** The citation chip the editor imports: BibTeX, base64, in data-citation (as lib/server/routes/generate.ts writes it). */
export function citationTokenHtml(source: ResultSource, style: StyleId = 'apa'): string {
  const base64 = toBase64(bibtex(toCiteRecord(source)));
  return `<span class="citation-token" contenteditable="false" data-citation="${base64}" data-citation-id="TOOL_${source.id}">(${escapeHtml(inTextLabel(source, style))})</span>`;
}

/** The answer as editor HTML: Markdown converted, each cited source a real citation. */
export function editorHtml(markdown: string, sources: ResultSource[], style: StyleId = 'apa'): string {
  const byMarker = new Map(sources.map((source) => [source.marker, source]));
  const tokens: string[] = [];
  const withPlaceholders = markdown.replace(MARKERS, (_whole, inner: string) => {
    const cited = markerList(inner, byMarker);
    if (!cited.length) return '';
    tokens.push(cited.map((source) => citationTokenHtml(source, style)).join(' '));
    return `\u0000${tokens.length - 1}\u0000`;
  });
  return markdownToHtml(withPlaceholders).replace(/\u0000(\d+)\u0000/g, (_m, index: string) => tokens[Number(index)] ?? '');
}
