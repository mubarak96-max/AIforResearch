import type { Metadata } from 'next';
import Link from 'next/link';
import { cache } from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import { LuArrowUpRight, LuTriangleAlert } from 'react-icons/lu';
import { pageMetadata } from '@/components/marketing/seo';
import { container, focusRing } from '@/components/marketing/styles';
import { Breadcrumbs, Formatted, JsonLd, ToolCta, breadcrumbSchema, plainCitation } from '@/components/marketing/seoBlocks';
import { CopyButton } from '@/components/marketing/CopyButton';
import { PaperListItem } from '@/components/marketing/PaperListItem';
import { getPaperRecord, getPapersByIds, WORK_ID, type PaperRecord } from '@/lib/server/lib/directory';
import { bibtex, CITE_FORMATS, type CiteRecord } from '@/lib/scholarly/cite';
import { SITE_URL } from '@/lib/site';

type Props = { params: Promise<{ id: string }> };

// Records change slowly; rebuild a page at most once a day.
export const revalidate = 86400;

/** One fetch per request, shared by the metadata and the page. */
const loadPaper = cache((id: string) => getPaperRecord(id));

async function resolve(params: Props['params']): Promise<PaperRecord> {
  const raw = (await params).id;
  const id = raw.toUpperCase();
  if (!WORK_ID.test(id)) notFound();
  if (raw !== id) permanentRedirect(`/research/papers/${id}`);
  const record = await loadPaper(id);
  if (!record) notFound();
  return record;
}

function citeRecord(record: PaperRecord): CiteRecord {
  const { paper } = record;
  return {
    title: paper.title,
    authors: record.authors.map((author) => author.name),
    moreAuthors: record.moreAuthors,
    year: paper.year,
    venue: paper.venue,
    volume: paper.volume,
    issue: paper.issue,
    firstPage: paper.first_page,
    lastPage: paper.last_page,
    doi: paper.doi,
    type: paper.type,
  };
}

const clip = (text: string, max: number) => (text.length <= max ? text : `${text.slice(0, max - 1).replace(/\s+\S*$/, '')}…`);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const record = await resolve(params);
  const { paper } = record;
  const lead = record.authors[0]?.name.split(' ').pop();
  const by = lead ? `${lead}${record.authors.length > 1 ? ' et al.' : ''}` : '';
  const description = paper.abstract
    ? clip(paper.abstract, 155)
    : clip(`${paper.title}${by ? ` by ${by}` : ''}${paper.year ? ` (${paper.year})` : ''}. Cite it in APA, MLA, Chicago or Harvard, and see who cites it.`, 155);
  const base = pageMetadata({ title: clip(paper.title, 70), description, path: `/research/papers/${paper.id}` });
  // Paper pages stay out of the index: only the /research search page is meant to rank.
  // Not followed either: their links lead into OpenAlex's whole graph (see app/robots.ts).
  return { ...base, robots: { index: false, follow: false }, openGraph: { ...base.openGraph, type: 'article' } };
}

function scholarlySchema(record: PaperRecord) {
  const { paper } = record;
  const url = `${SITE_URL}/research/papers/${paper.id}`;
  return {
    '@type': 'ScholarlyArticle',
    '@id': `${url}#paper`,
    headline: clip(paper.title, 110),
    name: paper.title,
    url,
    ...(paper.abstract ? { abstract: paper.abstract } : {}),
    ...(paper.publication_date ? { datePublished: paper.publication_date } : paper.year ? { datePublished: String(paper.year) } : {}),
    author: record.authors.slice(0, 20).map((author) => ({
      '@type': 'Person',
      name: author.name,
      ...(author.id ? { url: `${SITE_URL}/research/authors/${author.id}` } : {}),
    })),
    ...(paper.venue ? { isPartOf: { '@type': 'Periodical', name: paper.venue } } : {}),
    ...(paper.doi ? { sameAs: `https://doi.org/${paper.doi}`, identifier: { '@type': 'PropertyValue', propertyID: 'DOI', value: paper.doi } } : {}),
    ...(record.topics.length ? { about: record.topics.map((topic) => ({ '@type': 'Thing', name: topic.name })) } : {}),
    ...(record.language ? { inLanguage: record.language } : {}),
    isAccessibleForFree: paper.is_oa,
  };
}

