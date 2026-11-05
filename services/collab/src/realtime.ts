import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocketServer, WebSocket } from 'ws';
import {
  userFromToken, resolveAccess, loadDocument, displayName, EDIT_ROLES, COMMENT_ROLES,
  documentToRead, membersOf, documentRef, membersRef, updateDocument, maybeAutoVersion,
  type AuthUser, type DocumentRow, type Role,
} from '../../../lib/server/index.js';
import { mergeStaleComments } from './merge.js';

export { mergeStaleComments };

/**
 * Presence and document-metadata channel (/api/ai-editor/documents/:id/ws), the protocol the
 * editor speaks: join / presence:heartbeat / cursor:update / document:update in;
 * sync:init / sync:document / sync:presence / error / pong out. Document text itself syncs over
 * Hocuspocus (collab.ts).
 *
 * The HTTP API runs in another process (Next.js on App Hosting), so it cannot tell open sockets
 * about a change. Instead, while a room has clients this service listens to the Firestore
 * document and its members, and sends sync:document when either changes. Rooms and presence
 * are in this process's memory: run one instance (see README).
 */

type Presence = {
  sessionId: string;
  displayName: string;
  color: string;
  role: Role;
  cursor: unknown;
  lastSeenAt: number;
};

type Client = { socket: WebSocket; documentId: string; user: AuthUser | null; role: Role; sessionId: string | null };

type Room = {
  clients: Set<Client>;
  unsubscribe: Array<() => void>;
  /** Metadata last broadcast, to skip snapshots that change nothing the editor shows. */
  signature: string | null;
  updatedAt: number;
  membersReady: boolean;
  timer: NodeJS.Timeout | null;
  pendingExcept: string | null | undefined;
};

const PRESENCE_TTL_MS = 30_000;
const rooms = new Map<string, Room>();
const presence = new Map<string, Map<string, Presence>>();
const wss = new WebSocketServer({ noServer: true, maxPayload: 8 * 1024 * 1024 });

const PATH = /^\/api\/ai-editor\/documents\/([^/]+)\/ws$/;

function send(client: Client, payload: unknown) {
  if (client.socket.readyState === WebSocket.OPEN) client.socket.send(JSON.stringify(payload));
}

function sanitizeCursor(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const json = JSON.stringify(value);
  return json.length > 2000 ? null : JSON.parse(json);
}

function collaborators(documentId: string, currentSessionId: string | null) {
  const now = Date.now();
  const entries = presence.get(documentId) ?? new Map();
  for (const [id, entry] of entries) if (now - entry.lastSeenAt > PRESENCE_TTL_MS) entries.delete(id);
  return [...entries.values()]
    .sort((a, b) => b.lastSeenAt - a.lastSeenAt)
    .map((entry) => ({ ...entry, isCurrentUser: entry.sessionId === currentSessionId }));
}

function broadcastPresence(documentId: string) {
  for (const client of rooms.get(documentId)?.clients ?? []) send(client, { type: 'sync:presence', collaborators: collaborators(documentId, client.sessionId) });
}

async function snapshotFor(client: Client, document?: DocumentRow) {
  const access = document ? { document, role: client.role } : await resolveAccess(client.documentId, client.user);
  client.role = access.role;
  return documentToRead(access.document, await membersOf(client.documentId), access.role);
}

/** Tells everyone viewing a document that its title, comments, sharing, members or blocks changed. */
function broadcastDocument(documentId: string, exceptSessionId: string | null) {
  const room = rooms.get(documentId);
  if (!room?.clients.size) return;
  void (async () => {
    const document = await loadDocument(documentId);
    if (!document) return;
    const members = await membersOf(documentId);
    for (const client of room.clients) {
      if (exceptSessionId && client.sessionId === exceptSessionId) continue;
      send(client, { type: 'sync:document', snapshot: documentToRead(document, members, client.role) });
    }
  })().catch((error) => console.error('broadcastDocument failed', error));
}

/** Several Firestore events in a burst (a PATCH and its member sync) become one broadcast. */
function scheduleBroadcast(documentId: string, exceptSessionId: string | null) {
  const room = rooms.get(documentId);
  if (!room) return;
  // Different senders in one burst: tell everyone.
  room.pendingExcept = room.pendingExcept === undefined ? exceptSessionId : room.pendingExcept === exceptSessionId ? exceptSessionId : null;
  if (room.timer) return;
  room.timer = setTimeout(() => {
    room.timer = null;
    const except = room.pendingExcept ?? null;
    room.pendingExcept = undefined;
    broadcastDocument(documentId, except);
  }, 150);
}

