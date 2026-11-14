/**
 * PDF reader highlights (mounted under /api/library by libraryRoutes): `library_documents/{id}/highlights/{id}`,
 * owner only. A highlight can be sent on as a project finding or as a review matrix cell; the links are kept on it.
 */
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { requireUser, type AppVariables, type AuthUser } from '../auth.js';
import { C, col, db, newId, row, rows } from '../firebase.js';
import { currentUser, parseBody } from '../lib/assist-llm.js';
import { libraryDoc, ownLibraryDocument, type LibraryRow } from '../lib/libraryFiles.js';
import { getProjectFor, listProjects } from '../lib/projects.js';
import { addMatrixSources, editCell, matrixFor, type MatrixDoc } from '../lib/matrix.js';
import { addProjectFinding, createProjectSource, projectSourcesForLibrary, verifyEvidenceQuote } from './projectEvidence.js';

export const HIGHLIGHT_COLORS = ['yellow', 'green', 'blue', 'pink'] as const;
export const MAX_HIGHLIGHTS = 2000;
const MAX_TEXT = 4000;

type Rect = { x: number; y: number; w: number; h: number };
type ProjectLink = { project_id: string; source_id: string; finding_id: string };
type MatrixLink = { matrix_id: string; column_id: string };
export type HighlightRow = {
  id: string; user_id: string; page: number; quote: string; note: string; color: (typeof HIGHLIGHT_COLORS)[number]; rects: Rect[];
  verified: boolean; created_at: Date; updated_at: Date; project_links: ProjectLink[]; matrix_links: MatrixLink[];
};

export const normalizeQuote = (value: string) => value.replace(/\s+/gu, ' ').trim();
const fraction = z.number().finite().min(0).max(1).transform((value) => Math.round(value * 10_000) / 10_000);
const Rects = z.array(z.object({ x: fraction, y: fraction, w: fraction, h: fraction })).min(1).max(60);
const Color = z.enum(HIGHLIGHT_COLORS);
const CreateBody = z.object({
  page: z.number().int().min(1).max(100_000),
  quote: z.string().max(20_000).transform(normalizeQuote).pipe(z.string().min(1, 'Select some text to highlight.').max(MAX_TEXT, 'A highlight holds up to 4,000 characters.')),
  note: z.string().max(MAX_TEXT).default('').transform((value) => value.trim()),
  color: Color.default('yellow'),
  rects: Rects,
});
const PatchBody = z.object({ note: z.string().max(MAX_TEXT).transform((value) => value.trim()).optional(), color: Color.optional() })
  .refine((body) => body.note !== undefined || body.color !== undefined, 'Change the note or the colour.');
const ProjectBody = z.object({ project_id: z.string().min(1).max(200), finding: z.string().trim().min(1).max(4000), interpretation: z.boolean().default(false) });
const MatrixBody = z.object({ matrix_id: z.string().min(1).max(200), column_id: z.string().min(1).max(80) });

const highlightsRef = (documentId: string) => libraryDoc(documentId).collection(C.highlights);

export function publicHighlight(highlight: HighlightRow) {
  return {
    id: highlight.id, user_id: highlight.user_id, page: highlight.page, quote: highlight.quote, note: highlight.note ?? '',
    color: highlight.color, rects: highlight.rects ?? [], verified: highlight.verified === true,
    created_at: new Date(highlight.created_at).toISOString(), updated_at: new Date(highlight.updated_at).toISOString(),
    project_links: highlight.project_links ?? [], matrix_links: highlight.matrix_links ?? [],
  };
}

async function ownDocument(user: AuthUser, id: string): Promise<LibraryRow> {
  const document = await ownLibraryDocument(user.id, id);
  if (!document) throw new HTTPException(404, { message: 'Not found in your Library' });
  return document;
}

async function highlightFor(documentId: string, id: string) {
  if (!/^[\w-]{1,80}$/.test(id)) throw new HTTPException(404, { message: 'Highlight not found' });
  const ref = highlightsRef(documentId).doc(id);
  const highlight = row<HighlightRow>(await ref.get());
  if (!highlight) throw new HTTPException(404, { message: 'Highlight not found' });
  return { ref, highlight };
}

/** Whether the quote is in the extracted text of that page (false while the PDF has no text). */
export async function quoteOnPage(documentId: string, page: number, quote: string) {
  const chunks = rows<{ page?: number | null; page_number?: number | null; content?: string }>(
    await libraryDoc(documentId).collection(C.chunks).select('page', 'page_number', 'content').get());
  const text = chunks.filter((chunk) => Number(chunk.page_number ?? chunk.page) === page).map((chunk) => String(chunk.content ?? '')).join('\n\n');
  return text.trim() ? verifyEvidenceQuote([{ page, text }], quote, page) : false;
}

async function appendLink<T>(ref: FirebaseFirestore.DocumentReference, field: 'project_links' | 'matrix_links', link: T, same: (item: T) => boolean) {
  await db().runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) return;
    const list = ((snapshot.get(field) ?? []) as T[]).filter((item) => !same(item));
    tx.update(ref, { [field]: [...list, link], updated_at: new Date() });
  });
}

