'use client';

/**
 * Thesis defence timeline planner (/tools/thesis-defence-timeline-planner): plans backward from
 * the defence date to a dated list of steps, marks today, warns about passed deadlines, and
 * exports plain text or an .ics calendar file made in the browser.
 */
import { Fragment, useEffect, useMemo, useState } from 'react';
import { LuCheck, LuCopy, LuDownload, LuTriangleAlert } from 'react-icons/lu';
import { DEFAULT_INPUT, daysBetween, formatDate, icsStamp, isIsoDate, localToday, planTimeline, timelineIcs, timelineText, type ExtraItem, type StepStatus } from '@/lib/defenceTimeline';
import { btnGhost, btnPrimary, focusRing } from '@/components/marketing/styles';

const control = `w-full rounded-xl border border-line bg-surface px-3.5 text-[15px] text-ink placeholder:text-subtle ${focusRing}`;

const BADGE: Record<StepStatus, { label: string; className: string }> = {
  late: { label: 'Deadline passed', className: 'bg-rose-100 text-rose-900' },
  'start-late': { label: 'Should have started', className: 'bg-amber-100 text-amber-900' },
  now: { label: 'Now', className: 'bg-brand-50 text-brand' },
  upcoming: { label: '', className: '' },
  done: { label: 'Past', className: 'bg-line-2 text-muted' },
};

function NumberField({ id, label, value, onChange, max, help }: { id: string; label: string; value: number; onChange: (value: number) => void; max: number; help?: string }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[14px] font-medium text-ink">{label}</label>
      <input id={id} type="number" inputMode="numeric" min={0} max={max} value={Number.isFinite(value) ? value : ''} onChange={(event) => onChange(Math.min(max, Math.max(0, Number(event.target.value) || 0)))} aria-describedby={help ? `${id}-help` : undefined} className={`${control} h-11`} />
      {help && <p id={`${id}-help`} className="mt-1 text-[12.5px] text-muted">{help}</p>}
    </div>
  );
}

