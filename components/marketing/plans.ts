import type { CountLimit, PublicPlan } from '@/lib/billing';

/**
 * /pricing reads the plans from the API (Admin › Plans is the one place to change them).
 * This file turns them into the comparison table and the page description.
 */

export async function loadPublicPlans(): Promise<PublicPlan[] | null> {
  try {
    // Keep server initialization inside the fallback: some runtimes cannot load its dependencies.
    const { getApp } = await import('@/lib/server');
    const response = await getApp().request('/api/plans');
    if (!response.ok) return null;
    return ((await response.json()) as { plans: PublicPlan[] }).plans;
  } catch {
    return null; // e.g. while building: the page fills in on the client and on the next revalidation
  }
}

/** A cell of the comparison table: text, or true (included) / false (not included). */
export type CompareValue = string | boolean;

const count = (limit: CountLimit): CompareValue =>
  limit.amount === null ? 'Unlimited' : limit.amount === 0 ? false : `${limit.amount.toLocaleString('en-US')} / ${limit.per}`;

const total = (limit: number | null): CompareValue => (limit === null ? 'Unlimited' : limit.toLocaleString('en-US'));

export function comparisonRows(plans: PublicPlan[]): { feature: string; values: CompareValue[] }[] {
  const row = (feature: string, value: (plan: PublicPlan) => CompareValue) => ({ feature, values: plans.map(value) });
  return [
    row('Credits a month', (plan) => total(plan.limits.credits)),
    row('Paper search, filters and citations', () => 'Unlimited'),
    row('Summary and Deep research', () => true),
    row('Detailed reports (50+ papers)', (plan) => plan.limits.detailed_mode),
    row('High-quality mode', (plan) => plan.limits.high_quality),
    row('AI autocomplete', (plan) => count(plan.limits.autocomplete)),
    row('PDFs in your Library', (plan) => total(plan.limits.library_pdfs)),
    row('Projects', (plan) => total(plan.limits.projects)),
    row('People on a project', (plan) => total(plan.limits.collaborators)),
    row('Zotero and Mendeley', (plan) => plan.limits.zotero_import),
    row('Word and PDF export', () => true),
    row('LaTeX and PowerPoint export', (plan) => plan.limits.latex_export),
  ];
}

const usd = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

/** One-line summary used in the /pricing meta description. */
export function pricingSummary(plans: PublicPlan[] | null) {
  const paid = (plans ?? []).filter((plan) => plan.monthly_cents > 0);
  if (!paid.length) return 'Start free with the full editor and citation generator. Upgrade for more AI writing, claim checks and LaTeX export.';
  const cheapest = paid.reduce((low, plan) => (plan.monthly_cents < low.monthly_cents ? plan : low));
  const perMonthYearly = cheapest.yearly_cents ? usd(Math.round(cheapest.yearly_cents / 12)) : null;
  return `Start free with the full editor and citation generator. ${cheapest.name} is ${usd(cheapest.monthly_cents)}/month${perMonthYearly ? ` or ${perMonthYearly}/month billed yearly` : ''}, for more AI, claim checks and LaTeX export.`;
}
