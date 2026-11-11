import DodoPayments from 'dodopayments';
import { env } from '../env.js';
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

/** 'live' when real payments are on, else 'test'. */
export function billingMode(): 'test' | 'live' {
  return env.billingLive ? 'live' : 'test';
}

export type Dodo = DodoPayments;

/** Dodo wants upper-case ISO currency codes. */
export const dodoCurrency = (currency: string) => currency.toUpperCase() as DodoPayments.Currency;

/** True for a Dodo "not found" answer (an id from the other mode, or deleted). */
export const isNotFound = (error: unknown) => (error as { status?: number })?.status === 404;
