/** Literature review matrices (mounted at /api/matrices). See lib/matrix.ts. */
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { requireUser, type AppVariables } from '../auth.js';
import type { Slots } from '../slots/types.js';
import { currentUser, parseBody, withHttpErrors } from '../lib/assist-llm.js';
import { getLibraryDocuments, isUuid, libraryDocumentIdsInFolders } from '../lib/assist-store.js';
import {
  DEFAULT_COLUMNS, MAX_COLUMNS, MAX_PAPERS, columnId, deleteMatrix, editCell, fillRow, listMatrices, matricesRef,
  matrixPapers, matrixRows, matrixRowsRef, ownMatrix, type MatrixColumn, type MatrixDoc,
} from '../lib/matrix.js';
import { newId } from '../firebase.js';

const Column = z.object({
  id: z.string().max(40).optional(),
  label: z.string().trim().min(1).max(80),
  prompt: z.string().trim().max(400).default(''),
});

const CreateBody = z.object({
  title: z.string().trim().max(160).default(''),
  columns: z.array(Column).max(MAX_COLUMNS).optional(),
  document_ids: z.array(z.string()).max(MAX_PAPERS).default([]),
  folder_ids: z.array(z.string()).max(30).default([]),
});

const UpdateBody = z.object({
  title: z.string().trim().max(160).optional(),
  columns: z.array(Column).min(1).max(MAX_COLUMNS).optional(),
});

const PapersBody = z.object({ document_ids: z.array(z.string()).max(MAX_PAPERS).default([]), folder_ids: z.array(z.string()).max(30).default([]) });
const FillBody = z.object({ document_id: z.string(), column_ids: z.array(z.string()).max(MAX_COLUMNS).optional() });
const CellBody = z.object({ value: z.string().max(2000) });

/** Columns with ids: kept for existing ones, made for new ones; the default prompt is the label. */
function withIds(columns: z.output<typeof Column>[], existing: MatrixColumn[] = []): MatrixColumn[] {
  const known = new Set(existing.map((column) => column.id));
  const used = new Set<string>();
  return columns.map((column) => {
    const id = column.id && known.has(column.id) && !used.has(column.id) ? column.id : columnId(column.label);
    used.add(id);
    return { id, label: column.label, prompt: column.prompt || column.label };
  });
}

/** Library ids the writer owns, from explicit ids and folders, de-duplicated, in order. */
async function ownedIds(userId: string, documentIds: string[], folderIds: string[]) {
  const fromFolders = folderIds.length ? await libraryDocumentIdsInFolders(userId, folderIds) : [];
  const wanted = [...new Set([...documentIds.filter(isUuid), ...fromFolders])];
  const owned = new Set<string>();
  for (let index = 0; index < wanted.length; index += 100) {
    for (const doc of await getLibraryDocuments(userId, wanted.slice(index, index + 100))) owned.add(doc.id);
  }
  return wanted.filter((id) => owned.has(id));
}

function paperSummary(doc: Awaited<ReturnType<typeof matrixPapers>>[number]) {
  const metadata = (doc.metadata || {}) as Record<string, any>;
  const authors = Array.isArray(doc.authors) ? (doc.authors as unknown[]).map((author) => (typeof author === 'string' ? author : (author as any)?.name || '')).filter(Boolean) : [];
  const year = String(doc.publication_date || metadata.year || '').match(/\d{4}/)?.[0] ?? null;
  return { id: doc.id, title: doc.title || metadata.title || doc.filename || 'Untitled', authors, year, doi: doc.doi || metadata.doi || null, has_abstract: Boolean(doc.abstract) };
}

const summary = (matrix: MatrixDoc) => ({
  id: matrix.id, title: matrix.title, columns: matrix.columns, paper_count: matrix.document_ids.length,
  created_at: new Date(matrix.created_at).toISOString(), updated_at: new Date(matrix.updated_at).toISOString(),
});

