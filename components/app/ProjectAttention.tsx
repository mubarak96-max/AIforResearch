'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { LuCircleAlert, LuCircleCheck, LuFileText } from 'react-icons/lu';
import { api } from '@/lib/session';
import { Card } from './ui';

type Item = { kind: 'claim_changed' | 'finding_revision' | 'finding_unreviewed' | 'evidence_removed'; block_id: string; claim: string | null; source_id: string | null; finding_id: string | null; href: string | null; detail: string };
type Doc = { document_id: string; title: string | null; accessible: boolean; href: string | null; citations: number; unchecked: number; items: Item[]; updated_at: string };
type Attention = { documents: Doc[]; total: number; next_steps: { date: string; next: string; blockers: string } | null };

const LABEL: Record<Item['kind'], string> = {
  finding_revision: 'Finding sent back',
  claim_changed: 'Sentence changed',
  evidence_removed: 'Evidence removed',
  finding_unreviewed: 'Not reviewed yet',
};

/** What in this project needs another look: document sentences whose evidence changed, and the next steps. */
export function ProjectAttention({ projectId }: { projectId: string }) {
  const [data, setData] = useState<Attention | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    const load = () => api<Attention>(`/api/projects/${encodeURIComponent(projectId)}/attention`)
      .then((result) => { if (live) { setData(result); setError(''); } })
      .catch((reason: Error) => { if (live) setError(reason.message); });
    void load();
    const changed = (event: Event) => { if ((event as CustomEvent<string>).detail === projectId) void load(); };
    window.addEventListener('project-evidence-changed', changed);
    return () => { live = false; window.removeEventListener('project-evidence-changed', changed); };
  }, [projectId]);

  if (error) return <Card className="mb-4 px-4 py-3 text-[13.5px] text-muted">Needs another look could not load: {error}</Card>;
  if (!data) return null;
  const linked = data.documents.filter((document) => document.citations > 0);
  if (!linked.length && !data.next_steps) return null;
  const evidenceHref = (item: Item) => item.source_id
    ? `/projects/${encodeURIComponent(projectId)}?${new URLSearchParams({ evidence: item.source_id, ...(item.finding_id ? { finding: item.finding_id } : {}) })}#project-evidence-title`
    : null;

  return (
    <section aria-labelledby="attention-title" className="mb-6">
      <h2 id="attention-title" className="text-[15px] font-bold">Needs another look</h2>
      <p className="mt-0.5 text-[13px] text-muted">Sentences in your documents whose evidence changed, was sent back by a reviewer, or that changed after they were checked.</p>
      {data.next_steps ? (
        <Card className="mt-2.5 px-4 py-3 text-[14px]">
          <p className="text-[12.5px] font-semibold text-muted">Next steps, from the progress log of {new Date(`${data.next_steps.date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
          {data.next_steps.next ? <p className="mt-1 whitespace-pre-wrap">{data.next_steps.next}</p> : null}
          {data.next_steps.blockers ? <p className="mt-1 whitespace-pre-wrap text-muted"><span className="font-semibold">Blockers:</span> {data.next_steps.blockers}</p> : null}
        </Card>
      ) : null}
      {linked.length ? (
        <ul className="mt-2.5 space-y-2.5">
          {linked.map((document) => (
            <li key={document.document_id}>
              <Card className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <LuFileText className="h-4 w-4 text-subtle" aria-hidden="true" />
                  {document.href
                    ? <Link href={document.href} className="min-w-0 flex-1 truncate text-[14.5px] font-semibold text-ink hover:underline">{document.title}</Link>
                    : <span className="min-w-0 flex-1 text-[14.5px] text-muted">A document you can't open</span>}
                  <span className="text-[12.5px] text-muted">{document.citations} cited finding{document.citations === 1 ? '' : 's'}{document.unchecked ? ` · ${document.unchecked} not checked yet` : ''}</span>
                </div>
                {document.items.length ? (
                  <ul className="mt-2 space-y-2">
                    {document.items.slice(0, 12).map((item, index) => (
                      <li key={`${item.block_id}-${item.finding_id}-${index}`} className="rounded-lg bg-soft px-3 py-2 text-[13.5px]">
                        <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#b45309]"><LuCircleAlert className="h-3.5 w-3.5" />{LABEL[item.kind]}</p>
                        {item.claim ? <p className="mt-1 text-ink-2">“{item.claim}”</p> : null}
                        <p className="mt-1 text-[12.5px] text-muted">{item.detail}</p>
                        <div className="mt-1.5 flex flex-wrap gap-3 text-[12.5px] font-semibold">
                          {item.href ? <Link href={item.href} className="text-brand hover:underline">Open the sentence</Link> : null}
                          {evidenceHref(item) && item.kind !== 'evidence_removed' ? <Link href={evidenceHref(item)!} scroll={false} className="text-brand hover:underline">Open the finding</Link> : null}
                        </div>
                      </li>
                    ))}
                    {document.items.length > 12 ? <li className="text-[12.5px] text-muted">And {document.items.length - 12} more in this document.</li> : null}
                  </ul>
                ) : (
                  <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-[#15803d]"><LuCircleCheck className="h-3.5 w-3.5" />Nothing to recheck in this document.</p>
                )}
              </Card>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
