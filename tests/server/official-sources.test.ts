import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const fake = await vi.hoisted(async () => (await import('./fakeFirestore.js')).createFakeFirestore());
const remote = vi.hoisted(() => ({ fetch: vi.fn(), sec: vi.fn(), room: vi.fn() }));
vi.mock('../../lib/server/firebase.js', async (original) => ({ ...(await original<typeof import('../../lib/server/firebase.js')>()), ...fake.module }));
vi.mock('../../lib/server/lib/sources/http.js', async (original) => ({ ...(await original<typeof import('../../lib/server/lib/sources/http.js')>()), fetchSource: remote.fetch, net: { fetch: remote.sec } }));
vi.mock('../../lib/server/lib/plans.js', () => ({ checkLibraryRoom: remote.room }));
vi.mock('../../lib/server/lib/embeddings.js', () => ({ embed: async () => null }));

// Covers every connector, including those behind the expansion flag.
WORKBOOK_FEATURES.expansionWorkbooks = true;

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppVariables } from '../../lib/server/auth.js';
import { OfficialLocatorSchema, officialSourceRoutes } from '../../lib/server/routes/officialSources.js';
import { companyConcept, indicatorData, searchFilings, searchIndicators, searchRelief, searchTrials, trialRecord } from '../../lib/server/lib/officialSources.js';
import { createWorkbook } from '../../lib/server/lib/workflows.js';
import { WORKBOOK_FEATURES } from '../../lib/workflows.js';
import { USER } from './assist-helpers.js';

