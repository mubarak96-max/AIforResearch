---
title: "Power of a Statistical Test and Sample Size, Explained"
slug: "statistical-power-and-sample-size"
description: "The power of a statistical test, explained with one study: how effect size, alpha and sample size fit together, with checked numbers and two proportions."
primary_keyword: "power of statistical test"
secondary_keywords: ["statistical power", "sample size calculation", "effect size", "power analysis", "what is a good statistical power", "how does sample size affect power", "what is 80% power"]
cluster: "O. Statistics for research"
pillar: "/blog/which-statistical-test-to-use"
author: "Mubarak"
compares_tools: false
published: "2026-11-12"
updated: "2026-11-12"
faq:
  - q: "What is a good statistical power?"
    a: "The usual minimum is 80%, a convention from Jacob Cohen: if the true effect is the size you assumed, the study has an 80% chance of a significant result and a 20% chance of missing it. Many funders and trials aim for 90% when a missed effect would be costly. Power below 50% means the study is more likely to miss a real effect than find it."
  - q: "What does 80% power mean?"
    a: "It means that if the true effect is exactly the size you planned for, 80 out of 100 identical studies would give a significant result at your chosen alpha, and 20 would not. Those 20 are Type II errors, or false negatives. Power is always tied to a specific effect size: the same study has much lower power to detect a smaller effect."
  - q: "How does sample size affect power?"
    a: "Power rises with sample size, but with diminishing returns. In a two-group t-test looking for a medium effect (d = 0.5) at alpha .05, power is 34% with 20 per group, 48% with 30, 70% with 50, 80% with 64 and 94% with 100. Halving the effect size you want to detect roughly quadruples the sample you need."
  - q: "How do I calculate sample size for a study?"
    a: "Choose the test, the smallest effect size worth detecting, alpha (usually .05) and power (usually .80 or .90). Enter them into a power calculator such as G*Power, R's pwr package or Data Lab. For a two-group t-test with d = 0.5, alpha .05 and power .80, you need 64 per group. Then add 10 to 20% for drop-out and justify the effect size in your methods."
  - q: "What can I do if my sample is too small?"
    a: "Be honest about it. Report the smallest effect your sample could detect with 80% power, and the confidence interval for the effect you found. Use a more precise outcome measure, a paired or repeated-measures design, or covariates to reduce noise. Call the study a pilot or feasibility study if that is what it is, and don't read a non-significant result as evidence of no effect."
---

# Power of a statistical test and sample size, explained with one study

*Last updated: 12 November 2026*

The power of a statistical test is the probability that it detects an effect that really exists. It depends on four linked numbers: effect size, alpha, sample size and power itself. Fix any three and the fourth follows. For a two-group t-test with a medium effect (d = 0.5), alpha .05 and 80% power, you need 64 people per group.

This guide is for students and researchers planning a study, writing a proposal, or answering an examiner who asks "was your sample big enough?". It uses one running example throughout so you can see each number move. For choosing the test itself, start with the pillar guide on [which statistical test to use](/blog/which-statistical-test-to-use).

## What is statistical power?

**Statistical power is the probability that a test rejects the null hypothesis when a specific alternative hypothesis is true.** Put simply, it is the chance your study finds an effect of the size you expected, if that effect is real.

Every test can make two errors:

| | No real effect | Real effect |
| --- | --- | --- |
| Test significant | **Type I error** (false positive), probability α | Correct: probability = power (1 − β) |
| Test not significant | Correct | **Type II error** (false negative), probability β |

**Alpha (α) is the false-positive rate you accept, usually .05. Beta (β) is the false-negative rate, and power = 1 − β.** At 80% power, β = .20: you accept a one-in-five chance of missing a real effect of the planned size.

Low power doesn't just cause missed effects. In a field full of small studies, the significant results that do get published tend to overestimate effect sizes and are less likely to replicate [1].

## The four numbers that set power

1. **Effect size.** **Effect size is a standardized measure of how large a difference or relationship is, independent of sample size.** For two means, Cohen's d is the difference divided by the pooled standard deviation. Cohen's benchmarks are d = 0.2 (small), 0.5 (medium) and 0.8 (large) [2][3], but use them only when you have nothing better. Lakens gives the formulas for d and its variants [6].
2. **Alpha.** Lower alpha (.01 instead of .05) means fewer false positives and less power.
3. **Sample size.** More cases mean a smaller standard error and more power.
4. **Power.** The target, usually .80 or .90.

Two design choices also matter: one- or two-sided testing, and whether measurements are paired. A paired design removes between-person variation and often needs far fewer participants.

## The running example: a two-group study

**Scenario (example):** you plan a trial comparing a new reading intervention with usual teaching. The outcome is a reading test score. Earlier studies suggest a medium effect, d = 0.5. You will analyze with a two-sided, two-sample t-test at α = .05 and want 80% power.

### How many participants? The calculation

