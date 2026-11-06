import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

/** firestore.rules: browsers read only their own things and never write. Run: pnpm test:rules. */

let env: RulesTestEnvironment;
const root = resolve(__dirname, '../..');

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'writeorbit-rules-test',
    firestore: { rules: readFileSync(resolve(root, 'firestore.rules'), 'utf8') },
  });
});
afterAll(async () => { await env?.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'users/alice'), { email: 'alice@example.com', account_id: 'acc-a', is_admin: false });
    await setDoc(doc(db, 'users/bob'), { email: 'bob@example.com', account_id: 'acc-b', is_admin: false });
    await setDoc(doc(db, 'accounts/acc-a'), { plan: 'free', credits_milli: 0 });
    await setDoc(doc(db, 'documents/doc-1'), { owner_user_id: 'alice', member_ids: ['alice', 'carol'], title: 'Thesis' });
    await setDoc(doc(db, 'documents/doc-1/members/m1'), { user_id: 'carol', role: 'editor' });
    await setDoc(doc(db, 'library_documents/lib-1'), { user_id: 'alice', title: 'A paper' });
    await setDoc(doc(db, 'chat_threads/t-1'), { user_id: 'alice', title: 'Chat' });
    await setDoc(doc(db, 'legacy_passwords/alice@example.com'), { hash: 'x', user_id: 'alice' });
    await setDoc(doc(db, 'plans/free'), { name: 'Free', is_public: true });
    await setDoc(doc(db, 'plans/secret'), { name: 'Hidden', is_public: false });
  });
});

const as = (uid: string | null) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore();

describe('profiles', () => {
  it('lets you read only your own profile, and never write it', async () => {
    await assertSucceeds(getDoc(doc(as('alice'), 'users/alice')));
    await assertFails(getDoc(doc(as('alice'), 'users/bob')));
    await assertFails(getDoc(doc(as(null), 'users/alice')));
    await assertFails(updateDoc(doc(as('alice'), 'users/alice'), { is_admin: true }));
  });
});

describe('documents', () => {
  it('lets members read and nobody write', async () => {
    await assertSucceeds(getDoc(doc(as('alice'), 'documents/doc-1')));
    await assertSucceeds(getDoc(doc(as('carol'), 'documents/doc-1')));
    await assertFails(getDoc(doc(as('bob'), 'documents/doc-1')));
    await assertFails(getDoc(doc(as(null), 'documents/doc-1')));
    await assertFails(updateDoc(doc(as('alice'), 'documents/doc-1'), { title: 'Changed' }));
    await assertFails(setDoc(doc(as('alice'), 'documents/doc-2'), { owner_user_id: 'alice', member_ids: ['alice'] }));
  });

  it('keeps member lists closed', async () => {
    await assertFails(getDoc(doc(as('alice'), 'documents/doc-1/members/m1')));
  });
});

describe('library and chats', () => {
  it('are readable by their owner only', async () => {
    await assertSucceeds(getDoc(doc(as('alice'), 'library_documents/lib-1')));
    await assertFails(getDoc(doc(as('bob'), 'library_documents/lib-1')));
    await assertSucceeds(getDoc(doc(as('alice'), 'chat_threads/t-1')));
    await assertFails(getDoc(doc(as('bob'), 'chat_threads/t-1')));
    await assertFails(setDoc(doc(as('alice'), 'library_documents/lib-2'), { user_id: 'alice' }));
  });
});

describe('server-only data', () => {
  it('is closed to everyone', async () => {
    await assertFails(getDoc(doc(as('alice'), 'accounts/acc-a')));
    await assertFails(updateDoc(doc(as('alice'), 'accounts/acc-a'), { credits_milli: 1e9 }));
    await assertFails(getDoc(doc(as('alice'), 'legacy_passwords/alice@example.com')));
    await assertFails(getDoc(doc(as('alice'), 'app_settings/llmApiKey')));
  });

  it('shows public plans only', async () => {
    await assertSucceeds(getDoc(doc(as(null), 'plans/free')));
    await assertFails(getDoc(doc(as(null), 'plans/secret')));
  });
});
