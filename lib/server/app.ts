import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { logger } from 'hono/logger';
import { optionalUser, type AppVariables } from './auth.js';
import { authRoutes } from './routes/auth.js';
import { documentRoutes } from './routes/documents.js';
import { assistRoutes } from './routes/assist.js';
import { wordRoutes } from './routes/word.js';
import { libraryRoutes } from './routes/library.js';
import { libraryImportRoutes } from './routes/libraryImport.js';
import { libraryConnectionRoutes } from './routes/libraryConnections.js';
import { versionRoutes } from './routes/versions.js';
import { cloudPriceRoutes, cloudRoutes } from './routes/cloud.js';
import { gatewayRoutes } from './routes/gateway.js';
import { reviewRoutes } from './routes/review.js';
import { evidenceRoutes } from './routes/evidence.js';
import { matrixRoutes } from './routes/matrix.js';
import { authorshipDocumentRoutes, authorshipRoutes } from './routes/authorship.js';
import { generateRoutes } from './routes/generate.js';
import { dodoWebhookRoutes } from './routes/dodoWebhook.js';
import { billingRoutes, planRoutes } from './routes/billing.js';
import { newsletterRoutes } from './routes/newsletter.js';
import { toolRoutes } from './routes/tools.js';
import { createSlots } from './slots/index.js';
import { PlanLimitError } from './lib/plans.js';
import { flushAiObservability, runAiTurn } from './lib/ai-observability.js';
import { ready } from './ready.js';
import { posthogLog } from '../../instrumentation.js';

/**
 * The AI for Research HTTP API. It runs inside the Next.js app (app/api/[[...route]] and
 * app/v1/[[...route]]) on Firebase App Hosting; the URLs are the ones the editor
 * package has always called, so the editor did not change.
 */
export function createApp() {
  const slots = createSlots();
  const app = new Hono<{ Variables: AppVariables }>();
  if (process.env.NODE_ENV !== 'production') app.use('*', logger());
  app.use('*', async (_c, next) => { await ready(); await next(); });
  app.use('/api/*', optionalUser);
  app.use('*', async (c, next) => runAiTurn(c.get('user')?.id, async () => {
    const startedAt = performance.now();
    try {
      await next();
    } finally {
      await flushAiObservability();
      if (posthogLog && c.req.path !== '/api/health') {
        const statusCode = c.res.status;
        posthogLog.emit({
          body: 'api_request_completed',
          severityText: statusCode >= 500 ? 'ERROR' : 'INFO',
          attributes: {
            event: 'api_request_completed',
            route_group: c.req.path.startsWith('/v1/') ? 'developer_gateway' : 'application_api',
            http_method: c.req.method,
            http_status_code: statusCode,
            duration_ms: Math.round(performance.now() - startedAt),
          },
        });
      }
    }
  }));

  app.get('/api/health', (c) => c.json({ ok: true, llm: slots.llm.provider, papers: slots.papers.provider }));
  app.route('/api/auth', authRoutes());
  app.route('/api/ai-editor/documents', versionRoutes());
  app.route('/api/ai-editor/documents', authorshipDocumentRoutes());
  app.route('/api/ai-editor/documents', documentRoutes());
  app.route('/api/ai-editor/assist', assistRoutes(slots));
  app.route('/api/ai-editor', wordRoutes());
  app.route('/api/ai-editor', reviewRoutes(slots));
  app.route('/api/ai-editor', evidenceRoutes(slots));
  app.route('/api/authorship', authorshipRoutes());
  app.route('/api/matrices', matrixRoutes(slots));
  app.route('/api/editor', generateRoutes(slots));
  app.route('/api/library', libraryConnectionRoutes());
  app.route('/api/library', libraryImportRoutes(slots));
  app.route('/api/library', libraryRoutes(slots));
  app.route('/api/cloud/prices', cloudPriceRoutes());
  app.route('/api/cloud', cloudRoutes());
  app.route('/api/plans', planRoutes());
  app.route('/api/tools', toolRoutes(slots));
  app.route('/api/newsletter', newsletterRoutes());
  app.route('/api/billing', billingRoutes());
  app.route('/api/dodo', dodoWebhookRoutes());
  app.route('/v1', gatewayRoutes(slots));

  app.onError((error, c) => {
    // A plan limit says which one, so the app can offer the upgrade with that reason.
    if (error instanceof PlanLimitError) return c.json({ detail: error.message, code: 'plan_limit', limit: error.key, plan: error.plan }, 402);
    if (error instanceof HTTPException) return c.json({ detail: error.message }, error.status);
    console.error(error);
    return c.json({ detail: 'Something went wrong on our side.' }, 500);
  });
  app.notFound((c) => c.json({ detail: 'Not found' }, 404));
  return app;
}

let shared: ReturnType<typeof createApp> | null = null;
/** One app per process (route handlers are module-scoped in Next.js, but be explicit). */
export const getApp = () => (shared ??= createApp());
