/**
 * Research core, mounted at /api:
 *   GET  /sources/groups            the source picker and which groups work on this server
 *   POST /sources/search            Find Papers: search the chosen groups with filters (no credits)
 *   POST /research/plan             the sub-questions a Detailed report will research, to review first (no credits)
 *   POST /research                  Deep Research (Server-Sent Events: task, step, sources, figures, delta, markdown, done | error)
 *   POST /research/:id/follow-up    a follow-up answered from the same sources (1 credit)
 *   POST /research/:id/headings     headings on or off for a finished answer (off is free; adding them is 1 credit)
 *   POST /files/text                text from an attached PDF, Word, Markdown or text file
 *   GET|PATCH|DELETE /history…      History of every job
 *   /projects…                      Projects and sharing
 */
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { requireUser, type AppVariables } from '../auth.js';
import type { Slots } from '../slots/types.js';
import { LlmError, llmModelName, llmUnavailable } from '../slots/llm.js';
import { currentUser, meterTokens, parseBody } from '../lib/assist-llm.js';
import { CREDIT_COSTS, checkQuota, checkRunning, countUse, creditCost, refundCredits, requireFeature, spendCredits, type CreditCharge } from '../lib/plans.js';
import { researchProfile } from '../lib/users.js';
import { DEPTHS, DEPTH_SETTINGS, ResearchEmptyError, applyHeadings, followUpPrompt, hasHeadings, headingsPrompt, stripHeadings, usage0, type Depth, type ResearchSource } from '../lib/research.js';
import { cleanPlan, planResearch, runResearch } from '../lib/researchPipeline.js';
import { SOURCE_GROUPS, STUDY_TYPES, JOURNAL_TIER_ORDER, searchSources, sourceGroups } from '../lib/sources/index.js';
import { checkedOcrLanguages, extractText, ocrCapabilities } from '../lib/fileText.js';
import {
  createTask, deleteTask, failTask, finishTask, getTaskFor, listTasks, publicTask, runningResearch, updateTask, updateTaskResult, TASK_KINDS,
} from '../lib/history.js';
import { addMember, createProject, deleteProject, getProjectFor, listProjects, publicProject, removeMember, updateProject } from '../lib/projects.js';
import { rateLimit } from '../lib/rateLimit.js';
import { env } from '../env.js';
import { enqueueResearch, cancelResearch, researchJobExists } from '../lib/researchJobs.js';
import { RESEARCH_METHODS } from '../../researchMethods.js';

export const Filters = z.object({
  from_year: z.number().int().min(1800).max(2100).nullish(),
  to_year: z.number().int().min(1800).max(2100).nullish(),
  study_types: z.array(z.enum(STUDY_TYPES)).max(12).nullish(),
  open_access: z.boolean().nullish(),
  min_citations: z.number().int().min(0).max(1_000_000).nullish(),
  journal_tier: z.enum(JOURNAL_TIER_ORDER as unknown as [string, ...string[]]).nullish(),
  exclude_retracted: z.boolean().nullish(),
  exclude_preprints: z.boolean().nullish(),
}).default({});

export function toFilters(filters: z.infer<typeof Filters>) {
  return {
    fromYear: filters.from_year ?? undefined, toYear: filters.to_year ?? undefined, studyTypes: filters.study_types ?? undefined,
    openAccess: filters.open_access ?? undefined, minCitations: filters.min_citations ?? undefined,
    journalTier: (filters.journal_tier ?? undefined) as any, excludeRetracted: filters.exclude_retracted ?? true, excludePreprints: filters.exclude_preprints ?? undefined,
  };
}

const Groups = z.array(z.enum(SOURCE_GROUPS)).min(1).max(SOURCE_GROUPS.length);

const SearchRequest = z.object({
  query: z.string().trim().min(2).max(300),
  groups: Groups.default(['papers']),
  filters: Filters,
  sort: z.enum(['relevance', 'cited', 'newest']).default('relevance'),
  limit: z.number().int().min(1).max(100).default(25),
  library_document_ids: z.array(z.string()).max(200).default([]),
});

const Plan = z.object({
  sub_questions: z.array(z.object({ question: z.string().trim().min(3).max(300), queries: z.array(z.string().trim().max(200)).max(4).default([]) })).min(1).max(8),
});

