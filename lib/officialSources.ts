export type OfficialProvider =
  | 'clinical_trials' | 'world_bank' | 'reliefweb' | 'sec'
  | 'openfda_label' | 'openfda_event' | 'openfda_device' | 'fred' | 'treasury' | 'oecd' | 'uspto_patents';
export type OfficialLocator = {
  provider: OfficialProvider; id: string; source_id?: string; countries?: string; date?: string;
  page?: number; taxonomy?: string; concept?: string; accession?: string;
  /** OECD: an SDMX series key (dimension codes joined by dots; "all" when empty). */
  key?: string;
};
export type OfficialRecordKind =
  | 'trial_registration' | 'indicator_metadata' | 'indicator_data' | 'humanitarian_report' | 'filing_metadata' | 'financial_facts'
  | 'drug_label' | 'adverse_event_summary' | 'device_clearance' | 'series_metadata' | 'series_data' | 'fiscal_table' | 'fiscal_data'
  | 'dataflow_metadata' | 'dataflow_data' | 'patent_application';
export type OfficialRecord = {
  locator: OfficialLocator; title: string; url: string; kind: OfficialRecordKind;
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
export const OFFICIAL_LABELS: Record<OfficialProvider, string> = {
  clinical_trials: 'ClinicalTrials.gov', world_bank: 'World Bank indicators', reliefweb: 'ReliefWeb', sec: 'SEC EDGAR',
  openfda_label: 'openFDA drug labels', openfda_event: 'openFDA adverse event reports', openfda_device: 'openFDA device clearances (510(k))',
  fred: 'FRED economic data', treasury: 'US Treasury Fiscal Data', oecd: 'OECD data', uspto_patents: 'USPTO patent applications',
};
/** Providers whose records can load a data table ("Load observations"). */
export const OFFICIAL_DATA_KINDS: OfficialRecordKind[] = ['indicator_metadata', 'series_metadata', 'fiscal_table', 'dataflow_metadata', 'adverse_event_summary'];
/** Shown with every openFDA record. */
export const OPENFDA_NOTE = 'Not medical advice; check the label. openFDA data are unvalidated and may be incomplete; do not use them for decisions about medical care.';
/** Shown with every patent record. */
export const PATENT_NOTE = 'This is not a validity, infringement or freedom-to-operate opinion.';
