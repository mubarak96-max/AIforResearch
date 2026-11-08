import { Buffer } from 'node:buffer';
import { GoogleApiError, googleFetch, projectId, readError } from './credentials.js';

/**
 * Firestore over its REST API, with the parts of the firebase-admin API that lib/server uses:
 * collection/doc references, queries (filters, ordering, cursors, select, collection groups,
 * count/sum aggregations, vector search), get/set/update/create/delete, batches, transactions,
 * getAll and recursiveDelete, and FieldValue / Timestamp / FieldPath / AggregateField.
 *
 * Why not firebase-admin: its Firestore client (google-gax → protobufjs) compiles functions from
 * strings at runtime, which Cloudflare Workers forbid. This needs only fetch.
 *
 * Behaviour follows firebase-admin with `ignoreUndefinedProperties: true`: numbers that are safe
 * integers are stored as integers, undefined fields are skipped, errors carry the gRPC numeric
 * `code` (6 = ALREADY_EXISTS, 5 = NOT_FOUND…), timestamps read back as Timestamp, bytes as Buffer.
 */

// ---- Values ------------------------------------------------------------------------------

export class Timestamp {
  readonly _seconds: number;
  readonly _nanoseconds: number;
  constructor(seconds: number, nanoseconds: number) {
    this._seconds = seconds;
    this._nanoseconds = nanoseconds;
  }
  static now() { return Timestamp.fromMillis(Date.now()); }
  static fromDate(date: Date) { return Timestamp.fromMillis(date.getTime()); }
  static fromMillis(ms: number) {
    const seconds = Math.floor(ms / 1000);
    return new Timestamp(seconds, Math.round((ms - seconds * 1000) * 1e6));
  }
  /** RFC 3339, as Firestore's REST API writes it. */
  static fromString(text: string) {
    const match = /^(.*?)(?:\.(\d+))?(Z|[+-]\d\d:\d\d)$/.exec(text);
    if (!match) return Timestamp.fromMillis(Date.parse(text));
    const seconds = Math.floor(Date.parse(`${match[1]}${match[3]}`) / 1000);
    return new Timestamp(seconds, match[2] ? Number(match[2].padEnd(9, '0').slice(0, 9)) : 0);
  }
  get seconds() { return this._seconds; }
  get nanoseconds() { return this._nanoseconds; }
  toDate() { return new Date(this.toMillis()); }
  toMillis() { return this._seconds * 1000 + Math.floor(this._nanoseconds / 1e6); }
  isEqual(other: Timestamp) { return other instanceof Timestamp && other._seconds === this._seconds && other._nanoseconds === this._nanoseconds; }
  /** Sortable, like firebase-admin's (so `<` and `>` compare Timestamps). */
  valueOf() { return `${String(this._seconds + 1e12).padStart(13, '0')}.${String(this._nanoseconds).padStart(9, '0')}`; }
  toString() { return `Timestamp(seconds=${this._seconds}, nanoseconds=${this._nanoseconds})`; }
  toISOString() {
    const iso = new Date(this._seconds * 1000).toISOString().replace(/\.\d{3}Z$/, '');
    return `${iso}.${String(this._nanoseconds).padStart(9, '0')}Z`;
  }
}

export class VectorValue {
  constructor(private readonly values: number[]) {}
  toArray() { return [...this.values]; }
  isEqual(other: VectorValue) { return other instanceof VectorValue && other.values.length === this.values.length && other.values.every((value, index) => value === this.values[index]); }
}

type Transform =
  | { kind: 'serverTimestamp' } | { kind: 'delete' } | { kind: 'increment'; by: number }
  | { kind: 'arrayUnion'; values: unknown[] } | { kind: 'arrayRemove'; values: unknown[] };

export class FieldValue {
  private constructor(readonly transform: Transform) {}
  static serverTimestamp() { return new FieldValue({ kind: 'serverTimestamp' }); }
  static delete() { return new FieldValue({ kind: 'delete' }); }
  static increment(by: number) { return new FieldValue({ kind: 'increment', by }); }
  static arrayUnion(...values: unknown[]) { return new FieldValue({ kind: 'arrayUnion', values }); }
  static arrayRemove(...values: unknown[]) { return new FieldValue({ kind: 'arrayRemove', values }); }
  static vector(values: number[] = []) { return new VectorValue(values); }
  isEqual(other: FieldValue) { return other instanceof FieldValue && JSON.stringify(other.transform) === JSON.stringify(this.transform); }
}

const DOCUMENT_ID = '__name__';
export class FieldPath {
  readonly segments: string[];
  constructor(...segments: string[]) { this.segments = segments; }
  static documentId() { return new FieldPath(DOCUMENT_ID); }
  isEqual(other: FieldPath) { return other instanceof FieldPath && other.segments.join('\0') === this.segments.join('\0'); }
}

export class AggregateField {
  // The property names firebase-admin's AggregateField has.
  private constructor(readonly aggregateType: 'count' | 'sum' | 'avg', readonly _field?: string | FieldPath) {}
  static count() { return new AggregateField('count'); }
  static sum(field: string | FieldPath) { return new AggregateField('sum', field); }
  static average(field: string | FieldPath) { return new AggregateField('avg', field); }
}

