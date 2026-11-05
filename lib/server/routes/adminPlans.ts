import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { AggregateField } from 'firebase-admin/firestore';
import { C, chunked, col, db, rows } from '../firebase.js';
import { requireAdmin, type AppVariables } from '../auth.js';
import { stripeClient } from '../lib/stripeBilling.js';
import { forgetPlans, LIMIT_DEFS, LIVE_STATUSES, loadPlans, normalizeLimits } from '../lib/plans.js';
import { syncPlanToStripe } from '../lib/planBilling.js';
import { grantCredits } from '../lib/credits.js';

const countLimit = z.object({ amount: z.number().int().min(0).max(10_000_000).nullable(), per: z.enum(['day', 'month']) });
const PlanInput = z.object({
  name: z.string().trim().min(1).max(60),
  tagline: z.string().trim().max(200).default(''),
  sort_order: z.number().int().min(0).max(1000).default(0),
  is_default: z.boolean().default(false),
  is_public: z.boolean().default(true),
  featured: z.boolean().default(false),
  checkout: z.enum(['self_serve', 'contact']).default('self_serve'),
  contact_url: z.string().trim().max(500).nullable().default(null),
  monthly_cents: z.number().int().min(0).max(10_000_000).default(0),
  yearly_cents: z.number().int().min(0).max(100_000_000).default(0),
  currency: z.string().trim().length(3).toLowerCase().default('usd'),
  trial_days: z.number().int().min(0).max(365).default(0),
  limits: z.object({
    autocomplete: countLimit, ai_edit: countLimit, chat: countLimit, review: countLimit, write: countLimit,
    library_pdfs: z.number().int().min(0).max(10_000_000).nullable(), latex_export: z.boolean(),
  }),
  features: z.array(z.object({ label: z.string().trim().min(1).max(200), included: z.boolean() })).max(30).default([]),
});

/** Plan sources that mean "not the default plan". */
const GIVEN_SOURCES = ['stripe', 'admin', 'legacy'];
const monthStart = (now = new Date()) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
const num = (value: unknown) => Number(value ?? 0) || 0;
const count = async (query: FirebaseFirestore.Query) => (await query.count().get()).data().count;

export const adminAudit = (userId: string, action: string, target: string) =>
  col(C.adminAudit).add({ user_id: userId, action, target, created_at: new Date() });

async function userByEmail(email: string) {
  const [user] = rows<{ id: string; account_id: string }>(await col(C.users).where('email', '==', email.trim().toLowerCase()).limit(1).get());
  return user ?? null;
}

