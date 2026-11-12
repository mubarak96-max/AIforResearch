/**
 * Surveys (Survey builder) in Firestore: surveys/{id} holds the definition (lib/surveyModel.ts),
 * its status and response count; surveys/{id}/responses/{id} holds each anonymous response.
 * Owners and project members (by project role) can read; owners and editors can change.
 * A survey that has responses cannot be changed in ways that break the data already collected.
 */
import { randomBytes } from 'node:crypto';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import type { AuthUser } from '../auth.js';
import { col, db, newId, row, rows } from '../firebase.js';
import { projectRole, type ProjectRole } from './projects.js';
import { effectivePlan } from './plans.js';
import { LIMITS, breakingChanges, checkAnswers, surveyProblems, type Answers, type SurveyDefinition } from '../../surveyModel.js';

export type SurveyStatus = 'draft' | 'open' | 'closed';
export type SurveyRow = SurveyDefinition & {
  id: string; user_id: string; account_id: string; project_id: string | null; status: SurveyStatus; public_id: string | null;
  response_count: number; revision: number; created_at: Date; updated_at: Date; opened_at: Date | null;
};

export const FREE_SURVEYS = 3;
export const FREE_RESPONSES = 100;
export const PAID_RESPONSES = 5000;

const surveys = () => col('surveys');
const responses = (id: string) => surveys().doc(id).collection('responses');

const Option = z.object({ value: z.string().max(40), label: z.string().max(300) });
const Question = z.object({
  id: z.string().min(1).max(64), code: z.string().max(40), type: z.enum(['single', 'multiple', 'likert', 'number', 'text', 'long_text']),
  text: z.string().max(LIMITS.text), help: z.string().max(LIMITS.help).optional(), required: z.boolean(),
  options: z.array(Option).max(LIMITS.options).optional(), min: z.number().finite().nullish(), max: z.number().finite().nullish(), integer: z.boolean().optional(), instrument: z.string().max(40).optional(),
});
const Scale = z.object({
  name: z.string().trim().min(1).max(40).regex(/^[A-Za-z][A-Za-z0-9_]*$/, 'Scale names use letters, digits and underscores and start with a letter.'),
  items: z.array(z.string().max(40)).min(1).max(LIMITS.questions), reverse: z.array(z.string().max(40)).max(LIMITS.questions),
  min: z.number().finite(), max: z.number().finite(), method: z.enum(['sum', 'mean']), min_answered: z.number().int().min(1).optional(),
  rescale: z.object({ add: z.number().finite(), multiply: z.number().finite() }).optional(),
  bands: z.array(z.object({ label: z.string().trim().min(1).max(60), from: z.number().finite(), to: z.number().finite() })).max(10).optional(),
});
export const Definition = z.object({
  title: z.string().trim().min(1).max(200), intro: z.string().max(LIMITS.intro), consent: z.string().max(LIMITS.intro), thank_you: z.string().max(1000),
  sections: z.array(z.object({ id: z.string().min(1).max(64), title: z.string().max(200), description: z.string().max(LIMITS.intro).optional(), instrument: z.string().max(40).optional(), questions: z.array(Question).max(LIMITS.questions) })).min(1).max(LIMITS.sections),
  scales: z.array(Scale).max(LIMITS.scales),
});

/** Throws 422 with the first problem when the definition cannot be saved. */
export function validDefinition(definition: SurveyDefinition): SurveyDefinition {
  const problems = surveyProblems(definition);
  if (problems.length) throw new HTTPException(422, { message: problems[0] });
  return definition;
}

const definitionOf = (survey: SurveyRow): SurveyDefinition => ({ title: survey.title, intro: survey.intro ?? '', consent: survey.consent ?? '', thank_you: survey.thank_you ?? '', sections: survey.sections ?? [], scales: survey.scales ?? [] });

