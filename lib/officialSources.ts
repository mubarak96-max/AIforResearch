export type OfficialProvider = 'clinical_trials' | 'world_bank' | 'reliefweb' | 'sec';
export type OfficialLocator = {
  provider: OfficialProvider; id: string; source_id?: string; countries?: string; date?: string;
  page?: number; taxonomy?: string; concept?: string; accession?: string;
};
export type OfficialRecord = {
  locator: OfficialLocator; title: string; url: string; kind: 'trial_registration' | 'indicator_metadata' | 'indicator_data' | 'humanitarian_report' | 'filing_metadata' | 'financial_facts';
  publisher: string; summary: string; text: string; publication_date: string | null; updated_at: string | null;
  dates: { label: string; value: string }[]; metadata: Record<string, unknown>; warnings: string[];
  table?: { columns: string[]; rows: (string | number | null)[][] };
  trial?: {
    registered_outcomes: { kind: 'primary' | 'secondary' | 'other'; measure: string; description: string; time_frame: string }[];
    reported_outcomes: { kind: string; title: string; description: string; time_frame: string; population: string; units: string }[];
    references: { pmid: string | null; url: string | null; kind: string; citation: string }[];
  };
};
export type OfficialSearch = { records: OfficialRecord[]; total: number | null; next_page: number | null; next_token: string | null; source_url: string; fetched_at: string; warnings: string[] };
export const OFFICIAL_LABELS: Record<OfficialProvider, string> = { clinical_trials: 'ClinicalTrials.gov', world_bank: 'World Bank indicators', reliefweb: 'ReliefWeb', sec: 'SEC EDGAR' };
