import Link from 'next/link';
import { pageMetadata } from '@/components/marketing/seo';
import { container } from '@/components/marketing/styles';
import { FinalCta, PageIntro } from '@/components/marketing/landing';
import { ToolCard } from '@/components/marketing/FeatureLanding';
import { CatalogDirectory } from '@/components/marketing/CatalogDirectory';
import { JsonLd, breadcrumbSchema } from '@/components/marketing/seoBlocks';
import { activeToolCategories, TOOLS } from '@/lib/tools';
import { SITE_URL } from '@/lib/site';

export const metadata = pageMetadata({
  title: 'Free research and writing tools: citations, reviews, paraphrasing',
  path: '/tools',
  description:
    'Free tools that work right on the page: citation generator, literature review and research gap finder, proposal and essay drafts with real citations, paraphraser, statistics and PDF tools.',
});

export default function ToolsPage() {
  const cards = Object.fromEntries(TOOLS.map((tool) => [tool.slug, <ToolCard key={tool.slug} tool={tool} headingLevel="h3" />]));
  return (
    <>
      <JsonLd
        data={[
          {
            '@type': 'CollectionPage',
            '@id': `${SITE_URL}/tools#page`,
            name: 'Free WriteOrbit tools',
            url: `${SITE_URL}/tools`,
            isPartOf: { '@id': `${SITE_URL}/#website` },
            mainEntity: { '@type': 'ItemList', itemListElement: TOOLS.map((tool, index) => ({ '@type': 'ListItem', position: index + 1, name: tool.name, url: `${SITE_URL}/tools/${tool.slug}` })) },
          },
          breadcrumbSchema([{ name: 'Tools', path: '/tools' }]),
        ]}
      />
      <PageIntro title="Free tools for research and writing" intro="Each one works right here, no account needed. Drafts cite real papers, and you can open any result in the editor to keep going." />
      <div className={`${container} pt-12`}>
        <CatalogDirectory
          items={TOOLS.map(({ slug, name, short, category, keywords }) => ({ slug, name, short, category, keywords }))}
          categories={activeToolCategories()}
          cards={cards}
          placeholder="Search tools, e.g. “cite”, “review”, “PDF”"
        />
        <p className="mt-14 text-center text-[15px] text-muted">
          Looking for the editor’s features, like PDF chat and claim check? See <Link href="/features" className="text-ink underline underline-offset-4 hover:text-brand">all features</Link>.
        </p>
      </div>
      <FinalCta />
    </>
  );
}
