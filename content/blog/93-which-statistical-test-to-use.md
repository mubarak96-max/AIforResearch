---
title: "Which Statistical Test to Use: A Decision Guide and Table"
slug: "which-statistical-test-to-use"
description: "Which statistical test to use, decided by four questions. A decision table for t-tests, ANOVA, chi-square and non-parametric tests, with a worked example."
primary_keyword: "which statistical test to use"
secondary_keywords: ["statistical test", "statistical test flow chart", "statistical test types", "statistical test calculator", "parametric vs non-parametric test", "which test for two groups", "how to choose a statistical test"]
cluster: "O. Statistics for research"
pillar: "/blog/which-statistical-test-to-use"
author: "Mubarak"
compares_tools: false
published: "2026-11-12"
updated: "2026-11-12"
faq:
  - q: "How do I choose a statistical test?"
    a: "Answer four questions in order. What type is your outcome: numeric, ordinal or categorical? How many groups or variables are you comparing? Are the measurements independent or paired, such as the same people measured twice? Does a numeric outcome meet the parametric assumptions? Those four answers point to one row of a decision table, for example two independent groups with a numeric outcome gives Welch's t-test."
  - q: "What is the difference between a parametric and a non-parametric test?"
    a: "A parametric test, such as the t-test or ANOVA, assumes the outcome follows a known distribution, usually roughly normal, and compares means. A non-parametric test, such as Mann-Whitney U or Kruskal-Wallis, works on ranks and makes fewer assumptions about the shape of the data. Parametric tests have more power when their assumptions hold. Non-parametric tests suit ordinal data, small skewed samples and outliers."
  - q: "Which test should I use to compare two groups?"
    a: "For a numeric outcome in two independent groups, use Welch's t-test, or Mann-Whitney U if the data are ordinal or small and skewed. For the same people measured twice, use the paired t-test, or the Wilcoxon signed-rank test if the differences are far from normal. For a categorical outcome in two groups, use a chi-square test, or Fisher's exact test when expected counts are small."
  - q: "Is there a statistical test flow chart I can follow?"
    a: "Yes. A statistical test flow chart is the same four questions drawn as branches: outcome type, number of groups, paired or independent, then assumptions. The decision table in this guide holds every branch in one place. Data Lab in AI for Research has a Which test? chooser that walks you through the same questions and returns the test, its assumptions and an APA reporting template."
  - q: "Can a statistical test calculator choose the test for me?"
    a: "A calculator can compute a test once you pick it, and a rule-based chooser can suggest one from your answers. Neither knows your study design. You still decide whether measurements are paired, whether groups are independent and what your hypothesis is. Pick the test before you see the results, ideally in your protocol, so the choice can't be bent toward a significant p-value."
---

# Which statistical test to use: a four-question decision guide

*Last updated: 12 November 2026*

To know which statistical test to use, answer four questions: what type your outcome is (numeric, ordinal or categorical), how many groups or variables you compare, whether the measurements are independent or paired, and whether a numeric outcome meets parametric assumptions. Those answers pick one test, for example Welch's t-test for a numeric outcome in two independent groups.

This guide is for students and researchers who have data, or a planned study, and need to choose and report the right test. It is the hub of our statistics series and links to the detailed guides on [t-tests, ANOVA and chi-square](/blog/t-test-vs-anova-vs-chi-square), [power and sample size](/blog/statistical-power-and-sample-size) and [testing for normality](/blog/how-to-test-for-normality). If you want to run the test straight away, the free [statistics calculator](/tools/data-analysis) runs t-tests and chi-square tests on a CSV in your browser.

## What is a statistical test?

**A statistical test is a procedure that measures how compatible your data are with a null hypothesis, usually "no difference" or "no association", and returns a test statistic and a p-value.** The statistic (t, F, χ², U) summarizes the size of the effect relative to the noise. The p-value is the probability of data at least that extreme if the null hypothesis were true.

A p-value is not the probability that your hypothesis is true, and it does not measure how large an effect is [1]. Report an effect size and a confidence interval next to every p-value.

## How do I choose a statistical test? The four questions

