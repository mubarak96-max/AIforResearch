import { fileURLToPath } from 'node:url';

/**
 * Built and served by Firebase App Hosting (its Next.js adapter sets the output mode). The API
 * runs in this app's route handlers (app/api, app/v1); live editing goes to services/collab.
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@researchcove/editor'],
  // The API package and the Node-only packages it uses load from node_modules at run time
  // (not bundled: argon2 is a native module).
  serverExternalPackages: ['@researchcove/server', 'firebase-admin', '@node-rs/argon2', 'nodemailer', 'stripe'],
  // argon2 is loaded lazily (for passwords from the self-hosted version), so tracing misses it.
  outputFileTracingIncludes: { '/api/**': ['./node_modules/@node-rs/argon2/**', '../../node_modules/.pnpm/@node-rs+argon2*/node_modules/@node-rs/**'] },
  poweredByHeader: false,
  outputFileTracingRoot: fileURLToPath(new URL('../../', import.meta.url)),
};
export default nextConfig;
