'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { LuLoaderCircle, LuSearch } from 'react-icons/lu';
import { AppFrame } from '@/components/app/AppFrame';
import { Button, Card } from '@/components/app/ui';
import { useSignedIn } from '@/components/app/useSignedIn';
import { api } from '@/lib/session';
import { Tag, saveToLibrary, showError, STUDY_TYPE_LABELS } from '@/components/app/research/parts';
import type { TaskRecord } from '@/components/app/research/handoff';
import { Columns, RankedList } from '@/components/app/analysis/charts';

type Count = { key: string; label: string; count: number };
type Work = { id: string; title: string; authors: string[]; year: number | null; venue: string | null; doi: string | null; cited_by_count: number; study_type: string | null; is_oa: boolean; url: string | null; pdf_url: string | null; abstract: string | null };
type Landscape = {
  query: string; total: number; years: Count[]; topics: Count[]; journals: Count[]; authors: Count[]; institutions: Count[];
  open_access: { open: number; closed: number; share: number | null }; top_works: Work[]; retrieved: string; source: string;
};

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="text-[15px] font-bold text-ink">{title}</h2>
      <div className="mt-3">{children}</div>
    </Card>
  );
}

function LandscapePage() {
  const { user } = useSignedIn();
  const params = useSearchParams();
  const [query, setQuery] = useState('');
  const [compare, setCompare] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ landscape: Landscape; compare: Landscape | null } | null>(null);

  const run = useCallback(async (input: { query: string; compare?: string | null; from_year?: number | null; to_year?: number | null }, save = true) => {
    setLoading(true);
    try {
      const result = await api<{ task_id: string | null; landscape: Landscape; compare: Landscape | null }>('/api/analysis/landscape', { method: 'POST', body: JSON.stringify({ ...input, save }) });
      setData(result);
      if (result.task_id) window.history.replaceState(null, '', `/landscape?task=${result.task_id}`);
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const task = params.get('task');
    if (!user || !task) return;
    api<TaskRecord>(`/api/history/${encodeURIComponent(task)}`).then((record) => {
      if (record.result?.landscape) setData({ landscape: record.result.landscape, compare: record.result.compare ?? null });
      setQuery(String(record.inputs?.query ?? ''));
      setCompare(String(record.inputs?.compare ?? ''));
      setFrom(record.inputs?.from_year ? String(record.inputs.from_year) : '');
      setTo(record.inputs?.to_year ? String(record.inputs.to_year) : '');
    }).catch(showError);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = () => {
    if (query.trim().length < 2) return;
    run({ query: query.trim(), compare: compare.trim() || null, from_year: from ? Number(from) : null, to_year: to ? Number(to) : null });
  };
  const main = data?.landscape;
  const other = data?.compare;
  const otherByYear = other ? new Map(other.years.map((row) => [row.key, row.count])) : null;
  const yearKeys = main ? [...new Set([...main.years.map((row) => row.key), ...(other?.years.map((row) => row.key) ?? [])])].sort() : [];

  return (
    <AppFrame wide title="Landscape" subtitle="A field at a glance: how much is published, when, where and by whom.">
      <form onSubmit={(event) => { event.preventDefault(); submit(); }} className="rounded-2xl border border-line bg-surface p-4">
        <div className="flex flex-wrap gap-2">
          <label htmlFor="topic" className="sr-only">Topic</label>
          <input id="topic" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="A topic, e.g. microplastics in drinking water" className="h-11 min-w-0 flex-1 rounded-xl border border-line px-4 text-[15px]" />
          <Button type="submit" variant="primary" disabled={loading || query.trim().length < 2}>{loading ? <LuLoaderCircle className="h-4 w-4 animate-spin" /> : <LuSearch className="h-4 w-4" />}Map the field</Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[14px]">
          <input aria-label="Compare with another topic" value={compare} onChange={(event) => setCompare(event.target.value)} placeholder="Compare with (optional)" className="h-9 min-w-[200px] flex-1 rounded-[10px] border border-line px-3" />
          <input aria-label="From year" type="number" value={from} onChange={(event) => setFrom(event.target.value)} placeholder="From year" className="h-9 w-28 rounded-[10px] border border-line px-3" />
          <input aria-label="To year" type="number" value={to} onChange={(event) => setTo(event.target.value)} placeholder="To year" className="h-9 w-28 rounded-[10px] border border-line px-3" />
        </div>
      </form>

      {loading && <p className="mt-6 flex items-center gap-2 text-[15px] text-ink-2"><LuLoaderCircle className="h-4 w-4 animate-spin text-brand" />Counting works in OpenAlex…</p>}

      {main && !loading && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line-2 sm:grid-cols-4">
            {[
              ['Works', main.total.toLocaleString('en-US')],
              ['Open access', main.open_access.share === null ? '–' : `${(main.open_access.share * 100).toFixed(0)}%`],
              ['Peak year', main.years.length ? [...main.years].sort((a, b) => b.count - a.count)[0].label : '–'],
              [other ? `Works: ${other.query}` : 'Top journal', other ? other.total.toLocaleString('en-US') : main.journals[0]?.label ?? '–'],
            ].map(([label, value]) => (
              <div key={label} className="bg-surface px-4 py-3">
                <p className="truncate text-[12.5px] text-muted">{label}</p>
                <p className="mt-1 truncate text-[20px] font-semibold tabular-nums text-ink">{value}</p>
              </div>
            ))}
          </div>

          <Panel title={other ? 'Works per year, compared' : 'Works per year'}>
            <Columns label={`Works per year for ${main.query}`} data={yearKeys.map((key) => ({ label: key, value: main.years.find((row) => row.key === key)?.count ?? 0 }))}
              second={otherByYear ? yearKeys.map((key) => otherByYear.get(key) ?? 0) : undefined} firstLabel={main.query} secondLabel={other?.query} />
            {main.years.length > 0 && main.years.at(-1)!.label === String(new Date().getFullYear()) && <p className="mt-1 text-[12.5px] text-muted">{main.years.at(-1)!.label} is not over yet.</p>}
          </Panel>

          <div className="grid gap-4 md:grid-cols-2">
            <Panel title="Main topics"><RankedList rows={main.topics} total={main.total} /></Panel>
            <Panel title="Journals and sources"><RankedList rows={main.journals} /></Panel>
            <Panel title="Most active authors"><RankedList rows={main.authors} /></Panel>
            <Panel title="Most active institutions"><RankedList rows={main.institutions} /></Panel>
          </div>

          <Panel title="Most cited works">
            <ul className="-mx-2">
              {main.top_works.map((work) => (
                <li key={work.id} className="rounded-xl px-2 py-2.5 hover:bg-soft">
                  <p className="text-[15px] font-semibold leading-snug text-ink">{work.url ? <a href={work.url} target="_blank" rel="noreferrer" className="hover:underline">{work.title}</a> : work.title}</p>
                  <p className="mt-0.5 text-[13px] text-muted">{[work.authors.slice(0, 3).join(', ') + (work.authors.length > 3 ? ' et al.' : ''), work.year, work.venue].filter(Boolean).join(' · ')}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Tag>{work.cited_by_count.toLocaleString('en-US')} citations</Tag>
                    {work.study_type && <Tag>{STUDY_TYPE_LABELS[work.study_type] ?? work.study_type}</Tag>}
                    {work.is_oa && <Tag tone="positive">Open access</Tag>}
                    <button type="button" onClick={() => saveToLibrary(work).catch(showError)} className="ml-1 text-[13px] font-semibold text-brand hover:underline">Save to Library</button>                  </div>
                </li>
              ))}
            </ul>
          </Panel>
          <p className="text-[12.5px] text-muted">Source: OpenAlex, retrieved {main.retrieved}. Counts are works matching the search words in OpenAlex&apos;s index; topics, journals and authors are as OpenAlex assigns them.</p>
        </div>
      )}
    </AppFrame>
  );
}

export default function Page() {
  return <Suspense fallback={null}><LandscapePage /></Suspense>;
}
