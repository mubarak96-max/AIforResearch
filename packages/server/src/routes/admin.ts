import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { AggregateField } from 'firebase-admin/firestore';
import { C, col, getMany, rows } from '../firebase.js';
import { requireAdmin, type AppVariables } from '../auth.js';
import { describeSettings, saveSettings, settings, SETTING_FIELDS, type SettingKey } from '../lib/settings.js';
import { WEBHOOK_EVENTS } from './stripeWebhook.js';
import { env } from '../env.js';
import { stripeClient } from '../lib/stripeBilling.js';
import { loadPlans } from '../lib/plans.js';
import { checkScholar } from '../lib/scholar.js';
import { mendeleyRedirectUri, zoteroCallbackUrl } from '../lib/referenceManagers.js';
import { syncPlanToStripe } from '../lib/planBilling.js';
import { SERVICES } from '../lib/prices.js';
import type { Slots } from '../slots/types.js';
import { testStorage } from '../lib/storage.js';
import { mailProvider, sendMail } from '../lib/mail.js';
import { testEmail } from '../lib/emails.js';
import { describeMailCheap, lastNewsletterSync, newsletterCounts, newsletterOn, syncNewsletter } from '../lib/newsletter.js';

const SIGNIN_PROVIDERS = ['google', 'microsoft', 'apple'] as const;
const SIGNIN_SWITCH = { google: 'signinGoogle', microsoft: 'signinMicrosoft', apple: 'signinApple' } as const;
const isOn = (value: unknown, fallback = 'on') => String(value || fallback).toLowerCase() !== 'off';

/**
 * Where Google, Microsoft and Apple send people back: Firebase Authentication's handler on the
 * project's auth domain (the same URL for every provider; set it in each provider's console).
 */
function authHandlerUrl() {
  const domain = (process.env.FIREBASE_AUTH_DOMAIN || process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '').trim()
    || `${process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || '<project-id>'}.firebaseapp.com`;
  return `https://${domain.replace(/^https?:\/\//, '').replace(/\/+$/, '')}/__/auth/handler`;
}

/** Email and password stays on unless at least one provider is on to sign people in instead. */
function passwordSwitchProblem(next: Record<string, unknown>): string | null {
  if (isOn(next.signinPassword)) return null;
  if (SIGNIN_PROVIDERS.some((provider) => isOn(next[SIGNIN_SWITCH[provider]]))) return null;
  return 'Keep email and password on, or turn on Google, Microsoft or Apple first (and enable it in Firebase console › Authentication).';
}

const monthStart = (now = new Date()) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
const count = async (query: FirebaseFirestore.Query) => (await query.count().get()).data().count;

const keys = SETTING_FIELDS.map((field) => field.key) as [SettingKey, ...SettingKey[]];

