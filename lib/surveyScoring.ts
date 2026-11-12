/**
 * Scale scores for questionnaire data: reverse-coded items, sum or mean scores, prorating when a
 * few items are missing, and score bands (e.g. PHQ-9 severity). Shared by the Survey builder
 * (which defines the scales) and Data Lab (which adds the scores as new columns). Pure.
 */
import { parseCsv, toNumber } from './stats';

export type ScoreBand = { label: string; from: number; to: number };
export type ScaleScoring = {
  name: string;
  /** Column names of the items, in order. */
  items: string[];
  /** Items scored the other way round: min + max − answer. */
  reverse: string[];
  /** The lowest and highest answer codes (e.g. 1 and 5). */
  min: number;
  max: number;
  method: 'sum' | 'mean';
  /** Fewest items answered for a score; missing items are then prorated. Defaults to every item. */
  min_answered?: number;
  /** After summing or averaging: (score + add) × multiply, e.g. the SUS 0–100 score or the WHO-5 percentage. */
  rescale?: { add: number; multiply: number };
  /** Bands apply to the final (rescaled) score. */
  bands?: ScoreBand[];
};

const csvCell = (value: string) => (/[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
const round = (value: number) => String(Math.round(value * 1000) / 1000);

/** Checks a scale definition; returns the problems in plain words. */
export function scaleProblems(scale: ScaleScoring, columns?: string[]): string[] {
  const problems: string[] = [];
  if (!scale.name.trim()) problems.push('Give the scale a name.');
  if (scale.items.length < 1) problems.push(`${scale.name || 'The scale'} needs at least one item.`);
  if (!(Number.isFinite(scale.min) && Number.isFinite(scale.max) && scale.max > scale.min)) problems.push(`${scale.name}: the highest answer must be above the lowest.`);
  if (scale.reverse.some((item) => !scale.items.includes(item))) problems.push(`${scale.name}: a reversed item is not in the scale.`);
  if (scale.min_answered !== undefined && (scale.min_answered < 1 || scale.min_answered > scale.items.length)) problems.push(`${scale.name}: the minimum number of answered items must be between 1 and ${scale.items.length}.`);
  if (scale.rescale && !(Number.isFinite(scale.rescale.add) && Number.isFinite(scale.rescale.multiply) && scale.rescale.multiply !== 0)) problems.push(`${scale.name}: the rescaling needs two numbers.`);
  if (scale.bands?.some((band) => !band.label.trim() || !(band.to >= band.from))) problems.push(`${scale.name}: every band needs a label and a range.`);
  if (columns) { const missing = scale.items.filter((item) => !columns.includes(item)); if (missing.length) problems.push(`${scale.name}: the data has no column ${missing.slice(0, 3).map((item) => `"${item}"`).join(', ')}${missing.length > 3 ? ` and ${missing.length - 3} more` : ''}.`); }
  return problems;
}

/** The score of one respondent, or null when too few items were answered. */
export function scoreRow(scale: ScaleScoring, answers: (number | null)[]): number | null {
  const valid = answers.map((value, i) => {
    if (value === null || value < scale.min || value > scale.max) return null;
    return scale.reverse.includes(scale.items[i]) ? scale.min + scale.max - value : value;
  });
  const answered = valid.filter((value): value is number => value !== null);
  if (answered.length < (scale.min_answered ?? scale.items.length) || !answered.length) return null;
  const mean = answered.reduce((a, b) => a + b, 0) / answered.length;
  const score = scale.method === 'mean' ? mean : mean * scale.items.length;
  return scale.rescale ? (score + scale.rescale.add) * scale.rescale.multiply : score;
}

/** The band a score falls in. Bands are read as running up to the next band, so a prorated 9.4 between 5–9 and 10–14 counts in 5–9. */
export function bandOf(bands: ScoreBand[] | undefined, score: number | null): string {
  if (score === null || !bands?.length) return '';
  const sorted = [...bands].sort((a, b) => a.from - b.from);
  if (score < sorted[0].from || score > sorted[sorted.length - 1].to) return '';
  return sorted.filter((band) => score >= band.from).pop()?.label ?? '';
}

/** Adds a score column (and a band column when the scale has bands) for each scale. */
export function applyScoring(csv: string, scales: ScaleScoring[]): { csv: string; added: string[]; warnings: string[] } {
  const parsed = parseCsv(csv);
  const header = [...parsed.header];
  const problems = scales.flatMap((scale) => scaleProblems(scale, parsed.header));
  if (problems.length) throw new Error(problems[0]);
  const taken = new Set(header.map((name) => name.toLowerCase()));
  const unique = (name: string) => { let candidate = name; let n = 2; while (taken.has(candidate.toLowerCase())) candidate = `${name}_${n++}`; taken.add(candidate.toLowerCase()); return candidate; };
  const added: string[] = [];
  const warnings: string[] = [];
  const extra: string[][] = parsed.rows.map(() => []);
  for (const scale of scales) {
    const indexes = scale.items.map((item) => parsed.header.indexOf(item));
    const scoreName = unique(`${scale.name.trim()}_score`);
    added.push(scoreName);
    let outOfRange = 0; let unscored = 0;
    parsed.rows.forEach((row, r) => {
      const answers = indexes.map((index) => toNumber(row[index] ?? ''));
      outOfRange += answers.filter((value) => value !== null && (value < scale.min || value > scale.max)).length;
      const score = scoreRow(scale, answers);
      if (score === null) unscored += 1;
      extra[r].push(score === null ? '' : round(score));
      if (scale.bands?.length) extra[r].push(bandOf(scale.bands, score));
    });
    if (scale.bands?.length) added.push(unique(`${scale.name.trim()}_band`));
    if (outOfRange) warnings.push(`${scale.name}: ${outOfRange} answer${outOfRange === 1 ? '' : 's'} outside ${scale.min}–${scale.max} treated as missing.`);
    if (unscored) warnings.push(`${scale.name}: ${unscored} respondent${unscored === 1 ? '' : 's'} answered too few items for a score.`);
  }
  const lines = [[...header, ...added], ...parsed.rows.map((row, r) => [...row, ...extra[r]])];
  return { csv: lines.map((line) => line.map(csvCell).join(',')).join('\n'), added, warnings };
}
