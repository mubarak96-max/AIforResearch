'use client';

/**
 * Screening: title and abstract, then full text. One record at a time with Include (I), Exclude
 * (E, with a reason) and Maybe (M), arrows to move, AI suggestions labelled as suggestions,
 * conflicts to resolve, and agreement between reviewers.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LuChevronLeft, LuChevronRight, LuExternalLink, LuSparkles } from 'react-icons/lu';
import { api } from '@/lib/session';
import { Button, Card, Segmented } from '@/components/app/ui';
import { CreditCost, Tag, creditsChanged, showError } from '@/components/app/research/parts';
import { passes, setVote, withStates } from './client';
import { DECISION_LABELS, type Decision, type ReviewState, type SrRecord, type Stage } from './types';

type View = 'todo' | 'conflicts' | 'all' | 'included' | 'excluded';

export function ScreeningTab({ state, setRecords, reload }: { state: ReviewState; setRecords: (records: SrRecord[]) => void; reload: () => Promise<void> }) {
  const { review, me, can_edit: canEdit } = state;
  const setup = useMemo(() => ({ dual: state.dual, aiSecond: state.ai_second }), [state.dual, state.ai_second]);
  const [stage, setStage] = useState<Stage>('title');
  const [view, setView] = useState<View>('todo');
  const [index, setIndex] = useState(0);
  const [reason, setReason] = useState(state.preset.reasons[0] ?? '');
  const [busy, setBusy] = useState(false);

  const pool = useMemo(() => state.records.filter((record) => !record.duplicate_of && (stage === 'title' || passes(record.title_state))), [state.records, stage]);
  const stateAt = (record: SrRecord) => (stage === 'title' ? record.title_state : record.full_state);
  const shown = useMemo(() => pool.filter((record) => {
    const current = stateAt(record);
    if (view === 'todo') return !record.votes?.[stage]?.[me] && current?.status !== 'final';
    if (view === 'conflicts') return current?.status === 'conflict';
    if (view === 'included') return current?.status === 'final' && current.decision !== 'exclude';
    if (view === 'excluded') return current?.status === 'final' && current.decision === 'exclude';
    return true;
  }), [pool, view, stage, me]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setIndex((current) => Math.min(current, Math.max(0, shown.length - 1))); }, [shown.length]);
  const record = shown[index] ?? null;
  const decided = pool.filter((item) => stateAt(item)?.status === 'final').length;

  const decide = useCallback(async (decision: Decision | null, target: SrRecord | null = record) => {
    if (!target || !canEdit) return;
    const updated = withStates(setVote(target, stage, me, decision, decision === 'exclude' ? reason : null), setup);
    setRecords(state.records.map((item) => (item.id === target.id ? updated : item)));
    // In "To screen" the record leaves the list; elsewhere move on.
    if (view !== 'todo') setIndex((current) => Math.min(current + 1, shown.length - 1));
    try {
      await api(`/api/systematic-reviews/${review.id}/records/${target.id}/vote`, { method: 'POST', body: JSON.stringify({ stage, decision, reason: decision === 'exclude' ? reason : null }) });
    } catch (error) {
      showError(error);
      await reload();
    }
  }, [record, canEdit, stage, me, reason, setup, state.records, setRecords, view, shown.length, review.id, reload]);

  const resolveConflict = async (decision: Decision) => {
    if (!record) return;
    try {
      await api(`/api/systematic-reviews/${review.id}/records/${record.id}/resolve`, { method: 'POST', body: JSON.stringify({ stage, decision, reason: decision === 'exclude' ? reason : null }) });
      await reload();
    } catch (error) { showError(error); }
  };

  // Keyboard: I, E, M to decide; arrows to move. Not while typing in a field.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('input, textarea, select, [contenteditable="true"]') || event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === 'i') { event.preventDefault(); decide('include'); }
      else if (key === 'e') { event.preventDefault(); decide('exclude'); }
      else if (key === 'm') { event.preventDefault(); decide('maybe'); }
      else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); setIndex((current) => Math.min(current + 1, shown.length - 1)); }
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); setIndex((current) => Math.max(current - 1, 0)); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [decide, shown.length]);

  const suggestable = pool.filter((item) => !item.ai?.[stage]).length;
  const nextBatch = Math.min(25, suggestable);
  const suggest = async () => {
    setBusy(true);
    try {
      await api(`/api/systematic-reviews/${review.id}/screen/ai`, { method: 'POST', body: JSON.stringify({ stage, limit: 25 }) });
      await reload();
    } catch (error) { showError(error); } finally { setBusy(false); creditsChanged(); }
  };
  const toggleAi = async (on: boolean) => {
    try {
      await api(`/api/systematic-reviews/${review.id}`, { method: 'PATCH', body: JSON.stringify({ ai_second_reviewer: on }) });
      await reload();
    } catch (error) { showError(error); }
  };

  const agreement = state.agreement[stage];
  const myVote = record?.votes?.[stage]?.[me];
  const others = record ? Object.entries(record.votes?.[stage] ?? {}).filter(([id]) => id !== me) : [];
  const ai = record?.ai?.[stage];
  const current = record ? stateAt(record) : null;
  const nameOf = (id: string) => state.reviewers.find((reviewer) => reviewer.id === id)?.name ?? 'Reviewer';

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented label="Stage" value={stage} onChange={(value) => { setStage(value); setIndex(0); }} options={[{ value: 'title', label: 'Title and abstract' }, { value: 'full', label: 'Full text' }]} />
          <select aria-label="Show" value={view} onChange={(event) => { setView(event.target.value as View); setIndex(0); }} className="h-9 rounded-[10px] border border-line px-2 text-[14px]">
            <option value="todo">To screen</option><option value="conflicts">Conflicts</option><option value="all">All</option><option value="included">Included or maybe</option><option value="excluded">Excluded</option>
          </select>
          <span className="ml-auto text-[13.5px] text-muted tabular-nums">{decided} of {pool.length} decided</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line-2" aria-hidden="true"><div className="h-full bg-brand" style={{ width: `${pool.length ? (decided / pool.length) * 100 : 0}%` }} /></div>

        {!record ? (
          <Card className="mt-4 px-5 py-8 text-center">
            <p className="text-[15px] font-semibold">{pool.length === 0 ? (stage === 'title' ? 'No records yet. Add some in Search.' : 'No records have passed title and abstract screening yet.') : view === 'todo' ? 'Nothing left for you to screen here.' : 'No records in this view.'}</p>
          </Card>
        ) : (
          <Card className="mt-4 p-5">
            <div className="flex items-center gap-2 text-[13px] text-muted">
              <span className="tabular-nums">{index + 1} of {shown.length}</span>
              <span>·</span><span>{record.source}</span>
              <div className="ml-auto flex gap-1">
                <button type="button" aria-label="Previous record" onClick={() => setIndex(Math.max(0, index - 1))} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-soft"><LuChevronLeft className="h-4 w-4" /></button>
                <button type="button" aria-label="Next record" onClick={() => setIndex(Math.min(shown.length - 1, index + 1))} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-soft"><LuChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
            <h2 className="mt-2 text-[19px] font-bold leading-snug text-ink">{record.title}</h2>
            <p className="mt-1 text-[14px] text-muted">{[record.authors.slice(0, 4).join(', ') + (record.authors.length > 4 ? ' et al.' : ''), record.year, record.venue].filter(Boolean).join(' · ')}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 text-[13.5px] font-semibold">
              {record.doi && <a href={`https://doi.org/${record.doi}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand hover:underline">DOI<LuExternalLink className="h-3 w-3" /></a>}
              {record.pmid && <a href={`https://pubmed.ncbi.nlm.nih.gov/${record.pmid}/`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand hover:underline">PubMed<LuExternalLink className="h-3 w-3" /></a>}
              {!record.doi && record.url && <a href={record.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand hover:underline">Open<LuExternalLink className="h-3 w-3" /></a>}
            </div>
            <p className="mt-4 whitespace-pre-line text-[15.5px] leading-[1.7] text-ink">{record.abstract || 'No abstract in this record.'}</p>

            {ai && (
              <div className="mt-4 rounded-xl bg-soft px-4 py-3 text-[14px]">
                <p className="font-semibold text-ink-2"><LuSparkles className="mr-1 inline h-3.5 w-3.5 text-brand" aria-hidden="true" />AI suggestion: {DECISION_LABELS[ai.decision]}</p>
                <p className="mt-0.5 text-ink-2">{ai.reason}</p>
                <p className="mt-1 text-[12.5px] text-muted">A suggestion only{state.ai_second ? '; it counts as the second reviewer here' : ''}. Your decision is what counts.</p>
              </div>
            )}
            {others.length > 0 && <p className="mt-3 text-[13.5px] text-muted">{others.map(([id, item]) => `${nameOf(id)}: ${DECISION_LABELS[item.decision]}${item.reason ? ` (${item.reason})` : ''}`).join(' · ')}</p>}
            {current?.status === 'final' && <p className="mt-2 text-[13.5px] font-semibold text-ink-2">Final: {DECISION_LABELS[current.decision!]}{current.reason ? ` · ${current.reason}` : ''}</p>}

            {canEdit && (
              <div className="mt-5 border-t border-line-2 pt-4">
                {current?.status === 'conflict' ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14px] font-semibold text-amber-800">Reviewers disagree. Resolve:</span>
                    <Button size="sm" onClick={() => resolveConflict('include')}>Include</Button>
                    <Button size="sm" onClick={() => resolveConflict('exclude')}>Exclude</Button>
                  </div>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {(['include', 'exclude', 'maybe'] as Decision[]).map((decision) => (
                    <button key={decision} type="button" onClick={() => decide(myVote?.decision === decision ? null : decision)} aria-pressed={myVote?.decision === decision}
                      className={`h-10 rounded-[11px] border px-4 text-[14.5px] font-semibold ${myVote?.decision === decision ? (decision === 'include' ? 'border-green-700 bg-green-100 text-green-800' : decision === 'exclude' ? 'border-red-700 bg-red-50 text-red-700' : 'border-amber-600 bg-amber-50 text-amber-800') : 'border-line bg-surface text-ink hover:bg-soft'}`}>
                      {DECISION_LABELS[decision]} <kbd className="ml-1 text-[12px] font-medium text-muted">{decision[0].toUpperCase()}</kbd>
                    </button>
                  ))}
                  <label className="flex items-center gap-2 text-[13.5px] text-ink-2">Reason to exclude
                    <select value={reason} onChange={(event) => setReason(event.target.value)} className="h-9 max-w-[240px] rounded-[10px] border border-line px-2 text-[13.5px]">
                      {state.preset.reasons.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </label>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>

      <aside className="grid content-start gap-4">
        {canEdit && (
          <Card className="p-4">
            <h3 className="text-[15px] font-bold">AI suggestions</h3>
            <p className="mt-1 text-[13.5px] text-muted">The AI reads each record against your criteria and suggests a decision with its reason.</p>
            <Button className="mt-3 w-full" onClick={suggest} disabled={busy || !nextBatch}><LuSparkles className="h-4 w-4" />{busy ? 'Reading…' : nextBatch ? `Suggest for the next ${nextBatch}` : 'All records have suggestions'}</Button>
            {nextBatch > 0 && <CreditCost credits={1} className="mt-1.5 block text-center" />}
            {state.reviewers.length === 1 && (
              <label className="mt-3 flex items-start gap-2 text-[13.5px] text-ink-2">
                <input type="checkbox" checked={review.ai_second_reviewer} onChange={(event) => toggleAi(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--color-brand)]" />
                Use the AI as a second reviewer (disagreements become conflicts to resolve)
              </label>
            )}
          </Card>
        )}
        <Card className="p-4">
          <h3 className="text-[15px] font-bold">Agreement</h3>
          {state.dual ? (
            agreement.n ? (
              <>
                <p className="mt-2 text-[22px] font-semibold tabular-nums">κ = {agreement.kappa?.toFixed(2)}</p>
                <p className="text-[13.5px] text-muted">{agreement.label} agreement · {agreement.percent}% the same · {agreement.n} records, you and {agreement.with}</p>
              </>
            ) : <p className="mt-1 text-[13.5px] text-muted">Shown once you and {agreement.with.toLowerCase()} have both screened records.</p>
          ) : <p className="mt-1 text-[13.5px] text-muted">You are the only reviewer. Add editors to the review’s project, or use the AI as a second reviewer, to measure agreement (Cohen’s kappa).</p>}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {state.prisma.conflicts_title > 0 && <Tag tone="warning">{state.prisma.conflicts_title} title conflicts</Tag>}
            {state.prisma.conflicts_full > 0 && <Tag tone="warning">{state.prisma.conflicts_full} full-text conflicts</Tag>}
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="text-[15px] font-bold">Reviewers</h3>
          <ul className="mt-2 text-[14px] text-ink-2">{state.reviewers.map((reviewer) => <li key={reviewer.id}>{reviewer.id === me ? 'You' : reviewer.name}</li>)}{state.ai_second && <li>AI (second reviewer)</li>}</ul>
          <p className="mt-2 text-[12.5px] text-muted">Keys: I include, E exclude, M maybe, arrows to move.</p>
        </Card>
      </aside>
    </div>
  );
}