const SIMPLE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const quote = (segment: string) => (SIMPLE.test(segment) ? segment : `\`${segment.replace(/\\/g, '\\\\').replace(/`/g, '\\`')}\``);
/** A field path as the REST API writes it: segments joined with dots, odd ones in backticks. */
const encodePath = (segments: string[]) => segments.map(quote).join('.');
/** A user's field argument: a dotted string or a FieldPath. */
function segmentsOf(field: string | FieldPath): string[] {
  if (field instanceof FieldPath) return field.segments;
  if (field === DOCUMENT_ID) return [DOCUMENT_ID];
  return field.split('.');
}

type Value = Record<string, any>;
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

function encodeValue(value: unknown, db: Firestore): Value | undefined {
  if (value === undefined) return undefined;
  if (value === null) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    if (Number.isSafeInteger(value) && !Object.is(value, -0)) return { integerValue: String(value) };
    return { doubleValue: Number.isFinite(value) ? value : String(value) };
  }
  if (typeof value === 'bigint') return { integerValue: value.toString() };
  if (typeof value === 'string') return { stringValue: value };
  if (value instanceof Timestamp) return { timestampValue: value.toISOString() };
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new Error('Cannot store an invalid Date');
    return { timestampValue: Timestamp.fromDate(value).toISOString() };
  }
  if (isForeignTimestamp(value)) return { timestampValue: new Timestamp(value.seconds, value.nanoseconds).toISOString() };
  if (value instanceof Uint8Array || value instanceof ArrayBuffer) return { bytesValue: Buffer.from(value as Uint8Array).toString('base64') };
  if (value instanceof DocumentReference) return { referenceValue: value._name };
  if (value instanceof VectorValue) {
    return { mapValue: { fields: { __type__: { stringValue: '__vector__' }, value: { arrayValue: { values: value.toArray().map((item) => ({ doubleValue: item })) } } } } };
  }
  if (value instanceof FieldValue) throw new Error(`FieldValue.${value.transform.kind}() cannot be used here`);
  if (Array.isArray(value)) {
    const values = value.map((item) => encodeValue(item, db)).filter((item): item is Value => item !== undefined);
    return { arrayValue: values.length ? { values } : {} };
  }
  if (typeof value === 'object') {
    const fields: Record<string, Value> = {};
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      const encoded = encodeValue(inner, db);
      if (encoded !== undefined) fields[key] = encoded;
    }
    return { mapValue: { fields } };
  }
  throw new Error(`Cannot store a value of type ${typeof value}`);
}

/** A Timestamp from another copy of a Firestore library (e.g. firebase-admin in Cloud Functions). */
function isForeignTimestamp(value: unknown): value is { seconds: number; nanoseconds: number; toDate(): Date } {
  return Boolean(value) && typeof value === 'object' && typeof (value as any).toDate === 'function'
    && typeof (value as any).seconds === 'number' && typeof (value as any).nanoseconds === 'number';
}

function decodeValue(value: Value, db: Firestore): unknown {
  if ('nullValue' in value) return null;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('stringValue' in value) return value.stringValue;
  if ('timestampValue' in value) return Timestamp.fromString(value.timestampValue);
  if ('bytesValue' in value) return Buffer.from(value.bytesValue, 'base64');
  if ('referenceValue' in value) return db._refFromName(value.referenceValue);
  if ('geoPointValue' in value) return { latitude: value.geoPointValue.latitude ?? 0, longitude: value.geoPointValue.longitude ?? 0 };
  if ('arrayValue' in value) return (value.arrayValue.values || []).map((item: Value) => decodeValue(item, db));
  if ('mapValue' in value) {
    const fields = value.mapValue.fields || {};
    if (fields.__type__?.stringValue === '__vector__') {
      return new VectorValue((fields.value?.arrayValue?.values || []).map((item: Value) => Number(item.doubleValue ?? item.integerValue)));
    }
    return decodeFields(fields, db);
  }
  return null;
}

function decodeFields(fields: Record<string, Value> | undefined, db: Firestore): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(fields || {})) out[key] = decodeValue(inner, db);
  return out;
}

// ---- Errors ------------------------------------------------------------------------------

const CODES: Record<string, number> = {
  OK: 0, CANCELLED: 1, UNKNOWN: 2, INVALID_ARGUMENT: 3, DEADLINE_EXCEEDED: 4, NOT_FOUND: 5, ALREADY_EXISTS: 6,
  PERMISSION_DENIED: 7, RESOURCE_EXHAUSTED: 8, FAILED_PRECONDITION: 9, ABORTED: 10, OUT_OF_RANGE: 11,
  UNIMPLEMENTED: 12, INTERNAL: 13, UNAVAILABLE: 14, DATA_LOSS: 15, UNAUTHENTICATED: 16,
};

/** Like firebase-admin's errors: `code` is the gRPC number, `details` the server's message. */
export class FirestoreError extends Error {
  readonly code: number;
  readonly details: string;
  constructor(readonly status: string, details: string) {
    const code = CODES[status] ?? 2;
    super(`${code} ${status}: ${details}`);
    this.name = 'FirestoreError';
    this.code = code;
    this.details = details;
  }
}

