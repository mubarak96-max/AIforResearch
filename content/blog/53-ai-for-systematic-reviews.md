---
title: "Systematic Review AI: What Works and How to Report It"
slug: "ai-for-systematic-reviews"
description: "Systematic review AI explained: which steps AI can help with, how Covidence, Rayyan, ASReview and Elicit compare, how to validate it and how to report AI use."
primary_keyword: "systematic review ai"
secondary_keywords: ["ai for systematic review", "ai systematic review", "asreview", "ai screening systematic review", "can ai do a systematic review", "how to report ai use in a systematic review", "active learning screening", "rayyan ai", "covidence ai"]
cluster: "N. Systematic reviews"
pillar: "/blog/what-is-a-systematic-review"
author: "Mubarak"
compares_tools: true
published: "2026-11-12"
updated: "2026-11-12"
faq:
  - q: "Can AI do a systematic review?"
    a: "No, not on its own. AI can speed up parts of a systematic review: drafting search terms, removing duplicates, ranking records so relevant ones come first, suggesting include or exclude decisions and pulling data into a table. The review team still sets the question and criteria, makes the inclusion decisions, judges risk of bias and interprets the results. Cochrane, Campbell, JBI and CEE all say authors remain responsible."
  - q: "How do I report AI use in a systematic review?"
    a: "PRISMA 2020 asks you to give details of any automation tools used in study selection (item 8) and data collection (item 9). The 2025 joint position statement from Cochrane, Campbell, JBI and CEE adds: name the tool, version and dates; say which stages it affected and why; describe how you validated and checked its output; and state its limitations. Plan this in your protocol, not after."
  - q: "Is AI screening accurate enough for a systematic review?"
    a: "Using AI to change the order in which you screen records is the best-supported use. A 2015 systematic review of text-mining methods found screening workload savings of roughly 30% to 70%, sometimes with about 5% of relevant studies missed. Using AI to exclude records without a human check carries more risk. Validate it on your own data and keep a human screener on every record you exclude."
  - q: "Is ASReview free?"
    a: "Yes. ASReview is open-source software developed at Utrecht University and released under the Apache 2.0 license, so you can download and use it without paying. It uses active learning: you label records relevant or not relevant and the model re-ranks the rest so likely includes come first. It also has a simulation mode for testing how well a model would have performed on a labeled dataset."
  - q: "Can AI replace the second reviewer in a systematic review?"
    a: "Some tools let AI act as the second screener, and early evidence suggests it can be used cautiously. Cochrane requires two people to decide independently on final inclusion, so check your target journal and review group's rules before relying on it. If you use AI as a second reviewer, say so in the methods and report agreement as human versus AI, not as two independent human reviewers."
---

# AI for systematic reviews: what works, what doesn't, and how to report it

*Last updated: 12 November 2026*

Systematic review AI works best on the slow, repetitive steps: ranking records so likely includes are screened first, flagging duplicates, suggesting include or exclude decisions and pulling data from abstracts into a table. It works worst on judgment: eligibility calls, risk of bias and interpretation. Validate any AI step on your own records, keep humans making the decisions, and report the tool, version and checks in your methods.

This guide is for review teams, students and librarians deciding where AI fits in a systematic or scoping review. It covers where AI helps and how to validate and disclose it; the method itself is in our pillar guide, [what is a systematic review](/blog/what-is-a-systematic-review), and the posts linked from each step below.

## Can AI do a systematic review?

No. AI can do parts of the work, but not the review. **Systematic review AI is software that uses machine learning or language models to assist with steps of a systematic review, such as screening, deduplication or data extraction, under the review team's control.** The 2025 joint position statement from Cochrane, the Campbell Collaboration, JBI and the Collaboration for Environmental Evidence puts it plainly: evidence synthesists are ultimately responsible for their synthesis, AI should be used with human oversight, and its use should be justified and reported [1].

## Where does AI help in each systematic review step?

The evidence is strongest for screening prioritization and weakest for judgment. This table follows the steps in [what is a systematic review](/blog/what-is-a-systematic-review).

| Step | What AI does | How mature | Human role |
| --- | --- | --- | --- |
| Question and protocol | Drafts PICO elements and protocol text | Drafting aid only | Write and register the protocol |
| Search strategy | Suggests synonyms and draft strings | Useful for ideas; strings need expert checking | Build and test strings; see [systematic review search strategy](/blog/systematic-review-search-strategy) |
| Deduplication | Matches records by DOI, ID and title | Mostly rule-based, reliable | Check near-duplicates |
| Title and abstract screening | Ranks records by likely relevance (active learning); suggests decisions | Best evidence: workload savings of about 30% to 70% in studies reviewed [2] | Decide on every record, or validate a stopping rule |
| Full-text screening | Suggests decisions from the full text | Newer, less evaluated | Decide, with reasons |
| Data extraction | Fills a table from abstracts or full texts with quotes | Promising; error rates vary by field | Verify every value you analyze |
| Risk of bias | Some tools draft judgments | Least mature | Two people judge, with a named tool such as RoB 2 |
| Synthesis and writing | Drafts methods text and summaries | Drafting aid only | Analyze, interpret, write |

