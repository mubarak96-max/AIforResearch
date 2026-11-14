import type { Tool } from '../tools';

const guide = `A citation formatter converts a reference list from one citation style to another, for example from Vancouver to APA 7 or from Harvard to MLA. The formatter above looks up each reference in a scholarly index, by its DOI when the line has one and by its title otherwise, then writes it again in the style you choose. Matches it is not sure of are marked for you to check, and anything it cannot find stays as you pasted it, so nothing is silently lost.

## How does the citation formatter work?

**It matches each pasted reference to a record in a scholarly index, then formats that record with a Citation Style Language (CSL) style.** It does not rewrite your text with AI, and it does not guess missing details.

1. **Split.** The list is split into one reference per line. If your references wrap over several lines, put a blank line between them. Numbers such as "1." or "[1]" at the start are removed.
2. **Look up.** If a line contains a DOI, the DOI is looked up directly. Otherwise the tool finds the likely title (the quoted title, or the sentence after the year) and searches for it. Lookups run two at a time, up to 50 references per run.
3. **Check the match.** A result counts as a match only if most of its title words appear in your line and the year agrees. A DOI match is trusted. Weaker results are marked "Check this match"; poor ones are discarded as "Not found".
4. **Format.** Matched records are formatted with citation-js [1] using the CSL style you picked [2]. Change the style at any time and the list is reformatted without a new lookup.
5. **Copy.** Copy with italics for Word or Google Docs, or as plain text.

## What do the match labels mean?

**"Matched" is used automatically, "Check this match" needs your decision, and "Not found" is kept as pasted.**

| Label | What it means | What to do |
| --- | --- | --- |
| Matched | The DOI matched, or the title and year agree closely | Read the result once; it is already in the list |
| Check this match | The title is similar but not close enough, or the year is off | Compare with your line, then choose Use match or Reject |
| Not found | No result was close enough | Add the DOI to the line and run again, or cite it by hand |
| Lookup failed | The search was busy or the hourly limit was reached | Wait a minute and run again |

The guard against weak matches matters. A search for a common title such as "Introduction" or "Editorial" can return a different paper with the same words. Rejecting a wrong match keeps your original line in the output.

## Worked example: Vancouver to APA 7

Input (Vancouver, as found in a medical paper) [4]:

> Ioannidis JP. Why most published research findings are false. PLoS Med. 2005;2(8):e124.

The line has no DOI, so the tool searches for the title. The top result has the same title and the year 2005, so it is marked Matched. In APA 7 the output is:

> Ioannidis, J. P. A. (2005). Why most published research findings are false. *PLoS Medicine, 2*(8), e124. https://doi.org/10.1371/journal.pmed.0020124

<!-- VERIFY: run this line through the live tool and paste the exact APA output (author initials depend on the index record) -->

Notice what the lookup adds that the original did not have: the full journal name, the second initial and the DOI. APA 7 asks for a DOI whenever a work has one [3].

## Worked example: APA to Harvard

Input (APA 7, with a DOI) [5]:

> Open Science Collaboration. (2015). Estimating the reproducibility of psychological science. *Science, 349*(6251), aac4716. https://doi.org/10.1126/science.aac4716

The DOI is looked up directly, so the match is certain. In Harvard (Cite Them Right) it becomes:

> Open Science Collaboration (2015) 'Estimating the reproducibility of psychological science', *Science*, 349(6251), aac4716. Available at: https://doi.org/10.1126/science.aac4716.

<!-- VERIFY: exact Cite Them Right CSL output for a group-author journal article with a DOI (punctuation after the URL) -->

## Which references convert well, and which do not?

**Journal articles, conference papers and books with DOIs convert best; web pages, reports and unpublished work often do not.**

| Source type | Likely result | Why |
| --- | --- | --- |
| Journal article with a DOI | Matched | The DOI points to one record |
| Journal article without a DOI | Usually matched | The title and year are enough |
| Book or chapter | Often matched, check it | Editions and reprints share titles |
| Conference paper | Often matched | Proceedings titles vary between indexes |
| Web page, blog, news story | Usually not found | Scholarly indexes do not hold them |
| Report, thesis, dataset | Mixed | Some are indexed, many are not |
| Personal communication, interview | Not found | They have no public record |

For anything not found, use the [citation generator](/tools/citation-generator), which has forms for websites, books and journal articles.

## Common mistakes when converting citation styles

1. **Trusting every match without reading it.** A match means a record was found, not that it is the work you used. Read the author, year and journal once.
2. **Pasting references that wrap without blank lines.** If one reference runs over two lines, the tool reads it as two. Put a blank line between references.
3. **Forgetting the in-text citations.** Changing the reference list from numeric to author-date means every [1] in your text must become (Author, year), and the reverse. The [in-text citation generator](/tools/in-text-citation-generator) shows each form.
4. **Leaving the order unchanged.** Author-date styles (APA, MLA, Harvard, Chicago author-date) sort alphabetically; numeric styles (IEEE, Vancouver, AMA) follow the order of first citation. The formatter sorts author-date lists for you and keeps your order for numeric ones.
5. **Ignoring sentence case.** APA writes article titles in sentence case. If an index stores a title in title case, the style may not change it. Check capital letters in titles.
6. **Mixing two styles.** Lines kept "as pasted" are still in the old style. Fix them by hand or with the citation generator before you submit.

## How to reformat references with AI for Research

The formatter on this page is free, needs no account, and uses a lookup, not AI. Signed-out visitors can run about 120 lookups an hour, which covers two full lists of 50.

If you write in the editor, you cite from your sources and pick the style for the whole document, in over 10,000 CSL styles. You can bring in a library from Zotero or Mendeley with the [reference manager import](/features/reference-manager-import), keep sources in the [research library](/features/research-library), and run the [citation checker](/features/citation-checker) to flag retracted papers, wrong DOIs and claims a source does not support. Citations never use credits, on any plan; the Free plan also gives 45 credits a month for AI features.

## Next steps

- Read [how to format a reference list](/blog/how-to-format-a-reference-list) for the rules behind each style.
- See the [APA reference list](/blog/apa-reference-list) guide for the target format.
- Have a BibTeX file? Use [BibTeX to APA](/tools/bibtex-to-apa) instead; it needs no lookup.

## Sources

1. Willighagen, L. G. (2019). Citation.js: A format-independent, modular bibliography tool for the browser and command line. *PeerJ Computer Science, 5*, e214. https://doi.org/10.7717/peerj-cs.214
2. Citation Style Language. *CSL specification and style repository*. https://citationstyles.org
3. American Psychological Association. (2020). *Publication manual of the American Psychological Association* (7th ed.). https://doi.org/10.1037/0000165-000
4. Ioannidis, J. P. A. (2005). Why most published research findings are false. *PLoS Medicine, 2*(8), e124. https://doi.org/10.1371/journal.pmed.0020124
5. Open Science Collaboration. (2015). Estimating the reproducibility of psychological science. *Science, 349*(6251), aac4716. https://doi.org/10.1126/science.aac4716
`;

