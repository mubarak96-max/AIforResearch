import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { C, col } from '../firebase.js';
import { requireUser, type AppVariables } from '../auth.js';
import { dodoClient } from '../lib/dodoBilling.js';
import { creditSummary, loadPlans, publicPlan, usageSummary } from '../lib/plans.js';
import { managedTeamBilling } from '../lib/team.js';
import { TOPUP_PACKS, completePurchase, listPurchases, publicPacks, startPackPurchase, sweepExpiredTopups } from '../lib/creditPurchases.js';
import {
  billingPortal, completeCheckout, ensureCustomer, listCards, listInvoices, removeCard, renewPlan, setCancelAtPeriodEnd,
  setDefaultCard, startAddCard, startPlanPurchase,
} from '../lib/planBilling.js';

/** Public: the plans on the pricing page and in the pricing dialog. */
export function planRoutes() {
  const app = new Hono();
  app.get('/', async (c) => {
    const { plans, features } = await loadPlans();
    return c.json({ plans: plans.filter((plan) => plan.is_public).map((plan) => publicPlan(plan, features.get(plan.id) || [])) });
  });
  return app;
}

function dodoOr503() {
  const dodo = dodoClient();
  if (dodo) return dodo;
  throw new HTTPException(503, { message: 'Payments are not set up yet.' });
}

/** Turns Dodo and validation errors into a message the account page can show. */
async function friendly<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof HTTPException) throw error;
    const message = (error as Error).message || 'Something went wrong with the payment provider.';
    throw new HTTPException(422, { message });
  }
}

