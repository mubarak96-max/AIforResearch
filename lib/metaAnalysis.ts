/**
 * Meta-analysis for the Systematic Review workspace: effect sizes per study, fixed-effect
 * (inverse variance, Mantel-Haenszel) and random-effects pooling (DerSimonian-Laird, REML,
 * optional Hartung-Knapp-Sidik-Jonkman), heterogeneity, prediction intervals, subgroups,
 * leave-one-out, funnel plot data and Egger's test, GRADE certainty and the summary of findings.
 *
 * Calculated, never generated, and pure: it runs in the browser and in tests
 * (tests/server/meta-analysis.test.ts checks it against metafor's BCG example and numpy/scipy).
 * Ratio measures are analysed on the log scale and reported back-transformed.
 */
import { chiSquareUpper, tTwoTailed } from './stats';
import { normCdf } from './statsMore';

// ------------------------------------------------------------------ shapes

export type DataType = 'binary' | 'continuous' | 'generic';
export type Measure = 'OR' | 'RR' | 'RD' | 'MD' | 'SMD' | 'HR' | 'GEN';
export type Model = 'fixed' | 'random';
export type Method = 'IV' | 'MH' | 'DL' | 'REML';

export const DATA_TYPES: { value: DataType; label: string; hint: string }[] = [
  { value: 'binary', label: 'Events and totals', hint: 'Each arm’s number of people with the event and its total.' },
  { value: 'continuous', label: 'Means and SDs', hint: 'Each arm’s mean, standard deviation and number of participants.' },
  { value: 'generic', label: 'Estimate and CI', hint: 'An effect estimate each study reports, with its 95% CI or standard error.' },
];
export const MEASURES: Record<DataType, Measure[]> = {
  binary: ['RR', 'OR', 'RD'],
  continuous: ['MD', 'SMD'],
  generic: ['RR', 'OR', 'HR', 'RD', 'MD', 'SMD', 'GEN'],
};
export const MEASURE_LABELS: Record<Measure, string> = {
  OR: 'Odds ratio', RR: 'Risk ratio', RD: 'Risk difference', MD: 'Mean difference', SMD: 'Standardised mean difference (Hedges’ g)', HR: 'Hazard ratio', GEN: 'Other estimate',
};
export const MEASURE_SHORT: Record<Measure, string> = { OR: 'OR', RR: 'RR', RD: 'RD', MD: 'MD', SMD: 'SMD', HR: 'HR', GEN: 'Estimate' };
export const METHODS: Record<Model, Method[]> = { fixed: ['IV', 'MH'], random: ['REML', 'DL'] };
export const METHOD_LABELS: Record<Method, string> = { IV: 'Inverse variance', MH: 'Mantel-Haenszel', DL: 'DerSimonian-Laird', REML: 'REML' };

export const isRatio = (measure: Measure) => measure === 'OR' || measure === 'RR' || measure === 'HR';
export const nullValue = (measure: Measure) => (isRatio(measure) ? 1 : 0);

export const NUMBER_FIELDS = ['e1', 'n1', 'e2', 'n2', 'm1', 'sd1', 'm2', 'sd2', 'est', 'lower', 'upper', 'se'] as const;
export type NumberField = (typeof NUMBER_FIELDS)[number];

export type InputRow = { record_id: string | null; label: string; subgroup?: string | null } & Partial<Record<NumberField, number | null>>;

/** The inputs for each data type, with the arm they belong to (1 = intervention, 2 = comparison). */
export const FIELDS: Record<DataType, { field: NumberField; label: string; arm: 1 | 2 | null }[]> = {
  binary: [{ field: 'e1', label: 'Events', arm: 1 }, { field: 'n1', label: 'Total', arm: 1 }, { field: 'e2', label: 'Events', arm: 2 }, { field: 'n2', label: 'Total', arm: 2 }],
  continuous: [
    { field: 'm1', label: 'Mean', arm: 1 }, { field: 'sd1', label: 'SD', arm: 1 }, { field: 'n1', label: 'Total', arm: 1 },
    { field: 'm2', label: 'Mean', arm: 2 }, { field: 'sd2', label: 'SD', arm: 2 }, { field: 'n2', label: 'Total', arm: 2 },
  ],
  generic: [{ field: 'est', label: 'Estimate', arm: null }, { field: 'lower', label: '95% CI lower', arm: null }, { field: 'upper', label: '95% CI upper', arm: null }, { field: 'se', label: 'SE', arm: null }],
};

export type StudyEffect = {
  index: number; label: string; subgroup: string | null; record_id: string | null;
  /** On the analysis scale (log for ratios). */
  yi: number; vi: number; se: number;
  participants: number | null; events: number | null;
  /** Raw 2×2 cells for Mantel-Haenszel: intervention events, non-events, comparison events, non-events. */
  cells: [number, number, number, number] | null;
  corrected: boolean;
};
export type Excluded = { index: number; label: string; reason: string };
export type InputError = { index: number; label: string; message: string };

// ------------------------------------------------------------------ distributions

