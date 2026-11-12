/**
 * Writing Studio, Thesis Suite, Proposal Studio and Slides, mounted at /api/studio:
 *   POST /run/:module             any module of studioCatalog.ts (Server-Sent Events: task, status, sources, delta, done | error)
 *   POST /similar                 Similar papers from a title or abstract (no credits)
 *   GET  /slides/export-allowed   200 when the plan includes PowerPoint export, 402 otherwise
 *
 * A run takes its credits first and gives them back when it fails. Grounded modules search the
 * chosen sources (or reuse the sources of the research task they continue, `from_task`) and may
 * cite only those; every run is saved to History.
 */
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { requireUser, type AppVariables, type AuthUser } from '../auth.js';
import type { LlmUsage, Slots } from '../slots/types.js';
import { LlmError, llmModelName, llmUnavailable } from '../slots/llm.js';
import { currentUser, meterTokens, parseBody } from '../lib/assist-llm.js';
import { dropInventedMarkers, queryFromText, usedSources } from '../lib/assist-papers.js';
import { CREDIT_COSTS, refundCredits, requireFeature, spendCredits } from '../lib/plans.js';
import { researchProfile } from '../lib/users.js';
import { parseJson, planQueries, relevantPassages, type ResearchSource } from '../lib/research.js';
import { mergeResults, searchSources, sortPapers, semanticScholarSimilar, SOURCE_GROUPS, STUDY_TYPE_LABELS, type FoundPaper, type SourceGroup } from '../lib/sources/index.js';
import { searchSemanticScholar } from '../lib/sources/providers.js';
import { createTask, failTask, finishTask, getTaskFor } from '../lib/history.js';
import { Filters, toFilters } from './research.js';
import { STUDIO_KIND, studioCredits, studioModule, type StudioField, type StudioModule } from '../lib/studioCatalog.js';
import { batches, buildStudioPrompt, cleanDeck, hasStudioPrompt, improvePrompt, paragraphsOf, type StudioLength } from '../lib/studioModules.js';

const RunRequest = z.object({
  inputs: z.record(z.string(), z.string()).default({}),
  groups: z.array(z.enum(SOURCE_GROUPS)).min(1).max(5).default(['papers']),
  filters: Filters,
  role: z.string().trim().max(40).nullish(),
  headings: z.boolean().default(true),
  length: z.enum(['short', 'standard', 'long']).default('standard'),
  language: z.string().trim().max(40).nullish(),
  high_quality: z.boolean().default(false),
  from_task: z.string().max(64).nullish(),
  project_id: z.string().max(64).nullish(),
  library_document_ids: z.array(z.string()).max(50).default([]),
  attachments: z.array(z.object({ name: z.string().trim().max(200), text: z.string().max(200_000) })).max(5).default([]),
});

/** The module's inputs checked against its fields: lengths, required fields and select options. */
export function checkInputs(module: StudioModule, raw: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const field of module.fields) out[field.name] = checkField(field, raw[field.name]);
  return out;
}

function checkField(field: StudioField, value: string | undefined): string {
  if (field.kind === 'select') {
    const values = (field.options ?? []).map(([option]) => option);
    return value && values.includes(value) ? value : values[0];
  }
  const text = (value ?? '').trim();
  if (field.required && text.length < (field.min ?? 1)) throw new HTTPException(422, { message: `Add ${field.label.toLowerCase()}${field.min && field.min > 1 ? ` (at least ${field.min} characters)` : ''}.` });
  if (text.length > field.max) throw new HTTPException(422, { message: `Keep ${field.label.toLowerCase()} under ${field.max.toLocaleString('en-US')} characters.` });
  return text;
}

/** Sources renumbered S1, S2 … in order. */
export function renumber(sources: ResearchSource[]): ResearchSource[] {
  return sources.map((source, index) => ({ ...source, n: index + 1, marker: `S${index + 1}` }));
}

export function paperToSource(paper: FoundPaper, n: number): ResearchSource {
  return {
    n, marker: `S${n}`, kind: paper.providers.includes('library') ? 'library' : 'paper', id: paper.id, title: paper.title,
    authors: paper.authors.map((author) => author.name), more_authors: paper.extra_author_count ?? 0, year: paper.year, venue: paper.venue,
    doi: paper.doi, url: paper.url, pdf_url: paper.pdf_url, is_oa: paper.is_oa, cited_by_count: paper.cited_by_count,
    study_type: paper.study_type, study_type_label: paper.study_type ? STUDY_TYPE_LABELS[paper.study_type] : null,
    journal_tier: paper.journal?.tier ?? null, is_preprint: paper.is_preprint, is_retracted: Boolean(paper.is_retracted),
    providers: paper.providers, abstract: paper.abstract ? paper.abstract.slice(0, 2400) : null, tldr: paper.tldr,
  };
}

