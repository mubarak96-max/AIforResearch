/**
 * The AI writing pattern checker (/tools/ai-writing-checker): finds phrases and habits readers
 * associate with machine-written text, with a tip for each. It never estimates who wrote a text:
 * people use these phrases too, and AI text can avoid them. Pure, runs in the browser.
 */

export type PatternKind = 'stock-word' | 'filler' | 'transition' | 'formula' | 'em-dash' | 'chatbot';

export const PATTERN_INFO: Record<PatternKind, { label: string; tip: string }> = {
  'stock-word': { label: 'Stock word', tip: 'A word AI tools overuse. Say the plain thing instead.' },
  filler: { label: 'Filler phrase', tip: 'Adds length, not meaning. Cut it or state the point directly.' },
  transition: { label: 'Stock transition', tip: 'Starting sentences this way gets repetitive. Often the sentence works without it.' },
  formula: { label: 'Formula', tip: 'A set pattern ("not only… but also", "it’s not X, it’s Y"). Rewrite in your own structure.' },
  'em-dash': { label: 'Em dash', tip: 'Heavy em dash use reads as generated. Try a comma, colon or full stop.' },
  chatbot: { label: 'Chatbot tone', tip: 'Phrasing from chat replies, out of place in a finished text.' },
};

const STOCK_WORDS = [
  'delve', 'delves', 'delving', 'tapestry', 'leverage', 'leverages', 'leveraging', 'robust', 'seamless', 'seamlessly', 'pivotal',
  'landscape', 'showcase', 'showcases', 'showcasing', 'testament', 'underscore', 'underscores', 'underscoring', 'realm', 'foster',
  'fosters', 'fostering', 'vibrant', 'transformative', 'intricate', 'multifaceted', 'nuanced', 'paramount', 'meticulous', 'meticulously',
  'groundbreaking', 'cutting-edge', 'game-changer', 'unlock', 'unlocking', 'elevate', 'embark', 'navigate the complexities', 'holistic',
  'synergy', 'commendable', 'noteworthy', 'invaluable', 'bustling', 'beacon', 'ever-evolving', 'harness', 'harnessing',
];

const FILLERS = [
  'it is important to note that', 'it is worth noting that', 'it\'s important to note that', 'it is worth mentioning that',
  'in today\'s fast-paced world', 'in today\'s world', 'in the ever-evolving', 'in the realm of', 'plays a crucial role',
  'plays a pivotal role', 'plays a vital role', 'a testament to', 'stands as a testament', 'serves as a reminder', 'in conclusion',
  'when it comes to', 'at the end of the day', 'it goes without saying', 'needless to say', 'a wide range of', 'a myriad of',
  'in order to', 'due to the fact that', 'the fact that', 'highlighting the importance of', 'underscoring the need',
];

const TRANSITIONS = ['Moreover', 'Furthermore', 'Additionally', 'In addition', 'Consequently', 'Notably', 'Ultimately', 'Overall', 'Thus', 'Hence', 'Indeed'];

const CHATBOT = ['i hope this helps', 'great question', 'certainly!', 'absolutely!', 'as an ai', 'let me know if', 'feel free to', 'happy to help', 'here is a', 'here\'s a'];

export type Finding = { start: number; end: number; kind: PatternKind; text: string };

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function collect(text: string, pattern: RegExp, kind: PatternKind, out: Finding[], group = 0) {
  for (const match of text.matchAll(pattern)) {
    const offset = group ? match[0].indexOf(match[group]) : 0;
    const value = match[group];
    const start = (match.index ?? 0) + offset;
    out.push({ start, end: start + value.length, kind, text: value });
  }
}

export function findPatterns(text: string): Finding[] {
  const found: Finding[] = [];
  collect(text, new RegExp(`\\b(${STOCK_WORDS.map(escape).join('|')})\\b`, 'gi'), 'stock-word', found);
  collect(text, new RegExp(`(${FILLERS.map(escape).join('|')})`, 'gi'), 'filler', found);
  collect(text, new RegExp(`(?:^|[.!?]\\s+|\\n\\s*)(${TRANSITIONS.map(escape).join('|')}),`, 'g'), 'transition', found, 1);
  collect(text, /\bnot only\b[^.!?]{1,80}\bbut also\b/gi, 'formula', found);
  collect(text, /\b(?:it'?s|it is|this is) not (?:just|only|merely) [^.!?,]{1,60}[,;—-]\s*(?:it'?s|it is|but)\b/gi, 'formula', found);
  collect(text, /—/g, 'em-dash', found);
  collect(text, new RegExp(`(${CHATBOT.map(escape).join('|')})`, 'gi'), 'chatbot', found);
  // Longest first, then drop anything inside an earlier find (a stock word inside a filler phrase).
  found.sort((a, b) => a.start - b.start || b.end - a.end);
  const kept: Finding[] = [];
  for (const item of found) {
    const last = kept[kept.length - 1];
    if (last && item.start < last.end) continue;
    kept.push(item);
  }
  return kept;
}

export type PatternSummary = {
  words: number;
  findings: Finding[];
  byKind: Partial<Record<PatternKind, number>>;
  /** Findings per 100 words. */
  per100: number;
  /** How alike sentence lengths are: the coefficient of variation (low means very even). */
  sentenceVariation: number | null;
  sentences: number;
};

export function summarise(text: string): PatternSummary {
  const findings = findPatterns(text);
  const words = (text.match(/\S+/g) || []).length;
  const byKind: Partial<Record<PatternKind, number>> = {};
  for (const finding of findings) byKind[finding.kind] = (byKind[finding.kind] ?? 0) + 1;
  const lengths = text.split(/(?<=[.!?])\s+/).map((sentence) => (sentence.match(/\S+/g) || []).length).filter((n) => n > 2);
  let sentenceVariation: number | null = null;
  if (lengths.length >= 5) {
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const sd = Math.sqrt(lengths.reduce((a, n) => a + (n - mean) ** 2, 0) / (lengths.length - 1));
    sentenceVariation = mean ? sd / mean : null;
  }
  return { words, findings, byKind, per100: words ? (findings.length / words) * 100 : 0, sentenceVariation, sentences: lengths.length };
}
