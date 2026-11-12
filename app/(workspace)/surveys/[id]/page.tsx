'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { LuTrash2 } from 'react-icons/lu';
import { AppFrame } from '@/components/app/AppFrame';
import { Button } from '@/components/app/ui';
import { useSignedIn } from '@/components/app/useSignedIn';
import { showError } from '@/components/app/research/parts';
import { SurveyBuilder, type SurveyRecord } from '@/components/app/surveys/SurveyBuilder';
import { api } from '@/lib/session';

export default function Page() {
  const { user } = useSignedIn();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [loaded, setLoaded] = useState<{ survey: SurveyRecord; role: string; can_edit: boolean } | null>(null);

  useEffect(() => {
    if (!user || !id) return;
    api<{ survey: SurveyRecord; role: string; can_edit: boolean }>(`/api/surveys/${encodeURIComponent(id)}`).then(setLoaded).catch((error) => { showError(error); router.replace('/surveys'); });
  }, [user, id]); // eslint-disable-line react-hooks/exhaustive-deps

  const remove = async () => {
    if (!loaded || !window.confirm(`Delete “${loaded.survey.title}” and its ${loaded.survey.response_count} responses? This cannot be undone.`)) return;
    try { await api(`/api/surveys/${encodeURIComponent(id)}`, { method: 'DELETE' }); toast.success('Survey deleted'); router.replace('/surveys'); } catch (error) { showError(error); }
  };

  return (
    <AppFrame wide title="Survey" subtitle={<><Link href="/surveys" className="text-brand hover:underline">All surveys</Link>{loaded && !loaded.can_edit ? ' · You can view this survey but not change it.' : ''}</>}
      actions={loaded?.role === 'owner' ? <Button onClick={remove}><LuTrash2 className="h-4 w-4" />Delete</Button> : null}>
      {loaded ? <SurveyBuilder initial={loaded.survey} canEdit={loaded.can_edit} /> : <p className="text-[14px] text-muted">Loading…</p>}
    </AppFrame>
  );
}
