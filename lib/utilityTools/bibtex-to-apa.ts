import type { Tool } from '../tools';

const guide = `To convert BibTeX to APA, paste your BibTeX entries (or open a .bib file) into the converter above and it writes each entry as an APA 7 reference. It reads the file in your browser with citation-js [1], so nothing is uploaded, and it lists the fields each entry is missing, such as a year or a DOI. You can switch to MLA, Chicago, Harvard, IEEE or any of over 10,000 CSL styles, then copy the list or download it as a .txt or .ris file.

## Why convert BibTeX to APA?

**BibTeX is a data format for LaTeX, and APA is a writing style, so you need a converter when you write outside LaTeX.** Many researchers keep references in BibTeX because Overleaf, JabRef, Zotero and Google Scholar all export it. When a journal, supervisor or course asks for a Word document in APA 7, those entries have to become formatted references.

A BibTeX entry stores each part of the reference in a named field [2]:

\`\`\`
@article{ioannidis2005,
  author  = {Ioannidis, John P. A.},
  title   = {Why Most Published Research Findings Are False},
  journal = {PLoS Medicine},
  year    = {2005},
  volume  = {2},
  number  = {8},
  pages   = {e124},
  doi     = {10.1371/journal.pmed.0020124}
}
\`\`\`

In APA 7 [3], that entry becomes:

> Ioannidis, J. P. A. (2005). Why Most Published Research Findings Are False. *PLoS Medicine, 2*(8), e124. https://doi.org/10.1371/journal.pmed.0020124

Look at the title. APA writes article titles in sentence case ("Why most published research findings are false"), but the converter keeps the capitals your BibTeX has. Fix the title in the .bib file, or in your document, before you submit.

## Which BibTeX fields does APA need?

**For a journal article, APA needs the author, year, title, journal, volume, issue, pages and DOI.** The converter warns you when one of the core fields is missing.

| APA element | BibTeX field | Warned if missing | Note |
| --- | --- | --- | --- |
| Author | author (or editor) | Yes | Separate names with " and " |
| Year | year, or date in BibLaTeX | Yes | n.d. appears if missing |
| Title | title | Yes | Keep {braces} around acronyms |
| Journal | journal, or journaltitle in BibLaTeX [5] | Yes, for articles | Use the full name, not an abbreviation |
| Publisher | publisher (school for theses) | Yes, for books, chapters, reports, theses | |
| Volume and issue | volume, number | No | Issue is "number" in BibTeX |
| Pages | pages | No | Use 12--34; it becomes 12–34 |
| DOI | doi (or url) | Yes, for works that usually have one | Write 10.xxxx/..., not the full link |

APA 7 asks for a DOI whenever a work has one [3]. If your entry has no DOI, search the title at [doi.org](https://www.doi.org) or Crossref, or use the [citation generator](/tools/citation-generator), which finds the DOI from a title.

## How BibTeX entry types map to APA

**The entry type decides which APA template is used, so a wrong type gives a wrong reference.** Citation-js maps BibTeX types to CSL types [1], [4].

| BibTeX type | CSL type | APA reference shape |
| --- | --- | --- |
| @article | article-journal | Author. (Year). Title. *Journal, Vol*(Issue), pages. DOI |
| @book | book | Author. (Year). *Title* (ed.). Publisher. DOI |
| @incollection, @inbook | chapter | Author. (Year). Title. In Editor (Ed.), *Book* (pp. x–y). Publisher. |
| @inproceedings | paper-conference | Author. (Year). Title. In *Proceedings title* (pp. x–y). Publisher. DOI |
| @phdthesis, @mastersthesis | thesis | Author. (Year). *Title* [Doctoral dissertation, University]. |
| @techreport | report | Author. (Year). *Title* (Report No. x). Publisher. |
| @misc, @online | document or webpage | Varies; check by hand |

Worked example (illustrative): a chapter typed as @misc loses its editor and book title in APA. Change it to @incollection, add booktitle, editor and publisher, and the reference gains "In J. Smith (Ed.), *Book title* (pp. 45–67)."

## Common mistakes in BibTeX files

1. **Commas between authors.** BibTeX separates authors with " and ". "Smith, Jane, Lee, Min" is read as one person. Write "Smith, Jane and Lee, Min" [2].
2. **Title case in article titles.** BibTeX from Google Scholar and many publishers uses title case. APA wants sentence case for article and chapter titles. Fix the capitals by hand.
3. **Acronyms without braces.** In LaTeX, styles may lower-case "DNA" unless you write {DNA}. Braces do no harm in this converter, so keep them.
4. **Missing DOIs.** Google Scholar's BibTeX export often has no DOI. Add it, since APA 7 includes it.
5. **Abbreviated journal names.** "J Am Med Assoc" should be "Journal of the American Medical Association" in APA.
6. **LaTeX accents.** Write accents as {\\"o} or type the letter (ö). The converter turns common LaTeX accents into letters, but check names with unusual characters.
7. **Broken braces.** One missing closing brace can swallow the next entry. The converter reads entries one by one when the file will not parse whole, and names the entries it could not read.

## Should I export RIS as well?

**Yes, if you want to move the references into Zotero, Mendeley or EndNote.** RIS is a plain-text exchange format that most reference managers import. The converter writes one RIS record per entry with the authors, title, journal, year, volume, issue, pages, publisher and DOI. Import it, check a few records, and you can then cite from the reference manager in Word.

## How to convert BibTeX to APA with AI for Research

The converter on this page is free, needs no account and reads your file in your browser; nothing is uploaded or stored. It uses citation-js and CSL styles, not AI, so it never uses credits.

If you write in the AI for Research editor, you can import a .bib file or a Zotero or Mendeley library with the [reference manager import](/features/reference-manager-import), keep it in the [research library](/features/research-library), and cite them in over 10,000 styles as you write. The document exports to Word or LaTeX with [Word and LaTeX export](/features/word-latex-export). Citations never use credits, on any plan; the Free plan also gives 45 credits a month for AI features.

## Next steps

- Read the [APA reference list](/blog/apa-reference-list) guide to check the finished list.
- Have a list that is already formatted in another style? Use the [citation formatter](/tools/citation-formatter).
- Need the matching in-text citations? Try the [in-text citation generator](/tools/in-text-citation-generator).
- Compare reference managers in [Zotero vs Mendeley](/blog/zotero-vs-mendeley).

## Sources

1. Willighagen, L. G. (2019). Citation.js: A format-independent, modular bibliography tool for the browser and command line. *PeerJ Computer Science, 5*, e214. https://doi.org/10.7717/peerj-cs.214
2. Patashnik, O. (1988). *BiBTeXing*. CTAN. https://ctan.org/pkg/bibtex
3. American Psychological Association. (2020). *Publication manual of the American Psychological Association* (7th ed.). https://doi.org/10.1037/0000165-000. See also APA Style, "References": https://apastyle.apa.org/style-grammar-guidelines/references
4. Citation Style Language. *CSL 1.0.2 specification*. https://docs.citationstyles.org/en/stable/specification.html
5. Kime, P., Wemheuer, M., & Lehman, P. *The biblatex package*. CTAN. https://ctan.org/pkg/biblatex <!-- VERIFY: current maintainers listed on CTAN -->
`;

