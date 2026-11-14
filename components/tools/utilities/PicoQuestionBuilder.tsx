'use client';

/** PICO, PICOT, PCC or SPIDER fields -> the question in a few phrasings, a check list and a search concept table. Runs in the browser. */
import Link from 'next/link';
import { useEffect, useId, useMemo, useState } from 'react';
import { LuArrowRight, LuCircleAlert, LuCircleCheck, LuInfo } from 'react-icons/lu';
import { FRAMEWORKS, buildQuestions, checkQuestion, conceptTable, type Framework, type Values } from '@/lib/picoQuestion';
import { encodeHandoff } from '@/lib/booleanSearch';
import { CopyButton } from '@/components/marketing/CopyButton';
import { btnGhost, btnPrimary, focusRing } from '@/components/marketing/styles';

const control = `w-full rounded-xl border border-line bg-surface px-3.5 text-[15px] text-ink placeholder:text-subtle ${focusRing}`;
const EXAMPLE_FIELDS = ['Health', 'Education', 'Business', 'Engineering', 'Psychology or social science'];
const STORAGE_KEY = 'writeorbit_pico_builder';

type Saved = { framework: Framework; type: string; values: Values; synonyms: Values };

const SEARCH_LABEL = { yes: 'Search', maybe: 'Optional', no: 'Usually not' } as const;

