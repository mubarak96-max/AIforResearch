'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { LuArrowLeft, LuTrash2 } from 'react-icons/lu';
import { AppFrame } from '@/components/app/AppFrame';
import { Button } from '@/components/app/ui';
import { useSignedIn } from '@/components/app/useSignedIn';
import { api } from '@/lib/session';
import { showError } from '@/components/app/research/parts';
import { ProtocolTab, SearchTab } from '@/components/app/systematic-review/SetupTabs';
import { ScreeningTab } from '@/components/app/systematic-review/ScreeningTab';
import { ExtractionTab, ReportTab } from '@/components/app/systematic-review/ResultTabs';
import type { ReviewState, SrRecord } from '@/components/app/systematic-review/types';

const TABS = [['protocol', 'Protocol'], ['search', 'Search'], ['screening', 'Screening'], ['extraction', 'Extraction'], ['report', 'Report']] as const;
type Tab = (typeof TABS)[number][0];

function Workspace() {
  const { user } = useSignedIn();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const [state, setState] = useState<ReviewState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const initial = (params.get('tab') as Tab | null) ?? null;
  const [tab, setTab] = useState<Tab>(initial && TABS.some(([key]) => key === initial) ? initial : 'search');

  const reload = useCallback(async () => {
    try {
      const next = await api<ReviewState>(`/api/systematic-reviews/${id}`);
      setState(next);
      setError(null);
    } catch (caught) {
      setError((caught as Error).message);
    }
  }, [id]);
  useEffect(() => { if (user) reload(); }, [user, reload]);
  // A new review starts on Protocol; one with records on Screening.
  useEffect(() => {
    if (!state || initial) return;
    setTab(state.records.length ? 'screening' : state.review.protocol ? 'search' : 'protocol');
  }, [state?.review.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (next: Tab) => {
    setTab(next);
    window.history.replaceState(null, '', `/systematic-review/${id}?tab=${next}`);
    if (next === 'report' || next === 'extraction') reload();
  };
  const remove = async () => {
    if (!state || !window.confirm(`Delete "${state.review.title}" with all its records and decisions? This cannot be undone.`)) return;
    try {
      await api(`/api/systematic-reviews/${id}`, { method: 'DELETE' });
      router.push('/systematic-review');
    } catch (caught) { showError(caught); }
  };
  const setRecords = (records: SrRecord[]) => setState((current) => (current ? { ...current, records } : current));

  if (error) {
    return (
      <AppFrame title="Systematic Review">
        <p className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-700">{error}</p>
        <Link href="/systematic-review" className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-brand"><LuArrowLeft className="h-4 w-4" />All reviews</Link>
      </AppFrame>
    );
  }
  if (!state) return <AppFrame title="Systematic Review"><p className="text-[14px] text-muted">Loading…</p></AppFrame>;
  const p = state.prisma;
  return (
    <AppFrame wide title={state.review.title}
      subtitle={`${state.preset.label} · ${p.screened.toLocaleString('en-US')} records · ${p.included} included${state.can_edit ? '' : ' · read only'}`}
      actions={state.role === 'owner' ? <Button variant="ghost" onClick={remove} aria-label="Delete review"><LuTrash2 className="h-4 w-4" /></Button> : null}>
      <div role="tablist" aria-label="Review" className="mb-6 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map(([key, label]) => (
          <button key={key} role="tab" type="button" aria-selected={tab === key} onClick={() => choose(key)}
            className={`-mb-px shrink-0 border-b-2 px-3 pb-2.5 text-[14.5px] font-semibold ${tab === key ? 'border-brand text-ink' : 'border-transparent text-muted hover:text-ink-2'}`}>
            {label}
            {key === 'screening' && p.awaiting_title + p.conflicts_title > 0 && <span className="ml-1.5 text-[12.5px] font-medium text-muted tabular-nums">{p.awaiting_title + p.conflicts_title}</span>}
          </button>
        ))}
      </div>
      {tab === 'protocol' && <ProtocolTab key={state.review.id} state={state} reload={reload} />}
      {tab === 'search' && <SearchTab state={state} reload={reload} />}
      {tab === 'screening' && <ScreeningTab state={state} setRecords={setRecords} reload={reload} />}
      {tab === 'extraction' && <ExtractionTab state={state} reload={reload} />}
      {tab === 'report' && <ReportTab state={state} reload={reload} />}
    </AppFrame>
  );
}

export default function Page() {
  return <Suspense fallback={null}><Workspace /></Suspense>;
}
