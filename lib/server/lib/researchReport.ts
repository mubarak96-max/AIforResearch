/**
 * A Deep or Detailed report, written the way a review is: an outline first, then each thematic
 * section from its own sources (several at once), then the closing sections (disagreements,
 * limits, open questions), then the Summary from the finished text.
 *
 * Computed, never typed by a model: the Methods paragraph ("How this review was done"), the
 * evidence overview, the comparison table (Detailed) and every figure (researchFigures.ts).
 *
 *   ## Summary                       written last, from the report
 *   ## How this review was done      computed + Figure 1 (flow of sources)
 *   ## Evidence at a glance          computed + figures (years, designs, stances, effects)
 *   ## <theme> …                     one model call each, from the outline
 *   ## Comparison of studies         computed table (Detailed)
 *   ## Where studies disagree …      one model call for all closing sections
 */
import type { ChatMessage } from '../slots/types.js';
import { RANKING_DESCRIPTIONS, RESEARCH_METHOD_LABELS, appraisalGuidance, researchMethod, type ResearchMethod } from '../../researchMethods.js';
import {
  DEPTH_SETTINGS, parseJson, sourcesBlock,
  type Depth, type ResearchInput, type ResearchPlan, type ResearchSource, type Stance,
} from './research.js';
import {
  EFFECT_MEASURES, STANCE_ORDER, figureBlock,
  type PrismaData, type ResearchFigure,
} from './researchFigures.js';

const ROLE_TEXT: Record<string, string> = {
  undergraduate: 'an undergraduate student', honours: 'an honours student', masters: 'a master’s student', phd: 'a doctoral researcher',
  academic: 'an academic', researcher: 'a researcher', clinician: 'a clinician', industry: 'a professional in industry', other: 'a researcher',
};
const clip = (text: string | null | undefined, max: number) => (text || '').replace(/\s+/g, ' ').trim().slice(0, max);
const plural = (count: number, word: string, many = `${word}s`) => `${count.toLocaleString('en-US')} ${count === 1 ? word : many}`;
const isPaper = (source: ResearchSource) => source.kind === 'paper' || source.kind === 'library';
const shortAuthor = (source: ResearchSource) => {
  const first = source.authors[0]?.split(/\s+/).at(-1);
  return first ? `${first}${source.authors.length > 1 || source.more_authors ? ' et al.' : ''}` : clip(source.venue || source.title, 30);
};

// ------------------------------------------------------------------ shared prompt rules

function writerRules(input: ResearchInput): string[] {
  const reader = ROLE_TEXT[input.role || input.profile.role || ''] || 'a researcher';
  const field = input.profile.field ? ` in ${input.profile.field}` : '';
  return [
    'You are AI for Research, writing part of a literature review that answers only from the numbered sources given.',
    `Write for ${reader}${field}, in clear, plain, formal language; prefer short common words and direct sentences.`,
    'Cite every factual claim with its source marker in square brackets right after the claim, e.g. [S2] or [S1, S4]. Cite only what a source says; never invent sources, authors, years, numbers or markers, and do not write a reference list.',
    'Markers are not words: never write "S2 suggests"; describe the finding and put the marker after it.',
    appraisalGuidance(input.method),
    'Compare and connect studies rather than listing them one by one.',
    `Write in ${input.language || 'the language of the question'}. Markdown only; no preamble, no closing offer of help; never mention being an AI.`,
  ];
}

/** One line per source, for the outline and the closing sections. */
export function compactSources(sources: ResearchSource[]): string {
  return sources.map((source) => {
    const facts = [
      source.year ?? 'n.d.', source.study_type_label, source.stance && source.kind !== 'web' ? source.stance : null,
      source.sample ? `n: ${clip(source.sample, 60)}` : null,
    ].filter(Boolean).join(' · ');
    const effect = source.effect ? ` Effect: ${source.effect.measure} ${source.effect.value} (${source.effect.low} to ${source.effect.high})${source.effect.outcome ? ` for ${source.effect.outcome}` : ''}.` : '';
    return `[${source.marker}] ${clip(source.title, 140)} (${facts}). ${clip(source.finding || source.tldr || source.abstract, 260)}${effect}${source.limits ? ` Limitation: ${clip(source.limits, 100)}.` : ''}`;
  }).join('\n');
}

