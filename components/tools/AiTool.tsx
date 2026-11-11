'use client';

/**
 * The form and result for an AI tool (lib/tools.ts, kind 'ai'). Runs POST /api/tools/run/:slug,
 * shows the answer with in-text citations linked to the paper pages, the reference list, and
 * buttons to copy it or open it as an editor document.
 */
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { LuArrowRight, LuFilePen, LuLoaderCircle, LuRotateCcw } from 'react-icons/lu';
import posthog from 'posthog-js';
import { api, hasSession } from '@/lib/session';
import { signupHref } from '@/lib/features';
import { ANON_DAILY_RUNS, type Tool, type ToolField } from '@/lib/tools';
import { btnGhost, btnPrimary, focusRing } from '@/components/marketing/styles';
import { Formatted } from '@/components/marketing/Formatted';
import { CopyButton } from '@/components/marketing/CopyButton';
import { EDITOR_STYLE, editorHtml, linkMarkers, plainText, referenceList, type ResultSource, type StyleId } from './toolOutput';
import { openInEditor } from './editorHandoff';

type Result = { markdown: string; sources: ResultSource[] };

const control = `w-full rounded-xl border border-line bg-surface px-3.5 text-[15px] text-ink placeholder:text-subtle ${focusRing}`;

const GROUNDED_STAGES: [number, string][] = [[0, 'Searching 250M+ papers…'], [5, 'Reading the most relevant abstracts…'], [12, 'Writing, with citations…'], [45, 'Still writing. Long drafts take up to a minute or two…']];
const PLAIN_STAGES: [number, string][] = [[0, 'Working…'], [25, 'Still working. Long texts take a little longer…']];

