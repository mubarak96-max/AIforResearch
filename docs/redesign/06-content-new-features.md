# Content for the 13 November features

Landing pages and blog posts for the features built on 13 November 2026 (see [the audience gap analysis](../audience-gaps-2026-11-13.md)):

- **Data Lab statistics:** new tests, sample-size designs, and R, Python and SPSS code export.
- **Reporting-guideline check** in the Reviewer.
- **Survey builder** with validated scales.
- **Six deliverable templates** in the Writing Studio.

This continues [04-content-plan.md](04-content-plan.md). Its conventions and its **product-claim rules** apply unchanged, and so does its numbering: landing pages continue from L67 and posts from 101.

**Keyword data:** every keyword below is **not checked**. Pull the seed terms in the appendix (three Ubersuggest reports a day) before a brief is written, and change a primary keyword if its figure is weak. No volume here is an estimate.

**When pages go live:** the features exist in code but have not been deployed or clicked through in a browser. By claim rule 1, a landing page goes live only after its feature works in production. A post that teaches a method may publish earlier if it links only to features that already work.

## Claim rules for these features

These add to the rules in 04-content-plan.md.

1. **Statistics are calculated, not generated.** Say that results were checked against scipy and published examples. Never say "validated" or "certified", and never write "replaces SPSS".
2. **The guideline check drafts the checklist; the author confirms it.** Never say "guarantees compliance" or "journal-ready". Name the guideline version (CONSORT 2010, with a note that CONSORT 2025 exists; PRISMA 2020; STARD 2015 and so on).
3. **Validated scales:** name only the six included (PHQ-9, GAD-7, WHO-5, PSS-10, RSES, SUS). State that they are free to use and give their citations. Never imply that licensed scales (SF-36, BDI, MBI and others) are included. Health pages say that a screening score is not a diagnosis.
4. **Case reports and clinical audits:** stress de-identification and consent. No treatment advice.
5. **Policy briefs and evaluation reports** are drafts built from the user's own evidence and data. The product never invents findings; say so, because it is the selling point.
6. **Surveys collect no names, emails or IP addresses.** That is true of the product, but a survey that asks for identifying details is no longer anonymous. Say both.

## Landing pages

