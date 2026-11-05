import OpenAI from 'openai';
import { env } from '../env.js';
import { settings } from './settings.js';

/**
 * Optional embeddings for Library search (Firestore vector search on chunk `embedding`). Off
 * unless EMBEDDINGS_PROVIDER=openai and a key are set; every caller falls back to word search
 * when this returns null, so a provider outage never breaks the Library.
 */

export const EMBEDDING_DIMENSIONS = 384;

type Config = { provider: 'openai'; apiKey: string; model: string; baseURL?: string };

function config(): Config | null {
  const s = settings() as typeof env;
  const provider = (s.embeddingsProvider || env.embeddingsProvider || '').trim().toLowerCase();
  if (provider !== 'openai') return null;
  // An OpenAI AI slot's key works too, so one key can do both.
  const apiKey = s.embeddingsApiKey || env.embeddingsApiKey || (s.llmProvider === 'openai' ? s.llmApiKey : '');
  if (!apiKey) return null;
  return { provider: 'openai', apiKey, model: s.embeddingsModel || env.embeddingsModel || 'text-embedding-3-small' };
}

export const embeddingsOn = () => config() !== null;
export const embeddingModel = () => {
  const current = config();
  return current ? `${current.provider}:${current.model}:${EMBEDDING_DIMENSIONS}` : null;
};

let client: { key: string; openai: OpenAI } | null = null;
function openai(current: Config) {
  if (!client || client.key !== current.apiKey) client = { key: current.apiKey, openai: new OpenAI({ apiKey: current.apiKey, baseURL: current.baseURL }) };
  return client.openai;
}

/** Vectors for `texts` (same order), or null when embeddings are off or the provider failed. */
export async function embed(texts: string[]): Promise<{ model: string; vectors: number[][] } | null> {
  const current = config();
  if (!current || !texts.length) return null;
  try {
    const vectors: number[][] = [];
    for (let index = 0; index < texts.length; index += 96) {
      const batch = texts.slice(index, index + 96).map((text) => text.slice(0, 8000) || ' ');
      const response = await openai(current).embeddings.create({ model: current.model, input: batch, dimensions: EMBEDDING_DIMENSIONS });
      for (const item of [...response.data].sort((a, b) => a.index - b.index)) vectors.push(item.embedding);
    }
    if (vectors.length !== texts.length) return null;
    return { model: embeddingModel()!, vectors };
  } catch (error) {
    console.error(`embeddings: ${(error as Error).message.slice(0, 200)}`);
    return null;
  }
}

export async function embedOne(text: string): Promise<{ model: string; vector: number[] } | null> {
  const result = await embed([text]);
  return result ? { model: result.model, vector: result.vectors[0] } : null;
}
