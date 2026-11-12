---
title: "Statistical Test for Normality: Shapiro-Wilk and Q-Q Plots"
slug: "how-to-test-for-normality"
description: "How to run a statistical test for normality with Shapiro-Wilk and Q-Q plots, why big samples always fail, and what to do when your data are not normal."
primary_keyword: "statistical test for normality"
secondary_keywords: ["shapiro-wilk test", "q-q plot", "normality assumption", "data not normally distributed", "which normality test should i use", "do i need normal data for a t test", "what if my data is not normal"]
cluster: "O. Statistics for research"
pillar: "/blog/which-statistical-test-to-use"
author: "Mubarak"
compares_tools: false
published: "2026-11-12"
updated: "2026-11-12"
faq:
  - q: "Which normality test should I use?"
    a: "Use the Shapiro-Wilk test together with a Q-Q plot. Shapiro-Wilk has better power than the Kolmogorov-Smirnov test, even with the Lilliefors correction, and it is the test most guides recommend. The Q-Q plot shows you where and how badly the data depart from normal, which the p-value can't. In small samples rely more on the plot and on what you know about the variable."
  - q: "What if my data is not normal?"
    a: "First check whether it matters. With about 30 to 40 or more cases per group, t-tests and ANOVA are usually robust to non-normal data. If the sample is small and the data are clearly skewed, transform the variable (log for right skew), or use the non-parametric equivalent: Mann-Whitney U instead of an independent t-test, Wilcoxon signed-rank instead of a paired t-test, Kruskal-Wallis instead of ANOVA."
  - q: "Do I need normal data for a t-test?"
    a: "Not exactly. A t-test assumes the sampling distribution of the mean (or of the mean difference) is roughly normal, not every data point. That holds when the outcome is roughly normal in each group, or when groups are large enough for the central limit theorem to help, often 30 or more. For a paired t-test, check the differences, not the two raw columns."
  - q: "Why does my Shapiro-Wilk test say non-normal with a large sample?"
    a: "Because with thousands of cases the test detects departures too small to matter. In a simulation with samples from a nearly normal t distribution, Shapiro-Wilk rejected normality 22% of the time at n = 100 and 91% at n = 1,000. At those sizes the t-test is robust anyway. With large samples, judge normality from a Q-Q plot and skewness, not the p-value."
  - q: "How do I read a Q-Q plot?"
    a: "A Q-Q plot puts your sorted data against the values a normal distribution would predict. If the points lie close to the straight reference line, the data are roughly normal. Points curving above the line at the right end mean right skew. An S-shape with both ends bending away means heavy or light tails. A few isolated points at the ends are outliers worth checking."
---

# How to run a statistical test for normality, and what to do when the data fail

*Last updated: 12 November 2026*

The standard statistical test for normality is the Shapiro-Wilk test, read alongside a Q-Q plot. A p-value below .05 means the data depart from a normal distribution. But the test is weak in small samples and oversensitive in large ones, so decide from the plot, the sample size and the test you plan to run, then transform or switch to a non-parametric test if needed.

This guide is for students and researchers checking assumptions before a t-test, ANOVA, correlation or regression. It covers what to test, how to read the results, and what to do next. For choosing the test itself, see the pillar guide on [which statistical test to use](/blog/which-statistical-test-to-use).

## What is the normality assumption?

