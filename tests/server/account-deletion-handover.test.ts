import { beforeEach, describe, expect, it, vi } from 'vitest';
const fake = await vi.hoisted(async () => (await import('./fakeFirestore.js')).createFakeFirestore());
vi.mock('../../lib/server/firebase.js', async (original) => ({
  ...(await original<typeof import('../../lib/server/firebase.js')>()), ...fake.module,
  deleteDeep: async (ref: { path: string }) => {
    for (const path of fake.store.keys()) if (path === ref.path || path.startsWith(`${ref.path}/`)) fake.store.delete(path);
  },
}));
import { handOverOrDelete } from '../../lib/server/lib/accountDeletion.js';

describe('account deletion and shared project work', () => {
  beforeEach(() => {
    fake.clear();
    fake.put('projects/shared', { owner_user_id: 'lead', members: [{ user_id: 'student', role: 'edit' }] });
    fake.put('projects/mine', { owner_user_id: 'student', members: [] });
  });

  it('hands workbooks in someone else’s project to its owner and deletes personal ones', async () => {
    fake.put('workflows/team-codebook', { owner_user_id: 'student', project_id: 'shared', revision: 4, title: 'Coded interviews' });
    fake.put('workflows/team-codebook/events/e1', { action: 'created', revision: 1 });
    fake.put('workflows/private', { owner_user_id: 'student', project_id: null, revision: 1 });
    fake.put('workflows/private/events/e1', { action: 'created', revision: 1 });
    fake.put('workflows/gone-project', { owner_user_id: 'student', project_id: 'deleted-project', revision: 1 });
    fake.put('workflows/own-project', { owner_user_id: 'student', project_id: 'mine', revision: 1 });
    await handOverOrDelete('workflows', 'student');
    expect(fake.read('workflows/team-codebook')).toMatchObject({ owner_user_id: 'lead', revision: 5, title: 'Coded interviews' });
    const events = [...fake.store.keys()].filter((key) => key.startsWith('workflows/team-codebook/events/'));
    expect(events.map((key) => fake.read(key)!.action)).toEqual(expect.arrayContaining(['created', 'owner_reassigned']));
    for (const id of ['private', 'gone-project', 'own-project']) expect(fake.read(`workflows/${id}`)).toBeUndefined();
    expect(fake.read('workflows/private/events/e1')).toBeUndefined();
  });

  it('pauses a handed-over monitor so it never runs unattended for the new owner', async () => {
    fake.put('research_monitors/watch', { owner_user_id: 'student', project_id: 'shared', enabled: true, revision: 2, next_run_at: '2026-11-13T00:00:00.000Z' });
    fake.put('research_monitors/personal', { owner_user_id: 'student', project_id: null, enabled: true, revision: 1 });
    await handOverOrDelete('research_monitors', 'student');
    expect(fake.read('research_monitors/watch')).toMatchObject({ owner_user_id: 'lead', enabled: false, revision: 3, next_run_at: '9999-01-01T00:00:00.000Z' });
    expect(fake.read('research_monitors/personal')).toBeUndefined();
  });
});
