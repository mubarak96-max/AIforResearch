import { describe, expect, it } from 'vitest';
import { METHODS, redirectUri } from '../../lib/server/lib/signin.js';

describe('sign-in methods', () => {
  it('offers email and password, and Google', () => {
    expect(METHODS).toEqual({ password: true, google: true });
  });

  it('gives Firebase\'s auth handler as the provider redirect URL', () => {
    process.env.FIREBASE_AUTH_DOMAIN = 'your-project.firebaseapp.com';
    expect(redirectUri('google')).toBe('https://your-project.firebaseapp.com/__/auth/handler');
  });
});
