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
  webpack(config, { isServer, webpack }) {
    config.resolve.extensionAlias = { ...config.resolve.extensionAlias, '.js': ['.ts', '.tsx', '.js'] };
    if (!isServer) {
      // pptxgenjs (Slides' PowerPoint download, in the browser) imports node:fs and node:https for its
      // Node build; its package maps them to nothing in browsers once the "node:" prefix is gone.
      config.plugins.push(new webpack.NormalModuleReplacementPlugin(/^node:(fs|https)$/, (resource) => { resource.request = resource.request.replace(/^node:/, ''); }));
      config.resolve.fallback = { ...config.resolve.fallback, fs: false, https: false };
    }
    return config;
  },
};
export default nextConfig;
