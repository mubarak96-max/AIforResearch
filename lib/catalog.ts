/**
 * The one list of AI for Research's workspaces and tools: the home page's Features and Tools
 * sections and the in-app All tools page read it. Pure data.
 *
 * - `href` is where it works in the app (signed in). Signed-out visitors go to sign-up with
 *   that page as the next step, or to `marketing` when a public page explains it.
 * - `credits` uses the figures in lib/server/lib/plans.ts (CREDIT_COSTS) and
 *   docs/redesign/03-pricing.md. Keep them in step.
 * - `phase1` is true for what worked before the research-workspace rebuild or ships in phase 1;
 *   the rest are workspaces built in this round (docs/redesign/01-product-structure.md).
 * - `landing` is the planned landing page (docs/redesign/04-content-plan.md); not built yet.
 */

export type Hub = 'research' | 'library' | 'write' | 'review' | 'systematic' | 'data';

export const HUBS: { id: Hub; name: string; blurb: string }[] = [
  { id: 'research', name: 'Research', blurb: 'Ask questions and find the evidence.' },
  { id: 'library', name: 'Library', blurb: 'Keep, read and cite your papers.' },
  { id: 'write', name: 'Write', blurb: 'Draft, rewrite and present with real citations.' },
  { id: 'review', name: 'Review', blurb: 'Check your work before someone else does.' },
  { id: 'systematic', name: 'Systematic Review', blurb: 'From protocol to PRISMA flow in one place.' },
  { id: 'data', name: 'Data', blurb: 'Statistics, tables and charts from your own data.' },
];

export type CatalogItem = {
  id: string;
  name: string;
  hub: Hub;
  /** One line: what it does. */
  description: string;
  /** Where it works in the app. */
  href: string;
  /** What it costs, in words. */
  credits: string;
  phase1: boolean;
  /** A public page that explains or runs it, when there is one. */
  marketing: string | null;
  /** The planned landing page (not built yet). */
  landing: string | null;
  /** A workspace (several modules) rather than a single tool. */
  workspace?: boolean;
  keywords?: string[];
};