export const Z95 = 1.959963984540054;
const pNormal = (z: number) => Math.min(1, 2 * normCdf(-Math.abs(z)));

/** Student t quantile (two-sided 1 − alpha level), by bisection on the t distribution's tail. */
export function tQuantile(p: number, df: number): number {
  // p is the upper cumulative probability (0.975 for a 95% interval).
  const tail = 2 * (1 - p);
  let lo = 0;
  let hi = 1;
  while (tTwoTailed(hi, df) > tail) hi *= 2;
  for (let i = 0; i < 200; i += 1) {
    const mid = (lo + hi) / 2;
    if (tTwoTailed(mid, df) > tail) lo = mid; else hi = mid;
    if (hi - lo < 1e-12) break;
  }
  return (lo + hi) / 2;
}

// ------------------------------------------------------------------ effect sizes

const present = (value: number | null | undefined): value is number => typeof value === 'number' && Number.isFinite(value);
const ARM = { 1: 'intervention', 2: 'comparison' } as const;

/** Effect sizes for each row; incomplete or invalid rows become errors, studies that cannot contribute are excluded. */
export function effectSizes(rows: InputRow[], dataType: DataType, measure: Measure): { studies: StudyEffect[]; excluded: Excluded[]; errors: InputError[] } {
  const studies: StudyEffect[] = [];
  const excluded: Excluded[] = [];
  const errors: InputError[] = [];
  rows.forEach((row, index) => {
    const label = row.label?.trim() || `Study ${index + 1}`;
    const fields = FIELDS[dataType].filter((item) => !(dataType === 'generic' && (item.field === 'se' || item.field === 'lower' || item.field === 'upper')));
    const filled = FIELDS[dataType].filter((item) => present(row[item.field]));
    if (!filled.length) { excluded.push({ index, label, reason: 'No numbers entered yet.' }); return; }
    const missing = fields.filter((item) => !present(row[item.field]));
    if (missing.length) {
      errors.push({ index, label, message: `Missing ${missing.map((item) => `${item.label.toLowerCase()}${item.arm ? ` (${ARM[item.arm]})` : ''}`).join(', ')}.` });
      return;
    }
    const base = { index, label, subgroup: row.subgroup?.trim() || null, record_id: row.record_id ?? null };
    const result = dataType === 'binary' ? binaryEffect(row, measure) : dataType === 'continuous' ? continuousEffect(row, measure) : genericEffect(row, measure);
    if ('error' in result) errors.push({ index, label, message: result.error });
    else if ('excluded' in result) excluded.push({ index, label, reason: result.excluded });
    else studies.push({ ...base, ...result });
  });
  return { studies, excluded, errors };
}

type Effect = Omit<StudyEffect, 'index' | 'label' | 'subgroup' | 'record_id'>;

