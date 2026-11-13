import { HTTPException } from 'hono/http-exception';
import type { AuthUser } from '../auth.js';
import { C, col, db, deleteDeep, newId, row, rows } from '../firebase.js';
import { getProjectFor, listProjects, type Project } from './projects.js';
import { ownLibraryDocument, libraryDoc } from './libraryFiles.js';
import { reviewState } from './systematicReview.js';
import {
  availableWorkbookKinds, redactText, scheduleRecall, sectionFor, splitCodes, validateEntry,
  type RecallState, type Workbook, type WorkbookEntry, type WorkbookEvent, type WorkbookLink, type WorkbookLinkKind, type WorkflowKind,
} from '../../workflows.js';

/** Firestore keeps the original collection name; the product calls these Workbooks. */
export const WORKFLOWS_COLLECTION = 'workflows';
const ref = (id: string) => col(WORKFLOWS_COLLECTION).doc(id);
/** Full source texts live beside the workbook (one document per source), not inside it. */
const textsOf = (id: string) => ref(id).collection('source_texts');
/** Recall practice is private to each person and never changes the shared workbook revision. */
const recallsOf = (id: string) => ref(id).collection('recalls');
const validId = (id: string) => /^[a-zA-Z0-9_-]{1,80}$/.test(id);
const roles = ['owner', 'edit', 'comment', 'view'] as const;
type Role = typeof roles[number];
type StoredWorkbook = Omit<Workbook, 'recalls'> & { recalls?: RecallState[] };
const MAX_SOURCE_TEXT = 160_000;
const MAX_WORKBOOK_BYTES = 800_000;
const notFound = () => new HTTPException(404, { message: 'Workbook not found.' });

/** Read the current sharing boundary in the same transaction as the write. Project removal,
 * role changes and workbook detachment must invalidate the authorization snapshot. */
async function authorizeWorkbookWrite(
  tx: FirebaseFirestore.Transaction, user: AuthUser, workbook: Pick<Workbook, 'owner_user_id' | 'project_id'>, need: readonly Role[],
) {
  let role: Role | null = workbook.owner_user_id === user.id ? 'owner' : null;
  if (workbook.project_id) {
    const project = row<Project>(await tx.get(col(C.projects).doc(workbook.project_id)));
    role = project?.owner_user_id === user.id ? 'owner' : project?.members.find((member) => member.user_id === user.id)?.role ?? null;
  }
  if (!role) throw notFound();
  if (!need.includes(role)) throw new HTTPException(403, { message: 'Your project role does not allow this action.' });
}

// ------------------------------------------------------------------ source text storage

type TextMap = Map<string, string>;
const textMap = (snapshot: FirebaseFirestore.QuerySnapshot) =>
  new Map(snapshot.docs.map((doc) => [doc.id, String(doc.get('text') ?? '')]));

/** Puts separately stored source texts back into their entries. Legacy inline texts are kept. */
function hydrateTexts(entries: WorkbookEntry[], texts: TextMap): WorkbookEntry[] {
  return entries.map((entry) => entry.section === 'sources' && !entry.values.text && texts.has(entry.id)
    ? { ...entry, values: { ...entry.values, text: texts.get(entry.id)! } }
    : entry);
}
const stripTexts = (entries: WorkbookEntry[]) =>
  entries.map((entry) => entry.section === 'sources' ? { ...entry, values: { ...entry.values, text: '' } } : entry);

/** Writes changed texts, deletes texts of removed sources. Call inside the transaction, after all reads. */
function writeTexts(tx: FirebaseFirestore.Transaction, id: string, entries: WorkbookEntry[], before: TextMap) {
  const sources = entries.filter((entry) => entry.section === 'sources');
  for (const source of sources) {
    const text = source.values.text || '';
    if (text.length > MAX_SOURCE_TEXT) throw new HTTPException(413, { message: 'A source text is longer than 160,000 characters. Split it into sections.' });
    if (before.get(source.id) !== text) tx.set(textsOf(id).doc(source.id), { text });
  }
  const kept = new Set(sources.map((source) => source.id));
  for (const sourceId of before.keys()) if (!kept.has(sourceId)) tx.delete(textsOf(id).doc(sourceId));
}

