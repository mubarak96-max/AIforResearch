import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

/**
 * SEO-tool crawlers: among the heaviest on the web and no use to search. They obey robots.txt,
 * so this alone cuts their traffic. Scrapers that ignore it are blocked at Cloudflare (WAF).
 */
const BLOCKED_CRAWLERS = ['AhrefsBot', 'SemrushBot', 'MJ12bot', 'DotBot', 'DataForSeoBot', 'BLEXBot', 'PetalBot'];

/**
 * Private screens and account flows, with nothing to rank. They carry a noindex tag as well;
 * disallowing them here also saves the crawl (each fetch is a Worker request). /login and
 * /signup stay crawlable: they are in the sitemap. The public survey form (/s/), /authorship and
 * /verify stay open too. The workspace tool routes (/deep-research, /citation-map, ...) are left
 * crawlable on purpose: some of them are meant to rank.
 */
const APP_ROUTES = [
  '/editor', '/account', '/library', '/matrix', '/chat',
  // '/auth/', not '/auth': the prefix would also block /authors and /authorship.
  '/auth/', '/forgot-password', '/reset-password', '/confirm-email',
];

/**
 * Paper pages and search results are noindex anyway, and each one links to more of OpenAlex's
 * 250 million works: crawlers walking that graph cost a server render and upstream calls per URL.
 */
const RESEARCH_GRAPH = ['/research/papers/', '/research?'];

// A crawler obeys only the most specific group naming it, so a named group must carry every
// rule it needs: the blocked crawlers get Disallow: / and nothing else.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: BLOCKED_CRAWLERS, disallow: '/' },
      { userAgent: '*', allow: '/', disallow: ['/api/', ...APP_ROUTES, ...RESEARCH_GRAPH] },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