const trial = { hasResults: false, protocolSection: { identificationModule: { nctId: 'NCT01234567', briefTitle: 'Exercise study' }, descriptionModule: { briefSummary: 'A registered study of exercise.' }, statusModule: { overallStatus: 'RECRUITING', studyFirstPostDateStruct: { date: '2020-02-12' }, lastUpdatePostDateStruct: { date: '2026-11-01' }, primaryCompletionDateStruct: { date: '2027-01', type: 'ESTIMATED' } }, designModule: { studyType: 'INTERVENTIONAL', enrollmentInfo: { count: 80, type: 'ESTIMATED' } } } };
const indicator = { id: 'SP.POP.TOTL', name: 'Population, total', unit: '', source: { id: '2', value: 'World Development Indicators' }, sourceNote: 'Total population, including all residents.', sourceOrganization: 'National statistical sources.' };
const make = (authenticated = true) => {
  const app = new Hono<{ Variables: AppVariables }>();
  if (authenticated) app.use('*', async (c, next) => { c.set('user', USER); await next(); });
  app.route('/api/official-sources', officialSourceRoutes());
  app.onError((error, c) => c.json({ detail: error.message }, error instanceof HTTPException ? error.status : 500));
  return app;
};
const post = (path: string, body: unknown, app = make()) => app.request(`/api/official-sources${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

beforeEach(() => { fake.clear(); vi.clearAllMocks(); remote.room.mockResolvedValue(undefined); });
afterEach(() => vi.unstubAllEnvs());

describe('official source records', () => {
  it('keeps registered outcomes, posted descriptions and reference relationships separate in saved evidence', async () => {
    const study = { ...trial, hasResults: true, protocolSection: { ...trial.protocolSection,
      outcomesModule: { primaryOutcomes: [{ measure: 'Walking distance', description: 'Registered primary measure', timeFrame: '12 weeks' }], secondaryOutcomes: [{ measure: 'Quality of life', timeFrame: '12 weeks' }] },
      referencesModule: { references: [{ pmid: '12345678', type: 'RESULT', citation: 'Trial results paper.' }, { pmid: '23456789', type: 'BACKGROUND', citation: 'Background paper.' }, { pmid: 'javascript:alert(1)', type: 'DERIVED', citation: 'Unvalidated identifier.' }, null] },
    }, resultsSection: { outcomeMeasuresModule: { outcomeMeasures: [{ type: 'PRIMARY', title: 'Walking distance at follow-up', timeFrame: '16 weeks', unitOfMeasure: 'metres', populationDescription: 'Participants with follow-up', classes: [{ categories: [{ measurements: [{ value: '100' }] }] }] }] } } };
    const record = trialRecord(study);
    expect(record.trial?.registered_outcomes[0]).toMatchObject({ kind: 'primary', measure: 'Walking distance', time_frame: '12 weeks' });
    expect(record.trial?.reported_outcomes[0]).toMatchObject({ title: 'Walking distance at follow-up', time_frame: '16 weeks', units: 'metres', population: 'Participants with follow-up' });
    expect(record.trial?.references).toEqual([
      { pmid: '12345678', url: 'https://pubmed.ncbi.nlm.nih.gov/12345678/', kind: 'RESULT', citation: 'Trial results paper.' },
      { pmid: '23456789', url: 'https://pubmed.ncbi.nlm.nih.gov/23456789/', kind: 'BACKGROUND', citation: 'Background paper.' },
      { pmid: null, url: null, kind: 'DERIVED', citation: 'Unvalidated identifier.' },
    ]);
    expect(record.text).toContain('https://pubmed.ncbi.nlm.nih.gov/12345678/');
    expect(record.text).toContain('Numerical results');
    expect(record.text).not.toContain('"value": "100"');
    remote.fetch.mockResolvedValue(study);
    const response = await post('/data', { provider: 'clinical_trials', id: 'NCT01234567' });
    expect(response.status).toBe(200);
    expect((await response.json()).trial).toEqual(record.trial);
    expect([...fake.store.keys()].filter((key) => key.startsWith('library_documents/'))).toHaveLength(0);
  });

  it('keeps registration dates and planned enrollment distinct from publications and findings', async () => {
    remote.fetch.mockResolvedValue({ studies: [trial], totalCount: 21, nextPageToken: 'next-token' });
    const response = await searchTrials('exercise', 'previous-token');
    expect(response.records[0]).toMatchObject({ kind: 'trial_registration', publication_date: null, metadata: { enrollment: { count: 80, type: 'ESTIMATED' }, primary_completion_type: 'ESTIMATED' } });
    expect(response.records[0].dates[0]).toEqual({ label: 'Registration first posted', value: '2020-02-12' });
    expect(response.records[0].text).toContain('not a peer-reviewed publication');
    expect(response.next_token).toBe('next-token');
    expect(response.records[0].trial).toBeUndefined();
    expect(response.records[0].warnings.join(' ')).toContain('Search previews omit');
    const url = remote.fetch.mock.calls[0][0] as URL;
    expect(url.searchParams.get('query.term')).toBe('exercise');
    expect(url.searchParams.get('pageToken')).toBe('previous-token');
  });

  it('preserves World Bank source metadata, missing vs zero observations, periods and pagination', async () => {
    remote.fetch.mockImplementation(async (url: URL) => url.pathname.includes('/country/') ? [{ page: 2, pages: 3, total: 401, lastupdated: '2026-10-01' }, [
      { indicator: { id: indicator.id }, country: { id: 'NO', value: 'Norway' }, countryiso3code: 'NOR', date: '2024', value: null, unit: '', decimal: 0, obs_status: '', footnote: 'No observation.' },
      { indicator: { id: indicator.id }, country: { id: 'NO', value: 'Norway' }, countryiso3code: 'NOR', date: '2023', value: 0, unit: 'persons', decimal: 0, obs_status: 'F' },
    ]] : [{ page: 1, pages: 1, total: 1 }, [indicator]]);
    const record = await indicatorData({ provider: 'world_bank', id: indicator.id, source_id: '2', countries: 'NOR;IND', date: '2020:2025', page: 2 });
    expect(record.publication_date).toBeNull();
    expect(record.metadata).toMatchObject({ source_id: '2', unit: null, page: 2, pages: 3, area_filter: 'NOR;IND' });
    expect(record.table?.rows.map((row) => row[4])).toEqual([null, 0]);
    expect(record.table?.rows[0][3]).toBe('2024');
    expect(record.table?.rows[1][5]).toBe('persons');
    const dataUrl = remote.fetch.mock.calls[1][0] as URL;
    expect(dataUrl.searchParams.get('footnote')).toBe('y');
    expect(dataUrl.searchParams.get('date')).toBe('2020:2025');
  });

  it('labels partial World Bank catalogues and reports no matches honestly', async () => {
    remote.fetch.mockResolvedValue([{ pages: 2, total: 3000 }, [indicator]]);
    const response = await searchIndicators('absent term', '2', 1);
    expect(response.records).toEqual([]);
    expect(response.next_page).toBe(2);
    expect(response.warnings.join(' ')).toContain('not an exhaustive');
  });

  it('reports every connector as available when the expansion connectors are on', async () => {
    vi.stubEnv('FRED_API_KEY', '');
    const response = await make().request('/api/official-sources/availability');
    // Keyed connectors (FRED) report false until their keys are set.
    expect(await response.json()).toEqual({ clinical_trials: true, world_bank: true, reliefweb: true, sec: true, openfda_label: true, openfda_event: true, openfda_device: true, fred: false, treasury: true, oecd: true });
  });

  it('hides the World Bank, ReliefWeb and SEC connectors while the expansion flag is off, and keeps the research data sources', async () => {
    WORKBOOK_FEATURES.expansionWorkbooks = false;
    try {
      const app = make();
      const availability = await (await app.request('/api/official-sources/availability')).json() as Record<string, boolean>;
      expect(availability).toMatchObject({ clinical_trials: true, openfda_label: true, openfda_event: true, openfda_device: true, treasury: true, oecd: true });
      expect(availability).not.toHaveProperty('world_bank');
      expect(availability).not.toHaveProperty('reliefweb');
      expect(availability).not.toHaveProperty('sec');
      const post = (path: string, body: unknown) => app.request(`/api/official-sources${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      expect((await post('/search', { provider: 'world_bank', query: 'poverty' })).status).toBe(404);
      expect((await post('/save', { locator: { provider: 'sec', id: '320193', concept: 'Revenues' } })).status).toBe(404);
      expect(remote.fetch).not.toHaveBeenCalled();
    } finally {
      WORKBOOK_FEATURES.expansionWorkbooks = true;
    }
  });

  it('uses the approved ReliefWeb appname and preserves original publication versus ingestion dates', async () => {
    remote.fetch.mockResolvedValue({ totalCount: 22, data: [{ id: '1234', fields: { title: 'Needs assessment', url: 'https://reliefweb.int/report/example', body: 'Survey findings.', source: [{ name: 'Publishing NGO' }], date: { original: '2026-10-01', created: '2026-10-03', changed: '2026-10-04' } } }] });
    const found = await searchRelief('needs assessment');
    expect((remote.fetch.mock.calls[0][0] as URL).searchParams.get('appname')).toBe('mutesasira-aiforresearch-nQO9kmOfXv');
    expect(found.records[0]).toMatchObject({ publication_date: '2026-10-01', updated_at: '2026-10-04', publisher: 'Publishing NGO' });
    expect(found.records[0].dates).toContainEqual({ label: 'Added to ReliefWeb', value: '2026-10-03' });
    expect(found.next_page).toBe(2);
  });

  it('keeps financial units, reporting intervals, amendments and filing dates instead of merging them', async () => {
    remote.sec.mockResolvedValue(new Response(JSON.stringify({ entityName: 'Example Co', label: 'Revenue', description: 'As reported revenue', units: { USD: [{ val: 50, start: '2025-01-01', end: '2025-12-31', filed: '2026-02-01', form: '10-K', accn: '0000000001-26-000001' }, { val: 55, start: '2025-01-01', end: '2025-12-31', filed: '2026-03-01', form: '10-K/A', accn: '0000000001-26-000002' }], EUR: [{ val: 47, end: '2025-12-31', filed: '2026-02-01' }] } }), { status: 200 }));
    const record = await companyConcept({ provider: 'sec', id: '1', taxonomy: 'us-gaap', concept: 'Revenues' });
    expect(record.table?.rows.map((row) => [row[0], row[1], row[4], row[5]])).toEqual([[50, 'USD', '2026-02-01', '10-K'], [55, 'USD', '2026-03-01', '10-K/A'], [47, 'EUR', '2026-02-01', '']]);
    expect(remote.sec.mock.calls[0][1].headers['User-Agent']).toBe('AIforResearch support@aiforresearch.app');
    expect(record.warnings.join(' ')).toContain('not collapsed');
  });

  it('enforces a shared SEC request cap without extra retries', async () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
    try {
      const window = Math.floor(Date.now() / 1000); fake.put(`rate_limits/official-sec-${window}`, { count: 5 });
      await expect(searchFilings('1')).rejects.toThrow('request capacity');
      expect(remote.sec).not.toHaveBeenCalled();
    } finally { clock.mockRestore(); }
  });
  it('treats malformed SEC responses as unavailable rather than an empty result or valid facts', async () => {
    remote.sec.mockResolvedValue(new Response(JSON.stringify({ filings: { recent: { accessionNumber: 'invalid' } } }), { status: 200 }));
    await expect(searchFilings('1')).rejects.toThrow('unexpected response');
    remote.sec.mockResolvedValue(new Response(JSON.stringify({ units: { USD: 'invalid' } }), { status: 200 }));
    await expect(companyConcept({ provider: 'sec', id: '1', concept: 'Assets' })).rejects.toThrow('unexpected response');
    remote.sec.mockResolvedValue(new Response(JSON.stringify({ units: { USD: [null] } }), { status: 200 }));
    await expect(companyConcept({ provider: 'sec', id: '1', concept: 'Assets' })).rejects.toThrow('unexpected response');
  });
});

