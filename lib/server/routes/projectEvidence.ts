/** Project-owned, immutable source snapshots and reviewable findings. Personal libraries stay personal. */
import { createHash } from 'node:crypto';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { requireUser, type AppVariables, type AuthUser } from '../auth.js';
import { C, col, db, newId, row, rows } from '../firebase.js';
import { currentUser, parseBody } from '../lib/assist-llm.js';
import { getProjectFor } from '../lib/projects.js';
import { ownLibraryDocument, libraryDoc } from '../lib/libraryFiles.js';
import { openFile, readFileBytes, saveFile } from '../lib/storage.js';

type Source = { id: string; title: string; doi: string | null; url: string | null; authors: string[]; library_document_id: string | null; file_path: string | null; snapshot_ref: string; sha256: string; basis: 'full_text' | 'abstract' | 'supplied_text'; source_type: string; edition: string; language: string; created_by: string; created_at: Date };
const sources = (project: string) => col(C.projects).doc(project).collection('evidence');
const clean = (value: string) => value.normalize('NFKC').replace(/\s+/gu, ' ').trim();
/** Letters and digits only, for text selected in a PDF viewer: ligatures, soft hyphens, line-end hyphenation and spacing differ. */
export const looseEvidenceText = (value: string) =>
  value.normalize('NFKC').toLowerCase().replace(/\u{ad}/gu, '').replace(/(\p{L})[-\u{2010}\u{2011}]\s+(?=\p{L})/gu, '$1').replace(/[^\p{L}\p{N}]+/gu, '');
export function verifyEvidenceQuote(pages: { page: number; text: string }[], quote: string, page: number | null) {
  const normal = clean(quote);
  if (!normal) return false;
  const candidates = pages.filter((item) => page === null || item.page === page);
  if (candidates.some((item) => clean(item.text).includes(normal))) return true;
  // A few letters occur almost anywhere; the looser match needs a real passage.
  const loose = looseEvidenceText(quote);
  return loose.length >= 8 && candidates.some((item) => looseEvidenceText(item.text).includes(loose));
}
export const Input = z.object({ library_document_id: z.string().uuid().optional(), title: z.string().trim().min(1).max(500), text: z.string().max(1_500_000).default(''), url: z.string().url().max(2000).optional(), source_type: z.enum(['paper', 'book', 'archive', 'report', 'dataset', 'filing', 'guideline', 'other']).default('paper'), edition: z.string().max(150).default(''), language: z.string().max(80).default('') });
export const FindingInput = z.object({ finding: z.string().trim().min(1).max(4000), quote: z.string().trim().min(1).max(8000), page: z.number().int().min(1).nullable().default(null), interpretation: z.boolean().default(false) });
const sourceFor = async (project: string, id: string) => {
  if (!id || id.includes('/')) throw new HTTPException(404, { message: 'Source not found.' });
  const source = row<Source>(await sources(project).doc(id).get());
  if (!source) throw new HTTPException(404, { message: 'Source not found.' });
  return source;
};
async function snapshotFor(project: string, source: Source): Promise<{ pages: { page: number; text: string }[] }> {
  if (!source.snapshot_ref.startsWith(`project-evidence/${project}/${source.id}/`)) throw new HTTPException(503, { message: 'Source snapshot is unavailable.' });
  const bytes = await readFileBytes(source.snapshot_ref);
  if (!bytes || createHash('sha256').update(bytes).digest('hex') !== source.sha256) throw new HTTPException(503, { message: 'The source snapshot could not be verified.' });
  return JSON.parse(bytes.toString('utf8'));
}
const publicSource = ({ file_path: file, snapshot_ref: _ref, created_by: _by, ...source }: Source) => ({ ...source, has_file: Boolean(file) });

/**
 * Snapshots a source into the project (the caller checked the owner/edit role): the Library
 * document's page text, else its abstract, else the supplied text, plus a copy of its PDF.
 */
