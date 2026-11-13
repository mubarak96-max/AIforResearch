/**
 * Prompts for the studio modules (studioCatalog.ts). Grounded modules get numbered sources
 * ([S1], [S2] …) and may cite only those; the route drops invented markers before anything is
 * shown or saved. Every builder is pure, for tests.
 */
import type { ChatMessage } from '../slots/types.js';
import type { ResearchSource } from './research.js';
import { sourcesBlock } from './research.js';
import { posterBuilder } from './posterModule.js';
import { JOURNAL_STYLES, STUDY_CHECKLISTS, template, wordCount, type StudioModule } from './studioCatalog.js';

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

/** The sections of each kind of white paper (WHITE_PAPER_TYPES in studioCatalog.ts). */
const WHITE_PAPER_SECTIONS: Record<string, string> = {
  'problem-solution': 'Executive summary, Introduction, The problem (what it costs and who it affects, cited), Why current approaches fall short, A better approach (the principles first, then the approach itself), Evidence and results, Implementation (steps, timeline, what it takes), Risks and limitations, Conclusion and next step',
  scientific: 'Executive summary, Introduction and scope, The state of the science (one "###" subsection per theme, each saying how strong the evidence is), Where the evidence agrees and where it is uncertain, Implications (for practice, industry or policy), Recommendations (research priorities and actions), How this paper was prepared (the evidence base: the kinds of studies cited and its limits), Glossary (key terms in plain words), Conclusion',
  technical: 'Executive summary, Introduction, The technical problem and its context, Requirements and design goals, Architecture: how it works (components and data flow, with a simple text diagram such as A → B → C), Performance and evaluation (only from the sources or the writer\'s benchmarks), Security, reliability and limitations, Comparison with alternatives (a table: approach | strengths | weaknesses | when to use it), Implementation and integration, Glossary, Conclusion',
  policy: 'Summary, Introduction (the purpose of the paper and who it is for), The case for change (cited), Objectives, Proposals (numbered; each with its rationale, expected effect, cost as a [placeholder] unless given, and who must act), Options considered (a table: option | benefits | costs and risks | strength of evidence | why chosen or not), Implementation and timeline, Impact (benefits, costs, equity, risks), Consultation questions (numbered questions for readers to respond to), Next steps',
  industry: 'Executive summary, Introduction and scope, The field today, Key trends (one "###" subsection per trend, each with its evidence), Challenges and risks, Outlook (only projections the sources make, labelled as projections, with their source), What this means for the reader, Methodology note (what the evidence base is and its limits), Conclusion',
  backgrounder: 'Executive summary, Introduction, The problem it addresses, How it works, Key features (a table: feature | what it does | what the reader gains), Evidence (cited studies and the writer\'s own results, kept apart), Use cases, Getting started, Conclusion',
  numbered: 'Introduction (the problem and why these points matter), 7–10 numbered points, each a "###" heading that states the point in one line followed by the explanation and its evidence, Conclusion and next step',
};
const WHITE_PAPER_LABEL: Record<string, string> = {
  'problem-solution': 'problem–solution white paper', scientific: 'scientific white paper that sets out the state of the research for decision makers',
  technical: 'technical white paper', policy: 'policy white paper that sets out proposals for change', industry: 'industry white paper on trends and outlook',
  backgrounder: 'backgrounder white paper', numbered: 'numbered-list white paper',
};

/** What each researcher email asks for (the Researcher email module). */
const EMAIL_KINDS: Record<string, string> = {
  coauthor: 'an invitation to co-author a paper: what the paper is and how far along it is, why this person (their expertise, as the writer gives it), what their role and contribution would be, how authorship order and credit will be handled, the timeline, and a clear question asking whether they are interested',
  meeting: 'an invitation to a meeting, seminar or talk: the purpose, the date, time and time zone, the place or video link, how long it lasts, what is asked of them (attend, present, comment), and how to confirm',
  data: 'a request for data, code or materials from a study: which study and which data exactly, what the writer will use them for, how the data will be stored and protected, any agreement or ethics approval the writer has or can sign, how the source will be acknowledged or cited, and what format would help',
  paper: 'a request for the full text of a paper: the full reference, why the writer needs it, that it is for personal research use, and thanks',
  supervisor: 'an enquiry to a prospective supervisor: who the writer is (degree, institution, background, from the notes), the research interest in one or two sentences and how it relates to this person\'s work (only what the writer says about it), the programme and start date, funding status, what is attached (CV, proposal), and a specific question such as whether they are taking students',
  followup: 'a polite follow-up to an earlier email that has had no reply: what was asked and when (as given), a one-line restatement of the request, any new deadline, and an easy way to say no',
};

