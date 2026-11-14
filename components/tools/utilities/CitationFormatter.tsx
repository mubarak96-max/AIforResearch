'use client';

/**
 * The citation formatter: paste a reference list in any style, look each entry up
 * (GET /api/tools/cite, two at a time), and re-format the matches in the chosen CSL style with
 * citation-js. Weak matches are flagged for the user to accept or reject; unmatched entries stay as pasted.
 */
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LuCheck, LuLoaderCircle, LuX } from 'react-icons/lu';
import { api } from '@/lib/session';
import { MAX_REFERENCES, bestMatch, findDoi, lookupQuery, splitReferences, type MatchStatus } from '@/lib/referenceMatch';
import { btnPrimary, focusRing } from '@/components/marketing/styles';
import { StylePicker, control, copyRich, format, textOf, type Csl } from '../CitationGenerator';

type Status = 'waiting' | 'looking' | MatchStatus | 'error';
type Entry = { id: string; line: string; status: Status; item: Csl | null; accepted: boolean; error?: string };

const small = `inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-line px-2.5 text-[13px] text-ink-2 hover:bg-soft disabled:opacity-50 ${focusRing}`;

const BADGE: Record<Status, { label: string; className: string }> = {
  waiting: { label: 'Waiting', className: 'bg-soft text-muted' },
  looking: { label: 'Looking up', className: 'bg-soft text-muted' },
  matched: { label: 'Matched', className: 'bg-emerald-100 text-emerald-800' },
  check: { label: 'Check this match', className: 'bg-amber-100 text-amber-900' },
  'not-found': { label: 'Not found', className: 'bg-rose-100 text-rose-800' },
  error: { label: 'Lookup failed', className: 'bg-rose-100 text-rose-800' },
};

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const EXAMPLE = `Ioannidis JP. Why most published research findings are false. PLoS Med. 2005;2(8):e124.

Open Science Collaboration. (2015). Estimating the reproducibility of psychological science. Science, 349(6251), aac4716. https://doi.org/10.1126/science.aac4716`;