// ------------------------------------------------------------------ outline

export type OutlineSection = { heading: string; focus: string; sources: number[] };
export type Outline = { sections: OutlineSection[]; labels: Record<FixedLabel, string> };
type FixedLabel = 'summary' | 'methods' | 'glance' | 'comparison';
export const DEFAULT_LABELS: Record<FixedLabel, string> = {
  summary: 'Summary', methods: 'How this review was done', glance: 'Evidence at a glance', comparison: 'Comparison of studies',
};

export function outlinePrompt(input: ResearchInput, plan: ResearchPlan, sources: ResearchSource[]): ChatMessage[] {
  const [least, most] = DEPTH_SETTINGS[input.depth].themes;
  return [
    {
      role: 'system',
      content: 'You outline the body of a literature review. Answer with JSON only: {"sections": [{"heading": "…", "focus": "…", "sources": [3, 7]}], "labels": {"summary": "…", "methods": "…", "glance": "…", "comparison": "…"}}. '
        + `Make ${least} to ${most} thematic sections that together answer the question, ordered so the reader builds understanding: the main answer or effect first, then mechanisms, populations or settings, comparisons with alternatives, and moderators. `
        + 'Group by theme, not by source and not one section per sub-question unless that is the clearest grouping. Do not make sections for disagreements, limitations, implications or open questions; those are written separately. '
        + '"heading": 2 to 7 plain words, no numbering, no markers. "focus": one sentence on what the section must establish. "sources": the numbers (n of [Sn]) of the 3 to 15 sources the section should draw on; use every relevant source somewhere, and a source may serve two sections. '
        + '"labels": the four fixed headings "Summary", "How this review was done", "Evidence at a glance" and "Comparison of studies", translated into the language the report is written in (unchanged for English).',
    },
    {
      role: 'user',
      content: `Question: ${input.question}\nReport language: ${input.language || 'the language of the question'}\n\nSub-questions:\n${plan.sub_questions.map((sub, index) => `${index + 1}. ${sub.question}`).join('\n')}\n\nSources:\n${compactSources(sources)}`,
    },
  ];
}

/**
 * The model's outline made safe: real source numbers only, a capped count, and every sub-question
 * represented. When the model fails, one section per sub-question from the papers its searches found.
 */