async function ownRecalls(id: string, userId: string, legacy: RecallState[] = []): Promise<RecallState[]> {
  const stored = row<{ cards: Record<string, RecallState> }>(await recallsOf(id).doc(userId).get());
  const merged = new Map(legacy.filter((recall) => recall.user_id === userId).map((recall) => [recall.card_id, recall]));
  for (const [cardId, recall] of Object.entries(stored?.cards ?? {})) merged.set(cardId, recall);
  return [...merged.values()];
}

// ------------------------------------------------------------------ reads

export async function getWorkbookFor(user: AuthUser, id: string, need: readonly Role[] = roles): Promise<Workbook & { role: Role }> {
  if (!validId(id)) throw notFound();
  const stored = row<StoredWorkbook>(await ref(id).get());
  if (!stored) throw notFound();
  // Shared workbooks follow current project access, including for the person who created them.
  const role: Role | null = stored.project_id
    ? (await getProjectFor(user, stored.project_id)).role
    : stored.owner_user_id === user.id ? 'owner' : null;
  if (!role) throw notFound();
  if (!need.includes(role)) throw new HTTPException(403, { message: 'Your project role does not allow this action.' });
  const [texts, recalls] = await Promise.all([textsOf(id).get().then(textMap), ownRecalls(id, user.id, stored.recalls)]);
  // A card edited after its last practice starts a fresh schedule.
  const cards = new Map(stored.entries.filter((entry) => entry.section === 'cards').map((entry) => [entry.id, entry.updated_at]));
  const current = recalls.filter((recall) => cards.has(recall.card_id) && recall.reviewed_at >= cards.get(recall.card_id)!);
  return { ...stored, entries: hydrateTexts(stored.entries, texts), recalls: current, links: stored.links ?? [], role };
}

/** Recalls are already limited to the viewer by getWorkbookFor; this keeps older callers safe. */
export function publicWorkbook(workbook: Workbook, userId: string): Workbook {
  return { ...workbook, recalls: (workbook.recalls || []).filter((recall) => recall.user_id === userId) };
}

export async function listWorkbooks(user: AuthUser, projectId?: string) {
  const found = new Map<string, StoredWorkbook>();
  if (projectId) {
    await getProjectFor(user, projectId);
    for (const item of rows<StoredWorkbook>(await col(WORKFLOWS_COLLECTION).where('project_id', '==', projectId).get())) found.set(item.id, item);
  } else {
    for (const item of rows<StoredWorkbook>(await col(WORKFLOWS_COLLECTION).where('owner_user_id', '==', user.id).get())) found.set(item.id, item);
    const projects = await listProjects(user);
    const accessible = new Set(projects.map((p) => p.id));
    for (const [id, item] of found) if (item.project_id && !accessible.has(item.project_id)) found.delete(id);
    for (let i = 0; i < projects.length; i += 30) {
      const ids = projects.slice(i, i + 30).map((p) => p.id);
      for (const item of rows<StoredWorkbook>(await col(WORKFLOWS_COLLECTION).where('project_id', 'in', ids).get())) found.set(item.id, item);
    }
  }
  return [...found.values()]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map(({ entries, recalls: _recalls, ...workbook }) => ({
      ...workbook,
      entry_count: entries.length,
      milestones: entries.filter((entry) => entry.section === 'milestones')
        .map((entry) => ({ id: entry.id, title: entry.values.title, due: entry.values.due, status: entry.values.status })),
    }));
}

// ------------------------------------------------------------------ writes

type CreateInput = {
  kind: WorkflowKind; title: string; question?: string; language?: string; deadline?: string; project_id?: string | null;
  deliverable?: string; audience?: string; success_criteria?: string; source_constraints?: string;
};
export async function createWorkbook(user: AuthUser, input: CreateInput) {
  if (!availableWorkbookKinds().includes(input.kind)) {
    throw new HTTPException(422, { message: 'This workbook type is not available. Choose a research or qualitative workbook.' });
  }
  if (input.project_id) await getProjectFor(user, input.project_id, ['owner', 'edit']);
  const now = new Date().toISOString();
  const workbook: StoredWorkbook = {
    id: newId(), owner_user_id: user.id, project_id: input.project_id || null, kind: input.kind, title: input.title,
    question: input.question || '', language: input.language || '', deadline: input.deadline || '',
    revision: 1, status: 'draft', review_note: '', reviewed_by: null, reviewed_at: null,
    deliverable: input.deliverable || '', audience: input.audience || '',
    success_criteria: input.success_criteria || '', source_constraints: input.source_constraints || '',
    entries: [], links: [], created_at: now, updated_at: now,
  };
  const { id, ...stored } = workbook;
  await db().runTransaction(async (tx) => {
    await authorizeWorkbookWrite(tx, user, workbook, ['owner', 'edit']);
    tx.create(ref(id), stored);
    tx.create(ref(id).collection('events').doc(newId()), { action: 'created', user_id: user.id, revision: 1, at: now, note: '', entry_id: null });
  });
  return getWorkbookFor(user, id);
}

