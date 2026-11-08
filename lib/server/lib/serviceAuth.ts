import { importPKCS8, SignJWT } from 'jose';

/**
 * Google ID tokens for calling private Cloud Run services (services/convert and embed, deployed
 * with --no-allow-unauthenticated). The calling account needs roles/run.invoker on the service.
 *   - On Google Cloud (App Hosting, Cloud Run, Cloud Functions) the metadata server signs one.
 *   - Elsewhere (local dev, Cloudflare, another host) it is minted from a service-account key:
 *     GOOGLE_SERVICE_ACCOUNT_JSON (the key file's contents, for hosts without files) or the file
 *     at GOOGLE_APPLICATION_CREDENTIALS.
 * Without either, no header is sent, so a converter on localhost (or one deployed with
 * --allow-unauthenticated) keeps working.
 */
const METADATA = 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
/** Google's ID tokens last an hour; fetch a new one well before that. */
const TOKEN_TTL_MS = 50 * 60_000;

const onGoogleCloud = () => Boolean(process.env.K_SERVICE || process.env.FUNCTION_TARGET);
const cache = new Map<string, { token: string; expires: number }>();
let warned = false;

type ServiceAccountKey = { client_email: string; private_key: string };
let keyPromise: Promise<ServiceAccountKey | null> | null = null;

function serviceAccountKey(): Promise<ServiceAccountKey | null> {
  keyPromise ??= (async () => {
    const inline = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
    const path = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
    let text = inline || '';
    if (!text && path) {
      const { readFile } = await import('node:fs/promises');
      text = await readFile(path, 'utf8').catch(() => '');
    }
    if (!text) return null;
    const key = JSON.parse(text) as Partial<ServiceAccountKey>;
    return key.client_email && key.private_key ? { client_email: key.client_email, private_key: key.private_key } : null;
  })().catch(() => null);
  return keyPromise;
}

async function fromMetadata(audience: string): Promise<string> {
  const response = await fetch(`${METADATA}?audience=${encodeURIComponent(audience)}`, {
    headers: { 'Metadata-Flavor': 'Google' },
    signal: AbortSignal.timeout(2_000),
  });
  if (!response.ok) throw new Error(`metadata server answered ${response.status}`);
  return (await response.text()).trim();
}

/** Signs a JWT with the key and trades it for an ID token whose audience is `audience`. */
async function fromKey(key: ServiceAccountKey, audience: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({ target_audience: audience })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(key.client_email)
    .setSubject(key.client_email)
    .setAudience(TOKEN_URL)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(await importPKCS8(key.private_key, 'RS256'));
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    signal: AbortSignal.timeout(5_000),
  });
  const body = (await response.json().catch(() => null)) as { id_token?: string; error_description?: string } | null;
  if (!response.ok || !body?.id_token) throw new Error(`token exchange failed (${response.status}): ${body?.error_description || ''}`);
  return body.id_token;
}

async function idToken(audience: string): Promise<string | null> {
  const hit = cache.get(audience);
  if (hit && hit.expires > Date.now()) return hit.token;
  try {
    const key = onGoogleCloud() ? null : await serviceAccountKey();
    if (!onGoogleCloud() && !key) return null;
    const token = key ? await fromKey(key, audience) : await fromMetadata(audience);
    cache.set(audience, { token, expires: Date.now() + TOKEN_TTL_MS });
    return token;
  } catch (error) {
    if (!warned) console.warn('serviceAuth: no ID token, calling without one:', (error as Error).message);
    warned = true;
    return null;
  }
}

/** `Authorization` for a call to `url` when it is an https service and a token can be had; else {}. */
export async function serviceAuthHeaders(url: string): Promise<Record<string, string>> {
  if (!url.startsWith('https://')) return {};
  const token = await idToken(new URL(url).origin);
  return token ? { Authorization: `Bearer ${token}` } : {};
}
