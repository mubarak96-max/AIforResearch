/**
 * Task workbooks share evidence, but keep the data needed by each method explicit.
 * (Module and Firestore collection keep the original "workflows" name; users see "Workbooks".)
 */
export const WORKFLOW_KINDS = ['research', 'qualitative', 'study', 'policy', 'finance', 'humanities', 'technical'] as const;
export type WorkflowKind = typeof WORKFLOW_KINDS[number];

/**
 * The literature-review chain (research) and qualitative analysis are the supported workbooks.
 * Other audiences stay switched off until user research shows demand.
 * Existing workbooks of any kind remain readable and editable.
 */
export const CORE_WORKBOOK_KINDS: readonly WorkflowKind[] = ['research', 'qualitative'];
/**
 * Fixed in code, not read from the environment. Set expansionWorkbooks to true to offer the study,
 * policy, finance, humanities and R&D workbooks and the World Bank, ReliefWeb and SEC connectors.
 * (Tests switch it on and off directly.)
 */
export const WORKBOOK_FEATURES = { expansionWorkbooks: false };
export const expansionWorkbooksEnabled = () => WORKBOOK_FEATURES.expansionWorkbooks;
export function availableWorkbookKinds(): WorkflowKind[] {
  return expansionWorkbooksEnabled() ? [...WORKFLOW_KINDS] : [...CORE_WORKBOOK_KINDS];
}

export type WorkflowField = {
  key: string; label: string;
  /** `hidden` values are set by imports (Library or review links) and never shown as form inputs. */
  type?: 'text' | 'long' | 'number' | 'date' | 'source' | 'select' | 'hidden';
  required?: boolean; options?: string[]; help?: string; max?: number;
};
export type WorkbookLinkKind = 'matrix' | 'document' | 'review';
export type WorkbookLink = { kind: WorkbookLinkKind; id: string; title: string; at: string; by: string };
export const WORKBOOK_LINK_HREF: Record<WorkbookLinkKind, (id: string) => string> = {
  matrix: (id) => `/matrix/${encodeURIComponent(id)}`,
  document: (id) => `/editor?doc=${encodeURIComponent(id)}`,
  review: (id) => `/systematic-review/${encodeURIComponent(id)}`,
};
export const CONSENT_OPTIONS = ['public', 'approved private use', 'de-identified with permission'] as const;
export type WorkflowSection = { key: string; title: string; description: string; fields: WorkflowField[] };
export type WorkbookEntry = { id: string; section: string; values: Record<string, string>; created_at: string; updated_at: string; updated_by: string };
export type RecallState = { card_id: string; user_id: string; repetitions: number; interval_days: number; due_at: string; reviewed_at: string; rating: 'again' | 'hard' | 'good' | 'easy'; response: string };
export type Workbook = {
  id: string; owner_user_id: string; project_id: string | null; kind: WorkflowKind; title: string; question: string; language: string; deadline: string;
  deliverable?: string; audience?: string; success_criteria?: string; source_constraints?: string;
  revision: number; status: 'draft' | 'in_review' | 'approved' | 'changes_requested'; review_note: string; reviewed_by: string | null; reviewed_at: string | null;
  entries: WorkbookEntry[];
  /** Only the viewer's own recall history; stored per user, outside the shared workbook document. */
  recalls: RecallState[];
  links?: WorkbookLink[];
  created_at: string; updated_at: string; role?: 'owner' | 'edit' | 'comment' | 'view';
};
export type WorkbookEvent = { id: string; action: string; user_id: string; at: string; revision: number; note: string; entry_id: string | null; review_note?: string; redacted_at?: string; redacted_by?: string };
export type WorkbookMilestone = { id: string; title: string; due: string; status: string };
export type WorkbookReminder = { id: string; title: string; due: string; urgency: 'overdue' | 'today' | 'soon'; section?: 'milestones' };

/** In-app reminders use the viewer's calendar date, with no location preference or scheduler. */
export function workbookReminders(workbook: Pick<Workbook, 'id' | 'title' | 'deadline' | 'status'> & { milestones?: WorkbookMilestone[] }, today?: string): WorkbookReminder[] {
  const now = new Date(); const date = today || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const until = new Date(Date.parse(`${date}T00:00:00Z`) + 7 * 86400000).toISOString().slice(0, 10);
  const items = [
    ...(workbook.deadline && workbook.status !== 'approved' ? [{ id: `${workbook.id}:deadline`, title: `${workbook.title}: deadline`, due: workbook.deadline }] : []),
    ...(workbook.milestones || []).filter((item) => item.due && item.status !== 'completed').map((item) => ({ id: `${workbook.id}:${item.id}`, title: `${workbook.title}: ${item.title}`, due: item.due, section: 'milestones' as const })),
  ];
  return items.filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.due) && item.due <= until).map((item) => ({ ...item, urgency: item.due < date ? 'overdue' as const : item.due === date ? 'today' as const : 'soon' as const })).sort((a, b) => a.due.localeCompare(b.due));
}

