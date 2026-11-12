import type DodoPayments from 'dodopayments';
import { C, col, db, rows } from '../firebase.js';
import { settings } from './settings.js';
import { billingMode, dodoCurrency, type Dodo } from './dodoBilling.js';
import { forgetPlans, loadPlans, LIVE_STATUSES, planProductKey, productMatches, type PlanRow, type StoredPlanProduct } from './plans.js';

/**
 * Plan subscriptions on Dodo Payments: one subscription product per plan and interval (Dodo
 * products have a single price), Dodo's hosted checkout for buying (cards, 3-D Secure, tax and
 * receipts handled by Dodo as merchant of record), and the account's plan kept in step with the
 * subscription (here and from the webhook).
 */
export type Interval = 'month' | 'year';
type Subscription = DodoPayments.Subscriptions.Subscription;

const appUrl = (path: string) => `${settings().publicUrl.replace(/\/$/, '')}${path}`;
const accountRef = (accountId: string) => col(C.accounts).doc(accountId);
const planMetadata = (planId: string, accountId: string) => ({ writeorbit_kind: 'plan', writeorbit_plan: planId, writeorbit_account_id: accountId });

/** An account's fields (snake_case, as stored), or null. */
async function accountData(accountId: string): Promise<Record<string, any> | null> {
  const snapshot = await accountRef(accountId).get();
  return snapshot.exists ? (snapshot.data() as Record<string, any>) : null;
}

/** The first person of an account (the owner). */
async function accountOwner(accountId: string) {
  const people = rows<{ email: string; full_name: string | null; created_at: Date | null }>(
    await col(C.users).where('account_id', '==', accountId).limit(50).get());
  return people.sort((a, b) => (a.created_at?.getTime() ?? 0) - (b.created_at?.getTime() ?? 0))[0] ?? null;
}

const toMillis = (value: unknown) => (value && typeof (value as any).toDate === 'function' ? (value as any).toDate().getTime() : value instanceof Date ? value.getTime() : null);

/**
 * Creates the plan's Dodo products (one for monthly, one for yearly) when they are missing or no
 * longer match the price in plans.ts. A new amount, trial or mode makes a new product and
 * archives the old one: current subscribers keep the price they signed up at.
 */
export async function syncPlanToDodo(dodo: Dodo, planId: string): Promise<PlanRow> {
  forgetPlans();
  const plan = (await loadPlans()).plans.find((item) => item.id === planId);
  if (!plan) throw new Error('No such plan');
  if (plan.is_default || plan.checkout !== 'self_serve') return plan;
  const mode = billingMode();
  const ensureProduct = async (cents: number, interval: Interval) => {
    if (cents <= 0) return;
    const ref = col(C.billingProducts).doc(planProductKey(plan.id, interval));
    const stored = (await ref.get()).data() as Partial<StoredPlanProduct> | undefined;
    if (productMatches(stored, plan, cents)) return;
    const name = `AI for Research ${plan.name} (${interval === 'month' ? 'monthly' : 'yearly'})`;
    const created = await dodo.products.create({
      name, description: plan.tagline || null, tax_category: 'saas',
      price: {
        type: 'recurring_price', price: cents, currency: dodoCurrency(plan.currency), discount: 0, purchasing_power_parity: false,
        payment_frequency_count: 1, payment_frequency_interval: interval === 'month' ? 'Month' : 'Year',
        // How long the subscription runs before it would need renewing by hand: effectively open-ended.
        subscription_period_count: 10, subscription_period_interval: 'Year',
        trial_period_days: plan.trial_days,
      },
      metadata: { writeorbit_plan: plan.id, interval },
    });
    // Two instances may create one at the same moment: keep the first, archive the other.
    const kept = await db().runTransaction(async (tx) => {
      const current = (await tx.get(ref)).data() as Partial<StoredPlanProduct> | undefined;
      if (productMatches(current, plan, cents) && current!.product_id !== stored?.product_id) return false;
      tx.set(ref, { kind: 'plan', plan: plan.id, interval, product_id: created.product_id, cents, currency: plan.currency, trial_days: plan.trial_days, mode, updated_at: new Date() });
      return true;
    });
    if (!kept) await dodo.products.archive(created.product_id).catch(() => undefined);
    // The old price stops being sold; current subscribers keep it.
    else if (stored?.product_id && stored.mode === mode) await dodo.products.archive(stored.product_id).catch(() => undefined);
  };
  await ensureProduct(plan.monthly_cents, 'month');
  await ensureProduct(plan.yearly_cents, 'year');
  forgetPlans();
  return (await loadPlans()).plans.find((item) => item.id === planId)!;
}

