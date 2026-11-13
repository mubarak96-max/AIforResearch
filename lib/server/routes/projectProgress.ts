/**
 * Progress tracker on a project, mounted at /api/projects:
 *   GET    /:id/progress                               entries (newest first) and saved summaries; any member
 *   POST   /:id/progress                               a dated entry; owner and editors
 *   PATCH  /:id/progress/:entry, DELETE                its author (an editor) or the owner
 *   POST   /:id/progress/:entry/comments               owner, editors and commenters
 *   DELETE /:id/progress/:entry/comments/:comment      its author or the owner
 *   POST   /:id/progress/summary                       "Summarise for my supervisor": AI summary of a period (CREDIT_COSTS.short)
 * The summary is saved on the project and in History (kind "tool", module "progress-summary").
 */
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { requireUser, type AppVariables } from '../auth.js';
import type { LlmUsage, Slots } from '../slots/types.js';
import { LlmError, llmModelName, llmUnavailable } from '../slots/llm.js';
import { currentUser, meterTokens, parseBody } from '../lib/assist-llm.js';
import { CREDIT_COSTS, refundCredits, spendCredits, type CreditCharge } from '../lib/plans.js';
import { createTask, failTask, finishTask } from '../lib/history.js';
import {
  PROGRESS_STATUSES, addProgress, commentProgress, deleteProgress, deleteProgressComment, listProgress, progressDigest, progressSummaryPrompt,
  saveProgressSummary, updateProgress,
} from '../lib/projects.js';

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date like 2026-11-13.');
const Entry = z.object({
  date: day,
  done: z.string().max(4000).optional(),
  blockers: z.string().max(4000).optional(),
  next: z.string().max(4000).optional(),
  status: z.enum(PROGRESS_STATUSES).nullish(),
  mood: z.number().int().min(1).max(5).nullish(),
});
const Summary = z.object({ from: day, to: day, language: z.string().max(40).nullish() });

export function projectProgressRoutes(slots: Slots) {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use('*', requireUser);

  app.get('/:id/progress', async (c) => {
    const { project, entries, summaries } = await listProgress(currentUser(c), c.req.param('id'), { from: c.req.query('from'), to: c.req.query('to') });
    c.header('cache-control', 'private, no-store');
    return c.json({ role: project.role, entries, summaries });
  });

  app.post('/:id/progress/summary', async (c) => {
    const user = currentUser(c);
    const body = await parseBody(c, Summary);
    if (body.from > body.to) throw new HTTPException(422, { message: 'The start of the period is after its end.' });
    const { project, entries } = await listProgress(user, c.req.param('id'), { from: body.from, to: body.to });
    if (!entries.length) throw new HTTPException(422, { message: 'There are no progress entries in this period.' });
    const unavailable = llmUnavailable(slots.llm);
    if (unavailable) throw new HTTPException(503, { message: unavailable });
    const credits = CREDIT_COSTS.short;
    let charge: CreditCharge | null = await spendCredits(user.account_id, credits, 'This progress summary');
    let taskId: string | null = null;
    try {
      // Commenters and viewers keep the summary in their own History, outside the project.
      const inProject = project.role === 'owner' || project.role === 'edit';
      taskId = await createTask(user, { kind: 'tool', module: 'progress-summary', title: `Progress: ${project.name} (${body.from} to ${body.to})`, project_id: inProject ? project.id : null, credits, inputs: { project_id: project.id, from: body.from, to: body.to, entries: entries.length } });
      const usage: LlmUsage = { inputTokens: 0, outputTokens: 0 };
      const { text, usage: used } = await slots.llm.complete({ messages: progressSummaryPrompt(project.name, body.from, body.to, progressDigest(entries), body.language), task: 'fast', temperature: 0.3, maxTokens: 1200 });
      usage.inputTokens += used.inputTokens; usage.outputTokens += used.outputTokens;
      const markdown = text.trim();
      if (!markdown) throw new Error('The summary came back empty. Your credits were returned; try again.');
      await meterTokens(user, usage, { feature: 'projects:progress-summary', provider: slots.llm.provider, model: llmModelName(slots.llm, 'fast') });
      const saved = await saveProgressSummary(project.id, { from: body.from, to: body.to, markdown, entries: entries.length, author_name: user.full_name || user.email, task_id: taskId, created_at: new Date() });
      await finishTask(taskId, { markdown, summary: markdown.slice(0, 300), project_id: project.id, from: body.from, to: body.to });
      charge = null;
      return c.json({ task_id: taskId, credits, summary: saved });
    } catch (error) {
      if (taskId) await failTask(taskId, (error as Error)?.message || 'failed');
      if (error instanceof HTTPException) throw error;
      if (error instanceof LlmError) throw new HTTPException(error.status, { message: error.message });
      throw new HTTPException(503, { message: (error as Error)?.message || 'The summary stopped. Your credits were returned; try again.' });
    } finally {
      await refundCredits(charge);
    }
  });

  app.post('/:id/progress', async (c) => {
    const entry = await addProgress(currentUser(c), c.req.param('id'), await parseBody(c, Entry));
    return c.json(entry, 201);
  });

  app.patch('/:id/progress/:entry', async (c) => {
    await updateProgress(currentUser(c), c.req.param('id'), c.req.param('entry'), await parseBody(c, Entry));
    return c.json({ ok: true });
  });

  app.delete('/:id/progress/:entry', async (c) => {
    await deleteProgress(currentUser(c), c.req.param('id'), c.req.param('entry'));
    return c.json({ ok: true });
  });

  app.post('/:id/progress/:entry/comments', async (c) => {
    const body = await parseBody(c, z.object({ text: z.string().max(2000) }));
    return c.json(await commentProgress(currentUser(c), c.req.param('id'), c.req.param('entry'), body.text), 201);
  });

  app.delete('/:id/progress/:entry/comments/:comment', async (c) => {
    await deleteProgressComment(currentUser(c), c.req.param('id'), c.req.param('entry'), c.req.param('comment'));
    return c.json({ ok: true });
  });

  return app;
}
