---
title: "Cohort Study: Prospective vs Retrospective, with Examples"
slug: "cohort-study"
description: "What a cohort study is, prospective vs retrospective designs, how it differs from case-control and cross-sectional studies, relative risk worked out, biases and STROBE."
primary_keyword: "cohort study"
secondary_keywords: ["cohort research", "prospective cohort study", "retrospective cohort study", "cohort vs case-control", "relative risk", "incidence rate", "strobe checklist", "framingham heart study", "loss to follow-up"]
cluster: "U. Research methods and design"
pillar: "/blog/types-of-research-design"
author: "Mubarak"
compares_tools: false
published: "2026-11-14"
updated: "2026-11-14"
faq:
  - q: "What is a cohort study?"
    a: "A cohort study is an observational study that follows a group of people who do not yet have the outcome, classifies them by an exposure such as smoking or shift work, and compares how often the outcome develops in the exposed and unexposed over time. Because exposure is measured before the outcome, it can estimate incidence and relative risk directly, which a case-control study cannot."
  - q: "What is the difference between a prospective and a retrospective cohort study?"
    a: "Both move from exposure to outcome. In a prospective cohort, the researchers recruit people now, measure exposure, and follow them into the future. In a retrospective (historical) cohort, the exposure and outcomes are already recorded, for example in employment or hospital records, and the researchers reconstruct the follow-up from the past to the present. Retrospective cohorts are faster and cheaper but depend on the quality of old records."
  - q: "What is the difference between a cohort study and a case-control study?"
    a: "A cohort study starts with exposure and follows people forward to see who develops the outcome. A case-control study starts with the outcome: it selects people who have it (cases) and people who do not (controls), then looks back at past exposure. Cohorts give incidence and relative risk and suit common outcomes; case-control studies give odds ratios and suit rare outcomes."
  - q: "How do you calculate relative risk in a cohort study?"
    a: "Divide the cumulative incidence in the exposed group by the cumulative incidence in the unexposed group. If 60 of 2,000 exposed people and 30 of 3,000 unexposed people develop the outcome, the risks are 3% and 1%, so the relative risk is 3.0. A relative risk of 1 means no difference, above 1 a higher risk in the exposed, and below 1 a lower risk."
  - q: "What level of evidence is a cohort study?"
    a: "For questions about whether a treatment works, a cohort study ranks below randomized controlled trials, at level 3 in the Oxford CEBM scheme, because confounding can never be fully ruled out. For questions about prognosis, natural history and rare or long-term harms, a well-run cohort is often the best design available, and an inception cohort is the strongest single design for prognosis."
---

# Cohort study: prospective vs retrospective, with worked examples

*Last updated: 14 November 2026*

A cohort study follows a group of people who are free of an outcome, classifies them by an exposure, and compares how often the outcome develops in the exposed and unexposed over time. Prospective cohorts follow people into the future; retrospective cohorts rebuild the same follow-up from existing records. Because exposure comes before outcome, a cohort study measures incidence and relative risk directly.

This guide explains both kinds, how cohorts differ from case-control and cross-sectional studies, how to calculate incidence and relative risk, the biases to plan for, what STROBE asks you to report, and three famous cohorts. It is part of our series on [types of research design](/blog/types-of-research-design). For where cohorts sit in the evidence hierarchy, see [levels of evidence and study types](/blog/levels-of-evidence-and-study-types).

## What is a cohort study?

**A cohort study is an observational design that moves from exposure to outcome: it measures exposure first, then counts new cases of the outcome over a follow-up period.** The researcher does not assign the exposure. People smoke or not, work night shifts or not, live near a highway or not, and the study records what happens.

The word "cohort" comes from a unit of the Roman army, a group that marched together. In research, it means any group defined by a shared characteristic and followed through time: a birth year, an occupation, the residents of a town, or every patient who started a drug in one year.

Cohort studies answer questions such as (all illustrative):

- **Health:** Do adults who sleep under six hours a night develop type 2 diabetes more often over ten years?
- **Education:** Do pupils who repeat a grade leave school without qualifications more often than similar pupils who do not?
- **Business:** Are employees hired through referrals less likely to quit within two years?
- **Engineering:** Do bridges built with one concrete mix need major repairs sooner than those built with another?
- **Social science:** Does childhood exposure to neighborhood violence predict adult unemployment?

The outcome must be absent at the start. If some people already have it, you cannot tell whether exposure came first.

## Prospective vs retrospective cohort studies

**Both types move from exposure to outcome; the difference is whether the follow-up happens after the study starts (prospective) or has already happened in records (retrospective).**

