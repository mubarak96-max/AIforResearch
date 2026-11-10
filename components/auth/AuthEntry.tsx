'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { LuArrowLeft, LuArrowRight } from 'react-icons/lu';
import { hasSession, signIn, signUp } from '@/lib/session';
import { getMethods, PROVIDER_NAMES, PROVIDERS, startProvider, type Methods, type Provider } from '@/lib/signin';
import { btnPrimary, focusRing } from '@/components/marketing/styles';
import { LegalNote } from './AuthCard';
import { ProviderLogo } from './ProviderLogo';
import { EMAIL_PATTERN, Field, MIN_PASSWORD_LENGTH, PasswordInput, errorMessage, inputClass, safeNext, useQueryParams } from './fields';

type Step = 'email' | 'password' | 'signup' | 'setpassword';

/** Where to go after signing in: ?next=, or straight on to paying for a plan chosen on /pricing. */
function destinationFrom(params: URLSearchParams | null) {
  const next = params?.get('next');
  const plan = params?.get('plan')?.replace(/[^a-z0-9-]/g, '') || '';
  const interval = params?.get('interval') === 'month' ? 'month' : 'year';
  return { plan, target: plan && !next ? `/account?upgrade=${plan}&interval=${interval}` : safeNext(next) };
}

function Divider({ label }: { label: string }) {
  return (
    <div className="my-5 flex items-center gap-3 text-[13px] text-subtle">
      <span className="h-px flex-1 bg-line" />{label}<span className="h-px flex-1 bg-line" />
    </div>
  );
}

/** One sign-in option. Three or more options become compact two-column tiles. */
function OptionButton({ icon, verb, name, busy, disabled, compact, onClick }: {
  icon: ReactNode; verb: string; name: string; busy?: string; disabled?: boolean; compact: boolean; onClick: () => void;
}) {
  if (compact) {
    return (
      <button type="button" onClick={onClick} disabled={disabled} aria-label={`${verb} ${name}`}
        className={`flex h-[52px] w-full min-w-0 items-center gap-2.5 rounded-xl border border-line bg-surface px-3 text-left transition-colors hover:bg-soft disabled:opacity-60 ${focusRing}`}>
        <span className="shrink-0">{icon}</span>
        {busy ? <span className="truncate text-[14px] font-semibold">{busy}</span> : (
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-[12px] font-medium text-muted">{verb}</span>
            <span className="truncate text-[14.5px] font-semibold">{name}</span>
          </span>
        )}
      </button>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`relative flex h-12 w-full items-center justify-center rounded-xl border border-line bg-surface px-12 text-[15px] font-semibold transition-colors hover:bg-soft disabled:opacity-60 ${focusRing}`}>
      <span className="absolute left-4 flex items-center">{icon}</span>
      {busy || `${verb} ${name}`}
    </button>
  );
}

/**
 * The one sign-in form, for signing in and signing up alike: Google / Microsoft / Apple first,
 * then an email and its password, or a new account (name, then password). Firebase
 * Authentication does the signing in; it never says whether an email has an account, so the
 * form asks for the password and offers "Create an account" beside it.
 */
