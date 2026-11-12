'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { LuCheck, LuDownload, LuLibrary, LuLoaderCircle, LuPlus, LuSearch } from 'react-icons/lu';
import { AppFrame } from '@/components/app/AppFrame';
import { Button, Card } from '@/components/app/ui';
import { useSignedIn } from '@/components/app/useSignedIn';
import { api } from '@/lib/session';
import { LibraryPicker, STUDY_TYPE_LABELS, Tag, saveToLibrary, showError, type LibraryPick } from '@/components/app/research/parts';
import { loadFromTask, type TaskRecord } from '@/components/app/research/handoff';
import { MapGraph } from '@/components/app/analysis/MapGraph';
import { download, toCsv, toRis } from '@/components/app/analysis/stats';

type MapNode = {
  id: string; title: string; authors: string[]; year: number | null; venue: string | null; doi: string | null; cited_by_count: number;
  study_type: string | null; is_oa: boolean; is_retracted: boolean; url: string | null; pdf_url: string | null; abstract: string | null; links?: number;
};
type Seed = { work_id?: string | null; doi?: string | null; title?: string | null; library_document_id?: string | null };
type MapResult = { task_id: string | null; seeds: MapNode[]; references: MapNode[]; citations: MapNode[] };
type SetPaper = { id: string; title: string; year: number | null; doi: string | null; round: number };
type Tab = 'graph' | 'references' | 'citations' | 'snowball' | 'reviews';

/** A DOI, an OpenAlex id or a title, as a seed. */
function seedFrom(text: string): Seed {
  const value = text.trim();
  const work = value.match(/\bW\d{4,12}\b/)?.[0];
  if (work) return { work_id: work };
  const doi = value.match(/10\.\d{4,9}\/\S+/)?.[0];
  if (doi) return { doi: doi.replace(/[.,;)]+$/, '') };
  return { title: value };
}

