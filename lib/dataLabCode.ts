/**
 * Data Lab analyses as R, Python or SPSS syntax, from the saved specifications, so a supervisor
 * or examiner can rerun them in a statistics package. A starting script: it reads the dataset
 * exported from Data Lab and runs the same tests with the package's usual functions. Pure.
 */
import { analysisDef } from './dataLabAnalyses';
import type { AnalysisSpec, Reproducibility } from './dataLabReproducibility';

export type CodeLanguage = 'r' | 'python' | 'spss';

const rName = (name: string) => (/^[A-Za-z.][A-Za-z0-9._]*$/.test(name) ? name : `\`${name.replace(/`/g, '\\`')}\``);
const rCol = (name: string) => `d$${rName(name)}`;
const rStr = (value: string) => JSON.stringify(value);
const pyCol = (name: string) => `d[${JSON.stringify(name)}]`;
const pyStr = (value: string) => JSON.stringify(value);

/** SPSS variable names: letters, digits and underscores, starting with a letter, at most 64 characters. */
export function spssName(name: string, taken = new Set<string>()): string {
  let base = name.normalize('NFKD').replace(/[^A-Za-z0-9_]/g, '_').replace(/^[^A-Za-z]+/, '').slice(0, 60) || 'v';
  if (/^(ALL|AND|BY|EQ|GE|GT|LE|LT|NE|NOT|OR|TO|WITH)$/i.test(base)) base = `${base}_v`;
  let candidate = base; let n = 2;
  while (taken.has(candidate.toLowerCase())) candidate = `${base}_${n++}`;
  taken.add(candidate.toLowerCase());
  return candidate;
}

/** The prior scale as BayesFactor writes it ("0.707" is its "medium", √2/2). */
const rScale = (raw?: string) => (!raw || raw === '0.707' ? '"medium"' : raw);
const pyScale = (raw?: string) => (!raw ? '0.707' : raw);
const beta = (o: AnalysisSpec['options'] = {}) => ({ a: o.prior_a || '1', b: o.prior_b || '1', threshold: o.threshold || '0.5' });

