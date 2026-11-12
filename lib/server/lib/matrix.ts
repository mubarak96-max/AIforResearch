/**
 * Literature review matrices: papers from the Library as rows, questions as columns (aim,
 * method, sample, findings, limitations, or the writer's own), each cell answered by the AI
 * from that paper's own text, with the quote and page it came from.
 *
 *   review_matrices/{id}                     user_id, title, columns[], document_ids[], created_at, updated_at
 *   review_matrices/{id}/rows/{libraryDocId} cells: { [columnId]: Cell }, updated_at
 *
 * The browser fills a matrix one paper at a time (POST …/fill), a few papers at once, so a large
 * matrix shows progress as it goes and no request runs for long. A cell the writer edited is
 * never overwritten by a fill.
 */
import { HTTPException } from 'hono/http-exception';
import { C, col, db, deleteDeep, newId, row, rows } from '../firebase.js';
import type { AuthUser } from '../auth.js';
import type { Slots } from '../slots/types.js';
import { completeMetered, extractJsonObject } from './assist-llm.js';
import { getLibraryDocuments, isUuid, searchLibrary, type LibraryDocument } from './assist-store.js';
import { getProjectFor } from './projects.js';

export type MatrixColumn = { id: string; label: string; prompt: string };

export type MatrixCell = {
  value: string;
  quote: string | null;
  page: number | null;
  /** done: answered; empty: the paper does not say; error: could not be filled. */
  status: 'done' | 'empty' | 'error';
  /** What the answer was read from. */
  basis: 'full_text' | 'abstract' | 'none' | 'writer';
  edited: boolean;
  updated_at: Date;
};

export type MatrixDoc = {
  id: string; user_id: string; title: string; columns: MatrixColumn[]; document_ids: string[];
  created_at: Date; updated_at: Date;
  project_id?: string | null;
  document_owners?: Record<string, string>;
  /** Persists after a source is removed: its contributed findings remain in the audit history. */
  shared_contributions?: boolean;
  /** A deleted shared project's completed evidence is retained without live Library access. */
  archived?: boolean;
  archived_from_project_id?: string;
  paper_snapshots?: LibraryDocument[];
  /** Bibliographic snapshots of sources whose owner left the project; their Library is no longer read. */
  departed_sources?: Record<string, LibraryDocument>;
};

export const MAX_PAPERS = 150;
export const MAX_COLUMNS = 12;

export const DEFAULT_COLUMNS: MatrixColumn[] = [
  { id: 'aim', label: 'Aim / research question', prompt: 'What question does the study ask, or what is its aim?' },
  { id: 'method', label: 'Method / design', prompt: 'What study design and methods are used (e.g. RCT, survey, case study, qualitative interviews, simulation)?' },
  { id: 'sample', label: 'Sample / data', prompt: 'Who or what was studied: sample size, population, setting, country, dataset, time period.' },
  { id: 'findings', label: 'Key findings', prompt: 'The main results, with numbers where the paper gives them.' },
  { id: 'limitations', label: 'Limitations', prompt: 'Limitations the authors state, or obvious ones from the design.' },
];

export const matricesRef = () => col(C.reviewMatrices);
export const matrixRowsRef = (matrixId: string) => matricesRef().doc(matrixId).collection(C.matrixRows);

/** Recheck shared-project permissions in the transaction that commits a mutation. */
export async function editableMatrixInTransaction(tx: FirebaseFirestore.Transaction, id: string, userId: string): Promise<MatrixDoc> {
  const matrix = row<MatrixDoc>(await tx.get(matricesRef().doc(id)));
  if (!matrix) throw new HTTPException(404, { message: 'Matrix not found' });
  if (matrix.archived) throw new HTTPException(409, { message: 'This matrix is an archived project snapshot. Create a new matrix from your own sources to continue editing.' });
  if (matrix.project_id) {
    const project = await tx.get(col(C.projects).doc(matrix.project_id));
    const member = (project.get('members') ?? []).find((item: { user_id: string; role: string }) => item.user_id === userId);
    if (!project.exists || (project.get('owner_user_id') !== userId && member?.role !== 'edit')) throw new HTTPException(403, { message: 'Your current project role does not allow matrix edits.' });
  } else if (matrix.user_id !== userId) throw new HTTPException(403, { message: 'Only the owner can edit this private matrix.' });
  return matrix;
}