type MutationResult = { note?: string; entry_id?: string | null; review_note?: string } | void;
type Mutation = (workbook: Workbook) => MutationResult;
type MutateOptions = { need?: readonly Role[]; invalidateReview?: boolean; redactTerms?: string[] };
const REVIEW_ACTIONS = ['draft', 'in_review', 'approved', 'changes_requested'];

/** Review notes in the event history that a redaction must also scrub. */
async function redactedHistory(tx: FirebaseFirestore.Transaction, id: string, terms: string[]) {
  if (!terms.length) return [];
  const history = rows<WorkbookEvent>(await tx.get(ref(id).collection('events').where('action', 'in', REVIEW_ACTIONS)));
  const changed = history.flatMap((event) => {
    if (!event.review_note) return [];
    const { text, count } = redactText(event.review_note, terms);
    return count ? [{ id: event.id, review_note: text }] : [];
  });
  if (changed.length > 400) {
    throw new HTTPException(413, { message: 'This redaction affects more than 400 historical review notes. Use narrower phrases; nothing was redacted.' });
  }
  return changed;
}

async function mutate(user: AuthUser, id: string, revision: number, action: string, mutation: Mutation, options: MutateOptions = {}) {
  const { need = ['owner', 'edit'], invalidateReview = true, redactTerms = [] } = options;
  await getWorkbookFor(user, id, need);
  await db().runTransaction(async (tx) => {
    const stored = row<StoredWorkbook>(await tx.get(ref(id)));
    if (!stored) throw notFound();
    await authorizeWorkbookWrite(tx, user, stored, need);
    if (stored.revision !== revision) {
      throw new HTTPException(409, { message: 'Someone changed this workbook. Reload it before saving; your unsaved fields are still in the form.' });
    }
    const texts = textMap(await tx.get(textsOf(id)));
    const history = await redactedHistory(tx, id, redactTerms);
    const { recalls: legacyRecalls, ...rest } = stored;
    const workbook: Workbook = { ...rest, entries: hydrateTexts(stored.entries, texts), recalls: [], links: stored.links ?? [] };
    let result: MutationResult;
    try { result = mutation(workbook); } catch (error) {
      if (error instanceof HTTPException) throw error;
      throw new HTTPException(422, { message: (error as Error).message });
    }
    workbook.revision += 1; workbook.updated_at = new Date().toISOString();
    if (invalidateReview) { workbook.status = 'draft'; workbook.reviewed_by = null; workbook.reviewed_at = null; workbook.review_note = ''; }
    const { id: _id, role: _role, recalls: _recalls, entries, ...fields } = workbook as Workbook & { role?: Role };
    const next = { ...fields, entries: stripTexts(entries), ...(legacyRecalls ? { recalls: legacyRecalls } : {}) };
    if (new TextEncoder().encode(JSON.stringify(next)).length > MAX_WORKBOOK_BYTES) {
      throw new HTTPException(413, { message: 'This workbook is full. Export it and split the work into another workbook. No content was discarded.' });
    }
    writeTexts(tx, id, entries, texts);
    tx.set(ref(id), next);
    for (const event of history) {
      tx.update(ref(id).collection('events').doc(event.id), { review_note: event.review_note, redacted_at: workbook.updated_at, redacted_by: user.id });
    }
    const note = `${result?.note || ''}${history.length ? ` ${history.length} historical review notes redacted.` : ''}`;
    tx.create(ref(id).collection('events').doc(newId()), {
      action, user_id: user.id, revision: workbook.revision, at: workbook.updated_at, note, entry_id: result?.entry_id || null,
      ...(result?.review_note !== undefined ? { review_note: result.review_note } : {}),
    });
  });
  return getWorkbookFor(user, id);
}

