import { USER_AGENT } from '../env.js';
import { randomUUID } from 'node:crypto';
import { C, col, db, increment, row, rows } from '../firebase.js';
import { checkLibraryRoom, HARD_UPLOAD_MB, PlanLimitError } from './plans.js';
import { createLibraryDocument, libraryDoc, storeFile, writeChunks } from './libraryFiles.js';
import { isPublicHttpsUrl, fetchPublic } from './safeUrl.js';
import { scholarPdf } from './scholar.js';
import { readFileBytes, saveFile, deleteFile } from './storage.js';
import { settings } from './settings.js';
import { isPagedPapersSlot, workToPaper, type RichPaper } from '../slots/papers.js';
import { createSlots } from '../slots/index.js';
import type { Slots } from '../slots/types.js';
import type { PastedId, ReferenceItem } from './referenceFiles.js';
import { mendeleyImport, zoteroImport } from './referenceManagers.js';
import type { AuthUser } from '../auth.js';

/**
 * Imports into the Library (Zotero, Mendeley, .bib/.ris files, pasted identifiers) run as a
 * job the browser polls. The API only writes the job: what to import (the "spec") goes to
 * Storage `imports/{jobId}.json`, then `library_import_jobs/{jobId}` is created, and the
 * Cloud Function `onImportJobCreated` calls runImportJob(jobId).
 *
 * Event functions stop after 9 minutes, so a long import works in turns: when a turn runs
 * out of time it saves how many entries it got through (`processed`) and raises `attempt`;
 * the function (an onDocumentWritten trigger) starts the next turn when `attempt` goes up.
 * Items already imported are skipped anyway (same DOI or same source id).
 *
 * Each item becomes a reference; its PDF is added when the source has one and the plan has
 * room (PDFs count towards the plan's Library size, references do not). Saving the PDF to
 * Storage starts its text extraction (the `onLibraryPdfUploaded` trigger).
 */

export type ImportSource = 'zotero' | 'mendeley' | 'bibtex' | 'ris' | 'ids';

export type ImportEntry = {
  title: string;
  authors: string[];
  year: string | null;
  doi: string | null;
  journal: string | null;
  url: string | null;
  abstract: string | null;
  /** "zotero:ABCD1234": importing the same item again is skipped. */
  externalId?: string | null;
  /** Extra details kept on the document (BibTeX, source keys, OpenAlex work id…). */
  metadata?: Record<string, unknown>;
  /** The PDF from the source itself (a Zotero or Mendeley attachment). */
  pdf?: (() => Promise<Uint8Array | null>) | null;
  /** Else: an OpenAlex work id for Scholar's stored copy, or an open-access link. */
  workId?: string | null;
  pdfUrl?: string | null;
};

/** What to import, in a form that can be saved and read back by the function. */
export type ImportSpec =
  | { kind: 'file'; source: 'bibtex' | 'ris'; items: ReferenceItem[] }
  | { kind: 'ids'; ids: PastedId[] }
  | { kind: 'zotero' | 'mendeley'; collection: string | null };

export type ImportJob = {
  id: string; source: ImportSource; label: string; status: 'running' | 'done' | 'failed';
  total: number; added: number; pdfs: number; skipped: number; failed: number; pdfs_over_limit: number;
  error: string | null; created_at: Date; finished_at: Date | null;
};

type JobDoc = ImportJob & {
  user_id: string; account_id: string; folder_id: string | null; find_pdfs: boolean; spec_key: string;
  processed: number; attempt: number; claimed_attempt: number | null; updated_at: Date;
};

const jobs = () => col(C.libraryImportJobs);
/** A turn stops taking new entries after this long (event functions are cut off at 9 minutes). */
const TURN_MS = 7 * 60_000;
/** A running job with no progress saved for this long was cut off. */
const STALE_MS = 60 * 60_000;

/** A user may run one import at a time. */
export async function isImporting(userId: string): Promise<boolean> {
  const running = rows<JobDoc>(await jobs().where('user_id', '==', userId).where('status', '==', 'running').limit(5).get());
  return running.some((job) => Date.now() - new Date(job.updated_at ?? job.created_at).getTime() < STALE_MS);
}

