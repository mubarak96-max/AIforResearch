'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LuExternalLink, LuLoader, LuSearch } from 'react-icons/lu';
import {
  connectZoteroKey, disconnectReferenceManager, getLibraryConnections, getReferenceCollections, getZoteroGroups, startReferenceImport, startReferenceSignIn,
  type LibraryConnections, type ReferenceCollection, type ReferenceProvider,
} from '../../../utils/libraryApi';
import { FindPdfs, ImportProgress, UpgradeCard, plural, useImportJob } from './LibraryImportParts';

const NAMES: Record<ReferenceProvider, string> = { zotero: 'Zotero', mendeley: 'Mendeley' };
const ZOTERO_NEW_KEY = 'https://www.zotero.org/settings/keys/new?name=AI for Research&library_access=1&notes_access=0&write_access=0';

type Props = {
  provider: ReferenceProvider;
  folderId: string | null;
  allowed: boolean;
  planName?: string;
  onUpgrade: (message?: string) => void;
  onChanged: () => void;
};

const primary = 'inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[var(--theme-primary,var(--color-brand))] px-5 text-[14px] font-semibold text-white hover:opacity-90 disabled:opacity-50';
const secondary = 'inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-line bg-surface px-4 text-[14px] font-semibold text-ink hover:bg-soft disabled:opacity-50';

/** Zotero or Mendeley in the add dialog: connect once, then import the library or one collection. */
export function ReferenceManagerPane({ provider, folderId, allowed, planName, onUpgrade, onChanged }: Props) {
  const name = NAMES[provider];
  const [connections, setConnections] = useState<LibraryConnections | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    setError(null);
    getLibraryConnections().then(setConnections).catch((caught) => setError((caught as Error).message));
  }, []);
  useEffect(() => { if (allowed) load(); }, [allowed, load]);

  if (!allowed) {
    return <UpgradeCard title={`${name} import is on paid plans`} text={`Bring your whole ${name} library in, with its PDFs and collections. ${planName ? `The ${planName} plan` : 'Your plan'} does not include it.`} onUpgrade={() => onUpgrade()} />;
  }
  if (error) return <p role="alert" className="text-[13.5px] text-[#dc2626]">{error}</p>;
  if (!connections) return <p className="flex items-center gap-2 text-[13.5px] text-muted"><LuLoader className="h-4 w-4 animate-spin" />Loading…</p>;
  const state = connections[provider];
  if (!state.connected) return <Connect provider={provider} signIn={state.sign_in} onConnected={load} />;
  return <Collections provider={provider} accountName={state.name} folderId={folderId} onDisconnected={load} onChanged={onChanged} />;
}

