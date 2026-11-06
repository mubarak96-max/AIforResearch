import Stripe from 'stripe';
import { createHash } from 'node:crypto';
import { HTTPException } from 'hono/http-exception';
import { AggregateField } from 'firebase-admin/firestore';
import { C, col, db, rows } from '../firebase.js';
import { settings } from './settings.js';
import { CREDIT_PACKS, SERVICES, costMilli, packById, publicPrices, type ServiceName } from './prices.js';
import { stripeClient } from './stripeBilling.js';
import { ensureCustomer, setDefaultCard } from './planBilling.js';
import { mailReady, sendMail } from './mail.js';
import { lowCreditsEmail, topUpFailedEmail } from './emails.js';

/**
 * Developer API credits. Each account has a prepaid balance (bought in packs, topped up
 * automatically if the owner wants) and free credits every day for the services Scholar
 * answers. A call is checked before it runs and charged after it succeeds: free credits
 * first, then the balance. Amounts are kept in thousandths of a credit.
 *
 * Firestore: the balance is `accounts/{id}.credits_milli`; the day's free use is
 * `accounts/{id}/credit_daily_free/{YYYY-MM-DD}`; grants are `accounts/{id}/credit_ledger/ref_<hash>`
 * (the id comes from the grant's reference, so each Stripe session is credited once). Every
 * change to a balance runs in a transaction.
 */

const MILLI = 1000;
/** Below this balance (in credits) the owner gets one "running low" email a day. */
const LOW_BALANCE = 100;
export const CONSOLE_PATH = '/developers/keys';

const consoleUrl = (query = '') => `${settings().publicUrl.replace(/\/$/, '')}${CONSOLE_PATH}${query}`;
const credits = (milli: number | string) => Number(milli) / MILLI;
const num = (value: unknown) => Number(value ?? 0) || 0;
const positiveInt = (value: string, fallback: number) => {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) && number >= 0 ? number : fallback;
};

export const dailyFreeCredits = () => positiveInt(settings().cloudDailyFreeCredits, 1000);
export const starterCredits = () => positiveInt(settings().cloudStarterCredits, 100);

const utcDay = (now = new Date()) => now.toISOString().slice(0, 10);
const monthStart = (now = new Date()) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
const accountRef = (accountId: string) => col(C.accounts).doc(accountId);
const dailyRef = (accountId: string, day = utcDay()) => accountRef(accountId).collection(C.creditDailyFree).doc(day);
const ledgerRef = (accountId: string, reference: string) =>
  accountRef(accountId).collection(C.creditLedger).doc(`ref_${createHash('sha256').update(reference).digest('hex').slice(0, 40)}`);

/** usage_events ids are `{service}__{request id}`, so a retried request is never charged twice. */
export const usageEventId = (service: string, requestId: string) => `${service}__${requestId.replace(/\//g, '_').slice(0, 400)}`;

/** Midnight UTC tonight, when the free credits come back. */
const resetsAt = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString();
};

/** The people of an account, oldest first (one per account today; teams later). */
async function accountUsers(accountId: string) {
  const people = rows<{ id: string; email: string; email_verified_at: Date | null; created_at: Date | null }>(
    await col(C.users).where('account_id', '==', accountId).limit(50).get());
  return people.sort((a, b) => (a.created_at?.getTime() ?? 0) - (b.created_at?.getTime() ?? 0));
}

/** Free credits need a confirmed email (one allowance per real person). Without email set up, nobody can confirm. */
async function emailConfirmed(accountId: string) {
  if (!mailReady()) return true;
  return (await accountUsers(accountId)).some((person) => Boolean(person.email_verified_at));
}

/** Credits (free + paid, in thousandths) a key spent this month. */
async function keySpentMilli(keyId: string) {
  const snapshot = await col(C.usageEvents).where('api_key_id', '==', keyId).where('created_at', '>=', monthStart())
    .aggregate({ free: AggregateField.sum('free_milli'), paid: AggregateField.sum('paid_milli') }).get();
  return num(snapshot.data().free) + num(snapshot.data().paid);
}

export type Wallet = {
  balance: number;
  free_per_day: number;
  free_used: number;
  free_left: number;
  resets_at: string;
  email_confirmed: boolean;
};

export async function wallet(accountId: string): Promise<Wallet> {
  const [account, day, confirmed] = await Promise.all([accountRef(accountId).get(), dailyRef(accountId).get(), emailConfirmed(accountId)]);
  const perDay = confirmed ? dailyFreeCredits() : 0;
  const used = credits(num(day.get('used_milli')));
  return {
    balance: credits(num(account.get('credits_milli'))),
    free_per_day: perDay,
    free_used: used,
    free_left: Math.max(0, perDay - used),
    resets_at: resetsAt(),
    email_confirmed: confirmed,
  };
}

