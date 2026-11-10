'use client';

/**
 * The authorship report: how one person wrote one document. Shown live to the writer
 * (/authorship/[id]) and, once issued, to whoever has the link (/verify/[token]).
 */

export type AuthorshipPayload = {
  version: 1;
  document: { id: string; title: string; word_count: number };
  author: { name: string };
  generated_at: string;
  recording_since: string | null;
  last_activity: string | null;
  totals: { active_seconds: number; typed: number; pasted_external: number; pasted_internal: number; ai_inserted: number; deleted: number };
  shares: { typed: number; pasted_external: number; pasted_internal: number; ai_inserted: number };
  sessions: number;
  writing_days: number;
  days: { date: string; minutes: number; typed: number; pasted_external: number; pasted_internal: number; ai_inserted: number }[];
  growth: { at: string; words: number; reason: string }[];
  large_pastes: { at: string; chars: number; internal: boolean }[];
  others: { people: number; share_of_added: number };
};

const ROUTES = [
  { key: 'typed', label: 'Typed', color: 'var(--color-brand)' },
  { key: 'pasted_external', label: 'Pasted from outside', color: '#d97706' },
  { key: 'pasted_internal', label: 'Moved within AI for Research', color: '#94a3b8' },
  { key: 'ai_inserted', label: 'Accepted from AI for Research AI', color: '#7c3aed' },
] as const;

const number = (value: number) => value.toLocaleString('en-US');
const day = (value: string) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const dateTime = (value: string) => new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

function hours(seconds: number) {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  return `${h} h ${minutes % 60 ? `${minutes % 60} min` : ''}`.trim();
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-4 py-3.5">
      <p className="text-[12.5px] font-medium text-muted">{label}</p>
      <p className="mt-1 text-[22px] font-bold tracking-[-0.02em] text-ink">{value}</p>
      {hint ? <p className="mt-0.5 text-[12px] text-subtle">{hint}</p> : null}
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 break-inside-avoid rounded-2xl border border-line bg-surface px-5 py-4">
      <h2 className="text-[16px] font-bold tracking-[-0.01em] text-ink">{title}</h2>
      {description ? <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{description}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** Words in the document over time (daily snapshots and saved versions). */
function GrowthChart({ points }: { points: AuthorshipPayload['growth'] }) {
  if (points.length < 2) return <p className="text-[13.5px] text-muted">The chart appears after a second day of writing.</p>;
  const width = 640;
  const height = 180;
  const pad = { left: 44, right: 12, top: 10, bottom: 26 };
  const times = points.map((point) => new Date(point.at).getTime());
  const minT = Math.min(...times);
  const maxT = Math.max(...times);
  const maxW = Math.max(10, ...points.map((point) => point.words));
  const x = (t: number) => pad.left + ((t - minT) / Math.max(1, maxT - minT)) * (width - pad.left - pad.right);
  const y = (w: number) => height - pad.bottom - (w / maxW) * (height - pad.top - pad.bottom);
  const path = points.map((point, index) => `${index ? 'L' : 'M'}${x(times[index]).toFixed(1)},${y(point.words).toFixed(1)}`).join(' ');
  const ticks = [0, Math.round(maxW / 2), maxW];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={`Words grew from ${points[0].words} to ${points[points.length - 1].words}`}>
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke="var(--color-line)" strokeWidth="1" />
          <text x={pad.left - 6} y={y(tick) + 4} textAnchor="end" fontSize="11" fill="var(--color-muted, #64748b)">{number(tick)}</text>
        </g>
      ))}
      <path d={path} fill="none" stroke="var(--color-brand)" strokeWidth="2.25" strokeLinejoin="round" />
      {points.map((point, index) => <circle key={`${point.at}-${index}`} cx={x(times[index])} cy={y(point.words)} r="2.5" fill="var(--color-brand)"><title>{`${dateTime(point.at)}: ${number(point.words)} words`}</title></circle>)}
      <text x={pad.left} y={height - 6} fontSize="11" fill="var(--color-muted, #64748b)">{day(points[0].at)}</text>
      <text x={width - pad.right} y={height - 6} textAnchor="end" fontSize="11" fill="var(--color-muted, #64748b)">{day(points[points.length - 1].at)}</text>
    </svg>
  );
}