function fileToSource(file: { name: string; text: string }, topic: string, n: number): ResearchSource {
  return {
    n, marker: `S${n}`, kind: 'file', id: `file:${n}`, title: file.name, authors: [], more_authors: 0, year: null, venue: 'Attached file',
    doi: null, url: null, pdf_url: null, is_oa: false, cited_by_count: null, study_type: null, study_type_label: 'Your file', journal_tier: null,
    is_preprint: false, is_retracted: false, providers: ['file'], abstract: relevantPassages(file.text, topic), tldr: null,
  };
}

const sse = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
const short = (value: string, max = 2000) => (value.length > max ? `${value.slice(0, max)}…` : value);

/** A task title from the module and its main field. */
export function taskTitle(module: StudioModule, inputs: Record<string, string>): string {
  const main = (inputs[module.topicField] || '').replace(/\s+/g, ' ').trim();
  if (module.topicField === 'topic' && main) return main.slice(0, 160);
  const firstWords = main.split(' ').slice(0, 10).join(' ');
  return `${module.label}${firstWords ? `: ${firstWords}${main.split(' ').length > 10 ? '…' : ''}` : ''}`.slice(0, 160);
}

export function studioRoutes(slots: Slots) {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use('*', requireUser);

  app.get('/slides/export-allowed', async (c) => {
    await requireFeature(currentUser(c).account_id, 'pptx_export');
    return c.json({ allowed: true });
  });

  app.post('/similar', async (c) => {
    const user = currentUser(c);
    const { text, project_id } = await parseBody(c, z.object({ text: z.string().trim().min(8, 'Paste a title or abstract.').max(6000), project_id: z.string().max(64).nullish() }));
    let papers: FoundPaper[] = [];
    let via: 'semantic_scholar' | 'search' = 'semantic_scholar';
    try {
      const seeds = await searchSemanticScholar({ query: text.split('\n')[0].slice(0, 300), filters: {}, limit: 5, sort: 'relevance' });
      const ids = seeds.slice(0, 3).map((seed) => seed.id.replace(/^S2:/, ''));
      papers = ids.length ? await semanticScholarSimilar(ids, 30) : [];
      // The seeds themselves are the closest matches when recommendations come back empty.
      if (papers.length < 5) papers = [...seeds, ...papers];
    } catch {
      papers = [];
    }
    if (papers.length < 5) {
      via = 'search';
      const result = await searchSources({ query: queryFromText(text, 8) || text.slice(0, 200), groups: ['papers'], limit: 25 }, { userId: user.id });
      papers = result.papers;
    }
    papers = sortPapers(mergeResults([papers])).slice(0, 30);
    const taskId = await createTask(user, { kind: 'thesis', module: 'similar', title: `Similar papers: ${text.split(/\s+/).slice(0, 10).join(' ')}`, inputs: { text: short(text) }, project_id: project_id ?? null, credits: 0 });
    const sources = papers.map((paper, index) => paperToSource(paper, index + 1));
    await finishTask(taskId, { sources, all_sources: sources, via, summary: `${sources.length} similar papers` });
    return c.json({ task_id: taskId, via, sources });
  });

  app.post('/run/:module', async (c) => {
    const user = currentUser(c);
    const module = studioModule(c.req.param('module'));
    if (!module || module.output === 'papers' || !hasStudioPrompt(module.id) && module.output !== 'compare') throw new HTTPException(404, { message: 'No such module.' });
    const body = await parseBody(c, RunRequest);
    const inputs = checkInputs(module, body.inputs);
    const unavailable = llmUnavailable(slots.llm);
    if (unavailable) throw new HTTPException(503, { message: unavailable });
    if (body.high_quality) await requireFeature(user.account_id, 'high_quality');
    // Plans without PowerPoint export get the five-slide preview, priced as a preview (like the free review).
    const previewOnly = module.output === 'slides' && !(await requireFeature(user.account_id, 'pptx_export').then(() => true, () => false));
    const credits = previewOnly ? CREDIT_COSTS.review_preview : studioCredits(module, inputs, CREDIT_COSTS, body.high_quality);
    const charge = await spendCredits(user.account_id, credits, module.label);
    let taskId: string;
    try {
      taskId = await createTask(user, {
        kind: STUDIO_KIND[module.workspace], module: module.id, title: taskTitle(module, inputs), project_id: body.project_id ?? null, credits,
        inputs: { ...Object.fromEntries(Object.entries(inputs).map(([key, value]) => [key, short(value)])), groups: body.groups, filters: body.filters, headings: body.headings, length: body.length, high_quality: body.high_quality, from_task: body.from_task ?? null, role: body.role ?? null },
      });
    } catch (error) {
      await refundCredits(charge);
      throw error;
    }
    const profile = await researchProfile(user.id);
    const abort = new AbortController();
    c.req.raw.signal?.addEventListener('abort', () => abort.abort(), { once: true });
    const encoder = new TextEncoder();
    let closed = false;
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          if (closed) return;
          try { controller.enqueue(encoder.encode(sse(event, data))); } catch { closed = true; }
        };
        send('task', { id: taskId, credits });
        const usage: LlmUsage = { inputTokens: 0, outputTokens: 0 };
        try {
          const result = await runModule(slots, user, module, inputs, body, profile, usage, abort.signal, send);
          await meterTokens(user, usage, { feature: `studio:${module.id}`, provider: slots.llm.provider, model: llmModelName(slots.llm, body.high_quality ? 'review' : 'fast') });
          await finishTask(taskId, result);
          send('done', { task_id: taskId, credits, ...result });
        } catch (error) {
          await refundCredits(charge);
          if (usage.inputTokens) await meterTokens(user, usage, { feature: `studio:${module.id}`, provider: slots.llm.provider }).catch(() => undefined);
          const message = error instanceof HTTPException ? error.message
            : error instanceof LlmError && error.code !== 'upstream' ? error.message
              : abort.signal.aborted ? 'Stopped.' : 'This stopped before it finished. Your credits were returned; try again.';
          await failTask(taskId, message);
          if (!(error instanceof HTTPException) && !abort.signal.aborted) console.error(`studio ${module.id} failed`, error);
          send('error', { status: error instanceof HTTPException ? error.status : error instanceof LlmError ? error.status : 500, detail: message });
        } finally {
          if (!closed) { closed = true; try { controller.close(); } catch { /* closed */ } }
        }
      },
      cancel() { closed = true; abort.abort(); },
    });
    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' } });
  });

  return app;
}

