import { build } from 'esbuild';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Builds services/collab/dist, a self-contained folder for Cloud Run:
 *   dist/index.js      the service plus the parts of lib/server it uses, bundled
 *   dist/package.json  the packages left external, to install with `npm install --omit=dev`
 * Its dependencies are in the root package.json (it shares lib/server with the app). Run from
 * the root: `pnpm build:collab`.
 */
const here = dirname(fileURLToPath(import.meta.url));
const app = JSON.parse(await readFile(join(here, '../../package.json'), 'utf8'));
// Native code, packages lib/server must share one copy of, and large ones.
const external = ['@hocuspocus/server', '@hocuspocus/extension-database', 'ws', 'yjs', 'firebase-admin', '@node-rs/argon2', 'nodemailer', 'stripe', 'openai'];
const dist = join(here, 'dist');

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await build({
  entryPoints: [join(here, 'src/index.ts')],
  outfile: join(dist, 'index.js'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: true,
  external: external.flatMap((name) => [name, `${name}/*`]),
  banner: { js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);" },
  logLevel: 'info',
});
await writeFile(join(dist, 'package.json'), JSON.stringify({
  name: 'writegrid-collab', private: true, type: 'module', main: 'index.js', engines: { node: '22' },
  scripts: { start: 'node index.js' },
  dependencies: Object.fromEntries(external.map((name) => [name, app.dependencies[name]])),
}, null, 2) + '\n');
