import { HTTPException } from 'hono/http-exception';
import { C, col, db, newId, row, rows } from '../firebase.js';
import { forgetUser, type AuthUser } from '../auth.js';
import type { TeamEvent, TeamGovernance, TeamInvitation, TeamMembership, TeamRole, TeamSettings } from '../../team.js';

export const TEAM_INVITATIONS_COLLECTION = 'team_invitations';
type Person = AuthUser & { email_verified_at?: Date | string | null; disabled_at?: Date | string | null; deletion_pending_at?: Date | string | null; personal_account_id?: string | null };
type Account = { id: string; name?: string; plan?: string; plan_source?: string; plan_status?: string; plan_period_end?: Date | string | null; team_seats?: number; team_governance?: TeamGovernance; plan_subscription_id?: string | null; dodo_customer_id?: string | null; credit_topup?: number; personal_reserved_for?: string | null };
const accountRef = (id: string) => col(C.accounts).doc(id);
const personRef = (id: string) => col(C.users).doc(id);
const inviteRef = (id: string) => col(TEAM_INVITATIONS_COLLECTION).doc(id);
function fail(status: 403 | 404 | 409 | 422, message: string): never { throw new HTTPException(status, { message }); }
const validId = (id: string) => /^[a-zA-Z0-9_-]{1,128}$/.test(id);
export const teamSeatCap = (account: Pick<Account, 'team_seats'>) => Math.max(3, Math.floor(Number(account.team_seats) || 3));
/** Matches existing effectivePlan entitlement without granting or changing a plan. */
export function provisionedTeam(account: Account | null): boolean {
  if (!account || account.plan !== 'team') return false;
  if (account.plan_source === 'admin') return true;
  if (account.plan_source === 'dodo') return ['active', 'trialing', 'past_due'].includes(account.plan_status || '');
  const end = account.plan_period_end instanceof Date ? account.plan_period_end.getTime() : account.plan_period_end ? Date.parse(account.plan_period_end) : null;
  return ['legacy', 'pass'].includes(account.plan_source || '') && account.plan_status === 'active' && (end === null || end > Date.now());
}
const verified = (person: Person | null): person is Person => Boolean(person && !person.disabled_at && !person.deletion_pending_at && person.email_verified_at);
function governance(account: Account | null): TeamGovernance { if (!account?.team_governance) return fail(409, 'Team seat management has not been configured for this account.'); return account.team_governance; }
function manage(account: Account, person: Person, ownerOnly = false) {
  if (!verified(person) || person.account_id !== account.id) fail(403, 'An active, verified Team account is required.');
  const role = governance(account).members[person.id]?.role;
  if (ownerOnly ? role !== 'owner' : !['owner', 'admin'].includes(role || '')) fail(403, ownerOnly ? 'Only a Team owner can change administrative roles.' : 'Only Team owners and administrators can manage seats.');
  return role!;
}
function event(tx: any, accountId: string, action: string, actor: string, target: string | null = null, role: TeamRole | null = null) {
  tx.create(accountRef(accountId).collection('team_events').doc(newId()), { at: new Date().toISOString(), action, actor_id: actor, target_id: target, role });
}
async function currentPerson(user: AuthUser) {
  const person = row<Person>(await personRef(user.id).get());
  if (!person || person.disabled_at || person.deletion_pending_at) fail(403, 'Your account is unavailable.');
  return person;
}

export async function teamSettings(user: AuthUser): Promise<TeamSettings> {
  const person = await currentPerson(user);
  const account = row<Account>(await accountRef(person.account_id).get());
  const invitations = rows<TeamInvitation>(await col(TEAM_INVITATIONS_COLLECTION).where('target_user_id', '==', user.id).where('status', '==', 'pending').get()).filter((item) => item.expires_at > new Date().toISOString());
  if (!account?.team_governance) return { team: null, invitations, platform_admin: Boolean(person.is_admin && verified(person)), unconfigured_team: provisionedTeam(account) };
  const state = account.team_governance; const role = state.members[user.id]?.role || null;
  if (!role) fail(409, 'Your Team membership needs administrator reconciliation.');
  const manager = ['owner', 'admin'].includes(role);
  const people = rows<Person>(await col(C.users).where('account_id', '==', person.account_id).get());
  const members = people.filter((member) => manager || member.id === user.id).map((member) => ({ user_id: member.id, name: member.full_name || member.email, email: member.email, role: state.members[member.id]?.role || 'member', active: !member.disabled_at }));
  return { invitations, platform_admin: Boolean(person.is_admin && verified(person)), unconfigured_team: false, team: {
    account_id: account.id, name: account.name || 'Team', role, seats: teamSeatCap(account), used: new Set([...people.map((member) => member.id), ...Object.keys(state.members)]).size,
    revision: state.revision, active_plan: provisionedTeam(account), needs_owner: Boolean(state.needs_owner), members,
    invitations: manager ? rows<TeamInvitation>(await col(TEAM_INVITATIONS_COLLECTION).where('account_id', '==', account.id).where('status', '==', 'pending').get()).filter((item) => item.expires_at > new Date().toISOString()) : [],
    events: manager ? rows<TeamEvent>(await accountRef(account.id).collection('team_events').get()).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 100) : [],
  } };
}

