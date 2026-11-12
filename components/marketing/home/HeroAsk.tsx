'use client';

/**
 * The home page's Ask box. It looks like the app's own (components/app/research/AskComposer)
 * but needs no account: the question, depth and sources are handed to Deep Research in
 * sessionStorage, and signed-out visitors go through sign-up first (the question waits).
 */
import { useEffect, useState } from 'react';
import { LuArrowUp, LuCheck, LuPaperclip } from 'react-icons/lu';
import { hasSession } from '@/lib/session';
import { signupHref } from '@/lib/features';
import { PENDING_KEY } from '@/components/app/research/handoff';
import type { AskRequest } from '@/components/app/research/AskComposer';
import { focusRing } from '../styles';

type Depth = AskRequest['depth'];
type Group = AskRequest['groups'][number];

const DEPTHS: { value: Depth; label: string; credits: number; detail: string }[] = [
  { value: 'summary', label: 'Summary', credits: 1, detail: 'A short cited answer from about 8 papers' },
  { value: 'deep', label: 'Deep', credits: 5, detail: 'A structured report from 20–40 papers' },
  { value: 'detailed', label: 'Detailed', credits: 20, detail: 'A long report with tables from 50+ papers (paid plans)' },
];
const GROUPS: { value: Group; label: string }[] = [
  { value: 'papers', label: 'All papers' },
  { value: 'medical', label: 'Medical' },
  { value: 'preprints', label: 'Preprints' },
  { value: 'web', label: 'Web' },
  { value: 'library', label: 'My Library' },
];
const EXAMPLES = [
  'Does sleep after learning improve memory consolidation?',
  'What drives smallholder adoption of climate-smart agriculture?',
  'How accurate are large language models at clinical diagnosis?',
];
const TARGET = '/deep-research?start=1';

export function HeroAsk() {
  const [question, setQuestion] = useState('');
  const [depth, setDepth] = useState<Depth>('deep');
  const [groups, setGroups] = useState<Group[]>(['papers']);
  const [signedIn, setSignedIn] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => setSignedIn(hasSession()), []);

  const toggle = (group: Group) => setGroups((current) => (current.includes(group) ? (current.length > 1 ? current.filter((item) => item !== group) : current) : [...current, group]));
  const ready = question.trim().length >= 3;
  const submit = () => {
    if (!ready) return;
    const request: AskRequest = {
      question: question.trim(), depth, groups, filters: {}, headings: true, high_quality: false,
      library_document_ids: [], attachments: [], role: null, project_id: null,
    };
    try { sessionStorage.setItem(PENDING_KEY, JSON.stringify(request)); } catch { /* blocked: Deep Research opens empty */ }
    window.location.assign(signedIn ? TARGET : signupHref(TARGET));
  };
  const credits = DEPTHS.find((item) => item.value === depth)!.credits;

  return (
    <form onSubmit={(event) => { event.preventDefault(); submit(); }} className="rounded-[20px] border border-line bg-surface p-3 text-left shadow-[0_24px_50px_-34px_rgba(15,23,42,.5)] sm:p-4">
      <label htmlFor="hero-question" className="sr-only">Your research question</label>
      <textarea id="hero-question" rows={3} value={question} onChange={(event) => setQuestion(event.target.value)}
        onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit(); } }}
        placeholder="Ask a research question…"
        className="w-full resize-none bg-transparent px-1 text-[17px] leading-relaxed text-ink outline-none placeholder:text-subtle" />
      {!question && (
        <div className="-mt-1 mb-1 flex flex-wrap gap-1.5 px-1">
          {EXAMPLES.map((example) => (
            <button key={example} type="button" onClick={() => setQuestion(example)} className={`rounded-full bg-soft px-2.5 py-1 text-[12.5px] text-ink-2 hover:bg-line-2 ${focusRing}`}>{example}</button>
          ))}
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <div role="radiogroup" aria-label="Depth" className="inline-flex max-w-full overflow-x-auto rounded-xl bg-line-2 p-1">
          {DEPTHS.map((item) => (
            <button key={item.value} type="button" role="radio" aria-checked={depth === item.value} title={`${item.detail} · ${item.credits} credit${item.credits === 1 ? '' : 's'}`} onClick={() => setDepth(item.value)}
              className={`h-8 shrink-0 rounded-[9px] px-3 text-[13.5px] font-semibold transition-colors ${focusRing} ${depth === item.value ? 'bg-surface text-ink shadow-[0_1px_3px_rgba(15,23,42,.12)]' : 'text-muted hover:text-ink-2'}`}>
              {item.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setNote(signedIn ? 'Attach files in Deep Research after you ask, or add them from your Library.' : 'You can attach PDF, Word, Markdown and text files once you have a free account.')}
          className={`inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-[13.5px] font-medium text-ink-2 hover:bg-soft ${focusRing}`}>
          <LuPaperclip className="h-3.5 w-3.5" aria-hidden="true" />Attach PDF
        </button>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-[13px] text-muted sm:inline">{credits} credit{credits === 1 ? '' : 's'}</span>
          <button type="submit" disabled={!ready} aria-label="Ask" className={`grid h-10 w-10 place-items-center rounded-full bg-accent text-white shadow-[0_6px_16px_-6px_rgba(194,65,12,.55)] transition-colors hover:bg-accent-600 disabled:bg-subtle disabled:shadow-none ${focusRing}`}>
            <LuArrowUp className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div role="group" aria-label="Sources" className="mt-3 flex flex-wrap gap-1.5 border-t border-line-2 pt-3">
        {GROUPS.map((group) => {
          const on = groups.includes(group.value);
          return (
            <button key={group.value} type="button" aria-pressed={on} onClick={() => toggle(group.value)}
              className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors ${focusRing} ${on ? 'border-brand bg-brand-50 text-brand' : 'border-line bg-surface text-ink-2 hover:bg-soft'}`}>
              {on && <LuCheck className="h-3.5 w-3.5" aria-hidden="true" />}{group.label}
            </button>
          );
        })}
      </div>
      {note && <p role="status" className="mt-2.5 px-1 text-[13px] text-muted">{note}</p>}
    </form>
  );
}
