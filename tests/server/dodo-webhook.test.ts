import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHmac } from 'node:crypto';

// Standard Webhooks secret: "whsec_" + the base64 key.
const SECRET = `whsec_${Buffer.from('writeorbit-test-webhook-key-0123').toString('base64')}`;

const fake = await vi.hoisted(async () => {
  process.env.DODO_PAYMENTS_API_KEY = 'test_key_for_unit_tests';
  process.env.DODO_PAYMENTS_WEBHOOK_KEY = `whsec_${Buffer.from('writeorbit-test-webhook-key-0123').toString('base64')}`;
  return (await import('./fakeFirestore.js')).createFakeFirestore();
});
vi.mock('../../lib/server/firebase.js', async (original) => ({ ...(await original<typeof import('../../lib/server/firebase.js')>()), ...fake.module }));

import { Hono } from 'hono';
import { dodoWebhookRoutes } from '../../lib/server/routes/dodoWebhook.js';

const app = new Hono().route('/api/dodo', dodoWebhookRoutes());

let sequence = 0;
function event(type: string, data: Record<string, unknown>) {
  return { business_id: 'bus_1', type, timestamp: new Date().toISOString(), data };
}

/** Signs like Dodo does: HMAC-SHA256 of "id.timestamp.body" with the decoded key. */
async function send(body: unknown, options: { secret?: string; id?: string } = {}) {
  const payload = JSON.stringify(body);
  const id = options.id ?? `msg_${++sequence}`;
  const timestamp = String(Math.floor(Date.now() / 1000));
  const key = Buffer.from((options.secret ?? SECRET).replace(/^whsec_/, ''), 'base64');
  const signature = createHmac('sha256', key).update(`${id}.${timestamp}.${payload}`).digest('base64');
  return app.request('/api/dodo/webhook', {
    method: 'POST', body: payload,
    headers: { 'content-type': 'application/json', 'webhook-id': id, 'webhook-timestamp': timestamp, 'webhook-signature': `v1,${signature}` },
  });
}

const keys = (part: string) => [...fake.store.keys()].filter((key) => key.includes(part));
const ledger = () => keys('/credit_ledger/').map((key) => ({ account: key.split('/')[1], ...fake.read(key)! }));
const balance = (account: string) => fake.read(`accounts/${account}`)?.credits_milli;

const payment = (id: string, extra: Record<string, unknown> = {}) => ({
  payment_id: id, status: 'succeeded', total_amount: 2990, currency: 'USD', created_at: new Date().toISOString(),
  customer: { customer_id: 'cus_1', email: 'a@example.com', name: 'A' }, billing: { country: 'US', zipcode: '94102' },
  payment_method_id: 'pm_1', metadata: { writeorbit_kind: 'credits', writeorbit_account_id: 'acc_1', pack: 'credits_2000' },
  ...extra,
});

describe('Dodo Payments webhook', () => {
  beforeEach(() => {
    fake.clear();
    for (const id of ['acc_1', 'acc_2', 'acc_3']) fake.put(`accounts/${id}`, { name: id, credits_milli: 0 });
  });

  it('rejects a payload signed with another secret', async () => {
    const response = await send(event('payment.succeeded', payment('pay_0')), { secret: `whsec_${Buffer.from('another-key-entirely-0123456789').toString('base64')}` });
    expect(response.status).toBe(401);
    expect(keys('billing_events/')).toHaveLength(0);
    expect(ledger()).toHaveLength(0);
  });

  it('adds the credits of a paid credit pack and keeps the card for top-ups', async () => {
    const response = await send(event('payment.succeeded', payment('pay_1')));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
    expect(ledger()).toHaveLength(1);
    expect(ledger()[0]).toMatchObject({ account: 'acc_1', kind: 'purchase', credits_milli: 2_000_000, amount_cents: 2990, reference: 'payment:pay_1' });
    expect(balance('acc_1')).toBe(2_000_000);
    expect(fake.read('accounts/acc_1')).toMatchObject({ dodo_customer_id: 'cus_1', dodo_payment_method_id: 'pm_1', dodo_billing: { country: 'US' } });
  });

  it('handles a repeated delivery only once', async () => {
    const body = event('payment.succeeded', payment('pay_2'));
    await send(body, { id: 'msg_same' });
    const again = await send(body, { id: 'msg_same' });
    expect(await again.json()).toEqual({ received: true, duplicate: true });
    expect(ledger()).toHaveLength(1);
  });

  it('grants a payment once even when two deliveries report it', async () => {
    await send(event('payment.succeeded', payment('pay_3')));
    await send(event('payment.succeeded', payment('pay_3')));
    expect(ledger()).toHaveLength(1);
    expect(balance('acc_1')).toBe(2_000_000);
  });

  it('adds an automatic top-up', async () => {
    await send(event('payment.succeeded', payment('pay_4', {
      total_amount: 11900, metadata: { writeorbit_kind: 'credits_topup', writeorbit_account_id: 'acc_2', pack: 'credits_10000' },
    })));
    expect(ledger()[0]).toMatchObject({ account: 'acc_2', kind: 'topup', credits_milli: 10_000_000, amount_cents: 11900, reference: 'payment:pay_4' });
  });

  it('turns top-ups off when a top-up payment fails', async () => {
    fake.put('accounts/acc_2', { name: 'acc_2', credits_milli: 0, topup_enabled: true });
    await send(event('payment.failed', payment('pay_5', { status: 'failed', metadata: { writeorbit_kind: 'credits_topup', writeorbit_account_id: 'acc_2', pack: 'credits_2000' } })));
    expect(fake.read('accounts/acc_2')).toMatchObject({ topup_enabled: false, topup_error: 'the card was declined.' });
    expect(ledger()).toHaveLength(0);
  });

  it('ignores payments that are not AI for Research credits, or not paid', async () => {
    await send(event('payment.succeeded', payment('pay_6', { metadata: {} })));
    await send(event('payment.succeeded', payment('pay_7', { status: 'processing', metadata: { writeorbit_kind: 'credits', writeorbit_account_id: 'acc_3', pack: 'credits_2000' } })));
    expect(ledger()).toHaveLength(0);
  });

  it('refuses credits for a payment from another account’s customer', async () => {
    fake.put('accounts/acc_3', { name: 'acc_3', credits_milli: 0, dodo_customer_id: 'cus_other' });
    await send(event('payment.succeeded', payment('pay_8', { metadata: { writeorbit_kind: 'credits', writeorbit_account_id: 'acc_3', pack: 'credits_2000' } })));
    expect(ledger()).toHaveLength(0);
  });

  it('records deliveries it does not act on', async () => {
    const response = await send(event('refund.succeeded', { refund_id: 'ref_1', payment_id: 'pay_1' }));
    expect(response.status).toBe(200);
    expect(ledger()).toHaveLength(0);
    expect(keys('billing_events/')).toHaveLength(1);
  });
});
