/**
 * The claim a citation supports, and whether it changed since someone checked it.
 *
 * A claim is the sentence just before a citation: the paragraph text up to the citation,
 * back to the previous sentence end. Checking a citation stores a fingerprint of that
 * sentence on the citation; editing the sentence later changes the fingerprint, so the
 * citation shows as "changed since checked". Used by the editor (decorations, the
 * evidence card, the links it reports) and by the project's "Needs another look" list.
 */

export type ClaimState = 'checked' | 'changed' | 'unchecked';

const SENTENCE_END = /[.!?…]["'”’)\]]*\s+(?=\S)/gu;

/** The sentence a citation closes, from the paragraph text before the citation. */
export function claimFromTextBefore(textBefore: string): string {
  // "… causes cancer. (Smith, 2020)" cites the sentence that just ended.
  let text = textBefore.replace(/\s+/gu, ' ').trim().replace(/[\s,;:([{-]+$/u, '').replace(/[.!?…]+["'”’)\]]*$/u, '').trim();
  let start = 0;
  for (const match of text.matchAll(SENTENCE_END)) start = (match.index ?? 0) + match[0].length;
  text = text.slice(start).trim();
  return text.length > 1200 ? text.slice(-1200) : text;
}

/** A short, stable fingerprint of a claim: case, spacing and punctuation do not count. */
export function claimHash(claim: string): string {
  const normal = claim.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  if (!normal) return '';
  // FNV-1a, 32 bits, twice with different offsets so collisions are unlikely in one document.
  let a = 0x811c9dc5; let b = 0x01000193 ^ 0x9e3779b9;
  for (let index = 0; index < normal.length; index += 1) {
    const code = normal.charCodeAt(index);
    a = Math.imul(a ^ code, 0x01000193) >>> 0;
    b = Math.imul(b ^ code, 0x01000193 + 2) >>> 0;
  }
  return `${a.toString(16).padStart(8, '0')}${b.toString(16).padStart(8, '0')}`;
}

export function claimState(savedHash: string | null | undefined, currentClaim: string): ClaimState {
  if (!savedHash) return 'unchecked';
  return claimHash(currentClaim) === savedHash ? 'checked' : 'changed';
}

/** What a citation in a document says about project evidence, as the editor reports it. */
export type EvidenceLink = {
  citation_id: string;
  block_id: string;
  project_id: string;
  source_id: string | null;
  finding_id: string | null;
  library_document_id: string | null;
  claim: string;
  state: ClaimState;
  checked_at: string | null;
};
