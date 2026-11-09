import type { Metadata } from 'next';
import Link from 'next/link';
import { cache } from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import { LuArrowUpRight, LuInfo } from 'react-icons/lu';
import { pageMetadata } from '@/components/marketing/seo';
import { container, focusRing } from '@/components/marketing/styles';
import { Breadcrumbs, JsonLd, breadcrumbSchema } from '@/components/marketing/seoBlocks';
import { PaperListItem } from '@/components/marketing/PaperListItem';
import { AUTHOR_ID, getAuthorRecord, getAuthorWorks, type AuthorRecord } from '@/lib/server/lib/directory';
import { SITE_URL } from '@/lib/site';

type Props = { params: Promise<{ id: string }> };

export const revalidate = 86400;

const loadAuthor = cache((id: string) => getAuthorRecord(id));

async function resolve(params: Props['params']): Promise<AuthorRecord> {
  const raw = (await params).id;
  const id = raw.toUpperCase();
  if (!AUTHOR_ID.test(id)) notFound();
  if (raw !== id) permanentRedirect(`/research/authors/${id}`);
  const record = await loadAuthor(id);
  if (!record) notFound();
  return record;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const author = await resolve(params);
  const where = author.institution ? ` (${author.institution})` : '';
  const description = `Papers by ${author.name}${where}: ${author.worksCount.toLocaleString('en-US')} works cited ${author.citedByCount.toLocaleString('en-US')} times${author.topics.length ? `, on ${author.topics.slice(0, 3).join(', ')}` : ''}. Cite any of them in one click.`;
  const base = pageMetadata({ title: `${author.name}: papers and citations`, description: description.slice(0, 160), path: `/research/authors/${author.id}` });
  // An author with a single work is usually a name fragment, not a researcher worth a page in search.
  return author.worksCount < 2 ? { ...base, robots: { index: false, follow: true } } : { ...base, openGraph: { ...base.openGraph, type: 'profile' } };
}

const box = 'rounded-2xl border border-line bg-surface';
const label = 'text-[12px] font-medium uppercase tracking-[.1em] text-subtle';

export default async function AuthorPage({ params }: Props) {
  const author = await resolve(params);
  const works = await getAuthorWorks(author.id, 15).catch(() => []);
  const url = `${SITE_URL}/research/authors/${author.id}`;
  const crumbs = [
    { name: 'Research', path: '/research' },
    { name: author.name, path: `/research/authors/${author.id}` },
  ];

  return (
    <div className={container}>
      <JsonLd
        data={[
          {
            '@type': 'ProfilePage',
            '@id': `${url}#page`,
            url,
            mainEntity: {
              '@type': 'Person',
              name: author.name,
              ...(author.otherNames.length ? { alternateName: author.otherNames } : {}),
              ...(author.institution ? { affiliation: { '@type': 'Organization', name: author.institution } } : {}),
              ...(author.orcid ? { sameAs: `https://orcid.org/${author.orcid}`, identifier: { '@type': 'PropertyValue', propertyID: 'ORCID', value: author.orcid } } : {}),
              ...(author.topics.length ? { knowsAbout: author.topics } : {}),
            },
          },
          breadcrumbSchema(crumbs),
        ]}
      />

      <div className="grid gap-12 pb-20 pt-8 md:pt-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-16">
        <div className="min-w-0">
          <Breadcrumbs crumbs={crumbs} />
          <header className="mt-6">
            <p className="text-[14px] text-muted">Author{author.institution ? ` · ${author.institution}` : ''}</p>
            <h1 className="mt-2 font-serif text-[32px] font-semibold leading-[1.15] tracking-[-0.015em] text-ink md:text-[40px]">{author.name}</h1>
            <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
              <div><dt className="text-[13px] text-muted">Works</dt><dd className="text-[20px] font-semibold text-ink">{author.worksCount.toLocaleString('en-US')}</dd></div>
              <div><dt className="text-[13px] text-muted">Cited by</dt><dd className="text-[20px] font-semibold text-ink">{author.citedByCount.toLocaleString('en-US')}</dd></div>
              {author.hIndex !== null && <div><dt className="text-[13px] text-muted">h-index</dt><dd className="text-[20px] font-semibold text-ink">{author.hIndex}</dd></div>}
            </dl>
          </header>

          <section aria-labelledby="works-title" className="mt-10">
            <h2 id="works-title" className="text-[20px] font-semibold text-ink">Most-cited papers</h2>
            {works.length
              ? <div className="mt-2">{works.map((paper) => <PaperListItem key={paper.id} paper={paper} />)}</div>
              : <p className="mt-3 text-[15px] text-muted">The index lists no papers for this author right now.</p>}
          </section>
        </div>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
          {author.topics.length > 0 && (
            <div className={`${box} p-5`}>
              <p className={label}>Research topics</p>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {author.topics.map((topic) => (
                  <li key={topic}><Link href={`/research?q=${encodeURIComponent(topic)}`} className={`inline-flex rounded-full border border-line px-2.5 py-1 text-[12.5px] text-ink-2 hover:border-brand-100 hover:text-brand ${focusRing}`}>{topic}</Link></li>
                ))}
              </ul>
            </div>
          )}
          <div className={`${box} p-5`}>
            <p className={label}>Identity</p>
            <dl className="mt-3 grid gap-2.5 text-[14px]">
              {author.orcid && (
                <div><dt className="text-muted">ORCID</dt><dd><a href={`https://orcid.org/${author.orcid}`} rel="noopener" target="_blank" className={`inline-flex items-center gap-1 rounded text-brand hover:underline ${focusRing}`}>{author.orcid} <LuArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></a></dd></div>
              )}
              {author.otherNames.length > 0 && <div><dt className="text-muted">Also published as</dt><dd className="text-ink">{author.otherNames.join(', ')}</dd></div>}
              <div><dt className="text-muted">Record</dt><dd className="text-ink">OpenAlex {author.id}</dd></div>
            </dl>
            <p className="mt-4 flex gap-1.5 text-[12.5px] leading-[1.5] text-muted">
              <LuInfo className="mt-[2px] h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Author profiles are matched automatically by OpenAlex. People with similar names can be merged or split. {author.orcid ? '' : 'There is no ORCID on this profile to confirm it.'}
            </p>
          </div>
          <p className="text-[12.5px] leading-[1.5] text-subtle">
            Data from <a href="https://openalex.org" rel="noopener" target="_blank" className="underline underline-offset-2 hover:text-ink">OpenAlex</a> (CC0). Corrections go to OpenAlex.
          </p>
        </aside>
      </div>
    </div>
  );
}
