/**
 * Data Lab statistics for theses and clinical studies, beyond lib/stats.ts and
 * components/app/analysis/stats.ts: rank tests (Spearman, Wilcoxon signed-rank, Kruskal-Wallis),
 * exact tests for small tables (Fisher, McNemar), logistic regression, survival (Kaplan-Meier and
 * the log-rank test), diagnostic accuracy, ROC curves and scale reliability (Cronbach's alpha).
 *
 * Calculated, never generated, and pure: they run in the browser and in tests
 * (tests/server/data-lab-stats.test.ts checks them against scipy and statsmodels).
 */
import { chiSquareUpper, fixed, formatP, frequencies, incompleteBeta, logGamma, mean, noLeadingZero, tTwoTailed, type TestResult } from './stats';

// ------------------------------------------------------------------ shared helpers

/** Standard normal CDF (via erfc, so small tail probabilities keep their precision). */
export function normCdf(z: number): number {
  // The Chebyshev erfc approximation of Numerical Recipes (erfcc): fractional error under 1.2e-7 everywhere.
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.5 * x);
  const erfc = t * Math.exp(-x * x - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return z >= 0 ? 1 - erfc / 2 : erfc / 2;
}
const twoSidedZ = (z: number) => Math.min(1, 2 * (1 - normCdf(Math.abs(z))));
const Z95 = 1.959963984540054;

/** Ranks with ties given their average rank, and the tie groups' sizes. */
export function averageRanks(values: number[]): { ranks: number[]; ties: number[] } {
  const order = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const ranks = new Array<number>(values.length);
  const ties: number[] = [];
  for (let i = 0; i < order.length;) {
    let j = i;
    while (j + 1 < order.length && order[j + 1].value === order[i].value) j += 1;
    const rank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k += 1) ranks[order[k].index] = rank;
    if (j > i) ties.push(j - i + 1);
    i = j + 1;
  }
  return { ranks, ties };
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const sampleVariance = (xs: number[]) => { const m = mean(xs); return sum(xs.map((x) => (x - m) ** 2)) / (xs.length - 1); };
const empty = (title: string, warning: string): TestResult => ({ title, rows: [], apa: '', warnings: [warning] });
const logChoose = (n: number, k: number) => logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);

function pairsOf(x: (number | null)[], y: (number | null)[]) {
  const xs: number[] = []; const ys: number[] = [];
  x.forEach((value, index) => { const other = y[index]; if (value !== null && other !== null && other !== undefined && Number.isFinite(value) && Number.isFinite(other)) { xs.push(value); ys.push(other); } });
  return [xs, ys] as const;
}

function pearsonR(xs: number[], ys: number[]) {
  const mx = mean(xs); const my = mean(ys);
  let sxy = 0; let sxx = 0; let syy = 0;
  xs.forEach((value, i) => { sxy += (value - mx) * (ys[i] - my); sxx += (value - mx) ** 2; syy += (ys[i] - my) ** 2; });
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : NaN;
}

/** The regularised beta function's inverse, by bisection (for Clopper-Pearson intervals). */
export function betaQuantile(p: number, a: number, b: number): number {
  let lo = 0; let hi = 1;
  for (let i = 0; i < 100; i += 1) {
    const mid = (lo + hi) / 2;
    if (incompleteBeta(mid, a, b) < p) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Exact (Clopper-Pearson) 95% confidence interval for x successes in n. */
export function clopperPearson(x: number, n: number, level = 0.95): [number, number] {
  if (n <= 0) return [NaN, NaN];
  const alpha = 1 - level;
  return [x === 0 ? 0 : betaQuantile(alpha / 2, x, n - x + 1), x === n ? 1 : betaQuantile(1 - alpha / 2, x + 1, n - x)];
}

const pct = (value: number) => (Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : '—');
const ci = ([lo, hi]: [number, number], format: (value: number) => string = (value) => fixed(value)) => `${format(lo)}–${format(hi)}`;

/** Solves A x = b by Gauss-Jordan elimination with partial pivoting; null when A is singular. Also returns A⁻¹. */
export function solve(matrix: number[][], rhs: number[]): { x: number[]; inverse: number[][] } | null {
  const n = matrix.length;
  const a = matrix.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)), rhs[i]]);
  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < n; row += 1) if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    const scale = Math.max(1e-300, ...matrix.map((row) => Math.abs(row[col])));
    if (Math.abs(a[pivot][col]) < 1e-12 * scale) return null;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    const div = a[col][col];
    for (let k = 0; k < a[col].length; k += 1) a[col][k] /= div;
    for (let row = 0; row < n; row += 1) {
      if (row === col || a[row][col] === 0) continue;
      const factor = a[row][col];
      for (let k = 0; k < a[row].length; k += 1) a[row][k] -= factor * a[col][k];
    }
  }
  return { x: a.map((row) => row[2 * n]), inverse: a.map((row) => row.slice(n, 2 * n)) };
}

// ------------------------------------------------------------------ Spearman

/** Spearman rank correlation; p from the t approximation (as R's cor.test with exact = FALSE). */
export function spearman(x: (number | null)[], y: (number | null)[], names: [string, string]): TestResult {
  const title = `Spearman correlation: ${names[0]} and ${names[1]}`;
  const [xs, ys] = pairsOf(x, y);
  const n = xs.length;
  if (n < 4) return empty(title, 'Need at least 4 cases with both values.');
  const rs = pearsonR(averageRanks(xs).ranks, averageRanks(ys).ranks);
  if (!Number.isFinite(rs)) return empty(title, 'One of the variables has the same value in every case.');
  const df = n - 2;
  const p = Math.abs(rs) >= 1 ? 0 : tTwoTailed(rs * Math.sqrt(df / (1 - rs * rs)), df);
  const strength = Math.abs(rs) < 0.1 ? 'negligible' : Math.abs(rs) < 0.3 ? 'weak' : Math.abs(rs) < 0.5 ? 'moderate' : 'strong';
  return {
    title,
    rows: [['rs', noLeadingZero(rs)], ['N', String(n)], ['df', String(df)], ['p (two-tailed)', formatP(p)]],
    apa: `There was a ${strength} ${rs >= 0 ? 'positive' : 'negative'} monotonic relationship between ${names[0]} and ${names[1]}, rs(${df}) = ${noLeadingZero(rs)}, ${formatP(p)}.`,
    warnings: n < 30 ? ['Small sample: the estimate is imprecise.'] : [],
  };
}

