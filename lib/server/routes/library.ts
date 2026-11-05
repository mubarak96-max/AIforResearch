import { USER_AGENT } from '../env.js';
import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { C, col, rows } from '../firebase.js';
import { requireUser, type AppVariables } from '../auth.js';
import type { Slots } from '../slots/types.js';
import { isPublicHttpsUrl, fetchPublic } from '../lib/safeUrl.js';
import { checkLibraryRoom, checkUploadSize, HARD_UPLOAD_MB } from '../lib/plans.js';
import { keyFromRef, openFile } from '../lib/storage.js';
import {
  createLibraryDocument, deleteLibraryDocument, documentWithDoi, libraryDoc, normalizeDoi, ownLibraryDocument, storeFile, writeChunks,
  type LibraryRow,
} from '../lib/libraryFiles.js';
import { scholarAccess, scholarPdf } from '../lib/scholar.js';
import { ownFolder } from './libraryImport.js';

/**
 * The Library: `library_documents` and `library_folders` in Firestore, PDFs in Storage. An
 * upload only saves the file; the `onLibraryPdfUploaded` Storage trigger reads it into chunks.
 */

function toResponse(row: LibraryRow) {
  return {
    id: row.id,
    user_id: row.user_id,
    group_library_id: null,
    filename: row.filename,
    file_type: row.file_type,
    file_size: row.file_size ?? undefined,
    title: row.title ?? undefined,
    authors: row.authors || [],
    doi: row.doi ?? undefined,
    publisher: row.publisher ?? undefined,
    publication_date: row.publication_date ?? undefined,
    abstract: row.abstract ?? undefined,
    metadata: row.metadata || {},
    folder_id: row.folder_id ?? undefined,
    processing_status: row.processing_status,
    processing_error: row.processing_error ?? undefined,
    chunk_count: row.chunk_count,
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
    processed_at: row.processed_at ? new Date(row.processed_at).toISOString() : undefined,
  };
}

const importBody = z.object({
  url: z.string().max(2000).optional(), pdf_url: z.string().max(2000).optional(), title: z.string().max(1000).optional(),
  authors: z.array(z.string().max(300)).max(200).optional(), doi: z.string().max(300).optional(), year: z.number().int().optional(),
  source: z.string().max(40).optional(), abstract: z.string().max(20000).optional(), scholar_id: z.string().max(200).optional(),
  folder_id: z.string().uuid().optional(),
});

const isPdfBytes = (bytes: Uint8Array) => bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;