export const citationFormatter: Tool = {
  slug: 'citation-formatter',
  name: 'Citation formatter',
  category: 'citations',
  kind: 'utility',
  seoTitle: 'Citation formatter: reformat references in any style, free',
  description: 'Free citation formatter. Paste a reference list in any style and convert it to APA, MLA, Chicago, Harvard, IEEE or 10,000+ styles. Weak matches are flagged.',
  short: 'Paste a reference list. Get it back in another style.',
  heading: 'Citation formatter: convert a reference list to another style',
  intro: 'Paste your reference list in any style. Each reference is looked up by its DOI or title and written again in the style you pick, from APA and MLA to IEEE and Vancouver. Matches that need a second look are marked, and references that are not found stay as you pasted them.',
  keywords: ['citation formatter', 'reformat references', 'convert citation style', 'reference formatter', 'change citation style', 'convert references to apa'],
  steps: [
    { title: 'Paste your list', body: 'One reference per line, or a blank line between references. Any style, up to 50 at a time.' },
    { title: 'Look up and check', body: 'Each reference is matched by DOI or title. Accept or reject the ones marked “Check”.' },
    { title: 'Pick a style and copy', body: 'Choose the style, then copy with italics for Word or as plain text.' },
  ],
  limitations: [
    'It can only reformat works it finds in a scholarly index. Web pages, reports and personal communications are usually not found and stay as pasted.',
    'A match is a record, not proof it is the version you read. Check authors, year and edition.',
    'It changes the reference list only. Update your in-text citations if you switch between numeric and author-date styles.',
  ],
  faq: [
    { q: 'How do I convert a reference list to another citation style?', a: 'Paste the list into the formatter, one reference per line, and choose Look up and reformat. Each reference is matched by its DOI or title and written again in the style you pick. Change the style at any time without a new lookup. Check matches marked Check this match before you copy.' },
    { q: 'Why does a reference say Not found?', a: 'The lookup found no record close enough to your line. This is common for web pages, reports, theses and very new work. Add the DOI to the line and run it again, or enter the source by hand in the citation generator. The reference stays in the output exactly as you pasted it.' },
    { q: 'Does it change my in-text citations?', a: 'No. It formats the reference list only. If you move between a numeric style such as IEEE and an author-date style such as APA, update every in-text citation too. The in-text citation generator shows the right form for each style.' },
    { q: 'How many references can I convert at once?', a: 'Up to 50 per run, looked up two at a time. Signed-out visitors can make about 120 lookups an hour, so split very long lists into several runs.' },
    { q: 'Is the citation formatter free?', a: 'Yes, with no account. It uses a lookup and citation-js, not AI, so it never uses credits on any plan.' },
  ],
  features: ['citation-checker', 'reference-manager-import', 'research-library'],
  related: ['citation-generator', 'bibtex-to-apa', 'in-text-citation-generator'],
  guide,
  reviewed: '2026-11-14',
};
