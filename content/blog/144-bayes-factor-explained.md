---
title: "Bayes Factor Explained: BF10, BF01 and How to Read Them"
slug: "bayes-factor-explained"
description: "The Bayes factor explained: what BF10 and BF01 mean, evidence categories, the default Cauchy prior (r = 0.707), Bayes factor vs p value, and how to report it."
primary_keyword: "bayes factor"
secondary_keywords: ["bayes factor interpretation", "bf10", "bf01", "bayes factor vs p value", "jzs prior", "bayes factor evidence categories", "how to report bayes factor"]
cluster: "O. Statistics for research"
pillar: "/blog/which-statistical-test-to-use"
author: "Mubarak"
compares_tools: false
published: "2026-11-13"
updated: "2026-11-13"
faq:
  - q: "What is a Bayes factor in simple terms?"
    a: "A Bayes factor is a ratio that says how much more likely the observed data are under one hypothesis than under another. A BF10 of 6 means the data are six times more likely if there is an effect (H1) than if there is none (H0). It measures the strength of the evidence the data provide, and it can favor either hypothesis."
  - q: "What is the difference between BF10 and BF01?"
    a: "BF10 compares the alternative hypothesis with the null; BF01 compares the null with the alternative. One is the reciprocal of the other: BF01 = 1 / BF10. A BF10 of 0.2 is the same result as a BF01 of 5, which is moderate evidence for the null. Report whichever is above 1, and say which one it is."
  - q: "What is a good Bayes factor?"
    a: "There is no pass mark. By the commonly used labels, a Bayes factor from 1 to 3 is anecdotal evidence, 3 to 10 moderate, 10 to 30 strong, 30 to 100 very strong and above 100 extreme. These labels are conventions to help reading, not thresholds. Report the number itself and let the reader judge it."
  - q: "Can a Bayes factor support the null hypothesis?"
    a: "Yes, and that is one of its main advantages over a p value. A non-significant p value only says the data are not surprising under the null; it cannot say the null is supported. A BF01 of 8 says the data are eight times more likely under the null than under the alternative, given the prior on the effect size."
  - q: "Why does the prior matter for a Bayes factor?"
    a: "The alternative hypothesis is defined by a prior on the effect size, and the Bayes factor asks how well that prior predicted the data. A wide prior spreads its bets over large effects; if the true effect is small, the Bayes factor will lean toward the null. That is why you should state the prior, justify it, and show how the Bayes factor changes with a narrower or wider one."
---

# Bayes factor explained: what BF10 and BF01 mean and how to report them

*Last updated: 13 November 2026*

A Bayes factor is the ratio of how likely your data are under one hypothesis compared with another. BF10 compares the alternative (an effect) with the null (no effect): BF10 = 5 means the data are five times more likely if there is an effect. BF01 is the reverse, and BF01 = 1 / BF10. Unlike a p value, a Bayes factor can show evidence for the null as well as against it. Report it with the prior you used, because the alternative hypothesis is defined by that prior.

This guide is for students and researchers who have met Bayes factors in a paper, a reviewer's comment or software such as JASP, and want to read and report them correctly. It is part of our statistics series; for choosing the test in the first place, start with [which statistical test to use](/blog/which-statistical-test-to-use).

## The idea in one equation

Bayes' theorem, written in odds:

> **posterior odds = Bayes factor × prior odds**

- **Prior odds** are how plausible you found H1 compared with H0 before the data.
- **The Bayes factor** is how much the data should change those odds.
- **Posterior odds** are where you end up.

The Bayes factor is the part that comes from the data. Two readers with different prior odds will end with different posterior odds, but they can agree on the Bayes factor, as long as they agree on how each hypothesis predicts the data. That is why papers report the Bayes factor rather than posterior odds.

Formally, BF10 = p(data | H1) / p(data | H0). Each term is the **marginal likelihood**: how well the hypothesis predicted the data, averaged over the values of the effect it allows.

## BF10 and BF01

