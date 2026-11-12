---
slug: "systematic-review"
seo_title: "Systematic Review Software: Protocol to PRISMA 2020"
description: "Systematic review software for the whole review: protocol, PubMed searches, imports, duplicate removal, two-reviewer screening, kappa, extraction and PRISMA."
heading: "Systematic review software, from protocol to PRISMA flow diagram"
intro: "Run a whole review in one workspace: write the protocol, search PubMed, Europe PMC and OpenAlex or import your exports, remove duplicates, screen with a second reviewer, extract data and draw the PRISMA 2020 diagram from your decisions."
primary_keyword: "systematic review software"
secondary_keywords: ["systematic review ai", "systematic review screening tool", "title and abstract screening", "scoping review software", "data extraction systematic review", "inter-rater agreement screening", "systematic review literature"]
hero: "cta"
cta:
  label: "Start a review"
  href: "/systematic-review"
plan_note: "The Free plan includes one review with up to 50 records. Searching, importing, screening, extraction by hand and the PRISMA diagram cost 0 credits; AI suggestions cost 1 credit per 25 records."
related: ["/blog/what-is-a-systematic-review", "/blog/how-to-make-a-prisma-flow-diagram", "/templates/systematic-review-protocol", "/templates/screening-forms", "/alternatives/covidence", "/alternatives/rayyan"]
updated: "2026-11-12"
faq:
  - q: "Is there free systematic review software?"
    a: "Yes, to try. The Free plan includes one review with up to 50 records, and searching, importing, duplicate removal, screening, extraction by hand, exports and the PRISMA 2020 diagram cost no credits. AI screening suggestions, AI extraction and the protocol and methods drafts use credits from the 45 a month. Paid plans hold up to 10,000 records per review and any number of reviews."
  - q: "Does the AI decide which studies are included?"
    a: "No. Reviewers decide. The AI reads each record against your criteria and shows a suggestion with a one-line reason, labeled as a suggestion. Your Include, Exclude or Maybe vote is what counts. If you switch on the AI as a second reviewer, its suggestion is compared with your vote, and every disagreement becomes a conflict that a person resolves."
  - q: "Can I use Scopus or Web of Science records?"
    a: "Yes, as uploaded exports. Scopus and Web of Science have no open search API, so run your search there through your library, export it as RIS or CSV, and upload the file under Upload an export. The same works for Embase, CINAHL, PsycINFO, the Cochrane Library and ERIC. Each upload is logged with its source, date and counts."
  - q: "How does it measure agreement between reviewers?"
    a: "When two people screen, or one person screens with the AI as second reviewer, the Agreement panel shows Cohen's kappa, a label from slight to almost perfect, the percent of records with the same decision, and how many records were compared. Records where reviewers disagree are listed under Conflicts and resolved with Include or Exclude."
  - q: "Does it do the meta-analysis?"
    a: "No. It supports the review up to data extraction and reporting: protocol, searches, screening, extraction table, simple risk-of-bias ratings, the PRISMA 2020 flow diagram and a methods draft. Pooling effect sizes and drawing forest plots need dedicated software such as RevMan or R. Export your extraction and records as CSV or RIS to take them there."
---
The Systematic Review workspace is the systematic review software in AI for Research. It covers the whole review in order: protocol, searches, duplicate removal, two-reviewer screening with agreement statistics, data extraction, risk of bias and a PRISMA 2020 flow diagram drawn from your decisions. It is for anyone running a systematic, scoping or rapid review. Reviewers decide, not the AI.

<!-- SCREENSHOT: a review open on the Screening tab: one record's title and abstract, the Include / Exclude / Maybe buttons with their keys, the AI suggestion box, and the Agreement panel with kappa -->

## What you can do with it

| Stage | What happens | Credits |
| --- | --- | --- |
| New review | Title, question, type of review, framework (PICO, PCC or SPIDER), inclusion and exclusion criteria, optional project | 0 |
| Protocol | Edit by hand, or "Draft the protocol with AI" in the structure PROSPERO asks for | 0 by hand, 3 for the AI draft |
| Search | PubMed, Europe PMC or OpenAlex with a live count as you type; "Run and add" up to 100, 500, 1,000 or 2,000 records; every search logged | 0 |
| Import | RIS, BibTeX, CSV or PubMed .nbib exports from Scopus, Web of Science, Embase, CINAHL, PsycINFO, Cochrane Library, ERIC or another database | 0 |
| Duplicates | Removed on import by DOI, PubMed id or title, each listed with the reason | 0 |
| Screening | Title and abstract, then full text; Include, Exclude with a reason, or Maybe | 0 |
| AI suggestions | A suggested decision and reason for each record | 1 per 25 records |
| Extraction | Nine standard columns plus your own, and three risk-of-bias fields | 0 by hand, 3 per 10 studies for AI filling |
| Report | PRISMA 2020 diagram (SVG, PNG), CSV and RIS exports, "Draft from this review" methods section | 0, methods draft 3 |

Eight review types are built in: systematic review, scoping review, rapid review, meta-analysis, mapping review, qualitative evidence synthesis, realist review and living systematic review. Each sets a default framework and its own list of exclusion reasons. A scoping review, for example, uses PCC and reasons such as "Wrong concept" and "Wrong context"; a meta-analysis adds "No usable outcome data for pooling".