| | Prospective cohort | Retrospective (historical) cohort |
| --- | --- | --- |
| When exposure is measured | At the start of the study, by the researchers | In the past, from existing records |
| When outcomes occur | After the study begins | Before the study begins (mostly) |
| Time and cost | Years to decades; expensive | Months; much cheaper |
| Data quality | Researchers choose the measures and the schedule | Limited to what was recorded, for other purposes |
| Main risks | Loss to follow-up; changes in exposure over time | Missing or inaccurate records; unmeasured confounders |
| Example (illustrative) | Recruit 4,000 new nurses and survey their shift patterns and sleep each year for 15 years | Use 1990 to 2020 payroll records to compare cancer rates in night-shift and day-shift workers |

**Ambidirectional cohorts** combine the two: they reconstruct past exposure from records and continue following the same people forward.

A retrospective cohort is not the same as a case-control study, even though both use the past. A retrospective cohort still starts from exposure groups and counts outcomes in each. A case-control study starts from outcome groups.

## How is a cohort study different from case-control and cross-sectional studies?

**A cohort starts from exposure and follows forward; a case-control study starts from outcome and looks back; a cross-sectional study measures exposure and outcome at the same time.**

| | Cohort | Case-control | Cross-sectional |
| --- | --- | --- | --- |
| Starting point | Exposure (or a whole population) | Outcome: cases and controls | A sample at one point in time |
| Direction | Forward from exposure | Backward from outcome | None, a snapshot |
| Measures | Incidence, relative risk, rate ratio, hazard ratio | Odds ratio | Prevalence, prevalence ratio, odds ratio |
| Shows exposure came first? | Yes | Only if exposure was recorded before onset | No |
| Best for | Common outcomes; several outcomes of one exposure; rare exposures | Rare outcomes; outcomes with long latency | Burden of a condition; planning services; generating hypotheses |
| Main weakness | Slow, costly, loss to follow-up | Recall bias; choosing comparable controls | Cannot tell cause from effect |

A cohort ranks below a randomized trial for questions about treatments, because the groups may differ in ways that are not measured. If you can assign the exposure yourself, consider a [controlled experiment](/blog/controlled-experiment) instead. If you are still choosing a design, our [quantitative, qualitative and mixed methods](/blog/quantitative-qualitative-mixed-methods) guide places these designs in context.

## How do you calculate incidence and relative risk?

**Cumulative incidence (risk) is new cases divided by the number at risk at the start; relative risk is the risk in the exposed divided by the risk in the unexposed.**

### Worked example (illustrative)

A prospective cohort follows 5,000 office workers for five years. At baseline, 2,000 report sitting more than 10 hours a day (exposed) and 3,000 report less (unexposed). None has type 2 diabetes. The numbers are invented for this guide.

| | Developed diabetes | Did not | Total |
| --- | --- | --- | --- |
| Exposed (> 10 h sitting) | 60 | 1,940 | 2,000 |
| Unexposed | 30 | 2,970 | 3,000 |

**Step 1: risk in each group.**

- Risk in exposed = 60 / 2,000 = 0.030 (3.0%)
- Risk in unexposed = 30 / 3,000 = 0.010 (1.0%)

**Step 2: relative risk (risk ratio).**

- RR = 0.030 / 0.010 = **3.0**. The exposed group had three times the five-year risk.

**Step 3: risk difference.**

- RD = 0.030 − 0.010 = 0.020, or 2 extra cases per 100 people over five years.
- Number needed to harm = 1 / 0.020 = 50.

**Step 4: 95% confidence interval for the RR.** Work on the log scale [7].

- SE of ln(RR) = √(1/60 − 1/2,000 + 1/30 − 1/3,000) = √0.04917 = 0.2217
- ln(3.0) = 1.0986
- Lower limit = e^(1.0986 − 1.96 × 0.2217) = e^0.6640 = 1.94
- Upper limit = e^(1.0986 + 1.96 × 0.2217) = e^1.5332 = 4.63
- **RR = 3.0, 95% CI 1.94 to 4.63.** The interval excludes 1, so the data are hard to explain by chance alone. They can still be explained by confounding.

**Report both** the relative and the absolute measure. "Three times the risk" sounds large, but the absolute difference here is 2 percentage points. Readers need both to judge importance.

### Incidence rate and person-time

People rarely stay in a cohort for the same length of time. Some join late, move away or die of other causes. An **incidence rate** divides new cases by the total **person-time** at risk.

Continuing the example (illustrative), the exposed group contributed 9,500 person-years and the unexposed group 14,700:

