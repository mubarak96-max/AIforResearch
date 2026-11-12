'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LuPlus } from 'react-icons/lu';
import { AppFrame } from '@/components/app/AppFrame';
import { Button, Card } from '@/components/app/ui';
import { useSignedIn } from '@/components/app/useSignedIn';
import { api } from '@/lib/session';
import { AskComposer, askCredits, type AskRequest } from '@/components/app/research/AskComposer';
import { PlanReview, applyStep, type StepView, type SubQuestion } from '@/components/app/research/ResearchSteps';
import { ResearchView, type ResearchState } from '@/components/app/research/ResearchView';
import { postStream, watchResearchTask } from '@/components/app/research/stream';
import { creditsChanged, showError } from '@/components/app/research/parts';
import { PENDING_KEY, type TaskRecord } from '@/components/app/research/handoff';

const blank = (request: Partial<AskRequest> = {}): ResearchState => ({
  taskId: null, question: request.question ?? '', depth: request.depth ?? 'deep', groups: request.groups ?? ['papers'], steps: [], markdown: '', figures: [],
  sources: [], allSources: [], web: [], consensus: null, searched: null, followUps: [], running: false, error: null, request,
});

function fromTask(task: TaskRecord): ResearchState {
  const result = task.result ?? {};
  const all = (result.all_sources ?? []) as ResearchState['allSources'];
  return {
    taskId: task.id, question: String(task.inputs?.question ?? task.title), depth: String(task.inputs?.depth ?? task.module ?? 'deep'), groups: task.inputs?.groups ?? ['papers'],
    steps: (result.steps ?? []) as StepView[], verification: result.verification ?? null,
    markdown: String(result.markdown ?? ''), figures: result.figures ?? [], sources: result.sources ?? [], allSources: all.filter((source) => source.kind !== 'web'),
    web: all.filter((source) => source.kind === 'web'), consensus: result.consensus ?? null, searched: result.searched ?? null,
    followUps: result.follow_ups ?? [], headedCopy: typeof result.markdown_headed === 'string', running: task.status === 'running', error: task.status === 'failed' ? task.error || 'This research did not finish.' : null,
    request: task.inputs ? {
      question: task.inputs.question, depth: task.inputs.depth, groups: task.inputs.groups, filters: task.inputs.filters ?? {},
      headings: task.inputs.headings, high_quality: task.inputs.high_quality, role: task.inputs.role ?? null,
      method: task.inputs.method ?? 'general', search_languages: task.inputs.search_languages ?? [],
      language: task.inputs.language ?? undefined, project_id: task.project_id ?? undefined,
      library_document_ids: task.inputs.library_document_ids ?? [],
    } : undefined,
  };
}

/** The person's choice of background mode is remembered per browser; it is off unless they turn it on. */
const BACKGROUND_KEY = 'research.background';
function readBackgroundChoice(): boolean {
  try { return localStorage.getItem(BACKGROUND_KEY) === '1'; } catch { return false; }
}
function saveBackgroundChoice(on: boolean) {
  try { localStorage.setItem(BACKGROUND_KEY, on ? '1' : '0'); } catch { /* storage blocked: the choice lasts this visit */ }
}

function BackgroundChoice({ checked, onChange }: { checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className="mt-3 flex items-start gap-2 text-[14px] text-muted">
      <input type="checkbox" className="mt-1" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>
        <span className="font-medium text-ink">Run in the background.</span>{' '}
        The report keeps going if you close the tab and you reopen it from History. Progress updates every few seconds
        instead of streaming live.
      </span>
    </label>
  );
}

