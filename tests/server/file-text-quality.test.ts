import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('../../lib/server/env.js', () => ({ env: { convertUrl: 'https://converter.test' } }));
vi.mock('../../lib/server/lib/serviceAuth.js', () => ({ serviceAuthHeaders: async () => ({}) }));
import { checkedOcrLanguages, extractText, ocrCapabilities } from '../../lib/server/lib/fileText.js';

afterEach(() => vi.unstubAllGlobals());
const bytes = new TextEncoder().encode('%PDF-fixture');
describe('PDF extraction provenance', () => {
  it('keeps original page anchors and passes selected installed language codes to the converter', async () => {
    const fetcher = vi.fn(async () => Response.json({
      pages: [{ page: 1, text: '' }, { page: 2, text: '日本語の原文' }, { page: 3, text: 'Native text' }],
      warnings: ['Check OCR quotations against the PDF.'],
      extraction: { status: 'partial', ocr_pages: [2], pages_without_text: [1], ocr_languages: ['jpn', 'eng'], requires_review: true },
    }));
    vi.stubGlobal('fetch', fetcher);
    const result = await extractText('source.pdf', bytes, { ocrLanguages: ['jpn', 'eng'], pageMarkers: true });
    expect(result.text).toBe('[Page 2]\n日本語の原文\n\n[Page 3]\nNative text');
    expect(result.words).toBe(3);
    expect(result.pages?.[0]).toEqual({ page: 1, text: '' });
    expect(result.extraction?.pages_without_text).toEqual([1]);
    expect(result.warnings).toEqual(['Check OCR quotations against the PDF.']);
    const request = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect((request[1].body as FormData).get('ocr_languages')).toBe('jpn+eng');
  });
  it('does not treat an unread scanned PDF as usable text', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ pages: [{ page: 1, text: '' }], warnings: ['OCR language data is unavailable for: hin.'] })));
    await expect(extractText('scan.pdf', bytes)).rejects.toThrow('OCR language data is unavailable for: hin.');
  });
  it('continues to support converters without OCR response fields', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ pages: [{ page: 7, text: 'Original text' }] })));
    const result = await extractText('old.pdf', bytes);
    expect(result.text).toBe('Original text'); // Page markers are opt-in for callers that cite pages.
    expect(result.extraction).toBeUndefined();
  });
  it('reports unavailable capabilities without failing text-based uploads', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 404 })));
    expect(await ocrCapabilities()).toMatchObject({ available: false, languages: [] });
    expect((await extractText('notes.txt', new TextEncoder().encode('Plain source text'))).text).toBe('Plain source text');
  });
  it('exposes only safe installed OCR language identifiers', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ available: true, languages: ['eng', 'script/Devanagari', '../../private', '--help', 4], default_languages: ['eng'] })));
    expect(await ocrCapabilities()).toEqual({ available: true, languages: ['eng', 'script/Devanagari'], default_languages: ['eng'] });
  });
  it('accepts script packs at the eight-language boundary and rejects traversal before contacting the converter', async () => {
    const selected = ['eng', 'script/Latin', 'script/Devanagari', 'ara', 'jpn', 'kor', 'chi_sim', 'fra'];
    expect(checkedOcrLanguages(selected)).toEqual(selected);
    expect(() => checkedOcrLanguages([...selected, 'deu'])).toThrow('eight');
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    for (const code of ['../eng', 'script/../../eng', 'script/Latin/eng', '/eng', '--help', 'script\\Latin']) {
      await expect(extractText('scan.pdf', bytes, { ocrLanguages: [code] })).rejects.toThrow('eight available');
    }
    expect(fetcher).not.toHaveBeenCalled();
  });
});