- Rate in exposed = 60 / 9,500 = 6.3 per 1,000 person-years
- Rate in unexposed = 30 / 14,700 = 2.0 per 1,000 person-years
- Rate ratio = 6.32 / 2.04 = 3.1

When the timing of events matters, cohort studies use survival methods: Kaplan-Meier curves to show the proportion still free of the outcome over time, and Cox regression to estimate a **hazard ratio** adjusted for confounders.

### Why not use an odds ratio?

You can, and logistic regression gives one. Here the odds ratio is (60 / 1,940) / (30 / 2,970) = 3.06, close to the RR of 3.0 because the outcome is rare. When the outcome is common (above about 10%), the odds ratio overstates the relative risk, so in a cohort report the RR or hazard ratio is usually clearer.

## What biases affect cohort studies?

**The two biggest threats are loss to follow-up and confounding; information bias and reverse causation come next.**

| Bias | What happens | Example (illustrative) | How to reduce it |
| --- | --- | --- | --- |
| Loss to follow-up | People leave the study, and those who leave differ in exposure and outcome risk | Heavy drinkers stop answering questionnaires more often, and they are also sicker | Collect several contacts; link to registries; report losses by group; use multiple imputation or inverse probability weighting |
| Confounding | A third factor is linked to both exposure and outcome | People who sit longest are also older and exercise less | Measure confounders at baseline; adjust in regression; stratify; match; use propensity scores |
| Healthy worker effect | Employed people are healthier than the general population | A factory cohort has lower death rates than national figures | Compare with another working group, not the general population |
| Information bias | Exposure or outcome is measured differently across groups | Exposed people are screened more often, so more cases are found | Measure exposure before outcome; blind outcome assessors to exposure; use the same tests for everyone |
| Reverse causation | Early, undiagnosed disease changes the exposure | People with early heart disease cut back on exercise | Exclude the first one or two years of follow-up in a sensitivity analysis |
| Exposure change | People's exposure changes during follow-up | Smokers quit | Re-measure exposure at each wave; model it as time-varying |

Loss to follow-up matters because of who leaves, not only how many. A loss of 10% that is concentrated in the highest-risk exposed group can bias the result more than a loss of 25% spread evenly. Report the numbers lost in each group and compare their baseline characteristics with those who stayed.

Confounding can be reduced but never ruled out in observational data. That is why a cohort result is described as an association. Bradford Hill's viewpoints (strength, consistency, dose-response, temporality and others) help you judge whether an association is likely to be causal [8].

## What should a cohort study report? STROBE

**STROBE (Strengthening the Reporting of Observational Studies in Epidemiology) is a 22-item checklist for reporting cohort, case-control and cross-sectional studies** [1]. A separate explanation and elaboration paper explains each item with examples [2]. Many journals ask you to upload the completed checklist with your manuscript.

Items that matter most for cohorts:

| STROBE item | What to report for a cohort |
| --- | --- |
| 1. Title and abstract | Name the design ("a prospective cohort study") in the title or abstract |
| 4. Study design | Say early in the methods that it is a cohort study |
| 6. Participants | Eligibility criteria, sources and methods of selection, and methods of follow-up |
| 7. Variables | Define every outcome, exposure, predictor, potential confounder and effect modifier |
| 9. Bias | Describe what you did to address potential sources of bias |
| 12. Statistical methods | How you adjusted for confounders, handled missing data and addressed loss to follow-up |
| 13. Participants | Numbers at each stage: eligible, included, completing follow-up; a flow diagram is recommended |
| 14. Descriptive data | Baseline characteristics by exposure group, and follow-up time (average and total) |
| 15. Outcome data | Numbers of outcome events or summary measures over time |
| 16. Main results | Unadjusted and adjusted estimates with 95% CIs, and which confounders were adjusted for; consider giving absolute risk too |

Use the cohort-specific version of the checklist from the STROBE website [3].

## Famous cohort studies

**Three cohorts shaped how cohort research is done: Framingham, the British Doctors Study and the Nurses' Health Study.**

### The Framingham Heart Study (1948 to today)

The US Public Health Service began the study in 1948 in Framingham, Massachusetts, enrolling 5,209 men and women aged 30 to 62 with no overt cardiovascular disease, who were examined about every two years [4]. Dawber and colleagues described its design in 1951 [4]. It identified high blood pressure, high cholesterol, smoking and diabetes as predictors of heart disease, and its investigators helped popularize the term "risk factor" [5]. An Offspring cohort was added in 1971 and a Third Generation cohort in 2002. <!-- VERIFY: Offspring cohort start 1971 and Third Generation 2002, against framinghamheartstudy.org -->

