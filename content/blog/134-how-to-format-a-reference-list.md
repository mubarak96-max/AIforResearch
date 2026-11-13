---
title: "How to Format a Reference List: APA, Vancouver, IEEE, Harvard"
slug: "how-to-format-a-reference-list"
description: "How to format a reference list in APA 7, Vancouver, IEEE and Harvard: examples, ordering, DOIs, hanging indents, duplicates and RIS or BibTeX export."
primary_keyword: "how to format a reference list"
secondary_keywords: ["reference list format", "apa reference list", "vancouver reference list", "ieee reference list", "harvard reference list", "hanging indent references", "bibtex export"]
cluster: "R. Writing and publishing papers"
pillar: "/blog/how-to-write-a-conference-paper"
author: "Mubarak"
compares_tools: false
published: "2026-11-13"
updated: "2026-11-13"
faq:
  - q: "How do you order a reference list?"
    a: "It depends on the style. Author-date styles such as APA and Harvard list references alphabetically by the first author's surname. Numbered styles such as Vancouver and IEEE list them in the order they are first cited in the text, so reference 1 is the first source you cite."
  - q: "What is a hanging indent in a reference list?"
    a: "A hanging indent keeps the first line of each reference at the margin and indents the following lines, usually by 0.5 inch or 1.27 cm. APA and Harvard reference lists use it so readers can scan the authors' names. In Word, select the list, open Paragraph, and choose Special, Hanging."
  - q: "Should I include DOIs in my reference list?"
    a: "Yes, where the style asks for them and the source has one. APA 7 formats a DOI as a full https://doi.org/ link. Vancouver and IEEE also accept DOIs. A DOI lets readers and editors find the exact version you cited, and it helps tools check that the reference is real."
  - q: "What is the difference between a reference list and a bibliography?"
    a: "A reference list contains only the sources you cite in the text. A bibliography can also include works you read for background but did not cite. Most journals and theses in the sciences and social sciences want a reference list; some humanities styles use a bibliography."
  - q: "How do I fix a messy reference list quickly?"
    a: "Import the references into a reference manager or a formatter by DOI or by pasting them, remove duplicates, check each against the source, and let the tool apply one style. Then read the result once by eye, because missing data in the source records (a missing issue number or wrong capitalization) carries through to the output."
---

# How to format a reference list

*Last updated: 13 November 2026*

To format a reference list, choose the style your journal, university or instructor requires, include every source you cite and nothing you do not, and order the list as the style says: alphabetically by author for author-date styles like APA and Harvard, or by order of first citation for numbered styles like Vancouver and IEEE. Then apply the style's punctuation, add DOIs, use a hanging indent where required, and remove duplicates.

This guide is part of our series on writing and publishing papers; the pillar is [how to write a conference paper](/blog/how-to-write-a-conference-paper). If you need help with in-text citations rather than the list itself, see [how to cite a research paper](/blog/how-to-cite-a-research-paper).

## Reference list basics that apply to every style

1. **One entry per source,** for every source cited in the text. Nothing uncited, unless your style calls for a bibliography.
2. **Consistent order:** alphabetical or numbered, never a mix.
3. **Complete data:** authors, year, title, the container (journal, book, conference), volume, issue, pages or article number, and a DOI or URL where the style wants one.
4. **Consistent punctuation and capitalization** throughout. Most errors are inconsistency, not wrong rules.
5. **The title "References"** (or "Reference list", or "Bibliography" if your style uses one), on a new page for theses and many manuscripts.

## The four styles you will meet most

Each example below shows the same invented journal article and book in four styles. *Example (invented): the authors, titles and DOIs are made up for illustration.* Always check the current style manual or your journal's guide for edge cases.

### APA 7 (author-date)

```text
Lee, M. (2021). Research design in practice (2nd ed.). Example Press.

Nguyen, T. H., & Okafor, C. (2023). Sleep duration and exam performance in
    first-year nursing students. Journal of Nursing Education Research, 12(3),
    145–158. https://doi.org/10.5555/jner.2023.0456
```

- Alphabetical by the first author's surname; double-spaced; hanging indent of 0.5 inch.
- Journal name and volume in italics; book titles in italics and sentence case.
- Up to 20 authors listed; for 21 or more, the first 19, an ellipsis, then the last author.
- DOIs as https://doi.org/ links; no "Retrieved from" and no publisher location.
- Two works by the same author in the same year: 2023a, 2023b.

### Vancouver (numbered, used in medicine)