const METADATA_FIELDS = ['title', 'comments', 'share_settings', 'activity', 'word_settings', 'word_count', 'member_ids', 'member_roles', 'member_emails', 'member_count'];

function watch(documentId: string, room: Room) {
  const stopDocument = documentRef(documentId).onSnapshot((snapshot) => {
    if (!snapshot.exists) {
      for (const client of room.clients) send(client, { type: 'error', detail: 'Document not found' });
      return;
    }
    const data = snapshot.data() ?? {};
    const signature = JSON.stringify(METADATA_FIELDS.map((field) => data[field] ?? null));
    const updatedAt = data.updated_at?.toMillis?.() ?? 0;
    const bySession = typeof data.updated_by_session === 'string' ? data.updated_by_session : null;
    const first = room.signature === null;
    const metadataChanged = signature !== room.signature;
    // Text saves from Hocuspocus (updated_by_session 'collab') move updated_at only; editors
    // already have that text. Any other newer write (an HTTP PATCH of blocks) is news.
    const otherWrite = bySession !== 'collab' && updatedAt > room.updatedAt;
    room.signature = signature;
    room.updatedAt = Math.max(room.updatedAt, updatedAt);
    if (first) return; // the initial snapshot: clients got sync:init already
    if (metadataChanged || otherWrite) scheduleBroadcast(documentId, bySession && bySession !== 'collab' ? bySession : null);
  }, (error) => console.error(`watch ${documentId} failed`, error));

  const stopMembers = membersRef(documentId).onSnapshot(() => {
    if (!room.membersReady) { room.membersReady = true; return; }
    // Roles may have changed: the next snapshot is computed per client again.
    void refreshRoles(documentId).finally(() => scheduleBroadcast(documentId, null));
  }, (error) => console.error(`watch ${documentId} members failed`, error));

  room.unsubscribe.push(stopDocument, stopMembers);
}

/** After a member change, each client's role is looked up again (a removed member loses access). */
async function refreshRoles(documentId: string) {
  const room = rooms.get(documentId);
  if (!room) return;
  await Promise.all([...room.clients].map(async (client) => {
    try {
      client.role = (await resolveAccess(documentId, client.user, { blocks: false })).role;
    } catch {
      send(client, { type: 'error', detail: 'You no longer have access to this document.' });
      client.socket.close(4403, 'Forbidden');
    }
  }));
}

function joinRoom(client: Client) {
  let room = rooms.get(client.documentId);
  if (!room) {
    room = { clients: new Set(), unsubscribe: [], signature: null, updatedAt: 0, membersReady: false, timer: null, pendingExcept: undefined };
    rooms.set(client.documentId, room);
    watch(client.documentId, room);
  }
  room.clients.add(client);
}

function leaveRoom(client: Client) {
  const room = rooms.get(client.documentId);
  if (!room) return;
  room.clients.delete(client);
  if (room.clients.size) return;
  rooms.delete(client.documentId);
  if (room.timer) clearTimeout(room.timer);
  room.unsubscribe.forEach((stop) => stop());
}

function touch(client: Client, message: Record<string, any>) {
  if (!client.sessionId) return;
  const entries = presence.get(client.documentId) ?? new Map<string, Presence>();
  presence.set(client.documentId, entries);
  const previous = entries.get(client.sessionId);
  entries.set(client.sessionId, {
    sessionId: client.sessionId,
    displayName: String(message.displayName || previous?.displayName || (client.user ? displayName(client.user) : 'Guest')).slice(0, 80),
    color: String(message.color || previous?.color || '#2563eb').slice(0, 32),
    role: client.role,
    cursor: message.cursor !== undefined ? sanitizeCursor(message.cursor) : previous?.cursor ?? null,
    lastSeenAt: Date.now(),
  });
}

