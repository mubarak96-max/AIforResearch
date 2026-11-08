import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { C, col, db, increment, rows } from '../firebase.js';
import { env } from '../env.js';

/**
 * Plans and what each one allows, all defined in this file (PLANS below): prices, limits and the
 * feature list on the pricing page. The server enforces the limits. A count limit is { amount, per }, amount null
 * meaning unlimited; a total is a number or null; a feature is true/false.
 */
export const LIMIT_DEFS = {
  autocomplete: { kind: 'count', label: 'AI autocompletes', noun: 'AI autocompletes' },
  ai_edit: { kind: 'count', label: 'AI edits', noun: 'AI edits' },
  chat: { kind: 'count', label: 'AI chat messages', noun: 'AI chat messages' },
  review: { kind: 'count', label: 'Review checks', noun: 'review checks' },
  write: { kind: 'count', label: 'Write with AI drafts', noun: 'Write with AI drafts' },
  library_pdfs: { kind: 'total', label: 'PDFs in Library', noun: 'PDFs in your Library' },
  upload_mb: { kind: 'total', label: 'Largest PDF (MB)', noun: 'MB per PDF' },
  upload_batch: { kind: 'total', label: 'PDFs per upload', noun: 'PDFs at once' },
  latex_export: { kind: 'feature', label: 'LaTeX export', noun: 'LaTeX export' },
  zotero_import: { kind: 'feature', label: 'Zotero import', noun: 'Zotero import' },
  mendeley_import: { kind: 'feature', label: 'Mendeley import', noun: 'Mendeley import' },
} as const;

/** Largest PDF the server takes on any plan (an unlimited plan still stops here). */
export const HARD_UPLOAD_MB = 100;

export type LimitKey = keyof typeof LIMIT_DEFS;
export type CountLimit = { amount: number | null; per: 'day' | 'month' };
export type Limits = {
  autocomplete: CountLimit;
  ai_edit: CountLimit;
  chat: CountLimit;
  review: CountLimit;
  write: CountLimit;
  library_pdfs: number | null;
  upload_mb: number | null;
  upload_batch: number | null;
  latex_export: boolean;
  zotero_import: boolean;
  mendeley_import: boolean;
};

export type FeatureKey = 'latex_export' | 'zotero_import' | 'mendeley_import';
type TotalKey = 'library_pdfs' | 'upload_mb' | 'upload_batch';

export type PlanRow = {
  id: string; name: string; tagline: string; sort_order: number; is_default: boolean; is_public: boolean; featured: boolean;
  checkout: 'self_serve' | 'contact'; contact_url: string | null; monthly_cents: number; yearly_cents: number; currency: string;
  trial_days: number; limits: Partial<Limits>; dodo_monthly_product_id: string | null; dodo_yearly_product_id: string | null;
  dodo_mode: string | null;
};
export type PlanFeature = { label: string; included: boolean };

const UNLIMITED: CountLimit = { amount: null, per: 'month' };
const UNLIMITED_LIMITS: Limits = {
  autocomplete: UNLIMITED, ai_edit: UNLIMITED, chat: UNLIMITED, review: UNLIMITED, write: UNLIMITED,
  library_pdfs: null, upload_mb: null, upload_batch: null, latex_export: true, zotero_import: true, mendeley_import: true,
};

/** Fills a stored limits object with unlimited defaults for any missing key. */
export function normalizeLimits(raw: unknown): Limits {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
  const count = (key: keyof Limits): CountLimit => {
    const item = value[key];
    if (!item || typeof item !== 'object') return UNLIMITED;
    const amount = item.amount === null || item.amount === undefined || item.amount === '' ? null : Math.max(0, Math.floor(Number(item.amount)));
    return { amount: Number.isFinite(amount as number) || amount === null ? amount : null, per: item.per === 'day' ? 'day' : 'month' };
  };
  const total = (key: TotalKey) => {
    const item = value[key];
    return item === null || item === undefined || item === '' ? null : Math.max(0, Math.floor(Number(item)));
  };
  const feature = (key: FeatureKey) => (value[key] === undefined ? true : Boolean(value[key]));
  return {
    autocomplete: count('autocomplete'),
    ai_edit: count('ai_edit'),
    chat: count('chat'),
    review: count('review'),
    write: count('write'),
    library_pdfs: total('library_pdfs'),
    upload_mb: total('upload_mb'),
    upload_batch: total('upload_batch'),
    latex_export: feature('latex_export'),
    zotero_import: feature('zotero_import'),
    mendeley_import: feature('mendeley_import'),
  };
}