function toFirestoreError(error: GoogleApiError): FirestoreError {
  const body = error.body as any;
  const inner = Array.isArray(body) ? body[0]?.error : body?.error;
  return new FirestoreError(error.status, String(inner?.message || error.message));
}

const RETRYABLE = new Set(['UNAVAILABLE', 'INTERNAL', 'RESOURCE_EXHAUSTED', 'DEADLINE_EXCEEDED', 'UNKNOWN']);

// ---- Snapshots ---------------------------------------------------------------------------

export class DocumentSnapshot {
  constructor(
    readonly ref: DocumentReference,
    private readonly fields: Record<string, unknown> | undefined,
    readonly readTime: Timestamp | undefined,
    readonly createTime: Timestamp | undefined,
    readonly updateTime: Timestamp | undefined,
  ) {}
  get id() { return this.ref.id; }
  get exists() { return this.fields !== undefined; }
  data(): Record<string, any> | undefined { return this.fields === undefined ? undefined : { ...this.fields }; }
  get(field: string | FieldPath): any {
    if (this.fields === undefined) return undefined;
    const segments = segmentsOf(field);
    if (segments.length === 1 && segments[0] === DOCUMENT_ID) return this.ref;
    let current: any = this.fields;
    for (const segment of segments) {
      if (!current || typeof current !== 'object' || !(segment in current)) return undefined;
      current = current[segment];
    }
    return current;
  }
  isEqual(other: DocumentSnapshot) { return other instanceof DocumentSnapshot && other.ref.path === this.ref.path && JSON.stringify(other.fields) === JSON.stringify(this.fields); }
}
export { DocumentSnapshot as QueryDocumentSnapshot };

export class QuerySnapshot {
  constructor(readonly query: Query, readonly docs: DocumentSnapshot[], readonly readTime: Timestamp | undefined) {}
  get size() { return this.docs.length; }
  get empty() { return this.docs.length === 0; }
  forEach(callback: (doc: DocumentSnapshot) => void, thisArg?: unknown) { this.docs.forEach(callback, thisArg); }
  docChanges() { return this.docs.map((doc, newIndex) => ({ type: 'added' as const, doc, oldIndex: -1, newIndex })); }
}

export class WriteResult {
  constructor(readonly writeTime: Timestamp) {}
}

// ---- References --------------------------------------------------------------------------

const AUTO_ID = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
function autoId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(40));
  let id = '';
  for (const byte of bytes) {
    if (byte >= 248) continue; // 248 = 62 * 4: keeps the choice uniform
    id += AUTO_ID[byte % 62];
    if (id.length === 20) break;
  }
  return id.length === 20 ? id : autoId();
}

function splitPath(path: string): string[] {
  const segments = path.split('/').filter(Boolean);
  if (segments.some((segment) => segment === '.' || segment === '..')) throw new Error(`Invalid path: ${path}`);
  return segments;
}

export class DocumentReference {
  constructor(readonly firestore: Firestore, private readonly segments: string[]) {
    if (segments.length === 0 || segments.length % 2 !== 0) throw new Error(`Not a document path: ${segments.join('/')}`);
  }
  get id() { return this.segments[this.segments.length - 1]; }
  get path() { return this.segments.join('/'); }
  get parent(): CollectionReference { return new CollectionReference(this.firestore, this.segments.slice(0, -1)); }
  /** projects/…/databases/(default)/documents/<path> */
  get _name() { return `${this.firestore._root}/${this.path}`; }
  collection(path: string) { return new CollectionReference(this.firestore, [...this.segments, ...splitPath(path)]); }
  isEqual(other: DocumentReference) { return other instanceof DocumentReference && other.path === this.path; }
  async get(): Promise<DocumentSnapshot> { return (await this.firestore.getAll(this))[0]; }
  async set(data: Record<string, unknown>, options?: SetOptions) { return (await this.firestore._commit([buildSet(this, data, options)]))[0]; }
  async create(data: Record<string, unknown>) { return (await this.firestore._commit([buildSet(this, data, undefined, { exists: false })]))[0]; }
  async update(dataOrField: Record<string, unknown> | string | FieldPath, ...more: unknown[]) {
    return (await this.firestore._commit([buildUpdate(this, dataOrField, more)]))[0];
  }
  async delete(precondition?: { exists?: boolean; lastUpdateTime?: Timestamp }) {
    return (await this.firestore._commit([buildDelete(this, precondition)]))[0];
  }
  async listCollections(): Promise<CollectionReference[]> {
    const ids: string[] = [];
    let pageToken: string | undefined;
    do {
      const body = await this.firestore._call<{ collectionIds?: string[]; nextPageToken?: string }>(`${this._name}:listCollectionIds`, { pageSize: 300, pageToken });
      ids.push(...(body.collectionIds || []));
      pageToken = body.nextPageToken;
    } while (pageToken);
    return ids.map((id) => this.collection(id));
  }
}

type SetOptions = { merge?: boolean; mergeFields?: (string | FieldPath)[] };
type Filter = { field: string[]; op: string; value: unknown };
type Order = { field: string[]; direction: 'ASCENDING' | 'DESCENDING' };
type Cursor = { values: unknown[] | DocumentSnapshot; before: boolean };
type QueryState = {
  parent: string[];          // the document path the collection lives under ([] = root)
  collectionId: string;
  allDescendants: boolean;   // collection group
  filters: Filter[];
  orders: Order[];
  limit?: number;
  offset?: number;
  select?: string[][];
  startAt?: Cursor;
  endAt?: Cursor;
};

