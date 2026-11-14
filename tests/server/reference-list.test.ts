import { describe, expect, it } from 'vitest';
import { findDuplicates, parseReference, sortReferenceList, sortReferences, splitReferences } from '../../lib/referenceList.js';

const order = (raw: string, style: 'apa' | 'mla' = 'apa') => sortReferenceList(raw, style).entries.map((entry) => entry.text);

describe('splitting a pasted list', () => {
  it('splits on blank lines and joins wrapped lines inside a block', () => {
    const raw = 'Smith, J. (2020). A long title that\nwraps onto a second line. Journal, 1, 1–2.\n\nLee, K. (2019). Short. Press.';
    expect(splitReferences(raw)).toEqual([
      'Smith, J. (2020). A long title that wraps onto a second line. Journal, 1, 1–2.',
      'Lee, K. (2019). Short. Press.',
    ]);
  });

  it('splits one entry per line and rejoins lines that continue the one before', () => {
    const raw = [
      'References',
      'Watson, J. D., & Crick, F. H. C. (1953). Molecular structure of nucleic acids: A structure for deoxyribose',
      'nucleic acid. Nature, 171(4356), 737–738.',
      'https://doi.org/10.1038/171737a0',
      'Adams, P. (2021). Second entry. Publisher.',
    ].join('\n');
    const entries = splitReferences(raw);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toBe('Watson, J. D., & Crick, F. H. C. (1953). Molecular structure of nucleic acids: A structure for deoxyribose nucleic acid. Nature, 171(4356), 737–738. https://doi.org/10.1038/171737a0');
  });

  it('keeps numbered entries apart', () => {
    expect(splitReferences('[1] A. Smith, “One,” 2020.\n[2] B. Lee, “Two,” 2021.')).toHaveLength(2);
    expect(parseReference('[12] B. Lee, “Two,” 2021.').number).toBe(12);
  });
});

describe('reading an entry', () => {
  it('reads APA authors, year, suffix, title and DOI', () => {
    const entry = parseReference('Watson, J. D., & Crick, F. H. C. (1953b). Molecular structure of nucleic acids. Nature, 171, 737–738. https://doi.org/10.1038/171737A0');
    expect(entry.authors.map((a) => a.family)).toEqual(['Watson', 'Crick']);
    expect(entry).toMatchObject({ year: 1953, suffix: 'b', yearKind: 'dated', title: 'Molecular structure of nucleic acids', doi: '10.1038/171737a0' });
  });

  it('reads n.d., in press, group authors and title-first entries', () => {
    expect(parseReference('Smith, J. (n.d.). Web page. Site.').yearKind).toBe('nd');
    expect(parseReference('Smith, J. (in press). Book. Press.').yearKind).toBe('in-press');
    const group = parseReference('World Health Organization. (2023). Global tuberculosis report 2023. WHO.');
    expect(group).toMatchObject({ authors: [], lead: 'World Health Organization', titleFirst: false });
    const titled = parseReference('The ethics of data sharing in small studies. (2020). Retrieved from https://example.org');
    expect(titled.titleFirst).toBe(true);
  });

  it('reads Chicago author-date and MLA entries', () => {
    expect(parseReference('Smith, John, and Kim Lee. 2019. Title of the Book. Chicago: Press.')).toMatchObject({ year: 2019, title: 'Title of the Book' });
    const mla = parseReference('Smith, John, and Kim Lee. “Title of the Article.” Journal, vol. 3, no. 2, 2019, pp. 1–9.', 'mla');
    expect(mla.authors.map((a) => a.family)).toEqual(['Smith', 'Lee']);
    expect(mla).toMatchObject({ year: 2019, title: 'Title of the Article' });
  });
});

describe('APA 7 order', () => {
  it('puts nothing before something, letter by letter', () => {
    expect(order('Browning, A. R. (2019). B. P.\nBrown, J. R. (2020). A. P.')).toEqual(['Brown, J. R. (2020). A. P.', 'Browning, A. R. (2019). B. P.']);
    // Letter by letter ignores spaces: "De Vries" sorts as "devries", after "Devlin".
    expect(order('De Vries, A. (2020). T. P.\nDevlin, B. (2020). T. P.').map((t) => t.slice(0, 6))).toEqual(['Devlin', 'De Vri']);
  });

  it('puts one-author works first, then by co-authors, then n.d., years and in press', () => {
    const raw = [
      'Smith, J. (2021). Later. P.',
      'Smith, J., & Adams, K. (2018). Co-authored. P.',
      'Smith, J. (in press). Coming. P.',
      'Smith, J. (n.d.). Undated. P.',
      'Smith, J. (2019). Earlier. P.',
      'Smith, A. (2025). Other initial. P.',
    ].join('\n');
    expect(order(raw).map((t) => t.split('. ').slice(-2, -1)[0])).toEqual(['Other initial', 'Undated', 'Earlier', 'Later', 'Coming', 'Co-authored']);
  });

  it('orders same author and year by the a/b letter', () => {
    expect(order('Lee, K. (2020b). Zeta. P.\nLee, K. (2020a). Alpha. P.')).toEqual(['Lee, K. (2020a). Alpha. P.', 'Lee, K. (2020b). Zeta. P.']);
  });

  it('ignores A, An and The at the start of a title-first entry', () => {
    const raw = 'The zebra handbook. (2020). Retrieved from https://example.org\nMiller, C. (2020). T. P.';
    expect(order(raw)[0]).toMatch(/^Miller/);
  });
});

describe('MLA 9 order', () => {
  it('orders the same author by title, ignoring articles', () => {
    const raw = 'Smith, John. The Zoo. Press, 2001.\nSmith, John. An Apple. Press, 2010.';
    expect(order(raw, 'mla')).toEqual(['Smith, John. An Apple. Press, 2010.', 'Smith, John. The Zoo. Press, 2001.']);
  });
});

describe('duplicates', () => {
  const entries = (lines: string[]) => sortReferences(lines.map((line) => parseReference(line)));

  it('finds the same DOI and the same title and year', () => {
    const list = entries([
      'Watson, J. D., & Crick, F. H. C. (1953). Molecular structure of nucleic acids. Nature, 171, 737. https://doi.org/10.1038/171737a0',
      'Watson, J., & Crick, F. (1953). Molecular Structure of Nucleic Acids. Nature. doi:10.1038/171737a0',
      'Adams, P. (2021). Teaching statistics with simulation. Press.',
      'Adams, P. (2021). Teaching statistics with simulation! Press.',
    ]);
    const pairs = findDuplicates(list);
    expect(pairs.map((pair) => [pair.kind, pair.reason])).toEqual([['duplicate', 'Same entry'], ['duplicate', 'Same DOI (10.1038/171737a0)']]);
  });

  it('marks a same title with another year as likely, and never pairs different DOIs', () => {
    const likely = findDuplicates(entries(['Adams, P. (2021). Teaching statistics with simulation. Press.', 'Adams, P. (2022). Teaching statistics with simulation. Press.']));
    expect(likely).toEqual([{ keep: 0, drop: 1, kind: 'likely', reason: 'Same title, different year' }]);
    expect(findDuplicates(entries(['A, B. (2020). Same title here please. J. https://doi.org/10.1234/a', 'A, B. (2020). Same title here please. J. https://doi.org/10.1234/b']))).toEqual([]);
  });
});
