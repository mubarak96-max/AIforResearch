/**
 * Bayesian basics for Data Lab, calculated in the browser (no AI, no credits):
 * - JZS Bayesian t-tests (Rouder, Speckman, Sun, Morey & Iverson, 2009): one-sample, paired and
 *   two-sample, with a Cauchy prior on the standardised effect size δ (scale r) and the
 *   Jeffreys prior on the variance. BF10 by numerical integration over g (Rouder et al., eq. 1),
 *   as R's BayesFactor::ttestBF and pingouin.bayesfactor_ttest. Two-sided alternative only.
 * - The posterior of δ: the noncentral-t likelihood of the observed t times the Cauchy prior,
 *   integrated on a grid (median and equal-tailed 95% credible interval).
 * - A beta-binomial proportion: Beta(a, b) prior, posterior mean, median, equal-tailed 95%
 *   credible interval and P(p > threshold).
 * Pure.
 */
import { fixed, frequencies, incompleteBeta, logGamma, mean, sd, variance, type TestResult } from './stats';

/** Composite Simpson's rule over equally spaced log-values, returning the log of the integral. */
function logSimpson(logValues: number[], step: number): number {
  const max = Math.max(...logValues.filter(Number.isFinite));
  if (!Number.isFinite(max)) return -Infinity;
  let total = 0;
  const last = logValues.length - 1;
  logValues.forEach((value, i) => {
    const weight = i === 0 || i === last ? 1 : i % 2 ? 4 : 2;
    total += weight * Math.exp(value - max);
  });
  return max + Math.log((total * step) / 3);
}

/**
 * log BF10 of the JZS t-test for an observed t with effective sample size n
 * (n for one-sample and paired, n1·n2/(n1 + n2) for two samples) and df degrees of freedom.
 * The integral over g is taken on x = ln g, where the integrand is smooth.
 */
export function jzsLogBf10(t: number, n: number, df: number, r = Math.SQRT1_2): number {
  if (!(n > 0) || !(df > 0) || !(r > 0) || !Number.isFinite(t)) return NaN;
  const points = 6001; const lo = -12; const hi = 48;
  const step = (hi - lo) / (points - 1);
  const logs: number[] = [];
  for (let i = 0; i < points; i += 1) {
    const x = lo + i * step; const g = Math.exp(x);
    const scale = 1 + n * g * r * r;
    // (1 + n g r²)^(-1/2) (1 + t²/((1 + n g r²) ν))^(-(ν+1)/2) · (2π)^(-1/2) g^(-3/2) e^(-1/(2g)) · g (Jacobian)
    logs.push(-0.5 * Math.log(scale) - ((df + 1) / 2) * Math.log1p((t * t) / (scale * df)) - 0.5 * Math.log(2 * Math.PI) - 0.5 * x - 1 / (2 * g));
  }
  return logSimpson(logs, step) + ((df + 1) / 2) * Math.log1p((t * t) / df);
}
export const jzsBf10 = (t: number, n: number, df: number, r = Math.SQRT1_2) => Math.exp(jzsLogBf10(t, n, df, r));

/**
 * The posterior of δ given t: p(δ | t) ∝ noncentral-t density of t (df, ncp δ√n) × Cauchy(δ; 0, r).
 * The noncentral-t density is integrated over v (V = v², V ~ χ²_df), up to a constant.
 * Returns the posterior median and the equal-tailed 95% credible interval.
 */
export function effectPosterior(t: number, n: number, df: number, r = Math.SQRT1_2, level = 0.95): { median: number; lower: number; upper: number } | null {
  if (!(n > 0) || !(df > 0) || !(r > 0) || !Number.isFinite(t)) return null;
  const centre = t / Math.sqrt(n);
  const spread = Math.sqrt((1 + (centre * centre * n) / (2 * df)) / n);
  const lo = Math.min(0, centre) - 14 * spread - (df < 5 ? 2 : 0);
  const hi = Math.max(0, centre) + 14 * spread + (df < 5 ? 2 : 0);
  const deltas = 1601; const dStep = (hi - lo) / (deltas - 1);
  const root = Math.sqrt(df);
  const vLo = Math.max(0, root - 9); const vHi = root + 9; const vPoints = 241; const vStep = (vHi - vLo) / (vPoints - 1);
  // The chi part, scaled by its value at v = √df so large df stays finite.
  const chiPeak = df * Math.log(root) - df / 2;
  const chi: number[] = []; const vs: number[] = [];
  for (let j = 0; j < vPoints; j += 1) {
    const v = vLo + j * vStep; vs.push(v);
    chi.push(v > 0 ? df * Math.log(v) - (v * v) / 2 - chiPeak : -Infinity);
  }
  const logPost: number[] = []; const grid: number[] = [];
  for (let i = 0; i < deltas; i += 1) {
    const delta = lo + i * dStep; grid.push(delta);
    const ncp = delta * Math.sqrt(n);
    const inner = vs.map((v, j) => { const z = (t * v) / root - ncp; return chi[j] - (z * z) / 2; });
    logPost.push(logSimpson(inner, vStep) - Math.log1p((delta / r) ** 2));
  }
  const max = Math.max(...logPost);
  const density = logPost.map((value) => Math.exp(value - max));
  // Cumulative (trapezoid) and linear interpolation of the quantiles.
  const cumulative = [0];
  for (let i = 1; i < deltas; i += 1) cumulative.push(cumulative[i - 1] + ((density[i - 1] + density[i]) / 2) * dStep);
  const total = cumulative[deltas - 1];
  const quantile = (p: number) => {
    const target = p * total;
    let i = 1; while (i < deltas - 1 && cumulative[i] < target) i += 1;
    const span = cumulative[i] - cumulative[i - 1];
    return grid[i - 1] + (span > 0 ? (target - cumulative[i - 1]) / span : 0) * dStep;
  };
  const tail = (1 - level) / 2;
  return { median: quantile(0.5), lower: quantile(tail), upper: quantile(1 - tail) };
}

