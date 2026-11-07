/**
 * Evidence check: for each sentence that cites something, does the cited source say it, and is
 * the sentence too close to the source's own words? Sentences with no citation are compared
 * with the writer's Library, so text taken from a paper they forgot to cite is caught too.
 *
 * Where the text to compare comes from, best first: the cited paper's PDF in the Library (its
 * passages, with page numbers), the passage the citation was written from (saved on the
 * citation by autocomplete), then the paper's abstract from the papers index. Each finding says
 * which one it used.
 *
 * The word-for-word check needs no AI. The support verdicts are one AI call per batch of
 * sentences, billed like the other reviews (by the words checked).
 */
import { HTTPException } from 'hono/http-exception';
import { newId } from '../firebase.js';
import type { AuthUser } from '../auth.js';
import type { Slots } from '../slots/types.js';
import { completeMetered, isBlockingLlmError, parseJsonPayload } from './assist-llm.js';
import { getLibraryDocuments, isUuid, searchLibrary } from './assist-store.js';
import { documentWithDoi } from './libraryFiles.js';
import { isQuotation, overlap, splitSentences, words, type Sentence } from './textOverlap.js';
import { languageRule } from './prompts.js';

export type EvidenceCitation = {
  placeholder: string;
  label: string;
  library_document_id?: string | null;
  doi?: string | null;
  title?: string | null;
  evidence_quote?: string | null;
  evidence_page?: number | null;
};

export type EvidenceBlock = { id: string; text: string; citations: EvidenceCitation[] };

export type EvidenceComment = {
  id: string;
  blockId: string;
  quote: string;
  comment: string;
  severity: 'minor' | 'major';
  category: 'not_supported' | 'partly_supported' | 'too_close' | 'uncited_overlap';
  suggestion: null;
};

export type EvidenceSummary = {
  sentences: number;
  cited: number;
  checked: number;
  supported: number;
  partly: number;
  notSupported: number;
  tooClose: number;
  uncitedOverlap: number;
  /** Cited sentences checked against full text, an abstract, or not at all (no text found). */
  basis: { full_text: number; abstract: number; none: number };
};

type Passage = { text: string; page: number | null; basis: 'full_text' | 'abstract' };
type SourceText = { label: string; libraryDocumentId: string | null; abstract: string | null; quote: Passage | null };

const MAX_CITED = 120;
const MAX_UNCITED = 80;
const BATCH = 10;

async function mapLimit<T, R>(items: T[], limit: number, run: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      out[index] = await run(items[index]);
    }
  }));
  return out;
}

const cleanDoi = (doi?: string | null) => (doi || '').replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').trim().toLowerCase() || null;
const short = (text: string, max = 260) => (text.length > max ? `${text.slice(0, max).replace(/\s+\S*$/, '')}…` : text);
const where = (passage: Passage) => (passage.basis === 'abstract' ? 'abstract' : passage.page ? `p. ${passage.page}` : 'full text');

/** What each cited work offers to compare against (looked up once per request). */
async function resolveSources(slots: Slots, user: AuthUser, citations: EvidenceCitation[]): Promise<Map<string, SourceText>> {
  const byKey = new Map<string, EvidenceCitation>();
  for (const citation of citations) {
    const key = sourceKey(citation);
    if (!byKey.has(key)) byKey.set(key, citation);
  }
  const resolved = new Map<string, SourceText>();
  await mapLimit([...byKey.entries()], 4, async ([key, citation]) => {
    let libraryDocumentId: string | null = null;
    if (isUuid(citation.library_document_id)) libraryDocumentId = citation.library_document_id;
    if (!libraryDocumentId && citation.doi) libraryDocumentId = await documentWithDoi(user.id, cleanDoi(citation.doi)).catch(() => null);
    let abstract: string | null = null;
    if (libraryDocumentId) {
      const [doc] = await getLibraryDocuments(user.id, [libraryDocumentId]);
      if (!doc) libraryDocumentId = null;
      else abstract = doc.abstract || null;
    }
    if (!abstract && citation.doi) {
      const paper = await slots.papers.lookupDoi(cleanDoi(citation.doi)!).catch(() => null);
      abstract = paper?.abstract || null;
    }
    const quote = citation.evidence_quote?.trim()
      ? { text: citation.evidence_quote.trim().slice(0, 1500), page: citation.evidence_page ?? null, basis: 'full_text' as const }
      : null;
    resolved.set(key, { label: citation.label, libraryDocumentId, abstract, quote });
  });
  return resolved;
}

export const sourceKey = (citation: EvidenceCitation) =>
  (isUuid(citation.library_document_id) && citation.library_document_id) || cleanDoi(citation.doi) || (citation.title || citation.label || citation.placeholder).toLowerCase();

