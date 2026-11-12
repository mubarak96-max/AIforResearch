/**
 * Figures in a Deep Research report. Every figure is computed from what the pipeline counted and
 * read (search counts, study designs, years, stances, effect sizes found word for word in the
 * text), never drawn from numbers a model typed. Shared by the server (which builds them) and the
 * browser (which draws them, and turns them into tables for the editor and the clipboard).
 *
 * In the report's Markdown a figure is a fenced block whose language is `figure`:
 *
 *   ```figure
 *   fig-2
 *   ```
 */

export type Stance = 'supports' | 'mixed' | 'against' | 'unclear';

export type PrismaData = {
  /** Records the searches returned (every service, every search), citation chasing included. */
  identified: number;
  chased: number;
  duplicates: number;
  /** Distinct records past the screening cap (lowest in the search ranking), not screened. */
  unscreened: number;
  screened: number;
  /** Excluded at screening, with reasons. */
  excluded: number;
  reasons: { label: string; count: number }[];
  /** Relevant after screening, and the best of them kept after ranking. */
  relevant: number;
  included: number;
  full_text: number;
  /** Papers the Fill gaps round added, and attached files and web pages also used. */
  gap_added: number;
  files: number;
  web: number;
};

export type BarsData = { orientation: 'vertical' | 'horizontal'; unit: string; bars: { label: string; value: number; title?: string }[] };
export type StackedData = { rows: { label: string; values: Record<Stance, number> }[] };
export type ForestRow = { n: number; label: string; value: number; low: number; high: number; outcome: string | null };
export type ForestData = { measure: string; log: boolean; null_value: number; rows: ForestRow[] };

type Base = { id: string; number: number; title: string; caption: string };
export type ResearchFigure =
  | (Base & { kind: 'prisma'; data: PrismaData })
  | (Base & { kind: 'bars'; data: BarsData })
  | (Base & { kind: 'stacked'; data: StackedData })
  | (Base & { kind: 'forest'; data: ForestData });

export const STANCE_LABELS: Record<Stance, string> = { supports: 'Supports', mixed: 'Mixed', against: 'Does not support', unclear: 'Not tested' };
export const STANCE_ORDER: Stance[] = ['supports', 'mixed', 'against', 'unclear'];

/** The placeholder for a figure in the report's Markdown. */
export const figureBlock = (id: string) => `\`\`\`figure\n${id}\n\`\`\``;
export const FIGURE_BLOCK = /```figure\s*\n\s*([\w-]+)\s*\n```/g;

// ------------------------------------------------------------------ effect sizes

/** Measures the forest plot accepts, and whether each is a ratio (log scale, no effect at 1). */
export const EFFECT_MEASURES: Record<string, { label: string; ratio: boolean }> = {
  OR: { label: 'Odds ratio', ratio: true },
  RR: { label: 'Risk ratio', ratio: true },
  HR: { label: 'Hazard ratio', ratio: true },
  IRR: { label: 'Incidence rate ratio', ratio: true },
  MD: { label: 'Mean difference', ratio: false },
  SMD: { label: 'Standardized mean difference', ratio: false },
  r: { label: 'Correlation (r)', ratio: false },
};

const MEASURE_ALIASES: Record<string, string> = {
  or: 'OR', 'odds ratio': 'OR', aor: 'OR', 'adjusted odds ratio': 'OR',
  rr: 'RR', 'risk ratio': 'RR', 'relative risk': 'RR',
  hr: 'HR', 'hazard ratio': 'HR', ahr: 'HR',
  irr: 'IRR', 'rate ratio': 'IRR', 'incidence rate ratio': 'IRR',
  md: 'MD', 'mean difference': 'MD', wmd: 'MD',
  smd: 'SMD', 'standardized mean difference': 'SMD', 'standardised mean difference': 'SMD', d: 'SMD', "cohen's d": 'SMD', 'cohen d': 'SMD', g: 'SMD', "hedges' g": 'SMD', 'hedges g': 'SMD',
  r: 'r', correlation: 'r', "pearson's r": 'r',
};

export const normalizeMeasure = (raw: unknown): string | null => MEASURE_ALIASES[String(raw ?? '').trim().toLowerCase()] ?? (EFFECT_MEASURES[String(raw ?? '').trim()] ? String(raw).trim() : null);

/** Every number written in a text ("1.32", "0,87", "−0.41"), as numbers. */
export function numbersIn(text: string): number[] {
  return [...text.replace(/[−–]/g, '-').matchAll(/-?\d+(?:[.,]\d+)?/g)].map((match) => Number(match[0].replace(',', '.'))).filter(Number.isFinite);
}