// ------------------------------------------------------------------ Wilcoxon signed-rank

/** Exact distribution of the signed-rank statistic V for n untied ranks: counts of each sum. */
function signedRankCounts(n: number): number[] {
  const max = (n * (n + 1)) / 2;
  let counts = new Array<number>(max + 1).fill(0);
  counts[0] = 1;
  for (let rank = 1; rank <= n; rank += 1) {
    const next = [...counts];
    for (let s = rank; s <= max; s += 1) next[s] += counts[s - rank];
    counts = next;
  }
  return counts;
}

/**
 * Wilcoxon signed-rank test for two paired measures. Zero differences are dropped. Exact p when
 * there are fewer than 50 pairs and no ties or zeros; otherwise the normal approximation with tie
 * and continuity corrections (as R's wilcox.test).
 */
export function wilcoxonSignedRank(x: (number | null)[], y: (number | null)[], names: [string, string]): TestResult {
  const title = `Wilcoxon signed-rank test: ${names[0]} vs ${names[1]}`;
  const [xs, ys] = pairsOf(x, y);
  const all = xs.map((value, i) => value - ys[i]);
  const diffs = all.filter((d) => d !== 0);
  const zeros = all.length - diffs.length;
  const n = diffs.length;
  if (n < 2) return empty(title, 'Need at least 2 pairs that differ.');
  const { ranks, ties } = averageRanks(diffs.map(Math.abs));
  const v = sum(ranks.filter((_, i) => diffs[i] > 0));
  const expected = (n * (n + 1)) / 4;
  const sigma = Math.sqrt((n * (n + 1) * (2 * n + 1)) / 24 - sum(ties.map((t) => t ** 3 - t)) / 48);
  const zRaw = sigma ? (v - expected) / sigma : 0;
  let p: number;
  let method: string;
  if (n < 50 && !ties.length && !zeros) {
    const counts = signedRankCounts(n);
    const total = 2 ** n;
    const lower = sum(counts.slice(0, Math.floor(v) + 1)) / total;
    const upper = sum(counts.slice(Math.ceil(v))) / total;
    p = Math.min(1, 2 * Math.min(lower, upper));
    method = 'exact';
  } else {
    const correction = Math.sign(v - expected) * 0.5;
    p = twoSidedZ(sigma ? (v - expected - correction) / sigma : 0);
    method = 'normal approximation';
  }
  const r = Math.abs(zRaw) / Math.sqrt(n);
  const median = (values: number[]) => { const s = [...values].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  return {
    title,
    rows: [
      [`${names[0]}: Mdn`, fixed(median(xs))], [`${names[1]}: Mdn`, fixed(median(ys))], ['Pairs (differences ≠ 0)', `${xs.length} (${n})`],
      ['V (sum of positive ranks)', fixed(v, 1)], ['z', fixed(zRaw)], [`p (two-tailed, ${method})`, formatP(p)], ['r (effect size)', noLeadingZero(r)],
    ],
    apa: `A Wilcoxon signed-rank test showed that ${names[0]} (Mdn = ${fixed(median(xs))}) was ${p < 0.05 ? '' : 'not '}significantly different from ${names[1]} (Mdn = ${fixed(median(ys))}), V = ${fixed(v, 1)}, z = ${fixed(zRaw)}, ${formatP(p)}, r = ${noLeadingZero(r)}.`,
    warnings: [...(zeros ? [`${zeros} pair${zeros === 1 ? '' : 's'} with no difference ${zeros === 1 ? 'was' : 'were'} left out.`] : []), ...(n < 10 ? ['Very few pairs: the test has little power.'] : [])],
  };
}

// ------------------------------------------------------------------ Kruskal-Wallis

/** Kruskal-Wallis H test across the groups of a categorical column (tie-corrected, as R's kruskal.test). */
export function kruskalWallis(outcome: (number | null)[], groups: (string | null)[], names: [string, string]): TestResult {
  const title = `Kruskal-Wallis test: ${names[0]} by ${names[1]}`;
  const values: number[] = []; const labels: string[] = [];
  outcome.forEach((value, i) => { const group = groups[i]; if (value !== null && Number.isFinite(value) && group !== null) { values.push(value); labels.push(group); } });
  const levels = frequencies(labels).map((item) => item.value);
  if (levels.length < 2) return empty(title, 'Need at least two groups.');
  if (levels.length > 30) return empty(title, `${names[1]} has ${levels.length} groups; pick a column with fewer.`);
  const n = values.length;
  const { ranks, ties } = averageRanks(values);
  let h = 0;
  const groupRows: [string, string][] = [];
  for (const level of levels) {
    const member = ranks.filter((_, i) => labels[i] === level);
    const groupValues = values.filter((_, i) => labels[i] === level).sort((a, b) => a - b);
    const m = Math.floor(groupValues.length / 2);
    const median = groupValues.length % 2 ? groupValues[m] : (groupValues[m - 1] + groupValues[m]) / 2;
    h += sum(member) ** 2 / member.length;
    groupRows.push([`${level}: Mdn, mean rank, n`, `${fixed(median)}, ${fixed(mean(member), 1)}, ${member.length}`]);
  }
  h = (12 / (n * (n + 1))) * h - 3 * (n + 1);
  const correction = 1 - sum(ties.map((t) => t ** 3 - t)) / (n ** 3 - n);
  if (correction <= 0) return empty(title, `${names[0]} has the same value in every case.`);
  h /= correction;
  const df = levels.length - 1;
  const p = chiSquareUpper(h, df);
  const epsilon = h / (n - 1);
  return {
    title,
    rows: [...groupRows, ['H', fixed(h)], ['df', String(df)], ['p', formatP(p)], ['ε² (effect size)', noLeadingZero(epsilon)]],
    apa: `A Kruskal-Wallis test found ${p < 0.05 ? 'a' : 'no'} significant difference in ${names[0]} between the groups of ${names[1]}, H(${df}) = ${fixed(h)}, ${formatP(p)}, ε² = ${noLeadingZero(epsilon)}.`,
    warnings: [
      ...(p < 0.05 && levels.length > 2 ? ['A significant result does not say which groups differ; follow with pairwise Mann-Whitney tests and a correction for multiple comparisons (e.g. Bonferroni or Holm).'] : []),
      ...(Math.min(...levels.map((level) => labels.filter((label) => label === level).length)) < 5 ? ['Some groups have fewer than 5 cases: the chi-square approximation is rough.'] : []),
    ],
  };
}

// ------------------------------------------------------------------ Fisher's exact test and McNemar

function twoByTwo(x: (string | null)[], y: (string | null)[]) {
  const rowLevels = [...new Set(x.filter((value, i): value is string => value !== null && y[i] !== null))].sort();
  const colLevels = [...new Set(y.filter((value, i): value is string => value !== null && x[i] !== null))].sort();
  const table = [[0, 0], [0, 0]];
  if (rowLevels.length === 2 && colLevels.length === 2) x.forEach((value, i) => { const other = y[i]; if (value !== null && other !== null) table[rowLevels.indexOf(value)][colLevels.indexOf(other)] += 1; });
  return { rowLevels, colLevels, table };
}

/** Two-sided p of Fisher's exact test for a 2 × 2 table (as R's fisher.test). */
export function fisherExactP(table: number[][]): number {
  const [[a, b], [c, d]] = table;
  const r1 = a + b; const r2 = c + d; const c1 = a + c; const n = r1 + r2;
  const logP = (k: number) => logChoose(r1, k) + logChoose(r2, c1 - k) - logChoose(n, c1);
  const observed = logP(a);
  let p = 0;
  for (let k = Math.max(0, c1 - r2); k <= Math.min(r1, c1); k += 1) {
    const lp = logP(k);
    if (lp <= observed + 1e-7) p += Math.exp(lp);
  }
  return Math.min(1, p);
}

/** Fisher's exact test for two variables with two categories each, with the odds ratio. */
export function fisherExact(x: (string | null)[], y: (string | null)[], names: [string, string]): TestResult {
  const title = `Fisher’s exact test: ${names[0]} and ${names[1]}`;
  const { rowLevels, colLevels, table } = twoByTwo(x, y);
  if (rowLevels.length !== 2 || colLevels.length !== 2) return empty(title, `Fisher’s exact test here needs two categories in each variable (${names[0]} has ${rowLevels.length}, ${names[1]} has ${colLevels.length}). Use chi-square for larger tables.`);
  const [[a, b], [c, d]] = table;
  const p = fisherExactP(table);
  const zero = [a, b, c, d].some((cell) => cell === 0);
  const [aa, bb, cc, dd] = zero ? [a + 0.5, b + 0.5, c + 0.5, d + 0.5] : [a, b, c, d];
  const or = (aa * dd) / (bb * cc);
  const se = Math.sqrt(1 / aa + 1 / bb + 1 / cc + 1 / dd);
  const interval: [number, number] = [Math.exp(Math.log(or) - Z95 * se), Math.exp(Math.log(or) + Z95 * se)];
  return {
    title,
    rows: [
      [`${rowLevels[0]} × ${colLevels[0]} / ${colLevels[1]}`, `${a} / ${b}`], [`${rowLevels[1]} × ${colLevels[0]} / ${colLevels[1]}`, `${c} / ${d}`],
      ['N', String(a + b + c + d)], ['p (two-tailed, exact)', formatP(p)], ['Odds ratio (95% CI)', `${fixed(or)} (${ci(interval)})`],
    ],
    apa: `Fisher’s exact test found ${p < 0.05 ? 'a significant' : 'no significant'} association between ${names[0]} and ${names[1]}, ${formatP(p)}, OR = ${fixed(or)}, 95% CI [${fixed(interval[0])}, ${fixed(interval[1])}].`,
    warnings: zero ? ['A cell is empty, so 0.5 was added to every cell for the odds ratio (Haldane correction). The p value is exact and unaffected.'] : [],
  };
}

/** P(X ≤ k) for X ~ Binomial(n, 1/2). */
function binomHalfCdf(k: number, n: number) {
  let total = 0;
  for (let i = 0; i <= k; i += 1) total += Math.exp(logChoose(n, i) - n * Math.LN2);
  return total;
}

/** McNemar's test for a yes/no outcome measured twice on the same cases (exact binomial p). */
export function mcnemar(x: (string | null)[], y: (string | null)[], names: [string, string]): TestResult {
  const title = `McNemar’s test: ${names[0]} vs ${names[1]}`;
  const levels = [...new Set([...x, ...y].filter((value, i): value is string => value !== null && (i < x.length ? y[i] !== null : x[i - x.length] !== null)))].sort();
  if (levels.length !== 2) return empty(title, `Both measures must use the same two categories (found ${levels.length}: ${levels.slice(0, 5).join(', ')}).`);
  let b = 0; let c = 0; let n = 0;
  x.forEach((value, i) => {
    const other = y[i];
    if (value === null || other === null) return;
    n += 1;
    if (value === levels[0] && other === levels[1]) b += 1;
    if (value === levels[1] && other === levels[0]) c += 1;
  });
  const discordant = b + c;
  if (!discordant) return empty(title, 'No case changed category, so there is nothing to test.');
  const p = Math.min(1, 2 * binomHalfCdf(Math.min(b, c), discordant));
  const chi = (Math.abs(b - c) - 1) ** 2 / discordant;
  return {
    title,
    rows: [
      [`${levels[0]} → ${levels[1]}`, String(b)], [`${levels[1]} → ${levels[0]}`, String(c)], ['Pairs', String(n)],
      ['χ² (continuity-corrected)', fixed(chi)], ['p (two-tailed, exact)', formatP(p)],
    ],
    apa: `McNemar’s test found ${p < 0.05 ? 'a significant' : 'no significant'} change between ${names[0]} and ${names[1]}: ${b} cases changed from ${levels[0]} to ${levels[1]} and ${c} from ${levels[1]} to ${levels[0]}, ${formatP(p)} (exact).`,
    warnings: [],
  };
}

// ------------------------------------------------------------------ logistic regression

export type LogisticPredictor = { name: string; kind: 'numeric' | 'categorical'; values: (number | null)[]; labels: (string | null)[] };

/** The level counted as the event: the one asked for, else R's choice (the second in sorted order). */
export function eventLevel(levels: string[], requested?: string | null): string | null {
  if (requested && levels.includes(requested)) return requested;
  return levels.length === 2 ? [...levels].sort()[1] : null;
}

/**
 * Binary logistic regression by Newton-Raphson (IRLS), with numeric and categorical predictors
 * (categorical ones dummy-coded against their first level in sorted order, as R does).
 * Odds ratios with Wald 95% intervals (as R's confint.default), the likelihood-ratio test of the
 * model and Nagelkerke's R².
 */
export function logisticRegression(outcome: { name: string; labels: (string | null)[] }, predictors: LogisticPredictor[], positive?: string | null): TestResult {
  const title = `Logistic regression: ${outcome.name} on ${predictors.map((p) => p.name).join(', ')}`;
  if (!predictors.length) return empty(title, 'Choose at least one predictor.');
  if (predictors.length > 10) return empty(title, 'Up to 10 predictors.');
  const rowsOk = outcome.labels.map((label, i) => label !== null && predictors.every((p) => (p.kind === 'numeric' ? p.values[i] !== null && Number.isFinite(p.values[i] as number) : p.labels[i] !== null)));
  const used = rowsOk.map((ok, i) => (ok ? i : -1)).filter((i) => i >= 0);
  const levels = [...new Set(used.map((i) => outcome.labels[i] as string))];
  if (levels.length !== 2) return empty(title, `The outcome must have exactly two categories (it has ${levels.length}).`);
  const event = eventLevel(levels, positive)!;
  const y = used.map((i) => (outcome.labels[i] === event ? 1 : 0));
  const columns: { label: string; values: number[] }[] = [];
  const references: string[] = [];
  for (const predictor of predictors) {
    if (predictor.kind === 'numeric') { columns.push({ label: predictor.name, values: used.map((i) => predictor.values[i] as number) }); continue; }
    const predictorLevels = [...new Set(used.map((i) => predictor.labels[i] as string))].sort();
    if (predictorLevels.length < 2) return empty(title, `${predictor.name} has only one category among the complete cases.`);
    if (predictorLevels.length > 10) return empty(title, `${predictor.name} has ${predictorLevels.length} categories; use one with 10 or fewer.`);
    references.push(`${predictor.name}: ${predictorLevels[0]}`);
    for (const level of predictorLevels.slice(1)) columns.push({ label: `${predictor.name}: ${level}`, values: used.map((i) => (predictor.labels[i] === level ? 1 : 0)) });
  }
  const n = y.length;
  const k = columns.length;
  const events = sum(y);
  if (n < k + 2) return empty(title, 'Too few complete cases for this many predictors.');
  const X = used.map((_, row) => [1, ...columns.map((column) => column.values[row])]);
  let beta = new Array<number>(k + 1).fill(0);
  let inverse: number[][] | null = null;
  let converged = false;
  let iterations = 0;
  for (; iterations < 100; iterations += 1) {
    const p = X.map((row) => 1 / (1 + Math.exp(-row.reduce((acc, value, j) => acc + value * beta[j], 0))));
    const gradient = beta.map((_, j) => sum(X.map((row, i) => row[j] * (y[i] - p[i]))));
    const hessian = beta.map((_, a) => beta.map((__, b) => sum(X.map((row, i) => row[a] * row[b] * p[i] * (1 - p[i])))));
    const step = solve(hessian, gradient);
    // Singular at the start: collinear predictors. Singular later: the fit is running off to infinity (separation).
    if (!step && iterations === 0) return empty(title, 'The predictors are collinear (one is a combination of the others) or a category is empty. Remove one and try again.');
    if (!step) break;
    beta = beta.map((value, j) => value + step.x[j]);
    inverse = step.inverse;
    if (Math.max(...step.x.map(Math.abs)) < 1e-10) { converged = true; break; }
  }
  // The covariance at the final estimate.
  const pHat = X.map((row) => 1 / (1 + Math.exp(-row.reduce((acc, value, j) => acc + value * beta[j], 0))));
  const finalHessian = beta.map((_, a) => beta.map((__, b) => sum(X.map((row, i) => row[a] * row[b] * pHat[i] * (1 - pHat[i])))));
  inverse = solve(finalHessian, beta.map(() => 0))?.inverse ?? inverse;
  if (!inverse) return empty(title, 'The model could not be estimated: a predictor separates the outcome perfectly (separation). Combine categories or use penalised (Firth) regression in a statistics package.');
  const separated = !converged || beta.some((value) => Math.abs(value) > 15) || pHat.some((value) => value < 1e-9 || value > 1 - 1e-9);
  const clamp = (value: number) => Math.min(1 - 1e-15, Math.max(1e-15, value));
  const ll = sum(y.map((value, i) => (value ? Math.log(clamp(pHat[i])) : Math.log(1 - clamp(pHat[i])))));
  const ybar = events / n;
  const ll0 = n * (ybar * Math.log(ybar) + (1 - ybar) * Math.log(1 - ybar));
  const lr = 2 * (ll - ll0);
  const lrP = chiSquareUpper(Math.max(0, lr), k);
  const coxSnell = 1 - Math.exp((2 * (ll0 - ll)) / n);
  const nagelkerke = coxSnell / (1 - Math.exp((2 * ll0) / n));
  const correct = sum(y.map((value, i) => ((pHat[i] >= 0.5 ? 1 : 0) === value ? 1 : 0)));
  const coefficientRows: [string, string][] = columns.map((column, j) => {
    const b = beta[j + 1];
    const se = Math.sqrt(inverse![j + 1][j + 1]);
    const p = twoSidedZ(b / se);
    return [`${column.label}: OR (95% CI), p`, `${fixed(Math.exp(b))} (${fixed(Math.exp(b - Z95 * se))}–${fixed(Math.exp(b + Z95 * se))}), ${formatP(p)}`];
  });
  const bRows: [string, string][] = [['Intercept: B (SE)', `${fixed(beta[0], 3)} (${fixed(Math.sqrt(inverse[0][0]), 3)})`], ...columns.map((column, j): [string, string] => [`${column.label}: B (SE)`, `${fixed(beta[j + 1], 3)} (${fixed(Math.sqrt(inverse![j + 1][j + 1]), 3)})`])];
  const fewest = Math.min(events, n - events);
  return {
    title,
    rows: [
      ['Outcome (event)', `${outcome.name} = ${event}`], ['N (events)', `${n} (${events})`], ...(references.length ? [['Reference categories', references.join('; ')] as [string, string]] : []),
      ...coefficientRows, ...bRows,
      ['Model χ² (likelihood ratio)', `χ²(${k}) = ${fixed(lr)}, ${formatP(lrP)}`], ['Nagelkerke R²', noLeadingZero(nagelkerke)], ['Correctly classified (cut-off .5)', pct(correct / n)],
    ],
    apa: `A logistic regression of ${outcome.name} (${event}) on ${predictors.map((p) => p.name).join(', ')} was ${lrP < 0.05 ? '' : 'not '}statistically significant, χ²(${k}) = ${fixed(lr)}, ${formatP(lrP)}, Nagelkerke R² = ${noLeadingZero(nagelkerke)}. ` +
      columns.map((column, j) => { const b = beta[j + 1]; const se = Math.sqrt(inverse![j + 1][j + 1]); return `${column.label}: OR = ${fixed(Math.exp(b))}, 95% CI [${fixed(Math.exp(b - Z95 * se))}, ${fixed(Math.exp(b + Z95 * se))}], ${formatP(twoSidedZ(b / se))}`; }).join('; ') + '.',
    warnings: [
      ...(separated ? ['The model did not settle: a predictor (or a category) may predict the outcome perfectly (separation). The odds ratios and intervals are not reliable; combine categories or use penalised (Firth) regression in a statistics package.'] : []),
      ...(fewest / k < 10 ? [`Only ${fewest} cases in the smaller outcome group for ${k} predictor term${k === 1 ? '' : 's'}: fewer than 10 per term makes the estimates unstable.`] : []),
      ...(used.length < outcome.labels.length ? [`${outcome.labels.length - used.length} cases with a missing value were left out.`] : []),
    ],
  };
}

// ------------------------------------------------------------------ survival

export type SurvivalChart = { kind: 'survival' | 'roc'; x: string; y: string; series: { name: string; points: [number, number][] }[] };
export type ChartResult = TestResult & { chart?: SurvivalChart };

/** The value of an event column that means "the event happened". */
export function guessEvent(levels: string[], requested?: string | null): string | null {
  if (requested && levels.includes(requested)) return requested;
  const lower = levels.map((level) => level.toLowerCase());
  for (const word of ['1', 'yes', 'event', 'dead', 'died', 'death', 'deceased', 'true', 'relapse', 'relapsed', 'recurrence', 'failure', 'failed', 'progressed', 'positive', 'pos', '+', 'case', 'disease', 'diseased', 'present', 'abnormal', 'sick', 'ill', 'malignant', 'detected', 'reactive']) {
    const at = lower.indexOf(word);
    if (at >= 0 && levels.length <= 2) return levels[at];
  }
  return null;
}

type KmStep = { time: number; atRisk: number; events: number; survival: number; lower: number; upper: number };

/** Kaplan-Meier estimate with log-transformed 95% intervals (Greenwood), as R's survfit default. */
export function kaplanMeier(times: number[], events: boolean[]): { steps: KmStep[]; median: number | null; medianLower: number | null; medianUpper: number | null } {
  const order = times.map((time, i) => ({ time, event: events[i] })).sort((a, b) => a.time - b.time);
  const steps: KmStep[] = [];
  let atRisk = order.length;
  let survival = 1;
  let greenwood = 0;
  for (let i = 0; i < order.length;) {
    const time = order[i].time;
    let d = 0; let removed = 0;
    while (i < order.length && order[i].time === time) { if (order[i].event) d += 1; removed += 1; i += 1; }
    if (d > 0) {
      survival *= 1 - d / atRisk;
      if (atRisk > d) greenwood += d / (atRisk * (atRisk - d));
      const se = Math.sqrt(greenwood);
      steps.push({ time, atRisk, events: d, survival, lower: survival > 0 ? survival * Math.exp(-Z95 * se) : 0, upper: survival > 0 ? Math.min(1, survival * Math.exp(Z95 * se)) : 0 });
    }
    atRisk -= removed;
  }
  const crossing = (pick: (step: KmStep) => number) => {
    for (let i = 0; i < steps.length; i += 1) {
      const value = pick(steps[i]);
      if (Math.abs(value - 0.5) < 1e-12 && i + 1 < steps.length) return (steps[i].time + steps[i + 1].time) / 2;
      if (value <= 0.5 + 1e-12) return steps[i].time;
    }
    return null;
  };
  return { steps, median: crossing((step) => step.survival), medianLower: crossing((step) => step.upper), medianUpper: crossing((step) => step.lower) };
}

/** The log-rank test (Mantel-Haenszel) across groups: χ² with groups − 1 degrees of freedom. */
export function logRank(times: number[], events: boolean[], groups: string[]): { chi: number; df: number; p: number; observed: number[]; expected: number[]; levels: string[] } | null {
  const levels = [...new Set(groups)].sort();
  const k = levels.length;
  if (k < 2) return null;
  const eventTimes = [...new Set(times.filter((_, i) => events[i]))].sort((a, b) => a - b);
  const observed = new Array<number>(k).fill(0);
  const expected = new Array<number>(k).fill(0);
  const variance = levels.map(() => new Array<number>(k).fill(0));
  for (const time of eventTimes) {
    const atRisk = levels.map((level) => times.filter((t, i) => groups[i] === level && t >= time).length);
    const deaths = levels.map((level) => times.filter((t, i) => groups[i] === level && t === time && events[i]).length);
    const n = sum(atRisk); const d = sum(deaths);
    for (let g = 0; g < k; g += 1) {
      observed[g] += deaths[g];
      expected[g] += (atRisk[g] * d) / n;
      if (n > 1) for (let h = 0; h < k; h += 1) variance[g][h] += (d * (n - d) * atRisk[g] * ((g === h ? n : 0) - atRisk[h])) / (n * n * (n - 1));
    }
  }
  const diff = observed.slice(0, k - 1).map((o, g) => o - expected[g]);
  const reduced = variance.slice(0, k - 1).map((row) => row.slice(0, k - 1));
  const solved = solve(reduced, diff);
  if (!solved) return null;
  const chi = sum(diff.map((value, g) => value * solved.x[g]));
  return { chi, df: k - 1, p: chiSquareUpper(chi, k - 1), observed, expected, levels };
}

/** Kaplan-Meier survival by group with the log-rank test, from a time column, an event column and an optional group. */
export function survivalAnalysis(time: { name: string; values: (number | null)[] }, event: { name: string; labels: (string | null)[] }, group: { name: string; labels: (string | null)[] } | null, eventValue?: string | null): ChartResult {
  const title = `Kaplan-Meier survival: ${time.name}${group ? ` by ${group.name}` : ''}`;
  const eventLevels = [...new Set(event.labels.filter((value): value is string => value !== null))];
  const chosen = guessEvent(eventLevels, eventValue);
  if (!chosen) return empty(title, `Choose which value of ${event.name} means the event happened.`);
  const rows: { t: number; e: boolean; g: string }[] = [];
  time.values.forEach((value, i) => {
    const e = event.labels[i]; const g = group ? group.labels[i] : 'All';
    if (value !== null && Number.isFinite(value) && e !== null && g !== null) rows.push({ t: value, e: e === chosen, g });
  });
  if (rows.some((row) => row.t < 0)) return empty(title, `${time.name} has negative times.`);
  if (rows.length < 3) return empty(title, 'Need at least 3 cases with a time and an event value.');
  const levels = [...new Set(rows.map((row) => row.g))].sort();
  if (levels.length > 8) return empty(title, `${group?.name} has ${levels.length} groups; use one with 8 or fewer.`);
  const out: [string, string][] = [['Event', `${event.name} = ${chosen}`]];
  const series: SurvivalChart['series'] = [];
  const medians: string[] = [];
  for (const level of levels) {
    const members = rows.filter((row) => row.g === level);
    const km = kaplanMeier(members.map((row) => row.t), members.map((row) => row.e));
    const events = members.filter((row) => row.e).length;
    const median = km.median === null ? 'not reached' : `${fixed(km.median)} (95% CI ${km.medianLower === null ? '—' : fixed(km.medianLower)}–${km.medianUpper === null ? 'not reached' : fixed(km.medianUpper)})`;
    out.push([`${level}: n, events, median time`, `${members.length}, ${events}, ${median}`]);
    medians.push(`${level} (median ${km.median === null ? 'not reached' : fixed(km.median)})`);
    const points: [number, number][] = [[0, 1], ...km.steps.map((step): [number, number] => [step.time, step.survival])];
    const last = Math.max(...members.map((row) => row.t));
    if (points[points.length - 1][0] < last) points.push([last, points[points.length - 1][1]]);
    series.push({ name: level, points: points.length > 400 ? points.filter((_, i) => i % Math.ceil(points.length / 400) === 0 || i === points.length - 1) : points });
  }
  let apa = `The median ${time.name} was ${medians.join(', ')}.`;
  const warnings: string[] = [];
  if (levels.length > 1) {
    const test = logRank(rows.map((row) => row.t), rows.map((row) => row.e), rows.map((row) => row.g));
    if (test) {
      out.push(['Log-rank χ²', `χ²(${test.df}) = ${fixed(test.chi)}, ${formatP(test.p)}`]);
      test.levels.forEach((level, g) => out.push([`${level}: observed / expected events`, `${test.observed[g]} / ${fixed(test.expected[g])}`]));
      apa = `Survival differed ${test.p < 0.05 ? 'significantly' : 'not significantly'} between the groups of ${group!.name} (log-rank χ²(${test.df}) = ${fixed(test.chi)}, ${formatP(test.p)}). Median ${time.name}: ${medians.join(', ')}.`;
    }
  }
  if (rows.filter((row) => row.e).length < 10) warnings.push('Fewer than 10 events: the curves and medians are imprecise.');
  warnings.push('The log-rank test assumes the groups’ hazards stay proportional over time; check that the curves do not cross.');
  return { title, rows: out, apa, warnings, chart: { kind: 'survival', x: time.name, y: 'Survival probability', series } };
}

// ------------------------------------------------------------------ diagnostic accuracy

/** Sensitivity, specificity, predictive values and likelihood ratios of a test against a reference standard. */
export function diagnosticAccuracy(test: { name: string; labels: (string | null)[] }, reference: { name: string; labels: (string | null)[] }, testPositive?: string | null, referencePositive?: string | null): TestResult {
  const title = `Diagnostic accuracy: ${test.name} against ${reference.name}`;
  const testLevels = [...new Set(test.labels.filter((value, i): value is string => value !== null && reference.labels[i] !== null))];
  const refLevels = [...new Set(reference.labels.filter((value, i): value is string => value !== null && test.labels[i] !== null))];
  if (testLevels.length !== 2 || refLevels.length !== 2) return empty(title, `Both columns need exactly two categories (${test.name} has ${testLevels.length}, ${reference.name} has ${refLevels.length}). For a numeric score, use the ROC curve.`);
  const tPos = guessEvent(testLevels, testPositive) ?? eventLevel(testLevels, testPositive)!;
  const rPos = guessEvent(refLevels, referencePositive) ?? eventLevel(refLevels, referencePositive)!;
  let tp = 0; let fp = 0; let fn = 0; let tn = 0;
  test.labels.forEach((value, i) => {
    const ref = reference.labels[i];
    if (value === null || ref === null) return;
    const positive = value === tPos; const diseased = ref === rPos;
    if (positive && diseased) tp += 1; else if (positive) fp += 1; else if (diseased) fn += 1; else tn += 1;
  });
  const n = tp + fp + fn + tn;
  const sens = tp / (tp + fn); const spec = tn / (tn + fp);
  const ppv = tp / (tp + fp); const npv = tn / (tn + fn);
  const lrPos = sens / (1 - spec); const lrNeg = (1 - sens) / spec;
  const seLrPos = Math.sqrt(1 / tp - 1 / (tp + fn) + 1 / fp - 1 / (fp + tn));
  const seLrNeg = Math.sqrt(1 / fn - 1 / (tp + fn) + 1 / tn - 1 / (fp + tn));
  const lrCi = (value: number, se: number) => (Number.isFinite(value) && Number.isFinite(se) && value > 0 ? `${fixed(value)} (${fixed(Math.exp(Math.log(value) - Z95 * se))}–${fixed(Math.exp(Math.log(value) + Z95 * se))})` : fixed(value));
  const prop = (x: number, total: number) => `${pct(x / total)} (${ci(clopperPearson(x, total), pct)})`;
  return {
    title,
    rows: [
      ['Positive means', `${test.name} = ${tPos}; ${reference.name} = ${rPos}`],
      ['True positives / false positives', `${tp} / ${fp}`], ['False negatives / true negatives', `${fn} / ${tn}`], ['N', String(n)],
      ['Sensitivity (95% CI)', prop(tp, tp + fn)], ['Specificity (95% CI)', prop(tn, tn + fp)],
      ['Positive predictive value (95% CI)', prop(tp, tp + fp)], ['Negative predictive value (95% CI)', prop(tn, tn + fn)],
      ['Accuracy (95% CI)', prop(tp + tn, n)], ['Positive likelihood ratio (95% CI)', lrCi(lrPos, seLrPos)], ['Negative likelihood ratio (95% CI)', lrCi(lrNeg, seLrNeg)],
      ['Prevalence in the sample', pct((tp + fn) / n)], ['Youden’s J', noLeadingZero(sens + spec - 1)],
    ],
    apa: `Against ${reference.name}, ${test.name} had a sensitivity of ${pct(sens)} (95% CI ${ci(clopperPearson(tp, tp + fn), pct)}) and a specificity of ${pct(spec)} (95% CI ${ci(clopperPearson(tn, tn + fp), pct)}); the positive predictive value was ${pct(ppv)} and the negative predictive value ${pct(npv)} at a sample prevalence of ${pct((tp + fn) / n)} (N = ${n}).`,
    warnings: [
      'Predictive values depend on prevalence: they apply only to settings with a similar prevalence to this sample.',
      ...([tp, fp, fn, tn].some((cell) => cell === 0) ? ['A cell of the 2 × 2 table is empty, so some likelihood ratios or intervals cannot be estimated.'] : []),
      ...(tp + fn < 20 || tn + fp < 20 ? ['Fewer than 20 people with (or without) the condition: the intervals are wide.'] : []),
    ],
  };
}

/** ROC curve of a numeric score against a reference standard: AUC with DeLong's 95% CI and the Youden-optimal cut-off. */
export function rocAnalysis(score: { name: string; values: (number | null)[] }, reference: { name: string; labels: (string | null)[] }, referencePositive?: string | null): ChartResult {
  const title = `ROC curve: ${score.name} for ${reference.name}`;
  const refLevels = [...new Set(reference.labels.filter((value, i): value is string => value !== null && score.values[i] !== null))];
  if (refLevels.length !== 2) return empty(title, `${reference.name} needs exactly two categories (it has ${refLevels.length}).`);
  const rPos = guessEvent(refLevels, referencePositive) ?? eventLevel(refLevels, referencePositive)!;
  const pos: number[] = []; const neg: number[] = [];
  score.values.forEach((value, i) => { const ref = reference.labels[i]; if (value === null || !Number.isFinite(value) || ref === null) return; (ref === rPos ? pos : neg).push(value); });
  if (pos.length < 2 || neg.length < 2) return empty(title, 'Need at least 2 cases in each group of the reference standard.');
  const sortedNeg = [...neg].sort((a, b) => a - b);
  const sortedPos = [...pos].sort((a, b) => a - b);
  /** Number of values in a sorted array below v, and equal to v. */
  const below = (sorted: number[], v: number) => { let lo = 0; let hi = sorted.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid] < v) lo = mid + 1; else hi = mid; } return lo; };
  const countBelowEqual = (sorted: number[], v: number) => { const lessThan = below(sorted, v); let lo = lessThan; let hi = sorted.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid] <= v) lo = mid + 1; else hi = mid; } return [lessThan, lo - lessThan] as const; };
  const v10 = pos.map((value) => { const [less, equal] = countBelowEqual(sortedNeg, value); return (less + 0.5 * equal) / neg.length; });
  const v01 = neg.map((value) => { const [less, equal] = countBelowEqual(sortedPos, value); return (pos.length - less - equal + 0.5 * equal) / pos.length; });
  const auc = mean(v10);
  const se = Math.sqrt(sampleVariance(v10) / pos.length + sampleVariance(v01) / neg.length);
  const interval: [number, number] = [Math.max(0, auc - Z95 * se), Math.min(1, auc + Z95 * se)];
  const p = se > 0 ? twoSidedZ((auc - 0.5) / se) : 0;
  // Cut-offs: positive when score ≥ c.
  const thresholds = [...new Set([...pos, ...neg])].sort((a, b) => b - a);
  let best = { c: thresholds[0], j: -Infinity, sens: 0, spec: 1 };
  const curve: [number, number][] = [[0, 0]];
  for (const c of thresholds) {
    const sens = (pos.length - below(sortedPos, c)) / pos.length;
    const spec = below(sortedNeg, c) / neg.length;
    curve.push([1 - spec, sens]);
    if (sens + spec - 1 > best.j) best = { c, j: sens + spec - 1, sens, spec };
  }
  curve.push([1, 1]);
  const step = Math.ceil(curve.length / 300);
  const points = curve.filter((_, i) => i % step === 0 || i === curve.length - 1);
  const quality = auc >= 0.9 ? 'excellent' : auc >= 0.8 ? 'good' : auc >= 0.7 ? 'fair' : auc >= 0.6 ? 'poor' : 'failed';
  return {
    title,
    rows: [
      ['Positive means', `${reference.name} = ${rPos} (higher ${score.name} = more likely positive)`], ['Positive / negative cases', `${pos.length} / ${neg.length}`],
      ['AUC (95% CI, DeLong)', `${noLeadingZero(auc, 3)} (${noLeadingZero(interval[0], 3)}–${noLeadingZero(interval[1], 3)})`], ['p (AUC vs .5)', formatP(p)],
      ['Best cut-off (Youden)', `${score.name} ≥ ${fixed(best.c, 3)}`], ['Sensitivity / specificity at that cut-off', `${pct(best.sens)} / ${pct(best.spec)}`],
    ],
    apa: `${score.name} discriminated between ${reference.name} = ${rPos} and the other cases with an area under the ROC curve of ${noLeadingZero(auc, 2)} (95% CI ${noLeadingZero(interval[0], 2)}–${noLeadingZero(interval[1], 2)}, ${formatP(p)}). A cut-off of ${fixed(best.c, 2)} gave a sensitivity of ${pct(best.sens)} and a specificity of ${pct(best.spec)}.`,
    warnings: [
      ...(auc < 0.5 ? ['The AUC is below .5: lower scores go with the positive group. Reverse the score (or its direction) before reporting.'] : []),
      `By rough convention an AUC of ${noLeadingZero(auc, 2)} is ${quality}. A cut-off chosen on the same data looks better than it will on new data; validate it in another sample.`,
    ],
    chart: { kind: 'roc', x: '1 − specificity', y: 'Sensitivity', series: [{ name: score.name, points }] },
  };
}

