/** Durable research on the existing Firebase worker infrastructure. No browser connection owns a job. */
import { HTTPException } from 'hono/http-exception';
import type { AuthUser } from '../auth.js';
import { C, col, db, increment, newId, row, rows } from '../firebase.js';
import type { Transaction } from 'firebase-admin/firestore';
import type { Slots } from '../slots/types.js';
import { createSlots } from '../slots/index.js';
import { LlmError, llmModelName } from '../slots/llm.js';
import { meterTokens } from './assist-llm.js';
import { type CreditCharge, countUse } from './plans.js';
import { deleteSupersededResult, getTaskFor, isAbandonedRun, storeTaskResult } from './history.js';
import { deleteFile, readFileBytes, saveFile } from './storage.js';
import { runResearch } from './researchPipeline.js';
import { ResearchEmptyError, type ResearchInput, type ResearchStep } from './research.js';
import { activeUser } from './users.js';

export const RESEARCH_JOBS = 'research_jobs';
type JobStatus = 'queued' | 'running' | 'done' | 'failed' | 'cancelled';
type Job = {
  id: string; user_id: string; task_id: string; status: JobStatus; attempt: number;
  lease: string | null; lease_until: Date | null; input_ref: string; charge: CreditCharge; refunded: boolean;
  created_at: Date; updated_at: Date;
};
const LEASE_MS = 10 * 60_000;
const MAX_ATTEMPTS = 3;
/** One attempt's wall-clock budget, below the worker's own timeout. */
export const RUN_DEADLINE_MS = 490_000;
const DEADLINE_MESSAGE = 'The research reached the time limit for one background run (about 8 minutes). '
  + 'Your credits were returned; the partial result remains available. Try a narrower question or a shorter depth.';

/** Returns a reserved charge inside the caller's transaction (mirrors plans.refundCredits). */
function refundTx(tx: Transaction, charge: CreditCharge) {
  const account = col(C.accounts).doc(charge.accountId);
  if (charge.fromPlan) tx.set(account.collection(C.planUsage).doc(`credits__${charge.month}`), { amount: increment(-charge.fromPlan) }, { merge: true });
  if (charge.fromTopup) tx.set(account, { credit_topup: increment(charge.fromTopup) }, { merge: true });
}

/** Whether a job document exists for this task, whatever its state. */
export async function researchJobExists(taskId: string) {
  return (await col(RESEARCH_JOBS).doc(taskId).get()).exists;
}

/** A rejected attempt may finish uploading after user deletion. Never delete another attempt's object. */
async function discardUnreferencedResult(taskId: string, lease: string, key: string | null) {
  if (!key || !key.startsWith(`tasks/${taskId}/results/${lease}/`)) return;
  const task = await col(C.tasks).doc(taskId).get();
  // A prior successful checkpoint/final save may have the same content hash in this attempt.
  if (task.get('result_ref') !== key) await deleteFile(key);
}

/** Checkpoint storage can be slow; the lease must still be current when its pointer commits. */
export async function saveResearchCheckpoint(jobId: string, taskId: string, lease: string, result: Record<string, unknown>) {
  const stored = await storeTaskResult(taskId, result, lease);
  const committed = await db().runTransaction(async (tx) => {
    const job = await tx.get(col(RESEARCH_JOBS).doc(jobId));
    const taskRef = col(C.tasks).doc(taskId);
    const task = await tx.get(taskRef);
    if (!task.exists || task.get('status') !== 'running' || job.get('lease') !== lease || job.get('status') !== 'running') return null;
    tx.update(taskRef, { ...stored, updated_at: new Date() });
    return { previous: (task.get('result_ref') as string | null | undefined) ?? null };
  });
  if (!committed) { await discardUnreferencedResult(taskId, lease, stored.result_ref); return false; }
  await deleteSupersededResult(taskId, committed.previous, stored.result_ref);
  return true;
}

export async function enqueueResearch(user: AuthUser, taskId: string, input: ResearchInput, charge: CreditCharge) {
  const key = `tasks/${taskId}/input.json`;
  await saveFile(key, new TextEncoder().encode(JSON.stringify(input)), 'application/json');
  const now = new Date();
  await col(RESEARCH_JOBS).doc(taskId).create({
    user_id: user.id, task_id: taskId, status: 'queued', attempt: 0, lease: null, lease_until: null,
    input_ref: key, charge, refunded: false, created_at: now, updated_at: now,
  });
  return taskId;
}

