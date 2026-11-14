'use client';

/**
 * Reference list sorter (/tools/reference-list-sorter): paste a list, sort it by APA 7 or MLA 9
 * rules, review and remove duplicates, copy the result. Runs in the browser; nothing is sent.
 */
import { useEffect, useMemo, useState } from 'react';
import { LuCheck, LuCopy, LuTrash2, LuUndo2 } from 'react-icons/lu';
import { sortReferenceList, type SortStyle } from '@/lib/referenceList';
import { btnGhost, btnPrimary, focusRing } from '@/components/marketing/styles';

const control = `w-full rounded-xl border border-line bg-surface px-3.5 text-[15px] text-ink placeholder:text-subtle ${focusRing}`;
const MAX = 60000;

// Real works, with one entry pasted twice in a different case.
const EXAMPLE = `Walker, M. P., & Stickgold, R. (2004). Sleep-dependent learning and memory consolidation. Neuron, 44(1), 121–133. https://doi.org/10.1016/j.neuron.2004.08.031
Baddeley, A. D., & Hitch, G. (1974). Working memory. In G. H. Bower (Ed.), Psychology of learning and motivation (Vol. 8, pp. 47–89). Academic Press. https://doi.org/10.1016/S0079-7421(08)60452-1
Walker, M. P. (2017). Why we sleep. Scribner.
Baddeley, A. (2012). Working memory: Theories, models, and controversies. Annual Review of Psychology, 63, 1–29. https://doi.org/10.1146/annurev-psych-120710-100422
Diekelmann, S., & Born, J. (2010). The memory function of sleep. Nature Reviews Neuroscience, 11(2), 114–126. https://doi.org/10.1038/nrn2762
Baddeley, A. (2000). The episodic buffer: A new component of working memory? Trends in Cognitive Sciences, 4(11), 417–423. https://doi.org/10.1016/S1364-6613(00)01538-2
Walker, M. P., & Stickgold, R. (2004). Sleep-Dependent Learning and Memory Consolidation. Neuron, 44, 121-133.`;

