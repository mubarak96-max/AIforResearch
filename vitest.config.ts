import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/** Unit tests for the API (lib/server) and the collab service. Security-rules tests run separately: `pnpm test:rules`. */
export default defineConfig({
  // The app's "@/..." imports (tsconfig paths), for tests that reach shared modules in lib/ and components/.
  resolve: { alias: { '@': fileURLToPath(new URL('./', import.meta.url)) } },
  test: { include: ['tests/server/**/*.test.ts', 'services/collab/test/**/*.test.ts'], environment: 'node' },
});
