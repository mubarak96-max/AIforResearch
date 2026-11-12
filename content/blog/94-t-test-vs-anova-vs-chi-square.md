---
title: "T-Test vs ANOVA vs Chi-Square: When to Use Each Test"
slug: "t-test-vs-anova-vs-chi-square"
description: "Statistical test t test, ANOVA or chi-square? See what each compares, its assumptions, a worked example with real numbers, and the common misuses to avoid."
primary_keyword: "statistical test t test"
secondary_keywords: ["statistical test chi square", "anova statistical test", "t test vs anova", "chi square vs t test", "when to use a t test vs anova", "can you use a t test for three groups", "what does a chi-square test tell you"]
cluster: "O. Statistics for research"
pillar: "/blog/which-statistical-test-to-use"
author: "Mubarak"
compares_tools: false
published: "2026-11-12"
updated: "2026-11-12"
faq:
  - q: "When should I use a t-test vs ANOVA?"
    a: "Use a t-test when you compare the means of exactly two groups, or one group measured twice. Use a one-way ANOVA when you compare the means of three or more independent groups. With two groups, the two tests give the same p-value, because F equals t squared for Student's t-test. With three or more groups, ANOVA tests them all at once and keeps the false-positive rate at your alpha."
  - q: "Can you use a t-test for three groups?"
    a: "Not on its own. Running a separate t-test for every pair of three groups means three tests, and the chance of at least one false positive at alpha .05 rises to about 14%. Run a one-way ANOVA first. If it is significant, use a post hoc test such as Tukey's HSD, or pairwise tests with a Bonferroni or Holm correction, to find which groups differ."
  - q: "What does a chi-square test tell you?"
    a: "A chi-square test of independence tells you whether two categorical variables are associated, by comparing the counts you observed in each cell of a table with the counts you would expect if there were no association. A small p-value says the pattern of counts is unlikely under no association. It does not say how strong the association is, so report Cramér's V or the difference in proportions too."
  - q: "What is the difference between a chi-square test and a t-test?"
    a: "They answer questions about different kinds of data. A t-test compares the means of a numeric outcome, such as a test score, between two groups. A chi-square test compares counts of a categorical outcome, such as passed or failed, across groups. If your outcome is a category, use chi-square. If it is a measured number, use a t-test or ANOVA."
  - q: "Should I use Welch's t-test or Student's t-test?"
    a: "Use Welch's t-test by default. It does not assume the two groups have equal variances, and when the variances are equal it gives almost the same answer as Student's test. Student's test can give misleading p-values when variances and group sizes both differ. Many statisticians now recommend Welch as the default, and R's t.test function uses it unless you ask otherwise."
---

# T-test vs ANOVA vs chi-square: which statistical test to use, with worked examples

*Last updated: 12 November 2026*

Use a t-test to compare the means of a numeric outcome between two groups, a one-way ANOVA to compare the means of three or more groups, and a chi-square test to check whether two categorical variables are associated. The deciding questions are whether your outcome is a measured number or a category, and how many groups you compare.

This guide is for students and researchers choosing between the three most common tests. Each section gives the definition, the assumptions, a worked example with the full data so you can reproduce it, and the mistakes to avoid. For every other test, see the pillar guide on [which statistical test to use](/blog/which-statistical-test-to-use).

## What is the difference between a t-test, ANOVA and chi-square?

They differ in the type of outcome and the number of groups. A t-test and ANOVA compare means of numeric outcomes. A chi-square test compares counts of categories.

| | t-test | One-way ANOVA | Chi-square test of independence |
| --- | --- | --- | --- |
| Outcome | Numeric | Numeric | Categorical |
| Groups | 2 (or 1 group measured twice) | 3 or more | 2 or more categories on each variable |
| Compares | Two means | Several means at once | Observed vs expected counts |
| Statistic | t | F | χ² |
| Effect size | Cohen's d | η² (eta squared) | Cramér's V |
| Example question | Do flipped-class students score higher than lecture students? | Do three study methods give different exam scores? | Is attending tutoring associated with passing? |
| Non-parametric alternative | Mann-Whitney U, Wilcoxon signed-rank | Kruskal-Wallis | Fisher's exact test (small counts) |

## The t-test: comparing two means

