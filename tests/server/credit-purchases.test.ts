import { beforeEach, describe, expect, it, vi } from 'vitest';

const fake = await vi.hoisted(async () => (await import('./fakeFirestore.js')).createFakeFirestore());
vi.mock('../../lib/server/firebase.js', async (original) => ({ ...(await original<typeof import('../../lib/server/firebase.js')>()), ...fake.module }));

import {
  allocateLots, applyPackPayment, applyRefund, ensurePackProduct, listPurchases, startPackPurchase, sweepExpiredTopups,
} from '../../lib/server/lib/creditPurchases.js';
import { creditSummary, effectivePlan, forgetPlans, PlanLimitError } from '../../lib/server/lib/plans.js';

const ACCOUNT = 'acc-1';
const DAY = 86_400_000;

function fakeDodo() {
  let products = 0;
  const calls: { products: any[]; archived: string[]; sessions: any[] } = { products: [], archived: [], sessions: [] };
  const dodo = {
    products: {
      create: vi.fn(async (body: any) => { calls.products.push(body); return { product_id: `pdt_${++products}` }; }),
      archive: vi.fn(async (id: string) => { calls.archived.push(id); }),
    },
    customers: { create: vi.fn(async () => ({ customer_id: 'cus_1' })) },
    checkoutSessions: { create: vi.fn(async (body: any) => { calls.sessions.push(body); return { checkout_url: 'https://checkout.example/s1' }; }) },
    payments: { retrieve: vi.fn() },
  };
  return { dodo: dodo as any, calls };
}

const payment = (over: Record<string, any> = {}) => ({
  payment_id: 'pay_1', status: 'succeeded', subscription_id: null, metadata: { writeorbit_kind: 'topup', writeorbit_pack: 'topup_500', writeorbit_account_id: ACCOUNT },
  product_cart: [{ product_id: 'pdt_1', quantity: 1 }], customer: { customer_id: 'cus_1' }, ...over,
}) as any;

const account = () => fake.read(`accounts/${ACCOUNT}`)!;

beforeEach(() => {
  fake.clear();
  forgetPlans();
  fake.put(`accounts/${ACCOUNT}`, { plan: 'plus', plan_source: 'dodo', plan_status: 'active', plan_subscription_id: 'sub_1', dodo_customer_id: 'cus_1', credit_topup: 0 });
  fake.put('users/user-1', { account_id: ACCOUNT, email: 'amina@example.com', full_name: 'Amina Njeri', created_at: new Date() });
});

describe('one-time products', () => {
  it('makes each pack once, and again when its price or mode changes', async () => {
    const { dodo, calls } = fakeDodo();
    expect(await ensurePackProduct(dodo, 'topup_500')).toBe('pdt_1');
    expect(await ensurePackProduct(dodo, 'topup_500')).toBe('pdt_1');
    expect(calls.products).toHaveLength(1);
    expect(calls.products[0].price).toMatchObject({ type: 'one_time_price', price: 700 });
    fake.put('billing_products/topup_500', { ...fake.read('billing_products/topup_500'), cents: 500 });
    expect(await ensurePackProduct(dodo, 'topup_500')).toBe('pdt_2');
    expect(calls.archived).toEqual(['pdt_1']);
  });

  it('opens checkout for a top-up with the pack and account in the metadata, and refuses Free', async () => {
    const { dodo, calls } = fakeDodo();
    expect(await startPackPurchase(dodo, ACCOUNT, 'topup_2000')).toEqual({ url: 'https://checkout.example/s1' });
    expect(calls.sessions[0]).toMatchObject({ metadata: { writeorbit_kind: 'topup', writeorbit_pack: 'topup_2000', writeorbit_account_id: ACCOUNT }, customer: { customer_id: 'cus_1' } });
    expect(calls.sessions[0].return_url).toContain('/account?purchase=topup_2000');
    fake.put(`accounts/${ACCOUNT}`, { ...account(), plan: 'free', plan_source: 'default', plan_status: 'none' });
    const refused = await startPackPurchase(dodo, ACCOUNT, 'topup_500').catch((error) => error);
    expect(refused).toBeInstanceOf(PlanLimitError);
    expect(refused.status).toBe(402);
    // The pass is for anyone, Free included.
    await expect(startPackPurchase(dodo, ACCOUNT, 'pass_defence')).resolves.toEqual({ url: 'https://checkout.example/s1' });
  });
});