function Field({ field, value, onChange, signedIn, path }: { field: ToolField; value: string; onChange: (value: string) => void; signedIn: boolean; path: string }) {
  const id = `field-${field.name}`;
  const max = signedIn ? field.max : field.anonMax ?? field.max;
  const label = <label htmlFor={id} className="mb-1.5 block text-[14px] font-medium text-ink">{field.label}</label>;
  if (field.kind === 'select') {
    return (
      <div>
        {label}
        <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className={`${control} h-11`}>
          {field.options!.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
        </select>
      </div>
    );
  }
  const over = value.length > max;
  return (
    <div className="sm:col-span-2">
      {label}
      {field.kind === 'textarea'
        ? <textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={field.placeholder} rows={field.name === 'notes' ? 3 : 8} required={field.required} aria-describedby={`${id}-count`} className={`${control} min-h-[88px] py-3 leading-[1.55]`} />
        : <input id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={field.placeholder} required={field.required} maxLength={field.max} className={`${control} h-11`} />}
      {field.kind === 'textarea' && (
        <p id={`${id}-count`} className={`mt-1 text-right text-[12.5px] ${over ? 'text-red-700' : 'text-subtle'}`}>
          {value.length.toLocaleString('en-US')} / {max.toLocaleString('en-US')}
          {over && !signedIn && <> · <Link href={signupHref(path)} className="underline">sign in for longer texts</Link></>}
        </p>
      )}
    </div>
  );
}

export function AiTool({ tool }: { tool: Pick<Tool, 'slug' | 'name' | 'fields' | 'submitLabel' | 'grounded' | 'toEditor'> }) {
  const fields = tool.fields ?? [];
  const initial = useMemo(() => Object.fromEntries(fields.map((field) => [field.name, field.kind === 'select' ? field.options![0][0] : ''])), [fields]);
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [signedIn, setSignedIn] = useState(false);
  const [path, setPath] = useState('/tools');
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<{ message: string; limit: boolean } | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setSignedIn(hasSession()); setPath(window.location.pathname); }, []);
  useEffect(() => {
    if (!running) return;
    setElapsed(0);
    const timer = window.setInterval(() => setElapsed((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  const style = (values.style as StyleId) || 'apa';
  const stage = [...(tool.grounded ? GROUNDED_STAGES : PLAIN_STAGES)].reverse().find(([after]) => elapsed >= after)?.[1];

  async function run(event: FormEvent) {
    event.preventDefault();
    setRunning(true);
    setError(null);
    try {
      const answer = await api<Result>(`/api/tools/run/${tool.slug}`, { method: 'POST', body: JSON.stringify(values) });
      posthog.capture('ai_tool_generation_completed', {
        tool_slug: tool.slug,
        is_grounded: tool.grounded,
        source_count: answer.sources.length,
      });
      setResult(answer);
      window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    } catch (caught) {
      const message = (caught as Error).message || 'Something went wrong. Try again.';
      setError({ message, limit: /free runs|plan|Upgrade/i.test(message) });
    } finally {
      setRunning(false);
    }
  }

  const references = result ? referenceList(result.sources, style) : [];
  const title = values.topic?.trim() || tool.name;
  const openResultInEditor = () => {
    if (!result) return;
    posthog.capture('ai_tool_result_opened_in_editor', {
      tool_slug: tool.slug,
      source_count: result.sources.length,
    });
    openInEditor({ title, html: editorHtml(result.markdown, result.sources, style), markdown: result.markdown, style: EDITOR_STYLE[style] });
  };

  return (
    <div>
      <form onSubmit={run} className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <Field key={field.name} field={field} signedIn={signedIn} path={path} value={values[field.name] ?? ''} onChange={(value) => setValues((current) => ({ ...current, [field.name]: value }))} />
        ))}
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button type="submit" disabled={running} className={`${btnPrimary} h-11 rounded-[10px] px-5 text-[15px]`}>
            {running ? <LuLoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {running ? 'Working…' : tool.submitLabel || 'Run'}
          </button>
          {!signedIn && <p className="text-[13px] text-muted">Free: {ANON_DAILY_RUNS} runs a day without an account. <Link href={signupHref(path)} className="underline underline-offset-2 hover:text-ink">Sign up free</Link> for more.</p>}
        </div>
      </form>

      <div aria-live="polite">
        {running && <p className="mt-6 flex items-center gap-2 text-[14.5px] text-muted"><LuLoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />{stage} <span className="text-subtle">{elapsed}s</span></p>}
        {error && (
          <div role="alert" className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[14.5px] text-amber-900">
            {error.message}
            {error.limit && <> <Link href={signedIn ? '/pricing' : signupHref(path)} className="font-medium underline">{signedIn ? 'See plans' : 'Create a free account'}</Link></>}
          </div>
        )}
      </div>

      {result && (
        <section ref={resultRef} aria-labelledby="result-title" className="mt-10 scroll-mt-24 rounded-2xl border border-line bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-2 px-5 py-3">
            <h2 id="result-title" className="text-[15px] font-semibold text-ink">Your result</h2>
            <div className="flex flex-wrap gap-2">
              <CopyButton text={plainText(result.markdown, result.sources, style)} label="Copy" />
              {tool.toEditor && (
                <button type="button" onClick={openResultInEditor}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand px-2.5 text-[13px] font-medium text-on-brand hover:bg-brand-600 ${focusRing}`}>
                  <LuFilePen className="h-3.5 w-3.5" aria-hidden="true" /> Open in the editor
                </button>
              )}
              <button type="button" onClick={() => { setResult(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-[13px] text-ink-2 hover:bg-soft ${focusRing}`}>
                <LuRotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Start again
              </button>
            </div>
          </div>
          <div className="wo-tool-result px-5 py-6 sm:px-8">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({ href, children }) => <Link href={href || '#'} className="text-brand underline decoration-brand-100 underline-offset-2 hover:decoration-brand">{children}</Link> }}>
              {linkMarkers(result.markdown, result.sources, style)}
            </ReactMarkdown>
          </div>
          {references.length > 0 && (
            <div className="border-t border-line-2 px-5 py-6 sm:px-8">
              <h3 className="text-[16px] font-semibold text-ink">{style === 'mla' ? 'Works Cited' : 'References'}</h3>
              <ol className="mt-3 flex flex-col gap-2.5">
                {references.map((reference, index) => (
                  <li key={result.sources[index].id} className="pl-8 -indent-8 font-serif text-[15px] leading-[1.6] text-ink-2 [overflow-wrap:anywhere]">
                    <Formatted text={reference} />{' '}
                    <Link href={`/research/papers/${result.sources[index].id}`} className="font-sans text-[12.5px] text-brand hover:underline">record</Link>
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-[13px] text-muted">Every reference is a real paper from the index. Check each one says what the text claims.</p>
            </div>
          )}
          {tool.toEditor && (
            <div className="flex flex-wrap items-center gap-3 border-t border-line-2 bg-soft px-5 py-4 sm:px-8">
              <p className="text-[14px] text-ink-2">Keep going in the editor: the citations stay live and the reference list updates itself.</p>
              <button type="button" onClick={openResultInEditor} className={`${btnGhost} h-9 rounded-[9px] px-3.5 text-[14px]`}>
                Open in the editor <LuArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
