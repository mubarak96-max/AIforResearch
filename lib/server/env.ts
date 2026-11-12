/** Server settings, read once from the environment. */
import { SITE_URL } from '../site.js';

const read = (name: string, fallback = '') => (process.env[name] ?? fallback).trim();
/** The site's own address: the production domain when deployed, the dev server locally. */
export const deployed = process.env.NODE_ENV === 'production' || (!!process.env.K_SERVICE && process.env.FUNCTIONS_EMULATOR !== 'true');
const publicUrl = deployed ? SITE_URL : 'http://localhost:3000';

export const env = {
  port: Number(read('PORT', '4000')),
  publicUrl,
  /** The converter (services/convert on Cloud Run). */
  convertUrl: read('CONVERT_URL', 'http://localhost:4100').replace(/\/+$/, ''),
  /** How the converter reaches this API (the web app's own address on App Hosting). */
  internalUrl: read('INTERNAL_URL', publicUrl).replace(/\/+$/, ''),
  /** Shared secret the converter and Cloud Functions send when they call internal endpoints. */
  internalSecret: read('INTERNAL_SECRET'),
  /** The collab service (services/collab on Cloud Run): live text and presence. */
  collabUrl: read('COLLAB_URL', 'http://localhost:4200').replace(/\/+$/, ''),
  /** Library embeddings for Firestore vector search: '' (word search only) | local (the converter's /embed) | openai. */
  embeddingsProvider: read('EMBEDDINGS_PROVIDER'),
  /** The service answering POST /embed for `local`: its own Cloud Run service, else the converter. */
  embedUrl: read('EMBED_URL').replace(/\/+$/, ''),
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
  /** OpenAlex asks for a free API key (openalex.org/settings/api): about $1 of use a day free, then pay as you go. */
  openalexApiKey: read('OPENALEX_API_KEY'),
  /**
   * More scholarly sources (lib/server/lib/sources). All work without a key at lower limits;
   * a key raises them. PubMed: NCBI_API_KEY (ncbi.nlm.nih.gov/account). Semantic Scholar:
   * SEMANTIC_SCHOLAR_API_KEY (semanticscholar.org/product/api). Unpaywall and Crossref ask for a
   * contact email (CONTACT_EMAIL, else OPENALEX_EMAIL, else SUPPORT_EMAIL).
   */
  ncbiApiKey: read('NCBI_API_KEY'),
  semanticScholarApiKey: read('SEMANTIC_SCHOLAR_API_KEY'),
  contactEmail: read('CONTACT_EMAIL') || read('OPENALEX_EMAIL') || read('SUPPORT_EMAIL'),
  /** The Web source: 'tavily', 'brave' or 'exa' with WEB_SEARCH_API_KEY; empty turns the Web source off. */
  webSearchProvider: read('WEB_SEARCH_PROVIDER').toLowerCase(),
  webSearchApiKey: read('WEB_SEARCH_API_KEY'),
  /** Where people write when they are stuck (sign-in help); hidden when empty. */
  supportEmail: read('SUPPORT_EMAIL'),

  /** Encrypts keys saved from the admin page (32+ characters). */
  settingsKey: read('SETTINGS_KEY'),

  /**
   * Sign-in methods shown on the sign-in page ('on'/'off', Admin › Sign-in). The providers
   * themselves are set up in Firebase console › Authentication; client ids live there.
   */
  signinPassword: read('SIGNIN_PASSWORD', 'on'),
  /**
   * App Check (reCAPTCHA Enterprise) on public endpoints such as /api/auth/legacy-login:
   * 'on' refuses requests without a valid token; anything else lets them through.
   */
  appCheckEnforce: read('APP_CHECK_ENFORCE') === 'on',
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

  /** Dodo Payments (merchant of record): the API key and the webhook signing secret. */
  dodoApiKey: read('DODO_PAYMENTS_API_KEY'),
  dodoWebhookSecret: read('DODO_PAYMENTS_WEBHOOK_KEY'),
  /** Real payments (Dodo live mode): only with BILLING_LIVE=1 in the server's environment (never from the admin page). */
  billingLive: read('BILLING_LIVE') === '1',
};

/** The product name used in emails, the AI provider headers and the User-Agent (APP_NAME to change it). */
export const APP_NAME = read('APP_NAME', 'AI for Research');
/** Sent to OpenAlex, Scholar and publishers; they ask for a contact URL. */
export const USER_AGENT = `${APP_NAME}/0.2 (+${env.publicUrl})`;
