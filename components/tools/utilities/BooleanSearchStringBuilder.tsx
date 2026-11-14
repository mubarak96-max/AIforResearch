'use client';

/** Concept rows and synonyms -> a Boolean search string for PubMed, Europe PMC or most databases, with a syntax check. Runs in the browser. */
import Link from 'next/link';
import { useEffect, useId, useMemo, useState } from 'react';
import { LuCircleAlert, LuCircleCheck, LuCircleX, LuPlus, LuSearch, LuTrash2 } from 'react-icons/lu';
import {
  DATABASES, buildSearch, buildSearchLines, checkSearch, decodeHandoff, plainKeywords,
  type Concept, type Database, type FieldScope, type SearchOptions, type SyntaxIssue,
} from '@/lib/booleanSearch';
import { splitTerms } from '@/lib/picoQuestion';
import { CopyButton } from '@/components/marketing/CopyButton';
import { btnGhost, focusRing } from '@/components/marketing/styles';

const control = `w-full rounded-xl border border-line bg-surface px-3.5 text-[15px] text-ink placeholder:text-subtle ${focusRing}`;
const MAX_ROWS = 8;

type Row = { key: number; name: string; terms: string; mesh: string };

let nextKey = 1;
const row = (name = '', terms = '', mesh = ''): Row => ({ key: nextKey++, name, terms, mesh });

const EXAMPLE: Row[] = [
  row('Population', 'nurse*, nursing staff, midwi*', 'Nurses'),
  row('Exposure', 'night shift*, shift work*, rotating shift*', 'Shift Work Schedule'),
  row('Outcome', 'burnout, emotional exhaustion, compassion fatigue', 'Burnout, Professional'),
];

function Issues({ issues, clean }: { issues: SyntaxIssue[]; clean: string }) {
  if (!issues.length) return <p className="flex items-center gap-2 text-[13.5px] text-ink-2"><LuCircleCheck className="h-4 w-4 text-green-600" aria-hidden="true" />{clean}</p>;
  return (
    <ul className="flex flex-col gap-1.5">
      {issues.map((issue) => (
        <li key={issue.message} className="flex gap-2 text-[13.5px] leading-[1.5] text-ink-2">
          {issue.level === 'error' ? <LuCircleX className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" /> : <LuCircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber" aria-hidden="true" />}
          <span><span className="sr-only">{issue.level === 'error' ? 'Error: ' : 'Warning: '}</span>{issue.message}</span>
        </li>
      ))}
    </ul>
  );
}

