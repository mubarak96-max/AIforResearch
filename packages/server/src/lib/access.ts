import { HTTPException } from 'hono/http-exception';
import { C, col, row } from '../firebase.js';
import type { AuthUser } from '../auth.js';
import { readBlocks } from './documentStore.js';

export type Role = 'owner' | 'editor' | 'commenter' | 'viewer';
export const EDIT_ROLES: Role[] = ['owner', 'editor'];
export const COMMENT_ROLES: Role[] = ['owner', 'editor', 'commenter'];

/**
 * A document as code sees it. In Firestore the metadata lives in `documents/{id}`; `blocks`
 * (which can pass Firestore's 1 MiB document limit) and the Yjs state live in Storage
 * (lib/documentStore.ts). Loaders fill `blocks` only when asked to.
 */
export type DocumentRow = {
  id: string;
  owner_user_id: string;
  title: string;
  blocks: unknown[];
  comments: unknown[];
  share_settings: Record<string, any>;
  activity: unknown[];
  word_settings: Record<string, any> | null;
  word_count: number;
  member_ids?: string[];
  has_ydoc?: boolean;
  created_at: Date;
  updated_at: Date;
};

export async function loadDocument(documentId: string, options: { blocks?: boolean } = {}): Promise<DocumentRow | null> {
  if (!documentId || documentId.includes('/')) return null;
  const document = row<DocumentRow>(await col(C.documents).doc(documentId).get());
  if (!document) return null;
  document.comments ??= [];
  document.activity ??= [];
  document.share_settings ??= {};
  document.blocks = options.blocks === false ? [] : await readBlocks(documentId);
  return document;
}

/**
 * Who may open a document and how: the owner, an active member, or anyone with the
 * link when link sharing is on (signed-in people get the link's role, others may only view).
 */
export async function resolveAccess(documentId: string, user: AuthUser | null, options: { blocks?: boolean } = {}): Promise<{ document: DocumentRow; role: Role }> {
  const document = await loadDocument(documentId, options);
  if (!document) throw new HTTPException(404, { message: 'Document not found' });
  if (user && document.owner_user_id === user.id) return { document, role: 'owner' };
  if (user) {
    const members = col(C.documents).doc(documentId).collection(C.members);
    const [byId, byEmail] = await Promise.all([
      members.where('user_id', '==', user.id).where('status', '==', 'active').limit(1).get(),
      members.where('invite_email', '==', user.email.toLowerCase()).where('status', '==', 'active').limit(1).get(),
    ]);
    const member = (byId.docs[0] ?? byEmail.docs[0])?.data() as { role: Role } | undefined;
    if (member) return { document, role: member.role };
  }
  const share = document.share_settings || {};
  if (share.isLinkSharingEnabled) {
    const linkRole: Role = ['editor', 'commenter', 'viewer'].includes(share.defaultAccessRole) ? share.defaultAccessRole : 'viewer';
    return { document, role: user ? linkRole : 'viewer' };
  }
  throw new HTTPException(user ? 403 : 404, { message: user ? 'You do not have access to this document.' : 'Document not found' });
}

export function displayName(user: Pick<AuthUser, 'email' | 'full_name'>) {
  return user.full_name || user.email.split('@')[0] || 'User';
}