/** A platform admin may configure governance only for a Team entitlement provisioned elsewhere. */
export async function activateTeam(user: AuthUser, accountId: string, ownerId: string) {
  if (!validId(accountId) || !validId(ownerId)) fail(422, 'Use valid account and owner identifiers.');
  await db().runTransaction(async (tx) => {
    const actor = row<Person>(await tx.get(personRef(user.id))); const account = row<Account>(await tx.get(accountRef(accountId)));
    if (!verified(actor) || !actor.is_admin) fail(403, 'Only a verified platform administrator can configure an existing Team account.');
    if (!provisionedTeam(account) || !account) fail(409, 'An active Team plan must already be provisioned. This action cannot create or grant a plan.');
    if (account.team_governance) fail(409, 'This Team already has seat management configured.');
    const people = rows<Person>(await tx.get(col(C.users).where('account_id', '==', accountId)));
    if (!people.some((person) => person.id === ownerId && verified(person))) fail(422, 'Choose an active, verified user already in this Team account as owner.');
    if (people.length > teamSeatCap(account) || teamSeatCap(account) > 1000) fail(409, 'Resolve the provisioned seat count before configuring this roster.');
    const at = new Date().toISOString();
    const state: TeamGovernance = { version: 1, revision: 1, activated_at: at, activated_by: user.id, members: Object.fromEntries(people.map((person) => [person.id, { role: person.id === ownerId ? 'owner' : 'member', joined_at: at, personal_account_id: null }])) };
    tx.update(accountRef(accountId), { team_governance: state }); event(tx, accountId, 'governance_configured', user.id, ownerId, 'owner');
  });
}

export async function inviteTeamMember(user: AuthUser, email: string) {
  const requester = await currentPerson(user);
  const requesterAccount = row<Account>(await accountRef(requester.account_id).get());
  if (!requesterAccount) fail(404, 'Team not found.');
  manage(requesterAccount, requester);
  const target = rows<Person>(await col(C.users).where('email', '==', email.trim().toLowerCase()).limit(1).get())[0];
  if (!verified(target)) fail(422, 'Invite an existing user with a verified email address.');
  const id = newId();
  await db().runTransaction(async (tx) => {
    const actor = row<Person>(await tx.get(personRef(user.id))); const person = row<Person>(await tx.get(personRef(target.id)));
    if (!actor) fail(403, 'Your account is unavailable.');
    const account = row<Account>(await tx.get(accountRef(actor.account_id))); if (!account) fail(404, 'Team not found.'); manage(account, actor);
    if (!provisionedTeam(account)) fail(409, 'The Team plan must be active before inviting new members.');
    if (!verified(person) || person.account_id === account.id) fail(409, 'This user is unavailable or is already in the Team.');
    const pending = rows<TeamInvitation>(await tx.get(col(TEAM_INVITATIONS_COLLECTION).where('account_id', '==', account.id).where('target_user_id', '==', target.id).where('status', '==', 'pending')));
    if (pending.some((item) => Date.parse(item.expires_at) > Date.now())) fail(409, 'This user already has a pending invitation.');
    const at = new Date(); const invitation: Omit<TeamInvitation, 'id'> = { account_id: account.id, account_name: account.name || 'Team', target_user_id: target.id, target_email: person.email, invited_by: user.id, status: 'pending', created_at: at.toISOString(), expires_at: new Date(at.getTime() + 7 * 86400000).toISOString(), decided_at: null };
    tx.create(inviteRef(id), invitation); tx.update(accountRef(account.id), { team_governance: { ...account.team_governance!, revision: account.team_governance!.revision + 1 } }); event(tx, account.id, 'invited', user.id, target.id);
  });
  return id;
}