/** 402 with a code the client can act on (buy credits, confirm email, raise a key's cap). */
export class CreditsError extends HTTPException {
  constructor(message: string, readonly code: 'no_credits' | 'confirm_email' | 'key_cap') {
    super(402, { message });
  }
}

/** Throws unless the account can pay for one more call to `service` (and the key is under its cap). */
export async function assertCanSpend(accountId: string, service: ServiceName, key?: { id: string; monthly_credit_cap: number | null }) {
  if (key?.monthly_credit_cap != null) {
    if (credits(await keySpentMilli(key.id)) >= key.monthly_credit_cap) {
      throw new CreditsError(`This key reached its monthly cap of ${key.monthly_credit_cap.toLocaleString('en-US')} credits. Raise it at ${consoleUrl()}.`, 'key_cap');
    }
  }
  const current = await wallet(accountId);
  if (current.balance > 0) return current;
  if (SERVICES[service].free) {
    if (current.free_left > 0) return current;
    if (!current.email_confirmed) throw new CreditsError(`Confirm your email to get ${dailyFreeCredits().toLocaleString('en-US')} free credits a day, or buy credits at ${consoleUrl()}.`, 'confirm_email');
    throw new CreditsError(`Today's free credits are used up. They come back at midnight UTC, or buy credits at ${consoleUrl()}.`, 'no_credits');
  }
  throw new CreditsError(`You are out of credits. Buy credits at ${consoleUrl()}.`, 'no_credits');
}

export type Charge = {
  accountId: string;
  apiKeyId?: string | null;
  service: ServiceName;
  quantity: number;
  requestId: string;
  metadata?: Record<string, unknown>;
};

/**
 * Records a successful call and takes its cost: free credits first (for free services), then the
 * balance, which may dip below zero by one call. The request id makes retries free.
 */
export async function charge(event: Charge): Promise<{ free: number; paid: number; balance: number } | null> {
  const cost = costMilli(event.service, event.quantity);
  if (!cost) return null;
  const freeAllowance = SERVICES[event.service].free && (await emailConfirmed(event.accountId)) ? dailyFreeCredits() * MILLI : 0;
  const usageRef = col(C.usageEvents).doc(usageEventId(event.service, event.requestId));
  const account = accountRef(event.accountId);
  const day = dailyRef(event.accountId);
  const result = await db().runTransaction(async (tx) => {
    const [usage, daySnapshot, accountSnapshot] = await Promise.all([tx.get(usageRef), tx.get(day), tx.get(account)]);
    if (usage.exists) return null; // the same request again: already charged
    const usedToday = num(daySnapshot.get('used_milli'));
    const free = freeAllowance > 0 ? Math.min(cost, Math.max(0, freeAllowance - usedToday)) : 0;
    const paid = cost - free;
    const balance = num(accountSnapshot.get('credits_milli')) - paid;
    tx.create(usageRef, {
      account_id: event.accountId, api_key_id: event.apiKeyId ?? null, via_key: Boolean(event.apiKeyId), service: event.service,
      quantity: event.quantity, request_id: event.requestId, metadata: event.metadata ?? {},
      free_milli: free, paid_milli: paid, created_at: new Date(),
    });
    if (free > 0) tx.set(day, { day: utcDay(), used_milli: usedToday + free }, { merge: true });
    if (paid > 0 && accountSnapshot.exists) tx.update(account, { credits_milli: balance });
    return { free: credits(free), paid: credits(paid), balance: credits(balance) };
  });
  if (result && result.paid > 0) void afterSpend(event.accountId, result.balance).catch((error) => console.error('after-spend check failed', error));
  return result;
}

/** Adds credits once per reference (a Stripe session or payment, the starter grant, an admin grant). */
export async function grantCredits(input: {
  accountId: string; kind: 'purchase' | 'topup' | 'starter' | 'grant' | 'refund'; credits: number;
  amountCents?: number | null; reference: string; note?: string | null; createdBy?: string | null;
}): Promise<{ granted: boolean; balance?: number }> {
  const milli = Math.round(input.credits * MILLI);
  const entry = ledgerRef(input.accountId, input.reference);
  const account = accountRef(input.accountId);
  return db().runTransaction(async (tx) => {
    const [existing, accountSnapshot] = await Promise.all([tx.get(entry), tx.get(account)]);
    if (existing.exists || !accountSnapshot.exists) return { granted: false };
    const balance = num(accountSnapshot.get('credits_milli')) + milli;
    tx.create(entry, {
      kind: input.kind, credits_milli: milli, amount_cents: input.amountCents ?? null, reference: input.reference,
      note: input.note ?? null, created_by: input.createdBy ?? null, created_at: new Date(),
    });
    tx.update(account, {
      credits_milli: balance,
      low_balance_noticed_at: null,
      ...(input.kind === 'purchase' || input.kind === 'topup' ? { topup_error: null } : {}),
    });
    return { granted: true, balance: credits(balance) };
  });
}

