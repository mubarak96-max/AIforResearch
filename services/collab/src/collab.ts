import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { Server } from '@hocuspocus/server';
import { Database } from '@hocuspocus/extension-database';
import { WebSocketServer } from 'ws';
import { userFromToken, resolveAccess, EDIT_ROLES, documentRef, readYdoc, writeYdoc } from '@researchcove/server';

/**
 * Real-time document text (Yjs over Hocuspocus) at /collab. The document name is the document
 * id; the connection's Firebase ID token decides access, exactly like the HTTP API. The Yjs
 * state is kept in Storage (documents/<id>/ydoc.bin); saving it also moves the Firestore
 * document's updated_at and sets has_ydoc, which the presence channel and the API read.
 */
export const hocuspocus = Server.configure({
  quiet: true,
  debounce: 1500,
  maxDebounce: 8000,
  timeout: 30_000,
  async onAuthenticate({ token, documentName, connection }) {
    const user = await userFromToken(token);
    const { role } = await resolveAccess(documentName, user, { blocks: false }).catch(() => {
      throw new Error('Forbidden');
    });
    if (!EDIT_ROLES.includes(role)) connection.readOnly = true;
    return { userId: user?.id ?? null, role };
  },
  extensions: [
    new Database({
      fetch: async ({ documentName }) => readYdoc(documentName),
      store: async ({ documentName, state }) => {
        await writeYdoc(documentName, state);
        // No session id: this is a text save, which every open editor already has through Yjs.
        await documentRef(documentName).update({ has_ydoc: true, updated_at: new Date(), updated_by_session: 'collab' })
          .catch((error) => console.error(`collab: ${documentName} metadata not updated: ${(error as Error).message}`));
      },
    }),
  ],
});

const wss = new WebSocketServer({ noServer: true, maxPayload: 32 * 1024 * 1024 });

/** Upgrades /collab requests; returns false for other paths. */
export function handleCollabUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer): boolean {
  const url = new URL(request.url || '/', 'http://localhost');
  if (url.pathname !== '/collab' && url.pathname !== '/api/collab') return false;
  wss.handleUpgrade(request, socket, head, (ws) => hocuspocus.handleConnection(ws, request));
  return true;
}
