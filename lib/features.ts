/**
 * A page per editor feature (/features/[slug]): things WriteOrbit already does inside the editor,
 * explained one at a time. Standalone tools that work on their own page are in lib/tools.ts.
 * Every `cta.href` opens a working route (the PRD's rule: unavailable features are not
 * advertised as operational). Pure data, so tests, the sitemap and the blog can read it.
 */

export type FeatureCategory = 'research' | 'library' | 'writing' | 'review' | 'utilities';

export const FEATURE_CATEGORIES: { id: FeatureCategory; name: string; blurb: string }[] = [
  { id: 'research', name: 'Research', blurb: 'Find papers and get answers you can check.' },
  { id: 'library', name: 'Library', blurb: 'Keep your PDFs and references in one place.' },
  { id: 'writing', name: 'Writing', blurb: 'Draft with AI that cites real sources.' },
  { id: 'review', name: 'Review', blurb: 'Check claims, citations and writing before you submit.' },
  { id: 'utilities', name: 'Import and export', blurb: 'Word, PDF and LaTeX in and out.' },
];

/** Which product picture the page shows (components/marketing/LandingVisuals). */
export type FeatureVisual = 'autocomplete' | 'find-papers' | 'chat' | 'review' | 'import' | 'export' | 'phone';

export type FeaturePage = {
  slug: string;
  name: string;
  category: FeatureCategory;
  /** Beta tools say so on their card and page. */
  status: 'available' | 'beta';
  /** The <title>, without the " · WriteOrbit" suffix. */
  seoTitle: string;
  /** Meta description, 150–160 characters. */
  description: string;
  /** One line for the directory card. */
  short: string;
  heading: string;
  intro: string;
  keywords: string[];
  visual: FeatureVisual;
  benefits: { title: string; body: string }[];
  steps: { title: string; body: string }[];
  inputs: string[];
  outputs: string[];
  /** Which plans include it, when not every plan does (matches lib/server/lib/plans.ts). */
  planNote?: string;
  /** What it does not do. Shown on every page: the PRD asks for honest limits. */
  limitations: string[];
  /** A worked example, labelled as one on the page. */
  example: { input: string; output: string };
  cta: { label: string; href: string };
  /** Other feature pages. */
  related: string[];
  /** Standalone tools (lib/tools.ts) that go with this feature. */
  tools: string[];
  faq: { q: string; a: string }[];
};

