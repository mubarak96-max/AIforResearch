/**
 * What every scholarly source returns: one paper shape, whatever the service, so results from
 * OpenAlex, PubMed, Europe PMC, arXiv and Semantic Scholar can be merged, filtered and cited
 * together.
 */
import type { RichPaper } from '../../slots/papers.js';

/**
 * The source groups people pick from. "papers" is the general index (OpenAlex and Semantic Scholar);
 * "dblp" is computer science. "life-sciences" and "chemistry" are not paper indexes: Deep Research
 * cites their database records (genes, proteins, compounds…) next to the papers (sources/records.ts).
 */
export const SOURCE_GROUPS = ['papers', 'medical', 'preprints', 'trials', 'datasets', 'dblp', 'web', 'library', 'life-sciences', 'chemistry'] as const;
export type SourceGroup = (typeof SOURCE_GROUPS)[number];

/** The groups that return database records instead of papers (Deep Research only). */
export const RECORD_GROUPS = ['life-sciences', 'chemistry'] as const;
export type RecordGroup = (typeof RECORD_GROUPS)[number];
export const isRecordGroup = (group: string): group is RecordGroup => (RECORD_GROUPS as readonly string[]).includes(group);

/** The services behind the groups. */
export type ProviderId = 'openalex' | 'semantic_scholar' | 'core' | 'pubmed' | 'europepmc' | 'arxiv' | 'clinicaltrials' | 'datacite' | 'dblp' | 'web' | 'library';

/** The databases behind the record groups. */
export type RecordDatabase = 'ncbi_gene' | 'uniprot' | 'ensembl' | 'reactome' | 'pdb' | 'alphafold' | 'gwas' | 'clinvar' | 'pubchem' | 'chembl';

/**
 * One database record (a gene, protein, structure, pathway, variant or compound) that a research
 * answer can number and cite like a paper. `summary` is short structured text the model reads.
 */
export type RecordSource = {
  /** `record:<database>:<identifier>`, unique across databases. */
  id: string;
  database: RecordDatabase;
  /** As shown to people and the model ("UniProt", "NCBI Gene"). */
  database_name: string;
  group: RecordGroup;
  /** The database's own identifier (P38398, CID 2244, VCV000055361). */
  identifier: string;
  title: string;
  url: string;
  summary: string;
};

export const STUDY_TYPES = [
  'meta-analysis', 'systematic-review', 'rct', 'clinical-trial', 'cohort', 'case-control', 'cross-sectional',
  'qualitative', 'case-report', 'review', 'experiment', 'other',
] as const;
export type StudyType = (typeof STUDY_TYPES)[number];

export const STUDY_TYPE_LABELS: Record<StudyType, string> = {
  'meta-analysis': 'Meta-analysis',
  'systematic-review': 'Systematic review',
  rct: 'Randomized controlled trial',
  'clinical-trial': 'Clinical trial',
  cohort: 'Cohort study',
  'case-control': 'Case-control study',
  'cross-sectional': 'Cross-sectional study',
  qualitative: 'Qualitative study',
  'case-report': 'Case report',
  review: 'Review',
  experiment: 'Experiment',
  other: 'Other',
};

/** Journal standing from the index's journal statistics (OpenAlex h-index), never a guess. */
export type JournalTier = 'top' | 'high' | 'medium' | 'low';
export const JOURNAL_TIER_ORDER: JournalTier[] = ['top', 'high', 'medium', 'low'];

export type FoundPaper = RichPaper & {
  /** Every service that returned it. */
  providers: ProviderId[];
  pmid: string | null;
  pmcid: string | null;
  arxiv_id: string | null;
  /** A page to open the paper on (DOI link, PubMed, arXiv…). */
  url: string | null;
  study_type: StudyType | null;
  is_preprint: boolean;
  journal: { name: string | null; h_index: number | null; tier: JournalTier | null; source_id?: string } | null;
  /** A one-line summary when the service gives one (Semantic Scholar TLDR). */
  tldr: string | null;
  /** Ranking score after merging (higher first). */
  score?: number;
};

export type WebResult = { id: string; title: string; url: string; site: string; snippet: string; published: string | null };

export type SearchFilters = {
  fromYear?: number;
  toYear?: number;
  studyTypes?: StudyType[];
  openAccess?: boolean;
  minCitations?: number;
  /** Lowest journal tier to keep (papers without journal data are dropped when set). */
  journalTier?: JournalTier;
  /** Default true: retracted papers are left out. */
  excludeRetracted?: boolean;
  excludePreprints?: boolean;
};

export type SearchSort = 'relevance' | 'cited' | 'newest';

export type SearchInput = {
  query: string;
  groups: SourceGroup[];
  filters?: SearchFilters;
  /** Papers wanted after merging (each service is asked for about this many). */
  limit?: number;
  sort?: SearchSort;
  /** Library documents to search when "library" is chosen (empty: the whole Library). */
  libraryDocumentIds?: string[];
};

export type SearchOutput = {
  papers: FoundPaper[];
  web: WebResult[];
  /** Results per service before merging, for the "searched" line. */
  counts: Partial<Record<ProviderId, number>>;
  /** Services that failed (the search still answers with the rest). */
  errors: { provider: ProviderId; message: string }[];
};

/** A blank FoundPaper for providers to fill. */
export function emptyPaper(id: string, provider: ProviderId): FoundPaper {
  return {
    id, title: 'Untitled', authors: [], year: null, venue: null, doi: null, abstract: null, cited_by_count: null, is_oa: false,
    oa_url: null, pdf_url: null, type: null, providers: [provider], pmid: null, pmcid: null, arxiv_id: null, url: null,
    study_type: null, is_preprint: false, journal: null, tldr: null, is_retracted: false, publication_date: null,
  };
}
