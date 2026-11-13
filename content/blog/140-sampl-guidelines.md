---
title: "SAMPL Guidelines: How to Report Statistics in a Paper"
slug: "sampl-guidelines"
description: "The SAMPL guidelines for statistical reporting: what to report for each test, effect sizes and confidence intervals, exact P values, common mistakes, examples."
primary_keyword: "sampl guidelines"
secondary_keywords: ["sampl checklist", "statistical reporting guidelines", "how to report statistics in a paper", "reporting p values", "reporting confidence intervals", "statistical analyses and methods in the published literature"]
cluster: "S. Clinical studies and reporting"
pillar: "/blog/site-initiation-visit-checklist"
author: "Mubarak"
compares_tools: false
published: "2026-11-13"
updated: "2026-11-13"
faq:
  - q: "What are the SAMPL guidelines?"
    a: "SAMPL (Statistical Analyses and Methods in the Published Literature) is a set of guidelines by Thomas Lang and Douglas Altman for reporting basic statistics in biomedical articles. It covers how to describe the statistical methods and how to report descriptive statistics, hypothesis tests, associations, regression, analysis of variance, survival and Bayesian analyses. It complements study-design checklists such as CONSORT and STROBE rather than replacing them."
  - q: "Does SAMPL have a numbered checklist?"
    a: "SAMPL is written as guidance in points under headings, not as a numbered checklist like CONSORT. Tools and journals that use it as a checklist number the points for reference. In AI for Research the points are numbered M1 to M10 for methods and R1 to R12 for results, so each can be checked and cited."
  - q: "Should I report exact P values?"
    a: "Yes. SAMPL asks for exact P values, such as P = 0.03 or P = 0.41, rather than only P < 0.05 or 'NS'. Very small values can be given as P < 0.001. The P value should come with the effect size and its confidence interval, because the P value alone does not tell the reader how large or how precise the effect is."
  - q: "Should I use the standard deviation or the standard error?"
    a: "Use the standard deviation to describe how spread out the data are, and a confidence interval to describe how precise an estimate is. SAMPL warns against using the standard error of the mean to describe variability, because it makes data look less variable than they are."
  - q: "Does SAMPL apply outside medicine?"
    a: "SAMPL was written for biomedical journals, but its rules on describing methods, reporting effect sizes with confidence intervals and giving exact P values apply to any field that uses statistics. Psychology, education and the social sciences have similar guidance, such as APA's journal article reporting standards."
---

# SAMPL guidelines: what to report for every statistical analysis

*Last updated: 13 November 2026*

The SAMPL guidelines (Statistical Analyses and Methods in the Published Literature) say how to report basic statistics in a research article. In the methods, state the purpose of each analysis, which test answered which question, how you checked its assumptions, the alpha level, whether tests were one- or two-sided, and the software. In the results, give the numbers analyzed, suitable descriptive statistics, the effect size with a confidence interval, and exact P values. They were written by Thomas Lang and Douglas Altman and published in 2013. <!-- VERIFY: Lang TA, Altman DG. In: Smart P, Maisonneuve H, Polderman A, eds. Science Editors' Handbook. EASE, 2013; also reprinted in Int J Nurs Stud 2015;52:5-9 -->

This guide is for anyone writing the methods and results of a quantitative study, and for supervisors and reviewers checking one. It belongs to our series on clinical studies and reporting.

## What SAMPL is and where it fits

Design checklists such as CONSORT 2010 (trials) and STROBE 2007 (observational studies) tell you what to report about how the study was done. SAMPL covers the layer underneath: how to report the statistics in any of them. Use it alongside the design checklist, not instead of it.

SAMPL is written as guidance, in points under headings, not as a numbered list. The table below is our condensed version, numbered M (methods) and R (results) for reference, as in the Reviewer guideline check. Our [reporting checklists template](/templates/reporting-checklists) has a shorter one-page summary to fill.

