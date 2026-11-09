import { rows } from '../firebase.js';
import { EDIT_ROLES, type DocumentRow, type Role } from './access.js';
import { membersRef } from './documents.js';

/** The document as the browser receives it (the shape components/editor expects). */
export type MemberRow = {
  id: string;
  invite_email: string;
  display_name: string | null;
  role: Role;
  status: string;
  invite_sent: boolean;
  created_at: Date;
};

/**
 * Milliseconds from whatever a stored time turned out to be: a Date, an ISO string, a number,
 * a Firestore Timestamp (any copy of the class — its valueOf() is a sort key, not a time),
 * or a plain `{ seconds, nanoseconds }` map. Falls back to `fallback` when it can't be read.
 */
function toMillis(value: unknown, fallback = Date.now()): number {
  if (value == null || value === '') return fallback;
  let result: number;
  if (value instanceof Date) result = value.getTime();
  else if (typeof value === 'number') result = value;
  else if (typeof value === 'string') result = Date.parse(value);
  else if (typeof value === 'object' && typeof (value as any).toMillis === 'function') result = (value as any).toMillis();
  else if (typeof value === 'object' && typeof (value as any).toDate === 'function') result = (value as any).toDate().getTime();
  else if (typeof value === 'object') {
    const seconds = (value as any).seconds ?? (value as any)._seconds;
    const nanos = (value as any).nanoseconds ?? (value as any)._nanoseconds ?? 0;
    result = typeof seconds === 'number' ? seconds * 1000 + Math.floor(nanos / 1e6) : NaN;
  } else result = NaN;
  return Number.isFinite(result) ? result : fallback;
}

const ms = (value: unknown) => toMillis(value);
const iso = (value: unknown, fallback?: number) => new Date(toMillis(value, fallback)).toISOString();

export function memberToDict(member: MemberRow) {
  return {
    id: String(member.id),
    displayName: member.display_name || member.invite_email,
    email: member.invite_email,
    role: member.role,
    addedAt: ms(member.created_at),
    status: member.status,
    inviteSent: member.invite_sent,
  };
}

/** Word settings for the browser; where the source Word file is kept stays on the server. */
export function publicWordSettings(settings: Record<string, any> | null) {
  if (!settings) return null;
  const { source, ...visible } = settings;
  return source ? { ...visible, source: { fileName: source.fileName, importedAt: source.importedAt } } : visible;
}

export function documentToRead(document: DocumentRow, members: MemberRow[], role: Role) {
  return {
    id: document.id,
    title: document.title,
    blocks: document.blocks || [],
    comments: document.comments || [],
    ownerUserId: document.owner_user_id,
    shareSettings: document.share_settings || {},
    activity: document.activity || [],
    members: members.map(memberToDict),
    currentUserRole: role,
    wordSettings: publicWordSettings(document.word_settings),
    canEdit: EDIT_ROLES.includes(role),
    canManageMembers: role === 'owner',
    // Older or hand-migrated documents may lack created_at; use updated_at rather than failing the request.
    createdAt: iso(document.created_at, toMillis(document.updated_at)),
    updatedAt: iso(document.updated_at),
  };
}

export async function membersOf(documentId: string): Promise<MemberRow[]> {
  return rows<MemberRow>(await membersRef(documentId).orderBy('created_at').get());
}

