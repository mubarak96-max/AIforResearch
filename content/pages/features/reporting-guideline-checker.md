---
slug: "reporting-guideline-checker"
seo_title: "Reporting Guideline Checker: CONSORT, STROBE, SAGER, SAMPL"
description: "A reporting guideline checker for CONSORT, STROBE, STARD, SAGER, SAMPL and five more: each item with the passage that reports it, and a CSV with a page column."
heading: "A reporting guideline checker that shows you the passage"
intro: "Upload or paste your manuscript and pick a guideline. The Reviewer checks every item, quotes the passage that reports it, marks what is missing or needs checking by hand, and gives you a draft checklist to finish with your page numbers."
primary_keyword: "reporting guideline checker"
secondary_keywords: ["consort checklist", "strobe checklist", "sager checklist", "sampl checklist", "equator reporting guidelines", "stard checklist"]
hero: "cta"
cta:
  label: "Open the guideline check in the Reviewer"
  href: "/reviewer?module=guidelines"
plan_note: "The Free plan has 45 credits a month. A guideline check costs 5 credits per 10,000 words, rounded up, so a 6,000-word manuscript costs 5."
related: ["/templates/reporting-checklists", "/features/ai-peer-review", "/features/citation-checker", "/features/clinical-research-checklists", "/features/systematic-review", "/blog/sager-guidelines", "/blog/sampl-guidelines", "/blog/how-to-make-a-prisma-flow-diagram", "/for/medicine"]
updated: "2026-11-13"
faq:
  - q: "Which reporting guidelines can it check?"
    a: "Ten: CONSORT 2010 for randomized trials, STROBE 2007 for observational studies, PRISMA 2020 for systematic reviews, CARE 2013 for case reports, STARD 2015 for diagnostic accuracy studies, COREQ 2007 for interviews and focus groups, SRQR 2014 for qualitative research, SQUIRE 2.0 for quality improvement, and two add-ons used alongside a study-design checklist: SAGER (2016) for sex and gender reporting and SAMPL (2013) for basic statistical reporting. Items are paraphrased and numbered as published."
  - q: "Is CONSORT 2025 included?"
    a: "Not yet. The check uses CONSORT 2010, and the result names the version so you know which one you are checking against. CONSORT 2025 has been published; if your journal asks for it, compare the items by hand with the official 2025 checklist."
  - q: "Does a complete check mean my paper complies with the guideline?"
    a: "No. The check drafts the checklist; you confirm it. An item counts as reported only when the passage that reports it is found in your text, and items it cannot decide are marked Check by hand. Read each quoted passage, add your page or line numbers, and submit the official checklist your journal asks for."
  - q: "Why use SAGER or SAMPL as well as CONSORT or STROBE?"
    a: "They cover different things. A study-design checklist asks what was done; SAGER asks whether sex and gender were reported and analyzed, and SAMPL asks whether statistics are reported fully (estimates, intervals, exact p-values, tests named). Run the design checklist first, then SAGER or SAMPL as a second check. Each run is priced separately."
  - q: "How long a manuscript can it check?"
    a: "Up to 40,000 words per run. Longer text is checked up to that point and the result says how many words were checked. A typical research article of 4,000 to 8,000 words costs 5 credits."
---
A reporting guideline checker saves the slowest part of submission: going through a checklist item by item and finding where the manuscript reports each one. The **guideline check** in the Reviewer does that against ten guidelines listed by the EQUATOR Network, including CONSORT, STROBE, STARD, SAGER and SAMPL. For every item it quotes the passage that reports it, or says it is missing, partly reported or needs checking by hand. You finish the draft checklist and submit the official one.

<!-- SCREENSHOT: the Reviewer guideline check with STROBE selected and marked Suggested, a manuscript uploaded, and the credit cost shown next to "Check against STROBE" -->

## What it does

| Guideline | Version | For |
| --- | --- | --- |
| CONSORT | 2010 | Randomized controlled trials (CONSORT 2025 also exists; see the FAQ) |
| STROBE | 2007 | Observational studies: cohort, case-control, cross-sectional |
| PRISMA | 2020 | Systematic reviews and meta-analyses |
| CARE | 2013 | Case reports |
| STARD | 2015 | Diagnostic accuracy studies |
| COREQ | 2007 | Qualitative interviews and focus groups |
| SRQR | 2014 | Qualitative research, any method |
| SQUIRE | 2.0 | Quality improvement and clinical audit reports |
| SAGER | 2016 <!-- VERIFY: SAGER publication year (Heidari et al., Res Integr Peer Rev 2016;1:2) --> | Sex and gender reporting, as an add-on |
| SAMPL | 2013 <!-- VERIFY: SAMPL year (Lang and Altman, Science Editors Handbook, EASE 2013) --> | Basic statistical reporting, as an add-on |

Each item gets one of five results:

