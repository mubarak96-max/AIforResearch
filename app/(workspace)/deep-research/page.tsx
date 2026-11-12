'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LuPlus } from 'react-icons/lu';
import { AppFrame } from '@/components/app/AppFrame';
import { Button, Card } from '@/components/app/ui';
import { useSignedIn } from '@/components/app/useSignedIn';
import { api } from '@/lib/session';
import { AskComposer, type AskRequest } from '@/components/app/research/AskComposer';
import { ResearchView, type ResearchState } from '@/components/app/research/ResearchView';
import { postStream } from '@/components/app/research/stream';
import { creditsChanged, showError } from '@/components/app/research/parts';
import { PENDING_KEY, type TaskRecord } from '@/components/app/research/handoff';

const blank = (request: Partial<AskRequest> = {}): ResearchState => ({
  taskId: null, question: request.question ?? '', depth: request.depth ?? 'deep', groups: request.groups ?? ['papers'], status: null, markdown: '',
  sources: [], allSources: [], web: [], consensus: null, searched: null, followUps: [], running: false, error: null,
});

function fromTask(task: TaskRecord): ResearchState {
  const result = task.result ?? {};
  const all = (result.all_sources ?? []) as ResearchState['allSources'];
  return {
    taskId: task.id, question: String(task.inputs?.question ?? task.title), depth: String(task.inputs?.depth ?? task.module ?? 'deep'), groups: task.inputs?.groups ?? ['papers'],
    status: null, markdown: String(result.markdown ?? ''), sources: result.sources ?? [], allSources: all.filter((source) => source.kind !== 'web'),
    web: all.filter((source) => source.kind === 'web'), consensus: result.consensus ?? null, searched: result.searched ?? null,
    followUps: result.follow_ups ?? [], running: task.status === 'running', error: task.status === 'failed' ? task.error || 'This research did not finish.' : null,
  };
}

function DeepResearch() {
  const { user } = useSignedIn();
  const router = useRouter();
  const params = useSearchParams();
  const taskParam = params.get('task');
  const [state, setState] = useState<ResearchState | null>(null);
  const [recent, setRecent] = useState<TaskRecord[] | null>(null);
  const abort = useRef<AbortController | null>(null);

  const run = useCallback(async (request: AskRequest) => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setState({ ...blank(request), running: true, status: { stage: 'planning', detail: 'Starting' } });
    try {
      await postStream('/api/research', request, (event, data) => {
        setState((current) => {
          if (!current) return current;
          switch (event) {
            case 'task':
              window.history.replaceState(null, '', `/deep-research?task=${data.id}`);
              return { ...current, taskId: data.id };
            case 'status': return { ...current, status: data };
            case 'sources': return { ...current, allSources: data.sources, web: data.web, searched: { counts: data.counts, errors: data.errors, queries: data.queries } };
            case 'delta': return { ...current, markdown: current.markdown + data.text };
            case 'done': return { ...current, running: false, status: null, markdown: data.markdown, sources: data.sources, consensus: data.consensus, followUps: [] };
            case 'error': return { ...current, running: false, status: null, error: data.detail };
            default: return current;
          }
        });
      }, controller.signal);
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        showError(error);
        setState((current) => (current ? { ...current, running: false, status: null, error: (error as Error).message } : current));
      }
    } finally {
      setState((current) => (current?.running ? { ...current, running: false, status: null } : current));
      creditsChanged();
    }
  }, []);

  // A saved task (?task=), a question handed over from Home (?start=1), or a blank page.
  useEffect(() => {
    if (!user) return;
    if (params.get('start') === '1') {
      const raw = sessionStorage.getItem(PENDING_KEY);
      sessionStorage.removeItem(PENDING_KEY);
      if (raw) { run(JSON.parse(raw) as AskRequest); return; }
    }
    if (taskParam && state?.taskId !== taskParam) {
      api<TaskRecord>(`/api/history/${encodeURIComponent(taskParam)}`).then((task) => setState(fromTask(task))).catch((error) => { showError(error); router.replace('/deep-research'); });
      return;
    }
    if (!taskParam) {
      setState(null);
      api<{ tasks: TaskRecord[] }>('/api/history?kind=research&limit=12').then((result) => setRecent(result.tasks)).catch(() => setRecent([]));
    }
  }, [user, taskParam]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => abort.current?.abort(), []);

  if (state) {
    return (
      <AppFrame wide title={state.question || 'Deep Research'} actions={<Button onClick={() => { abort.current?.abort(); router.push('/deep-research'); }}><LuPlus className="h-4 w-4" />New research</Button>}>
        <ResearchView state={state} />
      </AppFrame>
    );
  }
  return (
    <AppFrame title="Deep Research" subtitle="Ask a question and get an answer built from real papers, every claim cited.">
      <AskComposer onSubmit={run} autoFocus initialQuestion={params.get('q') ?? ''} />
      <section aria-labelledby="recent-title" className="mt-10">
        <h2 id="recent-title" className="text-[17px] font-bold">Recent research</h2>
        {recent === null && <p className="mt-3 text-[14px] text-muted">Loading…</p>}
        {recent?.length === 0 && <Card className="mt-3 px-5 py-6 text-[14.5px] text-muted">Your research appears here, so you can reopen it, ask follow-ups and build on it.</Card>}
        <ul className="mt-3 divide-y divide-line-2 rounded-2xl border border-line">
          {recent?.map((task) => (
            <li key={task.id}>
              <Link href={`/deep-research?task=${task.id}`} className="flex items-baseline gap-3 px-4 py-3 hover:bg-soft">
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink">{task.title}</span>
                <span className="shrink-0 text-[13px] text-muted">{task.status === 'failed' ? 'Did not finish' : task.module}</span>
                <span className="shrink-0 text-[13px] text-muted">{new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </AppFrame>
  );
}

export default function Page() {
  return <Suspense fallback={null}><DeepResearch /></Suspense>;
}
