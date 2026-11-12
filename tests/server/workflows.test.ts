import { beforeEach, describe, expect, it, vi } from 'vitest';
const fake = await vi.hoisted(async () => (await import('./fakeFirestore.js')).createFakeFirestore());
const project = vi.hoisted(() => ({ roles: new Map<string, string>() }));
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
    listProjects: async (user: { id: string }) => [...project.roles].filter(([key]) => key.endsWith(`:${user.id}`)).map(([key, role]) => ({ id: key.split(':')[0], role })),
  };
});

// These tests cover every workbook type, including those behind the expansion flag.
WORKBOOK_FEATURES.expansionWorkbooks = true;

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppVariables, AuthUser } from '../../lib/server/auth.js';
import type { Slots } from '../../lib/server/slots/types.js';
import { workflowRoutes } from '../../lib/server/routes/workflows.js';
import { fakeLlm, fakePapers } from './assist-helpers.js';
import { forgetPlans } from '../../lib/server/lib/plans.js';
import { csvCell, exportWorkbookCsv, exportWorkbookMarkdown, indicatorProgress, metricGroups, scheduleRecall, validateEntry, WORKBOOK_FEATURES, workbookReminders, type WorkbookEntry } from '../../lib/workflows.js';

const USER: AuthUser = { id: 'writer', email: 'writer@example.test', full_name: 'Writer', account_id: 'account', is_admin: false };
const make = (id = 'writer', slots?: Slots) => {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use('*', async (c, next) => { c.set('user', { ...USER, id }); await next(); });
  app.route('/api/workbooks', workflowRoutes(slots));
  app.onError((error, c) => error instanceof HTTPException ? c.json({ detail: error.message }, error.status) : c.json({ detail: error.message }, 500));
  return app;
};
const request = (app: ReturnType<typeof make>, path: string, method = 'GET', data?: unknown) => app.request(`/api/workbooks${path}`, { method, headers: { 'content-type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data) });
const create = async (app: ReturnType<typeof make>, kind = 'qualitative', project_id: string | null = null) => {
  if (project_id && !fake.read(`projects/${project_id}`)) {
    const members = [...project.roles].filter(([key]) => key.startsWith(`${project_id}:`)).map(([key, role]) => ({ user_id: key.slice(project_id.length + 1), role }));
    fake.put(`projects/${project_id}`, { owner_user_id: members.find((member) => member.role === 'owner')?.user_id || 'project-owner', members: members.filter((member) => member.role !== 'owner') });
  }
  const response = await request(app, '', 'POST', { kind, title: 'Research work', language: '日本語', project_id });
  expect(response.status).toBe(201);
  return response.json() as Promise<any>;
};
const entry = (id: string, section: string, values: Record<string, string>): WorkbookEntry => ({ id, section, values, created_at: '', updated_at: '', updated_by: 'writer' });

describe('work requirement validation', () => {
  it('shows in-app deadline and milestone reminders using the viewer’s date, excluding completed work and distant dates', () => {
    const workbook = { id: 'w', title: 'Appraisal', deadline: '2026-11-12', status: 'draft' as const, milestones: [{ id: 'a', title: 'Read methods', due: '2026-11-11', status: 'in progress' }, { id: 'b', title: 'Discuss', due: '2026-11-19', status: 'planned' }, { id: 'c', title: 'Finished', due: '2026-11-01', status: 'completed' }, { id: 'd', title: 'Later', due: '2026-11-20', status: 'planned' }] };
    const reminders = workbookReminders(workbook, '2026-11-12');
    expect(reminders.map((item) => [item.id, item.urgency])).toEqual([['w:a', 'overdue'], ['w:deadline', 'today'], ['w:b', 'soon']]);
    expect(reminders[0].section).toBe('milestones');
    expect(workbookReminders({ ...workbook, status: 'approved', milestones: [] }, '2026-11-12')).toEqual([]);
  });
  const source = entry('s1', 'sources', { title: 'Interview', text: 'I could not travel because the bus was cancelled.' });
  it('requires exact supporting passages and preserves non-English text', () => {
    expect(validateEntry('qualitative', 'excerpts', { source_id: 's1', quote: 'the bus was cancelled', negative_case: 'negative case', interpretation: '交通の不確実性' }, [source]).interpretation).toBe('交通の不確実性');
    expect(() => validateEntry('qualitative', 'excerpts', { source_id: 's1', quote: 'the bus arrived', negative_case: 'supports' }, [source])).toThrow('exact passage');
    expect(() => validateEntry('qualitative', 'excerpts', { source_id: 'private-other', quote: 'the bus', negative_case: 'supports' }, [source])).toThrow('Choose a source');
  });
  it('rejects fabricated metrics, invalid dates and incompatible sections', () => {
    const metric = { company: 'A', metric: 'Revenue', definition: 'Consolidated', value: 'NaN', unit: 'millions', currency: 'USD', period: 'FY2025', filed_at: '2026-02-30', basis: 'as reported', source_id: 's1', quote: 'the bus', locator: 'p.1' };
    expect(() => validateEntry('finance', 'metrics', metric, [source])).toThrow('finite number');
    expect(() => validateEntry('finance', 'metrics', { ...metric, value: '100' }, [source])).toThrow('valid date');
    expect(() => validateEntry('study', 'metrics', metric, [source])).toThrow('does not belong');
  });
  it('protects existing source anchors during source edits', () => {
    const excerpt = entry('e1', 'excerpts', { source_id: 's1', quote: 'the bus was cancelled' });
    expect(() => validateEntry('qualitative', 'sources', { title: 'Interview', kind: 'transcript', consent: 'approved private use', text: 'Completely different text' }, [source, excerpt], 's1')).toThrow('detach a saved quotation');
  });
  it('separates metrics with different periods, units, currencies and restatements', () => {
    const base = { company: 'A', metric: 'Revenue', definition: 'IFRS consolidated', unit: 'millions', currency: 'USD', period: 'FY2025', basis: 'as reported', value: '10' };
    const items = [entry('1', 'metrics', base), entry('2', 'metrics', { ...base, company: 'B' }), entry('3', 'metrics', { ...base, currency: 'EUR' }), entry('4', 'metrics', { ...base, basis: 'restated' }), entry('5', 'metrics', { ...base, period: 'FY2024' })];
    expect(metricGroups(items).map((g) => g.entries.length)).toEqual([2, 1, 1, 1]);
  });
  it('rejects a financial value that is absent from its exact supporting passage', () => {
    const paper = entry('f1', 'sources', { text: 'Revenue was 1,250 million. Losses were (200) million.' });
    const values = { company: 'A', metric: 'Revenue', definition: 'Consolidated', value: '1250', unit: 'millions', currency: 'USD', period: 'FY2025', filed_at: '2026-02-28', basis: 'as reported', source_id: 'f1', quote: 'Revenue was 1,250 million.', locator: 'p.1' };
    expect(validateEntry('finance', 'metrics', values, [paper]).value).toBe('1250');
    expect(() => validateEntry('finance', 'metrics', { ...values, value: '2500' }, [paper])).toThrow('must appear');
    expect(validateEntry('finance', 'metrics', { ...values, value: '-200', quote: 'Losses were (200) million.' }, [paper]).value).toBe('-200');
  });
  it('does not silently convert ambiguous separators or collapse case-sensitive units', () => {
    const values = { company: 'A', metric: 'Revenue', definition: 'Consolidated', value: '123', unit: 'millions', currency: 'USD', period: 'FY2025', filed_at: '2026-02-28', basis: 'as reported', source_id: 'f1', quote: 'Revenue was 1,23 million.', locator: 'p.1' };
    for (const quote of ['Revenue was 1,23 million.', 'Revenue was 1,2,3 million.', 'Revenue was 1.23.4 million.']) {
      const paper = entry('f1', 'sources', { text: quote });
      expect(() => validateEntry('finance', 'metrics', { ...values, quote }, [paper])).toThrow('must appear');
    }
    const quote = 'Output was 1e3.';
    const paper = entry('f1', 'sources', { text: quote });
    expect(() => validateEntry('finance', 'metrics', { ...values, value: '1', quote }, [paper])).toThrow('must appear');
    expect(metricGroups([entry('a', 'metrics', { ...values, unit: 'mW' }), entry('b', 'metrics', { ...values, unit: 'MW' })])).toHaveLength(2);
  });
  it('handles both increasing and decreasing indicator targets, missing data and zero denominator', () => {
    expect(indicatorProgress({ baseline: '100', target: '60', actual: '80' })).toBe(50);
    expect(indicatorProgress({ baseline: '0', target: '100', actual: '25' })).toBe(25);
    expect(indicatorProgress({ baseline: '0', target: '0', actual: '25' })).toBeNull();
    expect(indicatorProgress({ baseline: '', target: '100', actual: '25' })).toBeNull();
    expect(indicatorProgress({ baseline: '-1e308', target: '1e308', actual: '0' })).toBeNull();
    expect(indicatorProgress({ baseline: '0', target: '1e-308', actual: '1e308' })).toBeNull();
  });
  it('schedules failed recall soon, extending successful recall without claiming mastery', () => {
    const now = new Date('2026-11-12T12:00:00Z');
    const initial = scheduleRecall(undefined, { user_id: 'u', card_id: 'c', rating: 'good', response: 'answer' }, now);
    expect(initial.due_at).toBe('2026-11-13T12:00:00.000Z');
    const next = scheduleRecall(initial, { user_id: 'u', card_id: 'c', rating: 'easy', response: '' }, now);
    expect(next.interval_days).toBe(4);
    expect(scheduleRecall(next, { user_id: 'u', card_id: 'c', rating: 'again', response: '' }, now).due_at).toBe('2026-11-12T12:10:00.000Z');
  });
  it('neutralises spreadsheet formulas while retaining ordinary negative numbers', () => {
    expect(csvCell('=HYPERLINK("bad")')).toBe('"\'=HYPERLINK(""bad"")"');
    expect(csvCell('-10')).toBe('"-10"');
    expect(csvCell('\t@SUM(1)')).toContain("'");
  });
});

describe('persistent workbooks and permissions', () => {
  beforeEach(() => { fake.clear(); project.roles.clear(); forgetPlans(); });
  it.each(['removed', 'downgraded', 'project_deleted', 'detached'] as const)('rechecks current authorization inside the transaction when access is %s after the initial lookup', async (change) => {
    project.roles.set('p:creator', 'owner'); project.roles.set('p:writer', 'edit');
    const w = await create(make('creator'), 'research', 'p');
    const original = fake.module.db().runTransaction;
    const interleave: typeof original = async (run) => {
      // The outer getProjectFor still returns the role that authorized this request.
      // Concurrent writes change only the state the transaction must read afresh.
      if (change === 'removed') fake.put('projects/p', { ...fake.read('projects/p'), members: [] });
      if (change === 'downgraded') fake.put('projects/p', { ...fake.read('projects/p'), members: [{ user_id: 'writer', role: 'view' }] });
      if (change === 'project_deleted') fake.store.delete('projects/p');
      if (change === 'detached') fake.put(`workflows/${w.id}`, { ...fake.read(`workflows/${w.id}`), project_id: null });
      return original(run);
    };
    const spy = vi.spyOn(fake.module.db(), 'runTransaction').mockImplementationOnce(interleave);
    try {
      const response = await request(make(), `/${w.id}/entries`, 'POST', { revision: w.revision, section: 'memos', values: { title: 'Late write', text: 'Must not be committed' } });
      expect(response.status).toBe(change === 'downgraded' ? 403 : 404);
      expect(fake.read(`workflows/${w.id}`)?.entries).toHaveLength(0);
      expect(fake.read(`workflows/${w.id}`)?.revision).toBe(1);
      expect([...fake.store.keys()].filter((key) => key.startsWith(`workflows/${w.id}/events/`))).toHaveLength(1);
    } finally { spy.mockRestore(); }
  });
  it('retains reviewer rationale after edits and explicitly redacts historical text without changing decision metadata', async () => {
    const app = make(); let w = await create(app, 'research');
    w = await (await request(app, `/${w.id}/review`, 'POST', { revision: w.revision, status: 'in_review', note: 'Check Alice’s sample description.' })).json();
    w = await (await request(app, `/${w.id}/review`, 'POST', { revision: w.revision, status: 'approved', note: 'Alice’s evidence supports the finding; sample limitations remain.' })).json();
    const before = await (await request(app, `/${w.id}/export`)).json() as any;
    const approved = before.events.find((event: any) => event.action === 'approved'); expect(approved.review_note).toContain('sample limitations');
    w = await (await request(app, `/${w.id}`, 'PATCH', { revision: w.revision, title: 'Revised work', question: 'Next question' })).json();
    expect(w.review_note).toBe(''); expect(w.status).toBe('draft');
    const edited = await (await request(app, `/${w.id}/export`)).json() as any; expect(edited.events.find((event: any) => event.id === approved.id).review_note).toBe(approved.review_note);
    w = await (await request(app, `/${w.id}/redact`, 'POST', { revision: w.revision, terms: ['Alice'] })).json();
    const after = await (await request(app, `/${w.id}/export`)).json() as any; const redacted = after.events.find((event: any) => event.id === approved.id);
    expect(redacted).toMatchObject({ action: 'approved', revision: approved.revision, at: approved.at, user_id: approved.user_id, redacted_by: 'writer' });
    expect(redacted.review_note).toBe('[REDACTED]’s evidence supports the finding; sample limitations remain.'); expect(JSON.stringify(after)).not.toContain('Alice');
  });
  it('rejects oversized JSON before parsing or persisting imported entries', async () => {
    const app = make(); const workbook = await create(app, 'policy');
    const response = await request(app, `/${workbook.id}/import-entries`, 'POST', { revision: 1, section: 'indicators', rows: [{ name: 'x'.repeat(1_000_000) }] });
    expect(response.status).toBe(413);
    expect(fake.read(`workflows/${workbook.id}`)?.entries).toHaveLength(0);
  });
  it('imports policy rows atomically with revision and permission checks', async () => {
    const app = make(); let workbook = await create(app, 'policy');
    const values = { name: 'Service coverage', definition: 'People reached', unit: 'people', period: '2026', baseline: '10', target: '100', actual: '25' };
    const path = `/${workbook.id}/import-entries`;
    const invalid = await request(app, path, 'POST', { revision: 1, section: 'indicators', rows: [values, { ...values, actual: 'not numeric' }] });
    expect(invalid.status).toBe(422); expect((await invalid.json() as any).detail).toContain('Row 2');
    expect(fake.read(`workflows/${workbook.id}`)?.entries).toHaveLength(0);
    workbook = await (await request(app, path, 'POST', { revision: 1, section: 'indicators', rows: [values, { ...values, period: '2027' }] })).json();
    expect(workbook.entries).toHaveLength(2); expect(workbook.revision).toBe(2);
    expect((await request(app, path, 'POST', { revision: 1, section: 'indicators', rows: [values] })).status).toBe(409);
    expect((await request(make('other'), path, 'POST', { revision: 2, section: 'indicators', rows: [values] })).status).toBe(404);
    expect((await request(app, path, 'POST', { revision: 2, section: 'indicators', rows: Array(251).fill(values) })).status).toBe(422);
    expect(fake.read(`workflows/${workbook.id}`)?.entries).toHaveLength(2);
  });
  it('persists a deliverable brief through editing, exports it, and supports explicit appraisal and milestones', async () => {
    const app = make();
    const response = await request(app, '', 'POST', { kind: 'research', title: 'Journal club', question: 'How strong is this study?', audience: 'Students and supervisor', success_criteria: 'Discuss selection bias and applicability', source_constraints: 'Original publication and registration', deliverable: 'Critical appraisal', deadline: '2027-02-01' });
    expect(response.status).toBe(201);
    let workbook = await response.json() as any;
    workbook = await (await request(app, `/${workbook.id}`, 'PATCH', { revision: workbook.revision, title: 'Revised appraisal', question: workbook.question, language: 'Norsk', deadline: workbook.deadline })).json();
    expect(workbook.audience).toBe('Students and supervisor');
    expect(exportWorkbookMarkdown(workbook)).toContain('Original publication and registration');
    workbook = await (await request(app, `/${workbook.id}/entries`, 'POST', { revision: workbook.revision, section: 'milestones', values: { title: 'Discuss limitations', due: '2027-01-25', status: 'planned', acceptance: 'Each limitation refers to source methods' } })).json();
    expect(workbook.entries[0].values.status).toBe('planned');
    expect((await request(app, `/${workbook.id}/entries`, 'POST', { revision: workbook.revision, section: 'appraisal', values: { source_id: 'missing', design: 'RCT', bias: 'Missing allocation detail' } })).status).toBe(422);
  });
  it('preserves official-source type and provenance when importing Library evidence', async () => {
    const app = make(); const workbook = await create(app, 'finance');
    fake.put('library_documents/official', { user_id: 'writer', title: 'Company filing', filename: 'filing.txt', abstract: 'Revenue was 10 million.', updated_at: new Date(), publication_date: '2026-01-01', metadata: { official_source: { kind: 'filing_metadata', url: 'https://www.sec.gov/example', fetched_at: '2026-11-12T10:00:00Z', sha256: 'abc123', warnings: ['Metadata record only'] } } });
    const response = await request(app, `/${workbook.id}/import`, 'POST', { revision: workbook.revision, document_id: 'official', consent: 'public' });
    expect(response.status).toBe(200);
    const source = (await response.json() as any).entries[0].values;
    expect(source.kind).toBe('filing'); expect(source.reference).toBe('https://www.sec.gov/example'); expect(source.edition).toContain('SHA-256 abc123'); expect(source.access_note).toContain('Metadata record only');
    expect((await request(make('someone_else'), `/${workbook.id}/import`, 'POST', { revision: 2, document_id: 'official', consent: 'public' })).status).toBe(404);
  });
  it('saves a coding workflow, rejects invented quotes and records immutable decisions', async () => {
    const app = make(); let w = await create(app);
    let response = await request(app, `/${w.id}/entries`, 'POST', { revision: w.revision, section: 'sources', values: { title: 'P01', kind: 'transcript', consent: 'de-identified with permission', text: 'The clinic was closed.' } });
    expect(response.status).toBe(200); w = await response.json();
    const sourceId = w.entries[0].id;
    response = await request(app, `/${w.id}/entries`, 'POST', { revision: w.revision, section: 'excerpts', values: { source_id: sourceId, quote: 'The clinic was open.', negative_case: 'supports' } });
    expect(response.status).toBe(422);
    w = await (await request(app, `/${w.id}/entries`, 'POST', { revision: w.revision, section: 'excerpts', values: { source_id: sourceId, quote: 'The clinic was closed.', negative_case: 'negative case' } })).json();
    const exported = await (await request(app, `/${w.id}/export`)).json();
    expect(exported.events.map((e: any) => e.action)).toEqual(['created', 'added_entry', 'added_entry']);
    expect(exported.workbook.entries).toHaveLength(2);
    expect((await request(make('stranger'), `/${w.id}`)).status).toBe(404);
  });
  it('rejects stale revision writes instead of overwriting another edit', async () => {
    const app = make(); const w = await create(app);
    const input = { revision: 1, section: 'codes', values: { label: 'Access', definition: 'Ability to reach care' } };
    expect((await request(app, `/${w.id}/entries`, 'POST', input)).status).toBe(200);
    expect((await request(app, `/${w.id}/entries`, 'POST', input)).status).toBe(409);
    expect(fake.read(`workflows/${w.id}`)?.entries).toHaveLength(1);
  });
  it('requires editor access to create and edit shared work, reviewers can approve only submitted work', async () => {
    project.roles.set('p:writer', 'edit'); project.roles.set('p:reviewer', 'comment'); project.roles.set('p:viewer', 'view');
    const app = make(); let w = await create(app, 'policy', 'p');
    expect((await request(make('viewer'), `/${w.id}/entries`, 'POST', { revision: 1, section: 'memos', values: { title: 'x', text: 'x' } })).status).toBe(403);
    expect((await request(make('reviewer'), `/${w.id}/review`, 'POST', { revision: 1, status: 'approved', note: 'Ready' })).status).toBe(422);
    w = await (await request(app, `/${w.id}/review`, 'POST', { revision: w.revision, status: 'in_review', note: 'Please check' })).json();
    expect((await request(app, `/${w.id}/review`, 'POST', { revision: w.revision, status: 'approved' })).status).toBe(403);
    w = await (await request(make('reviewer'), `/${w.id}/review`, 'POST', { revision: w.revision, status: 'approved', note: 'Reviewed the evidence' })).json();
    expect(w.status).toBe('approved');
    w = await (await request(app, `/${w.id}/entries`, 'POST', { revision: w.revision, section: 'memos', values: { title: 'New', text: 'Changed conclusion' } })).json();
    expect(w.status).toBe('draft'); expect(w.reviewed_by).toBeNull();
    project.roles.delete('p:writer');
    expect((await request(app, `/${w.id}`)).status).toBe(404);
    expect((await (await request(app, '')).json()).workbooks).toHaveLength(0);
  });
  it('redacts source and excerpt together without logging the original term', async () => {
    const app = make(); let w = await create(app);
    w = await (await request(app, `/${w.id}/entries`, 'POST', { revision: w.revision, section: 'sources', values: { title: 'P01', kind: 'transcript', consent: 'approved private use', text: 'Patient Alice arrived.' } })).json();
    w = await (await request(app, `/${w.id}/entries`, 'POST', { revision: w.revision, section: 'excerpts', values: { source_id: w.entries[0].id, quote: 'Patient Alice arrived.', negative_case: 'supports' } })).json();
    w = await (await request(app, `/${w.id}/redact`, 'POST', { revision: w.revision, terms: ['Alice'] })).json();
    expect(w.entries[0].values.text).toBe('Patient [REDACTED] arrived.');
    expect(w.entries[1].values.quote).toBe(w.entries[0].values.text);
    expect(JSON.stringify(await (await request(app, `/${w.id}/export`)).json())).not.toContain('Alice');
  });
  it('keeps study responses private and invalidates practice state after answer edits', async () => {
    project.roles.set('p:writer', 'owner'); project.roles.set('p:learner', 'view');
    const app = make(); let w = await create(app, 'study', 'p');
    w = await (await request(app, `/${w.id}/entries`, 'POST', { revision: w.revision, section: 'cards', values: { question: 'What is recall?', answer: 'Retrieving learned information.' } })).json();
    const card = w.entries[0];
    let learned = await (await request(make('learner'), `/${w.id}/recall`, 'POST', { revision: w.revision, card_id: card.id, rating: 'hard', response: 'My private answer' })).json();
    expect(learned.recalls).toHaveLength(1);
    expect(learned.revision).toBe(w.revision); // private practice never changes the shared revision
    w = await (await request(app, `/${w.id}`)).json();
    expect(w.recalls).toHaveLength(0); expect(w.events.some((e: any) => e.action === 'recall_reviewed')).toBe(false);
    w = await (await request(app, `/${w.id}/entries`, 'POST', { revision: w.revision, id: card.id, section: 'cards', values: { ...card.values, answer: 'A revised explanation' } })).json();
    learned = await (await request(make('learner'), `/${w.id}`)).json();
    expect(learned.recalls).toHaveLength(0);
  });
  it('rejects redactions and review transitions that would leave unsupported financial values', async () => {
    const app = make(); let w = await create(app, 'finance');
    w = await (await request(app, `/${w.id}/entries`, 'POST', { revision: w.revision, section: 'sources', values: { title: 'Report', kind: 'filing', consent: 'public', text: 'Revenue was 1250 million.' } })).json();
    const values = { company: 'A', metric: 'Revenue', definition: 'Consolidated', value: '1250', unit: 'millions', currency: 'USD', period: 'FY2025', filed_at: '2026-02-28', basis: 'as reported', source_id: w.entries[0].id, quote: 'Revenue was 1250 million.', locator: 'p.1' };
    w = await (await request(app, `/${w.id}/entries`, 'POST', { revision: w.revision, section: 'metrics', values })).json();
    const redacted = await request(app, `/${w.id}/redact`, 'POST', { revision: w.revision, terms: ['1250'] });
    expect(redacted.status).toBe(422);
    expect((await redacted.json()).detail).toContain('nothing was redacted');
    const stored = fake.read(`workflows/${w.id}`)!;
    expect(fake.read(`workflows/${w.id}/source_texts/${stored.entries[0].id}`)?.text).toContain('1250'); expect(stored.revision).toBe(w.revision);
    stored.entries[1].values.value = '999'; fake.put(`workflows/${w.id}`, stored);
    const submitted = await request(app, `/${w.id}/review`, 'POST', { revision: w.revision, status: 'in_review' });
    expect(submitted.status).toBe(422); expect((await submitted.json()).detail).toContain('must appear');
  });
  it('exports financial evidence without silently converting currencies or formulas', async () => {
    const app = make(); const w = await create(app, 'finance');
    const csv = exportWorkbookCsv({ ...w, entries: [entry('s', 'sources', { title: '=SUM(1)', text: 'raw private source', reference: 'filing' })] });
    expect(csv).toContain("'=SUM(1)"); expect(csv).not.toContain('raw private source');
  });
  it('suggests source-grounded practice entries for review without silently saving them', async () => {
    const llm = fakeLlm((messages) => {
      const context = JSON.parse(String(messages[1].content));
      return JSON.stringify({ entries: [{ values: { question: 'What aids retention?', answer: 'Retrieval practice aids retention.', source_id: context.sources[0].id, quote: 'Retrieval practice aids retention.' } }] });
    });
    const app = make('writer', { llm, papers: fakePapers() }); let w = await create(app, 'study');
    w = await (await request(app, `/${w.id}/entries`, 'POST', { revision: w.revision, section: 'sources', values: { title: 'Notes', kind: 'other', consent: 'approved private use', text: 'Retrieval practice aids retention.' } })).json();
    const result = await request(app, `/${w.id}/suggest`, 'POST', { section: 'cards', source_ids: [w.entries[0].id] });
    expect(result.status).toBe(200);
    const data = await result.json(); expect(data.entries).toHaveLength(1); expect(data.credits).toBe(3);
    expect(data.coverage[0]).toMatchObject({ characters_read: 34, partial: false });
    expect(fake.read(`workflows/${w.id}`)?.entries).toHaveLength(1);
  });
  it('refunds unusable AI output and never saves a fabricated quotation', async () => {
    const llm = fakeLlm((messages) => {
      const context = JSON.parse(String(messages[1].content));
      return JSON.stringify({ entries: [{ values: { question: 'Question', answer: 'Answer', source_id: context.sources[0].id, quote: 'A made up quotation.' } }] });
    });
    const app = make('writer', { llm, papers: fakePapers() }); let w = await create(app, 'study');
    w = await (await request(app, `/${w.id}/entries`, 'POST', { revision: w.revision, section: 'sources', values: { title: 'Notes', kind: 'other', consent: 'approved private use', text: 'The actual source.' } })).json();
    const result = await request(app, `/${w.id}/suggest`, 'POST', { section: 'cards', source_ids: [w.entries[0].id] });
    expect(result.status).toBe(422);
    expect((await result.json()).detail).toContain('credits were returned');
    const creditUsage = [...fake.store].filter(([path]) => path.includes('/plan_usage/credits__')).map(([, value]) => value.amount);
    expect(creditUsage.reduce((sum, value) => sum + Number(value), 0)).toBe(0);
    expect(fake.read(`workflows/${w.id}`)?.entries).toHaveLength(1);
  });
});
