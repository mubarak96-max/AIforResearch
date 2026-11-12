/**
 * The public address of the site, used for canonical URLs, the sitemap, robots.txt, Open Graph,
 * structured data and (in production) the server's redirect and webhook URLs.
 */
export const SITE_URL = 'https://aiforresearch.app';

export const SITE_NAME = 'AI for Research';

/**
 * The AI provider and models. Only the key lives in the environment (LLM_API_KEY, a secret);
 * change these here and redeploy. An empty model or baseUrl uses the provider's default.
 */
export const AI: {
  /** openrouter | deepseek | openai | anthropic | ollama */
  provider: string;
  /** Fast model: autocomplete, edits, chat and most research steps. */
  model: string;
  /** Stronger model: reviews and High-quality mode (empty = the fast model). */
  reviewModel: string;
  /** Another endpoint for the provider, such as a self-hosted Ollama (empty = the provider's own). */
  baseUrl: string;
} = {
  provider: 'openrouter',
  model: 'deepseek/deepseek-chat',
  reviewModel: 'deepseek/deepseek-chat',
  baseUrl: '',
};

/** Who runs this site, set when the web app is built (NEXT_PUBLIC_COMPANY_*); empty parts are left out. */
export const COMPANY = {
  name: process.env.NEXT_PUBLIC_COMPANY_NAME || 'AI for Research',
  address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS || '',
  phone: process.env.NEXT_PUBLIC_COMPANY_PHONE || '',
  email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@aiforresearch.app',
};