/** The account's Dodo customer (created on first use). */
export async function ensureCustomer(dodo: Dodo, accountId: string) {
  const account = await accountData(accountId);
  if (!account) throw new Error('No such account');
  if (account.dodo_customer_id) return account.dodo_customer_id as string;
  const owner = await accountOwner(accountId);
  if (!owner?.email) throw new Error('This account has no email to bill.');
  const customer = await dodo.customers.create({
    email: owner.email, name: owner.full_name || account.name || owner.email, metadata: { writeorbit_account_id: accountId },
  });
  // Another request may have created one at the same moment: keep the first.
  return db().runTransaction(async (tx) => {
    const current = await tx.get(accountRef(accountId));
    const existing = current.get('dodo_customer_id') as string | null | undefined;
    if (existing) return existing;
    tx.update(accountRef(accountId), { dodo_customer_id: customer.customer_id });
    return customer.customer_id;
  });
}

const productFor = (plan: PlanRow, interval: Interval) => (interval === 'year' ? plan.dodo_yearly_product_id : plan.dodo_monthly_product_id);

/** Checkout for a new subscription, or a plan change on the live one (charged or credited now). */
export async function startPlanPurchase(dodo: Dodo, accountId: string, planId: string, interval: Interval) {
  const { plans } = await loadPlans();
  let plan = plans.find((item) => item.id === planId);
  // Hidden plans (carried over from the previous app) stay with the people already on them.
  const current = await accountData(accountId);
  if (!plan || plan.checkout !== 'self_serve' || plan.is_default || (!plan.is_public && current?.plan !== plan.id)) throw new Error('This plan cannot be bought online.');
  // Not on Dodo yet (or only in the other mode): make its products now rather than refuse.
  if (plan.dodo_mode !== billingMode() || !productFor(plan, interval)) plan = await syncPlanToDodo(dodo, plan.id);
  const product = productFor(plan, interval);
  if (!product) throw new Error(`${plan.name} has no ${interval === 'year' ? 'yearly' : 'monthly'} price yet.`);
  const customer = await ensureCustomer(dodo, accountId);
  const account = await accountData(accountId);
  if (account?.plan_subscription_id && LIVE_STATUSES.includes(account.plan_status)) {
    const subscription = await dodo.subscriptions.retrieve(account.plan_subscription_id);
    if (LIVE_STATUSES.includes(statusOf(subscription))) {
      await dodo.subscriptions.changePlan(subscription.subscription_id, {
        product_id: product, quantity: 1, proration_billing_mode: 'prorated_immediately',
        // A declined charge leaves the current plan as it is.
        on_payment_failure: 'prevent_change',
        metadata: { ...subscription.metadata, ...planMetadata(plan.id, accountId) },
      });
      if (subscription.cancel_at_next_billing_date) await dodo.subscriptions.update(subscription.subscription_id, { cancel_at_next_billing_date: false });
      await syncPlanSubscription(await dodo.subscriptions.retrieve(subscription.subscription_id));
      return { changed: true as const };
    }
  }
  const session = await dodo.checkoutSessions.create({
    product_cart: [{ product_id: product, quantity: 1 }],
    customer: { customer_id: customer },
    show_saved_payment_methods: true,
    feature_flags: { allow_discount_code: true },
    metadata: planMetadata(plan.id, accountId),
    // Dodo adds ?subscription_id=…&status=… on the way back.
    return_url: appUrl('/account?billing=success'),
    cancel_url: appUrl('/account?billing=cancelled'),
  });
  if (!session.checkout_url) throw new Error('The payment page could not open.');
  return { url: session.checkout_url };
}

