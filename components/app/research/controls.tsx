'use client';

/**
 * Custom form controls for the research workspaces: a listbox dropdown, a number field with
 * steppers and a checkbox. They replace the browser's native select / number / checkbox so the
 * pickers match the app's tokens in both themes, and they keep keyboard and screen-reader support.
 */
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { LuCheck, LuChevronDown, LuMinus, LuPlus } from 'react-icons/lu';

// ------------------------------------------------------------------ dropdown

export type SelectOption<T extends string> = { value: T; label: string; detail?: string; icon?: React.ReactNode };

type SelectProps<T extends string> = {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  label: string;
  /** What the closed button shows; defaults to the chosen option's label. */
  display?: React.ReactNode;
  /** Small muted text before the value, e.g. "Role". */
  prefix?: string;
  icon?: React.ReactNode;
  /** `pill` for toolbars, `field` for full-width form rows. */
  variant?: 'pill' | 'field';
  /** Highlights the pill when a non-default value is chosen. */
  active?: boolean;
  align?: 'left' | 'right';
  className?: string;
  menuClassName?: string;
};

export function Select<T extends string>({
  value, options, onChange, label, display, prefix, icon, variant = 'pill', active = false, align = 'left', className = '', menuClassName = '',
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [upward, setUpward] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const typed = useRef({ text: '', at: 0 });
  const id = useId();
  const chosen = options.find((option) => option.value === value);

  const show = () => {
    setCursor(Math.max(0, options.findIndex((option) => option.value === value)));
    setOpen(true);
  };
  const close = (focus = true) => {
    setOpen(false);
    if (focus) button.current?.focus();
  };
  const pick = (index: number) => {
    const option = options[index];
    if (option) onChange(option.value);
    close();
  };

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const away = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) close(false); };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [open]);

  // Open upward when there is no room below; focus the list.
  useLayoutEffect(() => {
    if (!open || !root.current || !list.current) return;
    const box = root.current.getBoundingClientRect();
    const height = list.current.offsetHeight;
    setUpward(window.innerHeight - box.bottom < height + 12 && box.top > height + 12);
    list.current.focus({ preventScroll: true });
  }, [open]);

  // Keep the highlighted option in view.
  useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>(`[data-index="${cursor}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, cursor]);

  const onListKey = (event: React.KeyboardEvent) => {
    const last = options.length - 1;
    if (event.key === 'ArrowDown') { event.preventDefault(); setCursor((at) => Math.min(last, at + 1)); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setCursor((at) => Math.max(0, at - 1)); }
    else if (event.key === 'Home') { event.preventDefault(); setCursor(0); }
    else if (event.key === 'End') { event.preventDefault(); setCursor(last); }
    else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); pick(cursor); }
    else if (event.key === 'Escape') { event.preventDefault(); close(); }
    else if (event.key === 'Tab') close(false);
    else if (event.key.length === 1) {
      // Type to jump to an option.
      const now = Date.now();
      typed.current = { text: (now - typed.current.at > 600 ? '' : typed.current.text) + event.key.toLowerCase(), at: now };
      const match = options.findIndex((option) => option.label.toLowerCase().startsWith(typed.current.text));
      if (match >= 0) setCursor(match);
    }
  };

  const border = open || active ? 'border-brand' : 'border-line hover:border-line-3';
  const trigger = variant === 'pill'
    ? `h-8 rounded-full px-3 text-[13.5px] font-medium ${border} ${active ? 'bg-brand-50 text-brand' : 'bg-surface text-ink-2 hover:bg-soft'}`
    : `h-10 w-full rounded-[10px] px-3 text-[14px] text-ink bg-surface ${border}`;

  return (
    <div ref={root} className={`relative ${variant === 'field' ? 'w-full' : 'inline-block'} ${className}`}>
      <button ref={button} type="button" aria-haspopup="listbox" aria-expanded={open} aria-label={`${label}: ${chosen?.label ?? 'not set'}`}
        onClick={() => (open ? close() : show())}
        onKeyDown={(event) => { if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); show(); } }}
        className={`group inline-flex items-center gap-1.5 border transition-[background-color,border-color,box-shadow] focus-visible:border-brand focus-visible:shadow-[0_0_0_4px_var(--color-brand-50)] focus-visible:outline-none ${open ? 'shadow-[0_0_0_4px_var(--color-brand-50)]' : ''} ${trigger}`}>
        {icon && <span className="grid shrink-0 place-items-center text-muted group-aria-expanded:text-brand [&>svg]:h-3.5 [&>svg]:w-3.5" aria-hidden="true">{icon}</span>}
        {prefix && <span className="shrink-0 text-muted">{prefix}</span>}
        <span className={`truncate ${variant === 'field' ? 'flex-1 text-left' : ''} ${prefix ? 'font-semibold text-ink' : ''}`}>{display ?? chosen?.label ?? 'Choose'}</span>
        <LuChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform duration-200 ${open ? 'rotate-180 text-brand' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <ul ref={list} id={id} role="listbox" tabIndex={-1} aria-label={label} aria-activedescendant={`${id}-${cursor}`} onKeyDown={onListKey}
          className={`absolute z-40 max-h-72 min-w-full overflow-y-auto overscroll-contain rounded-xl border border-line bg-surface p-1.5 shadow-float outline-none animate-[wo-pop_140ms_ease-out] ${upward ? 'bottom-[calc(100%+6px)] origin-bottom' : 'top-[calc(100%+6px)] origin-top'} ${align === 'right' ? 'right-0' : 'left-0'} ${variant === 'pill' ? 'w-max max-w-[300px]' : ''} ${menuClassName}`}>
          {options.map((option, index) => {
            const selected = option.value === value;
            return (
              <li key={option.value} id={`${id}-${index}`} data-index={index} role="option" aria-selected={selected}
                onMouseEnter={() => setCursor(index)} onMouseDown={(event) => event.preventDefault()} onClick={() => pick(index)}
                className={`flex cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 text-[14px] transition-colors ${index === cursor ? 'bg-soft' : ''} ${selected ? 'text-brand' : 'text-ink'}`}>
                {option.icon && <span className="mt-0.5 grid shrink-0 place-items-center text-muted [&>svg]:h-4 [&>svg]:w-4" aria-hidden="true">{option.icon}</span>}
                <span className="min-w-0 flex-1">
                  <span className={`block leading-snug ${selected ? 'font-semibold' : 'font-medium'}`}>{option.label}</span>
                  {option.detail && <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">{option.detail}</span>}
                </span>
                <LuCheck className={`mt-0.5 h-4 w-4 shrink-0 text-brand transition-opacity ${selected ? 'opacity-100' : 'opacity-0'}`} aria-hidden="true" />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ multi-select dropdown

export type MultiOption<T extends string> = SelectOption<T> & { disabled?: boolean; title?: string };

type MultiSelectProps<T extends string> = {
  value: T[];
  options: MultiOption<T>[];
  onChange: (value: T[]) => void;
  label: string;
  icon?: React.ReactNode;
  /** At least this many must stay chosen (default 1). */
  min?: number;
  align?: 'left' | 'right';
  className?: string;
};

/** A pill that opens a list of checkable options; several may be on. */
export function MultiSelect<T extends string>({ value, options, onChange, label, icon, min = 1, align = 'left', className = '' }: MultiSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [upward, setUpward] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();
  const chosen = options.filter((option) => value.includes(option.value));
  const display = chosen.length === 0 ? 'None' : chosen.length === 1 ? chosen[0].label : `${chosen[0].label} +${chosen.length - 1}`;

  const close = (focus = true) => { setOpen(false); if (focus) button.current?.focus(); };
  const toggle = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    const on = value.includes(option.value);
    if (on && value.length <= min) return;
    onChange(on ? value.filter((item) => item !== option.value) : [...value, option.value]);
  };

  useEffect(() => {
    if (!open) return;
    const away = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) close(false); };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !root.current || !list.current) return;
    const box = root.current.getBoundingClientRect();
    const height = list.current.offsetHeight;
    setUpward(window.innerHeight - box.bottom < height + 12 && box.top > height + 12);
    list.current.focus({ preventScroll: true });
  }, [open]);

  const onListKey = (event: React.KeyboardEvent) => {
    const last = options.length - 1;
    if (event.key === 'ArrowDown') { event.preventDefault(); setCursor((at) => Math.min(last, at + 1)); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setCursor((at) => Math.max(0, at - 1)); }
    else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(cursor); }
    else if (event.key === 'Escape') { event.preventDefault(); close(); }
    else if (event.key === 'Tab') close(false);
  };

  return (
    <div ref={root} className={`relative inline-block ${className}`}>
      <button ref={button} type="button" aria-haspopup="listbox" aria-expanded={open} aria-label={`${label}: ${chosen.map((option) => option.label).join(', ') || 'none'}`}
        onClick={() => (open ? close() : (setCursor(0), setOpen(true)))}
        onKeyDown={(event) => { if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); setCursor(0); setOpen(true); } }}
        className={`group inline-flex h-8 max-w-full items-center gap-1 rounded-full border bg-surface px-2.5 text-[13px] font-medium text-ink-2 transition-[background-color,border-color,box-shadow] hover:bg-soft focus-visible:border-brand focus-visible:shadow-[0_0_0_4px_var(--color-brand-50)] focus-visible:outline-none ${open ? 'border-brand shadow-[0_0_0_4px_var(--color-brand-50)]' : 'border-line hover:border-line-3'}`}>
        {icon && <span className="grid shrink-0 place-items-center text-muted group-aria-expanded:text-brand [&>svg]:h-3.5 [&>svg]:w-3.5" aria-hidden="true">{icon}</span>}
        <span className="hidden shrink-0 text-muted sm:inline">{label}</span>
        <span className="truncate font-semibold text-ink">{display}</span>
        <LuChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform duration-200 ${open ? 'rotate-180 text-brand' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <ul ref={list} id={id} role="listbox" aria-multiselectable="true" tabIndex={-1} aria-label={label} aria-activedescendant={`${id}-${cursor}`} onKeyDown={onListKey}
          className={`absolute z-40 max-h-80 w-max min-w-[200px] max-w-[260px] overflow-y-auto overscroll-contain rounded-xl border border-line bg-surface p-1 shadow-float outline-none animate-[wo-pop_140ms_ease-out] ${upward ? 'bottom-[calc(100%+6px)] origin-bottom' : 'top-[calc(100%+6px)] origin-top'} ${align === 'right' ? 'right-0' : 'left-0'}`}>
          {options.map((option, index) => {
            const on = value.includes(option.value);
            return (
              <li key={option.value} id={`${id}-${index}`} role="option" aria-selected={on} aria-disabled={option.disabled || undefined} title={option.title}
                onMouseEnter={() => setCursor(index)} onMouseDown={(event) => event.preventDefault()} onClick={() => toggle(index)}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13.5px] transition-colors ${option.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${index === cursor ? 'bg-soft' : ''} ${on ? 'text-brand' : 'text-ink'}`}>
                <span aria-hidden="true" className={`grid h-4 w-4 shrink-0 place-items-center rounded-[5px] border transition-colors ${on ? 'border-brand bg-brand text-on-brand' : 'border-line-3 bg-surface'}`}>
                  <LuCheck strokeWidth={3.5} className={`h-2.5 w-2.5 transition-transform duration-150 ${on ? 'scale-100' : 'scale-0'}`} />
                </span>
                {option.icon && <span className="grid shrink-0 place-items-center text-muted [&>svg]:h-4 [&>svg]:w-4" aria-hidden="true">{option.icon}</span>}
                <span className="min-w-0 flex-1">
                  <span className={`block leading-snug ${on ? 'font-semibold' : 'font-medium'}`}>{option.label}</span>
                  {option.detail && <span className="block text-[12px] leading-snug text-muted">{option.detail}</span>}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ number field