/** Lee and Wagenmakers (2013), adjusting Jeffreys (1961): the strength of evidence a Bayes factor gives. */
export function evidenceLabel(bf10: number): string {
  if (!Number.isFinite(bf10) && bf10 !== Infinity) return 'not available';
  if (bf10 === 1) return 'no evidence either way';
  const forH1 = bf10 > 1;
  const bf = forH1 ? bf10 : 1 / bf10;
  const strength = bf > 100 ? 'extreme' : bf > 30 ? 'very strong' : bf > 10 ? 'strong' : bf > 3 ? 'moderate' : 'anecdotal';
  return `${strength} evidence for ${forH1 ? 'H1 (a difference)' : 'H0 (no difference)'}`;
}

/** A Bayes factor in a readable form: two decimals, or scientific notation when very large or small. */
export function formatBf(bf: number): string {
  if (!Number.isFinite(bf)) return bf > 0 ? '> 1e300' : '—';
  if (bf >= 1000 || bf < 0.01) return bf.toExponential(2);
  return bf >= 100 ? bf.toFixed(1) : fixed(bf, bf < 0.1 ? 3 : 2);
}

/**
 * A prior scale setting: 0.5, 0.707 or 1 (any positive number up to 2 is accepted from saved bundles).
 * "0.707" means √2/2, BayesFactor's "medium" (pingouin rounds it to 0.707; BF10 differs in the 4th digit).
 */
export function priorScale(raw?: string | null): number {
  if (raw === undefined || raw === null || raw === '' || raw === '0.707') return Math.SQRT1_2;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0 || value > 2) throw new Error('The prior scale r must be a number between 0 and 2 (0.5, 0.707 or 1).');
  return value;
}
const scaleLabel = (r: number) => (r === Math.SQRT1_2 ? '0.707' : String(r));

type TCore = { t: number; n: number; df: number; r: number };
function bayesRows({ t, n, df, r }: TCore, hypothesis: string): { rows: [string, string][]; apaTail: string; bf10: number } {
  const logBf = jzsLogBf10(t, n, df, r);
  const bf10 = Math.exp(logBf);
  const bf01 = Math.exp(-logBf);
  const posterior = effectPosterior(t, n, df, r);
  const rows: [string, string][] = [
    ['t', fixed(t)], ['df', fixed(df, Number.isInteger(df) ? 0 : 2)],
    ['Prior on δ', `Cauchy(0, ${scaleLabel(r)})`],
    ['BF10', formatBf(bf10)], ['BF01', formatBf(bf01)],
    ['Evidence', evidenceLabel(bf10)],
    ['δ posterior median', posterior ? fixed(posterior.median) : 'not given'],
    ['δ 95% credible interval', posterior ? `[${fixed(posterior.lower)}, ${fixed(posterior.upper)}]` : 'not given'],
  ];
  const apaTail = `BF10 = ${formatBf(bf10)} (BF01 = ${formatBf(bf01)}), ${evidenceLabel(bf10)} ${hypothesis}${posterior ? `; the posterior median effect size was δ = ${fixed(posterior.median)}, 95% CrI [${fixed(posterior.lower)}, ${fixed(posterior.upper)}]` : ''}. Prior: Cauchy(0, ${scaleLabel(r)}) on δ (JZS; Rouder et al., 2009).`;
  return { rows, apaTail, bf10 };
}

