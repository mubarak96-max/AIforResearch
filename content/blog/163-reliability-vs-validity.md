---
title: "Reliability vs Validity: Types, Examples and Thresholds"
slug: "reliability-vs-validity"
description: "Reliability vs validity explained with the target analogy: every type of each, how to measure and report them, the usual thresholds and their sources, with examples."
primary_keyword: "reliability vs validity"
secondary_keywords: ["reliability and validity in research", "types of reliability", "types of validity", "test-retest reliability", "internal consistency", "cronbach's alpha", "construct validity", "criterion validity", "internal vs external validity"]
cluster: "U. Research methods and design"
pillar: "/blog/types-of-research-design"
author: "Mubarak"
compares_tools: false
published: "2026-11-14"
updated: "2026-11-14"
faq:
  - q: "What is the difference between reliability and validity?"
    a: "Reliability is whether a measure gives consistent results: the same score on a retest, from a second rater, or across items that should agree. Validity is whether the scores mean what you claim, so they support the conclusions you draw. A bathroom scale that always reads 2 kg heavy is reliable but not valid. You need reliability first, but it does not prove validity."
  - q: "Can a measure be reliable but not valid?"
    a: "Yes. A measure can give the same answer every time and still measure the wrong thing, or be biased by a fixed amount. A typing-speed test used to select managers may be highly reliable but say little about management skill. The reverse does not hold well: a measure with poor reliability is full of random error, so its scores cannot correlate strongly with anything, which limits its validity."
  - q: "What is a good Cronbach's alpha?"
    a: "Values of 0.70 or above are the usual minimum for research use, following Nunnally, with 0.80 or above preferred and 0.90 or more expected when scores are used to make decisions about individuals. Very high values, above about 0.95, can mean redundant items rather than a better scale. Alpha also rises with the number of items, so report the item count with it."
  - q: "How do you measure test-retest reliability?"
    a: "Give the same measure to the same people twice, with an interval long enough that they forget their answers but short enough that the trait has not changed, often one to four weeks. Then calculate an intraclass correlation coefficient (ICC) for continuous scores, or Cohen's kappa for categories. Report the interval, the sample size, the ICC model and its 95% confidence interval."
  - q: "What is the difference between internal and external validity?"
    a: "Internal validity is whether a study's design lets you conclude that the independent variable caused the change in the outcome, rather than a confounder, selection or attrition. External validity is whether the result holds for other people, settings and times. A tightly controlled lab experiment often has high internal validity and limited external validity; a large observational study often has the opposite profile."
---

# Reliability vs validity: types, examples and how to report them

*Last updated: 14 November 2026*

Reliability is whether a measure gives consistent results; validity is whether those results measure what you intend and support the conclusions you draw. A measure can be reliable without being valid, like a scale that always reads 2 kg heavy. But a measure with poor reliability cannot be very valid, because random error weakens every relationship it is part of.

This guide covers the four main types of reliability and the main kinds of validity, how to measure each, the thresholds people use and where they come from, and what to write in a methods section. It is part of our series on [types of research design](/blog/types-of-research-design). If you have not yet decided how to measure each variable, start with [operational definitions](/blog/operational-definition-of-variables), which this guide builds on.

## What is the difference between reliability and validity?

**Reliability is about consistency; validity is about meaning.** A reliable measure gives the same result under the same conditions. A valid measure gives results you can interpret the way you claim.

| | Reliability | Validity |
| --- | --- | --- |
| Question it answers | Do I get the same result again? | Am I measuring the right thing, and can I trust the conclusion? |
| Main enemy | Random error | Systematic error (bias) and wrong construct |
| How it is shown | Correlations between repeated measures, raters or items | Accumulated evidence: content, structure, relations to other measures, consequences |
| Typical statistics | ICC, Cohen's kappa, Cronbach's alpha, McDonald's omega | Correlations with criteria, factor analysis, sensitivity and specificity, expert ratings |
| Can be high when the other is low? | Yes, a biased but consistent measure | Not for long: low reliability caps validity |

In classical test theory, a measure's correlation with any criterion cannot exceed the square root of its reliability [3]. A scale with reliability 0.49 can correlate at most 0.70 with anything, however good the criterion. That is why you report reliability first.

## The target analogy

**Picture each measurement as a shot at a target, where the bullseye is the true value of the thing you want to measure.**

