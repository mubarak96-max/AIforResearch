'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LuArrowUpDown, LuSearch, LuShare2 } from 'react-icons/lu';
import { Select } from '@/components/app/research/controls';
import { AppFrame } from '@/components/app/AppFrame';
import { SHOW_PROVIDERS } from '@/lib/devInfo';
import { SourcesNav } from '@/components/app/SourcesNav';
import { Button, Card } from '@/components/app/ui';
import { useSignedIn } from '@/components/app/useSignedIn';
import { api } from '@/lib/session';
import {
  FiltersPanel, SourcePicker, SourceRow, STUDY_TYPE_LABELS, filterCount, showError,
  type Filters, type FoundPaper, type Source, type SourceGroup,
} from '@/components/app/research/parts';

type SearchResult = { papers: FoundPaper[]; web: { id: string; title: string; url: string; site: string; snippet: string; published: string | null }[]; counts: Record<string, number>; errors: { provider: string; message: string }[] };

const PROVIDERS: Record<string, string> = { openalex: 'OpenAlex', semantic_scholar: 'Semantic Scholar', core: 'CORE', pubmed: 'PubMed', europepmc: 'Europe PMC', arxiv: 'arXiv', clinicaltrials: 'ClinicalTrials.gov', datacite: 'DataCite', web: 'Web', library: 'Library' };

/** A search result in the shape the source rows draw. */
function asSource(paper: FoundPaper, n: number): Source {
  return {
    n, marker: `S${n}`, kind: paper.providers.includes('library') ? 'library' : 'paper', id: paper.id, title: paper.title,
    authors: paper.authors.map((author) => author.name), more_authors: paper.extra_author_count ?? 0, year: paper.year, venue: paper.venue, doi: paper.doi,
    url: paper.url, pdf_url: paper.pdf_url, is_oa: paper.is_oa, cited_by_count: paper.cited_by_count, study_type: paper.study_type,
    study_type_label: paper.study_type ? STUDY_TYPE_LABELS[paper.study_type] : null, journal_tier: paper.journal?.tier ?? null, is_preprint: paper.is_preprint,
    is_retracted: Boolean(paper.is_retracted), providers: paper.providers, abstract: paper.abstract, tldr: paper.tldr,
  };
}

