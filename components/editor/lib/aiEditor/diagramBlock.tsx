'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { createReactBlockSpec } from '@blocknote/react';
import toast from 'react-hot-toast';
import { DIAGRAM_KINDS, cachedSvg, downloadDiagram, drawDiagramWithAI, mermaidError, renderMermaid } from './mermaid';

/**
 * Diagram block: Mermaid source drawn as SVG (flowcharts, conceptual frameworks, study flows,
 * timelines). Click it to edit the source with a live preview, draw it with AI from a
 * description, or download it as SVG or PNG. Word and PDF exports carry it as an image.
 */

const STARTER = 'flowchart TD\n  A["Start"] --> B["Next step"]\n  B --> C["Result"]';

/** The source drawn as SVG, or the error mermaid gave. */
function useDiagram(source: string) {
  const [state, setState] = useState<{ svg: string; error: string | null }>(() => ({ svg: cachedSvg(source), error: null }));
  useEffect(() => {
    let live = true;
    if (!source.trim()) {
      setState({ svg: '', error: null });
      return undefined;
    }
    const timer = window.setTimeout(async () => {
      let next: { svg: string; error: string | null };
      try {
        const error = await mermaidError(source);
        next = error ? { svg: '', error } : { svg: await renderMermaid(source), error: null };
      } catch (failure) {
        next = { svg: '', error: String((failure as Error)?.message || failure).slice(0, 300) };
      }
      if (live) setState(next);
    }, 250);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [source]);
  return state;
}

const buttonClass = 'h-8 rounded-[9px] border border-line bg-surface px-3 text-[12.5px] font-semibold text-ink-2 hover:bg-soft disabled:opacity-60';

export function DiagramEditor({ initial, onSave, onCancel, onRemove }: { initial: string; onSave: (source: string) => void; onCancel: () => void; onRemove?: () => void }) {
  const [source, setSource] = useState(initial || STARTER);
  const [prompt, setPrompt] = useState('');
  const [kind, setKind] = useState(DIAGRAM_KINDS[0][0]);
  const [drawing, setDrawing] = useState(false);
  const [saving, setSaving] = useState(false);
  const preview = useDiagram(source);

  const draw = async () => {
    if (prompt.trim().length < 3) {
      toast.error('Describe the diagram first.');
      return;
    }
    setDrawing(true);
    try {
      const next = await drawDiagramWithAI(prompt.trim(), kind);
      const error = await mermaidError(next);
      setSource(next);
      if (error) toast.error('The drawn diagram has an error. Fix it in the source before inserting.');
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setDrawing(false);
    }
  };

  const save = async () => {
    setSaving(true);
    const error = await mermaidError(source.trim()).catch((failure) => String((failure as Error)?.message || failure));
    setSaving(false);
    if (error) {
      toast.error('Fix the diagram before inserting it.');
      return;
    }
    onSave(source.trim());
  };

  const exportAs = (format: 'svg' | 'png') => downloadDiagram(source.trim(), format).catch((error) => toast.error((error as Error).message));

  return createPortal(
    <div
      className="fixed inset-0 z-[16500] flex items-end justify-center bg-[rgba(15,23,42,0.35)] p-0 sm:items-center sm:p-4"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Diagram"
        className="flex max-h-[92dvh] w-full max-w-[760px] flex-col overflow-y-auto rounded-t-[24px] border border-line bg-surface p-4 shadow-[0_22px_50px_-18px_rgba(15,23,42,0.35)] sm:rounded-[16px]"
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Escape') {
            event.preventDefault();
            onCancel();
          }
        }}
      >
        <h2 className="text-[18px] font-bold tracking-[-0.01em] text-ink">Diagram</h2>
        <div className="mt-3 rounded-xl bg-soft p-3">
          <div className="mb-1.5 text-[12px] font-semibold text-ink-2">Draw with AI (1 credit)</div>
          <div className="flex flex-col gap-1.5 sm:flex-row">
            <select value={kind} onChange={(event) => setKind(event.target.value)} aria-label="Kind of diagram" className="h-9 rounded-[10px] border border-line bg-surface px-2 text-[13px] text-ink outline-none focus:border-brand">
              {DIAGRAM_KINDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <input
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); draw(); } }}
              maxLength={4000}
              placeholder="e.g. Screening of 1,240 records down to 32 included studies"
              aria-label="What to draw"
              className="h-9 min-w-0 flex-1 rounded-[10px] border border-line bg-surface px-3 text-[13px] text-ink outline-none focus:border-brand"
            />
            <button type="button" onClick={draw} disabled={drawing} className="h-9 rounded-[10px] bg-[var(--theme-primary,var(--color-brand))] px-4 text-[12.5px] font-semibold text-white disabled:opacity-60">
              {drawing ? 'Drawing…' : 'Draw'}
            </button>
          </div>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="block text-[12px] font-semibold text-ink-2">
            Mermaid source
            <textarea
              value={source}
              onChange={(event) => setSource(event.target.value)}
              rows={12}
              spellCheck={false}
              className="mt-1 block w-full resize-y rounded-[10px] border border-line px-3 py-2 font-mono text-[12.5px] font-normal text-ink outline-none focus:border-[var(--theme-primary,var(--color-brand))]"
            />
          </label>
          <div className="min-w-0">
            <div className="text-[12px] font-semibold text-ink-2">Preview</div>
            <div className="mt-1 flex min-h-[220px] items-center justify-center overflow-auto rounded-xl border border-line-2 bg-white p-2">
              {preview.error ? <p className="text-[12.5px] text-[#b91c1c]">{preview.error}</p>
                : preview.svg ? <div className="ce-diagram-svg" dangerouslySetInnerHTML={{ __html: preview.svg }} />
                  : <span className="text-[12px] text-subtle">Drawing…</span>}
            </div>
          </div>
        </div>
        <p className="mt-2 text-[12px] text-muted">Mermaid syntax: one step per line, e.g. <code className="font-mono">A["Label"] --&gt; B["Label"]</code>.</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1.5">
            {onRemove ? <button type="button" onClick={onRemove} className="h-8 rounded-[9px] px-3 text-[12.5px] font-semibold text-[#b91c1c] hover:bg-[#fef2f2]">Remove</button> : null}
            <button type="button" onClick={() => exportAs('svg')} disabled={!preview.svg} className={buttonClass}>SVG</button>
            <button type="button" onClick={() => exportAs('png')} disabled={!preview.svg} className={buttonClass}>PNG</button>
          </div>
          <div className="flex gap-1.5">
            <button type="button" onClick={onCancel} className={buttonClass}>Cancel</button>
            <button type="button" onClick={save} disabled={saving || Boolean(preview.error)} className="h-8 rounded-[10px] bg-[var(--theme-primary,var(--color-brand))] shadow-[0_6px_16px_-8px_rgba(var(--brand-rgb),0.8)] px-4 text-[12.5px] font-semibold text-white disabled:opacity-60">Done</button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function DiagramBlockView({ block, editor }: { block: any; editor: any }) {
  const source = String(block.props.source || '');
  const [open, setOpen] = useState(false);
  const diagram = useDiagram(source);
  const close = useCallback(() => setOpen(false), []);
  const ref = useRef<HTMLDivElement>(null);
  // A new, empty diagram opens its editor straight away.
  useEffect(() => {
    if (!source && block.props.autoOpen !== 'false' && editor.isEditable) setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div
      ref={ref}
      className="ce-diagram-block"
      contentEditable={false}
      role="button"
      tabIndex={0}
      aria-label="Diagram"
      onMouseDown={(event) => {
        if (event.button !== 0 || !editor.isEditable || open) return;
        event.preventDefault();
        setOpen(true);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && editor.isEditable) {
          event.preventDefault();
          setOpen(true);
        }
      }}
    >
      {diagram.svg ? <div className="ce-diagram-svg" dangerouslySetInnerHTML={{ __html: diagram.svg }} />
        : diagram.error ? <span className="text-[13px] text-[#b91c1c]">This diagram has an error. Click to fix it.</span>
          : <span className="text-[13px] text-subtle">{source ? 'Drawing…' : 'Click to add a diagram'}</span>}
      {open ? (
        <DiagramEditor
          initial={source}
          onCancel={close}
          onSave={(next) => {
            setOpen(false);
            editor.updateBlock(block, { props: { source: next, autoOpen: 'false' } });
          }}
          onRemove={() => {
            setOpen(false);
            editor.removeBlocks([block]);
          }}
        />
      ) : null}
    </div>
  );
}

export const diagramBlockSpec = createReactBlockSpec(
  { type: 'mermaid', propSchema: { source: { default: '' }, autoOpen: { default: 'true' } }, content: 'none' },
  {
    render: ({ block, editor }) => <DiagramBlockView block={block} editor={editor} />,
    // Copy and paste keep the source; the drawing comes along when it has been drawn.
    toExternalHTML: ({ block }) => (
      <div data-content-type="mermaid" data-source={block.props.source} dangerouslySetInnerHTML={{ __html: cachedSvg(String(block.props.source || '')) }} />
    ),
    parse: (element) => (element.getAttribute('data-content-type') === 'mermaid' ? { source: element.getAttribute('data-source') || '', autoOpen: 'false' } : undefined),
  },
);

export const DIAGRAM_CSS = `
  .ce-diagram-block { display: block; width: 100%; padding: 10px 8px; margin: 4px 0; text-align: center; border-radius: 8px; overflow-x: auto; }
  [contenteditable="true"] .ce-diagram-block { cursor: pointer; }
  [contenteditable="true"] .ce-diagram-block:hover { background: var(--color-soft); }
  .ce-diagram-svg svg { max-width: 100%; height: auto; margin: 0 auto; display: block; }
`;