/** The signed-in person's plan, usage, cards and invoices, and the actions on them. */
export function billingRoutes() {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use('*', requireUser);
  app.use('*', async (c, next) => {
    const access = await managedTeamBilling(c.get('user')!);
    c.set('user', { ...c.get('user')!, account_id: access.account_id });
    const path = c.req.path.replace(/^.*\/billing/, '') || '/';
    if (access.managed && c.req.method !== 'GET') {
      if (!access.can_manage) throw new HTTPException(403, { message: 'Team billing is managed by a Team owner or administrator.' });
      if (['/checkout', '/pass/checkout', '/renew'].includes(path)) throw new HTTPException(409, { message: 'Contact your Team account administrator or sales to change a provisioned Team plan.' });
    }
    if (access.managed && !access.can_manage && c.req.method === 'GET' && !['/', '/credits'].includes(path)) throw new HTTPException(403, { message: 'Only Team owners and administrators can view billing records.' });
    await next();
  });
  const accountOf = (c: { get: (key: 'user') => AppVariables['user'] }) => c.get('user')!.account_id;

  /** Credits left this month, for the app's credit meter and every job's start button. */
  app.get('/credits', async (c) => {
    await sweepExpiredTopups(accountOf(c)).catch((error) => console.warn('top-up expiry sweep failed', (error as Error).message));
    return c.json(await creditSummary(accountOf(c)));
  });

  /** Top-ups and passes bought, with what is left of each top-up and when it expires. */
  app.get('/purchases', async (c) => c.json({ purchases: await listPurchases(accountOf(c)), packs: publicPacks() }));

  /** Dodo's checkout for extra credits (paid plans only). */
  app.post('/credits/checkout', async (c) => {
    const body = z.object({ pack: z.enum(TOPUP_PACKS) }).safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) throw new HTTPException(422, { message: 'Choose 500 or 2,000 credits.' });
    const dodo = dodoOr503();
    return c.json(await friendly(() => startPackPurchase(dodo, accountOf(c), body.data.pack)));
  });

  /** Dodo's checkout for the Defence Pass: 90 days of Pro, paid once. */
  app.post('/pass/checkout', async (c) => {
    const dodo = dodoOr503();
    return c.json(await friendly(() => startPackPurchase(dodo, accountOf(c), 'pass_defence')));
  });

  /** Back from a credits or pass checkout: applies the payment straight away. */
  app.post('/purchases/complete', async (c) => {
    const body = z.object({ payment: z.string().min(5).max(300) }).safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) throw new HTTPException(422, { message: 'Missing payment.' });
    const dodo = dodoOr503();
    return c.json(await friendly(() => completePurchase(dodo, accountOf(c), body.data.payment)));
  });

  app.get('/', async (c) => {
    const access = await managedTeamBilling(c.get('user')!);
    // The user may have left a Team since middleware ran. Bind billing records
    // to the same fresh account that granted administrative access.
    const accountId = access.account_id;
    await sweepExpiredTopups(accountId).catch((error) => console.warn('top-up expiry sweep failed', (error as Error).message));
    const summary = await usageSummary(accountId);
    const [library, accountSnapshot] = await Promise.all([
      col(C.libraryDocuments).where('user_id', '==', c.get('user')!.id).count().get().then((snapshot) => ({ count: snapshot.data().count })),
      col(C.accounts).doc(accountId).get(),
    ]);
    const account = accountSnapshot.data() as { dodo_customer_id?: string | null; dodo_payment_method_id?: string | null } | undefined;
    let cards: Awaited<ReturnType<typeof listCards>> = [];
    let invoices: Awaited<ReturnType<typeof listInvoices>> = [];
    let payments = true;
    try {
      const dodo = dodoClient();
      if (access.can_manage && dodo && account?.dodo_customer_id) {
        [cards, invoices] = await Promise.all([
          listCards(dodo, account.dodo_customer_id, account.dodo_payment_method_id ?? null),
          listInvoices(dodo, account.dodo_customer_id),
        ]);
      }
      payments = access.can_manage && Boolean(dodo);
    } catch (error) {
      console.warn('billing summary: Dodo Payments unavailable', (error as Error).message);
      payments = false;
    }
    const { plan, limits, account: state, counts, credits } = summary;
    return c.json({
      plan: { id: plan.id, name: plan.name, is_default: plan.is_default },
      subscription: state ? {
        plan_id: state.plan_id, status: state.plan_status, source: state.plan_source, interval: state.plan_interval,
        period_end: state.plan_period_end, cancel_at_period_end: state.plan_cancel_at_period_end,
      } : null,
      limits,
      usage: counts,
      credits,
      managed_team: access.managed,
      can_manage_billing: access.can_manage,
      purchases: access.can_manage ? await listPurchases(accountId).catch(() => []) : [],
      packs: access.can_manage ? publicPacks().filter((pack) => !access.managed || pack.kind !== 'pass') : [],
      library: { used: Number(library.count) || 0, limit: limits.library_pdfs },
      cards,
      invoices,
      payments_enabled: payments,
    });
  });

  app.post('/checkout', async (c) => {
    const body = z.object({ plan: z.string().min(1).max(40), interval: z.enum(['month', 'year']) }).safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) throw new HTTPException(422, { message: 'Choose a plan and monthly or yearly.' });
    const dodo = dodoOr503();
    return c.json(await friendly(() => startPlanPurchase(dodo, accountOf(c), body.data.plan, body.data.interval)));
  });

  /** Back from Dodo's checkout (a plan, or a new card on it): saves the result straight away. */
  app.post('/checkout/complete', async (c) => {
    const body = z.object({ subscription: z.string().min(5).max(300) }).safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) throw new HTTPException(422, { message: 'Missing subscription.' });
    const dodo = dodoOr503();
    return c.json(await friendly(() => completeCheckout(dodo, accountOf(c), body.data.subscription)));
  });

  /** Dodo's page to add a card (on the plan subscription when there is one). */
  app.post('/cards', async (c) => {
    const dodo = dodoOr503();
    return c.json({ url: await friendly(() => startAddCard(dodo, accountOf(c))) });
  });

  app.post('/cards/:id/default', async (c) => {
    const dodo = dodoOr503();
    await friendly(() => setDefaultCard(dodo, accountOf(c), c.req.param('id')));
    return c.json({ ok: true });
  });

  app.delete('/cards/:id', async (c) => {
    const dodo = dodoOr503();
    await friendly(() => removeCard(dodo, accountOf(c), c.req.param('id')));
    return c.json({ ok: true });
  });

  /** Dodo's customer portal: receipts, cards and the subscription. */
  app.post('/portal', async (c) => {
    const dodo = dodoOr503();
    return c.json({ url: await friendly(async () => billingPortal(dodo, await ensureCustomer(dodo, accountOf(c)))) });
  });

  app.post('/cancel', async (c) => {
    const body = z.object({ reason: z.string().max(500).optional() }).safeParse(await c.req.json().catch(() => ({})));
    const dodo = dodoOr503();
    await friendly(() => setCancelAtPeriodEnd(dodo, accountOf(c), true, body.success ? body.data.reason : undefined));
    return c.json({ ok: true });
  });

  app.post('/resume', async (c) => {
    const dodo = dodoOr503();
    await friendly(() => setCancelAtPeriodEnd(dodo, accountOf(c), false));
    return c.json({ ok: true });
  });

  app.post('/renew', async (c) => {
    const dodo = dodoOr503();
    return c.json(await friendly(() => renewPlan(dodo, accountOf(c))));
  });

  return app;
}
