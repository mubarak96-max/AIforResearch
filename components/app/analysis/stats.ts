/**
 * Data Lab statistics beyond lib/stats.ts: simple linear regression, the Mann-Whitney U test,
 * power and sample size for t-tests and two proportions, and the rule-based test chooser.
 * Calculated in the browser, never generated. Pure, for tests (tests/server/analysis.test.ts).
 */
import { fixed, formatP, mean, noLeadingZero, tTwoTailed, type TestResult } from '@/lib/stats';

// ------------------------------------------------------------------ the normal distribution

/** Standard normal CDF (Abramowitz and Stegun 7.1.26 via erf; error under 1.5e-7). */
export function normalCdf(z: number): number {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erf = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return z >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
}

/** Inverse standard normal CDF (Acklam's rational approximation; relative error under 1.2e-9). */
export function normalQuantile(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const low = 0.02425;
  if (p < low) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - low) return -normalQuantile(1 - p);
  const q = p - 0.5;
  const r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

// ------------------------------------------------------------------ regression

/** Ordinary least squares of y on one x: slope, intercept, R², t and p for the slope. */
export function linearRegression(x: (number | null)[], y: (number | null)[], names: [string, string]): TestResult {
  const xs: number[] = [];
  const ys: number[] = [];
  x.forEach((value, index) => { const other = y[index]; if (value !== null && other !== null && other !== undefined) { xs.push(value); ys.push(other); } });
  const n = xs.length;
  const title = `Linear regression: ${names[1]} on ${names[0]}`;
  if (n < 3) return { title, rows: [], apa: '', warnings: ['Need at least 3 cases with both values.'] };
  const mx = mean(xs); const my = mean(ys);
  const sxx = xs.reduce((sum, value) => sum + (value - mx) ** 2, 0);
  if (sxx === 0) return { title, rows: [], apa: '', warnings: [`${names[0]} has the same value in every case.`] };
  const sxy = xs.reduce((sum, value, index) => sum + (value - mx) * (ys[index] - my), 0);
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  const sse = xs.reduce((sum, value, index) => sum + (ys[index] - (intercept + slope * value)) ** 2, 0);
  const sst = ys.reduce((sum, value) => sum + (value - my) ** 2, 0);
  const r2 = sst ? 1 - sse / sst : 0;
  const df = n - 2;
  const se = Math.sqrt(sse / df / sxx);
  const t = se ? slope / se : Infinity;
  const p = Number.isFinite(t) ? tTwoTailed(t, df) : 0;
  const f = df > 0 && sse > 0 ? (sst - sse) / (sse / df) : Infinity;
  return {
    title,
    rows: [['Slope (b)', fixed(slope, 3)], ['Intercept', fixed(intercept, 3)], ['SE of slope', fixed(se, 3)], ['t', fixed(t)], ['df', String(df)], ['p (two-tailed)', formatP(p)], ['R²', noLeadingZero(r2)], ['N', String(n)]],
    apa: `${names[0]} ${p < 0.05 ? 'significantly' : 'did not significantly'} predict${p < 0.05 ? 'ed' : ''} ${names[1]}, b = ${fixed(slope, 2)}, t(${df}) = ${fixed(t)}, ${formatP(p)}, and explained ${fixed(r2 * 100, 1)}% of its variance (R² = ${noLeadingZero(r2)}, F(1, ${df}) = ${fixed(f)}).`,
    warnings: [...(n < 30 ? ['Small sample: the estimate is imprecise.'] : []), 'Regression shows association, not cause. Check the residuals for curves and outliers.'],
  };
}

// ------------------------------------------------------------------ Mann-Whitney

/** Ranks with ties given their average rank. */
function ranks(values: number[]): number[] {
  const order = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const out = new Array<number>(values.length);
  for (let i = 0; i < order.length;) {
    let j = i;
    while (j + 1 < order.length && order[j + 1].value === order[i].value) j += 1;
    const rank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k += 1) out[order[k].index] = rank;
    i = j + 1;
  }
  return out;
}

