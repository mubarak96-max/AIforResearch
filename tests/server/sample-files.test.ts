import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { runAnalysis } from '../../lib/dataLabReproducibility';

// The sample files the test plan (docs/testing/test-plan.md) quotes expected results for.
const file = (name: string) => readFileSync(`samples/data-lab/clinical/${name}`, 'utf8');
const row = (result: { rows: [string, string][] }, label: string) => result.rows.find(([key]) => key.startsWith(label))?.[1];
const run = (name: string, test: any, variables: string[], options?: any) => runAnalysis(file(name), { test, variables, kinds: {}, options }).result;

describe('sample files for manual testing', () => {
  it('give the results the test plan promises', () => {
    const km = run('leukaemia-remission-6mp.csv', 'survival', ['weeks_in_remission', 'relapsed', 'treatment']);
    expect(row(km, 'Event')).toBe('relapsed = yes');
    expect(row(km, 'Log-rank')).toBe('χ²(1) = 16.79, p < .001');
    expect(row(km, '6-MP: n, events, median')).toMatch(/^21, 9, 23\.00/);
    expect(row(km, 'placebo: n, events, median')).toMatch(/^21, 21, 8\.00/);
    const dx = run('diagnostic-test-2x2.csv', 'diagnostic', ['rapid_test', 'biopsy']);
    expect(row(dx, 'Positive means')).toBe('rapid_test = positive; biopsy = disease');
    expect(row(dx, 'Sensitivity')).toMatch(/^90\.0%/);
    expect(row(run('roc-biomarker.csv', 'roc', ['biomarker', 'diagnosis']), 'AUC')).toMatch(/^\.875/);
    expect(row(run('fisher-tea-tasting.csv', 'fisher', ['poured_first', 'guess']), 'p (two-tailed, exact)')).toBe('p = .486');
    expect(row(run('depression-scale-before-after.csv', 'wilcoxon', ['first_visit', 'second_visit']), 'p (two-tailed, exact)')).toBe('p = .039');
    expect(row(run('kruskal-three-groups.csv', 'kruskal', ['score', 'group']), 'H')).toBe('0.77');
    expect(row(run('mcnemar-before-after.csv', 'mcnemar', ['passed_before', 'passed_after']), 'p (two-tailed, exact)')).toBe('p = .065');
    expect(row(run('spearman-ranks.csv', 'spearman', ['essay_rank', 'exam_rank']), 'rs')).toBe('.93');
    const logit = run('logistic-admission.csv', 'logistic', ['readmitted', 'age', 'ward'], { positive: 'yes' });
    expect(row(logit, 'age: B (SE)')).toBe('0.133 (0.031)');
    expect(row(logit, 'Reference categories')).toBe('ward: acute');
    expect(row(logit, 'Model χ²')).toBe('χ²(3) = 33.90, p < .001');
    expect(row(run('reliability-scale-items.csv', 'alpha', ['q1', 'q2', 'q3', 'q4']), 'Cronbach’s α')).toBe('.88');
    expect(run('reliability-scale-items.csv', 'alpha', ['q1', 'q2', 'q3', 'q4_reversed_wording']).warnings[0]).toMatch(/q4_reversed_wording correlates negatively/);
  });
});