/** The one-time starter credits, once the account has a confirmed email. */
export async function grantStarter(accountId: string) {
  const amount = starterCredits();
  if (!amount || !(await emailConfirmed(accountId))) return;
  const claimed = await db().runTransaction(async (tx) => {
    const snapshot = await tx.get(accountRef(accountId));
    if (!snapshot.exists || snapshot.get('starter_granted_at')) return false;
    tx.update(accountRef(accountId), { starter_granted_at: new Date() });
    return true;
  });
  if (claimed) await grantCredits({ accountId, kind: 'starter', credits: amount, reference: `starter:${accountId}`, note: 'Starter credits' });
}

// ------------------------------------------------------------------ buying credits

export async function startCreditCheckout(stripe: Stripe, accountId: string, packId: string) {
  const pack = packById(packId);
  if (!pack) throw new HTTPException(422, { message: 'Choose a credit pack.' });
  const customer = await ensureCustomer(stripe, accountId);
  const metadata = { writegrid_kind: 'credits', writegrid_account_id: accountId, pack: pack.id };
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer,
    allowed_payment_method_types: ['card'],
    line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: pack.cents, product_data: { name: `${pack.credits.toLocaleString('en-US')} WriteGrid credits` } } }],
    // The card is kept for automatic top-ups (only if the owner turns them on).
    payment_intent_data: { setup_future_usage: 'off_session', metadata },
    metadata,
    client_reference_id: accountId,
    success_url: consoleUrl('?credits=paid&session={CHECKOUT_SESSION_ID}'),
    cancel_url: consoleUrl('?credits=cancelled'),
  });
  return { url: session.url! };
}

const idOf = (value: string | { id: string } | null | undefined) => (typeof value === 'string' ? value : value?.id ?? null);

/** Credits for a paid Checkout session (from the webhook or the return page; whichever comes first). */
export async function grantForSession(session: Stripe.Checkout.Session) {
  if (session.metadata?.writegrid_kind !== 'credits' || session.payment_status !== 'paid') return { granted: false };
  const accountId = session.metadata.writegrid_account_id;
  const pack = packById(session.metadata.pack ?? '');
  if (!accountId || !pack) return { granted: false };
  return grantCredits({ accountId, kind: 'purchase', credits: pack.credits, amountCents: session.amount_total, reference: `checkout:${session.id}`, note: `${pack.credits.toLocaleString('en-US')} credits` });
}

/** Back from Checkout: credit the account at once and keep the card for top-ups. */
export async function completeCreditCheckout(stripe: Stripe, accountId: string, sessionId: string) {
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['payment_intent'] });
  const account = (await accountRef(accountId).get()).data() as { stripe_customer_id?: string | null } | undefined;
  if (!account?.stripe_customer_id || idOf(session.customer as any) !== account.stripe_customer_id || session.metadata?.writegrid_account_id !== accountId) {
    throw new HTTPException(403, { message: 'This payment belongs to another account.' });
  }
  if (session.payment_status !== 'paid') return { paid: false, ...(await wallet(accountId)) };
  await grantForSession(session);
  const intent = session.payment_intent && typeof session.payment_intent === 'object' ? (session.payment_intent as Stripe.PaymentIntent) : null;
  const card = idOf(intent?.payment_method as any);
  if (card) await setDefaultCard(stripe, accountId, card, { onlyIfNone: true }).catch((error) => console.warn('keeping card failed', (error as Error).message));
  return { paid: true, ...(await wallet(accountId)) };
}

// ------------------------------------------------------------------ automatic top-up and low balance

const toppingUp = new Set<string>();

type TopUpAccount = {
  topup_enabled: boolean; topup_threshold: number; topup_pack: string; topup_monthly_limit_cents: number;
  credits_milli: number; stripe_customer_id: string | null; low_balance_noticed_at: Date | null; topup_error: string | null;
};

