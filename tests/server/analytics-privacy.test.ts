import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const fake = await vi.hoisted(async () => (await import('./fakeFirestore.js')).createFakeFirestore());
vi.mock('../../lib/server/firebase.js', async (original) => ({ ...(await original<typeof import('../../lib/server/firebase.js')>()), ...fake.module }));
import { EMPTY_PRIVACY_CHOICE, parsePrivacyChoice, publicAnalyticsPath, safeEditorEvent } from '../../lib/analyticsPrivacy.js';
import { analyticsRoutes } from '../../lib/server/routes/analytics.js';
import type { AppVariables } from '../../lib/server/auth.js';

beforeEach(() => fake.clear());
function api(signedIn = true) {
  const app = new Hono<{ Variables: AppVariables }>();
  if (signedIn) app.use('*', async (c, next) => { c.set('user', { id: 'private-user-id', account_id: 'private-account-id', email: 'person@example.test', full_name: 'Private Person', is_admin: false }); await next(); });
  app.route('/analytics', analyticsRoutes());
  return app;
}
const totals = () => [...fake.store.entries()].filter(([key]) => key.startsWith('product_event_totals/'));

describe('privacy choices and page boundary', () => {
  it('defaults malformed, missing, expired and future choices to off', () => {
    for (const raw of [null, 'bad', '{}', JSON.stringify({ analytics: true, recordings: true, savedAt: 1 }), JSON.stringify({ analytics: true, savedAt: Date.now() + 100000 })]) expect(parsePrivacyChoice(raw)).toEqual(EMPTY_PRIVACY_CHOICE);
    expect(parsePrivacyChoice(JSON.stringify({ analytics: 'yes', recordings: false, savedAt: Date.now() }))).toMatchObject({ analytics: false, recordings: false });
  });
  it('keeps analytics and recording permission independent', () => {
    expect(parsePrivacyChoice(JSON.stringify({ analytics: true, recordings: false, savedAt: Date.now() }))).toMatchObject({ analytics: true, recordings: false });
  });
  it.each(['/editor', '/editor/private-id', '/deep-research', '/projects/private-id', '/systematic-review/id', '/library', '/account', '/login', '/signup', '/help', '/tools/paraphraser', '/research', '/research/papers/private-id', '/verify/private-id', '/blog?q=private', '/?document_id=private', '/new-unclassified-feature'])('excludes private or unclassified page %s', (path) => {
    expect(publicAnalyticsPath(path)).toBe(false);
  });
  it.each(['/', '/pricing', '/privacy', '/blog/ai-for-qualitative-research', '/features/citations'])('allows an explicit public information page %s', (path) => {
    expect(publicAnalyticsPath(path)).toBe(true);
  });
});

describe('content-free editor events', () => {
  it('drops text, research questions, URLs, source names and identifiers', () => {
    expect(safeEditorEvent('document_created', { source: 'word_import', text: 'Secret manuscript', question: 'Private research', source_name: 'Secret.pdf', document_id: 'doc-id', user_id: 'person', url: '/editor/doc-id', nested: { secret: true } })).toEqual({ name: 'document_created', properties: { source: 'word_import' } });
    expect(safeEditorEvent('document_created', { source: 'Secret.pdf' })).toEqual({ name: 'document_created', properties: {} });
  });
  it('rejects unknown events and malformed counters', () => {
    expect(safeEditorEvent('document-title-is-secret', {})).toBeNull();
    for (const issue_count of [-1, 1.4, '3', Infinity, 10001]) expect(safeEditorEvent('review_completed', { issue_count })?.properties).toEqual({});
    expect(safeEditorEvent('event', { module: 'ai_editor', feature: 'autocomplete', event_name: { toString: 0 } })).toBeNull();
  });
  it('maps autocomplete events to a fixed name and a coarse duration', () => {
    expect(safeEditorEvent('event', { module: 'ai_editor', feature: 'autocomplete', event_name: 'shown', duration_ms: 1234, completion: 'Secret text' })).toEqual({ name: 'autocomplete_shown', properties: { duration_bucket: 'under_10s' } });
  });
  it('stores daily aggregate counters and sanitizes again on the server', async () => {
    const request = () => api().request('/analytics/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consent: true, name: 'review_completed', properties: { issue_count: 3, document_id: 'secret-doc', text: 'Secret writing' }, email: 'person@example.test' }) });
    expect((await request()).status).toBe(204);
    expect((await request()).status).toBe(204);
    expect(totals()).toHaveLength(1);
    expect(totals()[0][1]).toEqual({ day: new Date().toISOString().slice(0, 10), event: 'review_completed', dimension: 'all', count: 2, issue_count_sum: 6 });
    expect(JSON.stringify(totals())).not.toMatch(/private|secret|person@example/);
  });
  it('does not write event totals without explicit consent or authentication', async () => {
    expect((await api().request('/analytics/events', { method: 'POST', body: JSON.stringify({ name: 'document_created', properties: {} }) })).status).toBe(204);
    expect((await api(false).request('/analytics/events', { method: 'POST', body: JSON.stringify({ consent: true, name: 'document_created', properties: {} }) })).status).toBe(401);
    expect(totals()).toHaveLength(0);
  });
});
