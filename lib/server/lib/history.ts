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
import { C, col, newId, row, rows } from '../firebase.js';
import { projectRole } from './projects.js';

export const TASK_KINDS = [
  'research', 'papers', 'review', 'claim_check', 'citation_check', 'thesis', 'proposal', 'writing', 'systematic_review',
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
  credits: number;
  error: string | null;
  starred: boolean;
  created_at: Date;
  updated_at: Date;
};

export type TaskSummary = Omit<Task, 'inputs' | 'result'> & { summary: string | null };

/** Firestore documents stop at 1 MiB; results larger than this are trimmed. */
const MAX_RESULT_CHARS = 700_000;

function trimResult(result: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!result) return null;
  const size = JSON.stringify(result).length;
  if (size <= MAX_RESULT_CHARS) return result;
  const copy = { ...result };
  if (typeof copy.markdown === 'string') copy.markdown = `${(copy.markdown as string).slice(0, MAX_RESULT_CHARS / 2)}\n\n…(shortened to fit)`;
  if (Array.isArray(copy.sources)) copy.sources = (copy.sources as unknown[]).slice(0, 60);
  return JSON.stringify(copy).length <= MAX_RESULT_CHARS ? copy : { markdown: String(copy.markdown ?? '').slice(0, 200_000), trimmed: true };
}

/** A short line for lists: the first sentence of the result. */
function summaryOf(task: Task): string | null {
  const text = typeof task.result?.summary === 'string' ? task.result.summary : typeof task.result?.markdown === 'string' ? task.result.markdown : '';
  const plain = text.replace(/[#*_>`[\]|]/g, ' ').replace(/\s+/g, ' ').trim();
  return plain ? plain.slice(0, 180) : null;
}

export function toSummary(task: Task): TaskSummary {
  const { inputs: _inputs, result: _result, ...rest } = task;
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
const STALE_RUN_MS = 30 * 60 * 1000;

/** Deep and Detailed reports the account has running now (Summary answers are not counted). */
export async function runningResearch(accountId: string): Promise<number> {
  const snapshot = await col(C.tasks).where('account_id', '==', accountId).where('status', '==', 'running').get();
  const since = Date.now() - STALE_RUN_MS;
  return snapshot.docs.filter((doc) => {
    const data = doc.data();
    const created = data.created_at;
    const at = created && typeof created.toDate === 'function' ? created.toDate().getTime() : new Date(created).getTime();
    return data.kind === 'research' && data.module !== 'summary' && at > since;
  }).length;
}

export async function finishTask(id: string, result: Record<string, unknown>, extra: { title?: string; credits?: number } = {}) {
  await col(C.tasks).doc(id).update({
    status: 'done', result: trimResult(result), updated_at: new Date(),
    ...(extra.title ? { title: extra.title.slice(0, 200) } : {}), ...(extra.credits !== undefined ? { credits: extra.credits } : {}),
  });
}

export async function failTask(id: string, message: string) {
  await col(C.tasks).doc(id).update({ status: 'failed', error: message.slice(0, 500), credits: 0, updated_at: new Date() }).catch(() => undefined);
}

/** Merges new fields into a task's result (workspaces that save as they go, e.g. screening). */
export async function updateTaskResult(id: string, result: Record<string, unknown>, extra: Partial<Pick<Task, 'title' | 'status'>> = {}) {
  await col(C.tasks).doc(id).update({ result: trimResult(result), updated_at: new Date(), ...extra });
}

/** A task the person may read: their own, or one in a project they belong to. 404 otherwise. */
export async function getTaskFor(user: AuthUser, id: string, need: 'read' | 'edit' = 'read'): Promise<Task> {
  const task = row<Task>(await col(C.tasks).doc(id).get());
  if (!task) throw new HTTPException(404, { message: 'Not found' });
  if (task.user_id === user.id) return task;
  if (task.project_id) {
    const role = await projectRole(task.project_id, user);
    if (role && (need === 'read' || role === 'edit' || role === 'owner')) return task;
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
  const task = await getTaskFor(user, id, 'edit');
  if (task.user_id !== user.id) throw new HTTPException(403, { message: 'Only the person who ran it can delete it.' });
  await col(C.tasks).doc(id).delete();
}
