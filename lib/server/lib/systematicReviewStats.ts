/**
 * Systematic Review rules: review-type presets (framework, exclusion reasons), how reviewers'
 * decisions become a final decision, agreement (Cohen's kappa, percent agreement) and the
 * PRISMA 2020 flow counts. Pure, for tests.
 */

export const REVIEW_TYPES = [
  'systematic', 'scoping', 'rapid', 'meta-analysis', 'mapping', 'qualitative', 'realist', 'living',
] as const;
export type ReviewType = (typeof REVIEW_TYPES)[number];

export const FRAMEWORKS = {
  PICO: [['population', 'Population'], ['intervention', 'Intervention or exposure'], ['comparison', 'Comparison'], ['outcome', 'Outcomes']],
  PCC: [['population', 'Population'], ['concept', 'Concept'], ['context', 'Context']],
  SPIDER: [['sample', 'Sample'], ['phenomenon', 'Phenomenon of interest'], ['design', 'Design'], ['evaluation', 'Evaluation'], ['research_type', 'Research type']],
} as const;
export type Framework = keyof typeof FRAMEWORKS;

const BASE_REASONS = [
  'Wrong population', 'Wrong intervention or exposure', 'Wrong comparator', 'Wrong outcomes', 'Wrong study design', 'Wrong setting',
  'Wrong publication type', 'Not in an included language', 'Outside the date range', 'Full text not available', 'Duplicate report',
];

export const PRESETS: Record<ReviewType, { label: string; framework: Framework; reasons: string[]; note: string }> = {
  systematic: { label: 'Systematic review', framework: 'PICO', reasons: BASE_REASONS, note: 'PRISMA 2020; two reviewers recommended.' },
  scoping: { label: 'Scoping review', framework: 'PCC', reasons: ['Wrong population', 'Wrong concept', 'Wrong context', 'Wrong source type', 'Not in an included language', 'Outside the date range', 'Full text not available', 'Duplicate report'], note: 'PRISMA-ScR; maps the evidence without appraising it.' },
  rapid: { label: 'Rapid review', framework: 'PICO', reasons: BASE_REASONS, note: 'Streamlined: one reviewer with a check of a sample is common.' },
  'meta-analysis': { label: 'Meta-analysis', framework: 'PICO', reasons: [...BASE_REASONS, 'No usable outcome data for pooling'], note: 'Needs comparable outcome data for pooling.' },
  mapping: { label: 'Mapping review', framework: 'PCC', reasons: ['Outside the map’s scope', 'Wrong population', 'Wrong study design', 'Wrong publication type', 'Outside the date range', 'Duplicate report'], note: 'Charts what research exists, with a codebook.' },
  qualitative: { label: 'Qualitative evidence synthesis', framework: 'SPIDER', reasons: ['Not qualitative data', 'Wrong sample', 'Wrong phenomenon of interest', 'Wrong study design', 'Wrong publication type', 'Not in an included language', 'Full text not available', 'Duplicate report'], note: 'ENTREQ; screens for qualitative findings.' },
  realist: { label: 'Realist review', framework: 'PCC', reasons: ['No context–mechanism–outcome insight', 'Wrong programme or intervention', 'Wrong population', 'Wrong publication type', 'Full text not available', 'Duplicate report'], note: 'RAMESES; keeps sources that explain how and why.' },
  living: { label: 'Living systematic review', framework: 'PICO', reasons: BASE_REASONS, note: 'Searches are re-run on a schedule; record each run.' },
};

export type Decision = 'include' | 'exclude' | 'maybe';
export type Stage = 'title' | 'full';
export type Vote = { decision: Decision; reason?: string | null; at?: string };

export type ScreeningRecord = {
  id: string;
  duplicate_of: string | null;
  source: string;
  votes: Partial<Record<Stage, Record<string, Vote>>>;
  ai?: Partial<Record<Stage, { decision: Decision; reason: string; source_revision?: string | null } | null>>;
  resolved?: Partial<Record<Stage, Vote | null>>;
};

export type ReviewerSetup = {
  /** Two reviewers screen each record (a project with editors, or AI as second reviewer). */
  dual: boolean;
  /** AI's suggestions count as the second reviewer. */
  aiSecond: boolean;
};

export type StageState = { status: 'pending' | 'conflict' | 'final'; decision: Decision | null; reason: string | null };

/** A record's final decision at a stage from its votes, the AI's when it is the second reviewer, and any resolution. */
export function stageState(record: ScreeningRecord, stage: Stage, setup: ReviewerSetup): StageState {
  const resolved = record.resolved?.[stage];
  if (resolved) return { status: 'final', decision: resolved.decision, reason: resolved.reason ?? null };
  const votes: Vote[] = Object.values(record.votes?.[stage] ?? {});
  const ai = record.ai?.[stage];
  if (setup.aiSecond && ai) votes.push({ decision: ai.decision, reason: ai.reason });
  if (!votes.length) return { status: 'pending', decision: null, reason: null };
  if (!setup.dual) {
    const vote = Object.values(record.votes?.[stage] ?? {})[0] ?? votes[0];
    return { status: 'final', decision: vote.decision, reason: vote.reason ?? null };
  }
  if (votes.length < 2) return { status: 'pending', decision: null, reason: null };
  const first = votes[0].decision;
  if (votes.every((vote) => vote.decision === first)) return { status: 'final', decision: first, reason: votes.find((vote) => vote.reason)?.reason ?? null };
  return { status: 'conflict', decision: null, reason: null };
}

