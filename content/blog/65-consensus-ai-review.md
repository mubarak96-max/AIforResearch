---
title: "Consensus AI Review: What It Does Well and Where It Stops"
slug: "consensus-ai-review"
description: "Consensus AI review, checked November 2026: how its search and Consensus Meter work, what Free, Pro and Deep plans include, and where you need other tools."
primary_keyword: "consensus ai"
secondary_keywords: ["consensus ai for research", "consensus ai search engine", "consensus search engine", "consensus meter", "is consensus ai free", "is consensus ai accurate", "consensus ai vs elicit"]
cluster: "H. Research tools compared"
pillar: "/blog/best-ai-for-deep-research"
author: "Mubarak"
compares_tools: true
published: "2026-11-12"
updated: "2026-11-12"
faq:
  - q: "Is Consensus AI free?"
    a: "Yes, there is a free plan. As checked in November 2026, Consensus's help center lists unlimited Papers searches, 10 Pro messages, 3 Deep reviews and 10 Study Snapshots a month on Free. Pro costs $20 a month or $144 a year and removes the Pro message and Snapshot caps. Prices change, so check the pricing page before you budget."
  - q: "Is Consensus AI accurate?"
    a: "It is accurate at finding real papers, because answers are built from search results and cite them. The weak point is interpretation. Consensus itself says a model can misread a paper and summarize it wrongly, and it estimated that the original Consensus Meter misclassified about 10% of results. Open the papers behind any finding you plan to quote."
  - q: "What is the Consensus Meter?"
    a: "The Consensus Meter is a summary that appears when you ask a yes-or-no research question. It sorts relevant papers into positions such as yes, possibly or no, plus a mixed position added in version 2.0. A Snapshot view adds the average publication year, the number of meta-analyses, systematic reviews and RCTs, journal scores and citations for each position."
  - q: "Consensus AI vs Elicit: which should I use?"
    a: "Use Consensus for quick, cited answers to a focused question and a fast sense of where studies point. Use Elicit when the deliverable is a structured table: its Pro plan, $49 a user a month billed annually as checked in November 2026, includes a systematic review workflow that screens up to 5,000 papers. Many researchers use both at different stages."
  - q: "Can Consensus write my literature review?"
    a: "Consensus Deep reviews produce a long, cited synthesis of a question, which is a useful starting map. It is not a finished literature review. You still need to define scope, check that each cited paper says what the summary claims, weigh study quality, and write the argument in your own structure, usually in a document editor with your reference manager."
---

# Consensus AI review: what it does well and where it stops

*Last updated: 12 November 2026*

Consensus AI is a search engine for peer-reviewed research that answers questions with summaries cited to real papers. It is strongest on focused yes-or-no questions, where its Consensus Meter shows how studies split. It is free to start. It stops short of the later stages of research: weighing evidence for you, screening for a systematic review, and writing the final document.

This review is for students, researchers and evidence-minded professionals deciding whether Consensus fits their workflow. It is part of our comparison of [the best AI for deep research](/blog/best-ai-for-deep-research). All facts about Consensus were checked on its own pages in November 2026.

## What is Consensus AI?

**Consensus AI is an academic search engine that uses language models to find, rank and summarize peer-reviewed papers, citing every source it uses.** It describes itself as "an AI academic search engine for peer-reviewed literature" and says it searches 400M+ scientific papers [1].

Consensus says its corpus comes from four places: Semantic Scholar, OpenAlex, its own web crawl and direct publisher partnerships for full text [2]. That mix matters. Papers that are in those indexes can be found; books, many reports and some humanities work often are not.

### How does the Consensus AI search engine work?

Consensus describes search as three steps [2]:

1. A hybrid of semantic search and keyword (BM25) search narrows the corpus to candidate papers.
2. The top 1,500 candidates are re-ranked using quality signals such as recency, citation count and journal reputation.
3. A larger model re-ranks the top 20 papers, which feed the answer.

