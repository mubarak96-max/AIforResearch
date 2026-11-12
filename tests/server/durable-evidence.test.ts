import { beforeEach, describe, expect, it, vi } from 'vitest';

const fake = await vi.hoisted(async () => (await import('./fakeFirestore.js')).createFakeFirestore());
const objects = vi.hoisted(() => new Map<string, Uint8Array>());
const pipeline = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock('../../lib/server/firebase.js', async (original) => ({ ...(await original<typeof import('../../lib/server/firebase.js')>()), ...fake.module }));
vi.mock('../../lib/server/lib/storage.js', () => ({
  saveFile: vi.fn(async (key: string, bytes: Uint8Array) => { objects.set(key, bytes); }),
  readFileBytes: vi.fn(async (key: string) => objects.has(key) ? Buffer.from(objects.get(key)!) : null),
  deletePrefix: async (prefix: string) => { for (const key of objects.keys()) if (key.startsWith(`${prefix}/`)) objects.delete(key); },
  deleteFile: vi.fn(async (key: string) => { objects.delete(key); }),
  openFile: async () => null,
}));
vi.mock('../../lib/server/lib/researchPipeline.js', () => ({ runResearch: pipeline.run }));
vi.mock('../../lib/server/usage.js', () => ({ recordUsage: vi.fn(async () => undefined) }));
vi.mock('../../lib/server/lib/users.js', async (original) => ({ ...(await original<typeof import('../../lib/server/lib/users.js')>()), activeUser: async (id: string) => fake.read(`users/${id}`) ?? null }));
import { deleteTask, getTaskFor, storeTaskResult, MAX_INLINE_RESULT_BYTES } from '../../lib/server/lib/history.js';
import { cancelResearch, enqueueResearch, runResearchJob, settleResearchFailure, recoverResearchJobs, saveResearchCheckpoint } from '../../lib/server/lib/researchJobs.js';
import { verifyEvidenceQuote } from '../../lib/server/routes/projectEvidence.js';
import { deleteFile, readFileBytes, saveFile } from '../../lib/server/lib/storage.js';
import { recordUsage } from '../../lib/server/usage.js';
import type { AuthUser } from '../../lib/server/auth.js';
import type { ResearchInput } from '../../lib/server/lib/research.js';
import type { Slots } from '../../lib/server/slots/types.js';

const user: AuthUser = { id: 'u1', email: 'one@example.test', account_id: 'a1', full_name: 'One', is_admin: false };
const input = { question: 'A research question', depth: 'summary', groups: ['papers'], filters: {}, headings: true, highQuality: false, attachments: [], libraryDocumentIds: [], profile: { role: null, field: null, citation_style: null, language: null } } as ResearchInput;
const charge = { accountId: 'a1', fromPlan: 5, fromTopup: 2, month: '2026-11' };
const result = { markdown: 'A saved answer.', sources: [], all_sources: [], usage: { inputTokens: 0, outputTokens: 0 }, steps: [] };
const slots = { llm: { provider: 'fake' } } as unknown as Slots;
beforeEach(() => {
  fake.clear(); objects.clear(); vi.clearAllMocks();
  fake.put('users/u1', { ...user, disabled_at: null });
  fake.put('accounts/a1', { credit_topup: 3 });
  fake.put('accounts/a1/plan_usage/credits__2026-11', { amount: 5 });
  fake.put('tasks/t1', { user_id: 'u1', account_id: 'a1', kind: 'research', status: 'running', inputs: {}, result: null, created_at: new Date(), updated_at: new Date() });
  pipeline.run.mockResolvedValue(result);
});

