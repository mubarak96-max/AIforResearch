import { createHash } from 'node:crypto';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { requireUser, type AppVariables } from '../auth.js';
import { currentUser, parseBody } from '../lib/assist-llm.js';
import { checkLibraryRoom } from '../lib/plans.js';
import { chunkPages, createLibraryDocument, deleteLibraryDocument, documentWithExternalId, libraryDoc, ownLibraryDocument, writeChunks } from '../lib/libraryFiles.js';
import { getWorkbookFor, putWorkbookEntry } from '../lib/workflows.js';
import { expansionWorkbooksEnabled } from '../../workflows.js';
import { companyConcept, indicatorData, moreOfficialData, officialKeys, officialRecord, searchFilings, searchIndicators, searchMoreOfficial, searchRelief, searchTrials } from '../lib/officialSources.js';
import { rateLimit } from '../lib/rateLimit.js';
import { SourceError } from '../lib/sources/http.js';

async function execute<T>(operation: () => Promise<T>): Promise<T> {
  try { return await operation(); } catch (error) {
    if (error instanceof SourceError) throw new HTTPException(error.status === 429 ? 429 : error.status === 422 ? 422 : 503, { message: error.message });
    throw error;
  }
}

const Provider = z.enum(['clinical_trials', 'world_bank', 'reliefweb', 'sec', 'openfda_label', 'openfda_event', 'openfda_device', 'fred', 'treasury', 'oecd']);
/** OECD dataflow ids are "AGENCY,FLOW@VIEW,VERSION"; every other provider keeps the plain form (checked below). */
const Id = z.string().regex(/^[A-Za-z0-9_.@,-]{1,160}$/);
const Page = z.number().int().min(1).max(100).default(1);
export const OfficialLocatorSchema = z.object({
  provider: Provider, id: Id, source_id: z.string().regex(/^\d{1,5}$/).optional(),
  countries: z.string().regex(/^(?:all|[a-zA-Z0-9]{2,3}(?:;[a-zA-Z0-9]{2,3}){0,19})$/).optional(),
  date: z.string().regex(/^\d{4}(?:M(?:0[1-9]|1[0-2])|Q[1-4])?(?::\d{4}(?:M(?:0[1-9]|1[0-2])|Q[1-4])?)?$/).optional(),
  page: Page.optional(), taxonomy: z.string().regex(/^[a-z][a-z0-9-]{0,30}$/).optional(), concept: z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,99}$/).optional(), accession: z.string().regex(/^\d{10}-\d{2}-\d{6}$/).optional(),
  key: z.string().regex(/^[A-Za-z0-9_.+@-]{1,300}$/).optional(),
}).strict().superRefine((value, context) => {
  if (value.provider === 'clinical_trials' && !/^NCT\d{8}$/.test(value.id)) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Use an NCT registry identifier.' });
  if ((value.provider === 'sec' || value.provider === 'reliefweb') && !/^\d{1,10}$/.test(value.id)) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Use the numeric official identifier.' });
  if (value.provider === 'sec' && !value.concept && !value.accession) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Select a filing or enter an XBRL concept.' });
  const pattern: Partial<Record<typeof value.provider, RegExp>> = {
    world_bank: /^[A-Za-z0-9_.-]{1,100}$/, openfda_label: /^[0-9a-f-]{36}$/i, openfda_event: /^[a-z0-9_.-]{1,100}$/, openfda_device: /^(?:K|DEN)\d{5,7}$/i,
    fred: /^[A-Za-z0-9_.-]{1,40}$/, treasury: /^\d{1,6}$/, oecd: /^[A-Za-z0-9_.-]+,[A-Za-z0-9_.@-]+,[0-9.]+$/,
  };
  if (pattern[value.provider] && !pattern[value.provider]!.test(value.id)) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Use the official identifier from a search result.' });
  if (value.key && value.provider !== 'oecd') context.addIssue({ code: z.ZodIssueCode.custom, message: 'A series key applies to OECD data only.' });
});

