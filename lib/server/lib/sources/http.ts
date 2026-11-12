/**
 * One HTTP helper for the outside scholarly services: a timeout, one retry on 429/5xx, a small
 * in-memory cache (searches repeat while people refine filters) and a clear error.
 */
import { USER_AGENT } from '../../env.js';

export class SourceError extends Error {
  constructor(readonly source: string, message: string, readonly status = 503) {
    super(message);
    this.name = 'SourceError';
  }
}

class TtlCache {
  private items = new Map<string, { value: unknown; expires: number }>();
  constructor(private max: number, private ttlMs: number) {}
  get(key: string): unknown {
    const hit = this.items.get(key);
    if (!hit) return undefined;
    this.items.delete(key);
    if (hit.expires < Date.now()) return undefined;
    this.items.set(key, hit);
    return hit.value;
  }
  set(key: string, value: unknown) {
    this.items.delete(key);
    this.items.set(key, { value, expires: Date.now() + this.ttlMs });
    while (this.items.size > this.max) this.items.delete(this.items.keys().next().value as string);
  }
}

const cache = new TtlCache(600, 10 * 60_000);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Tests swap this for a fake. */
export const net = { fetch: (input: string | URL, init?: RequestInit) => fetch(input, init) };

export type FetchOptions = {
  source: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: unknown;
  /** 'json' (default) or 'text' (XML feeds). */
  as?: 'json' | 'text';
  timeoutMs?: number;
  /** Cache key override (POST bodies); false to skip the cache. */
  cacheKey?: string | false;
  /** Spaces this service's requests at least `ms` apart in this process (keyed rate limits). */
  pace?: { key: string; ms: number; maxWaitMs?: number };
};

/** The next free start time per paced service. */
const paceNext = new Map<string, number>();

/** Waits for this service's next free slot; throws when the queue is longer than maxWaitMs. */
async function waitTurn(pace: NonNullable<FetchOptions['pace']>, source: string) {
  const now = Date.now();
  const start = Math.max(now, paceNext.get(pace.key) ?? 0);
  if (start - now > (pace.maxWaitMs ?? 15_000)) throw new SourceError(source, `${source} is busy (rate limit).`, 429);
  paceNext.set(pace.key, start + pace.ms);
  if (start > now) await sleep(start - now);
}

/** GET or POST, parsed; null on 404. Throws SourceError when the service fails twice. */
export async function fetchSource<T = any>(url: string | URL, options: FetchOptions): Promise<T | null> {
  const key = options.cacheKey === false ? null : options.cacheKey ?? `${options.method ?? 'GET'} ${url} ${options.body ? JSON.stringify(options.body) : ''}`;
  if (key) {
    const hit = cache.get(key);
    if (hit !== undefined) return hit as T | null;
  }
  const headers: Record<string, string> = { 'User-Agent': USER_AGENT, Accept: options.as === 'text' ? 'application/xml, text/xml, */*' : 'application/json', ...options.headers };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  for (let attempt = 0; ; attempt += 1) {
    let response: Response;
    if (options.pace) await waitTurn(options.pace, options.source);
    try {
      response = await net.fetch(url, {
        method: options.method ?? 'GET', headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: AbortSignal.timeout(options.timeoutMs ?? 12_000),
      });
    } catch (error) {
      if (attempt === 0) { await sleep(500); continue; }
      throw new SourceError(options.source, `${options.source} did not answer (${(error as Error).name === 'TimeoutError' ? 'timed out' : 'network error'}).`);
    }
    if (response.status === 404) {
      if (key) cache.set(key, null);
      return null;
    }
    if (response.ok) {
      const value = (options.as === 'text' ? await response.text() : await response.json()) as T;
      if (key) cache.set(key, value);
      return value;
    }
    if (attempt === 0 && (response.status === 429 || response.status >= 500)) {
      const after = Number(response.headers.get('retry-after'));
      // Paced services wait for their next slot instead (waitTurn at the top of the loop).
      if (!options.pace) await sleep(Number.isFinite(after) && after > 0 ? Math.min(after * 1000, 2500) : 800);
      continue;
    }
    throw new SourceError(options.source, `${options.source} answered ${response.status}.`, response.status === 429 ? 429 : 503);
  }
}

/** Decodes the XML entities feeds use (&amp; &lt; &#233; …). */
export function decodeXml(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

/** Text of an XML fragment without its tags. */
export const stripTags = (text: string) => decodeXml(text.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

/** Every match of <tag ...>…</tag> in `xml` (non-nested tags only). */
export function xmlAll(xml: string, tag: string): string[] {
  const out: string[] = [];
  const pattern = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'g');
  for (let match = pattern.exec(xml); match; match = pattern.exec(xml)) out.push(match[1]);
  return out;
}
export const xmlFirst = (xml: string, tag: string) => xmlAll(xml, tag)[0] ?? null;