const OPS: Record<string, string> = {
  '<': 'LESS_THAN', '<=': 'LESS_THAN_OR_EQUAL', '==': 'EQUAL', '!=': 'NOT_EQUAL', '>': 'GREATER_THAN', '>=': 'GREATER_THAN_OR_EQUAL',
  'array-contains': 'ARRAY_CONTAINS', in: 'IN', 'not-in': 'NOT_IN', 'array-contains-any': 'ARRAY_CONTAINS_ANY',
};
const INEQUALITY = new Set(['<', '<=', '>', '>=', '!=', 'not-in']);
const sameField = (left: string[], right: string[]) => left.join('\0') === right.join('\0');

export class Query {
  constructor(readonly firestore: Firestore, protected readonly state: QueryState) {}
  private with(patch: Partial<QueryState>) { return new Query(this.firestore, { ...this.state, ...patch }); }

  where(field: string | FieldPath, op: string, value: unknown): Query {
    if (!OPS[op]) throw new Error(`Unsupported query operator: ${op}`);
    return this.with({ filters: [...this.state.filters, { field: segmentsOf(field), op, value }] });
  }
  orderBy(field: string | FieldPath, direction: 'asc' | 'desc' = 'asc'): Query {
    return this.with({ orders: [...this.state.orders, { field: segmentsOf(field), direction: direction === 'desc' ? 'DESCENDING' : 'ASCENDING' }] });
  }
  limit(limit: number): Query { return this.with({ limit }); }
  offset(offset: number): Query { return this.with({ offset }); }
  select(...fields: (string | FieldPath)[]): Query {
    return this.with({ select: fields.length ? fields.map(segmentsOf) : [[DOCUMENT_ID]] });
  }
  startAt(...values: unknown[]): Query { return this.with({ startAt: cursor(values, true) }); }
  startAfter(...values: unknown[]): Query { return this.with({ startAt: cursor(values, false) }); }
  endBefore(...values: unknown[]): Query { return this.with({ endAt: cursor(values, true) }); }
  endAt(...values: unknown[]): Query { return this.with({ endAt: cursor(values, false) }); }

  count() { return this.aggregate({ count: AggregateField.count() }); }
  aggregate(spec: Record<string, AggregateField>) { return new AggregateQuery(this, spec); }
  findNearest(options: {
    vectorField: string | FieldPath; queryVector: number[] | VectorValue; limit: number;
    distanceMeasure: 'EUCLIDEAN' | 'COSINE' | 'DOT_PRODUCT'; distanceResultField?: string | FieldPath; distanceThreshold?: number;
  }) {
    return new VectorQuery(this, options);
  }

  async get(): Promise<QuerySnapshot> { return this._get(); }

  /** @internal Runs the query, optionally inside a transaction. */
  async _get(transaction?: string, extra?: Record<string, unknown>): Promise<QuerySnapshot> {
    const results = await this.firestore._call<any[]>(`${this._parentName()}:runQuery`, {
      structuredQuery: { ...this._structured(), ...extra }, ...(transaction ? { transaction } : {}),
    }, !transaction);
    let readTime: Timestamp | undefined;
    const docs: DocumentSnapshot[] = [];
    for (const result of results) {
      if (result.readTime) readTime = Timestamp.fromString(result.readTime);
      if (result.document) docs.push(this.firestore._snapshot(result.document, result.readTime));
    }
    return new QuerySnapshot(this, docs, readTime);
  }

  /** @internal */
  _parentName() { return this.state.parent.length ? `${this.firestore._root}/${this.state.parent.join('/')}` : this.firestore._root; }

  /** The orders the server applies, made explicit (needed for cursors taken from a snapshot). */
  private effectiveOrders(): Order[] {
    const orders = [...this.state.orders];
    if (orders.length === 0) {
      for (const filter of this.state.filters) {
        if (INEQUALITY.has(filter.op) && !orders.some((order) => sameField(order.field, filter.field))) orders.push({ field: filter.field, direction: 'ASCENDING' });
      }
    }
    if (!orders.some((order) => order.field.length === 1 && order.field[0] === DOCUMENT_ID)) {
      orders.push({ field: [DOCUMENT_ID], direction: orders.length ? orders[orders.length - 1].direction : 'ASCENDING' });
    }
    return orders;
  }

  private encodeFilterValue(field: string[], value: unknown): Value {
    if (field.length === 1 && field[0] === DOCUMENT_ID) {
      const reference = (item: unknown): Value => {
        if (item instanceof DocumentReference) return { referenceValue: item._name };
        if (typeof item === 'string') {
          const base = [...this.state.parent, this.state.collectionId];
          return { referenceValue: `${this.firestore._root}/${(this.state.allDescendants ? splitPath(item) : [...base, ...splitPath(item)]).join('/')}` };
        }
        throw new Error('A document id filter takes a string or a DocumentReference');
      };
      return Array.isArray(value) ? { arrayValue: { values: value.map(reference) } } : reference(value);
    }
    return encodeValue(value, this.firestore) ?? { nullValue: null };
  }

