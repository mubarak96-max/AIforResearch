/**
 * "Draw with AI" for the editor's diagram block, mounted at /api/ai-editor/diagram:
 *   POST /   { prompt, kind, context?, language? } -> { source }   (Mermaid source)
 * Costs `short` credits, taken before the model call and given back when no usable diagram comes
 * back (one retry first). The browser parses the source with mermaid before inserting it.
 */
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { requireUser, type AppVariables } from '../auth.js';
import type { Slots } from '../slots/types.js';
import { llmUnavailable } from '../slots/llm.js';
import { completeMetered, currentUser, parseBody, toHttpError } from '../lib/assist-llm.js';
import { CREDIT_COSTS, refundCredits, spendCredits } from '../lib/plans.js';
import { DIAGRAM_KINDS, cleanMermaidSource, diagramPrompt, type DiagramKind } from '../lib/diagram.js';

const DiagramRequest = z.object({
  prompt: z.string().trim().min(3, 'Say what to draw.').max(4000),
  kind: z.enum(Object.keys(DIAGRAM_KINDS) as [DiagramKind, ...DiagramKind[]]).default('flowchart'),
  context: z.string().max(20_000).nullish(),
  language: z.string().trim().max(40).nullish(),
});

export function diagramRoutes(slots: Slots) {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use('*', requireUser);

  app.post('/', async (c) => {
    const user = currentUser(c);
    const body = await parseBody(c, DiagramRequest);
    const unavailable = llmUnavailable(slots.llm);
    if (unavailable) throw new HTTPException(503, { message: unavailable });
    const charge = await spendCredits(user.account_id, CREDIT_COSTS.short, 'Diagram');
    try {
      const messages = diagramPrompt(body);
      let source: string | null = null;
      for (let attempt = 0; attempt < 2 && !source; attempt += 1) {
        const raw = await completeMetered(slots.llm, user, { messages, task: 'fast', temperature: attempt ? 0.1 : 0.3, maxTokens: 1500 }, { feature: 'diagram' });
        source = cleanMermaidSource(raw);
      }
      if (!source) throw new HTTPException(422, { message: 'No diagram came back. Try describing it differently; your credit was returned.' });
      return c.json({ source, credits: CREDIT_COSTS.short });
    } catch (error) {
      await refundCredits(charge);
      throw error instanceof HTTPException ? error : toHttpError(error);
    }
  });

  return app;
}