| You report | It compares | Above 1 means | Below 1 means |
| --- | --- | --- | --- |
| BF10 | H1 against H0 | Evidence for an effect | Evidence for no effect |
| BF01 | H0 against H1 | Evidence for no effect | Evidence for an effect |

They carry the same information. Convention: when the evidence favors the null, report BF01 so the number is above 1 and easy to read. BF10 = 0.125 and BF01 = 8 are the same result, and the second is clearer. Some software also reports the natural log, log(BF10), which is symmetrical around 0.

## How to read the size: evidence categories

Harold Jeffreys proposed verbal labels for Bayes factors in his *Theory of Probability* (1961). The version most used in psychology and the social sciences today is the relabelling by Lee and Wagenmakers (2013), which JASP also uses. <!-- VERIFY: category boundaries and labels in Lee & Wagenmakers 2013 (Bayesian Cognitive Modeling, Table 7.1) and Jeffreys 1961 Appendix B -->

| BF10 | Evidence for H1 (Lee and Wagenmakers labels) |
| --- | --- |
| above 100 | Extreme |
| 30 to 100 | Very strong |
| 10 to 30 | Strong |
| 3 to 10 | Moderate |
| 1 to 3 | Anecdotal |
| 1 | No evidence either way |
| 1/3 to 1 | Anecdotal evidence for H0 |
| 1/10 to 1/3 | Moderate evidence for H0 |
| 1/30 to 1/10 | Strong evidence for H0 |
| 1/100 to 1/30 | Very strong evidence for H0 |
| below 1/100 | Extreme evidence for H0 |

Jeffreys's own labels differ ("barely worth mentioning", "substantial", "strong", "very strong", "decisive"), and Kass and Raftery (1995) proposed another scale based on 2 × ln(BF). <!-- VERIFY: Kass & Raftery 1995, J Am Stat Assoc 90:773-795 --> Whichever you use, name it. And treat the labels as an aid: a BF10 of 2.9 and one of 3.1 are practically the same evidence, even though they fall on either side of a label boundary.

## The prior: the default JZS (Cauchy) prior

The null hypothesis is usually a point: effect size δ = 0. The alternative cannot just be "δ is not 0", because the marginal likelihood needs to know which effect sizes H1 predicts and how strongly. That is the job of the **prior on the effect size**.

For t-tests, the standard default is the **JZS prior** (Jeffreys-Zellner-Siow), set out by Rouder and colleagues in 2009: a Cauchy distribution on the standardized effect size δ, centered on 0, with a scale parameter r. <!-- VERIFY: Rouder JN, Speckman PL, Sun D, Morey RD, Iverson G. Psychon Bull Rev 2009;16:225-237 -->

| Scale r | Common name | What it says |
| --- | --- | --- |
| 0.707 (= √2 / 2) | "Medium", the default in JASP and the BayesFactor R package | Half of the prior mass lies between δ = −0.707 and 0.707 |
| 1 | "Wide" (the original Rouder et al. default) | Expects larger effects |
| 1.414 (= √2) | "Ultrawide" | Expects very large effects |

<!-- VERIFY: r = 0.707 as the default in current JASP and BayesFactor versions, and the names medium, wide and ultrawide -->

Three points about priors that trip people up:

1. **A wider prior is not "less informative" in a neutral way.** It predicts large effects. If the real effect is small, a wide prior predicts the data badly, and the Bayes factor moves toward the null. This is why very wide priors can make an effect look absent.
2. **The prior is part of the hypothesis.** "BF10 = 6" means "the data are six times more likely under H1 with a Cauchy(0, 0.707) prior on δ than under H0". Change the prior and you test a slightly different H1.
3. **Check robustness.** Report the Bayes factor at the default and at a narrower and wider r. If the conclusion holds across them, say so. If it does not, say that too. JASP calls this a robustness check; you can do it by rerunning the test with each r.

A one-sided hypothesis (δ > 0) uses a half-Cauchy prior. If you have a directional prediction set before the data, a one-sided test is legitimate and gives more evidence when the effect goes the predicted way. Say which you used.

## Bayes factor vs p value

