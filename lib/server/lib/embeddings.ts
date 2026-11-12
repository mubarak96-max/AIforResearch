import OpenAI from 'openai';
import { env } from '../env.js';
import { AI } from '../../site.js';
import { settings } from './settings.js';
import { serviceAuthHeaders } from './serviceAuth.js';

/**
 * Optional embeddings for Library search (Firestore vector search on chunk `embedding`).
 *   EMBEDDINGS_PROVIDER=local   POST /embed on EMBED_URL (else CONVERT_URL): a small open model, no per-token fees
 *   EMBEDDINGS_PROVIDER=openai  OpenAI's API (EMBEDDINGS_API_KEY)
 * Off when unset. Every caller falls back to word search when this returns null, so a provider
 * outage never breaks the Library.
 */

export const EMBEDDING_DIMENSIONS = 384;

type Kind = 'passage' | 'query';
type Config =
  | { provider: 'local'; url: string }
  | { provider: 'openai'; apiKey: string; model: string };

const LOCAL_BATCH = 64;
const OPENAI_BATCH = 96;
/** A search waits this long for its vector, then uses word search (a cold embed service, say). */
const QUERY_TIMEOUT_MS = 4_000;
const PASSAGE_TIMEOUT_MS = 120_000;

function config(): Config | null {
  const s = settings() as typeof env;
  const provider = (s.embeddingsProvider || env.embeddingsProvider || '').trim().toLowerCase();
  if (provider === 'local') {
    const base = env.embedUrl || env.convertUrl;
    return base ? { provider: 'local', url: `${base}/embed` } : null;
  }
  if (provider !== 'openai') return null;
  // An OpenAI AI slot's key works too, so one key can do both.
  const apiKey = s.embeddingsApiKey || env.embeddingsApiKey || (AI.provider === 'openai' ? s.llmApiKey : '');
  if (!apiKey) return null;
  return { provider: 'openai', apiKey, model: s.embeddingsModel || env.embeddingsModel || 'text-embedding-3-small' };
}

export const embeddingsOn = () => config() !== null;

/** Stored on each chunk; search only compares vectors made by the same model. */
const modelId = (provider: string, model: string) => `${provider}:${model}:${EMBEDDING_DIMENSIONS}`;

let client: { key: string; openai: OpenAI } | null = null;
function openai(apiKey: string) {
  if (!client || client.key !== apiKey) client = { key: apiKey, openai: new OpenAI({ apiKey }) };
  return client.openai;
}

/** One batch's vectors and the model id. */
async function embedBatch(current: Config, texts: string[], kind: Kind, timeoutMs: number): Promise<{ model: string; vectors: number[][] }> {
  if (current.provider === 'openai') {
    const input = texts.map((text) => text.slice(0, 8000) || ' ');
    const response = await openai(current.apiKey).embeddings.create({ model: current.model, input, dimensions: EMBEDDING_DIMENSIONS }, { timeout: timeoutMs });
    return { model: modelId('openai', current.model), vectors: [...response.data].sort((a, b) => a.index - b.index).map((item) => item.embedding) };
  }
  const response = await fetch(current.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await serviceAuthHeaders(current.url)) },
    body: JSON.stringify({ texts, kind }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`/embed answered ${response.status}`);
  const body = (await response.json()) as { model: string; dimensions: number; vectors: number[][] };
  if (body.dimensions !== EMBEDDING_DIMENSIONS) throw new Error(`model ${body.model} gives ${body.dimensions} dimensions, the index needs ${EMBEDDING_DIMENSIONS}`);
  return { model: modelId('local', body.model), vectors: body.vectors };
}

/**
 * Vectors for `texts`, in order, or null when embeddings are off or none could be made.
 * With a `deadline` (ms since epoch) this stops starting batches once it passes, or when a batch
 * fails, and returns the vectors made so far: `vectors[i]` belongs to `texts[i]`, and the texts
 * after `vectors.length` have none (they stay word-searchable). Without one it is all or null.
 */
export async function embed(
  texts: string[],
  kind: Kind = 'passage',
  options: { deadline?: number } = {},
): Promise<{ model: string; vectors: number[][] } | null> {
  const current = config();
  if (!current || !texts.length) return null;
  const size = current.provider === 'local' ? LOCAL_BATCH : OPENAI_BATCH;
  const vectors: number[][] = [];
  let model = '';
  for (let index = 0; index < texts.length; index += size) {
    let timeoutMs = kind === 'query' ? QUERY_TIMEOUT_MS : PASSAGE_TIMEOUT_MS;
    if (options.deadline !== undefined) {
      const left = options.deadline - Date.now();
      if (left < 5_000) {
        console.warn(`embeddings: out of time after ${vectors.length} of ${texts.length} texts; the rest keep word search only`);
        break;
      }
      timeoutMs = Math.min(timeoutMs, left);
    }
    const batch = texts.slice(index, index + size);
    try {
      const result = await embedBatch(current, batch, kind, timeoutMs);
      if (result.vectors.length !== batch.length) throw new Error(`got ${result.vectors.length} vectors for ${batch.length} texts`);
      model = result.model;
      vectors.push(...result.vectors);
    } catch (error) {
      console.error(`embeddings (${current.provider}): ${(error as Error).message.slice(0, 200)}`);
      if (options.deadline === undefined) return null;
      break;
    }
  }
  return vectors.length ? { model, vectors } : null;
}

/** A search query's vector. */
export async function embedOne(text: string): Promise<{ model: string; vector: number[] } | null> {
  const result = await embed([text], 'query');
  return result ? { model: result.model, vector: result.vectors[0] } : null;
}
