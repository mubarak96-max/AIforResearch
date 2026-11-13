'use client';

import { useMemo, useRef, useState } from 'react';
import { Button, inputClass } from '@/components/app/ui';
import { Columns } from '@/components/app/analysis/charts';
import { api } from '@/lib/session';
import {
  codeFrequency, locateExcerpt, quoteLocator, speakerAt, splitCodes,
  type CodeSuggestion, type Workbook,
} from '@/lib/workflows';

type Props = {
  workbook: Workbook & { suggestion_cost?: number }; base: string; busy: boolean; canEdit: boolean;
  save: (path: string, body: Record<string, unknown>) => Promise<boolean>;
  onError: (message: string) => void; onNotice: (message: string) => void;
};
type Selection = { start: number; end: number; quote: string };
const label = 'grid gap-1.5 text-sm font-semibold';
const DIRECTIONS = ['supports', 'negative case', 'mixed / uncertain'];
const NEW_CODE = '__new__';

/** Read a transcript, select a passage and code it; AI code suggestions that quote the transcript exactly. */
export function TranscriptCoding({ workbook, base, busy, canEdit, save, onError, onNotice }: Props) {
  const sources = workbook.entries.filter((entry) => entry.section === 'sources' && entry.values.text);
  const codebook = workbook.entries.filter((entry) => entry.section === 'codes');
  const [sourceId, setSourceId] = useState(sources.find((source) => source.values.kind === 'transcript')?.id ?? sources[0]?.id ?? '');
  const [selection, setSelection] = useState<Selection | null>(null);
  const [code, setCode] = useState('');
  const [newCode, setNewCode] = useState({ label: '', definition: '' });
  const [direction, setDirection] = useState('supports');
  const [speaker, setSpeaker] = useState('');
  const [interpretation, setInterpretation] = useState('');
  const [instruction, setInstruction] = useState('');
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<CodeSuggestion[]>([]);
  const reader = useRef<HTMLDivElement>(null);
  const source = sources.find((item) => item.id === sourceId);
  const text = source?.values.text ?? '';

  /** Coded passages of this source, as non-overlapping segments for highlighting. */
  const segments = useMemo(() => {
    const marks = workbook.entries.filter((entry) => entry.section === 'excerpts' && entry.values.source_id === sourceId)
      .map((entry) => ({ place: locateExcerpt(text, entry.values.quote, entry.values.locator), codes: splitCodes(entry.values.codes) }))
      .filter((item): item is { place: { start: number; end: number }; codes: string[] } => Boolean(item.place));
    const cuts = [...new Set([0, text.length, ...marks.flatMap((item) => [item.place.start, item.place.end])])].sort((a, b) => a - b);
    return cuts.slice(0, -1).map((start, i) => {
      const end = cuts[i + 1];
      const codes = [...new Set(marks.filter((item) => item.place.start <= start && item.place.end >= end).flatMap((item) => item.codes))];
      return { start, end, codes };
    });
  }, [workbook.entries, sourceId, text]);

  const readSelection = () => {
    const container = reader.current; const chosen = window.getSelection();
    if (!container || !chosen || chosen.isCollapsed || !chosen.rangeCount) return;
    const range = chosen.getRangeAt(0);
    if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) return;
    const before = document.createRange(); before.selectNodeContents(container); before.setEnd(range.startContainer, range.startOffset);
    let start = before.toString().length; let end = start + range.toString().length;
    while (start < end && /\s/.test(text[start])) start += 1;
    while (end > start && /\s/.test(text[end - 1])) end -= 1;
    if (end <= start) return;
    setSelection({ start, end, quote: text.slice(start, end) });
    setSpeaker(speakerAt(text, start));
  };

  const saveExcerpt = async (values: { quote: string; locator: string; speaker: string; code: string; definition?: string; isNew: boolean }) => {
    if (!source) return false;
    return save('/code-excerpt', {
      values: { source_id: source.id, quote: values.quote, locator: values.locator, speaker: values.speaker, codes: values.code, negative_case: direction, interpretation },
      new_codes: values.isNew ? [{ label: values.code, definition: values.definition ?? '' }] : [],
    });
  };
  const codeSelection = async () => {
    if (!selection) return;
    const isNew = code === NEW_CODE;
    const chosen = isNew ? newCode.label.trim() : code;
    if (!chosen) { onError('Choose a code, or create one.'); return; }
    if (isNew && !newCode.definition.trim()) { onError('Give the new code a definition.'); return; }
    if (await saveExcerpt({ quote: selection.quote, locator: quoteLocator(text, selection.start, selection.end), speaker, code: chosen, definition: newCode.definition, isNew })) {
      setSelection(null); setNewCode({ label: '', definition: '' }); setInterpretation(''); window.getSelection()?.removeAllRanges();
    }
  };
  const suggest = async (passage: string) => {
    if (!source) return;
    setSuggesting(true); onError(''); setSuggestions([]);
    try {
      const result = await api<{ suggestions: CodeSuggestion[]; dropped: number; coverage: { characters_read: number; partial: boolean } }>(`${base}/suggest-codes`, { method: 'POST', body: JSON.stringify({ source_id: source.id, passage, instruction }) });
      setSuggestions(result.suggestions);
      onNotice(`${result.suggestions.length} suggested code${result.suggestions.length === 1 ? '' : 's'} to review (${result.coverage.partial ? 'first ' : ''}${result.coverage.characters_read.toLocaleString()} characters read).${result.dropped ? ` ${result.dropped} suggestion${result.dropped === 1 ? ' was' : 's were'} dropped because the quotation is not in the transcript word for word.` : ''}`);
    } catch (e) { onError((e as Error).message); } finally { setSuggesting(false); }
  };
  const accept = async (item: CodeSuggestion, index: number) => {
    const isNew = !item.existing && !codebook.some((entry) => entry.values.label.trim().toLowerCase() === item.label.toLowerCase());
    if (isNew && !item.definition) { onError('This suggested code has no definition. Create it yourself from the selected text.'); return; }
    if (await saveExcerpt({ quote: item.quote, locator: item.locator, speaker: item.speaker, code: item.label, definition: item.definition, isNew })) setSuggestions(suggestions.filter((_, i) => i !== index));
  };

  if (!sources.length) return null;
  const working = busy || suggesting;
  return <details className="mb-5 rounded-2xl border border-line bg-surface p-5"><summary className="cursor-pointer font-semibold">Read and code a transcript</summary>
    <p className="mt-3 text-sm text-muted">Select words in the transcript, then choose a code or create one. The excerpt keeps the exact words, their line numbers and character position. Coded passages are highlighted.</p>
    <label className={`${label} mt-3 max-w-md`}>Source<select className={inputClass} value={sourceId} disabled={working} onChange={(e) => { setSourceId(e.target.value); setSelection(null); setSuggestions([]); }}>{sources.map((item) => <option key={item.id} value={item.id}>{item.values.title}{item.values.kind === 'transcript' ? '' : ` (${item.values.kind})`}</option>)}</select></label>
    <div ref={reader} onMouseUp={readSelection} onKeyUp={readSelection} tabIndex={0} aria-label={`Text of ${source?.values.title ?? 'the source'}`} className="mt-3 max-h-[32rem] overflow-y-auto whitespace-pre-wrap break-words rounded-xl bg-soft p-4 text-sm leading-relaxed">
      {segments.map((segment) => segment.codes.length
        ? <mark key={segment.start} title={segment.codes.join(', ')} className="rounded bg-brand-50 text-ink">{text.slice(segment.start, segment.end)}</mark>
        : <span key={segment.start}>{text.slice(segment.start, segment.end)}</span>)}
    </div>
    {canEdit && selection && <div className="mt-4 rounded-xl border border-line p-4">
      <p className="text-xs font-semibold text-muted">{quoteLocator(text, selection.start, selection.end)}</p>
      <blockquote className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap border-l-2 border-brand pl-3 text-sm">{selection.quote}</blockquote>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className={label}>Code<select className={inputClass} value={code} disabled={working} onChange={(e) => setCode(e.target.value)}><option value="">Choose…</option>{codebook.map((entry) => <option key={entry.id} value={entry.values.label}>{entry.values.label}</option>)}<option value={NEW_CODE}>New code…</option></select></label>
        <label className={label}>Evidence direction<select className={inputClass} value={direction} disabled={working} onChange={(e) => setDirection(e.target.value)}>{DIRECTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
        {code === NEW_CODE && <><label className={label}>New code<input className={inputClass} maxLength={200} value={newCode.label} onChange={(e) => setNewCode({ ...newCode, label: e.target.value })} /></label><label className={label}>Definition<input className={inputClass} maxLength={2000} value={newCode.definition} onChange={(e) => setNewCode({ ...newCode, definition: e.target.value })} /></label></>}
        <label className={label}>Speaker label<input className={inputClass} maxLength={1000} value={speaker} onChange={(e) => setSpeaker(e.target.value)} /></label>
        <label className={label}>Interpretation (optional)<input className={inputClass} maxLength={2000} value={interpretation} onChange={(e) => setInterpretation(e.target.value)} /></label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="primary" disabled={working} onClick={() => void codeSelection()}>Save coded excerpt</Button>
        <Button disabled={working || selection.quote.length > 12000} onClick={() => void suggest(selection.quote)}>{suggesting ? 'Reading the passage…' : `Suggest codes for this passage · ${workbook.suggestion_cost ?? 3} credits`}</Button>
        <Button disabled={working} onClick={() => setSelection(null)}>Clear selection</Button>
      </div>
    </div>}
    {canEdit && <div className="mt-4">
      <label className={`${label} max-w-xl`}>Focus for AI suggestions (optional)<input className={inputClass} maxLength={2000} value={instruction} onChange={(e) => setInstruction(e.target.value)} /></label>
      {!selection && <Button className="mt-3" disabled={working || !source} onClick={() => void suggest('')}>{suggesting ? 'Reading the transcript…' : `Suggest codes for this transcript · ${workbook.suggestion_cost ?? 3} credits`}</Button>}
      <p className="mt-2 text-xs text-muted">AI reads the selected passage, or the first 12,000 characters of the transcript, and proposes codes with the words they rest on. A suggestion whose quotation is not in the transcript word for word is dropped. Nothing is saved until you accept it.</p>
    </div>}
    {suggestions.length > 0 && <div className="mt-4 grid gap-3">{suggestions.map((item, index) => <div key={`${item.label}-${index}`} className="rounded-xl border border-line p-4">
      <p className="font-semibold">{item.label} <span className="text-xs font-normal text-muted">{item.existing ? 'in your codebook' : 'new code'}</span></p>
      {item.definition && <p className="mt-1 text-sm text-ink-2">{item.definition}</p>}
      <blockquote className="mt-2 whitespace-pre-wrap border-l-2 border-brand pl-3 text-sm">{item.quote}</blockquote>
      <p className="mt-1 text-xs text-muted">{[item.speaker, item.locator].filter(Boolean).join(' · ')}</p>
      {canEdit && <div className="mt-3 flex gap-2"><Button size="sm" variant="primary" disabled={working} onClick={() => void accept(item, index)}>Accept as coded excerpt</Button><Button size="sm" disabled={working} onClick={() => setSuggestions(suggestions.filter((_, i) => i !== index))}>Dismiss</Button></div>}
    </div>)}</div>}
  </details>;
}

