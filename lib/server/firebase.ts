import { randomUUID } from 'node:crypto';
import { getApps, initializeApp, applicationDefault, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import {
  getFirestore, FieldValue, Timestamp,
  type DocumentSnapshot, type Firestore, type QuerySnapshot,
} from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

/**
 * Firebase Admin, shared by the API (Next.js route handlers), the collab service and Cloud
 * Functions. On Firebase App Hosting, Cloud Run and Functions the credentials come from the
 * runtime's service account; locally, the emulators (FIRESTORE_EMULATOR_HOST etc.) or
 * GOOGLE_APPLICATION_CREDENTIALS.
 *
 * Data model: docs/data-model.md. Field names are the old Postgres column names (snake_case),
 * so a row and a document read the same in code.
 */

function app(): App {
  const existing = getApps()[0];
  if (existing) return existing;
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || (projectId ? `${projectId}.firebasestorage.app` : undefined);
  const emulated = Boolean(process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST);
  return initializeApp({ projectId, storageBucket, ...(emulated ? {} : { credential: applicationDefault() }) });
}

let firestore: Firestore | null = null;
export function db(): Firestore {
  if (firestore) return firestore;
  firestore = getFirestore(app());
  firestore.settings({ ignoreUndefinedProperties: true });
  return firestore;
}

export const adminAuth = () => getAuth(app());
type Bucket = ReturnType<ReturnType<typeof getStorage>['bucket']>;
export const bucket = (): Bucket => getStorage(app()).bucket();

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
  apiKeys: 'api_keys',
  usageEvents: 'usage_events',
  appSettings: 'app_settings',
  adminAudit: 'admin_audit',
  stripeEvents: 'stripe_events',
  plans: 'plans',
  planUsage: 'plan_usage',         // accounts/{id}/plan_usage
  creditLedger: 'credit_ledger',   // accounts/{id}/credit_ledger
  creditDailyFree: 'credit_daily_free', // accounts/{id}/credit_daily_free
  authFlows: 'auth_flows',
  libraryConnections: 'library_connections',
  libraryImportJobs: 'library_import_jobs',
  rateLimits: 'rate_limits',
} as const;

export const col = (name: string) => db().collection(name);
export const newId = () => randomUUID();
export { FieldValue, Timestamp };
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