  /** @internal The REST structuredQuery. */
  _structured(): Record<string, unknown> {
    const state = this.state;
    const filters = state.filters.map((filter) => {
      const field = { fieldPath: encodePath(filter.field) };
      if ((filter.op === '==' || filter.op === '!=') && (filter.value === null || (typeof filter.value === 'number' && Number.isNaN(filter.value)))) {
        const kind = filter.value === null ? 'NULL' : 'NAN';
        return { unaryFilter: { op: filter.op === '==' ? `IS_${kind}` : `IS_NOT_${kind}`, field } };
      }
      return { fieldFilter: { field, op: OPS[filter.op], value: this.encodeFilterValue(filter.field, filter.value) } };
    });
    const usesSnapshotCursor = [state.startAt, state.endAt].some((item) => item && item.values instanceof DocumentSnapshot);
    const orders = usesSnapshotCursor ? this.effectiveOrders() : state.orders;
    const encodeCursor = (item: Cursor) => {
      let values: unknown[];
      if (item.values instanceof DocumentSnapshot) {
        const snapshot = item.values;
        values = orders.map((order) => (order.field.length === 1 && order.field[0] === DOCUMENT_ID ? snapshot.ref : snapshot.get(new FieldPath(...order.field))));
      } else {
        values = item.values;
      }
      return {
        before: item.before,
        values: values.map((value, index) => (orders[index] && sameField(orders[index].field, [DOCUMENT_ID]) ? this.encodeFilterValue([DOCUMENT_ID], value) : encodeValue(value, this.firestore) ?? { nullValue: null })),
      };
    };
    return {
      from: [{ collectionId: state.collectionId, ...(state.allDescendants ? { allDescendants: true } : {}) }],
      ...(filters.length === 1 ? { where: filters[0] } : filters.length > 1 ? { where: { compositeFilter: { op: 'AND', filters } } } : {}),
      ...(orders.length ? { orderBy: orders.map((order) => ({ field: { fieldPath: encodePath(order.field) }, direction: order.direction })) } : {}),
      ...(state.select ? { select: { fields: state.select.map((field) => ({ fieldPath: encodePath(field) })) } } : {}),
      ...(state.startAt ? { startAt: encodeCursor(state.startAt) } : {}),
      // endAt's `before` means "stop before these values" (endBefore).
      ...(state.endAt ? { endAt: encodeCursor(state.endAt) } : {}),
      ...(state.offset ? { offset: state.offset } : {}),
      ...(state.limit !== undefined ? { limit: state.limit } : {}),
    };
  }
}

function cursor(values: unknown[], before: boolean): Cursor {
  if (values.length === 1 && values[0] instanceof DocumentSnapshot) return { values: values[0], before };
  return { values, before };
}

export class CollectionReference extends Query {
  constructor(firestore: Firestore, private readonly segments: string[]) {
    if (segments.length === 0 || segments.length % 2 !== 1) throw new Error(`Not a collection path: ${segments.join('/')}`);
    super(firestore, { parent: segments.slice(0, -1), collectionId: segments[segments.length - 1], allDescendants: false, filters: [], orders: [] });
  }
  get id() { return this.segments[this.segments.length - 1]; }
  get path() { return this.segments.join('/'); }
  get parent(): DocumentReference | null { return this.segments.length > 1 ? new DocumentReference(this.firestore, this.segments.slice(0, -1)) : null; }
  doc(path?: string) { return new DocumentReference(this.firestore, [...this.segments, ...(path === undefined ? [autoId()] : splitPath(path))]); }
  async add(data: Record<string, unknown>) {
    const ref = this.doc();
    await ref.create(data);
    return ref;
  }
  isEqual(other: CollectionReference) { return other instanceof CollectionReference && other.path === this.path; }
  /** Every document, including "missing" ones that only hold subcollections. */
  async listDocuments(): Promise<DocumentReference[]> {
    const refs: DocumentReference[] = [];
    let pageToken: string | undefined;
    do {
      const params = new URLSearchParams({ pageSize: '300', showMissing: 'true', 'mask.fieldPaths': DOCUMENT_ID });
      if (pageToken) params.set('pageToken', pageToken);
      const body = await this.firestore._call<{ documents?: { name: string }[]; nextPageToken?: string }>(`${this._parentName()}/${encodeURIComponent(this.id)}?${params}`, undefined, true);
      for (const document of body.documents || []) refs.push(this.firestore._refFromName(document.name));
      pageToken = body.nextPageToken;
    } while (pageToken);
    return refs;
  }
}

export class AggregateQuery {
  constructor(readonly query: Query, private readonly spec: Record<string, AggregateField>) {}
  async get(transaction?: string) {
    const aggregations = Object.entries(this.spec).map(([alias, field]) => ({
      alias,
      ...(field.aggregateType === 'count' ? { count: {} } : { [field.aggregateType]: { field: { fieldPath: encodePath(segmentsOf(field._field!)) } } }),
    }));
    const results = await this.query.firestore._call<any[]>(`${this.query._parentName()}:runAggregationQuery`, {
      structuredAggregationQuery: { structuredQuery: this.query._structured(), aggregations }, ...(transaction ? { transaction } : {}),
    }, !transaction);
    const found = results.find((result) => result.result)?.result?.aggregateFields || {};
    const data: Record<string, number | null> = {};
    for (const alias of Object.keys(this.spec)) data[alias] = found[alias] ? (decodeValue(found[alias], this.query.firestore) as number | null) : this.spec[alias].aggregateType === 'avg' ? null : 0;
    const readTime = results.find((result) => result.readTime)?.readTime;
    return { data: () => ({ ...data }), readTime: readTime ? Timestamp.fromString(readTime) : undefined, query: this };
  }
}

