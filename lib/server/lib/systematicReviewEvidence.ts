/** Review evidence helpers shared by the API and its tests. No country-specific defaults. */
import type { ScreeningRecord, Stage } from './systematicReviewStats.js';

export type EvidencePage = { page: number | null; text: string; order: number };
export type FullTextSnapshot = {
  revision: string; library_document_id: string; title: string; sha256: string;
  pages: number; characters: number; attached_by: string; attached_at: string;
};
export type ExtractionCell = {
  value: string; quote?: string | null; page?: number | null; ai?: boolean;
  status?: 'verified_quote' | 'not_reported' | 'unverified' | 'manual';
  source_revision?: string | null;
};

/** A deliberately bounded full-text operation must not silently fall back to an abstract. */
export const MAX_AI_FULL_TEXT_CHARS = 100_000;
export const compactWhitespace = (text: string) => text.replace(/\s+/gu, ' ').trim();

export function checkedExtraction(value: unknown, quote: unknown, page: unknown, pages: EvidencePage[], revision: string): ExtractionCell {
  const answer = typeof value === 'string' ? value.trim().slice(0, 2000) : '';
  const excerpt = typeof quote === 'string' ? compactWhitespace(quote).slice(0, 1000) : '';
  if (!answer || /^not reported[.!]?$/i.test(answer)) return { value: 'Not reported', quote: null, page: null, ai: true, status: 'not_reported', source_revision: revision };
  const number = typeof page === 'number' && Number.isInteger(page) && page > 0 ? page : null;
  const found = excerpt.length >= 8 ? pages.find((item) => (number === null || item.page === number) && compactWhitespace(item.text).includes(excerpt)) : null;
  if (!found) return { value: 'Unverified — inspect the full text', quote: null, page: null, ai: true, status: 'unverified', source_revision: revision };
  return { value: answer, quote: excerpt, page: found.page, ai: true, status: 'verified_quote', source_revision: revision };
}

/** Hide both peer and AI opinions until this reviewer has submitted their own decision. */
export function blindedRecord<T extends ScreeningRecord>(record: T, userId: string, blind: boolean): T {
  if (!blind) return record;
  const result = { ...record, votes: { ...record.votes }, ai: { ...record.ai }, resolved: { ...record.resolved } };
  for (const stage of ['title', 'full'] as Stage[]) {
    if (record.votes?.[stage]?.[userId]) continue;
    result.votes[stage] = {};
    delete result.ai[stage];
    delete result.resolved[stage];
  }
  return result;
}

/** Assisted appraisal prompts, not scores or claims of implementing a named validated instrument. */
export const APPRAISAL_TEMPLATES = {
  intervention: { label: 'Intervention study', fields: [['randomisation', 'Assignment to groups'], ['allocation', 'Allocation concealment'], ['blinding', 'Awareness of assignment'], ['missing_data', 'Missing outcome data'], ['measurement', 'Outcome measurement'], ['selective_reporting', 'Selective reporting']] },
  observational: { label: 'Observational study', fields: [['confounding', 'Confounding'], ['selection', 'Participant selection'], ['measurement', 'Exposure and outcome measurement'], ['missing_data', 'Missing data'], ['selective_reporting', 'Selective reporting']] },
  qualitative: { label: 'Qualitative study', fields: [['method_fit', 'Fit between question and method'], ['sampling', 'Sampling and context'], ['reflexivity', 'Researcher reflexivity'], ['analytic_transparency', 'Analytic transparency'], ['negative_cases', 'Disconfirming evidence'], ['ethics', 'Ethics and consent']] },
  documentary: { label: 'Documentary or policy evidence', fields: [['authenticity', 'Source authenticity'], ['purpose', 'Purpose and perspective'], ['context', 'Context and applicability'], ['corroboration', 'Corroborating evidence'], ['currency', 'Version and effective date']] },
} as const;
export type AppraisalTemplate = keyof typeof APPRAISAL_TEMPLATES;
export const APPRAISAL_FIELDS = [...new Set(Object.values(APPRAISAL_TEMPLATES).flatMap((template) => template.fields.map(([id]) => id)))];
