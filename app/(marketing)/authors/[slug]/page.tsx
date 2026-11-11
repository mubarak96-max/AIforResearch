import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { pageMetadata } from '@/components/marketing/seo';
import { container, focusRing } from '@/components/marketing/styles';
import { AUTHORS, authorPath, getAuthorBySlug, personSchema } from '@/lib/authors';
import { allPosts, formatDate } from '@/lib/blog';
import { SITE_URL } from '@/lib/site';

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return AUTHORS.map((author) => ({ slug: author.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const author = getAuthorBySlug((await params).slug);
  if (!author) return {};
  const base = pageMetadata({ title: `${author.name}, ${author.jobTitle}`, description: author.shortBio, path: authorPath(author) });
  return { ...base, openGraph: { ...base.openGraph, type: 'profile', images: [{ url: author.image, width: 400, height: 400, alt: author.name }] } };
}

export default async function AuthorPage({ params }: Props) {
  const author = getAuthorBySlug((await params).slug);
  if (!author) notFound();
  const posts = allPosts()
    .filter((post) => post.byline === author.key)
    .sort((a, b) => b.updated.localeCompare(a.updated));
  const url = `${SITE_URL}${authorPath(author)}`;

  const structuredData = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': `${url}#page`,
    url,
    name: author.name,
    mainEntity: personSchema(author),
    hasPart: posts.map((post) => ({ '@type': 'BlogPosting', headline: post.heading, url: `${SITE_URL}/blog/${post.slug}`, datePublished: post.published, dateModified: post.updated })),
  }).replace(/</g, '\\u003c');

  return (
    <div className={container}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />
      <div className="max-w-[760px] pb-24 pt-10 md:pt-[46px]">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={author.image} alt={author.name} width={128} height={128} className="h-32 w-32 shrink-0 rounded-full object-cover" />
          <div>
            <h1 className="text-[34px] font-bold leading-[1.1] tracking-[-0.03em] text-ink sm:text-[42px]">{author.name}</h1>
            <p className="mt-2 text-[16px] text-muted">{author.jobTitle}</p>
            <p className="mt-3 flex flex-wrap gap-x-4 text-[14.5px]">
              {author.sameAs.map((profile) => (
                <a key={profile.url} href={profile.url} target="_blank" rel="noopener me" className={`rounded text-ink underline underline-offset-4 hover:text-brand ${focusRing}`}>{profile.label}</a>
              ))}
            </p>
          </div>
        </header>

        <section aria-labelledby="bio-title" className="mt-10">
          <h2 id="bio-title" className="mb-3 text-[22px] font-bold tracking-[-0.02em] text-ink">About</h2>
          <div className="space-y-3 text-[16.5px] leading-relaxed text-ink-2">
            {author.bio.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
        </section>

        <section aria-labelledby="background-title" className="mt-10">
          <h2 id="background-title" className="mb-3 text-[22px] font-bold tracking-[-0.02em] text-ink">Background</h2>
          <ul className="space-y-1.5 text-[16px] leading-relaxed text-ink-2 [&_li]:ml-5 [&_li]:list-disc">
            {author.credentials.map((credential) => <li key={credential}>{credential}</li>)}
            <li>Writes about: {author.knowsAbout.join(', ').toLowerCase()}</li>
          </ul>
          <p className="mt-4 text-[15px] text-muted">
            How we research and update articles: <Link href="/about#editorial" className={`rounded text-ink underline underline-offset-4 hover:text-brand ${focusRing}`}>editorial standards</Link>.
          </p>
        </section>

        {posts.length > 0 && (
          <section aria-labelledby="articles-title" className="mt-12">
            <h2 id="articles-title" className="mb-4 text-[22px] font-bold tracking-[-0.02em] text-ink">Articles by {author.name.split(' ')[0]} ({posts.length})</h2>
            <ul className="divide-y divide-line border-y border-line">
              {posts.map((post) => (
                <li key={post.slug}>
                  <Link href={`/blog/${post.slug}`} className={`group flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6 ${focusRing}`}>
                    <span className="text-[16px] font-semibold leading-snug text-ink group-hover:text-brand">{post.heading}</span>
                    <span className="shrink-0 text-[13px] text-muted">Updated {formatDate(post.updated)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
