---
title: "How to Write a Hypothesis: Null, Alternative and Examples"
slug: "how-to-write-a-hypothesis"
description: "How to write a hypothesis from your research question: null and alternative forms, directional or not, five examples by field and the test each one needs."
primary_keyword: "how to write a hypothesis"
secondary_keywords: ["statistical test of hypothesis", "null and alternative hypothesis", "hypothesis examples", "statistical test hypothesis", "directional hypothesis", "research hypothesis"]
cluster: "J. Planning a study and thesis"
pillar: "/blog/how-to-write-a-research-question"
author: "Mubarak"
compares_tools: false
published: "2026-11-12"
updated: "2026-11-12"
faq:
  - q: "What is a null hypothesis?"
    a: "The null hypothesis (H0) is the statement that there is no effect, no difference or no relationship in the population. It is the statement a statistical test checks your data against. For example: 'Mean exam scores do not differ between flipped and traditional classes.' A small p-value means your data would be unusual if H0 were true, so you reject it. You never prove the null; you either reject it or fail to reject it."
  - q: "What is the difference between a directional and a non-directional hypothesis?"
    a: "A directional hypothesis predicts which way the effect goes ('group A will score higher than group B'). A non-directional hypothesis predicts only that there is a difference or relationship, in either direction. Use a directional hypothesis only when theory or strong earlier evidence points one way, and decide before you collect data. The choice sets whether the test is one-tailed or two-tailed."
  - q: "Does qualitative research have a hypothesis?"
    a: "Usually not. Qualitative studies explore how people experience or explain something, so they start with open research questions rather than predictions. Some qualitative work ends by proposing hypotheses or a theory for later testing, as in grounded theory. Mixed-methods studies often have hypotheses for the quantitative strand and open questions for the qualitative strand. Do not invent a hypothesis for a study that does not test one."
  - q: "How many hypotheses should a thesis have?"
    a: "As many as your research questions need, and no more. A master's study often has one to three, a PhD may have more spread across chapters. Each hypothesis should map to one sub-question, one measured outcome and one planned test. Many tests on the same data raise the chance of a false positive, so keep the list short and say which hypotheses are primary."
  - q: "Can a hypothesis be proven?"
    a: "No. A statistical test can give evidence against the null hypothesis, but it cannot prove the alternative. Write 'the results support the hypothesis' or 'the hypothesis was not supported', not 'proved'. Report the effect size and confidence interval with the p-value, because a p-value alone does not tell the reader how large or important the effect is."
---

# How to write a hypothesis, with the null form and the test it needs

*Last updated: 12 November 2026*

To write a hypothesis, take your research question and turn it into a testable prediction about a specific population and a measurable outcome. Then write it twice: as the null hypothesis (H0: no difference or relationship) and the alternative hypothesis (H1: a difference or relationship, with or without a direction). The variables in it decide which statistical test you run.

This guide is for students and researchers planning a quantitative or mixed-methods study. It follows on from our hub guide on [how to write a research question](/blog/how-to-write-a-research-question).

## What is a hypothesis in research?

**A research hypothesis is a testable prediction about the relationship between two or more variables in a defined population, derived from theory or earlier evidence.** It is narrower than a research question: the question asks, the hypothesis predicts an answer you can check with data.

A good hypothesis has four parts:

1. **A population**: who or what it applies to.
2. **An independent variable**: the group, condition or predictor.
3. **A dependent variable**: the outcome you measure.
4. **A predicted relationship**: a difference, an association, or a direction.

If you cannot name all four, go back to the question. Our [research question guide](/blog/how-to-write-a-research-question) shows how to narrow one with PICO.

## What are the null and alternative hypotheses?

**The null hypothesis (H0) states that there is no effect, difference or relationship; the alternative hypothesis (H1 or Ha) states that there is one.** A statistical test always checks the data against the null. NIST's engineering statistics handbook describes the null as the statement being tested and the alternative as what you accept if the null is rejected [1].

| | Null hypothesis (H0) | Alternative hypothesis (H1) |
| --- | --- | --- |
| States | No difference or no relationship | A difference or relationship exists |
| Written as (two groups) | Mean A = mean B | Mean A ≠ mean B (or A > B) |
| Written as (correlation) | Correlation = 0 | Correlation ≠ 0 (or > 0) |
| What the test does | Asks how unusual your data would be if H0 were true | Is supported when H0 is rejected |
| You conclude | "Failed to reject H0" | "Results support H1" |

A p-value does not tell you the probability that your hypothesis is true. The American Statistical Association's statement on p-values says it measures how incompatible the data are with a specified statistical model, and that a p-value alone is not a good measure of evidence [2]. Report the effect size and its confidence interval next to it.

## Directional or non-directional: which should you write?

**A directional hypothesis predicts which way the effect goes; a non-directional hypothesis predicts only that there is a difference.** Directional hypotheses are tested one-tailed, non-directional ones two-tailed [1].

- Use **non-directional** by default. It is the safer choice and what most examiners expect.
- Use **directional** only when theory or strong prior evidence points one way, and fix the choice before you see any data. Switching to one-tailed after seeing results is a reporting fault.