function FindPapers() {
  const { user } = useSignedIn();
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [groups, setGroups] = useState<SourceGroup[]>(['papers']);
  const [filters, setFilters] = useState<Filters>({});
  const [sort, setSort] = useState<'relevance' | 'cited' | 'newest'>('relevance');
  const [limit, setLimit] = useState(25);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const search = async (wanted = 25, q = query) => {
    if (q.trim().length < 2) return;
    setBusy(true);
    setLimit(wanted);
    try {
      setResult(await api<SearchResult>('/api/sources/search', { method: 'POST', body: JSON.stringify({ query: q.trim(), groups, filters, sort, limit: wanted }) }));
      if (params.get('q') !== q.trim()) router.replace(`/papers?q=${encodeURIComponent(q.trim())}`, { scroll: false });
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  };
  // A link with ?q= searches straight away; changing sources, filters or sort searches again.
  useEffect(() => { if (user && query.trim().length >= 2) search(25); }, [user, groups, filters, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  const sources = (result?.papers ?? []).map((paper, index) => asSource(paper, index + 1));
  const searched = Object.entries(result?.counts ?? {}).filter(([, count]) => count > 0).map(([provider]) => PROVIDERS[provider] || provider);

  return (
    <AppFrame wide title="Find Papers" subtitle="Search papers, PubMed, preprints, the web and your Library at once, with filters for year, study type and journal.">
      <SourcesNav />
      <form onSubmit={(event) => { event.preventDefault(); search(25); }} className="flex gap-2">
        <label htmlFor="paper-query" className="sr-only">Search</label>
        <div className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-surface px-3 focus-within:border-brand">
          <LuSearch className="h-5 w-5 shrink-0 text-subtle" aria-hidden="true" />
          <input id="paper-query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Topic, title, author or DOI" className="h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none" />
        </div>
        <Button variant="primary" size="lg" type="submit" disabled={busy || query.trim().length < 2}>{busy ? 'Searching…' : 'Search'}</Button>
      </form>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SourcePicker value={groups} onChange={setGroups} />
        <button type="button" onClick={() => setShowFilters(!showFilters)} className="h-8 rounded-full px-2 text-[13.5px] font-semibold text-brand lg:hidden">{showFilters ? 'Hide filters' : `Filters${filterCount(filters) ? ` (${filterCount(filters)})` : ''}`}</button>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside aria-label="Filters" className={`${showFilters ? 'block' : 'hidden'} lg:block`}>
          <div className="rounded-2xl border border-line bg-surface p-4 lg:sticky lg:top-6">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-[15px] font-bold">Filters</h2>
              {filterCount(filters) > 0 && <button type="button" onClick={() => setFilters({})} className="text-[13px] font-semibold text-brand hover:underline">Clear</button>}
            </div>
            <div className="[&_.grid]:grid-cols-1"><FiltersPanel value={filters} onChange={setFilters} /></div>
          </div>
        </aside>
        <section aria-label="Results" className="min-w-0">
          {result && (
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <p className="min-w-0 flex-1 text-[14px] text-muted">
                {result.papers.length ? `${result.papers.length} papers` : 'No papers'}{SHOW_PROVIDERS && searched.length ? ` from ${searched.join(', ')}` : ''}
                {result.errors.length ? (SHOW_PROVIDERS ? ` · ${result.errors.map((error) => PROVIDERS[error.provider] || error.provider).join(', ')} did not answer` : ' · Some sources did not answer') : ''}
              </p>
              <Select label="Sort" prefix="Sort" icon={<LuArrowUpDown />} align="right" value={sort} onChange={(next) => setSort(next as typeof sort)}
                options={[{ value: 'relevance', label: 'Most relevant' }, { value: 'cited', label: 'Most cited' }, { value: 'newest', label: 'Newest' }]} />
              {result.papers.length > 0 && (
                <Link href={`/deep-research?q=${encodeURIComponent(query.trim())}`} className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-line px-3 text-[14px] font-semibold text-ink-2 hover:bg-soft">
                  <LuShare2 className="h-4 w-4" aria-hidden="true" />Ask about these
                </Link>
              )}
            </div>
          )}
          {!result && !busy && (
            <Card className="px-5 py-8 text-center">
              <p className="text-[15px] font-semibold">Search 250M+ papers and more</p>
              <p className="mx-auto mt-1 max-w-md text-[14px] text-muted">Pick sources above: All papers (OpenAlex and Semantic Scholar), Medical (PubMed and Europe PMC), Preprints (arXiv, bioRxiv, medRxiv), Clinical trials, Datasets, the Web, or your Library. Searching costs no credits.</p>
            </Card>
          )}
          {result && (
            <ul className="divide-y divide-line-2 rounded-2xl border border-line bg-surface p-1.5">
              {sources.map((source) => (
                <SourceRow key={source.id} source={source} extra={<>
                  {source.doi && <Link href={`/citation-map?doi=${encodeURIComponent(source.doi)}`} className="text-brand hover:underline">Citation map</Link>}
                  {SHOW_PROVIDERS && <span className="font-normal text-muted">{source.providers.map((provider) => PROVIDERS[provider] || provider).join(' + ')}</span>}
                </>} />
              ))}
              {result.web.map((page) => (
                <li key={page.id} className="px-3 py-3">
                  <a href={page.url} target="_blank" rel="noreferrer" className="text-[15px] font-semibold text-ink hover:underline">{page.title}</a>
                  <p className="text-[13px] text-muted">{[page.site, page.published].filter(Boolean).join(' · ')} · Web page</p>
                  <p className="mt-1 line-clamp-2 text-[14px] text-ink-2">{page.snippet}</p>
                </li>
              ))}
            </ul>
          )}
          {result && result.papers.length >= limit && limit < 100 && (
            <div className="mt-4 text-center"><Button disabled={busy} onClick={() => search(Math.min(100, limit + 25))}>{busy ? 'Loading…' : 'Show more'}</Button></div>
          )}
        </section>
      </div>
    </AppFrame>
  );
}

export default function Page() {
  return <Suspense fallback={null}><FindPapers /></Suspense>;
}