The company states, "We only use AI after we search the scientific literature" [2]. In practice this means the answer is grounded in papers that exist. It does not guarantee the summary of each paper is right, a point Consensus makes itself (see "Is Consensus AI accurate?" below).

### Main features as of November 2026

| Feature | What it does | Source |
| --- | --- | --- |
| Pro Search | Synthesized, cited answer to a question | [1] |
| Deep Search / Deep review | Longer synthesis built from several searches | [1], [3] |
| Consensus Meter | Shows how studies split on a yes-or-no question | [1], [4] |
| Study Snapshots | Key findings and method of one paper | [1] |
| Ask Paper | Chat with a single paper | [1] |
| Citation Graph | Shows how papers relate | [1] |
| Collections | Organize saved papers | [1] |
| Export | RIS, BibTeX and CSV | [1] |

Consensus also offers search filters, including study design and sample size <!-- VERIFY: filter list on help.consensus.app/en/articles/9922799 (page returned 403 to our checker) -->.

## What does Consensus do well?

Consensus is good at the first hour of a research question: getting from a plain-language question to a short list of relevant, real papers with a cited summary.

- **Cited answers you can open.** Every response includes citations so you can trace each point to its paper [2]. That is the minimum bar for academic use, and Consensus meets it by design.
- **Plain-language questions.** You can type "Does creatine improve cognitive performance?" rather than build a Boolean string [4].
- **A quick read on agreement.** The Consensus Meter gives a fast sense of whether studies lean one way, which helps you decide whether a question is settled, contested or thin.
- **Reference manager exports.** RIS, BibTeX and CSV export means results move into Zotero, Mendeley or EndNote without retyping [1].
- **A usable free plan.** Unlimited Papers searches on Free make it a low-risk first stop [3].

## What is the Consensus Meter, and how should you read it?

**The Consensus Meter is a summary bar that appears for yes-or-no research questions and shows how many relevant papers point to yes, no, possibly or mixed.** It is an orientation tool, not a verdict.

When Consensus launched the meter, it was open about its limits [5]:

- It ran over the first 20 results and only classified results judged relevant.
- It used word-for-word quotes from papers, shown beneath the meter with their labels.
- It estimated the model "will incorrectly classify results 10% of the time".
- Every paper counted the same, whether a case report or a meta-analysis.

Version 2.0, announced in February 2025, added a "Mixed" position and a Consensus Snapshot table [4]. For each position, the Snapshot shows the average publication date, the count of meta-analyses, systematic reviews and RCTs, the average journal SJR score, and the total citations. Unlimited Snapshot use needs a paid plan [4].

### A worked example of reading the meter

*Example (invented numbers, for illustration).* You ask, "Does intermittent fasting reduce HbA1c in adults with type 2 diabetes?" The meter shows 12 relevant papers: 7 yes, 3 possibly, 2 no.

Do not read that as "58% of the evidence says yes". Open the Snapshot and the papers:

1. Check the design mix per position. If the 7 "yes" papers are small pilot studies and the 2 "no" papers are RCTs, the balance of evidence may favor "no".
2. Check the population. A "yes" from a study of adults with prediabetes does not answer a question about type 2 diabetes. Consensus's own guardrails post gives a similar example, a children's study classified for an adult question [5].
3. Check effect size. Two studies can both be "yes" with very different clinical meaning: a 0.1-point and a 0.8-point HbA1c drop.
4. Check what's missing. Twelve papers from one search is a sample, not a review.

**A count of studies is not a weight of evidence.** For how to weigh designs, see [levels of evidence and study types](/blog/levels-of-evidence-and-study-types).

## Is Consensus AI free? Plans and prices (checked November 2026)

Yes. The free plan is enough to try the search and the meter. These are the plans listed in Consensus's help center, in an article dated 12 September 2026 and checked on 12 November 2026 [3]:

| Plan | Price | Pro messages | Deep reviews a month | Study Snapshots |
| --- | --- | --- | --- | --- |
| Free | $0 | 10 a month | 3 | 10 a month |
| Pro | $20/month or $144/year ($12/month) | Unlimited | 15 | Unlimited |
| Deep | $65/month or $540/year ($45/month) | Unlimited | 200 | Unlimited |
| Teams | Custom, by team size | Unlimited | 50 per user | Unlimited |
| Enterprise | Custom quote, 200+ users | All Team features | | |