### The British Doctors Study (1951 to 2001)

After their 1950 case-control study linked smoking to lung cancer, Richard Doll and Austin Bradford Hill wanted evidence from a design that measured smoking before disease. In 1951 they sent a short questionnaire on smoking habits to doctors on the British medical register and followed the replies through death records. <!-- VERIFY: number of doctors who replied in 1951 (often given as about 40,000) --> Their preliminary report in 1954 already showed higher lung cancer mortality among smokers, rising with the amount smoked [9], and the 1956 report confirmed it with more deaths [10]. The 50-year follow-up of 34,439 male doctors found that men who smoked cigarettes throughout adult life died about 10 years younger on average than lifelong non-smokers [11]. It is a textbook case of a case-control finding confirmed by a prospective cohort.

### The Nurses' Health Study (1976 to today)

Frank Speizer started the Nurses' Health Study in 1976 to study the long-term effects of oral contraceptives. It enrolled about 121,700 married female registered nurses aged 30 to 55 in 11 US states, who answer mailed questionnaires every two years [6]. Nurses were chosen because they could report health information accurately and were likely to stay in the study. Nurses' Health Study II began in 1989 with younger nurses, and a third cohort began in 2010 [6]. <!-- VERIFY: enrollment figures and start years for NHS II and NHS3 against Bao et al. (2016) -->

## Common mistakes

- **Including people who already have the outcome.** Screen them out at baseline, or you lose the time order.
- **Reporting only relative risk.** Give absolute risks or the risk difference as well.
- **Ignoring person-time.** Use rates or survival methods when follow-up differs between people.
- **Treating adjustment as proof of causation.** Unmeasured confounders remain; say so in the limitations.
- **Not reporting losses by exposure group.** STROBE asks for numbers at each stage.
- **Calling a retrospective cohort a case-control study,** or the reverse. Name the design by its starting point.

## How to plan and report a cohort study with AI for Research

AI for Research can help you find earlier cohorts, run the basic statistics and check your report. Evidence from these tools is a starting point for research. Any use of results in patient care needs review by a qualified health professional; nothing here is medical advice.

1. **Find existing cohorts (0 credits).** In [Find Papers](/features/paper-search), filter by study type "cohort", plus year and open access. Searching PubMed and Europe PMC is included, and retracted papers are left out by default. Our guide to [how to search PubMed](/blog/how-to-search-pubmed) covers the syntax.
2. **Get a cited overview.** Ask [Deep Research](/tools/deep-research) a question such as "What do prospective cohorts show about sitting time and type 2 diabetes?" and choose the Medical source. A Summary run costs 1 credit. Study type labels can be wrong, so check the methods of each paper.
3. **Run the statistics.** The free [data analysis tool](/tools/data-analysis) runs a chi-square test on a 2 × 2 table in your browser. **Data Lab**, the statistics workspace, adds Kaplan-Meier curves with a log-rank test and logistic regression with odds ratios, at 0 credits. Neither has a named relative risk or Cox regression test; use the formulas above, or R or Stata.
4. **Check your report against STROBE.** The reporting guideline checker in the [Reviewer](/features/ai-peer-review) checks a manuscript against STROBE and other checklists, for 5 credits per 10,000 words. Treat its output as a draft checklist and confirm each item yourself.

The Free plan includes 45 credits a month; search and the free tools cost nothing. See [pricing](/pricing).

## FAQ

### What is a cohort study?

A cohort study is an observational study that follows a group of people who do not yet have the outcome, classifies them by an exposure such as smoking or shift work, and compares how often the outcome develops in the exposed and unexposed over time. Because exposure is measured before the outcome, it can estimate incidence and relative risk directly, which a case-control study cannot.

### What is the difference between a prospective and a retrospective cohort study?

Both move from exposure to outcome. In a prospective cohort, the researchers recruit people now, measure exposure, and follow them into the future. In a retrospective (historical) cohort, the exposure and outcomes are already recorded, for example in employment or hospital records, and the researchers reconstruct the follow-up from the past to the present. Retrospective cohorts are faster and cheaper but depend on the quality of old records.

### What is the difference between a cohort study and a case-control study?

A cohort study starts with exposure and follows people forward to see who develops the outcome. A case-control study starts with the outcome: it selects people who have it (cases) and people who do not (controls), then looks back at past exposure. Cohorts give incidence and relative risk and suit common outcomes; case-control studies give odds ratios and suit rare outcomes.

