import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { C, col, db } from '../firebase.js';
import { env } from '../env.js';

/**
 * Settings an admin can change from the browser. Each one overrides the server's
 * environment value of the same name; secrets are encrypted at rest and never sent
 * back in full (only whether they are set and their last 4 characters).
 */
export const SETTING_FIELDS = [
  { key: 'llmProvider', group: 'ai', label: 'AI provider', secret: false, options: ['', 'deepseek', 'openai', 'anthropic', 'openrouter', 'ollama'] },
  { key: 'llmApiKey', group: 'ai', label: 'AI API key', secret: true },
  { key: 'llmModel', group: 'ai', label: 'Fast model (autocomplete, edits, chat)', secret: false },
  { key: 'llmReviewModel', group: 'ai', label: 'Review model', secret: false },
  { key: 'llmBaseUrl', group: 'ai', label: 'Custom API base URL (optional)', secret: false },
  { key: 'papersProvider', group: 'papers', label: 'Papers from', secret: false, options: ['', 'scholar', 'openalex'], labels: { '': 'Scholar (default)', scholar: 'Scholar', openalex: 'OpenAlex' } },
  { key: 'scholarApiKey', group: 'papers', label: 'Scholar API key', secret: true, placeholder: 'oak_…', showWhen: { papersProvider: ['', 'scholar'] },
    link: { label: 'Get a free key', href: 'https://scholar.citedevidence.com/account/api-keys' },
    help: 'Sign in at scholar.citedevidence.com, open API keys, turn on Metadata, Files and Research, then paste the key here. 1,000 free credits a day.' },
  { key: 'openalexEmail', group: 'papers', label: 'Contact email for OpenAlex', secret: false },
  { key: 'zoteroClientKey', group: 'library', label: 'Zotero client key (optional)', secret: false,
    link: { label: 'Register an app', href: 'https://www.zotero.org/oauth/apps' },
    help: 'Optional: adds a "Connect Zotero" button. Without it people paste an API key from zotero.org/settings/keys, which works too.' },
  { key: 'zoteroClientSecret', group: 'library', label: 'Zotero client secret', secret: true },
  { key: 'mendeleyClientId', group: 'library', label: 'Mendeley application ID', secret: false, placeholder: '12345',
    link: { label: 'Register an app', href: 'https://dev.mendeley.com/myapps.html' },
    help: 'Create an app at dev.mendeley.com with the redirect URL shown below, then paste its ID and secret. Until then the Mendeley tab asks people to export a .bib file.' },
  { key: 'mendeleyClientSecret', group: 'library', label: 'Mendeley application secret', secret: true },
  { key: 'cloudDeepseekKey', group: 'cloud', label: 'Developer API: upstream DeepSeek key', secret: true },
  { key: 'cloudScholarKey', group: 'cloud', label: 'Developer API: upstream Scholar key', secret: true },
  { key: 'cloudDailyFreeCredits', group: 'cloud', label: 'Free credits a day per account', secret: false, placeholder: '1000' },
  { key: 'cloudStarterCredits', group: 'cloud', label: 'One-time starter credits', secret: false, placeholder: '100' },
  { key: 'signinPassword', group: 'signin', label: 'Email and password', secret: false, kind: 'toggle', default: 'on' },
  { key: 'signinGoogle', group: 'signin', label: 'Google', secret: false, kind: 'toggle', default: 'on' },
  { key: 'signinMicrosoft', group: 'signin', label: 'Microsoft', secret: false, kind: 'toggle', default: 'on' },
  { key: 'signinApple', group: 'signin', label: 'Apple', secret: false, kind: 'toggle', default: 'on' },
  { key: 'mailProvider', group: 'email', label: 'Send emails with', secret: false, options: ['', 'smtp', 'resend'], labels: { '': 'Off', smtp: 'SMTP', resend: 'Resend' } },
  { key: 'mailFrom', group: 'email', label: 'From', secret: false, placeholder: 'WriteOrbit <hello@example.com>', showWhen: { mailProvider: ['smtp', 'resend'] } },
  { key: 'mailReplyTo', group: 'email', label: 'Reply-to (optional)', secret: false, placeholder: 'support@example.com', showWhen: { mailProvider: ['smtp', 'resend'] } },
  { key: 'smtpHost', group: 'email', label: 'SMTP host', secret: false, placeholder: 'smtp.example.com', showWhen: { mailProvider: ['smtp'] } },
  { key: 'smtpPort', group: 'email', label: 'Port', secret: false, placeholder: '587', showWhen: { mailProvider: ['smtp'] } },
  { key: 'smtpSecurity', group: 'email', label: 'Security', secret: false, options: ['starttls', 'tls', 'none'], labels: { starttls: 'STARTTLS (port 587)', tls: 'TLS (port 465)', none: 'None' }, showWhen: { mailProvider: ['smtp'] } },
  { key: 'smtpUser', group: 'email', label: 'Username', secret: false, showWhen: { mailProvider: ['smtp'] } },
  { key: 'smtpPassword', group: 'email', label: 'Password', secret: true, showWhen: { mailProvider: ['smtp'] } },
  { key: 'resendApiKey', group: 'email', label: 'Resend API key', secret: true, showWhen: { mailProvider: ['resend'] } },
  { key: 'newsletterProvider', group: 'newsletter', label: 'Send newsletters with', secret: false, options: ['', 'mailcheap'], labels: { '': 'Off', mailcheap: 'MailCheap' } },
  { key: 'mailcheapApiKey', group: 'newsletter', label: 'MailCheap API key', secret: true, showWhen: { newsletterProvider: ['mailcheap'] } },
  { key: 'mailcheapNewsletter', group: 'newsletter', label: 'Newsletter slug (optional)', secret: false, placeholder: 'Your default newsletter', showWhen: { newsletterProvider: ['mailcheap'] } },
  { key: 'stripeSecretKey', group: 'billing', label: 'Stripe secret key', secret: true, placeholder: 'sk_test_… (sk_live_… needs BILLING_LIVE=1)' },
  { key: 'stripeWebhookSecret', group: 'billing', label: 'Stripe webhook signing secret', secret: true },
] as const;