Example (illustrative):

- Non-directional: "Job satisfaction differs between developers who work remotely three or more days a week and those who work remotely fewer days."
- Directional: "Developers who work remotely three or more days a week report higher job satisfaction than those who work remotely fewer days."

## How to write a hypothesis in five steps

1. **Start from one research question** or sub-question. One question can give one hypothesis; a broad question may give two or three.
2. **Name the variables and how you will measure them.** "Stress" is a concept; "score on the 10-item Perceived Stress Scale" is a variable.
3. **State the predicted relationship** in one sentence, in the present or future tense: "X will be associated with higher Y in population Z."
4. **Write the null and alternative forms.** Keep the wording parallel so a reader sees exactly what changes.
5. **Pick the test and check the sample size.** The variable types decide the test (see the table below). Then calculate how many participants you need for adequate power.

## Hypothesis examples from five fields

These examples were written for this guide. Each shows the hypothesis, its null form and the test the variables call for.

### Health: falls prevention

- **Question:** Does a 12-week balance program reduce falls in adults aged 65 and over?
- **H1:** The proportion of participants who fall in the following 12 months will differ between the balance program group and the usual-care group.
- **H0:** The proportion who fall does not differ between groups.
- **Variables:** group (two categories) and fell yes or no (two categories).
- **Test:** chi-square test of independence (or Fisher's exact test if expected counts are small).

### Education: flipped classroom

- **H1:** Mean final exam scores will differ between students taught with a flipped classroom and students taught with lectures.
- **H0:** Mean final exam scores do not differ between the two groups.
- **Variables:** group (two independent categories) and exam score (continuous, 0 to 100).
- **Test:** independent samples t-test (Welch's version if group variances differ), or Mann-Whitney U if scores are badly skewed.

### Business: remote work and satisfaction

- **H1:** The number of remote days per week is positively correlated with job satisfaction among software developers.
- **H0:** There is no correlation between remote days and job satisfaction (r = 0).
- **Variables:** two continuous or near-continuous measures.
- **Test:** Pearson correlation, or Spearman's rank correlation if the relationship is monotonic but not linear. Add a regression if you want to control for tenure or salary.

### Engineering: concrete mix design

- **H1:** Mean 28-day compressive strength differs across three mix designs (0%, 10% and 20% fly ash replacement).
- **H0:** Mean 28-day compressive strength is the same for all three mixes.
- **Variables:** mix (three categories) and strength in MPa (continuous).
- **Test:** one-way ANOVA, followed by post hoc comparisons if H0 is rejected. Use Kruskal-Wallis if assumptions fail.

### Psychology: a before-and-after design

- **H1:** Scores on the Perceived Stress Scale will be lower after an 8-week mindfulness course than before it, in the same participants.
- **H0:** Mean stress scores do not differ before and after the course.
- **Variables:** time (two paired measures) and stress score.
- **Test:** paired t-test, or Wilcoxon signed-rank if the differences are not roughly normal. This one is directional, which is defensible only if earlier trials point clearly one way.

## How does your hypothesis decide the statistical test?

**The statistical test of a hypothesis is chosen by the type of outcome variable, the number of groups, and whether the measurements are independent or paired.** Write the hypothesis first and the test follows.

| Hypothesis compares | Outcome type | Groups or design | Usual test | Common alternative |
| --- | --- | --- | --- | --- |
| Two group means | Continuous | 2 independent groups | Independent t-test (Welch) | Mann-Whitney U |
| Before and after | Continuous | Same people twice | Paired t-test | Wilcoxon signed-rank |
| Three or more means | Continuous | 3+ independent groups | One-way ANOVA | Kruskal-Wallis |
| Two proportions or categories | Categorical | 2+ groups | Chi-square | Fisher's exact (small counts) |
| A relationship | Two continuous variables | One group | Pearson correlation | Spearman correlation |
| Predicting an outcome | Continuous | One or more predictors | Linear regression | |
| Predicting a yes or no outcome | Binary | One or more predictors | Logistic regression | |

For the full decision guide, with assumptions, see [which statistical test to use](/blog/which-statistical-test-to-use) and [t-test vs ANOVA vs chi-square](/blog/t-test-vs-anova-vs-chi-square). <!-- LINK: /tools/statistical-test-chooser when L31 ships -->

## Common mistakes when writing a hypothesis

- **Untestable wording.** "Social media is bad for teenagers" has no measure. Rewrite it with a variable you can score.
- **Two predictions in one.** "Training will improve speed and accuracy" is two hypotheses. Split them, so each gets its own test.
- **Hypotheses for a descriptive question.** "What proportion of nurses report burnout?" needs an estimate with a confidence interval, not a hypothesis.
- **Writing "prove".** Tests support or fail to support. They do not prove.
- **No priority order.** APA's reporting standards for quantitative research ask authors to separate primary, secondary and exploratory hypotheses [4]. Decide which is which before you collect data.
- **No power check.** A study too small to detect a realistic effect will often fail to reject H0 even when the effect is real. See [statistical power and sample size](/blog/statistical-power-and-sample-size).

## Does qualitative research have a hypothesis?

**Most qualitative research does not test a hypothesis; it answers open research questions about experiences, meanings and processes.** Some qualitative designs, such as grounded theory, end with propositions that later studies can test. In mixed-methods work, write hypotheses for the quantitative strand only. APA's reporting standards for qualitative research describe stating research goals and questions, not hypotheses [3].

## Write and test hypotheses in AI for Research

The **Hypotheses** module in the Thesis Suite takes your research question and drafts three to five testable hypotheses (3 credits). Each comes with its variables (independent, dependent, controls), the expected direction with cited papers, how to test it, and the null hypothesis. <!-- LINK: /tools/hypothesis-generator when L28 ships -->

1. Write the question first with the **Research question** module (3 credits) or by hand.
2. Run **Hypotheses** and keep only the predictions you can measure in your setting.
3. Check the prediction's direction against the evidence with **Deep Research** (Summary 1 credit, Deep 15 credits). The consensus line shows how many of the cited studies that test the question support it.
4. When the data are in, open **Data Lab** (free, in the browser). Upload a CSV, use **Which test?** to confirm the test and its assumptions, then run the Welch or paired t-test, Mann-Whitney U, one-way ANOVA, Pearson correlation, chi-square or linear regression. Power and sample size for t-tests and two proportions are also free. The [data analysis tool](/tools/data-analysis) is the public version.
5. An AI results section written from the computed numbers costs 2 credits.

<!-- SCREENSHOT: Data Lab Which test? chooser showing a recommended test with its assumptions and APA reporting template -->

Limits: Data Lab does not run Wilcoxon signed-rank, Kruskal-Wallis, Fisher's exact, Spearman or logistic regression. Run those in R, SPSS, jamovi or JASP. The free plan includes 45 credits a month; see [pricing](/pricing).

## FAQ

### What is a null hypothesis?

The null hypothesis (H0) is the statement that there is no effect, no difference or no relationship in the population. It is the statement a statistical test checks your data against. For example: 'Mean exam scores do not differ between flipped and traditional classes.' A small p-value means your data would be unusual if H0 were true, so you reject it. You never prove the null; you either reject it or fail to reject it.

### What is the difference between a directional and a non-directional hypothesis?

A directional hypothesis predicts which way the effect goes ('group A will score higher than group B'). A non-directional hypothesis predicts only that there is a difference or relationship, in either direction. Use a directional hypothesis only when theory or strong earlier evidence points one way, and decide before you collect data. The choice sets whether the test is one-tailed or two-tailed.

### Does qualitative research have a hypothesis?

Usually not. Qualitative studies explore how people experience or explain something, so they start with open research questions rather than predictions. Some qualitative work ends by proposing hypotheses or a theory for later testing, as in grounded theory. Mixed-methods studies often have hypotheses for the quantitative strand and open questions for the qualitative strand. Do not invent a hypothesis for a study that does not test one.

### How many hypotheses should a thesis have?

As many as your research questions need, and no more. A master's study often has one to three, a PhD may have more spread across chapters. Each hypothesis should map to one sub-question, one measured outcome and one planned test. Many tests on the same data raise the chance of a false positive, so keep the list short and say which hypotheses are primary.

### Can a hypothesis be proven?

No. A statistical test can give evidence against the null hypothesis, but it cannot prove the alternative. Write 'the results support the hypothesis' or 'the hypothesis was not supported', not 'proved'. Report the effect size and confidence interval with the p-value, because a p-value alone does not tell the reader how large or important the effect is.

## Next steps

- Start from a sharper question: [how to write a research question](/blog/how-to-write-a-research-question).
- Choose the test for each hypothesis: [which statistical test to use](/blog/which-statistical-test-to-use).
- Describe the design and analysis plan: [how to write a methodology chapter](/blog/how-to-write-a-methodology-chapter).
- Ground your predictions in theory: [theoretical vs conceptual framework](/blog/theoretical-vs-conceptual-framework).

## Sources

1. NIST/SEMATECH. *e-Handbook of Statistical Methods*, section 7.1.3: What are statistical tests? https://www.itl.nist.gov/div898/handbook/prc/section1/prc13.htm
2. Wasserstein, R. L., & Lazar, N. A. (2016). The ASA's statement on p-values: context, process, and purpose. *The American Statistician, 70*(2), 129–133. https://doi.org/10.1080/00031305.2016.1154108
3. Levitt, H. M., Bamberg, M., Creswell, J. W., Frost, D. M., Josselson, R., & Suárez-Orozco, C. (2018). Journal article reporting standards for qualitative primary, qualitative meta-analytic, and mixed methods research in psychology. *American Psychologist, 73*(1), 26–46. https://doi.org/10.1037/amp0000151 <!-- VERIFY: confirm JARS-Qual wording on research goals/questions rather than hypotheses -->
4. Appelbaum, M., Cooper, H., Kline, R. B., Mayo-Wilson, E., Nezu, A. M., & Rao, S. M. (2018). Journal article reporting standards for quantitative research in psychology. *American Psychologist, 73*(1), 3–25. https://doi.org/10.1037/amp0000191
