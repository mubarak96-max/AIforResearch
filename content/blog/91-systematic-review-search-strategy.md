---
title: "Systematic Review Search Strategy: A Step-by-Step Guide"
slug: "systematic-review-search-strategy"
description: "Build a systematic review search strategy: concepts to terms, MeSH plus free text, Boolean and proximity, a worked PubMed string, and how to translate it."
primary_keyword: "systematic review search strategy"
secondary_keywords: ["search string", "boolean operators", "mesh terms", "how to translate a search between databases", "how many databases for a systematic review", "how to document a search strategy", "prisma-s"]
cluster: "N. Systematic reviews"
pillar: "/blog/what-is-a-systematic-review"
author: "Mubarak"
compares_tools: false
published: "2026-11-12"
updated: "2026-11-12"
faq:
  - q: "How many databases should a systematic review search?"
    a: "There is no fixed number, but one database is never enough. Cochrane expects at least CENTRAL, MEDLINE and Embase for intervention reviews, plus trial registers. A 2017 study of 58 reviews recommended Embase, MEDLINE, Web of Science and Google Scholar as a minimum. Add subject databases such as CINAHL for nursing or PsycINFO for psychology when your topic fits them."
  - q: "What is a search string?"
    a: "A search string is the full query you paste into a database: your terms for each concept joined with OR, the concept blocks joined with AND, plus field tags, truncation and any limits. In a systematic review the exact string for every database is reported, so others can rerun it and get the same records on the same date."
  - q: "Should I use MeSH terms or keywords?"
    a: "Use both. MeSH terms find records indexed under a concept even when the abstract uses different words, but new records can take time to be indexed and some never are. Free-text keywords in the title and abstract catch those records. Combine the subject heading and the free-text terms for each concept with OR."
  - q: "How do you translate a search between databases?"
    a: "Keep the same concept blocks and logic, then change three things: the controlled vocabulary (MeSH in MEDLINE, Emtree in Embase, none in Scopus), the field tags (tiab in PubMed, .ti,ab. in Ovid, :ti,ab in Embase.com, TITLE-ABS-KEY in Scopus) and the proximity and truncation operators. Check each translated string's record count and test that it finds your known relevant papers."
  - q: "How do I document a search strategy for a systematic review?"
    a: "Follow PRISMA-S. Report every database and platform, the full search string for each exactly as run, the date each search was run, any limits and filters, other methods such as citation searching and registers, whether the search was peer reviewed, and the number of records from each source and after deduplication. Put full strings in an appendix."
  - q: "Should a librarian peer review my search strategy?"
    a: "Yes, if you can. The PRESS guideline gives a checklist a second searcher, usually an information specialist, uses to check translation of the question, Boolean and proximity operators, subject headings, free-text terms, spelling and syntax, and limits. Errors in a search are common and a peer review catches them before you screen thousands of records."
---

# How to build a systematic review search strategy

*Last updated: 12 November 2026*

A systematic review search strategy is the documented set of searches, one per database, that tries to find every study that answers your question. Build it by splitting the question into concepts, listing subject headings and free-text synonyms for each, joining synonyms with OR and concepts with AND, translating the string for each database, and reporting it in full.

This guide is for students, researchers and anyone running their first systematic or scoping review. It is part of our guide to [what a systematic review is](/blog/what-is-a-systematic-review).

## What is a systematic review search strategy?

**A systematic review search strategy is a reproducible plan that lists the sources searched, the exact search string used in each, the date it was run and any limits, so another person could repeat it and get the same records.** It aims for high sensitivity: you would rather screen 3,000 records than miss one eligible trial [1].

A normal literature search stops when you have enough good papers. A systematic search stops when more searching finds no new eligible studies, and it records every step: concepts, terms, database syntax and documentation.

## How do you turn a research question into search concepts?

Pick the two to four concepts that every eligible study must mention, and leave out the rest. Outcomes and comparators are often left out of the search because abstracts describe them inconsistently, and screening handles them instead [1].

**Example (invented for this guide):** "Do mindfulness-based interventions reduce burnout in hospital nurses?"

| PICO element | In the search? | Why |
| --- | --- | --- |
| Population: nurses | Yes | Every eligible study is about nurses |
| Intervention: mindfulness | Yes | Core of the question |
| Comparison: usual care, waitlist | No | Described too many ways; screen for it |
| Outcome: burnout | Yes, here | Burnout is specific and named in nearly every relevant abstract |

Each concept added with AND narrows the search. Leave vague concepts (for example "quality of care") to screening.

## How do you choose search terms: MeSH terms and free text?