function Connect({ provider, signIn, onConnected }: { provider: ReferenceProvider; signIn: boolean; onConnected: () => void }) {
  const name = NAMES[provider];
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startSignIn = async () => {
    setBusy('sign-in'); setError(null);
    try {
      const { authorization_url: url } = await startReferenceSignIn(provider, `${window.location.pathname}${window.location.search}`);
      window.location.assign(url);
    } catch (caught) { setError((caught as Error).message); setBusy(null); }
  };
  const connectKey = async () => {
    setBusy('key'); setError(null);
    try { await connectZoteroKey(key.trim()); onConnected(); } catch (caught) { setError((caught as Error).message); } finally { setBusy(null); }
  };

  return (
    <div className="flex max-w-[520px] flex-col gap-4">
      <div>
        <p className="text-[16px] font-semibold text-ink">Connect {name}</p>
        <p className="mt-1 text-[14px] leading-relaxed text-muted">Import your {name} library or one collection, with its PDFs. AI for Research only reads it and never changes anything there.</p>
      </div>
      {signIn && (
        <div><button type="button" className={primary} disabled={busy !== null} onClick={() => void startSignIn()}>{busy === 'sign-in' && <LuLoader className="h-4 w-4 animate-spin" />}Connect {name}</button></div>
      )}
      {provider === 'zotero' && (
        <div className={signIn ? 'border-t border-line-2 pt-4' : ''}>
          <p className="text-[14px] font-medium text-ink">{signIn ? 'Or use an API key' : 'Paste a Zotero API key'}</p>
          <ol className="mt-1.5 list-decimal pl-5 text-[13.5px] leading-relaxed text-ink-3">
            <li><a href={ZOTERO_NEW_KEY} target="_blank" rel="noreferrer" className="font-semibold text-[var(--theme-primary,var(--color-brand))] hover:underline">Create a key on zotero.org<LuExternalLink className="ml-1 inline h-3 w-3" /></a> with library access (it is filled in for you).</li>
            <li>Save it, copy the key and paste it here.</li>
            <li>For group imports, explicitly grant read access to the groups you choose. Write access is not needed.</li>
          </ol>
          <div className="mt-3 flex flex-wrap gap-2">
            <input value={key} onChange={(event) => setKey(event.target.value)} placeholder="Zotero API key" aria-label="Zotero API key" spellCheck={false} autoComplete="off"
              className="h-10 min-w-0 flex-1 rounded-[10px] border border-line px-3 font-mono text-[13px] outline-none focus:border-[var(--theme-primary,var(--color-brand))] focus:shadow-[0_0_0_3px_var(--color-brand-50)]" />
            <button type="button" className={secondary} disabled={busy !== null || key.trim().length < 8} onClick={() => void connectKey()}>{busy === 'key' && <LuLoader className="h-4 w-4 animate-spin" />}Connect</button>
          </div>
        </div>
      )}
      {provider === 'mendeley' && !signIn && (
        <p className="rounded-xl bg-soft px-4 py-3 text-[13.5px] leading-relaxed text-ink-3">
          Mendeley sign-in is not switched on for this site yet. Meanwhile, in Mendeley Reference Manager choose <b>File › Export All</b> as BibTeX, then use <b>Import .bib/.ris</b>.
        </p>
      )}
      {error && <p role="alert" className="text-[13px] text-[#dc2626]">{error}</p>}
    </div>
  );
}

