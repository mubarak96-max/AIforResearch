---
title: "How to Fact-Check AI: 7 Steps for ChatGPT, Gemini, Claude"
slug: "how-to-fact-check-ai"
description: "How to fact-check AI-generated content in 7 steps: verify sources exist, match claims, check numbers, quotes and dates. With a worked example."
primary_keyword: "how to fact check ai"
secondary_keywords: ["how to fact check ai content", "how to fact check chatgpt", "how to fact check ai generated content", "how to fact check ai responses"]
cluster: "B. Fact-checking"
pillar: "/blog/ai-fact-checker"
author: "[AUTHOR NAME]"
published: "2026-11-06"
updated: "2026-11-06"
faq:
  - q: "Does ChatGPT make up sources?"
    a: "It can, and it has been documented doing so. In a 2023 study in Scientific Reports, 55% of GPT-3.5's citations and 18% of GPT-4's were fabricated. Newer models and web search reduce the rate, but any citation an AI tool gives you from memory can be invented. Check that every source exists and says what the AI claims before you use it."
  - q: "How do I verify an AI citation?"
    a: "Look it up independently. Paste the DOI after https://doi.org/ and confirm the title, authors and year match. With no DOI, search the exact title in Google Scholar or Crossref. For a book, search a library catalog. For a web page, open the URL or check the Wayback Machine. Then read the passage to confirm it supports the claim."
  - q: "Can I trust AI summaries of PDFs?"
    a: "Only as a map, not as a source. AI summaries of PDFs can miss qualifications, merge separate findings or misstate numbers. Use a tool that gives page numbers for each answer, open the page, and quote or cite the document itself. Be most careful with tables, footnotes and scanned pages, where extraction errors are common."
  - q: "Can I ask ChatGPT to fact-check its own answer?"
    a: "You can, but don't rely on it. A model checking its own output often repeats the same error or invents a supporting source. Ask it instead to list the claims it made and what source would confirm each one. Then do the checking yourself against independent sources, using the seven steps in this guide."
  - q: "How long does it take to fact-check AI content?"
    a: "Plan on a few minutes per checkable claim, more for studies you need to read. A 500-word AI answer often contains 10 to 20 checkable claims. Checking citations is fastest because a DOI either resolves or it doesn't. Quotes and context take longest. The fact sheet in step 7 keeps you from checking the same thing twice."
---

# How to fact-check AI-generated content (ChatGPT, Gemini, Claude)

*Last updated: 6 November 2026*

To fact-check AI content, follow seven steps: pull out every checkable claim, confirm each cited source exists, confirm the source says what the AI claims, check numbers and dates against the primary source, treat every quote as fake until proven real, check whether the information is current, and record what you checked. It works for ChatGPT, Gemini, Claude and any other chatbot.

This guide is part of our series on [AI fact checkers and checking every claim in a draft](/blog/ai-fact-checker).

## The 7 steps in one list

1. **Extract** every checkable claim.
2. **Confirm each source exists** (DOI, URL, author, title).
3. **Confirm the source says what the AI claims.**
4. **Check numbers and dates** against the primary source.
5. **Check quotes.** Treat any AI-supplied quote as fake until you find it in a primary source.
6. **Check freshness:** is the information current, given the model's training cutoff?
7. **Record** what you checked, against what, and the result.

## Why AI makes things up: a plain explanation of hallucination

An AI hallucination is a confident statement from an AI model that is false or unsupported, such as an invented quote, statistic or citation.

It happens because of how language models work. A model is trained to predict what text is likely to come next. Asked for a source, it produces something shaped like a source: an author surname common in the field, a journal that publishes on the topic, a plausible year, a DOI-shaped string. Nothing in that process checks a database. When the model has seen a fact many times, the likely text is usually right. When the fact is rare, specific or new, the likely text may simply be invented.

Three things make it worse:

- **Specific requests.** "Give me a statistic about X with a source" pushes the model to produce one, whether or not it knows one.
- **Niche topics.** The less often something appears in training data, the more the model fills gaps.
- **Recent events.** Anything after the training cutoff is unknown unless the tool searches the web.

The documented cases show what's at stake. In *Mata v. Avianca* (2023), lawyers filed a brief citing court decisions that did not exist, produced with ChatGPT, and were sanctioned.[1] In 2025, a Deloitte report for the Australian government contained fabricated references and an invented quote from a court judgment; Deloitte said parts were produced with generative AI and agreed to a partial refund.[2] The same year, a syndicated summer reading list printed by the Chicago Sun-Times recommended books that don't exist.[3]

## Step 1: pull out every checkable claim

Copy the AI's answer into a document and mark every statement that could be true or false. A claim is checkable if a source could confirm or refute it.

| Checkable | Not checkable (but still review) |
| --- | --- |
| "The study included 636 references." | "This is a fascinating area of research." |
| "Published in *Scientific Reports* in 2023." | "Many experts believe…" (vague: ask who) |
| "Fell 12% between 2020 and 2024." | "It's important to consider both sides." |
| "As the mayor said, '…'" | Opinions and recommendations |

