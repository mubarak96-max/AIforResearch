import { settings, type EffectiveSettings } from './settings.js';

/**
 * Which sign-in methods the sign-in page offers. Firebase Authentication does the signing in;
 * each provider is set up (client id and secret) in Firebase console › Authentication ›
 * Sign-in method, and switched on or off for this site in Admin › Sign-in.
 */

export type Provider = 'google' | 'microsoft' | 'apple';
export const PROVIDERS: Provider[] = ['google', 'microsoft', 'apple'];
export const PROVIDER_IDS: Record<Provider, string> = { google: 'google.com', microsoft: 'microsoft.com', apple: 'apple.com' };
export type Methods = { password: boolean } & Record<Provider, boolean>;

const isOn = (value: string | undefined) => (value ?? '').trim().toLowerCase() !== 'off';
const SWITCH: Record<Provider, 'signinGoogle' | 'signinMicrosoft' | 'signinApple'> = { google: 'signinGoogle', microsoft: 'signinMicrosoft', apple: 'signinApple' };

/** A provider shows when it is switched on (it must also be enabled in the Firebase console). */
export function providerUsable(provider: Provider, s: EffectiveSettings = settings()) {
  return isOn(s[SWITCH[provider]]);
}

/** Usable methods. Email and password stays on when nothing else can create an account. */
export function methodsFor(s: EffectiveSettings = settings()): Methods {
  const providers = Object.fromEntries(PROVIDERS.map((provider) => [provider, providerUsable(provider, s)])) as Record<Provider, boolean>;
  const anyProvider = PROVIDERS.some((provider) => providers[provider]);
  return { password: isOn(s.signinPassword) || !anyProvider, ...providers };
}

/** For the admin page: turning email and password off needs a provider that can sign people up. */
export function passwordSwitchProblem(s: EffectiveSettings): string | null {
  if (isOn(s.signinPassword)) return null;
  if (PROVIDERS.some((provider) => providerUsable(provider, s))) return null;
  return 'Turn on Google, Microsoft or Apple before turning off email and password.';
}

/**
 * The redirect URL to register with Google, Microsoft and Apple: Firebase's own handler on the
 * project's auth domain (FIREBASE_AUTH_DOMAIN, e.g. your-project.firebaseapp.com or your own domain).
 */
export function redirectUri(_provider: Provider) {
  const domain = process.env.FIREBASE_AUTH_DOMAIN || process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
    || `${process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'your-project'}.firebaseapp.com`;
  return `https://${domain}/__/auth/handler`;
}