| | p value | Bayes factor |
| --- | --- | --- |
| Question it answers | How surprising are these data, or more extreme ones, if H0 is true? | How much more likely are these data under H1 than under H0? |
| Can it support H0? | No. A large p is "no evidence against H0", not evidence for it | Yes. BF01 above 1 is evidence for H0 |
| Needs an alternative? | No | Yes, defined by the prior |
| Optional stopping | Inflates false positives if you peek and stop at p < 0.05 | Can be monitored as data come in, within limits <!-- VERIFY: wording on optional stopping and Bayes factors; see Rouder 2014 --> |
| With large samples | A tiny, unimportant effect becomes "significant" | Can favor H0 when p is just under 0.05, if the effect is small relative to the prior |

The last row is **Lindley's paradox**: with a large sample, p = 0.04 can come with a Bayes factor that favors the null. They are not contradicting each other; they answer different questions. The p value says the data are a little unusual under H0; the Bayes factor says they are even more unusual under an H1 that expected bigger effects.

As a rough guide only, p values just under 0.05 often correspond to Bayes factors in the anecdotal range, which is one reason some statisticians argue for stricter thresholds. Do not convert one into the other; compute both from the data.

## How to report a Bayes factor

Report:

1. The test, one- or two-sided, and the hypotheses.
2. The prior: its family and scale (e.g. Cauchy, r = 0.707), and why.
3. BF10 or BF01, labelled, to two or three significant figures.
4. The effect size estimate with a credible interval (or, if you also ran the frequentist test, the CI).
5. A robustness check across priors.
6. The software and version.

*Example (invented for illustration):*

> "A Bayesian paired-samples t-test with a default Cauchy prior on the effect size (r = 0.707) gave BF10 = 7.4, moderate evidence that scores improved after training. The posterior median effect size was δ = 0.61 (95% credible interval 0.18 to 1.05). The conclusion held with wide (r = 1; BF10 = 6.9) and ultrawide (r = 1.414; BF10 = 5.6) priors."

All numbers in that sentence are invented to show the format. The [SAMPL guidelines](/blog/sampl-guidelines) also ask for the priors, the model, posterior estimates with credible intervals and the sensitivity to the priors.

## Common mistakes

- **Calling BF10 = 0.3 "no evidence".** It is anecdotal evidence for H0; report BF01 = 3.3.
- **Reading the Bayes factor as the probability that H1 is true.** It is a ratio of likelihoods. The probability of H1 also depends on the prior odds.
- **Not stating the prior.** Without it, a Bayes factor cannot be interpreted or reproduced.
- **Reporting only the label.** "Strong evidence" without the number hides whether it was 11 or 90.
- **Choosing the prior after seeing the data** to get a bigger number.
- **Treating 3 as a significance threshold.** The labels are not decision rules.

## Bayes factors in AI for Research

**[Data Lab](/features/data-lab)** now runs Bayesian t-tests (one-sample, paired and two-sample, with the JZS Bayes factor) and a Bayesian proportion (beta-binomial). The calculations run in your browser and are not generated by the AI, and they cost no credits. <!-- VERIFY: confirm Data Lab's default r (0.707), whether r can be changed for robustness checks, and which outputs (BF10/BF01, posterior effect size, credible interval) the result card shows --> The optional AI write-up of a results section costs 2 credits; check every number in it against the result. See [Bayesian statistics](/features/bayesian-statistics) for what it shows, and the Free plan's 45 credits a month on the [pricing](/pricing) page.

<!-- SCREENSHOT: Data Lab Bayesian paired t-test result card showing BF10, BF01, the prior scale and the evidence label -->

For a step-by-step worked example, read the [Bayesian t-test guide](/blog/bayesian-t-test).

## Learn more

- [Bayesian t-test](/blog/bayesian-t-test): one-sample, paired, two-sample, with a worked example
- [Which statistical test to use](/blog/which-statistical-test-to-use), the pillar of this series
- [Statistical power and sample size](/blog/statistical-power-and-sample-size)
- [SAMPL guidelines](/blog/sampl-guidelines) for reporting statistics
