import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fake = await vi.hoisted(async () => (await import('./fakeFirestore.js')).createFakeFirestore());
vi.mock('../src/firebase.js', async (original) => ({ ...(await original<typeof import('../src/firebase.js')>()), ...fake.module }));

const { checkKey, keyFromRef, contentTypeFor } = await import('../src/lib/storage.js');
const { mailProvider, resendBody, sendMail, smtpOptions } = await import('../src/lib/mail.js');
const { passwordResetEmail } = await import('../src/lib/emails.js');
const { MailCheap, MailCheapError, syncNewsletter, newsletterCounts } = await import('../src/lib/newsletter.js');
const { env } = await import('../src/env.js');

const base = { ...env };
afterEach(() => vi.unstubAllGlobals());

describe('file keys', () => {
  it('accepts plain relative keys and refuses anything that could leave the folder', () => {
    expect(checkKey('library/u1/doc.pdf')).toBe('library/u1/doc.pdf');
    for (const bad of ['../etc/passwd', '/abs/file', 'a//b', 'a/../b', 'a/./b', '', 'a b.pdf', 'x/.hidden']) expect(() => checkKey(bad)).toThrow();
  });

  it('turns absolute paths saved by the Postgres version into bucket keys', () => {
    expect(keyFromRef('/data/files/library/u1/d1.pdf')).toBe('library/u1/d1.pdf');
    expect(keyFromRef('library/u1/d1.pdf')).toBe('library/u1/d1.pdf');
    expect(keyFromRef('/etc/passwd')).toBeNull();
    expect(keyFromRef('/data/files/../secrets')).toBeNull();
    expect(keyFromRef(null)).toBeNull();
  });

  it('knows the content types the app stores', () => {
    expect(contentTypeFor('library/u/x.pdf')).toBe('application/pdf');
    expect(contentTypeFor('documents/d/blocks.json')).toBe('application/json');
    expect(contentTypeFor('a/b.unknown')).toBe('application/octet-stream');
  });
});

describe('email', () => {
  const s = (overrides: Partial<typeof env>) => ({ ...base, mailFrom: 'ResearchCove <hello@example.test>', ...overrides });

  it('needs a provider, its settings and a From address', () => {
    expect(mailProvider(s({ mailProvider: '' }))).toBeNull();
    expect(mailProvider(s({ mailProvider: 'smtp', smtpHost: '' }))).toBeNull();
    expect(mailProvider(s({ mailProvider: 'smtp', smtpHost: 'smtp.test', mailFrom: '' }))).toBeNull();
    expect(mailProvider(s({ mailProvider: 'smtp', smtpHost: 'smtp.test' }))).toBe('smtp');
    expect(mailProvider(s({ mailProvider: 'resend', resendApiKey: 're_123' }))).toBe('resend');
  });

  it('maps the SMTP security choice', () => {
    expect(smtpOptions(s({ smtpHost: 'h', smtpPort: '', smtpSecurity: 'tls' }))).toMatchObject({ port: 465, secure: true, requireTLS: false });
    expect(smtpOptions(s({ smtpHost: 'h', smtpPort: '587', smtpSecurity: 'starttls', smtpUser: 'u', smtpPassword: 'p' }))).toMatchObject({ port: 587, secure: false, requireTLS: true, auth: { user: 'u', pass: 'p' } });
    expect(smtpOptions(s({ smtpHost: 'h', smtpPort: '25', smtpSecurity: 'none', smtpUser: '' }))).toMatchObject({ port: 25, ignoreTLS: true, auth: undefined });
  });

  it('sends through Resend with the key and reply-to', () => {
    const mail = passwordResetEmail('a@b.test', 'https://example.test/reset-password#token=x');
    expect(resendBody(mail, s({ mailReplyTo: 'support@example.test' }))).toEqual({
      from: 'ResearchCove <hello@example.test>', to: ['a@b.test'], subject: 'Reset your ResearchCove password', html: mail.html, text: mail.text, reply_to: 'support@example.test',
    });
  });

  it('refuses to send when email is off', async () => {
    await expect(sendMail(passwordResetEmail('a@b.test', 'https://x.test'))).rejects.toThrow(/Email is not set up/);
  });

  it('escapes what goes into the HTML and keeps a plain-text copy', () => {
    const mail = passwordResetEmail('<b>@x.test', 'https://example.test/reset-password#token=a&b');
    expect(mail.html).toContain('&lt;b&gt;@x.test');
    expect(mail.html).toContain('token=a&amp;b');
    expect(mail.text).toContain('Choose a new password: https://example.test/reset-password#token=a&b');
  });
});

