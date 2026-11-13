/** Official API adapters. Registry entries, reports, datasets and filing metadata remain distinct.
 * ClinicalTrials: https://clinicaltrials.gov/data-api/api
 * World Bank: https://datahelpdesk.worldbank.org/knowledgebase/articles/898581-api-basic-call-structures
 * ReliefWeb: https://apidoc.reliefweb.int/read/resources/reports/
 * SEC: https://www.sec.gov/search-filings/edgar-application-programming-interfaces
 */
import { HTTPException } from 'hono/http-exception';
import { C, col, db } from '../firebase.js';
import { fetchSource, net, SourceError } from './sources/http.js';
import type { OfficialLocator, OfficialRecord, OfficialSearch } from '../../officialSources.js';

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
