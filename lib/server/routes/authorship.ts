/**
 * Writing activity and authorship reports. See lib/authorship.ts.
 *
 *   POST   /api/ai-editor/documents/:id/activity             the editor's running session totals (editors only)
 *   GET    /api/ai-editor/documents/:id/authorship           the writer's live record
 *   GET    /api/ai-editor/documents/:id/authorship/reports   reports issued for it
 *   POST   /api/ai-editor/documents/:id/authorship/reports   freeze the record as a shareable report
 *   DELETE /api/authorship/reports/:reportId                 withdraw a report (its link stops working)
 *   GET    /api/authorship/verify/:reportId                  public: a report and whether it is intact
 */
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { requireUser, type AppVariables } from '../auth.js';
import { EDIT_ROLES, loadDocument, resolveAccess } from '../lib/access.js';
import { buildAuthorship, createReport, deleteReport, listReports, recordSession, verifyReport } from '../lib/authorship.js';
import { ensureDailyVersion } from '../lib/versions.js';
import { currentUser, parseBody } from '../lib/assist-llm.js';

const count = z.number().finite().min(0).max(50_000_000);

const ActivityBody = z.object({
  session_id: z.string().min(8).max(64),
  started_at: z.number().int().positive(),
  last_at: z.number().int().positive(),
  active_seconds: count,
  typed: count,
  pasted_external: count,
  pasted_internal: count,
  ai_inserted: count,
  deleted: count,
  pastes: z.array(z.object({ at: z.number().int().positive(), chars: z.number().int().min(0).max(50_000_000), hash: z.string().max(64), internal: z.boolean() })).max(300).default([]),
});

export function authorshipDocumentRoutes() {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use('/:id/activity', requireUser);
  app.use('/:id/authorship', requireUser);
  app.use('/:id/authorship/*', requireUser);

  app.post('/:id/activity', async (c) => {
    const user = currentUser(c);
    const { document, role } = await resolveAccess(c.req.param('id'), user, { blocks: false });
    if (!EDIT_ROLES.includes(role)) throw new HTTPException(403, { message: 'Only editors record writing activity' });
    const body = await parseBody(c, ActivityBody);
    await recordSession(document, user, body);
    // The day's snapshot for the record (the blocks are only read when today has none yet).
    await ensureDailyVersion(document.id, user, () => loadDocument(document.id)).catch((error) => console.error('daily version failed', error));
    return c.json({ saved: true });
  });

  app.get('/:id/authorship', async (c) => {
    const user = currentUser(c);
    const { document } = await resolveAccess(c.req.param('id'), user, { blocks: false });
    return c.json(await buildAuthorship(document, user));
  });

  app.get('/:id/authorship/reports', async (c) => {
    const user = currentUser(c);
    const { document } = await resolveAccess(c.req.param('id'), user, { blocks: false });
    return c.json({ reports: await listReports(document.id, user.id) });
  });

  app.post('/:id/authorship/reports', async (c) => {
    const user = currentUser(c);
    const { document } = await resolveAccess(c.req.param('id'), user, { blocks: false });
    return c.json(await createReport(document, user), 201);
  });

  return app;
}

export function authorshipRoutes() {
  const app = new Hono<{ Variables: AppVariables }>();

  app.delete('/reports/:reportId', requireUser, async (c) => {
    await deleteReport(c.req.param('reportId'), currentUser(c).id);
    return c.json({ deleted: true });
  });

  // Public on purpose: whoever has the link (a teacher, a client) may read the report, nothing else.
  app.get('/verify/:reportId', async (c) => {
    const report = await verifyReport(c.req.param('reportId'));
    if (!report) throw new HTTPException(404, { message: 'This report does not exist or was withdrawn.' });
    c.header('Cache-Control', 'no-store');
    return c.json(report);
  });

  return app;
}
