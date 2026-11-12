import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/** Unit tests for the API (lib/server) and the collab service. Security-rules tests run separately: `pnpm test:rules`. */
export default defineConfig({
  // The app's "@/..." imports (tsconfig paths), for tests that reach shared modules in lib/ and components/.
  resolve: { alias: { '@': fileURLToPath(new URL('./', import.meta.url)) } },
  // Components render with the automatic JSX runtime, as in Next.js (no React import in scope).
  esbuild: { jsx: 'automatic' },
  test: { include: ['tests/server/**/*.test.ts', 'services/collab/test/**/*.test.ts'], environment: 'node' },
});