const smallWarning = (n: number) => (n < 10 ? ['Few cases: the Bayes factor depends strongly on the prior scale. Report it with the prior and check r = 0.5 and r = 1 as a sensitivity analysis.'] : []);

export function bayesOneSample(values: (number | null)[], name: string, mu = 0, r = Math.SQRT1_2): TestResult {
  const xs = values.filter((value): value is number => value !== null);
  const title = `Bayesian one-sample t-test: ${name} vs ${mu}`;
  if (xs.length < 2) return { title, rows: [], apa: '', warnings: ['Need at least 2 values.'] };
  const s = sd(xs);
  if (!(s > 0)) return { title, rows: [], apa: '', warnings: ['All values are the same; the t statistic is undefined.'] };
  const t = (mean(xs) - mu) / (s / Math.sqrt(xs.length));
  const { rows, apaTail } = bayesRows({ t, n: xs.length, df: xs.length - 1, r }, '(the mean differs from the test value)');
  return {
    title,
    rows: [['n', String(xs.length)], ['M (SD)', `${fixed(mean(xs))} (${fixed(s)})`], ['Test value', String(mu)], ...rows],
    apa: `A Bayesian one-sample t-test compared ${name} (M = ${fixed(mean(xs))}, SD = ${fixed(s)}, n = ${xs.length}) with ${mu}: ${apaTail}`,
    warnings: smallWarning(xs.length),
  };
}

export function bayesPaired(x: (number | null)[], y: (number | null)[], names: [string, string], r = Math.SQRT1_2): TestResult {
  const diffs: number[] = []; const xs: number[] = []; const ys: number[] = [];
  x.forEach((value, i) => { const other = y[i]; if (value !== null && other !== null && other !== undefined) { xs.push(value); ys.push(other); diffs.push(value - other); } });
  const title = `Bayesian paired t-test: ${names[0]} vs ${names[1]}`;
  if (diffs.length < 2) return { title, rows: [], apa: '', warnings: ['Need at least 2 cases with both values.'] };
  const s = sd(diffs);
  if (!(s > 0)) return { title, rows: [], apa: '', warnings: ['Every difference is the same; the t statistic is undefined.'] };
  const t = mean(diffs) / (s / Math.sqrt(diffs.length));
  const { rows, apaTail } = bayesRows({ t, n: diffs.length, df: diffs.length - 1, r }, '(the means differ)');
  return {
    title,
    rows: [['n pairs', String(diffs.length)], [`${names[0]}: M (SD)`, `${fixed(mean(xs))} (${fixed(sd(xs))})`], [`${names[1]}: M (SD)`, `${fixed(mean(ys))} (${fixed(sd(ys))})`], ['Mean difference', fixed(mean(diffs))], ...rows],
    apa: `A Bayesian paired-samples t-test compared ${names[0]} (M = ${fixed(mean(xs))}, SD = ${fixed(sd(xs))}) with ${names[1]} (M = ${fixed(mean(ys))}, SD = ${fixed(sd(ys))}), n = ${diffs.length}: ${apaTail}`,
    warnings: smallWarning(diffs.length),
  };
}

/** Two independent groups: Student's t (pooled variance), as the JZS model assumes equal variances. */
export function bayesTwoSample(outcome: (number | null)[], groups: (string | null)[], names: [string, string], r = Math.SQRT1_2): TestResult {
  const title = `Bayesian independent t-test: ${names[0]} by ${names[1]}`;
  const levels = frequencies(groups).map((item) => item.value);
  if (levels.length !== 2) return { title, rows: [], apa: '', warnings: [`${names[1]} must have exactly two groups (it has ${levels.length}).`] };
  const [a, b] = levels.map((level) => outcome.filter((value, i): value is number => value !== null && groups[i] === level));
  if (a.length < 2 || b.length < 2) return { title, rows: [], apa: '', warnings: ['Each group needs at least 2 values.'] };
  const df = a.length + b.length - 2;
  const pooled = Math.sqrt(((a.length - 1) * variance(a) + (b.length - 1) * variance(b)) / df);
  if (!(pooled > 0)) return { title, rows: [], apa: '', warnings: ['There is no variation within the groups; the t statistic is undefined.'] };
  const t = (mean(a) - mean(b)) / (pooled * Math.sqrt(1 / a.length + 1 / b.length));
  const nEff = (a.length * b.length) / (a.length + b.length);
  const { rows, apaTail } = bayesRows({ t, n: nEff, df, r }, '(the group means differ)');
  const ratio = Math.max(variance(a), variance(b)) / Math.min(variance(a), variance(b));
  return {
    title,
    rows: [[`${levels[0]}: M (SD), n`, `${fixed(mean(a))} (${fixed(sd(a))}), ${a.length}`], [`${levels[1]}: M (SD), n`, `${fixed(mean(b))} (${fixed(sd(b))}), ${b.length}`], ...rows],
    apa: `A Bayesian independent-samples t-test compared ${names[0]} between ${levels[0]} (M = ${fixed(mean(a))}, SD = ${fixed(sd(a))}, n = ${a.length}) and ${levels[1]} (M = ${fixed(mean(b))}, SD = ${fixed(sd(b))}, n = ${b.length}): ${apaTail} δ is ${levels[0]} minus ${levels[1]}.`,
    warnings: [...smallWarning(a.length + b.length), ...(ratio > 4 ? ['The group variances differ by more than four times; the model assumes equal variances. Interpret the Bayes factor with caution.'] : [])],
  };
}

