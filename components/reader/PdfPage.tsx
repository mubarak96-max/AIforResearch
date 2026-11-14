'use client';

import { memo, useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { colorOf, loadPdfJs, type Highlight } from './pdf';

/** pdf.js text layer rules (from its pdf_viewer.css): transparent text placed over the canvas so it can be selected. */
export const TEXT_LAYER_CSS = `
.reader-text-layer{position:absolute;text-align:initial;inset:0;overflow:clip;opacity:1;line-height:1;text-size-adjust:none;forced-color-adjust:none;transform-origin:0 0;caret-color:CanvasText;z-index:2;--min-font-size:1;--text-scale-factor:calc(var(--total-scale-factor) * var(--min-font-size));--min-font-size-inv:calc(1 / var(--min-font-size))}
.reader-text-layer :is(span,br){color:transparent;position:absolute;white-space:pre;cursor:text;transform-origin:0% 0%}
.reader-text-layer > :not(.markedContent),.reader-text-layer .markedContent span:not(.markedContent){z-index:1;--font-height:0;font-size:calc(var(--text-scale-factor) * var(--font-height));--scale-x:1;--rotate:0deg;transform:rotate(var(--rotate)) scaleX(var(--scale-x)) scale(var(--min-font-size-inv))}
.reader-text-layer .markedContent{display:contents}
.reader-text-layer span[role="img"]{user-select:none;cursor:default}
.reader-text-layer ::selection{background:rgb(30 58 95 / 0.28)}
.reader-text-layer br::selection{background:transparent}
.reader-text-layer .endOfContent{display:block;position:absolute;inset:100% 0 0;z-index:0;cursor:default;user-select:none}
.reader-text-layer.selecting .endOfContent{top:0}
@keyframes reader-flash{0%,100%{outline-color:transparent}20%,60%{outline-color:var(--color-brand)}}
.reader-flash{outline:3px solid transparent;outline-offset:2px;animation:reader-flash 1.6s ease-in-out}
`;

type Props = {
  pdf: PDFDocumentProxy; number: number; scale: number; size: { w: number; h: number }; render: boolean;
  highlights: Highlight[]; selectedId: string | null; flashId: string | null;
  onSize: (page: number, size: { w: number; h: number }) => void;
  onPick: (highlight: Highlight) => void;
  children?: React.ReactNode;
};

/** One page: a sized placeholder, and when near the viewport its canvas, text layer and highlights. */
export const PdfPage = memo(function PdfPage({ pdf, number, scale, size, render, highlights, selectedId, flashId, onSize, onPick, children }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [drawn, setDrawn] = useState(false);
  const width = size.w * scale;
  const height = size.h * scale;

  useEffect(() => {
    if (!render) { setDrawn(false); return; }
    let cancelled = false;
    let task: RenderTask | null = null;
    let text: { cancel: () => void } | null = null;
    (async () => {
      const [{ TextLayer }, page] = await Promise.all([loadPdfJs(), pdf.getPage(number)]);
      if (cancelled) return;
      const base = page.getViewport({ scale: 1 });
      if (Math.abs(base.width - size.w) > 0.5 || Math.abs(base.height - size.h) > 0.5) onSize(number, { w: base.width, h: base.height });
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const layer = textRef.current;
      if (!canvas || !layer) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(viewport.width * ratio);
      canvas.height = Math.floor(viewport.height * ratio);
      task = page.render({ canvas, viewport, transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0] });
      await task.promise;
      if (cancelled) return;
      setDrawn(true);
      layer.replaceChildren();
      const textLayer = new TextLayer({ textContentSource: page.streamTextContent(), container: layer, viewport });
      text = textLayer;
      await textLayer.render();
    })().catch((error: Error) => {
      if (!cancelled && error?.name !== 'RenderingCancelledException' && error?.name !== 'AbortException') setFailed(true);
    });
    return () => { cancelled = true; task?.cancel(); text?.cancel(); };
  }, [render, scale, pdf, number]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div data-reader-page={number} aria-label={`Page ${number}`} role="region"
      className="relative mx-auto shrink-0 bg-white shadow-[0_1px_3px_rgba(15,23,42,.18)]"
      style={{ width, height, ['--scale-factor' as string]: scale, ['--total-scale-factor' as string]: scale, ['--scale-round-x' as string]: '1px', ['--scale-round-y' as string]: '1px' }}>
      {render ? <>
        <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 block" style={{ width, height }} />
        <div className="pointer-events-none absolute inset-0 z-[1]" aria-hidden="true">
          {highlights.flatMap((highlight) => highlight.rects.map((rect, index) => (
            <div key={`${highlight.id}-${index}`}
              className={`absolute rounded-[2px] mix-blend-multiply ${flashId === highlight.id ? 'reader-flash' : ''} ${selectedId === highlight.id ? 'ring-2 ring-brand/60' : ''}`}
              style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.w * 100}%`, height: `${rect.h * 100}%`, background: colorOf(highlight.color).fill }} />
          )))}
        </div>
        <div ref={textRef} className="reader-text-layer" />
        {/* A small tab per highlight in the margin: clicking text selects it, so highlights are picked from here. */}
        {highlights.map((highlight) => highlight.rects[0] && (
          <button key={highlight.id} type="button" onClick={() => onPick(highlight)} aria-label={`Highlight on page ${number}: ${highlight.quote.slice(0, 80)}`}
            className="absolute z-[3] h-3.5 w-1.5 -translate-x-[10px] rounded-full opacity-80 hover:opacity-100 focus-visible:opacity-100"
            style={{ left: `${Math.max(0, highlight.rects[0].x) * 100}%`, top: `${highlight.rects[0].y * 100}%`, background: colorOf(highlight.color).dot }} />
        ))}
        {!drawn && !failed && <p className="absolute inset-x-0 top-1/3 text-center text-[13px] text-neutral-400">Page {number}</p>}
        {failed && <p className="absolute inset-x-4 top-1/3 text-center text-[13px] text-red-700">Page {number} could not be shown.</p>}
        {children}
      </> : <p className="absolute inset-x-0 top-1/3 text-center text-[13px] text-neutral-400">Page {number}</p>}
    </div>
  );
});
