---
title: "Difference Between Meta-Analysis and Systematic Review"
slug: "systematic-review-vs-meta-analysis"
description: "The difference between meta-analysis and systematic review: aim, method and output compared, when to skip a meta-analysis, and how to read a forest plot."
primary_keyword: "difference between meta analysis and systematic review"
secondary_keywords: ["systematic review versus meta analysis", "systematic review vs meta-analysis", "what is a meta-analysis", "forest plot", "can you do a meta-analysis without a systematic review", "is a meta-analysis quantitative", "synthesis without meta-analysis"]
cluster: "N. Systematic reviews"
pillar: "/blog/what-is-a-systematic-review"
author: "Mubarak"
compares_tools: false
published: "2026-11-12"
updated: "2026-11-12"
faq:
  - q: "What is the main difference between a systematic review and a meta-analysis?"
    a: "A systematic review is the whole method: a set question, a documented search, screening by two reviewers, appraisal and synthesis. A meta-analysis is one optional statistical step inside it that pools the numerical results of two or more studies into a single estimate. Every good meta-analysis of published research sits inside a systematic review, but many systematic reviews contain no meta-analysis."
  - q: "Can you do a meta-analysis without a systematic review?"
    a: "Technically yes, but rarely well. You can pool any set of studies, for example a consortium's own trials. If you pool published studies you picked without a systematic search, the result inherits your selection bias and the precise-looking estimate can be wrong. For a meta-analysis of the literature, journals and Cochrane expect a systematic review around it."
  - q: "Is a meta-analysis quantitative?"
    a: "Yes. A meta-analysis is a quantitative method: it combines effect estimates such as mean differences, odds ratios or risk ratios, weighted by their precision, into a pooled estimate with a confidence interval. Qualitative studies are combined with other methods, such as thematic synthesis or meta-aggregation, in a qualitative evidence synthesis, not a meta-analysis."
  - q: "When should a systematic review not include a meta-analysis?"
    a: "Skip pooling when the studies are too different in population, intervention, comparison or outcome to give a meaningful average, when outcomes are measured in ways that can't be combined, when fewer than two studies report the outcome, or when results point in clearly opposite directions. Use a structured synthesis without meta-analysis and report it with the SWiM guideline."
  - q: "What does a forest plot show?"
    a: "A forest plot shows each study's effect estimate as a square, with a horizontal line for its 95% confidence interval, and the pooled result as a diamond at the bottom. A vertical line marks no effect. Larger squares carry more weight. If a line or the diamond crosses the no-effect line, that result is not statistically significant at the 5% level."
---

# The difference between meta-analysis and systematic review

*Last updated: 12 November 2026*

A systematic review is a complete research method for finding, screening, appraising and combining all studies on one question. A meta-analysis is a statistical technique that pools the numerical results of two or more of those studies into one estimate. A meta-analysis is usually one step inside a systematic review. Many systematic reviews have no meta-analysis, because their studies are too different to pool.

This guide is for students and researchers planning a review or reading one. It is part of our series on [what a systematic review is](/blog/what-is-a-systematic-review).

## What is the difference between meta-analysis and systematic review?

The difference is scope: a systematic review is the whole process, a meta-analysis is one optional analysis within it. The Cochrane Handbook puts it simply: "A systematic review need not contain any meta-analyses" [1].

**A systematic review is a review that uses explicit, systematic methods to collate and synthesize findings of studies that address a clearly formulated question** [2].

**A meta-analysis is the statistical combination of results from two or more separate studies** [1]. PRISMA 2020 describes meta-analysis of effect estimates as a technique "used to synthesise results when study effect estimates and their variances are available, yielding a quantitative summary of results" [2]. The term was coined by Gene Glass in 1976 [4].

| | Systematic review | Meta-analysis |
| --- | --- | --- |
| Aim | Find and appraise all evidence on one question | Produce one pooled estimate of an effect |
| What it is | A research design (a study of studies) | A statistical method |
| Method | Protocol, search, two-reviewer screening, extraction, risk of bias, synthesis | Weight each study's effect by its precision and combine them |
| Data | Any study type, quantitative or qualitative | Numerical effect estimates and their variances |
| Output | Narrative, tables, PRISMA flow diagram, certainty of evidence | Pooled estimate, confidence interval, heterogeneity (I²), forest plot |
| Can stand alone? | Yes | Possible, but biased without a systematic search |
| Reporting | PRISMA 2020, 27 items [2] | Reported inside the review (PRISMA items on synthesis) |

### Is a meta-analysis quantitative?

Yes, always. It works on numbers: mean differences, standardized mean differences, odds ratios, risk ratios or correlations. A systematic review can be quantitative, qualitative or mixed. When the included studies are qualitative, their findings are combined in a qualitative evidence synthesis, using methods such as thematic synthesis, not in a meta-analysis.

## Can you do a meta-analysis without a systematic review?

You can, but only in narrow cases. Pooling your own lab's trials, or the trials of a consortium planned in advance, is a meta-analysis without a literature search. The Cochrane Handbook also describes prospectively planned meta-analyses of series of trials [3].

