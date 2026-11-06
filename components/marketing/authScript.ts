/** Set by the app at sign-in (lib/session.ts); not a secret, only a hint for the first paint. */
export const SIGNED_IN_COOKIE = 'writeorbit_signed_in';

/**
 * Runs in <head> before first paint: marks <html data-auth="in"> when the sign-in cookie is set,
 * so CSS shows the signed-in variant of each AuthAware block straight away. The pages themselves
 * stay static (no cookies() on the server), which lets them be cached and served fast.
 */
export const authInitScript = `(function(){try{if(/(?:^|; )${SIGNED_IN_COOKIE}=1(?:;|$)/.test(document.cookie))document.documentElement.setAttribute('data-auth','in');}catch(e){}})();`;
