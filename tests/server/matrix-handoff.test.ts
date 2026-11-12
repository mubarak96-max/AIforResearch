import { describe, expect, it } from 'vitest';
import { matrixDocumentBlocks } from '../../components/matrix/document';
import { sanitizeBlocksForSchema } from '../../components/editor/lib/aiEditor/sanitizeBlocks';
import { blocksToText } from '../../lib/server/lib/blocks';

const schema = { blockSchema: { heading: { propSchema: { level: {} } }, paragraph: {}, table: {} }, inlineContentSchema: { text: {} }, styleSchema: { bold: {} } };
const base = { status: 'done' as const, basis: 'full_text' as const, edited: false, page: 7, quote: '参加者は24名。Café | 学習', value: '24 participants' };

describe('matrix editor handoff', () => {
  it('preserves the table and evidence appendix through saved-block JSON and editor sanitization', () => {
    const blocks = matrixDocumentBlocks({ title: 'Multilingual evidence', columns: [{ id: 'sample', label: 'Sample' }], rows: [{ paper: { title: 'Étude العربية', authors: ['José García', '李 明'], year: '2024', doi: '10.1234/example' }, cells: { sample: base } }] });
    const saved = sanitizeBlocksForSchema(JSON.parse(JSON.stringify(blocks)), schema);
    const output = blocksToText(saved);
    expect(output).toContain('José García; 李 明');
    expect(output).toContain('Étude العربية');
    expect(output).toContain('DOI: 10.1234/example');
    expect(output).toContain('Supporting quotation: 参加者は24名。Café | 学習');
    expect(output).toContain('Source basis: Full text. Page 7.');
    const table = saved.find((block) => block.type === 'table');
    expect(table.content.rows).toHaveLength(2);
    expect(table.content.rows[1].cells).toHaveLength(2);
    expect(blocksToText([table])).toContain('24 participants');
    expect(saved.filter((block) => block.type === 'heading').map((block) => blocksToText([block]))).toEqual(['Multilingual evidence', 'Evidence appendix', '[1] Étude العربية', 'Sample']);
  });

  it('distinguishes abstract, manual, missing and unverified values without inventing page anchors', () => {
    const cells = {
      abstract: { ...base, basis: 'abstract' as const, page: null, quote: 'Abstract finding.' },
      manual: { ...base, basis: 'writer' as const, edited: true, quote: null, page: null, value: 'My interpretation' },
      unverified: { ...base, status: 'error' as const, value: 'An unsupported old value', quote: null, page: null },
      missing: { ...base, status: 'empty' as const, basis: 'none' as const, value: '', quote: null, page: null },
    };
    const saved = sanitizeBlocksForSchema(matrixDocumentBlocks({ title: 'Archive', archived: true, columns: Object.keys(cells).map((id) => ({ id, label: id })), rows: [{ paper: { title: 'Source', authors: [], year: null, doi: null }, cells }] }), schema);
    const output = blocksToText(saved);
    expect(output).toContain('archived project snapshot');
    expect(output).toContain('DOI unavailable');
    expect(output).toContain('Source basis: Abstract. Page unavailable.');
    expect(output).toContain('Source basis: Writer-entered text. Page unavailable.');
    expect(output).toContain('Unverified extraction: An unsupported old value');
    expect(output).toContain('Not reported in the available text');
    expect(output).not.toContain('Page 7');
  });
});
