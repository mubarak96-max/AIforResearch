---
title: "How to Search PubMed: MeSH Terms, Filters, Saved Searches"
slug: "how-to-search-pubmed"
description: "How to search PubMed step by step: MeSH terms, field tags, Boolean logic, filters, free full text and saved searches, with a worked search you can copy."
primary_keyword: "how to search pubmed"
secondary_keywords: ["mesh terms pubmed", "pubmed advanced search", "pubmed filters", "pubmed ai", "ai in medical research", "pubmed field tags", "save a search in pubmed"]
cluster: "I. Finding and checking sources"
pillar: "/blog/levels-of-evidence-and-study-types"
author: "Mubarak"
compares_tools: false
published: "2026-11-12"
updated: "2026-11-12"
faq:
  - q: "How do I search PubMed effectively?"
    a: "Split your question into two or three concepts. For each concept, find the MeSH term in the MeSH database and add free-text synonyms tagged [tiab]. Join the synonyms in a concept with OR inside parentheses, then join the concepts with AND. Run it, read the first 20 results, adjust, and only then apply filters such as article type and date."
  - q: "What are MeSH terms?"
    a: "MeSH (Medical Subject Headings) is the controlled vocabulary the National Library of Medicine uses to index PubMed records. Each article gets tagged with MeSH terms describing its main subjects, whatever words the authors used. Searching a MeSH term, such as \"Depressive Disorder\"[mh], finds articles indexed with it and, by default, with the more specific terms below it."
  - q: "How do I save a search in PubMed?"
    a: "Sign in to a free My NCBI account, run your search, and click Create alert under the search box. You can name the search and choose whether and how often PubMed emails you new results. To save the articles themselves, use Send to, then Collections. The Clipboard only keeps up to 500 items for 8 hours of inactivity."
  - q: "How do I find free full text in PubMed?"
    a: "Click the Free full text filter in the left sidebar, or add free full text[Filter] to your query. On an abstract page, look for the full-text links at the top right and the Free PMC article label. The filter can miss articles your library pays for, so check your library's link resolver before you request a paper."
  - q: "Does PubMed use AI?"
    a: "Yes, in two places. The default Best Match sort uses a learned ranking algorithm that combines over 150 signals. Since 2022, MEDLINE records have been indexed with MeSH by an automated system, with human review for a share of articles. PubMed does not write answers or summaries; it finds and ranks records."
---

# How to search PubMed: MeSH terms, field tags, filters and saved searches

*Last updated: 12 November 2026*

To search PubMed well, split your question into two or three concepts, list each concept's MeSH term plus free-text synonyms tagged [tiab], join synonyms with OR and concepts with AND, then apply filters such as article type and date. Check the Search Details to see how PubMed read your query, and save the search with a My NCBI alert.

This guide is for students, clinicians and researchers who search PubMed for a paper, a thesis or a review. It is part of our series on finding and checking sources; start with [levels of evidence](/blog/levels-of-evidence-and-study-types) if you need to decide which study types to look for.

## How does PubMed search work?

PubMed is the National Library of Medicine's free search engine for biomedical literature, mostly the MEDLINE database. When you type plain words, PubMed rewrites your query before it runs it.

**Automatic Term Mapping (ATM) is the process by which PubMed matches the words you type to MeSH terms, journals and authors, and searches them together with your original words.** [1] It's useful for a quick search and unpredictable for a careful one. Phrase searches in quotes, field tags and wildcards turn ATM off for that term. [1]

To see what PubMed actually searched, open Advanced, find your search in History and expand Search Details. [1] Do this every time a result count surprises you.

Results are sorted by Best Match by default. **Best Match is PubMed's relevance sort, a learned ranking algorithm that combines over 150 signals to put the most useful records first.** [1] Switch to Most Recent when you want new papers.

## What are MeSH terms in PubMed?

**MeSH (Medical Subject Headings) is the National Library of Medicine's controlled vocabulary, a hierarchy of subject terms used to index articles in MEDLINE.** [2] An article about "low mood in seniors" and one about "geriatric depressive symptoms" both get indexed with the same MeSH terms, so one MeSH search finds both.

Four rules make MeSH work for you:

