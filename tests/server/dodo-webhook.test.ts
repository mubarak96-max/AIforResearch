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

describe('Dodo Payments webhook', () => {
  beforeEach(() => {
    fake.clear();
  });

  it('rejects a payload signed with another secret', async () => {
    const response = await send(event('refund.succeeded', { refund_id: 'ref_0', payment_id: 'pay_0' }), { secret: `whsec_${Buffer.from('another-key-entirely-0123456789').toString('base64')}` });
    expect(response.status).toBe(401);
    expect(keys('billing_events/')).toHaveLength(0);
  });

  it('records deliveries it does not act on', async () => {
    const response = await send(event('refund.succeeded', { refund_id: 'ref_1', payment_id: 'pay_1' }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
    expect(keys('billing_events/')).toHaveLength(1);
  });

  it('handles a repeated delivery only once', async () => {
    const body = event('refund.succeeded', { refund_id: 'ref_2', payment_id: 'pay_2' });
    await send(body, { id: 'msg_same' });
    const again = await send(body, { id: 'msg_same' });
    expect(await again.json()).toEqual({ received: true, duplicate: true });
    expect(keys('billing_events/')).toHaveLength(1);
  });
});
