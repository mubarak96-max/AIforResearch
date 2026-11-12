'use client';

/**
 * Credits on the account page: this month's allowance and what is left, extra credits bought
 * (with what is left of each and when it expires), buying more, the Defence Pass, and what each
 * job costs.
 */
import { LuGraduationCap, LuPlus } from 'react-icons/lu';
import { Button, Card, CardHeader, StatusPill } from '@/components/app/ui';
import { money, openPricing, type CreditSummary } from '@/lib/billing';
import { CREDIT_TABLE } from './creditTable';

export type Purchase = {
  id: string; pack: string; name: string; kind: 'topup' | 'pass'; credits: number; credits_left: number; cents: number;
  status: 'active' | 'expired' | 'refunded' | 'applied'; converted: boolean; created_at: string; expires_at: string | null; pass_end: string | null;
};
export type Pack = { id: string; kind: 'topup' | 'pass'; name: string; credits: number; cents: number; days: number };

const day = (value: string) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export function CreditsCard({ credits, purchases, packs, paymentsEnabled, onPass, passEnd, busy, onBuy }: {
  credits: CreditSummary; purchases: Purchase[]; packs: Pack[]; paymentsEnabled: boolean; onPass: boolean; passEnd: string | null;
  busy: string | null; onBuy: (key: string, path: string, body?: unknown) => void;
}) {
  const { allowance, used, topup, left, resets_on, plan } = credits;
  const monthLeft = allowance === null ? null : Math.max(0, allowance - used);
  const share = allowance ? Math.min(1, used / allowance) : 0;
  const topups = packs.filter((pack) => pack.kind === 'topup');
  const pass = packs.find((pack) => pack.kind === 'pass');
  const resets = new Date(`${resets_on}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

  return (
    <Card>
      <CardHeader title="Credits" description="Credits pay for AI jobs: research reports, reviews, drafts and slides. Paper search, citations, the Library and the editor use none." />
      <div className="grid gap-5 px-5 py-5 sm:grid-cols-3">
        <div>
          <p className="text-[13px] text-muted">Left now</p>
          <p className="mt-1 text-[28px] font-semibold tabular-nums tracking-[-0.01em]">{left === null ? 'Unlimited' : left.toLocaleString('en-US')}</p>
        </div>
        <div>
          <p className="text-[13px] text-muted">This month on {plan.name}</p>
          <p className="mt-1 text-[15px] tabular-nums text-ink">{allowance === null ? 'Unlimited' : `${used.toLocaleString('en-US')} of ${allowance.toLocaleString('en-US')} used`}</p>
          {allowance !== null && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line-2"><div className="h-full rounded-full bg-brand" style={{ width: `${share * 100}%` }} /></div>
          )}
          <p className="mt-1.5 text-[13px] text-muted">{monthLeft !== null ? `${monthLeft.toLocaleString('en-US')} left · ` : ''}renews {resets}</p>
        </div>
        <div>
          <p className="text-[13px] text-muted">Extra credits</p>
          <p className="mt-1 text-[15px] tabular-nums text-ink">{topup.toLocaleString('en-US')}</p>
          <p className="mt-1.5 text-[13px] text-muted">Used after the month&rsquo;s credits run out. Kept 12 months.</p>
        </div>
      </div>

      {paymentsEnabled && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line-2 px-5 py-4">
          {plan.is_default ? (
            <>
              <p className="min-w-0 flex-1 text-[14px] text-ink-2">Extra credits are for paid plans. Plus gives you 500 credits a month.</p>
              <Button variant="primary" size="sm" onClick={() => openPricing('More credits come with the paid plans.')}>Upgrade</Button>
            </>
          ) : (
            <>
              <p className="min-w-0 flex-1 text-[14px] text-ink-2">Need more this month?</p>
              {topups.map((pack) => (
                <Button key={pack.id} size="sm" disabled={busy !== null} onClick={() => onBuy(pack.id, '/api/billing/credits/checkout', { pack: pack.id })}>
                  <LuPlus className="h-4 w-4" aria-hidden="true" />{busy === pack.id ? 'Opening…' : `${pack.credits.toLocaleString('en-US')} credits · ${money(pack.cents)}`}
                </Button>
              ))}
            </>
          )}
        </div>
      )}

      {pass && paymentsEnabled && (
        <div className="flex flex-wrap items-center gap-3 border-t border-line-2 px-5 py-4">
          <LuGraduationCap className="h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-[14.5px] font-semibold">Defence Pass · {money(pass.cents)} once</p>
            <p className="text-[13.5px] text-muted">
              {onPass && passEnd ? `Your pass runs until ${day(passEnd)}. Another pass adds 90 days.` : '90 days of Pro for the last stretch of a thesis. Paid once; it does not renew.'}
              {plan.id !== 'free' && !onPass ? ' You already pay for a plan, so a pass would be added as 4,500 extra credits.' : ''}
            </p>
          </div>
          <Button size="sm" disabled={busy !== null} onClick={() => onBuy('pass', '/api/billing/pass/checkout')}>{busy === 'pass' ? 'Opening…' : onPass ? 'Add 90 days' : 'Get the pass'}</Button>
        </div>
      )}

      {purchases.length > 0 && (
        <div className="border-t border-line-2 px-5 py-4">
          <p className="text-[14px] font-semibold">Bought</p>
          <ul className="mt-2 divide-y divide-line-2">
            {purchases.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-[14px]">
                <span className="min-w-0 flex-1 text-ink">{item.name}{item.converted ? ' (as 4,500 credits)' : ''} <span className="text-muted">· {day(item.created_at)}</span></span>
                {item.kind === 'topup' || item.converted ? (
                  item.status === 'active'
                    ? <span className="tabular-nums text-muted">{item.credits_left.toLocaleString('en-US')} of {item.credits.toLocaleString('en-US')} left · expires {item.expires_at ? day(item.expires_at) : '–'}</span>
                    : <StatusPill tone={item.status === 'refunded' ? 'warning' : 'neutral'}>{item.status === 'refunded' ? 'Refunded' : 'Expired'}</StatusPill>
                ) : (
                  <span className="text-muted">{item.status === 'refunded' ? 'Refunded' : item.pass_end ? `Pro until ${day(item.pass_end)}` : ''}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <details className="border-t border-line-2 px-5 py-4">
        <summary className="cursor-pointer text-[14px] font-semibold text-brand">What each job costs</summary>
        <CreditCostTable className="mt-3" />
      </details>
    </Card>
  );
}

/** The credit price list, shared with the pricing page and dialog. */
export function CreditCostTable({ className = '' }: { className?: string }) {
  return (
    <table className={`w-full text-[14px] ${className}`}>
      <thead><tr className="text-left text-[12.5px] text-muted"><th className="pb-1.5 font-normal">Job</th><th className="pb-1.5 text-right font-normal">Credits</th></tr></thead>
      <tbody>
        {CREDIT_TABLE.map((row) => (
          <tr key={row.job} className="border-t border-line-2">
            <td className="py-1.5 pr-3 text-ink-2">{row.job}{row.note ? <span className="text-muted"> · {row.note}</span> : null}</td>
            <td className="py-1.5 text-right tabular-nums text-ink">{row.credits}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
