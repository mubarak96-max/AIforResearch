---
slug: "reference-list-formatter"
seo_title: "Reference List Formatter: Clean, Check and Export to BibTeX"
description: "A free reference list formatter: paste a messy list to remove duplicates, flag retractions and errors, format it in 10,000+ styles and download RIS or BibTeX."
heading: "A reference list formatter that checks every entry first"
intro: "Paste a messy reference list. It is deduplicated, each entry is looked up and checked for retractions and wrong details, and the list comes back in the style you choose, ready to import as RIS or BibTeX."
primary_keyword: "reference list formatter"
secondary_keywords: ["format references", "bibliography formatter", "convert references to bibtex", "references to ris", "fix reference list"]
hero: "cta"
cta:
  label: "Open the reference list formatter"
  href: "/reviewer?module=references"
plan_note: "The Free plan has 45 credits a month. Formatting a reference list costs nothing; the optional AI cleanup of entries that could not be read costs 1 credit."
related: ["/blog/how-to-format-a-reference-list", "/tools/citation-generator", "/features/citation-checker", "/features/reference-manager-import", "/features/journal-formatter", "/citation-styles", "/blog/how-to-cite-a-research-paper", "/blog/zotero-vs-mendeley"]
updated: "2026-11-13"
faq:
  - q: "How do I fix a messy reference list?"
    a: "Paste it into the reference list formatter in the Reviewer. It splits the list into entries, merges duplicates, and looks each one up by DOI or title. Entries it finds come back with their published details in the style you pick; entries it cannot find are kept exactly as you typed them and flagged, so you can correct them by hand. The formatting itself costs nothing."
  - q: "Can I convert my references to BibTeX or RIS?"
    a: "Yes. After the check you can download the whole list as BibTeX for LaTeX and Overleaf, or as RIS for Zotero, Mendeley, EndNote and most other reference managers. References that could not be verified are included too, with a note in each entry that says it was not verified and gives the text as you typed it."
  - q: "How is this different from the free citation generator?"
    a: "The free citation generator formats one citation at a time from a DOI, URL or title, without an account. The reference list formatter takes a whole list, up to 200 references, removes duplicates, checks each entry against published records and flags retractions, then formats and exports the list in one go."
  - q: "What does the AI cleanup do?"
    a: "Some references are too garbled for the parser to read: authors run into titles, or the year sits in the wrong place. The AI cleanup reads the fields out of those entries exactly as written, without guessing a DOI, pages or volume, and the formatter looks them up again. It costs 1 credit. Entries it fixed but could not then find are marked \"cleaned by AI but not verified\"."
  - q: "Is this the same as Citation check?"
    a: "No. Citation check reads your manuscript and asks whether each cited paper exists, is not retracted and supports the sentence that cites it. The reference list formatter works on the list alone: it checks that each entry is real and correct and gives you a clean, formatted, importable list. Use the formatter to tidy the list, and Citation check to test what your text says about the papers."
---
The reference list formatter in AI for Research takes a reference list that grew messy over months of writing, with mixed styles, duplicates, missing DOIs and a few entries copied from somewhere half-remembered, and gives it back clean. It is in the Reviewer. You paste or upload the list. It removes duplicates, looks up each entry, flags retracted papers and details that do not match the published record, formats the list in the style you choose and lets you download it as RIS or BibTeX. Formatting costs nothing.

<!-- SCREENSHOT: the Reviewer with "Reference list" selected, a pasted list of mixed-style references and the style picker set to APA 7 -->

## What it does

| Step | What happens |
| --- | --- |
| Split | The pasted text is divided into separate references, numbered or not |
| Deduplicate | Entries with the same DOI are merged; without a DOI, the same normalized title and year. A second pass merges entries that turn out to be the same paper after lookup |
| Check | Each entry is looked up as Citation check does it: by DOI at Crossref, otherwise by title at OpenAlex. Retractions and details that differ (year, authors, journal) are flagged |
| Format | Verified entries are given back in any of 10,000+ citation styles, with the published details |
| Export | The whole list downloads as RIS or BibTeX |

Every entry ends up with one of three labels:

- **Verified:** a matching record was found, and the formatted reference uses its details.
- **Cleaned by AI but not verified:** the AI cleanup read the fields, but no record was found.
- **Could not be verified:** kept exactly as typed, with the reason. If the closest record has a clearly different title, the formatter says so and does not swap in the wrong paper.

