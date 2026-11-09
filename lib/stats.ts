/**
 * Statistics for the quick data analysis tool (/tools/data-analysis). Calculated, never generated:
 * the PRD requires analysis results to be deterministic and reproducible. Runs in the browser;
 * tests in tests/server/tools.test.ts check it against published values.
 */

// ------------------------------------------------------------------ CSV

/** RFC 4180-ish: quoted fields, doubled quotes, commas, semicolons or tabs (whichever the header uses most). */
export function parseCsv(input: string, maxRows = 50_000): { header: string[]; rows: string[][]; truncated: boolean } {
  const text = input.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const firstLine = text.slice(0, text.indexOf('\n') === -1 ? undefined : text.indexOf('\n'));
  const delimiter = [',', ';', '\t'].map((d) => [d, firstLine.split(d).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const records: string[][] = [];
  let field = '';
  let record: string[] = [];
  let quoted = false;
  let truncated = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && field === '') quoted = true;
    else if (char === delimiter) { record.push(field); field = ''; }
    else if (char === '\n') {
      record.push(field); field = '';
      if (record.some((value) => value.trim() !== '')) records.push(record);
      record = [];
      if (records.length > maxRows) { truncated = true; break; }
    } else field += char;
  }
  if (!truncated && (field !== '' || record.length)) { record.push(field); if (record.some((v) => v.trim() !== '')) records.push(record); }
  const [header = [], ...rows] = records;
  return { header: header.map((name, index) => name.trim() || `Column ${index + 1}`), rows: rows.slice(0, maxRows), truncated };
}

export type Column = { name: string; kind: 'numeric' | 'categorical'; values: (number | null)[]; labels: (string | null)[] };

const MISSING = new Set(['', 'na', 'n/a', 'nan', 'null', '.', '-', '?']);

export function toNumber(raw: string): number | null {
  const value = raw.trim();
  if (MISSING.has(value.toLowerCase())) return null;
  const clean = value.replace(/^\$|%$/g, '').replace(/(\d),(?=\d{3}\b)/g, '$1');
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(clean)) return null;
  return Number(clean);
}

/** Numeric when at least 90% of the non-missing values are numbers and there are more than 2 distinct values. */
export function toColumns(header: string[], rows: string[][]): Column[] {
  return header.map((name, index) => {
    const raw = rows.map((row) => (row[index] ?? '').trim());
    const present = raw.filter((value) => !MISSING.has(value.toLowerCase()));
    const numbers = raw.map(toNumber);
    const numericShare = present.length ? numbers.filter((n) => n !== null).length / present.length : 0;
    const distinct = new Set(present).size;
    const kind = numericShare >= 0.9 && distinct > 2 ? 'numeric' : 'categorical';
    return { name, kind, values: kind === 'numeric' ? numbers : raw.map(() => null), labels: raw.map((value) => (MISSING.has(value.toLowerCase()) ? null : value)) };
  });
}

// ------------------------------------------------------------------ descriptives

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
export const mean = (xs: number[]) => sum(xs) / xs.length;
export function variance(xs: number[]) {
  const m = mean(xs);
  return sum(xs.map((x) => (x - m) ** 2)) / (xs.length - 1);
}
export const sd = (xs: number[]) => Math.sqrt(variance(xs));

/** Quantile by linear interpolation between order statistics (type 7, the R and Excel default). */
export function quantile(sorted: number[], q: number) {
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

export type Descriptives = { n: number; missing: number; mean: number; sd: number; min: number; q1: number; median: number; q3: number; max: number };

export function describe(values: (number | null)[]): Descriptives | null {
  const xs = values.filter((v): v is number => v !== null && Number.isFinite(v));
  if (!xs.length) return null;
  const sorted = [...xs].sort((a, b) => a - b);
  return {
    n: xs.length, missing: values.length - xs.length, mean: mean(xs), sd: xs.length > 1 ? sd(xs) : NaN,
    min: sorted[0], q1: quantile(sorted, 0.25), median: quantile(sorted, 0.5), q3: quantile(sorted, 0.75), max: sorted[sorted.length - 1],
  };
}

export function frequencies(labels: (string | null)[]): { value: string; count: number; percent: number }[] {
  const counts = new Map<string, number>();
  for (const label of labels) if (label !== null) counts.set(label, (counts.get(label) ?? 0) + 1);
  const total = sum([...counts.values()]);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, count, percent: total ? (count / total) * 100 : 0 }));
}