export const FEATURE_PAGES: FeaturePage[] = [
  // ---------------------------------------------------------------- Research
  {
    slug: 'research-assistant',
    name: 'AI research assistant',
    category: 'research',
    status: 'available',
    seoTitle: 'AI research assistant that cites real papers',
    description: 'Ask a research question and get an answer built from real papers, each cited and one click from the source. Search the web, your Library or your draft.',
    short: 'Ask a question. Get an answer with real, clickable citations.',
    heading: 'An AI research assistant that shows its sources',
    intro: 'Ask a question in plain words. WriteOrbit searches scholarly papers, your Library or your own draft, and answers with citations you can open and check.',
    keywords: ['ai research assistant', 'research assistant ai', 'ai for research', 'ask research questions'],
    visual: 'chat',
    benefits: [
      { title: 'Answers with sources', body: 'Every claim in an answer points to the paper it came from, so you can read it yourself.' },
      { title: 'Choose where it looks', body: 'Search published papers, your Library PDFs, the document you are writing, or all of them.' },
      { title: 'From answer to draft', body: 'Cite a source from the answer straight into your document, in your citation style.' },
    ],
    steps: [
      { title: 'Ask', body: 'Open AI Chat and type your question. Add papers or documents as context with @.' },
      { title: 'Check', body: 'Read the answer and open the cited papers. Answers from your PDFs show the page.' },
      { title: 'Use it', body: 'Cite a source in your document, or save it to your Library for later.' },
    ],
    inputs: ['A question in any language', 'Optional: papers, Library folders or your document as context'],
    outputs: ['A written answer with in-text citations', 'Links to each cited paper', 'Page numbers when the answer comes from your PDFs'],
    limitations: [
      'Answers are AI-written. Read the cited sources before you rely on a claim.',
      'Many papers are metadata only (title and abstract); the assistant cannot read a full text it has no access to.',
      'It does not run statistics or systematic reviews.',
    ],
    example: {
      input: 'Does sleep after learning improve memory consolidation?',
      output: 'Several studies report that sleep after learning improves later recall compared with the same time spent awake (cited study, year). … Each sentence links to the paper it relies on.',
    },
    cta: { label: 'Ask a research question', href: '/editor?tool=chat' },
    related: ['paper-search', 'chat-with-pdf', 'literature-review'],
    tools: ['deep-research', 'research-gap-finder'],
    faq: [
      { q: 'Where do the sources come from?', a: 'From a scholarly index of over 250 million works (the OpenAlex catalogue), from PDFs you upload to your Library, and from the document you are writing. You choose which.' },
      { q: 'Can it make up a citation?', a: 'Citations come from search results, not from the model’s memory, so each one is a real record you can open. The text around a citation is still AI-written, so check that the source says what the answer claims.' },
      { q: 'Is it free?', a: 'Yes, the free plan includes AI Chat with a daily limit. Paid plans raise or remove the limit.' },
    ],
  },
  {
    slug: 'paper-search',
    name: 'Paper finder',
    category: 'research',
    status: 'available',
    seoTitle: 'Find academic papers: search 250M+ scholarly works',
    description: 'Search over 250 million scholarly works by topic, then filter by year, citation count and open access. Cite a paper in one click or save it to your Library.',
    short: 'Search 250M+ works and filter by year, citations and open access.',
    heading: 'Find academic papers for your topic',
    intro: 'Search over 250 million scholarly works without leaving your document. Filter the results, read the abstract, and cite or save the papers you want.',
    keywords: ['find academic papers', 'academic paper search', 'scholarly article search', 'find research papers'],
    visual: 'find-papers',
    benefits: [
      { title: 'One big index', body: 'Journal articles, preprints, books and conference papers from every field.' },
      { title: 'Useful filters', body: 'Narrow by publication year, citation count and open access, and sort by relevance, citations or date.' },
      { title: 'Cite as you go', body: 'Click Cite to add a paper to your text and reference list, or type @ while you write.' },
    ],
    steps: [
      { title: 'Search', body: 'Open Find papers and type a topic, a title or a DOI.' },
      { title: 'Filter', body: 'Set years, a minimum citation count or open access only.' },
      { title: 'Cite or save', body: 'Cite the paper in your document, open it, or save it to your Library.' },
    ],
    inputs: ['Keywords, a paper title or a DOI', 'Optional filters: years, citation count, open access'],
    outputs: ['A ranked list of papers with authors, year, venue and citation count', 'Abstracts where the index has them', 'Open-access links when a free copy exists'],
    limitations: [
      'Results come from a bibliographic index. Some records have no abstract, and not every paper has a free full text.',
      'Citation counts come from the index and can differ from Google Scholar or Scopus.',
    ],
    example: {
      input: 'remote work productivity, 2020–2025, open access',
      output: 'A list of open-access studies on remote work and productivity published since 2020, sorted by relevance, each with a Cite button.',
    },
    cta: { label: 'Search papers', href: '/editor?tool=papers' },
    related: ['research-library', 'research-assistant'],
    tools: ['citation-generator', 'deep-research'],
    faq: [
      { q: 'Which databases does it search?', a: 'An index built on OpenAlex, which covers over 250 million works from Crossref, PubMed, arXiv, institutional repositories and publishers.' },
      { q: 'Can I search without an account?', a: 'You can browse papers on the public research directory. Searching inside the editor and citing needs a free account.' },
      { q: 'Can I find a paper by DOI?', a: 'Yes. Paste the DOI into the search box, or type it after @ in your document.' },
    ],
  },

  // ---------------------------------------------------------------- Library
  {
    slug: 'research-library',
    name: 'Research library',
    category: 'library',
    status: 'available',
    seoTitle: 'Research library: store, organise and cite your PDFs',
    description: 'Upload PDFs, import BibTeX or RIS files, and sort papers into collections. Cite any paper in your writing and ask questions about it with page numbers.',
    short: 'Upload PDFs, sort them into collections and cite them anywhere.',
    heading: 'One library for every paper you read',
    intro: 'Keep your PDFs and references together. WriteOrbit reads each PDF’s details, so you can cite it, search it and ask about it.',
    keywords: ['research library', 'pdf library for research', 'reference library', 'organize research papers'],
    visual: 'import',
    benefits: [
      { title: 'Details filled in', body: 'Upload a PDF and WriteOrbit finds its title, authors and DOI for the citation.' },
      { title: 'Collections', body: 'Sort papers by project, chapter or topic, and limit AI answers to one collection.' },
      { title: 'Cite from your Library', body: 'Library papers come first when you type @, in whatever style your document uses.' },
    ],
    steps: [
      { title: 'Add papers', body: 'Upload PDFs, import a .bib or .ris file, paste DOIs, or connect Zotero or Mendeley.' },
      { title: 'Organise', body: 'Put papers into collections and check their details.' },
      { title: 'Use them', body: 'Cite, read, or ask questions about one paper or a whole collection.' },
    ],
    inputs: ['PDF files', 'BibTeX (.bib) and RIS (.ris) files', 'DOIs and PubMed ids', 'Zotero and Mendeley accounts'],
    outputs: ['A searchable library with citation details', 'Collections you can cite from and chat with'],
    planNote: 'The Free plan holds 10 PDFs of up to 10 MB each. Paid plans hold unlimited PDFs.',
    limitations: [
      'Scanned PDFs without a text layer cannot be searched or asked about.',
      'Each plan has its own Library size and file size limits; see Pricing.',
    ],
    example: {
      input: 'Upload 12 PDFs for a thesis chapter and a Zotero export of 40 references.',
      output: 'A “Chapter 2” collection of 52 papers with titles, authors and DOIs, ready to cite with @.',
    },
    cta: { label: 'Open your Library', href: '/editor?tool=library' },
    related: ['reference-manager-import', 'chat-with-pdf'],
    tools: ['pdf-tools', 'citation-generator'],
    faq: [
      { q: 'Are my PDFs private?', a: 'Yes. Your Library is visible only to you. Sharing a document does not share your Library.' },
      { q: 'How large can a PDF be?', a: 'Up to 10 MB on the Free plan and 50 MB on Plus. See Pricing for every plan.' },
      { q: 'Can I delete papers?', a: 'Yes. You can delete any paper or collection from your Library at any time.' },
    ],
  },
  {
    slug: 'chat-with-pdf',
    name: 'Chat with PDF',
    category: 'library',
    status: 'available',
    seoTitle: 'Chat with PDF: ask your papers, get the page number',
    description: 'Ask questions about one PDF or a whole folder of papers. Every answer quotes the passage it used and gives the page number, so you can check it.',
    short: 'Ask about one PDF or a folder. Answers show the page.',
    heading: 'Chat with your PDFs and see the page behind every answer',
    intro: 'Ask a question about a paper, or about every paper in a collection. The answer quotes the passage it is based on and gives the page number.',
    keywords: ['chat with pdf', 'ask pdf questions', 'ai pdf reader', 'chat with research papers'],
    visual: 'chat',
    benefits: [
      { title: 'Page numbers', body: 'Answers point to the page and passage they used. Click to check.' },
      { title: 'Many papers at once', body: 'Ask across a whole collection to compare methods or findings.' },
      { title: 'Cite from the answer', body: 'Cite the paper behind an answer in your document in one click.' },
    ],
    steps: [
      { title: 'Upload', body: 'Add PDFs to your Library, or pick ones already there.' },
      { title: 'Ask', body: 'Click Ask on a paper, or choose a collection in AI Chat.' },
      { title: 'Check and cite', body: 'Open the quoted page, then cite the paper if it says what you need.' },
    ],
    inputs: ['PDFs in your Library (one or a collection)', 'A question'],
    outputs: ['An answer with quotes and page numbers', 'Citations to the papers used'],
    limitations: [
      'Scanned PDFs need a text layer.',
      'The AI can still misread a passage. The quote and page are there so you can check.',
    ],
    example: {
      input: 'What sample size and method did each of these five studies use?',
      output: 'Study A: 120 adults, randomised controlled trial (p. 4). Study B: 38 students, interviews (p. 6). …',
    },
    cta: { label: 'Chat with a PDF', href: '/editor?tool=library' },
    related: ['research-library', 'literature-review', 'research-assistant'],
    tools: ['pdf-tools', 'literature-review-generator'],
    faq: [
      { q: 'Does it work with scanned PDFs?', a: 'Only if the PDF has a text layer. Run OCR on a scanned PDF first.' },
      { q: 'Can I chat with more than one PDF?', a: 'Yes. Choose a Library collection as the source and ask across every paper in it.' },
      { q: 'Is my PDF used to train AI?', a: 'No. Your files are used only to answer your questions.' },
    ],
  },
  {
    slug: 'reference-manager-import',
    name: 'Zotero and Mendeley import',
    category: 'library',
    status: 'available',
    seoTitle: 'Import from Zotero and Mendeley, BibTeX or RIS',
    description: 'Bring your references from Zotero, Mendeley, BibTeX or RIS files into WriteOrbit, then cite them in 10,000+ styles and ask questions about the PDFs.',
    short: 'Bring your Zotero, Mendeley, BibTeX and RIS references with you.',
    heading: 'Bring your Zotero and Mendeley library with you',
    intro: 'Connect Zotero or Mendeley, or import a BibTeX or RIS file. Your references arrive ready to cite, and their PDFs ready to ask about.',
    keywords: ['zotero import', 'mendeley import', 'import bibtex', 'import ris file', 'zotero alternative'],
    visual: 'import',
    benefits: [
      { title: 'Keep your work', body: 'Years of saved references come across with their details.' },
      { title: 'Files too', body: 'Attached PDFs come with the references where the source allows.' },
      { title: 'Any style', body: 'Cite imported references in APA, MLA, Chicago or any of 10,000+ styles.' },
    ],
    steps: [
      { title: 'Connect or upload', body: 'In Library, connect Zotero or Mendeley, or upload a .bib or .ris file.' },
      { title: 'Choose', body: 'Pick the collections or items to import.' },
      { title: 'Cite', body: 'Type @ in your document to cite them.' },
    ],
    inputs: ['A Zotero or Mendeley account', 'BibTeX (.bib) or RIS (.ris) files'],
    outputs: ['Library entries with citation details', 'Attached PDFs where available'],
    planNote: 'Zotero and Mendeley import are on paid plans (Plus and up). BibTeX and RIS files import on every plan.',
    limitations: [
      'Import copies your references; later changes in Zotero or Mendeley do not sync back automatically.',
      'Fields a source does not export (for example some notes) do not come across.',
    ],
    example: {
      input: 'A Zotero collection “Dissertation” with 230 items and 140 PDFs.',
      output: '230 Library entries in a “Dissertation” collection; the 140 PDFs can be asked about.',
    },
    cta: { label: 'Import your references', href: '/editor?tool=library' },
    related: ['research-library', 'chat-with-pdf'],
    tools: ['citation-generator'],
    faq: [
      { q: 'Does it sync both ways?', a: 'No. Import copies your references into WriteOrbit. Import again to pick up new items.' },
      { q: 'Which file formats work?', a: 'BibTeX (.bib) and RIS (.ris), which EndNote, Zotero, Mendeley and most databases can export.' },
    ],
  },

  // ---------------------------------------------------------------- Writing
  {
    slug: 'ai-writing-assistant',
    name: 'AI writing assistant',
    category: 'writing',
    status: 'available',
    seoTitle: 'AI writing assistant for academic writing, with citations',
    description: 'AI autocomplete that suggests your next sentence with a real citation. Press Tab to accept. Draft whole sections from papers you choose and accept each part.',
    short: 'Autocomplete that suggests your next sentence, with a real citation.',
    heading: 'An AI writing assistant that cites as it writes',
    intro: 'Pause at the end of a sentence and WriteOrbit suggests the next one, with a real reference. Or give it a topic and papers, and it drafts section by section for you to accept or change.',
    keywords: ['ai writing assistant', 'academic writing ai', 'ai autocomplete', 'ai writer with citations'],
    visual: 'autocomplete',
    benefits: [
      { title: 'Cited suggestions', body: 'Suggestions cite the papers they draw on. Click a citation to open the paper.' },
      { title: 'You decide', body: 'Press Tab to accept, ask again, or keep typing. Nothing is added without you.' },
      { title: 'Choose the sources', body: 'Write from published papers, your Library, one collection, or a range of years.' },
    ],
    steps: [
      { title: 'Turn on autocomplete', body: 'Switch it on in the toolbar and choose where sources come from.' },
      { title: 'Write', body: 'Pause and a grey suggestion appears with its sources.' },
      { title: 'Accept or refine', body: 'Tab accepts. Refine asks again. Conclude closes the section.' },
    ],
    inputs: ['Your document so far', 'Optional: Library papers, a collection, a year range'],
    outputs: ['Suggested sentences with in-text citations', 'Reference list entries for cited papers'],
    limitations: [
      'Suggestions are AI-written. Read the cited paper before you keep a claim.',
      'Check your school’s or journal’s rules on AI use, and disclose it where required.',
    ],
    example: {
      input: '…Remote work has grown sharply since 2020.',
      output: 'Suggestion: “Early studies link this shift to higher self-reported productivity, although results vary by job type (Author, Year).” Press Tab to accept.',
    },
    cta: { label: 'Start a document', href: '/editor?new=1' },
    related: ['ai-writing-editor', 'citation-checker'],
    tools: ['essay-writer', 'research-proposal-generator'],
    faq: [
      { q: 'Will it write my whole paper?', a: 'Write with AI can draft a document section by section, but you accept each part, and you should read, rewrite and check it. It is a drafting aid, not a replacement for your own work.' },
      { q: 'Are the citations real?', a: 'Yes. Citations come from a scholarly index or your Library, not from the model’s memory. Check that each source supports the sentence.' },
      { q: 'Does it work in other languages?', a: 'Yes. Suggestions follow the language you write in.' },
    ],
  },
  {
    slug: 'literature-review',
    name: 'Literature review tool',
    category: 'writing',
    status: 'available',
    seoTitle: 'AI literature review tool: matrix, synthesis and draft',
    description: 'Compare papers side by side in a review matrix filled from the PDFs, with the quote and page for every cell. Then draft your literature review with real citations.',
    short: 'A review matrix filled from your PDFs, then a cited draft.',
    heading: 'Write your literature review from the papers, not from memory',
    intro: 'Put your papers in a review matrix. WriteOrbit reads each one and fills in the aim, method, sample, findings and limitations, with the quote and page for every answer. Then draft the review with real citations.',
    keywords: ['literature review tool', 'ai literature review', 'literature review matrix', 'literature review generator', 'review of related literature'],
    visual: 'review',
    benefits: [
      { title: 'A matrix you can check', body: 'Every cell shows the quote and page it came from.' },
      { title: 'Your own questions', body: 'Add columns such as “theory used” or “country” and the matrix fills them.' },
      { title: 'A head start on writing', body: 'Start from the literature review template and draft with citations to your papers.' },
    ],
    steps: [
      { title: 'Choose papers', body: 'Pick papers from your Library for a new matrix.' },
      { title: 'Fill the matrix', body: 'WriteOrbit reads each paper and answers each column.' },
      { title: 'Write', body: 'Open the literature review template and draft from the papers, citing as you go.' },
    ],
    inputs: ['PDFs in your Library', 'Columns (defaults: aim, method, sample, findings, limitations)'],
    outputs: ['A review matrix with quotes and page numbers', 'A structured literature review document with citations'],
    limitations: [
      'It is not a systematic review tool: there is no PRISMA screening or risk-of-bias assessment.',
      'Matrix answers are AI readings of the text; check the quotes before you use them.',
    ],
    example: {
      input: 'Eight papers on teacher burnout; columns: method, sample, main finding.',
      output: 'Row “Smith (2021)”: Survey · 412 teachers · Workload predicted burnout (“…”, p. 7).',
    },
    cta: { label: 'Build a review matrix', href: '/matrix' },
    related: ['chat-with-pdf', 'research-library'],
    tools: ['literature-review-generator', 'research-gap-finder'],
    faq: [
      { q: 'Is this the same as a systematic review?', a: 'No. It helps with narrative and scoping literature reviews. It does not run PRISMA screening, meta-analysis or risk-of-bias checks.' },
      { q: 'Can I export the matrix?', a: 'You can copy it into your document. The quotes and pages come with it.' },
      { q: 'Can it write a review of related literature (RRL)?', a: 'Yes: the free literature review generator drafts one from real papers, and you can open it in the editor to add your own sources.' },
    ],
  },
  {
    slug: 'ai-writing-editor',
    name: 'AI writing editor',
    category: 'writing',
    status: 'available',
    seoTitle: 'AI writing editor: improve, shorten and proofread',
    description: 'Select a passage and improve it, shorten it, expand it or change its tone. Proofread the whole document for grammar, word choice and repetition, as tracked changes.',
    short: 'Improve, shorten, expand or proofread, as tracked changes.',
    heading: 'Edit your writing with AI, one passage at a time',
    intro: 'Select a passage and ask WriteOrbit to improve, shorten or expand it, or set a tone. Proofread the whole document and review each fix as a tracked change.',
    keywords: ['ai writing editor', 'ai proofreader', 'academic proofreading', 'improve my writing', 'paraphrase academic text'],
    visual: 'review',
    benefits: [
      { title: 'Changes you can see', body: 'Fixes arrive as tracked changes. Accept or reject each one.' },
      { title: 'Academic tone', body: 'Set a tone such as formal academic, concise or neutral and objective.' },
      { title: 'Citations kept', body: 'Edits keep your citations in place.' },
    ],
    steps: [
      { title: 'Select', body: 'Highlight a passage, or choose the whole document.' },
      { title: 'Ask', body: 'Improve, shorten, expand, proofread or change the tone.' },
      { title: 'Review', body: 'Accept or reject each change.' },
    ],
    inputs: ['A passage or the whole document'],
    outputs: ['Rewritten text or tracked changes', 'Comments for grammar, punctuation, word choice, formality, passive voice, repetition and formatting'],
    limitations: [
      'It does not check for plagiarism or detect AI-written text.',
      'Rewording a source closely still needs a citation.',
    ],
    example: {
      input: '“The results that were found in this study show that there is a big effect of sleep on memory.”',
      output: '“The results show a large effect of sleep on memory.” (as a tracked change)',
    },
    cta: { label: 'Edit a document', href: '/editor?new=1' },
    related: ['ai-writing-assistant', 'ai-peer-review', 'citation-checker'],
    tools: ['paraphrasing-tool', 'humanizer'],
    faq: [
      { q: 'Can it paraphrase?', a: 'Yes. Select a passage and ask AI Edit to rewrite it. Keep the citation if the idea comes from a source.' },
      { q: 'Does it change my citations?', a: 'No. Citations stay attached to the sentences they support.' },
    ],
  },

  // ---------------------------------------------------------------- Review
  {
    slug: 'citation-checker',
    name: 'Citation and claim checker',
    category: 'review',
    status: 'available',
    seoTitle: 'Citation checker: find unsupported claims and bad sources',
    description: 'Check every claim before you submit. Finds unsupported or overstated claims, citations the source does not back up, retracted papers, preprints and wrong DOIs.',
    short: 'Finds unsupported claims, retracted papers and wrong DOIs.',
    heading: 'Check that your sources say what you say they say',
    intro: 'Claim check reads your document and flags claims that are unsupported, overstated or contradicted. The evidence check compares each sentence with the paper it cites. Source quality catches retracted papers, preprints and wrong DOIs.',
    keywords: ['citation checker', 'claim checker', 'check citations', 'fact check', 'retracted paper checker'],
    visual: 'review',
    benefits: [
      { title: 'Two kinds of check', body: 'It tells apart “this source exists” from “this source supports your sentence”.' },
      { title: 'Comments in your text', body: 'Each issue appears as a comment on the sentence, with a suggested fix.' },
      { title: 'Source health', body: 'Flags retracted papers, preprints and DOIs that do not match the paper.' },
    ],
    steps: [
      { title: 'Run the checks', body: 'Open Review and run Claim check, evidence check or source quality.' },
      { title: 'Read the comments', body: 'Issues are labelled, for example “Unsupported” or “Source says less than this”.' },
      { title: 'Fix or dismiss', body: 'Add a citation, soften the claim, or dismiss the comment.' },
    ],
    inputs: ['Your document or a selection', 'The papers it cites'],
    outputs: ['Comments labelled unsupported, weakly supported, overstated, unverifiable, contradicted or misrepresented', 'A list of sources with retraction, preprint and DOI problems'],
    limitations: [
      'The evidence check needs the cited paper’s text or abstract; it cannot check sources it cannot read.',
      'It is a second reader, not a guarantee. Some issues will be missed and some flags will be wrong.',
    ],
    example: {
      input: '“Social media use causes depression in teenagers (Author, 2019).”',
      output: 'Overstated: the cited study reports a correlation, not a cause. Suggested: “is associated with”.',
    },
    cta: { label: 'Check a document', href: '/editor' },
    related: ['ai-peer-review', 'ai-writing-editor'],
    tools: ['citation-generator', 'ai-writing-checker'],
    faq: [
      { q: 'Does it check that a citation exists?', a: 'Yes, and separately whether it supports your sentence. A real paper can still be cited for something it does not say.' },
      { q: 'How does it know a paper was retracted?', a: 'From retraction flags in the scholarly index for that paper.' },
    ],
  },
  {
    slug: 'ai-peer-review',
    name: 'AI peer review',
    category: 'review',
    status: 'available',
    seoTitle: 'AI peer review for manuscripts and theses',
    description: 'Get a referee-style review of your manuscript, thesis chapter or proposal: major and minor comments on argument, methods, evidence and clarity, placed in your text.',
    short: 'Major and minor comments, like a real referee.',
    heading: 'A careful first reviewer for your manuscript',
    intro: 'Before your supervisor or a journal sees it, get a review like a referee’s: major and minor comments on your argument, methods, evidence and clarity, each placed where it applies.',
    keywords: ['ai peer review', 'manuscript review', 'ai manuscript reviewer', 'thesis feedback', 'paper review tool'],
    visual: 'review',
    benefits: [
      { title: 'Structured feedback', body: 'Major and minor comments, with a short summary of strengths and weaknesses.' },
      { title: 'In context', body: 'Comments sit on the passage they are about, so you can fix them in place.' },
      { title: 'Fix or dismiss', body: 'Resolve each comment in one click and keep track of what is left.' },
    ],
    steps: [
      { title: 'Open your draft', body: 'Write in WriteOrbit or open your Word file.' },
      { title: 'Run peer review', body: 'Choose peer review in the Review panel.' },
      { title: 'Work through it', body: 'Fix, reply to or dismiss each comment.' },
    ],
    inputs: ['A manuscript, thesis chapter, proposal or essay'],
    outputs: ['A summary review', 'Major and minor comments in the text'],
    limitations: [
      'It does not predict journal acceptance or replace expert review.',
      'It cannot verify your data or rerun your analysis.',
    ],
    example: {
      input: 'A 6,000-word empirical paper.',
      output: 'Major: “The sample is drawn from one school; the conclusion generalises to all secondary students.” Minor: “Define ‘engagement’ before first use.”',
    },
    cta: { label: 'Review a manuscript', href: '/editor' },
    related: ['citation-checker', 'ai-writing-editor'],
    tools: ['abstract-generator', 'thesis-to-manuscript'],
    faq: [
      { q: 'Is it as good as a human reviewer?', a: 'No. It is a useful first reader that catches common problems early. It does not replace your supervisor or a journal’s reviewers.' },
      { q: 'Is my manuscript kept private?', a: 'Yes. Your documents are private unless you share them, and they are not used to train AI.' },
    ],
  },
  {
    slug: 'authorship-report',
    name: 'Authorship report',
    category: 'review',
    status: 'available',
    seoTitle: 'Authorship report: show how you wrote your work',
    description: 'Show a teacher, supervisor or client how your document was written: time spent, text typed, pasted and accepted from AI, with a link they can verify.',
    short: 'Show how you wrote it: typed, pasted and AI-assisted text.',
    heading: 'Show how you wrote your work',
    intro: 'WriteOrbit keeps a record of how your document grew: time spent writing, text typed, text pasted, and text accepted from WriteOrbit AI. Share it as a report with a link anyone can verify.',
    keywords: ['authorship report', 'proof of writing process', 'show writing history', 'prove i wrote my essay'],
    visual: 'phone',
    benefits: [
      { title: 'Evidence of your process', body: 'A clear summary of how much you typed, pasted and accepted from AI.' },
      { title: 'Verifiable link', body: 'Each report is fixed when issued and the verification page shows it has not changed.' },
      { title: 'Private by default', body: 'Only people with the link can see a report. Pasted text itself is never stored.' },
    ],
    steps: [
      { title: 'Write in WriteOrbit', body: 'The record builds while you write.' },
      { title: 'Create a report', body: 'Choose File › Authorship report.' },
      { title: 'Share', body: 'Send the verification link to your teacher or supervisor.' },
    ],
    inputs: ['A document written in WriteOrbit'],
    outputs: ['A shareable authorship report with a verification link'],
    limitations: [
      'The counts come from your browser, so the report is evidence of how the work grew, not proof. The report says so.',
      'Work written elsewhere and pasted in shows as pasted.',
    ],
    example: {
      input: 'An essay written over five sessions.',
      output: '6 h 40 min writing · 9,800 characters typed · 600 pasted · 450 accepted from WriteOrbit AI.',
    },
    cta: { label: 'Start writing', href: '/editor?new=1' },
    related: ['ai-writing-assistant', 'citation-checker'],
    tools: ['ai-writing-checker', 'humanizer'],
    faq: [
      { q: 'Is this an AI detector?', a: 'No. It does not guess whether text is AI-written. It reports what happened in the editor while you wrote.' },
      { q: 'What does it store about pastes?', a: 'When and how much was pasted, and a fingerprint (hash) of the text, never the text itself.' },
    ],
  },

  // ---------------------------------------------------------------- Import and export
  {
    slug: 'word-latex-export',
    name: 'Word, PDF and LaTeX export',
    category: 'utilities',
    status: 'available',
    seoTitle: 'Export to Word, PDF and LaTeX, with references formatted',
    description: 'Open your Word template and keep its styles. Export to Word, PDF or a LaTeX project for Overleaf, with headings, tables, equations and references intact.',
    short: 'Word templates in. Word, PDF or LaTeX out.',
    heading: 'Open your Word template. Export to Word, PDF or LaTeX.',
    intro: 'Open the .docx template your university or journal gives you and keep its styles. When you are done, export to Word, PDF or a LaTeX project, with your references formatted.',
    keywords: ['export to latex', 'word to latex', 'docx to latex', 'export to overleaf', 'academic word template'],
    visual: 'export',
    benefits: [
      { title: 'Templates kept', body: 'Headings, tables, equations, images and page setup come through.' },
      { title: 'Comments too', body: 'Comments and tracked changes travel with Word files.' },
      { title: 'Overleaf-ready', body: 'LaTeX export gives a project you can open in Overleaf.' },
    ],
    steps: [
      { title: 'Open', body: 'Open a .docx, .doc, .odt or .rtf file, or start from scratch.' },
      { title: 'Write', body: 'Write and cite as normal.' },
      { title: 'Export', body: 'File › Download: Word, PDF or LaTeX.' },
    ],
    inputs: ['.docx, .doc, .odt and .rtf files'],
    outputs: ['Word (.docx)', 'PDF', 'LaTeX project (.tex with a .bib file)'],
    planNote: 'Word and PDF export are on every plan, including Free. LaTeX export is on paid plans (Plus and up).',
    limitations: [
      'Unusual Word features (some fields, macros, embedded objects) may not survive the round trip.',
      'LaTeX export uses standard packages; journal classes need adding by hand.',
    ],
    example: {
      input: 'A thesis chapter in the university .docx template with 40 citations in APA 7.',
      output: 'A .docx in the same template, a PDF, and a LaTeX project with a .bib file of the 40 references.',
    },
    cta: { label: 'Open a Word file', href: '/editor' },
    related: ['ai-peer-review'],
    tools: ['thesis-to-manuscript', 'pdf-tools'],
    faq: [
      { q: 'Does it keep my university’s formatting?', a: 'Yes. Open the .docx template and its styles, margins and headings are kept when you export back to Word.' },
      { q: 'Can I export to Overleaf?', a: 'Yes. LaTeX export gives a project with a .tex file and a .bib file that opens in Overleaf.' },
    ],
  },
];

const BY_SLUG = new Map(FEATURE_PAGES.map((page) => [page.slug, page]));

export function getFeaturePage(slug: string): FeaturePage | undefined {
  return BY_SLUG.get(slug);
}

export function relatedFeatures(page: FeaturePage): FeaturePage[] {
  return page.related.map((slug) => BY_SLUG.get(slug)).filter((p): p is FeaturePage => Boolean(p));
}

/** Categories with at least one page, in order. */
export function activeFeatureCategories() {
  return FEATURE_CATEGORIES.filter((category) => FEATURE_PAGES.some((page) => page.category === category.id));
}

/** Pages that fit a piece of text (a blog post's keywords), best first: one point per keyword found. */
export function featuresForText(text: string, limit = 3): FeaturePage[] {
  const haystack = text.toLowerCase();
  return FEATURE_PAGES.map((page) => ({ page, score: [page.name, ...page.keywords].filter((k) => haystack.includes(k.toLowerCase())).length }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.page);
}

/** Where a button goes: straight in when signed in, through sign-up (then on) otherwise. */
export function signupHref(href: string) {
  return `/signup?next=${encodeURIComponent(href)}`;
}
