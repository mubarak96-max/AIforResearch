'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LuPlus } from 'react-icons/lu';
import { AppFrame } from '@/components/app/AppFrame';
import { Button, Card, EmptyState, StatusPill, inputClass } from '@/components/app/ui';
import { useSignedIn } from '@/components/app/useSignedIn';
import { showError } from '@/components/app/research/parts';
import { api } from '@/lib/session';
import { INSTRUMENTS, instrument, instrumentBlock } from '@/lib/surveyInstruments';
import { emptySurvey } from '@/lib/surveyModel';

type Summary = { id: string; title: string; status: 'draft' | 'open' | 'closed'; response_count: number; questions: number; scales: number; updated_at: string; project_id: string | null };
const STATUS = { draft: { label: 'Draft', tone: 'neutral' }, open: { label: 'Collecting', tone: 'positive' }, closed: { label: 'Closed', tone: 'warning' } } as const;

function Surveys() {
  const { user } = useSignedIn();
  const router = useRouter();
  const params = useSearchParams();
  const [surveys, setSurveys] = useState<Summary[] | null>(null);
  const [title, setTitle] = useState('');
  const [start, setStart] = useState<string>('blank');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    api<{ surveys: Summary[] }>('/api/surveys').then((result) => setSurveys(result.surveys)).catch((error) => { setSurveys([]); showError(error); });
  }, [user]);

  const create = async () => {
    setBusy(true);
    try {
      const name = title.trim() || (start !== 'blank' ? `${instrument(start)!.full} survey` : 'Untitled survey');
      const definition = emptySurvey(name);
      if (start !== 'blank') {
        let n = 0;
        const block = instrumentBlock(instrument(start)!, new Set(), () => `i${Date.now().toString(36)}${n++}`);
        definition.sections = [block.section];
        definition.scales = [block.scale];
      }
      const result = await api<{ id: string }>('/api/surveys', { method: 'POST', body: JSON.stringify({ title: name, definition, project_id: params.get('project') }) });
      router.push(`/surveys/${result.id}`);
    } catch (error) { showError(error); setBusy(false); }
  };

  return (
    <AppFrame title="Surveys" subtitle="Build a questionnaire with validated scales, collect anonymous responses, then score and analyse them in Data Lab.">
      <Card className="p-5">
        <h2 className="text-[16px] font-bold">New survey</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Title, e.g. Sleep and stress in first-year students" aria-label="Survey title" className={inputClass} />
          <select value={start} onChange={(event) => setStart(event.target.value)} aria-label="Start from" className={inputClass}>
            <option value="blank">Start blank</option>
            {INSTRUMENTS.map((item) => <option key={item.id} value={item.id}>Start with {item.name}: {item.measures.toLowerCase()}</option>)}
          </select>
          <Button variant="primary" onClick={create} disabled={busy}><LuPlus className="h-4 w-4" />Create</Button>
        </div>
        <p className="mt-2 text-[13px] text-muted">You can add more validated scales, write your own questions or have AI draft them from your aims. Responses are anonymous; nothing is published until you open the survey.</p>
      </Card>
      <div className="mt-6">
        {surveys === null ? <p className="text-[14px] text-muted">Loading…</p> : !surveys.length ? (
          <EmptyState title="No surveys yet">Questionnaires for theses, evaluations, needs assessments and course feedback. Start with a validated scale such as PHQ-9, GAD-7 or the System Usability Scale.</EmptyState>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {surveys.map((survey) => (
              <li key={survey.id}>
                <Link href={`/surveys/${survey.id}`} className="block rounded-2xl border border-line bg-surface p-5 hover:bg-soft">
                  <p className="font-bold text-ink">{survey.title}</p>
                  <p className="mt-1 text-[13.5px] text-muted">{survey.questions} question{survey.questions === 1 ? '' : 's'}{survey.scales ? ` · ${survey.scales} scored scale${survey.scales === 1 ? '' : 's'}` : ''} · {survey.response_count} response{survey.response_count === 1 ? '' : 's'}</p>
                  <div className="mt-3 flex items-center gap-2"><StatusPill tone={STATUS[survey.status].tone}>{STATUS[survey.status].label}</StatusPill>{survey.project_id && <StatusPill tone="brand">Project</StatusPill>}<span className="text-[12.5px] text-subtle">Updated {new Date(survey.updated_at).toLocaleDateString()}</span></div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppFrame>
  );
}

export default function Page() {
  return <Suspense fallback={null}><Surveys /></Suspense>;
}