/** Saves the spec, then creates the job (which starts the import function). Returns the job id. */
export async function startImportJob(
  user: Pick<AuthUser, 'id' | 'account_id'>,
  source: ImportSource,
  label: string,
  spec: ImportSpec,
  options: { folderId: string | null; findPdfs: boolean; total?: number },
) {
  const ref = jobs().doc(randomUUID());
  const specKey = `imports/${ref.id}.json`;
  await saveFile(specKey, new TextEncoder().encode(JSON.stringify(spec)), 'application/json');
  const now = new Date();
  await ref.create({
    user_id: user.id, account_id: user.account_id, source, label: label.slice(0, 200), status: 'running',
    total: options.total ?? 0, added: 0, pdfs: 0, skipped: 0, failed: 0, pdfs_over_limit: 0, error: null,
    folder_id: options.folderId, find_pdfs: options.findPdfs, spec_key: specKey,
    processed: 0, attempt: 0, claimed_attempt: null, created_at: now, updated_at: now, finished_at: null,
  });
  return ref.id;
}

/** The job as the browser sees it (only the person's own). */
export async function importJob(userId: string, jobId: string): Promise<ImportJob | null> {
  if (!jobId || jobId.includes('/')) return null;
  const job = row<JobDoc>(await jobs().doc(jobId).get());
  if (!job || job.user_id !== userId) return null;
  return {
    id: job.id, source: job.source, label: job.label, status: job.status, total: job.total, added: job.added, pdfs: job.pdfs,
    skipped: job.skipped, failed: job.failed, pdfs_over_limit: job.pdfs_over_limit, error: job.error ?? null,
    created_at: job.created_at, finished_at: job.finished_at ?? null,
  };
}

// ------------------------------------------------------------------ turning a spec into entries