// ------------------------------------------------------------------ distributions

/** ln Γ(x), Lanczos approximation (g = 7, n = 9). */
export function logGamma(x: number): number {
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61503916999185, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  x -= 1;
  let a = c[0];
  const t = x + 7.5;
  for (let i = 1; i < 9; i += 1) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

function betaContinuedFraction(a: number, b: number, x: number) {
  const tiny = 1e-30;
  let c = 1;
  let d = 1 - ((a + b) * x) / (a + 1);
  if (Math.abs(d) < tiny) d = tiny;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 300; m += 1) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < tiny) d = tiny;
    c = 1 + aa / c; if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d; h *= d * c;
    aa = (-(a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d; if (Math.abs(d) < tiny) d = tiny;
    c = 1 + aa / c; if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < 1e-12) break;
  }
  return h;
}

/** The regularised incomplete beta function I_x(a, b). */
export function incompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (front * betaContinuedFraction(a, b, x)) / a : 1 - (front * betaContinuedFraction(b, a, 1 - x)) / b;
}

/** The regularised upper incomplete gamma function Q(a, x). */
export function upperGamma(a: number, x: number): number {
  if (x <= 0) return 1;
  if (x < a + 1) {
    let term = 1 / a;
    let total = term;
    for (let n = 1; n < 500; n += 1) { term *= x / (a + n); total += term; if (Math.abs(term) < Math.abs(total) * 1e-14) break; }
    return 1 - total * Math.exp(-x + a * Math.log(x) - logGamma(a));
  }
  const tiny = 1e-30;
  let b = x + 1 - a;
  let c = 1 / tiny;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 500; i += 1) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b; if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c; if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < 1e-14) break;
  }
  return Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
}

/** Two-tailed p for Student's t. */
export const tTwoTailed = (t: number, df: number) => incompleteBeta(df / (df + t * t), df / 2, 0.5);
/** Upper-tail p for F. */
export const fUpper = (f: number, df1: number, df2: number) => (f <= 0 ? 1 : incompleteBeta(df2 / (df2 + df1 * f), df2 / 2, df1 / 2));
/** Upper-tail p for chi-square. */
export const chiSquareUpper = (x: number, df: number) => upperGamma(df / 2, x / 2);

// ------------------------------------------------------------------ tests

/** APA number style: 2 decimals; p and r without the leading zero; p < .001. */
export const fixed = (value: number, digits = 2) => (Number.isFinite(value) ? value.toFixed(digits) : '—');
export const noLeadingZero = (value: number, digits = 2) => fixed(value, digits).replace(/^(-?)0\./, '$1.');
export const formatP = (p: number) => (p < 0.001 ? 'p < .001' : `p = ${noLeadingZero(p, 3)}`);

export type TestResult = { title: string; rows: [string, string][]; apa: string; warnings: string[] };

const pairs = (x: (number | null)[], y: (number | null)[]) => {
  const xs: number[] = [];
  const ys: number[] = [];
  x.forEach((value, index) => { const other = y[index]; if (value !== null && other !== null && other !== undefined) { xs.push(value); ys.push(other); } });
  return [xs, ys] as const;
};

export function pearson(x: (number | null)[], y: (number | null)[], names: [string, string]): TestResult {
  const [xs, ys] = pairs(x, y);
  const n = xs.length;
  if (n < 3) return { title: 'Pearson correlation', rows: [], apa: '', warnings: ['Need at least 3 cases with both values.'] };
  const mx = mean(xs); const my = mean(ys);
  const sxy = sum(xs.map((v, i) => (v - mx) * (ys[i] - my)));
  const r = sxy / Math.sqrt(sum(xs.map((v) => (v - mx) ** 2)) * sum(ys.map((v) => (v - my) ** 2)));
  const df = n - 2;
  const t = r * Math.sqrt(df / Math.max(1e-15, 1 - r * r));
  const p = Math.abs(r) >= 1 ? 0 : tTwoTailed(t, df);
  const strength = Math.abs(r) < 0.1 ? 'negligible' : Math.abs(r) < 0.3 ? 'weak' : Math.abs(r) < 0.5 ? 'moderate' : 'strong';
  return {
    title: `Pearson correlation: ${names[0]} and ${names[1]}`,
    rows: [['r', noLeadingZero(r)], ['N', String(n)], ['df', String(df)], ['p (two-tailed)', formatP(p)]],
    apa: `There was a ${strength} ${r >= 0 ? 'positive' : 'negative'} correlation between ${names[0]} and ${names[1]}, r(${df}) = ${noLeadingZero(r)}, ${formatP(p)}.`,
    warnings: n < 30 ? ['Small sample: the estimate is imprecise.'] : [],
  };
}

