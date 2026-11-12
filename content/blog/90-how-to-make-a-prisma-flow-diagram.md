---
title: "PRISMA Flow Diagram: How to Make One with Worked Counts"
slug: "how-to-make-a-prisma-flow-diagram"
description: "How to make a PRISMA 2020 flow diagram: every box explained, where each count comes from, a worked example that adds up, and the mistakes that break it."
primary_keyword: "prisma flow diagram"
secondary_keywords: ["prisma 2020 flow diagram", "prisma flow diagram template", "how to create a prisma flow diagram", "what goes in a prisma flow diagram", "how to count duplicates in prisma", "prisma flow diagram in word"]
cluster: "N. Systematic reviews"
pillar: "/blog/what-is-a-systematic-review"
author: "Mubarak"
compares_tools: false
published: "2026-11-12"
updated: "2026-11-12"
faq:
  - q: "What goes in a PRISMA flow diagram?"
    a: "A PRISMA 2020 flow diagram shows how many records you found in each database and register, how many duplicates and other records you removed before screening, how many you screened and excluded, how many full-text reports you sought, could not retrieve and assessed, how many reports you excluded with a reason for each, and finally the number of studies and reports included in the review."
  - q: "How do you count duplicates in a PRISMA flow diagram?"
    a: "Count the records you removed, not the pairs you found. If the same trial appears in PubMed, Embase and CENTRAL, that is three records, one kept and two removed, so it adds 2 to the duplicates box. Take the number from your reference manager or screening tool's deduplication log, and check that identified minus removed equals the number you screened."
  - q: "What is the difference between records, reports and studies in PRISMA 2020?"
    a: "A record is a title and abstract indexed in a database. A report is a document you retrieve and read in full, such as a journal article, preprint, conference abstract or trial registry entry. A study is the investigation itself, which may have several reports. That is why the final box gives two numbers: studies included and reports of included studies."
  - q: "Is there a PRISMA flow diagram template in Word?"
    a: "Yes. The PRISMA website offers free Word templates of the 2020 flow diagram for new reviews (databases and registers only, or with other sources added) and for updated reviews. They are licensed CC BY 4.0, so you can edit and publish them with a citation to Page et al. 2021. There is also a free Shiny app that draws the diagram from your counts."
  - q: "Do I need the 'other methods' column in my PRISMA diagram?"
    a: "Use it when you found studies outside your database and register searches, for example by citation searching, website searches or contacting authors or organizations. Those reports go in a separate column so readers can see how much each method added. If you only searched databases and registers, use the simpler template without that column."
---

# How to make a PRISMA flow diagram that adds up

*Last updated: 12 November 2026*

A PRISMA flow diagram is the figure in a systematic review that shows how many records you found, removed, screened and excluded at each stage, and how many studies you finally included. To make one, take the counts from your search log and screening decisions, enter them in the PRISMA 2020 template, and check that every box equals the box above it minus the exclusions beside it.

This guide is for anyone writing up a systematic, scoping or rapid review: students, librarians and clinical researchers. It is part of our guide to [what a systematic review is](/blog/what-is-a-systematic-review).

## What is a PRISMA flow diagram?

**A PRISMA flow diagram is a standard figure that reports the flow of records through the identification, screening and inclusion stages of a systematic review, with a count in every box.** It is item 16a of the PRISMA 2020 checklist, which asks you to describe the results of the search and selection process, "ideally using a flow diagram" [1].

PRISMA 2020 replaced the 2009 diagram. The 2020 version counts databases and registers separately, splits records removed before screening into three lines, counts **reports** at full text, adds "Reports not retrieved", and gives both **studies** and **reports** in the final box [1][2].

## Which PRISMA 2020 flow diagram template should you use?

Pick the template that matches what you searched. The PRISMA website offers four Word templates, free under a CC BY 4.0 licence [2]:

| Template | Use it when |
| --- | --- |
| New review, databases and registers only | You searched bibliographic databases and trial or study registers, nothing else |
| New review, databases, registers and other sources | You also searched websites, contacted organizations or authors, or did citation searching |
| Updated review, databases and registers only | You are updating an earlier review and only searched databases and registers |
| Updated review, with other sources | You are updating a review and also used other methods |