const field = (key: string, label: string, extra: Omit<WorkflowField, 'key' | 'label'> = {}): WorkflowField => ({ key, label, ...extra });
const source = field('source_id', 'Supporting source', { type: 'source' });
const quote = field('quote', 'Exact supporting passage', { type: 'long', help: 'Copied exactly from the source text. The saved passage is checked against that text.' });
const locator = field('locator', 'Page, line, table or timestamp');
const sources: WorkflowSection = {
  key: 'sources', title: 'Sources', description: 'Keep the original text, edition and provenance with your work. Import your own Library material or add a source.',
  fields: [field('title', 'Title / participant label', { required: true }), field('kind', 'Source type', { type: 'select', options: ['scholarly', 'transcript', 'primary', 'secondary', 'filing', 'dataset', 'policy', 'patent', 'standard', 'other'], required: true }),
    field('text', 'Source text', { type: 'long', max: 160000 }), field('reference', 'URL, DOI or archive reference'), field('edition', 'Edition / version'), field('published', 'Publication or reporting date'), field('language', 'Original language'),
    field('consent', 'Permission to use', { type: 'select', options: [...CONSENT_OPTIONS], required: true }),
    field('access_note', 'Access and reuse notes', { type: 'long' }),
    field('library_id', 'Library document', { type: 'hidden', max: 80 }),
    field('origin', 'Imported from', { type: 'hidden', max: 200 })],
};
const memos: WorkflowSection = { key: 'memos', title: 'Memos', description: 'Record reasoning, uncertainty and decisions in your own words.', fields: [field('title', 'Title', { required: true }), field('text', 'Memo', { type: 'long', required: true }), source] };
const milestones: WorkflowSection = { key: 'milestones', title: 'Milestones', description: 'Plan the work, record what counts as finished, and update progress as you review it.', fields: [field('title', 'Milestone', { required: true }), field('due', 'Due date', { type: 'date' }), field('status', 'Progress', { type: 'select', options: ['planned', 'in progress', 'ready for review', 'completed'], required: true }), field('acceptance', 'Acceptance criteria', { type: 'long', required: true }), field('evidence', 'Completion evidence and next action', { type: 'long' })] };