export const CATALOG: CatalogItem[] = [
  {
    id: 'workbooks', name: 'Workbooks', hub: 'research', workspace: true,
    description: 'Keep sources, exact quotations, appraisals and reviewer sign-off together, then draft a literature review or findings report from them.',
    href: '/workbooks', credits: 'No credits to save · AI suggestions 3 credits', phase1: false, marketing: null, landing: null,
    keywords: ['workbook', 'evidence table', 'appraisal', 'journal club', 'qualitative', 'coding', 'themes', 'deliverable', 'supervisor review'],
  },
  { id: 'evidence-monitoring', name: 'Saved searches', hub: 'research', workspace: true, description: 'Save searches, compare new results and publication notices, and review updates in a decision journal.', href: '/monitoring', credits: 'No credits', phase1: false, marketing: null, landing: null, keywords: ['alerts', 'saved searches', 'retractions', 'updates', 'monitor'] },
  { id: 'official-sources', name: 'Trial registries', hub: 'research', description: 'Find trial registrations, link them to publications and save them with their provenance.', href: '/official-sources', credits: 'No credits', phase1: false, marketing: null, landing: null, keywords: ['clinical trials', 'registry', 'registration', 'outcomes', 'official'] },
  // ---------------------------------------------------------------- Research
  {
    id: 'deep-research', name: 'Deep Research', hub: 'research', workspace: true,
    description: 'Ask a question and get an answer built from real papers, with every claim cited and a consensus line.',
    href: '/deep-research', credits: 'Summary 1 credit · Deep 15 · Detailed 45', phase1: true,
    marketing: '/features/research-assistant', landing: '/features/deep-research', keywords: ['ask', 'chat', 'report', 'consensus', 'summary'],
  },
  {
    id: 'find-papers', name: 'Find Papers', hub: 'research',
    description: 'Search papers, PubMed, preprints and the web, and filter by year, study type, journal and citations.',
    href: '/papers', credits: 'No credits', phase1: true, marketing: '/features/paper-search', landing: '/features/paper-search', keywords: ['search', 'articles', 'journals', 'pubmed', 'filters'],
  },
  {
    id: 'citation-map', name: 'Citation Map', hub: 'research',
    description: 'See what a paper cites and what cites it, snowball backward and forward, and find the reviews that cite a set.',
    href: '/citation-map', credits: 'No credits', phase1: false, marketing: null, landing: '/features/citation-map', keywords: ['graph', 'snowballing', 'references', 'cited by'],
  },
  {
    id: 'landscape', name: 'Landscape', hub: 'research',
    description: 'A field at a glance: output by year, main topics, most-cited work, leading authors and journals.',
    href: '/landscape', credits: 'No credits', phase1: false, marketing: null, landing: '/features/research-landscape', keywords: ['bibliometric', 'trends', 'mapping'],
  },
  {
    id: 'gap-finder', name: 'Research gap finder', hub: 'research',
    description: 'Open questions in a topic, each with its reason, its sources and a confidence level.',
    href: '/thesis?module=gaps', credits: '3 credits', phase1: true, marketing: '/tools/research-gap-finder', landing: null, keywords: ['gaps', 'future research'],
  },

  // ---------------------------------------------------------------- Library
  {
    id: 'library', name: 'My Library', hub: 'library',
    description: 'Your papers and PDFs in folders, searchable, ready to cite and to use as sources in any job.',
    href: '/editor?tool=library', credits: 'No credits', phase1: true, marketing: '/features/research-library', landing: null, keywords: ['pdf', 'papers', 'saved'],
  },
  {
    id: 'chat-with-pdf', name: 'Chat with PDF', hub: 'library',
    description: 'Ask your PDFs questions and get answers with the page they come from.',
    href: '/editor?tool=chat', credits: '1 credit a question', phase1: true, marketing: '/features/chat-with-pdf', landing: null, keywords: ['pdf', 'ask', 'read'],
  },
  {
    id: 'reference-import', name: 'Zotero and Mendeley import', hub: 'library',
    description: 'Bring your references and PDFs from Zotero, Mendeley, BibTeX or RIS.',
    href: '/editor?tool=library', credits: 'No credits · paid plans', phase1: true, marketing: '/features/reference-manager-import', landing: null, keywords: ['zotero', 'mendeley', 'bibtex', 'ris'],
  },
  {
    id: 'review-matrix', name: 'Review matrix', hub: 'library',
    description: 'Compare papers side by side: aims, methods, samples and findings, each cell with its quote and page.',
    href: '/matrix', credits: '1 credit a paper', phase1: true, marketing: '/features/literature-review', landing: null, keywords: ['evidence table', 'extraction', 'literature review'],
  },
  {
    id: 'citation-generator', name: 'Citation generator', hub: 'library',
    description: 'Cite any paper, book or website in APA, MLA, Chicago, Harvard and 10,000+ styles.',
    href: '/tools/citation-generator', credits: 'No credits', phase1: true, marketing: '/tools/citation-generator', landing: null, keywords: ['apa', 'mla', 'chicago', 'reference'],
  },

  // ---------------------------------------------------------------- Write
  {
    id: 'writing-studio', name: 'Writing Studio', hub: 'write', workspace: true,
    description: 'Articles with evidence, literature reviews with citations, abstracts and improved drafts, then the editor.',
    href: '/write', credits: '3 credits a section · 15 a full draft', phase1: false, marketing: '/features/ai-writing-editor', landing: null, keywords: ['paper', 'article', 'literature review', 'abstract'],
  },
  {
    id: 'case-report', name: 'Case report writer', hub: 'write',
    description: 'A clinical case report in the CARE structure from your de-identified notes, with the literature in the discussion.',
    href: '/write?module=case-report', credits: '15 credits', phase1: false, marketing: null, landing: '/features/case-report-writer', keywords: ['care', 'case report', 'medical', 'clinical'],
  },
  {
    id: 'clinical-audit', name: 'Clinical audit', hub: 'write',
    description: 'An audit plan with criteria, targets and a data collection form, or the report of a completed audit cycle.',
    href: '/write?module=clinical-audit', credits: 'Plan 3 credits · report 15', phase1: false, marketing: null, landing: '/features/clinical-audit', keywords: ['audit', 'quality improvement', 're-audit', 'nhs'],
  },
  {
    id: 'evaluation-report', name: 'Evaluation report', hub: 'write',
    description: 'A programme evaluation against the OECD-DAC criteria, your questions or your logframe, from your findings.',
    href: '/write?module=evaluation-report', credits: '15 credits', phase1: false, marketing: null, landing: '/features/evaluation-report', keywords: ['m&e', 'oecd dac', 'ngo', 'donor report', 'logframe'],
  },
  {
    id: 'white-paper', name: 'White paper', hub: 'write',
    description: 'A scientific, technical, policy or business white paper built on real research, with your own data and approach.',
    href: '/write?module=white-paper', credits: 'Whole 15 credits · section 3', phase1: false, marketing: '/tools/white-paper-generator', landing: '/features/white-paper-writer', keywords: ['white paper', 'whitepaper', 'technical', 'scientific', 'b2b', 'report'],
  },
  {
    id: 'policy-brief', name: 'Policy brief', hub: 'write',
    description: 'Key messages, the evidence, policy options compared and recommendations, cited to real research.',
    href: '/write?module=policy-brief', credits: '15 credits', phase1: false, marketing: null, landing: '/features/policy-brief', keywords: ['policy', 'government', 'options', 'brief'],
  },
  {
    id: 'annotated-bibliography', name: 'Annotated bibliography', hub: 'write',
    description: 'Real sources on your topic, each with a summary, an evaluation and why it matters.',
    href: '/write?module=annotated-bibliography', credits: '15 credits', phase1: false, marketing: null, landing: '/features/annotated-bibliography', keywords: ['annotations', 'sources', 'bibliography', 'apa'],
  },
  {
    id: 'reading-prep', name: 'Seminar reading prep', hub: 'write',
    description: 'Upload the week’s readings: each argument, its weak points, how they connect and questions for class.',
    href: '/write?module=reading-prep', credits: '3 credits per 10,000 words', phase1: false, marketing: null, landing: '/features/seminar-reading-prep', keywords: ['seminar', 'readings', 'discussion questions', 'course'],
  },
  {
    id: 'editor', name: 'Documents and editor', hub: 'write',
    description: 'Write with AI autocomplete that cites real papers, comments, tracked changes and live co-editing.',
    href: '/editor', credits: 'Autocomplete: 10 a day on Free', phase1: true, marketing: '/features/ai-writing-assistant', landing: null, keywords: ['editor', 'word', 'latex', 'autocomplete'],
  },
  {
    id: 'thesis-suite', name: 'Thesis Suite', hub: 'write', workspace: true,
    description: 'Similar papers, thesis outline, methodology builder, theoretical framework and defence preparation.',
    href: '/thesis', credits: '3 credits a module', phase1: false, marketing: '/tools/thesis-chapter-planner', landing: '/thesis-ai', keywords: ['ai thesis', 'dissertation', 'outline', 'methodology', 'defence', 'defense'],
  },
  {
    id: 'proposal-studio', name: 'Proposal Studio', hub: 'write', workspace: true,
    description: 'Research and grant proposals and ethics applications, section by section or in one run.',
    href: '/proposals', credits: '3 credits a section · 15 a full proposal', phase1: false, marketing: '/tools/research-proposal-generator', landing: '/features/proposal-studio', keywords: ['proposal', 'grant', 'ethics', 'irb'],
  },
  {
    id: 'thesis-to-manuscript', name: 'Thesis to manuscript', hub: 'write',
    description: 'Turn a thesis chapter into a journal article draft.',
    href: '/tools/thesis-to-manuscript', credits: '10 credits', phase1: true, marketing: '/tools/thesis-to-manuscript', landing: null, keywords: ['journal', 'article', 'publish'],
  },
  {
    id: 'slides', name: 'Slides', hub: 'write',
    description: 'A presentation from a research result or a document, exported to PowerPoint.',
    href: '/slides', credits: '10 credits', phase1: false, marketing: null, landing: '/features/research-slides', keywords: ['deck', 'presentation', 'powerpoint', 'defence'],
  },
  {
    id: 'abstract-generator', name: 'Abstract generator', hub: 'write',
    description: 'A structured abstract from your paper or notes.',
    href: '/tools/abstract-generator', credits: '3 credits', phase1: true, marketing: '/tools/abstract-generator', landing: null, keywords: ['abstract', 'summary'],
  },
  {
    id: 'humanizer', name: 'Text humanizer', hub: 'write',
    description: 'Rewrite stiff text in a natural, plain style that still sounds like you.',
    href: '/tools/humanizer', credits: '1 credit', phase1: true, marketing: '/tools/humanizer', landing: null, keywords: ['rewrite', 'natural', 'tone'],
  },
  {
    id: 'paraphraser', name: 'Paraphrasing tool', hub: 'write',
    description: 'Say a passage another way, keeping its meaning and citations.',
    href: '/tools/paraphrasing-tool', credits: '1 credit', phase1: true, marketing: '/tools/paraphrasing-tool', landing: null, keywords: ['paraphrase', 'rewrite'],
  },

  // ---------------------------------------------------------------- Review
  {
    id: 'reviewer', name: 'Reviewer', hub: 'review', workspace: true,
    description: 'A review of your thesis, proposal or manuscript at your level, with a scorecard and comments.',
    href: '/reviewer', credits: '10 credits per 10,000 words · High quality 30 · free preview 3', phase1: false, marketing: '/features/ai-peer-review', landing: null, keywords: ['peer review', 'feedback', 'thesis review'],
  },
  {
    id: 'guideline-check', name: 'Reporting-guideline check', hub: 'review',
    description: 'Check a manuscript against CONSORT, STROBE, PRISMA, CARE, STARD, COREQ, SRQR or SQUIRE, item by item, with the passage for each.',
    href: '/reviewer?module=guidelines', credits: '5 credits per 10,000 words', phase1: false, marketing: null, landing: '/features/reporting-guideline-checker', keywords: ['consort', 'strobe', 'prisma', 'care', 'stard', 'coreq', 'equator', 'checklist'],
  },
  {
    id: 'claim-check', name: 'Claim check', hub: 'review',
    description: 'Paste a claim or a paragraph and see which studies support it and which do not.',
    href: '/reviewer?module=claims', credits: '2 credits', phase1: false, marketing: '/features/citation-checker', landing: null, keywords: ['claims', 'evidence', 'support'],
  },
  {
    id: 'citation-check', name: 'Citation check', hub: 'review',
    description: 'Check that every reference exists, is not retracted and says what your sentence claims.',
    href: '/reviewer?module=citations', credits: '2 credits', phase1: false, marketing: '/features/citation-checker', landing: null, keywords: ['references', 'retracted', 'doi'],
  },
  {
    id: 'authorship-report', name: 'Authorship report', hub: 'review',
    description: 'Show a supervisor or journal how a document was written.',
    href: '/editor', credits: 'No credits', phase1: true, marketing: '/features/authorship-report', landing: null, keywords: ['ai use', 'integrity'],
  },
  {
    id: 'writing-checker', name: 'AI writing pattern check', hub: 'review',
    description: 'Highlights stock phrases and patterns in your text. It is not an AI detector and gives no score.',
    href: '/tools/ai-writing-checker', credits: 'No credits', phase1: true, marketing: '/tools/ai-writing-checker', landing: null, keywords: ['patterns', 'style'],
  },

  // ---------------------------------------------------------------- Systematic Review
  {
    id: 'systematic-review', name: 'Systematic Review', hub: 'systematic', workspace: true,
    description: 'Protocol, PubMed search, import, de-duplication, screening, agreement and the PRISMA flow diagram.',
    href: '/systematic-review', credits: 'No credits · AI screening 1 credit per 25 records', phase1: false, marketing: null, landing: '/features/systematic-review', keywords: ['prisma', 'screening', 'meta-analysis', 'scoping'],
  },

  // ---------------------------------------------------------------- Data
  {
    id: 'data-lab', name: 'Data Lab', hub: 'data', workspace: true,
    description: 'Upload a table: t-tests to logistic regression, survival curves, diagnostic accuracy, ROC, reliability and sample size, with R, Python and SPSS code.',
    href: '/data-lab', credits: 'Statistics free · AI write-up 2 credits', phase1: false, marketing: '/tools/data-analysis', landing: '/features/data-lab', keywords: ['statistics', 't-test', 'anova', 'chart', 'csv', 'logistic regression', 'survival', 'kaplan-meier', 'roc', 'sensitivity', 'cronbach', 'sample size', 'spss', 'r code'],
  },
  {
    id: 'surveys', name: 'Survey builder', hub: 'data', workspace: true,
    description: 'Questionnaires with validated scales (PHQ-9, GAD-7, SUS …), anonymous online responses, scoring and reliability in Data Lab.',
    href: '/surveys', credits: 'No credits · AI drafting 3 · AI check 2', phase1: false, marketing: null, landing: '/features/survey-builder', keywords: ['questionnaire', 'likert', 'survey', 'phq-9', 'gad-7', 'cronbach'],
  },
  {
    id: 'pdf-tools', name: 'PDF tools', hub: 'data',
    description: 'Merge, split, extract and rotate PDFs in your browser. Nothing is uploaded.',
    href: '/tools/pdf-tools', credits: 'No credits', phase1: true, marketing: '/tools/pdf-tools', landing: null, keywords: ['merge', 'split'],
  },
];