function binaryEffect(row: InputRow, measure: Measure): Effect | { error: string } | { excluded: string } {
  const e1 = row.e1!; const n1 = row.n1!; const e2 = row.e2!; const n2 = row.n2!;
  for (const [value, name] of [[e1, 'Events (intervention)'], [n1, 'Total (intervention)'], [e2, 'Events (comparison)'], [n2, 'Total (comparison)']] as const) {
    if (value < 0 || !Number.isInteger(value)) return { error: `${name} must be a whole number of 0 or more.` };
  }
  if (n1 === 0 || n2 === 0) return { error: 'Each arm needs a total above 0.' };
  if (e1 > n1) return { error: 'Events are more than the total in the intervention arm.' };
  if (e2 > n2) return { error: 'Events are more than the total in the comparison arm.' };
  const cells: [number, number, number, number] = [e1, n1 - e1, e2, n2 - e2];
  const shared = { participants: n1 + n2, events: e1 + e2, cells };
  const doubleZero = (e1 === 0 && e2 === 0) || (e1 === n1 && e2 === n2);
  if (measure === 'RD') {
    const p1 = e1 / n1; const p2 = e2 / n2;
    let vi = (p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2;
    let corrected = false;
    // A variance of zero (no events, or all events, in both arms) would take all the weight: correct it.
    if (vi === 0) {
      const c1 = (e1 + 0.5) / (n1 + 1); const c2 = (e2 + 0.5) / (n2 + 1);
      vi = (c1 * (1 - c1)) / (n1 + 1) + (c2 * (1 - c2)) / (n2 + 1);
      corrected = true;
    }
    return { yi: p1 - p2, vi, se: Math.sqrt(vi), corrected, ...shared };
  }
  if (doubleZero) return { excluded: e1 === 0 ? 'No events in either arm, so it gives no information on the ratio.' : 'Every participant had the event in both arms, so it gives no information on the ratio.' };
  const corrected = cells.some((cell) => cell === 0);
  const [a, b, c, d] = corrected ? cells.map((cell) => cell + 0.5) : cells;
  if (measure === 'OR') {
    const vi = 1 / a + 1 / b + 1 / c + 1 / d;
    return { yi: Math.log((a * d) / (b * c)), vi, se: Math.sqrt(vi), corrected, ...shared };
  }
  if (measure === 'RR') {
    const vi = 1 / a - 1 / (a + b) + 1 / c - 1 / (c + d);
    return { yi: Math.log((a / (a + b)) / (c / (c + d))), vi, se: Math.sqrt(vi), corrected, ...shared };
  }
  return { error: `${MEASURE_LABELS[measure]} cannot be computed from events and totals.` };
}

function continuousEffect(row: InputRow, measure: Measure): Effect | { error: string } {
  const m1 = row.m1!; const sd1 = row.sd1!; const n1 = row.n1!; const m2 = row.m2!; const sd2 = row.sd2!; const n2 = row.n2!;
  if (sd1 <= 0 || sd2 <= 0) return { error: 'Standard deviations must be above 0.' };
  if (!Number.isInteger(n1) || !Number.isInteger(n2) || n1 < 1 || n2 < 1) return { error: 'Totals must be whole numbers of 1 or more.' };
  const shared = { participants: n1 + n2, events: null, cells: null, corrected: false };
  if (measure === 'MD') {
    const vi = sd1 ** 2 / n1 + sd2 ** 2 / n2;
    return { yi: m1 - m2, vi, se: Math.sqrt(vi), ...shared };
  }
  if (measure === 'SMD') {
    if (n1 + n2 < 4) return { error: 'Hedges’ g needs at least 4 participants in all.' };
    const g = hedgesG(m1, sd1, n1, m2, sd2, n2);
    return { yi: g.g, vi: g.v, se: Math.sqrt(g.v), ...shared };
  }
  return { error: `${MEASURE_LABELS[measure]} cannot be computed from means and SDs.` };
}

/** Hedges' g: Cohen's d on the pooled SD times J = 1 − 3 / (4(n1 + n2 − 2) − 1); variance 1/n1 + 1/n2 + g² / (2(n1 + n2)). */
export function hedgesG(m1: number, sd1: number, n1: number, m2: number, sd2: number, n2: number) {
  const df = n1 + n2 - 2;
  const pooled = Math.sqrt(((n1 - 1) * sd1 ** 2 + (n2 - 1) * sd2 ** 2) / df);
  const d = (m1 - m2) / pooled;
  const j = 1 - 3 / (4 * df - 1);
  const g = j * d;
  return { d, j, g, v: 1 / n1 + 1 / n2 + g ** 2 / (2 * (n1 + n2)) };
}

function genericEffect(row: InputRow, measure: Measure): Effect | { error: string } {
  const est = row.est!;
  const ratio = isRatio(measure);
  const lower = present(row.lower) ? row.lower : null;
  const upper = present(row.upper) ? row.upper : null;
  const given = present(row.se) ? row.se : null;
  if (ratio && est <= 0) return { error: 'A ratio estimate must be above 0.' };
  const yi = ratio ? Math.log(est) : est;
  let se: number;
  if (lower !== null && upper !== null) {
    if (ratio && (lower <= 0 || upper <= 0)) return { error: 'Confidence limits of a ratio must be above 0.' };
    if (lower >= upper) return { error: 'The lower confidence limit must be below the upper one.' };
    if (est < lower || est > upper) return { error: 'The estimate must lie between its confidence limits.' };
    se = ratio ? (Math.log(upper) - Math.log(lower)) / (2 * Z95) : (upper - lower) / (2 * Z95);
  } else if (given !== null) {
    if (given <= 0) return { error: 'The standard error must be above 0.' };
    se = given;
  } else if (lower !== null || upper !== null) {
    return { error: 'Give both confidence limits, or the standard error.' };
  } else {
    return { error: 'Give the 95% confidence interval or the standard error.' };
  }
  return { yi, vi: se ** 2, se, participants: null, events: null, cells: null, corrected: false };
}

// ------------------------------------------------------------------ pooling

export type Setup = { data_type: DataType; measure: Measure; model: Model; method: Method; hksj: boolean };

export type Pooled = {
  k: number; model: Model; method: Method; hksj: boolean;
  /** Analysis scale. */
  estimate: number; se: number; lower: number; upper: number; statistic: number; p: number; df_test: number | null;
  tau2: number; tau: number; Q: number; df: number; pQ: number; I2: number;
  prediction: [number, number] | null;
  /** Percentage weight of each study, in the order of the studies given. */
  weights: number[];
  converged: boolean; iterations: number; warnings: string[];
};

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** Q, df, p and I² around a given estimate, with inverse-variance weights. */
function heterogeneity(studies: StudyEffect[], centre: number) {
  const Q = sum(studies.map((study) => (study.yi - centre) ** 2 / study.vi));
  const df = studies.length - 1;
  return { Q, df, pQ: df > 0 ? chiSquareUpper(Q, df) : 1, I2: Q > 0 && df > 0 ? Math.max(0, (Q - df) / Q) * 100 : 0 };
}

export function tau2DerSimonianLaird(studies: StudyEffect[]): number {
  if (studies.length < 2) return 0;
  const w = studies.map((study) => 1 / study.vi);
  const sw = sum(w);
  const mu = sum(studies.map((study, i) => w[i] * study.yi)) / sw;
  const { Q, df } = heterogeneity(studies, mu);
  return Math.max(0, (Q - df) / (sw - sum(w.map((x) => x * x)) / sw));
}

/** REML by the fixed-point form of its score equation, started at the DerSimonian-Laird value. */
export function tau2Reml(studies: StudyEffect[], maxIterations = 1000, tolerance = 1e-10): { tau2: number; converged: boolean; iterations: number } {
  if (studies.length < 2) return { tau2: 0, converged: true, iterations: 0 };
  let tau2 = tau2DerSimonianLaird(studies);
  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    const w = studies.map((study) => 1 / (study.vi + tau2));
    const sw = sum(w);
    const mu = sum(studies.map((study, i) => w[i] * study.yi)) / sw;
    const w2 = w.map((x) => x * x);
    const next = Math.max(0, sum(studies.map((study, i) => w2[i] * ((study.yi - mu) ** 2 - study.vi))) / sum(w2) + 1 / sw);
    if (!Number.isFinite(next)) return { tau2, converged: false, iterations: iteration };
    if (Math.abs(next - tau2) < tolerance * Math.max(1, tau2)) return { tau2: next, converged: true, iterations: iteration };
    tau2 = next;
  }
  return { tau2, converged: false, iterations: maxIterations };
}

