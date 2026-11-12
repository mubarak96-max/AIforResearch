/**
 * Standalone tools: each one works on its own page (/tools/[slug]), free to try without an
 * account, with a way into the editor for more. Editor features that need a document or a
 * Library are feature pages instead (lib/features.ts).
 *
 * The form for each AI tool is defined here once: the page draws it, the server validates
 * requests against it (lib/server/routes/tools.ts), and the prompts live on the server
 * (lib/server/lib/toolPrompts.ts). Pure data, safe to import anywhere.
 */

export type ToolCategory = 'citations' | 'research' | 'writing' | 'editing' | 'data' | 'utilities';

export const TOOL_CATEGORIES: { id: ToolCategory; name: string; blurb: string }[] = [
  { id: 'citations', name: 'Citations', blurb: 'Cite any source in any style.' },
  { id: 'research', name: 'Research', blurb: 'Reports, reviews and gaps built from real papers.' },
  { id: 'writing', name: 'Writing', blurb: 'First drafts with real citations, ready to edit.' },
  { id: 'editing', name: 'Editing', blurb: 'Rewrite, shorten and check your text.' },
  { id: 'data', name: 'Data', blurb: 'Statistics from your own data, calculated, not guessed.' },
  { id: 'utilities', name: 'PDF', blurb: 'Work with PDFs in your browser.' },
];

export type ToolField = {
  name: string;
  label: string;
  kind: 'text' | 'textarea' | 'select';
  /** select: value and label pairs. The first is the default. */
  options?: [string, string][];
  placeholder?: string;
  help?: string;
  /** Characters allowed. Signed-out visitors get `anonMax` when set. */
  max: number;
  anonMax?: number;
  min?: number;
  required?: boolean;
};

/** How the page runs the tool. */
export type ToolKind =
  /** AI on the server (POST /api/tools/run/:slug). */
  | 'ai'
  /** Citation lookup and formatting (citation-js in the browser). */
  | 'citation'
  /** Writing-pattern check in the browser, no AI call. */
  | 'patterns'
  /** Statistics in the browser. */
  | 'data'
  /** PDF operations in the browser; files never leave the device. */
  | 'pdf';

export type Tool = {
  slug: string;
  name: string;
  category: ToolCategory;
  kind: ToolKind;
  seoTitle: string;
  description: string;
  short: string;
  heading: string;
  intro: string;
  keywords: string[];
  /** AI tools: the form. */
  fields?: ToolField[];
  submitLabel?: string;
  /** AI tools that search papers first and cite them (the `topic` field is the search). */
  grounded?: boolean;
  /** The result can open as a new editor document. */
  toEditor?: boolean;
  steps: { title: string; body: string }[];
  limitations: string[];
  faq: { q: string; a: string }[];
  /** Feature pages (lib/features.ts) and other tools that go with this one. */
  features: string[];
  related: string[];
};

const LEVEL: ToolField = {
  name: 'level', label: 'Level', kind: 'select', max: 40,
  options: [['undergraduate', 'Undergraduate'], ['masters', 'Master’s'], ['doctoral', 'Doctoral'], ['professional', 'Professional / researcher']],
};
const STYLE: ToolField = {
  name: 'style', label: 'Citation style', kind: 'select', max: 40,
  options: [['apa', 'APA 7'], ['mla', 'MLA 9'], ['chicago', 'Chicago'], ['harvard', 'Harvard']],
};
const topic = (label: string, placeholder: string): ToolField => ({ name: 'topic', label, kind: 'text', placeholder, max: 300, min: 3, required: true });
const pasted = (label: string, placeholder: string, max = 20000, anonMax = 6000): ToolField => ({ name: 'text', label, kind: 'textarea', placeholder, max, anonMax, min: 20, required: true });
const notes: ToolField = { name: 'notes', label: 'Anything to include (optional)', kind: 'textarea', placeholder: 'Your angle, required points, data you have, word count…', max: 3000, anonMax: 1500 };

const GROUNDED_LIMITS = [
  'Sources come from a scholarly index and are cited from their abstracts; read the papers before you rely on them.',
  'The draft is a starting point. Rewrite it in your own words and check your course or journal rules on AI use.',
];