Vague claims ("studies show," "experts agree") are a warning sign. Ask the AI which studies and which experts, then check those.

**A prompt that helps:**

```text
List every factual claim in your previous answer as a numbered list.
For each, say what kind of source would confirm it.
Do not add new claims.
```

Then check the list against the original yourself: models miss some of their own claims.

## Step 2: check that each cited source exists (DOI, URL, author)

Look up every source independently. Don't click links the AI generated without checking where they go.

| Source type | How to check it exists |
| --- | --- |
| Journal article with DOI | Paste the DOI after `https://doi.org/`. Confirm the title, authors, journal and year match. |
| Journal article without DOI | Search the exact title in quotes in Google Scholar or [Crossref search](https://search.crossref.org/). |
| Book | Search a library catalog or WorldCat by title and author. Confirm the author wrote it. |
| Web page | Open the URL. If it's dead, check the [Wayback Machine](https://web.archive.org/). A URL that never existed won't be archived. |
| Court case | Search the case name and citation in a legal database or court website. |
| Report | Find it on the publisher's own site, not just a mention elsewhere. |

**Watch for the half-real citation.** The most common pattern is a real author attached to a paper they didn't write, or a real DOI that resolves to an unrelated paper. Studies of ChatGPT references found many fabricated citations used names of authors with relevant publications, pertinent-sounding titles and credible journal formats.[4] Confirm every element, not just that something with that name exists.

## Step 3: check that the source says what the AI claims

A real source is necessary, not sufficient. Open it and find the passage.

- Read the abstract **and** the results. Abstracts simplify.
- Check the scope: the right population, place, years and measure.
- Check the direction: "associated with" is not "causes"; "may reduce" is not "reduces."
- Check that the source is the origin of the claim, not a secondary source repeating it.

If you can't find the passage, the claim is unsupported, even if the source is real.

## Step 4: check numbers and dates against the primary source

Numbers are where AI errors hide in plain sight: transposed digits, the wrong year, a percentage turned into a percentage-point change, a rounded figure presented as exact.

- Find the number in the primary source (the dataset, table or official release), not in a news story about it.
- Check the unit, the base, the date range and the population.
- Recalculate any derived number yourself: percent changes, totals, per-capita figures.
- Check dates against an official record: when a law took effect, when a study was published, when a person held a post.

## Step 5: check quotes; treat any AI-supplied quote as fake until proven real

Chatbots routinely produce quotes that sound right and were never said, or real quotes attributed to the wrong person. Rules:

- **No primary source, no quote.** Find the quote in a transcript, recording, speech text, book page or original article.
- **Check the wording exactly.** Paraphrases inside quote marks are misquotes.
- **Check the context.** A real quote can mean the opposite once you read the sentences around it.
- **Never publish an AI-supplied quote as a quote** from your own reporting.

## Step 6: check freshness (training cutoff)

Every model has a training cutoff: a date after which it knows nothing unless it searches the web. Ask:

- Is this claim about something that changes (prices, office holders, laws, records, "the latest" anything)?
- Did the tool search the web for this answer, and does it show the date of its source?
- Has the study been updated, corrected or retracted since? Check the [Retraction Watch Database](https://retractionwatch.com/the-retraction-watch-database/), which is free.[5]

"The latest models no longer make up citations" is itself a claim that goes stale fast. Check the date of any evidence for it.

## Step 7: record what you checked

Keep a simple log. It saves you re-checking, lets an editor see what's done, and protects you if a claim is challenged.

```text
Claim | Source checked | Exists? | Supports claim? | Result | Date | Checker
```

## Example: one AI-style paragraph checked line by line

The paragraph below is **a fictional example we wrote** in the style chatbots often produce. It mixes a real study, a misstated finding, an invented study and an unsourced quote. The "Hartley and Osei" paper does not exist: we invented it for this exercise.

> AI chatbots are notoriously unreliable with references. A 2023 study in *Scientific Reports* found that 55% of citations produced by GPT-4 were fabricated (Walters & Wilder, 2023). A follow-up by Hartley and Osei (2024) in the *Journal of Information Integrity* found the problem had largely disappeared in newer models. As one university librarian put it, "Every AI citation is guilty until proven innocent."

| # | Claim | Step 2: exists? | Step 3/4: says that? | Verdict |
| --- | --- | --- | --- | --- |
| 1 | Walters & Wilder, *Scientific Reports*, 2023 | Yes. DOI 10.1038/s41598-023-41032-5 resolves to "Fabrication and errors in the bibliographic citations generated by ChatGPT."[6] | Partly. | Real source. |
| 2 | "55% of citations produced by GPT-4 were fabricated" | — | **No.** The paper reports 55% for GPT-3.5 and 18% for GPT-4.[6] | Misstated. Fix to "55% of GPT-3.5's citations and 18% of GPT-4's." |
| 3 | Hartley and Osei (2024), *Journal of Information Integrity* | No match in Google Scholar or Crossref; no DOI. | — | Fabricated in this example. Cut it. |
| 4 | "Problem had largely disappeared in newer models" | Rests on claim 3 | Unsupported | Cut, or replace with a current, sourced finding. |
| 5 | Librarian quote | No named speaker, no source | — | Treat as fake. Cut. |
| 6 | "A 2023 study" | Yes, published September 2023 | Correct | Keep. |

**Corrected version:**

> AI chatbots can be unreliable with references. In a 2023 study in *Scientific Reports*, 55% of citations generated by GPT-3.5 and 18% of those generated by GPT-4 were fabricated (Walters & Wilder, 2023).

Two sentences survive out of four. That ratio is not unusual.

## How WriteGrid makes these checks faster

Steps 2 and 3 take most of the time with AI output. WriteGrid is built to shorten them:

- **Citations come from a real index.** Autocomplete cites the scholarly papers it draws on, and `@`-cite searches 250M+ scholarly works. Each citation links to a real work, so step 2 becomes "open it" rather than "find out if it exists." You still do step 3: read the paper.
- **Ask-a-PDF answers carry page numbers.** Upload a report or study to the Library and use Ask to question that one PDF. Each answer cites the page, so you can check the passage in seconds.
- **Source-quality checks** flag retracted papers, preprints and wrong DOIs among your citations, as comments in the draft.
- **Claim checks** run on the whole draft and leave a comment per claim, which works as the step 7 log.

<!-- SCREENSHOT: WriteGrid Library "Ask" on a single PDF answering "What fabrication rate does this paper report for GPT-4?" with "18% (p. 1, abstract)" and the PDF open to the abstract with the sentence highlighted -->

WriteGrid doesn't check quotes from interviews or claims about recent events beyond what its sources contain; steps 5 and 6 stay with you. The free plan includes 3 review checks a day; see [pricing](/pricing).

## FAQ

### Does ChatGPT make up sources?

It can, and it has been documented doing so. In a 2023 study in *Scientific Reports*, 55% of GPT-3.5's citations and 18% of GPT-4's were fabricated. Newer models and web search reduce the rate, but any citation an AI tool gives you from memory can be invented. Check that every source exists and says what the AI claims before you use it.

### How do I verify an AI citation?

Look it up independently. Paste the DOI after https://doi.org/ and confirm the title, authors and year match. With no DOI, search the exact title in Google Scholar or Crossref. For a book, search a library catalog. For a web page, open the URL or check the Wayback Machine. Then read the passage to confirm it supports the claim.

### Can I trust AI summaries of PDFs?

Only as a map, not as a source. AI summaries of PDFs can miss qualifications, merge separate findings or misstate numbers. Use a tool that gives page numbers for each answer, open the page, and quote or cite the document itself. Be most careful with tables, footnotes and scanned pages, where extraction errors are common.

### Can I ask ChatGPT to fact-check its own answer?

You can, but don't rely on it. A model checking its own output often repeats the same error or invents a supporting source. Ask it instead to list the claims it made and what source would confirm each one. Then do the checking yourself against independent sources, using the seven steps in this guide.

### How long does it take to fact-check AI content?

Plan on a few minutes per checkable claim, more for studies you need to read. A 500-word AI answer often contains 10 to 20 checkable claims. Checking citations is fastest because a DOI either resolves or it doesn't. Quotes and context take longest. The fact sheet in step 7 keeps you from checking the same thing twice.

## Where to go next

For the tools that automate parts of this process and how they compare, return to the [AI fact checker guide](/blog/ai-fact-checker). For the full editorial process, read [how to fact-check an article](/blog/how-to-fact-check-an-article). And if citations are the main problem, see [AI citation generators that point to real sources](/blog/ai-citation-generator).

## Sources

1. *Mata v. Avianca, Inc.*, No. 1:22-cv-01461 (S.D.N.Y. June 22, 2023), opinion and order on sanctions. https://law.justia.com/cases/federal/district-courts/new-york/nysdce/1:2022cv01461/575368/54
2. The Register (2025). Deloitte refunds Aussie gov after AI fabrications slip into $440K welfare report. https://www.theregister.com/2025/10/06/deloitte_ai_report_australia/
3. 404 Media (2025). Chicago Sun-Times prints AI-generated summer reading list with books that don't exist. https://404media.co/chicago-sun-times-prints-ai-generated-summer-reading-list-with-books-that-dont-exist/
4. Gravel, J., D'Amours-Gravel, M., & Osmanlliu, E. (2023). Learning to fake it: limited responses and fabricated references provided by ChatGPT for medical questions. *Mayo Clinic Proceedings: Digital Health*. https://doi.org/10.1016/j.mcpdig.2023.05.004
5. Retraction Watch. The Retraction Watch Database. https://retractionwatch.com/the-retraction-watch-database/
6. Walters, W. H., & Wilder, E. I. (2023). Fabrication and errors in the bibliographic citations generated by ChatGPT. *Scientific Reports*, 13, 14045. https://doi.org/10.1038/s41598-023-41032-5
7. Bhattacharyya, M., et al. (2023). High rates of fabricated and inaccurate references in ChatGPT-generated medical content. *Cureus*. https://pmc.ncbi.nlm.nih.gov/articles/PMC10277170/