export const WORKFLOW_CATALOG: Record<WorkflowKind, { title: string; description: string; outcome: string; sections: WorkflowSection[] }> = {
  technical: {
    title: 'Technical research and R&D', description: 'Compare technical approaches, preserve patent and standards references, and track reproducible benchmarks.', outcome: 'A technical evidence map and evaluation plan',
    sections: [sources,
      { key: 'patents', title: 'Patent references', description: 'Record publication, family and claim references from sources you inspect. This record does not determine validity, infringement or freedom to operate.', fields: [field('publication', 'Publication identifier', { required: true }), field('family', 'Family identifier / reference'), field('priority', 'Priority date', { type: 'date' }), field('applicant', 'Applicant / assignee'), field('claim', 'Claim number / reference', { required: true }), { ...source, required: true }, { ...quote, required: true }, locator, field('observation', 'Technical observation', { type: 'long' }), field('status', 'Reported status and date checked'), field('followup', 'Questions for further review', { type: 'long' })] },
      { key: 'standards', title: 'Standards and versions', description: 'Keep requirements tied to the exact standard version and clause inspected.', fields: [field('standard', 'Standard / specification', { required: true }), field('version', 'Version / edition', { required: true }), field('clause', 'Clause / section', { required: true }), { ...source, required: true }, quote, field('requirement', 'Requirement', { type: 'long', required: true }), field('evidence', 'Implementation evidence or test result', { type: 'long' }), field('state', 'Review status', { type: 'select', options: ['not assessed', 'evidence collected', 'gap identified', 'reviewed'], required: true })] },
      { key: 'benchmarks', title: 'Benchmarks', description: 'Record datasets, code revisions, hardware and evaluation settings beside measured results.', fields: [field('name', 'Experiment / method', { required: true }), field('dataset', 'Dataset reference and version', { required: true }), field('code', 'Code / commit reference'), field('configuration', 'Configuration, environment and seed', { type: 'long', required: true }), field('metric', 'Metric and definition', { required: true }), field('value', 'Measured value', { type: 'number', required: true }), field('unit', 'Unit', { required: true }), field('split', 'Evaluation split / protocol', { required: true }), source, quote, locator, field('limitations', 'Limitations and reproducibility notes', { type: 'long' })] },
      { key: 'comparison', title: 'Technical comparison', description: 'Compare approaches against explicit requirements and evidence, keeping tradeoffs visible.', fields: [field('approach', 'Approach', { required: true }), field('requirement', 'Requirement / evaluation criterion', { required: true }), field('finding', 'Finding', { type: 'long', required: true }), source, quote, locator, field('tradeoffs', 'Tradeoffs and uncertainty', { type: 'long' }), field('next_test', 'Next experiment', { type: 'long' })] }, milestones, memos],
  },
  research: {
    title: 'Research and critical appraisal', description: 'Plan a research deliverable, inspect methods and limitations, and assemble evidence before drafting.', outcome: 'A research brief, thesis plan or journal-club appraisal',
    sections: [sources,
      { key: 'findings', title: 'Evidence notes', description: 'Preserve exact evidence beside your interpretation and applicability to the question.', fields: [field('claim', 'Finding', { required: true }), { ...source, required: true }, { ...quote, required: true }, locator, field('interpretation', 'Interpretation', { type: 'long' }), field('applicability', 'Applicability to this question', { type: 'long' }), field('uncertainty', 'Uncertainty and competing evidence', { type: 'long' })] },
      { key: 'appraisal', title: 'Critical appraisal', description: 'Record the design, sample, outcomes and limitations of each source. This is a transparent appraisal, not an automated quality score.', fields: [{ ...source, required: true }, field('design', 'Study design / method', { required: true }), field('sample', 'Population / material and sampling', { type: 'long' }), field('comparison', 'Intervention / exposure and comparison', { type: 'long' }), field('outcomes', 'Outcomes and measures', { type: 'long' }), field('findings', 'Results and effect estimates', { type: 'long' }), quote, locator, field('bias', 'Bias and limitations', { type: 'long', required: true }), field('applicability', 'Applicability and unresolved questions', { type: 'long' })] },
      { key: 'outline', title: 'Deliverable outline', description: 'Map sections to questions, evidence and what remains to be done.', fields: [field('title', 'Section / chapter', { required: true }), field('purpose', 'Question this section answers', { type: 'long', required: true }), field('argument', 'Argument and counterargument', { type: 'long' }), source, field('next_action', 'Missing evidence / next action', { type: 'long' })] }, milestones, memos],
  },
  qualitative: {
    title: 'Qualitative analysis', description: 'Code interviews, inspect negative cases and develop findings with the original excerpts.', outcome: 'A findings report and coding evidence',
    sections: [sources,
      { key: 'codes', title: 'Codebook', description: 'Define what each code includes and excludes. Keep your interpretation explicit.', fields: [field('label', 'Code', { required: true }), field('definition', 'Definition', { type: 'long', required: true }), field('include', 'Include when', { type: 'long' }), field('exclude', 'Exclude when', { type: 'long' })] },
      { key: 'excerpts', title: 'Coded excerpts', description: 'Attach codes to exact passages. Mark negative cases instead of removing them.', fields: [{ ...source, required: true }, { ...quote, required: true }, locator, field('speaker', 'Speaker label'), field('codes', 'Codes', { help: 'Code labels separated by commas.' }), field('negative_case', 'Evidence direction', { type: 'select', options: ['supports', 'negative case', 'mixed / uncertain'], required: true }), field('interpretation', 'Interpretation', { type: 'long' })] },
      { key: 'themes', title: 'Themes', description: 'Develop themes from coded excerpts; decisions remain yours.', fields: [field('name', 'Theme', { required: true }), field('meaning', 'Central meaning', { type: 'long', required: true }), field('codes', 'Related codes'), field('evidence', 'Supporting and contradictory excerpt IDs', { type: 'long' }), field('status', 'Review state', { type: 'select', options: ['candidate', 'reviewed', 'rejected'], required: true })] }, memos],
  },
  study: {
    title: 'Study and assignments', description: 'Work from learning objectives and rubrics, then practise recall with source-linked explanations.', outcome: 'An assignment evidence plan and revision queue',
    sections: [sources,
      { key: 'objectives', title: 'Learning objectives', description: 'Use the outcomes from your course or define the skills you need to demonstrate.', fields: [field('objective', 'Learning objective', { required: true }), field('success', 'How I will demonstrate it', { type: 'long' }), field('level', 'Current understanding', { type: 'select', options: ['new', 'developing', 'confident'], required: true })] },
      { key: 'rubric', title: 'Assignment rubric', description: 'Track criteria, feedback and actions against your assignment requirements.', fields: [field('criterion', 'Criterion', { required: true }), field('weight', 'Weight / marks', { type: 'number' }), field('evidence', 'Evidence in my work', { type: 'long' }), field('feedback', 'Feedback and next action', { type: 'long' }), field('ai_rules', 'Course rules for AI assistance', { type: 'long' })] },
      { key: 'arguments', title: 'Argument plan', description: 'Build an argument and address competing interpretations before drafting.', fields: [field('claim', 'Claim', { required: true }), source, quote, locator, field('counterargument', 'Counterargument', { type: 'long' }), field('response', 'My reasoning', { type: 'long' })] },
      { key: 'cards', title: 'Practice and recall', description: 'Write a question and an answer with its explanation. Review due questions without seeing the answer first.', fields: [field('question', 'Question', { required: true }), field('answer', 'Answer and explanation', { type: 'long', required: true }), field('objective', 'Learning objective'), source, quote, locator] }, memos],
  },
  policy: {
    title: 'Policy and programme evidence', description: 'Compare options, track programme indicators and prepare a brief for review.', outcome: 'An evidence brief and programme results table',
    sections: [sources,
      { key: 'options', title: 'Policy options', description: 'Compare benefits, costs, implementation and who may be affected.', fields: [field('name', 'Option', { required: true }), field('benefits', 'Benefits and evidence', { type: 'long', required: true }), field('costs', 'Costs, units and assumptions', { type: 'long' }), field('risks', 'Risks and uncertainty', { type: 'long' }), field('equity', 'Distribution and equity', { type: 'long' }), field('implementation', 'Implementation requirements', { type: 'long' }), source, quote, locator] },
      { key: 'indicators', title: 'Indicators', description: 'Compare baseline, target and actual using the same definition, scope, period and unit.', fields: [field('name', 'Indicator', { required: true }), field('definition', 'Definition / methodology', { type: 'long', required: true }), field('scope', 'Population / scope'), field('unit', 'Unit', { required: true }), field('period', 'Reporting period', { required: true }), field('baseline', 'Baseline', { type: 'number' }), field('target', 'Target', { type: 'number' }), field('actual', 'Actual', { type: 'number' }), field('disaggregation', 'Disaggregation'), source, locator] },
      { key: 'logframe', title: 'Theory of change', description: 'Connect activities to outputs and outcomes, and state the assumptions in each link.', fields: [field('level', 'Level', { type: 'select', options: ['activity', 'output', 'outcome', 'impact'], required: true }), field('result', 'Result', { required: true }), field('indicator', 'Linked indicator'), field('assumptions', 'Assumptions', { type: 'long' }), field('verification', 'How to verify', { type: 'long' })] },
      { key: 'brief', title: 'Brief', description: 'Write the decision, supporting evidence and remaining uncertainty for your intended audience.', fields: [field('title', 'Section', { required: true }), field('text', 'Text', { type: 'long', required: true }), source, quote, locator] }, memos],
  },
  finance: {
    title: 'Financial research', description: 'Compare reported metrics with explicit periods, units, currencies and source passages.', outcome: 'A company comparison and investment research memo',
    sections: [sources,
      { key: 'metrics', title: 'Reported metrics', description: 'Keep reported facts distinct from assumptions. Comparisons only group matching metric definitions, periods, units and currencies.', fields: [field('company', 'Company', { required: true }), field('metric', 'Metric', { required: true }), field('definition', 'Definition / accounting basis', { required: true }), field('value', 'Reported value', { type: 'number', required: true }), field('unit', 'Unit / scale', { required: true }), field('currency', 'Currency (or N/A)', { required: true }), field('period', 'Fiscal period', { required: true }), field('filed_at', 'Filing date', { type: 'date', required: true }), field('basis', 'Version', { type: 'select', options: ['as reported', 'restated'], required: true }), { ...source, required: true }, { ...quote, required: true }, { ...locator, required: true }] },
      { key: 'scenarios', title: 'Scenario assumptions', description: 'Keep estimated values and assumptions separate from reported metrics.', fields: [field('scenario', 'Scenario', { required: true }), field('assumption', 'Assumption', { type: 'long', required: true }), field('value', 'Assumed value', { type: 'number' }), field('unit', 'Unit / currency'), field('period', 'Period'), field('rationale', 'Rationale and sensitivity', { type: 'long' }), source] },
      { key: 'memo', title: 'Research memo', description: 'Explain your thesis, counter-evidence and unresolved questions.', fields: [field('title', 'Section', { required: true }), field('text', 'Analysis', { type: 'long', required: true }), source, quote, locator] }, memos],
  },
  humanities: {
    title: 'Humanities and primary sources', description: 'Preserve editions and original quotations while developing interpretations and counter-readings.', outcome: 'An annotated source collection and argument',
    sections: [sources,
      { key: 'annotations', title: 'Close reading', description: 'Keep the exact quotation separate from your translation and interpretation.', fields: [{ ...source, required: true }, { ...quote, required: true }, { ...locator, required: true }, field('translation', 'Translation (optional)', { type: 'long' }), field('interpretation', 'Interpretation', { type: 'long', required: true }), field('context', 'Historical / textual context', { type: 'long' }), field('counterreading', 'Alternative interpretation', { type: 'long' })] },
      { key: 'arguments', title: 'Argument', description: 'Connect your interpretation to evidence and acknowledge unresolved tensions.', fields: [field('claim', 'Claim', { required: true }), source, quote, locator, field('reasoning', 'Reasoning', { type: 'long', required: true }), field('limits', 'Counter-evidence and limits', { type: 'long' })] }, memos],
  },
};