## How it works, step by step

1. **Create the review.** Choose New review, write the question, pick the type and framework, fill in the framework fields and list your criteria one per line. Add it to a project if others will screen with you.
2. **Write the protocol.** On the Protocol tab, edit the question and criteria, then write the protocol or press "Draft the protocol with AI" (3 credits) and edit the draft.
3. **Search.** On the Search tab, pick PubMed, Europe PMC or OpenAlex. The search string starts from your framework fields; edit it and watch the live count. Press "Run and add". The search log records the date, source, string, records found, added and duplicates.
4. **Import the rest.** For databases without an open API, export from the database and upload the file, choosing where it came from. You can also add the papers from a Deep Research result.
5. **Screen titles and abstracts.** Each record shows its title, authors, year, journal, abstract and DOI or PubMed link. Press I, E or M, or the buttons; arrows move between records. Choose the exclusion reason from the review type's list. Records marked Include or Maybe go on to full-text screening.
6. **Resolve conflicts.** With two reviewers, a record is final when both agree. Disagreements appear under Conflicts with each reviewer's vote, and you settle them with Include or Exclude.
7. **Screen full texts.** Switch the stage to Full text and repeat, recording why each excluded study fails.
8. **Extract data.** Included studies appear in the Extraction table. Type values, or press "Fill the next 10 with AI", and rate risk of bias.
9. **Report.** The Report tab draws the PRISMA 2020 flow diagram from your records and decisions as they stand, lists included studies, exports records and decisions, and drafts a methods section.

<!-- SCREENSHOT: the Search tab with the PubMed string, the live record count, "Run and add", and the search log table below with one upload from Scopus -->

## Second reviewers and agreement

A second reviewer is anyone with "can edit" access to the review's project. If you work alone, you can tick "Use the AI as a second reviewer": the AI's suggestion then counts as the second vote, and any disagreement with you becomes a conflict to resolve. The Agreement panel shows Cohen's kappa with its label (slight, fair, moderate, substantial or almost perfect), the percent of identical decisions and the number of records compared. The methods draft reports which setup you used.

## What the extraction table holds

The standard columns are population, intervention or exposure, comparison, outcomes, study design, sample size, setting, funding and conflicts, and limitations. Add your own, such as follow-up. Risk of bias has three fields: randomization, allocation concealment and blinding, each rated low, some concerns, high, unclear or not applicable. AI filling reads the abstract only and shows the words each value came from; anything you type is never overwritten.

## A worked example

*Example (invented for illustration), on a paid plan since it holds more than 50 records:* a review asks whether a planned nap during the night shift improves alertness in adult shift workers.

- PubMed search: 212 records found and added. Scopus export uploaded: 168 records, 61 set aside as duplicates. Total screened: 319.
- AI suggestions for all 319 records cost 13 credits (13 batches of up to 25).
- Two reviewers screen titles and abstracts; 281 are excluded, 38 go to full text, and kappa is shown in the Agreement panel.
- 31 full texts are excluded with reasons (for example 14 wrong outcomes, 9 wrong study design, 8 full text not available), leaving 7 included studies.
- AI extraction for the 7 studies: 3 credits. Methods draft: 3 credits. Protocol draft: 3 credits.

Total AI use: 22 credits. The PRISMA diagram shows 380 identified, 61 duplicates, 319 screened, 281 excluded, 38 assessed, 31 excluded with reasons and 7 included, with no manual counting.

## What it does not do

- It does not search Scopus, Web of Science, Embase or Google Scholar. Search them through your library and upload the export.
- The AI never makes the final decision. Suggestions and AI-filled cells are labeled, and a person resolves every conflict.
- It does not fetch or store full-text PDFs for screening. You read the full text from the DOI or PubMed link or your library.
- AI extraction reads abstracts only. Check every value against the full text.
- Risk of bias covers three domains. It is not a full RoB 2 or ROBINS-I assessment; record those in their own forms.
- It does not run a meta-analysis or draw forest plots, and it does not register your protocol with PROSPERO.
- On the Free plan, one review with up to 50 records. Paid plans hold up to 10,000 records per review.

## Who uses it

Health and medical researchers running reviews to PRISMA 2020 (see [AI for medical research](/for/medicine)), PhD candidates whose first chapter is a systematic or scoping review (see [AI for PhD students](/for/phd)), and academics supervising review teams (see [AI for professors](/for/academics)). For ready-to-copy forms, see the [systematic review protocol template](/templates/systematic-review-protocol), [screening forms](/templates/screening-forms), [inclusion and exclusion criteria](/templates/inclusion-exclusion-criteria) and the [PRISMA checklist](/templates/reporting-checklists). If you are comparing tools, read [Covidence alternative](/alternatives/covidence) and [Rayyan alternative](/alternatives/rayyan).

<!-- LINK: /tools/prisma-flow-diagram when L30 ships; /tools/inter-rater-agreement-calculator when L33 ships -->

## Learn more

- [What a systematic review is, with its strengths and limits](/blog/what-is-a-systematic-review)
- [How to build a search strategy for a systematic review](/blog/systematic-review-search-strategy)
- [How to make a PRISMA flow diagram](/blog/how-to-make-a-prisma-flow-diagram)
- [Cohen's kappa for screening agreement](/blog/cohens-kappa-inter-rater-reliability)
