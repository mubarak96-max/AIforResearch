/**
 * The tests Data Lab can run, as data: what each needs (one numeric column, a grouping column,
 * several items …) and which settings it takes. The page draws its form from this list, and saved
 * analyses (lib/dataLabReproducibility.ts) are checked against it. Pure.
 */

export type AnalysisTest =
  | 'pearson' | 'regression' | 'welch' | 'mann' | 'paired' | 'anova' | 'chi'
  | 'spearman' | 'wilcoxon' | 'kruskal' | 'fisher' | 'mcnemar' | 'logistic' | 'survival' | 'diagnostic' | 'roc' | 'alpha'
  | 'bayes_one' | 'bayes_paired' | 'bayes_two' | 'bayes_prop';

export type SlotKind = 'numeric' | 'categorical' | 'any';
/** One column the test needs. `multiple` slots come last and take several columns. */
export type AnalysisSlot = { label: string; kind: SlotKind; optional?: boolean; multiple?: { min: number; max: number } };
/** Every setting a saved analysis can carry (the server and the bundle reader accept only these). */
export const OPTION_KEYS = ['positive', 'reference_positive', 'event', 'prior_scale', 'mu', 'prior_a', 'prior_b', 'threshold'] as const;
export type OptionKey = typeof OPTION_KEYS[number];
/**
 * A setting: chosen from the categories of one of the test's columns (`slot`), from a fixed list
 * (`choices`), or typed as a number (`number`). `default` is stored with the analysis when left unset.
 */
export type AnalysisOption = {
  key: OptionKey; label: string; slot?: number; choices?: readonly (readonly [string, string])[];
  number?: { min: number; max: number; step: string }; default?: string;
};

export type AnalysisDef = { id: AnalysisTest; name: string; group: 'Compare groups' | 'Relationships' | 'Prediction' | 'Clinical and diagnostic' | 'Scales and surveys' | 'Bayesian'; slots: AnalysisSlot[]; options?: AnalysisOption[]; hint?: string };

const numeric = (label: string): AnalysisSlot => ({ label, kind: 'numeric' });
const PRIOR_SCALE: AnalysisOption = { key: 'prior_scale', label: 'Prior scale on the effect size', choices: [['0.707', 'Medium prior (r = 0.707)'], ['0.5', 'Narrow prior (r = 0.5)'], ['1', 'Wide prior (r = 1)']], default: '0.707' };
const categorical = (label: string, optional = false): AnalysisSlot => ({ label, kind: 'categorical', optional });