type RunBody = z.infer<typeof RunRequest>;
/** Slides shown on plans without PowerPoint export. */
export const FREE_SLIDES = 5;
type Send = (event: string, data: unknown) => void;

/** The sources a run may cite: the research task it continues, or a fresh search, plus attached files. */
async function gatherStudioSources(slots: Slots, user: AuthUser, module: StudioModule, inputs: Record<string, string>, body: RunBody, usage: LlmUsage, send: Send): Promise<ResearchSource[]> {
  const topic = inputs[module.topicField] || inputs.topic || '';
  const files = body.attachments.map((file, index) => fileToSource(file, topic, index + 1));
  let found: ResearchSource[] = [];
  if (body.from_task) {
    const task = await getTaskFor(user, body.from_task);
    found = ((task.result?.all_sources ?? task.result?.sources ?? []) as ResearchSource[]).filter((source) => source.kind !== 'file');
    send('status', { stage: 'reading', detail: `Using the ${found.length} sources of “${task.title.slice(0, 60)}”` });
  } else if (module.grounded && !(module.id === 'slides' && inputs.text)) {
    const groups: SourceGroup[] = body.library_document_ids.length && !body.groups.includes('library') ? [...body.groups, 'library'] : body.groups;
    send('status', { stage: 'planning', detail: module.grounded === 'multi' ? 'Planning the searches' : 'Searching the literature' });
    const queries = module.grounded === 'multi' ? await planQueries(slots.llm, topic, 3, usage) : [topic.slice(0, 300)];
    send('status', { stage: 'searching', detail: 'Searching the literature' });
    const results = await Promise.all(queries.map((query, index) => searchSources(
      { query, groups: index === 0 ? groups : groups.filter((group) => group !== 'library' && group !== 'web'), filters: toFilters(body.filters), limit: module.grounded === 'multi' ? 14 : 14, libraryDocumentIds: body.library_document_ids },
      { userId: user.id },
    ).catch(() => ({ papers: [], web: [], counts: {}, errors: [] }))));
    const papers = sortPapers(mergeResults(results.map((result) => result.papers))).slice(0, module.grounded === 'multi' ? 22 : 12);
    found = papers.map((paper, index) => paperToSource(paper, index + 1));
    if (!found.length && !files.length) throw new HTTPException(422, { message: 'No papers found for this topic with these sources and filters. Try broader words or fewer filters.' });
  }
  return renumber([...files, ...found]);
}

