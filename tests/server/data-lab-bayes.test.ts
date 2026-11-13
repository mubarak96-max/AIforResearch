import { describe, expect, it } from 'vitest';
import {
  bayesOneSample, bayesPaired, bayesProportion, bayesTwoSample, betaInverse, betaPosterior, effectPosterior, evidenceLabel, formatBf, jzsBf10, priorScale,
} from '../../lib/bayes';
import { DATA_LAB_VERSION, datasetHash, parseAnalysisBundle, rerunAnalyses, runAnalysis, type AnalysisSpec, type Reproducibility } from '../../lib/dataLabReproducibility';
import { analysisScript } from '../../lib/dataLabCode';
import { ANALYSES } from '../../lib/dataLabAnalyses';
import { chooseTest } from '../../components/app/analysis/stats';
import { curveChartSvg, dataLabReportHtml } from '../../lib/dataLabReport';

/*
 * References:
 * - R BayesFactor manual, ttestBF example on the sleep data (paired, rscale "medium" = √2/2): BF10 = 17.25888.
 * - Every other Bayes factor: scipy 1.18 quad over g of Rouder et al. (2009) eq. 1 (the formula of
 *   pingouin.bayesfactor_ttest), cross-checked by integrating scipy.stats.nct.pdf × Cauchy over δ; both agreed to 1e-12.
 * - δ posterior: scipy nct.pdf × Cauchy(0, r), normalised by quad and inverted by brentq.
 * - Beta intervals: scipy.stats.beta.ppf, beta.sf.
 */
const sleep1 = [0.7, -1.6, -0.2, -1.2, -0.1, 3.4, 3.7, 0.8, 0.0, 2.0];
const sleep2 = [1.9, 0.8, 1.1, 0.1, -0.1, 4.4, 5.5, 1.6, 4.6, 3.4];
const row = (result: { rows: [string, string][] }, label: string) => result.rows.find(([key]) => key.startsWith(label))?.[1];

