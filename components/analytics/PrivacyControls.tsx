'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  EMPTY_PRIVACY_CHOICE, parsePrivacyChoice, PRIVACY_CHANGED_EVENT, PRIVACY_SETTINGS_EVENT,
  PRIVACY_STORAGE_KEY, publicAnalyticsPath, type PrivacyChoice,
} from '@/lib/analyticsPrivacy';

// Preserve the existing projects. Neither script is loaded in private workspaces.
const GTM_ID = 'GTM-THRFTJ7T';
const CLARITY_ID = 'zbxvles1es';
type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  clarity?: ((...args: unknown[]) => void) & { q?: unknown[][] };
};
const browser = () => window as AnalyticsWindow;
const publicLocation = () => publicAnalyticsPath(`${window.location.pathname}${window.location.search}${window.location.hash}`);
const DENIED = { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' };

function stopTracking() {
  // Denying consent alone permits cookieless collection. Stop the recorder as well.
  browser().clarity?.('consentv2', { ad_Storage: 'denied', analytics_Storage: 'denied' });
  browser().clarity?.('stop');
  browser().gtag?.('consent', 'update', DENIED);
  document.getElementById('research-gtm')?.remove();
  document.getElementById('research-clarity')?.remove();
}

function addScript(id: string, src: string) {
  if (document.getElementById(id)) return;
  const script = document.createElement('script');
  script.id = id;
  script.async = true;
  script.src = src;
  script.onload = () => { if (!publicLocation()) stopTracking(); };
  document.head.appendChild(script);
}

export function PrivacySettingsButton({ className = '' }: { className?: string }) {
  return <button type="button" onClick={() => window.dispatchEvent(new Event(PRIVACY_SETTINGS_EVENT))} className={`text-brand underline underline-offset-4 ${className}`}>Privacy and cookie choices</button>;
}

/** Consent for every visitor, independent of location. Optional scripts stay on public pages. */
export function PrivacyControls({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const [choice, setChoice] = useState<PrivacyChoice | null>(null);
  const [draft, setDraft] = useState({ analytics: false, recordings: false });
  const [open, setOpen] = useState(false);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [storageError, setStorageError] = useState('');
  const loaded = useRef(false);

  useEffect(() => {
    const read = () => {
      let next = { ...EMPTY_PRIVACY_CHOICE };
      try { next = parsePrivacyChoice(localStorage.getItem(PRIVACY_STORAGE_KEY)); } catch { /* Defaults remain off. */ }
      setChoice(next); setDraft(next);
      if (!next.savedAt && publicLocation()) setOpen(true);
      return next;
    };
    read();
    const show = () => { const next = read(); setDraft(next); setOpen(true); };
    const storage = (event: StorageEvent) => {
      if (event.key !== PRIVACY_STORAGE_KEY) return;
      const next = read();
      if (loaded.current && (!next.analytics || !next.recordings)) {
        stopTracking(); window.location.reload();
      }
    };
    window.addEventListener(PRIVACY_SETTINGS_EVENT, show);
    window.addEventListener('storage', storage);
    return () => { window.removeEventListener(PRIVACY_SETTINGS_EVENT, show); window.removeEventListener('storage', storage); };
  }, []);

  useEffect(() => {
    // A full document navigation discards all previously loaded tag code before private
    // screens mount. Intercept links and programmatic history changes before recording.
    const mustLeave = (url: URL) => loaded.current && url.origin === window.location.origin && !publicAnalyticsPath(`${url.pathname}${url.search}${url.hash}`);
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
      const url = new URL(link.href, window.location.href);
      if (!mustLeave(url)) return;
      event.preventDefault(); event.stopPropagation(); stopTracking(); window.location.assign(url.href);
    };
    const originalPush = window.history.pushState;
    const originalReplace = window.history.replaceState;
    const guard = (original: History['pushState']): History['pushState'] => function (data, unused, url) {
      const target = url == null ? null : new URL(String(url), window.location.href);
      if (target && mustLeave(target)) { stopTracking(); window.location.assign(target.href); return; }
      original.call(window.history, data, unused, url);
    };
    const push = guard(originalPush); const replace = guard(originalReplace);
    window.history.pushState = push; window.history.replaceState = replace;
    const pop = () => { if (loaded.current && !publicLocation()) { stopTracking(); window.location.reload(); } };
    document.addEventListener('click', click, true);
    window.addEventListener('popstate', pop);
    return () => {
      document.removeEventListener('click', click, true); window.removeEventListener('popstate', pop);
      if (window.history.pushState === push) window.history.pushState = originalPush;
      if (window.history.replaceState === replace) window.history.replaceState = originalReplace;
    };
  }, []);

  useLayoutEffect(() => {
    if (loaded.current && !publicLocation()) {
      stopTracking(); window.location.reload();
    }
  }, [pathname]);

  useEffect(() => {
    if (!choice || !publicLocation() || (!choice.analytics && !choice.recordings)) return;
    loaded.current = true; setScriptsLoaded(true);
    const target = browser();
    if (choice.analytics && !document.getElementById('research-gtm')) {
      target.dataLayer = target.dataLayer || [];
      target.gtag = function () { target.dataLayer!.push(arguments); };
      target.gtag('consent', 'default', DENIED);
      target.gtag('consent', 'update', { ...DENIED, analytics_storage: 'granted' });
      target.gtag('set', 'ads_data_redaction', true);
      target.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
      addScript('research-gtm', `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`);
    }
    if (choice.recordings && !document.getElementById('research-clarity')) {
      target.clarity = target.clarity || Object.assign((...args: unknown[]) => { (target.clarity!.q ||= []).push(args); }, { q: [] as unknown[][] });
      target.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' });
      addScript('research-clarity', `https://www.clarity.ms/tag/${CLARITY_ID}`);
    }
  }, [choice, pathname]);

  const save = (values: { analytics: boolean; recordings: boolean }) => {
    const next = { ...values, savedAt: Date.now() };
    try { localStorage.setItem(PRIVACY_STORAGE_KEY, JSON.stringify(next)); } catch {
      stopTracking();
      setChoice({ ...EMPTY_PRIVACY_CHOICE });
      setStorageError('This browser could not save your choice. Optional tracking is stopped on this page. Use your browser’s storage settings to keep it off on later visits.');
      return;
    }
    const revoke = loaded.current && ((choice?.analytics && !next.analytics) || (choice?.recordings && !next.recordings));
    setChoice(next); setStorageError(''); setOpen(false); window.dispatchEvent(new Event(PRIVACY_CHANGED_EVENT));
    if (revoke) { stopTracking(); window.location.reload(); }
  };

  // A programmatic route change can render before the history callback. Keep private DOM
  // out of the old document until the fresh, tracker-free navigation completes.
  const blockPrivateRender = scriptsLoaded && !publicAnalyticsPath(pathname);
  return <>
    {blockPrivateRender ? null : children}
    {open && <section aria-label="Privacy choices" data-clarity-mask="true" className="fixed bottom-4 left-4 right-4 z-[100] max-w-xl rounded-xl border border-line bg-surface p-5 text-ink shadow-xl sm:left-auto sm:w-[440px]">
      <h2 className="text-base font-semibold">Your privacy choices</h2>
      <p className="mt-2 text-sm text-muted">Essential storage keeps the app working. Optional analytics is off until you choose. Your choice applies in this browser for 180 days.</p>
      {storageError && <p role="alert" className="mt-2 text-sm text-red-700">{storageError}</p>}
      <label className="mt-4 flex items-start gap-2.5 text-sm"><input type="checkbox" className="mt-0.5" checked={draft.analytics} onChange={(event) => setDraft({ ...draft, analytics: event.target.checked })} /><span>Usage analytics: public-page visits and content-free feature counts. No document text, questions, source names or document IDs.</span></label>
      <label className="mt-3 flex items-start gap-2.5 text-sm"><input type="checkbox" className="mt-0.5" checked={draft.recordings} onChange={(event) => setDraft({ ...draft, recordings: event.target.checked })} /><span>I am 18 or older and allow Microsoft Clarity session recordings on public information pages. Private workspaces and tools are excluded.</span></label>
      <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => save({ analytics: false, recordings: false })} className="rounded-lg border border-line px-3 py-2 text-sm font-medium">Essential only</button><button type="button" onClick={() => save(draft)} className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white">Save choices</button></div>
      <a href="/cookies#analytics" className="mt-3 inline-block text-xs text-muted underline underline-offset-4">Details and privacy policy</a>
    </section>}
  </>;
}
