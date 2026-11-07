import { describe, expect, it } from 'vitest';
import { isQuotation, longestSharedRun, ngramContainment, overlap, splitSentences, words } from '../../lib/server/lib/textOverlap.js';
import { verifiedQuote } from '../../lib/server/lib/matrix.js';
import { canonicalJson, reportHash, shares } from '../../lib/server/lib/authorship.js';

describe('textOverlap', () => {
  it('splits a paragraph into sentences and keeps each citation with its sentence', () => {
    const text = 'Sleep improves memory [[CITATION_1]]. Exercise helps too, e.g. running. (Smith, 2020) Results vary [[CITATION_2]].';
    const sentences = splitSentences(text);
    expect(sentences.map((sentence) => sentence.citations)).toEqual([['[[CITATION_1]]'], [], ['[[CITATION_2]]']]);
    expect(sentences[0].plain).toBe('Sleep improves memory.');
    // The anchor is text that occurs verbatim in the paragraph.
    for (const sentence of sentences) expect(text.includes(sentence.anchor)).toBe(true);
  });

  it('attaches a citation written after the full stop to the sentence before it', () => {
    const sentences = splitSentences('Rates fell by half. [[CITATION_1]] Then they rose.');
    expect(sentences).toHaveLength(2);
    expect(sentences[0].citations).toEqual(['[[CITATION_1]]']);
  });

  it('measures shared runs and containment', () => {
    expect(longestSharedRun(words('a b c d e'), words('x b c d y')).length).toBe(3);
    expect(ngramContainment(words('one two three four five'), words('one two three four five six'))).toBe(1);
  });

  it('flags copying and passes real paraphrase', () => {
    const source = 'The results indicate that regular aerobic exercise substantially improves working memory performance in older adults over twelve weeks.';
    expect(overlap('Regular aerobic exercise substantially improves working memory performance in older adults, the study found.', source).tooClose).toBe(true);
    expect(overlap('Older people who exercised for three months remembered more on short-term tasks.', source).tooClose).toBe(false);
  });

  it('treats a sentence in quotation marks as a quotation', () => {
    expect(isQuotation('As they put it, "regular aerobic exercise substantially improves working memory performance".')).toBe(true);
    expect(isQuotation('Exercise helps memory, a "small" effect.')).toBe(false);
  });
});

describe('matrix quotes', () => {
  it('keeps a quote only when it occurs in the passage', () => {
    const passage = 'We recruited 240 adults\n(aged 60–80) from three clinics.';
    expect(verifiedQuote('recruited 240 adults (aged 60–80)', passage)).toBe('recruited 240 adults (aged 60–80)');
    expect(verifiedQuote('recruited about 250 adults', passage)).toBeNull();
    expect(verifiedQuote('', passage)).toBeNull();
  });
});

describe('authorship', () => {
  it('splits added text into shares that sum to 100', () => {
    const result = shares({ active_seconds: 0, typed: 1, pasted_external: 1, pasted_internal: 1, ai_inserted: 0, deleted: 0 });
    expect(result.typed + result.pasted_external + result.pasted_internal + result.ai_inserted).toBe(100);
    expect(shares({ active_seconds: 0, typed: 0, pasted_external: 0, pasted_internal: 0, ai_inserted: 0, deleted: 5 }).typed).toBe(0);
  });

  it('hashes the same content the same way whatever the key order', () => {
    expect(canonicalJson({ b: 1, a: { d: [1, 2], c: 'x' } })).toBe('{"a":{"c":"x","d":[1,2]},"b":1}');
    expect(reportHash({ a: 1, b: 2 })).toBe(reportHash({ b: 2, a: 1 }));
    expect(reportHash({ a: 1 })).not.toBe(reportHash({ a: 2 }));
  });
});
