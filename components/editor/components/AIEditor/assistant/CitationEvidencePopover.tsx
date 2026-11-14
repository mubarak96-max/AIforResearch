'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LuBookOpen, LuCircleAlert, LuCircleCheck, LuExternalLink } from 'react-icons/lu';
import type { ClaimState } from '../../../lib/aiEditor/claimText';
import { getProjectSource, type ProjectFinding } from '../../../lib/aiEditor/assistApi';

const STATUS: Record<string, string> = { needs_review: 'Awaiting review', approved: 'Approved by a reviewer', needs_revision: 'Revision requested' };

/** The evidence behind one citation: the quoted passage, the project finding and whether the sentence changed. */
export default function CitationEvidencePopover({
  anchor,
  title,
  attrs,
  claim,
  state,
  canEdit,
  onMarkChecked,
  onClose,
}: {
  anchor: DOMRect;
  title: string;
  attrs: Record<string, any>;
  claim: string;
  state: ClaimState;
  canEdit: boolean;
  onMarkChecked: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [finding, setFinding] = useState<ProjectFinding | null>(null);
  const [findingError, setFindingError] = useState('');
  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    const timer = window.setTimeout(() => window.addEventListener('pointerdown', onPointer, true), 0);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointerdown', onPointer, true);
    };
  }, [onClose]);
  useEffect(() => {
    if (!attrs.projectId || !attrs.sourceId || !attrs.findingId) return;
    let live = true;
    getProjectSource(attrs.projectId, attrs.sourceId)
      .then((source) => {
        if (!live) return;
        const match = source.findings?.find((item) => item.id === attrs.findingId) ?? null;
        setFinding(match);
        if (!match) setFindingError('This finding was removed from the project.');
      })
      .catch((error: Error) => live && setFindingError(error.message));
    return () => { live = false; };
  }, [attrs.projectId, attrs.sourceId, attrs.findingId]);

  const quote = finding?.quote || attrs.evidenceQuote || '';
  const page = finding?.page ?? (attrs.evidencePage ? Number(attrs.evidencePage) : null);
  const width = Math.min(380, window.innerWidth - 16);
  const left = Math.max(8, Math.min(anchor.left, window.innerWidth - width - 8));
  const top = anchor.bottom + 360 > window.innerHeight ? Math.max(8, anchor.top - 368) : anchor.bottom + 8;
  const readerHref = attrs.libraryDocumentId
    ? `/library/${encodeURIComponent(attrs.libraryDocumentId)}?${new URLSearchParams({ ...(page ? { page: String(page) } : {}), ...(attrs.highlightId ? { highlight: attrs.highlightId } : {}) })}`
    : null;
  const findingHref = attrs.projectId && attrs.sourceId
    ? `/projects/${encodeURIComponent(attrs.projectId)}?${new URLSearchParams({ evidence: attrs.sourceId, ...(attrs.findingId ? { finding: attrs.findingId } : {}) })}#project-evidence-title`
    : null;
  const checkedOn = attrs.checkedAt ? new Date(attrs.checkedAt) : null;
  const link = 'inline-flex h-8 items-center gap-1.5 rounded-[9px] border border-line bg-surface px-3 text-[12.5px] font-semibold text-ink-2 hover:bg-soft';

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label="Evidence for this citation"
      style={{ position: 'fixed', top, left, width, zIndex: 16100 }}
      className="max-h-[min(560px,calc(100vh-16px))] overflow-y-auto rounded-[14px] border border-line bg-surface p-3.5 shadow-[0_22px_50px_-18px_rgba(15,23,42,0.35)]"
      onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}
    >
      <div className="text-[11.5px] font-semibold uppercase tracking-wide text-subtle">Evidence</div>
      <div className="mt-0.5 line-clamp-2 text-[13px] font-medium text-ink">{title}</div>

      <div className="mt-3 text-[11.5px] font-semibold text-muted">The sentence</div>
      <p className="mt-1 text-[12.5px] leading-[1.5] text-ink-2">{claim || 'No sentence before this citation.'}</p>
      <p className={`mt-1.5 flex items-start gap-1.5 text-[12px] ${state === 'changed' ? 'text-[#b45309]' : state === 'checked' ? 'text-[#15803d]' : 'text-muted'}`}>
        {state === 'changed' ? <LuCircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : state === 'checked' ? <LuCircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : null}
        {state === 'changed'
          ? 'The sentence changed after it was checked. Check it against the passage again.'
          : state === 'checked'
            ? `Checked against the passage${checkedOn && !Number.isNaN(checkedOn.getTime()) ? ` on ${checkedOn.toLocaleDateString()}` : ''}.`
            : 'Not checked against the passage yet.'}
      </p>

      <div className="mt-3 text-[11.5px] font-semibold text-muted">The passage{page ? ` (page ${page})` : ''}</div>
      {quote
        ? <blockquote className="mt-1 border-l-2 border-[var(--theme-primary,var(--color-brand))] pl-2.5 text-[12.5px] leading-[1.5] text-ink-3">{quote}</blockquote>
        : <p className="mt-1 text-[12.5px] text-muted">No passage is saved with this citation. Cite from a highlight in the reader, or add the page in Edit citation, so the claim can be checked.</p>}

      {attrs.findingId ? (
        <div className="mt-3 rounded-lg bg-soft px-2.5 py-2 text-[12px]">
          <span className="font-semibold text-ink-2">Project finding: </span>
          {finding ? <>{STATUS[finding.status] || finding.status.replaceAll('_', ' ')}{finding.reviewed_by ? ` · ${finding.reviewed_by}` : ''}</> : findingError || 'Loading…'}
          {finding?.finding ? <p className="mt-1 text-ink-3">{finding.finding}</p> : null}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {canEdit && quote ? (
          <button type="button" onClick={onMarkChecked} className="inline-flex h-8 items-center gap-1.5 rounded-[10px] bg-[var(--theme-primary,var(--color-brand))] px-3 text-[12.5px] font-semibold text-white">
            <LuCircleCheck className="h-3.5 w-3.5" />{state === 'checked' ? 'Checked' : 'The passage supports this sentence'}
          </button>
        ) : null}
        {readerHref ? <a href={readerHref} target="_blank" rel="noopener" className={link}><LuBookOpen className="h-3.5 w-3.5" />Open in reader</a> : null}
        {findingHref ? <a href={findingHref} target="_blank" rel="noopener" className={link}><LuExternalLink className="h-3.5 w-3.5" />Open finding</a> : null}
      </div>
    </div>,
    document.body,
  );
}
