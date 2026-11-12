'use client';

import { useCallback, useEffect, useState } from 'react';
import { LuBuilding2, LuLock } from 'react-icons/lu';
import { Button, Card, CardHeader, StatusPill } from '@/components/app/ui';
import { disconnectInstitutionalProvider, disconnectProvider, getMyMethods, PROVIDER_NAMES, PROVIDERS, startInstitutionalProvider, startProvider, type MyMethods } from '@/lib/signin';
import { ProviderLogo } from './ProviderLogo';

/** Account › Sign-in methods: password and connected Google (from Firebase Auth). */
export function SignInMethodsCard() {
  const [mine, setMine] = useState<MyMethods | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const load = useCallback(() => getMyMethods().then(setMine).catch((caught) => setNotice({ tone: 'error', text: (caught as Error).message })), []);
  useEffect(() => { void load(); }, [load]);

  const run = async (key: string, work: () => Promise<unknown>, done: string) => {
    setBusy(key); setNotice(null);
    try {
      await work();
      setNotice({ tone: 'ok', text: done });
      await load();
    } catch (caught) {
      const text = (caught as Error).message;
      if (text) setNotice({ tone: 'error', text });
    }
    setBusy(null);
  };

  if (!mine) return null;
  const providers = PROVIDERS.filter((provider) => mine.available[provider] || mine.providers[provider].connected);
  const row = 'flex min-h-[60px] flex-wrap items-center gap-3 border-t border-line-2 px-5 py-3 first:border-t-0';

  return (
    <Card>
      <div id="sign-in-methods" />
      <CardHeader title="Sign-in methods" />
      {notice && (
        <p role={notice.tone === 'error' ? 'alert' : 'status'} className={`mx-5 mt-4 rounded-xl px-4 py-2.5 text-[14px] ${notice.tone === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-800'}`}>{notice.text}</p>
      )}
      <div className="py-1">
        <div className={row}>
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-soft"><LuLock className="h-[18px] w-[18px] text-ink-2" aria-hidden="true" /></span>
          <span className="min-w-0 flex-1 text-[14.5px] font-medium">Email and password</span>
          <StatusPill tone={mine.password ? 'positive' : 'neutral'}>{mine.password ? 'On' : 'Not set'}</StatusPill>
        </div>
        {providers.map((provider) => {
          const state = mine.providers[provider];
          return (
            <div key={provider} className={row}>
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-soft"><ProviderLogo provider={provider} size={18} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-medium">{PROVIDER_NAMES[provider]}</span>
                {state.connected && state.email && <span className="block truncate text-[13px] text-muted">{state.email}</span>}
              </span>
              {state.connected ? (
                <Button variant="ghost" size="sm" disabled={busy !== null}
                  onClick={() => void run(`off-${provider}`, () => disconnectProvider(provider), `${PROVIDER_NAMES[provider]} disconnected.`)}>
                  {busy === `off-${provider}` ? 'Disconnecting…' : 'Disconnect'}
                </Button>
              ) : (
                <Button size="sm" disabled={busy !== null}
                  onClick={() => void run(provider, () => startProvider(provider, { mode: 'connect' }), `${PROVIDER_NAMES[provider]} connected.`)}>
                  {busy === provider ? 'Opening…' : 'Connect'}
                </Button>
              )}
            </div>
          );
        })}
        {(mine.sso ?? []).map((provider) => <div key={provider.id} className={row}>
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-soft"><LuBuilding2 className="h-[18px] w-[18px] text-ink-2" aria-hidden="true" /></span>
          <span className="min-w-0 flex-1"><span className="block text-[14.5px] font-medium">{provider.label}</span><span className="block truncate text-[13px] text-muted">{provider.connected ? provider.email || 'Institutional sign-in connected' : 'Institutional sign-in'}</span></span>
          <Button variant={provider.connected ? 'ghost' : 'primary'} size="sm" disabled={busy !== null}
            onClick={() => void run(provider.id, () => provider.connected ? disconnectInstitutionalProvider(provider.id) : startInstitutionalProvider(provider.id, { mode: 'connect' }), `${provider.label} ${provider.connected ? 'disconnected' : 'connected'}.`)}>
            {busy === provider.id ? 'Working…' : provider.connected ? 'Disconnect' : 'Connect'}
          </Button>
        </div>)}
      </div>
    </Card>
  );
}
