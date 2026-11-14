import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
const fake = await vi.hoisted(async () => (await import('./fakeFirestore.js')).createFakeFirestore());
vi.mock('../../lib/server/firebase.js', async (original) => ({ ...(await original<typeof import('../../lib/server/firebase.js')>()), ...fake.module }));
import type { AppVariables, AuthUser } from '../../lib/server/auth.js';
import { projectAttentionRoutes } from '../../lib/server/routes/projectAttention.js';
import { forgetRoles } from '../../lib/server/lib/projects.js';

const person = (id: string): AuthUser => ({ id, email: `${id}@example.test`, full_name: id, account_id: `account-${id}`, is_admin: false });
const call = (id: string, path: string, method = 'GET', body?: unknown) => {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use('*', async (c, next) => { c.set('user', person(id)); await next(); });
  app.route('/api', projectAttentionRoutes());
  app.onError((e, c) => c.json({ detail: e.message }, e instanceof HTTPException ? e.status : 500));
  return app.request(`/api${path}`, { method, headers: { 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
};
const link = (over: Record<string, unknown> = {}) => ({ citation_id: 'c1', block_id: 'b1', project_id: 'p1', source_id: 's1', finding_id: 'f1', library_document_id: null, claim: 'Smoking raises the risk of stroke', state: 'checked', checked_at: '2026-11-14T10:00:00.000Z', ...over });

beforeEach(() => {
  fake.clear(); forgetRoles('p1'); forgetRoles('p2');
  const members = ['editor', 'viewer'].map((id, i) => ({ user_id: id, email: `${id}@example.test`, name: id, role: ['edit', 'view'][i], added_at: new Date() }));
  fake.put('projects/p1', { owner_user_id: 'owner', owner_account_id: 'account-owner', owner_email: 'owner@example.test', name: 'Thesis', description: '', members, member_ids: ['owner', 'editor', 'viewer'], invite_emails: [], created_at: new Date(), updated_at: new Date() });
  fake.put('projects/p2', { owner_user_id: 'other', owner_account_id: 'account-other', owner_email: 'other@example.test', name: 'Private', description: '', members: [], member_ids: ['other'], invite_emails: [], created_at: new Date(), updated_at: new Date() });
  fake.put('documents/d1', { owner_user_id: 'editor', title: 'Chapter 2', share_settings: {}, created_at: new Date(), updated_at: new Date() });
  fake.put('documents/d1/members/viewer-member', { user_id: 'viewer', role: 'viewer', status: 'active' });
  fake.put('projects/p1/evidence/s1', { title: 'Cohort study' });
  fake.put('projects/p1/evidence/s1/findings/f1', { status: 'approved' });
  fake.put('projects/p1/evidence/s1/findings/f2', { status: 'needs_revision' });
  fake.put('projects/p1/evidence/s1/findings/f3', { status: 'needs_review' });
});

describe('evidence links from documents', () => {
  it('saves links only for projects the editor can change, and only editors of the document may report', async () => {
    expect((await call('viewer', '/documents/d1/evidence-links', 'PUT', { links: [link()] })).status).toBe(403);
    const response = await call('editor', '/documents/d1/evidence-links', 'PUT', { links: [link(), link({ project_id: 'p2' })] });
    expect(response.status).toBe(200);
    expect((await response.json() as any).projects).toEqual(['p1']);
    expect(fake.read('projects/p1/document_links/d1')).toMatchObject({ document_title: 'Chapter 2', links: [expect.objectContaining({ finding_id: 'f1' })] });
    expect(fake.read('projects/p2/document_links/d1')).toBeUndefined();
  });

  it('removes a project’s links when the document no longer cites its evidence', async () => {
    await call('editor', '/documents/d1/evidence-links', 'PUT', { links: [link()] });
    await call('editor', '/documents/d1/evidence-links', 'PUT', { links: [] });
    expect(fake.read('projects/p1/document_links/d1')).toBeUndefined();
  });
});

describe('needs another look', () => {
  it('lists changed sentences and findings sent back, removed or unreviewed, with links to the sentence', async () => {
    await call('editor', '/documents/d1/evidence-links', 'PUT', { links: [
      link(),
      link({ citation_id: 'c2', block_id: 'b2', state: 'changed' }),
      link({ citation_id: 'c3', block_id: 'b3', finding_id: 'f2' }),
      link({ citation_id: 'c4', block_id: 'b4', finding_id: 'gone' }),
      link({ citation_id: 'c5', block_id: 'b5', finding_id: 'f3' }),
      link({ citation_id: 'c6', block_id: 'b6', source_id: null, finding_id: null, state: 'unchecked' }),
    ] });
    fake.put('projects/p1/progress/e1', { date: '2026-11-10', done: '', next: 'Rewrite section 2.3', blockers: '', author_id: 'editor', created_at: new Date() });
    const data = await (await call('editor', '/projects/p1/attention')).json() as any;
    const [document] = data.documents;
    expect(document).toMatchObject({ document_id: 'd1', title: 'Chapter 2', accessible: true, citations: 6, unchecked: 1 });
    expect(document.items.map((item: any) => [item.kind, item.block_id])).toEqual([
      ['finding_revision', 'b3'], ['claim_changed', 'b2'], ['evidence_removed', 'b4'], ['finding_unreviewed', 'b5'],
    ]);
    expect(document.items[0].href).toBe('/editor?doc=d1&block=b3');
    expect(data.total).toBe(4);
    expect(data.next_steps).toMatchObject({ date: '2026-11-10', next: 'Rewrite section 2.3' });
  });

  it('hides sentences from project members who cannot open the document, and the project from outsiders', async () => {
    await call('editor', '/documents/d1/evidence-links', 'PUT', { links: [link({ state: 'changed' })] });
    fake.store.delete('documents/d1/members/viewer-member');
    const data = await (await call('viewer', '/projects/p1/attention')).json() as any;
    expect(data.documents[0]).toMatchObject({ accessible: false, title: null, href: null });
    expect(data.documents[0].items[0]).toMatchObject({ kind: 'claim_changed', claim: null, href: null });
    expect(JSON.stringify(data)).not.toMatch(/Smoking|Chapter 2/);
    expect((await call('outsider', '/projects/p1/attention')).status).toBe(404);
  });

  it('drops the links of a deleted document', async () => {
    await call('editor', '/documents/d1/evidence-links', 'PUT', { links: [link({ state: 'changed' })] });
    fake.store.delete('documents/d1');
    expect((await (await call('editor', '/projects/p1/attention')).json() as any).documents).toEqual([]);
    expect(fake.read('projects/p1/document_links/d1')).toBeUndefined();
  });
});