export class VectorQuery {
  constructor(readonly query: Query, private readonly options: Parameters<Query['findNearest']>[0]) {}
  async get(): Promise<QuerySnapshot> {
    const options = this.options;
    const vector = options.queryVector instanceof VectorValue ? options.queryVector : new VectorValue(options.queryVector);
    return this.query._get(undefined, {
      findNearest: {
        vectorField: { fieldPath: encodePath(segmentsOf(options.vectorField)) },
        queryVector: encodeValue(vector, this.query.firestore),
        distanceMeasure: options.distanceMeasure,
        limit: options.limit,
        ...(options.distanceResultField ? { distanceResultField: encodePath(segmentsOf(options.distanceResultField)) } : {}),
        ...(options.distanceThreshold !== undefined ? { distanceThreshold: options.distanceThreshold } : {}),
      },
    });
  }
}

// ---- Writes ------------------------------------------------------------------------------

type Write = Record<string, unknown>;

/** Splits data into stored fields and field transforms (sentinels), walking nested maps. */
function splitData(data: Record<string, unknown>, db: Firestore, prefix: string[] = [], transforms: { path: string[]; transform: Transform }[] = []) {
  const fields: Record<string, Value> = {};
  for (const [key, value] of Object.entries(data)) {
    const path = [...prefix, key];
    if (value instanceof FieldValue) { transforms.push({ path, transform: value.transform }); continue; }
    if (isPlainObject(value) && containsSentinel(value)) {
      const inner = splitData(value, db, path, transforms);
      fields[key] = { mapValue: { fields: inner.fields } };
      continue;
    }
    const encoded = encodeValue(value, db);
    if (encoded !== undefined) fields[key] = encoded;
  }
  return { fields, transforms };
}

function containsSentinel(value: unknown): boolean {
  if (value instanceof FieldValue) return true;
  if (isPlainObject(value)) return Object.values(value).some(containsSentinel);
  return false;
}

/** Leaf paths of data, for merge: nested maps are merged, not replaced. */
function leafPaths(data: Record<string, unknown>, prefix: string[] = []): string[][] {
  const out: string[][] = [];
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    const path = [...prefix, key];
    if (isPlainObject(value) && Object.keys(value).length > 0) out.push(...leafPaths(value, path));
    else out.push(path);
  }
  return out;
}

function encodeTransforms(transforms: { path: string[]; transform: Transform }[], db: Firestore) {
  return transforms.filter((item) => item.transform.kind !== 'delete').map(({ path, transform }) => {
    const fieldPath = encodePath(path);
    switch (transform.kind) {
      case 'serverTimestamp': return { fieldPath, setToServerValue: 'REQUEST_TIME' };
      case 'increment': return { fieldPath, increment: encodeValue(transform.by, db) };
      case 'arrayUnion': return { fieldPath, appendMissingElements: { values: transform.values.map((item) => encodeValue(item, db) ?? { nullValue: null }) } };
      case 'arrayRemove': return { fieldPath, removeAllFromArray: { values: transform.values.map((item) => encodeValue(item, db) ?? { nullValue: null }) } };
      default: throw new Error('Unknown transform');
    }
  });
}

function buildSet(ref: DocumentReference, data: Record<string, unknown>, options?: SetOptions, precondition?: { exists: boolean }): Write {
  if (!isPlainObject(data)) throw new Error('Document data must be an object');
  const db = ref.firestore;
  const { fields, transforms } = splitData(data, db);
  const write: Write = { update: { name: ref._name, fields } };
  if (options?.merge || options?.mergeFields) {
    const paths = options.mergeFields
      ? options.mergeFields.map(segmentsOf)
      : leafPaths(data).filter((path) => !transforms.some((item) => item.transform.kind !== 'delete' && sameField(item.path, path)));
    write.updateMask = { fieldPaths: paths.map(encodePath) };
  }
  const updateTransforms = encodeTransforms(transforms, db);
  if (updateTransforms.length) write.updateTransforms = updateTransforms;
  if (precondition) write.currentDocument = precondition;
  return write;
}

