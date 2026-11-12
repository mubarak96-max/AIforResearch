/**
 * Deep Research: a question in, an answer built from real papers out, every claim cited.
 *
 * Every job runs seven steps the person watches (researchPipeline.ts): Plan, Search, Screen,
 * Rank, Read, Write and Verify. Three depths:
 * - Summary: one search, about 8 papers, a short cited answer (1 credit).
 * - Deep: 3 sub-questions, about 25 papers, a few full texts, a structured report (7 credits).
 * - Detailed: 5 sub-questions the person can edit first, citation chasing, about 50 papers, a long
 *   report with tables (25 credits, paid plans).
 * High quality (Pro) uses the stronger model and longer answers, for 3× the credits.
 *
 * Sources are the groups the person picks (All papers, Medical, Preprints, Web, My Library) plus
 * any files they attach. The model may cite only the numbered sources it was given; invented
 * markers are dropped before anything is saved. A consensus line ("14 of 18 studies…") is
 * computed from the cited sources' stances, never typed by the model.
 */
import type { LlmSlot, ChatMessage, LlmUsage } from '../slots/types.js';
import { STUDY_TYPE_LABELS, type FoundPaper, type SearchFilters, type SourceGroup, type WebResult } from './sources/index.js';
import type { ResearchProfile } from './users.js';

export const DEPTHS = ['summary', 'deep', 'detailed'] as const;
export type Depth = (typeof DEPTHS)[number];

export type DepthSettings = {
  /** Sub-questions in the plan, and search queries for each. */
  subQuestions: number; queriesPer: number;
  /** Searches in all (the question itself plus the plan's queries), and results asked of each. */
  queries: number; perQuery: number;
  /** Candidates screened, papers kept after ranking, open full texts read. */
  candidates: number; papers: number; fullTexts: number;
  /** Follow the references and citations of the best papers (citation chasing). */
  snowball: boolean;
  /** Most claims and references checked in Verify. */
  claims: number; references: number;
  abstractChars: number; words: string; maxTokens: number;
};

export const DEPTH_SETTINGS: Record<Depth, DepthSettings> = {
  summary: { subQuestions: 1, queriesPer: 1, queries: 1, perQuery: 14, candidates: 30, papers: 8, fullTexts: 0, snowball: false, claims: 12, references: 8, abstractChars: 900, words: '150 to 250', maxTokens: 900 },
  deep: { subQuestions: 3, queriesPer: 1, queries: 4, perQuery: 18, candidates: 90, papers: 25, fullTexts: 4, snowball: false, claims: 40, references: 25, abstractChars: 800, words: '900 to 1,300', maxTokens: 3200 },
  detailed: { subQuestions: 5, queriesPer: 2, queries: 7, perQuery: 20, candidates: 180, papers: 50, fullTexts: 8, snowball: true, claims: 80, references: 40, abstractChars: 600, words: '2,000 to 3,000', maxTokens: 7000 },
};

/** The research plan: sub-questions that together answer the question, each with its searches. */
export type SubQuestion = { question: string; queries: string[] };
export type ResearchPlan = { sub_questions: SubQuestion[] };

export type Attachment = { name: string; text: string };

export type ResearchInput = {
  question: string;
  depth: Depth;
  groups: SourceGroup[];
  filters: SearchFilters;
  headings: boolean;
  highQuality: boolean;
  libraryDocumentIds: string[];
  attachments: Attachment[];
  profile: ResearchProfile;
  /** Overrides the profile's role for this task. */
  role?: string | null;
  language?: string | null;
  /** A plan the person reviewed (Detailed); planned by the model when absent. */
  plan?: ResearchPlan | null;
};

