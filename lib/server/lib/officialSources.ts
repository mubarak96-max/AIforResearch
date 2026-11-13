/** Official API adapters. Registry entries, reports, datasets and filing metadata remain distinct.
 * ClinicalTrials: https://clinicaltrials.gov/data-api/api
 * World Bank: https://datahelpdesk.worldbank.org/knowledgebase/articles/898581-api-basic-call-structures
 * ReliefWeb: https://apidoc.reliefweb.int/read/resources/reports/
 * SEC: https://www.sec.gov/search-filings/edgar-application-programming-interfaces
 * openFDA: https://open.fda.gov/apis/ (CC0; 240 requests a minute and 1,000 a day per IP without a key, 120,000 a day with OPENFDA_API_KEY)
 * FRED: https://fred.stlouisfed.org/docs/api/fred/ (free key FRED_API_KEY, skipped until set; 120 requests a minute)
 * US Treasury Fiscal Data: https://fiscaldata.treasury.gov/api-documentation/ (no key; public domain)
 * OECD SDMX API: https://www.oecd.org/en/data/insights/data-explainers/2024/09/api.html (no key; CC BY 4.0; throttled per IP)
 * USPTO Open Data Portal, which replaced the PatentsView search API in March 2026: https://data.uspto.gov/apis/getting-started
 *   (PATENTSVIEW_API_KEY holds the ODP key, sent as X-API-KEY; skipped until set)
 */
import { HTTPException } from 'hono/http-exception';
import { C, col, db } from '../firebase.js';
import { fetchSource, net, SourceError } from './sources/http.js';
import { OPENFDA_NOTE, PATENT_NOTE, type OfficialLocator, type OfficialProvider, type OfficialRecord, type OfficialSearch } from '../../officialSources.js';

/** SEC EDGAR asks every client to identify itself with a name and contact email (sec.gov/os/accessing-edgar-data). */
export const SEC_USER_AGENT = 'AIforResearch support@aiforresearch.app';
/** ReliefWeb's pre-approved application name, sent as ?appname= on every request (apidoc.reliefweb.int). No API key is used. */
export const RELIEFWEB_APPNAME = 'mutesasira-aiforresearch-nQO9kmOfXv';
export const officialSettings = () => ({ reliefwebAppname: RELIEFWEB_APPNAME, secUserAgent: SEC_USER_AGENT });
const text = (value: unknown) => typeof value === 'string' ? value : '';
const date = (label: string, value: unknown) => text(value) ? [{ label, value: text(value) }] : [];
const number = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;
const isoNow = () => new Date().toISOString();
const result = (records: OfficialRecord[], source_url: string, total: number | null, next_page: number | null = null, next_token: string | null = null, warnings: string[] = []): OfficialSearch => ({ records, source_url, total, next_page, next_token, warnings, fetched_at: isoNow() });
const notFound = () => new HTTPException(404, { message: 'This official record was not found.' });
const recordText = (record: OfficialRecord) => [record.title, `Record type: ${record.kind}`, `Source: ${record.publisher}`, `URL: ${record.url}`, ...record.dates.map((item) => `${item.label}: ${item.value}`), record.summary, ...record.warnings, JSON.stringify(record.metadata, null, 2), ...(record.trial ? [JSON.stringify(record.trial, null, 2)] : []), ...(record.table ? [record.table.columns.join('\t'), ...record.table.rows.map((row) => row.map((value) => value === null ? '[missing]' : String(value)).join('\t'))] : [])].filter(Boolean).join('\n\n');
const complete = (record: OfficialRecord): OfficialRecord => ({ ...record, text: recordText(record) });

export function trialRecord(study: any, details = true): OfficialRecord {
  const p = study?.protocolSection ?? {};
  const identification = p.identificationModule ?? {}; const status = p.statusModule ?? {}; const design = p.designModule ?? {};
  const id = text(identification.nctId);
  if (!/^NCT\d{8}$/.test(id)) throw new SourceError('ClinicalTrials.gov', 'The registry returned an invalid study identifier.');
  const objects = (value: unknown): Record<string, unknown>[] => Array.isArray(value) ? value.filter((item) => item && typeof item === 'object' && !Array.isArray(item)) : [];
  const trial: OfficialRecord['trial'] = details ? {
    registered_outcomes: (['primary', 'secondary', 'other'] as const).flatMap((kind) => objects(p.outcomesModule?.[`${kind}Outcomes`]).map((outcome) => ({ kind, measure: text(outcome.measure), description: text(outcome.description), time_frame: text(outcome.timeFrame) }))),
    reported_outcomes: objects(study?.resultsSection?.outcomeMeasuresModule?.outcomeMeasures).map((outcome) => ({ kind: text(outcome.type), title: text(outcome.title), description: text(outcome.description), time_frame: text(outcome.timeFrame), population: text(outcome.populationDescription), units: text(outcome.unitOfMeasure) })),
    references: objects(p.referencesModule?.references).map((reference) => {
      const pmid = /^[1-9]\d{0,11}$/.test(text(reference.pmid)) ? text(reference.pmid) : null;
      return { pmid, url: pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : null, kind: text(reference.type) || 'UNSPECIFIED', citation: text(reference.citation) };
    }),
  } : undefined;
  return complete({ locator: { provider: 'clinical_trials', id }, title: text(identification.officialTitle || identification.briefTitle) || id, url: `https://clinicaltrials.gov/study/${id}`, kind: 'trial_registration', publisher: 'ClinicalTrials.gov',
    summary: text(p.descriptionModule?.briefSummary), text: '', publication_date: null, updated_at: text(status.lastUpdatePostDateStruct?.date) || null,
    dates: [...date('Registration first posted', status.studyFirstPostDateStruct?.date), ...date('Registration last updated', status.lastUpdatePostDateStruct?.date), ...date('Study start (reported)', status.startDateStruct?.date), ...date('Primary completion (reported)', status.primaryCompletionDateStruct?.date), ...date('Results first posted', status.resultsFirstPostDateStruct?.date)],
    metadata: { nct_id: id, status: status.overallStatus ?? null, study_type: design.studyType ?? null, phases: design.phases ?? [], enrollment: design.enrollmentInfo ?? null, sponsor: p.sponsorCollaboratorsModule?.leadSponsor ?? null, conditions: p.conditionsModule?.conditions ?? [], has_posted_results: typeof study.hasResults === 'boolean' ? study.hasResults : null, start_date_type: status.startDateStruct?.type ?? null, primary_completion_type: status.primaryCompletionDateStruct?.type ?? null },
    ...(trial ? { trial } : {}),
    warnings: ['A registry entry is not a peer-reviewed publication or proof of an intervention effect. Planned and actual dates/enrollment remain as reported.', details ? 'Registered outcomes and descriptions of posted outcome measures are kept separately. Numerical results, group denominators and statistical analyses remain in the original registry; these descriptions are not effect estimates. Reference types are registry-reported: background and automatically derived references do not establish that a paper reports this trial’s results. Publication full text is not imported. Missing outcomes or references do not establish that none exist.' : 'Search previews omit outcome details and publication links. Load registration details to inspect them before saving or downloading.'] });
}
export async function searchTrials(query: string, pageToken?: string) {
  const url = new URL('https://clinicaltrials.gov/api/v2/studies');
  url.searchParams.set('query.term', query); url.searchParams.set('pageSize', '20'); url.searchParams.set('format', 'json'); url.searchParams.set('countTotal', 'true');
  url.searchParams.set('fields', 'NCTId,BriefTitle,OfficialTitle,OverallStatus,BriefSummary,StudyType,Phase,EnrollmentCount,EnrollmentType,LeadSponsorName,Condition,StudyFirstPostDate,LastUpdatePostDate,StartDate,PrimaryCompletionDate');
  if (pageToken) url.searchParams.set('pageToken', pageToken);
  const data = await fetchSource<any>(url, { source: 'ClinicalTrials.gov', pace: { key: 'clinical-trials', ms: 300 } });
  if (!data || !Array.isArray(data.studies)) throw new SourceError('ClinicalTrials.gov', 'The registry returned an unexpected response.');
  return result(data.studies.map((study: unknown) => trialRecord(study, false)), url.toString(), number(data.totalCount), null, text(data.nextPageToken) || null, ['Coverage is limited to entries registered in ClinicalTrials.gov.']);
}