// ------------------------------------------------------------------ reliability

/** Cronbach's alpha for a set of items, with item-total correlations and alpha if each item is dropped. */
export function cronbachAlpha(items: { name: string; values: (number | null)[] }[]): TestResult {
  const title = `Reliability (Cronbach’s alpha): ${items.length} items`;
  if (items.length < 2) return empty(title, 'Choose at least 2 items.');
  if (items.length > 40) return empty(title, 'Up to 40 items at a time.');
  const n0 = items[0].values.length;
  const complete = Array.from({ length: n0 }, (_, i) => i).filter((i) => items.every((item) => item.values[i] !== null && Number.isFinite(item.values[i] as number)));
  if (complete.length < 3) return empty(title, 'Need at least 3 respondents who answered every item.');
  const matrix = items.map((item) => complete.map((i) => item.values[i] as number));
  const alphaOf = (columns: number[][]) => {
    const k = columns.length;
    const totals = columns[0].map((_, i) => sum(columns.map((column) => column[i])));
    const totalVariance = sampleVariance(totals);
    return totalVariance > 0 ? (k / (k - 1)) * (1 - sum(columns.map(sampleVariance)) / totalVariance) : NaN;
  };
  const alpha = alphaOf(matrix);
  const correlations: number[] = [];
  for (let a = 0; a < matrix.length; a += 1) for (let b = a + 1; b < matrix.length; b += 1) { const r = pearsonR(matrix[a], matrix[b]); if (Number.isFinite(r)) correlations.push(r); }
  const meanR = correlations.length ? mean(correlations) : NaN;
  const k = items.length;
  const standardized = (k * meanR) / (1 + (k - 1) * meanR);
  const totals = matrix[0].map((_, i) => sum(matrix.map((column) => column[i])));
  const itemRows: [string, string][] = [];
  const negative: string[] = [];
  items.forEach((item, j) => {
    const rest = totals.map((total, i) => total - matrix[j][i]);
    const r = pearsonR(matrix[j], rest);
    if (r < 0) negative.push(item.name);
    const without = k > 2 ? alphaOf(matrix.filter((_, other) => other !== j)) : NaN;
    itemRows.push([`${item.name}: M (SD), item-total r, α if deleted`, `${fixed(mean(matrix[j]))} (${fixed(Math.sqrt(sampleVariance(matrix[j])))}), ${noLeadingZero(r)}, ${k > 2 ? noLeadingZero(without) : '—'}`]);
  });
  const label = alpha >= 0.9 ? 'excellent' : alpha >= 0.8 ? 'good' : alpha >= 0.7 ? 'acceptable' : alpha >= 0.6 ? 'questionable' : 'poor';
  return {
    title,
    rows: [
      ['Cronbach’s α', noLeadingZero(alpha)], ['Standardised α', noLeadingZero(standardized)], ['Items', String(k)], ['Respondents (complete)', `${complete.length} of ${n0}`],
      ['Mean inter-item correlation', noLeadingZero(meanR)], ...itemRows,
    ],
    apa: `The ${k}-item scale had ${label} internal consistency, Cronbach’s α = ${noLeadingZero(alpha)} (N = ${complete.length}).`,
    warnings: [
      ...(negative.length ? [`${negative.join(', ')} correlate${negative.length === 1 ? 's' : ''} negatively with the rest of the scale: ${negative.length === 1 ? 'it' : 'they'} may need reverse-scoring before the scale is used.`] : []),
      ...(alpha > 0.95 ? ['α above .95 can mean some items repeat each other.'] : []),
      ...(complete.length < n0 ? [`${n0 - complete.length} respondents with a missing item were left out.`] : []),
      'Alpha assumes the items measure one thing; it is not evidence that the scale is valid.',
    ],
  };
}

