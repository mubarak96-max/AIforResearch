import { describe, expect, it } from 'vitest';
import {
  analyse, certainty, effectSizes, eggerTest, emptyGrade, formatEffect, gradeHints, hedgesG, leaveOneOut, looksNumeric, mantelHaenszel, parseNumber,
  pool, resultSentences, subgroups, summaryCsv, summaryRow, tQuantile, tau2Reml, type InputRow, type Setup,
} from '../../lib/metaAnalysis';

// Reference values: metafor's dat.bcg example (13 BCG trials, log risk ratio). The DL and REML
// figures metafor prints were re-derived independently with numpy and scipy 1.18 (REML by direct
// maximisation of the restricted likelihood with scipy.optimize, not the fixed-point iteration used
// here); the MH, Hedges' g, HKSJ, Egger and prediction-interval values come from the same script.
const BCG: [string, number, number, number, number, string][] = [
  ['Aronson 1948', 4, 119, 11, 128, 'random'], ['Ferguson & Simes 1949', 6, 300, 29, 274, 'random'], ['Rosenthal 1960', 3, 228, 11, 209, 'random'],
  ['Hart & Sutherland 1977', 62, 13536, 248, 12619, 'random'], ['Frimodt-Moller 1973', 33, 5036, 47, 5761, 'alternate'], ['Stein & Aronson 1953', 180, 1361, 372, 1079, 'alternate'],
  ['Vandiviere 1973', 8, 2537, 10, 619, 'random'], ['TPT Madras 1980', 505, 87886, 499, 87892, 'random'], ['Coetzee & Berjak 1968', 29, 7470, 45, 7232, 'systematic'],
  ['Rosenthal 1961', 17, 1699, 65, 1600, 'systematic'], ['Comstock 1974', 186, 50448, 141, 27197, 'systematic'], ['Comstock & Webster 1969', 5, 2493, 3, 2338, 'systematic'],
  ['Comstock 1976', 27, 16886, 29, 17825, 'systematic'],
];
const bcgRows: InputRow[] = BCG.map(([label, tpos, tneg, cpos, cneg, alloc]) => ({ record_id: null, label, subgroup: alloc, e1: tpos, n1: tpos + tneg, e2: cpos, n2: cpos + cneg }));
const setup = (extra: Partial<Setup> = {}): Setup => ({ data_type: 'binary', measure: 'RR', model: 'random', method: 'DL', hksj: false, ...extra });

describe('t quantiles', () => {
  it('match scipy.stats.t.ppf(0.975, df)', () => {
    const scipy: [number, number][] = [[1, 12.7062047362], [2, 4.3026527297], [3, 3.1824463053], [5, 2.5705818356], [11, 2.2009851601], [30, 2.0422724563], [100, 1.9839715185]];
    for (const [df, value] of scipy) expect(tQuantile(0.975, df)).toBeCloseTo(value, 6);
  });
});