export function sectionFor(kind: WorkflowKind, section: string): WorkflowSection | undefined {
  return WORKFLOW_CATALOG[kind].sections.find((item) => item.key === section);
}

/**
 * Quotations are compared with page markers removed and whitespace collapsed, so a real passage
 * that crosses a page break or a chunk boundary of an imported source still matches.
 * Words, punctuation and letter case must still be identical.
 */
export function normalizeQuoteText(text: string): string {
  return text.replace(/\[Page \d+\]/g, ' ').replace(/\s+/g, ' ').trim();
}
export function sourceContainsQuote(sourceText: string | undefined, quote: string): boolean {
  const needle = normalizeQuoteText(quote);
  return Boolean(sourceText && needle && normalizeQuoteText(sourceText).includes(needle));
}

// ------------------------------------------------------------------ qualitative coding

/** Code labels of an excerpt ("codes" is a comma-separated list, kept for existing workbooks). */
export const splitCodes = (value: string | undefined) => [...new Set((value || '').split(',').map((code) => code.trim()).filter(Boolean))];
const codeKey = (label: string) => label.normalize('NFKC').trim().toLowerCase();

/** The line numbers and character offsets of a passage, e.g. "Lines 4–6, characters 120–188". */
export function quoteLocator(text: string, start: number, end: number): string {
  const lineOf = (offset: number) => text.slice(0, offset).split(/\r\n|\n|\r/).length;
  const first = lineOf(start); const last = lineOf(Math.max(start, end - 1));
  return `${first === last ? `Line ${first}` : `Lines ${first}–${last}`}, characters ${start}–${end}`;
}