export async function acceptTeamInvitation(user: AuthUser, invitationId: string) {
  await db().runTransaction(async (tx) => {
    const invitation = row<TeamInvitation>(await tx.get(inviteRef(invitationId))); const person = row<Person>(await tx.get(personRef(user.id)));
    if (!invitation || invitation.target_user_id !== user.id) fail(404, 'Invitation not found.');
    if (!verified(person)) fail(403, 'Verify your email before accepting a Team invitation.');
    if (invitation.status !== 'pending' || Date.parse(invitation.expires_at) <= Date.now()) fail(409, 'This invitation is no longer pending.');
    const account = row<Account>(await tx.get(accountRef(invitation.account_id))); const personal = row<Account>(await tx.get(accountRef(person.account_id)));
    if (!account || !provisionedTeam(account)) fail(409, 'This Team no longer has an active provisioned plan.');
    const state = governance(account);
    if (person.account_id === account.id) fail(409, 'You already belong to this Team.');
    if (!personal || personal.team_governance || personal.plan === 'team') fail(409, 'Leave your current Team before joining another.');
    // A Dodo customer may have an unfinished checkout not yet reflected by a webhook.
    if ((personal.plan && personal.plan !== 'free') || personal.plan_subscription_id || personal.dodo_customer_id || Number(personal.credit_topup) > 0) fail(409, 'Your personal account has a paid plan, credit balance or billing history. Resolve that account with support before joining; no subscription or credits have been moved or cancelled.');
    const personalPeople = rows<Person>(await tx.get(col(C.users).where('account_id', '==', personal.id)));
    const teamPeople = rows<Person>(await tx.get(col(C.users).where('account_id', '==', account.id)));
    if (personalPeople.some((member) => member.id !== user.id)) fail(409, 'This billing account is shared. It cannot be moved by an individual invitation.');
    const occupied = new Set([...Object.keys(state.members), ...teamPeople.map((member) => member.id)]);
    if (occupied.size >= teamSeatCap(account)) fail(409, 'All provisioned seats are occupied. Ask a Team administrator to free a seat.');
    const membership: TeamMembership = { role: 'member', joined_at: new Date().toISOString(), personal_account_id: personal.id };
    tx.update(accountRef(account.id), { team_governance: { ...state, revision: state.revision + 1, members: { ...state.members, [user.id]: membership } } });
    tx.update(accountRef(personal.id), { personal_reserved_for: user.id });
    tx.update(personRef(user.id), { account_id: account.id, personal_account_id: personal.id });
    tx.update(inviteRef(invitationId), { status: 'accepted', decided_at: new Date().toISOString() }); event(tx, account.id, 'joined', user.id, user.id, 'member');
  });
  forgetUser(user.id);
}

export async function decideTeamInvitation(user: AuthUser, id: string, decision: 'declined' | 'revoked') {
  await db().runTransaction(async (tx) => {
    const invitation = row<TeamInvitation>(await tx.get(inviteRef(id))); const person = row<Person>(await tx.get(personRef(user.id)));
    if (!invitation || !person) fail(404, 'Invitation not found.');
    const account = row<Account>(await tx.get(accountRef(invitation.account_id))); if (!account) fail(404, 'Team not found.');
    if (decision === 'declined') { if (invitation.target_user_id !== user.id) fail(404, 'Invitation not found.'); } else manage(account, person);
    if (invitation.status !== 'pending') fail(409, 'This invitation has already been decided.');
    tx.update(inviteRef(id), { status: decision, decided_at: new Date().toISOString() }); event(tx, account.id, decision, user.id, invitation.target_user_id);
  });
}

async function otherActiveOwner(tx: any, account: Account, target: string) {
  for (const [id, membership] of Object.entries(governance(account).members)) if (id !== target && membership.role === 'owner') {
    const person = row<Person>(await tx.get(personRef(id))); if (verified(person) && person.account_id === account.id) return true;
  }
  return false;
}

export async function changeTeamRole(user: AuthUser, targetId: string, role: TeamRole, revision: number) {
  await db().runTransaction(async (tx) => {
    const actor = row<Person>(await tx.get(personRef(user.id))); const target = row<Person>(await tx.get(personRef(targetId))); if (!actor || !target) fail(404, 'Member not found.');
    const account = row<Account>(await tx.get(accountRef(actor.account_id))); if (!account) fail(404, 'Team not found.'); manage(account, actor, true);
    const state = governance(account); const membership = state.members[targetId];
    if (!membership || target.account_id !== account.id) fail(404, 'Member not found.');
    if (state.revision !== revision) fail(409, 'The roster changed. Reload before changing roles.');
    if ((role === 'owner' || role === 'admin') && !verified(target)) fail(422, 'An administrative role needs an active, verified user.');
    if (membership.role === 'owner' && role !== 'owner' && !await otherActiveOwner(tx, account, targetId)) fail(409, 'Keep at least one active, verified Team owner.');
    const members = { ...state.members, [targetId]: { ...membership, role } };
    const needsOwner = role === 'owner' ? false : Boolean(state.needs_owner);
    tx.update(accountRef(account.id), { team_governance: { ...state, revision: state.revision + 1, members, needs_owner: needsOwner } });
    event(tx, account.id, 'role_changed', user.id, targetId, role);
  });
}

