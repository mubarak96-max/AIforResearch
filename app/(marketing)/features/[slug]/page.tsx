import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { pageMetadata } from '@/components/marketing/seo';
import { FeatureLanding } from '@/components/marketing/FeatureLanding';
import { FEATURE_PAGES, getFeaturePage } from '@/lib/features';

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return FEATURE_PAGES.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = getFeaturePage((await params).slug);
  if (!page) return {};
  return { ...pageMetadata({ title: page.seoTitle, description: page.description, path: `/features/${page.slug}` }), keywords: page.keywords };
}

export default async function FeatureDetailPage({ params }: Props) {
  const page = getFeaturePage((await params).slug);
  if (!page) notFound();
  return <FeatureLanding page={page} />;
}
