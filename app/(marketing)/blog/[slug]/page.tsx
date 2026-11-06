import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BlogMarkdown } from '@/components/marketing/BlogMarkdown';
import { pageMetadata } from '@/components/marketing/seo';
import { btnGhost, btnPrimary, container, focusRing } from '@/components/marketing/styles';
import { allPosts, formatDate, getPost, relatedPosts, type BlogPost } from '@/lib/blog';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://app.example.com').replace(/\/+$/, '');

type Props = { params: Promise<{ slug: string }> };

// Every article is known at build time; anything else is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return allPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getPost((await params).slug);
  if (!post) return {};
  const base = pageMetadata({ title: post.title, description: post.description, path: `/blog/${post.slug}`, absolute: true });
  return {
    ...base,
    keywords: [post.primaryKeyword, ...post.secondaryKeywords],
    openGraph: {
      ...base.openGraph,
      type: 'article',
      publishedTime: post.published,
      modifiedTime: post.updated,
      section: post.topic,
      ...(post.byline ? { authors: [post.byline] } : {}),
    },
  };
}

/** Article, FAQ and breadcrumb structured data. `<` is escaped so the text can't close the script tag. */
function structuredData(post: BlogPost) {
  const url = `${SITE_URL}/blog/${post.slug}`;
  const publisher = { '@type': 'Organization', name: 'WriteOrbit', url: SITE_URL, logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon.svg` } };
  const graph = [
    {
      '@type': 'BlogPosting',
      '@id': `${url}#article`,
      headline: post.heading,
      description: post.description,
      url,
      mainEntityOfPage: url,
      datePublished: post.published,
      dateModified: post.updated,
      inLanguage: 'en-US',
      keywords: [post.primaryKeyword, ...post.secondaryKeywords].join(', '),
      articleSection: post.topic,
      image: `${SITE_URL}/screenshots/editor.png`,
      author: post.byline ? { '@type': 'Person', name: post.byline } : publisher,
      publisher,
    },
    {
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: post.faq.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Blog', item: `${SITE_URL}/blog` },
        { '@type': 'ListItem', position: 2, name: post.heading, item: url },
      ],
    },
  ];
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
}

export default async function BlogPostPage({ params }: Props) {
  const post = getPost((await params).slug);
  if (!post) notFound();
  const related = relatedPosts(post);
  const pillar = post.isPillar ? null : allPosts().find((other) => `/blog/${other.slug}` === post.pillar) ?? null;

  return (
    <div className={container}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData(post) }} />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-12 pb-20 pt-8 md:pt-10 lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-16">
        <article className="min-w-0 max-w-[740px]">
          <nav aria-label="Breadcrumb" className="mb-6 text-[13.5px] text-muted">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li><Link href="/blog" className={`rounded hover:text-ink ${focusRing}`}>Blog</Link></li>
              <li aria-hidden="true">/</li>
              <li>
                {pillar
                  ? <Link href={post.pillar} className={`rounded hover:text-ink ${focusRing}`}>{post.topic}</Link>
                  : <span>{post.topic}</span>}
              </li>
            </ol>
          </nav>

          <header>
            <h1 className="text-balance text-[34px] font-bold leading-[1.1] tracking-[-0.03em] text-ink sm:text-[44px]">{post.heading}</h1>
            <p className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-[14px] text-muted">
              {post.byline && <span>By {post.byline}</span>}
              <span>Updated <time dateTime={post.updated}>{formatDate(post.updated)}</time></span>
              <span aria-hidden="true">·</span>
              <span>{post.readingMinutes} min read</span>
            </p>
          </header>

          {post.lead && (
            <div className="mt-8 rounded-2xl border border-brand-100 bg-brand-50/70 px-6 py-5 [&>p]:my-0 [&>p]:text-[17.5px] [&>p]:leading-[1.65] [&>p]:text-ink">
              <p className="sr-only">Short answer:</p>
              <BlogMarkdown markdown={post.lead} />
            </div>
          )}

          <BlogMarkdown markdown={post.rest} />

          <aside aria-label="Try WriteOrbit" className="mt-16 rounded-2xl border border-line bg-gradient-to-br from-brand-50 to-white p-7 sm:p-8">
            <h2 className="text-[22px] font-bold tracking-[-0.02em] text-ink">Write with sources you can check</h2>
            <p className="mt-2 max-w-[560px] text-[16px] leading-relaxed text-ink-2">
              WriteOrbit cites real papers as you write, answers questions about your PDFs with page numbers, and checks claims and sources before you publish.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/signup" className={`${btnPrimary} h-11 px-5 text-[15px]`}>Start writing free</Link>
              <Link href="/features" className={`${btnGhost} h-11 px-5 text-[15px]`}>See the features</Link>
            </div>
          </aside>

          {related.length > 0 && (
            <section aria-labelledby="related-title" className="mt-16">
              <h2 id="related-title" className="mb-4 text-[20px] font-bold tracking-[-0.01em] text-ink">More on {post.topic.toLowerCase()}</h2>
              <ul className="grid gap-4 sm:grid-cols-3">
                {related.map((other) => (
                  <li key={other.slug}>
                    <Link href={`/blog/${other.slug}`} className={`group flex h-full flex-col rounded-2xl border border-line p-5 transition-shadow hover:shadow-[0_10px_30px_-12px_rgba(15,23,42,.25)] ${focusRing}`}>
                      <span className="text-[16px] font-semibold leading-snug text-ink group-hover:text-brand">{other.heading}</span>
                      <span className="mt-auto pt-3 text-[13px] text-muted">{other.readingMinutes} min read</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>

        {post.toc.length > 2 && (
          <nav aria-label="On this page" className="hidden lg:block">
            <div className="sticky top-24">
              <p className="mb-3 text-[11px] font-medium uppercase tracking-[.12em] text-subtle">On this page</p>
              <ul className="max-h-[calc(100dvh-8rem)] space-y-0.5 overflow-y-auto border-l border-line text-[13.5px]">
                {post.toc.map((entry) => (
                  <li key={entry.id}>
                    <a href={`#${entry.id}`} className={`-ml-px block border-l border-transparent py-1.5 pl-4 leading-snug text-muted hover:border-ink hover:text-ink ${focusRing}`}>
                      {entry.text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
