import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fake = await vi.hoisted(async () => (await import('./fakeFirestore.js')).createFakeFirestore());
const objects = vi.hoisted(() => new Map<string, Uint8Array>());
const pipeline = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock('../../lib/server/firebase.js', async (original) => ({ ...(await original<typeof import('../../lib/server/firebase.js')>()), ...fake.module }));
vi.mock('../../lib/server/lib/storage.js', () => ({
  saveFile: vi.fn(async (key: string, bytes: Uint8Array) => { objects.set(key, bytes); }),
  readFileBytes: vi.fn(async (key: string) => (objects.has(key) ? Buffer.from(objects.get(key)!) : null)),
  deletePrefix: async (prefix: string) => { for (const key of objects.keys()) if (key.startsWith(`${prefix}/`)) objects.delete(key); },
  deleteFile: vi.fn(async (key: string) => { objects.delete(key); }),
  openFile: async () => null,
}));
vi.mock('../../lib/server/lib/researchPipeline.js', () => ({ runResearch: pipeline.run }));
vi.mock('../../lib/server/usage.js', () => ({ recordUsage: vi.fn(async () => undefined) }));
vi.mock('../../lib/server/lib/users.js', async (original) => ({
  ...(await original<typeof import('../../lib/server/lib/users.js')>()),
  activeUser: async (id: string) => fake.read(`users/${id}`) ?? null,
}));
import {
  deleteTask, getTaskFor, publicTask, storeTaskResult, toSummary, updateTaskResult, MAX_INLINE_RESULT_BYTES, STALE_RUN_MS, type Task,
} from '../../lib/server/lib/history.js';
import { cancelResearch, enqueueResearch, runResearchJob, saveResearchCheckpoint, RUN_DEADLINE_MS } from '../../lib/server/lib/researchJobs.js';
import type { AuthUser } from '../../lib/server/auth.js';
import type { ResearchInput } from '../../lib/server/lib/research.js';
import type { Slots } from '../../lib/server/slots/types.js';

const user: AuthUser = { id: 'u1', email: 'one@example.test', account_id: 'a1', full_name: 'One', is_admin: false };
const input = {
  question: 'A research question', depth: 'deep', groups: ['papers'], filters: {}, headings: true, highQuality: false,
  attachments: [], libraryDocumentIds: [], profile: { role: null, field: null, citation_style: null, language: null },
} as ResearchInput;
const charge = { accountId: 'a1', fromPlan: 5, fromTopup: 2, month: '2026-11' };
const slots = { llm: { provider: 'fake' } } as unknown as Slots;
const large = (fill: string) => ({ markdown: fill.repeat(MAX_INLINE_RESULT_BYTES) });
const resultKeys = () => [...objects.keys()].filter((key) => key.startsWith('tasks/t1/results/'));
const longAgo = () => new Date(Date.now() - STALE_RUN_MS - 60_000);

beforeEach(() => {
  fake.clear(); objects.clear(); vi.clearAllMocks();
  fake.put('users/u1', { ...user, disabled_at: null });
  fake.put('accounts/a1', { credit_topup: 3 });
  fake.put('accounts/a1/plan_usage/credits__2026-11', { amount: 5 });
  const now = new Date();
  fake.put('tasks/t1', { user_id: 'u1', account_id: 'a1', kind: 'research', status: 'running', inputs: {}, result: null, created_at: now, updated_at: now });
});
afterEach(() => { vi.useRealTimers(); });

