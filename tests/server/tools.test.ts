import { describe, expect, it } from 'vitest';
import { getTool } from '../../lib/tools.js';
import { aiTools } from '../../lib/tools.js';
import { buildToolPrompt, cleanMarkers, hasToolPrompt } from '../../lib/server/lib/toolPrompts.js';
import { inputSchema } from '../../lib/server/routes/tools.js';
import { editorHtml, inTextLabel, linkMarkers, markdownToHtml, plainText, type ResultSource } from '../../components/tools/toolOutput.js';
import { anova, chiSquare, chiSquareUpper, describe as describeColumn, fUpper, formatP, pairedT, parseCsv, pearson, tTwoTailed, toColumns, welch } from '../../lib/stats.js';
import { findPatterns, summarise } from '../../lib/writingPatterns.js';
import { parsePageList } from '../../components/tools/PdfTools.js';

// ------------------------------------------------------------------ AI tools: forms and prompts

describe('AI tool forms', () => {
  it('has a prompt for every AI tool', () => {
    for (const tool of aiTools()) expect(hasToolPrompt(tool.slug), tool.slug).toBe(true);
  });

  it('validates input against the tool’s fields', () => {
    const tool = getTool('paraphrasing-tool')!;
    const anon = inputSchema(tool, false);
    expect(anon.safeParse({ text: 'too short' }).success).toBe(false);
    expect(anon.safeParse({ text: 'x'.repeat(3000) }).success).toBe(false); // over the signed-out limit
    expect(inputSchema(tool, true).safeParse({ text: 'x'.repeat(3000) }).success).toBe(true);
    // An unknown select value falls back to the first option.
    expect(anon.parse({ text: 'A sentence long enough to paraphrase.', mode: 'hack' }).mode).toBe('standard');
  });

  it('builds grounded prompts with the numbered sources', () => {
    const prompt = buildToolPrompt('deep-research', { topic: 'sleep and memory', depth: 'standard', level: 'masters', notes: '' }, [
      { marker: 'S1', title: 'Sleep and memory', authors: ['A Smith'], year: 2020, venue: 'Nature', abstract: 'Sleep helps memory.' },
    ]);
    expect(prompt.messages[0].content).toContain('[S2]');
    expect(prompt.messages[1].content).toContain('S1: A Smith (2020). Sleep and memory.');
    expect(prompt.messages[1].content).toContain('a master’s student');
  });
});

describe('citation markers', () => {
  it('drops markers for sources that do not exist', () => {
    const known = new Set(['S1', 'S2']);
    expect(cleanMarkers('A claim [S1, S9]. Another [S7]. Both [S2;S1].', known)).toEqual({ text: 'A claim [S1]. Another. Both [S2, S1].', used: ['S1', 'S2'] });
  });

  it('turns markers used as words into citations', () => {
    const known = new Set(['S1', 'S2']);
    expect(cleanMarkers('S2 suggests more work [S1]. S8 disagrees.', known)).toEqual({ text: '[S2] suggests more work [S1]. one study disagrees.', used: ['S2', 'S1'] });
  });
});

// ------------------------------------------------------------------ results

const source = (marker: string, authors: string[], year: number, id: string): ResultSource => ({
  marker, id, title: 'A study', authors, moreAuthors: 0, year, venue: 'Journal', volume: '1', issue: '2', firstPage: '3', lastPage: '9', doi: `10.1/${id}`, type: 'article',
});
const s1 = source('S1', ['Jane Smith'], 2020, 'W1');
const s2 = source('S2', ['Ana Lee', 'Bo Kim'], 2019, 'W2');
const s3 = source('S3', ['A One', 'B Two', 'C Three'], 2021, 'W3');

