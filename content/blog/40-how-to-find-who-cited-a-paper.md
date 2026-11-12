---
title: "Cited Articles: How to Find Who Cited a Paper (6 Ways)"
slug: "how-to-find-who-cited-a-paper"
description: "Find cited articles fast: how to see who cited a paper in Google Scholar, PubMed, Semantic Scholar, OpenAlex, Scopus and Web of Science, and read the count."
primary_keyword: "cited articles"
secondary_keywords: ["find citations", "find citations of a paper", "find articles citing a paper", "paper citation search", "citation ai", "ai citation", "how to see who cited a paper", "how to find citing articles in pubmed"]
cluster: "I. Finding and checking sources"
pillar: "/blog/levels-of-evidence-and-study-types"
author: "Mubarak"
compares_tools: false
published: "2026-11-12"
updated: "2026-11-12"
faq:
  - q: "How do I see who cited a paper?"
    a: "Search the paper's title in a citation index and open its list of citing articles. In Google Scholar, click the Cited by link under the result. In PubMed, scroll to the Cited by section of the abstract page. Semantic Scholar, OpenAlex, Scopus and Web of Science also list citing papers. Each index covers different journals, so check two for a paper that matters."
  - q: "How do I find citing articles in PubMed?"
    a: "Open the article's abstract page in PubMed and scroll to the Cited by section. It lists PubMed records that cite the article, and a See all link opens the full list as a search you can filter. The list is built from publisher data and NCBI resources, and PubMed says it may not be complete, so check Google Scholar or Europe PMC as well for key papers."
  - q: "Why does a paper have different citation counts in different databases?"
    a: "Each database counts only the citations it can see in the documents it indexes. Google Scholar indexes the widest range, including theses, books and preprints, so its counts are usually highest. Scopus and Web of Science index selected journals, and OpenAlex and Semantic Scholar build their links by matching reference lists, which misses some. None is the true count; report which source you used."
  - q: "Does a high citation count mean a paper is good?"
    a: "No. A citation count measures attention, not quality or correctness. Older papers, review articles and papers in large fields collect more citations. Some citations criticize the work or report a failed replication, and retracted papers keep being cited. Compare counts only between papers of similar age and field, and read the citing papers to see why they cite it."
  - q: "How can I find papers that disagree with a study?"
    a: "Open the list of citing articles and search within it for words such as 'failed to replicate', 'contrary to', 'inconsistent with', 'comment' and 'retraction'. Tools such as Scite classify citation statements as supporting, contrasting or mentioning, which speeds this up. Then read the sentence around each citation: the label is a lead, not a verdict."
---

# How to find who cited a paper: cited articles in six tools

*Last updated: 12 November 2026*

To find who cited a paper, look it up in a citation index and open its list of cited-by articles: the Cited by link in Google Scholar, the Cited by section on a PubMed abstract page, or the citations list in Semantic Scholar, OpenAlex, Scopus or Web of Science. These cited articles differ by index, so check two for an important paper.

This is the quick how-to for one paper. If you need to search citations systematically, round after round, use the method in [citation snowballing](/blog/citation-snowballing). Both are part of our series on finding and checking sources; the pillar guide on [levels of evidence](/blog/levels-of-evidence-and-study-types) helps you judge what you find.

## Why find the articles that cite a paper?

Citing articles tell you what happened to a finding after it was published. **Forward citation searching is the process of finding the newer papers that cite a known paper.** It answers questions a keyword search can't:

- **Has anyone replicated it, or failed to?** A replication cites the original.
- **Has it been criticized, corrected or retracted?** Comments and critiques cite what they criticize.
- **What is the newest work on this exact question?** Recent studies that build on a key paper cite it, whatever words they use.
- **Is there a newer review?** Reviews cite the main studies in their field.

It also protects you. Retracted papers keep getting cited: in one study of retracted dentistry papers, only 5.4% of post-retraction citations mentioned the retraction, and 69.3% cited the work positively [1]. Looking at who cited a paper, and why, is one of the fastest ways to spot trouble before you rely on it.

## How do I see who cited a paper? Cited articles in six places

Use the table to pick where to look. All of them list the articles that cited a paper; they differ in coverage and extras.

| Index | Access | How to see citing articles | Useful extra |
| --- | --- | --- | --- |
| Google Scholar | Free | "Cited by N" link under the result | Search within citing articles; email alerts |
| PubMed | Free | "Cited by" section on the abstract page | Filter the full citing list like any PubMed search |
| Semantic Scholar | Free | Citations list on the paper page | "Highly influential" citation label |
| OpenAlex | Free (web and API) | Cited-by list; API filter `cites:` | Bulk export; open data |
| Scopus | Library subscription | "Cited by" box on the document page | Citation alerts |
| Web of Science | Library subscription | "Times Cited" on the full record | Citation reports and alerts |

