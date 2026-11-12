'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppFrame } from '@/components/app/AppFrame';
import { Card, StatusPill } from '@/components/app/ui';
import { useSignedIn } from '@/components/app/useSignedIn';
import { DeliverablePrompt } from '@/components/app/workflows/DeliverablePrompt';
import { api } from '@/lib/session';
import { CORE_WORKBOOK_KINDS, WORKFLOW_CATALOG, workbookReminders, type Workbook, type WorkbookMilestone, type WorkflowKind } from '@/lib/workflows';

type Summary = Omit<Workbook, 'entries' | 'recalls'> & { entry_count: number; milestones?: WorkbookMilestone[] };
const urgencyLabel = { overdue: 'Overdue', today: 'Due today', soon: 'Due soon' } as const;

function WorkbookCard({ workbook }: { workbook: Summary }) {
  const reminders = workbookReminders(workbook);
  const section = reminders[0]?.section;
  return (
    <Link href={`/workbooks/${workbook.id}${section ? `?section=${section}` : ''}`} className="rounded-2xl border border-line bg-surface p-5 hover:bg-soft">
      <p className="font-bold">{workbook.title}</p>
      <p className="mt-1 text-sm text-muted">
        {WORKFLOW_CATALOG[workbook.kind].title} · {workbook.entry_count} entries{workbook.deadline ? ` · Due ${workbook.deadline}` : ''}
      </p>
      <div className="mt-3"><StatusPill tone={workbook.status === 'approved' ? 'positive' : 'neutral'}>{workbook.status.replaceAll('_', ' ')}</StatusPill></div>
      {reminders.length > 0 && (
        <ul className="mt-3 grid gap-1 text-xs">
          {reminders.map((reminder) => (
            <li key={reminder.id} className={reminder.urgency === 'overdue' ? 'text-amber-700' : 'text-muted'}>
              {urgencyLabel[reminder.urgency]}: {reminder.title} · {reminder.due}
            </li>
          ))}
        </ul>
      )}
    </Link>
  );
}

function Workbooks() {
  const { user } = useSignedIn();
  const query = useSearchParams();
  const [workbooks, setWorkbooks] = useState<Summary[]>([]);
  const [kinds, setKinds] = useState<WorkflowKind[]>([...CORE_WORKBOOK_KINDS]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    let alive = true;
    api<{ workbooks: Summary[]; available_kinds: WorkflowKind[] }>('/api/workbooks')
      .then((result) => { if (alive) { setWorkbooks(result.workbooks); setKinds(result.available_kinds); } })
      .catch((e) => { if (alive) setError((e as Error).message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [user]);

  return (
    <AppFrame wide title="Workbooks" subtitle="Keep sources, exact quotations, appraisals and review decisions together, then draft the deliverable from them.">
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
      {!loading && (
        <DeliverablePrompt
          kinds={kinds}
          defaultOpen={query.get('new') === '1' || !workbooks.length}
          projectId={query.get('project_id') || ''}
        />
      )}
      <div className="mb-3 mt-9 flex items-center justify-between">
        <h2 className="text-[20px] font-bold">Your workbooks</h2>
        <span className="text-sm text-muted">{workbooks.length} workbooks</span>
      </div>
      {loading && <p role="status" className="text-sm text-muted">Loading workbooks…</p>}
      {!loading && !workbooks.length && <Card className="p-8 text-center text-muted">Plan a deliverable above to create your first workbook.</Card>}
      <div className="grid gap-3 sm:grid-cols-2">
        {workbooks.map((workbook) => <WorkbookCard key={workbook.id} workbook={workbook} />)}
      </div>
    </AppFrame>
  );
}

export default function Page() { return <Suspense fallback={null}><Workbooks /></Suspense>; }
