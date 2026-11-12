'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  LuArrowRight, LuChartBar, LuClipboardCheck, LuFileText, LuGraduationCap, LuListChecks, LuNotebookPen, LuPresentation, LuSearch, LuSparkles, LuWandSparkles,
} from 'react-icons/lu';
import { AppFrame } from '@/components/app/AppFrame';
import { Card } from '@/components/app/ui';
import { useSignedIn } from '@/components/app/useSignedIn';
import { api, refreshSession } from '@/lib/session';
import { useCredits } from '@/lib/billing';
import { AskComposer, type AskRequest } from '@/components/app/research/AskComposer';
import { ROLE_OPTIONS } from '@/components/app/research/parts';
import { KIND_LABELS, PENDING_KEY, taskHref, type TaskRecord } from '@/components/app/research/handoff';

/** The quick tasks under the Ask box (the follow-on tools of every result, as starting points). */
const TASKS = [
  { label: 'Improve document', href: '/write?module=improve', icon: LuWandSparkles },
  { label: 'Write a paper', href: '/write?module=paper', icon: LuNotebookPen },
  { label: 'Peer review', href: '/reviewer', icon: LuClipboardCheck },
  { label: 'Find gaps', href: '/thesis?module=gaps', icon: LuSearch },
  { label: 'Check citations', href: '/reviewer?module=citations', icon: LuListChecks },
  { label: 'Write abstract', href: '/write?module=abstract', icon: LuFileText },
  { label: 'Thesis outline', href: '/thesis?module=outline', icon: LuGraduationCap },
  { label: 'Systematic review', href: '/systematic-review', icon: LuListChecks },
  { label: 'Make slides', href: '/slides', icon: LuPresentation },
  { label: 'Analyse data', href: '/data-lab', icon: LuChartBar },
];

/** First visit: three seconds to say who you are, so every workspace starts at the right level. */
function RolePrompt() {
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  if (done) return null;
  const choose = async (role: string) => {
    setSaving(true);
    await api('/api/auth/me', { method: 'PATCH', body: JSON.stringify({ profile: { role } }) }).catch(() => undefined);
    await refreshSession().catch(() => undefined);
    setDone(true);
  };
  return (
    <Card className="mb-5 px-5 py-4">
      <p className="text-[15px] font-semibold text-ink">What best describes you?</p>
      <p className="mt-0.5 text-[14px] text-muted">It sets the level and tone of answers, reviews and drafts. You can change it on any task.</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {ROLE_OPTIONS.map(([id, label]) => (
          <button key={id} type="button" disabled={saving} onClick={() => choose(id)} className="h-8 rounded-full border border-line bg-surface px-3 text-[13.5px] font-medium text-ink-2 hover:border-brand hover:text-brand">{label}</button>
        ))}
        <button type="button" onClick={() => setDone(true)} className="h-8 px-2 text-[13.5px] font-medium text-muted hover:text-ink">Skip</button>
      </div>
    </Card>
  );
}

function Home() {
  const { user } = useSignedIn();
  const router = useRouter();
  const params = useSearchParams();
  const credits = useCredits(Boolean(user));
  const [tasks, setTasks] = useState<TaskRecord[] | null>(null);
  const [libraryCount, setLibraryCount] = useState<number | null>(null);
  const [documentCount, setDocumentCount] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    api<{ tasks: TaskRecord[] }>('/api/history?limit=8').then((result) => setTasks(result.tasks)).catch(() => setTasks([]));
    api<{ total: number }>('/api/library/documents?page_size=1').then((result) => setLibraryCount(result.total)).catch(() => setLibraryCount(null));
    api<{ documents: unknown[] }>('/api/ai-editor/documents').then((result) => setDocumentCount(result.documents.length)).catch(() => setDocumentCount(null));
  }, [user]);

  const start = (request: AskRequest) => {
    try { sessionStorage.setItem(PENDING_KEY, JSON.stringify(request)); } catch { /* too large or blocked */ }
    router.push('/deep-research?start=1');
  };
  const first = (user?.full_name || '').split(/\s+/)[0];
  const counts = [
    { label: 'Papers in Library', value: libraryCount },
    { label: 'Documents', value: documentCount },
    { label: 'Jobs this month', value: tasks === null ? null : tasks.filter((task) => new Date(task.created_at).getMonth() === new Date().getMonth()).length },
    { label: 'Credits left', value: credits ? credits.left : null, unlimited: credits?.left === null },
  ];

  return (
    <AppFrame title={first ? `What are you researching, ${first}?` : 'What are you researching?'} wide>
      {user && !user.profile?.role && <RolePrompt />}
      <AskComposer onSubmit={start} autoFocus={params.get('new') === '1'} />

      <section aria-labelledby="tasks-title" className="mt-8">
        <h2 id="tasks-title" className="text-[15px] font-bold text-ink">Start a task</h2>
        <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {TASKS.map(({ label, href, icon: Icon }) => (
            <Link key={href} href={href} className="flex h-11 items-center gap-2.5 rounded-xl border border-line bg-surface px-3 text-[14px] font-medium text-ink-2 hover:border-brand-100 hover:bg-soft">
              <Icon className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" /><span className="truncate">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section aria-labelledby="continue-title">
          <div className="flex items-baseline justify-between">
            <h2 id="continue-title" className="text-[15px] font-bold text-ink">Continue</h2>
            <Link href="/history" className="text-[13.5px] font-semibold text-brand hover:underline">All history</Link>
          </div>
          {tasks === null && <p className="mt-3 text-[14px] text-muted">Loading…</p>}
          {tasks?.length === 0 && (
            <Card className="mt-2.5 px-5 py-6">
              <p className="text-[15px] font-semibold">Nothing here yet</p>
              <p className="mt-1 text-[14px] text-muted">Ask your first question above. Every report, review and draft you make is kept here to reopen and build on.</p>
            </Card>
          )}
          {tasks && tasks.length > 0 && (
            <ul className="mt-2.5 divide-y divide-line-2 rounded-2xl border border-line bg-surface">
              {tasks.map((task) => (
                <li key={task.id}>
                  <Link href={taskHref(task)} className="flex items-center gap-3 px-4 py-3 hover:bg-soft">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium text-ink">{task.title}</span>
                      <span className="text-[13px] text-muted">{KIND_LABELS[task.kind] || task.kind}{task.status === 'failed' ? ' · did not finish' : task.status === 'running' ? ' · running' : ''}</span>
                    </span>
                    <span className="shrink-0 text-[13px] text-muted">{new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    <LuArrowRight className="h-4 w-4 shrink-0 text-subtle" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <aside aria-label="At a glance" className="grid grid-cols-2 content-start gap-px overflow-hidden rounded-2xl border border-line bg-line-2">
          {counts.map((count) => (
            <div key={count.label} className="bg-surface px-4 py-3">
              <p className="text-[12.5px] text-muted">{count.label}</p>
              <p className="mt-1 text-[22px] font-semibold tabular-nums text-ink">{count.unlimited ? 'Unlimited' : count.value === null || count.value === undefined ? '–' : count.value.toLocaleString('en-US')}</p>
            </div>
          ))}
          <Link href="/deep-research" className="col-span-2 flex items-center gap-2 bg-surface px-4 py-3 text-[14px] font-semibold text-brand hover:bg-soft">
            <LuSparkles className="h-4 w-4" aria-hidden="true" />All research<LuArrowRight className="ml-auto h-4 w-4" aria-hidden="true" />
          </Link>
        </aside>
      </div>
    </AppFrame>
  );
}

export default function Page() {
  return <Suspense fallback={null}><Home /></Suspense>;
}
