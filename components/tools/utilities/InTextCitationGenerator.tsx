'use client';

/**
 * The in-text citation generator: authors, year and a page in; parenthetical and narrative
 * citations in APA 7, MLA 9, Chicago author-date, Harvard and a numeric style out. Pure logic in
 * lib/inTextCitation.ts, runs as you type, nothing is sent anywhere.
 */
import { useId, useMemo, useState, type ReactNode } from 'react';
import { allInTextCitations, type InTextInput } from '@/lib/inTextCitation';
import { focusRing } from '@/components/marketing/styles';

const control = `w-full rounded-xl border border-line bg-surface px-3.5 text-[15px] text-ink placeholder:text-subtle ${focusRing}`;
const small = `inline-flex h-8 shrink-0 items-center rounded-lg border border-line px-2.5 text-[13px] text-ink-2 hover:bg-soft ${focusRing}`;

function Field({ label, optional, children, hint }: { label: string; optional?: boolean; hint?: string; children: (id: string, hintId?: string) => ReactNode }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[14px] font-medium text-ink">{label}{optional && <span className="font-normal text-subtle"> (optional)</span>}</label>
      {children(id, hintId)}
      {hint && <p id={hintId} className="mt-1 text-[12.5px] text-muted">{hint}</p>}
    </div>
  );
}