What you should not do is pool a handful of published studies you happened to find. The pooled estimate will look precise, with a narrow confidence interval, while carrying all the bias of how you chose the studies. If the question is "what does the published evidence show?", the meta-analysis needs a systematic review around it.

## When does a systematic review have no meta-analysis?

A review should not pool when the studies can't sensibly be averaged. Cochrane says meta-analysis should be considered only when participants, interventions, comparisons and outcomes are judged similar enough to give a meaningful answer, and warns that "meta-analyses of very diverse studies can be misleading" [1].

Common reasons a review stops short of pooling:

1. **Clinical diversity.** The studies test different populations or versions of the intervention (a 4-week app versus a 12-month in-person program).
2. **Incompatible outcomes.** Each study measures the outcome on a different scale, or reports only medians, or only p-values.
3. **Too few studies.** One study per outcome gives nothing to pool.
4. **Conflicting directions.** When results point clearly in opposite directions, an average can hide what is happening [1].
5. **High risk of bias.** Pooling only weak studies produces a precise but untrustworthy number.

In those cases the review uses a **synthesis without meta-analysis**: grouping studies, tabulating their effects, and describing the direction and size of effects in a structured way. The SWiM reporting guideline sets out the nine items to report for this kind of synthesis [6].

## What is a forest plot?

**A forest plot is a chart that shows each study's effect estimate and confidence interval on one row, with the pooled meta-analysis result as a diamond at the bottom** [1]. Each study is a square at its point estimate; the size of the square shows its weight; the horizontal line is its 95% confidence interval. A vertical line marks no effect (0 for a mean difference, 1 for a ratio). The diamond's center is the pooled estimate and its width is the pooled confidence interval. If a line or the diamond crosses the no-effect line, that result is not statistically significant at the 5% level.

### A worked example

*This is an invented example.* Four trials compare supervised exercise with usual care for chronic low back pain. The outcome is pain on a 0 to 10 scale at 12 weeks; negative numbers favor exercise.

| Trial | Mean difference | Standard error | 95% CI | Weight (fixed-effect) |
| --- | --- | --- | --- | --- |
| A | -1.2 | 0.5 | -2.18 to -0.22 | 16.6% |
| B | -0.6 | 0.3 | -1.19 to -0.01 | 46.0% |
| C | -0.9 | 0.4 | -1.68 to -0.12 | 25.9% |
| D | 0.1 | 0.6 | -1.08 to 1.28 | 11.5% |
| **Pooled** | **-0.70** | **0.20** | **-1.10 to -0.30** | **100%** |

How the pooled number is calculated, step by step (inverse-variance, fixed-effect):

1. Weight each trial by 1 / SE²: A = 4.00, B = 11.11, C = 6.25, D = 2.78. The total is 24.14.
2. Multiply each mean difference by its weight and add: (-1.2 × 4.00) + (-0.6 × 11.11) + (-0.9 × 6.25) + (0.1 × 2.78) = -16.81.
3. Divide by the total weight: -16.81 / 24.14 = -0.70.
4. The pooled standard error is 1 / √24.14 = 0.20, so the 95% CI is -0.70 ± 1.96 × 0.20, or -1.10 to -0.30.

Read the plot: trial D alone crosses zero and would look like "no effect". Pooled, the evidence suggests about 0.7 points less pain, with an interval that does not cross zero. Whether 0.7 points on a 10-point scale matters to patients is a clinical judgment, not a statistical one.

### Fixed-effect or random-effects?

A fixed-effect model assumes one true effect shared by all studies. A random-effects model assumes the true effects vary between studies and estimates their average [1]. Random-effects gives relatively more weight to small studies and a wider interval when studies disagree. Choose the model in your protocol, not after seeing the results.

### What does I² mean?

**I² is the percentage of the variation across studies that is due to heterogeneity rather than chance** [5]. Cochrane's rough guide: 0% to 40% might not be important, 30% to 60% may be moderate, 50% to 90% may be substantial and 75% to 100% is considerable heterogeneity [1]. The ranges overlap on purpose. Look at the forest plot too: do the intervals overlap, and do studies point the same way?

## Which one do you need?

Choose by the question you are answering and the data you expect:

| Your situation | What to plan |
| --- | --- |
| Effectiveness question, similar trials reporting the same outcome | Systematic review with meta-analysis |
| Effectiveness question, varied designs or outcomes | Systematic review with synthesis without meta-analysis (SWiM) |
| Experiences, views, barriers (qualitative studies) | Systematic review with qualitative evidence synthesis |
| "What research exists on this topic?" | Scoping review, no meta-analysis ([scoping review vs systematic review](/blog/scoping-review-vs-systematic-review)) |
| Pooling your own consortium's trials | Meta-analysis planned in advance, no literature search needed |

Write the decision into your protocol: "If at least two studies report the outcome on comparable scales and are clinically similar, we will pool them in a random-effects meta-analysis; otherwise we will use synthesis without meta-analysis." Reviewers and examiners look for this sentence.

## How to do this in AI for Research

The [Systematic Review workspace](/features/systematic-review) handles the systematic review that a meta-analysis depends on. It has a meta-analysis preset among its eight review types. You and your co-reviewers make the inclusion decisions; the AI only suggests.

