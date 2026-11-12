import { anova, chiSquare, pairedT, parseCsv, pearson, toColumns, welch, type Column, type TestResult } from './stats';
import { linearRegression, mannWhitney } from '../components/app/analysis/stats';
import { cronbachAlpha, diagnosticAccuracy, fisherExact, kruskalWallis, logisticRegression, mcnemar, rocAnalysis, spearman, survivalAnalysis, wilcoxonSignedRank, type ChartResult, type SurvivalChart } from './statsMore';
import { ANALYSIS_IDS, analysisDef, slotOf, variableRange, type AnalysisOptions, type AnalysisTest } from './dataLabAnalyses';

export type { AnalysisTest } from './dataLabAnalyses';
/** The calculation version of new analyses. */
export const DATA_LAB_VERSION = 'data-lab-2026-11-13';
/** Versions whose calculations this code reproduces exactly (2026-11-13 only added tests). */
export const COMPATIBLE_VERSIONS = new Set(['data-lab-2026-11-12', DATA_LAB_VERSION]);
export type ColumnKinds = Record<string, 'numeric' | 'categorical'>;
export type AnalysisSpec = { test: AnalysisTest; variables: string[]; options?: AnalysisOptions; kinds: ColumnKinds; at: string; dataset_sha256: string; missing: 'complete_observations'; rows_used: number; rows_omitted: number };
export type DataTransformation = { at: string; action: 'load' | 'edit_data' | 'column_type' | 'derive'; detail: string };
export type AnalysisResult = TestResult & { chart?: SurvivalChart };
export type Reproducibility = {
  schema: 1; software: string; created_at: string; dataset_sha256: string; rows: number; columns: string[]; truncated: boolean;
  column_kinds: ColumnKinds; transformations: DataTransformation[]; analyses: AnalysisSpec[]; notes: string;
};
export type AnalysisBundle = { format: 'aiforresearch-data-lab'; reproducibility: Reproducibility; dataset_name: string; dataset_csv?: string; results: AnalysisResult[] };

