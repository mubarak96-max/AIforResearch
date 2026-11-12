---
title: "Cohen's Kappa: Calculate and Report Screening Agreement"
slug: "cohens-kappa-inter-rater-reliability"
description: "Cohen's kappa for systematic review screening: the formula, a worked 2x2 example by hand, how to read the value, Fleiss for more raters, and how to report it."
primary_keyword: "cohen's kappa"
secondary_keywords: ["inter-rater reliability", "kappa interpretation", "cohen's kappa calculator", "fleiss kappa", "what is a good kappa value", "how to calculate cohen's kappa by hand", "how to report kappa in a systematic review", "krippendorff's alpha"]
cluster: "N. Systematic reviews"
pillar: "/blog/what-is-a-systematic-review"
author: "Mubarak"
compares_tools: false
published: "2026-11-12"
updated: "2026-11-12"
faq:
  - q: "What is a good Cohen's kappa value?"
    a: "On the Landis and Koch scale, 0.61 to 0.80 is substantial and above 0.80 almost perfect agreement. McHugh's stricter reading for health research calls 0.60 to 0.79 moderate and treats anything below 0.60 as inadequate. For systematic review screening, a kappa of about 0.6 or higher is usually taken as acceptable, but always report the value and how you resolved disagreements."
  - q: "How do you calculate Cohen's kappa by hand?"
    a: "Put the two raters' decisions in a 2x2 table. Observed agreement po is the agreeing cells divided by the total. Expected agreement pe is the sum, over each category, of rater A's proportion times rater B's proportion. Then kappa equals (po minus pe) divided by (1 minus pe). For 384 agreements in 400 records with pe of 0.828, kappa is 0.77."
  - q: "What is the difference between Cohen's kappa and percent agreement?"
    a: "Percent agreement counts how often two raters made the same decision. Cohen's kappa subtracts the agreement you would expect by chance, given how often each rater uses each category. In screening, where most records are excluded, chance agreement is high, so percent agreement can be 96% while kappa is a more modest 0.77. Report both."
  - q: "When should I use Fleiss' kappa instead of Cohen's kappa?"
    a: "Use Cohen's kappa when the same two raters judge every item. Use Fleiss' kappa when three or more raters judge each item, or when different raters judge different items but each item gets the same number of ratings. Krippendorff's alpha is the more flexible choice when ratings are missing or the data are ordinal or interval."
  - q: "How do you report kappa in a systematic review?"
    a: "State how many reviewers screened each record, whether they worked independently, the stage (title and abstract or full text), the number of records, percent agreement, Cohen's kappa with its 95% confidence interval, and how disagreements were resolved. For example: two reviewers independently screened 400 records; agreement was 96.0% (kappa 0.77, 95% CI 0.66 to 0.88)."
  - q: "Can Cohen's kappa be negative?"
    a: "Yes. A negative kappa means the raters agreed less often than chance would predict, which usually points to a real problem: different readings of the eligibility criteria, swapped codes, or one rater misunderstanding the task. Stop, compare the disagreeing records together, clarify the criteria with examples, and pilot again before screening the rest."
---

# Cohen's kappa for screening: how to calculate and report it

*Last updated: 12 November 2026*

Cohen's kappa measures how much two raters agree beyond what chance alone would produce. It runs from below 0 to 1, where 1 is perfect agreement and 0 is chance level. Calculate it as kappa = (po − pe) / (1 − pe), where po is observed agreement and pe is expected chance agreement. In systematic review screening, report it with percent agreement.

This guide is for reviewers who double-screen records in a systematic, scoping or rapid review and need to calculate, read and report agreement. It is part of our guide to [what a systematic review is](/blog/what-is-a-systematic-review).

## What is inter-rater reliability in a systematic review?

**Inter-rater reliability is the degree to which two or more people who apply the same criteria to the same items reach the same decisions.** In a systematic review, those people are the screeners and the items are records at title and abstract or full text. Cochrane recommends that at least two people work independently to decide which studies are eligible [1].

Measuring agreement tells you, and your readers, whether the eligibility criteria were clear enough to apply consistently. Low agreement in a pilot round is a signal to rewrite the criteria before screening the rest.

PRISMA 2020 asks you to report how many reviewers screened each record and whether they worked independently (item 8) [2]. It does not require a kappa value, but many journals and examiners expect one.

## What is Cohen's kappa?

**Cohen's kappa (κ) is a statistic, introduced by Jacob Cohen in 1960, that measures agreement between two raters on a categorical decision after removing the agreement expected by chance [3].** The formula is:

