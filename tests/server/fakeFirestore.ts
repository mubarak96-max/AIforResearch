/**
 * A small in-memory Firestore for unit tests: collections, documents, subcollections,
 * `where` (==, in, !=, >=, <=, >, <), `limit`, `count()`, `aggregate` (count/sum), batches,
 * transactions (run straight through), `create()` that fails on an existing document, and
 * `FieldValue.increment`. Enough for the billing and plan code; not a full emulator.
 *
 *   const fake = createFakeFirestore();
 *   vi.mock('../../lib/server/firebase.js', async (original) => ({ ...(await original()), ...fake.module }));
 */

type Data = Record<string, any>;
type Filter = { field: string; op: string; value: any };

const INCREMENT = Symbol('increment');
export const fakeIncrement = (by: number) => ({ [INCREMENT]: by });

function applyChange(current: Data | undefined, change: Data): Data {
  const next: Data = { ...(current ?? {}) };
  for (const [key, value] of Object.entries(change)) {
    if (value && typeof value === 'object' && INCREMENT in value) next[key] = Number(next[key] ?? 0) + (value as any)[INCREMENT];
    else if (value !== undefined) next[key] = value;
  }
  return next;
}

const compare = (a: any, b: any) => {
  const value = (x: any) => (x instanceof Date ? x.getTime() : x);
  const left = value(a);
  const right = value(b);
  if (left === right) return 0;
  // Different types (null against a string, say) never compare equal.
  if (left === null || right === null || typeof left !== typeof right) return String(typeof left).localeCompare(String(typeof right)) || -1;
  return left < right ? -1 : left > right ? 1 : 0;
};

function matches(data: Data, filter: Filter) {
  const value = data[filter.field] === undefined ? undefined : data[filter.field];
  switch (filter.op) {
    case '==': return filter.value === null ? value === null : value !== undefined && compare(value, filter.value) === 0;
    case '!=': return value !== undefined && value !== null && compare(value, filter.value) !== 0;
    case 'in': return (filter.value as any[]).some((item) => compare(value, item) === 0);
    case 'array-contains': return Array.isArray(value) && value.some((item) => compare(item, filter.value) === 0);
    case '>=': return value != null && compare(value, filter.value) >= 0;
    case '<=': return value != null && compare(value, filter.value) <= 0;
    case '>': return value != null && compare(value, filter.value) > 0;
    case '<': return value != null && compare(value, filter.value) < 0;
    default: throw new Error(`fake firestore: unsupported operator ${filter.op}`);
  }
}

export function createFakeFirestore() {
  const store = new Map<string, Data>();

  const snapshotOf = (path: string) => {
    const data = store.get(path);
    const id = path.split('/').pop()!;
    return {
      id, exists: data !== undefined, ref: docRef(path),
      data: () => (data ? { ...data } : undefined),
      get: (field: string) => data?.[field],
    };
  };

  function docRef(path: string): any {
    return {
      id: path.split('/').pop(), path,
      get: async () => snapshotOf(path),
      set: async (data: Data, options?: { merge?: boolean }) => { store.set(path, applyChange(options?.merge ? store.get(path) : undefined, data)); },
      update: async (data: Data) => {
        if (!store.has(path)) throw Object.assign(new Error(`NOT_FOUND: ${path}`), { code: 5 });
        store.set(path, applyChange(store.get(path), data));
      },
      create: async (data: Data) => {
        if (store.has(path)) throw Object.assign(new Error(`ALREADY_EXISTS: ${path}`), { code: 6 });
        store.set(path, applyChange(undefined, data));
      },
      delete: async () => { store.delete(path); },
      collection: (name: string) => query(`${path}/${name}`),
    };
  }

  function query(collectionPath: string, filters: Filter[] = [], max = Infinity): any {
    const docs = () => {
      const depth = collectionPath.split('/').length + 1;
      const found = [...store.keys()]
        .filter((key) => key.startsWith(`${collectionPath}/`) && key.split('/').length === depth)
        .map(snapshotOf)
        .filter((snapshot) => filters.every((filter) => matches(snapshot.data()!, filter)));
      return found.slice(0, max);
    };
    return {
      doc: (id?: string) => docRef(`${collectionPath}/${id ?? Math.random().toString(36).slice(2)}`),
      add: async (data: Data) => { const ref = docRef(`${collectionPath}/${Math.random().toString(36).slice(2)}`); await ref.set(data); return ref; },
      where: (field: string, op: string, value: any) => query(collectionPath, [...filters, { field, op, value }], max),
      limit: (n: number) => query(collectionPath, filters, n),
      orderBy: () => query(collectionPath, filters, max),
      select: () => query(collectionPath, filters, max),
      get: async () => { const list = docs(); return { docs: list, empty: list.length === 0, size: list.length }; },
      count: () => ({ get: async () => ({ data: () => ({ count: docs().length }) }) }),
      // Takes firebase-admin's AggregateField objects ({ aggregateType, _field }) or FakeAggregateField ones.
      aggregate: (spec: Record<string, { kind?: string; field?: string; aggregateType?: string; _field?: string }>) => ({
        get: async () => {
          const list = docs();
          const out: Record<string, number> = {};
          for (const [name, field] of Object.entries(spec)) {
            const kind = field.kind ?? field.aggregateType;
            const path = field.field ?? field._field;
            out[name] = kind === 'count' ? list.length : list.reduce((sum, doc) => sum + Number(doc.get(path!) ?? 0), 0);
          }
          return { data: () => out };
        },
      }),
    };
  }

  const batch = () => {
    const work: (() => Promise<void>)[] = [];
    return {
      set: (ref: any, data: Data, options?: any) => { work.push(() => ref.set(data, options)); },
      update: (ref: any, data: Data) => { work.push(() => ref.update(data)); },
      delete: (ref: any) => { work.push(() => ref.delete()); },
      commit: async () => { for (const step of work) await step(); },
    };
  };

  const firestore = {
    collection: (name: string) => query(name),
    batch,
    runTransaction: async <T>(run: (tx: any) => Promise<T>) => {
      const writes: (() => Promise<void>)[] = [];
      const tx = {
        get: (target: any) => target.get(),
        set: (ref: any, data: Data, options?: any) => { writes.push(() => ref.set(data, options)); },
        update: (ref: any, data: Data) => { writes.push(() => ref.update(data)); },
        create: (ref: any, data: Data) => { writes.push(() => ref.create(data)); },
        delete: (ref: any) => { writes.push(() => ref.delete()); },
      };
      const result = await run(tx);
      for (const write of writes) await write();
      return result;
    },
  };

  return {
    store,
    /** Path → data, for setting up a test. */
    put: (path: string, data: Data) => store.set(path, data),
    read: (path: string) => store.get(path),
    clear: () => store.clear(),
    module: {
      db: () => firestore,
      col: (name: string) => query(name),
      increment: fakeIncrement,
    },
  };
}

/** Stand-in for firebase-admin's AggregateField in tests. */
export const FakeAggregateField = {
  count: () => ({ kind: 'count' }),
  sum: (field: string) => ({ kind: 'sum', field }),
};