**A t-test is a statistical test that compares two means and asks whether their difference is larger than you would expect from sampling noise alone.** The t statistic is the difference in means divided by its standard error.

There are three versions:

- **Independent (two-sample) t-test:** two separate groups. Use the Welch version by default; it does not assume equal variances [1][2].
- **Paired t-test:** the same cases measured twice, or matched pairs. It tests the mean of the differences.
- **One-sample t-test:** one group against a fixed value, such as a national norm.

### Assumptions

1. Independent observations (different people, no clustering).
2. A numeric outcome that is roughly normal in each group, or each group large enough (about 30 or more) for the central limit theorem to help [3].
3. For Student's version only: equal variances. Welch drops this one.

### Worked example: Welch's t-test

**Data (example, invented):** quiz scores out of 100 for two sections of the same course.

- Flipped class (n = 10): 78, 85, 69, 91, 74, 88, 82, 77, 80, 86
- Lecture class (n = 10): 72, 65, 80, 70, 68, 75, 62, 77, 71, 66

Steps:

1. Means and SDs: flipped M = 81.0, SD = 6.75; lecture M = 70.6, SD = 5.62.
2. Standard error of the difference: √(6.75²/10 + 5.62²/10) = 2.78.
3. t = (81.0 − 70.6) / 2.78 = 3.74.
4. Welch degrees of freedom (Welch-Satterthwaite formula): df = 17.43.
5. Two-tailed p = .0016. The 95% CI of the difference is [4.55, 16.25].
6. Cohen's d with the pooled SD (6.21) = 10.4 / 6.21 = 1.67.

Report: "Flipped-class students scored higher (M = 81.0, SD = 6.75) than lecture students (M = 70.6, SD = 5.62), t(17.43) = 3.74, p = .002, d = 1.67, 95% CI [4.55, 16.25]."

Student's t-test on the same data gives t(18) = 3.74, p = .001. The t value is identical here because the groups are the same size; Welch changes only the df. With unequal group sizes and unequal variances, the two can disagree a lot [1].

If you didn't trust normality, Mann-Whitney U on the same data gives U = 12, z = 2.87, p = .004 (normal approximation; R's continuity-corrected version gives p = .005), r = .64. Same conclusion.

### Common t-test mistakes

- Running an independent t-test on paired data. The pillar guide shows a before-and-after example where this turns p < .001 into p = .055.
- Reporting "p = .000". Write "p < .001".
- Reporting a p-value with no effect size or interval.

## ANOVA: comparing three or more means

**A one-way ANOVA (analysis of variance) is a statistical test that compares the means of three or more independent groups by asking whether the variation between group means is large relative to the variation within groups.** The F statistic is the ratio of those two variances.

### Can you use a t-test for three groups?

No, not without correction. Each extra test adds a chance of a false positive. **The familywise error rate is the probability of at least one false positive across a set of tests**, and for k independent tests at α = .05 it is 1 − 0.95^k.

| Groups | Pairwise t-tests | Familywise error rate |
| --- | --- | --- |
| 3 | 3 | 14.3% |
| 4 | 6 | 26.5% |
| 5 | 10 | 40.1% |

(These figures assume the tests are independent; pairwise tests on shared groups are correlated, so the true rate is a little lower but still well above 5%.)

ANOVA tests all groups in one go at your chosen α. If it is significant, a post hoc test tells you which pairs differ.

### Assumptions

1. Independent observations.
2. A roughly normal outcome in each group (less critical with larger groups).
3. Similar variances across groups. If not, use Welch's ANOVA, which R, jamovi, JASP and SPSS offer [4][5][6][7].

### Worked example: one-way ANOVA

**Data (example, invented):** exam scores for 24 students randomly assigned to three study methods, 8 per group.

- Rereading: 62, 70, 68, 65, 73, 60, 67, 71 (M = 67.00, SD = 4.47)
- Practice testing: 75, 72, 80, 78, 70, 77, 74, 82 (M = 76.00, SD = 4.04)
- Summarizing: 68, 74, 71, 77, 69, 73, 66, 75 (M = 71.63, SD = 3.78)

Steps:

1. Grand mean = 71.54.
2. Between-groups sum of squares (SSB) = 324.08, df = 2. Mean square = 162.04.
3. Within-groups sum of squares (SSW) = 353.88, df = 21. Mean square = 16.85.
4. F = 162.04 / 16.85 = 9.62, p = .001.
5. η² = SSB / (SSB + SSW) = 324.08 / 677.96 = .48. Study method accounts for about 48% of the variance in scores.

