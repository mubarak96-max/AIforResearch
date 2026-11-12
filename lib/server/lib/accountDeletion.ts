import { C, col, db, deleteDeep, deleteQuery, FieldPath, FieldValue, getRow, newId } from '../firebase.js';
import { deleteDocumentFiles } from './documentStore.js';
import { deletePrefix } from './storage.js';
import type { UserDoc } from './users.js';
import { syncMemberIndex } from './documents.js';
import { dodoClient, isNotFound } from './dodoBilling.js';
import { prepareTeamAccountDeletion, TEAM_INVITATIONS_COLLECTION } from './team.js';
import { detachMemberSources, detachProjectMatrices } from './matrix.js';
import { settleResearchFailure } from './researchJobs.js';

/**
 * Removes a person's data: their documents (with members, versions and Storage files), their
 * places in other people's documents, Library, chats, imports and connections, and their
 * account when nobody else uses it. Safe to run twice: DELETE /api/auth/me runs it, then the
 * Auth `onDelete` trigger (functions/) runs it again.
 *
 * A plan subscription is cancelled at once (no further charges); the Dodo customer stays,
 * so past invoices remain available.
 */
export async function deleteUserData(uid: string, options: { authDeleted?: boolean } = {}) {
  if (!uid || uid.includes('/')) return;
  // From DELETE /me a Team conflict stops deletion (409) so the person can resolve it. From the
  // Auth trigger the login is already gone: detach from the Team and continue.
  await prepareTeamAccountDeletion(uid, { force: options.authDeleted });
  const user = await getRow<UserDoc>(C.users, uid);
  const ownedProjects = await col(C.projects).where('owner_user_id', '==', uid).get();
  // Preserve permitted bibliographic snapshots before the departing person's Library is removed.
  for (const project of ownedProjects.docs) await detachProjectMatrices(project.id);
  // Their sources in other people's project matrices become frozen snapshots, as when a member leaves.
  const memberOf = await col(C.projects).where('member_ids', 'array-contains', uid).select('owner_user_id').get();
  for (const project of memberOf.docs) {
    if (project.get('owner_user_id') !== uid) await detachMemberSources(project.id, uid).catch(() => undefined);
  }

  const owned = await col(C.documents).where('owner_user_id', '==', uid).select().get();
  for (const document of owned.docs) {
    await deleteDocumentFiles(document.id);
    await deleteDeep(document.ref);
  }

  const memberships = await db().collectionGroup(C.members).where('user_id', '==', uid).get();
  for (const member of memberships.docs) {
    const documentRef = member.ref.parent.parent;
    await member.ref.delete();
    if (documentRef) {
      await documentRef.update({ member_ids: FieldValue.arrayRemove(uid) }).catch(() => undefined);
      await syncMemberIndex(documentRef.id).catch(() => undefined);
    }
  }

  // Their writing activity in documents other people own (their own documents went above).
  await deleteQuery(db().collectionGroup(C.writingSessions).where('user_id', '==', uid));

  const library = await col(C.libraryDocuments).where('user_id', '==', uid).select().get();
  for (const item of library.docs) await deleteDeep(item.ref);
  await deletePrefix(`library/${uid}`);
  const matrices = await col(C.reviewMatrices).where('user_id', '==', uid).select().get();
  for (const matrix of matrices.docs) await deleteDeep(matrix.ref);
  // Their history, projects they own (with any systematic reviews in them) and memberships in others' projects.
  const reviews = await col(C.reviews).where('user_id', '==', uid).select().get();
  for (const review of reviews.docs) await deleteDeep(review.ref);
  // Their surveys, with every response collected (the researcher's data).
  const surveys = await col('surveys').where('user_id', '==', uid).select().get();
  for (const survey of surveys.docs) await deleteDeep(survey.ref);
  for (const project of ownedProjects.docs) {
    for (const collection of ['workflows', 'research_monitors', 'surveys', C.tasks, C.reviews]) {
      const linked = await col(collection).where('project_id', '==', project.id).get();
      for (const item of linked.docs) await item.ref.update({ project_id: null });
    }
    await deleteDeep(project.ref);
    await deletePrefix(`project-evidence/${project.id}`);
  }
  // Workbooks and monitors they created in other people's projects belong to that shared work:
  // hand them to the project owner. Personal ones (and ones from their own projects, detached above) go.
  await handOverOrDelete('workflows', uid);
  await handOverOrDelete('research_monitors', uid);
  // Invalidate workers before deleting inputs/results so an in-flight worker cannot recreate a task.
  const researchJobs = await col('research_jobs').where('user_id', '==', uid).get();
  for (const job of researchJobs.docs) await settleResearchFailure(job.id, 'cancelled', 'Account deleted. The reserved research credits were returned to the paying account.');
  const tasks = await col(C.tasks).where('user_id', '==', uid).get();
  for (const task of tasks.docs) { await task.ref.delete(); await deletePrefix(`tasks/${task.id}`); }
  for (const job of researchJobs.docs) await job.ref.delete();
  const shared = await col(C.projects).where('member_ids', 'array-contains', uid).get();
  for (const project of shared.docs) {
    const data = project.data() as { members?: { user_id: string | null }[] };
    await project.ref.update({ member_ids: FieldValue.arrayRemove(uid), members: (data.members ?? []).filter((member) => member.user_id !== uid) }).catch(() => undefined);
  }
  for (const name of [C.tasks, C.libraryFolders, C.chatThreads, C.libraryConnections, C.libraryImportJobs, C.authorshipReports]) {
    await deleteQuery(col(name).where('user_id', '==', uid));
  }
  await deleteQuery(col(TEAM_INVITATIONS_COLLECTION).where('target_user_id', '==', uid));
  // Decided invitations they sent are part of the Team's audit trail and stay; pending ones are revoked.
  const sent = await col(TEAM_INVITATIONS_COLLECTION).where('invited_by', '==', uid).where('status', '==', 'pending').get();
  for (const invitation of sent.docs) await invitation.ref.update({ status: 'revoked', decided_at: new Date().toISOString() });
  // DOI and source-id markers are keyed `{uid}__…`.
  const markerEnd = `${uid}__${String.fromCharCode(0xf8ff)}`;
  await deleteQuery(col(C.libraryDoi).where(FieldPath.documentId(), '>=', col(C.libraryDoi).doc(`${uid}__`)).where(FieldPath.documentId(), '<', col(C.libraryDoi).doc(markerEnd)));

  if (user?.email) await col(C.legacyPasswords).doc(user.email.toLowerCase()).delete().catch(() => undefined);
  await col(C.users).doc(uid).delete();

  if (user?.account_id) {
    const others = await col(C.users).where('account_id', '==', user.account_id).limit(1).get();
    if (others.empty) {
      await cancelPlanSubscription(user.account_id);
      // The account and its Team audit trail go together; nothing would be left to accept an invitation.
      await deleteQuery(col(TEAM_INVITATIONS_COLLECTION).where('account_id', '==', user.account_id));
      await deleteDeep(col(C.accounts).doc(user.account_id));
    }
  }
}

