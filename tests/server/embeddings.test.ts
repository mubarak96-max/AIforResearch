import { afterEach, describe, expect, it, vi } from 'vitest';

const fake = await vi.hoisted(async () => (await import('./fakeFirestore.js')).createFakeFirestore());
vi.mock('../../lib/server/firebase.js', async (original) => ({ ...(await original<typeof import('../../lib/server/firebase.js')>()), ...fake.module }));

const { embed, embedOne, embeddingsOn } = await import('../../lib/server/lib/embeddings.js');
const { env } = await import('../../lib/server/env.js');

const base = { ...env };
const vector = (seed: number) => Array.from({ length: 384 }, (_, index) => (index === seed % 384 ? 1 : 0));
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

afterEach(() => {
  Object.assign(env, base);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Library embeddings', () => {
  it('are off unless a provider is set', async () => {
    Object.assign(env, { embeddingsProvider: '' });
    expect(embeddingsOn()).toBe(false);
    expect(await embed(['text'])).toBeNull();
  });

  it('local: asks the converter, in batches, for passages and queries', async () => {
    Object.assign(env, { embeddingsProvider: 'local', convertUrl: 'http://convert:4100' });
    const calls: { url: string; body: { texts: string[]; kind: string } }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      calls.push({ url, body });
      return json({ model: 'BAAI/bge-small-en-v1.5', dimensions: 384, vectors: body.texts.map((_: string, index: number) => vector(index)) });
    }));

    const texts = Array.from({ length: 70 }, (_, index) => `chunk ${index}`);
    const result = await embed(texts);
    expect(result?.model).toBe('local:BAAI/bge-small-en-v1.5:384');
    expect(result?.vectors).toHaveLength(70);
    expect(calls.map((call) => [call.url, call.body.texts.length, call.body.kind])).toEqual([
      ['http://convert:4100/embed', 64, 'passage'],
      ['http://convert:4100/embed', 6, 'passage'],
    ]);

    const query = await embedOne('sleep and memory');
    expect(query?.model).toBe('local:BAAI/bge-small-en-v1.5:384');
    expect(calls.at(-1)?.body).toEqual({ texts: ['sleep and memory'], kind: 'query' });
  });

  it('local: uses the embed service when EMBED_URL is set', async () => {
    Object.assign(env, { embeddingsProvider: 'local', convertUrl: 'http://convert:4100', embedUrl: 'http://embed:4100' });
    const fetchMock = vi.fn(async () => json({ model: 'm', dimensions: 384, vectors: [vector(0)] }));
    vi.stubGlobal('fetch', fetchMock);
    await embedOne('q');
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toBe('http://embed:4100/embed');
  });

  it('with a deadline: keeps the vectors made so far, after a failure or once time runs out', async () => {
    Object.assign(env, { embeddingsProvider: 'local', convertUrl: 'http://convert:4100' });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    let calls = 0;
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
      calls += 1;
      if (calls === 2) return json({ detail: 'busy' }, 503);
      const { texts } = JSON.parse(String(init.body));
      return json({ model: 'm', dimensions: 384, vectors: texts.map(() => vector(1)) });
    }));
    const texts = Array.from({ length: 150 }, (_, index) => `chunk ${index}`);
    const partial = await embed(texts, 'passage', { deadline: Date.now() + 60_000 });
    expect(partial?.vectors).toHaveLength(64);
    calls = 0;
    expect(await embed(texts, 'passage')).toBeNull(); // no deadline: all or nothing (call 2 fails again)

    calls = 10;
    const late = await embed(texts, 'passage', { deadline: Date.now() + 1_000 });
    expect(late).toBeNull(); // under 5 s left: no batch is started
  });

  it('local: falls back (null) when the converter fails or the model has the wrong size', async () => {
    Object.assign(env, { embeddingsProvider: 'local', convertUrl: 'http://convert:4100' });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn(async () => json({ detail: 'Embeddings are not installed in this converter image.' }, 501)));
    expect(await embed(['a'])).toBeNull();
    vi.stubGlobal('fetch', vi.fn(async () => json({ model: 'big-model', dimensions: 768, vectors: [[0.1]] })));
    expect(await embedOne('a')).toBeNull();
  });
});
