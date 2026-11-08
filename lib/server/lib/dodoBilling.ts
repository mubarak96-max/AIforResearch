import DodoPayments from 'dodopayments';
import { env } from '../env.js';
import { C, col, db } from '../firebase.js';
import { settings } from './settings.js';

/**
 * The Dodo Payments client for plans and credit purchases. Dodo keys do not say which mode they
 * belong to, so the mode comes from the server: test mode always, live mode only when the
 * server's environment says BILLING_LIVE=1 (real charges can never be switched on from the browser).
 */
let cached: { key: string; live: boolean; client: DodoPayments } | null = null;

export function dodoClient(): DodoPayments | null {
  const key = settings().dodoApiKey;
  if (!key) return null;
  const live = env.billingLive;
  if (cached?.key !== key || cached.live !== live) {
    cached = { key, live, client: new DodoPayments({ bearerToken: key, environment: live ? 'live_mode' : 'test_mode' }) };
  }
  return cached.client;
}

/** 'live' when real payments are on, else 'test'. API keys carry this in their prefix. */
export function billingMode(): 'test' | 'live' {
  return env.billingLive ? 'live' : 'test';
}

export type Dodo = DodoPayments;

/** Dodo wants upper-case ISO currency codes. */
export const dodoCurrency = (currency: string) => currency.toUpperCase() as DodoPayments.Currency;

/** True for a Dodo "not found" answer (an id from the other mode, or deleted). */
export const isNotFound = (error: unknown) => (error as { status?: number })?.status === 404;

/**
 * A one-time Dodo product for something the app sells at a fixed price (a credit pack), created on
 * first use and stored in `billing_products/{key}`. A new price or mode makes a new product (the
 * old one is archived), so a product always matches what the page shows.
 */
export async function ensureOneTimeProduct(dodo: Dodo, key: string, input: { name: string; cents: number; currency?: string }) {
  const ref = col(C.billingProducts).doc(key);
  const mode = billingMode();
  const stored = (await ref.get()).data() as { product_id?: string; cents?: number; mode?: string } | undefined;
  if (stored?.product_id && stored.cents === input.cents && stored.mode === mode) return stored.product_id;
  const product = await dodo.products.create({
    name: input.name,
    tax_category: 'saas',
    price: { type: 'one_time_price', price: input.cents, currency: dodoCurrency(input.currency ?? 'usd'), discount: 0, purchasing_power_parity: false },
    metadata: { writeorbit_product: key },
  });
  if (stored?.product_id && stored.mode === mode) await dodo.products.archive(stored.product_id).catch(() => undefined);
  // Two instances may create one at the same moment: keep the first, archive the other.
  return db().runTransaction(async (tx) => {
    const current = (await tx.get(ref)).data() as { product_id?: string; cents?: number; mode?: string } | undefined;
    if (current?.product_id && current.product_id !== stored?.product_id && current.cents === input.cents && current.mode === mode) {
      void dodo.products.archive(product.product_id).catch(() => undefined);
      return current.product_id;
    }
    tx.set(ref, { product_id: product.product_id, cents: input.cents, mode, updated_at: new Date() });
    return product.product_id;
  });
}
