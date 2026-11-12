/**
 * Sign-in methods: email and password, and Google, both through Firebase Authentication
 * (Google is set up in Firebase console › Authentication › Sign-in method).
 */

export type Provider = 'google';
export const PROVIDERS: Provider[] = ['google'];
export const PROVIDER_IDS: Record<Provider, string> = { google: 'google.com' };
export type Methods = { password: boolean } & Record<Provider, boolean>;

/** The methods the sign-in page offers. */
export const METHODS: Methods = { password: true, google: true };

export type InstitutionalProvider = { id: string; label: string; protocol: 'saml' | 'oidc' };

/** Public labels and Firebase provider IDs only. Credentials stay in Firebase, never this list. */
export function institutionalProviders(raw = process.env.FIREBASE_SSO_PROVIDERS): InstitutionalProvider[] {
  if (!raw || raw.length > 16000) return [];
  try {
    const values = JSON.parse(raw);
    if (!Array.isArray(values)) return [];
    const providers: InstitutionalProvider[] = [];
    for (const value of values.slice(0, 30)) {
      if (!value || typeof value.id !== 'string' || !/^(saml|oidc)\.[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(value.id)) continue;
      if (typeof value.label !== 'string' || !value.label.trim() || providers.some((provider) => provider.id === value.id)) continue;
      providers.push({ id: value.id, label: value.label.trim().slice(0, 80), protocol: value.id.startsWith('saml.') ? 'saml' : 'oidc' });
    }
    return providers;
  } catch { return []; }
}

/**
 * The redirect URL to register with Google: Firebase's own handler on the project's auth
 * domain (FIREBASE_AUTH_DOMAIN, e.g. your-project.firebaseapp.com or your own domain).
 */
export function redirectUri(_provider: Provider) {
  const domain = process.env.FIREBASE_AUTH_DOMAIN || process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
    || `${process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'your-project'}.firebaseapp.com`;
  return `https://${domain}/__/auth/handler`;
}