describe('payments', () => {
  it('adds a top-up once, however often the payment arrives', async () => {
    const first = await applyPackPayment(payment());
    expect(first).toMatchObject({ credits: 500, duplicate: false });
    expect(await applyPackPayment(payment())).toMatchObject({ duplicate: true });
    expect(account().credit_topup).toBe(500);
    expect((await creditSummary(ACCOUNT)).left).toBe(1250);
  });

  it('finds the pack from the product in the cart when the metadata is missing', async () => {
    fake.put('billing_products/topup_2000', { product_id: 'pdt_big', cents: 2400, currency: 'usd', mode: 'test' });
    const applied = await applyPackPayment(payment({ payment_id: 'pay_2', metadata: {}, product_cart: [{ product_id: 'pdt_big', quantity: 1 }] }));
    expect(applied).toMatchObject({ pack: 'topup_2000', credits: 2000, account_id: ACCOUNT });
  });

  it('ignores plan charges and payments that did not succeed', async () => {
    expect(await applyPackPayment(payment({ subscription_id: 'sub_1' }))).toBeNull();
    expect(await applyPackPayment(payment({ status: 'failed' }))).toBeNull();
    expect(account().credit_topup).toBe(0);
  });

  it('runs a Defence Pass as Pro for 90 days, extends a running pass, and never replaces a live subscription', async () => {
    fake.put(`accounts/${ACCOUNT}`, { plan: 'free', plan_source: 'default', plan_status: 'none', dodo_customer_id: 'cus_1' });
    const now = new Date('2026-11-12T00:00:00Z');
    const pass = (id: string) => payment({ payment_id: id, metadata: { writeorbit_kind: 'pass', writeorbit_pack: 'pass_defence', writeorbit_account_id: ACCOUNT } });
    const first = await applyPackPayment(pass('pay_p1'), now);
    expect(first?.pass_end?.getTime()).toBe(now.getTime() + 90 * DAY);
    expect(account()).toMatchObject({ plan: 'pro', plan_source: 'pass', plan_status: 'active' });
    const second = await applyPackPayment(pass('pay_p2'), now);
    expect(second?.pass_end?.getTime()).toBe(now.getTime() + 180 * DAY);

    fake.put(`accounts/${ACCOUNT}`, { plan: 'plus', plan_source: 'dodo', plan_status: 'active', plan_subscription_id: 'sub_1', dodo_customer_id: 'cus_1', credit_topup: 0 });
    const converted = await applyPackPayment(pass('pay_p3'), now);
    expect(converted).toMatchObject({ converted: true, credits: 4500 });
    expect(account()).toMatchObject({ plan: 'plus', plan_source: 'dodo', credit_topup: 4500 });
  });
});

describe('refunds', () => {
  it('takes back the unspent part of a refunded top-up', async () => {
    await applyPackPayment(payment());
    fake.put(`accounts/${ACCOUNT}`, { ...account(), credit_topup: 380 }); // 120 spent
    const result = await applyRefund({ payment_id: 'pay_1', refund_id: 'ref_1', status: 'succeeded', amount: 700, is_partial: false, customer: { customer_id: 'cus_1' } as any, metadata: {} });
    expect(result).toMatchObject({ removed: 380 });
    expect(account().credit_topup).toBe(0);
    expect(fake.read(`accounts/${ACCOUNT}/credit_purchases/pay_1`)).toMatchObject({ status: 'refunded' });
    expect(await applyRefund({ payment_id: 'pay_1', refund_id: 'ref_1', status: 'succeeded', amount: 700, is_partial: false, customer: null as any, metadata: {} })).toMatchObject({ duplicate: true });
  });

  it('ends a refunded pass', async () => {
    fake.put(`accounts/${ACCOUNT}`, { plan: 'free', plan_source: 'default', plan_status: 'none', dodo_customer_id: 'cus_1' });
    await applyPackPayment(payment({ payment_id: 'pay_p', metadata: { writeorbit_kind: 'pass', writeorbit_pack: 'pass_defence', writeorbit_account_id: ACCOUNT } }));
    await applyRefund({ payment_id: 'pay_p', refund_id: 'ref_p', status: 'succeeded', amount: 4900, is_partial: false, customer: null as any, metadata: {} });
    expect(account()).toMatchObject({ plan_status: 'cancelled' });
    forgetPlans();
    expect((await effectivePlan(ACCOUNT)).plan.id).toBe('free');
  });
});

describe('top-up expiry', () => {
  it('spends the oldest lot first and leaves gifts for last', () => {
    const lots = [
      { id: 'new', credits: 500, created_at: new Date('2026-06-01') },
      { id: 'old', credits: 500, created_at: new Date('2026-01-01') },
    ];
    expect([...allocateLots(lots, 700)]).toEqual([['old', 200], ['new', 500]]);
    expect([...allocateLots(lots, 1100)]).toEqual([['old', 500], ['new', 500]]);
  });

  it('removes only the unspent part of a lot past its 12 months', async () => {
    const bought = new Date('2025-01-01T00:00:00Z');
    await applyPackPayment(payment({ payment_id: 'pay_old' }), bought);
    await applyPackPayment(payment({ payment_id: 'pay_new' }), new Date('2025-12-01T00:00:00Z'));
    fake.put(`accounts/${ACCOUNT}`, { ...account(), credit_topup: 700 }); // 300 spent, from the old lot
    const removed = await sweepExpiredTopups(ACCOUNT, new Date('2026-01-15T00:00:00Z'));
    expect(removed).toBe(200);
    expect(account().credit_topup).toBe(500);
    expect(await sweepExpiredTopups(ACCOUNT, new Date('2026-01-16T00:00:00Z'))).toBe(0);
    const listed = await listPurchases(ACCOUNT);
    expect(listed.map((lot) => [lot.id, lot.status, lot.credits_left])).toEqual([['pay_new', 'active', 500], ['pay_old', 'expired', 0]]);
  });
});
