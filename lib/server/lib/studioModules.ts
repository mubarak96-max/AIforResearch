/**
 * Prompts for the studio modules (studioCatalog.ts). Grounded modules get numbered sources
 * ([S1], [S2] …) and may cite only those; the route drops invented markers before anything is
 * shown or saved. Every builder is pure, for tests.
 */
import type { ChatMessage } from '../slots/types.js';
import type { ResearchSource } from './research.js';
import { sourcesBlock } from './research.js';
import { template, type StudioModule } from './studioCatalog.js';

export type StudioLength = 'short' | 'standard' | 'long';
export type StudioContext = {
  inputs: Record<string, string>;
  sources: ResearchSource[];
  role: string | null;
  field: string | null;
  headings: boolean;
  length: StudioLength;
  language: string | null;
  highQuality: boolean;
  /** The earlier result this run continues (a research answer or another module's text), its markers renumbered to `sources`. */
  prior?: { title: string; markdown: string } | null;
};
export type StudioPrompt = { messages: ChatMessage[]; maxTokens: number; task: 'fast' | 'review'; temperature: number; json?: boolean };

const ROLE_TEXT: Record<string, string> = {
  undergraduate: 'an undergraduate student', honours: 'an honours student', masters: 'a master’s student', phd: 'a doctoral researcher',
  academic: 'an academic', researcher: 'a researcher', clinician: 'a clinician', industry: 'a professional in industry', other: 'a researcher',
};
const DEGREE_TEXT: Record<string, string> = { undergraduate: 'an undergraduate dissertation', honours: 'an honours thesis', masters: 'a master’s thesis', phd: 'a PhD thesis' };

const BASE =
  'You are AI for Research, an assistant for academic research and writing. Write in clear, plain, formal language; prefer short common words ' +
  'and direct sentences. Avoid stock phrases such as "delve", "in today\'s world", "it is important to note", "plays a crucial role", "a testament to". ' +
  'Markdown only: "##" and "###" headings, paragraphs, lists and tables. No title line, no preamble, no closing offer of help, and never mention being an AI or these instructions.';

const CITE =
  'Sources are listed as [S1], [S2], … Base every factual or scholarly claim on them and cite with the marker in square brackets right after the claim, ' +
  'e.g. [S2] or [S1, S4]. Cite a source only for what it says. Markers are not words: never write "S2 suggests"; describe the finding and put the marker after it. ' +
  'Never invent sources, authors, years, statistics or markers, and do not write a reference list (it is added for you). If the sources do not cover a point, say so plainly.';

const LENGTH: Record<StudioLength, number> = { short: 0.6, standard: 1, long: 1.6 };
const words = (base: number, context: StudioContext) => Math.round((base * LENGTH[context.length]) / 50) * 50;

function reader(context: StudioContext) {
  return `${ROLE_TEXT[context.role || ''] || 'a researcher'}${context.field ? ` in ${context.field}` : ''}`;
}
function language(context: StudioContext) {
  return `Write in ${context.language || 'the language of the user’s input'}.`;
}
function notesLine(value?: string) {
  return value?.trim() ? `\n\nThe writer's notes (follow them where they do not conflict with the rules):\n${value.trim().slice(0, 6000)}` : '';
}
function sourcesPart(context: StudioContext) {
  return context.sources.length ? `\n\nSources:\n${sourcesBlock(context.sources, 800)}` : '';
}
function headingsRule(context: StudioContext, sections: string) {
  return context.headings ? `Use these sections as "##" headings: ${sections}.` : 'Write flowing paragraphs without headings, in this order of content: ' + sections + '.';
}

type Builder = (context: StudioContext) => { user: string; maxTokens: number; grounded?: boolean; json?: boolean; task?: 'fast' | 'review'; system?: string };

