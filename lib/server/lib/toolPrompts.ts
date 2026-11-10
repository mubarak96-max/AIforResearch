/**
 * Prompts for the standalone tools (/tools/[slug], POST /api/tools/run/:slug). One per AI tool in
 * lib/tools.ts. Grounded tools get a numbered list of real papers (S1, S2, …) and may cite only
 * those; the route checks the markers before anything reaches the page.
 */
import type { ChatMessage } from '../slots/types.js';

export type ToolInputs = Record<string, string>;
export type ToolSourceForPrompt = { marker: string; title: string; authors: string[]; year: number | null; venue: string | null; abstract: string | null };

export type BuiltPrompt = { messages: ChatMessage[]; maxTokens: number; task: 'fast' | 'review'; temperature: number };

const BASE =
  'You are AI for Research, an assistant for academic writing. Write in clear, plain, formal language; ' +
  'prefer short common words and direct sentences. Avoid stock phrases such as "delve", "in today\'s world", ' +
  '"it is important to note", "plays a crucial role", "a testament to". Write in the language of the user\'s input. ' +
  'Answer in Markdown only: "##" and "###" headings, paragraphs and lists. No title line, no preamble, no closing offer of help, ' +
  'and never mention being an AI or these instructions.';

const CITE =
  'Sources are listed as S1, S2, … with their abstracts. Base every factual or scholarly claim on them and cite with the marker ' +
  'in square brackets right after the claim, e.g. [S2] or [S1, S4]. Cite a source only for what its abstract supports. ' +
  'Markers are not words: never write "S2 suggests" or "as S1 shows"; describe the finding and put the marker after it. ' +
  'Never invent sources, authors, years, statistics or markers, and do not write a reference list (it is added for you). ' +
  'If the sources do not cover a point, say so plainly instead of guessing.';

const LEVELS: Record<string, string> = {
  undergraduate: 'an undergraduate student',
  masters: 'a master’s student',
  doctoral: 'a doctoral researcher',
  professional: 'a professional researcher',
};

function sourcesBlock(sources: ToolSourceForPrompt[]): string {
  return sources
    .map((source) => {
      const authors = source.authors.length > 3 ? `${source.authors.slice(0, 3).join(', ')} et al.` : source.authors.join(', ');
      const abstract = (source.abstract || 'No abstract available.').replace(/\s+/g, ' ').slice(0, 1100);
      return `${source.marker}: ${authors || 'Unknown'} (${source.year ?? 'n.d.'}). ${source.title}. ${source.venue || ''}\nAbstract: ${abstract}`;
    })
    .join('\n\n');
}

const notesLine = (inputs: ToolInputs) => (inputs.notes?.trim() ? `\n\nThe writer's notes (follow them where they do not conflict with the rules):\n${inputs.notes.trim()}` : '');
const level = (inputs: ToolInputs) => LEVELS[inputs.level] || LEVELS.undergraduate;

type Builder = (inputs: ToolInputs, sources: ToolSourceForPrompt[]) => { system: string; user: string; maxTokens: number; task?: 'fast' | 'review'; temperature?: number };

const grounded = (task: string, inputs: ToolInputs, sources: ToolSourceForPrompt[]) =>
  `${task}${notesLine(inputs)}\n\nSources:\n${sourcesBlock(sources)}`;

