---
title: "DBLP Search: A Guide to Computer Science Literature Search"
slug: "dblp-computer-science-literature-search"
description: "DBLP search explained: what the dblp computer science bibliography holds, search operators, author and venue pages, BibTeX export and a CS literature workflow."
primary_keyword: "dblp search"
secondary_keywords: ["dblp", "dblp computer science bibliography", "computer science literature search", "dblp bibtex", "dblp api", "find conference papers computer science"]
cluster: "P. Research by field"
pillar: "/blog/ai-for-qualitative-research"
author: "Mubarak"
compares_tools: false
published: "2026-11-13"
updated: "2026-11-13"
faq:
  - q: "What is DBLP?"
    a: "DBLP is a free, open bibliography of computer science publications: journal articles, conference and workshop papers, books and theses. It was started at the University of Trier in 1993 and is now run by Schloss Dagstuhl, the Leibniz Center for Informatics. It holds bibliographic metadata and links to the publisher's page, not full texts or abstracts, and its data are released under a CC0 license."
  - q: "Does DBLP have abstracts or full text?"
    a: "No. DBLP records hold metadata: authors, title, venue, year, pages and links such as a DOI or the publisher's page. To read an abstract or the paper, follow the link to the publisher, an open-access copy or arXiv. Use other indexes, such as Semantic Scholar or OpenAlex, when you need abstracts or citation counts."
  - q: "How do I search DBLP for an exact word?"
    a: "Add a dollar sign after the word. DBLP treats search terms as prefixes by default, so 'graph' also matches 'graphics'; 'graph$' matches only the whole word. Words separated by spaces are combined with AND, and a pipe symbol between words means OR, as in 'graph|network'. Check the search help page, because some operators have been disabled at times."
  - q: "How do I get BibTeX from DBLP?"
    a: "Open the record or an author's page and use the export option next to the entry to download BibTeX. DBLP's BibTeX is consistent across venues, which is why many computer scientists prefer it to publisher exports. Check the key and the venue name before you cite, and replace a preprint entry with the published version when one exists."
  - q: "Is DBLP enough for a computer science literature review?"
    a: "Not on its own. DBLP is very good for finding what was published at which venue and by whom, but it has no abstracts, no citation counts and limited coverage of preprints and work outside computer science venues. Combine it with arXiv for recent preprints, a citation index such as Semantic Scholar or OpenAlex for abstracts and citations, and citation snowballing from key papers."
---

# DBLP search: how to use the dblp computer science bibliography

*Last updated: 13 November 2026*

A DBLP search finds computer science papers by title words, author or venue in the dblp computer science bibliography, a free index of journal articles, conference papers and books in the field. DBLP gives you clean metadata, author pages and BibTeX, but no abstracts or full text. Use it to map who published what at which venue, then follow its links to read the papers and combine it with arXiv and a citation index for a complete search.

This guide is for computer science students and researchers, and for anyone in a neighboring field who needs conference papers. It is part of our series on [research by field](/blog/ai-for-qualitative-research).

## What is DBLP?

**DBLP is an open bibliographic database of computer science publications, started at the University of Trier in 1993 and now operated by Schloss Dagstuhl, the Leibniz Center for Informatics** [1]. Its records are curated: venues are added deliberately, and author names are disambiguated by hand where needed. In late 2026 it listed more than 8 million publications [1]. <!-- VERIFY: current publication count on the dblp home page statistics -->

All DBLP metadata are released as open data under the CC0 1.0 license, and monthly XML snapshots are archived with DOIs [2]. <!-- VERIFY: CC0 license and monthly snapshot releases on Dagstuhl DROPS -->

### What DBLP holds, and what it does not

