import { describe, expect, it } from 'vitest';
import {
  clopperPearson, cronbachAlpha, diagnosticAccuracy, fisherExact, fisherExactP, kaplanMeier, kruskalWallis, logisticRegression, logRank, mcnemar,
  rocAnalysis, sampleSizeCorrelation, sampleSizeDiagnostic, sampleSizePrevalence, spearman, survivalAnalysis, wilcoxonSignedRank,
} from '../../lib/statsMore';
import { analysisScript } from '../../lib/dataLabCode';
import { DATA_LAB_VERSION, datasetHash, parseAnalysisBundle, rerunAnalyses, runAnalysis, type Reproducibility } from '../../lib/dataLabReproducibility';
import { chooseTest } from '../../components/app/analysis/stats';
import logisticReference from './fixtures/logistic-reference.json';

// Reference values from scipy 1.18 (and numpy for logistic regression), computed independently.
const row = (result: { rows: [string, string][] }, label: string) => result.rows.find(([key]) => key.startsWith(label))?.[1];

describe('rank tests', () => {
  it('Spearman matches scipy, with and without ties', () => {
    const r = spearman([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [2, 1, 4, 3, 7, 5, 6, 9, 8, 10], ['x', 'y']);
    expect(row(r, 'rs')).toBe('.93'); // 0.92727
    expect(row(r, 'p')).toBe('p < .001'); // 0.000112
    const ties = spearman([1, 2, 2, 3, 4, 5, 5, 6], [3, 1, 2, 2, 5, 4, 6, 6], ['x', 'y']);
    expect(row(ties, 'rs')).toBe('.78'); // 0.78049
    expect(row(ties, 'p')).toBe('p = .022'); // 0.02228
  });

  it('Wilcoxon signed-rank: exact p (R example, V = 40) and the tie-corrected approximation', () => {
    const x = [1.83, 0.5, 1.62, 2.48, 1.68, 1.88, 1.55, 3.06, 1.3];
    const y = [0.878, 0.647, 0.598, 2.05, 1.06, 1.29, 1.06, 3.14, 1.29];
    const exact = wilcoxonSignedRank(x, y, ['x', 'y']);
    expect(row(exact, 'V')).toBe('40.0');
    expect(row(exact, 'p (two-tailed, exact)')).toBe('p = .039'); // 0.0390625
    const approx = wilcoxonSignedRank([10, 12, 12, 15, 9, 11, 14, 13, 10, 16, 12, 18], [8, 12, 10, 12, 9, 7, 10, 13, 9, 11, 10, 12], ['a', 'b']);
    expect(row(approx, 'V')).toBe('45.0');
    expect(row(approx, 'p (two-tailed, normal')).toBe('p = .009'); // 0.008849
    expect(approx.warnings[0]).toMatch(/3 pairs with no difference/);
  });

  it('Kruskal-Wallis matches scipy, with and without ties', () => {
    const groups = (sizes: number[]) => sizes.flatMap((size, i) => Array<string>(size).fill(`g${i}`));
    const plain = kruskalWallis([2.9, 3.0, 2.5, 2.6, 3.2, 3.8, 2.7, 4.0, 2.4, 2.8, 3.4, 3.7, 2.2, 2.0], groups([5, 4, 5]), ['y', 'g']);
    expect(row(plain, 'H')).toBe('0.77'); // 0.77143
    expect(row(plain, 'p')).toBe('p = .680');
    const tied = kruskalWallis([1, 2, 2, 3, 5, 2, 3, 3, 4, 6, 7, 5, 6, 6, 8], groups([5, 6, 4]), ['y', 'g']);
    expect(row(tied, 'H')).toBe('6.63'); // 6.62782
    expect(row(tied, 'p')).toBe('p = .036'); // 0.036374
  });
});

describe('exact tests for small tables', () => {
  it('Fisher’s exact test: the tea-tasting table and others', () => {
    expect(fisherExactP([[3, 1], [1, 3]])).toBeCloseTo(0.485714, 5);
    expect(fisherExactP([[8, 2], [1, 5]])).toBeCloseTo(0.034965, 5);
    expect(fisherExactP([[12, 5], [3, 9]])).toBeCloseTo(0.025328, 5);
    const labels = (cells: [string, string, number][]) => cells.flatMap(([a, b, n]) => Array.from({ length: n }, () => [a, b] as const));
    const data = labels([['yes', 'yes', 8], ['yes', 'no', 2], ['no', 'yes', 1], ['no', 'no', 5]]);
    const result = fisherExact(data.map(([a]) => a), data.map(([, b]) => b), ['exposed', 'ill']);
    expect(row(result, 'p (two-tailed, exact)')).toBe('p = .035');
    // Rows in sorted order (no, yes): OR = (5·8)/(1·2) = 20.
    expect(row(result, 'Odds ratio')).toMatch(/^20\.00 /);
  });

  it('McNemar gives the exact binomial p on the discordant pairs', () => {
    const before = [...Array(20).fill('yes'), ...Array(9).fill('yes'), ...Array(2).fill('no'), ...Array(15).fill('no')];
    const after = [...Array(20).fill('yes'), ...Array(9).fill('no'), ...Array(2).fill('yes'), ...Array(15).fill('no')];
    const result = mcnemar(before, after, ['before', 'after']);
    expect(row(result, 'p (two-tailed, exact)')).toBe('p = .065'); // 0.0654297
    expect(row(result, 'no → yes')).toBe('2');
  });
});

describe('logistic regression', () => {
  it('matches an independent Newton fit (numeric and categorical predictors)', () => {
    const { age, grp, y, params, bse, llr } = logisticReference;
    const result = logisticRegression(
      { name: 'outcome', labels: y.map(String) },
      [{ name: 'age', kind: 'numeric', values: age, labels: age.map(String) }, { name: 'group', kind: 'categorical', values: grp.map(() => null), labels: grp }],
      '1',
    );
    expect(row(result, 'age: B (SE)')).toBe(`${params[1].toFixed(3)} (${bse[1].toFixed(3)})`);
    expect(row(result, 'group: b: B (SE)')).toBe(`${params[2].toFixed(3)} (${bse[2].toFixed(3)})`);
    expect(row(result, 'group: c: B (SE)')).toBe(`${params[3].toFixed(3)} (${bse[3].toFixed(3)})`);
    expect(row(result, 'Intercept: B (SE)')).toBe(`${params[0].toFixed(3)} (${bse[0].toFixed(3)})`);
    expect(row(result, 'Model χ²')).toBe(`χ²(3) = ${llr.toFixed(2)}, p < .001`);
    expect(row(result, 'Reference categories')).toBe('group: a');
  });

  it('with one binary predictor the odds ratio is the cross-product ratio, and separation is flagged', () => {
    // 2 × 2: exposed 30 events / 10 non-events; unexposed 15 / 25. OR = (30·25)/(10·15) = 5.
    const outcome = [...Array(30).fill('yes'), ...Array(10).fill('no'), ...Array(15).fill('yes'), ...Array(25).fill('no')];
    const exposed = [...Array(40).fill('e'), ...Array(40).fill('u')];
    const result = logisticRegression({ name: 'ill', labels: outcome }, [{ name: 'exp', kind: 'categorical', values: exposed.map(() => null), labels: exposed }], 'yes');
    // Reference is "e" (sorted first), so the "u" term is 1/5.
    const se = Math.sqrt(1 / 30 + 1 / 10 + 1 / 15 + 1 / 25);
    expect(row(result, 'exp: u: OR')).toBe(`0.20 (${Math.exp(Math.log(0.2) - 1.959964 * se).toFixed(2)}–${Math.exp(Math.log(0.2) + 1.959964 * se).toFixed(2)}), p = .001`);
    const separated = logisticRegression({ name: 'y', labels: ['0', '0', '0', '1', '1', '1'] }, [{ name: 'x', kind: 'numeric', values: [1, 2, 3, 4, 5, 6], labels: [] }], '1');
    expect(separated.warnings.join(' ')).toMatch(/separation/);
  });
});

describe('survival', () => {
  // Freireich et al. 6-MP arm (the classic Kaplan-Meier example).
  const t = [6, 6, 6, 7, 10, 13, 16, 22, 23, 6, 9, 10, 11, 17, 19, 20, 25, 32, 32, 34, 35];
  const e = [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0].map(Boolean);

  it('Kaplan-Meier matches scipy, with R’s log-scale intervals', () => {
    const km = kaplanMeier(t, e);
    expect(km.steps.map((step) => step.time)).toEqual([6, 7, 10, 13, 16, 22, 23]);
    [0.857143, 0.806723, 0.752941, 0.690196, 0.627451, 0.537815, 0.448179].forEach((s, i) => expect(km.steps[i].survival).toBeCloseTo(s, 5));
    expect(km.steps[0].lower).toBeCloseTo(0.7198, 3); // R survfit: 0.720, upper 1.000
    expect(km.steps[0].upper).toBe(1);
    expect(km.median).toBe(23);
  });

  it('the log-rank test matches scipy for two groups', () => {
    const times = [1, 3, 4, 5, 8, 10, 12, 2, 2, 3, 6, 7, 9, 11, 13, 15];
    const events = [1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1].map(Boolean);
    const groups = [...Array(7).fill('x'), ...Array(9).fill('y')];
    const test = logRank(times, events, groups)!;
    expect(test.chi).toBeCloseTo(0.40643, 4);
    expect(test.p).toBeCloseTo(0.52379, 4);
    const result = survivalAnalysis({ name: 'months', values: times }, { name: 'died', labels: events.map((value) => (value ? 'yes' : 'no')) }, { name: 'arm', labels: groups }, null);
    expect(row(result, 'Event')).toBe('died = yes');
    expect(result.chart?.series).toHaveLength(2);
    expect(row(result, 'Log-rank')).toBe('χ²(1) = 0.41, p = .524');
  });
});

describe('diagnostic accuracy and ROC', () => {
  it('exact (Clopper-Pearson) intervals match scipy', () => {
    const [lo, hi] = clopperPearson(7, 10);
    expect(lo).toBeCloseTo(0.347547, 5);
    expect(hi).toBeCloseTo(0.93326, 5);
    expect(clopperPearson(0, 10)[1]).toBeCloseTo(0.308497, 5);
  });

  it('reports sensitivity, specificity and predictive values from the 2 × 2 table', () => {
    const cells: [string, string, number][] = [['pos', 'sick', 45], ['pos', 'well', 15], ['neg', 'sick', 5], ['neg', 'well', 135]];
    const pairs = cells.flatMap(([a, b, n]) => Array.from({ length: n }, () => [a, b]));
    const result = diagnosticAccuracy({ name: 'test', labels: pairs.map(([a]) => a) }, { name: 'disease', labels: pairs.map(([, b]) => b) }, 'pos', 'sick');
    expect(row(result, 'Sensitivity')).toMatch(/^90\.0% /);
    expect(row(result, 'Specificity')).toMatch(/^90\.0% /);
    expect(row(result, 'Positive predictive value')).toMatch(/^75\.0% /);
    expect(row(result, 'Negative predictive value')).toMatch(/^96\.4% /);
    expect(row(result, 'Positive likelihood ratio')).toMatch(/^9\.00 /);
  });

  it('AUC and its DeLong standard error match a brute-force calculation', () => {
    const pos = [0.9, 0.8, 0.7, 0.7, 0.55, 0.4, 0.85];
    const neg = [0.3, 0.5, 0.7, 0.2, 0.45, 0.6, 0.1, 0.35];
    const result = rocAnalysis({ name: 'score', values: [...pos, ...neg] }, { name: 'ref', labels: [...pos.map(() => 'case'), ...neg.map(() => 'control')] }, 'case');
    const lo = Math.max(0, 0.875 - 1.959964 * 0.090866).toFixed(3).replace(/^0/, '');
    expect(row(result, 'AUC')).toBe(`.875 (${lo}–1.000)`);
    expect(result.chart?.series[0].points[0]).toEqual([0, 0]);
  });
});

describe('reliability and sample size', () => {
  it('Cronbach’s alpha matches the variance formula and flags a reversed item', () => {
    const items = [[3, 4, 3, 5, 4, 2, 4, 5, 3, 4], [2, 4, 3, 5, 5, 2, 3, 4, 3, 4], [3, 5, 2, 4, 4, 1, 4, 5, 2, 5], [4, 4, 3, 5, 3, 2, 4, 4, 3, 3]];
    const result = cronbachAlpha(items.map((values, i) => ({ name: `q${i + 1}`, values })));
    expect(row(result, 'Cronbach’s α')).toBe('.88'); // 0.88477
    const reversed = cronbachAlpha([...items.slice(0, 3), items[3].map((value) => 6 - value)].map((values, i) => ({ name: `q${i + 1}`, values })));
    expect(reversed.warnings[0]).toMatch(/q4 correlates negatively/);
  });

  it('gives the textbook sample sizes', () => {
    expect(sampleSizePrevalence(0.5, 0.05)).toBe(385); // 384.15 rounded up
    expect(sampleSizePrevalence(0.5, 0.05, 0.95, 1000)).toBe(278);
    expect(sampleSizeCorrelation(0.3)).toBe(85);
    expect(sampleSizeDiagnostic(0.9, 0.85, 0.05, 0.2)).toEqual({ sensitivity: 692, specificity: 245, total: 692 });
  });
});

describe('Data Lab integration', () => {
  const data = ['time,status,arm,q1,q2,q3,score,truth', '5,1,a,3,4,3,0.9,sick', '8,0,a,4,4,5,0.4,well', '12,1,b,2,3,2,0.8,sick', '3,1,b,5,5,4,0.3,well', '9,0,a,3,3,3,0.7,sick', '14,1,b,4,5,5,0.2,well'].join('\n');
  const kinds = {};

  it('runs and reruns the new tests from saved specifications, with their settings', async () => {
    const survival = runAnalysis(data, { test: 'survival', variables: ['time', 'status', 'arm'], kinds, options: { event: '1' } });
    expect(survival.rows_used).toBe(6);
    expect(survival.result.chart?.kind).toBe('survival');
    const alpha = runAnalysis(data, { test: 'alpha', variables: ['q1', 'q2', 'q3'], kinds });
    expect(alpha.result.title).toMatch(/3 items/);
    const sha = await datasetHash(data);
    const at = new Date().toISOString();
    const reproduction: Reproducibility = {
      schema: 1, software: DATA_LAB_VERSION, created_at: at, dataset_sha256: sha, rows: 6, columns: data.split('\n')[0].split(','), truncated: false, column_kinds: {}, transformations: [], notes: '',
      analyses: [
        { test: 'survival', variables: ['time', 'status', 'arm'], options: { event: '1' }, kinds, at, dataset_sha256: sha, missing: 'complete_observations', rows_used: 6, rows_omitted: 0 },
        { test: 'roc', variables: ['score', 'truth'], options: { reference_positive: 'sick' }, kinds, at, dataset_sha256: sha, missing: 'complete_observations', rows_used: 6, rows_omitted: 0 },
      ],
    };
    const rerun = await rerunAnalyses(data, reproduction);
    expect(rerun[0]).toEqual(survival.result);
    expect(row(rerun[1], 'AUC')).toBe('1.000 (1.000–1.000)');
    expect(() => parseAnalysisBundle(JSON.stringify({ format: 'aiforresearch-data-lab', dataset_name: 'd', reproducibility: reproduction, results: rerun }))).not.toThrow();
    // Analyses saved by the previous calculation version still rerun; an unknown version does not.
    await expect(rerunAnalyses(data, { ...reproduction, software: 'data-lab-2026-11-12' })).resolves.toHaveLength(2);
    await expect(rerunAnalyses(data, { ...reproduction, software: 'data-lab-1999' })).rejects.toThrow('another calculation version');
  });

  it('refuses the wrong number of columns and unknown settings', () => {
    expect(() => runAnalysis(data, { test: 'alpha', variables: ['q1'], kinds })).toThrow('needs 2 to 40 columns');
    const bad = { format: 'aiforresearch-data-lab', dataset_name: 'd', results: [], reproducibility: { schema: 1, software: DATA_LAB_VERSION, created_at: new Date().toISOString(), dataset_sha256: 'a'.repeat(64), rows: 1, columns: [], truncated: false, column_kinds: {}, transformations: [], notes: '', analyses: [{ test: 'roc', variables: ['a', 'b'], options: { cutoff: '3' }, kinds: {}, at: new Date().toISOString(), dataset_sha256: 'a'.repeat(64), missing: 'complete_observations', rows_used: 0, rows_omitted: 0 }] } };
    expect(() => parseAnalysisBundle(JSON.stringify(bad))).toThrow('unsupported analysis');
  });

  it('exports R, Python and SPSS scripts that name every analysis and column', () => {
    const at = new Date().toISOString();
    const reproduction: Pick<Reproducibility, 'software' | 'dataset_sha256' | 'columns' | 'analyses'> = {
      software: DATA_LAB_VERSION, dataset_sha256: 'f'.repeat(64), columns: ['follow up (months)', 'status', 'arm', 'q1', 'q2'],
      analyses: [
        { test: 'survival', variables: ['follow up (months)', 'status', 'arm'], options: { event: '1' }, kinds: { 'follow up (months)': 'numeric' }, at, dataset_sha256: 'f'.repeat(64), missing: 'complete_observations', rows_used: 1, rows_omitted: 0 },
        { test: 'alpha', variables: ['q1', 'q2'], kinds: {}, at, dataset_sha256: 'f'.repeat(64), missing: 'complete_observations', rows_used: 1, rows_omitted: 0 },
      ],
    };
    const r = analysisScript('r', reproduction);
    expect(r).toContain('survfit(Surv(`follow up (months)`, status == "1") ~ factor(arm), data = d)');
    expect(r).toContain('alpha(d[, c("q1", "q2")])');
    expect(analysisScript('python', reproduction)).toContain('multivariate_logrank_test');
    const spss = analysisScript('spss', reproduction);
    expect(spss).toContain('follow up (months) -> follow_up__months_');
    expect(spss).toContain('KM follow_up__months_ BY arm /STATUS=event(1)');
    expect(spss).toContain('RELIABILITY /VARIABLES=q1 q2');
  });

  it('the test chooser now points to the tests Data Lab runs', () => {
    expect(chooseTest({ goal: 'relate', outcome: 'ordinal', groups: 'none', paired: false, normal: 'unsure' }).inDataLab).toBe('Correlation (Spearman)');
    expect(chooseTest({ goal: 'predict', outcome: 'categorical', groups: 'none', paired: false, normal: 'unsure' }).inDataLab).toBe('Logistic regression');
    expect(chooseTest({ goal: 'survival', outcome: 'numeric', groups: 'two', paired: false, normal: 'unsure' }).test).toMatch(/Kaplan-Meier/);
    expect(chooseTest({ goal: 'reliability', outcome: 'ordinal', groups: 'none', paired: false, normal: 'unsure' }).inDataLab).toBe('Reliability (Cronbach’s alpha)');
  });
});
