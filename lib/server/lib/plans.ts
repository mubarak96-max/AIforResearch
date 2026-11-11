import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { C, col, db, increment } from '../firebase.js';
import { env } from '../env.js';

/**
 * Plans and what each one allows, all defined in this file (PLANS below): prices, credits, limits
 * and the feature list on the pricing page. The server enforces every limit.
 *
 * Two kinds of allowance:
 * - **Credits**: one monthly allowance for every AI job, priced per job (CREDIT_COSTS). Light work
 *   (paper search, citations, the Library, the editor, exports) costs no credits. A job reserves
 *   its credits before it runs and gets them back when it fails (spendCredits / refundCredits).
 *   Top-up credits (bought once, kept 12 months) are used after the month's allowance.
 * - **Limits**: autocomplete is a count (it fires constantly), the Library and projects are
 *   totals, and some features are on or off per plan.
 */
export const LIMIT_DEFS = {
  credits: { kind: 'credits', label: 'Credits a month', noun: 'credits' },
  autocomplete: { kind: 'count', label: 'AI autocompletes', noun: 'AI autocompletes' },
  library_pdfs: { kind: 'total', label: 'PDFs in Library', noun: 'PDFs in your Library' },
  upload_mb: { kind: 'total', label: 'Largest PDF (MB)', noun: 'MB per PDF' },
  upload_batch: { kind: 'total', label: 'PDFs per upload', noun: 'PDFs at once' },
  projects: { kind: 'total', label: 'Projects', noun: 'projects' },
  collaborators: { kind: 'total', label: 'People per project', noun: 'people on a project' },
  latex_export: { kind: 'feature', label: 'LaTeX export', noun: 'LaTeX export' },
  pptx_export: { kind: 'feature', label: 'PowerPoint export', noun: 'PowerPoint export' },
  zotero_import: { kind: 'feature', label: 'Zotero import', noun: 'Zotero import' },
  mendeley_import: { kind: 'feature', label: 'Mendeley import', noun: 'Mendeley import' },
  detailed_mode: { kind: 'feature', label: 'Detailed reports', noun: 'Detailed reports' },
  high_quality: { kind: 'feature', label: 'High-quality mode', noun: 'High-quality mode' },
} as const;

/** Largest PDF the server takes on any plan (an unlimited plan still stops here). */
export const HARD_UPLOAD_MB = 100;

/**
 * What each AI job costs in credits. Shown on every start button and charged before the job
 * runs; a failed job is refunded. Keep in step with docs/redesign/03-pricing.md.
 */
export const CREDIT_COSTS = {
  /** A short cited answer (Deep Research, Summary depth). */
  summary: 1,
  /** A chat message, a Chat with PDF question, an AI edit or a short rewrite. */
  chat: 1,
  ai_edit: 1,
  /** One editor check (claim check, proofread, tone, source quality). */
  review: 2,
  /** A structured report from 20–40 papers. */
  deep: 5,
  /** A long report from 50+ papers with tables. Paid plans only. */
  detailed: 20,
  /** A section, abstract, outline or gap analysis. */
  section: 3,
  /** A whole draft: paper, proposal or literature review (Write with AI counts here). */
  write: 10,
  draft: 15,
  /** A document review: standard, high quality and the free preview, per 10,000 words. */
  review_standard: 10,
  review_high: 30,
  review_preview: 3,
  /** A slide deck. */
  slides: 10,
  /** An AI-written analysis in Data Lab (the statistics themselves are computed in the browser). */
  data_ai: 2,
  /** AI screening suggestions in a systematic review, per 25 records. */
  screening: 1,
} as const;
export type CreditAction = keyof typeof CREDIT_COSTS;

/** High-quality mode multiplies a job's credits. */
export const HIGH_QUALITY_FACTOR = 3;

export type LimitKey = keyof typeof LIMIT_DEFS;
export type CountLimit = { amount: number | null; per: 'day' | 'month' };
export type Limits = {
  /** Credits a month; null is unlimited. */
  credits: number | null;
  autocomplete: CountLimit;
  library_pdfs: number | null;
  upload_mb: number | null;
  upload_batch: number | null;
  projects: number | null;
  /** People invited to one project (the owner not counted). */
  collaborators: number | null;
  latex_export: boolean;
  pptx_export: boolean;
  zotero_import: boolean;
  mendeley_import: boolean;
  detailed_mode: boolean;
  high_quality: boolean;
};

