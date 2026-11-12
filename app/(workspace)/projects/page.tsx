'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LuFolderPlus, LuUsers } from 'react-icons/lu';
import { AppFrame } from '@/components/app/AppFrame';
import { Button, Card, inputClass } from '@/components/app/ui';
import { useSignedIn } from '@/components/app/useSignedIn';
import { api } from '@/lib/session';
import { showError } from '@/components/app/research/parts';

type ProjectInfo = {
  id: string; name: string; description: string; role: 'owner' | 'edit' | 'comment' | 'view'; owner_email: string;
  members: { email: string; name: string | null; role: string; pending: boolean }[]; created_at: string; updated_at: string;
};

const ROLE_LABEL: Record<string, string> = { owner: 'Owner', edit: 'Can edit', comment: 'Can comment', view: 'Can view' };

function Projects() {
  const { user } = useSignedIn();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectInfo[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    api<{ projects: ProjectInfo[] }>('/api/projects').then((result) => setProjects(result.projects)).catch((error) => { setProjects([]); showError(error); });
  }, [user]);

  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const project = await api<ProjectInfo>('/api/projects', { method: 'POST', body: JSON.stringify({ name: name.trim(), description }) });
      router.push(`/projects/${project.id}`);
    } catch (error) {
      showError(error);
      setBusy(false);
    }
  };

  return (
    <AppFrame wide title="Projects" subtitle="Keep a thesis, a review or a grant in one place, and share it with your supervisor or co-authors."
      actions={<Button variant="primary" onClick={() => setCreating(true)}><LuFolderPlus className="h-4 w-4" />New project</Button>}>
      {creating && (
        <Card className="mb-5 p-5">
          <form onSubmit={(event) => { event.preventDefault(); create(); }} className="grid gap-3">
            <label className="grid gap-1.5 text-[14px] font-semibold">Name<input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={120} placeholder="MSc thesis: sleep and memory" className={inputClass} /></label>
            <label className="grid gap-1.5 text-[14px] font-semibold">What it is about (optional)<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} rows={2} className={`${inputClass} h-auto py-2`} /></label>
            <div className="flex gap-2"><Button variant="primary" type="submit" disabled={busy || !name.trim()}>Create project</Button><Button onClick={() => setCreating(false)}>Cancel</Button></div>
          </form>
        </Card>
      )}
      {projects === null && <p className="text-[14px] text-muted">Loading…</p>}
      {projects?.length === 0 && !creating && (
        <Card className="px-5 py-8 text-center">
          <p className="text-[15px] font-semibold">No projects yet</p>
          <p className="mx-auto mt-1 max-w-md text-[14px] text-muted">A project holds its research, reviews and drafts together. Invite people by email to view, comment on or edit it.</p>
          <Button variant="primary" className="mt-4" onClick={() => setCreating(true)}><LuFolderPlus className="h-4 w-4" />New project</Button>
        </Card>
      )}
      {projects && projects.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`} className="rounded-2xl border border-line bg-surface px-5 py-4 transition-colors hover:border-brand-100 hover:bg-soft">
              <p className="text-[16px] font-semibold text-ink">{project.name}</p>
              {project.description && <p className="mt-1 line-clamp-2 text-[14px] text-muted">{project.description}</p>}
              <p className="mt-3 flex items-center gap-1.5 text-[13px] text-muted">
                <LuUsers className="h-3.5 w-3.5" aria-hidden="true" />{project.members.length + 1} {project.members.length ? 'people' : 'person'} · {ROLE_LABEL[project.role]}
              </p>
            </Link>
          ))}
        </div>
      )}
    </AppFrame>
  );
}

export default function Page() {
  return <Suspense fallback={null}><Projects /></Suspense>;
}
