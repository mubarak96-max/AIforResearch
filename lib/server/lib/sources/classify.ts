/**
 * Study type from what the services say (PubMed publication types, Europe PMC and Semantic
 * Scholar types, OpenAlex work type) and, failing that, from the title. Pure, for tests.
 */
import type { StudyType } from './types.js';

/** Labels the services use, lower case, mapped to a study type. Most specific first. */
const LABELS: [RegExp, StudyType][] = [
  [/meta-?analysis/, 'meta-analysis'],
  [/systematic review/, 'systematic-review'],
  [/randomi[sz]ed controlled trial|^rct$/, 'rct'],
  [/clinical ?trial|controlled clinical trial|clinicaltrial/, 'clinical-trial'],
  [/case reports?|casereport/, 'case-report'],
  [/observational study|cohort/, 'cohort'],
  [/^review$|review article|scoping review|narrative review|literature review/, 'review'],
];

/** Title words, most specific first. "Meta-analysis" beats "randomized" in "a meta-analysis of randomized trials". */
const TITLE: [RegExp, StudyType][] = [
  [/\bmeta-?analy[sz](?:is|es)\b|\bnetwork meta\b/i, 'meta-analysis'],
  [/\bsystematic (?:literature )?review\b|\bumbrella review\b/i, 'systematic-review'],
  [/\brandomi[sz]ed\b.*\b(?:trial|study)\b|\b(?:double|single)[- ]blind\b|\bRCT\b/, 'rct'],
  [/\b(?:phase (?:i{1,3}|[1-4])|clinical) trial\b/i, 'clinical-trial'],
  [/\bcase[- ]control\b/i, 'case-control'],
  [/\bcohort\b|\blongitudinal\b|\bprospective study\b|\bretrospective study\b/i, 'cohort'],
  [/\bcross[- ]sectional\b|\bsurvey of\b|\bnational survey\b/i, 'cross-sectional'],
  [/\bqualitative\b|\binterviews?\b|\bfocus groups?\b|\bthematic analysis\b|\bethnograph/i, 'qualitative'],
  [/\bcase (?:report|series)\b/i, 'case-report'],
  [/\b(?:scoping|narrative|literature|integrative|critical) review\b|\ba review\b|^review\b|\boverview of\b/i, 'review'],
  [/\bexperiments?\b|\bexperimental\b/i, 'experiment'],
];

export function classifyStudy(input: { title?: string | null; labels?: (string | null | undefined)[] }): StudyType | null {
  const labels = (input.labels ?? []).filter(Boolean).map((label) => String(label).toLowerCase().trim());
  // Labels first, most specific type wins whatever order the service lists them in.
  for (const [pattern, type] of LABELS) if (labels.some((label) => pattern.test(label))) return type;
  const title = input.title || '';
  for (const [pattern, type] of TITLE) if (pattern.test(title)) return type;
  return null;
}

/** Normalized title for de-duplication: lower case letters and digits only. */
export const titleKey = (title: string | null | undefined) => (title || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '').slice(0, 160);

/** A DOI in lower case without its resolver prefix, or null. */
export function doiKey(doi: string | null | undefined): string | null {
  const value = String(doi ?? '').trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:/i, '').toLowerCase();
  return /^10\.\d{4,9}\//.test(value) ? value : null;
}
