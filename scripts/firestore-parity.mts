// Compares lib/server's Firestore REST client with firebase-admin, against the emulator:
//   firebase emulators:exec --only firestore --project demo-writeorbit "npx tsx scripts/firestore-parity.mts"
import { initializeApp } from 'firebase-admin/app';
import * as admin from 'firebase-admin/firestore';
import * as rest from '../lib/server/google/firestore.ts';

const adminDb = admin.getFirestore(initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID }));
adminDb.settings({ ignoreUndefinedProperties: true });
const restDb = new rest.Firestore();

type Lib = { db: any; FieldValue: any; Timestamp: any; FieldPath: any; AggregateField: any };
const libs: Record<string, Lib> = {
  admin: { db: adminDb, FieldValue: admin.FieldValue, Timestamp: admin.Timestamp, FieldPath: admin.FieldPath, AggregateField: admin.AggregateField },
  rest: { db: restDb, FieldValue: rest.FieldValue, Timestamp: rest.Timestamp, FieldPath: rest.FieldPath, AggregateField: rest.AggregateField },
};

function norm(value: any, prefix: string): any {
  if (value === null || value === undefined) return value ?? null;
  if (typeof value === 'string') return value.split(prefix).join('P_');
  if (typeof value !== 'object') return value;
  if (typeof value.toDate === 'function' && typeof value.seconds === 'number') return 'TS';
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) return `bytes:${Buffer.from(value).toString('hex')}`;
  if (typeof value.path === 'string' && typeof value.id === 'string' && value.firestore) return `ref:${norm(value.path, prefix)}`;
  if (typeof value.toArray === 'function') return `vector:${value.toArray().join(',')}`;
  if (Array.isArray(value)) return value.map((item) => norm(item, prefix));
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, norm(value[key], prefix)]));
}
const snap = (s: any, p: string) => (s.exists ? { id: s.id, path: norm(s.ref.path, p), data: norm(s.data(), p) } : { id: s.id, missing: true });
const docs = (q: any, p: string) => q.docs.map((d: any) => snap(d, p));
async function err(fn: () => Promise<unknown>) { try { await fn(); return 'ok'; } catch (e: any) { return `code:${e.code}`; } }

