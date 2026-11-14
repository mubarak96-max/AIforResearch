/**
 * Meta-analyses of a systematic review, one per outcome. The numbers are only stored here: every
 * calculation runs in the browser (lib/metaAnalysis.ts) and costs no credits.
 *
 * systematic_reviews/{id}/analyses/{analysisId}: { outcome, data_type, measure, model, method, hksj,
 *   favours: { left, right }, rows: [{ record_id, label, subgroup, e1, n1, e2, n2, m1, sd1, m2, sd2,
 *   est, lower, upper, se }], grade: { design, downgrade, upgrade }, revision, created_at, created_by,
 *   updated_at, updated_by }
 *
 * Editors change them; every change is in the review's audit trail. A save names the revision it
 * was based on, so two editors cannot silently overwrite each other.
 */
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import type { AuthUser } from '../auth.js';
import { C, col, db, newId, rows } from '../firebase.js';
import { DOWNGRADE_DOMAINS, MEASURES, METHODS, NUMBER_FIELDS, UPGRADE_DOMAINS, emptyGrade, type DataType, type Model } from '../../metaAnalysis.js';
import { auditEvent, auditOf, currentRecordLimit, reviewFor } from './systematicReview.js';

export const MAX_ANALYSES = 30;
/** Rows per analysis: the plan's record limit (50 on Free), and never more than this. */
export const MAX_ROWS = 500;

const number = z.number().finite().nullable().optional();
const Row = z.object({
  record_id: z.string().max(64).nullable().default(null),
  label: z.string().max(200).default(''),
  subgroup: z.string().max(80).nullish(),
  ...Object.fromEntries(NUMBER_FIELDS.map((field) => [field, number])),
}) as z.ZodType<Record<string, unknown>>;
const Judgement = z.object({ level: z.union([z.literal(0), z.literal(1), z.literal(2)]), reason: z.string().max(1000).default('') });
const Grade = z.object({
  design: z.enum(['randomised', 'observational']),
  downgrade: z.object(Object.fromEntries(DOWNGRADE_DOMAINS.map(([id]) => [id, Judgement.optional()]))),
  upgrade: z.object(Object.fromEntries(UPGRADE_DOMAINS.map(([id]) => [id, Judgement.optional()]))),
});

export const AnalysisBody = z.object({
  outcome: z.string().trim().min(1).max(200),
  data_type: z.enum(['binary', 'continuous', 'generic']),
  measure: z.enum(['OR', 'RR', 'RD', 'MD', 'SMD', 'HR', 'GEN']),
  model: z.enum(['fixed', 'random']).default('random'),
  method: z.enum(['IV', 'MH', 'DL', 'REML']).default('REML'),
  hksj: z.boolean().default(false),
  favours: z.object({ left: z.string().max(80), right: z.string().max(80) }).default({ left: 'Favours intervention', right: 'Favours comparison' }),
  rows: z.array(Row).max(MAX_ROWS).default([]),
  grade: Grade.optional(),
});
export type AnalysisInput = z.output<typeof AnalysisBody>;

const analysesOf = (reviewId: string) => col(C.reviews).doc(reviewId).collection('analyses');

function checked(input: AnalysisInput) {
  if (!(MEASURES[input.data_type as DataType] as string[]).includes(input.measure)) throw new HTTPException(422, { message: `${input.measure} cannot be used with this data type.` });
  if (!(METHODS[input.model as Model] as string[]).includes(input.method)) throw new HTTPException(422, { message: `${input.method} is not a ${input.model === 'fixed' ? 'fixed-effect' : 'random-effects'} method.` });
  if (input.method === 'MH' && input.data_type !== 'binary') throw new HTTPException(422, { message: 'Mantel-Haenszel needs events and totals.' });
  const base = emptyGrade(input.grade?.design ?? 'randomised');
  const given = (judgements: Record<string, unknown> | undefined) => Object.fromEntries(Object.entries(judgements ?? {}).filter(([, value]) => value !== undefined));
  const grade = { design: base.design, downgrade: { ...base.downgrade, ...given(input.grade?.downgrade) }, upgrade: { ...base.upgrade, ...given(input.grade?.upgrade) } };
  const cleanRows = input.rows.map((row) => Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined).map(([key, value]) => [key, key === 'subgroup' ? (String(value ?? '').trim() || null) : value])));
  return { outcome: input.outcome, data_type: input.data_type, measure: input.measure, model: input.model, method: input.method, hksj: input.model === 'random' && input.hksj, favours: input.favours, rows: cleanRows, grade };
}

async function rowLimit(user: AuthUser, reviewId: string) {
  const { review } = await reviewFor(user, reviewId);
  return Math.min(MAX_ROWS, await currentRecordLimit(review, user));
}

function overLimit(count: number, limit: number) {
  if (count > limit) throw new HTTPException(402, { message: `Your plan allows up to ${limit} studies in one meta-analysis. Upgrade for more.` });
}

export async function listAnalyses(user: AuthUser, reviewId: string) {
  await reviewFor(user, reviewId);
  const found = rows<any>(await analysesOf(reviewId).get()).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  return { analyses: found, row_limit: await rowLimit(user, reviewId), max_analyses: MAX_ANALYSES };
}

export async function createAnalysis(user: AuthUser, reviewId: string, input: AnalysisInput) {
  await reviewFor(user, reviewId, 'edit');
  const clean = checked(input);
  overLimit(clean.rows.length, await rowLimit(user, reviewId));
  const id = newId();
  const now = new Date().toISOString();
  const analysis = { ...clean, revision: 1, created_at: now, created_by: user.id, updated_at: now, updated_by: user.id };
  await db().runTransaction(async (tx) => {
    const existing = await tx.get(analysesOf(reviewId));
    if (existing.size >= MAX_ANALYSES) throw new HTTPException(422, { message: `A review can have up to ${MAX_ANALYSES} outcomes.` });
    tx.create(analysesOf(reviewId).doc(id), analysis);
    tx.create(auditOf(reviewId).doc(newId()), auditEvent(user.id, 'analysis_created', null, null, { id, ...analysis }));
  });
  return { id, ...analysis };
}

export async function updateAnalysis(user: AuthUser, reviewId: string, analysisId: string, input: AnalysisInput, baseRevision: number) {
  await reviewFor(user, reviewId, 'edit');
  const clean = checked(input);
  overLimit(clean.rows.length, await rowLimit(user, reviewId));
  const ref = analysesOf(reviewId).doc(analysisId);
  return db().runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) throw new HTTPException(404, { message: 'Analysis not found' });
    const before = snapshot.data()!;
    if (before.revision !== baseRevision) throw new HTTPException(409, { message: 'Someone else changed this outcome. Reload to see their changes before saving again.' });
    const after = { ...before, ...clean, revision: before.revision + 1, updated_at: new Date().toISOString(), updated_by: user.id };
    tx.set(ref, after);
    tx.create(auditOf(reviewId).doc(newId()), auditEvent(user.id, 'analysis_updated', null, { id: analysisId, ...before }, { id: analysisId, ...after }));
    return { id: analysisId, ...after };
  });
}

export async function deleteAnalysis(user: AuthUser, reviewId: string, analysisId: string) {
  await reviewFor(user, reviewId, 'edit');
  const ref = analysesOf(reviewId).doc(analysisId);
  await db().runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) throw new HTTPException(404, { message: 'Analysis not found' });
    tx.delete(ref);
    tx.create(auditOf(reviewId).doc(newId()), auditEvent(user.id, 'analysis_deleted', null, { id: analysisId, ...snapshot.data() }, null));
  });
}
