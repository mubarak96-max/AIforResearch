import type { MetadataRoute } from 'next';
import { allPosts } from '@/lib/blog';
import { AUTHORS, authorPath } from '@/lib/authors';
import { CITATION_STYLES } from '@/lib/citationStyles';
import { FEATURE_PAGES } from '@/lib/features';
import { TOOLS } from '@/lib/tools';
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
    ...FEATURE_PAGES.map((page) => ({ url: `${SITE_URL}/features/${page.slug}`, changeFrequency: 'monthly' as const, priority: 0.6 })),
    { url: `${SITE_URL}/tools`, changeFrequency: 'monthly', priority: 0.8 },
    ...TOOLS.map((tool) => ({ url: `${SITE_URL}/tools/${tool.slug}`, changeFrequency: 'monthly' as const, priority: 0.8 })),
    ...CITATION_STYLES.map((style) => ({ url: `${SITE_URL}/tools/citation-generator/${style.slug}`, changeFrequency: 'monthly' as const, priority: 0.7 })),
    // Paper and author pages are found through search and links from here; there are too many to list.
    { url: `${SITE_URL}/research`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/how-it-works`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/pricing`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/help`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/citation-styles`, changeFrequency: 'monthly', priority: 0.5 },
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
    { url: `${SITE_URL}/about`, changeFrequency: 'yearly', priority: 0.5 },
    ...AUTHORS.map((author) => ({ url: `${SITE_URL}${authorPath(author)}`, changeFrequency: 'monthly' as const, priority: 0.4 })),
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/ai-use`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/cookies`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/login`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/signup`, changeFrequency: 'yearly', priority: 0.5 },
  ];
}
