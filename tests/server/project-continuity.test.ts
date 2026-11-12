import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
const fake = await vi.hoisted(async () => (await import('./fakeFirestore.js')).createFakeFirestore());
const objects = vi.hoisted(() => new Map<string, Uint8Array>());
vi.mock('../../lib/server/firebase.js', async (original) => ({ ...(await original<typeof import('../../lib/server/firebase.js')>()), ...fake.module,
  getMany: async (collection: string, ids: string[]) => ids.flatMap((id) => { const data = fake.read(`${collection}/${id}`); return data ? [{ id, ...data }] : []; }),
  deleteDeep: async (ref: { path: string }) => { for (const path of fake.store.keys()) if (path === ref.path || path.startsWith(`${ref.path}/`)) fake.store.delete(path); },
}));
vi.mock('../../lib/server/lib/plans.js', async (original) => ({ ...(await original<typeof import('../../lib/server/lib/plans.js')>()), checkTotal: vi.fn(async () => undefined) }));
vi.mock('../../lib/server/lib/storage.js', () => ({
  saveFile: async (key: string, bytes: Uint8Array) => { objects.set(key, bytes); },
  readFileBytes: async (key: string) => objects.has(key) ? Buffer.from(objects.get(key)!) : null,
  openFile: async () => null,
  deletePrefix: async (prefix: string) => { for (const key of objects.keys()) if (key.startsWith(`${prefix}/`)) objects.delete(key); },
}));
import type { AppVariables, AuthUser } from '../../lib/server/auth.js';
import { projectGovernanceRoutes } from '../../lib/server/routes/projectGovernance.js';
import { projectEvidenceRoutes } from '../../lib/server/routes/projectEvidence.js';
import { detachProjectMatrices, matrixFor, saveMatrixFill, type MatrixCell } from '../../lib/server/lib/matrix.js';
import { matrixRoutes } from '../../lib/server/routes/matrix.js';
import type { Slots } from '../../lib/server/slots/types.js';
import { forgetRoles, deleteProject } from '../../lib/server/lib/projects.js';
import { checkTotal } from '../../lib/server/lib/plans.js';
const person = (id: string): AuthUser => ({ id, email: `${id}@example.test`, full_name: id, account_id: `account-${id}`, is_admin: false });
const make = (id: string) => {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use('*', async (c, next) => { c.set('user', person(id)); await next(); });
  app.route('/api/projects', projectGovernanceRoutes()); app.route('/api', projectEvidenceRoutes());
  app.route('/api/matrices', matrixRoutes({} as Slots));
  app.onError((e, c) => c.json({ detail: e.message }, e instanceof HTTPException ? e.status : 500));
  return app;
};
const call = (id: string, path: string, method = 'GET', body?: unknown) => make(id).request(`/api/projects/p1${path}`, { method, headers: { 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
beforeEach(() => {
  fake.clear(); objects.clear(); forgetRoles('p1');
  fake.put('projects/p1', { owner_user_id: 'owner', owner_account_id: 'account-owner', owner_email: 'owner@example.test', name: 'Shared research', description: '', members: ['editor', 'commenter', 'viewer'].map((id, i) => ({ user_id: id, email: `${id}@example.test`, name: id, role: ['edit', 'comment', 'view'][i], added_at: new Date() })), member_ids: ['owner', 'editor', 'commenter', 'viewer'], invite_emails: [], created_at: new Date(), updated_at: new Date() });
});
describe('project evidence and continuity permissions', () => {
  it('includes pending findings and existing review work without exposing source text or private projects', async () => {
    fake.put('workflows/w1', { project_id: 'p1', title: 'Submitted workbook', status: 'in_review' });
    fake.put('research_monitors/m1', { project_id: 'p1', title: 'New evidence', pending_runs: 2 });
    fake.put('projects/p1/evidence/s1', { title: 'Shared original source', snapshot_ref: 'private-storage-key' });
    fake.put('projects/p1/evidence/s1/findings/f1', { status: 'needs_review', finding: 'Private detailed finding', quote: 'Original source passage' });
    fake.put('projects/p1/evidence/s1/findings/f2', { status: 'needs_revision' });
    fake.put('projects/p1/evidence/s1/findings/f3', { status: 'approved' });
    fake.put('workflows/other', { project_id: 'private-project', title: 'Private project title', status: 'in_review' });
    fake.put('projects/private-project/evidence/secret', { title: 'Private source title' });
    const response = await call('viewer', '/resources'); expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    const data = await response.json() as any;
    expect(data.review_inbox).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'w1', kind: 'workbook', count: 1 }),
      expect.objectContaining({ id: 'm1', kind: 'monitor', count: 2 }),
      expect.objectContaining({ id: 's1', kind: 'findings', count: 2, href: '/projects/p1?evidence=s1&finding=f1#project-evidence-title' }),
    ]));
    expect(data.review_inbox).toHaveLength(3);
    expect(JSON.stringify(data)).not.toMatch(/private-storage-key|Private detailed finding|Original source passage|Private project title|Private source title/);
    expect((await call('outsider', '/resources')).status).toBe(404);
    fake.put('projects/p1/evidence/s1/findings/f1', { status: 'approved' });
    fake.put('projects/p1/evidence/s1/findings/f2', { status: 'approved' });
    expect((await (await call('viewer', '/resources')).json() as any).review_inbox.some((item: any) => item.kind === 'findings')).toBe(false);
  });
  it('counts only screening conflicts visible through the caller’s independent-review permissions', async () => {
    fake.put('systematic_reviews/r1', { user_id: 'owner', account_id: 'account-owner', project_id: 'p1', task_id: null, title: 'Screening work', review_type: 'qualitative', framework: 'SPIDER', created_at: new Date(), updated_at: new Date() });
    const conflict = { source: 'upload', order: 1, duplicate_of: null, votes: { title: { owner: { decision: 'include', reason: 'Concealed peer rationale' }, another: { decision: 'exclude', reason: 'Concealed other rationale' } } }, resolved: {} };
    fake.put('systematic_reviews/r1/records/paper', conflict);
    fake.put('systematic_reviews/r1/records/duplicate', { ...conflict, duplicate_of: 'paper' });
    const editor = await (await call('editor', '/resources')).json() as any;
    expect(editor.review_inbox.some((item: any) => item.kind === 'review_conflict')).toBe(false);
    const owner = await (await call('owner', '/resources')).json() as any;
    expect(owner.review_inbox).toEqual([expect.objectContaining({ id: 'r1', kind: 'review_conflict', count: 1, href: '/systematic-review/r1' })]);
    expect(JSON.stringify(owner)).not.toContain('Concealed');
    fake.put('systematic_reviews/r1/records/paper', { ...conflict, votes: { title: { ...conflict.votes.title, editor: { decision: 'exclude' } } } });
    expect((await (await call('editor', '/resources')).json() as any).review_inbox).toEqual([expect.objectContaining({ kind: 'review_conflict', count: 1 })]);
    fake.put('systematic_reviews/r1/records/paper', { ...conflict, resolved: { title: { decision: 'exclude' } } });
    expect((await (await call('owner', '/resources')).json() as any).review_inbox).toEqual([]);
  });
  it('includes full-text conflicts only after title screening passes and excludes resolved conflicts', async () => {
    fake.put('systematic_reviews/r1', { user_id: 'owner', account_id: 'account-owner', project_id: 'p1', task_id: null, title: 'Full text screening', review_type: 'systematic', framework: 'PICO', created_at: new Date(), updated_at: new Date() });
    const votes = { title: { owner: { decision: 'include' }, editor: { decision: 'include' } }, full: { owner: { decision: 'include' }, editor: { decision: 'exclude' } } };
    fake.put('systematic_reviews/r1/records/paper', { source: 'upload', order: 1, duplicate_of: null, votes, resolved: {} });
    const response = await (await call('owner', '/resources')).json() as any;
    expect(response.review_inbox[0]).toMatchObject({ count: 1, detail: '0 title/abstract and 1 full-text conflicts visible to you' });
    fake.put('systematic_reviews/r1/records/paper', { source: 'upload', order: 1, duplicate_of: null, votes, resolved: { title: { decision: 'exclude' } } });
    expect((await (await call('owner', '/resources')).json() as any).review_inbox).toEqual([]);
  });
  it('retains a manual correction made while matrix extraction was running', async () => {
    const manual = { value: 'Corrected after reading the source', edited: true, basis: 'writer', status: 'done', quote: null, page: null, updated_at: new Date() } as MatrixCell;
    fake.put('review_matrices/m1', { user_id: 'owner', project_id: 'p1', document_ids: ['source'], columns: [{ id: 'finding' }, { id: 'sample' }] });
    fake.put('review_matrices/m1/rows/source', { cells: { finding: manual } });
    const model = { ...manual, edited: false, basis: 'abstract', value: 'Earlier draft' } as MatrixCell;
    const saved = await saveMatrixFill('m1', 'editor', 'source', ['finding', 'sample'], { finding: model, sample: model });
    expect(saved.finding.value).toBe(manual.value);
    expect(saved.sample.value).toBe(model.value);
    expect([...fake.store.keys()].filter((path) => path.startsWith('review_matrices/m1/events/'))).toHaveLength(1);
    fake.put('review_matrices/m1', { ...fake.read('review_matrices/m1'), document_ids: [] });
    await expect(saveMatrixFill('m1', 'editor', 'source', ['finding'], { finding: model })).rejects.toMatchObject({ status: 409 });
  });
  it('keeps shared matrices private to current members and enforces read-only roles', async () => {
    fake.put('review_matrices/m1', { user_id: 'editor', project_id: 'p1', document_ids: [], title: 'Matrix' });
    expect((await matrixFor(person('viewer'), 'm1')).can_edit).toBe(false);
    await expect(matrixFor(person('commenter'), 'm1', true)).rejects.toMatchObject({ status: 403 });
    await expect(matrixFor(person('outsider'), 'm1')).rejects.toMatchObject({ status: 404 });
    fake.put('projects/p1', { ...fake.read('projects/p1'), members: [] });
    await expect(matrixFor(person('editor'), 'm1')).rejects.toMatchObject({ status: 404 });
  });
  it('rechecks collaborator sources before moving a matrix out of its project', async () => {
    const original = { user_id: 'owner', project_id: 'p1', document_ids: [], document_owners: {}, title: 'Matrix', columns: [{ id: 'finding' }] };
    fake.put('review_matrices/m1', original);
    const database = fake.module.db(); const transact = database.runTransaction;
    const spy = vi.spyOn(database, 'runTransaction').mockImplementationOnce(async (run) => {
      fake.put('review_matrices/m1', { ...original, document_ids: ['collaborator-source'], document_owners: { 'collaborator-source': 'editor' } });
      return transact(run);
    });
    try {
      const response = await make('owner').request('/api/matrices/m1', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ project_id: null }) });
      expect(response.status).toBe(409);
      expect(fake.read('review_matrices/m1')?.project_id).toBe('p1');
      expect(fake.read('review_matrices/m1')?.document_owners).toEqual({ 'collaborator-source': 'editor' });
    } finally { spy.mockRestore(); }
  });
  it('rejects an extraction commit after the editor is removed from the project', async () => {
    fake.put('review_matrices/m1', { user_id: 'owner', project_id: 'p1', document_ids: ['source'], columns: [{ id: 'finding' }] });
    fake.put('projects/p1', { ...fake.read('projects/p1'), members: [] });
    const cell = { value: 'Old in-flight answer', edited: false, basis: 'abstract', status: 'done', quote: 'quotation', page: null, updated_at: new Date() } as MatrixCell;
    await expect(saveMatrixFill('m1', 'editor', 'source', ['finding'], { finding: cell })).rejects.toMatchObject({ status: 403 });
    expect(fake.read('review_matrices/m1/rows/source')).toBeUndefined();
  });
  it('cannot transfer collaborator audit history by first removing its source', async () => {
    fake.put('review_matrices/m1', { user_id: 'owner', project_id: 'p1', document_ids: [], document_owners: {}, columns: [{ id: 'finding' }], title: 'Matrix' });
    fake.put('review_matrices/m1/events/old', { action: 'manual_edit', by: 'editor', document_id: 'removed-source', after: { value: 'Private collaborator evidence' } });
    const response = await make('owner').request('/api/matrices/m1', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ project_id: null }) });
    expect(response.status).toBe(409);
    expect((await response.json() as any).detail).toContain('create a new matrix');
    expect(fake.read('review_matrices/m1')?.project_id).toBe('p1');
  });
  it('merges concurrent source additions and remembers the collaborator contribution', async () => {
    const ownId = '11111111-1111-4111-8111-111111111111'; const addedId = '22222222-2222-4222-8222-222222222222';
    fake.put(`library_documents/${ownId}`, { user_id: 'editor', title: 'Owned source' });
    const original = { user_id: 'owner', project_id: 'p1', document_ids: [], document_owners: {}, title: 'Matrix', columns: [{ id: 'finding' }] };
    fake.put('review_matrices/m1', original);
    const database = fake.module.db(); const transact = database.runTransaction;
    const spy = vi.spyOn(database, 'runTransaction').mockImplementationOnce(async (run) => {
      fake.put('review_matrices/m1', { ...original, document_ids: [addedId], document_owners: { [addedId]: 'owner' } });
      return transact(run);
    });
    try {
      const response = await make('editor').request('/api/matrices/m1/papers', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ document_ids: [ownId] }) });
      expect(response.status, await response.clone().text()).toBe(200);
      expect(fake.read('review_matrices/m1')?.document_ids).toEqual([addedId, ownId]);
      expect(fake.read('review_matrices/m1')?.shared_contributions).toBe(true);
    } finally { spy.mockRestore(); }
  });
  it('archives collaborative matrix evidence on project deletion without future Library access', async () => {
    const sourceId = '11111111-1111-4111-8111-111111111111';
    const now = new Date();
    const matrix = { user_id: 'owner', project_id: 'p1', title: 'Shared findings', columns: [{ id: 'finding', label: 'Finding', prompt: 'Finding' }], document_ids: [sourceId], document_owners: { [sourceId]: 'editor' }, created_at: now, updated_at: now };
    fake.put('review_matrices/m1', matrix);
    fake.put(`library_documents/${sourceId}`, { user_id: 'editor', title: 'Title at deletion', authors: ['Researcher'], abstract: 'Private full abstract', metadata: { private_path: 'secret-file', year: '2024' } });
    const cell = { value: 'Finding saved while shared', quote: 'Original exact passage', page: 2, basis: 'full_text', edited: false, status: 'done', updated_at: now };
    fake.put(`review_matrices/m1/rows/${sourceId}`, { cells: { finding: cell } });
    fake.put('review_matrices/m1/events/e1', { by: 'editor', action: 'manual_edit', after: { value: 'Earlier correction' }, at: now });
    fake.put('review_matrices/personal', { ...matrix, document_ids: [], document_owners: {} });
    await deleteProject(person('owner'), 'p1');
    expect(fake.read('review_matrices/m1')).toMatchObject({ archived: true, archived_from_project_id: 'p1', project_id: null });
    expect(fake.read('review_matrices/personal')).toMatchObject({ project_id: null });
    expect(fake.read('review_matrices/personal')?.archived).not.toBe(true);
    expect(JSON.stringify(fake.read('review_matrices/m1')?.paper_snapshots)).not.toContain('Private full abstract');
    expect(JSON.stringify(fake.read('review_matrices/m1')?.paper_snapshots)).not.toContain('secret-file');
    // Live source changes and even deletion must not affect an archived artifact.
    fake.put(`library_documents/${sourceId}`, { user_id: 'editor', title: 'New private title', abstract: 'New private notes' });
    const response = await make('owner').request('/api/matrices/m1');
    expect(response.status).toBe(200); const data = await response.json() as any;
    expect(data).toMatchObject({ archived: true, can_edit: false, can_share: false });
    expect(data.rows[0].paper.title).toBe('Title at deletion');
    expect(data.rows[0].cells.finding.quote).toBe('Original exact passage');
    expect((await make('editor').request('/api/matrices/m1')).status).toBe(404);
    const exported = await make('owner').request('/api/matrices/m1/export');
    expect((await exported.json() as any).events[0].after.value).toBe('Earlier correction');
    for (const [path, method, body] of [
      ['', 'PATCH', { project_id: null }], ['/papers', 'POST', { document_ids: [sourceId] }],
      [`/papers/${sourceId}`, 'DELETE', undefined], [`/rows/${sourceId}/cells/finding`, 'PUT', { value: 'Changed' }],
    ] as const) {
      const result = await make('owner').request(`/api/matrices/m1${path}`, { method, headers: { 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
      expect(result.status).toBe(409);
    }
    await expect(saveMatrixFill('m1', 'owner', sourceId, ['finding'], { finding: cell as MatrixCell })).rejects.toMatchObject({ status: 409 });
  });
  it('freezes legacy collaborator history and never substitutes a live source for a missing snapshot', async () => {
    const sourceId = '11111111-1111-4111-8111-111111111111';
    const now = new Date();
    fake.put('review_matrices/m1', { user_id: 'owner', project_id: 'p1', document_ids: [sourceId], document_owners: { [sourceId]: 'owner' }, columns: [], title: 'Legacy history', created_at: now, updated_at: now });
    fake.put('review_matrices/m1/events/e1', { by: 'editor', action: 'manual_edit', document_id: 'removed' });
    await detachProjectMatrices('p1');
    fake.put(`library_documents/${sourceId}`, { user_id: 'owner', title: 'Available only after archiving' });
    const data = await (await make('owner').request('/api/matrices/m1')).json() as any;
    expect(data.rows[0].paper.title).toBe('Source unavailable at archive time');
    expect(data.archived).toBe(true);
    // Defensive legacy handling: an archive without any snapshot cannot read the live Library either.
    fake.put('review_matrices/m1', { ...fake.read('review_matrices/m1'), paper_snapshots: undefined });
    const missing = await (await make('owner').request('/api/matrices/m1')).json() as any;
    expect(missing.rows[0].paper.title).toBe('Source unavailable at archive time');
  });
  it('requires exact evidence, separates self-approval and retains review history in exports', async () => {
    const added = await call('editor', '/evidence', 'POST', { title: 'Interview', text: 'Participants described unreliable transport.' });
    expect(added.status).toBe(201); const source = await added.json() as any;
    expect((await call('viewer', `/evidence/${source.id}/findings`, 'POST', { finding: 'Barrier', quote: 'unreliable transport' })).status).toBe(403);
    expect((await call('editor', `/evidence/${source.id}/findings`, 'POST', { finding: 'Barrier', quote: 'reliable transport', page: 2 })).status).toBe(422);
    const response = await call('editor', `/evidence/${source.id}/findings`, 'POST', { finding: 'A transport barrier', quote: 'unreliable transport', page: 1 });
    expect(response.status).toBe(201); const finding = await response.json() as any;
    const path = `/evidence/${source.id}/findings/${finding.id}/reviews`;
    expect((await call('editor', path, 'POST', { decision: 'approved', note: 'My own decision' })).status).toBe(409);
    expect((await call('commenter', path, 'POST', { decision: 'approved', note: 'Checked the passage and limits.' })).status).toBe(200);
    const bundle = await call('viewer', '/bundle'); expect(bundle.status).toBe(200);
    const data = await bundle.json() as any;
    expect(data.evidence[0].findings[0].reviews).toHaveLength(1);
    expect(data.evidence[0].findings[0].status).toBe('approved');
    expect(data.evidence[0]).not.toHaveProperty('snapshot_ref');
    expect((await call('outsider', '/bundle')).status).toBe(404);
  });
  it('requires a targeted acceptance and preserves members when ownership changes', async () => {
    expect((await call('editor', '/transfer', 'POST', { email: 'commenter@example.test' })).status).toBe(403);
    expect((await call('owner', '/transfer', 'POST', { email: 'editor@example.test' })).status).toBe(200);
    expect((await call('commenter', '/transfer/accept', 'POST')).status).toBe(403);
    expect((await call('editor', '/transfer/accept', 'POST')).status).toBe(200);
    expect(fake.read('projects/p1')).toMatchObject({ owner_user_id: 'editor', owner_account_id: 'account-editor', transfer: null });
    expect(fake.read('projects/p1')?.members.find((m: any) => m.user_id === 'owner').role).toBe('edit');
    expect((await call('owner', '/governance', 'PATCH', { retention_review_at: '', retention_note: 'Changed' })).status).toBe(403);
  });
  it('does not accept an expired transfer or a transfer after membership removal', async () => {
    await call('owner', '/transfer', 'POST', { email: 'editor@example.test' });
    const project = fake.read('projects/p1')!;
    fake.put('projects/p1', { ...project, transfer: { ...project.transfer, expires_at: new Date(0) } });
    expect((await call('editor', '/transfer/accept', 'POST')).status).toBe(409);
    expect(fake.read('projects/p1')?.owner_user_id).toBe('owner');
    fake.put('projects/p1', { ...project, members: [] });
    expect((await call('editor', '/transfer/accept', 'POST')).status).toBe(404);
  });
  it('detaches surviving workspaces and removes project snapshots on deletion', async () => {
    fake.put('research_monitors/monitor', { project_id: 'p1' });
    fake.put('workflows/book', { project_id: 'p1' });
    fake.put('projects/p1/evidence/e1', { title: 'Evidence' });
    objects.set('project-evidence/p1/e1/text.json', new Uint8Array([1]));
    await deleteProject(person('owner'), 'p1');
    expect(fake.read('research_monitors/monitor')?.project_id).toBeNull();
    expect(fake.read('workflows/book')?.project_id).toBeNull();
    expect(fake.read('projects/p1/evidence/e1')).toBeUndefined();
    expect(objects.size).toBe(0);
  });

  it('checks the new owner’s collaborator limit when they accept a project transfer', async () => {
    const limited = vi.mocked(checkTotal);
    await call('owner', '/transfer', 'POST', { email: 'editor@example.test' });
    limited.mockImplementation(async (_account, key) => {
      if (key === 'collaborators') throw new HTTPException(402, { message: 'Your plan allows fewer collaborators.' });
    });
    try {
      expect((await call('editor', '/transfer/accept', 'POST')).status).toBe(402);
      expect(fake.read('projects/p1')?.owner_user_id).toBe('owner');
      expect(limited).toHaveBeenCalledWith('account-editor', 'collaborators', 3, 0);
    } finally {
      limited.mockImplementation(async () => undefined);
    }
    expect((await call('editor', '/transfer/accept', 'POST')).status).toBe(200);
  });
  it('lets supervisors (commenters) review findings but not viewers', async () => {
    const added = await call('editor', '/evidence', 'POST', { title: 'Interview', text: 'Participants described unreliable transport.' });
    const source = await added.json() as any;
    const created = await call('editor', `/evidence/${source.id}/findings`, 'POST', { finding: 'Barrier', quote: 'unreliable transport', page: 1 });
    const path = `/evidence/${source.id}/findings/${(await created.json() as any).id}/reviews`;
    expect((await call('viewer', path, 'POST', { decision: 'approved', note: 'Looks right' })).status).toBe(403);
    expect((await call('commenter', path, 'POST', { decision: 'needs_revision', note: 'Add the page context' })).status).toBe(200);
  });
});