const box = 'rounded-2xl border border-line bg-surface';
const label = 'text-[12px] font-medium uppercase tracking-[.1em] text-subtle';

export default async function PaperPage({ params }: Props) {
  const record = await resolve(params);
  const { paper } = record;
  const cite = citeRecord(record);
  const related = await getPapersByIds(record.relatedIds).catch(() => []);
  const crumbs = [
    { name: 'Research', path: '/research' },
    { name: clip(paper.title, 60), path: `/research/papers/${paper.id}` },
  ];
  const bib = bibtex(cite);

  return (
    <div className={container}>
      <JsonLd data={[scholarlySchema(record), breadcrumbSchema(crumbs)]} />

      <div className="grid gap-12 pb-20 pt-8 md:pt-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-16">
        <article className="min-w-0">
          <Breadcrumbs crumbs={crumbs} />

          <header className="mt-6">
            <p className="text-[14px] text-muted">{[paper.type?.replace(/-/g, ' '), paper.venue, paper.year].filter(Boolean).join(' · ')}</p>
            <h1 className="mt-2 text-balance font-serif text-[30px] font-semibold leading-[1.15] tracking-[-0.015em] text-ink md:text-[38px]">{paper.title}</h1>
            <p className="mt-4 text-[15.5px] leading-[1.6] text-ink-2">
              {record.authors.map((author, index) => (
                <span key={`${author.name}-${index}`}>
                  {index > 0 && ', '}
                  {author.id
                    ? <Link href={`/research/authors/${author.id}`} className={`rounded underline decoration-line-3 underline-offset-4 hover:text-brand ${focusRing}`}>{author.name}</Link>
                    : author.name}
                </span>
              ))}
              {record.moreAuthors > 0 && <span className="text-muted"> and {record.moreAuthors} more</span>}
            </p>
            <p className="mt-4 flex flex-wrap gap-2 text-[13px]">
              <span className="rounded-full bg-soft px-2.5 py-1 text-ink-2">Cited by {(paper.cited_by_count ?? 0).toLocaleString('en-US')}</span>
              {paper.is_oa
                ? <span className="rounded-full bg-green-50 px-2.5 py-1 text-positive">Open access</span>
                : <span className="rounded-full bg-soft px-2.5 py-1 text-muted">Abstract and details only</span>}
            </p>
          </header>

          {paper.is_retracted && (
            <p role="alert" className="mt-6 flex gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14.5px] text-red-800">
              <LuTriangleAlert className="mt-[3px] h-4 w-4 shrink-0" aria-hidden="true" />
              This paper has been retracted. Check the publisher’s retraction notice before you cite it.
            </p>
          )}

          <section aria-labelledby="abstract-title" className="mt-10">
            <h2 id="abstract-title" className="text-[20px] font-semibold text-ink">Abstract</h2>
            {paper.abstract
              ? <p className="mt-3 max-w-[72ch] text-[16px] leading-[1.7] text-ink-2">{paper.abstract}</p>
              : <p className="mt-3 text-[15px] text-muted">The index has no abstract for this paper. {paper.doi ? 'The publisher’s page may have one.' : ''}</p>}
          </section>

          {/* Cite this paper */}
          <section aria-labelledby="cite-title" className="mt-12">
            <h2 id="cite-title" className="text-[20px] font-semibold text-ink">Cite this paper</h2>
            <div className={`mt-4 divide-y divide-line-2 ${box}`}>
              {CITE_FORMATS.map((format) => {
                const text = format.format(cite);
                return (
                  <div key={format.id} className="px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <Link href={format.style} className={`rounded ${label} hover:text-brand ${focusRing}`}>{format.name}</Link>
                      <CopyButton text={plainCitation(text)} label={`Copy ${format.name}`} />
                    </div>
                    <p className="mt-2 pl-8 -indent-8 font-serif text-[15.5px] leading-[1.6] text-ink [overflow-wrap:anywhere]"><Formatted text={text} /></p>
                  </div>
                );
              })}
              <div className="px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <span className={label}>BibTeX</span>
                  <CopyButton text={bib} label="Copy BibTeX" />
                </div>
                <pre className="mt-2 overflow-x-auto rounded-lg bg-soft p-3 text-[13px] leading-[1.5] text-ink-2">{bib}</pre>
              </div>
            </div>
            <p className="mt-3 text-[13.5px] text-muted">Made from the index record. Check names, capitalisation and page numbers against the paper. Need another style? AI for Research has over 10,000.</p>
          </section>

          {related.length > 0 && (
            <section aria-labelledby="related-title" className="mt-12">
              <h2 id="related-title" className="text-[20px] font-semibold text-ink">Related papers</h2>
              <div className="mt-2">{related.map((other) => <PaperListItem key={other.id} paper={other} />)}</div>
            </section>
          )}
        </article>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
          <div className={`${box} p-5`}>
            <p className="text-[15px] font-semibold text-ink">Cite it as you write</p>
            <p className="mt-1.5 text-[14px] leading-[1.55] text-muted">Search this paper in AI for Research and cite it in any style. Your reference list builds itself.</p>
            <div className="mt-4"><ToolCta label="Cite in AI for Research" href="/editor?tool=papers" /></div>
          </div>

          <div className={`${box} p-5`}>
            <p className={label}>Read it</p>
            <ul className="mt-3 grid gap-2 text-[14.5px]">
              {paper.pdf_url && <li><a href={paper.pdf_url} rel="nofollow noopener" target="_blank" className={`inline-flex items-center gap-1 rounded text-brand hover:underline ${focusRing}`}>Free PDF <LuArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></a></li>}
              {paper.doi && <li><a href={`https://doi.org/${paper.doi}`} rel="noopener" target="_blank" className={`inline-flex items-center gap-1 rounded text-brand hover:underline ${focusRing}`}>Publisher’s page (DOI) <LuArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></a></li>}
              {!paper.doi && record.landingUrl && <li><a href={record.landingUrl} rel="nofollow noopener" target="_blank" className={`inline-flex items-center gap-1 rounded text-brand hover:underline ${focusRing}`}>Source page <LuArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></a></li>}
            </ul>
            {!paper.pdf_url && <p className="mt-2 text-[13px] text-muted">No free full text found.</p>}
          </div>

          <div className={`${box} p-5`}>
            <p className={label}>Details</p>
            <dl className="mt-3 grid gap-2.5 text-[14px]">
              {paper.doi && <div><dt className="text-muted">DOI</dt><dd className="break-all text-ink">{paper.doi}</dd></div>}
              {paper.publication_date && <div><dt className="text-muted">Published</dt><dd className="text-ink">{paper.publication_date}</dd></div>}
              {(paper.volume || paper.issue) && <div><dt className="text-muted">Volume and issue</dt><dd className="text-ink">{[paper.volume && `Vol. ${paper.volume}`, paper.issue && `No. ${paper.issue}`].filter(Boolean).join(', ')}</dd></div>}
              {record.referenceCount > 0 && <div><dt className="text-muted">References</dt><dd className="text-ink">{record.referenceCount.toLocaleString('en-US')}</dd></div>}
              <div><dt className="text-muted">Record</dt><dd className="text-ink">OpenAlex {paper.id}</dd></div>
            </dl>
          </div>

          {(record.topics.length > 0 || record.keywords.length > 0) && (
            <div className={`${box} p-5`}>
              <p className={label}>Topics</p>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {[...record.topics.map((topic) => topic.name), ...record.keywords].filter((value, index, all) => all.indexOf(value) === index).slice(0, 10).map((name) => (
                  <li key={name}><Link href={`/research?q=${encodeURIComponent(name)}`} rel="nofollow" prefetch={false} className={`inline-flex rounded-full border border-line px-2.5 py-1 text-[12.5px] text-ink-2 hover:border-brand-100 hover:text-brand ${focusRing}`}>{name}</Link></li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-[12.5px] leading-[1.5] text-subtle">
            Bibliographic data from <a href="https://openalex.org" rel="noopener" target="_blank" className="underline underline-offset-2 hover:text-ink">OpenAlex</a> (CC0). AI for Research does not host this paper.
          </p>
        </aside>
      </div>
    </div>
  );
}
