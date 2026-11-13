---
title: "Bayesian T-Test: How to Run, Read and Report One"
slug: "bayesian-t-test"
description: "The Bayesian t-test step by step: one-sample, paired and two-sample, a worked example, robustness checks, a reporting template and a Bayesian proportion test."
primary_keyword: "bayesian t test"
secondary_keywords: ["bayesian paired t test", "bayesian independent samples t test", "bayesian one sample t test", "jzs bayes factor", "bayesian proportion test", "beta binomial", "how to report bayesian t test"]
cluster: "O. Statistics for research"
pillar: "/blog/which-statistical-test-to-use"
author: "Mubarak"
compares_tools: false
published: "2026-11-13"
updated: "2026-11-13"
faq:
  - q: "What is a Bayesian t-test?"
    a: "A Bayesian t-test compares the same means as a classical t-test, but instead of a p value it gives a Bayes factor: how much more likely the data are if there is an effect than if there is none. The usual version, the JZS Bayes factor, puts a Cauchy prior on the standardized effect size. It can show evidence for no difference as well as for a difference."
  - q: "When should I use a Bayesian t-test instead of a classical one?"
    a: "Use it when you want to say how strong the evidence is either way, especially when you want to support a null result (for example, that two groups do not differ), or when a reviewer asks whether a non-significant result means no effect. Many researchers report both: the classical t-test with its confidence interval and the Bayes factor."
  - q: "Do Bayesian t-tests have the same assumptions as classical t-tests?"
    a: "Yes. The default JZS t-test assumes the same model as the classical test: independent observations and roughly normal data (or normal differences, for the paired test). The two-sample version assumes equal variances. Check the data the same way, and use a non-parametric or robust alternative if the assumptions clearly fail."
  - q: "What prior should I use for a Bayesian t-test?"
    a: "The common default is a Cauchy prior on the effect size with scale r = 0.707, which expects small to medium effects. If you have good reason to expect larger or smaller effects, from earlier studies or the field, you can choose another scale before seeing the data. Either way, report the prior and show the Bayes factor with a narrower and a wider prior as a robustness check."
  - q: "What sample size do I need for a Bayesian t-test?"
    a: "There is no fixed minimum, but small samples rarely give strong evidence either way, and the Bayes factor will often sit in the anecdotal range. You can plan for a target Bayes factor with a design analysis, or use sequential testing, where you collect data until the Bayes factor passes a threshold you set in advance, up to a maximum sample."
---

# Bayesian t-test: one-sample, paired and two-sample, with a worked example

*Last updated: 13 November 2026*

A Bayesian t-test answers the same question as a classical t-test, whether a mean (or a difference in means) is zero, but it reports a Bayes factor instead of a p value. BF10 says how much more likely the data are if there is an effect than if there is not, so it can support a difference or support no difference. The standard version uses the JZS prior, a Cauchy distribution on the effect size with scale r = 0.707. Run it on the same data as the classical test, check that the result holds under other priors, and report the Bayes factor with the prior and the effect size.

This guide is for students and researchers who know the classical t-test and want the Bayesian version, or who have been asked by a reviewer to add one. If Bayes factors are new to you, read [Bayes factor explained](/blog/bayes-factor-explained) first. For the classical tests, see [t-test vs ANOVA vs chi-square](/blog/t-test-vs-anova-vs-chi-square).

## The three Bayesian t-tests

They mirror the classical tests one to one.

| Test | Use it when | Null hypothesis | Classical twin | Example question |
| --- | --- | --- | --- | --- |
| **One-sample** | One group, compared with a fixed value | The population mean equals the value (δ = 0) | One-sample t-test | Is the mean anxiety score different from the population norm of 10? |
| **Paired** | The same people measured twice, or matched pairs | The mean of the differences is 0 | Paired t-test | Did sleep change after a 4-week program? |
| **Two-sample (independent)** | Two separate groups | The two means are equal | Student's t-test | Do the two teaching methods give different exam scores? |

