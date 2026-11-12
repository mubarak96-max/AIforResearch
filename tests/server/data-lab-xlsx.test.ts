// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { openXlsx, sheetToCsv } from '../../lib/dataLabXlsx';

const sheet = (rows: string) => `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows}</sheetData></worksheet>`;

describe('local XLSX values import', () => {
  it('preserves sparse columns, shared and inline text, booleans, and escaped CSV', () => {
    const result = sheetToCsv(sheet('<row><c r="A1" t="s"><v>0</v></c><c r="C1" t="inlineStr"><is><t>Quote, &quot;yes&quot;</t></is></c></row><row><c r="A2"><v>12.5</v></c><c r="B2" t="b"><v>1</v></c><c r="C2" t="inlineStr"><is><r><t>two </t></r><r><t>parts</t></r></is></c></row>'), ['Score']);
    expect(result.csv).toBe('Score,,"Quote, ""yes"""\r\n12.5,true,two parts');
    expect(result.warnings[0]).toContain('date/time');
  });

  it('ignores phonetic reading guides in inline and shared text', async () => {
    const inline = '<row><c r="A1" t="inlineStr"><is><r><t>東京</t></r><rPh sb="0" eb="2"><t>トウキョウ</t></rPh></is></c></row>';
    expect(sheetToCsv(sheet(inline), []).csv).toBe('東京');
    const zip = new JSZip();
    zip.file('xl/workbook.xml', '<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="S" r:id="rId1"/></sheets></workbook>');
    zip.file('xl/_rels/workbook.xml.rels', '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>');
    zip.file('xl/sharedStrings.xml', '<sst><si><t>大阪</t><rPh sb="0" eb="2"><t>オオサカ</t></rPh></si></sst>');
    zip.file('xl/worksheets/sheet1.xml', sheet('<row><c t="s"><v>0</v></c></row>'));
    const workbook = await openXlsx(await zip.generateAsync({ type: 'arraybuffer' }));
    expect((await workbook.read(workbook.sheets[0].path)).csv).toBe('大阪');
  });

  it('uses cached formula values without executing formulas and identifies missing caches', () => {
    const result = sheetToCsv(sheet('<row><c r="A1"><f>SUM(1,2)</f><v>3</v></c><c r="B1"><f>WEBSERVICE("https://example.org")</f></c></row>'), []);
    expect(result.csv).toBe('3,');
    expect(result.warnings.join(' ')).toContain('2 formula cells');
    expect(result.warnings.join(' ')).toContain('1 formula cells had no cached value');
  });

  it('rejects unsupported declarations, broken references, and sheets wider than the limit', () => {
    expect(() => sheetToCsv('<!DOCTYPE worksheet [<!ENTITY x SYSTEM "file:///secret">]>' + sheet(''), [])).toThrow('unsupported XML');
    expect(() => sheetToCsv(sheet('<row><c t="s"><v>99</v></c></row>'), [])).toThrow('shared-string');
    expect(() => sheetToCsv(sheet('<row><c r="GS1"><v>1</v></c></row>'), [])).toThrow('200 columns');
  });

  it('reads multiple sheets by workbook relationships and rejects unlisted paths', async () => {
    const zip = new JSZip();
    zip.file('xl/workbook.xml', '<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="First" r:id="rId1"/><sheet name="Second" r:id="rId2"/></sheets></workbook>');
    zip.file('xl/_rels/workbook.xml.rels', '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="/xl/worksheets/sheet2.xml"/></Relationships>');
    zip.file('xl/sharedStrings.xml', '<sst><si><t>Category</t></si></sst>');
    zip.file('xl/worksheets/sheet1.xml', sheet('<row><c t="s"><v>0</v></c></row><row><c t="inlineStr"><is><t>Group A</t></is></c></row>'));
    zip.file('xl/worksheets/sheet2.xml', sheet('<row><c t="inlineStr"><is><t>Score</t></is></c></row><row><c><v>42</v></c></row>'));
    const workbook = await openXlsx(await zip.generateAsync({ type: 'arraybuffer' }));
    expect(workbook.sheets.map((item) => item.name)).toEqual(['First', 'Second']);
    expect((await workbook.read(workbook.sheets[0].path)).csv).toBe('Category\r\nGroup A');
    expect((await workbook.read(workbook.sheets[1].path)).csv).toBe('Score\r\n42');
    await expect(workbook.read('../secret')).rejects.toThrow('Choose a worksheet');
  });

  it('stops expansion of an oversized compressed sheet', async () => {
    const zip = new JSZip();
    zip.file('xl/workbook.xml', '<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Large" r:id="rId1"/></sheets></workbook>');
    zip.file('xl/_rels/workbook.xml.rels', '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>');
    zip.file('xl/worksheets/sheet1.xml', ' '.repeat(24 * 1024 * 1024 + 1));
    const workbook = await openXlsx(await zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' }));
    await expect(workbook.read(workbook.sheets[0].path)).rejects.toThrow('too large');
  });
});