/** Dodo has no "trialing" status: an active subscription inside its trial days is shown as one. */
function statusOf(subscription: Subscription): string {
  if (subscription.status !== 'active' || !subscription.trial_period_days) return subscription.status;
  const trialEnds = Date.parse(subscription.created_at) + subscription.trial_period_days * 86_400_000;
  return trialEnds > Date.now() ? 'trialing' : 'active';
}

/** Writes a plan subscription's state to its account (newer events win; others are ignored). */
export async function syncPlanSubscription(subscription: Subscription, eventAt?: Date) {
  const customer = subscription.customer?.customer_id ?? null;
  let accountId = (subscription.metadata?.writeorbit_account_id as string | undefined) || null;
  if (!accountId && customer) {
    const owner = await col(C.accounts).where('dodo_customer_id', '==', customer).limit(1).get();
    accountId = owner.docs[0]?.id ?? null;
  }
  if (!accountId) return null;
  const { plans } = await loadPlans();
  // The product is the truth after a plan change; the metadata covers archived products.
  const plan = plans.find((candidate) => candidate.dodo_monthly_product_id === subscription.product_id || candidate.dodo_yearly_product_id === subscription.product_id)
    ?? plans.find((candidate) => candidate.id === subscription.metadata?.writeorbit_plan);
  if (!plan) return null;
  const interval = subscription.payment_frequency_interval === 'Year' ? 'year' : 'month';
  const status = statusOf(subscription);
  const live = LIVE_STATUSES.includes(status);
  // An ended subscription shows the day it ended, not the period it would have run to.
  const periodEnd = live ? subscription.next_billing_date : subscription.cancelled_at ?? subscription.expires_at ?? subscription.next_billing_date;
  const at = eventAt ?? new Date();
  const target = accountId;
  const row = await db().runTransaction(async (tx) => {
    const snapshot = await tx.get(accountRef(target));
    if (!snapshot.exists) return null;
    const current = snapshot.data() as Record<string, any>;
    if (customer && current.dodo_customer_id && current.dodo_customer_id !== customer) return null;
    const currentSubscription = current.plan_subscription_id ?? null;
    const eventMillis = toMillis(current.plan_event_at);
    // A live subscription replaces whatever was there; an ended one only updates the same subscription.
    const sameOrFree = currentSubscription === null || currentSubscription === subscription.subscription_id || live;
    const newer = eventMillis === null || eventMillis <= at.getTime() || currentSubscription !== subscription.subscription_id;
    if (!sameOrFree || !newer) return null;
    tx.update(accountRef(target), {
      plan: plan.id, plan_subscription_id: subscription.subscription_id, plan_status: status,
      plan_interval: interval, plan_period_end: periodEnd ? new Date(periodEnd) : null,
      plan_cancel_at_period_end: Boolean(subscription.cancel_at_next_billing_date),
      plan_source: 'dodo', plan_event_at: at,
      ...(customer && !current.dodo_customer_id ? { dodo_customer_id: customer } : {}),
      // The card the plan is charged to is the account's card for credit top-ups too.
      ...(subscription.payment_method_id ? { dodo_payment_method_id: subscription.payment_method_id } : {}),
      ...(subscription.billing?.country ? { dodo_billing: subscription.billing } : {}),
    });
    return { id: target };
  });
  return row ? accountId : null;
}

/** Back from checkout: the subscription saved at once (no waiting for the webhook). */
export async function completeCheckout(dodo: Dodo, accountId: string, subscriptionId: string) {
  const account = await accountData(accountId);
  const subscription = await dodo.subscriptions.retrieve(subscriptionId);
  if (!account?.dodo_customer_id || subscription.customer.customer_id !== account.dodo_customer_id) throw new Error('This checkout belongs to another account.');
  await syncPlanSubscription(subscription);
  return { kind: LIVE_STATUSES.includes(statusOf(subscription)) ? ('subscription' as const) : ('pending' as const) };
}