Use both a subject heading and free-text words for every concept. **MeSH (Medical Subject Headings) is the controlled vocabulary the US National Library of Medicine uses to index MEDLINE records, so one heading collects papers that use different words for the same idea.** Embase has its own vocabulary, Emtree. Indexing lags behind publication, and some records in PubMed are never indexed with MeSH, so free text in titles and abstracts catches what headings miss [1][2].

To build the term list for each concept:

1. **Find the subject heading.** Search the MeSH Database (from the PubMed home page) for your concept and read its scope note and tree. In PubMed, a MeSH search includes the narrower terms below it by default ("explodes"); add `:noexp` to switch that off.
2. **Harvest synonyms.** Read the entry terms listed under the heading, and the titles and abstracts of five to ten papers you already know are relevant. Note every way they name the concept.
3. **Cover spelling and word forms.** British and American spellings, plurals, hyphenated forms, abbreviations (MBSR).
4. **Truncate carefully.** `nurs*` finds nurse, nurses, nursing, nursery. In PubMed, a term needs at least four characters before the first wildcard [2].
5. **Write a test set.** List five to ten known eligible papers. Your finished search must find all of them that the database indexes.

## How do Boolean operators and proximity work in a search string?

**Boolean operators are the words OR, AND and NOT that combine terms: OR widens a search to any of the terms, AND narrows it to records containing all concept blocks, and NOT removes records.** In a systematic search you OR together all the terms for one concept inside brackets, then AND the brackets together.

- **OR** within a concept: `burnout OR "emotional exhaustion"`.
- **AND** between concepts: `(mindfulness block) AND (burnout block) AND (nurse block)`.
- **NOT**: avoid it, or use it only to remove a publication type such as animal-only studies, with a tested formula. NOT removes records that mention both terms, including relevant ones.

**Proximity operators find two words within a set distance of each other in either order, which is more precise than AND and more flexible than an exact phrase.** "Nurse burnout," "burnout among nurses" and "burnout in critical care nurses" all match `nurse` within three words of `burnout`. PubMed supports proximity in the title, title/abstract and affiliation fields only, written as a quoted phrase with a distance tag, and it does not work with wildcards [2].

## A worked PubMed search string example

Here is the full PubMed string for the example question. Each line is one concept block.

```
("Mindfulness"[Mesh] OR "Meditation"[Mesh] OR mindful*[tiab] OR meditat*[tiab] OR MBSR[tiab])
AND
("Burnout, Professional"[Mesh] OR "Compassion Fatigue"[Mesh] OR burnout[tiab] OR "burn-out"[tiab] OR "emotional exhaustion"[tiab] OR "compassion fatigue"[tiab] OR "nurse burnout"[tiab:~3])
AND
("Nurses"[Mesh] OR "Nursing Staff"[Mesh] OR nurse[tiab] OR nurses[tiab] OR nursing[tiab] OR midwi*[tiab])
```

<!-- VERIFY: check in the MeSH Database that "Burnout, Professional" is still the current heading for occupational burnout (and whether a newer broader heading such as "Burnout, Psychological" should be added) -->

What each part does:

- `[Mesh]` searches the subject heading and its narrower terms.
- `[tiab]` searches title and abstract words. Field tags switch off PubMed's automatic term mapping, so the term is searched exactly as written [2].
- `"nurse burnout"[tiab:~3]` finds nurse and burnout up to three words apart. In this string it is redundant (the nurse and burnout blocks already AND together), but it shows the syntax you would use if you wanted to search the combined idea on its own.

Then check **Search details** to see how PubMed read each term, and confirm your test-set papers are found.

## How do you translate a search between databases?

Keep the concepts and the logic. Change the vocabulary, field tags and operators. Embase, Scopus and Web of Science are subscription databases, so you will usually run these searches through your university or hospital library's access and export the results.

### Syntax table for the main databases

| Feature | PubMed | Ovid (MEDLINE, Embase) | Embase.com | Scopus | Web of Science |
| --- | --- | --- | --- | --- | --- |
| Subject heading | `"Nurses"[Mesh]` | `exp Nurses/` | `'nurse'/exp` | none (index terms field only) | none |
| Heading, no explode | `"Nurses"[Mesh:noexp]` | `Nurses/` | `'nurse'/de` | n/a | n/a |
| Title and abstract | `nurse[tiab]` | `nurse.ti,ab.` | `nurse:ti,ab` | `TITLE-ABS-KEY(nurse)` | `TS=(nurse)` |
| Truncation | `nurs*` | `nurs*` or `nurs$` | `nurs*` | `nurs*` | `nurs*` |
| Proximity | `"nurse burnout"[tiab:~3]` | `nurse adj3 burnout` | `nurse NEAR/3 burnout` | `nurse W/3 burnout` | `nurse NEAR/3 burnout` |
| Phrase | `"emotional exhaustion"` | `emotional exhaustion` | `'emotional exhaustion'` | `"emotional exhaustion"` | `"emotional exhaustion"` |

