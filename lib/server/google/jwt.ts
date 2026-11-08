/** RS256 JSON Web Tokens with WebCrypto (works in Node and on Cloudflare Workers). */

const RSA = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' } as const;
// Derived from crypto.subtle so this compiles with or without the DOM type library.
type Subtle = typeof crypto.subtle;
export type Key = Awaited<ReturnType<Subtle['importKey']>>;
type Bytes = Parameters<Subtle['sign']>[2];
const encoder = new TextEncoder();

export function base64url(bytes: Uint8Array | ArrayBuffer): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let text = '';
  for (let index = 0; index < view.length; index += 0x8000) text += String.fromCharCode(...view.subarray(index, index + 0x8000));
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64url(text: string): Uint8Array {
  const plain = text.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(plain + '='.repeat((4 - (plain.length % 4)) % 4)), (char) => char.charCodeAt(0));
}

/** A PEM "PRIVATE KEY" (PKCS#8, as in service-account keys) for signing. */
export function importPrivateKey(pem: string): Promise<Key> {
  const body = pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(body), (char) => char.charCodeAt(0));
  return crypto.subtle.importKey('pkcs8', der as Bytes, RSA, false, ['sign']);
}

export async function signRs256(key: Key, data: string | Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.sign(RSA, key, (typeof data === 'string' ? encoder.encode(data) : data) as Bytes));
}

export type JwtParts = { header: Record<string, any>; payload: Record<string, any>; signed: string; signature: Uint8Array };

export function decodeJwt(token: string): JwtParts {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed token');
  const json = (part: string) => JSON.parse(new TextDecoder().decode(fromBase64url(part)));
  return { header: json(parts[0]), payload: json(parts[1]), signed: `${parts[0]}.${parts[1]}`, signature: fromBase64url(parts[2]) };
}

type Jwk = { kid?: string; kty?: string; n?: string; e?: string };
const keySets = new Map<string, { keys: Map<string, Promise<Key>>; until: number }>();

/** Public keys published as a JWK set, cached as the server's Cache-Control allows. */
async function publicKey(jwksUrl: string, kid: string): Promise<Key | null> {
  let set = keySets.get(jwksUrl);
  if (!set || set.until < Date.now() || !set.keys.has(kid)) {
    const response = await fetch(jwksUrl);
    if (!response.ok) throw new Error(`Could not load signing keys (${response.status})`);
    const body = await response.json() as { keys: Jwk[] };
    const maxAge = Number(/max-age=(\d+)/.exec(response.headers.get('cache-control') || '')?.[1] || 3600);
    set = { keys: new Map(), until: Date.now() + Math.min(maxAge, 6 * 3600) * 1000 };
    for (const jwk of body.keys || []) {
      if (!jwk.kid) continue;
      set.keys.set(jwk.kid, crypto.subtle.importKey('jwk', { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true }, RSA, false, ['verify']));
    }
    keySets.set(jwksUrl, set);
  }
  return (await set.keys.get(kid)) ?? null;
}

/** Checks an RS256 token's signature against a JWK set; returns its parts. */
export async function verifyRs256(token: string, jwksUrl: string): Promise<JwtParts> {
  const parts = decodeJwt(token);
  if (parts.header.alg !== 'RS256') throw new Error(`Unexpected token algorithm ${parts.header.alg}`);
  const key = typeof parts.header.kid === 'string' ? await publicKey(jwksUrl, parts.header.kid) : null;
  if (!key) throw new Error('Token signed by an unknown key');
  if (!(await crypto.subtle.verify(RSA, key, parts.signature as Bytes, encoder.encode(parts.signed)))) throw new Error('Invalid token signature');
  return parts;
}
