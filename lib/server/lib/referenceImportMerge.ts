import type { LibraryRow } from './libraryFiles.js';
import type { ImportEntry } from './libraryImport.js';

/** The last values read from a reference manager, not the user's current edits. */
export function referenceSnapshot(entry: ImportEntry) {
  return {
    title: entry.title.slice(0, 1000), authors: entry.authors.slice(0, 200),
    publisher: entry.journal?.slice(0, 500) ?? null, publication_date: entry.year,
    abstract: entry.abstract?.slice(0, 20000) ?? null, doi: entry.doi,
    url: entry.url,
  };
}

/** Keys this app manages inside a document's metadata; provider metadata never overrides them. */
const MANAGED_KEYS = new Set([
  'source', 'url', 'journal', 'notes', 'import_snapshot', 'import_conflicts', 'import_refreshed_at',
  'provider_metadata_keys', 'source_metadata',
]);

/** Provider metadata is stored flat in the document's metadata, the same way at creation and on refresh. */
export function providerMetadata(entry: ImportEntry) {
  const values = Object.fromEntries(Object.entries(entry.metadata ?? {}).filter(([key]) => !MANAGED_KEYS.has(key)));
  return { values, keys: Object.keys(values) };
}

type Snapshot = ReturnType<typeof referenceSnapshot>;
type Field = keyof Snapshot;
export type ImportConflict = { field: Field; local: unknown; incoming: unknown };
const empty = (value: unknown) => value == null || value === '' || (Array.isArray(value) && value.length === 0);
const doiKey = (value: unknown) => String(value ?? '').replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').trim().toLowerCase();
/** Whitespace and letter case are formatting, not a different value. */
const normal = (value: unknown): unknown => {
  if (typeof value === 'string') return value.replace(/\s+/g, ' ').trim().toLowerCase();
  if (Array.isArray(value)) return value.map(normal);
  return value ?? null;
};
const same = (left: unknown, right: unknown) => JSON.stringify(normal(left)) === JSON.stringify(normal(right));

/** Three-way merge: only replace values still equal to the previous import. */
export function mergeReferenceImport(current: LibraryRow, entry: ImportEntry) {
  const incoming = referenceSnapshot(entry);
  const previous = current.metadata?.import_snapshot as Partial<Snapshot> | undefined;
  const patch: Record<string, unknown> = {};
  const conflicts: ImportConflict[] = [];
  let url = current.metadata?.url ?? null;
  for (const field of Object.keys(incoming) as Field[]) {
    const local = field === 'url' ? url : current[field];
    const remote = incoming[field];
    if (field === 'doi') {
      // DOI identity is authoritative: a missing DOI may be filled in, but a different one
      // needs an explicit edit, even when the reference manager changed it.
      if (empty(remote) || doiKey(local) === doiKey(remote)) continue;
      if (empty(local)) patch.doi = remote;
      else conflicts.push({ field, local, incoming: remote });
      continue;
    }
    if (same(local, remote)) continue;
    // Without an earlier snapshot (legacy imports) only empty fields are filled; edited-looking values are kept.
    const safe = previous && Object.hasOwn(previous, field) ? same(local, previous[field]) : empty(local);
    if (safe) {
      if (field === 'url') url = remote;
      else patch[field] = remote;
    } else conflicts.push({ field, local: local ?? null, incoming: remote });
  }
  const changed = Object.keys(patch).length > 0 || url !== (current.metadata?.url ?? null);
  // Replace the provider metadata from the previous import, keeping everything the user or app added.
  const metadata: Record<string, unknown> = { ...current.metadata };
  const staleKeys = Array.isArray(current.metadata?.provider_metadata_keys) ? current.metadata.provider_metadata_keys : [];
  for (const key of staleKeys) if (typeof key === 'string' && !MANAGED_KEYS.has(key)) delete metadata[key];
  delete metadata.source_metadata;
  const provider = providerMetadata(entry);
  return {
    patch, changed, conflicts,
    metadata: {
      ...metadata, ...provider.values,
      url, ...('publisher' in patch ? { journal: entry.journal ?? null } : {}),
      provider_metadata_keys: provider.keys,
      import_snapshot: incoming, import_conflicts: conflicts, import_refreshed_at: new Date().toISOString(),
    },
  };
}
