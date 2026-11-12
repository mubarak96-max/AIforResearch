import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { pageMetadata } from '@/components/marketing/seo';
import { MarkdownLanding } from '@/components/marketing/MarkdownLanding';
import { getLandingPage, landingPages } from '@/lib/landingPages';

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return landingPages('for').map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = getLandingPage('for', (await params).slug);
  if (!page) return {};
  return { ...pageMetadata({ title: page.seoTitle, description: page.description, path: `/for/${page.slug}` }), keywords: [page.primaryKeyword, ...page.secondaryKeywords] };
}

export default async function LandingPage({ params }: Props) {
  const page = getLandingPage('for', (await params).slug);
  if (!page) notFound();
  return <MarkdownLanding page={page} />;
}
