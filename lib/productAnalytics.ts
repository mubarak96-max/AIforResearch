'use client';

import { api } from './session';
import { effectivePrivacyChoice, PRIVACY_STORAGE_KEY, safeEditorEvent } from './analyticsPrivacy';

/** The editor sends content-free counters to our API; it never loads third-party trackers. */
export function trackEditorEvent(name: string, properties?: Record<string, unknown>) {
  try {
    if (!effectivePrivacyChoice(window.localStorage.getItem(PRIVACY_STORAGE_KEY)).analytics) return;
    const event = safeEditorEvent(name, properties);
    if (!event) return;
    void api('/api/analytics/events', { method: 'POST', body: JSON.stringify({ consent: true, ...event }) }).catch(() => undefined);
  } catch { /* Privacy storage or analytics failure must not interrupt editing. */ }
}
