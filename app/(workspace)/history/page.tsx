'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { LuSearch, LuStar, LuTrash2 } from 'react-icons/lu';
import { AppFrame } from '@/components/app/AppFrame';
import { Card } from '@/components/app/ui';
import { useSignedIn } from '@/components/app/useSignedIn';
import { api } from '@/lib/session';
import { KIND_LABELS, taskHref, type TaskRecord } from '@/components/app/research/handoff';
import { showError } from '@/components/app/research/parts';

type Project = { id: string; name: string; role: string };
type Summary = Omit<TaskRecord, 'inputs' | 'result'> & { summary: string | null };

function History() {
  const { user } = useSignedIn();
  const router = useRouter();
  const params = useSearchParams();
  const [tasks, setTasks] = useState<Summary[] | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [kind, setKind] = useState('');
  const [query, setQuery] = useState('');
  const [starredOnly, setStarredOnly] = useState(false);

  useEffect(() => {
    // An old link to one task: open it in its workspace.
    const open = params.get('task');
    if (open) {
      api<TaskRecord>(`/api/history/${encodeURIComponent(open)}`).then((task) => {
        const href = taskHref(task);
        if (!href.startsWith('/history')) router.replace(href);
      }).catch(showError);
    }
  }, [params, router]);
  useEffect(() => {
    if (!user) return;
    api<{ tasks: Summary[] }>(`/api/history?limit=200${kind ? `&kind=${kind}` : ''}`).then((result) => setTasks(result.tasks)).catch((error) => { setTasks([]); showError(error); });
    api<{ projects: Project[] }>('/api/projects').then((result) => setProjects(result.projects)).catch(() => {});
  }, [user, kind]);

  const shown = useMemo(() => (tasks ?? []).filter((task) => (!starredOnly || task.starred)
    && (!query || `${task.title} ${task.summary ?? ''}`.toLowerCase().includes(query.toLowerCase()))), [tasks, query, starredOnly]);

  const patch = async (task: Summary, change: Partial<Pick<Summary, 'starred' | 'project_id'>>) => {
    try {
      await api(`/api/history/${task.id}`, { method: 'PATCH', body: JSON.stringify(change) });
      setTasks((list) => list?.map((item) => (item.id === task.id ? { ...item, ...change } : item)) ?? null);
      if (change.project_id !== undefined) toast.success(change.project_id ? 'Moved to the project' : 'Removed from the project');
    } catch (error) {
      showError(error);
    }
  };
  const remove = async (task: Summary) => {
    if (!window.confirm(`Delete “${task.title}”? This cannot be undone.`)) return;
    try {
      await api(`/api/history/${task.id}`, { method: 'DELETE' });
      setTasks((list) => list?.filter((item) => item.id !== task.id) ?? null);
    } catch (error) {
      showError(error);
    }
  };
  const editable = projects.filter((project) => project.role === 'owner' || project.role === 'edit');

  return (
    <AppFrame wide title="History" subtitle="Every report, review, draft and analysis you ran. Reopen it, continue it, or move it into a project.">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-surface px-3">
          <LuSearch className="h-4 w-4 text-subtle" aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your history" aria-label="Search your history" className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
        </div>
        <select aria-label="Kind" value={kind} onChange={(event) => setKind(event.target.value)} className="h-10 rounded-xl border border-line bg-surface px-3 text-[14px]">
          <option value="">Everything</option>
          {Object.entries(KIND_LABELS).filter(([id]) => id !== 'papers').map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
        <label className="flex h-10 items-center gap-2 px-1 text-[14px] text-ink-2"><input type="checkbox" checked={starredOnly} onChange={(event) => setStarredOnly(event.target.checked)} className="h-4 w-4 accent-[var(--color-brand)]" />Starred</label>
      </div>

      {tasks === null && <p className="mt-6 text-[14px] text-muted">Loading…</p>}
      {tasks !== null && shown.length === 0 && (
        <Card className="mt-6 px-5 py-8 text-center">
          <p className="text-[15px] font-semibold">{tasks.length ? 'Nothing matches' : 'No history yet'}</p>
          <p className="mt-1 text-[14px] text-muted">{tasks.length ? 'Try other words or another kind.' : <>Start with a question on <Link href="/home" className="font-semibold text-brand hover:underline">Home</Link>.</>}</p>
        </Card>
      )}
      {shown.length > 0 && (
        <ul className="mt-5 divide-y divide-line-2 rounded-2xl border border-line bg-surface">
          {shown.map((task) => (
            <li key={task.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
              <button type="button" aria-label={task.starred ? 'Unstar' : 'Star'} aria-pressed={task.starred} onClick={() => patch(task, { starred: !task.starred })} className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg hover:bg-soft ${task.starred ? 'text-amber' : 'text-subtle'}`}>
                <LuStar className="h-4 w-4" fill={task.starred ? 'currentColor' : 'none'} />
              </button>
              <Link href={taskHref(task)} className="min-w-0 flex-1 basis-60">
                <span className="block truncate text-[15px] font-medium text-ink hover:underline">{task.title}</span>
                <span className="block truncate text-[13px] text-muted">
                  {[KIND_LABELS[task.kind] || task.kind, task.status === 'failed' ? 'did not finish' : task.status === 'running' ? 'running' : null, task.credits ? `${task.credits} credits` : null,
                    new Date(task.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })].filter(Boolean).join(' · ')}
                </span>
                {task.summary && <span className="mt-0.5 line-clamp-1 text-[13.5px] text-ink-2">{task.summary}</span>}
              </Link>
              {editable.length > 0 && (
                <select aria-label="Project" value={task.project_id ?? ''} onChange={(event) => patch(task, { project_id: event.target.value || null })} className="h-8 max-w-[180px] rounded-lg border border-line bg-surface px-2 text-[13px]">
                  <option value="">No project</option>
                  {editable.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
              )}
              <button type="button" aria-label={`Delete ${task.title}`} onClick={() => remove(task)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-subtle hover:bg-red-50 hover:text-red-700"><LuTrash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}
    </AppFrame>
  );
}

export default function Page() {
  return <Suspense fallback={null}><History /></Suspense>;
}
