import { describe, expect, it } from 'vitest';
import { missingFields, parseBibtex, toRis } from '../../lib/bibtexTools.js';

const BIB = `@article{ioannidis2005,
  author  = {Ioannidis, John P. A.},
  title   = {Why Most Published Research Findings Are False},
  journal = {PLoS Medicine},
  year    = {2005},
  volume  = {2},
  number  = {8},
  pages   = {e124},
  doi     = {10.1371/journal.pmed.0020124}
}

@book{nodate,
  title = {A Book With No Author or Year}
}`;

describe('BibTeX to APA', () => {
  it('parses entries and keeps their keys', () => {
    const { items, errors } = parseBibtex(BIB);
    expect(errors).toEqual([]);
    expect(items.map((item) => item.id)).toEqual(['ioannidis2005', 'nodate']);
    expect(items[0].DOI).toBe('10.1371/journal.pmed.0020124');
  });

  it('lists missing fields per entry', () => {
    const { items } = parseBibtex(BIB);
    expect(missingFields(items[0])).toEqual([]);
    expect(missingFields(items[1])).toEqual(['author', 'year', 'publisher', 'DOI']);
  });

  it('writes RIS', () => {
    const ris = toRis(parseBibtex(BIB).items.slice(0, 1));
    expect(ris).toContain('TY  - JOUR');
    expect(ris).toContain('AU  - Ioannidis, John P. A.');
    expect(ris).toContain('PY  - 2005');
    expect(ris).toContain('DO  - 10.1371/journal.pmed.0020124');
    expect(ris.trim().endsWith('ER  -')).toBe(true);
  });

  it('returns nothing for text with no entries', () => {
    expect(parseBibtex('just some words')).toEqual({ items: [], errors: [] });
  });
});

describe('BibTeX to APA: theses', () => {
  it('names the thesis type the way APA prints it', () => {
    const { items } = parseBibtex('@phdthesis{t, title={Thesis}, author={Doe, Jane}, school={Uni}, year={2020}}');
    expect(items[0]).toMatchObject({ type: 'thesis', genre: 'Doctoral dissertation', publisher: 'Uni' });
  });
});