This guide covers the two templates for new reviews. The PRISMA site also links to a free Shiny app, PRISMA2020, that draws the diagram from your numbers [2][3].

## What goes in each box of the PRISMA flow diagram?

Each box holds one count from a specific place in your records. Work top to bottom.

### Identification: databases and registers

1. **Records identified from: Databases (n = ) and Registers (n = ).** The number of records each search returned, taken from your search log on the day you ran it. The template's footnote asks you to report a number per database or register where you can, rather than one total [2].
2. **Records removed before screening.** Three lines:
   - *Duplicate records removed*: records your deduplication step deleted.
   - *Records marked as ineligible by automation tools*: records a tool excluded with no human looking at them. Leave it at 0 if you used none.
   - *Records removed for other reasons*: for example, records outside a date limit you applied after export, or retracted items you removed by rule.

### Screening: titles and abstracts

3. **Records screened (n = ).** Identified minus removed.
4. **Records excluded (n = ).** Records ruled out at title and abstract. You do not need reasons here. If you used automation tools to exclude records at this stage, the template asks you to say how many were excluded by a human and how many by a tool [2].

### Screening: full text

5. **Reports sought for retrieval (n = ).** Screened minus excluded. Note the change of unit: from here on you count reports.
6. **Reports not retrieved (n = ).** Full texts you could not get after trying (no library access, author did not reply).
7. **Reports assessed for eligibility (n = ).** Sought minus not retrieved.
8. **Reports excluded, with reasons (n = ).** Each reason with its own count, such as wrong population, wrong comparator, wrong study design. Give each excluded report one main reason so the counts sum to the total.

### Included

9. **Studies included in review (n = ) and Reports of included studies (n = ).** Two numbers. Several reports can describe one study: a main trial paper, a follow-up paper and a registry entry.

### The "other methods" column

In the second template, a right-hand column runs in parallel: records identified from websites, organisations, citation searching and so on; reports sought for retrieval; reports not retrieved; reports assessed; reports excluded with reasons [2]. Its included reports join the single "Studies included" box at the bottom. Citation searching is the usual reason to need it; see [citation snowballing](/blog/citation-snowballing).

## A worked PRISMA flow diagram example with numbers that add up

**Example only (invented counts):** "mindfulness-based interventions for burnout in hospital nurses," new review, databases, registers and other sources.

### Databases and registers column

| Box | Count | Arithmetic |
| --- | --- | --- |
| MEDLINE (via PubMed) | 1,214 | from search log |
| Embase | 1,587 | from search log |
| CENTRAL | 402 | from search log |
| ClinicalTrials.gov (register) | 96 | from search log |
| **Records identified** | **3,299** | 1,214 + 1,587 + 402 + 96 |
| Duplicate records removed | 1,105 | deduplication log |
| Marked ineligible by automation tools | 0 | none used |
| Removed for other reasons | 14 | published before 2000 |
| **Records screened** | **2,180** | 3,299 − 1,105 − 0 − 14 |
| Records excluded | 2,031 | title and abstract decisions |
| **Reports sought for retrieval** | **149** | 2,180 − 2,031 |
| Reports not retrieved | 7 | full text unavailable |
| **Reports assessed for eligibility** | **142** | 149 − 7 |
| Excluded: wrong population | 48 | |
| Excluded: wrong intervention | 31 | |
| Excluded: wrong study design | 29 | |
| Excluded: wrong outcomes | 12 | |
| Excluded: conference abstract only | 9 | |
| **Reports excluded (total)** | **129** | 48 + 31 + 29 + 12 + 9 |
| **Reports included from this column** | **13** | 142 − 129 |

### Other methods column

