import Link from 'next/link';
import { ContactLine } from '@/components/marketing/LegalPage';
import { pageMetadata } from '@/components/marketing/seo';
import { container, focusRing } from '@/components/marketing/styles';
import { FOUNDER, authorPath, personSchema } from '@/lib/authors';
import { COMPANY, SITE_NAME, SITE_URL } from '@/lib/site';

export const metadata = pageMetadata({
  title: `About ${SITE_NAME}`,
  path: '/about',
  description: `Who builds ${SITE_NAME}, why it cites real sources, and the editorial standards behind our guides.`,
});

const link = `rounded text-ink underline underline-offset-4 hover:text-brand ${focusRing}`;

const STRUCTURED_DATA = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  '@id': `${SITE_URL}/about#page`,
  url: `${SITE_URL}/about`,
  name: `About ${SITE_NAME}`,
  about: { '@id': `${SITE_URL}/#organization` },
  mentions: personSchema(FOUNDER),
}).replace(/</g, '\\u003c');

export default function AboutPage() {
  return (
    <div className={container}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: STRUCTURED_DATA }} />
      <div className="max-w-[760px] pb-24 pt-10 md:pt-[46px]">
        <h1 className="text-balance text-[34px] font-bold tracking-[-0.03em] text-ink sm:text-[42px]">About {SITE_NAME}</h1>
        <p className="mt-4 text-[18px] leading-relaxed text-ink-2">
          {SITE_NAME} is an AI writing editor that cites real sources. It suggests sentences backed by published papers, answers questions about your PDFs with page numbers, and checks claims and sources before you publish.
        </p>

        <section aria-labelledby="why-title" className="mt-12">
          <h2 id="why-title" className="mb-3 text-[24px] font-bold tracking-[-0.02em] text-ink">Why we built it</h2>
          <div className="space-y-3 text-[16.5px] leading-relaxed text-ink-2">
            <p>AI writing tools are fast, but they invent facts and citations with the same confidence as real ones. We think a writing assistant should show where every claim comes from, so the writer can open the source and decide.</p>
            <p>That is why citations come from a scholarly index rather than a model’s memory, and why the AI review marks claims it could not find a source for instead of guessing. More on this in <Link href="/ai-use" className={link}>how we use AI</Link>.</p>
          </div>
        </section>

        <section aria-labelledby="founder-title" className="mt-12">
          <h2 id="founder-title" className="mb-5 text-[24px] font-bold tracking-[-0.02em] text-ink">Who builds it</h2>
          <div className="flex flex-col gap-5 rounded-2xl border border-line p-6 sm:flex-row sm:p-7">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={FOUNDER.image} alt={FOUNDER.name} width={104} height={104} className="h-[104px] w-[104px] shrink-0 rounded-full object-cover" />
            <div>
              <p className="text-[19px] font-bold tracking-[-0.01em] text-ink">
                <Link href={authorPath(FOUNDER)} className={`rounded hover:text-brand ${focusRing}`}>{FOUNDER.name}</Link>
              </p>
              <p className="text-[14px] text-muted">{FOUNDER.jobTitle}</p>
              <p className="mt-3 text-[15.5px] leading-relaxed text-ink-2">{FOUNDER.shortBio}</p>
              <p className="mt-3 flex flex-wrap gap-x-4 text-[14px]">
                <Link href={authorPath(FOUNDER)} className={link}>Full profile and articles</Link>
                {FOUNDER.sameAs.map((profile) => (
                  <a key={profile.url} href={profile.url} target="_blank" rel="noopener" className={link}>{profile.label}</a>
                ))}
              </p>
            </div>
          </div>
        </section>

        <section id="editorial" aria-labelledby="editorial-title" className="mt-12 scroll-mt-24">
          <h2 id="editorial-title" className="mb-3 text-[24px] font-bold tracking-[-0.02em] text-ink">Editorial standards for the blog</h2>
          <ul className="space-y-2 text-[16.5px] leading-relaxed text-ink-2 [&_li]:ml-5 [&_li]:list-disc">
            <li><strong>Named authors.</strong> Every article shows who wrote it and links to their profile.</li>
            <li><strong>Sources you can check.</strong> Facts, figures and quotes link to the primary source, listed at the end of each article.</li>
            <li><strong>Examples are labelled.</strong> Invented examples (sample stories, people, numbers) are marked as fictional.</li>
            <li><strong>We say when we are the vendor.</strong> {SITE_NAME} is our product. Every article that covers other tools alongside it says so in a disclosure at the top.</li>
            <li><strong>Dated and updated.</strong> Each article shows when it was last updated. We revise articles when the tools, prices or rules they describe change.</li>
            <li><strong>Corrections.</strong> If you find an error, <ContactLine /> and we will fix it and update the date.</li>
          </ul>
        </section>

        <section aria-labelledby="contact-title" className="mt-12">
          <h2 id="contact-title" className="mb-3 text-[24px] font-bold tracking-[-0.02em] text-ink">Contact</h2>
          <div className="space-y-1.5 text-[16.5px] leading-relaxed text-ink-2">
            <p>{COMPANY.name}</p>
            {COMPANY.address && <p>{COMPANY.address}</p>}
            {COMPANY.phone && <p><a href={`tel:${COMPANY.phone.replace(/[^+\d]/g, '')}`} className={link}>{COMPANY.phone}</a></p>}
            <p>For support, questions or corrections, <ContactLine />.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