/** One numbered source as the browser and the saved task keep it. */
export type ResearchSource = {
  n: number;
  marker: string;
  kind: 'paper' | 'web' | 'file' | 'library';
  id: string;
  title: string;
  authors: string[];
  more_authors: number;
  year: number | null;
  venue: string | null;
  doi: string | null;
  url: string | null;
  pdf_url: string | null;
  is_oa: boolean;
  cited_by_count: number | null;
  study_type: string | null;
  study_type_label: string | null;
  journal_tier: string | null;
  is_preprint: boolean;
  is_retracted: boolean;
  providers: string[];
  abstract: string | null;
  tldr: string | null;
  /** Filled by Read: how this source bears on the question. */
  stance?: Stance | null;
  finding?: string | null;
  /** Who or what was studied, and the main limitation (Read). */
  sample?: string | null;
  limits?: string | null;
  /** Screen's relevance (0-3) and Rank's score (0-1). */
  relevance?: number | null;
  rank_score?: number | null;
  /** The sub-questions (0-based) whose searches found it. */
  sub_questions?: number[];
  /** Whether Read had the open full text, and the passages it used (not saved with the task). */
  full_text?: boolean;
  passage?: string | null;
  /** Verify's reference check: the DOI at Crossref, and any retraction or correction notice. */
  check?: ReferenceCheck | null;
};

export type ReferenceCheck = { status: 'confirmed' | 'retracted' | 'corrected' | 'concern' | 'unconfirmed' | 'no_doi'; note: string | null };

export type Stance = 'supports' | 'mixed' | 'against' | 'unclear';
export type Consensus = { applicable: boolean; line: string | null; counts: Record<Stance, number>; total: number };

export const STEP_IDS = ['plan', 'search', 'screen', 'rank', 'read', 'write', 'verify'] as const;
export type StepId = (typeof STEP_IDS)[number];
/** One step as the browser shows it: its state, a one-line result and the details behind it. */
export type ResearchStep = { id: StepId; state: 'pending' | 'active' | 'done' | 'failed'; detail: string; data: Record<string, unknown> | null; ms: number | null };

export type ResearchEvents = {
  step: (step: ResearchStep) => void;
  sources: (sources: ResearchSource[], web: ResearchSource[], searched: { counts: Record<string, number>; errors: { provider: string; message: string }[]; queries: string[] }) => void;
  delta: (text: string) => void;
};

export type ResearchResult = {
  markdown: string;
  sources: ResearchSource[];
  all_sources: ResearchSource[];
  consensus: Consensus | null;
  queries: string[];
  searched: { counts: Record<string, number>; errors: { provider: string; message: string }[] };
  plan: ResearchPlan;
  steps: ResearchStep[];
  verification: Verification;
  usage: LlmUsage;
  summary: string;
};

/** What Verify found: claims checked against their sources, and references checked at Crossref. */
export type Verification = {
  claims: { checked: number; supported: number; partly: number; unsupported: number; revised: number };
  references: { checked: number; confirmed: number; retracted: number; corrected: number; unconfirmed: number };
  /** Claims Verify changed or could not fix, and references with a notice, for the reader to see. */
  flags: { kind: 'revised' | 'unsupported' | 'retracted' | 'corrected' | 'concern' | 'unconfirmed'; text: string; revised?: string | null; note: string | null; n?: number | null }[];
  dropped_markers: number;
};

const ROLE_TEXT: Record<string, string> = {
  undergraduate: 'an undergraduate student', honours: 'an honours student', masters: 'a master’s student', phd: 'a doctoral researcher',
  academic: 'an academic', researcher: 'a researcher', clinician: 'a clinician', industry: 'a professional in industry', other: 'a researcher',
};

export const usage0 = (): LlmUsage => ({ inputTokens: 0, outputTokens: 0 });
export const addUsage = (total: LlmUsage, more: LlmUsage) => { total.inputTokens += more.inputTokens; total.outputTokens += more.outputTokens; };

/** JSON from a model answer, tolerating a code fence or text around it. */
export function parseJson<T>(text: string): T | null {
  const body = text.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] ?? text;
  const start = body.search(/[[{]/);
  if (start < 0) return null;
  for (let end = body.length; end > start; end -= 1) {
    if (!/[\]}]/.test(body[end - 1])) continue;
    try { return JSON.parse(body.slice(start, end)) as T; } catch { /* shorter */ }
  }
  return null;
}

