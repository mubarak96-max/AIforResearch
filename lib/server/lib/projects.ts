/**
 * Projects: one folder per piece of work (a thesis, a review, a grant) holding its tasks,
 * documents and papers, shared with supervisors and co-authors.
 *
 * projects/{id}: { owner_user_id, owner_account_id, name, description, members: [{ user_id,
 * email, role, added_at }], member_ids, invite_emails, created_at, updated_at }.
 * Roles: owner, edit (run and change work), comment (read and comment; "supervisor"), view.
 * The plan limits how many projects an account owns and how many people each one has.
 * projects/{id}/progress and projects/{id}/progress_summaries hold the Progress tab (see the end of this file).
 */
import { HTTPException } from 'hono/http-exception';
import type { AuthUser } from '../auth.js';
import { C, col, db, deleteDeep, newId, row, rows } from '../firebase.js';
import { deletePrefix } from './storage.js';
import { checkTotal } from './plans.js';
import { mailReady, sendMail } from './mail.js';
import { env } from '../env.js';
import { detachMemberSources, detachProjectMatrices } from './matrix.js';

export type ProjectRole = 'owner' | 'edit' | 'comment' | 'view';
export type ProjectMember = { user_id: string | null; email: string; name: string | null; role: Exclude<ProjectRole, 'owner'>; added_at: Date };
export type Project = {
  id: string; owner_user_id: string; owner_account_id: string; owner_email: string; name: string; description: string;
  members: ProjectMember[]; member_ids: string[]; invite_emails: string[]; created_at: Date; updated_at: Date;
};

// Per instance: forgetRoles clears only this process. Other instances may serve a role
// for up to ROLE_CACHE_MS after a change, so the owner role is never cached — an ownership
// transfer must take effect everywhere at once. Owner-only governance actions also use
// getProjectFor (a fresh read) and re-check ownership inside their transactions.
const roleCache = new Map<string, { role: ProjectRole | null; until: number }>();
const ROLE_CACHE_MS = 10_000;

/** The person's role on a project, or null when they are not on it. */
export async function projectRole(projectId: string, user: Pick<AuthUser, 'id' | 'email'>): Promise<ProjectRole | null> {
  if (!projectId || projectId.includes('/')) return null;
  const key = `${projectId}:${user.id}`;
  const cached = roleCache.get(key);
  if (cached && cached.until > Date.now()) return cached.role;
  const project = row<Project>(await col(C.projects).doc(projectId).get());
  let role: ProjectRole | null = null;
  if (project?.owner_user_id === user.id) role = 'owner';
  else role = project?.members.find((member) => member.user_id === user.id)?.role ?? null;
  if (role !== 'owner') roleCache.set(key, { role, until: Date.now() + ROLE_CACHE_MS });
  return role;
}
export const forgetRoles = (projectId: string) => { for (const key of roleCache.keys()) if (key.startsWith(`${projectId}:`)) roleCache.delete(key); };

export async function getProjectFor(user: AuthUser, id: string, need: ProjectRole[] = ['owner', 'edit', 'comment', 'view']): Promise<Project & { role: ProjectRole }> {
  if (!id || id.includes('/')) throw new HTTPException(404, { message: 'Project not found' });
  const project = row<Project>(await col(C.projects).doc(id).get());
  if (!project) throw new HTTPException(404, { message: 'Project not found' });
  const role = project.owner_user_id === user.id ? 'owner' : project.members.find((member) => member.user_id === user.id)?.role ?? null;
  if (!role) throw new HTTPException(404, { message: 'Project not found' });
  if (!need.includes(role)) throw new HTTPException(403, { message: role === 'view' || role === 'comment' ? 'You can read this project but not change it.' : 'Only the owner can do that.' });
  return { ...project, role };
}