> κ = (po − pe) / (1 − pe)

- **po** is the observed proportion of agreement: the share of items both raters put in the same category.
- **pe** is the expected proportion of chance agreement: for each category, multiply rater A's proportion by rater B's proportion, then add those products.

Read it as "the share of the possible agreement above chance that the raters actually achieved." If the raters agree perfectly, κ = 1. If they agree only as often as chance would predict, κ = 0. If they agree less than chance, κ is negative.

## How do you calculate Cohen's kappa by hand?

Build a 2x2 table of the two raters' decisions, then follow five steps. Here is a worked example.

**Example (invented numbers):** two reviewers independently screened 400 titles and abstracts for a review of mindfulness interventions for nurse burnout. Each record was marked include or exclude.

| | Reviewer B: include | Reviewer B: exclude | Row total (A) |
| --- | --- | --- | --- |
| **Reviewer A: include** | 30 | 10 | 40 |
| **Reviewer A: exclude** | 6 | 354 | 360 |
| **Column total (B)** | 36 | 364 | **400** |

Check the table first: 30 + 10 + 6 + 354 = 400. Row totals 40 + 360 = 400. Column totals 36 + 364 = 400.

1. **Observed agreement (po).** Add the cells where the reviewers agreed, the diagonal: 30 + 354 = 384. Divide by the total: po = 384 / 400 = **0.960**. This is the percent agreement, 96.0%.
2. **Each reviewer's proportions.** Reviewer A included 40 / 400 = 0.10 and excluded 360 / 400 = 0.90. Reviewer B included 36 / 400 = 0.09 and excluded 364 / 400 = 0.91.
3. **Chance agreement for each category.** Include: 0.10 × 0.09 = 0.009. Exclude: 0.90 × 0.91 = 0.819.
4. **Expected agreement (pe).** Add them: pe = 0.009 + 0.819 = **0.828**.
5. **Kappa.** κ = (0.960 − 0.828) / (1 − 0.828) = 0.132 / 0.172 = **0.767**, which rounds to **0.77**.

The same result in whole counts, to check your arithmetic: chance-expected agreeing pairs are (40 × 36 + 360 × 364) / 400 = (1,440 + 131,040) / 400 = 331.2. Observed agreeing pairs are 384. So κ = (384 − 331.2) / (400 − 331.2) = 52.8 / 68.8 = 0.767.

### Why is kappa lower than percent agreement?

Because most records are excluded, two reviewers who excluded nearly everything would agree often by luck. Here chance alone predicts 82.8% agreement, so 96.0% observed agreement is good but less impressive than it looks. **This is the prevalence problem: when one category dominates, pe is high and kappa falls even when percent agreement is high.** It is why screening papers report both numbers.

### How do you get a 95% confidence interval for kappa?

A simple large-sample approximation, used by McHugh [4], is:

> SE(κ) = √[ po(1 − po) / (N(1 − pe)²) ]

For the example: po(1 − po) = 0.96 × 0.04 = 0.0384. N(1 − pe)² = 400 × 0.172² = 400 × 0.029584 = 11.8336. 0.0384 / 11.8336 = 0.003245, and its square root is SE = 0.057.

95% CI = 0.767 ± 1.96 × 0.057 = 0.767 ± 0.112, so **0.66 to 0.88**. Statistical software uses slightly different standard error formulas, so expect small differences in the second decimal place. McHugh also advises at least 30 compared items; with fewer, the interval is too wide to mean much [4].

### What if there are three categories (include, exclude, maybe)?

The formula is the same; the table is 3x3. po is the sum of the three diagonal cells divided by N, and pe adds three products (include, exclude, maybe). If your decisions are ordered and near-misses matter more than far misses, a weighted kappa is an option, but for screening decisions unweighted kappa is the norm.

## What is a good Cohen's kappa value?

There is no single cutoff, but two published scales are used most. Landis and Koch's 1977 labels are the most cited [5]. McHugh's 2012 reading is stricter, arguing that health research needs more than "substantial" agreement on the Landis and Koch scale [4].

| Kappa | Landis and Koch (1977) | McHugh (2012) |
| --- | --- | --- |
| below 0 | Poor | (serious problem) |
| 0.00 to 0.20 | Slight | None (0 to .20) |
| 0.21 to 0.40 | Fair | Minimal (.21 to .39) |
| 0.41 to 0.60 | Moderate | Weak (.40 to .59) |
| 0.61 to 0.80 | Substantial | Moderate (.60 to .79) |
| 0.81 to 1.00 | Almost perfect | Strong (.80 to .90); almost perfect above .90 |

