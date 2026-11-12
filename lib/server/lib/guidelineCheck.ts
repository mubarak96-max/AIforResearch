/**
 * Reporting-guideline check: a manuscript read against every item of a checklist (CONSORT,
 * STROBE, PRISMA, CARE, STARD, COREQ, SRQR, SQUIRE; lib/reportingGuidelines.ts).
 *
 * The items go to the model in batches with the whole text. For each item it says whether it is
 * reported, partly reported, missing or not applicable, quotes the passage and names the section.
 * A "reported" verdict stands only when its quote is really in the text; otherwise the item is
 * marked "check" for the author to confirm. Items the model skipped are marked "check" too, so a
 * failed batch never reads as compliance.
 */
import type { LlmSlot, LlmUsage } from '../slots/types.js';
import { parseJson } from './research.js';
import { mapLimit } from './reviewerCitations.js';
import { countWords, firstWords, norm, quoteInText } from './reviewer.js';
import { guideline as findGuideline, type Guideline, type GuidelineItem } from '../../reportingGuidelines.js';

export type GuidelineStatus = 'reported' | 'partial' | 'missing' | 'not_applicable' | 'check';
export type GuidelineFinding = { id: string; section: string; topic: string; text: string; status: GuidelineStatus; where: string | null; quote: string | null; note: string; fix: string | null };
export type GuidelineResult = {
  guideline: Guideline['id']; name: string; version: string; url: string; citation: string; title: string;
  findings: GuidelineFinding[]; counts: Record<GuidelineStatus, number>; words_checked: number; words_total: number; truncated: boolean;
  summary: string; markdown: string;
};

/** Longest text sent with each batch; longer documents are checked on their first 40,000 words. */
export const GUIDELINE_MAX_WORDS = 40_000;
const BATCH = 12;
const STATUSES: GuidelineStatus[] = ['reported', 'partial', 'missing', 'not_applicable'];
export const STATUS_LABELS: Record<GuidelineStatus, string> = { reported: 'Reported', partial: 'Partly reported', missing: 'Missing', not_applicable: 'Not applicable', check: 'Check by hand' };

export function batchPrompt(g: Guideline, items: GuidelineItem[], text: string, title: string, language?: string | null) {
  return [
    {
      role: 'system' as const,
      content: `You check a manuscript against the ${g.name} ${g.version} reporting guideline (${g.for}), item by item, as a journal editor would. ` +
        'Judge only what the text says; never assume something is reported because it is usual. For each item answer: ' +
        '"reported" (clearly and fully reported), "partial" (mentioned but incomplete), "missing" (not reported) or "not_applicable" (the item cannot apply to this study; say why). ' +
        'For reported and partial items, copy a short passage exactly from the text (at most 30 words) that shows it, and name the section heading it is in. ' +
        'For partial and missing items, say in one sentence what is absent and give a concrete fix the author can write. ' +
        `Write notes and fixes in ${language || 'the language of the manuscript'}. Answer with JSON only: ` +
        '{"items": [{"id": "6a", "status": "reported|partial|missing|not_applicable", "where": "section heading or null", "quote": "exact words or null", "note": "one sentence", "fix": "one sentence or null"}]}',
    },
    {
      role: 'user' as const,
      content: `Checklist items:\n${items.map((item) => `- ${item.id} (${item.section}: ${item.topic}): ${item.text}`).join('\n')}\n\nManuscript title: ${title || 'Untitled'}\n\n${text}`,
    },
  ];
}

type ModelItem = { id?: unknown; status?: unknown; where?: unknown; quote?: unknown; note?: unknown; fix?: unknown };
const str = (value: unknown, max: number) => (typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null);

/** One finding per checklist item, from the model's answers; quotes checked against the text. Pure, for tests. */
export function mergeFindings(items: GuidelineItem[], answers: ModelItem[], normalizedText: string): GuidelineFinding[] {
  const byId = new Map(answers.filter((answer) => typeof answer?.id === 'string').map((answer) => [String(answer.id).trim().toLowerCase(), answer]));
  return items.map((item) => {
    const answer = byId.get(item.id.toLowerCase());
    const base = { id: item.id, section: item.section, topic: item.topic, text: item.text };
    if (!answer || !STATUSES.includes(answer.status as GuidelineStatus)) return { ...base, status: 'check' as const, where: null, quote: null, note: 'Not assessed in this run; check this item by hand.', fix: null };
    const status = answer.status as GuidelineStatus;
    const rawQuote = str(answer.quote, 400);
    const quote = rawQuote && quoteInText(rawQuote, normalizedText) ? rawQuote : null;
    const note = str(answer.note, 600) ?? '';
    const fix = status === 'reported' || status === 'not_applicable' ? null : str(answer.fix, 600);
    if (status === 'reported' && !quote) return { ...base, status: 'check' as const, where: str(answer.where, 200), quote: null, note: `${note ? `${note} ` : ''}No exact passage was found in the text to confirm it; check by hand.`.trim(), fix: null };
    return { ...base, status, where: status === 'missing' ? null : str(answer.where, 200), quote: status === 'missing' ? null : quote, note, fix };
  });
}

