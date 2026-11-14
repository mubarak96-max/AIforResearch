import { describe, expect, it } from 'vitest';
import { FRAMEWORKS, buildQuestions, checkQuestion, conceptTable, splitTerms } from '../../lib/picoQuestion.js';
import { buildSearch, buildSearchLines, checkSearch, conceptGroup, decodeHandoff, encodeHandoff, formatTerm, plainKeywords, DEFAULT_OPTIONS, type Concept } from '../../lib/booleanSearch.js';
import {
  addColumn, addRow, cellsFromDetails, csvField, detailsFromCsl, groupByTheme, moveRow, newMatrix, parseMatrix, removeColumn,
  renameColumn, themeColumnId, themesOf, toCsv, toHtml, toMarkdown, updateCell,
} from '../../lib/reviewMatrix.js';

// ------------------------------------------------------------------ PICO question builder

describe('PICO question builder', () => {
  const values = { p: 'adults with type 2 diabetes', i: 'text-message reminders', c: 'usual care', o: 'HbA1c', t: '6 months' };

  it('phrases a therapy question with every element', () => {
    const [first] = buildQuestions('picot', 'therapy', values);
    expect(first).toBe('In adults with type 2 diabetes, what is the effect of text-message reminders compared with usual care on HbA1c over 6 months?');
  });

  it('drops the comparison and time cleanly when they are not there', () => {
    const [first] = buildQuestions('pico', 'therapy', { ...values, c: '' });
    expect(first).toBe('In adults with type 2 diabetes, what is the effect of text-message reminders on HbA1c?');
  });

  it('gives two or three phrasings for every question type', () => {
    for (const framework of Object.values(FRAMEWORKS)) {
      for (const type of framework.types) {
        const questions = buildQuestions(framework.id, type.id, {});
        expect(questions.length, `${framework.id}/${type.id}`).toBeGreaterThanOrEqual(2);
        expect(questions.length).toBeLessThanOrEqual(3);
        for (const question of questions) expect(question).toMatch(/\?$/);
      }
    }
  });

  it('shows missing required parts in brackets', () => {
    expect(buildQuestions('pcc', 'mapping', { p: 'older adults' })[0]).toBe('What is known about [concept] among older adults in [context]?');
  });

  it('flags a missing comparison, a vague outcome and a broad population', () => {
    const issues = checkQuestion('pico', { p: 'students', i: 'peer tutoring', o: 'impact on grades' });
    expect(issues.find((issue) => issue.element === 'c')?.level).toBe('tip');
    expect(issues.find((issue) => issue.element === 'o')?.message).toContain('"impact"');
    expect(issues.find((issue) => issue.element === 'p')?.level).toBe('vague');
  });

  it('flags empty required elements, and has nothing to say about a clear question', () => {
    expect(checkQuestion('picot', { ...values, t: '' }).map((issue) => issue.element)).toEqual(['t']);
    expect(checkQuestion('picot', values)).toEqual([]);
  });

  it('builds a concept table with synonyms and search advice', () => {
    const rows = conceptTable('pico', values, { i: 'SMS, text messaging; text-message reminders' });
    expect(rows.map((row) => row.key)).toEqual(['p', 'i', 'c', 'o']);
    expect(rows[1].terms).toEqual(['text-message reminders', 'SMS', 'text messaging']);
    expect(rows.find((row) => row.key === 'o')?.search).toBe('no');
  });

  it('splits terms on commas, semicolons, lines and OR', () => {
    expect(splitTerms('a, b; c\nd OR e, A')).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
});

// ------------------------------------------------------------------ Boolean search string builder

const concepts: Concept[] = [
  { name: 'Population', terms: ['nurse*', 'nursing staff'], mesh: ['Nurses'] },
  { name: 'Exposure', terms: ['night shift', 'shift work*'], mesh: [] },
];

describe('Boolean search string builder', () => {
  it('writes PubMed with [tiab] and MeSH rows, OR within and AND between', () => {
    expect(buildSearch(concepts, 'pubmed')).toBe('("Nurses"[MeSH Terms] OR nurse*[tiab] OR "nursing staff"[tiab]) AND ("night shift"[tiab] OR "shift work*"[tiab])');
  });

  it('writes Europe PMC and a generic form', () => {
    expect(buildSearch(concepts, 'europepmc')).toBe('(MESH:"Nurses" OR TITLE_ABS:nurse* OR TITLE_ABS:"nursing staff") AND (TITLE_ABS:"night shift" OR TITLE_ABS:"shift work*")');
    expect(buildSearch(concepts, 'generic')).toBe('(nurse* OR "nursing staff") AND ("night shift" OR "shift work*")');
  });

  it('honours the truncation, phrase and field options', () => {
    expect(formatTerm('nurse*', 'pubmed', { ...DEFAULT_OPTIONS, truncation: false })).toBe('nurse[tiab]');
    expect(formatTerm('night shift', 'pubmed', { ...DEFAULT_OPTIONS, phrases: false })).toBe('(night[tiab] AND shift[tiab])');
    expect(formatTerm('night shift', 'pubmed', { ...DEFAULT_OPTIONS, field: 'title' })).toBe('"night shift"[ti]');
    expect(formatTerm('“night shift”', 'generic', DEFAULT_OPTIONS)).toBe('"night shift"');
  });

  it('puts the NOT row last, around everything it excludes', () => {
    const search = buildSearch([...concepts, { name: 'Exclude', terms: ['rat*', 'mice'], mesh: [], not: true }], 'generic');
    expect(search).toBe('((nurse* OR "nursing staff") AND ("night shift" OR "shift work*")) NOT (rat* OR mice)');
    expect(checkSearch(search).filter((issue) => issue.level === 'error')).toEqual([]);
  });

  it('skips empty concepts and repeated terms', () => {
    expect(conceptGroup({ name: 'x', terms: ['burnout', 'Burnout', ''], mesh: [] }, 'generic', DEFAULT_OPTIONS)).toBe('burnout');
    expect(buildSearch([{ name: 'x', terms: [], mesh: [] }], 'generic')).toBe('');
  });

  it('writes numbered lines for a search log', () => {
    expect(buildSearchLines([...concepts, { name: 'Exclude', terms: ['mice'], mesh: [], not: true }], 'generic')).toEqual([
      '#1 (nurse* OR "nursing staff")',
      '#2 ("night shift" OR "shift work*")',
      '#3 mice',
      '#4 (#1 AND #2) NOT #3',
    ]);
  });

  it('gives plain keywords for a keyword search', () => {
    expect(plainKeywords(concepts)).toBe('nurse night shift');
  });

  it('finds syntax problems', () => {
    const messages = (search: string) => checkSearch(search).map((issue) => issue.message);
    expect(messages('"night shift AND nurse')).toEqual(expect.arrayContaining([expect.stringContaining('Unbalanced quotes')]));
    expect(messages('(nurse OR nurses AND burnout')).toEqual(expect.arrayContaining([expect.stringContaining('never closed')]));
    expect(messages('nurse) AND (burnout')).toEqual(expect.arrayContaining([expect.stringContaining('comes before')]));
    expect(messages('AND nurse OR')).toHaveLength(3);
    expect(messages('nurse AND OR burnout').join(' ')).toContain('Two operators');
    expect(messages('nurse and burnout').join(' ')).toContain('Lower-case');
    expect(messages('nurse OR nurses AND burnout').join(' ')).toContain('mixed without parentheses');
    expect(messages('(nurse OR nurses) AND burnout').join(' ')).not.toContain('mixed without parentheses');
    expect(messages('ca* AND burnout').join(' ')).toContain('Very short truncation');
    expect(messages(`(${Array.from({ length: 500 }, (_, n) => `term${n}`).join(' OR ')})`).join(' ')).toContain('characters');
    expect(checkSearch('("night shift"[tiab] OR nurse*[tiab]) AND burnout[tiab]')).toEqual([]);
  });

  it('round-trips the hand-off from the PICO builder and rejects bad input', () => {
    const hash = encodeHandoff([{ name: 'Population', terms: ['nurses', 'night shift & "on call"'] }]);
    expect(decodeHandoff(`#${hash}`)).toEqual([{ name: 'Population', terms: ['nurses', 'night shift & "on call"'] }]);
    expect(decodeHandoff('#concepts=%7Bnot-json')).toBeNull();
    expect(decodeHandoff('#other=1')).toBeNull();
    expect(decodeHandoff(`#concepts=${encodeURIComponent(JSON.stringify([{ n: 'x', t: [1, ''] }]))}`)).toBeNull();
  });
});

// ------------------------------------------------------------------ literature review matrix

describe('literature review matrix', () => {
  it('starts from the default and synthesis columns', () => {
    expect(newMatrix().columns.map((column) => column.name)).toEqual(['Citation', 'Aim', 'Design', 'Sample/setting', 'Key findings', 'Limitations', 'Theme(s)']);
    expect(newMatrix('synthesis').columns.map((column) => column.name)).toContain('Idea 1');
  });

  it('adds, renames and removes columns, and edits and moves rows', () => {
    let matrix = newMatrix();
    matrix = addColumn(matrix, 'Country');
    const country = matrix.columns.at(-1)!.id;
    matrix = renameColumn(matrix, country, 'Region');
    expect(matrix.columns.at(-1)!.name).toBe('Region');
    matrix = addRow(addRow(matrix), {});
    const [a, b] = matrix.rows.map((row) => row.id);
    matrix = updateCell(matrix, a, country, 'Kenya');
    matrix = moveRow(matrix, a, 1);
    expect(matrix.rows.map((row) => row.id)).toEqual([b, a]);
    expect(moveRow(matrix, a, 1)).toBe(matrix);
    matrix = removeColumn(matrix, country);
    expect(matrix.rows.every((row) => !(country in row.cells))).toBe(true);
  });

  it('groups and lists themes, with untagged rows last', () => {
    let matrix = newMatrix();
    const theme = themeColumnId(matrix)!;
    matrix = addRow(matrix, { [theme]: 'Access; Cost' });
    matrix = addRow(matrix, { [theme]: 'cost' });
    matrix = addRow(matrix, {});
    expect(themesOf(matrix, theme)).toEqual(['Access', 'Cost']);
    expect(groupByTheme(matrix, theme).map((group) => [group.theme, group.rows.length])).toEqual([['Access', 1], ['Cost', 2], [null, 1]]);
  });

  it('exports CSV, Markdown and HTML safely', () => {
    let matrix = { columns: [{ id: 'a', name: 'Citation' }, { id: 'b', name: 'Findings' }], rows: [] as { id: string; cells: Record<string, string> }[] };
    matrix = addRow(matrix, { a: 'Smith, "J."', b: '=1+1\nsecond | line' });
    expect(toCsv(matrix)).toBe('Citation,Findings\r\n"Smith, ""J.""","\'=1+1\nsecond | line"\r\n');
    expect(csvField('plain')).toBe('plain');
    expect(toMarkdown(matrix)).toBe('| Citation | Findings |\n| --- | --- |\n| Smith, "J." | =1+1<br>second \\| line |');
    expect(toHtml(matrix)).toContain('<td>Smith, &quot;J.&quot;</td><td>=1+1<br>second | line</td>');
    expect(toHtml({ columns: [{ id: 'a', name: '<b>' }], rows: [] })).toContain('<th>&lt;b&gt;</th>');
  });

  it('fills a row from a looked-up paper', () => {
    const details = detailsFromCsl({
      title: 'Molecular structure of nucleic acids', author: [{ family: 'Watson', given: 'J. D.' }, { family: 'Crick', given: 'F. H. C.' }],
      issued: { 'date-parts': [[1953, 4]] }, DOI: '10.1038/171737a0', 'container-title': 'Nature',
    });
    expect(details.citation).toBe('Watson & Crick (1953). Molecular structure of nucleic acids. Nature. https://doi.org/10.1038/171737a0');
    expect(details.authors).toBe('J. D. Watson; F. H. C. Crick');
    const matrix = addColumn(addColumn(newMatrix(), 'Year'), 'Authors');
    const cells = cellsFromDetails(matrix, details);
    expect(Object.values(cells)).toEqual([details.citation, '1953', details.authors]);
  });

  it('reads back only a valid saved matrix', () => {
    const matrix = addRow(newMatrix(), { x: 'y' });
    expect(parseMatrix(JSON.stringify(matrix))).toEqual(matrix);
    expect(parseMatrix('nope')).toBeNull();
    expect(parseMatrix(JSON.stringify({ columns: [], rows: [] }))).toBeNull();
    expect(parseMatrix(null)).toBeNull();
  });
});