export async function datasetHash(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Matches the existing Data Lab type overrides so saved runs use the same observations. */
export function analysisColumns(text: string, kinds: ColumnKinds): Column[] {
  const parsed = parseCsv(text);
  return toColumns(parsed.header, parsed.rows).map((column, index) => {
    const forced = kinds[column.name];
    if (!forced || forced === column.kind) return column;
    const one = toColumns([column.name], parsed.rows.map((row) => [row[index] ?? '']))[0];
    return forced === 'categorical' ? { ...one, kind: 'categorical', values: one.values.map(() => null) }
      : { ...one, kind: 'numeric', values: one.labels.map((label) => label === null ? null : Number(label.replace(',', '.'))).map((value) => Number.isFinite(value) ? value : null) };
  });
}

/** Keeps a result inside the sizes History and bundles accept. */
export function boundResult(result: ChartResult): AnalysisResult {
  const cut = (value: string, max: number) => (value.length > max ? `${value.slice(0, max - 1)}…` : value);
  return {
    title: cut(result.title, 300), apa: cut(result.apa, 2000), warnings: result.warnings.slice(0, 10).map((warning) => cut(warning, 400)),
    rows: result.rows.slice(0, 60).map(([label, value]) => [cut(label, 200), cut(value, 300)] as [string, string]),
    ...(result.chart ? { chart: { ...result.chart, x: cut(result.chart.x, 200), y: cut(result.chart.y, 200), series: result.chart.series.slice(0, 12).map((series) => ({ name: cut(series.name, 200), points: series.points.slice(0, 420) })) } } : {}),
  };
}

export function runAnalysis(text: string, spec: Pick<AnalysisSpec, 'test' | 'variables' | 'kinds' | 'options'>) {
  const def = analysisDef(spec.test);
  if (!def) throw new Error('The bundle contains an unsupported analysis specification.');
  const [min, max] = variableRange(def);
  if (spec.variables.length < min || spec.variables.length > max) throw new Error(`${def.name} needs ${min === max ? min : `${min} to ${max}`} columns.`);
  const columns = analysisColumns(text, spec.kinds);
  const picked = spec.variables.map((name) => columns.find((column) => column.name === name));
  if (picked.some((column) => !column)) throw new Error('The saved analysis refers to a missing column.');
  const cols = picked as Column[];
  const [a, b, c] = cols;
  const names: [string, string] = [a.name, b?.name ?? ''];
  const options = spec.options ?? {};
  let result: ChartResult;
  switch (spec.test) {
    case 'pearson': result = pearson(a.values, b.values, names); break;
    case 'regression': result = linearRegression(a.values, b.values, names); break;
    case 'paired': result = pairedT(a.values, b.values, names); break;
    case 'welch': result = welch(a.values, b.labels, names); break;
    case 'mann': result = mannWhitney(a.values, b.labels, names); break;
    case 'anova': result = anova(a.values, b.labels, names); break;
    case 'chi': result = chiSquare(a.labels, b.labels, names); break;
    case 'spearman': result = spearman(a.values, b.values, names); break;
    case 'wilcoxon': result = wilcoxonSignedRank(a.values, b.values, names); break;
    case 'kruskal': result = kruskalWallis(a.values, b.labels, names); break;
    case 'fisher': result = fisherExact(a.labels, b.labels, names); break;
    case 'mcnemar': result = mcnemar(a.labels, b.labels, names); break;
    case 'logistic': result = logisticRegression({ name: a.name, labels: a.labels }, cols.slice(1).map((column) => ({ name: column.name, kind: column.kind, values: column.values, labels: column.labels })), options.positive); break;
    case 'survival': result = survivalAnalysis({ name: a.name, values: a.values }, { name: b.name, labels: b.labels }, c ? { name: c.name, labels: c.labels } : null, options.event); break;
    case 'diagnostic': result = diagnosticAccuracy({ name: a.name, labels: a.labels }, { name: b.name, labels: b.labels }, options.positive, options.reference_positive); break;
    case 'roc': result = rocAnalysis({ name: a.name, values: a.values }, { name: b.name, labels: b.labels }, options.reference_positive); break;
    case 'alpha': result = cronbachAlpha(cols.map((column) => ({ name: column.name, values: column.values }))); break;
    default: throw new Error('The bundle contains an unsupported analysis specification.');
  }
  // Complete observations: every chosen column has a value (numbers for numeric slots, categories otherwise).
  const present = (column: Column, index: number, kind: 'numeric' | 'categorical' | 'any') => {
    const as = kind === 'any' ? column.kind : kind;
    return as === 'numeric' ? column.values[index] !== null : column.labels[index] !== null;
  };
  const total = a.labels.length;
  let used = 0;
  for (let index = 0; index < total; index += 1) if (cols.every((column, at) => present(column, index, slotOf(def, at).kind))) used += 1;
  return { result: boundResult(result), rows_used: used, rows_omitted: total - used };
}

/** Reject a changed dataset instead of quietly rerunning a saved analysis on different data. */
export async function rerunAnalyses(text: string, reproducibility: Reproducibility): Promise<AnalysisResult[]> {
  const hash = await datasetHash(text);
  if (hash !== reproducibility.dataset_sha256) throw new Error('This dataset does not match the saved SHA-256 fingerprint. Load the original data or start a new analysis.');
  if (!COMPATIBLE_VERSIONS.has(reproducibility.software)) throw new Error('This bundle uses another calculation version. Keep its original results; start a new analysis to compare versions.');
  return reproducibility.analyses.map((spec) => {
    if (spec.dataset_sha256 !== hash) throw new Error('A saved analysis refers to a different dataset version.');
    return runAnalysis(text, spec).result;
  });
}

export function parseAnalysisBundle(text: string): AnalysisBundle {
  const bundle = JSON.parse(text) as AnalysisBundle;
  if (bundle?.format !== 'aiforresearch-data-lab' || bundle.reproducibility?.schema !== 1 || !Array.isArray(bundle.reproducibility.analyses) || !Array.isArray(bundle.results)) throw new Error('Choose an AI for Research Data Lab reproducibility bundle.');
  if (bundle.dataset_csv !== undefined && typeof bundle.dataset_csv !== 'string') throw new Error('The bundle contains an invalid dataset.');
  const isKinds = (value: unknown) => Boolean(value && typeof value === 'object' && !Array.isArray(value) && Object.entries(value).length <= 200 && Object.entries(value).every(([key, kind]) => key.length <= 200 && (kind === 'numeric' || kind === 'categorical')));
  const isHash = (value: unknown) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
  const isDate = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value));
  const isCount = (value: unknown) => Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 50_000;
  const isOptions = (value: unknown) => value === undefined || Boolean(value && typeof value === 'object' && !Array.isArray(value) && Object.entries(value).every(([key, option]) => ['positive', 'reference_positive', 'event'].includes(key) && typeof option === 'string' && option.length <= 200));
  const variablesFit = (test: string, variables: unknown) => {
    const def = analysisDef(test);
    if (!def || !Array.isArray(variables) || variables.some((value) => typeof value !== 'string' || value.length > 200)) return false;
    const [min, max] = variableRange(def);
    return variables.length >= min && variables.length <= max;
  };
  for (const spec of bundle.reproducibility.analyses) if (!spec || !ANALYSIS_IDS.has(spec.test) || !variablesFit(spec.test, spec.variables) || !isOptions(spec.options) || !isKinds(spec.kinds) || !isHash(spec.dataset_sha256) || !isDate(spec.at) || spec.missing !== 'complete_observations' || !isCount(spec.rows_used) || !isCount(spec.rows_omitted)) throw new Error('The bundle contains an unsupported analysis specification.');
  const r = bundle.reproducibility;
  if (typeof bundle.dataset_name !== 'string' || bundle.dataset_name.length > 200 || typeof r.software !== 'string' || !isDate(r.created_at) || !isHash(r.dataset_sha256) || !isCount(r.rows) || typeof r.truncated !== 'boolean' || !Array.isArray(r.columns) || r.columns.length > 200 || r.columns.some((name) => typeof name !== 'string' || name.length > 200) || !isKinds(r.column_kinds) || typeof r.notes !== 'string' || r.notes.length > 10_000 || !Array.isArray(r.transformations) || r.transformations.length > 300 || r.analyses.length > 30 || bundle.results.length > 30) throw new Error('The bundle contains an invalid reproducibility record.');
  if (r.transformations.some((step) => !step || !isDate(step.at) || !['load', 'edit_data', 'column_type', 'derive'].includes(step.action) || typeof step.detail !== 'string' || step.detail.length > 500)) throw new Error('The bundle contains an invalid dataset change log.');
  if (bundle.results.some((result) => !result || typeof result.title !== 'string' || typeof result.apa !== 'string' || !Array.isArray(result.warnings) || result.warnings.some((warning) => typeof warning !== 'string') || !Array.isArray(result.rows) || result.rows.some((row) => !Array.isArray(row) || row.length !== 2 || row.some((value) => typeof value !== 'string')))) throw new Error('The bundle contains invalid results.');
  return bundle;
}
