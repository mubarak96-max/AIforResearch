/**
 * Citation Map, Landscape and Data Lab, mounted at /api/analysis (signed in):
 *   POST /citation-map               seeds (OpenAlex id, DOI, title or Library paper) → references and citations (no credits)
 *   POST /citation-map/snowball      the next round from the working set, ranked by links (no credits)
 *   POST /citation-map/reviews       reviews and meta-analyses that cite the set (no credits)
 *   PUT  /citation-map/:taskId/set   saves the working set to the map's task
 *   POST /landscape                  a topic's counts from OpenAlex (no credits)
 *   POST /data/save                  saves a Data Lab analysis (numbers only) to History (no credits)
 *   POST /data/report                an AI-written results section from the computed numbers (CREDIT_COSTS.data_ai)
 */
import { Hono } from 'hono';
import { createHash } from 'node:crypto';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { requireUser, type AppVariables } from '../auth.js';
import type { Slots } from '../slots/types.js';
import { LlmError, llmModelName, llmUnavailable } from '../slots/llm.js';
import { currentUser, meterTokens, parseBody } from '../lib/assist-llm.js';
import { CREDIT_COSTS, refundCredits, spendCredits, type CreditCharge } from '../lib/plans.js';
import { createTask, finishTask, getTaskFor, updateTaskResult } from '../lib/history.js';
import { getLibraryDocuments } from '../lib/assist-store.js';
import { researchProfile } from '../lib/users.js';
import { rateLimit } from '../lib/rateLimit.js';
import { citationMap, dataReportPrompt, landscape, reviewsCiting, snowball } from '../lib/analysis.js';
import { ANALYSES, OPTION_KEYS, analysisDef, variableRange } from '../../dataLabAnalyses.js';

const Seed = z.object({
  work_id: z.string().max(40).nullish(), doi: z.string().max(300).nullish(), title: z.string().max(500).nullish(), library_document_id: z.string().max(64).nullish(),
});
const Ids = z.array(z.string().regex(/^W\d{1,12}$/)).max(50);
const SetPaper = z.object({ id: z.string().max(40), title: z.string().max(500), year: z.number().int().nullable().optional(), doi: z.string().max(300).nullable().optional(), round: z.number().int().optional() });
const Kinds = z.record(z.enum(['numeric', 'categorical']));
const Fingerprint = z.string().regex(/^[a-f0-9]{64}$/);
const Reproducibility = z.object({
  schema: z.literal(1), software: z.string().max(80), created_at: z.string().datetime(), dataset_sha256: Fingerprint,
  rows: z.number().int().min(0).max(50_000), columns: z.array(z.string().max(200)).max(200), truncated: z.boolean(), column_kinds: Kinds,
  transformations: z.array(z.object({ at: z.string().datetime(), action: z.enum(['load', 'edit_data', 'column_type', 'derive']), detail: z.string().max(500) })).max(300),
  analyses: z.array(z.object({ test: z.enum(ANALYSES.map((item) => item.id) as [string, ...string[]]), variables: z.array(z.string().max(200)).min(1).max(41), options: z.object(Object.fromEntries(OPTION_KEYS.map((key) => [key, z.string().max(200)])) as Record<(typeof OPTION_KEYS)[number], z.ZodString>).partial().strict().optional(), kinds: Kinds, at: z.string().datetime(), dataset_sha256: Fingerprint, missing: z.literal('complete_observations'), rows_used: z.number().int().min(0), rows_omitted: z.number().int().min(0) }).refine((spec) => { const [min, max] = variableRange(analysisDef(spec.test)!); return spec.variables.length >= min && spec.variables.length <= max; }, 'An analysis has the wrong number of columns.')).max(30),
  notes: z.string().max(10_000),
});

const LEVELS: Record<string, string> = {
  undergraduate: 'an undergraduate student', honours: 'an honours student', masters: 'a master’s student', phd: 'a doctoral researcher',
  academic: 'an academic', researcher: 'a researcher', clinician: 'a clinician', industry: 'a professional analyst',
};