- **Search and screen** with builders for PubMed, Europe PMC and OpenAlex (0 credits), plus uploads of RIS, BibTeX, CSV or .nbib exports from databases you search through your library, such as Scopus or Web of Science. AI screening suggestions cost 1 credit per 25 records. Conflicts between reviewers are listed with Cohen's kappa.
- **Extract** effect data into a table with 9 standard columns, custom columns (add "mean difference", "SE", "n per arm") and risk-of-bias fields. AI fills cells from abstracts with the quoted words, 3 credits per 10 studies. Check every number against the full paper: abstracts often omit the variance you need.
- **Report** with a PRISMA 2020 diagram from live counts (0 credits) and export the table as CSV.

<!-- SCREENSHOT: Extraction table with custom columns for mean difference and standard error, an AI-filled cell showing its quoted source text -->

**The honest limit:** the workspace does not run meta-analysis or draw forest plots yet, and Data Lab's free statistics (t-tests, ANOVA, correlation, regression) do not include meta-analysis either. Export the extraction table as CSV and pool it in R with the metafor package [7], in Stata, or in Cochrane's RevMan. The free plan covers one review of up to 50 records; see [pricing](/pricing).

## FAQ

### What is the main difference between a systematic review and a meta-analysis?

A systematic review is the whole method: a set question, a documented search, screening by two reviewers, appraisal and synthesis. A meta-analysis is one optional statistical step inside it that pools the numerical results of two or more studies into a single estimate. Every good meta-analysis of published research sits inside a systematic review, but many systematic reviews contain no meta-analysis.

### Can you do a meta-analysis without a systematic review?

Technically yes, but rarely well. You can pool any set of studies, for example a consortium's own trials. If you pool published studies you picked without a systematic search, the result inherits your selection bias and the precise-looking estimate can be wrong. For a meta-analysis of the literature, journals and Cochrane expect a systematic review around it.

### Is a meta-analysis quantitative?

Yes. A meta-analysis is a quantitative method: it combines effect estimates such as mean differences, odds ratios or risk ratios, weighted by their precision, into a pooled estimate with a confidence interval. Qualitative studies are combined with other methods, such as thematic synthesis or meta-aggregation, in a qualitative evidence synthesis, not a meta-analysis.

### When should a systematic review not include a meta-analysis?

Skip pooling when the studies are too different in population, intervention, comparison or outcome to give a meaningful average, when outcomes are measured in ways that can't be combined, when fewer than two studies report the outcome, or when results point in clearly opposite directions. Use a structured synthesis without meta-analysis and report it with the SWiM guideline.

### What does a forest plot show?

A forest plot shows each study's effect estimate as a square, with a horizontal line for its 95% confidence interval, and the pooled result as a diamond at the bottom. A vertical line marks no effect. Larger squares carry more weight. If a line or the diamond crosses the no-effect line, that result is not statistically significant at the 5% level.

## Next steps

- Start from the method itself: [what is a systematic review](/blog/what-is-a-systematic-review).
- Decide whether your question needs mapping instead: [scoping review vs systematic review](/blog/scoping-review-vs-systematic-review).
- Report the study flow: [how to make a PRISMA flow diagram](/blog/how-to-make-a-prisma-flow-diagram).
- Report screening agreement: [Cohen's kappa for screening](/blog/cohens-kappa-inter-rater-reliability).

## Sources

1. Deeks JJ, Higgins JPT, Altman DG, McKenzie JE, Veroniki AA, Simmonds M (eds). Chapter 10: Analysing data and undertaking meta-analyses. In: Higgins JPT, Thomas J, et al. (eds). *Cochrane Handbook for Systematic Reviews of Interventions*, version 6.5. Cochrane, 2024. https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-10
2. Page MJ, McKenzie JE, Bossuyt PM, et al. The PRISMA 2020 statement: an updated guideline for reporting systematic reviews. *BMJ*. 2021;372:n71. https://doi.org/10.1136/bmj.n71
3. Lasserson TJ, Thomas J, Higgins JPT. Chapter 1: Starting a review. In: Higgins JPT, Thomas J, et al. (eds). *Cochrane Handbook for Systematic Reviews of Interventions*, version 6.5. Cochrane, 2024. https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-01
4. Glass GV. Primary, secondary, and meta-analysis of research. *Educational Researcher*. 1976;5(10):3-8. https://doi.org/10.3102/0013189X005010003
5. Higgins JPT, Thompson SG, Deeks JJ, Altman DG. Measuring inconsistency in meta-analyses. *BMJ*. 2003;327(7414):557-560. https://doi.org/10.1136/bmj.327.7414.557
6. Campbell M, McKenzie JE, Sowden A, et al. Synthesis without meta-analysis (SWiM) in systematic reviews: reporting guideline. *BMJ*. 2020;368:l6890. https://doi.org/10.1136/bmj.l6890
7. Viechtbauer W. Conducting meta-analyses in R with the metafor package. *Journal of Statistical Software*. 2010;36(3). https://doi.org/10.18637/jss.v036.i03