/** Mantel-Haenszel pooled log OR, log RR or RD with its SE, and each study's MH weight. */
export function mantelHaenszel(studies: StudyEffect[], measure: Measure): { estimate: number; se: number; weights: number[] } | null {
  const tables = studies.map((study) => study.cells!);
  if (tables.some((cells) => !cells)) return null;
  const parts = tables.map(([a, b, c, d]) => ({ a, b, c, d, n1: a + b, n2: c + d, N: a + b + c + d }));
  if (measure === 'OR') {
    const R = parts.map(({ a, d, N }) => (a * d) / N);
    const S = parts.map(({ b, c, N }) => (b * c) / N);
    const P = parts.map(({ a, d, N }) => (a + d) / N);
    const Qs = parts.map(({ b, c, N }) => (b + c) / N);
    const sR = sum(R); const sS = sum(S);
    if (!(sR > 0) || !(sS > 0)) return null;
    // Robins, Breslow and Greenland (1986).
    const variance = sum(P.map((p, i) => p * R[i])) / (2 * sR ** 2) + sum(P.map((p, i) => p * S[i] + Qs[i] * R[i])) / (2 * sR * sS) + sum(Qs.map((q, i) => q * S[i])) / (2 * sS ** 2);
    return { estimate: Math.log(sR / sS), se: Math.sqrt(variance), weights: S };
  }
  if (measure === 'RR') {
    const R = parts.map(({ a, n2, N }) => (a * n2) / N);
    const S = parts.map(({ c, n1, N }) => (c * n1) / N);
    const sR = sum(R); const sS = sum(S);
    if (!(sR > 0) || !(sS > 0)) return null;
    // Greenland and Robins (1985).
    const variance = sum(parts.map(({ a, c, n1, n2, N }) => (n1 * n2 * (a + c) - a * c * N) / N ** 2)) / (sR * sS);
    return { estimate: Math.log(sR / sS), se: Math.sqrt(variance), weights: S };
  }
  if (measure === 'RD') {
    const W = parts.map(({ n1, n2, N }) => (n1 * n2) / N);
    const sW = sum(W);
    const estimate = sum(parts.map(({ a, c, n1, n2, N }) => (a * n2 - c * n1) / N)) / sW;
    const variance = sum(parts.map(({ a, b, c, d, n1, n2, N }) => (a * b * n2 ** 3 + c * d * n1 ** 3) / (n1 * n2 * N ** 2))) / sW ** 2;
    return { estimate, se: Math.sqrt(variance), weights: W };
  }
  return null;
}

const percent = (weights: number[]) => { const total = sum(weights); return weights.map((w) => (total > 0 ? (100 * w) / total : 0)); };