In each, the effect size δ is the standardized mean difference (Cohen's d, or dz for paired data). The Bayes factor compares:

- **H0:** δ = 0
- **H1:** δ follows a Cauchy distribution centered on 0 with scale r (two-sided), or a half-Cauchy (one-sided, if you predicted a direction before seeing the data).

The Bayes factor depends on the data only through the t statistic, the sample size and the degrees of freedom, so the Bayesian and classical tests start from the same numbers. <!-- VERIFY: Rouder et al. 2009, Psychon Bull Rev 16:225-237, for the JZS Bayes factor as a function of t, N and df -->

## Assumptions

The default JZS t-test uses the same model as the classical one:

1. **Independent observations** (within each group; pairs are independent of each other).
2. **Roughly normal data**: the values for a one-sample test, the differences for a paired test, each group for a two-sample test. See [how to test for normality](/blog/how-to-test-for-normality).
3. **Equal variances** for the two-sample test. With very unequal variances and group sizes, treat the result with caution.

Being Bayesian does not fix outliers or skew. Look at the data first.

## How to run one, step by step

1. **State the hypothesis and its direction before you look at the data.** Two-sided unless you had a directional prediction in advance.
2. **Choose the prior.** The default Cauchy scale is r = 0.707. Use another only for a reason you can write down, such as effect sizes in earlier studies.
3. **Check the assumptions** with a plot of the values or differences.
4. **Run the test.** Note the t statistic, df, BF10 (or BF01) and the effect size estimate.
5. **Read the Bayes factor** against the evidence categories, but report the number.
6. **Run a robustness check:** the same test with r = 1 and r = 1.414 (and a narrower one, such as 0.5, if small effects are plausible).
7. **Report** the test, prior, Bayes factor, effect size and robustness check, ideally next to the classical result.

## A worked example (invented data)

*Example (invented for illustration).* Ten participants recorded their average nightly sleep (hours) for a week before and a week after a 4-week sleep program. The numbers are made up to show the method.

| Participant | Before | After | Difference |
| --- | --- | --- | --- |
| 1 | 6.1 | 6.9 | 0.8 |
| 2 | 5.8 | 7.0 | 1.2 |
| 3 | 6.5 | 6.2 | −0.3 |
| 4 | 6.0 | 6.5 | 0.5 |
| 5 | 5.5 | 6.5 | 1.0 |
| 6 | 6.8 | 7.0 | 0.2 |
| 7 | 5.9 | 6.8 | 0.9 |
| 8 | 6.3 | 6.2 | −0.1 |
| 9 | 6.2 | 6.8 | 0.6 |
| 10 | 5.7 | 6.4 | 0.7 |

**Classical paired t-test on the differences** (these follow directly from the table):

- Mean difference = 0.55 hours, SD of differences = 0.48
- t(9) = 3.60, two-sided P = 0.006
- Effect size dz = 0.55 / 0.48 = 1.14

**Bayesian paired t-test, default prior (Cauchy, r = 0.707, two-sided):**

- BF10 = [rerun in Data Lab] <!-- VERIFY: rerun in Data Lab and paste the BF10 (an independent numerical integration of the JZS formula gave about 9.6) -->

How to read it: if BF10 comes out near 10, the data are about ten times more likely under "the program changed sleep" than under "no change", which sits at the border between moderate and strong evidence on the Lee and Wagenmakers labels. With only ten people, that is a respectable amount of evidence, but not overwhelming; the single participant who slept 0.3 hours less matters a lot at this size.

**Robustness check.** Rerun with r = 1 and r = 1.414. <!-- VERIFY: rerun in Data Lab at r = 1 and r = 1.414 and paste the BF10 values (independent check gave about 9.9 and 9.3) --> If the Bayes factor stays in the same band, write that the conclusion is robust to the prior. If it drops into the anecdotal range under a wider prior, say so: the evidence depends on how large you expected the effect to be.

**A note on the two-sample version.** Two separate groups of 10 would be analyzed with a two-sample test: df = n1 + n2 − 2 = 18, and an effective sample size of n1 × n2 / (n1 + n2) = 5 in the Bayes factor. In most real data, people differ from each other far more than they change, so the same mean difference gives much weaker evidence between groups than within people. Do not analyze paired data as two groups, or the reverse.

## Reporting template

> "We compared [outcome] [before and after / between groups / with the reference value of X] using a Bayesian [paired / independent-samples / one-sample] t-test with a [two-sided / one-sided] Cauchy prior on the effect size (scale r = 0.707). The data were [BF10] times more likely under the hypothesis of a difference than under no difference (BF10 = [value]), [label] evidence for [a difference / no difference]. [The estimated effect size was δ = [median] (95% credible interval [lower] to [upper]).] The result was [robust / sensitive] to the prior: BF10 = [value] with r = 1 and [value] with r = 1.414. A classical paired t-test gave t([df]) = [t], P = [P], mean difference [value] (95% CI [lower] to [upper]). Analyses were run in [software, version]."

If the evidence favors the null, report BF01 instead: "BF01 = 4.2, moderate evidence that the groups did not differ."

The [SAMPL guidelines](/blog/sampl-guidelines) ask Bayesian analyses to report the priors and why, the model, the posterior estimates with credible intervals, and the sensitivity to the priors; the template covers all four.

## Bayesian test of a proportion (beta-binomial)

The same logic applies to a proportion: the share of patients who respond, of students who pass, of samples that test positive. Here the maths is simple enough to do by hand.

**The model.** The unknown proportion θ gets a **Beta(a, b)** prior. You observe x successes in n trials. The posterior is

> **θ | data ~ Beta(a + x, b + n − x)**

Because the beta prior and the binomial likelihood are conjugate, no integration is needed. A Beta(1, 1) prior is uniform: every value of θ from 0 to 1 is equally plausible before the data. A Beta(0.5, 0.5) prior is the Jeffreys prior. An informative prior, such as Beta(6, 4), is like having seen 6 successes and 4 failures before; use one only if you can justify it from earlier data.

**Worked example (invented).** A pilot gives a new study app to 20 students; 14 complete the first module. With a uniform Beta(1, 1) prior:

| Quantity | Value |
| --- | --- |
| Posterior | Beta(1 + 14, 1 + 6) = Beta(15, 7) |
| Posterior mean | 15 / 22 = 0.682 |
| Posterior median | 0.687 |
| 95% credible interval (equal-tailed) | 0.478 to 0.854 |
| Probability that θ > 0.5 | 0.961 |

Read: given the data and a uniform prior, the completion rate is most plausibly around 68%, and there is a 95% probability it lies between about 48% and 85%. There is a 96% probability that more than half of students like these would complete the module. The interval is wide because 20 is a small pilot; that is the honest message.

You can also compute a Bayes factor for a test value, for example H0: θ = 0.5 against H1: θ ~ Beta(1, 1). Report the prior and the test value with it.

## Common mistakes

- **Choosing a one-sided test after seeing the direction of the effect.** It inflates the Bayes factor.
- **Not reporting the prior scale.** BF10 = 9 with r = 0.707 is a different claim from BF10 = 9 with r = 0.2.
- **Calling a BF10 of 1.5 "evidence for an effect"** without saying it is anecdotal.
- **Treating BF10 below 1 as "no result".** Report BF01: it may be evidence for the null.
- **Forgetting the effect size.** The Bayes factor says whether there is an effect; the posterior for δ says how big it is.
- **Using a paired test on independent groups**, or the other way round.

## Running a Bayesian t-test in AI for Research

**[Data Lab](/features/data-lab)** runs Bayesian t-tests (one-sample, paired and two-sample, with the JZS Bayes factor) and a Bayesian proportion (beta-binomial). The calculations happen in your browser and are not generated by the AI, and they cost no credits. Upload or paste your data, pick the Bayesian test and the variables, and run it next to the classical test on the same data. <!-- VERIFY: confirm the result card's outputs (BF10, BF01, prior scale, credible interval) and whether r can be changed for the robustness check --> The optional AI write-up of the results section costs 2 credits; check every number in it against the result card. "Download PDF report" exports the results, tables and charts as one PDF, at no cost.

See [Bayesian statistics](/features/bayesian-statistics) for what each test shows. The Free plan has 45 credits a month; see [pricing](/pricing).

<!-- SCREENSHOT: Data Lab Bayesian paired t-test on the sleep example, showing BF10, the evidence label and the prior scale, next to the classical paired t-test result -->

## Learn more

- [Bayes factor explained](/blog/bayes-factor-explained): BF10, BF01, evidence categories and priors
- [T-test vs ANOVA vs chi-square](/blog/t-test-vs-anova-vs-chi-square)
- [Which statistical test to use](/blog/which-statistical-test-to-use), the pillar of this series
- [Statistical power and sample size](/blog/statistical-power-and-sample-size)
