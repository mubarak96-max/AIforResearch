import { defineConfig } from 'vitest/config';

/** Unit tests for the API (lib/server) and the collab service. Security-rules tests run separately: `pnpm test:rules`. */
export default defineConfig({
  test: { include: ['tests/server/**/*.test.ts', 'services/collab/test/**/*.test.ts'], environment: 'node' },
});