export function countStatuses(findings: GuidelineFinding[]): Record<GuidelineStatus, number> {
  const counts: Record<GuidelineStatus, number> = { reported: 0, partial: 0, missing: 0, not_applicable: 0, check: 0 };
  for (const finding of findings) counts[finding.status] += 1;
  return counts;
}

const cell = (value: string | null) => (value ?? '').replace(/\|/g, '/').replace(/\n+/g, ' ');

export function guidelineMarkdown(result: Omit<GuidelineResult, 'markdown'>): string {
  const lines = [
    `## ${result.name} ${result.version} checklist: ${result.title || 'Untitled'}`, '',
    result.summary, '',
    '| Item | Section | Topic | Status | Where reported | What to add |', '| --- | --- | --- | --- | --- | --- |',
    ...result.findings.map((finding) => `| ${finding.id} | ${cell(finding.section)} | ${cell(finding.topic)} | ${STATUS_LABELS[finding.status]} | ${cell(finding.where)}${finding.quote ? ` (“${cell(finding.quote)}”)` : ''} | ${cell(finding.fix ?? (finding.status === 'reported' ? '' : finding.note))} |`),
    '',
    `*Checked by AI against ${result.name} ${result.version}. Add page or line numbers from your final manuscript before submitting the official checklist: ${result.url}. ${result.citation}*`,
  ];
  if (result.truncated) lines.push('', `*The document is longer than ${GUIDELINE_MAX_WORDS.toLocaleString('en-US')} words; the first ${result.words_checked.toLocaleString('en-US')} were checked.*`);
  return lines.join('\n');
}

export type GuidelineInput = { guideline: Guideline['id']; text: string; title: string; language?: string | null };

export async function runGuidelineCheck(llm: LlmSlot, input: GuidelineInput, usage: LlmUsage): Promise<GuidelineResult> {
  const g = findGuideline(input.guideline);
  if (!g) throw new Error('Unknown reporting guideline.');
  const wordsTotal = countWords(input.text);
  const truncated = wordsTotal > GUIDELINE_MAX_WORDS;
  const text = truncated ? firstWords(input.text, GUIDELINE_MAX_WORDS) : input.text;
  const batches: GuidelineItem[][] = [];
  for (let i = 0; i < g.items.length; i += BATCH) batches.push(g.items.slice(i, i + BATCH));
  const answers = await mapLimit(batches, 3, async (items) => {
    try {
      const { text: reply, usage: used } = await llm.complete({ messages: batchPrompt(g, items, text, input.title, input.language), task: 'fast', json: true, temperature: 0.1, maxTokens: 3500 });
      usage.inputTokens += used.inputTokens; usage.outputTokens += used.outputTokens;
      return parseJson<{ items?: ModelItem[] }>(reply)?.items ?? [];
    } catch {
      return [];
    }
  });
  const flat = answers.flat();
  if (!flat.length) throw new Error('The checklist could not be completed. Your credits were returned; try again.');
  const findings = mergeFindings(g.items, flat, norm(text));
  const counts = countStatuses(findings);
  const applicable = findings.length - counts.not_applicable;
  const summary = `${counts.reported} of ${applicable} applicable ${g.name} items are reported, ${counts.partial} partly, ${counts.missing} missing${counts.check ? `, and ${counts.check} need a check by hand` : ''}.`;
  const partial: Omit<GuidelineResult, 'markdown'> = {
    guideline: g.id, name: g.name, version: g.version, url: g.url, citation: g.citation, title: input.title,
    findings, counts, words_checked: countWords(text), words_total: wordsTotal, truncated, summary,
  };
  return { ...partial, markdown: guidelineMarkdown(partial) };
}