export const columnId = (label: string) =>
  `${label.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '').slice(0, 24) || 'col'}_${newId().slice(0, 6)}`;

/** The writer's own matrix, or 404. */
export async function ownMatrix(userId: string, id: string): Promise<MatrixDoc> {
  if (!id || id.includes('/')) throw new HTTPException(404, { message: 'Matrix not found' });
  const matrix = row<MatrixDoc>(await matricesRef().doc(id).get());
  if (!matrix || matrix.user_id !== userId) throw new HTTPException(404, { message: 'Matrix not found' });
  return matrix;
}

/** Sharing a matrix explicitly shares its selected papers and evidence, never the rest of a Library. */
export async function matrixFor(user: AuthUser, id: string, edit = false): Promise<MatrixDoc & { can_edit: boolean }> {
  if (!id || id.includes('/')) throw new HTTPException(404, { message: 'Matrix not found' });
  const matrix = row<MatrixDoc>(await matricesRef().doc(id).get());
  if (!matrix) throw new HTTPException(404, { message: 'Matrix not found' });
  if (matrix.archived) {
    if (matrix.user_id !== user.id) throw new HTTPException(404, { message: 'Matrix not found' });
    if (edit) throw new HTTPException(409, { message: 'This matrix is an archived project snapshot. Create a new matrix from your own sources to continue editing.' });
    return { ...matrix, can_edit: false };
  }
  if (matrix.project_id) {
    const project = await getProjectFor(user, matrix.project_id, edit ? ['owner', 'edit'] : undefined);
    return { ...matrix, can_edit: project.role === 'owner' || project.role === 'edit' };
  }
  if (matrix.user_id !== user.id) throw new HTTPException(404, { message: 'Matrix not found' });
  return { ...matrix, can_edit: true };
}