/** Welch's t-test for a numeric outcome across the two groups of a categorical column. */
export function welch(outcome: (number | null)[], groups: (string | null)[], names: [string, string]): TestResult {
  const levels = frequencies(groups).map((f) => f.value);
  if (levels.length !== 2) return { title: 'Independent t-test', rows: [], apa: '', warnings: [`${names[1]} must have exactly two groups (it has ${levels.length}). Use ANOVA for more.`] };
  const [a, b] = levels.map((level) => outcome.filter((v, i): v is number => v !== null && groups[i] === level));
  if (a.length < 2 || b.length < 2) return { title: 'Independent t-test', rows: [], apa: '', warnings: ['Each group needs at least 2 values.'] };
  const va = variance(a); const vb = variance(b);
  const se = Math.sqrt(va / a.length + vb / b.length);
  const t = (mean(a) - mean(b)) / se;
  const df = (va / a.length + vb / b.length) ** 2 / ((va / a.length) ** 2 / (a.length - 1) + (vb / b.length) ** 2 / (b.length - 1));
  const p = tTwoTailed(t, df);
  const pooled = Math.sqrt(((a.length - 1) * va + (b.length - 1) * vb) / (a.length + b.length - 2));
  const d = (mean(a) - mean(b)) / pooled;
  return {
    title: `Welch’s t-test: ${names[0]} by ${names[1]}`,
    rows: [
      [`${levels[0]}: M (SD), n`, `${fixed(mean(a))} (${fixed(Math.sqrt(va))}), ${a.length}`],
      [`${levels[1]}: M (SD), n`, `${fixed(mean(b))} (${fixed(Math.sqrt(vb))}), ${b.length}`],
      ['t', fixed(t)], ['df', fixed(df)], ['p (two-tailed)', formatP(p)], ['Cohen’s d', fixed(d)],
    ],
    apa: `${names[0]} was ${p < 0.05 ? '' : 'not '}significantly different between ${levels[0]} (M = ${fixed(mean(a))}, SD = ${fixed(Math.sqrt(va))}) and ${levels[1]} (M = ${fixed(mean(b))}, SD = ${fixed(Math.sqrt(vb))}), t(${fixed(df)}) = ${fixed(t)}, ${formatP(p)}, d = ${fixed(d)}.`,
    warnings: Math.min(a.length, b.length) < 15 ? ['Small groups: check that the values are roughly normal.'] : [],
  };
}

export function pairedT(x: (number | null)[], y: (number | null)[], names: [string, string]): TestResult {
  const [xs, ys] = pairs(x, y);
  const diffs = xs.map((v, i) => v - ys[i]);
  if (diffs.length < 2) return { title: 'Paired t-test', rows: [], apa: '', warnings: ['Need at least 2 cases with both values.'] };
  const md = mean(diffs); const sdd = sd(diffs);
  const df = diffs.length - 1;
  const t = md / (sdd / Math.sqrt(diffs.length));
  const p = tTwoTailed(t, df);
  return {
    title: `Paired t-test: ${names[0]} vs ${names[1]}`,
    rows: [[`${names[0]}: M (SD)`, `${fixed(mean(xs))} (${fixed(sd(xs))})`], [`${names[1]}: M (SD)`, `${fixed(mean(ys))} (${fixed(sd(ys))})`], ['Mean difference', fixed(md)], ['t', fixed(t)], ['df', String(df)], ['p (two-tailed)', formatP(p)], ['Cohen’s dz', fixed(md / sdd)]],
    apa: `${names[0]} (M = ${fixed(mean(xs))}, SD = ${fixed(sd(xs))}) was ${p < 0.05 ? '' : 'not '}significantly different from ${names[1]} (M = ${fixed(mean(ys))}, SD = ${fixed(sd(ys))}), t(${df}) = ${fixed(t)}, ${formatP(p)}.`,
    warnings: [],
  };
}