export type SettingKey = (typeof SETTING_FIELDS)[number]['key'];
export type EffectiveSettings = typeof env;

let overrides: Partial<Record<SettingKey, string>> = {};
let version = 0;
const listeners = new Set<() => void>();

function cipherKey() {
  // SETTINGS_KEY. Installs moved from the Postgres version that never set one encrypted with
  // their JWT_SECRET instead: keep it in the environment and those values still open.
  const secret = env.settingsKey || (process.env.JWT_SECRET ?? '').trim();
  if (!secret) throw new Error('SETTINGS_KEY must be set to save or read admin settings.');
  return createHash('sha256').update(`writeorbit-settings:${secret}`).digest();
}

function encrypt(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', cipherKey(), iv);
  const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((part) => part.toString('base64')).join('.');
}

function decrypt(stored: string) {
  const [iv, tag, data] = stored.split('.').map((part) => Buffer.from(part, 'base64'));
  const decipher = createDecipheriv('aes-256-gcm', cipherKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

/** Encrypts a secret for storage elsewhere (reference manager tokens) with the same key as settings. */
export const sealSecret = (value: string) => encrypt(value);
export const openSecret = (stored: string) => decrypt(stored);

type StoredSetting = { key: string; value_encrypted: string };

function apply(stored: StoredSetting[]) {
  const known = new Set<string>(SETTING_FIELDS.map((field) => field.key));
  const next: Partial<Record<SettingKey, string>> = {};
  for (const item of stored) {
    if (!known.has(item.key)) continue;
    try { next[item.key as SettingKey] = decrypt(item.value_encrypted); } catch { console.error(`setting ${item.key} could not be decrypted (was SETTINGS_KEY changed?)`); }
  }
  overrides = next;
  version += 1;
  listeners.forEach((listener) => listener());
}

/** Loads saved overrides from Firestore (`app_settings/{key}`). */
export async function loadSettings() {
  const snapshot = await col(C.appSettings).get();
  apply(snapshot.docs.map((doc) => ({ key: doc.id, value_encrypted: String(doc.get('value_encrypted') ?? '') })));
}

let unwatch: (() => void) | null = null;
/**
 * Keeps this instance's settings in step with `app_settings` (App Hosting, the collab service
 * and Functions run many instances; a change made in Admin on one reaches all of them).
 */
export function watchSettings() {
  if (unwatch) return;
  unwatch = col(C.appSettings).onSnapshot(
    (snapshot) => apply(snapshot.docs.map((doc) => ({ key: doc.id, value_encrypted: String(doc.get('value_encrypted') ?? '') }))),
    (error) => { console.error('settings listener stopped', error); unwatch = null; },
  );
}

/** The settings in force: admin overrides first, then the server environment. */
export function settings(): EffectiveSettings {
  return { ...env, ...overrides } as EffectiveSettings;
}

export function settingsVersion() {
  return version;
}

export function onSettingsChange(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Saves (or with null, clears) settings, then reloads them for every request. */
export async function saveSettings(values: Partial<Record<SettingKey, string | null>>, userId: string) {
  const known = new Set<string>(SETTING_FIELDS.map((field) => field.key));
  const batch = db().batch();
  for (const [key, raw] of Object.entries(values)) {
    if (!known.has(key)) continue;
    const value = typeof raw === 'string' ? raw.trim() : null;
    if (value) batch.set(col(C.appSettings).doc(key), { value_encrypted: encrypt(value), updated_by: userId, updated_at: new Date() });
    else batch.delete(col(C.appSettings).doc(key));
    batch.set(col(C.adminAudit).doc(), { user_id: userId, action: value ? 'setting_saved' : 'setting_cleared', target: key, created_at: new Date() });
  }
  await batch.commit();
  await loadSettings();
}

/** What the admin page may see: set or not, where it comes from, and a masked preview. */
export function describeSettings() {
  const effective = settings() as unknown as Record<string, unknown>;
  return SETTING_FIELDS.map((field) => {
    const value = String(effective[field.key] ?? '');
    const source = overrides[field.key] ? 'admin' : value ? 'server' : 'unset';
    return {
      key: field.key,
      group: field.group,
      label: field.label,
      secret: field.secret,
      options: 'options' in field ? field.options : undefined,
      labels: 'labels' in field ? field.labels : undefined,
      placeholder: 'placeholder' in field ? field.placeholder : undefined,
      // Shown only while another setting in the group has one of these values.
      show_when: 'showWhen' in field ? field.showWhen : undefined,
      // Where to get the value, and a one-line how-to.
      link: 'link' in field ? field.link : undefined,
      help: 'help' in field ? field.help : undefined,
      // 'toggle': the value is 'on' or 'off'; unset means `default`.
      kind: 'kind' in field ? field.kind : undefined,
      default: 'default' in field ? field.default : undefined,
      set: Boolean(value),
      source,
      value: field.secret ? (value ? `••••${value.slice(-4)}` : '') : value,
    };
  });
}
