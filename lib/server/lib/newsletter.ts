import { AggregateField, C, chunked, col, db } from '../firebase.js';
import { settings, type EffectiveSettings } from './settings.js';

/**
 * Newsletter on MailCheap (mailcheap.ai): WriteOrbit keeps the list in step with its accounts.
 * People with a confirmed email are added (tag "writeorbit"); anyone can leave from the
 * account page or any newsletter's unsubscribe link, and WriteOrbit mirrors those leavers back.
 * WriteOrbit's own account emails go through Admin › Email, not MailCheap.
 */

export const MAILCHEAP_URL = 'https://mailcheap.ai/api/v1';
const RETRY = new Set(['rate_limited', 'unavailable', 'internal_error']);

export class MailCheapError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(`MailCheap ${status} ${code}: ${message}`);
  }
}

type Contact = { email?: string; status?: string };
export type ImportRow = { email: string; status: 'active' | 'unsubscribed'; firstName?: string; tags: string[] };

export class MailCheap {
  constructor(
    private readonly apiKey: string,
    private readonly newsletter: string | null,
    private readonly fetcher: typeof fetch = fetch,
    private readonly baseUrl = MAILCHEAP_URL,
    private readonly pauseMs = 1000,
  ) {}

  private async call<T>(method: string, path: string, options: { body?: Record<string, unknown>; query?: Record<string, string | number | undefined | null> } = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [name, value] of Object.entries(options.query ?? {})) if (value !== undefined && value !== null && value !== '') url.searchParams.set(name, String(value));
    let wait = this.pauseMs;
    for (let attempt = 1; ; attempt += 1) {
      let response: Response;
      try {
        response = await this.fetcher(url, {
          method,
          headers: { Authorization: `Bearer ${this.apiKey}`, Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: AbortSignal.timeout(30_000),
        });
      } catch (error) {
        if (attempt >= 3) throw new MailCheapError(0, 'unavailable', (error as Error).message);
        await new Promise((resolve) => setTimeout(resolve, wait)); wait *= 2;
        continue;
      }
      const text = await response.text();
      const json = text ? (() => { try { return JSON.parse(text); } catch { return null; } })() : {};
      if (response.ok) return (json ?? {}) as T;
      const error = (json && typeof json === 'object' && (json as any).error) || {};
      const code = String(error.code || (response.status === 429 ? 'rate_limited' : response.status >= 500 ? 'unavailable' : 'error'));
      if (RETRY.has(code) && attempt < 3) {
        const after = Number(response.headers.get('retry-after'));
        await new Promise((resolve) => setTimeout(resolve, Number.isFinite(after) && after > 0 ? Math.min(after * 1000, 10_000) : wait)); wait *= 2;
        continue;
      }
      throw new MailCheapError(response.status, code, String(error.message || text.slice(0, 200) || response.statusText));
    }
  }

  private withNewsletter<T extends Record<string, unknown>>(body: T) {
    return this.newsletter ? { ...body, newsletter: this.newsletter } : body;
  }

  billing() {
    return this.call<{ billing?: { plan?: { name?: string } | string }; usage?: { subscribers?: number; subscribersLimit?: number } }>('GET', '/billing');
  }

  async newsletters() {
    const data = await this.call<{ newsletters?: { name?: string; slug?: string }[] } | { name?: string; slug?: string }[]>('GET', '/newsletters');
    return Array.isArray(data) ? data : data.newsletters ?? [];
  }

  /** Adds or updates up to 1,000 contacts (they agreed through their WriteOrbit account). */
  importContacts(contacts: ImportRow[]) {
    return this.call<{ importId?: string }>('POST', '/contacts/import', { body: this.withNewsletter({ consent: true, contacts }) });
  }

  setStatus(email: string, status: 'active' | 'unsubscribed') {
    return this.call('PATCH', `/contacts/${encodeURIComponent(email).replace(/%40/g, '@')}`, { body: this.withNewsletter(status === 'active' ? { status, consent: true } : { status }) });
  }

  async *contacts(status: string): AsyncGenerator<Contact> {
    let cursor: string | undefined;
    for (let page = 0; page < 1000; page += 1) {
      const data = await this.call<{ contacts?: Contact[]; nextCursor?: string }>('GET', '/contacts', { query: { newsletter: this.newsletter, status, limit: 100, cursor } });
      for (const contact of data.contacts ?? []) yield contact;
      if (!data.nextCursor) return;
      cursor = data.nextCursor;
    }
  }
}