A list can hold up to 200 references.

## What a messy reference list looks like

Most reference lists break in the same few ways. The formatter is built to catch these:

| Problem | Example (invented) | What the formatter does |
| --- | --- | --- |
| Mixed styles | One entry in APA, the next in Vancouver, a third pasted from a publisher page | Formats every verified entry in the one style you choose |
| Duplicates | The same paper twice, once with a DOI and once without, or with the title in a different case | Merges them and lists the copies it removed |
| Wrong details | The year of the online-first version instead of the issue, a misspelled author, a missing volume | Uses the published record and flags the difference |
| Retracted papers | A study retracted after you cited it | Flags it as retracted so you can decide |
| Garbled entries | Author names run into the title after a copy from a PDF | AI cleanup reads the fields, then the entry is looked up again |
| Entries nobody can find | A conference talk, a report from an organization's website, a typo in the title | Kept as typed and marked could not be verified |

The last row matters. A formatter that silently "fixes" an entry it cannot find can turn a typo into a different paper. This one does not: if no record matches, the entry keeps your text and says so.

## How it works, step by step

1. Open the Reviewer and choose **Reference list**. <!-- VERIFY: the module's label in the Reviewer and the names of the AI cleanup and download buttons once the UI is merged -->
2. Paste the reference list or upload the document it sits in.
3. Choose the citation style. APA, MLA, Chicago, Harvard, Vancouver, IEEE and the house styles of thousands of journals are in the list.
4. Run the check. The summary line says how many references were verified, how many could not be, and how many duplicates were merged.
5. Read the flags. A retracted paper needs a decision from you: remove it, or cite it as retracted if that is the point.
6. If some entries could not be read at all, run **AI cleanup** (1 credit) and they are looked up again.
7. Copy the formatted list, or download **RIS** or **BibTeX** for your reference manager or LaTeX project.

<!-- SCREENSHOT: the results, one reference flagged as retracted, two merged duplicates and the RIS and BibTeX download buttons -->

## A worked example

*Example (invented for illustration):* a PhD student is moving her literature review chapter from Word into Overleaf. Her reference list has 86 entries collected over three years in three styles.

1. She pastes the list and picks the style her department uses. The check merges 5 duplicates, verifies 74 entries and cannot verify 7. One verified paper is flagged as retracted, and two entries had the wrong year. Cost: 0 credits.
2. Four of the 7 unverified entries are conference papers pasted as one run-on line. She runs AI cleanup: 1 credit. Three are then found; one stays unverified and she fixes it by hand from the conference website.
3. She downloads BibTeX and uploads it to her Overleaf project.

Total: 1 credit.

## What it does not do

- It does not check what your text says about the papers. That is [Citation check](/features/citation-checker), which reads the manuscript.
- It does not invent missing details. A reference that cannot be found stays as you typed it, and the AI cleanup never guesses a DOI, volume or page range.
- It does not search Google Scholar, Scopus or Web of Science. Lookups use Crossref and OpenAlex, which cover most journal articles with a DOI; books, reports and grey literature are found less often.
- It does not replace your reference manager. Import the RIS or BibTeX file into Zotero, Mendeley or your own Library and keep citing from there.
- Its output is a formatted list, not proof that every reference is correct. Spot-check the flagged entries against the source.

## Who uses it

- Master's and PhD students cleaning a thesis bibliography before submission: see [AI for a master's thesis](/for/masters) and [AI tools for PhD students](/for/phd).
- Undergraduates whose essay references mix styles: see [AI for college students](/for/undergraduates).
- Academics moving a paper to a journal with a different reference style: see [AI for academics](/for/academics).

For one reference at a time without an account, use the free [citation generator](/tools/citation-generator). To bring a whole Zotero or Mendeley library across, use [reference manager import](/features/reference-manager-import). To put the rest of the manuscript in a journal's format, use the [journal formatter](/features/journal-formatter).

## Learn more

- [How to format a reference list](/blog/how-to-format-a-reference-list)
- [How to cite a research paper](/blog/how-to-cite-a-research-paper)
- [Zotero vs Mendeley](/blog/zotero-vs-mendeley)