type Details = Pick<Workbook, 'title' | 'question' | 'language' | 'deadline' | 'deliverable' | 'audience' | 'success_criteria' | 'source_constraints'>;
export async function updateWorkbook(user: AuthUser, id: string, revision: number, patch: Details) {
  return mutate(user, id, revision, 'updated_details', (workbook) => { Object.assign(workbook, patch); });
}

const MAX_ENTRIES = 500;
export async function putWorkbookEntry(user: AuthUser, id: string, revision: number, input: { id?: string; section: string; values: Record<string, string> }) {
  return mutate(user, id, revision, input.id ? 'edited_entry' : 'added_entry', (workbook) => {
    const existing = input.id ? workbook.entries.find((item) => item.id === input.id) : null;
    if (input.id && !existing) throw new Error('Entry not found.');
    if (existing && existing.section !== input.section) throw new Error('An entry cannot change sections.');
    if (!existing && workbook.entries.length >= MAX_ENTRIES) throw new Error('This workbook holds up to 500 entries. Start another workbook for additional material.');
    const values = validateEntry(workbook.kind, input.section, input.values, workbook.entries, existing?.id);
    const now = new Date().toISOString();
    const entry: WorkbookEntry = { id: existing?.id || newId(), section: input.section, values, created_at: existing?.created_at || now, updated_at: now, updated_by: user.id };
    workbook.entries = existing ? workbook.entries.map((item) => item.id === existing.id ? entry : item) : [...workbook.entries, entry];
    return { note: input.section, entry_id: entry.id };
  });
}

/**
 * Qualitative coding: one coded excerpt, and any codes it uses that are not in the codebook yet,
 * saved in one revision (a new code needs its definition). Codes already in the codebook, ignoring
 * letter case, are reused with the codebook's wording.
 */
export async function codeExcerpt(user: AuthUser, id: string, revision: number, input: { values: Record<string, string>; new_codes: { label: string; definition: string }[] }) {
  return mutate(user, id, revision, 'coded_excerpt', (workbook) => {
    if (workbook.kind !== 'qualitative') throw new Error('Coding is available in qualitative workbooks.');
    const codebook = workbook.entries.filter((entry) => entry.section === 'codes');
    const known = new Map(codebook.map((entry) => [entry.values.label.trim().toLowerCase(), entry.values.label]));
    const now = new Date().toISOString();
    const added: WorkbookEntry[] = [];
    for (const code of input.new_codes) {
      const key = code.label.trim().toLowerCase();
      if (!key || known.has(key)) continue;
      const values = validateEntry(workbook.kind, 'codes', { label: code.label.replace(/,/g, ' '), definition: code.definition, include: '', exclude: '' }, workbook.entries);
      known.set(key, values.label);
      added.push({ id: newId(), section: 'codes', values, created_at: now, updated_at: now, updated_by: user.id });
    }
    const codes = splitCodes(input.values.codes).map((code) => known.get(code.toLowerCase()) ?? code);
    const missing = codes.filter((code) => !known.has(code.toLowerCase()));
    if (missing.length) throw new Error(`Define the code${missing.length > 1 ? 's' : ''} ${missing.map((code) => `“${code}”`).join(', ')} first.`);
    if (!codes.length) throw new Error('Choose a code for this excerpt.');
    if (workbook.entries.length + added.length + 1 > MAX_ENTRIES) throw new Error('This workbook holds up to 500 entries. Start another workbook for additional material.');
    const values = validateEntry(workbook.kind, 'excerpts', { ...input.values, codes: codes.join(', ') }, workbook.entries);
    const excerpt: WorkbookEntry = { id: newId(), section: 'excerpts', values, created_at: now, updated_at: now, updated_by: user.id };
    workbook.entries = [...workbook.entries, ...added, excerpt];
    return { note: `excerpts${added.length ? ` (${added.length} new code${added.length > 1 ? 's' : ''})` : ''}`, entry_id: excerpt.id };
  });
}

export async function deleteWorkbookEntry(user: AuthUser, id: string, revision: number, entryId: string) {
  return mutate(user, id, revision, 'deleted_entry', (workbook) => {
    const entry = workbook.entries.find((item) => item.id === entryId);
    if (!entry) throw new Error('Entry not found.');
    if (workbook.entries.some((item) => item.values.source_id === entryId)) throw new Error('This source supports other entries. Remove or relink those entries first.');
    workbook.entries = workbook.entries.filter((item) => item.id !== entryId);
    return { note: entry.section, entry_id: entryId };
  });
}

