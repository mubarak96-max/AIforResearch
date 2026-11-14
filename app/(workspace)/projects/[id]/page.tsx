'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { LuArrowRight, LuSparkles, LuTrash2, LuUserPlus, LuX } from 'react-icons/lu';
import { AppFrame } from '@/components/app/AppFrame';
import { Button, Card, inputClass, Segmented } from '@/components/app/ui';
import { useSignedIn } from '@/components/app/useSignedIn';
import { api } from '@/lib/session';
import { taskLabel, taskHref, type TaskRecord } from '@/components/app/research/handoff';
import { showError } from '@/components/app/research/parts';
import { ProjectEvidence } from '@/components/app/ProjectEvidence';
import { ProjectAttention } from '@/components/app/ProjectAttention';
import { ProjectHub, ProjectProgress } from '@/components/app/ProjectHub';

type Member = { email: string; name: string | null; role: 'edit' | 'comment' | 'view'; pending: boolean };
type Project = {
  id: string; name: string; description: string; role: 'owner' | 'edit' | 'comment' | 'view'; owner_email: string; members: Member[];
  tasks: (Omit<TaskRecord, 'inputs' | 'result'> & { summary: string | null })[];
};

const ROLES: [Member['role'], string, string][] = [
  ['comment', 'Can comment', 'Reads everything and comments: for supervisors'],
  ['edit', 'Can edit', 'Runs research and changes work: for co-authors'],
  ['view', 'Can view', 'Reads only'],
];

function ProjectPage() {
  const { user } = useSignedIn();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Member['role']>('comment');
  const [busy, setBusy] = useState(false);
  const params = useSearchParams();
  const [tab, setTab] = useState<'work' | 'progress'>(params.get('tab') === 'progress' ? 'progress' : 'work');
  const switchTab = (next: 'work' | 'progress') => { setTab(next); window.history.replaceState(null, '', next === 'progress' ? `/projects/${id}?tab=progress` : `/projects/${id}`); };

  const load = () => api<Project>(`/api/projects/${encodeURIComponent(id)}`).then(setProject).catch((error) => { showError(error); router.replace('/projects'); });
  useEffect(() => { if (user) load(); }, [user, id]); // eslint-disable-line react-hooks/exhaustive-deps

  const invite = async () => {
    if (!email.trim()) return;
    setBusy(true);
    try {
      await api(`/api/projects/${id}/members`, { method: 'POST', body: JSON.stringify({ email: email.trim(), role }) });
      toast.success(`Added ${email.trim()}. They get an email with the link.`);
      setEmail('');
      await load();
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  };
  const removeMember = async (member: Member) => {
    try {
      await api(`/api/projects/${id}/members/${encodeURIComponent(member.email)}`, { method: 'DELETE' });
      if (member.email.toLowerCase() === user?.email.toLowerCase()) router.replace('/projects');
      else await load();
    } catch (error) {
      showError(error);
    }
  };
  const remove = async () => {
    if (!project || !window.confirm(`Delete the project “${project.name}”? Its work stays in each person's History.`)) return;
    try {
      await api(`/api/projects/${id}`, { method: 'DELETE' });
      router.replace('/projects');
    } catch (error) {
      showError(error);
    }
  };

  if (!project) return <AppFrame title="Project"><p className="text-[14px] text-muted">Loading…</p></AppFrame>;
  const owner = project.role === 'owner';
  const canEdit = owner || project.role === 'edit';
  return (
    <AppFrame wide title={project.name} subtitle={project.description || undefined}
      actions={canEdit ? <Link href="/home?new=1" className="inline-flex h-[42px] items-center gap-2 rounded-[11px] bg-brand px-[18px] text-[15px] font-semibold text-on-brand shadow-brand"><LuSparkles className="h-4 w-4" />New research</Link> : undefined}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-labelledby="work-title">
          <div className="mb-4"><Segmented label="Project view" value={tab} onChange={switchTab} options={[{ value: 'work', label: 'Work' }, { value: 'progress', label: 'Progress' }]} /></div>
          {tab === 'progress' ? <><h2 id="work-title" className="text-[15px] font-bold">Progress</h2><ProjectProgress id={id} role={project.role} userId={user?.id ?? null} /></> : <>
          <ProjectAttention projectId={id} />
          <h2 id="work-title" className="text-[15px] font-bold">Work in this project</h2>
          {project.tasks.length === 0 ? (
            <Card className="mt-2.5 px-5 py-6 text-[14px] text-muted">Nothing yet. Move work here from <Link href="/history" className="font-semibold text-brand hover:underline">History</Link> (the project menu on each row).</Card>
          ) : (
            <ul className="mt-2.5 divide-y divide-line-2 rounded-2xl border border-line bg-surface">
              {project.tasks.map((task) => (
                <li key={task.id}>
                  <Link href={taskHref(task)} className="flex items-center gap-3 px-4 py-3 hover:bg-soft">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium text-ink">{task.title}</span>
                      <span className="text-[13px] text-muted">{taskLabel(task)} · {new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </span>
                    <LuArrowRight className="h-4 w-4 text-subtle" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <ProjectHub id={id} role={project.role} members={project.members} onChange={load} />
          <ProjectEvidence projectId={id} role={project.role} />
          </>}
        </section>
        <aside aria-labelledby="people-title">
          <Card className="p-4">
            <h2 id="people-title" className="text-[15px] font-bold">People</h2>
            <ul className="mt-2 space-y-2 text-[14px]">
              <li className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate">{project.owner_email}</span><span className="text-[13px] text-muted">Owner</span></li>
              {project.members.map((member) => (
                <li key={member.email} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate">{member.name || member.email}{member.pending && <span className="text-muted"> (invited)</span>}</span>
                  <span className="text-[13px] text-muted">{ROLES.find(([value]) => value === member.role)?.[1]}</span>
                  {(owner || member.email.toLowerCase() === user?.email.toLowerCase()) && (
                    <button type="button" aria-label={owner ? `Remove ${member.email}` : 'Leave this project'} onClick={() => removeMember(member)} className="grid h-7 w-7 place-items-center rounded-md text-subtle hover:bg-soft hover:text-ink"><LuX className="h-3.5 w-3.5" /></button>
                  )}
                </li>
              ))}
            </ul>
            {owner && (
              <form onSubmit={(event) => { event.preventDefault(); invite(); }} className="mt-4 grid gap-2 border-t border-line-2 pt-4">
                <label className="grid gap-1.5 text-[13.5px] font-semibold">Invite by email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="supervisor@university.edu" className={inputClass} /></label>
                <select aria-label="Role" value={role} onChange={(event) => setRole(event.target.value as Member['role'])} className={inputClass}>
                  {ROLES.map(([value, label, hint]) => <option key={value} value={value}>{label}: {hint}</option>)}
                </select>
                <Button variant="primary" type="submit" disabled={busy || !email.trim()}><LuUserPlus className="h-4 w-4" />Invite</Button>
              </form>
            )}
          </Card>
          {owner && <Button variant="danger" size="sm" className="mt-3" onClick={remove}><LuTrash2 className="h-4 w-4" />Delete project</Button>}
        </aside>
      </div>
    </AppFrame>
  );
}

export default function Page() {
  return <Suspense fallback={null}><ProjectPage /></Suspense>;
}