```text
1. Nguyen TH, Okafor C. Sleep duration and exam performance in first-year
   nursing students. J Nurs Educ Res. 2023;12(3):145-58.
   doi:10.5555/jner.2023.0456
2. Lee M. Research design in practice. 2nd ed. London: Example Press; 2021.
```

- Numbered in the order first cited in the text; the same number is reused each time a source is cited again.
- Surnames followed by initials with no periods; journal titles abbreviated as in the NLM Catalog.
- Page ranges are often shortened (145-58).
- Many journals list the first six authors, then "et al."; others list all. <!-- VERIFY: the author limit varies by journal; ICMJE sample references and NLM Citing Medicine differ -->

### IEEE (numbered, used in engineering and computing)

```text
[1] T. H. Nguyen and C. Okafor, "Sleep duration and exam performance in
    first-year nursing students," J. Nurs. Educ. Res., vol. 12, no. 3,
    pp. 145–158, 2023, doi: 10.5555/jner.2023.0456.
[2] M. Lee, Research Design in Practice, 2nd ed. London, U.K.: Example Press, 2021.
```

- Numbered in square brackets, in the order first cited.
- Initials before surnames; article titles in quotation marks; journal names abbreviated and italic.
- "vol.", "no." and "pp." labels.
- For many authors, IEEE allows the first author followed by "et al." <!-- VERIFY: current IEEE Reference Guide threshold for using et al. (commonly more than six authors) -->

### Harvard (author-date, many variants)

```text
Lee, M. (2021) Research design in practice. 2nd edn. London: Example Press.

Nguyen, T.H. and Okafor, C. (2023) 'Sleep duration and exam performance in
    first-year nursing students', Journal of Nursing Education Research,
    12(3), pp. 145–158. Available at: https://doi.org/10.5555/jner.2023.0456.
```

- There is no single official Harvard style. Universities publish their own guides, and many in the UK follow the "Cite Them Right" version shown here. <!-- VERIFY: the example matches the current Cite Them Right edition -->
- Alphabetical, with a hanging indent; year in parentheses without a following period in this version.
- Use your institution's guide exactly; examiners check against it.

### Quick comparison

| Feature | APA 7 | Vancouver | IEEE | Harvard |
| --- | --- | --- | --- | --- |
| In text | (Nguyen & Okafor, 2023) | 1 or [1] | [1] | (Nguyen and Okafor, 2023) |
| List order | Alphabetical | Order of citation | Order of citation | Alphabetical |
| Author names | Surname, initials | Surname initials | Initials surname | Surname, initials |
| Article title | Plain, sentence case | Plain | In quotes | In quotes |
| Journal name | Full, italic | Abbreviated | Abbreviated, italic | Full, italic |
| Hanging indent | Yes | No (numbered) | No (numbered) | Yes |

Other styles you may need include Chicago (notes-bibliography or author-date), MLA, Nature, AMA and ACS. Our [citation styles](/citation-styles) page lists more.

## Step by step: formatting a reference list

1. **Confirm the style and version.** "APA" means APA 7 for most programs now, but check. For a journal, read its author guidelines; see [how to format a paper for a journal](/blog/how-to-format-a-paper-for-a-journal).
2. **Collect every citation from the text.** Search the draft for parentheses and brackets, or let your reference manager build the list from the citations it inserted.
3. **Get clean data for each source.** Import by DOI, PubMed ID or from the publisher's page rather than typing. Records copied from search engines often have wrong capitalization or missing issue numbers.
4. **Remove duplicates.** The same paper often appears twice: once as a preprint and once as the published version, or with different capitalization. Cite the published version unless you used something only in the preprint.
5. **Apply the style** with a reference manager or formatter.
6. **Check the order:** alphabetical, or in order of first citation. In numbered styles, renumber after any edit.
7. **Add DOIs** where the source has one and the style wants it.
8. **Apply the layout:** hanging indent for author-date styles, line spacing as required.
9. **Cross-check:** every in-text citation has an entry, and every entry is cited.
10. **Check for retractions.** A retracted paper in your list is a problem for any reviewer. Check before submission, not after.

## Common errors in reference lists

- **Mixed styles:** some entries in APA, others copied from a database in another format.
- **Title Case where sentence case is required** (APA article titles) or the reverse.
- **Missing DOIs** or DOIs written in old formats ("doi:" in APA 7, which wants a link).
- **Wrong order** in numbered styles after inserting a new citation.
- **"et al." in the reference list** where the style wants all authors (APA lists up to 20).
- **Missing page numbers or article numbers** for online-only journals.
- **Citing sources you did not read.** If you cite a claim through a secondary source, the style has rules for that; and our guide to [checking a claim against the research](/blog/how-to-check-a-claim-against-the-research) explains why it matters.
- **Invented references** from a chatbot. Every reference should resolve to a real record. Check DOIs.