/** How often each code was applied, by source or participant, and which codes appear together. */
export function CodeFrequencyPanel({ workbook }: { workbook: Workbook }) {
  const [by, setBy] = useState<'source' | 'speaker'>('source');
  const result = useMemo(() => codeFrequency(workbook.entries, by), [workbook.entries, by]);
  if (!result.codes.length) return null;
  return <details className="mb-5 rounded-2xl border border-line bg-surface p-5"><summary className="cursor-pointer font-semibold">Code frequency and co-occurrence</summary>
    <p className="mt-3 text-sm text-muted">Coded excerpts per code. Frequencies describe where codes were applied; they are not a measure of importance. Co-occurrence counts excerpts that carry both codes.{result.uncoded ? ` ${result.uncoded} excerpt${result.uncoded === 1 ? ' has' : 's have'} no code yet.` : ''}</p>
    <label className={`${label} mt-3 max-w-xs`}>Columns<select className={inputClass} value={by} onChange={(e) => setBy(e.target.value as 'source' | 'speaker')}><option value="source">By source</option><option value="speaker">By participant (speaker label)</option></select></label>
    <div className="mt-4"><Columns label="Coded excerpts per code" data={result.codes.slice(0, 30).map((item) => ({ label: item.label.slice(0, 12), value: item.total }))} /></div>
    <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-line"><th className="py-2 pr-3">Code</th>{result.columns.map((column) => <th key={column.key} className="py-2 pr-3 text-right">{column.label}</th>)}<th className="py-2 text-right">Total</th></tr></thead>
      <tbody>{result.codes.map((item, i) => <tr key={item.label} className="border-b border-line-2"><td className="py-2 pr-3">{item.label}</td>{result.counts[i].map((count, j) => <td key={j} className="py-2 pr-3 text-right tabular-nums">{count || ''}</td>)}<td className="py-2 text-right font-semibold tabular-nums">{item.total}</td></tr>)}</tbody></table></div>
    {result.codes.length > 1 && <><h3 className="mt-5 text-sm font-semibold">Co-occurrence</h3><div className="mt-2 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-line"><th className="py-2 pr-3" />{result.codes.map((item) => <th key={item.label} className="py-2 pr-3 text-right">{item.label}</th>)}</tr></thead>
      <tbody>{result.codes.map((item, i) => <tr key={item.label} className="border-b border-line-2"><td className="py-2 pr-3">{item.label}</td>{result.cooccurrence[i].map((count, j) => <td key={j} className={`py-2 pr-3 text-right tabular-nums ${i === j ? 'text-muted' : ''}`}>{count || ''}</td>)}</tr>)}</tbody></table></div></>}
  </details>;
}
