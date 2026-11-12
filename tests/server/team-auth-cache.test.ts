import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
type Stored = { user: Record<string, unknown>; deletionPending: boolean } | null;
const state = vi.hoisted(() => ({
  stored: null as Stored,
  reads: 0,
  verify: vi.fn(async () => ({ uid: 'team-user', email: 'person@example.test', exp: Math.floor(Date.now() / 1000) + 3600 })),
}));
vi.mock('../../lib/server/firebase.js', () => ({ adminAuth: () => ({ verifyIdToken: state.verify }) }));
vi.mock('../../lib/server/lib/users.js', () => ({
  accountState: async () => { state.reads += 1; return state.stored; },
  ensureUser: async () => null,
}));
import { forgetUser, userFromToken } from '../../lib/server/auth.js';

const base = { id: 'team-user', email: 'person@example.test', full_name: 'Person', account_id: 'personal', is_admin: false };
const store = (patch: Partial<typeof base> = {}, deletionPending = false) => { state.stored = { user: { ...base, ...patch }, deletionPending }; };

describe('cached sign-in', () => {
  beforeEach(() => { vi.useFakeTimers(); store(); state.reads = 0; state.verify.mockClear(); forgetUser('team-user'); });
  afterEach(() => { vi.useRealTimers(); });

  it('shares one user read across a burst and refreshes membership after the freshness window', async () => {
    for (let i = 0; i < 5; i++) expect((await userFromToken('burst-token'))?.account_id).toBe('personal');
    expect(state.reads).toBe(1);
    store({ account_id: 'team' });
    expect((await userFromToken('burst-token'))?.account_id).toBe('personal');
    vi.advanceTimersByTime(10_001);
    expect((await userFromToken('burst-token'))?.account_id).toBe('team');
    expect(state.reads).toBe(2);
    expect(state.verify).toHaveBeenCalledOnce();
  });

  it('applies a membership change at once on this instance through forgetUser', async () => {
    await userFromToken('forget-token');
    store({ account_id: 'team' });
    forgetUser('team-user');
    expect((await userFromToken('forget-token'))?.account_id).toBe('team');
  });

  it('signs out a disabled or removed user once the cached record is re-read', async () => {
    await userFromToken('disabled-token');
    state.stored = null;
    vi.advanceTimersByTime(10_001);
    expect(await userFromToken('disabled-token')).toBeNull();
  });

  it('refuses an account whose deletion has started, except for retrying the deletion', async () => {
    store({}, true);
    expect(await userFromToken('pending-token')).toBeNull();
    expect((await userFromToken('pending-token', { allowDeletionPending: true }))?.id).toBe('team-user');
    expect(await userFromToken('pending-token')).toBeNull();
    // An already-cached sign-in is refused as soon as the pending flag is re-read.
    store();
    await userFromToken('active-token');
    store({}, true);
    vi.advanceTimersByTime(10_001);
    expect(await userFromToken('active-token')).toBeNull();
  });
});