type NumberFieldProps = {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  label: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  /** The value the steppers start from when the field is empty. */
  start?: number;
  suffix?: string;
  className?: string;
};

export function NumberField({ value, onChange, label, placeholder, min, max, step = 1, start, suffix, className = '' }: NumberFieldProps) {
  const clamp = (next: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, next));
  const bump = (by: number) => onChange(clamp(value === null || value === undefined ? (start ?? min ?? 0) : value + by));
  const stepper = 'grid h-full w-8 shrink-0 place-items-center text-muted transition-colors hover:bg-soft hover:text-ink disabled:pointer-events-none disabled:opacity-40';
  return (
    <div className={`group flex h-10 w-full items-center overflow-hidden rounded-[10px] border border-line bg-surface transition-[border-color,box-shadow] hover:border-line-3 focus-within:border-brand focus-within:shadow-[0_0_0_4px_var(--color-brand-50)] ${className}`}>
      <input aria-label={label} inputMode="numeric" placeholder={placeholder} value={value ?? ''}
        onChange={(event) => {
          const digits = event.target.value.replace(/[^\d]/g, '');
          onChange(digits ? Number(digits) : null);
        }}
        onBlur={() => { if (value !== null && value !== undefined && clamp(value) !== value) onChange(clamp(value)); }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowUp') { event.preventDefault(); bump(step); }
          if (event.key === 'ArrowDown') { event.preventDefault(); bump(-step); }
        }}
        className="h-full min-w-0 flex-1 bg-transparent pl-3 text-[14px] tabular-nums text-ink placeholder:text-subtle focus:outline-none" />
      {suffix && value !== null && value !== undefined && <span className="pr-1 text-[13px] text-muted">{suffix}</span>}
      <div className="flex h-full items-stretch border-l border-line-2">
        <button type="button" tabIndex={-1} aria-label={`Decrease ${label}`} disabled={value === null || value === undefined || (min !== undefined && value <= min)} onClick={() => bump(-step)} className={stepper}><LuMinus className="h-3.5 w-3.5" /></button>
        <button type="button" tabIndex={-1} aria-label={`Increase ${label}`} disabled={max !== undefined && value !== null && value !== undefined && value >= max} onClick={() => bump(step)} className={`${stepper} border-l border-line-2`}><LuPlus className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ checkbox

type CheckProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
  title?: string;
  className?: string;
  size?: 'sm' | 'md';
};

/** A labelled checkbox with a drawn tick. */
export function Check({ checked, onChange, children, title, className = '', size = 'md' }: CheckProps) {
  return (
    <label title={title} className={`group inline-flex cursor-pointer select-none items-center gap-2 ${size === 'sm' ? 'text-[13.5px]' : 'text-[14px]'} text-ink-2 ${className}`}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" />
      <span aria-hidden="true"
        className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[6px] border transition-[background-color,border-color,box-shadow] duration-150 peer-focus-visible:shadow-[0_0_0_4px_var(--color-brand-50)] ${checked ? 'border-brand bg-brand text-on-brand' : 'border-line-3 bg-surface group-hover:border-brand'}`}>
        <LuCheck strokeWidth={3.5} className={`h-3 w-3 transition-transform duration-150 ${checked ? 'scale-100' : 'scale-0'}`} />
      </span>
      <span className="inline-flex items-center gap-1.5">{children}</span>
    </label>
  );
}
