import Link from 'next/link';
import { LuArrowRight, LuBriefcase, LuFlaskConical, LuGraduationCap, LuNewspaper, LuPlus } from 'react-icons/lu';
import { HeroDemo, HeroDemoSteps } from '@/components/marketing/HeroDemo';
import { FeatureMini } from '@/components/marketing/FeatureMinis';
import { AuthAware } from '@/components/marketing/AuthAware';
import { PricingTeaser } from '@/components/marketing/PricingTeaser';
import { loadPublicPlans } from '@/components/marketing/plans';
import { pageMetadata } from '@/components/marketing/seo';
import { container, focusRing } from '@/components/marketing/styles';
import { ComparisonBand, FEATURES, FinalCta, STEPS, StartButton, h2, lead } from '@/components/marketing/landing';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { Footnote, PageReferences, PenTick, PenUnderline, type ReferenceId } from '@/components/marketing/Marginalia';

const DESCRIPTION =
  'Write faster with AI that cites real papers. Generate APA, MLA, Chicago and AMA citations, check every claim and export to Word or LaTeX. Free to start.';

export const metadata = pageMetadata({ title: 'WriteOrbit — AI writing editor and citation generator', absolute: true, path: '/', description: DESCRIPTION });

// Static, rebuilt every 5 minutes so the plans in the pricing teaser stay current.
export const revalidate = 300;

const FACTS: { value: string; label: string; source?: ReferenceId }[] = [
  { value: '300M+', label: 'Scholarly works to cite', source: 'openalex' },
  { value: '10,000+', label: 'Citation styles', source: 'csl' },
  { value: '$0', label: 'To start, no card needed' },
];

/** The audience cards sit like index cards pinned to a board (wide screens only). */
const TILT = ['lg:-rotate-[1.2deg]', 'lg:rotate-[0.8deg]', 'lg:-rotate-[0.5deg]', 'lg:rotate-[1.1deg]'];

/** Feature tiles that take two columns on wide screens: rows of 2+1, 1+2, 2+1. */
const WIDE = new Set([0, 3, 4]);

const AUDIENCES = [
  {
    icon: <LuGraduationCap className="h-5 w-5" />,
    title: 'Students',
    text: 'Essays, assignments, theses and dissertations, cited correctly the first time.',
    points: ['APA, MLA, Chicago or Harvard in one click', 'Open your university’s Word template', 'Free plan, no credit card'],
  },
  {
    icon: <LuFlaskConical className="h-5 w-5" />,
    title: 'Researchers and academics',
    text: 'Journal articles, literature reviews and grant proposals, with sources you can defend.',
    points: ['Search 250M+ works and chat with your PDFs', 'Peer review and source checks before you submit', 'Export to Word or LaTeX for Overleaf'],
  },
  {
    icon: <LuNewspaper className="h-5 w-5" />,
    title: 'Journalists and editors',
    text: 'Articles and features where every claim needs to stand up.',
    points: ['Claim check flags statements with no source', 'A neutral, objective tone check', 'Comment and edit with your desk in real time'],
  },
  {
    icon: <LuBriefcase className="h-5 w-5" />,
    title: 'Analysts and report writers',
    text: 'Research reports, policy briefs and white papers backed by real evidence.',
    points: ['Draft sections from the sources you choose', 'References in the style your client needs', 'Share with reviewers as commenters or viewers'],
  },
];

const FAQ = [
  { q: 'Is WriteOrbit free?', a: 'Yes. The free plan includes the full editor, the citation generator and a daily AI allowance. You don’t need a credit card.' },
  { q: 'Are the citations real?', a: 'Yes. Every citation comes from a scholarly database, not from the AI’s memory. Click a citation to open the paper.' },
  { q: 'Which citation styles can I use?', a: 'APA 7, MLA 9, Chicago, Harvard, AMA, ACS, IEEE, Vancouver, Turabian, Bluebook and over 10,000 journal styles. Change the style and every citation and the reference list update.' },
  { q: 'Can WriteOrbit check my claims?', a: 'Yes. Claim check reads your draft, flags claims that are unsupported or overstated, and shows where you need a citation. Source quality spots retracted papers and wrong DOIs.' },
  { q: 'Is it only for academic writing?', a: 'It is built for students, researchers and academics. It also works for any writing that needs sources, such as reports, articles and features.' },
  { q: 'Will my writing be used to train AI?', a: 'No. WriteOrbit does not train AI on your documents. They stay private to you and the people you share them with.' },
  { q: "Can I use my university's Word template?", a: 'Yes. Open the .docx and WriteOrbit keeps its styles, headers and page setup when you export.' },
  { q: 'Can I write with others?', a: 'Yes. Invite people as editors, commenters or viewers and write in the same document at the same time.' },
  { q: 'Does it work on my phone?', a: 'Yes. WriteOrbit runs in the browser on phones, tablets and computers, and your work syncs between them.' },
  { q: 'Can I cancel any time?', a: 'Yes. Cancel from your account. Your plan stays active until the end of the period you paid for.' },
];