## Exporting to RIS or BibTeX

If you plan to keep working on the paper, move your references into a reference manager rather than keeping them only as formatted text. The two common exchange formats:

- **RIS** is read by Zotero, Mendeley, EndNote and most others.
- **BibTeX** is used with LaTeX. Each entry has a key that you cite with `\cite{key}`.

```bibtex
@article{nguyen2023sleep,
  author  = {Nguyen, T. H. and Okafor, C.},
  title   = {Sleep duration and exam performance in first-year nursing students},
  journal = {Journal of Nursing Education Research},
  year    = {2023},
  volume  = {12},
  number  = {3},
  pages   = {145--158},
  doi     = {10.5555/jner.2023.0456}
}
```

*Example (invented).* In LaTeX, the bibliography style file (for example, IEEEtran.bst or an APA package) does the formatting, so the BibTeX entry stays the same whatever the journal. Our comparison of [Zotero vs Mendeley](/blog/zotero-vs-mendeley) helps you choose a manager.

## A worked example: cleaning a messy list

*Example (invented for illustration).* A master's student has 48 references collected over two years, in three formats. They:

1. Paste the whole list into a formatter.
2. Find 4 duplicates (two preprint and published pairs, two capitalization variants) and remove them.
3. See 3 entries without DOIs, and 1 flagged as retracted. They replace the retracted study with a later one and rewrite the sentence that cited it.
4. Choose APA 7, get the list back alphabetized, and export it as RIS into Zotero for the rest of the thesis.

The final list has 43 references, all matched to in-text citations.

## Format a reference list in AI for Research

The **Reference list formatter** in the Reviewer (**/reviewer?module=references**) takes a pasted reference list in any mix of formats. It removes duplicates, checks each entry the way Citation check does (whether it resolves to a real record, its DOI, and whether it has been retracted), and returns the list in the style you choose from 10,000+ citation styles. You can download the result as RIS or BibTeX to import into a reference manager.

Formatting is free. An optional AI cleanup for badly broken entries costs 1 credit. The Free plan has 45 credits a month; see [pricing](/pricing).

<!-- SCREENSHOT: Reference list formatter with a pasted messy list, the duplicate and retraction flags, and the APA 7 output with RIS and BibTeX download buttons -->

What it does not do: it does not check that your in-text citations match the list, and it cannot fix a reference whose source record is wrong. Read the output once against your style guide. See the [reference list formatter](/features/reference-list-formatter) page for details, or format a single source with the free [citation generator](/tools/citation-generator).

## FAQ

### How do you order a reference list?

It depends on the style. Author-date styles such as APA and Harvard list references alphabetically by the first author's surname. Numbered styles such as Vancouver and IEEE list them in the order they are first cited in the text, so reference 1 is the first source you cite.

### What is a hanging indent in a reference list?

A hanging indent keeps the first line of each reference at the margin and indents the following lines, usually by 0.5 inch or 1.27 cm. APA and Harvard reference lists use it so readers can scan the authors' names. In Word, select the list, open Paragraph, and choose Special, Hanging.

### Should I include DOIs in my reference list?

Yes, where the style asks for them and the source has one. APA 7 formats a DOI as a full https://doi.org/ link. Vancouver and IEEE also accept DOIs. A DOI lets readers and editors find the exact version you cited, and it helps tools check that the reference is real.

### What is the difference between a reference list and a bibliography?

A reference list contains only the sources you cite in the text. A bibliography can also include works you read for background but did not cite. Most journals and theses in the sciences and social sciences want a reference list; some humanities styles use a bibliography.

### How do I fix a messy reference list quickly?

Import the references into a reference manager or a formatter by DOI or by pasting them, remove duplicates, check each against the source, and let the tool apply one style. Then read the result once by eye, because missing data in the source records (a missing issue number or wrong capitalization) carries through to the output.

## Related

- [How to cite a research paper](/blog/how-to-cite-a-research-paper)
- [How to format a paper for a journal](/blog/how-to-format-a-paper-for-a-journal)
- [How to write a conference paper](/blog/how-to-write-a-conference-paper)
- [AI citation generator](/blog/ai-citation-generator)
- [Citation checker](/features/citation-checker)