1. **MeSH explodes by default.** "MeSH terms in PubMed automatically include the more specific MeSH terms in a search." [1] Searching `"Depressive Disorder"[mh]` also finds articles indexed with Depressive Disorder, Major. To search only the term itself, use `[mh:noexp]`.
2. **Major topic narrows.** `[majr]` finds articles where the term is one of the main topics. [1] Use it when a MeSH search returns too many passing mentions.
3. **Subheadings attach with a slash.** `"Depressive Disorder/therapy"[mh]` limits the term to its therapy aspect. Only one subheading can be attached directly to a MeSH term. [1]
4. **Not every record has MeSH.** Brand-new citations wait for indexing, and some records in PubMed are never indexed for MEDLINE. NLM moved MEDLINE indexing to an automated system in 2022 <!-- VERIFY: year NLM moved MEDLINE indexing to automated (MTIX); one writer could not confirm "2022" in the 2024 bulletin --> and aims to index within about a day, with human curation for a share of articles. [3] Always add free-text synonyms tagged `[tiab]` so you catch unindexed records.

### How do you find the right MeSH term?

Open the MeSH database (ncbi.nlm.nih.gov/mesh), type your concept and read the scope note and the tree. [2] For example, Depression covers depressive states of moderate intensity, while Depressive Disorder is the affective disorder; a clinical question may need both. The "Add to search builder" button writes the tagged term for you.

Or open two or three papers that are exactly on topic and borrow the MeSH terms listed on their records.

## Which PubMed field tags and operators should you know?

Field tags go in square brackets after a term and limit it to one field. Operators combine terms. These cover almost every search: [1]

| Syntax | What it does | Example |
| --- | --- | --- |
| `[mh]` | MeSH term, with narrower terms | `"Exercise"[mh]` |
| `[mh:noexp]` | MeSH term only, not narrower terms | `"Exercise"[mh:noexp]` |
| `[majr]` | MeSH term as a major topic | `"Exercise Therapy"[majr]` |
| `[tiab]` | Words in title or abstract (and author keywords) | `exercis*[tiab]` |
| `[ti]` | Title only | `"physical activity"[ti]` |
| `[pt]` | Publication type | `randomized controlled trial[pt]` |
| `[la]` | Language | `english[la]` |
| `[dp]` | Publication date, or a range with a colon | `2016:2025[dp]` |
| `[au]` | Author | `smith j[au]` |
| `" "` | Exact phrase | `"older adults"[tiab]` |
| `*` | Truncation: zero or more characters; needs at least 4 letters before it | `depress*[tiab]` finds depression, depressive, depressed |
| `[tiab:~N]` | Proximity: terms within N words of each other, in any order | `"exercise depression"[tiab:~3]` |
| `AND`, `OR`, `NOT` | Boolean operators, in capitals | `A AND (B OR C)` |

PubMed processes operators left to right, so use parentheses to group synonyms. [1] Proximity searching works only in title, title/abstract and affiliation fields, and not with wildcards. [1] Use `NOT` sparingly: it removes records that mention the term anywhere you search, including relevant ones.

## How do I search PubMed effectively? A step-by-step method

The method below works for a class assignment and scales up to a [systematic review search strategy](/blog/systematic-review-search-strategy).

1. **Write the question in one sentence.** Example: "Does exercise reduce depression in older adults?"
2. **Pick two or three concepts.** Usually the population, the intervention or exposure, and the outcome. Leave out the comparison and study design for now.
3. **For each concept, find the MeSH term(s)** in the MeSH database.
4. **For each concept, list free-text synonyms**: spelling variants, plurals (use `*`), older terms, abbreviations. Tag them `[tiab]`.
5. **Build one block per concept**: MeSH and synonyms joined with OR, in parentheses.
6. **Join the blocks with AND.**
7. **Run it and read the first 20 results.** If relevant papers are missing, find their words and MeSH terms and add them. If junk dominates, find which term pulls it in.
8. **Apply filters last**: article type, date, language, species.
9. **Save the search** and write the final string and date in your notes.

## A worked PubMed search, step by step

Question: "Does exercise reduce depression in adults over 65?" The MeSH terms below are real descriptors, checked in the MeSH database on 12 November 2026.

**Block 1, exercise:**

```
("Exercise"[mh] OR "Exercise Therapy"[mh] OR exercis*[tiab] OR "physical activity"[tiab])
```

**Block 2, depression:**

```
("Depression"[mh] OR "Depressive Disorder"[mh] OR depress*[tiab])
```

