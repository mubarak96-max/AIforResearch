/**
 * One editor feature's page (/features/[slug]), in the order the PRD sets out: breadcrumb, heading,
 * description, product picture, benefits, how it works, inputs, outputs, limits, a labelled
 * example, the call to action, related tools and questions.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';
import { LuArrowRight, LuCheck, LuCircleAlert, LuInfo } from 'react-icons/lu';
import { relatedFeatures, FEATURE_CATEGORIES, type FeaturePage } from '@/lib/features';
import { getTool, TOOL_CATEGORIES, type Tool } from '@/lib/tools';
import { container, focusRing } from './styles';
import { h1, h2, lead, visualPanel } from './landing';
import { Breadcrumbs, FaqList, JsonLd, ToolCta, FeatureVisualFrame, breadcrumbSchema, faqSchema, webAppSchema, type Crumb } from './seoBlocks';

const h3 = 'text-[17px] font-semibold text-ink';

export function featureCrumbs(page: FeaturePage): Crumb[] {
  return [
    { name: 'Features', path: '/features' },
    { name: page.name, path: `/features/${page.slug}` },
  ];
}

function List({ items, icon }: { items: string[]; icon: ReactNode }) {
  return (
    <ul className="mt-3 flex flex-col gap-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5 text-[15px] leading-[1.55] text-ink-2">
          <span className="mt-[3px] shrink-0" aria-hidden="true">{icon}</span>{item}
        </li>
      ))}
    </ul>
  );
}

const cardClass = `group flex h-full flex-col rounded-2xl border border-line bg-surface p-5 transition-shadow hover:shadow-[0_10px_30px_-12px_rgba(15,23,42,.25)] ${focusRing}`;

function Card({ href, kicker, name, short, action, headingLevel = 'h3' }: { href: string; kicker: ReactNode; name: string; short: string; action: string; headingLevel?: 'h2' | 'h3' }) {
  const Heading = headingLevel;
  return (
    <Link href={href} className={cardClass}>
      <span className="text-[12px] font-medium uppercase tracking-[.1em] text-subtle">{kicker}</span>
      <Heading className="mt-2 text-[17px] font-semibold leading-snug text-ink group-hover:text-brand">{name}</Heading>
      <p className="mt-1.5 text-[14.5px] leading-[1.55] text-muted">{short}</p>
      <span className="mt-auto inline-flex items-center gap-1 pt-4 text-[14px] font-medium text-brand">
        {action} <LuArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    </Link>
  );
}

/** A card for an editor feature page. */
export function FeatureCard({ page, headingLevel }: { page: FeaturePage; headingLevel?: 'h2' | 'h3' }) {
  const category = FEATURE_CATEGORIES.find((item) => item.id === page.category)?.name;
  return <Card href={`/features/${page.slug}`} kicker={<>Feature · {category}</>} name={page.name} short={page.short} action="Learn more" headingLevel={headingLevel} />;
}

/** A card for a standalone tool. */
export function ToolCard({ tool, headingLevel }: { tool: Tool; headingLevel?: 'h2' | 'h3' }) {
  const category = TOOL_CATEGORIES.find((item) => item.id === tool.category)?.name;
  return <Card href={`/tools/${tool.slug}`} kicker={<>Free tool · {category}</>} name={tool.name} short={tool.short} action="Use it" headingLevel={headingLevel} />;
}

