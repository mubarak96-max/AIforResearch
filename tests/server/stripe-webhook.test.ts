import { beforeEach, describe, expect, it, vi } from 'vitest';

const fake = await vi.hoisted(async () => {
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
  return (await import('./fakeFirestore.js')).createFakeFirestore();
});
vi.mock('../../lib/server/firebase.js', async (original) => ({ ...(await original<typeof import('../../lib/server/firebase.js')>()), ...fake.module }));

import { Hono } from 'hono';
import Stripe from 'stripe';
import { stripeWebhookRoutes } from '../../lib/server/routes/stripeWebhook.js';

const app = new Hono().route('/api/stripe', stripeWebhookRoutes());

function event(type: string, object: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  return { id: `evt_${type}_${Math.random().toString(36).slice(2)}`, object: 'event', type, created: 1_793_200_000, livemode: false, data: { object }, ...extra };
}

async function send(body: unknown, secret = 'whsec_test_secret') {
  const payload = JSON.stringify(body);
  const header = await Stripe.webhooks.generateTestHeaderStringAsync({ payload, secret });
  return app.request('/api/stripe/webhook', { method: 'POST', body: payload, headers: { 'stripe-signature': header, 'content-type': 'application/json' } });
}

const keys = (part: string) => [...fake.store.keys()].filter((key) => key.includes(part));
const ledger = () => keys('/credit_ledger/').map((key) => ({ account: key.split('/')[1], ...fake.read(key)! }));
const balance = (account: string) => fake.read(`accounts/${account}`)?.credits_milli;

describe('Stripe webhook', () => {
  beforeEach(() => {
    fake.clear();
    for (const id of ['acc_1', 'acc_2', 'acc_3']) fake.put(`accounts/${id}`, { name: id, credits_milli: 0 });
  });

  it('rejects a payload signed with another secret', async () => {
    const response = await send(event('invoice.paid', { customer: 'cus_1' }), 'whsec_wrong');
    expect(response.status).toBe(400);
    expect(keys('stripe_events/')).toHaveLength(0);
  });

  const paidCheckout = (id: string) => event('checkout.session.completed', {
    id, object: 'checkout.session', mode: 'payment', payment_status: 'paid', amount_total: 2990,
    metadata: { researchcove_kind: 'credits', researchcove_account_id: 'acc_1', pack: 'credits_2000' },
  });

  it('adds the credits of a paid credit pack', async () => {
    const response = await send(paidCheckout('cs_1'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
    expect(ledger()).toHaveLength(1);
    expect(ledger()[0]).toMatchObject({ account: 'acc_1', kind: 'purchase', credits_milli: 2_000_000, amount_cents: 2990, reference: 'checkout:cs_1' });
    expect(balance('acc_1')).toBe(2_000_000);
  });

  it('handles a repeated event only once', async () => {
    const body = paidCheckout('cs_2');
    await send(body);
    const again = await send(body);
    expect(await again.json()).toEqual({ received: true, duplicate: true });
    expect(ledger()).toHaveLength(1);
  });

  it('grants a payment once even when two events report it', async () => {
    await send(paidCheckout('cs_3'));
    await send(paidCheckout('cs_3'));
    expect(ledger()).toHaveLength(1);
    expect(balance('acc_1')).toBe(2_000_000);
  });

  it('adds an automatic top-up the direct grant missed', async () => {
    await send(event('payment_intent.succeeded', { id: 'pi_1', status: 'succeeded', amount: 11900, metadata: { researchcove_kind: 'credits_topup', researchcove_account_id: 'acc_2', pack: 'credits_10000' } }));
    expect(ledger()[0]).toMatchObject({ account: 'acc_2', kind: 'topup', credits_milli: 10_000_000, amount_cents: 11900, reference: 'payment:pi_1' });
  });

  it('ignores payments that are not ResearchCove credits', async () => {
    await send(event('payment_intent.succeeded', { id: 'pi_2', status: 'succeeded', amount: 500, metadata: {} }));
    await send(event('checkout.session.completed', { id: 'cs_4', mode: 'payment', payment_status: 'unpaid', metadata: { researchcove_kind: 'credits', researchcove_account_id: 'acc_3', pack: 'credits_2000' } }));
    expect(ledger()).toHaveLength(0);
  });

  it('ignores live-mode events until live payments are switched on', async () => {
    const response = await send(event('invoice.paid', { customer: 'cus_4' }, { livemode: true }));
    expect(await response.json()).toEqual({ received: true, ignored: 'live mode' });
    expect(keys('stripe_events/')).toHaveLength(0);
  });

  it('records events it does not act on', async () => {
    const response = await send(event('customer.created', { id: 'cus_5' }));
    expect(response.status).toBe(200);
    expect(ledger()).toHaveLength(0);
    expect(keys('stripe_events/')).toHaveLength(1);
  });
});