export function analysisRoutes(slots: Slots) {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use('*', requireUser);
  const searches = rateLimit({ key: 'analysis', limit: 300, windowSeconds: 3600 });

  app.post('/citation-map', searches, async (c) => {
    const user = currentUser(c);
    const body = await parseBody(c, z.object({ seeds: z.array(Seed).min(1).max(10), limit: z.number().int().min(10).max(100).default(40), save: z.boolean().default(true), project_id: z.string().max(64).nullish() }));
    // Library papers become their DOI or title.
    const libraryIds = body.seeds.map((seed) => seed.library_document_id).filter((id): id is string => Boolean(id));
    const library = new Map((await getLibraryDocuments(user.id, libraryIds)).map((doc) => [doc.id, doc]));
    const seeds = body.seeds.map((seed) => {
      const doc = seed.library_document_id ? library.get(seed.library_document_id) : null;
      return doc ? { doi: doc.doi, title: doc.title || doc.filename } : seed;
    });
    const map = await citationMap(seeds, body.limit);
    if (!map.seeds.length) throw new HTTPException(404, { message: 'That paper was not found. Try its DOI or a longer part of its title.' });
    let taskId: string | null = null;
    if (body.save) {
      taskId = await createTask(user, { kind: 'citation_map', title: map.seeds.length === 1 ? map.seeds[0].title : `${map.seeds[0].title} and ${map.seeds.length - 1} more`, inputs: { seeds: map.seeds.map((seed) => ({ work_id: seed.id, title: seed.title })) }, project_id: body.project_id ?? null });
      await finishTask(taskId, { summary: `${map.references.length} references and ${map.citations.length} citing papers`, seeds: map.seeds.map(({ abstract: _a, ...seed }) => seed), set: map.seeds.map((seed) => ({ id: seed.id, title: seed.title, year: seed.year, doi: seed.doi, round: 0 })) });
    }
    return c.json({ task_id: taskId, ...map });
  });

  app.post('/citation-map/snowball', searches, async (c) => {
    const body = await parseBody(c, z.object({ ids: Ids.min(1), direction: z.enum(['backward', 'forward', 'both']).default('both'), exclude: z.array(z.string().max(40)).max(2000).default([]), limit: z.number().int().min(10).max(100).default(60) }));
    return c.json({ candidates: await snowball(body.ids, body.direction, body.exclude, body.limit) });
  });

  app.post('/citation-map/reviews', searches, async (c) => {
    const body = await parseBody(c, z.object({ ids: Ids.min(1) }));
    return c.json({ reviews: await reviewsCiting(body.ids) });
  });

  app.put('/citation-map/:taskId/set', async (c) => {
    const user = currentUser(c);
    const body = await parseBody(c, z.object({ set: z.array(SetPaper).max(500), seen: z.array(z.string().max(40)).max(3000).default([]) }));
    const task = await getTaskFor(user, c.req.param('taskId'), 'edit');
    if (task.kind !== 'citation_map') throw new HTTPException(409, { message: 'This is not a citation map.' });
    await updateTaskResult(task.id, { ...(task.result ?? {}), set: body.set, seen: body.seen, summary: `${body.set.length} papers in the set` });
    return c.json({ ok: true });
  });

  app.post('/landscape', searches, async (c) => {
    const user = currentUser(c);
    const body = await parseBody(c, z.object({
      query: z.string().trim().min(2).max(300), compare: z.string().trim().max(300).nullish(),
      from_year: z.number().int().min(1800).max(2100).nullish(), to_year: z.number().int().min(1800).max(2100).nullish(), save: z.boolean().default(true), project_id: z.string().max(64).nullish(),
    }));
    const [main, other] = await Promise.all([
      landscape(body.query, { fromYear: body.from_year, toYear: body.to_year }),
      body.compare && body.compare.length >= 2 ? landscape(body.compare, { fromYear: body.from_year, toYear: body.to_year }) : Promise.resolve(null),
    ]);
    let taskId: string | null = null;
    if (body.save) {
      taskId = await createTask(user, { kind: 'landscape', title: body.compare ? `${body.query} vs ${body.compare}` : body.query, inputs: { query: body.query, compare: body.compare ?? null, from_year: body.from_year ?? null, to_year: body.to_year ?? null }, project_id: body.project_id ?? null });
      await finishTask(taskId, { summary: `${main.total.toLocaleString('en-US')} works in OpenAlex${other ? `; ${other.total.toLocaleString('en-US')} for ${other.query}` : ''}`, landscape: main, compare: other });
    }
    return c.json({ task_id: taskId, landscape: main, compare: other });
  });

  const DataBody = z.object({
    title: z.string().trim().min(1).max(200),
    question: z.string().trim().max(1000).default(''),
    dataset: z.string().trim().max(200),
    n: z.number().int().min(0).max(10_000_000),
    columns: z.array(z.object({ name: z.string().max(200), kind: z.string().max(20), summary: z.string().max(600) })).max(200),
    results: z.array(z.object({
      title: z.string().max(300), rows: z.array(z.tuple([z.string().max(200), z.string().max(300)])).max(60), apa: z.string().max(2000).optional(), warnings: z.array(z.string().max(400)).max(10).optional(),
      chart: z.object({ kind: z.enum(['survival', 'roc']), x: z.string().max(200), y: z.string().max(200), series: z.array(z.object({ name: z.string().max(200), points: z.array(z.tuple([z.number().finite(), z.number().finite()])).max(420) })).max(12) }).optional(),
    })).min(1).max(30),
    project_id: z.string().max(64).nullish(),
    task_id: z.string().max(64).nullish(),
    reproducibility: Reproducibility.optional(),
    save_dataset: z.boolean().default(false),
    dataset_snapshot: z.string().max(2_000_000).optional(),
  });

  function reproducibleFields(body: z.infer<typeof DataBody>) {
    if (body.dataset_snapshot !== undefined && !body.save_dataset) throw new HTTPException(422, { message: 'Saving raw data requires explicit opt-in.' });
    if (body.save_dataset && (body.dataset_snapshot === undefined || !body.reproducibility)) throw new HTTPException(422, { message: 'Include the dataset and its reproducibility record to save a snapshot.' });
    if (body.dataset_snapshot !== undefined && Buffer.byteLength(body.dataset_snapshot, 'utf8') > 2_000_000) throw new HTTPException(422, { message: 'Dataset snapshots must be no larger than 2 MB.' });
    if (body.dataset_snapshot !== undefined && createHash('sha256').update(body.dataset_snapshot).digest('hex') !== body.reproducibility?.dataset_sha256) throw new HTTPException(422, { message: 'The dataset fingerprint does not match the saved analysis.' });
    if (body.reproducibility?.analyses.some((spec) => spec.dataset_sha256 !== body.reproducibility!.dataset_sha256)) throw new HTTPException(422, { message: 'Every analysis must use the same dataset version.' });
    return { ...(body.reproducibility ? { reproducibility: body.reproducibility } : {}), dataset_snapshot: body.save_dataset ? body.dataset_snapshot : null };
  }

  app.post('/data/save', async (c) => {
    const user = currentUser(c);
    const body = await parseBody(c, DataBody);
    const saved = { summary: `${body.results.length} result${body.results.length === 1 ? '' : 's'} from ${body.dataset}`, dataset: body.dataset, n: body.n, columns: body.columns, results: body.results, question: body.question, ...reproducibleFields(body) };
    if (body.task_id) {
      const task = await getTaskFor(user, body.task_id, 'edit');
      if (task.kind !== 'data') throw new HTTPException(409, { message: 'This is not a Data Lab analysis.' });
      await updateTaskResult(task.id, { ...(task.result ?? {}), ...saved }, { title: body.title });
      return c.json({ task_id: task.id });
    }
    const taskId = await createTask(user, { kind: 'data', title: body.title, inputs: { dataset: body.dataset, question: body.question }, project_id: body.project_id ?? null });
    await finishTask(taskId, saved);
    return c.json({ task_id: taskId });
  });

  app.post('/data/report', async (c) => {
    const user = currentUser(c);
    const body = await parseBody(c, DataBody);
    const reproduction = reproducibleFields(body);
    if (body.task_id && (await getTaskFor(user, body.task_id, 'edit')).kind !== 'data') throw new HTTPException(409, { message: 'This is not a Data Lab analysis.' });
    const unavailable = llmUnavailable(slots.llm);
    if (unavailable) throw new HTTPException(503, { message: unavailable });
    let charge: CreditCharge | null = await spendCredits(user.account_id, CREDIT_COSTS.data_ai, 'A Data Lab report');
    try {
      const profile = await researchProfile(user.id);
      const { text, usage } = await slots.llm.complete({
        messages: dataReportPrompt({ question: body.question, dataset: body.dataset, n: body.n, columns: body.columns, results: body.results, level: LEVELS[profile.role || ''] || 'a researcher' }),
        task: 'fast', temperature: 0.2, maxTokens: 1800,
      });
      await meterTokens(user, usage, { feature: 'data:report', provider: slots.llm.provider, model: llmModelName(slots.llm, 'fast') });
      const markdown = text.trim();
      if (!markdown) throw new HTTPException(503, { message: 'The AI returned nothing. Try again.' });
      const saved = { summary: markdown.replace(/[#*_]/g, '').slice(0, 300), markdown, dataset: body.dataset, n: body.n, columns: body.columns, results: body.results, question: body.question, ...reproduction };
      let taskId = body.task_id ?? null;
      if (taskId) {
        const task = await getTaskFor(user, taskId, 'edit');
        await updateTaskResult(task.id, { ...(task.result ?? {}), ...saved });
      } else {
        taskId = await createTask(user, { kind: 'data', module: 'report', title: body.title, inputs: { dataset: body.dataset, question: body.question }, project_id: body.project_id ?? null, credits: CREDIT_COSTS.data_ai });
        await finishTask(taskId, saved);
      }
      charge = null;
      return c.json({ task_id: taskId, markdown, credits: CREDIT_COSTS.data_ai });
    } catch (error) {
      if (error instanceof LlmError) throw new HTTPException(error.status, { message: error.message });
      throw error;
    } finally {
      await refundCredits(charge);
    }
  });

  return app;
}