export function cleanOutline(raw: string | null, depth: Depth, plan: ResearchPlan, sources: ResearchSource[]): Outline {
  const [least, most] = DEPTH_SETTINGS[depth].themes;
  const valid = new Set(sources.map((source) => source.n));
  const parsed = raw ? parseJson<{ sections?: { heading?: unknown; focus?: unknown; sources?: unknown }[]; labels?: Record<string, unknown> }>(raw) : null;
  const sections: OutlineSection[] = [];
  for (const item of parsed?.sections ?? []) {
    const heading = clip(String(item.heading ?? ''), 80).replace(/\[S?\d+[^\]]*\]/g, '').replace(/^[#\d.\s]+/, '').replace(/[*_`#]/g, '').trim();
    const numbers = [...new Set((Array.isArray(item.sources) ? item.sources : []).map((n) => Number(String(n).replace(/\D/g, ''))).filter((n) => valid.has(n)))].slice(0, 18);
    if (!heading || numbers.length < 1 || sections.some((section) => section.heading.toLowerCase() === heading.toLowerCase())) continue;
    sections.push({ heading, focus: clip(String(item.focus ?? ''), 300), sources: numbers });
    if (sections.length >= most) break;
  }
  const labels = { ...DEFAULT_LABELS };
  for (const key of Object.keys(DEFAULT_LABELS) as FixedLabel[]) {
    const label = clip(String(parsed?.labels?.[key] ?? ''), 60).replace(/[*_`#[\]]/g, '').trim();
    if (label) labels[key] = label;
  }
  if (sections.length >= Math.min(least, 2)) return { sections, labels };

  // Fallback: a section per sub-question, from the sources its searches found (or the best ones).
  const papers = sources.filter(isPaper);
  const fallback = plan.sub_questions.slice(0, Math.max(1, most)).map((sub, index) => {
    const own = papers.filter((source) => source.sub_questions?.includes(index)).map((source) => source.n);
    return { heading: clip(sub.question.replace(/\?$/, ''), 80), focus: sub.question, sources: (own.length ? own : papers.slice(0, 10).map((source) => source.n)).slice(0, 15) };
  });
  return { sections: fallback.length ? fallback : [{ heading: 'What the evidence shows', focus: '', sources: sources.slice(0, 15).map((source) => source.n) }], labels };
}

// ------------------------------------------------------------------ sections

/** Words each thematic section aims for, from the report's length and its section count. */
export function sectionWords(depth: Depth, count: number): string {
  const [low, high] = depth === 'detailed' ? [3800, 5600] : [1900, 2800];
  const each = (total: number) => Math.round(total / Math.max(1, count) / 50) * 50;
  return `${each(low)} to ${each(high)}`;
}

export function sectionPrompt(input: ResearchInput, section: OutlineSection, all: OutlineSection[], sources: ResearchSource[]): ChatMessage[] {
  const settings = DEPTH_SETTINGS[input.depth];
  const others = all.filter((item) => item !== section).map((item) => `- ${item.heading}`).join('\n');
  return [
    {
      role: 'system',
      content: [
        ...writerRules(input),
        `Write the body of one section, titled "${section.heading}". Do not write the section title itself. You may use ### subheadings for distinct strands, and one small Markdown table where it truly helps compare studies.`,
        `Length: about ${sectionWords(input.depth, all.length)} words.`,
        'Other sections cover the topics listed below; do not repeat them.',
      ].join(' '),
    },
    {
      role: 'user',
      content: `Question: ${input.question}\nThis section: ${section.heading}${section.focus ? ` (${section.focus})` : ''}\n\nOther sections:\n${others || '- none'}\n\nSources:\n${sourcesBlock(sources, settings.abstractChars)}`,
    },
  ];
}

export function closingHeadings(depth: Depth): string[] {
  return depth === 'detailed'
    ? ['Where studies disagree and why', 'Quality and limits of the evidence', 'Implications', 'Open questions and future research']
    : ['Where studies disagree', 'Limits of the evidence', 'Open questions'];
}

/** The closing sections, in one call: they read the whole body and every source's finding and limits. */
export function closingPrompt(input: ResearchInput, body: string, sources: ResearchSource[]): ChatMessage[] {
  const headings = closingHeadings(input.depth);
  const words = input.depth === 'detailed' ? '900 to 1,300' : '500 to 750';
  return [
    {
      role: 'system',
      content: [
        ...writerRules(input),
        `Write the closing sections of the review, each starting with a level-2 Markdown heading, in this order: ${headings.map((heading) => `"## ${heading}"`).join(', ')} (translate the headings into the report's language). About ${words} words in all.`,
        'Disagreements: name the studies that conflict and the likely reasons (design, population, measures, follow-up). Limits: the weaknesses of the evidence as a whole (designs, sample sizes, bias, preprints, coverage), not of this review.',
        input.depth === 'detailed' ? 'Implications: what follows for practice, policy or research, only as far as the evidence allows.' : '',
        'Open questions: what the evidence does not yet answer, as a short list. Do not repeat the body; build on it.',
      ].filter(Boolean).join(' '),
    },
    { role: 'user', content: `Question: ${input.question}\n\nThe report so far:\n${body.slice(0, 26000)}\n\nSources:\n${compactSources(sources)}` },
  ];
}

export function summaryPrompt(input: ResearchInput, report: string): ChatMessage[] {
  const words = input.depth === 'detailed' ? '250 to 350' : '150 to 230';
  return [
    {
      role: 'system',
      content: [
        ...writerRules(input),
        `Write the Summary that opens this report: about ${words} words, in one or two paragraphs, without a heading.`,
        'Start with the direct answer to the question, then the strength and limits of the evidence, then the main open question. Use only claims the report makes, with the same markers it uses.',
      ].join(' '),
    },
    { role: 'user', content: `Question: ${input.question}\n\nThe report:\n${report.slice(0, 32000)}` },
  ];
}

// ------------------------------------------------------------------ computed parts

const GROUP_NAMES: Record<string, string[]> = {
  papers: ['OpenAlex', 'Semantic Scholar'], medical: ['PubMed', 'Europe PMC'], preprints: ['arXiv and other preprint servers'], web: ['the open web'], library: ['the person’s Library'],
};
const list = (items: string[]) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`);

export type MethodsFacts = {
  groups: string[]; searches: number; subQuestions: number; seeds: number; prisma: PrismaData; gapSearches: number;
  filters: ResearchInput['filters']; date?: Date; method?: ResearchMethod;
};

/** "How this review was done": what was searched, how much, and how it was narrowed. */
export function methodsText(facts: MethodsFacts): string {
  const { prisma } = facts;
  const date = (facts.date ?? new Date()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const limits = [
    facts.filters.fromYear || facts.filters.toYear ? `published ${facts.filters.fromYear ? `from ${facts.filters.fromYear}` : ''}${facts.filters.toYear ? ` to ${facts.filters.toYear}` : ''}`.trim() : null,
    facts.filters.studyTypes?.length ? `of these designs: ${facts.filters.studyTypes.join(', ')}` : null,
    facts.filters.openAccess ? 'open access' : null,
    facts.filters.minCitations ? `cited at least ${facts.filters.minCitations} times` : null,
    facts.filters.excludePreprints ? 'peer reviewed (no preprints)' : null,
  ].filter(Boolean) as string[];
  const sentences = [
    `We searched ${list(facts.groups.flatMap((group) => GROUP_NAMES[group] ?? [group]))} on ${date}, with ${plural(facts.searches, 'search', 'searches')} built from the question${facts.subQuestions > 1 ? ` and ${plural(facts.subQuestions, 'sub-question')}` : ''}${limits.length ? `, limited to papers ${list(limits)}` : ''}.`,
    facts.seeds && prisma.chased ? `We also followed the references and citations of the ${plural(facts.seeds, 'strongest paper')} (citation chasing), which added ${plural(prisma.chased, 'record')}.` : null,
    `The searches returned ${plural(prisma.identified, 'record')}; after ${plural(prisma.duplicates, 'duplicate')} were removed, the ${plural(prisma.screened, 'best-matching record')} were screened by title and abstract and ${prisma.relevant.toLocaleString('en-US')} were judged relevant.`,
    `The ${plural(prisma.included - prisma.gap_added, 'selected paper')} were ranked for ${RESEARCH_METHOD_LABELS[researchMethod(facts.method)].toLowerCase()}. ${RANKING_DESCRIPTIONS[researchMethod(facts.method)]} They were read for their findings, samples and limitations${prisma.full_text ? `, using open full-text excerpts for ${prisma.full_text} of them` : ''}.`,
    facts.gapSearches ? `A second round of ${plural(facts.gapSearches, 'search', 'searches')} aimed at the gaps the first reading left ${prisma.gap_added ? `added ${plural(prisma.gap_added, 'paper')}` : 'found no further relevant papers'}.` : null,
    'AI checks of cited narrative sentences and DOI notices are attempted within the report’s limits. The verification panel records completed checks, source basis and unverified claims; computed tables and uncited statements are outside those narrative checks. Screening, reading and writing were done by AI; inspect the key sources and any revised sentences before relying on them.',
  ];
  return sentences.filter(Boolean).join(' ');
}

/** "Evidence at a glance": years, designs and how the studies bear on the question, in words. */
export function glanceText(papers: ResearchSource[], consensusLine: string | null): string {
  const years = papers.map((source) => source.year).filter((year): year is number => Boolean(year)).sort((a, b) => a - b);
  const designs = new Map<string, number>();
  for (const source of papers) if (source.study_type_label && source.study_type !== 'other') designs.set(source.study_type_label.toLowerCase(), (designs.get(source.study_type_label.toLowerCase()) ?? 0) + 1);
  const top = [...designs].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([label, count]) => `${label} (${count})`);
  const effects = papers.filter((source) => source.effect).length;
  return [
    `The report draws on ${plural(papers.length, 'paper')}${years.length ? ` published between ${years[0]} and ${years.at(-1)} (median ${years[Math.floor(years.length / 2)]})` : ''}.`,
    top.length ? `The most common designs are ${list(top)}.` : null,
    consensusLine,
    effects ? `${plural(effects, 'study', 'studies')} report an effect size with a confidence interval that could be checked against the paper's text.` : null,
  ].filter(Boolean).join(' ');
}

