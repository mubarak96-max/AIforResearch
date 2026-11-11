import { C, col } from './firebase.js';

/** Services the app records use of (plans cover these). */
export type ServiceName =
  | 'papers_requests' | 'files_requests' | 'research_calls' | 'reference_checks'
  | 'llm_input_tokens' | 'llm_cached_tokens' | 'llm_output_tokens' | 'review_words' | 'conversions';

/** usage_events ids are `{service}__{request id}`, so a retried request is never recorded twice. */
const usageEventId = (service: string, requestId: string) => `${service}__${requestId.replace(/\//g, '_').slice(0, 400)}`;

/** One service call made from the app itself. */
export type UsageEvent = {
  accountId: string;
  service: ServiceName;
  quantity: number;
  requestId: string;
  metadata?: Record<string, unknown>;
};

/** Append-only; the request id is the document id, so a retry is never recorded twice. */
export async function recordUsage(event: UsageEvent) {
  if (!event.quantity || event.quantity <= 0) return;
  await col(C.usageEvents).doc(usageEventId(event.service, event.requestId)).create({
    account_id: event.accountId, service: event.service,
    quantity: event.quantity, request_id: event.requestId, metadata: event.metadata ?? {}, created_at: new Date(),
  }).catch((error: { code?: number }) => {
    if (error?.code !== 6) throw error; // 6 = ALREADY_EXISTS: recorded before
  });
}