/** Projects the person owns or belongs to; invitations sent to their email are accepted here. */
export async function listProjects(user: AuthUser): Promise<(Project & { role: ProjectRole })[]> {
  await claimProjectInvites(user);
  const found = rows<Project>(await col(C.projects).where('member_ids', 'array-contains', user.id).get());
  return found
    .sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime())
    .map((project) => ({ ...project, role: project.owner_user_id === user.id ? 'owner' : project.members.find((member) => member.user_id === user.id)?.role ?? 'view' }));
}

async function claimProjectInvites(user: AuthUser) {
  const email = user.email.toLowerCase();
  if (!email) return;
  const invited = await col(C.projects).where('invite_emails', 'array-contains', email).get();
  for (const doc of invited.docs) {
    await db().runTransaction(async (tx) => {
      const snapshot = await tx.get(doc.ref);
      const project = snapshot.data() as Omit<Project, 'id'> | undefined;
      if (!project) return;
      const members = project.members.map((member) => (member.email === email && !member.user_id ? { ...member, user_id: user.id, name: user.full_name } : member));
      tx.update(doc.ref, {
        members, member_ids: [...new Set([...project.member_ids, user.id])], invite_emails: project.invite_emails.filter((item) => item !== email),
      });
    });
    forgetRoles(doc.id);
  }
}

export async function createProject(user: AuthUser, input: { name: string; description?: string }): Promise<Project> {
  const owned = (await col(C.projects).where('owner_user_id', '==', user.id).count().get()).data().count;
  await checkTotal(user.account_id, 'projects', owned);
  const id = newId();
  const now = new Date();
  const project: Omit<Project, 'id'> = {
    owner_user_id: user.id, owner_account_id: user.account_id, owner_email: user.email, name: input.name.trim().slice(0, 120) || 'Untitled project',
    description: (input.description ?? '').trim().slice(0, 1000), members: [], member_ids: [user.id], invite_emails: [], created_at: now, updated_at: now,
  };
  await col(C.projects).doc(id).set(project);
  return { id, ...project };
}

export async function updateProject(user: AuthUser, id: string, patch: { name?: string; description?: string }) {
  await getProjectFor(user, id, ['owner', 'edit']);
  await col(C.projects).doc(id).update({
    ...(patch.name !== undefined ? { name: patch.name.trim().slice(0, 120) || 'Untitled project' } : {}),
    ...(patch.description !== undefined ? { description: patch.description.trim().slice(0, 1000) } : {}),
    updated_at: new Date(),
  });
}

/** Deletes the project. Its tasks stay with the people who ran them, outside any project. */
export async function deleteProject(user: AuthUser, id: string) {
  await getProjectFor(user, id, ['owner']);
  const tasks = await col(C.tasks).where('project_id', '==', id).get();
  for (let start = 0; start < tasks.docs.length; start += 400) {
    const batch = db().batch();
    for (const task of tasks.docs.slice(start, start + 400)) batch.update(task.ref, { project_id: null });
    await batch.commit();
  }
  await detachProjectMatrices(id);
  for (const collection of ['workflows', 'research_monitors', C.reviews]) {
    const linked = await col(collection).where('project_id', '==', id).get();
    for (const item of linked.docs) await item.ref.update({ project_id: null });
  }
  await deleteDeep(col(C.projects).doc(id));
  await deletePrefix(`project-evidence/${id}`);
  forgetRoles(id);
}