**The normality assumption is the requirement, in parametric tests such as the t-test and ANOVA, that the outcome (or the model's residuals) comes from a roughly normal distribution.** It matters because these tests compute p-values from the t and F distributions, which are exact only when the data are normal.

What has to be normal depends on the test:

| Test | What to check for normality |
| --- | --- |
| Independent t-test (Welch or Student) | The outcome within each group, separately |
| Paired t-test | The differences between the pairs |
| One-way ANOVA | The outcome within each group, or the residuals |
| Linear regression | The residuals, not the raw variables |
| Pearson correlation | Both variables, and their joint scatter |

A common mistake is testing the whole outcome column with both groups pooled. If the groups differ, the pooled data can look bimodal even when each group is perfectly normal.

The assumption is less critical than many people think. **The central limit theorem says the sampling distribution of the mean approaches normal as the sample grows, whatever the shape of the data.** Ghasemi and Zahediasl note that with samples larger than 30 or 40, violating normality should not cause major problems [1]. Lumley and colleagues show the same for large public health data sets [2].

## Which normality test should I use?

Use the Shapiro-Wilk test, and always look at a Q-Q plot alongside it.

**The Shapiro-Wilk test is a statistical test of the null hypothesis that a sample came from a normal distribution; its statistic W measures how well the sorted data match the values expected under normality, and W near 1 means a close match.** It was introduced by Shapiro and Wilk in 1965 [3]. Most software now uses Royston's extension, which works for samples from 3 to 5,000 [4].

How the common tests compare:

| Test | Use it? | Notes |
| --- | --- | --- |
| Shapiro-Wilk | Yes, first choice | Better power than Kolmogorov-Smirnov, even with Lilliefors's correction [1] |
| Kolmogorov-Smirnov (Lilliefors) | Avoid as your main test | Low power; the uncorrected version is wrong when the mean and SD come from the data [1] |
| Anderson-Darling | Acceptable alternative | More weight on the tails |
| Skewness and kurtosis z-scores | As a supplement | z = statistic / its standard error; beyond ±1.96 is notable in small samples [1] |
| Q-Q plot | Always | Shows where and how much the data depart |

## How to run a Shapiro-Wilk test and a Q-Q plot

1. **Decide what to test** using the table above: each group, the paired differences, or the residuals.
2. **Plot first.** Make a histogram and a Q-Q plot for each group. Look for skew, heavy tails, and outliers that may be data-entry errors.
3. **Run Shapiro-Wilk** on the same values. In R: `shapiro.test(x)`, with `qqnorm(x); qqline(x)` for the plot [5]. jamovi, JASP and SPSS offer both in their descriptives or assumption-check options [6][7][8].
4. **Read W and p together with the plot.** p < .05 says the departure is detectable, not that it is large.
5. **Weigh the sample size.** Small sample with a clear departure: act on it. Large sample with a small departure on the plot: usually ignore it.
6. **Report what you did**, for example: "Shapiro-Wilk tests and Q-Q plots showed that length of stay was right-skewed (W = 0.82, p = .002), so we analyzed log-transformed values."

### How to read a Q-Q plot

**A Q-Q (quantile-quantile) plot graphs the sorted sample values against the quantiles a normal distribution would predict; normal data fall close to a straight line.** The NIST/SEMATECH e-Handbook of Statistical Methods has reference pictures for each pattern [9].

| Pattern | What it means |
| --- | --- |
| Points on the line | Roughly normal |
| Curve bending upward at the right end (a bowl shape) | Right (positive) skew |
| Curve bending downward at the left end | Left (negative) skew |
| S-shape, both ends pulling away from the line | Heavy tails (more extreme values than normal) |
| Reverse S, ends flattening toward the line | Light tails |
| One or two isolated points at an end | Outliers: check them |

## Worked example: skewed data and a log transformation

**Data (example, invented):** length of hospital stay, in days, for 20 patients.

2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 7, 7, 8, 9, 11, 13, 16, 22

1. **Describe:** mean = 7.15, median = 5.5, SD = 5.01. The mean sits well above the median, a sign of right skew.
2. **Skewness:** 1.75 (adjusted Fisher-Pearson). Its standard error for n = 20 is 0.51, so z = 1.75 / 0.51 = 3.41, beyond the ±1.96 rule of thumb [1].
3. **Shapiro-Wilk:** W = 0.82, p = .002. Normality is rejected.
4. **Q-Q plot:** the points bend upward at the right end, driven by the 13, 16 and 22-day stays. A classic right-skew bowl.
5. **Transform:** take the natural log of each value.
6. **Recheck:** on the log scale, skewness = 0.43 (z = 0.83), and Shapiro-Wilk gives W = 0.97, p = .85.

A t-test on the logged values now compares geometric means, not arithmetic means. The geometric mean stay here is e^(mean of logs) = 5.92 days, against an arithmetic mean of 7.15. Back-transform your results and say so in the write-up.

You can reproduce every number by entering the 20 values into R (`shapiro.test(x)` and `shapiro.test(log(x))`), jamovi, JASP or SPSS.

## Why do large samples always fail normality tests?

Because a test's power grows with sample size, and almost no real variable is exactly normal. With enough data, Shapiro-Wilk detects departures too small to change any t-test or ANOVA result.

We simulated this. For each sample size we drew 1,000 samples and recorded how often Shapiro-Wilk gave p < .05. One source was a t distribution with 10 degrees of freedom (bell-shaped, slightly heavier tails than normal). The other was a gamma distribution with shape 50 (skewness 0.28, barely visible on a histogram). A true normal distribution is included as a check.

| n | Normal | t, 10 df | Gamma, shape 50 |
| --- | --- | --- | --- |
| 30 | 5.1% | 12.1% | 6.6% |
| 100 | 4.4% | 21.6% | 16.6% |
| 500 | 4.9% | 65.6% | 61.0% |
| 1,000 | 4.5% | 91.0% | 90.1% |
| 5,000 | 4.0% | 100% | 100% |

*Method: Python with NumPy (random seed 2026) and Royston's algorithm, the same one R's `shapiro.test` uses. Your percentages will differ slightly from run to run, but the pattern will not.*

At n = 1,000 the test almost always says "not normal", yet a t-test on either distribution works fine at that size. At n = 30 it misses the departure most of the time. That is the paradox: the test is most sensitive when normality matters least. Fagerland makes the same point for choosing between t-tests and rank tests in large studies [10].

Decision rule: with more than a few hundred cases per group, base the decision on the Q-Q plot and on skewness, not on the Shapiro-Wilk p-value.

## What if my data is not normal? Four options

Pick the route that fits your question, sample size and the kind of departure.

1. **Do nothing, with a reason.** If each group has 30 to 40 or more cases and the departure is moderate, parametric tests are usually robust [1][2]. Use Welch's t-test so unequal variances don't add a second problem.
2. **Transform the variable.** Log for right-skewed positive values (times, costs, concentrations); square root for counts; reciprocal for very strong skew. Box-Cox finds a power transformation from the data [11]. Transform before the analysis and report the results on the original scale.
3. **Use a non-parametric test.** Mann-Whitney U for two independent groups, Wilcoxon signed-rank for paired data, Kruskal-Wallis for three or more groups, Spearman for correlation. These compare ranks, so they answer a slightly different question than the t-test: whether values in one group tend to be higher, not whether the means differ.
4. **Use a better model.** Bootstrapped confidence intervals, robust methods such as trimmed means, or a model built for the data (Poisson or negative binomial for counts, logistic regression for yes/no). These usually need a statistics package.

| Your data | Parametric test | Non-parametric route |
| --- | --- | --- |
| Two independent groups | Welch's t-test | Mann-Whitney U |
| Paired measurements | Paired t-test | Wilcoxon signed-rank |
| Three or more groups | One-way ANOVA | Kruskal-Wallis |
| Two numeric variables | Pearson correlation | Spearman correlation |

Don't run both tests and report whichever gives the smaller p-value. Decide the route from the plots and design, ideally in your analysis plan, before you see the result.

## How to check normality in AI for Research

[Data Lab](/features/data-lab), the statistics workspace in AI for Research, helps with the visual checks and the non-parametric route for two groups. All statistics cost 0 credits.

1. Upload your CSV in Data Lab and open **Describe and chart**.
2. Read the mean, median and SD for each column. A mean far from the median signals skew.
3. Draw a **histogram** and a **box plot** of the outcome for each group. Look for long tails and outliers.
4. Open **Which test?** and answer "Is the outcome roughly normal?" with yes, no or not sure. It suggests the parametric test or its non-parametric alternative, with the assumptions to report.
5. For two independent groups with non-normal data, run **Mann-Whitney U** in Data Lab. To transform, add a log column to your CSV in a spreadsheet and upload it again.

<!-- SCREENSHOT: Data Lab histogram of a right-skewed variable next to its descriptive statistics, mean above median -->

<!-- SCREENSHOT: Data Lab "Which test?" with "No: skewed or with outliers" selected and Mann-Whitney U recommended -->

Honest limits: Data Lab doesn't run the Shapiro-Wilk test or draw Q-Q plots, and it doesn't run Wilcoxon signed-rank, Kruskal-Wallis or Spearman. Use R, jamovi, JASP or SPSS for those steps [5][6][7][8]; jamovi and JASP are free. Data Lab's Mann-Whitney p-value uses the normal approximation, which can differ slightly from an exact p in very small samples.

## FAQ

### Which normality test should I use?

Use the Shapiro-Wilk test together with a Q-Q plot. Shapiro-Wilk has better power than the Kolmogorov-Smirnov test, even with the Lilliefors correction, and it is the test most guides recommend. The Q-Q plot shows you where and how badly the data depart from normal, which the p-value can't. In small samples rely more on the plot and on what you know about the variable.

### What if my data is not normal?

First check whether it matters. With about 30 to 40 or more cases per group, t-tests and ANOVA are usually robust to non-normal data. If the sample is small and the data are clearly skewed, transform the variable (log for right skew), or use the non-parametric equivalent: Mann-Whitney U instead of an independent t-test, Wilcoxon signed-rank instead of a paired t-test, Kruskal-Wallis instead of ANOVA.

### Do I need normal data for a t-test?

Not exactly. A t-test assumes the sampling distribution of the mean (or of the mean difference) is roughly normal, not every data point. That holds when the outcome is roughly normal in each group, or when groups are large enough for the central limit theorem to help, often 30 or more. For a paired t-test, check the differences, not the two raw columns.

### Why does my Shapiro-Wilk test say non-normal with a large sample?

Because with thousands of cases the test detects departures too small to matter. In a simulation with samples from a nearly normal t distribution, Shapiro-Wilk rejected normality 22% of the time at n = 100 and 91% at n = 1,000. At those sizes the t-test is robust anyway. With large samples, judge normality from a Q-Q plot and skewness, not the p-value.

### How do I read a Q-Q plot?

A Q-Q plot puts your sorted data against the values a normal distribution would predict. If the points lie close to the straight reference line, the data are roughly normal. Points curving above the line at the right end mean right skew. An S-shape with both ends bending away means heavy or light tails. A few isolated points at the ends are outliers worth checking.

## Next steps

- Choose the right test once you know the shape of your data: [which statistical test to use](/blog/which-statistical-test-to-use).
- See Welch's t-test and Mann-Whitney U side by side on real numbers: [t-test vs ANOVA vs chi-square](/blog/t-test-vs-anova-vs-chi-square).
- Plan a sample big enough for the robustness to kick in: [statistical power and sample size](/blog/statistical-power-and-sample-size).

## Sources

1. Ghasemi, A., & Zahediasl, S. (2012). Normality tests for statistical analysis: A guide for non-statisticians. *International Journal of Endocrinology and Metabolism, 10*(2), 486–489. https://doi.org/10.5812/ijem.3505
2. Lumley, T., Diehr, P., Emerson, S., & Chen, L. (2002). The importance of the normality assumption in large public health data sets. *Annual Review of Public Health, 23*, 151–169. https://doi.org/10.1146/annurev.publhealth.23.100901.140546
3. Shapiro, S. S., & Wilk, M. B. (1965). An analysis of variance test for normality (complete samples). *Biometrika, 52*(3–4), 591–611. https://doi.org/10.1093/biomet/52.3-4.591
4. Royston, P. (1995). Remark AS R94: A remark on Algorithm AS 181: The W-test for normality. *Journal of the Royal Statistical Society, Series C (Applied Statistics), 44*(4), 547–551. https://doi.org/10.2307/2986146
5. R Core Team. `shapiro.test` documentation. https://stat.ethz.ch/R-manual/R-devel/library/stats/html/shapiro.test.html
6. jamovi. https://www.jamovi.org/
7. JASP. https://jasp-stats.org/
8. IBM SPSS Statistics. https://www.ibm.com/products/spss-statistics
9. NIST/SEMATECH. e-Handbook of Statistical Methods: Normal probability plot. https://www.itl.nist.gov/div898/handbook/eda/section3/normprpl.htm
10. Fagerland, M. W. (2012). t-tests, non-parametric tests, and large studies: A paradox of statistical practice? *BMC Medical Research Methodology, 12*, 78. https://doi.org/10.1186/1471-2288-12-78
11. Box, G. E. P., & Cox, D. R. (1964). An analysis of transformations. *Journal of the Royal Statistical Society, Series B, 26*(2), 211–243. https://doi.org/10.1111/j.2517-6161.1964.tb00553.x