**Block 3, older adults:**

```
("Aged"[mh] OR "older adult*"[tiab] OR elderly[tiab])
```

The MeSH term Aged means a person 65 or older and explodes to include Aged, 80 and over. [2]

Combined, with the counts we got on 12 November 2026 through NCBI's E-utilities interface:

| Step | Search | Records |
| --- | --- | --- |
| #1 | Block 1 AND Block 2 AND Block 3 | 11,759 <!-- VERIFY: count on 12 November 2026 (E-utilities); recheck in the PubMed web interface on publication date --> |
| #2 | #1 AND `randomized controlled trial[pt]` | 2,039 <!-- VERIFY: count on 12 November 2026 --> |
| #3 | #2 AND `2016:2025[dp]` | 759 <!-- VERIFY: count on 12 November 2026 --> |
| #4 | #1 AND (`systematic review[pt]` OR `meta-analysis[pt]`) | 367 <!-- VERIFY: count on 12 November 2026 --> |

Your counts will be higher: PubMed grows daily. Following the evidence order in our [levels of evidence](/blog/levels-of-evidence-and-study-types) guide, you would read the newest reviews from #4 first, then trials in #3 published after the reviews' search dates.

The free-text terms catch records not yet indexed with MeSH and authors' own wording.

## What PubMed filters should you use?

PubMed filters narrow results by article type, date, text availability and more; they sit in the left sidebar after you search. The most useful:

- **Article type:** Randomized Controlled Trial, Systematic Review, Meta-Analysis, Review, Clinical Trial and more. Most use the publication type field `[pt]`. [1] Click "Additional filters" to see the full list.
- **Publication date:** 1, 5 or 10 years, or a custom range.
- **Text availability:** Abstract, Free full text, Full text.
- **Species:** Humans maps to `humans[mh]`. [1] To keep records that have no species indexing yet, use `NOT (animals[mh] NOT humans[mh])` rather than the Humans filter.
- **Language** and **Age** (the age filters use MeSH age groups, so they miss unindexed records).

**Clinical Queries is a PubMed tool that runs your topic through validated search filters for clinical study categories: therapy, diagnosis, etiology, prognosis and clinical prediction guides, each in a broad or narrow version.** [1] The filters are based on the work of Haynes and colleagues.

Filters stay on for your next search until you clear them.

## How do I find free full text in PubMed?

Click **Free full text** in the sidebar, or add `free full text[Filter]` to your search. [1] On an abstract page, the full-text links sit at the top right, and a **Free PMC article** label means a copy is in PubMed Central.

The filter only knows what PubMed knows. It can miss articles your university pays for, and author copies in repositories. If you are a student, open PubMed through the link on your library's website: many libraries add their own full-text buttons to PubMed records that way.

## How do you use PubMed Advanced Search?

PubMed Advanced Search is a page with a query builder and your search history. Use it to build field-tagged searches and to combine earlier searches by number.

1. Click **Advanced** under the search box.
2. In the builder, choose a field from the **All Fields** menu, type a term and click **Add** to put it in the query box with AND, OR or NOT. [1]
3. Click **Search**, or **Add to History** to store it without running.
4. Combine searches from History by number, such as `#1 AND #2`. [1]

History keeps your last 100 searches and expires after 8 hours of inactivity. [1] Save anything you need before you close the browser.

## How do I save a search in PubMed?

Saving a search needs a free My NCBI account. There are three things you may want to keep:

| What to keep | How | Notes |
| --- | --- | --- |
| The search itself, with email alerts | Click **Create alert** under the search box | Sign in to My NCBI first; choose whether and how often to get emails [1] |
| A set of articles, long term | **Send to**, then **Collections** | No storage limit [1] |
| A set of articles, for this session | **Send to**, then **Clipboard** | Up to 500 items; expires after 8 hours of inactivity [1] |
| Records for a reference manager | **Send to**, then **Citation manager** | Creates an .nbib file; up to 10,000 records [1] |

Also copy the final search string, date and count into your notes; a review reports them in its methods.

## When should you search other databases as well as PubMed?

Search beyond PubMed when you need every relevant study, not just a good sample. PubMed misses much nursing, psychology and allied health literature.

