/**
 * Survey builder.
 *   /api/surveys (signed in):
 *     GET    /                     the person's surveys and those in their projects
 *     POST   /                     a new survey (blank, or from a definition)
 *     GET    /:id                  the survey, with the person's role
 *     PUT    /:id                  save the definition (revision checked; no breaking changes once responses exist)
 *     POST   /:id/status           open (makes the public link), close, or back to draft (no responses yet)
 *     DELETE /:id                  delete with every response (owner)
 *     GET    /:id/responses        responses as CSV, for Data Lab, R, SPSS or Excel
 *     DELETE /:id/responses        delete every response (e.g. after a pilot)
 *     GET    /:id/scoring          the scales Data Lab uses to score the responses
 *     POST   /:id/ai/draft         questions drafted from the study's aims (CREDIT_COSTS.section)
 *     POST   /:id/ai/review        the questionnaire checked for leading, double-barrelled or unclear questions (CREDIT_COSTS.review)
 *   /api/public/surveys (no account): GET /:publicId, POST /:publicId/responses (rate-limited, anonymous).
 */
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { requireUser, type AppVariables } from '../auth.js';
import type { LlmUsage, Slots } from '../slots/types.js';
import { LlmError, llmModelName, llmUnavailable } from '../slots/llm.js';
import { currentUser, meterTokens, parseBody } from '../lib/assist-llm.js';
import { CREDIT_COSTS, refundCredits, spendCredits, type CreditCharge } from '../lib/plans.js';
import { listProjects } from '../lib/projects.js';
import { parseJson } from '../lib/research.js';
import { rateLimit } from '../lib/rateLimit.js';
import {
  Definition, clearResponses, createSurvey, deleteSurvey, listSurveys, loadResponses, publicSurvey, publicView, saveSurvey, setStatus, submitResponse, summary, surveyFor,
} from '../lib/surveys.js';
import { allQuestions, codeFrom, emptySurvey, responsesCsv, surveyProblems, type SurveyDefinition, type SurveyQuestion } from '../../surveyModel.js';

const DraftBody = z.object({
  aims: z.string().trim().min(10, 'Describe what the survey should find out.').max(4000),
  population: z.string().trim().max(500).default(''),
  count: z.number().int().min(3).max(30).default(12),
  language: z.string().trim().max(40).nullish(),
});

export function draftPrompt(body: z.infer<typeof DraftBody>, existing: SurveyQuestion[]) {
  return [
    {
      role: 'system' as const,
      content: 'You design research questionnaires. Write clear, neutral questions: one idea per question, no leading or loaded wording, no double negatives, answer options that are exhaustive and do not overlap (add "Prefer not to say" to sensitive questions and "Other" where the list may be incomplete). ' +
        'Prefer closed questions that can be analysed; use a few open questions where needed. Use rating scales (likert) for attitudes and experiences, with the same scale for items that will be combined. ' +
        'Never reproduce a copyrighted questionnaire; if a validated instrument fits, say so in "suggest_instruments" by name instead of copying it. ' +
        `Write in ${body.language || 'the language of the aims'}. Answer with JSON only: {"sections": [{"title": "...", "questions": [{"text": "...", "type": "single|multiple|likert|number|text|long_text", "options": ["..."], "required": true, "help": "optional"}]}], "suggest_instruments": ["name: why"], "notes": "one or two sentences on the design"}`,
    },
    { role: 'user' as const, content: `Draft about ${body.count} questions.\nWhat the survey should find out: ${body.aims}\nWho answers it: ${body.population || 'not stated'}${existing.length ? `\nQuestions already in the survey (do not repeat them): ${existing.slice(0, 60).map((question) => question.text).join(' | ')}` : ''}` },
  ];
}

/** Model output → sections of valid questions with fresh ids and codes. Pure, for tests. */
export function draftToSections(raw: any, taken: Set<string>, id: () => string): SurveyDefinition['sections'] {
  const str = (value: unknown, max: number) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '');
  const types = new Set(['single', 'multiple', 'likert', 'number', 'text', 'long_text']);
  return (Array.isArray(raw?.sections) ? raw.sections : []).slice(0, 10).map((section: any) => ({
    id: id(), title: str(section?.title, 200),
    questions: (Array.isArray(section?.questions) ? section.questions : []).slice(0, 40).flatMap((question: any): SurveyQuestion[] => {
      const text = str(question?.text, 1000);
      const type = types.has(question?.type) ? question.type : 'text';
      const labels = (Array.isArray(question?.options) ? question.options : []).map((option: unknown) => str(option, 300)).filter(Boolean).slice(0, 30);
      if (!text || (['single', 'multiple', 'likert'].includes(type) && labels.length < 2)) return [];
      const options = ['single', 'multiple', 'likert'].includes(type) ? labels.map((label: string, i: number) => ({ value: String(i + 1), label })) : undefined;
      return [{ id: id(), code: codeFrom(text, taken), type, text, required: question?.required !== false, ...(options ? { options } : {}), ...(str(question?.help, 500) ? { help: str(question.help, 500) } : {}) }];
    }),
  })).filter((section: { questions: unknown[] }) => section.questions.length);
}

