/**
 * One page per popular citation style (/tools/citation-generator/[style]). Each shows the same
 * real paper, Watson & Crick (1953), cited in that style, plus the source patterns people search
 * for (journal article, book, website).
 *
 * Markup in examples: *italic*, **bold**, ^^small caps^^. Rendered by components/marketing/Formatted.
 */

export type StylePattern = { label: string; text: string };

export type CitationStyle = {
  slug: string;
  name: string;
  /** "7th edition", shown next to the name. */
  edition: string;
  /** The CSL style the generator on the page uses. */
  cslId: string;
  seoTitle: string;
  description: string;
  heading: string;
  intro: string;
  keywords: string[];
  kind: 'Author–date' | 'Author–page' | 'Numbered' | 'Notes';
  usedIn: string;
  /** What the list at the end is called in this style. */
  listName: string;
  inText: { label: string; text: string }[];
  /** The example paper in this style's reference list. */
  reference: string;
  /** For note styles: the first footnote. */
  note?: string;
  patterns: StylePattern[];
  rules: string[];
  faq: { q: string; a: string }[];
};

/** The paper every page cites. Real metadata, so readers can check the examples. */
export const EXAMPLE_SOURCE = {
  authors: 'J. D. Watson and F. H. C. Crick',
  title: 'Molecular structure of nucleic acids: A structure for deoxyribose nucleic acid',
  journal: 'Nature',
  year: 1953,
  volume: '171',
  issue: '4356',
  pages: '737–738',
  doi: '10.1038/171737a0',
};