async function topUpAccount(accountId: string): Promise<TopUpAccount | null> {
  const snapshot = await accountRef(accountId).get();
  if (!snapshot.exists) return null;
  const data = snapshot.data() as Record<string, any>;
  const noticed = data.low_balance_noticed_at;
  return {
    topup_enabled: Boolean(data.topup_enabled),
    topup_threshold: num(data.topup_threshold ?? 500),
    topup_pack: data.topup_pack ?? 'credits_2000',
    topup_monthly_limit_cents: num(data.topup_monthly_limit_cents ?? 10000),
    credits_milli: num(data.credits_milli),
    stripe_customer_id: data.stripe_customer_id ?? null,
    topup_error: data.topup_error ?? null,
    low_balance_noticed_at: noticed ? (typeof noticed.toDate === 'function' ? noticed.toDate() : new Date(noticed)) : null,
  };
}

async function ownerEmail(accountId: string) {
  return (await accountUsers(accountId))[0]?.email ?? null;
}

async function afterSpend(accountId: string, balance: number) {
  const account = await topUpAccount(accountId);
  if (!account) return;
  if (account.topup_enabled && balance < account.topup_threshold) {
    await topUp(accountId);
    return;
  }
  const recentlyTold = account.low_balance_noticed_at && Date.now() - account.low_balance_noticed_at.getTime() < 24 * 3600_000;
  if (balance < LOW_BALANCE && !recentlyTold && mailReady()) {
    const email = await ownerEmail(accountId);
    if (!email) return;
    await accountRef(accountId).update({ low_balance_noticed_at: new Date() });
    await sendMail(lowCreditsEmail(email, balance, consoleUrl())).catch((error) => console.error('low-credits email failed', (error as Error).message));
  }
}

async function stopTopUp(accountId: string, reason: string) {
  await accountRef(accountId).update({ topup_enabled: false, topup_error: reason });
  const email = mailReady() ? await ownerEmail(accountId) : null;
  if (email) await sendMail(topUpFailedEmail(email, reason, consoleUrl())).catch((error) => console.error('top-up email failed', (error as Error).message));
}

/** Top-ups charged this month, in cents. */
async function topUpCentsThisMonth(accountId: string) {
  const snapshot = await accountRef(accountId).collection(C.creditLedger).where('created_at', '>=', monthStart()).get();
  return snapshot.docs.filter((doc) => doc.get('kind') === 'topup').reduce((sum, doc) => sum + num(doc.get('amount_cents')), 0);
}

/**
 * Charges the saved card for the chosen pack when the balance is under the threshold (within the
 * monthly limit). `toppingUp` stops repeats inside one instance; across instances the Stripe
 * idempotency key (account, month total, 10-minute window) and the ledger reference stop doubles.
 */
export async function topUp(accountId: string) {
  if (toppingUp.has(accountId)) return { started: false };
  toppingUp.add(accountId);
  try {
    const account = await topUpAccount(accountId);
    if (!account?.topup_enabled || credits(account.credits_milli) >= account.topup_threshold) return { started: false };
    const pack = packById(account.topup_pack) ?? CREDIT_PACKS[0];
    const month = { cents: await topUpCentsThisMonth(accountId) };
    if (month.cents + pack.cents > account.topup_monthly_limit_cents) {
      await stopTopUp(accountId, `this month's top-up limit of $${(account.topup_monthly_limit_cents / 100).toFixed(2)} is reached.`);
      return { started: false };
    }
    const stripe = stripeClient();
    if (!stripe || !account.stripe_customer_id) {
      await stopTopUp(accountId, 'there is no saved card.');
      return { started: false };
    }
    const customer = await stripe.customers.retrieve(account.stripe_customer_id);
    const card = 'deleted' in customer ? null : idOf(customer.invoice_settings?.default_payment_method as any);
    if (!card) {
      await stopTopUp(accountId, 'there is no saved card.');
      return { started: false };
    }
    try {
      const intent = await stripe.paymentIntents.create({
        amount: pack.cents, currency: 'usd', customer: account.stripe_customer_id, payment_method: card,
        off_session: true, confirm: true, description: `${pack.credits.toLocaleString('en-US')} WriteGrid credits (automatic top-up)`,
        metadata: { writegrid_kind: 'credits_topup', writegrid_account_id: accountId, pack: pack.id },
      }, { idempotencyKey: `topup:${accountId}:${month.cents}:${Math.floor(Date.now() / 600_000)}` });
      if (intent.status === 'succeeded') {
        await grantCredits({ accountId, kind: 'topup', credits: pack.credits, amountCents: intent.amount, reference: `payment:${intent.id}`, note: 'Automatic top-up' });
        return { started: true, paid: true };
      }
      await stopTopUp(accountId, 'your bank asked for a confirmation we cannot do automatically. Buy credits once by hand.');
      return { started: true, paid: false };
    } catch (error) {
      await stopTopUp(accountId, (error as Error).message || 'the card was declined.');
      return { started: true, paid: false };
    }
  } finally {
    toppingUp.delete(accountId);
  }
}

