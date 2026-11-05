import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { C, col, db, rows } from '../firebase.js';
import { requireUser, type AppVariables } from '../auth.js';
import { createApiKey, forgetApiKeys } from '../lib/apiKeys.js';
import { CREDIT_PACKS, publicPrices } from '../lib/prices.js';
import { billingMode, stripeClient } from '../lib/stripeBilling.js';
import { completeCreditCheckout, creditOverview, dailyFreeCredits, grantStarter, startCreditCheckout, starterCredits, topUp, wallet } from '../lib/credits.js';

/**
 * Developer API account pages: API keys, credits (balance, free credits today, packs, automatic
 * top-up) and usage per service this month.
 */
function stripeOr503() {
  try {
    const stripe = stripeClient();
    if (stripe) return stripe;
  } catch (error) {
    throw new HTTPException(503, { message: (error as Error).message });
  }
  throw new HTTPException(503, { message: 'Payments are not set up yet.' });
}

/** Public: prices and packs for the developer page. */
export function cloudPriceRoutes() {
  const app = new Hono();
  app.get('/', (c) => c.json({ ...publicPrices(), free_per_day: dailyFreeCredits(), starter_credits: starterCredits() }));
  return app;
}

/** Changes a key of this account that is not revoked (in a transaction); null when there is none. */
async function liveKey<T>(
  id: string, accountId: string,
  change: (current: Record<string, any>) => Record<string, any>,
  result: (current: Record<string, any>, change: Record<string, any>) => T,
): Promise<T | null> {
  if (!id || id.includes('/')) return null;
  const ref = col(C.apiKeys).doc(id);
  return db().runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    const current: Record<string, any> | null = snapshot.exists ? { id: snapshot.id, ...(snapshot.data() as Record<string, any>) } : null;
    if (!current || current.account_id !== accountId || current.revoked_at) return null;
    const update = change(current);
    if (Object.keys(update).length) tx.update(ref, update);
    return result(current, update);
  });
}

export function cloudRoutes() {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use('*', requireUser);
  const accountOf = (c: { get: (key: 'user') => AppVariables['user'] }) => c.get('user')!.account_id;

  app.get('/', async (c) => c.json(await creditOverview(accountOf(c))));

  app.get('/keys', async (c) => {
    const keys = rows<Record<string, any>>(await col(C.apiKeys).where('account_id', '==', accountOf(c)).get())
      .sort((a, b) => (b.created_at?.getTime?.() ?? 0) - (a.created_at?.getTime?.() ?? 0))
      .map((key) => ({
        id: key.id, name: key.name, prefix: key.prefix, mode: key.mode, monthly_credit_cap: key.monthly_credit_cap ?? null,
        created_at: key.created_at ?? null, last_used_at: key.last_used_at ?? null, revoked_at: key.revoked_at ?? null,
      }));
    return c.json({ keys });
  });

  app.post('/keys', async (c) => {
    const parsed = z.object({ name: z.string().trim().min(1).max(80).default('Default key') }).safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw new HTTPException(422, { message: 'Give the key a name.' });
    const count = (await col(C.apiKeys).where('account_id', '==', accountOf(c)).where('revoked_at', '==', null).count().get()).data().count;
    if (count >= 20) throw new HTTPException(422, { message: 'An account can have up to 20 keys. Revoke one first.' });
    const { key, row } = await createApiKey(accountOf(c), parsed.data.name, billingMode());
    await grantStarter(accountOf(c)).catch((error) => console.error('starter credits failed', error));
    return c.json({ key, id: row.id, name: row.name, prefix: row.prefix, mode: row.mode, notice: 'Copy this key now. It will not be shown again.' }, 201);
  });

  app.patch('/keys/:id', async (c) => {
    const parsed = z.object({ name: z.string().trim().min(1).max(80).optional(), monthly_credit_cap: z.number().int().min(1).max(100_000_000).nullable().optional() })
      .safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw new HTTPException(422, { message: 'Give a name, or a monthly cap of at least 1 credit.' });
    const row = await liveKey(c.req.param('id'), accountOf(c), (current) => ({
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.monthly_credit_cap !== undefined ? { monthly_credit_cap: parsed.data.monthly_credit_cap ?? null } : {}),
    }), (current, change) => ({ id: current.id, name: change.name ?? current.name, monthly_credit_cap: change.monthly_credit_cap !== undefined ? change.monthly_credit_cap : current.monthly_credit_cap ?? null }));
    if (!row) throw new HTTPException(404, { message: 'Key not found' });
    forgetApiKeys();
    return c.json(row);
  });

  app.delete('/keys/:id', async (c) => {
    const row = await liveKey(c.req.param('id'), accountOf(c), () => ({ revoked_at: new Date() }), (current) => ({ id: current.id }));
    if (!row) throw new HTTPException(404, { message: 'Key not found' });
    forgetApiKeys();
    return c.json({ revoked: true });
  });

  app.get('/credits', async (c) => c.json(await wallet(accountOf(c))));

  app.post('/credits/checkout', async (c) => {
    const parsed = z.object({ pack: z.enum(CREDIT_PACKS.map((pack) => pack.id) as [string, ...string[]]) }).safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw new HTTPException(422, { message: 'Choose a credit pack.' });
    const stripe = stripeOr503();
    try {
      return c.json(await startCreditCheckout(stripe, accountOf(c), parsed.data.pack));
    } catch (error) {
      if (error instanceof HTTPException) throw error;
      throw new HTTPException(422, { message: (error as Error).message || 'The payment page could not open.' });
    }
  });

  /** Back from Checkout: the credits are added straight away (the webhook does the same, once). */
  app.post('/credits/complete', async (c) => {
    const parsed = z.object({ session: z.string().min(5).max(300) }).safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw new HTTPException(422, { message: 'Missing checkout session.' });
    return c.json(await completeCreditCheckout(stripeOr503(), accountOf(c), parsed.data.session));
  });

  app.put('/topup', async (c) => {
    const parsed = z.object({
      enabled: z.boolean(),
      threshold: z.number().int().min(10).max(1_000_000),
      pack: z.enum(CREDIT_PACKS.map((pack) => pack.id) as [string, ...string[]]),
      monthly_limit_usd: z.number().min(10).max(100_000),
    }).safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw new HTTPException(422, { message: 'Set a threshold, a pack and a monthly limit of at least $10.' });
    const pack = CREDIT_PACKS.find((item) => item.id === parsed.data.pack)!;
    if (parsed.data.enabled && pack.cents > parsed.data.monthly_limit_usd * 100) throw new HTTPException(422, { message: 'The monthly limit must cover at least one pack.' });
    if (parsed.data.enabled) {
      const account = (await col(C.accounts).doc(accountOf(c)).get()).data() as { stripe_customer_id?: string | null } | undefined;
      if (!account?.stripe_customer_id) throw new HTTPException(422, { message: 'Buy credits once first: that card is used for top-ups.' });
    }
    await col(C.accounts).doc(accountOf(c)).update({
      topup_enabled: parsed.data.enabled, topup_threshold: parsed.data.threshold, topup_pack: parsed.data.pack,
      topup_monthly_limit_cents: Math.round(parsed.data.monthly_limit_usd * 100), topup_error: null,
    });
    // Already under the threshold: top up now rather than on the next call. Awaited, because a
    // route handler's instance may stop working once the response is sent.
    if (parsed.data.enabled) await topUp(accountOf(c)).catch((error) => console.error('top-up failed', error));
    return c.json({ ok: true });
  });

  return app;
}
