/**
 * The authorship record: how a document was written. While someone edits, the editor sends a
 * running summary of their session every minute or so (time spent writing, characters typed,
 * pasted from outside, pasted from inside the document, accepted from WriteOrbit AI, deleted,
 * and when each large paste happened, with a hash of the pasted text, never the text). With the
 * daily snapshots in the version history (ensureDailyVersion) this becomes a report the writer
 * can share with a teacher, supervisor or client.
 *
 *   documents/{id}/writing_sessions/{sessionId}  user_id, user_name, started_at, last_at, active_seconds,
 *                                                typed, pasted_external, pasted_internal, ai_inserted, deleted, pastes[]
 *   authorship_reports/{token}                   user_id, document_id, payload, hash, created_at
 *
 * The counts come from the writer's browser, so the record is evidence of how the work grew,
 * not proof: the report says so. A frozen report is stored with a SHA-256 of its contents, so
 * the verification page can show that what it displays is what was issued.
 */
import { createHash, randomBytes } from 'node:crypto';
import { HTTPException } from 'hono/http-exception';
import { C, col, db, row, rows } from '../firebase.js';
import type { AuthUser } from '../auth.js';
import { displayName, type DocumentRow } from './access.js';
import { documentRef } from './documents.js';
import { listVersions } from './versions.js';

export type Paste = { at: number; chars: number; hash: string; internal: boolean };

export type SessionInput = {
  session_id: string;
  started_at: number;
  last_at: number;
  active_seconds: number;
  typed: number;
  pasted_external: number;
  pasted_internal: number;
  ai_inserted: number;
  deleted: number;
  pastes: Paste[];
};

export type WritingSession = Omit<SessionInput, 'session_id'> & { id: string; user_id: string; user_name: string; updated_at: Date };

/** A paste at least this long is listed in the report (shorter ones only count). */
export const LARGE_PASTE = 200;
const MAX_PASTES = 300;
const COUNTERS = ['active_seconds', 'typed', 'pasted_external', 'pasted_internal', 'ai_inserted', 'deleted'] as const;

export const sessionsRef = (documentId: string) => documentRef(documentId).collection(C.writingSessions);
export const reportsRef = () => col(C.authorshipReports);

/**
 * Saves a session's running totals. The browser sends totals, not increments, so a retried or
 * repeated send changes nothing; totals never go down; a session id belongs to one person.
 */
export async function recordSession(document: DocumentRow, user: AuthUser, input: SessionInput) {
  if (!/^[\w-]{8,64}$/.test(input.session_id)) throw new HTTPException(422, { message: 'Invalid session.' });
  const ref = sessionsRef(document.id).doc(input.session_id);
  const now = Date.now();
  // Clocks drift; a session cannot claim to have started before the document existed or end in the future.
  const created = new Date(document.created_at ?? 0).getTime() || 0;
  const startedAt = Math.max(created, Math.min(input.started_at, now));
  const lastAt = Math.max(startedAt, Math.min(input.last_at, now));
  await db().runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    const current = snapshot.exists ? (snapshot.data() as Omit<WritingSession, 'id'>) : null;
    if (current && current.user_id !== user.id) throw new HTTPException(409, { message: 'Session belongs to someone else.' });
    const next: Record<string, unknown> = {
      user_id: user.id,
      user_name: displayName(user),
      started_at: current ? Math.min(current.started_at, startedAt) : startedAt,
      last_at: current ? Math.max(current.last_at, lastAt) : lastAt,
      updated_at: new Date(),
    };
    // Active time cannot exceed the session's length (plus a minute of slack).
    const span = (Number(next.last_at) - Number(next.started_at)) / 1000 + 60;
    for (const key of COUNTERS) {
      const sent = Math.max(0, Math.round(Number(input[key]) || 0));
      next[key] = Math.max(current?.[key] ?? 0, key === 'active_seconds' ? Math.min(sent, span) : sent);
    }
    const pastes = new Map<string, Paste>();
    for (const paste of [...(current?.pastes ?? []), ...input.pastes]) {
      if (!paste || typeof paste.hash !== 'string' || paste.chars < LARGE_PASTE) continue;
      pastes.set(`${paste.at}:${paste.hash}`, { at: Number(paste.at), chars: Math.round(paste.chars), hash: paste.hash.slice(0, 64), internal: Boolean(paste.internal) });
    }
    next.pastes = [...pastes.values()].sort((a, b) => a.at - b.at).slice(-MAX_PASTES);
    tx.set(ref, next);
  });
}