export function PicoQuestionBuilder() {
  const id = useId();
  const [framework, setFramework] = useState<Framework>('pico');
  const [type, setType] = useState('therapy');
  const [values, setValues] = useState<Values>({});
  const [synonyms, setSynonyms] = useState<Values>({});
  const [send, setSend] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  // A per-browser convenience; it may come back empty.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as Saved | null;
      if (saved && saved.framework in FRAMEWORKS) {
        setFramework(saved.framework);
        setType(saved.type);
        setValues(saved.values ?? {});
        setSynonyms(saved.synonyms ?? {});
      }
    } catch { /* blocked or malformed */ }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ framework, type, values, synonyms } satisfies Saved)); } catch { /* blocked */ }
  }, [loaded, framework, type, values, synonyms]);

  const def = FRAMEWORKS[framework];
  const activeType = def.types.some((t) => t.id === type) ? type : def.types[0].id;
  const filled = def.elements.some((element) => (values[element.key] ?? '').trim());
  const questions = useMemo(() => buildQuestions(framework, activeType, values), [framework, activeType, values]);
  const issues = useMemo(() => checkQuestion(framework, values), [framework, values]);
  const concepts = useMemo(() => conceptTable(framework, values, synonyms), [framework, values, synonyms]);

  const chosen = concepts.filter((row) => send[row.key] ?? row.search === 'yes');
  const handoff = `/tools/boolean-search-string-builder#${encodeHandoff(chosen.map((row) => ({ name: row.label, terms: row.terms })))}`;

  function pickFramework(next: Framework) {
    setFramework(next);
    if (!FRAMEWORKS[next].types.some((t) => t.id === type)) setType(FRAMEWORKS[next].types[0].id);
  }

  function fillExample(index: number) {
    const next: Values = {};
    for (const element of def.elements) {
      const example = element.examples[index] ?? element.examples[index % element.examples.length];
      next[element.key] = example.value;
    }
    setValues(next);
    setSynonyms({});
  }

  function clearAll() {
    setValues({});
    setSynonyms({});
    setSend({});
  }

  return (
    <div className="flex flex-col gap-7">
      <fieldset>
        <legend className="mb-2 text-[14px] font-medium text-ink">Framework</legend>
        <div className="grid gap-2 sm:grid-cols-4">
          {Object.values(FRAMEWORKS).map((item) => (
            <label key={item.id} className={`flex cursor-pointer flex-col rounded-xl border px-3.5 py-2.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand ${framework === item.id ? 'border-ink bg-surface' : 'border-line hover:bg-soft'}`}>
              <span className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                <input type="radio" name={`${id}-framework`} value={item.id} checked={framework === item.id} onChange={() => pickFramework(item.id)} className="accent-[var(--color-brand)]" />
                {item.name}
              </span>
              <span className="mt-1 text-[12.5px] leading-[1.45] text-muted">{item.use}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        {def.types.length > 1 && (
          <label>
            <span className="mb-1.5 block text-[14px] font-medium text-ink">Question type</span>
            <select value={activeType} onChange={(event) => setType(event.target.value)} aria-describedby={`${id}-type-help`} className={`${control} h-11`}>
              {def.types.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <span id={`${id}-type-help`} className="mt-1 block text-[13px] text-muted">{def.types.find((t) => t.id === activeType)?.help}</span>
          </label>
        )}
        <label>
          <span className="mb-1.5 block text-[14px] font-medium text-ink">Fill with an example (illustrative)</span>
          <select value="" onChange={(event) => { if (event.target.value !== '') fillExample(Number(event.target.value)); }} className={`${control} h-11`}>
            <option value="">Choose a field…</option>
            {EXAMPLE_FIELDS.map((field, index) => <option key={field} value={index}>{field}</option>)}
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-5">
        {def.elements.map((element) => {
          const hintId = `${id}-${element.key}-hint`;
          return (
            <div key={element.key} className="rounded-2xl border border-line bg-surface px-4 py-4 sm:px-5">
              <label htmlFor={`${id}-${element.key}`} className="flex items-baseline gap-2 text-[15px] font-semibold text-ink">
                <span className="grid h-7 min-w-7 place-items-center rounded-md bg-brand-50 px-1.5 font-serif text-[14px] text-brand" aria-hidden="true">{element.letter}</span>
                {element.label}{!element.required && <span className="text-[13px] font-normal text-muted">(optional)</span>}
              </label>
              <input id={`${id}-${element.key}`} value={values[element.key] ?? ''} onChange={(event) => setValues((current) => ({ ...current, [element.key]: event.target.value.slice(0, 300) }))}
                aria-describedby={hintId} placeholder={`e.g. ${element.examples[0].value}`} className={`${control} mt-2 h-11`} />
              <p id={hintId} className="mt-1.5 text-[13px] leading-[1.5] text-muted">
                {element.hint} <span className="text-subtle">Examples: {element.examples.map((example) => `${example.value} (${example.field.toLowerCase()})`).join('; ')}.</span>
              </p>
              {element.search !== 'no' && (
                <label className="mt-3 block">
                  <span className="mb-1 block text-[13px] font-medium text-ink-2">Other search words for this concept (optional, comma separated)</span>
                  <input value={synonyms[element.key] ?? ''} onChange={(event) => setSynonyms((current) => ({ ...current, [element.key]: event.target.value.slice(0, 600) }))}
                    placeholder="synonyms, spellings, abbreviations" className={`${control} h-10 text-[14px]`} />
                </label>
              )}
            </div>
          );
        })}
        <div className="flex justify-end">
          <button type="button" onClick={clearAll} className={`${btnGhost} h-9 px-3 text-[13.5px]`}>Clear all fields</button>
        </div>
      </div>

      <div aria-live="polite" className="flex flex-col gap-6">
        {filled ? (
          <>
            <section aria-labelledby={`${id}-q`} className="rounded-2xl border border-line bg-surface px-5 py-5">
              <h2 id={`${id}-q`} className="text-[16px] font-semibold text-ink">Your question</h2>
              <ol className="mt-3 flex flex-col gap-3">
                {questions.map((question, index) => (
                  <li key={index} className="flex flex-col gap-2 rounded-xl border border-line-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                    <p className="font-serif text-[16px] leading-[1.55] text-ink [overflow-wrap:anywhere]">{question}</p>
                    <CopyButton text={question} />
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-[13px] text-muted">Words in [brackets] are still missing. Pick the phrasing that reads best and adjust it in your own words.</p>
            </section>

            <section aria-labelledby={`${id}-check`}>
              <h2 id={`${id}-check`} className="text-[16px] font-semibold text-ink">Check list</h2>
              {issues.length ? (
                <ul className="mt-3 flex flex-col gap-2">
                  {issues.map((issue, index) => (
                    <li key={index} className="flex gap-2.5 rounded-xl border border-line px-4 py-3 text-[14px] leading-[1.5] text-ink-2">
                      {issue.level === 'tip'
                        ? <LuInfo className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                        : <LuCircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber" aria-hidden="true" />}
                      <span><span className="font-medium text-ink">{issue.level === 'missing' ? 'Missing' : issue.level === 'vague' ? 'Vague' : 'Consider'}: </span>{issue.message}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 flex items-center gap-2 text-[14px] text-ink-2"><LuCircleCheck className="h-4 w-4 text-green-600" aria-hidden="true" /> Every element is filled and nothing looks vague. Now test it against FINER.</p>
              )}
            </section>

            {concepts.length > 0 && (
              <section aria-labelledby={`${id}-concepts`}>
                <h2 id={`${id}-concepts`} className="text-[16px] font-semibold text-ink">Concept table for searching</h2>
                <div className="mt-3 overflow-x-auto rounded-xl border border-line" role="region" aria-label="Concept table" tabIndex={0}>
                  <table className="w-full min-w-[560px] text-left text-[14px]">
                    <thead className="bg-soft text-[13px] text-ink-2">
                      <tr>
                        <th scope="col" className="px-3 py-2 font-medium">Concept</th>
                        <th scope="col" className="px-3 py-2 font-medium">Search terms (OR)</th>
                        <th scope="col" className="px-3 py-2 font-medium">In the search?</th>
                        <th scope="col" className="px-3 py-2 font-medium">Send</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line-2">
                      {concepts.map((row) => (
                        <tr key={row.key} className="align-top">
                          <th scope="row" className="px-3 py-2.5 font-medium text-ink">{row.label}</th>
                          <td className="px-3 py-2.5 text-ink-2 [overflow-wrap:anywhere]">{row.terms.join(' OR ')}</td>
                          <td className="px-3 py-2.5 text-ink-2"><span className="font-medium">{SEARCH_LABEL[row.search]}.</span> <span className="text-muted">{row.note}</span></td>
                          <td className="px-3 py-2.5">
                            <input type="checkbox" checked={send[row.key] ?? row.search === 'yes'} onChange={(event) => setSend((current) => ({ ...current, [row.key]: event.target.checked }))}
                              aria-label={`Send ${row.label} to the Boolean search builder`} className={`h-4 w-4 accent-[var(--color-brand)] ${focusRing}`} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-[13px] text-muted">Long phrases rarely match as written. Break them into short terms and add synonyms before you search.</p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {chosen.length > 0
                    ? <a href={handoff} className={`${btnPrimary} h-11 px-5 text-[15px]`}>Build the search string <LuArrowRight className="h-4 w-4" aria-hidden="true" /></a>
                    : <p className="text-[14px] text-muted">Tick at least one concept to send it to the Boolean search builder.</p>}
                  <CopyButton label="Copy table" text={concepts.map((row) => `${row.label}\t${row.terms.join(' OR ')}\t${SEARCH_LABEL[row.search]}`).join('\n')} />
                </div>
              </section>
            )}
          </>
        ) : (
          <p className="rounded-2xl border border-dashed border-line px-5 py-6 text-center text-[14px] text-muted">Fill in the elements, or pick an example, to see your question.</p>
        )}
      </div>

      <p className="text-[13px] leading-[1.5] text-muted">
        Everything runs in this browser and is saved only here. For FINER and more worked examples, read <Link href="/blog/how-to-write-a-research-question" className="underline hover:text-ink">how to write a research question</Link>.
      </p>
    </div>
  );
}