| # | Area | Report |
| --- | --- | --- |
| M1 | Data preparation | Any change to the raw data before analysis: transformations, categorization, imputation of missing values |
| M2 | Purpose | The purpose of each analysis, tied to an objective |
| M3 | Variables | The variables in each analysis, each summarized with suitable descriptive statistics |
| M4 | Important difference | Where possible, the smallest difference considered clinically or practically important |
| M5 | Methods | The main methods, clear about which method was used for which analysis |
| M6 | Assumptions | That the data met each test's assumptions, and how that was checked |
| M7 | Alpha and sidedness | The alpha level and whether tests were one- or two-sided |
| M8 | Software | The software and its version |
| M9 | Supplementary | Methods for sensitivity analyses and missing data |
| M10 | Post hoc | Unplanned analyses, including subgroups, identified as exploratory |
| R1 | Sample | The number analyzed in each group, with losses and exclusions and their reasons |
| R2 | Descriptives | Mean and SD for roughly normal data; median and interquartile range (or range) for skewed data |
| R3 | Percentages | Numerators and denominators with every percentage |
| R4 | Effect | For main comparisons, the size of the difference with a confidence interval |
| R5 | P values | Exact P values, with the test used |
| R6 | Association | The measure of association with its confidence interval, and the direction |
| R7 to R9 | Regression | How variables were chosen and entered; checks of assumptions, collinearity and fit; coefficients with confidence intervals |
| R10 | ANOVA | The model, the factors, the between-group tests and effect sizes |
| R11 | Survival | The event, how censoring was handled, survival estimates with confidence intervals |
| R12 | Bayesian | Priors and why, the model, posterior estimates with credible intervals, sensitivity to the priors |

## What to report for each common test

SAMPL gives principles; this table applies them to the tests most papers use. For choosing the test in the first place, see [which statistical test to use](/blog/which-statistical-test-to-use).

| Test | Methods should say | Results should give | Example (invented) |
| --- | --- | --- | --- |
| Independent t-test | Two-sided, alpha, how normality and equal variances were checked, Welch or Student | Mean (SD) per group, mean difference with 95% CI, t, df, exact P, effect size | "Mean difference 4.2 points (95% CI 1.1 to 7.3); t(86) = 2.69, P = 0.009; d = 0.57" |
| Paired t-test | That observations were paired and how | Mean of the differences with 95% CI, t, df, P | "Mean change −3.1 kg (95% CI −4.4 to −1.8); t(29) = 4.87, P < 0.001" |
| One-way ANOVA | The factor, levels, assumption checks, post hoc method and correction | Group means (SD), F, both df, P, effect size (eta squared), post hoc differences with CIs | "F(2, 117) = 5.41, P = 0.006, η² = 0.08" |
| Chi-square | Expected counts checked; Fisher's exact test if small | Counts and percentages with denominators, chi-square, df, P, and a risk difference or ratio with CI | "18/60 (30%) vs 9/62 (15%); risk ratio 2.07 (95% CI 1.01 to 4.24)" |
| Mann-Whitney U | Why non-parametric | Medians (IQR) per group, U, P, and an effect estimate (such as the Hodges-Lehmann difference) with CI | "Median 12 (IQR 8 to 17) vs 9 (6 to 13); U = 1,412, P = 0.02" |
| Correlation | Pearson or Spearman, and why | r with 95% CI, n, P, and a scatterplot | "r = 0.42 (95% CI 0.24 to 0.57), n = 104" |
| Linear regression | Outcome, predictors, how chosen, checks of residuals and collinearity | Coefficients with 95% CIs, R², n | "Each additional year of age: 0.8 mmHg (95% CI 0.5 to 1.1)" |
| Logistic regression | Outcome coding, predictors, events per variable, fit | Odds ratios with 95% CIs, the number of events | "OR 1.9 (95% CI 1.2 to 3.0); 74 events" |
| Survival | Event, censoring, Kaplan-Meier, log-rank or Cox, proportional hazards check | Median survival with CI, hazard ratio with CI, numbers at risk | "HR 0.71 (95% CI 0.55 to 0.92)" |

All numbers in the example column are invented to show the format.

## Effect sizes and confidence intervals

The most important SAMPL point for most papers: **report the size of the effect and its precision, not only whether it was "significant".**

- **Use the natural units first.** "4.2 points on a 0 to 100 scale" or "a 3.1 kg loss" means more to readers than a standardized effect. Add a standardized effect (d, eta squared, r) for comparisons across studies.
- **Give a confidence interval for every main estimate.** The 95% CI shows the range of effects the data are compatible with. "Mean difference 2.0 (95% CI −0.5 to 4.5)" tells the reader the study cannot rule out no effect or a fairly large one.
- **Compare with the important difference (M4).** If you set a minimal important difference, say whether the CI includes it.
- **For ratios, give the absolute numbers too.** A risk ratio of 2 can mean 1 in 1,000 versus 2 in 1,000, or 30% versus 60%.

