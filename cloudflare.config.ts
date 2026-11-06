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
    name: "writeorbit",
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
    },
  }),
});
