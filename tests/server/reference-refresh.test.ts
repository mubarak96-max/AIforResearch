import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fake = await vi.hoisted(async () => (await import('./fakeFirestore.js')).createFakeFirestore());
vi.mock('../../lib/server/firebase.js', async (original) => ({ ...(await original<typeof import('../../lib/server/firebase.js')>()), ...fake.module }));
vi.mock('../../lib/server/lib/storage.js', () => ({ readFileBytes: vi.fn(), saveFile: vi.fn(), deleteFile: vi.fn(), keyFromRef: vi.fn() }));
vi.mock('../../lib/server/lib/embeddings.js', () => ({ embed: vi.fn() }));
vi.mock('../../lib/server/lib/referenceManagers.js', () => ({ zoteroImport: vi.fn(), mendeleyImport: vi.fn() }));
import { mergeReferenceImport, referenceSnapshot } from '../../lib/server/lib/referenceImportMerge.js';
import { refreshImportedReference, runImportJob, type ImportEntry } from '../../lib/server/lib/libraryImport.js';
import { readFileBytes } from '../../lib/server/lib/storage.js';
import { zoteroImport } from '../../lib/server/lib/referenceManagers.js';
import type { LibraryRow } from '../../lib/server/lib/libraryFiles.js';
import type { Slots } from '../../lib/server/slots/types.js';

const entry = (overrides: Partial<ImportEntry> = {}): ImportEntry => ({
  title: 'Original title', authors: ['Author'], year: '2024', doi: '10.1234/source', journal: 'Journal',
  url: 'https://example.test/source', abstract: 'Original abstract', externalId: 'zotero:account-A:item-1', ...overrides,
});
const document = (overrides: Partial<LibraryRow> = {}): LibraryRow => ({
  id: 'd1', user_id: 'u1', folder_id: 'my-folder', filename: 'Original title', file_type: 'reference', file_path: null,
  file_size: null, title: 'Original title', authors: ['Author'], doi: '10.1234/source', publisher: 'Journal',
  publication_date: '2024', abstract: 'Original abstract', metadata: { url: 'https://example.test/source', import_snapshot: referenceSnapshot(entry()), notes: 'Private notes' },
  processing_status: 'completed', processing_error: null, chunk_count: 1, external_id: entry().externalId,
  created_at: new Date(), updated_at: new Date(), processed_at: new Date(), ...overrides,
});
function seed(doc = document()) {
  fake.put(`library_documents/${doc.id}`, doc);
  fake.put(`library_doi/${doc.user_id}__ext_${createHash('sha1').update(doc.external_id!).digest('hex')}`, { user_id: doc.user_id, document_id: doc.id });
  fake.put(`library_documents/${doc.id}/chunks/0`, { page: null, content: 'Original title\n\nOriginal abstract', embedding: [1, 2] });
}
beforeEach(() => { fake.clear(); vi.clearAllMocks(); });