All plans include unlimited Papers searches [3]. The pricing page [6] did not render plan details for our checker, so confirm prices there before you buy <!-- VERIFY: prices on consensus.app/pricing match the help-center article -->. Ask your library whether your university already has a Consensus license.

### Which plan fits?

- **Free:** an undergraduate checking a few questions a month.
- **Pro:** a graduate student who searches most days and wants unlimited Snapshots.
- **Deep:** someone running many long Deep reviews, such as a consultant or a research team member who produces evidence briefs weekly.

## Is Consensus AI accurate?

It is accurate at citing real papers and less reliable at summarizing them. Consensus says hallucinated sources are ruled out by its design, but that a model "can misinterpret a paper and summarize it incorrectly" [2]. Its meter post estimated a 10% misclassification rate for the original version [5].

Three habits make Consensus output safe to use:

1. **Open every paper you will cite.** Read the abstract and the results section, not just the snippet.
2. **Check the population and outcome** against your question, the most common source of a wrong "yes".
3. **Search for the opposite.** Rephrase the question ("Does X increase Y?" and "Does X not affect Y?") and compare.

## Consensus AI vs Elicit

Consensus and Elicit overlap on search but aim at different outputs.

| | Consensus | Elicit |
| --- | --- | --- |
| Best at | Fast cited answers; how studies split on yes/no questions | Structured extraction tables; systematic review screening |
| Index (vendor figure) | 400M+ papers [1] | 138M+ papers [7] |
| Free plan | Unlimited Papers searches, capped Pro and Deep [3] | Unlimited search and summaries, limited reports [7] |
| Entry paid plan | Pro $20/month or $144/year [3] | Pro $49/user/month billed annually ($588/year) [7] |
| Review workflow | Deep reviews (synthesis) | Pro screens up to 5,000 papers [7] |

If your next step is a data extraction table, start in Elicit. If your next step is deciding whether a question is worth pursuing, start in Consensus.

## Where does Consensus stop?

Consensus is a search and synthesis tool. As checked on its pages in November 2026, these jobs sit outside what it describes:

- **Weighing evidence.** The meter and Snapshot give you inputs (design counts, journal scores). The judgment about which studies carry weight is yours.
- **Systematic review management.** Its pages do not describe dual screening with conflict resolution, inter-rater agreement or a PRISMA 2020 flow diagram, which journals expect for a systematic review [8] <!-- VERIFY: confirm Consensus has not added a screening workflow -->.
- **Writing the document.** Deep reviews are a starting synthesis, not a thesis chapter or manuscript in your structure and citation style.
- **Your own PDFs and grey literature.** Its homepage does not describe uploading your own files <!-- VERIFY: whether Consensus supports PDF upload -->. Agency reports and theses outside its index will not appear.
- **Non-yes/no questions on the meter.** "How do nurses experience night shifts?" is a good research question, but it has no yes-or-no answer, so the meter will not appear.

## Using Consensus with AI for Research

You don't have to choose one tool. A common split: scope a question in Consensus, then do the cited reading, reviewing and writing in a workspace that keeps your sources and draft together. The full side-by-side is on our [Consensus alternative](/alternatives/consensus) page. Here is what AI for Research adds, with credit costs as of 12 November 2026.