const BUILDERS: Record<string, Builder> = {
  // ---------------------------------------------------------------- Writing Studio
  article: (c) => ({
    user: `Write an article of about ${words(1200, c)} words on "${c.inputs.topic}" for ${{ general: 'a general reader', policy: 'policy makers', academic: 'an academic reader' }[c.inputs.audience] ?? 'an academic reader'}. ${headingsRule(c, 'an opening that states the argument, 3–5 themed sections, and a conclusion')}${notesLine(c.inputs.notes)}`,
    maxTokens: 4200, grounded: true,
  }),
  'literature-review': (c) => ({
    user: `Write a literature review of about ${words(1800, c)} words on "${c.inputs.topic}" for ${reader(c)}, organised ${{ chronological: 'chronologically, showing how the field developed', methodological: 'by research method, comparing what each kind of study shows' }[c.inputs.structure] ?? 'by theme, with one "###" subsection per theme'}. ` +
      `${headingsRule(c, 'Introduction (scope and why it matters), the body sections, Gaps in the literature, Conclusion')} Compare and connect studies; do not summarise them one by one.${notesLine(c.inputs.notes)}`,
    maxTokens: 6000, grounded: true,
  }),
  paper: (c) => ({
    user: `Write a first draft of a research paper titled or asking "${c.inputs.topic}", about ${words(2500, c)} words, in IMRaD. ${headingsRule(c, 'Abstract, Introduction, Methods, Results, Discussion, Conclusion')} ` +
      (c.inputs.study?.trim()
        ? `Base Methods and Results only on the writer's study below; never invent data, numbers or participants.\n\nThe writer's study:\n${c.inputs.study.trim().slice(0, 12000)}`
        : 'The writer has not given their study: in Methods and Results write clear placeholders in [square brackets] for what they must fill in (design, sample, measures, findings); never invent data.') +
      notesLine(c.inputs.notes),
    maxTokens: 7000, grounded: true,
  }),
  section: (c) => ({
    user: `Write the ${c.inputs.section || 'introduction'} section of a paper or thesis on "${c.inputs.topic}", about ${words(900, c)} words, for ${reader(c)}. ` +
      ({ introduction: 'Move from the broad problem to what is known, the gap, and the aim.', literature: 'Synthesise the studies by theme.', methods: 'Describe a sound method; use [placeholders] where the writer must add their details.', results: 'Report only results the writer gave; use [placeholders] otherwise.', discussion: 'Interpret the findings against the literature, then limitations and implications.', conclusion: 'Answer the question, state the contribution and next steps.' }[c.inputs.section] ?? '') +
      (c.headings ? ' Use "###" subheadings where they help.' : ' No headings.') +
      (c.inputs.context?.trim() ? `\n\nThe writer's notes, data or draft:\n${c.inputs.context.trim().slice(0, 20000)}` : ''),
    maxTokens: 3200, grounded: true,
  }),
  abstract: (c) => ({
    system: `${BASE} Use only what the writer's text says; never add results or numbers it does not contain.`,
    user: `Write ${c.inputs.format === 'unstructured' ? 'a one-paragraph abstract' : 'a structured abstract with bold labels Background, Methods, Results and Conclusions'} of about ${c.inputs.words || '250'} words for this paper. Then add a line "**Keywords:**" with 5 keywords.\n\nThe paper:\n${(c.inputs.text || '').slice(0, 60000)}`,
    maxTokens: 900,
  }),
  template: (c) => {
    const chosen = template(c.inputs.template) ?? template('imrad')!;
    const sections = chosen.sections.filter(([heading]) => !/^references/i.test(heading));
    const base = chosen.id === 'conference-abstract' ? 300 : chosen.id === 'poster' ? 700 : chosen.id === 'thesis-chapter' ? 2500 : 2000;
    return {
      user: `Write a complete ${chosen.label.toLowerCase()} on "${c.inputs.topic}", about ${words(base, c)} words, for ${reader(c)}. ` +
        `Use exactly these sections as "##" headings, in this order, and write real content under each (never leave a section empty or repeat the guidance):\n` +
        sections.map(([heading, hint]) => `- ${heading}${hint ? `: ${hint}` : ''}`).join('\n') +
        '\nWhere a section needs facts only the writer has (their own data, sample, results, team, amounts, dates), write a clear [placeholder] in square brackets instead of inventing them. ' +
        'Generic section names such as "Theme 1" or "Section 1" should be replaced by a heading that names the theme.' + notesLine(c.inputs.notes),
      maxTokens: chosen.id === 'conference-abstract' ? 1200 : chosen.id === 'poster' ? 2000 : 6500, grounded: true,
    };
  },
  paraphrase: (c) => ({
    system: `${BASE} Keep the meaning, every fact, number, name, quotation and citation exactly; change only the wording. Keep the paragraph breaks.`,
    user: `Paraphrase this text in a natural, human style${{ light: ', keeping the sentence structure close', strong: ' with new sentence structures' }[c.inputs.strength] ?? ''}. Return only the paraphrase.\n\n${(c.inputs.text || '').slice(0, 40000)}`,
    maxTokens: Math.min(12000, Math.ceil(((c.inputs.text || '').length / 3.5) * 1.3) + 200),
  }),

  // ---------------------------------------------------------------- Writing Studio: deliverables
  'case-report': (c) => {
    const format = c.inputs.journal || 'standard';
    const size = format === 'poster' ? 'a conference abstract of about 300 words with the labels Introduction, Case presentation, Discussion and Conclusion'
      : format === 'short' ? 'a short case report of about 600 words with the headings Introduction, Case presentation, Discussion and Learning points'
        : `a case report of about ${words(1500, c)} words in the CARE structure, with these "##" headings: Abstract (labelled Introduction, Case presentation, Diagnoses and interventions, Outcomes, Conclusion), Keywords, Introduction, Patient information, Clinical findings, Timeline (a table: day, event), Diagnostic assessment (including the diagnoses considered), Therapeutic intervention, Follow-up and outcomes, Discussion, Learning points, Patient perspective, Informed consent`;
    return {
      system: `${BASE} You write clinical case reports for ${reader(c)}. ${language(c)} Every clinical detail (history, findings, results, doses, outcomes) must come from the case notes given; never add, round or change one. ` +
        'Where a CARE item is not in the notes (such as the patient’s perspective, consent, a dose, a follow-up result), write a [placeholder] saying what to add. ' +
        'Keep the patient de-identified: no names, initials, exact dates, hospital names or rare identifying details; if the notes contain any, leave them out and add a line at the end, "**Check before submission:** identifiers removed: …". ' +
        'Use the sources only in the Introduction and Discussion, to set the case in context; never present a source’s finding as part of this case.',
      user: `Write ${size}, on: "${c.inputs.topic}". Start with a "**Title:**" line containing the words "case report".` +
        `\n\nThe case notes:\n${(c.inputs.case || '').slice(0, 20000)}${notesLine(c.inputs.notes)}`,
      maxTokens: format === 'standard' ? 4200 : 1800, grounded: true,
    };
  },
  'clinical-audit': (c) => {
    const report = c.inputs.stage === 'report';
    const standard = c.inputs.standard?.trim() ? `\n\nThe standard, as the writer gives it:\n${c.inputs.standard.trim().slice(0, 6000)}` : '\n\nNo standard was given: base it on the sources, citing them, and say clearly that the team must confirm it against their local guideline.';
    return {
      user: (report
        ? `Write the report of a completed clinical audit on "${c.inputs.topic}". ${headingsRule(c, 'Summary, Background, Standard and criteria (a table: criterion | target | exceptions | source), Method (sample, period, data source, data collection), Results (a table: criterion | target | achieved n/N (%) | met or not met), Discussion (why practice differed from the standard), Action plan (a table: action | owner | deadline), Re-audit (when and how the cycle will be closed)')} ` +
          'Use only the results the writer gives below, exactly; compute nothing new except a percentage from a count they give; where a number is missing write a [placeholder]. Never invent results.'
        : `Write the plan for a clinical audit on "${c.inputs.topic}". ${headingsRule(c, 'Title, Background and rationale, Aim and objectives, Standard (its source and wording), Criteria and targets (a table: criterion | target % | exceptions | how it is measured), Sample and period (with a sample size that is realistic for an audit), Data collection (a data collection form as a table of fields: field | how recorded | allowed values), Analysis, Dissemination and action, Re-audit, Approvals (audit registration with the clinical governance or audit department; research ethics is usually not needed for audit, but the team must follow local policy)')} ` +
          'Write [placeholders] for local details the writer must add (team, ward, dates).') +
        standard +
        (report && c.inputs.results?.trim() ? `\n\nThe writer's data and results:\n${c.inputs.results.trim().slice(0, 20000)}` : report ? '\n\nThe writer gave no results: put [placeholders] in every result cell.' : '') +
        notesLine(c.inputs.notes),
      maxTokens: report ? 4500 : 3800, grounded: true,
    };
  },
  'evaluation-report': (c) => {
    const criteria: Record<string, string> = {
      dac: 'one "###" subsection per OECD-DAC criterion: Relevance, Coherence, Effectiveness, Efficiency, Impact, Sustainability; under each, a short judgement and the evidence for it',
      questions: 'one "###" subsection per evaluation question in the notes (or, if none are given, per main programme objective), each with the answer and the evidence',
      logframe: 'subsections for Outputs, Outcomes and Impact, each with a table: indicator | baseline | target | achieved | comment, then the explanation',
    };
    return {
      system: `${BASE} You write programme evaluation reports for ${reader(c)} and the people who commissioned the evaluation. ${language(c)} ` +
        'Judgements must follow from the evidence given; say where evidence is weak or missing. Never invent data, indicator values, quotations, people consulted or sample sizes: use the writer’s material exactly, and write [placeholders] for what is missing. ' +
        'Use plain, direct language; findings and recommendations should be specific enough to act on.',
      user: `Write an evaluation report of about ${words(2500, c)} words for "${c.inputs.topic}". ${headingsRule(c, `Executive summary (one page: purpose, method in brief, main findings, main recommendations), Background and programme description, Evaluation purpose, scope and questions, Methodology (design, data sources, sampling, analysis, limitations and ethics), Findings (${criteria[c.inputs.framework] ?? criteria.dac}), Conclusions, Recommendations (a numbered table: recommendation | addressed to | priority | timeframe), Lessons learned, Annexes (a list of what should be attached)`)}` +
        `\n\nAbout the programme:\n${(c.inputs.description || '').slice(0, 20000)}` +
        (c.inputs.findings?.trim() ? `\n\nThe evaluation's data and findings:\n${c.inputs.findings.trim().slice(0, 40000)}` : '\n\nNo findings were given: write the structure with [placeholders] for every finding, and note what evidence each criterion needs.') +
        notesLine(c.inputs.notes),
      maxTokens: 6500,
    };
  },
  'policy-brief': (c) => {
    const audience: Record<string, string> = { government: 'government officials and ministers', legislators: 'legislators and their staff', agency: 'staff of an agency or international organisation', ngo: 'NGOs and advocates', public: 'the general public' };
    const recommend = c.inputs.stance === 'recommend';
    return {
      user: `Write a policy brief of about ${words(1500, c)} words on "${c.inputs.topic}" for ${audience[c.inputs.audience] ?? audience.government}${c.inputs.context?.trim() ? `, for ${c.inputs.context.trim().slice(0, 200)}` : ''}. ` +
        `${headingsRule(c, `Key messages (3–5 bullet points a busy reader can act on), The problem, What the evidence says, Policy options (a table: option | expected benefits | costs and risks | strength of evidence | what implementing it takes), ${recommend ? 'Recommendation (the option the evidence best supports, and why)' : 'Weighing the options (trade-offs, without choosing one)'}, Implementation considerations (feasibility, cost, equity, who must act), Evidence gaps`)} ` +
        'Write for a non-specialist: short paragraphs, no jargon, numbers only from the sources or the writer. Say how strong and how transferable the evidence is; research from other settings may not apply directly. ' +
        `Where local facts are needed (current policy, local figures, budgets) and not given, write a [placeholder].${notesLine(c.inputs.notes)}`,
      maxTokens: 4200, grounded: true,
    };
  },
  'annotated-bibliography': (c) => {
    const size = { short: 60, long: 200 }[c.inputs.size] ?? 120;
    const kind: Record<string, string> = {
      descriptive: 'a descriptive annotation: what the source does, its method and main findings',
      critical: 'a critical annotation: its argument or findings in brief, then the strengths and weaknesses of its method, evidence and reasoning',
      combined: 'an annotation in three parts: a summary (aim, method, main findings), an evaluation (strengths and weaknesses), and its relevance to the topic',
    };
    return {
      user: `Write an annotated bibliography on "${c.inputs.topic}" for ${reader(c)}. Start with a "## Introduction" paragraph on the scope and how the sources relate. ` +
        `Then a "## Annotations" section with one entry for each relevant source (at least 8, ordered by theme or importance): a "###" heading that is the source's title exactly as listed, then ${kind[c.inputs.kind] ?? kind.combined}, about ${size} words, ending with the source's marker, e.g. [S4]. ` +
        'Annotate only what the source listing shows (its abstract and details); if only the title is known, say so and skip that source. Skip sources that do not fit the topic. End with "## Gaps", two or three sentences on what these sources leave open.' +
        notesLine(c.inputs.notes),
      maxTokens: 6500, grounded: true,
    };
  },
  'reading-prep': (c) => {
    const depth = c.inputs.depth || 'standard';
    return {
      system: `${BASE} You help ${reader(c)} prepare for a seminar. ${language(c)} Work only from the readings given: summarise, analyse and question them; never attribute to them anything they do not say, and never invent page numbers. ` +
        'When you point to a passage, name its section or quote a few words of it.',
      user: `Prepare me for a seminar on these readings. ${headingsRule(c, `At a glance (a table: reading | main claim | evidence or method | key concepts), Reading by reading (a "###" subsection per reading: the argument in ${depth === 'quick' ? '2–3' : '4–6'} sentences, key terms defined, the strongest evidence, and weak points or assumptions to question), How the readings connect (agreements, tensions, what one adds to another)${depth === 'deep' ? ', Counter-arguments (the best objection to each main claim and how its author might reply)' : ''}, Discussion questions (${depth === 'quick' ? 3 : 6} open questions, each with what it tests), Points to raise (3 contributions I could make in class, each tied to a passage)`)}` +
        `${notesLine(c.inputs.notes)}\n\nThe readings:\n${(c.inputs.text || '').slice(0, 140000)}`,
      maxTokens: depth === 'deep' ? 6000 : depth === 'quick' ? 2500 : 4500,
    };
  },

  // ---------------------------------------------------------------- Thesis Suite
  question: (c) => ({
    user: `Refine this topic or draft question into a focused, researchable question for ${reader(c)}: "${c.inputs.topic}". ` +
      `${c.headings ? 'Use sections' : 'Cover, in order'}: ## The refined question (one sentence, bold), ## How it meets ${({ pico: 'PICO', picot: 'PICOT', spider: 'SPIDER' } as Record<string, string>)[c.inputs.framework] ?? 'FINER'} (a table: element | your study), ## Three alternative versions (narrower, broader, different angle), ## What the literature says about it (cited), ## Sub-questions (3–4).${notesLine(c.inputs.notes)}`,
    maxTokens: 2200, grounded: true,
  }),
  hypothesis: (c) => ({
    user: `Write 3–5 testable hypotheses for "${c.inputs.topic}". For each, a "###" heading with the hypothesis in one sentence, then **Variables:** (independent, dependent, controls), **Expected direction and why:** (cited), **How to test it:** (design and statistic), **Null hypothesis:**. End with ## Which to choose, in 2–3 sentences.${notesLine(c.inputs.notes)}`,
    maxTokens: 2600, grounded: true,
  }),
  outline: (c) => ({
    user: `Create an outline for ${DEGREE_TEXT[c.inputs.degree] ?? 'a thesis'} on "${c.inputs.topic}", ${Number(c.inputs.words || 20000).toLocaleString('en-US')} words in total, ${{ publication: 'as a thesis by publication (introduction, 3–4 paper chapters, synthesis)', humanities: 'as argument-led chapters' }[c.inputs.structure] ?? 'in the traditional structure'}. ` +
      'Start with ## Working title and ## Research question and objectives. Then ## Chapters: one "###" per chapter with its purpose in one sentence and its sections as a bulleted list, citing sources where a chapter builds on them. ' +
      `Then ## Word budget: a table Chapter | Words | Share, whose words add up to ${Number(c.inputs.words || 20000).toLocaleString('en-US')}. End with ## Next steps (3 bullets).${notesLine(c.inputs.notes)}`,
    maxTokens: 3600, grounded: true,
  }),
  methodology: (c) => ({
    user: `Build a methodology for this research question for ${reader(c)}: "${c.inputs.topic}". Approach: ${{ quantitative: 'quantitative', qualitative: 'qualitative', mixed: 'mixed methods' }[c.inputs.design] ?? 'choose the best fit and say why'}. ` +
      `${headingsRule(c, 'Research design and why, Population and sampling (with a sample size rationale), Data collection and instruments, Variables or concepts and how they are measured, Analysis plan (named tests or analytic approach), Validity and reliability (or trustworthiness), Ethics, Limitations')}. Cite methodological sources and similar studies where they support a choice.${notesLine(c.inputs.notes)}`,
    maxTokens: 3800, grounded: true,
  }),
  framework: (c) => ({
    user: `Build a theoretical framework for a study on "${c.inputs.topic}". ${headingsRule(c, 'Candidate theories (2–4, each with its core idea and how it has been used, cited), The theory or combination to use and why, Key constructs (a table: construct | definition | how to measure or observe it), How the variables relate (the propositions, and a simple text diagram such as A → B → C), Limits of the framework')}.${notesLine(c.inputs.notes)}`,
    maxTokens: 3200, grounded: true,
  }),
  gaps: (c) => ({
    user: `Identify research gaps on "${c.inputs.topic}" for ${reader(c)}. Start with ## What is well studied (one paragraph, cited). Then ## Possible gaps: 4–6 gaps, each a "###" heading naming the gap, then **Type:** (unanswered question, under-studied population or setting, untested method, conflicting results, or outdated evidence); **Why it may be a gap:** (2–3 cited sentences); **Confidence:** low, medium or high with a reason; **A study that could address it:** (one sentence). Finish with ## Before you rely on these (how to check them).${notesLine(c.inputs.notes)}`,
    maxTokens: 3000, grounded: true,
  }),
  timeline: (c) => ({
    user: `Plan a realistic research timeline for: "${c.inputs.topic}", over ${c.inputs.months || '12'} months${c.inputs.start ? ` starting ${c.inputs.start}` : ''}. ` +
      '## Phases: a Markdown table Phase | Months | Main tasks | Milestone or deliverable. ## Dependencies (what must finish before what). ## Risks and buffers (a table: risk | likelihood | what to do). ## Checkpoints with your supervisor.' + notesLine(c.inputs.notes),
    maxTokens: 2400,
  }),
  defence: (c) => ({
    system: `${BASE} Base every question on the thesis text given; do not invent its content.`,
    user: `Prepare the writer for their thesis defence (viva). From the thesis below, write ## Overview questions (5 opening questions examiners usually ask), then one "##" per chapter or major part with 3–5 likely questions; under each question, **Why they ask:** and **How to answer:** (2–3 sentences, pointing to what in the thesis to use). Then ## Hard questions on weaknesses (limitations, methods choices, alternative explanations) and ## Your 3-minute summary (a short spoken summary of the thesis).${notesLine(c.inputs.notes)}\n\nThe thesis:\n${(c.inputs.text || '').slice(0, 120000)}`,
    maxTokens: 5000, task: 'review',
  }),
  'auto-proposal': (c) => ({
    user: `Write a complete research proposal for ${DEGREE_TEXT[c.inputs.degree] ?? 'a thesis'} on: "${c.inputs.topic}". First refine the idea into one focused research question. ` +
      `${headingsRule(c, 'Title, Research question and objectives, Background and significance, Literature review (by theme, cited), Research gap, Methodology (design, sampling, data collection, analysis, validity), Ethical considerations, Timeline (a table), Expected contribution')}. About ${words(2800, c)} words.${notesLine(c.inputs.notes)}`,
    maxTokens: 7500, grounded: true, task: 'review',
  }),

  // ---------------------------------------------------------------- Proposal Studio
  'research-proposal': (c) => {
    const part = c.inputs.part || 'whole';
    const parts: Record<string, string> = {
      aims: 'the title, the research question, the aim and 2–4 SMART objectives', background: 'the background and significance', literature: 'the literature review, by theme',
      methods: 'the methods (design, sampling, data collection, analysis, validity)', timeline: 'the timeline as a table of phases and milestones', budget: 'a budget outline as a table with justifications (amounts as [placeholders])', ethics: 'the ethical considerations',
    };
    return {
      user: part === 'whole'
        ? `Write a research proposal for ${DEGREE_TEXT[c.inputs.degree] ?? 'a thesis'} on "${c.inputs.topic}", about ${words(2500, c)} words. ${headingsRule(c, 'Title, Aims and objectives, Background and significance, Literature review, Methods, Timeline (table), Budget outline (table with [placeholder] amounts), Ethical considerations, Expected outcomes')}.${notesLine(c.inputs.notes)}`
        : `Write ${parts[part] ?? part} of a research proposal for ${DEGREE_TEXT[c.inputs.degree] ?? 'a thesis'} on "${c.inputs.topic}", about ${words(700, c)} words.${notesLine(c.inputs.notes)}`,
      maxTokens: part === 'whole' ? 6500 : 2400, grounded: true,
    };
  },
  grant: (c) => {
    const format: Record<string, string> = {
      nih: 'NIH format: Specific Aims (one page: the problem, the long-term goal, the objective, central hypothesis, 2–3 aims, payoff), then Research Strategy with Significance, Innovation and Approach (per aim: rationale, design, expected results, pitfalls and alternatives)',
      nsf: 'NSF Project Description: overview, objectives, background, research plan, Intellectual Merit and Broader Impacts as named sections, results from prior support placeholder',
      erc: 'ERC Extended Synopsis: the state of the art and the ground-breaking nature, objectives, methodology including high-risk/high-gain elements',
      wellcome: 'Wellcome format: the research question, why now, the approach, the team and environment, outputs and impact',
      generic: 'a general funder format: summary, aims, significance and innovation, approach and work plan, impact and dissemination, budget justification',
    };
    const part = c.inputs.part || 'whole';
    return {
      user: `Write ${part === 'whole' ? 'a grant proposal' : `the "${part}" part of a grant proposal`} in ${format[c.inputs.funder] ?? format.generic} for this project: "${c.inputs.topic}". Address the call's criteria directly where it gives them. About ${words(part === 'whole' ? 2600 : 800, c)} words; amounts and team details as [placeholders].` +
        (c.inputs.call?.trim() ? `\n\nThe call:\n${c.inputs.call.trim().slice(0, 30000)}` : '') + notesLine(c.inputs.notes),
      maxTokens: part === 'whole' ? 7000 : 2600, grounded: true, task: 'review',
    };
  },
  ethics: (c) => ({
    user: `Draft an ethics application for a ${{ irb: 'US Institutional Review Board', rec: 'UK Research Ethics Committee', hrec: 'Australian Human Research Ethics Committee' }[c.inputs.board] ?? 'research ethics committee'} for this study, with ${{ vulnerable: 'children or vulnerable participants', patients: 'patients or clinical data', online: 'online or secondary data' }[c.inputs.risk] ?? 'adult participants at low risk'}. ` +
      `${headingsRule(c, 'Study summary in plain language, Participants and recruitment, Procedures, Risks and how they are reduced, Benefits, Informed consent (and a short draft consent statement), Confidentiality and data protection (storage, access, retention, anonymisation or pseudonymisation), Withdrawal, Conflicts of interest')}. Mark what the researcher must confirm in [square brackets]; never invent approvals or institutions.\n\nThe study:\n${(c.inputs.topic || '').slice(0, 12000)}`,
    maxTokens: 4500,
  }),
  dmp: (c) => ({
    user: `Write a data management plan in the ${{ nih: 'NIH Data Management and Sharing Plan', nsf: 'NSF', horizon: 'Horizon Europe', ukri: 'UKRI' }[c.inputs.funder] ?? 'generic'} format for this project. ${headingsRule(c, 'Data description (types, formats, volume), Collection and documentation (metadata standards), Storage and security, Ethics and personal data, Sharing and access (repository, timing, licence), Preservation, Roles and costs')}. Name real repositories that fit the field (e.g. Zenodo, Dryad, OSF, discipline repositories). Mark choices the researcher must confirm in [square brackets].\n\nThe project:\n${(c.inputs.topic || '').slice(0, 12000)}`,
    maxTokens: 3200,
  }),

  // ---------------------------------------------------------------- Slides
  slides: (c) => {
    const count = Number(c.inputs.count || 12);
    const preset: Record<string, string> = {
      defence: 'a thesis defence: title, the problem, research questions, literature in brief, methods, results (one slide per main finding), discussion, contributions, limitations, future work, thank you',
      conference: 'a 12–15 minute conference talk: one idea per slide, results first-class',
      journal: 'a journal club: the paper’s question, methods, results, critique, take-home messages and discussion questions',
      lecture: 'a lecture: learning outcomes, concepts building on each other, examples, a summary and review questions',
      research: 'a research talk: motivation, question, approach, evidence, implications',
    };
    return {
      system: `${BASE.replace('Markdown only: "##" and "###" headings, paragraphs, lists and tables. ', '')} Answer with JSON only.`,
      user: `Make about ${count} slides for ${preset[c.inputs.preset] ?? preset.research}, on "${c.inputs.topic}", for ${reader(c)}. ` +
        'Return {"title": "...", "subtitle": "...", "slides": [{"title": "...", "bullets": ["at most 5 short bullets, each under 15 words"], "notes": "what the speaker says, 60–120 words", "table": {"headers": ["..."], "rows": [["..."]]} (optional), "chart": {"type": "bar", "label": "...", "labels": ["..."], "values": [1]} (optional, only with real numbers from the content)}]}. ' +
        'Put source markers like [S2] at the end of bullets that state findings. Never invent numbers.' +
        (c.inputs.text?.trim() ? `\n\nBuild the slides from this content:\n${c.inputs.text.trim().slice(0, 100000)}` : ''),
      maxTokens: Math.min(9000, 700 + count * 380), grounded: !c.inputs.text?.trim(), json: true,
    };
  },
};

