/**
 * One-time purchases on Dodo Payments: credit top-ups and the Defence Pass.
 *
 * Packs (prices in cents, in step with docs/redesign/03-pricing.md):
 * - topup_500: 500 credits for $7 · topup_2000: 2,000 credits for $24. Paid plans only. Kept 12 months.
 * - pass_defence: 90 days of Pro for $49, once, no renewal. On an account that already pays for a
 *   live subscription, the pass becomes 4,500 top-up credits (90 days of Pro credits) instead, so it
 *   never overwrites the subscription.
 *
 * Products are made on the first checkout, like the plans (planBilling.syncPlanToDodo): one per
 * pack, stored as billing_products/{pack} and remade when the price or mode changes.
 *
 * Each purchase is a lot, accounts/{id}/credit_purchases/{payment_id}: { pack, kind, credits,
 * cents, expires_at, status }. credit_purchase_payments/{payment_id} points back to the account,
 * so a refund finds its lot. The webhook (payment.succeeded) and the page the buyer returns to
 * (completePurchase) both apply a payment; the lot's id makes it count once.
 *
 * Expiry rule (top-ups): the top-up balance is spent oldest lot first. When a lot passes its
 * expires_at, the part of it not yet spent is taken off the balance. Credits added without a lot
 * (a goodwill gift) are spent last and never expire. The sweep runs whenever credits are read
 * from the billing routes (sweepExpiredTopups).
 */
import type DodoPayments from 'dodopayments';
import { C, col, db, rows } from '../firebase.js';
import { settings } from './settings.js';
import { billingMode, dodoCurrency, type Dodo } from './dodoBilling.js';
import { ensureCustomer } from './planBilling.js';
import { LIVE_STATUSES, PlanLimitError, effectivePlan } from './plans.js';

export const PACKS = {
  topup_500: { kind: 'topup', name: '500 credits', credits: 500, cents: 700, days: 0 },
  topup_2000: { kind: 'topup', name: '2,000 credits', credits: 2000, cents: 2400, days: 0 },
  pass_defence: { kind: 'pass', name: 'Defence Pass', credits: 0, cents: 4900, days: 90 },
} as const;
export type PackId = keyof typeof PACKS;
export const TOPUP_PACKS = ['topup_500', 'topup_2000'] as const;

/** Top-up credits last a year; a pass on a subscribed account turns into 90 days of Pro credits. */
export const TOPUP_VALID_DAYS = 365;
export const PASS_AS_CREDITS = 3 * 1500;
const DAY = 86_400_000;
const PAYMENTS = 'credit_purchase_payments';

