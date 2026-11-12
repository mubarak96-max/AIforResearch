/**
 * Deep Research, step by step, the way a literature review is done:
 *
 *   1. Plan    the question split into sub-questions, each with its own searches (Detailed: the
 *              person may edit the plan before anything is charged; see POST /research/plan).
 *   2. Search  every search against the chosen sources, merged and de-duplicated; Detailed also
 *              follows the references and citations of the best papers (citation chasing).
 *   3. Screen  a fast model reads titles and abstracts and scores each paper's relevance (0-3);
 *              retracted and off-topic papers are excluded, each with a reason.
 *   4. Rank    an evidence score (study design, relevance, citations a year, recency, journal),
 *              with every sub-question kept covered. Computed, never typed by a model.
 *   5. Read    the open full texts of the best papers, then one finding, sample and limitation
 *              per paper, and its stance on the question.
 *   6. Write   the answer, streamed, from those findings and excerpts.
 *   7. Verify  each cited sentence checked against its sources (unsupported ones are narrowed
 *              or flagged), invented markers dropped, and each cited DOI checked at Crossref for
 *              retractions and corrections.
 *
 * Each step sends its start and its result (events.step). The finished steps are saved with the
 * task, so a saved answer shows how it was made.
 */
import type { LlmSlot, LlmUsage } from '../slots/types.js';
import { USER_AGENT } from '../env.js';
import { dropInventedMarkers, queryFromText, sharesTopic, usedSources } from './assist-papers.js';
import { extractText } from './fileText.js';
import {
  applyFilters, crossrefUpdates, crossrefWork, doiKey, mergeResults, searchSources, semanticScholarLinks, sortPapers, titleKey, unpaywall,
  type FoundPaper, type SearchFilters, type StudyType,
} from './sources/index.js';
import { net } from './sources/http.js';
import {
  DEPTH_SETTINGS, ResearchEmptyError, STEP_IDS, addUsage, consensusOf, fileSource, paperSource, parseJson, relevantPassages, researchPrompt, usage0, webSource,
  type Depth, type ResearchEvents, type ResearchInput, type ResearchPlan, type ResearchResult, type ResearchSource, type ResearchStep, type Stance,
  type StepId, type SubQuestion, type Verification,
} from './research.js';

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
export async function planResearch(llm: LlmSlot, question: string, depth: Depth, usage: LlmUsage, signal?: Signal): Promise<ResearchPlan> {
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
            + 'Queries are 3 to 8 keywords for a scholarly search engine, in English, with no Boolean operators and no quotes.',
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
};

async function searchStep(input: ResearchInput, plan: ResearchPlan, userId: string): Promise<SearchOutcome> {
  const settings = DEPTH_SETTINGS[input.depth];
  const searches = planSearches(input.question, plan, settings.queries);
  const results = await Promise.all(searches.map(({ query }, index) => searchSources(
    // My Library and the web only for the main question: their results do not improve with more angles.
    { query, groups: index === 0 ? input.groups : input.groups.filter((group) => group !== 'library' && group !== 'web'), filters: input.filters, limit: settings.perQuery, libraryDocumentIds: input.libraryDocumentIds },
    { userId },
  ).catch(() => ({ papers: [] as FoundPaper[], web: [], counts: {} as Record<string, number>, errors: [{ provider: 'openalex', message: 'search failed' }] }))));

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

  // Citation chasing: the references and citations of the three best papers so far.
  let chased = 0;
  if (settings.snowball) {
    const seeds = sortPapers(mergeResults(lists)).filter((paper) => paper.doi).slice(0, 3);
    const links = await Promise.all(seeds.flatMap((paper) => (['references', 'citations'] as const).map((direction) =>
      semanticScholarLinks(`DOI:${paper.doi}`, direction, 25).catch(() => [] as FoundPaper[]))));
    const chasedPapers = applyFilters(links.flat().filter((paper) => paper.title && paper.title !== 'Untitled'), { excludeRetracted: true, ...input.filters });
    chased = chasedPapers.length;
    found += chased;
    if (chased) lists.push(chasedPapers);
  }

  const library = lists.flat().filter((paper) => paper.providers.includes('library'));
  const merged = sortPapers(mergeResults(lists));
  const candidates = [...new Map([...merged.slice(0, settings.candidates), ...merged.filter((paper) => library.some((item) => paperKey(item) === paperKey(paper)))].map((paper) => [paperKey(paper), paper])).values()];
  return { candidates, web: results[0]?.web.slice(0, input.depth === 'summary' ? 3 : 6) ?? [], counts, errors, found, unique: merged.length, chased, subsOf };
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

/** Evidence score 0-1: relevance 45%, study design 25%, citations a year 15%, recency 8%, journal 7%; preprints lose a little. */
export function evidenceScore(paper: Pick<FoundPaper, 'study_type' | 'cited_by_count' | 'year' | 'journal' | 'is_preprint'>, relevance: number, now = new Date().getUTCFullYear()): number {
  const rel = [0, 0.25, 0.6, 1][Math.max(0, Math.min(3, relevance))];
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
    const { text } = await extractText('paper.pdf', bytes);
    return text.trim() ? relevantPassages(text, question, 3000) : null;
  } catch {
    return null;
  }
}