/** The plans WriteOrbit starts with: Free, Plus, Pro and Team. Prices in cents. */
export const DEFAULT_PLANS: (Omit<PlanRow, 'dodo_monthly_product_id' | 'dodo_yearly_product_id' | 'dodo_mode' | 'limits'> & { limits: Limits; features: PlanFeature[] })[] = [
  {
    id: 'free', name: 'Free', tagline: 'Try everything, with daily limits', sort_order: 0, is_default: true, is_public: true, featured: false,
    checkout: 'self_serve', contact_url: null, monthly_cents: 0, yearly_cents: 0, currency: 'usd', trial_days: 0,
    limits: {
      autocomplete: { amount: 10, per: 'day' }, ai_edit: { amount: 3, per: 'day' }, chat: { amount: 5, per: 'day' },
      review: { amount: 3, per: 'day' }, write: { amount: 1, per: 'day' }, library_pdfs: 10, upload_mb: 10, upload_batch: 5,
      latex_export: false, zotero_import: false, mendeley_import: false,
    },
    features: [
      { label: 'The full editor, on any device', included: true },
      { label: '10 AI autocompletes a day', included: true },
      { label: '5 AI chat messages and 3 AI edits a day', included: true },
      { label: '3 review checks and 1 Write with AI draft a day', included: true },
      { label: 'Unlimited citations in every style', included: true },
      { label: '10 PDFs in your Library, up to 10 MB each', included: true },
      { label: 'Word and PDF export', included: true },
      { label: 'LaTeX export', included: false },
      { label: 'Zotero and Mendeley import', included: false },
    ],
  },
  {
    id: 'plus', name: 'Plus', tagline: 'For students writing every week', sort_order: 1, is_default: false, is_public: true, featured: false,
    checkout: 'self_serve', contact_url: null, monthly_cents: 1200, yearly_cents: 9600, currency: 'usd', trial_days: 0,
    limits: {
      autocomplete: { amount: 5000, per: 'month' }, ai_edit: { amount: 500, per: 'month' }, chat: { amount: 500, per: 'month' },
      review: { amount: 30, per: 'month' }, write: { amount: 20, per: 'month' }, library_pdfs: null, upload_mb: 50, upload_batch: 20,
      latex_export: true, zotero_import: true, mendeley_import: true,
    },
    features: [
      { label: 'Everything in Free', included: true },
      { label: '5,000 AI autocompletes a month', included: true },
      { label: '500 AI edits and 500 chat messages a month', included: true },
      { label: '30 review checks a month', included: true },
      { label: '20 Write with AI drafts a month', included: true },
      { label: 'Unlimited PDFs in your Library, up to 50 MB each', included: true },
      { label: 'Zotero and Mendeley import', included: true },
      { label: 'Word, PDF and LaTeX export', included: true },
    ],
  },
  {
    id: 'pro', name: 'Pro', tagline: 'Unlimited, for theses and papers', sort_order: 2, is_default: false, is_public: true, featured: true,
    checkout: 'self_serve', contact_url: null, monthly_cents: 2900, yearly_cents: 22800, currency: 'usd', trial_days: 0,
    limits: UNLIMITED_LIMITS,
    features: [
      { label: 'Everything in Plus, without limits', included: true },
      { label: 'Unlimited AI autocomplete, edits and chat', included: true },
      { label: 'Unlimited review checks and peer review', included: true },
      { label: 'Unlimited Write with AI drafts', included: true },
      { label: 'Unlimited PDFs in your Library', included: true },
      { label: 'Word, PDF and LaTeX export', included: true },
      { label: 'Priority support', included: true },
    ],
  },
  {
    id: 'team', name: 'Team', tagline: 'For labs, departments and writing groups', sort_order: 3, is_default: false, is_public: true, featured: false,
    checkout: 'contact', contact_url: env.supportEmail ? `mailto:${env.supportEmail}?subject=WriteOrbit%20Team` : null, monthly_cents: 0, yearly_cents: 0, currency: 'usd', trial_days: 0,
    limits: UNLIMITED_LIMITS,
    features: [
      { label: 'Everything in Pro for each member', included: true },
      { label: 'One invoice for the whole group', included: true },
      { label: 'Volume pricing', included: true },
      { label: 'Onboarding and priority support', included: true },
    ],
  },
];

