/**
 * A poster made ready for its exports: citation markers numbered in order of first use with a
 * matching reference list, the blocks split into balanced columns, and the tikzposter .tex file.
 * Pure (no browser APIs), so it is tested directly.
 */
import type { Source } from '@/components/app/research/parts';
import { POSTER_SIZES, posterColumns, posterSize, type Poster, type PosterFigure, type PosterSection } from '@/lib/server/lib/posterModule';

const MARKERS = /\s*\[(S\d+(?:\s*[,;]\s*S?\d+)*)\]/g;

/** One reference line, as on the deck's References slide. */
export function referenceLine(source: Source): string {
  return `${source.authors.slice(0, 3).join(', ')}${source.authors.length > 3 ? ' et al.' : ''} (${source.year ?? 'n.d.'}). ${source.title}.${source.venue ? ` ${source.venue}.` : ''}${source.doi ? ` https://doi.org/${source.doi}` : ''}`;
}

/**
 * The poster with [S…] markers as [1], [2] … in order of first use, and the reference list that
 * goes with them (then any references the writer's own content gave). Markers with no source go.
 */
export function numberCitations(poster: Poster, sources: Source[]): { poster: Poster; references: string[] } {
  const byMarker = new Map(sources.map((source) => [source.marker, source]));
  const order: Source[] = [];
  const replace = (text: string) => text.replace(MARKERS, (_, group: string) => {
    const numbers = [...group.matchAll(/S?(\d+)/g)].map((match) => byMarker.get(`S${match[1]}`)).filter((source): source is Source => Boolean(source)).map((source) => {
      if (!order.includes(source)) order.push(source);
      return order.indexOf(source) + 1;
    });
    return numbers.length ? ` [${[...new Set(numbers)].join(', ')}]` : '';
  }).trim();
  const numbered: Poster = {
    ...poster,
    sections: poster.sections.map((section) => ({ ...section, text: replace(section.text), bullets: section.bullets.map(replace).filter(Boolean) })),
    figures: poster.figures.map((figure) => ({ ...figure, description: replace(figure.description) })),
  };
  return { poster: numbered, references: [...order.map(referenceLine), ...poster.references] };
}

export type PosterBlock =
  | { kind: 'section'; section: PosterSection }
  | { kind: 'figure'; figure: PosterFigure }
  | { kind: 'references'; references: string[] };

/** How much room a block takes, in characters of body text (a figure is a fixed box). */
export function blockWeight(block: PosterBlock): number {
  if (block.kind === 'figure') return 900;
  if (block.kind === 'references') return 120 + block.references.reduce((sum, line) => sum + Math.max(60, line.length * 0.7), 0);
  return 140 + block.section.text.length + block.section.bullets.reduce((sum, bullet) => sum + bullet.length + 30, 0);
}

/** The poster's blocks in reading order: the figures go after the Results section (or the middle one), the references last. */
export function posterBlocks(poster: Poster, references: string[]): PosterBlock[] {
  const sections: PosterBlock[] = poster.sections.map((section) => ({ kind: 'section', section }));
  const results = poster.sections.findIndex((section) => /result|finding/i.test(section.heading));
  const at = results >= 0 ? results + 1 : Math.ceil(sections.length / 2);
  const figures: PosterBlock[] = poster.figures.map((figure) => ({ kind: 'figure', figure }));
  const blocks = [...sections.slice(0, at), ...figures, ...sections.slice(at)];
  if (references.length) blocks.push({ kind: 'references', references });
  return blocks;
}

/** Blocks split, in order, into `count` columns of about equal weight (none empty while there are enough blocks). */
export function splitColumns<T>(blocks: T[], count: number, weight: (block: T) => number): T[][] {
  const columns: T[][] = Array.from({ length: Math.max(1, count) }, () => []);
  const total = blocks.reduce((sum, block) => sum + weight(block), 0);
  let column = 0;
  let before = 0;
  blocks.forEach((block, index) => {
    const size = weight(block);
    const left = blocks.length - index;
    const columnsLeft = columns.length - column - 1;
    // Move on when this block's middle falls past the column's share, or when the remaining blocks are only enough for the remaining columns.
    if (columns[column].length && column < columns.length - 1 && (before + size / 2 > (total * (column + 1)) / columns.length || left <= columnsLeft)) column += 1;
    columns[column].push(block);
    before += size;
  });
  return columns;
}

const LATEX_SPECIAL: Record<string, string> = {
  '\\': '\\textbackslash{}', '{': '\\{', '}': '\\}', $: '\\$', '&': '\\&', '#': '\\#', '%': '\\%', _: '\\_', '~': '\\textasciitilde{}', '^': '\\textasciicircum{}',
};
/** Characters pdfLaTeX with utf8 input does not know, written as LaTeX. */
const LATEX_UNICODE: Record<string, string> = {
  '≤': '$\\leq$', '≥': '$\\geq$', '±': '$\\pm$', '×': '$\\times$', '÷': '$\\div$', 'µ': '$\\mu$', 'μ': '$\\mu$', 'α': '$\\alpha$', 'β': '$\\beta$', 'γ': '$\\gamma$',
  'δ': '$\\delta$', 'Δ': '$\\Delta$', 'χ': '$\\chi$', 'σ': '$\\sigma$', 'η': '$\\eta$', 'κ': '$\\kappa$', 'λ': '$\\lambda$', 'ρ': '$\\rho$', 'τ': '$\\tau$', 'ω': '$\\omega$',
  '²': '$^{2}$', '³': '$^{3}$', '≈': '$\\approx$', '≠': '$\\neq$', '→': '$\\rightarrow$', '←': '$\\leftarrow$', '↔': '$\\leftrightarrow$', '∞': '$\\infty$', '°': '$^{\\circ}$',
  '•': '\\textbullet{}', '…': '\\ldots{}', '\u00a0': '~', '\u2009': '\\,', '\u202f': '\\,',
};

