/**
 * Projects: one folder per piece of work (a thesis, a review, a grant) holding its tasks,
 * documents and papers, shared with supervisors and co-authors.
 *
 * projects/{id}: { owner_user_id, owner_account_id, name, description, members: [{ user_id,
 * email, role, added_at }], member_ids, invite_emails, created_at, updated_at }.
 * Roles: owner, edit (run and change work), comment (read and comment; "supervisor"), view.
 * The plan limits how many projects an account owns and how many people each one has.
 */
import { HTTPException } from 'hono/http-exception';
import type { AuthUser } from '../auth.js';
import { C, col, db, newId, row, rows } from '../firebase.js';
import { checkTotal } from './plans.js';
import { mailReady, sendMail } from './mail.js';
import { env } from '../env.js';

export type ProjectRole = 'owner' | 'edit' | 'comment' | 'view';
export type ProjectMember = { user_id: string | null; email: string; name: string | null; role: Exclude<ProjectRole, 'owner'>; added_at: Date };
export type Project = {
  id: string; owner_user_id: string; owner_account_id: string; owner_email: string; name: string; description: string;
  members: ProjectMember[]; member_ids: string[]; invite_emails: string[]; created_at: Date; updated_at: Date;
};

const roleCache = new Map<string, { role: ProjectRole | null; until: number }>();

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
  roleCache.set(key, { role, until: Date.now() + 15_000 });
  return role;
}
const forgetRoles = (projectId: string) => { for (const key of roleCache.keys()) if (key.startsWith(`${projectId}:`)) roleCache.delete(key); };

export async function getProjectFor(user: AuthUser, id: string, need: ProjectRole[] = ['owner', 'edit', 'comment', 'view']): Promise<Project & { role: ProjectRole }> {
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
  const batch = db().batch();
  for (const task of tasks.docs) batch.update(task.ref, { project_id: null });
  batch.delete(col(C.projects).doc(id));
  await batch.commit();
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
}

/** What the browser sees of a project. */
export function publicProject(project: Project & { role: ProjectRole }) {
  return {
    id: project.id, name: project.name, description: project.description, role: project.role, owner_email: project.owner_email,
    members: project.members.map((member) => ({ email: member.email, name: member.name, role: member.role, pending: !member.user_id })),
    created_at: project.created_at, updated_at: project.updated_at,
  };
}
