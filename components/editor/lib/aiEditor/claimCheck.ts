'use client';

import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { claimFromTextBefore, claimState, type ClaimState, type EvidenceLink } from './claimText';

/** The text of a paragraph before a position inside it; citations and other atoms add nothing. */
function textBefore(parent: PMNode, offset: number) {
  return parent.textBetween(0, offset, ' ', ' ');
}

export type CitationClaim = { pos: number; node: PMNode; claim: string; state: ClaimState; blockId: string };

/** Every citation in the document with its claim and claim state. */
export function citationClaims(doc: PMNode): CitationClaim[] {
  const out: CitationClaim[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name !== 'aiCitation') return true;
    const $pos = doc.resolve(pos);
    const claim = claimFromTextBefore(textBefore($pos.parent, $pos.parentOffset));
    // BlockNote keeps the block id on the blockContainer around the paragraph.
    let blockId = '';
    for (let depth = $pos.depth; depth > 0; depth -= 1) {
      const id = $pos.node(depth).attrs?.id;
      if (typeof id === 'string' && id) { blockId = id; break; }
    }
    out.push({ pos, node, claim, state: claimState(node.attrs.claimHash, claim), blockId });
    return false;
  });
  return out;
}

/** The claim of the citation at a position, for the evidence card. */
export function citationClaimAt(doc: PMNode, pos: number): CitationClaim | null {
  return citationClaims(doc).find((item) => item.pos === pos) ?? null;
}

/** Links to project evidence for the project's "Needs another look" list. */
export function evidenceLinks(doc: PMNode): EvidenceLink[] {
  return citationClaims(doc)
    .filter((item) => item.node.attrs.projectId)
    .slice(0, 500)
    .map((item) => ({
      citation_id: String(item.node.attrs.citationId || '').slice(0, 200),
      block_id: item.blockId.slice(0, 100),
      project_id: String(item.node.attrs.projectId),
      source_id: item.node.attrs.sourceId || null,
      finding_id: item.node.attrs.findingId || null,
      library_document_id: item.node.attrs.libraryDocumentId || null,
      claim: item.claim.slice(0, 600),
      state: item.state,
      checked_at: item.node.attrs.checkedAt || null,
    }));
}

const key = new PluginKey<DecorationSet>('claimCheck');

function decorations(doc: PMNode) {
  const items = citationClaims(doc).filter((item) => item.state !== 'unchecked');
  return DecorationSet.create(doc, items.map((item) => Decoration.node(item.pos, item.pos + item.node.nodeSize, {
    class: item.state === 'changed' ? 'citation-claim-changed' : 'citation-claim-checked',
    'data-claim-state': item.state,
  })));
}

/** Marks citations whose sentence changed since it was checked against the evidence. */
export function createClaimCheckPlugin() {
  return new Plugin<DecorationSet>({
    key,
    state: {
      init: (_config, state) => decorations(state.doc),
      apply: (tr, old) => (tr.docChanged ? decorations(tr.doc) : old.map(tr.mapping, tr.doc)),
    },
    props: { decorations: (state) => key.getState(state) },
  });
}