| Pattern of shots | Reliable? | Valid? | Example (illustrative) |
| --- | --- | --- | --- |
| Tight group on the bullseye | Yes | Yes | A calibrated blood pressure monitor used as instructed |
| Tight group away from the bullseye | Yes | No | A scale that always reads 2 kg heavy |
| Shots scattered around the bullseye | No | Only on average | A one-item mood rating that swings from day to day |
| Shots scattered away from the bullseye | No | No | A poorly translated questionnaire answered in a rush |

The third row is debated: the average is on target, which may do for a group mean, but any single person's score is poor.

## What are the types of reliability?

**The four main types are test-retest, inter-rater, internal consistency and parallel forms reliability.** Each answers a different question about where the error in a score comes from.

| Type | Source of error it checks | Design | Usual statistic |
| --- | --- | --- | --- |
| Test-retest | Change over time | Same people, same measure, two occasions | ICC (continuous); kappa (categories) |
| Inter-rater | Differences between observers | Two or more raters score the same cases | Cohen's or Fleiss' kappa; ICC |
| Internal consistency | Differences between items | One administration of a multi-item scale | Cronbach's alpha; McDonald's omega |
| Parallel forms | Differences between versions | Same people take form A and form B | Correlation between forms |

### Test-retest reliability

**Test-retest reliability is the agreement between scores from the same people measured twice under the same conditions.** Too short an interval and people remember their answers; too long and the trait changes. One to four weeks is common for stable traits.

Use an intraclass correlation coefficient (ICC), not Pearson's r. If everyone scores 5 points higher the second time, r can still be 1.0, while an absolute-agreement ICC will drop. Koo and Li suggest reading ICC values below 0.50 as poor, 0.50 to 0.75 as moderate, 0.75 to 0.90 as good and above 0.90 as excellent, and they stress that you must report which ICC model, type and definition you used [5].

**Example (illustrative), engineering:** a team measures surface roughness on 30 machined parts twice, a week apart, with the same profilometer and operator. ICC(2,1) for absolute agreement = 0.93, 95% CI 0.86 to 0.97. On Koo and Li's scale, the lower bound of 0.86 sits in the "good" range, so they report reliability as good to excellent.

### Inter-rater reliability

**Inter-rater reliability is how far two or more independent raters give the same score to the same cases.** Use Cohen's kappa for two raters and categories, Fleiss' kappa or Krippendorff's alpha for more raters, and an ICC for continuous ratings. We cover the calculation, the confidence interval and the Landis and Koch labels in our [Cohen's kappa guide](/blog/cohens-kappa-inter-rater-reliability), so we do not repeat them here.

**Example (illustrative), education:** two teachers grade 60 essays with a 4-level rubric. Percent agreement is 82%, but weighted kappa is 0.71, because some agreement would happen by chance. Report the kappa, not only the percent.

### Internal consistency and Cronbach's alpha

**Internal consistency is how strongly the items of one scale agree with each other, and Cronbach's alpha is its most used index** [1]. For a scale with k items:

> α = k / (k − 1) × (1 − sum of item variances / variance of the total score)

**Worked example (illustrative), business:** a 4-item job-satisfaction scale is given to 150 employees. The item variances are 1.0, 1.2, 0.8 and 1.0, which sum to 4.0. The variance of the total score is 10.0.

- α = 4 / 3 × (1 − 4.0 / 10.0)
- α = 1.333 × 0.60
- α = 0.80

Three things about alpha catch people out:

1. **It is not evidence that the scale measures one thing.** A scale with two separate factors can still reach a high alpha if it has enough items. Check the structure with factor analysis.
2. **It rises with the number of items.** Twenty loosely related items can beat five closely related ones. Report k with alpha.
3. **It assumes every item measures the construct equally well** (tau-equivalence). When that does not hold, alpha underestimates reliability, and McDonald's omega is a better estimate [7].

Reverse-score negatively worded items before you calculate alpha. A reversed item left unscored will pull alpha down, sometimes below zero.

**Split-half reliability** is an older relative: split the items into two halves, correlate the half scores, then correct up to full length with the Spearman-Brown formula, 2r / (1 + r). A half-test correlation of 0.70 gives 2 × 0.70 / 1.70 = 0.82 for the full scale. Alpha is the average of all possible split halves, which is why it replaced this method for most uses [1].

### Parallel forms reliability

**Parallel forms reliability is the correlation between two versions of a test built to the same specification.** You need it when people must be tested more than once and you do not want them to remember the items, as with pre-test and post-test versions of an exam.