export async function listSessions(documentId: string): Promise<WritingSession[]> {
  return rows<WritingSession>(await sessionsRef(documentId).orderBy('started_at', 'asc').limit(5000).get());
}

export type Totals = { active_seconds: number; typed: number; pasted_external: number; pasted_internal: number; ai_inserted: number; deleted: number };

const zero = (): Totals => ({ active_seconds: 0, typed: 0, pasted_external: 0, pasted_internal: 0, ai_inserted: 0, deleted: 0 });

function addTo(totals: Totals, session: Totals) {
  for (const key of COUNTERS) totals[key] += Number(session[key]) || 0;
}

/** Shares of the text that was added, by how it got there (0–100, rounded; they sum to 100). */
export function shares(totals: Totals) {
  const added = totals.typed + totals.pasted_external + totals.pasted_internal + totals.ai_inserted;
  if (!added) return { typed: 0, pasted_external: 0, pasted_internal: 0, ai_inserted: 0 };
  const raw = {
    typed: (totals.typed / added) * 100,
    pasted_external: (totals.pasted_external / added) * 100,
    pasted_internal: (totals.pasted_internal / added) * 100,
    ai_inserted: (totals.ai_inserted / added) * 100,
  };
  // Largest remainder, so the four always add up to exactly 100.
  const keys = Object.keys(raw) as (keyof typeof raw)[];
  const floors = Object.fromEntries(keys.map((key) => [key, Math.floor(raw[key])])) as typeof raw;
  let left = 100 - keys.reduce((sum, key) => sum + floors[key], 0);
  for (const key of [...keys].sort((a, b) => (raw[b] - floors[b]) - (raw[a] - floors[a]))) {
    if (left <= 0) break;
    floors[key]++;
    left--;
  }
  return floors;
}

export type AuthorshipPayload = {
  version: 1;
  document: { id: string; title: string; word_count: number };
  author: { name: string };
  generated_at: string;
  recording_since: string | null;
  last_activity: string | null;
  totals: Totals;
  shares: ReturnType<typeof shares>;
  sessions: number;
  writing_days: number;
  /** Per day: minutes written and characters added by each route. */
  days: { date: string; minutes: number; typed: number; pasted_external: number; pasted_internal: number; ai_inserted: number }[];
  /** Words in the document at each daily snapshot and saved version. */
  growth: { at: string; words: number; reason: string }[];
  large_pastes: { at: string; chars: number; internal: boolean }[];
  /** Other people's share of the text added (shared documents), with no names. */
  others: { people: number; share_of_added: number };
};

