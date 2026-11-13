/**
 * Deep Research, step by step, the way a literature review is done:
 *
 *   1. Plan      the question split into sub-questions, each with its own searches (Detailed: the
 *                person may edit the plan before anything is charged; see POST /research/plan).
 *   2. Search    every search against the chosen sources, merged and de-duplicated; Deep and
 *                Detailed also follow the references and citations of the best papers.
 *   3. Screen    a fast model reads titles and abstracts and scores each paper's relevance (0-3);
 *                retracted and off-topic papers are excluded, each with a reason.
 *   4. Rank      an evidence score (study design, relevance, citations a year, recency, journal),
 *                with every sub-question kept covered. Computed, never typed by a model.
 *   5. Read      the open full texts of the best papers, then one finding, sample, limitation,
 *                stance and effect size per paper (an effect size is kept only when its numbers
 *                are written in the paper's text).
 *   6. Fill gaps Deep and Detailed: the model names where the evidence is thin or conflicting, and
 *                a second round of searches, screening and reading fills it.
 *   7. Write     Summary: one streamed answer. Deep and Detailed: an outline, then each section
 *                from its own sources, with computed Methods, figures and tables (researchReport.ts).
 *   8. Verify    each cited sentence checked against its sources (unsupported ones are narrowed
 *                or flagged), invented markers dropped, and each cited DOI checked at Crossref for
 *                retractions and corrections.
 *
 * Each step sends its start and its result (events.step). The finished steps are saved with the
 * task, so a saved answer shows how it was made.
 */
import type { LlmSlot, LlmUsage } from '../slots/types.js';
import { USER_AGENT } from '../env.js';
import { dropInventedMarkers, queryFromText, sharesTopic, usedSources } from './assist-papers.js';
import { extractText } from './fileText.js';
import {
  applyFilters, cleanRecordTerms, crossrefUpdates, crossrefWork, doiKey, findRecords, isRecordGroup, mergeResults, recordTermsFromText, recordTermsPrompt, searchSources,
  semanticScholarLinks, sortPapers, titleKey, unpaywall,
  type FoundPaper, type RecordGroup, type RecordSource, type SearchFilters, type StudyType,
} from './sources/index.js';
import { net } from './sources/http.js';
import {
  DEPTH_SETTINGS, ResearchEmptyError, STEP_IDS, addUsage, consensusOf, fileSource, paperSource, parseJson, recordSource, relevantPassages, researchPrompt, sourceEvidenceBasis, stripHeadings, usage0, webSource,
  type Depth, type ResearchEvents, type ResearchInput, type ResearchPlan, type ResearchResult, type ResearchSource, type ResearchStep, type Stance,
  type StepId, type SubQuestion, type Verification,
} from './research.js';
import { checkedEffect, type Effect, type PrismaData, type ResearchFigure } from './researchFigures.js';
import {
  buildFigures, cleanOutline, closingPrompt, comparisonTable, glanceText, methodsText, outlinePrompt, sectionPrompt, summaryPrompt,
} from './researchReport.js';
import { RANKING_DESCRIPTIONS, RESEARCH_METHOD_LABELS, appraisalGuidance, researchMethod, searchLanguageGuidance, type ResearchMethod } from '../../researchMethods.js';

type Signal = AbortSignal | undefined;

/** Runs `work` over `items`, at most `limit` at a time, keeping the order. */
export async function mapLimit<T, R>(items: T[], limit: number, work: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      out[index] = await work(items[index], index);
    }
  });
  await Promise.all(runners);
  return out;
}

const chunk = <T>(items: T[], size: number) => Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, index * size + size));
const plural = (count: number, word: string, many = `${word}s`) => `${count.toLocaleString('en-US')} ${count === 1 ? word : many}`;
const clip = (text: string | null | undefined, max: number) => (text || '').replace(/\s+/g, ' ').trim().slice(0, max);

// ------------------------------------------------------------------ 1. Plan

