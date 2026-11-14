/** Literature review matrices (mounted at /api/matrices). See lib/matrix.ts. */
import { Hono } from 'hono';
import { planQuota } from '../lib/plans.js';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { requireUser, type AppVariables } from '../auth.js';
import type { Slots } from '../slots/types.js';
import { currentUser, parseBody, withHttpErrors } from '../lib/assist-llm.js';
import { getLibraryDocuments, isUuid, libraryDocumentIdsInFolders } from '../lib/assist-store.js';
import {
  DEFAULT_COLUMNS, MAX_COLUMNS, MAX_PAPERS, columnId, deleteMatrix, editCell, fillRow, listMatrices, matricesRef,
  matrixPapers, matrixRows, papersForMatrix, matrixRowsRef, ownMatrix, matrixFor, editableMatrixInTransaction, addMatrixSources, type MatrixColumn, type MatrixDoc,
} from '../lib/matrix.js';
import { C, col, db, newId, rows } from '../firebase.js';
import { getProjectFor, listProjects } from '../lib/projects.js';

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
  project_id: z.string().uuid().nullable().optional(),
});

const UpdateBody = z.object({
  project_id: z.string().uuid().nullable().optional(),
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
  project_id: matrix.project_id ?? null,
  archived: matrix.archived === true, archived_from_project_id: matrix.archived_from_project_id ?? null,
  created_at: new Date(matrix.created_at).toISOString(), updated_at: new Date(matrix.updated_at).toISOString(),
});

