/**
 * Copies a self-hosted ResearchCove (Postgres + files) into a Firebase project, following
 * docs/data-model.md. Run from the repository root:
 *
 *   DATABASE_URL=postgres://researchcove:…@host:5432/researchcove \
 *   FILES_DIR=/path/to/files \
 *   FIREBASE_PROJECT_ID=your-project FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app \
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json \
 *   pnpm migrate [--only=users,documents,…] [--dry-run]
 *
 * Re-running is safe: every write uses the old id, so it overwrites with the same data.
 * See tools/migrate/README.md for what moves and what does not.
 */
import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import postgres from 'postgres';
import { cert, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth, type UserImportRecord } from 'firebase-admin/auth';
import { getFirestore, type DocumentReference, type Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { searchTerms } from '../../lib/server/firebase.ts';
import { blocksToText } from '../../lib/server/lib/blocks.ts';

const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, value] = arg.replace(/^--/, '').split('=');
  return [key, value ?? 'true'] as const;
}));
const dryRun = args.get('dry-run') === 'true';
const only = args.get('only')?.split(',').map((value) => value.trim());
const want = (step: string) => !only || only.includes(step);

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('Set DATABASE_URL to the old Postgres database.');
const projectId = process.env.FIREBASE_PROJECT_ID;
if (!projectId) throw new Error('Set FIREBASE_PROJECT_ID.');
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`;
const filesDir = process.env.FILES_DIR || '';

const credential = process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.FIRESTORE_EMULATOR_HOST
  ? cert(JSON.parse(await readFile(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8')))
  : process.env.FIRESTORE_EMULATOR_HOST ? undefined : applicationDefault();
initializeApp({ projectId, storageBucket, ...(credential ? { credential } : {}) });
const db: Firestore = getFirestore();
db.settings({ ignoreUndefinedProperties: true });
const auth = getAuth();
const bucket = getStorage().bucket();
const sql = postgres(databaseUrl, { max: 4 });

const sha1 = (value: string) => createHash('sha1').update(value).digest('hex');
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const log = (...parts: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...parts);

/** Column names stay field names; nulls stay nulls; numeric strings from bigint become numbers. */
function clean(row: Record<string, unknown>, drop: string[] = []) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (drop.includes(key) || key === 'id') continue;
    out[key] = typeof value === 'bigint' ? Number(value) : value;
  }
  return out;
}

/** Batched writes (Firestore takes 500 per batch). */
class Writer {
  private batch = db.batch();
  private pending = 0;
  count = 0;
  async set(ref: DocumentReference, data: Record<string, unknown>) {
    this.count += 1;
    if (dryRun) return;
    this.batch.set(ref, data);
    if (++this.pending >= 400) await this.flush();
  }
  async flush() {
    if (!this.pending || dryRun) return;
    await this.batch.commit();
    this.batch = db.batch();
    this.pending = 0;
  }
}

async function tableExists(name: string) {
  const [row] = await sql`select to_regclass(${name}) as found`;
  return Boolean(row?.found);
}

async function save(key: string, bytes: Buffer | Uint8Array, contentType: string) {
  if (dryRun) return;
  await bucket.file(key).save(Buffer.from(bytes), { contentType, resumable: bytes.byteLength > 8 * 1024 * 1024 });
}

// ---------------------------------------------------------------------------------------

async function migrateAccounts() {
  const writer = new Writer();
  for await (const batch of sql`select * from accounts`.cursor(500)) {
    for (const account of batch) await writer.set(db.collection('accounts').doc(account.id), clean(account));
  }
  if (await tableExists('plan_usage')) {
    for await (const batch of sql`select * from plan_usage`.cursor(1000)) {
      for (const use of batch) {
        await writer.set(db.collection('accounts').doc(use.account_id).collection('plan_usage').doc(`${use.key}__${use.period}`),
          { key: use.key, period: use.period, amount: Number(use.amount) });
      }
    }
  }
  if (await tableExists('credit_ledger')) {
    for await (const batch of sql`select * from credit_ledger`.cursor(1000)) {
      for (const entry of batch) {
        const id = entry.reference ? `ref_${sha256(entry.reference).slice(0, 40)}` : String(entry.id);
        await writer.set(db.collection('accounts').doc(entry.account_id).collection('credit_ledger').doc(id), clean(entry, ['account_id']));
      }
    }
  }
  if (await tableExists('credit_daily_free')) {
    for await (const batch of sql`select account_id, to_char(day, 'YYYY-MM-DD') as day, used_milli from credit_daily_free`.cursor(1000)) {
      for (const day of batch) {
        await writer.set(db.collection('accounts').doc(day.account_id).collection('credit_daily_free').doc(day.day), { used_milli: Number(day.used_milli) });
      }
    }
  }
  await writer.flush();
  log(`accounts: ${writer.count} documents`);
}

const PROVIDER_IDS: Record<string, string> = { google: 'google.com', microsoft: 'microsoft.com', apple: 'apple.com' };
const isBcrypt = (hash: string) => /^\$2[aby]\$\d{2}\$/.test(hash);

/**
 * People: users/{id} in Firestore, and the same uid in Firebase Auth. Bcrypt passwords import
 * into Firebase as they are; argon2 ones go to legacy_passwords (moved on first sign-in).
 */
async function migrateUsers() {
  const writer = new Writer();
  const identities = new Map<string, { provider: string; subject: string; email: string | null }[]>();
  if (await tableExists('user_identities')) {
    for (const identity of await sql`select user_id, provider, subject, email from user_identities`) {
      const list = identities.get(identity.user_id) ?? [];
      list.push(identity as any);
      identities.set(identity.user_id, list);
    }
  }

  let imported = 0, legacy = 0, failed = 0;
  for await (const batch of sql`select * from users order by created_at`.cursor(1000)) {
    const records: UserImportRecord[] = [];
    for (const user of batch) {
      const email = String(user.email).toLowerCase();
      await writer.set(db.collection('users').doc(user.id), {
        ...clean(user, ['password_hash', 'legacy_id', 'legacy_reset_sent_at']), email, is_admin: Boolean(user.is_admin),
        newsletter_opt_out: Boolean(user.newsletter_opt_out), newsletter_dirty: Boolean(user.newsletter_dirty),
        newsletter_synced: user.newsletter_synced ?? null,
        // Explicit nulls: Firestore's `== null` does not match a missing field.
        newsletter_error: user.newsletter_error ?? null, disabled_at: user.disabled_at ?? null, email_verified_at: user.email_verified_at ?? null,
      });
      const hash: string | null = user.password_hash;
      const record: UserImportRecord = {
        uid: user.id, email, emailVerified: Boolean(user.email_verified_at), displayName: user.full_name || undefined,
        disabled: Boolean(user.disabled_at),
        metadata: { creationTime: new Date(user.created_at).toUTCString(), lastSignInTime: user.last_seen_at ? new Date(user.last_seen_at).toUTCString() : undefined },
        providerData: (identities.get(user.id) ?? []).filter((identity) => PROVIDER_IDS[identity.provider]).map((identity) => ({
          uid: identity.subject, providerId: PROVIDER_IDS[identity.provider], email: identity.email || email,
        })),
      };
      if (hash && isBcrypt(hash)) record.passwordHash = Buffer.from(hash.replace(/^\$2y\$/, '$2b$'));
      else if (hash) {
        legacy += 1;
        await writer.set(db.collection('legacy_passwords').doc(email), { hash, user_id: user.id, created_at: new Date() });
      }
      records.push(record);
    }
    await writer.flush();
    if (!dryRun && records.length) {
      const result = await auth.importUsers(records, { hash: { algorithm: 'BCRYPT' } });
      imported += result.successCount;
      failed += result.failureCount;
      for (const error of result.errors.slice(0, 10)) log(`  auth import failed for ${records[error.index]?.email}: ${error.error.message}`);
    } else imported += records.length;
  }
  log(`users: ${writer.count} documents; Firebase Auth: ${imported} imported, ${failed} failed; ${legacy} argon2 passwords kept for first sign-in`);
}

async function migrateDocuments() {
  const writer = new Writer();
  const members = new Map<string, any[]>();
  for (const member of await sql`select * from document_members`) {
    const list = members.get(member.document_id) ?? [];
    list.push(member);
    members.set(member.document_id, list);
  }
  let files = 0;
  for await (const batch of sql`select * from documents`.cursor(50)) {
    for (const document of batch) {
      const blocks = Array.isArray(document.blocks) ? document.blocks : [];
      const own = members.get(document.id) ?? [];
      const memberIds = [...new Set([document.owner_user_id, ...own.filter((m) => m.status === 'active' && m.user_id).map((m) => m.user_id)])];
      await save(`documents/${document.id}/blocks.json`, Buffer.from(JSON.stringify(blocks)), 'application/json');
      if (document.ydoc) { await save(`documents/${document.id}/ydoc.bin`, document.ydoc, 'application/octet-stream'); files += 1; }
      files += 1;
      await writer.set(db.collection('documents').doc(document.id), {
        ...clean(document, ['blocks', 'ydoc', 'search']),
        comments: document.comments ?? [], activity: document.activity ?? [], share_settings: document.share_settings ?? {},
        has_ydoc: Boolean(document.ydoc), member_ids: memberIds,
        search_terms: searchTerms(`${document.title}\n${blocksToText(blocks).slice(0, 200_000)}`),
      });
      for (const member of own) {
        await writer.set(db.collection('documents').doc(document.id).collection('members').doc(sha1(String(member.invite_email).trim().toLowerCase())), {
          ...clean(member, ['document_id']), invite_email: String(member.invite_email).toLowerCase(), user_id: member.user_id ?? null,
        });
      }
    }
  }
  for await (const batch of sql`select * from document_versions`.cursor(50)) {
    for (const version of batch) {
      await save(`documents/${version.document_id}/versions/${version.id}.json`, Buffer.from(JSON.stringify(version.blocks ?? [])), 'application/json');
      files += 1;
      await writer.set(db.collection('documents').doc(version.document_id).collection('versions').doc(version.id), clean(version, ['blocks', 'document_id']));
    }
  }
  for await (const batch of sql`select * from chat_threads`.cursor(200)) {
    for (const thread of batch) {
      const messages = Array.isArray(thread.messages) ? thread.messages : [];
      await writer.set(db.collection('chat_threads').doc(thread.id), { ...clean(thread), messages, message_count: messages.length });
    }
  }
  if (await tableExists('assets')) {
    for (const asset of await sql`select * from assets`) await writer.set(db.collection('assets').doc(asset.id), clean(asset));
  }
  await writer.flush();
  log(`documents: ${writer.count} documents, ${files} files`);
}

async function migrateLibrary() {
  const writer = new Writer();
  for (const folder of await sql`select * from library_folders`) await writer.set(db.collection('library_folders').doc(folder.id), clean(folder));
  for await (const batch of sql`select * from library_documents`.cursor(500)) {
    for (const item of batch) {
      const doiLower = item.doi ? String(item.doi).toLowerCase() : null;
      await writer.set(db.collection('library_documents').doc(item.id), {
        ...clean(item), authors: item.authors ?? [], metadata: item.metadata ?? {}, doi_lower: doiLower, external_id: item.external_id ?? null, folder_id: item.folder_id ?? null,
        file_path: item.file_path ? String(item.file_path).replace(/^.*?\/(library\/)/, '$1') : null,
      });
      const marker = { user_id: item.user_id, document_id: item.id, created_at: new Date() };
      if (doiLower) await writer.set(db.collection('library_doi').doc(`${item.user_id}__${sha1(doiLower)}`), marker);
      if (item.external_id) await writer.set(db.collection('library_doi').doc(`${item.user_id}__ext_${sha1(item.external_id)}`), marker);
    }
  }
  let chunks = 0;
  for await (const batch of sql`
    select c.document_id, c.chunk_index, c.page, c.content, d.user_id
    from library_chunks c join library_documents d on d.id = c.document_id`.cursor(1000)) {
    for (const chunk of batch) {
      chunks += 1;
      await writer.set(db.collection('library_documents').doc(chunk.document_id).collection('chunks').doc(String(chunk.chunk_index)), {
        user_id: chunk.user_id, document_id: chunk.document_id, chunk_index: chunk.chunk_index, page: chunk.page,
        content: chunk.content, terms: searchTerms(chunk.content, 200),
      });
    }
  }
  if (await tableExists('library_connections')) {
    for (const connection of await sql`select * from library_connections`) {
      await writer.set(db.collection('library_connections').doc(`${connection.user_id}__${connection.provider}`), clean(connection));
    }
  }
  await writer.flush();
  log(`library: ${writer.count} documents (${chunks} text chunks; embeddings are made later, see README)`);
}

async function migrateCloud() {
  const writer = new Writer();
  for (const key of await sql`select * from api_keys`) await writer.set(db.collection('api_keys').doc(key.id), { ...clean(key), revoked_at: key.revoked_at ?? null });
  for await (const batch of sql`select * from usage_events`.cursor(2000)) {
    for (const event of batch) {
      await writer.set(db.collection('usage_events').doc(`${event.service}__${event.request_id}`), {
        ...clean(event), quantity: Number(event.quantity), via_key: Boolean(event.api_key_id),
        free_milli: Number(event.free_milli ?? 0), paid_milli: Number(event.paid_milli ?? 0),
      });
    }
  }
  if (await tableExists('plans')) {
    const features = await sql`select * from plan_features order by plan_id, sort_order`;
    for (const plan of await sql`select * from plans`) {
      await writer.set(db.collection('plans').doc(plan.id), {
        ...clean(plan), limits: plan.limits ?? {},
        features: features.filter((feature) => feature.plan_id === plan.id).map((feature) => ({ label: feature.label, included: feature.included, sort_order: feature.sort_order })),
      });
    }
  }
  // Admin settings are not copied: the old install encrypted them with a different key
  // derivation, so the new app could not read them. Enter them again in Admin after the move.
  const settingsCount = (await sql`select count(*)::int as n from app_settings`)[0]?.n ?? 0;
  if (settingsCount) log(`app_settings: ${settingsCount} saved Admin settings skipped; enter them again in Admin`);
  if (await tableExists('stripe_events')) {
    for (const event of await sql`select * from stripe_events`) await writer.set(db.collection('stripe_events').doc(event.id), clean(event));
  }
  for (const entry of await sql`select * from admin_audit`) await writer.set(db.collection('admin_audit').doc(String(entry.id)), clean(entry));
  await writer.flush();
  log(`cloud, plans, settings: ${writer.count} documents`);
}

const TYPES: Record<string, string> = { pdf: 'application/pdf', json: 'application/json', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };

/** Every file under FILES_DIR goes to the bucket under the same key (library/…, assets/…, …). */
async function migrateFiles() {
  if (!filesDir) { log('files: FILES_DIR not set, skipped (sync an S3 bucket to a folder first: `aws s3 sync s3://bucket ./files`)'); return; }
  let copied = 0, skipped = 0;
  const walk = async (dir: string, prefix: string): Promise<void> => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const key = prefix ? `${prefix}/${entry.name}` : entry.name;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { await walk(full, key); continue; }
      if (!entry.isFile() || key.startsWith('researchcove-check/')) continue;
      const [exists] = dryRun ? [false] : await bucket.file(key).exists();
      if (exists) { skipped += 1; continue; }
      const info = await stat(full);
      await save(key, await readFile(full), TYPES[key.split('.').pop()?.toLowerCase() ?? ''] ?? 'application/octet-stream');
      copied += 1;
      if (copied % 200 === 0) log(`  files: ${copied} copied (${Math.round(info.size / 1024)} KB last)`);
    }
  };
  await walk(path.resolve(filesDir), '');
  log(`files: ${copied} copied, ${skipped} already there`);
}

// ---------------------------------------------------------------------------------------

log(`migrating to ${projectId}${dryRun ? ' (dry run: nothing is written)' : ''}`);
if (want('accounts')) await migrateAccounts();
if (want('users')) await migrateUsers();
if (want('documents')) await migrateDocuments();
if (want('library')) await migrateLibrary();
if (want('cloud')) await migrateCloud();
if (want('files')) await migrateFiles();
await sql.end();
log('done');