/** Terminal state and credit refund are one transaction: trigger redelivery cannot refund twice. */
export async function settleResearchFailure(id: string, status: 'failed' | 'cancelled', message: string, lease?: string, expiredOnly = false) {
  await db().runTransaction(async (tx) => {
    const ref = col(RESEARCH_JOBS).doc(id);
    const snapshot = await tx.get(ref);
    const job = row<Job>(snapshot);
    if (!job || job.status === 'done' || (lease && job.lease !== lease)) return;
    // A scheduler snapshot can be stale by the time this transaction runs.
    const leaseActive = !!job.lease_until && job.lease_until.getTime() > Date.now();
    if (expiredOnly && (!['queued', 'running'].includes(job.status) || job.attempt < MAX_ATTEMPTS || leaseActive)) return;
    const taskRef = col(C.tasks).doc(job.task_id);
    const task = await tx.get(taskRef);
    if (task.exists && task.get('status') === 'done') { tx.update(ref, { status: 'done', lease: null }); return; }
    if (!job.refunded) refundTx(tx, job.charge);
    tx.update(ref, { status, refunded: true, lease: null, lease_until: null, updated_at: new Date() });
    if (task.exists) tx.update(taskRef, { status: 'failed', error: message, credits: 0, updated_at: new Date() });
  });
}

export async function cancelResearch(user: AuthUser, taskId: string) {
  const task = await getTaskFor(user, taskId, 'edit', false);
  if (task.user_id !== user.id) throw new HTTPException(403, { message: 'Only the person who started the research can cancel it.' });
  if (task.status !== 'running') throw new HTTPException(409, { message: 'This research is not running.' });
  const job = row<Job>(await col(RESEARCH_JOBS).doc(taskId).get());
  if (job) { await settleResearchFailure(taskId, 'cancelled', 'Cancelled. Your credits were returned.'); return; }
  // A live stream is stopped by closing it (the page's Stop button); only an abandoned one is closed here.
  if (!isAbandonedRun(task)) {
    throw new HTTPException(409, { message: 'This report is streaming. Use Stop on its page, or close that page, to end it.' });
  }
  await markAbandoned(taskId);
}

/** Closes a streamed run whose server stopped before it could save a result or a failure. */
async function markAbandoned(taskId: string) {
  const ref = col(C.tasks).doc(taskId);
  await db().runTransaction(async (tx) => {
    const task = await tx.get(ref);
    if (!task.exists || task.get('status') !== 'running') return;
    tx.update(ref, { status: 'failed', error: 'This run stopped when its server restarted and did not finish.', updated_at: new Date() });
  });
}

/** Treats an error from one attempt: deadline and permanent errors end the job; others requeue it. */
function failureMessage(error: unknown, timedOut: boolean) {
  if (timedOut) return DEADLINE_MESSAGE;
  if (error instanceof ResearchEmptyError) return `${error.message} Your credits were returned.`;
  return 'The research could not finish. Your credits were returned; the partial result remains available.';
}

function isPermanent(error: unknown) {
  return error instanceof ResearchEmptyError || (error instanceof LlmError && error.status < 500 && error.status !== 429);
}