describe('JZS Bayes factor', () => {
  it('matches the published BayesFactor value for the paired sleep data', () => {
    const t = -4.062127683382037;
    expect(jzsBf10(t, 10, 9)).toBeCloseTo(17.25888, 3);
    expect(jzsBf10(t, 10, 9, 0.5)).toBeCloseTo(15.030413, 3);
    expect(jzsBf10(t, 10, 9, 1)).toBeCloseTo(18.415210, 3);
    const result = bayesPaired(sleep1, sleep2, ['drug 1', 'drug 2']);
    expect(row(result, 'BF10')).toBe('17.26');
    expect(row(result, 'BF01')).toBe('0.058');
    expect(row(result, 'Evidence')).toBe('strong evidence for H1 (a difference)');
  });

  it('matches scipy for two-sample, one-sample and extreme cases', () => {
    expect(jzsBf10(-1.8608134674868524, 5, 18)).toBeCloseTo(1.2659251, 4);
    expect(jzsBf10(2.1005528498187123, 10, 9)).toBeCloseTo(1.4465233, 4);
    expect(jzsBf10(0.5, 5000, 4999) / 0.0180738).toBeCloseTo(1, 3);
    expect(jzsBf10(10, 100, 99) / 5.5202044867e13).toBeCloseTo(1, 3);
    const two = bayesTwoSample([...sleep1, ...sleep2], [...sleep1.map(() => 'one'), ...sleep2.map(() => 'two')], ['extra', 'group']);
    expect(row(two, 'BF10')).toBe('1.27');
    expect(Math.abs(Number(two.rows.find(([key]) => key === 't')?.[1]))).toBe(1.86);
    const one = bayesOneSample(sleep2, 'extra', 1);
    expect(row(one, 'BF10')).toBe('1.45');
    expect(row(one, 'Evidence')).toBe('anecdotal evidence for H1 (a difference)');
  });

  it('Data Lab’s sample data: tutoring vs control', () => {
    const scores = [78, 85, 72, 90, 66, 81, 64, 70, 58, 75, 61, 69];
    const groups = [...Array(6).fill('tutoring'), ...Array(6).fill('control')];
    const result = bayesTwoSample(scores, groups, ['score', 'group']);
    expect(Number(row(result, 'BF10'))).toBeCloseTo(3.5938, 2);
    expect(row(result, 'Evidence')).toBe('moderate evidence for H1 (a difference)');
  });

  it('posterior of δ: median and 95% credible interval match scipy', () => {
    const paired = effectPosterior(-4.062127683382037, 10, 9, 0.707)!;
    expect(paired.median).toBeCloseTo(-1.08377, 2);
    expect(paired.lower).toBeCloseTo(-1.97508, 2);
    expect(paired.upper).toBeCloseTo(-0.28270, 2);
    const two = effectPosterior(-1.8608134674868524, 5, 18, 0.707)!;
    expect(two.median).toBeCloseTo(-0.59264, 2);
    expect(two.lower).toBeCloseTo(-1.50328, 2);
    expect(two.upper).toBeCloseTo(0.17588, 2);
    const one = effectPosterior(2.1005528498187123, 10, 9, 0.707)!;
    expect(one.median).toBeCloseTo(0.53543, 2);
    expect(one.lower).toBeCloseTo(-0.07596, 2);
    expect(one.upper).toBeCloseTo(1.21789, 2);
  });

  it('labels evidence with the Lee-Wagenmakers categories, both ways', () => {
    expect(evidenceLabel(150)).toBe('extreme evidence for H1 (a difference)');
    expect(evidenceLabel(50)).toBe('very strong evidence for H1 (a difference)');
    expect(evidenceLabel(2)).toBe('anecdotal evidence for H1 (a difference)');
    expect(evidenceLabel(1)).toBe('no evidence either way');
    expect(evidenceLabel(1 / 5)).toBe('moderate evidence for H0 (no difference)');
    expect(evidenceLabel(1 / 20)).toBe('strong evidence for H0 (no difference)');
    expect(formatBf(55202044867367)).toBe('5.52e+13');
  });

  it('reads the prior scale setting and refuses nonsense', () => {
    expect(priorScale(undefined)).toBe(Math.SQRT1_2);
    expect(priorScale('0.707')).toBe(Math.SQRT1_2);
    expect(priorScale('1')).toBe(1);
    expect(() => priorScale('-1')).toThrow();
    expect(() => priorScale('abc')).toThrow();
  });

  it('refuses undefined t statistics instead of reporting a number', () => {
    expect(bayesPaired([1, 2, 3], [0, 1, 2], ['a', 'b']).rows).toHaveLength(0);
    expect(bayesTwoSample([1, 2, 3], ['a', 'a', 'b'], ['y', 'g']).rows).toHaveLength(0);
  });
});

describe('beta-binomial proportion', () => {
  it('posterior mean, equal-tailed 95% credible interval and P(p > threshold) match scipy', () => {
    const a = betaPosterior(7, 20, 1, 1, 0.5);
    expect(a.mean).toBeCloseTo(0.363636, 6);
    expect(a.lower).toBeCloseTo(0.181072, 5);
    expect(a.upper).toBeCloseTo(0.569675, 5);
    expect(a.median).toBeCloseTo(0.359434, 5);
    expect(a.above).toBeCloseTo(0.094624, 5);
    const b = betaPosterior(45, 60, 2, 2, 0.6);
    expect(b.mean).toBeCloseTo(0.734375, 6);
    expect(b.lower).toBeCloseTo(0.620597, 5);
    expect(b.upper).toBeCloseTo(0.834287, 5);
    expect(b.above).toBeCloseTo(0.988923, 5);
    const c = betaPosterior(0, 10, 1, 1, 0.1);
    expect(c.lower).toBeCloseTo(0.002299, 5);
    expect(c.upper).toBeCloseTo(0.284914, 5);
    expect(c.above).toBeCloseTo(0.313811, 5);
    expect(betaInverse(0.5, 2, 2)).toBeCloseTo(0.5, 10);
  });

  it('reports the table from a categorical column', () => {
    const labels = [...Array(7).fill('yes'), ...Array(13).fill('no'), null];
    const result = bayesProportion(labels, 'passed', 'yes', 1, 1, 0.5);
    expect(row(result, 'Successes / n')).toBe('7 / 20');
    expect(row(result, '95% credible interval')).toBe('[0.181, 0.570]');
    expect(row(result, 'P(p > 0.5)')).toBe('0.095');
    expect(result.apa).toContain('Beta(1, 1) prior');
  });
});