export const catalogItem = (id: string) => CATALOG.find((item) => item.id === id);

/** Who it is for: each audience's planned landing page and, until it exists, the closest live page. */
export const AUDIENCES = [
  { id: 'undergraduates', name: 'Undergraduates', text: 'Find sources, get cited answers and write essays and reports that hold up.', landing: '/for/undergraduates', now: '/tools/citation-generator', nowLabel: 'Citation generator' },
  { id: 'masters', name: 'Master’s students', text: 'Literature review chapters, thesis outlines and a review before you submit.', landing: '/for/masters', now: '/features/literature-review', nowLabel: 'Literature reviews' },
  { id: 'phd', name: 'PhD candidates', text: 'Systematic reviews, thesis chapters, journal articles and defence preparation.', landing: '/for/phd', now: '/features/ai-peer-review', nowLabel: 'AI peer review' },
  { id: 'academics', name: 'Academic staff and supervisors', text: 'Review students’ drafts, write grant proposals and keep up with your field.', landing: '/for/academics', now: '/tools/grant-proposal-writer', nowLabel: 'Grant proposals' },
  { id: 'medicine', name: 'Clinicians and medical researchers', text: 'PubMed and Europe PMC, filters by study type, and evidence you can weigh.', landing: '/for/medicine', now: '/features/paper-search', nowLabel: 'Paper search' },
  { id: 'industry', name: 'Industry and policy analysts', text: 'Research reports and briefs backed by papers, preprints and the web.', landing: '/for/industry', now: '/features/research-assistant', nowLabel: 'Research assistant' },
] as const;

export const FIELDS = ['Medicine', 'Life sciences', 'Data and computing', 'Engineering', 'Environmental studies', 'Social sciences', 'Humanities', 'Business'];