| # | URL | Primary keyword | Secondary keywords | Intent | What the page shows |
| --- | --- | --- | --- | --- | --- |
| L67 | `/features/survey-builder` | survey builder for research (not checked) | questionnaire maker, online survey for thesis, likert scale survey, anonymous survey | Com | A questionnaire built from validated scales and the user's own questions; an anonymous link; responses that land in Data Lab already scored, with reliability. Free plan: 3 surveys and 100 responses each |
| L68 | `/features/validated-questionnaires` | validated questionnaires (not checked) | phq-9 questionnaire, gad-7 questionnaire, system usability scale, perceived stress scale | Info/Com | The six scales, each with its wording, scoring, bands, licence and citation, and a button to add it to a survey. Item 9 of the PHQ-9 and its safety caution are shown, not hidden |
| L69 | `/features/reporting-guideline-checker` | consort checklist (not checked) | strobe checklist, prisma checklist, care checklist, stard checklist, coreq checklist | Com | A manuscript checked item by item, with the passage that reports each item. "Check by hand" when no passage is found. A CSV with a page-number column for submission. 5 credits per 10,000 words |
| L70 | `/features/case-report-writer` | how to write a case report (not checked) | case report format, care guidelines case report, medical case report template | Info/Com | De-identified notes in, a CARE-structured draft out, with the timeline table and the literature only in the discussion. Placeholders for consent and the patient's perspective. Pairs with the CARE check (L69) |
| L71 | `/features/clinical-audit` | clinical audit template (not checked) | audit cycle, re-audit, clinical audit proposal, quality improvement project | Com | An audit plan with criteria, targets and a data collection form; then the report against target with an action plan. Audit versus research ethics, said carefully. Pairs with SQUIRE (L69) |
| L72 | `/features/evaluation-report` | evaluation report template (not checked) | oecd dac criteria, programme evaluation report, m&e report, donor report | Com | A draft from the user's programme description and findings, organised by the OECD-DAC criteria, evaluation questions or the logframe. Placeholders, never invented data |
| L73 | `/features/policy-brief` | policy brief template (not checked) | how to write a policy brief, policy brief example, policy options analysis | Com | Key messages, the evidence (cited), an options table and recommendations, for a chosen audience and context. "Compare neutrally" or "recommend one" |
| L74 | `/features/annotated-bibliography` | annotated bibliography generator (not checked) | annotated bibliography apa, annotated bibliography example | Trans | Real sources on a topic, each annotated as descriptive, critical or both. Only sources found in real databases; the reference list is formatted in 10,000+ styles |
| L75 | `/features/seminar-reading-prep` | seminar preparation (not checked) | discussion questions for readings, summarize readings for class | Trans | The week's readings in: each argument, its weak points, how they connect, discussion questions and points to raise. Framed as "understand and argue", never "skip the reading" |
| L76 | `/tools/kaplan-meier-calculator` | kaplan meier curve (not checked) | survival analysis calculator, log rank test calculator, median survival | Trans | **Free tool:** paste time, event and group to get the curve, medians with CIs and the log-rank test. Runs in the browser. Signs up at "save" or "write the results section" |
| L77 | `/tools/sensitivity-specificity-calculator` | sensitivity and specificity calculator (not checked) | ppv npv calculator, likelihood ratio calculator, diagnostic test calculator | Trans | **Free tool:** a 2 × 2 table in, with sensitivity, specificity, PPV, NPV and likelihood ratios out, all with exact CIs; plus a ROC tab for scores |
| L78 | `/tools/cronbachs-alpha-calculator` | cronbach's alpha calculator (not checked) | reliability analysis, item total correlation, alpha if item deleted | Trans | **Free tool:** paste the item columns to get alpha, standardised alpha, item-total r and alpha if each item is deleted, with a flag for reversed items |

**Update existing pages instead of adding new ones:**

- **L25 `/features/data-lab`:** add the new tests by group (compare groups, relationships, prediction, clinical and diagnostic, scales and surveys), the survival and ROC charts, and code export. "Your examiner can rerun it in R, Python or SPSS" is the strongest new line.
- **L32 `/tools/sample-size-calculator`:** add prevalence (with population and design effect), correlation and diagnostic-accuracy designs. The prevalence calculator is the one most thesis students need.
- **Audience pages (`/for/medicine`, `/for/masters`, `/for/phd`, `/for/industry`):** link the new deliverables. Medicine gets the case report, clinical audit, the guideline check and the clinical statistics. Industry and policy get the policy brief and evaluation report.

**Phase:** the free tools (L76–L78) reuse functions in `lib/statsMore.ts`, so they can ship soon after the features deploy. Each is a page wrapping functions that already have tests.

## Blog posts

