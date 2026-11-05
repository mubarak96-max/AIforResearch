import { beforeEach, describe, expect, it, vi } from 'vitest';

const fake = await vi.hoisted(async () => (await import('./fakeFirestore.js')).createFakeFirestore());
vi.mock('../src/firebase.js', async (original) => ({ ...(await original<typeof import('../src/firebase.js')>()), ...fake.module }));

// What plan checks read: plans, one account, its usage, and the size of the Library.
const db = {
  state: {
    set account(value: Record<string, unknown>) {
      const { plan_id, ...rest } = value;
      fake.put('accounts/acc-1', { plan: plan_id, ...rest });
    },
    get account(): Record<string, unknown> {
      const { plan, ...rest } = fake.read('accounts/acc-1') ?? {};
      return { plan_id: plan, ...rest };
    },
    set libraryPdfs(count: number) {
      for (const key of [...fake.store.keys()]) if (key.startsWith('library_documents/')) fake.store.delete(key);
      for (let index = 0; index < count; index += 1) fake.put(`library_documents/pdf-${index}`, { user_id: 'user-1', file_type: 'pdf' });
    },
    usage: { get size() { return [...fake.store.keys()].filter((key) => key.includes('/plan_usage/')).length; } },
  },
};

import { Hono } from 'hono';
import {
  DEFAULT_PLANS, PlanLimitError, checkLibraryRoom, checkQuota, countUse, effectivePlan, forgetPlans, loadPlans, planQuota, requireFeature, seedPlans,
} from '../src/lib/plans.js';

const ACCOUNT = 'acc-1';

beforeEach(() => {
  fake.clear();
  for (const { features, ...plan } of DEFAULT_PLANS) {
    fake.put(`plans/${plan.id}`, { ...plan, features: features.map((feature, index) => ({ ...feature, sort_order: index })), stripe_product_id: null, stripe_monthly_price_id: null, stripe_yearly_price_id: null, stripe_mode: null });
  }
  db.state.account = { plan_id: 'free', plan_status: 'none', plan_source: 'default', plan_interval: null, plan_period_end: null, plan_cancel_at_period_end: false, plan_subscription_id: null };
  db.state.libraryPdfs = 0;
  forgetPlans();
});

describe('plans in Firestore', () => {
  it('seeds the default plans once, with their features embedded in order', async () => {
    fake.clear();
    expect(await seedPlans()).toBe(true);
    expect(await seedPlans()).toBe(false);
    forgetPlans();
    const { plans, features } = await loadPlans();
    expect(plans.map((plan) => plan.id)).toEqual(['free', 'plus', 'pro', 'team']);
    expect(features.get('free')?.[0]).toEqual({ label: 'The full editor, on any device', included: true });
  });
});

describe('which plan an account has', () => {
  it('is the default plan without a subscription, the subscribed plan while it is live, and the default again once it ends', async () => {
    expect((await effectivePlan(ACCOUNT)).plan.id).toBe('free');
    db.state.account = { ...db.state.account, plan_id: 'pro', plan_source: 'stripe', plan_status: 'active' };
    expect((await effectivePlan(ACCOUNT)).plan.id).toBe('pro');
    db.state.account = { ...db.state.account, plan_status: 'past_due' };
    expect((await effectivePlan(ACCOUNT)).plan.id).toBe('pro');
    db.state.account = { ...db.state.account, plan_status: 'canceled' };
    expect((await effectivePlan(ACCOUNT)).plan.id).toBe('free');
    db.state.account = { ...db.state.account, plan_id: 'plus', plan_source: 'admin', plan_status: 'active' };
    expect((await effectivePlan(ACCOUNT)).plan.id).toBe('plus');
  });
});

describe('counted limits', () => {
  it('lets a Free account use 10 autocompletes a day, then refuses with a reason', async () => {
    for (let index = 0; index < 10; index += 1) {
      expect(await checkQuota(ACCOUNT, 'autocomplete')).toBe(10 - index);
      await countUse(ACCOUNT, 'autocomplete');
    }
    const error = await checkQuota(ACCOUNT, 'autocomplete').catch((caught) => caught);
    expect(error).toBeInstanceOf(PlanLimitError);
    expect(error.status).toBe(402);
    expect(error.message).toBe("You have used today's 10 AI autocompletes on the Free plan. Upgrade for more.");
  });

  it('counts Plus by the month and never limits Pro', async () => {
    db.state.account = { ...db.state.account, plan_id: 'plus', plan_source: 'stripe', plan_status: 'active' };
    expect(await checkQuota(ACCOUNT, 'chat')).toBe(500);
    await countUse(ACCOUNT, 'chat', 500);
    await expect(checkQuota(ACCOUNT, 'chat')).rejects.toThrow("this month's 500 AI chat messages on the Plus plan");
    db.state.account = { ...db.state.account, plan_id: 'pro' };
    forgetPlans();
    expect(await checkQuota(ACCOUNT, 'chat')).toBeNull();
  });
});

describe('features and totals', () => {
  it('keeps LaTeX export for paid plans and stops the 11th PDF on Free', async () => {
    await expect(requireFeature(ACCOUNT, 'latex_export')).rejects.toBeInstanceOf(PlanLimitError);
    db.state.libraryPdfs = 9;
    await expect(checkLibraryRoom(ACCOUNT, 'user-1')).resolves.toBeUndefined();
    db.state.libraryPdfs = 10;
    await expect(checkLibraryRoom(ACCOUNT, 'user-1')).rejects.toThrow('Your Free plan includes 10 PDFs in your Library');
    db.state.account = { ...db.state.account, plan_id: 'plus', plan_source: 'stripe', plan_status: 'trialing' };
    await expect(requireFeature(ACCOUNT, 'latex_export')).resolves.toBeUndefined();
    await expect(checkLibraryRoom(ACCOUNT, 'user-1')).resolves.toBeUndefined();
  });
});

describe('planQuota on a route', () => {
  const app = new Hono<{ Variables: { user: { account_id: string } } }>();
  app.use('*', async (c, next) => { c.set('user', { account_id: ACCOUNT }); await next(); });
  app.post('/suggest', planQuota('autocomplete', { counted: (body) => Boolean(body?.text) }), async (c) => {
    const { text } = await c.req.json();
    return c.json({ text });
  });
  app.onError((error, c) => (error instanceof PlanLimitError
    ? c.json({ detail: error.message, code: 'plan_limit', limit: error.key }, 402)
    : c.json({ detail: 'error' }, 500)));
  const post = (text: string) => app.request('/suggest', { method: 'POST', body: JSON.stringify({ text }), headers: { 'content-type': 'application/json' } });

  it('counts only useful answers and answers 402 with the limit once used up', async () => {
    expect((await post('')).status).toBe(200);
    expect(db.state.usage.size).toBe(0);
    for (let index = 0; index < 10; index += 1) expect((await post('A sentence.')).status).toBe(200);
    const refused = await post('One more.');
    expect(refused.status).toBe(402);
    expect(await refused.json()).toMatchObject({ code: 'plan_limit', limit: 'autocomplete' });
  });
});