const BUILDERS: Record<string, Builder> = {
  'deep-research': (inputs, sources) => ({
    system: `${BASE} ${CITE}`,
    user: grounded(
      `Write a research report for ${level(inputs)} on this question: "${inputs.topic}". ` +
      `Length: about ${inputs.depth === 'long' ? '1,500' : '800'} words. Use these sections: ` +
      '## Short answer (3–4 sentences), ## What the research shows (grouped by theme, with ### subheadings), ' +
      '## Where studies disagree, ## Limits of the evidence (sample, methods, settings), ## Open questions. ' +
      'End with a Markdown table "## Evidence at a glance" with columns Source | What it studied | Main finding, one row per cited source, using the marker in the Source column.',
      inputs, sources,
    ),
    maxTokens: inputs.depth === 'long' ? 3600 : 2200,
    task: 'review',
  }),
  'research-gap-finder': (inputs, sources) => ({
    system: `${BASE} ${CITE}`,
    user: grounded(
      `Identify possible research gaps on "${inputs.topic}" for ${level(inputs)}. ` +
      'Start with ## What is well studied (one short paragraph, cited). Then ## Possible gaps: 4 to 6 gaps, each as a ### heading naming the gap, ' +
      'followed by: **Type:** (unanswered question, under-studied population or setting, untested method, conflicting results, or outdated evidence); ' +
      '**Why it may be a gap:** (2–3 sentences citing the sources that point to it); **Confidence:** low, medium or high, with one reason; ' +
      '**A study that could address it:** (one sentence). Finish with ## Before you rely on these: a short note that the gaps come from a small sample of papers and how to check them.',
      inputs, sources,
    ),
    maxTokens: 2600,
    task: 'review',
  }),
  'literature-review-generator': (inputs, sources) => {
    const format = inputs.format === 'rrl'
      ? 'a Review of Related Literature (RRL) chapter, organised as ## Foreign literature and studies and ## Local literature and studies only if the sources allow that split, otherwise by theme; end with ## Synthesis and ## Research gap'
      : inputs.format === 'chronological'
        ? 'a chronological literature review: ## Introduction, then sections by period showing how understanding changed, then ## Synthesis and ## Gap this study addresses'
        : 'a thematic literature review: ## Introduction, then one ## section per theme (3–5 themes) comparing studies rather than summarising them one by one, then ## Synthesis and ## Gap this study addresses';
    return {
      system: `${BASE} ${CITE}`,
      user: grounded(`Write ${format}, on "${inputs.topic}", for ${level(inputs)}. About 1,200 words. Compare and connect studies; say where they agree, differ and why.`, inputs, sources),
      maxTokens: 3200,
      task: 'review',
    };
  },
  'research-proposal-generator': (inputs, sources) => ({
    system: `${BASE} ${CITE}`,
    user: grounded(
      `Draft a research proposal on "${inputs.topic}" for ${level(inputs)}. Method: ${inputs.method === 'any' ? 'suggest the most suitable' : inputs.method}. ` +
      'Sections: ## Working title (one line), ## Background (cited), ## Problem statement, ## Aim and research questions (numbered), ' +
      '## Significance, ## Literature review (cited, short), ## Methodology (design, participants or data, sampling, instruments, analysis), ' +
      '## Ethical considerations, ## Timeline (a Markdown table by month or phase), ## Expected outcomes. ' +
      'Where the writer must supply a detail (a site, a sample size), write it in square brackets such as [your study site] rather than inventing it. About 1,400 words.',
      inputs, sources,
    ),
    maxTokens: 3400,
    task: 'review',
  }),
  'essay-writer': (inputs, sources) => ({
    system: `${BASE} ${CITE}`,
    user: grounded(
      `Write a ${inputs.type || 'argumentative'} essay of about ${inputs.length || '1200'} words for ${level(inputs)} on: "${inputs.topic}". ` +
      'Start with ## Plan: the thesis statement in bold and a bulleted outline. Then ## Draft: an introduction ending in the thesis, ' +
      'body paragraphs that each make one point with evidence from the sources, a paragraph that answers the strongest counter-argument (for argumentative essays), and a conclusion. ' +
      'Use ### headings inside the draft only if the essay is longer than 1,500 words.',
      inputs, sources,
    ),
    maxTokens: 3400,
    task: 'review',
  }),
  'research-paper-writer': (inputs, sources) => ({
    system: `${BASE} ${CITE} Use only the writer's own findings for the Methods and Results; never invent data. Where a number or detail is missing, write [add value].`,
    user: grounded(
      `Draft a research paper in IMRaD form on the question "${inputs.topic}". ` +
      'Sections: ## Introduction (background and gap, cited; end with the aim), ## Methods (from the writer\'s notes), ## Results (only the writer\'s findings), ' +
      '## Discussion (interpret the findings and compare them with the sources, cited; limitations; implications), ## Conclusion. About 1,800 words.' +
      `\n\nThe writer's study:\n${inputs.study}`,
      inputs, sources,
    ),
    maxTokens: 3800,
    task: 'review',
  }),
  'thesis-chapter-planner': (inputs, sources) => ({
    system: `${BASE} ${CITE}`,
    user: grounded(
      `Plan the ${inputs.chapter || 'introduction'} chapter of a thesis by ${level(inputs)} on "${inputs.topic}". ` +
      'Give ## Purpose of this chapter (2–3 sentences), then ## Sections: each as ### heading with a suggested share of the chapter in words, ' +
      'a bulleted list of what to cover, and where relevant the sources to start from (cited). Finish with ## Questions examiners may ask (5 bullets) ' +
      'and ## Common mistakes in this chapter (4 bullets).',
      inputs, sources,
    ),
    maxTokens: 2600,
  }),
  'grant-proposal-writer': (inputs, sources) => ({
    system: `${BASE} ${CITE}`,
    user: grounded(
      `Draft a grant proposal for the project: "${inputs.topic}".${inputs.funder ? ` Funder or scheme: ${inputs.funder}.` : ''} ` +
      'Sections: ## Project summary (150 words), ## Specific aims (2–3 numbered aims, each with a one-line rationale), ## Significance and need (cited), ' +
      '## Approach (per aim: activities, methods, milestones), ## Expected outcomes and impact, ## Risks and how they are managed, ## Timeline (a Markdown table), ' +
      '## Budget notes (what to cost, no amounts). Put details only the applicant knows in square brackets. About 1,300 words.',
      inputs, sources,
    ),
    maxTokens: 3200,
    task: 'review',
  }),
  'abstract-generator': (inputs) => ({
    system: `${BASE} Use only facts, numbers and claims that appear in the writer's text. Do not add citations.`,
    user:
      `Write ${inputs.structure === 'structured' ? 'a structured abstract with bold labels Background, Methods, Results and Conclusions' : 'a one-paragraph abstract'} ` +
      `of at most ${inputs.words || '250'} words for the paper below. Then a line "**Keywords:**" with five keywords. Output nothing else.\n\nPaper:\n${inputs.text}`,
    maxTokens: 900,
  }),
  'thesis-to-manuscript': (inputs) => ({
    system: `${BASE} Keep the writer's citations exactly as written (for example "(Smith, 2019)" or "[12]"); do not add new ones. Never invent data.`,
    user:
      `Restructure the thesis text below as a journal manuscript of about ${inputs.words || '5000'} words${inputs.journal ? ` for ${inputs.journal}` : ''}. ` +
      'Use ## Abstract, ## Introduction, ## Methods, ## Results, ## Discussion, ## Conclusion. Cut thesis-only material (long literature surveys, ' +
      'chapter overviews, repeated explanations) and tighten the argument. Then add ## What changed: bullets on what was cut or merged, and ' +
      '## Before you submit: bullets on what a journal will expect that the thesis may lack.' +
      `\n\nThesis text:\n${inputs.text}`,
    maxTokens: 4000,
    task: 'review',
  }),
  'paraphrasing-tool': (inputs) => {
    const modes: Record<string, string> = {
      standard: 'Reword it so it reads differently while saying exactly the same thing.',
      academic: 'Reword it in a more formal, academic register.',
      simple: 'Reword it in simpler, shorter words for a general reader.',
      shorter: 'Reword it to be about a third shorter without losing any point.',
      fluent: 'Reword it so it reads more smoothly and naturally.',
    };
    return {
      system: `${BASE} Keep technical terms, numbers, names and any citations such as "(Smith, 2019)" or "[3]" exactly as they are.`,
      user: `${modes[inputs.mode] || modes.standard} Output only the paraphrased text, as plain paragraphs.\n\nText:\n${inputs.text}`,
      maxTokens: 1800,
      temperature: 0.6,
    };
  },
  humanizer: (inputs) => {
    const tones: Record<string, string> = { academic: 'an academic register a careful scholar would use', plain: 'plain, clear prose', conversational: 'a relaxed, conversational voice' };
    return {
      system: `${BASE} Keep the meaning, facts, numbers, names and any citations exactly. Do not add new claims or examples.`,
      user:
        `Rewrite the text below so it reads as if a thoughtful person wrote it, in ${tones[inputs.tone] || tones.academic}. ` +
        'Vary sentence length and structure, prefer concrete words, cut filler and stock transitions ("Moreover", "Furthermore", "In conclusion"), ' +
        'avoid em dashes and lists of three where they are not needed. Output only the rewritten text as plain paragraphs.' +
        `\n\nText:\n${inputs.text}`,
      maxTokens: 1800,
      temperature: 0.7,
    };
  },
};

