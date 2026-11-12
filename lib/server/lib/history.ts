/**
 * History: every job a person runs (a research report, a review, a draft, a screening round…)
 * is a task they can reopen, continue, move into a project or delete. Workspaces write here
 * through createTask / finishTask / failTask; the History page and Home read listTasks.
 *
 * tasks/{id}: { user_id, account_id, project_id, kind, title, status, inputs, result, credits,
 * error, created_at, updated_at }. Shared projects let their members read the project's tasks.
 */
import { HTTPException } from 'hono/http-exception';
import type { AuthUser } from '../auth.js';
import { C, col, db, newId, row, rows } from '../firebase.js';
import { projectRole } from './projects.js';
import { createHash } from 'node:crypto';
import { deleteFile, deletePrefix, readFileBytes, saveFile } from './storage.js';

export const TASK_KINDS = [
  'research', 'papers', 'review', 'claim_check', 'citation_check', 'guideline_check', 'thesis', 'proposal', 'writing', 'systematic_review',
  'data', 'citation_map', 'landscape', 'slides', 'tool', 'chat_pdf',
] as const;
export type TaskKind = (typeof TASK_KINDS)[number];
export type TaskStatus = 'running' | 'done' | 'failed';

export type Task = {
  id: string;
  user_id: string;
  account_id: string;
  project_id: string | null;
  kind: TaskKind;
  /** Which module of a workspace (e.g. "outline" in Thesis Suite). */
  module: string | null;
  title: string;
  status: TaskStatus;
  inputs: Record<string, unknown>;
  result: Record<string, unknown> | null;
  result_ref?: string | null;
  result_sha256?: string | null;
  credits: number;
  error: string | null;
  starred: boolean;
  created_at: Date;
  updated_at: Date;
};

export type TaskSummary = Omit<Task, 'inputs' | 'result'> & { summary: string | null };

/** Use UTF-8 bytes, not character count: multilingual evidence must fit too. */
export const MAX_INLINE_RESULT_BYTES = 400_000;
export async function storeTaskResult(id: string, result: Record<string, unknown>, namespace?: string) {
  if (namespace !== undefined && !/^[A-Za-z0-9_-]{1,128}$/.test(namespace)) throw new Error('Invalid result namespace.');
  const bytes = new TextEncoder().encode(JSON.stringify(result));
  const hash = createHash('sha256').update(bytes).digest('hex');
  if (bytes.byteLength <= MAX_INLINE_RESULT_BYTES) return { result, result_ref: null, result_sha256: hash };
  // Immutable objects prevent a concurrent reader from observing a half-updated version.
  const key = `tasks/${id}/results/${namespace ? `${namespace}/` : ''}${hash}.json`;
  await saveFile(key, bytes, 'application/json');
  const summary = typeof result.summary === 'string' ? result.summary : typeof result.markdown === 'string' ? result.markdown : '';
  return { result: { summary: summary.slice(0, 400) }, result_ref: key, result_sha256: hash };
}

const EVIDENCE_UNREADABLE = 'The complete saved evidence could not be read. Please try again.';

/** Reads and checks one stored result. Returns null when the object is missing (it may have been superseded). */
async function readStoredResult(task: Task): Promise<Record<string, unknown> | null> {
  const ref = task.result_ref!;
  if (!ref.startsWith(`tasks/${task.id}/results/`)) throw new HTTPException(503, { message: 'The saved evidence reference is invalid.' });
  // A reference without its hash cannot be checked, so it is treated like corrupt evidence.
  if (!task.result_sha256) throw new HTTPException(503, { message: EVIDENCE_UNREADABLE });
  const bytes = await readFileBytes(ref);
  if (!bytes) return null;
  const hash = createHash('sha256').update(bytes).digest('hex');
  if (hash !== task.result_sha256) throw new HTTPException(503, { message: EVIDENCE_UNREADABLE });
  try {
    const parsed = JSON.parse(bytes.toString('utf8'));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
  } catch { /* reported below */ }
  throw new HTTPException(503, { message: EVIDENCE_UNREADABLE });
}

async function hydrateTask(task: Task): Promise<Task> {
  if (!task.result_ref) return task;
  const result = await readStoredResult(task);
  if (result) return { ...task, result };
  // A newer save may have replaced (and removed) the object between the task read and the file read.
  const latest = row<Task>(await col(C.tasks).doc(task.id).get());
  if (latest?.result_ref && latest.result_ref !== task.result_ref) {
    const retried = await readStoredResult(latest);
    if (retried) return { ...task, result: retried, result_ref: latest.result_ref, result_sha256: latest.result_sha256 };
  }
  throw new HTTPException(503, { message: EVIDENCE_UNREADABLE });
}

