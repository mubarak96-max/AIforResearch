import type { MetadataRoute } from 'next';
import { allPosts } from '@/lib/blog';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://app.example.com').replace(/\/+$/, '');

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/features`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/how-it-works`, lastModified, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/pricing`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/help`, lastModified, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/citation-styles`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/developers`, lastModified, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/blog`, lastModified, changeFrequency: 'weekly', priority: 0.7 },
    ...allPosts().map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: new Date(`${post.updated}T00:00:00Z`),
      changeFrequency: 'monthly' as const,
      priority: post.isPillar ? 0.8 : 0.6,
    })),
    { url: `${SITE_URL}/login`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/signup`, lastModified, changeFrequency: 'yearly', priority: 0.5 },
  ];
}