**Example (illustrative), health:** two 20-word recall lists for a memory study are given to 80 adults in random order on the same day. The correlation between the two forms is 0.84, and the means differ by 0.3 words, so the forms can be used interchangeably.

## What are the types of validity?

**Validity is now treated as one idea, the degree to which evidence and theory support the interpretation of scores for a given use, shown through several kinds of evidence** [2], [6]. The traditional labels are still useful as a checklist of evidence to collect.

| Type | Question it answers | How it is shown |
| --- | --- | --- |
| Face validity | Does it look like it measures the concept, to the people taking it? | Feedback from participants; cognitive interviews |
| Content validity | Do the items cover all parts of the concept, and nothing else? | Expert panel ratings; content validity ratio or index |
| Construct validity | Does it behave as theory predicts? | Factor analysis; convergent and discriminant correlations; known-groups comparisons |
| Criterion validity: concurrent | Does it agree with an accepted standard measured at the same time? | Correlation with the standard; sensitivity and specificity |
| Criterion validity: predictive | Does it predict a later outcome? | Correlation or regression with the future outcome; AUC |

### Face validity

**Face validity is whether a measure appears, on its face, to measure what it claims.** It is the weakest evidence, but a questionnaire that looks irrelevant gets careless answers. Check it with a few think-aloud interviews.

### Content validity

**Content validity is whether the items cover the full domain of the concept.** A "digital literacy" test with only spreadsheet questions misses search, safety and communication. Build a blueprint of the domain first, then ask a panel of experts to rate each item.

Lawshe's content validity ratio scores each item from how many experts call it "essential" [8]. The content validity index (CVI) uses relevance ratings on a 4-point scale. Polit and Beck recommend an item-level CVI of at least 0.78 with six or more experts, and a scale-level average of at least 0.90 [9].

### Construct validity

**Construct validity is whether scores behave the way the theory of the construct predicts.** Cronbach and Meehl set out the idea in 1955 [10]. You show it in three main ways:

- **Structure.** Exploratory or confirmatory factor analysis shows whether items group as intended.
- **Convergent and discriminant evidence.** Scores should correlate strongly with measures of the same construct and weakly with measures of different ones. Campbell and Fiske's multitrait-multimethod matrix is the classic design [11].
- **Known groups.** Groups that theory says differ should score differently. A burnout scale should give higher scores in staff on long night rotations than in staff on regular day shifts.

**Example (illustrative), social science:** a new civic trust scale correlates 0.62 with an existing trust-in-government scale (convergent) and 0.12 with extraversion (discriminant).

### Criterion validity: concurrent and predictive

**Criterion validity is how well scores agree with a trusted outside measure, either at the same time (concurrent) or in the future (predictive).**

- **Concurrent (illustrative, health):** a 2-minute depression screener is compared with a structured clinical interview done the same week, in 200 primary care patients. At the cut-off of 10, sensitivity is 0.85 and specificity is 0.82. Any such tool is a screening aid; a qualified clinician makes the diagnosis.
- **Predictive (illustrative, education):** scores on a first-year placement test correlate 0.48 with grade point average at the end of the second year.

If the criterion is itself unreliable, your validity coefficient will look worse than it is.

### Internal vs external validity

**Internal validity is whether the design supports a causal conclusion; external validity is whether the result generalizes beyond the study.** These describe a study, not an instrument, and come from Campbell's tradition of experimental design [4].

| | Internal validity | External validity |
| --- | --- | --- |
| Asks | Did X cause the change in Y in this study? | Does the result hold for other people, places and times? |
| Main threats | Confounding, selection, attrition, history, maturation, testing effects, regression to the mean | Unrepresentative samples, artificial settings, a narrow time window |
| Strengthened by | Random assignment, control groups, blinding, low drop-out | Probability sampling, real-world settings, replication across sites |

There is often a trade-off. A [controlled experiment](/blog/controlled-experiment) gives strong internal validity, and a probability sample (see [probability vs non-probability sampling](/blog/probability-vs-non-probability-sampling)) supports external validity. Statistical conclusion validity, whether the analysis was right and adequately powered, is the third partner; see [statistical power and sample size](/blog/statistical-power-and-sample-size).

## What are the usual thresholds?

**Thresholds are conventions, not laws. Always name the source of the cut-off you use.**