function buildUpdate(ref: DocumentReference, dataOrField: Record<string, unknown> | string | FieldPath, more: unknown[]): Write {
  const db = ref.firestore;
  const entries: [string[], unknown][] = [];
  if (typeof dataOrField === 'string' || dataOrField instanceof FieldPath) {
    const args = [dataOrField, ...more];
    for (let index = 0; index + 1 < args.length; index += 2) entries.push([segmentsOf(args[index] as string | FieldPath), args[index + 1]]);
  } else {
    for (const [key, value] of Object.entries(dataOrField)) entries.push([segmentsOf(key), value]);
  }
  const root: Record<string, unknown> = {};
  const mask: string[][] = [];
  const transforms: { path: string[]; transform: Transform }[] = [];
  for (const [path, value] of entries) {
    if (value === undefined) continue;
    if (value instanceof FieldValue) {
      transforms.push({ path, transform: value.transform });
      if (value.transform.kind === 'delete') mask.push(path);
      continue;
    }
    mask.push(path);
    let target = root;
    for (const segment of path.slice(0, -1)) target = (target[segment] ??= {}) as Record<string, unknown>;
    target[path[path.length - 1]] = value;
  }
  const split = splitData(root, db, [], transforms);
  const write: Write = {
    update: { name: ref._name, fields: split.fields },
    updateMask: { fieldPaths: mask.map(encodePath) },
    currentDocument: { exists: true },
  };
  const updateTransforms = encodeTransforms(split.transforms, db);
  if (updateTransforms.length) write.updateTransforms = updateTransforms;
  return write;
}

function buildDelete(ref: DocumentReference, precondition?: { exists?: boolean; lastUpdateTime?: Timestamp }): Write {
  const write: Write = { delete: ref._name };
  if (precondition?.exists !== undefined) write.currentDocument = { exists: precondition.exists };
  else if (precondition?.lastUpdateTime) write.currentDocument = { updateTime: precondition.lastUpdateTime.toISOString() };
  return write;
}

export class WriteBatch {
  private readonly writes: Write[] = [];
  constructor(private readonly firestore: Firestore) {}
  set(ref: DocumentReference, data: Record<string, unknown>, options?: SetOptions) { this.writes.push(buildSet(ref, data, options)); return this; }
  create(ref: DocumentReference, data: Record<string, unknown>) { this.writes.push(buildSet(ref, data, undefined, { exists: false })); return this; }
  update(ref: DocumentReference, dataOrField: Record<string, unknown> | string | FieldPath, ...more: unknown[]) { this.writes.push(buildUpdate(ref, dataOrField, more)); return this; }
  delete(ref: DocumentReference, precondition?: { exists?: boolean; lastUpdateTime?: Timestamp }) { this.writes.push(buildDelete(ref, precondition)); return this; }
  async commit(): Promise<WriteResult[]> { return this.writes.length ? this.firestore._commit(this.writes) : []; }
}

export class Transaction {
  /** @internal */ readonly writes: Write[] = [];
  constructor(private readonly firestore: Firestore, private readonly id: string) {}
  async get(target: DocumentReference | Query | AggregateQuery): Promise<any> {
    if (this.writes.length) throw new Error('Firestore transactions require all reads to happen before writes');
    if (target instanceof DocumentReference) return (await this.firestore._getAll([target], this.id))[0];
    if (target instanceof AggregateQuery) return target.get(this.id);
    return target._get(this.id);
  }
  async getAll(...refs: DocumentReference[]): Promise<DocumentSnapshot[]> {
    if (this.writes.length) throw new Error('Firestore transactions require all reads to happen before writes');
    return this.firestore._getAll(refs, this.id);
  }
  set(ref: DocumentReference, data: Record<string, unknown>, options?: SetOptions) { this.writes.push(buildSet(ref, data, options)); return this; }
  create(ref: DocumentReference, data: Record<string, unknown>) { this.writes.push(buildSet(ref, data, undefined, { exists: false })); return this; }
  update(ref: DocumentReference, dataOrField: Record<string, unknown> | string | FieldPath, ...more: unknown[]) { this.writes.push(buildUpdate(ref, dataOrField, more)); return this; }
  delete(ref: DocumentReference, precondition?: { exists?: boolean; lastUpdateTime?: Timestamp }) { this.writes.push(buildDelete(ref, precondition)); return this; }
}

// ---- The client --------------------------------------------------------------------------

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Refs are built synchronously, before the project id is known: until then their resource names
// hold this marker, which _call swaps for the real root. (A private-use character, so
// JSON.stringify leaves it as it is.)
const ROOT_PLACEHOLDER = '\uE000root\uE000';

export class Firestore {
  private root = '';
  private base = '';
  private readyPromise: Promise<void> | null = null;

  constructor(private readonly database = '(default)') {}

  private ready(): Promise<void> {
    this.readyPromise ??= projectId().then((id) => {
      this.root = `projects/${id}/databases/${this.database}/documents`;
      const emulator = process.env.FIRESTORE_EMULATOR_HOST;
      this.base = emulator ? `http://${emulator}/v1` : 'https://firestore.googleapis.com/v1';
    });
    this.readyPromise.catch(() => { this.readyPromise = null; });
    return this.readyPromise;
  }

  /** projects/<id>/databases/(default)/documents (a placeholder until the first request). */
  get _root() { return this.root || ROOT_PLACEHOLDER; }

  collection(path: string) { return new CollectionReference(this, splitPath(path)); }
  doc(path: string) { return new DocumentReference(this, splitPath(path)); }
  collectionGroup(collectionId: string) {
    return new Query(this, { parent: [], collectionId, allDescendants: true, filters: [], orders: [] });
  }
  batch() { return new WriteBatch(this); }

  /** @internal A reference from a full resource name. */
  _refFromName(name: string): DocumentReference {
    const marker = '/documents/';
    const at = name.indexOf(marker);
    return new DocumentReference(this, splitPath(at >= 0 ? name.slice(at + marker.length) : name));
  }

