/**
 * The standalone tools (/tools/[slug]) without an account:
 *   POST /api/tools/run/:slug   an AI tool from lib/tools.ts; grounded tools search papers first
 *   GET  /api/tools/cite?q=     papers for the citation generator, as CSL-JSON
 *
 * Signed-out visitors get ANON_DAILY_RUNS AI runs a day per address and shorter inputs; signed-in
 * people use their plan's AI edit or Write with AI allowance, metered like the editor.
 */
import { Hono, type Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import type { AppVariables, AuthUser } from '../auth.js';
import type { Slots } from '../slots/types.js';
import { searchParams, cleanDoi, type PagedPapersSlot } from '../slots/papers.js';
import { LlmError } from '../slots/llm.js';
import { completeMetered, toHttpError } from '../lib/assist-llm.js';
import { CREDIT_COSTS, refundCredits, spendCredits, type CreditCharge } from '../lib/plans.js';
import { rateLimit } from '../lib/rateLimit.js';
import { getFirst, isCitableWork, papersSlots, toPaperRecord, workToCsl, type PaperRecord } from '../lib/directory.js';
import { buildToolPrompt, cleanMarkers, hasToolPrompt, type ToolInputs } from '../lib/toolPrompts.js';
import { ANON_DAILY_RUNS, getTool, type Tool, type ToolField } from '../../tools.js';

/** What a tool costs signed in, in credits (lib/server/lib/plans.ts): rewrites 1, sections 3, reports and drafts more. */
const TOOL_CREDITS: Record<string, number> = {
  'paraphrasing-tool': CREDIT_COSTS.ai_edit,
  humanizer: CREDIT_COSTS.ai_edit,
  'abstract-generator': CREDIT_COSTS.section,
  'research-gap-finder': CREDIT_COSTS.section,
  'thesis-chapter-planner': CREDIT_COSTS.section,
  'deep-research': CREDIT_COSTS.deep,
};
export const toolCredits = (slug: string) => TOOL_CREDITS[slug] ?? CREDIT_COSTS.write;

export type ToolSource = {
  marker: string;
  id: string;
  title: string;
  authors: string[];
  moreAuthors: number;
  year: number | null;
  venue: string | null;
  volume: string | null;
  issue: string | null;
  firstPage: string | null;
  lastPage: string | null;
  doi: string | null;
  type: string | null;
};

/** The request body for a tool, from its fields: selects must be one of their options. */
export function inputSchema(tool: Tool, signedIn: boolean) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of tool.fields ?? []) shape[field.name] = fieldSchema(field, signedIn);
  return z.object(shape);
}

function fieldSchema(field: ToolField, signedIn: boolean): z.ZodTypeAny {
  if (field.kind === 'select') {
    const values = (field.options ?? []).map(([value]) => value);
    return z.string().optional().transform((value) => (value && values.includes(value) ? value : values[0]));
  }
  const max = signedIn ? field.max : field.anonMax ?? field.max;
  const text = z.string().trim().max(max, signedIn ? `Keep ${field.label.toLowerCase()} under ${max.toLocaleString('en-US')} characters.` : `Signed out, ${field.label.toLowerCase()} can be up to ${max.toLocaleString('en-US')} characters. Sign in for longer texts.`);
  if (field.required) return text.min(field.min ?? 1, `Add ${field.label.toLowerCase()}${field.min && field.min > 1 ? ` (at least ${field.min} characters)` : ''}.`);
  return text.optional().transform((value) => value ?? '');
}

function toSource(record: PaperRecord, marker: string): ToolSource {
  const { paper } = record;
  return {
    marker,
    id: paper.id,
    title: paper.title,
    authors: record.authors.slice(0, 20).map((author) => author.name),
    moreAuthors: Math.max(0, record.authors.length - 20) + record.moreAuthors,
    year: paper.year,
    venue: paper.venue,
    volume: paper.volume ?? null,
    issue: paper.issue ?? null,
    firstPage: paper.first_page ?? null,
    lastPage: paper.last_page ?? null,
    doi: paper.doi,
    type: paper.type,
  };
}

/**
 * Up to ten papers for a topic, most relevant first: a plain relevance search, one limited to
 * papers with 10+ citations (sorting by citations instead drifts off topic) and, for gaps, recent
 * ones. Index pages, errata and authorless records are dropped. When the configured index gives
 * fewer than four usable papers, public OpenAlex is asked too.
 */
