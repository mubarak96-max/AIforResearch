import type { Metadata } from 'next';
import Link from 'next/link';
import { LuSearch } from 'react-icons/lu';
import { pageMetadata } from '@/components/marketing/seo';
import { container, focusRing, btnPrimary } from '@/components/marketing/styles';
import { h1, lead } from '@/components/marketing/landing';
import { JsonLd, breadcrumbSchema } from '@/components/marketing/seoBlocks';
import { PaperListItem } from '@/components/marketing/PaperListItem';
import { DirectoryBusyError, searchDirectory } from '@/lib/server/lib/directory';
import { SITE_URL } from '@/lib/site';

type Props = { searchParams: Promise<{ q?: string; page?: string }> };

const SUGGESTIONS = ['sleep and memory', 'climate change adaptation', 'large language models', 'microfinance', 'teacher burnout', 'CRISPR gene editing'];

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  const base = pageMetadata({
    title: 'Research papers directory: search 250M+ scholarly works',
    path: '/research',
    description: 'Search over 250 million scholarly papers. See each paper’s abstract, authors and citations, and cite it in APA, MLA, Chicago or Harvard in one click.',
  });
  // Search results are not pages of their own: crawlers may follow them, not index them.
  return q ? { ...base, title: `“${q.slice(0, 60)}” papers`, robots: { index: false, follow: true } } : base;
}

export default async function ResearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = (params.q || '').trim().slice(0, 200);
  const page = Math.max(1, Math.min(25, Number(params.page) || 1));

  let results: Awaited<ReturnType<typeof searchDirectory>> | null = null;
  let busy = false;
  if (query) {
    try {
      results = await searchDirectory(query, page);
    } catch (error) {
      if (!(error instanceof DirectoryBusyError)) throw error;
      busy = true;
    }
  }
  const pages = results ? Math.min(25, Math.ceil(results.total / 20)) : 0;
  const pageHref = (n: number) => `/research?q=${encodeURIComponent(query)}${n > 1 ? `&page=${n}` : ''}`;

  return (
    <>
      <JsonLd
        data={[
          {
            '@type': 'CollectionPage',
            '@id': `${SITE_URL}/research#page`,
            name: 'Research papers directory',
            url: `${SITE_URL}/research`,
            isPartOf: { '@id': `${SITE_URL}/#website` },
          },
          breadcrumbSchema([{ name: 'Research', path: '/research' }]),
        ]}
      />
      <section aria-labelledby="page-title" className="pt-14 md:pt-20" style={{ background: 'radial-gradient(900px 340px at 50% -8%, var(--color-brand-50) 0%, transparent 70%)' }}>
        <div className={`${container} text-center`}>
          <h1 id="page-title" className={`mx-auto max-w-[760px] ${h1}`}>Search 250 million research papers</h1>
          <p className={`mx-auto mt-5 max-w-[560px] ${lead}`}>Read the abstract, see who wrote it and who cites it, and get the citation in APA, MLA, Chicago or Harvard.</p>
          <form action="/research" method="get" role="search" className="mx-auto mt-8 flex max-w-[620px] gap-2">
            <label className="relative flex-1">
              <span className="sr-only">Search papers</span>
              <LuSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
              <input
                type="search" name="q" defaultValue={query} required maxLength={200}
                placeholder="A topic, title or DOI"
                className={`h-12 w-full rounded-xl border border-line bg-surface pl-11 pr-4 text-[15px] text-ink placeholder:text-subtle ${focusRing}`}
              />
            </label>
            <button type="submit" className={`${btnPrimary} h-12 rounded-xl px-5 text-[15px]`}>Search</button>
          </form>
        </div>
      </section>

      <div className={`${container} pb-20 pt-10`}>
        <div className="mx-auto max-w-[820px]">
          {!query && (
            <div className="text-center">
              <p className="text-[14px] text-muted">Try:</p>
              <ul className="mt-3 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((topic) => (
                  <li key={topic}>
                    <Link href={`/research?q=${encodeURIComponent(topic)}`} className={`inline-flex h-9 items-center rounded-full border border-line bg-surface px-3.5 text-[13.5px] text-ink-2 hover:border-brand-100 hover:text-brand ${focusRing}`}>{topic}</Link>
                  </li>
                ))}
              </ul>
              <p className="mx-auto mt-12 max-w-[620px] text-[14.5px] leading-[1.6] text-muted">
                Records come from OpenAlex, an open index of scholarly works. Many records have an abstract only; a free full text is linked when one exists. To search inside the editor and cite as you write, use{' '}
                <Link href="/features/paper-search" className="text-ink underline underline-offset-4 hover:text-brand">Find papers</Link>.
              </p>
            </div>
          )}

          {busy && <p role="alert" className="rounded-xl bg-amber-50 px-4 py-3 text-[14.5px] text-amber-800">Paper search is busy. Try again in a minute.</p>}

          {results && (
            <>
              <p className="text-[14px] text-muted" aria-live="polite">
                {results.total ? `About ${results.total.toLocaleString('en-US')} papers for “${query}”` : `No papers found for “${query}”. Try fewer or different words.`}
              </p>
              <div className="mt-2">
                {results.results.map((paper) => <PaperListItem key={paper.id} paper={paper} showAbstract />)}
              </div>
              {pages > 1 && (
                <nav aria-label="Pages" className="mt-8 flex items-center justify-between text-[14.5px]">
                  {page > 1 ? <Link href={pageHref(page - 1)} rel="prev" className={`rounded text-brand hover:underline ${focusRing}`}>← Previous</Link> : <span />}
                  <span className="text-muted">Page {page} of {pages}</span>
                  {page < pages ? <Link href={pageHref(page + 1)} rel="next" className={`rounded text-brand hover:underline ${focusRing}`}>Next →</Link> : <span />}
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