describe('Bayesian tests in Data Lab', () => {
  const csv = `group,score,passed\n${[78, 85, 72, 90, 66, 81].map((v) => `tutoring,${v},yes`).join('\n')}\n${[64, 70, 58, 75, 61, 69].map((v, i) => `control,${v},${i % 2 ? 'yes' : 'no'}`).join('\n')}`;
  const kinds = {};

  it('runs from the saved specification, with the settings stored, and reruns under the new version', async () => {
    const two = runAnalysis(csv, { test: 'bayes_two', variables: ['score', 'group'], kinds, options: { prior_scale: '0.707' } });
    expect(Number(row(two.result, 'BF10'))).toBeCloseTo(3.59, 2);
    const wide = runAnalysis(csv, { test: 'bayes_two', variables: ['score', 'group'], kinds, options: { prior_scale: '1' } });
    expect(row(wide.result, 'Prior on δ')).toBe('Cauchy(0, 1)');
    const prop = runAnalysis(csv, { test: 'bayes_prop', variables: ['passed'], kinds, options: { positive: 'yes', prior_a: '1', prior_b: '1', threshold: '0.5' } });
    expect(row(prop.result, 'Successes / n')).toBe('9 / 12');
    const one = runAnalysis(csv, { test: 'bayes_one', variables: ['score'], kinds, options: { mu: '70' } });
    expect(row(one.result, 'Test value')).toBe('70');
    expect(() => runAnalysis(csv, { test: 'bayes_prop', variables: ['passed'], kinds, options: { prior_a: '-2' } })).toThrow('Prior a');

    const sha = await datasetHash(csv); const at = new Date().toISOString();
    const reproduction: Reproducibility = {
      schema: 1, software: DATA_LAB_VERSION, created_at: at, dataset_sha256: sha, rows: 12, columns: ['group', 'score', 'passed'], truncated: false, column_kinds: {}, transformations: [], notes: '',
      analyses: [{ test: 'bayes_two', variables: ['score', 'group'], options: { prior_scale: '0.707' }, kinds, at, dataset_sha256: sha, missing: 'complete_observations', rows_used: 12, rows_omitted: 0 }],
    };
    expect(DATA_LAB_VERSION).toBe('data-lab-2026-11-13b');
    expect((await rerunAnalyses(csv, reproduction))[0]).toEqual(two.result);
    // Analyses saved under the two earlier versions still rerun.
    for (const software of ['data-lab-2026-11-12', 'data-lab-2026-11-13']) await expect(rerunAnalyses(csv, { ...reproduction, software })).resolves.toHaveLength(1);
    expect(() => parseAnalysisBundle(JSON.stringify({ format: 'aiforresearch-data-lab', dataset_name: 'd', reproducibility: reproduction, results: [two.result] }))).not.toThrow();
  });

  it('exports R (BayesFactor) and Python (pingouin) code with the same prior', () => {
    const at = new Date().toISOString(); const sha = 'f'.repeat(64);
    const spec = (test: AnalysisSpec['test'], variables: string[], options: AnalysisSpec['options']): AnalysisSpec => ({ test, variables, options, kinds: {}, at, dataset_sha256: sha, missing: 'complete_observations', rows_used: 1, rows_omitted: 0 });
    const reproduction = { software: DATA_LAB_VERSION, dataset_sha256: sha, columns: ['score', 'group', 'before', 'after', 'passed'], analyses: [
      spec('bayes_two', ['score', 'group'], { prior_scale: '1' }), spec('bayes_paired', ['before', 'after'], { prior_scale: '0.707' }),
      spec('bayes_one', ['score'], { mu: '70', prior_scale: '0.5' }), spec('bayes_prop', ['passed'], { positive: 'yes', prior_a: '2', prior_b: '3', threshold: '0.6' }),
    ] };
    const r = analysisScript('r', reproduction);
    expect(r).toContain('ttestBF(formula = score ~ group, data = x, rscale = 1)');
    expect(r).toContain('paired = TRUE, rscale = "medium"');
    expect(r).toContain('mu = 70, rscale = 0.5');
    expect(r).toContain('a <- 2 + k; b <- 3 + n - k');
    expect(r).toContain('1 - pbeta(0.6, a, b)');
    const py = analysisScript('python', reproduction);
    expect(py).toContain('correction=False, r=1');
    expect(py).toContain('paired=True, r=0.707');
    expect(py).toContain('stats.beta(2 + k, 3 + n - k)');
    expect(analysisScript('spss', reproduction)).toContain('BayesFactor');
  });

  it('the chooser recommends the Bayesian version when asked', () => {
    expect(chooseTest({ goal: 'compare', outcome: 'numeric', groups: 'two', paired: true, normal: 'yes', bayes: true }).inDataLab).toBe('Bayesian paired t-test');
    expect(chooseTest({ goal: 'compare', outcome: 'numeric', groups: 'two', paired: false, normal: 'unsure', bayes: true }).inDataLab).toBe('Bayesian independent t-test');
    expect(chooseTest({ goal: 'describe', outcome: 'categorical', groups: 'none', paired: false, normal: 'unsure', bayes: true }).inDataLab).toBe('Bayesian proportion (beta-binomial)');
    // No Bayesian version for non-normal outcomes: the usual recommendation stands.
    expect(chooseTest({ goal: 'compare', outcome: 'numeric', groups: 'two', paired: false, normal: 'no', bayes: true }).inDataLab).toBe('Mann-Whitney U');
    expect(chooseTest({ goal: 'compare', outcome: 'numeric', groups: 'two', paired: false, normal: 'yes' }).inDataLab).toBe('Independent t-test');
    for (const name of ['Bayesian paired t-test', 'Bayesian independent t-test', 'Bayesian proportion (beta-binomial)']) expect(ANALYSES.some((item) => item.name === name)).toBe(true);
  });
});

