'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppFrame } from '@/components/app/AppFrame';
import { Button, Card, CardHeader } from '@/components/app/ui';
import { BillingSection } from '@/components/billing/BillingSection';
import { TeamSettings } from '@/components/billing/TeamSettings';
import { SignInMethodsCard } from '@/components/auth/SignInMethodsCard';
import { EmailCard } from '@/components/auth/EmailCard';
import { ThemeChooser } from '@/components/theme/theme';
import { api, clearSession, useSession } from '@/lib/session';
import { PrivacySettingsButton } from '@/components/analytics/PrivacyControls';

export default function AccountPage() {
  const router = useRouter();
  const { user, loading } = useSession();
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

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login?next=/account');
  }, [loading, router, user]);

  return (
    <AppFrame
      title="Account"
      actions={<Button variant="ghost" size="sm" onClick={() => { clearSession(); router.replace('/'); }}>Sign out</Button>}
    >
      <div className="flex flex-col gap-5">
        {user && <BillingSection />}
        {user && <TeamSettings />}

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

        <Card>
          <CardHeader title="Privacy choices" description="Optional usage analytics and public-page recordings. Private workspaces are never recorded." actions={<PrivacySettingsButton className="text-sm" />} />
        </Card>

        {user && (
          <Card>
            <CardHeader
              title="Delete account"
              description="Deletes your documents, Library, chats and sign-in for good. Paid plans should be cancelled first in Billing."
              actions={<Button variant="ghost" size="sm" disabled={deleting} onClick={() => void deleteAccount()}>{deleting ? 'Deleting…' : 'Delete account'}</Button>}
            />
          </Card>
        )}
      </div>
    </AppFrame>
  );
}
