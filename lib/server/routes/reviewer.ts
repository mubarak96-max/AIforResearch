/**
 * The Review hub, mounted at /api/reviewer:
 *   POST /review      Reviewer: a thesis, proposal or manuscript reviewed at a level (credits per 10,000 words)
 *   POST /claims      Claim check: each claim in a paragraph against papers (CREDIT_COSTS.review)
 *   POST /citations   Citation check: every reference looked up, retractions flagged (free; the AI support check costs CREDIT_COSTS.review)
 *   POST /guidelines  Reporting-guideline check: every item of CONSORT, STROBE, PRISMA …, SAGER, SAMPL (CREDIT_COSTS.guideline_check per 10,000 words)
 *   POST /references  Reference list formatter: parsed, merged, verified; CSL-JSON, RIS, BibTeX (free; AI cleanup CREDIT_COSTS.ai_edit)
 * Every run is saved in History (kinds review, claim_check, citation_check, guideline_check; the
 * formatter is citation_check with module "references").
 */
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { requireUser, type AppVariables, type AuthUser } from '../auth.js';
import type { LlmUsage, Slots } from '../slots/types.js';
import { LlmError, llmModelName, llmUnavailable } from '../slots/llm.js';
import { currentUser, meterTokens, parseBody } from '../lib/assist-llm.js';
import { CREDIT_COSTS, creditCost, effectivePlan, refundCredits, requireFeature, spendCredits, type CreditCharge } from '../lib/plans.js';
import { createTask, failTask, finishTask } from '../lib/history.js';
import { resolveAccess } from '../lib/access.js';
import { CHECKS, DOC_TYPES, LEVELS, PREVIEW_WORDS, countWords, referenceSection, runClaimCheck, runReview, splitClaims } from '../lib/reviewer.js';
import { checkReference, checkSupport, citationSummary, mapLimit, splitReferences, type ReferenceInput } from '../lib/reviewerCitations.js';
import { GUIDELINE_MAX_WORDS, runGuidelineCheck } from '../lib/guidelineCheck.js';
import { cleanedInput, cleanupReferences, cslFromFields, formatCheck, mergeResolved, parseReferenceList, referenceSummary, toBibtex, toRis } from '../lib/reviewerReferences.js';
import { GUIDELINE_IDS } from '../../reportingGuidelines.js';

const MAX_WORDS = 150_000;

/** The words of an editor document, headings marked, in reading order. */
export function blocksToText(blocks: any[]): string {
  const out: string[] = [];
  const inline = (content: any): string => (Array.isArray(content) ? content.map((part: any) => part?.text ?? (Array.isArray(part?.content) ? inline(part.content) : '')).join('') : '');
  const walk = (items: any[]) => {
    for (const block of items ?? []) {
      if (block?.type === 'table') {
        for (const tableRow of block?.content?.rows ?? []) out.push((tableRow.cells ?? []).map((cell: any) => inline(Array.isArray(cell) ? cell : cell?.content)).join(' | '));
      } else {
        const text = inline(block?.content);
        if (text.trim()) out.push(block?.type === 'heading' ? `${'#'.repeat(Math.min(3, Number(block?.props?.level) || 1))} ${text}` : text);
      }
      if (Array.isArray(block?.children)) walk(block.children);
    }
  };
  walk(blocks);
  return out.join('\n\n');
}

async function documentText(user: AuthUser, documentId: string) {
  const { document } = await resolveAccess(documentId, user, { blocks: true });
  return { title: String(document.title || 'Untitled document'), text: blocksToText(document.blocks || []) };
}

const ReviewRequest = z.object({
  doc_type: z.enum(DOC_TYPES).default('thesis'),
  level: z.enum(LEVELS).default('masters'),
  quality: z.enum(['standard', 'high']).default('standard'),
  checks: z.array(z.enum(CHECKS)).min(1).default(['structure', 'method', 'citations', 'clarity']),
  template: z.string().max(3000).default(''),
  text: z.string().max(1_500_000).optional(),
  document_id: z.string().max(64).optional(),
  title: z.string().max(200).optional(),
  language: z.string().max(40).nullish(),
  project_id: z.string().max(64).nullish(),
});

