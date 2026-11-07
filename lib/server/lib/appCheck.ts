import type { MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { env } from '../env.js';
import { adminAppCheck } from '../firebase.js';

/**
 * Checks the App Check token (X-Firebase-AppCheck) the browser sends. Firebase gets that token
 * by running a reCAPTCHA Enterprise assessment, so this is the server half of reCAPTCHA. Our
 * code never calls the reCAPTCHA API itself.
 *
 * With APP_CHECK_ENFORCE=on, a request with a missing or invalid token gets a 401. When it is
 * off, the request goes through, and an invalid token is logged so you can see how many
 * requests would fail before you turn enforcement on.
 */
export const requireAppCheck: MiddlewareHandler = async (c, next) => {
  const token = c.req.header('X-Firebase-AppCheck');
  let valid = false;
  if (token) {
    try {
      await adminAppCheck().verifyToken(token);
      valid = true;
    } catch (error) {
      console.warn('App Check token refused', (error as Error).message);
    }
  }
  if (!valid && env.appCheckEnforce) {
    throw new HTTPException(401, { message: 'The security check failed. Reload the page and try again.' });
  }
  await next();
};
