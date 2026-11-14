'use client';

import Link from 'next/link';
import { Suspense, useEffect, useRef, useState } from 'react';
import { AppFrame } from '@/components/app/AppFrame';
import { SourcesNav } from '@/components/app/SourcesNav';
import { Button, Card, inputClass } from '@/components/app/ui';
import { useSignedIn } from '@/components/app/useSignedIn';
import { api } from '@/lib/session';
import { download, toCsv } from '@/components/app/analysis/stats';
import { OFFICIAL_DATA_KINDS, OFFICIAL_LABELS, OPENFDA_NOTE, type OfficialLocator, type OfficialProvider, type OfficialRecord, type OfficialSearch } from '@/lib/officialSources';

type WorkbookDestination = { id: string; title: string; revision: number; project_id: string | null };
const examples: Record<OfficialProvider, string> = {
  clinical_trials: 'e.g. type 2 diabetes AND exercise', world_bank: 'e.g. school enrollment or SE.PRM.ENRR', reliefweb: 'e.g. food insecurity assessment', sec: 'Numeric company CIK, e.g. 320193',
  openfda_label: 'Drug name, e.g. metformin', openfda_event: 'Drug name, e.g. metformin', openfda_device: 'Device or company, e.g. insulin pump', fred: 'e.g. unemployment rate or GDPC1',
  treasury: 'e.g. debt to the penny', oecd: 'e.g. unemployment monthly',
};
const NOTES: Partial<Record<OfficialProvider, string>> = {
  openfda_label: 'Drug labels as submitted by manufacturers, from openFDA.', openfda_event: 'Counts of reactions in FDA Adverse Event Reporting System reports that name the drug. Reports do not show that a drug caused a reaction.',
  openfda_device: 'FDA 510(k) premarket clearances. A clearance is not an approval or evidence of effectiveness.', fred: 'Economic time series from the Federal Reserve Bank of St. Louis. Load observations for a period, e.g. 2015:2025.',
  treasury: 'US federal finance tables from Fiscal Data. Load observations for a period, e.g. 2020:2025.', oecd: 'OECD statistical datasets. Load observations with an optional series key and a period, e.g. 2015:2025; without a period only the latest value of each series is loaded.',
};

