import { beforeEach, describe, expect, it, vi } from 'vitest';
const fake = await vi.hoisted(async () => (await import('./fakeFirestore.js')).createFakeFirestore());
const payments = vi.hoisted(() => ({ cards: vi.fn(async () => [{ id: 'card', last4: '1234' }]), invoices: vi.fn(async () => [{ id: 'invoice' }]) }));
vi.mock('../../lib/server/firebase.js', async (original) => ({ ...(await original<typeof import('../../lib/server/firebase.js')>()), ...fake.module }));
vi.mock('../../lib/server/lib/dodoBilling.js', async (original) => ({ ...(await original<typeof import('../../lib/server/lib/dodoBilling.js')>()), dodoClient: () => ({}) }));
vi.mock('../../lib/server/lib/planBilling.js', async (original) => ({ ...(await original<typeof import('../../lib/server/lib/planBilling.js')>()), listCards: payments.cards, listInvoices: payments.invoices }));

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AuthUser, AppVariables } from '../../lib/server/auth.js';
import { teamRoutes } from '../../lib/server/routes/team.js';
import { billingRoutes } from '../../lib/server/routes/billing.js';
import { activateTeam, acceptTeamInvitation, changeTeamRole, inviteTeamMember, managedTeamBilling, prepareTeamAccountDeletion, removeTeamMember, teamSeatCap } from '../../lib/server/lib/team.js';
import * as teamModule from '../../lib/server/lib/team.js';
import { forgetPlans } from '../../lib/server/lib/plans.js';
import { ensureCustomer } from '../../lib/server/lib/planBilling.js';