async function runModule(slots: Slots, user: AuthUser, module: StudioModule, inputs: Record<string, string>, body: RunBody, profile: Awaited<ReturnType<typeof researchProfile>>, usage: LlmUsage, signal: AbortSignal, send: Send): Promise<Record<string, unknown>> {
  const add = (more: LlmUsage) => { usage.inputTokens += more.inputTokens; usage.outputTokens += more.outputTokens; };
  const role = body.role || profile.role;

  if (module.output === 'compare') {
    const paragraphs = paragraphsOf(inputs.text);
    const groups = batches(paragraphs);
    const pairs: { before: string; after: string; note: string }[] = [];
    for (const [index, group] of groups.entries()) {
      send('status', { stage: 'writing', detail: groups.length > 1 ? `Revising part ${index + 1} of ${groups.length}` : 'Revising' });
      const prompt = improvePrompt(group, inputs.goal, inputs.notes || '', { role, field: profile.field, language: body.language ?? null });
      const { text, usage: used } = await slots.llm.complete({ ...prompt, signal });
      add(used);
      const revised = parseJson<{ paragraphs?: { text?: string; note?: string }[] }>(text)?.paragraphs ?? [];
      group.forEach((before, at) => {
        const item = revised.length === group.length ? revised[at] : null;
        pairs.push({ before, after: String(item?.text || before).trim(), note: item ? String(item.note || '') : 'This part could not be revised; the original is kept.' });
      });
      send('pairs', { pairs });
    }
    const changed = pairs.filter((pair) => pair.after !== pair.before).length;
    return { pairs, summary: `${changed} of ${pairs.length} paragraphs changed`, markdown: pairs.map((pair) => pair.after).join('\n\n') };
  }

  const sources = await gatherStudioSources(slots, user, module, inputs, body, usage, send);
  if (sources.length) send('sources', { sources });
  const prompt = buildStudioPrompt(module, { inputs, sources, role, field: profile.field, headings: body.headings, length: body.length as StudioLength, language: body.language ?? null, highQuality: body.high_quality });
  send('status', { stage: 'writing', detail: sources.length ? `Reading ${sources.length} sources and writing` : 'Writing' });

  if (module.output === 'slides') {
    const { text, usage: used } = await slots.llm.complete({ ...prompt, signal });
    add(used);
    const deck = cleanDeck(parseJson(text), inputs.topic);
    if (!deck) throw new HTTPException(503, { message: 'The slides could not be made this time. Try again.' });
    const known = new Set(sources.map((source) => source.marker));
    for (const slide of deck.slides) slide.bullets = slide.bullets.map((bullet) => bullet.replace(/\[(S\d+(?:\s*[,;]\s*S?\d+)*)\]/g, (marker, group: string) => ([...group.matchAll(/S?(\d+)/g)].every((match) => known.has(`S${match[1]}`)) ? marker : '')).trim());
    // Plans without PowerPoint export see the first five slides; the rest are counted, not shown.
    const full = await requireFeature(user.account_id, 'pptx_export').then(() => true, () => false);
    const total = deck.slides.length;
    if (!full && total > FREE_SLIDES) deck.slides = deck.slides.slice(0, FREE_SLIDES);
    const allText = deck.slides.map((slide) => slide.bullets.join(' ')).join(' ');
    return { deck, locked_slides: total - deck.slides.length, sources: usedSources(allText, sources), all_sources: sources, summary: `${total} slides: ${deck.title}` };
  }

  let answer = '';
  const streamed = await slots.llm.stream({ ...prompt, signal }, (delta) => { answer += delta; send('delta', { text: delta }); });
  add(streamed.usage);
  const markdown = dropInventedMarkers(answer.trim(), sources, '');
  if (!markdown) throw new HTTPException(503, { message: 'The AI returned nothing. Try again.' });
  const summary = markdown.replace(/^#+.*$/gm, '').replace(/\[S\d+(?:[,\s]*S?\d+)*\]/g, '').replace(/[*_>`|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 300);
  return { markdown, sources: usedSources(markdown, sources), all_sources: sources, summary };
}
