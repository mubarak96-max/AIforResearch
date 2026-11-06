/**
 * Theme preference: "light" (default), "dark" or "system". Stored in localStorage.
 * Dark ("Nocturne") applies only inside the app; marketing and sign-in pages stay light.
 */
export type ThemePreference = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'wo-theme';

/** Routes that may use the dark theme. Keep in sync with APP_ROUTE_SOURCE below. */
export const APP_ROUTE_RE = /^\/(editor|library|papers|chat|account|admin|developers\/keys)(\/|$)/;
const APP_ROUTE_SOURCE = APP_ROUTE_RE.source;

/**
 * Runs in <head> before first paint so the page never flashes the wrong theme.
 * Kept tiny and dependency-free on purpose.
 */
export const themeInitScript = `(function(){try{var p=localStorage.getItem('${THEME_STORAGE_KEY}');var d=p==='dark'||(p==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var a=new RegExp(${JSON.stringify(APP_ROUTE_SOURCE)}).test(location.pathname);document.documentElement.setAttribute('data-theme',d&&a?'dark':'light');}catch(e){}})();`;