const ClaimsRequest = z.object({
  text: z.string().trim().min(10, 'Paste a claim or a paragraph.').max(20_000),
  groups: z.array(z.enum(['papers', 'medical'])).min(1).default(['papers', 'medical']),
  project_id: z.string().max(64).nullish(),
});

const CitationsRequest = z.object({
  text: z.string().max(400_000).optional(),
  references: z.array(z.object({ text: z.string().max(3000), doi: z.string().max(300).nullish(), title: z.string().max(1000).nullish(), year: z.number().int().nullish(), authors: z.array(z.string().max(300)).max(50).nullish() })).max(200).optional(),
  document_id: z.string().max(64).optional(),
  document_text: z.string().max(1_500_000).optional(),
  check_support: z.boolean().default(false),
  title: z.string().max(200).optional(),
  project_id: z.string().max(64).nullish(),
});

const ReferencesRequest = z.object({
  text: z.string().max(1_500_000).optional(),
  document_id: z.string().max(64).optional(),
  ai_cleanup: z.boolean().default(false),
  title: z.string().max(200).optional(),
  project_id: z.string().max(64).nullish(),
});

const GuidelinesRequest = z.object({
  guideline: z.enum(GUIDELINE_IDS),
  text: z.string().max(1_500_000).optional(),
  document_id: z.string().max(64).optional(),
  title: z.string().max(200).optional(),
  language: z.string().max(40).nullish(),
  project_id: z.string().max(64).nullish(),
});

/** What a guideline check costs: per 10,000 words checked (at most GUIDELINE_MAX_WORDS are read). */
export function guidelineCredits(words: number) {
  return creditCost('guideline_check', { units: Math.max(1, Math.ceil(Math.min(words, GUIDELINE_MAX_WORDS) / 10_000)) });
}

/** What a review costs: the preview a flat price; otherwise per 10,000 words. */
export function reviewCredits(words: number, quality: 'standard' | 'high', preview: boolean) {
  if (preview) return CREDIT_COSTS.review_preview;
  return creditCost(quality === 'high' ? 'review_high' : 'review_standard', { units: Math.max(1, Math.ceil(words / 10_000)) });
}

