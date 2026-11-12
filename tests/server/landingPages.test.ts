import { describe, expect, it } from 'vitest';
import { allLandingPages, landingPath } from '../../lib/landingPages.js';
import { FEATURE_PAGES } from '../../lib/features.js';
import { TOOLS } from '../../lib/tools.js';
import { allPosts } from '../../lib/blog/index.js';

/** Every site path a landing page may link to: other landing pages, feature and tool pages, posts and fixed pages. */
function knownPaths() {
  return new Set([
    '/', '/pricing', '/signup', '/features', '/tools', '/blog', '/research', '/help', '/how-it-works', '/citation-styles', '/ai-use',
    ...allLandingPages().map(landingPath),
    ...FEATURE_PAGES.map((page) => `/features/${page.slug}`),
    ...TOOLS.map((tool) => `/tools/${tool.slug}`),
    ...allPosts().map((post) => `/blog/${post.slug}`),
  ]);
}

/** App routes a call to action may open. */
const APP_ROUTE = /^\/(signup|home|deep-research|papers|citation-map|landscape|library|projects|history|write|thesis|proposals|slides|reviewer|systematic-review|data-lab|all-tools|editor)(\?[a-z=&-]+)?$/;

describe('landing pages', () => {
  it('has one page per URL and no clash with the short feature pages', () => {
    const paths = allLandingPages().map(landingPath);
    expect(new Set(paths).size).toBe(paths.length);
    const featureSlugs = new Set(FEATURE_PAGES.map((page) => page.slug));
    for (const page of allLandingPages()) if (page.section === 'features') expect(featureSlugs.has(page.slug), page.slug).toBe(false);
  });

  it('links only to pages that exist', () => {
    const known = knownPaths();
    for (const page of allLandingPages()) {
      for (const href of page.related) expect(known.has(href), `${page.slug} related -> ${href}`).toBe(true);
      for (const match of page.body.matchAll(/\]\((\/[^)#\s]*)/g)) {
        const href = match[1];
        const ok = known.has(href) || href.startsWith('/research/papers/') || href.startsWith('/tools/citation-generator/');
        expect(ok, `${page.slug} body -> ${href}`).toBe(true);
      }
    }
  });

  it('sends every button to a page or a working app route', () => {
    const known = knownPaths();
    for (const page of allLandingPages()) {
      const href = page.cta.href;
      expect(known.has(href) || APP_ROUTE.test(href), `${page.slug} cta -> ${href}`).toBe(true);
    }
  });

  it('keeps the SEO fields in range', () => {
    for (const page of allLandingPages()) {
      expect(page.seoTitle.length, page.slug).toBeLessThanOrEqual(62);
      expect(page.description.length, page.slug).toBeGreaterThanOrEqual(120);
      expect(page.description.length, page.slug).toBeLessThanOrEqual(160);
      expect(page.faq.length, page.slug).toBeGreaterThanOrEqual(4);
    }
  });
});