export function CitationFormatter() {
  const [raw, setRaw] = useState('');
  const [style, setStyle] = useState('apa');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [keepUnmatched, setKeepUnmatched] = useState(true);
  const [formatted, setFormatted] = useState<Record<string, string>>({});
  const [numeric, setNumeric] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const stop = useRef(false);

  const pasted = useMemo(() => splitReferences(raw), [raw]);
  const update = (id: string, patch: Partial<Entry>) => setEntries((current) => current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));

  async function lookUp() {
    const lines = pasted.slice(0, MAX_REFERENCES);
    setNotice(pasted.length > MAX_REFERENCES ? `Only the first ${MAX_REFERENCES} references are looked up. Run the rest separately.` : null);
    const fresh: Entry[] = lines.map((line, index) => ({ id: `ref-${index}`, line, status: 'waiting', item: null, accepted: false }));
    setEntries(fresh);
    setRunning(true);
    stop.current = false;
    let next = 0;
    // Two lookups at a time keeps the list moving without flooding the search.
    const worker = async () => {
      while (!stop.current && next < fresh.length) {
        const entry = fresh[next++];
        update(entry.id, { status: 'looking' });
        try {
          const query = lookupQuery(entry.line);
          const { results } = await api<{ results: Csl[] }>(`/api/tools/cite?q=${encodeURIComponent(query)}`);
          const { item, status } = bestMatch(entry.line, results, findDoi(entry.line));
          update(entry.id, { status, item: item ? { ...item, id: entry.id } : null, accepted: status === 'matched' });
        } catch (caught) {
          const status = (caught as { status?: number }).status;
          update(entry.id, { status: 'error', error: (caught as Error).message });
          if (status === 429) { stop.current = true; setNotice((caught as Error).message || 'Too many lookups. Try again later.'); }
        }
      }
    };
    await Promise.all([worker(), worker()]);
    setEntries((current) => current.map((entry) => (entry.status === 'waiting' || entry.status === 'looking' ? { ...entry, status: 'not-found' } : entry)));
    setRunning(false);
  }

  // Format every entry that has a candidate, so a "check" can be previewed before it is accepted.
  const candidateKey = entries.filter((entry) => entry.item).map((entry) => entry.id).join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const candidates = useMemo(() => entries.filter((entry) => entry.item).map((entry) => entry.item as Csl), [candidateKey]);
  useEffect(() => {
    if (!candidates.length) { setFormatted({}); return; }
    let cancelled = false;
    format(candidates, style)
      .then((result) => { if (!cancelled && result) { setFormatted(Object.fromEntries(result.entries.map((entry) => [entry.id, entry.html]))); setNumeric(result.numeric); } })
      .catch(() => !cancelled && setFormatted({}));
    return () => { cancelled = true; };
  }, [candidates, style]);

  const output = useMemo(() => {
    const rows = entries
      .map((entry) => {
        const html = entry.accepted ? formatted[entry.id] : undefined;
        if (html) return { id: entry.id, html, text: textOf(html), asPasted: false };
        if (!keepUnmatched || entry.status === 'waiting' || entry.status === 'looking') return null;
        return { id: entry.id, html: `<div class="csl-entry">${escapeHtml(entry.line)}</div>`, text: entry.line, asPasted: true };
      })
      .filter((row): row is { id: string; html: string; text: string; asPasted: boolean } => Boolean(row));
    return numeric ? rows : rows.sort((a, b) => a.text.localeCompare(b.text));
  }, [entries, formatted, keepUnmatched, numeric]);

  const counts = useMemo(() => {
    const by: Partial<Record<Status, number>> = {};
    for (const entry of entries) by[entry.status] = (by[entry.status] ?? 0) + 1;
    return by;
  }, [entries]);
  const done = entries.filter((entry) => entry.status !== 'waiting' && entry.status !== 'looking').length;

  const flash = (key: string) => { setCopied(key); window.setTimeout(() => setCopied(null), 1600); };

  return (
    <div className="flex flex-col gap-6">
      <StylePicker value={style} onChange={setStyle} />

      <div>
        <label htmlFor="cf-input" className="mb-1.5 block text-[14px] font-medium text-ink">Your reference list</label>
        <textarea id="cf-input" aria-describedby="cf-help" value={raw} onChange={(event) => setRaw(event.target.value.slice(0, 60000))} rows={9}
          placeholder={EXAMPLE} className={`${control} py-3 font-serif leading-[1.55]`} />
        <p id="cf-help" className="mt-1 text-[12.5px] text-muted">
          One reference per line, or a blank line between references if they wrap. Any style works. Up to {MAX_REFERENCES} at a time.
          {pasted.length > 0 && <> <span className="text-ink-2">{pasted.length} found.</span></>}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={lookUp} disabled={running || pasted.length === 0} className={`${btnPrimary} h-11 rounded-[10px] px-5 text-[15px]`}>
            {running ? <><LuLoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Looking up…</> : 'Look up and reformat'}
          </button>
          {running && <button type="button" onClick={() => { stop.current = true; }} className={`${small} h-11 px-4`}>Stop</button>}
          {!raw && <button type="button" onClick={() => setRaw(EXAMPLE)} className={`${small} h-11 px-4`}>Try an example</button>}
        </div>
      </div>

      {notice && <p role="alert" className="text-[14px] text-amber-800">{notice}</p>}

      {entries.length > 0 && (
        <section aria-labelledby="cf-matches" className="rounded-2xl border border-line bg-surface">
          <div className="border-b border-line-2 px-5 py-3">
            <h2 id="cf-matches" className="text-[15px] font-semibold text-ink">Matches</h2>
            <p aria-live="polite" className="mt-0.5 text-[13px] text-muted">
              {running ? `Looked up ${done} of ${entries.length}.` : `${counts.matched ?? 0} matched, ${counts.check ?? 0} to check, ${(counts['not-found'] ?? 0) + (counts.error ?? 0)} not found.`}
            </p>
          </div>
          <ol className="divide-y divide-line-2">
            {entries.map((entry, index) => (
              <li key={entry.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] text-subtle">{index + 1}.</span>
                  <span className={`rounded-md px-2 py-0.5 text-[12.5px] font-medium ${BADGE[entry.status].className}`}>{BADGE[entry.status].label}</span>
                  {entry.item && entry.status !== 'error' && (
                    entry.accepted
                      ? <span className="inline-flex items-center gap-1 text-[12.5px] text-emerald-800"><LuCheck className="h-3.5 w-3.5" aria-hidden="true" />Used</span>
                      : <span className="text-[12.5px] text-muted">Not used</span>
                  )}
                </div>
                <p className="mt-2 text-[13px] leading-[1.5] text-muted [overflow-wrap:anywhere]"><span className="sr-only">You pasted: </span>{entry.line}</p>
                {entry.item && (
                  <div className="mt-2 rounded-lg bg-soft px-3 py-2">
                    <p className="sr-only">Reformatted:</p>
                    <div className="pl-6 -indent-6 font-serif text-[15px] leading-[1.6] text-ink [overflow-wrap:anywhere]" dangerouslySetInnerHTML={{ __html: formatted[entry.id] || escapeHtml(String(entry.item.title)) }} />
                  </div>
                )}
                {entry.status === 'not-found' && <p className="mt-2 text-[13px] text-ink-2">No close match. Add the DOI to the line and run it again, or use the <Link href="/tools/citation-generator" className="underline hover:text-ink">citation generator</Link> to enter it by hand.</p>}
                {entry.status === 'error' && <p className="mt-2 text-[13px] text-ink-2">{entry.error || 'The lookup failed.'} Run it again in a minute.</p>}
                {entry.item && (
                  <div className="mt-2 flex gap-2">
                    <button type="button" onClick={() => update(entry.id, { accepted: true })} disabled={entry.accepted} aria-label={`Use match for reference ${index + 1}`} className={small}><LuCheck className="h-3.5 w-3.5" aria-hidden="true" />Use match</button>
                    <button type="button" onClick={() => update(entry.id, { accepted: false })} disabled={!entry.accepted} aria-label={`Reject match for reference ${index + 1}`} className={small}><LuX className="h-3.5 w-3.5" aria-hidden="true" />Reject</button>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {entries.length > 0 && (
        <section aria-labelledby="cf-output" className="rounded-2xl border border-line bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-2 px-5 py-3">
            <h2 id="cf-output" className="text-[15px] font-semibold text-ink">Reformatted list <span className="font-normal text-muted">({output.length})</span></h2>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={!output.length} onClick={async () => { if (await copyRich(output.map((row) => row.html).join(''), output.map((row) => row.text).join('\n'))) flash('rich'); }}
                className={`inline-flex h-8 items-center rounded-lg bg-brand px-2.5 text-[13px] font-medium text-on-brand hover:bg-brand-600 disabled:opacity-50 ${focusRing}`}>{copied === 'rich' ? 'Copied' : 'Copy (with italics)'}</button>
              <button type="button" disabled={!output.length} onClick={async () => { try { await navigator.clipboard.writeText(output.map((row) => row.text).join('\n')); flash('text'); } catch { /* blocked */ } }}
                className={small}>{copied === 'text' ? 'Copied' : 'Copy plain text'}</button>
            </div>
          </div>
          <label className="flex items-center gap-2 px-5 pt-3 text-[13.5px] text-ink-2">
            <input type="checkbox" checked={keepUnmatched} onChange={(event) => setKeepUnmatched(event.target.checked)} className={`size-4 rounded border-line ${focusRing}`} />
            Keep unmatched references as pasted (marked below)
          </label>
          <div aria-live="polite">
            {output.length === 0 ? (
              <p className="px-5 py-6 text-center text-[14px] text-muted">{running ? 'Matches appear here as they are found.' : 'Nothing to show yet.'}</p>
            ) : (
              <ol className="flex flex-col gap-3 px-5 py-4">
                {output.map((row) => (
                  <li key={row.id}>
                    <div className={`pl-8 -indent-8 font-serif text-[15.5px] leading-[1.6] [overflow-wrap:anywhere] ${row.asPasted ? 'text-ink-2' : 'text-ink'}`} dangerouslySetInnerHTML={{ __html: row.html }} />
                    {row.asPasted && <p className="mt-0.5 pl-8 text-[12px] font-medium text-amber-900">Not matched: kept as pasted</p>}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      )}
      <p className="text-[13px] text-muted">Each reference is looked up in a scholarly index; nothing is saved. Check every reference against the source, especially matches marked “Check”.</p>
    </div>
  );
}