describe('one-way reference refresh', () => {
  it('updates unchanged fields while preserving a locally edited title and notes', async () => {
    seed(document({ title: 'My edited title' }));
    const outcome = await refreshImportedReference('u1', entry({ title: 'Remote title', abstract: 'Remote abstract', year: '2025' }));
    expect(outcome).toEqual({ updated: true, preserved: true });
    const saved = fake.read('library_documents/d1')!;
    expect(saved).toMatchObject({ title: 'My edited title', abstract: 'Remote abstract', publication_date: '2025', folder_id: 'my-folder' });
    expect(saved.metadata.notes).toBe('Private notes');
    expect(saved.metadata.import_conflicts).toEqual([{ field: 'title', local: 'My edited title', incoming: 'Remote title' }]);
    expect(fake.read('library_documents/d1/chunks/0')?.content).toBe('My edited title\n\nRemote abstract');
    expect(fake.read('library_documents/d1/chunks/0')).not.toHaveProperty('embedding');
  });
  it('keeps PDF page chunks and file metadata intact', async () => {
    seed(document({ file_type: 'pdf', file_path: 'library/u1/d1.pdf', chunk_count: 40 }));
    await refreshImportedReference('u1', entry({ abstract: 'Updated abstract' }));
    expect(fake.read('library_documents/d1')).toMatchObject({ file_path: 'library/u1/d1.pdf', chunk_count: 40, file_type: 'pdf' });
    expect(fake.read('library_documents/d1/chunks/0')?.content).toContain('Original abstract');
  });
  it('does not authorize updates from another provider account or another user', async () => {
    seed();
    expect(await refreshImportedReference('u1', entry({ externalId: 'zotero:account-B:item-1', title: 'Wrong account' }))).toBeNull();
    expect(await refreshImportedReference('u2', entry({ title: 'Wrong user' }))).toBeNull();
    expect(fake.read('library_documents/d1')?.title).toBe('Original title');
  });
  it('rechecks the document identity even if a marker is stale or incorrect', async () => {
    seed();
    fake.put('library_documents/d1', document({ user_id: 'u2' }));
    expect(await refreshImportedReference('u1', entry())).toBeNull();
  });
  it('never silently changes DOI uniqueness identity', async () => {
    seed();
    const result = await refreshImportedReference('u1', entry({ doi: '10.1234/different' }));
    expect(result).toEqual({ updated: false, preserved: true });
    expect(fake.read('library_documents/d1')?.doi).toBe('10.1234/source');
    expect(fake.read('library_documents/d1')?.metadata.import_conflicts[0].field).toBe('doi');
  });
  it('preserves legacy nonempty values without a known baseline and fills empty fields', () => {
    const legacy = document({ title: 'Possibly edited title', abstract: null, metadata: { notes: 'Keep' } });
    const merged = mergeReferenceImport(legacy, entry({ title: 'Remote title' }));
    expect(merged.patch).not.toHaveProperty('title');
    expect(merged.patch.abstract).toBe('Original abstract');
    expect(merged.metadata).toMatchObject({ notes: 'Keep' });
    expect(merged.conflicts.some((item) => item.field === 'title')).toBe(true);
  });
  it('fills in a DOI the document lacked instead of reporting a conflict', () => {
    const merged = mergeReferenceImport(document({ doi: null }), entry({ doi: '10.1234/new' }));
    expect(merged.patch.doi).toBe('10.1234/new');
    expect(merged.conflicts).toEqual([]);
    expect(mergeReferenceImport(document(), entry({ doi: null })).conflicts).toEqual([]);
  });
  it('does not report formatting-only differences on legacy imports', () => {
    const legacy = document({ title: 'original  TITLE', metadata: { notes: 'Keep' } });
    expect(mergeReferenceImport(legacy, entry()).conflicts).toEqual([]);
  });
  it('replaces provider metadata on refresh without dropping user metadata', () => {
    const current = document({ metadata: { ...document().metadata, item_type: 'book', provider_metadata_keys: ['item_type'] } });
    const merged = mergeReferenceImport(current, entry({ metadata: { language: 'en', url: 'https://evil.test' } }));
    expect(merged.metadata).not.toHaveProperty('item_type');
    expect(merged.metadata).toMatchObject({ language: 'en', notes: 'Private notes', url: 'https://example.test/source', provider_metadata_keys: ['language'] });
  });
  it('is idempotent for a repeated snapshot and retains a local override across updates', async () => {
    seed(document({ authors: ['Local author'] }));
    const remote = entry({ title: 'Updated title', authors: ['Remote author'] });
    expect(await refreshImportedReference('u1', remote)).toEqual({ updated: true, preserved: true });
    expect(await refreshImportedReference('u1', remote)).toEqual({ updated: false, preserved: true });
    await refreshImportedReference('u1', { ...remote, authors: ['Next remote author'] });
    expect(fake.read('library_documents/d1')?.authors).toEqual(['Local author']);
  });
  it('removes a stale abstract chunk only when the imported abstract was unedited', async () => {
    seed();
    await refreshImportedReference('u1', entry({ abstract: null }));
    expect(fake.read('library_documents/d1')?.chunk_count).toBe(0);
    expect(fake.read('library_documents/d1/chunks/0')).toBeUndefined();
  });
  it('reports updates separately from additions and counts kept local values', async () => {
    seed(document({ title: 'Local title' }));
    fake.put('library_import_jobs/j1', { user_id: 'u1', account_id: 'a1', source: 'zotero', label: 'Zotero', status: 'running', spec_key: 'imports/j1.json', total: 1, find_pdfs: false, folder_id: null, processed: 0, attempt: 0, claimed_attempt: null });
    vi.mocked(readFileBytes).mockResolvedValue(Buffer.from(JSON.stringify({ kind: 'zotero', collection: null })));
    vi.mocked(zoteroImport).mockResolvedValue({ entries: (async function* () { yield entry({ abstract: 'Updated abstract' }); })() } as any);
    await runImportJob('j1', { slots: {} as Slots });
    expect(fake.read('library_import_jobs/j1')).toMatchObject({ status: 'done', added: 0, updated: 1, skipped: 0, preserved: 1, processed: 1, total: 1 });
  });
});