const scenarios: Record<string, (lib: Lib, p: string) => Promise<unknown>> = {
  async values({ db, Timestamp }, p) {
    const ref = db.collection(`${p}c`).doc('v');
    await ref.set({ s: 'x', i: 3, f: 1.5, neg0: -0, big: 2 ** 60, b: true, n: null, u: undefined, d: new Date(0), t: Timestamp.fromMillis(1234),
      arr: [1, 'a', { z: 1 }], emptyArr: [], emptyMap: {}, nested: { a: { b: 'c' } }, bytes: Buffer.from('hi'), ref: db.doc(`${p}c/other`), 'odd key': 1, 'a.b': 2 });
    const got = await ref.get();
    const data = got.data();
    return { snap: snap(got, p), types: Object.fromEntries(Object.entries(data).map(([k, v]: any) => [k, v?.constructor?.name ?? typeof v])), millis: data.t.toMillis(), dateMillis: data.d.toMillis() };
  },
  async writes({ db, FieldValue }, p) {
    const ref = db.collection(`${p}c`).doc('w');
    const out: any[] = [];
    out.push(await err(() => ref.update({ a: 1 })));
    await ref.create({ a: 1, m: { x: 1, y: 2 }, tags: ['a'], n: 5 });
    out.push(await err(() => ref.create({ a: 2 })));
    await ref.update({ 'm.x': 10, n: FieldValue.increment(2), tags: FieldValue.arrayUnion('b', 'a'), at: FieldValue.serverTimestamp(), gone: FieldValue.delete() });
    out.push(snap(await ref.get(), p));
    await ref.update('m.y', FieldValue.delete(), 'a', 7);
    out.push(snap(await ref.get(), p));
    await ref.set({ m: { z: 3 }, n: FieldValue.increment(1), deep: { at: FieldValue.serverTimestamp(), k: 1 } }, { merge: true });
    out.push(snap(await ref.get(), p));
    await ref.update({ tags: FieldValue.arrayRemove('a'), m: { only: true } });
    out.push(snap(await ref.get(), p));
    await ref.set({ replaced: true });
    out.push(snap(await ref.get(), p));
    await ref.delete();
    out.push(snap(await ref.get(), p));
    out.push(await err(() => ref.delete()));
    const added = await db.collection(`${p}c`).add({ x: 1 });
    out.push(added.id.length, (await added.get()).exists);
    await added.delete();
    return out;
  },
  async queries({ db, FieldPath }, p) {
    const c = db.collection(`${p}q`);
    for (let i = 0; i < 8; i += 1) await c.doc(`d${i}`).set({ i, g: i % 2 ? 'odd' : 'even', tags: [`t${i % 3}`], opt: i < 3 ? null : i, o: { k: 8 - i } });
    const r: any = {};
    r.eq = docs(await c.where('g', '==', 'odd').get(), p);
    r.range = docs(await c.where('i', '>=', 2).where('i', '<', 5).get(), p);
    r.order = docs(await c.orderBy('i', 'desc').limit(3).get(), p);
    r.nested = docs(await c.orderBy('o.k').limit(2).get(), p);
    r.inq = docs(await c.where('i', 'in', [1, 3, 9]).get(), p);
    r.notin = docs(await c.where('i', 'not-in', [0, 1, 2, 3, 4, 5]).get(), p);
    r.contains = docs(await c.where('tags', 'array-contains', 't1').get(), p);
    r.any = docs(await c.where('tags', 'array-contains-any', ['t0', 't2']).get(), p);
    r.isNull = docs(await c.where('opt', '==', null).get(), p);
    r.notNull = docs(await c.where('opt', '!=', null).orderBy('opt').get(), p);
    r.ne = docs(await c.where('g', '!=', 'odd').get(), p);
    r.select = docs(await c.where('i', '<', 2).select('g').get(), p);
    r.selectNone = docs(await c.where('i', '<', 2).select().get(), p);
    r.offset = docs(await c.orderBy('i').offset(5).limit(2).get(), p);
    const first = await c.orderBy('i').limit(3).get();
    r.after = docs(await c.orderBy('i').startAfter(first.docs[2]).limit(2).get(), p);
    const page = await c.where('opt', '!=', null).orderBy('opt').limit(2).get();
    r.afterIneq = docs(await c.where('opt', '!=', null).orderBy('opt').startAfter(page.docs[1]).limit(2).get(), p);
    const plain = await c.limit(3).get();
    r.afterNoOrder = docs(await c.startAfter(plain.docs[2]).limit(2).get(), p);
    r.afterValue = docs(await c.orderBy('i').startAfter(5).get(), p);
    r.endBefore = docs(await c.orderBy('i').endBefore(2).get(), p);
    r.docId = docs(await c.where(FieldPath.documentId(), '>=', c.doc('d3')).where(FieldPath.documentId(), '<', c.doc('d5')).get(), p);
    r.docIdStr = docs(await c.where(FieldPath.documentId(), 'in', ['d1', 'd2']).get(), p);
    r.count = (await c.where('g', '==', 'even').count().get()).data();
    r.size = (await c.get()).size;
    return r;
  },
  async aggregates({ db, AggregateField }, p) {
    const c = db.collection(`${p}agg`);
    await c.doc('a').set({ n: 2, f: 1.5 });
    await c.doc('b').set({ n: 3, f: 2 });
    const one = (await c.aggregate({ calls: AggregateField.count(), total: AggregateField.sum('n'), fl: AggregateField.sum('f'), avg: AggregateField.average('n') }).get()).data();
    const none = (await c.where('n', '>', 100).aggregate({ calls: AggregateField.count(), total: AggregateField.sum('n') }).get()).data();
    return { one, none };
  },
  async groups({ db, FieldValue }, p) {
    await db.doc(`${p}docs/a`).set({ member_ids: [] });
    await db.doc(`${p}docs/a/${p}members/m1`).set({ user_id: null, invite_email: 'x@y.z' });
    await db.doc(`${p}docs/b/${p}members/m2`).set({ user_id: 'u', invite_email: 'x@y.z' });
    const found = await db.collectionGroup(`${p}members`).where('invite_email', '==', 'x@y.z').where('user_id', '==', null).get();
    const parents = found.docs.map((d: any) => [d.ref.path.split(p).join('P_'), d.ref.parent.id.split(p).join('P_'), d.ref.parent.parent?.id]);
    const batch = db.batch();
    for (const m of found.docs) { batch.update(m.ref, { user_id: 'new' }); batch.update(m.ref.parent.parent, { member_ids: FieldValue.arrayUnion('new') }); }
    await batch.commit();
    const all = await db.collectionGroup(`${p}members`).orderBy('user_id').get();
    return { parents, all: docs(all, p), parent: snap(await db.doc(`${p}docs/a`).get(), p) };
  },
  async transactions({ db }, p) {
    const ref = db.doc(`${p}tx/counter`);
    await ref.set({ n: 0 });
    await Promise.all(Array.from({ length: 5 }, () => db.runTransaction(async (tx: any) => {
      const s = await tx.get(ref);
      tx.update(ref, { n: s.get('n') + 1 });
    })));
    const q = await db.runTransaction(async (tx: any) => {
      const [a, b] = await tx.getAll(ref, db.doc(`${p}tx/missing`));
      const rows = await tx.get(db.collection(`${p}tx`).where('n', '>', 0));
      tx.set(db.doc(`${p}tx/made`), { from: a.get('n') });
      return { a: a.exists, b: b.exists, rows: rows.size };
    });
    const failed = await err(() => db.runTransaction(async (tx: any) => { tx.create(ref, { x: 1 }); }));
    const thrown = await db.runTransaction(async () => { throw new Error('mine'); }).catch((e: Error) => e.message);
    return { n: (await ref.get()).get('n'), q, made: (await db.doc(`${p}tx/made`).get()).data(), failed, thrown };
  },
  async getAll({ db }, p) {
    await db.doc(`${p}ga/1`).set({ v: 1 });
    await db.doc(`${p}ga/3`).set({ v: 3 });
    const got = await db.getAll(db.doc(`${p}ga/3`), db.doc(`${p}ga/2`), db.doc(`${p}ga/1`));
    return got.map((s: any) => snap(s, p));
  },
  async recursive({ db }, p) {
    await db.doc(`${p}rd/top`).set({ a: 1 });
    await db.doc(`${p}rd/top/sub/x`).set({ a: 1 });
    await db.doc(`${p}rd/top/sub/x/deeper/y`).set({ a: 1 });
    await db.doc(`${p}rd/ghost/sub/z`).set({ a: 1 }); // parent "missing"
    await db.doc(`${p}rd/keep`).set({ a: 1 });
    await db.recursiveDelete(db.doc(`${p}rd/top`));
    const afterDoc = [(await db.doc(`${p}rd/top`).get()).exists, (await db.doc(`${p}rd/top/sub/x`).get()).exists, (await db.doc(`${p}rd/top/sub/x/deeper/y`).get()).exists, (await db.doc(`${p}rd/keep`).get()).exists];
    await db.recursiveDelete(db.collection(`${p}rd`));
    const afterCol = [(await db.doc(`${p}rd/keep`).get()).exists, (await db.doc(`${p}rd/ghost/sub/z`).get()).exists];
    return { afterDoc, afterCol };
  },
  async vectors({ db, FieldValue }, p) {
    await db.doc(`${p}vec/a`).set({ e: FieldValue.vector([1, 0, 0]) });
    const s = await db.doc(`${p}vec/a`).get();
    return norm(s.data(), p);
  },
};

let failures = 0;
const only = process.argv[2];
for (const [name, run] of Object.entries(scenarios)) {
  if (only && name !== only) continue;
  const results: Record<string, string> = {};
  for (const [libName, lib] of Object.entries(libs)) {
    const prefix = `${libName}_${Date.now()}_`;
    try { results[libName] = JSON.stringify(norm(await run(lib, prefix), prefix), null, 1); }
    catch (e: any) { results[libName] = `THREW ${e?.code ?? ''} ${e?.message ?? e}`; }
  }
  if (process.env.SHOW) console.log(results.rest);
  const same = results.admin === results.rest;
  if (!same) failures += 1;
  console.log(`${same ? 'PASS' : 'FAIL'} ${name}`);
  if (!same) console.log(`  admin: ${results.admin.slice(0, 3000)}\n  rest:  ${results.rest.slice(0, 3000)}`);
}
console.log(failures ? `${failures} scenario(s) differ` : 'all scenarios match');
process.exit(failures ? 1 : 0);