/** Adds someone by email (they join when they next sign in if they have no account yet). */
export async function addMember(user: AuthUser, id: string, input: { email: string; role: ProjectMember['role'] }) {
  const project = await getProjectFor(user, id, ['owner']);
  const email = input.email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HTTPException(422, { message: 'Enter an email address.' });
  if (email === user.email.toLowerCase()) throw new HTTPException(422, { message: 'You already own this project.' });
  const existing = project.members.find((member) => member.email === email);
  if (!existing) await checkTotal(user.account_id, 'collaborators', project.members.length);
  const person = rows<{ id: string; email: string; full_name: string | null }>(await col(C.users).where('email', '==', email).limit(1).get())[0];
  const member: ProjectMember = { user_id: person?.id ?? null, email, name: person?.full_name ?? null, role: input.role, added_at: existing?.added_at ?? new Date() };
  const members = existing ? project.members.map((item) => (item.email === email ? member : item)) : [...project.members, member];
  await col(C.projects).doc(id).update({
    members,
    member_ids: [...new Set([project.owner_user_id, ...members.map((item) => item.user_id).filter((value): value is string => Boolean(value))])],
    invite_emails: members.filter((item) => !item.user_id).map((item) => item.email),
    updated_at: new Date(),
  });
  forgetRoles(id);
  if (!existing && mailReady()) {
    const link = `${env.publicUrl}/projects/${id}`;
    const who = user.full_name || user.email;
    await sendMail({
      to: email,
      subject: `${who} shared "${project.name}" with you`,
      text: `${who} added you to the project "${project.name}" on AI for Research (${input.role === 'edit' ? 'can edit' : input.role === 'comment' ? 'can comment' : 'can view'}).\n\nOpen it: ${link}\n\nSign in with ${email} to see it.`,
      html: `<p>${who} added you to the project <strong>${project.name.replace(/</g, '&lt;')}</strong> on AI for Research.</p><p><a href="${link}">Open the project</a></p><p>Sign in with ${email} to see it.</p>`,
    }).catch((error) => console.warn('project invite email not sent', (error as Error).message));
  }
  return members;
}

export async function removeMember(user: AuthUser, id: string, email: string) {
  const project = await getProjectFor(user, id);
  const target = email.trim().toLowerCase();
  // The owner removes anyone; a member may leave.
  if (project.role !== 'owner' && target !== user.email.toLowerCase()) throw new HTTPException(403, { message: 'Only the owner can remove people.' });
  const members = project.members.filter((member) => member.email !== target);
  await col(C.projects).doc(id).update({
    members,
    member_ids: [...new Set([project.owner_user_id, ...members.map((item) => item.user_id).filter((value): value is string => Boolean(value))])],
    invite_emails: members.filter((item) => !item.user_id).map((item) => item.email),
    updated_at: new Date(),
  });
  forgetRoles(id);
  // Shared matrices must stop reading the departed person's Library.
  const departed = project.members.find((member) => member.email === target)?.user_id;
  if (departed && departed !== project.owner_user_id) await detachMemberSources(id, departed);
}

/** What the browser sees of a project. */
export function publicProject(project: Project & { role: ProjectRole }) {
  return {
    id: project.id, name: project.name, description: project.description, role: project.role, owner_email: project.owner_email,
    members: project.members.map((member) => ({ email: member.email, name: member.name, role: member.role, pending: !member.user_id })),
    created_at: project.created_at, updated_at: project.updated_at,
  };
}

// ---------------------------------------------------------------------------------------------
// Progress tracker: projects/{id}/progress/{entryId} and projects/{id}/progress_summaries/{id}.
// Dated entries (done, blockers, next actions, optional status and mood). Owners and editors
// write entries (an editor changes only their own, the owner any), commenters add comments, and
// viewers read. Deleted with the project (deleteDeep).
// ---------------------------------------------------------------------------------------------

export const PROGRESS_STATUSES = ['on_track', 'at_risk', 'blocked', 'done'] as const;
export type ProgressStatus = (typeof PROGRESS_STATUSES)[number];
export type ProgressComment = { id: string; user_id: string; name: string; text: string; at: Date };
export type ProgressEntry = {
  id: string; date: string; done: string; blockers: string; next: string; status: ProgressStatus | null; mood: number | null;
  author_user_id: string; author_name: string; comments: ProgressComment[]; created_at: Date; updated_at: Date;
};
export type ProgressInput = { date: string; done?: string; blockers?: string; next?: string; status?: ProgressStatus | null; mood?: number | null };
export type ProgressSummary = { id: string; from: string; to: string; markdown: string; entries: number; author_name: string; task_id: string | null; created_at: Date };

