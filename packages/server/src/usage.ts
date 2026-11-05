import { C, col } from './firebase.js';
import { usageEventId } from './lib/credits.js';
import type { ServiceName } from './lib/prices.js';

/** One service call made from the app itself (plans cover these; Cloud keys are charged in lib/credits.ts). */
export type UsageEvent = {
  accountId: string;
  apiKeyId?: string | null;
  service: ServiceName;
  quantity: number;
  requestId: string;
  metadata?: Record<string, unknown>;
};

/** Append-only; the request id is the document id, so a retry is never recorded twice. */
export async function recordUsage(event: UsageEvent) {
  if (!event.quantity || event.quantity <= 0) return;
  await col(C.usageEvents).doc(usageEventId(event.service, event.requestId)).create({
    account_id: event.accountId, api_key_id: event.apiKeyId ?? null, via_key: Boolean(event.apiKeyId), service: event.service,
    quantity: event.quantity, request_id: event.requestId, metadata: event.metadata ?? {}, free_milli: 0, paid_milli: 0, created_at: new Date(),
  }).catch((error: { code?: number }) => {
    if (error?.code !== 6) throw error; // 6 = ALREADY_EXISTS: recorded before
  });
}
