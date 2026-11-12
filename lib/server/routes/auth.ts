import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { env } from '../env.js';
import { bearer, decodeToken, forgetUser, requireUser, requireUserForDeletion, type AppVariables } from '../auth.js';
import { adminAuth, C, col, getRow } from '../firebase.js';
import { rateLimit } from '../lib/rateLimit.js';
import { requireAppCheck } from '../lib/appCheck.js';
import { institutionalProviders, METHODS, PROVIDER_IDS, PROVIDERS, type Provider } from '../lib/signin.js';
import { RESEARCH_ROLES, publicUser, signedIn, userByEmail, type UserDoc } from '../lib/users.js';
import { forgetLegacyPassword, legacyPassword, verifyLegacyPassword } from '../lib/legacyPasswords.js';
import { deleteUserData } from '../lib/accountDeletion.js';

/**
 * Account endpoints. Signing in, signing up, password reset and email confirmation happen in
 * the browser with Firebase Authentication; these routes cover what Firebase cannot know:
 * the person's AI for Research profile and plan, which methods this site offers, passwords carried
 * over from the self-hosted version, and deleting an account with its data.
 */

const loginBody = z.object({ email: z.string().trim().toLowerCase().email().max(254), password: z.string().min(1).max(200) });
const profileBody = z.object({
  full_name: z.string().trim().max(120).optional(),
  profile: z.object({
    role: z.enum(RESEARCH_ROLES).nullable().optional(),
    field: z.string().trim().max(80).nullable().optional(),
    citation_style: z.string().trim().max(80).nullable().optional(),
    language: z.string().trim().max(40).nullable().optional(),
  }).optional(),
});
const providerParam = z.enum(['google']);

export function authRoutes() {
  const app = new Hono<{ Variables: AppVariables }>();

  /** password_reset: Firebase sends reset links itself, so "Forgot password?" always works. */
  app.get('/methods', (c) => c.json({ ...METHODS, sso: institutionalProviders(), password_reset: true, support_email: env.supportEmail || null }));

  /** The signed-in person; also where a fresh sign-in is recorded (last seen, admin, invitations). */
  app.get('/me', requireUser, async (c) => {
    const decoded = await decodeToken(bearer(c) || '');
    const user = await signedIn(c.get('user')!, Boolean(decoded?.email_verified));
    forgetUser(user.id);
    return c.json(await publicUser(user));
  });

  app.patch('/me', requireUser, async (c) => {
    const parsed = profileBody.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw new HTTPException(422, { message: 'Enter a name of up to 120 characters.' });
    const user = c.get('user')!;
    let fullName = user.full_name;
    if (parsed.data.full_name !== undefined) {
      fullName = parsed.data.full_name || null;
      await col(C.users).doc(user.id).update({ full_name: fullName });
      await adminAuth().updateUser(user.id, { displayName: fullName }).catch(() => undefined);
    }
    if (parsed.data.profile) {
      const updates = Object.fromEntries(Object.entries(parsed.data.profile).filter(([, value]) => value !== undefined).map(([key, value]) => [`profile.${key}`, value || null]));
      if (Object.keys(updates).length) await col(C.users).doc(user.id).update(updates);
    }
    forgetUser(user.id);
    return c.json(await publicUser({ ...user, full_name: fullName }));
  });

  /** Deletes the account and everything in it. The Auth user goes last (its trigger repeats the cleanup harmlessly). */
  app.delete('/me', requireUserForDeletion, rateLimit({ key: 'delete-account', limit: 5, windowSeconds: 3600 }), async (c) => {
    const user = c.get('user')!;
    await deleteUserData(user.id);
    await adminAuth().deleteUser(user.id).catch((error) => {
      if ((error as { code?: string }).code !== 'auth/user-not-found') throw error;
    });
    forgetUser(user.id);
    return c.json({ ok: true });
  });

  /**
   * A password from the self-hosted version (argon2, which Firebase cannot import). The browser
   * calls this when Firebase refuses the password; on success the same password is set in
   * Firebase Auth and the browser signs in again with it.
   */
  app.post('/legacy-login', requireAppCheck, rateLimit({ key: 'legacy-login', limit: 20, windowSeconds: 900 }), async (c) => {
    const parsed = loginBody.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw new HTTPException(422, { message: 'Enter your email and password.' });
    const { email, password } = parsed.data;
    const legacy = await legacyPassword(email);
    const ok = legacy && (await verifyLegacyPassword(legacy.hash, password));
    if (!legacy || !ok) throw new HTTPException(401, { message: 'That email and password do not match.' });
    const profile = await userByEmail(email);
    if (profile?.disabled_at) throw new HTTPException(401, { message: 'That email and password do not match.' });
    const uid = profile?.id || legacy.user_id;
    try {
      await adminAuth().updateUser(uid, { password });
    } catch (error) {
      if ((error as { code?: string }).code !== 'auth/user-not-found') throw error;
      await adminAuth().createUser({
        uid, email, password, displayName: profile?.full_name || undefined, emailVerified: Boolean(profile?.email_verified_at),
      });
    }
    await forgetLegacyPassword(email);
    return c.json({ ok: true });
  });

  /** For the account page: how this person can sign in (from Firebase Auth). */
  app.get('/sign-in-methods/me', requireUser, async (c) => {
    const record = await adminAuth().getUser(c.get('user')!.id);
    const linked = (provider: Provider) => record.providerData.find((info) => info.providerId === PROVIDER_IDS[provider]);
    const institutional = institutionalProviders();
    return c.json({
      password: record.providerData.some((info) => info.providerId === 'password'),
      providers: Object.fromEntries(PROVIDERS.map((provider) => [provider, { connected: Boolean(linked(provider)), email: linked(provider)?.email ?? null }])),
      email_verified: record.emailVerified,
      sso: institutional.map((provider) => {
        const identity = record.providerData.find((info) => info.providerId === provider.id);
        return { ...provider, connected: Boolean(identity), email: identity?.email ?? null };
      }),
      available: { ...METHODS, sso: institutional },
    });
  });

  app.delete('/identities/:provider', requireUser, async (c) => {
    const requested = c.req.param('provider');
    const provider = providerParam.safeParse(requested);
    const institutional = institutionalProviders().find((candidate) => candidate.id === requested);
    if (!provider.success && !institutional) throw new HTTPException(404, { message: 'Unknown sign-in method.' });
    const providerId = provider.success ? PROVIDER_IDS[provider.data] : institutional!.id;
    const user = c.get('user')!;
    const record = await adminAuth().getUser(user.id);
    if (record.providerData.length <= 1) throw new HTTPException(422, { message: 'This is your only way to sign in. Add another one first.' });
    if (!record.providerData.some((info) => info.providerId === providerId)) throw new HTTPException(404, { message: 'That sign-in method is not connected.' });
    await adminAuth().updateUser(user.id, { providersToUnlink: [providerId] });
    return c.json({ ok: true });
  });

  return app;
}