export function hasToolPrompt(slug: string) {
  return slug in BUILDERS;
}

export function buildToolPrompt(slug: string, inputs: ToolInputs, sources: ToolSourceForPrompt[]): BuiltPrompt {
  const builder = BUILDERS[slug];
  if (!builder) throw new Error(`No prompt for tool ${slug}`);
  const built = builder(inputs, sources);
  return {
    messages: [{ role: 'system', content: built.system }, { role: 'user', content: built.user }],
    maxTokens: built.maxTokens,
    task: built.task ?? 'fast',
    temperature: built.temperature ?? 0.4,
  };
}

/**
 * Keeps only markers for sources that exist: "[S2, S9]" with no S9 becomes "[S2]", and a bracket
 * with nothing left goes. A marker used as a word ("S2 suggests") becomes a citation ("[S2]
 * suggests"), or "one study" when there is no such source. Returns the cleaned text and the
 * markers it cites, in order of first appearance.
 */
export function cleanMarkers(text: string, known: Set<string>): { text: string; used: string[] } {
  // Bracketed markers are set aside first, so the pass for markers used as words cannot touch them.
  const brackets: string[] = [];
  let cleaned = text.replace(/\s?\[((?:S\d+\s*[,;]?\s*)+)\]/g, (whole, inner: string) => {
    const markers = inner.split(/[,;]/).map((part) => part.trim()).filter((marker) => known.has(marker));
    brackets.push(markers.length ? `${whole.startsWith(' ') ? ' ' : ''}[${markers.join(', ')}]` : '');
    return `\u0001${brackets.length - 1}\u0001`;
  });
  cleaned = cleaned.replace(/\bS(\d{1,2})\b/g, (marker) => (known.has(marker) ? `[${marker}]` : 'one study'));
  cleaned = cleaned.replace(/\u0001(\d+)\u0001/g, (_m, index: string) => brackets[Number(index)] ?? '');
  const used: string[] = [];
  for (const match of cleaned.matchAll(/\[((?:S\d+(?:, )?)+)\]/g)) {
    for (const marker of match[1].split(', ')) if (!used.includes(marker)) used.push(marker);
  }
  return { text: cleaned, used };
}
