import { describe, expect, it } from 'vitest';
import { methodsFor, passwordSwitchProblem, redirectUri } from '../src/lib/signin.js';

const s = (values: Record<string, string>) => ({ signinPassword: 'on', signinGoogle: 'on', signinMicrosoft: 'on', signinApple: 'on', ...values }) as any;

describe('which sign-in methods show', () => {
  it('shows every method that is switched on', () => {
    expect(methodsFor(s({}))).toEqual({ password: true, google: true, microsoft: true, apple: true });
    expect(methodsFor(s({ signinMicrosoft: 'off' })).microsoft).toBe(false);
  });

  it('keeps email and password on while no provider can sign people up', () => {
    const none = s({ signinPassword: 'off', signinGoogle: 'off', signinMicrosoft: 'off', signinApple: 'off' });
    expect(methodsFor(none).password).toBe(true);
    expect(passwordSwitchProblem(none)).toMatch(/before turning off/);
    expect(passwordSwitchProblem(s({ signinPassword: 'off' }))).toBeNull();
    expect(methodsFor(s({ signinPassword: 'off' })).password).toBe(false);
  });

  it('gives Firebase\'s auth handler as the provider redirect URL', () => {
    process.env.FIREBASE_AUTH_DOMAIN = 'your-project.firebaseapp.com';
    expect(redirectUri('google')).toBe('https://your-project.firebaseapp.com/__/auth/handler');
  });
});