export async function listMatrices(userId: string) {
  const all = rows<MatrixDoc>(await matricesRef().where('user_id', '==', userId).get());
  return all.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

export async function matrixRows(matrixId: string): Promise<Map<string, Record<string, MatrixCell>>> {
  const snapshot = await matrixRowsRef(matrixId).get();
  return new Map(snapshot.docs.map((doc) => [doc.id, (doc.get('cells') ?? {}) as Record<string, MatrixCell>]));
}

export async function deleteMatrix(matrixId: string) {
  await deleteDeep(matricesRef().doc(matrixId));
}

/** Paper details for each row, in the matrix's order (papers since removed from the Library are dropped). */
export async function matrixPapers(
  userId: string, ids: string[], owners: Record<string, string> = {}, frozen?: LibraryDocument[],
  departed: Record<string, LibraryDocument> = {},
): Promise<LibraryDocument[]> {
  if (frozen !== undefined) {
    const snapshots = new Map(frozen.map((paper) => [paper.id, paper]));
    return ids.map((id) => snapshots.get(id) ?? paperSnapshot(id));
  }
  const live = ids.filter((id) => !departed[id]);
  const found: LibraryDocument[] = [];
  for (const owner of new Set(live.map((id) => owners[id] || userId))) {
    const ownIds = live.filter((id) => (owners[id] || userId) === owner);
    for (let index = 0; index < ownIds.length; index += 100) found.push(...(await getLibraryDocuments(owner, ownIds.slice(index, index + 100))));
  }
  const byId = new Map(found.map((doc) => [doc.id, doc]));
  return ids.map((id) => departed[id] ?? byId.get(id)).filter((doc): doc is LibraryDocument => Boolean(doc));
}

/** The rows' paper details for any matrix: archived, partly departed or fully live. */
export function papersForMatrix(matrix: MatrixDoc, ids = matrix.document_ids) {
  const frozen = matrix.archived ? matrix.paper_snapshots ?? [] : undefined;
  return matrixPapers(matrix.user_id, ids, matrix.document_owners, frozen, matrix.departed_sources ?? {});
}

/**
 * Called when someone leaves or is removed from a project. Matrices in that project stop reading their
 * Library: the sources they contributed keep a bounded bibliographic snapshot and their recorded values,
 * but can no longer be re-filled from that person's full text.
 */
export async function detachMemberSources(projectId: string, userId: string): Promise<void> {
  const matrices = rows<MatrixDoc>(await matricesRef().where('project_id', '==', projectId).get());
  for (const matrix of matrices) {
    const ownerOf = (id: string) => matrix.document_owners?.[id] || matrix.user_id;
    const leaving = matrix.document_ids.filter((id) => ownerOf(id) === userId && !matrix.departed_sources?.[id]);
    if (!leaving.length) continue;
    const papers = await getLibraryDocuments(userId, leaving).catch(() => []);
    const byId = new Map(papers.map((paper) => [paper.id, paperSnapshot(paper.id, paper)]));
    await db().runTransaction(async (tx) => {
      const ref = matricesRef().doc(matrix.id);
      const latest = row<MatrixDoc>(await tx.get(ref));
      if (!latest || latest.project_id !== projectId) return;
      const owner = (id: string) => latest.document_owners?.[id] || latest.user_id;
      const ids = latest.document_ids.filter((id) => owner(id) === userId && !latest.departed_sources?.[id]);
      if (!ids.length) return;
      const departed = { ...latest.departed_sources };
      for (const id of ids) departed[id] = byId.get(id) ?? paperSnapshot(id);
      const now = new Date();
      tx.update(ref, { departed_sources: departed, shared_contributions: true, updated_at: now });
      tx.create(ref.collection('events').doc(newId()), {
        action: 'member_sources_frozen', by: null, actor: 'system', reason: 'member_left',
        member: userId, document_ids: ids, before: null, after: { frozen: ids.length }, at: now,
      });
    });
  }
}

/** Bounded bibliographic metadata only: never full text, abstracts, storage paths or arbitrary metadata. */
function paperSnapshot(id: string, paper?: LibraryDocument): LibraryDocument {
  const clip = (value: unknown, size: number) => typeof value === 'string' ? value.slice(0, size) : '';
  const authors = Array.isArray(paper?.authors) ? paper.authors.slice(0, 5).map((author) => clip(typeof author === 'string' ? author : author?.name, 100)).filter(Boolean) : [];
  return {
    id, filename: '', title: clip(paper?.title || paper?.metadata?.title || paper?.filename, 400) || 'Source unavailable at archive time',
    authors, doi: clip(paper?.doi || paper?.metadata?.doi, 200) || null,
    publisher: clip(paper?.publisher, 150) || null, publication_date: clip(paper?.publication_date || paper?.metadata?.year, 40) || null,
    abstract: null, metadata: null,
  };
}

/** Called while the project still exists. Mixed matrices become frozen personal artifacts of their creator. */
export async function detachProjectMatrices(projectId: string): Promise<void> {
  const matrices = rows<MatrixDoc>(await matricesRef().where('project_id', '==', projectId).get());
  for (const matrix of matrices) {
    // A source that cannot be loaded now stays unavailable; subsequent reads must never use a live fallback.
    const papers = await papersForMatrix(matrix, matrix.document_ids.slice(0, MAX_PAPERS)).catch(() => []);
    const byId = new Map(papers.map((paper) => [paper.id, paperSnapshot(paper.id, paper)]));
    await db().runTransaction(async (tx) => {
      const ref = matricesRef().doc(matrix.id);
      const latest = row<MatrixDoc>(await tx.get(ref));
      if (!latest || latest.project_id !== projectId) return;
      const history = await tx.get(ref.collection('events').where('by', '!=', latest.user_id).limit(1));
      const shared = latest.shared_contributions || Object.values(latest.document_owners || {}).some((owner) => owner !== latest.user_id) || !history.empty;
      const now = new Date();
      tx.update(ref, {
        project_id: null, updated_at: now,
        ...(shared ? {
          archived: true, archived_from_project_id: projectId, shared_contributions: true,
          paper_snapshots: latest.document_ids.slice(0, MAX_PAPERS).map((id) => byId.get(id) ?? paperSnapshot(id)),
        } : {}),
      });
      tx.create(ref.collection('events').doc(newId()), { action: shared ? 'project_archived' : 'project_detached', by: null, actor: 'system', reason: 'project_deleted', before: { project_id: projectId, archived: latest.archived === true }, after: { project_id: null, archived: Boolean(shared) }, at: now });
    });
  }
}

type Passage = { n: number; text: string; page: number | null; basis: 'full_text' | 'abstract' };

const MATRIX_SYSTEM =
  'You extract details from one research paper into a literature review table. You get numbered passages from the paper ' +
  'and a list of columns. For each column, answer from the passages only, in at most 40 words, in plain academic English, ' +
  'keeping numbers exactly as the paper gives them. When the passages do not say, answer with an empty value. ' +
  'For every answer give the number of the passage it came from and a short exact quote (at most 30 words, copied character for character) that supports it. ' +
  'Answer with JSON only: {"columns": {"<column id>": {"value": "...", "passage": <number or null>, "quote": "..."}}}.';

const squash = (text: string) => text.replace(/\s+/g, ' ').trim();

/** The quote only when it really occurs in the passage (models paraphrase "quotes"). */
export function verifiedQuote(quote: unknown, passage: string | undefined): string | null {
  const wanted = squash(String(quote ?? '')).replace(/^["“]|["”]$/g, '');
  if (!wanted || !passage) return null;
  // Same floor as review extraction: a word or a bare number occurs almost anywhere and proves nothing.
  const letters = wanted.replace(/\s/g, '');
  if (letters.length < 8 || !/\p{L}/u.test(wanted)) return null;
  return squash(passage).toLowerCase().includes(wanted.toLowerCase()) ? wanted : null;
}

/** A slow model response must not overwrite a collaborator's newer manual correction. */
export async function saveMatrixFill(matrixId: string, userId: string, documentId: string, columnIds: string[], proposed: Record<string, MatrixCell>) {
  return db().runTransaction(async (tx) => {
    const matrix = await editableMatrixInTransaction(tx, matrixId, userId);
    const rowRef = matrixRowsRef(matrixId).doc(documentId);
    const before = ((await tx.get(rowRef)).get('cells') ?? {}) as Record<string, MatrixCell>;
    if (!matrix?.document_ids.includes(documentId)) throw new HTTPException(409, { message: 'This source was removed while the extraction ran. Reload the matrix.' });
    const cells = { ...before };
    const allowed = new Set(matrix.columns.map((column) => column.id));
    for (const column of columnIds) if (allowed.has(column) && !cells[column]?.edited && proposed[column]) cells[column] = proposed[column];
    const now = new Date();
    tx.set(rowRef, { cells, updated_at: now });
    tx.update(matricesRef().doc(matrixId), { updated_at: now, ...(userId !== matrix.user_id ? { shared_contributions: true } : {}) });
    tx.create(matricesRef().doc(matrixId).collection('events').doc(newId()), { action: 'ai_extraction', by: userId, document_id: documentId, before, after: cells, at: now });
    return cells;
  });
}

/** Fills one paper's cells (all columns, or the ones named), leaving cells the writer edited. */
export async function fillRow(slots: Slots, user: AuthUser, matrix: MatrixDoc, documentId: string, onlyColumns?: string[]) {
  if (!isUuid(documentId) || !matrix.document_ids.includes(documentId)) throw new HTTPException(404, { message: 'That paper is not in this matrix' });
  if (matrix.departed_sources?.[documentId]) {
    throw new HTTPException(409, { message: 'The person who added this source left the project. Its recorded values remain; add your own copy to fill it again.' });
  }
  const sourceOwner = matrix.document_owners?.[documentId] || matrix.user_id;
  const [paper] = await getLibraryDocuments(sourceOwner, [documentId]);
  if (!paper) throw new HTTPException(404, { message: 'That paper is no longer in your Library' });

  const rowRef = matrixRowsRef(matrix.id).doc(documentId);
  const current = ((await rowRef.get()).get('cells') ?? {}) as Record<string, MatrixCell>;
  const columns = matrix.columns.filter((column) => (!onlyColumns?.length || onlyColumns.includes(column.id)) && !current[column.id]?.edited);
  if (!columns.length) return current;

  // The passages that best answer each column, from this paper only.
  const passages: Passage[] = [];
  const seen = new Set<string>();
  const queries = columns.map((column) => `${column.label}. ${column.prompt}`);
  const found = await Promise.all(queries.map((query) => searchLibrary(sourceOwner, query, [documentId], 1).catch(() => [])));
  for (const hits of found) {
    for (const passage of hits[0]?.passages ?? []) {
      const key = passage.content.slice(0, 120);
      if (seen.has(key)) continue;
      seen.add(key);
      passages.push({ n: passages.length + 1, text: passage.content.slice(0, 1600), page: passage.page, basis: 'full_text' });
    }
  }
  if (paper.abstract) passages.unshift({ n: 0, text: paper.abstract.slice(0, 2000), page: null, basis: 'abstract' });
  passages.forEach((passage, index) => { passage.n = index + 1; });

  const now = new Date();
  const cells: Record<string, MatrixCell> = { ...current };
  if (!passages.length) {
    for (const column of columns) cells[column.id] = { value: '', quote: null, page: null, status: 'empty', basis: 'none', edited: false, updated_at: now };
    return saveMatrixFill(matrix.id, user.id, documentId, columns.map((column) => column.id), cells);
  }

  const title = paper.title || paper.filename || 'Untitled';
  const raw = await completeMetered(
    slots.llm,
    user,
    {
      messages: [
        { role: 'system', content: MATRIX_SYSTEM },
        {
          role: 'user',
          content:
            `Paper: ${title}\n\nPassages:\n${passages.map((passage) => `[${passage.n}]${passage.basis === 'abstract' ? ' (abstract)' : passage.page ? ` (p. ${passage.page})` : ''} ${passage.text}`).join('\n\n')}` +
            `\n\nColumns:\n${columns.map((column) => `- ${column.id}: ${column.label}. ${column.prompt}`).join('\n')}`,
        },
      ],
      task: 'fast',
      temperature: 0.1,
      maxTokens: 1800,
      json: true,
    },
    { feature: 'review-matrix' },
  );
  const answers = (extractJsonObject(raw).columns ?? {}) as Record<string, any>;
  for (const column of columns) {
    const answer = answers[column.id];
    const value = squash(String(answer?.value ?? '')).slice(0, 600);
    const passage = passages.find((item) => item.n === Number(answer?.passage));
    const quote = verifiedQuote(answer?.quote, passage?.text);
    cells[column.id] = value
      ? { value: quote ? value : '', quote, page: quote ? passage?.page ?? null : null, status: quote ? 'done' : 'error', basis: passage?.basis ?? (passages.some((item) => item.basis === 'full_text') ? 'full_text' : 'abstract'), edited: false, updated_at: now }
      : { value: '', quote: null, page: null, status: 'empty', basis: passages.some((item) => item.basis === 'full_text') ? 'full_text' : 'abstract', edited: false, updated_at: now };
  }
  return saveMatrixFill(matrix.id, user.id, documentId, columns.map((column) => column.id), cells);
}

/** The writer's own text in a cell (kept on later fills); an empty value hands the cell back to the AI. */
export async function editCell(matrix: MatrixDoc, documentId: string, columnIdValue: string, value: string, actorId = matrix.user_id) {
  if (!matrix.document_ids.includes(documentId) || !matrix.columns.some((column) => column.id === columnIdValue)) {
    throw new HTTPException(404, { message: 'Cell not found' });
  }
  const now = new Date();
  const rowRef = matrixRowsRef(matrix.id).doc(documentId);
  const clean = value.trim().slice(0, 2000);
  await db().runTransaction(async (tx) => {
    const cells = ((await tx.get(rowRef)).get('cells') ?? {}) as Record<string, MatrixCell>;
    const latest = await editableMatrixInTransaction(tx, matrix.id, actorId);
    if (!latest?.document_ids.includes(documentId) || !latest.columns.some((column) => column.id === columnIdValue)) throw new HTTPException(409, { message: 'This matrix changed. Reload before saving the cell.' });
    const before = cells[columnIdValue] ?? null;
    if (clean) cells[columnIdValue] = { value: clean, quote: null, page: null, status: 'done', basis: 'writer', edited: true, updated_at: now };
    else delete cells[columnIdValue];
    tx.set(rowRef, { cells, updated_at: now });
    tx.update(matricesRef().doc(matrix.id), { updated_at: now, ...(actorId !== latest.user_id ? { shared_contributions: true } : {}) });
    tx.create(matricesRef().doc(matrix.id).collection('events').doc(newId()), { action: 'manual_edit', by: actorId, document_id: documentId, column_id: columnIdValue, before, after: cells[columnIdValue] ?? null, at: now });
  });
}
