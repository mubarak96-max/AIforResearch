'use client';

/**
 * Moving work between workspaces: a research result opens in the editor as a document with
 * live citations, and the next workspace (literature review, gaps, slides…) reads the result it
 * was started from (`?from=<task id>`, loadFromTask).
 */
import { api } from '@/lib/session';
import { openInEditor } from '@/components/tools/editorHandoff';
import { EDITOR_STYLE, editorHtml, type ResultSource } from '@/components/tools/toolOutput';
import type { Source } from './parts';

export function toResultSource(source: Source): ResultSource {
  return {
    marker: source.marker, id: source.id, title: source.title, authors: source.authors, moreAuthors: source.more_authors, year: source.year,
    venue: source.venue, volume: null, issue: null, firstPage: null, lastPage: null, doi: source.doi, type: source.kind === 'web' ? 'webpage' : 'article',
  };
}

/** Opens Markdown with [S1] markers as an editor document whose citations are real. */
export function openResultInEditor(title: string, markdown: string, sources: Source[], style: 'apa' | 'mla' | 'chicago' | 'harvard' = 'apa') {
  const cited = sources.map(toResultSource);
  openInEditor({ title, html: editorHtml(markdown, cited, style), markdown, style: EDITOR_STYLE[style] });
}

/** Home hands its question to Deep Research in sessionStorage under this key, then opens ?start=1. */
export const PENDING_KEY = 'afr-pending-research';

export type TaskRecord = {
  id: string; kind: string; module: string | null; title: string; status: 'running' | 'done' | 'failed'; credits: number; error: string | null;
  inputs: Record<string, any>; result: Record<string, any> | null; created_at: string; updated_at: string; project_id: string | null; starred: boolean;
};

/** The task a workspace was opened from (`?from=`): its question or title and its sources. */
export async function loadFromTask(id: string | null | undefined): Promise<{ topic: string; sources: Source[]; markdown: string; task: TaskRecord } | null> {
  if (!id) return null;
  const task = await api<TaskRecord>(`/api/history/${encodeURIComponent(id)}`).catch(() => null);
  if (!task) return null;
  const sources = ((task.result?.sources ?? task.result?.all_sources ?? []) as Source[]);
  return { topic: String(task.inputs?.question ?? task.inputs?.topic ?? task.title), sources, markdown: String(task.result?.markdown ?? ''), task };
}

/** Where each follow-on tool lives, with the task it continues from. */
export function followOnLinks(taskId: string) {
  const from = `from=${encodeURIComponent(taskId)}`;
  return [
    { label: 'Write a literature review', href: `/write?module=literature-review&${from}` },
    { label: 'Write a paper', href: `/write?module=paper&${from}` },
    { label: 'Find gaps', href: `/thesis?module=gaps&${from}` },
    { label: 'Thesis outline', href: `/thesis?module=outline&${from}` },
    { label: 'Write abstract', href: `/write?module=abstract&${from}` },
    { label: 'Check citations', href: `/reviewer?module=citations&${from}` },
    { label: 'Systematic review', href: `/systematic-review?${from}` },
    { label: 'Make slides', href: `/slides?${from}` },
  ];
}

/** Where each kind of task reopens. */
export function taskHref(task: Pick<TaskRecord, 'id' | 'kind' | 'module'>): string {
  const id = encodeURIComponent(task.id);
  switch (task.kind) {
    case 'research': return `/deep-research?task=${id}`;
    case 'review': case 'claim_check': case 'citation_check': return `/reviewer?task=${id}`;
    case 'thesis': return `/thesis?task=${id}`;
    case 'proposal': return `/proposals?task=${id}`;
    case 'writing': return `/write?task=${id}`;
    case 'systematic_review': return `/systematic-review?task=${id}`;
    case 'data': return `/data-lab?task=${id}`;
    case 'citation_map': return `/citation-map?task=${id}`;
    case 'landscape': return `/landscape?task=${id}`;
    case 'slides': return `/slides?task=${id}`;
    default: return `/history?task=${id}`;
  }
}

export const KIND_LABELS: Record<string, string> = {
  research: 'Deep Research', papers: 'Find Papers', review: 'Reviewer', claim_check: 'Claim check', citation_check: 'Citation check', thesis: 'Thesis Suite',
  proposal: 'Proposal Studio', writing: 'Writing Studio', systematic_review: 'Systematic Review', data: 'Data Lab', citation_map: 'Citation Map',
  landscape: 'Landscape', slides: 'Slides', tool: 'Tool', chat_pdf: 'Chat with PDF',
};

