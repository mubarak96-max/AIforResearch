// Canonical URLs, the sitemap and Open Graph come from this (lib/site.ts); a placeholder gets example.com indexed.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.PUBLIC_URL || '';
if (process.env.NODE_ENV === 'production' && (!siteUrl || /example\.com|localhost/.test(siteUrl))) {
  console.warn(`\n⚠  NEXT_PUBLIC_SITE_URL is ${siteUrl ? `"${siteUrl}"` : 'not set'}: canonical URLs and the sitemap will not point at the real domain.\n`);
}

/**
 * Built and served by Firebase App Hosting (its Next.js adapter sets the output mode). The API
 * (lib/server, a Hono app) runs in this app's route handlers app/api and app/v1; live editing
 * goes to services/collab.
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  // Node-only packages the API uses load from node_modules at run time (jsdom, under
  // isomorphic-dompurify, reads its own files).
  serverExternalPackages: ['firebase-admin', 'nodemailer', 'dodopayments', 'isomorphic-dompurify', 'jsdom'],
  poweredByHeader: false,
  // lib/server imports its files with .js extensions (it also runs under Node in functions/ and
  // services/collab); let webpack find the .ts source.
  webpack(config) {
    config.resolve.extensionAlias = { ...config.resolve.extensionAlias, '.js': ['.ts', '.tsx', '.js'] };
    return config;
  },
};
export default nextConfig;