function rAnalysis(spec: AnalysisSpec): string[] {
  const [a, b, c] = spec.variables;
  const o = spec.options ?? {};
  const f = (name: string) => `factor(${rCol(name)})`;
  switch (spec.test) {
    case 'welch': return [`t.test(${rName(a)} ~ ${rName(b)}, data = d)  # Welch by default`];
    case 'mann': return [`wilcox.test(${rName(a)} ~ ${rName(b)}, data = d, exact = FALSE, correct = FALSE)`];
    case 'paired': return [`t.test(${rCol(a)}, ${rCol(b)}, paired = TRUE)`];
    case 'wilcoxon': return [`wilcox.test(${rCol(a)}, ${rCol(b)}, paired = TRUE)`];
    case 'anova': return [`summary(aov(${rName(a)} ~ factor(${rName(b)}), data = d))`];
    case 'kruskal': return [`kruskal.test(${rName(a)} ~ factor(${rName(b)}), data = d)`];
    case 'mcnemar': return [`tab <- table(${rCol(a)}, ${rCol(b)})`, 'mcnemar.test(tab)', 'binom.test(tab[1, 2], tab[1, 2] + tab[2, 1])  # the exact p reported by Data Lab'];
    case 'pearson': return [`cor.test(${rCol(a)}, ${rCol(b)})`];
    case 'spearman': return [`cor.test(${rCol(a)}, ${rCol(b)}, method = "spearman", exact = FALSE)`];
    case 'chi': return [`chisq.test(table(${rCol(a)}, ${rCol(b)}), correct = FALSE)`];
    case 'fisher': return [`fisher.test(table(${rCol(a)}, ${rCol(b)}))`];
    case 'regression': return [`summary(lm(${rName(b)} ~ ${rName(a)}, data = d))`];
    case 'logistic': {
      const predictors = spec.variables.slice(1).map((name) => (spec.kinds[name] === 'categorical' ? `factor(${rName(name)})` : rName(name))).join(' + ');
      return [
        `m <- glm(I(${rName(a)} == ${rStr(o.positive ?? '')}) ~ ${predictors}, family = binomial, data = d)${o.positive ? '' : '  # set the event level'}`,
        'summary(m)',
        'exp(cbind(OR = coef(m), confint.default(m)))  # Wald intervals, as Data Lab',
        'anova(update(m, . ~ 1), m, test = "Chisq")  # likelihood-ratio test of the model',
      ];
    }
    case 'survival': return [
      'library(survival)',
      `fit <- survfit(Surv(${rName(a)}, ${rName(b)} == ${rStr(o.event ?? '1')}) ~ ${c ? `factor(${rName(c)})` : '1'}, data = d)`,
      'print(fit)  # medians with 95% CIs',
      'plot(fit, xlab = "Time", ylab = "Survival probability")',
      ...(c ? [`survdiff(Surv(${rName(a)}, ${rName(b)} == ${rStr(o.event ?? '1')}) ~ factor(${rName(c)}), data = d)  # log-rank`] : []),
    ];
    case 'diagnostic': return [
      `test <- ${rCol(a)} == ${rStr(o.positive ?? '')}; ref <- ${rCol(b)} == ${rStr(o.reference_positive ?? '')}`,
      'tp <- sum(test & ref); fp <- sum(test & !ref); fn <- sum(!test & ref); tn <- sum(!test & !ref)',
      'binom.test(tp, tp + fn)$conf.int  # sensitivity, exact 95% CI', 'binom.test(tn, tn + fp)$conf.int  # specificity',
      'binom.test(tp, tp + fp)$conf.int  # PPV', 'binom.test(tn, tn + fn)$conf.int  # NPV',
    ];
    case 'roc': return [
      'library(pROC)',
      `r <- roc(${rCol(b)} == ${rStr(o.reference_positive ?? '')}, ${rCol(a)}, direction = "<")`,
      'auc(r); ci.auc(r, method = "delong")', 'coords(r, "best", best.method = "youden")', 'plot(r)',
    ];
    case 'alpha': return ['library(psych)', `alpha(d[, c(${spec.variables.map(rStr).join(', ')})])`];
    case 'bayes_one': return [
      'library(BayesFactor)',
      `bf <- ttestBF(x = na.omit(${rCol(a)}), mu = ${Number(o.mu || 0)}, rscale = ${rScale(o.prior_scale)})`,
      'bf; 1 / bf  # BF10 and BF01', 'summary(posterior(bf, iterations = 10000))  # delta: posterior of the effect size',
    ];
    case 'bayes_paired': return [
      'library(BayesFactor)',
      `x <- na.omit(d[, c(${rStr(a)}, ${rStr(b)})])`,
      `bf <- ttestBF(x = x[[1]], y = x[[2]], paired = TRUE, rscale = ${rScale(o.prior_scale)})`,
      'bf; 1 / bf  # BF10 and BF01', 'summary(posterior(bf, iterations = 10000))  # delta: posterior of the effect size',
    ];
    case 'bayes_two': return [
      'library(BayesFactor)',
      `x <- d[!is.na(${rCol(a)}) & !is.na(${rCol(b)}), ]`, `x$group <- factor(x[[${rStr(b)}]])`,
      `bf <- ttestBF(formula = ${rName(a)} ~ group, data = x, rscale = ${rScale(o.prior_scale)})`,
      'bf; 1 / bf  # BF10 and BF01', 'summary(posterior(bf, iterations = 10000))  # delta (its sign follows the factor level order)',
    ];
    case 'bayes_prop': {
      const p = beta(o);
      return [
        `x <- na.omit(${rCol(a)}); k <- sum(x == ${rStr(o.positive ?? '')}); n <- length(x)${o.positive ? '' : '  # set the success value'}`,
        `a <- ${p.a} + k; b <- ${p.b} + n - k  # Beta(${p.a}, ${p.b}) prior`,
        `c(mean = a / (a + b), median = qbeta(0.5, a, b), lower = qbeta(0.025, a, b), upper = qbeta(0.975, a, b), p_above = 1 - pbeta(${p.threshold}, a, b))`,
      ];
    }
    default: return [`# ${spec.test}: not available as R code`];
  }
}

