'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSignedIn } from '@/components/app/useSignedIn';
import { api } from '@/lib/session';
import { workbookReminders, type Workbook, type WorkbookMilestone, type WorkbookReminder } from '@/lib/workflows';

type Summary = Pick<Workbook, 'id' | 'title' | 'deadline' | 'status'> & { milestones?: WorkbookMilestone[] };
type Reminder = WorkbookReminder & { workbook_id: string };
const panel = 'mt-2.5 rounded-2xl border border-line bg-surface p-4';
const urgencyLabel = { overdue: 'Overdue', today: 'Due today', soon: 'Due soon' } as const;

function reminderHref(reminder: Reminder) {
  return `/workbooks/${reminder.workbook_id}${reminder.section ? `?section=${reminder.section}` : ''}`;
}

/** The "Continue" panels for workbooks: due dates, recent workbooks and evidence updates to review. */
export function HomeWorkbooks() {
  const { user } = useSignedIn();
  const [workbooks, setWorkbooks] = useState<Summary[]>([]);
  const [updates, setUpdates] = useState(0);

  useEffect(() => {
    if (!user) return;
    api<{ workbooks: Summary[] }>('/api/workbooks').then((result) => setWorkbooks(result.workbooks)).catch(() => setWorkbooks([]));
    api<{ monitors: { pending_runs: number }[] }>('/api/monitoring')
      .then((result) => setUpdates(result.monitors.reduce((sum, monitor) => sum + monitor.pending_runs, 0)))
      .catch(() => setUpdates(0));
  }, [user]);

  const reminders: Reminder[] = workbooks
    .flatMap((workbook) => workbookReminders(workbook).map((reminder) => ({ ...reminder, workbook_id: workbook.id })))
    .sort((a, b) => a.due.localeCompare(b.due));

  return (
    <>
      {reminders.length > 0 && (
        <div className={panel}>
          <h3 className="text-sm font-semibold">Upcoming and overdue work</h3>
          <p className="mt-1 text-xs text-muted">Overdue dates and the next seven days. No emails are sent.</p>
          <ul className="mt-2 divide-y divide-line-2">
            {reminders.slice(0, 10).map((reminder) => (
              <li key={reminder.id}>
                <Link href={reminderHref(reminder)} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm hover:text-brand">
                  <span className="min-w-0 font-medium">{reminder.title}</span>
                  <span className={`shrink-0 text-xs ${reminder.urgency === 'overdue' ? 'text-amber-700' : 'text-muted'}`}>
                    {urgencyLabel[reminder.urgency]} · {reminder.due}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {workbooks.length > 0 && (
        <div className={panel}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Workbooks</h3>
            <Link href="/workbooks" className="text-sm font-semibold text-brand hover:underline">All workbooks</Link>
          </div>
          <ul className="mt-2 divide-y divide-line-2">
            {workbooks.slice(0, 4).map((workbook) => (
              <li key={workbook.id}>
                <Link href={`/workbooks/${workbook.id}`} className="flex items-center justify-between gap-3 py-2 text-sm hover:text-brand">
                  <span className="truncate font-medium">{workbook.title}</span>
                  <span className="shrink-0 text-xs text-muted">{workbook.deadline ? `Due ${workbook.deadline}` : workbook.status.replaceAll('_', ' ')}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {updates > 0 && (
        <Link href="/monitoring" className="mt-2.5 block rounded-xl border border-line bg-surface p-4 text-sm font-semibold text-brand hover:bg-soft">
          {updates} saved-search update{updates === 1 ? '' : 's'} with changes to review
        </Link>
      )}
    </>
  );
}
