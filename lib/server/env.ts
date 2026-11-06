/** Server settings, read once from the environment. */
const read = (name: string, fallback = '') => (process.env[name] ?? fallback).trim();

export const env = {
  port: Number(read('PORT', '4000')),
  publicUrl: read('PUBLIC_URL', 'http://localhost:3000').replace(/\/+$/, ''),
  /** The converter (services/convert on Cloud Run). */
  convertUrl: read('CONVERT_URL', 'http://localhost:4100').replace(/\/+$/, ''),
  /** How the converter reaches this API (the web app's own address on App Hosting). */
  internalUrl: read('INTERNAL_URL', read('PUBLIC_URL', 'http://localhost:3000')).replace(/\/+$/, ''),
  /** Shared secret the converter and Cloud Functions send when they call internal endpoints. */
  internalSecret: read('INTERNAL_SECRET'),
  /** The collab service (services/collab on Cloud Run): live text and presence. */
  collabUrl: read('COLLAB_URL', 'http://localhost:4200').replace(/\/+$/, ''),
  /** Library embeddings for Firestore vector search: '' (word search only) | openai. */
  embeddingsProvider: read('EMBEDDINGS_PROVIDER'),
  embeddingsApiKey: read('EMBEDDINGS_API_KEY'),
  embeddingsModel: read('EMBEDDINGS_MODEL', 'text-embedding-3-small'),


  llmProvider: read('LLM_PROVIDER'),          // deepseek | openai | anthropic | openrouter | ollama
  llmApiKey: read('LLM_API_KEY'),
  llmBaseUrl: read('LLM_BASE_URL'),
  llmModel: read('LLM_MODEL'),                // fast model: autocomplete, edits, chat
  llmReviewModel: read('LLM_REVIEW_MODEL'),   // stronger model: reviews

  papersProvider: read('PAPERS_PROVIDER'),    // scholar (default) | openalex
  scholarUrl: read('SCHOLAR_URL', 'https://scholar.citedevidence.com').replace(/\/+$/, ''),
  scholarApiKey: read('SCHOLAR_API_KEY'),
  openalexEmail: read('OPENALEX_EMAIL'),
  /** Where people write when they are stuck (sign-in help); hidden when empty. */
  supportEmail: read('SUPPORT_EMAIL'),

  /** The developer API (/v1): upstreams and credits. */
  cloudDeepseekKey: read('CLOUD_DEEPSEEK_API_KEY'),
  cloudScholarKey: read('CLOUD_SCHOLAR_API_KEY'),
  cloudPapersUrl: read('CLOUD_PAPERS_URL', 'https://api.openalex.org').replace(/\/+$/, ''),
  cloudDailyFreeCredits: read('CLOUD_DAILY_FREE_CREDITS', '1000'),
  cloudStarterCredits: read('CLOUD_STARTER_CREDITS', '100'),

  /** People who may open the admin page (comma-separated emails). */
  adminEmails: read('ADMIN_EMAILS').toLowerCase().split(',').map((value) => value.trim()).filter(Boolean),
  /** Encrypts keys saved from the admin page (32+ characters). */
  settingsKey: read('SETTINGS_KEY'),

  /**
   * Sign-in methods shown on the sign-in page ('on'/'off', Admin › Sign-in). The providers
   * themselves are set up in Firebase console › Authentication; client ids live there.
   */
  signinPassword: read('SIGNIN_PASSWORD', 'on'),
  googleRedirectUri: read('GOOGLE_REDIRECT_URI'),
  /** Zotero sign-in (optional OAuth app from zotero.org/oauth/apps; API keys work without it). */
  zoteroClientKey: read('ZOTERO_CLIENT_KEY'),
  zoteroClientSecret: read('ZOTERO_CLIENT_SECRET'),
  zoteroCallbackUrl: read('ZOTERO_CALLBACK_URL'),
  /** Mendeley import (OAuth app from dev.mendeley.com). */
  mendeleyClientId: read('MENDELEY_CLIENT_ID'),
  mendeleyClientSecret: read('MENDELEY_CLIENT_SECRET'),
  signinGoogle: read('SIGNIN_GOOGLE', 'on'),
  googleClientId: read('GOOGLE_CLIENT_ID'),
  googleClientSecret: read('GOOGLE_CLIENT_SECRET'),
  signinMicrosoft: read('SIGNIN_MICROSOFT', 'on'),
  microsoftClientId: read('MICROSOFT_CLIENT_ID'),
  microsoftClientSecret: read('MICROSOFT_CLIENT_SECRET'),
  signinApple: read('SIGNIN_APPLE', 'on'),
  appleServicesId: read('APPLE_SERVICES_ID'),
  appleTeamId: read('APPLE_TEAM_ID'),
  appleKeyId: read('APPLE_KEY_ID'),
  applePrivateKey: read('APPLE_PRIVATE_KEY'),

  /** Account emails (password reset, email confirmation): 'smtp' or 'resend'; empty sends none. */
  mailProvider: read('MAIL_PROVIDER'),
  mailFrom: read('MAIL_FROM'),
  mailReplyTo: read('MAIL_REPLY_TO'),
  smtpHost: read('SMTP_HOST'),
  smtpPort: read('SMTP_PORT', '587'),
  /** 'starttls' (usually port 587), 'tls' (port 465) or 'none'. */
  smtpSecurity: read('SMTP_SECURITY', 'starttls'),
  smtpUser: read('SMTP_USER'),
  smtpPassword: read('SMTP_PASSWORD'),
  resendApiKey: read('RESEND_API_KEY'),

  /** Newsletter: 'mailcheap' keeps a MailCheap list in step with the app's accounts. */
  newsletterProvider: read('NEWSLETTER_PROVIDER'),
  mailcheapApiKey: read('MAILCHEAP_API_KEY'),
  mailcheapNewsletter: read('MAILCHEAP_NEWSLETTER'),

  stripeSecretKey: read('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: read('STRIPE_WEBHOOK_SECRET'),
  /** Real payments: only with BILLING_LIVE=1 in the server's environment (never from the admin page). */
  billingLive: read('BILLING_LIVE') === '1',
};

/** The product name used in emails, the AI provider headers and the User-Agent (APP_NAME to change it). */
export const APP_NAME = read('APP_NAME', 'WriteGrid');
/** Sent to OpenAlex, Scholar and publishers; they ask for a contact URL. */
export const USER_AGENT = `${APP_NAME}/0.2 (+${env.publicUrl})`;
