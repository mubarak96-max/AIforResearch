'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { LuMoon, LuSun } from 'react-icons/lu';
import { APP_ROUTE_RE, THEME_STORAGE_KEY, type ThemePreference } from './themeScript';

export type ResolvedTheme = 'light' | 'dark';

/* ---------- Preference store (localStorage + in-tab listeners) ---------- */

const listeners = new Set<() => void>();

function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'dark' || value === 'system' ? value : 'light';
  } catch {
    return 'light';
  }
}

export function setThemePreference(preference: ThemePreference) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    /* private mode: the choice lasts for this page only */
  }
  listeners.forEach((listener) => listener());
}

function subscribePreference(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => { if (event.key === THEME_STORAGE_KEY) listener(); };
  window.addEventListener('storage', onStorage);
  // The editor package switches theme through this event (see components/editor/lib/aiEditor/hostTheme).
  window.addEventListener('wo-theme-change', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('wo-theme-change', listener);
  };
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribePreference, readPreference, () => 'light');
}

/* ---------- The theme actually on <html> ---------- */

function readResolved(): ResolvedTheme {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

function subscribeResolved(listener: () => void) {
  const observer = new MutationObserver(listener);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}

/** The theme currently applied, for libraries that need it as a prop (Mantine, BlockNote). */
export function useResolvedTheme(): ResolvedTheme {
  return useSyncExternalStore(subscribeResolved, readResolved, () => 'light');
}

/* ---------- Keeps <html data-theme> in step with preference, route and OS ---------- */

export function ThemeSync() {
  const pathname = usePathname();
  const preference = useThemePreference();

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const wantsDark = preference === 'dark' || (preference === 'system' && media.matches);
      const dark = wantsDark && APP_ROUTE_RE.test(pathname || '/');
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    };
    apply();
    if (preference !== 'system') return;
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [pathname, preference]);

  return null;
}

/* ---------- Toggle ---------- */

/** Icon button that switches between the light and dark theme. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const resolved = useResolvedTheme();
  const dark = resolved === 'dark';
  const label = dark ? 'Switch to light theme' : 'Switch to dark theme';
  return (
    <button
      type="button"
      onClick={() => setThemePreference(dark ? 'light' : 'dark')}
      aria-label={label}
      title={label}
      className={`grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-line-2 hover:text-ink ${className}`}
    >
      {dark ? <LuSun className="h-[17px] w-[17px]" aria-hidden="true" /> : <LuMoon className="h-[17px] w-[17px]" aria-hidden="true" />}
    </button>
  );
}

/** Three-way choice for settings pages: Light, Dark, or follow the system. */
export function ThemeChooser() {
  const preference = useThemePreference();
  const options: { value: ThemePreference; label: string }[] = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
  ];
  return (
    <div role="radiogroup" aria-label="Theme" className="inline-flex rounded-[11px] border border-line bg-soft p-1">
      {options.map((option) => {
        const on = preference === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setThemePreference(option.value)}
            className={`h-8 rounded-[8px] px-3.5 text-[13.5px] font-medium transition-colors ${on ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink'}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
