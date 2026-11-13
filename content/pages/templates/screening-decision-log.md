---
slug: "screening-decision-log"
seo_title: "Screening Decision Log Template with Exclusion Reasons"
description: "A screening decision log template for systematic reviews: columns to copy, a ranked exclusion reason taxonomy, and rules for settling disagreements."
heading: "Screening decision log template with exclusion reasons and conflict rules"
intro: "Copy this screening decision log to record every reviewer's decision, the final decision and its reason. It comes with a ranked list of exclusion reasons and written rules for settling disagreements between reviewers."
primary_keyword: "screening decision log"
secondary_keywords: ["exclusion reasons systematic review", "reasons for exclusion systematic review", "screening log systematic review", "disagreement resolution systematic review", "excluded studies table", "full text exclusion reasons"]
hero: "cta"
cta:
  label: "Log decisions in a review"
  href: "/systematic-review"
plan_note: "Copying the log is free. In the Systematic Review workspace, screening, conflicts, agreement statistics, the CSV of decisions and the decision log as Word or PDF cost 0 credits; the free plan holds one review of up to 50 records."
related: ["/features/systematic-review", "/templates/screening-forms", "/templates/reporting-checklists", "/blog/how-to-make-a-prisma-flow-diagram", "/blog/cohens-kappa-inter-rater-reliability", "/alternatives/covidence"]
updated: "2026-11-13"
faq:
  - q: "What is a screening decision log?"
    a: "A screening decision log is a table with one row per record and stage, holding each reviewer's decision and reason, whether they agreed, the final decision, who settled any disagreement, and when. It is the audit trail behind your PRISMA flow diagram, your agreement statistics and your table of excluded studies, and it lets an examiner or peer reviewer check any single decision."
  - q: "What are the most common exclusion reasons in a systematic review?"
    a: "At full text, most exclusions fall under wrong population, wrong intervention or exposure, wrong comparator, wrong outcomes, wrong study design, wrong setting and wrong publication type, such as conference abstracts or editorials. Language and date limits, duplicate reports of the same study and missing outcome data for pooling make up most of the rest. Use the same short list throughout so counts can be summed."
  - q: "Do I need to give exclusion reasons at title and abstract stage?"
    a: "No. PRISMA 2020 asks for reasons for reports excluded at full text, not for every record excluded at title and abstract. Many teams still tick a reason during title screening because it speeds up discussion of disagreements, but you only need to report the number excluded at that stage. Every full-text exclusion needs one main reason."
  - q: "How do you resolve disagreements between reviewers?"
    a: "Write the rule in your protocol before screening. A common rule: at title and abstract, any record that one reviewer includes goes to full text; at full text, the two reviewers discuss each conflict with the criteria in front of them, and a third reviewer decides if they still disagree. Record who resolved each conflict and the final reason."
  - q: "What if a study fails more than one criterion?"
    a: "Give it one main reason so your exclusion counts add up to the total excluded. Check criteria in a fixed order, for example publication type, population, intervention, comparator, outcomes and design, and record the first one the study fails. State that order in your methods so readers know why a survey of students was counted under population rather than design."
---
A screening decision log records who decided what about each study in a systematic review, why, and how disagreements were settled. This template gives you the columns, a ranked taxonomy of exclusion reasons and disagreement rules for your protocol. It is for reviewers who screen in spreadsheets or must explain their screening to an examiner or journal.

Fill the log as you screen with the [screening forms](/templates/screening-forms). Its counts feed your [PRISMA flow diagram](/blog/how-to-make-a-prisma-flow-diagram).

## The decision log (copy this)

One row per record per stage. Paste the header into a spreadsheet and freeze the first row.

| Record ID | Stage | Reviewer A | A reason | Reviewer B | B reason | Agree? | Final decision | Final reason | Resolved by | Date | Note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| | TA / FT | Include / Exclude / Maybe | | Include / Exclude / Maybe | | Y / N | | | A+B / third reviewer | | |

