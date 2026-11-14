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
import { reviewRoutes } from './routes/review.js';
import { evidenceRoutes } from './routes/evidence.js';
import { matrixRoutes } from './routes/matrix.js';
import { authorshipDocumentRoutes, authorshipRoutes } from './routes/authorship.js';
import { generateRoutes } from './routes/generate.js';
import { dodoWebhookRoutes } from './routes/dodoWebhook.js';
import { billingRoutes, planRoutes } from './routes/billing.js';
import { newsletterRoutes } from './routes/newsletter.js';
import { toolRoutes } from './routes/tools.js';
import { researchRoutes } from './routes/research.js';
import { reviewerRoutes } from './routes/reviewer.js';
import { systematicReviewRoutes } from './routes/systematicReview.js';
import { studioRoutes } from './routes/studio.js';
import { convertRoutes } from './routes/convert.js';
import { diagramRoutes } from './routes/diagram.js';
import { analysisRoutes } from './routes/analysis.js';
import { projectEvidenceRoutes } from './routes/projectEvidence.js';
import { projectAttentionRoutes } from './routes/projectAttention.js';
import { workflowRoutes } from './routes/workflows.js';
import { monitoringRoutes } from './routes/monitoring.js';
import { analyticsRoutes } from './routes/analytics.js';
import { projectGovernanceRoutes } from './routes/projectGovernance.js';
import { projectProgressRoutes } from './routes/projectProgress.js';
import { officialSourceRoutes } from './routes/officialSources.js';
import { teamRoutes } from './routes/team.js';
import { publicSurveyRoutes, surveyRoutes } from './routes/surveys.js';
import { createSlots } from './slots/index.js';
import { PlanLimitError } from './lib/plans.js';
import { ready } from './ready.js';

/**
 * The AI for Research HTTP API. It runs inside the Next.js app (app/api/[[...route]]) on
 * Firebase App Hosting; the URLs are the ones the editor
 * package has always called, so the editor did not change.
 */
export function createApp() {
  const slots = createSlots();
  const app = new Hono<{ Variables: AppVariables }>();
  if (process.env.NODE_ENV !== 'production') app.use('*', logger());
  app.use('*', async (_c, next) => { await ready(); await next(); });
  app.use('/api/*', optionalUser);

  app.get('/api/health', (c) => c.json({ ok: true, llm: slots.llm.provider, papers: slots.papers.provider }));
  app.route('/api/auth', authRoutes());
  app.route('/api/ai-editor/documents', versionRoutes());
  app.route('/api/ai-editor/documents', authorshipDocumentRoutes());
  app.route('/api/ai-editor/documents', documentRoutes());
  app.route('/api/ai-editor/assist', assistRoutes(slots));
  app.route('/api/ai-editor/diagram', diagramRoutes(slots));
  app.route('/api/ai-editor', wordRoutes());
  app.route('/api/ai-editor', reviewRoutes(slots));
  app.route('/api/ai-editor', evidenceRoutes(slots));
  app.route('/api/authorship', authorshipRoutes());
  app.route('/api/matrices', matrixRoutes(slots));
  app.route('/api/editor', generateRoutes(slots));
  app.route('/api/library', libraryConnectionRoutes());
  app.route('/api/library', libraryImportRoutes(slots));
  app.route('/api/library', libraryRoutes(slots));
  app.route('/api/plans', planRoutes());
  app.route('/api/tools', toolRoutes(slots));
  app.route('/api/reviewer', reviewerRoutes(slots));
  app.route('/api/systematic-reviews', systematicReviewRoutes(slots));
  app.route('/api/studio', studioRoutes(slots));
  app.route('/api/convert', convertRoutes());
  app.route('/api/analysis', analysisRoutes(slots));
  app.route('/api/workbooks', workflowRoutes(slots));
  app.route('/api/monitoring', monitoringRoutes());
  app.route('/api/analytics', analyticsRoutes());
  app.route('/api/projects', projectGovernanceRoutes());
  app.route('/api/projects', projectProgressRoutes(slots));
  app.route('/api/official-sources', officialSourceRoutes());
  app.route('/api/team', teamRoutes());
  app.route('/api/surveys', surveyRoutes(slots));
  app.route('/api/public/surveys', publicSurveyRoutes());
  app.route('/api', projectEvidenceRoutes());
  app.route('/api', projectAttentionRoutes());
  app.route('/api', researchRoutes(slots));
  app.route('/api/newsletter', newsletterRoutes());
  app.route('/api/billing', billingRoutes());
  app.route('/api/dodo', dodoWebhookRoutes());

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