function OfficialSourcesPage() {
  const { user } = useSignedIn();
  const [provider, setProvider] = useState<OfficialProvider>('clinical_trials');
  const [query, setQuery] = useState('');
  const [availability, setAvailability] = useState<Partial<Record<OfficialProvider, boolean>>>({});
  const [results, setResults] = useState<OfficialSearch | null>(null);
  const [dataset, setDataset] = useState<OfficialRecord | null>(null);
  const [sourceId, setSourceId] = useState('2');
  const [countries, setCountries] = useState('');
  const [period, setPeriod] = useState('');
  const [taxonomy, setTaxonomy] = useState('us-gaap');
  const [concept, setConcept] = useState('');
  const [seriesKey, setSeriesKey] = useState('');
  const [destinations, setDestinations] = useState<WorkbookDestination[]>([]);
  const [destination, setDestination] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [searched, setSearched] = useState<{ provider: OfficialProvider; query: string; source_id: string } | null>(null);
  const searchRevision = useRef(0);

  const reloadDestinations = async () => {
    const data = await api<{ workbooks: WorkbookDestination[] }>('/api/workbooks'); setDestinations(data.workbooks);
  };
  useEffect(() => {
    if (!user) return;
    api<Partial<Record<OfficialProvider, boolean>>>('/api/official-sources/availability').then(setAvailability).catch((e) => setError((e as Error).message));
    reloadDestinations().catch((e) => setError((e as Error).message));
  }, [user]);

  const search = async (page = 1, token?: string, next = false) => {
    const request = next && searched ? searched : { provider, query, source_id: sourceId };
    if (!request.query.trim()) return;
    const revision = ++searchRevision.current;
    setBusy(true); setError(''); setSaved('');
    try {
      const data = await api<OfficialSearch>('/api/official-sources/search', { method: 'POST', body: JSON.stringify({ ...request, page, ...(token ? { page_token: token } : {}) }) });
      if (revision !== searchRevision.current) return;
      setResults(data); setSearched(request); setDataset(null);
    } catch (e) { if (revision === searchRevision.current) setError((e as Error).message); }
    finally { if (revision === searchRevision.current) setBusy(false); }
  };
  const loadData = async (locator: OfficialLocator) => {
    setBusy(true); setError(''); setSaved('');
    try { setDataset(await api<OfficialRecord>('/api/official-sources/data', { method: 'POST', body: JSON.stringify(locator) })); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const save = async (record: OfficialRecord) => {
    setBusy(true); setError(''); setSaved('');
    try {
      const workbook = destinations.find((item) => item.id === destination);
      const data = await api<{ duplicate: boolean; workbook_revision: number | null }>('/api/official-sources/save', { method: 'POST', body: JSON.stringify({ locator: record.locator, ...(workbook ? { workbook_id: workbook.id, workbook_revision: workbook.revision } : {}) }) });
      if (workbook && data.workbook_revision) setDestinations((items) => items.map((item) => item.id === workbook.id ? { ...item, revision: data.workbook_revision! } : item));
      setSaved(workbook ? `Saved to your Library and ${workbook.title}.` : data.duplicate ? 'This exact snapshot is already in your Library.' : 'Saved an official-record snapshot to your Library.');
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const renderRecord = (record: OfficialRecord) => <Card key={JSON.stringify(record.locator)} className="p-5">
    <p className="text-xs font-semibold uppercase tracking-wide text-muted">{record.kind.replaceAll('_', ' ')} · {record.publisher}</p>
    <h2 className="mt-2 text-lg font-bold"><a href={record.url} target="_blank" rel="noreferrer" className="hover:text-brand hover:underline">{record.title}</a></h2>
    {!!record.dates.length && <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs">{record.dates.map((item) => <div key={item.label}><dt className="font-semibold text-ink-2">{item.label}</dt><dd className="mt-0.5 text-muted">{item.value}</dd></div>)}</dl>}
    {record.warnings.filter((warning) => warning === OPENFDA_NOTE).map((warning) => <p key={warning} className="mt-3 text-xs font-semibold text-ink-2">{warning}</p>)}
    {record.summary && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{record.summary.slice(0, 1000)}{record.summary.length > 1000 ? '…' : ''}</p>}
    {record.trial && <div className="mt-4 space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <section><h3 className="text-sm font-bold">Registered outcomes</h3>{record.trial.registered_outcomes.length ? <ul className="mt-2 space-y-2">{record.trial.registered_outcomes.map((outcome, index) => <li key={index} className="rounded-lg bg-soft p-3 text-xs"><p className="font-semibold">{outcome.kind}: {outcome.measure || 'Measure not supplied'}</p><p className="mt-1 whitespace-pre-wrap">{outcome.description}</p>{outcome.time_frame && <p className="mt-1 text-muted">Time frame: {outcome.time_frame}</p>}</li>)}</ul> : <p className="mt-2 text-xs text-muted">No registered outcomes returned in this snapshot.</p>}</section>
        <section><h3 className="text-sm font-bold">Posted outcome descriptions</h3><p className="mt-1 text-xs text-muted">Open the registry for numerical results, groups and analyses.</p>{record.trial.reported_outcomes.length ? <ul className="mt-2 space-y-2">{record.trial.reported_outcomes.map((outcome, index) => <li key={index} className="rounded-lg bg-soft p-3 text-xs"><p className="font-semibold">{outcome.kind || 'Unspecified type'}: {outcome.title || 'Title not supplied'}</p><p className="mt-1 whitespace-pre-wrap">{outcome.description}</p>{outcome.time_frame && <p className="mt-1 text-muted">Time frame: {outcome.time_frame}</p>}{outcome.units && <p className="mt-1 text-muted">Units: {outcome.units}</p>}{outcome.population && <p className="mt-1 text-muted">Population: {outcome.population}</p>}</li>)}</ul> : <p className="mt-2 text-xs text-muted">No posted outcome descriptions returned. This does not establish whether results exist elsewhere.</p>}</section>
      </div>
      <section><h3 className="text-sm font-bold">Registry-linked publications</h3><p className="mt-1 text-xs text-muted">Reference types come from the registry. A background or automatically derived reference is not necessarily a results paper.</p>{record.trial.references.length ? <ul className="mt-2 space-y-2">{record.trial.references.map((reference, index) => <li key={index} className="rounded-lg border border-line p-3 text-xs"><span className="font-semibold">{reference.kind}: </span>{reference.citation || 'Citation not supplied'}{reference.url && <a href={reference.url} target="_blank" rel="noreferrer" className="ml-2 font-semibold text-brand underline">PubMed {reference.pmid}</a>}</li>)}</ul> : <p className="mt-2 text-xs text-muted">No linked publications returned in this snapshot.</p>}</section>
    </div>}
    <details className="mt-3 text-sm"><summary className="cursor-pointer font-semibold">Source details and limitations</summary><div className="mt-2 space-y-2">{record.warnings.map((warning) => <p key={warning} className="text-xs text-muted">{warning}</p>)}<pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-soft p-3 text-xs">{JSON.stringify(record.metadata, null, 2)}</pre></div></details>
    <div className="mt-4 flex flex-wrap gap-2"><Button disabled={busy} onClick={() => save(record)}>{destination ? 'Save to Library and workbook' : 'Save to Library'}</Button><Button onClick={() => download('official-source.json', JSON.stringify({ record, downloaded_at: new Date().toISOString() }, null, 2), 'application/json')}>Download source JSON</Button>{record.kind === 'trial_registration' && !record.trial && <Button disabled={busy} onClick={() => loadData(record.locator)}>Load registration details</Button>}{record.kind === 'indicator_metadata' && <Button disabled={busy} onClick={() => loadData({ ...record.locator, countries: countries.trim() || 'all', ...(period.trim() ? { date: period.trim() } : {}), page: 1 })}>Load observations</Button>}{OFFICIAL_DATA_KINDS.includes(record.kind) && record.kind !== 'indicator_metadata' && <Button disabled={busy} onClick={() => loadData({ ...record.locator, ...(period.trim() ? { date: period.trim() } : {}), ...(record.locator.provider === 'oecd' && seriesKey.trim() ? { key: seriesKey.trim() } : {}), page: 1 })}>Load observations</Button>}</div>
  </Card>;

  return <AppFrame wide title="Official sources" subtitle="Find trial registrations and other official records, and keep their provenance with your work.">
    <SourcesNav />
    <Card className="p-5">
      <form onSubmit={(event) => { event.preventDefault(); void search(); }} className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]">
          <label className="block text-sm font-semibold">Source<select className={`${inputClass} mt-1`} value={provider} disabled={busy} onChange={(event) => { setProvider(event.target.value as OfficialProvider); setQuery(''); setResults(null); setDataset(null); setError(''); setSaved(''); searchRevision.current += 1; }}>{Object.entries(OFFICIAL_LABELS).filter(([id]) => id === 'clinical_trials' || id in availability).map(([id, label]) => <option key={id} value={id}>{label}{availability[id as OfficialProvider] === false ? ' — not connected' : ''}</option>)}</select></label>
          <label className="block text-sm font-semibold">{provider === 'sec' ? 'Company CIK' : 'Search'}<input className={`${inputClass} mt-1`} value={query} onChange={(event) => setQuery(event.target.value)} maxLength={500} placeholder={examples[provider]} required /></label>
          <Button type="submit" variant="primary" className="self-end" disabled={busy || !query.trim() || !availability[provider]}>{busy ? 'Loading…' : 'Search'}</Button>
        </div>
        {provider === 'clinical_trials' && <p className="text-xs text-muted">ClinicalTrials.gov registrations describe reported study plans and status. A registration is distinct from a published study or an effectiveness finding.</p>}
        {provider === 'world_bank' && <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-xs font-semibold">Dataset source ID<input className={`${inputClass} mt-1`} value={sourceId} onChange={(event) => setSourceId(event.target.value)} maxLength={5} placeholder="2 = World Development Indicators" /><span className="mt-1 block font-normal text-muted">2 = World Development Indicators</span></label>
          <label className="block text-xs font-semibold">Area codes (optional)<input className={`${inputClass} mt-1`} value={countries} onChange={(event) => setCountries(event.target.value)} placeholder="All areas; or BRA;NOR;IND" /><span className="mt-1 block font-normal text-muted">Source filters may include countries or aggregates.</span></label>
          <label className="block text-xs font-semibold">Observation period (optional)<input className={`${inputClass} mt-1`} value={period} onChange={(event) => setPeriod(event.target.value)} placeholder="2020:2025 or 2025Q1:2025Q4" /></label>
        </div>}
        {provider === 'sec' && <div className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
          <label className="block text-xs font-semibold">Taxonomy<input className={`${inputClass} mt-1`} value={taxonomy} onChange={(event) => setTaxonomy(event.target.value)} placeholder="us-gaap or ifrs-full" /></label>
          <label className="block text-xs font-semibold">XBRL concept (optional)<input className={`${inputClass} mt-1`} value={concept} onChange={(event) => setConcept(event.target.value)} placeholder="e.g. Revenues or Assets" /></label>
          <Button className="self-end" disabled={busy || !availability.sec || !concept || !query} onClick={() => loadData({ provider: 'sec', id: query.trim(), taxonomy, concept, page: 1 })}>Load reported facts</Button>
          <p className="text-xs text-muted sm:col-span-3">SEC submissions cover SEC filers. Search retrieves recent filing metadata; concept facts retain every reported unit, period and filing date.</p>
        </div>}
        {NOTES[provider] && <p className="text-xs text-muted">{NOTES[provider]}</p>}
        {(provider === 'fred' || provider === 'treasury' || provider === 'oecd') && <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-xs font-semibold">Observation period (optional)<input className={`${inputClass} mt-1`} value={period} onChange={(event) => setPeriod(event.target.value)} placeholder="2015:2025" /></label>
          {provider === 'oecd' && <label className="block text-xs font-semibold sm:col-span-2">Series key (optional)<input className={`${inputClass} mt-1`} value={seriesKey} onChange={(event) => setSeriesKey(event.target.value)} maxLength={300} placeholder="e.g. AUS+FRA........." /><span className="mt-1 block font-normal text-muted">Dimension codes joined by dots, from the OECD Data Explorer; empty loads every series.</span></label>}
        </div>}
        {availability[provider] === false && <p role="status" className="text-sm text-muted">This source is not connected on this deployment. Other sources remain available.</p>}
      </form>
    </Card>
    <div className="my-5 flex flex-wrap items-end gap-3"><label className="min-w-64 flex-1 text-sm font-semibold">Save destination<select className={`${inputClass} mt-1`} value={destination} onChange={(event) => setDestination(event.target.value)} disabled={busy}><option value="">My Library</option>{destinations.map((item) => <option key={item.id} value={item.id}>Library + {item.title}{item.project_id ? ' (shared)' : ''}</option>)}</select></label><Button disabled={busy} onClick={() => reloadDestinations().catch((e) => setError((e as Error).message))}>Refresh workbooks</Button><Link href="/workbooks?new=1" className="pb-3 text-sm font-semibold text-brand">Create a workbook</Link></div>
    <p className="mb-5 text-xs text-muted">Searches are not saved. Saving creates a source snapshot in your Library; a selected shared workbook also makes that snapshot visible to its project members. Project evidence can import the saved Library source.</p>
    {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {saved && <p role="status" className="mb-4 rounded-xl bg-soft p-4 text-sm">{saved} {destination && <Link href={`/workbooks/${destination}`} className="font-semibold text-brand">Open workbook</Link>}</p>}
    {dataset && <div className="mb-6 space-y-3">{renderRecord(dataset)}
      {dataset.table && <><div className="flex flex-wrap items-center gap-2"><Button onClick={() => download('official-observations.csv', toCsv([dataset.table!.columns, ...dataset.table!.rows]), 'text/csv')}>Download this page as CSV</Button><span className="text-xs text-muted">Missing values are empty in CSV. Source metadata is available in the JSON download.</span></div><div className="max-h-[480px] overflow-auto rounded-xl border border-line"><table className="min-w-full text-xs"><thead className="sticky top-0 bg-soft"><tr>{dataset.table.columns.map((column) => <th key={column} className="whitespace-nowrap px-3 py-2 text-left font-semibold">{column.replaceAll('_', ' ')}</th>)}</tr></thead><tbody>{dataset.table.rows.map((row, index) => <tr key={index} className="border-t border-line-2">{row.map((value, at) => <td key={at} className="whitespace-nowrap px-3 py-2 tabular-nums">{value === null ? 'Missing / unknown' : value}</td>)}</tr>)}</tbody></table></div><div className="flex gap-2"><Button disabled={busy || Number(dataset.metadata.page) <= 1} onClick={() => loadData({ ...dataset.locator, page: Number(dataset.metadata.page) - 1 })}>Previous data page</Button><Button disabled={busy || Number(dataset.metadata.page) >= Number(dataset.metadata.pages)} onClick={() => loadData({ ...dataset.locator, page: Number(dataset.metadata.page) + 1 })}>Next data page</Button></div></>}
    </div>}
    {results && <div className="space-y-3"><p className="text-sm text-muted">{results.records.length} records on this page{results.total !== null ? ` · ${results.total.toLocaleString()} in the returned scope` : ''} · Retrieved {new Date(results.fetched_at).toLocaleString()}</p>{results.warnings.map((warning) => <p key={warning} className="text-xs text-muted">{warning}</p>)}{!results.records.length && <Card className="p-6 text-sm text-muted">No records on this page. Change the query or inspect another available catalogue page.</Card>}{results.records.map(renderRecord)}{(results.next_page || results.next_token) && <Button disabled={busy} onClick={() => search(results.next_page || 1, results.next_token || undefined, true)}>Next results page</Button>}</div>}
  </AppFrame>;
}

export default function Page() { return <Suspense fallback={null}><OfficialSourcesPage /></Suspense>; }
