import type { DecodedIdToken } from 'firebase-admin/auth';
import { C, col, db, FieldValue, getRow, newId, rows } from '../firebase.js';
import { env } from '../env.js';
import type { AuthUser } from '../auth.js';
import { effectivePlan } from './plans.js';
import { queueNewsletterSync } from './newsletter.js';

/**
 * People and what the browser is told about them. Firebase Authentication owns sign-in
 * (passwords, Google, email links, confirmation and reset emails); this
 * module owns the `users/{uid}` and `accounts/{id}` documents that go with each person.
 */

/**
 * What a person told us about their research (asked once on Home, changeable per task): it sets
 * the depth, tone and defaults of every workspace and which tools Home suggests.
 */
export const RESEARCH_ROLES = ['undergraduate', 'honours', 'masters', 'phd', 'academic', 'researcher', 'clinician', 'industry', 'other'] as const;
export type ResearchRole = (typeof RESEARCH_ROLES)[number];
export type ResearchProfile = { role: ResearchRole | null; field: string | null; citation_style: string | null; language: string | null };
const EMPTY_PROFILE: ResearchProfile = { role: null, field: null, citation_style: null, language: null };

export type PublicUser = {
  id: string; email: string; full_name: string | null; plan: string; plan_name: string; is_admin: boolean; email_verified: boolean;
  profile: ResearchProfile;
};

export type UserDoc = AuthUser & {
  email_verified_at: Date | null; disabled_at: Date | null; created_at: Date; last_seen_at: Date | null;
  newsletter_opt_out?: boolean; newsletter_dirty?: boolean; newsletter_synced?: string | null;
  profile?: Partial<ResearchProfile>;
};

const toAuthUser = (doc: UserDoc): AuthUser => ({
  id: doc.id, email: doc.email, full_name: doc.full_name ?? null, account_id: doc.account_id, is_admin: Boolean(doc.is_admin),
});

/** The plan shown is the one in force (a lapsed subscription shows the free plan). */
export async function publicUser(user: AuthUser): Promise<PublicUser> {
  const [{ plan }, doc] = await Promise.all([effectivePlan(user.account_id), getRow<UserDoc>(C.users, user.id)]);
  return {
    id: user.id, email: user.email, full_name: user.full_name,
    plan: plan?.id ?? 'free', plan_name: plan?.name ?? 'Free', is_admin: Boolean(user.is_admin),
    email_verified: Boolean(doc?.email_verified_at),
    profile: { ...EMPTY_PROFILE, ...(doc?.profile ?? {}) },
  };
}

/** The person's research profile (for prompts: level and field). */
export async function researchProfile(userId: string): Promise<ResearchProfile> {
  const snapshot = await col(C.users).doc(userId).get();
  const doc = snapshot.exists ? (snapshot.data() as UserDoc) : null;
  return { ...EMPTY_PROFILE, ...(doc?.profile ?? {}) };
}

export async function activeUser(id: string): Promise<AuthUser | null> {
  const doc = await getRow<UserDoc>(C.users, id);
  if (!doc || doc.disabled_at) return null;
  return toAuthUser(doc);
}

export async function userByEmail(email: string): Promise<UserDoc | null> {
  const found = rows<UserDoc>(await col(C.users).where('email', '==', email.trim().toLowerCase()).limit(1).get());
  return found[0] ?? null;
}

/** Attaches document invitations sent to this email before the person had an account. */
export async function claimInvitations(user: AuthUser) {
  const pending = await db().collectionGroup(C.members)
    .where('invite_email', '==', user.email.toLowerCase())
    .where('user_id', '==', null)
    .get();
  if (pending.empty) return;
  const batch = db().batch();
  const documentIds = new Set<string>();
  for (const member of pending.docs) {
    batch.update(member.ref, { user_id: user.id, status: 'active' });
    const documentRef = member.ref.parent.parent;
    if (documentRef) {
      batch.update(documentRef, { member_ids: FieldValue.arrayUnion(user.id) });
      documentIds.add(documentRef.id);
    }
  }
  await batch.commit();
  // Fill member_roles / member_emails / member_count too (imported lazily: documents.ts → access.ts).
  const { syncMemberIndex } = await import('./documents.js');
  await Promise.all([...documentIds].map((id) => syncMemberIndex(id).catch(() => undefined)));
}

/**
 * The `users/{uid}` and `accounts/{id}` documents for a Firebase user, created on their first
 * request. An account imported from Postgres (tools/migrate) already has both and keeps them.
 */
export async function ensureUser(token: DecodedIdToken): Promise<AuthUser | null> {
  const email = (token.email || '').trim().toLowerCase();
  if (!email) return null;
  const ref = col(C.users).doc(token.uid);
  const verifiedAt = token.email_verified ? new Date() : null;
  const user = await db().runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    if (existing.exists) {
      const data = existing.data() as UserDoc;
      if (data.disabled_at) return null;
      return toAuthUser({ ...data, id: existing.id });
    }
    const accountId = newId();
    const fullName = (token.name as string | undefined)?.trim() || null;
    tx.set(col(C.accounts).doc(accountId), {
      name: fullName || email, plan: 'free', created_at: new Date(),
      billing_status: 'none', plan_status: 'none', plan_source: 'default', plan_cancel_at_period_end: false,
    });
    const created = {
      account_id: accountId, email, full_name: fullName, is_admin: false,
      email_verified_at: verifiedAt, disabled_at: null, created_at: new Date(), last_seen_at: new Date(),
      newsletter_opt_out: false, newsletter_dirty: false, newsletter_synced: null, newsletter_error: null,
    };
    tx.set(ref, created);
    return toAuthUser({ ...(created as any), id: token.uid });
  });
  if (!user) return null;
  if (verifiedAt) queueNewsletterSync();
  return signedIn(user, Boolean(token.email_verified));
}

/** Everything that happens when a person signs in (the browser calls /api/auth/me after each). */
export async function signedIn(user: AuthUser, emailVerified: boolean): Promise<AuthUser> {
  const update: Record<string, unknown> = { last_seen_at: new Date() };
  if (emailVerified) {
    const doc = await getRow<UserDoc>(C.users, user.id);
    if (doc && !doc.email_verified_at) { update.email_verified_at = new Date(); queueNewsletterSync(); }
  }
  await col(C.users).doc(user.id).update(update);
  if (emailVerified) await claimInvitations(user);
  return user;
}
