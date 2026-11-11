import { C, col, db, deleteDeep, deleteQuery, FieldPath, FieldValue, getRow } from '../firebase.js';
import { deleteDocumentFiles } from './documentStore.js';
import { deletePrefix } from './storage.js';
import type { UserDoc } from './users.js';
import { syncMemberIndex } from './documents.js';
import { dodoClient, isNotFound } from './dodoBilling.js';

/**
 * Removes a person's data: their documents (with members, versions and Storage files), their
 * places in other people's documents, Library, chats, imports and connections, and their
 * account when nobody else uses it. Safe to run twice: DELETE /api/auth/me runs it, then the
 * Auth `onDelete` trigger (functions/) runs it again.
 *
 * A plan subscription is cancelled at once (no further charges); the Dodo customer stays,
 * so past invoices remain available.
 */
export async function deleteUserData(uid: string) {
  if (!uid || uid.includes('/')) return;
  const user = await getRow<UserDoc>(C.users, uid);

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
  for (const name of [C.libraryFolders, C.chatThreads, C.libraryConnections, C.libraryImportJobs, C.authorshipReports]) {
    await deleteQuery(col(name).where('user_id', '==', uid));
  }
  // DOI and source-id markers are keyed `{uid}__…`.
  const markerEnd = `${uid}__${String.fromCharCode(0xf8ff)}`;
  await deleteQuery(col(C.libraryDoi).where(FieldPath.documentId(), '>=', col(C.libraryDoi).doc(`${uid}__`)).where(FieldPath.documentId(), '<', col(C.libraryDoi).doc(markerEnd)));

  if (user?.email) await col(C.legacyPasswords).doc(user.email.toLowerCase()).delete().catch(() => undefined);
  await col(C.users).doc(uid).delete();

  if (user?.account_id) {
    const others = await col(C.users).where('account_id', '==', user.account_id).limit(1).get();
    if (others.empty) {
      await cancelPlanSubscription(user.account_id);
      await deleteDeep(col(C.accounts).doc(user.account_id));
    }
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