const progressRef = (projectId: string) => col(C.projects).doc(projectId).collection('progress');
const summariesRef = (projectId: string) => col(C.projects).doc(projectId).collection('progress_summaries');
const WRITERS: ProjectRole[] = ['owner', 'edit'];
const COMMENTERS: ProjectRole[] = ['owner', 'edit', 'comment'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const clip = (value: string | undefined, max: number) => (value ?? '').trim().slice(0, max);

function cleanProgress(input: ProgressInput) {
  if (!DATE.test(input.date) || Number.isNaN(Date.parse(input.date))) throw new HTTPException(422, { message: 'Give the entry a date.' });
  const entry = {
    date: input.date, done: clip(input.done, 4000), blockers: clip(input.blockers, 4000), next: clip(input.next, 4000),
    status: input.status && PROGRESS_STATUSES.includes(input.status) ? input.status : null,
    mood: typeof input.mood === 'number' && Number.isInteger(input.mood) && input.mood >= 1 && input.mood <= 5 ? input.mood : null,
  };
  if (!entry.done && !entry.blockers && !entry.next) throw new HTTPException(422, { message: 'Write what you did, what is blocking you or what comes next.' });
  return entry;
}

const timeOf = (value: unknown) => new Date(value as string | number | Date).getTime() || 0;
const byDateDesc = (a: ProgressEntry, b: ProgressEntry) => b.date.localeCompare(a.date) || timeOf(b.created_at) - timeOf(a.created_at);

/** Entries, newest first, optionally within a period (inclusive dates), and saved summaries. Any member may read. */
export async function listProgress(user: AuthUser, projectId: string, period: { from?: string; to?: string } = {}) {
  const project = await getProjectFor(user, projectId);
  const entries = rows<ProgressEntry>(await progressRef(projectId).get())
    .filter((entry) => (!period.from || entry.date >= period.from) && (!period.to || entry.date <= period.to))
    .map((entry) => ({ ...entry, comments: entry.comments ?? [] }))
    .sort(byDateDesc);
  const summaries = rows<ProgressSummary>(await summariesRef(projectId).get()).sort((a, b) => timeOf(b.created_at) - timeOf(a.created_at)).slice(0, 20);
  return { project, entries, summaries };
}

export async function addProgress(user: AuthUser, projectId: string, input: ProgressInput): Promise<ProgressEntry> {
  await getProjectFor(user, projectId, WRITERS);
  const now = new Date();
  const id = newId();
  const entry: Omit<ProgressEntry, 'id'> = { ...cleanProgress(input), author_user_id: user.id, author_name: user.full_name || user.email, comments: [], created_at: now, updated_at: now };
  await progressRef(projectId).doc(id).set(entry);
  return { id, ...entry };
}

async function writableEntry(user: AuthUser, projectId: string, entryId: string) {
  const project = await getProjectFor(user, projectId, WRITERS);
  if (!entryId || entryId.includes('/')) throw new HTTPException(404, { message: 'Entry not found' });
  const entry = row<ProgressEntry>(await progressRef(projectId).doc(entryId).get());
  if (!entry) throw new HTTPException(404, { message: 'Entry not found' });
  if (project.role !== 'owner' && entry.author_user_id !== user.id) throw new HTTPException(403, { message: 'You can change only your own entries.' });
  return entry;
}

export async function updateProgress(user: AuthUser, projectId: string, entryId: string, input: ProgressInput) {
  await writableEntry(user, projectId, entryId);
  await progressRef(projectId).doc(entryId).update({ ...cleanProgress(input), updated_at: new Date() });
}

export async function deleteProgress(user: AuthUser, projectId: string, entryId: string) {
  await writableEntry(user, projectId, entryId);
  await progressRef(projectId).doc(entryId).delete();
}

/** Owners, editors and commenters (supervisors) comment on an entry. */
export async function commentProgress(user: AuthUser, projectId: string, entryId: string, text: string): Promise<ProgressComment> {
  await getProjectFor(user, projectId, COMMENTERS);
  const body = text.trim().slice(0, 2000);
  if (!body) throw new HTTPException(422, { message: 'Write a comment.' });
  if (!entryId || entryId.includes('/')) throw new HTTPException(404, { message: 'Entry not found' });
  const comment: ProgressComment = { id: newId(), user_id: user.id, name: user.full_name || user.email, text: body, at: new Date() };
  await db().runTransaction(async (tx) => {
    const ref = progressRef(projectId).doc(entryId);
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) throw new HTTPException(404, { message: 'Entry not found' });
    const comments = ((snapshot.data() as { comments?: ProgressComment[] }).comments ?? []).slice(-199);
    tx.update(ref, { comments: [...comments, comment] });
  });
  return comment;
}