/** One transaction: every previewed row validates, or none of the rows are saved. */
export async function importWorkbookEntries(user: AuthUser, id: string, revision: number, section: string, values: Record<string, string>[]) {
  return mutate(user, id, revision, 'imported_entries', (workbook) => {
    if (!values.length || values.length > 250) throw new Error('Import between 1 and 250 rows at a time.');
    if (workbook.entries.length + values.length > MAX_ENTRIES) throw new Error('This workbook holds up to 500 entries. Split this import into another workbook. No rows were saved.');
    const now = new Date().toISOString();
    const added = values.map((raw, index): WorkbookEntry => {
      try {
        return { id: newId(), section, values: validateEntry(workbook.kind, section, raw, workbook.entries), created_at: now, updated_at: now, updated_by: user.id };
      } catch (error) { throw new Error(`Row ${index + 1}: ${(error as Error).message} No rows were saved.`); }
    });
    workbook.entries.push(...added);
    return { note: `${added.length} ${section} entries imported.` };
  });
}

export type Consent = 'public' | 'approved private use' | 'de-identified with permission';

/** Ordered, page-marked text of a Library document the user owns, or null when none is extracted. */
async function libraryText(documentId: string): Promise<string> {
  const chunks = rows<{ id: string; content: string; page: number | null; chunk_index?: number }>(await libraryDoc(documentId).collection(C.chunks).get());
  chunks.sort((a, b) => (a.page ?? 0) - (b.page ?? 0) || (a.chunk_index ?? Number(a.id)) - (b.chunk_index ?? Number(b.id)));
  return chunks.map((chunk) => `${chunk.page == null ? '' : `[Page ${chunk.page}]\n`}${chunk.content}`).join('\n\n');
}

function accessNote(workbook: Workbook, extra: string[] = []) {
  const sharing = workbook.project_id
    ? 'Copied from the importer’s Library. Members of this workbook’s project can read this copy.'
    : 'Copied from your Library into this private workbook.';
  return [sharing, ...extra].join('\n');
}

const SOURCE_KINDS: Record<string, string> = {
  indicator_metadata: 'dataset', indicator_data: 'dataset', financial_facts: 'dataset', filing_metadata: 'filing', trial_registration: 'primary', humanitarian_report: 'policy',
};

export async function importWorkbookSource(user: AuthUser, id: string, revision: number, documentId: string, consent: Consent) {
  const workbook = await getWorkbookFor(user, id, ['owner', 'edit']);
  const document = await ownLibraryDocument(user.id, documentId);
  if (!document) throw new HTTPException(404, { message: 'Source not found in your Library.' });
  const text = (await libraryText(documentId)) || document.abstract || '';
  if (!text) throw new HTTPException(422, { message: 'This source has no extracted text yet. Wait for processing or add its text manually.' });
  if (text.length > MAX_SOURCE_TEXT) {
    throw new HTTPException(413, { message: 'This source is too long for one entry. Add the relevant chapters or sections as separate sources; nothing has been truncated.' });
  }
  const official = document.metadata?.official_source as { kind?: string; url?: string; fetched_at?: string; sha256?: string; warnings?: string[] } | undefined;
  const snapshot = official?.fetched_at
    ? `Official source snapshot ${official.fetched_at}${official.sha256 ? `; SHA-256 ${official.sha256}` : ''}`
    : `Library snapshot ${document.updated_at instanceof Date ? document.updated_at.toISOString() : document.updated_at}`;
  return putWorkbookEntry(user, id, revision, { section: 'sources', values: {
    title: document.title || document.filename, kind: SOURCE_KINDS[official?.kind || ''] || 'scholarly', text,
    reference: official?.url || (document.doi ? `https://doi.org/${document.doi}` : `Library document ${documentId}`),
    edition: snapshot, published: document.publication_date || '', language: '', consent,
    access_note: accessNote(workbook, official?.warnings || []), library_id: documentId,
  } });
}

/**
 * Brings a systematic review's included studies into a research workbook as sources: the attached
 * full text when it is in the importer's own Library, otherwise the abstract (labelled as such).
 * Uses the reviewer's own (blinded) view of the review, so nothing hidden from them is copied.
 */
