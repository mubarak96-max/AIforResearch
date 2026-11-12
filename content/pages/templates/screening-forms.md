---
slug: "screening-forms"
seo_title: "Screening Form for Systematic Reviews: Abstract, Full Text"
description: "Screening form systematic review templates to copy: title and abstract, full text, and versions for scoping and qualitative reviews, with decision rules."
heading: "Screening forms for a systematic review: title, abstract and full text"
intro: "Two screening forms to copy, one for titles and abstracts and one for full texts, each with a scoping and a qualitative version. Every question has a decision rule, so two reviewers apply your criteria the same way."
primary_keyword: "screening form systematic review"
secondary_keywords: ["title and abstract screening", "full text screening form", "systematic review screening tool", "scoping review screening", "qualitative evidence synthesis screening", "screening questions systematic review"]
hero: "cta"
cta:
  label: "Screen in the workspace"
  href: "/systematic-review"
plan_note: "Copying the forms is free. Screening by hand in the Systematic Review workspace costs 0 credits; AI suggestions cost 1 credit per 25 records. The free plan holds one review of up to 50 records."
related: ["/features/systematic-review", "/templates/screening-decision-log", "/templates/inclusion-exclusion-criteria", "/blog/cohens-kappa-inter-rater-reliability", "/blog/scoping-review-vs-systematic-review", "/alternatives/rayyan"]
updated: "2026-11-12"
faq:
  - q: "What is title and abstract screening?"
    a: "Title and abstract screening is the first pass through the records your searches found. Each reviewer reads only the title and abstract and decides whether the record could meet the eligibility criteria. Clearly irrelevant records are excluded without reasons; anything that might qualify goes on to full-text screening, where reasons for every exclusion are recorded for the PRISMA flow diagram."
  - q: "What questions go on a screening form?"
    a: "One question per eligibility criterion, phrased so it can be answered Yes, No or Unclear from the text in front of you: population, intervention or exposure, comparator, outcome, study design and publication type for a PICO review. Scoping reviews ask about population, concept, context and source type; qualitative syntheses ask whether the study reports qualitative data collected and analyzed with qualitative methods."
  - q: "Should unclear records be included at title and abstract stage?"
    a: "Yes. At title and abstract stage, a record that might meet the criteria should go to full text rather than be excluded on a guess. Mark it Maybe or Unclear. The cost of reading an extra full text is small; the cost of losing an eligible study is a biased review. Be strict at full text, where you can see the methods."
  - q: "How many reviewers should screen each record?"
    a: "Two, working independently, is the standard for systematic reviews, and Cochrane makes two independent reviewers mandatory for final inclusion decisions. Rapid reviews often use one screener with a second checking a sample. Pilot the form on 50 to 100 records with both reviewers, measure agreement with Cohen's kappa, and clarify the criteria before screening the rest."
  - q: "Is there a free screening tool for systematic reviews?"
    a: "Several tools let you screen for free, with limits. In AI for Research, screening by hand costs no credits: the free plan holds one review with up to 50 records, enough to pilot your form, and paid plans hold up to 10,000 records per review. AI suggestions, if you want them, cost 1 credit per 25 records and never replace your decision."
---
A screening form turns your eligibility criteria into questions a reviewer can answer in seconds per record. Here is a screening form for a systematic review at both stages, title and abstract and full text, with versions for scoping and qualitative reviews. Copy them into a spreadsheet or your screening software, and pilot them first.

The forms assume your criteria are already written. If they are not, build them first with the [inclusion and exclusion criteria](/templates/inclusion-exclusion-criteria) builder.

## Form 1: title and abstract screening (copy this)

Use one row or one copy per record. The questions follow PICO plus design and publication type.

```
TITLE AND ABSTRACT SCREENING FORM
Review:                    Reviewer:              Date:
Record ID:                 First author, year:    Source database:

Q1  Population matches the criteria?              Yes / No / Unclear
Q2  Intervention or exposure matches?             Yes / No / Unclear
Q3  Comparator matches (or none required)?        Yes / No / Unclear
Q4  Outcome could be reported?                    Yes / No / Unclear
Q5  Study design is eligible?                     Yes / No / Unclear
Q6  Publication type is eligible?                 Yes / No / Unclear
    (not an editorial, letter, commentary or protocol)

DECISION   Include / Exclude / Maybe
RULE       Any "No"  -> Exclude
           All "Yes" -> Include (goes to full text)
           Any "Unclear" and no "No" -> Maybe (goes to full text)
Reason if excluded (optional at this stage):
Note:
```