export const hasStudioPrompt = (id: string) => Boolean(BUILDERS[id]);

/** The earlier work, for modules that write from a topic (those that take the writer's text get it in the form instead). */
function priorPart(context: StudioContext) {
  const prior = context.prior?.markdown?.trim();
  if (!prior) return '';
  return `\n\nThis continues the writer's earlier work, "${context.prior!.title.slice(0, 160)}" (its source markers match the sources below). ` +
    'Build on it: keep its findings, argument and citations, go further where the task asks, and do not contradict it unless a source does.\n' +
    `<earlier_work>\n${prior.slice(0, 24000)}\n</earlier_work>`;
}

/** The messages and settings for one run of a module. */
export function buildStudioPrompt(module: StudioModule, context: StudioContext): StudioPrompt {
  const built = BUILDERS[module.id](context);
  const cited = context.sources.length > 0;
  const system = built.system ?? `${BASE} Write for ${reader(context)}. ${language(context)}${cited ? ` ${CITE}` : ' Do not cite sources you were not given; where a claim needs a source, write [citation needed].'}`;
  return {
    messages: [{ role: 'system', content: built.system && cited ? `${system} ${CITE}` : system }, { role: 'user', content: `${built.user}${built.system ? '' : priorPart(context)}${sourcesPart(context)}` }],
    maxTokens: context.highQuality ? Math.round(built.maxTokens * 1.4) : built.maxTokens,
    task: context.highQuality || built.task === 'review' ? 'review' : 'fast',
    temperature: built.json ? 0.3 : 0.5,
    json: built.json,
  };
}