- **Europe PMC** is free and adds preprints and some records PubMed lacks.
- **Embase, CINAHL, PsycINFO and Cochrane CENTRAL** are usually reached through your library. The Cochrane Handbook requires Cochrane reviews to search at least CENTRAL and MEDLINE, plus Embase where the team has access. [4]
- **Citation searching** of key papers finds studies that keyword searches miss. See [citation snowballing](/blog/citation-snowballing).

Each database has its own vocabulary (Embase uses Emtree, not MeSH), so translate your blocks rather than pasting them.

## How to search PubMed with AI for Research

AI for Research searches PubMed and Europe PMC as its Medical source. It shortens the first pass and the screening; it doesn't replace PubMed for a documented search.

- **[Find Papers](/features/paper-search)** with the Medical source runs one search across PubMed and Europe PMC, with filters for study type, year, open access and journal quality tier, and retracted papers left out by default. 0 credits.
- **[Deep Research](/tools/deep-research)** answers a clinical question with citations to the papers it read and a consensus line counted from per-study labels. It reads open full texts found through Unpaywall, otherwise abstracts. Summary 1 credit, Deep 15.
- **[Systematic Review workspace](/features/systematic-review):** a PubMed search builder with a live record count, logged for your report, and upload of PubMed .nbib files from Send to, Citation manager. Duplicates are removed by DOI, PMID and title. Free plan: 1 review, 50 records.

<!-- SCREENSHOT: Systematic Review search step with the PubMed builder showing a three-block query and its live record count -->

**Limits:** AI for Research does not show PubMed's Search Details, MeSH tree or Clinical Queries; use PubMed itself for those. AI answers about health questions are a starting point, and any clinical use needs a qualified professional's review.

## FAQ

### How do I search PubMed effectively?

Split your question into two or three concepts. For each concept, find the MeSH term in the MeSH database and add free-text synonyms tagged [tiab]. Join the synonyms in a concept with OR inside parentheses, then join the concepts with AND. Run it, read the first 20 results, adjust, and only then apply filters such as article type and date.

### What are MeSH terms?

MeSH (Medical Subject Headings) is the controlled vocabulary the National Library of Medicine uses to index PubMed records. Each article gets tagged with MeSH terms describing its main subjects, whatever words the authors used. Searching a MeSH term, such as "Depressive Disorder"[mh], finds articles indexed with it and, by default, with the more specific terms below it.

### How do I save a search in PubMed?

Sign in to a free My NCBI account, run your search, and click Create alert under the search box. You can name the search and choose whether and how often PubMed emails you new results. To save the articles themselves, use Send to, then Collections. The Clipboard only keeps up to 500 items for 8 hours of inactivity.

### How do I find free full text in PubMed?

Click the Free full text filter in the left sidebar, or add free full text[Filter] to your query. On an abstract page, look for the full-text links at the top right and the Free PMC article label. The filter can miss articles your library pays for, so check your library's link resolver before you request a paper.

### Does PubMed use AI?

Yes, in two places. The default Best Match sort uses a learned ranking algorithm that combines over 150 signals. Since 2022, MEDLINE records have been indexed with MeSH by an automated system, with human review for a share of articles. PubMed does not write answers or summaries; it finds and ranks records.

## Next steps

- Decide which study types to look for first: [levels of evidence and study types](/blog/levels-of-evidence-and-study-types).
- Extend your PubMed results through references and citing papers: [citation snowballing](/blog/citation-snowballing).
- Keep the papers you find in order: [how to organize research papers](/blog/how-to-organize-research-papers).

## Sources

1. National Library of Medicine. PubMed User Guide. https://pubmed.ncbi.nlm.nih.gov/help/
2. National Library of Medicine. Medical Subject Headings (MeSH). https://www.nlm.nih.gov/mesh/meshhome.html ; MeSH database: https://www.ncbi.nlm.nih.gov/mesh/
3. National Library of Medicine. Frequently Asked Questions about Indexing for MEDLINE. https://www.nlm.nih.gov/bsd/indexfaq.html ; NLM Technical Bulletin, MTIX: https://www.nlm.nih.gov/pubs/techbull/ma24/ma24_mtix.html
4. Lefebvre, C., Glanville, J., Briscoe, S., et al. (2025). Chapter 4: Searching for and selecting studies. In J. P. T. Higgins et al. (Eds.), *Cochrane Handbook for Systematic Reviews of Interventions* (version 6.5.1). Cochrane. https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-04
