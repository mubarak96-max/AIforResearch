import { randomUUID } from 'node:crypto';
import { getApps, initializeApp, applicationDefault, cert, type App, type Credential } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getAppCheck } from 'firebase-admin/app-check';
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

/**
 * Hosts without a Google runtime (Cloudflare Workers) have no default credentials: there the
 * service-account key's JSON comes in GOOGLE_SERVICE_ACCOUNT_JSON (a Worker secret).
 */
function serviceAccount(): { credential: Credential; projectId?: string } | null {
  const text = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!text) return null;
  const key = JSON.parse(text) as { project_id?: string; client_email: string; private_key: string };
  return {
    credential: cert({ projectId: key.project_id, clientEmail: key.client_email, privateKey: key.private_key.replace(/\\n/g, '\n') }),
    projectId: key.project_id,
  };
}

function app(): App {
  const existing = getApps()[0];
  if (existing) return existing;
  // The build prerenders pages without the Worker's secrets. Firestore's credential lookup would
  // fail in a background promise, which vinext's prerender rethrows and the build dies; fail here
  // instead, synchronously, so callers' error handling (fallback values) applies.
  if (process.env.VINEXT_PRERENDER === '1') throw new Error('Firebase is not available while prerendering');
  const account = serviceAccount();
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT
    || account?.projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    || (projectId ? `${projectId}.firebasestorage.app` : undefined);
  const emulated = Boolean(process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST);
  const credential = emulated ? undefined : (account?.credential ?? applicationDefault());
  return initializeApp({ projectId, storageBucket, ...(credential ? { credential } : {}) });
}

let firestore: Firestore | null = null;
export function db(): Firestore {
  if (firestore) return firestore;
  firestore = getFirestore(app());
  // gRPC needs raw sockets/HTTP2, which Workers lack; REST works everywhere (listeners aren't used server-side).
  firestore.settings({ ignoreUndefinedProperties: true, preferRest: Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON) });
  return firestore;
}

export const adminAuth = () => getAuth(app());
export const adminAppCheck = () => getAppCheck(app());
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
  billingEvents: 'billing_events',
  billingProducts: 'billing_products',
  planUsage: 'plan_usage',         // accounts/{id}/plan_usage
  creditLedger: 'credit_ledger',   // accounts/{id}/credit_ledger
  creditDailyFree: 'credit_daily_free', // accounts/{id}/credit_daily_free
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