export const CITATION_STYLES: CitationStyle[] = [
  {
    slug: 'apa',
    name: 'APA',
    edition: '7th edition',
    cslId: 'apa',
    seoTitle: 'Free APA citation generator (7th edition)',
    description: 'Create APA 7 citations and reference lists for free. See APA format examples for journal articles, books and websites, and cite any paper in one click.',
    heading: 'APA citation generator (7th edition)',
    intro: 'APA style is used across psychology, education, nursing and the social sciences. WriteOrbit formats your in-text citations and reference list in APA 7 as you write, and updates them if you change style.',
    keywords: ['apa citation generator', 'citation generator for apa format', 'apa 7 citation generator', 'free apa website citation generator', 'apa reference generator'],
    kind: 'Author–date',
    usedIn: 'Psychology, education, nursing, business and the social sciences',
    listName: 'References',
    inText: [
      { label: 'Parenthetical', text: '(Watson & Crick, 1953)' },
      { label: 'Narrative', text: 'Watson and Crick (1953)' },
      { label: 'With a page (for a quote)', text: '(Watson & Crick, 1953, p. 737)' },
    ],
    reference: 'Watson, J. D., & Crick, F. H. C. (1953). Molecular structure of nucleic acids: A structure for deoxyribose nucleic acid. *Nature*, *171*(4356), 737–738. https://doi.org/10.1038/171737a0',
    patterns: [
      { label: 'Journal article', text: 'Author, A. A., & Author, B. B. (Year). Title of the article. *Journal Name*, *Volume*(Issue), pages. https://doi.org/xxxx' },
      { label: 'Book', text: 'Author, A. A. (Year). *Title of the book* (2nd ed.). Publisher.' },
      { label: 'Web page', text: 'Author, A. A. (Year, Month Day). *Title of the page*. Site Name. URL' },
    ],
    rules: [
      'Title the list “References”, centred and bold, with each entry double-spaced and a 0.5-inch hanging indent.',
      'Use sentence case for article and book titles, and title case for journal names.',
      'Italicise the journal name and volume number, but not the issue number.',
      'Give the DOI as a link (https://doi.org/…). Do not add “Retrieved from” before it.',
      'For three or more authors, cite the first author and “et al.” in the text from the first citation.',
    ],
    faq: [
      { q: 'What is the difference between APA 6 and APA 7?', a: 'APA 7 drops the publisher location for books, lists up to 20 authors in a reference, uses “et al.” for three or more authors from the first citation, and formats DOIs as links. WriteOrbit supports both.' },
      { q: 'How do I cite a website in APA?', a: 'Give the author (or organisation), the date, the page title in italics, the site name and the URL. If there is no date, write (n.d.).' },
      { q: 'Is this APA citation generator free?', a: 'Yes. The free plan includes unlimited citations in APA and every other style.' },
    ],
  },
  {
    slug: 'mla',
    name: 'MLA',
    edition: '9th edition',
    cslId: 'modern-language-association',
    seoTitle: 'Free MLA citation generator and works cited maker (MLA 9)',
    description: 'Create MLA 9 citations and a works cited page for free. See MLA examples for articles, books and websites, and cite any source as you write.',
    heading: 'MLA citation generator and works cited maker',
    intro: 'MLA style is used in literature, languages and the humanities. WriteOrbit formats your in-text citations and builds the works cited page in MLA 9 as you write.',
    keywords: ['mla citation generator', 'works cited generator', 'works cited citation generator', 'mla 9 citation generator', 'mla works cited'],
    kind: 'Author–page',
    usedIn: 'Literature, languages, arts and the humanities',
    listName: 'Works Cited',
    inText: [
      { label: 'Parenthetical', text: '(Watson and Crick 737)' },
      { label: 'Narrative', text: 'Watson and Crick argue … (737).' },
    ],
    reference: 'Watson, J. D., and F. H. C. Crick. “Molecular Structure of Nucleic Acids: A Structure for Deoxyribose Nucleic Acid.” *Nature*, vol. 171, no. 4356, 1953, pp. 737–38, https://doi.org/10.1038/171737a0.',
    patterns: [
      { label: 'Journal article', text: 'Last, First, and First Last. “Title of the Article.” *Journal Name*, vol. #, no. #, Year, pp. #–#, DOI or URL.' },
      { label: 'Book', text: 'Last, First. *Title of the Book*. Publisher, Year.' },
      { label: 'Web page', text: 'Last, First. “Title of the Page.” *Website Name*, Day Month Year, URL.' },
    ],
    rules: [
      'Title the page “Works Cited”, centred, with entries in alphabetical order and a half-inch hanging indent.',
      'Reverse only the first author’s name. For three or more authors, give the first and “et al.”',
      'Put article titles in quotation marks and title case; italicise the journal, book or website.',
      'In the text, give the author and page number with no comma: (Watson and Crick 737).',
      'Prefer a DOI to a URL when the source has one.',
    ],
    faq: [
      { q: 'What is a works cited page?', a: 'The list of sources at the end of an MLA paper. Every source you cite in the text must appear there, in alphabetical order by author.' },
      { q: 'Do I need access dates in MLA 9?', a: 'They are optional. Add one for web pages that have no publication date or may change.' },
      { q: 'Can I switch from MLA to APA later?', a: 'Yes. Change the style in the status bar and every citation and the list update.' },
    ],
  },
  {
    slug: 'chicago',
    name: 'Chicago',
    edition: 'Chicago Manual of Style',
    cslId: 'chicago-author-date',
    seoTitle: 'Chicago citation generator: author-date and notes',
    description: 'Create Chicago Manual of Style citations for free, in author-date or notes and bibliography form. See Chicago examples and cite any paper as you write.',
    heading: 'Chicago citation generator: author-date and notes',
    intro: 'The Chicago Manual of Style has two systems: author-date, common in the sciences and social sciences, and notes and bibliography, common in history and the arts. WriteOrbit formats both.',
    keywords: ['chicago citation generator', 'chicago manual of style citation', 'chicago style citation', 'chicago author date', 'chicago footnote generator'],
    kind: 'Author–date',
    usedIn: 'History, the arts, publishing and many social sciences',
    listName: 'References (author-date) or Bibliography (notes)',
    inText: [
      { label: 'Author-date', text: '(Watson and Crick 1953, 737)' },
      { label: 'Notes and bibliography', text: 'A numbered footnote' },
    ],
    reference: 'Watson, J. D., and F. H. C. Crick. 1953. “Molecular Structure of Nucleic Acids: A Structure for Deoxyribose Nucleic Acid.” *Nature* 171 (4356): 737–38. https://doi.org/10.1038/171737a0.',
    note: '1. J. D. Watson and F. H. C. Crick, “Molecular Structure of Nucleic Acids: A Structure for Deoxyribose Nucleic Acid,” *Nature* 171, no. 4356 (1953): 737, https://doi.org/10.1038/171737a0.',
    patterns: [
      { label: 'Journal article (author-date)', text: 'Last, First, and First Last. Year. “Title of the Article.” *Journal Name* Volume (Issue): pages. DOI or URL.' },
      { label: 'Journal article (bibliography)', text: 'Last, First, and First Last. “Title of the Article.” *Journal Name* Volume, no. Issue (Year): pages. DOI or URL.' },
    ],
    rules: [
      'Author-date puts the year right after the author in the reference list; notes and bibliography puts it near the end.',
      'Use title case for article and book titles. Put article titles in quotation marks and italicise journal and book titles.',
      'In notes, give authors’ names in normal order; in the bibliography, reverse the first author’s name.',
      'Abbreviate page ranges as in 737–38.',
    ],
    faq: [
      { q: 'Which Chicago system should I use?', a: 'Use the one your course or publisher asks for. Author-date is common in the sciences and social sciences; notes and bibliography in history, literature and the arts.' },
      { q: 'Is Turabian the same as Chicago?', a: 'Turabian is Chicago adapted for student papers. The citations are almost the same. See the Turabian page.' },
    ],
  },
  {
    slug: 'harvard',
    name: 'Harvard',
    edition: 'Cite Them Right',
    cslId: 'harvard-cite-them-right',
    seoTitle: 'Free Harvard referencing generator',
    description: 'Create Harvard references and in-text citations for free. See Harvard referencing examples for articles, books and websites, and cite as you write.',
    heading: 'Harvard referencing generator',
    intro: 'Harvard is an author-date style used by many universities in the UK, Australia and elsewhere. There is no single official version; WriteOrbit uses the common Cite Them Right form and can switch to your university’s version.',
    keywords: ['harvard referencing generator', 'harvard citation generator', 'harvard reference generator', 'harvard style referencing'],
    kind: 'Author–date',
    usedIn: 'Many UK, Australian and South African universities, across subjects',
    listName: 'Reference list',
    inText: [
      { label: 'Parenthetical', text: '(Watson and Crick, 1953)' },
      { label: 'With a page', text: '(Watson and Crick, 1953, p. 737)' },
    ],
    reference: 'Watson, J.D. and Crick, F.H.C. (1953) ‘Molecular structure of nucleic acids: a structure for deoxyribose nucleic acid’, *Nature*, 171(4356), pp. 737–738. Available at: https://doi.org/10.1038/171737a0.',
    patterns: [
      { label: 'Journal article', text: 'Last, A. and Last, B. (Year) ‘Title of the article’, *Journal Name*, Volume(Issue), pp. pages. Available at: DOI or URL.' },
      { label: 'Book', text: 'Last, A. (Year) *Title of the book*. Edition. Place: Publisher.' },
      { label: 'Web page', text: 'Last, A. (Year) *Title of the page*. Available at: URL (Accessed: Day Month Year).' },
    ],
    rules: [
      'Universities publish their own Harvard guides, and they differ in punctuation. Follow yours.',
      'Put the year in brackets straight after the authors.',
      'Use single quotation marks for article titles and italics for journal and book titles.',
      'Give an access date for web pages.',
    ],
    faq: [
      { q: 'Why does my university’s Harvard look different?', a: 'Harvard has no single rulebook. Search the style menu in WriteOrbit for your university’s version, for example “Anglia Ruskin” or “University of Leeds”.' },
      { q: 'Is Harvard the same as APA?', a: 'Both are author-date styles, but they differ in punctuation and in how titles and dates are shown.' },
    ],
  },
  {
    slug: 'ama',
    name: 'AMA',
    edition: '11th edition',
    cslId: 'american-medical-association',
    seoTitle: 'Free AMA citation generator (11th edition)',
    description: 'Create AMA 11 citations and numbered reference lists for free. See AMA format examples for journal articles, books and websites in medicine and health.',
    heading: 'AMA citation generator (11th edition)',
    intro: 'AMA style, from the American Medical Association, is used in medicine, nursing and public health. Sources are numbered in the order you cite them. WriteOrbit numbers and formats them as you write.',
    keywords: ['ama citation generator', 'ama citation', 'ama reference generator', 'ama format', 'ama 11 citation'],
    kind: 'Numbered',
    usedIn: 'Medicine, nursing, pharmacy and public health',
    listName: 'References',
    inText: [
      { label: 'Superscript number', text: '…the double helix was proposed in 1953.¹' },
    ],
    reference: '1. Watson JD, Crick FHC. Molecular structure of nucleic acids: a structure for deoxyribose nucleic acid. *Nature*. 1953;171(4356):737-738. doi:10.1038/171737a0',
    patterns: [
      { label: 'Journal article', text: 'Last AA, Last BB. Title of the article. *Abbreviated Journal Name*. Year;Volume(Issue):pages. doi:xxxx' },
      { label: 'Book', text: 'Last AA. *Title of the Book*. Edition. Publisher; Year.' },
      { label: 'Web page', text: 'Last AA. Title of the page. Website Name. Published Month Day, Year. Accessed Month Day, Year. URL' },
    ],
    rules: [
      'Number sources in the order they are first cited, with superscript numbers in the text.',
      'Give authors’ surnames and initials without full stops. List up to six authors; for more, list three and “et al.”',
      'Abbreviate journal names as in the NLM catalogue, in italics.',
      'Write page ranges in full (737-738) and give the DOI as “doi:” with no space.',
    ],
    faq: [
      { q: 'Where does the superscript go?', a: 'After commas and full stops, before colons and semicolons.' },
      { q: 'If I cite a source twice, does it get a new number?', a: 'No. Reuse its first number. WriteOrbit numbers and renumbers automatically when you move text.' },
    ],
  },
  {
    slug: 'acs',
    name: 'ACS',
    edition: 'ACS Guide to Scholarly Communication',
    cslId: 'american-chemical-society',
    seoTitle: 'Free ACS citation generator for chemistry',
    description: 'Create ACS-style citations for chemistry papers and lab reports for free. See ACS examples for journal articles and books, numbered or author-date.',
    heading: 'ACS citation generator for chemistry',
    intro: 'ACS style, from the American Chemical Society, is used in chemistry and related fields. It allows numbered or author-date citations. WriteOrbit formats your references as you write.',
    keywords: ['acs citation generator', 'acs citation', 'acs style', 'chemistry citation generator', 'acs reference format'],
    kind: 'Numbered',
    usedIn: 'Chemistry, biochemistry and materials science',
    listName: 'References',
    inText: [
      { label: 'Superscript number', text: '…as first proposed.¹' },
      { label: 'Italic number in parentheses', text: '…as first proposed (*1*).' },
      { label: 'Author-date', text: '(Watson and Crick, 1953)' },
    ],
    reference: '(1) Watson, J. D.; Crick, F. H. C. Molecular Structure of Nucleic Acids: A Structure for Deoxyribose Nucleic Acid. *Nature* **1953**, *171* (4356), 737–738. https://doi.org/10.1038/171737a0.',
    patterns: [
      { label: 'Journal article', text: 'Last, A. A.; Last, B. B. Title of the Article. *Abbrev. Journal* **Year**, *Volume* (Issue), pages. DOI.' },
      { label: 'Book', text: 'Last, A. A. *Title of the Book*, Edition; Publisher: City, Year.' },
    ],
    rules: [
      'Separate authors with semicolons.',
      'Make the year bold and the volume italic in journal references.',
      'Use one citation system (numbered or author-date) throughout a paper.',
      'Article titles are optional in some ACS journals; include them unless told not to.',
    ],
    faq: [
      { q: 'Should I use numbers or author-date?', a: 'Follow your course or journal. Most ACS journals use superscript numbers.' },
    ],
  },
  {
    slug: 'ieee',
    name: 'IEEE',
    edition: 'IEEE Reference Guide',
    cslId: 'ieee',
    seoTitle: 'Free IEEE citation generator',
    description: 'Create IEEE citations and numbered reference lists for free. See IEEE format examples for journal articles, conference papers and books.',
    heading: 'IEEE citation generator',
    intro: 'IEEE style is used in engineering, computer science and electronics. Sources are numbered in square brackets in the order you cite them. WriteOrbit numbers and formats them for you.',
    keywords: ['ieee citation generator', 'ieee citation', 'ieee reference format', 'ieee style'],
    kind: 'Numbered',
    usedIn: 'Engineering, computer science and electronics',
    listName: 'References',
    inText: [{ label: 'Number in brackets', text: 'as shown in [1]' }],
    reference: '[1] J. D. Watson and F. H. C. Crick, “Molecular structure of nucleic acids: A structure for deoxyribose nucleic acid,” *Nature*, vol. 171, no. 4356, pp. 737–738, Apr. 1953, doi: 10.1038/171737a0.',
    patterns: [
      { label: 'Journal article', text: '[n] A. A. Author and B. B. Author, “Title of the article,” *Abbrev. Journal*, vol. #, no. #, pp. #–#, Mon. Year, doi: xxxx.' },
      { label: 'Book', text: '[n] A. A. Author, *Title of the Book*, xth ed. City, Country: Publisher, Year.' },
    ],
    rules: [
      'Number sources in order of first citation and reuse a number for repeat citations.',
      'Give initials before the surname.',
      'Put article titles in quotation marks, sentence case; italicise journal and book titles.',
    ],
    faq: [
      { q: 'Can I cite several sources at once?', a: 'Yes: [1], [3] or a range such as [2]–[5].' },
    ],
  },
  {
    slug: 'vancouver',
    name: 'Vancouver',
    edition: 'NLM / ICMJE',
    cslId: 'vancouver',
    seoTitle: 'Free Vancouver referencing generator',
    description: 'Create Vancouver (NLM) references for free. See Vancouver examples for journal articles, books and websites, numbered in the order you cite them.',
    heading: 'Vancouver referencing generator',
    intro: 'Vancouver is the numbered style used by most medical and health journals, based on the US National Library of Medicine’s rules. WriteOrbit numbers and formats your references as you write.',
    keywords: ['vancouver referencing generator', 'vancouver citation generator', 'vancouver style', 'nlm citation'],
    kind: 'Numbered',
    usedIn: 'Medicine, dentistry, nursing and biomedical journals',
    listName: 'References',
    inText: [{ label: 'Number', text: '…was described in 1953 (1).' }],
    reference: '1. Watson JD, Crick FH. Molecular structure of nucleic acids; a structure for deoxyribose nucleic acid. Nature. 1953 Apr 25;171(4356):737-8. doi: 10.1038/171737a0',
    patterns: [
      { label: 'Journal article', text: 'Last AA, Last BB. Title of the article. Abbrev Journal. Year Mon Day;Volume(Issue):pages.' },
      { label: 'Book', text: 'Last AA. Title of the book. Edition. Place: Publisher; Year.' },
      { label: 'Web page', text: 'Last AA. Title of the page [Internet]. Place: Publisher; Year [cited Year Mon Day]. Available from: URL' },
    ],
    rules: [
      'Number sources in order of first citation, in brackets, parentheses or superscript (follow your journal).',
      'No italics; journal names use NLM abbreviations without full stops.',
      'List up to six authors, then “et al.”',
    ],
    faq: [
      { q: 'Is Vancouver the same as AMA?', a: 'Both are numbered medical styles, but they differ in punctuation and italics. AMA italicises journal names; Vancouver does not.' },
    ],
  },
  {
    slug: 'turabian',
    name: 'Turabian',
    edition: '9th edition',
    cslId: 'turabian-fullnote-bibliography',
    seoTitle: 'Free Turabian citation generator: footnotes and bibliography',
    description: 'Create Turabian footnotes and bibliography entries for free. See Turabian format examples, based on the Chicago Manual of Style, for student papers.',
    heading: 'Turabian citation generator: footnotes and bibliography',
    intro: 'Turabian is the Chicago Manual of Style adapted for student papers, theses and dissertations. Most students use its notes and bibliography form. WriteOrbit writes the footnotes and the bibliography for you.',
    keywords: ['turabian citation generator', 'turabian format', 'turabian footnotes', 'turabian bibliography'],
    kind: 'Notes',
    usedIn: 'Student papers, theses and dissertations in history, theology and the humanities',
    listName: 'Bibliography',
    inText: [{ label: 'Footnote', text: 'A superscript number in the text, with the note at the foot of the page.' }],
    note: '1. J. D. Watson and F. H. C. Crick, “Molecular Structure of Nucleic Acids: A Structure for Deoxyribose Nucleic Acid,” *Nature* 171, no. 4356 (1953): 737, https://doi.org/10.1038/171737a0.',
    reference: 'Watson, J. D., and F. H. C. Crick. “Molecular Structure of Nucleic Acids: A Structure for Deoxyribose Nucleic Acid.” *Nature* 171, no. 4356 (1953): 737–38. https://doi.org/10.1038/171737a0.',
    patterns: [
      { label: 'Book (bibliography)', text: 'Last, First. *Title of the Book*. Place: Publisher, Year.' },
      { label: 'Web page (bibliography)', text: 'Last, First. “Title of the Page.” Website Name. Month Day, Year. URL.' },
    ],
    rules: [
      'A note gives names in normal order and separates parts with commas; the bibliography reverses the first name and uses full stops.',
      'After the first note for a source, use a short note: Watson and Crick, “Molecular Structure,” 737.',
      'Use title case, quotation marks for article titles and italics for books and journals.',
    ],
    faq: [
      { q: 'Turabian or Chicago?', a: 'Turabian is for students and follows Chicago closely. Use Turabian when your course names it; the citations will match Chicago’s.' },
    ],
  },
  {
    slug: 'bluebook',
    name: 'Bluebook',
    edition: '21st edition',
    cslId: 'bluebook-law-review',
    seoTitle: 'Bluebook citation generator for legal writing',
    description: 'Create Bluebook citations for law review footnotes and legal memos. See Bluebook examples for journal articles and books, with the right typefaces.',
    heading: 'Bluebook citation generator for legal writing',
    intro: 'The Bluebook is the citation system for US legal writing. Law reviews cite in footnotes with large and small capitals; court documents follow the simpler Bluepages. WriteOrbit formats journal and book sources in Bluebook style.',
    keywords: ['bluebook citation generator', 'bluebook citation', 'legal citation generator', 'bluebook format'],
    kind: 'Notes',
    usedIn: 'US law reviews, legal memos and court documents',
    listName: 'Footnotes (no separate list)',
    inText: [{ label: 'Footnote', text: 'A superscript number in the text, with the citation in the footnote.' }],
    reference: 'J. D. Watson & F. H. C. Crick, *Molecular Structure of Nucleic Acids: A Structure for Deoxyribose Nucleic Acid*, 171 ^^Nature^^ 737 (1953).',
    patterns: [
      { label: 'Journal article', text: 'Author, *Title of the Article*, Volume ^^Journal^^ First page, Pinpoint (Year).' },
      { label: 'Book', text: '^^Author, Title of the Book^^ page (edition, Year).' },
    ],
    rules: [
      'In law review footnotes, journal names (and book authors and titles) are set in large and small capitals.',
      'Give the volume before the journal name and the first page after it, then the year in parentheses.',
      'Use “&” between two authors.',
      'Court documents and memos follow the Bluepages: ordinary type, with italics or underlining for titles.',
      'Cases, statutes and court rules have their own formats; check them against the Bluebook itself.',
    ],
    faq: [
      { q: 'Can WriteOrbit cite cases and statutes?', a: 'You can add them as custom sources, but check case and statute citations against the Bluebook. Automatic formatting works best for articles and books.' },
    ],
  },
];

const BY_SLUG = new Map(CITATION_STYLES.map((style) => [style.slug, style]));

export function getCitationStyle(slug: string): CitationStyle | undefined {
  return BY_SLUG.get(slug);
}