// ------------------------------------------------------------------ Improve document

/** Paragraphs of a text, in order (blank lines split them; very long ones stay whole). */
export function paragraphsOf(text: string): string[] {
  return text.replace(/\r\n/g, '\n').split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
}

/** Paragraphs in batches of about `maxWords` words, so each model call stays small. */
export function batches(paragraphs: string[], maxWords = 1500): string[][] {
  const out: string[][] = [];
  let current: string[] = [];
  let count = 0;
  for (const paragraph of paragraphs) {
    const size = (paragraph.match(/\S+/g) || []).length;
    if (current.length && count + size > maxWords) { out.push(current); current = []; count = 0; }
    current.push(paragraph);
    count += size;
  }
  if (current.length) out.push(current);
  return out;
}

const GOALS: Record<string, string> = {
  proofread: 'Correct grammar, spelling and punctuation only; keep the wording otherwise.',
  clarity: 'Make each paragraph clearer and tighter: shorter sentences, plain words, no repetition.',
  expand: 'Expand thin paragraphs with explanation and examples that follow from what is written; do not add facts, numbers or citations.',
  shorten: 'Shorten each paragraph by about a third, keeping every key point.',
  restructure: 'Improve the order of sentences and the links between paragraphs.',
  formal: 'Use a more formal, academic tone.',
  plain: 'Use simpler, plainer language for a general reader.',
};

