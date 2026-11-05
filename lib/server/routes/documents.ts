import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { C, col, deleteDeep, deleteQuery, getRow, row, rows } from '../firebase.js';
import { requireUser, type AppVariables, type AuthUser } from '../auth.js';
import { resolveAccess, loadDocument, displayName, EDIT_ROLES, COMMENT_ROLES, type DocumentRow, type Role } from '../lib/access.js';
import { documentToRead, membersOf, memberToDict, type MemberRow } from '../lib/documentPayload.js';
import { blocksToText } from '../lib/blocks.js';
import { maybeAutoVersion } from '../lib/versions.js';
import { createDocument, documentRef, memberDocId, membersRef, syncMemberIndex, updateDocument } from '../lib/documents.js';
import { deleteDocumentFiles } from '../lib/documentStore.js';
import { userByEmail } from '../lib/users.js';
import { env } from '../env.js';

type ListedDocument = DocumentRow & { member_roles?: Record<string, Role>; member_emails?: string[]; member_count?: number };

const ms = (value: Date | string | null | undefined) => (value ? new Date(value).getTime() : Date.now());

function activityEntry(action: string, user: AuthUser, description: string) {
  return {
    id: `${Date.now()}${Math.floor(Math.random() * 1000)}`,
    action,
    actorSessionId: `user-${user.id}`,
    actorDisplayName: displayName(user),
    timestamp: Date.now(),
    description,
  };
}

const createBody = z.object({ id: z.string().min(8).max(64).optional(), title: z.string().max(500).optional(), blocks: z.array(z.any()).optional() });
const updateBody = z.object({
  title: z.string().max(500).optional(),
  blocks: z.array(z.any()).optional(),
  comments: z.array(z.any()).optional(),
  share_settings: z.record(z.any()).optional(),
  word_settings: z.record(z.any()).nullable().optional(),
});
const inviteBody = z.object({ email: z.string().trim().toLowerCase().email(), display_name: z.string().max(200).optional(), role: z.enum(['editor', 'commenter', 'viewer']).default('editor') });

/** Thumbnail for the documents home: the title and the first lines, drawn as SVG. */
function thumbnailSvg(title: string, text: string) {
  const esc = (value: string) => value.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).length > 46) { lines.push(line); line = word; if (lines.length >= 12) break; } else line = line ? `${line} ${word}` : word;
  }
  if (line && lines.length < 12) lines.push(line);
  const body = lines.map((value, index) => `<text x="24" y="${78 + index * 15}" font-size="10.5" fill="#64748b">${esc(value)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="#ffffff"/><text x="24" y="44" font-family="Georgia, serif" font-size="15" font-weight="700" fill="#0f172a">${esc(title.slice(0, 40))}</text><g font-family="Georgia, serif">${body}</g></svg>`;
}