describe('effect sizes', () => {
  it('log risk ratios for the BCG trials match metafor escalc', () => {
    const { studies } = effectSizes(bcgRows, 'binary', 'RR');
    expect(studies[0].yi).toBeCloseTo(-0.8893113339, 8);
    expect(studies[0].vi).toBeCloseTo(0.325584765, 8);
    expect(studies[1].yi).toBeCloseTo(-1.5853886572, 8);
    expect(studies[2].vi).toBeCloseTo(0.4153679654, 8);
  });

  it('adds 0.5 to every cell when one is zero, and excludes double-zero studies from ratios but not from RD', () => {
    const rows: InputRow[] = [{ record_id: null, label: 'Zero', e1: 0, n1: 20, e2: 5, n2: 20 }, { record_id: null, label: 'Double', e1: 0, n1: 30, e2: 0, n2: 25 }];
    const rr = effectSizes(rows, 'binary', 'RR');
    expect(rr.studies[0]).toMatchObject({ corrected: true });
    expect(rr.studies[0].yi).toBeCloseTo(-2.3978952728, 8);
    expect(rr.studies[0].vi).toBeCloseTo(2.0865800866, 8);
    const or = effectSizes(rows, 'binary', 'OR');
    expect(or.studies[0].yi).toBeCloseTo(-2.677480135, 8);
    expect(or.studies[0].vi).toBeCloseTo(2.2951147987, 8);
    expect(or.excluded).toEqual([{ index: 1, label: 'Double', reason: expect.stringMatching(/No events in either arm/) }]);
    const rd = effectSizes(rows, 'binary', 'RD');
    expect(rd.studies).toHaveLength(2);
    expect(rd.studies[0].yi).toBeCloseTo(-0.25, 10);
    expect(rd.studies[1].corrected).toBe(true);
  });

  it('Hedges’ g with the small-sample correction (Borenstein et al. example)', () => {
    const g = hedgesG(103, 5.5, 50, 100, 4.5, 50);
    expect(g.d).toBeCloseTo(0.5970223141, 8);
    expect(g.j).toBeCloseTo(0.9923273657, 8);
    expect(g.g).toBeCloseTo(0.5924415803, 8);
    expect(g.v).toBeCloseTo(0.0417549351, 8);
    const small = hedgesG(12.1, 3.2, 10, 9.8, 2.9, 12);
    expect(small.g).toBeCloseTo(0.7281672802, 8);
    expect(small.v).toBeCloseTo(0.1953839603, 8);
  });

  it('generic estimates: ratios on the log scale with an SE from the CI', () => {
    const { studies, errors } = effectSizes([
      { record_id: null, label: 'HR', est: 0.8, lower: 0.64, upper: 1.0 },
      { record_id: null, label: 'SE given', est: 1.2, se: 0.1 },
      { record_id: null, label: 'Bad', est: 2, lower: 2.5, upper: 3 },
    ], 'generic', 'HR');
    expect(studies[0].yi).toBeCloseTo(Math.log(0.8), 12);
    expect(studies[0].se).toBeCloseTo((Math.log(1.0) - Math.log(0.64)) / (2 * 1.959963984540054), 12);
    expect(studies[1]).toMatchObject({ se: 0.1 });
    expect(errors[0].message).toMatch(/between its confidence limits/);
  });

  it('reports invalid and missing input clearly', () => {
    const binary = effectSizes([
      { record_id: null, label: 'Too many', e1: 12, n1: 10, e2: 1, n2: 10 },
      { record_id: null, label: 'Half', e1: 1, n1: 10 },
      { record_id: null, label: 'Empty' },
    ], 'binary', 'OR');
    expect(binary.errors.map((error) => error.message)).toEqual(['Events are more than the total in the intervention arm.', 'Missing events (comparison), total (comparison).']);
    expect(binary.excluded[0]).toMatchObject({ label: 'Empty', reason: 'No numbers entered yet.' });
    const continuous = effectSizes([{ record_id: null, label: 'SD', m1: 1, sd1: 0, n1: 10, m2: 2, sd2: 1, n2: 10 }], 'continuous', 'SMD');
    expect(continuous.errors[0].message).toBe('Standard deviations must be above 0.');
    expect(effectSizes([{ record_id: null, label: 'No CI', est: 1.3 }], 'generic', 'OR').errors[0].message).toMatch(/95% confidence interval or the standard error/);
    expect(effectSizes([{ record_id: null, label: 'Neg', est: -1, se: 0.2 }], 'generic', 'RR').errors[0].message).toMatch(/above 0/);
  });
});