const appUrl = (path: string) => `${settings().publicUrl.replace(/\/$/, '')}${path}`;
const accountRef = (accountId: string) => col(C.accounts).doc(accountId);
const lotRef = (accountId: string, paymentId: string) => accountRef(accountId).collection('credit_purchases').doc(paymentId.replace(/\//g, '_'));
const toDate = (value: unknown): Date | null => (value && typeof (value as any).toDate === 'function' ? (value as any).toDate() : value instanceof Date ? value : value ? new Date(value as string) : null);

export type Lot = {
  id: string; pack: PackId; kind: 'topup' | 'pass'; credits: number; cents: number; created_at: Date; expires_at: Date | null;
  status: 'active' | 'expired' | 'refunded' | 'applied'; converted?: boolean; pass_end?: Date | null;
};

type StoredPackProduct = { product_id: string; cents: number; currency: string; mode: string };

/** The pack's Dodo product, made now when missing or out of date. */
export async function ensurePackProduct(dodo: Dodo, packId: PackId): Promise<string> {
  const pack = PACKS[packId];
  const ref = col(C.billingProducts).doc(packId);
  const mode = billingMode();
  const stored = (await ref.get()).data() as Partial<StoredPackProduct> | undefined;
  if (stored?.product_id && stored.cents === pack.cents && stored.currency === 'usd' && stored.mode === mode) return stored.product_id;
  const created = await dodo.products.create({
    name: `AI for Research ${pack.name}`,
    description: pack.kind === 'pass' ? '90 days of the Pro plan, paid once. It does not renew.' : `${pack.credits.toLocaleString('en-US')} credits for AI research, reviews and drafts, kept for 12 months.`,
    tax_category: 'saas',
    price: { type: 'one_time_price', price: pack.cents, currency: dodoCurrency('usd'), discount: 0, purchasing_power_parity: false },
    metadata: { writeorbit_pack: packId },
  });
  const kept = await db().runTransaction(async (tx) => {
    const current = (await tx.get(ref)).data() as Partial<StoredPackProduct> | undefined;
    if (current?.product_id && current.product_id !== stored?.product_id && current.cents === pack.cents && current.mode === mode) return current.product_id;
    tx.set(ref, { kind: 'pack', pack: packId, product_id: created.product_id, cents: pack.cents, currency: 'usd', mode, updated_at: new Date() });
    return created.product_id;
  });
  if (kept !== created.product_id) await dodo.products.archive(created.product_id).catch(() => undefined);
  else if (stored?.product_id && stored.mode === mode) await dodo.products.archive(stored.product_id).catch(() => undefined);
  return kept;
}

/** Checkout for a pack. Top-ups need a paid plan: Free upgrades first. */
export async function startPackPurchase(dodo: Dodo, accountId: string, packId: PackId) {
  const pack = PACKS[packId];
  const { plan } = await effectivePlan(accountId);
  if (pack.kind === 'topup' && plan.is_default) {
    throw new PlanLimitError(`Extra credits are for paid plans. Upgrade from ${plan.name} first; Plus includes 500 credits a month.`, 'credits', plan.id);
  }
  const product = await ensurePackProduct(dodo, packId);
  const customer = await ensureCustomer(dodo, accountId);
  const session = await dodo.checkoutSessions.create({
    product_cart: [{ product_id: product, quantity: 1 }],
    customer: { customer_id: customer },
    show_saved_payment_methods: true,
    feature_flags: { allow_discount_code: true },
    metadata: { writeorbit_kind: pack.kind, writeorbit_pack: packId, writeorbit_account_id: accountId },
    // Dodo adds ?payment_id=…&status=… on the way back.
    return_url: appUrl(`/account?purchase=${packId}`),
    cancel_url: appUrl('/account?billing=cancelled'),
  });
  if (!session.checkout_url) throw new Error('The payment page could not open.');
  return { url: session.checkout_url };
}

/** Which pack a payment bought: its metadata, else the product in its cart. */
async function packOf(payment: DodoPayments.Payments.Payment): Promise<PackId | null> {
  const fromMeta = payment.metadata?.writeorbit_pack as string | undefined;
  if (fromMeta && fromMeta in PACKS) return fromMeta as PackId;
  const products = new Set((payment.product_cart ?? []).map((item) => item.product_id));
  if (!products.size) return null;
  for (const id of Object.keys(PACKS) as PackId[]) {
    const stored = (await col(C.billingProducts).doc(id).get()).data() as Partial<StoredPackProduct> | undefined;
    if (stored?.product_id && products.has(stored.product_id)) return id;
  }
  return null;
}

async function accountOf(payment: { metadata?: Record<string, unknown> | null; customer?: { customer_id?: string } | null }): Promise<string | null> {
  const fromMeta = payment.metadata?.writeorbit_account_id as string | undefined;
  if (fromMeta) return fromMeta;
  const customer = payment.customer?.customer_id;
  if (!customer) return null;
  const owner = await col(C.accounts).where('dodo_customer_id', '==', customer).limit(1).get();
  return owner.docs[0]?.id ?? null;
}

export type AppliedPurchase = { account_id: string; pack: PackId; kind: 'topup' | 'pass'; credits: number; pass_end: Date | null; converted: boolean; duplicate: boolean };

/**
 * Applies a succeeded payment for a pack, once. Returns null for payments that are not packs
 * (plan charges) or not succeeded.
 */
export async function applyPackPayment(payment: DodoPayments.Payments.Payment, now = new Date()): Promise<AppliedPurchase | null> {
  if (payment.status !== 'succeeded' || payment.subscription_id) return null;
  const packId = await packOf(payment);
  if (!packId) return null;
  const accountId = await accountOf(payment);
  if (!accountId) return null;
  const pack = PACKS[packId];
  const ref = lotRef(accountId, payment.payment_id);
  const result = await db().runTransaction(async (tx) => {
    const [existing, owner] = await Promise.all([tx.get(ref), tx.get(accountRef(accountId))]);
    if (existing.exists) {
      const lot = existing.data() as any;
      return { account_id: accountId, pack: packId, kind: pack.kind, credits: lot.credits ?? 0, pass_end: toDate(lot.pass_end), converted: Boolean(lot.converted), duplicate: true };
    }
    if (!owner.exists) return null;
    const account = owner.data() as Record<string, any>;
    const topup = Math.max(0, Number(account.credit_topup) || 0);
    const subscribed = account.plan_source === 'dodo' && LIVE_STATUSES.includes(String(account.plan_status ?? 'none'));
    const base = { pack: packId, kind: pack.kind, cents: pack.cents, created_at: now, payment_id: payment.payment_id };
    if (pack.kind === 'topup' || subscribed) {
      const credits = pack.kind === 'topup' ? pack.credits : PASS_AS_CREDITS;
      tx.set(ref, { ...base, credits, expires_at: new Date(now.getTime() + TOPUP_VALID_DAYS * DAY), status: 'active', converted: pack.kind === 'pass' });
      tx.update(accountRef(accountId), { credit_topup: topup + credits });
      return { account_id: accountId, pack: packId, kind: pack.kind, credits, pass_end: null, converted: pack.kind === 'pass', duplicate: false };
    }
    // A pass on top of a pass still running extends it.
    const currentEnd = toDate(account.plan_period_end);
    const from = account.plan_source === 'pass' && account.plan_status === 'active' && currentEnd && currentEnd > now ? currentEnd : now;
    const end = new Date(from.getTime() + pack.days * DAY);
    tx.set(ref, { ...base, credits: 0, expires_at: null, status: 'applied', converted: false, pass_end: end });
    tx.update(accountRef(accountId), {
      plan: 'pro', plan_source: 'pass', plan_status: 'active', plan_period_end: end, plan_interval: null, plan_cancel_at_period_end: false,
    });
    return { account_id: accountId, pack: packId, kind: pack.kind, credits: 0, pass_end: end, converted: false, duplicate: false };
  });
  if (result && !result.duplicate) await col(PAYMENTS).doc(payment.payment_id.replace(/\//g, '_')).set({ account_id: accountId, pack: packId, created_at: now });
  return result as AppliedPurchase | null;
}

/** Back from checkout: applies the payment at once (no waiting for the webhook). */
export async function completePurchase(dodo: Dodo, accountId: string, paymentId: string) {
  const payment = await dodo.payments.retrieve(paymentId);
  const owner = await accountOf(payment);
  if (owner !== accountId) throw new Error('This payment belongs to another account.');
  const applied = await applyPackPayment(payment);
  return { status: payment.status ?? 'processing', applied };
}

/**
 * Spends the top-up balance over the active lots, oldest first: how much of each lot is left.
 * Pure, for tests. Balance above the lots' total is untracked (gifts) and spent last.
 */
export function allocateLots(lots: Pick<Lot, 'id' | 'credits' | 'created_at'>[], balance: number): Map<string, number> {
  const active = [...lots].sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
  const total = active.reduce((sum, lot) => sum + lot.credits, 0);
  let spent = Math.max(0, total - Math.max(0, balance));
  const left = new Map<string, number>();
  for (const lot of active) {
    const used = Math.min(lot.credits, spent);
    spent -= used;
    left.set(lot.id, lot.credits - used);
  }
  return left;
}

/** Takes expired, unspent top-up credits off the balance. Returns the credits removed. */
export async function sweepExpiredTopups(accountId: string, now = new Date()): Promise<number> {
  const lotsQuery = accountRef(accountId).collection('credit_purchases').where('status', '==', 'active');
  const peek = rows<Lot>(await lotsQuery.get());
  if (!peek.some((lot) => lot.expires_at && toDate(lot.expires_at)! <= now)) return 0;
  return db().runTransaction(async (tx) => {
    const [owner, snapshot] = await Promise.all([tx.get(accountRef(accountId)), tx.get(lotsQuery)]);
    const lots = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data(), created_at: toDate(doc.data().created_at)!, expires_at: toDate(doc.data().expires_at) })) as Lot[];
    const balance = Math.max(0, Number(owner.get('credit_topup')) || 0);
    const left = allocateLots(lots, balance);
    let removed = 0;
    for (const lot of lots) {
      if (!lot.expires_at || lot.expires_at > now) continue;
      const unspent = left.get(lot.id) ?? 0;
      removed += unspent;
      tx.update(lotRef(accountId, lot.id), { status: 'expired', expired_credits: unspent, expired_at: now });
    }
    if (removed) tx.update(accountRef(accountId), { credit_topup: Math.max(0, balance - removed) });
    return removed;
  });
}

/** A refund: takes back the unspent part of a top-up, or the refunded days of a pass. */
export async function applyRefund(refund: Pick<DodoPayments.Refunds.Refund, 'payment_id' | 'refund_id' | 'status' | 'amount' | 'is_partial' | 'customer' | 'metadata'>, now = new Date()) {
  if (refund.status !== 'succeeded') return null;
  const pointer = (await col(PAYMENTS).doc(refund.payment_id.replace(/\//g, '_')).get()).data() as { account_id?: string } | undefined;
  const accountId = pointer?.account_id ?? (await accountOf(refund));
  if (!accountId) return null;
  return db().runTransaction(async (tx) => {
    const ref = lotRef(accountId, refund.payment_id);
    const [lotSnapshot, owner, activeLots] = await Promise.all([tx.get(ref), tx.get(accountRef(accountId)), tx.get(accountRef(accountId).collection('credit_purchases').where('status', '==', 'active'))]);
    if (!lotSnapshot.exists || !owner.exists) return null;
    const lot = { id: lotSnapshot.id, ...lotSnapshot.data(), created_at: toDate(lotSnapshot.data()!.created_at)! } as Lot & { refunded_ids?: string[] };
    if ((lot.refunded_ids ?? []).includes(refund.refund_id) || lot.status === 'refunded') return { account_id: accountId, removed: 0, duplicate: true };
    const share = refund.is_partial && refund.amount && lot.cents ? Math.min(1, refund.amount / lot.cents) : 1;
    const account = owner.data() as Record<string, any>;
    const status = share >= 1 ? 'refunded' : lot.status;
    if (lot.kind === 'topup' || lot.converted) {
      const balance = Math.max(0, Number(account.credit_topup) || 0);
      const lots = activeLots.docs.map((doc: any) => ({ id: doc.id, credits: doc.data().credits, created_at: toDate(doc.data().created_at)! }));
      const unspent = lot.status === 'active' ? allocateLots(lots, balance).get(lot.id) ?? 0 : 0;
      const removed = Math.min(unspent, Math.ceil(lot.credits * share), balance);
      tx.update(accountRef(accountId), { credit_topup: balance - removed });
      tx.update(ref, { status, refunded_credits: removed, refunded_ids: [...(lot.refunded_ids ?? []), refund.refund_id], ...(share < 1 ? { credits: lot.credits - removed } : {}) });
      return { account_id: accountId, removed, duplicate: false };
    }
    // A pass: the refunded share of its 90 days comes off the end; past today, the pass ends now.
    const end = toDate(account.plan_period_end);
    if (account.plan_source === 'pass' && end) {
      const cut = new Date(end.getTime() - Math.round(PACKS.pass_defence.days * share) * DAY);
      const ended = cut <= now;
      tx.update(accountRef(accountId), ended ? { plan_status: 'cancelled', plan_period_end: now } : { plan_period_end: cut });
    }
    tx.update(ref, { status, refunded_ids: [...(lot.refunded_ids ?? []), refund.refund_id] });
    return { account_id: accountId, removed: 0, duplicate: false };
  });
}

/** The account's purchases for the account page, newest first, with what is left of each top-up. */
export async function listPurchases(accountId: string) {
  const [owner, all] = await Promise.all([accountRef(accountId).get(), accountRef(accountId).collection('credit_purchases').get()]);
  const lots = rows<Lot>(all).map((lot) => ({ ...lot, created_at: toDate(lot.created_at)!, expires_at: toDate(lot.expires_at), pass_end: toDate(lot.pass_end) }));
  const balance = Math.max(0, Number((owner.data() as Record<string, unknown> | undefined)?.credit_topup) || 0);
  const left = allocateLots(lots.filter((lot) => lot.status === 'active'), balance);
  return lots
    .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
    .map((lot) => ({
      id: lot.id, pack: lot.pack, name: PACKS[lot.pack]?.name ?? lot.pack, kind: lot.kind, credits: lot.credits, credits_left: lot.status === 'active' ? left.get(lot.id) ?? 0 : 0,
      cents: lot.cents, status: lot.status, converted: Boolean(lot.converted), created_at: lot.created_at, expires_at: lot.expires_at, pass_end: lot.pass_end ?? null,
    }));
}

/** The packs as the pricing dialog and account page show them. */
export function publicPacks() {
  return (Object.keys(PACKS) as PackId[]).map((id) => ({ id, ...PACKS[id] }));
}