export function pool(studies: StudyEffect[], setup: Setup): Pooled | null {
  const k = studies.length;
  if (!k) return null;
  const warnings: string[] = [];
  const fixedWeights = studies.map((study) => 1 / study.vi);
  const sw = sum(fixedWeights);
  const fixedMu = sum(studies.map((study, i) => fixedWeights[i] * study.yi)) / sw;
  const useMh = setup.model === 'fixed' && setup.method === 'MH' && setup.data_type === 'binary';
  if (setup.model === 'fixed' && setup.method === 'MH' && setup.data_type !== 'binary') warnings.push('Mantel-Haenszel needs events and totals; inverse variance was used.');

  if (setup.model === 'fixed') {
    let estimate = fixedMu; let se = Math.sqrt(1 / sw); let weights = fixedWeights;
    if (useMh) {
      const mh = mantelHaenszel(studies, setup.measure);
      if (mh) ({ estimate, se, weights } = mh);
      else warnings.push('The Mantel-Haenszel estimate is not defined for these counts; inverse variance was used.');
    }
    const het = heterogeneity(studies, estimate);
    return {
      k, model: 'fixed', method: useMh ? 'MH' : 'IV', hksj: false, estimate, se, lower: estimate - Z95 * se, upper: estimate + Z95 * se,
      statistic: estimate / se, p: pNormal(estimate / se), df_test: null, tau2: 0, tau: 0, ...het, prediction: null, weights: percent(weights), converged: true, iterations: 0, warnings,
    };
  }

  const het = heterogeneity(studies, fixedMu);
  let tau2 = 0; let converged = true; let iterations = 0;
  const method: Method = setup.method === 'DL' ? 'DL' : 'REML';
  if (method === 'DL') tau2 = tau2DerSimonianLaird(studies);
  else {
    ({ tau2, converged, iterations } = tau2Reml(studies));
    if (!converged) warnings.push(`REML did not converge after ${iterations} iterations; the last value is shown. Try DerSimonian-Laird.`);
  }
  const w = studies.map((study) => 1 / (study.vi + tau2));
  const sws = sum(w);
  const estimate = sum(studies.map((study, i) => w[i] * study.yi)) / sws;
  const seRe = Math.sqrt(1 / sws);
  let se = seRe; let lower = estimate - Z95 * se; let upper = estimate + Z95 * se; let statistic = estimate / se; let p = pNormal(statistic); let dfTest: number | null = null;
  const hksj = setup.hksj && k >= 2;
  if (setup.hksj && k < 2) warnings.push('Hartung-Knapp needs at least 2 studies.');
  if (hksj) {
    const q = sum(studies.map((study, i) => w[i] * (study.yi - estimate) ** 2)) / (k - 1);
    se = Math.sqrt(q / sws);
    const t = tQuantile(0.975, k - 1);
    lower = estimate - t * se; upper = estimate + t * se; statistic = estimate / se; p = se > 0 ? tTwoTailed(statistic, k - 1) : 0; dfTest = k - 1;
  }
  // Higgins, Thompson and Spiegelhalter (2009): t with k − 2 df, from tau² and the estimate's variance.
  let prediction: [number, number] | null = null;
  if (k >= 3) {
    const t = tQuantile(0.975, k - 2);
    const half = t * Math.sqrt(tau2 + seRe ** 2);
    prediction = [estimate - half, estimate + half];
  }
  return { k, model: 'random', method, hksj, estimate, se, lower, upper, statistic, p, df_test: dfTest, tau2, tau: Math.sqrt(tau2), ...het, prediction, weights: percent(w), converged, iterations, warnings };
}

// ------------------------------------------------------------------ subgroups, sensitivity, small-study effects

export type SubgroupResult = { name: string; pooled: Pooled; studies: number[] };
export type SubgroupTest = { groups: SubgroupResult[]; Q: number; df: number; p: number } | null;

const NO_SUBGROUP = 'Not assigned';

export function subgroups(studies: StudyEffect[], setup: Setup): SubgroupTest {
  const names = [...new Set(studies.map((study) => study.subgroup ?? NO_SUBGROUP))];
  if (names.length < 2 || names.every((name) => name === NO_SUBGROUP)) return null;
  const groups = names.map((name) => {
    const members = studies.filter((study) => (study.subgroup ?? NO_SUBGROUP) === name);
    return { name, pooled: pool(members, setup)!, studies: members.map((study) => study.index) };
  });
  const w = groups.map((group) => 1 / group.pooled.se ** 2);
  const mu = sum(groups.map((group, i) => w[i] * group.pooled.estimate)) / sum(w);
  const Q = sum(groups.map((group, i) => w[i] * (group.pooled.estimate - mu) ** 2));
  const df = groups.length - 1;
  return { groups, Q, df, p: chiSquareUpper(Q, df) };
}

export type LeaveOneOut = { index: number; label: string; estimate: number; lower: number; upper: number; p: number; I2: number; tau2: number };

export function leaveOneOut(studies: StudyEffect[], setup: Setup): LeaveOneOut[] {
  if (studies.length < 3) return [];
  return studies.map((study) => {
    const rest = pool(studies.filter((other) => other !== study), setup)!;
    return { index: study.index, label: study.label, estimate: rest.estimate, lower: rest.lower, upper: rest.upper, p: rest.p, I2: rest.I2, tau2: rest.tau2 };
  });
}

export type Egger = { intercept: number; se: number; t: number; df: number; p: number; slope: number; warning: string | null } | null;

