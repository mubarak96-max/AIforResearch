import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/site';

/** The editor screenshot doubles as the social preview image until a dedicated one exists. */
const OG_IMAGE = {
  url: '/screenshots/editor.png',
  width: 2160,
  height: 1350,
  alt: 'The WriteOrbit editor: a paper with AI autocomplete suggesting a cited sentence, and AI chat beside it',
};

/**
 * Title, description, canonical URL, Open Graph and Twitter tags for a public page.
 * `title` gets the " · WriteOrbit" suffix from the root layout unless `absolute` is set.
 * `image: false` leaves the preview image to an opengraph-image file next to the page
 * (X falls back to og:image when there is no twitter:image).
 */
export function pageMetadata({
  title,
  description,
  path,
  absolute = false,
  index = true,
  image = true,
}: {
  title: string;
  description: string;
  path: string;
  absolute?: boolean;
  index?: boolean;
  image?: boolean;
}): Metadata {
  const fullTitle = absolute ? title : `${title} · ${SITE_NAME}`;
  return {
    title: absolute ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    robots: index ? undefined : { index: false, follow: true },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      locale: 'en_US',
      url: path,
      title: fullTitle,
      description,
      ...(image ? { images: [OG_IMAGE] } : {}),
    },
    twitter: { card: 'summary_large_image', title: fullTitle, description, ...(image ? { images: [OG_IMAGE.url] } : {}) },
  };
}