export const newsletterOn = (s: EffectiveSettings = settings()) => s.newsletterProvider === 'mailcheap' && Boolean(s.mailcheapApiKey);
export const mailcheap = (s: EffectiveSettings = settings()) => new MailCheap(s.mailcheapApiKey, s.mailcheapNewsletter || null);

/** Plan and contact count, for the admin's Test connection. */
export async function describeMailCheap(client = mailcheap()) {
  const [billing, lists] = await Promise.all([client.billing(), client.newsletters().catch(() => [])]);
  const plan = billing.billing?.plan;
  const usage = billing.usage ?? {};
  return {
    plan: typeof plan === 'string' ? plan : plan?.name ?? null,
    contacts: typeof usage.subscribers === 'number' ? usage.subscribers : null,
    limit: typeof usage.subscribersLimit === 'number' ? usage.subscribersLimit : null,
    newsletters: lists.map((list) => list.slug || list.name).filter(Boolean) as string[],
  };
}

export type SyncResult = { ran_at: string; imported: number; updated: number; mirrored: number; failed: number; error: string | null };
let lastSync: SyncResult | null = null;
let running: Promise<SyncResult> | null = null;
export const lastNewsletterSync = () => lastSync;

const LEAVER_STATUSES = ['unsubscribed', 'bounced', 'complained'] as const;

const users = () => col(C.users);
const HOUR = 3600_000;
const toMillis = (value: any) => (value && typeof value.toDate === 'function' ? value.toDate().getTime() : value instanceof Date ? value.getTime() : null);

/** Writes the same change to many users (Firestore batches take 500 writes). */
async function updateMany(ids: string[], change: Record<string, unknown>) {
  for (const group of chunked(ids, 400)) {
    const batch = db().batch();
    for (const id of group) batch.update(users().doc(id), change);
    await batch.commit();
  }
}

/**
 * Confirmed people waiting to be added: never sent, not opted out, not disabled, and not
 * retried within the hour after an error. Paged so a run of recent errors cannot hide others.
 */
async function waitingForImport(limit: number) {
  const found: { id: string; email: string; full_name: string | null }[] = [];
  let query = users()
    .where('newsletter_synced', '==', null).where('newsletter_opt_out', '==', false).where('email_verified_at', '!=', null)
    .orderBy('email_verified_at').limit(1000);
  for (let page = 0; page < 10 && found.length < limit; page += 1) {
    const snapshot = await query.get();
    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data.disabled_at) continue;
      const syncedAt = toMillis(data.newsletter_synced_at);
      if (data.newsletter_error && syncedAt !== null && syncedAt > Date.now() - HOUR) continue;
      found.push({ id: doc.id, email: data.email, full_name: data.full_name ?? null });
      if (found.length >= limit) break;
    }
    if (snapshot.size < 1000) break;
    query = query.startAfter(snapshot.docs[snapshot.docs.length - 1]);
  }
  return found;
}

/**
 * One pass: (1) people who left through a MailCheap link are marked unsubscribed here,
 * (2) choices changed on the account page are sent, (3) new confirmed accounts are added.
 * The `newsletterSync` Cloud Function runs it every 15 minutes.
 */