### How does AI screening work?

Most screening tools use active learning. **Active learning is a machine learning method in which the model learns from the screener's decisions as they are made and keeps re-ranking the remaining records so the most likely includes come next.** You label records relevant or not; the model updates; relevant records rise to the top. The open-source ASReview project describes its screening this way: you label records as relevant or not relevant and the model "continuously improves" [5].

Prioritization saves time only if you stop screening early, which needs a stopping rule set in the protocol, such as a number of consecutive irrelevant records. O'Mara-Eves and colleagues found most evaluations reported workload savings of roughly 30% to 70%, sometimes with about 5% of relevant studies missed; they judged prioritizing the screening order safe for live reviews, and using text mining as a second screener acceptable with caution [2].

## How do Covidence, Rayyan, ASReview and Elicit compare?

Each covers different steps. All facts below are from each vendor's own pages, checked November 2026; features and prices change, so check before you choose.

| Tool | Good at | Steps covered | AI features | Cost (checked November 2026) |
| --- | --- | --- | --- | --- |
| **Covidence** | A complete, structured review workflow with an audit trail | Import, deduplication, dual screening with blinding and conflict resolution, full text, extraction templates, risk of bias, PRISMA diagram [3] | "Most relevant" sort using an EPPI-Centre active learning model; Cochrane RCT Classifier labels records "Possible RCT" or "Not RCT" and removes none [3][4] | Free trial; institutional licences [3] <!-- VERIFY: Covidence individual pricing on covidence.org/pricing --> |
| **Rayyan** | Fast, low-cost screening with a generous free plan | Import, duplicate detection, title/abstract and full-text screening, extraction, risk of bias [6] | AI relevance predictions (free); AI duplicate auto-resolve (Essential); PICO extraction with AI (Advanced); ResearchPilot on Business and Enterprise [7] | Free: 3 active reviews, 2 free reviewers. Essential $4.99 and Advanced $8.33 per seat per month, billed annually [7] |
| **ASReview** | Transparent, open-source screening prioritization you can test | Title and abstract screening [5] | Active learning; simulation mode to test models on labeled data [5][8] | Free, open source (Apache 2.0) [5] |
| **Elicit** | AI screening and extraction with the supporting quote for each decision | Gather papers, title/abstract screening, optional full-text screening, extraction, report [9] | Suggested criteria, AI screening with quotes, AI extraction; vendor reports up to 99.5% screening recall [9][10] | Systematic reviews on Pro, Scale and Enterprise plans; Pro up to 5,000 papers, Scale 20,000 [9] |
| **AI for Research** | Protocol to PRISMA diagram in one workspace, with kappa and an AI second reviewer | Protocol, search (PubMed, Europe PMC, OpenAlex), uploads, deduplication, two-stage screening, extraction, PRISMA 2020 diagram, methods draft | AI screening suggestions with reasons; AI as optional second reviewer; extraction from abstracts with quotes | Free: 1 review, 50 records; credits on paid plans (below) |

### Which one should you choose?

- **Covidence** if your institution licenses it and you want a fully audited workflow. Its "Most relevant" sort starts after at least 25 decisions, with at least 2 includes and 2 excludes, and its help page says it won't work as expected for reviews under 100 or over 150,000 studies [4].
- **Rayyan** if you want to start screening with AI relevance predictions on a free plan [7].
- **ASReview** if you want to inspect and test the model: it is open source, its methods are published in *Nature Machine Intelligence*, and its simulation mode shows how a model would have performed on a labeled dataset [5][8]. It focuses on screening, so pair it with other tools for extraction and reporting.
- **Elicit** if you want AI on the most steps, with a quote behind each screening decision and an extraction table you check cell by cell [9]. Its recall figures are the vendor's own [10]; validate on your records.

## How do you validate AI in a systematic review?

Test it on your own records before you rely on it, and write the test into your protocol. A tool's published accuracy is from someone else's review.

