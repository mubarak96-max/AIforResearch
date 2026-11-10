/**
 * A standalone tool's page (/tools/[slug]): the working tool first, then how it works, limits,
 * questions and related tools and features. Server component; the tool itself is a client island.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';
import { LuArrowRight, LuCircleAlert } from 'react-icons/lu';
import { getFeaturePage, type FeaturePage } from '@/lib/features';
import { relatedTools, type Tool } from '@/lib/tools';
import { container, focusRing } from '@/components/marketing/styles';
import { h2, lead } from '@/components/marketing/landing';
import { Breadcrumbs, FaqList, JsonLd, breadcrumbSchema, faqSchema, webAppSchema } from '@/components/marketing/seoBlocks';
import { FeatureCard, ToolCard } from '@/components/marketing/FeatureLanding';
import { SITE_URL } from '@/lib/site';
import { AiTool } from './AiTool';
import { CitationGenerator } from './CitationGenerator';
import { DataAnalysis } from './DataAnalysis';
import { PatternChecker } from './PatternChecker';
import { PdfTools } from './PdfTools';

export function ToolRunner({ tool, defaultStyle }: { tool: Tool; defaultStyle?: string }) {
  switch (tool.kind) {
    case 'ai': return <AiTool tool={{ slug: tool.slug, name: tool.name, fields: tool.fields, submitLabel: tool.submitLabel, grounded: tool.grounded, toEditor: tool.toEditor }} />;
    case 'citation': return <CitationGenerator defaultStyle={defaultStyle} />;
    case 'patterns': return <PatternChecker />;
    case 'data': return <DataAnalysis />;
    case 'pdf': return <PdfTools />;
  }
}

export function ToolPage({ tool, heading, intro, description, faq: faqOverride, crumbs, path, defaultStyle, children }: {
  tool: Tool;
  heading?: string;
  intro?: string;
  description?: string;
  faq?: { q: string; a: string }[];
  crumbs?: { name: string; path: string }[];
  path?: string;
  defaultStyle?: string;
  /** Extra sections after the tool (the citation style pages put their examples here). */
  children?: ReactNode;
}) {
  const url = path ?? `/tools/${tool.slug}`;
  const trail = crumbs ?? [{ name: 'Tools', path: '/tools' }, { name: tool.name, path: url }];
  const features = tool.features.map(getFeaturePage).filter((page): page is FeaturePage => Boolean(page));
  const related = relatedTools(tool);
  const faq = faqOverride ?? tool.faq;

  return (
    <>
      <JsonLd
        data={[
          webAppSchema({ name: tool.name, description: description ?? tool.description, path: url }),
          {
            '@type': 'HowTo',
            '@id': `${SITE_URL}${url}#howto`,
            name: `How to use the ${tool.name.toLowerCase()}`,
            step: tool.steps.map((step) => ({ '@type': 'HowToStep', name: step.title, text: step.body })),
          },
          breadcrumbSchema(trail),
          faqSchema(faq, url),
        ]}
      />

      <section aria-labelledby="page-title" className="pt-8 md:pt-10" style={{ background: 'radial-gradient(900px 340px at 50% -8%, var(--color-brand-50) 0%, transparent 70%)' }}>
        <div className={container}>
          <Breadcrumbs crumbs={trail} />
          <div className="mx-auto max-w-[880px] pt-8 text-center md:pt-10">
            <p className="text-[13px] font-medium uppercase tracking-[.1em] text-brand">Free tool</p>
            <h1 id="page-title" className="mt-2 text-balance font-serif text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink sm:text-[40px] md:text-[46px]">{heading ?? tool.heading}</h1>
            <p className={`mx-auto mt-4 max-w-[640px] ${lead}`}>{intro ?? tool.intro}</p>
          </div>
          <div className="mx-auto mt-8 max-w-[880px] rounded-[22px] border border-line bg-page p-5 shadow-[0_20px_50px_-30px_rgba(15,23,42,.35)] sm:p-7">
            <ToolRunner tool={tool} defaultStyle={defaultStyle} />
          </div>
        </div>
      </section>

      {children}

      <section aria-labelledby="steps-title" className={`${container} pt-20 md:pt-24`}>
        <h2 id="steps-title" className={h2}>How to use it</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {tool.steps.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-50 font-serif text-[17px] font-semibold text-brand" aria-hidden="true">{index + 1}</span>
              <div>
                <h3 className="text-[17px] font-semibold text-ink">{step.title}</h3>
                <p className="mt-1.5 text-[15px] leading-[1.6] text-muted">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="limits-title" className={`${container} pt-16 md:pt-20`}>
        <h2 id="limits-title" className="text-[22px] font-semibold text-ink">Good to know</h2>
        <ul className="mt-4 flex max-w-[760px] flex-col gap-2.5">
          {tool.limitations.map((item) => (
            <li key={item} className="flex gap-2.5 text-[15px] leading-[1.55] text-ink-2"><LuCircleAlert className="mt-[3px] h-4 w-4 shrink-0 text-amber" aria-hidden="true" />{item}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="faq-title" className={`${container} pt-20 md:pt-24`}>
        <div className="grid gap-8 md:grid-cols-[1fr_1.6fr] md:gap-16">
          <div>
            <h2 id="faq-title" className={h2}>Questions</h2>
            <p className="mt-3 text-[15px] text-muted">More in the <Link href="/help" className="text-ink underline underline-offset-4 hover:text-brand">help center</Link>.</p>
          </div>
          <FaqList faq={faq} />
        </div>
      </section>

      {(features.length > 0 || related.length > 0) && (
        <section aria-labelledby="more-title" className={`${container} pb-20 pt-20 md:pb-28 md:pt-24`}>
          <h2 id="more-title" className="text-[24px] font-semibold tracking-[-0.01em] text-ink">Go further</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((other) => <li key={other.slug}><ToolCard tool={other} /></li>)}
            {features.map((page) => <li key={page.slug}><FeatureCard page={page} /></li>)}
          </ul>
          <p className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/tools" className={`inline-flex items-center gap-1.5 rounded text-[14.5px] font-medium text-brand hover:text-brand-600 ${focusRing}`}>All free tools <LuArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            <Link href="/features" className={`inline-flex items-center gap-1.5 rounded text-[14.5px] font-medium text-brand hover:text-brand-600 ${focusRing}`}>Editor features <LuArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </p>
        </section>
      )}
    </>
  );
}