/** Storage pointers are internal: responses never expose them. */
export function publicTask(task: Task) {
  const { result_ref: _ref, result_sha256: _hash, ...rest } = task;
  return rest;
}

/**
 * Removes a result object once a newer pointer is committed. Objects stay immutable; only an object the
 * task no longer references is removed, and that is re-checked just before deletion.
 */
export async function deleteSupersededResult(taskId: string, previous: string | null | undefined, current: string | null | undefined) {
  if (!previous || previous === current || !previous.startsWith(`tasks/${taskId}/results/`)) return;
  try {
    const task = await col(C.tasks).doc(taskId).get();
    if (task.exists && task.get('result_ref') === previous) return;
    await deleteFile(previous);
  } catch (error) {
    console.warn('superseded result not removed', error);
  }
}

/** Stores a result, commits its pointer, then removes the object it replaced. */
async function commitTaskResult(id: string, result: Record<string, unknown>, fields: Record<string, unknown>) {
  const stored = await storeTaskResult(id, result);
  const ref = col(C.tasks).doc(id);
  let previous: string | null;
  try {
    previous = await db().runTransaction(async (tx) => {
      const task = await tx.get(ref);
      if (!task.exists) throw new HTTPException(404, { message: 'Not found' });
      tx.update(ref, { ...stored, ...fields, updated_at: new Date() });
      return (task.get('result_ref') as string | null | undefined) ?? null;
    });
  } catch (error) {
    // The pointer never committed, so the new object is unreferenced.
    await deleteSupersededResult(id, stored.result_ref, null);
    throw error;
  }
  await deleteSupersededResult(id, previous, stored.result_ref);
}

