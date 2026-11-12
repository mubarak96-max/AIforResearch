'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/session';
import { Button, Card } from '@/components/app/ui';
import { showError } from '@/components/app/research/parts';
import { downloadFile } from './client';
import type { ReviewState } from './types';

type AuditEvent = { id: string; actor: string; action: string; record_id: string | null; stage: string | null; at: string; before: unknown; after: unknown; blinded?: boolean };

export function AuditTab({ state }: { state: ReviewState }) {
  const [events, setEvents] = useState<AuditEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const path = `/api/systematic-reviews/${state.review.id}/audit`;
  useEffect(() => {
    let current = true;
    api<{ events: AuditEvent[] }>(path).then((result) => { if (current) setEvents(result.events); }).catch((caught) => { if (current) setError(caught.message); });
    return () => { current = false; };
  }, [path]);
  const title = (id: string | null) => state.records.find((record) => record.id === id)?.title;
  return <Card className="p-5">
    <div className="flex flex-wrap items-center gap-3"><h2 className="flex-1 text-lg font-semibold">Decision history</h2><Button onClick={() => downloadFile(path, 'review-decision-history.json').catch(showError)}>Export history</Button></div>
    <p className="mt-2 text-sm text-muted">Changes are appended with their author, time, previous value and new value. Peer decisions remain hidden until you submit your own decision. Activity before history recording was introduced is not reconstructed.</p>
    {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
    {!events ? <p className="mt-4 text-sm text-muted">Loading history…</p> : !events.length ? <p className="mt-4 text-sm text-muted">No changes recorded yet.</p> : <ol className="mt-5 divide-y divide-line">
      {events.map((event) => <li key={event.id} className="py-3">
        <p className="text-sm font-semibold">{event.action.replaceAll('_', ' ')}{event.stage ? ` · ${event.stage === 'title' ? 'Title and abstract' : 'Full text'}` : ''}</p>
        <p className="mt-1 text-xs text-muted">{new Date(event.at).toLocaleString()} · {event.actor === state.me ? 'You' : state.reviewers.find((reviewer) => reviewer.id === event.actor)?.name ?? event.actor}</p>
        {event.record_id && <p className="mt-1 text-sm">{title(event.record_id) ?? 'Record'}</p>}
        {event.blinded ? <p className="mt-1 text-xs text-muted">Decision details hidden until your independent vote.</p> : <details className="mt-2"><summary className="cursor-pointer text-xs font-semibold text-brand">Inspect change</summary><div className="mt-2 grid gap-3 lg:grid-cols-2"><div><p className="text-xs font-semibold">Before</p><pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-soft p-3 text-xs">{JSON.stringify(event.before, null, 2)}</pre></div><div><p className="text-xs font-semibold">After</p><pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-soft p-3 text-xs">{JSON.stringify(event.after, null, 2)}</pre></div></div></details>}
      </li>)}
    </ol>}
  </Card>;
}