const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@writeorbit.app';

const STRUCTURED_DATA = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon-512.png`,
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
  },
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    url: SITE_URL,
    publisher: { '@id': `${SITE_URL}/#organization` },
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web, iOS, Android, Windows, macOS',
    description: DESCRIPTION,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((item) => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })),
  },
];

const more = `inline-flex items-center gap-1.5 rounded text-[14.5px] font-medium text-brand hover:text-brand-600 ${focusRing}`;

export default async function LandingPage() {
  const plans = await loadPublicPlans();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA).replace(/</g, '\\u003c') }} />

      {/* Hero */}
      <section aria-labelledby="hero-title" className="relative isolate pt-16 text-center md:pt-24" style={{ background: 'radial-gradient(900px 380px at 50% -8%, var(--color-brand-50) 0%, transparent 70%)' }}>
        <div aria-hidden="true" className="wo-ruled absolute inset-x-0 top-0 -z-10 h-[640px]" />
        <div className={container}>
          <h1 id="hero-title" className="mx-auto max-w-[760px] text-balance font-serif text-[34px] font-semibold leading-[1.08] tracking-[-0.02em] text-ink sm:text-[44px] md:text-[52px]">
            Write faster, with a <PenUnderline>real source</PenUnderline> for <em className="font-medium">every</em> claim
          </h1>
          <p className={`mx-auto mt-5 max-w-[520px] text-balance ${lead}`}>
            AI that writes with real citations, a citation generator for APA, MLA, Chicago and 10,000+ styles, and a claim check before you submit.
          </p>
          <div className="mt-7 flex justify-center"><StartButton /></div>
          <AuthAware signedIn={null} signedOut={<p className="mt-3 text-[13px] text-subtle">Free plan · No credit card</p>} />
          {/* The product, playing: write → cite → check → export (CSS animation, see HeroDemo). */}
          <div className="relative mx-auto mt-12 max-w-[1080px] md:mt-14">
            <HeroDemo />
            <HeroDemoSteps />
          </div>
        </div>
      </section>

      {/* Facts */}
      <section aria-label="WriteOrbit at a glance" className={`${container} pt-14 md:pt-20`}>
        <div className="relative mx-auto max-w-[840px]">
        <ul className="grid grid-cols-3 rounded-[20px] border border-line bg-surface py-6 shadow-[0_20px_40px_-32px_rgba(15,23,42,.35)] md:py-9">
          {FACTS.map((fact, index) => (
            <li key={fact.label} className={`px-2 text-center ${index ? 'border-l border-line-2' : ''}`}>
              <p className="whitespace-nowrap font-serif text-[22px] font-semibold tracking-[-0.01em] text-ink [font-variant-numeric:oldstyle-nums] sm:text-[32px] md:text-[46px]">{fact.value}</p>
              <p className="mt-1 text-balance text-[12px] text-muted sm:text-[13.5px]">{fact.label}{fact.source && <Footnote id={fact.source} />}</p>
            </li>
          ))}
        </ul>
        {/* A note in the margin, as on a marked-up draft. */}
        <p aria-hidden="true" className="absolute left-[calc(100%+22px)] top-3 hidden w-[132px] rotate-[2deg] text-left font-serif text-[13.5px] italic leading-snug text-accent xl:block">
          <span className="not-italic">↙</span> Even our numbers come with sources. See the foot of the page.
        </p>
        </div>
      </section>

      {/* Features: a short overview; the full tour is on /features. */}
      <section aria-labelledby="features-title" className={`${container} pt-24 md:pt-32`}>
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between md:gap-10">
          <div>
            <h2 id="features-title" className={`max-w-[560px] ${h2}`}>Write, cite and <em>check</em> in one editor</h2>
            <p className={`mt-4 max-w-[480px] ${lead}`}>Each suggestion comes with a real reference, and each reference opens the paper behind it. No made-up sources.</p>
          </div>
          <Link href="/features" className={`shrink-0 md:mb-1.5 ${more}`}>See all features <LuArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
        <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 md:mt-12 lg:grid-cols-3">
          {FEATURES.map((feature, index) => {
            const wide = WIDE.has(index);
            return (
            <li key={feature.id} className={`wo-reveal min-w-0 ${wide ? 'lg:col-span-2' : ''}`}>
              <Link href={`/features#${feature.id}`} className={`group flex h-full flex-col gap-5 rounded-[20px] border border-line bg-surface p-4 transition-[box-shadow,border-color] hover:border-line-3 hover:shadow-[0_20px_40px_-30px_rgba(15,23,42,.45)] sm:p-5 ${wide ? 'lg:grid lg:grid-cols-[1fr_1.1fr] lg:items-stretch lg:gap-7 lg:p-6' : ''} ${focusRing}`}>
                <FeatureMini id={feature.id} className={wide ? 'lg:order-2 lg:h-full lg:min-h-[184px]' : ''} />
                <div className="flex flex-1 flex-col px-1">
                  <span className="flex items-center gap-2">
                    <span className="text-brand [&>svg]:h-4 [&>svg]:w-4" aria-hidden="true">{feature.icon}</span>
                    <h3 className="text-[16px] font-semibold text-ink">{feature.name}</h3>
                    <LuArrowRight className="ml-auto h-4 w-4 text-subtle transition-[color,translate] group-hover:translate-x-0.5 group-hover:text-brand" aria-hidden="true" />
                  </span>
                  {wide && <p className="mt-2 hidden text-balance font-serif text-[22px] font-semibold leading-[1.2] tracking-[-0.01em] text-ink lg:block">{feature.title}</p>}
                  <p className={`mt-1.5 text-[14.5px] leading-[1.55] text-muted ${wide ? 'lg:mt-2' : ''}`}>
                    {wide ? <><span className="lg:hidden">{feature.short}</span><span className="hidden lg:inline">{feature.body}</span></> : feature.short}
                  </p>
                </div>
              </Link>
            </li>
            );
          })}
        </ul>
      </section>

      {/* Who it is for: the main audiences, academic first. */}
      <section aria-labelledby="audience-title" className="mt-24 border-y border-line-2 bg-panel py-20 md:mt-32 md:py-24">
        <div className={container}>
        <div className="text-center">
          <h2 id="audience-title" className={`mx-auto max-w-[620px] ${h2}`}>Who is WriteOrbit for?</h2>
          <p className={`mx-auto mt-4 max-w-[520px] ${lead}`}>Anyone who writes with sources. It is built first for students, researchers and academics.</p>
        </div>
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 md:mt-14 lg:grid-cols-4 lg:gap-6">
          {AUDIENCES.map((audience, index) => (
            <li key={audience.title} className="wo-reveal">
              {/* An index card: a red rule under the heading, faint lines below. */}
              <div className={`flex h-full flex-col rounded-[6px] bg-surface shadow-[0_1px_2px_rgb(28_25_23/.06),0_18px_36px_-26px_rgb(28_25_23/.45)] ring-1 ring-line transition-[rotate,translate] duration-300 hover:-translate-y-1 hover:rotate-0 ${TILT[index]}`}>
                <div className="flex items-center gap-3 border-b-2 border-accent/45 px-5 pb-3 pt-5">
                  <span className="text-brand" aria-hidden="true">{audience.icon}</span>
                  <h3 className="font-serif text-[18px] font-semibold text-ink">{audience.title}</h3>
                </div>
                <div className="flex-1 bg-[repeating-linear-gradient(to_bottom,transparent_0_27px,var(--color-line-2)_27px_28px)] px-5 pb-5 pt-[2px] text-[14px] leading-[28px]">
                  <p className="text-muted">{audience.text}</p>
                  <ul className="mt-[28px] flex flex-col text-ink-2">
                    {audience.points.map((point) => (
                      <li key={point} className="flex gap-2">
                        <PenTick className="mt-[6px]" />{point}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </li>
          ))}
        </ul>
        </div>
      </section>

      <ComparisonBand />

      {/* How it works: three steps; details on /how-it-works. */}
      <section aria-labelledby="how-title" className={`${container} pt-24 text-center md:pt-32`}>
        <h2 id="how-title" className={`mx-auto max-w-[620px] ${h2}`}>From blank page to <em>finished</em> paper</h2>
        <ol className="mx-auto mt-10 grid max-w-[920px] gap-8 md:mt-12 md:grid-cols-3 md:gap-10">
          {STEPS.map((step, index) => (
            <li key={step.id} className="wo-reveal">
              <span className="mx-auto grid size-11 place-items-center rounded-full border border-line bg-surface text-brand shadow-[0_8px_20px_-14px_rgba(15,23,42,.4)]" aria-hidden="true">{step.icon}</span>
              <h3 className="mt-4 text-[16px] font-semibold text-ink"><span className="font-serif italic text-accent">{index + 1}. </span>{step.title}</h3>
              <p className="mx-auto mt-1.5 max-w-[260px] text-[15px] leading-[1.6] text-muted">{step.short}</p>
            </li>
          ))}
        </ol>
        <Link href="/how-it-works" className={`mt-9 ${more}`}>See how it works <LuArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
      </section>

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

      <FinalCta />

      {/* The sources for the numbers above (the footnotes link here). */}
      <div className={`${container} pb-16`}>
        <PageReferences className="mx-auto max-w-[760px]" />
      </div>
    </>
  );
}