| DBLP holds | DBLP does not hold |
| --- | --- |
| Authors, title, venue, year, volume, pages | Abstracts |
| Links to the electronic edition (DOI, publisher page, open-access copy) | Full texts |
| Journals, conference and workshop proceedings, books, theses, some preprints (CoRR, arXiv's CS section) | Citation counts or "cited by" lists |
| Author pages with co-authors and venues | Most work published outside computer science venues |
| Venue pages with tables of contents by year | Peer-review status beyond the venue itself |
| BibTeX and other exports | Rankings of venues or papers |

<!-- VERIFY: dblp coverage of CoRR/arXiv preprints and of theses -->

The practical consequence: DBLP tells you that a paper exists and where it appeared. It does not tell you what the paper found or how influential it is.

## Why computer scientists use DBLP

In computer science, many important results appear first or only in conference proceedings. General indexes cover these unevenly, and author names in CS are often shared by many people. DBLP's strengths fit that problem:

- **Venue completeness.** For indexed venues, DBLP lists the full table of contents of each edition, so you can scan every paper at a conference in a given year.
- **Author disambiguation.** Common names are split into separate author pages; homonymous authors get a numeric suffix such as "0001" so each page means one person. <!-- VERIFY: dblp homonym numbering format -->
- **Consistent BibTeX.** Entries follow one format across venues.

## How to search DBLP

The search box on dblp.org searches titles, authors and venues at once. Results are grouped into authors, venues and publications, and you can refine publications by type, venue and year on the results page.

### Search operators

| Operator | Meaning | Example |
| --- | --- | --- |
| Space | AND: all words must match | `federated learning privacy` |
| Prefix (default) | Each term matches the start of a word, case-insensitive | `sig` matches "SIGIR" and "signal" |
| `$` after a word | Exact word only | `graph$` matches "graph", not "graphics" |
| `\|` between words | OR | `graph\|network` |

These operators come from DBLP's search FAQ [3]. The FAQ also notes that the phrase operator and the NOT operator have been disabled at times for technical reasons, and that a search shows at most 1,000 results, so narrow the query rather than paging through [3]. <!-- VERIFY: current status of phrase (.) and NOT (-) operators, and the 1,000-result cap -->

### Search tips

1. **Use `$` for short or common words.** Without it, `LLM` also matches longer tokens beginning with those letters; `LLM$` does not.
2. **Search the author, then open the author page.** The search result for a person is a list of candidate pages. Check co-authors and affiliations to pick the right one before you trust the publication list.
3. **Browse venues by year.** For "what did ICSE publish on test generation in 2025?", open the venue page, choose the year and scan the table of contents, or search the topic words and filter by that venue.
4. **Use OR for synonyms.** `explainab|interpretab` catches "explainability", "explainable", "interpretability" and "interpretable" because of prefix matching.
5. **Export as you go.** Save BibTeX for each paper you keep, or select several and export them together. <!-- VERIFY: dblp bulk export from search results -->

### The DBLP API

DBLP offers a free search API that returns JSON or XML, with separate endpoints for publications, authors and venues, for example `https://dblp.org/search/publ/api?q=...&format=json` [4]. <!-- VERIFY: API endpoint paths, parameters (q, format, h, f) and maximum hits per request --> It is useful for logging a search reproducibly or pulling a venue's papers into a spreadsheet. Respect the service's rate limits; heavy use should go through the XML snapshot instead.

## Combining DBLP with arXiv and Semantic Scholar

No single index covers computer science. A sound search uses three kinds of source:

| Source | What it adds | Gap it fills in DBLP |
| --- | --- | --- |
| DBLP | Clean venue and author metadata, BibTeX | (Baseline) |
| arXiv | Recent preprints with full text, often months before the proceedings | Recency and full text |
| Semantic Scholar or OpenAlex | Abstracts, citation links, "cited by" lists across fields | Abstracts, citations, interdisciplinary work |

When the same paper appears as an arXiv preprint and as a conference paper, cite the published version and check whether results changed between versions.

## A computer science literature search workflow

1. **Write the question and key terms.** List synonyms, including older terms (a 2015 paper may say "deep neural network" where a 2025 paper says "foundation model").
2. **Identify the core venues.** Which three to six conferences and journals publish on your topic? Ask your supervisor, and look at where the papers you already know appeared.
3. **Search DBLP by topic and venue.** Use `$` and `|` to tune the query, filter to the core venues and years, and export BibTeX for candidates.
4. **Scan tables of contents.** For the most important venue and the last three to five years, read every title. Topic searches miss papers with unusual titles.
5. **Search a citation index for abstracts.** Run the same terms in Semantic Scholar or OpenAlex to read abstracts and catch work at venues outside your core list.
6. **Search arXiv for recent work.** Limit to the last 12 to 18 months and the relevant CS categories.
7. **Snowball.** For each key paper, follow references backward and citing papers forward; see [citation snowballing](/blog/citation-snowballing).
8. **Deduplicate and log.** Merge preprint and published versions, and record each source, query, date and number of results. For a formal review, see [systematic review search strategy](/blog/systematic-review-search-strategy).

### A worked example (invented)

Example (invented for illustration): a master's student is writing related work for a paper on energy-efficient inference for small language models on phones.

- Core venues, agreed with her supervisor: MobiSys, MobiCom, SenSys and EuroSys.
- DBLP query `energy|power inference language model$|LLM$` returns 640 publications; filtering to the four venues and 2021 to 2026 leaves 38. She exports BibTeX for 21.
- Scanning the MobiSys tables of contents for 2024 to 2026 adds 4 papers whose titles did not contain her terms.
- Semantic Scholar adds 9 relevant papers from venues outside her list, including two workshops.
- arXiv adds 7 preprints from the last year; 2 of them were later published at MobiCom, so she cites those versions.
- Snowballing from the 5 closest papers adds 6 more. Her related-work set is 21 + 4 + 9 + 5 + 6 = 45 papers, with a search log.

## Common mistakes

- **Trusting the first author page.** Common names have many pages; check co-authors.
- **Searching DBLP alone.** You miss abstracts, citation context and work outside CS venues.
- **Citing the preprint when a published version exists.** Reviewers notice, and results may have changed.
- **Forgetting prefix matching.** Short terms match many unrelated words; add `$`.
- **No search log.** You cannot say later what you searched, which weakens a related-work section or review.

## DBLP in AI for Research

DBLP is one of the paper sources in Find Papers and in Deep Research. In [Find Papers](/features/paper-search), searching with the DBLP source is free (0 credits), alongside sources that cover 250M+ scholarly works; save results to your Library and export references in 10,000+ citation styles. In [Deep Research](/features/deep-research), add DBLP to a run to have the report draw on computer science venues; the run costs credits by depth: Summary 1, Deep 15. DBLP records have no abstracts, so pair it with All papers or Preprints in the same run when you need the report to say what papers found. <!-- VERIFY: Deep Research lets DBLP be combined with other source groups in one run -->

<!-- SCREENSHOT: Find Papers with the DBLP source selected, results filtered by year, showing venue names -->

When you turn the reading into a paper, our guide to [how to write a conference paper](/blog/how-to-write-a-conference-paper) covers structure and page limits, and the [engineering and computing](/fields/engineering-and-computing) page lists the other tools for the field. The Free plan has 45 credits a month; see [pricing](/pricing).

## FAQ

### What is DBLP?

DBLP is a free, open bibliography of computer science publications: journal articles, conference and workshop papers, books and theses. It was started at the University of Trier in 1993 and is now run by Schloss Dagstuhl, the Leibniz Center for Informatics. It holds bibliographic metadata and links to the publisher's page, not full texts or abstracts, and its data are released under a CC0 license.

### Does DBLP have abstracts or full text?

No. DBLP records hold metadata: authors, title, venue, year, pages and links such as a DOI or the publisher's page. To read an abstract or the paper, follow the link to the publisher, an open-access copy or arXiv. Use other indexes, such as Semantic Scholar or OpenAlex, when you need abstracts or citation counts.

### How do I search DBLP for an exact word?

Add a dollar sign after the word. DBLP treats search terms as prefixes by default, so "graph" also matches "graphics"; "graph$" matches only the whole word. Words separated by spaces are combined with AND, and a pipe symbol between words means OR, as in "graph|network". Check the search help page, because some operators have been disabled at times.

### How do I get BibTeX from DBLP?

Open the record or an author's page and use the export option next to the entry to download BibTeX. DBLP's BibTeX is consistent across venues, which is why many computer scientists prefer it to publisher exports. Check the key and the venue name before you cite, and replace a preprint entry with the published version when one exists.

### Is DBLP enough for a computer science literature review?

Not on its own. DBLP is very good for finding what was published at which venue and by whom, but it has no abstracts, no citation counts and limited coverage of preprints and work outside computer science venues. Combine it with arXiv for recent preprints, a citation index such as Semantic Scholar or OpenAlex for abstracts and citations, and citation snowballing from key papers.

## Learn more

- Writing up what you found: [how to write a conference paper](/blog/how-to-write-a-conference-paper).
- Following references both ways: [citation snowballing](/blog/citation-snowballing).
- A documented search for a formal review: [systematic review search strategy](/blog/systematic-review-search-strategy).
- Tools for the field: [engineering and computing](/fields/engineering-and-computing).

## Sources

1. dblp computer science bibliography. About dblp. https://dblp.org/ <!-- VERIFY: about page URL and statistics -->
2. Schloss Dagstuhl. dblp monthly snapshot XML releases (CC0 1.0). https://drops.dagstuhl.de/ <!-- VERIFY: snapshot collection URL -->
3. dblp. FAQ: How to use the dblp search? https://dblp.org/faq/1474589
4. dblp. FAQ: How to use the dblp search API? https://dblp.org/faq/ <!-- VERIFY: exact API FAQ URL -->