1. **What type is the outcome?** **A numeric (continuous) variable is one measured on a scale where differences are meaningful, such as blood pressure, test score or reaction time.** **An ordinal variable has ordered categories without equal spacing, such as a 5-point Likert item or pain rated mild, moderate, severe.** **A categorical (nominal) variable has unordered categories, such as passed or failed, or blood type.**
2. **How many groups or variables?** One group against a known value, two groups, three or more groups, or two variables measured on the same cases (a relationship rather than a comparison).
3. **Independent or paired?** **Paired (dependent) measurements come from the same or matched cases, such as one person before and after a course.** Independent measurements come from different people in each group. Treating paired data as independent throws away power, as the worked example below shows.
4. **Are the parametric assumptions reasonable?** For numeric outcomes, check the distribution of the outcome in each group (or of the differences, for paired data), outliers and spread. If the assumptions fail badly in a small sample, switch to the non-parametric test in the same row.

## Decision table: which statistical test to use

This table is the statistical test flow chart in one place. The last column says whether Data Lab in AI for Research runs the test; the rest need R, jamovi, JASP or SPSS [2][3][4][5].

| Outcome | Groups or variables | Design | Parametric test | Non-parametric alternative | Runs in Data Lab? |
| --- | --- | --- | --- | --- | --- |
| Numeric | 1 group vs a known value | One sample | One-sample t-test | Wilcoxon signed-rank (one-sample) | No: R, jamovi, JASP or SPSS |
| Numeric | 2 groups | Independent | Welch's t-test | Mann-Whitney U | Yes, both |
| Numeric | 2 groups | Paired | Paired t-test | Wilcoxon signed-rank | Paired t-test yes; Wilcoxon no |
| Numeric | 3+ groups | Independent | One-way ANOVA, then post hoc tests | Kruskal-Wallis | ANOVA yes; post hoc and Kruskal-Wallis no |
| Numeric | 3+ time points | Paired (repeated) | Repeated-measures ANOVA | Friedman test | No |
| Numeric | 2+ factors | Independent | Factorial (two-way) ANOVA | Usually a transformation or robust model | No |
| Ordinal | 2 groups | Independent | Not applicable | Mann-Whitney U | Yes |
| Ordinal | 2 groups | Paired | Not applicable | Wilcoxon signed-rank | No |
| Ordinal | 3+ groups | Independent | Not applicable | Kruskal-Wallis | No |
| Categorical | 2+ groups | Independent | Chi-square test of independence | Fisher's exact test (small expected counts) | Chi-square yes; Fisher's no |
| Categorical (yes/no) | 2 time points | Paired | McNemar's test | Exact McNemar | No |
| Two numeric variables | Relationship | Same cases | Pearson correlation | Spearman rank correlation | Pearson yes; Spearman no |
| Numeric outcome | 1 predictor | Prediction | Simple linear regression | Not applicable | Yes |
| Numeric outcome | 2+ predictors | Prediction | Multiple regression | Not applicable | No |
| Yes/no outcome | 1+ predictors | Prediction | Logistic regression | Not applicable | No |
| Two raters, categories | Agreement | Same items | Cohen's kappa | Not applicable | No ([kappa guide](/blog/cohens-kappa-inter-rater-reliability)) |

Three rules sit behind the table:

