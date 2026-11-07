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

export const columnId = (label: string) =>
  `${label.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '').slice(0, 24) || 'col'}_${newId().slice(0, 6)}`;

/** The writer's own matrix, or 404. */
export async function ownMatrix(userId: string, id: string): Promise<MatrixDoc> {
  if (!id || id.includes('/')) throw new HTTPException(404, { message: 'Matrix not found' });
  const matrix = row<MatrixDoc>(await matricesRef().doc(id).get());
  if (!matrix || matrix.user_id !== userId) throw new HTTPException(404, { message: 'Matrix not found' });
  return matrix;
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
export async function matrixPapers(userId: string, ids: string[]): Promise<LibraryDocument[]> {
  const found: LibraryDocument[] = [];
  for (let index = 0; index < ids.length; index += 100) found.push(...(await getLibraryDocuments(userId, ids.slice(index, index + 100))));
  const byId = new Map(found.map((doc) => [doc.id, doc]));
  return ids.map((id) => byId.get(id)).filter((doc): doc is LibraryDocument => Boolean(doc));
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
  return squash(passage).toLowerCase().includes(wanted.toLowerCase()) ? wanted : null;
}

/** Fills one paper's cells (all columns, or the ones named), leaving cells the writer edited. */
export async function fillRow(slots: Slots, user: AuthUser, matrix: MatrixDoc, documentId: string, onlyColumns?: string[]) {
  if (!isUuid(documentId) || !matrix.document_ids.includes(documentId)) throw new HTTPException(404, { message: 'That paper is not in this matrix' });
  const [paper] = await getLibraryDocuments(user.id, [documentId]);
  if (!paper) throw new HTTPException(404, { message: 'That paper is no longer in your Library' });

  const rowRef = matrixRowsRef(matrix.id).doc(documentId);
  const current = ((await rowRef.get()).get('cells') ?? {}) as Record<string, MatrixCell>;
  const columns = matrix.columns.filter((column) => (!onlyColumns?.length || onlyColumns.includes(column.id)) && !current[column.id]?.edited);
  if (!columns.length) return current;

  // The passages that best answer each column, from this paper only.
  const passages: Passage[] = [];
  const seen = new Set<string>();
  const queries = columns.map((column) => `${column.label}. ${column.prompt}`);
  const found = await Promise.all(queries.map((query) => searchLibrary(user.id, query, [documentId], 1).catch(() => [])));
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
    await rowRef.set({ cells, updated_at: now });
    return cells;
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
    cells[column.id] = value
      ? { value, quote: verifiedQuote(answer?.quote, passage?.text), page: passage?.page ?? null, status: 'done', basis: passage?.basis ?? (passages.some((item) => item.basis === 'full_text') ? 'full_text' : 'abstract'), edited: false, updated_at: now }
      : { value: '', quote: null, page: null, status: 'empty', basis: passages.some((item) => item.basis === 'full_text') ? 'full_text' : 'abstract', edited: false, updated_at: now };
  }
  await rowRef.set({ cells, updated_at: now });
  await matricesRef().doc(matrix.id).update({ updated_at: now });
  return cells;
}

/** The writer's own text in a cell (kept on later fills); an empty value hands the cell back to the AI. */
export async function editCell(matrix: MatrixDoc, documentId: string, columnIdValue: string, value: string) {
  if (!matrix.document_ids.includes(documentId) || !matrix.columns.some((column) => column.id === columnIdValue)) {
    throw new HTTPException(404, { message: 'Cell not found' });
  }
  const now = new Date();
  const rowRef = matrixRowsRef(matrix.id).doc(documentId);
  const clean = value.trim().slice(0, 2000);
  await db().runTransaction(async (tx) => {
    const cells = ((await tx.get(rowRef)).get('cells') ?? {}) as Record<string, MatrixCell>;
    if (clean) cells[columnIdValue] = { value: clean, quote: null, page: null, status: 'done', basis: 'writer', edited: true, updated_at: now };
    else delete cells[columnIdValue];
    tx.set(rowRef, { cells, updated_at: now });
  });
  await matricesRef().doc(matrix.id).update({ updated_at: now });
}
