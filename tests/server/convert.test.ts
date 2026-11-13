import { beforeEach, describe, expect, it, vi } from 'vitest';

const fake = await vi.hoisted(async () => (await import('./fakeFirestore.js')).createFakeFirestore());
vi.mock('../../lib/server/firebase.js', async (original) => ({ ...(await original<typeof import('../../lib/server/firebase.js')>()), ...fake.module }));

const auth = vi.hoisted(() => ({ user: null as null | { id: string; email: string; full_name: string | null; account_id: string; is_admin: boolean } }));
vi.mock('../../lib/server/auth.js', async () => {
  const { createMiddleware } = await import('hono/factory');
  const { HTTPException } = await import('hono/http-exception');
  return {
    requireUser: createMiddleware(async (c, next) => {
      if (!auth.user) throw new HTTPException(401, { message: 'Sign in' });
      c.set('user', auth.user);
      await next();
    }),
  };
});

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import JSZip from 'jszip';
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import { convertRoutes } from '../../lib/server/routes/convert.js';
import { PlanLimitError, forgetPlans } from '../../lib/server/lib/plans.js';
import { checkConvertFile, convertType, slideMarkdown } from '../../lib/server/lib/convertMarkdown.js';

const app = new Hono();
app.route('/api/convert', convertRoutes());
app.onError((error, c) => {
  if (error instanceof PlanLimitError) return c.json({ detail: error.message, code: 'plan_limit', limit: error.key }, 402);
  if (error instanceof HTTPException) return c.json({ detail: error.message }, error.status);
  return c.json({ detail: String(error) }, 500);
});

const ME = { id: 'user-1', email: 'amina@example.edu', full_name: 'Amina Njeri', account_id: 'acc-1', is_admin: false };
const upload = (name: string, bytes: Uint8Array | string) => {
  const form = new FormData();
  form.append('file', new Blob([typeof bytes === 'string' ? new TextEncoder().encode(bytes) : new Uint8Array(bytes)]), name);
  return app.request('/api/convert', { method: 'POST', body: form });
};

/** The converter service: one PDF page of text. */
const converterCalls: string[] = [];
globalThis.fetch = (async (input: unknown) => {
  const url = String(input);
  converterCalls.push(url);
  if (url.endsWith('/pdf/text')) return new Response(JSON.stringify({ pages: [{ page: 1, text: 'Abstract\n• First point\n• Second point' }], warnings: [] }), { headers: { 'content-type': 'application/json' } });
  throw new TypeError(`unexpected fetch: ${url}`);
}) as typeof fetch;

beforeEach(() => {
  fake.clear();
  fake.put('accounts/acc-1', { plan: 'free', plan_status: 'none', plan_source: 'default' });
  fake.put('users/user-1', { email: ME.email, full_name: ME.full_name, account_id: 'acc-1' });
  auth.user = ME;
  forgetPlans();
  converterCalls.length = 0;
});

async function pptx(): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file('ppt/presentation.xml', '<p:presentation><p:sldIdLst><p:sldId id="256" r:id="rId2"/><p:sldId id="257" r:id="rId1"/></p:sldIdLst></p:presentation>');
  zip.file('ppt/_rels/presentation.xml.rels', '<Relationships><Relationship Id="rId1" Target="slides/slide1.xml"/><Relationship Id="rId2" Target="slides/slide2.xml"/></Relationships>');
  zip.file('ppt/slides/slide2.xml', '<p:sld><p:sp><p:nvSpPr><p:nvPr><p:ph type="ctrTitle"/></p:nvPr></p:nvSpPr><p:txBody><a:p><a:r><a:t>Sleep &amp; memory</a:t></a:r></a:p></p:txBody></p:sp></p:sld>');
  zip.file('ppt/slides/slide1.xml', '<p:sld><p:sp><p:nvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr><p:txBody><a:p><a:r><a:t>Results</a:t></a:r></a:p></p:txBody></p:sp>'
    + '<p:sp><p:txBody><a:p><a:r><a:t>Recall rose</a:t></a:r></a:p><a:p><a:pPr lvl="1"/><a:r><a:t>by 12%</a:t></a:r></a:p></p:txBody></p:sp>'
    + '<p:graphicFrame><a:tbl><a:tr><a:tc><a:txBody><a:p><a:r><a:t>Group</a:t></a:r></a:p></a:txBody></a:tc><a:tc><a:txBody><a:p><a:r><a:t>Recall</a:t></a:r></a:p></a:txBody></a:tc></a:tr>'
    + '<a:tr><a:tc><a:txBody><a:p><a:r><a:t>Sleep</a:t></a:r></a:p></a:txBody></a:tc><a:tc><a:txBody><a:p><a:r><a:t>0.8</a:t></a:r></a:p></a:txBody></a:tc></a:tr></a:tbl></p:graphicFrame></p:sld>');
  zip.file('ppt/slides/_rels/slide1.xml.rels', '<Relationships><Relationship Id="rId9" Target="../notesSlides/notesSlide1.xml"/></Relationships>');
  zip.file('ppt/notesSlides/notesSlide1.xml', '<p:notes><p:sp><p:nvSpPr><p:nvPr><p:ph type="body"/></p:nvPr></p:nvSpPr><p:txBody><a:p><a:r><a:t>Say the effect size.</a:t></a:r></a:p></p:txBody></p:sp></p:notes>');
  return zip.generateAsync({ type: 'uint8array' });
}

