'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LuPlus } from 'react-icons/lu';
import { AppFrame } from '@/components/app/AppFrame';
import { Button, Segmented } from '@/components/app/ui';
import { useSignedIn } from '@/components/app/useSignedIn';
import { api } from '@/lib/session';
import { showError, type Source } from '@/components/app/research/parts';
import { loadFromTask, type TaskRecord } from '@/components/app/research/handoff';
import { ReviewerPanel, ReviewResultView, type ReviewResult } from '@/components/app/reviewer/ReviewerPanel';
import { ClaimResults, ClaimsPanel, type ClaimsResult } from '@/components/app/reviewer/ClaimsPanel';
import { CitationResults, CitationsPanel, type CitationsResult } from '@/components/app/reviewer/CitationsPanel';
import { GuidelineResults, GuidelinesPanel, type GuidelineResult } from '@/components/app/reviewer/GuidelinesPanel';

type Module = 'reviewer' | 'guidelines' | 'claims' | 'citations';
type Result = { module: 'reviewer'; data: ReviewResult } | { module: 'guidelines'; data: GuidelineResult } | { module: 'claims'; data: ClaimsResult } | { module: 'citations'; data: CitationsResult };

const MODULE_OF_KIND: Record<string, Module> = { review: 'reviewer', guideline_check: 'guidelines', claim_check: 'claims', citation_check: 'citations' };
const SUBTITLES: Record<Module, string> = {
  reviewer: 'A scorecard and comments on a thesis, proposal or manuscript, at your level.',
  guidelines: 'Check a manuscript against CONSORT, STROBE, PRISMA, CARE, STARD, COREQ, SRQR or SQUIRE, item by item.',
  claims: 'See which papers support each claim, and how strong the evidence is.',
  citations: 'Check that every reference exists, is not retracted and has the right details.',
};

function Reviewer() {
  const { user } = useSignedIn();
  const router = useRouter();
  const params = useSearchParams();
  const requested = params.get('module');
  const [module, setModule] = useState<Module>(requested === 'claims' || requested === 'citations' || requested === 'guidelines' ? requested : 'reviewer');
  const [result, setResult] = useState<Result | null>(null);
  const [fromSources, setFromSources] = useState<Source[] | null>(null);
  const [fromText, setFromText] = useState('');
  const taskId = params.get('task');

  useEffect(() => {
    if (!user) return;
    if (taskId) {
      api<TaskRecord>(`/api/history/${encodeURIComponent(taskId)}`).then((task) => {
        const kind = MODULE_OF_KIND[task.kind];
        if (!kind || !task.result) throw new Error(task.status === 'failed' ? task.error || 'This check did not finish.' : 'This check is still running.');
        setModule(kind);
        setResult({ module: kind, data: { ...task.result, task_id: task.id } } as Result);
      }).catch((error) => { showError(error); router.replace('/reviewer'); });
      return;
    }
    const from = params.get('from');
    if (from) loadFromTask(from).then((loaded) => { if (loaded) { setFromSources(loaded.sources); setFromText(loaded.markdown.replace(/\[S\d+(?:[,\s]*S?\d+)*\]/g, '').slice(0, 4000)); } });
  }, [user, taskId]); // eslint-disable-line react-hooks/exhaustive-deps

  const done = (next: Result) => {
    setResult(next);
    if (next.data.task_id) window.history.replaceState(null, '', `/reviewer?task=${next.data.task_id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const switchTo = (next: Module) => {
    setModule(next);
    setResult(null);
    window.history.replaceState(null, '', next === 'reviewer' ? '/reviewer' : `/reviewer?module=${next}`);
  };

  return (
    <AppFrame wide={Boolean(result)} title="Reviewer" subtitle={SUBTITLES[module]}
      actions={result ? <Button onClick={() => { setResult(null); router.replace(module === 'reviewer' ? '/reviewer' : `/reviewer?module=${module}`); }}><LuPlus className="h-4 w-4" />New check</Button> : null}>
      <div className="mb-5">
        <Segmented label="Module" value={module} onChange={switchTo} options={[{ value: 'reviewer', label: 'Reviewer' }, { value: 'guidelines', label: 'Guideline check' }, { value: 'claims', label: 'Claim check' }, { value: 'citations', label: 'Citation check' }]} />
      </div>
      {result?.module === 'reviewer' && <ReviewResultView result={result.data} />}
      {result?.module === 'guidelines' && <GuidelineResults result={result.data} />}
      {result?.module === 'claims' && <ClaimResults result={result.data} />}
      {result?.module === 'citations' && (
        <div>
          <p className="text-[15px] font-semibold text-ink">{result.data.summary}</p>
          <CitationResults checks={result.data.checks} counts={result.data.counts} />
        </div>
      )}
      {!result && module === 'reviewer' && <ReviewerPanel onDone={(data) => done({ module: 'reviewer', data })} />}
      {!result && module === 'guidelines' && <GuidelinesPanel onDone={(data) => done({ module: 'guidelines', data })} />}
      {!result && module === 'claims' && <ClaimsPanel initialText={fromText} onDone={(data) => done({ module: 'claims', data })} />}
      {!result && module === 'citations' && <CitationsPanel fromSourcesList={fromSources} onDone={(data) => done({ module: 'citations', data })} />}
      {!result && (
        <p className="mt-4 text-[13px] leading-relaxed text-muted">
          The review is AI-written from your text and is a second reader, not a grade. Check each comment against your guidelines and your supervisor’s advice.
        </p>
      )}
    </AppFrame>
  );
}

export default function Page() {
  return <Suspense fallback={null}><Reviewer /></Suspense>;
}
