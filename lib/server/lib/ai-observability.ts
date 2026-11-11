import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { PostHog } from 'posthog-node';

const token = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
const development = process.env.NODE_ENV !== 'production';

if (!token && development) {
  console.warn('NEXT_PUBLIC_POSTHOG_KEY variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_KEY is configured');
}
if (!host && development) {
  console.warn('NEXT_PUBLIC_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_HOST is configured');
}

/** Shared by manual AI capture; absent configuration is a production no-op. */
export const aiPosthog = token && host
  ? new PostHog(token, {
      host,
      privacyMode: false,
      flushAt: 1,
      flushInterval: 0,
      requestTimeout: 2_000,
      fetchRetryCount: 0,
    })
  : null;

export type AiCallContext = {
  distinctId?: string;
  sessionId: string;
  traceId: string;
  provider: string;
};

type AiTurnContext = Omit<AiCallContext, 'provider'>;

const turns = new AsyncLocalStorage<AiTurnContext>();
const processSessionId = `process:${process.pid}`;
const sessionIdPattern = /^[A-Za-z0-9_~.@()!'|:-]+$/;

function sessionId(value: string) {
  return sessionIdPattern.test(value) ? value : processSessionId;
}

/** Creates one trace per request and uses the process as the fallback conversation. */
export function runAiTurn<T>(distinctId: string | undefined, run: () => T): T {
  return turns.run({ distinctId, sessionId: processSessionId, traceId: randomUUID() }, run);
}

/** Adds provider data to the active request trace; a chat thread can replace the fallback session. */
export function aiCallContext(provider: string, options: { distinctId?: string; sessionId?: string } = {}): AiCallContext {
  const active = turns.getStore();
  return {
    distinctId: options.distinctId ?? active?.distinctId,
    sessionId: sessionId(options.sessionId ?? active?.sessionId ?? processSessionId),
    traceId: active?.traceId ?? randomUUID(),
    provider,
  };
}

/** Records an AI generation without replacing the application's model client. */
export function captureManualGeneration(input: {
  context: AiCallContext;
  model: string;
  messages: unknown;
  outputChoices: unknown;
  usage?: { prompt_tokens?: number; completion_tokens?: number } | null;
  startedAt: number;
}) {
  aiPosthog?.capture({
    distinctId: input.context.distinctId ?? `${input.context.sessionId}:anonymous`,
    event: '$ai_generation',
    properties: {
      $process_person_profile: false,
      $ai_provider: input.context.provider,
      $ai_model: input.model,
      $ai_input: input.messages,
      $ai_output_choices: input.outputChoices,
      $ai_input_tokens: input.usage?.prompt_tokens,
      $ai_output_tokens: input.usage?.completion_tokens,
      $ai_latency: (Date.now() - input.startedAt) / 1000,
      $ai_trace_id: input.context.traceId,
      $ai_session_id: input.context.sessionId,
    } as any,
  });
}

export function captureManualEmbedding(input: {
  context: AiCallContext;
  model: string;
  texts: string[];
  inputTokens?: number;
  startedAt: number;
}) {
  aiPosthog?.capture({
    distinctId: input.context.distinctId ?? `${input.context.sessionId}:anonymous`,
    event: '$ai_embedding',
    properties: {
      $process_person_profile: false,
      $ai_provider: input.context.provider,
      $ai_model: input.model,
      $ai_input: input.texts,
      $ai_input_tokens: input.inputTokens,
      $ai_latency: (Date.now() - input.startedAt) / 1000,
      $ai_trace_id: input.context.traceId,
      $ai_session_id: input.context.sessionId,
    } as any,
  });
}

/** App Hosting route handlers are short-lived; keep a failed delivery bounded and invisible to callers. */
export async function flushAiObservability() {
  if (!aiPosthog) return;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      aiPosthog.flush(),
      new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('PostHog flush timed out')), 2_000); }),
    ]);
  } catch {
    // Telemetry must never replace a successful AI response.
  } finally {
    clearTimeout(timeout);
  }
}
