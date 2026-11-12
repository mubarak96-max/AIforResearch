import { beforeEach, describe, expect, it, vi } from 'vitest';

const fake = await vi.hoisted(async () => (await import('./fakeFirestore.js')).createFakeFirestore());
vi.mock('../../lib/server/firebase.js', async (original) => ({ ...(await original<typeof import('../../lib/server/firebase.js')>()), ...fake.module }));

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
  PlanLimitError, addTopupCredits, checkLibraryRoom, checkQuota, checkRunning, checkTotal, countUse, creditSummary, effectivePlan, forgetPlans, loadPlans,
  planQuota, publicPlan, refundCredits, requireFeature, spendCredits,
} from '../../lib/server/lib/plans.js';

const ACCOUNT = 'acc-1';

beforeEach(() => {
  fake.clear();
  db.state.account = { plan_id: 'free', plan_status: 'none', plan_source: 'default', plan_interval: null, plan_period_end: null, plan_cancel_at_period_end: false, plan_subscription_id: null };
  db.state.libraryPdfs = 0;
  forgetPlans();
});

describe('plans in code', () => {
  it('come from plans.ts in order, with their features, and paid ones can be bought before any Dodo product exists', async () => {
    const { plans, features } = await loadPlans();
    expect(plans.map((plan) => plan.id)).toEqual(['free', 'plus', 'pro', 'team']);
    expect(features.get('free')?.[0]).toEqual({ label: '45 credits a month for AI research, reviews and drafts', included: true });
    const plus = plans.find((plan) => plan.id === 'plus')!;
    expect(plus.dodo_monthly_product_id).toBeNull();
    expect(publicPlan(plus, [])).toMatchObject({ purchasable: true, has_monthly: true, has_yearly: true });
    expect(publicPlan(plans.find((plan) => plan.id === 'team')!, []).purchasable).toBe(false);
  });

  it('use a stored Dodo product only while its price, trial and mode match the code', async () => {
    const product = { kind: 'plan', currency: 'usd', trial_days: 0, mode: 'test' };
    fake.put('billing_products/plan_plus_month', { ...product, product_id: 'pdt_plus_month', cents: 1200 });
    fake.put('billing_products/plan_plus_year', { ...product, product_id: 'pdt_plus_year_old', cents: 9000 }); // an old price
    fake.put('billing_products/plan_pro_month', { ...product, product_id: 'pdt_pro_live', cents: 2900, mode: 'live' }); // the other mode
    const plans = (await loadPlans()).plans;
    const plus = plans.find((plan) => plan.id === 'plus')!;
    expect(plus.dodo_monthly_product_id).toBe('pdt_plus_month');
    expect(plus.dodo_yearly_product_id).toBeNull();
    expect(plans.find((plan) => plan.id === 'pro')!.dodo_monthly_product_id).toBeNull();
  });
});

