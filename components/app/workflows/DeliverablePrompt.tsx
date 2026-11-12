'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, inputClass } from '@/components/app/ui';
import { useSignedIn } from '@/components/app/useSignedIn';
import { api } from '@/lib/session';
import { DELIVERABLES } from '@/lib/deliverables';
import type { Workbook, WorkflowKind } from '@/lib/workflows';

const labelClass = 'grid gap-1.5 text-sm font-semibold';
const wide = `${labelClass} sm:col-span-2`;
const area = `${inputClass} h-auto py-3`;
type Details = {
  title: string; question: string; audience: string; success_criteria: string; source_constraints: string;
  language: string; deadline: string; project_id: string;
};

/** The one way to create a workbook: describe the deliverable, and the workbook type follows from it. */
export function DeliverablePrompt({ kinds, defaultOpen = false, projectId = '' }: { kinds: WorkflowKind[]; defaultOpen?: boolean; projectId?: string }) {
  const { user } = useSignedIn();
  const router = useRouter();
  const options = DELIVERABLES.filter((item) => kinds.includes(item.kind));
  const [open, setOpen] = useState(defaultOpen);
  const [task, setTask] = useState(options[0]?.id ?? '');
  const [details, setDetails] = useState<Details>({
    title: '', question: '', audience: '', success_criteria: '', source_constraints: '', language: '', deadline: '', project_id: projectId,
  });
  const [projects, setProjects] = useState<{ id: string; name: string; role: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const selected = options.find((item) => item.id === task) ?? options[0];
  const set = (key: keyof Details) => (event: { target: { value: string } }) => setDetails({ ...details, [key]: event.target.value });

  useEffect(() => {
    if (!open || !user) return;
    let alive = true;
    api<{ projects: typeof projects }>('/api/projects')
      .then((result) => { if (alive) setProjects(result.projects); })
      .catch((e) => { if (alive) setError((e as Error).message); });
    return () => { alive = false; };
  }, [open, user]);

  const create = async () => {
    if (!selected) return;
    setBusy(true); setError('');
    try {
      const body = { ...details, kind: selected.kind, deliverable: selected.label, project_id: details.project_id || null };
      const workbook = await api<Workbook>('/api/workbooks', { method: 'POST', body: JSON.stringify(body) });
      router.push(`/workbooks/${workbook.id}`);
    } catch (e) { setError((e as Error).message); setBusy(false); }
  };

  if (!selected) return null;
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-bold">Plan a deliverable</h2>
          <p className="mt-1 text-sm text-muted">Say what you need to finish, who it is for and what counts as done. The workbook keeps the evidence for it.</p>
        </div>
        <Button onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="deliverable-form">{open ? 'Close' : 'New workbook'}</Button>
      </div>
      {open && (
        <form id="deliverable-form" onSubmit={(e) => { e.preventDefault(); void create(); }} className="mt-5">
          {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
            <legend className="sr-only">Your deliverable brief</legend>
            <label className={wide}>
              What do you need to finish?
              <select className={inputClass} value={selected.id} onChange={(e) => setTask(e.target.value)}>
                {options.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
              <span className="font-normal leading-relaxed text-muted">{selected.description}</span>
            </label>
            <label className={wide}>Title<input required maxLength={200} className={inputClass} value={details.title} onChange={set('title')} /></label>
            <label className={wide}>Question or task<textarea required rows={2} maxLength={5000} className={area} value={details.question} onChange={set('question')} /></label>
            <label className={wide}>
              Who will use or review this work?
              <input required maxLength={1000} className={inputClass} value={details.audience} onChange={set('audience')} placeholder="For example: your supervisor, a journal club or a research team" />
            </label>
            <label className={labelClass}>Deadline (optional)<input type="date" className={inputClass} value={details.deadline} onChange={set('deadline')} /></label>
            <label className={labelClass}>Working language (optional)<input maxLength={100} className={inputClass} value={details.language} onChange={set('language')} placeholder="Any language" /></label>
            <label className={wide}>
              Sources and scope
              <textarea rows={2} maxLength={5000} className={area} value={details.source_constraints} onChange={set('source_constraints')} placeholder={selected.sources} />
              <span className="font-normal text-muted">Inside the workbook you can import from your Library or a systematic review.</span>
            </label>
            <label className={wide}>
              What would make this successful?
              <textarea required rows={2} maxLength={5000} className={area} value={details.success_criteria} onChange={set('success_criteria')} placeholder={selected.criteria} />
            </label>
            <label className={wide}>
              Sharing
              <select className={inputClass} value={details.project_id} onChange={set('project_id')}>
                <option value="">Private workbook</option>
                {projects.filter((p) => ['owner', 'edit'].includes(p.role)).map((p) => <option key={p.id} value={p.id}>{p.name} — shared with project members</option>)}
              </select>
              <span className="font-normal text-muted">Project members can read the brief and the sources added to a shared workbook.</span>
            </label>
            <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
              <Button type="submit" variant="primary" disabled={busy}>{busy ? 'Creating…' : 'Create workbook'}</Button>
              <span className="text-sm text-muted">No credits to plan and save your work.</span>
            </div>
          </fieldset>
        </form>
      )}
    </Card>
  );
}
