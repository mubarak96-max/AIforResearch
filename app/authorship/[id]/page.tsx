'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { LuCheck, LuCopy, LuExternalLink, LuFingerprint, LuTrash2 } from 'react-icons/lu';
import { AppFrame } from '@/components/app/AppFrame';
import { Button, Card, CardHeader, EmptyState } from '@/components/app/ui';
import { AuthorshipReportView, type AuthorshipPayload } from '@/components/authorship/AuthorshipReportView';
import { api, useSession } from '@/lib/session';

type Report = { id: string; hash: string; created_at: string; words: number };

const verifyUrl = (id: string) => `${window.location.origin}/verify/${id}`;

/** The writer's live authorship record for one document, and the reports they have shared. */
export default function AuthorshipPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useSession();
  const [payload, setPayload] = useState<AuthorshipPayload | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const base = `/api/ai-editor/documents/${encodeURIComponent(id)}/authorship`;
  const load = useCallback(async () => {
    try {
      const [record, issued] = await Promise.all([api<AuthorshipPayload>(base), api<{ reports: Report[] }>(`${base}/reports`)]);
      setPayload(record);
      setReports(issued.reports);
    } catch (caught) { setError((caught as Error).message); }
  }, [base]);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace(`/login?next=/authorship/${encodeURIComponent(id)}`); return; }
    void load();
  }, [id, load, loading, router, user]);

  const copy = async (reportId: string) => {
    await navigator.clipboard?.writeText(verifyUrl(reportId)).catch(() => undefined);
    setCopied(reportId);
    window.setTimeout(() => setCopied(null), 1800);
  };

  const issue = async () => {
    setBusy(true); setError(null);
    try {
      const report = await api<{ id: string }>(`${base}/reports`, { method: 'POST' });
      await load();
      await copy(report.id);
    } catch (caught) { setError((caught as Error).message); } finally { setBusy(false); }
  };

  const withdraw = async (reportId: string) => {
    if (!window.confirm('Withdraw this report? Its link will stop working for everyone.')) return;
    try {
      await api(`/api/authorship/reports/${encodeURIComponent(reportId)}`, { method: 'DELETE' });
      setReports((current) => current.filter((report) => report.id !== reportId));
    } catch (caught) { setError((caught as Error).message); }
  };

  return (
    <AppFrame
      title="Authorship report"
      wide
      actions={(
        <>
          <Link href={`/editor?doc=${encodeURIComponent(id)}`} className="text-[14px] font-semibold text-brand hover:underline">Back to the document</Link>
          <Button variant="primary" onClick={issue} disabled={busy || !payload?.sessions}><LuFingerprint className="h-4 w-4" />{busy ? 'Creating…' : 'Create shareable report'}</Button>
        </>
      )}
    >
      {error ? <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-700">{error}</p> : null}
      {!payload && !error ? <p className="text-[14px] text-muted">Loading your writing record…</p> : null}

      {payload ? (
        <>
          <Card className="mb-6">
            <CardHeader
              title="Shared reports"
              description="A shared report is a frozen copy of this record with its own link. Send the link to a teacher, supervisor or client; they can open it without an account. Withdraw it at any time."
            />
            {reports.length ? (
              <ul className="divide-y divide-line-2">
                {reports.map((report) => (
                  <li key={report.id} className="flex flex-wrap items-center gap-2 px-5 py-3 text-[14px]">
                    <span className="min-w-0 flex-1">
                      {new Date(report.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      <span className="text-subtle"> · {report.words.toLocaleString('en-US')} words · {report.hash.slice(0, 12)}…</span>
                    </span>
                    <Button size="sm" onClick={() => void copy(report.id)}>{copied === report.id ? <LuCheck className="h-4 w-4" /> : <LuCopy className="h-4 w-4" />}{copied === report.id ? 'Link copied' : 'Copy link'}</Button>
                    <a href={`/verify/${report.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-[10px] px-3 text-[13.5px] font-semibold text-ink-2 hover:bg-soft"><LuExternalLink className="h-4 w-4" />Open</a>
                    <Button size="sm" variant="ghost" onClick={() => void withdraw(report.id)} aria-label="Withdraw report"><LuTrash2 className="h-4 w-4" /></Button>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No shared reports yet">
                {payload.sessions ? 'Create one when you are ready to hand in or deliver the document.' : 'Write in the document and your record will start here.'}
              </EmptyState>
            )}
          </Card>
          <AuthorshipReportView payload={payload} />
        </>
      ) : null}
    </AppFrame>
  );
}