export function reviewPrompt(definition: SurveyDefinition, language?: string | null) {
  const listing = allQuestions(definition).map((question) => `${question.code} [${question.type}${question.instrument ? `, validated instrument ${question.instrument}: do not suggest rewording` : ''}]: ${question.text}${question.options?.length ? ` | answers: ${question.options.map((option) => option.label).join(' / ')}` : ''}`).join('\n');
  return [
    {
      role: 'system' as const,
      content: 'You review research questionnaires before they are piloted, as a survey methodologist would. For each question with a real problem, name it: leading or loaded wording, double-barrelled, ambiguous or vague terms, jargon, double negatives, answer options that overlap, miss a likely answer or lack "Prefer not to say" for a sensitive topic, an unbalanced rating scale, recall that is too hard, or a question that does not serve the stated survey. ' +
        'Also note problems with the order or length of the whole questionnaire and with the consent text. Do not rewrite items of validated instruments. Skip questions without problems. ' +
        `Write in ${language || 'the language of the questionnaire'}. Answer with JSON only: {"overall": "two or three sentences", "comments": [{"code": "variable code or null for the whole survey", "severity": "major|minor", "issue": "...", "fix": "a concrete rewrite or change"}]}`,
    },
    { role: 'user' as const, content: `Survey: ${definition.title}\nIntroduction: ${definition.intro.slice(0, 2000) || '(none)'}\nConsent: ${definition.consent.slice(0, 2000) || '(none)'}\n\nQuestions:\n${listing}` },
  ];
}