export function syncNewsletter(client = mailcheap()): Promise<SyncResult> {
  if (running) return running;
  running = (async () => {
    const result: SyncResult = { ran_at: new Date().toISOString(), imported: 0, updated: 0, mirrored: 0, failed: 0, error: null };
    try {
      for (const status of LEAVER_STATUSES) {
        const emails: string[] = [];
        for await (const contact of client.contacts(status)) if (contact.email) emails.push(contact.email.toLowerCase());
        for (const group of chunked([...new Set(emails)], 30)) {
          const snapshot = await users().where('email', 'in', group).get();
          const ids = snapshot.docs.filter((doc) => !doc.get('newsletter_dirty') && doc.get('newsletter_synced') !== status).map((doc) => doc.id);
          await updateMany(ids, { newsletter_opt_out: true, newsletter_synced: status, newsletter_synced_at: new Date(), newsletter_error: null });
          result.mirrored += ids.length;
        }
      }

      const dirty = await users().where('newsletter_dirty', '==', true).limit(1000).get();
      // Never sent: the import below sends their choice, so nothing to change in MailCheap.
      await updateMany(dirty.docs.filter((doc) => !doc.get('newsletter_synced')).map((doc) => doc.id), { newsletter_dirty: false });
      const changed = dirty.docs.filter((doc) => doc.get('newsletter_synced')).slice(0, 500)
        .map((doc) => ({ id: doc.id, email: String(doc.get('email')), newsletter_opt_out: Boolean(doc.get('newsletter_opt_out')) }));
      for (const row of changed) {
        const status = row.newsletter_opt_out ? 'unsubscribed' : 'active';
        try {
          await client.setStatus(row.email, status);
          await users().doc(row.id).update({ newsletter_synced: status, newsletter_synced_at: new Date(), newsletter_dirty: false, newsletter_error: null });
          result.updated += 1;
        } catch (error) {
          // Deleted in MailCheap: added again below if they still want the newsletter.
          if (error instanceof MailCheapError && error.code === 'not_found') {
            await users().doc(row.id).update({ newsletter_synced: null, newsletter_dirty: false, newsletter_error: null });
          } else {
            await users().doc(row.id).update({ newsletter_error: (error as Error).message.slice(0, 300) });
            result.failed += 1;
          }
        }
      }

      for (let batch = 0; batch < 20; batch += 1) {
        const fresh = await waitingForImport(1000);
        if (!fresh.length) break;
        const ids = fresh.map((row) => row.id);
        try {
          await client.importContacts(fresh.map((row) => ({
            email: row.email, status: 'active', tags: ['writeorbit'], ...(row.full_name ? { firstName: row.full_name.split(/\s+/)[0] } : {}),
          })));
          await updateMany(ids, { newsletter_synced: 'active', newsletter_synced_at: new Date(), newsletter_error: null, newsletter_dirty: false });
          result.imported += ids.length;
        } catch (error) {
          // Retried after an hour (for example once the MailCheap plan has room again).
          await updateMany(ids, { newsletter_error: (error as Error).message.slice(0, 300), newsletter_synced_at: new Date() });
          result.failed += ids.length;
          result.error = (error as Error).message.slice(0, 300);
          break;
        }
        if (fresh.length < 1000) break;
      }
    } catch (error) {
      result.error = (error as Error).message.slice(0, 300);
    }
    lastSync = result;
    return result;
  })().finally(() => { running = null; });
  return running;
}

/** Counts for Admin › Newsletter (aggregate queries; disabled people are left out). */
export async function newsletterCounts() {
  const active = () => users().where('disabled_at', '==', null);
  const count = async (query: FirebaseFirestore.Query) => (await query.aggregate({ n: AggregateField.count() }).get()).data().n;
  const [subscribed, left, waiting, unconfirmed, errors] = await Promise.all([
    count(active().where('newsletter_synced', '==', 'active').where('newsletter_opt_out', '==', false)),
    count(active().where('newsletter_opt_out', '==', true)),
    count(active().where('newsletter_synced', '==', null).where('newsletter_opt_out', '==', false).where('email_verified_at', '!=', null)),
    count(active().where('email_verified_at', '==', null).where('newsletter_opt_out', '==', false)),
    count(active().where('newsletter_error', '!=', null)),
  ]);
  return { subscribed, left, waiting, unconfirmed, errors };
}

/**
 * Kept for callers (sign-up, confirmed email, changed choice). There is no long-lived process to
 * hold a timer any more: the change is already saved (newsletter_dirty, or a confirmed account
 * with newsletter_synced null) and the scheduled `newsletterSync` function sends it.
 */
export function queueNewsletterSync(_delayMs = 20_000) {
  /* picked up by the next scheduled run */
}

/** Scheduling moved to Cloud Functions (functions/src/index.ts, every 15 minutes). */
export function startNewsletterSync() {
  /* see functions/ */
}

/** The person's own choice from the account page; sent to MailCheap at once when possible. */
export async function setNewsletterChoice(userId: string, subscribed: boolean) {
  const ref = users().doc(userId);
  const snapshot = await ref.get();
  if (!snapshot.exists) return;
  await ref.update({ newsletter_opt_out: !subscribed, newsletter_dirty: true, newsletter_error: null });
  const row = { email: String(snapshot.get('email')), newsletter_synced: (snapshot.get('newsletter_synced') ?? null) as string | null };
  if (!newsletterOn() || !row.newsletter_synced) return;
  try {
    const status = subscribed ? 'active' : 'unsubscribed';
    await mailcheap().setStatus(row.email, status);
    await ref.update({ newsletter_synced: status, newsletter_synced_at: new Date(), newsletter_dirty: false });
  } catch (error) {
    console.error(`newsletter: choice for user ${userId} not sent yet: ${(error as Error).message}`);
  }
}