async function applyUpdate(client: Client, message: Record<string, any>) {
  const wantsEdit = typeof message.title === 'string' || Array.isArray(message.blocks);
  if (wantsEdit && !EDIT_ROLES.includes(client.role)) return send(client, { type: 'error', detail: 'Not authorized to edit this document' });
  if (Array.isArray(message.comments) && !COMMENT_ROLES.includes(client.role)) return send(client, { type: 'error', detail: 'Not authorized to comment on this document' });
  const current = await loadDocument(client.documentId);
  if (!current) return send(client, { type: 'error', detail: 'Document not found' });
  const stale = typeof message.baseRevision === 'number' && new Date(current.updated_at).getTime() > message.baseRevision;
  // Live documents keep their text in the Yjs document (/collab), whose saves also move updated_at;
  // the blocks JSON is only a readable copy of it, so a newer copy always wins. Rejecting it as
  // "stale" left exports, versions and search on the text from when the document was created.
  const live = Boolean(current.has_ydoc);
  // A stale editor of a document without live sync gets the newer document instead of overwriting
  // it. A stale comments-only change is merged instead: dropping it lost comments (and AI review
  // results) whenever the text had been saved in the meantime.
  if (stale && wantsEdit && !live) {
    return send(client, { type: 'sync:document', snapshot: await snapshotFor(client, current) });
  }
  if (stale && Array.isArray(message.comments)) {
    message.comments = mergeStaleComments((current.comments as any[]) || [], message.comments, message.baseRevision);
  }
  const title = typeof message.title === 'string' ? message.title.trim() || 'Untitled document' : current.title;
  const activity = [...(current.activity || [])];
  if (title !== current.title && client.user) {
    activity.unshift({ id: `${Date.now()}`, action: 'title_updated', actorSessionId: `user-${client.user.id}`, actorDisplayName: displayName(client.user), timestamp: Date.now(), description: `Renamed the document to "${title}"` });
  }
  // The sender is told too (as before): the Firestore watcher only skips the sender for API writes.
  const updated = await updateDocument(current, {
    title,
    blocks: Array.isArray(message.blocks) ? message.blocks : undefined,
    comments: Array.isArray(message.comments) ? message.comments : undefined,
    activity: title !== current.title ? activity : undefined,
  });
  if (Array.isArray(message.blocks) && client.user) maybeAutoVersion(updated, client.user).catch(() => undefined);
  touch(client, message);
  broadcastPresence(client.documentId);
}

wss.on('connection', (socket: WebSocket, _request: IncomingMessage, documentId: string, user: AuthUser | null, role: Role) => {
  const client: Client = { socket, documentId, user, role, sessionId: null };
  joinRoom(client);

  socket.on('message', (raw) => {
    let message: Record<string, any>;
    try { message = JSON.parse(String(raw)); } catch { return; }
    void (async () => {
      switch (message.type) {
        case 'join': {
          client.sessionId = String(message.sessionId || '').slice(0, 80) || null;
          touch(client, message);
          send(client, { type: 'sync:init', snapshot: await snapshotFor(client), collaborators: collaborators(documentId, client.sessionId) });
          broadcastPresence(documentId);
          break;
        }
        case 'presence:heartbeat':
        case 'cursor:update':
          touch(client, message);
          broadcastPresence(documentId);
          break;
        case 'document:update':
          await applyUpdate(client, message);
          break;
        case 'ping':
          send(client, { type: 'pong' });
          break;
        default:
          break;
      }
    })().catch((error) => {
      console.error('realtime message failed', error);
      send(client, { type: 'error', detail: 'The change could not be saved.' });
    });
  });

  socket.on('close', () => {
    leaveRoom(client);
    if (client.sessionId) presence.get(documentId)?.delete(client.sessionId);
    if (!rooms.has(documentId)) presence.delete(documentId);
    broadcastPresence(documentId);
  });
});

/** Upgrades /api/ai-editor/documents/:id/ws requests; returns false for other paths. */
export function handleRealtimeUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer): boolean {
  const url = new URL(request.url || '/', 'http://localhost');
  const match = PATH.exec(url.pathname);
  if (!match) return false;
  const documentId = decodeURIComponent(match[1]);
  void (async () => {
    const user = await userFromToken(url.searchParams.get('token'));
    try {
      const { role } = await resolveAccess(documentId, user, { blocks: false });
      wss.handleUpgrade(request, socket, head, (ws) => wss.emit('connection', ws, request, documentId, user, role));
    } catch {
      socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
      socket.destroy();
    }
  })();
  return true;
}

/** Open rooms and sockets, for /health. */
export const realtimeStats = () => ({ rooms: rooms.size, sockets: [...rooms.values()].reduce((total, room) => total + room.clients.size, 0) });