const ResearchRequest = z.object({
  question: z.string().trim().min(3, 'Ask a question of at least a few words.').max(2000),
  depth: z.enum(DEPTHS).default('deep'),
  groups: Groups.default(['papers']),
  filters: Filters,
  headings: z.boolean().default(true),
  high_quality: z.boolean().default(false),
  library_document_ids: z.array(z.string()).max(50).default([]),
  attachments: z.array(z.object({ name: z.string().trim().max(200), text: z.string().max(200_000) })).max(5).default([]),
  role: z.string().trim().max(40).nullish(),
  language: z.string().trim().max(40).nullish(),
  method: z.enum(RESEARCH_METHODS).default('general'),
  search_languages: z.array(z.string().trim().min(2).max(60)).max(8).default([]),
  background: z.boolean().default(false),
  project_id: z.string().max(64).nullish(),
  /** The plan the person reviewed (Detailed). */
  plan: Plan.nullish(),
});

const sse = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

/** What a research job costs. */
export const researchCredits = (depth: (typeof DEPTHS)[number], highQuality: boolean) => creditCost(depth, { highQuality });

export function researchRoutes(slots: Slots) {
  const app = new Hono<{ Variables: AppVariables }>();
  // Signed in only. Mounted at /api, so each prefix is guarded by name (a '*' here would guard every /api route).
  for (const prefix of ['/sources/*', '/files/*', '/research', '/research/*', '/history', '/history/*', '/projects', '/projects/*']) app.use(prefix, requireUser);
  const searches = rateLimit({ key: 'sources-search', limit: 240, windowSeconds: 3600 });
  const plans = rateLimit({ key: 'research-plan', limit: 60, windowSeconds: 3600 });

  app.get('/sources/groups', (c) => c.json({ groups: sourceGroups({ records: true }), study_types: STUDY_TYPES, journal_tiers: JOURNAL_TIER_ORDER, background_research: env.researchJobsEnabled }));

  app.post('/sources/search', searches, async (c) => {
    const user = currentUser(c);
    const body = await parseBody(c, SearchRequest);
    const result = await searchSources(
      { query: body.query, groups: body.groups, filters: toFilters(body.filters), sort: body.sort, limit: body.limit, libraryDocumentIds: body.library_document_ids },
      { userId: user.id },
    );
    return c.json(result);
  });

  app.get('/files/ocr', async (c) => c.json(await ocrCapabilities()));
  app.post('/files/text', async (c) => {
    const form = await c.req.formData().catch(() => null);
    const file = form?.get('file');
    if (!file || typeof file === 'string') throw new HTTPException(422, { message: 'Attach a file.' });
    const ocrLanguages = checkedOcrLanguages(String(form?.get('ocr_languages') || '').split(/[+,]/).map((item) => item.trim()).filter(Boolean));
    const result = await extractText(file.name || 'file', new Uint8Array(await file.arrayBuffer()), { ocrLanguages });
    return c.json({ ...result, pages: undefined });
  });

  // The plan is free: a small model call, so the person sees what a 25-credit report will research
  // before paying for it. Charged work starts at POST /research with the reviewed plan.
  app.post('/research/plan', plans, async (c) => {
    const user = currentUser(c);
    const body = await parseBody(c, z.object({ question: ResearchRequest.shape.question, depth: z.enum(DEPTHS).default('detailed'), method: ResearchRequest.shape.method, search_languages: ResearchRequest.shape.search_languages }));
    const unavailable = llmUnavailable(slots.llm);
    if (unavailable) throw new HTTPException(503, { message: unavailable });
    if (body.depth === 'detailed') await requireFeature(user.account_id, 'detailed_mode');
    const usage = usage0();
    try {
      const plan = await planResearch(slots.llm, body.question, body.depth, usage, undefined, { method: body.method, searchLanguages: body.search_languages });
      await meterTokens(user, usage, { feature: 'research:plan', provider: slots.llm.provider, model: llmModelName(slots.llm, 'fast') });
      const settings = DEPTH_SETTINGS[body.depth];
      return c.json({ ...plan, max_sub_questions: 8, suggested: settings.subQuestions });
    } catch (error) {
      if (error instanceof LlmError) throw new HTTPException(error.status, { message: error.message });
      throw error;
    }
  });

  app.post('/research', async (c) => {
    const user = currentUser(c);
    const body = await parseBody(c, ResearchRequest);
    if (body.background && !env.researchJobsEnabled) throw new HTTPException(503, { message: 'Background research is not enabled on this server yet. Use the current research mode.' });
    const unavailable = llmUnavailable(slots.llm);
    if (unavailable) throw new HTTPException(503, { message: unavailable });
    if (body.depth === 'detailed') await requireFeature(user.account_id, 'detailed_mode');
    if (body.high_quality) await requireFeature(user.account_id, 'high_quality');
    // Reports (not Summary answers) have a daily count and a cap on how many run at once.
    if (body.depth !== 'summary') {
      await checkQuota(user.account_id, 'research_runs');
      await checkRunning(user.account_id, await runningResearch(user.account_id));
    }
    // Read settings before debiting: a profile lookup failure must not consume credits.
    const profile = await researchProfile(user.id);
    const credits = researchCredits(body.depth, body.high_quality);
    const charge = await spendCredits(user.account_id, credits, `A ${body.depth === 'summary' ? 'Summary answer' : body.depth === 'deep' ? 'Deep report' : 'Detailed report'}`);
    let taskId: string;
    try {
      taskId = await createTask(user, {
        kind: 'research', module: body.depth, title: body.question.split('\n')[0].slice(0, 200), project_id: body.project_id ?? null, credits,
        inputs: { question: body.question, depth: body.depth, groups: body.groups, filters: body.filters, headings: body.headings, high_quality: body.high_quality, library_document_ids: body.library_document_ids, attachments: body.attachments.map((file) => file.name), role: body.role ?? null, language: body.language ?? null, method: body.method, search_languages: body.search_languages, background: body.background, plan: body.plan ? cleanPlan(body.plan, 8, 3) : null },
      });
    } catch (error) {
      await refundCredits(charge);
      throw error;
    }
    if (body.background) {
      try {
        await enqueueResearch(user, taskId, {
          question: body.question, depth: body.depth, groups: body.groups, filters: toFilters(body.filters), headings: body.headings,
          highQuality: body.high_quality, libraryDocumentIds: body.library_document_ids, attachments: body.attachments, profile,
          role: body.role, language: body.language, method: body.method, searchLanguages: body.search_languages, plan: body.plan ?? null,
        }, charge);
        return c.json({ task_id: taskId, credits, background: true }, 202);
      } catch (error) {
        // create() can commit and still throw (e.g. a timeout). A job that exists settles its own charge.
        const queued = await researchJobExists(taskId).catch(() => null);
        if (queued) return c.json({ task_id: taskId, credits, background: true }, 202);
        if (queued === null) {
          // Unknown state: refunding here could double-refund, so leave settlement to job recovery.
          console.error('research enqueue state unknown', error);
          throw error;
        }
        await refundCredits(charge);
        await failTask(taskId, 'The background job could not be queued. Your credits were returned.');
        throw error;
      }
    }
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
        try {
          const result = await runResearch(slots.llm, {
            question: body.question, depth: body.depth, groups: body.groups, filters: toFilters(body.filters), headings: body.headings,
            highQuality: body.high_quality, libraryDocumentIds: body.library_document_ids, attachments: body.attachments, profile, role: body.role, language: body.language,
            plan: body.plan ?? null, method: body.method, searchLanguages: body.search_languages,
          }, { userId: user.id, signal: abort.signal }, {
            step: (step) => send('step', step),
            sources: (sources, web, searched) => send('sources', { sources, web, ...searched }),
            delta: (text) => send('delta', { text }),
            figures: (figures) => send('figures', { figures }),
            markdown: (text) => send('markdown', { text }),
          });
          const saved = {
            markdown: result.markdown, summary: result.summary, sources: result.sources, all_sources: result.all_sources, consensus: result.consensus, queries: result.queries,
            searched: result.searched, plan: result.plan, steps: result.steps, verification: result.verification, figures: result.figures, follow_ups: [],
            ...(result.markdown_headed ? { markdown_headed: result.markdown_headed, markdown_plain: result.markdown_plain } : {}),
          };
          await finishTask(taskId, saved);
          await meterTokens(user, result.usage, { feature: `research:${body.depth}`, provider: slots.llm.provider, model: llmModelName(slots.llm, body.high_quality || body.depth !== 'summary' ? 'review' : 'fast') }).catch((error) => console.error('research metering', error));
          if (body.depth !== 'summary') await countUse(user.account_id, 'research_runs').catch((error) => console.error('report not counted', error));
          send('done', { task_id: taskId, credits, ...saved });
        } catch (error) {
          await refundCredits(charge);
          const message = error instanceof ResearchEmptyError ? error.message
            : error instanceof LlmError && error.code !== 'upstream' ? error.message
              : abort.signal.aborted ? 'Stopped.' : 'The research stopped. Your credits were returned; try again.';
          await failTask(taskId, message);
          if (!(error instanceof ResearchEmptyError) && !abort.signal.aborted) console.error('research failed', error);
          send('error', { status: error instanceof ResearchEmptyError ? 422 : error instanceof LlmError ? error.status : 500, detail: message });
        } finally {
          if (!closed) { closed = true; try { controller.close(); } catch { /* closed */ } }
        }
      },
      cancel() {
        closed = true;
        abort.abort();
      },
    });
    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' } });
  });

  app.post('/research/:id/cancel', async (c) => { await cancelResearch(currentUser(c), c.req.param('id')); return c.json({ ok: true }); });

  app.post('/research/:id/follow-up', async (c) => {
    const user = currentUser(c);
    const { question } = await parseBody(c, z.object({ question: z.string().trim().min(2).max(1000) }));
    const task = await getTaskFor(user, c.req.param('id'), 'edit');
    if (task.kind !== 'research' || task.status !== 'done' || !task.result) throw new HTTPException(409, { message: 'This research is not finished.' });
    const sources = (task.result.all_sources ?? task.result.sources ?? []) as ResearchSource[];
    let charge: CreditCharge | null = await spendCredits(user.account_id, CREDIT_COSTS.chat, 'A follow-up');
    try {
      const { text, usage } = await slots.llm.complete({ messages: followUpPrompt(question, String(task.result.markdown ?? ''), sources, await researchProfile(user.id)), task: 'fast', maxTokens: 900, temperature: 0.3 });
      await meterTokens(user, usage, { feature: 'research:follow-up', provider: slots.llm.provider, model: llmModelName(slots.llm, 'fast') });
      const answer = text.trim();
      if (!answer) throw new HTTPException(503, { message: 'The AI returned nothing. Try again.' });
      const followUps = [...((task.result.follow_ups as unknown[]) ?? []), { question, answer, created_at: new Date().toISOString() }];
      await updateTaskResult(task.id, { ...task.result, follow_ups: followUps });
      charge = null;
      return c.json({ question, answer, follow_ups: followUps });
    } catch (error) {
      if (error instanceof LlmError) throw new HTTPException(error.status, { message: error.message });
      throw error;
    } finally {
      await refundCredits(charge);
    }
  });

  // Headings on or off. Both versions are kept on the task (markdown_headed, markdown_plain), so
  // switching back is free; only adding headings to an answer written without them uses the AI.
  app.post('/research/:id/headings', async (c) => {
    const user = currentUser(c);
    const { headings } = await parseBody(c, z.object({ headings: z.boolean() }));
    const task = await getTaskFor(user, c.req.param('id'), 'edit');
    if (task.kind !== 'research' || task.status !== 'done' || !task.result) throw new HTTPException(409, { message: 'This research is not finished.' });
    const result = task.result;
    const current = String(result.markdown ?? '');
    const respond = (markdown: string, credits = 0) => c.json({ markdown, headings: hasHeadings(markdown), headed_copy: Boolean(result.markdown_headed) || hasHeadings(markdown), credits });
    if (hasHeadings(current) === headings) return respond(current);

    if (!headings) {
      const plain = typeof result.markdown_plain === 'string' ? result.markdown_plain : stripHeadings(current);
      await updateTaskResult(task.id, { ...result, markdown: plain, markdown_headed: current, markdown_plain: plain });
      result.markdown_headed = current;
      return respond(plain);
    }
    if (typeof result.markdown_headed === 'string') {
      await updateTaskResult(task.id, { ...result, markdown: result.markdown_headed, markdown_plain: current });
      return respond(result.markdown_headed);
    }

    const unavailable = llmUnavailable(slots.llm);
    if (unavailable) throw new HTTPException(503, { message: unavailable });
    let charge: CreditCharge | null = await spendCredits(user.account_id, CREDIT_COSTS.chat, 'Headings for a research answer');
    try {
      const depth = (DEPTHS as readonly string[]).includes(String(task.module)) ? (task.module as Depth) : 'deep';
      const { text, usage } = await slots.llm.complete({ messages: headingsPrompt(current, depth), task: 'fast', json: true, maxTokens: 800, temperature: 0.2 });
      await meterTokens(user, usage, { feature: 'research:headings', provider: slots.llm.provider, model: llmModelName(slots.llm, 'fast') });
      const headed = applyHeadings(current, text);
      if (!headed) throw new HTTPException(503, { message: 'The AI could not place headings this time. Try again.' });
      await updateTaskResult(task.id, { ...result, markdown: headed, markdown_headed: headed, markdown_plain: current });
      charge = null;
      return respond(headed, CREDIT_COSTS.chat);
    } catch (error) {
      if (error instanceof LlmError) throw new HTTPException(error.status, { message: error.message });
      throw error;
    } finally {
      await refundCredits(charge);
    }
  });

  // ---------------------------------------------------------------- History

  app.get('/history', async (c) => {
    const user = currentUser(c);
    const kind = c.req.query('kind');
    return c.json({
      tasks: await listTasks(user, { projectId: c.req.query('project') || null, kind: kind && (TASK_KINDS as readonly string[]).includes(kind) ? kind : null, limit: Number(c.req.query('limit')) || 50 }),
    });
  });
  app.get('/history/:id', async (c) => c.json(publicTask(await getTaskFor(currentUser(c), c.req.param('id')))));
  app.patch('/history/:id', async (c) => {
    const patch = await parseBody(c, z.object({ title: z.string().max(200).optional(), starred: z.boolean().optional(), project_id: z.string().max(64).nullable().optional() }));
    return c.json(await updateTask(currentUser(c), c.req.param('id'), patch));
  });
  app.delete('/history/:id', async (c) => {
    await deleteTask(currentUser(c), c.req.param('id'));
    return c.json({ ok: true });
  });

  // ---------------------------------------------------------------- Projects

  app.get('/projects', async (c) => c.json({ projects: (await listProjects(currentUser(c))).map(publicProject) }));
  app.post('/projects', async (c) => {
    const body = await parseBody(c, z.object({ name: z.string().trim().min(1).max(120), description: z.string().max(1000).optional() }));
    const project = await createProject(currentUser(c), body);
    return c.json(publicProject({ ...project, role: 'owner' }), 201);
  });
  app.get('/projects/:id', async (c) => {
    const user = currentUser(c);
    const project = await getProjectFor(user, c.req.param('id'));
    return c.json({ ...publicProject(project), tasks: await listTasks(user, { projectId: project.id, limit: 100 }) });
  });
  app.patch('/projects/:id', async (c) => {
    const body = await parseBody(c, z.object({ name: z.string().max(120).optional(), description: z.string().max(1000).optional() }));
    await updateProject(currentUser(c), c.req.param('id'), body);
    return c.json(publicProject(await getProjectFor(currentUser(c), c.req.param('id'))));
  });
  app.delete('/projects/:id', async (c) => {
    await deleteProject(currentUser(c), c.req.param('id'));
    return c.json({ ok: true });
  });
  app.post('/projects/:id/members', async (c) => {
    const body = await parseBody(c, z.object({ email: z.string().trim().max(200), role: z.enum(['edit', 'comment', 'view']).default('comment') }));
    await addMember(currentUser(c), c.req.param('id'), body);
    return c.json(publicProject(await getProjectFor(currentUser(c), c.req.param('id'))));
  });
  app.delete('/projects/:id/members/:email', async (c) => {
    const user = currentUser(c);
    await removeMember(user, c.req.param('id'), decodeURIComponent(c.req.param('email')));
    const project = await getProjectFor(user, c.req.param('id')).catch(() => null);
    return c.json(project ? publicProject(project) : { ok: true });
  });

  return app;
}