/** Saved cards; the one the plan (and top-ups) are charged to first. */
export async function listCards(dodo: Dodo, customer: string, defaultId: string | null) {
  const methods = await dodo.customers.retrievePaymentMethods(customer);
  return methods.items
    .filter((method) => method.card || method.payment_method === 'card')
    .map((method) => ({
      id: method.payment_method_id, brand: (method.card?.card_network ?? 'card').toLowerCase().replace(/\s+/g, ''),
      last4: method.card?.last4_digits ?? '••••', exp_month: Number(method.card?.expiry_month ?? 0), exp_year: Number(method.card?.expiry_year ?? 0),
      name: method.card?.card_holder_name ?? null, funding: method.card?.card_type ?? null, default: method.payment_method_id === defaultId,
    }))
    .sort((a, b) => Number(b.default) - Number(a.default));
}

/** The account's live plan subscription, if any. */
async function liveSubscription(dodo: Dodo, accountId: string) {
  const account = await accountData(accountId);
  if (!account?.plan_subscription_id || account.plan_source !== 'dodo') return null;
  return dodo.subscriptions.retrieve(account.plan_subscription_id).catch(() => null);
}

/**
 * Where to add a card: on a subscription, Dodo's page to change its card (which also settles a
 * failed renewal); otherwise Dodo's customer portal. No card numbers ever reach AI for Research.
 */
export async function startAddCard(dodo: Dodo, accountId: string) {
  const customer = await ensureCustomer(dodo, accountId);
  const subscription = await liveSubscription(dodo, accountId);
  if (subscription && ['active', 'on_hold', 'past_due'].includes(subscription.status)) {
    const result = await dodo.subscriptions.updatePaymentMethod(subscription.subscription_id, {
      payment_method: { type: 'new', return_url: appUrl(`/account?billing=card&subscription_id=${subscription.subscription_id}`) },
    });
    if (result.payment_link) return result.payment_link;
  }
  return billingPortal(dodo, customer);
}

/** Dodo's customer portal: cards, receipts and the subscription, managed by Dodo. */
export async function billingPortal(dodo: Dodo, customer: string) {
  const session = await dodo.customers.customerPortal.create(customer, { return_url: appUrl('/account#billing') });
  return session.link;
}

async function ownedCard(dodo: Dodo, customer: string, paymentMethod: string) {
  const methods = await dodo.customers.retrievePaymentMethods(customer);
  if (!methods.items.some((method) => method.payment_method_id === paymentMethod)) throw new Error('This card is not on your account.');
}

/** The card the plan subscription and automatic top-ups are charged to. */
export async function setDefaultCard(dodo: Dodo, accountId: string, paymentMethod: string, options: { onlyIfNone?: boolean } = {}) {
  const customer = await ensureCustomer(dodo, accountId);
  await ownedCard(dodo, customer, paymentMethod);
  const account = await accountData(accountId);
  if (options.onlyIfNone && account?.dodo_payment_method_id) return;
  await accountRef(accountId).update({ dodo_payment_method_id: paymentMethod });
  if (options.onlyIfNone) return;
  const subscription = await liveSubscription(dodo, accountId);
  if (subscription && LIVE_STATUSES.includes(statusOf(subscription)) && subscription.payment_method_id !== paymentMethod) {
    await dodo.subscriptions.updatePaymentMethod(subscription.subscription_id, { payment_method: { type: 'existing', payment_method_id: paymentMethod } });
  }
}