Q4 asks whether the outcome *could* be reported. Abstracts often leave out secondary outcomes, so don't exclude on a missing outcome until you have the full text.

## Form 2: full-text screening (copy this)

At full text, you count reports rather than records, and every exclusion needs one main reason so the reasons add up in your [PRISMA flow diagram](/blog/how-to-make-a-prisma-flow-diagram).

```
FULL-TEXT SCREENING FORM
Review:                    Reviewer:              Date:
Report ID / citation:
Full text obtained?        Yes / No  (No = "report not retrieved", not an exclusion)
Same study as report(s):   (link companion papers of one trial)

Check the criteria in this order; stop at the first "Not met":
1. Publication type        Met / Not met / Unclear   Page or quote:
2. Population              Met / Not met / Unclear   Page or quote:
3. Intervention/exposure   Met / Not met / Unclear   Page or quote:
4. Comparator              Met / Not met / Unclear   Page or quote:
5. Outcomes                Met / Not met / Unclear   Page or quote:
6. Study design            Met / Not met / Unclear   Page or quote:
7. Setting, language, date Met / Not met / Unclear   Page or quote:

DECISION   Include / Exclude / Awaiting information (author contacted)
Main exclusion reason (the first criterion not met):
Note:
```

<!-- SCREENSHOT: the Screening tab at the Full text stage: one record with Include / Exclude / Maybe buttons and their I, E, M keys, and the "Reason to exclude" list open -->

## Versions for scoping and qualitative reviews

Change the questions to match the framework. The decision rules stay the same.

| Review type | Framework | Questions at title and abstract | What changes at full text |
| --- | --- | --- | --- |
| Systematic review (effects) | PICO | Population, intervention, comparator, outcome, design, publication type | Strict check of design and outcome data |
| Scoping review | PCC | Population, concept, context, source type (any evidence, including reports and policy documents if your protocol allows) | No design or quality questions; check the source addresses the concept in the context |
| Qualitative evidence synthesis | SPIDER | Sample, phenomenon of interest, design, evaluation, research type | Does it report qualitative findings (themes, quotes) from qualitative data collection and analysis? For mixed methods, is the qualitative part reported separately? |

For a scoping review, a single question often does most of the work: "Does this source say anything about [concept] in [context]?" Keep the form short, because scoping searches are broad and record counts are high. See [scoping review vs systematic review](/blog/scoping-review-vs-systematic-review) for when each applies.

## Notes on using the forms