/** Section order and reference style per target journal style (the Journal formatter). */
const JOURNAL_STYLE_SPEC: Record<string, string> = {
  nature: 'Nature-family research article: Title; a referenced summary paragraph without headings (no separate Abstract heading); the main text opening without an "Introduction" heading, then short subheadings for results and a discussion; Methods at the end; Data availability; Code availability; References (numbered in the order first cited, superscript numbers in the text); Acknowledgements; Author contributions; Competing interests; Figure legends (a bold title sentence, then the description).',
  science: 'Science research article: Title; a one-paragraph Abstract; the main text opening without an "Introduction" heading, with short subheadings; Materials and methods summarised in the text with full detail in the supplementary materials; References and Notes (numbered in the order cited, in parentheses in the text); Acknowledgments (funding, author contributions, competing interests, data and materials availability); a list of Supplementary Materials.',
  ieee: 'IEEE paper: Title; Authors and affiliations; Abstract (one paragraph, no citations); Index Terms; numbered sections in Roman numerals (I. Introduction, II. Related Work, III. Method, IV. Experiments and Results, V. Discussion, VI. Conclusion); Acknowledgment; References (IEEE style: numbered in square brackets [1] in the order first cited, initials before surnames, abbreviated journal names).',
  acm: 'ACM paper (acmart): Title; Authors and affiliations; Abstract; CCS Concepts; Keywords; ACM Reference Format line; numbered sections (1 Introduction, 2 Related Work, 3 Approach, 4 Evaluation, 5 Discussion, 6 Conclusion); Acknowledgments; References (ACM Reference Format, with DOIs).',
  apa: 'APA 7th edition manuscript: Title page (title, authors, affiliations, author note); Abstract (one paragraph) with Keywords; the introduction under the paper\'s title (no "Introduction" heading); Method (Participants, Measures or Materials, Procedure); Results; Discussion; References (APA 7 author–date, alphabetical, DOIs as https://doi.org/ links); Tables and figures (numbered, each with a title and note); APA heading levels 1–3.',
  vancouver: 'Medical journal following the ICMJE recommendations: Title page (title, authors, affiliations, corresponding author, word count, number of tables and figures); a structured Abstract (Background, Methods, Results, Conclusions; trial registration for trials); Keywords; Introduction; Methods (with ethics approval, consent and registration); Results; Discussion (with limitations); Acknowledgments; Funding; Competing interests; Data sharing statement; References (Vancouver: numbered in the order first cited, NLM journal abbreviations); Tables; Figure legends.',
  custom: 'the journal\'s own instructions for authors given below. If none are given, use a general IMRaD order (Title, Abstract, Keywords, Introduction, Methods, Results, Discussion, Conclusion, Declarations, References) and say at the top that the author guidelines are needed for a proper check.',
};

