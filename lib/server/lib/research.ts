/**
 * Deep Research: a question in, an answer built from real papers out, every claim cited.
 *
 * Three depths:
 * - Summary: one search, about 8 papers, a short cited answer (1 credit).
 * - Deep: the question split into 3 searches, about 25 papers, a structured report (5 credits).
 * - Detailed: 6 searches, about 50 papers, a long report with tables (20 credits, paid plans).
 * High quality (Pro) uses the stronger model and longer answers, for 3× the credits.
 *
 * Sources are the groups the person picks (All papers, Medical, Preprints, Web, My Library) plus
 * any files they attach. The model may cite only the numbered sources it was given; invented
 * markers are dropped before anything is saved. A consensus line ("14 of 18 studies…") is
 * computed from the cited sources' stances, never typed by the model.
 */
import type { LlmSlot, ChatMessage, LlmUsage } from '../slots/types.js';
import { dropInventedMarkers, usedSources } from './assist-papers.js';
import { searchSources, mergeResults, sortPapers, unpaywall, STUDY_TYPE_LABELS, type FoundPaper, type SearchFilters, type SourceGroup, type WebResult } from './sources/index.js';
import type { ResearchProfile } from './users.js';

export const DEPTHS = ['summary', 'deep', 'detailed'] as const;
export type Depth = (typeof DEPTHS)[number];

export const DEPTH_SETTINGS: Record<Depth, { queries: number; perQuery: number; papers: number; abstractChars: number; words: string; maxTokens: number }> = {
  summary: { queries: 1, perQuery: 14, papers: 8, abstractChars: 900, words: '150 to 250', maxTokens: 900 },
  deep: { queries: 3, perQuery: 18, papers: 25, abstractChars: 800, words: '900 to 1,300', maxTokens: 3200 },
  detailed: { queries: 6, perQuery: 20, papers: 50, abstractChars: 600, words: '2,000 to 3,000', maxTokens: 7000 },
};

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
  /** Filled after the answer: how this source bears on the question. */
  stance?: Stance | null;
  finding?: string | null;
};

export type Stance = 'supports' | 'mixed' | 'against' | 'unclear';
export type Consensus = { applicable: boolean; line: string | null; counts: Record<Stance, number>; total: number };

export type ResearchEvents = {
  status: (stage: 'planning' | 'searching' | 'reading' | 'writing' | 'checking', detail: string) => void;
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
  usage: LlmUsage;
  summary: string;
};

const ROLE_TEXT: Record<string, string> = {
  undergraduate: 'an undergraduate student', honours: 'an honours student', masters: 'a master’s student', phd: 'a doctoral researcher',
  academic: 'an academic', researcher: 'a researcher', clinician: 'a clinician', industry: 'a professional in industry', other: 'a researcher',
};

const usage0 = (): LlmUsage => ({ inputTokens: 0, outputTokens: 0 });
const addUsage = (total: LlmUsage, more: LlmUsage) => { total.inputTokens += more.inputTokens; total.outputTokens += more.outputTokens; };

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

function paperSource(paper: FoundPaper, n: number): ResearchSource {
  return {
    n, marker: `S${n}`, kind: paper.providers.includes('library') ? 'library' : 'paper', id: paper.id, title: paper.title,
    authors: paper.authors.map((author) => author.name), more_authors: paper.extra_author_count ?? 0, year: paper.year, venue: paper.venue,
    doi: paper.doi, url: paper.url, pdf_url: paper.pdf_url, is_oa: paper.is_oa, cited_by_count: paper.cited_by_count,
    study_type: paper.study_type, study_type_label: paper.study_type ? STUDY_TYPE_LABELS[paper.study_type] : null,
    journal_tier: paper.journal?.tier ?? null, is_preprint: paper.is_preprint, is_retracted: Boolean(paper.is_retracted),
    providers: paper.providers, abstract: paper.abstract ? paper.abstract.slice(0, 2400) : null, tldr: paper.tldr,
  };
}

