/**
 * Screening documents for a systematic review (Report step): the screening forms for title and
 * abstract and for full text (built from the review's question, framework and eligibility
 * criteria), the exclusion reasons in use with their counts, and the decision log. Returned as
 * editor blocks, so the browser exports them as Word or PDF through the editor's existing export
 * (/api/ai-editor/word/export), and as Markdown. Free. Pure, for tests: the route passes in the
 * review state as the viewer may see it, so blinded decisions stay hidden.
 */
import { FRAMEWORKS, PRESETS, type Decision, type Framework, type ReviewType, type Stage, type StageState } from './systematicReviewStats.js';

type Block = Record<string, unknown>;
type Styles = Record<string, boolean>;
const inline = (value: string, styles: Styles = {}) => (value ? [{ type: 'text', text: value, styles }] : []);
const para = (value: string, styles?: Styles): Block => ({ type: 'paragraph', content: inline(value, styles) });
const head = (value: string, level: 1 | 2 | 3): Block => ({ type: 'heading', props: { level }, content: inline(value) });
const bullet = (value: string): Block => ({ type: 'bulletListItem', content: inline(value) });
const table = (header: string[], body: string[][]): Block => ({
  type: 'table',
  content: { type: 'tableContent', rows: [header.map((cell) => inline(cell, { bold: true })), ...body.map((row) => row.map((cell) => inline(cell)))].map((cells) => ({ cells })) },
});
const pageBreak: Block = { type: 'pageBreak' };

export type DocumentsReview = {
  title: string; question: string; review_type: ReviewType; framework: Framework; framework_fields: Record<string, string>;
  include_criteria: string[]; exclude_criteria: string[];
};
export type DocumentsRecord = {
  id: string; title: string; authors: string[]; year: number | null; duplicate_of: string | null;
  title_state: StageState; full_state: StageState | null; blinded?: { title: boolean; full: boolean };
};
export type DocumentsAuditEvent = { action: string; actor: string; record_id: string | null; stage: Stage | null; after?: unknown; at: string; blinded?: boolean };
export type DocumentsInput = { review: DocumentsReview; records: DocumentsRecord[]; reviewers: { id: string; name: string }[]; audit: DocumentsAuditEvent[]; generated: string };

export type ReasonCount = { reason: string; title: number; full: number; listed: boolean };
export type ScreeningDocuments = { title: string; blocks: Block[]; markdown: string; reasons: ReasonCount[] };

const BOX = '☐';
const DECISIONS: Record<Decision, string> = { include: 'Include', exclude: 'Exclude', maybe: 'Maybe' };
const ACTIONS: Record<string, string> = { vote: 'Reviewer decision', adjudication: 'Adjudication', ai_suggestion: 'AI suggestion', downstream_invalidated: 'Full-text decision cleared', full_text_attached: 'Full text attached' };

/** The listed reason a free-text reason starts with ("Wrong population: adults only" -> "Wrong population"), else the text before a colon. */
export function reasonKey(reason: string, listed: string[]): string {
  const text = reason.trim();
  const match = listed.find((item) => text.toLowerCase() === item.toLowerCase() || text.toLowerCase().startsWith(`${item.toLowerCase()}:`));
  if (match) return match;
  return (text.split(':')[0] || 'No reason given').trim().slice(0, 120);
}

/** The exclusion reasons of the review type, then any other reasons used, with how often each excluded a record at each stage. */
export function exclusionReasons(reviewType: ReviewType, records: DocumentsRecord[]): ReasonCount[] {
  const listed = PRESETS[reviewType].reasons;
  const counts = new Map<string, ReasonCount>(listed.map((reason) => [reason, { reason, title: 0, full: 0, listed: true }]));
  const add = (state: StageState | null, stage: 'title' | 'full') => {
    if (state?.status !== 'final' || state.decision !== 'exclude') return;
    const key = state.reason ? reasonKey(state.reason, listed) : 'No reason given';
    const entry = counts.get(key) ?? { reason: key, title: 0, full: 0, listed: false };
    entry[stage] += 1;
    counts.set(key, entry);
  };
  for (const record of records) {
    if (record.duplicate_of) continue;
    add(record.title_state, 'title');
    add(record.full_state, 'full');
  }
  return [...counts.values()].sort((a, b) => Number(b.listed) - Number(a.listed) || (b.title + b.full) - (a.title + a.full));
}