/** The plans, defined here in code (change a price here and redeploy). */
export const PLANS = DEFAULT_PLANS;

/**
 * The Dodo product a plan is sold with, per billing interval: `billing_products/plan_{id}_{interval}`.
 * Products are made on the first checkout (planBilling.syncPlanToDodo). One whose price, currency,
 * trial or mode no longer matches the code is ignored, so a price change here gets a new product.
 */
export type StoredPlanProduct = { product_id: string; cents: number; currency: string; trial_days: number; mode: string };
export const planProductKey = (planId: string, interval: 'month' | 'year') => `plan_${planId}_${interval}`;
const billingModeNow = () => (env.billingLive ? 'live' : 'test');

export function productMatches(stored: Partial<StoredPlanProduct> | undefined, plan: { currency: string; trial_days: number }, cents: number) {
  return Boolean(stored?.product_id) && stored!.mode === billingModeNow() && stored!.cents === cents
    && stored!.currency === plan.currency && (stored!.trial_days ?? 0) === plan.trial_days;
}

// Product ids change rarely: a short cache keeps every AI request from reading them.
let cache: { at: number; plans: PlanRow[]; features: Map<string, PlanFeature[]> } | null = null;
export function forgetPlans() {
  cache = null;
}

export async function loadPlans() {
  if (cache && Date.now() - cache.at < 30_000) return cache;
  const stored = new Map((await col(C.billingProducts).where('kind', '==', 'plan').get()).docs.map((doc) => [doc.id, doc.data() as StoredPlanProduct]));
  const productFor = (plan: { id: string; currency: string; trial_days: number }, interval: 'month' | 'year', cents: number) => {
    const found = stored.get(planProductKey(plan.id, interval));
    return cents > 0 && productMatches(found, plan, cents) ? found!.product_id : null;
  };
  const plans: PlanRow[] = [...PLANS]
    .sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id))
    .map(({ features: _features, ...plan }) => ({
      ...plan,
      dodo_monthly_product_id: productFor(plan, 'month', plan.monthly_cents),
      dodo_yearly_product_id: productFor(plan, 'year', plan.yearly_cents),
      dodo_mode: billingModeNow(),
    }));
  const features = new Map<string, PlanFeature[]>(PLANS.map((plan) => [plan.id, plan.features]));
  cache = { at: Date.now(), plans, features };
  return cache;
}

export type AccountPlan = {
  plan_id: string | null; plan_status: string; plan_source: string; plan_interval: string | null; plan_period_end: Date | null;
  plan_cancel_at_period_end: boolean; plan_subscription_id: string | null;
};

/** Subscriptions in these states keep their plan (past_due: Dodo is still retrying the card; trialing: active inside its trial days). */
export const LIVE_STATUSES = ['active', 'trialing', 'past_due'];

/** The plan an account has right now: a live subscription, a plan an admin gave, a carried-over plan, or the default. */
export async function effectivePlan(accountId: string): Promise<{ plan: PlanRow; limits: Limits; account: AccountPlan }> {
  const { plans } = await loadPlans();
  const account = await accountPlan(accountId);
  const fallback = plans.find((plan) => plan.is_default) ?? plans[0];
  // 'legacy': a plan carried over from a previous app without a paid subscription, active until its end date.
  const legacyActive = account?.plan_source === 'legacy' && account.plan_status === 'active'
    && (!account.plan_period_end || account.plan_period_end.getTime() > Date.now());
  const chosen = account && (account.plan_source === 'admin' || legacyActive || (account.plan_source === 'dodo' && LIVE_STATUSES.includes(account.plan_status)))
    ? plans.find((plan) => plan.id === account.plan_id)
    : undefined;
  const plan = chosen ?? fallback;
  // No plans at all (a fresh install before seeding): nothing is limited.
  return { plan, limits: plan ? normalizeLimits(plan.limits) : UNLIMITED_LIMITS, account };
}

