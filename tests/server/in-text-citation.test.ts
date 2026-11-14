import { describe, expect, it } from 'vitest';
import { authorPart, inTextCitation, surname } from '../../lib/inTextCitation.js';

const people = (n: number) => ['Smith, J.', 'Jane Jones', 'Lee', 'Patel, R. K.', 'Okafor'].slice(0, n);

describe('in-text citations: author names', () => {
  it('takes the family name from each way of typing a name', () => {
    expect(surname('Smith, J.')).toBe('Smith');
    expect(surname('Jane Smith')).toBe('Smith');
    expect(surname('J. K. Smith')).toBe('Smith');
    expect(surname('Smith')).toBe('Smith');
    expect(surname('World Health Organization', true)).toBe('World Health Organization');
  });
});

describe('in-text citations: et al. thresholds', () => {
  it('APA 7: two authors in full with "&", three or more "et al."', () => {
    expect(inTextCitation('apa', { authors: people(1), year: '2020' }).parenthetical).toBe('(Smith, 2020)');
    expect(inTextCitation('apa', { authors: people(2), year: '2020' })).toMatchObject({ parenthetical: '(Smith & Jones, 2020)', narrative: 'Smith and Jones (2020)' });
    expect(inTextCitation('apa', { authors: people(3), year: '2020' })).toMatchObject({ parenthetical: '(Smith et al., 2020)', narrative: 'Smith et al. (2020)' });
  });

  it('MLA 9: two authors with "and", three or more "et al.", no year', () => {
    expect(inTextCitation('mla', { authors: people(2), year: '2020', locator: { type: 'page', value: '12' } }).parenthetical).toBe('(Smith and Jones 12)');
    expect(inTextCitation('mla', { authors: people(3), year: '2020', locator: { type: 'page', value: '12' } }).parenthetical).toBe('(Smith et al. 12)');
    expect(inTextCitation('mla', { authors: people(1), locator: { type: 'paragraph', value: '4' } }).parenthetical).toBe('(Smith, par. 4)');
  });

  it('Chicago author-date 17: up to three authors, four or more "et al."', () => {
    expect(inTextCitation('chicago', { authors: people(3), year: '2020' }).parenthetical).toBe('(Smith, Jones, and Lee 2020)');
    expect(inTextCitation('chicago', { authors: people(4), year: '2020', locator: { type: 'page', value: '12' } }).parenthetical).toBe('(Smith et al. 2020, 12)');
  });

  it('Harvard (Cite Them Right): up to three authors with "and", four or more "et al."', () => {
    expect(inTextCitation('harvard', { authors: people(3), year: '2020' }).parenthetical).toBe('(Smith, Jones and Lee, 2020)');
    expect(inTextCitation('harvard', { authors: people(4), year: '2020' }).parenthetical).toBe('(Smith et al., 2020)');
  });

  it('numeric: names in the sentence follow the same pattern', () => {
    expect(inTextCitation('numeric', { authors: people(3), number: 4 })).toMatchObject({ parenthetical: '[4]', narrative: 'Smith et al. [4]' });
    expect(authorPart('numeric', ['Smith', 'Jones'], 'narrative')).toBe('Smith and Jones');
  });
});

describe('in-text citations: dates, suffixes and locators', () => {
  it('writes the style’s "no date" form', () => {
    expect(inTextCitation('apa', { authors: people(1) }).parenthetical).toBe('(Smith, n.d.)');
    expect(inTextCitation('chicago', { authors: people(1) }).parenthetical).toBe('(Smith, n.d.)');
    expect(inTextCitation('harvard', { authors: people(1) }).parenthetical).toBe('(Smith, no date)');
  });

  it('adds a, b for two works by the same author in the same year', () => {
    expect(inTextCitation('apa', { authors: people(1), year: '2020', suffix: 'a' }).parenthetical).toBe('(Smith, 2020a)');
    expect(inTextCitation('apa', { authors: people(1), suffix: 'b' }).parenthetical).toBe('(Smith, n.d.-b)');
    expect(inTextCitation('chicago', { authors: people(2), year: '2020', suffix: 'b' }).parenthetical).toBe('(Smith and Jones 2020b)');
  });

  it('formats pages and paragraphs', () => {
    expect(inTextCitation('apa', { authors: people(1), year: '2020', locator: { type: 'page', value: '12-15' } }).parenthetical).toBe('(Smith, 2020, pp. 12–15)');
    expect(inTextCitation('apa', { authors: people(1), year: '2020', locator: { type: 'paragraph', value: '4' } }).parenthetical).toBe('(Smith, 2020, para. 4)');
    expect(inTextCitation('harvard', { authors: people(1), year: '2020', locator: { type: 'page', value: '7' } }).narrative).toBe('Smith (2020, p. 7)');
  });

  it('APA group authors: abbreviation in brackets the first time only', () => {
    const base = { authors: ['World Health Organization'], group: true, groupAbbr: 'WHO', year: '2021' };
    expect(inTextCitation('apa', { ...base, first: true }).parenthetical).toBe('(World Health Organization [WHO], 2021)');
    expect(inTextCitation('apa', base).parenthetical).toBe('(WHO, 2021)');
  });
});
