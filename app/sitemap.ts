import type { MetadataRoute } from 'next';
import { allPosts } from '@/lib/blog';
import { SITE_URL } from '@/lib/site';

/**
 * Static pages leave lastModified out: a date that changes on every build tells search engines
 * nothing, and they learn to ignore it. The blog dates come from each article's frontmatter.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const posts = allPosts();
  const newestPost = posts.reduce<string | null>((newest, post) => (!newest || post.updated > newest ? post.updated : newest), null);
  return [
    { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/features`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/how-it-works`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/pricing`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/help`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/citation-styles`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/developers`, changeFrequency: 'monthly', priority: 0.6 },
    {
      url: `${SITE_URL}/blog`,
      ...(newestPost ? { lastModified: new Date(`${newestPost}T00:00:00Z`) } : {}),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    ...posts.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: new Date(`${post.updated}T00:00:00Z`),
      changeFrequency: 'monthly' as const,
      priority: post.isPillar ? 0.8 : 0.6,
    })),
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/login`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/signup`, changeFrequency: 'yearly', priority: 0.5 },
  ];
}
