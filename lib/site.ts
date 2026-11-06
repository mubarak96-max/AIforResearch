/**
 * The public address of the site, used for canonical URLs, the sitemap, robots.txt, Open Graph
 * and structured data. Set NEXT_PUBLIC_SITE_URL (apphosting.yaml) to the real domain: while it is
 * left at the example.com placeholder, every canonical tells search engines the pages live there.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.PUBLIC_URL || 'https://app.example.com').replace(/\/+$/, '');

export const SITE_NAME = 'WriteOrbit';

/** Who runs this site, set when the web app is built (NEXT_PUBLIC_COMPANY_*); empty parts are left out. */
export const COMPANY = {
  name: process.env.NEXT_PUBLIC_COMPANY_NAME || 'WriteOrbit',
  address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS || '',
  phone: process.env.NEXT_PUBLIC_COMPANY_PHONE || '',
  email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || '',
};
