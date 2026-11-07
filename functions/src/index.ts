import { setGlobalOptions } from 'firebase-functions/v2';
import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as v1 from 'firebase-functions/v1';
import { closeInterruptedImports, deleteUserData, newsletterOn, processPdf, ready, runImportJob, syncNewsletter } from '../../lib/server/jobs.js';

/**
 * Background work that used to run inside the self-hosted server process. The code lives in
 * lib/server (jobs.ts); build.mjs bundles it into dist/index.js for deployment.
 * Settings (CONVERT_URL, SETTINGS_KEY, …) come from functions/.env and Secret Manager.
 */

setGlobalOptions({ region: process.env.FUNCTIONS_REGION || 'us-central1', maxInstances: 20 });

const LIBRARY_PDF = /^library\/([^/]+)\/([^/]+)\.pdf$/;

/** A Library PDF was saved: read its text into searchable chunks (via services/convert). */
// 540 s (the most for an event function): text extraction, then embeddings until processPdf's deadline.
export const onLibraryPdfUploaded = onObjectFinalized({ timeoutSeconds: 540, memory: '1GiB' }, async (event) => {
  const match = LIBRARY_PDF.exec(event.data.name || '');
  if (!match) return;
  await ready();
  await processPdf(match[2], event.data.name);
});

/**
 * Import jobs run in turns: a new job, and each time a turn runs out of time and raises
 * `attempt`, starts the next turn here (so an import can outlast any one function call).
 */
export const onImportJobWritten = onDocumentWritten({ document: 'library_import_jobs/{id}', timeoutSeconds: 540, memory: '1GiB' }, async (event) => {
  const after = event.data?.after;
  if (!after?.exists) return;
  const next = after.data() as { status?: string; attempt?: number };
  const previous = event.data?.before?.exists ? (event.data.before.data() as { attempt?: number }) : null;
  if (next.status !== 'running') return;
  if (previous && (previous.attempt ?? 0) === (next.attempt ?? 0)) return;
  await ready();
  await runImportJob(event.params.id);
});

/** Keeps the MailCheap newsletter list in step with accounts (when the newsletter is set up). */
export const newsletterSync = onSchedule({ schedule: 'every 15 minutes', timeoutSeconds: 540 }, async () => {
  await ready();
  if (newsletterOn()) await syncNewsletter();
});

/** Marks imports that stopped saving progress as stopped. */
export const closeStuckImports = onSchedule({ schedule: 'every 60 minutes' }, async () => {
  await ready();
  await closeInterruptedImports();
});

/** A Firebase Auth user was deleted (from the app or the console): remove their data. */
export const onUserDeleted = v1.auth.user().onDelete(async (user) => {
  await ready();
  await deleteUserData(user.uid);
});