export async function runResearchJob(id: string, slots: Slots = createSlots()) {
  const ref = col(RESEARCH_JOBS).doc(id);
  const lease = newId();
  const job = await db().runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    const value = row<Job>(snapshot);
    if (!value || ['done', 'failed', 'cancelled'].includes(value.status)) return null;
    if (value.status === 'running' && value.lease_until && value.lease_until.getTime() > Date.now()) return null;
    const task = await tx.get(col(C.tasks).doc(value.task_id));
    if (!task.exists || task.get('status') === 'done') { tx.update(ref, { status: task.exists ? 'done' : 'cancelled', lease: null }); return null; }
    tx.update(ref, { status: 'running', attempt: value.attempt + 1, lease, lease_until: new Date(Date.now() + LEASE_MS), updated_at: new Date() });
    return { ...value, attempt: value.attempt + 1 };
  });
  if (!job) return;
  if (job.attempt > MAX_ATTEMPTS) { await settleResearchFailure(id, 'failed', 'The research could not finish after three attempts. Your credits were returned.', lease); return; }
  const abort = new AbortController();
  let timedOut = false;
  // A run that needs longer will need longer again: a retry would triple the spend for nothing.
  const deadline = setTimeout(() => { timedOut = true; abort.abort(); }, RUN_DEADLINE_MS);
  let cancelled = false;
  let pollBusy = false;
  const poll = setInterval(async () => {
    if (pollBusy) return;
    pollBusy = true;
    try {
      const current = row<Job>(await ref.get());
      if (!current || current.lease !== lease || current.status !== 'running') { cancelled = true; abort.abort(); }
    } catch { /* The lease still prevents concurrent execution until it expires. */ }
    finally { pollBusy = false; }
  }, 10_000);
  const checkpoint: Record<string, unknown> = { markdown: '', steps: [], background: true, attempt: job.attempt };
  let writes = Promise.resolve();
  let checkpointError: unknown = null;
  let lastSaved = 0;
  const flush = (force = false) => {
    if (cancelled || (!force && Date.now() - lastSaved < 5000)) return;
    lastSaved = Date.now();
    const copy = JSON.parse(JSON.stringify(checkpoint));
    writes = writes.then(async () => {
      const current = row<Job>(await ref.get());
      if (current?.lease === lease && current.status === 'running') await saveResearchCheckpoint(id, job.task_id, lease, copy);
    }).catch((error) => { checkpointError = error; });
  };
  try {
    const user = await activeUser(job.user_id);
    if (!user) throw new Error('The account is no longer active.');
    const bytes = await readFileBytes(job.input_ref);
    if (!bytes) throw new Error('The saved research input is unavailable.');
    const input = JSON.parse(bytes.toString('utf8')) as ResearchInput;
    const result = await runResearch(slots.llm, input, { userId: user.id, signal: abort.signal }, {
      step: (step) => { checkpoint.steps = [...(checkpoint.steps as ResearchStep[]).filter((item) => item.id !== step.id), step]; flush(true); },
      sources: (sources, web, searched) => { checkpoint.sources = sources; checkpoint.all_sources = [...sources, ...web]; checkpoint.searched = searched; flush(true); },
      delta: (text) => { checkpoint.markdown = String(checkpoint.markdown) + text; flush(); },
      markdown: (text) => { checkpoint.markdown = text; flush(true); },
      figures: (figures) => { checkpoint.figures = figures; flush(true); },
    });
    await writes;
    if (checkpointError) console.warn('research checkpoint could not be saved; saving final result', checkpointError);
    // Saving comes before metering: a metering failure must not discard the completed report.
    const saved = { ...result, follow_ups: [], background: true, attempt: job.attempt };
    const stored = await storeTaskResult(job.task_id, saved, lease);
    const committed = await db().runTransaction(async (tx) => {
      const current = await tx.get(ref);
      const taskRef = col(C.tasks).doc(job.task_id);
      const task = await tx.get(taskRef);
      if (!task.exists || current.get('lease') !== lease || current.get('status') !== 'running') return false;
      tx.update(taskRef, { status: 'done', ...stored, updated_at: new Date() });
      tx.update(ref, { status: 'done', lease: null, lease_until: null, updated_at: new Date() });
      return { previous: (task.get('result_ref') as string | null | undefined) ?? null };
    });
    if (!committed) { await discardUnreferencedResult(job.task_id, lease, stored.result_ref); return; }
    await deleteSupersededResult(job.task_id, committed.previous, stored.result_ref);
    // Joining or leaving a Team does not move an already reserved job to a new payer.
    // Source access and output ownership still use the original user's identity above.
    const billingUser = { ...user, account_id: job.charge.accountId };
    await meterTokens(billingUser, result.usage, { feature: `research:${input.depth}`, provider: slots.llm.provider, model: llmModelName(slots.llm, input.highQuality || input.depth !== 'summary' ? 'review' : 'fast') }).catch((error) => console.error('research metering', error));
    if (input.depth !== 'summary') await countUse(billingUser.account_id, 'research_runs').catch((error) => console.error('research count', error));
  } catch (error) {
    await writes.catch(() => undefined);
    if (cancelled) return;
    const terminal = timedOut || isPermanent(error) || job.attempt >= MAX_ATTEMPTS;
    if (terminal) await settleResearchFailure(id, 'failed', failureMessage(error, timedOut), lease);
    else await db().runTransaction(async (tx) => {
      const current = await tx.get(ref);
      if (current.get('lease') === lease && current.get('status') === 'running') tx.update(ref, { status: 'queued', lease: null, lease_until: null, updated_at: new Date() });
    });
  } finally { clearTimeout(deadline); clearInterval(poll); }
}

/** Recover after worker termination. Retry the saved inputs while retaining the latest partial result. */
export async function recoverResearchJobs() {
  for (const status of ['queued', 'running']) {
    const jobs = rows<Job>(await col(RESEARCH_JOBS).where('status', '==', status).limit(50).get());
    for (const job of jobs) {
      if (status === 'running' && job.lease_until && job.lease_until.getTime() > Date.now()) continue;
      if (job.attempt >= MAX_ATTEMPTS) await settleResearchFailure(job.id, 'failed', 'The research timed out. Your credits were returned; the partial result remains available.', undefined, true);
      else await db().runTransaction(async (tx) => {
        const ref = col(RESEARCH_JOBS).doc(job.id);
        const current = row<Job>(await tx.get(ref));
        if (!current || !['queued', 'running'].includes(current.status) || current.attempt >= MAX_ATTEMPTS) return;
        if (current.lease_until && current.lease_until.getTime() > Date.now()) return;
        tx.update(ref, { status: 'queued', lease: null, lease_until: null, recovery: newId(), updated_at: new Date() });
      });
    }
  }
}