function worldBankRows(data: any): { meta: any; items: any[] } {
  if (!Array.isArray(data) || !Array.isArray(data[1])) {
    const message = data?.[0]?.message?.[0]?.value;
    throw new SourceError('World Bank', message ? `World Bank: ${text(message).slice(0, 250)}` : 'No indicator records were returned. Check the indicator, source and date range.', 422);
  }
  return { meta: data[0] ?? {}, items: data[1] };
}
export function indicatorRecord(item: any): OfficialRecord {
  const id = text(item.id); const source = text(item.source?.id);
  if (!id || !source) throw new SourceError('World Bank', 'Indicator metadata is missing its identifier or source.');
  return complete({ locator: { provider: 'world_bank', id, source_id: source }, title: text(item.name) || id, url: `https://data.worldbank.org/indicator/${encodeURIComponent(id)}`, kind: 'indicator_metadata', publisher: 'World Bank', summary: text(item.sourceNote), text: '', publication_date: null, updated_at: null, dates: [],
    metadata: { indicator: id, unit: text(item.unit) || null, source_id: source, source_name: text(item.source?.value), source_organization: text(item.sourceOrganization), topics: item.topics ?? [] }, warnings: ['Indicator definitions, units and coverage vary by dataset. Empty unit metadata is preserved as unknown; consult the definition before comparison.'] });
}
export async function searchIndicators(query: string, source = '2', page = 1) {
  const exact = /^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)+$/.test(query);
  const url = new URL(exact ? `https://api.worldbank.org/v2/indicator/${encodeURIComponent(query)}` : `https://api.worldbank.org/v2/source/${source}/indicator`);
  url.searchParams.set('format', 'json'); url.searchParams.set('source', source); url.searchParams.set('per_page', exact ? '50' : '2000'); url.searchParams.set('page', String(page));
  const data = worldBankRows(await fetchSource(url, { source: 'World Bank' }));
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = data.items.filter((item) => exact || terms.every((term) => `${item.id} ${item.name} ${item.sourceNote}`.toLowerCase().includes(term)));
  return result(matches.slice(0, 100).map(indicatorRecord), url.toString(), matches.length, Number(data.meta.pages) > page ? page + 1 : null, null,
    [`Searching source ${source} only (source 2 is World Development Indicators). ${Number(data.meta.pages) > page ? 'Additional catalogue pages are available; this is not an exhaustive keyword result.' : 'Catalogue page loaded.'}`, ...(matches.length > 100 ? ['Showing the first 100 matches. Refine the search.'] : [])]);
}
export async function indicatorData(locator: OfficialLocator): Promise<OfficialRecord> {
  const source = locator.source_id || '2';
  const metaUrl = new URL(`https://api.worldbank.org/v2/indicator/${encodeURIComponent(locator.id)}?format=json&source=${source}`);
  const metadata = worldBankRows(await fetchSource(metaUrl, { source: 'World Bank' })).items.find((item) => String(item.source?.id) === source);
  if (!metadata) throw notFound();
  const base = indicatorRecord(metadata); const page = locator.page || 1;
  const url = new URL(`https://api.worldbank.org/v2/country/${locator.countries || 'all'}/indicator/${encodeURIComponent(locator.id)}`);
  url.searchParams.set('format', 'json'); url.searchParams.set('source', source); url.searchParams.set('per_page', '200'); url.searchParams.set('page', String(page)); url.searchParams.set('footnote', 'y');
  if (locator.date) url.searchParams.set('date', locator.date);
  const data = worldBankRows(await fetchSource(url, { source: 'World Bank' }));
  return complete({ ...base, locator: { ...locator, source_id: source, countries: locator.countries || 'all', page }, kind: 'indicator_data', updated_at: text(data.meta.lastupdated) || null,
    dates: date('Dataset last updated', data.meta.lastupdated), metadata: { ...base.metadata, request_url: url.toString(), requested_period: locator.date || 'all available', area_filter: locator.countries || 'all', page, pages: Number(data.meta.pages) || 1, total_observations: Number(data.meta.total) || 0, returned_observations: data.items.length },
    table: { columns: ['indicator', 'area_code', 'area', 'period', 'value', 'unit', 'decimal', 'observation_status', 'footnote'], rows: data.items.map((row) => [text(row.indicator?.id), text(row.countryiso3code || row.country?.id), text(row.country?.value), text(row.date), number(row.value), text(row.unit || metadata.unit) || null, number(row.decimal), text(row.obs_status), text(row.footnote)]) },
    warnings: [...base.warnings, `Page ${page} of ${Number(data.meta.pages) || 1}; ${data.items.length} observations. Missing values are retained, never replaced with zero. Areas may include aggregates; the API area filter is not a user access restriction.`] });
}