  /** @internal */
  _snapshot(document: { name: string; fields?: Record<string, Value>; createTime?: string; updateTime?: string }, readTime?: string) {
    return new DocumentSnapshot(
      this._refFromName(document.name),
      decodeFields(document.fields, this),
      readTime ? Timestamp.fromString(readTime) : undefined,
      document.createTime ? Timestamp.fromString(document.createTime) : undefined,
      document.updateTime ? Timestamp.fromString(document.updateTime) : undefined,
    );
  }

  /** @internal POSTs (or GETs, without a body) to a Firestore resource; retries reads on transient errors. */
  async _call<T>(resource: string, body?: unknown, retry = false): Promise<T> {
    await this.ready();
    const path = resource.split(ROOT_PLACEHOLDER).join(this.root);
    const text = body === undefined ? undefined : JSON.stringify(body).split(ROOT_PLACEHOLDER).join(this.root);
    for (let attempt = 0; ; attempt += 1) {
      const response = await googleFetch(`${this.base}/${path}`, body === undefined ? {} : { method: 'POST', body: text });
      if (response.ok) return (await response.json()) as T;
      const error = toFirestoreError(await readError(response, 'Firestore'));
      if (!retry || attempt >= 3 || !RETRYABLE.has(error.status)) throw error;
      await sleep(200 * 2 ** attempt + Math.random() * 100);
    }
  }

  /** @internal */
  async _commit(writes: Write[], transaction?: string): Promise<WriteResult[]> {
    const body = await this._call<{ writeResults?: { updateTime?: string }[]; commitTime: string }>(`${this._root}:commit`, { writes, ...(transaction ? { transaction } : {}) });
    const commitTime = Timestamp.fromString(body.commitTime);
    return writes.map((_, index) => new WriteResult(body.writeResults?.[index]?.updateTime ? Timestamp.fromString(body.writeResults[index].updateTime!) : commitTime));
  }

  async getAll(...refs: DocumentReference[]): Promise<DocumentSnapshot[]> { return this._getAll(refs); }

  /** @internal Reads documents in the order asked (batchGet answers in any order). */
  async _getAll(refs: DocumentReference[], transaction?: string): Promise<DocumentSnapshot[]> {
    if (refs.length === 0) return [];
    await this.ready();
    const results = await this._call<any[]>(`${this._root}:batchGet`, { documents: refs.map((ref) => ref._name), ...(transaction ? { transaction } : {}) }, !transaction);
    const byName = new Map<string, DocumentSnapshot>();
    for (const result of results) {
      if (result.found) byName.set(result.found.name, this._snapshot(result.found, result.readTime));
      else if (result.missing) byName.set(result.missing, new DocumentSnapshot(this._refFromName(result.missing), undefined, result.readTime ? Timestamp.fromString(result.readTime) : undefined, undefined, undefined));
    }
    return refs.map((ref) => byName.get(ref._name) ?? new DocumentSnapshot(ref, undefined, undefined, undefined, undefined));
  }

  /**
   * Runs `update` in a read-write transaction, retrying on contention (ABORTED) like
   * firebase-admin: up to `maxAttempts` times with backoff.
   */
  async runTransaction<T>(update: (transaction: Transaction) => Promise<T>, options: { maxAttempts?: number; readOnly?: boolean } = {}): Promise<T> {
    await this.ready();
    const maxAttempts = options.maxAttempts ?? 5;
    let previous: string | undefined;
    for (let attempt = 1; ; attempt += 1) {
      const begun = await this._call<{ transaction: string }>(`${this._root}:beginTransaction`, {
        options: options.readOnly ? { readOnly: {} } : { readWrite: previous ? { retryTransaction: previous } : {} },
      }, true);
      const transaction = new Transaction(this, begun.transaction);
      try {
        const result = await update(transaction);
        await this._commit(transaction.writes, begun.transaction);
        return result;
      } catch (error) {
        const retryable = error instanceof FirestoreError && (error.code === 10 || error.code === 14);
        if (!retryable || attempt >= maxAttempts) {
          await this._call(`${this._root}:rollback`, { transaction: begun.transaction }).catch(() => undefined);
          throw error;
        }
        previous = begun.transaction;
        await sleep(Math.min(1000 * 2 ** (attempt - 1), 5000) * (0.5 + Math.random() * 0.5));
      }
    }
  }

  /** Deletes a document or collection and everything under it (subcollections included). */
  async recursiveDelete(ref: DocumentReference | CollectionReference): Promise<void> {
    const refs: DocumentReference[] = [];
    const walkDocument = async (doc: DocumentReference) => {
      for (const collection of await doc.listCollections()) await walkCollection(collection);
      refs.push(doc);
    };
    const walkCollection = async (collection: CollectionReference) => {
      for (const doc of await collection.listDocuments()) await walkDocument(doc);
    };
    if (ref instanceof DocumentReference) await walkDocument(ref);
    else await walkCollection(ref);
    for (let index = 0; index < refs.length; index += 450) {
      await this._commit(refs.slice(index, index + 450).map((doc) => buildDelete(doc)));
    }
  }

  /** Kept for code written for firebase-admin; settings are fixed here. */
  settings(_settings: Record<string, unknown>) { /* no-op */ }
}