type Reading = { stance: Stance; finding: string; sample: string | null; limits: string | null };

/** One finding, sample, limitation and stance per paper, from its abstract and any full-text passages. */
export async function readPapers(llm: LlmSlot, question: string, sources: ResearchSource[], usage: LlmUsage, signal?: Signal): Promise<Map<number, Reading>> {
  const out = new Map<number, Reading>();
  const papers = sources.filter((source) => source.kind === 'paper' || source.kind === 'library');
  await mapLimit(chunk(papers, 10), 3, async (batch) => {
    try {
      const { text, usage: used } = await llm.complete({
        task: 'fast', temperature: 0, maxTokens: 150 + batch.length * 110, json: true, signal,
        messages: [
          {
            role: 'system',
            content: 'You extract evidence for a literature review. Answer with JSON only: {"items": [{"n": 1, "stance": "supports|mixed|against|unclear", "finding": "…", "sample": "…", "limits": "…"}]}, one item per paper. '
              + '"finding": the result that bears on the question, one sentence of at most 30 words, with the numbers given. '
              + '"sample": who or what was studied and how many (e.g. "1,204 adults in 3 cohorts"), or null. "limits": the main limitation in at most 12 words, or null. '
              + '"stance": "supports" when the findings say yes to the question (or support its claim), "against" no, "mixed" both, "unclear" when the paper does not test it. Use only the text given.',
          },
          {
            role: 'user',
            content: `Question: ${clip(question, 400)}\n\n${batch.map((source) => `n=${source.n}: ${clip(source.title, 220)} (${source.year ?? 'n.d.'})${source.study_type_label ? ` [${source.study_type_label}]` : ''}\nAbstract: ${clip(source.abstract || source.tldr, 1000) || 'none'}${source.passage ? `\nFull text: ${clip(source.passage, 2200)}` : ''}`).join('\n\n')}`,
          },
        ],
      });
      addUsage(usage, used);
      for (const item of parseJson<{ items?: { n: number; stance: string; finding?: string; sample?: string | null; limits?: string | null }[] }>(text)?.items ?? []) {
        if (!batch.some((source) => source.n === Number(item.n))) continue;
        const stance = (['supports', 'mixed', 'against', 'unclear'] as Stance[]).includes(item.stance as Stance) ? (item.stance as Stance) : 'unclear';
        const finding = clip(item.finding, 300);
        if (finding) out.set(Number(item.n), { stance, finding, sample: clip(item.sample, 120) || null, limits: clip(item.limits, 120) || null });
      }
    } catch (error) {
      if (signal?.aborted) throw error;
      /* unread papers are written from their abstracts */
    }
  });
  return out;
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

type ClaimVerdict = { verdict: 'yes' | 'partly' | 'no'; note: string | null };

/** Checks each claim against the sources it cites. Claims the model could not check count as supported. */
export async function checkClaims(llm: LlmSlot, claims: { text: string; markers: number[] }[], sources: ResearchSource[], usage: LlmUsage, signal?: Signal): Promise<ClaimVerdict[]> {
  const out: ClaimVerdict[] = claims.map(() => ({ verdict: 'yes', note: null }));
  const byN = new Map(sources.map((source) => [source.n, source]));
  await mapLimit(chunk(claims.map((claim, index) => ({ claim, index })), 15), 3, async (batch) => {
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
            content: `Sources:\n${cited.map((source) => `[S${source.n}] ${clip(source.title, 200)}. ${source.finding ? `Finding: ${source.finding} ` : ''}${clip(source.abstract || source.tldr, 700)}${source.passage ? ` Full text: ${clip(source.passage, 700)}` : ''}`).join('\n')}\n\nClaims:\n${batch.map(({ claim, index }) => `i=${index}: ${clip(claim.text, 500)}`).join('\n')}`,
          },
        ],
      });
      addUsage(usage, used);
      for (const item of parseJson<{ items?: { i: number; v: string; note?: string }[] }>(text)?.items ?? []) {
        const index = Number(item.i);
        if (!batch.some((entry) => entry.index === index)) continue;
        const verdict = item.v === 'no' ? 'no' : item.v === 'partly' ? 'partly' : 'yes';
        out[index] = { verdict, note: verdict === 'yes' ? null : clip(item.note, 160) || null };
      }
    } catch (error) {
      if (signal?.aborted) throw error;
    }
  });
  return out;
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
  for (const source of papers) source.check = { status: 'no_doi', note: null };
  // DataCite DOIs (arXiv, Zenodo) are not at Crossref.
  const withDoi = papers.filter((source) => doiKey(source.doi) && !/^10\.(48550|5281)\//.test(doiKey(source.doi)!)).slice(0, max);
  await mapLimit(withDoi, 5, async (source) => {
    const [work, notices] = await Promise.all([crossrefWork(source.doi!).catch(() => undefined), crossrefUpdates(source.doi!).catch(() => [])]);
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
      source.check = { status: 'unconfirmed', note: work === null ? 'DOI not found at Crossref' : 'Crossref did not answer' };
    }
  });
}