const reliefAppname = () => RELIEFWEB_APPNAME;
export function reliefRecord(item: any): OfficialRecord {
  const f = item?.fields ?? {}; const id = String(item?.id ?? '');
  if (!/^\d+$/.test(id)) throw new SourceError('ReliefWeb', 'The report has no valid identifier.');
  const url = text(f.url);
  return complete({ locator: { provider: 'reliefweb', id }, title: text(f.title) || `ReliefWeb report ${id}`, url: /^https:\/\/reliefweb\.int\//i.test(url) ? url : `https://reliefweb.int/node/${id}`, kind: 'humanitarian_report', publisher: (f.source ?? []).map((s: any) => text(s.name)).filter(Boolean).join('; ') || 'ReliefWeb', summary: text(f.body), text: '', publication_date: text(f.date?.original) || null, updated_at: text(f.date?.changed) || null,
    dates: [...date('Original publication', f.date?.original), ...date('Added to ReliefWeb', f.date?.created), ...date('ReliefWeb last changed', f.date?.changed)], metadata: { source: f.source ?? [], countries: f.country ?? [], languages: f.language ?? [], formats: f.format ?? [] }, warnings: ['ReliefWeb provides the report record and body. Attachments are not imported. Reuse terms remain with ReliefWeb and the original publisher.'] });
}
export async function searchRelief(query: string, page = 1) {
  const url = new URL('https://api.reliefweb.int/v2/reports'); url.searchParams.set('appname', reliefAppname());
  const data = await fetchSource<any>(url, { source: 'ReliefWeb', method: 'POST', body: { query: { value: query, fields: ['title', 'body'] }, filter: { field: 'status', value: 'published' }, fields: { include: ['title', 'url', 'body', 'date', 'source', 'country', 'language', 'format'] }, limit: 20, offset: (page - 1) * 20, sort: ['date.original:desc'] }, pace: { key: 'reliefweb', ms: 300 } });
  if (!data || !Array.isArray(data.data)) throw new SourceError('ReliefWeb', 'The report service returned an unexpected response.');
  return result(data.data.map(reliefRecord), 'https://reliefweb.int/updates', number(data.totalCount), Number(data.totalCount) > page * 20 ? page + 1 : null);
}

/** At most five network attempts per second across app instances, with no automatic retries. */
async function secFetch(url: string): Promise<Record<string, any> | null> {
  const userAgent = SEC_USER_AGENT;
  const window = Math.floor(Date.now() / 1000);
  await db().runTransaction(async (tx) => {
    const ref = col(C.rateLimits).doc(`official-sec-${window}`); const previous = await tx.get(ref); const count = Number(previous.get('count') ?? 0);
    if (count >= 5) throw new HTTPException(429, { message: 'SEC request capacity is busy. Try again in a moment.' });
    tx.set(ref, { count: count + 1, expires_at: new Date((window + 120) * 1000) });
  });
  try {
    const response = await net.fetch(url, { headers: { 'User-Agent': userAgent, Accept: 'application/json' }, signal: AbortSignal.timeout(12_000) });
    if (response.status === 404) return null;
    if (!response.ok) throw new SourceError('SEC EDGAR', `SEC EDGAR answered ${response.status}.`, response.status === 429 ? 429 : 503);
    const body: unknown = await response.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new SourceError('SEC EDGAR', 'The filing service returned an unexpected response.');
    return body as Record<string, any>;
  } catch (error) {
    if (error instanceof SourceError) throw error;
    throw new SourceError('SEC EDGAR', 'The filing service did not answer. Try again later.');
  }
}
export function filingRecords(data: any, cik: string): OfficialRecord[] {
  const filings = data?.filings?.recent ?? {};
  if (!Array.isArray(filings.accessionNumber) || filings.accessionNumber.some((value: unknown) => typeof value !== 'string' || !/^\d{10}-\d{2}-\d{6}$/.test(value))) throw new SourceError('SEC EDGAR', 'The filing index returned an unexpected response.');
  return filings.accessionNumber.map((accession: string, index: number) => {
    const file = text(filings.primaryDocument?.[index]); const company = text(data.name); const form = text(filings.form?.[index]);
    const url = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(file) ? `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accession.replaceAll('-', '')}/${file}` : `https://www.sec.gov/edgar/browse/?CIK=${Number(cik)}`;
    return complete({ locator: { provider: 'sec', id: cik, accession }, title: `${company} — ${form} — ${text(filings.reportDate?.[index]) || text(filings.filingDate?.[index])}`, url, kind: 'filing_metadata', publisher: company || 'SEC EDGAR', summary: text(filings.primaryDocDescription?.[index]), text: '', publication_date: text(filings.filingDate?.[index]) || null, updated_at: null,
      dates: [...date('Filed', filings.filingDate?.[index]), ...date('Reporting period end', filings.reportDate?.[index]), ...date('Accepted by EDGAR', filings.acceptanceDateTime?.[index])], metadata: { cik, accession, form, primary_document: file, is_xbrl: Boolean(filings.isXBRL?.[index]), tickers: data.tickers ?? [], company_name: company }, warnings: ['This is a filing index record, not the filing text. Open the original filing before quoting its contents. Only the submissions API recent-file list is included; older archive files are not searched.'] });
  });
}
export async function searchFilings(cik: string, page = 1) {
  const id = cik.padStart(10, '0'); const url = `https://data.sec.gov/submissions/CIK${id}.json`; const data = await secFetch(url);
  if (!data) throw notFound(); const records = filingRecords(data, id);
  return result(records.slice((page - 1) * 20, page * 20), url, records.length, records.length > page * 20 ? page + 1 : null);
}
export async function companyConcept(locator: OfficialLocator): Promise<OfficialRecord> {
  const cik = locator.id.padStart(10, '0'); const taxonomy = locator.taxonomy || 'us-gaap'; const concept = locator.concept!; const page = locator.page || 1;
  const url = `https://data.sec.gov/api/xbrl/companyconcept/CIK${cik}/${taxonomy}/${concept}.json`; const data = await secFetch(url);
  if (!data) throw notFound();
  if (!data.units || typeof data.units !== 'object' || Array.isArray(data.units) || Object.values(data.units).some((entries) => !Array.isArray(entries) || entries.some((item) => !item || typeof item !== 'object' || Array.isArray(item)))) throw new SourceError('SEC EDGAR', 'The financial concept returned an unexpected response.');
  const facts = Object.entries(data.units).flatMap(([unit, entries]) => (entries as any[]).map((item) => ({ ...item, unit })));
  const selected = facts.slice((page - 1) * 100, page * 100);
  return complete({ locator: { ...locator, id: cik, taxonomy, page }, title: `${text(data.entityName)} — ${text(data.label) || concept}`, url, kind: 'financial_facts', publisher: text(data.entityName) || 'SEC EDGAR', summary: text(data.description), text: '', publication_date: null, updated_at: null, dates: [],
    metadata: { cik, taxonomy, concept, company_name: text(data.entityName), total_facts: facts.length, page, pages: Math.max(1, Math.ceil(facts.length / 100)) },
    table: { columns: ['value', 'unit', 'period_start', 'period_end', 'filed', 'form', 'accession', 'fiscal_year', 'fiscal_period', 'frame'], rows: selected.map((item) => [number(item.val), item.unit, text(item.start), text(item.end), text(item.filed), text(item.form), text(item.accn), number(item.fy), text(item.fp), text(item.frame)]) },
    warnings: [`Page ${page} of ${Math.max(1, Math.ceil(facts.length / 100))}. Facts retain reported units, periods and filing dates. Duplicate periods, amended filings and alternative units are not collapsed. No currency conversion or investment recommendation is performed.`, 'Coverage is limited to concepts disclosed by SEC filers using the API-supported taxonomies; custom tags and complete global filing coverage are not included.'] });
}