/** Egger's test: the standard normal deviate (y / se) regressed on precision (1 / se); the intercept tested with t(k − 2). */
export function eggerTest(studies: StudyEffect[]): Egger {
  const k = studies.length;
  if (k < 3) return null;
  const x = studies.map((study) => 1 / study.se);
  const y = studies.map((study) => study.yi / study.se);
  const mx = sum(x) / k; const my = sum(y) / k;
  const sxx = sum(x.map((value) => (value - mx) ** 2));
  if (!(sxx > 0)) return null;
  const slope = sum(x.map((value, i) => (value - mx) * (y[i] - my))) / sxx;
  const intercept = my - slope * mx;
  const residual = sum(y.map((value, i) => (value - intercept - slope * x[i]) ** 2)) / (k - 2);
  const se = Math.sqrt(residual * (1 / k + mx ** 2 / sxx));
  const t = intercept / se;
  return {
    intercept, se, t, df: k - 2, p: se > 0 ? tTwoTailed(t, k - 2) : 0, slope,
    warning: k < 10 ? `Only ${k} studies: with fewer than 10, the test has little power and funnel asymmetry can’t be judged reliably.` : null,
  };
}

export type Funnel = { points: { index: number; label: string; yi: number; se: number }[]; centre: number; maxSe: number };

export function funnelData(studies: StudyEffect[], centre: number): Funnel {
  return { points: studies.map((study) => ({ index: study.index, label: study.label, yi: study.yi, se: study.se })), centre, maxSe: Math.max(...studies.map((study) => study.se), 0) };
}

// ------------------------------------------------------------------ the whole analysis

export type Analysis = {
  setup: Setup; studies: StudyEffect[]; excluded: Excluded[]; errors: InputError[]; pooled: Pooled | null;
  subgroups: SubgroupTest; leaveOneOut: LeaveOneOut[]; egger: Egger; funnel: Funnel | null;
  participants: number; events: number | null;
};

export function analyse(rows: InputRow[], setup: Setup): Analysis {
  const { studies, excluded, errors } = effectSizes(rows, setup.data_type, setup.measure);
  const pooled = pool(studies, setup);
  const counted = studies.filter((study) => study.participants !== null);
  return {
    setup, studies, excluded, errors, pooled,
    subgroups: pooled ? subgroups(studies, setup) : null,
    leaveOneOut: pooled ? leaveOneOut(studies, setup) : [],
    egger: eggerTest(studies),
    funnel: pooled ? funnelData(studies, pooled.estimate) : null,
    participants: sum(counted.map((study) => study.participants!)),
    events: setup.data_type === 'binary' ? sum(studies.map((study) => study.events ?? 0)) : null,
  };
}

/** Back to the natural scale (exp for ratios). */
export const natural = (value: number, measure: Measure) => (isRatio(measure) ? Math.exp(value) : value);

export function formatEffect(value: number, measure: Measure): string {
  const shown = natural(value, measure);
  if (!Number.isFinite(shown)) return '—';
  const digits = measure === 'RD' ? 3 : 2;
  return shown.toFixed(Math.abs(shown) >= 100 ? 0 : digits);
}
export const formatInterval = (lower: number, upper: number, measure: Measure) => `${formatEffect(lower, measure)} to ${formatEffect(upper, measure)}`;
export const formatPValue = (p: number) => (p < 0.001 ? 'p < 0.001' : `p = ${p.toFixed(3)}`);

// ------------------------------------------------------------------ plain-English results

const HETEROGENEITY_WORDS = (i2: number) => (i2 < 30 ? 'might not be important' : i2 < 50 ? 'may be moderate' : i2 < 75 ? 'may be substantial' : 'is considerable');

export function resultSentences(analysis: Analysis, outcome: string): string[] {
  const { pooled, setup } = analysis;
  if (!pooled) return [];
  const m = setup.measure;
  const name = MEASURE_LABELS[m].replace(/ \(.*\)$/, '').toLowerCase();
  const model = pooled.model === 'fixed' ? `fixed-effect model, ${METHOD_LABELS[pooled.method]}` : `random-effects model, ${METHOD_LABELS[pooled.method]}${pooled.hksj ? ' with the Hartung-Knapp adjustment' : ''}`;
  const people = analysis.participants ? ` with ${analysis.participants.toLocaleString('en-US')} participants` : '';
  const out = [`Pooling ${pooled.k} ${pooled.k === 1 ? 'study' : 'studies'}${people}, the ${name} for ${outcome || 'this outcome'} was ${formatEffect(pooled.estimate, m)} (95% CI ${formatInterval(pooled.lower, pooled.upper, m)}; ${formatPValue(pooled.p)}; ${model}).`];
  const crosses = pooled.lower <= 0 && pooled.upper >= 0;
  out.push(crosses ? 'The confidence interval includes no difference, so the data are compatible with no effect.' : 'The confidence interval excludes no difference.');
  if (pooled.k >= 2) {
    out.push(`Heterogeneity ${HETEROGENEITY_WORDS(pooled.I2)} (I² = ${pooled.I2.toFixed(0)}%; Q = ${pooled.Q.toFixed(2)}, df = ${pooled.df}, ${formatPValue(pooled.pQ)}${pooled.model === 'random' ? `; tau² = ${pooled.tau2.toFixed(pooled.tau2 < 0.01 ? 4 : 3)}` : ''}).`);
  }
  if (pooled.prediction) out.push(`The 95% prediction interval, the range in which the effect in a new similar study would be expected to lie, was ${formatInterval(pooled.prediction[0], pooled.prediction[1], m)}.`);
  if (analysis.subgroups) out.push(`The test for subgroup differences gave Q = ${analysis.subgroups.Q.toFixed(2)}, df = ${analysis.subgroups.df}, ${formatPValue(analysis.subgroups.p)}.`);
  if (analysis.egger) out.push(`Egger’s test for small-study effects: intercept ${analysis.egger.intercept.toFixed(2)}, ${formatPValue(analysis.egger.p)}${analysis.egger.warning ? ' (fewer than 10 studies, so interpret with caution)' : ''}.`);
  const doubleZero = analysis.excluded.filter((item) => item.reason.includes('arm')).length;
  if (doubleZero) out.push(`${doubleZero} ${doubleZero === 1 ? 'study was' : 'studies were'} excluded because the event occurred in no one, or in everyone, in both arms.`);
  return out;
}