function pyAnalysis(spec: AnalysisSpec): string[] {
  const [a, b, c] = spec.variables;
  const o = spec.options ?? {};
  const cc = (names: string[]) => `d[[${names.map(pyStr).join(', ')}]].dropna()`;
  switch (spec.test) {
    case 'welch': return [`x = ${cc([a, b])}`, `g1, g2 = sorted(x[${pyStr(b)}].unique())[:2]`, `print(stats.ttest_ind(x.loc[x[${pyStr(b)}] == g1, ${pyStr(a)}], x.loc[x[${pyStr(b)}] == g2, ${pyStr(a)}], equal_var=False))`];
    case 'mann': return [`x = ${cc([a, b])}`, `g1, g2 = sorted(x[${pyStr(b)}].unique())[:2]`, `print(stats.mannwhitneyu(x.loc[x[${pyStr(b)}] == g1, ${pyStr(a)}], x.loc[x[${pyStr(b)}] == g2, ${pyStr(a)}], use_continuity=False, method="asymptotic"))`];
    case 'paired': return [`x = ${cc([a, b])}`, `print(stats.ttest_rel(x[${pyStr(a)}], x[${pyStr(b)}]))`];
    case 'wilcoxon': return [`x = ${cc([a, b])}`, `print(stats.wilcoxon(x[${pyStr(a)}], x[${pyStr(b)}]))`];
    case 'anova': return [`x = ${cc([a, b])}`, `print(stats.f_oneway(*[g[${pyStr(a)}] for _, g in x.groupby(${pyStr(b)})]))`];
    case 'kruskal': return [`x = ${cc([a, b])}`, `print(stats.kruskal(*[g[${pyStr(a)}] for _, g in x.groupby(${pyStr(b)})]))`];
    case 'mcnemar': return ['from statsmodels.stats.contingency_tables import mcnemar', `print(mcnemar(pd.crosstab(${pyCol(a)}, ${pyCol(b)}), exact=True))`];
    case 'pearson': return [`x = ${cc([a, b])}`, `print(stats.pearsonr(x[${pyStr(a)}], x[${pyStr(b)}]))`];
    case 'spearman': return [`x = ${cc([a, b])}`, `print(stats.spearmanr(x[${pyStr(a)}], x[${pyStr(b)}]))`];
    case 'chi': return [`print(stats.chi2_contingency(pd.crosstab(${pyCol(a)}, ${pyCol(b)}), correction=False))`];
    case 'fisher': return [`print(stats.fisher_exact(pd.crosstab(${pyCol(a)}, ${pyCol(b)})))`];
    case 'regression': return ['import statsmodels.formula.api as smf', `print(smf.ols("Q(${JSON.stringify(b).slice(1, -1)}) ~ Q(${JSON.stringify(a).slice(1, -1)})", data=d).fit().summary())`];
    case 'logistic': {
      const terms = spec.variables.slice(1).map((name) => (spec.kinds[name] === 'categorical' ? `C(Q('${name.replace(/'/g, "\\'")}'))` : `Q('${name.replace(/'/g, "\\'")}')`)).join(' + ');
      return [
        'import statsmodels.formula.api as smf', 'import numpy as np',
        `x = ${cc(spec.variables)}.copy()`, `x["event"] = (x[${pyStr(a)}] == ${pyStr(o.positive ?? '')}).astype(int)`,
        `m = smf.logit("event ~ ${terms.replace(/"/g, '\\"')}", data=x).fit()`, 'print(m.summary())',
        'print(np.exp(m.conf_int().assign(OR=m.params)))  # odds ratios with Wald 95% CIs', 'print("LR chi2", m.llr, "p", m.llr_pvalue)',
      ];
    }
    case 'survival': return [
      'from lifelines import KaplanMeierFitter', ...(c ? ['from lifelines.statistics import multivariate_logrank_test'] : []),
      `x = ${cc(c ? [a, b, c] : [a, b])}`, `x["event"] = (x[${pyStr(b)}].astype(str) == ${pyStr(o.event ?? '1')}).astype(int)`,
      ...(c
        ? [`for name, g in x.groupby(${pyStr(c)}):`, `    KaplanMeierFitter().fit(g[${pyStr(a)}], g["event"], label=str(name)).plot_survival_function()`, `print(multivariate_logrank_test(x[${pyStr(a)}], x[${pyStr(c)}], x["event"]).summary)`]
        : [`kmf = KaplanMeierFitter().fit(x[${pyStr(a)}], x["event"])`, 'print(kmf.median_survival_time_)', 'kmf.plot_survival_function()']),
    ];
    case 'diagnostic': return [
      'from statsmodels.stats.proportion import proportion_confint',
      `x = ${cc([a, b])}`, `test = x[${pyStr(a)}] == ${pyStr(o.positive ?? '')}; ref = x[${pyStr(b)}] == ${pyStr(o.reference_positive ?? '')}`,
      'tp, fp, fn, tn = (test & ref).sum(), (test & ~ref).sum(), (~test & ref).sum(), (~test & ~ref).sum()',
      'for label, k, n in [("Sensitivity", tp, tp + fn), ("Specificity", tn, tn + fp), ("PPV", tp, tp + fp), ("NPV", tn, tn + fn)]:',
      '    print(label, k / n, proportion_confint(k, n, method="beta"))  # exact (Clopper-Pearson)',
    ];
    case 'roc': return [
      'from sklearn.metrics import roc_auc_score, roc_curve',
      `x = ${cc([a, b])}`, `y = (x[${pyStr(b)}] == ${pyStr(o.reference_positive ?? '')}).astype(int)`,
      `print("AUC", roc_auc_score(y, x[${pyStr(a)}]))`, `fpr, tpr, thr = roc_curve(y, x[${pyStr(a)}])`, 'print("Youden cut-off", thr[(tpr - fpr).argmax()])',
    ];
    case 'alpha': return ['import pingouin as pg', `print(pg.cronbach_alpha(data=${cc(spec.variables)}))`];
    case 'bayes_one': return ['import pingouin as pg', `print(pg.ttest(${pyCol(a)}.dropna(), ${Number(o.mu || 0)}, r=${pyScale(o.prior_scale)})[["T", "dof", "BF10"]])  # BF01 = 1 / BF10`];
    case 'bayes_paired': return ['import pingouin as pg', `x = ${cc([a, b])}`, `print(pg.ttest(x[${pyStr(a)}], x[${pyStr(b)}], paired=True, r=${pyScale(o.prior_scale)})[["T", "dof", "BF10"]])  # BF01 = 1 / BF10`];
    case 'bayes_two': return [
      'import pingouin as pg', `x = ${cc([a, b])}`, `g1, g2 = x[${pyStr(b)}].value_counts().index[:2]  # Data Lab orders groups by size`,
      `print(pg.ttest(x.loc[x[${pyStr(b)}] == g1, ${pyStr(a)}], x.loc[x[${pyStr(b)}] == g2, ${pyStr(a)}], correction=False, r=${pyScale(o.prior_scale)})[["T", "dof", "BF10"]])  # Student's t, as the JZS model`,
    ];
    case 'bayes_prop': {
      const p = beta(o);
      return [
        `x = ${pyCol(a)}.dropna().astype(str); k = int((x == ${pyStr(o.positive ?? '')}).sum()); n = len(x)`,
        `post = stats.beta(${p.a} + k, ${p.b} + n - k)  # Beta(${p.a}, ${p.b}) prior`,
        `print("mean", post.mean(), "median", post.median(), "95% CrI", post.ppf([0.025, 0.975]), "P(p > ${p.threshold})", post.sf(${p.threshold}))`,
      ];
    }
    default: return [`# ${spec.test}: not available as Python code`];
  }
}

