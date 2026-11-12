/**
 * A long-form landing page from content/pages (lib/landingPages): breadcrumb, heading and intro,
 * the working Ask box or a call to action, the plan note, the Markdown body, questions, related
 * links and a closing call to action. Same type and colour as the feature pages.
 */
import Link from 'next/link';
import { LuArrowRight, LuInfo } from 'react-icons/lu';
import { BlogMarkdown } from './BlogMarkdown';
import { HeroAsk } from './home/HeroAsk';
import { container, focusRing } from './styles';
import { h1, h2, lead } from './landing';
import { Breadcrumbs, FaqList, JsonLd, ToolCta, breadcrumbSchema, faqSchema, type Crumb } from './seoBlocks';
import { SECTION_NAMES, landingPath, type LandingPageSource } from '@/lib/landingPages';
import { SITE_URL } from '@/lib/site';

function webPageSchema(page: LandingPageSource) {
  const url = `${SITE_URL}${landingPath(page)}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${url}#page`,
    url,
    name: page.heading,
    description: page.description,
    inLanguage: 'en-US',
    dateModified: page.updated,
    keywords: [page.primaryKeyword, ...page.secondaryKeywords].join(', '),
    isPartOf: { '@id': `${SITE_URL}/#website` },
    publisher: { '@id': `${SITE_URL}/#organization` },
  };
}

/** A readable name for a related path: the last part of the URL. */
function relatedName(path: string) {
  const last = path.split('/').filter(Boolean).pop() ?? path;
  const words = last.replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function MarkdownLanding({ page }: { page: LandingPageSource }) {
  const path = landingPath(page);
  const crumbs: Crumb[] = [
    { name: SECTION_NAMES[page.section], path: `/${page.section}` },
    { name: page.heading, path },
  ];

  return (
    <>
      <JsonLd data={[webPageSchema(page), breadcrumbSchema(crumbs), faqSchema(page.faq, path)]} />

      <section aria-labelledby="page-title" className="pt-8 md:pt-10" style={{ background: 'radial-gradient(900px 340px at 50% -8%, var(--color-brand-50) 0%, transparent 70%)' }}>
        <div className={container}>
          <Breadcrumbs crumbs={crumbs} />
          <div className="mx-auto max-w-[820px] pt-8 text-center md:pt-12">
            <h1 id="page-title" className={h1}>{page.heading}</h1>
            <p className={`mx-auto mt-5 max-w-[640px] ${lead}`}>{page.intro}</p>
          </div>
          {page.hero === 'ask' ? (
            <div className="mx-auto mt-8 max-w-[760px]"><HeroAsk /></div>
          ) : (
            <div className="mt-7 flex justify-center"><ToolCta label={page.cta.label} href={page.cta.href} secondary={{ label: 'See pricing', href: '/pricing' }} /></div>
          )}
          {page.planNote && (
            <p className="mx-auto mt-4 flex max-w-[640px] justify-center gap-1.5 text-center text-[13.5px] text-muted">
              <LuInfo className="mt-[2px] h-4 w-4 shrink-0" aria-hidden="true" />{page.planNote}
            </p>
          )}
        </div>
      </section>

      <article className={`${container} pt-16 md:pt-20`}>
        <div className="mx-auto max-w-[720px]">
          <BlogMarkdown markdown={page.body} />
          <p className="mt-10 text-[13.5px] text-subtle">Last updated {page.updated}</p>
        </div>
      </article>

      <section aria-labelledby="faq-title" className={`${container} pt-20 md:pt-28`}>
        <div className="grid gap-8 md:grid-cols-[1fr_1.6fr] md:gap-16">
          <div>
            <h2 id="faq-title" className={h2}>Questions</h2>
            <p className="mt-3 text-[15px] text-muted">More in the <Link href="/help" className="text-ink underline underline-offset-4 hover:text-brand">help center</Link>.</p>
          </div>
          <FaqList faq={page.faq} />
        </div>
      </section>

      {page.related.length > 0 && (
        <section aria-labelledby="related-title" className={`${container} pt-16 md:pt-20`}>
          <h2 id="related-title" className="text-[24px] font-semibold tracking-[-0.01em] text-ink">Related</h2>
          <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
            {page.related.map((href) => (
              <li key={href}>
                <Link href={href} className={`inline-flex items-center gap-1.5 rounded text-[15px] font-medium text-brand hover:text-brand-600 ${focusRing}`}>
                  {relatedName(href)} <LuArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="cta-title" className={`${container} pb-20 pt-24 text-center md:pb-28 md:pt-32`}>
        <h2 id="cta-title" className={`mx-auto max-w-[640px] ${h2}`}>Start free</h2>
        <p className={`mx-auto mt-4 max-w-[440px] ${lead}`}>No credit card needed. Upgrade when you need more.</p>
        <div className="mt-7 flex justify-center"><ToolCta label={page.cta.label} href={page.cta.href} /></div>
      </section>
    </>
  );
}

const cardClass = `group flex h-full flex-col rounded-2xl border border-line bg-surface p-5 transition-shadow hover:shadow-[0_10px_30px_-12px_rgba(15,23,42,.25)] ${focusRing}`;

/** A card linking to a landing page, for index pages. */
export function LandingCard({ page }: { page: LandingPageSource }) {
  return (
    <Link href={landingPath(page)} className={cardClass}>
      <h3 className="text-[17px] font-semibold leading-snug text-ink group-hover:text-brand">{page.heading}</h3>
      <p className="mt-1.5 text-[14.5px] leading-[1.55] text-muted">{page.intro}</p>
      <span className="mt-auto inline-flex items-center gap-1 pt-4 text-[14px] font-medium text-brand">
        Read more <LuArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    </Link>
  );
}

/** A grid of landing page cards. */
export function LandingGrid({ pages }: { pages: LandingPageSource[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {pages.map((page) => <li key={landingPath(page)}><LandingCard page={page} /></li>)}
    </ul>
  );
}