/** Records that reach full-text screening: included or "maybe" at title and abstract. */
export const passesTitle = (state: StageState) => state.status === 'final' && (state.decision === 'include' || state.decision === 'maybe');

/** Cohen's kappa and percent agreement between two raters' decisions on the same records. */
export function agreement(pairs: [Decision, Decision][]) {
  const n = pairs.length;
  if (!n) return { n: 0, percent: null as number | null, kappa: null as number | null };
  const categories: Decision[] = ['include', 'exclude', 'maybe'];
  const agreeCount = pairs.filter(([a, b]) => a === b).length;
  const po = agreeCount / n;
  const pe = categories.reduce((sum, category) => sum + (pairs.filter(([a]) => a === category).length / n) * (pairs.filter(([, b]) => b === category).length / n), 0);
  const kappa = pe === 1 ? (po === 1 ? 1 : 0) : (po - pe) / (1 - pe);
  return { n, percent: Math.round(po * 1000) / 10, kappa: Math.round(kappa * 1000) / 1000 };
}

/** The usual reading of a kappa (Landis and Koch). */
export function kappaLabel(kappa: number | null): string | null {
  if (kappa === null) return null;
  if (kappa < 0) return 'poor';
  if (kappa <= 0.2) return 'slight';
  if (kappa <= 0.4) return 'fair';
  if (kappa <= 0.6) return 'moderate';
  if (kappa <= 0.8) return 'substantial';
  return 'almost perfect';
}

/** Pairs for kappa between rater `a` and rater `b` ('ai' is the AI's suggestions) at a stage. */
export function ratingPairs(records: ScreeningRecord[], stage: Stage, a: string, b: string): [Decision, Decision][] {
  const vote = (record: ScreeningRecord, rater: string) => (rater === 'ai' ? record.ai?.[stage]?.decision : record.votes?.[stage]?.[rater]?.decision);
  const pairs: [Decision, Decision][] = [];
  for (const record of records) {
    if (record.duplicate_of) continue;
    const left = vote(record, a);
    const right = vote(record, b);
    if (left && right) pairs.push([left, right]);
  }
  return pairs;
}

export type Prisma = {
  identified: { source: string; count: number }[];
  identified_total: number;
  duplicates: number;
  screened: number;
  excluded_title: number;
  awaiting_title: number;
  conflicts_title: number;
  sought: number;
  assessed: number;
  not_retrieved: number;
  excluded_full: { reason: string; count: number }[];
  excluded_full_total: number;
  awaiting_full: number;
  conflicts_full: number;
  included: number;
};

/** PRISMA 2020 flow counts from the records as they stand. */
export function prismaCounts(records: ScreeningRecord[], setup: ReviewerSetup): Prisma {
  const bySource = new Map<string, number>();
  for (const record of records) bySource.set(record.source, (bySource.get(record.source) ?? 0) + 1);
  const unique = records.filter((record) => !record.duplicate_of);
  let excludedTitle = 0; let awaitingTitle = 0; let conflictsTitle = 0; let sought = 0; let assessed = 0; let notRetrieved = 0; let awaitingFull = 0; let conflictsFull = 0; let included = 0;
  const reasons = new Map<string, number>();
  for (const record of unique) {
    const title = stageState(record, 'title', setup);
    if (title.status === 'pending') { awaitingTitle += 1; continue; }
    if (title.status === 'conflict') { conflictsTitle += 1; continue; }
    if (!passesTitle(title)) { excludedTitle += 1; continue; }
    sought += 1;
    const full = stageState(record, 'full', setup);
    if (full.status === 'pending' || full.decision === 'maybe') { awaitingFull += 1; continue; }
    if (full.status === 'conflict') { conflictsFull += 1; continue; }
    if (full.decision === 'exclude' && /^full text not available(?:$|:)/i.test(full.reason || '')) { notRetrieved += 1; continue; }
    assessed += 1;
    if (full.decision === 'include') included += 1;
    else {
      const reason = full.reason || 'No reason given';
      reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
    }
  }
  const excludedFull = [...reasons.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);
  return {
    identified: [...bySource.entries()].map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count),
    identified_total: records.length,
    duplicates: records.length - unique.length,
    screened: unique.length,
    excluded_title: excludedTitle,
    awaiting_title: awaitingTitle,
    conflicts_title: conflictsTitle,
    sought,
    assessed,
    not_retrieved: notRetrieved,
    excluded_full: excludedFull,
    excluded_full_total: excludedFull.reduce((sum, item) => sum + item.count, 0),
    awaiting_full: awaitingFull,
    conflicts_full: conflictsFull,
    included,
  };
}
