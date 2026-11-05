import { spawn } from 'node:child_process';

/** `pnpm dev:all` runs this inside the emulators: the Next.js app (:3000) and collab (:4200). */
const children = [
  ['web', 'pnpm dev'],
  ['collab', 'pnpm dev:collab'],
].map(([name, command]) => {
  const child = spawn(command, { shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const prefix = (stream, out) => stream.on('data', (chunk) => {
    for (const line of chunk.toString().split(/\r?\n/)) if (line) out.write(`[${name}] ${line}\n`);
  });
  prefix(child.stdout, process.stdout);
  prefix(child.stderr, process.stderr);
  child.on('exit', (code) => { console.log(`[${name}] exited (${code})`); stop(code ?? 1); });
  return child;
});

let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exit(code);
}
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