export const ANALYSES: AnalysisDef[] = [
  { id: 'welch', name: 'Independent t-test (Welch)', group: 'Compare groups', slots: [numeric('Outcome'), categorical('Group (two groups)')] },
  { id: 'mann', name: 'Mann-Whitney U', group: 'Compare groups', slots: [numeric('Outcome'), categorical('Group (two groups)')] },
  { id: 'paired', name: 'Paired t-test', group: 'Compare groups', slots: [numeric('First measure'), numeric('Second measure')] },
  { id: 'wilcoxon', name: 'Wilcoxon signed-rank', group: 'Compare groups', slots: [numeric('First measure'), numeric('Second measure')], hint: 'Paired measures that are not normal, or ratings.' },
  { id: 'anova', name: 'One-way ANOVA', group: 'Compare groups', slots: [numeric('Outcome'), categorical('Group')] },
  { id: 'kruskal', name: 'Kruskal-Wallis', group: 'Compare groups', slots: [numeric('Outcome'), categorical('Group')], hint: 'Three or more groups, outcome not normal or ordinal.' },
  { id: 'mcnemar', name: 'McNemar (paired yes/no)', group: 'Compare groups', slots: [categorical('Before (two categories)'), categorical('After (same two categories)')] },
  { id: 'pearson', name: 'Correlation (Pearson)', group: 'Relationships', slots: [numeric('Variable 1'), numeric('Variable 2')] },
  { id: 'spearman', name: 'Correlation (Spearman)', group: 'Relationships', slots: [numeric('Variable 1'), numeric('Variable 2')], hint: 'Ranks, ratings or skewed numbers.' },
  { id: 'chi', name: 'Chi-square', group: 'Relationships', slots: [categorical('Variable 1'), categorical('Variable 2')] },
  { id: 'fisher', name: 'Fisher’s exact test (2 × 2)', group: 'Relationships', slots: [categorical('Variable 1 (two categories)'), categorical('Variable 2 (two categories)')], hint: 'Small samples, or expected counts under 5.' },
  { id: 'regression', name: 'Linear regression', group: 'Prediction', slots: [numeric('Predictor (x)'), numeric('Outcome (y)')] },
  { id: 'logistic', name: 'Logistic regression', group: 'Prediction', slots: [categorical('Outcome (two categories)'), { label: 'Predictors', kind: 'any', multiple: { min: 1, max: 10 } }], options: [{ key: 'positive', label: 'Outcome counted as the event', slot: 0 }], hint: 'A yes/no outcome from one or more predictors: odds ratios with 95% CIs.' },
  { id: 'survival', name: 'Survival (Kaplan-Meier, log-rank)', group: 'Clinical and diagnostic', slots: [numeric('Follow-up time'), categorical('Event (e.g. died, relapsed)'), categorical('Compare groups (optional)', true)], options: [{ key: 'event', label: 'Value that means the event happened', slot: 1 }] },
  { id: 'diagnostic', name: 'Diagnostic accuracy (2 × 2)', group: 'Clinical and diagnostic', slots: [categorical('Index test result'), categorical('Reference standard')], options: [{ key: 'positive', label: 'Positive test result', slot: 0 }, { key: 'reference_positive', label: 'Has the condition', slot: 1 }], hint: 'Sensitivity, specificity, PPV, NPV and likelihood ratios with exact CIs.' },
  { id: 'roc', name: 'ROC curve and AUC', group: 'Clinical and diagnostic', slots: [numeric('Score or measurement'), categorical('Reference standard')], options: [{ key: 'reference_positive', label: 'Has the condition', slot: 1 }], hint: 'The area under the curve and the best cut-off.' },
  { id: 'bayes_two', name: 'Bayesian independent t-test', group: 'Bayesian', slots: [numeric('Outcome'), categorical('Group (two groups)')], options: [PRIOR_SCALE], hint: 'The JZS Bayes factor (BF10 and BF01) and the effect size with a 95% credible interval.' },
  { id: 'bayes_paired', name: 'Bayesian paired t-test', group: 'Bayesian', slots: [numeric('First measure'), numeric('Second measure')], options: [PRIOR_SCALE], hint: 'The JZS Bayes factor for the same cases measured twice.' },
  { id: 'bayes_one', name: 'Bayesian one-sample t-test', group: 'Bayesian', slots: [numeric('Outcome')], options: [{ key: 'mu', label: 'Test value', number: { min: -1e12, max: 1e12, step: 'any' }, default: '0' }, PRIOR_SCALE], hint: 'The JZS Bayes factor for a mean against a test value.' },
  { id: 'bayes_prop', name: 'Bayesian proportion (beta-binomial)', group: 'Bayesian', slots: [categorical('Outcome (categories)')], options: [{ key: 'positive', label: 'Value counted as a success', slot: 0 }, { key: 'prior_a', label: 'Prior a (Beta)', number: { min: 0.001, max: 10000, step: 'any' }, default: '1' }, { key: 'prior_b', label: 'Prior b (Beta)', number: { min: 0.001, max: 10000, step: 'any' }, default: '1' }, { key: 'threshold', label: 'Threshold for P(p > threshold)', number: { min: 0, max: 1, step: '0.01' }, default: '0.5' }], hint: 'Posterior mean, 95% credible interval and the probability the proportion exceeds a threshold. Beta(1, 1) is a flat prior.' },
  { id: 'alpha', name: 'Reliability (Cronbach’s alpha)', group: 'Scales and surveys', slots: [{ label: 'Items of the scale', kind: 'numeric', multiple: { min: 2, max: 40 } }], hint: 'Internal consistency of questionnaire items; reverse-score negative items first.' },
];

export const ANALYSIS_IDS = new Set<string>(ANALYSES.map((item) => item.id));
export const analysisDef = (id: string) => ANALYSES.find((item) => item.id === id) ?? null;
export const ANALYSIS_GROUPS = [...new Set(ANALYSES.map((item) => item.group))];

/** How many columns a test takes: [fewest, most]. */
export function variableRange(def: AnalysisDef): [number, number] {
  let min = 0; let max = 0;
  for (const slot of def.slots) {
    if (slot.multiple) { min += slot.multiple.min; max += slot.multiple.max; }
    else { max += 1; if (!slot.optional) min += 1; }
  }
  return [min, max];
}

/** The slot each chosen variable fills (single slots in order, then the multiple slot). */
export function slotOf(def: AnalysisDef, index: number): AnalysisSlot {
  const singles = def.slots.filter((slot) => !slot.multiple);
  const multiple = def.slots.find((slot) => slot.multiple);
  return index < singles.length ? singles[index] : (multiple ?? singles[singles.length - 1]);
}

export type AnalysisOptions = Partial<Record<AnalysisOption['key'], string>>;
