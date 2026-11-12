/**
 * The Systematic Review workspace: one review with its protocol, searches, records, screening
 * votes, extraction table and report.
 *
 * systematic_reviews/{id}: { user_id, account_id, project_id, task_id, title, question, review_type,
 *   framework, framework_fields, include_criteria, exclude_criteria, protocol, searches, dedupe_log,
 *   extraction_columns, ai_second_reviewer, methods, created_at, updated_at }
 * systematic_reviews/{id}/records/{recordId}: { title, authors, year, venue, doi, pmid, abstract, url,
 *   source, search_id, duplicate_of, dup_reason, order, votes, ai, resolved, extraction, rob }
 *
 * Who may do what: the owner and project members with edit access screen and change it; comment
 * and view members read it. With editors on the project, every record needs two reviewers.
 */
import { HTTPException } from 'hono/http-exception';
import type { AuthUser } from '../auth.js';
import type { LlmSlot } from '../slots/types.js';
import { C, col, db, newId, row, rows } from '../firebase.js';
import { effectivePlan } from './plans.js';
import { projectRole, type ProjectRole } from './projects.js';
import { createTask, updateTaskResult } from './history.js';
import { parseJson } from './research.js';
import { fetchSource } from './sources/http.js';
import { europePmcToFound, openAlexToFound, pubmedCount, pubmedRecords } from './sources/providers.js';
import { papersSlots } from './directory.js';
import { findDuplicates, recordKeys, type DedupeEntry, type ImportedRecord } from './systematicReviewParse.js';
import {
  FRAMEWORKS, PRESETS, agreement, kappaLabel, passesTitle, prismaCounts, ratingPairs, stageState,
  type Decision, type Framework, type ReviewType, type ReviewerSetup, type ScreeningRecord, type Stage,
} from './systematicReviewStats.js';

export const DATABASES = ['pubmed', 'europepmc', 'openalex'] as const;
export type Database = (typeof DATABASES)[number];
export const DATABASE_LABELS: Record<string, string> = { pubmed: 'PubMed', europepmc: 'Europe PMC', openalex: 'OpenAlex' };

export const DEFAULT_COLUMNS = [
  ['population', 'Population'], ['intervention', 'Intervention or exposure'], ['comparison', 'Comparison'], ['outcomes', 'Outcomes'],
  ['design', 'Study design'], ['sample_size', 'Sample size'], ['setting', 'Setting'], ['funding', 'Funding and conflicts'], ['limitations', 'Limitations'],
].map(([id, label]) => ({ id, label, custom: false }));

export const ROB_FIELDS = ['randomisation', 'allocation', 'blinding'] as const;
export const ROB_VALUES = ['low', 'some concerns', 'high', 'unclear', 'not applicable'] as const;

/** Free plan: one review with up to 50 records to try it. */
export const FREE_RECORD_LIMIT = 50;
export const PAID_RECORD_LIMIT = 10_000;

export type SearchLog = { id: string; database: string; query: string; date: string; count: number | null; added: number; duplicates: number; kind: 'search' | 'upload' | 'research' };
export type Column = { id: string; label: string; custom: boolean };

export type Review = {
  id: string; user_id: string; account_id: string; project_id: string | null; task_id: string | null; title: string; question: string;
  review_type: ReviewType; framework: Framework; framework_fields: Record<string, string>; include_criteria: string[]; exclude_criteria: string[];
  protocol: string; methods: string; searches: SearchLog[]; dedupe_log: (DedupeEntry & { at: string })[]; extraction_columns: Column[];
  ai_second_reviewer: boolean; created_at: Date; updated_at: Date;
};

export type RecordRow = ScreeningRecord & ImportedRecord & {
  search_id: string | null; dup_reason: string | null; order: number;
  extraction?: Record<string, { value: string; quote?: string | null; ai?: boolean }>;
  rob?: Partial<Record<(typeof ROB_FIELDS)[number], string>>;
};

const reviews = () => col(C.reviews);
const recordsOf = (reviewId: string) => reviews().doc(reviewId).collection(C.reviewRecords);

// ------------------------------------------------------------------ access

export type ReviewAccess = { review: Review; role: ProjectRole; canEdit: boolean };