/** The writer's authorship record for one document, as the report shows it. */
export async function buildAuthorship(document: DocumentRow, user: AuthUser): Promise<AuthorshipPayload> {
  const [sessions, versions] = await Promise.all([listSessions(document.id), listVersions(document.id, 1000)]);
  const mine = sessions.filter((session) => session.user_id === user.id);
  const theirs = sessions.filter((session) => session.user_id !== user.id);
  const totals = zero();
  mine.forEach((session) => addTo(totals, session));
  const others = zero();
  theirs.forEach((session) => addTo(others, session));

  const byDay = new Map<string, AuthorshipPayload['days'][number]>();
  for (const session of mine) {
    const date = new Date(session.started_at).toISOString().slice(0, 10);
    const day = byDay.get(date) ?? { date, minutes: 0, typed: 0, pasted_external: 0, pasted_internal: 0, ai_inserted: 0 };
    day.minutes += Math.round((session.active_seconds || 0) / 60);
    day.typed += session.typed || 0;
    day.pasted_external += session.pasted_external || 0;
    day.pasted_internal += session.pasted_internal || 0;
    day.ai_inserted += session.ai_inserted || 0;
    byDay.set(date, day);
  }

  const added = (t: Totals) => t.typed + t.pasted_external + t.pasted_internal + t.ai_inserted;
  const everyone = added(totals) + added(others);
  return {
    version: 1,
    document: { id: document.id, title: document.title || 'Untitled document', word_count: document.word_count ?? 0 },
    author: { name: displayName(user) },
    generated_at: new Date().toISOString(),
    recording_since: mine.length ? new Date(Math.min(...mine.map((session) => session.started_at))).toISOString() : null,
    last_activity: mine.length ? new Date(Math.max(...mine.map((session) => session.last_at))).toISOString() : null,
    totals,
    shares: shares(totals),
    sessions: mine.length,
    writing_days: byDay.size,
    days: [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date)),
    growth: versions
      .filter((version) => version.daily_key || version.label || version.reason !== 'auto')
      .map((version) => ({ at: new Date(version.created_at).toISOString(), words: version.word_count ?? 0, reason: version.daily_key ? 'daily' : version.reason }))
      .reverse(),
    large_pastes: mine
      .flatMap((session) => session.pastes ?? [])
      .sort((a, b) => a.at - b.at)
      .map((paste) => ({ at: new Date(paste.at).toISOString(), chars: paste.chars, internal: paste.internal })),
    others: { people: new Set(theirs.map((session) => session.user_id)).size, share_of_added: everyone ? Math.round((added(others) / everyone) * 100) : 0 },
  };
}

/** Same JSON for the same content: keys sorted at every level. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

export const reportHash = (payload: unknown) => createHash('sha256').update(canonicalJson(payload)).digest('hex');

type ReportDoc = { id: string; user_id: string; document_id: string; payload: AuthorshipPayload; hash: string; created_at: Date };

/** Freezes the current record as a shareable report; the token is its unguessable public id. */
export async function createReport(document: DocumentRow, user: AuthUser) {
  const payload = await buildAuthorship(document, user);
  if (!payload.sessions) throw new HTTPException(422, { message: 'There is no writing recorded for you in this document yet.' });
  const id = randomBytes(15).toString('base64url');
  const hash = reportHash(payload);
  await reportsRef().doc(id).set({ user_id: user.id, document_id: document.id, payload, hash, created_at: new Date() });
  return { id, hash, created_at: new Date().toISOString() };
}

export async function listReports(documentId: string, userId: string) {
  const found = rows<ReportDoc>(await reportsRef().where('user_id', '==', userId).where('document_id', '==', documentId).get());
  return found
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((report) => ({ id: report.id, hash: report.hash, created_at: new Date(report.created_at).toISOString(), words: report.payload.document.word_count }));
}

export async function deleteReport(reportId: string, userId: string) {
  if (!/^[\w-]{10,40}$/.test(reportId)) throw new HTTPException(404, { message: 'Report not found' });
  const report = row<ReportDoc>(await reportsRef().doc(reportId).get());
  if (!report || report.user_id !== userId) throw new HTTPException(404, { message: 'Report not found' });
  await reportsRef().doc(reportId).delete();
}

/** The public view of a report: its contents and whether they still match the hash issued. */
export async function verifyReport(reportId: string) {
  if (!/^[\w-]{10,40}$/.test(reportId)) return null;
  const report = row<ReportDoc>(await reportsRef().doc(reportId).get());
  if (!report) return null;
  const valid = reportHash(report.payload) === report.hash;
  // The document's own id stays private: the link opens the report, never the document.
  const payload = { ...report.payload, document: { ...report.payload.document, id: '' } };
  return { id: report.id, payload, hash: report.hash, valid, created_at: new Date(report.created_at).toISOString() };
}