export function ThesisDefenceTimelinePlanner() {
  const [today, setToday] = useState<string | null>(null);
  const [defenceDate, setDefenceDate] = useState('');
  const [examinerWeeks, setExaminerWeeks] = useState(DEFAULT_INPUT.examinerWeeks);
  const [supervisorWeeks, setSupervisorWeeks] = useState(DEFAULT_INPUT.supervisorWeeks);
  const [revisionDays, setRevisionDays] = useState(DEFAULT_INPUT.revisionDays);
  const [extras, setExtras] = useState<ExtraItem[]>(DEFAULT_INPUT.extras);
  const [avoidWeekends, setAvoidWeekends] = useState(DEFAULT_INPUT.avoidWeekends);
  const [copied, setCopied] = useState<'idle' | 'done' | 'failed'>('idle');

  // Today comes from the visitor's clock, after the page loads (the server's date may differ).
  useEffect(() => setToday(localToday()), []);

  const valid = isIsoDate(defenceDate);
  const timeline = useMemo(
    () => (valid && today ? planTimeline({ defenceDate, examinerWeeks, supervisorWeeks, revisionDays, extras, avoidWeekends }, today) : null),
    [valid, today, defenceDate, examinerWeeks, supervisorWeeks, revisionDays, extras, avoidWeekends],
  );
  useEffect(() => setCopied('idle'), [timeline]);

  const updateExtra = (id: ExtraItem['id'], change: Partial<ExtraItem>) => setExtras((items) => items.map((item) => (item.id === id ? { ...item, ...change } : item)));

  const copy = async () => {
    if (!timeline) return;
    try {
      await navigator.clipboard.writeText(timelineText(timeline, defenceDate));
      setCopied('done');
    } catch {
      setCopied('failed');
    }
  };

  const download = () => {
    if (!timeline) return;
    const blob = new Blob([timelineIcs(timeline, icsStamp())], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `thesis-defence-timeline-${defenceDate}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Where the "Today" line goes: before the first step that is still ahead.
  const todayIndex = timeline ? timeline.steps.findIndex((step) => step.due >= timeline.today) : -1;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="defence-date" className="mb-1.5 block text-[14px] font-medium text-ink">Defence date</label>
          <input id="defence-date" type="date" value={defenceDate} onChange={(event) => setDefenceDate(event.target.value)} className={`${control} h-11`} />
        </div>
        <NumberField id="examiner-weeks" label="Weeks the examiners need the thesis" value={examinerWeeks} onChange={setExaminerWeeks} max={52} help="Check your university’s rules. Six weeks is a common minimum." />
        <NumberField id="supervisor-weeks" label="Weeks for your supervisor to read the draft" value={supervisorWeeks} onChange={setSupervisorWeeks} max={52} />
        <NumberField id="revision-days" label="Days to revise after their feedback" value={revisionDays} onChange={setRevisionDays} max={180} />
      </div>

      <fieldset className="rounded-2xl border border-line bg-surface px-4 py-4 sm:px-5">
        <legend className="px-1 text-[14px] font-medium text-ink">Other steps (days)</legend>
        <ul className="flex flex-col gap-3">
          {extras.map((item) => (
            <li key={item.id} className="grid grid-cols-[minmax(0,1fr)_88px] items-center gap-3">
              <label className="flex items-start gap-2.5 text-[14.5px] text-ink-2">
                <input type="checkbox" checked={item.enabled} onChange={(event) => updateExtra(item.id, { enabled: event.target.checked })} className={`mt-1 h-4 w-4 shrink-0 accent-[var(--color-brand)] ${focusRing}`} />
                {item.label}
              </label>
              <input type="number" inputMode="numeric" min={1} max={180} value={item.days} disabled={!item.enabled} aria-label={`${item.label}: days`} onChange={(event) => updateExtra(item.id, { days: Math.min(180, Math.max(1, Number(event.target.value) || 1)) })} className={`${control} h-10 disabled:opacity-50`} />
            </li>
          ))}
        </ul>
        <label className="mt-4 flex items-center gap-2.5 border-t border-line-2 pt-4 text-[14.5px] text-ink-2">
          <input type="checkbox" checked={avoidWeekends} onChange={(event) => setAvoidWeekends(event.target.checked)} className={`h-4 w-4 accent-[var(--color-brand)] ${focusRing}`} />
          Move deadlines that fall on a weekend to the Friday before
        </label>
      </fieldset>

      <div aria-live="polite" className="flex flex-col gap-4">
        {!valid && <p className="text-[14px] text-muted">Pick your defence date to see the plan.</p>}
        {timeline && (
          <>
            {timeline.warnings.map((warning) => (
              <p key={warning} className="flex gap-2.5 rounded-xl border border-amber/40 bg-amber-50 px-4 py-3 text-[14px] leading-[1.5] text-ink-2">
                <LuTriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber" aria-hidden="true" />{warning}
              </p>
            ))}
            {timeline.warnings.length === 0 && (
              <p className="text-[14.5px] text-ink-2">
                The plan starts {formatDate(timeline.steps[0].start)}, {timeline.slackDays === 0 ? 'today' : `${timeline.slackDays} day${timeline.slackDays === 1 ? '' : 's'} from today`}. The defence is {daysBetween(timeline.today, defenceDate)} days away.
              </p>
            )}

            <ol className="flex flex-col rounded-2xl border border-line bg-surface">
              {timeline.steps.map((step, index) => (
                <Fragment key={step.id}>
                  {index === todayIndex && (
                    <li className="flex items-center gap-3 px-4 py-1.5 text-[12.5px] font-semibold uppercase tracking-[.06em] text-accent sm:px-5">
                      <span className="h-px flex-1 bg-accent/60" aria-hidden="true" />Today, {formatDate(timeline.today)}<span className="h-px flex-1 bg-accent/60" aria-hidden="true" />
                    </li>
                  )}
                  <li className={`grid gap-1 border-line-2 px-4 py-3 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-4 sm:px-5 ${index > 0 ? 'border-t' : ''}`}>
                    <p className="text-[14px] font-medium text-ink">
                      {step.milestone || step.start === step.due ? formatDate(step.due) : <>{formatDate(step.start)}<span className="text-muted"> to </span>{formatDate(step.due)}</>}
                    </p>
                    <div>
                      <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-ink">
                        {step.label}
                        {BADGE[step.status].label && <span className={`rounded px-1.5 py-0.5 text-[12px] font-semibold ${BADGE[step.status].className}`}>{BADGE[step.status].label}</span>}
                      </p>
                      <p className="mt-0.5 text-[13.5px] leading-[1.5] text-muted">{step.detail}</p>
                    </div>
                  </li>
                </Fragment>
              ))}
              {todayIndex === -1 && (
                <li className="border-t border-line-2 px-4 py-1.5 text-center text-[12.5px] font-semibold uppercase tracking-[.06em] text-accent sm:px-5">Today, {formatDate(timeline.today)}</li>
              )}
            </ol>

            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={download} className={`${btnPrimary} h-10 px-4 text-[14px]`}><LuDownload className="h-4 w-4" aria-hidden="true" /> Download calendar (.ics)</button>
              <button type="button" onClick={copy} className={`${btnGhost} h-10 px-4 text-[14px]`}>{copied === 'done' ? <LuCheck className="h-4 w-4" aria-hidden="true" /> : <LuCopy className="h-4 w-4" aria-hidden="true" />} Copy as text</button>
              <span role="status" className="text-[13px] text-muted">{copied === 'done' ? 'Copied.' : copied === 'failed' ? 'Could not copy.' : ''}</span>
            </div>
            <p className="text-[13px] leading-[1.5] text-muted">The calendar file adds each step as an all-day event on its due date. It opens in Google Calendar, Outlook and Apple Calendar. Nothing is sent anywhere.</p>
          </>
        )}
      </div>
    </div>
  );
}