1. **Write the inputs:** test = two-sample t-test, two-sided; d = 0.5; α = .05; power = .80; equal group sizes.
2. **Approximate by hand** with the normal formula: n per group = 2 × (z₁₋α/₂ + z₁₋β)² / d². With z = 1.960 and 0.842, n = 2 × (2.802)² / 0.25 = 62.8. Adding the usual small-sample correction of z₁₋α/₂² / 4 = 0.96 gives 63.75.
3. **Round up:** 64 per group, 128 in total.
4. **Check with the exact method.** The exact calculation uses the noncentral t distribution, as G*Power does [4]. With 64 per group (df = 126, noncentrality 2.83), power is 80.1%. With 63 per group it is 79.5%, so 64 is the minimum.
5. **Add for drop-out.** If you expect 15% attrition, recruit 64 / 0.85 = 75.3, so 76 per group.

How to write it up: "A sample of 64 per group gives 80% power to detect a standardized difference of d = 0.5 with a two-sided t-test at α = .05 (G*Power 3.1). To allow for 15% attrition, we will recruit 76 per group (152 in total)."

### What changes the answer

Each row changes one input from the running example and keeps the rest. All values are from the exact noncentral t calculation.

| Change | n per group |
| --- | --- |
| Running example (d = 0.5, α = .05, power .80, two-sided) | 64 |
| Small effect, d = 0.2 | 394 |
| Large effect, d = 0.8 | 26 |
| Power .90 instead of .80 | 86 |
| α = .01 instead of .05 | 96 |
| One-sided test | 51 |
| Paired design, dz = 0.5 (number of pairs) | 34 |

Two lessons stand out. Effect size dominates: going from d = 0.5 to d = 0.2 multiplies the sample about six times. And a one-sided test buys a smaller sample only if you truly would ignore an effect in the other direction; decide that before seeing data.

## How does sample size affect power?

Power rises quickly at first and then flattens. Here is the running example (d = 0.5, α = .05, two-sided) at different group sizes:

| n per group | 10 | 20 | 30 | 40 | 50 | 64 | 80 | 100 | 150 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Power | 19% | 34% | 48% | 60% | 70% | 80% | 88% | 94% | 99% |

A study with 30 per group, common in student projects, has a 48% chance of detecting a medium effect: worse than a coin toss. The smallest effect it can detect with 80% power is d = 0.74.

## What is a good statistical power?

80% is the conventional minimum, proposed by Cohen as a balance between the cost of a study and the risk of missing an effect [2]. Aim for 90% when a missed effect would be costly, such as a confirmatory trial. Power under 50% means a study is more likely to miss a real effect than find it.

Power is only as good as the effect size behind it. The weakest part of most power analyses is an effect size picked to make the sample affordable. Better sources, in order [5]:

1. The smallest effect that would matter in practice (the smallest effect size of interest).
2. A meta-analysis of similar studies, adjusted downward for publication bias.
3. A single earlier study, treated with caution: published effects tend to be inflated.
4. Cohen's benchmarks, as a last resort, stated as such.

## Sample size for two proportions

When the outcome is yes/no, power depends on the two proportions, not on a standardized d.

**Scenario (example):** a text-message reminder is expected to raise vaccination uptake from 25% (control) to 40%. Two-sided α = .05, power .80.

1. Inputs: p₁ = 0.40, p₂ = 0.25, average p̄ = 0.325.
2. Formula (pooled-variance normal approximation): n = [z₁₋α/₂ √(2p̄(1−p̄)) + z₁₋β √(p₁(1−p₁) + p₂(1−p₂))]² / (p₁ − p₂)².
3. Plug in: [1.960 × √(2 × 0.325 × 0.675) + 0.842 × √(0.24 + 0.1875)]² / 0.15² = 151.9.
4. Round up: **152 per group**, 304 in total.
5. With Fleiss's continuity correction, used by some calculators, the answer is 165 per group. Say which method you used.

A smaller difference costs far more. Moving from 20% to 30% (a 10-point gain) needs 294 per group by the same formula. If you recruit only 100 per group for the 25% vs 40% study, power falls to about 62%.

## What to do with a small sample

Sometimes the sample is fixed: a rare condition, one school, a thesis deadline. You still have options.

- **Report the detectable effect.** "With 30 per group, the study had 80% power to detect d = 0.74 or larger." That is honest and useful.
- **Report confidence intervals,** not just p-values. A wide interval tells the reader what the data can and can't rule out.
- **Reduce noise.** Use a paired or crossover design, a more reliable outcome measure, or adjust for a baseline score (ANCOVA).
- **Don't read "not significant" as "no effect".** An underpowered null result is inconclusive.
- **Don't compute "observed power" after the fact** from the effect you found. It is a function of your p-value and adds no information [5][7].
- **Call a pilot a pilot.** Pilot studies estimate feasibility and variance; they aren't meant to test effects.

## How to calculate sample size in AI for Research

[Data Lab](/features/data-lab), the statistics workspace in AI for Research, has a **Sample size** tab. It costs 0 credits.