/** Where a saved excerpt sits in its source: its recorded character offsets, else its first exact occurrence. */
export function locateExcerpt(text: string, quote: string, locator?: string): { start: number; end: number } | null {
  const offsets = (locator || '').match(/characters (\d+)–(\d+)/);
  if (offsets) {
    const start = Number(offsets[1]); const end = Number(offsets[2]);
    if (text.slice(start, end) === quote) return { start, end };
  }
  const at = quote ? text.indexOf(quote) : -1;
  return at >= 0 ? { start: at, end: at + quote.length } : null;
}

/** The speaker label at the start of the line holding an offset ("Interviewer: …", "P3: …"). */
export function speakerAt(text: string, offset: number): string {
  const lineStart = Math.max(text.lastIndexOf('\n', offset - 1), text.lastIndexOf('\r', offset - 1)) + 1;
  const line = text.slice(lineStart, lineStart + 200);
  return line.match(/^\s*([^:\n]{1,80}):\s+\S/)?.[1].trim() ?? '';
}

export type CodeSuggestion = { label: string; definition: string; quote: string; locator: string; speaker: string; existing: boolean };

/**
 * Keeps the AI's code suggestions whose quotation is in the transcript word for word (whitespace
 * and page markers aside, as every saved quotation) and, when a passage was chosen, inside that
 * passage. Everything else is dropped. Labels that match the codebook keep the codebook's wording.
 */
export function verifyCodeSuggestions(sourceText: string, raw: unknown, codebook: string[], passage?: string): { suggestions: CodeSuggestion[]; dropped: number } {
  const items = Array.isArray(raw) ? raw : [];
  const known = new Map(codebook.map((label) => [codeKey(label), label]));
  const seen = new Set<string>();
  const suggestions: CodeSuggestion[] = [];
  let dropped = 0;
  for (const item of items.slice(0, 20)) {
    const value = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    const label = typeof value.label === 'string' ? value.label.trim().replace(/,/g, ' ').slice(0, 80) : '';
    const quote = typeof value.quote === 'string' ? value.quote.trim() : '';
    if (!label || !quote || quote.length > 4000 || !sourceContainsQuote(sourceText, quote) || (passage && !sourceContainsQuote(passage, quote))) { dropped += 1; continue; }
    const key = `${codeKey(label)}\u0000${normalizeQuoteText(quote)}`;
    if (seen.has(key)) { dropped += 1; continue; }
    seen.add(key);
    const place = locateExcerpt(sourceText, quote);
    suggestions.push({
      label: known.get(codeKey(label)) ?? label, existing: known.has(codeKey(label)),
      definition: typeof value.definition === 'string' ? value.definition.trim().slice(0, 1000) : '',
      quote, locator: place ? quoteLocator(sourceText, place.start, place.end) : '',
      speaker: place ? speakerAt(sourceText, place.start) : '',
    });
  }
  return { suggestions: suggestions.slice(0, 12), dropped: dropped + Math.max(0, suggestions.length - 12) };
}

export type CodeFrequency = {
  codes: { label: string; total: number }[];
  columns: { key: string; label: string }[];
  /** counts[code index][column index]: coded excerpts. */
  counts: number[][];
  /** cooccurrence[i][j]: excerpts coded with both codes i and j (the diagonal is each code's total). */
  cooccurrence: number[][];
  uncoded: number;
};

/** Code frequency by source or by participant (speaker label), and co-occurrence within excerpts. */
export function codeFrequency(entries: WorkbookEntry[], by: 'source' | 'speaker' = 'source'): CodeFrequency {
  const excerpts = entries.filter((entry) => entry.section === 'excerpts');
  const labels = new Map<string, string>();
  for (const code of entries.filter((entry) => entry.section === 'codes')) if (code.values.label) labels.set(codeKey(code.values.label), code.values.label);
  for (const excerpt of excerpts) for (const code of splitCodes(excerpt.values.codes)) if (!labels.has(codeKey(code))) labels.set(codeKey(code), code);
  const sourceTitle = new Map(entries.filter((entry) => entry.section === 'sources').map((entry) => [entry.id, entry.values.title || entry.id]));
  const columnOf = (excerpt: WorkbookEntry) => (by === 'source'
    ? { key: excerpt.values.source_id || '', label: sourceTitle.get(excerpt.values.source_id) || 'No source' }
    : { key: codeKey(excerpt.values.speaker || ''), label: excerpt.values.speaker?.trim() || 'No speaker label' });
  const columns: { key: string; label: string }[] = [];
  for (const excerpt of excerpts) { const column = columnOf(excerpt); if (!columns.some((item) => item.key === column.key)) columns.push(column); }
  const keys = [...labels.keys()];
  const counts = keys.map(() => columns.map(() => 0));
  const cooccurrence = keys.map(() => keys.map(() => 0));
  let uncoded = 0;
  for (const excerpt of excerpts) {
    const codes = [...new Set(splitCodes(excerpt.values.codes).map(codeKey))].map((key) => keys.indexOf(key)).filter((index) => index >= 0);
    if (!codes.length) { uncoded += 1; continue; }
    const column = columns.findIndex((item) => item.key === columnOf(excerpt).key);
    for (const i of codes) { counts[i][column] += 1; for (const j of codes) cooccurrence[i][j] += 1; }
  }
  const order = keys.map((_, i) => i).sort((a, b) => cooccurrence[b][b] - cooccurrence[a][a] || labels.get(keys[a])!.localeCompare(labels.get(keys[b])!));
  return {
    codes: order.map((i) => ({ label: labels.get(keys[i])!, total: cooccurrence[i][i] })),
    columns, counts: order.map((i) => counts[i]),
    cooccurrence: order.map((i) => order.map((j) => cooccurrence[i][j])), uncoded,
  };
}