export type FeatureKey = 'latex_export' | 'pptx_export' | 'zotero_import' | 'mendeley_import' | 'detailed_mode' | 'high_quality';
type TotalKey = 'library_pdfs' | 'upload_mb' | 'upload_batch' | 'projects' | 'collaborators';
const FEATURE_KEYS: FeatureKey[] = ['latex_export', 'pptx_export', 'zotero_import', 'mendeley_import', 'detailed_mode', 'high_quality'];
const TOTAL_KEYS: TotalKey[] = ['library_pdfs', 'upload_mb', 'upload_batch', 'projects', 'collaborators'];

export type PlanRow = {
  id: string; name: string; tagline: string; sort_order: number; is_default: boolean; is_public: boolean; featured: boolean;
  checkout: 'self_serve' | 'contact'; contact_url: string | null; monthly_cents: number; yearly_cents: number; currency: string;
  trial_days: number; limits: Partial<Limits>; dodo_monthly_product_id: string | null; dodo_yearly_product_id: string | null;
  dodo_mode: string | null;
};
export type PlanFeature = { label: string; included: boolean };

const UNLIMITED: CountLimit = { amount: null, per: 'month' };
const UNLIMITED_LIMITS: Limits = {
  credits: null, autocomplete: UNLIMITED, library_pdfs: null, upload_mb: null, upload_batch: null, projects: null, collaborators: null,
  latex_export: true, pptx_export: true, zotero_import: true, mendeley_import: true, detailed_mode: true, high_quality: true,
};

/** Fills a stored limits object with unlimited defaults for any missing key. */
export function normalizeLimits(raw: unknown): Limits {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
  const whole = (item: unknown) => (item === null || item === undefined || item === '' ? null : Math.max(0, Math.floor(Number(item))));
  const count = (key: 'autocomplete'): CountLimit => {
    const item = value[key];
    if (!item || typeof item !== 'object') return UNLIMITED;
    const amount = whole(item.amount);
    return { amount: Number.isFinite(amount as number) || amount === null ? amount : null, per: item.per === 'day' ? 'day' : 'month' };
  };
  const limits = { credits: whole(value.credits), autocomplete: count('autocomplete') } as Limits;
  for (const key of TOTAL_KEYS) limits[key] = whole(value[key]);
  for (const key of FEATURE_KEYS) limits[key] = value[key] === undefined ? true : Boolean(value[key]);
  return limits;
}

