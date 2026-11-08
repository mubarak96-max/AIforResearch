/**
 * Work to do once per process, on the first request. Settings come from the environment and
 * plans from code, so there is nothing to load today; kept so callers have one place to wait on.
 */
let started: Promise<void> | null = null;

export function ready(): Promise<void> {
  started ??= Promise.resolve();
  return started;
}