function spssAnalysis(spec: AnalysisSpec, v: (name: string) => string): string[] {
  const [a, b, c] = spec.variables.map(v);
  const o = spec.options ?? {};
  switch (spec.test) {
    case 'welch': return [`* Group codes: replace 'g1' and 'g2' with the two values of ${b}.`, `T-TEST GROUPS=${b}('g1' 'g2') /VARIABLES=${a}.`];
    case 'mann': return [`* Group codes: replace 'g1' and 'g2' with the two values of ${b}.`, `NPAR TESTS /M-W=${a} BY ${b}('g1' 'g2').`];
    case 'paired': return [`T-TEST PAIRS=${a} WITH ${b} (PAIRED).`];
    case 'wilcoxon': return [`NPAR TESTS /WILCOXON=${a} WITH ${b} (PAIRED).`];
    case 'anova': return [`AUTORECODE VARIABLES=${b} /INTO ${b}_n.`, `ONEWAY ${a} BY ${b}_n /STATISTICS DESCRIPTIVES.`];
    case 'kruskal': return [`AUTORECODE VARIABLES=${b} /INTO ${b}_n.`, `* Set the range to 1 and the number of groups.`, `NPAR TESTS /K-W=${a} BY ${b}_n(1 9).`];
    case 'mcnemar': return [`NPAR TESTS /MCNEMAR=${a} WITH ${b} (PAIRED).`];
    case 'pearson': return [`CORRELATIONS /VARIABLES=${a} ${b}.`];
    case 'spearman': return [`NONPAR CORR /VARIABLES=${a} ${b} /PRINT=SPEARMAN TWOTAIL.`];
    case 'chi': case 'fisher': return [`CROSSTABS /TABLES=${a} BY ${b} /STATISTICS=CHISQ /CELLS=COUNT EXPECTED.  * Fisher's exact test is printed for 2 x 2 tables.`];
    case 'regression': return [`REGRESSION /DEPENDENT ${b} /METHOD=ENTER ${a}.`];
    case 'logistic': {
      const predictors = spec.variables.slice(1);
      const categorical = predictors.filter((name) => spec.kinds[name] === 'categorical').map(v);
      return [
        `COMPUTE event = (${a} = '${(o.positive ?? '').replace(/'/g, "''")}').`, 'EXECUTE.',
        `LOGISTIC REGRESSION VARIABLES event /METHOD=ENTER ${predictors.map(v).join(' ')}${categorical.length ? ` /CATEGORICAL=${categorical.join(' ')} /CONTRAST (${categorical[0]})=Indicator(1)` : ''} /PRINT=CI(95).`,
      ];
    }
    case 'survival': return [
      `COMPUTE event = (${b} = '${(o.event ?? '1').replace(/'/g, "''")}').`, 'EXECUTE.',
      `KM ${a}${c ? ` BY ${c}` : ''} /STATUS=event(1) /PRINT TABLE MEAN /PLOT SURVIVAL${c ? ' /TEST LOGRANK /COMPARE OVERALL POOLED' : ''}.`,
    ];
    case 'diagnostic': return [
      `COMPUTE test_pos = (${a} = '${(o.positive ?? '').replace(/'/g, "''")}').`, `COMPUTE ref_pos = (${b} = '${(o.reference_positive ?? '').replace(/'/g, "''")}').`, 'EXECUTE.',
      'CROSSTABS /TABLES=test_pos BY ref_pos /CELLS=COUNT COLUMN ROW.', '* Sensitivity and specificity are the column percentages; PPV and NPV the row percentages.',
    ];
    case 'roc': return [
      `COMPUTE ref_pos = (${b} = '${(o.reference_positive ?? '').replace(/'/g, "''")}').`, 'EXECUTE.',
      `ROC ${a} BY ref_pos (1) /PLOT=CURVE /PRINT=SE COORDINATES /CRITERIA=CUTOFF(INCLUDE) TESTPOS(LARGE) DISTRIBUTION(FREE) CI(95).`,
    ];
    case 'alpha': return [`RELIABILITY /VARIABLES=${spec.variables.map(v).join(' ')} /SCALE('Scale') ALL /MODEL=ALPHA /SUMMARY=TOTAL.`];
    case 'bayes_one': case 'bayes_paired': case 'bayes_two': case 'bayes_prop':
      return ['* SPSS Bayesian procedures use different default priors from Data Lab (JZS, Cauchy prior on the effect size; beta-binomial).', '* Rerun this analysis from the R (BayesFactor) or Python (pingouin) script, or in JASP.'];
    default: return [`* ${spec.test}: not available as SPSS syntax.`];
  }
}

