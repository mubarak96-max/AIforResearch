/** The Systematic Review API's shapes, as the browser reads them (GET /api/systematic-reviews/:id). */
export type Decision = 'include' | 'exclude' | 'maybe';
export type Stage = 'title' | 'full';
export type Vote = { decision: Decision; reason?: string | null; at?: string };
export type StageState = { status: 'pending' | 'conflict' | 'final'; decision: Decision | null; reason: string | null };

export type SrRecord = {
  id: string; title: string; authors: string[]; year: number | null; venue: string | null; doi: string | null; pmid: string | null;
  abstract: string | null; url: string | null; source: string; duplicate_of: string | null; dup_reason: string | null; order: number;
  votes: Partial<Record<Stage, Record<string, Vote>>>; ai: Partial<Record<Stage, { decision: Decision; reason: string } | null>>;
  resolved: Partial<Record<Stage, Vote | null>>;
  extraction?: Record<string, { value: string; quote?: string | null; page?: number | null; ai?: boolean; status?: string; source_revision?: string | null }>;
  rob?: Record<string, string>;
  appraisal_template?: string;
  appraisal_notes?: Record<string, string>;
  blinded?: Partial<Record<Stage, boolean>>;
  full_text?: { revision: string; library_document_id: string; title: string; sha256: string; pages: number; characters: number; attached_by: string; attached_at: string } | null;
  title_state: StageState; full_state: StageState | null;
};

export type SearchLog = { id: string; database: string; query: string; date: string; count: number | null; added: number; duplicates: number; kind: 'search' | 'upload' | 'research' };
export type Column = { id: string; label: string; custom: boolean };

export type Review = {
  id: string; user_id: string; project_id: string | null; task_id: string | null; title: string; question: string; review_type: string;
  framework: 'PICO' | 'PCC' | 'SPIDER'; framework_fields: Record<string, string>; include_criteria: string[]; exclude_criteria: string[];
  protocol: string; methods: string; searches: SearchLog[]; dedupe_log: { title: string; reason: string; kept_id: string; at: string }[];
  extraction_columns: Column[]; ai_second_reviewer: boolean;
};

export type Prisma = {
  identified: { source: string; count: number }[]; identified_total: number; duplicates: number; screened: number; excluded_title: number;
  awaiting_title: number; conflicts_title: number; sought: number; assessed: number; not_retrieved?: number; excluded_full: { reason: string; count: number }[];
  excluded_full_total: number; awaiting_full: number; conflicts_full: number; included: number;
};

export type Agreement = { n: number; percent: number | null; kappa: number | null; label: string | null; with: string };

export type ReviewState = {
  review: Review; role: string; can_edit: boolean; me: string; can_adjudicate?: boolean;
  appraisal_templates?: Record<string, { label: string; fields: [string, string][] }>;
  preset: { label: string; framework: string; reasons: string[]; note: string };
  frameworks: Record<string, [string, string][]>;
  reviewers: { id: string; name: string }[]; dual: boolean; ai_second: boolean;
  records: SrRecord[]; prisma: Prisma; agreement: { title: Agreement; full: Agreement }; limit: number;
};

export const REVIEW_TYPE_OPTIONS: [string, string][] = [
  ['systematic', 'Systematic review'], ['scoping', 'Scoping review'], ['rapid', 'Rapid review'], ['meta-analysis', 'Meta-analysis'],
  ['mapping', 'Mapping review'], ['qualitative', 'Qualitative evidence synthesis'], ['realist', 'Realist review'], ['living', 'Living systematic review'],
];
export const FRAMEWORK_FIELDS: Record<string, [string, string][]> = {
  PICO: [['population', 'Population'], ['intervention', 'Intervention or exposure'], ['comparison', 'Comparison'], ['outcome', 'Outcomes']],
  PCC: [['population', 'Population'], ['concept', 'Concept'], ['context', 'Context']],
  SPIDER: [['sample', 'Sample'], ['phenomenon', 'Phenomenon of interest'], ['design', 'Design'], ['evaluation', 'Evaluation'], ['research_type', 'Research type']],
};
export const DEFAULT_FRAMEWORK: Record<string, 'PICO' | 'PCC' | 'SPIDER'> = {
  systematic: 'PICO', scoping: 'PCC', rapid: 'PICO', 'meta-analysis': 'PICO', mapping: 'PCC', qualitative: 'SPIDER', realist: 'PCC', living: 'PICO',
};
export const DECISION_LABELS: Record<Decision, string> = { include: 'Include', exclude: 'Exclude', maybe: 'Maybe' };