<!-- VERIFY: confirm each operator against current vendor help pages (Ovid syntax guide, Embase.com search tips, Scopus search guide, Web of Science advanced search help) before publishing -->

Scopus TITLE-ABS-KEY and Web of Science TS also search keywords, so they are broader than title and abstract alone.

### The example in Ovid MEDLINE

Ovid uses numbered lines, which make the logic easy to check:

```
1  exp Mindfulness/
2  exp Meditation/
3  (mindful* or meditat* or MBSR).ti,ab.
4  or/1-3
5  exp Burnout, Professional/
6  Compassion Fatigue/
7  (burnout or burn-out or emotional exhaustion or compassion fatigue).ti,ab.
8  (nurs* adj3 burnout).ti,ab.
9  or/5-8
10 exp Nurses/
11 exp Nursing Staff/
12 (nurse or nurses or nursing or midwi*).ti,ab.
13 or/10-12
14 4 and 9 and 13
```

### The example in Embase.com and Scopus

In Embase.com, swap MeSH for Emtree terms found in the Emtree browser, for example `'mindfulness'/exp OR 'meditation'/exp OR mindful*:ti,ab OR meditat*:ti,ab`. Emtree headings differ from MeSH (Emtree uses the singular "nurse"), so look up every heading; do not just copy MeSH names.

In Scopus there is no thesaurus, so the string is free text only:

```
TITLE-ABS-KEY(mindful* OR meditat* OR mbsr)
AND TITLE-ABS-KEY(burnout OR "burn-out" OR "emotional exhaustion" OR "compassion fatigue")
AND TITLE-ABS-KEY(nurse OR nurses OR nursing OR midwi*)
```

### A translation checklist

1. Rebuild each concept block with that database's subject headings.
2. Change field tags and operators using the table above.
3. Run each block on its own and note its count. A block with zero or millions of results signals a syntax error.
4. Combine the blocks and run the full search.
5. Check that the test-set papers indexed in that database are found.
6. Export all records (RIS is the safest format) and save the string, date and count.

## How many databases should a systematic review search?

Search at least three bibliographic databases plus trial registers for a health intervention review. The Cochrane Handbook expects CENTRAL, MEDLINE and Embase at a minimum, with subject databases and trial registers added as the topic needs [1]. Bramer and colleagues, testing searches for 58 reviews, recommended Embase, MEDLINE, Web of Science and Google Scholar as a minimum, and found that 16% of included references were found in only one database [3].

Add subject databases when your topic fits them: CINAHL for nursing, PsycINFO for psychology, ERIC for education. For the nurse burnout example, CINAHL would be essential. Add citation searching (checking reference lists and citing papers) to catch what databases miss; see [citation snowballing](/blog/citation-snowballing).

## How do you document a search strategy with PRISMA-S?

PRISMA 2020 asks for the full search strategies for all databases, registers and websites (item 7) [6]. PRISMA-S, its 16-item extension for literature searches, spells out what that means [4]. In summary:

1. Name each database with its platform (for example MEDLINE via Ovid), plus registers, websites, citation searching and expert contact.
2. Give the full search strategy for every source, exactly as run.
3. State limits and restrictions, any published search filters, and any search adapted from earlier work.
4. State when each search was last run and how updates were done.
5. Say whether the search was peer reviewed.
6. Report the records from each source and how duplicates were removed.

Keep a search log as you go (database, platform, date, string, count, export file) and put the full strings in an appendix. Ask an information specialist to check your strategy with the PRESS checklist before you screen [5]. The counts from your log feed the top of your [PRISMA flow diagram](/blog/how-to-make-a-prisma-flow-diagram).

## How to run and log your search in AI for Research

The [Systematic Review workspace](/features/systematic-review) in AI for Research has search builders for PubMed, Europe PMC and OpenAlex, with a live record count that updates as you edit the string. Searching costs 0 credits.

