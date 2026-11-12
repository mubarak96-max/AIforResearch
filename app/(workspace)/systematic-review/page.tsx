'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LuListChecks, LuPlus } from 'react-icons/lu';
import { AppFrame } from '@/components/app/AppFrame';
import { Button, Card, EmptyState, inputClass } from '@/components/app/ui';
import { useSignedIn } from '@/components/app/useSignedIn';
import { api } from '@/lib/session';
import { showError } from '@/components/app/research/parts';
import { loadFromTask, type TaskRecord } from '@/components/app/research/handoff';
import { DEFAULT_FRAMEWORK, FRAMEWORK_FIELDS, REVIEW_TYPE_OPTIONS } from '@/components/app/systematic-review/types';

type ReviewSummary = { id: string; title: string; question: string; review_type: string; project_id: string | null; searches: number; updated_at: string; owned: boolean };
type ProjectOption = { id: string; name: string; role: string };

const lines = (text: string) => text.split('\n').map((line) => line.trim()).filter(Boolean);

function NewReview({ fromTask, initialQuestion, onClose }: { fromTask: string | null; initialQuestion: string; onClose: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState(initialQuestion.slice(0, 120));
  const [question, setQuestion] = useState(initialQuestion);
  const [type, setType] = useState('systematic');
  const [framework, setFramework] = useState<'PICO' | 'PCC' | 'SPIDER'>('PICO');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [include, setInclude] = useState('');
  const [exclude, setExclude] = useState('');
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [project, setProject] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { api<{ projects: ProjectOption[] }>('/api/projects').then((result) => setProjects(result.projects.filter((item) => item.role === 'owner' || item.role === 'edit'))).catch(() => {}); }, []);
  useEffect(() => { if (initialQuestion) { setQuestion(initialQuestion); setTitle(initialQuestion.slice(0, 120)); } }, [initialQuestion]);

  const create = async () => {
    setBusy(true);
    try {
      const result = await api<{ id: string }>('/api/systematic-reviews', {
        method: 'POST',
        body: JSON.stringify({ title, question, review_type: type, framework, framework_fields: fields, include_criteria: lines(include), exclude_criteria: lines(exclude), project_id: project || null, from_task_id: fromTask }),
      });
      router.push(`/systematic-review/${result.id}`);
    } catch (error) {
      showError(error);
      setBusy(false);
    }
  };
  const label = 'mb-1.5 block text-[13.5px] font-semibold text-ink-2';
  return (
    <Card className="mb-6 p-5">
      <h2 className="text-[17px] font-bold">New review</h2>
      {fromTask && <p className="mt-1 text-[14px] text-muted">The papers from your research result are added as the first records.</p>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2"><span className={label}>Title</span><input value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} placeholder="Napping and alertness in shift workers" /></label>
        <label className="sm:col-span-2"><span className={label}>Review question</span><textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows={2} className={`${inputClass} h-auto py-2.5`} placeholder="In adult shift workers, does a planned nap during the night shift improve alertness compared with no nap?" /></label>
        <label><span className={label}>Type of review</span>
          <select value={type} onChange={(event) => { setType(event.target.value); setFramework(DEFAULT_FRAMEWORK[event.target.value] ?? 'PICO'); }} className={inputClass}>
            {REVIEW_TYPE_OPTIONS.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </label>
        <label><span className={label}>Framework</span>
          <select value={framework} onChange={(event) => setFramework(event.target.value as typeof framework)} className={inputClass}>
            <option value="PICO">PICO (population, intervention, comparison, outcomes)</option>
            <option value="PCC">PCC (population, concept, context)</option>
            <option value="SPIDER">SPIDER (qualitative)</option>
          </select>
        </label>
        {FRAMEWORK_FIELDS[framework].map(([key, name]) => (
          <label key={key}><span className={label}>{name}</span><input value={fields[key] ?? ''} onChange={(event) => setFields({ ...fields, [key]: event.target.value })} className={inputClass} /></label>
        ))}
        <label><span className={label}>Include when (one per line)</span><textarea value={include} onChange={(event) => setInclude(event.target.value)} rows={4} className={`${inputClass} h-auto py-2.5`} placeholder={'Adults working night shifts\nRandomized or controlled studies'} /></label>
        <label><span className={label}>Exclude when (one per line)</span><textarea value={exclude} onChange={(event) => setExclude(event.target.value)} rows={4} className={`${inputClass} h-auto py-2.5`} placeholder={'Animal studies\nConference abstracts only'} /></label>
        {projects.length > 0 && (
          <label className="sm:col-span-2"><span className={label}>Project (optional: editors on the project screen as second reviewers)</span>
            <select value={project} onChange={(event) => setProject(event.target.value)} className={inputClass}>
              <option value="">No project: I screen alone</option>
              {projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
        )}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={busy || !title.trim()} onClick={create}>{busy ? 'Creating…' : 'Create review'}</Button>
      </div>
    </Card>
  );
}

function Reviews() {
  const { user } = useSignedIn();
  const router = useRouter();
  const params = useSearchParams();
  const [reviews, setReviews] = useState<ReviewSummary[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [fromTask, setFromTask] = useState<string | null>(null);
  const [question, setQuestion] = useState('');

  useEffect(() => {
    if (!user) return;
    const task = params.get('task');
    if (task) {
      api<TaskRecord>(`/api/history/${encodeURIComponent(task)}`).then((record) => {
        if (record.inputs?.review_id) router.replace(`/systematic-review/${record.inputs.review_id}`);
      }).catch(showError);
      return;
    }
    const from = params.get('from');
    if (from) {
      setFromTask(from);
      setCreating(true);
      loadFromTask(from).then((found) => { if (found) setQuestion(found.topic); }).catch(() => {});
    }
    api<{ reviews: ReviewSummary[] }>('/api/systematic-reviews').then((result) => setReviews(result.reviews)).catch((error) => { setReviews([]); showError(error); });
  }, [user, params, router]);

  return (
    <AppFrame title="Systematic Review" wide subtitle="Protocol, searches, two-reviewer screening, extraction and the PRISMA flow, in one place."
      actions={!creating ? <Button variant="primary" onClick={() => setCreating(true)}><LuPlus className="h-4 w-4" />New review</Button> : null}>
      {creating && <NewReview fromTask={fromTask} initialQuestion={question} onClose={() => { setCreating(false); setFromTask(null); }} />}
      {reviews === null && <p className="text-[14px] text-muted">Loading…</p>}
      {reviews?.length === 0 && !creating && (
        <Card>
          <EmptyState title="No reviews yet" action={<Button variant="primary" onClick={() => setCreating(true)}><LuPlus className="h-4 w-4" />New review</Button>}>
            Set your question and criteria, search PubMed, Europe PMC and OpenAlex or upload your Scopus and Web of Science exports, then screen, extract and report.
          </EmptyState>
        </Card>
      )}
      {reviews && reviews.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {reviews.map((review) => (
            <li key={review.id}>
              <Link href={`/systematic-review/${review.id}`} className="flex h-full gap-3 rounded-2xl border border-line bg-surface px-5 py-4 hover:border-brand-100 hover:bg-soft">
                <LuListChecks className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-[16px] font-semibold text-ink">{review.title}</span>
                  {review.question && <span className="mt-0.5 line-clamp-2 block text-[14px] text-muted">{review.question}</span>}
                  <span className="mt-1.5 block text-[13px] text-muted">
                    {REVIEW_TYPE_OPTIONS.find(([id]) => id === review.review_type)?.[1]} · {review.searches} search{review.searches === 1 ? '' : 'es'}{review.owned ? '' : ' · shared with you'}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppFrame>
  );
}

export default function Page() {
  return <Suspense fallback={null}><Reviews /></Suspense>;
}
