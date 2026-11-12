/**
 * The Review panel's Evidence check (POST /api/ai-editor/evidence): does each cited source say
 * what the sentence citing it says, and is any sentence copied from a source? See lib/evidence.ts.
 */
import { Hono } from 'hono';
import { planQuota } from '../lib/plans.js';
import { z } from 'zod';
import { requireUser, type AppVariables } from '../auth.js';
import type { Slots } from '../slots/types.js';
import { currentUser, parseBody, withHttpErrors } from '../lib/assist-llm.js';
import { checkEvidence } from '../lib/evidence.js';

const text = z.string().max(2000).nullish();

const EvidenceRequest = z.object({
  blocks: z.array(z.object({
    id: z.string().min(1).max(100),
    text: z.string().max(12000),
    citations: z.array(z.object({
      placeholder: z.string().max(40),
      label: z.string().max(300).default(''),
      library_document_id: z.string().max(100).nullish(),
      doi: z.string().max(300).nullish(),
      title: text,
      evidence_quote: z.string().max(3000).nullish(),
      evidence_page: z.number().int().min(0).max(100000).nullish(),
    })).max(60).default([]),
  })).min(1).max(2000),
  language: z.string().max(40).nullish(),
  /** Also compare sentences without a citation with the Library (free: no AI). */
  library: z.boolean().default(true),
});

export function evidenceRoutes(slots: Slots) {
  const app = new Hono<{ Variables: AppVariables }>();
  // Claim check in the editor: CREDIT_COSTS.review, back when it fails.
  app.post('/evidence', requireUser, planQuota('review'), async (c) => {
    const user = currentUser(c);
    const body = await parseBody(c, EvidenceRequest);
    return withHttpErrors(async () => c.json(await checkEvidence(slots, user, body.blocks, { language: body.language, library: body.library })));
  });
  return app;
}