export function libraryRoutes(_slots: Slots) {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use('*', requireUser);

  app.get('/documents', async (c) => {
    const user = c.get('user')!;
    const page = Math.max(1, Number(c.req.query('page') || 1));
    const pageSize = Math.min(200, Math.max(1, Number(c.req.query('page_size') || 100)));
    const folderId = c.req.query('folder_id') || null;
    const search = (c.req.query('search') || '').trim();
    // Firestore filters what it can (indexes in firestore.indexes.json); the substring search
    // over title, file name and DOI runs over the person's documents in memory.
    let query: FirebaseFirestore.Query = col(C.libraryDocuments).where('user_id', '==', user.id);
    if (folderId) query = query.where('folder_id', '==', folderId);
    else if (c.req.query('unfiled_only') === 'true') query = query.where('folder_id', '==', null);
    if (c.req.query('status')) query = query.where('processing_status', '==', c.req.query('status')!);
    query = query.orderBy('created_at', 'desc');
    let total: number;
    let found: LibraryRow[];
    if (search) {
      const needle = search.toLowerCase();
      const all = rows<LibraryRow>(await query.limit(10_000).get())
        .filter((row) => [row.title, row.filename, row.doi].some((value) => (value || '').toLowerCase().includes(needle)));
      total = all.length;
      found = all.slice((page - 1) * pageSize, page * pageSize);
    } else {
      const [count, snapshot] = await Promise.all([query.count().get(), query.offset((page - 1) * pageSize).limit(pageSize).get()]);
      total = count.data().count;
      found = rows<LibraryRow>(snapshot);
    }
    return c.json({ documents: found.map(toResponse), total, page, page_size: pageSize, has_more: page * pageSize < total });
  });

  app.get('/documents/:id', async (c) => {
    const row = await ownLibraryDocument(c.get('user')!.id, c.req.param('id'));
    if (!row) throw new HTTPException(404, { message: 'Not found in your Library' });
    return c.json(toResponse(row));
  });

  app.get('/documents/:id/file', async (c) => {
    const row = await ownLibraryDocument(c.get('user')!.id, c.req.param('id'));
    const key = keyFromRef(row?.file_path);
    if (!key) throw new HTTPException(404, { message: 'This source has no PDF yet.' });
    const file = await openFile(key);
    if (!file) throw new HTTPException(404, { message: 'The PDF file is missing.' });
    c.header('Content-Type', 'application/pdf');
    if (file.size !== null) c.header('Content-Length', String(file.size));
    c.header('Content-Disposition', `inline; filename="${(row!.filename || 'document.pdf').replace(/[^\x20-\x7e]|"/g, '')}"`);
    c.header('Cache-Control', 'private, max-age=300');
    return c.body(file.body);
  });

  app.delete('/documents/:id', async (c) => {
    const row = await ownLibraryDocument(c.get('user')!.id, c.req.param('id'));
    if (row) await deleteLibraryDocument(row);
    return c.json({ success: Boolean(row) });
  });

  app.post('/documents/upload', async (c) => {
    const user = c.get('user')!;
    const form = await c.req.formData().catch(() => null);
    const file = form?.get('file');
    if (!(file instanceof File)) throw new HTTPException(422, { message: 'Choose a PDF to upload.' });
    await checkUploadSize(user.account_id, file.size);
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!isPdfBytes(bytes)) throw new HTTPException(415, { message: 'Only PDF files can be added for now.' });
    await checkLibraryRoom(user.account_id, user.id);
    const folderId = await ownFolder(user.id, form?.get('folder_id'));
    const title = typeof form?.get('title') === 'string' && form?.get('title') ? String(form.get('title')) : file.name.replace(/\.pdf$/i, '');
    const filename = file.name.slice(0, 300);
    const id = (await createLibraryDocument(user.id, {
      folder_id: folderId, filename, file_type: 'pdf', file_size: file.size, title: title.slice(0, 1000), processing_status: 'pending',
    }))!; // no DOI or source id yet, so never a duplicate
    // Saving the file starts the text extraction (the onLibraryPdfUploaded Storage trigger).
    const fileKey = await storeFile(user.id, id, bytes).catch(async (error) => {
      await libraryDoc(id).delete();
      console.error(`library upload: ${(error as Error).message}`);
      throw new HTTPException(503, { message: 'The file could not be saved right now. Try again in a minute.' });
    });
    await libraryDoc(id).update({ file_path: fileKey });
    return c.json({ id, filename, file_type: 'pdf', file_size: file.size, processing_status: 'pending', message: 'Added to your Library. Reading the PDF now.' });
  });

  /** Saves a paper (from Find papers or a citation card) with its PDF when Scholar or an open-access link has one. */
  app.post('/papers/import', async (c) => {
    const user = c.get('user')!;
    const parsed = importBody.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw new HTTPException(422, { message: 'This paper could not be read.' });
    const paper = parsed.data;
    const doi = paper.doi?.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').trim() || null;
    const already = (documentId: string | null) =>
      c.json({ success: true, document_id: documentId, message: 'Already in your Library', processing_status: 'completed' });
    if (doi) {
      const existing = await documentWithDoi(user.id, doi);
      if (existing) return already(existing);
    }
    // The PDF: Scholar's stored copy when it has one (by OpenAlex work id), else the open-access link.
    const workId = /^W\d+$/i.test(paper.scholar_id ?? '') ? paper.scholar_id! : null;
    const openLink = paper.pdf_url && (await isPublicHttpsUrl(paper.pdf_url)) ? paper.pdf_url : null;
    const tryPdf = Boolean(openLink || (workId && scholarAccess()));
    if (tryPdf) await checkLibraryRoom(user.account_id, user.id);
    const folderId = await ownFolder(user.id, paper.folder_id ?? null);
    const id = await createLibraryDocument(user.id, {
      folder_id: folderId, filename: (paper.title || 'Untitled paper').slice(0, 300), file_type: tryPdf ? 'pdf' : 'reference',
      title: paper.title ?? null, authors: paper.authors ?? [], doi, publication_date: paper.year ? String(paper.year) : null,
      abstract: paper.abstract ?? null,
      metadata: { source: paper.source ?? 'search', url: paper.url ?? null, scholar_id: paper.scholar_id ?? null, pdf_url: paper.pdf_url ?? null },
      processing_status: tryPdf ? 'pending' : 'completed',
    });
    // Saved at the same moment by another request.
    if (!id) return already(await documentWithDoi(user.id, normalizeDoi(doi)));
    let status = tryPdf ? 'pending' : 'completed';
    if (paper.abstract) {
      await writeChunks(user.id, id, [{ page: null, content: `${paper.title ?? ''}\n\n${paper.abstract}` }]);
      await libraryDoc(id).update({ chunk_count: 1 });
    }
    if (tryPdf) {
      // Fetched within the request: work left running after a response is not reliable on App
      // Hosting (Cloud Run). Saving the file starts the extraction (Storage trigger).
      try {
        let bytes: Uint8Array | null = null;
        let link = openLink;
        if (workId) {
          const stored = await scholarPdf(workId).catch(() => null);
          if (stored && 'bytes' in stored) bytes = new Uint8Array(stored.bytes);
          else if (stored && 'url' in stored && !link && (await isPublicHttpsUrl(stored.url))) link = stored.url;
        }
        if (!bytes && link) {
          const response = await fetchPublic(link, { signal: AbortSignal.timeout(25_000), headers: { 'User-Agent': USER_AGENT } });
          bytes = response.ok ? new Uint8Array(await response.arrayBuffer()) : null;
        }
        if (!bytes || bytes.byteLength > HARD_UPLOAD_MB * 1024 * 1024 || !(bytes[0] === 0x25 && bytes[1] === 0x50)) throw new Error('No PDF available');
        await libraryDoc(id).update({ file_size: bytes.byteLength });
        const fileKey = await storeFile(user.id, id, bytes);
        await libraryDoc(id).update({ file_path: fileKey });
      } catch {
        await libraryDoc(id).update({ processing_status: 'completed', file_type: 'reference' });
        status = 'completed';
      }
    }
    return c.json({ success: true, document_id: id, message: 'Saved to your Library', processing_status: status });
  });

  app.get('/folders', async (c) => {
    const userId = c.get('user')!.id;
    const folders = rows<{ id: string; name: string; parent_id: string | null; source: string; created_at: Date }>(
      await col(C.libraryFolders).where('user_id', '==', userId).get());
    const counts = await Promise.all(folders.map((folder) =>
      col(C.libraryDocuments).where('user_id', '==', userId).where('folder_id', '==', folder.id).count().get().then((result) => result.data().count)));
    return c.json(folders
      .map((folder, index) => ({
        id: folder.id, name: folder.name, parent_id: folder.parent_id ?? null, source: folder.source ?? 'local',
        created_at: new Date(folder.created_at).toISOString(), document_count: counts[index], group_library_id: null,
      }))
      .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)));
  });

  app.post('/folders', async (c) => {
    const userId = c.get('user')!.id;
    const parsed = z.object({ name: z.string().trim().min(1).max(120), parent_id: z.string().uuid().nullable().optional() }).safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw new HTTPException(422, { message: 'Give the folder a name.' });
    const parentId = await ownFolder(userId, parsed.data.parent_id ?? null);
    const ref = col(C.libraryFolders).doc(randomUUID());
    const created = { user_id: userId, name: parsed.data.name, parent_id: parentId, source: 'local', created_at: new Date() };
    await ref.create(created);
    return c.json({ id: ref.id, name: created.name, parent_id: created.parent_id, source: created.source, created_at: created.created_at, document_count: 0, group_library_id: null }, 201);
  });

  return app;
}