export function AuthEntry() {
  const router = useRouter();
  const params = useQueryParams();
  const { plan, target } = destinationFrom(params);
  const [methods, setMethods] = useState<Methods | null>(null);
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState<{ email?: string; password?: string }>({});
  const [busy, setBusy] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  // Text typed (or autofilled) before the page finished loading is kept, not cleared.
  useEffect(() => {
    const typed = emailRef.current?.value;
    if (typed) setEmail((current) => current || typed);
  }, []);
  const nameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (hasSession()) { router.replace(target); return; }
    getMethods().then(setMethods).catch(() => setMethods({ password: true, google: false, microsoft: false, apple: false }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goProvider = async (provider: Provider) => {
    setBusy(provider); setError('');
    try {
      const signedIn = await startProvider(provider);
      if (signedIn) router.replace(target);
    } catch (caught) {
      setBusy(null);
      setError(errorMessage(caught));
    }
  };

  const providerList = () => PROVIDERS.filter((provider) => methods?.[provider]);

  const options = () => {
    const items = providerList().map((provider) => ({
      key: provider, icon: <ProviderLogo provider={provider} size={20} />, name: PROVIDER_NAMES[provider], run: () => void goProvider(provider),
    }));
    if (!items.length) return null;
    const compact = items.length >= 3;
    return (
      <div role="group" aria-label="Ways to sign in" className={compact ? 'grid grid-cols-2 gap-2' : 'flex flex-col gap-2.5'}>
        {items.map((item, index) => (
          <div key={item.key} className={compact && index === items.length - 1 && items.length % 2 === 1 ? 'col-span-2' : 'min-w-0'}>
            <OptionButton icon={item.icon} verb="Continue with" name={item.name} compact={compact}
              busy={busy === item.key ? 'Opening…' : undefined} disabled={busy !== null} onClick={item.run} />
          </div>
        ))}
      </div>
    );
  };

  function onEmail(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const trimmed = email.trim();
    if (!EMAIL_PATTERN.test(trimmed)) {
      setFieldError({ email: 'Enter a valid email address.' });
      emailRef.current?.focus();
      return;
    }
    setFieldError({}); setError('');
    setEmail(trimmed.toLowerCase());
    setStep('password');
    setTimeout(() => passwordRef.current?.focus(), 0);
  }

  async function onPassword(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!password) { setFieldError({ password: 'Enter your password.' }); passwordRef.current?.focus(); return; }
    setFieldError({}); setError(''); setBusy('password');
    try {
      await signIn(email, password);
      router.replace(target);
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(null);
    }
  }

  const startSignUp = () => {
    setError(''); setFieldError({}); setPassword('');
    setStep('signup');
    setTimeout(() => nameRef.current?.focus(), 0);
  };

  function onName(event: FormEvent) {
    event.preventDefault();
    setError('');
    setStep('setpassword');
    setTimeout(() => passwordRef.current?.focus(), 0);
  }

  async function onNewPassword(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (password.length < MIN_PASSWORD_LENGTH) {
      setFieldError({ password: `Use at least ${MIN_PASSWORD_LENGTH} characters.` });
      passwordRef.current?.focus();
      return;
    }
    setFieldError({}); setError(''); setBusy('signup');
    try {
      await signUp({ email, password, full_name: name.trim() });
      router.replace(target);
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(null);
    }
  }

  const back = () => {
    setStep('email'); setPassword(''); setError(''); setFieldError({}); setBusy(null);
  };
  const title = step === 'signup' ? 'Create your account'
    : step === 'setpassword' ? 'Set your password'
    : step === 'password' ? 'Welcome back'
    : 'Welcome to AI for Research';
  // The provider buttons stay on top while creating an account too.
  const topOptions = step === 'email' || step === 'signup' ? options() : null;
  const planName = plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : '';
  const submitLabel = (idle: string, working: string) => (busy ? working : idle);

  return (
    <div className="w-full">
      {plan && (
        <p className="mb-6 rounded-xl border border-brand-100 bg-brand-50 px-3.5 py-2.5 text-center text-sm text-brand-600">
          <strong className="font-semibold">{planName} plan selected.</strong> Sign in or create your account, then pay securely with Dodo Payments.
        </p>
      )}
      <h1 className="text-center text-[28px] font-bold leading-[1.15] tracking-[-0.025em] sm:text-[30px]">{title}</h1>
      {step === 'email' && <p className="mt-2 text-center text-[15px] text-muted">Sign in or create an account.</p>}

      <div className="mt-7">
        {topOptions}
        {topOptions && <Divider label="Or continue with email" />}

        {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">{error}</p>}

        {step !== 'email' && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-soft px-3.5 py-2.5 text-[14.5px]">
            <span className="min-w-0 truncate text-ink-2">{email}</span>
            <button type="button" onClick={back} className={`inline-flex shrink-0 items-center gap-1 rounded font-semibold text-brand hover:text-brand-600 ${focusRing}`}>
              <LuArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />Change
            </button>
          </div>
        )}

        {step === 'email' && (
          <form onSubmit={onEmail} noValidate className="flex flex-col gap-4" aria-busy={busy === 'email'}>
            <Field id="auth-email" label="Email address" error={fieldError.email}>
              <input ref={emailRef} id="auth-email" name="email" type="email" inputMode="email" autoComplete="username" autoCapitalize="none"
                spellCheck={false} required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)}
                aria-invalid={fieldError.email ? true : undefined} aria-describedby={fieldError.email ? 'auth-email-error' : undefined}
                className={inputClass} placeholder="you@university.edu" />
            </Field>
            <button type="submit" disabled={busy !== null} className={`${btnPrimary} h-12 w-full text-base`}>
              {submitLabel('Continue', 'Checking…')}<LuArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        )}

        {step === 'password' && (
          <>
            <form onSubmit={onPassword} noValidate className="flex flex-col gap-4" aria-busy={busy === 'password'}>
              <input type="email" name="email" autoComplete="username" value={email} readOnly hidden />
              <Field id="auth-password" label="Password" error={fieldError.password} aside={methods?.password_reset ? (
                <Link href={`/forgot-password?email=${encodeURIComponent(email)}`} className={`rounded text-[13.5px] font-semibold text-brand hover:text-brand-600 ${focusRing}`}>Forgot password?</Link>
              ) : undefined}>
                <PasswordInput ref={passwordRef} id="auth-password" name="password" autoComplete="current-password" required value={password}
                  onChange={(event) => setPassword(event.target.value)} aria-invalid={fieldError.password ? true : undefined}
                  aria-describedby={fieldError.password ? 'auth-password-error' : undefined} />
              </Field>
                <button type="submit" disabled={busy !== null} className={`${btnPrimary} h-12 w-full text-base`}>{submitLabel('Sign in', 'Signing in…')}</button>
            </form>
            <p className="mt-5 text-center text-[14.5px] text-ink-2">
              New to AI for Research?{' '}
              <button type="button" onClick={startSignUp} className={`rounded font-semibold text-brand hover:text-brand-600 ${focusRing}`}>Create an account</button>
            </p>
          </>
        )}

        {step === 'signup' && (
          <form onSubmit={onName} noValidate className="flex flex-col gap-4">
            <Field id="auth-name" label="Full name" aside={<span className="text-[13px] text-subtle">Optional</span>}>
              <input ref={nameRef} id="auth-name" name="name" type="text" autoComplete="name" maxLength={120} value={name}
                onChange={(event) => setName(event.target.value)} className={inputClass} placeholder="Your name" />
            </Field>
            <button type="submit" className={`${btnPrimary} h-12 w-full text-base`}>Continue<LuArrowRight className="h-4 w-4" aria-hidden="true" /></button>
          </form>
        )}

        {step === 'setpassword' && (
          <form onSubmit={onNewPassword} noValidate className="flex flex-col gap-4" aria-busy={busy === 'signup'}>
            <input type="email" name="email" autoComplete="username" value={email} readOnly hidden />
            <Field id="auth-new-password" label="Password" error={fieldError.password} hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}>
              <PasswordInput ref={passwordRef} id="auth-new-password" name="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required
                value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={fieldError.password ? true : undefined}
                aria-describedby={fieldError.password ? 'auth-new-password-error' : 'auth-new-password-hint'} />
            </Field>
            <button type="submit" disabled={busy !== null} className={`${btnPrimary} h-12 w-full text-base`}>{submitLabel('Create account', 'Creating your account…')}</button>
          </form>
        )}
      </div>

      <LegalNote action="continuing" />
    </div>
  );
}