export async function removeTeamMember(user: AuthUser, targetId: string, revision: number, preparingDeletion = false) {
  await db().runTransaction(async (tx) => {
    const actor = row<Person>(await tx.get(personRef(user.id))); const target = row<Person>(await tx.get(personRef(targetId))); if (!actor || !target) fail(404, 'Member not found.');
    const account = row<Account>(await tx.get(accountRef(actor.account_id))); if (!account) fail(404, 'Team not found.');
    const state = governance(account); const membership = state.members[targetId]; const actorRole = state.members[user.id]?.role;
    if (!membership || target.account_id !== account.id) fail(404, 'Member not found.');
    if (state.revision !== revision) fail(409, 'The roster changed. Reload before removing a seat.');
    if (targetId !== user.id) { manage(account, actor); if (actorRole !== 'owner' && membership.role !== 'member') fail(403, 'Only an owner can remove an administrator or another owner.'); }
    else if (!actorRole) fail(403, 'You are not a member of this Team.');
    if (membership.role === 'owner' && !await otherActiveOwner(tx, account, targetId)) fail(409, 'Assign another active owner before leaving or removing this owner.');
    const personalId = membership.personal_account_id || newId();
    const personal = membership.personal_account_id ? row<Account>(await tx.get(accountRef(personalId))) : null;
    const occupants = rows<Person>(await tx.get(col(C.users).where('account_id', '==', personalId)));
    if (occupants.some((person) => person.id !== targetId) || (personal?.personal_reserved_for && personal.personal_reserved_for !== targetId) || personal?.team_governance) fail(409, 'The original personal account needs administrator reconciliation. No data or membership was changed.');
    const members = { ...state.members }; delete members[targetId];
    if (!personal) tx.create(accountRef(personalId), { name: target.full_name || target.email, plan: 'free', created_at: new Date(), billing_status: 'none', plan_status: 'none', plan_source: 'default', plan_cancel_at_period_end: false, personal_reserved_for: targetId });
    tx.update(personRef(targetId), { account_id: personalId, personal_account_id: null, ...(preparingDeletion ? { deletion_pending_at: new Date() } : {}) });
    tx.update(accountRef(account.id), { team_governance: { ...state, revision: state.revision + 1, members } }); event(tx, account.id, targetId === user.id ? 'left' : 'removed', user.id, targetId, membership.role);
  });
  forgetUser(targetId);
}

/** Billing detail/actions are administrative; credits remain visible to everyone using the pool. */
export async function managedTeamBilling(user: AuthUser) {
  const person = await currentPerson(user); const account = row<Account>(await accountRef(person.account_id).get());
  const state = account?.team_governance; const role = state?.members[user.id]?.role || null;
  return { account_id: person.account_id, managed: Boolean(state), can_manage: !state || (verified(person) && ['owner', 'admin'].includes(role || '')) };
}

/** Detach before destructive deletion, atomically retaining another owner. Read the user's
 * account again afterwards: deletion should clean the restored personal account, never Team billing. */
export async function prepareTeamAccountDeletion(userId: string, options: { force?: boolean } = {}) {
  if (!options.force) return prepareChecked(userId);
  // The Auth user is already gone (console or trigger deletion): nobody can resolve a 409, so
  // refusing would leave every record behind. Try the safe path, then detach regardless.
  try {
    await prepareChecked(userId);
  } catch (error) {
    if (!(error instanceof HTTPException) || error.status !== 409) throw error;
    await forceDetachForDeletion(userId);
  }
}

/**
 * Removes a deleted person from Team governance without the usual reconciliation checks.
 * When they were the last active owner the Team is flagged `needs_owner` for a platform
 * administrator (recoverTeamOwner). Their personal account is restored only when that is safe;
 * otherwise their user record keeps the Team account id and the caller deletes it.
 */