describe('pooling the BCG trials', () => {
  const { studies } = effectSizes(bcgRows, 'binary', 'RR');

  it('fixed effect, inverse variance', () => {
    const result = pool(studies, setup({ model: 'fixed', method: 'IV' }))!;
    expect(result.estimate).toBeCloseTo(-0.4302851637, 8);
    expect(result.se).toBeCloseTo(0.0404987517, 8);
    expect(result.Q).toBeCloseTo(152.2330080824, 6);
    expect(result.df).toBe(12);
    expect(result.I2).toBeCloseTo(92.1173468546, 6);
    expect(result.prediction).toBeNull();
  });

  it('DerSimonian-Laird: −0.7141 (SE 0.1787), tau² 0.3088, I² 92.12%, Q(12) = 152.23', () => {
    const result = pool(studies, setup())!;
    expect(result.estimate).toBeCloseTo(-0.7141172221, 8);
    expect(result.se).toBeCloseTo(0.1787420895, 8);
    expect(result.tau2).toBeCloseTo(0.3087602629, 8);
    expect(result.I2).toBeCloseTo(92.1173468546, 6);
    expect(result.Q).toBeCloseTo(152.2330080824, 6);
    expect(result.p).toBeCloseTo(6.46292e-5, 8);
    expect(result.lower).toBeCloseTo(-1.0644452801, 7);
    expect(result.upper).toBeCloseTo(-0.3637891641, 7);
    // Prediction interval with t(k − 2).
    expect(result.prediction![0]).toBeCloseTo(-1.9988384958, 6);
    expect(result.prediction![1]).toBeCloseTo(0.5706040516, 6);
    expect(formatEffect(result.estimate, 'RR')).toBe('0.49');
    expect(result.weights.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 10);
  });

  it('REML: −0.7145 (SE 0.1798), tau² 0.3132', () => {
    const result = pool(studies, setup({ method: 'REML' }))!;
    expect(result.converged).toBe(true);
    expect(result.estimate).toBeCloseTo(-0.7145323421, 6);
    expect(result.se).toBeCloseTo(0.1797815159, 6);
    expect(result.tau2).toBeCloseTo(0.3132432573, 6);
    expect(result.prediction![0]).toBeCloseTo(-2.0083759052, 5);
  });

  it('REML reports non-convergence', () => {
    expect(tau2Reml(studies, 1, 1e-30)).toMatchObject({ converged: false, iterations: 1 });
  });

  it('Hartung-Knapp-Sidik-Jonkman with t(k − 1)', () => {
    const dl = pool(studies, setup({ hksj: true }))!;
    expect(dl.se).toBeCloseTo(0.1806966283, 8);
    expect(dl.lower).toBeCloseTo(-1.1078213542, 6);
    expect(dl.upper).toBeCloseTo(-0.32041309, 6);
    expect(dl.p).toBeCloseTo(0.0019207668, 7);
    expect(dl.df_test).toBe(12);
    const reml = pool(studies, setup({ method: 'REML', hksj: true }))!;
    expect(reml.se).toBeCloseTo(0.1807917441, 6);
  });

  it('Mantel-Haenszel OR, RR and RD', () => {
    const rr = mantelHaenszel(studies, 'RR')!;
    expect(rr.estimate).toBeCloseTo(-0.4537096047, 8);
    expect(rr.se).toBeCloseTo(0.0393373669, 8);
    const orStudies = effectSizes(bcgRows, 'binary', 'OR').studies;
    const or = pool(orStudies, setup({ measure: 'OR', model: 'fixed', method: 'MH' }))!;
    expect(or.method).toBe('MH');
    expect(or.estimate).toBeCloseTo(-0.4734109884, 8);
    expect(or.se).toBeCloseTo(0.0410077784, 8);
    expect(or.Q).toBeCloseTo(163.9425795692, 5);
    const rd = mantelHaenszel(effectSizes(bcgRows, 'binary', 'RD').studies, 'RD')!;
    expect(rd.estimate).toBeCloseTo(-0.0032881818, 9);
    expect(rd.se).toBeCloseTo(0.0002845159, 9);
    // One table: MH OR is the plain OR and the RBG variance is Woolf's.
    const single = mantelHaenszel(effectSizes([{ record_id: null, label: 'x', e1: 10, n1: 50, e2: 20, n2: 50 }], 'binary', 'OR').studies, 'OR')!;
    expect(single.estimate).toBeCloseTo(Math.log((10 * 30) / (40 * 20)), 12);
    expect(single.se ** 2).toBeCloseTo(1 / 10 + 1 / 40 + 1 / 20 + 1 / 30, 12);
  });

  it('subgroups by allocation, with the test for subgroup differences', () => {
    const result = subgroups(studies, setup())!;
    const byName = Object.fromEntries(result.groups.map((group) => [group.name, group.pooled]));
    expect(byName.random.estimate).toBeCloseTo(-1.1137562903, 7);
    expect(byName.random.tau2).toBeCloseTo(0.9621732537, 7);
    expect(byName.alternate.estimate).toBeCloseTo(-0.5407929618, 7);
    expect(byName.systematic.se).toBeCloseTo(0.2291846416, 7);
    expect(result.Q).toBeCloseTo(1.7954222721, 6);
    expect(result.df).toBe(2);
    expect(result.p).toBeCloseTo(0.4075013082, 6);
  });

  it('leave-one-out', () => {
    const result = leaveOneOut(studies, setup());
    expect(result).toHaveLength(13);
    expect(result[0].estimate).toBeCloseTo(-0.7051251984, 7);
    expect(result[7].estimate).toBeCloseTo(-0.7900865999, 7);
  });

  it('Egger’s regression test', () => {
    const egger = eggerTest(studies)!;
    expect(egger.intercept).toBeCloseTo(-2.1120421209, 7);
    expect(egger.se).toBeCloseTo(1.5072213284, 7);
    expect(egger.p).toBeCloseTo(0.1887069951, 6);
    expect(egger.warning).toBeNull();
    expect(eggerTest(studies.slice(0, 5))!.warning).toMatch(/fewer than 10/);
  });

  it('writes plain-English results', () => {
    const analysis = analyse(bcgRows, setup());
    const sentences = resultSentences(analysis, 'tuberculosis');
    expect(sentences[0]).toBe('Pooling 13 studies with 357,347 participants, the risk ratio for tuberculosis was 0.49 (95% CI 0.34 to 0.70; p < 0.001; random-effects model, DerSimonian-Laird).');
    expect(sentences.join(' ')).toMatch(/I² = 92%/);
    expect(sentences.join(' ')).toMatch(/prediction interval.*0\.14 to 1\.77/);
  });
});