function PaperRow({ paper, inSet, onToggle, onSelect, selected }: { paper: MapNode; inSet: boolean; onToggle: () => void; onSelect?: () => void; selected?: boolean }) {
  const authors = paper.authors.length > 3 ? `${paper.authors.slice(0, 3).join(', ')} et al.` : paper.authors.join(', ');
  return (
    <li className={`flex gap-3 rounded-xl px-3 py-3 ${selected ? 'bg-accent-50' : 'hover:bg-soft'}`}>
      <button type="button" onClick={onToggle} aria-pressed={inSet} aria-label={inSet ? `Remove ${paper.title} from the set` : `Add ${paper.title} to the set`}
        className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border ${inSet ? 'border-brand bg-brand text-on-brand' : 'border-line-3 bg-surface text-muted hover:border-brand'}`}>
        {inSet ? <LuCheck className="h-3.5 w-3.5" /> : <LuPlus className="h-3.5 w-3.5" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold leading-snug text-ink">
          {onSelect ? <button type="button" onClick={onSelect} className="text-left hover:underline">{paper.title}</button> : paper.title}
        </p>
        <p className="mt-0.5 text-[13px] text-muted">{[authors, paper.year, paper.venue].filter(Boolean).join(' · ')}</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {paper.links ? <Tag tone="brand">{paper.links > 1 ? `Linked to ${paper.links} of your set` : 'Linked to 1 of your set'}</Tag> : null}
          {paper.study_type && <Tag>{STUDY_TYPE_LABELS[paper.study_type] ?? paper.study_type}</Tag>}
          <Tag>{paper.cited_by_count.toLocaleString('en-US')} citations</Tag>
          {paper.is_oa && <Tag tone="positive">Open access</Tag>}
          {paper.is_retracted && <Tag tone="negative">Retracted</Tag>}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-4 text-[13px] font-semibold">
          {paper.url && <a href={paper.url} target="_blank" rel="noreferrer" className="text-brand hover:underline">Open</a>}
          {paper.pdf_url && <a href={paper.pdf_url} target="_blank" rel="noreferrer" className="text-brand hover:underline">PDF</a>}
          <button type="button" onClick={() => saveToLibrary({ ...paper, id: paper.id }).catch(showError)} className="text-brand hover:underline">Save to Library</button>
        </div>
      </div>
    </li>
  );
}

type ListFilter = { from: string; to: string; minCited: string; type: string };
const passes = (filter: ListFilter) => (paper: MapNode) =>
  (!filter.from || (paper.year ?? 0) >= Number(filter.from)) && (!filter.to || (paper.year ?? 9999) <= Number(filter.to))
  && (!filter.minCited || paper.cited_by_count >= Number(filter.minCited)) && (!filter.type || paper.study_type === filter.type);

function CitationMap() {
  const { user } = useSignedIn();
  const params = useSearchParams();
  const [input, setInput] = useState('');
  const [picker, setPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [map, setMap] = useState<MapResult | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('graph');
  const [selected, setSelected] = useState<string | null>(null);
  const [set, setSet] = useState<SetPaper[]>([]);
  const [seen, setSeen] = useState<string[]>([]);
  const [round, setRound] = useState(0);
  const [candidates, setCandidates] = useState<MapNode[] | null>(null);
  const [reviews, setReviews] = useState<MapNode[] | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [hideSeen, setHideSeen] = useState(true);
  const [filter, setFilter] = useState<ListFilter>({ from: '', to: '', minCited: '', type: '' });

  const start = useCallback(async (seeds: Seed[], save = true, keepSet?: SetPaper[]) => {
    if (!seeds.length) return;
    setLoading(true);
    setCandidates(null);
    setReviews(null);
    try {
      const result = await api<MapResult>('/api/analysis/citation-map', { method: 'POST', body: JSON.stringify({ seeds, save }) });
      setMap(result);
      if (result.task_id) {
        setTaskId(result.task_id);
        window.history.replaceState(null, '', `/citation-map?task=${result.task_id}`);
      }
      setSet(keepSet ?? result.seeds.map((seed) => ({ id: seed.id, title: seed.title, year: seed.year, doi: seed.doi, round: 0 })));
      setSeen([...result.seeds, ...result.references, ...result.citations].map((node) => node.id));
      setTab('graph');
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Reopen a saved map (?task=), or start from a research result's papers (?from=).
  useEffect(() => {
    if (!user) return;
    const task = params.get('task');
    const from = params.get('from');
    if (task) {
      api<TaskRecord>(`/api/history/${encodeURIComponent(task)}`).then((record) => {
        setTaskId(record.id);
        const savedSet = (record.result?.set ?? []) as SetPaper[];
        setSeen((record.result?.seen ?? []) as string[]);
        setRound(Math.max(0, ...savedSet.map((paper) => paper.round ?? 0)));
        const seeds = ((record.inputs?.seeds ?? []) as { work_id: string }[]).map((seed) => ({ work_id: seed.work_id }));
        start(seeds, false, savedSet.length ? savedSet : undefined);
      }).catch(showError);
    } else if (from) {
      loadFromTask(from).then((loaded) => {
        const seeds = (loaded?.sources ?? []).filter((source) => source.kind === 'paper' && (/^W\d+$/.test(source.id) || source.doi)).slice(0, 10)
          .map((source) => (/^W\d+$/.test(source.id) ? { work_id: source.id } : { doi: source.doi }));
        if (seeds.length) start(seeds);
        else toast.error('That research has no papers to map.');
      });
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const setIds = useMemo(() => new Set(set.map((paper) => paper.id)), [set]);
  const persist = useCallback((nextSet: SetPaper[], nextSeen: string[]) => {
    if (!taskId) return;
    api(`/api/analysis/citation-map/${taskId}/set`, { method: 'PUT', body: JSON.stringify({ set: nextSet, seen: nextSeen.slice(-3000) }) }).catch(() => {});
  }, [taskId]);
  const toggle = (paper: MapNode) => {
    const next = setIds.has(paper.id) ? set.filter((item) => item.id !== paper.id) : [...set, { id: paper.id, title: paper.title, year: paper.year, doi: paper.doi, round: round + 1 }];
    setSet(next);
    persist(next, seen);
  };
  const snowballRound = async (direction: 'backward' | 'forward' | 'both') => {
    setWorking(direction);
    setTab('snowball');
    try {
      const result = await api<{ candidates: MapNode[] }>('/api/analysis/citation-map/snowball', { method: 'POST', body: JSON.stringify({ ids: set.map((paper) => paper.id).filter((id) => /^W\d+$/.test(id)).slice(0, 25), direction, exclude: hideSeen ? seen : [] }) });
      setCandidates(result.candidates);
      setRound(round + 1);
      const nextSeen = [...new Set([...seen, ...result.candidates.map((node) => node.id)])];
      setSeen(nextSeen);
      persist(set, nextSeen);
    } catch (error) {
      showError(error);
    } finally {
      setWorking(null);
    }
  };
  const findReviews = async () => {
    setWorking('reviews');
    setTab('reviews');
    try {
      const result = await api<{ reviews: MapNode[] }>('/api/analysis/citation-map/reviews', { method: 'POST', body: JSON.stringify({ ids: set.map((paper) => paper.id).filter((id) => /^W\d+$/.test(id)).slice(0, 50) }) });
      setReviews(result.reviews);
    } catch (error) {
      showError(error);
    } finally {
      setWorking(null);
    }
  };

  const everyNode = useMemo(() => new Map([...(map?.seeds ?? []), ...(map?.references ?? []), ...(map?.citations ?? []), ...(candidates ?? []), ...(reviews ?? [])].map((node) => [node.id, node])), [map, candidates, reviews]);
  const setNodes = set.map((paper) => everyNode.get(paper.id) ?? ({ ...paper, authors: [], venue: null, cited_by_count: 0, study_type: null, is_oa: false, is_retracted: false, url: paper.doi ? `https://doi.org/${paper.doi}` : null, pdf_url: null, abstract: null } as MapNode));
  const selectedNode = selected ? everyNode.get(selected) : null;
  const list = (nodes: MapNode[] | null | undefined) => (nodes ?? []).filter(passes(filter));

  const exportSet = (kind: 'ris' | 'csv') => {
    if (kind === 'ris') download('citation-set.ris', toRis(setNodes), 'application/x-research-info-systems');
    else download('citation-set.csv', toCsv([['OpenAlex id', 'Title', 'Authors', 'Year', 'Journal', 'DOI', 'Citations', 'Round'], ...setNodes.map((node) => [node.id, node.title, node.authors.join('; '), node.year, node.venue, node.doi, node.cited_by_count, set.find((paper) => paper.id === node.id)?.round ?? 0])]), 'text/csv');
  };
  const saveSet = async () => {
    for (const node of setNodes) await saveToLibrary(node).catch(() => undefined);
  };

  const startForm = (
    <form onSubmit={(event) => { event.preventDefault(); if (input.trim().length > 3) start([seedFrom(input)]); }} className="flex flex-wrap gap-2">
      <label htmlFor="seed" className="sr-only">A DOI, OpenAlex id or title</label>
      <input id="seed" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Paste a DOI or a paper title" className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-4 text-[15px]" />
      <Button type="submit" variant="primary" disabled={loading || input.trim().length <= 3}>{loading ? <LuLoaderCircle className="h-4 w-4 animate-spin" /> : <LuSearch className="h-4 w-4" />}Map it</Button>
      <Button onClick={() => setPicker(true)}><LuLibrary className="h-4 w-4" />From my Library</Button>
      {picker && <LibraryPicker selected={[]} onClose={() => setPicker(false)} onDone={(picks: LibraryPick[]) => { setPicker(false); start(picks.slice(0, 10).map((pick) => ({ library_document_id: pick.id }))); }} />}
    </form>
  );

  if (!map) {
    return (
      <AppFrame title="Citation Map" subtitle="See what a paper cites and what cites it, then snowball to the papers you missed.">
        {startForm}
        {loading && <p className="mt-6 flex items-center gap-2 text-[15px] text-ink-2"><LuLoaderCircle className="h-4 w-4 animate-spin text-brand" />Reading the citation graph…</p>}
        <Card className="mt-8 px-5 py-5">
          <h2 className="text-[16px] font-bold">How it works</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[14.5px] text-ink-2">
            <li>Start from one paper, several Library papers, or the papers of a Deep Research answer.</li>
            <li>Add the papers that matter to your set. Each snowball round reads the references (backward) or citing papers (forward) of the whole set and ranks what links to several of them.</li>
            <li>Find the reviews and meta-analyses that cite your set, then export the set to Zotero, Mendeley or EndNote.</li>
          </ul>
          <p className="mt-3 text-[13px] text-muted">Citation data from OpenAlex, with Semantic Scholar when OpenAlex has no links for a paper. No credits.</p>
        </Card>
      </AppFrame>
    );
  }

  return (
    <AppFrame wide title="Citation Map" subtitle={map.seeds.length === 1 ? map.seeds[0].title : `${map.seeds.length} seed papers`}
      actions={<Link href="/citation-map" onClick={() => { setMap(null); setTaskId(null); }} className="inline-flex h-[42px] items-center rounded-[11px] border border-line px-4 text-[15px] font-semibold hover:bg-soft">New map</Link>}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <div role="tablist" aria-label="Views" className="flex flex-wrap gap-1 border-b border-line-2">
            {([['graph', 'Map'], ['references', `References (${map.references.length})`], ['citations', `Citing (${map.citations.length})`], ['snowball', `Snowball${candidates ? ` (${candidates.length})` : ''}`], ['reviews', `Reviews${reviews ? ` (${reviews.length})` : ''}`]] as [Tab, string][]).map(([id, label]) => (
              <button key={id} role="tab" type="button" aria-selected={tab === id} onClick={() => setTab(id)} className={`-mb-px border-b-2 px-3 pb-2.5 text-[14px] font-semibold ${tab === id ? 'border-brand text-ink' : 'border-transparent text-muted hover:text-ink-2'}`}>{label}</button>
            ))}
          </div>
          {tab !== 'graph' && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[13.5px]">
              <input aria-label="From year" type="number" placeholder="From year" value={filter.from} onChange={(event) => setFilter({ ...filter, from: event.target.value })} className="h-8 w-28 rounded-lg border border-line px-2" />
              <input aria-label="To year" type="number" placeholder="To year" value={filter.to} onChange={(event) => setFilter({ ...filter, to: event.target.value })} className="h-8 w-28 rounded-lg border border-line px-2" />
              <input aria-label="At least this many citations" type="number" placeholder="Min. citations" value={filter.minCited} onChange={(event) => setFilter({ ...filter, minCited: event.target.value })} className="h-8 w-32 rounded-lg border border-line px-2" />
              <select aria-label="Study type" value={filter.type} onChange={(event) => setFilter({ ...filter, type: event.target.value })} className="h-8 rounded-lg border border-line px-2">
                <option value="">Any study type</option>
                {Object.entries(STUDY_TYPE_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </div>
          )}
          {tab === 'graph' && (
            <div className="mt-4">
              <MapGraph seeds={map.seeds} references={map.references.map((node) => ({ ...node, inSet: setIds.has(node.id) }))} citations={map.citations.map((node) => ({ ...node, inSet: setIds.has(node.id) }))} selected={selected} onSelect={setSelected} />
              <p className="mt-2 text-[12.5px] text-muted">Orange: your seed papers. Circle size: citations. Dark blue: papers in your set. Click a circle to see the paper.</p>
              {selectedNode && <ul className="mt-3 rounded-2xl border border-line"><PaperRow paper={selectedNode} inSet={setIds.has(selectedNode.id)} onToggle={() => toggle(selectedNode)} /></ul>}
            </div>
          )}
          {tab === 'references' && <ul className="mt-2">{list(map.references).map((paper) => <PaperRow key={paper.id} paper={paper} inSet={setIds.has(paper.id)} onToggle={() => toggle(paper)} />)}</ul>}
          {tab === 'citations' && <ul className="mt-2">{list(map.citations).map((paper) => <PaperRow key={paper.id} paper={paper} inSet={setIds.has(paper.id)} onToggle={() => toggle(paper)} />)}</ul>}
          {tab === 'snowball' && (
            <div className="mt-3">
              <p className="text-[14px] text-muted">Round {round}. Papers linked to several papers of your set come first: for backward rounds, papers your set cites in common (co-citation).</p>
              {working && working !== 'reviews' && <p className="mt-3 flex items-center gap-2 text-[14.5px]"><LuLoaderCircle className="h-4 w-4 animate-spin text-brand" />Reading {set.length} papers…</p>}
              {!candidates && !working && <p className="mt-3 text-[14.5px] text-ink-2">Choose a direction in the panel to run the next round.</p>}
              <ul className="mt-2">{list(candidates).map((paper) => <PaperRow key={paper.id} paper={paper} inSet={setIds.has(paper.id)} onToggle={() => toggle(paper)} />)}</ul>
            </div>
          )}
          {tab === 'reviews' && (
            <div className="mt-3">
              <p className="text-[14px] text-muted">Reviews and meta-analyses that cite papers in your set: a quick way to check what you may have missed.</p>
              {working === 'reviews' && <p className="mt-3 flex items-center gap-2 text-[14.5px]"><LuLoaderCircle className="h-4 w-4 animate-spin text-brand" />Searching…</p>}
              {reviews?.length === 0 && <p className="mt-3 text-[14.5px] text-ink-2">No reviews cite these papers yet.</p>}
              <ul className="mt-2">{list(reviews).map((paper) => <PaperRow key={paper.id} paper={paper} inSet={setIds.has(paper.id)} onToggle={() => toggle(paper)} />)}</ul>
            </div>
          )}
        </div>

        <aside aria-label="Your set" className="lg:sticky lg:top-6 lg:self-start">
          <Card className="p-4">
            <h2 className="text-[16px] font-bold">Your set ({set.length})</h2>
            <p className="mt-0.5 text-[13px] text-muted">{seen.length.toLocaleString('en-US')} papers seen so far</p>
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              {(['backward', 'forward', 'both'] as const).map((direction) => (
                <button key={direction} type="button" disabled={Boolean(working) || !set.length} onClick={() => snowballRound(direction)} className="h-9 rounded-[10px] border border-line text-[13px] font-semibold capitalize text-ink-2 hover:bg-soft disabled:opacity-50">{direction}</button>
              ))}
            </div>
            <label className="mt-2 flex items-center gap-2 text-[13px] text-ink-2"><input type="checkbox" checked={hideSeen} onChange={(event) => setHideSeen(event.target.checked)} className="h-4 w-4 accent-[var(--color-brand)]" />Hide papers already seen</label>
            <Button size="sm" className="mt-3 w-full" disabled={Boolean(working) || !set.length} onClick={findReviews}>Find reviews citing the set</Button>
            <ul className="mt-3 max-h-[320px] space-y-1.5 overflow-y-auto">
              {set.map((paper) => (
                <li key={paper.id} className="flex items-start gap-2 text-[13.5px]">
                  <span className="mt-0.5 text-[11.5px] font-semibold text-muted">R{paper.round}</span>
                  <span className="min-w-0 flex-1 line-clamp-2 text-ink">{paper.title}{paper.year ? ` (${paper.year})` : ''}</span>
                  <button type="button" aria-label={`Remove ${paper.title}`} onClick={() => { const next = set.filter((item) => item.id !== paper.id); setSet(next); persist(next, seen); }} className="text-muted hover:text-red-700">×</button>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Button size="sm" onClick={() => exportSet('ris')}><LuDownload className="h-4 w-4" />RIS</Button>
              <Button size="sm" onClick={() => exportSet('csv')}><LuDownload className="h-4 w-4" />CSV</Button>
              <Button size="sm" onClick={() => saveSet().catch(showError)}><LuLibrary className="h-4 w-4" />Save to Library</Button>
            </div>
            <p className="mt-3 text-[12.5px] leading-relaxed text-muted">To ask a question about these papers, save them to your Library, then in <Link href="/deep-research" className="font-semibold text-brand hover:underline">Deep Research</Link> choose Attach › Add from my Library.</p>
          </Card>
        </aside>
      </div>
    </AppFrame>
  );
}

export default function Page() {
  return <Suspense fallback={null}><CitationMap /></Suspense>;
}
