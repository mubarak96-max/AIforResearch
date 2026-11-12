import { pageMetadata } from '@/components/marketing/seo';
import { container } from '@/components/marketing/styles';
import { FinalCta, PageIntro } from '@/components/marketing/landing';
import { LandingGrid } from '@/components/marketing/MarkdownLanding';
import { landingPages } from '@/lib/landingPages';

export const metadata = pageMetadata({
  title: 'Who AI for Research is for: students, researchers, clinicians',
  path: '/for',
  description: "How undergraduates, master's and PhD students, academics, clinicians and industry analysts use one AI research workspace, with the plan that fits each.",
});

export default function IndexPage() {
  return (
    <>
      <PageIntro title={'Who it is for'} intro={"One research workspace, seen through your work: the jobs you do, the tools you'd use and the plan that fits."} />
      <section aria-label={'Who it is for'} className={`${container} pt-14 md:pt-20`}>
        <LandingGrid pages={landingPages('for')} />
      </section>
      <FinalCta />
    </>
  );
}