| Statistic | Common threshold | Source |
| --- | --- | --- |
| Cronbach's alpha | ≥ 0.70 for research; ≥ 0.80 preferred; ≥ 0.90 for decisions about individuals | Nunnally and Bernstein [3] <!-- VERIFY: exact wording and page of the 0.70 / 0.80 / 0.90 guidance in Nunnally & Bernstein (1994) --> |
| Cronbach's alpha, upper end | Above about 0.90 to 0.95 may mean redundant items | Tavakol and Dennick [12] |
| ICC | < 0.50 poor; 0.50 to 0.75 moderate; 0.75 to 0.90 good; > 0.90 excellent | Koo and Li [5] |
| Cohen's kappa | 0.61 to 0.80 substantial; 0.81+ almost perfect | Landis and Koch; see our [kappa guide](/blog/cohens-kappa-inter-rater-reliability) |
| Item-level CVI | ≥ 0.78 (six or more experts) | Polit and Beck [9] |
| Convergent validity correlation | No universal cut-off; state the value you predicted in advance | Campbell and Fiske [11] |

Judge each value with its confidence interval, not only the point estimate. An ICC of 0.80 with a 95% CI from 0.55 to 0.92 is much less convincing than one from 0.75 to 0.84.

## How do you report reliability and validity in a methods section?

**For each instrument, give the published evidence, then the reliability you found in your own sample.** Reliability belongs to scores in a sample, not to a test, so a value from the original validation study does not carry over automatically.

A checklist for each measure:

1. Name, author, year and number of items, with the scoring and the range.
2. The validation evidence from earlier studies, with citations, including the population it was validated in.
3. Any translation or adaptation, and how it was checked.
4. Reliability in your sample: the statistic, its value, its 95% CI and the sample size it was based on.
5. For raters: how they were trained, how many cases were double-scored, and the agreement statistic.

**Example write-up (illustrative):** "Job satisfaction was measured with a 4-item scale (scored 4 to 20; higher is more satisfied). In the original validation with 1,200 retail staff, scores correlated 0.58 with turnover intention [citation]. In our sample (n = 150), Cronbach's α = 0.80, 95% CI 0.74 to 0.85. Two coders independently coded 20% of the open-ended answers (n = 30); Cohen's κ = 0.76."

## Common mistakes

- **Treating a high alpha as proof of validity.** Alpha says items agree with each other, not that they measure the right construct.
- **Using Pearson's r for test-retest or rater agreement.** It ignores systematic shifts; use an ICC or kappa.
- **Quoting only the original study's reliability.** Report it in your sample too.
- **Saying an instrument "is valid".** Say what evidence supports which use in which population.
- **Leaving out the ICC model,** without which "ICC = 0.85" cannot be interpreted.

## How to check reliability and validity with AI for Research

AI for Research can help you find validation evidence and calculate the statistics. Nothing here replaces reading the validation papers yourself.

1. **Find validation studies (0 credits).** In [Find Papers](/features/paper-search), search for the instrument's name with "validation" or "psychometric properties", and filter by year and peer-reviewed only. Open papers in [Chat with PDF](/features/chat-with-pdf) to pull out the reported alpha, ICC and sample.
2. **Ask a cited question.** [Deep Research](/tools/deep-research) answers questions such as "What evidence supports the construct validity of [scale] in adolescents?" with citations. A Summary run costs 1 credit.
3. **Run the statistics.** The free [data analysis tool](/tools/data-analysis) runs descriptives, correlations, t-tests and chi-square from a CSV in your browser, which covers convergent and discriminant correlations. Cronbach's alpha is in **Data Lab**, the statistics workspace, under "Scales and surveys"; its statistics cost 0 credits. Neither computes an ICC or McDonald's omega, so use R (the psych package), jamovi or SPSS for those.
4. **Write it up.** The **Operationalising variables** module in the Thesis Suite (3 credits) drafts a table of instruments with their reliability and validity evidence from the literature it finds; check every value in the original source.

The Free plan includes 45 credits a month; search and the free tools cost nothing. See [pricing](/pricing). For clinical instruments, any cut-off or diagnostic claim needs review by a qualified professional before it is used with patients.

## FAQ

### What is the difference between reliability and validity?

Reliability is whether a measure gives consistent results: the same score on a retest, from a second rater, or across items that should agree. Validity is whether the scores mean what you claim, so they support the conclusions you draw. A bathroom scale that always reads 2 kg heavy is reliable but not valid. You need reliability first, but it does not prove validity.

### Can a measure be reliable but not valid?