export async function reviewFor(user: AuthUser, id: string, need: 'read' | 'edit' = 'read'): Promise<ReviewAccess> {
  const review = id && !id.includes('/') ? row<Review>(await reviews().doc(id).get()) : null;
  if (!review) throw new HTTPException(404, { message: 'Review not found' });
  let role: ProjectRole | null = review.user_id === user.id ? 'owner' : null;
  if (!role && review.project_id) role = await projectRole(review.project_id, user);
  if (!role) throw new HTTPException(404, { message: 'Review not found' });
  const canEdit = role === 'owner' || role === 'edit';
  if (need === 'edit' && !canEdit) throw new HTTPException(403, { message: 'You can read this review but not change it.' });
  return { review: normalizeReview(review), role, canEdit };
}

function normalizeReview(review: Review): Review {
  return {
    ...review, framework_fields: review.framework_fields ?? {}, include_criteria: review.include_criteria ?? [], exclude_criteria: review.exclude_criteria ?? [],
    protocol: review.protocol ?? '', methods: review.methods ?? '', searches: review.searches ?? [], dedupe_log: review.dedupe_log ?? [],
    extraction_columns: review.extraction_columns?.length ? review.extraction_columns : DEFAULT_COLUMNS, ai_second_reviewer: Boolean(review.ai_second_reviewer),
  };
}

/** Reviews the person owns, and those in projects they belong to. */
export async function listReviews(user: AuthUser, projectIds: string[]) {
  const own = rows<Review>(await reviews().where('user_id', '==', user.id).get());
  const shared: Review[] = [];
  for (let index = 0; index < projectIds.length; index += 30) {
    const chunk = projectIds.slice(index, index + 30);
    if (chunk.length) shared.push(...rows<Review>(await reviews().where('project_id', 'in', chunk).get()));
  }
  const all = new Map<string, Review>();
  for (const review of [...own, ...shared]) all.set(review.id, normalizeReview(review));
  return [...all.values()].sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());
}

async function isFreePlan(accountId: string) {
  return (await effectivePlan(accountId)).plan.is_default;
}

/** The reviewer setup: two reviewers when the project has editors, or when AI is the second. */
export async function reviewerSetup(review: Review): Promise<ReviewerSetup & { reviewers: { id: string; name: string }[] }> {
  const reviewers = [{ id: review.user_id, name: 'You' }];
  if (review.project_id) {
    const project = row<{ members: { user_id: string | null; email: string; name: string | null; role: string }[]; owner_user_id: string; owner_email: string }>(await col(C.projects).doc(review.project_id).get());
    for (const member of project?.members ?? []) if (member.user_id && member.role === 'edit') reviewers.push({ id: member.user_id, name: member.name || member.email });
  }
  return { dual: reviewers.length > 1 || review.ai_second_reviewer, aiSecond: review.ai_second_reviewer && reviewers.length === 1, reviewers };
}

// ------------------------------------------------------------------ create and change

export type ReviewInput = {
  title: string; question: string; review_type: ReviewType; framework?: Framework; framework_fields?: Record<string, string>;
  include_criteria?: string[]; exclude_criteria?: string[]; project_id?: string | null;
};

export async function createReview(user: AuthUser, input: ReviewInput): Promise<Review> {
  if (await isFreePlan(user.account_id)) {
    const owned = (await reviews().where('user_id', '==', user.id).count().get()).data().count;
    if (owned >= 1) throw new HTTPException(402, { message: 'The Free plan includes one systematic review. Upgrade for more.' });
  }
  if (input.project_id) {
    const role = await projectRole(input.project_id, user);
    if (role !== 'owner' && role !== 'edit') throw new HTTPException(403, { message: 'You can only add a review to a project you can edit.' });
  }
  const id = newId();
  const now = new Date();
  const preset = PRESETS[input.review_type];
  const framework = input.framework ?? preset.framework;
  const taskId = await createTask(user, { kind: 'systematic_review', module: input.review_type, title: input.title, inputs: { review_id: id, question: input.question }, project_id: input.project_id ?? null });
  const review: Omit<Review, 'id'> = {
    user_id: user.id, account_id: user.account_id, project_id: input.project_id ?? null, task_id: taskId,
    title: input.title.trim().slice(0, 200) || 'Untitled review', question: input.question.trim().slice(0, 2000), review_type: input.review_type, framework,
    framework_fields: Object.fromEntries(FRAMEWORKS[framework].map(([key]) => [key, String(input.framework_fields?.[key] ?? '').slice(0, 1000)])),
    include_criteria: (input.include_criteria ?? []).map((item) => item.trim()).filter(Boolean).slice(0, 40),
    exclude_criteria: (input.exclude_criteria ?? []).map((item) => item.trim()).filter(Boolean).slice(0, 40),
    protocol: '', methods: '', searches: [], dedupe_log: [], extraction_columns: DEFAULT_COLUMNS, ai_second_reviewer: false, created_at: now, updated_at: now,
  };
  await reviews().doc(id).set(review);
  await updateTaskResult(taskId, { review_id: id, summary: 'No records yet.' }, { status: 'done' });
  return { id, ...review };
}