export function documentRoutes() {
  const app = new Hono<{ Variables: AppVariables }>();

  app.get('/', async (c) => {
    const user = c.get('user');
    if (!user) return c.json({ documents: [], total: 0 });
    // member_ids holds the owner and every active member (lib/documents.ts syncMemberIndex).
    const listed = rows<ListedDocument>(await col(C.documents)
      .where('member_ids', 'array-contains', user.id)
      .orderBy('updated_at', 'desc')
      .select('title', 'updated_at', 'word_count', 'owner_user_id', 'share_settings', 'member_roles', 'member_emails', 'member_count')
      .limit(500)
      .get());
    const roleOf = async (document: ListedDocument): Promise<Role> => {
      if (document.owner_user_id === user.id) return 'owner';
      const known = document.member_roles?.[user.id];
      if (known) return known;
      // A claimed invitation may not be in the role map yet; its member document has the role.
      const [member] = rows<{ role: Role }>(await membersRef(document.id).where('user_id', '==', user.id).limit(1).get());
      return member?.role ?? 'viewer';
    };
    const withRoles = await Promise.all(listed.map(async (document) => ({ ...document, role: await roleOf(document) })));
    const documents = withRoles.map((row) => ({
      id: row.id,
      title: row.title,
      updatedAt: ms(row.updated_at),
      wordCount: row.word_count ?? 0,
      ownerUserId: row.owner_user_id,
      share: row.share_settings || {},
      memberCount: row.member_count ?? 0,
      memberEmails: row.member_emails ?? [],
      currentUserRole: row.role,
      accessSource: row.role === 'owner' ? 'owner' : 'shared',
    }));
    return c.json({ documents, total: documents.length });
  });

  app.post('/', requireUser, async (c) => {
    const user = c.get('user')!;
    const parsed = createBody.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw new HTTPException(422, { message: 'Invalid document.' });
    const id = parsed.data.id || randomUUID();
    const existing = await loadDocument(id);
    if (existing) {
      if (existing.owner_user_id !== user.id) throw new HTTPException(403, { message: 'Document id already exists' });
      return c.json(documentToRead(existing, await membersOf(id), 'owner'), 201);
    }
    const share = { isLinkSharingEnabled: false, defaultAccessRole: 'editor', updatedAt: Date.now() };
    const document = await createDocument({
      id, ownerUserId: user.id, title: parsed.data.title || 'Untitled document', blocks: parsed.data.blocks || [],
      shareSettings: share, activity: [activityEntry('document_created', user, 'Created the document')],
    }).catch((error) => {
      // Two tabs creating the same new id at once: ALREADY_EXISTS.
      if ((error as { code?: number }).code === 6) throw new HTTPException(409, { message: 'Document id already exists' });
      throw error;
    });
    return c.json(documentToRead(document, [], 'owner'), 201);
  });

  app.get('/:id', async (c) => {
    const { document, role } = await resolveAccess(c.req.param('id'), c.get('user'));
    return c.json(documentToRead(document, await membersOf(document.id), role));
  });

  app.patch('/:id', requireUser, async (c) => {
    const user = c.get('user')!;
    const { document, role } = await resolveAccess(c.req.param('id'), user);
    const parsed = updateBody.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw new HTTPException(422, { message: 'Invalid update.' });
    const body = parsed.data;
    const editing = body.title !== undefined || body.blocks !== undefined || body.share_settings !== undefined || body.word_settings !== undefined;
    if (editing && !EDIT_ROLES.includes(role)) throw new HTTPException(403, { message: 'Not authorized to edit this document' });
    if (body.share_settings !== undefined && role !== 'owner') throw new HTTPException(403, { message: 'Only the owner can update sharing settings' });
    if (body.comments !== undefined && !COMMENT_ROLES.includes(role)) throw new HTTPException(403, { message: 'Not authorized to comment on this document' });

    const activity = [...(document.activity || [])];
    if (body.title !== undefined && body.title !== document.title) activity.unshift(activityEntry('title_updated', user, `Renamed the document to "${body.title}"`));
    if (body.share_settings !== undefined) activity.unshift(activityEntry('share_updated', user, 'Updated general sharing settings'));
    let wordSettings = document.word_settings;
    if (body.word_settings !== undefined) {
      const { source: _ignored, ...incoming } = body.word_settings || {};
      const source = document.word_settings?.source;
      wordSettings = body.word_settings === null ? null : { ...incoming, ...(source ? { source } : {}) };
    }
    const updated = await updateDocument(document, {
      title: body.title,
      blocks: body.blocks,
      comments: body.comments,
      share_settings: body.share_settings,
      ...(body.word_settings !== undefined ? { word_settings: wordSettings } : {}),
      activity,
    }, { sessionId: c.req.header('x-session-id') || null });
    // Awaited: on App Hosting, work left running after the response may never finish.
    if (body.blocks !== undefined) await maybeAutoVersion(updated, user).catch((error) => console.error('auto version failed', error));
    // Open editors hear about the change from the collab service, which watches the document.
    return c.json(documentToRead(updated, await membersOf(updated.id), role));
  });

  app.delete('/:id', requireUser, async (c) => {
    const user = c.get('user')!;
    const id = c.req.param('id');
    const document = await getRow<{ owner_user_id: string }>(C.documents, id);
    if (!document) throw new HTTPException(404, { message: 'Document not found' });
    if (document.owner_user_id !== user.id) throw new HTTPException(403, { message: 'Only the owner can delete this document' });
    // No cascades in Firestore: members and versions (subcollections), files, and chats about it.
    await deleteDeep(documentRef(id));
    await Promise.all([deleteDocumentFiles(id), deleteQuery(col(C.chatThreads).where('document_id', '==', id))]);
    return c.json({ success: true });
  });

  app.post('/:id/members', requireUser, async (c) => {
    const user = c.get('user')!;
    const { document, role } = await resolveAccess(c.req.param('id'), user, { blocks: false });
    if (role !== 'owner') throw new HTTPException(403, { message: 'Only the owner can invite people' });
    const parsed = inviteBody.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw new HTTPException(422, { message: 'Enter a valid email address.' });
    if (parsed.data.email === user.email) throw new HTTPException(422, { message: 'You already own this document.' });
    const invitee = await userByEmail(parsed.data.email);
    const ref = membersRef(document.id).doc(memberDocId(parsed.data.email));
    const previous = row<MemberRow>(await ref.get());
    let member: MemberRow;
    if (previous) {
      // Inviting the same address again changes the role only (as the old upsert did).
      await ref.update({ role: parsed.data.role });
      member = { ...previous, role: parsed.data.role };
    } else {
      const fields = {
        user_id: invitee?.id ?? null, invite_email: parsed.data.email,
        display_name: parsed.data.display_name || invitee?.full_name || null,
        role: parsed.data.role, status: invitee ? 'active' : 'pending', invited_by_user_id: user.id,
        invite_sent: false, created_at: new Date(),
      };
      await ref.set(fields);
      member = { id: ref.id, ...fields };
    }
    await syncMemberIndex(document.id);
    // Invitation emails are sent once the mail service is set up; the link works either way.
    return c.json({ member: memberToDict(member), inviteSent: false, inviteUrl: `${env.publicUrl}/editor?doc=${document.id}` });
  });

  app.patch('/:id/members/:memberId', requireUser, async (c) => {
    const { document, role } = await resolveAccess(c.req.param('id'), c.get('user'), { blocks: false });
    if (role !== 'owner') throw new HTTPException(403, { message: 'Only the owner can change roles' });
    const parsed = z.object({ role: z.enum(['editor', 'commenter', 'viewer']) }).safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw new HTTPException(422, { message: 'Invalid role.' });
    const memberId = c.req.param('memberId');
    const ref = memberId.includes('/') ? null : membersRef(document.id).doc(memberId);
    const current = ref ? row<MemberRow>(await ref.get()) : null;
    if (!ref || !current) throw new HTTPException(404, { message: 'Member not found' });
    await ref.update({ role: parsed.data.role });
    await syncMemberIndex(document.id);
    return c.json(memberToDict({ ...current, role: parsed.data.role }));
  });

  app.delete('/:id/members/:memberId', requireUser, async (c) => {
    const { document, role } = await resolveAccess(c.req.param('id'), c.get('user'), { blocks: false });
    if (role !== 'owner') throw new HTTPException(403, { message: 'Only the owner can remove people' });
    const memberId = c.req.param('memberId');
    if (!memberId.includes('/')) await membersRef(document.id).doc(memberId).delete();
    await syncMemberIndex(document.id);
    return c.json({ success: true });
  });

  app.get('/:id/thumbnail', async (c) => {
    const { document } = await resolveAccess(c.req.param('id'), c.get('user'));
    c.header('Cache-Control', 'private, max-age=60');
    c.header('Content-Type', 'image/svg+xml');
    return c.body(thumbnailSvg(document.title, blocksToText(document.blocks).slice(0, 1200)));
  });

  return app;
}
