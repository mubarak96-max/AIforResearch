import { describe, expect, it } from 'vitest';
import { bestMatch, findDoi, guessTitle, lookupQuery, splitReferences, titleOverlap } from '../../lib/referenceMatch.js';

const LINE = 'Ioannidis, J. P. A. (2005). Why most published research findings are false. PLoS Medicine, 2(8), e124.';

describe('citation formatter: splitting and lookup', () => {
  it('splits on lines, or on blank lines when entries wrap, and drops numbering', () => {
    expect(splitReferences('1. One reference here\n2. Two reference here')).toEqual(['One reference here', 'Two reference here']);
    expect(splitReferences('[1] First line\nwraps here\n\n[2] Second')).toEqual(['First line wraps here', 'Second']);
  });

  it('finds a DOI without trailing punctuation', () => {
    expect(findDoi('… e124. https://doi.org/10.1371/journal.pmed.0020124.')).toBe('10.1371/journal.pmed.0020124');
    expect(findDoi('no doi here')).toBeNull();
  });

  it('guesses the title of APA and MLA references', () => {
    expect(guessTitle(LINE)).toBe('Why most published research findings are false');
    expect(guessTitle('Ioannidis, John P. A. “Why Most Published Research Findings Are False.” PLoS Medicine, vol. 2, no. 8, 2005.')).toBe('Why Most Published Research Findings Are False');
    expect(lookupQuery(`${LINE} https://doi.org/10.1371/journal.pmed.0020124`)).toBe('10.1371/journal.pmed.0020124');
  });
});

describe('citation formatter: match guard', () => {
  const right = { id: 'a', title: 'Why Most Published Research Findings Are False', issued: { 'date-parts': [[2005]] } };
  const wrong = { id: 'b', title: 'Deep residual learning for image recognition', issued: { 'date-parts': [[2016]] } };

  it('accepts a result whose title is in the line', () => {
    expect(titleOverlap(LINE, right.title)).toBe(1);
    expect(bestMatch(LINE, [wrong, right], null)).toMatchObject({ item: right, status: 'matched' });
  });

  it('rejects weak matches and flags a year that disagrees', () => {
    expect(bestMatch(LINE, [wrong], null).status).toBe('not-found');
    const late = { ...right, issued: { 'date-parts': [[2019]] } };
    expect(bestMatch(LINE, [late], null).status).toBe('check');
  });

  it('trusts a DOI lookup', () => {
    expect(bestMatch('10.1371/journal.pmed.0020124', [{ ...right, DOI: '10.1371/journal.pmed.0020124' }], '10.1371/journal.pmed.0020124').status).toBe('matched');
  });
});
