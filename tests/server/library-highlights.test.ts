import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
const fake = await vi.hoisted(async () => (await import('./fakeFirestore.js')).createFakeFirestore());
const objects = vi.hoisted(() => new Map<string, Uint8Array>());
vi.mock('../../lib/server/firebase.js', async (original) => ({ ...(await original<typeof import('../../lib/server/firebase.js')>()), ...fake.module }));
vi.mock('../../lib/server/lib/storage.js', () => ({
  saveFile: async (key: string, bytes: Uint8Array) => { objects.set(key, bytes); },
  readFileBytes: async (key: string) => objects.has(key) ? Buffer.from(objects.get(key)!) : null,
  openFile: async () => null,
  deleteFile: async (key: string) => { objects.delete(key); },
}));
vi.mock('../../lib/server/lib/assist-store.js', async (original) => ({
  ...(await original<typeof import('../../lib/server/lib/assist-store.js')>()),
  getLibraryDocuments: async (userId: string, ids: string[]) => ids.flatMap((id) => { const data = fake.read(`library_documents/${id}`); return data && data.user_id === userId ? [{ id, ...data }] : []; }),
}));
import type { AppVariables, AuthUser } from '../../lib/server/auth.js';
import { libraryHighlightRoutes, MAX_HIGHLIGHTS } from '../../lib/server/routes/libraryHighlights.js';
import { looseEvidenceText, projectEvidenceRoutes, verifyEvidenceQuote } from '../../lib/server/routes/projectEvidence.js';
import { MAX_PAPERS } from '../../lib/server/lib/matrix.js';
import { forgetRoles } from '../../lib/server/lib/projects.js';