async function accountPlan(accountId: string): Promise<AccountPlan> {
  const snapshot = accountId ? await col(C.accounts).doc(accountId).get() : null;
  const data = snapshot?.exists ? (snapshot.data() as Record<string, any>) : null;
  if (!data) return undefined as unknown as AccountPlan;
  const end = data.plan_period_end;
  return {
    plan_id: data.plan ?? null, plan_status: data.plan_status ?? 'none', plan_source: data.plan_source ?? 'default',
    plan_interval: data.plan_interval ?? null, plan_period_end: end ? (typeof end.toDate === 'function' ? end.toDate() : new Date(end)) : null,
    plan_cancel_at_period_end: Boolean(data.plan_cancel_at_period_end), plan_subscription_id: data.plan_subscription_id ?? null,
  };
}

const usageRef = (accountId: string, key: string, period: string) =>
  col(C.accounts).doc(accountId).collection(C.planUsage).doc(`${key}__${period}`);

/** Library PDFs a person has (saved references without a file do not count). */
async function libraryPdfCount(userId: string) {
  const snapshot = await col(C.libraryDocuments).where('user_id', '==', userId).where('file_type', '==', 'pdf').count().get();
  return snapshot.data().count;
}

const periodOf = (per: 'day' | 'month', now = new Date()) => (per === 'day' ? now.toISOString().slice(0, 10) : now.toISOString().slice(0, 7));

export class PlanLimitError extends HTTPException {
  constructor(message: string, readonly key: LimitKey, readonly plan: string) {
    super(402, { message });
  }
}

function limitMessage(key: LimitKey, plan: PlanRow, limit: CountLimit | number) {
  const noun = LIMIT_DEFS[key].noun;
  if (typeof limit === 'number') return `Your ${plan.name} plan includes ${limit.toLocaleString('en-US')} ${noun}. Upgrade for more.`;
  if (limit.amount === 0) return `${LIMIT_DEFS[key].label} are not part of the ${plan.name} plan. Upgrade to use them.`;
  const when = limit.per === 'day' ? "today's" : "this month's";
  return `You have used ${when} ${limit.amount?.toLocaleString('en-US')} ${noun} on the ${plan.name} plan. Upgrade for more.`;
}

/** Refuses (402) when a counted action is used up; returns what is left (null: unlimited). */
export async function checkQuota(accountId: string, key: Exclude<LimitKey, TotalKey | FeatureKey>): Promise<number | null> {
  const { plan, limits } = await effectivePlan(accountId);
  const limit = limits[key];
  if (limit.amount === null) return null;
  const usage = await usageRef(accountId, key, periodOf(limit.per)).get();
  const used = usage.exists ? Number(usage.get('amount') ?? 0) : 0;
  if (used >= limit.amount) throw new PlanLimitError(limitMessage(key, plan, limit), key, plan.id);
  return limit.amount - used;
}

/** Counts a use (after it succeeded). Counted for both periods so a plan change keeps history. */
export async function countUse(accountId: string, key: LimitKey, amount = 1) {
  const now = new Date();
  const batch = db().batch();
  for (const period of [periodOf('day', now), periodOf('month', now)]) {
    batch.set(usageRef(accountId, key, period), { key, period, amount: increment(amount) }, { merge: true });
  }
  await batch.commit();
}

/** Refuses (402) a feature the plan does not include. */
export async function requireFeature(accountId: string, key: FeatureKey) {
  const { plan, limits } = await effectivePlan(accountId);
  if (!limits[key]) throw new PlanLimitError(`${LIMIT_DEFS[key].label} is part of the paid plans. Upgrade to use it.`, key, plan.id);
}

/** Refuses (402) one more Library PDF when the plan's total is reached. */
export async function checkLibraryRoom(accountId: string, userId: string, adding = 1) {
  const { plan, limits } = await effectivePlan(accountId);
  if (limits.library_pdfs === null) return;
  // PDFs only: saved references without a file stay unlimited.
  const count = await libraryPdfCount(userId);
  if (count + adding > limits.library_pdfs) throw new PlanLimitError(limitMessage('library_pdfs', plan, limits.library_pdfs), 'library_pdfs', plan.id);
}

