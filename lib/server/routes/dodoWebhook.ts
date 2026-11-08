import { Hono } from 'hono';
import type DodoPayments from 'dodopayments';
import { C, col } from '../firebase.js';
import { settings } from '../lib/settings.js';
import { dodoClient } from '../lib/dodoBilling.js';
import { syncPlanSubscription } from '../lib/planBilling.js';
import { grantForPayment, rememberCard, topUpFailed } from '../lib/credits.js';

/** Events the webhook subscribes to (Dodo dashboard → Developer → Webhooks; also set by Admin › Billing). */
export const WEBHOOK_EVENTS = [
  'subscription.active',
  'subscription.updated',
  'subscription.renewed',
  'subscription.plan_changed',
  'subscription.on_hold',
  'subscription.past_due',
  'subscription.cancelled',
  'subscription.expired',
  'subscription.failed',
  'payment.succeeded',
  'payment.failed',
] as const satisfies readonly DodoPayments.WebhookEventType[];

async function hasPlanSubscription(subscriptionId: string) {
  const found = await col(C.accounts).where('plan_subscription_id', '==', subscriptionId).limit(1).get();
  return !found.empty;
}

/** The plan subscription an event is about, if any (plan subscriptions carry writeorbit_kind=plan). */
async function planSubscriptionOf(event: DodoPayments.UnwrapWebhookEvent): Promise<string | null> {
  if (!event.type.startsWith('subscription.')) return null;
  const subscription = event.data as DodoPayments.Subscriptions.Subscription;
  if (subscription.metadata?.writeorbit_kind === 'plan') return subscription.subscription_id;
  return (await hasPlanSubscription(subscription.subscription_id)) ? subscription.subscription_id : null;
}

/**
 * Dodo Payments webhook: POST /api/dodo/webhook. Verifies the Standard Webhooks signature with
 * the signing secret from the admin page and handles each delivery once (by its webhook-id):
 * plan subscriptions keep the account's plan, paid credit purchases and top-ups add credits.
 */
export function dodoWebhookRoutes() {
  const app = new Hono();

  app.post('/webhook', async (c) => {
    const secret = settings().dodoWebhookSecret;
    const dodo = dodoClient();
    if (!secret || !dodo) return c.json({ detail: 'Dodo Payments is not set up (admin page → Billing).' }, 503);
    // The exact bytes Dodo signed: never re-serialise before verifying.
    const payload = await c.req.text();
    const webhookId = c.req.header('webhook-id') ?? '';
    let event: DodoPayments.UnwrapWebhookEvent;
    try {
      event = dodo.webhooks.unwrap(payload, {
        key: secret,
        headers: {
          'webhook-id': webhookId,
          'webhook-signature': c.req.header('webhook-signature') ?? '',
          'webhook-timestamp': c.req.header('webhook-timestamp') ?? '',
        },
      });
    } catch {
      return c.json({ detail: 'Invalid webhook signature' }, 401);
    }
    if (!webhookId) return c.json({ detail: 'Missing webhook-id' }, 400);

    const planSubscription = await planSubscriptionOf(event);
    // create() fails when the delivery was handled before (Dodo retries and may send it twice).
    const eventRef = col(C.billingEvents).doc(webhookId.replace(/\//g, '_'));
    const fresh = await eventRef.create({ type: event.type, received_at: new Date() }).then(() => true, (error: { code?: number }) => {
      if (error?.code === 6) return false; // ALREADY_EXISTS
      throw error;
    });
    if (!fresh) return c.json({ received: true, duplicate: true });
    try {
      if (planSubscription) {
        // Deliveries can arrive out of order: read the subscription as it is now.
        await syncPlanSubscription(await dodo.subscriptions.retrieve(planSubscription), new Date(event.timestamp));
      } else if (event.type === 'payment.succeeded') {
        const payment = event.data;
        const granted = await grantForPayment(payment);
        // A plan's first payment: keep its card and address for credit top-ups.
        if (!granted.granted && payment.metadata?.writeorbit_kind === 'plan' && payment.metadata.writeorbit_account_id) {
          await rememberCard(String(payment.metadata.writeorbit_account_id), payment);
        }
      } else if (event.type === 'payment.failed') {
        await topUpFailed(event.data);
      }
    } catch (error) {
      // Dodo retries on 5xx; credits are granted once per payment whichever attempt lands.
      console.error('dodo webhook handling failed', event.type, webhookId, (error as Error).message);
      await eventRef.delete().catch(() => undefined);
      return c.json({ detail: 'Handling failed; retry.' }, 500);
    }
    return c.json({ received: true });
  });

  return app;
}