The worked example's κ of 0.77 is "substantial" on Landis and Koch and "moderate" on McHugh. Name the scale you used when you report a label, because the same number gets different words.

Practical rules for screening:

1. **Pilot first.** Both reviewers screen the same 50 to 100 records, calculate kappa, discuss every disagreement, and clarify the criteria.
2. **Repeat the pilot** if kappa is below about 0.6, McHugh's threshold for adequate agreement [4].
3. **Report the full-screening kappa**, not just the pilot.
4. **Resolve every conflict** by discussion or a third reviewer, whatever the kappa. Kappa describes agreement; it does not fix disagreements.

## What about more than two raters: Fleiss' kappa and Krippendorff's alpha?

Cohen's kappa is for exactly two raters who rate the same items. For more raters, use Fleiss' kappa or Krippendorff's alpha.

**Fleiss' kappa extends kappa to three or more raters, where each item gets the same number of ratings but not necessarily from the same people [6].** Use it when, say, four team members share screening and every record is screened by three of them.

**Krippendorff's alpha is an agreement coefficient that works with any number of raters, missing ratings, and nominal, ordinal, interval or ratio data [7].** Use it when not every rater saw every item, or for data extraction fields that are numbers rather than categories. Krippendorff suggests relying on α ≥ 0.800 and using data with α between 0.667 and 0.800 only for tentative conclusions [8].

| Situation | Statistic |
| --- | --- |
| Two raters, same items, categories | Cohen's kappa |
| Two raters, ordered categories | Weighted kappa |
| Three or more raters, same number of ratings per item | Fleiss' kappa |
| Any number of raters, missing ratings, or numeric data | Krippendorff's alpha |

AI for Research computes Cohen's kappa only. Compute Fleiss' kappa and Krippendorff's alpha elsewhere: in R, the `irr` package has `kappam.fleiss()` and `kripp.alpha()`; in Python, `statsmodels` has `fleiss_kappa` and the `krippendorff` package computes alpha; Hayes and Krippendorff published a macro for SPSS and SAS [7].

<!-- LINK: /tools/inter-rater-agreement-calculator when L33 ships -->

## How do you report Cohen's kappa in a systematic review?

Report it in the Methods (how you screened) and Results (the numbers), with enough detail that a reader can judge it. Include:

1. Number of reviewers and whether they screened independently.
2. Stage: title and abstract, full text, or both.
3. Number of records compared.
4. Percent agreement and Cohen's kappa, with the 95% CI if you can.
5. The interpretation scale, if you give a label.
6. How disagreements were resolved.

**Example wording (based on the worked example):**