const shortId = (value: string) => value.replace(/^https?:\/\/openalex\.org\//i, '');

/** Public OpenAlex for identifiers the papers index does not resolve (PubMed ids, arXiv DOIs, very new DOIs). */
async function openAlexWork(id: string): Promise<RichPaper | null> {
  const mailto = settings().openalexEmail;
  const response = await fetch(`https://api.openalex.org/works/${id}${mailto ? `?mailto=${encodeURIComponent(mailto)}` : ''}`, {
    headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  const work: any = response?.ok ? await response.json().catch(() => null) : null;
  return work?.id ? workToPaper(work) : null;
}

export function paperEntry(paper: RichPaper, externalId: string | null): ImportEntry {
  return {
    title: paper.title,
    authors: paper.authors.map((author) => author.name),
    year: paper.year ? String(paper.year) : null,
    doi: paper.doi,
    journal: paper.venue,
    url: paper.doi ? `https://doi.org/${paper.doi}` : paper.oa_url,
    abstract: paper.abstract,
    externalId,
    metadata: { scholar_id: shortId(paper.id) },
    workId: shortId(paper.id),
    pdfUrl: paper.pdf_url,
  };
}

/** An item from a file as an import entry; with PDFs on, its DOI finds Scholar's copy. */
async function fromReference(slots: Slots, item: ReferenceItem, findPdfs: boolean): Promise<ImportEntry> {
  let workId: string | null = null;
  let pdfUrl: string | null = null;
  if (findPdfs && item.doi) {
    const paper = await slots.papers.lookupDoi(item.doi).catch(() => null) as RichPaper | null;
    if (paper) { workId = shortId(paper.id); pdfUrl = paper.pdf_url; }
  }
  return {
    ...item,
    externalId: null,
    metadata: { bibtex: item.bibtex, citation_key: item.key, ...(workId ? { scholar_id: workId } : {}) },
    workId, pdfUrl,
  };
}

async function lookupId(slots: Slots, id: PastedId): Promise<RichPaper | null> {
  const doi = id.kind === 'doi' ? id.value : id.kind === 'arxiv' ? `10.48550/arXiv.${id.value}` : null;
  const found = doi
    ? ((await slots.papers.lookupDoi(doi).catch(() => null)) as RichPaper | null)
    : isPagedPapersSlot(slots.papers) ? await slots.papers.lookupPmid(id.value).catch(() => null) : null;
  return found ?? openAlexWork(doi ? `doi:${doi}` : `pmid:${id.value}`);
}

/** The spec's entries from position `skip` on (null: an item that could not be read). */
async function* specEntries(spec: ImportSpec, userId: string, findPdfs: boolean, skip: number, slots: Slots): AsyncGenerator<ImportEntry | null> {
  if (spec.kind === 'file') {
    for (const item of spec.items.slice(skip)) yield fromReference(slots, item, findPdfs);
    return;
  }
  if (spec.kind === 'ids') {
    for (const id of spec.ids.slice(skip)) {
      const paper = await lookupId(slots, id);
      yield paper ? paperEntry(paper, null) : null;
    }
    return;
  }
  const source = spec.kind === 'zotero' ? await zoteroImport(userId, spec.collection) : await mendeleyImport(userId, spec.collection);
  let index = 0;
  for await (const entry of source.entries) {
    if (index++ < skip) continue;
    yield entry;
  }
}

// ------------------------------------------------------------------ running

const isPdf = (bytes: Uint8Array | null) => Boolean(bytes && bytes.byteLength > 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46);

async function findPdf(entry: ImportEntry): Promise<Uint8Array | null> {
  if (entry.pdf) {
    const bytes = await entry.pdf().catch(() => null);
    if (isPdf(bytes)) return bytes;
  }
  let link = entry.pdfUrl ?? null;
  if (entry.workId) {
    const stored = await scholarPdf(entry.workId).catch(() => null);
    if (stored && 'bytes' in stored) return new Uint8Array(stored.bytes);
    if (stored && 'url' in stored && !link) link = stored.url;
  }
  if (link && (await isPublicHttpsUrl(link))) {
    const response = await fetchPublic(link, { signal: AbortSignal.timeout(30_000), headers: { 'User-Agent': USER_AGENT } }).catch(() => null);
    const bytes = response?.ok ? new Uint8Array(await response.arrayBuffer()) : null;
    if (isPdf(bytes)) return bytes;
  }
  return null;
}

/** Without a DOI or a source id, the same title already in the Library counts as the same item. */
async function hasTitle(userId: string, title: string) {
  const exact = await col(C.libraryDocuments).where('user_id', '==', userId).where('title', '==', title.slice(0, 1000)).limit(1).select().get();
  return !exact.empty;
}

/** Adds one entry; says what happened to it. */
async function importEntry(job: JobDoc, entry: ImportEntry, state: { roomLeft: boolean }): Promise<{ added: boolean; pdf: boolean; overLimit: boolean }> {
  if (!entry.doi && !entry.externalId && (await hasTitle(job.user_id, entry.title))) return { added: false, pdf: false, overLimit: false };
  const id = await createLibraryDocument(job.user_id, {
    folder_id: job.folder_id, filename: entry.title.slice(0, 300), file_type: 'reference', title: entry.title.slice(0, 1000),
    authors: entry.authors.slice(0, 200), doi: entry.doi, publisher: entry.journal?.slice(0, 500) ?? null, publication_date: entry.year,
    abstract: entry.abstract?.slice(0, 20000) ?? null,
    metadata: { source: job.source, url: entry.url, journal: entry.journal, ...(entry.metadata || {}) },
    processing_status: 'completed', external_id: entry.externalId ?? null,
  });
  if (!id) return { added: false, pdf: false, overLimit: false };
  if (entry.abstract) {
    await writeChunks(job.user_id, id, [{ page: null, content: `${entry.title}\n\n${entry.abstract}`.slice(0, 20000) }]);
    await libraryDoc(id).update({ chunk_count: 1 });
  }
  const hasPdfSource = Boolean(entry.pdf || entry.workId || entry.pdfUrl);
  if (job.find_pdfs && state.roomLeft) {
    try {
      await checkLibraryRoom(job.account_id, job.user_id);
    } catch (error) {
      if (!(error instanceof PlanLimitError)) throw error;
      state.roomLeft = false;
    }
    if (state.roomLeft) {
      const bytes = await findPdf(entry);
      if (bytes && bytes.byteLength <= HARD_UPLOAD_MB * 1024 * 1024) {
        // Status before the file: saving it starts the extraction, which sets completed.
        await libraryDoc(id).update({ file_type: 'pdf', file_size: bytes.byteLength, processing_status: 'pending', updated_at: new Date() });
        const key = await storeFile(job.user_id, id, bytes);
        await libraryDoc(id).update({ file_path: key });
        return { added: true, pdf: true, overLimit: false };
      }
    }
  }
  return { added: true, pdf: false, overLimit: job.find_pdfs && !state.roomLeft && hasPdfSource };
}

/**
 * Runs one turn of an import job (the Cloud Function calls this on create and whenever
 * `attempt` goes up). Safe to call twice for the same turn: only the first claims it.
 */
export async function runImportJob(jobId: string, options: { turnMs?: number; slots?: Slots } = {}) {
  const ref = jobs().doc(jobId);
  const job = await db().runTransaction(async (tx) => {
    const current = row<JobDoc>(await tx.get(ref));
    if (!current || current.status !== 'running' || current.claimed_attempt === (current.attempt ?? 0)) return null;
    tx.update(ref, { claimed_attempt: current.attempt ?? 0, updated_at: new Date() });
    return current;
  });
  if (!job) return;

  const counts = {
    total: job.total ?? 0, added: job.added ?? 0, pdfs: job.pdfs ?? 0, skipped: job.skipped ?? 0, failed: job.failed ?? 0, pdfs_over_limit: job.pdfs_over_limit ?? 0,
  };
  let processed = job.processed ?? 0;
  const save = (extra: Record<string, unknown> = {}) => ref.update({
    ...counts, total: Math.max(counts.total, counts.added + counts.skipped + counts.failed), processed, updated_at: new Date(), ...extra,
  });
  const finish = async (extra: Record<string, unknown>) => {
    await save({ ...extra, finished_at: new Date() });
    await deleteFile(job.spec_key);
  };

  try {
    const specBytes = await readFileBytes(job.spec_key);
    if (!specBytes) throw new Error('The import details are missing. Import again.');
    const spec = JSON.parse(specBytes.toString('utf8')) as ImportSpec;
    const slots = options.slots ?? createSlots();
    const state = { roomLeft: true };
    const started = Date.now();
    const turnMs = options.turnMs ?? TURN_MS;
    let since = Date.now();
    for await (const entry of specEntries(spec, job.user_id, job.find_pdfs, processed, slots)) {
      processed += 1;
      // null: an item the source named but that could not be read (an unknown DOI, say).
      if (!entry) { counts.failed += 1; continue; }
      try {
        const result = await importEntry(job, entry, state);
        if (result.added) counts.added += 1;
        else counts.skipped += 1;
        if (result.pdf) counts.pdfs += 1;
        if (result.overLimit) counts.pdfs_over_limit += 1;
      } catch (error) {
        counts.failed += 1;
        console.error(`library import ${jobId}: ${(error as Error).message.slice(0, 200)}`);
      }
      if (Date.now() - started > turnMs) {
        // Out of time for this turn: the next one starts where this one stopped.
        await save({ attempt: increment(1) });
        return;
      }
      if (Date.now() - since > 1000) { await save(); since = Date.now(); }
    }
    await finish({ status: 'done' });
  } catch (error) {
    await finish({ status: 'failed', error: (error as Error).message.slice(0, 300) }).catch(() => undefined);
  }
}

/** Jobs that stopped saving progress (a crash or a cut-off turn) are marked as stopped; what was imported stays. */
export async function closeInterruptedImports() {
  const running = rows<JobDoc>(await jobs().where('status', '==', 'running').limit(500).get());
  const cutoff = Date.now() - STALE_MS;
  for (const job of running) {
    if (new Date(job.updated_at ?? job.created_at).getTime() > cutoff) continue;
    await jobs().doc(job.id).update({
      status: 'failed', finished_at: new Date(),
      error: 'The import stopped before it finished. Import again to finish: items already added are skipped.',
    });
    if (job.spec_key) await deleteFile(job.spec_key);
  }
}
