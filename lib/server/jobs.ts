/**
 * Background work the old server ran inside its own process (timers, `void promise` after a
 * response). On Firebase it runs in Cloud Functions (functions/src/index.ts), which call these:
 *
 *   onLibraryPdfUploaded   Storage finalize on library/{uid}/{id}.pdf  → processPdf
 *   onImportJobCreated     Firestore create on library_import_jobs/{id} → runImportJob
 *   newsletterSync         every 15 minutes                             → syncNewsletter
 *   closeStuckImports      every hour                                   → closeInterruptedImports
 *   onUserDeleted          Auth user deleted                            → deleteUserData
 */
export { processPdf } from './lib/libraryFiles.js';
export { runImportJob, closeInterruptedImports } from './lib/libraryImport.js';
export { syncNewsletter, newsletterOn } from './lib/newsletter.js';
export { deleteUserData } from './lib/accountDeletion.js';
export { ready } from './ready.js';