const NUMBER_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
const isIsoDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const HIDDEN_PATTERNS: Record<string, RegExp> = {
  library_id: /^[a-zA-Z0-9_-]{1,80}$/,
  origin: /^review:[a-zA-Z0-9_-]{1,80}:[a-zA-Z0-9_-]{1,80}$/,
};

function checkFieldValue(f: WorkflowField, value: string) {
  if (f.required && !value) throw new Error(`${f.label} is required.`);
  if (value.length > (f.max ?? (f.type === 'long' ? 16000 : 1000))) throw new Error(`${f.label} is too long.`);
  if (!value) return;
  if (f.type === 'number' && (!NUMBER_PATTERN.test(value) || !Number.isFinite(Number(value)))) {
    throw new Error(`${f.label} must be a finite number, without grouping separators.`);
  }
  if (f.type === 'date' && !isIsoDate(value)) throw new Error(`${f.label} must be a valid date.`);
  if (f.type === 'select' && !f.options?.includes(value)) throw new Error(`Choose a valid ${f.label.toLowerCase()}.`);
  if (f.type === 'hidden' && HIDDEN_PATTERNS[f.key] && !HIDDEN_PATTERNS[f.key].test(value)) throw new Error(`${f.label} is not valid.`);
}

/** Strict domain validation is shared by the form and server. Unknown fields cannot bypass it. */
export function validateEntry(
  kind: WorkflowKind, section: string, raw: Record<string, string>, entries: WorkbookEntry[], replacingId?: string,
): Record<string, string> {
  const spec = sectionFor(kind, section);
  if (!spec) throw new Error('That section does not belong to this workbook.');
  const values: Record<string, string> = {};
  for (const f of spec.fields) {
    const original = String(raw[f.key] ?? '');
    const value = section === 'sources' && f.key === 'text' ? original : original.trim();
    checkFieldValue(f, value);
    values[f.key] = value;
  }
  const linked = values.source_id ? entries.find((entry) => entry.id === values.source_id && entry.section === 'sources') : null;
  if (values.source_id && !linked) throw new Error('Choose a source in this workbook.');
  if (values.quote && !sourceContainsQuote(linked?.values.text, values.quote)) {
    throw new Error('The exact passage was not found in the selected source text. Add the original text or correct the quotation.');
  }
  if (kind === 'finance' && section === 'metrics') {
    // Do not turn decimal commas or malformed grouping into a different value.
    // Consume the entire numeric token before checking its separators.
    const numbers = [...values.quote.matchAll(/\(?[+-]?(?:\d[\d,.]*|\.\d+)(?:e[+-]?\d+)?\)?/gi)]
      .map(([token]) => token.replace(/^\((.*)\)$/, '-$1'))
      .filter((token) => /^[+-]?(?:\d+(?:\.\d*)?|\.\d+|\d{1,3}(?:,\d{3})+(?:\.\d*)?)(?:e[+-]?\d+)?$/i.test(token))
      .map((token) => Number(token.replaceAll(',', '')));
    if (!numbers.includes(Number(values.value))) throw new Error('The reported value must appear in the supporting passage. Keep the reported scale in Unit; do not silently convert it.');
  }
  if (section === 'sources' && replacingId) {
    for (const dependent of entries.filter((entry) => entry.values.source_id === replacingId && entry.values.quote)) {
      if (!sourceContainsQuote(values.text, dependent.values.quote)) throw new Error('This edit would detach a saved quotation. Edit its dependent excerpts first, or use Redact to update them together.');
    }
  }
  return values;
}

/** Deterministic recall spacing, deliberately not a claim of a validated mastery score. */
export function scheduleRecall(previous: RecallState | undefined, input: Pick<RecallState, 'card_id' | 'user_id' | 'rating' | 'response'>, now = new Date()): RecallState {
  const last = previous?.interval_days ?? 0;
  const interval = input.rating === 'again' ? 0 : input.rating === 'hard' ? Math.max(1, Math.round(last * 1.2)) : input.rating === 'easy' ? Math.max(4, Math.round(last * 3)) : Math.max(1, Math.round(last * 2.2));
  return { ...input, repetitions: (previous?.repetitions ?? 0) + 1, interval_days: interval, reviewed_at: now.toISOString(), due_at: new Date(now.getTime() + (interval ? interval * 86400000 : 600000)).toISOString() };
}

export function indicatorProgress(values: Record<string, string>): number | null {
  if ([values.actual, values.baseline, values.target].some((v) => !v?.trim() || !Number.isFinite(Number(v)))) return null;
  const denominator = Number(values.target) - Number(values.baseline);
  if (denominator === 0 || !Number.isFinite(denominator)) return null;
  const progress = (Number(values.actual) - Number(values.baseline)) / denominator * 100;
  return Number.isFinite(progress) ? progress : null;
}

