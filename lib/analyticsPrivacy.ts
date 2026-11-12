/** Analytics never accepts arbitrary editor properties, paths or identifiers. */
export const PRIVACY_STORAGE_KEY = 'research-privacy-v1';
export const PRIVACY_SETTINGS_EVENT = 'research-privacy-settings';
export const PRIVACY_CHANGED_EVENT = 'research-privacy-changed';
export type PrivacyChoice = { analytics: boolean; recordings: boolean; savedAt: number };
export const EMPTY_PRIVACY_CHOICE: PrivacyChoice = { analytics: false, recordings: false, savedAt: 0 };
const MAX_CHOICE_AGE = 180 * 24 * 60 * 60_000;

export function parsePrivacyChoice(raw: string | null, now = Date.now()): PrivacyChoice {
  try {
    const value = JSON.parse(raw ?? 'null');
    if (!value || typeof value.savedAt !== 'number' || !Number.isFinite(value.savedAt) || value.savedAt > now || now - value.savedAt > MAX_CHOICE_AGE) return { ...EMPTY_PRIVACY_CHOICE };
    return { analytics: value.analytics === true, recordings: value.recordings === true, savedAt: value.savedAt };
  } catch { return { ...EMPTY_PRIVACY_CHOICE }; }
}

/** Explicit public pages only. Tools, search, help, auth and all workspaces are excluded. */
export function publicAnalyticsPath(path: string): boolean {
  if (/[?#%]/.test(path)) return false;
  return /^\/$/.test(path) || /^\/(?:about|pricing|how-it-works|citation-styles|privacy|cookies|terms|ai-use)\/?$/.test(path)
    || /^\/(?:blog|features|for|alternatives|templates|authors)(?:\/[a-z0-9][a-z0-9-]*)?\/?$/.test(path);
}

const SOURCES = new Set(['manual', 'word_import', 'duplicate', 'thesis_manuscript_import', 'research_agent_import', 'thesis-manuscript', 'research-agent']);
const EVENTS = new Set(['document_created', 'review_completed', 'import_completed', 'import_failed', 'autocomplete_shown', 'autocomplete_accepted', 'autocomplete_thumbs_up', 'autocomplete_thumbs_down']);
export type ProductEvent = { name: string; properties: { source?: string; issue_count?: number; duration_bucket?: 'under_1s' | 'under_10s' | 'over_10s' } };

export function safeEditorEvent(name: unknown, properties: unknown): ProductEvent | null {
  if (typeof name !== 'string' || !properties || typeof properties !== 'object' || Array.isArray(properties)) properties = {};
  const input = properties as Record<string, unknown>;
  if (name === 'event' && input.module === 'ai_editor' && input.feature === 'autocomplete' && typeof input.event_name === 'string' && ['shown', 'accepted', 'thumbs_up', 'thumbs_down'].includes(input.event_name)) name = `autocomplete_${input.event_name}`;
  if (typeof name !== 'string' || !EVENTS.has(name)) return null;
  const out: ProductEvent = { name, properties: {} };
  if ((name === 'document_created' || name.startsWith('import_')) && typeof input.source === 'string' && SOURCES.has(input.source)) out.properties.source = input.source;
  if (name === 'review_completed' && Number.isInteger(input.issue_count) && Number(input.issue_count) >= 0 && Number(input.issue_count) <= 10000) out.properties.issue_count = Number(input.issue_count);
  if (name === 'autocomplete_shown') {
    if (typeof input.duration_ms === 'number' && Number.isFinite(input.duration_ms) && input.duration_ms >= 0 && input.duration_ms <= 600000) out.properties.duration_bucket = input.duration_ms < 1000 ? 'under_1s' : input.duration_ms < 10000 ? 'under_10s' : 'over_10s';
    else if (typeof input.duration_bucket === 'string' && ['under_1s', 'under_10s', 'over_10s'].includes(input.duration_bucket)) out.properties.duration_bucket = input.duration_bucket as ProductEvent['properties']['duration_bucket'];
  }
  return out;
}
