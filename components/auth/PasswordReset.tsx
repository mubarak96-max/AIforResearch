'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { LuCircleCheck, LuMailCheck } from 'react-icons/lu';
import { applyActionCode, confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase';
import { friendly, getToken, refreshSession, signIn } from '@/lib/session';
import { sendPasswordReset } from '@/lib/signin';
import { btnGhost, btnPrimary, focusRing } from '@/components/marketing/styles';
import { AuthCard } from './AuthCard';
import { EMAIL_PATTERN, Field, MIN_PASSWORD_LENGTH, PasswordInput, errorMessage, inputClass, useQueryParams } from './fields';

/**
 * Password reset and email confirmation, with Firebase Authentication. Firebase emails the
 * links; set the action URL to https://<your site>/auth/action in Firebase console ›
 * Authentication › Templates, and /auth/action sends each link to the page below.
 */

const linkClass = `rounded font-semibold text-brand hover:text-brand-600 ${focusRing}`;
const BackToSignIn = ({ label = 'Back to sign in' }: { label?: string }) => (
  <p className="mt-6 text-center text-[14.5px] text-ink-2"><Link href="/login" className={linkClass}>{label}</Link></p>
);
const Alert = ({ text }: { text: string }) => text ? <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">{text}</p> : null;

/** The one-time code from a link like /reset-password?oobCode=…, then out of the address bar. */
function useActionCode() {
  const [code, setCode] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCode(params.get('oobCode'));
    window.history.replaceState(null, '', window.location.pathname);
  }, []);
  return code;
}

/** Asks for the email and has Firebase send the reset link. */
export function ForgotPasswordForm() {
  const params = useQueryParams();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => { const given = params?.get('email'); if (given) setEmail((current) => current || given); }, [params]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(''); setFieldError('');
    const address = email.trim();
    if (!EMAIL_PATTERN.test(address)) { setFieldError('Enter a valid email address.'); emailRef.current?.focus(); return; }
    setBusy(true);
    try {
      await sendPasswordReset(address);
      setSent(address);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally { setBusy(false); }
  };

  if (sent) {
    return (
      <AuthCard title="Check your email">
        <div className="-mt-1 flex flex-col items-center text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand"><LuMailCheck size={22} aria-hidden="true" /></span>
          <p className="mt-4 text-[15px] leading-[1.6] text-ink-2">If <strong className="font-semibold text-ink">{sent}</strong> has an AI for Research account, a reset link is on its way.</p>
        </div>
        <button type="button" onClick={() => setSent(null)} className={`${btnGhost} mt-6 h-12 w-full text-base`}>Use another email</button>
        <BackToSignIn />
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Reset your password" subtitle="We'll email you a link to choose a new one.">
      <Alert text={error} />
      <form onSubmit={submit} noValidate className="flex flex-col gap-4" aria-busy={busy}>
        <Field id="forgot-email" label="Email address" error={fieldError}>
          <input ref={emailRef} id="forgot-email" name="email" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck={false}
            required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={fieldError ? true : undefined}
            aria-describedby={fieldError ? 'forgot-email-error' : undefined} className={inputClass} placeholder="you@university.edu" />
        </Field>
        <button type="submit" disabled={busy} className={`${btnPrimary} h-12 w-full text-base`}>{busy ? 'Sending…' : 'Send reset link'}</button>
      </form>
      <BackToSignIn label="Remembered it? Sign in" />
    </AuthCard>
  );
}

/** Opened from the emailed link: choose a new password, then go straight in. */
export function ResetPasswordForm() {
  const router = useRouter();
  const code = useActionCode();
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false);
  const [fieldError, setFieldError] = useState('');
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!code) return;
    verifyPasswordResetCode(firebaseAuth(), code).then(setEmail).catch(() => setExpired(true));
  }, [code]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(''); setFieldError('');
    if (password.length < MIN_PASSWORD_LENGTH) { setFieldError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`); passwordRef.current?.focus(); return; }
    if (!code || !email) return;
    setBusy(true);
    try {
      await confirmPasswordReset(firebaseAuth(), code, password);
      await signIn(email, password);
      router.replace('/editor');
    } catch (caught) {
      const message = errorMessage(friendly(caught));
      if (/expired|already used/i.test(message)) setExpired(true); else setError(message);
      setBusy(false);
    }
  };

  if (code === undefined) return null;
  if (!code || expired) {
    return (
      <AuthCard title="This link has expired">
        <p className="-mt-3 text-center text-[15px] leading-[1.6] text-ink-2">Reset links work for a limited time and only once. Ask for a new one.</p>
        <Link href="/forgot-password" className={`${btnPrimary} mt-6 h-12 w-full text-base`}>Send a new link</Link>
        <BackToSignIn />
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Choose a new password" subtitle={email ? `For ${email}` : undefined}>
      <Alert text={error} />
      <form onSubmit={submit} noValidate className="flex flex-col gap-4" aria-busy={busy}>
        <input type="email" name="email" autoComplete="username" value={email ?? ''} readOnly hidden />
        <Field id="reset-password" label="New password" error={fieldError} hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}>
          <PasswordInput ref={passwordRef} id="reset-password" name="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required autoFocus
            value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={fieldError ? true : undefined}
            aria-describedby={fieldError ? 'reset-password-error' : 'reset-password-hint'} />
        </Field>
        <button type="submit" disabled={busy || !email} className={`${btnPrimary} h-12 w-full text-base`}>{busy ? 'Saving…' : 'Save and sign in'}</button>
      </form>
    </AuthCard>
  );
}

/** Opened from the confirmation email. */
export function ConfirmEmail() {
  const code = useActionCode();
  const [state, setState] = useState<{ status: 'working' | 'done' | 'failed'; message?: string }>({ status: 'working' });

  useEffect(() => {
    if (code === undefined) return;
    if (!code) { setState({ status: 'failed', message: 'This link is not complete. Open it from the email again.' }); return; }
    applyActionCode(firebaseAuth(), code)
      .then(async () => {
        // A fresh token carries email_verified, which /api/auth/me records.
        if (getToken()) {
          await firebaseAuth().currentUser?.reload().catch(() => undefined);
          await refreshSession({ forceToken: true }).catch(() => undefined);
        }
        setState({ status: 'done' });
      })
      .catch((caught) => setState({ status: 'failed', message: errorMessage(friendly(caught)) }));
  }, [code]);

  if (state.status === 'working') return <AuthCard title="Confirming your email…"><p className="text-center text-[15px] text-muted">One moment.</p></AuthCard>;
  if (state.status === 'failed') {
    return (
      <AuthCard title="Link not valid">
        <p className="-mt-3 text-center text-[15px] leading-[1.6] text-ink-2">{state.message}</p>
        <Link href="/account" className={`${btnPrimary} mt-6 h-12 w-full text-base`}>Go to your account</Link>
      </AuthCard>
    );
  }
  return (
    <AuthCard title="Email confirmed">
      <div className="-mt-1 flex flex-col items-center text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-green-50 text-green-600"><LuCircleCheck size={22} aria-hidden="true" /></span>
        <p className="mt-4 text-[15px] leading-[1.6] text-ink-2">Your email address is confirmed.</p>
      </div>
      <Link href="/editor" className={`${btnPrimary} mt-6 h-12 w-full text-base`}>Open AI for Research</Link>
    </AuthCard>
  );
}