// ------------------------------------------------------------------ GRADE

export const DOWNGRADE_DOMAINS = [
  ['risk_of_bias', 'Risk of bias'], ['inconsistency', 'Inconsistency'], ['indirectness', 'Indirectness'], ['imprecision', 'Imprecision'], ['publication_bias', 'Publication bias'],
] as const;
export const UPGRADE_DOMAINS = [['large_effect', 'Large effect'], ['dose_response', 'Dose-response gradient'], ['confounding', 'Plausible confounding would reduce the effect']] as const;
export type DowngradeDomain = (typeof DOWNGRADE_DOMAINS)[number][0];
export type UpgradeDomain = (typeof UPGRADE_DOMAINS)[number][0];
export type Judgement = { level: 0 | 1 | 2; reason: string };
export type Grade = { design: 'randomised' | 'observational'; downgrade: Record<DowngradeDomain, Judgement>; upgrade: Record<UpgradeDomain, Judgement> };
export const CERTAINTY = ['very low', 'low', 'moderate', 'high'] as const;
export type Certainty = (typeof CERTAINTY)[number];

export function emptyGrade(design: Grade['design'] = 'randomised'): Grade {
  return {
    design,
    downgrade: Object.fromEntries(DOWNGRADE_DOMAINS.map(([id]) => [id, { level: 0, reason: '' }])) as Grade['downgrade'],
    upgrade: Object.fromEntries(UPGRADE_DOMAINS.map(([id]) => [id, { level: 0, reason: '' }])) as Grade['upgrade'],
  };
}

/** Randomised trials start high, observational studies low; downgrades subtract, upgrades (observational only) add. */
export function certainty(grade: Grade): { level: number; label: Certainty; start: Certainty } {
  const start = grade.design === 'randomised' ? 4 : 2;
  const down = sum(DOWNGRADE_DOMAINS.map(([id]) => grade.downgrade[id]?.level ?? 0));
  const up = grade.design === 'observational' ? sum(UPGRADE_DOMAINS.map(([id]) => grade.upgrade[id]?.level ?? 0)) : 0;
  const level = Math.min(4, Math.max(1, start - down + up));
  return { level, label: CERTAINTY[level - 1], start: CERTAINTY[start - 1] };
}

export type RobRatings = Record<string, string> | undefined;