export const bibtexToApa: Tool = {
  slug: 'bibtex-to-apa',
  name: 'BibTeX to APA converter',
  category: 'citations',
  kind: 'utility',
  seoTitle: 'BibTeX to APA converter: free, in your browser',
  description: 'Convert BibTeX to APA 7, MLA, Chicago or any CSL style. Paste entries or open a .bib file; see missing fields; copy or download .txt and .ris. Nothing is uploaded.',
  short: 'Paste BibTeX or open a .bib file. Get APA 7 references.',
  heading: 'BibTeX to APA converter',
  intro: 'Paste BibTeX entries or open a .bib file. Each entry is written as an APA 7 reference, or in any other style you pick, with a warning for missing authors, years, titles, journals, publishers and DOIs. The file is read in your browser and never uploaded.',
  keywords: ['bibtex to apa', 'bibtex to apa converter', 'convert bibtex to apa', 'bib to apa', 'bibtex converter', 'bibtex to ris'],
  steps: [
    { title: 'Add your BibTeX', body: 'Paste entries, or open a .bib file. It is read in your browser.' },
    { title: 'Check the warnings', body: 'Each entry lists missing fields. Fix them in the .bib file or in your document.' },
    { title: 'Copy or download', body: 'Copy with italics for Word, or download the list as .txt or the entries as .ris.' },
  ],
  limitations: [
    'Titles keep the capitals in your BibTeX. APA wants sentence case for article titles, so check them.',
    'It formats what the entry holds. It does not look up missing DOIs or fix wrong entry types.',
    'Files up to 2 MB. Macros defined with @string are supported; custom LaTeX commands may not be.',
  ],
  faq: [
    { q: 'How do I convert BibTeX to APA?', a: 'Paste your BibTeX entries into the converter, or open your .bib file, and APA 7 is selected by default. Each entry appears as a formatted APA reference with any missing fields listed beneath it. Copy the list with italics into Word or Google Docs, or download it as a .txt file.' },
    { q: 'Is my .bib file uploaded?', a: 'No. The file is read and converted in your browser with citation-js. Nothing is sent to AI for Research or stored anywhere, and closing the page clears it.' },
    { q: 'Why are my titles not in sentence case?', a: 'The converter keeps the capitals your BibTeX entry has, because it cannot tell a proper noun from an ordinary word with certainty. APA 7 writes article and chapter titles in sentence case, so change the capitals by hand, keeping names, places and acronyms capitalised.' },
    { q: 'Can I convert BibTeX to MLA, Chicago or IEEE?', a: 'Yes. Pick another style from the list, or search over 10,000 CSL styles, including journal and university versions. The references are reformatted at once.' },
    { q: 'Can I export to Zotero or Mendeley?', a: 'Yes. Download the .ris file and import it into Zotero, Mendeley, EndNote or most other reference managers. Check a few records after the import.' },
  ],
  features: ['reference-manager-import', 'research-library', 'word-latex-export'],
  related: ['citation-formatter', 'citation-generator', 'in-text-citation-generator'],
  guide,
  reviewed: '2026-11-14',
};
