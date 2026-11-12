import Link from 'next/link';
import { LuLibrary, LuPlus, LuQuote, LuRoute } from 'react-icons/lu';
import { PricingTeaser } from '@/components/marketing/PricingTeaser';
import { FeaturedBadges } from '@/components/marketing/FeaturedBadges';
import { loadPublicPlans } from '@/components/marketing/plans';
import { pageMetadata } from '@/components/marketing/seo';
import { container, focusRing } from '@/components/marketing/styles';
import { ComparisonBand, h2, lead } from '@/components/marketing/landing';
import { HeroAsk } from '@/components/marketing/home/HeroAsk';
import { Features, HowItWorks, SmartLink, Tools, WhoItsFor } from '@/components/marketing/home/HomeSections';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { FOUNDER, personSchema } from '@/lib/authors';
import { btnGhost, btnPrimary } from '@/components/marketing/styles';
import { Footnote, PageReferences, PenCircle, PenUnderline } from '@/components/marketing/Marginalia';

const DESCRIPTION =
  'AI research assistant that answers from 250M+ real papers, every claim cited. Deep research, paper search, reviews, theses and proposals. Free to start.';

export const metadata = pageMetadata({ title: 'AI for Research — AI research assistant with real citations', absolute: true, path: '/', description: DESCRIPTION });

// Static, rebuilt every 5 minutes so the plans in the pricing teaser stay current.
export const revalidate = 300;

const CALLOUTS = [
  { icon: <LuQuote className="h-5 w-5" />, text: 'Every claim cites a real paper you can open.', source: true },
  { icon: <LuLibrary className="h-5 w-5" />, text: 'Your PDFs, Zotero and Mendeley in one Library.' },
  { icon: <LuRoute className="h-5 w-5" />, text: 'From the answer to a thesis: review, analyse, write, present.' },
];

const FAQ = [
  {
    q: 'Where do the sources come from?',
    a: 'From scholarly indexes, not from the AI’s memory: OpenAlex and Semantic Scholar (250M+ works in every field), PubMed and Europe PMC for medicine, arXiv, bioRxiv and medRxiv for preprints, the web when you choose it, and the PDFs in your own Library.',
  },
  {
    q: 'Can it make up a citation?',
    a: 'No citation is made up: each one is a record from a search, and markers the AI was not given are removed before you see the answer. The sentence around a citation is still AI-written, so open the paper and check that it says what the answer claims.',
  },
  {
    q: 'Is it allowed at my university?',
    a: 'Rules differ by university and course. Many allow AI for finding and reading sources but not for writing work you submit as your own. Check your course or journal policy, use the drafts as a starting point, and use the authorship report if you need to show how a document was written.',
  },
  {
    q: 'What do I get for free?',
    a: 'Unlimited paper search, filters, citations and the Library (25 PDFs), the full editor with 10 AI autocompletes a day, and 30 credits a month for AI work: for example three Deep reports, a preview review, an outline and a few quick answers. No credit card.',
  },
  {
    q: 'What is a credit?',
    a: 'One allowance for AI jobs, priced by how much they read and write: a Summary answer is 1 credit, a Deep report 5, a Detailed report 20, a document review 10 per 10,000 words. Every start button shows the cost first, and a job that fails gives its credits back.',
  },
  {
    q: 'Can I use my own PDFs and Zotero library?',
    a: 'Yes. Upload PDFs, Word, Markdown or text files to a question, or keep them in your Library and use them as a source. Zotero and Mendeley import are on the paid plans; BibTeX and RIS files work on every plan.',
  },
  {
    q: 'Can I cancel any time?',
    a: 'Yes. Cancel from your account. Your plan stays active until the end of the period you paid for, then you keep the free plan and everything you made.',
  },
];

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@aiforresearch.app';

const STRUCTURED_DATA = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon-512.png`,
    founder: personSchema(FOUNDER),
    ...(SUPPORT_EMAIL ? { email: SUPPORT_EMAIL, contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', email: SUPPORT_EMAIL } } : {}),
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    publisher: { '@id': `${SITE_URL}/#organization` },
    inLanguage: 'en-US',
    // Lets search engines offer a search box for the research directory.
    potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/research?q={search_term_string}` }, 'query-input': 'required name=search_term_string' },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    url: SITE_URL,
    publisher: { '@id': `${SITE_URL}/#organization` },
    applicationCategory: 'EducationalApplication',
    applicationSubCategory: 'AI research assistant',
    operatingSystem: 'Web, iOS, Android, Windows, macOS',
    description: DESCRIPTION,
    featureList: ['Deep research with cited answers', 'Paper search across OpenAlex, Semantic Scholar, PubMed and preprints', 'Chat with PDF', 'Thesis and proposal writing', 'Document review', 'Systematic review screening', 'Citation generator'],
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((item) => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })),
  },
];

