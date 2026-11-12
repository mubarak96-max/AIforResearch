/**
 * The studio modules as data: Writing Studio, Thesis Suite, Proposal Studio and Slides. Each
 * module has its form, whether it searches papers first, what it costs and what it returns. Pure
 * and free of server imports, so the pages draw the forms from it and the server validates
 * against it (prompts live in studioModules.ts).
 */
import type { CreditAction } from './plans.js';

export type StudioWorkspace = 'write' | 'thesis' | 'proposals' | 'slides';
export type StudioTaskKind = 'writing' | 'thesis' | 'proposal' | 'slides';

export type StudioField = {
  name: string;
  label: string;
  kind: 'text' | 'textarea' | 'select';
  /** select: [value, label]; the first is the default. */
  options?: [string, string][];
  placeholder?: string;
  help?: string;
  max: number;
  min?: number;
  required?: boolean;
  /** A textarea that can be filled from an uploaded file (PDF, Word, Markdown, text). */
  upload?: boolean;
};

/**
 * - markdown: a cited text (streamed).
 * - compare: paragraph by paragraph, the original beside the revision (Improve document).
 * - slides: a deck as JSON (Slides).
 * - papers: a list of papers, no AI writing (Similar papers finder).
 */
export type StudioOutput = 'markdown' | 'compare' | 'slides' | 'papers';

export type StudioModule = {
  id: string;
  workspace: StudioWorkspace;
  label: string;
  short: string;
  fields: StudioField[];
  /** false: no search; 'single': one search; 'multi': the question split into several searches. */
  grounded: false | 'single' | 'multi';
  output: StudioOutput;
  /** The field the search and the task title come from. */
  topicField: string;
  /** The credits: an action from CREDIT_COSTS and how many units (words / 2,000 for rewrites). */
  cost: (inputs: Record<string, string>) => { action: CreditAction | null; units: number };
  /** Lets people choose length and headings. */
  lengthOption?: boolean;
};

export const STUDIO_KIND: Record<StudioWorkspace, StudioTaskKind> = { write: 'writing', thesis: 'thesis', proposals: 'proposal', slides: 'slides' };

export const STUDIO_WORKSPACES: Record<StudioWorkspace, { title: string; subtitle: string; path: string }> = {
  write: { title: 'Writing Studio', subtitle: 'Drafts with real citations, rewrites that keep your meaning, and templates to start from.', path: '/write' },
  thesis: { title: 'Thesis Suite', subtitle: 'From topic to defence: questions, outline, methodology, gaps, timeline and examiner questions.', path: '/thesis' },
  proposals: { title: 'Proposal Studio', subtitle: 'Research and grant proposals, ethics applications and data management plans.', path: '/proposals' },
  slides: { title: 'Slides', subtitle: 'A deck from your research, a document or a topic, ready for PowerPoint.', path: '/slides' },
};

/** Words in a text, for rewrite pricing. */
export const wordCount = (text: string) => (text.match(/\S+/g) || []).length;
/** One credit unit per 2,000 words, at least 1, at most 10 (a 20,000-word document). */
export const rewriteUnits = (text: string) => Math.min(10, Math.max(1, Math.ceil(wordCount(text) / 2000)));

const topic = (label: string, placeholder: string): StudioField => ({ name: 'topic', label, kind: 'text', placeholder, max: 400, min: 3, required: true });
const notes = (label = 'Anything to include (optional)', placeholder = 'Your angle, required points, data you have, word limits…'): StudioField => ({ name: 'notes', label, kind: 'textarea', placeholder, max: 6000 });
const text = (label: string, placeholder: string, max = 140_000, min = 40): StudioField => ({ name: 'text', label, kind: 'textarea', placeholder, max, min, required: true, upload: true });
const select = (name: string, label: string, options: [string, string][], help?: string): StudioField => ({ name, label, kind: 'select', options, max: 60, help });
const DEGREE = select('degree', 'Degree', [['masters', 'Master’s'], ['phd', 'PhD'], ['honours', 'Honours'], ['undergraduate', 'Undergraduate']]);

const fixed = (action: CreditAction) => () => ({ action, units: 1 });

