/**
 * Building blocks for the discoverability pages (/tools, /research): JSON-LD, breadcrumbs with
 * their structured data, an FAQ list, citation markup and the sign-up-aware call to action.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';
import { LuArrowRight, LuChevronRight, LuPlus } from 'react-icons/lu';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { signupHref } from '@/lib/features';
import { AuthAware } from './AuthAware';
import { btnGhost, btnPrimary, focusRing } from './styles';
import { AutocompleteVisual, ChatVisual, ExportVisual, FindPapersVisual, ImportVisual, PhoneVisual, ReviewVisual } from './LandingVisuals';
import type { FeatureVisual } from '@/lib/features';

/** One or more schema.org objects. `<` is escaped so text can't close the script tag. */
export function JsonLd({ data }: { data: object | object[] }) {
  const graph = Array.isArray(data) ? data : [data];
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

export type Crumb = { name: string; path: string };

export const ORGANIZATION_REF = { '@id': `${SITE_URL}/#organization` };

export function breadcrumbSchema(crumbs: Crumb[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({ '@type': 'ListItem', position: index + 1, name: crumb.name, item: `${SITE_URL}${crumb.path}` })),
  };
}

export function faqSchema(faq: { q: string; a: string }[], path: string) {
  return {
    '@type': 'FAQPage',
    '@id': `${SITE_URL}${path}#faq`,
    mainEntity: faq.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  };
}

/** The product as a web app, for a tool or style page. */
export function webAppSchema({ name, description, path, features }: { name: string; description: string; path: string; features?: string[] }) {
  return {
    '@type': 'WebApplication',
    '@id': `${SITE_URL}${path}#app`,
    name: `${SITE_NAME} ${name}`,
    url: `${SITE_URL}${path}`,
    description,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    browserRequirements: 'Requires a modern web browser',
    isPartOf: { '@id': `${SITE_URL}/#website` },
    publisher: ORGANIZATION_REF,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', description: 'Free plan available' },
    ...(features?.length ? { featureList: features } : {}),
  };
}

/** Visible breadcrumb trail. The last crumb is the current page. */
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-[13.5px] text-muted">
      <ol className="flex flex-wrap items-center gap-1">
        {crumbs.map((crumb, index) => (
          <li key={crumb.path} className="flex min-w-0 items-center gap-1">
            {index > 0 && <LuChevronRight className="h-3.5 w-3.5 shrink-0 text-subtle" aria-hidden="true" />}
            {index === crumbs.length - 1
              ? <span aria-current="page" className="truncate text-ink-2">{crumb.name}</span>
              : <Link href={crumb.path} className={`rounded hover:text-ink ${focusRing}`}>{crumb.name}</Link>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Questions that open in place, styled like the home page's. */
export function FaqList({ faq }: { faq: { q: string; a: string }[] }) {
  return (
    <div className="border-t border-line">
      {faq.map((item) => (
        <details key={item.q} className="group border-b border-line">
          <summary className={`flex cursor-pointer list-none items-center gap-4 py-5 text-[16px] font-medium text-ink [&::-webkit-details-marker]:hidden ${focusRing}`}>
            <h3 className="flex-1">{item.q}</h3>
            <LuPlus className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-45" aria-hidden="true" />
          </summary>
          <p className="-mt-1 pb-5 pr-8 text-[15px] leading-[1.6] text-muted">{item.a}</p>
        </details>
      ))}
    </div>
  );
}

export { Formatted, plainCitation } from './Formatted';

const ctaClass = `${btnPrimary} h-11 rounded-[10px] px-5 text-[15px]`;

/** The tool's button: straight into the app when signed in, through sign-up (then on to it) when not. */
export function ToolCta({ label, href, secondary }: { label: string; href: string; secondary?: { label: string; href: string } }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <AuthAware
        signedIn={<Link href={href} className={ctaClass}>{label} <LuArrowRight className="h-4 w-4" aria-hidden="true" /></Link>}
        signedOut={<Link href={signupHref(href)} className={ctaClass}>{label} <LuArrowRight className="h-4 w-4" aria-hidden="true" /></Link>}
      />
      {secondary && <Link href={secondary.href} className={`${btnGhost} h-11 rounded-[10px] px-5 text-[15px]`}>{secondary.label}</Link>}
    </div>
  );
}

const VISUALS: Record<FeatureVisual, () => ReactNode> = {
  autocomplete: AutocompleteVisual,
  'find-papers': FindPapersVisual,
  chat: ChatVisual,
  review: ReviewVisual,
  import: ImportVisual,
  export: ExportVisual,
  phone: PhoneVisual,
};

export function FeatureVisualFrame({ visual }: { visual: FeatureVisual }) {
  const Visual = VISUALS[visual];
  return <Visual />;
}
