'use client';

/**
 * The Ask box: a question, its depth (Summary, Deep, Detailed), its sources (All papers,
 * Medical, Preprints, Web, My Library), filters, attachments, the person's role, headings on
 * or off and High quality, with the credits it will cost. Home and Deep Research both use it.
 */
import { useEffect, useMemo, useState } from 'react';
import { LuArrowUp, LuLock } from 'react-icons/lu';
import { api, useSession } from '@/lib/session';
import { openPricing, usePlans, useCredits } from '@/lib/billing';
import {
  AttachMenu, AttachmentList, CreditCost, DepthSwitch, FiltersToggle, RoleSelect, SourcePicker, filterCount,
  type Attachment, type Depth, type Filters, type LibraryPick, type SourceGroup,
} from './parts';
import { Check } from './controls';

export type AskRequest = {
  question: string; depth: Depth; groups: SourceGroup[]; filters: Filters; headings: boolean; high_quality: boolean;
  library_document_ids: string[]; attachments: { name: string; text: string }[]; role: string | null; project_id: string | null;
  /** The plan the person reviewed (Detailed), sent with the run. */
  plan?: { sub_questions: { question: string; queries: string[] }[] } | null;
};

export const DEPTH_CREDITS: Record<Depth, number> = { summary: 1, deep: 15, detailed: 45 };
export const askCredits = (depth: Depth, highQuality: boolean) => DEPTH_CREDITS[depth] * (highQuality ? 3 : 1);

/** What the person's plan allows (Detailed, High quality), from the public plan list. */
export function usePlanLimits() {
  const credits = useCredits();
  const { plans } = usePlans();
  return useMemo(() => {
    const plan = plans?.find((item) => item.id === (credits?.plan.id ?? 'free'));
    return { detailed: Boolean(plan?.limits.detailed_mode), highQuality: Boolean(plan?.limits.high_quality), loaded: Boolean(plan) };
  }, [plans, credits]);
}

export function AskComposer({ onSubmit, busy = false, initialQuestion = '', initialRequest, autoFocus = false, compact = false, projectId = null }: {
  onSubmit: (request: AskRequest) => void; busy?: boolean; initialQuestion?: string;
  /** Start from an earlier ask's settings, e.g. to change and re-run a search that found nothing. */
  initialRequest?: Partial<AskRequest>;
  autoFocus?: boolean; compact?: boolean; projectId?: string | null;
}) {
  const { user } = useSession();
  const limits = usePlanLimits();
  const [question, setQuestion] = useState(initialRequest?.question ?? initialQuestion);
  const [depth, setDepth] = useState<Depth>(initialRequest?.depth ?? 'deep');
  const [groups, setGroups] = useState<SourceGroup[]>(initialRequest?.groups?.length ? initialRequest.groups : ['papers']);
  const [filters, setFilters] = useState<Filters>(initialRequest?.filters ?? {});
  const [headings, setHeadings] = useState(initialRequest?.headings ?? true);
  const [highQuality, setHighQuality] = useState(initialRequest?.high_quality ?? false);
  const [files, setFiles] = useState<Attachment[]>([]);
  const [library, setLibrary] = useState<LibraryPick[]>([]);
  const [role, setRole] = useState(initialRequest?.role ?? user?.profile?.role ?? '');
  useEffect(() => { if (user?.profile?.role && !role) setRole(user.profile.role); }, [user?.profile?.role]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (initialQuestion) setQuestion(initialQuestion); }, [initialQuestion]);

  // Library papers chosen means the Library is a source.
  const effectiveGroups = library.length && !groups.includes('library') ? [...groups, 'library' as const] : groups;
  const credits = askCredits(depth, highQuality);
  const ready = question.trim().length >= 3 && !busy;

  const changeRole = (value: string) => {
    setRole(value);
    // The role is remembered as the default for next time.
    api('/api/auth/me', { method: 'PATCH', body: JSON.stringify({ profile: { role: value || null } }) }).catch(() => {});
  };
  const submit = () => {
    if (!ready) return;
    onSubmit({
      question: question.trim(), depth, groups: effectiveGroups, filters, headings, high_quality: highQuality,
      library_document_ids: library.map((pick) => pick.id), attachments: files.map(({ name, text }) => ({ name, text })), role: role || null, project_id: projectId,
    });
  };

  return (
    <form onSubmit={(event) => { event.preventDefault(); submit(); }} className="rounded-2xl border border-line bg-surface p-2.5 shadow-[0_20px_40px_-32px_rgba(15,23,42,.45)] sm:p-3">
      <label htmlFor="ask-question" className="sr-only">Your research question</label>
      <textarea id="ask-question" autoFocus={autoFocus} value={question} onChange={(event) => setQuestion(event.target.value)} rows={compact ? 1 : 2}
        onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit(); } }}
        placeholder="Start with a research question, e.g. Does sleep after learning improve memory consolidation?"
        className="w-full resize-none bg-transparent px-1 text-[16px] leading-relaxed text-ink outline-none placeholder:text-subtle" />
      <AttachmentList files={files} onFiles={setFiles} library={library} onLibrary={setLibrary} />
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <DepthSwitch value={depth} onChange={setDepth} detailedAllowed={limits.detailed} />
        <AttachMenu files={files} onFiles={setFiles} library={library} onLibrary={setLibrary} />
        <SourcePicker value={effectiveGroups} onChange={setGroups} />
        <FiltersToggle value={filters} onChange={setFilters} defaultOpen={Boolean(initialRequest && filterCount(initialRequest.filters ?? {}))} />
        <div className="ml-auto flex items-center gap-2.5">
          <CreditCost credits={credits} className="hidden sm:inline" />
          <button type="submit" disabled={!ready} aria-label="Ask" className="grid h-9 w-9 place-items-center rounded-full bg-brand text-on-brand shadow-brand transition-colors hover:bg-brand-600 disabled:bg-subtle disabled:shadow-none">
            <LuArrowUp className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line-2 pt-2">
        <RoleSelect value={role} onChange={changeRole} />
        <Check size="sm" checked={headings} onChange={setHeadings}>With headings</Check>
        <Check size="sm" title="The stronger model and longer answers, for 3× the credits" checked={highQuality} onChange={(on) => (limits.highQuality ? setHighQuality(on) : openPricing('High-quality mode is part of the Pro plan.'))}>
          High quality{!limits.highQuality && <LuLock className="h-3.5 w-3.5 text-muted" aria-label="Pro plan" />}
        </Check>
        <CreditCost credits={credits} className="sm:hidden" />
      </div>
    </form>
  );
}
