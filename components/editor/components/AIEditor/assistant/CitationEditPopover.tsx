'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CitationDecoration } from '../../../lib/aiEditor/citationText';

/** Edit one in-text citation: page/locator, prefix, suffix, narrative form, or remove it. */
export default function CitationEditPopover({
  anchor,
  title,
  initial,
  onSave,
  onRemove,
  onClose,
}: {
  anchor: DOMRect;
  title: string;
  initial: CitationDecoration;
  onSave: (value: CitationDecoration) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState<CitationDecoration>({ mode: initial.mode || '', locator: initial.locator || '', prefix: initial.prefix || '', suffix: initial.suffix || '' });
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    const timer = window.setTimeout(() => window.addEventListener('pointerdown', onPointer, true), 0);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointerdown', onPointer, true);
    };
  }, [onClose]);
  const width = Math.min(340, window.innerWidth - 16);
  const left = Math.max(8, Math.min(anchor.left, window.innerWidth - width - 8));
  const top = anchor.bottom + 300 > window.innerHeight ? Math.max(8, anchor.top - 308) : anchor.bottom + 8;
  const field = 'h-9 w-full rounded-lg border border-line px-2.5 text-[13px] outline-none focus:border-[var(--theme-primary,var(--color-brand))] focus:shadow-[0_0_0_4px_var(--color-brand-50)]';
  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label="Edit citation"
      style={{ position: 'fixed', top, left, width, zIndex: 16100 }}
      className="rounded-[14px] border border-line bg-surface p-3.5 shadow-[0_22px_50px_-18px_rgba(15,23,42,0.35)]"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
        if (event.key === 'Enter') onSave(value);
      }}
    >
      <div className="mb-2 line-clamp-2 text-[12.5px] font-medium text-ink">{title}</div>
      <div className="mb-2 inline-flex rounded-full bg-line-2 p-0.5 text-[12px]">
        {[{ id: '', label: '(Author, Year)' }, { id: 'narrative', label: 'Author (Year)' }].map((option) => (
          <button
            key={option.id || 'parenthetical'}
            type="button"
            onClick={() => setValue((current) => ({ ...current, mode: option.id }))}
            className={`h-7 rounded-full px-3 ${value.mode === option.id ? 'bg-surface font-medium shadow-sm' : 'text-muted'}`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="col-span-2 text-[11.5px] text-muted">
          Page or locator
          <input autoFocus value={value.locator} onChange={(event) => setValue({ ...value, locator: event.target.value })} placeholder="p. 12" className={field} />
        </label>
        <label className="text-[11.5px] text-muted">
          Prefix
          <input value={value.prefix} onChange={(event) => setValue({ ...value, prefix: event.target.value })} placeholder="see" className={field} />
        </label>
        <label className="text-[11.5px] text-muted">
          Suffix
          <input value={value.suffix} onChange={(event) => setValue({ ...value, suffix: event.target.value })} placeholder="emphasis added" className={field} />
        </label>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <button type="button" onClick={onRemove} className="h-8 rounded-[9px] px-3 text-[12.5px] font-semibold text-[#b91c1c] hover:bg-[#fef2f2]">Remove</button>
        <div className="flex gap-1.5">
          <button type="button" onClick={onClose} className="h-8 rounded-[9px] border border-line bg-surface px-3 text-[12.5px] font-semibold text-ink-2 hover:bg-soft">Cancel</button>
          <button type="button" onClick={() => onSave(value)} className="h-8 rounded-[10px] bg-[var(--theme-primary,var(--color-brand))] shadow-[0_6px_16px_-8px_rgba(var(--brand-rgb),0.8)] px-4 text-[12.5px] font-semibold text-white">Done</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