export async function updateReview(user: AuthUser, id: string, patch: Partial<Pick<Review, 'title' | 'question' | 'review_type' | 'framework' | 'framework_fields' | 'include_criteria' | 'exclude_criteria' | 'protocol' | 'methods' | 'extraction_columns' | 'ai_second_reviewer'>>) {
  const { review } = await reviewFor(user, id, 'edit');
  const clean: Record<string, unknown> = { updated_at: new Date() };
  if (patch.title !== undefined) clean.title = patch.title.trim().slice(0, 200) || review.title;
  if (patch.question !== undefined) clean.question = patch.question.slice(0, 2000);
  if (patch.review_type !== undefined) clean.review_type = patch.review_type;
  if (patch.framework !== undefined) clean.framework = patch.framework;
  if (patch.framework_fields !== undefined) clean.framework_fields = Object.fromEntries(Object.entries(patch.framework_fields).slice(0, 10).map(([key, value]) => [key.slice(0, 40), String(value).slice(0, 1000)]));
  if (patch.include_criteria !== undefined) clean.include_criteria = patch.include_criteria.map((item) => item.trim().slice(0, 500)).filter(Boolean).slice(0, 40);
  if (patch.exclude_criteria !== undefined) clean.exclude_criteria = patch.exclude_criteria.map((item) => item.trim().slice(0, 500)).filter(Boolean).slice(0, 40);
  if (patch.protocol !== undefined) clean.protocol = patch.protocol.slice(0, 100_000);
  if (patch.methods !== undefined) clean.methods = patch.methods.slice(0, 100_000);
  if (patch.extraction_columns !== undefined) clean.extraction_columns = patch.extraction_columns.slice(0, 30).map((column) => ({ id: column.id.slice(0, 40), label: column.label.slice(0, 80), custom: Boolean(column.custom) }));
  if (patch.ai_second_reviewer !== undefined) clean.ai_second_reviewer = patch.ai_second_reviewer;
  await reviews().doc(id).update(clean);
  if (clean.title && review.task_id) await col(C.tasks).doc(review.task_id).update({ title: clean.title }).catch(() => undefined);
}

export async function deleteReview(user: AuthUser, id: string) {
  const { review, role } = await reviewFor(user, id, 'edit');
  if (role !== 'owner') throw new HTTPException(403, { message: 'Only the owner can delete the review.' });
  const records = await recordsOf(id).get();
  for (let index = 0; index < records.docs.length; index += 400) {
    const batch = db().batch();
    for (const doc of records.docs.slice(index, index + 400)) batch.delete(doc.ref);
    await batch.commit();
  }
  await reviews().doc(id).delete();
  if (review.task_id) await col(C.tasks).doc(review.task_id).delete().catch(() => undefined);
}

// ------------------------------------------------------------------ records

export async function loadRecords(reviewId: string): Promise<RecordRow[]> {
  return rows<RecordRow>(await recordsOf(reviewId).get()).map((record) => ({ ...record, votes: record.votes ?? {}, ai: record.ai ?? {}, resolved: record.resolved ?? {} }))
    .sort((a, b) => a.order - b.order);
}

/**
 * Adds records from a search or an upload: duplicates of what is there (by DOI, PubMed id or
 * title) are kept as duplicates for the PRISMA count, and the log says what was removed.
 */