/** Text safe inside a LaTeX document: special characters escaped, common symbols as LaTeX, control characters dropped. */
export function escapeLatex(text: string): string {
  return text
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/[\\{}$&#%_~^]/g, (char) => LATEX_SPECIAL[char])
    .replace(/[≤≥±×÷µμαβγδΔχσηκλρτω²³≈≠→←↔∞°•…\u00a0\u2009\u202f]/g, (char) => LATEX_UNICODE[char])
    .replace(/\s+/g, ' ')
    .trim();
}

function texBlock(block: PosterBlock): string {
  if (block.kind === 'figure') {
    return `  \\block{${escapeLatex(`Figure: ${block.figure.title || 'Key figure'}`)}}{\n    \\centering\n    \\fbox{\\begin{minipage}[c][10cm][c]{0.9\\linewidth}\\centering\\itshape ${escapeLatex(block.figure.description || 'Figure to add')}\\end{minipage}}\n  }`;
  }
  if (block.kind === 'references') {
    return `  \\block{References}{\n    \\footnotesize\n    \\begin{enumerate}\n${block.references.map((line) => `      \\item ${escapeLatex(line)}`).join('\n')}\n    \\end{enumerate}\n  }`;
  }
  const { section } = block;
  const parts: string[] = [];
  if (section.text) parts.push(`    ${escapeLatex(section.text)}`);
  if (section.bullets.length) parts.push(`    \\begin{itemize}\n${section.bullets.map((bullet) => `      \\item ${escapeLatex(bullet)}`).join('\n')}\n    \\end{itemize}`);
  return `  \\block{${escapeLatex(section.heading)}}{\n${parts.join('\n')}\n  }`;
}

/** The poster as a compile-ready tikzposter document (pdfLaTeX). */
export function posterTex(poster: Poster, references: string[], inputs: { size?: string; layout?: string }): string {
  const size = POSTER_SIZES[posterSize(inputs.size)];
  const count = posterColumns(inputs.layout);
  const columns = splitColumns(posterBlocks(poster, references), count, blockWeight);
  const width = (1 / count).toFixed(3);
  const classOptions = [`${size.fontPt}pt`, size.paper ?? 'a0paper', size.orientation, 'margin=10mm', 'innermargin=15mm', 'blockverticalspace=15mm', 'colspace=15mm', 'subcolspace=8mm'];
  const institute = [poster.affiliations, poster.contact].filter(Boolean).map(escapeLatex).join(' \\\\ ');
  return [
    '% Made with AI for Research. Compile with pdfLaTeX (for example on Overleaf).',
    `\\documentclass[${classOptions.join(', ')}]{tikzposter}`,
    ...(size.paper ? [] : [`\\geometry{paperwidth=${size.width}in, paperheight=${size.height}in}`]),
    '\\usepackage[utf8]{inputenc}',
    '\\usepackage[T1]{fontenc}',
    '\\usepackage{lmodern}',
    '\\usetheme{Default}',
    '\\usecolorstyle{Default}',
    '',
    `\\title{${escapeLatex(poster.title)}}`,
    `\\author{${escapeLatex(poster.authors)}}`,
    `\\institute{${institute}}`,
    '',
    '\\begin{document}',
    '\\maketitle',
    '',
    '\\begin{columns}',
    ...columns.flatMap((blocks) => (blocks.length ? [`\\column{${width}}`, ...blocks.map(texBlock)] : [])),
    '\\end{columns}',
    '',
    '\\end{document}',
    '',
  ].join('\n');
}

/** The poster as Markdown, its [S…] markers kept (for "Open in editor"). */
export function posterMarkdown(poster: Poster): string {
  const out = [`**${poster.authors}**`, poster.affiliations, ''];
  for (const section of poster.sections) {
    out.push(`## ${section.heading}`, '');
    if (section.text) out.push(section.text, '');
    if (section.bullets.length) out.push(...section.bullets.map((bullet) => `- ${bullet}`), '');
  }
  if (poster.figures.length) {
    out.push('## Suggested figures', '');
    out.push(...poster.figures.map((figure) => `- **${figure.title}**: ${figure.description}`), '');
  }
  if (poster.references.length) out.push('## References', '', ...poster.references.map((line) => `- ${line}`), '');
  if (poster.contact) out.push(`Contact: ${poster.contact}`);
  return out.join('\n').trim();
}

/** A file name from the poster's title. */
export const posterFileName = (title: string) => title.replace(/[^\p{L}\p{N} _-]+/gu, '').trim().slice(0, 80) || 'poster';