/** The passages of one source that best match a sentence. */
async function passagesFor(user: AuthUser, source: SourceText, sentence: string): Promise<Passage[]> {
  const passages: Passage[] = [];
  if (source.libraryDocumentId) {
    const hits = await searchLibrary(user.id, sentence, [source.libraryDocumentId], 1).catch(() => []);
    for (const passage of hits[0]?.passages ?? []) passages.push({ text: passage.content, page: passage.page, basis: 'full_text' });
  }
  if (source.quote && !passages.some((passage) => passage.text.includes(source.quote!.text.slice(0, 80)))) passages.push(source.quote);
  if (!passages.length && source.abstract) passages.push({ text: source.abstract, page: null, basis: 'abstract' });
  return passages;
}

type CitedItem = {
  blockId: string;
  sentence: Sentence;
  sources: { source: SourceText; passages: Passage[] }[];
};

const SUPPORT_SYSTEM =
  'You check whether cited sources support the sentences that cite them, for an academic writer. ' +
  'For each numbered sentence you get the passages from its cited sources. Judge only from those passages: ' +
  '"supported" when a passage states it (paraphrase is fine), "partly" when a passage supports part of it or a weaker version ' +
  '(the sentence overstates, generalises, adds a number or a cause the passage lacks), "not_supported" when no passage says it ' +
  'or a passage says otherwise, "unclear" when the passages are too short to tell (for example only an abstract on a detail). ' +
  'Answer with JSON only: [{"i": <sentence number>, "verdict": "supported"|"partly"|"not_supported"|"unclear", ' +
  '"passage": "<S.P label of the passage you relied on, or empty>", "reason": "<one sentence for the writer>"}].';

function supportPrompt(items: CitedItem[], offset: number) {
  return items
    .map((item, index) => {
      const sources = item.sources
        .map((entry, s) => entry.passages
          .map((passage, p) => `  [${s + 1}.${p + 1}] ${entry.source.label} (${where(passage)}): ${passage.text.slice(0, 1400)}`)
          .join('\n'))
        .join('\n');
      return `Sentence ${offset + index + 1}: ${item.sentence.plain}\nPassages:\n${sources}`;
    })
    .join('\n\n');
}

