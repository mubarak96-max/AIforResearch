'use client';

/** Browser helpers for the Systematic Review workspace: the same decision rule as the server, and downloads. */
import { authHeaders } from '@/lib/session';
import type { Decision, SrRecord, Stage, StageState } from './types';

/** A record's state at a stage (kept in step with lib/server/lib/systematicReviewStats.ts stageState). */
export function stageStateOf(record: SrRecord, stage: Stage, setup: { dual: boolean; aiSecond: boolean }): StageState {
  const resolved = record.resolved?.[stage];
  if (resolved) return { status: 'final', decision: resolved.decision, reason: resolved.reason ?? null };
  const human = Object.values(record.votes?.[stage] ?? {});
  const votes = [...human];
  const ai = record.ai?.[stage];
  if (setup.aiSecond && ai) votes.push({ decision: ai.decision, reason: ai.reason });
  if (!votes.length) return { status: 'pending', decision: null, reason: null };
  if (!setup.dual) {
    const vote = human[0] ?? votes[0];
    return { status: 'final', decision: vote.decision, reason: vote.reason ?? null };
  }
  if (votes.length < 2) return { status: 'pending', decision: null, reason: null };
  const first = votes[0].decision;
  if (votes.every((vote) => vote.decision === first)) return { status: 'final', decision: first, reason: votes.find((vote) => vote.reason)?.reason ?? null };
  return { status: 'conflict', decision: null, reason: null };
}

export const passes = (state: StageState | null) => Boolean(state && state.status === 'final' && (state.decision === 'include' || state.decision === 'maybe'));

/** Recomputes a record's states after a local change. */
export function withStates(record: SrRecord, setup: { dual: boolean; aiSecond: boolean }): SrRecord {
  const title = stageStateOf(record, 'title', setup);
  return { ...record, title_state: title, full_state: passes(title) ? stageStateOf(record, 'full', setup) : null };
}

export function setVote(record: SrRecord, stage: Stage, me: string, decision: Decision | null, reason: string | null): SrRecord {
  const stageVotes = { ...(record.votes?.[stage] ?? {}) };
  if (decision) stageVotes[me] = { decision, reason: decision === 'exclude' ? reason : null };
  else delete stageVotes[me];
  return { ...record, votes: { ...record.votes, [stage]: stageVotes } };
}

/** Downloads an API file (the request needs the sign-in token, so a plain link would not work). */
export async function downloadFile(path: string, fallbackName: string) {
  const response = await fetch(path, { headers: await authHeaders() });
  if (!response.ok) throw new Error('The export could not be made. Try again.');
  const name = response.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1] ?? fallbackName;
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
