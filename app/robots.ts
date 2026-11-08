import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// App screens (/account, /developers/keys, sign-in pages) are kept out with a noindex
// meta tag instead: a Disallow here would stop crawlers from ever reading it.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/editor', '/api/', '/v1/'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