function stateText(state: StageState | null, blinded: boolean): string {
  if (!state) return '';
  if (blinded) return 'Not shown until you decide';
  if (state.status === 'final' && state.decision) return DECISIONS[state.decision];
  return state.status === 'conflict' ? 'Conflict' : 'Awaiting decision';
}

const cite = (record: DocumentsRecord) => `${record.authors[0]?.split(/\s+/).pop() ?? 'Unknown'}${record.authors.length > 1 ? ' et al.' : ''} ${record.year ?? 'n.d.'}`;

function frameworkRows(review: DocumentsReview): string[][] {
  return FRAMEWORKS[review.framework].map(([id, label]) => [label, review.framework_fields[id]?.trim() || '[Not set in the protocol]', `${BOX} Yes   ${BOX} No   ${BOX} Unclear`]);
}

function formBlocks(review: DocumentsReview, stage: Stage, reasons: string[]): Block[] {
  const fullText = stage === 'full';
  const blocks: Block[] = [
    head(fullText ? 'Full-text screening form' : 'Title and abstract screening form', 1),
    para(`Review: ${review.title}`, { bold: true }),
    ...(review.question ? [para(`Question: ${review.question}`)] : []),
    para(fullText
      ? 'Read the full report. Every criterion must be met to include it. If you exclude it, choose one reason: the first that applies, in the order listed.'
      : 'Judge from the title and abstract only. When you are unsure, choose Maybe: the record goes on to full-text screening.'),
    table(['Field', 'Entry'], [['Reviewer', ''], ['Date', ''], ['Record ID', ''], ['First author and year', ''], ['Title', ''], ...(fullText ? [['Full text obtained', `${BOX} Yes   ${BOX} No (exclude: Full text not available)`]] : [])]),
    head(`${review.framework} elements`, 2),
    table(['Element', 'Review criterion', 'Met?'], frameworkRows(review)),
  ];
  if (review.include_criteria.length) blocks.push(head('Inclusion criteria', 2), table(['Criterion', 'Met?'], review.include_criteria.map((criterion) => [criterion, `${BOX} Yes   ${BOX} No   ${BOX} Unclear`])));
  if (review.exclude_criteria.length) blocks.push(head('Exclusion criteria', 2), table(['Criterion', 'Applies?'], review.exclude_criteria.map((criterion) => [criterion, `${BOX} Yes   ${BOX} No   ${BOX} Unclear`])));
  if (!review.include_criteria.length && !review.exclude_criteria.length) blocks.push(para('No inclusion or exclusion criteria are set in the protocol yet. Add them in the Protocol step before screening.', { italic: true }));
  blocks.push(
    head('Decision', 2),
    para(fullText ? `${BOX} Include   ${BOX} Exclude` : `${BOX} Include   ${BOX} Exclude   ${BOX} Maybe`),
    head(fullText ? 'Reason for exclusion (choose one)' : 'Reason for exclusion (optional at this stage)', 2),
    ...reasons.map((reason) => bullet(`${BOX} ${reason}`)),
    bullet(`${BOX} Other: ____________________`),
    head('Notes', 2),
    para(fullText ? 'Page or section that supports the decision, and anything to discuss with the second reviewer:' : 'Anything to discuss with the second reviewer:'),
    para(' '), para(' '),
  );
  return blocks;
}

function auditRow(event: DocumentsAuditEvent, names: Map<string, string>, titles: Map<string, string>): string[] | null {
  if (!ACTIONS[event.action] || !event.record_id) return null;
  const after = (event.after && typeof event.after === 'object' ? event.after : null) as { decision?: Decision; reason?: string | null } | null;
  const outcome = event.blinded ? 'Not shown until you decide' : after?.decision ? `${DECISIONS[after.decision] ?? after.decision}${after.reason ? `: ${after.reason}` : ''}` : event.action === 'vote' ? 'Decision withdrawn' : '';
  return [
    event.at.slice(0, 16).replace('T', ' '), ACTIONS[event.action], titles.get(event.record_id) ?? event.record_id,
    event.stage === 'full' ? 'Full text' : event.stage === 'title' ? 'Title and abstract' : '', event.actor === 'ai' ? 'AI' : names.get(event.actor) ?? 'Reviewer', outcome,
  ];
}