/** Free validated scales the Survey builder can insert (lib/surveyInstruments.ts), for the operationalisation prompt. */
export const SURVEY_SCALES: [name: string, measures: string][] = [
  ['PHQ-9', 'depression severity'], ['GAD-7', 'anxiety severity'], ['WHO-5', 'current mental wellbeing'],
  ['PSS-10', 'perceived stress'], ['RSES', 'global self-esteem'], ['SUS', 'perceived usability of a product or system'],
];

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
  'conference-paper': (c) => {
    const pages = [4, 6, 8].includes(Number(c.inputs.pages)) ? Number(c.inputs.pages) : 6;
    const target = Math.min(pages * 800, words(pages * 700, c));
    const formats: Record<string, { name: string; sections: string }> = {
      ieee: { name: 'the IEEE conference format (two columns, numbered references)', sections: 'Abstract (one paragraph, 150–200 words, no citations), Index Terms, I. Introduction, II. Related Work, III. Method, IV. Experiments and Results, V. Discussion, VI. Conclusion' },
      acm: { name: 'the ACM format (acmart)', sections: 'Abstract, CCS Concepts (as [placeholders] for terms from the ACM Computing Classification System), Keywords, 1 Introduction, 2 Related Work, 3 Approach, 4 Evaluation, 5 Discussion and Limitations, 6 Conclusion' },
      generic: { name: 'a general conference format', sections: 'Abstract, Keywords, Introduction, Related Work, Method, Results, Discussion and Limitations, Conclusion' },
    };
    const format = formats[c.inputs.format] ?? formats.ieee;
    const study = c.inputs.study?.trim();
    return {
      user: `Write a conference paper titled or asking "${c.inputs.topic}"${c.inputs.venue?.trim() ? ` for ${c.inputs.venue.trim().slice(0, 200)}` : ''}, in ${format.name}. It must fit a ${pages}-page limit with its figures and references, so write about ${target} words of text. ` +
        `Start with a "**Title:**" line. Use these sections as "##" headings: ${format.sections}. ` +
        'End the Introduction with "Our contributions are:" and a bulleted list of 2–4 specific contributions; each must match something the paper reports, and none may claim more than the study supports. ' +
        'Related Work compares the closest work with this paper and states the difference, citing it. Do not call the work "novel", "first", "state-of-the-art" or "significant" unless a source or the writer\'s study supports it with a test or comparison; never claim to be the first. ' +
        'Mark where figures and tables belong with "[Figure N: what it shows]" or "[Table N: what it compares]", and fill a table only with numbers the writer gave. ' +
        (study
          ? `Base the method, set-up and results only on the writer's study below; never invent data, metrics, baselines, numbers or participants.\n\nThe writer's study:\n${study.slice(0, 30000)}`
          : 'The writer has not given their study: in the method, set-up and results write clear [placeholders] for what they must fill in (data, baselines, metrics, findings); never invent results.') +
        notesLine(c.inputs.notes),
      maxTokens: 8000, grounded: true, task: 'review',
    };
  },
  'journal-format': (c) => {
    const style = JOURNAL_STYLE_SPEC[c.inputs.style] ? c.inputs.style : 'nature';
    const label = JOURNAL_STYLES.find((item) => item.id === style)?.label ?? style;
    const manuscript = (c.inputs.text || '').slice(0, 300_000);
    const count = wordCount(manuscript);
    const long = count > 5000;
    const guidelines = c.inputs.guidelines?.trim();
    const journal = c.inputs.journal?.trim();
    return {
      system: `${BASE} You are a journal production editor working for ${reader(c)}. ${language(c)} ` +
        'Never change the scientific content: findings, numbers, statistics, claims, interpretations, quotations and citations stay exactly as written. ' +
        'You may move text between sections, rename and renumber headings, split a paragraph where a section boundary falls inside it, label the sentences of an existing abstract with the target\'s headings, and reformat references. ' +
        'Do not shorten, summarise or rewrite text to meet a limit: report it instead. Never invent missing elements (declarations, funding, ethics approval numbers, keywords, affiliations, DOIs, page numbers): write a [placeholder] naming what is needed. ' +
        'Do not state a word, abstract, figure or reference limit unless the author guidelines given state it or it is part of the style described; otherwise say "check the current author guide".',
      user: `Format this manuscript (about ${count.toLocaleString('en-US')} words) for ${journal ? `${journal.slice(0, 200)} (${label})` : label}. The target structure: ${JOURNAL_STYLE_SPEC[style]}` +
        (guidelines ? `\n\nThe journal's author guidelines (they take precedence over the structure above):\n${guidelines.slice(0, 30000)}\n\n` : '\n\n') +
        (long
          ? 'The manuscript is too long to reproduce in one answer, so return "## New structure": for each section of the target, a "###" heading, then the parts of the manuscript that go there, each named by its current heading and paragraph and its first words in quotation marks (e.g. Methods, paragraph 3: "Participants were recruited…"), with a note where a paragraph must be split or moved. List every new element the target needs as a [placeholder]. Start this section with one sentence saying the text itself is unchanged and should be moved as listed. '
          : 'Return "## Formatted manuscript": the whole manuscript in the target\'s order and headings, every sentence kept, with [placeholders] for required elements that are missing. ') +
        'Then "## Reference style": one line naming the target style, how in-text citations change (e.g. author–date to numbered), and the reference list reformatted to the style using only the elements each original reference contains; mark a missing element as [missing: pages] rather than adding it. ' +
        'Then "## What still breaks the guidelines": a table: issue | where | what the guideline asks | what to do. Check the total and abstract word counts against stated limits (give your counts as estimates), the title, the abstract format, keywords, required sections and statements (ethics approval and consent, funding, competing interests, author contributions, data and code availability, trial registration where it applies), figure and table counts and legends, and anything the guidelines ask that the manuscript lacks. If nothing breaks a rule, say so.' +
        `\n\nThe manuscript:\n${manuscript}`,
      maxTokens: long ? 6000 : Math.min(8000, Math.ceil(count * 1.6) + 2000), task: 'review',
    };
  },

  // ---------------------------------------------------------------- Writing Studio: deliverables
  'white-paper': (c) => {
    const type = WHITE_PAPER_SECTIONS[c.inputs.type] ? c.inputs.type : 'problem-solution';
    const part = c.inputs.part || 'whole';
    const audience: Record<string, string> = {
      executives: 'decision makers and executives who read the executive summary first and may stop there', technical: 'engineers and technical buyers who want to know how it works and what the trade-offs are',
      policy: 'policy makers and officials who need options, evidence and what implementing them takes', scientists: 'scientists and specialists in the field who expect precise claims and the strength of evidence',
      funders: 'investors, funders and partners deciding whether to back the work', public: 'an informed general reader with no specialist background',
    };
    const position = c.inputs.stance === 'position';
    const material = c.inputs.material?.trim();
    const parts: Record<string, string> = {
      summary: 'the executive summary (150–250 words: the problem, why it matters now, the approach and the main recommendation), followed by "## Key takeaways" with 3–5 bullets',
      problem: 'the section on the problem: what is wrong or changing, who it affects, what it costs, and why current approaches fall short',
      evidence: 'the section on what the evidence says, organised by theme, with how strong each finding is and where the evidence disagrees',
      approach: 'the section on the approach or solution: the principles first, then how it works, then what it takes to implement',
      recommendations: 'the recommendations (numbered, each with who should act and the first step) and a conclusion with one clear next step',
    };
    return {
      user: (part === 'whole'
        ? `Write a ${WHITE_PAPER_LABEL[type]} of about ${words(3000, c)} words on "${c.inputs.topic}". Start with a "**Title:**" line and a "**Subtitle:**" line. ${headingsRule(c, WHITE_PAPER_SECTIONS[type])} ` +
          'End with "## Suggested figures": 2–4 charts, diagrams or tables a designer could make, each with the data that backs it (only numbers from the sources or the writer\'s material, with their markers) or a [placeholder] for the data still needed.'
        : `Write ${parts[part] ?? parts.summary} of a ${WHITE_PAPER_LABEL[type]} on "${c.inputs.topic}", about ${words(800, c)} words. Use "###" subheadings where they help.`) +
        ` Written for ${audience[c.inputs.audience] ?? audience.executives}. ` +
        'A white paper persuades through evidence, so write with authority but not as an advertisement: no superlatives ("best", "revolutionary", "game-changing", "seamless"), no hype, and say where the evidence is weak, mixed or from a different setting. ' +
        'Every statistic must come from the sources (with its marker) or from the writer\'s material, exactly as given; never invent figures, percentages, savings, customers, quotations or case studies. Where a number would help and none is available, write a [placeholder] naming the data needed. ' +
        (position
          ? 'The paper makes the case for the writer\'s approach: lead with the problem and the evidence, present the approach only after the principles that justify it, and attribute the writer\'s own claims and results to them (e.g. "[Organisation] reports…") unless a source independently supports them. Include its limits and when it is not the right choice. '
          : 'Keep the paper educational and vendor-neutral: explain the problem and the options fairly, recommend actions rather than products, and do not promote any organisation. ') +
        (material ? `\n\nThe writer's approach, product or data (use it as given; do not add to it):\n${material.slice(0, 30000)}` : '\n\nThe writer gave no material of their own: where the paper needs it (their organisation, product, results, pricing, contacts), write a clear [placeholder].') +
        notesLine(c.inputs.notes),
      maxTokens: part === 'whole' ? 8000 : 2600, grounded: true, task: part === 'whole' ? 'review' : undefined,
    };
  },
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

  // ---------------------------------------------------------------- Writing Studio: correspondence
  'research-email': (c) => {
    const kind = EMAIL_KINDS[c.inputs.kind] ? c.inputs.kind : 'coauthor';
    const brief = kind === 'followup' || kind === 'paper';
    return {
      system: `${BASE.replace('Markdown only: "##" and "###" headings, paragraphs, lists and tables. ', '')} You write short, professional emails for ${reader(c)}. ${language(c)} ` +
        'Use only the facts the writer gives. Never invent names, titles, institutions, dates, results, funding, shared history, or praise of the recipient\'s work beyond what the writer says. ' +
        'Where a detail is needed and not given, write a [bracketed placeholder] such as [your name] or [date and time zone]. No flattery, no superlatives, no exclamation marks.',
      user: `Write ${EMAIL_KINDS[kind]}.\n\nTo: ${c.inputs.recipient?.trim() || '[recipient’s name and title]'}\nAbout: "${c.inputs.topic}"` +
        (c.inputs.purpose?.trim() ? `\nWhat the writer wants:\n${c.inputs.purpose.trim().slice(0, 4000)}` : '') +
        (c.inputs.deadline?.trim() ? `\nDeadline or date: ${c.inputs.deadline.trim().slice(0, 200)}` : '') +
        `\n\nFormat: a first line "**Subject:** …" (specific, under 10 words), a blank line, the greeting, the body in short paragraphs (under ${brief ? 120 : 200} words), one clear request near the end, and a sign-off with a signature of [placeholders] for name, position, institution and email unless the notes give them. ` +
        'Then a line "---" and "**Before sending:**" with a short list of the placeholders to fill and anything to attach.' + notesLine(c.inputs.notes),
      maxTokens: 900,
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
  operationalisation: (c) => {
    const constructs = (c.inputs.constructs || '').split(/\r?\n|;/).map((line) => line.replace(/^\s*[-*•\d.)]+\s*/, '').trim()).filter(Boolean).slice(0, 12);
    const qualitative = c.inputs.design === 'qualitative';
    return {
      user: `Operationalise the constructs of this study for ${reader(c)}: "${c.inputs.topic}". Approach: ${{ qualitative: 'qualitative', mixed: 'mixed methods' }[c.inputs.design] ?? 'quantitative'}.\n\nConstructs:\n${constructs.map((item) => `- ${item}`).join('\n')}\n\n` +
        (qualitative
          ? 'Start with "## Operationalisation table": a Markdown table, one row per construct: Construct | Conceptual definition | How it is recognised in the data | Indicators or sensitising questions | Data source (interview, observation, documents) | Level of measurement (not applicable, or how it is counted if it is) | Trustworthiness (credibility, dependability, transferability checks). '
          : 'Start with "## Operationalisation table": a Markdown table, one row per construct: Construct | Conceptual definition | Operational definition | Indicators | Instrument | Level of measurement | Validity and reliability evidence. ') +
        'The conceptual definition comes from the literature and is cited. The operational definition says exactly what is observed or asked and how it is scored. The level of measurement is nominal, ordinal, interval or ratio; where a summed Likert score is treated as interval, say that this is a convention. ' +
        'Name an instrument only if a source describes it or it is one of the scales listed below. Give reliability or validity figures only when a source reports them, with its marker; otherwise write "[report from the instrument\'s validation study]". Never invent an instrument, item wording, cut-off or coefficient. ' +
        `Free validated scales the Survey builder can add, with their published wording and scoring: ${SURVEY_SCALES.map(([name, measures]) => `${name} (${measures})`).join('; ')}. ` +
        'Where a construct matches one of these, name it in the Instrument column with "(add it from the Survey builder)", and say whether what it measures fits the construct as defined. ' +
        'Then "## Notes by construct": a "###" per construct with alternative measures, adaptation or translation needs, and threats to validity. ' +
        'Then "## Variables for analysis": a table Variable | Construct | Role (independent, dependent, control, moderator or mediator) | Type | Values or range. ' +
        'End with "## Checks before data collection": 3–5 bullets (pilot test, permission or licence, translation, reliability in your own sample).' + notesLine(c.inputs.notes),
      maxTokens: 4200, grounded: true,
    };
  },
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
  'ethics-statement': (c) => {
    const review: Record<string, string> = {
      approved: 'The study was reviewed and approved by an ethics committee or IRB.',
      exempt: 'An ethics committee or IRB reviewed the study and granted an exemption or a waiver; say which, as the notes give it, or use a [placeholder].',
      'not-required': 'The writer says ethics review was not required. State the reason from the notes, or write [reason review was not required, e.g. publicly available anonymised data], and note in the checks that many journals ask for written confirmation from the institution.',
    };
    const consent: Record<string, string> = {
      written: 'Written informed consent was obtained from all participants.', verbal: 'Consent was given verbally or online and documented; say how, from the notes, or use a [placeholder].',
      parental: 'Parents or guardians gave written informed consent and the children gave assent.', waived: 'The committee waived the requirement for informed consent; give its reason from the notes, or a [placeholder].',
      na: 'The study had no human participants or personal records, so consent does not apply.',
    };
    const value = (input: string | undefined, placeholder: string) => input?.trim() || placeholder;
    return {
      system: `${BASE} You write ethics declarations for research manuscripts, in the wording journals use. ${language(c)} ` +
        'Use only the details the writer gives. Never invent committee names, reference numbers, dates, guidelines followed, registrations or consent procedures: write a [placeholder] for anything missing. Write in the past tense.',
      user: `Write the ethics statement for the manuscript "${c.inputs.topic}".\n\n` +
        `Committee and institution: ${value(c.inputs.committee, '[name of the committee, institution]')}\nReference number: ${value(c.inputs.reference, '[approval reference number]')}\nDate of approval: ${value(c.inputs.date, '[date of approval]')}\n` +
        `Review: ${review[c.inputs.approval] ?? review.approved}\nConsent: ${consent[c.inputs.consent] ?? consent.written}\n` +
        (c.inputs.animals === 'animals' ? 'Animals: animal work was done. Include the animal ethics approval (the committee, e.g. an IACUC or animal welfare body, and its number as [placeholders] unless given) and the law or guideline followed, as the notes give it or as a [placeholder such as ARRIVE 2.0 or the national legislation].\n' : 'Animals: none.\n') +
        '\nReturn "## Methods paragraph" (2–4 sentences as they would appear in the Methods section); then "## Declarations" with the bold labels **Ethics approval and consent to participate:**, **Consent for publication:** (needed for identifiable individual data or images; otherwise "Not applicable.")' +
        (c.inputs.animals === 'animals' ? ' and **Animal research:**' : '') +
        '; then "## Check before submission": a short list of the placeholders to fill and what journals commonly ask for (the approval letter, the consent form template, a statement of the ethical guideline followed only if the writer confirms it, such as the Declaration of Helsinki for research on people).' +
        notesLine(c.inputs.notes),
      maxTokens: 1200,
    };
  },
  dmp: (c) => ({
    user: `Write a data management plan in the ${{ nih: 'NIH Data Management and Sharing Plan', nsf: 'NSF', horizon: 'Horizon Europe', ukri: 'UKRI' }[c.inputs.funder] ?? 'generic'} format for this project. ${headingsRule(c, 'Data description (types, formats, volume), Collection and documentation (metadata standards), Storage and security, Ethics and personal data, Sharing and access (repository, timing, licence), Preservation, Roles and costs')}. Name real repositories that fit the field (e.g. Zenodo, Dryad, OSF, discipline repositories). Mark choices the researcher must confirm in [square brackets].\n\nThe project:\n${(c.inputs.topic || '').slice(0, 12000)}`,
    maxTokens: 3200,
  }),
  'study-checklist': (c) => {
    const kind = STUDY_CHECKLISTS.some((item) => item.id === c.inputs.kind) ? c.inputs.kind : STUDY_CHECKLISTS[0].id;
    const base = template(`checklist-${kind}`)!;
    return {
      system: `${BASE} You prepare study checklists for ${reader(c)}. ${language(c)} Start from the base checklist, which paraphrases public guidance, and tailor it to the study. ` +
        'Never invent regulations, deadlines, form numbers, committee names or an institution\'s own rules: where a local rule decides, write [check with your committee, registry or sponsor]. This is a working checklist, not legal or regulatory advice.',
      user: `Tailor the checklist "${base.label.replace(/^Checklist:\s*/, '')}" to the study below. The base checklist:\n` +
        base.sections.map(([heading, hint], index) => `${index + 1}. ${heading}${hint ? `: ${hint}` : ''}`).join('\n') +
        (kind === 'ctgov-results' ? '\nKeep the order of the PRS results sections; outcome measures must match the registered outcomes exactly.' : '') +
        '\n\nReturn "## Checklist": a Markdown table: # | Item | What this study needs | Applies (yes, no or check) | Owner | Done, with "[ ]" in every Done cell and "[owner]" where the owner is not known. ' +
        'Keep every base item (mark "no" with the reason when it does not apply), split an item where the study needs more detail, and add items the study clearly needs, marked "(added)". ' +
        'Then "## Easy to miss for this study": 3–5 bullets. Then "## Open questions": what the writer must find out or decide.' +
        `\n\nThe study:\n${(c.inputs.topic || '').slice(0, 12000)}${notesLine(c.inputs.notes)}`,
      maxTokens: 3800,
    };
  },

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
  poster: posterBuilder,
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
