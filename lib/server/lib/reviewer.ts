/**
 * Reviewer and Claim check.
 *
 * Reviewer: a thesis, proposal or manuscript is split into parts by its headings (about 6,000
 * words each), each part is reviewed against the chosen checks at the chosen level, and the parts
 * are merged: scores are averaged by length, comments are kept only when their quote is really in
 * the text, and a final pass writes the verdict. High quality uses the stronger model, asks for
 * more detail and adds the issues-by-section table and score chart. The free preview reviews the
 * first 3,000 words and returns the scorecard and the three most important comments.
 *
 * Claim check: a paragraph is split into claims; each claim is searched in papers and medical
 * sources, and one model call labels every claim from those papers only. Evidence strength comes
 * from the study types of the supporting papers, not from the model.
 */
import type { LlmSlot, LlmUsage } from '../slots/types.js';
import { parseJson } from './research.js';
import { searchSources, STUDY_TYPE_LABELS, type FoundPaper } from './sources/index.js';
import { mapLimit } from './reviewerCitations.js';

export const DOC_TYPES = ['thesis', 'proposal', 'manuscript'] as const;
export const LEVELS = ['undergraduate', 'honours', 'masters', 'phd'] as const;
export const CHECKS = ['structure', 'method', 'citations', 'clarity', 'formatting'] as const;
export type DocType = (typeof DOC_TYPES)[number];
export type Level = (typeof LEVELS)[number];
export type Check = (typeof CHECKS)[number];

export const CHECK_LABELS: Record<Check, string> = {
  structure: 'Structure and argument',
  method: 'Method and statistics',
  citations: 'Use of sources',
  clarity: 'Clarity and style',
  formatting: 'Formatting',
};
const CHECK_BRIEF: Record<Check, string> = {
  structure: 'the research question, the logic from aims to conclusions, the order of sections, and whether each claim follows from what comes before',
  method: 'the design, sampling, measures, analysis and statistics: whether they fit the question, are described well enough to repeat, are reported correctly (test, statistic, p, effect size, confidence interval) and whether limitations are stated',
  citations: 'whether claims that need a source have one, whether sources are recent and relevant, over-reliance on few sources, and citations that look wrong or missing',
  clarity: 'clear, concise academic English, paragraph structure, terms used consistently, hedging, tone and grammar',
  formatting: 'headings, numbering, tables and figures, the reference style and consistency',
};
const LEVEL_TEXT: Record<Level, string> = {
  undergraduate: 'an undergraduate dissertation or project, judged against undergraduate expectations',
  honours: 'an honours thesis, judged against honours expectations (an independent study with a clear contribution)',
  masters: 'a master’s thesis or project, judged against master’s expectations (sound method, critical engagement with the literature)',
  phd: 'a doctoral thesis, judged as an examiner would (an original contribution, rigorous method, mastery of the literature)',
};
const DOC_TEXT: Record<DocType, string> = {
  thesis: 'thesis or dissertation chapter',
  proposal: 'research proposal',
  manuscript: 'journal manuscript (judged as a peer reviewer for a reputable journal would)',
};

export const PREVIEW_WORDS = 3000;
const PART_WORDS = 6000;
export const countWords = (text: string) => (text.match(/\S+/g) || []).length;

export type Section = { heading: string; text: string; words: number };