/** Refetch by validated identifier for saves; never trust client-supplied evidence text. */
export async function officialRecord(locator: OfficialLocator): Promise<OfficialRecord> {
  const more = await moreOfficialRecord(locator);
  if (more) return more;
  if (locator.provider === 'clinical_trials') { const data = await fetchSource(`https://clinicaltrials.gov/api/v2/studies/${locator.id}`, { source: 'ClinicalTrials.gov' }); if (!data) throw notFound(); return trialRecord(data); }
  if (locator.provider === 'world_bank') {
    if (locator.countries || locator.date || locator.page) return indicatorData(locator);
    const data = worldBankRows(await fetchSource(`https://api.worldbank.org/v2/indicator/${encodeURIComponent(locator.id)}?format=json&source=${locator.source_id || '2'}`, { source: 'World Bank' }));
    const match = data.items.find((item) => String(item.source?.id) === (locator.source_id || '2')); if (!match) throw notFound(); return indicatorRecord(match);
  }
  if (locator.provider === 'reliefweb') { const url = new URL(`https://api.reliefweb.int/v2/reports/${locator.id}`); url.searchParams.set('appname', reliefAppname()); const data = await fetchSource<any>(url, { source: 'ReliefWeb' }); if (!data?.data?.[0]) throw notFound(); return reliefRecord(data.data[0]); }
  if (locator.concept) return companyConcept(locator);
  const data = await secFetch(`https://data.sec.gov/submissions/CIK${locator.id.padStart(10, '0')}.json`);
  const record = filingRecords(data, locator.id.padStart(10, '0')).find((item) => item.locator.accession === locator.accession); if (!record) throw notFound(); return record;
}

// ------------------------------------------------------------------ openFDA, FRED, Treasury, OECD, USPTO