/** What the Library's add dialog may do on this plan: PDFs left, largest file, files at once, imports. */
export async function libraryLimits(accountId: string, userId: string) {
  const { plan, limits } = await effectivePlan(accountId);
  const count = await libraryPdfCount(userId);
  return {
    plan: { id: plan.id, name: plan.name, is_default: plan.is_default },
    pdfs_used: count,
    pdfs_limit: limits.library_pdfs,
    pdfs_left: limits.library_pdfs === null ? null : Math.max(0, limits.library_pdfs - count),
    upload_mb: Math.min(limits.upload_mb ?? HARD_UPLOAD_MB, HARD_UPLOAD_MB),
    upload_batch: limits.upload_batch ?? 50,
    zotero_import: limits.zotero_import,
    mendeley_import: limits.mendeley_import,
  };
}

/** Refuses a PDF over the plan's size (402, so the browser offers an upgrade) or over the hard cap (413). */
export async function checkUploadSize(accountId: string, bytes: number) {
  const { plan, limits } = await effectivePlan(accountId);
  if (bytes > HARD_UPLOAD_MB * 1024 * 1024) throw new HTTPException(413, { message: `PDFs can be up to ${HARD_UPLOAD_MB} MB.` });
  if (limits.upload_mb !== null && bytes > limits.upload_mb * 1024 * 1024) {
    throw new PlanLimitError(`Your ${plan.name} plan takes PDFs up to ${limits.upload_mb} MB. Upgrade for larger files.`, 'upload_mb', plan.id);
  }
}

/** This period's use of each counted limit, for the account page and the pricing dialog. */
export async function usageSummary(accountId: string) {
  const { plan, limits, account } = await effectivePlan(accountId);
  const now = new Date();
  const usage = rows<{ key: string; period: string; amount: number }>(
    await col(C.accounts).doc(accountId).collection(C.planUsage).where('period', 'in', [periodOf('day', now), periodOf('month', now)]).get());
  const used = (key: string, per: 'day' | 'month') => usage.find((item) => item.key === key && item.period === periodOf(per, now))?.amount ?? 0;
  const counts = (['autocomplete', 'ai_edit', 'chat', 'review', 'write'] as const).map((key) => ({
    key, label: LIMIT_DEFS[key].label, used: used(key, limits[key].per), limit: limits[key].amount, per: limits[key].per,
  }));
  return { plan, limits, account, counts };
}

/** A plan as the pricing dialog and page show it. */
export function publicPlan(plan: PlanRow, features: PlanFeature[]) {
  return {
    id: plan.id, name: plan.name, tagline: plan.tagline, featured: plan.featured, is_default: plan.is_default, checkout: plan.checkout,
    contact_url: plan.contact_url, monthly_cents: plan.monthly_cents, yearly_cents: plan.yearly_cents, currency: plan.currency,
    trial_days: plan.trial_days, limits: normalizeLimits(plan.limits), features,
    // A paid plan can be bought as soon as it has a price: its Dodo products are made at the first checkout.
    purchasable: plan.checkout === 'self_serve' && !plan.is_default && (plan.monthly_cents > 0 || plan.yearly_cents > 0),
    has_monthly: plan.monthly_cents > 0 || plan.is_default, has_yearly: plan.yearly_cents > 0 || plan.is_default,
  };
}

type CountKey = Exclude<LimitKey, TotalKey | FeatureKey>;

/**
 * Route guard for a counted action: refuses (402) when the plan's allowance is used up, and
 * counts the use only when the answer was a success (`counted` can look at the JSON, e.g. an
 * empty suggestion is not counted). `applies` limits it to some requests (Write with AI counts
 * a draft once, at its first step).
 */
export function planQuota(
  key: CountKey,
  options: { applies?: (c: Context) => Promise<boolean> | boolean; counted?: (body: any) => boolean } = {},
) {
  return createMiddleware(async (c, next) => {
    const user = c.get('user') as { account_id: string } | undefined;
    if (!user) return next();
    const applies = options.applies ? await options.applies(c) : true;
    if (!applies) return next();
    await checkQuota(user.account_id, key);
    await next();
    if (c.res.status >= 400) return;
    if (options.counted && (c.res.headers.get('content-type') || '').includes('application/json')) {
      const body = await c.res.clone().json().catch(() => null);
      if (!options.counted(body)) return;
    }
    await countUse(user.account_id, key).catch((error) => console.error('plan usage not counted', error));
  });
}