export async function addRecords(user: AuthUser, reviewId: string, incoming: ImportedRecord[], log: Omit<SearchLog, 'id' | 'added' | 'duplicates' | 'date'>) {
  const { review } = await reviewFor(user, reviewId, 'edit');
  const existing = await loadRecords(reviewId);
  const limit = (await isFreePlan(review.account_id)) ? FREE_RECORD_LIMIT : PAID_RECORD_LIMIT;
  const unique = existing.filter((record) => !record.duplicate_of).length;
  const keys = new Map<string, string>();
  for (const record of existing) if (!record.duplicate_of) for (const key of recordKeys(record)) keys.set(key, record.id);
  const clean = incoming.filter((record) => record.title?.trim()).map((record) => ({ ...record, title: record.title.trim().slice(0, 1000), abstract: record.abstract?.slice(0, 20_000) ?? null, authors: (record.authors ?? []).slice(0, 50) }));
  const { fresh, duplicates } = findDuplicates(clean, keys, newId);
  const room = Math.max(0, limit - unique);
  const kept = fresh.slice(0, room);
  const dropped = fresh.length - kept.length;
  const searchId = newId();
  let order = existing.reduce((max, record) => Math.max(max, record.order ?? 0), 0);
  const source = log.database;
  const writes = [
    ...kept.map((record) => ({ ...record, duplicate_of: null, dup_reason: null })),
    ...duplicates.map(({ reason, ...record }) => ({ ...record, dup_reason: reason })),
  ];
  for (let index = 0; index < writes.length; index += 400) {
    const batch = db().batch();
    for (const { id, ...record } of writes.slice(index, index + 400)) {
      order += 1;
      batch.set(recordsOf(reviewId).doc(id), { ...record, source, search_id: searchId, order, votes: {}, ai: {}, resolved: {}, created_at: new Date() });
    }
    await batch.commit();
  }
  const entry: SearchLog = { ...log, id: searchId, date: new Date().toISOString(), added: kept.length, duplicates: duplicates.length };
  const dedupe = duplicates.slice(0, 500).map((record) => ({ title: record.title.slice(0, 200), reason: record.reason, kept_id: record.duplicate_of, at: entry.date }));
  await reviews().doc(reviewId).update({ searches: [...review.searches, entry], dedupe_log: [...review.dedupe_log, ...dedupe].slice(-2000), updated_at: new Date() });
  return { added: kept.length, duplicates: duplicates.length, over_limit: dropped, limit };
}