export async function importReviewSources(user: AuthUser, id: string, revision: number, reviewId: string, consent: Consent) {
  const workbook = await getWorkbookFor(user, id, ['owner', 'edit']);
  if (workbook.kind !== 'research') throw new HTTPException(422, { message: 'Included studies can be imported into research workbooks.' });
  if (!validId(reviewId)) throw new HTTPException(404, { message: 'Review not found.' });
  const state = await reviewState(user, reviewId);
  const included = state.records.filter((record) => record.full_state?.status === 'final' && record.full_state.decision === 'include');
  const already = new Set(workbook.entries.map((entry) => entry.values.origin).filter(Boolean));
  const fresh = included.filter((record) => !already.has(`review:${reviewId}:${record.id}`));
  if (!fresh.length) {
    throw new HTTPException(422, { message: included.length ? 'All included studies from this review are already in the workbook.' : 'This review has no studies included at full-text stage yet.' });
  }
  if (fresh.length > 100) throw new HTTPException(413, { message: 'Import up to 100 included studies at a time. Split the review or use separate workbooks.' });
  let abstractOnly = 0;
  const sources: Record<string, string>[] = [];
  for (const record of fresh) {
    const libraryId = record.full_text?.library_document_id;
    const owned = libraryId ? await ownLibraryDocument(user.id, libraryId) : null;
    const fullText = owned ? await libraryText(owned.id) : '';
    const text = (fullText.length <= MAX_SOURCE_TEXT ? fullText : '') || record.abstract || '';
    if (!fullText || fullText.length > MAX_SOURCE_TEXT) abstractOnly += 1;
    if (!text) continue;
    const basis = fullText && fullText.length <= MAX_SOURCE_TEXT ? 'Full text attached in the systematic review.' : 'Abstract only: the full text is not in your Library or is too long for one entry.';
    sources.push({
      title: (record.title || 'Untitled record').slice(0, 1000), kind: 'scholarly', text,
      reference: record.doi ? `https://doi.org/${record.doi}` : `Systematic review record ${record.id}`,
      edition: `Included at full-text stage in "${state.review.title}"`, published: record.year ? String(record.year) : '', language: '', consent,
      access_note: accessNote(workbook, [basis]), library_id: owned?.id || '', origin: `review:${reviewId}:${record.id}`,
    });
  }
  if (!sources.length) throw new HTTPException(422, { message: 'None of the included studies has a full text or abstract to import.' });
  const updated = await mutate(user, id, revision, 'imported_review', (target) => {
    if (target.entries.length + sources.length > MAX_ENTRIES) throw new Error('This workbook holds up to 500 entries. No studies were imported.');
    const now = new Date().toISOString();
    const added = sources.map((values) => ({
      id: newId(), section: 'sources', values: validateEntry(target.kind, 'sources', values, target.entries), created_at: now, updated_at: now, updated_by: user.id,
    }));
    target.entries.push(...added);
    upsertLink(target, user, { kind: 'review', id: reviewId, title: state.review.title });
    return { note: `${added.length} included studies imported from a systematic review${abstractOnly ? ` (${abstractOnly} as abstracts only)` : ''}.` };
  });
  return { workbook: updated, imported: sources.length, abstract_only: abstractOnly };
}

function upsertLink(workbook: Workbook, user: AuthUser, link: { kind: WorkbookLinkKind; id: string; title: string }) {
  const entry: WorkbookLink = { ...link, title: link.title.slice(0, 200), at: new Date().toISOString(), by: user.id };
  workbook.links = [...(workbook.links ?? []).filter((item) => !(item.kind === link.kind && item.id === link.id)), entry].slice(-50);
}

/** Records a matrix, editor document or review created from this workbook. Does not reset review status. */
export async function addWorkbookLink(user: AuthUser, id: string, revision: number, link: { kind: WorkbookLinkKind; id: string; title: string }) {
  if (!validId(link.id)) throw new HTTPException(422, { message: 'That link is not valid.' });
  return mutate(user, id, revision, 'linked_work', (workbook) => {
    upsertLink(workbook, user, link);
    return { note: `${link.kind}: ${link.title.slice(0, 200)}` };
  }, { invalidateReview: false });
}