/** The screening documents as editor blocks and Markdown. */
export function screeningDocuments(input: DocumentsInput): ScreeningDocuments {
  const { review } = input;
  const preset = PRESETS[review.review_type];
  const reasons = exclusionReasons(review.review_type, input.records);
  const screened = input.records.filter((record) => !record.duplicate_of);
  const names = new Map(input.reviewers.map((reviewer) => [reviewer.id, reviewer.name]));
  const titles = new Map(input.records.map((record) => [record.id, `${cite(record)}: ${record.title}`.slice(0, 160)]));
  const auditRows = [...input.audit].sort((a, b) => a.at.localeCompare(b.at)).map((event) => auditRow(event, names, titles)).filter((row): row is string[] => Boolean(row)).slice(0, 2000);

  const blocks: Block[] = [
    head(`${review.title}: screening documents`, 1),
    para(`${preset.label}, ${review.framework} framework. Generated ${input.generated.slice(0, 10)}. ${preset.note}`),
    ...formBlocks(review, 'title', preset.reasons),
    pageBreak,
    ...formBlocks(review, 'full', preset.reasons),
    pageBreak,
    head('Exclusion reasons', 1),
    para(`The reasons used for this ${preset.label.toLowerCase()}, with how many records each excluded so far. Reasons recorded in other words are listed after them.`),
    table(['Reason', 'Title and abstract', 'Full text', 'In the list'], reasons.map((item) => [item.reason, String(item.title), String(item.full), item.listed ? 'Yes' : 'No (free text)'])),
    pageBreak,
    head('Decision log', 1),
    para(`${screened.length} record${screened.length === 1 ? '' : 's'} screened (${input.records.length - screened.length} duplicate${input.records.length - screened.length === 1 ? '' : 's'} removed before screening). Decisions you have not made yet are hidden while screening is blind.`),
    head('Decisions by record', 2),
    screened.length
      ? table(['#', 'Record', 'Title and abstract', 'Full text', 'Reason'], screened.map((record, index) => [
        String(index + 1), `${cite(record)}: ${record.title}`, stateText(record.title_state, Boolean(record.blinded?.title)), stateText(record.full_state, Boolean(record.blinded?.full)),
        record.blinded?.full || (record.full_state && record.blinded?.title) ? '' : record.full_state?.reason ?? (record.blinded?.title ? '' : record.title_state.reason) ?? '',
      ]))
      : para('No records yet.'),
    head('Screening history', 2),
    auditRows.length ? table(['When (UTC)', 'Action', 'Record', 'Stage', 'By', 'Decision'], auditRows) : para('No screening decisions recorded yet.'),
  ];
  return { title: `${review.title}: screening documents`, blocks, markdown: blocksToMarkdown(blocks), reasons };
}

const textOf = (content: unknown) => (Array.isArray(content) ? content.map((part: any) => String(part?.text ?? '')).join('') : '');
const mdCell = (value: string) => value.replace(/\|/g, '/').replace(/\n+/g, ' ');

/** Markdown for the same blocks (a Markdown download, and for tests). */
export function blocksToMarkdown(blocks: Block[]): string {
  const out: string[] = [];
  for (const block of blocks as any[]) {
    if (block.type === 'heading') out.push(`${'#'.repeat(block.props.level)} ${textOf(block.content)}`, '');
    else if (block.type === 'paragraph') out.push(textOf(block.content), '');
    else if (block.type === 'bulletListItem') out.push(`- ${textOf(block.content)}`);
    else if (block.type === 'pageBreak') out.push('', '---', '');
    else if (block.type === 'table') {
      const rowsOut = (block.content.rows as { cells: unknown[] }[]).map((tableRow) => `| ${tableRow.cells.map((cell) => mdCell(textOf(cell))).join(' | ')} |`);
      out.push(rowsOut[0], `|${' --- |'.repeat(block.content.rows[0].cells.length)}`, ...rowsOut.slice(1), '');
    }
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
