import { beforeEach, describe, expect, it, vi } from 'vitest';
const fake = await vi.hoisted(async () => (await import('./fakeFirestore.js')).createFakeFirestore());
const project = vi.hoisted(() => ({ roles: new Map<string, string>() }));
const review = vi.hoisted(() => ({ state: null as unknown }));
vi.mock('../../lib/server/firebase.js', async (original) => ({ ...(await original<typeof import('../../lib/server/firebase.js')>()), ...fake.module }));
vi.mock('../../lib/server/lib/projects.js', async () => {
  const { HTTPException } = await import('hono/http-exception');
  return {
    getProjectFor: async (user: { id: string }, id: string, need = ['owner', 'edit', 'comment', 'view']) => {
      const role = project.roles.get(`${id}:${user.id}`);
      if (!role) throw new HTTPException(404, { message: 'Project not found' });
      if (!need.includes(role)) throw new HTTPException(403, { message: 'Permission denied' });
      return { id, role };
    },
    listProjects: async (user: { id: string }) =>
      [...project.roles].filter(([key]) => key.endsWith(`:${user.id}`)).map(([key, role]) => ({ id: key.split(':')[0], role })),
  };
});
vi.mock('../../lib/server/lib/systematicReview.js', () => ({
  reviewState: async () => { if (!review.state) throw new Error('Review not found'); return review.state; },
}));

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppVariables, AuthUser } from '../../lib/server/auth.js';
import { workflowRoutes } from '../../lib/server/routes/workflows.js';
import { forgetPlans } from '../../lib/server/lib/plans.js';
import { redactText, WORKBOOK_FEATURES, workbookDocumentBlocks, type Workbook, type WorkbookEntry } from '../../lib/workflows.js';

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const USER: AuthUser = { id: 'writer', email: 'writer@example.test', full_name: 'Writer', account_id: 'account', is_admin: false };
const make = (id = 'writer') => {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use('*', async (c, next) => { c.set('user', { ...USER, id }); await next(); });
  app.route('/api/workbooks', workflowRoutes());
  app.onError((error, c) => (error instanceof HTTPException ? c.json({ detail: error.message }, error.status) : c.json({ detail: error.message }, 500)));
  return app;
};
type App = ReturnType<typeof make>;
const request = (app: App, path: string, method = 'GET', data?: unknown) =>
  app.request(`/api/workbooks${path}`, { method, headers: { 'content-type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data) });
const json = async (response: Response | Promise<Response>) => (await (await response).json()) as Json;

async function create(app: App, kind = 'research', projectId: string | null = null): Promise<Json> {
  if (projectId && !fake.read(`projects/${projectId}`)) {
    const members = [...project.roles].filter(([key]) => key.startsWith(`${projectId}:`))
      .map(([key, role]) => ({ user_id: key.slice(projectId.length + 1), role }));
    const owner = members.find((member) => member.role === 'owner')?.user_id || 'project-owner';
    fake.put(`projects/${projectId}`, { owner_user_id: owner, members: members.filter((member) => member.role !== 'owner') });
  }
  const response = await request(app, '', 'POST', { kind, title: 'Review work', project_id: projectId });
  expect(response.status).toBe(201);
  return json(response);
}
const addSource = (app: App, w: Json, values: Record<string, string>) =>
  json(request(app, `/${w.id}/entries`, 'POST', { revision: w.revision, section: 'sources', values: { kind: 'scholarly', consent: 'public', ...values } }));
const entry = (id: string, section: string, values: Record<string, string>): WorkbookEntry =>
  ({ id, section, values, created_at: '', updated_at: '', updated_by: 'writer' });

describe('workbook scope, storage and connections', () => {
  beforeEach(() => {
    fake.clear(); project.roles.clear(); forgetPlans(); review.state = null;
    WORKBOOK_FEATURES.expansionWorkbooks = false;
  });

  it('offers only research and qualitative workbooks unless the expansion flag is set', async () => {
    const app = make();
    expect((await request(app, '', 'POST', { kind: 'finance', title: 'Memo' })).status).toBe(422);
    expect((await json(request(app, ''))).available_kinds).toEqual(['research', 'qualitative']);
    await create(app, 'qualitative');
    WORKBOOK_FEATURES.expansionWorkbooks = true;
    await create(app, 'finance');
  });

  it('stores source text outside the workbook document, so long sources do not fill it', async () => {
    const app = make(); let w = await create(app);
    const long = 'Evidence sentence. '.repeat(7800); // about 148k characters each
    for (let i = 0; i < 6; i += 1) w = await addSource(app, w, { title: `Book ${i}`, text: long });
    expect(w.entries).toHaveLength(6);
    expect(w.entries[0].values.text).toBe(long);
    const stored = fake.read(`workflows/${w.id}`)!;
    expect(stored.entries.every((item: Json) => item.values.text === '')).toBe(true);
    const first = w.entries[0].id;
    expect(fake.read(`workflows/${w.id}/source_texts/${first}`)?.text).toBe(long);
    w = await json(request(app, `/${w.id}/entries/${first}`, 'DELETE', { revision: w.revision }));
    expect(w.entries).toHaveLength(5);
    expect(fake.read(`workflows/${w.id}/source_texts/${first}`)).toBeUndefined();
  });

  it('accepts a quotation that crosses an imported page break, and still rejects invented ones', async () => {
    const app = make(); let w = await create(app);
    w = await addSource(app, w, { title: 'Trial', text: '[Page 3]\nThe intervention reduced\n\n[Page 4]\nadmissions by a third.' });
    const finding = (quote: string, revision: number) => request(app, `/${w.id}/entries`, 'POST', {
      revision, section: 'findings', values: { claim: 'Fewer admissions', source_id: w.entries[0].id, quote },
    });
    const crossing = await finding('The intervention reduced admissions by a third.', w.revision);
    expect(crossing.status).toBe(200);
    expect((await finding('The intervention halved admissions.', (await crossing.json() as Json).revision)).status).toBe(422);
  });

  it('redacts every letter case of a term', async () => {
    const app = make(); let w = await create(app, 'qualitative');
    w = await addSource(app, w, { title: 'P01', kind: 'transcript', consent: 'approved private use', text: 'Alice said ALICE and alice agreed.' });
    w = await json(request(app, `/${w.id}/redact`, 'POST', { revision: w.revision, terms: ['alice'] }));
    expect(w.entries[0].values.text).toBe('[REDACTED] said [REDACTED] and [REDACTED] agreed.');
    expect(redactText('Bob and bob', ['BOB'])).toEqual({ text: '[REDACTED] and [REDACTED]', count: 2 });
  });

  it('records the consent chosen at import and describes a private workbook as private', async () => {
    const app = make(); const w = await create(app);
    fake.put('library_documents/doc1', { user_id: 'writer', title: 'Paper', filename: 'paper.pdf', abstract: 'An abstract.', updated_at: new Date(), metadata: {} });
    expect((await request(app, `/${w.id}/import`, 'POST', { revision: w.revision, document_id: 'doc1' })).status).toBe(422);
    const imported = await json(request(app, `/${w.id}/import`, 'POST', { revision: w.revision, document_id: 'doc1', consent: 'public' }));
    const source = imported.entries[0].values;
    expect(source).toMatchObject({ consent: 'public', library_id: 'doc1' });
    expect(source.access_note).toContain('private workbook');
    expect(source.access_note).not.toContain('collaborator');
  });

  it('imports studies included at full text from a systematic review once, labelling abstract-only sources', async () => {
    const app = make(); const w = await create(app);
    review.state = { review: { title: 'Exercise review' }, records: [
      { id: 'r1', title: 'Included A', abstract: 'Abstract A.', doi: '10.1/a', year: 2024, full_state: { status: 'final', decision: 'include' } },
      { id: 'r2', title: 'Excluded B', abstract: 'Abstract B.', full_state: { status: 'final', decision: 'exclude' } },
      { id: 'r3', title: 'Pending C', abstract: 'Abstract C.', full_state: { status: 'pending', decision: null } },
    ] };
    const result = await json(request(app, `/${w.id}/import-review`, 'POST', { revision: w.revision, review_id: 'rev1', consent: 'public' }));
    expect(result).toMatchObject({ imported: 1, abstract_only: 1 });
    expect(result.entries[0].values).toMatchObject({ title: 'Included A', origin: 'review:rev1:r1', reference: 'https://doi.org/10.1/a' });
    expect(result.entries[0].values.access_note).toContain('Abstract only');
    expect(result.links).toEqual([expect.objectContaining({ kind: 'review', id: 'rev1', title: 'Exercise review' })]);
    const again = await request(app, `/${w.id}/import-review`, 'POST', { revision: result.revision, review_id: 'rev1', consent: 'public' });
    expect(again.status).toBe(422);
  });

  it('records linked work without resetting an approval, and only editors can add links', async () => {
    project.roles.set('p:writer', 'owner'); project.roles.set('p:reviewer', 'comment');
    const app = make(); let w = await create(app, 'research', 'p');
    w = await json(request(app, `/${w.id}/review`, 'POST', { revision: w.revision, status: 'in_review', note: '' }));
    w = await json(request(make('reviewer'), `/${w.id}/review`, 'POST', { revision: w.revision, status: 'approved', note: 'Fine' }));
    w = await json(request(app, `/${w.id}/links`, 'POST', { revision: w.revision, kind: 'document', id: 'doc9', title: 'Draft review' }));
    expect(w.status).toBe('approved');
    expect(w.links).toEqual([expect.objectContaining({ kind: 'document', id: 'doc9', title: 'Draft review', by: 'writer' })]);
    const denied = await request(make('reviewer'), `/${w.id}/links`, 'POST', { revision: w.revision, kind: 'matrix', id: 'm1', title: 'X' });
    expect(denied.status).toBe(403);
  });

  it('drafts a literature review with an evidence table, and a findings report that separates negative cases', () => {
    const base: Omit<Workbook, 'kind' | 'entries'> = {
      id: 'w', owner_user_id: 'u', project_id: null, title: 'Review', question: 'Q?', language: '', deadline: '', revision: 3, status: 'draft',
      review_note: '', reviewed_by: null, reviewed_at: null, recalls: [], created_at: '', updated_at: '',
    };
    const research = workbookDocumentBlocks({ ...base, kind: 'research', entries: [
      entry('s1', 'sources', { title: 'Smith 2024', text: 'Walking lowered blood pressure.', reference: 'https://doi.org/10.1/x' }),
      entry('f1', 'findings', { claim: 'Walking helps', source_id: 's1', quote: 'Walking lowered blood pressure.', locator: 'p. 4' }),
    ] });
    expect(JSON.stringify(research.find((block) => block.type === 'table'))).toContain('Walking lowered blood pressure.');
    expect(JSON.stringify(research)).toContain('not been approved');
    const report = JSON.stringify(workbookDocumentBlocks({ ...base, kind: 'qualitative', entries: [
      entry('s1', 'sources', { title: 'P01', text: 'I felt alone. Others helped me.' }),
      entry('e1', 'excerpts', { source_id: 's1', quote: 'Others helped me.', codes: 'support', negative_case: 'supports' }),
      entry('e2', 'excerpts', { source_id: 's1', quote: 'I felt alone.', codes: 'Support', negative_case: 'negative case' }),
      entry('t1', 'themes', { name: 'Support matters', meaning: 'Help changes experience', codes: 'support', status: 'reviewed' }),
    ] }));
    expect(report.indexOf('Supporting excerpts')).toBeLessThan(report.indexOf('Others helped me.'));
    expect(report.indexOf('Negative and mixed cases')).toBeLessThan(report.indexOf('I felt alone.'));
  });
});