describe('continuous outcomes', () => {
  const CONT: [number, number, number, number, number, number][] = [[12.1, 3.2, 10, 9.8, 2.9, 12], [25.0, 6.0, 30, 22.0, 6.5, 28], [8.4, 2.0, 15, 8.9, 2.2, 15], [40.2, 10.1, 60, 35.5, 9.8, 62], [15.0, 4.0, 20, 11.0, 4.4, 21]];
  const rows: InputRow[] = CONT.map(([m1, sd1, n1, m2, sd2, n2], i) => ({ record_id: null, label: `S${i + 1}`, m1, sd1, n1, m2, sd2, n2 }));

  it('SMD with REML and HKSJ, and its prediction interval', () => {
    const { studies } = effectSizes(rows, 'continuous', 'SMD');
    expect(studies.map((study) => study.yi)).toEqual([0.7281672802, 0.4738405372, -0.2313980242, 0.4694679983, 0.9317562614].map((value) => expect.closeTo(value, 8)));
    const plain = pool(studies, { data_type: 'continuous', measure: 'SMD', model: 'random', method: 'REML', hksj: false })!;
    expect(plain.tau2).toBeCloseTo(0.0072555123, 6);
    expect(plain.estimate).toBeCloseTo(0.4760797992, 6);
    expect(plain.prediction![0]).toBeCloseTo(-0.0224364446, 5);
    expect(plain.prediction![1]).toBeCloseTo(0.9745960429, 5);
    const hk = pool(studies, { data_type: 'continuous', measure: 'SMD', model: 'random', method: 'REML', hksj: true })!;
    expect(hk.lower).toBeCloseTo(0.0422529652, 5);
    expect(hk.upper).toBeCloseTo(0.9099066331, 5);
    expect(hk.p).toBeCloseTo(0.0381452241, 5);
    const dl = pool(studies, { data_type: 'continuous', measure: 'SMD', model: 'random', method: 'DL', hksj: true })!;
    expect(dl.tau2).toBeCloseTo(0.0424009743, 8);
    expect(dl.p).toBeCloseTo(0.0495166595, 6);
  });

  it('mean difference, fixed effect', () => {
    const result = analyse(rows, { data_type: 'continuous', measure: 'MD', model: 'fixed', method: 'IV', hksj: false }).pooled!;
    expect(result.estimate).toBeCloseTo(1.5171494866, 8);
    expect(result.se).toBeCloseTo(0.5319247696, 8);
    expect(result.I2).toBeCloseTo(72.9165648833, 6);
  });
});

