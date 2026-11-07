'use client';

import { useEffect, useState } from 'react';
import { LuPrinter } from 'react-icons/lu';
import { AuthorshipReportView, type AuthorshipPayload } from '@/components/authorship/AuthorshipReportView';

type Verified = { id: string; payload: AuthorshipPayload; hash: string; valid: boolean; created_at: string };

/** Public view of an issued authorship report: no account needed, only the link. */
export function VerifyReport({ id }: { id: string }) {
  const [report, setReport] = useState<Verified | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/authorship/verify/${encodeURIComponent(id)}`, { cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.detail || 'This report could not be opened.');
        setReport(body as Verified);
      })
      .catch((caught) => setError((caught as Error).message));
  }, [id]);

  return (
    <div className="mx-auto max-w-4xl px-[18px] py-10 md:px-10">
      {/* Printing gives the report alone, for a PDF or paper copy. */}
      <style>{'@media print { header, footer, nav, .verify-actions { display: none !important; } body { background: #fff; } }'}</style>
      {error ? (
        <div className="rounded-2xl border border-line bg-surface px-6 py-12 text-center">
          <p className="text-[17px] font-semibold">Report not available</p>
          <p className="mt-1 text-[14px] text-muted">{error}</p>
        </div>
      ) : !report ? (
        <p className="text-[14px] text-muted">Opening the report…</p>
      ) : (
        <>
          <div className="verify-actions mb-4 flex justify-end">
            <button type="button" onClick={() => window.print()} className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-line bg-surface px-3 text-[13.5px] font-semibold text-ink hover:bg-soft">
              <LuPrinter className="h-4 w-4" />Print or save as PDF
            </button>
          </div>
          <AuthorshipReportView payload={report.payload} issued={{ id: report.id, hash: report.hash, created_at: report.created_at, valid: report.valid }} />
        </>
      )}
    </div>
  );
}
