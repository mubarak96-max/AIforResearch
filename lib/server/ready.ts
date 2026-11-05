import { loadSettings, watchSettings } from './lib/settings.js';
import { seedPlans } from './lib/plans.js';

/**
 * Work the old server did once at start (it had a `main`; route handlers and functions do not):
 * load admin settings and keep them current across instances, and create the default plans
 * on an empty project. Runs once per process, on the first request.
 */
let started: Promise<void> | null = null;

export function ready(): Promise<void> {
  started ??= (async () => {
    await loadSettings();
    watchSettings();
    if (await seedPlans()) console.log('default plans created');
  })().catch((error) => {
    started = null;
    throw error;
  });
  return started;
}