/** Keys are read when used, so a key added to the environment takes effect without a code change. */
const envKey = (name: string) => (process.env[name] ?? '').trim();
/** Which of the keyed providers can answer on this server (openFDA works without its optional key). */
export const officialKeys = () => ({ fred: Boolean(envKey('FRED_API_KEY')), uspto_patents: Boolean(envKey('PATENTSVIEW_API_KEY')) });
const notConnected = (source: string) => new SourceError(source, `${source} is not connected on this deployment.`, 503);
const clipText = (value: unknown, max: number) => text(value).replace(/\s+/g, ' ').trim().slice(0, max);
const first = (value: unknown) => Array.isArray(value) ? value[0] : value;
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : typeof value === 'string' ? [value] : [];
const ymd = (value: unknown) => { const match = text(value).match(/^(\d{4})(\d{2})(\d{2})$/); return match ? `${match[1]}-${match[2]}-${match[3]}` : text(value) || null; };
/** "2020:2025" (the page's period field) as first and last year. */
const yearRange = (value?: string) => { const match = (value ?? '').match(/^(\d{4})[^:]*(?::(\d{4}))?/); return match ? { from: match[1], to: match[2] ?? null } : null; };
/** A search phrase safe inside openFDA's quoted field search. */
const fdaPhrase = (query: string) => query.replace(/["\\:()[\]{}+]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);

// openFDA ---------------------------------------------------------------

const FDA_BASE = 'https://api.fda.gov';
const FDA_PACE = { key: 'openfda', ms: 260 };
function fdaUrl(path: string, params: Record<string, string>) {
  const url = new URL(`${FDA_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  if (envKey('OPENFDA_API_KEY')) url.searchParams.set('api_key', envKey('OPENFDA_API_KEY'));
  return url;
}
/** The request as shown to people, without the key. */
const publicUrl = (url: URL) => { const copy = new URL(url); copy.searchParams.delete('api_key'); return copy.toString(); };
/** openFDA answers 404 when nothing matches; fetchSource turns that into null. */
const fda = (url: URL) => fetchSource<any>(url, { source: 'openFDA', pace: FDA_PACE });

const LABEL_SECTIONS: [string, string][] = [
  ['boxed_warning', 'Boxed warning'], ['indications_and_usage', 'Indications and usage'], ['dosage_and_administration', 'Dosage and administration'],
  ['contraindications', 'Contraindications'], ['warnings_and_cautions', 'Warnings and precautions'], ['warnings', 'Warnings'], ['adverse_reactions', 'Adverse reactions'],
  ['drug_interactions', 'Drug interactions'], ['use_in_specific_populations', 'Use in specific populations'],
];

export function fdaLabelRecord(item: any, details = true): OfficialRecord {
  const setId = text(item?.set_id);
  if (!/^[0-9a-f-]{36}$/i.test(setId)) throw new SourceError('openFDA', 'The label has no valid set identifier.');
  const o = item.openfda ?? {};
  const brand = strings(o.brand_name).join(', '); const generic = strings(o.generic_name).join(', '); const maker = strings(o.manufacturer_name)[0] ?? '';
  const sections = details ? LABEL_SECTIONS.map(([key, label]) => ({ label, text: clipText(first(item[key]), 4000) })).filter((section) => section.text) : [];
  return complete({ locator: { provider: 'openfda_label', id: setId }, title: [brand || generic || 'Drug label', generic && brand ? `(${generic})` : '', maker ? `— ${maker}` : ''].filter(Boolean).join(' '),
    url: `https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=${setId}`, kind: 'drug_label', publisher: maker || 'openFDA (FDA drug labels)',
    summary: clipText(first(item.indications_and_usage) || first(item.purpose) || first(item.description), 1500), text: '', publication_date: ymd(item.effective_time), updated_at: null,
    dates: date('Label effective', ymd(item.effective_time)),
    metadata: { set_id: setId, label_id: text(item.id), version: text(item.version), brand_name: strings(o.brand_name), generic_name: strings(o.generic_name), manufacturer: strings(o.manufacturer_name), route: strings(o.route), product_type: strings(o.product_type), application_number: strings(o.application_number), has_boxed_warning: Boolean(item.boxed_warning), ...(details ? { sections } : {}) },
    warnings: [OPENFDA_NOTE, 'Labels are submitted by manufacturers as Structured Product Labeling; openFDA may lag DailyMed. Open the label for the current full text.', ...(details ? [] : ['Search previews omit label sections; saving keeps the main sections.'])] });
}
export async function searchFdaLabels(query: string, page = 1) {
  const phrase = fdaPhrase(query);
  const url = fdaUrl('/drug/label.json', { search: `openfda.brand_name:"${phrase}" openfda.generic_name:"${phrase}" openfda.substance_name:"${phrase}"`, limit: '20', skip: String((page - 1) * 20) });
  const data = await fda(url);
  const total = number(data?.meta?.results?.total) ?? 0;
  return result((Array.isArray(data?.results) ? data.results : []).map((item: unknown) => fdaLabelRecord(item, false)), publicUrl(url), total, total > page * 20 ? page + 1 : null, null, [OPENFDA_NOTE]);
}

/** A drug name as an identifier ("insulin glargine" becomes "insulin_glargine"). */
export const drugId = (query: string) => fdaPhrase(query).toLowerCase().replace(/[^a-z0-9.-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 100);
export async function fdaEventRecord(id: string): Promise<OfficialRecord> {
  const drug = id.replace(/_/g, ' ');
  const search = `patient.drug.openfda.generic_name:"${drug}" patient.drug.openfda.brand_name:"${drug}"`;
  const countUrl = fdaUrl('/drug/event.json', { search, count: 'patient.reaction.reactionmeddrapt.exact', limit: '25' });
  const [counts, total] = await Promise.all([fda(countUrl), fda(fdaUrl('/drug/event.json', { search, limit: '1' }))]);
  const rows = (Array.isArray(counts?.results) ? counts.results : []).map((row: any) => [text(row.term), number(row.count)] as (string | number | null)[]);
  if (!rows.length) throw new HTTPException(404, { message: 'No adverse event reports were found for this drug name.' });
  const reports = number(total?.meta?.results?.total);
  return complete({ locator: { provider: 'openfda_event', id }, title: `Adverse event reports naming ${drug} (FAERS)`, url: 'https://open.fda.gov/data/faers/', kind: 'adverse_event_summary', publisher: 'FDA Adverse Event Reporting System via openFDA',
    summary: `The ${rows.length} reactions reported most often in FAERS reports that name ${drug}.${reports !== null ? ` ${reports.toLocaleString('en-US')} reports name the drug.` : ''}`,
    text: '', publication_date: null, updated_at: text(counts?.meta?.last_updated) || null, dates: date('Data last updated', counts?.meta?.last_updated),
    metadata: { drug, request_url: publicUrl(countUrl), reports, page: 1, pages: 1 },
    table: { columns: ['reaction_meddra_pt', 'report_count'], rows },
    warnings: [OPENFDA_NOTE, 'Spontaneous reports do not establish that the drug caused the reaction, and counts are not incidence rates. Reports can be duplicated or incomplete, and one report may name several drugs.'] });
}
export async function searchFdaEvents(query: string) {
  const id = drugId(query);
  const empty = () => result([], 'https://open.fda.gov/apis/drug/event/', 0, null, null, [OPENFDA_NOTE]);
  if (!id) return empty();
  try { const record = await fdaEventRecord(id); return result([record], text(record.metadata.request_url), 1, null, null, [OPENFDA_NOTE]); }
  catch (error) { if (error instanceof HTTPException && error.status === 404) return empty(); throw error; }
}

export function fdaDeviceRecord(item: any): OfficialRecord {
  const k = text(item?.k_number);
  if (!/^(?:K|DEN)\d{5,7}$/i.test(k)) throw new SourceError('openFDA', 'The clearance has no valid 510(k) number.');
  return complete({ locator: { provider: 'openfda_device', id: k }, title: `${text(item.device_name) || 'Device'} — ${k}`, url: `https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID=${encodeURIComponent(k)}`, kind: 'device_clearance', publisher: text(item.applicant) || 'FDA 510(k) database',
    summary: [text(item.decision_description) && `Decision: ${text(item.decision_description)}`, text(item.advisory_committee_description) && `Panel: ${text(item.advisory_committee_description)}`, text(item.product_code) && `Product code ${text(item.product_code)}`].filter(Boolean).join('. '),
    text: '', publication_date: text(item.decision_date) || null, updated_at: null, dates: [...date('Received', item.date_received), ...date('Decision', item.decision_date)],
    metadata: { k_number: k, applicant: text(item.applicant), device_name: text(item.device_name), product_code: text(item.product_code), clearance_type: text(item.clearance_type), decision_code: text(item.decision_code), statement_or_summary: text(item.statement_or_summary) },
    warnings: [OPENFDA_NOTE, 'A 510(k) clearance finds a device substantially equivalent to one already marketed; it is not an FDA approval or evidence of effectiveness.'] });
}
export async function searchFdaDevices(query: string, page = 1) {
  const phrase = fdaPhrase(query);
  const url = fdaUrl('/device/510k.json', { search: `device_name:"${phrase}" applicant:"${phrase}"`, limit: '20', skip: String((page - 1) * 20), sort: 'decision_date:desc' });
  const data = await fda(url);
  const total = number(data?.meta?.results?.total) ?? 0;
  return result((Array.isArray(data?.results) ? data.results : []).map(fdaDeviceRecord), publicUrl(url), total, total > page * 20 ? page + 1 : null, null, [OPENFDA_NOTE]);
}

// FRED ------------------------------------------------------------------

const FRED_NOTE = 'This product uses the FRED® API but is not endorsed or certified by the Federal Reserve Bank of St. Louis. Some series are copyrighted by their sources; check the series notes before reuse.';
const FRED_PACE = { key: 'fred', ms: 550 };
function fredUrl(path: string, params: Record<string, string>) {
  const key = envKey('FRED_API_KEY');
  if (!key) throw notConnected('FRED');
  const url = new URL(`https://api.stlouisfed.org/fred/${path}`);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  url.searchParams.set('api_key', key); url.searchParams.set('file_type', 'json');
  return url;
}
export function fredSeriesRecord(item: any): OfficialRecord {
  const id = text(item?.id);
  if (!/^[A-Za-z0-9_.-]{1,40}$/.test(id)) throw new SourceError('FRED', 'The series has no valid identifier.');
  return complete({ locator: { provider: 'fred', id }, title: text(item.title) || id, url: `https://fred.stlouisfed.org/series/${encodeURIComponent(id)}`, kind: 'series_metadata', publisher: 'Federal Reserve Bank of St. Louis (FRED)',
    summary: clipText(item.notes, 1500), text: '', publication_date: null, updated_at: text(item.last_updated) || null,
    dates: [...date('Observations from', item.observation_start), ...date('Observations to', item.observation_end), ...date('Last updated', item.last_updated)],
    metadata: { series_id: id, units: text(item.units), frequency: text(item.frequency), seasonal_adjustment: text(item.seasonal_adjustment), popularity: number(item.popularity) },
    warnings: [FRED_NOTE, 'Values can be revised; the snapshot keeps the values as retrieved.'] });
}
export async function searchFred(query: string, page = 1) {
  const url = fredUrl('series/search', { search_text: query.slice(0, 200), limit: '20', offset: String((page - 1) * 20), order_by: 'popularity', sort_order: 'desc' });
  const data = await fetchSource<any>(url, { source: 'FRED', pace: FRED_PACE });
  if (!data || !Array.isArray(data.seriess)) throw new SourceError('FRED', 'FRED returned an unexpected response.');
  const total = number(data.count);
  return result(data.seriess.map(fredSeriesRecord), `https://fred.stlouisfed.org/searchresults/?st=${encodeURIComponent(query)}`, total, (total ?? 0) > page * 20 ? page + 1 : null, null, [FRED_NOTE]);
}
export async function fredData(locator: OfficialLocator): Promise<OfficialRecord> {
  const series = await fetchSource<any>(fredUrl('series', { series_id: locator.id }), { source: 'FRED', pace: FRED_PACE });
  const item = Array.isArray(series?.seriess) ? series.seriess[0] : null;
  if (!item) throw notFound();
  const base = fredSeriesRecord(item); const page = locator.page || 1; const range = yearRange(locator.date);
  const params: Record<string, string> = { series_id: locator.id, sort_order: 'desc', limit: '200', offset: String((page - 1) * 200) };
  if (range) { params.observation_start = `${range.from}-01-01`; if (range.to) params.observation_end = `${range.to}-12-31`; }
  const data = await fetchSource<any>(fredUrl('series/observations', params), { source: 'FRED', pace: FRED_PACE });
  if (!data || !Array.isArray(data.observations)) throw new SourceError('FRED', 'FRED returned an unexpected response.');
  const total = number(data.count) ?? data.observations.length; const pages = Math.max(1, Math.ceil(total / 200));
  return complete({ ...base, locator: { ...locator, page }, kind: 'series_data',
    metadata: { ...base.metadata, requested_period: locator.date || 'all available', page, pages, total_observations: total, returned_observations: data.observations.length },
    table: { columns: ['date', 'value', 'units'], rows: data.observations.map((row: any) => [text(row.date), text(row.value) === '.' || text(row.value) === '' ? null : Number(row.value), text(item.units) || null]) },
    warnings: [...base.warnings, `Page ${page} of ${pages}, newest first. Missing values (".") are kept as missing, never zero.`] });
}

// US Treasury Fiscal Data ----------------------------------------------

const TREASURY = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service';
/** The dataset catalogue fiscaldata.treasury.gov itself uses (not part of the documented data API). */
const TREASURY_CATALOG = 'https://api.fiscaldata.treasury.gov/services/dtg/metadata/';
type TreasuryTable = { dataset: any; table: any };
async function treasuryTables(): Promise<TreasuryTable[]> {
  const data = await fetchSource<any>(TREASURY_CATALOG, { source: 'US Treasury Fiscal Data', timeoutMs: 20_000 });
  if (!Array.isArray(data)) throw new SourceError('US Treasury Fiscal Data', 'The dataset catalogue returned an unexpected response.');
  return data.flatMap((dataset: any) => (Array.isArray(dataset?.apis) ? dataset.apis : [])
    .map((table: any) => ({ ...table, endpoint_txt: text(table?.endpoint_txt).replace(/^\/services\/api\/fiscal_service/, '') }))
    .filter((table: any) => Number.isInteger(table?.api_id) && /^\/v\d\/[a-z0-9_/]+$/.test(table.endpoint_txt))
    .map((table: any) => ({ dataset, table })));
}
export function treasuryTableRecord({ dataset, table }: TreasuryTable): OfficialRecord {
  const id = String(table.api_id);
  return complete({ locator: { provider: 'treasury', id }, title: `${text(table.table_name)} — ${text(dataset.title)}`, url: `https://fiscaldata.treasury.gov/datasets${text(dataset.dataset_path)}`, kind: 'fiscal_table', publisher: text(dataset.publisher) || 'US Department of the Treasury',
    summary: clipText(table.table_description || dataset.short_description, 1500), text: '', publication_date: null, updated_at: text(table.last_updated) || null,
    dates: [...date('Data from', table.earliest_date), ...date('Data to', table.latest_date), ...date('Last updated', table.last_updated)],
    metadata: { api_id: table.api_id, endpoint: text(table.endpoint_txt), dataset: text(dataset.title), update_frequency: text(table.update_frequency), row_definition: text(table.row_definition), row_count: number(table.row_count), notes: text(table.api_notes_and_limitations) || text(dataset.notes_and_known_limitations) || null },
    warnings: ['Amounts keep the units stated in the table definition (often dollars, sometimes millions). Values are kept as published; revisions are not tracked.'] });
}
export async function searchTreasury(query: string, page = 1) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = (await treasuryTables()).filter(({ dataset, table }) => terms.every((term) => `${text(dataset.title)} ${text(dataset.short_description)} ${text(table.table_name)} ${text(table.table_description)}`.toLowerCase().includes(term)));
  return result(matches.slice((page - 1) * 20, page * 20).map(treasuryTableRecord), 'https://fiscaldata.treasury.gov/datasets/', matches.length, matches.length > page * 20 ? page + 1 : null, null, ['Searches table names and descriptions in the Fiscal Data catalogue.']);
}
export async function treasuryData(locator: OfficialLocator): Promise<OfficialRecord> {
  const match = (await treasuryTables()).find(({ table }) => String(table.api_id) === locator.id);
  if (!match) throw notFound();
  const base = treasuryTableRecord(match); const page = locator.page || 1; const range = yearRange(locator.date);
  const url = new URL(`${TREASURY}${match.table.endpoint_txt}`);
  url.searchParams.set('sort', '-record_date'); url.searchParams.set('page[size]', '100'); url.searchParams.set('page[number]', String(page));
  if (range) url.searchParams.set('filter', [`record_date:gte:${range.from}-01-01`, range.to ? `record_date:lte:${range.to}-12-31` : null].filter(Boolean).join(','));
  const data = await fetchSource<any>(url, { source: 'US Treasury Fiscal Data', timeoutMs: 20_000 });
  if (!data || !Array.isArray(data.data)) throw new SourceError('US Treasury Fiscal Data', 'The table returned an unexpected response.');
  const columns = Object.keys(data.meta?.labels ?? data.data[0] ?? {});
  const pages = number(data.meta?.['total-pages']) ?? 1;
  return complete({ ...base, locator: { ...locator, page }, kind: 'fiscal_data',
    metadata: { ...base.metadata, request_url: url.toString(), labels: data.meta?.labels ?? {}, data_types: data.meta?.dataTypes ?? {}, requested_period: locator.date || 'all available', page, pages, total_observations: number(data.meta?.['total-count']), returned_observations: data.data.length },
    table: { columns, rows: data.data.map((row: any) => columns.map((column) => { const value = row?.[column]; return value === null || value === undefined || value === 'null' ? null : String(value); })) },
    warnings: [...base.warnings, `Page ${page} of ${pages}, newest first. Missing values ("null") are kept as missing.`] });
}

// OECD ------------------------------------------------------------------

const OECD = 'https://sdmx.oecd.org/public/rest';
/** OECD limits each address to a modest number of calls; space them out. */
const OECD_PACE = { key: 'oecd', ms: 3000, maxWaitMs: 20_000 };
const OECD_NOTE = 'OECD data are licensed CC BY 4.0: cite the OECD and the dataset. Values keep the units, multipliers and status flags of the source.';
type Dataflow = { agencyID: string; id: string; version: string; name: string; description: string };
async function oecdDataflows(): Promise<Dataflow[]> {
  const data = await fetchSource<any>(`${OECD}/dataflow/all/all/latest?detail=allstubs`, { source: 'OECD', headers: { Accept: 'application/vnd.sdmx.structure+json; version=1.0' }, timeoutMs: 30_000, pace: OECD_PACE });
  const flows = data?.data?.dataflows;
  if (!Array.isArray(flows)) throw new SourceError('OECD', 'The OECD catalogue returned an unexpected response.');
  return flows.filter((flow: any) => text(flow?.agencyID) && text(flow?.id) && text(flow?.version))
    .map((flow: any) => ({ agencyID: flow.agencyID, id: flow.id, version: flow.version, name: text(flow.name) || text(flow.names?.en) || flow.id, description: text(flow.description) || text(flow.descriptions?.en) }));
}
const findFlow = async (locatorId: string) => {
  const [agency, id, version] = locatorId.split(',');
  return (await oecdDataflows()).find((item) => item.agencyID === agency && item.id === id && item.version === version) ?? null;
};
export function oecdFlowRecord(flow: Dataflow): OfficialRecord {
  return complete({ locator: { provider: 'oecd', id: `${flow.agencyID},${flow.id},${flow.version}` }, title: flow.name, url: `https://data-explorer.oecd.org/vis?df[ds]=dsDisseminateFinalDMZ&df[id]=${encodeURIComponent(flow.id)}&df[ag]=${encodeURIComponent(flow.agencyID)}`, kind: 'dataflow_metadata', publisher: `OECD (${flow.agencyID})`,
    summary: clipText(flow.description, 1500), text: '', publication_date: null, updated_at: null, dates: [],
    metadata: { agency: flow.agencyID, dataflow: flow.id, version: flow.version }, warnings: [OECD_NOTE] });
}
export async function searchOecd(query: string, page = 1) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = (await oecdDataflows()).filter((flow) => terms.every((term) => `${flow.id} ${flow.name} ${flow.description}`.toLowerCase().includes(term)));
  return result(matches.slice((page - 1) * 20, page * 20).map(oecdFlowRecord), 'https://data-explorer.oecd.org/', matches.length, matches.length > page * 20 ? page + 1 : null, null, ['Searches OECD dataflow names. Load observations with an optional series key (dimension codes joined by dots) and period.']);
}
/** CSV to rows; quoted fields and doubled quotes are handled. Pure, for tests. */
export function parseCsv(body: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let field = ''; let quoted = false;
  const endRow = () => { row.push(field); field = ''; if (row.some((cell) => cell !== '')) rows.push(row); row = []; };
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
    if (quoted) {
      if (char === '"' && body[index + 1] === '"') { field += '"'; index += 1; } else if (char === '"') quoted = false; else field += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n' || char === '\r') { if (char === '\r' && body[index + 1] === '\n') index += 1; endRow(); }
    else field += char;
  }
  if (field || row.length) endRow();
  return rows;
}
export async function oecdData(locator: OfficialLocator): Promise<OfficialRecord> {
  const flow = await findFlow(locator.id);
  if (!flow) throw notFound();
  const base = oecdFlowRecord(flow); const page = locator.page || 1; const range = yearRange(locator.date); const key = locator.key || 'all';
  const url = new URL(`${OECD}/data/${flow.agencyID},${flow.id},${flow.version}/${key}`);
  if (range) { url.searchParams.set('startPeriod', range.from); if (range.to) url.searchParams.set('endPeriod', range.to); }
  else url.searchParams.set('lastNObservations', '1');
  url.searchParams.set('dimensionAtObservation', 'AllDimensions');
  const body = await fetchSource<string>(url, { source: 'OECD', as: 'text', headers: { Accept: 'application/vnd.sdmx.data+csv; charset=utf-8; labels=both' }, timeoutMs: 30_000, pace: OECD_PACE });
  if (body === null) throw new HTTPException(404, { message: 'No OECD observations match this key and period.' });
  const [header = [], ...all] = parseCsv(body);
  const valueAt = header.indexOf('OBS_VALUE'); const pages = Math.max(1, Math.ceil(all.length / 200));
  return complete({ ...base, locator: { ...locator, key, page }, kind: 'dataflow_data',
    metadata: { ...base.metadata, request_url: url.toString(), series_key: key, requested_period: locator.date || 'latest observation of each series', page, pages, total_observations: all.length, returned_observations: Math.min(200, Math.max(0, all.length - (page - 1) * 200)) },
    table: { columns: header, rows: all.slice((page - 1) * 200, page * 200).map((row) => header.map((_, at) => { const value = row[at] ?? ''; if (value === '') return null; return at === valueAt && Number.isFinite(Number(value)) ? Number(value) : value; })) },
    warnings: [...base.warnings, `Page ${page} of ${pages}. Empty values are kept as missing. Without a period, only the latest observation of each series is loaded.`] });
}

// USPTO Open Data Portal (patents) --------------------------------------

const USPTO = 'https://api.uspto.gov/api/v1/patent/applications';
const USPTO_PACE = { key: 'uspto', ms: 1100 };
function usptoHeaders() {
  const key = envKey('PATENTSVIEW_API_KEY');
  if (!key) throw notConnected('USPTO');
  return { 'X-API-KEY': key };
}
export function patentRecord(item: any): OfficialRecord {
  const id = text(item?.applicationNumberText).replace(/\D/g, '');
  if (!/^\d{6,12}$/.test(id)) throw new SourceError('USPTO', 'The application has no valid number.');
  const meta = item.applicationMetaData ?? {};
  const patent = text(meta.patentNumber);
  return complete({ locator: { provider: 'uspto_patents', id }, title: `${text(meta.inventionTitle) || 'Patent application'} — ${patent ? `US ${patent}` : `application ${id}`}`, url: `https://patentcenter.uspto.gov/applications/${id}`, kind: 'patent_application',
    publisher: text(meta.firstApplicantName) || text(meta.firstInventorName) || 'USPTO',
    summary: [text(meta.applicationStatusDescriptionText) && `Status: ${text(meta.applicationStatusDescriptionText)}`, text(meta.applicationTypeLabelName) && `Type: ${text(meta.applicationTypeLabelName)}`].filter(Boolean).join('. '),
    text: '', publication_date: text(meta.grantDate) || text(meta.earliestPublicationDate) || null, updated_at: text(meta.applicationStatusDate) || null,
    dates: [...date('Filed', meta.filingDate), ...date('Published', meta.earliestPublicationDate), ...date('Granted', meta.grantDate), ...date('Status date', meta.applicationStatusDate)],
    metadata: { application_number: id, patent_number: patent || null, publication_number: text(meta.earliestPublicationNumber) || null, applicant: text(meta.firstApplicantName) || null, first_inventor: text(meta.firstInventorName) || null, status: text(meta.applicationStatusDescriptionText) || null, cpc: strings(meta.cpcClassificationBag).slice(0, 20) },
    warnings: [PATENT_NOTE, 'Bibliographic data from the USPTO Open Data Portal; claims and full text are not imported. Status can change after this snapshot.'] });
}
export async function searchPatents(query: string, page = 1) {
  const headers = usptoHeaders();
  const url = new URL(`${USPTO}/search`); url.searchParams.set('q', query.slice(0, 300)); url.searchParams.set('offset', String((page - 1) * 20)); url.searchParams.set('limit', '20');
  const data = await fetchSource<any>(url, { source: 'USPTO', headers, pace: USPTO_PACE });
  const items = Array.isArray(data?.patentFileWrapperDataBag) ? data.patentFileWrapperDataBag : [];
  const total = number(data?.count) ?? items.length;
  return result(items.map(patentRecord), url.toString(), total, total > page * 20 ? page + 1 : null, null, [PATENT_NOTE]);
}

/** Search for the providers added in November 2026 (null for the original four). */
export async function searchMoreOfficial(provider: OfficialProvider, query: string, page = 1): Promise<OfficialSearch | null> {
  if (provider === 'openfda_label') return searchFdaLabels(query, page);
  if (provider === 'openfda_event') return searchFdaEvents(query);
  if (provider === 'openfda_device') return searchFdaDevices(query, page);
  if (provider === 'fred') return searchFred(query, page);
  if (provider === 'treasury') return searchTreasury(query, page);
  if (provider === 'oecd') return searchOecd(query, page);
  if (provider === 'uspto_patents') return searchPatents(query, page);
  return null;
}
/** The data table of a new provider's record ("Load observations"); null for providers without one. */
export async function moreOfficialData(locator: OfficialLocator): Promise<OfficialRecord | null> {
  if (locator.provider === 'fred') return fredData(locator);
  if (locator.provider === 'treasury') return treasuryData(locator);
  if (locator.provider === 'oecd') return oecdData(locator);
  if (locator.provider === 'openfda_event') return fdaEventRecord(locator.id);
  return null;
}
/** Refetch of a new provider's record by its validated identifier (saves); null for the original four. */
async function moreOfficialRecord(locator: OfficialLocator): Promise<OfficialRecord | null> {
  const wantsData = Boolean(locator.page || locator.date || locator.key);
  if (locator.provider === 'openfda_label') {
    const data = await fda(fdaUrl('/drug/label.json', { search: `set_id:"${locator.id}"`, limit: '1' }));
    if (!data?.results?.[0]) throw notFound();
    return fdaLabelRecord(data.results[0]);
  }
  if (locator.provider === 'openfda_device') {
    const data = await fda(fdaUrl('/device/510k.json', { search: `k_number:"${locator.id}"`, limit: '1' }));
    if (!data?.results?.[0]) throw notFound();
    return fdaDeviceRecord(data.results[0]);
  }
  if (locator.provider === 'uspto_patents') {
    const data = await fetchSource<any>(`${USPTO}/${locator.id}`, { source: 'USPTO', headers: usptoHeaders(), pace: USPTO_PACE });
    const item = Array.isArray(data?.patentFileWrapperDataBag) ? data.patentFileWrapperDataBag[0] : null;
    if (!item) throw notFound();
    return patentRecord(item);
  }
  if (locator.provider === 'fred' && !wantsData) {
    const data = await fetchSource<any>(fredUrl('series', { series_id: locator.id }), { source: 'FRED', pace: FRED_PACE });
    if (!data?.seriess?.[0]) throw notFound();
    return fredSeriesRecord(data.seriess[0]);
  }
  if (locator.provider === 'treasury' && !wantsData) {
    const match = (await treasuryTables()).find(({ table }) => String(table.api_id) === locator.id);
    if (!match) throw notFound();
    return treasuryTableRecord(match);
  }
  if (locator.provider === 'oecd' && !wantsData) {
    const flow = await findFlow(locator.id);
    if (!flow) throw notFound();
    return oecdFlowRecord(flow);
  }
  return moreOfficialData(locator);
}