export function surveyRoutes(slots: Slots) {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use('*', requireUser);

  const llmReady = () => { const unavailable = llmUnavailable(slots.llm); if (unavailable) throw new HTTPException(503, { message: unavailable }); };
  async function charged<T>(accountId: string, credits: number, label: string, work: () => Promise<T>): Promise<T> {
    let charge: CreditCharge | null = await spendCredits(accountId, credits, label);
    try { const result = await work(); charge = null; return result; }
    catch (error) { if (error instanceof LlmError) throw new HTTPException(error.status, { message: error.message }); throw error; }
    finally { await refundCredits(charge); }
  }

  app.get('/', async (c) => {
    const user = currentUser(c);
    const projects = await listProjects(user);
    return c.json({ surveys: (await listSurveys(user, projects.map((project: { id: string }) => project.id))).map(summary) });
  });

  app.post('/', async (c) => {
    const user = currentUser(c);
    const body = await parseBody(c, z.object({ title: z.string().trim().min(1).max(200), project_id: z.string().max(64).nullish(), definition: Definition.optional() }));
    const definition = body.definition ? { ...body.definition, title: body.title } : emptySurvey(body.title);
    const survey = await createSurvey(user, definition as SurveyDefinition, body.project_id ?? null);
    return c.json({ id: survey.id });
  });

  app.get('/:id', async (c) => {
    const { survey, role, canEdit } = await surveyFor(currentUser(c), c.req.param('id'));
    return c.json({ survey, role, can_edit: canEdit, problems: surveyProblems(survey) });
  });

  app.put('/:id', async (c) => {
    const body = await parseBody(c, z.object({ definition: Definition, revision: z.number().int().min(1) }));
    const survey = await saveSurvey(currentUser(c), c.req.param('id'), body.definition as SurveyDefinition, body.revision);
    return c.json({ revision: survey.revision, updated_at: survey.updated_at });
  });

  app.post('/:id/status', async (c) => {
    const body = await parseBody(c, z.object({ status: z.enum(['draft', 'open', 'closed']) }));
    const survey = await setStatus(currentUser(c), c.req.param('id'), body.status);
    return c.json({ status: survey.status, public_id: survey.public_id });
  });

  app.delete('/:id', async (c) => {
    await deleteSurvey(currentUser(c), c.req.param('id'));
    return c.json({ ok: true });
  });

  app.get('/:id/responses', async (c) => {
    const { survey } = await surveyFor(currentUser(c), c.req.param('id'));
    const found = await loadResponses(survey.id);
    return c.json({ count: found.length, csv: responsesCsv(survey, found) });
  });

  app.delete('/:id/responses', async (c) => {
    await clearResponses(currentUser(c), c.req.param('id'));
    return c.json({ ok: true });
  });

  app.get('/:id/scoring', async (c) => {
    const { survey } = await surveyFor(currentUser(c), c.req.param('id'));
    return c.json({ title: survey.title, scales: survey.scales, responses: survey.response_count });
  });

  app.post('/:id/ai/draft', async (c) => {
    const user = currentUser(c);
    const { survey } = await surveyFor(user, c.req.param('id'), 'edit');
    const body = await parseBody(c, DraftBody);
    llmReady();
    return c.json(await charged(user.account_id, CREDIT_COSTS.section, 'Drafting survey questions', async () => {
      const { text, usage } = await slots.llm.complete({ messages: draftPrompt(body, allQuestions(survey)), task: 'fast', json: true, temperature: 0.4, maxTokens: 4000 });
      await meterTokens(user, usage, { feature: 'survey:draft', provider: slots.llm.provider, model: llmModelName(slots.llm, 'fast') });
      const raw = parseJson<any>(text);
      const taken = new Set(allQuestions(survey).map((question) => question.code.toLowerCase()));
      let n = 0;
      const sections = draftToSections(raw, taken, () => `d${Date.now().toString(36)}${(n++).toString(36)}`);
      if (!sections.length) throw new HTTPException(503, { message: 'No questions came back. Your credits were returned; try again.' });
      const instruments = (Array.isArray(raw?.suggest_instruments) ? raw.suggest_instruments : []).filter((item: unknown) => typeof item === 'string').slice(0, 5).map((item: string) => item.slice(0, 300));
      return { sections, suggest_instruments: instruments, notes: typeof raw?.notes === 'string' ? raw.notes.slice(0, 800) : '', credits: CREDIT_COSTS.section };
    }));
  });

  app.post('/:id/ai/review', async (c) => {
    const user = currentUser(c);
    const { survey } = await surveyFor(user, c.req.param('id'));
    const body = await parseBody(c, z.object({ language: z.string().trim().max(40).nullish() }));
    if (!allQuestions(survey).length) throw new HTTPException(422, { message: 'Add some questions first.' });
    llmReady();
    return c.json(await charged(user.account_id, CREDIT_COSTS.review, 'Checking the questionnaire', async () => {
      const usage: LlmUsage = { inputTokens: 0, outputTokens: 0 };
      const { text, usage: used } = await slots.llm.complete({ messages: reviewPrompt(survey, body.language), task: 'fast', json: true, temperature: 0.2, maxTokens: 3000 });
      usage.inputTokens += used.inputTokens; usage.outputTokens += used.outputTokens;
      await meterTokens(user, usage, { feature: 'survey:review', provider: slots.llm.provider, model: llmModelName(slots.llm, 'fast') });
      const raw = parseJson<any>(text);
      if (!raw) throw new HTTPException(503, { message: 'The check could not be completed. Your credits were returned; try again.' });
      const codes = new Set(allQuestions(survey).map((question) => question.code));
      const comments = (Array.isArray(raw.comments) ? raw.comments : []).slice(0, 60).map((comment: any) => ({
        code: typeof comment?.code === 'string' && codes.has(comment.code) ? comment.code : null,
        severity: comment?.severity === 'major' ? 'major' : 'minor',
        issue: typeof comment?.issue === 'string' ? comment.issue.slice(0, 600) : '',
        fix: typeof comment?.fix === 'string' ? comment.fix.slice(0, 600) : '',
      })).filter((comment: { issue: string }) => comment.issue);
      return { overall: typeof raw.overall === 'string' ? raw.overall.slice(0, 1000) : '', comments, credits: CREDIT_COSTS.review };
    }));
  });

  return app;
}

/** The public form: no account, anonymous, rate-limited. */
export function publicSurveyRoutes() {
  const app = new Hono();
  const limited = rateLimit({ key: 'survey-response', limit: 30, windowSeconds: 3600 });

  app.get('/:publicId', async (c) => {
    const survey = await publicSurvey(c.req.param('publicId'));
    if (!survey) throw new HTTPException(404, { message: 'This survey does not exist or has been removed.' });
    c.header('Cache-Control', 'no-store');
    c.header('X-Robots-Tag', 'noindex');
    return c.json(publicView(survey));
  });

  app.post('/:publicId/responses', limited, async (c) => {
    const body = await parseBody(c, z.object({ answers: z.record(z.string().max(40), z.unknown()).refine((value) => Object.keys(value).length <= 400), consent: z.boolean().default(false), website: z.string().max(200).optional() }));
    // A filled hidden field means a bot; answer as if it worked and store nothing.
    if (body.website) return c.json({ ok: true, thank_you: 'Thank you for taking part.' });
    const result = await submitResponse(c.req.param('publicId'), body.answers, body.consent);
    return c.json({ ok: true, ...result });
  });

  return app;
}
