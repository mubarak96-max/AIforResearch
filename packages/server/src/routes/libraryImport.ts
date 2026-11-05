import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { C, col } from '../firebase.js';
import { requireUser, type AppVariables } from '../auth.js';
import type { Slots } from '../slots/types.js';
import { libraryLimits } from '../lib/plans.js';
import { parseBibtex, parseIds, parseRis } from '../lib/referenceFiles.js';
import { importJob, isImporting, startImportJob } from '../lib/libraryImport.js';

/** Most items one file or paste may bring in (larger libraries: Zotero or Mendeley sync). */
const MAX_ITEMS = 2000;
const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** Folder ids come from the browser: only the person's own folders are used. */
export async function ownFolder(userId: string, folderId: unknown) {
  if (typeof folderId !== 'string' || !folderId || folderId.includes('/')) return null;
  const folder = await col(C.libraryFolders).doc(folderId).get();
  if (!folder.exists || folder.get('user_id') !== userId) throw new HTTPException(404, { message: 'That collection was not found.' });
  return folderId;
}

export function libraryImportRoutes(_slots: Slots) {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use('*', requireUser);

  /** What the add dialog may do on this plan. */
  app.get('/limits', async (c) => {
    const user = c.get('user')!;
    return c.json(await libraryLimits(user.account_id, user.id));
  });

  app.get('/import/jobs/:id', async (c) => {
    const job = await importJob(c.get('user')!.id, c.req.param('id'));
    if (!job) throw new HTTPException(404, { message: 'Import not found.' });
    return c.json(job);
  });

  const busy = async (userId: string) => {
    if (await isImporting(userId)) throw new HTTPException(409, { message: 'An import is already running. It will finish in a moment.' });
  };

  /** A .bib or .ris file: every entry becomes a reference (and a PDF when one is found). */
  app.post('/import/file', async (c) => {
    const user = c.get('user')!;
    await busy(user.id);
    const form = await c.req.formData().catch(() => null);
    const file = form?.get('file');
    if (!(file instanceof File)) throw new HTTPException(422, { message: 'Choose a .bib or .ris file.' });
    if (file.size > MAX_FILE_BYTES) throw new HTTPException(413, { message: 'Reference files can be up to 10 MB.' });
    const text = await file.text();
    const looksRis = /\.ris$/i.test(file.name) || /^TY {2}- /m.test(text);
    const items = (looksRis ? parseRis(text) : parseBibtex(text)).slice(0, MAX_ITEMS);
    if (!items.length) throw new HTTPException(422, { message: `No references found in ${file.name}. Use a BibTeX (.bib) or RIS (.ris) file.` });
    const folderId = await ownFolder(user.id, form?.get('folder_id'));
    const findPdfs = form?.get('find_pdfs') !== 'false';
    const source = looksRis ? 'ris' : 'bibtex';
    const jobId = await startImportJob(user, source, file.name, { kind: 'file', source, items }, { folderId, findPdfs, total: items.length });
    return c.json({ job_id: jobId, total: items.length }, 202);
  });

  /** Pasted DOIs, PubMed ids and arXiv ids, looked up in the papers index. */
  app.post('/import/ids', async (c) => {
    const user = c.get('user')!;
    await busy(user.id);
    const body = z.object({ text: z.string().max(200_000), folder_id: z.string().nullable().optional(), find_pdfs: z.boolean().default(true) })
      .safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) throw new HTTPException(422, { message: 'Paste DOIs, PubMed ids or arXiv ids.' });
    const ids = parseIds(body.data.text).slice(0, 500);
    if (!ids.length) throw new HTTPException(422, { message: 'No DOI, PubMed id or arXiv id found. Paste one per line, like 10.1038/nrn2762.' });
    const folderId = await ownFolder(user.id, body.data.folder_id);
    const jobId = await startImportJob(user, 'ids', `${ids.length} identifier${ids.length === 1 ? '' : 's'}`, { kind: 'ids', ids },
      { folderId, findPdfs: body.data.find_pdfs, total: ids.length });
    return c.json({ job_id: jobId, total: ids.length }, 202);
  });

  return app;
}
