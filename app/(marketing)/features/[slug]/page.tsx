import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { pageMetadata } from '@/components/marketing/seo';
import { FeatureLanding } from '@/components/marketing/FeatureLanding';
import { MarkdownLanding } from '@/components/marketing/MarkdownLanding';
import { FEATURE_PAGES, getFeaturePage } from '@/lib/features';
import { getLandingPage, landingPages } from '@/lib/landingPages';

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

// Short feature pages (lib/features.ts) and long-form workspace pages (content/pages/features) share /features.
export function generateStaticParams() {
  return [...FEATURE_PAGES.map((page) => page.slug), ...landingPages('features').map((page) => page.slug)].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).slug;
  const page = getFeaturePage(slug);
  if (page) return { ...pageMetadata({ title: page.seoTitle, description: page.description, path: `/features/${page.slug}` }), keywords: page.keywords };
  const long = getLandingPage('features', slug);
  if (!long) return {};
  return { ...pageMetadata({ title: long.seoTitle, description: long.description, path: `/features/${long.slug}` }), keywords: [long.primaryKeyword, ...long.secondaryKeywords] };
}

export default async function FeatureDetailPage({ params }: Props) {
  const slug = (await params).slug;
  const page = getFeaturePage(slug);
  if (page) return <FeatureLanding page={page} />;
  const long = getLandingPage('features', slug);
  if (!long) notFound();
  return <MarkdownLanding page={long} />;
}