function Collections({ provider, accountName, folderId, onDisconnected, onChanged }: { provider: ReferenceProvider; accountName: string | null; folderId: string | null; onDisconnected: () => void; onChanged: () => void }) {
  const name = NAMES[provider];
  const [collections, setCollections] = useState<ReferenceCollection[] | null>(null);
  const [libraryItems, setLibraryItems] = useState<number | null>(null);
  const [choice, setChoice] = useState<string>('');
  const [query, setQuery] = useState('');
  const [groupId, setGroupId] = useState('');
  const [groups, setGroups] = useState<{ id: string; name: string }[] | null>(null);
  const [groupWarning, setGroupWarning] = useState<string | null>(null);
  const [groupsBusy, setGroupsBusy] = useState(false);
  const [findPdfs, setFindPdfs] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { job, follow, reset } = useImportJob();
  useEffect(() => { if (job && job.status !== 'running') onChanged(); }, [job, onChanged]);

  useEffect(() => {
    let active = true;
    setCollections(null); setChoice(''); setQuery(''); setError(null);
    getReferenceCollections(provider, groupId || null)
      .then((result) => { if (active) { setCollections(result.collections); setLibraryItems(result.library_items); } })
      .catch((caught) => { if (active) setError((caught as Error).message); });
    return () => { active = false; };
  }, [provider, groupId]);

  const readGroups = async () => {
    setGroupsBusy(true); setGroupWarning(null);
    try { const result = await getZoteroGroups(); setGroups(result.groups); setGroupWarning(result.warning); }
    catch (caught) { setGroupWarning((caught as Error).message); }
    finally { setGroupsBusy(false); }
  };

  // Nested collections listed under their parent.
  const ordered = useMemo(() => {
    const list = collections ?? [];
    const out: (ReferenceCollection & { depth: number })[] = [];
    const visit = (parent: string | null, depth: number) => {
      for (const item of list.filter((entry) => (entry.parent ?? null) === parent)) { out.push({ ...item, depth }); if (depth < 6) visit(item.id, depth + 1); }
    };
    visit(null, 0);
    for (const item of list) if (!out.some((entry) => entry.id === item.id)) out.push({ ...item, depth: 0 });
    const term = query.trim().toLowerCase();
    return term ? out.filter((item) => item.name.toLowerCase().includes(term)).map((item) => ({ ...item, depth: 0 })) : out;
  }, [collections, query]);

  const start = async () => {
    setBusy(true); setError(null);
    const picked = collections?.find((item) => item.id === choice) ?? null;
    try {
      const started = await startReferenceImport(provider, { collection: picked?.id ?? null, collection_name: picked?.name ?? null, folder_id: folderId, find_pdfs: findPdfs, ...(provider === 'zotero' && groupId ? { group_id: groupId } : {}) });
      follow(started.job_id);
    } catch (caught) { setError((caught as Error).message); } finally { setBusy(false); }
  };
  const disconnect = async () => {
    await disconnectReferenceManager(provider).catch(() => undefined);
    onDisconnected();
  };

  if (job) return <ImportProgress job={job} onAgain={reset} />;
  const option = (id: string, label: string, count: number | null, depth = 0) => (
    <label key={id || 'all'} className={`flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14px] transition-colors ${choice === id ? 'bg-brand-50' : 'hover:bg-soft'}`} style={{ paddingLeft: 12 + depth * 18 }}>
      <input type="radio" name={`${provider}-collection`} checked={choice === id} onChange={() => setChoice(id)} className="h-4 w-4 accent-[var(--theme-primary,var(--color-brand))]" />
      <span className="min-w-0 flex-1 truncate text-ink">{label}</span>
      {count !== null && <span className="shrink-0 text-[12.5px] text-subtle">{count.toLocaleString('en-US')}</span>}
    </label>
  );
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-[13.5px] text-ink-3">
        <span className="h-2 w-2 rounded-full bg-[#16a34a]" />
        <span className="min-w-0 flex-1 truncate">Connected{accountName ? ` as ${accountName}` : ''}</span>
        <button type="button" onClick={() => void disconnect()} className="shrink-0 text-[13px] font-medium text-muted hover:text-[#dc2626]">Disconnect</button>
      </div>
      {provider === 'zotero' && <div className="space-y-2">
        <button type="button" disabled={groupsBusy} onClick={() => void readGroups()} className="text-[13px] font-medium text-brand hover:underline disabled:opacity-50">{groupsBusy ? 'Reading group permissions…' : groups ? 'Refresh available groups' : 'Choose a group library'}</button>
        {groups && <label className="block text-[13px] font-medium text-ink">Zotero library<select value={groupId} onChange={(event) => setGroupId(event.target.value)} className="mt-1 block h-10 w-full rounded-lg border border-line bg-surface px-3 text-[14px]"><option value="">Personal library</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>}
        {groupWarning && <p className="text-[12.5px] text-muted">{groupWarning}</p>}
        {groupId && <p className="text-[12.5px] text-muted">Read-only import from the selected group. Permissions are checked again when importing; nothing is written back.</p>}
      </div>}
      {!collections && !error && <p className="flex items-center gap-2 text-[13.5px] text-muted"><LuLoader className="h-4 w-4 animate-spin" />Reading your {name} collections…</p>}
      {collections && (
        <>
          {collections.length > 8 && (
            <div className="relative">
              <LuSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${plural(collections.length, 'collection')}`} aria-label="Search collections"
                className="h-9 w-full rounded-[10px] border border-line pl-9 pr-3 text-[14px] outline-none focus:border-[var(--theme-primary,var(--color-brand))]" />
            </div>
          )}
          <div className="max-h-[300px] overflow-y-auto rounded-xl border border-line p-1.5" role="radiogroup" aria-label={`What to import from ${name}`}>
            {!query && option('', groupId ? 'Whole selected group library' : `Whole ${name} library`, libraryItems)}
            {ordered.map((item) => option(item.id, item.name, item.items, item.depth))}
            {collections.length === 0 && <p className="px-3 py-2 text-[13px] text-subtle">No collections: the whole library is imported.</p>}
          </div>
          <p className="text-[12.5px] text-muted">{choice && !folderId ? 'It becomes a Library collection with the same name. ' : ''}Import again to update unchanged reference fields from this account. Your local edits and PDFs stay intact. Nothing is written back to {name}.</p>
          <FindPdfs value={findPdfs} onChange={setFindPdfs} />
          <div><button type="button" className={primary} disabled={busy} onClick={() => void start()}>{busy && <LuLoader className="h-4 w-4 animate-spin" />}Import or update from {name}</button></div>
        </>
      )}
      {error && <p role="alert" className="text-[13px] text-[#dc2626]">{error}</p>}
    </div>
  );
}