/** Mann-Whitney U for a numeric outcome across two groups (normal approximation with tie correction). */
export function mannWhitney(outcome: (number | null)[], groups: (string | null)[], names: [string, string]): TestResult {
  const title = `Mann-Whitney U test: ${names[0]} by ${names[1]}`;
  const levels = [...new Set(groups.filter((group, index): group is string => group !== null && outcome[index] !== null))];
  if (levels.length !== 2) return { title, rows: [], apa: '', warnings: [`${names[1]} must have exactly two groups (it has ${levels.length}).`] };
  const a = outcome.filter((value, index): value is number => value !== null && groups[index] === levels[0]);
  const b = outcome.filter((value, index): value is number => value !== null && groups[index] === levels[1]);
  if (a.length < 2 || b.length < 2) return { title, rows: [], apa: '', warnings: ['Each group needs at least 2 values.'] };
  const all = [...a, ...b];
  const r = ranks(all);
  const r1 = r.slice(0, a.length).reduce((sum, value) => sum + value, 0);
  const n1 = a.length; const n2 = b.length; const n = n1 + n2;
  const u1 = r1 - (n1 * (n1 + 1)) / 2;
  const u = Math.min(u1, n1 * n2 - u1);
  const ties = [...new Map(all.map((value) => [value, all.filter((other) => other === value).length])).values()].reduce((sum, t) => sum + (t ** 3 - t), 0);
  const sigma = Math.sqrt((n1 * n2 / 12) * ((n + 1) - ties / (n * (n - 1))));
  const z = sigma ? (u1 - (n1 * n2) / 2) / sigma : 0;
  const p = 2 * (1 - normalCdf(Math.abs(z)));
  const effect = Math.abs(z) / Math.sqrt(n);
  const median = (xs: number[]) => { const s = [...xs].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  return {
    title,
    rows: [[`${levels[0]}: Mdn, n`, `${fixed(median(a))}, ${n1}`], [`${levels[1]}: Mdn, n`, `${fixed(median(b))}, ${n2}`], ['U', fixed(u, 1)], ['z', fixed(z)], ['p (two-tailed)', formatP(p)], ['r (effect size)', noLeadingZero(effect)]],
    apa: `${names[0]} was ${p < 0.05 ? '' : 'not '}significantly different between ${levels[0]} (Mdn = ${fixed(median(a))}) and ${levels[1]} (Mdn = ${fixed(median(b))}), U = ${fixed(u, 1)}, z = ${fixed(z)}, ${formatP(p)}, r = ${noLeadingZero(effect)}.`,
    warnings: n < 20 ? ['Small groups: the normal approximation is rough; an exact test is better below 20 cases.'] : [],
  };
}

// ------------------------------------------------------------------ power and sample size

export type PowerDesign = 'two-sample' | 'paired' | 'one-sample';

/**
 * Cases needed for a t-test to detect effect size d (Cohen's d) at alpha and power, by the
 * normal approximation with the usual small-sample correction (+ z²/4 per group, Guenther 1981).
 * Two-sample: per group. Paired and one-sample: pairs or cases.
 */
export function sampleSizeT(d: number, alpha = 0.05, power = 0.8, design: PowerDesign = 'two-sample', tails: 1 | 2 = 2): number {
  if (!(d > 0) || !(alpha > 0 && alpha < 1) || !(power > 0 && power < 1)) return NaN;
  const za = normalQuantile(1 - alpha / tails);
  const zb = normalQuantile(power);
  const k = design === 'two-sample' ? 2 : 1;
  return Math.ceil((k * (za + zb) ** 2) / d ** 2 + za ** 2 / (2 * k));
}

/** Power of a t-test with n per group (two-sample) or n pairs, by the normal approximation. */
export function powerT(d: number, n: number, alpha = 0.05, design: PowerDesign = 'two-sample', tails: 1 | 2 = 2): number {
  if (!(d > 0) || !(n > 1)) return NaN;
  const za = normalQuantile(1 - alpha / tails);
  const k = design === 'two-sample' ? 2 : 1;
  return normalCdf(d * Math.sqrt(n / k) - za);
}

/** Cases per group to tell two proportions apart (pooled-variance normal approximation). */
export function sampleSizeProportions(p1: number, p2: number, alpha = 0.05, power = 0.8, tails: 1 | 2 = 2): number {
  if (!(p1 > 0 && p1 < 1 && p2 > 0 && p2 < 1) || p1 === p2) return NaN;
  const za = normalQuantile(1 - alpha / tails);
  const zb = normalQuantile(power);
  const bar = (p1 + p2) / 2;
  const top = za * Math.sqrt(2 * bar * (1 - bar)) + zb * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2));
  return Math.ceil(top ** 2 / (p1 - p2) ** 2);
}

// ------------------------------------------------------------------ test chooser

export type ChooserAnswers = {
  goal: 'compare' | 'relate' | 'predict' | 'describe' | 'diagnostic' | 'survival' | 'reliability';
  outcome: 'numeric' | 'ordinal' | 'categorical';
  groups: 'two' | 'three-plus' | 'none';
  paired: boolean;
  normal: 'yes' | 'no' | 'unsure';
};