/** Runs the check. Returns comments in the editor's AI-review shape, anchored to exact text. */
export async function checkEvidence(
  slots: Slots,
  user: AuthUser,
  blocks: EvidenceBlock[],
  options: { language?: string | null; library: boolean },
): Promise<{ comments: EvidenceComment[]; summary: EvidenceSummary }> {
  const summary: EvidenceSummary = {
    sentences: 0, cited: 0, checked: 0, supported: 0, partly: 0, notSupported: 0, tooClose: 0, uncitedOverlap: 0,
    basis: { full_text: 0, abstract: 0, none: 0 },
  };
  const comments: EvidenceComment[] = [];
  const add = (blockId: string, sentence: Sentence, category: EvidenceComment['category'], severity: EvidenceComment['severity'], comment: string) => {
    if (!sentence.anchor || sentence.anchor.length < 8) return;
    if (comments.some((existing) => existing.blockId === blockId && existing.quote === sentence.anchor && existing.category === category)) return;
    comments.push({ id: `ai-${newId().slice(0, 12)}`, blockId, quote: sentence.anchor, comment: comment.slice(0, 1200), severity, category, suggestion: null });
  };

  const cited: { blockId: string; sentence: Sentence; citations: EvidenceCitation[] }[] = [];
  const uncited: { blockId: string; sentence: Sentence }[] = [];
  for (const block of blocks) {
    const citations = new Map(block.citations.map((citation) => [citation.placeholder, citation]));
    for (const sentence of splitSentences(block.text)) {
      if (words(sentence.plain).length < 5) continue;
      summary.sentences++;
      const used = sentence.citations.map((placeholder) => citations.get(placeholder)).filter((citation): citation is EvidenceCitation => Boolean(citation));
      if (used.length) cited.push({ blockId: block.id, sentence, citations: used });
      else uncited.push({ blockId: block.id, sentence });
    }
  }
  summary.cited = cited.length;

  // ---------------------------------------------------------------- cited sentences
  const sources = await resolveSources(slots, user, cited.slice(0, MAX_CITED).flatMap((item) => item.citations));
  const items: CitedItem[] = await mapLimit(cited.slice(0, MAX_CITED), 4, async (item) => ({
    blockId: item.blockId,
    sentence: item.sentence,
    sources: await Promise.all(item.citations.map(async (citation) => {
      const source = sources.get(sourceKey(citation))!;
      return { source, passages: await passagesFor(user, source, item.sentence.plain) };
    })),
  }));

  const checkable: CitedItem[] = [];
  for (const item of items) {
    const all = item.sources.flatMap((entry) => entry.passages.map((passage) => ({ entry, passage })));
    if (!all.length) { summary.basis.none++; continue; }
    summary.basis[all.some(({ passage }) => passage.basis === 'full_text') ? 'full_text' : 'abstract']++;
    checkable.push(item);
    // Word for word: a cited sentence may copy its source only inside quotation marks.
    if (!isQuotation(item.sentence.plain)) {
      const closest = all
        .map(({ entry, passage }) => ({ entry, passage, overlap: overlap(item.sentence.plain, passage.text) }))
        .sort((a, b) => b.overlap.run - a.overlap.run)[0];
      if (closest?.overlap.tooClose) {
        summary.tooClose++;
        add(item.blockId, item.sentence, 'too_close', 'major',
          `This sentence repeats ${closest.entry.source.label} almost word for word (${closest.overlap.run} words in a row, ${where(closest.passage)}): "${short(closest.overlap.runText, 160)}". ` +
          'Put the copied words in quotation marks, or rewrite the idea in your own words and keep the citation.');
      }
    }
  }

  // Support verdicts, in batches.
  const batches: CitedItem[][] = [];
  for (let index = 0; index < checkable.length; index += BATCH) batches.push(checkable.slice(index, index + BATCH));
  let failed = 0;
  await mapLimit(batches.map((batch, index) => ({ batch, offset: index * BATCH })), 3, async ({ batch, offset }) => {
    let raw: string;
    try {
      raw = await completeMetered(
      slots.llm,
      user,
      {
        messages: [
          { role: 'system', content: SUPPORT_SYSTEM + languageRule(options.language) },
          { role: 'user', content: supportPrompt(batch, offset) },
        ],
        task: 'review',
        temperature: 0.1,
        maxTokens: 2200,
      },
      { feature: 'evidence-check', reviewWords: batch.reduce((sum, item) => sum + words(item.sentence.plain).length, 0) },
      );
    } catch (error) {
      // Setup and credit errors stop the check; one failed batch only leaves its sentences unjudged.
      if (isBlockingLlmError(error)) throw error;
      console.warn('evidence batch failed:', (error as Error)?.message);
      failed++;
      return;
    }
    const verdicts = parseJsonPayload(raw);
    for (const verdict of Array.isArray(verdicts) ? verdicts : []) {
      if (!verdict || typeof verdict !== 'object') continue;
      const entry = verdict as Record<string, unknown>;
      const item = batch[Number(entry.i) - 1 - offset];
      if (!item) continue;
      summary.checked++;
      const kind = String(entry.verdict || '').toLowerCase();
      const reason = String(entry.reason || '').trim();
      const [s, p] = String(entry.passage || '').split('.').map((part) => Number(part) - 1);
      const relied = item.sources[s]?.passages[p] ?? item.sources[0]?.passages[0];
      const label = item.sources[s]?.source.label ?? item.sources[0]?.source.label ?? 'the cited source';
      const evidence = relied ? ` What the source says (${label}, ${where(relied)}): "${short(relied.text)}"` : '';
      const basisNote = relied?.basis === 'abstract' ? ' Checked against the abstract only: add the PDF to your Library for a full check.' : '';
      if (kind === 'supported') summary.supported++;
      else if (kind === 'partly') {
        summary.partly++;
        add(item.blockId, item.sentence, 'partly_supported', 'minor', `${reason || 'The source supports only part of this.'}${evidence}${basisNote}`);
      } else if (kind === 'not_supported') {
        summary.notSupported++;
        add(item.blockId, item.sentence, 'not_supported', 'major', `${reason || 'The cited source does not appear to say this.'}${evidence}${basisNote}`);
      }
    }
  });

  if (batches.length && failed === batches.length) throw new HTTPException(502, { message: 'The evidence check could not reach the AI; try again' });

  // ---------------------------------------------------------------- uncited sentences vs. the Library
  if (options.library) {
    const long = uncited.filter((item) => words(item.sentence.plain).length >= 12 && !isQuotation(item.sentence.plain)).slice(0, MAX_UNCITED);
    await mapLimit(long, 4, async (item) => {
      const hits = await searchLibrary(user.id, item.sentence.plain, [], 2).catch(() => []);
      let best: { title: string; page: number | null; overlap: ReturnType<typeof overlap> } | null = null;
      for (const hit of hits) {
        for (const passage of hit.passages) {
          const result = overlap(item.sentence.plain, passage.content);
          if (result.tooClose && (!best || result.run > best.overlap.run)) {
            best = { title: hit.document.title || hit.document.filename || 'a paper in your Library', page: passage.page, overlap: result };
          }
        }
      }
      if (best) {
        summary.uncitedOverlap++;
        add(item.blockId, item.sentence, 'uncited_overlap', 'major',
          `This sentence matches "${short(best.title, 120)}"${best.page ? ` (p. ${best.page})` : ''} from your Library almost word for word (${best.overlap.run} words in a row) but cites nothing. ` +
          'Cite the paper, and quote or rephrase the copied words.');
      }
    });
  }

  return { comments, summary };
}