> Two reviewers independently screened all 400 titles and abstracts against the eligibility criteria. Agreement was 96.0% (Cohen's κ = 0.77, 95% CI 0.66 to 0.88; substantial agreement per Landis and Koch). Disagreements were resolved by discussion, with a third reviewer consulted when needed.

If you piloted, add one sentence: "After a pilot of 100 records (κ = 0.52), the criteria for study design were clarified." That shows the method worked as intended.

## How to get Cohen's kappa in AI for Research

The [Systematic Review workspace](/features/systematic-review) in AI for Research calculates Cohen's kappa and percent agreement for you as two reviewers screen. It costs 0 credits.

1. **Add a second reviewer.** Put the review in a Project and share it with a colleague as "can edit"; project editors act as second reviewers. Or choose the AI as the second reviewer.
2. **Screen.** Each reviewer marks include, exclude with a reason, or maybe, at title and abstract and then at full text. The workspace does not hide other reviewers' decisions or the AI suggestion, so for truly independent screening agree that each reviewer finishes a batch before looking at the others.
3. **Read the agreement panel.** It shows κ, its Landis and Koch label, percent agreement and the number of records both of you screened, for each stage.
4. **Resolve conflicts.** Records where you disagree are listed as conflicts to settle before they move on, and feed the PRISMA diagram once resolved.

<!-- SCREENSHOT: Screening tab agreement panel showing kappa, the "substantial agreement" label, percent agreement and the record count, with the conflicts list below -->

Details and limits:

- Kappa uses all three decisions (include, exclude, maybe), so it is a 3x3 kappa, not the 2x2 above, if anyone used maybe.
- It reports the point value only, without a confidence interval; use the formula above or R for the CI.
- No Fleiss' kappa, Krippendorff's alpha or weighted kappa.
- AI screening suggestions cost 1 credit per 25 records. If the AI is your second reviewer, say so in your methods and report that agreement as human versus AI, not as two independent human reviewers. Reviewers decide, not the AI.
- The free plan covers 1 review with up to 50 records. See [pricing](/pricing).

## FAQ

### What is a good Cohen's kappa value?

On the Landis and Koch scale, 0.61 to 0.80 is substantial and above 0.80 almost perfect agreement. McHugh's stricter reading for health research calls 0.60 to 0.79 moderate and treats anything below 0.60 as inadequate. For systematic review screening, a kappa of about 0.6 or higher is usually taken as acceptable, but always report the value and how you resolved disagreements.

### How do you calculate Cohen's kappa by hand?

Put the two raters' decisions in a 2x2 table. Observed agreement po is the agreeing cells divided by the total. Expected agreement pe is the sum, over each category, of rater A's proportion times rater B's proportion. Then kappa equals (po minus pe) divided by (1 minus pe). For 384 agreements in 400 records with pe of 0.828, kappa is 0.77.

### What is the difference between Cohen's kappa and percent agreement?

Percent agreement counts how often two raters made the same decision. Cohen's kappa subtracts the agreement you would expect by chance, given how often each rater uses each category. In screening, where most records are excluded, chance agreement is high, so percent agreement can be 96% while kappa is a more modest 0.77. Report both.

### When should I use Fleiss' kappa instead of Cohen's kappa?

Use Cohen's kappa when the same two raters judge every item. Use Fleiss' kappa when three or more raters judge each item, or when different raters judge different items but each item gets the same number of ratings. Krippendorff's alpha is the more flexible choice when ratings are missing or the data are ordinal or interval.

### How do you report kappa in a systematic review?

State how many reviewers screened each record, whether they worked independently, the stage (title and abstract or full text), the number of records, percent agreement, Cohen's kappa with its 95% confidence interval, and how disagreements were resolved. For example: two reviewers independently screened 400 records; agreement was 96.0% (kappa 0.77, 95% CI 0.66 to 0.88).

### Can Cohen's kappa be negative?

Yes. A negative kappa means the raters agreed less often than chance would predict, which usually points to a real problem: different readings of the eligibility criteria, swapped codes, or one rater misunderstanding the task. Stop, compare the disagreeing records together, clarify the criteria with examples, and pilot again before screening the rest.

## Next steps

- Feed your screening counts into the figure: [how to make a PRISMA flow diagram](/blog/how-to-make-a-prisma-flow-diagram).
- Get the search right before you screen: [systematic review search strategy](/blog/systematic-review-search-strategy).
- Choose the right statistic for your other analyses: [which statistical test to use](/blog/which-statistical-test-to-use).
- Back to the pillar: [what is a systematic review](/blog/what-is-a-systematic-review).

## Sources

1. Lefebvre, C., Glanville, J., Briscoe, S., et al. Chapter 4: Searching for and selecting studies. In Higgins, J. P. T., et al. (Eds.), *Cochrane Handbook for Systematic Reviews of Interventions*. Cochrane. https://training.cochrane.org/handbook/current/chapter-04
2. Page, M. J., McKenzie, J. E., Bossuyt, P. M., et al. (2021). The PRISMA 2020 statement: an updated guideline for reporting systematic reviews. *BMJ, 372*, n71. https://doi.org/10.1136/bmj.n71
3. Cohen, J. (1960). A coefficient of agreement for nominal scales. *Educational and Psychological Measurement, 20*(1), 37–46. https://doi.org/10.1177/001316446002000104
4. McHugh, M. L. (2012). Interrater reliability: the kappa statistic. *Biochemia Medica, 22*(3), 276–282. https://doi.org/10.11613/BM.2012.031
5. Landis, J. R., & Koch, G. G. (1977). The measurement of observer agreement for categorical data. *Biometrics, 33*(1), 159–174. https://doi.org/10.2307/2529310
6. Fleiss, J. L. (1971). Measuring nominal scale agreement among many raters. *Psychological Bulletin, 76*(5), 378–382. https://doi.org/10.1037/h0031619
7. Hayes, A. F., & Krippendorff, K. (2007). Answering the call for a standard reliability measure for coding data. *Communication Methods and Measures, 1*(1), 77–89. https://doi.org/10.1080/19312450709336664
8. Krippendorff, K. (2018). *Content Analysis: An Introduction to Its Methodology* (4th ed.). SAGE. <!-- VERIFY: page reference for the α ≥ .800 / .667 guidance (Chapter 12 in the 4th edition) -->
