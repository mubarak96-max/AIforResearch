'use client';

import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { PATTERN_INFO, summarise, type PatternKind } from '@/lib/writingPatterns';
import { focusRing } from '@/components/marketing/styles';

const COLORS: Record<PatternKind, string> = {
  'stock-word': 'bg-amber-100 decoration-amber-500',
  filler: 'bg-orange-100 decoration-orange-500',
  transition: 'bg-sky-100 decoration-sky-500',
  formula: 'bg-violet-100 decoration-violet-500',
  'em-dash': 'bg-rose-100 decoration-rose-500',
  chatbot: 'bg-red-100 decoration-red-500',
};

/** The AI writing pattern checker: runs in the browser as you type; nothing is sent anywhere. */
export function PatternChecker() {
  const [text, setText] = useState('');
  const summary = useMemo(() => summarise(text), [text]);

  const highlighted = useMemo(() => {
    const parts: ReactNode[] = [];
    let last = 0;
    summary.findings.forEach((finding, index) => {
      if (finding.start > last) parts.push(text.slice(last, finding.start));
      parts.push(
        <mark key={index} title={`${PATTERN_INFO[finding.kind].label}: ${PATTERN_INFO[finding.kind].tip}`} className={`rounded px-0.5 text-ink underline decoration-2 underline-offset-2 ${COLORS[finding.kind]}`}>
          {text.slice(finding.start, finding.end)}
        </mark>,
      );
      last = finding.end;
    });
    parts.push(text.slice(last));
    return parts;
  }, [summary.findings, text]);

  const kinds = (Object.keys(PATTERN_INFO) as PatternKind[]).filter((kind) => summary.byKind[kind]);
  const even = summary.sentenceVariation !== null && summary.sentenceVariation < 0.3;

  return (
    <div className="flex flex-col gap-6">
      <label>
        <span className="mb-1.5 block text-[14px] font-medium text-ink">Your text</span>
        <textarea value={text} onChange={(event) => setText(event.target.value.slice(0, 20000))} rows={9} placeholder="Paste a paragraph or a page." className={`w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-[15px] leading-[1.55] text-ink placeholder:text-subtle ${focusRing}`} />
      </label>

      {summary.words > 0 && (
        <div aria-live="polite" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="rounded-2xl border border-line bg-surface px-5 py-5 font-serif text-[16px] leading-[1.75] whitespace-pre-wrap text-ink-2 [overflow-wrap:anywhere]">{highlighted}</div>
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-line bg-surface px-5 py-4">
              <p className="text-[28px] font-semibold text-ink">{summary.findings.length}</p>
              <p className="text-[14px] text-muted">patterns in {summary.words.toLocaleString('en-US')} words ({summary.per100.toFixed(1)} per 100)</p>
              {summary.sentenceVariation !== null && (
                <p className="mt-3 text-[13.5px] text-ink-2">{even ? 'Your sentences are very similar in length. Mixing short and long ones reads more naturally.' : 'Your sentence lengths vary, which reads naturally.'}</p>
              )}
            </div>
            {kinds.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {kinds.map((kind) => (
                  <li key={kind} className="rounded-xl border border-line px-4 py-3">
                    <p className="flex items-center justify-between text-[14px] font-medium text-ink"><span className={`rounded px-1.5 ${COLORS[kind]}`}>{PATTERN_INFO[kind].label}</span><span>{summary.byKind[kind]}</span></p>
                    <p className="mt-1 text-[13px] leading-[1.5] text-muted">{PATTERN_INFO[kind].tip}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="text-[14px] text-muted">No common patterns found.</p>}
            <p className="text-[13px] leading-[1.5] text-muted">
              This shows phrases worth rewriting. It cannot tell who wrote the text. To rewrite, try the <Link href="/tools/humanizer" className="underline hover:text-ink">humanizer</Link>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