/** Computed prompts for each domain. They are suggestions for the reviewers, never decisions. */
export function gradeHints(analysis: Analysis, robByRecord: Map<string, RobRatings>, design: Grade['design']): Partial<Record<DowngradeDomain | UpgradeDomain, string[]>> {
  const hints: Partial<Record<DowngradeDomain | UpgradeDomain, string[]>> = {};
  const add = (domain: DowngradeDomain | UpgradeDomain, text: string) => { (hints[domain] ??= []).push(text); };
  const { pooled, studies, setup } = analysis;
  if (!pooled) return hints;
  const rated = studies.map((study) => (study.record_id ? robByRecord.get(study.record_id) : undefined)).filter((rob): rob is Record<string, string> => Boolean(rob && Object.values(rob).some(Boolean)));
  const high = rated.filter((rob) => Object.values(rob).includes('high')).length;
  const concerns = rated.filter((rob) => !Object.values(rob).includes('high') && Object.values(rob).some((value) => value === 'some concerns' || value === 'unclear')).length;
  if (!rated.length) add('risk_of_bias', 'No risk-of-bias ratings in Extraction for these studies yet.');
  else {
    if (high) add('risk_of_bias', `${high} of ${studies.length} studies have at least one domain rated high risk in Extraction.`);
    if (concerns) add('risk_of_bias', `${concerns} more have some concerns or unclear ratings.`);
    if (!high && !concerns) add('risk_of_bias', `The ${rated.length} rated ${rated.length === 1 ? 'study is' : 'studies are'} rated low risk in every rated domain.`);
    if (rated.length < studies.length) add('risk_of_bias', `${studies.length - rated.length} ${studies.length - rated.length === 1 ? 'study has' : 'studies have'} no ratings.`);
  }
  if (pooled.k >= 2 && pooled.I2 > 50) add('inconsistency', `I² is ${pooled.I2.toFixed(0)}% (above 50%): consider serious inconsistency if it is not explained.`);
  if (pooled.k >= 2 && pooled.I2 <= 50) add('inconsistency', `I² is ${pooled.I2.toFixed(0)}%.`);
  if (pooled.prediction && pooled.prediction[0] < 0 && pooled.prediction[1] > 0) add('inconsistency', 'The prediction interval includes no difference.');
  if (pooled.lower <= 0 && pooled.upper >= 0) add('imprecision', 'The 95% CI crosses the line of no effect.');
  if (setup.data_type === 'binary' && analysis.events !== null && analysis.events < 300) add('imprecision', `Only ${analysis.events} events in all (under the 300-event rule of thumb for an optimal information size).`);
  if (setup.data_type === 'continuous' && analysis.participants < 400) add('imprecision', `Only ${analysis.participants} participants in all (under the 400-participant rule of thumb).`);
  if (pooled.k < 10) add('publication_bias', `${pooled.k} ${pooled.k === 1 ? 'study' : 'studies'}: with fewer than 10, funnel asymmetry can’t be assessed. Judge from the search (unpublished trials, registries, industry funding).`);
  else if (analysis.egger && analysis.egger.p < 0.1) add('publication_bias', `Egger’s test suggests small-study effects (p = ${analysis.egger.p.toFixed(3)}).`);
  else if (analysis.egger) add('publication_bias', `Egger’s test shows no clear asymmetry (p = ${analysis.egger.p.toFixed(3)}).`);
  if (design === 'observational' && isRatio(setup.measure)) {
    const shown = Math.exp(Math.abs(pooled.estimate));
    if (shown >= 5) add('large_effect', `The pooled ratio is ${formatEffect(pooled.estimate, setup.measure)}: a very large effect (above 5 or below 0.2) may justify +2.`);
    else if (shown >= 2) add('large_effect', `The pooled ratio is ${formatEffect(pooled.estimate, setup.measure)}: a large effect (above 2 or below 0.5) may justify +1.`);
  }
  return hints;
}

// ------------------------------------------------------------------ summary of findings

export type SofRow = { outcome: string; studies: number; participants: number | null; effect: string; certainty: Certainty; reasons: string };

export function summaryRow(outcome: string, analysis: Analysis, grade: Grade): SofRow {
  const { pooled, setup } = analysis;
  const effect = pooled ? `${MEASURE_SHORT[setup.measure]} ${formatEffect(pooled.estimate, setup.measure)} (95% CI ${formatInterval(pooled.lower, pooled.upper, setup.measure)})` : 'Not estimable';
  const reasons = [
    ...DOWNGRADE_DOMAINS.filter(([id]) => grade.downgrade[id]?.level).map(([id, label]) => `${label} (−${grade.downgrade[id].level})${grade.downgrade[id].reason ? `: ${grade.downgrade[id].reason}` : ''}`),
    ...(grade.design === 'observational' ? UPGRADE_DOMAINS.filter(([id]) => grade.upgrade[id]?.level).map(([id, label]) => `${label} (+${grade.upgrade[id].level})${grade.upgrade[id].reason ? `: ${grade.upgrade[id].reason}` : ''}`) : []),
  ].join('; ');
  return { outcome, studies: pooled?.k ?? 0, participants: analysis.participants || null, effect, certainty: certainty(grade).label, reasons: `${grade.design === 'randomised' ? 'Randomised trials' : 'Observational studies'}${reasons ? `; ${reasons}` : ''}` };
}

const csvCell = (value: unknown) => { const text = value === null || value === undefined ? '' : String(value); return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; };

export function summaryCsv(rows: SofRow[]): string {
  const header = ['Outcome', 'Studies', 'Participants', 'Effect (95% CI)', 'Certainty (GRADE)', 'Reasons'];
  return [header, ...rows.map((row) => [row.outcome, row.studies, row.participants ?? '', row.effect, row.certainty, row.reasons])].map((line) => line.map(csvCell).join(',')).join('\r\n');
}

// ------------------------------------------------------------------ prefilling from extraction

/** The first number in an extraction cell ("120 (60%)" → 120, "1,204" → 1204), or null. */
export function parseNumber(text: string | null | undefined): number | null {
  const match = String(text ?? '').replace(/(\d),(?=\d{3}\b)/g, '$1').replace(/[−–]/g, '-').match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/i);
  return match ? Number(match[0]) : null;
}

/** A column is offered for mapping when most of its filled cells start with a number. */
export function looksNumeric(values: (string | null | undefined)[]): boolean {
  const filled = values.map((value) => String(value ?? '').trim()).filter(Boolean);
  if (!filled.length) return false;
  return filled.filter((value) => /^[\s(]*[-−–]?\d/.test(value)).length / filled.length >= 0.5;
}
