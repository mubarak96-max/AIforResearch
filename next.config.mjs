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