describe('Document converter', () => {
  it('needs a sign-in', async () => {
    auth.user = null;
    expect((await upload('a.pdf', '%PDF-1.4')).status).toBe(401);
  });

  it('rejects unsupported types before reading them', async () => {
    for (const name of ['notes.txt', 'old.doc', 'deck.ppt', 'sheet.xlsx', 'noextension']) {
      const response = await upload(name, 'hello');
      expect(response.status).toBe(415);
    }
    expect(convertType('Thesis.PDF')).toBe('pdf');
    expect(converterCalls).toEqual([]);
  });

  it('rejects files over the plan’s upload size (402, so an upgrade is offered) and over the hard cap (413)', async () => {
    const big = new Uint8Array(11 * 1024 * 1024);
    big.set(new TextEncoder().encode('%PDF-1.4'));
    const response = await upload('big.pdf', big);
    expect(response.status).toBe(402);
    expect((await response.json()).detail).toContain('10 MB');
    expect(converterCalls).toEqual([]);
    expect(() => checkConvertFile('huge.pdf', new Uint8Array(51 * 1024 * 1024))).toThrow(/50 MB/);
  });

  it('rejects files whose contents do not match their type, and empty files', async () => {
    expect((await upload('fake.pdf', 'not a pdf')).status).toBe(422);
    expect((await upload('fake.docx', 'not a zip')).status).toBe(422);
    expect((await upload('empty.pptx', '')).status).toBe(422);
  });

  it('converts a PDF through the converter service', async () => {
    const response = await upload('Paper_draft.pdf', '%PDF-1.4 bytes');
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ title: 'Paper draft', kind: 'pdf' });
    expect(body.markdown).toBe('Abstract\n- First point\n- Second point');
    expect(converterCalls[0]).toMatch(/\/pdf\/text$/);
  });

  it('converts a Word file with its headings', async () => {
    const doc = new Document({ sections: [{ children: [new Paragraph({ text: 'Introduction', heading: HeadingLevel.HEADING_1 }), new Paragraph({ children: [new TextRun({ text: 'Sleep helps ' }), new TextRun({ text: 'memory', bold: true })] })] }] });
    const bytes = new Uint8Array(await Packer.toBuffer(doc));
    const response = await upload('chapter.docx', bytes);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.kind).toBe('docx');
    expect(body.markdown).toContain('# Introduction');
    expect(body.markdown).toContain('Sleep helps __memory__');
  });

  it('converts a PowerPoint file slide by slide in presentation order, with levels, tables and notes', async () => {
    const response = await upload('talk.pptx', await pptx());
    expect(response.status).toBe(200);
    const { markdown } = await response.json();
    expect(markdown.indexOf('## Slide 1: Sleep & memory')).toBe(0);
    expect(markdown).toContain('## Slide 2: Results\n\n- Recall rose\n  - by 12%');
    expect(markdown).toContain('| Group | Recall |\n| --- | --- |\n| Sleep | 0.8 |');
    expect(markdown).toContain('> **Notes:** Say the effect size.');
  });

  it('escapes table pipes and skips footers in a slide', () => {
    const xml = '<p:sld><p:sp><p:nvSpPr><p:nvPr><p:ph type="ftr"/></p:nvPr></p:nvSpPr><p:txBody><a:p><a:r><a:t>Conf 2026</a:t></a:r></a:p></p:txBody></p:sp>'
      + '<p:graphicFrame><a:tbl><a:tr><a:tc><a:txBody><a:p><a:r><a:t>a|b</a:t></a:r></a:p></a:txBody></a:tc></a:tr></a:tbl></p:graphicFrame></p:sld>';
    const markdown = slideMarkdown(xml, 3);
    expect(markdown).not.toContain('Conf 2026');
    expect(markdown).toContain('| a\\|b |');
  });
});
