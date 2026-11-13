/**
 * Document converter, mounted at /api/convert (signed in, no credits):
 *   POST /   multipart `file` (PDF, .docx or .pptx) -> { title, kind, markdown, words, truncated, warnings }
 * Files are checked for type before size, and against the plan's upload size; nothing is stored.
 */
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { requireUser, type AppVariables } from '../auth.js';
import { currentUser } from '../lib/assist-llm.js';
import { PlanLimitError, effectivePlan } from '../lib/plans.js';
import { rateLimit } from '../lib/rateLimit.js';
import { MAX_CONVERT_BYTES, checkConvertFile, convertToMarkdown, convertType } from '../lib/convertMarkdown.js';

export function convertRoutes() {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use('*', requireUser);
  const limit = rateLimit({ key: 'convert', limit: 60, windowSeconds: 3600 });

  app.post('/', limit, async (c) => {
    const user = currentUser(c);
    const form = await c.req.formData().catch(() => null);
    const file = form?.get('file');
    if (!file || typeof file === 'string') throw new HTTPException(422, { message: 'Choose a file to convert.' });
    const name = file.name || 'document';
    // The type first, from the name, before the file is read.
    if (!convertType(name)) throw new HTTPException(415, { message: 'Choose a PDF, Word (.docx) or PowerPoint (.pptx) file.' });
    if (file.size > MAX_CONVERT_BYTES) throw new HTTPException(413, { message: `Files can be up to ${MAX_CONVERT_BYTES / 1024 / 1024} MB.` });
    // The plan's upload size (the same limit as Library PDFs): 402, so the browser offers an upgrade.
    const { plan, limits } = await effectivePlan(user.account_id);
    if (limits.upload_mb !== null && file.size > limits.upload_mb * 1024 * 1024) {
      throw new PlanLimitError(`Your ${plan.name} plan converts files up to ${limits.upload_mb} MB. Upgrade for larger files.`, 'upload_mb', plan.id);
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    checkConvertFile(name, bytes);
    return c.json(await convertToMarkdown(name, bytes));
  });

  return app;
}