/** A line that reads as a heading: Markdown, numbered ("2.1 Methods"), CHAPTER, or a short title line. */
function headingOf(line: string): string | null {
  const trimmed = line.trim();
  const markdown = trimmed.match(/^#{1,4}\s+(.+)$/);
  if (markdown) return markdown[1].trim();
  if (trimmed.length < 3 || trimmed.length > 90 || /[.,;:]$/.test(trimmed)) return null;
  if (/^(chapter|section|part)\s+[\divxlc]+\b/i.test(trimmed)) return trimmed;
  if (/^\d+(\.\d+)*\.?\s+[A-Z]/.test(trimmed) && trimmed.split(/\s+/).length <= 10) return trimmed;
  if (/^(abstract|introduction|background|literature review|methods?|methodology|results|findings|discussion|conclusions?|limitations|references|bibliography|appendix|acknowledg)/i.test(trimmed) && trimmed.split(/\s+/).length <= 6) return trimmed;
  return null;
}

/** Splits a document into sections by its headings. Pure, for tests. */
export function splitSections(text: string): Section[] {
  const sections: Section[] = [];
  let current: { heading: string; lines: string[] } = { heading: 'Opening', lines: [] };
  for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
    const heading = headingOf(line);
    if (heading) {
      if (current.lines.join('').trim()) sections.push({ heading: current.heading, text: current.lines.join('\n').trim(), words: countWords(current.lines.join(' ')) });
      current = { heading, lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.join('').trim()) sections.push({ heading: current.heading, text: current.lines.join('\n').trim(), words: countWords(current.lines.join(' ')) });
  return sections;
}

/** The reference list at the end of a document, if it has one. */
export function referenceSection(text: string): string | null {
  const match = text.match(/\n\s*#{0,3}\s*(references|bibliography|works cited|reference list|literature cited)\s*\n([\s\S]+)$/i);
  return match ? match[2].trim() : null;
}

/** Groups sections into parts of about 6,000 words; a long section is cut by paragraphs. */
export function partsOf(sections: Section[], maxWords = PART_WORDS): Section[][] {
  const parts: Section[][] = [];
  let part: Section[] = [];
  let words = 0;
  const pieces: Section[] = [];
  for (const section of sections) {
    if (section.words <= maxWords) { pieces.push(section); continue; }
    let chunk: string[] = [];
    let chunkWords = 0;
    for (const paragraph of section.text.split(/\n\s*\n/)) {
      const count = countWords(paragraph);
      if (chunkWords + count > maxWords && chunk.length) {
        pieces.push({ heading: section.heading, text: chunk.join('\n\n'), words: chunkWords });
        chunk = [];
        chunkWords = 0;
      }
      chunk.push(paragraph);
      chunkWords += count;
    }
    if (chunk.length) pieces.push({ heading: section.heading, text: chunk.join('\n\n'), words: chunkWords });
  }
  for (const piece of pieces) {
    if (words + piece.words > maxWords && part.length) { parts.push(part); part = []; words = 0; }
    part.push(piece);
    words += piece.words;
  }
  if (part.length) parts.push(part);
  return parts;
}

/** The first `max` words of a document, cut at a paragraph where possible. */
export function firstWords(text: string, max: number): string {
  const words = text.split(/(\s+)/);
  let count = 0;
  let out = '';
  for (const piece of words) {
    if (/\S/.test(piece)) count += 1;
    if (count > max) break;
    out += piece;
  }
  return out.trim();
}

export type ReviewComment = { severity: 'major' | 'minor'; criterion: Check | 'overall'; section: string; quote: string | null; issue: string; fix: string };
export type ReviewScore = { criterion: Check; label: string; score: number; reason: string };
export type ReviewResult = {
  scores: ReviewScore[];
  overall: number;
  verdict: string;
  strengths: string[];
  comments: ReviewComment[];
  issues_by_section: { section: string; major: number; minor: number }[];
  words_reviewed: number;
  words_total: number;
  preview: boolean;
  hidden_comments: number;
  markdown: string;
};

export type ReviewInput = {
  text: string; title: string; docType: DocType; level: Level; checks: Check[]; template: string; highQuality: boolean; preview: boolean;
  language?: string | null;
};

const norm = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** True when the quote (or most of it) is in the text: invented quotes are dropped. */
export function quoteInText(quote: string, normalizedText: string): boolean {
  const target = norm(quote);
  if (target.length < 8) return false;
  if (normalizedText.includes(target)) return true;
  const words = target.split(' ');
  if (words.length < 6) return false;
  // Allow small changes: half of the quote's first and last runs of words must appear.
  const head = words.slice(0, Math.ceil(words.length / 2)).join(' ');
  const tail = words.slice(Math.floor(words.length / 2)).join(' ');
  return normalizedText.includes(head) || normalizedText.includes(tail);
}

type PartReview = { scores?: Record<string, { score?: number; reason?: string }>; comments?: Partial<ReviewComment>[]; strengths?: string[] };

function partPrompt(input: ReviewInput, part: Section[], index: number, total: number) {
  const checks = input.checks.map((check) => `- ${check} (${CHECK_LABELS[check]}): ${CHECK_BRIEF[check]}${check === 'formatting' && input.template ? `. The required format: ${input.template.slice(0, 1500)}` : ''}`).join('\n');
  const depth = input.highQuality ? 'Be thorough: up to 12 major and 20 minor comments.' : 'Be focused: up to 6 major and 10 minor comments.';
  return [
    {
      role: 'system' as const,
      content: `You are an experienced academic examiner reviewing ${LEVEL_TEXT[input.level]}. The document is a ${DOC_TEXT[input.docType]}. ` +
        `Review only what is in the text; never invent content, page numbers or sources. Comment on these criteria:\n${checks}\n` +
        `Score each criterion from 0 to 10 for this part (10 = excellent for the level, 5 = acceptable with clear weaknesses, below 4 = would not pass). ${depth} ` +
        'Every comment quotes a short passage copied exactly from the text (at most 25 words), names the section heading it is in, says what the problem is and gives a concrete fix. ' +
        `Write in ${input.language || 'the language of the document'}, plainly and constructively. Answer with JSON only: ` +
        '{"scores": {"structure": {"score": 7, "reason": "one sentence"}}, "strengths": ["…"], "comments": [{"severity": "major|minor", "criterion": "structure", "section": "heading", "quote": "exact words", "issue": "…", "fix": "…"}]}',
    },
    { role: 'user' as const, content: `Title: ${input.title || 'Untitled'}\nPart ${index + 1} of ${total}.\n\n${part.map((section) => `## ${section.heading}\n${section.text}`).join('\n\n')}` },
  ];
}

/** Merges part reviews: scores weighted by words, comments with a real quote, duplicates dropped. Pure, for tests. */
export function mergeReviews(input: ReviewInput, parts: { words: number; review: PartReview | null }[], fullText: string) {
  const normalized = norm(fullText);
  const scores: ReviewScore[] = input.checks.map((check) => {
    let weight = 0;
    let sum = 0;
    const reasons: string[] = [];
    for (const part of parts) {
      const value = Number(part.review?.scores?.[check]?.score);
      if (!Number.isFinite(value)) continue;
      sum += Math.max(0, Math.min(10, value)) * part.words;
      weight += part.words;
      if (part.review?.scores?.[check]?.reason) reasons.push(String(part.review.scores[check]!.reason));
    }
    return { criterion: check, label: CHECK_LABELS[check], score: weight ? Math.round((sum / weight) * 10) / 10 : 0, reason: reasons[0] ?? '' };
  }).filter((score) => score.score > 0 || score.reason);
  const seen = new Set<string>();
  const comments: ReviewComment[] = [];
  for (const part of parts) {
    for (const raw of part.review?.comments ?? []) {
      if (!raw?.issue) continue;
      const quote = raw.quote && quoteInText(String(raw.quote), normalized) ? String(raw.quote).slice(0, 400) : null;
      const key = norm(`${raw.issue}`).slice(0, 80);
      if (seen.has(key)) continue;
      seen.add(key);
      comments.push({
        severity: raw.severity === 'major' ? 'major' : 'minor',
        criterion: (CHECKS as readonly string[]).includes(String(raw.criterion)) ? (raw.criterion as Check) : 'overall',
        section: String(raw.section || '').slice(0, 120) || 'General',
        quote, issue: String(raw.issue).slice(0, 800), fix: String(raw.fix || '').slice(0, 800),
      });
    }
  }
  comments.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'major' ? -1 : 1));
  const strengths = [...new Set(parts.flatMap((part) => part.review?.strengths ?? []).map((item) => String(item).slice(0, 300)))].slice(0, 6);
  const bySection = new Map<string, { major: number; minor: number }>();
  for (const comment of comments) {
    const row = bySection.get(comment.section) ?? { major: 0, minor: 0 };
    row[comment.severity] += 1;
    bySection.set(comment.section, row);
  }
  const overall = scores.length ? Math.round((scores.reduce((sum, score) => sum + score.score, 0) / scores.length) * 10) / 10 : 0;
  return { scores, comments, strengths, overall, issues_by_section: [...bySection.entries()].map(([section, counts]) => ({ section, ...counts })) };
}

export function reviewMarkdown(title: string, result: Omit<ReviewResult, 'markdown'>): string {
  const lines = [`## Review: ${title || 'Untitled'}`, '', `**Overall: ${result.overall}/10.** ${result.verdict}`, '', '### Scores', '', '| Criterion | Score | Why |', '| --- | --- | --- |'];
  for (const score of result.scores) lines.push(`| ${score.label} | ${score.score}/10 | ${score.reason.replace(/\|/g, '/')} |`);
  if (result.strengths.length) lines.push('', '### Strengths', '', ...result.strengths.map((item) => `- ${item}`));
  for (const severity of ['major', 'minor'] as const) {
    const list = result.comments.filter((comment) => comment.severity === severity);
    if (!list.length) continue;
    lines.push('', `### ${severity === 'major' ? 'Major' : 'Minor'} comments`, '');
    list.forEach((comment, index) => {
      lines.push(`${index + 1}. **${comment.section}.** ${comment.issue}${comment.quote ? `\n   > “${comment.quote}”` : ''}${comment.fix ? `\n   *Suggested fix:* ${comment.fix}` : ''}`);
    });
  }
  if (result.preview) lines.push('', `*Preview: the first ${result.words_reviewed.toLocaleString('en-US')} of ${result.words_total.toLocaleString('en-US')} words were reviewed.*`);
  return lines.join('\n');
}

const addUsage = (total: LlmUsage, more: LlmUsage) => { total.inputTokens += more.inputTokens; total.outputTokens += more.outputTokens; };

export async function runReview(llm: LlmSlot, input: ReviewInput, usage: LlmUsage): Promise<ReviewResult> {
  const wordsTotal = countWords(input.text);
  const body = input.preview ? firstWords(input.text, PREVIEW_WORDS) : input.text;
  // The reference list is checked separately (citation report); it is not prose to review.
  const reviewable = body.replace(/\n\s*#{0,3}\s*(references|bibliography|works cited|reference list|literature cited)\s*\n[\s\S]+$/i, '');
  const sections = splitSections(reviewable);
  if (!sections.length) throw new Error('There is no text to review.');
  const parts = partsOf(sections);
  const task = input.highQuality ? 'review' : 'fast';
  const reviewed = await mapLimit(parts, 4, async (part, index) => {
    try {
      const { text, usage: used } = await llm.complete({ messages: partPrompt(input, part, index, parts.length), task, json: true, temperature: 0.2, maxTokens: input.highQuality ? 5000 : 3000 });
      addUsage(usage, used);
      return { words: part.reduce((sum, section) => sum + section.words, 0), review: parseJson<PartReview>(text) };
    } catch {
      return { words: part.reduce((sum, section) => sum + section.words, 0), review: null };
    }
  });
  if (reviewed.every((part) => !part.review)) throw new Error('The review could not be written.');
  const merged = mergeReviews(input, reviewed, reviewable);

  let verdict = '';
  try {
    const { text, usage: used } = await llm.complete({
      task, temperature: 0.2, maxTokens: 500,
      messages: [
        { role: 'system', content: `You are the examiner of ${LEVEL_TEXT[input.level]} (${DOC_TEXT[input.docType]}). From the scores and comments, write the overall verdict in 3 to 5 plain sentences: how ready it is, the two or three changes that matter most, and what is already good. No heading, no list. Write in ${input.language || 'the language of the comments'}.` },
        { role: 'user', content: JSON.stringify({ scores: merged.scores, strengths: merged.strengths, comments: merged.comments.slice(0, 20).map(({ severity, section, issue }) => ({ severity, section, issue })) }) },
      ],
    });
    addUsage(usage, used);
    verdict = text.trim();
  } catch {
    verdict = merged.comments.filter((comment) => comment.severity === 'major').length
      ? 'The major comments below are the changes that matter most.'
      : 'The comments below are mainly refinements.';
  }

  const shown = input.preview ? merged.comments.slice(0, 3) : merged.comments;
  const partial: Omit<ReviewResult, 'markdown'> = {
    scores: merged.scores, overall: merged.overall, verdict, strengths: merged.strengths, comments: shown,
    issues_by_section: input.preview ? [] : merged.issues_by_section,
    words_reviewed: countWords(reviewable), words_total: wordsTotal, preview: input.preview, hidden_comments: merged.comments.length - shown.length,
  };
  return { ...partial, markdown: reviewMarkdown(input.title, partial) };
}

// ------------------------------------------------------------------ Claim check

export type ClaimVerdict = 'supported' | 'partly' | 'not_supported' | 'no_evidence';
export type ClaimPaper = {
  n: number; id: string; title: string; authors: string[]; year: number | null; venue: string | null; doi: string | null; url: string | null;
  pdf_url: string | null; is_oa: boolean; cited_by_count: number | null; study_type: string | null; study_type_label: string | null;
  journal_tier: string | null; is_preprint: boolean; is_retracted: boolean; abstract: string | null;
};
export type ClaimResult = { claim: string; verdict: ClaimVerdict; explanation: string; strength: 'strong' | 'moderate' | 'weak' | null; papers: ClaimPaper[]; cited: number[] };

const STRONG = new Set(['meta-analysis', 'systematic-review', 'rct']);
const MODERATE = new Set(['clinical-trial', 'cohort', 'case-control', 'review']);

/** Evidence strength from the study types of the papers a verdict rests on. Pure, for tests. */
export function evidenceStrength(papers: { study_type: string | null }[]): ClaimResult['strength'] {
  if (!papers.length) return null;
  if (papers.some((paper) => paper.study_type && STRONG.has(paper.study_type))) return 'strong';
  if (papers.some((paper) => paper.study_type && MODERATE.has(paper.study_type))) return 'moderate';
  return 'weak';
}

/** The claims in a paragraph (a short text is one claim). */
export async function splitClaims(llm: LlmSlot, text: string, usage: LlmUsage): Promise<string[]> {
  const clean = text.replace(/\s+/g, ' ').trim();
  const sentences = clean.split(/(?<=[.!?])\s+/).filter((sentence) => sentence.length > 15);
  if (sentences.length <= 1) return [clean.slice(0, 500)];
  try {
    const { text: answer, usage: used } = await llm.complete({
      task: 'fast', temperature: 0, json: true, maxTokens: 900,
      messages: [
        { role: 'system', content: 'List the factual claims in the text that research could support or contradict (not opinions, not definitions). Each claim is one self-contained sentence. At most 10. Answer with JSON only: {"claims": ["…"]}.' },
        { role: 'user', content: clean.slice(0, 8000) },
      ],
    });
    addUsage(usage, used);
    const claims = (parseJson<{ claims?: string[] }>(answer)?.claims ?? []).map((claim) => String(claim).trim()).filter((claim) => claim.length > 10);
    return (claims.length ? claims : sentences).slice(0, 10);
  } catch {
    return sentences.slice(0, 10);
  }
}

const toClaimPaper = (paper: FoundPaper, n: number): ClaimPaper => ({
  n, id: paper.id, title: paper.title, authors: paper.authors.map((author) => author.name), year: paper.year, venue: paper.venue, doi: paper.doi,
  url: paper.url, pdf_url: paper.pdf_url, is_oa: paper.is_oa, cited_by_count: paper.cited_by_count, study_type: paper.study_type,
  study_type_label: paper.study_type ? STUDY_TYPE_LABELS[paper.study_type] : null, journal_tier: paper.journal?.tier ?? null,
  is_preprint: paper.is_preprint, is_retracted: Boolean(paper.is_retracted), abstract: paper.abstract ? paper.abstract.slice(0, 1500) : null,
});

export async function runClaimCheck(llm: LlmSlot, claims: string[], context: { userId: string; groups?: ('papers' | 'medical')[] }, usage: LlmUsage): Promise<ClaimResult[]> {
  const found = await mapLimit(claims, 3, async (claim) => {
    const result = await searchSources({ query: claim.slice(0, 280), groups: context.groups ?? ['papers', 'medical'], limit: 6, filters: { excludeRetracted: true } }, { userId: context.userId })
      .catch(() => ({ papers: [] as FoundPaper[] }));
    return result.papers;
  });
  const blocks = claims.map((claim, index) => ({ claim, papers: found[index].map((paper, at) => toClaimPaper(paper, at + 1)) }));
  const withPapers = blocks.filter((block) => block.papers.length);
  const labels = new Map<number, { verdict: ClaimVerdict; explanation: string; cited: number[] }>();
  if (withPapers.length) {
    const { text, usage: used } = await llm.complete({
      task: 'fast', temperature: 0, json: true, maxTokens: 300 + claims.length * 220,
      messages: [
        { role: 'system', content: 'For each claim, judge it only from its listed papers (title and abstract). Verdicts: "supported" (the papers clearly support it), "partly" (support with caveats, a narrower claim or mixed results), "not_supported" (the papers contradict it), "no_evidence" (the papers do not test it). Explain in one or two plain sentences and list the paper numbers you relied on. Answer with JSON only: {"items": [{"claim": 0, "verdict": "…", "explanation": "…", "cited": [1, 3]}]}.' },
        { role: 'user', content: blocks.map((block, index) => `Claim ${index}: ${block.claim}\n${block.papers.length ? block.papers.map((paper) => `  [${paper.n}] ${paper.title} (${paper.year ?? 'n.d.'}${paper.study_type_label ? `, ${paper.study_type_label}` : ''}). ${(paper.abstract || '').slice(0, 700)}`).join('\n') : '  (no papers found)'}`).join('\n\n') },
      ],
    });
    addUsage(usage, used);
    for (const item of parseJson<{ items?: { claim: number; verdict: string; explanation: string; cited?: number[] }[] }>(text)?.items ?? []) {
      const verdict = (['supported', 'partly', 'not_supported', 'no_evidence'] as const).find((value) => value === item.verdict) ?? 'no_evidence';
      labels.set(Number(item.claim), { verdict, explanation: String(item.explanation || '').slice(0, 600), cited: (item.cited ?? []).filter((n) => Number.isInteger(n)) });
    }
  }
  return blocks.map((block, index) => {
    const label = labels.get(index);
    const cited = (label?.cited ?? []).filter((n) => block.papers.some((paper) => paper.n === n));
    const verdict: ClaimVerdict = block.papers.length ? label?.verdict ?? 'no_evidence' : 'no_evidence';
    const basis = block.papers.filter((paper) => cited.includes(paper.n));
    return {
      claim: block.claim, verdict, cited, papers: block.papers,
      explanation: label?.explanation || (block.papers.length ? 'The papers found do not test this claim directly.' : 'No papers were found for this claim. Try rewording it or citing a source you know.'),
      strength: verdict === 'supported' || verdict === 'partly' || verdict === 'not_supported' ? evidenceStrength(basis) : null,
    };
  });
}
