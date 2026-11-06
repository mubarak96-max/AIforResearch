import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { requireUser, type AppVariables } from '../auth.js';
import { resolveAccess, EDIT_ROLES } from '../lib/access.js';
import { createVersion, getVersion, listVersions, renameVersion, versionSummary } from '../lib/versions.js';
import { updateDocument } from '../lib/documents.js';

const cleanLabel = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim().slice(0, 120) : null);

export function versionRoutes() {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use('/:id/versions', requireUser);
  app.use('/:id/versions/*', requireUser);

  app.get('/:id/versions', async (c) => {
    const { document } = await resolveAccess(c.req.param('id'), c.get('user'), { blocks: false });
    return c.json({ versions: (await listVersions(document.id, 200)).map(versionSummary) });
  });

  app.post('/:id/versions', async (c) => {
    const user = c.get('user')!;
    const { document, role } = await resolveAccess(c.req.param('id'), user);
    if (!EDIT_ROLES.includes(role)) throw new HTTPException(403, { message: 'Only editors can save versions' });
    const body = await c.req.json().catch(() => ({}));
    // reason "ai": the writer accepted AI-written text (shown as WriteGrid AI in the history).
    const reason = body?.reason === 'ai' ? 'ai' : 'manual';
    return c.json(versionSummary(await createVersion(document, user, reason, cleanLabel(body?.label))));
  });

  app.get('/:id/versions/:versionId', async (c) => {
    const { document } = await resolveAccess(c.req.param('id'), c.get('user'), { blocks: false });
    const version = await getVersion(document.id, c.req.param('versionId'));
    if (!version) throw new HTTPException(404, { message: 'Version not found' });
    return c.json({ ...versionSummary(version), blocks: version.blocks, wordSettings: version.word_settings ?? null });
  });

  app.patch('/:id/versions/:versionId', async (c) => {
    const { document, role } = await resolveAccess(c.req.param('id'), c.get('user'), { blocks: false });
    if (!EDIT_ROLES.includes(role)) throw new HTTPException(403, { message: 'Only editors can rename versions' });
    const parsed = z.object({ label: z.string().max(120).nullable() }).safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw new HTTPException(422, { message: 'Invalid name.' });
    const version = await renameVersion(document.id, c.req.param('versionId'), cleanLabel(parsed.data.label));
    if (!version) throw new HTTPException(404, { message: 'Version not found' });
    return c.json(versionSummary(version));
  });

  app.post('/:id/versions/:versionId/restore', async (c) => {
    const user = c.get('user')!;
    const { document, role } = await resolveAccess(c.req.param('id'), user);
    if (!EDIT_ROLES.includes(role)) throw new HTTPException(403, { message: 'Only editors can restore versions' });
    const version = await getVersion(document.id, c.req.param('versionId'));
    if (!version) throw new HTTPException(404, { message: 'Version not found' });
    await createVersion(document, user, 'before-restore');
    const restored = await updateDocument(document, {
      title: version.title || document.title,
      blocks: version.blocks,
      ...(version.word_settings ? { word_settings: version.word_settings } : {}),
    });
    // The browser applies the restored blocks to the live (Yjs) document itself, which syncs to
    // everyone; the collab service sees the Firestore change and tells open editors.
    const saved = await createVersion(restored, user, 'restore');
    return c.json({ ...versionSummary(saved), blocks: restored.blocks, wordSettings: restored.word_settings ?? null });
  });

  return app;
}
