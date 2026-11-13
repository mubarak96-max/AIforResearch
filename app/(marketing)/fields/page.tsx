import { pageMetadata } from '@/components/marketing/seo';
import { container } from '@/components/marketing/styles';
import { FinalCta, PageIntro } from '@/components/marketing/landing';
import { LandingGrid } from '@/components/marketing/MarkdownLanding';
import { landingPages } from '@/lib/landingPages';

export const metadata = pageMetadata({
  title: 'AI for research by field: medicine, biology, engineering, law',
  path: '/fields',
  description: 'How one AI research workspace works in your field: the paper and data sources it searches, the checklists and citation styles it uses, and what it leaves to you.',
});

export default function IndexPage() {
  return (
    <>
      <PageIntro title={'Research fields'} intro={'The sources, checklists and tools for your field: clinical trials and PubMed, gene and compound databases, DBLP and arXiv, economic series and patents.'} />
      <section aria-label={'Research fields'} className={`${container} pt-14 md:pt-20`}>
        <LandingGrid pages={landingPages('fields')} />
      </section>
      <FinalCta />
    </>
  );
}