// ------------------------------------------------------------------ sample size

const zFor = (p: number) => {
  // Inverse normal by bisection on normCdf (accurate enough for sample sizes).
  let lo = -10; let hi = 10;
  for (let i = 0; i < 100; i += 1) { const mid = (lo + hi) / 2; if (normCdf(mid) < p) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
};

/**
 * People needed to estimate a proportion (prevalence) to within ±d: n = z²p(1−p)/d², times the
 * design effect, with the finite population correction when the population size is given.
 */
export function sampleSizePrevalence(p: number, d: number, confidence = 0.95, population?: number | null, designEffect = 1): number {
  if (!(p > 0 && p < 1) || !(d > 0 && d < 1) || !(confidence > 0 && confidence < 1) || !(designEffect >= 1)) return NaN;
  const z = zFor(1 - (1 - confidence) / 2);
  let n = ((z * z * p * (1 - p)) / (d * d)) * designEffect;
  if (population && population > 0) n = n / (1 + (n - 1) / population);
  return Math.ceil(n - 1e-9);
}

/** Cases needed to detect a correlation r (Fisher's z): n = ((zα + zβ) / atanh r)² + 3. */
export function sampleSizeCorrelation(r: number, alpha = 0.05, power = 0.8, tails: 1 | 2 = 2): number {
  if (!(Math.abs(r) > 0 && Math.abs(r) < 1) || !(alpha > 0 && alpha < 1) || !(power > 0 && power < 1)) return NaN;
  const c = 0.5 * Math.log((1 + Math.abs(r)) / (1 - Math.abs(r)));
  return Math.ceil(((zFor(1 - alpha / tails) + zFor(power)) / c) ** 2 + 3);
}

/**
 * People needed to estimate a test's sensitivity and specificity to within ±d (Buderer 1996):
 * the cases needed for each, divided by the share of people with (or without) the condition.
 */
export function sampleSizeDiagnostic(sensitivity: number, specificity: number, d: number, prevalence: number, confidence = 0.95): { sensitivity: number; specificity: number; total: number } {
  const bad = { sensitivity: NaN, specificity: NaN, total: NaN };
  if (![sensitivity, specificity, prevalence].every((value) => value > 0 && value < 1) || !(d > 0 && d < 1)) return bad;
  const z = zFor(1 - (1 - confidence) / 2);
  const forSens = Math.ceil((z * z * sensitivity * (1 - sensitivity)) / (d * d) / prevalence - 1e-9);
  const forSpec = Math.ceil((z * z * specificity * (1 - specificity)) / (d * d) / (1 - prevalence) - 1e-9);
  return { sensitivity: forSens, specificity: forSpec, total: Math.max(forSens, forSpec) };
}