function DeepResearch() {
  const { user } = useSignedIn();
  const router = useRouter();
  const params = useSearchParams();
  const taskParam = params.get('task');
  const [state, setState] = useState<ResearchState | null>(null);
  const [background, setBackground] = useState(false);
  /** Whether this server offers background runs, and whether the person chose one. */
  const [backgroundAvailable, setBackgroundAvailable] = useState(false);
  const [preferBackground, setPreferBackground] = useState(false);
  const [connectionNotice, setConnectionNotice] = useState('');
  const [recent, setRecent] = useState<TaskRecord[] | null>(null);
  /** A Detailed report waiting on its plan review (plan null while it is being planned). */
  const [review, setReview] = useState<{ request: AskRequest; plan: SubQuestion[] | null } | null>(null);
  /** What was asked before the plan review was cancelled, so the question is not lost. */
  const [draft, setDraft] = useState<AskRequest | null>(null);
  const abort = useRef<AbortController | null>(null);
  const handedOff = useRef(false);
  const mounted = useRef(false);
  const userId = user?.id ?? null;

  const run = useCallback(async (request: AskRequest) => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    // Detailed: show the plan first; credits are spent only when the person starts it.
    if (request.depth === 'detailed' && !request.plan) {
      setState(null);
      setReview({ request, plan: null });
      try {
        const plan = await api<{ sub_questions: SubQuestion[] }>('/api/research/plan', { method: 'POST', body: JSON.stringify({ question: request.question, depth: request.depth, method: request.method, search_languages: request.search_languages }), signal: controller.signal });
        setReview((current) => (current?.request === request ? { request, plan: plan.sub_questions } : current));
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        showError(error);
        setReview(null);
      }
      return;
    }
    setReview(null);
    setConnectionNotice('');
    setState({ ...blank(request), running: true, steps: [{ id: 'plan', state: 'active', detail: 'Starting', data: null, ms: null }] });
    try {
      const capabilities = await api<{ background_research?: boolean }>('/api/sources/groups', { signal: controller.signal });
      // Live streaming stays the default; background mode is used only when offered and chosen.
      const inBackground = Boolean(capabilities.background_research) && readBackgroundChoice();
      setBackground(inBackground);
      await postStream('/api/research', { ...request, background: inBackground }, (event, data) => {
        // Outside the state updater: Next.js turns replaceState into a router update (taskParam).
        if (event === 'task') window.history.replaceState(null, '', `/deep-research?task=${data.id}`);
        if (event === 'watch_status') setConnectionNotice(data.message || '');
        setState((current) => {
          if (!current) return current;
          switch (event) {
            case 'snapshot': return fromTask(data);
            case 'task': return { ...current, taskId: data.id };
            case 'step': return { ...current, steps: applyStep(current.steps, data) };
            case 'sources': return { ...current, allSources: data.sources, web: data.web, searched: { counts: data.counts, errors: data.errors, queries: data.queries } };
            case 'figures': return { ...current, figures: data.figures };
            case 'delta': return { ...current, markdown: current.markdown + data.text };
            case 'markdown': return { ...current, markdown: data.text };
            case 'done': return {
              ...current, running: false, markdown: data.markdown, figures: data.figures ?? current.figures, headedCopy: typeof data.markdown_headed === 'string', sources: data.sources, consensus: data.consensus, followUps: [],
              steps: data.steps ?? current.steps, verification: data.verification ?? null,
              allSources: (data.all_sources ?? []).filter((source: { kind: string }) => source.kind !== 'web'),
            };
            case 'error': return { ...current, running: false, error: data.detail };
            default: return current;
          }
        });
      }, controller.signal);
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        showError(error);
        setState((current) => (current ? { ...current, running: false, error: (error as Error).message } : current));
      }
    } finally {
      setState((current) => (current?.running ? { ...current, running: false } : current));
      creditsChanged();
    }
  }, []);

  // A saved task (?task=), a question handed over from Home (?start=1), or a blank page.
  // Keyed on the user's id, not the session object: the session re-reads the user (a new object)
  // when Firebase reloads the profile, and a re-run here must not reset a run in progress.
  useEffect(() => {
    if (!userId) return;
    if (params.get('start') === '1') {
      if (handedOff.current) return;
      handedOff.current = true;
      let request: AskRequest | null = null;
      try {
        const raw = sessionStorage.getItem(PENDING_KEY);
        sessionStorage.removeItem(PENDING_KEY);
        request = raw ? (JSON.parse(raw) as AskRequest) : null;
      } catch { /* storage blocked or a broken handoff: open empty */ }
      if (request) { run(request); return; }
      router.replace('/deep-research');
      return;
    }
    if (taskParam && state?.taskId !== taskParam) {
      api<TaskRecord>(`/api/history/${encodeURIComponent(taskParam)}`).then((task) => {
        setState(fromTask(task));
        setBackground(Boolean(task.inputs?.background));
        if (task.status === 'running' && task.inputs?.background) {
          const controller = new AbortController();
          abort.current = controller;
          watchResearchTask(task.id, (event, data) => { if (event === 'snapshot') setState(fromTask(data)); if (event === 'watch_status') setConnectionNotice(data.message || ''); }, controller.signal)
            .catch((error) => { if (error.name !== 'AbortError') showError(error); });
        }
      }).catch((error) => { showError(error); router.replace('/deep-research'); });
      return;
    }
    if (!taskParam) {
      setState(null);
      setReview(null);
      api<{ tasks: TaskRecord[] }>('/api/history?kind=research&limit=12').then((result) => setRecent(result.tasks)).catch(() => setRecent([]));
    }
  }, [userId, taskParam]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!userId) return;
    setPreferBackground(readBackgroundChoice());
    api<{ background_research?: boolean }>('/api/sources/groups')
      .then((capabilities) => setBackgroundAvailable(Boolean(capabilities.background_research)))
      .catch(() => setBackgroundAvailable(false));
  }, [userId]);
  // Stop the stream on a real unmount only: Strict Mode's mount-unmount-mount in development
  // would otherwise abort the run the handoff just started.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const controller = abort.current;
      setTimeout(() => { if (!mounted.current) controller?.abort(); }, 0);
    };
  }, []);

  if (review && !state) {
    return (
      <AppFrame title="Deep Research" subtitle="A Detailed report: review the plan, then start.">
        <PlanReview question={review.request.question} plan={review.plan} credits={askCredits(review.request.depth, review.request.high_quality)}
          onStart={(subs) => run({ ...review.request, plan: { sub_questions: subs } })}
          onCancel={() => { abort.current?.abort(); setDraft(review.request); setReview(null); }} />
      </AppFrame>
    );
  }
  const cancelBackground = async () => {
    if (!state?.taskId) return;
    try {
      await api(`/api/research/${state.taskId}/cancel`, { method: 'POST' });
      setState(fromTask(await api<TaskRecord>(`/api/history/${state.taskId}`)));
    } catch (error) { showError(error); }
  };
  if (state) {
    return (
      <AppFrame wide title={state.question || 'Deep Research'} actions={<Button onClick={() => { abort.current?.abort(); router.push('/deep-research'); }}><LuPlus className="h-4 w-4" />New research</Button>}>
        {connectionNotice && <p role="status" className="mb-3 text-sm text-muted">{connectionNotice}</p>}
        {background && state.running && <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-soft p-4 text-sm" role="status">
          <p>This research is saved and continues if you close the tab. Reopen it from History.</p>
          <Button size="sm" onClick={cancelBackground}>Cancel research</Button>
        </div>}
        <ResearchView state={state} onRetry={run} />
      </AppFrame>
    );
  }
  return (
    <AppFrame title="Deep Research" subtitle="Ask a question and get an answer built from real papers, every claim cited.">
      <AskComposer key={draft ? 'draft' : 'new'} onSubmit={run} autoFocus initialQuestion={params.get('q') ?? ''} initialRequest={draft ?? undefined} />
      {backgroundAvailable && (
        <BackgroundChoice checked={preferBackground} onChange={(on) => { setPreferBackground(on); saveBackgroundChoice(on); }} />
      )}
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
