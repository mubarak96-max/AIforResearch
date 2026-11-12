/** Research task choices shared by the composer and the research pipeline. */
export const RESEARCH_METHODS = ['general', 'clinical', 'qualitative', 'humanities', 'policy', 'quantitative'] as const;
export type ResearchMethod = (typeof RESEARCH_METHODS)[number];

export const RESEARCH_METHOD_LABELS: Record<ResearchMethod, string> = {
  general: 'General research', clinical: 'Clinical interventions', qualitative: 'Qualitative inquiry',
  humanities: 'Humanities and primary texts', policy: 'Policy and programme evidence', quantitative: 'Quantitative research',
};

export const RANKING_DESCRIPTIONS: Record<ResearchMethod, string> = {
  general: 'Question relevance; no automatic preference for a study design, publication date, citation count or journal.',
  clinical: 'Relevance 45%, study design 25%, citations a year 15%, recency 8%, journal 7%. This is a retrieval ranking, not a risk-of-bias or certainty assessment.',
  qualitative: 'Question relevance 85%, qualitative-method fit 15%. Citation counts, journal standing and recency do not determine interpretive value.',
  humanities: 'Question relevance only. Older primary texts and less-cited sources are not penalised for their age or citation count.',
  policy: 'Question relevance 95%, recency 5%. Assess applicability, implementation and context when reading; this score cannot establish them.',
  quantitative: 'Question relevance 95%, recency 5%. Assess design, measurement, assumptions and uncertainty when reading; this score cannot establish them.',
};

export function researchMethod(value?: string | null): ResearchMethod {
  return RESEARCH_METHODS.includes(value as ResearchMethod) ? value as ResearchMethod : 'general';
}

export function appraisalGuidance(method?: ResearchMethod | null): string {
  const common = 'Appraise each source for the question, its methods, limitations and applicability. Citation counts and journal standing do not establish validity. Distinguish source observations, author interpretations and your synthesis. Do not treat a count of supporting papers as a pooled effect or certainty rating.';
  const guidance: Record<ResearchMethod, string> = {
    general: 'Use the method appropriate to the question; do not impose a single hierarchy of evidence across fields. Explain why each design can or cannot answer the question.',
    clinical: 'For intervention effects, consider appropriate controlled studies and systematic reviews alongside risk of bias, precision, directness, harms and patient-important outcomes. A review is not automatically strong evidence. Do not infer patient-specific treatment advice.',
    qualitative: 'Assess sampling, context, reflexivity, methodological coherence and the link from participant evidence to interpretation. Preserve negative cases and divergent accounts. Do not equate frequency with importance or rank qualitative accounts below trials merely because of design.',
    humanities: 'Distinguish primary texts and later interpretations. Attend to provenance, edition, date, translation, historical context and competing readings. Do not prefer newer or more-cited work simply for being newer or more-cited; do not apply a clinical evidence hierarchy.',
    policy: 'Assess the policy question, population, implementation setting, applicability, costs, distributional effects, source date and uncertainty. Separate observed outcomes from forecasts and recommendations. Identify conflicting definitions and missing implementation evidence.',
    quantitative: 'Assess the estimand, design, sampling, measurement, confounding, missingness, model assumptions, effect size and uncertainty. Distinguish association from causation and prediction from explanation. Do not favour trials for a question they cannot answer.',
  };
  return `${common} ${guidance[researchMethod(method)]}`;
}

/** Search language follows the user's sources and task; no country-based inference or restriction. */
export function searchLanguageGuidance(languages?: string[]): string {
  const selected = [...new Set((languages ?? []).map((language) => language.trim().slice(0, 60)).filter(Boolean))].slice(0, 8);
  return selected.length
    ? `Write search queries across the user-selected source languages: ${selected.join(', ')}. Preserve proper names and original terminology. Spread queries across those languages; do not silently translate every query into English.`
    : 'Use the language of the question and, where useful for source discovery, alternate terminology in other relevant source languages. Preserve proper names and original terminology; do not require English for every query.';
}