export function matrixRoutes(slots: Slots) {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use('*', requireUser);

  app.get('/', async (c) => c.json({ matrices: (await listMatrices(currentUser(c).id)).map(summary), default_columns: DEFAULT_COLUMNS }));

  app.post('/', async (c) => {
    const user = currentUser(c);
    const body = await parseBody(c, CreateBody);
    const ids = await ownedIds(user.id, body.document_ids, body.folder_ids);
    const now = new Date();
    const matrix: MatrixDoc = {
      id: newId(), user_id: user.id, title: body.title || 'Literature review matrix',
      columns: withIds(body.columns?.length ? body.columns : DEFAULT_COLUMNS),
      document_ids: ids.slice(0, MAX_PAPERS), created_at: now, updated_at: now,
    };
    const { id, ...fields } = matrix;
    await matricesRef().doc(id).set(fields);
    return c.json(summary(matrix), 201);
  });

  app.get('/:id', async (c) => {
    const user = currentUser(c);
    const matrix = await ownMatrix(user.id, c.req.param('id'));
    const [papers, cells] = await Promise.all([matrixPapers(user.id, matrix.document_ids), matrixRows(matrix.id)]);
    return c.json({
      ...summary(matrix),
      rows: papers.map((paper) => ({ paper: paperSummary(paper), cells: cells.get(paper.id) ?? {} })),
    });
  });

  app.patch('/:id', async (c) => {
    const user = currentUser(c);
    const matrix = await ownMatrix(user.id, c.req.param('id'));
    const body = await parseBody(c, UpdateBody);
    const changes: Partial<MatrixDoc> = { updated_at: new Date() };
    if (body.title !== undefined) changes.title = body.title || matrix.title;
    if (body.columns) changes.columns = withIds(body.columns, matrix.columns);
    await matricesRef().doc(matrix.id).update(changes);
    return c.json(summary({ ...matrix, ...changes }));
  });

  app.delete('/:id', async (c) => {
    const matrix = await ownMatrix(currentUser(c).id, c.req.param('id'));
    await deleteMatrix(matrix.id);
    return c.json({ deleted: true });
  });

  app.post('/:id/papers', async (c) => {
    const user = currentUser(c);
    const matrix = await ownMatrix(user.id, c.req.param('id'));
    const body = await parseBody(c, PapersBody);
    const ids = await ownedIds(user.id, body.document_ids, body.folder_ids);
    const next = [...new Set([...matrix.document_ids, ...ids])];
    if (next.length > MAX_PAPERS) throw new HTTPException(422, { message: `A matrix holds up to ${MAX_PAPERS} papers. Start a second matrix for the rest.` });
    await matricesRef().doc(matrix.id).update({ document_ids: next, updated_at: new Date() });
    return c.json({ added: next.length - matrix.document_ids.length, paper_count: next.length });
  });

  app.delete('/:id/papers/:documentId', async (c) => {
    const matrix = await ownMatrix(currentUser(c).id, c.req.param('id'));
    const documentId = c.req.param('documentId');
    await matricesRef().doc(matrix.id).update({ document_ids: matrix.document_ids.filter((id) => id !== documentId), updated_at: new Date() });
    if (isUuid(documentId)) await matrixRowsRef(matrix.id).doc(documentId).delete();
    return c.json({ removed: true });
  });

  /** Fills one paper's row with AI answers (the browser calls this for each paper in turn). */
  app.post('/:id/fill', async (c) => {
    const user = currentUser(c);
    const matrix = await ownMatrix(user.id, c.req.param('id'));
    const body = await parseBody(c, FillBody);
    return withHttpErrors(async () => c.json({ document_id: body.document_id, cells: await fillRow(slots, user, matrix, body.document_id, body.column_ids) }));
  });

  app.put('/:id/rows/:documentId/cells/:columnId', async (c) => {
    const matrix = await ownMatrix(currentUser(c).id, c.req.param('id'));
    const body = await parseBody(c, CellBody);
    await editCell(matrix, c.req.param('documentId'), c.req.param('columnId'), body.value);
    return c.json({ saved: true });
  });

  return app;
}
