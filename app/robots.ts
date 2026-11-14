import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// App screens (/account, sign-in pages) are kept out with a noindex
// meta tag instead: a Disallow here would stop crawlers from ever reading it.
// Paper pages and search results are noindex anyway, and each one links to more of OpenAlex's
// 250 million works: crawlers walking that graph cost a server render and upstream calls per URL.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/editor', '/api/', '/research/papers/', '/research?'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