/** The plans AI for Research sells: Free, Plus, Pro and Team. Prices in cents. */
export const DEFAULT_PLANS: (Omit<PlanRow, 'dodo_monthly_product_id' | 'dodo_yearly_product_id' | 'dodo_mode' | 'limits'> & { limits: Limits; features: PlanFeature[] })[] = [
  {
    id: 'free', name: 'Free', tagline: 'Try every workspace', sort_order: 0, is_default: true, is_public: true, featured: false,
    checkout: 'self_serve', contact_url: null, monthly_cents: 0, yearly_cents: 0, currency: 'usd', trial_days: 0,
    limits: {
      credits: 30, autocomplete: { amount: 10, per: 'day' }, library_pdfs: 25, upload_mb: 10, upload_batch: 5, projects: 1, collaborators: 1,
      latex_export: false, pptx_export: false, zotero_import: false, mendeley_import: false, detailed_mode: false, high_quality: false,
    },
    features: [
      { label: '30 credits a month for AI research, reviews and drafts', included: true },
      { label: 'Summary and Deep research answers from every source', included: true },
      { label: 'Unlimited paper search, filters and citations', included: true },
      { label: 'The full editor, 10 AI autocompletes a day', included: true },
      { label: '25 PDFs in your Library, 1 project', included: true },
      { label: 'Word and PDF export', included: true },
      { label: 'Detailed reports and High-quality mode', included: false },
      { label: 'Zotero and Mendeley, LaTeX and PowerPoint', included: false },
    ],
  },
  {
    id: 'plus', name: 'Plus', tagline: 'For students researching every week', sort_order: 1, is_default: false, is_public: true, featured: false,
    checkout: 'self_serve', contact_url: null, monthly_cents: 1200, yearly_cents: 9600, currency: 'usd', trial_days: 0,
    limits: {
      credits: 500, autocomplete: { amount: 5000, per: 'month' }, library_pdfs: null, upload_mb: 50, upload_batch: 20, projects: 10, collaborators: 3,
      latex_export: true, pptx_export: true, zotero_import: true, mendeley_import: true, detailed_mode: true, high_quality: false,
    },
    features: [
      { label: '500 credits a month', included: true },
      { label: 'Detailed reports from 50+ papers', included: true },
      { label: '5,000 AI autocompletes a month', included: true },
      { label: 'Unlimited PDFs in your Library, up to 50 MB each', included: true },
      { label: '10 projects, 3 people on each', included: true },
      { label: 'Zotero and Mendeley sync', included: true },
      { label: 'Word, PDF, LaTeX and PowerPoint export', included: true },
    ],
  },
  {
    id: 'pro', name: 'Pro', tagline: 'For theses, reviews and papers', sort_order: 2, is_default: false, is_public: true, featured: true,
    checkout: 'self_serve', contact_url: null, monthly_cents: 2900, yearly_cents: 22800, currency: 'usd', trial_days: 0,
    limits: {
      credits: 1500, autocomplete: { amount: 20000, per: 'month' }, library_pdfs: null, upload_mb: 100, upload_batch: 50, projects: null, collaborators: 10,
      latex_export: true, pptx_export: true, zotero_import: true, mendeley_import: true, detailed_mode: true, high_quality: true,
    },
    features: [
      { label: 'Everything in Plus', included: true },
      { label: '1,500 credits a month', included: true },
      { label: 'High-quality mode for reports and reviews', included: true },
      { label: '20,000 AI autocompletes a month', included: true },
      { label: 'Unlimited projects, 10 people on each', included: true },
      { label: 'PDFs up to 100 MB', included: true },
      { label: 'Priority queue and support', included: true },
    ],
  },
  {
    id: 'team', name: 'Team', tagline: 'For labs, departments and writing groups', sort_order: 3, is_default: false, is_public: true, featured: false,
    checkout: 'contact', contact_url: env.supportEmail ? `mailto:${env.supportEmail}?subject=AI for Research%20Team` : null, monthly_cents: 0, yearly_cents: 0, currency: 'usd', trial_days: 0,
    limits: { ...UNLIMITED_LIMITS, credits: 2000 * 3 },
    features: [
      { label: 'Everything in Pro for each member', included: true },
      { label: '2,000 credits a seat a month, pooled', included: true },
      { label: 'Shared projects and Library', included: true },
      { label: 'One invoice, from 3 seats', included: true },
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
  /** Top-up credits left (bought once, used after the month's allowance). */
  credit_topup: number;
  /** Team seats (Team plan credits are per seat). */
  team_seats: number;
};

/** Subscriptions in these states keep their plan (past_due: Dodo is still retrying the card; trialing: active inside its trial days). */
export const LIVE_STATUSES = ['active', 'trialing', 'past_due'];

/**
 * The plan an account has right now: a live subscription, a plan an admin gave, a Defence Pass or
 * carried-over plan still inside its dates, or the default.
 */
export async function effectivePlan(accountId: string): Promise<{ plan: PlanRow; limits: Limits; account: AccountPlan }> {
  const { plans } = await loadPlans();
  const account = await accountPlan(accountId);
  const fallback = plans.find((plan) => plan.is_default) ?? plans[0];
  // 'legacy': carried over from a previous app; 'pass': a one-time Defence Pass. Both run until their end date.
  const datedActive = (account?.plan_source === 'legacy' || account?.plan_source === 'pass') && account.plan_status === 'active'
    && (!account.plan_period_end || account.plan_period_end.getTime() > Date.now());
  const chosen = account && (account.plan_source === 'admin' || datedActive || (account.plan_source === 'dodo' && LIVE_STATUSES.includes(account.plan_status)))
    ? plans.find((plan) => plan.id === account.plan_id)
    : undefined;
  const plan = chosen ?? fallback;
  // No plans at all (a fresh install before seeding): nothing is limited.
  const limits = plan ? normalizeLimits(plan.limits) : UNLIMITED_LIMITS;
  if (plan?.id === 'team' && limits.credits !== null) limits.credits = 2000 * Math.max(3, account?.team_seats || 3);
  return { plan, limits, account };
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
    credit_topup: Math.max(0, Number(data.credit_topup) || 0), team_seats: Math.max(0, Number(data.team_seats) || 0),
  };
}

const usageRef = (accountId: string, key: string, period: string) =>
  col(C.accounts).doc(accountId).collection(C.planUsage).doc(`${key}__${period}`);

/** Library PDFs a person has (saved references without a file do not count). */
async function libraryPdfCount(userId: string) {
  const snapshot = await col(C.libraryDocuments).where('user_id', '==', userId).where('file_type', '==', 'pdf').count().get();
  return snapshot.data().count;
}

export const periodOf = (per: 'day' | 'month', now = new Date()) => (per === 'day' ? now.toISOString().slice(0, 10) : now.toISOString().slice(0, 7));

/** The first day of next month (UTC), when the month's credits renew. */
export function creditsResetOn(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
}

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

// ------------------------------------------------------------------ credits

/** The account's credits this month. `left` is null when unlimited. */
export async function creditSummary(accountId: string) {
  const { plan, limits, account } = await effectivePlan(accountId);
  const month = periodOf('month');
  const usage = await usageRef(accountId, 'credits', month).get();
  const used = usage.exists ? Number(usage.get('amount') ?? 0) : 0;
  const topup = account?.credit_topup ?? 0;
  const allowance = limits.credits;
  const left = allowance === null ? null : Math.max(0, allowance - used) + topup;
  return { plan: { id: plan.id, name: plan.name, is_default: plan.is_default }, allowance, used, topup, left, resets_on: creditsResetOn(), costs: CREDIT_COSTS };
}

export type CreditCharge = { accountId: string; fromPlan: number; fromTopup: number; month: string };

/**
 * Takes `amount` credits from the month's allowance, then from top-up credits, in one
 * transaction. Refuses (402) when there are not enough. Hand the charge to refundCredits when the
 * job fails.
 */
export async function spendCredits(accountId: string, amount: number, label = 'This job'): Promise<CreditCharge> {
  const month = periodOf('month');
  if (amount <= 0) return { accountId, fromPlan: 0, fromTopup: 0, month };
  const { plan, limits } = await effectivePlan(accountId);
  const usage = usageRef(accountId, 'credits', month);
  const account = col(C.accounts).doc(accountId);
  if (limits.credits === null) {
    // Unlimited: still counted, for cost reports.
    await usage.set({ key: 'credits', period: month, amount: increment(amount) }, { merge: true });
    return { accountId, fromPlan: amount, fromTopup: 0, month };
  }
  const allowance = limits.credits;
  return db().runTransaction(async (tx) => {
    const [current, owner] = await Promise.all([tx.get(usage), tx.get(account)]);
    const used = current.exists ? Number(current.get('amount') ?? 0) : 0;
    const topup = owner.exists ? Math.max(0, Number(owner.get('credit_topup')) || 0) : 0;
    const fromPlan = Math.min(amount, Math.max(0, allowance - used));
    const fromTopup = amount - fromPlan;
    if (fromTopup > topup) {
      const left = Math.max(0, allowance - used) + topup;
      throw new PlanLimitError(
        `${label} needs ${amount} credit${amount === 1 ? '' : 's'} and you have ${left} left on the ${plan.name} plan. Credits renew on ${creditsResetOn()}; upgrade or add credits to keep going.`,
        'credits', plan.id,
      );
    }
    tx.set(usage, { key: 'credits', period: month, amount: used + fromPlan }, { merge: true });
    if (fromTopup > 0) tx.update(account, { credit_topup: topup - fromTopup });
    return { accountId, fromPlan, fromTopup, month };
  });
}

/** Gives a failed job's credits back. Never throws. */
export async function refundCredits(charge: CreditCharge | null | undefined) {
  if (!charge || (!charge.fromPlan && !charge.fromTopup)) return;
  try {
    const batch = db().batch();
    if (charge.fromPlan) batch.set(usageRef(charge.accountId, 'credits', charge.month), { amount: increment(-charge.fromPlan) }, { merge: true });
    if (charge.fromTopup) batch.set(col(C.accounts).doc(charge.accountId), { credit_topup: increment(charge.fromTopup) }, { merge: true });
    await batch.commit();
  } catch (error) {
    console.error('credits not refunded', charge, error);
  }
}

/** Adds top-up credits (a purchase, a goodwill gift). */
export async function addTopupCredits(accountId: string, amount: number) {
  if (amount <= 0) return;
  await col(C.accounts).doc(accountId).set({ credit_topup: increment(amount) }, { merge: true });
}

/** The credits a job costs: per action, times words over 10,000 for reviews, times 3 in High quality. */
export function creditCost(action: CreditAction, options: { highQuality?: boolean; units?: number } = {}) {
  const base = CREDIT_COSTS[action] * Math.max(1, Math.ceil(options.units ?? 1));
  return options.highQuality && action !== 'review_high' ? base * HIGH_QUALITY_FACTOR : base;
}

// ------------------------------------------------------------------ counts, totals, features

type CountKey = 'autocomplete';

/** Refuses (402) when autocomplete is used up; returns what is left (null: unlimited). */
export async function checkQuota(accountId: string, key: CountKey): Promise<number | null> {
  const { plan, limits } = await effectivePlan(accountId);
  const limit = limits[key];
  if (limit.amount === null) return null;
  const usage = await usageRef(accountId, key, periodOf(limit.per)).get();
  const used = usage.exists ? Number(usage.get('amount') ?? 0) : 0;
  if (used >= limit.amount) throw new PlanLimitError(limitMessage(key, plan, limit), key, plan.id);
  return limit.amount - used;
}

/** Counts a use (after it succeeded). Counted for both periods so a plan change keeps history. */
export async function countUse(accountId: string, key: string, amount = 1) {
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
  if (!limits[key]) throw new PlanLimitError(`${LIMIT_DEFS[key].label} is not part of the ${plan.name} plan. Upgrade to use it.`, key, plan.id);
}

/** Refuses (402) when a total (projects, people on a project) would go over the plan's limit. */
export async function checkTotal(accountId: string, key: 'projects' | 'collaborators', current: number, adding = 1) {
  const { plan, limits } = await effectivePlan(accountId);
  const limit = limits[key];
  if (limit !== null && current + adding > limit) throw new PlanLimitError(limitMessage(key, plan, limit), key, plan.id);
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

/** This period's credits and autocomplete use, for the account page and the pricing dialog. */
export async function usageSummary(accountId: string) {
  const { plan, limits, account } = await effectivePlan(accountId);
  const credits = await creditSummary(accountId);
  const auto = await usageRef(accountId, 'autocomplete', periodOf(limits.autocomplete.per)).get();
  const counts = [
    { key: 'credits', label: LIMIT_DEFS.credits.label, used: credits.used, limit: limits.credits, per: 'month' as const },
    { key: 'autocomplete', label: LIMIT_DEFS.autocomplete.label, used: auto.exists ? Number(auto.get('amount') ?? 0) : 0, limit: limits.autocomplete.amount, per: limits.autocomplete.per },
  ];
  return { plan, limits, account, counts, credits };
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

/** What the old per-feature allowances cost now, in credits. */
const LEGACY_KEYS = { chat: 'chat', ai_edit: 'ai_edit', review: 'review', write: 'write' } as const;
type QuotaKey = CountKey | keyof typeof LEGACY_KEYS;

/**
 * Route guard for a metered action. Autocomplete is a count; every other key takes credits
 * (CREDIT_COSTS, or `credits` to override) before the handler runs and gives them back when the
 * answer is an error or `counted` says it should not count (an empty suggestion). `applies`
 * limits it to some requests (Write with AI charges a draft once, at its first step).
 */
export function planQuota(
  key: QuotaKey,
  options: { applies?: (c: Context) => Promise<boolean> | boolean; counted?: (body: any) => boolean; credits?: number } = {},
) {
  return createMiddleware(async (c, next) => {
    const user = c.get('user') as { account_id: string } | undefined;
    if (!user) return next();
    const applies = options.applies ? await options.applies(c) : true;
    if (!applies) return next();
    const counted = async () => {
      if (c.res.status >= 400) return false;
      if (options.counted && (c.res.headers.get('content-type') || '').includes('application/json')) {
        const body = await c.res.clone().json().catch(() => null);
        return options.counted(body);
      }
      return true;
    };
    if (key === 'autocomplete') {
      await checkQuota(user.account_id, key);
      await next();
      if (await counted()) await countUse(user.account_id, key).catch((error) => console.error('plan usage not counted', error));
      return;
    }
    const charge = await spendCredits(user.account_id, options.credits ?? CREDIT_COSTS[LEGACY_KEYS[key]]);
    let ok = false;
    try {
      await next();
      ok = await counted();
    } finally {
      if (!ok) await refundCredits(charge);
      else await countUse(user.account_id, key).catch(() => undefined);
    }
  });
}