| Box | Count | Arithmetic |
| --- | --- | --- |
| Websites | 11 | |
| Organisations | 4 | |
| Citation searching | 23 | |
| **Records identified** | **38** | 11 + 4 + 23 |
| **Reports sought for retrieval** | **38** | all identified were sought |
| Reports not retrieved | 2 | |
| **Reports assessed for eligibility** | **36** | 38 − 2 |
| Excluded: wrong study design | 19 | |
| Excluded: wrong population | 10 | |
| Excluded: wrong outcomes | 4 | |
| **Reports excluded (total)** | **33** | 19 + 10 + 4 |
| **Reports included from this column** | **3** | 36 − 33 |

### Included box

- **Reports of included studies: 16** (13 + 3).
- **Studies included in review: 14.** Two of the 16 reports were secondary papers (a 12-month follow-up and a process evaluation) of trials already counted, so 16 reports describe 14 studies.

Check every diagram the same way: each bold number equals the one above minus the exclusions beside it, and each exclusion total equals the sum of its reasons.

## How do you count duplicates in a PRISMA flow diagram?

Count records removed, not duplicate pairs or groups. If one trial appears in PubMed, Embase and CENTRAL, that is three records: you keep one and remove two, so the duplicates box goes up by 2.

- **Take the number from the tool's log** and write it down at the time.
- **Duplicates found late still count.** If you find two copies of the same record during screening, either move one into the duplicates box (and lower the screened count) or exclude it at screening with "duplicate" as the reason. Pick one and say which in your methods.
- **Duplicate reports are not duplicate records.** Two different papers from the same trial are separate reports of one study. They are linked in the final box, not removed.
- **Records from other methods that you already had** do not need to be counted again in the other methods column. Count what was new.

## What are the most common PRISMA flow diagram mistakes?

Three mistakes cause most diagrams that do not add up.

### 1. Mixing records, reports and studies

The units change at full text: records above, reports below, studies at the end. Writing "142 articles assessed" and "14 articles included" when the 14 are studies from 16 reports makes the arithmetic look wrong (142 − 129 = 13, not 14). Label every number with its unit and give both studies and reports in the last box.

### 2. Exclusion reasons that don't sum to the total

If a report fails on population and design, and you count it under both, your reasons add up to more than your excluded total. Record one main reason per report, often the first in a fixed order (population, then intervention, then comparator, then outcome, then design), and state that order in your methods.

### 3. Counts taken on different days

Searches are run, rerun and updated. If the database counts come from the first run and the screening counts from after an update search, nothing matches. Take every number from one dated state of the review and say in the methods when the searches were last run. PRISMA-S asks you to report search dates for every source [4].

Also check for a missing "Reports not retrieved" box, one total instead of a count per database, and screened equal to identified (duplicates never counted).

## How do you make a PRISMA flow diagram in Word?

Download the Word template from the PRISMA website and type your counts into the boxes:

1. Download the template that matches your sources from the PRISMA flow diagram page [2].
2. Fill in your counts from top to bottom, replacing each "(n = )".
3. Replace "Reason 1, Reason 2" with your exclusion reasons and counts. Add lines if you need them.
4. Keep unused lines as "(n = 0)" rather than deleting them, so readers see you considered them.
5. Run the arithmetic check above.
6. Save it as a figure (PDF or high-resolution image) and cite Page et al. 2021 in the caption or legend, as the CC BY 4.0 licence requires attribution [2].

PowerPoint or the PRISMA2020 Shiny app work too [3], as long as the labels match the 2020 wording.

## How to make a PRISMA flow diagram in AI for Research

In AI for Research, the PRISMA 2020 diagram is drawn from your review's live counts in the [Systematic Review workspace](/features/systematic-review), so it updates as you screen. Making and downloading it costs 0 credits.

1. **Search.** Run searches in the builders for PubMed, Europe PMC and OpenAlex (each logged with date, string and count), and upload RIS, BibTeX, CSV or .nbib exports from databases you search through your library, such as Embase or Scopus.
2. **Remove duplicates.** Matched by DOI, PMID and title, and counted.
3. **Screen.** Title and abstract, then full text: include, exclude with a reason, or maybe. Records marked maybe at title and abstract go on to full text.
4. **Open the report.** The diagram shows records per source, duplicates, screened, excluded, sought, assessed, excluded reports by reason, and included studies. Download it as SVG or PNG.