export async function redactWorkbook(user: AuthUser, id: string, revision: number, terms: string[]) {
  const clean = [...new Set(terms.map((term) => term.trim()).filter(Boolean))];
  if (!clean.length) throw new HTTPException(422, { message: 'Enter at least one word or phrase to redact.' });
  return mutate(user, id, revision, 'redacted', (workbook) => {
    let count = 0;
    const replace = (text: string) => { const result = redactText(text, clean); count += result.count; return result.text; };
    workbook.title = replace(workbook.title); workbook.question = replace(workbook.question); workbook.review_note = replace(workbook.review_note);
    for (const key of ['deliverable', 'audience', 'success_criteria', 'source_constraints'] as const) if (workbook[key]) workbook[key] = replace(workbook[key]!);
    workbook.entries = workbook.entries.map((entry) => {
      const fields = sectionFor(workbook.kind, entry.section)?.fields || [];
      const fixed = new Set(fields.filter((field) => ['source', 'select', 'number', 'date', 'hidden'].includes(field.type || '')).map((field) => field.key));
      return { ...entry, values: Object.fromEntries(Object.entries(entry.values).map(([key, value]) => [key, fixed.has(key) ? value : replace(value)])) };
    });
    for (const entry of workbook.entries) {
      try { validateEntry(workbook.kind, entry.section, entry.values, workbook.entries); }
      catch { throw new Error('This redaction would invalidate a saved entry or its supporting quotation. Edit or remove the dependent entry first; nothing was redacted.'); }
    }
    return { note: `${count} occurrences redacted. Original terms are not retained in the audit log. Private recall answers are not changed.` };
  }, { redactTerms: clean });
}

export async function reviewWorkbook(user: AuthUser, id: string, revision: number, status: Workbook['status'], note: string) {
  const need: Role[] = status === 'in_review' || status === 'draft' ? ['owner', 'edit'] : ['owner', 'comment'];
  return mutate(user, id, revision, status, (workbook) => {
    if ((status === 'approved' || status === 'changes_requested') && workbook.status !== 'in_review') throw new Error('Submit this workbook for review first.');
    if (status === 'in_review' || status === 'approved') {
      for (const entry of workbook.entries) validateEntry(workbook.kind, entry.section, entry.values, workbook.entries);
    }
    workbook.status = status; workbook.review_note = note;
    workbook.reviewed_by = status === 'approved' || status === 'changes_requested' ? user.id : null;
    workbook.reviewed_at = workbook.reviewed_by ? new Date().toISOString() : null;
    // Keep rationale with its decision revision. Explicit redaction may scrub its text,
    // recording who redacted it while retaining the original action, author and timestamp.
    return { note: status.replaceAll('_', ' '), review_note: note };
  }, { need, invalidateReview: false });
}

/** Private practice: stored under the reviewer's own record; the shared revision is untouched. */
export async function recordRecall(user: AuthUser, id: string, cardId: string, rating: RecallState['rating'], response: string) {
  const workbook = await getWorkbookFor(user, id);
  if (workbook.kind !== 'study' || !workbook.entries.some((entry) => entry.section === 'cards' && entry.id === cardId)) {
    throw new HTTPException(422, { message: 'Practice question not found.' });
  }
  const card = workbook.entries.find((entry) => entry.id === cardId)!;
  await db().runTransaction(async (tx) => {
    const current = row<{ cards: Record<string, RecallState> }>(await tx.get(recallsOf(id).doc(user.id)));
    const legacy = workbook.recalls.find((item) => item.card_id === cardId);
    let prior = current?.cards?.[cardId] ?? legacy;
    // An edited question or answer starts a fresh schedule.
    if (prior && prior.reviewed_at < card.updated_at) prior = undefined;
    const next = scheduleRecall(prior, { card_id: cardId, user_id: user.id, rating, response });
    tx.set(recallsOf(id).doc(user.id), { cards: { ...(current?.cards ?? {}), [cardId]: next } });
  });
  return getWorkbookFor(user, id);
}

export async function workbookEvents(user: AuthUser, id: string): Promise<WorkbookEvent[]> {
  await getWorkbookFor(user, id);
  return rows<WorkbookEvent>(await ref(id).collection('events').get())
    .filter((event) => event.action !== 'recall_reviewed' || event.user_id === user.id)
    .sort((a, b) => a.revision - b.revision);
}

export async function deleteWorkbook(user: AuthUser, id: string) {
  await getWorkbookFor(user, id, ['owner']);
  await deleteDeep(ref(id));
}