/** Mount at /api/official-sources. Reads are never saved automatically. */
export function officialSourceRoutes() {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use('*', requireUser);
  app.use('*', rateLimit({ key: 'official-sources', limit: 180, windowSeconds: 3600 }));
  // Trial registries and the research data sources (openFDA, FRED, Treasury, OECD) are
  // always on. The World Bank, ReliefWeb and SEC connectors stay behind the expansion flag with
  // their policy and finance workbooks; a gated provider is omitted entirely.
  const GATED = new Set(['world_bank', 'reliefweb', 'sec']);
  app.use('*', async (c, next) => {
    if (c.req.method === 'POST' && !expansionWorkbooksEnabled()) {
      const body = await c.req.raw.clone().json().catch(() => null) as { provider?: string; locator?: { provider?: string } } | null;
      const provider = body?.provider ?? body?.locator?.provider;
      if (provider && GATED.has(provider)) throw new HTTPException(404, { message: 'This source is not available.' });
    }
    await next();
  });
  app.get('/availability', (c) => {
    const keys = officialKeys();
    const always = { clinical_trials: true, openfda_label: true, openfda_event: true, openfda_device: true, fred: keys.fred, treasury: true, oecd: true };
    if (!expansionWorkbooksEnabled()) return c.json(always);
    return c.json({ ...always, world_bank: true, reliefweb: true, sec: true });
  });
  app.post('/search', async (c) => {
    const input = await parseBody(c, z.object({ provider: Provider, query: z.string().trim().min(1).max(500), page: Page, page_token: z.string().max(3000).optional(), source_id: z.string().regex(/^\d{1,5}$/).default('2') }).strict());
    if (input.provider === 'clinical_trials') return c.json(await execute(() => searchTrials(input.query, input.page_token)));
    if (input.provider === 'world_bank') return c.json(await execute(() => searchIndicators(input.query, input.source_id, input.page)));
    if (input.provider === 'reliefweb') return c.json(await execute(() => searchRelief(input.query, input.page)));
    const more = await execute(() => searchMoreOfficial(input.provider, input.query, input.page));
    if (more) return c.json(more);
    if (!/^\d{1,10}$/.test(input.query)) throw new HTTPException(422, { message: 'Enter a numeric SEC CIK identifier (up to ten digits).' });
    return c.json(await execute(() => searchFilings(input.query, input.page)));
  });
  app.post('/data', async (c) => {
    const locator = await parseBody(c, OfficialLocatorSchema);
    if (locator.provider === 'clinical_trials') return c.json(await execute(() => officialRecord(locator)));
    if (locator.provider === 'world_bank') return c.json(await execute(() => indicatorData(locator)));
    if (locator.provider === 'sec' && locator.concept) return c.json(await execute(() => companyConcept(locator)));
    const more = await execute(() => moreOfficialData(locator));
    if (more) return c.json(more);
    throw new HTTPException(422, { message: 'Choose a trial registration, indicator, series, table or financial concept.' });
  });
  app.post('/save', async (c) => {
    const user = currentUser(c);
    const input = await parseBody(c, z.object({ locator: OfficialLocatorSchema, workbook_id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/).optional(), workbook_revision: z.number().int().min(1).optional() }).strict());
    if (input.workbook_id) {
      const workbook = await getWorkbookFor(user, input.workbook_id, ['owner', 'edit']);
      if (workbook.revision !== input.workbook_revision) throw new HTTPException(409, { message: 'The workbook changed. Reload the destination list before saving.' });
    }
    const record = await execute(() => officialRecord(input.locator));
    if (record.text.length > 150_000) throw new HTTPException(413, { message: 'This record is too long for one source snapshot. Narrow the requested data range or import selected sections manually.' });
    const sha = createHash('sha256').update(JSON.stringify(record)).digest('hex');
    const externalId = `official:${record.locator.provider}:${record.locator.id}:${sha}`;
    const existing = await documentWithExternalId(user.id, externalId);
    let id = existing?.id ?? null;
    const fetchedAt = new Date().toISOString();
    if (!id) {
      await checkLibraryRoom(user.account_id, user.id);
      id = await createLibraryDocument(user.id, { external_id: externalId, filename: `${record.title.slice(0, 180)}.txt`, file_type: 'text', title: record.title.slice(0, 1000), authors: [], publisher: record.publisher, publication_date: record.publication_date, abstract: record.summary.slice(0, 20000), processing_status: 'processing', metadata: { source: record.locator.provider, url: record.url, content_basis: 'official_record', official_source: { provider: record.locator.provider, kind: record.kind, url: record.url, fetched_at: fetchedAt, sha256: sha, dates: record.dates, metadata: record.metadata, warnings: record.warnings } } });
      if (!id) id = (await documentWithExternalId(user.id, externalId))?.id ?? null;
      else {
        try {
          const count = await writeChunks(user.id, id, chunkPages([{ page: 1, text: record.text }]).map((chunk) => ({ content: chunk.content, page: null })), { deadline: Date.now() + 8000 });
          await libraryDoc(id).update({ processing_status: 'completed', chunk_count: count, processed_at: new Date(), updated_at: new Date() });
        } catch (error) { const doc = await ownLibraryDocument(user.id, id); if (doc) await deleteLibraryDocument(doc); throw error; }
      }
    }
    if (!id) throw new HTTPException(503, { message: 'The source could not be saved. Try again.' });
    let workbookRevision: number | null = null;
    if (input.workbook_id) {
      const updated = await putWorkbookEntry(user, input.workbook_id, input.workbook_revision!, { section: 'sources', values: { title: record.title.slice(0, 200), kind: record.kind.startsWith('indicator') || ['financial_facts', 'series_metadata', 'series_data', 'fiscal_table', 'fiscal_data', 'dataflow_metadata', 'dataflow_data', 'adverse_event_summary'].includes(record.kind) ? 'dataset' : record.kind === 'filing_metadata' ? 'filing' : 'primary', text: record.text, reference: record.url, edition: `Official source snapshot ${fetchedAt}; SHA-256 ${sha}`, published: record.publication_date ?? '', language: '', consent: 'public', access_note: `Source: ${record.publisher}. ${record.warnings.join(' ')}`, library_id: id } });
      workbookRevision = updated.revision;
    }
    return c.json({ library_document_id: id, duplicate: Boolean(existing), workbook_revision: workbookRevision, sha256: sha, message: 'Saved an official-record snapshot. It can be added to project evidence from your Library.' }, existing ? 200 : 201);
  });
  return app;
}
