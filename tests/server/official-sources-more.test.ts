import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const fake = await vi.hoisted(async () => (await import('./fakeFirestore.js')).createFakeFirestore());
const remote = vi.hoisted(() => ({ fetch: vi.fn(), sec: vi.fn(), room: vi.fn() }));
vi.mock('../../lib/server/firebase.js', async (original) => ({ ...(await original<typeof import('../../lib/server/firebase.js')>()), ...fake.module }));
vi.mock('../../lib/server/lib/sources/http.js', async (original) => ({ ...(await original<typeof import('../../lib/server/lib/sources/http.js')>()), fetchSource: remote.fetch, net: { fetch: remote.sec } }));
vi.mock('../../lib/server/lib/plans.js', () => ({ checkLibraryRoom: remote.room }));
vi.mock('../../lib/server/lib/embeddings.js', () => ({ embed: async () => null }));

WORKBOOK_FEATURES.expansionWorkbooks = true;

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppVariables } from '../../lib/server/auth.js';
import { officialSourceRoutes } from '../../lib/server/routes/officialSources.js';
import {
  fdaEventRecord, fdaLabelRecord, fredData, oecdData, parseCsv, searchFdaDevices, searchFdaEvents, searchFdaLabels, searchFred, searchOecd,
  searchTreasury, treasuryData,
} from '../../lib/server/lib/officialSources.js';
import { SourceError } from '../../lib/server/lib/sources/http.js';
import { OPENFDA_NOTE } from '../../lib/officialSources.js';
import { WORKBOOK_FEATURES } from '../../lib/workflows.js';
import { USER } from './assist-helpers.js';