describe('which plan an account has', () => {
  it('is the default plan without a subscription, the subscribed plan while it is live, and the default again once it ends', async () => {
    expect((await effectivePlan(ACCOUNT)).plan.id).toBe('free');
    db.state.account = { ...db.state.account, plan_id: 'pro', plan_source: 'dodo', plan_status: 'active' };
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

  it('lets a Free account run 2 reports a day and one at a time; Pro runs 3 at once', async () => {
    for (let index = 0; index < 2; index += 1) {
      await checkQuota(ACCOUNT, 'research_runs');
      await countUse(ACCOUNT, 'research_runs');
    }
    await expect(checkQuota(ACCOUNT, 'research_runs')).rejects.toThrow("You have used today's 2 Deep and Detailed reports on the Free plan");
    await expect(checkRunning(ACCOUNT, 0)).resolves.toBeUndefined();
    await expect(checkRunning(ACCOUNT, 1)).rejects.toThrow('A report is already running. Your Free plan runs one at a time');
    db.state.account = { ...db.state.account, plan_id: 'pro', plan_source: 'dodo', plan_status: 'active' };
    await expect(checkRunning(ACCOUNT, 2)).resolves.toBeUndefined();
    const error = await checkRunning(ACCOUNT, 3).catch((caught) => caught);
    expect(error).toMatchObject({ status: 402, key: 'research_parallel' });
    expect(await checkQuota(ACCOUNT, 'research_runs')).toBe(38);
  });

});

describe('credits', () => {
  it('gives Free 45 credits a month, refuses a job that needs more than is left, and refunds a failed job', async () => {
    expect(await creditSummary(ACCOUNT)).toMatchObject({ allowance: 45, used: 0, topup: 0, left: 45 });
    const deep = await spendCredits(ACCOUNT, 5);
    expect(deep).toMatchObject({ fromPlan: 5, fromTopup: 0 });
    await spendCredits(ACCOUNT, 35);
    const error = await spendCredits(ACCOUNT, 10, 'A document review').catch((caught) => caught);
    expect(error).toBeInstanceOf(PlanLimitError);
    expect(error.status).toBe(402);
    expect(error.message).toContain('A document review needs 10 credits and you have 5 left on the Free plan');
    await refundCredits(deep);
    expect((await creditSummary(ACCOUNT)).left).toBe(10);
  });

  it('uses top-up credits after the month runs out and gives them back on refund', async () => {
    await spendCredits(ACCOUNT, 43);
    await addTopupCredits(ACCOUNT, 500);
    const charge = await spendCredits(ACCOUNT, 10);
    expect(charge).toMatchObject({ fromPlan: 2, fromTopup: 8 });
    expect(await creditSummary(ACCOUNT)).toMatchObject({ left: 492, topup: 492 });
    await refundCredits(charge);
    expect(await creditSummary(ACCOUNT)).toMatchObject({ left: 502, topup: 500 });
  });

  it('gives Plus 750 and Pro 1,500 credits, and a Defence Pass runs as Pro until its end date', async () => {
    db.state.account = { ...db.state.account, plan_id: 'plus', plan_source: 'dodo', plan_status: 'active' };
    expect((await creditSummary(ACCOUNT)).allowance).toBe(750);
    db.state.account = { ...db.state.account, plan_id: 'pro', plan_source: 'pass', plan_status: 'active', plan_period_end: new Date(Date.now() + 86_400_000) };
    expect((await creditSummary(ACCOUNT)).allowance).toBe(1500);
    db.state.account = { ...db.state.account, plan_period_end: new Date(Date.now() - 1000) };
    expect((await creditSummary(ACCOUNT)).allowance).toBe(45);
  });
});

describe('features and totals', () => {
  it('keeps LaTeX export and Detailed reports for paid plans, one project on Free, and stops the 26th PDF on Free', async () => {
    await expect(requireFeature(ACCOUNT, 'latex_export')).rejects.toBeInstanceOf(PlanLimitError);
    await expect(requireFeature(ACCOUNT, 'detailed_mode')).rejects.toBeInstanceOf(PlanLimitError);
    await expect(checkTotal(ACCOUNT, 'projects', 0)).resolves.toBeUndefined();
    await expect(checkTotal(ACCOUNT, 'projects', 1)).rejects.toThrow('Your Free plan includes 1 projects');
    db.state.libraryPdfs = 24;
    await expect(checkLibraryRoom(ACCOUNT, 'user-1')).resolves.toBeUndefined();
    db.state.libraryPdfs = 25;
    await expect(checkLibraryRoom(ACCOUNT, 'user-1')).rejects.toThrow('Your Free plan includes 25 PDFs in your Library');
    db.state.account = { ...db.state.account, plan_id: 'plus', plan_source: 'dodo', plan_status: 'trialing' };
    await expect(requireFeature(ACCOUNT, 'latex_export')).resolves.toBeUndefined();
    await expect(checkLibraryRoom(ACCOUNT, 'user-1')).resolves.toBeUndefined();
    await expect(requireFeature(ACCOUNT, 'detailed_mode')).resolves.toBeUndefined();
    await expect(requireFeature(ACCOUNT, 'high_quality')).rejects.toBeInstanceOf(PlanLimitError);
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

  it('takes credits for a chat answer and gives them back when the answer fails', async () => {
    const chat = new Hono<{ Variables: { user: { account_id: string } } }>();
    chat.use('*', async (c, next) => { c.set('user', { account_id: ACCOUNT }); await next(); });
    chat.post('/chat', planQuota('chat'), async (c) => ((await c.req.json()).fail ? c.json({ detail: 'x' }, 502) : c.json({ ok: true })));
    const send = (fail: boolean) => chat.request('/chat', { method: 'POST', body: JSON.stringify({ fail }), headers: { 'content-type': 'application/json' } });
    expect((await send(false)).status).toBe(200);
    expect((await creditSummary(ACCOUNT)).used).toBe(1);
    expect((await send(true)).status).toBe(502);
    expect((await creditSummary(ACCOUNT)).used).toBe(1);
  });
});

describe('the pricing page’s credit table', () => {
  it('shows the same costs the server charges', async () => {
    const { CREDIT_TABLE } = await import('../../components/billing/creditTable.js');
    const { CREDIT_COSTS, HIGH_QUALITY_FACTOR } = await import('../../lib/server/lib/plans.js');
    const cost = (prefix: string) => CREDIT_TABLE.find((row) => row.job.startsWith(prefix))!.credits;
    expect(cost('Summary answer')).toBe(String(CREDIT_COSTS.summary));
    expect(cost('Editor check')).toBe(String(CREDIT_COSTS.review));
    expect(cost('Section')).toBe(String(CREDIT_COSTS.section));
    expect(cost('Deep Research')).toBe(String(CREDIT_COSTS.deep));
    expect(cost('Document review')).toBe(String(CREDIT_COSTS.review_standard));
    expect(cost('Slide deck')).toBe(String(CREDIT_COSTS.slides));
    expect(cost('Reporting-guideline check')).toBe(String(CREDIT_COSTS.guideline_check));
    expect(cost('Full draft')).toBe(`${CREDIT_COSTS.write}–${CREDIT_COSTS.draft}`);
    expect(cost('Detailed report')).toBe(String(CREDIT_COSTS.detailed));
    expect(cost('Data Lab')).toBe(String(CREDIT_COSTS.data_ai));
    expect(cost('Systematic review')).toBe(String(CREDIT_COSTS.screening));
    expect(cost('High-quality')).toBe(`× ${HIGH_QUALITY_FACTOR}`);
  });
});