1. **Pilot first.** Both reviewers screen the same 50 to 100 records, compare decisions and measure agreement. If [Cohen's kappa](/blog/cohens-kappa-inter-rater-reliability) is low, rewrite the unclear criteria before going on.
2. **Screen independently.** Each reviewer completes the form without seeing the other's decision. Cochrane requires two independent reviewers for final inclusion decisions [1].
3. **Be inclusive early, strict late.** Unclear goes forward at title and abstract; at full text, Unclear means you contact the authors or record "awaiting information".
4. **Use a fixed order of criteria at full text.** The first criterion not met becomes the main reason. Write the order in your protocol.
5. **Log every decision.** Keep the forms, or a [screening decision log](/templates/screening-decision-log), so you can report how many reviewers screened each record and how disagreements were settled (PRISMA 2020 item 8) [2].

## A worked example (invented)

*Both records are invented for illustration.* The review asks whether planned night-shift naps improve alertness in adult shift workers.

| Record | Q1 Population | Q2 Intervention | Q5 Design | Decision |
| --- | --- | --- | --- | --- |
| "A 30-minute nap and vigilance in ICU nurses on night shifts: a crossover trial" | Yes | Yes | Yes | Include (to full text) |
| "Napping habits of medical students: a survey" | No (students, no shift work) | Unclear | No (survey) | Exclude: wrong population |
| "Strategies against fatigue in air traffic control" (no abstract) | Yes | Unclear | Unclear | Maybe (to full text) |

The second record fails two questions. Following the rule, the first "No" in the form's order, population, is its reason.

## How to screen with these forms in AI for Research

The Systematic Review workspace builds the form from your review: the criteria come from the Protocol tab and the exclusion reasons from the review type.

1. Set the review type, framework and **Include when** / **Exclude when** criteria on the **Protocol** tab.
2. Add records on the **Search** tab: PubMed, Europe PMC and OpenAlex searches, or uploaded RIS, BibTeX, CSV or PubMed .nbib files. Duplicates are set aside by DOI, PubMed id and title.
3. On the **Screening** tab, choose **Title and abstract**. Each record shows its title, authors, abstract and DOI or PubMed link. Press **I** to include, **E** to exclude (with a reason from the list) or **M** for maybe.
4. Switch to **Full text**. Records you included or marked maybe at title and abstract are there. Read the paper through the DOI link and decide again.
5. Optional: **Suggest for the next 25** (1 credit) adds an AI suggestion with a one-sentence reason to each record. It is labeled as a suggestion; your vote is what counts.

| Review type | Exclusion reasons offered in the workspace |
| --- | --- |
| Systematic, rapid, living | Wrong population; wrong intervention or exposure; wrong comparator; wrong outcomes; wrong study design; wrong setting; wrong publication type; not in an included language; outside the date range; full text not available; duplicate report |
| Meta-analysis | The systematic list plus "no usable outcome data for pooling" |
| Scoping | Wrong population; wrong concept; wrong context; wrong source type; not in an included language; outside the date range; full text not available; duplicate report |
| Qualitative evidence synthesis | Not qualitative data; wrong sample; wrong phenomenon of interest; wrong study design; wrong publication type; not in an included language; full text not available; duplicate report |

<!-- SCREENSHOT: the AI suggestions card ("Suggest for the next 25", 1 credit) and the Agreement panel showing kappa and percent agreement -->

To add a second reviewer, put the review in a project and share it as **can edit**, or tick **Use the AI as a second reviewer**. The workspace then needs two decisions per record and lists disagreements as conflicts. The full workflow is on the [systematic review software](/features/systematic-review) page.

## What these forms and the workspace do not do

- **The workspace does not show your own form questions.** It records Include, Exclude or Maybe and one reason from the review type's fixed list. Keep the Yes/No/Unclear answers in your own sheet if your protocol needs them.
- **Decisions are not hidden from each other.** Once your co-reviewer, or the AI, has decided on a record, that decision shows under the abstract. Screen before you read it.
- **Full texts are not attached.** You open the paper through its DOI or PubMed link; there is no PDF upload at the screening stage.
- **"Not retrieved" has no separate box.** "Full text not available" is recorded as an exclusion reason, so move those reports to "reports not retrieved" when you draw the final PRISMA diagram.

## Who it is for

Students and teams running their first review, especially PhD candidates ([AI tools for PhD students](/for/phd)) and clinical teams ([AI for medical research](/for/medicine)). If you already screen in another tool, compare it in [Rayyan alternative](/alternatives/rayyan) or [Covidence alternative](/alternatives/covidence).

## Learn more

- [What is a systematic review](/blog/what-is-a-systematic-review): where screening sits in the eight steps.
- [Cohen's kappa for screening](/blog/cohens-kappa-inter-rater-reliability): measuring agreement in your pilot.
- [How to make a PRISMA flow diagram](/blog/how-to-make-a-prisma-flow-diagram): turning screening counts into the figure.
- [Systematic review AI](/blog/ai-for-systematic-reviews): validating AI screening and reporting it.

## Sources

1. Lefebvre C, Glanville J, Briscoe S, et al. Chapter 4: Searching for and selecting studies. In: Higgins JPT, Thomas J, et al. (eds). *Cochrane Handbook for Systematic Reviews of Interventions*, version 6.5. Cochrane, 2024. https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-04
2. Page MJ, McKenzie JE, Bossuyt PM, et al. The PRISMA 2020 statement: an updated guideline for reporting systematic reviews. *BMJ*. 2021;372:n71. https://doi.org/10.1136/bmj.n71