| # | Slug | Title | Primary keyword | Hub | Links to |
| --- | --- | --- | --- | --- | --- |
| 101 | how-to-write-a-case-report | How to write a case report (CARE checklist, with an example structure) | how to write a case report (not checked) | Medicine | L70, L69 |
| 102 | consort-checklist-explained | The CONSORT checklist, item by item, and the ones authors miss | consort checklist (not checked) | Reporting | L69 |
| 103 | strobe-checklist-explained | STROBE for observational studies: what each item asks for | strobe checklist (not checked) | Reporting | L69 |
| 104 | prisma-2020-checklist | The PRISMA 2020 checklist: 27 items and how to report them | prisma checklist (not checked) | Systematic review | L69, L24, post 90 |
| 105 | which-reporting-guideline | Which reporting guideline does my study need? (EQUATOR, by design) | reporting guidelines (not checked) | Reporting | L69 |
| 106 | how-to-write-a-clinical-audit | How to do a clinical audit: standard, criteria, cycle and re-audit | clinical audit (not checked) | Medicine | L71 |
| 107 | audit-vs-research-vs-service-evaluation | Audit, research or service evaluation? Why it decides your ethics route | audit vs research (not checked) | Medicine | L71 |
| 108 | sensitivity-specificity-ppv-npv | Sensitivity, specificity, PPV and NPV with one worked 2 × 2 table | sensitivity and specificity (not checked) | Statistics | L77 |
| 109 | roc-curve-auc-explained | ROC curves and AUC: reading them and choosing a cut-off | roc curve (not checked) | Statistics | L77, L25 |
| 110 | kaplan-meier-and-log-rank | Kaplan-Meier curves and the log-rank test, explained with real data | kaplan meier (not checked) | Statistics | L76, L25 |
| 111 | logistic-regression-odds-ratios | Logistic regression for a thesis: odds ratios, CIs and how to report them | logistic regression (not checked) | Statistics | L25 |
| 112 | non-parametric-tests | Mann-Whitney, Wilcoxon, Kruskal-Wallis: when the data are not normal | non parametric tests (not checked) | Statistics | L25, post 93 |
| 113 | fishers-exact-vs-chi-square | Fisher's exact test or chi-square? The expected-count rule | fisher exact test (not checked) | Statistics | L25 |
| 114 | cronbachs-alpha | Cronbach's alpha: what it shows, what it doesn't, and reverse-scored items | cronbach alpha (not checked) | Statistics | L78, L67 |
| 115 | sample-size-for-a-prevalence-study | Sample size for a cross-sectional survey (Cochran's formula, worked) | sample size calculation formula (not checked) | Statistics | L32 |
| 116 | how-to-design-a-questionnaire | How to design a questionnaire for a thesis: 12 mistakes to avoid | questionnaire design (not checked) | Surveys | L67 |
| 117 | likert-scale-analysis | How to analyse Likert scale data (items, scales, and the mean debate) | likert scale analysis (not checked) | Surveys | L67, L78 |
| 118 | phq-9-scoring | PHQ-9 scoring and interpretation for research (and item 9) | phq 9 scoring (not checked) | Surveys / Medicine | L68 |
| 119 | system-usability-scale | System Usability Scale: how to score SUS and what 68 means | system usability scale (not checked) | Surveys / UX | L68 |
| 120 | how-to-write-a-policy-brief | How to write a policy brief (structure, options table, example) | how to write a policy brief (not checked) | Policy | L73 |
| 121 | oecd-dac-evaluation-criteria | The six OECD-DAC evaluation criteria, with questions to ask | oecd dac criteria (not checked) | Evaluation | L72 |
| 122 | how-to-write-an-annotated-bibliography | How to write an annotated bibliography (APA and MLA examples) | how to write an annotated bibliography (not checked) | Students | L74 |
| 123 | how-to-prepare-for-a-seminar | How to prepare for a seminar: read, question, contribute | how to prepare for a seminar (not checked) | Students | L75 |
| 124 | reproducible-statistics-for-your-thesis | Make your thesis statistics reproducible: data, code and a change log | reproducible analysis (not checked) | Statistics | L25 |

**Order:** start with 105, 108, 110, 114, 115 and 116. They teach methods, so claim rule 1 lets them publish before launch. Then 101, 102 and 104, which pair with the guideline check, the clearest new paid feature. The policy and evaluation posts (120, 121) can wait until the decision on the policy and NGO audience.

**Every statistics post** uses one worked example whose numbers come from Data Lab and match the tests in `tests/server/data-lab-stats.test.ts`. That gives each post a ready, checked example: the 6-MP leukaemia data for Kaplan-Meier, the tea-tasting table for Fisher's exact test, and R's Wilcoxon example.

## Appendix: seed terms to pull

Three a day, in this order: `consort checklist`, `kaplan meier`, `sensitivity and specificity` · `cronbach alpha`, `how to write a case report`, `clinical audit` · `questionnaire design`, `logistic regression`, `annotated bibliography` · `policy brief`, `oecd dac criteria`, `phq 9`.