export function InTextCitationGenerator() {
  const [authors, setAuthors] = useState('');
  const [group, setGroup] = useState(false);
  const [groupAbbr, setGroupAbbr] = useState('');
  const [first, setFirst] = useState(true);
  const [year, setYear] = useState('');
  const [suffix, setSuffix] = useState('');
  const [locType, setLocType] = useState<'page' | 'paragraph'>('page');
  const [locValue, setLocValue] = useState('');
  const [shortTitle, setShortTitle] = useState('');
  const [number, setNumber] = useState('1');
  const [copied, setCopied] = useState<string | null>(null);

  const input: InTextInput = useMemo(() => ({
    authors: authors.split('\n').map((line) => line.trim()).filter(Boolean),
    group,
    groupAbbr: group ? groupAbbr : '',
    first,
    year,
    suffix,
    locator: locValue.trim() ? { type: locType, value: locValue } : undefined,
    shortTitle,
    number: Number(number) || 1,
  }), [authors, group, groupAbbr, first, year, suffix, locType, locValue, shortTitle, number]);

  const rows = useMemo(() => allInTextCitations(input), [input]);
  const ready = input.authors.length > 0;

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1600);
    } catch { /* clipboard blocked */ }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label={group ? 'Group author (one per line)' : 'Authors (one per line, in order)'} hint={group ? 'e.g. World Health Organization' : 'Type "Family, Given" (Smith, Jane) or "Jane Smith". Use the comma form for names such as van der Berg.'}>
            {(id, hintId) => (
              <textarea id={id} aria-describedby={hintId} value={authors} onChange={(event) => setAuthors(event.target.value.slice(0, 4000))} rows={4}
                placeholder={group ? 'World Health Organization' : 'Smith, Jane\nJones, Ali\nLee, Min'} className={`${control} py-3 leading-[1.5]`} />
            )}
          </Field>
          <label className="mt-2 inline-flex items-center gap-2 text-[14px] text-ink-2">
            <input type="checkbox" checked={group} onChange={(event) => setGroup(event.target.checked)} className={`size-4 rounded border-line ${focusRing}`} />
            The author is an organisation (group author)
          </label>
        </div>

        {group && (
          <>
            <Field label="Abbreviation (APA)" optional hint="APA gives it in brackets the first time, then uses it alone.">
              {(id, hintId) => <input id={id} aria-describedby={hintId} value={groupAbbr} onChange={(event) => setGroupAbbr(event.target.value.slice(0, 30))} placeholder="e.g. WHO" className={`${control} h-11`} />}
            </Field>
            <div className="flex items-end pb-2">
              <label className="inline-flex items-center gap-2 text-[14px] text-ink-2">
                <input type="checkbox" checked={first} onChange={(event) => setFirst(event.target.checked)} disabled={!groupAbbr.trim()} className={`size-4 rounded border-line ${focusRing}`} />
                First time I cite it
              </label>
            </div>
          </>
        )}

        <Field label="Year" optional hint="Leave empty for no date (n.d.).">
          {(id, hintId) => <input id={id} aria-describedby={hintId} inputMode="numeric" value={year} onChange={(event) => setYear(event.target.value.replace(/[^\d]/g, '').slice(0, 4))} placeholder="e.g. 2021" className={`${control} h-11`} />}
        </Field>
        <Field label="Same author, same year" optional hint="Give each work a letter, in reference-list order.">
          {(id, hintId) => (
            <select id={id} aria-describedby={hintId} value={suffix} onChange={(event) => setSuffix(event.target.value)} className={`${control} h-11`}>
              <option value="">No letter</option>
              {['a', 'b', 'c', 'd', 'e'].map((letter) => <option key={letter} value={letter}>{letter}</option>)}
            </select>
          )}
        </Field>

        <Field label="Page or paragraph" optional hint="For a quotation or a specific point. A range like 12-15 becomes 12–15.">
          {(id, hintId) => (
            <div className="flex gap-2">
              <select aria-label="Locator type" value={locType} onChange={(event) => setLocType(event.target.value as 'page' | 'paragraph')} className={`${control} h-11 w-[9.5rem] shrink-0`}>
                <option value="page">Page</option>
                <option value="paragraph">Paragraph</option>
              </select>
              <input id={id} aria-describedby={hintId} value={locValue} onChange={(event) => setLocValue(event.target.value.slice(0, 20))} placeholder={locType === 'page' ? 'e.g. 12' : 'e.g. 4'} className={`${control} h-11 min-w-0`} />
            </div>
          )}
        </Field>
        <Field label="Short title (MLA)" optional hint="MLA uses it to tell apart two works by the same author.">
          {(id, hintId) => <input id={id} aria-describedby={hintId} value={shortTitle} onChange={(event) => setShortTitle(event.target.value.slice(0, 80))} placeholder="e.g. Sleep and Memory" className={`${control} h-11`} />}
        </Field>
        <Field label="Reference number (numeric styles)" optional>
          {(id) => <input id={id} type="number" min={1} max={999} value={number} onChange={(event) => setNumber(event.target.value)} className={`${control} h-11`} />}
        </Field>
      </div>

      <section aria-labelledby="intext-results" className="rounded-2xl border border-line bg-surface">
        <h2 id="intext-results" className="border-b border-line-2 px-5 py-3 text-[15px] font-semibold text-ink">Your in-text citations</h2>
        <div aria-live="polite">
          {!ready ? (
            <p className="px-5 py-8 text-center text-[14.5px] text-muted">Type at least one author to see the citations.</p>
          ) : (
            <ul className="divide-y divide-line-2">
              {rows.map(({ style, name, result }) => (
                <li key={style} className="px-5 py-4">
                  <h3 className="text-[14px] font-semibold text-ink">{name}</h3>
                  <dl className="mt-2 grid gap-2">
                    {([['Parenthetical', result.parenthetical], ['Narrative', result.narrative]] as const).map(([label, value]) => (
                      <div key={label} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <dt className="w-28 shrink-0 text-[13px] text-muted">{label}</dt>
                        <dd className="min-w-0 flex-1 font-serif text-[15.5px] text-ink [overflow-wrap:anywhere]">{value}</dd>
                        <dd>
                          <button type="button" onClick={() => copy(`${style}-${label}`, value)} className={small} aria-label={`Copy ${name} ${label.toLowerCase()} citation`}>
                            {copied === `${style}-${label}` ? 'Copied' : 'Copy'}
                          </button>
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {result.notes.length > 0 && (
                    <ul className="mt-2 list-disc pl-5 text-[13px] leading-[1.5] text-muted">
                      {result.notes.map((note) => <li key={note}>{note}</li>)}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      <p className="text-[13px] text-muted">Runs in your browser; nothing is sent anywhere. “…” marks where your quotation or sentence goes. Check your course or journal rules, which can differ from the style manual.</p>
    </div>
  );
}