const person = (id: string, account_id = `personal-${id}`, admin = false): AuthUser => ({ id, account_id, is_admin: admin, email: `${id}@example.test`, full_name: id });
const seed = (id: string, accountId = `personal-${id}`, admin = false) => { const user = person(id, accountId, admin); fake.put(`users/${id}`, { ...user, disabled_at: null, email_verified_at: new Date(), created_at: new Date() }); if (!fake.read(`accounts/${accountId}`)) fake.put(`accounts/${accountId}`, { name: id, plan: 'free', plan_source: 'default', plan_status: 'none' }); return user; };
const root = person('platform', 'personal-platform', true);
const owner = person('owner', 'team');
const make = (user: AuthUser) => {
  const app = new Hono<{ Variables: AppVariables }>(); app.use('*', async (c, next) => { c.set('user', user); await next(); });
  app.route('/api/team', teamRoutes()); app.route('/api/billing', billingRoutes());
  app.onError((error, c) => error instanceof HTTPException ? c.json({ detail: error.message }, error.status) : c.json({ detail: error.message }, 500)); return app;
};
const request = (user: AuthUser, path: string, method = 'GET', body?: unknown) => make(user).request(path, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
const state = () => fake.read('accounts/team')!.team_governance;
const join = async (id: string) => { const guest = seed(id); const invitation = await inviteTeamMember(owner, guest.email); await acceptTeamInvitation(guest, invitation); return guest; };

describe('managed Team seats', () => {
  beforeEach(() => { fake.clear(); forgetPlans(); payments.cards.mockClear(); payments.invoices.mockClear(); seed('platform', 'personal-platform', true); seed('owner', 'team'); fake.put('accounts/team', { name: 'Research group', plan: 'team', plan_source: 'admin', plan_status: 'active', team_seats: 3, dodo_customer_id: 'team-customer' }); });
  it('requires explicit platform governance setup on an already provisioned Team without changing its plan', async () => {
    expect((await request(owner, '/api/team/activate', 'POST', { account_id: 'team', owner_user_id: 'owner' })).status).toBe(403);
    expect((await request(root, '/api/team/activate', 'POST', { account_id: 'personal-platform', owner_user_id: 'platform' })).status).toBe(409);
    await activateTeam(root, 'team', 'owner');
    expect(state().members.owner.role).toBe('owner'); expect(fake.read('accounts/team')?.plan).toBe('team'); expect(fake.read('accounts/team')?.team_seats).toBe(3);
    await expect(activateTeam(root, 'team', 'owner')).rejects.toMatchObject({ status: 409 });
    expect(teamSeatCap({ team_seats: 0 })).toBe(3);
  });
  it('requires recipient acceptance and verified membership, with a transactionally enforced seat cap', async () => {
    await activateTeam(root, 'team', 'owner'); const a = seed('a'); const b = seed('b'); const c = seed('c');
    const first = await inviteTeamMember(owner, a.email); expect(fake.read('users/a')?.account_id).toBe('personal-a');
    expect((await request(b, `/api/team/invitations/${first}/accept`, 'POST')).status).toBe(404);
    await acceptTeamInvitation(a, first); expect(fake.read('users/a')?.account_id).toBe('team');
    await expect(acceptTeamInvitation(a, first)).rejects.toMatchObject({ status: 409 });
    const second = await inviteTeamMember(owner, b.email); const third = await inviteTeamMember(owner, c.email);
    await acceptTeamInvitation(b, second);
    await expect(acceptTeamInvitation(c, third)).rejects.toMatchObject({ status: 409 });
    expect(Object.keys(state().members)).toHaveLength(3); expect(fake.read('users/c')?.account_id).toBe('personal-c'); expect(fake.read(`team_invitations/${third}`)?.status).toBe('pending');
    fake.put('users/c', { ...fake.read('users/c'), email_verified_at: null }); await expect(inviteTeamMember(owner, c.email)).rejects.toMatchObject({ status: 422 });
  });
  it('preserves paying personal accounts and unfinished billing histories instead of moving subscriptions or credits', async () => {
    await activateTeam(root, 'team', 'owner');
    for (const [id, fields] of [['paid', { plan: 'pro', plan_subscription_id: 'sub' }], ['pending', { dodo_customer_id: 'checkout-customer' }], ['credits', { credit_topup: 100 }]] as const) {
      const guest = seed(id); fake.put(`accounts/personal-${id}`, { ...fake.read(`accounts/personal-${id}`), ...fields }); const before = structuredClone(fake.read(`accounts/personal-${id}`)); const invitation = await inviteTeamMember(owner, guest.email);
      await expect(acceptTeamInvitation(guest, invitation)).rejects.toMatchObject({ status: 409 });
      expect(fake.read(`accounts/personal-${id}`)).toEqual(before); expect(fake.read(`users/${id}`)?.account_id).toBe(`personal-${id}`);
    }
  });
  it('prevents an in-flight personal checkout from continuing after Team acceptance', async () => {
    await activateTeam(root, 'team', 'owner'); const guest = seed('guest');
    const invitation = await inviteTeamMember(owner, guest.email);
    const create = vi.fn(async () => {
      await acceptTeamInvitation(guest, invitation);
      return { customer_id: 'customer-created-during-join' };
    });
    await expect(ensureCustomer({ customers: { create } } as any, 'personal-guest')).rejects.toThrow('no checkout was started');
    expect(fake.read('users/guest')?.account_id).toBe('team');
    expect(fake.read('accounts/personal-guest')?.dodo_customer_id).toBeUndefined();
    expect(fake.read('accounts/team')?.dodo_customer_id).toBe('team-customer');
  });
  it('retains personal documents, usage and project permissions when a member is detached', async () => {
    await activateTeam(root, 'team', 'owner'); const guest = seed('guest'); fake.put('accounts/personal-guest/plan_usage/credits__2026-11', { amount: 20 });
    fake.put('documents/doc', { owner_user_id: 'guest', title: 'Personal work' }); fake.put('projects/project', { owner_user_id: 'guest', owner_account_id: 'team', members: ['owner'] });
    await acceptTeamInvitation(guest, await inviteTeamMember(owner, guest.email));
    await removeTeamMember(owner, 'guest', state().revision);
    expect(fake.read('users/guest')?.account_id).toBe('personal-guest'); expect(fake.read('accounts/personal-guest/plan_usage/credits__2026-11')?.amount).toBe(20);
    expect(fake.read('documents/doc')?.title).toBe('Personal work'); expect(fake.read('projects/project')?.members).toEqual(['owner']); expect(fake.read('accounts/team')?.dodo_customer_id).toBe('team-customer');
    expect((await managedTeamBilling({ ...guest, account_id: 'team' })).account_id).toBe('personal-guest');
  });
  it('allows administrators to manage member seats but reserves role changes and owner removal to owners', async () => {
    await activateTeam(root, 'team', 'owner'); const admin = await join('admin'); const member = await join('member');
    await changeTeamRole(owner, 'admin', 'admin', state().revision);
    expect((await request(member, '/api/team/invitations', 'POST', { email: 'platform@example.test' })).status).toBe(403);
    await expect(changeTeamRole(admin, 'member', 'owner', state().revision)).rejects.toMatchObject({ status: 403 });
    await expect(removeTeamMember(admin, 'owner', state().revision)).rejects.toMatchObject({ status: 403 });
    await removeTeamMember(admin, 'member', state().revision); expect(fake.read('users/member')?.account_id).toBe('personal-member');
  });
  it('protects the last active owner during leave, demotion and account deletion, including a disabled alternative', async () => {
    await activateTeam(root, 'team', 'owner'); await expect(prepareTeamAccountDeletion('owner')).rejects.toMatchObject({ status: 409 });
    await expect(changeTeamRole(owner, 'owner', 'member', state().revision)).rejects.toMatchObject({ status: 409 });
    await join('other-owner'); await changeTeamRole(owner, 'other-owner', 'owner', state().revision);
    fake.put('users/other-owner', { ...fake.read('users/other-owner'), disabled_at: new Date() }); await expect(prepareTeamAccountDeletion('owner')).rejects.toMatchObject({ status: 409 });
    fake.put('users/other-owner', { ...fake.read('users/other-owner'), disabled_at: null }); await prepareTeamAccountDeletion('owner');
    expect(fake.read('users/owner')?.account_id).not.toBe('team'); expect(state().members.owner).toBeUndefined(); expect(state().members['other-owner'].role).toBe('owner'); expect(fake.read('accounts/team')?.plan).toBe('team');
  });
  it('blocks membership changes during deletion and fails closed on an inconsistent Team roster', async () => {
    await activateTeam(root, 'team', 'owner');
    const guest = seed('guest'); const invitation = await inviteTeamMember(owner, guest.email);
    await prepareTeamAccountDeletion('guest');
    expect(fake.read('users/guest')?.deletion_pending_at).toBeTruthy();
    await expect(acceptTeamInvitation(guest, invitation)).rejects.toMatchObject({ status: 403 });
    await expect(inviteTeamMember(owner, guest.email)).rejects.toMatchObject({ status: 422 });
    expect(fake.read('users/guest')?.account_id).toBe('personal-guest');
    seed('untracked-member', 'team');
    await expect(prepareTeamAccountDeletion('untracked-member')).rejects.toMatchObject({ status: 409 });
    expect(fake.read('users/untracked-member')?.deletion_pending_at).toBeUndefined();
    await expect(prepareTeamAccountDeletion('owner')).rejects.toMatchObject({ status: 409 });
    expect(fake.read('users/owner')?.deletion_pending_at).toBeUndefined();
    expect(fake.read('accounts/team')?.dodo_customer_id).toBe('team-customer');
  });
  it('keeps member billing records private and guards all payment actions while exposing pooled credits', async () => {
    await activateTeam(root, 'team', 'owner'); const guest = await join('guest');
    for (const path of ['portal', 'cancel', 'resume', 'cards', 'checkout', 'credits/checkout', 'purchases/complete']) expect((await request(guest, `/api/billing/${path}`, 'POST', {})).status).toBe(403);
    expect((await request(guest, '/api/billing/purchases')).status).toBe(403);
    const summary = await request(guest, '/api/billing'); expect(summary.status).toBe(200); const body = await summary.json() as any;
    expect(body).toMatchObject({ managed_team: true, can_manage_billing: false, cards: [], invoices: [], purchases: [], payments_enabled: false });
    expect(payments.cards).not.toHaveBeenCalled(); expect(payments.invoices).not.toHaveBeenCalled(); expect((await request(guest, '/api/billing/credits')).status).toBe(200);
    expect((await request(owner, '/api/billing/checkout', 'POST', { plan: 'plus', interval: 'month' })).status).toBe(409);
    const ownerSummary = await request(owner, '/api/billing'); expect(ownerSummary.status).toBe(200); expect(payments.cards).toHaveBeenCalledOnce();
    const personal = seed('personal-only'); const personalSummary = await request(personal, '/api/billing'); expect(personalSummary.status).toBe(200); expect(await personalSummary.json()).toMatchObject({ managed_team: false, can_manage_billing: true });
  });
  it('uses the explicitly designated owner when establishing a managed Team billing customer', async () => {
    await activateTeam(root, 'team', 'owner'); await join('oldest-member');
    fake.put('users/oldest-member', { ...fake.read('users/oldest-member'), created_at: new Date('2000-01-01') });
    fake.put('accounts/team', { ...fake.read('accounts/team'), dodo_customer_id: null });
    const create = vi.fn(async (_input: Record<string, unknown>) => ({ customer_id: 'new-customer' }));
    expect(await ensureCustomer({ customers: { create } } as any, 'team')).toBe('new-customer');
    expect(create.mock.calls[0][0]).toMatchObject({ email: owner.email });
  });
  it('binds billing summary permissions to the same account after a member is removed mid-request', async () => {
    await activateTeam(root, 'team', 'owner'); const guest = await join('guest');
    const originalAccess = teamModule.managedTeamBilling;
    const access = vi.spyOn(teamModule, 'managedTeamBilling').mockImplementationOnce(async (user) => {
      const beforeRemoval = await originalAccess(user);
      await removeTeamMember(owner, 'guest', state().revision);
      return beforeRemoval;
    });
    try {
      const response = await request(guest, '/api/billing');
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ managed_team: false, plan: { id: 'free' }, cards: [], invoices: [] });
      expect(payments.cards).not.toHaveBeenCalled(); expect(payments.invoices).not.toHaveBeenCalled();
    } finally { access.mockRestore(); }
  });
  it('exports every membership event while limiting the on-screen journal and denying member export', async () => {
    await activateTeam(root, 'team', 'owner'); const guest = await join('guest');
    for (let i = 0; i < 105; i += 1) fake.put(`accounts/team/team_events/test-${i}`, { at: new Date(1700000000000 + i).toISOString(), action: 'role_changed', actor_id: 'owner', target_id: 'guest', role: 'member' });
    const view = await (await request(owner, '/api/team')).json() as any; expect(view.team.events).toHaveLength(100);
    const exported = await (await request(owner, '/api/team/export')).json() as any; expect(exported.events.length).toBeGreaterThan(105);
    expect((await request(guest, '/api/team/export')).status).toBe(403);
  });
  it('rejects expired or revoked invitations and stale role edits, while recording membership events', async () => {
    await activateTeam(root, 'team', 'owner'); const guest = seed('guest'); const id = await inviteTeamMember(owner, guest.email);
    expect((await request(owner, `/api/team/invitations/${id}/revoke`, 'POST')).status).toBe(200); await expect(acceptTeamInvitation(guest, id)).rejects.toMatchObject({ status: 409 });
    const next = await inviteTeamMember(owner, guest.email); fake.put(`team_invitations/${next}`, { ...fake.read(`team_invitations/${next}`), expires_at: '2000-01-01T00:00:00.000Z' }); await expect(acceptTeamInvitation(guest, next)).rejects.toMatchObject({ status: 409 });
    await expect(changeTeamRole(owner, 'owner', 'owner', 1)).rejects.toMatchObject({ status: 409 });
    const settings = await (await request(owner, '/api/team')).json() as any; expect(settings.team.events.some((entry: any) => entry.action === 'revoked')).toBe(true);
  });

  it('detaches a sole owner when the login is already deleted and lets a platform admin assign a new owner', async () => {
    await activateTeam(root, 'team', 'owner');
    const member = await join('member');
    // Account → Delete keeps the safeguard; the Auth trigger (login already gone) must not.
    await expect(prepareTeamAccountDeletion('owner')).rejects.toMatchObject({ status: 409 });
    await prepareTeamAccountDeletion('owner', { force: true });
    expect(state().members.owner).toBeUndefined();
    expect(state().needs_owner).toBe(true);
    expect(fake.read('users/owner')?.deletion_pending_at).toBeTruthy();
    const events = [...fake.store.keys()].filter((key) => key.startsWith('accounts/team/team_events/')).map((key) => fake.read(key)!.action);
    expect(events).toEqual(expect.arrayContaining(['removed_on_account_deletion', 'owner_needed']));
    const body = { account_id: 'team', owner_user_id: 'member' };
    expect((await request(member, '/api/team/recover-owner', 'POST', body)).status).toBe(403);
    expect((await request(root, '/api/team/recover-owner', 'POST', body)).status).toBe(200);
    expect(state().members.member.role).toBe('owner');
    expect(state().needs_owner).toBe(false);
    expect((await request(root, '/api/team/recover-owner', 'POST', body)).status).toBe(409);
  });
  it('forces cleanup past an unreconciled roster entry only when the login is already deleted', async () => {
    await activateTeam(root, 'team', 'owner');
    seed('untracked-member', 'team');
    await expect(prepareTeamAccountDeletion('untracked-member')).rejects.toMatchObject({ status: 409 });
    await prepareTeamAccountDeletion('untracked-member', { force: true });
    expect(fake.read('users/untracked-member')?.deletion_pending_at).toBeTruthy();
    expect(state().members.owner.role).toBe('owner');
    expect(state().needs_owner).toBe(false);
  });
});