export async function createProjectSource(user: AuthUser, projectId: string, input: z.output<typeof Input>) {
  const id = newId();
  const library = input.library_document_id ? await ownLibraryDocument(user.id, input.library_document_id) : null;
  if (input.library_document_id && !library) throw new HTTPException(404, { message: 'Source not found in your Library.' });
  let pages: { page: number; text: string }[] = [];
  if (library) {
    const chunks = await libraryDoc(library.id).collection(C.chunks).orderBy('chunk_index').get();
    const pageMap = new Map<number, string[]>();
    for (const chunk of chunks.docs) {
      const data = chunk.data();
      const page = Number(data.page_number ?? data.page ?? 1);
      pageMap.set(page, [...(pageMap.get(page) ?? []), String(data.content ?? '')]);
    }
    pages = [...pageMap].sort(([a], [b]) => a - b).map(([page, text]) => ({ page, text: text.join('\n\n') }));
  }
  const full = pages.some((page) => page.text.trim());
  if (!full) pages = [{ page: 1, text: library?.abstract || input.text }];
  if (!pages.some((page) => page.text.trim())) throw new HTTPException(422, { message: 'Add source text or wait for the Library PDF to finish processing.' });
  const bytes = new TextEncoder().encode(JSON.stringify({ pages }));
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const key = `project-evidence/${projectId}/${id}/${sha256}.json`;
  await saveFile(key, bytes, 'application/json');
  // Sharing copies the file too: replacing/deleting a personal Library PDF cannot change a project source.
  let sharedFile: string | null = null;
  if (library?.file_path) {
    const original = await readFileBytes(library.file_path);
    if (original) { sharedFile = `project-evidence/${projectId}/${id}/original.pdf`; await saveFile(sharedFile, original, 'application/pdf'); }
  }
  const source: Omit<Source, 'id'> = { title: input.title, doi: library?.doi ?? null, url: input.url ?? null, authors: library?.authors ?? [], library_document_id: library?.id ?? null, file_path: sharedFile, snapshot_ref: key, sha256, basis: full ? 'full_text' : library ? 'abstract' : 'supplied_text', source_type: input.source_type, edition: input.edition, language: input.language, created_by: user.id, created_at: new Date() };
  await sources(projectId).doc(id).create(source);
  return publicSource({ id, ...source });
}

/** Project sources snapshotted from this Library document. */
export async function projectSourcesForLibrary(projectId: string, libraryDocumentId: string) {
  return rows<Source>(await sources(projectId).where('library_document_id', '==', libraryDocumentId).get()).map(publicSource);
}

/** Records a finding for review (the caller checked the owner/edit role); its quote must be in the snapshot. */
export async function addProjectFinding(user: AuthUser, projectId: string, sourceId: string, input: z.output<typeof FindingInput>) {
  const source = await sourceFor(projectId, sourceId);
  const snapshot = await snapshotFor(projectId, source);
  if (!verifyEvidenceQuote(snapshot.pages, input.quote, input.page)) throw new HTTPException(422, { message: 'The quotation must match the source text on the selected page.' });
  const id = newId();
  const finding = { ...input, source_sha256: source.sha256, status: 'needs_review', created_by: user.id, created_at: new Date() };
  await sources(projectId).doc(source.id).collection('findings').doc(id).create(finding);
  return { id, ...finding };
}

/** Portable evidence and the full decision history; private storage keys never leave the API. */
export async function projectEvidenceBundle(projectId: string) {
  const bundle = [];
  for (const source of rows<Source>(await sources(projectId).get())) {
    const findings = [];
    for (const finding of rows(await sources(projectId).doc(source.id).collection('findings').get())) {
      findings.push({ ...finding, reviews: rows(await sources(projectId).doc(source.id).collection('findings').doc(finding.id).collection('reviews').get()) });
    }
    bundle.push({ ...publicSource(source), ...await snapshotFor(projectId, source), findings });
  }
  return bundle;
}

