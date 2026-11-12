import { pageMetadata } from '@/components/marketing/seo';
import { container } from '@/components/marketing/styles';
import { FinalCta, PageIntro } from '@/components/marketing/landing';
import { LandingGrid } from '@/components/marketing/MarkdownLanding';
import { landingPages } from '@/lib/landingPages';

export const metadata = pageMetadata({
  title: 'AI research tool alternatives, compared fairly',
  path: '/alternatives',
  description: "Honest comparisons of AI for Research with Consensus, Elicit, SciSpace, Perplexity, Connected Papers, Covidence and more, built from each product's own pages.",
});

export default function IndexPage() {
  return (
    <>
      <PageIntro title={'AI for Research compared with other tools'} intro={"What each tool does best, where AI for Research differs, and which to pick for which job. Facts come from each product's own pages, with the date checked."} />
      <section aria-label={'AI for Research compared with other tools'} className={`${container} pt-14 md:pt-20`}>
        <LandingGrid pages={landingPages('alternatives')} />
      </section>
      <FinalCta />
    </>
  );
}