/** Minutes written per day, stacked by nothing: one bar a day, its height the time. */
function DaysChart({ days }: { days: AuthorshipPayload['days'] }) {
  const shown = days.slice(-60);
  const max = Math.max(1, ...shown.map((entry) => entry.minutes));
  return (
    <div>
      <div className="flex h-[110px] items-end gap-[3px]" role="img" aria-label={`${days.length} days of writing`}>
        {shown.map((entry) => (
          <div key={entry.date} className="min-w-[4px] flex-1 rounded-t-[3px] bg-brand" style={{ height: `${Math.max(4, (entry.minutes / max) * 100)}%` }} title={`${day(entry.date)}: ${entry.minutes} min, ${number(entry.typed)} characters typed`} />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11.5px] text-subtle">
        <span>{shown[0] ? day(shown[0].date) : ''}</span>
        <span>{shown.length ? day(shown[shown.length - 1].date) : ''}</span>
      </div>
      {days.length > shown.length ? <p className="mt-1 text-[12px] text-subtle">The last 60 writing days are shown.</p> : null}
    </div>
  );
}

export function AuthorshipReportView({ payload, issued }: { payload: AuthorshipPayload; issued?: { id: string; hash: string; created_at: string; valid: boolean } }) {
  const added = payload.totals.typed + payload.totals.pasted_external + payload.totals.pasted_internal + payload.totals.ai_inserted;
  const outsidePastes = payload.large_pastes.filter((paste) => !paste.internal);
  return (
    <div className="text-ink">
      <header>
        <p className="text-[12.5px] font-semibold uppercase tracking-[0.06em] text-brand">Authorship report</p>
        <h1 className="mt-1 text-[26px] font-bold leading-tight tracking-[-0.02em]">{payload.document.title}</h1>
        <p className="mt-1.5 text-[14.5px] text-muted">
          Written by <span className="font-semibold text-ink">{payload.author.name}</span>
          {payload.recording_since ? <> · recorded from {day(payload.recording_since)} to {day(payload.last_activity || payload.generated_at)}</> : null}
          {' '}· report made {dateTime(payload.generated_at)}
        </p>
      </header>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Time writing" value={hours(payload.totals.active_seconds)} hint={`${payload.sessions} session${payload.sessions === 1 ? '' : 's'}`} />
        <Stat label="Writing days" value={number(payload.writing_days)} />
        <Stat label="Words now" value={number(payload.document.word_count)} />
        <Stat label="Typed by the author" value={`${payload.shares.typed}%`} hint={`${number(payload.totals.typed)} characters`} />
      </div>

      <Section title="How the text was added" description="Every character the author added, by how it got into the document. Deleting and rewriting are part of writing and are counted separately.">
        {added ? (
          <>
            <div className="flex h-4 w-full overflow-hidden rounded-full bg-line-2" role="img" aria-label={ROUTES.map((route) => `${route.label} ${payload.shares[route.key]}%`).join(', ')}>
              {ROUTES.map((route) => (payload.shares[route.key] ? <div key={route.key} style={{ width: `${payload.shares[route.key]}%`, background: route.color }} /> : null))}
            </div>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {ROUTES.map((route) => (
                <li key={route.key} className="flex items-center gap-2.5 text-[14px]">
                  <span className="h-3 w-3 shrink-0 rounded-[3px]" style={{ background: route.color }} />
                  <span className="min-w-0 flex-1 text-ink-2">{route.label}</span>
                  <span className="font-semibold tabular-nums">{payload.shares[route.key]}%</span>
                  <span className="w-[110px] text-right text-[12.5px] tabular-nums text-subtle">{number(payload.totals[route.key])} chars</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[13px] text-muted">The author also deleted {number(payload.totals.deleted)} characters while revising.</p>
          </>
        ) : <p className="text-[13.5px] text-muted">No writing recorded yet.</p>}
        {payload.others.people ? (
          <p className="mt-2 text-[13px] text-muted">
            This document is shared: {payload.others.people} other {payload.others.people === 1 ? 'person' : 'people'} added {payload.others.share_of_added}% of all text. Their work is not counted above.
          </p>
        ) : null}
      </Section>

      <Section title="How the document grew" description="Words in the document at each daily snapshot and saved version.">
        <GrowthChart points={payload.growth} />
      </Section>

      <Section title="When the author wrote" description="Minutes of writing each day.">
        {payload.days.length ? <DaysChart days={payload.days} /> : <p className="text-[13.5px] text-muted">No writing recorded yet.</p>}
      </Section>

      <Section title="Large pastes" description={`Each paste of ${200}+ characters, with when it happened. The pasted text itself is not stored; a fingerprint of it is.`}>
        {payload.large_pastes.length ? (
          <ul className="divide-y divide-line-2 text-[13.5px]">
            {payload.large_pastes.slice(-50).reverse().map((paste, index) => (
              <li key={`${paste.at}-${index}`} className="flex items-center gap-3 py-2">
                <span className="min-w-0 flex-1 text-ink-2">{dateTime(paste.at)}</span>
                <span className="tabular-nums">{number(paste.chars)} chars</span>
                <span className={`rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold ${paste.internal ? 'bg-line-2 text-ink-3' : 'bg-amber-50 text-amber-800'}`}>{paste.internal ? 'From an AI for Research document' : 'From outside'}</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-[13.5px] text-muted">None.</p>}
        {outsidePastes.length > 50 ? <p className="mt-2 text-[12px] text-subtle">The 50 most recent are listed.</p> : null}
      </Section>

      <Section title="How to read this report">
        <ul className="list-disc space-y-1.5 pl-5 text-[13.5px] leading-relaxed text-ink-2">
          <li>AI for Research recorded this while the author wrote in its editor. Writing done elsewhere and pasted in shows as pasted from outside, which is normal for notes and drafts.</li>
          <li>Accepted from AI for Research AI is text the author took from AI for Research&apos;s own suggestions. Text from other AI tools pasted in counts as pasted from outside.</li>
          <li>Recording starts the first time the author opens the document after the feature was turned on; earlier writing is not included.</li>
          <li>The counts come from the author&apos;s own browser. The report is a record of how the document grew, not proof of authorship on its own.</li>
        </ul>
      </Section>

      {issued ? (
        <section className={`mt-6 break-inside-avoid rounded-2xl border px-5 py-4 ${issued.valid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <h2 className={`text-[15px] font-bold ${issued.valid ? 'text-green-800' : 'text-red-700'}`}>{issued.valid ? 'Intact: this is the report as it was issued' : 'This report has changed since it was issued'}</h2>
          <p className="mt-1 break-all font-mono text-[12px] text-ink-3">Fingerprint (SHA-256): {issued.hash}</p>
          <p className="mt-1 text-[12.5px] text-ink-3">Issued {dateTime(issued.created_at)} · report {issued.id}. Compare the fingerprint with the one on any printed copy.</p>
        </section>
      ) : null}
    </div>
  );
}