export function FeatureLanding({ page: tool, children }: { page: FeaturePage; children?: ReactNode }) {
  const path = `/features/${tool.slug}`;
  const related = relatedFeatures(tool);
  const tools = tool.tools.map(getTool).filter((t): t is Tool => Boolean(t));
  const crumbs = featureCrumbs(tool);

  return (
    <>
      <JsonLd
        data={[
          webAppSchema({ name: tool.name, description: tool.description, path, features: tool.benefits.map((benefit) => benefit.title) }),
          breadcrumbSchema(crumbs),
          faqSchema(tool.faq, path),
        ]}
      />

      <section aria-labelledby="page-title" className="pt-8 md:pt-10" style={{ background: 'radial-gradient(900px 340px at 50% -8%, var(--color-brand-50) 0%, transparent 70%)' }}>
        <div className={container}>
          <Breadcrumbs crumbs={crumbs} />
          <div className="grid items-center gap-10 pt-8 md:grid-cols-[1.05fr_1fr] md:gap-14 md:pt-12">
            <div>
              {tool.status === 'beta' && <p className="mb-3 inline-block rounded-full bg-amber-50 px-3 py-1 text-[13px] font-medium text-amber-700">Beta</p>}
              <h1 id="page-title" className={h1}>{tool.heading}</h1>
              <p className={`mt-5 max-w-[560px] ${lead}`}>{tool.intro}</p>
              <div className="mt-7"><ToolCta label={tool.cta.label} href={tool.cta.href} secondary={{ label: 'See pricing', href: '/pricing' }} /></div>
              {tool.planNote && <p className="mt-3 flex gap-1.5 text-[13.5px] text-muted"><LuInfo className="mt-[2px] h-4 w-4 shrink-0" aria-hidden="true" />{tool.planNote}</p>}
            </div>
            <div className={visualPanel}><FeatureVisualFrame visual={tool.visual} /></div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section aria-labelledby="benefits-title" className={`${container} pt-20 md:pt-28`}>
        <h2 id="benefits-title" className={`max-w-[640px] ${h2}`}>Why use {tool.name.toLowerCase()}</h2>
        <ul className="mt-8 grid gap-6 md:grid-cols-3">
          {tool.benefits.map((benefit) => (
            <li key={benefit.title} className="rounded-2xl border border-line p-6">
              <h3 className={h3}>{benefit.title}</h3>
              <p className="mt-2 text-[15px] leading-[1.6] text-muted">{benefit.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* How it works */}
      <section aria-labelledby="steps-title" className={`${container} pt-20 md:pt-28`}>
        <h2 id="steps-title" className={h2}>How it works</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {tool.steps.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-50 font-serif text-[17px] font-semibold text-brand" aria-hidden="true">{index + 1}</span>
              <div>
                <h3 className={h3}>{step.title}</h3>
                <p className="mt-1.5 text-[15px] leading-[1.6] text-muted">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Inputs, outputs, limits */}
      <section aria-labelledby="details-title" className={`${container} pt-20 md:pt-28`}>
        <h2 id="details-title" className={h2}>What goes in, what comes out</h2>
        <div className="mt-8 grid gap-8 md:grid-cols-3">
          <div>
            <h3 className={h3}>You give it</h3>
            <List items={tool.inputs} icon={<LuCheck className="h-4 w-4 text-green-600" />} />
          </div>
          <div>
            <h3 className={h3}>You get</h3>
            <List items={tool.outputs} icon={<LuCheck className="h-4 w-4 text-green-600" />} />
          </div>
          <div>
            <h3 className={h3}>Good to know</h3>
            <List items={tool.limitations} icon={<LuCircleAlert className="h-4 w-4 text-amber" />} />
          </div>
        </div>
      </section>

      {/* Example */}
      <section aria-labelledby="example-title" className={`${container} pt-20 md:pt-28`}>
        <h2 id="example-title" className={h2}>An example</h2>
        <figure className="mt-8 max-w-[820px] overflow-hidden rounded-2xl border border-line">
          <div className="border-b border-line bg-soft px-6 py-4">
            <p className="text-[12px] font-medium uppercase tracking-[.1em] text-subtle">You enter</p>
            <p className="mt-1 text-[15.5px] text-ink">{tool.example.input}</p>
          </div>
          <div className="px-6 py-4">
            <p className="text-[12px] font-medium uppercase tracking-[.1em] text-subtle">AI for Research returns</p>
            <p className="mt-1 text-[15.5px] leading-[1.6] text-ink-2">{tool.example.output}</p>
          </div>
          <figcaption className="border-t border-line-2 px-6 py-3 text-[13px] italic text-muted">Illustrative example. Real results depend on your sources and wording.</figcaption>
        </figure>
      </section>

      {children}

      {/* Questions */}
      <section aria-labelledby="faq-title" className={`${container} pt-20 md:pt-28`}>
        <div className="grid gap-8 md:grid-cols-[1fr_1.6fr] md:gap-16">
          <div>
            <h2 id="faq-title" className={h2}>Questions</h2>
            <p className="mt-3 text-[15px] text-muted">More in the <Link href="/help" className="text-ink underline underline-offset-4 hover:text-brand">help center</Link>.</p>
          </div>
          <FaqList faq={tool.faq} />
        </div>
      </section>

      {/* Free tools for this, then related features */}
      {tools.length > 0 && (
        <section aria-labelledby="tools-title" className={`${container} pt-20 md:pt-28`}>
          <h2 id="tools-title" className="text-[24px] font-semibold tracking-[-0.01em] text-ink">Free tools for this</h2>
          <p className="mt-2 text-[15px] text-muted">They work right on the page, no account needed.</p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((other) => <li key={other.slug}><ToolCard tool={other} /></li>)}
          </ul>
        </section>
      )}
      {related.length > 0 && (
        <section aria-labelledby="related-title" className={`${container} pt-16 md:pt-20`}>
          <h2 id="related-title" className="text-[24px] font-semibold tracking-[-0.01em] text-ink">Related features</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((other) => <li key={other.slug}><FeatureCard page={other} /></li>)}
          </ul>
          <p className="mt-6"><Link href="/features" className={`inline-flex items-center gap-1.5 rounded text-[14.5px] font-medium text-brand hover:text-brand-600 ${focusRing}`}>All features <LuArrowRight className="h-4 w-4" aria-hidden="true" /></Link></p>
        </section>
      )}

      {/* Closing call to action */}
      <section aria-labelledby="cta-title" className={`${container} pb-20 pt-24 text-center md:pb-28 md:pt-32`}>
        <h2 id="cta-title" className={`mx-auto max-w-[640px] ${h2}`}>Try it in the editor, free</h2>
        <p className={`mx-auto mt-4 max-w-[440px] ${lead}`}>No credit card needed. Upgrade when you need more.</p>
        <div className="mt-7 flex justify-center"><ToolCta label={tool.cta.label} href={tool.cta.href} /></div>
      </section>
    </>
  );
}