describe('tool results', () => {
  it('labels citations by style', () => {
    expect(inTextLabel(s1)).toBe('Smith, 2020');
    expect(inTextLabel(s2)).toBe('Lee & Kim, 2019');
    expect(inTextLabel(s2, 'harvard')).toBe('Lee and Kim, 2019');
    expect(inTextLabel(s3, 'mla')).toBe('One et al.');
    expect(inTextLabel(s1, 'chicago')).toBe('Smith 2020');
  });

  it('links markers to the paper pages', () => {
    expect(linkMarkers('Sleep helps [S1, S2].', [s1, s2])).toBe('Sleep helps ([Smith, 2020](/research/papers/W1); [Lee & Kim, 2019](/research/papers/W2)).');
  });

  it('copies as plain text with a reference list', () => {
    const text = plainText('## Findings\n\nSleep helps **memory** [S1].', [s1]);
    expect(text).toContain('Findings\n\nSleep helps memory (Smith, 2020).');
    expect(text).toContain('References\n\nSmith, J. (2020). A study. Journal, 1(2), 3–9. https://doi.org/10.1/W1');
  });

  it('converts Markdown to the HTML the editor imports', () => {
    expect(markdownToHtml('## Title\n\nOne *two* **three**.\n\n- a\n- b\n\n1. c\n\n| A | B |\n|---|---|\n| 1 | 2 |')).toBe(
      '<h2>Title</h2>\n<p>One <em>two</em> <strong>three</strong>.</p>\n<ul><li>a</li><li>b</li></ul>\n<ol><li>c</li></ol>\n<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>',
    );
    expect(markdownToHtml('<script>x</script>')).toBe('<p>&lt;script&gt;x&lt;/script&gt;</p>');
  });

  it('turns markers into editor citations carrying BibTeX', () => {
    const html = editorHtml('Sleep helps [S1].', [s1]);
    const base64 = /data-citation="([^"]+)"/.exec(html)![1];
    expect(Buffer.from(base64, 'base64').toString('utf8')).toMatch(/^@article\{smith2020study,/);
    expect(html).toContain('class="citation-token"');
    expect(html).toContain('>(Smith, 2020)</span>');
  });
});

// ------------------------------------------------------------------ statistics

describe('distributions', () => {
  // Reference values from standard tables (R: 2 * pt(-2, 10), pchisq(3.841459, 1, lower = FALSE), pf(4.964603, 1, 10, lower = FALSE)).
  it('matches published p-values', () => {
    expect(tTwoTailed(2, 10)).toBeCloseTo(0.07338803, 6);
    expect(tTwoTailed(2.228139, 10)).toBeCloseTo(0.05, 5);
    expect(chiSquareUpper(3.841459, 1)).toBeCloseTo(0.05, 6);
    expect(chiSquareUpper(18.307038, 10)).toBeCloseTo(0.05, 6);
    expect(fUpper(4.964603, 1, 10)).toBeCloseTo(0.05, 6);
    // t with 1 df is the Cauchy distribution: P(|t| > 1) = 1/2 exactly.
    expect(tTwoTailed(1, 1)).toBeCloseTo(0.5, 8);
  });

  it('formats p the APA way', () => {
    expect(formatP(0.0004)).toBe('p < .001');
    expect(formatP(0.0473)).toBe('p = .047');
  });
});

