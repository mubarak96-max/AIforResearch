import { describe, expect, it } from 'vitest';
import { Schema } from '@tiptap/pm/model';
import { EditorState } from '@tiptap/pm/state';
import { claimFromTextBefore, claimHash, claimState } from '../../components/editor/lib/aiEditor/claimText';
import { citationClaims, createClaimCheckPlugin, evidenceLinks } from '../../components/editor/lib/aiEditor/claimCheck';

describe('the claim a citation supports', () => {
  it('is the sentence just before the citation', () => {
    expect(claimFromTextBefore('Exercise lowers blood pressure. Smoking raises the risk of stroke ')).toBe('Smoking raises the risk of stroke');
    expect(claimFromTextBefore('First point. Smoking raises the risk of stroke. ')).toBe('Smoking raises the risk of stroke');
    expect(claimFromTextBefore('Did it work? Yes, in 3 of 4 trials (')).toBe('Yes, in 3 of 4 trials');
    expect(claimFromTextBefore('')).toBe('');
  });

  it('ignores case, spacing and punctuation in the fingerprint, but not wording', () => {
    expect(claimHash('Smoking raises the risk of stroke')).toBe(claimHash('smoking  raises the risk of stroke.'));
    expect(claimHash('Smoking raises the risk of stroke')).not.toBe(claimHash('Smoking halves the risk of stroke'));
    expect(claimHash('')).toBe('');
    expect(claimHash('x')).toMatch(/^[0-9a-f]{16}$/);
  });

  it('is unchecked without a fingerprint, checked when it matches, changed when it does not', () => {
    const saved = claimHash('Smoking raises the risk of stroke');
    expect(claimState('', 'anything')).toBe('unchecked');
    expect(claimState(saved, 'Smoking raises the risk of stroke')).toBe('checked');
    expect(claimState(saved, 'Smoking may raise the risk of stroke')).toBe('changed');
  });
});

const schema = new Schema({
  nodes: {
    doc: { content: 'blockContainer+' },
    blockContainer: { content: 'paragraph', attrs: { id: { default: '' } } },
    paragraph: { content: 'inline*' },
    text: { group: 'inline' },
    aiCitation: {
      group: 'inline', inline: true, atom: true,
      attrs: { citationId: { default: '' }, claimHash: { default: '' }, projectId: { default: '' }, sourceId: { default: '' }, findingId: { default: '' }, libraryDocumentId: { default: '' }, checkedAt: { default: '' } },
    },
  },
});
const cite = (attrs: Record<string, string>) => schema.nodes.aiCitation.create(attrs);
const block = (id: string, ...content: any[]) => schema.nodes.blockContainer.create({ id }, schema.nodes.paragraph.create(null, content.map((item) => typeof item === 'string' ? schema.text(item) : item)));

describe('citations in a document', () => {
  const checked = claimHash('Smoking raises the risk of stroke');
  const doc = schema.nodes.doc.create(null, [
    block('b1', 'Intro. Smoking raises the risk of stroke ', cite({ citationId: 'c1', claimHash: checked, projectId: 'p1', sourceId: 's1', findingId: 'f1' }), '.'),
    block('b2', 'Smoking may raise the risk of stroke ', cite({ citationId: 'c2', claimHash: checked, projectId: 'p1', sourceId: 's1', findingId: 'f1' })),
    block('b3', 'Unrelated claim ', cite({ citationId: 'c3' })),
  ]);

  it('reads each citation’s claim, state and block', () => {
    expect(citationClaims(doc).map(({ claim, state, blockId }) => ({ claim, state, blockId }))).toEqual([
      { claim: 'Smoking raises the risk of stroke', state: 'checked', blockId: 'b1' },
      { claim: 'Smoking may raise the risk of stroke', state: 'changed', blockId: 'b2' },
      { claim: 'Unrelated claim', state: 'unchecked', blockId: 'b3' },
    ]);
  });

  it('reports only citations tied to a project', () => {
    const links = evidenceLinks(doc);
    expect(links).toHaveLength(2);
    expect(links[1]).toMatchObject({ citation_id: 'c2', block_id: 'b2', project_id: 'p1', source_id: 's1', finding_id: 'f1', state: 'changed' });
  });

  it('marks a changed claim with a decoration that follows edits', () => {
    const plugin = createClaimCheckPlugin();
    let state = EditorState.create({ doc, plugins: [plugin] });
    const classes = () => (plugin.props.decorations!.call(plugin, state) as any).find().map((item: any) => item.type.attrs.class);
    expect(classes()).toEqual(['citation-claim-checked', 'citation-claim-changed']);
    // Editing the first sentence changes its claim.
    state = state.apply(state.tr.insertText('strongly ', 17));
    expect(classes()).toEqual(['citation-claim-changed', 'citation-claim-changed']);
  });
});