const cta = `${btnPrimary} h-11 rounded-[10px] px-5 text-[15px]`;

export default async function LandingPage() {
  const plans = await loadPublicPlans();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA).replace(/</g, '\\u003c') }} />

      {/* Hero: the Ask box is the product's front door. */}
      <section aria-labelledby="hero-title" className="relative isolate pt-14 text-center md:pt-20" style={{ background: 'radial-gradient(900px 380px at 50% -8%, var(--color-brand-50) 0%, transparent 70%)' }}>
        <div aria-hidden="true" className="wo-ruled absolute inset-x-0 top-0 -z-10 h-[640px]" />
        <div className={container}>
          <h1 id="hero-title" className="mx-auto max-w-[760px] text-balance font-serif text-[36px] font-semibold leading-[1.06] tracking-[-0.02em] text-ink sm:text-[46px] md:text-[56px]">
            Research with <PenUnderline>real sources</PenUnderline>
          </h1>
          <p className={`mx-auto mt-5 max-w-[580px] text-balance ${lead}`}>
            Ask a question and get an answer built from 250M+ papers<Footnote id="openalex" />, every claim cited. Then review, analyse and write, up to your thesis defence.
          </p>
          <div className="mx-auto mt-8 max-w-[760px]"><HeroAsk /></div>
          <p className="mt-3 text-[13px] text-subtle">Free plan · No credit card</p>

          <ul className="mx-auto mt-10 grid max-w-[900px] gap-3 text-left sm:grid-cols-3">
            {CALLOUTS.map((callout) => (
              <li key={callout.text} className="flex items-start gap-3 rounded-[14px] border border-line-2 bg-surface/80 px-4 py-3.5">
                <span className="mt-0.5 text-brand" aria-hidden="true">{callout.icon}</span>
                <span className="text-[14.5px] leading-[1.5] text-ink-2">{callout.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <HowItWorks />
      <p className={`${container} mt-4 text-center text-[13px] text-subtle`}>An example question and real papers. Your answers depend on your question, sources and filters.</p>

      <WhoItsFor />

      <Features />

      <ComparisonBand />

      <Tools />

      <PricingTeaser plans={plans} />

      {/* FAQ */}
      <section id="faq" aria-labelledby="faq-title" className={`${container} scroll-mt-6 pt-24 md:pt-36`}>
        <div className="grid gap-8 md:grid-cols-[1fr_1.6fr] md:gap-16">
          <div>
            <h2 id="faq-title" className={h2}>Common questions</h2>
            <p className="mt-3 text-[15px] text-muted">
              More in the <Link href="/help" className="text-ink underline underline-offset-4 hover:text-brand">help center</Link>.
            </p>
          </div>
          <div className="border-t border-line">
            {FAQ.map((item) => (
              <details key={item.q} className="group border-b border-line">
                <summary className={`flex cursor-pointer list-none items-center gap-4 py-5 text-[16px] font-medium text-ink [&::-webkit-details-marker]:hidden ${focusRing}`}>
                  <h3 className="flex-1">{item.q}</h3>
                  <LuPlus className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-45" aria-hidden="true" />
                </summary>
                <p className="-mt-1 pb-5 pr-8 text-[15px] leading-[1.6] text-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final call to action */}
      <section aria-labelledby="cta-title" className={`${container} pb-20 pt-28 text-center md:pb-28 md:pt-36`}>
        <h2 id="cta-title" className="mx-auto max-w-[680px] text-balance font-serif text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink md:text-[48px]">Start your next question with <PenCircle>real</PenCircle> evidence</h2>
        <p className={`mx-auto mt-4 max-w-[460px] ${lead}`}>Free to start, no credit card. Upgrade when you need Detailed reports and more credits.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <SmartLink app="/home" out="/signup?next=%2Fhome" className={cta}>Start researching free</SmartLink>
          <Link href="/pricing" className={`${btnGhost} h-11 rounded-[10px] px-5 text-[15px]`}>See pricing</Link>
        </div>
      </section>

      {/* The sources for the numbers above (the footnotes link here). */}
      <div className={`${container} pb-16`}>
        <PageReferences className="mx-auto max-w-[760px]" />
        <section aria-labelledby="featured-title" className="mx-auto mt-12 max-w-[760px] text-center">
          <h2 id="featured-title" className="text-[13px] font-medium uppercase tracking-[0.08em] text-subtle">As featured in</h2>
          <FeaturedBadges className="mt-4 justify-center" />
        </section>
      </div>
    </>
  );
}