/** Admin page API: provider keys and options, connection tests, Stripe set-up, an overview. */
export function adminRoutes(slots: Slots) {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use('*', requireAdmin);

  app.get('/settings', (c) => c.json({
    settings: describeSettings(),
    // What to paste into Stripe → Developers → Webhooks → Add endpoint.
    stripe_webhook: { url: `${settings().publicUrl.replace(/\/$/, '')}/api/stripe/webhook`, events: WEBHOOK_EVENTS },
    // What to paste as the redirect / return URL in Google, Microsoft and Apple (Firebase's handler).
    signin_redirects: Object.fromEntries(SIGNIN_PROVIDERS.map((provider) => [provider, authHandlerUrl()])),
    library_redirects: { zotero: zoteroCallbackUrl(), mendeley: mendeleyRedirectUri() },
  }));

  app.put('/settings', async (c) => {
    const parsed = z.object({ values: z.record(z.enum(keys), z.string().max(4000).nullable()) }).safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw new HTTPException(422, { message: 'Unknown setting.' });
    const stripeKey = parsed.data.values.stripeSecretKey;
    if (stripeKey && !/^(sk|rk)_test_/.test(stripeKey.trim())) {
      throw new HTTPException(422, { message: 'Use a Stripe TEST key (sk_test_…) for now. Live billing opens after the switch-over.' });
    }
    // Email and password stays on until a provider can sign people up instead.
    const next = { ...settings() } as unknown as Record<string, unknown>;
    for (const [key, value] of Object.entries(parsed.data.values)) next[key] = value?.trim() || String((env as Record<string, unknown>)[key] ?? '');
    const problem = passwordSwitchProblem(next);
    if (problem) throw new HTTPException(422, { message: problem });
    await saveSettings(parsed.data.values, c.get('user')!.id);
    return c.json({ settings: describeSettings() });
  });

  app.post('/test/ai', async (c) => {
    const started = Date.now();
    try {
      const result = await slots.llm.complete({ messages: [{ role: 'user', content: 'Reply with the single word: ready' }], maxTokens: 5, temperature: 0 });
      return c.json({ ok: true, provider: slots.llm.provider, reply: result.text.trim().slice(0, 40), ms: Date.now() - started });
    } catch (error) {
      return c.json({ ok: false, provider: slots.llm.provider, error: (error as Error).message.slice(0, 300) });
    }
  });

  app.post('/test/papers', async (c) => {
    const started = Date.now();
    try {
      const papers = await slots.papers.search({ query: 'sleep memory consolidation', limit: 1 });
      const scholar = slots.papers.provider === 'openalex' ? null : await checkScholar();
      return c.json({
        ok: papers.length > 0, provider: slots.papers.provider, sample: papers[0]?.title ?? null, ms: Date.now() - started,
        ...(scholar ? { full_text: scholar.files ? 'on' : 'off', research_tools: scholar.research ? 'on' : 'off', ...(scholar.requests_left_today ? { requests_left_today: scholar.requests_left_today } : {}) } : {}),
      });
    } catch (error) {
      return c.json({ ok: false, provider: slots.papers.provider, error: (error as Error).message.slice(0, 300) });
    }
  });

  app.post('/test/stripe', async (c) => {
    try {
      const stripe = stripeClient();
      if (!stripe) return c.json({ ok: false, error: 'No Stripe key saved yet.' });
      const balance = await stripe.balance.retrieve();
      return c.json({ ok: true, mode: balance.livemode ? 'live' : 'test' });
    } catch (error) {
      return c.json({ ok: false, error: (error as Error).message.slice(0, 300) });
    }
  });

  app.post('/test/storage', async (c) => {
    try {
      const result = await testStorage();
      return c.json({ ok: true, provider: `Cloud Storage for Firebase (${result.bucket})`, ms: result.ms });
    } catch (error) {
      return c.json({ ok: false, error: (error as Error).message.slice(0, 300) });
    }
  });

  /** Sends a test email to the admin who asks. */
  app.post('/test/email', async (c) => {
    const provider = mailProvider();
    if (!provider) return c.json({ ok: false, error: 'Choose SMTP or Resend, fill in its settings and a From address, then save.' });
    const to = c.get('user')!.email;
    try {
      await sendMail(testEmail(to, provider === 'smtp' ? 'SMTP' : 'Resend'));
      return c.json({ ok: true, provider: provider === 'smtp' ? 'SMTP' : 'Resend', mode: `sent to ${to}` });
    } catch (error) {
      return c.json({ ok: false, error: (error as Error).message.slice(0, 300) });
    }
  });

  app.post('/test/newsletter', async (c) => {
    if (!newsletterOn()) return c.json({ ok: false, error: 'Choose MailCheap and save its API key first.' });
    try {
      const info = await describeMailCheap();
      const usage = info.contacts !== null ? `${info.contacts.toLocaleString('en-US')}${info.limit ? ` of ${info.limit.toLocaleString('en-US')}` : ''} contacts` : '';
      return c.json({ ok: true, provider: 'MailCheap', mode: [info.plan, usage].filter(Boolean).join(' · ') });
    } catch (error) {
      return c.json({ ok: false, error: (error as Error).message.slice(0, 300) });
    }
  });

  /** Files always live in the project's Cloud Storage bucket; nothing to copy any more. */
  app.get('/storage', (c) => c.json({ provider: 'firebase', copy: null }));

  app.get('/newsletter', async (c) => c.json({ on: newsletterOn(), counts: await newsletterCounts(), last_sync: lastNewsletterSync() }));
  app.post('/newsletter/sync', async (c) => {
    if (!newsletterOn()) throw new HTTPException(422, { message: 'Choose MailCheap and save its API key first.' });
    const result = await syncNewsletter();
    return c.json({ result, counts: await newsletterCounts() });
  });

  /**
   * One click: points a Stripe webhook at this server with the events it needs (saving the new
   * signing secret), and creates the Stripe prices of every plan sold online.
   */
  app.post('/stripe/setup', async (c) => {
    const stripe = stripeClient();
    if (!stripe) throw new HTTPException(422, { message: 'Save a Stripe secret key first.' });
    const url = `${settings().publicUrl.replace(/\/$/, '')}/api/stripe/webhook`;
    const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
    const existing = endpoints.data.find((endpoint) => endpoint.url === url);
    let created = false;
    if (existing) {
      await stripe.webhookEndpoints.update(existing.id, { enabled_events: [...WEBHOOK_EVENTS], disabled: false });
    } else {
      const endpoint = await stripe.webhookEndpoints.create({ url, enabled_events: [...WEBHOOK_EVENTS], description: 'ResearchCove' });
      if (endpoint.secret) await saveSettings({ stripeWebhookSecret: endpoint.secret }, c.get('user')!.id);
      created = true;
    }
    const { plans } = await loadPlans();
    let synced = 0;
    for (const plan of plans.filter((item) => item.checkout === 'self_serve' && !item.is_default)) {
      await syncPlanToStripe(stripe, plan.id);
      synced += 1;
    }
    return c.json({ ok: true, webhook: created ? 'created' : 'updated', plans: synced });
  });

  app.get('/overview', async (c) => {
    const since = monthStart();
    const [users, documents, library, keys, usageLines, auditRows] = await Promise.all([
      count(col(C.users)), count(col(C.documents)), count(col(C.libraryDocuments)), count(col(C.apiKeys).where('revoked_at', '==', null)),
      Promise.all(Object.keys(SERVICES).sort().map(async (service) => {
        const snapshot = await col(C.usageEvents).where('service', '==', service).where('created_at', '>=', since)
          .aggregate({ calls: AggregateField.count(), quantity: AggregateField.sum('quantity') }).get();
        return { service, quantity: Number(snapshot.data().quantity ?? 0), calls: snapshot.data().calls };
      })),
      col(C.adminAudit).orderBy('created_at', 'desc').limit(20).get().then((snapshot) => rows<Record<string, any>>(snapshot)),
    ]);
    const people = new Map((await getMany<{ id: string; email: string }>(C.users, auditRows.map((row) => row.user_id).filter(Boolean)))
      .map((person) => [person.id, person.email]));
    return c.json({
      counts: { users, documents, library, keys },
      usage: usageLines.filter((line) => line.calls > 0).map(({ service, quantity }) => ({ service, quantity })),
      audit: auditRows.map((row) => ({ action: row.action, target: row.target ?? null, created_at: row.created_at, email: people.get(row.user_id) ?? null })),
    });
  });

  return app;
}