// ------------------------------------------------------------------ beta-binomial

/** The inverse of the regularised incomplete beta function, by bisection on I_x(a, b). */
export function betaInverse(p: number, a: number, b: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  let lo = 0; let hi = 1;
  for (let i = 0; i < 200; i += 1) {
    const mid = (lo + hi) / 2;
    if (incompleteBeta(mid, a, b) < p) lo = mid; else hi = mid;
    if (hi - lo < 1e-15) break;
  }
  return (lo + hi) / 2;
}

export type BetaPosterior = { a: number; b: number; mean: number; median: number; mode: number | null; lower: number; upper: number; above: number };

/** Beta(a, b) prior with k successes in n trials: Beta(a + k, b + n − k) posterior. */
export function betaPosterior(k: number, n: number, priorA = 1, priorB = 1, threshold = 0.5, level = 0.95): BetaPosterior {
  const a = priorA + k; const b = priorB + n - k;
  const tail = (1 - level) / 2;
  return {
    a, b, mean: a / (a + b), median: betaInverse(0.5, a, b),
    mode: a > 1 && b > 1 ? (a - 1) / (a + b - 2) : null,
    lower: betaInverse(tail, a, b), upper: betaInverse(1 - tail, a, b),
    above: 1 - incompleteBeta(threshold, a, b),
  };
}

/** The beta density at x (for a chart or checks). */
export function betaDensity(x: number, a: number, b: number): number {
  if (x <= 0 || x >= 1) return 0;
  return Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) + logGamma(a + b) - logGamma(a) - logGamma(b));
}

export function numberSetting(raw: string | null | undefined, fallback: number, label: string, check: (value: number) => boolean): number {
  if (raw === undefined || raw === null || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || !check(value)) throw new Error(`${label} is not valid.`);
  return value;
}

export function bayesProportion(labels: (string | null)[], name: string, success?: string | null, priorA = 1, priorB = 1, threshold = 0.5): TestResult {
  const title = `Bayesian proportion: ${name}`;
  const levels = frequencies(labels).map((item) => item.value);
  const chosen = success && levels.includes(success) ? success : levels.length === 2 ? [...levels].sort()[1] : null;
  if (!chosen) return { title, rows: [], apa: '', warnings: [levels.length ? `Choose the value of ${name} that counts as a success.` : `${name} has no values.`] };
  const present = labels.filter((label): label is string => label !== null);
  const n = present.length;
  const k = present.filter((label) => label === chosen).length;
  const post = betaPosterior(k, n, priorA, priorB, threshold);
  const pct = (value: number) => `${fixed(value * 100, 1)}%`;
  return {
    title,
    rows: [
      ['Success', chosen], ['Successes / n', `${k} / ${n}`], ['Observed proportion', fixed(n ? k / n : NaN, 3)],
      ['Prior', `Beta(${priorA}, ${priorB})`], ['Posterior', `Beta(${fixed(post.a, Number.isInteger(post.a) ? 0 : 2)}, ${fixed(post.b, Number.isInteger(post.b) ? 0 : 2)})`],
      ['Posterior mean', fixed(post.mean, 3)], ['Posterior median', fixed(post.median, 3)],
      ['95% credible interval', `[${fixed(post.lower, 3)}, ${fixed(post.upper, 3)}]`],
      [`P(p > ${threshold})`, fixed(post.above, 3)],
    ],
    apa: `${k} of ${n} (${pct(n ? k / n : NaN)}) were ${chosen}. With a Beta(${priorA}, ${priorB}) prior, the posterior mean proportion was ${fixed(post.mean, 3)}, 95% credible interval [${fixed(post.lower, 3)}, ${fixed(post.upper, 3)}], and the posterior probability that the proportion exceeds ${threshold} was ${fixed(post.above, 3)}.`,
    warnings: [
      ...(levels.length > 2 ? [`${name} has ${levels.length} values; every value other than “${chosen}” counts as a failure.`] : []),
      ...(n < 10 ? ['Few cases: the prior has a large influence on the result. Report the prior you used.'] : []),
    ],
  };
}