export const TOOLS: Tool[] = [
  // ---------------------------------------------------------------- Citations
  {
    slug: 'citation-generator',
    name: 'Citation generator',
    category: 'citations',
    kind: 'citation',
    seoTitle: 'Free citation generator: APA, MLA, Chicago and more',
    description: 'Free citation generator. Paste a DOI or title, or fill in a website or book, and get the citation in APA, MLA, Chicago, Harvard or 10,000+ other styles.',
    short: 'Paste a DOI or title. Get the citation in any style.',
    heading: 'Free citation generator',
    intro: 'Paste a DOI, a paper title or keywords, or fill in the details of a website or book. Pick a style and copy the reference and the in-text citation.',
    keywords: ['citation generator', 'free citation generator', 'works cited generator', 'reference generator', 'bibliography generator', 'cite a website'],
    steps: [
      { title: 'Find the source', body: 'Paste a DOI or search by title, or enter a website, book or other source by hand.' },
      { title: 'Pick a style', body: 'APA, MLA, Chicago, Harvard, AMA, IEEE or any of over 10,000 styles.' },
      { title: 'Copy', body: 'Copy the reference and the in-text citation. Add more sources to build a list.' },
    ],
    limitations: [
      'A citation is only as good as its record. Check names, dates and capitalisation for unusual sources.',
      'Your list stays in this browser. Sign in to keep references with your documents.',
    ],
    faq: [
      { q: 'Is it free?', a: 'Yes, with no account needed. Citations never use credits, on any plan.' },
      { q: 'Can I cite a website?', a: 'Yes. Choose Website and fill in the author, title, site name, date and URL.' },
      { q: 'Which styles are there?', a: 'The common styles are listed first. Search the style box for over 10,000 more, including journal and university versions.' },
    ],
    features: ['paper-search', 'research-library'],
    related: ['literature-review-generator', 'paraphrasing-tool'],
  },

  // ---------------------------------------------------------------- Research
  {
    slug: 'deep-research',
    name: 'Deep research report',
    category: 'research',
    kind: 'ai',
    grounded: true,
    toEditor: true,
    seoTitle: 'AI deep research report with real citations',
    description: 'Ask a research question and get a structured report built from real papers: key findings, where studies agree and disagree, and every claim cited.',
    short: 'A cited report on your question, built from real papers.',
    heading: 'A research report on your question, with every claim cited',
    intro: 'Ask a research question. AI for Research finds relevant papers, reads their abstracts and writes a structured report: what is known, where studies disagree, and what is still open. Each claim cites the paper behind it.',
    keywords: ['deep research', 'ai research report', 'research summary generator', 'ai research assistant'],
    fields: [
      topic('Research question', 'e.g. Does remote work affect employee productivity?'),
      { name: 'depth', label: 'Report length', kind: 'select', max: 20, options: [['standard', 'Standard (about 800 words)'], ['long', 'Long (about 1,500 words)']] },
      LEVEL,
      notes,
    ],
    submitLabel: 'Write the report',
    steps: [
      { title: 'Ask', body: 'Type a research question. Add notes on your angle if you like.' },
      { title: 'It searches', body: 'AI for Research searches over 250 million works and picks the most relevant papers.' },
      { title: 'Read and check', body: 'Read the report, open the cited papers, and open it in the editor to keep working.' },
    ],
    limitations: [...GROUNDED_LIMITS, 'It reads abstracts, not full texts, and uses about ten papers per report.'],
    faq: [
      { q: 'Are the sources real?', a: 'Yes. Every citation is a paper from the search results, linked to its record. The text around it is AI-written, so check that each paper says what the report claims.' },
      { q: 'Can I use my own PDFs?', a: 'Inside the editor, AI Chat can answer from your Library PDFs with page numbers.' },
    ],
    features: ['research-assistant', 'paper-search', 'chat-with-pdf'],
    related: ['research-gap-finder', 'literature-review-generator'],
  },
  {
    slug: 'research-gap-finder',
    name: 'Research gap finder',
    category: 'research',
    kind: 'ai',
    grounded: true,
    toEditor: true,
    seoTitle: 'Research gap finder: find gaps in the literature',
    description: 'Enter a topic and find possible research gaps: unanswered questions, under-studied groups and methods, and conflicting results, each linked to the papers behind it.',
    short: 'Possible gaps in the literature, each tied to real papers.',
    heading: 'Find research gaps in your topic',
    intro: 'Enter a topic. AI for Research reads recent and highly cited papers and suggests possible gaps: questions not yet answered, groups or settings not studied, methods not tried, and results that disagree. Each one cites the papers it is based on.',
    keywords: ['research gap finder', 'find research gaps', 'research gap', 'gap in the literature', 'research topic ideas'],
    fields: [topic('Topic', 'e.g. mobile money and women’s entrepreneurship in East Africa'), LEVEL, notes],
    submitLabel: 'Find gaps',
    steps: [
      { title: 'Enter a topic', body: 'The narrower the topic, the more useful the gaps.' },
      { title: 'Review the gaps', body: 'Each gap says why it may be a gap and which papers suggest it.' },
      { title: 'Check before you commit', body: 'Search further before you build a study on a gap: a paper outside the sample may already fill it.' },
    ],
    limitations: ['Gaps are suggestions from a sample of papers, not proof that no one has studied the question.', ...GROUNDED_LIMITS.slice(0, 1)],
    faq: [
      { q: 'Can I trust that a gap is real?', a: 'Treat each one as a lead. It is based on about ten papers; search further, and ask your supervisor, before you rely on it.' },
    ],
    features: ['paper-search', 'literature-review'],
    related: ['research-proposal-generator', 'deep-research'],
  },
  {
    slug: 'literature-review-generator',
    name: 'Literature review generator',
    category: 'research',
    kind: 'ai',
    grounded: true,
    toEditor: true,
    seoTitle: 'Literature review generator (RRL) with real citations',
    description: 'Generate a thematic literature review or review of related literature (RRL) on your topic, built from real papers and cited in APA, MLA, Chicago or Harvard.',
    short: 'A thematic literature review (RRL) from real papers.',
    heading: 'Literature review generator, with real sources',
    intro: 'Enter your topic. AI for Research finds relevant papers and drafts a thematic literature review, or review of related literature (RRL): the main themes, how studies compare, and the gap your study fills. Every citation is a real paper.',
    keywords: ['literature review generator', 'rrl generator', 'review of related literature', 'ai literature review', 'literature review writer'],
    fields: [
      topic('Topic or research question', 'e.g. effects of social media use on adolescent sleep'),
      { name: 'format', label: 'Format', kind: 'select', max: 20, options: [['thematic', 'Thematic literature review'], ['rrl', 'Review of related literature (RRL)'], ['chronological', 'Chronological review']] },
      LEVEL,
      STYLE,
      notes,
    ],
    submitLabel: 'Write the review',
    steps: [
      { title: 'Enter your topic', body: 'Choose the format your course asks for.' },
      { title: 'It finds and groups papers', body: 'Relevant papers are grouped into themes and compared.' },
      { title: 'Edit in the editor', body: 'Open the review as a document with real, editable citations and add your own papers.' },
    ],
    limitations: [...GROUNDED_LIMITS, 'For a systematic review you need a full search and screening protocol, which this is not.'],
    faq: [
      { q: 'What is an RRL?', a: 'A review of related literature: the chapter of a thesis or research paper that summarises what earlier studies found and how they relate to yours. It is common in the Philippines and in many undergraduate programmes.' },
      { q: 'Can I add my own sources?', a: 'Yes. Open the review in the editor and cite your own papers or Library PDFs with @.' },
    ],
    features: ['literature-review', 'chat-with-pdf', 'research-library'],
    related: ['research-gap-finder', 'research-proposal-generator', 'citation-generator'],
  },

  // ---------------------------------------------------------------- Writing
  {
    slug: 'research-proposal-generator',
    name: 'Research proposal generator',
    category: 'writing',
    kind: 'ai',
    grounded: true,
    toEditor: true,
    seoTitle: 'Research proposal generator with real citations',
    description: 'Draft a research proposal: background with real citations, problem statement, research questions, methods and timeline. Open it in the editor to finish it.',
    short: 'A full proposal draft: background, questions, methods, timeline.',
    heading: 'Draft a research proposal in minutes',
    intro: 'Give your topic and a few details. AI for Research drafts each section of a research proposal: background and literature with real citations, problem statement, research questions, methods, ethics and timeline.',
    keywords: ['research proposal generator', 'research proposal writer', 'ai research proposal', 'research proposal template'],
    fields: [
      topic('Topic', 'e.g. mobile banking and small business growth in Kenya'),
      { name: 'method', label: 'Method', kind: 'select', max: 30, options: [['any', 'Suggest one'], ['quantitative', 'Quantitative'], ['qualitative', 'Qualitative'], ['mixed', 'Mixed methods']] },
      LEVEL,
      STYLE,
      notes,
    ],
    submitLabel: 'Draft the proposal',
    steps: [
      { title: 'Describe your study', body: 'Topic, method and level. Add anything your supervisor asked for.' },
      { title: 'Read the draft', body: 'Every section of a standard proposal, with the background cited.' },
      { title: 'Finish it', body: 'Open it in the editor, make it yours, run the checks and export to Word.' },
    ],
    limitations: [...GROUNDED_LIMITS, 'It cannot judge whether your study is feasible or new; your supervisor can.'],
    faq: [
      { q: 'Can I use my university’s template?', a: 'Yes. Open your .docx template in the editor and paste or rewrite the sections into it.' },
    ],
    features: ['ai-writing-assistant', 'ai-peer-review', 'word-latex-export'],
    related: ['research-gap-finder', 'grant-proposal-writer', 'literature-review-generator'],
  },
  {
    slug: 'essay-writer',
    name: 'Essay writer',
    category: 'writing',
    kind: 'ai',
    grounded: true,
    toEditor: true,
    seoTitle: 'AI essay writer with real citations',
    description: 'Get an essay plan and first draft with an introduction, argued body paragraphs and conclusion, citing real papers in your style. Edit it in your own voice.',
    short: 'An essay plan and draft that cites real papers.',
    heading: 'An essay draft with sources you can check',
    intro: 'Paste your essay question. AI for Research plans an argument and drafts the introduction, body paragraphs and conclusion, citing real papers in your style, for you to rewrite in your own voice.',
    keywords: ['ai essay writer', 'essay writer', 'essay generator with citations', 'academic essay writer'],
    fields: [
      topic('Essay question or topic', 'e.g. Should cities ban cars from their centres?'),
      { name: 'type', label: 'Essay type', kind: 'select', max: 30, options: [['argumentative', 'Argumentative'], ['expository', 'Expository'], ['compare', 'Compare and contrast'], ['analytical', 'Analytical'], ['reflective', 'Reflective']] },
      { name: 'length', label: 'Length', kind: 'select', max: 20, options: [['800', 'About 800 words'], ['1200', 'About 1,200 words'], ['1800', 'About 1,800 words']] },
      LEVEL,
      STYLE,
      notes,
    ],
    submitLabel: 'Write the draft',
    steps: [
      { title: 'Paste the question', body: 'Choose the essay type, length and citation style.' },
      { title: 'Read the plan and draft', body: 'The thesis statement and outline come first, then the draft.' },
      { title: 'Make it yours', body: 'Rewrite it in your own words in the editor, then proofread and check claims.' },
    ],
    limitations: [...GROUNDED_LIMITS, 'Many courses forbid submitting AI-written work. Use the draft to plan and learn, and follow your rules.'],
    faq: [
      { q: 'Is using it cheating?', a: 'That depends on your course. Many allow AI help with planning but not AI-written submissions. Check your rules, and disclose AI use where required.' },
    ],
    features: ['ai-writing-assistant', 'ai-writing-editor', 'authorship-report'],
    related: ['paraphrasing-tool', 'citation-generator'],
  },
  {
    slug: 'research-paper-writer',
    name: 'Research paper writer',
    category: 'writing',
    kind: 'ai',
    grounded: true,
    toEditor: true,
    seoTitle: 'AI research paper writer: IMRaD draft with citations',
    description: 'Turn your topic, method and findings into a research paper draft in IMRaD form: introduction with real citations, methods, results and discussion.',
    short: 'Your study, drafted as an IMRaD paper with citations.',
    heading: 'Draft a research paper from your study',
    intro: 'Describe your study: the question, how you did it and what you found. AI for Research drafts a paper in IMRaD form, with an introduction and discussion that cite real papers. Your results stay yours: it only writes up what you give it.',
    keywords: ['research paper writer', 'ai research paper', 'imrad', 'write a research paper', 'research paper generator'],
    fields: [
      topic('Research question', 'e.g. Does peer tutoring improve first-year maths grades?'),
      { name: 'study', label: 'Your method and findings', kind: 'textarea', placeholder: 'Who took part, what you did, what you measured and what you found (numbers welcome).', max: 6000, anonMax: 3000, min: 40, required: true },
      STYLE,
      notes,
    ],
    submitLabel: 'Draft the paper',
    steps: [
      { title: 'Describe the study', body: 'Give the question, method and findings in plain notes.' },
      { title: 'Read the draft', body: 'Introduction, methods, results and discussion, with the literature cited.' },
      { title: 'Finish in the editor', body: 'Add your tables, run peer review and claim check, and export.' },
    ],
    limitations: [...GROUNDED_LIMITS, 'It does not analyse data or invent results; it writes up the findings you give it. Check every number.'],
    faq: [
      { q: 'Will it make up results?', a: 'It is told to use only your findings and to leave placeholders such as [add value] where a number is missing. Check every figure against your data.' },
    ],
    features: ['ai-peer-review', 'citation-checker', 'word-latex-export'],
    related: ['abstract-generator', 'data-analysis', 'thesis-to-manuscript'],
  },
  {
    slug: 'thesis-chapter-planner',
    name: 'Thesis chapter planner',
    category: 'writing',
    kind: 'ai',
    grounded: true,
    toEditor: true,
    seoTitle: 'Thesis and dissertation chapter planner',
    description: 'Plan a thesis or dissertation chapter: sections, what each must cover, key sources to start from and questions your examiners may ask.',
    short: 'A section-by-section plan for a thesis chapter.',
    heading: 'Plan your thesis chapter',
    intro: 'Choose a chapter and describe your thesis. AI for Research plans the chapter section by section: what each part should cover, real papers to start from, and the questions examiners often ask.',
    keywords: ['thesis chapter outline', 'dissertation outline', 'thesis planner', 'thesis writing help', 'dissertation chapter'],
    fields: [
      topic('Thesis topic', 'e.g. drought adaptation by smallholder farmers in northern Ghana'),
      { name: 'chapter', label: 'Chapter', kind: 'select', max: 30, options: [['introduction', 'Introduction'], ['literature', 'Literature review'], ['methodology', 'Methodology'], ['results', 'Results'], ['discussion', 'Discussion'], ['conclusion', 'Conclusion']] },
      LEVEL,
      notes,
    ],
    submitLabel: 'Plan the chapter',
    steps: [
      { title: 'Choose the chapter', body: 'Describe your thesis and anything already decided.' },
      { title: 'Read the plan', body: 'Sections with what to cover, word guides and sources to start from.' },
      { title: 'Write it', body: 'Open the plan in the editor and write each section under its heading.' },
    ],
    limitations: GROUNDED_LIMITS,
    faq: [{ q: 'Does it follow my university’s structure?', a: 'It follows the common structure. Add your university’s required sections in the notes and it will use them.' }],
    features: ['ai-writing-assistant', 'literature-review', 'word-latex-export'],
    related: ['literature-review-generator', 'thesis-to-manuscript'],
  },
  {
    slug: 'grant-proposal-writer',
    name: 'Grant proposal writer',
    category: 'writing',
    kind: 'ai',
    grounded: true,
    toEditor: true,
    seoTitle: 'Grant proposal writer: aims, significance, approach',
    description: 'Draft a grant proposal: summary, specific aims, significance with real citations, approach, expected outcomes and timeline. Edit it to your funder’s rules.',
    short: 'Aims, significance and approach, drafted with citations.',
    heading: 'Draft a grant proposal',
    intro: 'Describe your project and the funder. AI for Research drafts the summary, specific aims, significance (citing real papers), approach, expected outcomes and timeline, ready for you to fit to the funder’s rules.',
    keywords: ['grant proposal writer', 'grant writing ai', 'research grant proposal', 'specific aims'],
    fields: [
      topic('Project', 'e.g. a low-cost sensor network for early flood warning'),
      { name: 'funder', label: 'Funder or scheme (optional)', kind: 'text', placeholder: 'e.g. a national science foundation early-career grant', max: 200 },
      notes,
    ],
    submitLabel: 'Draft the proposal',
    steps: [
      { title: 'Describe the project', body: 'Its aim, who benefits, and the funder if you know it.' },
      { title: 'Read the draft', body: 'The usual sections, with the need for the work backed by sources.' },
      { title: 'Fit it to the call', body: 'Funders set their own sections and limits. Edit to match them.' },
    ],
    limitations: [...GROUNDED_LIMITS, 'It does not know each funder’s current rules, budgets or deadlines.'],
    faq: [{ q: 'Does it write the budget?', a: 'No. It can suggest what to cost, but budgets depend on your institution and the funder.' }],
    features: ['ai-writing-assistant', 'ai-peer-review'],
    related: ['research-proposal-generator', 'research-gap-finder'],
  },
  {
    slug: 'abstract-generator',
    name: 'Abstract generator',
    category: 'writing',
    kind: 'ai',
    toEditor: false,
    seoTitle: 'Abstract generator for research papers and theses',
    description: 'Paste your paper or thesis and get an abstract in the length and structure you need: structured (background, methods, results, conclusions) or a single paragraph.',
    short: 'Paste your paper. Get an abstract of the right length.',
    heading: 'Write an abstract from your paper',
    intro: 'Paste your paper, thesis chapter or report. AI for Research writes an abstract from it, structured or as one paragraph, within your word limit, using only what your text says.',
    keywords: ['abstract generator', 'abstract writer', 'write an abstract', 'research abstract', 'thesis abstract'],
    fields: [
      pasted('Your paper', 'Paste the paper, or at least the introduction, methods, results and conclusion.'),
      { name: 'structure', label: 'Structure', kind: 'select', max: 20, options: [['paragraph', 'One paragraph'], ['structured', 'Structured (Background, Methods, Results, Conclusions)']] },
      { name: 'words', label: 'Word limit', kind: 'select', max: 10, options: [['250', '250 words'], ['150', '150 words'], ['300', '300 words'], ['350', '350 words']] },
    ],
    submitLabel: 'Write the abstract',
    steps: [
      { title: 'Paste your text', body: 'The more of the paper you paste, the better the abstract.' },
      { title: 'Choose the format', body: 'Structured or one paragraph, and the word limit.' },
      { title: 'Check it', body: 'Make sure every number and claim matches your paper.' },
    ],
    limitations: ['It uses only the text you paste; check that results are reported exactly.', 'Long papers are shortened for signed-out visitors.'],
    faq: [{ q: 'Does it add keywords?', a: 'Yes, it suggests five keywords after the abstract.' }],
    features: ['ai-writing-editor', 'ai-peer-review'],
    related: ['research-paper-writer', 'thesis-to-manuscript'],
  },
  {
    slug: 'thesis-to-manuscript',
    name: 'Thesis to manuscript',
    category: 'writing',
    kind: 'ai',
    toEditor: true,
    seoTitle: 'Thesis to journal article: turn a chapter into a manuscript',
    description: 'Turn a thesis chapter into a journal manuscript: a shorter, tighter IMRaD structure, a target word count and a list of what to cut, keep and add.',
    short: 'Turn a thesis chapter into a journal article draft.',
    heading: 'Turn your thesis into a journal manuscript',
    intro: 'Paste a thesis chapter. AI for Research restructures it as a journal article: tighter, in IMRaD form, near your target length, with a note of what was cut and what a journal will expect you to add.',
    keywords: ['thesis to manuscript', 'thesis to journal article', 'convert thesis to paper', 'publish thesis as article'],
    fields: [
      pasted('Thesis chapter or summary', 'Paste the chapter (or several chapters).', 30000, 8000),
      { name: 'words', label: 'Target length', kind: 'select', max: 10, options: [['5000', 'About 5,000 words'], ['3000', 'About 3,000 words'], ['7000', 'About 7,000 words']] },
      { name: 'journal', label: 'Target journal or field (optional)', kind: 'text', placeholder: 'e.g. an education policy journal', max: 200 },
    ],
    submitLabel: 'Restructure it',
    steps: [
      { title: 'Paste the chapter', body: 'Add the target length and journal or field.' },
      { title: 'Read the manuscript', body: 'A shorter article draft, plus what changed and why.' },
      { title: 'Finish it', body: 'Open it in the editor, add the journal’s template and run peer review.' },
    ],
    limitations: ['It keeps your citations as written; check them against your reference list.', 'Journals have their own rules; check the author guidelines.'],
    faq: [{ q: 'Can I publish my thesis as an article?', a: 'Usually, yes. Many journals accept articles based on a thesis; some ask you to say so. Check the journal’s policy.' }],
    features: ['word-latex-export', 'ai-peer-review'],
    related: ['abstract-generator', 'research-paper-writer'],
  },

  // ---------------------------------------------------------------- Editing
  {
    slug: 'paraphrasing-tool',
    name: 'Paraphrasing tool',
    category: 'editing',
    kind: 'ai',
    seoTitle: 'Free paraphrasing tool for academic writing',
    description: 'Paraphrase a sentence or paragraph in plain, formal or shorter words while keeping its meaning. Built for academic writing. Free, no sign-up.',
    short: 'Reword a passage while keeping its meaning.',
    heading: 'Paraphrase academic text, keeping the meaning',
    intro: 'Paste a sentence or paragraph and choose how to reword it. AI for Research keeps the meaning, the technical terms and any citations in place.',
    keywords: ['paraphrasing tool', 'paraphraser', 'paraphrase', 'rewording tool', 'academic paraphrasing tool'],
    fields: [
      pasted('Text', 'Paste the text to paraphrase.', 6000, 2500),
      { name: 'mode', label: 'Mode', kind: 'select', max: 20, options: [['standard', 'Standard'], ['academic', 'More formal and academic'], ['simple', 'Simpler'], ['shorter', 'Shorter'], ['fluent', 'More fluent']] },
    ],
    submitLabel: 'Paraphrase',
    steps: [
      { title: 'Paste text', body: 'Up to about a page at a time.' },
      { title: 'Choose a mode', body: 'Standard, formal, simpler, shorter or more fluent.' },
      { title: 'Copy', body: 'Compare with your original and copy the version you want.' },
    ],
    limitations: ['Paraphrasing a source still needs a citation.', 'Check that technical meaning has not changed.'],
    faq: [{ q: 'Is paraphrasing plagiarism?', a: 'Not if you cite the source. Rewording someone else’s idea without citing it is still plagiarism.' }],
    features: ['ai-writing-editor'],
    related: ['humanizer', 'ai-writing-checker', 'citation-generator'],
  },
  {
    slug: 'humanizer',
    name: 'Humanizer: natural style rewrite',
    category: 'editing',
    kind: 'ai',
    seoTitle: 'AI humanizer: rewrite text to sound natural',
    description: 'Rewrite stiff or generic text so it reads like a person wrote it: varied sentences, plain words, no stock phrases. Keeps your meaning and citations.',
    short: 'Make stiff or generic text read naturally.',
    heading: 'Make your writing sound like you',
    intro: 'Paste text that sounds stiff, generic or machine-made. AI for Research rewrites it with varied sentences, plain words and no stock phrases, keeping your meaning, your facts and your citations.',
    keywords: ['ai humanizer', 'humanizer', 'humanize ai text', 'make text sound natural', 'natural writing'],
    fields: [
      pasted('Text', 'Paste the text to rewrite.', 6000, 2500),
      { name: 'tone', label: 'Tone', kind: 'select', max: 20, options: [['academic', 'Academic'], ['plain', 'Plain and clear'], ['conversational', 'Conversational']] },
    ],
    submitLabel: 'Rewrite',
    steps: [
      { title: 'Paste text', body: 'A paragraph or a page.' },
      { title: 'Choose a tone', body: 'Academic, plain or conversational.' },
      { title: 'Read and adjust', body: 'Put your own examples and voice back in.' },
    ],
    limitations: [
      'It is a style editor. It is not built or promised to get past AI detectors, and detectors disagree with each other.',
      'Rewriting AI text does not make it your own work. Follow your course or employer’s rules on AI use.',
    ],
    faq: [
      { q: 'Will it pass an AI detector?', a: 'We do not promise that. Detectors are unreliable either way. The honest way to show your work is your writing history: see the authorship report.' },
    ],
    features: ['ai-writing-editor', 'authorship-report'],
    related: ['ai-writing-checker', 'paraphrasing-tool'],
  },
  {
    slug: 'ai-writing-checker',
    name: 'AI writing pattern checker',
    category: 'editing',
    kind: 'patterns',
    seoTitle: 'AI writing checker: find stock AI phrases in text',
    description: 'Highlight the phrases and habits that make writing read as machine-made: stock words, filler, em dashes and formulaic patterns. An editing aid, not an AI detector.',
    short: 'Highlights stock AI phrases and habits. Not a detector.',
    heading: 'Find the phrases that make writing sound machine-made',
    intro: 'Paste your text. The checker highlights stock words, filler phrases, em dashes and formulaic patterns that readers associate with AI-written text, so you can rewrite them. It runs in your browser.',
    keywords: ['ai writing checker', 'ai detector', 'ai content detector', 'check for ai writing', 'ai phrases'],
    steps: [
      { title: 'Paste text', body: 'Nothing is sent anywhere; the check runs in your browser.' },
      { title: 'See the patterns', body: 'Each highlight says what it is and why it reads as generic.' },
      { title: 'Rewrite', body: 'Change the highlighted phrases, or use the humanizer.' },
    ],
    limitations: [
      'It cannot tell who or what wrote a text. People use these phrases too, and AI text can avoid them.',
      'Never use it, or any AI detector, as evidence that someone cheated.',
    ],
    faq: [
      { q: 'Is this an AI detector?', a: 'No. No tool can reliably tell whether a text was written by AI. This checker only points out phrases worth rewriting.' },
    ],
    features: ['authorship-report', 'ai-writing-editor'],
    related: ['humanizer', 'paraphrasing-tool'],
  },

  // ---------------------------------------------------------------- Data
  {
    slug: 'data-analysis',
    name: 'Quick data analysis',
    category: 'data',
    kind: 'data',
    seoTitle: 'Free statistics calculator: descriptives, t-test, chi-square',
    description: 'Upload a CSV and get descriptive statistics, correlations, t-tests and chi-square tests, calculated in your browser, with results written in APA style.',
    short: 'Descriptives, correlations, t-tests and chi-square from a CSV.',
    heading: 'Analyse your data in the browser',
    intro: 'Upload or paste a CSV. Get descriptive statistics for every column, then run a correlation, t-test or chi-square test. The numbers are calculated, not generated by AI, and each result is written up in APA style. Your data never leaves your device.',
    keywords: ['statistics calculator', 't test calculator', 'chi square calculator', 'descriptive statistics calculator', 'correlation calculator', 'data analysis tool'],
    steps: [
      { title: 'Load data', body: 'Upload a CSV or paste rows. The first row should be the column names.' },
      { title: 'Check the columns', body: 'See counts, missing values, means and frequencies.' },
      { title: 'Run a test', body: 'Pick a test and columns. Copy the table and the APA write-up.' },
    ],
    limitations: [
      'It does not check every assumption for you. Look at your data and choose a test that fits it.',
      'Up to 50,000 rows. For regression, ANOVA and more, use dedicated software such as R, JASP or SPSS.',
    ],
    faq: [
      { q: 'Is my data uploaded?', a: 'No. The file is read and analysed in your browser and is never sent to AI for Research.' },
      { q: 'Which t-test does it run?', a: 'Welch’s t-test for two independent groups, which does not assume equal variances, and a paired t-test for two measures on the same cases.' },
    ],
    features: [],
    related: ['research-paper-writer'],
  },

  // ---------------------------------------------------------------- PDF
  {
    slug: 'pdf-tools',
    name: 'PDF tools',
    category: 'utilities',
    kind: 'pdf',
    seoTitle: 'Merge, split, extract and rotate PDFs, free in your browser',
    description: 'Merge PDFs, split a PDF into pages, extract a page range or rotate pages. Free, no upload: everything runs in your browser.',
    short: 'Merge, split, extract and rotate PDFs. Nothing is uploaded.',
    heading: 'Merge, split and extract PDF pages',
    intro: 'Combine several PDFs into one, take out the pages you need, or rotate pages. The files are processed in your browser and never uploaded.',
    keywords: ['merge pdf', 'split pdf', 'extract pdf pages', 'rotate pdf', 'combine pdf'],
    steps: [
      { title: 'Choose a task', body: 'Merge, extract pages, split into single pages, or rotate.' },
      { title: 'Add files', body: 'Pick PDFs from your device. Reorder them for merging.' },
      { title: 'Download', body: 'Save the new PDF. Nothing is stored anywhere.' },
    ],
    limitations: ['Password-protected PDFs cannot be opened.', 'Very large files depend on your device’s memory.'],
    faq: [{ q: 'Are my files uploaded?', a: 'No. Everything happens in your browser.' }],
    features: ['research-library', 'chat-with-pdf'],
    related: ['citation-generator'],
  },
];

const BY_SLUG = new Map(TOOLS.map((tool) => [tool.slug, tool]));

export function getTool(slug: string): Tool | undefined {
  return BY_SLUG.get(slug);
}

export function relatedTools(tool: Tool): Tool[] {
  return tool.related.map((slug) => BY_SLUG.get(slug)).filter((t): t is Tool => Boolean(t));
}

export function activeToolCategories() {
  return TOOL_CATEGORIES.filter((category) => TOOLS.some((tool) => tool.category === category.id));
}

export function aiTools(): Tool[] {
  return TOOLS.filter((tool) => tool.kind === 'ai');
}

/** Tools that fit a piece of text, best first. */
export function toolsForText(text: string, limit = 3): Tool[] {
  const haystack = text.toLowerCase();
  return TOOLS.map((tool) => ({ tool, score: [tool.name, ...tool.keywords].filter((k) => haystack.includes(k.toLowerCase())).length }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.tool);
}

/** The free allowance for signed-out visitors, per address per day, across all AI tools. */
export const ANON_DAILY_RUNS = 3;
