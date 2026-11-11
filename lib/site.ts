/**
 * The public address of the site, used for canonical URLs, the sitemap, robots.txt, Open Graph,
 * structured data and (in production) the server's redirect and webhook URLs.
 */
export const SITE_URL = 'https://aiforresearch.app';

export const SITE_NAME = 'AI for Research';

/** Who runs this site, set when the web app is built (NEXT_PUBLIC_COMPANY_*); empty parts are left out. */
export const COMPANY = {
  name: process.env.NEXT_PUBLIC_COMPANY_NAME || 'AI for Research',
  address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS || '',
  phone: process.env.NEXT_PUBLIC_COMPANY_PHONE || '',
  email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@aiforresearch.app',
};
