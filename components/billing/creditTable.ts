/**
 * What each job costs, in the words of the pricing page. The numbers are the server's
 * CREDIT_COSTS (lib/server/lib/plans.ts); keep the two in step.
 */
export const CREDIT_TABLE: { job: string; credits: string; note?: string }[] = [
  { job: 'Summary answer, chat or PDF question, AI edit', credits: '1' },
  { job: 'Short piece (research email, ethics statement, diagram, progress summary)', credits: '1' },
  { job: 'Editor check (claim check, proofread, tone)', credits: '2' },
  { job: 'Section, abstract, outline or gap analysis', credits: '3' },
  { job: 'Deep Research report', credits: '15', note: '45+ papers, figures, a gap search, every citation checked' },
  { job: 'Document review', credits: '10', note: 'per 10,000 words' },
  { job: 'Reporting-guideline check', credits: '5', note: 'CONSORT, STROBE, PRISMA, CARE and more; per 10,000 words' },
  { job: 'Slide deck', credits: '10' },
  { job: 'Full draft: paper, proposal, literature review', credits: '10–15' },
  { job: 'Detailed report', credits: '45', note: '90+ papers, figures and a study table, plan reviewed first, paid plans' },
  { job: 'Data Lab analysis with AI', credits: '2' },
  { job: 'Systematic review AI screening', credits: '1', note: 'per 25 records' },
  { job: 'High-quality mode', credits: '× 3', note: 'Pro' },
  { job: 'Paper search, filters, citations, Library, editor, exports', credits: '0' },
];

/** The extras sold once, shown on the pricing page and dialog. */
export const EXTRAS = [
  { id: 'topup_500', name: '500 credits', price: '$7', detail: 'For paid plans. Kept 12 months.' },
  { id: 'topup_2000', name: '2,000 credits', price: '$24', detail: 'For paid plans. Kept 12 months.' },
  { id: 'pass_defence', name: 'Defence Pass', price: '$49 once', detail: '90 days of Pro for the last stretch of a thesis. It does not renew.' },
];
