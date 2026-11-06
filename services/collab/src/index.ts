import { createServer } from 'node:http';
import { ready } from '../../../lib/server/index.js';
import { handleCollabUpgrade, hocuspocus } from './collab.js';
import { handleRealtimeUpgrade, realtimeStats } from './realtime.js';

/**
 * The collab service (Cloud Run): WebSockets the Next.js app on App Hosting cannot serve.
 *   /collab                               Yjs document text (Hocuspocus)
 *   /api/ai-editor/documents/:id/ws       presence and document metadata
 *   /health                               liveness
 */
const port = Number(process.env.PORT || 4200);

// Admin settings and plans (sign-in on first use may create a user, which reads them).
await ready().catch((error) => console.error('collab: settings not loaded yet', error));

const server = createServer((request, response) => {
  const url = new URL(request.url || '/', 'http://localhost');
  if (url.pathname === '/health' || url.pathname === '/') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ ok: true, ...realtimeStats(), documents: hocuspocus.getDocumentsCount() }));
    return;
  }
  response.writeHead(404, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ detail: 'Not found' }));
});

server.on('upgrade', (request, socket, head) => {
  if (handleCollabUpgrade(request, socket, head)) return;
  if (handleRealtimeUpgrade(request, socket, head)) return;
  socket.destroy();
});

server.listen(port, '0.0.0.0', () => console.log(`writeorbit collab listening on :${port}`));

// Cloud Run sends SIGTERM before stopping an instance: save open documents first.
const shutdown = async () => {
  await hocuspocus.destroy().catch(() => undefined);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 8000).unref();
};
process.on('SIGTERM', () => { void shutdown(); });
process.on('SIGINT', () => { void shutdown(); });