/**
 * A departing person's workbooks or monitors: kept for the project owner when they sit in someone
 * else's live project, otherwise deleted. A handed-over monitor is paused so it never runs
 * unattended under its new owner.
 */
export async function handOverOrDelete(collection: 'workflows' | 'research_monitors', uid: string) {
  const owned = await col(collection).where('owner_user_id', '==', uid).get();
  for (const item of owned.docs) {
    const projectId = item.get('project_id') as string | null;
    const project = projectId ? (await col(C.projects).doc(projectId).get()).data() : undefined;
    const newOwner = project?.owner_user_id as string | undefined;
    if (!newOwner || newOwner === uid) { await deleteDeep(item.ref); continue; }
    const at = new Date().toISOString();
    // A new revision makes any editor holding the old one reload instead of overwriting the change.
    const revision = Number(item.get('revision') || 0) + 1;
    if (collection === 'research_monitors') {
      await item.ref.update({ owner_user_id: newOwner, updated_at: at, revision, enabled: false, next_run_at: '9999-01-01T00:00:00.000Z' });
      continue;
    }
    await item.ref.update({ owner_user_id: newOwner, updated_at: at, revision });
    const note = 'The creator deleted their account; ownership passed to the project owner.';
    await item.ref.collection('events').doc(newId()).set({ action: 'owner_reassigned', user_id: null, revision, at, note, entry_id: null });
  }
}

/** Stops billing for an account that is going away. A failure stops the deletion, so it can be retried. */
async function cancelPlanSubscription(accountId: string) {
  const account = await getRow<{ plan_subscription_id?: string | null; plan_status?: string }>(C.accounts, accountId);
  const subscriptionId = account?.plan_subscription_id;
  if (!subscriptionId || ['cancelled', 'expired', 'failed'].includes(account?.plan_status ?? '')) return;
  const dodo = dodoClient();
  if (!dodo) return;
  try {
    // Cancelled now, not at the end of the period: nobody is left to use the plan.
    await dodo.subscriptions.update(subscriptionId, { status: 'cancelled' });
  } catch (error) {
    // Unknown to Dodo (deleted, or from the other mode): nothing left to stop.
    if (isNotFound(error)) return;
    throw error;
  }
}