### How do you calculate relative risk in a cohort study?

Divide the cumulative incidence in the exposed group by the cumulative incidence in the unexposed group. If 60 of 2,000 exposed people and 30 of 3,000 unexposed people develop the outcome, the risks are 3% and 1%, so the relative risk is 3.0. A relative risk of 1 means no difference, above 1 a higher risk in the exposed, and below 1 a lower risk.

### What level of evidence is a cohort study?

For questions about whether a treatment works, a cohort study ranks below randomized controlled trials, at level 3 in the Oxford CEBM scheme, because confounding can never be fully ruled out. For questions about prognosis, natural history and rare or long-term harms, a well-run cohort is often the best design available, and an inception cohort is the strongest single design for prognosis.

## Next steps

- See where cohorts rank: [levels of evidence and study types](/blog/levels-of-evidence-and-study-types).
- Define your exposure and outcome precisely: [independent vs dependent variables](/blog/independent-vs-dependent-variables) and [operational definitions](/blog/operational-definition-of-variables).
- Work out how many participants you need: [statistical power and sample size](/blog/statistical-power-and-sample-size).
- Check that your measures hold up: [reliability vs validity](/blog/reliability-vs-validity).
- Compare with the other designs: [types of research design](/blog/types-of-research-design).

## Sources

1. von Elm, E., Altman, D. G., Egger, M., Pocock, S. J., Gøtzsche, P. C., & Vandenbroucke, J. P. (2007). The Strengthening the Reporting of Observational Studies in Epidemiology (STROBE) statement: Guidelines for reporting observational studies. *The Lancet, 370*(9596), 1453–1457. https://doi.org/10.1016/S0140-6736(07)61602-X
2. Vandenbroucke, J. P., von Elm, E., Altman, D. G., Gøtzsche, P. C., Mulrow, C. D., Pocock, S. J., Poole, C., Schlesselman, J. J., & Egger, M. (2007). Strengthening the Reporting of Observational Studies in Epidemiology (STROBE): Explanation and elaboration. *PLoS Medicine, 4*(10), e297. https://doi.org/10.1371/journal.pmed.0040297
3. STROBE. Checklists (cohort, case-control and cross-sectional versions). https://www.strobe-statement.org/checklists/ <!-- VERIFY: current URL of the STROBE checklists page -->
4. Dawber, T. R., Meadors, G. F., & Moore, F. E. (1951). Epidemiological approaches to heart disease: The Framingham Study. *American Journal of Public Health and the Nation's Health, 41*(3), 279–286. https://doi.org/10.2105/AJPH.41.3.279
5. Kannel, W. B., Dawber, T. R., Kagan, A., Revotskie, N., & Stokes, J. (1961). Factors of risk in the development of coronary heart disease: Six-year follow-up experience. The Framingham Study. *Annals of Internal Medicine, 55*(1), 33–50. https://doi.org/10.7326/0003-4819-55-1-33 <!-- VERIFY: DOI and author list for Kannel et al. 1961 -->
6. Bao, Y., Bertoia, M. L., Lenart, E. B., Stampfer, M. J., Willett, W. C., Speizer, F. E., & Chavarro, J. E. (2016). Origin, methods, and evolution of the three Nurses' Health Studies. *American Journal of Public Health, 106*(9), 1573–1581. https://doi.org/10.2105/AJPH.2016.303338 <!-- VERIFY: DOI and author list for Bao et al. 2016 -->
7. Rothman, K. J., Greenland, S., & Lash, T. L. (2008). *Modern Epidemiology* (3rd ed.). Lippincott Williams & Wilkins.
8. Hill, A. B. (1965). The environment and disease: Association or causation? *Proceedings of the Royal Society of Medicine, 58*(5), 295–300. https://doi.org/10.1177/003591576505800503
9. Doll, R., & Hill, A. B. (1954). The mortality of doctors in relation to their smoking habits: A preliminary report. *British Medical Journal, 1*(4877), 1451–1455. https://doi.org/10.1136/bmj.1.4877.1451
10. Doll, R., & Hill, A. B. (1956). Lung cancer and other causes of death in relation to smoking: A second report on the mortality of British doctors. *British Medical Journal, 2*(5001), 1071–1081. https://doi.org/10.1136/bmj.2.5001.1071
11. Doll, R., Peto, R., Boreham, J., & Sutherland, I. (2004). Mortality in relation to smoking: 50 years' observations on male British doctors. *BMJ, 328*(7455), 1519. https://doi.org/10.1136/bmj.38142.554479.AE
