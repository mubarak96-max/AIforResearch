import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { exportWorkflowXlsx, readWorkflowTable, transcriptExcerpts, workflowSectionCsv } from '../../lib/workflowFiles.js';
import { validateEntry, type Workbook, type WorkbookEntry } from '../../lib/workflows.js';

const entry = (id: string, section: string, values: Record<string, string>): WorkbookEntry => ({ id, section, values, created_at: '', updated_at: '', updated_by: 'writer' });
const workbook = (entries: WorkbookEntry[]): Workbook => ({ id: 'w', owner_user_id: 'u', project_id: null, kind: 'policy', title: '=HYPERLINK("evil") & <title>', question: 'Evidence', language: '', deadline: '', revision: 1, status: 'draft', review_note: '', reviewed_by: null, reviewed_at: null, entries, recalls: [], created_at: '', updated_at: '' });

describe('workbook file import and export', () => {
  it('preserves CSV quoting, multiline fields, non-English text and empty-row disclosure', () => {
    const table = readWorkflowTable('\uFEFFname;definition;actual\r\n"量";"Includes; commas, and ""quotes""\nnext line";2\r\n\r\n');
    expect(table.headers).toEqual(['name', 'definition', 'actual']);
    expect(table.rows).toEqual([['量', 'Includes; commas, and "quotes"\nnext line', '2']]);
    expect(table.empty_rows).toBe(1);
    expect(readWorkflowTable('name\tactual\nA\t3').rows[0]).toEqual(['A', '3']);
  });
  it('rejects malformed, ambiguous and oversized imports without hiding rows', () => {
    expect(() => readWorkflowTable('a,b\n"unclosed,2')).toThrow('not closed');
    expect(() => readWorkflowTable('a,b\n"closed"extra,2')).toThrow('Malformed');
    expect(() => readWorkflowTable('a,b\n1,2,3')).toThrow('3 fields');
    expect(() => readWorkflowTable('a,a\n1,2')).toThrow('unique');
    expect(() => readWorkflowTable(`a\n${Array(251).fill('row').join('\n')}`)).toThrow('250');
  });
  it('anchors transcript excerpts to original spoken lines and subtitle timestamps', () => {
    const source = entry('s', 'sources', { kind: 'transcript', text: 'WEBVTT\n\n1\n00:01.000 --> 00:03.000\nAmina: The bus did not arrive.\nNo speaker label.\n\n2\n00:04.000 --> 00:05.000\nBo: I walked.' });
    const result = transcriptExcerpts(source);
    expect(result.values).toHaveLength(3);
    expect(result.values[0]).toMatchObject({ speaker: 'Amina', quote: 'Amina: The bus did not arrive.', locator: 'Line 5 · 00:01.000 --> 00:03.000' });
    expect(result.values[1].speaker).toBe('');
    expect(result.cue_lines).toBe(5);
    for (const values of result.values) expect(validateEntry('qualitative', 'excerpts', values, [source]).quote).toBe(values.quote);
    expect(source.values.text.startsWith('WEBVTT')).toBe(true);
    const original = '\n  Amina: Keep the original lines.\n\n';
    expect(validateEntry('qualitative', 'sources', { title: 'Interview', kind: 'transcript', consent: 'approved private use', text: original }, []).text).toBe(original);
  });
  it('requires exact patent claim evidence and reproducibility fields for technical benchmarks', () => {
    const source = entry('p', 'sources', { text: 'A device comprising a sensor.' });
    expect(validateEntry('technical', 'patents', { publication: 'WO example', claim: '1', source_id: 'p', quote: source.values.text }, [source]).claim).toBe('1');
    expect(() => validateEntry('technical', 'patents', { publication: 'WO example', claim: '1', source_id: 'p', quote: 'Different claim' }, [source])).toThrow('exact passage');
    expect(() => validateEntry('technical', 'benchmarks', { name: 'Method', dataset: 'Data v1', metric: 'Accuracy', value: '0.8', unit: 'proportion', split: 'test' }, [])).toThrow('Configuration');
  });
  it('exports section keys as reusable CSV headers and neutralises formula cells', () => {
    const csv = workflowSectionCsv(workbook([entry('i', 'indicators', { name: '=SUM(1)', definition: 'Counter', unit: 'count', period: '2026', actual: '-3' })]), 'indicators');
    expect(csv).toContain('"name"'); expect(csv).toContain('"\'=SUM(1)"'); expect(csv).toContain('"-3"');
  });
  it('creates Excel sheets with inline values, escaped XML and no executable formulas or raw source text', async () => {
    const zip = await JSZip.loadAsync(await exportWorkflowXlsx(workbook([entry('s', 'sources', { title: 'Source', text: 'PRIVATE ORIGINAL' }), entry('i', 'indicators', { name: '@SUM(1)', definition: 'A&B', unit: 'count', period: '2026', actual: '003' })])));
    expect(zip.file('[Content_Types].xml')).not.toBeNull();
    const brief = await zip.file('xl/worksheets/sheet1.xml')!.async('text');
    expect(brief).toContain('t="inlineStr"'); expect(brief).toContain('=HYPERLINK(&quot;evil&quot;) &amp; &lt;title&gt;'); expect(brief).not.toContain('<f>');
    const indicators = await zip.file('xl/worksheets/sheet3.xml')!.async('text');
    expect(indicators).toContain('>003<'); expect(indicators).toContain('A&amp;B'); expect(indicators).not.toContain('<f>');
    expect(await zip.file('xl/worksheets/sheet2.xml')!.async('text')).not.toContain('PRIVATE ORIGINAL');
    await expect(exportWorkflowXlsx({ ...workbook([]), title: 'Bad\u0000value' })).rejects.toThrow('cannot be represented');
  });
});