Yes. A measure can give the same answer every time and still measure the wrong thing, or be biased by a fixed amount. A typing-speed test used to select managers may be highly reliable but say little about management skill. The reverse does not hold well: a measure with poor reliability is full of random error, so its scores cannot correlate strongly with anything, which limits its validity.

### What is a good Cronbach's alpha?

Values of 0.70 or above are the usual minimum for research use, following Nunnally, with 0.80 or above preferred and 0.90 or more expected when scores are used to make decisions about individuals. Very high values, above about 0.95, can mean redundant items rather than a better scale. Alpha also rises with the number of items, so report the item count with it.

### How do you measure test-retest reliability?

Give the same measure to the same people twice, with an interval long enough that they forget their answers but short enough that the trait has not changed, often one to four weeks. Then calculate an intraclass correlation coefficient (ICC) for continuous scores, or Cohen's kappa for categories. Report the interval, the sample size, the ICC model and its 95% confidence interval.

### What is the difference between internal and external validity?

Internal validity is whether a study's design lets you conclude that the independent variable caused the change in the outcome, rather than a confounder, selection or attrition. External validity is whether the result holds for other people, settings and times. A tightly controlled lab experiment often has high internal validity and limited external validity; a large observational study often has the opposite profile.

## Next steps

- Define each variable before you measure it: [operational definition of variables](/blog/operational-definition-of-variables).
- Calculate rater agreement step by step: [Cohen's kappa](/blog/cohens-kappa-inter-rater-reliability).
- Protect internal validity in your design: [controlled experiments](/blog/controlled-experiment) and [independent vs dependent variables](/blog/independent-vs-dependent-variables).
- Protect external validity in your sample: [probability vs non-probability sampling](/blog/probability-vs-non-probability-sampling).
- Write it all into your [methodology chapter](/blog/how-to-write-a-methodology-chapter).

## Sources

1. Cronbach, L. J. (1951). Coefficient alpha and the internal structure of tests. *Psychometrika, 16*(3), 297–334. https://doi.org/10.1007/BF02310555
2. Messick, S. (1995). Validity of psychological assessment: Validation of inferences from persons' responses and performances as scientific inquiry into score meaning. *American Psychologist, 50*(9), 741–749. https://doi.org/10.1037/0003-066X.50.9.741
3. Nunnally, J. C., & Bernstein, I. H. (1994). *Psychometric Theory* (3rd ed.). McGraw-Hill.
4. Shadish, W. R., Cook, T. D., & Campbell, D. T. (2002). *Experimental and Quasi-Experimental Designs for Generalized Causal Inference*. Houghton Mifflin.
5. Koo, T. K., & Li, M. Y. (2016). A guideline of selecting and reporting intraclass correlation coefficients for reliability research. *Journal of Chiropractic Medicine, 15*(2), 155–163. https://doi.org/10.1016/j.jcm.2016.02.012
6. American Educational Research Association, American Psychological Association, & National Council on Measurement in Education. (2014). *Standards for Educational and Psychological Testing*. AERA.
7. McDonald, R. P. (1999). *Test Theory: A Unified Treatment*. Lawrence Erlbaum.
8. Lawshe, C. H. (1975). A quantitative approach to content validity. *Personnel Psychology, 28*(4), 563–575. https://doi.org/10.1111/j.1744-6570.1975.tb01393.x
9. Polit, D. F., & Beck, C. T. (2006). The content validity index: Are you sure you know what's being reported? Critique and recommendations. *Research in Nursing & Health, 29*(5), 489–497. https://doi.org/10.1002/nur.20147 <!-- VERIFY: that the 0.78 item-level and 0.90 scale-level CVI recommendations are stated in this paper (they may be in Polit, Beck & Owen, 2007, Research in Nursing & Health 30(4), 459–467) -->
10. Cronbach, L. J., & Meehl, P. E. (1955). Construct validity in psychological tests. *Psychological Bulletin, 52*(4), 281–302. https://doi.org/10.1037/h0040957
11. Campbell, D. T., & Fiske, D. W. (1959). Convergent and discriminant validation by the multitrait-multimethod matrix. *Psychological Bulletin, 56*(2), 81–105. https://doi.org/10.1037/h0046016
12. Tavakol, M., & Dennick, R. (2011). Making sense of Cronbach's alpha. *International Journal of Medical Education, 2*, 53–55. https://doi.org/10.5116/ijme.4dfb.8dfd