- **Reported:** the passage that reports it is quoted, with where it was found.
- **Partly reported:** the passage is quoted, with what is missing.
- **Missing:** no passage was found, with a note on what to add.
- **Not applicable:** the item does not fit the study.
- **Check by hand:** the check could not decide; you look.

The items are paraphrased from the published checklists and keep their published numbers, so "STROBE 12d" in the result is item 12d on the official form. A link to each official checklist sits next to the result.

The check suggests a guideline from your text. A paper that reads like a diagnostic accuracy study gets STARD suggested; a paper that reports sex differences, or a lot of statistics with no recognized design, gets SAGER or SAMPL suggested.

## Which guideline fits your study

The EQUATOR Network lists hundreds of reporting guidelines <!-- VERIFY: current number of guidelines in the EQUATOR library -->, but most manuscripts need one of a few. Match the guideline to the design of the study, not to the topic.

| Your study | Guideline to check |
| --- | --- |
| A randomized trial | CONSORT 2010 |
| A cohort, case-control or cross-sectional study | STROBE 2007 |
| A systematic review, with or without meta-analysis | PRISMA 2020 |
| A case report | CARE 2013 |
| A study of a diagnostic test's accuracy | STARD 2015 |
| Interviews or focus groups | COREQ 2007, or SRQR 2014 for other qualitative methods |
| A quality improvement project or clinical audit | SQUIRE 2.0 |
| Any of the above that involves people, animals or cells | Add SAGER for sex and gender |
| Any of the above that reports statistics | Add SAMPL for statistical reporting |

If your journal names a guideline in its author instructions, use that one.

## How it works, step by step

1. Open the Reviewer and choose the guideline check (the route is /reviewer?module=guidelines).
2. Upload the manuscript (Word or PDF), pick a document you already have, or paste the whole text from the title to the funding statement.
3. Pick the guideline, or accept the one marked **Suggested**. SAGER and SAMPL are marked **Add-on**.
4. Check the credit cost shown next to the button, and press **Check against** the guideline.
5. Read the summary and the counts for each result. The list opens on **To fix**: the items that are partly reported, missing or need checking by hand.
6. Press **CSV with a page column** to download the checklist with an empty "Page or line" column, ready to fill in, or **Open checklist in editor** to finish it there.

<!-- SCREENSHOT: a finished CONSORT check, the counts row, the To fix filter, one item expanded with its quoted passage, and the "CSV with a page column" button -->

## A worked example

*Example (invented for illustration):* a registrar has a 5,200-word cohort study on early mobilization after hip surgery that reports outcomes separately for men and women.

1. She uploads the Word file. STROBE 2007 is suggested. Cost: 5 credits.
2. Most items are reported with quoted passages. Item 12d (loss to follow-up) is partly reported: dropouts are counted but their handling in the analysis is not described. The sample size item is missing. Two items are marked Check by hand.
3. She runs SAGER as a second check: 5 credits. It flags that the methods do not say how sex was determined.
4. She fixes the text, downloads the STROBE CSV, adds page numbers, and copies them into the journal's official form.

Total: 10 credits, inside the Free plan's 45 a month.

## What it does not do

- It does not guarantee compliance or acceptance. It drafts the checklist; the author confirms every item.
- It does not fill in page numbers. Page and line numbers depend on your submission file, so the CSV leaves that column for you.
- It does not judge the quality of the study. A reported item can still describe a weak method; for a critique, use the [AI peer review](/features/ai-peer-review) in the Reviewer.
- It does not check CONSORT 2025 or guideline extensions (for example CONSORT for cluster trials). Use the official checklists for those.
- It does not check your references. The [citation checker](/features/citation-checker) does that, for 2 credits.

For blank, copyable checklists, including PRISMA 2020, see the [reporting checklists template](/templates/reporting-checklists). Systematic reviewers can run the review and build its PRISMA flow diagram in the [Systematic Review workspace](/features/systematic-review).

## Who uses it

- Clinicians and health researchers submitting to medical journals: see [AI for medicine](/for/medicine) and [medicine and health research](/fields/medicine-and-health).
- PhD students turning a thesis chapter into a paper: see [AI for PhD students](/for/phd).
- Academics and supervisors checking a draft before it goes out: see [AI for academics](/for/academics).
- Qualitative researchers reporting against COREQ or SRQR, including those who code their interviews with [qualitative coding](/features/qualitative-coding) in Workbooks.

Running the study itself? The [clinical research checklists](/features/clinical-research-checklists) cover the IRB submission, the site initiation visit and ClinicalTrials.gov results.

## Learn more

- [The SAGER guidelines: reporting sex and gender](/blog/sager-guidelines)
- [The SAMPL guidelines: basic statistical reporting](/blog/sampl-guidelines)
- [How to make a PRISMA flow diagram](/blog/how-to-make-a-prisma-flow-diagram)
- [Levels of evidence and study types](/blog/levels-of-evidence-and-study-types)