### Google Scholar: the Cited by link

1. Search the paper's exact title in quotation marks.
2. Under the result, click **Cited by** followed by the count.
3. Tick **Search within citing articles** and type a key term to narrow a long list.
4. To be told about new citations, click the envelope icon in the left sidebar of the citing list [2].

Google Scholar's coverage is the widest. In a study of 3 million citations to 2,515 highly cited documents, Google Scholar found 88% of all the citations found by any of six sources, and nearly all of those found by the others [3]. The cost is noise: its counts include theses, preprints and other documents that are not peer-reviewed articles.

### PubMed: the Cited by section

Open the article's abstract page and scroll to **Cited by**. For articles with more than five citing records, a "See all" link opens the full list as a search. PubMed builds this list from publisher data and NCBI resources and says it "may not be a complete list" [4]. Because the list opens as a normal search, you can add filters, for example Systematic Review, to find reviews that cite the paper. For the rest of PubMed's interface, see [how to search PubMed](/blog/how-to-search-pubmed).

### Semantic Scholar

Each paper page lists its citations and marks some as **highly influential**: citations where, according to a machine-learning model, the cited paper had a significant impact on the citing one [5]. The label depends on access to the citing paper's full text, so some influential citations are not marked [5]. Use it to rank a long citing list, not as a quality score.

### OpenAlex

OpenAlex is an open index of scholarly works. On the web interface, open a work and follow its cited-by count. Through the free API, `filter=cites:W...` returns every work that cites a given work, which is how many research tools get their citation data [6]. OpenAlex builds its links by matching references, so a work's citing list can be shorter than the true one [6].

### Scopus and Web of Science, through your library

If your university subscribes, these give curated counts. In Scopus, the **Cited by** box on a document's page shows the count and links to citing documents, and **Set citation alert** emails you new ones [7]. In Web of Science, the full record shows **Times Cited**; the default count covers the Core Collection, while the link from the full record combines counts across all its citation indexes, so the two numbers can differ [8]. Both let you export citing records as RIS or CSV.

## A worked example: one paper, five counts

*Example (invented numbers, for illustration).* You look up a 2018 trial of a school-based sleep program. You find:

| Index | Citing articles |
| --- | --- |
| Google Scholar | 412 |
| Semantic Scholar | 301 |
| OpenAlex | 288 |
| Scopus | 246 |
| PubMed Cited by | 131 |

None of these is wrong. They index different documents. For your literature review, you open Google Scholar's list, tick Search within citing articles and type "replication": 9 results, two of them failed replications in 2023 and 2024. You then filter PubMed's citing list to Systematic Review and find a 2025 review that pooled the trial with 14 others. That review, not the 2018 trial, is now the source to cite for "what the evidence shows".

## How do you find citing papers that disagree?

Search inside the citing list for the language of disagreement, then read the sentence around each citation. Most citations just mention a paper in passing; the few that test or challenge it are what you need.

1. Open the full list of citing articles (Google Scholar or PubMed).
2. Search within it for: `replication`, `"failed to replicate"`, `"failed to"`, `"contrary to"`, `"inconsistent with"`, `"in contrast"`, `comment`, `erratum`, `retraction`.
3. Open each hit and find where it cites your paper. Read the sentence and the one after it.
4. Note whether it supports, contrasts with, or only mentions the finding.

**A citation statement is the sentence in a citing paper where the citation appears.** Reading it tells you why the paper was cited.

Scite is built for this step. Its Smart Citations classify each citation statement as supporting, contrasting or mentioning and show the sentence, from over 1.6 billion classified statements, and its Reference Check flags retracted references in a manuscript (checked November 2026) [9]. Treat the labels as leads and read the statements, since automated classification makes mistakes.

## How should you read a citation count?

A citation count measures how often a paper has been cited in one index. It does not measure whether the paper is right. Read it with four corrections:

- **Age:** a 2010 paper has had years longer to collect citations than a 2024 one. Compare papers of similar age.
- **Field:** large fields such as biomedicine cite far more than mathematics or history. Compare within a field.
- **Type:** reviews and methods papers are cited more than original studies.
- **Direction:** a critique, a failed replication and a retraction notice all add to the count.

The Leiden Manifesto, ten principles for research metrics published in *Nature*, makes the same points: normalize indicators for differences between fields, and use them to support expert judgment, not replace it [10]. A practical rule: never write "highly cited" as a reason to believe a finding. Write what the citing papers found.

## How to find who cited a paper in AI for Research

AI for Research has a [Citation Map](/features/citation-map) that shows any paper's references and citing papers. It costs 0 credits on every plan.

1. Open **Citation Map** and paste a DOI or the paper's title.
2. Open the **Citing** tab to see papers that cite it, most cited first, as a list and on a graph with years across.
3. Filter by year range, minimum citations or study type, for example only reviews or randomized trials.
4. Add papers to a set and click **Find reviews citing the set** to find reviews and meta-analyses that cite them.
5. Export RIS or CSV for your reference manager, or open any paper in [Find Papers](/features/paper-search) (0 credits) to read the abstract and save it.

