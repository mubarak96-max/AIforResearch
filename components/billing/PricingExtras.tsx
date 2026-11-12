/**
 * Under the plan cards (pricing page and dialog): the extras sold once, what each job costs in
 * credits, and the questions people ask about credits.
 */
import { CreditCostTable } from './CreditsCard';
import { EXTRAS } from './creditTable';

export const CREDIT_FAQ: { q: string; a: string }[] = [
  { q: 'What is a credit?', a: 'Credits pay for AI jobs. A short answer costs 1, a Deep Research report 7, a Detailed report 25, a document review 10 per 10,000 words. Paper search, filters, citations, your Library, the editor and exports cost nothing.' },
  { q: 'What do I get for free?', a: '45 credits every month: enough for two Deep reports with figures, an outline and a few quick answers. Every workspace works on Free so you can see real results before you pay.' },
  { q: 'What happens when I run out?', a: 'Jobs that need credits stop until your credits renew on the first of the month. On a paid plan you can add 500 or 2,000 credits at any time; they are kept for 12 months.' },
  { q: 'Do unused credits roll over?', a: 'The monthly credits do not. Extra credits you buy last 12 months and are used after the month’s credits run out.' },
  { q: 'Does a failed job cost credits?', a: 'No. If a job stops or finds nothing, its credits go straight back.' },
  { q: 'What is the Defence Pass?', a: '90 days of Pro for $49, paid once, for the last stretch of a thesis or a defence. It does not renew. If you already pay for a plan, it is added as 4,500 extra credits instead.' },
];

export function PricingExtras({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`grid gap-5 ${compact ? 'mt-6' : 'mt-10'} lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]`}>
      <section aria-labelledby="extras-title" className="rounded-[20px] border border-line bg-surface p-5">
        <h3 id="extras-title" className="text-[17px] font-bold text-ink">Pay once</h3>
        <ul className="mt-3 divide-y divide-line-2">
          {EXTRAS.map((extra) => (
            <li key={extra.id} className="flex items-baseline gap-3 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-ink">{extra.name}</span>
                <span className="text-[13.5px] text-muted">{extra.detail}</span>
              </span>
              <span className="shrink-0 text-[15px] font-semibold tabular-nums text-ink">{extra.price}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[13px] text-muted">Buy them from your account page.</p>
      </section>
      <section aria-labelledby="costs-title" className="rounded-[20px] border border-line bg-surface p-5">
        <h3 id="costs-title" className="text-[17px] font-bold text-ink">What each job costs</h3>
        <CreditCostTable className="mt-3" />
      </section>
    </div>
  );
}

export function CreditFaq() {
  return (
    <section aria-labelledby="credit-faq-title" className="mt-14">
      <h2 id="credit-faq-title" className="text-[26px] font-bold tracking-[-0.02em] text-ink md:text-[30px]">Questions about credits</h2>
      <div className="mt-5 divide-y divide-line-2 rounded-[20px] border border-line bg-surface">
        {CREDIT_FAQ.map((item) => (
          <details key={item.q} className="group px-5 py-4">
            <summary className="cursor-pointer list-none text-[16px] font-semibold text-ink">{item.q}</summary>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