describe('Data Lab PDF report', () => {
  const base = { title: 'Analysis of <trial>', dataset: 'trial.csv', rows: 12, columns: [{ name: 'score', kind: 'numeric', summary: 'n = 12, M = 72.42' }], software: DATA_LAB_VERSION, datasetSha256: 'a'.repeat(64), generatedAt: '13/11/2026' };
  const table = { title: 'Bayesian independent t-test: score by group', rows: [['BF10', '3.59']] as [string, string][], apa: 'BF10 = 3.59', warnings: ['Few cases'] };
  const survival = { title: 'Kaplan-Meier', rows: [['Median', '10']] as [string, string][], apa: '', warnings: [], chart: { kind: 'survival' as const, x: 'Months', y: 'Survival', series: [{ name: 'A', points: [[0, 1], [5, 0.5]] as [number, number][] }, { name: 'B', points: [[0, 1], [8, 0.25]] as [number, number][] }] } };

  it('holds the dataset summary, every analysis table and chart, and escapes text', () => {
    const html = dataLabReportHtml({ ...base, results: [table, survival] });
    expect(html).toContain('<title>Analysis of &lt;trial&gt;</title>');
    expect(html).toContain('<h2>Dataset summary</h2>');
    expect(html).toContain('n = 12, M = 72.42');
    expect(html).toContain('<h2>Analyses (2)</h2>');
    expect(html).toContain('<td>BF10</td><td class="num">3.59</td>');
    expect(html).toContain('Few cases');
    expect((html.match(/<svg /g) ?? []).length).toBe(1);
    expect(html).toContain('<path d="M48.0,8.0H');
    expect(html).toContain('class="legend"');
    expect(html).not.toContain('Results section');
    expect(html).not.toContain('<script');
  });

  it('adds the AI results section only when one was written', () => {
    const html = dataLabReportHtml({ ...base, results: [table], reportHtml: '<p>Tutoring raised scores.</p>' });
    expect(html).toContain('<h2>Results section</h2>');
    expect(html).toContain('<p>Tutoring raised scores.</p>');
  });

  it('draws ROC curves with the chance line and escapes chart labels', () => {
    const svg = curveChartSvg({ kind: 'roc', x: '1 − specificity', y: '<Sensitivity>', series: [{ name: 'ROC', points: [[0, 0], [0.2, 0.8], [1, 1]] }] }, 'ROC');
    expect(svg).toContain('stroke-dasharray="4 4"');
    expect(svg).toContain('&lt;Sensitivity&gt;');
  });
});