describe('GRADE', () => {
  it('starts randomised trials high and observational studies low, and counts downgrades and upgrades', () => {
    const grade = emptyGrade('randomised');
    expect(certainty(grade).label).toBe('high');
    grade.downgrade.inconsistency.level = 1;
    expect(certainty(grade).label).toBe('moderate');
    grade.downgrade.imprecision.level = 2;
    grade.downgrade.risk_of_bias.level = 2;
    expect(certainty(grade)).toMatchObject({ level: 1, label: 'very low' });
    // Upgrades count only for observational evidence.
    grade.upgrade.large_effect.level = 2;
    expect(certainty(grade).label).toBe('very low');
    const observational = emptyGrade('observational');
    expect(certainty(observational).label).toBe('low');
    observational.upgrade.large_effect.level = 2;
    observational.upgrade.dose_response.level = 1;
    expect(certainty(observational).label).toBe('high');
  });

  it('suggests, from the numbers and the extraction ratings, without deciding', () => {
    const rows = bcgRows.map((row, index) => ({ ...row, record_id: `r${index}` }));
    const analysis = analyse(rows.slice(0, 6), setup());
    const rob = new Map<string, Record<string, string>>([['r0', { randomisation: 'high' }], ['r1', { randomisation: 'some concerns' }], ['r2', { randomisation: 'low' }]]);
    const hints = gradeHints(analysis, rob, 'randomised');
    expect(hints.risk_of_bias).toEqual(['1 of 6 studies have at least one domain rated high risk in Extraction.', '1 more have some concerns or unclear ratings.', '3 studies have no ratings.']);
    expect(hints.inconsistency?.[0]).toMatch(/above 50%/);
    expect(hints.publication_bias?.[0]).toMatch(/fewer than 10, funnel asymmetry can’t be assessed/);
    const small = analyse([{ record_id: null, label: 'a', e1: 3, n1: 20, e2: 4, n2: 20 }, { record_id: null, label: 'b', e1: 2, n1: 25, e2: 5, n2: 25 }], setup());
    expect(gradeHints(small, new Map(), 'randomised').imprecision).toEqual(['The 95% CI crosses the line of no effect.', 'Only 14 events in all (under the 300-event rule of thumb for an optimal information size).']);
  });

  it('builds the summary of findings row and CSV', () => {
    const grade = emptyGrade('randomised');
    grade.downgrade.inconsistency = { level: 1, reason: 'I² 92%, unexplained' };
    const row = summaryRow('Tuberculosis', analyse(bcgRows, setup()), grade);
    expect(row).toMatchObject({ studies: 13, participants: 357347, effect: 'RR 0.49 (95% CI 0.34 to 0.70)', certainty: 'moderate', reasons: 'Randomised trials; Inconsistency (−1): I² 92%, unexplained' });
    expect(summaryCsv([row]).split('\r\n')[1]).toBe('Tuberculosis,13,357347,RR 0.49 (95% CI 0.34 to 0.70),moderate,"Randomised trials; Inconsistency (−1): I² 92%, unexplained"');
  });
});

describe('prefilling from extraction', () => {
  it('reads the first number and recognises numeric columns', () => {
    expect(parseNumber('120 (60%)')).toBe(120);
    expect(parseNumber('1,204 participants')).toBe(1204);
    expect(parseNumber('mean −2.5')).toBe(-2.5);
    expect(parseNumber('not reported')).toBeNull();
    expect(looksNumeric(['12', '15 (30%)', '', 'NR'])).toBe(true);
    expect(looksNumeric(['Adults in hospital', 'Children', '12'])).toBe(false);
  });
});

describe('plots', () => {
  it('render the forest plot (with subgroups, diamond and prediction interval) and the funnel plot as SVG', async () => {
    const { createElement } = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { ForestPlot, FunnelPlot } = await import('../../components/app/systematic-review/MetaPlots');
    const analysis = analyse(bcgRows, setup({ method: 'REML' }));
    const forest = renderToStaticMarkup(createElement(ForestPlot, { analysis, rows: bcgRows, outcome: 'Tuberculosis', favours: { left: 'Favours vaccine', right: 'Favours control' } }));
    expect(forest).toContain('Favours vaccine');
    expect(forest).toContain('95% prediction interval');
    expect(forest).toContain('Test for subgroup differences');
    expect(forest.match(/<polygon/g)).toHaveLength(4);
    expect(forest).toContain('4/123');
    expect(forest).not.toMatch(/NaN|undefined/);
    const funnel = renderToStaticMarkup(createElement(FunnelPlot, { analysis, outcome: 'Tuberculosis' }));
    expect(funnel.match(/<circle/g)).toHaveLength(13);
    expect(funnel).toContain('(log scale)');
    expect(funnel).not.toMatch(/NaN|undefined/);
    const continuous = analyse([{ record_id: null, label: 'A', m1: 10, sd1: 2, n1: 20, m2: 8, sd2: 2.5, n2: 22 }], { data_type: 'continuous', measure: 'MD', model: 'fixed', method: 'IV', hksj: false });
    const single = renderToStaticMarkup(createElement(ForestPlot, { analysis: continuous, rows: [{ record_id: null, label: 'A', m1: 10, sd1: 2, n1: 20, m2: 8, sd2: 2.5, n2: 22 }], outcome: 'Pain', favours: { left: 'L', right: 'R' } }));
    expect(single).toContain('10 (2), 20');
    expect(single).not.toMatch(/NaN|undefined/);
  });
});