1. **Pre-specify the AI use.** In the protocol, name the tool, the step and the rule, for example: "AI ranks records; two reviewers screen until 200 consecutive irrelevant records, then one reviewer checks a random 10% of the rest." The position statement asks for this at the protocol stage [1].
2. **Build a calibration set.** Two people screen the same 200 to 500 records by hand.
3. **Compare the AI with the humans.** Calculate recall (the share of human includes the AI also included) and agreement with [Cohen's kappa](/blog/cohens-kappa-inter-rater-reliability). Recall matters most: a missed study can change a result.
4. **Check extraction on a sample.** Compare AI-extracted values with the papers for at least 10 studies or 10% of studies, whichever is more, and record the error rate. Check every value you analyze.
5. **Keep humans on every exclusion you can't defend.** Never let the AI alone exclude records at full text.
6. **Log everything.** Tool name, version, dates, prompts or settings, and the outputs, so the review can be audited.

*Example (invented numbers):* a team screens 400 calibration records by hand and finds 32 includes. The AI ranks 31 of them in its suggested includes: recall 31/32 = 96.9%. The team decides that is acceptable only with a second human reviewer on all AI excludes, and writes that into the protocol amendment.

## How do you report AI use in a systematic review?

Report it in the methods, with enough detail that someone could repeat it. Two sources set the rules.

**PRISMA 2020.** Item 8 asks you to specify how studies were selected, "including how many reviewers screened each record and each report retrieved, whether they worked independently, and if applicable, details of automation tools used in the process" [11]. Item 9 asks the same for data collection [11]. If a classifier removed records before screening, the flow diagram has a box for "records marked as ineligible by automation tools" [12]; see [how to make a PRISMA flow diagram](/blog/how-to-make-a-prisma-flow-diagram).

**The 2025 position statement (RAISE).** Cochrane, Campbell, JBI and CEE ask authors to disclose AI that makes or suggests judgments, such as eligibility decisions, risk of bias or data extraction, and to report [1]:

- the name, version and dates of use of each AI tool;
- its purpose and which stages of the review it affected;
- why you used it, including evidence of performance and any piloting or calibration;
- how you verified its output, and, where feasible, the prompts and outputs;
- any interests in the tool;
- its limitations and likely effect on the results.

Minor uses such as spelling and grammar checks generally need not be listed, but check your journal's policy [1].

*A methods paragraph you can adapt (example):* "Titles and abstracts were screened in [tool, version] between [dates]. The tool's active learning model ranked records by predicted relevance. Two reviewers (AB, CD) independently screened all records; the tool's ranking set the order only. AI-suggested data extraction from abstracts was verified by one reviewer against the full text for every included study, and checked by a second reviewer for a random 20%. Agreement on a 400-record calibration set was κ = 0.81."

## How to use systematic review AI in AI for Research

The [Systematic Review workspace](/features/systematic-review) in AI for Research holds the whole review: protocol, search, screening, extraction and the PRISMA diagram. The AI suggests; reviewers decide.

- **Protocol:** PICO, PCC or SPIDER, eligibility criteria and an AI draft in PROSPERO's sections (3 credits).
- **Search:** builders for PubMed, Europe PMC and OpenAlex with live counts, logged for your report (0 credits). Scopus and Web of Science come in as RIS, BibTeX, CSV or .nbib exports you run through your library. Duplicates are removed by DOI, PMID and title.
- **Screening:** title and abstract, then full text; include, exclude with a reason, or maybe. AI suggestions with a reason cost 1 credit per 25 records. A project editor or the AI can be the second reviewer; conflicts are listed with Cohen's kappa and percent agreement.
- **Extraction:** 9 standard columns plus custom and risk-of-bias fields. The AI fills cells from abstracts with the quoted words (3 credits per 10 studies).
- **Report:** PRISMA 2020 diagram from live counts (0 credits), CSV and RIS export, AI methods draft (3 credits).

<!-- SCREENSHOT: screening view with an AI suggestion and its reason, the include/exclude/maybe buttons, and the agreement panel showing kappa -->

**Cost example:** AI suggestions on 2,000 records (80 credits), extraction for 20 studies (6), and the protocol and methods drafts (3 each) come to 92 credits, within the Plus plan's 750 a month ($12). The free plan covers 1 review of up to 50 records, enough to pilot your criteria. See [pricing](/pricing).

**Limits:** AI extraction reads abstracts, not full texts, so verify against the paper. There is no meta-analysis or forest plot; pool effects in R, Stata or RevMan (see [systematic review vs meta-analysis](/blog/systematic-review-vs-meta-analysis)). There is no automatic stopping rule; decide yours in the protocol. Kappa is a point value without a confidence interval.

## FAQ

### Can AI do a systematic review?

No, not on its own. AI can speed up parts of a systematic review: drafting search terms, removing duplicates, ranking records so relevant ones come first, suggesting include or exclude decisions and pulling data into a table. The review team still sets the question and criteria, makes the inclusion decisions, judges risk of bias and interprets the results. Cochrane, Campbell, JBI and CEE all say authors remain responsible.

### How do I report AI use in a systematic review?

PRISMA 2020 asks you to give details of any automation tools used in study selection (item 8) and data collection (item 9). The 2025 joint position statement from Cochrane, Campbell, JBI and CEE adds: name the tool, version and dates; say which stages it affected and why; describe how you validated and checked its output; and state its limitations. Plan this in your protocol, not after.

### Is AI screening accurate enough for a systematic review?

Using AI to change the order in which you screen records is the best-supported use. A 2015 systematic review of text-mining methods found screening workload savings of roughly 30% to 70%, sometimes with about 5% of relevant studies missed. Using AI to exclude records without a human check carries more risk. Validate it on your own data and keep a human screener on every record you exclude.

### Is ASReview free?

Yes. ASReview is open-source software developed at Utrecht University and released under the Apache 2.0 license, so you can download and use it without paying. It uses active learning: you label records relevant or not relevant and the model re-ranks the rest so likely includes come first. It also has a simulation mode for testing how well a model would have performed on a labeled dataset.

### Can AI replace the second reviewer in a systematic review?

Some tools let AI act as the second screener, and early evidence suggests it can be used cautiously. Cochrane requires two people to decide independently on final inclusion, so check your target journal and review group's rules before relying on it. If you use AI as a second reviewer, say so in the methods and report agreement as human versus AI, not as two independent human reviewers.

## Next steps

- The method, step by step: [what is a systematic review](/blog/what-is-a-systematic-review).
- Report screening agreement: [Cohen's kappa for screening](/blog/cohens-kappa-inter-rater-reliability).
- Draw the flow diagram, including automation boxes: [how to make a PRISMA flow diagram](/blog/how-to-make-a-prisma-flow-diagram).
- Not sure you need a full systematic review: [scoping review vs systematic review](/blog/scoping-review-vs-systematic-review).

## Sources

1. Flemyng, E., Noel-Storr, A., Macura, B., Gartlehner, G., Thomas, J., Meerpohl, J. J., et al. (2025). Position statement on artificial intelligence (AI) use in evidence synthesis across Cochrane, the Campbell Collaboration, JBI, and the Collaboration for Environmental Evidence 2025. *JBI Evidence Synthesis, 23*(11), 2162–2166. https://doi.org/10.11124/JBIES-25-00480 ; Cochrane news: https://www.cochrane.org/about-us/news/setting-standards-responsible-ai-use-evidence-synthesis
2. O'Mara-Eves, A., Thomas, J., McNaught, J., Miwa, M., & Ananiadou, S. (2015). Using text mining for study identification in systematic reviews: a systematic review of current approaches. *Systematic Reviews, 4*, 5. https://doi.org/10.1186/2046-4053-4-5
3. Covidence. Home page and "Let machine learning find the randomized controlled trials faster." https://www.covidence.org/ ; https://www.covidence.org/let-machine-learning-find-the-randomized-controlled-trials-faster/ (checked November 2026)
4. Covidence Support. AI feature: Most relevant sorting. https://support.covidence.org/help/ai-feature-most-relevant-sorting (checked November 2026)
5. ASReview. https://asreview.nl/ ; source code and license: https://github.com/asreview/asreview (checked November 2026)
6. Rayyan. https://www.rayyan.ai/ (checked November 2026)
7. Rayyan. Pricing. https://www.rayyan.ai/pricing (checked November 2026)
8. van de Schoot, R., de Bruin, J., Schram, R., et al. (2021). An open source machine learning framework for efficient and transparent systematic reviews. *Nature Machine Intelligence, 3*, 125–133. https://doi.org/10.1038/s42256-020-00287-7
9. Elicit Help Center. Systematic Reviews in Elicit. https://support.elicit.com/en/articles/7927169 (checked November 2026)
10. Elicit. Systematic literature reviews. https://elicit.com/solutions/literature-review (checked November 2026)
11. Page, M. J., McKenzie, J. E., Bossuyt, P. M., et al. (2021). The PRISMA 2020 statement: an updated guideline for reporting systematic reviews. *BMJ, 372*, n71. https://doi.org/10.1136/bmj.n71
12. Page, M. J., Moher, D., Bossuyt, P. M., et al. (2021). PRISMA 2020 explanation and elaboration: updated guidance and exemplars for reporting systematic reviews. *BMJ, 372*, n160. https://doi.org/10.1136/bmj.n160