/** One batch of paragraphs to improve; the model returns the same number of paragraphs as JSON. */
export function improvePrompt(paragraphs: string[], goal: string, instructions: string, context: Pick<StudioContext, 'role' | 'field' | 'language'>): StudioPrompt {
  return {
    messages: [
      { role: 'system', content: `${BASE.replace('Markdown only: "##" and "###" headings, paragraphs, lists and tables. ', '')} You edit the writing of ${ROLE_TEXT[context.role || ''] || 'a researcher'}. Keep every fact, number, name, quotation and citation (such as (Smith, 2020) or [12]) exactly. Keep headings as they are. Answer with JSON only: {"paragraphs": [{"text": "the revised paragraph", "note": "what changed, under 15 words, or empty if unchanged"}]} with exactly one item per input paragraph, in order.` },
      { role: 'user', content: `${GOALS[goal] ?? GOALS.clarity}${instructions.trim() ? `\nAlso: ${instructions.trim().slice(0, 2000)}` : ''}\n\nParagraphs (${paragraphs.length}):\n${paragraphs.map((paragraph, index) => `<p${index + 1}>\n${paragraph}\n</p${index + 1}>`).join('\n')}` },
    ],
    maxTokens: Math.min(12000, Math.ceil(paragraphs.join(' ').length / 3) * (goal === 'expand' ? 2 : 1.3) + 400),
    task: 'fast', temperature: 0.3, json: true,
  };
}

