/**
 * Systematic Review workspace, mounted at /api/systematic-reviews:
 *   GET    /                         reviews the person owns or shares through a project
 *   POST   /                         a new review (title, question, preset, framework, criteria, project)
 *   GET    /:id                      the review, its records with their screening state, PRISMA counts, agreement
 *   PATCH  /:id                      protocol, criteria, columns, AI as second reviewer…
 *   DELETE /:id
 *   POST   /:id/protocol/draft       a PROSPERO-shaped protocol (AI, CREDIT_COSTS.section)
 *   POST   /:id/searches/count       records a database search would find (PubMed, Europe PMC, OpenAlex)
 *   POST   /:id/searches/run         runs it and adds the records (duplicates kept as duplicates)
 *   POST   /:id/import               an uploaded export (RIS, BibTeX, CSV, PubMed .nbib; Scopus and Web of Science exports too)
 *   POST   /:id/records/from-task    the sources of a Deep Research result as records
 *   POST   /:id/records/:rid/vote    one reviewer's include / exclude / maybe
 *   POST   /:id/records/:rid/resolve the final decision for a conflict
 *   PATCH  /:id/records/:rid         extraction values and risk of bias
 *   POST   /:id/screen/ai            AI suggestions for undecided records (CREDIT_COSTS.screening per 25)
 *   POST   /:id/extract/ai           AI extraction for included records (CREDIT_COSTS.section per 10)
 *   POST   /:id/methods/draft        a Methods section from the log and counts (AI, CREDIT_COSTS.section)
 *   GET    /:id/export?format=csv|ris
 *   GET    /:id/screening-documents  screening forms, exclusion reasons and decision log as editor blocks (exported as Word or PDF)
 * Searching, importing, removing duplicates, screening by hand, agreement, PRISMA and exports cost no credits.
 */
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { requireUser, type AppVariables } from '../auth.js';
import type { Slots } from '../slots/types.js';
import { LlmError, llmModelName, llmUnavailable } from '../slots/llm.js';
import { currentUser, meterTokens, parseBody } from '../lib/assist-llm.js';
import { CREDIT_COSTS, refundCredits, spendCredits, type CreditCharge } from '../lib/plans.js';
import { listProjects } from '../lib/projects.js';
import { getTaskFor } from '../lib/history.js';
import { REVIEW_TYPES, FRAMEWORKS, PRESETS, passesTitle, stageState } from '../lib/systematicReviewStats.js';
import { parseExport, toCsv, toRis, type ImportedRecord } from '../lib/systematicReviewParse.js';
import {
  DATABASES, DATABASE_LABELS, ROB_FIELDS, addRecords, countSearch, createReview, deleteReview, extractRows, listReviews, loadRecords,
  methodsPrompt, protocolPrompt, resolve, reviewFor, reviewState, reviewerSetup, runSearch, saveExtraction, storeExtraction,
  storeSuggestions, suggestDecisions, updateReview, vote, attachFullText, fullTextPages, withFullTexts, reviewAudit, type RecordRow,
} from '../lib/systematicReview.js';
import { screeningDocuments } from '../lib/systematicReviewDocuments.js';

const Decision = z.enum(['include', 'exclude', 'maybe']);
const Stage = z.enum(['title', 'full']);
const list = z.array(z.string().max(500)).max(40);

const CreateBody = z.object({
  title: z.string().trim().min(1).max(200),
  question: z.string().trim().max(2000).default(''),
  review_type: z.enum(REVIEW_TYPES).default('systematic'),
  framework: z.enum(Object.keys(FRAMEWORKS) as [keyof typeof FRAMEWORKS, ...(keyof typeof FRAMEWORKS)[]]).optional(),
  framework_fields: z.record(z.string().max(1000)).optional(),
  include_criteria: list.optional(),
  exclude_criteria: list.optional(),
  project_id: z.string().max(64).nullish(),
  from_task_id: z.string().max(64).nullish(),
});

const PatchBody = CreateBody.omit({ from_task_id: true, project_id: true }).partial().extend({
  protocol: z.string().max(100_000).optional(),
  methods: z.string().max(100_000).optional(),
  extraction_columns: z.array(z.object({ id: z.string().max(40), label: z.string().max(80), custom: z.boolean() })).max(30).optional(),
  ai_second_reviewer: z.boolean().optional(),
});