1. **Bring your Consensus results in.** Export RIS from Consensus. Import it into a systematic review in AI for Research (RIS, BibTeX, CSV and PubMed .nbib are accepted), or keep papers in My Library.
2. **Ask the question again with study-level labels.** [Deep Research](/tools/deep-research) searches All papers, Medical (PubMed, Europe PMC), Preprints, Web or your Library, reads open full texts found through Unpaywall, and writes a cited answer. Its consensus line ("2 of 4 studies that test the question support it") is counted from a label on each cited study, and you can open every study in the Cited tab. Summary costs 1 credit, Deep 15, Detailed 45 (paid plans).
3. **Filter by design before you read.** [Find Papers](/features/paper-search) filters by study type, year, journal quality tier, citations and open access, and leaves out retracted papers by default. It costs 0 credits.
4. **Check claims in your draft.** Claim check takes a paragraph, splits it into up to 10 claims and shows whether cited studies support each one: supported, partly supported, not supported or no evidence (2 credits). [Citation check](/features/citation-checker) confirms each reference exists and flags retractions (0 credits).
5. **Write with live citations.** Open a result in the editor, draft with cited autocomplete and export to Word, PDF or LaTeX in any of 10,000+ citation styles.

<!-- SCREENSHOT: Deep Research result showing the consensus line and the Cited tab with study-type labels -->

**Honest limits:** AI for Research does not search Google Scholar or Scopus, and when no open full text exists it reads the abstract. Its consensus line is a count too: it tells you where studies point, not how much each one should weigh. The free plan gives 45 credits a month; Plus is $12 a month for 750 credits. See [pricing](/pricing).

## FAQ

### Is Consensus AI free?

Yes, there is a free plan. As checked in November 2026, Consensus's help center lists unlimited Papers searches, 10 Pro messages, 3 Deep reviews and 10 Study Snapshots a month on Free. Pro costs $20 a month or $144 a year and removes the Pro message and Snapshot caps. Prices change, so check the pricing page before you budget.

### Is Consensus AI accurate?

It is accurate at finding real papers, because answers are built from search results and cite them. The weak point is interpretation. Consensus itself says a model can misread a paper and summarize it wrongly, and it estimated that the original Consensus Meter misclassified about 10% of results. Open the papers behind any finding you plan to quote.

### What is the Consensus Meter?

The Consensus Meter is a summary that appears when you ask a yes-or-no research question. It sorts relevant papers into positions such as yes, possibly or no, plus a mixed position added in version 2.0. A Snapshot view adds the average publication year, the number of meta-analyses, systematic reviews and RCTs, journal scores and citations for each position.

### Consensus AI vs Elicit: which should I use?

Use Consensus for quick, cited answers to a focused question and a fast sense of where studies point. Use Elicit when the deliverable is a structured table: its Pro plan, $49 a user a month billed annually as checked in November 2026, includes a systematic review workflow that screens up to 5,000 papers. Many researchers use both at different stages.

### Can Consensus write my literature review?

Consensus Deep reviews produce a long, cited synthesis of a question, which is a useful starting map. It is not a finished literature review. You still need to define scope, check that each cited paper says what the summary claims, weigh study quality, and write the argument in your own structure, usually in a document editor with your reference manager.

## Next steps

- Compare Consensus with the other options in [the best AI for deep research](/blog/best-ai-for-deep-research).
- Read our [SciSpace review](/blog/scispace-review) if you also need chat with PDF.
- Learn to test a single statement in [how to check a claim against the research](/blog/how-to-check-a-claim-against-the-research).

## Sources

1. Consensus. Homepage: features, 400M+ papers. https://consensus.app/ (checked November 2026)
2. Consensus. How it works and Consensus FAQs. https://consensus.app/home/blog/how-consensus-works/ (checked November 2026)
3. Consensus Help Center. Subscription plans (dated 12 September 2026). https://intercom.help/consensus-d118a252369c/en/articles/10087865-subscription-plans (checked November 2026)
4. Consensus. Introducing: Consensus Meter 2.0. https://consensus.app/home/blog/new-consensus-meter/ (checked November 2026)
5. Consensus. Consensus Meter: guardrails and limitations. https://consensus.app/home/blog/consensus-meter/ (checked November 2026)
6. Consensus. Pricing. https://consensus.app/pricing/ (checked November 2026)
7. Elicit. Pricing. https://elicit.com/pricing (checked November 2026)
8. Page, M. J., et al. (2021). The PRISMA 2020 statement: an updated guideline for reporting systematic reviews. *BMJ, 372*, n71. https://doi.org/10.1136/bmj.n71
