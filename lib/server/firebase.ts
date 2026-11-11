import { randomUUID } from 'node:crypto';
import type * as Admin from 'firebase-admin/firestore';
import {
  AggregateField as RestAggregateField, FieldPath as RestFieldPath, FieldValue as RestFieldValue,
  Firestore as RestFirestore, Timestamp as RestTimestamp,
} from './google/firestore.js';
import { createUser, deleteUser, getUser, updateUser, verifyAppCheckToken, verifyIdToken } from './google/auth.js';

/**
 * Firebase for the API (Next.js route handlers on Cloudflare Workers), the collab service and
 * Cloud Functions: Firestore, Auth and Storage over their REST APIs (lib/server/google), because
 * firebase-admin's Firestore client cannot run on Workers (protobufjs compiles code at runtime).
 * The objects keep firebase-admin's API and types, so code reads the same as with the SDK.
 *
 * Credentials (lib/server/google/credentials.ts): the emulators, GOOGLE_SERVICE_ACCOUNT_JSON
 * (the Worker secret), GOOGLE_APPLICATION_CREDENTIALS, or a Google runtime's service account.
 *
 * Data model: docs/data-model.md. Field names are the old Postgres column names (snake_case),
 * so a row and a document read the same in code.
 */

export type Firestore = Admin.Firestore;
export type DocumentSnapshot = Admin.DocumentSnapshot;
export type QuerySnapshot = Admin.QuerySnapshot;

// One client per isolate/process (it caches the project id and access token).
const cache = globalThis as typeof globalThis & { __writeorbitFirestore?: RestFirestore };
export function db(): Firestore {
  cache.__writeorbitFirestore ??= new RestFirestore();
  return cache.__writeorbitFirestore as unknown as Firestore;
}

/** The parts of firebase-admin's Auth that lib/server uses. */
export const adminAuth = () => ({ verifyIdToken, getUser, createUser, updateUser, deleteUser });
/** The part of firebase-admin's App Check that lib/server uses. */
export const adminAppCheck = () => ({ verifyToken: verifyAppCheckToken });

export const FieldValue = RestFieldValue as unknown as typeof Admin.FieldValue;
export type FieldValue = Admin.FieldValue;
export const Timestamp = RestTimestamp as unknown as typeof Admin.Timestamp;
export type Timestamp = Admin.Timestamp;
export const FieldPath = RestFieldPath as unknown as typeof Admin.FieldPath;
export type FieldPath = Admin.FieldPath;
export const AggregateField = RestAggregateField as unknown as typeof Admin.AggregateField;

/** Collection names, one place. */
export const C = {
  accounts: 'accounts',
  users: 'users',
  legacyPasswords: 'legacy_passwords',
  documents: 'documents',
  members: 'members',              // documents/{id}/members
  versions: 'versions',            // documents/{id}/versions
  chatThreads: 'chat_threads',
  libraryFolders: 'library_folders',
  libraryDocuments: 'library_documents',
  libraryDoi: 'library_doi',      // library_doi/{user}__{sha1(lower doi)}: one document per DOI per person
  chunks: 'chunks',                // library_documents/{id}/chunks
  assets: 'assets',
  usageEvents: 'usage_events',
  billingEvents: 'billing_events',
  billingProducts: 'billing_products',
  planUsage: 'plan_usage',         // accounts/{id}/plan_usage
  authFlows: 'auth_flows',
  libraryConnections: 'library_connections',
  libraryImportJobs: 'library_import_jobs',
  rateLimits: 'rate_limits',
  reviewMatrices: 'review_matrices',
  matrixRows: 'rows',              // review_matrices/{id}/rows/{libraryDocumentId}
  writingSessions: 'writing_sessions', // documents/{id}/writing_sessions/{sessionId}
  authorshipReports: 'authorship_reports',
} as const;

export const col = (name: string) => db().collection(name);
export const newId = () => randomUUID();
export const serverNow = () => FieldValue.serverTimestamp();
export const increment = (by: number) => FieldValue.increment(by);

/** Firestore Timestamps back to Dates, all the way down (rows keep the shape they had in Postgres). */
export function revive<T = any>(value: unknown): T {
  if (value instanceof Timestamp) return value.toDate() as T;
  if (Array.isArray(value)) return value.map(revive) as T;
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value)) out[key] = revive(inner);
    return out as T;
  }
  return value as T;
}

/** A document as a row: `{ id, ...fields }` with Dates, or null when it does not exist. */
export function row<T = any>(snapshot: DocumentSnapshot): T | null {
  if (!snapshot.exists) return null;
  return { id: snapshot.id, ...revive<Record<string, unknown>>(snapshot.data()) } as T;
}

export function rows<T = any>(snapshot: QuerySnapshot): T[] {
  return snapshot.docs.map((doc) => ({ id: doc.id, ...revive<Record<string, unknown>>(doc.data()) }) as T);
}

export async function getRow<T = any>(collection: string, id: string): Promise<T | null> {
  if (!id || id.includes('/')) return null;
  return row<T>(await col(collection).doc(id).get());
}

/** Deletes every document of a query, in batches (Firestore has no cascade). */
export async function deleteQuery(query: FirebaseFirestore.Query, batchSize = 300) {
  for (;;) {
    const snapshot = await query.limit(batchSize).get();
    if (snapshot.empty) return;
    const batch = db().batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    if (snapshot.size < batchSize) return;
  }
}

/** Deletes a document and all its subcollections. */
export async function deleteDeep(ref: FirebaseFirestore.DocumentReference) {
  await db().recursiveDelete(ref);
}

/** Splits `items` into chunks of `size` (Firestore `in` takes 30 values, batches 500 writes). */
export function chunked<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let index = 0; index < items.length; index += size) out.push(items.slice(index, index + size));
  return out;
}

/** Documents by id (any number; missing ones are skipped). */
export async function getMany<T = any>(collection: string, ids: string[]): Promise<T[]> {
  const unique = [...new Set(ids.filter((id) => id && !id.includes('/')))];
  const out: T[] = [];
  for (const group of chunked(unique, 300)) {
    const snapshots = await db().getAll(...group.map((id) => col(collection).doc(id)));
    for (const snapshot of snapshots) { const value = row<T>(snapshot); if (value) out.push(value); }
  }
  return out;
}

/** Lower-case word terms for array-contains search (Firestore has no full-text index). */
export function searchTerms(text: string, max = 400): string[] {
  const words = text.toLowerCase().normalize('NFKC').match(/[\p{L}\p{N}][\p{L}\p{N}-]{1,}/gu) || [];
  const seen = new Set<string>();
  for (const word of words) {
    if (word.length > 40) continue;
    seen.add(word);
    if (seen.size >= max) break;
  }
  return [...seen];
}
