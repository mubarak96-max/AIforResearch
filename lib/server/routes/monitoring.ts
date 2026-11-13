import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { requireUser, type AppVariables } from '../auth.js';
import { currentUser, parseBody } from '../lib/assist-llm.js';
import { rateLimit } from '../lib/rateLimit.js';
import { SOURCE_GROUPS, sourceGroups } from '../lib/sources/index.js';
import { createMonitor, deleteMonitor, getMonitorFor, listMonitors, monitorRuns, reviewMonitorRun, runMonitor, updateMonitor } from '../lib/monitoring.js';

const filters = z.object({ fromYear: z.number().int().min(1000).max(2200).optional(), toYear: z.number().int().min(1000).max(2200).optional(), openAccess: z.boolean().optional(), excludePreprints: z.boolean().optional(), excludeRetracted: z.boolean().optional() }).strict().refine((v) => !v.fromYear || !v.toYear || v.fromYear <= v.toYear, 'From year must not exceed to year.');
const Fields = z.object({ title: z.string().trim().min(1).max(200), query: z.string().trim().min(2).max(1000), groups: z.array(z.enum(SOURCE_GROUPS)).min(1).max(SOURCE_GROUPS.length), filters: filters.default({}), interval_hours: z.union([z.literal(24), z.literal(168), z.literal(720)]).default(168), tracked_dois: z.array(z.string().max(300)).max(20).default([]), retraction_checks: z.boolean().default(true), enabled: z.boolean().default(true) });

export function monitoringRoutes() {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use('*', requireUser);
  app.use('*', rateLimit({ key: 'monitoring', limit: 300, windowSeconds: 3600 }));
  app.get('/', async (c) => c.json({ monitors: await listMonitors(currentUser(c)), source_groups: sourceGroups() }));
  app.post('/', async (c) => {
    const body = await parseBody(c, Fields.extend({ project_id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/).nullish() }).strict());
    return c.json(await createMonitor(currentUser(c), body), 201);
  });
  app.get('/:id', async (c) => {
    const user = currentUser(c); const id = c.req.param('id');
    const { lease: _lease, ...monitor } = await getMonitorFor(user, id);
    return c.json({ ...monitor, runs: (await monitorRuns(user, id)).slice(0, 50) });
  });
  app.patch('/:id', async (c) => {
    const { revision, ...input } = await parseBody(c, Fields.extend({ revision: z.number().int().min(1) }).strict());
    return c.json(await updateMonitor(currentUser(c), c.req.param('id'), revision, input));
  });
  app.post('/:id/run', rateLimit({ key: 'monitoring_run', limit: 30, windowSeconds: 3600 }), async (c) => {
    const user = currentUser(c); const id = c.req.param('id');
    await getMonitorFor(user, id, ['owner', 'edit']);
    const result = await runMonitor(id, true);
    if (!result.claimed) throw new HTTPException(409, { message: 'A check is already running. Reload to see its progress.' });
    return c.json(result);
  });
  app.post('/:id/runs/:runId/review', async (c) => {
    const { note } = await parseBody(c, z.object({ note: z.string().trim().min(1).max(5000) }).strict());
    await reviewMonitorRun(currentUser(c), c.req.param('id'), c.req.param('runId'), note);
    return c.json({ ok: true });
  });
  app.get('/:id/export', async (c) => {
    const user = currentUser(c); const id = c.req.param('id');
    const { lease: _lease, ...monitor } = await getMonitorFor(user, id);
    return c.json({ schema_version: 1, exported_at: new Date().toISOString(), monitor, runs: await monitorRuns(user, id) });
  });
  app.delete('/:id', async (c) => { await deleteMonitor(currentUser(c), c.req.param('id')); return c.json({ ok: true }); });
  return app;
}