<!-- SCREENSHOT: Systematic Review report tab with the PRISMA 2020 diagram drawn from live counts and the SVG/PNG download buttons -->

**Honest limits.** Records from other methods are counted with the databases, not in a separate column. The removed-before-screening box shows duplicates only, the box beside "Reports sought" shows reports not yet assessed rather than "Reports not retrieved", and each included record counts as one study. If you need those boxes, copy the workspace counts into the official Word template. <!-- LINK: /tools/prisma-flow-diagram when L30 ships -->

The free plan covers 1 review with up to 50 records; larger reviews need a paid plan, see [pricing](/pricing) [5]. The diagram, search, deduplication and exports are free on every plan. AI screening suggestions cost 1 credit per 25 records, and an AI-drafted methods section 3 credits. Reviewers make every decision, not the AI.

## FAQ

### What goes in a PRISMA flow diagram?

A PRISMA 2020 flow diagram shows how many records you found in each database and register, how many duplicates and other records you removed before screening, how many you screened and excluded, how many full-text reports you sought, could not retrieve and assessed, how many reports you excluded with a reason for each, and finally the number of studies and reports included in the review.

### How do you count duplicates in a PRISMA flow diagram?

Count the records you removed, not the pairs you found. If the same trial appears in PubMed, Embase and CENTRAL, that is three records, one kept and two removed, so it adds 2 to the duplicates box. Take the number from your reference manager or screening tool's deduplication log, and check that identified minus removed equals the number you screened.

### What is the difference between records, reports and studies in PRISMA 2020?

A record is a title and abstract indexed in a database. A report is a document you retrieve and read in full, such as a journal article, preprint, conference abstract or trial registry entry. A study is the investigation itself, which may have several reports. That is why the final box gives two numbers: studies included and reports of included studies.

### Is there a PRISMA flow diagram template in Word?

Yes. The PRISMA website offers free Word templates of the 2020 flow diagram for new reviews (databases and registers only, or with other sources added) and for updated reviews. They are licensed CC BY 4.0, so you can edit and publish them with a citation to Page et al. 2021. There is also a free Shiny app that draws the diagram from your counts.

### Do I need the 'other methods' column in my PRISMA diagram?

Use it when you found studies outside your database and register searches, for example by citation searching, website searches or contacting authors or organizations. Those reports go in a separate column so readers can see how much each method added. If you only searched databases and registers, use the simpler template without that column.

## Next steps

- Build the search that feeds the top of the diagram: [how to build a systematic review search strategy](/blog/systematic-review-search-strategy).
- Measure how well two screeners agreed: [Cohen's kappa for screening](/blog/cohens-kappa-inter-rater-reliability).
- Compare review types in [scoping review vs systematic review](/blog/scoping-review-vs-systematic-review), or start from the pillar: [what is a systematic review](/blog/what-is-a-systematic-review).

## Sources

1. Page, M. J., McKenzie, J. E., Bossuyt, P. M., et al. (2021). The PRISMA 2020 statement: an updated guideline for reporting systematic reviews. *BMJ, 372*, n71. https://doi.org/10.1136/bmj.n71
2. PRISMA. PRISMA 2020 flow diagram (Word templates for new and updated reviews, CC BY 4.0). https://www.prisma-statement.org/prisma-2020-flow-diagram
3. Haddaway, N. R., Page, M. J., Pritchard, C. C., & McGuinness, L. A. (2022). PRISMA2020: An R package and Shiny app for producing PRISMA 2020-compliant flow diagrams. *Campbell Systematic Reviews, 18*(2), e1230. https://doi.org/10.1002/cl2.1230
4. Rethlefsen, M. L., Kirtley, S., Waffenschmidt, S., et al. (2021). PRISMA-S: an extension to the PRISMA Statement for Reporting Literature Searches in Systematic Reviews. *Systematic Reviews, 10*, 39. https://doi.org/10.1186/s13643-020-01542-z
5. AI for Research. Pricing. /pricing
