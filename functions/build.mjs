import { build } from 'esbuild';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

/**
 * Builds functions/dist, the folder `firebase deploy` uploads (firebase.json "source"):
 *   dist/index.js      the functions plus the parts of @researchcove/server they use, bundled
 *   dist/package.json  runtime dependencies only (no workspace packages, which Cloud Build
 *                      could not install)
 *   dist/.env*         copied from functions/ when present
 * Packages with native code, or that Firebase provides, stay external.
 */
const external = ['firebase-admin', 'firebase-functions', '@node-rs/argon2', 'nodemailer', 'stripe', 'openai'];

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: true,
  external: external.flatMap((name) => [name, `${name}/*`]),
  // Some bundled CommonJS code calls require(); give the ESM bundle one.
  banner: { js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);" },
  logLevel: 'info',
});

const pkg = JSON.parse(await readFile('package.json', 'utf8'));
await writeFile('dist/package.json', JSON.stringify({
  name: pkg.name.replace('@researchcove/', 'researchcove-'), private: true, type: 'module', main: 'index.js',
  engines: pkg.engines, dependencies: pkg.dependencies,
}, null, 2) + '\n');
for (const file of ['.env', '.env.local', `.env.${process.env.GCLOUD_PROJECT || ''}`]) {
  if (file !== '.env.' && existsSync(file)) await copyFile(file, `dist/${file}`);
}