1. Open Data Lab and choose **Sample size**. You don't need to upload data.
2. Pick **t-test** and a design: two independent groups, paired, or one sample. Enter d, alpha and power. The running example (d = 0.5, α = .05, power .80) returns 64 per group.
3. Or, for t-tests, enter a sample you already have to see its power.
4. For yes/no outcomes, pick **two proportions** and enter both percentages.
5. Copy the reporting sentence it gives you into your methods, and add your drop-out allowance.

<!-- SCREENSHOT: Data Lab Sample size tab with two independent groups, d = 0.5, alpha 0.05, power 0.8, showing 64 per group and the reporting sentence -->

Honest limits: Data Lab uses a normal approximation with a small-sample correction. It agrees with G*Power to within about one case for common designs, but it isn't an exact noncentral t calculation. Its two-proportion formula has no continuity correction. It doesn't cover ANOVA, correlation, chi-square with more than two groups, regression or cluster designs; use G*Power [4], R's pwr package or a statistician for those. The Methodology builder in the Thesis Suite (3 credits) can help you write the sample size justification around numbers you have computed.

<!-- LINK: /tools/sample-size-calculator when L32 ships -->

## FAQ

### What is a good statistical power?

The usual minimum is 80%, a convention from Jacob Cohen: if the true effect is the size you assumed, the study has an 80% chance of a significant result and a 20% chance of missing it. Many funders and trials aim for 90% when a missed effect would be costly. Power below 50% means the study is more likely to miss a real effect than find it.

### What does 80% power mean?

It means that if the true effect is exactly the size you planned for, 80 out of 100 identical studies would give a significant result at your chosen alpha, and 20 would not. Those 20 are Type II errors, or false negatives. Power is always tied to a specific effect size: the same study has much lower power to detect a smaller effect.

### How does sample size affect power?

Power rises with sample size, but with diminishing returns. In a two-group t-test looking for a medium effect (d = 0.5) at alpha .05, power is 34% with 20 per group, 48% with 30, 70% with 50, 80% with 64 and 94% with 100. Halving the effect size you want to detect roughly quadruples the sample you need.

### How do I calculate sample size for a study?

Choose the test, the smallest effect size worth detecting, alpha (usually .05) and power (usually .80 or .90). Enter them into a power calculator such as G*Power, R's pwr package or Data Lab. For a two-group t-test with d = 0.5, alpha .05 and power .80, you need 64 per group. Then add 10 to 20% for drop-out and justify the effect size in your methods.

### What can I do if my sample is too small?

Be honest about it. Report the smallest effect your sample could detect with 80% power, and the confidence interval for the effect you found. Use a more precise outcome measure, a paired or repeated-measures design, or covariates to reduce noise. Call the study a pilot or feasibility study if that is what it is, and don't read a non-significant result as evidence of no effect.

## Next steps

- Pick the test your power analysis is for: [which statistical test to use](/blog/which-statistical-test-to-use).
- See the tests behind these calculations in action: [t-test vs ANOVA vs chi-square](/blog/t-test-vs-anova-vs-chi-square).
- Check your data meet the test's assumptions: [how to test for normality](/blog/how-to-test-for-normality).
- Write the methods section that holds your sample size justification: [how to write a methodology chapter](/blog/how-to-write-a-methodology-chapter).

## Sources

1. Button, K. S., Ioannidis, J. P. A., Mokrysz, C., Nosek, B. A., Flint, J., Robinson, E. S. J., & Munafò, M. R. (2013). Power failure: Why small sample size undermines the reliability of neuroscience. *Nature Reviews Neuroscience, 14*, 365–376. https://doi.org/10.1038/nrn3475
2. Cohen, J. (1988). *Statistical power analysis for the behavioral sciences* (2nd ed.). Lawrence Erlbaum. https://doi.org/10.4324/9780203771587
3. Cohen, J. (1992). A power primer. *Psychological Bulletin, 112*(1), 155–159. https://doi.org/10.1037/0033-2909.112.1.155
4. Faul, F., Erdfelder, E., Lang, A.-G., & Buchner, A. (2007). G*Power 3: A flexible statistical power analysis program for the social, behavioral, and biomedical sciences. *Behavior Research Methods, 39*(2), 175–191. https://doi.org/10.3758/BF03193146 ; download: https://www.psychologie.hhu.de/arbeitsgruppen/allgemeine-psychologie-und-arbeitspsychologie/gpower
5. Lakens, D. (2022). Sample size justification. *Collabra: Psychology, 8*(1), 33267. https://doi.org/10.1525/collabra.33267
6. Lakens, D. (2013). Calculating and reporting effect sizes to facilitate cumulative science: A practical primer for t-tests and ANOVAs. *Frontiers in Psychology, 4*, 863. https://doi.org/10.3389/fpsyg.2013.00863
7. Hoenig, J. M., & Heisey, D. M. (2001). The abuse of power: The pervasive fallacy of power calculations for data analysis. *The American Statistician, 55*(1), 19–24. https://doi.org/10.1198/000313001300339897
