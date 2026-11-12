import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { requireUser, type AppVariables } from '../auth.js';
import { col, increment } from '../firebase.js';
import { rateLimit } from '../lib/rateLimit.js';
import { safeEditorEvent } from '../../analyticsPrivacy.js';

/** Daily content-free aggregates. No document, account, session or user identifiers are stored. */
export function analyticsRoutes() {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use('*', requireUser);
  app.post('/events', rateLimit({ key: 'product-events', limit: 600, windowSeconds: 3600 }), async (c) => {
    if (Number(c.req.header('Content-Length') || 0) > 4096) throw new HTTPException(413, { message: 'Event is too large.' });
    const text = await c.req.text();
    if (text.length > 4096) throw new HTTPException(413, { message: 'Event is too large.' });
    let body: any;
    try { body = JSON.parse(text); } catch { return c.body(null, 204); }
    if (body?.consent !== true) return c.body(null, 204);
    const event = safeEditorEvent(body.name, body.properties);
    if (!event) return c.body(null, 204);
    const day = new Date().toISOString().slice(0, 10);
    const dimension = event.properties.source || event.properties.duration_bucket || 'all';
    await col('product_event_totals').doc(`${day}__${event.name}__${dimension}`).set({
      day, event: event.name, dimension, count: increment(1),
      ...(event.properties.issue_count != null ? { issue_count_sum: increment(event.properties.issue_count) } : {}),
    }, { merge: true });
    return c.body(null, 204);
  });
  return app;
}