describe('statistics', () => {
  it('parses CSV with quotes and semicolons', () => {
    expect(parseCsv('name;score\n"Smith, J";"1,5"\nLee;2\n')).toEqual({ header: ['name', 'score'], rows: [['Smith, J', '1,5'], ['Lee', '2']], truncated: false });
    expect(parseCsv('a,b\n"say ""hi""",2').rows[0][0]).toBe('say "hi"');
  });

  it('types columns and describes them', () => {
    const { header, rows } = parseCsv('g,x\nA,1\nB,2\nA,3\nB,NA\nA,5');
    const [g, x] = toColumns(header, rows);
    expect(g.kind).toBe('categorical');
    expect(x.kind).toBe('numeric');
    const d = describeColumn(x.values)!;
    expect(d).toMatchObject({ n: 4, missing: 1, mean: 2.75, median: 2.5, min: 1, max: 5 });
    expect(d.sd).toBeCloseTo(1.707825, 5);
  });

  it('runs a Pearson correlation', () => {
    const r = pearson([1, 2, 3, 4, 5], [2, 4, 5, 4, 5], ['x', 'y']);
    expect(r.rows[0]).toEqual(['r', '.77']);
    // r = 6 / sqrt(10 * 6) = .775; t = 2.121 on 3 df.
    expect(r.apa).toBe('There was a strong positive correlation between x and y, r(3) = .77, p = .124.');
  });

  it('runs Welch’s t-test', () => {
    const outcome = [19, 22, 16, 29, 24, 20, 11, 17, 12];
    const groups = ['a', 'a', 'a', 'a', 'a', 'b', 'b', 'b', 'b'];
    const result = welch(outcome, groups, ['score', 'group']);
    // By hand: means 22 and 15, variances 24.5 and 18; t = 7 / sqrt(24.5/5 + 18/4) = 2.283;
    // Welch-Satterthwaite df = 9.4² / (4.9²/4 + 4.5²/3) = 6.93.
    expect(result.rows.find(([label]) => label === 't')![1]).toBe('2.28');
    expect(result.rows.find(([label]) => label === 'df')![1]).toBe('6.93');
    expect(result.rows.find(([label]) => label.startsWith('p'))![1]).toBe('p = .057');
  });

  it('runs a paired t-test', () => {
    const result = pairedT([10, 12, 9, 11, 14], [12, 14, 10, 14, 15], ['before', 'after']);
    // R: t.test(c(10,12,9,11,14), c(12,14,10,14,15), paired = TRUE) -> t = -4.8107, df = 4, p-value = 0.008581
    expect(result.rows.find(([label]) => label === 't')![1]).toBe('-4.81');
    expect(result.rows.find(([label]) => label.startsWith('p'))![1]).toBe('p = .009');
  });

  it('runs a one-way ANOVA', () => {
    const outcome = [4, 5, 6, 6, 7, 8, 9, 10, 11];
    const groups = ['a', 'a', 'a', 'b', 'b', 'b', 'c', 'c', 'c'];
    // By hand: group means 5, 7, 10; SSB = 38, SSW = 6; F = (38/2) / (6/6) = 19.
    // For df1 = 2 the p-value has a closed form: (1 + 2F/df2)^(-df2/2) = (1 + 38/6)^-3 = .0025.
    const result = anova(outcome, groups, ['y', 'g']);
    expect(result.rows.find(([label]) => label === 'F')![1]).toBe('19.00');
    expect(result.rows.find(([label]) => label === 'p')![1]).toBe('p = .003');
    expect(fUpper(19, 2, 6)).toBeCloseTo((1 + 38 / 6) ** -3, 9);
  });

  it('runs a chi-square test and warns about small expected counts', () => {
    const x = [...Array(30).fill('yes'), ...Array(20).fill('no')];
    const y = [...Array(20).fill('a'), ...Array(10).fill('b'), ...Array(5).fill('a'), ...Array(15).fill('b')];
    // R: chisq.test(matrix(c(20,10,5,15), 2, byrow = TRUE), correct = FALSE) -> X-squared = 8.3333, df = 1, p = 0.003892
    const result = chiSquare(x, y, ['passed', 'group']);
    expect(result.rows[0]).toEqual(['χ²', '8.33']);
    expect(result.rows.find(([label]) => label === 'p')![1]).toBe('p = .004');
    expect(result.warnings).toEqual([]);
    expect(chiSquare(['a', 'a', 'b'], ['x', 'y', 'y'], ['p', 'q']).warnings[0]).toMatch(/expected count under 5/);
  });
});

// ------------------------------------------------------------------ writing patterns and PDF pages

describe('writing patterns', () => {
  it('finds stock phrases without double counting', () => {
    const found = findPatterns('Moreover, it is important to note that we delve into a robust landscape — fast.');
    expect(found.map((item) => item.kind)).toEqual(['transition', 'filler', 'stock-word', 'stock-word', 'stock-word', 'em-dash']);
    expect(found[0].text).toBe('Moreover');
  });

  it('reports density, never a probability', () => {
    const summary = summarise('Plain words here. Short. A much longer sentence follows this one now.');
    expect(summary.findings).toEqual([]);
    expect(summary).not.toHaveProperty('probability');
  });
});

describe('PDF page lists', () => {
  it('reads pages and ranges', () => {
    expect(parsePageList('1-3, 7', 10)).toEqual([0, 1, 2, 6]);
    expect(() => parsePageList('5-12', 10)).toThrow(/between 1 and 10/);
    expect(() => parsePageList('two', 10)).toThrow(/not a page/);
  });
});