const cleanQuery = (query: unknown) => String(query ?? '').replace(/["()]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);

/** A plan from the model or the person, made safe: sizes capped, empty searches filled from the sub-question. */
export function cleanPlan(raw: unknown, maxSubs: number, maxQueries: number): ResearchPlan {
  const subs = Array.isArray((raw as ResearchPlan | null)?.sub_questions) ? (raw as ResearchPlan).sub_questions : [];
  const sub_questions: SubQuestion[] = [];
  for (const item of subs) {
    const question = clip(String(item?.question ?? ''), 300);
    if (question.length < 3 || sub_questions.some((sub) => sub.question.toLowerCase() === question.toLowerCase())) continue;
    let queries = (Array.isArray(item?.queries) ? item.queries : []).map(cleanQuery).filter((query) => query.length > 3);
    if (!queries.length) queries = [queryFromText(question, 8) || question.slice(0, 200)];
    sub_questions.push({ question, queries: [...new Set(queries)].slice(0, maxQueries) });
    if (sub_questions.length >= maxSubs) break;
  }
  return { sub_questions };
}

/** Sub-questions that together answer the question. Summary keeps the question whole (no model call). */
export async function planResearch(llm: LlmSlot, question: string, depth: Depth, usage: LlmUsage, signal?: Signal, options?: { method?: ResearchMethod; searchLanguages?: string[] }): Promise<ResearchPlan> {
  const base = clip(question, 300);
  const whole: ResearchPlan = { sub_questions: [{ question: base, queries: [base] }] };
  const settings = DEPTH_SETTINGS[depth];
  if (settings.subQuestions <= 1) return whole;
  try {
    const { text, usage: used } = await llm.complete({
      task: 'fast', temperature: 0.2, maxTokens: 700, json: true, signal,
      messages: [
        {
          role: 'system',
          content: 'You plan literature reviews. Answer with JSON only: {"sub_questions": [{"question": "…", "queries": ["…"]}]}. '
            + 'Sub-questions are short, answerable from published studies, do not overlap, and are written in the language of the research question. '
            + 'Queries are 3 to 8 keywords for a scholarly search engine, with no Boolean operators and no quotes. '
            + searchLanguageGuidance(options?.searchLanguages) + ' ' + appraisalGuidance(options?.method),
        },
        {
          role: 'user',
          content: `Research question: ${base}\n\nWrite ${settings.subQuestions} sub-questions that together answer it. Cover, where they apply: the main effect or answer, the mechanisms, the populations or settings, how it compares with alternatives, and the counter-evidence or limits. Give each sub-question ${settings.queriesPer} different search ${settings.queriesPer === 1 ? 'query' : 'queries'}.`,
        },
      ],
    });
    addUsage(usage, used);
    const plan = cleanPlan(parseJson(text), settings.subQuestions, settings.queriesPer);
    return plan.sub_questions.length ? plan : whole;
  } catch (error) {
    if (signal?.aborted) throw error;
    return whole;
  }
}

/** The searches to run: the question itself first, then each sub-question's first query, then the rest. */
export function planSearches(question: string, plan: ResearchPlan, max: number): { query: string; sub: number }[] {
  const out: { query: string; sub: number }[] = [{ query: clip(question, 300), sub: -1 }];
  const most = Math.max(0, ...plan.sub_questions.map((sub) => sub.queries.length));
  for (let round = 0; round < most; round += 1) {
    plan.sub_questions.forEach((sub, index) => {
      const query = sub.queries[round];
      if (query && !out.some((item) => item.query.toLowerCase() === query.toLowerCase())) out.push({ query, sub: index });
    });
  }
  return out.slice(0, Math.max(1, max));
}

// ------------------------------------------------------------------ 2. Search

const paperKey = (paper: { doi: string | null; title: string }) => doiKey(paper.doi) ?? `t:${titleKey(paper.title)}`;

type SearchOutcome = {
  candidates: FoundPaper[];
  web: Awaited<ReturnType<typeof searchSources>>['web'];
  counts: Record<string, number>;
  errors: { provider: string; message: string }[];
  /** Results returned (every service, every search) and distinct papers after merging. */
  found: number;
  unique: number;
  chased: number;
  subsOf: Map<string, Set<number>>;
  /** Every distinct paper the searches returned, so the gap round looks only at new ones. */
  seen: Set<string>;
};

async function searchStep(input: ResearchInput, plan: ResearchPlan, userId: string): Promise<SearchOutcome> {
  const settings = DEPTH_SETTINGS[input.depth];
  const searches = planSearches(input.question, plan, settings.queries);
  // A few at a time: Detailed runs over twenty searches, each against several services.
  const results = await mapLimit(searches, 6, ({ query }, index) => searchSources(
    // My Library and the web only for the main question: their results do not improve with more angles.
    { query, groups: index === 0 ? input.groups : input.groups.filter((group) => group !== 'library' && group !== 'web'), filters: input.filters, limit: settings.perQuery, libraryDocumentIds: input.libraryDocumentIds },
    { userId },
  ).catch(() => ({ papers: [] as FoundPaper[], web: [], counts: {} as Record<string, number>, errors: [{ provider: 'openalex', message: 'search failed' }] })));

  const counts: Record<string, number> = {};
  const errors: { provider: string; message: string }[] = [];
  const subsOf = new Map<string, Set<number>>();
  const lists: FoundPaper[][] = [];
  results.forEach((result, index) => {
    for (const [provider, count] of Object.entries(result.counts)) counts[provider] = (counts[provider] ?? 0) + (count ?? 0);
    for (const error of result.errors) if (!errors.some((item) => item.provider === error.provider)) errors.push(error);
    lists.push(result.papers);
    const sub = searches[index].sub;
    for (const paper of result.papers) {
      const key = paperKey(paper);
      if (!subsOf.has(key)) subsOf.set(key, new Set());
      if (sub >= 0) subsOf.get(key)!.add(sub);
    }
  });
  let found = Object.entries(counts).filter(([provider]) => provider !== 'web').reduce((sum, [, count]) => sum + count, 0);

  // Citation chasing: the references and citations of the best papers so far.
  let chased = 0;
  if (settings.snowball > 0) {
    const seeds = sortPapers(mergeResults(lists)).filter((paper) => paper.doi).slice(0, settings.snowball);
    const links = await mapLimit(seeds.flatMap((paper) => (['references', 'citations'] as const).map((direction) => ({ paper, direction }))), 4, ({ paper, direction }) =>
      semanticScholarLinks(`DOI:${paper.doi}`, direction, 25).catch(() => [] as FoundPaper[]));
    const chasedPapers = applyFilters(links.flat().filter((paper) => paper.title && paper.title !== 'Untitled'), { excludeRetracted: true, ...input.filters });
    chased = chasedPapers.length;
    found += chased;
    if (chased) lists.push(chasedPapers);
  }

  const library = lists.flat().filter((paper) => paper.providers.includes('library'));
  const merged = sortPapers(mergeResults(lists));
  const candidates = [...new Map([...merged.slice(0, settings.candidates), ...merged.filter((paper) => library.some((item) => paperKey(item) === paperKey(paper)))].map((paper) => [paperKey(paper), paper])).values()];
  return { candidates, web: results[0]?.web.slice(0, input.depth === 'summary' ? 3 : 8) ?? [], counts, errors, found, unique: merged.length, chased, subsOf, seen: new Set(merged.map(paperKey)) };
}

/**
 * Database records for the field source groups (life sciences, chemistry): a fast model names the
 * genes, proteins, compounds and variants in the question (a pattern match when it names none),
 * then each database is asked for a few records. Never fails the run.
 */
export async function recordStep(llm: LlmSlot, question: string, groups: RecordGroup[], usage: LlmUsage, signal?: Signal): Promise<{ records: RecordSource[]; counts: Record<string, number> }> {
  if (!groups.length) return { records: [], counts: {} };
  let terms = recordTermsFromText(question);
  try {
    const { text, usage: used } = await llm.complete({ task: 'fast', temperature: 0, maxTokens: 250, json: true, signal, messages: recordTermsPrompt(question, groups) });
    addUsage(usage, used);
    const picked = cleanRecordTerms(parseJson(text));
    if (picked.genes.length || picked.proteins.length || picked.compounds.length || picked.variants.length) terms = picked;
  } catch (error) {
    if (signal?.aborted) throw error;
  }
  try {
    return await findRecords(groups, terms);
  } catch (error) {
    console.warn(`[records] skipped: ${(error as Error)?.message || 'failed'}`);
    return { records: [], counts: {} };
  }
}

// ------------------------------------------------------------------ 3. Screen

export type Screening = { relevance: number; reason: string | null };

/** Relevance 0-3 for each candidate from its title and abstract. A batch the model fails falls back to word overlap. */
export async function screenPapers(llm: LlmSlot, question: string, plan: ResearchPlan, papers: FoundPaper[], usage: LlmUsage, signal?: Signal): Promise<Screening[]> {
  const subs = plan.sub_questions.length > 1 ? `\nSub-questions:\n${plan.sub_questions.map((sub, index) => `${index + 1}. ${sub.question}`).join('\n')}` : '';
  const out: Screening[] = papers.map((paper) => ({ relevance: sharesTopic(question, paper, 2) ? 2 : 1, reason: null }));
  await mapLimit(chunk(papers.map((paper, index) => ({ paper, index })), 30), 4, async (batch) => {
    try {
      const { text, usage: used } = await llm.complete({
        task: 'fast', temperature: 0, maxTokens: 120 + batch.length * 28, json: true, signal,
        messages: [
          {
            role: 'system',
            content: 'You screen papers for a literature review from their titles and abstracts. Answer with JSON only: {"items": [{"i": 0, "r": 2, "why": "…"}]}, one item per paper. '
              + '"r" is relevance to the research question: 3 = studies the question directly, 2 = studies a sub-question or a key part of it, 1 = related background only, 0 = off-topic. '
              + '"why" only when r is 0 or 1: the reason in at most 8 words.',
          },
          { role: 'user', content: `Research question: ${clip(question, 400)}${subs}\n\nPapers:\n${batch.map(({ paper, index }) => `i=${index}: ${clip(paper.title, 220)} (${paper.year ?? 'n.d.'}). ${clip(paper.abstract || paper.tldr, 380)}`).join('\n')}` },
        ],
      });
      addUsage(usage, used);
      for (const item of parseJson<{ items?: { i: number; r: number; why?: string }[] }>(text)?.items ?? []) {
        const index = Number(item.i);
        if (!batch.some((entry) => entry.index === index)) continue;
        const relevance = Math.max(0, Math.min(3, Math.round(Number(item.r))));
        if (Number.isFinite(relevance)) out[index] = { relevance, reason: relevance <= 1 ? clip(item.why, 80) || null : null };
      }
    } catch (error) {
      if (signal?.aborted) throw error;
      /* this batch keeps its word-overlap scores */
    }
  });
  return out;
}

// ------------------------------------------------------------------ 4. Rank

const DESIGN_WEIGHT: Partial<Record<StudyType, number>> = {
  'meta-analysis': 1, 'systematic-review': 0.95, rct: 0.85, 'clinical-trial': 0.72, cohort: 0.62, 'case-control': 0.52, experiment: 0.52,
  review: 0.5, 'cross-sectional': 0.45, qualitative: 0.45, 'case-report': 0.25, other: 0.4,
};
const TIER_WEIGHT: Record<string, number> = { top: 1, high: 0.75, medium: 0.5, low: 0.25 };

/** Retrieval ranking, not a quality assessment. The three-argument call retains the clinical ranking. */
export function evidenceScore(paper: Pick<FoundPaper, 'study_type' | 'cited_by_count' | 'year' | 'journal' | 'is_preprint'>, relevance: number, now = new Date().getUTCFullYear(), method: ResearchMethod = 'clinical'): number {
  const rel = [0, 0.25, 0.6, 1][Math.max(0, Math.min(3, relevance))];
  if (method === 'general' || method === 'humanities') return rel;
  if (method === 'qualitative') {
    const fit = paper.study_type === 'qualitative' ? 1 : paper.study_type === 'systematic-review' || paper.study_type === 'review' ? 0.7 : 0.5;
    return Math.round((rel * 0.85 + fit * 0.15) * 1000) / 1000;
  }
  if (method === 'policy' || method === 'quantitative') {
    const recency = paper.year ? Math.max(0, 1 - Math.max(0, now - paper.year) / 15) : 0.5;
    return Math.round((rel * 0.95 + recency * 0.05) * 1000) / 1000;
  }
  const design = paper.study_type ? DESIGN_WEIGHT[paper.study_type] ?? 0.4 : 0.4;
  const age = paper.year ? Math.max(0, now - paper.year) : 10;
  const perYear = (paper.cited_by_count ?? 0) / (age + 1);
  const citations = Math.min(1, Math.log10(perYear + 1) / 2);
  const recency = paper.year ? Math.max(0, 1 - age / 15) : 0.2;
  const journal = paper.journal?.tier ? TIER_WEIGHT[paper.journal.tier] ?? 0.35 : 0.35;
  const score = rel * 0.45 + design * 0.25 + citations * 0.15 + recency * 0.08 + journal * 0.07 - (paper.is_preprint ? 0.05 : 0);
  return Math.round(Math.max(0, Math.min(1, score)) * 1000) / 1000;
}

/** The best `count` papers by score, with each sub-question's best two kept first so none goes unanswered. */
export function pickPapers<T extends { score: number; subs: number[] }>(papers: T[], count: number, subQuestions: number): T[] {
  const ordered = [...papers].sort((a, b) => b.score - a.score);
  const picked = new Set<T>();
  if (subQuestions > 1) {
    for (let sub = 0; sub < subQuestions; sub += 1) {
      for (const paper of ordered.filter((item) => item.subs.includes(sub)).slice(0, 2)) if (picked.size < count) picked.add(paper);
    }
  }
  for (const paper of ordered) {
    if (picked.size >= count) break;
    picked.add(paper);
  }
  return ordered.filter((paper) => picked.has(paper));
}

// ------------------------------------------------------------------ 5. Read

const MAX_PDF_BYTES = 15 * 1024 * 1024;

/** Only public https addresses: an open-access link from a paper's record is never a way into this network. */
export function fetchableUrl(raw: string | null | undefined): URL | null {
  try {
    const url = new URL(String(raw));
    if (url.protocol !== 'https:') return null;
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal') || /^[\d.]+$/.test(host) || host.includes(':')) return null;
    return url;
  } catch {
    return null;
  }
}

/** The passages of an open-access PDF that bear on the question, or null when it cannot be read. */
export async function openFullText(link: string | null | undefined, question: string): Promise<string | null> {
  const url = fetchableUrl(link);
  if (!url) return null;
  try {
    const response = await net.fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/pdf' }, redirect: 'follow', signal: AbortSignal.timeout(15_000) });
    if (!response.ok || Number(response.headers.get('content-length')) > MAX_PDF_BYTES) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    // %PDF: a landing page served instead of the file is skipped.
    if (bytes.byteLength > MAX_PDF_BYTES || bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46) return null;
    const { text, pages } = await extractText('paper.pdf', bytes);
    if (pages?.length) {
      // Each retained excerpt keeps its actual converter page; no page number is inferred by AI.
      const terms = new Set(question.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []);
      const selected = pages.filter((page) => page.text.trim()).map((page) => ({
        ...page, score: (page.text.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []).reduce((sum, word) => sum + (terms.has(word) ? 1 : 0), 0),
      })).sort((a, b) => b.score - a.score).slice(0, 3).sort((a, b) => a.page - b.page);
      return selected.map((page) => `[Page ${page.page}]\n${relevantPassages(page.text, question, 950)}`).join('\n\n') || null;
    }
    return text.trim() ? relevantPassages(text, question, 3000) : null;
  } catch {
    return null;
  }
}

type Reading = { stance: Stance; finding: string; sample: string | null; limits: string | null; effect: Effect | null };

/**
 * One finding, sample, limitation, stance and effect size per paper, from its abstract and any
 * full-text passages. An effect size survives only when its estimate and both interval bounds are
 * written in the text the model read (checkedEffect).
 */
export async function readPapers(llm: LlmSlot, question: string, sources: ResearchSource[], usage: LlmUsage, signal?: Signal): Promise<Map<number, Reading>> {
  const out = new Map<number, Reading>();
  const papers = sources.filter((source) => source.kind === 'paper' || source.kind === 'library');
  const textOf = (source: ResearchSource) => ({ abstract: clip(source.abstract || source.tldr, 1200), passage: source.passage ? clip(source.passage, 2600) : '' });
  await mapLimit(chunk(papers, 8), 4, async (batch) => {
    try {
      const { text, usage: used } = await llm.complete({
        task: 'fast', temperature: 0, maxTokens: 150 + batch.length * 160, json: true, signal,
        messages: [
          {
            role: 'system',
            content: 'You extract evidence for a literature review. Answer with JSON only: {"items": [{"n": 1, "stance": "supports|mixed|against|unclear", "finding": "…", "sample": "…", "limits": "…", "effect": null}]}, one item per paper. '
              + '"finding": the result that bears on the question, one sentence of at most 35 words, with the numbers given. '
              + '"sample": who or what was studied and how many (e.g. "1,204 adults in 3 cohorts"), or null. "limits": the main limitation in at most 12 words, or null. '
              + '"stance": "supports" when the findings say yes to the question (or support its claim), "against" no, "mixed" both, "unclear" when the paper does not test it. '
              + '"effect": the main effect size for the question with its 95% confidence interval, copied exactly as written in the text: {"measure": "OR|RR|HR|IRR|MD|SMD|r", "value": 1.32, "low": 1.10, "high": 1.58, "outcome": "the outcome in at most 8 words"}; '
              + 'null when the text gives no confidence interval. Never compute, convert or round numbers. Use only the text given.',
          },
          {
            role: 'user',
            content: `Question: ${clip(question, 400)}\n\n${batch.map((source) => {
              const { abstract, passage } = textOf(source);
              return `n=${source.n}: ${clip(source.title, 220)} (${source.year ?? 'n.d.'})${source.study_type_label ? ` [${source.study_type_label}]` : ''}\nAbstract: ${abstract || 'none'}${passage ? `\nFull text: ${passage}` : ''}`;
            }).join('\n\n')}`,
          },
        ],
      });
      addUsage(usage, used);
      for (const item of parseJson<{ items?: { n: number; stance: string; finding?: string; sample?: string | null; limits?: string | null; effect?: unknown }[] }>(text)?.items ?? []) {
        const source = batch.find((entry) => entry.n === Number(item.n));
        if (!source) continue;
        const stance = (['supports', 'mixed', 'against', 'unclear'] as Stance[]).includes(item.stance as Stance) ? (item.stance as Stance) : 'unclear';
        const finding = clip(item.finding, 320);
        const { abstract, passage } = textOf(source);
        if (finding) out.set(source.n, { stance, finding, sample: clip(item.sample, 120) || null, limits: clip(item.limits, 120) || null, effect: checkedEffect(item.effect, `${abstract} ${passage}`) });
      }
    } catch (error) {
      if (signal?.aborted) throw error;
      /* unread papers are written from their abstracts */
    }
  });
  return out;
}

/** Open full texts for papers that have none yet: Unpaywall for a free copy, then the PDF's passages on the question. */
async function readFullTexts(items: { paper: FoundPaper; source: ResearchSource }[], max: number, question: string) {
  if (max <= 0) return;
  const top = items.slice(0, Math.max(max * 2, 12));
  await mapLimit(top.filter((item) => item.paper.doi && !item.paper.pdf_url), 5, async (item) => {
    const copy = await unpaywall(item.paper.doi!).catch(() => null);
    if (copy) { item.paper.oa_url = copy.url; item.paper.pdf_url = copy.pdf; item.paper.is_oa = true; }
  });
  const open = top.filter((item) => item.paper.pdf_url).slice(0, max);
  await mapLimit(open, 4, async (item) => {
    item.source.pdf_url = item.paper.pdf_url;
    item.source.is_oa = item.paper.is_oa;
    const passage = await openFullText(item.paper.pdf_url, question);
    if (passage) { item.source.passage = passage; item.source.full_text = true; }
  });
}

// ------------------------------------------------------------------ 6. Fill gaps

export type Gap = { sub: number; gap: string; query: string };

/** Where the evidence read so far is thin, conflicting or missing a population, outcome or design, each with a new search. */
export async function findGaps(llm: LlmSlot, question: string, plan: ResearchPlan, sources: ResearchSource[], ran: string[], count: number, usage: LlmUsage, signal?: Signal, options?: { method?: ResearchMethod; searchLanguages?: string[] }): Promise<Gap[]> {
  if (count <= 0) return [];
  const papers = sources.filter((source) => source.kind === 'paper' || source.kind === 'library');
  const bySub = plan.sub_questions.map((sub, index) => {
    const own = papers.filter((source) => source.sub_questions?.includes(index));
    const lines = own.slice(0, 12).map((source) => `   - ${source.year ?? 'n.d.'}, ${source.study_type_label ?? 'design unknown'}, ${source.stance ?? 'unread'}: ${clip(source.finding || source.title, 160)}`);
    return `${index + 1}. ${sub.question} (${own.length} papers)\n${lines.join('\n') || '   - none yet'}`;
  }).join('\n');
  try {
    const { text, usage: used } = await llm.complete({
      task: 'fast', temperature: 0.2, maxTokens: 120 + count * 90, json: true, signal,
      messages: [
        {
          role: 'system',
          content: 'You review the evidence gathered so far for a literature review and find its gaps. Answer with JSON only: {"gaps": [{"sub": 1, "gap": "…", "query": "…"}]}. '
            + 'A gap is a sub-question with few or weak studies, conflicting findings that need more studies, or an important population, outcome, comparison or study design not yet covered. '
            + '"sub": the sub-question number it belongs to (0 for the question as a whole). "gap": what is missing, in at most 15 words, in the language of the question. '
            + '"query": 3 to 8 keywords for a scholarly search engine, no Boolean operators and no quotes, different from the searches already run. '
            + searchLanguageGuidance(options?.searchLanguages) + ' ' + appraisalGuidance(options?.method) + ' '
            + `At most ${count} gaps, the most important first; none when the evidence is already well covered.`,
        },
        { role: 'user', content: `Question: ${clip(question, 400)}\n\nWhat was found, by sub-question:\n${bySub}\n\nSearches already run:\n${ran.map((query) => `- ${query}`).join('\n')}` },
      ],
    });
    addUsage(usage, used);
    const seen = new Set(ran.map((query) => query.toLowerCase()));
    const gaps: Gap[] = [];
    for (const item of parseJson<{ gaps?: { sub?: unknown; gap?: unknown; query?: unknown }[] }>(text)?.gaps ?? []) {
      const query = cleanQuery(item.query);
      if (query.length <= 3 || seen.has(query.toLowerCase())) continue;
      seen.add(query.toLowerCase());
      const sub = Math.round(Number(item.sub));
      gaps.push({ sub: Number.isInteger(sub) && sub >= 1 && sub <= plan.sub_questions.length ? sub : 0, gap: clip(String(item.gap ?? ''), 140) || query, query });
      if (gaps.length >= count) break;
    }
    return gaps;
  } catch (error) {
    if (signal?.aborted) throw error;
    return [];
  }
}

// ------------------------------------------------------------------ 7. Verify

const MARKERS = /\[(S\d+(?:\s*[,;]\s*S?\d+)*)\]/g;
const markersIn = (text: string) => [...text.matchAll(MARKERS)].flatMap((match) => match[1].split(/[,;]/).map((part) => Number(part.replace(/\D/g, '')))).filter((n) => n > 0);

/** The sentences (and table rows) of an answer that carry citation markers. */
export function citedClaims(markdown: string): { text: string; markers: number[] }[] {
  const claims: { text: string; markers: number[] }[] = [];
  for (const line of markdown.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || /^#{1,6}\s/.test(trimmed) || /^\|?[\s:|-]+\|?$/.test(trimmed)) continue;
    const parts = trimmed.startsWith('|') ? [trimmed] : trimmed.replace(/^([-*+]|\d+[.)])\s+/, '').split(/(?<=[.!?](?:\s*\[[^\]]+\])?)\s+(?=[\p{Lu}\d“"(])/u);
    for (const part of parts) {
      const markers = [...new Set(markersIn(part))];
      if (markers.length && part.replace(MARKERS, '').trim().length > 12) claims.push({ text: part.trim(), markers });
    }
  }
  return claims;
}

/** Conservative review candidates only: prose with no source marker, not proven factual claims. */
export function uncitedSentences(markdown: string): string[] {
  const out: string[] = [];
  let fenced = false;
  let references = false;
  const referenceHeading = (text: string) => /^(?:references|bibliography|works cited|sources|referencias|bibliografia|referenzen|literaturverzeichnis)\b/i.test(text)
    || /^(?:参考文献|參考文獻|المراجع)$/.test(text);
  for (const line of markdown.split('\n')) {
    const text = line.trim();
    if (/^(```|~~~)/.test(text)) { fenced = !fenced; continue; }
    if (fenced || !text) continue;
    if (/^#{1,6}\s/.test(text)) {
      const heading = text.replace(/^#+\s*/, '').replace(/^\d+[.)]?\s+/, '').normalize('NFD').replace(/\p{M}/gu, '').trim();
      references = referenceHeading(heading);
      continue;
    }
    if (text.length < 40 && referenceHeading(text.replace(/^[*_]+|[*_:]+$/g, '').trim())) { references = true; continue; }
    if (references || text.includes('|') || /^\[.*\]:/.test(text) || /^!\[/.test(text)
      || /^(?:[*_]{0,2})?(?:figure|fig\.?|table|caption|figura|abbildung|图|圖|表)\s*\d*\s*[:.\-–—]/i.test(text)
      || /^\[S\d+\]/.test(text)) continue;
    const prose = text.replace(/^([-*+>]\s+|\d+[.)]\s+)/, '');
    const parts = prose.split(/(?<=[.!?](?:\s*\[[^\]]+\])?)\s+(?=[\p{Lu}\p{Lo}\d“"(])|(?<=[。！？])(?!\s*\[S\d)\s*/u);
    for (const part of parts) {
      const sentence = part.trim();
      if (markersIn(sentence).length || !/[.!。！]["'”’)]*$/.test(sentence)) continue;
      const letters = sentence.match(/[\p{L}\p{N}]/gu)?.length ?? 0;
      if (letters < 30 || /^https?:\/\//.test(sentence) || /^this (?:review|report|section|answer) (?:summari[sz]es|outlines|describes|discusses|examines)\b/i.test(sentence)) continue;
      out.push(sentence);
    }
  }
  return out;
}

/** `skipped` marks a claim that was never sent to the model, so it is not an attempted check. */
export type ClaimVerdict = { verdict: 'yes' | 'partly' | 'no' | 'unverified'; note: string | null; skipped?: 'no_source_text' };

/** Checks source text, never generated findings. Failed, missing and invalid responses remain unverified. */
export async function checkClaims(llm: LlmSlot, claims: { text: string; markers: number[] }[], sources: ResearchSource[], usage: LlmUsage, signal?: Signal): Promise<ClaimVerdict[]> {
  const out: ClaimVerdict[] = claims.map(() => ({ verdict: 'unverified', note: 'The check did not return a valid assessment.' }));
  const byN = new Map(sources.map((source) => [source.n, source]));
  const eligible = claims.map((claim, index) => ({ claim, index })).filter(({ claim, index }) => {
    const ready = claim.markers.length > 0 && claim.markers.every((n) => byN.has(n) && !['metadata_only', 'source_summary'].includes(sourceEvidenceBasis(byN.get(n)!)));
    if (!ready) out[index] = { verdict: 'unverified', note: 'Source text is unavailable for one or more cited references.', skipped: 'no_source_text' };
    return ready;
  });
  await mapLimit(chunk(eligible, 15), 4, async (batch) => {
    const cited = [...new Set(batch.flatMap(({ claim }) => claim.markers))].map((n) => byN.get(n)).filter(Boolean) as ResearchSource[];
    if (!cited.length) return;
    try {
      const { text, usage: used } = await llm.complete({
        task: 'fast', temperature: 0, maxTokens: 120 + batch.length * 40, json: true, signal,
        messages: [
          {
            role: 'system',
            content: 'You check citations in a research answer against the sources they cite, using only the source text given. Answer with JSON only: {"items": [{"i": 0, "v": "yes|partly|no", "note": "…"}]}, one item per claim. '
              + '"yes": the cited sources state it. "partly": they support only part of it, or the claim is broader, stronger or more certain than they are. "no": they do not say it, or say the opposite. '
              + '"note" only for partly and no: what the sources actually say, in at most 15 words.',
          },
          {
            role: 'user',
            content: `Sources:\n${cited.map((source) => `[S${source.n}] ${clip(source.title, 200)}. Basis: ${sourceEvidenceBasis(source)}. ${clip(source.abstract || source.tldr, 1200)}${source.passage ? ` Full-text excerpt: ${clip(source.passage, 2600)}` : ''}`).join('\n')}\n\nClaims:\n${batch.map(({ claim, index }) => `i=${index}: ${clip(claim.text, 500)}`).join('\n')}`,
          },
        ],
      });
      addUsage(usage, used);
      const raw = parseJson<{ items?: unknown }>(text)?.items;
      const items = Array.isArray(raw) ? raw : [];
      const seen = new Set<number>();
      for (const item of items) {
        if (!item || typeof item !== 'object' || !Number.isInteger(item.i)) continue;
        const index = item.i;
        if (!batch.some((entry) => entry.index === index)) continue;
        if (seen.has(index)) { out[index] = { verdict: 'unverified', note: 'The check returned duplicate assessments.' }; continue; }
        seen.add(index);
        if (!['yes', 'partly', 'no'].includes(item.v)) continue;
        const verdict = item.v as 'yes' | 'partly' | 'no';
        out[index] = { verdict, note: verdict === 'yes' ? null : typeof item.note === 'string' ? clip(item.note, 160) || null : null };
      }
    } catch (error) {
      if (signal?.aborted) throw error;
    }
  });
  return out;
}

/** Coverage never treats failures or claims outside the depth limit as successful checks. */
export function claimCoverage(total: number, verdicts: ClaimVerdict[]) {
  const completed = verdicts.filter((item) => item.verdict !== 'unverified').length;
  const notChecked = Math.max(0, total - verdicts.length);
  const noSourceText = verdicts.filter((item) => item.skipped === 'no_source_text').length;
  return {
    total, attempted: verdicts.length - noSourceText, completed, checked: completed, no_source_text: noSourceText,
    supported: verdicts.filter((item) => item.verdict === 'yes').length,
    partly: verdicts.filter((item) => item.verdict === 'partly').length,
    unsupported: verdicts.filter((item) => item.verdict === 'no').length,
    unverified: total - completed, not_checked: notChecked,
  };
}

/** Rewrites claims to say only what their sources support. A rewrite that drops or invents a marker is refused. */
export async function reviseClaims(llm: LlmSlot, items: { text: string; markers: number[]; note: string | null }[], language: string | null | undefined, usage: LlmUsage, signal?: Signal): Promise<(string | null)[]> {
  if (!items.length) return [];
  const out: (string | null)[] = items.map(() => null);
  try {
    const { text, usage: used } = await llm.complete({
      task: 'fast', temperature: 0.1, maxTokens: 200 + items.length * 120, json: true, signal,
      messages: [
        {
          role: 'system',
          content: 'You correct sentences in a research answer so they claim only what their sources support. Answer with JSON only: {"items": [{"i": 0, "text": "…"}]}. '
            + `Keep each sentence's language${language ? ` (${language})` : ''}, style and citation markers exactly as written (use only the markers it already has, in square brackets). `
            + 'Make it narrower or more cautious, following the note. If the sources do not support it at all, say plainly that the cited evidence does not establish it. One sentence each; Markdown table rows stay table rows.',
        },
        { role: 'user', content: items.map((item, index) => `i=${index}: ${item.text}\nNote: ${item.note || 'not supported as written'}`).join('\n\n') },
      ],
    });
    addUsage(usage, used);
    for (const item of parseJson<{ items?: { i: number; text: string }[] }>(text)?.items ?? []) {
      const index = Number(item.i);
      const original = items[index];
      const revised = String(item.text ?? '').trim();
      if (!original || !revised || revised.length > original.text.length * 2 + 80) continue;
      const markers = markersIn(revised);
      if (!markers.length || markers.some((n) => !original.markers.includes(n))) continue;
      if (original.text.startsWith('|') !== revised.startsWith('|')) continue;
      out[index] = revised;
    }
  } catch (error) {
    if (signal?.aborted) throw error;
  }
  return out;
}

/** The cited papers' DOIs at Crossref: does the record exist, and has the paper been retracted or corrected? */
export async function checkReferences(sources: ResearchSource[], max: number): Promise<void> {
  const papers = sources.filter((source) => source.kind === 'paper' || source.kind === 'library');
  for (const source of papers) source.check = source.is_retracted ? { status: 'retracted', note: 'Retraction reported by the source index.', attempted: false, notices_checked: false }
    : doiKey(source.doi) ? { status: 'unverified', note: /^10\.(48550|5281)\//.test(doiKey(source.doi)!) ? 'This DOI registry is outside the Crossref check.' : 'Not checked within this report depth’s reference limit.', attempted: false, notices_checked: false }
      : { status: 'no_doi', note: 'No DOI available for this reference.', attempted: false, notices_checked: false };
  // DataCite DOIs (arXiv, Zenodo) are not at Crossref.
  const withDoi = papers.filter((source) => doiKey(source.doi) && !/^10\.(48550|5281)\//.test(doiKey(source.doi)!)).slice(0, max);
  await mapLimit(withDoi, 5, async (source) => {
    const [work, foundNotices] = await Promise.all([crossrefWork(source.doi!).catch(() => undefined), crossrefUpdates(source.doi!).catch(() => undefined)]);
    const notices = foundNotices ?? [];
    const retraction = notices.find((notice) => /retract|withdraw/i.test(notice.type));
    const correction = notices.find((notice) => /correct|errat/i.test(notice.type));
    const concern = notices.find((notice) => /concern/i.test(notice.type));
    if (retraction || source.is_retracted) {
      source.is_retracted = true;
      source.check = { status: 'retracted', note: `Retracted${retraction?.date ? ` (${retraction.date})` : ''}` };
    } else if (concern) {
      source.check = { status: 'concern', note: `Expression of concern${concern.date ? ` (${concern.date})` : ''}` };
    } else if (correction) {
      source.check = { status: 'corrected', note: `Correction published${correction.date ? ` (${correction.date})` : ''}` };
    } else if (work) {
      const a = titleKey(work.title);
      const b = titleKey(source.title);
      const same = Boolean(a && b && (a.startsWith(b.slice(0, 30)) || b.startsWith(a.slice(0, 30))));
      source.check = same ? { status: 'confirmed', note: null } : { status: 'unconfirmed', note: 'The DOI points to a record with a different title' };
    } else {
      source.check = { status: work === null ? 'unconfirmed' : 'unverified', note: work === null ? 'DOI not found at Crossref' : 'The Crossref identity check did not complete.' };
    }
    source.check.attempted = true;
    source.check.notices_checked = foundNotices !== undefined;
    if (foundNotices === undefined) source.check.note = [source.check.note, 'The retraction/correction notice lookup did not complete.'].filter(Boolean).join(' ');
  });
}

// ------------------------------------------------------------------ the run

const GROUP_NAMES: Record<string, string> = { papers: 'OpenAlex and Semantic Scholar', medical: 'PubMed and Europe PMC', preprints: 'arXiv and preprint servers', dblp: 'DBLP', web: 'the web', library: 'your Library', 'life-sciences': 'life-sciences databases', chemistry: 'chemistry databases' };

/** The step list and how each change reaches the browser. */
function stepTracker(events: ResearchEvents) {
  const steps: ResearchStep[] = STEP_IDS.map((id) => ({ id, state: 'pending', detail: '', data: null, ms: null }));
  const started = new Map<StepId, number>();
  const find = (id: StepId) => steps.find((step) => step.id === id)!;
  const send = (step: ResearchStep) => events.step({ ...step });
  return {
    steps,
    start(id: StepId, detail: string, data: Record<string, unknown> | null = null) {
      started.set(id, Date.now());
      Object.assign(find(id), { state: 'active', detail, data });
      send(find(id));
    },
    /** A new line for a step that is still working ("Writing section 3 of 6"). */
    progress(id: StepId, detail: string) {
      Object.assign(find(id), { detail });
      send(find(id));
    },
    done(id: StepId, detail: string, data: Record<string, unknown> | null = null) {
      Object.assign(find(id), { state: 'done', detail, data, ms: Date.now() - (started.get(id) ?? Date.now()) });
      send(find(id));
    },
    skip(id: StepId, detail: string) {
      Object.assign(find(id), { state: 'skipped', detail, data: null, ms: null });
      send(find(id));
    },
    fail(detail: string) {
      const step = steps.find((item) => item.state === 'active');
      if (!step) return;
      Object.assign(step, { state: 'failed', detail, ms: Date.now() - (started.get(step.id) ?? Date.now()) });
      send(step);
    },
  };
}

/**
 * Text from several writers running at once, sent in order: writer 0 streams straight through,
 * later ones are held until every writer before them has finished.
 */
export function orderedOutput(count: number, emit: (text: string) => void) {
  const held = Array.from({ length: count }, () => '');
  const finished = Array.from({ length: count }, () => false);
  let current = 0;
  return {
    push(index: number, text: string) {
      if (index === current) emit(text);
      else held[index] += text;
    },
    finish(index: number) {
      finished[index] = true;
      while (current < count && finished[current]) {
        current += 1;
        if (current < count && held[current]) { emit(held[current]); held[current] = ''; }
      }
    },
  };
}

const wordCount = (markdown: string) => (markdown.replace(MARKERS, '').replace(/```figure[\s\S]*?```/g, '').match(/\S+/g) || []).length;

/** A section's body as the writer returned it, tidied: no repeated title, its headings one level down. */
function tidySection(text: string, heading: string, level: 2 | 3): string {
  let body = text.trim().replace(/^#{1,6}[ \t]+(.+)\n+/, (line, title: string) => (title.trim().toLowerCase() === heading.toLowerCase() ? '' : line));
  body = level === 3 ? body.replace(/^#{1,2}[ \t]+/gm, '### ') : body.replace(/^#[ \t]+/gm, '## ');
  return body.trim();
}

type Tracker = ReturnType<typeof stepTracker>;

/** Deep and Detailed: outline, sections (three at a time, streamed in order), closing sections, then the Summary. */
async function writeReport(llm: LlmSlot, input: ResearchInput, context: {
  plan: ResearchPlan; all: ResearchSource[]; papers: ResearchSource[]; prisma: PrismaData; searches: number; gapSearches: number;
  usage: LlmUsage; signal: Signal; track: Tracker; events: ResearchEvents;
}): Promise<{ headed: string; written: string; figures: ResearchFigure[]; sections: string[]; dropped: number }> {
  const { plan, all, papers, prisma, usage, signal, track, events } = context;
  const settings = DEPTH_SETTINGS[input.depth];
  const task = 'review' as const;
  const tokens = input.highQuality ? Math.round(settings.maxTokens * 1.4) : settings.maxTokens;
  let dropped = 0;
  const clean = (text: string, allowed: ResearchSource[]) => {
    const kept = dropInventedMarkers(text, allowed, '');
    dropped += Math.max(0, markersIn(text).length - markersIn(kept).length);
    return kept;
  };

  // The outline: thematic sections, each with its sources.
  let outlineRaw: string | null = null;
  try {
    const { text, usage: used } = await llm.complete({ messages: outlinePrompt(input, plan, all), task, json: true, maxTokens: 1800, temperature: 0.2, signal });
    addUsage(usage, used);
    outlineRaw = text;
  } catch (error) {
    if (signal?.aborted) throw error;
  }
  const outline = cleanOutline(outlineRaw, input.depth, plan, all);
  const byN = new Map(all.map((source) => [source.n, source]));

  // The computed parts and the figures, sent first so the browser can draw them as the text arrives.
  const consensus = consensusOf(papers, input.method);
  const { figures, methods: methodFigures, glance: glanceFigures } = buildFigures({ depth: input.depth, plan, papers, prisma });
  events.figures(figures);
  const methods = [methodsText({
    groups: input.groups, searches: context.searches, subQuestions: plan.sub_questions.length, seeds: settings.snowball, prisma, gapSearches: context.gapSearches, filters: input.filters, method: input.method,
  }), ...methodFigures].join('\n\n');
  const glance = [glanceText(papers, consensus?.applicable ? consensus.line : null), ...glanceFigures].join('\n\n');
  const head = `## ${outline.labels.methods}\n\n${methods}\n\n## ${outline.labels.glance}\n\n${glance}`;
  events.delta(head);

  // The thematic sections, three at a time, streamed in order.
  const sections = outline.sections;
  const out = orderedOutput(sections.length, (text) => events.delta(text));
  let finished = 0;
  track.progress('write', `Writing ${sections.length} sections`);
  const bodies = await mapLimit(sections, 3, async (section, index) => {
    const own = section.sources.map((n) => byN.get(n)).filter(Boolean) as ResearchSource[];
    out.push(index, `\n\n## ${section.heading}\n\n`);
    let text = '';
    try {
      const streamed = await llm.stream(
        { messages: sectionPrompt(input, section, sections, own), task, maxTokens: tokens, temperature: 0.3, signal },
        (delta) => { text += delta; out.push(index, delta); },
      );
      addUsage(usage, streamed.usage);
    } catch (error) {
      if (signal?.aborted) throw error;
      // One failed section does not sink the report; the others still stand.
      if (!text.trim()) out.push(index, '_This section could not be written this time._');
    }
    out.finish(index);
    finished += 1;
    track.progress('write', `Wrote ${finished} of ${sections.length} sections`);
    return clean(tidySection(text, section.heading, 3), own);
  });
  const themes = sections.map((section, index) => ({ heading: section.heading, body: bodies[index] })).filter((item) => item.body);
  if (!themes.length) throw new Error('The AI returned nothing.');
  let body = themes.map((item) => `## ${item.heading}\n\n${item.body}`).join('\n\n');

  const table = input.depth === 'detailed' ? comparisonTable(papers) : '';
  if (table) {
    const part = `## ${outline.labels.comparison}\n\n${table}`;
    events.delta(`\n\n${part}`);
    body += `\n\n${part}`;
  }

  // The closing sections read the whole body, so they come after it.
  track.progress('write', 'Writing where studies disagree, the limits and the open questions');
  let closing = '';
  try {
    events.delta('\n\n');
    const streamed = await llm.stream({ messages: closingPrompt(input, body, all), task, maxTokens: input.depth === 'detailed' ? 2600 : 1600, temperature: 0.3, signal }, (delta) => { closing += delta; events.delta(delta); });
    addUsage(usage, streamed.usage);
  } catch (error) {
    if (signal?.aborted) throw error;
  }
  closing = clean(tidySection(closing, '', 2), all);

  // The Summary, last, from the finished report.
  track.progress('write', 'Writing the summary');
  let summary = '';
  try {
    const { text, usage: used } = await llm.complete({ messages: summaryPrompt(input, `${body}\n\n${closing}`), task, maxTokens: input.depth === 'detailed' ? 700 : 450, temperature: 0.2, signal });
    addUsage(usage, used);
    summary = clean(text.trim().replace(/^#{1,6}[ \t]+.*\n+/, ''), all);
  } catch (error) {
    if (signal?.aborted) throw error;
  }

  const headed = [
    summary ? `## ${outline.labels.summary}\n\n${summary}` : null,
    head, body, closing || null,
  ].filter(Boolean).join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
  events.markdown(headed);
  return { headed, written: [summary, ...themes.map((item) => item.body), closing].filter(Boolean).join('\n\n'), figures, sections: themes.map((item) => item.heading), dropped };
}

/** Runs one research job through the eight steps. Throws when nothing usable was found or the model fails. */
export async function runResearch(llm: LlmSlot, input: ResearchInput, context: { userId: string; signal?: AbortSignal }, events: ResearchEvents): Promise<ResearchResult> {
  const settings = DEPTH_SETTINGS[input.depth];
  const usage = usage0();
  const { signal } = context;
  const track = stepTracker(events);
  try {
    // 1. Plan
    track.start('plan', settings.subQuestions > 1 ? 'Breaking the question into sub-questions' : 'Reading your question');
    const reviewed = input.plan ? cleanPlan(input.plan, 8, 3) : null;
    const plan = reviewed?.sub_questions.length ? reviewed : await planResearch(llm, input.question, input.depth, usage, signal, input);
    const searches = planSearches(input.question, plan, settings.queries);
    track.done('plan', plan.sub_questions.length > 1 ? `${plural(plan.sub_questions.length, 'sub-question')}, ${plural(searches.length, 'search', 'searches')}` : 'One focused search',
      { sub_questions: plan.sub_questions, reviewed: Boolean(reviewed?.sub_questions.length) });

    // 2. Search
    track.start('search', `Searching ${input.groups.map((group) => GROUP_NAMES[group] || group).join(', ')}`, { queries: searches.map((item) => item.query) });
    const recordsFound = recordStep(llm, input.question, input.groups.filter(isRecordGroup), usage, signal);
    recordsFound.catch(() => undefined); // awaited below; a failed search must not leave it unhandled
    const searched = await searchStep(input, plan, context.userId);
    const { records, counts: recordCounts } = await recordsFound;
    Object.assign(searched.counts, recordCounts);
    const queries = searches.map((item) => item.query);
    const duplicates = Math.max(0, searched.found - searched.unique);
    track.done('search', [`${plural(searched.found, 'result')} found`, duplicates ? `${plural(duplicates, 'duplicate')} removed` : null, searched.chased ? `${searched.chased} from citation chasing` : null].filter(Boolean).join(' · '),
      { queries, counts: searched.counts, errors: searched.errors, found: searched.found, unique: searched.unique, duplicates, chased: searched.chased, web: searched.web.length, records: records.length });
    if (!searched.candidates.length && !input.attachments.length && !searched.web.length && !records.length) throw new ResearchEmptyError();

    // 3. Screen
    track.start('screen', `Screening ${plural(searched.candidates.length, 'title and abstract', 'titles and abstracts')}`);
    const screening = searched.candidates.length ? await screenPapers(llm, input.question, plan, searched.candidates, usage, signal) : [];
    const verdicts = searched.candidates.map((paper, index) => {
      const library = paper.providers.includes('library');
      if (paper.is_retracted) return { paper, relevance: 0, reason: 'Retracted' };
      return { paper, relevance: library ? Math.max(2, screening[index].relevance) : screening[index].relevance, reason: library ? null : screening[index].reason };
    });
    let kept = verdicts.filter((item) => item.relevance >= 2);
    // Too few on-topic papers: the closest background papers fill in, so the answer can still say what is known.
    const floor = Math.min(settings.papers, Math.max(5, Math.round(settings.papers * 0.4)));
    if (kept.length < floor) kept = [...kept, ...verdicts.filter((item) => item.relevance === 1).slice(0, floor - kept.length)];
    const excluded = verdicts.filter((item) => !kept.includes(item));
    track.done('screen', `${kept.length} of ${plural(verdicts.length, 'paper')} relevant`, {
      screened: verdicts.length, kept: kept.length, excluded: excluded.length,
      by_relevance: [3, 2, 1, 0].map((level) => verdicts.filter((item) => item.relevance === level).length),
      examples: excluded.slice(0, 25).map((item) => ({ title: item.paper.title, year: item.paper.year, reason: item.reason || (item.relevance === 1 ? 'Background only' : 'Off-topic') })),
    });
    if (!kept.length && !input.attachments.length && !searched.web.length && !records.length) throw new ResearchEmptyError();

    // 4. Rank
    const method = researchMethod(input.method);
    track.start('rank', `Ranking for ${RESEARCH_METHOD_LABELS[method].toLowerCase()}`);
    const scored = kept.map((item) => ({ ...item, score: evidenceScore(item.paper, item.relevance, undefined, method), subs: [...(searched.subsOf.get(paperKey(item.paper)) ?? [])] }));
    const picked = pickPapers(scored, settings.papers, plan.sub_questions.length);
    const designs = new Map<string, number>();
    for (const item of picked) if (item.paper.study_type && item.paper.study_type !== 'other') designs.set(item.paper.study_type, (designs.get(item.paper.study_type) ?? 0) + 1);
    const numbered: ResearchSource[] = [];
    for (const file of input.attachments) numbered.push(fileSource(file, input.question, numbered.length + 1));
    const reading: { paper: FoundPaper; source: ResearchSource }[] = [];
    for (const item of picked) {
      const source = paperSource(item.paper, numbered.length + 1);
      Object.assign(source, { relevance: item.relevance, rank_score: item.score, sub_questions: item.subs });
      numbered.push(source);
      reading.push({ paper: item.paper, source });
    }
    // Database records are numbered after the web pages and travel in the same list.
    const webSources = [
      ...searched.web.map((result, index) => webSource(result, numbered.length + 1 + index)),
      ...records.map((record, index) => recordSource(record, numbered.length + 1 + searched.web.length + index)),
    ];
    if (!numbered.length && !webSources.length) throw new ResearchEmptyError();
    track.done('rank', `Kept the best ${plural(picked.length, 'paper')}${designs.size ? ` · ${[...designs].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([type, count]) => `${count} ${numbered.find((source) => source.study_type === type)?.study_type_label?.toLowerCase() ?? type}`).join(', ')}` : ''}`, {
      kept: picked.length, method, method_label: RESEARCH_METHOD_LABELS[method], ranking_description: RANKING_DESCRIPTIONS[method],
      top: numbered.filter((source) => source.kind !== 'file').slice(0, 12).map((source) => ({ n: source.n, title: source.title, year: source.year, design: source.study_type_label, score: source.rank_score, cited_by: source.cited_by_count })),
      covered: plan.sub_questions.map((_, sub) => numbered.filter((source) => source.sub_questions?.includes(sub)).length),
    });
    events.sources(numbered, webSources, { counts: searched.counts, errors: searched.errors, queries });

    // 5. Read
    const fullTextQuestion = `${input.question} ${plan.sub_questions.map((sub) => sub.question).join(' ')}`;
    track.start('read', `Reading ${plural(reading.length, 'paper')}`);
    await readFullTexts(reading, settings.fullTexts, fullTextQuestion);
    const readings = await readPapers(llm, input.question, numbered, usage, signal);
    for (const source of numbered) {
      const found = readings.get(source.n);
      if (found) Object.assign(source, found);
    }
    const stancesOf = () => {
      const stances = { supports: 0, mixed: 0, against: 0, unclear: 0 } as Record<Stance, number>;
      for (const source of numbered) if (source.stance) stances[source.stance] += 1;
      return stances;
    };
    const firstStances = stancesOf();
    const fullTexts = numbered.filter((source) => source.full_text).length;
    const effects = numbered.filter((source) => source.effect).length;
    track.done('read', [
      `${plural(readings.size, 'paper')} read`, fullTexts ? `${fullTexts} in full text` : null,
      firstStances.supports || firstStances.against || firstStances.mixed ? `${firstStances.supports} support, ${firstStances.mixed} mixed, ${firstStances.against} against` : null,
      effects ? `${plural(effects, 'effect size')}` : null,
    ].filter(Boolean).join(' · '), { read: readings.size, full_texts: fullTexts, stances: firstStances, effects });
    events.sources(numbered.map(publicSource), webSources, { counts: searched.counts, errors: searched.errors, queries });

    // 6. Fill gaps
    let gapSearches = 0;
    let gapAdded = 0;
    if (settings.gapQueries > 0 && reading.length) {
      track.start('gaps', 'Looking for gaps in the evidence');
      const gaps = await findGaps(llm, input.question, plan, numbered, queries, settings.gapQueries, usage, signal, input);
      if (!gaps.length) {
        track.done('gaps', 'No important gaps found', { gaps: [], added: 0 });
      } else {
        gapSearches = gaps.length;
        track.progress('gaps', `Searching ${plural(gaps.length, 'gap')}`);
        const results = await mapLimit(gaps, 4, (gap) => searchSources(
          { query: gap.query, groups: input.groups.filter((group) => group !== 'library' && group !== 'web'), filters: input.filters, limit: 20, libraryDocumentIds: [] },
          { userId: context.userId },
        ).catch(() => ({ papers: [] as FoundPaper[], web: [], counts: {} as Record<string, number>, errors: [] })));
        for (const result of results) for (const [provider, count] of Object.entries(result.counts)) searched.counts[provider] = (searched.counts[provider] ?? 0) + (count ?? 0);
        const gapOf = new Map<string, number>();
        results.forEach((result, index) => { for (const paper of result.papers) if (!gapOf.has(paperKey(paper))) gapOf.set(paperKey(paper), index); });
        const fresh = sortPapers(mergeResults(results.map((result) => result.papers))).filter((paper) => !searched.seen.has(paperKey(paper)) && !paper.is_retracted).slice(0, 120);
        const found = results.reduce((sum, result) => sum + result.papers.length, 0);
        track.progress('gaps', `Screening ${plural(fresh.length, 'new paper')}`);
        const gapScreening = fresh.length ? await screenPapers(llm, input.question, plan, fresh, usage, signal) : [];
        const gapPicked = fresh
          .map((paper, index) => ({ paper, relevance: gapScreening[index]?.relevance ?? 0, gap: gaps[gapOf.get(paperKey(paper)) ?? 0] }))
          .filter((item) => item.relevance >= 2)
          .map((item) => ({ ...item, score: evidenceScore(item.paper, item.relevance, undefined, method) }))
          .sort((a, b) => b.score - a.score)
          .slice(0, settings.gapPapers);
        const nextN = Math.max(0, ...numbered.map((source) => source.n), ...webSources.map((source) => source.n)) + 1;
        const added: { paper: FoundPaper; source: ResearchSource }[] = gapPicked.map((item, index) => {
          const source = paperSource(item.paper, nextN + index);
          Object.assign(source, { relevance: item.relevance, rank_score: item.score, sub_questions: item.gap.sub ? [item.gap.sub - 1] : [], gap: true });
          return { paper: item.paper, source };
        });
        if (added.length) {
          track.progress('gaps', `Reading ${plural(added.length, 'new paper')}`);
          await readFullTexts(added, settings.gapFullTexts, fullTextQuestion);
          const more = await readPapers(llm, input.question, added.map((item) => item.source), usage, signal);
          for (const item of added) {
            const read = more.get(item.source.n);
            if (read) Object.assign(item.source, read);
            numbered.push(item.source);
          }
        }
        gapAdded = added.length;
        track.done('gaps', [`${plural(gaps.length, 'gap')} searched`, `${plural(fresh.length, 'new paper')} screened`, `${plural(added.length, 'paper')} added`].join(' · '), {
          gaps: gaps.map((gap) => ({ ...gap, added: added.filter((item) => item.source.sub_questions?.includes(gap.sub - 1) || (gap.sub === 0 && !item.source.sub_questions?.length)).length })),
          found, screened: fresh.length, added: added.length, papers: added.map((item) => ({ n: item.source.n, title: item.source.title, year: item.source.year })),
        });
        if (added.length) events.sources(numbered.map(publicSource), webSources, { counts: searched.counts, errors: searched.errors, queries: [...queries, ...gaps.map((gap) => gap.query)] });
      }
    } else {
      track.skip('gaps', input.depth === 'summary' ? 'Not part of a Summary answer' : 'Nothing to build on');
    }
    const all = [...numbered, ...webSources];
    const papers = numbered.filter((source) => source.kind === 'paper' || source.kind === 'library');

    // 7. Write
    track.start('write', `Writing from ${plural(all.length, 'source')}`);
    let markdown: string;
    let written: string;
    let figures: ResearchFigure[] = [];
    let sections: string[] = [];
    let droppedMarkers = 0;
    if (input.depth === 'summary') {
      let answer = '';
      const streamed = await llm.stream(
        { messages: researchPrompt(input, all), task: input.highQuality ? 'review' : 'fast', maxTokens: input.highQuality ? Math.round(settings.maxTokens * 1.5) : settings.maxTokens, temperature: 0.3, signal },
        (text) => { answer += text; events.delta(text); },
      );
      addUsage(usage, streamed.usage);
      const raw = answer.trim();
      markdown = dropInventedMarkers(raw, all, '');
      droppedMarkers = Math.max(0, markersIn(raw).length - markersIn(markdown).length);
      written = markdown;
    } else {
      const unique = searched.unique;
      const prisma: PrismaData = {
        identified: searched.found, chased: searched.chased, duplicates: Math.max(0, searched.found - unique), unscreened: Math.max(0, unique - verdicts.length),
        screened: verdicts.length, excluded: excluded.length,
        reasons: [
          { label: 'Off-topic', count: excluded.filter((item) => item.relevance === 0 && item.reason !== 'Retracted').length },
          { label: 'Background only', count: excluded.filter((item) => item.relevance === 1).length },
          { label: 'Retracted', count: excluded.filter((item) => item.reason === 'Retracted').length },
        ].filter((reason) => reason.count > 0),
        relevant: kept.length, included: papers.length, full_text: papers.filter((source) => source.full_text).length,
        gap_added: gapAdded, files: numbered.filter((source) => source.kind === 'file').length, web: webSources.length,
      };
      const report = await writeReport(llm, input, { plan, all, papers, prisma, searches: searches.length, gapSearches, usage, signal, track, events });
      markdown = report.headed;
      written = report.written;
      figures = report.figures;
      sections = report.sections;
      droppedMarkers = report.dropped;
    }
    if (!markdown) throw new Error('The AI returned nothing.');
    const words = wordCount(markdown);
    track.done('write', [
      `${words.toLocaleString('en-US')} words`, sections.length ? plural(sections.length + 3, 'section') : null, figures.length ? plural(figures.length, 'figure') : null,
      `${plural(usedSources(markdown, all).length, 'source')} cited`,
    ].filter(Boolean).join(' · '), { words, sections, figures: figures.map((figure) => figure.title) });

    // 8. Verify: only the written text; the computed parts (Methods, overview, table) are not claims.
    const allClaims = citedClaims(written);
    const uncited = uncitedSentences(written);
    const claims = allClaims.slice(0, settings.claims);
    track.start('verify', `Checking ${plural(claims.length, 'citation')} against their sources`);
    const [verdictsOfClaims] = await Promise.all([
      checkClaims(llm, claims, all, usage, signal),
      checkReferences(usedSources(markdown, all), settings.references),
    ]);
    const wrong = claims.map((claim, index) => ({ ...claim, ...verdictsOfClaims[index] })).filter((claim) => claim.verdict === 'no' || claim.verdict === 'partly');
    const toRevise = wrong.slice(0, settings.revise);
    const revisions = (await mapLimit(chunk(toRevise, 12), 3, (batch) => reviseClaims(llm, batch.map((claim) => ({ text: claim.text, markers: claim.markers, note: claim.note })), input.language, usage, signal))).flat();
    const flags: Verification['flags'] = [];
    toRevise.forEach((claim, index) => {
      const revised = revisions[index];
      if (revised && markdown.includes(claim.text)) {
        markdown = markdown.replace(claim.text, revised);
        flags.push({ kind: 'revised', text: claim.text, revised, note: claim.note });
      } else {
        flags.push({ kind: claim.verdict === 'no' ? 'unsupported' : 'partly_supported', text: claim.text, note: claim.note });
      }
    });
    for (const claim of wrong.slice(settings.revise)) flags.push({ kind: claim.verdict === 'no' ? 'unsupported' : 'partly_supported', text: claim.text, note: claim.note });
    const checkedItems: Verification['claims']['items'] = allClaims.map((claim, index) => {
      const verdict = verdictsOfClaims[index] ?? { verdict: 'unverified' as const, note: 'Not checked within this report depth’s limit.' };
      const revision = flags.find((flag) => flag.kind === 'revised' && flag.text === claim.text)?.revised;
      if (verdict.verdict === 'unverified') flags.push({ kind: 'unverified', text: claim.text, note: verdict.note });
      return { ...claim, ...verdict, sources: claim.markers.map((n) => ({ n, basis: all.find((source) => source.n === n) ? sourceEvidenceBasis(all.find((source) => source.n === n)!) : 'metadata_only' })), ...(revision ? { revised_text: revision } : {}) };
    });
    const cited = usedSources(markdown, all);
    const refs = cited.filter((source) => source.check && source.check.status !== 'no_doi');
    for (const source of refs) {
      const status = source.check!.status;
      if (status === 'retracted' || status === 'corrected' || status === 'concern' || status === 'unconfirmed') flags.push({ kind: status, text: source.title, note: source.check!.note, n: source.n });
      if (status === 'unverified') flags.push({ kind: 'reference_unverified', text: source.title, note: source.check!.note, n: source.n });
    }
    const verification: Verification = {
      claims: {
        ...claimCoverage(allClaims.length, verdictsOfClaims), revised: flags.filter((flag) => flag.kind === 'revised').length,
        scope: 'initial_cited_narrative', items: checkedItems, uncited_sentences: uncited,
      },
      references: {
        checked: refs.filter((source) => source.check!.attempted && source.check!.status !== 'unverified').length, confirmed: refs.filter((source) => source.check!.status === 'confirmed').length, retracted: refs.filter((source) => source.check!.status === 'retracted').length,
        corrected: refs.filter((source) => source.check!.status === 'corrected' || source.check!.status === 'concern').length, unconfirmed: refs.filter((source) => source.check!.status === 'unconfirmed').length,
        total: cited.filter((source) => source.check).length, attempted: refs.filter((source) => source.check!.attempted).length,
        unverified: refs.filter((source) => source.check!.status === 'unverified').length, no_doi: cited.filter((source) => source.check?.status === 'no_doi').length,
        notices_unverified: refs.filter((source) => !source.check!.notices_checked).length,
      },
      flags,
      dropped_markers: droppedMarkers,
    };
    track.done('verify', [
      allClaims.length ? `${verification.claims.completed} of ${plural(allClaims.length, 'cited sentence')} checked; ${verification.claims.supported} supported` : 'No cited narrative sentences to check',
      verification.claims.unverified ? `${verification.claims.unverified} unverified` : null,
      uncited.length ? `${uncited.length} uncited sentences to review` : null,
      verification.claims.revised ? `${verification.claims.revised} revised` : null,
      refs.length ? `${verification.references.confirmed} of ${plural(refs.length, 'reference')} confirmed` : null,
      verification.references.retracted ? `${verification.references.retracted} retracted` : null,
    ].filter(Boolean).join(' · '), verification as unknown as Record<string, unknown>);

    // A report asked for without headings keeps both versions, so turning them on later is free.
    const headedCopy = input.depth !== 'summary' && !input.headings ? markdown : null;
    if (headedCopy) markdown = stripHeadings(markdown);
    const consensus = consensusOf(cited, input.method);
    const summary = markdown.replace(/```figure[\s\S]*?```/g, '').replace(/^#+.*$/gm, '').replace(/\[S\d+(?:[,\s]*S?\d+)*\]/g, '').replace(/[*_>`|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 300);
    return {
      markdown, ...(headedCopy ? { markdown_headed: headedCopy, markdown_plain: markdown } : {}), figures,
      sources: cited.map(publicSource), all_sources: all.map(publicSource), consensus, queries,
      searched: { counts: searched.counts, errors: searched.errors }, plan, steps: track.steps, verification, usage, summary,
    };
  } catch (error) {
    track.fail(error instanceof ResearchEmptyError ? 'Nothing found' : signal?.aborted ? 'Stopped' : 'Stopped by an error');
    throw error;
  }
}

/** Keep the actual source excerpts with the result so a reader can inspect the evidence later. */
export function publicSource(source: ResearchSource): ResearchSource {
  return { ...source, evidence_basis: sourceEvidenceBasis(source) };
}
