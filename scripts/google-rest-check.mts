// Exercises lib/server's Auth and Storage REST clients against the emulators:
//   firebase emulators:exec --only auth,storage --project demo-writeorbit "npx tsx scripts/google-rest-check.mts"
import assert from 'node:assert/strict';
import * as auth from '../lib/server/google/auth.ts';
import * as storage from '../lib/server/google/storage.ts';

const code = async (fn: () => Promise<unknown>) => { try { await fn(); return 'ok'; } catch (e: any) { return e.code; } };
const uid = `check${Date.now()}`;
const email = `${uid}@example.com`;

await auth.createUser({ uid, email, password: 'secret123', displayName: 'First', emailVerified: false });
let user = await auth.getUser(uid);
assert.equal(user.email, email);
assert.equal(user.displayName, 'First');
assert.ok(user.providerData.some((info) => info.providerId === 'password'));
assert.equal(await code(() => auth.createUser({ uid, email: `other${email}` })), 'auth/uid-already-exists');
user = await auth.updateUser(uid, { displayName: 'Second' });
assert.equal(user.displayName, 'Second');
user = await auth.updateUser(uid, { displayName: null });
assert.equal(user.displayName, undefined);
await auth.updateUser(uid, { password: 'another123' });

// A real ID token from the emulator's sign-in endpoint, then verified.
const signIn = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=any`, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'another123', returnSecureToken: true }),
}).then((response) => response.json()) as { idToken: string };
const decoded = await auth.verifyIdToken(signIn.idToken);
assert.equal(decoded.uid, uid);
assert.equal(decoded.email, email);
assert.notEqual(await code(() => auth.verifyIdToken('not.a.token')), 'ok');

await auth.deleteUser(uid);
assert.equal(await code(() => auth.getUser(uid)), 'auth/user-not-found');
assert.equal(await code(() => auth.updateUser(uid, { password: 'x123456' })), 'auth/user-not-found');
assert.equal(await code(() => auth.deleteUser(uid)), 'auth/user-not-found');
console.log('auth: ok');

const key = `writeorbit-check/${uid}/hello.txt`;
await storage.uploadObject(key, new TextEncoder().encode('hello there'), 'text/plain');
await storage.uploadObject(`writeorbit-check/${uid}/two.bin`, new Uint8Array([1, 2, 3]), 'application/octet-stream');
const meta = await storage.objectMetadata(key);
assert.equal(meta?.size, '11');
assert.equal(meta?.contentType, 'text/plain');
const download = await storage.downloadObject(key);
assert.equal(await download!.text(), 'hello there');
assert.equal(await storage.objectMetadata(`${key}.missing`), null);
assert.equal(await storage.downloadObject(`${key}.missing`), null);
await storage.deleteObject(`${key}.missing`);
await storage.deletePrefixed(`writeorbit-check/${uid}/`);
assert.equal(await storage.objectMetadata(key), null);
assert.equal(await storage.objectMetadata(`writeorbit-check/${uid}/two.bin`), null);
console.log('storage: ok');