export const STUDIO_MODULES: StudioModule[] = [
  // ---------------------------------------------------------------- Writing Studio
  {
    id: 'article', workspace: 'write', label: 'Article with evidence', short: 'An article or essay where every claim cites a real paper.',
    fields: [topic('Topic or thesis', 'e.g. Why sleep matters for learning'), select('audience', 'Written for', [['academic', 'An academic reader'], ['general', 'A general reader'], ['policy', 'Policy makers']]), notes()],
    grounded: 'multi', output: 'markdown', topicField: 'topic', cost: fixed('draft'), lengthOption: true,
  },
  {
    id: 'literature-review', workspace: 'write', label: 'Literature review', short: 'A review of the research on a topic, organised by theme, time or method.',
    fields: [topic('Topic', 'e.g. Sleep and memory consolidation in adults'), select('structure', 'Organise by', [['thematic', 'Theme'], ['chronological', 'Time (how the field developed)'], ['methodological', 'Method']]), notes('Scope (optional)', 'Population, years, settings, what to leave out…')],
    grounded: 'multi', output: 'markdown', topicField: 'topic', cost: fixed('draft'), lengthOption: true,
  },
  {
    id: 'paper', workspace: 'write', label: 'Research paper', short: 'A first draft in IMRaD: introduction, methods, results and discussion.',
    fields: [topic('Title or research question', 'e.g. Sleep quality and exam performance in first-year students'), { name: 'study', label: 'Your study (optional)', kind: 'textarea', placeholder: 'What you did and found: design, sample, measures, main results. Leave empty for a structure with placeholders.', max: 12_000, upload: true }, notes()],
    grounded: 'multi', output: 'markdown', topicField: 'topic', cost: fixed('draft'), lengthOption: true,
  },
  {
    id: 'section', workspace: 'write', label: 'Section writer', short: 'One section of a paper or thesis, grounded in the literature.',
    fields: [select('section', 'Section', [['introduction', 'Introduction'], ['literature', 'Literature review'], ['methods', 'Methods'], ['results', 'Results'], ['discussion', 'Discussion'], ['conclusion', 'Conclusion']]), topic('Topic of the paper', 'e.g. Remote work and team creativity'), { name: 'context', label: 'Your notes or data (optional)', kind: 'textarea', placeholder: 'Points to make, findings to discuss, the rest of your draft…', max: 20_000, upload: true }],
    grounded: 'single', output: 'markdown', topicField: 'topic', cost: fixed('section'), lengthOption: true,
  },
  {
    id: 'abstract', workspace: 'write', label: 'Abstract', short: 'A structured or unstructured abstract from your paper.',
    fields: [text('Your paper or summary', 'Paste the paper, or its main points, or upload the file.'), select('format', 'Format', [['structured', 'Structured (Background, Methods, Results, Conclusions)'], ['unstructured', 'One paragraph']]), select('words', 'Length', [['250', 'About 250 words'], ['150', 'About 150 words'], ['300', 'About 300 words']])],
    grounded: false, output: 'markdown', topicField: 'text', cost: fixed('section'),
  },
  {
    id: 'improve', workspace: 'write', label: 'Improve document', short: 'Proofread, clarify, expand or restructure; your original stays beside each change.',
    fields: [text('Your text', 'Paste your draft or upload the file.'), select('goal', 'What to do', [['proofread', 'Proofread (grammar, spelling, punctuation)'], ['clarity', 'Make it clearer and tighter'], ['expand', 'Expand thin paragraphs'], ['shorten', 'Shorten'], ['restructure', 'Improve the flow between paragraphs'], ['formal', 'More formal, academic tone'], ['plain', 'Simpler, plainer language']]), notes('Instructions (optional)', 'e.g. Keep British spelling; do not change the quotations.')],
    grounded: false, output: 'compare', topicField: 'text', cost: (inputs) => ({ action: 'ai_edit', units: rewriteUnits(inputs.text || '') }),
  },
  {
    id: 'paraphrase', workspace: 'write', label: 'Paraphrase', short: 'Rewrite a passage in your own natural style, keeping its meaning and citations.',
    fields: [text('Text to paraphrase', 'Paste the passage.', 40_000, 20), select('strength', 'How much to change', [['standard', 'Standard'], ['light', 'Light: keep the structure'], ['strong', 'Strong: new sentence structure']])],
    grounded: false, output: 'markdown', topicField: 'text', cost: (inputs) => ({ action: 'ai_edit', units: rewriteUnits(inputs.text || '') }),
  },

  // ---------------------------------------------------------------- Thesis Suite
  {
    id: 'similar', workspace: 'thesis', label: 'Similar papers', short: 'Papers like yours, from a title or abstract. No credits.',
    fields: [text('Your title or abstract', 'Paste the title or abstract of your thesis or a key paper.', 6000, 8)],
    grounded: false, output: 'papers', topicField: 'text', cost: () => ({ action: null, units: 0 }),
  },
  {
    id: 'question', workspace: 'thesis', label: 'Research question', short: 'A focused, researchable question checked against FINER, PICO or PICOT.',
    fields: [topic('Your topic or draft question', 'e.g. Does mindfulness help nurses with burnout?'), select('framework', 'Framework', [['finer', 'FINER (feasible, interesting, novel, ethical, relevant)'], ['pico', 'PICO (population, intervention, comparison, outcome)'], ['picot', 'PICOT (adds time)'], ['spider', 'SPIDER (qualitative)']]), notes('Context (optional)', 'Your field, setting, time and resources.')],
    grounded: 'single', output: 'markdown', topicField: 'topic', cost: fixed('section'),
  },
  {
    id: 'hypothesis', workspace: 'thesis', label: 'Hypotheses', short: 'Testable hypotheses with their variables, from your question and the literature.',
    fields: [topic('Research question', 'e.g. How does screen time affect sleep in teenagers?'), notes()],
    grounded: 'single', output: 'markdown', topicField: 'topic', cost: fixed('section'),
  },
  {
    id: 'outline', workspace: 'thesis', label: 'Thesis outline', short: 'Chapters, sections and a word budget per chapter, ready to open in the editor.',
    fields: [topic('Thesis topic or title', 'e.g. Community health workers and maternal outcomes in rural Kenya'), DEGREE,
      select('words', 'Total length', [['20000', '20,000 words'], ['10000', '10,000 words'], ['40000', '40,000 words'], ['80000', '80,000 words'], ['100000', '100,000 words']]),
      select('structure', 'Structure', [['traditional', 'Traditional (introduction, literature, methods, results, discussion)'], ['publication', 'Thesis by publication'], ['humanities', 'Humanities (argument-led chapters)']]), notes()],
    grounded: 'single', output: 'markdown', topicField: 'topic', cost: fixed('section'),
  },
  {
    id: 'methodology', workspace: 'thesis', label: 'Methodology builder', short: 'Design, sampling, instruments, analysis, validity and ethics for your question.',
    fields: [topic('Research question', 'e.g. What explains low uptake of solar irrigation among smallholders?'), select('design', 'Approach', [['auto', 'Suggest one for me'], ['quantitative', 'Quantitative'], ['qualitative', 'Qualitative'], ['mixed', 'Mixed methods']]), notes('Context (optional)', 'Population, setting, time, budget, data you can get.')],
    grounded: 'single', output: 'markdown', topicField: 'topic', cost: fixed('section'),
  },
  {
    id: 'framework', workspace: 'thesis', label: 'Theoretical framework', short: 'Theories that fit your study, their constructs and how your variables relate.',
    fields: [topic('Topic or question', 'e.g. Why do employees resist new hospital software?'), notes()],
    grounded: 'single', output: 'markdown', topicField: 'topic', cost: fixed('section'),
  },
  {
    id: 'gaps', workspace: 'thesis', label: 'Research gaps', short: 'Open questions in a field, each with its reason, sources and a confidence level.',
    fields: [topic('Field or topic', 'e.g. Microplastics in freshwater fish'), notes()],
    grounded: 'multi', output: 'markdown', topicField: 'topic', cost: fixed('section'),
  },
  {
    id: 'timeline', workspace: 'thesis', label: 'Research timeline', short: 'Phases, milestones and risks over the months you have.',
    fields: [topic('Project', 'e.g. PhD on drought resilience, fieldwork in year 2'), select('months', 'Time available', [['12', '12 months'], ['6', '6 months'], ['18', '18 months'], ['24', '24 months'], ['36', '36 months'], ['48', '48 months']]), { name: 'start', label: 'Start (optional)', kind: 'text', placeholder: 'e.g. January 2027', max: 40 }, notes('Fixed dates (optional)', 'Ethics approval, fieldwork window, submission deadline…')],
    grounded: false, output: 'markdown', topicField: 'topic', cost: fixed('section'),
  },
  {
    id: 'defence', workspace: 'thesis', label: 'Defence preparation', short: 'Likely examiner questions, chapter by chapter, with how to answer them.',
    fields: [text('Your thesis or its abstract', 'Upload the thesis (PDF or Word) or paste the abstract and chapter summaries.', 140_000, 80), notes('About the defence (optional)', 'Examiners’ fields, known weak points, format and length.')],
    grounded: false, output: 'markdown', topicField: 'text', cost: fixed('section'),
  },
  {
    id: 'auto-proposal', workspace: 'thesis', label: 'Autonomous proposal', short: 'One run: refines your question, searches the literature and writes the full proposal.',
    fields: [topic('Your idea', 'e.g. The effect of school feeding on attendance in Malawi'), DEGREE, notes()],
    grounded: 'multi', output: 'markdown', topicField: 'topic', cost: fixed('draft'),
  },

  // ---------------------------------------------------------------- Proposal Studio
  {
    id: 'research-proposal', workspace: 'proposals', label: 'Research proposal', short: 'Aims, background, significance, methods, timeline and budget outline.',
    fields: [topic('Topic or working title', 'e.g. Telehealth follow-up after heart surgery'), DEGREE,
      select('part', 'Write', [['whole', 'The whole proposal'], ['aims', 'Title, aims and objectives'], ['background', 'Background and significance'], ['literature', 'Literature review'], ['methods', 'Methods'], ['timeline', 'Timeline'], ['budget', 'Budget outline'], ['ethics', 'Ethical considerations']]), notes()],
    grounded: 'multi', output: 'markdown', topicField: 'topic', cost: (inputs) => ({ action: (inputs.part || 'whole') === 'whole' ? 'draft' : 'section', units: 1 }),
  },
  {
    id: 'grant', workspace: 'proposals', label: 'Grant proposal', short: 'A proposal in your funder’s format, from the call and your idea.',
    fields: [select('funder', 'Funder format', [['generic', 'Generic'], ['nih', 'NIH (Specific Aims and Research Strategy)'], ['nsf', 'NSF (Project Description)'], ['erc', 'ERC (Extended Synopsis)'], ['wellcome', 'Wellcome']]),
      topic('Project idea', 'e.g. Low-cost sensors for early flood warning in informal settlements'),
      { name: 'call', label: 'The call (optional)', kind: 'textarea', placeholder: 'Paste the funding call, its criteria and limits.', max: 30_000, upload: true },
      select('part', 'Write', [['whole', 'The whole proposal'], ['summary', 'Summary or specific aims'], ['significance', 'Significance and innovation'], ['approach', 'Approach and work plan'], ['impact', 'Impact and dissemination'], ['budget', 'Budget justification']]), notes()],
    grounded: 'multi', output: 'markdown', topicField: 'topic', cost: (inputs) => ({ action: (inputs.part || 'whole') === 'whole' ? 'draft' : 'section', units: 1 }),
  },
  {
    id: 'ethics', workspace: 'proposals', label: 'Ethics application', short: 'An ethics board or IRB application: risks, consent, data protection.',
    fields: [{ name: 'topic', label: 'Your study', kind: 'textarea', placeholder: 'Aim, design, who takes part, how they are recruited, what they do, what data you collect.', max: 12_000, min: 40, required: true, upload: true },
      select('board', 'Board', [['generic', 'Generic ethics committee'], ['irb', 'US IRB'], ['rec', 'UK Research Ethics Committee'], ['hrec', 'Australian HREC']]),
      select('risk', 'Participants', [['adults', 'Adults, low risk'], ['vulnerable', 'Children or vulnerable groups'], ['patients', 'Patients or clinical data'], ['online', 'Online or secondary data']])],
    grounded: false, output: 'markdown', topicField: 'topic', cost: fixed('draft'),
  },
  {
    id: 'dmp', workspace: 'proposals', label: 'Data management plan', short: 'How data is collected, stored, shared and kept, in your funder’s format.',
    fields: [{ name: 'topic', label: 'Your project', kind: 'textarea', placeholder: 'What data you collect or reuse, its formats and size, and any personal data.', max: 12_000, min: 30, required: true, upload: true },
      select('funder', 'Format', [['generic', 'Generic'], ['nih', 'NIH Data Management and Sharing Plan'], ['nsf', 'NSF'], ['horizon', 'Horizon Europe'], ['ukri', 'UKRI']])],
    grounded: false, output: 'markdown', topicField: 'topic', cost: fixed('section'),
  },

  // ---------------------------------------------------------------- Slides
  {
    id: 'slides', workspace: 'slides', label: 'Slide deck', short: 'Slides with speaker notes from a topic, a document or a research result.',
    fields: [
      { name: 'topic', label: 'Topic or title', kind: 'text', placeholder: 'e.g. Sleep and memory: what the evidence says', max: 400, min: 3, required: true },
      { name: 'text', label: 'Content (optional)', kind: 'textarea', placeholder: 'Paste the paper, thesis chapter or notes the slides are made from, or upload a file. Leave empty to build from the literature.', max: 140_000, upload: true },
      select('preset', 'Kind of talk', [['research', 'Research talk'], ['defence', 'Thesis defence'], ['conference', 'Conference presentation (12–15 minutes)'], ['journal', 'Journal club'], ['lecture', 'Lecture']]),
      select('count', 'Slides', [['12', 'About 12'], ['8', 'About 8'], ['16', 'About 16'], ['20', 'About 20']]),
    ],
    grounded: 'single', output: 'slides', topicField: 'topic', cost: fixed('slides'),
  },
];