export function projectEvidenceRoutes() {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use('/projects/:project/evidence', requireUser);
  app.use('/projects/:project/evidence/*', requireUser);
  app.get('/projects/:project/evidence', async (c) => {
    const project = await getProjectFor(currentUser(c), c.req.param('project'));
    return c.json({ sources: rows<Source>(await sources(project.id).get()).map(publicSource) });
  });
  app.post('/projects/:project/evidence', async (c) => {
    const user = currentUser(c);
    const project = await getProjectFor(user, c.req.param('project'), ['owner', 'edit']);
    return c.json(await createProjectSource(user, project.id, await parseBody(c, Input)), 201);
  });
  app.get('/projects/:project/evidence/:id', async (c) => {
    const project = await getProjectFor(currentUser(c), c.req.param('project'));
    const source = await sourceFor(project.id, c.req.param('id'));
    const findings = rows(await sources(project.id).doc(source.id).collection('findings').get());
    for (const finding of findings) finding.reviews = rows(await sources(project.id).doc(source.id).collection('findings').doc(finding.id).collection('reviews').get());
    return c.json({ ...publicSource(source), ...await snapshotFor(project.id, source), findings });
  });
  app.get('/projects/:project/evidence/:id/file', async (c) => {
    const project = await getProjectFor(currentUser(c), c.req.param('project'));
    const source = await sourceFor(project.id, c.req.param('id'));
    const file = source.file_path ? await openFile(source.file_path) : null;
    if (!file) throw new HTTPException(404, { message: 'The original PDF is no longer available. The shared text snapshot is retained.' });
    c.header('Content-Type', 'application/pdf'); c.header('Cache-Control', 'private, no-store');
    return c.body(file.body);
  });
  app.post('/projects/:project/evidence/:id/findings', async (c) => {
    const user = currentUser(c);
    const project = await getProjectFor(user, c.req.param('project'), ['owner', 'edit']);
    const input = await parseBody(c, FindingInput);
    return c.json(await addProjectFinding(user, project.id, c.req.param('id'), input), 201);
  });
  app.post('/projects/:project/evidence/:id/findings/:finding/reviews', async (c) => {
    const user = currentUser(c);
    // "Can comment" is the project's supervisor role (projects/[id] page), so commenters may approve
    // or request revisions on purpose. Viewers cannot review; nobody can approve their own finding.
    const project = await getProjectFor(user, c.req.param('project'), ['owner', 'edit', 'comment']);
    const source = await sourceFor(project.id, c.req.param('id'));
    const input = await parseBody(c, z.object({ decision: z.enum(['approved', 'needs_revision', 'comment']), note: z.string().trim().min(1).max(4000) }));
    const findingId = c.req.param('finding');
    if (!/^[\w-]+$/.test(findingId)) throw new HTTPException(404);
    const findingRef = sources(project.id).doc(source.id).collection('findings').doc(findingId);
    const eventId = newId();
    await db().runTransaction(async (tx) => {
      const finding = await tx.get(findingRef);
      if (!finding.exists) throw new HTTPException(404, { message: 'Finding not found.' });
      if (input.decision === 'approved' && finding.get('created_by') === user.id) throw new HTTPException(409, { message: 'Ask another project reviewer to approve your finding.' });
      tx.create(findingRef.collection('reviews').doc(eventId), { ...input, reviewer_id: user.id, reviewer_name: user.full_name || user.email, source_sha256: source.sha256, created_at: new Date() });
      if (input.decision !== 'comment') tx.update(findingRef, { status: input.decision, reviewed_at: new Date(), reviewed_by: user.full_name || user.email });
    });
    return c.json({ id: eventId });
  });
  app.get('/projects/:project/evidence/:id/findings/:finding/reviews', async (c) => {
    const project = await getProjectFor(currentUser(c), c.req.param('project'));
    const source = await sourceFor(project.id, c.req.param('id'));
    const id = c.req.param('finding');
    if (!/^[\w-]+$/.test(id)) throw new HTTPException(404);
    return c.json({ reviews: rows(await sources(project.id).doc(source.id).collection('findings').doc(id).collection('reviews').get()) });
  });
  return app;
}
