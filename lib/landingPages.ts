/**
 * Long-form landing pages written as Markdown in content/pages/<section>/<slug>.md and compiled by
 * scripts/build-blog.mjs into lib/pages.generated.ts. Sections map to URLs:
 *   for → /for/<slug> (audiences), features → /features/<slug> (workspaces; the short pages in
 *   lib/features.ts share the URL space), alternatives → /alternatives/<slug>, templates → /templates/<slug>,
 *   fields → /fields/<slug> (one page per research field: its sources, tools and checklists).
 */
import { LANDING_PAGES } from './pages.generated';

export type LandingSection = 'for' | 'features' | 'alternatives' | 'templates' | 'fields';

export type LandingPageSource = {
  section: LandingSection;
  slug: string;
  /** The <title>, without the site suffix. */
  seoTitle: string;
  description: string;
  heading: string;
  intro: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  /** 'ask': the working Ask box in the hero. 'cta': a button to `cta`. */
  hero: 'ask' | 'cta';
  cta: { label: string; href: string };
  /** What the free plan covers and what the action costs, shown under the hero. */
  planNote: string;
  /** Site paths shown as "Related" links. */
  related: string[];
  /** YYYY-MM-DD */
  updated: string;
  faq: { q: string; a: string }[];
  body: string;
};

export const SECTION_NAMES: Record<LandingSection, string> = {
  for: 'Who it is for',
  features: 'Features',
  alternatives: 'Alternatives',
  templates: 'Templates',
  fields: 'Research fields',
};

export function landingPages(section: LandingSection): LandingPageSource[] {
  return LANDING_PAGES.filter((page) => page.section === section);
}

export function getLandingPage(section: LandingSection, slug: string): LandingPageSource | undefined {
  return LANDING_PAGES.find((page) => page.section === section && page.slug === slug);
}

export function landingPath(page: Pick<LandingPageSource, 'section' | 'slug'>) {
  return `/${page.section}/${page.slug}`;
}

export function allLandingPages(): LandingPageSource[] {
  return LANDING_PAGES;
}