const DOC = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const person = (id: string): AuthUser => ({ id, email: `${id}@example.test`, full_name: id, account_id: `account-${id}`, is_admin: false });
const make = (id: string) => {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use('*', async (c, next) => { c.set('user', person(id)); await next(); });
  app.route('/api/library', libraryHighlightRoutes()); app.route('/api', projectEvidenceRoutes());
  app.onError((e, c) => c.json({ detail: e.message }, e instanceof HTTPException ? e.status : 500));
  return app;
};
const call = async (id: string, path: string, method = 'GET', body?: unknown) => {
  const response = await make(id).request(path, { method, headers: { 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: response.status, body: await response.json() as any };
};
const base = `/api/library/documents/${DOC}/highlights`;
const rects = [{ x: 0.1, y: 0.2, w: 0.5, h: 0.02 }];
const pageText = 'Results. Partici-\npants in the inter\u{fb01}rst group reported improved sleep quality after eight weeks.';
const create = (body: Record<string, unknown> = {}) => call('owner', base, 'POST', { page: 2, quote: 'Participants in the interfirst group   reported improved sleep', rects, ...body });

beforeEach(() => {
  fake.clear(); objects.clear(); forgetRoles('p1');
  const now = new Date();
  fake.put(`library_documents/${DOC}`, { user_id: 'owner', filename: 'sleep.pdf', file_type: 'pdf', file_path: null, title: 'Sleep trial', authors: ['A. Author'], doi: null, abstract: 'Abstract text.', metadata: {}, processing_status: 'completed', chunk_count: 2, created_at: now, updated_at: now });
  fake.put(`library_documents/${DOC}/chunks/0`, { chunk_index: 0, page: 1, content: 'Introduction. Sleep matters.' });
  fake.put(`library_documents/${DOC}/chunks/1`, { chunk_index: 1, page: 2, content: pageText });
  fake.put(`library_documents/${OTHER}`, { user_id: 'stranger', filename: 'x.pdf', title: 'Not yours', created_at: now, updated_at: now });
  fake.put('projects/p1', { owner_user_id: 'owner', owner_account_id: 'account-owner', owner_email: 'owner@example.test', name: 'Sleep project', description: '', members: [{ user_id: 'viewer', email: 'viewer@example.test', name: 'viewer', role: 'view', added_at: now }], member_ids: ['owner', 'viewer'], invite_emails: [], created_at: now, updated_at: now });
});

describe('evidence quote matching', () => {
  it('keeps the strict match and accepts PDF-selected text through the loose match', () => {
    const pages = [{ page: 2, text: pageText }];
    expect(verifyEvidenceQuote(pages, 'reported improved sleep quality', 2)).toBe(true);
    expect(verifyEvidenceQuote(pages, 'Participants in the interfirst group reported', 2)).toBe(true);
    expect(verifyEvidenceQuote([{ page: 1, text: 'co\u{ad}operation   was HIGH' }], 'cooperation was high', 1)).toBe(true);
    expect(verifyEvidenceQuote(pages, 'Participants in the interfirst group reported', 1)).toBe(false);
    expect(verifyEvidenceQuote(pages, 'participants reported worse sleep', 2)).toBe(false);
    expect(verifyEvidenceQuote(pages, 'a-b', 2)).toBe(false);
    expect(looseEvidenceText('Self-\n report, 12 %')).toBe('selfreport12');
  });
});

describe('library highlights', () => {
  it('creates, lists, edits and deletes highlights for the document owner only', async () => {
    const created = await create({ note: '  Main result ', color: 'green' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ page: 2, quote: 'Participants in the interfirst group reported improved sleep', note: 'Main result', color: 'green', verified: true, rects, project_links: [], matrix_links: [] });
    expect(typeof created.body.created_at).toBe('string');
    expect((await create({ page: 1, quote: 'Introduction.' })).body.verified).toBe(true);
    expect((await create({ quote: 'Something the PDF never says' })).body.verified).toBe(false);
    const list = (await call('owner', base)).body.highlights;
    expect(list.map((item: any) => item.page)).toEqual([1, 2, 2]);
    expect((await call('stranger', base)).status).toBe(404);
    expect((await call('owner', `/api/library/documents/${OTHER}/highlights`)).status).toBe(404);
    const path = `${base}/${created.body.id}`;
    expect((await call('owner', path, 'PATCH', { color: 'pink' })).body).toMatchObject({ color: 'pink', note: 'Main result' });
    expect((await call('owner', path, 'PATCH', {})).status).toBe(422);
    expect((await call('stranger', path, 'DELETE')).status).toBe(404);
    expect((await call('owner', path, 'DELETE')).body).toEqual({ deleted: true });
    expect((await call('owner', path, 'DELETE')).status).toBe(404);
  });
  it('validates the shape and marks highlights unverified while the PDF has no text', async () => {
    expect((await create({ rects: [] })).status).toBe(422);
    expect((await create({ rects: [{ x: 2, y: 0, w: 0.1, h: 0.1 }] })).status).toBe(422);
    expect((await create({ quote: '   ' })).status).toBe(422);
    expect((await create({ quote: 'x'.repeat(4001) })).status).toBe(422);
    expect((await create({ color: 'red' })).status).toBe(422);
    fake.store.delete(`library_documents/${DOC}/chunks/1`);
    expect((await create()).body.verified).toBe(false);
  });
  it('caps highlights per document', async () => {
    for (let index = 0; index < MAX_HIGHLIGHTS; index += 1) fake.put(`library_documents/${DOC}/highlights/h${index}`, { page: 1 });
    expect((await create()).status).toBe(422);
  });
  it('sends a highlight to a project as a reviewable finding, reusing the source', async () => {
    const highlight = (await create({ note: 'Better sleep' })).body;
    const path = `${base}/${highlight.id}/project`;
    expect((await call('owner', path, 'POST', { project_id: 'missing', finding: 'x' })).status).toBe(404);
    const sent = await call('owner', path, 'POST', { project_id: 'p1', finding: 'Sleep improved with the intervention.' });
    expect(sent.status).toBe(201);
    const finding = fake.read(`projects/p1/evidence/${sent.body.source_id}/findings/${sent.body.finding_id}`);
    expect(finding).toMatchObject({ finding: 'Sleep improved with the intervention.', quote: highlight.quote, page: 2, status: 'needs_review', created_by: 'owner', interpretation: false });
    expect(fake.read(`projects/p1/evidence/${sent.body.source_id}`)).toMatchObject({ library_document_id: DOC, basis: 'full_text', title: 'Sleep trial' });
    const again = await call('owner', path, 'POST', { project_id: 'p1', finding: 'Second reading', interpretation: true });
    expect(again.body.source_id).toBe(sent.body.source_id);
    const listed = (await call('owner', base)).body.highlights.find((item: any) => item.id === highlight.id);
    expect(listed.project_links).toEqual([
      { project_id: 'p1', source_id: sent.body.source_id, finding_id: sent.body.finding_id, project_name: 'Sleep project', status: 'needs_review' },
      expect.objectContaining({ finding_id: again.body.finding_id }),
    ]);
    const unmatched = (await create({ quote: 'Something the PDF never says' })).body;
    expect((await call('owner', `${base}/${unmatched.id}/project`, 'POST', { project_id: 'p1', finding: 'x' })).status).toBe(422);
  });
  it('requires an editing role on the project', async () => {
    fake.put(`library_documents/${OTHER}`, { ...fake.read(`library_documents/${DOC}`), user_id: 'viewer' });
    fake.put(`library_documents/${OTHER}/chunks/1`, { chunk_index: 1, page: 2, content: pageText });
    const highlight = (await call('viewer', `/api/library/documents/${OTHER}/highlights`, 'POST', { page: 2, quote: 'improved sleep quality', rects })).body;
    expect((await call('viewer', `/api/library/documents/${OTHER}/highlights/${highlight.id}/project`, 'POST', { project_id: 'p1', finding: 'x' })).status).toBe(403);
  });
  it('fills a matrix cell with the note and the quote as evidence, adding the paper when needed', async () => {
    const now = new Date();
    fake.put('review_matrices/m1', { user_id: 'owner', title: 'Sleep matrix', columns: [{ id: 'findings', label: 'Key findings', prompt: 'Findings' }], document_ids: [], document_owners: {}, project_id: null, created_at: now, updated_at: now });
    const highlight = (await create({ note: 'Sleep improved' })).body;
    const path = `${base}/${highlight.id}/matrix`;
    expect((await call('owner', path, 'POST', { matrix_id: 'm1', column_id: 'nope' })).status).toBe(404);
    expect((await call('stranger', path, 'POST', { matrix_id: 'm1', column_id: 'findings' })).status).toBe(404);
    const sent = await call('owner', path, 'POST', { matrix_id: 'm1', column_id: 'findings' });
    expect(sent.status).toBe(200);
    expect(fake.read('review_matrices/m1')!.document_ids).toEqual([DOC]);
    expect(fake.read(`review_matrices/m1/rows/${DOC}`)!.cells.findings).toMatchObject({ value: 'Sleep improved', quote: highlight.quote, page: 2, basis: 'full_text', edited: true, status: 'done' });
    const plain = (await create({ quote: 'reported improved sleep quality' })).body;
    await call('owner', `${base}/${plain.id}/matrix`, 'POST', { matrix_id: 'm1', column_id: 'findings' });
    await call('owner', `${base}/${plain.id}/matrix`, 'POST', { matrix_id: 'm1', column_id: 'findings' });
    expect(fake.read(`review_matrices/m1/rows/${DOC}`)!.cells.findings.value).toBe('reported improved sleep quality');
    expect(fake.read('review_matrices/m1')!.document_ids).toEqual([DOC]);
    expect(fake.read(`library_documents/${DOC}/highlights/${plain.id}`)!.matrix_links).toEqual([{ matrix_id: 'm1', column_id: 'findings' }]);
  });
  it('respects the matrix paper limit', async () => {
    const now = new Date();
    const full = Array.from({ length: MAX_PAPERS }, (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`);
    fake.put('review_matrices/m1', { user_id: 'owner', title: 'Full', columns: [{ id: 'aim', label: 'Aim', prompt: 'Aim' }], document_ids: full, document_owners: {}, project_id: null, created_at: now, updated_at: now });
    const highlight = (await create()).body;
    expect((await call('owner', `${base}/${highlight.id}/matrix`, 'POST', { matrix_id: 'm1', column_id: 'aim' })).status).toBe(422);
  });
});