export function reviewerRoutes(slots: Slots) {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use('*', requireUser);

  const llmReady = () => {
    const unavailable = llmUnavailable(slots.llm);
    if (unavailable) throw new HTTPException(503, { message: unavailable });
  };
  const meter = (user: AuthUser, usage: LlmUsage, feature: string, task: 'fast' | 'review' = 'fast') =>
    meterTokens(user, usage, { feature, provider: slots.llm.provider, model: llmModelName(slots.llm, task) });
  const failure = (error: unknown) => (error instanceof HTTPException ? error : error instanceof LlmError ? new HTTPException(error.status, { message: error.message }) : new HTTPException(503, { message: (error as Error)?.message || 'The review stopped. Your credits were returned; try again.' }));

  /** The price of a review before it runs (for the start button). */
  app.post('/review/quote', async (c) => {
    const user = currentUser(c);
    const body = await parseBody(c, z.object({ words: z.number().int().min(0).max(MAX_WORDS * 2), quality: z.enum(['standard', 'high']).default('standard') }));
    const { plan } = await effectivePlan(user.account_id);
    const preview = plan.is_default;
    return c.json({ preview, preview_words: PREVIEW_WORDS, credits: reviewCredits(body.words, body.quality, preview) });
  });

  app.post('/review', async (c) => {
    const user = currentUser(c);
    const body = await parseBody(c, ReviewRequest);
    llmReady();
    let { text = '', title = '' } = body;
    if (body.document_id) ({ text, title } = { ...(await documentText(user, body.document_id)), ...(body.title ? { title: body.title } : {}) });
    const words = countWords(text);
    if (words < 150) throw new HTTPException(422, { message: 'Add at least 150 words to review.' });
    if (words > MAX_WORDS) throw new HTTPException(413, { message: `Documents can be up to ${MAX_WORDS.toLocaleString('en-US')} words; review it chapter by chapter.` });
    const { plan } = await effectivePlan(user.account_id);
    // Free accounts get the preview: the full scorecard on the first 3,000 words and the top three comments.
    const preview = plan.is_default;
    const highQuality = body.quality === 'high' && !preview;
    if (highQuality) await requireFeature(user.account_id, 'high_quality');
    const credits = reviewCredits(words, highQuality ? 'high' : 'standard', preview);
    let charge: CreditCharge | null = await spendCredits(user.account_id, credits, preview ? 'A preview review' : 'This review');
    let taskId: string | null = null;
    try {
      taskId = await createTask(user, {
        kind: 'review', module: body.doc_type, title: title || 'Untitled document', project_id: body.project_id ?? null, credits,
        inputs: { doc_type: body.doc_type, level: body.level, quality: highQuality ? 'high' : 'standard', checks: body.checks, template: body.template, words, document_id: body.document_id ?? null, preview },
      });
      const usage: LlmUsage = { inputTokens: 0, outputTokens: 0 };
      const result = await runReview(slots.llm, { text, title, docType: body.doc_type, level: body.level, checks: body.checks, template: body.template, highQuality, preview, language: body.language }, usage);
      // The reference list, checked against Crossref and OpenAlex (no credits).
      let citations = null;
      if (body.checks.includes('citations')) {
        const list = referenceSection(text);
        const references = list ? splitReferences(list).slice(0, preview ? 10 : 80) : [];
        if (references.length) {
          const checks = await mapLimit(references, 5, (reference, index) => checkReference({ text: reference }, index));
          citations = { checks: checks.map(({ abstract: _abstract, biblio: _biblio, ...rest }) => rest), summary: citationSummary(checks), limited: preview && splitReferences(list!).length > 10 };
        }
      }
      await meter(user, usage, `reviewer:${body.doc_type}`, highQuality ? 'review' : 'fast');
      const saved = { ...result, citations, summary: result.verdict, doc_type: body.doc_type, level: body.level, quality: highQuality ? 'high' : 'standard', title };
      await finishTask(taskId, saved);
      charge = null;
      return c.json({ task_id: taskId, credits, ...saved });
    } catch (error) {
      if (taskId) await failTask(taskId, (error as Error)?.message || 'failed');
      throw failure(error);
    } finally {
      await refundCredits(charge);
    }
  });

  app.post('/guidelines/quote', async (c) => {
    const body = await parseBody(c, z.object({ words: z.number().int().min(0).max(MAX_WORDS * 2) }));
    return c.json({ credits: guidelineCredits(body.words), max_words: GUIDELINE_MAX_WORDS });
  });

  app.post('/guidelines', async (c) => {
    const user = currentUser(c);
    const body = await parseBody(c, GuidelinesRequest);
    llmReady();
    let { text = '', title = '' } = body;
    if (body.document_id) ({ text, title } = { ...(await documentText(user, body.document_id)), ...(body.title ? { title: body.title } : {}) });
    const words = countWords(text);
    if (words < 300) throw new HTTPException(422, { message: 'Add the manuscript (at least 300 words) to check it against a guideline.' });
    if (words > MAX_WORDS) throw new HTTPException(413, { message: `Documents can be up to ${MAX_WORDS.toLocaleString('en-US')} words.` });
    const credits = guidelineCredits(words);
    let charge: CreditCharge | null = await spendCredits(user.account_id, credits, 'This guideline check');
    let taskId: string | null = null;
    try {
      taskId = await createTask(user, { kind: 'guideline_check', module: body.guideline, title: title || 'Untitled manuscript', project_id: body.project_id ?? null, credits, inputs: { guideline: body.guideline, words, document_id: body.document_id ?? null } });
      const usage: LlmUsage = { inputTokens: 0, outputTokens: 0 };
      const result = await runGuidelineCheck(slots.llm, { guideline: body.guideline, text, title, language: body.language }, usage);
      await meter(user, usage, `reviewer:guideline:${body.guideline}`);
      await finishTask(taskId, result);
      charge = null;
      return c.json({ task_id: taskId, credits, ...result });
    } catch (error) {
      if (taskId) await failTask(taskId, (error as Error)?.message || 'failed');
      throw failure(error);
    } finally {
      await refundCredits(charge);
    }
  });

  app.post('/claims', async (c) => {
    const user = currentUser(c);
    const body = await parseBody(c, ClaimsRequest);
    llmReady();
    let charge: CreditCharge | null = await spendCredits(user.account_id, CREDIT_COSTS.review, 'A claim check');
    let taskId: string | null = null;
    try {
      taskId = await createTask(user, { kind: 'claim_check', title: body.text.slice(0, 120), project_id: body.project_id ?? null, credits: CREDIT_COSTS.review, inputs: { text: body.text, groups: body.groups } });
      const usage: LlmUsage = { inputTokens: 0, outputTokens: 0 };
      const claims = await splitClaims(slots.llm, body.text, usage);
      const results = await runClaimCheck(slots.llm, claims, { userId: user.id, groups: body.groups }, usage);
      await meter(user, usage, 'reviewer:claims');
      const counts = { supported: 0, partly: 0, not_supported: 0, no_evidence: 0 };
      for (const result of results) counts[result.verdict] += 1;
      const summary = `${results.length} claim${results.length === 1 ? '' : 's'}: ${counts.supported} supported, ${counts.partly} partly, ${counts.not_supported} not supported, ${counts.no_evidence} without evidence found.`;
      const saved = { claims: results, counts, summary };
      await finishTask(taskId, saved);
      charge = null;
      return c.json({ task_id: taskId, credits: CREDIT_COSTS.review, ...saved });
    } catch (error) {
      if (taskId) await failTask(taskId, (error as Error)?.message || 'failed');
      throw failure(error);
    } finally {
      await refundCredits(charge);
    }
  });

  /** Reference list formatter: parse, merge duplicates, verify, and return CSL-JSON, RIS and BibTeX. Free; the AI cleanup costs ai_edit. */
  app.post('/references', async (c) => {
    const user = currentUser(c);
    const body = await parseBody(c, ReferencesRequest);
    let list = body.text?.trim() ?? '';
    let title = body.title ?? '';
    if (body.document_id) {
      const doc = await documentText(user, body.document_id);
      list = referenceSection(doc.text) || '';
      title ||= doc.title;
    } else {
      // A whole paper pasted or uploaded: use its References section when it has one.
      list = referenceSection(`\n${list}`) || list;
    }
    const parsed = parseReferenceList(list);
    if (!parsed.references.length) throw new HTTPException(422, { message: 'Paste a reference list (one reference per line or numbered), upload one, or choose a document with a References section.' });
    let charge: CreditCharge | null = null;
    let taskId: string | null = null;
    let credits = 0;
    try {
      taskId = await createTask(user, { kind: 'citation_check', module: 'references', title: title || `${parsed.references.length} references`, project_id: body.project_id ?? null, credits: 0, inputs: { references: parsed.total, ai_cleanup: body.ai_cleanup } });
      const checks = await mapLimit(parsed.references, 5, (reference) => checkReference({ text: reference.text, doi: reference.doi, title: reference.title, year: reference.year }, reference.index));
      let items = parsed.references.map((reference, i) => formatCheck(reference, checks[i]));
      const unresolved = items.filter((item) => item.status === 'unverified');
      if (body.ai_cleanup && unresolved.length) {
        llmReady();
        credits = CREDIT_COSTS.ai_edit;
        charge = await spendCredits(user.account_id, credits, 'The AI cleanup');
        const usage: LlmUsage = { inputTokens: 0, outputTokens: 0 };
        const cleaned = await cleanupReferences(slots.llm, unresolved, usage);
        await meter(user, usage, 'reviewer:references-cleanup');
        const retried = await mapLimit(unresolved, 5, async (item) => {
          const fields = cleaned.get(item.index);
          if (!fields) return item;
          const input = cleanedInput(item, fields);
          const again = input.doi || input.title ? await checkReference(input, item.index) : null;
          const reference = { index: item.index, text: item.text, doi: input.doi ?? null, title: input.title ?? null, year: input.year ?? null, firstAuthor: null, duplicates: item.duplicates };
          const verified = again ? formatCheck(reference, again) : null;
          if (verified?.status === 'verified') return { ...verified, problems: ['Found after the AI cleanup: compare it with what you typed.', ...verified.problems] };
          const csl = cslFromFields(fields, `ref${item.index + 1}`);
          return csl ? { ...item, status: 'cleaned' as const, csl, problems: ['Cleaned by AI but not found in Crossref or OpenAlex: check it by hand.'] } : item;
        });
        const byIndex = new Map(retried.map((item) => [item.index, item]));
        items = items.map((item) => byIndex.get(item.index) ?? item);
      }
      items = mergeResolved(items);
      const duplicatesRemoved = parsed.total - items.length;
      const { counts, summary } = referenceSummary(items, duplicatesRemoved);
      const saved = { references: items, counts, total: items.length, duplicates_removed: duplicatesRemoved, ris: toRis(items), bibtex: toBibtex(items), summary, ai_cleanup: Boolean(charge) };
      await finishTask(taskId, saved);
      charge = null;
      return c.json({ task_id: taskId, credits, ...saved });
    } catch (error) {
      if (taskId) await failTask(taskId, (error as Error)?.message || 'failed');
      throw failure(error);
    } finally {
      await refundCredits(charge);
    }
  });

  app.post('/citations', async (c) => {
    const user = currentUser(c);
    const body = await parseBody(c, CitationsRequest);
    let documentBody = body.document_text ?? '';
    let title = body.title ?? '';
    if (body.document_id) {
      const doc = await documentText(user, body.document_id);
      documentBody = doc.text;
      title ||= doc.title;
    }
    let references: ReferenceInput[] = body.references?.length ? body.references.map((item) => ({ ...item, text: item.text || item.title || '' })) : [];
    if (!references.length) {
      const list = body.text?.trim() || referenceSection(documentBody) || '';
      references = splitReferences(list).map((text) => ({ text }));
    }
    if (!references.length) throw new HTTPException(422, { message: 'Paste a reference list (one reference per line or numbered), or choose a document with a References section.' });
    references = references.slice(0, 200);
    if (body.check_support) {
      llmReady();
      if (!documentBody.trim()) throw new HTTPException(422, { message: 'Checking that sentences match their sources needs the document text too.' });
    }
    const credits = body.check_support ? CREDIT_COSTS.review : 0;
    let charge: CreditCharge | null = credits ? await spendCredits(user.account_id, credits, 'The source check') : null;
    let taskId: string | null = null;
    try {
      taskId = await createTask(user, { kind: 'citation_check', title: title || `${references.length} references`, project_id: body.project_id ?? null, credits, inputs: { references: references.length, check_support: body.check_support } });
      const checks = await mapLimit(references, 5, (reference, index) => checkReference(reference, index));
      let pairs = 0;
      if (body.check_support) {
        const usage: LlmUsage = { inputTokens: 0, outputTokens: 0 };
        pairs = await checkSupport(slots.llm, documentBody, checks, usage);
        await meter(user, usage, 'reviewer:citation-support');
      }
      const summary = citationSummary(checks);
      const problems = checks.length - summary.counts.ok;
      const saved = {
        checks: checks.map(({ abstract: _abstract, biblio: _biblio, ...rest }) => rest), counts: summary.counts, total: summary.total, support_pairs: pairs,
        summary: `${summary.total} references checked: ${summary.counts.ok} fine, ${problems} to look at${summary.counts.retracted ? `, ${summary.counts.retracted} retracted` : ''}.`,
      };
      await finishTask(taskId, saved);
      charge = null;
      return c.json({ task_id: taskId, credits, ...saved });
    } catch (error) {
      if (taskId) await failTask(taskId, (error as Error)?.message || 'failed');
      throw failure(error);
    } finally {
      await refundCredits(charge);
    }
  });

  return app;
}
