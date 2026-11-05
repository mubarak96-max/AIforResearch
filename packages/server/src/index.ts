/**
 * @researchcove/server: the API, data layer and background work, shared by
 *   - apps/web        (Next.js route handlers mount `getApp()` at /api and /v1)
 *   - services/collab (live text and presence over WebSockets on Cloud Run)
 *   - functions       (Cloud Functions: Storage, Firestore and scheduled triggers)
 */
export { createApp, getApp } from './app.js';
export { ready } from './ready.js';
export { env } from './env.js';
export * as firebase from './firebase.js';
export { userFromToken, type AuthUser } from './auth.js';

// Used by services/collab (live text and presence).
export { resolveAccess, loadDocument, displayName, EDIT_ROLES, COMMENT_ROLES, type DocumentRow, type Role } from './lib/access.js';
export { documentToRead, membersOf } from './lib/documentPayload.js';
export { documentRef, membersRef, updateDocument } from './lib/documents.js';
export { readYdoc, writeYdoc } from './lib/documentStore.js';
export { maybeAutoVersion } from './lib/versions.js';