TA is title and abstract; FT is full text. Keep the record ID the same as in your reference manager or screening tool, so the log can be matched to the export.

Add two small tables beside it:

- **Reports not retrieved.** Report ID, how you tried to get it, date. These are not exclusions.
- **Excluded studies that look eligible.** For PRISMA 2020 item 16b, list studies a reader might expect to see included, with the reason each was excluded [1].

<!-- SCREENSHOT: the Screening tab with the "Conflicts" view selected: one record showing both reviewers' decisions and the "Reviewers disagree. Resolve:" Include and Exclude buttons -->

## The exclusion reason taxonomy

Use one short list for the whole review and check reasons in this order. The first criterion a report fails is its main reason, so each excluded report is counted once.

| Order | Reason | Use it when | Example |
| --- | --- | --- | --- |
| 1 | Duplicate report | A second copy of a record you already have | The same trial in PubMed and Embase, missed by deduplication |
| 2 | Wrong publication type | Editorial, letter, commentary, protocol, conference abstract (if excluded in your protocol) | A conference abstract with no full paper |
| 3 | Not in an included language | Only if your protocol limits languages | A study published only in a language you excluded |
| 4 | Outside the date range | Only if your protocol limits dates | Published before your start year |
| 5 | Wrong population | Participants differ from the criteria | Students in a simulated shift |
| 6 | Wrong intervention or exposure | The intervention or exposure differs | A nap taken before the shift |
| 7 | Wrong comparator | No eligible comparison group | Two nap lengths, no no-nap group |
| 8 | Wrong outcomes | No eligible outcome measured or reported | Reports only satisfaction, not alertness |
| 9 | Wrong study design | Design not in your criteria | Case series, cross-sectional survey |
| 10 | Wrong setting | Setting outside the criteria | Laboratory study with no work duties |
| 11 | No usable outcome data | Meta-analysis only: outcome reported without data you can pool | Means without any measure of spread |

Ordering the cheap checks first (duplicate, publication type, language, date) means most reports are excluded on facts that need no judgment. "Full text not available" is missing on purpose: a report you could not get is "not retrieved", a separate box in the diagram. For why reasons must sum to the total, see [PRISMA flow diagram mistakes](/blog/how-to-make-a-prisma-flow-diagram).

For other review types, swap in their criteria: a scoping review uses wrong population, wrong concept, wrong context and wrong source type; a qualitative evidence synthesis adds "not qualitative data" and uses sample and phenomenon of interest in place of population and intervention.

## Rules for settling disagreements (adapt for your protocol)

Cochrane requires a process for resolving disagreements to be set out in advance [2]. Copy and edit these rules.