1. **Set up the protocol.** Enter your question with PICO, PCC or SPIDER and your eligibility criteria. An AI draft of the [protocol in PROSPERO's sections](/templates/systematic-review-protocol) costs 3 credits; the form itself is free.
2. **Build each search.** Paste or write your PubMed string (field tags such as `[tiab]` and `[Mesh]` are passed to PubMed). Watch the count as you add each block, then run it and add the records.
3. **Every run is logged** with its date, string and count, ready for your methods section and PRISMA flow.
4. **Upload the other databases.** Export from Embase, Scopus, Web of Science or CINAHL through your library and upload the RIS, BibTeX, CSV or PubMed .nbib file. AI for Research does not search those databases itself.
5. **Remove duplicates.** They are matched by DOI, PMID and title, and counted for the PRISMA diagram.

<!-- SCREENSHOT: Systematic Review search tab with the PubMed builder, a multi-line string, the live record count, and the search log table below -->

**Limits.** The builders cover PubMed, Europe PMC and OpenAlex only; there is no Embase, CINAHL or Scopus search inside the product, and no MeSH browser, so look up headings in the MeSH Database. One run adds up to 2,000 records, so split a larger PubMed search by publication year and log each part. The free plan holds 1 review with up to 50 records; see [pricing](/pricing). For a quick scoping search first, [Find Papers](/features/paper-search) searches across sources with filters at 0 credits.

## FAQ

### How many databases should a systematic review search?

There is no fixed number, but one database is never enough. Cochrane expects at least CENTRAL, MEDLINE and Embase for intervention reviews, plus trial registers. A 2017 study of 58 reviews recommended Embase, MEDLINE, Web of Science and Google Scholar as a minimum. Add subject databases such as CINAHL for nursing or PsycINFO for psychology when your topic fits them.

### What is a search string?

A search string is the full query you paste into a database: your terms for each concept joined with OR, the concept blocks joined with AND, plus field tags, truncation and any limits. In a systematic review the exact string for every database is reported, so others can rerun it and get the same records on the same date.

### Should I use MeSH terms or keywords?

Use both. MeSH terms find records indexed under a concept even when the abstract uses different words, but new records can take time to be indexed and some never are. Free-text keywords in the title and abstract catch those records. Combine the subject heading and the free-text terms for each concept with OR.

### How do you translate a search between databases?

Keep the same concept blocks and logic, then change three things: the controlled vocabulary (MeSH in MEDLINE, Emtree in Embase, none in Scopus), the field tags (tiab in PubMed, .ti,ab. in Ovid, :ti,ab in Embase.com, TITLE-ABS-KEY in Scopus) and the proximity and truncation operators. Check each translated string's record count and test that it finds your known relevant papers.

### How do I document a search strategy for a systematic review?

Follow PRISMA-S. Report every database and platform, the full search string for each exactly as run, the date each search was run, any limits and filters, other methods such as citation searching and registers, whether the search was peer reviewed, and the number of records from each source and after deduplication. Put full strings in an appendix.

### Should a librarian peer review my search strategy?

Yes, if you can. The PRESS guideline gives a checklist a second searcher, usually an information specialist, uses to check translation of the question, Boolean and proximity operators, subject headings, free-text terms, spelling and syntax, and limits. Errors in a search are common and a peer review catches them before you screen thousands of records.

## Next steps

- Learn PubMed's own tools in depth: [how to search PubMed](/blog/how-to-search-pubmed).
- Turn your search counts into a figure: [how to make a PRISMA flow diagram](/blog/how-to-make-a-prisma-flow-diagram).
- Measure screening agreement once records are in: [Cohen's kappa for screening](/blog/cohens-kappa-inter-rater-reliability).
- Back to the pillar: [what is a systematic review](/blog/what-is-a-systematic-review).

## Sources

1. Lefebvre, C., Glanville, J., Briscoe, S., et al. Chapter 4: Searching for and selecting studies. In Higgins, J. P. T., et al. (Eds.), *Cochrane Handbook for Systematic Reviews of Interventions*. Cochrane. https://training.cochrane.org/handbook/current/chapter-04
2. National Library of Medicine. PubMed User Guide (proximity searching, wildcards, field tags, automatic term mapping). https://pubmed.ncbi.nlm.nih.gov/help/
3. Bramer, W. M., Rethlefsen, M. L., Kleijnen, J., & Franco, O. H. (2017). Optimal database combinations for literature searches in systematic reviews: a prospective exploratory study. *Systematic Reviews, 6*, 245. https://doi.org/10.1186/s13643-017-0644-y
4. Rethlefsen, M. L., Kirtley, S., Waffenschmidt, S., et al. (2021). PRISMA-S: an extension to the PRISMA Statement for Reporting Literature Searches in Systematic Reviews. *Systematic Reviews, 10*, 39. https://doi.org/10.1186/s13643-020-01542-z
5. McGowan, J., Sampson, M., Salzwedel, D. M., Cogo, E., Foerster, V., & Lefebvre, C. (2016). PRESS Peer Review of Electronic Search Strategies: 2015 guideline statement. *Journal of Clinical Epidemiology, 75*, 40–46. https://doi.org/10.1016/j.jclinepi.2016.01.021
6. Page, M. J., McKenzie, J. E., Bossuyt, P. M., et al. (2021). The PRISMA 2020 statement: an updated guideline for reporting systematic reviews. *BMJ, 372*, n71. https://doi.org/10.1136/bmj.n71
