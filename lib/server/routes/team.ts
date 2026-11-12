import { Hono } from 'hono';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import { requireUser, type AppVariables } from '../auth.js';
import { currentUser, parseBody } from '../lib/assist-llm.js';
import { rateLimit } from '../lib/rateLimit.js';
import { acceptTeamInvitation, activateTeam, changeTeamRole, decideTeamInvitation, exportTeamAudit, inviteTeamMember, recoverTeamOwner, removeTeamMember, teamSettings } from '../lib/team.js';

const Id = z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/);
const Revision = z.number().int().min(1);
const paramId = (value: string) => { if (!Id.safeParse(value).success) throw new HTTPException(422, { message: 'Invalid identifier.' }); return value; };
export function teamRoutes() {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use('*', requireUser);
  app.use('*', rateLimit({ key: 'team_settings', limit: 150, windowSeconds: 3600 }));
  app.get('/', async (c) => c.json(await teamSettings(currentUser(c))));
  app.get('/export', async (c) => c.json(await exportTeamAudit(currentUser(c))));
  app.post('/activate', async (c) => { const body = await parseBody(c, z.object({ account_id: Id, owner_user_id: Id }).strict()); await activateTeam(currentUser(c), body.account_id, body.owner_user_id); return c.json({ ok: true }); });
  app.post('/recover-owner', async (c) => {
    const body = await parseBody(c, z.object({ account_id: Id, owner_user_id: Id }).strict());
    await recoverTeamOwner(currentUser(c), body.account_id, body.owner_user_id);
    return c.json({ ok: true });
  });
  app.post('/invitations', async (c) => { const body = await parseBody(c, z.object({ email: z.string().trim().email().max(320) }).strict()); return c.json({ id: await inviteTeamMember(currentUser(c), body.email) }, 201); });
  app.post('/invitations/:id/accept', async (c) => { await acceptTeamInvitation(currentUser(c), paramId(c.req.param('id'))); return c.json({ ok: true }); });
  app.post('/invitations/:id/decline', async (c) => { await decideTeamInvitation(currentUser(c), paramId(c.req.param('id')), 'declined'); return c.json({ ok: true }); });
  app.post('/invitations/:id/revoke', async (c) => { await decideTeamInvitation(currentUser(c), paramId(c.req.param('id')), 'revoked'); return c.json({ ok: true }); });
  app.patch('/members/:id', async (c) => { const body = await parseBody(c, z.object({ role: z.enum(['owner', 'admin', 'member']), revision: Revision }).strict()); await changeTeamRole(currentUser(c), paramId(c.req.param('id')), body.role, body.revision); return c.json({ ok: true }); });
  app.post('/members/:id/remove', async (c) => { const body = await parseBody(c, z.object({ revision: Revision }).strict()); await removeTeamMember(currentUser(c), paramId(c.req.param('id')), body.revision); return c.json({ ok: true }); });
  return app;
}