/** A comment is removed by its author or the project owner. */
export async function deleteProgressComment(user: AuthUser, projectId: string, entryId: string, commentId: string) {
  const project = await getProjectFor(user, projectId, COMMENTERS);
  if (!entryId || entryId.includes('/')) throw new HTTPException(404, { message: 'Entry not found' });
  await db().runTransaction(async (tx) => {
    const ref = progressRef(projectId).doc(entryId);
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) throw new HTTPException(404, { message: 'Entry not found' });
    const comments = (snapshot.data() as { comments?: ProgressComment[] }).comments ?? [];
    const target = comments.find((comment) => comment.id === commentId);
    if (!target) throw new HTTPException(404, { message: 'Comment not found' });
    if (project.role !== 'owner' && target.user_id !== user.id) throw new HTTPException(403, { message: 'You can remove only your own comments.' });
    tx.update(ref, { comments: comments.filter((comment) => comment.id !== commentId) });
  });
}

const STATUS_WORDS: Record<ProgressStatus, string> = { on_track: 'on track', at_risk: 'at risk', blocked: 'blocked', done: 'done' };

/** The entries of a period as plain text for the summary prompt, oldest first. Pure, for tests. */
export function progressDigest(entries: Pick<ProgressEntry, 'date' | 'done' | 'blockers' | 'next' | 'status' | 'mood' | 'author_name' | 'comments'>[]): string {
  return [...entries].sort((a, b) => a.date.localeCompare(b.date)).map((entry) => [
    `## ${entry.date} (${entry.author_name})${entry.status ? ` · status: ${STATUS_WORDS[entry.status]}` : ''}${entry.mood ? ` · mood ${entry.mood}/5` : ''}`,
    entry.done && `Done: ${entry.done}`, entry.blockers && `Blockers: ${entry.blockers}`, entry.next && `Next: ${entry.next}`,
    ...(entry.comments ?? []).map((comment) => `Comment from ${comment.name}: ${comment.text}`),
  ].filter(Boolean).join('\n')).join('\n\n');
}

export function progressSummaryPrompt(projectName: string, from: string, to: string, digest: string, language?: string | null) {
  return [
    {
      role: 'system' as const,
      content: 'You write a short progress update that a researcher sends to their supervisor, from their own dated log. ' +
        `Use only what the log says; never invent results, dates or work. Write in the first person, plainly, in ${language || 'the language of the log'}. ` +
        'Markdown with these headings: "Summary" (two or three sentences), "Done", "Blockers and where I need help", "Next steps" (bullets), and "Questions for our meeting" only if the log raises any. ' +
        'Keep it under 350 words. Mention mood only if the log shows a clear change.',
    },
    { role: 'user' as const, content: `Project: ${projectName}\nPeriod: ${from} to ${to}\n\n${digest}` },
  ];
}

export async function saveProgressSummary(projectId: string, summary: Omit<ProgressSummary, 'id'>): Promise<ProgressSummary> {
  const id = newId();
  await summariesRef(projectId).doc(id).set(summary);
  return { id, ...summary };
}