describe('explicit official-source saves', () => {
  it('requires authentication, validates locators and never accepts supplied evidence text', async () => {
    expect((await post('/search', { provider: 'clinical_trials', query: 'exercise' }, make(false))).status).toBe(401);
    expect(OfficialLocatorSchema.safeParse({ provider: 'sec', id: '../secrets', concept: 'Assets' }).success).toBe(false);
    expect((await post('/save', { locator: { provider: 'clinical_trials', id: 'NCT01234567' }, text: 'Fabricated data' })).status).toBe(422);
    expect(remote.fetch).not.toHaveBeenCalled();
  });

  it('refetches official evidence for a deduplicated Library snapshot and explicitly selected workbook', async () => {
    remote.fetch.mockResolvedValue(trial);
    const workbook = await createWorkbook(USER, { kind: 'study', title: 'Study plans' });
    const response = await post('/save', { locator: { provider: 'clinical_trials', id: 'NCT01234567' }, workbook_id: workbook.id, workbook_revision: workbook.revision });
    expect(response.status).toBe(201);
    const saved = await response.json();
    const document = fake.read(`library_documents/${saved.library_document_id}`);
    expect(document).toMatchObject({ user_id: USER.id, file_type: 'text', publication_date: null, processing_status: 'completed', metadata: { official_source: { kind: 'trial_registration', provider: 'clinical_trials' } } });
    const entry = fake.read(`workflows/${workbook.id}`)?.entries[0];
    expect(entry.values.kind).toBe('primary');
    expect(entry.values.reference).toBe('https://clinicaltrials.gov/study/NCT01234567');
    expect(entry.values.library_id).toBe(saved.library_document_id);
    // Source texts are stored beside the workbook document, one record per source.
    expect(fake.read(`workflows/${workbook.id}/source_texts/${entry.id}`)?.text).toContain('Registration first posted');
    const duplicate = await post('/save', { locator: { provider: 'clinical_trials', id: 'NCT01234567' } });
    expect(await duplicate.json()).toMatchObject({ duplicate: true, library_document_id: saved.library_document_id });
  });

  it('rejects a stale workbook before fetching or saving source material', async () => {
    const workbook = await createWorkbook(USER, { kind: 'study', title: 'Study plans' });
    expect((await post('/save', { locator: { provider: 'clinical_trials', id: 'NCT01234567' }, workbook_id: workbook.id, workbook_revision: 8 })).status).toBe(409);
    expect(remote.fetch).not.toHaveBeenCalled();
  });
});