/** Credits for a top-up payment the webhook reports (if the direct grant above was missed). */
export async function grantForPayment(intent: Stripe.PaymentIntent) {
  if (intent.metadata?.writegrid_kind !== 'credits_topup' || intent.status !== 'succeeded') return { granted: false };
  const pack = packById(intent.metadata.pack ?? '');
  const accountId = intent.metadata.writegrid_account_id;
  if (!pack || !accountId) return { granted: false };
  return grantCredits({ accountId, kind: 'topup', credits: pack.credits, amountCents: intent.amount, reference: `payment:${intent.id}`, note: 'Automatic top-up' });
}

// ------------------------------------------------------------------ the console

const SERVICE_ORDER = Object.keys(SERVICES);

/** The account's keys (live first, newest first) with what each spent this month. */
async function keysWithSpend(accountId: string) {
  const keys = rows<Record<string, any>>(await col(C.apiKeys).where('account_id', '==', accountId).get());
  const time = (value: unknown) => (value instanceof Date ? value.getTime() : 0);
  keys.sort((a, b) => Number(Boolean(a.revoked_at)) - Number(Boolean(b.revoked_at)) || time(b.created_at) - time(a.created_at));
  return Promise.all(keys.map(async (key) => ({
    id: key.id, name: key.name, prefix: key.prefix, mode: key.mode, monthly_credit_cap: key.monthly_credit_cap ?? null,
    created_at: key.created_at ?? null, last_used_at: key.last_used_at ?? null, revoked_at: key.revoked_at ?? null,
    credits_this_month: (await keySpentMilli(key.id)) / 1000,
  })));
}

/** This month's calls made with the account's keys, per service (one aggregate query per service). */
async function usageThisMonth(accountId: string) {
  const since = monthStart();
  const lines = await Promise.all(SERVICE_ORDER.map(async (service) => {
    const snapshot = await col(C.usageEvents)
      .where('account_id', '==', accountId).where('via_key', '==', true).where('service', '==', service).where('created_at', '>=', since)
      .aggregate({
        calls: AggregateField.count(), quantity: AggregateField.sum('quantity'),
        free: AggregateField.sum('free_milli'), paid: AggregateField.sum('paid_milli'),
      }).get();
    const data = snapshot.data();
    return { service, quantity: num(data.quantity), calls: num(data.calls), free: num(data.free) / 1000, paid: num(data.paid) / 1000 };
  }));
  return lines.filter((line) => line.calls > 0);
}

/** Everything the keys-and-credits page shows. */
export async function creditOverview(accountId: string) {
  await grantStarter(accountId).catch((error) => console.error('starter credits failed', error));
  const [current, keys, usage, ledger, account] = await Promise.all([
    wallet(accountId),
    keysWithSpend(accountId),
    usageThisMonth(accountId),
    accountRef(accountId).collection(C.creditLedger).orderBy('created_at', 'desc').limit(12).get()
      .then((snapshot) => rows<Record<string, any>>(snapshot).map((entry) => ({
        kind: entry.kind, credits: num(entry.credits_milli) / 1000, amount_cents: entry.amount_cents ?? null, note: entry.note ?? null, created_at: entry.created_at,
      }))),
    topUpAccount(accountId),
  ]);
  let payments = false;
  try { payments = Boolean(stripeClient()); } catch { payments = false; }
  return {
    wallet: current,
    starter_credits: starterCredits(),
    keys,
    usage: usage
      .map((line) => ({ ...line, label: SERVICES[line.service as ServiceName]?.label ?? line.service, credits: Math.round((line.free + line.paid) * 1000) / 1000 }))
      .sort((a, b) => SERVICE_ORDER.indexOf(a.service) - SERVICE_ORDER.indexOf(b.service)),
    ledger,
    topup: account ? {
      enabled: account.topup_enabled, threshold: account.topup_threshold, pack: account.topup_pack,
      monthly_limit_usd: account.topup_monthly_limit_cents / 100, error: account.topup_error,
    } : null,
    payments_enabled: payments,
    ...publicPrices(),
  };
}