const make = () => {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use('*', async (c, next) => { c.set('user', USER); await next(); });
  app.route('/api/official-sources', officialSourceRoutes());
  app.onError((error, c) => c.json({ detail: error.message }, error instanceof HTTPException ? error.status : 500));
  return app;
};
const post = (path: string, body: unknown) => make().request(`/api/official-sources${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const urlOf = (call: number) => new URL(String(remote.fetch.mock.calls[call][0]));

const LABEL = {
  set_id: '0098dec4-f0e5-45d5-8aa4-5d0faf9ab142', id: '8c26dc1a', version: '3', effective_time: '20260812',
  indications_and_usage: ['Adjunct to diet and exercise to improve glycemic control.'], boxed_warning: ['Lactic acidosis.'], adverse_reactions: ['Diarrhea, nausea.'],
  openfda: { brand_name: ['ZITUVIMET'], generic_name: ['SITAGLIPTIN AND METFORMIN'], manufacturer_name: ['Zydus'], route: ['ORAL'] },
};
const DEVICE = { k_number: 'K253470', device_name: 'MiniMed 780G Insulin Pump', applicant: 'Medtronic', decision_date: '2025-12-01', date_received: '2025-10-01', decision_description: 'Substantially Equivalent', product_code: 'QFG' };
const TREASURY = [{ title: 'Debt to the Penny', short_description: 'Daily total public debt', dataset_path: '/debt-to-the-penny/', publisher: 'Bureau of the Fiscal Service',
  apis: [{ api_id: 143, table_name: 'Debt to the Penny', table_description: 'Total public debt outstanding.', endpoint_txt: '/services/api/fiscal_service/v2/accounting/od/debt_to_penny', last_updated: '2026-11-12', earliest_date: '1993-04-01', latest_date: '2026-11-10', row_count: 8000 }] }];
const OECD_FLOWS = { data: { dataflows: [{ agencyID: 'OECD.SDD.TPS', id: 'DSD_LFS@DF_IALFS_UNE_M', version: '1.0', name: 'Monthly unemployment rates' }, { agencyID: 'OECD.ENV', id: 'DF_AIR', version: '1.0', name: 'Air emissions' }] } };

beforeEach(() => { fake.clear(); vi.clearAllMocks(); remote.room.mockResolvedValue(undefined); });
afterEach(() => vi.unstubAllEnvs());

describe('openFDA', () => {
  it('reads drug labels with the label link, sections on refetch and the not-medical-advice note', async () => {
    vi.stubEnv('OPENFDA_API_KEY', 'secret-key');
    remote.fetch.mockResolvedValue({ meta: { results: { total: 21 } }, results: [LABEL] });
    const found = await searchFdaLabels('metformin');
    expect(found.records[0]).toMatchObject({ kind: 'drug_label', url: 'https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=0098dec4-f0e5-45d5-8aa4-5d0faf9ab142', publication_date: '2026-08-12', locator: { provider: 'openfda_label', id: LABEL.set_id } });
    expect(found.records[0].warnings[0]).toBe(OPENFDA_NOTE);
    expect(found.next_page).toBe(2);
    expect(found.source_url).not.toContain('secret-key');
    expect(urlOf(0).searchParams.get('api_key')).toBe('secret-key');
    const full = fdaLabelRecord(LABEL);
    expect((full.metadata.sections as { label: string }[]).map((section) => section.label)).toEqual(['Boxed warning', 'Indications and usage', 'Adverse reactions']);
    expect(full.text).toContain('Not medical advice; check the label');
  });

  it('answers an empty list when openFDA finds nothing (404) and works without a key', async () => {
    remote.fetch.mockResolvedValue(null);
    expect((await searchFdaLabels('nothing')).records).toEqual([]);
    expect(urlOf(0).searchParams.has('api_key')).toBe(false);
    expect((await searchFdaEvents('nothing')).records).toEqual([]);
  });

  it('summarises adverse event reports as counts, never as causes', async () => {
    remote.fetch.mockImplementation(async (url: URL) => url.searchParams.get('count')
      ? { meta: { last_updated: '2026-10-28' }, results: [{ term: 'NAUSEA', count: 30590 }, { term: 'DIARRHOEA', count: 28671 }] }
      : { meta: { results: { total: 445559 } }, results: [{}] });
    const record = await fdaEventRecord('insulin_glargine');
    expect(record.table).toEqual({ columns: ['reaction_meddra_pt', 'report_count'], rows: [['NAUSEA', 30590], ['DIARRHOEA', 28671]] });
    expect(record.summary).toContain('445,559 reports');
    expect(record.warnings.join(' ')).toContain('do not establish that the drug caused');
    expect(urlOf(0).searchParams.get('search')).toContain('"insulin glargine"');
  });

  it('reads 510(k) clearances, including De Novo numbers, and drops malformed ones loudly', async () => {
    remote.fetch.mockResolvedValue({ meta: { results: { total: 2 } }, results: [DEVICE, { ...DEVICE, k_number: 'DEN180058' }] });
    const found = await searchFdaDevices('insulin pump');
    expect(found.records.map((record) => record.locator.id)).toEqual(['K253470', 'DEN180058']);
    expect(found.records[0].warnings.join(' ')).toContain('not an FDA approval');
    remote.fetch.mockResolvedValue({ results: [{ ...DEVICE, k_number: 'javascript:1' }] });
    await expect(searchFdaDevices('pump')).rejects.toBeInstanceOf(SourceError);
  });
});

describe('FRED', () => {
  it('is skipped until FRED_API_KEY is set', async () => {
    vi.stubEnv('FRED_API_KEY', '');
    await expect(searchFred('unemployment')).rejects.toThrow('not connected');
    expect(remote.fetch).not.toHaveBeenCalled();
    expect((await post('/search', { provider: 'fred', query: 'unemployment' })).status).toBe(503);
  });

  it('searches series and keeps missing observations as missing', async () => {
    vi.stubEnv('FRED_API_KEY', 'fred-key');
    const series = { id: 'UNRATE', title: 'Unemployment Rate', units: 'Percent', frequency: 'Monthly', observation_start: '1948-01-01', observation_end: '2026-10-01', last_updated: '2026-11-07', notes: 'From the BLS.' };
    remote.fetch.mockImplementation(async (url: URL) => url.pathname.endsWith('/series/search') ? { count: 1, seriess: [series] }
      : url.pathname.endsWith('/observations') ? { count: 2, observations: [{ date: '2026-10-01', value: '4.4' }, { date: '2026-09-01', value: '.' }] } : { seriess: [series] });
    const found = await searchFred('unemployment');
    expect(found.records[0]).toMatchObject({ kind: 'series_metadata', url: 'https://fred.stlouisfed.org/series/UNRATE', locator: { provider: 'fred', id: 'UNRATE' } });
    expect(found.records[0].warnings[0]).toContain('not endorsed or certified');
    const data = await fredData({ provider: 'fred', id: 'UNRATE', date: '2020:2026', page: 1 });
    expect(data.table?.rows).toEqual([['2026-10-01', 4.4, 'Percent'], ['2026-09-01', null, 'Percent']]);
    const asked = new URL(String(remote.fetch.mock.calls.at(-1)![0]));
    expect(asked.searchParams.get('observation_start')).toBe('2020-01-01');
    expect(asked.searchParams.get('observation_end')).toBe('2026-12-31');
  });
});

describe('US Treasury Fiscal Data', () => {
  it('finds tables in the catalogue and loads pages of rows newest first', async () => {
    remote.fetch.mockImplementation(async (url: URL | string) => String(url).includes('/dtg/metadata/') ? TREASURY
      : { data: [{ record_date: '2025-12-31', tot_pub_debt_out_amt: '38514009000000.00', note: 'null' }], meta: { labels: { record_date: 'Record Date', tot_pub_debt_out_amt: 'Total', note: 'Note' }, 'total-pages': 3, 'total-count': 250 } });
    const found = await searchTreasury('debt penny');
    expect(found.records[0]).toMatchObject({ kind: 'fiscal_table', locator: { provider: 'treasury', id: '143' }, url: 'https://fiscaldata.treasury.gov/datasets/debt-to-the-penny/' });
    expect((await searchTreasury('wine imports')).records).toEqual([]);
    const data = await treasuryData({ provider: 'treasury', id: '143', date: '2025:2025', page: 1 });
    expect(data.table).toEqual({ columns: ['record_date', 'tot_pub_debt_out_amt', 'note'], rows: [['2025-12-31', '38514009000000.00', null]] });
    const asked = new URL(String(remote.fetch.mock.calls.at(-1)![0]));
    expect(asked.pathname).toBe('/services/api/fiscal_service/v2/accounting/od/debt_to_penny');
    expect(asked.searchParams.get('filter')).toBe('record_date:gte:2025-01-01,record_date:lte:2025-12-31');
    expect(data.metadata).toMatchObject({ page: 1, pages: 3, total_observations: 250 });
  });
});

describe('OECD', () => {
  it('searches dataflows and loads SDMX CSV observations with a key and period', async () => {
    const csv = 'DATAFLOW,REF_AREA: Reference area,TIME_PERIOD: Time period,OBS_VALUE,OBS_STATUS: Observation status\r\n"OECD.SDD.TPS:DSD_LFS@DF_IALFS_UNE_M(1.0)",AUS: Australia,2025-07,3.97,A: Normal value\r\nX,"FRA: France, metropolitan",2025-07,,\r\n';
    remote.fetch.mockImplementation(async (url: URL | string) => String(url).includes('/dataflow/') ? OECD_FLOWS : csv);
    const found = await searchOecd('unemployment');
    expect(found.records).toHaveLength(1);
    expect(found.records[0].locator).toEqual({ provider: 'oecd', id: 'OECD.SDD.TPS,DSD_LFS@DF_IALFS_UNE_M,1.0' });
    const data = await oecdData({ provider: 'oecd', id: 'OECD.SDD.TPS,DSD_LFS@DF_IALFS_UNE_M,1.0', key: 'AUS+FRA.........', date: '2025:2025' });
    expect(data.table?.rows).toEqual([['OECD.SDD.TPS:DSD_LFS@DF_IALFS_UNE_M(1.0)', 'AUS: Australia', '2025-07', 3.97, 'A: Normal value'], ['X', 'FRA: France, metropolitan', '2025-07', null, null]]);
    expect(String(remote.fetch.mock.calls.at(-1)![0])).toBe('https://sdmx.oecd.org/public/rest/data/OECD.SDD.TPS,DSD_LFS@DF_IALFS_UNE_M,1.0/AUS+FRA.........?startPeriod=2025&endPeriod=2025&dimensionAtObservation=AllDimensions');
    expect(data.warnings[0]).toContain('CC BY 4.0');
  });

  it('parses quoted CSV fields', () => {
    expect(parseCsv('a,b\n"x, y","say ""hi"""\n')).toEqual([['a', 'b'], ['x, y', 'say "hi"']]);
  });

  it('accepts OECD ids and keys in locators but keeps other providers strict', async () => {
    remote.fetch.mockImplementation(async (url: URL | string) => String(url).includes('/dataflow/') ? OECD_FLOWS : 'OBS_VALUE\n1\n');
    expect((await post('/data', { provider: 'oecd', id: 'OECD.SDD.TPS,DSD_LFS@DF_IALFS_UNE_M,1.0', key: 'AUS.........' })).status).toBe(200);
    expect((await post('/data', { provider: 'world_bank', id: 'SP.POP,TOTL' })).status).toBe(422);
    expect((await post('/data', { provider: 'fred', id: 'UNRATE', key: 'AUS' })).status).toBe(422);
  });
});