To check that the papers you cite still stand, paste your reference list into **[Citation check](/features/citation-checker)** (0 credits). It confirms each reference exists in Crossref or OpenAlex and flags retractions, corrections and expressions of concern.

<!-- SCREENSHOT: Citation Map for one seed paper with the Citing tab open, year and study-type filters set, and the graph above the list -->

**Limits.** Citation data come from OpenAlex, with Semantic Scholar as a fallback, so some citations are missing; check key papers in Google Scholar or your library's Scopus or Web of Science yourself. For a heavily cited paper the map shows the most-cited citing papers first, not all of them. It does not classify citations as supporting or contrasting; read the citing sentence yourself.

## FAQ

### How do I see who cited a paper?

Search the paper's title in a citation index and open its list of citing articles. In Google Scholar, click the Cited by link under the result. In PubMed, scroll to the Cited by section of the abstract page. Semantic Scholar, OpenAlex, Scopus and Web of Science also list citing papers. Each index covers different journals, so check two for a paper that matters.

### How do I find citing articles in PubMed?

Open the article's abstract page in PubMed and scroll to the Cited by section. It lists PubMed records that cite the article, and a See all link opens the full list as a search you can filter. The list is built from publisher data and NCBI resources, and PubMed says it may not be complete, so check Google Scholar or Europe PMC as well for key papers.

### Why does a paper have different citation counts in different databases?

Each database counts only the citations it can see in the documents it indexes. Google Scholar indexes the widest range, including theses, books and preprints, so its counts are usually highest. Scopus and Web of Science index selected journals, and OpenAlex and Semantic Scholar build their links by matching reference lists, which misses some. None is the true count; report which source you used.

### Does a high citation count mean a paper is good?

No. A citation count measures attention, not quality or correctness. Older papers, review articles and papers in large fields collect more citations. Some citations criticize the work or report a failed replication, and retracted papers keep being cited. Compare counts only between papers of similar age and field, and read the citing papers to see why they cite it.

### How can I find papers that disagree with a study?

Open the list of citing articles and search within it for words such as 'failed to replicate', 'contrary to', 'inconsistent with', 'comment' and 'retraction'. Tools such as Scite classify citation statements as supporting, contrasting or mentioning, which speeds this up. Then read the sentence around each citation: the label is a lead, not a verdict.

## Next steps

- Turn one paper's citations into a full search: [citation snowballing](/blog/citation-snowballing).
- Compare graph tools for exploring citations: [Connected Papers vs. ResearchRabbit vs. Litmaps](/blog/connected-papers-vs-researchrabbit-vs-litmaps).
- Find the rest of your reading list: [how to find sources for a research paper](/blog/how-to-find-sources-for-a-research-paper).
- Rank the papers you find: [levels of evidence and study types](/blog/levels-of-evidence-and-study-types).

## Sources

1. Theis-Mahon, N. R., & Bakker, C. J. (2020). The continued citation of retracted publications in dentistry. *Journal of the Medical Library Association, 108*(3), 389–397. https://doi.org/10.5195/jmla.2020.824
2. Google Scholar. Search Help (Cited by and alerts). https://scholar.google.com/intl/en/scholar/help.html
3. Martín-Martín, A., Thelwall, M., Orduna-Malea, E., & Delgado López-Cózar, E. (2021). Google Scholar, Microsoft Academic, Scopus, Dimensions, Web of Science, and OpenCitations' COCI: a multidisciplinary comparison of coverage via citations. *Scientometrics, 126*(1), 871–906. https://doi.org/10.1007/s11192-020-03690-4
4. National Library of Medicine. PubMed User Guide (Cited by). https://pubmed.ncbi.nlm.nih.gov/help/
5. Semantic Scholar. FAQ: What are highly influential citations? https://www.semanticscholar.org/faq/influential-citations
6. OpenAlex. Recipes (works that cite a work) https://developers.openalex.org/guides/recipes ; Citations help page https://help.openalex.org/data/works/citations/
7. Elsevier. Scopus support: How do I create and manage my alerts? https://www.elsevier.support/scopus/answer/how-do-i-create-and-manage-my-alerts
8. Clarivate. Web of Science help: All Times Cited Counts. https://webofscience.help.clarivate.com/en-us/Content/all-times-cited-counts.html
9. Scite. Features (Smart Citations, Reference Check), checked November 2026. https://scite.ai/features
10. Hicks, D., Wouters, P., Waltman, L., de Rijcke, S., & Rafols, I. (2015). Bibliometrics: The Leiden Manifesto for research metrics. *Nature, 520*(7548), 429–431. https://doi.org/10.1038/520429a
