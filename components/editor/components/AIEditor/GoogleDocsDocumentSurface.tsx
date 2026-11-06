'use client';

import type React from 'react';

type GoogleDocsDocumentSurfaceProps = {
  children: React.ReactNode;
  zoomPercentage?: number;
  pageWidthPx?: number;
  /** Phones: the text reflows to the screen width (Docs "Print layout" off), with no paper edges. */
  reflow?: boolean;
  /** Print layout: the editor draws the page edges between pages itself. */
  paginated?: boolean;
};

export default function GoogleDocsDocumentSurface({
  children,
  zoomPercentage = 100,
  pageWidthPx = 816,
  reflow = false,
  paginated = false,
}: GoogleDocsDocumentSurfaceProps) {
  const clampedZoom = Math.min(Math.max(zoomPercentage, 50), 200);

  if (reflow) {
    return <div className="w-full min-w-0 bg-surface">{children}</div>;
  }

  // Pageless (the default): the text sits on the white canvas, as in the mockups.
  if (!paginated) {
    return (
      <div className="mx-auto flex w-max min-w-full flex-col">
        <div
          className="relative mx-auto overflow-visible bg-surface"
          style={{ zoom: clampedZoom / 100, width: `${pageWidthPx}px`, ['--ce-canvas' as string]: '#ffffff' }}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-max min-w-full flex-col">
      <div className="relative px-4 pb-14 pt-0">
        <div
          className="relative mx-auto overflow-visible bg-surface shadow-[0_1px_2px_rgba(15,23,42,.06),0_0_0_1px_var(--color-line)]"
          style={{ zoom: clampedZoom / 100, width: `${pageWidthPx}px`, ['--ce-canvas' as string]: 'var(--color-soft)' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