export function ReferenceListSorter() {
  const [raw, setRaw] = useState('');
  const [style, setStyle] = useState<SortStyle>('apa');
  const [removed, setRemoved] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState<'idle' | 'done' | 'failed'>('idle');

  const result = useMemo(() => sortReferenceList(raw, style), [raw, style]);
  useEffect(() => { setRemoved(new Set()); setCopied('idle'); }, [raw, style]);

  const flagged = new Map(result.duplicates.map((pair) => [pair.drop, pair]));
  const kept = result.entries.filter((_, index) => !removed.has(index));
  const exact = result.duplicates.filter((pair) => pair.kind === 'duplicate');
  const likely = result.duplicates.filter((pair) => pair.kind === 'likely');
  const openExact = exact.filter((pair) => !removed.has(pair.drop));

  const toggle = (index: number) => setRemoved((current) => {
    const next = new Set(current);
    if (next.has(index)) next.delete(index); else next.add(index);
    return next;
  });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(kept.map((entry) => entry.text).join('\n'));
      setCopied('done');
    } catch {
      setCopied('failed');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <label>
          <span className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2 text-[14px] font-medium text-ink">
            Your reference list
            <button type="button" onClick={() => setRaw(EXAMPLE)} className={`rounded text-[13px] font-normal text-muted underline underline-offset-2 hover:text-ink ${focusRing}`}>Try an example</button>
          </span>
          <textarea value={raw} onChange={(event) => setRaw(event.target.value.slice(0, MAX))} rows={9} placeholder="Paste one reference per line, or separate them with blank lines." className={`${control} py-3 leading-[1.55]`} />
        </label>
        <fieldset>
          <legend className="mb-1.5 text-[14px] font-medium text-ink">Sort by</legend>
          <div className="flex flex-wrap gap-2">
            {([['apa', 'APA 7 reference list'], ['mla', 'MLA 9 Works Cited']] as const).map(([id, label]) => (
              <label key={id} className={`inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-[14px] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand ${style === id ? 'border-ink bg-ink text-on-ink' : 'border-line bg-surface text-ink-2 hover:bg-soft'}`}>
                <input type="radio" name="sort-style" value={id} checked={style === id} onChange={() => setStyle(id)} className="sr-only" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div aria-live="polite">
        {result.entries.length > 0 && (
          <p className="text-[14px] text-ink-2">
            {result.entries.length} {result.entries.length === 1 ? 'entry' : 'entries'} sorted by {style === 'apa' ? 'APA 7' : 'MLA 9'} rules.
            {' '}{exact.length ? `${exact.length} duplicate${exact.length === 1 ? '' : 's'}` : 'No duplicates'}
            {likely.length ? `, ${likely.length} likely duplicate${likely.length === 1 ? '' : 's'} to check` : ''}.
            {removed.size > 0 && ` ${removed.size} removed.`}
          </p>
        )}
      </div>

      {result.duplicates.length > 0 && (
        <section aria-labelledby="dupes-title" className="rounded-2xl border border-line bg-surface px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 id="dupes-title" className="text-[16px] font-semibold text-ink">Duplicates</h3>
            {openExact.length > 0 && (
              <button type="button" onClick={() => setRemoved((current) => new Set([...current, ...openExact.map((pair) => pair.drop)]))} className={`${btnGhost} h-9 px-3 text-[13.5px]`}>
                <LuTrash2 className="h-4 w-4" aria-hidden="true" /> Remove {openExact.length} exact duplicate{openExact.length === 1 ? '' : 's'}
              </button>
            )}
          </div>
          <ul className="mt-3 flex flex-col gap-3">
            {result.duplicates.map((pair) => (
              <li key={`${pair.keep}-${pair.drop}`} className="rounded-xl border border-line-2 px-4 py-3 text-[14px]">
                <p className="flex flex-wrap items-center gap-2">
                  <span className={`rounded px-1.5 py-0.5 text-[12.5px] font-semibold ${pair.kind === 'duplicate' ? 'bg-rose-100 text-rose-900' : 'bg-amber-100 text-amber-900'}`}>{pair.kind === 'duplicate' ? 'Duplicate' : 'Likely duplicate'}</span>
                  <span className="text-muted">{pair.reason}</span>
                </p>
                <p className="mt-2 text-ink-2 [overflow-wrap:anywhere]"><span className="font-medium text-ink">Keeps: </span>{result.entries[pair.keep].text}</p>
                <p className={`mt-1 [overflow-wrap:anywhere] ${removed.has(pair.drop) ? 'text-subtle line-through' : 'text-ink-2'}`}><span className="font-medium text-ink">Also: </span>{result.entries[pair.drop].text}</p>
                <button type="button" onClick={() => toggle(pair.drop)} aria-pressed={removed.has(pair.drop)} className={`mt-2 inline-flex items-center gap-1.5 rounded text-[13.5px] font-medium text-brand hover:text-brand-600 ${focusRing}`}>
                  {removed.has(pair.drop) ? <><LuUndo2 className="h-4 w-4" aria-hidden="true" /> Put it back</> : <><LuTrash2 className="h-4 w-4" aria-hidden="true" /> Remove the second entry</>}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.entries.length > 0 && (
        <section aria-labelledby="sorted-title" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 id="sorted-title" className="text-[16px] font-semibold text-ink">Sorted list ({kept.length})</h3>
            <div className="flex items-center gap-3">
              <span role="status" className="text-[13px] text-muted">{copied === 'done' ? 'Copied.' : copied === 'failed' ? 'Could not copy. Select the list and copy it.' : ''}</span>
              <button type="button" onClick={copy} disabled={kept.length === 0} className={`${btnPrimary} h-10 px-4 text-[14px]`}>
                {copied === 'done' ? <LuCheck className="h-4 w-4" aria-hidden="true" /> : <LuCopy className="h-4 w-4" aria-hidden="true" />} Copy the list
              </button>
            </div>
          </div>
          <ul className="flex flex-col gap-2 rounded-2xl border border-line bg-surface px-5 py-4 font-serif text-[15.5px] leading-[1.6] text-ink-2">
            {result.entries.map((entry, index) => removed.has(index) ? null : (
              <li key={index} className="pl-8 -indent-8 [overflow-wrap:anywhere]">
                {entry.text}
                {flagged.has(index) && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 indent-0 font-sans text-[12px] font-semibold text-amber-900">{flagged.get(index)!.kind === 'duplicate' ? 'duplicate' : 'check'}</span>}
              </li>
            ))}
          </ul>
          <p className="text-[13px] leading-[1.5] text-muted">List numbers ([1], 1.) are removed, because APA and MLA lists are not numbered. The sorter reorders entries; it does not change their wording or format.</p>
        </section>
      )}
    </div>
  );
}