/** Admin › Plans: plans, their features and limits, Stripe prices, subscribers, given plans. */
export function adminPlanRoutes() {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use('*', requireAdmin);

  app.get('/', async (c) => {
    forgetPlans();
    const { plans, features } = await loadPlans();
    // Subscribers: a live Stripe subscription or a plan an admin gave (one count query each).
    const accounts = col(C.accounts);
    const counts = await Promise.all(plans.map(async (plan) => {
      const [stripe, admin] = await Promise.all([
        count(accounts.where('plan', '==', plan.id).where('plan_source', '==', 'stripe').where('plan_status', 'in', LIVE_STATUSES)),
        count(accounts.where('plan', '==', plan.id).where('plan_source', '==', 'admin')),
      ]);
      return { plan: plan.id, subscribers: stripe + admin };
    }));
    return c.json({
      plans: plans.map((plan) => ({
        ...plan, limits: normalizeLimits(plan.limits), features: features.get(plan.id) || [],
        subscribers: counts.find((row) => row.plan === plan.id)?.subscribers ?? 0,
      })),
      limit_defs: LIMIT_DEFS,
      stripe_ready: (() => { try { return Boolean(stripeClient()); } catch { return false; } })(),
    });
  });

  /** Creates or saves a plan (its features replace the old list). */
  app.put('/:id', async (c) => {
    const id = c.req.param('id');
    if (!/^[a-z][a-z0-9-]{1,30}$/.test(id)) throw new HTTPException(422, { message: 'Plan id: lowercase letters, digits and dashes (e.g. "plus").' });
    const parsed = PlanInput.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw new HTTPException(422, { message: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ') });
    const plan = parsed.data;
    if (plan.checkout === 'contact' && !plan.contact_url) throw new HTTPException(422, { message: 'A "Talk to us" plan needs a contact link (mailto: or https://).' });
    await db().runTransaction(async (tx) => {
      const all = await tx.get(col(C.plans));
      const ref = col(C.plans).doc(id);
      const existing = all.docs.find((doc) => doc.id === id);
      // Exactly one default once this save lands.
      const defaults = all.docs.filter((doc) => doc.id !== id && doc.get('is_default')).length + (plan.is_default ? 1 : 0);
      if (!plan.is_default && defaults !== 1) throw new HTTPException(422, { message: 'Exactly one plan must be the default (the free plan).' });
      if (plan.is_default) for (const doc of all.docs) if (doc.id !== id && doc.get('is_default')) tx.update(doc.ref, { is_default: false });
      const fields = {
        name: plan.name, tagline: plan.tagline, sort_order: plan.sort_order, is_default: plan.is_default, is_public: plan.is_public,
        featured: plan.featured, checkout: plan.checkout, contact_url: plan.contact_url, monthly_cents: plan.monthly_cents,
        yearly_cents: plan.yearly_cents, currency: plan.currency, trial_days: plan.trial_days,
        // Limits the form does not show (upload size, imports) are kept from the saved plan.
        limits: { ...((existing?.get('limits') as Record<string, unknown>) ?? {}), ...plan.limits },
        features: plan.features.map((feature, index) => ({ ...feature, sort_order: index })),
        updated_at: new Date(),
      };
      if (existing) tx.update(ref, fields);
      else tx.set(ref, { ...fields, stripe_product_id: null, stripe_monthly_price_id: null, stripe_yearly_price_id: null, stripe_mode: null, created_at: new Date() });
    });
    forgetPlans();
    await adminAudit(c.get('user')!.id, 'plan_saved', id);
    // Prices on Stripe follow the saved amounts straight away when payments are set up.
    let stripe_error: string | null = null;
    try {
      const stripe = stripeClient();
      if (stripe) await syncPlanToStripe(stripe, id);
    } catch (error) {
      stripe_error = (error as Error).message;
    }
    return c.json({ ok: true, stripe_error });
  });

  app.post('/:id/stripe', async (c) => {
    let stripe;
    try { stripe = stripeClient(); } catch (error) { throw new HTTPException(422, { message: (error as Error).message }); }
    if (!stripe) throw new HTTPException(422, { message: 'Save a Stripe key on the Billing tab first.' });
    const plan = await syncPlanToStripe(stripe, c.req.param('id')).catch((error) => { throw new HTTPException(422, { message: (error as Error).message }); });
    await adminAudit(c.get('user')!.id, 'plan_stripe_sync', c.req.param('id'));
    return c.json({ ok: true, plan });
  });

  app.delete('/:id', async (c) => {
    const id = c.req.param('id');
    if (!id || id.includes('/')) throw new HTTPException(404, { message: 'No such plan.' });
    const plan = await col(C.plans).doc(id).get();
    if (!plan.exists) throw new HTTPException(404, { message: 'No such plan.' });
    if (plan.get('is_default')) throw new HTTPException(422, { message: 'Make another plan the default first.' });
    const onPlan = await count(col(C.accounts).where('plan', '==', id).where('plan_source', 'in', GIVEN_SOURCES));
    if (onPlan > 0) throw new HTTPException(422, { message: `${onPlan} account(s) are on this plan. Hide it from pricing instead.` });
    await plan.ref.delete();
    forgetPlans();
    await adminAudit(c.get('user')!.id, 'plan_deleted', id);
    return c.json({ ok: true });
  });

  return app;
}

/** Admin › Plans › Subscribers, and giving someone a plan without payment. */
export function adminAccountRoutes() {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use('*', requireAdmin);

  app.get('/subscribers', async (c) => {
    const accounts = rows<Record<string, any>>(await col(C.accounts).where('plan_source', 'in', GIVEN_SOURCES).limit(1000).get())
      .sort((a, b) => (b.plan_event_at?.getTime?.() ?? -Infinity) - (a.plan_event_at?.getTime?.() ?? -Infinity))
      .slice(0, 200);
    // The owner (first person) of each account.
    const owners = new Map<string, { email: string; created: number }>();
    for (const group of chunked(accounts.map((account) => account.id), 30)) {
      const people = rows<{ account_id: string; email: string; created_at: Date | null }>(await col(C.users).where('account_id', 'in', group).get());
      for (const person of people) {
        const created = person.created_at?.getTime() ?? 0;
        const current = owners.get(person.account_id);
        if (!current || created < current.created) owners.set(person.account_id, { email: person.email, created });
      }
    }
    const subscribers = accounts.filter((account) => owners.has(account.id)).map((account) => ({
      email: owners.get(account.id)!.email, plan: account.plan ?? null, plan_status: account.plan_status ?? 'none', plan_source: account.plan_source,
      plan_interval: account.plan_interval ?? null, plan_period_end: account.plan_period_end ?? null,
      plan_cancel_at_period_end: Boolean(account.plan_cancel_at_period_end),
    }));
    return c.json({ subscribers });
  });

  /** Developer API this month: credits sold, credits used (free and paid), keys in use. */
  app.get('/credits', async (c) => {
    const since = monthStart();
    const [sold, used, liveKeys] = await Promise.all([
      db().collectionGroup(C.creditLedger).where('kind', 'in', ['purchase', 'topup']).where('created_at', '>=', since)
        .aggregate({ cents: AggregateField.sum('amount_cents'), milli: AggregateField.sum('credits_milli') }).get(),
      col(C.usageEvents).where('via_key', '==', true).where('created_at', '>=', since)
        .aggregate({ free: AggregateField.sum('free_milli'), paid: AggregateField.sum('paid_milli') }).get(),
      col(C.apiKeys).where('revoked_at', '==', null).select('account_id').get(),
    ]);
    return c.json({
      sold_cents: num(sold.data().cents),
      credits_sold: num(sold.data().milli) / 1000,
      free_used: num(used.data().free) / 1000,
      paid_used: num(used.data().paid) / 1000,
      keys: liveKeys.size,
      accounts: new Set(liveKeys.docs.map((doc) => doc.get('account_id'))).size,
    });
  });

  /** Credits given by hand (support, refunds, partners); recorded in the ledger and the audit log. */
  app.post('/credits', async (c) => {
    const body = z.object({ email: z.string().trim().toLowerCase().email(), credits: z.number().int().min(1).max(10_000_000), note: z.string().max(200).optional() })
      .safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) throw new HTTPException(422, { message: 'An account email and a number of credits.' });
    const user = await userByEmail(body.data.email);
    if (!user) throw new HTTPException(404, { message: 'No account with that email.' });
    const result = await grantCredits({
      accountId: user.account_id, kind: 'grant', credits: body.data.credits, reference: `grant:${randomUUID()}`,
      note: body.data.note ?? 'Added by an admin', createdBy: c.get('user')!.id,
    });
    await adminAudit(c.get('user')!.id, 'credits_given', `${body.data.email}:${body.data.credits}`);
    return c.json({ ok: true, balance: result.balance ?? 0 });
  });

  app.put('/plan', async (c) => {
    const body = z.object({ email: z.string().trim().toLowerCase().email(), plan: z.string().max(40).nullable() }).safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) throw new HTTPException(422, { message: 'An email and a plan (or none).' });
    const user = await userByEmail(body.data.email);
    if (!user) throw new HTTPException(404, { message: 'No account with that email.' });
    const account = col(C.accounts).doc(user.account_id);
    if (body.data.plan) {
      const { plans } = await loadPlans();
      if (!plans.some((plan) => plan.id === body.data.plan)) throw new HTTPException(422, { message: 'No such plan.' });
      await account.update({ plan: body.data.plan, plan_source: 'admin', plan_status: 'active', plan_event_at: new Date() });
    } else {
      // Back to the subscription (if any) or the default plan.
      await db().runTransaction(async (tx) => {
        const snapshot = await tx.get(account);
        const subscribed = Boolean(snapshot.get('plan_subscription_id'));
        tx.update(account, { plan_source: subscribed ? 'stripe' : 'default', plan_status: subscribed ? snapshot.get('plan_status') ?? 'none' : 'none' });
      });
    }
    await adminAudit(c.get('user')!.id, body.data.plan ? 'plan_given' : 'plan_given_removed', `${body.data.email}:${body.data.plan ?? ''}`);
    return c.json({ ok: true });
  });

  return app;
}