/** Search queries for the question: the question itself, plus model-written angles for Deep and Detailed. */
export async function planQueries(llm: LlmSlot, question: string, count: number, usage: LlmUsage): Promise<string[]> {
  const base = question.replace(/\s+/g, ' ').trim().slice(0, 300);
  if (count <= 1) return [base];
  try {
    const { text, usage: used } = await llm.complete({
      task: 'fast', temperature: 0.2, maxTokens: 400, json: true,
      messages: [
        { role: 'system', content: 'You plan literature searches. Answer with JSON only: {"queries": ["…"]}. Each query is 3 to 8 keywords for a scholarly search engine (no Boolean operators, no quotes), in English.' },
        { role: 'user', content: `Research question: ${base}\n\nWrite ${count} different search queries that together find the evidence: the main question, the key mechanisms or outcomes, the populations or settings, and the counter-evidence or limits.` },
      ],
    });
    addUsage(usage, used);
    const queries = (parseJson<{ queries?: string[] }>(text)?.queries ?? []).map((query) => String(query).replace(/["()]/g, ' ').replace(/\s+/g, ' ').trim()).filter((query) => query.length > 3);
    return [base, ...queries].filter((query, index, list) => list.indexOf(query) === index).slice(0, count);
  } catch {
    return [base];
  }
}

/** The parts of an attached file that match the question best (whole file when short). */
export function relevantPassages(text: string, question: string, maxChars = 6000): string {
  if (text.length <= maxChars) return text;
  const terms = new Set((question.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) || []).map((word) => word.slice(0, 6)));
  const chunks = text.match(/[\s\S]{1,1200}(?=\s|$)/g) || [];
  const scored = chunks.map((chunk, index) => {
    const words = chunk.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) || [];
    return { index, chunk, score: words.reduce((sum, word) => sum + (terms.has(word.slice(0, 6)) ? 1 : 0), 0) + (index === 0 ? 3 : 0) };
  });
  const kept = scored.sort((a, b) => b.score - a.score).slice(0, Math.max(1, Math.floor(maxChars / 1200))).sort((a, b) => a.index - b.index);
  return kept.map((item) => item.chunk.trim()).join('\n…\n');
}

export function paperSource(paper: FoundPaper, n: number): ResearchSource {
  return {
    n, marker: `S${n}`, kind: paper.providers.includes('library') ? 'library' : 'paper', id: paper.id, title: paper.title,
    authors: paper.authors.map((author) => author.name), more_authors: paper.extra_author_count ?? 0, year: paper.year, venue: paper.venue,
    doi: paper.doi, url: paper.url, pdf_url: paper.pdf_url, is_oa: paper.is_oa, cited_by_count: paper.cited_by_count,
    study_type: paper.study_type, study_type_label: paper.study_type ? STUDY_TYPE_LABELS[paper.study_type] : null,
    journal_tier: paper.journal?.tier ?? null, is_preprint: paper.is_preprint, is_retracted: Boolean(paper.is_retracted),
    providers: paper.providers, abstract: paper.abstract ? paper.abstract.slice(0, 2400) : null, tldr: paper.tldr,
  };
}

export function webSource(result: WebResult, n: number): ResearchSource {
  return {
    n, marker: `S${n}`, kind: 'web', id: result.id, title: result.title, authors: [], more_authors: 0, year: Number(result.published?.slice(0, 4)) || null,
    venue: result.site, doi: null, url: result.url, pdf_url: null, is_oa: true, cited_by_count: null, study_type: null, study_type_label: 'Web page',
    journal_tier: null, is_preprint: false, is_retracted: false, providers: ['web'], abstract: result.snippet, tldr: null,
  };
}

export function fileSource(file: Attachment, question: string, n: number): ResearchSource {
  return {
    n, marker: `S${n}`, kind: 'file', id: `file:${n}`, title: file.name, authors: [], more_authors: 0, year: null, venue: 'Attached file',
    doi: null, url: null, pdf_url: null, is_oa: false, cited_by_count: null, study_type: null, study_type_label: 'Your file', journal_tier: null,
    is_preprint: false, is_retracted: false, providers: ['file'], abstract: relevantPassages(file.text, question), tldr: null,
  };
}

/** The numbered source list the model reads. */
export function sourcesBlock(sources: ResearchSource[], abstractChars: number): string {
  return sources.map((source) => {
    const authors = source.authors.length > 3 ? `${source.authors.slice(0, 3).join(', ')} et al.` : source.authors.join(', ');
    const labels = [source.study_type_label, source.is_preprint ? 'preprint, not peer reviewed' : null, source.cited_by_count ? `cited ${source.cited_by_count} times` : null].filter(Boolean).join('; ');
    const limit = source.kind === 'file' ? 6000 : abstractChars;
    const body = (source.abstract || source.tldr || 'No abstract available.').replace(/\s+/g, ' ').slice(0, limit);
    const read = [
      source.finding ? `Key finding: ${source.finding}` : null,
      source.sample ? `Studied: ${source.sample}` : null,
      source.limits ? `Main limitation: ${source.limits}` : null,
      source.passage ? `Full-text excerpt: ${source.passage.replace(/\s+/g, ' ').slice(0, 2400)}` : null,
    ].filter(Boolean).join('\n');
    return `[${source.marker}] ${authors || source.venue || 'Unknown'} (${source.year ?? 'n.d.'}). ${source.title}. ${source.venue || ''}${labels ? ` [${labels}]` : ''}\n${source.kind === 'file' ? 'Excerpt' : source.kind === 'web' ? 'Page summary' : 'Abstract'}: ${body}${read ? `\n${read}` : ''}`;
  }).join('\n\n');
}

export function researchPrompt(input: ResearchInput, sources: ResearchSource[]): ChatMessage[] {
  const settings = DEPTH_SETTINGS[input.depth];
  const reader = ROLE_TEXT[input.role || input.profile.role || ''] || 'a researcher';
  const field = input.profile.field ? ` in ${input.profile.field}` : '';
  const structure = !input.headings
    ? 'Write flowing paragraphs without headings. Keep the most direct answer in the first paragraph.'
    : input.depth === 'summary'
      ? 'Start with a one-paragraph direct answer, then 2–4 short bullet points of the key findings. Use no headings.'
      : input.depth === 'deep'
        ? 'Use these Markdown sections: ## Summary (3–4 sentences that answer the question), ## What the evidence shows (grouped by theme with ### subheadings), ## Where studies disagree, ## Limits of the evidence, ## Open questions.'
        : 'Use these Markdown sections: ## Summary, ## Background, ## What the evidence shows (grouped by theme with ### subheadings), ## Comparison of studies (a Markdown table: Source | Design | Population or setting | Main finding), ## Where studies disagree and why, ## Quality and limits of the evidence, ## Implications, ## Open questions and future research.';
  const system = [
    'You are AI for Research, a research assistant that answers only from the numbered sources given.',
    `Write for ${reader}${field}, in clear, plain, formal language; prefer short common words and direct sentences.`,
    'Cite every factual claim with its source marker in square brackets right after the claim, e.g. [S2] or [S1, S4]. Cite only what a source says; never invent sources, authors, years, numbers or markers, and do not write a reference list.',
    'Markers are not words: never write "S2 suggests"; describe the finding and put the marker after it.',
    'Weigh the evidence: meta-analyses and systematic reviews outweigh single studies, larger and more recent studies outweigh smaller ones, and preprints are not peer reviewed. Say so where it matters.',
    'If the sources do not answer part of the question, say that plainly instead of guessing.',
    `Length: about ${settings.words} words. ${structure}`,
    `Answer in ${input.language || 'the language of the question'}. Markdown only; no title line, no preamble, no closing offer of help; never mention being an AI.`,
  ].join(' ');
  return [
    { role: 'system', content: system },
    { role: 'user', content: `Question: ${input.question}\n\nSources:\n${sourcesBlock(sources, settings.abstractChars)}` },
  ];
}

/** "14 of 18 studies support…": counted from the labels, shown only when most sources test the question. */
export function consensusOf(sources: ResearchSource[]): Consensus | null {
  const labelled = sources.filter((source) => source.kind !== 'web' && source.stance);
  if (!labelled.length) return null;
  const counts: Record<Stance, number> = { supports: 0, mixed: 0, against: 0, unclear: 0 };
  for (const source of labelled) counts[source.stance!] += 1;
  const tested = counts.supports + counts.mixed + counts.against;
  const applicable = tested >= 2 && tested >= labelled.length / 2;
  const line = applicable
    ? `${counts.supports} of ${tested} studies that test the question support it${counts.mixed ? `, ${counts.mixed} ${counts.mixed === 1 ? 'is' : 'are'} mixed` : ''}${counts.against ? `, ${counts.against} ${counts.against === 1 ? 'does' : 'do'} not` : ''}.`
    : null;
  return { applicable, line, counts, total: labelled.length };
}

export class ResearchEmptyError extends Error {
  constructor() {
    super('No sources found for this question with these sources and filters. Try broader words, fewer filters or more sources.');
    this.name = 'ResearchEmptyError';
  }
}

// ------------------------------------------------------------------ headings on or off after the fact

const HEADING_LINE = /^#{1,6}[ \t]+\S.*$/gm;

/** Whether a Markdown answer has section headings. */
export const hasHeadings = (markdown: string) => /^#{1,6}[ \t]+\S/m.test(markdown);

/** The same answer as flowing text: heading lines removed, nothing else touched. */
export function stripHeadings(markdown: string): string {
  return markdown.replace(HEADING_LINE, '').replace(/\n{3,}/g, '\n\n').trim();
}

/** The answer split into blocks (paragraphs, lists, tables) at blank lines. */
const blocksOf = (markdown: string) => markdown.trim().split(/\n[ \t]*\n+/).map((block) => block.trim()).filter(Boolean);

/** Asks only where headings go and what they say, so the cited text is never rewritten. */
export function headingsPrompt(markdown: string, depth: Depth): ChatMessage[] {
  const blocks = blocksOf(markdown);
  const sections = depth === 'detailed' ? '5 to 8' : depth === 'deep' ? '3 to 6' : '2 to 3';
  return [
    {
      role: 'system',
      content: `You add section headings to a finished research answer without changing its text. The answer is given as numbered blocks. Answer with JSON only: {"headings": [{"before": 0, "level": 2, "text": "Summary"}]}. "before" is the number of the block the heading goes above. Use level 2 for ${sections} main sections (the first one above block 0, e.g. "Summary") and level 3 only for themes inside a long section. Headings are short (2 to 6 words), plain, in the language of the answer, with no citation markers and no numbering.`,
    },
    { role: 'user', content: blocks.map((block, index) => `[${index}]\n${block}`).join('\n\n') },
  ];
}

/** Inserts the model's headings above their blocks; returns null when none are usable. */
export function applyHeadings(markdown: string, answer: string): string | null {
  const blocks = blocksOf(markdown);
  const above = new Map<number, string[]>();
  for (const item of parseJson<{ headings?: { before?: unknown; level?: unknown; text?: unknown }[] }>(answer)?.headings ?? []) {
    const before = Number(item.before);
    const text = String(item.text ?? '').replace(/\[S\d+[^\]]*\]/g, '').replace(/[#*_`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 90);
    if (!Number.isInteger(before) || before < 0 || before >= blocks.length || !text) continue;
    const line = `${Number(item.level) === 3 ? '###' : '##'} ${text}`;
    above.set(before, [...(above.get(before) ?? []), line]);
  }
  if (!above.size) return null;
  return blocks.map((block, index) => [...(above.get(index) ?? []), block].join('\n\n')).join('\n\n');
}

/** A follow-up question answered from the same sources. */
export function followUpPrompt(question: string, previous: string, sources: ResearchSource[], profile: ResearchProfile): ChatMessage[] {
  return [
    { role: 'system', content: `You are AI for Research. Answer the follow-up question for ${ROLE_TEXT[profile.role || ''] || 'a researcher'} using only the numbered sources and cite claims with [S1]-style markers. If the sources do not answer it, say so and suggest what to search for. 80 to 300 words, Markdown, no title.` },
    { role: 'user', content: `Earlier answer:\n${previous.slice(0, 6000)}\n\nSources:\n${sourcesBlock(sources, 700)}\n\nFollow-up question: ${question}` },
  ];
}
