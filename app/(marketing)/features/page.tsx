import Link from 'next/link';
import { pageMetadata } from '@/components/marketing/seo';
import { container, focusRing } from '@/components/marketing/styles';
import { AudienceSection, ComparisonBand, FEATURES, FinalCta, PageIntro, Points, StartButton, h2Item, visualPanel } from '@/components/marketing/landing';
import { FigCaption } from '@/components/marketing/Marginalia';
import { FeatureCard } from '@/components/marketing/FeatureLanding';
import { activeFeatureCategories, FEATURE_PAGES } from '@/lib/features';
import { LandingGrid } from '@/components/marketing/MarkdownLanding';
import { landingPages } from '@/lib/landingPages';

export const metadata = pageMetadata({
  title: 'Features: AI writing, citations and claim check',
  path: '/features',
  description:
    'AI autocomplete that cites real papers, citations in 10,000+ styles, chat with your PDFs, claim check before you submit, and Word, PDF and LaTeX export.',
});

export default function FeaturesPage() {
  return (
    <>
      <PageIntro title="Everything you need to write, cite and submit" intro="One editor to write, cite, check and export. Every reference is a real paper you can open.">
        <StartButton />
      </PageIntro>

      {/* Jump links to each feature. */}
      <nav aria-label="Features on this page" className={`${container} pt-10`}>
        <ul className="mx-auto flex max-w-[860px] flex-wrap justify-center gap-2">
          {FEATURES.map((feature) => (
            <li key={feature.id}>
              <a href={`#${feature.id}`} className={`inline-flex h-9 items-center gap-2 rounded-full border border-line bg-surface px-3.5 text-[13.5px] text-ink-2 hover:border-brand-100 hover:text-brand ${focusRing}`}>
                <span className="text-brand [&>svg]:h-4 [&>svg]:w-4" aria-hidden="true">{feature.icon}</span>{feature.name}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className={`${container} flex flex-col gap-20 pt-16 md:gap-28 md:pt-24`}>
        {FEATURES.map((feature, index) => (
          <section key={feature.id} id={feature.id} aria-labelledby={`${feature.id}-title`} className="grid scroll-mt-8 items-center gap-8 md:grid-cols-2 md:gap-14">
            <div className={index % 2 ? 'md:order-2' : ''}>
              <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand" aria-hidden="true">{feature.icon}</span>
              <h2 id={`${feature.id}-title`} className={`mt-4 ${h2Item}`}>{feature.title}</h2>
              <p className="mt-3 max-w-[460px] text-[15px] leading-[1.6] text-muted md:text-[16px]">{feature.body}</p>
              <Points items={feature.points} />
            </div>
            <div className={`min-w-0 ${index % 2 ? 'md:order-1' : ''}`}>
              <div className={visualPanel}>{feature.visual}</div>
              <FigCaption n={index + 1}>{feature.short}</FigCaption>
            </div>
          </section>
        ))}
      </div>

      {/* One page per feature */}
      <section aria-labelledby="all-features-title" className={`${container} pt-24 md:pt-32`}>
        <h2 id="all-features-title" className="text-balance font-serif text-[30px] font-semibold leading-[1.12] tracking-[-0.02em] text-ink md:text-[40px]">Every feature, in detail</h2>
        <div className="mt-10 flex flex-col gap-12">
          {landingPages('features').length > 0 && (
            <div>
              <h3 className="text-[18px] font-semibold text-ink">Workspaces</h3>
              <p className="mt-1 text-[14.5px] text-muted">Deep research, reviews, proposals, theses, data and slides.</p>
              <div className="mt-4"><LandingGrid pages={landingPages('features')} /></div>
            </div>
          )}
          {activeFeatureCategories().map((category) => (
            <div key={category.id}>
              <h3 className="text-[18px] font-semibold text-ink">{category.name}</h3>
              <p className="mt-1 text-[14.5px] text-muted">{category.blurb}</p>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {FEATURE_PAGES.filter((page) => page.category === category.id).map((page) => <li key={page.slug}><FeatureCard page={page} headingLevel="h3" /></li>)}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-10 text-[15px] text-muted">Want to try something without an account? See the <Link href="/tools" className="text-ink underline underline-offset-4 hover:text-brand">free tools</Link>.</p>
      </section>

      <ComparisonBand />
      <AudienceSection />

      <p className={`${container} pt-12 text-center text-[15px] text-muted`}>
        See the three steps in <Link href="/how-it-works" className="text-ink underline underline-offset-4 hover:text-brand">How it works</Link>, or every shortcut in the <Link href="/help" className="text-ink underline underline-offset-4 hover:text-brand">help center</Link>.
      </p>

      <FinalCta />
    </>
  );
}