const MAX_RUN = 2000;

export function systematicReviewRoutes(slots: Slots) {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use('*', requireUser);

  const needLlm = () => {
    const unavailable = llmUnavailable(slots.llm);
    if (unavailable) throw new HTTPException(503, { message: unavailable });
  };
  const meter = (c: any, usage: { inputTokens: number; outputTokens: number }, feature: string) =>
    meterTokens(currentUser(c), usage, { feature: `systematic-review:${feature}`, provider: slots.llm.provider, model: llmModelName(slots.llm, 'fast') });
  /** Runs AI work with its credits taken first and given back if it fails. */
  async function charged<T>(accountId: string, credits: number, label: string, work: () => Promise<T>): Promise<T> {
    let charge: CreditCharge | null = await spendCredits(accountId, credits, label);
    try {
      const result = await work();
      charge = null;
      return result;
    } catch (error) {
      if (error instanceof LlmError) throw new HTTPException(error.status, { message: error.message });
      throw error;
    } finally {
      await refundCredits(charge);
    }
  }

  app.get('/meta', (c) => c.json({ presets: PRESETS, frameworks: FRAMEWORKS, databases: DATABASES.map((id) => ({ id, label: DATABASE_LABELS[id] })), costs: { screening: CREDIT_COSTS.screening, section: CREDIT_COSTS.section } }));

  app.get('/', async (c) => {
    const user = currentUser(c);
    const projects = await listProjects(user);
    const found = await listReviews(user, projects.map((project) => project.id));
    return c.json({ reviews: found.map(({ id, title, question, review_type, project_id, task_id, searches, updated_at, user_id }) => ({ id, title, question, review_type, project_id, task_id, searches: searches.length, updated_at, owned: user_id === user.id })) });
  });

  app.post('/', async (c) => {
    const user = currentUser(c);
    const body = await parseBody(c, CreateBody);
    const review = await createReview(user, body);
    if (body.from_task_id) {
      const task = await getTaskFor(user, body.from_task_id).catch(() => null);
      const sources = ((task?.result?.sources ?? []) as any[]).filter((source) => source.kind === 'paper' || source.kind === 'library');
      if (sources.length) await addRecords(user, review.id, sources.map(sourceToRecord), { database: 'Deep Research', query: String(task?.inputs?.question ?? ''), count: sources.length, kind: 'research' });
    }
    return c.json({ id: review.id, task_id: review.task_id }, 201);
  });

  app.get('/:id', async (c) => c.json(await reviewState(currentUser(c), c.req.param('id'))));

  app.get('/:id/audit', async (c) => c.json({ events: await reviewAudit(currentUser(c), c.req.param('id')) }));

  app.post('/:id/records/:rid/full-text', async (c) => {
    const body = await parseBody(c, z.object({ library_document_id: z.string().uuid() }));
    return c.json({ full_text: await attachFullText(currentUser(c), c.req.param('id'), c.req.param('rid'), body.library_document_id) });
  });

  app.get('/:id/records/:rid/full-text', async (c) => {
    await reviewFor(currentUser(c), c.req.param('id'));
    const record = (await loadRecords(c.req.param('id'))).find((item) => item.id === c.req.param('rid'));
    if (!record) throw new HTTPException(404, { message: 'Record not found' });
    return c.json({ full_text: record.full_text ?? null, pages: await fullTextPages(c.req.param('id'), record) });
  });

  app.patch('/:id', async (c) => {
    const body = await parseBody(c, PatchBody);
    await updateReview(currentUser(c), c.req.param('id'), body);
    return c.json({ ok: true });
  });

  app.delete('/:id', async (c) => {
    await deleteReview(currentUser(c), c.req.param('id'));
    return c.json({ ok: true });
  });

  app.post('/:id/protocol/draft', async (c) => {
    const user = currentUser(c);
    needLlm();
    const { review } = await reviewFor(user, c.req.param('id'), 'edit');
    const protocol = await charged(user.account_id, CREDIT_COSTS.section, 'A protocol draft', async () => {
      const { text, usage } = await slots.llm.complete({ messages: protocolPrompt(review), task: 'review', maxTokens: 3000, temperature: 0.3 });
      await meter(c, usage, 'protocol');
      if (!text.trim()) throw new HTTPException(503, { message: 'The AI returned nothing. Try again.' });
      return text.trim();
    });
    await updateReview(user, review.id, { protocol });
    return c.json({ protocol, credits: CREDIT_COSTS.section });
  });

  const SearchBody = z.object({ database: z.enum(DATABASES), query: z.string().trim().min(2).max(4000), max: z.number().int().min(1).max(MAX_RUN).default(500) });

  app.post('/:id/searches/count', async (c) => {
    await reviewFor(currentUser(c), c.req.param('id'));
    const body = await parseBody(c, SearchBody.omit({ max: true }));
    return c.json({ count: await countSearch(body.database, body.query) });
  });

  app.post('/:id/searches/run', async (c) => {
    const user = currentUser(c);
    await reviewFor(user, c.req.param('id'), 'edit');
    const body = await parseBody(c, SearchBody);
    const [count, records] = await Promise.all([countSearch(body.database, body.query).catch(() => null), runSearch(body.database, body.query, body.max)]);
    const result = await addRecords(user, c.req.param('id'), records, { database: DATABASE_LABELS[body.database], query: body.query, count, kind: 'search' });
    return c.json({ ...result, found: count, fetched: records.length });
  });

  app.post('/:id/import', async (c) => {
    const user = currentUser(c);
    await reviewFor(user, c.req.param('id'), 'edit');
    const form = await c.req.formData().catch(() => null);
    const file = form?.get('file');
    if (!file || typeof file === 'string') throw new HTTPException(422, { message: 'Choose an export file.' });
    if (file.size > 30 * 1024 * 1024) throw new HTTPException(413, { message: 'Exports can be up to 30 MB.' });
    const database = String(form?.get('database') || '').trim().slice(0, 60) || 'Uploaded file';
    let parsed: { format: string; records: ImportedRecord[] };
    try {
      parsed = parseExport(file.name || 'export.txt', await file.text());
    } catch (error) {
      throw new HTTPException(422, { message: (error as Error).message });
    }
    if (!parsed.records.length) throw new HTTPException(422, { message: `No records found in this ${parsed.format} file.` });
    const result = await addRecords(user, c.req.param('id'), parsed.records, { database, query: String(form?.get('query') || '').slice(0, 4000), count: parsed.records.length, kind: 'upload' });
    return c.json({ ...result, format: parsed.format, read: parsed.records.length });
  });

  app.post('/:id/records/from-task', async (c) => {
    const user = currentUser(c);
    const { task_id } = await parseBody(c, z.object({ task_id: z.string().max(64) }));
    const task = await getTaskFor(user, task_id);
    const sources = ((task.result?.sources ?? task.result?.all_sources ?? []) as any[]).filter((source) => source.kind === 'paper' || source.kind === 'library');
    if (!sources.length) throw new HTTPException(422, { message: 'That result has no papers to add.' });
    return c.json(await addRecords(user, c.req.param('id'), sources.map(sourceToRecord), { database: 'Deep Research', query: String(task.inputs?.question ?? task.title), count: sources.length, kind: 'research' }));
  });

  app.post('/:id/records/:rid/vote', async (c) => {
    const body = await parseBody(c, z.object({ stage: Stage, decision: Decision.nullable(), reason: z.string().max(200).nullish() }));
    await vote(currentUser(c), c.req.param('id'), c.req.param('rid'), body.stage, body.decision, body.reason ?? null);
    return c.json({ ok: true });
  });

  app.post('/:id/records/:rid/resolve', async (c) => {
    const body = await parseBody(c, z.object({ stage: Stage, decision: Decision.nullable(), reason: z.string().max(200).nullish() }));
    await resolve(currentUser(c), c.req.param('id'), c.req.param('rid'), body.stage, body.decision, body.reason ?? null);
    return c.json({ ok: true });
  });

  app.patch('/:id/records/:rid', async (c) => {
    const body = await parseBody(c, z.object({ values: z.record(z.string().max(4000)).default({}), rob: z.record(z.string().max(40)).default({}), appraisal_template: z.enum(['intervention', 'observational', 'qualitative', 'documentary']).optional(), appraisal_notes: z.record(z.string().max(2000)).optional() }));
    await saveExtraction(currentUser(c), c.req.param('id'), c.req.param('rid'), body.values, Object.fromEntries(Object.entries(body.rob).filter(([key]) => (ROB_FIELDS as readonly string[]).includes(key))), { template: body.appraisal_template, notes: body.appraisal_notes });
    return c.json({ ok: true });
  });

  app.post('/:id/screen/ai', async (c) => {
    const user = currentUser(c);
    needLlm();
    const { review } = await reviewFor(user, c.req.param('id'), 'edit');
    const body = await parseBody(c, z.object({ stage: Stage, record_ids: z.array(z.string()).max(100).optional(), limit: z.number().int().min(1).max(100).default(25) }));
    const setup = await reviewerSetup(review);
    const records = await loadRecords(review.id);
    // Records not yet suggested at this stage (and, at full text, only those that passed title screening).
    const candidates = records.filter((record) => !record.duplicate_of && !record.ai?.[body.stage]
      && (!body.record_ids || body.record_ids.includes(record.id))
      && (body.stage === 'title' || passesTitle(stageState(record, 'title', setup)))).slice(0, body.limit);
    const fullTexts = body.stage === 'full' ? await withFullTexts(review.id, candidates) : null;
    const wanted = fullTexts?.ready ?? candidates;
    if (!wanted.length) return c.json({ suggested: 0, credits: 0, ...(fullTexts ? { unavailable: fullTexts.unavailable } : {}) });
    const credits = Math.ceil(wanted.length / 25) * CREDIT_COSTS.screening;
    const suggested = await charged(user.account_id, credits, 'AI screening', async () => {
      let count = 0;
      const batchSize = body.stage === 'full' ? 1 : 25;
      for (let index = 0; index < wanted.length; index += batchSize) {
        const { suggestions, usage } = await suggestDecisions(slots.llm, review, body.stage, wanted.slice(index, index + batchSize));
        await meter(c, usage, 'screening');
        const known = new Map([...suggestions].filter(([id]) => wanted.some((record) => record.id === id)));
        await storeSuggestions(review.id, body.stage, known, user.id, new Map(wanted.map((record) => [record.id, record.full_text?.revision ?? null])));
        count += known.size;
      }
      if (!count) throw new HTTPException(503, { message: 'The AI gave no usable suggestions. Try again.' });
      return count;
    });
    return c.json({ suggested, credits, ...(fullTexts ? { unavailable: fullTexts.unavailable } : {}) });
  });

  app.post('/:id/extract/ai', async (c) => {
    const user = currentUser(c);
    needLlm();
    const { review } = await reviewFor(user, c.req.param('id'), 'edit');
    const body = await parseBody(c, z.object({ record_ids: z.array(z.string()).max(50).optional(), limit: z.number().int().min(1).max(50).default(10) }));
    const setup = await reviewerSetup(review);
    const records = await loadRecords(review.id);
    const included = records.filter((record) => {
      if (record.duplicate_of) return false;
      const title = stageState(record, 'title', setup);
      return passesTitle(title) && stageState(record, 'full', setup).decision === 'include';
    });
    const candidates = included.filter((record) => (body.record_ids ? body.record_ids.includes(record.id) : !Object.values(record.extraction ?? {}).some((cell) => cell.ai))).slice(0, body.limit);
    const { ready: wanted, unavailable } = await withFullTexts(review.id, candidates);
    if (!wanted.length) return c.json({ filled: 0, credits: 0, unavailable });
    const credits = Math.ceil(wanted.length / 10) * CREDIT_COSTS.section;
    const filled = await charged(user.account_id, credits, 'AI extraction', async () => {
      let count = 0;
      const byId = new Map(records.map((record) => [record.id, record]));
      for (let index = 0; index < wanted.length; index += 1) {
        const { rows, usage } = await extractRows(slots.llm, review, wanted.slice(index, index + 1));
        await meter(c, usage, 'extraction');
        const known = new Map([...rows].filter(([id]) => byId.has(id)));
        await storeExtraction(review.id, known, byId, user.id);
        count += known.size;
      }
      if (!count) throw new HTTPException(503, { message: 'The AI gave no usable rows. Try again.' });
      return count;
    });
    return c.json({ filled, credits, unavailable });
  });

  app.post('/:id/methods/draft', async (c) => {
    const user = currentUser(c);
    needLlm();
    const state = await reviewState(user, c.req.param('id'));
    if (!state.can_edit) throw new HTTPException(403, { message: 'You can read this review but not change it.' });
    const methods = await charged(user.account_id, CREDIT_COSTS.section, 'A Methods draft', async () => {
      const { text, usage } = await slots.llm.complete({ messages: methodsPrompt(state.review, state), task: 'review', maxTokens: 2500, temperature: 0.3 });
      await meter(c, usage, 'methods');
      if (!text.trim()) throw new HTTPException(503, { message: 'The AI returned nothing. Try again.' });
      return text.trim();
    });
    await updateReview(user, state.review.id, { methods });
    return c.json({ methods, credits: CREDIT_COSTS.section });
  });

  /** The screening documents as the viewer may see them (blinded decisions stay hidden). Free. */
  app.get('/:id/screening-documents', async (c) => {
    const user = currentUser(c);
    const state = await reviewState(user, c.req.param('id'));
    const audit = await reviewAudit(user, state.review.id);
    c.header('cache-control', 'private, no-store');
    return c.json(screeningDocuments({ review: state.review, records: state.records, reviewers: state.reviewers, audit, generated: new Date().toISOString() }));
  });

  app.get('/:id/export', async (c) => {
    const state = await reviewState(currentUser(c), c.req.param('id'));
    const format = c.req.query('format') === 'ris' ? 'ris' : 'csv';
    const which = c.req.query('records') || 'all';
    const rowsOut = state.records.filter((record) => (which === 'included' ? record.full_state?.decision === 'include' : true));
    const name = state.review.title.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'review';
    const decisionOf = (record: (typeof rowsOut)[number]) => (record.duplicate_of ? 'duplicate' : record.full_state?.status === 'final' ? record.full_state.decision : record.title_state.status === 'final' ? record.title_state.decision : record.title_state.status);
    const reasonOf = (record: (typeof rowsOut)[number]) => record.full_state?.reason ?? record.title_state.reason ?? '';
    if (format === 'ris') {
      return new Response(toRis(rowsOut.map((record) => ({ ...record, decision: decisionOf(record), reason: reasonOf(record) }))), {
        headers: { 'Content-Type': 'application/x-research-info-systems; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}.ris"` },
      });
    }
    const columns = state.review.extraction_columns;
    const header = ['Title', 'Authors', 'Year', 'Journal', 'DOI', 'PMID', 'Source', 'Duplicate of', 'Title/abstract', 'Full text', 'Final decision', 'Reason',
      ...columns.flatMap((column) => [column.label, `${column.label}: quote`, `${column.label}: page`, `${column.label}: status`, `${column.label}: source version`]), 'Appraisal approach', ...ROB_FIELDS, ...ROB_FIELDS.map((field) => `${field}: rationale`)];
    const body = rowsOut.map((record) => [
      record.title, record.authors.join('; '), record.year, record.venue, record.doi, record.pmid, record.source, record.duplicate_of ?? '',
      record.title_state.decision ?? record.title_state.status, record.full_state ? record.full_state.decision ?? record.full_state.status : '', decisionOf(record), reasonOf(record),
      ...columns.flatMap((column) => { const cell = record.extraction?.[column.id]; return [cell?.value ?? '', cell?.quote ?? '', cell?.page ?? '', cell?.status ?? '', cell?.source_revision ?? '']; }), record.appraisal_template ?? 'intervention', ...ROB_FIELDS.map((field) => record.rob?.[field] ?? ''), ...ROB_FIELDS.map((field) => record.appraisal_notes?.[field] ?? ''),
    ]);
    return new Response(`﻿${toCsv([header, ...body])}`, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}.csv"` } });
  });

  return app;
}

/** A Deep Research source as a record. */
function sourceToRecord(source: any): ImportedRecord {
  return {
    title: String(source.title ?? ''), authors: Array.isArray(source.authors) ? source.authors.map(String) : [], year: source.year ?? null, venue: source.venue ?? null,
    doi: source.doi ?? null, pmid: null, abstract: source.abstract ?? null, url: source.url ?? null,
  };
}
