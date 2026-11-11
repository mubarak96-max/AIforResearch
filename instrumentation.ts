import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs';

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

if ((!posthogKey || !posthogHost) && process.env.NODE_ENV !== 'production') {
  const missingVariable = posthogKey ? 'NEXT_PUBLIC_POSTHOG_HOST' : 'NEXT_PUBLIC_POSTHOG_KEY';
  console.warn(`${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`);
}

const loggerProvider = posthogKey && posthogHost
  ? new LoggerProvider({ resource: new Resource({ 'service.name': 'writeorbit-nextjs' }) })
  : null;

if (loggerProvider && posthogKey && posthogHost) {
  loggerProvider.addLogRecordProcessor(
    new BatchLogRecordProcessor(
      new OTLPLogExporter({
        url: `${posthogHost.replace(/\/$/, '')}/i/v1/logs`,
        headers: {
          Authorization: `Bearer ${posthogKey}`,
          'Content-Type': 'application/json',
        },
      }),
    ),
  );
}

// This dedicated logger intentionally leaves existing console and Hono logging local.
export const posthogLog = loggerProvider?.getLogger('writeorbit-posthog-log-capture');

if (loggerProvider) {
  const flushAtShutdown = () => { void loggerProvider.shutdown().catch(() => undefined); };
  process.once('SIGTERM', flushAtShutdown);
  process.once('SIGINT', flushAtShutdown);
}

export function register() {
  // Next.js 15 discovers this file automatically. The provider above is intentionally local,
  // so only log records emitted through posthogLog leave the application.
}