export async function findSources(slots: PagedPapersSlot[], topic: string, { recent = false } = {}): Promise<PaperRecord[]> {
  const year = new Date().getUTCFullYear();
  const seen = new Set<string>();
  const records: PaperRecord[] = [];
  for (const slot of slots) {
    const base = searchParams({ query: topic }, 10);
    const searches = [
      base,
      { ...searchParams({ query: topic, minCitations: 10 }, 6) },
      ...(recent ? [searchParams({ query: topic, fromYear: year - 4 }, 6)] : []),
    ];
    const pages = await Promise.all(searches.map((params) => slot.get('works', params).catch(() => null)));
    for (const page of pages) {
      for (const work of Array.isArray(page?.results) ? page.results : []) {
        if (!isCitableWork(work)) continue;
        const record = toPaperRecord(work, slot.provider);
        if (!record || seen.has(record.paper.id)) continue;
        seen.add(record.paper.id);
        records.push(record);
      }
    }
    if (records.length >= 4) break;
  }
  // Papers with abstracts first (the model can only cite what it can read); search order otherwise.
  records.sort((a, b) => Number(Boolean(b.paper.abstract)) - Number(Boolean(a.paper.abstract)));
  return records.slice(0, 10);
}

export function toolRoutes(slots: Slots) {
  const app = new Hono<{ Variables: AppVariables }>();
  const anonRuns = rateLimit({ key: 'tools-ai', limit: ANON_DAILY_RUNS, windowSeconds: 86_400 });
  const anonLookups = rateLimit({ key: 'tools-cite', limit: 120, windowSeconds: 3_600 });

  /** Counts a signed-out run, with a message that says what to do instead of "too many attempts". */
  async function allowAnonymous(c: Context) {
    try {
      await anonRuns(c, async () => undefined);
    } catch (error) {
      if (error instanceof HTTPException && error.status === 429) {
        throw new HTTPException(429, { message: `You have used today’s ${ANON_DAILY_RUNS} free runs. Create a free account to keep going.` });
      }
      throw error;
    }
  }

  app.post('/run/:slug', async (c) => {
    const tool = getTool(c.req.param('slug'));
    if (!tool || tool.kind !== 'ai' || !hasToolPrompt(tool.slug)) throw new HTTPException(404, { message: 'No such tool.' });
    const user = c.get('user') as AuthUser | undefined;

    const raw = await c.req.json().catch(() => null);
    const parsed = inputSchema(tool, Boolean(user)).safeParse(raw ?? {});
    if (!parsed.success) throw new HTTPException(422, { message: parsed.error.issues[0]?.message || 'Check the form and try again.' });
    const inputs = parsed.data as ToolInputs;

    let charge: CreditCharge | null = null;
    if (user) charge = await spendCredits(user.account_id, toolCredits(tool.slug), tool.name);
    else await allowAnonymous(c);
    try {
      let records: PaperRecord[] = [];
      if (tool.grounded) {
        records = await findSources(papersSlots(), inputs.topic, { recent: tool.slug === 'research-gap-finder' }).catch(() => []);
        if (!records.length) throw new HTTPException(422, { message: 'No papers found for that topic. Try broader or different words.' });
      }
      const sources = records.map((record, index) => toSource(record, `S${index + 1}`));
      const prompt = buildToolPrompt(tool.slug, inputs, records.map((record, index) => ({
        marker: `S${index + 1}`, title: record.paper.title, authors: record.authors.map((a) => a.name), year: record.paper.year, venue: record.paper.venue, abstract: record.paper.abstract,
      })));

      let text: string;
      try {
        text = user
          ? await completeMetered(slots.llm, user, prompt, { feature: `tool:${tool.slug}` })
          : (await slots.llm.complete(prompt)).text;
      } catch (error) {
        if (error instanceof LlmError) throw toHttpError(error);
        throw new HTTPException(503, { message: 'The AI is busy. Try again in a minute.' });
      }

      const { text: markdown, used } = cleanMarkers(text.trim(), new Set(sources.map((source) => source.marker)));
      if (!markdown) throw new HTTPException(503, { message: 'The AI returned nothing. Try again.' });
      charge = null;
      return c.json({ markdown, sources: sources.filter((source) => used.includes(source.marker)), credits: user ? toolCredits(tool.slug) : 0 });
    } finally {
      // Anything that stopped the tool before an answer gives the credits back.
      await refundCredits(charge);
    }
  });

  app.get('/cite', async (c) => {
    if (!c.get('user')) await anonLookups(c, async () => undefined);
    const query = (c.req.query('q') || '').trim().slice(0, 300);
    if (query.length < 3) return c.json({ results: [] });
    const doi = cleanDoi(query.match(/10\.\d{4,9}\/\S+/)?.[0] ?? '');
    try {
      if (doi) {
        const hit = await getFirst(`works/doi:${encodeURI(doi).replace(/#/g, '%23').replace(/\?/g, '%3F')}`);
        const item = hit ? workToCsl(hit.data) : null;
        return c.json({ results: item ? [item] : [] });
      }
      // The configured index first; public OpenAlex when it has nothing usable.
      for (const slot of papersSlots()) {
        const page = await slot.get('works', searchParams({ query }, 8)).catch(() => null);
        const works = (Array.isArray(page?.results) ? page.results : []).filter(isCitableWork);
        if (works.length) return c.json({ results: works.slice(0, 6).map(workToCsl).filter(Boolean) });
      }
      return c.json({ results: [] });
    } catch {
      throw new HTTPException(503, { message: 'Search is busy. Try again in a minute.' });
    }
  });

  return app;
}
