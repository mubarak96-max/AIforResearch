import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { pageMetadata } from '@/components/marketing/seo';
import { ToolPage } from '@/components/tools/ToolPage';
import { getTool, TOOLS } from '@/lib/tools';

type Props = { params: Promise<{ slug: string }> };

/** The citation generator has its own folder (its style pages live under it). */
const OWN_ROUTE = new Set(['citation-generator']);

export const dynamicParams = false;

export function generateStaticParams() {
  return TOOLS.filter((tool) => !OWN_ROUTE.has(tool.slug)).map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tool = getTool((await params).slug);
  if (!tool) return {};
  return { ...pageMetadata({ title: tool.seoTitle, description: tool.description, path: `/tools/${tool.slug}` }), keywords: tool.keywords };
}

export default async function ToolDetailPage({ params }: Props) {
  const tool = getTool((await params).slug);
  if (!tool || OWN_ROUTE.has(tool.slug)) notFound();
  return <ToolPage tool={tool} />;
}