## P values

- **Give exact values:** P = 0.03, P = 0.41. Use P < 0.001 for very small ones. Not "P < 0.05", not "NS".
- **Name the test** that produced each P value.
- **Do not read P > 0.05 as "no effect".** Absence of evidence is not evidence of absence; look at the CI. If you need evidence for the null, a Bayesian analysis can provide it; see [Bayes factor explained](/blog/bayes-factor-explained).
- **Correct for multiple comparisons** when you make many, and say how.
- **Mark exploratory analyses (M10)** so readers do not treat them as confirmatory.

## Common mistakes

1. **Mean ± SE to describe data.** The SE shrinks with sample size and makes data look tidier than they are. Use the SD for spread and the CI for precision.
2. **Mean (SD) for skewed data.** Length of stay, costs and counts are usually skewed; give the median and interquartile range.
3. **Percentages without denominators.** "45% improved" of how many?
4. **Only P values.** No estimate, no interval.
5. **"Trend toward significance"** for P = 0.07. Report the estimate and CI and let them speak.
6. **Unnamed tests.** "Data were analyzed with appropriate tests" tells the reader nothing.
7. **Assumptions never checked.** Normality, equal variances, proportional hazards. See [how to test for normality](/blog/how-to-test-for-normality).
8. **Subgroup claims from separate P values,** rather than a test of interaction.
9. **Software without a version.**

## A worked example (invented)

*Example (invented for illustration).* A draft results paragraph reads: "The intervention group improved significantly more than controls (p<0.05). Anxiety scores were 8.2 ± 0.6 and 10.4 ± 0.7."

Revised to SAMPL:

> "At 8 weeks, 44 of 48 participants in the intervention group and 45 of 50 in the control group were analyzed (Figure 1). Mean GAD-7 scores were 8.2 (SD 4.1) and 10.4 (SD 4.9). The mean difference was −2.2 points (95% CI −4.1 to −0.3; Student's t(87) = 2.29, P = 0.02), smaller than the 4-point difference we prespecified as important. Analyses used R version 4.4."

The revision gives the numbers analyzed (R1), the SD instead of the SE (R2), the effect and CI (R4), an exact P with its test (R5), the comparison with the important difference (M4) and the software (M8). It also reads more honestly: the effect is real but smaller than the team hoped.

## Checking your statistics in AI for Research

Two parts of AI for Research help here.

- **The Reviewer guideline check** now includes SAMPL (2013) and SAGER (2016), with CONSORT 2010, STROBE 2007, PRISMA 2020, CARE 2013, STARD 2015, COREQ 2007, SRQR 2014 and SQUIRE 2.0. Choose SAMPL, and it lists items M1 to R12 with the passage that appears to report each, or "check by hand" when it finds none. It costs 5 credits per 10,000 words. The check drafts the checklist; you confirm it, and it does not guarantee a journal's acceptance. More: [reporting guideline checker](/features/reporting-guideline-checker).
- **[Data Lab](/features/data-lab)** runs the tests themselves. The statistics are calculated in your browser, not generated by the AI, and free. Each result comes with an effect size (Cohen's d, η², r or Cramér's V) and an APA 7 sentence, and the "Which test?" chooser includes a reporting template. Not every result shows a confidence interval, so add the CIs SAMPL asks for where they are missing. An AI write-up of the results section costs 2 credits; check it against the table above.

The Free plan has 45 credits a month; see [pricing](/pricing).

<!-- SCREENSHOT: Reviewer guideline check with SAMPL selected, showing items R4 and R5 with matched passages -->

## Learn more

- [Which statistical test to use](/blog/which-statistical-test-to-use)
- [T-test vs ANOVA vs chi-square](/blog/t-test-vs-anova-vs-chi-square)
- [SAGER guidelines](/blog/sager-guidelines) for sex and gender reporting
- [Site initiation visit checklist](/blog/site-initiation-visit-checklist), the pillar of this series
- [Reporting checklists template](/templates/reporting-checklists)
