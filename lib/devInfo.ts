/**
 * Which service answered a search (OpenAlex, Scholar, Semantic Scholar, PubMed…) is shown only in
 * development. In production people see the results, not the services behind them.
 */
export const SHOW_PROVIDERS = process.env.NODE_ENV !== 'production';