// ------------------------------------------------------------------ the run

const GROUP_NAMES: Record<string, string> = { papers: 'OpenAlex and Semantic Scholar', medical: 'PubMed and Europe PMC', preprints: 'arXiv and preprint servers', web: 'the web', library: 'your Library' };

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
    done(id: StepId, detail: string, data: Record<string, unknown> | null = null) {
      Object.assign(find(id), { state: 'done', detail, data, ms: Date.now() - (started.get(id) ?? Date.now()) });
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

/** Runs one research job through the seven steps. Throws when nothing usable was found or the model fails. */
export async function runResearch(llm: LlmSlot, input: ResearchInput, context: { userId: string; signal?: AbortSignal }, events: ResearchEvents): Promise<ResearchResult> {
  const settings = DEPTH_SETTINGS[input.depth];
  const usage = usage0();
  const { signal } = context;
  const track = stepTracker(events);
  try {
    // 1. Plan
    track.start('plan', settings.subQuestions > 1 ? 'Breaking the question into sub-questions' : 'Reading your question');
    const reviewed = input.plan ? cleanPlan(input.plan, 8, 3) : null;
    const plan = reviewed?.sub_questions.length ? reviewed : await planResearch(llm, input.question, input.depth, usage, signal);
    const searches = planSearches(input.question, plan, settings.queries);
    track.done('plan', plan.sub_questions.length > 1 ? `${plural(plan.sub_questions.length, 'sub-question')}, ${plural(searches.length, 'search', 'searches')}` : 'One focused search',
      { sub_questions: plan.sub_questions, reviewed: Boolean(reviewed?.sub_questions.length) });

    // 2. Search
    track.start('search', `Searching ${input.groups.map((group) => GROUP_NAMES[group] || group).join(', ')}`, { queries: searches.map((item) => item.query) });
    const searched = await searchStep(input, plan, context.userId);
    const queries = searches.map((item) => item.query);
    const duplicates = Math.max(0, searched.found - searched.unique);
    track.done('search', [`${plural(searched.found, 'result')} found`, duplicates ? `${plural(duplicates, 'duplicate')} removed` : null, searched.chased ? `${searched.chased} from citation chasing` : null].filter(Boolean).join(' · '),
      { queries, counts: searched.counts, errors: searched.errors, found: searched.found, unique: searched.unique, duplicates, chased: searched.chased, web: searched.web.length });
    if (!searched.candidates.length && !input.attachments.length && !searched.web.length) throw new ResearchEmptyError();

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
    if (!kept.length && !input.attachments.length && !searched.web.length) throw new ResearchEmptyError();

    // 4. Rank
    track.start('rank', 'Weighing study design, relevance, citations and recency');
    const scored = kept.map((item) => ({ ...item, score: evidenceScore(item.paper, item.relevance), subs: [...(searched.subsOf.get(paperKey(item.paper)) ?? [])] }));
    const picked = pickPapers(scored, settings.papers, plan.sub_questions.length);
    const designs = new Map<string, number>();
    for (const item of picked) if (item.paper.study_type && item.paper.study_type !== 'other') designs.set(item.paper.study_type, (designs.get(item.paper.study_type) ?? 0) + 1);
    const numbered: ResearchSource[] = [];
    for (const file of input.attachments) numbered.push(fileSource(file, input.question, numbered.length + 1));
    for (const item of picked) {
      const source = paperSource(item.paper, numbered.length + 1);
      Object.assign(source, { relevance: item.relevance, rank_score: item.score, sub_questions: item.subs });
      numbered.push(source);
    }
    const webSources = searched.web.map((result, index) => webSource(result, numbered.length + 1 + index));
    const all = [...numbered, ...webSources];
    if (!all.length) throw new ResearchEmptyError();
    track.done('rank', `Kept the best ${plural(picked.length, 'paper')}${designs.size ? ` · ${[...designs].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([type, count]) => `${count} ${numbered.find((source) => source.study_type === type)?.study_type_label?.toLowerCase() ?? type}`).join(', ')}` : ''}`, {
      kept: picked.length,
      top: numbered.filter((source) => source.kind !== 'file').slice(0, 12).map((source) => ({ n: source.n, title: source.title, year: source.year, design: source.study_type_label, score: source.rank_score, cited_by: source.cited_by_count })),
      covered: plan.sub_questions.map((_, sub) => numbered.filter((source) => source.sub_questions?.includes(sub)).length),
    });
    events.sources(numbered, webSources, { counts: searched.counts, errors: searched.errors, queries });

    // 5. Read
    const papers = numbered.filter((source) => source.kind === 'paper' || source.kind === 'library');
    track.start('read', `Reading ${plural(papers.length, 'paper')}`);
    if (settings.fullTexts > 0) {
      const top = picked.slice(0, Math.max(settings.fullTexts * 2, 12));
      await mapLimit(top.filter((item) => item.paper.doi && !item.paper.pdf_url), 5, async (item) => {
        const copy = await unpaywall(item.paper.doi!).catch(() => null);
        if (copy) { item.paper.oa_url = copy.url; item.paper.pdf_url = copy.pdf; item.paper.is_oa = true; }
      });
      const open = top.filter((item) => item.paper.pdf_url).slice(0, settings.fullTexts);
      await mapLimit(open, 4, async (item) => {
        const source = numbered.find((entry) => entry.id === item.paper.id);
        if (!source) return;
        source.pdf_url = item.paper.pdf_url;
        source.is_oa = item.paper.is_oa;
        const passage = await openFullText(item.paper.pdf_url, `${input.question} ${plan.sub_questions.map((sub) => sub.question).join(' ')}`);
        if (passage) { source.passage = passage; source.full_text = true; }
      });
    }
    const readings = await readPapers(llm, input.question, numbered, usage, signal);
    for (const source of numbered) {
      const reading = readings.get(source.n);
      if (reading) Object.assign(source, reading);
    }
    const fullTexts = numbered.filter((source) => source.full_text).length;
    const stances = { supports: 0, mixed: 0, against: 0, unclear: 0 } as Record<Stance, number>;
    for (const source of numbered) if (source.stance) stances[source.stance] += 1;
    track.done('read', [`${plural(readings.size, 'paper')} read`, fullTexts ? `${fullTexts} in full text` : null, stances.supports || stances.against || stances.mixed ? `${stances.supports} support, ${stances.mixed} mixed, ${stances.against} against` : null].filter(Boolean).join(' · '), {
      read: readings.size, full_texts: fullTexts, stances,
    });
    events.sources(numbered.map(publicSource), webSources, { counts: searched.counts, errors: searched.errors, queries });

    // 6. Write
    track.start('write', `Writing from ${plural(all.length, 'source')}`);
    let answer = '';
    const streamed = await llm.stream(
      { messages: researchPrompt(input, all), task: input.highQuality || input.depth !== 'summary' ? 'review' : 'fast', maxTokens: input.highQuality ? Math.round(settings.maxTokens * 1.5) : settings.maxTokens, temperature: 0.3, signal },
      (text) => { answer += text; events.delta(text); },
    );
    addUsage(usage, streamed.usage);
    const raw = answer.trim();
    let markdown = dropInventedMarkers(raw, all, '');
    if (!markdown) throw new Error('The AI returned nothing.');
    const words = (markdown.replace(MARKERS, '').match(/\S+/g) || []).length;
    track.done('write', `${words.toLocaleString('en-US')} words, ${plural(usedSources(markdown, all).length, 'source')} cited`, { words });

    // 7. Verify
    const claims = citedClaims(markdown).slice(0, settings.claims);
    track.start('verify', `Checking ${plural(claims.length, 'citation')} against their sources`);
    const droppedMarkers = Math.max(0, markersIn(raw).length - markersIn(markdown).length);
    const [verdictsOfClaims] = await Promise.all([
      checkClaims(llm, claims, all, usage, signal),
      checkReferences(usedSources(markdown, all), settings.references),
    ]);
    const wrong = claims.map((claim, index) => ({ ...claim, ...verdictsOfClaims[index] })).filter((claim) => claim.verdict !== 'yes');
    const toRevise = wrong.slice(0, 12);
    const revisions = await reviseClaims(llm, toRevise.map((claim) => ({ text: claim.text, markers: claim.markers, note: claim.note })), input.language, usage, signal);
    const flags: Verification['flags'] = [];
    toRevise.forEach((claim, index) => {
      const revised = revisions[index];
      if (revised && markdown.includes(claim.text)) {
        markdown = markdown.replace(claim.text, revised);
        flags.push({ kind: 'revised', text: claim.text, revised, note: claim.note });
      } else if (claim.verdict === 'no') {
        flags.push({ kind: 'unsupported', text: claim.text, note: claim.note });
      }
    });
    for (const claim of wrong.slice(12)) if (claim.verdict === 'no') flags.push({ kind: 'unsupported', text: claim.text, note: claim.note });
    const cited = usedSources(markdown, all);
    const refs = cited.filter((source) => source.check && source.check.status !== 'no_doi');
    for (const source of refs) {
      const status = source.check!.status;
      if (status === 'retracted' || status === 'corrected' || status === 'concern' || status === 'unconfirmed') flags.push({ kind: status, text: source.title, note: source.check!.note, n: source.n });
    }
    const verification: Verification = {
      claims: {
        checked: claims.length, supported: claims.length - wrong.length, partly: wrong.filter((claim) => claim.verdict === 'partly').length,
        unsupported: wrong.filter((claim) => claim.verdict === 'no').length, revised: flags.filter((flag) => flag.kind === 'revised').length,
      },
      references: {
        checked: refs.length, confirmed: refs.filter((source) => source.check!.status === 'confirmed').length, retracted: refs.filter((source) => source.check!.status === 'retracted').length,
        corrected: refs.filter((source) => source.check!.status === 'corrected' || source.check!.status === 'concern').length, unconfirmed: refs.filter((source) => source.check!.status === 'unconfirmed').length,
      },
      flags,
      dropped_markers: droppedMarkers,
    };
    track.done('verify', [
      claims.length ? `${verification.claims.supported} of ${plural(claims.length, 'citation')} supported` : 'No citations to check',
      verification.claims.revised ? `${verification.claims.revised} revised` : null,
      refs.length ? `${verification.references.confirmed} of ${plural(refs.length, 'reference')} confirmed` : null,
      verification.references.retracted ? `${verification.references.retracted} retracted` : null,
    ].filter(Boolean).join(' · '), verification as unknown as Record<string, unknown>);

    const consensus = consensusOf(cited);
    const summary = markdown.replace(/^#+.*$/gm, '').replace(/\[S\d+(?:[,\s]*S?\d+)*\]/g, '').replace(/[*_>`|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 300);
    return {
      markdown, sources: cited.map(publicSource), all_sources: all.map(publicSource), consensus, queries,
      searched: { counts: searched.counts, errors: searched.errors }, plan, steps: track.steps, verification, usage, summary,
    };
  } catch (error) {
    track.fail(error instanceof ResearchEmptyError ? 'Nothing found' : signal?.aborted ? 'Stopped' : 'Stopped by an error');
    throw error;
  }
}

/** A source as the browser and the saved task keep it: without the long full-text passages. */
function publicSource(source: ResearchSource): ResearchSource {
  const { passage: _passage, ...rest } = source;
  return rest;
}