/** A script that reruns every saved analysis in R, Python or SPSS. */
export function analysisScript(language: CodeLanguage, reproduction: Pick<Reproducibility, 'analyses' | 'dataset_sha256' | 'software' | 'columns'>, datasetFile = 'dataset.csv'): string {
  const header = [
    `Analyses from AI for Research Data Lab (${reproduction.software}).`,
    `Dataset: ${datasetFile} (SHA-256 ${reproduction.dataset_sha256}). Download it from Data Lab ("Download dataset CSV").`,
    'A starting script: check each step against your study design before you report it.',
  ];
  if (language === 'r') {
    return [
      ...header.map((line) => `# ${line}`), '',
      `d <- read.csv(${rStr(datasetFile)}, check.names = FALSE, stringsAsFactors = FALSE)`, '',
      ...reproduction.analyses.flatMap((spec, i) => [`# ${i + 1}. ${analysisDef(spec.test)?.name ?? spec.test}: ${spec.variables.join(', ')}`, ...rAnalysis(spec), '']),
    ].join('\n');
  }
  if (language === 'python') {
    return [
      ...header.map((line) => `# ${line}`), '# Needs pandas and scipy; some analyses also need statsmodels, lifelines, scikit-learn or pingouin.', '',
      'import pandas as pd', 'from scipy import stats', '',
      `d = pd.read_csv(${pyStr(datasetFile)}, keep_default_na=True, na_values=["NA", "n/a", "N/A", ".", "-", "?"])`, '',
      ...reproduction.analyses.flatMap((spec, i) => [`# ${i + 1}. ${analysisDef(spec.test)?.name ?? spec.test}: ${spec.variables.join(', ')}`, ...pyAnalysis(spec), '']),
    ].join('\n');
  }
  const taken = new Set<string>();
  const names = new Map(reproduction.columns.map((name) => [name, spssName(name, taken)]));
  const v = (name: string) => names.get(name) ?? spssName(name, taken);
  const renamed = [...names].filter(([from, to]) => from !== to);
  return [
    ...header.map((line) => `* ${line}`),
    ...(renamed.length ? ['* Column names changed to valid SPSS names:', ...renamed.map(([from, to]) => `*   ${from.replace(/\.$/, '')} -> ${to}.`)] : []), '',
    `GET DATA /TYPE=TXT /FILE='${datasetFile}' /DELIMITERS="," /QUALIFIER='"' /FIRSTCASE=2 /VARIABLES=`,
    ...reproduction.columns.map((name, i) => `  ${v(name)} ${i === reproduction.columns.length - 1 ? 'A255.' : 'A255'}`),
    '* Convert numeric columns from text after import, e.g. ALTER TYPE score (F8.2).',
    ...reproduction.columns.filter((name) => reproduction.analyses.some((spec) => spec.kinds[name] === 'numeric')).map((name) => `ALTER TYPE ${v(name)} (F8.2).`), '',
    ...reproduction.analyses.flatMap((spec, i) => [`* ${i + 1}. ${analysisDef(spec.test)?.name ?? spec.test}: ${spec.variables.join(', ')}.`, ...spssAnalysis(spec, v), '']),
  ].join('\n');
}