function webSource(result: WebResult, n: number): ResearchSource {
  return {
    n, marker: `S${n}`, kind: 'web', id: result.id, title: result.title, authors: [], more_authors: 0, year: Number(result.published?.slice(0, 4)) || null,
    venue: result.site, doi: null, url: result.url, pdf_url: null, is_oa: true, cited_by_count: null, study_type: null, study_type_label: 'Web page',
    journal_tier: null, is_preprint: false, is_retracted: false, providers: ['web'], abstract: result.snippet, tldr: null,
  };
}

function fileSource(file: Attachment, question: string, n: number): ResearchSource {
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
    return `[${source.marker}] ${authors || source.venue || 'Unknown'} (${source.year ?? 'n.d.'}). ${source.title}. ${source.kind === 'paper' || source.kind === 'library' ? source.venue || '' : source.venue || ''}${labels ? ` [${labels}]` : ''}\n${source.kind === 'file' ? 'Excerpt' : source.kind === 'web' ? 'Page summary' : 'Abstract'}: ${body}`;
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

/** How each cited source bears on the question, for the consensus line and the evidence table. */
export async function judgeStances(llm: LlmSlot, question: string, sources: ResearchSource[], usage: LlmUsage): Promise<Map<number, { stance: Stance; finding: string }>> {
  const out = new Map<number, { stance: Stance; finding: string }>();
  const papers = sources.filter((source) => source.kind !== 'web');
  if (!papers.length) return out;
  try {
    const { text, usage: used } = await llm.complete({
      task: 'fast', temperature: 0, maxTokens: Math.min(4000, 120 + papers.length * 70), json: true,
      messages: [
        { role: 'system', content: 'You label evidence. Answer with JSON only: {"items": [{"n": 1, "stance": "supports|mixed|against|unclear", "finding": "one sentence, at most 25 words"}]}. "supports" means the source\'s findings say yes to the question (or support its claim), "against" no, "mixed" both, "unclear" when it does not test the question. Base each label only on the text given.' },
        { role: 'user', content: `Question: ${question}\n\n${papers.map((source) => `n=${source.n}: ${source.title}. ${(source.abstract || source.tldr || '').slice(0, 900)}`).join('\n\n')}` },
      ],
    });
    addUsage(usage, used);
    for (const item of parseJson<{ items?: { n: number; stance: string; finding: string }[] }>(text)?.items ?? []) {
      const stance = (['supports', 'mixed', 'against', 'unclear'] as Stance[]).includes(item.stance as Stance) ? (item.stance as Stance) : 'unclear';
      if (Number.isInteger(item.n)) out.set(item.n, { stance, finding: String(item.finding || '').slice(0, 300) });
    }
  } catch {
    /* no labels: the answer stands without a consensus line */
  }
  return out;
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

/** Runs one research job end to end. Throws when nothing usable was found or the model fails. */
export async function runResearch(llm: LlmSlot, input: ResearchInput, context: { userId: string; signal?: AbortSignal }, events: ResearchEvents): Promise<ResearchResult> {
  const settings = DEPTH_SETTINGS[input.depth];
  const usage = usage0();
  events.status('planning', input.depth === 'summary' ? 'Reading your question' : 'Planning the searches');
  const queries = await planQueries(llm, input.question, settings.queries, usage);

  events.status('searching', `Searching ${input.groups.map((group) => ({ papers: 'papers', medical: 'PubMed and Europe PMC', preprints: 'preprints', web: 'the web', library: 'your Library' })[group]).join(', ')}`);
  const results = await Promise.all(queries.map((query, index) => searchSources(
    // My Library and the web only for the main question: their results do not improve with more angles.
    { query, groups: index === 0 ? input.groups : input.groups.filter((group) => group !== 'library' && group !== 'web'), filters: input.filters, limit: settings.perQuery, libraryDocumentIds: input.libraryDocumentIds },
    { userId: context.userId },
  ).catch(() => ({ papers: [], web: [], counts: {}, errors: [{ provider: 'openalex' as const, message: 'search failed' }] }))));
  const counts: Record<string, number> = {};
  const errors: { provider: string; message: string }[] = [];
  for (const result of results) {
    for (const [provider, count] of Object.entries(result.counts)) counts[provider] = (counts[provider] ?? 0) + (count ?? 0);
    for (const error of result.errors) if (!errors.some((item) => item.provider === error.provider)) errors.push(error);
  }
  const papers = sortPapers(mergeResults(results.map((result) => result.papers))).slice(0, settings.papers);
  const web = results[0]?.web.slice(0, input.depth === 'summary' ? 3 : 6) ?? [];

  // Open copies for the papers without one (Deep and Detailed): a link the reader can follow.
  if (input.depth !== 'summary') {
    events.status('reading', 'Finding open full texts');
    await Promise.all(papers.filter((paper) => paper.doi && !paper.pdf_url && !paper.oa_url).slice(0, 15).map(async (paper) => {
      const copy = await unpaywall(paper.doi!).catch(() => null);
      if (copy) { paper.oa_url = copy.url; paper.pdf_url = copy.pdf; paper.is_oa = true; }
    }));
  }

  const numbered: ResearchSource[] = [];
  for (const file of input.attachments) numbered.push(fileSource(file, input.question, numbered.length + 1));
  for (const paper of papers) numbered.push(paperSource(paper, numbered.length + 1));
  const webSources = web.map((result) => webSource(result, numbered.length + 1 + web.indexOf(result)));
  const all = [...numbered, ...webSources];
  events.sources(numbered, webSources, { counts, errors, queries });
  if (!all.length) throw new ResearchEmptyError();

  events.status('writing', `Reading ${all.length} source${all.length === 1 ? '' : 's'} and writing`);
  let answer = '';
  const streamed = await llm.stream(
    { messages: researchPrompt(input, all), task: input.highQuality || input.depth !== 'summary' ? 'review' : 'fast', maxTokens: input.highQuality ? Math.round(settings.maxTokens * 1.5) : settings.maxTokens, temperature: 0.3, signal: context.signal },
    (text) => { answer += text; events.delta(text); },
  );
  addUsage(usage, streamed.usage);
  const markdown = dropInventedMarkers(answer.trim(), all, '');
  if (!markdown) throw new Error('The AI returned nothing.');
  const cited = usedSources(markdown, all);

  events.status('checking', 'Weighing the evidence');
  const stances = await judgeStances(llm, input.question, cited, usage);
  for (const source of cited) {
    const label = stances.get(source.n);
    source.stance = label?.stance ?? null;
    source.finding = label?.finding ?? null;
  }
  const consensus = consensusOf(cited);
  const summary = markdown.replace(/^#+.*$/gm, '').replace(/\[S\d+(?:[,\s]*S?\d+)*\]/g, '').replace(/[*_>`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 300);
  return { markdown, sources: cited, all_sources: all, consensus, queries, searched: { counts, errors }, usage, summary };
}

export class ResearchEmptyError extends Error {
  constructor() {
    super('No sources found for this question with these sources and filters. Try broader words, fewer filters or more sources.');
    this.name = 'ResearchEmptyError';
  }
}

/** A follow-up question answered from the same sources. */
export function followUpPrompt(question: string, previous: string, sources: ResearchSource[], profile: ResearchProfile): ChatMessage[] {
  return [
    { role: 'system', content: `You are AI for Research. Answer the follow-up question for ${ROLE_TEXT[profile.role || ''] || 'a researcher'} using only the numbered sources and cite claims with [S1]-style markers. If the sources do not answer it, say so and suggest what to search for. 80 to 300 words, Markdown, no title.` },
    { role: 'user', content: `Earlier answer:\n${previous.slice(0, 6000)}\n\nSources:\n${sourcesBlock(sources, 700)}\n\nFollow-up question: ${question}` },
  ];
}