/** Detailed: one row per included paper, from what Read extracted. */
export function comparisonTable(papers: ResearchSource[], max = 40): string {
  const rows = papers.filter((source) => source.finding).slice(0, max);
  if (rows.length < 3) return '';
  const cell = (text: string | null | undefined, size: number) => clip(text, size).replace(/\|/g, '/') || '–';
  return [
    '| Source | Design | Studied | Main finding | Main limitation |',
    '| --- | --- | --- | --- | --- |',
    ...rows.map((source) => `| ${shortAuthor(source)} ${source.year ?? 'n.d.'} [${source.marker}] | ${cell(source.study_type_label, 40)} | ${cell(source.sample, 80)} | ${cell(source.finding, 220)} | ${cell(source.limits, 100)} |`),
  ].join('\n');
}

// ------------------------------------------------------------------ figures

export type FigureContext = { depth: Depth; plan: ResearchPlan; papers: ResearchSource[]; prisma: PrismaData };

/** The figures, numbered in the order they appear; each knows which part of the report it goes in. */
export function buildFigures(context: FigureContext): { figures: ResearchFigure[]; methods: string[]; glance: string[] } {
  const { papers, plan, prisma, depth } = context;
  const figures: ResearchFigure[] = [];
  const methods: string[] = [];
  const glance: string[] = [];
  const add = (where: string[], figure: Omit<ResearchFigure, 'id' | 'number' | 'title'> & { name: string }) => {
    const number = figures.length + 1;
    const { name, ...rest } = figure;
    const full = { ...rest, id: `fig-${number}`, number, title: `Figure ${number}. ${name}` } as ResearchFigure;
    figures.push(full);
    where.push(figureBlock(full.id));
  };

  add(methods, {
    kind: 'prisma', name: 'How the sources were found and chosen', data: prisma,
    caption: 'In the style of a PRISMA flow diagram. Screening and ranking were done by AI from titles and abstracts; the excluded papers and the reasons are listed under How this answer was made.',
  });

  const years = papers.map((source) => source.year).filter((year): year is number => Boolean(year));
  if (years.length >= 5) {
    const first = Math.min(...years);
    const last = Math.max(...years);
    const span = last - first;
    const step = span <= 15 ? 1 : span <= 40 ? 5 : 10;
    const start = step === 1 ? first : Math.floor(first / step) * step;
    const bars: { label: string; value: number }[] = [];
    for (let year = start; year <= last; year += step) {
      const label = step === 1 ? String(year) : `${year}–${String(Math.min(year + step - 1, last)).slice(-2)}`;
      bars.push({ label, value: years.filter((item) => item >= year && item < year + step).length });
    }
    add(glance, { kind: 'bars', name: 'Included papers by year', data: { orientation: 'vertical', unit: 'Papers', bars }, caption: `Publication years of the ${plural(years.length, 'included paper')} with a known year.` });
  }

  const designOf = (source: ResearchSource) => (source.study_type && source.study_type !== 'other' && source.study_type_label ? source.study_type_label : 'Other or not classified');
  const designCounts = new Map<string, number>();
  for (const source of papers) designCounts.set(designOf(source), (designCounts.get(designOf(source)) ?? 0) + 1);
  if (designCounts.size >= 2) {
    add(glance, {
      kind: 'bars', name: 'Included papers by study design',
      data: { orientation: 'horizontal', unit: 'Papers', bars: [...designCounts].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value })) },
      caption: 'Study designs as classified from each paper’s metadata and abstract. Design labels describe this source set; they do not establish validity or certainty.',
    });
  }

  const tested = papers.filter((source) => source.stance && source.stance !== 'unclear');
  if (tested.length >= 3) {
    const rows = new Map<string, Record<Stance, number>>();
    for (const source of papers) {
      if (!source.stance) continue;
      const label = designOf(source);
      if (!rows.has(label)) rows.set(label, { supports: 0, mixed: 0, against: 0, unclear: 0 });
      rows.get(label)![source.stance] += 1;
    }
    const total = (values: Record<Stance, number>) => STANCE_ORDER.reduce((sum, stance) => sum + values[stance], 0);
    add(glance, {
      kind: 'stacked', name: 'How the studies bear on the question, by design',
      data: { rows: [...rows].sort((a, b) => total(b[1]) - total(a[1])).map(([label, values]) => ({ label, values })) },
      caption: 'Each study’s stance as read by AI from its abstract and any open full text. “Not tested” means the paper is relevant background but does not test the question itself.',
    });
  }

  if (depth === 'detailed' && plan.sub_questions.length > 1) {
    add(glance, {
      kind: 'bars', name: 'Included papers for each sub-question',
      data: {
        orientation: 'horizontal', unit: 'Papers',
        bars: plan.sub_questions.map((sub, index) => ({ label: `Q${index + 1}. ${clip(sub.question, 48)}${sub.question.length > 48 ? '…' : ''}`, title: sub.question, value: papers.filter((source) => source.sub_questions?.includes(index)).length })),
      },
      caption: 'Papers found by each sub-question’s searches. A paper can serve more than one; a short bar marks a thinner part of the evidence.',
    });
  }

  const byMeasure = new Map<string, ResearchSource[]>();
  for (const source of papers) if (source.effect) byMeasure.set(source.effect.measure, [...(byMeasure.get(source.effect.measure) ?? []), source]);
  const [measure, withEffect] = [...byMeasure].sort((a, b) => b[1].length - a[1].length)[0] ?? [null, []];
  if (measure && withEffect.length >= 3) {
    const ratio = EFFECT_MEASURES[measure].ratio;
    add(glance, {
      kind: 'forest', name: `${EFFECT_MEASURES[measure].label}s reported by the studies`,
      data: {
        measure, log: ratio, null_value: ratio ? 1 : 0,
        rows: withEffect.sort((a, b) => (a.year ?? 0) - (b.year ?? 0) || a.n - b.n).slice(0, 25).map((source) => ({
          n: source.n, label: `${shortAuthor(source)} ${source.year ?? 'n.d.'}`, value: source.effect!.value, low: source.effect!.low, high: source.effect!.high, outcome: source.effect!.outcome,
        })),
      },
      caption: 'Each study’s estimate with its 95% confidence interval, as written in the paper, kept only where all three numbers appear in its text. Outcomes, populations and comparisons differ, so this is not a pooled (meta-analytic) estimate. The dashed line marks no effect.',
    });
  }
  return { figures, methods, glance };
}