export async function surveyFor(user: AuthUser, id: string, need: 'read' | 'edit' = 'read'): Promise<{ survey: SurveyRow; role: ProjectRole; canEdit: boolean }> {
  const survey = id && !id.includes('/') ? row<SurveyRow>(await surveys().doc(id).get()) : null;
  if (!survey) throw new HTTPException(404, { message: 'Survey not found' });
  let role: ProjectRole | null = survey.user_id === user.id ? 'owner' : null;
  if (!role && survey.project_id) role = await projectRole(survey.project_id, user);
  if (!role) throw new HTTPException(404, { message: 'Survey not found' });
  const canEdit = role === 'owner' || role === 'edit';
  if (need === 'edit' && !canEdit) throw new HTTPException(403, { message: 'You can see this survey but not change it.' });
  return { survey, role, canEdit };
}

export async function listSurveys(user: AuthUser, projectIds: string[]): Promise<SurveyRow[]> {
  const found = new Map<string, SurveyRow>();
  for (const survey of rows<SurveyRow>(await surveys().where('user_id', '==', user.id).get())) found.set(survey.id, survey);
  for (let i = 0; i < projectIds.length; i += 30) {
    const chunk = projectIds.slice(i, i + 30);
    if (chunk.length) for (const survey of rows<SurveyRow>(await surveys().where('project_id', 'in', chunk).get())) found.set(survey.id, survey);
  }
  return [...found.values()].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

const isFree = async (accountId: string) => (await effectivePlan(accountId)).plan.is_default;

export async function createSurvey(user: AuthUser, definition: SurveyDefinition, projectId: string | null): Promise<SurveyRow> {
  if (await isFree(user.account_id)) {
    const owned = (await surveys().where('user_id', '==', user.id).count().get()).data().count;
    if (owned >= FREE_SURVEYS) throw new HTTPException(402, { message: `The Free plan includes ${FREE_SURVEYS} surveys. Upgrade for more, or delete one you no longer need.` });
  }
  if (projectId) {
    const role = await projectRole(projectId, user);
    if (role !== 'owner' && role !== 'edit') throw new HTTPException(403, { message: 'You can only add a survey to a project you can edit.' });
  }
  validDefinition(definition);
  const id = newId();
  const now = new Date();
  const survey: Omit<SurveyRow, 'id'> = { ...definition, user_id: user.id, account_id: user.account_id, project_id: projectId, status: 'draft', public_id: null, response_count: 0, revision: 1, created_at: now, updated_at: now, opened_at: null };
  await surveys().doc(id).set(survey);
  return { id, ...survey };
}

/** Saves a new definition. Stale revisions are refused; so are breaking changes once responses exist. */
export async function saveSurvey(user: AuthUser, id: string, definition: SurveyDefinition, revision: number): Promise<SurveyRow> {
  validDefinition(definition);
  const ref = surveys().doc(id);
  await surveyFor(user, id, 'edit');
  return db().runTransaction(async (tx) => {
    const current = row<SurveyRow>(await tx.get(ref));
    if (!current) throw new HTTPException(404, { message: 'Survey not found' });
    if (current.revision !== revision) throw new HTTPException(409, { message: 'Someone else changed this survey. Reload it to see their changes.' });
    if (current.response_count > 0) {
      const broken = breakingChanges(definitionOf(current), definition);
      if (broken.length) throw new HTTPException(409, { message: `This survey already has ${current.response_count} response${current.response_count === 1 ? '' : 's'}, so these changes would break the data: ${broken.slice(0, 3).join('; ')}. Wording changes and new questions are fine; to restructure, delete the responses first or copy the survey.` });
    }
    const next = { ...definition, revision: current.revision + 1, updated_at: new Date() };
    tx.update(ref, next);
    return { ...current, ...next };
  });
}

const publicToken = () => randomBytes(12).toString('base64url');

export async function setStatus(user: AuthUser, id: string, status: SurveyStatus): Promise<SurveyRow> {
  const { survey } = await surveyFor(user, id, 'edit');
  if (status === 'open') {
    validDefinition(definitionOf(survey));
    if (!survey.sections.some((section) => section.questions.length)) throw new HTTPException(422, { message: 'Add at least one question before opening the survey.' });
  }
  if (status === 'draft' && survey.response_count > 0) throw new HTTPException(409, { message: 'A survey with responses can be closed but not turned back into a draft.' });
  const patch: Partial<SurveyRow> = { status, updated_at: new Date(), ...(status === 'open' && !survey.public_id ? { public_id: publicToken() } : {}), ...(status === 'open' && !survey.opened_at ? { opened_at: new Date() } : {}) };
  await surveys().doc(id).update(patch);
  return { ...survey, ...patch };
}

export async function deleteSurvey(user: AuthUser, id: string) {
  const { role } = await surveyFor(user, id, 'edit');
  if (role !== 'owner') throw new HTTPException(403, { message: 'Only the person who made the survey can delete it.' });
  const answers = await responses(id).get();
  for (const doc of answers.docs) await doc.ref.delete();
  await surveys().doc(id).delete();
}

export async function clearResponses(user: AuthUser, id: string) {
  await surveyFor(user, id, 'edit');
  const answers = await responses(id).get();
  for (const doc of answers.docs) await doc.ref.delete();
  await surveys().doc(id).update({ response_count: 0, updated_at: new Date() });
}

export async function loadResponses(id: string): Promise<{ id: string; submitted_at: string; answers: Answers }[]> {
  return rows<{ id: string; submitted_at: Date | string; answers: Answers }>(await responses(id).get())
    .map((response) => ({ id: response.id, submitted_at: new Date(response.submitted_at).toISOString(), answers: response.answers ?? {} }))
    .sort((a, b) => a.submitted_at.localeCompare(b.submitted_at));
}

async function responseLimit(survey: SurveyRow) {
  const owner = await col('users').doc(survey.user_id).get();
  const accountId = owner.exists ? String(owner.get('account_id') ?? survey.account_id) : survey.account_id;
  return (await isFree(accountId)) ? FREE_RESPONSES : PAID_RESPONSES;
}

export async function publicSurvey(publicId: string): Promise<SurveyRow | null> {
  if (!/^[A-Za-z0-9_-]{8,40}$/.test(publicId)) return null;
  const found = rows<SurveyRow>(await surveys().where('public_id', '==', publicId).limit(1).get());
  return found[0] ?? null;
}

/** Stores one response if the survey is open and under its limit; the count and the response are written together. */
export async function submitResponse(publicId: string, raw: Record<string, unknown>, consented: boolean): Promise<{ thank_you: string }> {
  const survey = await publicSurvey(publicId);
  if (!survey || survey.status !== 'open') throw new HTTPException(404, { message: 'This survey is not taking responses.' });
  if (survey.consent?.trim() && !consented) throw new HTTPException(422, { message: 'Please confirm that you agree to take part.' });
  const checked = checkAnswers(definitionOf(survey), raw);
  if ('error' in checked) throw new HTTPException(422, { message: checked.error });
  const limit = await responseLimit(survey);
  const ref = surveys().doc(survey.id);
  await db().runTransaction(async (tx) => {
    const current = row<SurveyRow>(await tx.get(ref));
    if (!current || current.status !== 'open' || current.public_id !== publicId) throw new HTTPException(404, { message: 'This survey is not taking responses.' });
    if (current.response_count >= limit) throw new HTTPException(409, { message: 'This survey has reached its response limit and is not taking more answers.' });
    tx.set(responses(survey.id).doc(newId()), { answers: checked.answers, submitted_at: new Date(), revision: current.revision });
    tx.update(ref, { response_count: current.response_count + 1 });
  });
  return { thank_you: survey.thank_you || 'Thank you for taking part.' };
}

/** What the public form needs: the questions, never the owner, scoring or responses. */
export function publicView(survey: SurveyRow) {
  if (survey.status !== 'open') return { status: survey.status, title: survey.title };
  return { status: survey.status, title: survey.title, intro: survey.intro, consent: survey.consent, sections: survey.sections.map(({ id, title, description, questions }) => ({ id, title, description, questions })) };
}

export function summary(survey: SurveyRow) {
  return {
    id: survey.id, title: survey.title, status: survey.status, response_count: survey.response_count, project_id: survey.project_id,
    questions: survey.sections.reduce((sum, section) => sum + section.questions.length, 0), scales: survey.scales.length,
    updated_at: new Date(survey.updated_at).toISOString(), public_id: survey.status === 'open' ? survey.public_id : null,
  };
}