describe('running tasks can always be cleared', () => {
  it('refuses to delete a live streamed run but allows an abandoned one', async () => {
    await expect(deleteTask(user, 't1')).rejects.toMatchObject({ status: 409 });
    fake.put('tasks/t1', { ...fake.read('tasks/t1'), created_at: longAgo(), updated_at: longAgo() });
    await deleteTask(user, 't1');
    expect(fake.read('tasks/t1')).toBeUndefined();
  });
  it('requires an active background job to be cancelled first, then allows deletion', async () => {
    await enqueueResearch(user, 't1', input, charge);
    fake.put('tasks/t1', { ...fake.read('tasks/t1'), created_at: longAgo(), updated_at: longAgo() });
    await expect(deleteTask(user, 't1')).rejects.toMatchObject({ status: 409 });
    await cancelResearch(user, 't1');
    await deleteTask(user, 't1');
    expect(fake.read('tasks/t1')).toBeUndefined();
  });
  it('closes an abandoned streamed run on cancel without a job document', async () => {
    await expect(cancelResearch(user, 't1')).rejects.toMatchObject({ status: 409 });
    fake.put('tasks/t1', { ...fake.read('tasks/t1'), updated_at: longAgo() });
    await cancelResearch(user, 't1');
    expect(fake.read('tasks/t1')).toMatchObject({ status: 'failed' });
  });
});

describe('background deadline', () => {
  it('ends a run that reaches the time limit with one refund instead of retrying it', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    pipeline.run.mockImplementation((_llm, _input, options: { signal: AbortSignal }) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    }));
    await enqueueResearch(user, 't1', input, charge);
    const running = runResearchJob('t1', slots);
    await vi.advanceTimersByTimeAsync(RUN_DEADLINE_MS + 1_000);
    await running;
    expect(fake.read('research_jobs/t1')).toMatchObject({ status: 'failed', refunded: true, attempt: 1 });
    expect(fake.read('tasks/t1')?.error).toMatch(/time limit/);
    expect(fake.read('accounts/a1/plan_usage/credits__2026-11')?.amount).toBe(0);
    expect(fake.read('accounts/a1')?.credit_topup).toBe(5);
    expect(pipeline.run).toHaveBeenCalledTimes(1);
  });
});

describe('superseded result objects', () => {
  it('keeps only the latest stored result for a task saved repeatedly', async () => {
    await updateTaskResult('t1', large('a'));
    await updateTaskResult('t1', large('b'));
    await updateTaskResult('t1', large('c'));
    expect(resultKeys()).toEqual([fake.read('tasks/t1')?.result_ref]);
    expect((await getTaskFor(user, 't1')).result).toEqual(large('c'));
  });
  it('removes the previous checkpoint once a newer one is committed', async () => {
    await enqueueResearch(user, 't1', input, charge);
    fake.put('research_jobs/t1', { ...fake.read('research_jobs/t1'), status: 'running', lease: 'L1' });
    expect(await saveResearchCheckpoint('t1', 't1', 'L1', large('a'))).toBe(true);
    expect(await saveResearchCheckpoint('t1', 't1', 'L1', large('b'))).toBe(true);
    expect(resultKeys()).toEqual([fake.read('tasks/t1')?.result_ref]);
  });
});

describe('stored evidence integrity', () => {
  it('treats a storage reference without its hash as corrupt evidence', async () => {
    const stored = await storeTaskResult('t1', large('a'));
    fake.put('tasks/t1', { ...fake.read('tasks/t1'), result_ref: stored.result_ref, result_sha256: null });
    await expect(getTaskFor(user, 't1')).rejects.toMatchObject({ status: 503 });
  });
  it('reports unparseable stored JSON as unreadable evidence, not a server error', async () => {
    const bytes = new TextEncoder().encode('{not json');
    const { createHash } = await import('node:crypto');
    const key = 'tasks/t1/results/broken.json';
    objects.set(key, bytes);
    fake.put('tasks/t1', { ...fake.read('tasks/t1'), result_ref: key, result_sha256: createHash('sha256').update(bytes).digest('hex') });
    await expect(getTaskFor(user, 't1')).rejects.toMatchObject({ status: 503, message: expect.stringMatching(/saved evidence/) });
  });
  it('never exposes storage pointers in task responses or summaries', async () => {
    const task = { ...fake.read('tasks/t1'), id: 't1', result_ref: 'tasks/t1/results/x.json', result_sha256: 'abc' } as unknown as Task;
    expect(publicTask(task)).not.toHaveProperty('result_ref');
    expect(publicTask(task)).not.toHaveProperty('result_sha256');
    expect(toSummary(task)).not.toHaveProperty('result_ref');
  });
});