export const studioModule = (id: string) => STUDIO_MODULES.find((module) => module.id === id) ?? null;
export const workspaceModules = (workspace: StudioWorkspace) => STUDIO_MODULES.filter((module) => module.workspace === workspace);

/** Credits for a run, given the price list (CREDIT_COSTS, or the `costs` of /api/billing/credits). */
export function studioCredits(module: StudioModule, inputs: Record<string, string>, costs: Record<string, number>, highQuality = false): number {
  const { action, units } = module.cost(inputs);
  if (!action) return 0;
  return (costs[action] ?? 0) * Math.max(1, units) * (highQuality ? 3 : 1);
}

/** Starting documents for the editor: headings and short prompts, no AI. */
export const TEMPLATES: { id: string; label: string; short: string; sections: [string, string][] }[] = [
  { id: 'imrad', label: 'Research paper (IMRaD)', short: 'Title, abstract, introduction, methods, results, discussion.', sections: [['Abstract', 'Background, aim, methods, results and conclusion in 150–250 words.'], ['Introduction', 'The problem, what is known, the gap, and your aim.'], ['Methods', 'Design, participants or data, measures, procedure and analysis.'], ['Results', 'What you found, in the order of your aims. Tables and figures here.'], ['Discussion', 'What the results mean, how they fit the literature, limits, and implications.'], ['Conclusion', 'The answer to your question in a few sentences.'], ['References', '']] },
  { id: 'literature-review', label: 'Literature review', short: 'Introduction, search approach, themes, gaps, conclusion.', sections: [['Introduction', 'The topic, why it matters, and the scope of the review.'], ['How the literature was found', 'Databases, search terms, years and inclusion criteria.'], ['Theme 1', 'What studies show, where they agree and disagree.'], ['Theme 2', ''], ['Theme 3', ''], ['Gaps and future research', 'What is not yet known.'], ['Conclusion', ''], ['References', '']] },
  { id: 'thesis-chapter', label: 'Thesis chapter', short: 'Chapter introduction, sections, summary.', sections: [['Chapter introduction', 'What this chapter does and how it links to the previous one.'], ['Section 1', ''], ['Section 2', ''], ['Section 3', ''], ['Chapter summary', 'The main points and how they lead to the next chapter.']] },
  { id: 'research-proposal', label: 'Research proposal', short: 'Aims, background, methods, timeline, budget, ethics.', sections: [['Title', ''], ['Aims and objectives', 'The research question and 2–4 objectives.'], ['Background and significance', 'Why this matters and what is known.'], ['Literature review', ''], ['Methods', 'Design, sample, data collection, analysis.'], ['Timeline', 'Phases and milestones.'], ['Budget', ''], ['Ethical considerations', ''], ['References', '']] },
  { id: 'grant', label: 'Grant proposal', short: 'Summary, aims, significance, approach, impact, budget.', sections: [['Summary', 'The project in 200 words for a non-specialist reviewer.'], ['Aims', ''], ['Significance and innovation', ''], ['Approach and work plan', 'Work packages, methods, milestones, risks and mitigations.'], ['Team', ''], ['Impact and dissemination', ''], ['Budget justification', ''], ['References', '']] },
  { id: 'conference-abstract', label: 'Conference abstract', short: 'Background, methods, results, conclusions in 250–300 words.', sections: [['Title', ''], ['Background', ''], ['Methods', ''], ['Results', ''], ['Conclusions', '']] },
  { id: 'poster', label: 'Poster text', short: 'Short blocks for a research poster.', sections: [['Title and authors', ''], ['Introduction', '3–4 sentences.'], ['Methods', 'A short list or diagram.'], ['Results', 'Your key figure and 2–3 findings.'], ['Conclusions', '2–3 bullet points.'], ['References and contact', '']] },
];
