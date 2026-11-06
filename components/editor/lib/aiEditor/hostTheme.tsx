'use client';

/**
 * The host app owns the light/dark theme (it sets <html data-theme>). The editor only reads it,
 * so Mantine and BlockNote can match, and can ask the host to switch.
 * Contract with the host: localStorage key "wo-theme" + a "wo-theme-change" window event.
 */
import { useSyncExternalStore } from 'react';
import { LuMoon, LuSun } from 'react-icons/lu';

export type HostTheme = 'light' | 'dark';

const read = (): HostTheme =>
  document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';

function subscribe(listener: () => void) {
  const observer = new MutationObserver(listener);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}

export function useHostTheme(): HostTheme {
  return useSyncExternalStore(subscribe, read, () => 'light');
}

export function requestHostTheme(theme: HostTheme) {
  try { localStorage.setItem('wo-theme', theme); } catch { /* ignore */ }
  window.dispatchEvent(new Event('wo-theme-change'));
}

export function HostThemeToggle({ className = '' }: { className?: string }) {
  const dark = useHostTheme() === 'dark';
  const label = dark ? 'Switch to light theme' : 'Switch to dark theme';
  return (
    <button type="button" onClick={() => requestHostTheme(dark ? 'light' : 'dark')} aria-label={label} title={label} className={className}>
      {dark ? <LuSun className="h-[17px] w-[17px]" aria-hidden="true" /> : <LuMoon className="h-[17px] w-[17px]" aria-hidden="true" />}
    </button>
  );
}
