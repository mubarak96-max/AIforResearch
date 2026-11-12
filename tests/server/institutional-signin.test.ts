import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const admin = vi.hoisted(() => ({ getUser: vi.fn(), updateUser: vi.fn() }));
vi.mock('../../lib/server/firebase.js', async (original) => ({ ...(await original<typeof import('../../lib/server/firebase.js')>()), adminAuth: () => admin }));
import { institutionalProviders } from '../../lib/server/lib/signin.js';
import { authRoutes } from '../../lib/server/routes/auth.js';
import type { AppVariables } from '../../lib/server/auth.js';

function api() {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use('*', async (c, next) => { c.set('user', { id: 'u1', account_id: 'a1', email: 'user@example.test', full_name: 'Person', is_admin: false }); await next(); });
  app.route('/auth', authRoutes());
  return app;
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('FIREBASE_SSO_PROVIDERS', JSON.stringify([{ id: 'saml.institution', label: 'Institution sign-in' }, { id: 'oidc.organization', label: 'Organization sign-in' }]));
  admin.getUser.mockResolvedValue({ providerData: [{ providerId: 'google.com', email: 'user@example.test' }, { providerId: 'saml.institution', email: 'user@example.test' }], emailVerified: true });
  admin.updateUser.mockResolvedValue({});
});
afterEach(() => vi.unstubAllEnvs());

describe('optional institutional sign-in', () => {
  it('keeps password and Google available with no SSO configuration', async () => {
    vi.stubEnv('FIREBASE_SSO_PROVIDERS', '');
    const result = await api().request('/auth/methods');
    expect(await result.json()).toMatchObject({ password: true, google: true, sso: [] });
  });
  it('exposes only validated provider ids and labels, never configuration secrets or domain gates', () => {
    expect(institutionalProviders(JSON.stringify([
      { id: 'saml.institution', label: ' الجامعة ', secret: 'private', domains: ['example.test'] },
      { id: 'oidc.organization', label: 'Organization' },
      { id: 'saml.institution', label: 'Duplicate' },
      { id: 'https://untrusted.test', label: 'Invalid' },
      { id: 'oidc.bad/path', label: 'Invalid' },
      { id: 'google.com', label: 'Invalid' },
      { id: 'saml.empty', label: ' ' },
    ]))).toEqual([{ id: 'saml.institution', label: 'الجامعة', protocol: 'saml' }, { id: 'oidc.organization', label: 'Organization', protocol: 'oidc' }]);
  });
  it('fails closed for malformed configuration without disabling existing methods', () => {
    expect(institutionalProviders('bad')).toEqual([]);
    expect(institutionalProviders('{}')).toEqual([]);
    expect(institutionalProviders('x'.repeat(16001))).toEqual([]);
  });
  it('shows linked identities from Firebase alongside available configured providers', async () => {
    const result = await api().request('/auth/sign-in-methods/me');
    const body = await result.json();
    expect(body.providers.google.connected).toBe(true);
    expect(body.sso).toEqual([
      { id: 'saml.institution', label: 'Institution sign-in', protocol: 'saml', connected: true, email: 'user@example.test' },
      { id: 'oidc.organization', label: 'Organization sign-in', protocol: 'oidc', connected: false, email: null },
    ]);
  });
  it('refuses to disconnect the last sign-in method', async () => {
    admin.getUser.mockResolvedValue({ providerData: [{ providerId: 'saml.institution', email: 'user@example.test' }] });
    const result = await api().request('/auth/identities/saml.institution', { method: 'DELETE' });
    expect(result.status).toBe(422);
    expect(admin.updateUser).not.toHaveBeenCalled();
  });
  it('disconnects only the configured linked identity and rejects arbitrary provider identifiers', async () => {
    expect((await api().request('/auth/identities/saml.institution', { method: 'DELETE' })).status).toBe(200);
    expect(admin.updateUser).toHaveBeenCalledWith('u1', { providersToUnlink: ['saml.institution'] });
    expect((await api().request('/auth/identities/oidc.unknown', { method: 'DELETE' })).status).toBe(404);
    expect((await api().request('/auth/identities/oidc.organization', { method: 'DELETE' })).status).toBe(404);
  });
});