export type Effect = { measure: string; value: number; low: number; high: number; outcome: string | null };

/**
 * An effect size the model read from a paper, kept only when its measure is known, its interval
 * holds the estimate, and all three numbers are written in the paper's text (abstract or full-text
 * passages). A model that invents or rounds a number loses the effect, not the paper.
 */
export function checkedEffect(raw: unknown, text: string): Effect | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const measure = normalizeMeasure(item.measure);
  const value = Number(item.value);
  const low = Number(item.low);
  const high = Number(item.high);
  if (!measure || ![value, low, high].every(Number.isFinite) || !(low <= value && value <= high) || low === high) return null;
  if (EFFECT_MEASURES[measure].ratio && low <= 0) return null;
  const written = numbersIn(text);
  const found = (target: number) => written.some((number) => Math.abs(number - target) < 1e-9 || Math.abs(Math.abs(number) - Math.abs(target)) < 1e-9);
  if (!found(value) || !found(low) || !found(high)) return null;
  const outcome = String(item.outcome ?? '').replace(/\s+/g, ' ').trim().slice(0, 80) || null;
  return { measure, value, low, high, outcome };
}

// ------------------------------------------------------------------ figures as text

const cell = (value: unknown) => String(value ?? '').replace(/\|/g, '/').replace(/\s+/g, ' ').trim();
/** A number as a figure shows it: 1.32, 12.4, 140. */
export const formatEffect = (value: number) => (Math.abs(value) >= 100 ? value.toFixed(0) : Math.abs(value) >= 10 ? value.toFixed(1) : value.toFixed(2));

/** A figure's numbers as a table: shown under "Show data", and in the editor and the clipboard. */
export function figureTable(figure: ResearchFigure): { head: string[]; rows: (string | number)[][] } {
  switch (figure.kind) {
    case 'prisma': {
      const d = figure.data;
      return {
        head: ['Stage', 'Records'],
        rows: [
          ['Found by the searches', d.identified - d.chased], ...(d.chased ? [['Found by citation chasing', d.chased]] : []),
          ['Duplicates removed', d.duplicates], ...(d.unscreened ? [['Lower in the search ranking, not screened', d.unscreened]] : []),
          ['Titles and abstracts screened', d.screened], ['Excluded at screening', d.excluded],
          ...d.reasons.map((reason) => [`– ${reason.label}`, reason.count]),
          ['Relevant', d.relevant], ...(d.gap_added ? [['Added by the gap searches', d.gap_added]] : []),
          ['Included in the report', d.included], ['Read in full text', d.full_text],
          ...(d.files ? [['Your attached files', d.files]] : []), ...(d.web ? [['Web pages', d.web]] : []),
        ],
      };
    }
    case 'bars':
      return { head: ['', figure.data.unit], rows: figure.data.bars.map((bar) => [bar.title || bar.label, bar.value]) };
    case 'stacked':
      return { head: ['', ...STANCE_ORDER.map((stance) => STANCE_LABELS[stance])], rows: figure.data.rows.map((row) => [row.label, ...STANCE_ORDER.map((stance) => row.values[stance])]) };
    case 'forest':
      return {
        head: ['Study', 'Outcome', `${figure.data.measure} (95% CI)`],
        rows: figure.data.rows.map((row) => [`${row.label} [S${row.n}]`, row.outcome ?? '', `${formatEffect(row.value)} (${formatEffect(row.low)} to ${formatEffect(row.high)})`]),
      };
  }
}

/** One figure as Markdown: its title, its numbers as a table, and its caption. */
export function figureToMarkdown(figure: ResearchFigure): string {
  const { head, rows } = figureTable(figure);
  const body = [`| ${head.map(cell).join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((row) => `| ${row.map(cell).join(' | ')} |`)].join('\n');
  return `**${figure.title}**\n\n${body}\n\n*${figure.caption}*`;
}

/** The report with each figure placeholder replaced by the figure as text (for the editor, the clipboard and other tools). */
export function figuresAsText(markdown: string, figures: ResearchFigure[] | null | undefined): string {
  const byId = new Map((figures ?? []).map((figure) => [figure.id, figure]));
  return markdown.replace(FIGURE_BLOCK, (_whole, id: string) => {
    const figure = byId.get(id);
    return figure ? figureToMarkdown(figure) : '';
  }).replace(/\n{3,}/g, '\n\n');
}