export type Recommendation = { test: string; inDataLab: string | null; why: string; assumptions: string[]; report: string; alternative: string | null };

/** The test that fits the design, with what it assumes and how to report it. Rule-based. */
export function chooseTest(answers: ChooserAnswers): Recommendation {
  const parametric = answers.outcome === 'numeric' && answers.normal !== 'no';
  if (answers.goal === 'diagnostic') {
    return answers.outcome === 'numeric'
      ? { test: 'ROC curve and AUC', inDataLab: 'ROC curve and AUC', why: 'How well a numeric score or measurement separates people with and without a condition, and the best cut-off.', assumptions: ['A reference standard applied to everyone', 'Independent cases'], report: 'AUC = __ (95% CI __–__); at a cut-off of __, sensitivity __% and specificity __%.', alternative: 'Diagnostic accuracy (2 × 2) once you fix a cut-off' }
      : { test: 'Diagnostic accuracy (sensitivity and specificity)', inDataLab: 'Diagnostic accuracy (2 × 2)', why: 'A positive/negative test result compared with a reference standard.', assumptions: ['A reference standard applied to everyone', 'Predictive values only transfer to settings with similar prevalence'], report: 'Sensitivity __% (95% CI __–__), specificity __% (95% CI __–__), PPV __%, NPV __%.', alternative: null };
  }
  if (answers.goal === 'survival') {
    return { test: 'Kaplan-Meier curves with the log-rank test', inDataLab: 'Survival (Kaplan-Meier, log-rank)', why: 'Time until an event (death, relapse, discharge) when some people are followed without the event happening (censored).', assumptions: ['Censoring unrelated to the outcome', 'Proportional hazards for the log-rank test (curves that do not cross)'], report: 'Median survival __ (95% CI __–__) vs __ (95% CI __–__), log-rank χ²(__) = __, p = __.', alternative: 'Cox regression to adjust for other variables (in a statistics package)' };
  }
  if (answers.goal === 'reliability') {
    return { test: 'Cronbach’s alpha', inDataLab: 'Reliability (Cronbach’s alpha)', why: 'How consistently the items of a questionnaire scale measure the same thing.', assumptions: ['Items measure one construct', 'Negatively worded items reverse-scored first'], report: 'Cronbach’s α = __ (__ items, N = __).', alternative: 'McDonald’s omega in a statistics package when items load unequally' };
  }
  if (answers.goal === 'describe') {
    return { test: 'Descriptive statistics', inDataLab: 'Describe', why: 'You want to summarise, not test.', assumptions: [], report: answers.outcome === 'numeric' ? 'M = __, SD = __ (or Mdn = __, IQR = __ for skewed data), n = __.' : '__ of __ participants (__%).', alternative: null };
  }
  if (answers.goal === 'predict') {
    if (answers.outcome === 'categorical') return { test: 'Logistic regression', inDataLab: 'Logistic regression', why: 'A categorical (yes/no) outcome predicted from one or more variables.', assumptions: ['Independent cases', 'No strong multicollinearity', 'About 10 events per predictor'], report: 'OR = __, 95% CI [__, __], p = __.', alternative: 'Chi-square test for one categorical predictor' };
    return { test: 'Linear regression', inDataLab: 'Linear regression', why: 'A numeric outcome predicted from a numeric variable.', assumptions: ['Linear relationship', 'Independent cases', 'Residuals roughly normal with equal spread'], report: 'b = __, t(__) = __, p = __, R² = __.', alternative: answers.normal === 'no' ? 'Spearman correlation if the relationship is monotonic but not linear' : 'Logistic regression for a yes/no outcome' };
  }
  if (answers.goal === 'relate') {
    if (answers.outcome === 'categorical') return { test: 'Chi-square test of independence', inDataLab: 'Chi-square', why: 'Two categorical variables.', assumptions: ['Independent cases', 'Expected count of 5 or more in most cells'], report: 'χ²(__, N = __) = __, p = __, Cramér’s V = __.', alternative: 'Fisher’s exact test for small 2 × 2 tables (in Data Lab)' };
    if (parametric) return { test: 'Pearson correlation', inDataLab: 'Correlation', why: 'Two numeric variables that are roughly normal.', assumptions: ['Linear relationship', 'Roughly normal variables', 'No extreme outliers'], report: 'r(__) = __, p = __.', alternative: 'Spearman correlation if not normal (in Data Lab)' };
    return { test: 'Spearman rank correlation', inDataLab: 'Correlation (Spearman)', why: 'Ordinal or non-normal numeric variables.', assumptions: ['Monotonic relationship', 'Independent cases'], report: 'rs(__) = __, p = __.', alternative: null };
  }
  // compare
  if (answers.outcome === 'categorical') {
    return answers.paired
      ? { test: 'McNemar’s test', inDataLab: 'McNemar (paired yes/no)', why: 'A yes/no outcome measured twice on the same cases.', assumptions: ['Paired observations', 'Two categories'], report: 'χ²(1, N = __) = __, p = __.', alternative: null }
      : { test: 'Chi-square test', inDataLab: 'Chi-square', why: 'Comparing proportions between independent groups.', assumptions: ['Independent cases', 'Expected count of 5 or more in most cells'], report: 'χ²(__, N = __) = __, p = __.', alternative: 'Fisher’s exact test for small 2 × 2 tables' };
  }
  if (answers.groups === 'two') {
    if (answers.paired) return parametric
      ? { test: 'Paired t-test', inDataLab: 'Paired t-test', why: 'The same cases measured twice, numeric outcome.', assumptions: ['Differences roughly normal', 'Paired observations'], report: 't(__) = __, p = __, dz = __.', alternative: 'Wilcoxon signed-rank test if the differences are not normal' }
      : { test: 'Wilcoxon signed-rank test', inDataLab: 'Wilcoxon signed-rank', why: 'The same cases measured twice, ordinal or non-normal outcome.', assumptions: ['Paired observations', 'Symmetric differences'], report: 'Z = __, p = __, r = __.', alternative: null };
    return parametric
      ? { test: 'Independent t-test (Welch)', inDataLab: 'Independent t-test', why: 'Two independent groups, numeric outcome. Welch’s version does not assume equal variances.', assumptions: ['Independent groups', 'Outcome roughly normal in each group (or 30+ per group)'], report: 't(__) = __, p = __, d = __.', alternative: 'Mann-Whitney U if not normal' }
      : { test: 'Mann-Whitney U test', inDataLab: 'Mann-Whitney U', why: 'Two independent groups, ordinal or non-normal outcome.', assumptions: ['Independent groups', 'Similar shapes if you compare medians'], report: 'U = __, z = __, p = __, r = __.', alternative: null };
  }
  if (answers.paired) return parametric
    ? { test: 'Repeated-measures ANOVA', inDataLab: null, why: 'The same cases measured three or more times.', assumptions: ['Sphericity (check Mauchly’s test)', 'Roughly normal'], report: 'F(__, __) = __, p = __, ηp² = __.', alternative: 'Friedman test if not normal' }
    : { test: 'Friedman test', inDataLab: null, why: 'The same cases measured three or more times, ordinal or non-normal outcome.', assumptions: ['Repeated measures on the same cases'], report: 'χ²F(__) = __, p = __.', alternative: null };
  return parametric
    ? { test: 'One-way ANOVA', inDataLab: 'One-way ANOVA', why: 'Three or more independent groups, numeric outcome.', assumptions: ['Independent groups', 'Roughly normal in each group', 'Similar variances (else Welch’s ANOVA)'], report: 'F(__, __) = __, p = __, η² = __. Follow with post-hoc tests.', alternative: 'Kruskal-Wallis test if not normal' }
    : { test: 'Kruskal-Wallis test', inDataLab: 'Kruskal-Wallis', why: 'Three or more independent groups, ordinal or non-normal outcome.', assumptions: ['Independent groups'], report: 'H(__) = __, p = __.', alternative: null };
}

// ------------------------------------------------------------------ export

/** Rows to CSV (RFC 4180 quoting). */
export function toCsv(rows: (string | number | null)[][]): string {
  return rows.map((row) => row.map((cell) => {
    const value = cell === null || cell === undefined ? '' : String(cell);
    return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  }).join(',')).join('\r\n');
}

/** Papers to RIS, for Zotero, Mendeley and EndNote. */
export function toRis(papers: { title: string; authors?: string[]; year?: number | null; venue?: string | null; doi?: string | null; url?: string | null }[]): string {
  return papers.map((paper) => [
    'TY  - JOUR', `TI  - ${paper.title}`, ...(paper.authors ?? []).map((author) => `AU  - ${author}`),
    ...(paper.year ? [`PY  - ${paper.year}`] : []), ...(paper.venue ? [`JO  - ${paper.venue}`] : []), ...(paper.doi ? [`DO  - ${paper.doi}`] : []),
    ...(paper.url ? [`UR  - ${paper.url}`] : []), 'ER  - ',
  ].join('\r\n')).join('\r\n\r\n');
}

/** Starts a browser download of text. */
export function download(name: string, text: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
