import { existsSync } from "node:fs";
import { bindings, defineConfig, defineWorker } from "cf/config";
import { createWorkersCacheConfig } from "@vinext/cloudflare/cache/config";

// Values come from the environment so nothing project-specific is committed. In Cloudflare
// builds set them under Settings › Build › Variables; locally they're read from .env.local.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`cloudflare.config.ts: ${name} is not set`);
  return value;
}

const cache = await createWorkersCacheConfig();

export default defineConfig({
  worker: defineWorker({
    ...cache,
    name: "aiforresearch",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-11-05",
    compatibilityFlags: ["nodejs_compat"],
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ...cache.env,
      ASSETS: bindings.assets(),
      VINEXT_KV_CACHE: bindings.kv({ id: env("VINEXT_KV_CACHE_ID") }),
      NEXT_PUBLIC_FIREBASE_APP_ID: bindings.text(env("NEXT_PUBLIC_FIREBASE_APP_ID")),
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: bindings.text(env("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN")),
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: bindings.text(env("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID")),
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: bindings.text(env("NEXT_PUBLIC_FIREBASE_PROJECT_ID")),
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: bindings.text(env("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET")),
      NEXT_PUBLIC_REALTIME_URL: bindings.text(env("NEXT_PUBLIC_REALTIME_URL")),
      COLLAB_URL: bindings.text(env("COLLAB_URL")),
      CONVERT_URL: bindings.text(env("CONVERT_URL")),
      // The embed service on Cloud Run (lib/server/lib/embeddings.ts). Optional: without it the
      // converter answers /embed itself.
      ...(process.env.EMBED_URL ? { EMBED_URL: bindings.text(process.env.EMBED_URL) } : {}),
      MAIL_PROVIDER: bindings.text(env("MAIL_PROVIDER")),
      MENDELEY_CLIENT_ID: bindings.text(env("MENDELEY_CLIENT_ID")),
      ZOTERO_CALLBACK_URL: bindings.text(env("ZOTERO_CALLBACK_URL")),
      ZOTERO_CLIENT_KEY: bindings.text(env("ZOTERO_CLIENT_KEY")),
      // Set as encrypted secrets on the Worker (dashboard "Secret" type or `wrangler secret put`),
      // never as plain-text vars — plain vars are printed in deploy diffs.
      DODO_PAYMENTS_API_KEY: bindings.secret(),
      DODO_PAYMENTS_WEBHOOK_KEY: bindings.secret(),
      RESEND_API_KEY: bindings.secret(),
      MENDELEY_CLIENT_SECRET: bindings.secret(),
      ZOTERO_CLIENT_SECRET: bindings.secret(),
      // Encrypts the Zotero/Mendeley tokens people connect (lib/server/lib/settings.ts). Keep it
      // stable: changing it disconnects them.
      SETTINGS_KEY: bindings.secret(),
      // Google credentials on the Worker (the service-account key file's JSON); lib/server/google
      // uses it for Firestore, Auth and Storage over their REST APIs.
      GOOGLE_SERVICE_ACCOUNT_JSON: bindings.secret(),
      // Local runs against the Firebase emulators: start `vite dev` with these set. Never set in
      // deploy builds, so production never has them.
      ...Object.fromEntries(
        ["FIRESTORE_EMULATOR_HOST", "FIREBASE_AUTH_EMULATOR_HOST", "FIREBASE_STORAGE_EMULATOR_HOST", "FIREBASE_PROJECT_ID"]
          .filter((name) => process.env[name] && process.env.FIRESTORE_EMULATOR_HOST)
          .map((name) => [name, bindings.text(process.env[name]!)]),
      ),
    },
  }),
});