/** A short line for lists: the first sentence of the result. */
function summaryOf(task: Task): string | null {
  const text = typeof task.result?.summary === 'string' ? task.result.summary : typeof task.result?.markdown === 'string' ? task.result.markdown : '';
  const plain = text.replace(/[#*_>`[\]|]/g, ' ').replace(/\s+/g, ' ').trim();
  return plain ? plain.slice(0, 180) : null;
}

export function toSummary(task: Task): TaskSummary {
  const { inputs: _inputs, result: _result, result_ref: _ref, result_sha256: _hash, ...rest } = task;
  return { ...rest, summary: summaryOf(task) };
}

export async function createTask(user: AuthUser, task: { kind: TaskKind; module?: string | null; title: string; inputs?: Record<string, unknown>; project_id?: string | null; credits?: number }): Promise<string> {
  const id = newId();
  if (task.project_id) {
    const role = await projectRole(task.project_id, user);
    if (!role || role === 'view' || role === 'comment') throw new HTTPException(403, { message: 'You can only add work to projects you can edit.' });
  }
  const now = new Date();
  await col(C.tasks).doc(id).set({
    user_id: user.id, account_id: user.account_id, project_id: task.project_id ?? null, kind: task.kind, module: task.module ?? null,
    title: task.title.trim().slice(0, 200) || 'Untitled', status: 'running', inputs: task.inputs ?? {}, result: null,
    credits: task.credits ?? 0, error: null, starred: false, created_at: now, updated_at: now,
  });
  return id;
}

/** A report still running after this long has died with its server; it no longer holds a slot. */
export const STALE_RUN_MS = 30 * 60 * 1000;

function timeOf(value: unknown): number {
  if (value && typeof (value as { toDate?: unknown }).toDate === 'function') return (value as { toDate: () => Date }).toDate().getTime();
  return new Date(value as string | number | Date).getTime();
}

/** A streamed run whose server died never reaches done/failed; after the stream limit it is abandoned. */
export function isAbandonedRun(task: Pick<Task, 'status' | 'updated_at' | 'created_at'>, now = Date.now()) {
  if (task.status !== 'running') return false;
  const last = timeOf(task.updated_at ?? task.created_at);
  return Number.isFinite(last) && now - last > STALE_RUN_MS;
}

/** Same collection as researchJobs.RESEARCH_JOBS (kept here to avoid an import cycle). */
const RESEARCH_JOBS_COLLECTION = 'research_jobs';

/** Whether a durable background job still owns this task (it must be cancelled, not deleted). */
export async function hasActiveJob(taskId: string) {
  const job = await col(RESEARCH_JOBS_COLLECTION).doc(taskId).get();
  return job.exists && ['queued', 'running'].includes(String(job.get('status')));
}

/** Deep and Detailed reports the account has running now (Summary answers are not counted). */
export async function runningResearch(accountId: string): Promise<number> {
  const snapshot = await col(C.tasks).where('account_id', '==', accountId).where('status', '==', 'running').get();
  const since = Date.now() - STALE_RUN_MS;
  return snapshot.docs.filter((doc) => {
    const data = doc.data();
    const at = timeOf(data.created_at);
    return data.kind === 'research' && data.module !== 'summary' && at > since;
  }).length;
}

export async function finishTask(id: string, result: Record<string, unknown>, extra: { title?: string; credits?: number } = {}) {
  await commitTaskResult(id, result, {
    status: 'done',
    ...(extra.title ? { title: extra.title.slice(0, 200) } : {}),
    ...(extra.credits !== undefined ? { credits: extra.credits } : {}),
  });
}

export async function failTask(id: string, message: string) {
  await col(C.tasks).doc(id).update({ status: 'failed', error: message.slice(0, 500), credits: 0, updated_at: new Date() }).catch(() => undefined);
}

/** Merges new fields into a task's result (workspaces that save as they go, e.g. screening). */
export async function updateTaskResult(id: string, result: Record<string, unknown>, extra: Partial<Pick<Task, 'title' | 'status'>> = {}) {
  await commitTaskResult(id, result, extra);
}

/** A task the person may read: their own, or one in a project they belong to. 404 otherwise. */
export async function getTaskFor(user: AuthUser, id: string, need: 'read' | 'edit' = 'read', hydrate = true): Promise<Task> {
  const task = row<Task>(await col(C.tasks).doc(id).get());
  if (!task) throw new HTTPException(404, { message: 'Not found' });
  if (task.user_id === user.id) return hydrate ? hydrateTask(task) : task;
  if (task.project_id) {
    const role = await projectRole(task.project_id, user);
    if (role && (need === 'read' || role === 'edit' || role === 'owner')) return hydrate ? hydrateTask(task) : task;
  }
  throw new HTTPException(404, { message: 'Not found' });
}

/** The person's tasks, newest first, or a project's tasks when `projectId` is given. */
export async function listTasks(user: AuthUser, options: { projectId?: string | null; kind?: string | null; limit?: number } = {}): Promise<TaskSummary[]> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  let query;
  if (options.projectId) {
    if (!(await projectRole(options.projectId, user))) throw new HTTPException(404, { message: 'Project not found' });
    query = col(C.tasks).where('project_id', '==', options.projectId);
  } else {
    query = col(C.tasks).where('user_id', '==', user.id);
  }
  const found = rows<Task>(await query.orderBy('created_at', 'desc').limit(options.kind ? 200 : limit).get());
  return found
    .filter((task) => !options.kind || task.kind === options.kind)
    .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
    .slice(0, limit)
    .map(toSummary);
}

export async function updateTask(user: AuthUser, id: string, patch: { title?: string; starred?: boolean; project_id?: string | null }) {
  const task = await getTaskFor(user, id, 'edit');
  if (patch.project_id) {
    const role = await projectRole(patch.project_id, user);
    if (!role || role === 'view' || role === 'comment') throw new HTTPException(403, { message: 'You can only move work into projects you can edit.' });
  }
  await col(C.tasks).doc(task.id).update({
    ...(patch.title !== undefined ? { title: patch.title.trim().slice(0, 200) || task.title } : {}),
    ...(patch.starred !== undefined ? { starred: patch.starred } : {}),
    ...(patch.project_id !== undefined ? { project_id: patch.project_id } : {}),
    updated_at: new Date(),
  });
  return toSummary({ ...task, ...patch, title: patch.title?.trim() || task.title } as Task);
}

export async function deleteTask(user: AuthUser, id: string) {
  const task = await getTaskFor(user, id, 'edit', false);
  if (task.user_id !== user.id) throw new HTTPException(403, { message: 'Only the person who ran it can delete it.' });
  if (await hasActiveJob(id)) throw new HTTPException(409, { message: 'Stop this background job before deleting it.' });
  if (task.status === 'running' && !isAbandonedRun(task)) {
    throw new HTTPException(409, { message: 'This is still running. Stop it or wait for it to finish before deleting it.' });
  }
  await col(C.tasks).doc(id).delete();
  await deletePrefix(`tasks/${id}`);
}