export function BooleanSearchStringBuilder() {
  const id = useId();
  const [rows, setRows] = useState<Row[]>(() => [row('Concept 1'), row('Concept 2')]);
  const [exclude, setExclude] = useState('');
  const [options, setOptions] = useState<SearchOptions>({ truncation: true, phrases: true, field: 'tiab' });
  const [useMesh, setUseMesh] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [own, setOwn] = useState('');

  // Concepts sent from the PICO question builder arrive in the URL hash.
  useEffect(() => {
    const read = () => {
      const concepts = decodeHandoff(window.location.hash);
      if (!concepts) return;
      setRows(concepts.map((concept) => row(concept.name, concept.terms.join(', '))));
      setNotice(`Loaded ${concepts.length} concept${concepts.length === 1 ? '' : 's'} from the PICO question builder. Add synonyms to each one before you search.`);
    };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);

  const concepts = useMemo<Concept[]>(() => {
    const list: Concept[] = rows.map((r) => ({ name: r.name, terms: splitTerms(r.terms), mesh: useMesh ? r.mesh.split(/[;\n]/).map((m) => m.trim()).filter(Boolean) : [] }));
    const not = splitTerms(exclude);
    if (not.length) list.push({ name: 'Exclude', terms: not, mesh: [], not: true });
    return list;
  }, [rows, exclude, useMesh]);

  const outputs = useMemo(() => DATABASES.map((db) => {
    const search = buildSearch(concepts, db.id, options);
    return { ...db, search, lines: buildSearchLines(concepts, db.id, options), issues: checkSearch(search) };
  }), [concepts, options]);
  const ownIssues = useMemo(() => checkSearch(own), [own]);
  const keywords = plainKeywords(concepts);

  const update = (key: number, patch: Partial<Row>) => setRows((current) => current.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <div className="flex flex-col gap-7">
      {notice && <p role="status" className="rounded-xl border border-line bg-brand-50 px-4 py-3 text-[14px] text-ink-2">{notice}</p>}

      <section aria-labelledby={`${id}-concepts`} className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id={`${id}-concepts`} className="text-[16px] font-semibold text-ink">Concepts <span className="font-normal text-muted">(OR within a concept, AND between concepts)</span></h2>
          <button type="button" onClick={() => { setRows(EXAMPLE.map((r) => row(r.name, r.terms, r.mesh))); setExclude(''); setNotice(null); }} className={`${btnGhost} h-9 px-3 text-[13.5px]`}>Load an example (illustrative)</button>
        </div>
        {rows.map((r, index) => (
          <fieldset key={r.key} className="rounded-2xl border border-line bg-surface px-4 py-4 sm:px-5">
            <legend className="sr-only">Concept {index + 1}</legend>
            <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
              <label>
                <span className="mb-1 block text-[13px] font-medium text-ink-2">Concept {index + 1} name</span>
                <input value={r.name} onChange={(event) => update(r.key, { name: event.target.value.slice(0, 80) })} placeholder="e.g. Population" className={`${control} h-10 text-[14px]`} />
              </label>
              <label>
                <span className="mb-1 block text-[13px] font-medium text-ink-2">Terms and synonyms (comma separated or one per line)</span>
                <textarea value={r.terms} onChange={(event) => update(r.key, { terms: event.target.value.slice(0, 2000) })} rows={2} placeholder="e.g. teacher*, educator*, school staff" className={`${control} py-2 text-[14px] leading-[1.5]`} />
              </label>
              {useMesh && (
                <label className="sm:col-start-2">
                  <span className="mb-1 block text-[13px] font-medium text-ink-2">MeSH headings (optional; PubMed and Europe PMC; separate with ;)</span>
                  <input value={r.mesh} onChange={(event) => update(r.key, { mesh: event.target.value.slice(0, 400) })} placeholder="e.g. Burnout, Professional" className={`${control} h-10 text-[14px]`} />
                </label>
              )}
            </div>
            {rows.length > 1 && (
              <div className="mt-3 flex justify-end">
                <button type="button" onClick={() => setRows((current) => current.filter((other) => other.key !== r.key))} className={`inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-[13px] text-ink-2 hover:bg-soft ${focusRing}`}>
                  <LuTrash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove concept {index + 1}
                </button>
              </div>
            )}
          </fieldset>
        ))}
        {rows.length < MAX_ROWS && (
          <button type="button" onClick={() => setRows((current) => [...current, row(`Concept ${current.length + 1}`)])} className={`${btnGhost} h-10 self-start px-4 text-[14px]`}>
            <LuPlus className="h-4 w-4" aria-hidden="true" /> Add a concept
          </button>
        )}

        <div className="rounded-2xl border border-line bg-surface px-4 py-4 sm:px-5">
          <label>
            <span className="mb-1 block text-[14px] font-medium text-ink">NOT: terms to exclude (optional)</span>
            <input value={exclude} onChange={(event) => setExclude(event.target.value.slice(0, 600))} aria-describedby={`${id}-not`} placeholder="e.g. rat*, mice" className={`${control} h-10 text-[14px]`} />
          </label>
          <p id={`${id}-not`} className="mt-1.5 flex gap-2 text-[13px] leading-[1.5] text-muted">
            <LuCircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber" aria-hidden="true" />
            NOT drops every record that mentions these words, including relevant studies that mention them once. Most review searches avoid it; screen records out instead.
          </p>
        </div>
      </section>

      <fieldset className="grid gap-3 rounded-2xl border border-line px-4 py-4 sm:grid-cols-2 sm:px-5">
        <legend className="px-1 text-[14px] font-medium text-ink">Options</legend>
        <label className="flex items-start gap-2.5 text-[14px] text-ink-2">
          <input type="checkbox" checked={options.truncation} onChange={(event) => setOptions((o) => ({ ...o, truncation: event.target.checked }))} className="mt-1 h-4 w-4 accent-[var(--color-brand)]" />
          <span>Keep truncation (*) where I typed it <span className="block text-[12.5px] text-muted">teach* finds teacher, teachers, teaching.</span></span>
        </label>
        <label className="flex items-start gap-2.5 text-[14px] text-ink-2">
          <input type="checkbox" checked={options.phrases} onChange={(event) => setOptions((o) => ({ ...o, phrases: event.target.checked }))} className="mt-1 h-4 w-4 accent-[var(--color-brand)]" />
          <span>Put quotes around multi-word terms <span className="block text-[12.5px] text-muted">Off: each word must appear, anywhere in the field.</span></span>
        </label>
        <label className="flex items-start gap-2.5 text-[14px] text-ink-2">
          <input type="checkbox" checked={useMesh} onChange={(event) => setUseMesh(event.target.checked)} className="mt-1 h-4 w-4 accent-[var(--color-brand)]" />
          <span>Add MeSH heading rows <span className="block text-[12.5px] text-muted">Biomedical topics; ignored by the generic form.</span></span>
        </label>
        <label className="text-[14px] text-ink-2">
          <span className="mb-1 block">Search terms in</span>
          <select value={options.field} onChange={(event) => setOptions((o) => ({ ...o, field: event.target.value as FieldScope }))} className={`${control} h-10 text-[14px]`}>
            <option value="tiab">Title and abstract</option>
            <option value="title">Title only</option>
            <option value="all">All fields (no field tag)</option>
          </select>
        </label>
      </fieldset>

      <section aria-labelledby={`${id}-out`} aria-live="polite" className="flex flex-col gap-4">
        <h2 id={`${id}-out`} className="text-[16px] font-semibold text-ink">Search strings</h2>
        {outputs[0].search ? outputs.map((output) => (
          <div key={output.id} className="rounded-2xl border border-line bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-2 px-4 py-2.5 sm:px-5">
              <h3 className="text-[15px] font-semibold text-ink">{output.name}</h3>
              <CopyButton text={output.search} label={`Copy ${output.name.replace(/ \(.*\)$/, '')}`} />
            </div>
            <div className="flex flex-col gap-3 px-4 py-3 sm:px-5">
              <pre className="whitespace-pre-wrap break-words rounded-lg bg-soft px-3 py-2.5 font-mono text-[13px] leading-[1.6] text-ink [overflow-wrap:anywhere]">{output.search}</pre>
              <p className="text-[12.5px] text-muted">{output.note}</p>
              <Issues issues={output.issues} clean="No syntax problems found." />
              {output.lines.length > 2 && (
                <details className="text-[13.5px]">
                  <summary className={`cursor-pointer rounded text-ink-2 ${focusRing}`}>Numbered lines for your search log</summary>
                  <div className="mt-2 flex items-start gap-2">
                    <pre className="min-w-0 flex-1 whitespace-pre-wrap break-words rounded-lg bg-soft px-3 py-2.5 font-mono text-[12.5px] leading-[1.6] text-ink [overflow-wrap:anywhere]">{output.lines.join('\n')}</pre>
                    <CopyButton text={output.lines.join('\n')} label="Copy lines" />
                  </div>
                </details>
              )}
            </div>
          </div>
        )) : <p className="rounded-2xl border border-dashed border-line px-5 py-6 text-center text-[14px] text-muted">Add terms to at least one concept to see the search strings.</p>}

        {keywords && (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[14px] text-ink-2">
            <Link href={`/papers?q=${encodeURIComponent(keywords)}`} className={`${btnGhost} h-10 px-4 text-[14px]`}><LuSearch className="h-4 w-4" aria-hidden="true" /> Search these terms in AI for Research</Link>
            <span className="text-[13px] text-muted">Runs the main term of each concept as a keyword search across 250M+ scholarly works. Free account.</span>
          </p>
        )}
      </section>

      <section aria-labelledby={`${id}-own`} className="flex flex-col gap-3">
        <h2 id={`${id}-own`} className="text-[16px] font-semibold text-ink">Check any search string</h2>
        <label>
          <span className="mb-1 block text-[13.5px] text-ink-2">Paste a string you wrote or edited</span>
          <textarea value={own} onChange={(event) => setOwn(event.target.value.slice(0, 20000))} rows={4} placeholder='("night shift"[tiab] OR "shift work*"[tiab]) AND burnout[tiab]' className={`${control} py-2.5 font-mono text-[13px] leading-[1.6]`} />
        </label>
        <div aria-live="polite">{own.trim() && <Issues issues={ownIssues} clean="No syntax problems found." />}</div>
      </section>

      <p className="text-[13px] leading-[1.5] text-muted">
        Start from a question with the <Link href="/tools/pico-question-builder" className="underline hover:text-ink">PICO question builder</Link>. For MeSH, testing and translating a search between databases, read the <Link href="/blog/systematic-review-search-strategy" className="underline hover:text-ink">systematic review search strategy guide</Link>.
      </p>
    </div>
  );
}
