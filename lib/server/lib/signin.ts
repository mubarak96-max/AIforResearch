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

/**
 * The redirect URL to register with Google: Firebase's own handler on the project's auth
 * domain (FIREBASE_AUTH_DOMAIN, e.g. your-project.firebaseapp.com or your own domain).
 */
export function redirectUri(_provider: Provider) {
  const domain = process.env.FIREBASE_AUTH_DOMAIN || process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
    || `${process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'your-project'}.firebaseapp.com`;
  return `https://${domain}/__/auth/handler`;
}
