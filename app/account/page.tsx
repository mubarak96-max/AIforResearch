'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppFrame } from '@/components/app/AppFrame';
import { Button, ButtonLink, Card, CardHeader } from '@/components/app/ui';
import { BillingSection } from '@/components/billing/BillingSection';
import { SignInMethodsCard } from '@/components/auth/SignInMethodsCard';
import { EmailCard } from '@/components/auth/EmailCard';
import { ThemeChooser } from '@/components/theme/theme';
import { api, clearSession, useSession } from '@/lib/session';

type Wallet = { balance: number; free_left: number; free_per_day: number };

export default function AccountPage() {
  const router = useRouter();
  const { user, loading } = useSession();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [deleting, setDeleting] = useState(false);

  const deleteAccount = async () => {
    if (!window.confirm('Delete your account and everything in it? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await api('/api/auth/me', { method: 'DELETE' });
      clearSession();
      router.replace('/');
    } catch (caught) {
      window.alert((caught as Error).message);
      setDeleting(false);
    }
  };

  const load = useCallback(async () => {
    setWallet(await api<Wallet>('/api/cloud/credits').catch(() => null));
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login?next=/account'); return; }
    void load();
  }, [load, loading, router, user]);

  return (
    <AppFrame
      title="Account"
      actions={<Button variant="ghost" size="sm" onClick={() => { clearSession(); router.replace('/'); }}>Sign out</Button>}
    >
      <div className="flex flex-col gap-5">
        {user && <BillingSection />}

        <Card>
          <CardHeader title="Profile" />
          <dl className="grid grid-cols-[96px_1fr] gap-y-2.5 px-5 py-4 text-[13.5px]">
            <dt className="text-muted">Name</dt><dd>{user?.full_name || '—'}</dd>
            <dt className="text-muted">Email</dt><dd className="break-all">{user?.email}</dd>
          </dl>
        </Card>

        <Card>
          <CardHeader
            title="Appearance"
            description="Dark is easier on the eyes for late-night writing. Printed and exported documents always use light paper."
            actions={<ThemeChooser />}
          />
        </Card>

        {user && <SignInMethodsCard />}

        {user && <EmailCard />}

        {user && (
          <Card>
            <CardHeader
              title="Delete account"
              description="Deletes your documents, Library, chats and sign-in for good. Paid plans should be cancelled first in Billing."
              actions={<Button variant="ghost" size="sm" disabled={deleting} onClick={() => void deleteAccount()}>{deleting ? 'Deleting…' : 'Delete account'}</Button>}
            />
          </Card>
        )}

        <Card>
          <CardHeader
            title="Developer API"
            description="API keys and credits for using these services from your own app."
            actions={<ButtonLink href="/developers/keys" variant="secondary" size="sm">Keys and credits</ButtonLink>}
          />
          <p className="px-5 py-4 text-[14px] text-ink-2">
            {wallet ? <>{wallet.balance.toLocaleString('en-US', { maximumFractionDigits: 2 })} credits · {wallet.free_left.toLocaleString('en-US')} of {wallet.free_per_day.toLocaleString('en-US')} free left today</> : '—'}
          </p>
        </Card>
      </div>
    </AppFrame>
  );
}
