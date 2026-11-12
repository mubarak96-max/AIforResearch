import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const fake = await vi.hoisted(async () => (await import('./fakeFirestore.js')).createFakeFirestore());
vi.mock('../../lib/server/firebase.js', async (original) => ({ ...(await original<typeof import('../../lib/server/firebase.js')>()), ...fake.module }));
vi.mock('../../lib/server/lib/settings.js', () => ({ openSecret: (value: string) => value, sealSecret: (value: string) => value, settings: () => ({ zoteroClientKey: 'test-client', zoteroClientSecret: 'test-secret', zoteroCallbackUrl: 'https://app.example.test/callback' }) }));
import { connectZotero, zoteroAuthorizeUrl, zoteroCollections, zoteroGroupLibraries, zoteroImport } from '../../lib/server/lib/referenceManagers.js';

let grants: Record<string, { library: boolean }>;
let calls: string[];
beforeEach(() => {
  fake.clear(); calls = []; grants = { '101': { library: true } };
  fake.put('library_connections/u1__zotero', { user_id: 'u1', provider: 'zotero', external_user_id: '33', display_name: 'Test user', credentials_encrypted: JSON.stringify({ apiKey: 'testkey0000000000', files: true }) });
  vi.stubGlobal('fetch', vi.fn(async (input: string, init?: RequestInit) => {
    const url = new URL(String(input)); calls.push(url.pathname + url.search);
    if (url.pathname === '/oauth/request') return new Response('oauth_token=request-token&oauth_token_secret=request-secret');
    if (url.pathname.startsWith('/keys/')) return Response.json({ userID: 33, access: { user: { library: false, files: false }, groups: grants } });
    expect((init?.headers as Record<string, string>)['Zotero-API-Key']).toBe('testkey0000000000');
    expect(init?.method ?? 'GET').toBe('GET');
    if (url.pathname === '/users/33/groups') return Response.json([{ id: 101, data: { name: 'Allowed group' } }, { id: 202, data: { name: 'Public but ungranted group' } }], { headers: { 'total-results': '2' } });
    if (/\/collections$/.test(url.pathname)) return Response.json([{ key: 'COLL', data: { name: 'Group collection' } }], { headers: { 'total-results': '1' } });
    if (url.pathname.endsWith('/items/top')) return Response.json([{ key: 'ITEM', version: 7, data: { title: 'Paper', creators: [], abstractNote: 'Original abstract' }, meta: { numChildren: 0 } }], { headers: { 'total-results': '1' } });
    throw new Error(`Unexpected test request ${url.pathname}`);
  }));
});
afterEach(() => vi.unstubAllGlobals());

describe('Zotero group import permissions and identity', () => {
  it('lists only groups with explicit live read grants', async () => {
    expect(await zoteroGroupLibraries('u1')).toEqual({ groups: [{ id: '101', name: 'Allowed group' }], warning: null });
    grants = {};
    expect(await zoteroGroupLibraries('u1')).toMatchObject({ groups: [], warning: expect.stringContaining('read access') });
  });
  it('checks current permissions before reading a selected group and honors revocation', async () => {
    await zoteroCollections('u1', '101');
    expect(calls).toContain('/groups/101/collections?limit=100&start=0');
    grants = {};
    calls = [];
    await expect(zoteroImport('u1', null, '101')).rejects.toMatchObject({ status: 403 });
    expect(calls).toEqual(['/keys/current']);
  });
  it('does not allow group identifiers to become request paths', async () => {
    await expect(zoteroImport('u1', null, '../users/99')).rejects.toThrow('valid Zotero group');
    expect(calls).toEqual([]);
  });
  it('keeps personal, account and group item identities separate', async () => {
    const personal = await zoteroImport('u1', null);
    const group = await zoteroImport('u1', null, '101');
    const personalItem = (await personal.entries.next()).value!;
    const groupItem = (await group.entries.next()).value!;
    expect(personalItem.externalId).toBe('zotero:33:ITEM');
    expect(groupItem.externalId).toBe('zotero:33:group:101:ITEM');
    expect(groupItem.metadata).toMatchObject({ zotero_group_id: '101', source_version: 7 });
  });
  it('accepts a deliberately group-only key without granting personal-library access', async () => {
    await connectZotero('u1', 'testkey0000000000');
    expect(JSON.parse(fake.read('library_connections/u1__zotero')!.credentials_encrypted)).toMatchObject({ library: false, files: false });
    await expect(zoteroCollections('u1')).rejects.toThrow('personal library');
    expect((await zoteroCollections('u1', '101')).library_items).toBe(1);
  });
  it('preserves personal-only OAuth defaults and never requests write access', async () => {
    const url = new URL(await zoteroAuthorizeUrl('u1', '/editor'));
    expect(url.searchParams.get('all_groups')).toBe('none');
    expect(url.searchParams.get('write_access')).toBe('0');
    expect(url.searchParams.get('library_access')).toBe('1');
  });
});