export function matrixRoutes(slots: Slots) {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use('*', requireUser);

  app.get('/', async (c) => {
    const user = currentUser(c);
    const projects = await listProjects(user);
    const allowed = new Set(projects.map((project) => project.id));
    const found = new Map((await listMatrices(user.id)).filter((matrix) => !matrix.project_id || allowed.has(matrix.project_id)).map((matrix) => [matrix.id, matrix]));
    for (let start = 0; start < projects.length; start += 30) {
      const ids = projects.slice(start, start + 30).map((project) => project.id);
      for (const matrix of rows<MatrixDoc>(await col(C.reviewMatrices).where('project_id', 'in', ids).get())) found.set(matrix.id, matrix);
    }
    return c.json({ matrices: [...found.values()].map(summary), default_columns: DEFAULT_COLUMNS });
  });

  app.post('/', async (c) => {
    const user = currentUser(c);
    const body = await parseBody(c, CreateBody);
    if (body.project_id) await getProjectFor(user, body.project_id, ['owner', 'edit']);
    const ids = await ownedIds(user.id, body.document_ids, body.folder_ids);
    const now = new Date();
    const matrix: MatrixDoc = {
      id: newId(), user_id: user.id, title: body.title || 'Literature review matrix',
      columns: withIds(body.columns?.length ? body.columns : DEFAULT_COLUMNS),
      document_ids: ids.slice(0, MAX_PAPERS), created_at: now, updated_at: now,
      project_id: body.project_id ?? null, document_owners: Object.fromEntries(ids.map((id) => [id, user.id])),
    };
    const { id, ...fields } = matrix;
    await db().runTransaction(async (tx) => {
      tx.create(matricesRef().doc(id), fields);
      tx.create(matricesRef().doc(id).collection('events').doc(newId()), { action: 'created', by: user.id, before: null, after: { title: matrix.title, columns: matrix.columns, project_id: matrix.project_id ?? null, document_ids: matrix.document_ids, document_owners: matrix.document_owners ?? {} }, at: now });
    });
    return c.json(summary(matrix), 201);
  });

  app.get('/:id', async (c) => {
    const user = currentUser(c);
    const matrix = await matrixFor(user, c.req.param('id'));
    const [papers, cells] = await Promise.all([papersForMatrix(matrix), matrixRows(matrix.id)]);
    return c.json({
      ...summary(matrix),
      can_edit: matrix.can_edit, can_share: !matrix.archived && matrix.user_id === user.id, can_delete: matrix.user_id === user.id,
      rows: papers.map((paper) => ({
        paper: { ...paperSummary(paper), departed: Boolean(matrix.departed_sources?.[paper.id]) },
        cells: cells.get(paper.id) ?? {},
      })),
    });
  });

  app.get('/:id/export', async (c) => {
    const matrix = await matrixFor(currentUser(c), c.req.param('id'));
    const [papers, cells, events] = await Promise.all([
      papersForMatrix(matrix),
      matrixRows(matrix.id), matricesRef().doc(matrix.id).collection('events').get(),
    ]);
    return c.json({
      schema_version: 1, exported_at: new Date().toISOString(), matrix: summary(matrix),
      rows: papers.map((paper) => ({ paper: paperSummary(paper), cells: cells.get(paper.id) ?? {} })),
      events: rows(events),
    });
  });

  app.patch('/:id', async (c) => {
    const user = currentUser(c);
    const matrix = await matrixFor(user, c.req.param('id'), true);
    const body = await parseBody(c, UpdateBody);
    if (body.project_id) await getProjectFor(user, body.project_id, ['owner', 'edit']);
    const updated = await db().runTransaction(async (tx) => {
      const latest = await editableMatrixInTransaction(tx, matrix.id, user.id);
      if (latest.project_id !== matrix.project_id) throw new HTTPException(409, { message: 'This matrix moved to another project. Reload before editing it.' });
      const changes: Partial<MatrixDoc> = { updated_at: new Date() };
      if (body.project_id !== undefined) {
        if (latest.user_id !== user.id) throw new HTTPException(403, { message: 'Only the matrix creator can change its project.' });
        if (body.project_id !== latest.project_id) {
          const history = await tx.get(matricesRef().doc(matrix.id).collection('events').where('by', '!=', user.id).limit(1));
          if (latest.shared_contributions || Object.values(latest.document_owners || {}).some((owner) => owner !== user.id) || !history.empty) throw new HTTPException(409, { message: 'This matrix includes collaborator contributions or their audit history. Keep it in this project, or create a new matrix from your own sources.' });
          if (body.project_id) {
            const target = await tx.get(col(C.projects).doc(body.project_id));
            const member = (target.get('members') ?? []).find((item: { user_id: string; role: string }) => item.user_id === user.id);
            if (!target.exists || (target.get('owner_user_id') !== user.id && member?.role !== 'edit')) throw new HTTPException(403, { message: 'You no longer have edit access to the destination project.' });
          }
        }
        changes.project_id = body.project_id;
      }
      if (body.title !== undefined) changes.title = body.title || latest.title;
      if (body.columns) changes.columns = withIds(body.columns, latest.columns);
      if (latest.user_id !== user.id && (body.title !== undefined || body.columns)) changes.shared_contributions = true;
      const changedKeys = (['title', 'columns', 'project_id'] as const).filter((key) => changes[key] !== undefined && JSON.stringify(changes[key]) !== JSON.stringify(latest[key] ?? null));
      tx.update(matricesRef().doc(matrix.id), changes);
      if (changedKeys.length) tx.create(matricesRef().doc(matrix.id).collection('events').doc(newId()), { action: 'matrix_updated', by: user.id, before: Object.fromEntries(changedKeys.map((key) => [key, latest[key] ?? null])), after: Object.fromEntries(changedKeys.map((key) => [key, changes[key] ?? null])), at: changes.updated_at });
      return { ...latest, ...changes };
    });
    return c.json(summary(updated));
  });

  app.delete('/:id', async (c) => {
    const matrix = await matrixFor(currentUser(c), c.req.param('id'));
    if (matrix.user_id !== currentUser(c).id) throw new HTTPException(403, { message: 'Only the matrix creator can delete it.' });
    if (!matrix.archived) await matrixFor(currentUser(c), matrix.id, true);
    await deleteMatrix(matrix.id);
    return c.json({ deleted: true });
  });

  app.post('/:id/papers', async (c) => {
    const user = currentUser(c);
    const matrix = await matrixFor(user, c.req.param('id'), true);
    const body = await parseBody(c, PapersBody);
    const ids = await ownedIds(user.id, body.document_ids, body.folder_ids);
    const { added, paper_count } = await addMatrixSources(matrix, user.id, ids);
    return c.json({ added, paper_count });
  });

  app.delete('/:id/papers/:documentId', async (c) => {
    const matrix = await matrixFor(currentUser(c), c.req.param('id'), true);
    const documentId = c.req.param('documentId');
    await db().runTransaction(async (tx) => {
      const latest = await editableMatrixInTransaction(tx, matrix.id, currentUser(c).id);
      if (latest.project_id !== matrix.project_id) throw new HTTPException(409, { message: 'This matrix moved to another project. Reload before removing sources.' });
      if (!latest.document_ids.includes(documentId)) return;
      const previousCells = isUuid(documentId) ? (await tx.get(matrixRowsRef(matrix.id).doc(documentId))).get('cells') ?? {} : {};
      const { [documentId]: _owner, ...owners } = latest.document_owners || {};
      const next = latest.document_ids.filter((id) => id !== documentId);
      const now = new Date();
      tx.update(matricesRef().doc(matrix.id), { document_ids: next, document_owners: owners, updated_at: now, ...(currentUser(c).id !== latest.user_id ? { shared_contributions: true } : {}) });
      if (isUuid(documentId)) tx.delete(matrixRowsRef(matrix.id).doc(documentId));
      tx.create(matricesRef().doc(matrix.id).collection('events').doc(newId()), { action: 'source_removed', by: currentUser(c).id, document_id: documentId, before: { document_ids: latest.document_ids, document_owners: latest.document_owners ?? {}, cells: previousCells }, after: { document_ids: next, document_owners: owners }, at: now });
    });
    return c.json({ removed: true });
  });

  /** Fills one paper's row with AI answers (the browser calls this for each paper in turn): 1 credit a row, back if it fails. */
  app.post('/:id/fill', planQuota('ai_edit'), async (c) => {
    const user = currentUser(c);
    const matrix = await matrixFor(user, c.req.param('id'), true);
    const body = await parseBody(c, FillBody);
    return withHttpErrors(async () => c.json({ document_id: body.document_id, cells: await fillRow(slots, user, matrix, body.document_id, body.column_ids) }));
  });

  app.put('/:id/rows/:documentId/cells/:columnId', async (c) => {
    const matrix = await matrixFor(currentUser(c), c.req.param('id'), true);
    const body = await parseBody(c, CellBody);
    await editCell(matrix, c.req.param('documentId'), c.req.param('columnId'), body.value, currentUser(c).id);
    return c.json({ saved: true });
  });

  return app;
}