describe('MailCheap client', () => {
  const reply = (status: number, body: unknown, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

  it('sends the key, the newsletter and consent with imports', async () => {
    const seen: { url: string; init: RequestInit }[] = [];
    const fetcher = (async (url: URL, init: RequestInit) => { seen.push({ url: String(url), init }); return reply(200, { importId: 'imp_1' }); }) as unknown as typeof fetch;
    const client = new MailCheap('mc_key', 'researchcove-news', fetcher, 'https://mc.test/api/v1', 1);
    expect(await client.importContacts([{ email: 'a@b.test', status: 'active', tags: ['researchcove'] }])).toEqual({ importId: 'imp_1' });
    expect(seen[0].url).toBe('https://mc.test/api/v1/contacts/import');
    expect((seen[0].init.headers as Record<string, string>).Authorization).toBe('Bearer mc_key');
    expect(JSON.parse(String(seen[0].init.body))).toEqual({ consent: true, contacts: [{ email: 'a@b.test', status: 'active', tags: ['researchcove'] }], newsletter: 'researchcove-news' });
  });

  it('keeps + and @ in a contact address and only gives consent when subscribing', async () => {
    const seen: { url: string; body: unknown }[] = [];
    const fetcher = (async (url: URL, init: RequestInit) => { seen.push({ url: String(url), body: JSON.parse(String(init.body)) }); return reply(200, {}); }) as unknown as typeof fetch;
    const client = new MailCheap('k', null, fetcher, 'https://mc.test/api/v1', 1);
    await client.setStatus('a+news@b.test', 'unsubscribed');
    await client.setStatus('a+news@b.test', 'active');
    expect(seen[0]).toEqual({ url: 'https://mc.test/api/v1/contacts/a%2Bnews@b.test', body: { status: 'unsubscribed' } });
    expect(seen[1].body).toEqual({ status: 'active', consent: true });
  });

  it('retries rate limits, then reports the API error code', async () => {
    let calls = 0;
    const fetcher = (async () => { calls += 1; return calls < 3 ? reply(429, { error: { code: 'rate_limited', message: 'slow down' } }, { 'retry-after': '0' }) : reply(401, { error: { code: 'unauthorized', message: 'Send a valid API key' } }); }) as unknown as typeof fetch;
    const client = new MailCheap('bad', null, fetcher, 'https://mc.test/api/v1', 1);
    const error = await client.billing().catch((caught) => caught);
    expect(error).toBeInstanceOf(MailCheapError);
    expect(error).toMatchObject({ status: 401, code: 'unauthorized' });
    expect(calls).toBe(3);
  });

  it('pages through contacts with the cursor', async () => {
    const pages: Record<string, unknown> = { '': { contacts: [{ email: 'a@b.test' }], nextCursor: 'c2' }, c2: { contacts: [{ email: 'c@d.test' }] } };
    const fetcher = (async (url: URL) => reply(200, pages[url.searchParams.get('cursor') ?? ''])) as unknown as typeof fetch;
    const client = new MailCheap('k', 'news', fetcher, 'https://mc.test/api/v1', 1);
    const emails: string[] = [];
    for await (const contact of client.contacts('unsubscribed')) emails.push(contact.email!);
    expect(emails).toEqual(['a@b.test', 'c@d.test']);
  });
});

describe('newsletter sync against Firestore', () => {
  beforeEach(() => fake.clear());
  const person = (id: string, fields: Record<string, unknown>) => fake.put(`users/${id}`, {
    email: `${id}@x.test`, full_name: 'Ada Lovelace', disabled_at: null, email_verified_at: new Date(), newsletter_opt_out: false,
    newsletter_dirty: false, newsletter_synced: null, newsletter_error: null, newsletter_synced_at: null, ...fields,
  });

  it('adds confirmed people, mirrors leavers and sends changed choices', async () => {
    person('new', {});
    person('unconfirmed', { email_verified_at: null });
    person('left', { newsletter_synced: 'active' });
    person('changed', { newsletter_synced: 'active', newsletter_opt_out: true, newsletter_dirty: true });
    const calls: string[] = [];
    const client = {
      async *contacts(status: string) { if (status === 'unsubscribed') yield { email: 'LEFT@x.test' }; },
      importContacts: async (contacts: { email: string; firstName?: string }[]) => { calls.push(`import ${contacts.map((c) => `${c.email}/${c.firstName}`).join(',')}`); return {}; },
      setStatus: async (email: string, status: string) => { calls.push(`status ${email} ${status}`); return {}; },
    } as unknown as InstanceType<typeof MailCheap>;
    const result = await syncNewsletter(client);
    expect(result).toMatchObject({ imported: 1, updated: 1, mirrored: 1, failed: 0, error: null });
    expect(calls).toEqual(['status changed@x.test unsubscribed', 'import new@x.test/Ada']);
    expect(fake.read('users/left')).toMatchObject({ newsletter_opt_out: true, newsletter_synced: 'unsubscribed' });
    expect(fake.read('users/new')).toMatchObject({ newsletter_synced: 'active', newsletter_dirty: false });
    expect(fake.read('users/changed')).toMatchObject({ newsletter_synced: 'unsubscribed', newsletter_dirty: false });
    expect(await newsletterCounts()).toEqual({ subscribed: 1, left: 2, waiting: 0, unconfirmed: 1, errors: 0 });
  });
});
