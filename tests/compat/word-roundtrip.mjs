/** Real converter acceptance check, without a local Python runtime.
 * WORD_CONVERTER_TEST_URL=http://localhost:4100 node tests/compat/word-roundtrip.mjs
 * Optional WORD_CONVERTER_TEST_TOKEN for a private deployed converter.
 * --fixture-only verifies the generated fixture; it does NOT validate conversion.
 */
import assert from 'node:assert/strict';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, SimpleField, ExternalHyperlink } from 'docx';
import JSZip from 'jszip';

const multilingual = 'Résumé — café — العربية — 日本語 — हिन्दी';
const bibliography = 'García, J., & 李, 明. (2024). Mémoire et apprentissage. Research journal, 5(2), 10–18.';
const citation = { citationID: 'fixture-citation', citationItems: [{ id: 'source-1', itemData: { id: 'source-1', type: 'article-journal', title: 'Mémoire et apprentissage', author: [{ family: 'García', given: 'José' }, { family: '李', given: '明' }], issued: { 'date-parts': [[2024]] }, 'container-title': 'Research journal', volume: '5', issue: '2', page: '10-18', DOI: '10.1234/example' } }], properties: { formattedCitation: '(García & 李, 2024)', plainCitation: '(García & 李, 2024)' }, schema: 'https://github.com/citation-style-language/schema/raw/master/csl-citation.json' };
const cell = (value, columnSpan = 1) => new TableCell({ columnSpan, children: [new Paragraph(value)] });

const fixture = await Packer.toBuffer(new Document({ creator: 'Compatibility test', title: 'Structural round trip', sections: [{ children: [
  new Paragraph({ heading: HeadingLevel.HEADING_1, text: 'Evidence overview' }),
  new Paragraph({ children: [new TextRun(multilingual), new TextRun(' '), new SimpleField(`ADDIN ZOTERO_ITEM CSL_CITATION ${JSON.stringify(citation)}`, '(García & 李, 2024)')] }),
  new Paragraph({ heading: HeadingLevel.HEADING_2, text: 'Findings' }),
  new Table({ rows: [new TableRow({ tableHeader: true, children: [cell('Reported observations', 2), cell('Unit')] }), new TableRow({ children: [cell('علاج'), cell('0'), cell('participants')] }), new TableRow({ children: [cell('Control'), cell('Not reported'), cell('participants')] })] }),
  new Paragraph({ heading: HeadingLevel.HEADING_3, text: 'Interpretation' }),
  new Paragraph({ children: [new TextRun({ text: 'Missing data is distinct from zero.', bold: true })] }),
  new Paragraph({ heading: HeadingLevel.HEADING_1, text: 'References' }),
  new Paragraph({ children: [new TextRun(bibliography), new TextRun(' '), new ExternalHyperlink({ link: 'https://doi.org/10.1234/example', children: [new TextRun('https://doi.org/10.1234/example')] })] }),
] }] }));

async function inspectDocx(bytes) {
  const zip = await JSZip.loadAsync(bytes);
  const document = await zip.file('word/document.xml')?.async('string');
  assert.ok(document, 'DOCX contains its document part');
  for (const value of ['Evidence overview', 'Findings', 'Interpretation', 'References', multilingual, 'Not reported', 'participants', 'Mémoire et apprentissage']) assert.ok(document.includes(value), `DOCX retains ${value}`);
  for (const level of [1, 2, 3]) assert.match(document, new RegExp(`<w:pStyle[^>]+w:val="Heading${level}"`, 'i'), `Heading ${level} remains a heading style`);
  assert.equal((document.match(/<w:tbl>/g) || []).length, 1, 'one table remains a table');
  assert.match(document, /<w:gridSpan[^>]+w:val="2"/, 'merged header remains two columns wide');
  assert.match(document, /ADDIN ZOTERO_ITEM CSL_CITATION/, 'citation metadata remains a field');
  const relationships = await zip.file('word/_rels/document.xml.rels')?.async('string');
  assert.ok(relationships?.includes('https://doi.org/10.1234/example'), 'reference link remains a relationship');
}
function inspectBlocks(imported) {
  const walk = (blocks) => blocks.flatMap((block) => [block, ...walk(block.children || [])]);
  const blocks = walk(imported.blocks || []);
  for (const [title, level] of [['Evidence overview', 1], ['Findings', 2], ['Interpretation', 3], ['References', 1]]) {
    assert.ok(blocks.some((block) => block.type === 'heading' && Number(block.props?.level) === level && JSON.stringify(block.content).includes(title)), `editor retains heading ${title}`);
  }
  const table = blocks.find((block) => block.type === 'table');
  assert.ok(table, 'editor has a table');
  assert.equal(table.content.rows.length, 3, 'all table rows survive');
  assert.equal(table.content.rows[0].cells[0].props.colspan, 2, 'editor keeps merged header');
  const all = JSON.stringify(blocks);
  assert.ok(all.includes(multilingual), 'editor keeps multilingual text');
  assert.ok(all.includes('Not reported'), 'missing data labels survive');
  assert.ok(all.includes('Mémoire et apprentissage'), 'rendered reference survives');
  const citationBlock = blocks.flatMap((block) => Array.isArray(block.content) ? block.content : []).find((item) => item.type === 'aiCitation');
  assert.ok(citationBlock, 'editor retains a native citation');
  assert.ok(JSON.stringify(citationBlock.props).includes('García'), 'citation author display survives');
}

await inspectDocx(fixture);
if (process.argv.includes('--fixture-only')) {
  console.log('Fixture structure verified. Converter round-trip was not run.');
} else {
  const base = (process.env.WORD_CONVERTER_TEST_URL || '').replace(/\/+$/, '');
  assert.ok(base, 'Set WORD_CONVERTER_TEST_URL to the existing converter service; no conversion result is assumed without it.');
  const headers = process.env.WORD_CONVERTER_TEST_TOKEN ? { Authorization: `Bearer ${process.env.WORD_CONVERTER_TEST_TOKEN}` } : {};
  const call = async (path, form) => {
    const response = await fetch(`${base}${path}`, { method: 'POST', headers, body: form, signal: AbortSignal.timeout(120_000) });
    if (!response.ok) throw new Error(`${path} failed with HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`);
    return response;
  };
  const importDocx = async (bytes) => {
    const form = new FormData(); form.append('file', new Blob([bytes]), 'roundtrip.docx'); form.append('include_source', 'true');
    return (await call('/word/import', form)).json();
  };
  const initial = await importDocx(fixture); inspectBlocks(initial);
  for (const withTemplate of [false, true]) {
    const form = new FormData(); form.append('payload', JSON.stringify({ title: 'Structural round trip', blocks: initial.blocks, comments: initial.comments || [], settings: initial.settings || {}, format: 'docx' }));
    if (withTemplate) form.append('source', new Blob([fixture]), 'template.docx');
    const output = new Uint8Array(await (await call('/word/export', form)).arrayBuffer());
    await inspectDocx(output); inspectBlocks(await importDocx(output));
    console.log(`Word → editor → Word → editor structural assertions passed (${withTemplate ? 'original template' : 'fresh document'}).`);
  }
  console.log('Verified headings, merged tables, references, citation fields and multilingual text. This does not establish external Word/Zotero live synchronization.');
}