/** One reviewer's vote on one record at one stage. */
export async function vote(user: AuthUser, reviewId: string, recordId: string, stage: Stage, decision: Decision | null, reason: string | null) {
  await reviewFor(user, reviewId, 'edit');
  const ref = recordsOf(reviewId).doc(recordId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new HTTPException(404, { message: 'Record not found' });
  const votes = { ...((snapshot.get('votes') as ScreeningRecord['votes']) ?? {}) };
  const stageVotes = { ...(votes[stage] ?? {}) };
  if (decision) stageVotes[user.id] = { decision, reason: decision === 'exclude' ? reason?.slice(0, 200) ?? null : null, at: new Date().toISOString() };
  else delete stageVotes[user.id];
  votes[stage] = stageVotes;
  await ref.update({ votes });
}

/** Settles a conflict (or overrides): the final decision for the stage. */
export async function resolve(user: AuthUser, reviewId: string, recordId: string, stage: Stage, decision: Decision | null, reason: string | null) {
  await reviewFor(user, reviewId, 'edit');
  const ref = recordsOf(reviewId).doc(recordId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new HTTPException(404, { message: 'Record not found' });
  const resolved = { ...((snapshot.get('resolved') as ScreeningRecord['resolved']) ?? {}) };
  resolved[stage] = decision ? { decision, reason: reason?.slice(0, 200) ?? null, at: new Date().toISOString() } : null;
  await ref.update({ resolved });
}

export async function saveExtraction(user: AuthUser, reviewId: string, recordId: string, values: Record<string, string>, rob: Record<string, string>) {
  await reviewFor(user, reviewId, 'edit');
  const ref = recordsOf(reviewId).doc(recordId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new HTTPException(404, { message: 'Record not found' });
  const extraction = { ...((snapshot.get('extraction') as RecordRow['extraction']) ?? {}) };
  for (const [key, value] of Object.entries(values).slice(0, 40)) extraction[key.slice(0, 40)] = { value: String(value).slice(0, 4000), quote: null, ai: false };
  const currentRob = { ...((snapshot.get('rob') as RecordRow['rob']) ?? {}) } as Record<string, string>;
  for (const field of ROB_FIELDS) if (rob[field] !== undefined) currentRob[field] = (ROB_VALUES as readonly string[]).includes(rob[field]) ? rob[field] : '';
  await ref.update({ extraction, rob: currentRob });
}

// ------------------------------------------------------------------ the full picture

export async function reviewState(user: AuthUser, id: string) {
  const access = await reviewFor(user, id);
  const records = await loadRecords(id);
  const setup = await reviewerSetup(access.review);
  const prisma = prismaCounts(records, setup);
  const enriched = records.map((record) => {
    const title = stageState(record, 'title', setup);
    const full = passesTitle(title) ? stageState(record, 'full', setup) : null;
    return { ...record, title_state: title, full_state: full };
  });
  // Agreement: you against the other reviewer with most votes, or against the AI.
  const others = setup.reviewers.filter((reviewer) => reviewer.id !== access.review.user_id);
  const counts = (rater: string) => records.filter((record) => record.votes?.title?.[rater]).length;
  const second = setup.aiSecond || !others.length ? 'ai' : others.sort((a, b) => counts(b.id) - counts(a.id))[0].id;
  const agree = (stage: Stage) => {
    const result = agreement(ratingPairs(records, stage, access.review.user_id, second));
    return { ...result, label: kappaLabel(result.kappa), with: second === 'ai' ? 'AI suggestions' : others.find((reviewer) => reviewer.id === second)?.name ?? 'Second reviewer' };
  };
  // History shows a one-line summary; refresh it when the numbers moved.
  const summary = `${prisma.screened} records, ${prisma.screened - prisma.awaiting_title} screened, ${prisma.included} included.`;
  if (access.review.task_id && access.canEdit) {
    const task = await col(C.tasks).doc(access.review.task_id).get();
    if (task.exists && task.get('result')?.summary !== summary) await updateTaskResult(access.review.task_id, { review_id: id, summary, prisma }).catch(() => undefined);
  }
  return {
    review: access.review, role: access.role, can_edit: access.canEdit, me: user.id,
    preset: PRESETS[access.review.review_type], frameworks: FRAMEWORKS,
    reviewers: setup.reviewers, dual: setup.dual, ai_second: setup.aiSecond,
    records: enriched, prisma,
    agreement: { title: agree('title'), full: agree('full') },
    limit: (await isFreePlan(access.review.account_id)) ? FREE_RECORD_LIMIT : PAID_RECORD_LIMIT,
  };
}

// ------------------------------------------------------------------ database searches

const EPMC = 'https://www.ebi.ac.uk/europepmc/webservices/rest/search';

/** Records a database would return for a search string. */
export async function countSearch(database: Database, query: string): Promise<number> {
  if (database === 'pubmed') return pubmedCount(query);
  if (database === 'europepmc') {
    const data = await fetchSource(`${EPMC}?query=${encodeURIComponent(query)}&format=json&resultType=idlist&pageSize=1`, { source: 'Europe PMC' });
    return Number(data?.hitCount ?? 0) || 0;
  }
  for (const slot of papersSlots()) {
    try {
      const data = await slot.get('works', { search: query, per_page: '1', select: 'id' });
      return Number(data?.meta?.count ?? 0) || 0;
    } catch { /* next index */ }
  }
  throw new HTTPException(503, { message: 'OpenAlex is busy. Try again.' });
}

const toImported = (paper: { title: string; authors: { name: string }[]; year: number | null; venue: string | null; doi: string | null; pmid?: string | null; abstract: string | null; url?: string | null }): ImportedRecord => ({
  title: paper.title, authors: paper.authors.map((author) => author.name), year: paper.year, venue: paper.venue, doi: paper.doi, pmid: paper.pmid ?? null, abstract: paper.abstract, url: paper.url ?? null,
});

/** Up to `max` records for a search string from one database. */
export async function runSearch(database: Database, query: string, max: number): Promise<ImportedRecord[]> {
  if (database === 'pubmed') return (await pubmedRecords(query, max)).map(toImported);
  const out: ImportedRecord[] = [];
  if (database === 'europepmc') {
    let cursor = '*';
    while (out.length < max) {
      const data = await fetchSource(`${EPMC}?query=${encodeURIComponent(query)}&format=json&resultType=core&pageSize=${Math.min(1000, max - out.length)}&cursorMark=${encodeURIComponent(cursor)}`, { source: 'Europe PMC', timeoutMs: 30_000 });
      const results = data?.resultList?.result ?? [];
      out.push(...results.map((item: any) => toImported(europePmcToFound(item))));
      if (!results.length || !data?.nextCursorMark || data.nextCursorMark === cursor) break;
      cursor = data.nextCursorMark;
    }
    return out.slice(0, max);
  }
  for (const slot of papersSlots()) {
    try {
      let cursor = '*';
      out.length = 0;
      while (out.length < max && cursor) {
        const data = await slot.get('works', { search: query, per_page: String(Math.min(200, max - out.length)), cursor });
        const results = data?.results ?? [];
        out.push(...results.map((work: any) => toImported(openAlexToFound(work))));
        if (!results.length) break;
        cursor = data?.meta?.next_cursor ?? '';
      }
      return out.slice(0, max);
    } catch { /* next index */ }
  }
  throw new HTTPException(503, { message: 'OpenAlex is busy. Try again.' });
}

// ------------------------------------------------------------------ AI

function criteriaBlock(review: Review) {
  const fields = FRAMEWORKS[review.framework].map(([key, label]) => `${label}: ${review.framework_fields[key] || 'not set'}`).join('\n');
  return [
    `Review: ${review.title} (${PRESETS[review.review_type].label})`, `Question: ${review.question}`, `${review.framework}:\n${fields}`,
    `Include when:\n${review.include_criteria.map((item) => `- ${item}`).join('\n') || '- (none listed)'}`,
    `Exclude when:\n${review.exclude_criteria.map((item) => `- ${item}`).join('\n') || '- (none listed)'}`,
  ].join('\n\n');
}

/** AI screening suggestions for up to 25 records: include, exclude (with a reason from the list) or maybe. */
export async function suggestDecisions(llm: LlmSlot, review: Review, stage: Stage, records: RecordRow[]) {
  const reasons = PRESETS[review.review_type].reasons;
  const { text, usage } = await llm.complete({
    task: 'fast', temperature: 0, json: true, maxTokens: 120 + records.length * 80,
    messages: [
      { role: 'system', content: `You screen records for a ${PRESETS[review.review_type].label.toLowerCase()} at the ${stage === 'title' ? 'title and abstract' : 'full-text'} stage, against the criteria given. Be inclusive when unsure at title and abstract: answer "maybe". Answer with JSON only: {"items": [{"id": "…", "decision": "include|exclude|maybe", "reason": "one sentence, at most 25 words"${''}, "exclusion_reason": "one of the listed reasons, only when excluding"}]}. Exclusion reasons: ${reasons.join('; ')}.` },
      { role: 'user', content: `${criteriaBlock(review)}\n\nRecords:\n${records.map((record) => `id=${record.id}\nTitle: ${record.title}\n${record.year ?? ''} ${record.venue ?? ''}\nAbstract: ${(record.abstract || 'No abstract.').slice(0, 1800)}`).join('\n\n')}` },
    ],
  });
  const out = new Map<string, { decision: Decision; reason: string }>();
  for (const item of parseJson<{ items?: { id: string; decision: string; reason?: string; exclusion_reason?: string }[] }>(text)?.items ?? []) {
    const decision = (['include', 'exclude', 'maybe'] as Decision[]).includes(item.decision as Decision) ? (item.decision as Decision) : 'maybe';
    const why = decision === 'exclude' && item.exclusion_reason && reasons.includes(item.exclusion_reason) ? `${item.exclusion_reason}: ${item.reason ?? ''}` : String(item.reason ?? '');
    out.set(String(item.id), { decision, reason: why.slice(0, 300) });
  }
  return { suggestions: out, usage };
}

export async function storeSuggestions(reviewId: string, stage: Stage, suggestions: Map<string, { decision: Decision; reason: string }>) {
  const batch = db().batch();
  for (const [id, suggestion] of suggestions) batch.set(recordsOf(reviewId).doc(id), { ai: { [stage]: suggestion } }, { merge: true });
  await batch.commit();
}

/** AI extraction for up to 10 included records: each column's value and the sentence it came from. */
export async function extractRows(llm: LlmSlot, review: Review, records: RecordRow[]) {
  const columns = review.extraction_columns;
  const { text, usage } = await llm.complete({
    task: 'fast', temperature: 0, json: true, maxTokens: 300 + records.length * columns.length * 60,
    messages: [
      { role: 'system', content: 'You extract study data for a systematic review from titles and abstracts. Answer with JSON only: {"items": [{"id": "…", "values": {"<column id>": {"value": "short answer, or \\"Not reported\\"", "quote": "the exact words from the abstract it is based on, or null"}}}]}. Never guess: write "Not reported" when the abstract does not say.' },
      { role: 'user', content: `Columns: ${columns.map((column) => `${column.id} = ${column.label}`).join('; ')}\n\nRecords:\n${records.map((record) => `id=${record.id}\nTitle: ${record.title}\nAbstract: ${(record.abstract || 'No abstract.').slice(0, 2500)}`).join('\n\n')}` },
    ],
  });
  const out = new Map<string, Record<string, { value: string; quote: string | null; ai: boolean }>>();
  for (const item of parseJson<{ items?: { id: string; values?: Record<string, { value?: string; quote?: string | null }> }[] }>(text)?.items ?? []) {
    const values: Record<string, { value: string; quote: string | null; ai: boolean }> = {};
    for (const column of columns) {
      const cell = item.values?.[column.id];
      if (cell?.value) values[column.id] = { value: String(cell.value).slice(0, 2000), quote: cell.quote ? String(cell.quote).slice(0, 600) : null, ai: true };
    }
    out.set(String(item.id), values);
  }
  return { rows: out, usage };
}

export async function storeExtraction(reviewId: string, rowsById: Map<string, Record<string, { value: string; quote: string | null; ai: boolean }>>, existing: Map<string, RecordRow>) {
  const batch = db().batch();
  for (const [id, values] of rowsById) {
    const current = existing.get(id)?.extraction ?? {};
    // Never overwrite what a person typed.
    const merged = { ...values, ...Object.fromEntries(Object.entries(current).filter(([, cell]) => !cell.ai && cell.value)) };
    batch.set(recordsOf(reviewId).doc(id), { extraction: merged }, { merge: true });
  }
  await batch.commit();
}

export function protocolPrompt(review: Review) {
  return [
    { role: 'system' as const, content: 'You draft systematic review protocols in the structure PROSPERO asks for. Write plain, formal Markdown with these ## headings: Review title; Review question; Searches (databases, dates, sample search string); Condition or domain; Participants or population; Intervention(s) or exposure(s); Comparator(s) or control(s); Types of study to be included; Context; Main outcome(s); Additional outcome(s); Data extraction (selection and coding); Risk of bias (quality) assessment; Strategy for data synthesis; Analysis of subgroups or subsets; Timeline. Use what the reviewer gave; mark anything they must decide as [To decide: …]. No preamble.' },
    { role: 'user' as const, content: criteriaBlock(review) },
  ];
}

export function methodsPrompt(review: Review, state: Awaited<ReturnType<typeof reviewState>>) {
  const searches = review.searches.map((search) => `- ${search.kind === 'upload' ? 'Uploaded export from' : 'Searched'} ${search.database} on ${search.date.slice(0, 10)}${search.query ? `: ${search.query}` : ''} (${search.added + search.duplicates} records)`).join('\n');
  const p = state.prisma;
  return [
    { role: 'system' as const, content: `You write the Methods section of a ${PRESETS[review.review_type].label.toLowerCase()} in the past tense, following PRISMA 2020 reporting items (eligibility criteria, information sources, search strategy, selection process, data collection, risk of bias, synthesis). Use only the facts given; mark missing facts as [To add: …]. Markdown with ### subheadings, no preamble.` },
    { role: 'user' as const, content: `${criteriaBlock(review)}\n\nSearches:\n${searches || '- none recorded'}\n\nScreening: ${state.dual ? (state.ai_second ? 'one reviewer with AI suggestions as a second opinion' : `${state.reviewers.length} reviewers independently`) : 'one reviewer'}. Title/abstract agreement: ${state.agreement.title.n ? `${state.agreement.title.percent}% (kappa ${state.agreement.title.kappa})` : 'not measured'}.\nCounts: ${p.identified_total} records identified, ${p.duplicates} duplicates removed, ${p.screened} screened, ${p.excluded_title} excluded at title/abstract, ${p.assessed} full texts assessed, ${p.excluded_full_total} excluded (${p.excluded_full.map((item) => `${item.reason} ${item.count}`).join('; ') || 'none'}), ${p.included} included.\nExtraction columns: ${review.extraction_columns.map((column) => column.label).join(', ')}. Risk of bias domains recorded: randomisation, allocation concealment, blinding.` },
  ];
}