- **Welch by default for two groups.** Welch's t-test does not assume equal variances and loses almost nothing when they are equal, so many methodologists now recommend it over Student's t-test [6][7].
- **ANOVA first, then post hoc.** A significant ANOVA says that some means differ, not which ones. Three separate t-tests at α = .05 raise the chance of at least one false positive to 1 − 0.95³ = 14.3% ([worked example](/blog/t-test-vs-anova-vs-chi-square)).
- **Chi-square needs enough expected counts.** The common rule (Cochran's) is that no expected count should fall below 1 and no more than 20% should fall below 5 [8]. Below that, use Fisher's exact test.

## Parametric vs non-parametric test: how to decide

Choose the parametric test unless the outcome is ordinal, or the sample is small and the data are clearly skewed or have outliers. **A parametric test assumes the data come from a distribution with a known form, usually normal, and tests means. A non-parametric test uses ranks and makes fewer assumptions about shape.** Parametric tests are more powerful when their assumptions hold.

### When the parametric test is fine

- The outcome is numeric and roughly symmetric in each group.
- Each group has 30 to 40 or more cases. With samples that size, the sampling distribution of the mean is close to normal even when the data are not, which is the central limit theorem at work [9].

### When to switch

- The outcome is ordinal (Likert items, rankings).
- Groups are small, under about 15 to 20, and the histogram or Q-Q plot shows strong skew.
- A few extreme values dominate the mean, and they are real, not errors.

A normality test is not the deciding vote: Shapiro-Wilk flags trivial departures in large samples and misses big ones in small samples. See the [normality guide](/blog/how-to-test-for-normality).

## Worked example: same data, two designs, two answers

This invented example shows why question 3 (paired or independent) matters most.

**Study (example):** 12 students rate their statistics anxiety (0 to 40) before and after a four-week workshop.

| Student | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Before | 24 | 30 | 18 | 27 | 22 | 35 | 29 | 20 | 26 | 31 | 23 | 28 |
| After | 20 | 26 | 17 | 22 | 21 | 28 | 25 | 19 | 21 | 27 | 22 | 23 |

Before: M = 26.08, SD = 4.91. After: M = 22.58, SD = 3.34. Every student's score fell; the differences are 4, 4, 1, 5, 1, 7, 4, 1, 5, 4, 1, 5.

### Right test: paired t-test

The four answers: numeric outcome, two time points, paired, differences roughly symmetric. The table points to the paired t-test.

- Mean difference = 3.50, SD of differences = 2.02
- t(11) = 5.99, p < .001, 95% CI [2.21, 4.79], Cohen's dz = 1.73

In APA style: "Anxiety scores fell from before (M = 26.08, SD = 4.91) to after the workshop (M = 22.58, SD = 3.34), t(11) = 5.99, p < .001, dz = 1.73, 95% CI of the difference [2.21, 4.79]."

### Non-parametric check: Wilcoxon signed-rank

The differences are lumpy (many 1s, 4s and 5s); Shapiro-Wilk on them gives W = 0.85, p = .038. With 12 pairs, a cautious analyst also runs the Wilcoxon signed-rank test. All 12 differences are positive, so the signed-rank statistic is V = 78 (the maximum), and the exact two-sided p = 2/4,096 = .0005. Both tests agree. Data Lab does not run the Wilcoxon test; in R it is `wilcox.test(before, after, paired = TRUE)` [12].

### Wrong test: independent t-test

Ignore the pairing and run Welch's t-test on the two columns, and you get t(19.4) = 2.04, p = .055: not significant. The spread between students swamps the consistent drop within each student. The paired test removes that spread, which is why it finds the effect.

## How to report a statistical test

Report enough that a reader could check your result. APA Style asks for the test statistic with its degrees of freedom, the exact p-value (to two or three decimals, "p < .001" below that) and an effect size [10].

| Test | APA template | Effect size |
| --- | --- | --- |
| Welch's t-test | t(17.43) = 3.74, p = .002, d = 1.67 | Cohen's d |
| Paired t-test | t(11) = 5.99, p < .001, dz = 1.73 | Cohen's dz |
| One-way ANOVA | F(2, 21) = 9.62, p = .001, η² = .48 | Eta squared |
| Chi-square | χ²(1, N = 120) = 5.00, p = .025, V = .20 | Cramér's V |
| Mann-Whitney U | U = 12, z = 2.87, p = .004, r = .64 | r = z / √N |
| Pearson correlation | r(48) = .35, p = .013 | r itself |

All rows except the correlation (a format illustration) come from worked examples in this series. Drop the leading zero for values that can't exceed 1 (p, r, η², V) and italicize statistical symbols.

## How to choose a statistical test in AI for Research

[Data Lab](/features/data-lab) is the statistics workspace in AI for Research. It runs in your browser and the statistics cost 0 credits on every plan, including the free one [11].

1. Sign up for a free account at [/signup](/signup) and open Data Lab. Upload a CSV or TSV, or paste a table with column names in the first row.
2. Open **Which test?** and answer the questions: your goal (compare, relate, predict, describe), outcome type, number of groups, paired or not, and whether the outcome looks roughly normal. It returns the test, its assumptions, an APA reporting template and the alternative to use if the assumptions fail. When the suggested test is one Data Lab doesn't run (Wilcoxon, Kruskal-Wallis, Spearman, logistic regression, repeated-measures ANOVA), it says so.
3. Check assumptions with the descriptive statistics, histogram, box plot and scatter plot.
4. Run the test. Data Lab runs Welch's and paired t-tests, Mann-Whitney U, one-way ANOVA, Pearson correlation, chi-square and simple linear regression. Each result comes with an effect size and an APA sentence.
5. Optional: generate the results section with AI (2 credits). It is written from the computed numbers only.

<!-- SCREENSHOT: Data Lab "Which test?" tab with answers selected (compare, numeric, two groups, paired) and the recommendation card showing paired t-test, assumptions and APA template -->

<!-- SCREENSHOT: Data Lab Tests tab showing a Welch's t-test result table with Cohen's d and the APA sentence -->

Honest limits: Data Lab has no Shapiro-Wilk test, Q-Q plot, Wilcoxon signed-rank, Kruskal-Wallis, Spearman, Fisher's exact test, post hoc tests, repeated-measures or factorial ANOVA, multiple or logistic regression; use R, jamovi, JASP or SPSS for those [2][3][4][5] (jamovi and JASP are free). Save Excel files as CSV first. Its Mann-Whitney p-value uses the normal approximation. The chooser is rule-based: you still decide what is paired.

<!-- LINK: /tools/statistical-test-chooser when L31 ships -->

## FAQ

### How do I choose a statistical test?

Answer four questions in order. What type is your outcome: numeric, ordinal or categorical? How many groups or variables are you comparing? Are the measurements independent or paired, such as the same people measured twice? Does a numeric outcome meet the parametric assumptions? Those four answers point to one row of a decision table, for example two independent groups with a numeric outcome gives Welch's t-test.

### What is the difference between a parametric and a non-parametric test?

A parametric test, such as the t-test or ANOVA, assumes the outcome follows a known distribution, usually roughly normal, and compares means. A non-parametric test, such as Mann-Whitney U or Kruskal-Wallis, works on ranks and makes fewer assumptions about the shape of the data. Parametric tests have more power when their assumptions hold. Non-parametric tests suit ordinal data, small skewed samples and outliers.

### Which test should I use to compare two groups?

For a numeric outcome in two independent groups, use Welch's t-test, or Mann-Whitney U if the data are ordinal or small and skewed. For the same people measured twice, use the paired t-test, or the Wilcoxon signed-rank test if the differences are far from normal. For a categorical outcome in two groups, use a chi-square test, or Fisher's exact test when expected counts are small.

### Is there a statistical test flow chart I can follow?

Yes. A statistical test flow chart is the same four questions drawn as branches: outcome type, number of groups, paired or independent, then assumptions. The decision table in this guide holds every branch in one place. Data Lab in AI for Research has a Which test? chooser that walks you through the same questions and returns the test, its assumptions and an APA reporting template.

### Can a statistical test calculator choose the test for me?

A calculator can compute a test once you pick it, and a rule-based chooser can suggest one from your answers. Neither knows your study design. You still decide whether measurements are paired, whether groups are independent and what your hypothesis is. Pick the test before you see the results, ideally in your protocol, so the choice can't be bent toward a significant p-value.

## Next steps

- Compare the three workhorse tests with worked examples: [t-test vs ANOVA vs chi-square](/blog/t-test-vs-anova-vs-chi-square).
- Work out how many participants you need before you collect data: [statistical power and sample size](/blog/statistical-power-and-sample-size).
- Check the normality assumption properly: [how to test for normality](/blog/how-to-test-for-normality).
- Write the hypothesis your test will evaluate: [how to write a hypothesis](/blog/how-to-write-a-hypothesis).

## Sources

1. Wasserstein, R. L., & Lazar, N. A. (2016). The ASA statement on p-values: Context, process, and purpose. *The American Statistician, 70*(2), 129–133. https://doi.org/10.1080/00031305.2016.1154108
2. The R Project for Statistical Computing. https://www.r-project.org/
3. jamovi. https://www.jamovi.org/
4. JASP. https://jasp-stats.org/
5. IBM SPSS Statistics. https://www.ibm.com/products/spss-statistics
6. Delacre, M., Lakens, D., & Leys, C. (2017). Why psychologists should by default use Welch's t-test instead of Student's t-test. *International Review of Social Psychology, 30*(1), 92–101. https://doi.org/10.5334/irsp.82
7. Ruxton, G. D. (2006). The unequal variance t-test is an underused alternative to Student's t-test and the Mann–Whitney U test. *Behavioral Ecology, 17*(4), 688–690. https://doi.org/10.1093/beheco/ark016
8. Cochran, W. G. (1954). Some methods for strengthening the common χ² tests. *Biometrics, 10*(4), 417–451. https://doi.org/10.2307/3001616
9. Ghasemi, A., & Zahediasl, S. (2012). Normality tests for statistical analysis: A guide for non-statisticians. *International Journal of Endocrinology and Metabolism, 10*(2), 486–489. https://doi.org/10.5812/ijem.3505
10. American Psychological Association. Numbers and statistics guide (APA Style, 7th edition). https://apastyle.apa.org/instructional-aids/numbers-statistics-guide.pdf
11. AI for Research. Pricing. https://aiforresearch.app/pricing
12. Wilcoxon signed-rank test in R: `wilcox.test` documentation. https://stat.ethz.ch/R-manual/R-devel/library/stats/html/wilcox.test.html
