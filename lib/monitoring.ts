export type MonitorSource = { key: string; title: string; doi: string | null; url: string | null; published: string | null; summary: string; retracted: boolean; notices: { doi: string; type: string; date: string | null }[]; providers: string[] };
export type MonitorChange = { kind: 'added' | 'changed' | 'not_returned'; key: string; before: MonitorSource | null; after: MonitorSource | null };
export type MonitorRun = {
  id: string; at: string; status: 'complete' | 'partial' | 'failed'; baseline: boolean; changes: MonitorChange[]; result_count: number;
  search?: { query: string; groups: string[]; filters: ResearchMonitor['filters']; tracked_dois: string[]; retraction_checks: boolean; revision: number };
  errors: string[]; counts: Record<string, number>; /** 'not_needed': a baseline or a check with no changes and no errors; it never waits for review. */
  review: { status: 'pending' | 'reviewed' | 'not_needed'; by: string | null; at: string | null; note: string };
};
export type ResearchMonitor = {
  id: string; owner_user_id: string; project_id: string | null; title: string; query: string; groups: string[];
  filters: { fromYear?: number; toYear?: number; openAccess?: boolean; excludePreprints?: boolean; excludeRetracted?: boolean };
  interval_hours: 24 | 168 | 720; tracked_dois: string[]; retraction_checks: boolean; enabled: boolean; next_run_at: string;
  last_run_at: string | null; last_error: string | null; failures: number; revision: number; snapshot: MonitorSource[];
  pending_runs: number; lease: string | null; lease_until: string | null; created_at: string; updated_at: string; role?: 'owner' | 'edit' | 'comment' | 'view';
};

/** Compare evidence metadata, excluding volatile citation counts and provider order. */
function fingerprint(source: MonitorSource): string {
  return JSON.stringify([source.title, source.doi, source.url, source.published, source.summary, source.retracted, [...source.notices].sort((a, b) => `${a.doi}:${a.type}`.localeCompare(`${b.doi}:${b.type}`))]);
}
export function diffMonitorSnapshots(previous: MonitorSource[], next: MonitorSource[], allowMissing = true): MonitorChange[] {
  const before = new Map(previous.map((item) => [item.key, item]));
  const after = new Map(next.map((item) => [item.key, item]));
  const changes: MonitorChange[] = [];
  for (const source of next) {
    const prior = before.get(source.key);
    if (!prior) changes.push({ kind: 'added', key: source.key, before: null, after: source });
    else if (fingerprint(prior) !== fingerprint(source)) changes.push({ kind: 'changed', key: source.key, before: prior, after: source });
  }
  if (allowMissing) for (const source of previous) if (!after.has(source.key)) changes.push({ kind: 'not_returned', key: source.key, before: source, after: null });
  return changes;
}
export function nextMonitorRun(intervalHours: number, now = new Date(), failures = 0): string {
  const hours = failures > 0 ? Math.min(intervalHours, Math.pow(2, Math.min(failures - 1, 6))) : intervalHours;
  return new Date(now.getTime() + hours * 3600000).toISOString();
}
export function monitorRunMarkdown(title: string, run: MonitorRun): string {
  const out = [`# ${title}: evidence update`, '', `Checked: ${run.at}`, `Status: ${run.status}. Returned sample: ${run.result_count} sources.`, '', 'These are changes to sampled search results, not a complete record of publication or withdrawal. Review evidence before changing approved conclusions.', ''];
  if (run.search) out.push(`Search: ${run.search.query}`, `Source groups: ${run.search.groups.join(', ')}`, `Filters: ${JSON.stringify(run.search.filters)}`, `Saved search revision: ${run.search.revision}`, '');
  if (run.errors.length) out.push('## Coverage limits', '', ...run.errors.map((e) => `- ${e}`), '');
  for (const change of run.changes) {
    const source = change.after || change.before!;
    out.push(`## ${change.kind === 'added' ? 'New to results' : change.kind === 'changed' ? 'Changed metadata or notice' : 'Not returned in this sample'}: ${source.title}`, '', source.url || source.doi || source.key, '', source.summary, '');
    if (change.before && change.after) out.push(`Previous summary: ${change.before.summary}`, '');
    for (const notice of source.notices) out.push(`- ${notice.type}: ${notice.doi}${notice.date ? ` (${notice.date})` : ''}`);
  }
  if (run.review.note) out.push('## Reviewer decision', '', run.review.note, '');
  return out.join('\n');
}
