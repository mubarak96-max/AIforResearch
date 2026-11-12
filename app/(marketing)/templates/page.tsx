import { pageMetadata } from '@/components/marketing/seo';
import { container } from '@/components/marketing/styles';
import { FinalCta, PageIntro } from '@/components/marketing/landing';
import { LandingGrid } from '@/components/marketing/MarkdownLanding';
import { landingPages } from '@/lib/landingPages';

export const metadata = pageMetadata({
  title: 'Research templates: proposals, theses and reviews',
  path: '/templates',
  description: 'Free research templates to copy: research proposal, thesis defense slides, ethics statement, poster, emails, progress tracker, review protocol and screening forms.',
});

export default function IndexPage() {
  return (
    <>
      <PageIntro title={'Research templates'} intro={'Templates for proposals, theses, ethics applications and systematic reviews. Copy one, or open the workspace that fills it with your topic and real citations.'} />
      <section aria-label={'Research templates'} className={`${container} pt-14 md:pt-20`}>
        <LandingGrid pages={landingPages('templates')} />
      </section>
      <FinalCta />
    </>
  );
}