Report: "A one-way ANOVA found a significant effect of study method on exam score, F(2, 21) = 9.62, p = .001, η² = .48."

### Which groups differ? Post hoc tests

The ANOVA says the three means are not all equal. To see which pairs differ, run a post hoc test. Here are pairwise Welch t-tests with a Bonferroni correction (multiply each p by the number of comparisons, 3):

| Comparison | t | df | p | Bonferroni p |
| --- | --- | --- | --- | --- |
| Rereading vs practice testing | −4.23 | 13.85 | .0009 | .003 |
| Rereading vs summarizing | −2.23 | 13.62 | .043 | .128 |
| Summarizing vs practice testing | −2.24 | 13.94 | .042 | .126 |

Only rereading vs practice testing survives the correction. Uncorrected, all three pairs would have looked "significant": exactly the trap the familywise table warns about. Tukey's HSD is the more common post hoc test after ANOVA; run it in R (`TukeyHSD(aov(score ~ method))`), jamovi, JASP or SPSS.

## The chi-square test: comparing counts

**A chi-square test of independence is a statistical test that checks whether two categorical variables are associated by comparing the observed count in each cell of a contingency table with the count expected if there were no association.** Expected count = row total × column total / grand total.

### Assumptions

1. Each case counted once, in one cell (independent observations).
2. Counts, not percentages or means.
3. Large enough expected counts: none below 1 and no more than 20% below 5 (Cochran's rule) [8]. Otherwise use Fisher's exact test [9].

### Worked example: chi-square on a 2 × 2 table

**Data (example, invented):** 120 students, cross-classified by tutoring attendance and exam result.

| | Passed | Failed | Total |
| --- | --- | --- | --- |
| Attended tutoring | 42 | 18 | 60 |
| Did not attend | 30 | 30 | 60 |
| Total | 72 | 48 | 120 |

Steps:

1. Expected counts: attended and passed = 60 × 72 / 120 = 36. The four expected counts are 36, 24, 36, 24. All are above 5.
2. χ² = Σ (observed − expected)² / expected = 36/36 + 36/24 + 36/36 + 36/24 = 1 + 1.5 + 1 + 1.5 = 5.00.
3. df = (rows − 1) × (columns − 1) = 1.
4. p = .025.
5. Cramér's V = √(χ² / (N × 1)) = √(5 / 120) = .20, a small-to-moderate association.

Report: "Tutoring attendance was associated with passing, χ²(1, N = 120) = 5.00, p = .025, V = .20. 70% of attendees passed, compared with 50% of non-attendees."

**Continuity correction:** R's `chisq.test` applies Yates's correction to 2 × 2 tables by default [10]. With it, χ²(1) = 4.20, p = .040. Fisher's exact test gives p = .040 too. Say which version you ran.

### What a chi-square test does not tell you

- **Direction or size.** Report the proportions and Cramér's V (or a risk difference or odds ratio).
- **Which cells drive it**, in tables bigger than 2 × 2. Look at standardized residuals.
- **Anything about means.** Don't run chi-square on averaged scores, and don't use it for paired yes/no data (use McNemar's test).

## Chi-square vs t-test: which do I need?

Look at your outcome column. If it holds numbers you can average (scores, times, weights), use a t-test or ANOVA. If it holds labels (yes/no, pass/fail, A/B/C), use chi-square.

A frequent mistake is turning a numeric outcome into categories, such as splitting scores into "high" and "low", and then running chi-square. This throws information away and lowers power. Keep the number and use the t-test.

## How to run these tests in AI for Research

All three run in [Data Lab](/features/data-lab), the statistics workspace, at 0 credits. The free [statistics calculator](/tools/data-analysis) also runs t-tests and chi-square tests without an account.

1. Upload your CSV in Data Lab. Use long format: one row per case, one column for the outcome and one for the group.
2. Pick the test: Welch's t-test or paired t-test, Mann-Whitney U, one-way ANOVA, or chi-square.
3. Read the result card: means and SDs per group, the statistic, df, p, and effect size (Cohen's d or dz, η², Cramér's V), with an APA sentence you can copy.
4. Optional: generate a results section with AI from the computed numbers (2 credits).

<!-- SCREENSHOT: Data Lab one-way ANOVA result for the three study methods, showing F(2, 21) = 9.62, η² = .48 and the post hoc warning -->

<!-- SCREENSHOT: Data Lab chi-square result showing expected-count warning text and Cramér's V -->

Limits to know: Data Lab's chi-square has no Yates correction (it reports the uncorrected χ², 5.00 in the example above) and warns you when more than 20% of cells have expected counts under 5, but it doesn't run Fisher's exact test. It runs no post hoc tests after ANOVA, no Welch's ANOVA and no Kruskal-Wallis. Use R, jamovi, JASP or SPSS for those [4][5][6][7].

<!-- LINK: /tools/statistical-test-chooser when L31 ships -->

## FAQ

### When should I use a t-test vs ANOVA?

Use a t-test when you compare the means of exactly two groups, or one group measured twice. Use a one-way ANOVA when you compare the means of three or more independent groups. With two groups, the two tests give the same p-value, because F equals t squared for Student's t-test. With three or more groups, ANOVA tests them all at once and keeps the false-positive rate at your alpha.

### Can you use a t-test for three groups?

Not on its own. Running a separate t-test for every pair of three groups means three tests, and the chance of at least one false positive at alpha .05 rises to about 14%. Run a one-way ANOVA first. If it is significant, use a post hoc test such as Tukey's HSD, or pairwise tests with a Bonferroni or Holm correction, to find which groups differ.

### What does a chi-square test tell you?

A chi-square test of independence tells you whether two categorical variables are associated, by comparing the counts you observed in each cell of a table with the counts you would expect if there were no association. A small p-value says the pattern of counts is unlikely under no association. It does not say how strong the association is, so report Cramér's V or the difference in proportions too.

### What is the difference between a chi-square test and a t-test?

They answer questions about different kinds of data. A t-test compares the means of a numeric outcome, such as a test score, between two groups. A chi-square test compares counts of a categorical outcome, such as passed or failed, across groups. If your outcome is a category, use chi-square. If it is a measured number, use a t-test or ANOVA.

### Should I use Welch's t-test or Student's t-test?

Use Welch's t-test by default. It does not assume the two groups have equal variances, and when the variances are equal it gives almost the same answer as Student's test. Student's test can give misleading p-values when variances and group sizes both differ. Many statisticians now recommend Welch as the default, and R's t.test function uses it unless you ask otherwise.

## Next steps

- Go back to the full decision table: [which statistical test to use](/blog/which-statistical-test-to-use).
- Plan how many participants each group needs: [statistical power and sample size](/blog/statistical-power-and-sample-size).
- Check whether your data meet the normality assumption: [how to test for normality](/blog/how-to-test-for-normality).

## Sources

1. Delacre, M., Lakens, D., & Leys, C. (2017). Why psychologists should by default use Welch's t-test instead of Student's t-test. *International Review of Social Psychology, 30*(1), 92–101. https://doi.org/10.5334/irsp.82
2. R Core Team. `t.test` documentation (Welch is the default, `var.equal = FALSE`). https://stat.ethz.ch/R-manual/R-devel/library/stats/html/t.test.html
3. Ghasemi, A., & Zahediasl, S. (2012). Normality tests for statistical analysis: A guide for non-statisticians. *International Journal of Endocrinology and Metabolism, 10*(2), 486–489. https://doi.org/10.5812/ijem.3505
4. The R Project for Statistical Computing. https://www.r-project.org/
5. jamovi. https://www.jamovi.org/
6. JASP. https://jasp-stats.org/
7. IBM SPSS Statistics. https://www.ibm.com/products/spss-statistics
8. Cochran, W. G. (1954). Some methods for strengthening the common χ² tests. *Biometrics, 10*(4), 417–451. https://doi.org/10.2307/3001616
9. Kim, H.-Y. (2017). Statistical notes for clinical researchers: Chi-squared test and Fisher's exact test. *Restorative Dentistry & Endodontics, 42*(2), 152–155. https://doi.org/10.5395/rde.2017.42.2.152
10. R Core Team. `chisq.test` documentation (`correct = TRUE` applies the continuity correction to 2 × 2 tables). https://stat.ethz.ch/R-manual/R-devel/library/stats/html/chisq.test.html