1. **Independent first.** Each reviewer decides without seeing the other's decision.
2. **Title and abstract: lean to inclusion.** If either reviewer includes or marks Maybe, the record goes to full text. Only records both reviewers exclude are excluded.
3. **Full text: discuss.** The two reviewers meet, reread the criteria and the relevant passage, and agree a final decision and one reason.
4. **Third reviewer.** If they still disagree, a named third reviewer decides. Their decision is final.
5. **Criteria problems get fixed, not argued.** If the same disagreement recurs, clarify the criterion in a dated protocol amendment and recheck earlier decisions.
6. **Measure agreement.** Report percent agreement and [Cohen's kappa](/blog/cohens-kappa-inter-rater-reliability) per stage, calculated on decisions before resolution.
7. **Keep the trail.** Never overwrite the original decisions; add the final decision in its own column.

## A filled log (invented)

*These rows are invented for illustration.*

| Record ID | Stage | A | B | Agree? | Final | Final reason | Resolved by |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R014 | TA | Include | Include | Y | Include | | |
| R027 | TA | Exclude | Maybe | N | Include (to FT) | | Rule 2 |
| R027 | FT | Exclude: wrong comparator | Exclude: wrong design | N | Exclude | Wrong comparator | A+B, rule 3 |
| R033 | FT | Include | Exclude: wrong outcomes | N | Include | | Third reviewer |
| R041 | FT | Exclude: wrong population | Exclude: wrong population | Y | Exclude | Wrong population | |

R027 shows the fixed order at work: both reviewers excluded it, for different reasons, and the earlier criterion in the order, comparator, became the main reason.

## How to keep the log in AI for Research

The Systematic Review workspace records decisions as you screen and keeps the log for you.

1. Share the review's project with your co-reviewer as **can edit**, or tick **Use the AI as a second reviewer**. Each record then needs two decisions.
2. Screen with **I**, **E** (with a reason from the list) and **M**. The list is set by the review type and uses the reasons in the taxonomy above, plus "full text not available"; the order of checking is yours to apply.
3. Open the **Conflicts** view. Each record where you disagree shows both decisions; choose **Include** or **Exclude** to set the final decision.
4. Read the **Agreement** panel: Cohen's kappa with its label, percent agreement and the number of records compared, for each stage.
5. On the **Report** tab, download **All records and decisions (CSV)**: one row per record with the title and abstract decision, the full-text decision, the final decision and its reason, plus extraction columns.
6. For the appendix, or for a team that screens in another tool, download the **decision log** as **Word** or **PDF** from the same tab, with the screening form and the exclusion-reason list. No credits.

<!-- VERIFY: the columns of the Word/PDF decision log export (per-reviewer votes or final decisions only) once the Report step export ships -->

| Log column | Where it is in the workspace |
| --- | --- |
| Each reviewer's decision | On each record, under the abstract |
| Agree? | Conflicts view; kappa and percent agreement in the Agreement panel |
| Final decision and reason | Record state; "Final decision" and "Reason" columns in the CSV |
| Duplicates removed | "Duplicates removed" list on the Search tab, with the match (DOI, PubMed id or title) |
| Counts by reason | PRISMA 2020 diagram on the Report tab |

<!-- SCREENSHOT: the Report tab with the "All records and decisions (CSV)" button next to the PRISMA diagram's excluded-reports box broken down by reason -->

## What the template and the workspace do not do

- **The CSV holds final decisions, not every vote.** Each reviewer's own decision is shown on the record but is not a column in the export, and the date of each vote is not shown. Copy decisions into this log if your methods need them.
- **Decisions are not blinded.** Once your co-reviewer has decided on a record, you see their decision under the abstract, so rule 1 depends on deciding before you look.
- **Reasons come from a fixed list per review type.** You cannot type a custom reason. Use the note column of your own log for detail.
- **Resolving a conflict offers Include or Exclude.** There is no third-reviewer role; a project editor resolves, and you record who did.
- **Reports not retrieved are not tracked separately.** They are excluded as "full text not available"; move them to the not-retrieved box in your final diagram.

## Who it is for

Review teams with two or more screeners, PhD candidates who must defend each exclusion in a viva ([AI tools for PhD students](/for/phd)), and clinical teams preparing a review for a journal ([AI for medical research](/for/medicine)). The full workflow is on the [systematic review software](/features/systematic-review) page.

## Learn more

- [How to make a PRISMA flow diagram](/blog/how-to-make-a-prisma-flow-diagram): turning the log into counts that add up.
- [Cohen's kappa for screening](/blog/cohens-kappa-inter-rater-reliability): calculating and reporting agreement.
- [What is a systematic review](/blog/what-is-a-systematic-review): why two reviewers screen.

## Sources

1. Page MJ, McKenzie JE, Bossuyt PM, et al. The PRISMA 2020 statement: an updated guideline for reporting systematic reviews. *BMJ*. 2021;372:n71. https://doi.org/10.1136/bmj.n71
2. Lefebvre C, Glanville J, Briscoe S, et al. Chapter 4: Searching for and selecting studies. In: Higgins JPT, Thomas J, et al. (eds). *Cochrane Handbook for Systematic Reviews of Interventions*, version 6.5. Cochrane, 2024. https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-04