// ------------------------------------------------------------------ Slides

export type Slide = { title: string; bullets: string[]; notes: string; table?: { headers: string[]; rows: string[][] } | null; chart?: { type: 'bar'; label: string; labels: string[]; values: number[] } | null };
export type Deck = { title: string; subtitle: string; slides: Slide[] };

/** A deck from the model's JSON, cleaned: strings trimmed, empty slides and broken charts dropped. */
export function cleanDeck(raw: any, fallbackTitle: string): Deck | null {
  const str = (value: unknown, max: number) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '');
  const slides: Slide[] = (Array.isArray(raw?.slides) ? raw.slides : []).slice(0, 40).map((slide: any) => {
    const table = slide?.table && Array.isArray(slide.table.headers) && Array.isArray(slide.table.rows) && slide.table.headers.length
      ? { headers: slide.table.headers.slice(0, 6).map((cell: unknown) => str(cell, 60)), rows: slide.table.rows.slice(0, 8).map((row: unknown[]) => (Array.isArray(row) ? row : []).slice(0, 6).map((cell) => str(String(cell ?? ''), 80))) }
      : null;
    const labels = Array.isArray(slide?.chart?.labels) ? slide.chart.labels.map((label: unknown) => str(String(label), 30)) : [];
    const values = Array.isArray(slide?.chart?.values) ? slide.chart.values.map(Number) : [];
    const chart = labels.length >= 2 && labels.length === values.length && values.every(Number.isFinite) ? { type: 'bar' as const, label: str(slide.chart.label, 60), labels: labels.slice(0, 10), values: values.slice(0, 10) } : null;
    return {
      title: str(slide?.title, 120), bullets: (Array.isArray(slide?.bullets) ? slide.bullets : []).map((bullet: unknown) => str(bullet, 200)).filter(Boolean).slice(0, 6),
      notes: str(slide?.notes, 1500), table, chart,
    };
  }).filter((slide: Slide) => slide.title || slide.bullets.length);
  if (!slides.length) return null;
  return { title: str(raw?.title, 160) || fallbackTitle, subtitle: str(raw?.subtitle, 200), slides };
}
