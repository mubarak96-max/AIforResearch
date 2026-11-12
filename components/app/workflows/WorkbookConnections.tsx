'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, inputClass } from '@/components/app/ui';
import { api } from '@/lib/session';
import {
  CONSENT_OPTIONS, WORKBOOK_DOCUMENT_LABEL, WORKBOOK_LINK_HREF, workbookDocumentBlocks,
  type Workbook, type WorkbookLinkKind,
} from '@/lib/workflows';

type Save = (path: string, body: Record<string, unknown>) => Promise<boolean>;
type Props = { workbook: Workbook; busy: boolean; canEdit: boolean; save: Save; onError: (message: string) => void; onNotice: (message: string) => void };
type ReviewSummary = { id: string; title: string };
const LINK_LABEL: Record<WorkbookLinkKind, string> = { matrix: 'Evidence matrix', document: 'Draft document', review: 'Systematic review' };

/**
 * The literature-review chain: systematic review → workbook sources → matrix → evidence notes → draft.
 * Each step opens the existing tool; the workbook records what was created from it.
 */
export function WorkbookConnections({ workbook, busy, canEdit, save, onError, onNotice }: Props) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [reviews, setReviews] = useState<ReviewSummary[] | null>(null);
  const [reviewId, setReviewId] = useState('');
  const [consent, setConsent] = useState<string>('approved private use');
  const disabled = busy || working;
  const research = workbook.kind === 'research';
  const draftLabel = WORKBOOK_DOCUMENT_LABEL[workbook.kind] ?? 'Open as document';
  const librarySources = workbook.entries.filter((entry) => entry.section === 'sources' && entry.values.library_id);

  const run = async (action: () => Promise<void>) => {
    setWorking(true);
    try { await action(); } catch (e) { onError((e as Error).message); } finally { setWorking(false); }
  };
  const link = (kind: WorkbookLinkKind, id: string, title: string) => save('/links', { kind, id, title });

  const draft = () => run(async () => {
    const title = `${workbook.title}: ${draftLabel.toLowerCase()}`;
    const created = await api<{ id: string }>('/api/ai-editor/documents', { method: 'POST', body: JSON.stringify({ title, blocks: workbookDocumentBlocks(workbook) }) });
    if (canEdit) await link('document', created.id, title);
    router.push(WORKBOOK_LINK_HREF.document(created.id));
  });

  const matrix = () => run(async () => {
    const ids = [...new Set(librarySources.map((entry) => entry.values.library_id))];
    const body = { title: `${workbook.title}: evidence matrix`.slice(0, 160), document_ids: ids, project_id: workbook.project_id };
    const created = await api<{ id: string; title: string; paper_count: number }>('/api/matrices', { method: 'POST', body: JSON.stringify(body) });
    if (created.paper_count < ids.length) {
      onNotice(`${ids.length - created.paper_count} sources are in other members' Libraries and were not added to the matrix.`);
    }
    await link('matrix', created.id, created.title);
    router.push(WORKBOOK_LINK_HREF.matrix(created.id));
  });

  const loadReviews = () => run(async () => {
    const result = await api<{ reviews: ReviewSummary[] }>('/api/systematic-reviews');
    setReviews(result.reviews);
    setReviewId(result.reviews[0]?.id ?? '');
  });

  const importReview = () => run(async () => {
    if (await save('/import-review', { review_id: reviewId, consent })) {
      onNotice('Included studies were added as sources. Studies without a full text in your Library were imported as abstracts and are labelled.');
      setReviews(null);
    }
  });

  return (
    <Card className="mb-5 p-5">
      <h2 className="font-bold">Connected work</h2>
      <p className="mt-1 text-sm text-muted">
        {research
          ? 'Bring in included studies, compare them in a matrix, then draft the review from your checked evidence.'
          : 'Draft the report from your codebook, themes and coded excerpts.'}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="primary" disabled={disabled} onClick={() => void draft()}>{draftLabel}</Button>
        {research && canEdit && (
          <Button disabled={disabled || !librarySources.length} onClick={() => void matrix()} title={librarySources.length ? undefined : 'Import Library sources first'}>
            Build evidence matrix
          </Button>
        )}
        {research && canEdit && reviews === null && <Button disabled={disabled} onClick={() => void loadReviews()}>Import from a systematic review</Button>}
        {research && <Link href={`/deep-research?q=${encodeURIComponent(workbook.question || workbook.title)}`} className="self-center text-sm font-semibold text-brand hover:underline">Research this question</Link>}
      </div>
      {reviews !== null && (
        <div className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-end">
          {reviews.length ? (
            <>
              <label className="grid gap-1.5 text-sm font-semibold">
                Systematic review
                <select className={inputClass} value={reviewId} onChange={(e) => setReviewId(e.target.value)}>
                  {reviews.map((review) => <option key={review.id} value={review.id}>{review.title}</option>)}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-semibold">
                Permission to use
                <select className={inputClass} value={consent} onChange={(e) => setConsent(e.target.value)}>
                  {CONSENT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <div className="flex gap-2">
                <Button variant="primary" disabled={disabled || !reviewId} onClick={() => void importReview()}>Import included</Button>
                <Button disabled={disabled} onClick={() => setReviews(null)}>Cancel</Button>
              </div>
            </>
          ) : <p className="text-sm text-muted sm:col-span-3">You have no systematic reviews yet.</p>}
        </div>
      )}
      {!!workbook.links?.length && (
        <ul className="mt-4 grid gap-1.5 border-t border-line pt-4 text-sm">
          {[...workbook.links].reverse().map((item) => (
            <li key={`${item.kind}:${item.id}`} className="flex flex-wrap gap-x-2">
              <span className="text-muted">{LINK_LABEL[item.kind]}:</span>
              <Link href={WORKBOOK_LINK_HREF[item.kind](item.id)} className="font-semibold text-brand hover:underline">{item.title}</Link>
              <span className="text-xs text-muted">{item.at.slice(0, 10)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
