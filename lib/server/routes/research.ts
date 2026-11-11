/**
 * Research core, mounted at /api:
 *   GET  /sources/groups            the source picker and which groups work on this server
 *   POST /sources/search            Find Papers: search the chosen groups with filters (no credits)
 *   POST /research                  Deep Research (Server-Sent Events: task, status, sources, delta, done | error)
 *   POST /research/:id/follow-up    a follow-up answered from the same sources (1 credit)
 *   POST /files/text                text from an attached PDF, Word, Markdown or text file
 *   GET|PATCH|DELETE /history…      History of every job
 *   /projects…                      Projects and sharing
 */
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { requireUser, type AppVariables } from '../auth.js';
import type { Slots } from '../slots/types.js';
import { LlmError, llmModelName } from '../slots/llm.js';
import { currentUser, meterTokens, parseBody } from '../lib/assist-llm.js';
import { llmUnavailable } from '../lib/prompts.js';
import { CREDIT_COSTS, PlanLimitError, creditCost, refundCredits, requireFeature, spendCredits, type CreditCharge } from '../lib/plans.js';
import { researchProfile } from '../lib/users.js';
import { DEPTHS, ResearchEmptyError, followUpPrompt, runResearch, type ResearchSource } from '../lib/research.js';
import { SOURCE_GROUPS, STUDY_TYPES, JOURNAL_TIER_ORDER, searchSources, sourceGroups } from '../lib/sources/index.js';
import { extractText } from '../lib/fileText.js';
import { createTask, deleteTask, failTask, finishTask, getTaskFor, listTasks, updateTask, updateTaskResult, TASK_KINDS } from '../lib/history.js';
import { addMember, createProject, deleteProject, getProjectFor, listProjects, publicProject, removeMember, updateProject } from '../lib/projects.js';
import { rateLimit } from '../lib/rateLimit.js';

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

const Groups = z.array(z.enum(SOURCE_GROUPS)).min(1).max(5);

const SearchRequest = z.object({
  query: z.string().trim().min(2).max(300),
  groups: Groups.default(['papers']),
  filters: Filters,
  sort: z.enum(['relevance', 'cited', 'newest']).default('relevance'),
  limit: z.number().int().min(1).max(100).default(25),
  library_document_ids: z.array(z.string()).max(200).default([]),
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
  project_id: z.string().max(64).nullish(),
});

const sse = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

/** What a research job costs. */
export const researchCredits = (depth: (typeof DEPTHS)[number], highQuality: boolean) => creditCost(depth, { highQuality });

export function researchRoutes(slots: Slots) {
  const app = new Hono<{ Variables: AppVariables }>();
  // Paper search without an account is the directory; here it is the signed-in Find Papers.
  app.use('*', requireUser);
  const searches = rateLimit({ key: 'sources-search', limit: 240, windowSeconds: 3600 });

  app.get('/sources/groups', (c) => c.json({ groups: sourceGroups(), study_types: STUDY_TYPES, journal_tiers: JOURNAL_TIER_ORDER }));

  app.post('/sources/search', searches, async (c) => {
    const user = currentUser(c);
    const body = await parseBody(c, SearchRequest);
    const result = await searchSources(
      { query: body.query, groups: body.groups, filters: toFilters(body.filters), sort: body.sort, limit: body.limit, libraryDocumentIds: body.library_document_ids },
      { userId: user.id },
    );
    return c.json(result);
  });

  app.post('/files/text', async (c) => {
    const form = await c.req.formData().catch(() => null);
    const file = form?.get('file');
    if (!file || typeof file === 'string') throw new HTTPException(422, { message: 'Attach a file.' });
    const result = await extractText(file.name || 'file', new Uint8Array(await file.arrayBuffer()));
    return c.json({ ...result, pages: undefined });
  });

  app.post('/research', async (c) => {
    const user = currentUser(c);
    const body = await parseBody(c, ResearchRequest);
    const unavailable = llmUnavailable(slots.llm);
    if (unavailable) throw new HTTPException(503, { message: unavailable });
    if (body.depth === 'detailed') await requireFeature(user.account_id, 'detailed_mode');
    if (body.high_quality) await requireFeature(user.account_id, 'high_quality');
    const credits = researchCredits(body.depth, body.high_quality);
    const charge = await spendCredits(user.account_id, credits, `A ${body.depth === 'summary' ? 'Summary answer' : body.depth === 'deep' ? 'Deep report' : 'Detailed report'}`);
    let taskId: string;
    try {
      taskId = await createTask(user, {
        kind: 'research', module: body.depth, title: body.question.split('\n')[0].slice(0, 200), project_id: body.project_id ?? null, credits,
        inputs: { question: body.question, depth: body.depth, groups: body.groups, filters: body.filters, headings: body.headings, high_quality: body.high_quality, library_document_ids: body.library_document_ids, attachments: body.attachments.map((file) => file.name), role: body.role ?? null },
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
        try {
          const result = await runResearch(slots.llm, {
            question: body.question, depth: body.depth, groups: body.groups, filters: toFilters(body.filters), headings: body.headings,
            highQuality: body.high_quality, libraryDocumentIds: body.library_document_ids, attachments: body.attachments, profile, role: body.role, language: body.language,
          }, { userId: user.id, signal: abort.signal }, {
            status: (stage, detail) => send('status', { stage, detail }),
            sources: (sources, web, searched) => send('sources', { sources, web, ...searched }),
            delta: (text) => send('delta', { text }),
          });
          await meterTokens(user, result.usage, { feature: `research:${body.depth}`, provider: slots.llm.provider, model: llmModelName(slots.llm, body.high_quality || body.depth !== 'summary' ? 'review' : 'fast') });
          const saved = { markdown: result.markdown, summary: result.summary, sources: result.sources, all_sources: result.all_sources, consensus: result.consensus, queries: result.queries, searched: result.searched, follow_ups: [] };
          await finishTask(taskId, saved);
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

  // ---------------------------------------------------------------- History

  app.get('/history', async (c) => {
    const user = currentUser(c);
    const kind = c.req.query('kind');
    return c.json({
      tasks: await listTasks(user, { projectId: c.req.query('project') || null, kind: kind && (TASK_KINDS as readonly string[]).includes(kind) ? kind : null, limit: Number(c.req.query('limit')) || 50 }),
    });
  });
  app.get('/history/:id', async (c) => c.json(await getTaskFor(currentUser(c), c.req.param('id'))));
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

export { PlanLimitError };
