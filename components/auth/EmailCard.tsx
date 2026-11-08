'use client';

import { useCallback, useEffect, useState } from 'react';
import { LuMailCheck, LuNewspaper } from 'react-icons/lu';
import { Button, Card, CardHeader, StatusPill } from '@/components/app/ui';
import { Switch } from '@/components/app/Switch';
import { sendEmailVerification } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase';
import { api, friendly, refreshSession } from '@/lib/session';

type State = { available: boolean; subscribed: boolean; confirmed: boolean; can_confirm?: boolean };

/** Account › Email: confirming the address, and the newsletter switch (when MailCheap is set up). */
export function EmailCard() {
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const load = useCallback(() => api<State>('/api/newsletter/me').then(setState).catch(() => setState(null)), []);
  useEffect(() => { void load(); }, [load]);

  if (!state || (!state.available && state.confirmed)) return null;
  const row = 'flex min-h-[60px] flex-wrap items-center gap-3 border-t border-line-2 px-5 py-3 first:border-t-0';

  // Firebase sends the confirmation link; a person who already confirmed gets a fresh token instead.
  const sendLink = async () => {
    setBusy('confirm'); setNotice(null);
    try {
      const current = firebaseAuth().currentUser;
      if (!current) throw new Error('Sign in again, then retry.');
      await current.reload();
      if (current.emailVerified) {
        await refreshSession({ forceToken: true });
        setNotice({ tone: 'ok', text: 'Your email is already confirmed.' });
        await load();
      } else {
        await sendEmailVerification(current, { url: `${window.location.origin}/account` }).catch((error) => { throw friendly(error); });
        setNotice({ tone: 'ok', text: 'Link sent. Check your inbox.' });
      }
    } catch (caught) { setNotice({ tone: 'error', text: (caught as Error).message }); } finally { setBusy(null); }
  };
  const toggle = async (subscribed: boolean) => {
    setBusy('newsletter'); setNotice(null);
    try { setState(await api<State>('/api/newsletter/me', { method: 'PUT', body: JSON.stringify({ subscribed }) })); }
    catch (caught) { setNotice({ tone: 'error', text: (caught as Error).message }); } finally { setBusy(null); }
  };

  return (
    <Card>
      <CardHeader title="Email" />
      {notice && (
        <p role={notice.tone === 'error' ? 'alert' : 'status'} className={`mx-5 mt-4 rounded-xl px-4 py-2.5 text-[14px] ${notice.tone === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-800'}`}>{notice.text}</p>
      )}
      <div className="py-1">
        <div className={row}>
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-soft"><LuMailCheck className="h-[18px] w-[18px] text-ink-2" aria-hidden="true" /></span>
          <span className="min-w-0 flex-1 text-[14.5px] font-medium">Email address</span>
          {state.confirmed ? <StatusPill tone="positive">Confirmed</StatusPill> : (
            <>
              <StatusPill tone="warning">Not confirmed</StatusPill>
              {<Button size="sm" disabled={busy !== null} onClick={() => void sendLink()}>{busy === 'confirm' ? 'Sending…' : 'Send link'}</Button>}
            </>
          )}
        </div>
        {state.available && (
          <div className={row}>
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-soft"><LuNewspaper className="h-[18px] w-[18px] text-ink-2" aria-hidden="true" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-medium">Newsletter</span>
              <span className="block text-[13px] text-muted">{state.subscribed && !state.confirmed ? 'Starts once your email is confirmed' : 'News and tips from WriteOrbit'}</span>
            </span>
            <Switch label="Newsletter" checked={state.subscribed} disabled={busy !== null} onChange={(value) => void toggle(value)} />
          </div>
        )}
      </div>
    </Card>
  );
}