export function metricGroups(entries: WorkbookEntry[]): { key: string; label: string; entries: WorkbookEntry[] }[] {
  const groups = new Map<string, { key: string; label: string; entries: WorkbookEntry[] }>();
  for (const entry of entries.filter((item) => item.section === 'metrics')) {
    const v = entry.values;
    const parts = ['metric', 'definition', 'unit', 'currency', 'period', 'basis'].map((k) => {
      const value = (v[k] || '').normalize('NFKC').trim();
      return k === 'unit' ? value : value.toLowerCase(); // mW and MW are different scales.
    });
    const key = JSON.stringify(parts);
    const group = groups.get(key) ?? { key, label: `${v.metric} · ${v.period} · ${v.unit} · ${v.currency} · ${v.basis} · ${v.definition}`, entries: [] };
    group.entries.push(entry); groups.set(key, group);
  }
  return [...groups.values()];
}

/** Exported values cannot turn into spreadsheet formulas when a CSV is opened. */
export function csvCell(value: unknown): string {
  const text = String(value ?? '');
  const safe = /^[\s]*[=+@-]/.test(text) && !/^-?\d+(\.\d+)?$/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function exportWorkbookCsv(workbook: Workbook): string {
  const fields = [...new Set(workbook.entries.flatMap((entry) => Object.keys(entry.values)))].filter((key) => key !== 'text');
  return [['section', 'entry_id', ...fields].map(csvCell).join(','), ...workbook.entries.map((entry) => [entry.section, entry.id, ...fields.map((key) => entry.values[key] || '')].map(csvCell).join(','))].join('\r\n');
}

export function exportWorkbookMarkdown(workbook: Workbook): string {
  const out = [`# ${workbook.title}`, '', workbook.question, '', `Status: ${workbook.status} · Revision ${workbook.revision}`, `Language: ${workbook.language || 'Not specified'}${workbook.deadline ? ` · Deadline: ${workbook.deadline}` : ''}`, ''];
  for (const [label, value] of [['Deliverable', workbook.deliverable], ['Audience', workbook.audience], ['Success criteria', workbook.success_criteria], ['Source requirements', workbook.source_constraints]]) if (value) out.push(`**${label}:** ${value}`, '');
  for (const section of WORKFLOW_CATALOG[workbook.kind].sections) {
    const entries = workbook.entries.filter((entry) => entry.section === section.key);
    if (!entries.length) continue;
    out.push(`## ${section.title}`, '');
    for (const entry of entries) {
      out.push(`### ${entry.values.title || entry.values.name || entry.values.label || entry.values.question || entry.values.claim || entry.values.company || entry.id}`, `Entry: ${entry.id}`, '');
      for (const f of section.fields) {
        if (!entry.values[f.key] || f.type === 'hidden' || (section.key === 'sources' && f.key === 'text')) continue;
        const linked = f.type === 'source' ? workbook.entries.find((item) => item.id === entry.values[f.key]) : null;
        out.push(`**${f.label}:** ${linked ? `${linked.values.title} (${linked.id})` : entry.values[f.key]}`, '');
      }
    }
  }
  if (workbook.review_note) out.push('## Review', '', workbook.review_note, '');
  return out.join('\n');
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Replaces every occurrence of each term, ignoring letter case. Longer terms are replaced first. */
export function redactText(text: string, terms: string[]): { text: string; count: number } {
  let count = 0;
  const ordered = [...terms].sort((a, b) => b.length - a.length);
  const out = ordered.reduce((current, term) => current.replace(new RegExp(escapeRegExp(term), 'giu'), () => {
    count += 1;
    return '[REDACTED]';
  }), text);
  return { text: out, count };
}

// ------------------------------------------------------------------ editor handoff (BlockNote blocks)

type Block = Record<string, unknown>;
const inline = (value: string, styles: Record<string, boolean> = {}) => (value ? [{ type: 'text', text: value, styles }] : []);
const para = (value: string, styles?: Record<string, boolean>): Block => ({ type: 'paragraph', content: inline(value, styles) });
const head = (value: string, level: 1 | 2 | 3): Block => ({ type: 'heading', props: { level }, content: inline(value) });
const bullet = (value: string): Block => ({ type: 'bulletListItem', content: inline(value) });
const table = (header: string[], body: string[][]): Block => ({
  type: 'table',
  content: { type: 'tableContent', rows: [header.map((cell) => inline(cell, { bold: true })), ...body.map((row) => row.map((cell) => inline(cell)))].map((cells) => ({ cells })) },
});

function sourceLabel(workbook: Workbook, id: string | undefined): string {
  const source = id ? workbook.entries.find((entry) => entry.id === id && entry.section === 'sources') : undefined;
  return source ? source.values.title : 'Source not linked';
}
const located = (values: Record<string, string>) => (values.locator ? ` (${values.locator})` : '');

function statusLine(workbook: Workbook): string {
  if (workbook.status === 'approved') return `Approved evidence, revision ${workbook.revision}${workbook.reviewed_at ? `, reviewed ${workbook.reviewed_at.slice(0, 10)}` : ''}.`;
  return `Draft from workbook revision ${workbook.revision}. These entries have not been approved by a reviewer yet.`;
}

function referenceList(workbook: Workbook): Block[] {
  const sources = workbook.entries.filter((entry) => entry.section === 'sources');
  if (!sources.length) return [];
  return [head('Sources', 1), ...sources.map((source) => bullet([source.values.title, source.values.published, source.values.reference].filter(Boolean).join('. ')))];
}

/** Evidence table, appraisal table and outline: the literature-review deliverable. */
function researchBlocks(workbook: Workbook): Block[] {
  const of = (section: string) => workbook.entries.filter((entry) => entry.section === section);
  const findings = of('findings'); const appraisals = of('appraisal'); const outline = of('outline');
  const blocks: Block[] = [];
  if (findings.length) {
    blocks.push(head('Evidence table', 1), table(
      ['Finding', 'Source', 'Supporting passage', 'Applicability and uncertainty'],
      findings.map(({ values: v }) => [v.claim, sourceLabel(workbook, v.source_id), `"${v.quote}"${located(v)}`, [v.applicability, v.uncertainty].filter(Boolean).join(' ')]),
    ));
  }
  if (appraisals.length) {
    blocks.push(head('Critical appraisal', 1), table(
      ['Source', 'Design', 'Sample', 'Outcomes and results', 'Bias and limitations'],
      appraisals.map(({ values: v }) => [sourceLabel(workbook, v.source_id), v.design, v.sample, [v.outcomes, v.findings].filter(Boolean).join(' '), v.bias]),
    ));
  }
  for (const section of outline) {
    const v = section.values;
    blocks.push(head(v.title, 1), para(v.purpose, { italic: true }));
    if (v.argument) blocks.push(para(v.argument));
    const support = findings.filter((finding) => v.source_id && finding.values.source_id === v.source_id);
    for (const finding of support) blocks.push(bullet(`${finding.values.claim} — "${finding.values.quote}"${located(finding.values)}`));
    if (v.next_action) blocks.push(para(`To do: ${v.next_action}`, { italic: true }));
  }
  return blocks;
}

/** Codebook, then each theme with its supporting excerpts and, separately, its negative cases. */
function qualitativeBlocks(workbook: Workbook): Block[] {
  const of = (section: string) => workbook.entries.filter((entry) => entry.section === section);
  const codes = of('codes'); const excerpts = of('excerpts'); const themes = of('themes').filter((theme) => theme.values.status !== 'rejected');
  const codesOf = (value: string | undefined) => (value || '').split(',').map((code) => code.trim().toLowerCase()).filter(Boolean);
  const excerptLine = ({ values: v }: WorkbookEntry) =>
    `"${v.quote}" — ${v.speaker ? `${v.speaker}, ` : ''}${sourceLabel(workbook, v.source_id)}${located(v)}${v.interpretation ? `. ${v.interpretation}` : ''}`;
  const blocks: Block[] = [];
  if (codes.length) blocks.push(head('Codebook', 1), table(['Code', 'Definition', 'Include when', 'Exclude when'], codes.map(({ values: v }) => [v.label, v.definition, v.include, v.exclude])));
  if (themes.length) blocks.push(head('Findings', 1));
  for (const theme of themes) {
    const related = new Set(codesOf(theme.values.codes));
    const linked = excerpts.filter((excerpt) => codesOf(excerpt.values.codes).some((code) => related.has(code)) || (theme.values.evidence || '').includes(excerpt.id));
    const supporting = linked.filter((excerpt) => excerpt.values.negative_case === 'supports');
    const other = linked.filter((excerpt) => excerpt.values.negative_case !== 'supports');
    blocks.push(head(theme.values.name, 2), para(theme.values.meaning));
    if (theme.values.status !== 'reviewed') blocks.push(para('Candidate theme: not yet reviewed.', { italic: true }));
    if (supporting.length) blocks.push(para('Supporting excerpts', { bold: true }), ...supporting.map((excerpt) => bullet(excerptLine(excerpt))));
    if (other.length) blocks.push(para('Negative and mixed cases', { bold: true }), ...other.map((excerpt) => bullet(excerptLine(excerpt))));
    if (!linked.length) blocks.push(para('No coded excerpts are linked to this theme yet.', { italic: true }));
  }
  return blocks;
}

/** Other workbook kinds: every section and its fields, in catalogue order. */
function genericBlocks(workbook: Workbook): Block[] {
  return WORKFLOW_CATALOG[workbook.kind].sections.filter((section) => section.key !== 'sources').flatMap((section) => {
    const entries = workbook.entries.filter((entry) => entry.section === section.key);
    if (!entries.length) return [];
    return [head(section.title, 1), ...entries.flatMap((entry) => section.fields
      .filter((f) => entry.values[f.key] && f.type !== 'hidden')
      .map((f) => para(`${f.label}: ${f.type === 'source' ? sourceLabel(workbook, entry.values[f.key]) : entry.values[f.key]}`)))];
  });
}

/** Opens the workbook as an editable document in the existing editor (Word/PDF export from there). */
export function workbookDocumentBlocks(workbook: Workbook): Block[] {
  const body = workbook.kind === 'research' ? researchBlocks(workbook) : workbook.kind === 'qualitative' ? qualitativeBlocks(workbook) : genericBlocks(workbook);
  return [
    head(workbook.title, 1),
    ...(workbook.question ? [para(workbook.question)] : []),
    para(`${statusLine(workbook)} Every quotation was checked against its saved source text; interpretations are the authors' own.`, { italic: true }),
    ...(body.length ? body : [para('No evidence entries yet.')]),
    ...referenceList(workbook),
  ];
}

export const WORKBOOK_DOCUMENT_LABEL: Partial<Record<WorkflowKind, string>> = {
  research: 'Draft literature review',
  qualitative: 'Draft findings report',
};
