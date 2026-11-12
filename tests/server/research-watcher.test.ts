import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => vi.fn());
vi.mock('../../lib/session', () => ({ api, authHeaders: async () => ({}), ApiError: class extends Error { constructor(message: string, public status: number) { super(message); } } }));
import { ApiError } from '../../lib/session';
import { watchResearchTask } from '../../components/app/research/stream';
beforeEach(() => { vi.useFakeTimers(); api.mockReset(); });
afterEach(() => { vi.useRealTimers(); });
describe('saved research progress connection', () => {
  it('reconnects after a dropped network connection without posting another paid job', async () => {
    api.mockRejectedValueOnce(new TypeError('Network unavailable')).mockResolvedValueOnce({ status: 'done', credits: 5, result: { markdown: 'Finished while offline' } });
    const events: string[] = [];
    const watching = watchResearchTask('saved-job', (event) => events.push(event));
    await vi.advanceTimersByTimeAsync(1000); await watching;
    expect(api).toHaveBeenCalledTimes(2);
    expect(api.mock.calls.every(([path]) => path === '/api/history/saved-job')).toBe(true);
    expect(events).toEqual(['watch_status', 'watch_status', 'snapshot', 'done']);
  });
  it('stops watching on unmount without cancelling the saved job', async () => {
    api.mockResolvedValue({ status: 'running' });
    const controller = new AbortController();
    const watching = watchResearchTask('saved-job', () => undefined, controller.signal);
    const rejected = expect(watching).rejects.toMatchObject({ name: 'AbortError' });
    await vi.advanceTimersByTimeAsync(0); controller.abort(); await rejected;
    expect(api).toHaveBeenCalledTimes(1);
  });
  it('does not retry a denied private task', async () => {
    api.mockRejectedValue(new ApiError('Not found', 404, null));
    await expect(watchResearchTask('private', () => undefined)).rejects.toMatchObject({ status: 404 });
    expect(api).toHaveBeenCalledTimes(1);
  });
});