async function forceDetachForDeletion(userId: string) {
  await db().runTransaction(async (tx) => {
    const person = row<Person>(await tx.get(personRef(userId))); if (!person) return;
    const account = row<Account>(await tx.get(accountRef(person.account_id)));
    const state = account?.team_governance;
    const membership = state?.members[userId];
    const lostOwner = Boolean(membership?.role === 'owner' && account && !await otherActiveOwner(tx, account, userId));
    const personalId = membership?.personal_account_id ?? null;
    const personal = personalId ? row<Account>(await tx.get(accountRef(personalId))) : null;
    const occupants = personalId ? rows<Person>(await tx.get(col(C.users).where('account_id', '==', personalId))) : [];
    const restorable = Boolean(personal && !personal.team_governance && occupants.every((item) => item.id === userId)
      && (!personal.personal_reserved_for || personal.personal_reserved_for === userId));
    const update: Record<string, unknown> = { deletion_pending_at: person.deletion_pending_at || new Date() };
    if (restorable) Object.assign(update, { account_id: personalId, personal_account_id: null });
    tx.update(personRef(userId), update);
    if (!account || !state) return;
    const members = { ...state.members }; delete members[userId];
    const needsOwner = Boolean(state.needs_owner) || lostOwner;
    tx.update(accountRef(account.id), { team_governance: { ...state, revision: state.revision + 1, members, needs_owner: needsOwner } });
    event(tx, account.id, membership ? 'removed_on_account_deletion' : 'unreconciled_account_deleted', userId, userId, membership?.role ?? null);
    if (lostOwner) event(tx, account.id, 'owner_needed', userId, null, null);
  });
  forgetUser(userId);
}

/** A platform administrator assigns an owner to a Team left without an active, verified owner. */
export async function recoverTeamOwner(user: AuthUser, accountId: string, ownerId: string) {
  if (!validId(accountId) || !validId(ownerId)) fail(422, 'Use valid account and owner identifiers.');
  await db().runTransaction(async (tx) => {
    const actor = row<Person>(await tx.get(personRef(user.id))); const target = row<Person>(await tx.get(personRef(ownerId)));
    if (!verified(actor) || !actor.is_admin) fail(403, 'Only a verified platform administrator can assign a Team owner.');
    const account = row<Account>(await tx.get(accountRef(accountId))); if (!account) fail(404, 'Team not found.');
    const state = governance(account); const membership = state.members[ownerId];
    if (await otherActiveOwner(tx, account, '')) fail(409, 'This Team already has an active owner who can change roles.');
    if (!membership || !verified(target) || target.account_id !== account.id) fail(422, 'Choose an active, verified member of this Team.');
    const members = { ...state.members, [ownerId]: { ...membership, role: 'owner' as const } };
    tx.update(accountRef(accountId), { team_governance: { ...state, revision: state.revision + 1, members, needs_owner: false } });
    event(tx, accountId, 'owner_recovered', user.id, ownerId, 'owner');
  });
}

async function prepareChecked(userId: string) {
  const person = row<Person>(await personRef(userId).get()); if (!person) return;
  const account = row<Account>(await accountRef(person.account_id).get());
  if (account?.team_governance) {
    if (!account.team_governance.members[userId]) fail(409, 'Your Team membership needs administrator reconciliation before account deletion. No data was deleted.');
    await removeTeamMember(person, userId, account.team_governance.revision, true);
    return;
  }
  // Membership acceptance reads this same user in its transaction. Marking deletion
  // prevents a later invitation from moving billing while destructive cleanup runs.
  await db().runTransaction(async (tx) => {
    const current = row<Person>(await tx.get(personRef(userId))); if (!current) return;
    const currentAccount = row<Account>(await tx.get(accountRef(current.account_id)));
    if (currentAccount?.team_governance) fail(409, 'Your Team membership changed. Retry account deletion before any data is removed.');
    tx.update(personRef(userId), { deletion_pending_at: current.deletion_pending_at || new Date() });
  });
}

/** Untruncated audit export is available only to current Team administrators. */
export async function exportTeamAudit(user: AuthUser) {
  const actor = await currentPerson(user); const account = row<Account>(await accountRef(actor.account_id).get());
  if (!account) fail(404, 'Team not found.'); manage(account, actor);
  const settings = await teamSettings(user);
  const events = rows<TeamEvent>(await accountRef(account.id).collection('team_events').get()).sort((a, b) => a.at.localeCompare(b.at));
  const invitations = rows<TeamInvitation>(await col(TEAM_INVITATIONS_COLLECTION).where('account_id', '==', account.id).get());
  return { schema_version: 1, exported_at: new Date().toISOString(), team: { account_id: account.id, name: account.name || 'Team', seats: teamSeatCap(account), revision: account.team_governance!.revision, members: settings.team?.members || [] }, invitations, events };
}