describe('complete evidence storage', () => {
  it('preserves all multilingual source content beyond the Firestore budget', async () => {
    const large = { markdown: '漢'.repeat(MAX_INLINE_RESULT_BYTES / 2), sources: Array.from({ length: 120 }, (_, id) => ({ id, passage: `Evidence ${id}` })) };
    const stored = await storeTaskResult('t1', large);
    expect(stored.result_ref).toMatch(/^tasks\/t1\/results\//);
    fake.put('tasks/t1', { ...fake.read('tasks/t1'), ...stored });
    expect((await getTaskFor(user, 't1')).result).toEqual(large);
    expect(stored.result).not.toHaveProperty('trimmed');
  });
  it('checks access before loading a private storage object', async () => {
    fake.put('tasks/t1', { ...fake.read('tasks/t1'), result_ref: 'tasks/t1/results/private.json' });
    await expect(getTaskFor({ ...user, id: 'stranger' }, 't1')).rejects.toMatchObject({ status: 404 });
    expect(readFileBytes).not.toHaveBeenCalled();
  });
  it('reports missing evidence instead of returning a partial summary', async () => {
    fake.put('tasks/t1', { ...fake.read('tasks/t1'), result_ref: 'tasks/t1/results/missing.json' });
    await expect(getTaskFor(user, 't1')).rejects.toMatchObject({ status: 503 });
  });
  it('can delete a broken saved task without requiring its unavailable evidence blob', async () => {
    fake.put('tasks/t1', { ...fake.read('tasks/t1'), status: 'failed', result_ref: 'tasks/t1/results/missing.json' });
    objects.set('tasks/t1/other.json', new Uint8Array([1]));
    await expect(deleteTask({ ...user, id: 'stranger' }, 't1')).rejects.toMatchObject({ status: 404 });
    await deleteTask(user, 't1');
    expect(fake.read('tasks/t1')).toBeUndefined(); expect(objects.size).toBe(0);
    expect(readFileBytes).not.toHaveBeenCalled();
  });
  it('requires a verbatim quotation on the selected page', () => {
    const pages = [{ page: 2, text: 'Participants\nreported improved sleep.' }];
    expect(verifyEvidenceQuote(pages, 'Participants reported improved sleep.', 2)).toBe(true);
    expect(verifyEvidenceQuote(pages, 'Participants reported improved sleep.', 3)).toBe(false);
    expect(verifyEvidenceQuote(pages, 'Participants reported worse sleep.', 2)).toBe(false);
  });
});

describe('durable research settlement', () => {
  it('can cancel a running job even when its checkpoint object is unavailable', async () => {
    await enqueueResearch(user, 't1', input, charge);
    fake.put('tasks/t1', { ...fake.read('tasks/t1'), result_ref: 'tasks/t1/results/missing.json' });
    await cancelResearch(user, 't1');
    expect(fake.read('research_jobs/t1')?.status).toBe('cancelled');
    expect(fake.read('accounts/a1/plan_usage/credits__2026-11')?.amount).toBe(0);
    expect(readFileBytes).not.toHaveBeenCalled();
  });
  it('cannot replace a completed result with an in-flight checkpoint', async () => {
    fake.put('research_jobs/t1', { task_id: 't1', status: 'running', lease: 'worker-1' });
    vi.mocked(saveFile).mockImplementationOnce(async (key, bytes) => {
      objects.set(key, bytes);
      fake.put('tasks/t1', { ...fake.read('tasks/t1'), status: 'done', result: { markdown: 'Final completed report' } });
      fake.put('research_jobs/t1', { task_id: 't1', status: 'done', lease: null });
    });
    const committed = await saveResearchCheckpoint('t1', 't1', 'worker-1', { markdown: 'Partial'.repeat(MAX_INLINE_RESULT_BYTES), attempt: 1 });
    expect(committed).toBe(false);
    expect(fake.read('tasks/t1')?.result.markdown).toBe('Final completed report');
    expect(fake.read('tasks/t1')?.status).toBe('done');
  });
  it('cleans a checkpoint upload that finishes after task deletion without touching other objects', async () => {
    fake.put('research_jobs/t1', { task_id: 't1', status: 'running', lease: 'worker-1' });
    objects.set('tasks/other/results/preserved.json', new Uint8Array([1]));
    vi.mocked(saveFile).mockImplementationOnce(async (key, bytes) => {
      fake.store.delete('tasks/t1'); fake.store.delete('research_jobs/t1');
      for (const path of objects.keys()) if (path.startsWith('tasks/t1/')) objects.delete(path);
      objects.set(key, bytes); // The upload finishes after deletion's prefix cleanup.
    });
    expect(await saveResearchCheckpoint('t1', 't1', 'worker-1', { markdown: 'x'.repeat(MAX_INLINE_RESULT_BYTES) })).toBe(false);
    expect([...objects.keys()]).toEqual(['tasks/other/results/preserved.json']);
    expect(deleteFile).toHaveBeenCalledWith(expect.stringMatching(/^tasks\/t1\/results\/worker-1\/[a-f0-9]+\.json$/));
    expect(fake.read('tasks/t1')).toBeUndefined();
  });
  it('cleans a final upload that finishes after user deletion without recreating the task', async () => {
    await enqueueResearch(user, 't1', input, charge);
    pipeline.run.mockResolvedValueOnce({ ...result, markdown: 'x'.repeat(MAX_INLINE_RESULT_BYTES) });
    vi.mocked(saveFile).mockImplementationOnce(async (key, bytes) => {
      fake.store.delete('tasks/t1'); fake.store.delete('research_jobs/t1'); fake.store.delete('users/u1');
      for (const path of objects.keys()) if (path.startsWith('tasks/t1/')) objects.delete(path);
      objects.set(key, bytes);
    });
    await runResearchJob('t1', slots);
    expect(objects.size).toBe(0);
    expect(deleteFile).toHaveBeenCalledTimes(1);
    expect(fake.read('tasks/t1')).toBeUndefined();
    expect(fake.read('research_jobs/t1')).toBeUndefined();
    expect(recordUsage).not.toHaveBeenCalled();
  });
  it('isolates equal result content by worker lease and preserves the surviving final object', async () => {
    const large = { markdown: 'x'.repeat(MAX_INLINE_RESULT_BYTES) };
    const final = await storeTaskResult('t1', large, 'winner');
    fake.put('tasks/t1', { ...fake.read('tasks/t1'), status: 'done', ...final });
    fake.put('research_jobs/t1', { task_id: 't1', status: 'done', lease: null });
    expect(await saveResearchCheckpoint('t1', 't1', 'stale-worker', large)).toBe(false);
    expect([...objects.keys()]).toEqual([final.result_ref]);
    expect((await getTaskFor(user, 't1')).result).toEqual(large);
    // Even within one attempt a rejected duplicate must not delete an existing committed pointer.
    vi.mocked(deleteFile).mockClear();
    expect(await saveResearchCheckpoint('t1', 't1', 'winner', large)).toBe(false);
    expect(deleteFile).not.toHaveBeenCalled();
    expect((await getTaskFor(user, 't1')).result).toEqual(large);
  });
  it('does not reclaim a live lease or refund a running final attempt', async () => {
    await enqueueResearch(user, 't1', input, charge);
    fake.put('research_jobs/t1', { ...fake.read('research_jobs/t1'), status: 'running', attempt: 3, lease: 'live', lease_until: new Date(Date.now() + 60_000) });
    await recoverResearchJobs();
    await settleResearchFailure('t1', 'failed', 'Stale scheduler', undefined, true);
    expect(fake.read('research_jobs/t1')).toMatchObject({ status: 'running', lease: 'live', refunded: false });
    expect(fake.read('accounts/a1/plan_usage/credits__2026-11')?.amount).toBe(5);
  });
  it('stores input once and does not execute a delivered completed job twice', async () => {
    await enqueueResearch(user, 't1', input, charge);
    await runResearchJob('t1', slots);
    await runResearchJob('t1', slots);
    expect(pipeline.run).toHaveBeenCalledTimes(1);
    expect(fake.read('tasks/t1')?.status).toBe('done');
    expect(fake.read('research_jobs/t1')?.status).toBe('done');
  });
  it('finishes prepaid research under its original payer after the user changes Team accounts', async () => {
    await enqueueResearch(user, 't1', { ...input, depth: 'detailed' } as ResearchInput, charge);
    fake.put('users/u1', { ...user, account_id: 'new-team', disabled_at: null });
    pipeline.run.mockResolvedValueOnce({ ...result, usage: { inputTokens: 12, outputTokens: 8 } });
    await runResearchJob('t1', slots);
    expect(fake.read('tasks/t1')).toMatchObject({ status: 'done', account_id: 'a1', user_id: 'u1' });
    expect(pipeline.run.mock.calls[0][2].userId).toBe('u1');
    expect(recordUsage).toHaveBeenCalledWith(expect.objectContaining({ accountId: 'a1' }));
    expect(vi.mocked(recordUsage).mock.calls.every(([usage]) => usage.accountId === 'a1')).toBe(true);
    const usage = [...fake.store.entries()].find(([path]) => path.startsWith('accounts/a1/plan_usage/research_runs__'));
    expect(usage?.[1].amount).toBe(1);
    expect([...fake.store.keys()].some((path) => path.startsWith('accounts/new-team/'))).toBe(false);
  });
  it('refunds cancellation exactly once even if delivered repeatedly', async () => {
    await enqueueResearch(user, 't1', input, charge);
    await settleResearchFailure('t1', 'cancelled', 'Cancelled.');
    await settleResearchFailure('t1', 'cancelled', 'Cancelled.');
    expect(fake.read('accounts/a1/plan_usage/credits__2026-11')?.amount).toBe(0);
    expect(fake.read('accounts/a1')?.credit_topup).toBe(5);
  });
  it('does not publish a result after cancellation won the transaction', async () => {
    await enqueueResearch(user, 't1', input, charge);
    pipeline.run.mockImplementationOnce(async () => { await settleResearchFailure('t1', 'cancelled', 'Cancelled.'); return result; });
    await runResearchJob('t1', slots);
    expect(fake.read('tasks/t1')?.status).toBe('failed');
    expect(fake.read('research_jobs/t1')?.status).toBe('cancelled');
    expect(fake.read('tasks/t1')?.result).toBeNull();
  });
  it('queues a transient failure without another debit or an early refund', async () => {
    await enqueueResearch(user, 't1', input, charge);
    pipeline.run.mockRejectedValueOnce(new Error('Temporary provider failure'));
    await runResearchJob('t1', slots);
    expect(fake.read('research_jobs/t1')).toMatchObject({ status: 'queued', attempt: 1, refunded: false });
    expect(fake.read('accounts/a1/plan_usage/credits__2026-11')?.amount).toBe(5);
  });
});