export function anova(outcome: (number | null)[], groups: (string | null)[], names: [string, string]): TestResult {
  const levels = frequencies(groups).map((f) => f.value);
  const samples = levels.map((level) => outcome.filter((v, i): v is number => v !== null && groups[i] === level)).filter((s) => s.length > 0);
  if (samples.length < 2) return { title: 'One-way ANOVA', rows: [], apa: '', warnings: ['Need at least two groups.'] };
  if (samples.length > 30) return { title: 'One-way ANOVA', rows: [], apa: '', warnings: [`${names[1]} has ${samples.length} groups; pick a column with fewer.`] };
  const all = samples.flat();
  const grand = mean(all);
  const ssb = sum(samples.map((s) => s.length * (mean(s) - grand) ** 2));
  const ssw = sum(samples.map((s) => sum(s.map((v) => (v - mean(s)) ** 2))));
  const df1 = samples.length - 1; const df2 = all.length - samples.length;
  const f = ssb / df1 / (ssw / df2);
  const p = fUpper(f, df1, df2);
  const eta = ssb / (ssb + ssw);
  return {
    title: `One-way ANOVA: ${names[0]} by ${names[1]}`,
    rows: [...samples.map((s, i): [string, string] => [`${levels[i]}: M (SD), n`, `${fixed(mean(s))} (${fixed(s.length > 1 ? sd(s) : NaN)}), ${s.length}`]), ['F', fixed(f)], ['df', `${df1}, ${df2}`], ['p', formatP(p)], ['η²', noLeadingZero(eta)]],
    apa: `A one-way ANOVA found ${p < 0.05 ? 'a' : 'no'} significant effect of ${names[1]} on ${names[0]}, F(${df1}, ${df2}) = ${fixed(f)}, ${formatP(p)}, η² = ${noLeadingZero(eta)}.`,
    warnings: p < 0.05 && samples.length > 2 ? ['A significant ANOVA does not say which groups differ; run post-hoc tests in a statistics package.'] : [],
  };
}

export function chiSquare(x: (string | null)[], y: (string | null)[], names: [string, string]): TestResult {
  const rowsLevels = frequencies(x).map((f) => f.value);
  const colLevels = frequencies(y).map((f) => f.value);
  if (rowsLevels.length < 2 || colLevels.length < 2) return { title: 'Chi-square test', rows: [], apa: '', warnings: ['Both columns need at least two categories.'] };
  if (rowsLevels.length * colLevels.length > 400) return { title: 'Chi-square test', rows: [], apa: '', warnings: ['Too many categories for a readable table.'] };
  const table = rowsLevels.map(() => colLevels.map(() => 0));
  let n = 0;
  x.forEach((value, i) => {
    const other = y[i];
    if (value === null || other === null) return;
    table[rowsLevels.indexOf(value)][colLevels.indexOf(other)] += 1;
    n += 1;
  });
  const rowTotals = table.map((row) => sum(row));
  const colTotals = colLevels.map((_, j) => sum(table.map((row) => row[j])));
  let chi = 0; let small = 0;
  table.forEach((row, i) => row.forEach((observed, j) => {
    const expected = (rowTotals[i] * colTotals[j]) / n;
    if (expected < 5) small += 1;
    if (expected > 0) chi += (observed - expected) ** 2 / expected;
  }));
  const df = (rowsLevels.length - 1) * (colLevels.length - 1);
  const p = chiSquareUpper(chi, df);
  const v = Math.sqrt(chi / (n * Math.min(rowsLevels.length - 1, colLevels.length - 1)));
  const cells = rowsLevels.length * colLevels.length;
  return {
    title: `Chi-square test of independence: ${names[0]} and ${names[1]}`,
    rows: [['χ²', fixed(chi)], ['df', String(df)], ['N', String(n)], ['p', formatP(p)], ['Cramér’s V', noLeadingZero(v)]],
    apa: `A chi-square test of independence found ${p < 0.05 ? 'a significant' : 'no significant'} association between ${names[0]} and ${names[1]}, χ²(${df}, N = ${n}) = ${fixed(chi)}, ${formatP(p)}, V = ${noLeadingZero(v)}.`,
    warnings: small / cells > 0.2 ? [`${small} of ${cells} cells have an expected count under 5; the test may not be valid. Consider Fisher’s exact test.`] : [],
  };
}