/** Project names and finding review states for the links, where the reader can still see the project. */
async function withLinkDetails(user: AuthUser, list: ReturnType<typeof publicHighlight>[]) {
  const links = list.flatMap((highlight) => highlight.project_links);
  if (!links.length) return list;
  const projects = new Map((await listProjects(user)).map((project) => [project.id, project]));
  const visible = [...new Map(links.filter((link) => projects.has(link.project_id)).map((link) => [link.finding_id, link])).values()];
  const status = new Map(await Promise.all(visible.map(async (link) => {
    const finding = await col(C.projects).doc(link.project_id).collection('evidence').doc(link.source_id).collection('findings').doc(link.finding_id).get();
    return [link.finding_id, finding.exists ? String(finding.get('status') ?? '') || null : null] as const;
  })));
  return list.map((highlight) => ({
    ...highlight,
    project_links: highlight.project_links.map((link) => ({ ...link, project_name: projects.get(link.project_id)?.name ?? null, status: status.get(link.finding_id) ?? null })),
  }));
}

export function libraryHighlightRoutes() {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use('/documents/:id/highlights', requireUser);
  app.use('/documents/:id/highlights/*', requireUser);

  app.get('/documents/:id/highlights', async (c) => {
    const user = currentUser(c);
    const document = await ownDocument(user, c.req.param('id'));
    const list = rows<HighlightRow>(await highlightsRef(document.id).get())
      .sort((a, b) => a.page - b.page || new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map(publicHighlight);
    c.header('Cache-Control', 'private, no-store');
    return c.json({ highlights: await withLinkDetails(user, list) });
  });

  app.post('/documents/:id/highlights', async (c) => {
    const user = currentUser(c);
    const document = await ownDocument(user, c.req.param('id'));
    const input = await parseBody(c, CreateBody);
    const count = (await highlightsRef(document.id).count().get()).data().count;
    if (count >= MAX_HIGHLIGHTS) throw new HTTPException(422, { message: `A document holds up to ${MAX_HIGHLIGHTS.toLocaleString('en')} highlights. Delete some to add more.` });
    const now = new Date();
    const highlight: Omit<HighlightRow, 'id'> = {
      user_id: user.id, page: input.page, quote: input.quote, note: input.note, color: input.color, rects: input.rects,
      verified: await quoteOnPage(document.id, input.page, input.quote), created_at: now, updated_at: now, project_links: [], matrix_links: [],
    };
    const id = newId();
    await highlightsRef(document.id).doc(id).create(highlight);
    return c.json(publicHighlight({ id, ...highlight }), 201);
  });

  app.patch('/documents/:id/highlights/:hid', async (c) => {
    const user = currentUser(c);
    const document = await ownDocument(user, c.req.param('id'));
    const { ref, highlight } = await highlightFor(document.id, c.req.param('hid'));
    const input = await parseBody(c, PatchBody);
    const changes = { ...(input.note !== undefined ? { note: input.note } : {}), ...(input.color ? { color: input.color } : {}), updated_at: new Date() };
    await ref.update(changes);
    return c.json(publicHighlight({ ...highlight, ...changes }));
  });

  app.delete('/documents/:id/highlights/:hid', async (c) => {
    const user = currentUser(c);
    const document = await ownDocument(user, c.req.param('id'));
    const { ref } = await highlightFor(document.id, c.req.param('hid'));
    await ref.delete();
    return c.json({ deleted: true });
  });

  /** A reviewable finding in the project, from the Library document's project source (snapshotted on first use). */
  app.post('/documents/:id/highlights/:hid/project', async (c) => {
    const user = currentUser(c);
    const document = await ownDocument(user, c.req.param('id'));
    const { ref, highlight } = await highlightFor(document.id, c.req.param('hid'));
    const input = await parseBody(c, ProjectBody);
    const project = await getProjectFor(user, input.project_id, ['owner', 'edit']);
    const existing = await projectSourcesForLibrary(project.id, document.id);
    const source = existing.find((item) => item.basis === 'full_text') ?? existing[0] ?? await createProjectSource(user, project.id, {
      library_document_id: document.id, title: (document.title || document.filename || 'Untitled source').slice(0, 500),
      text: '', source_type: 'paper', edition: '', language: '',
    });
    const finding = await addProjectFinding(user, project.id, source.id, { finding: input.finding, quote: highlight.quote, page: highlight.page, interpretation: input.interpretation });
    const link: ProjectLink = { project_id: project.id, source_id: source.id, finding_id: finding.id };
    await appendLink(ref, 'project_links', link, (item) => item.finding_id === finding.id);
    return c.json({ source_id: source.id, finding_id: finding.id }, 201);
  });

  /** The highlight's note (or quote) in a matrix cell, with the quote and page as its evidence. */
  app.post('/documents/:id/highlights/:hid/matrix', async (c) => {
    const user = currentUser(c);
    const document = await ownDocument(user, c.req.param('id'));
    const { ref, highlight } = await highlightFor(document.id, c.req.param('hid'));
    const input = await parseBody(c, MatrixBody);
    let matrix: MatrixDoc = await matrixFor(user, input.matrix_id, true);
    if (!matrix.columns.some((column) => column.id === input.column_id)) throw new HTTPException(404, { message: 'That column is not in this matrix.' });
    if (!matrix.document_ids.includes(document.id)) {
      const added = await addMatrixSources(matrix, user.id, [document.id]);
      matrix = { ...matrix, document_ids: added.document_ids, document_owners: added.document_owners };
    }
    const value = (highlight.note?.trim() || highlight.quote).slice(0, 2000);
    await editCell(matrix, document.id, input.column_id, value, user.id, { quote: highlight.quote, page: highlight.page });
    const link: MatrixLink = { matrix_id: matrix.id, column_id: input.column_id };
    await appendLink(ref, 'matrix_links', link, (item) => item.matrix_id === link.matrix_id && item.column_id === link.column_id);
    return c.json({ matrix_id: matrix.id, column_id: input.column_id, document_id: document.id });
  });

  return app;
}