/** Removes a card; the card a live subscription pays with stays until another one is the default. */
export async function removeCard(dodo: Dodo, accountId: string, paymentMethod: string) {
  const customer = await ensureCustomer(dodo, accountId);
  await ownedCard(dodo, customer, paymentMethod);
  const account = await accountData(accountId);
  const paying = account?.plan_source === 'dodo' && LIVE_STATUSES.includes(account.plan_status);
  if (paying && account?.dodo_payment_method_id === paymentMethod) {
    const cards = await listCards(dodo, customer, account.dodo_payment_method_id);
    throw new Error(cards.length > 1 ? 'Make another card the default first: your plan is charged to this one.' : 'Add another card first: your plan is charged to this one.');
  }
  await dodo.customers.deletePaymentMethod(paymentMethod, { customer_id: customer });
  if (account?.dodo_payment_method_id === paymentMethod) await accountRef(accountId).update({ dodo_payment_method_id: null });
}

/** Cancel at the end of the paid period (the plan stays until then), or undo that. */
export async function setCancelAtPeriodEnd(dodo: Dodo, accountId: string, cancel: boolean, reason?: string) {
  const account = await accountData(accountId);
  if (!account?.plan_subscription_id) throw new Error('There is no subscription to change.');
  const subscription = await dodo.subscriptions.update(account.plan_subscription_id, {
    cancel_at_next_billing_date: cancel,
    ...(cancel && reason ? { cancellation_comment: reason.slice(0, 500) } : {}),
  });
  await syncPlanSubscription(subscription);
}

/**
 * Starts the plan again: a subscription on hold (a failed renewal) is settled on Dodo's page for
 * changing its card; one that ended goes through checkout again (saved cards are offered there).
 */
export async function renewPlan(dodo: Dodo, accountId: string) {
  const stored = await accountData(accountId);
  if (!stored?.plan || (stored.plan_source ?? 'default') === 'default') throw new Error('Choose a plan first.');
  if (stored.plan_source === 'dodo' && LIVE_STATUSES.includes(String(stored.plan_status ?? 'none'))) throw new Error('Your plan is still active.');
  if (stored.plan_source === 'dodo' && stored.plan_status === 'on_hold' && stored.plan_subscription_id) {
    const result = await dodo.subscriptions.updatePaymentMethod(stored.plan_subscription_id, {
      payment_method: { type: 'new', return_url: appUrl(`/account?billing=success&subscription_id=${stored.plan_subscription_id}`) },
    });
    if (result.payment_link) return { url: result.payment_link };
  }
  const interval: Interval = stored.plan_interval === 'year' ? 'year' : 'month';
  const { plans } = await loadPlans();
  const plan = plans.find((item) => item.id === stored.plan);
  if (!plan || (interval === 'year' ? plan.yearly_cents : plan.monthly_cents) <= 0) throw new Error('This plan is no longer offered. Choose another one.');
  return startPlanPurchase(dodo, accountId, plan.id, interval);
}

const PAYMENT_STATUS: Record<string, string> = { succeeded: 'paid', failed: 'failed', cancelled: 'void', processing: 'processing' };

/** Recent payments with their invoices (plan charges and credit purchases). */
export async function listInvoices(dodo: Dodo, customer: string) {
  const page = await dodo.payments.list({ customer_id: customer, page_size: 24, page_number: 0 });
  return page.items
    .filter((payment) => payment.status && payment.status !== 'requires_payment_method' && payment.status !== 'requires_customer_action')
    .map((payment) => ({
      id: payment.payment_id, number: payment.invoice_id ?? null, status: PAYMENT_STATUS[payment.status ?? ''] ?? payment.status ?? null,
      total: payment.total_amount, amount_due: payment.status === 'succeeded' ? 0 : payment.total_amount,
      currency: payment.currency.toLowerCase(), created: Math.floor(Date.parse(payment.created_at) / 1000), due_date: null,
      hosted_url: null, pdf: payment.invoice_url ?? null,
      description: payment.subscription_id ? 'Plan' : payment.metadata?.writeorbit_kind === 'pass' ? 'Defence Pass' : ['topup', 'credits', 'credits_topup'].includes(String(payment.metadata?.writeorbit_kind)) ? 'Credits' : null,
      subscription: payment.subscription_id ?? null,
    }));
}
