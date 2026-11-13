'use client';

/**
 * The home page's Ask box. It has every option of the app's own (components/app/research/AskComposer):
 * depth, sources, filters, attachments, role, headings and High quality. It needs no account:
 * the request is handed to Deep Research in sessionStorage, and signed-out visitors go through
 * sign-up first (the question waits). Plan locks (Detailed, High quality) apply once signed in.
 */
import { useEffect, useMemo, useState } from 'react';
import { LuArrowUp, LuCornerDownRight, LuLock } from 'react-icons/lu';
import { api, useSession } from '@/lib/session';
import { signupHref } from '@/lib/features';
import { openPricing, useCredits, usePlans } from '@/lib/billing';
import { PENDING_KEY } from '@/components/app/research/handoff';
import { askCredits, type AskRequest } from '@/components/app/research/AskComposer';
import {
  AttachMenu, AttachmentList, CreditCost, DepthSwitch, FiltersToggle, RoleSelect, SourceDropdown, SourcePicker,
  type Attachment, type Filters, type LibraryPick,
} from '@/components/app/research/parts';
import { Check } from '@/components/app/research/controls';
import { focusRing } from '../styles';

type Depth = AskRequest['depth'];
type Group = AskRequest['groups'][number];

const EXAMPLES = [
  'Does sleep after learning improve memory consolidation?',
  'What drives smallholder adoption of climate-smart agriculture?',
  'How accurate are large language models at clinical diagnosis?',
];
const TARGET = '/deep-research?start=1';

/** The plan's limits for a signed-in visitor; signed-out visitors see everything unlocked. */
function useHomeLimits(signedIn: boolean) {
  const credits = useCredits(signedIn);
  const { plans } = usePlans();
  return useMemo(() => {
    if (!signedIn) return { detailed: true, highQuality: true };
    const plan = plans?.find((item) => item.id === (credits?.plan.id ?? 'free'));
    if (!plan) return { detailed: true, highQuality: true };
    return { detailed: Boolean(plan.limits.detailed_mode), highQuality: Boolean(plan.limits.high_quality) };
  }, [signedIn, plans, credits]);
}

export function HeroAsk() {
  const { user } = useSession();
  const signedIn = Boolean(user);
  const limits = useHomeLimits(signedIn);
  const [question, setQuestion] = useState('');
  const [depth, setDepth] = useState<Depth>('deep');
  const [groups, setGroups] = useState<Group[]>(['papers']);
  const [filters, setFilters] = useState<Filters>({});
  const [headings, setHeadings] = useState(true);
  const [highQuality, setHighQuality] = useState(false);
  const [files, setFiles] = useState<Attachment[]>([]);
  const [library, setLibrary] = useState<LibraryPick[]>([]);
  const [role, setRole] = useState('');
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => { if (user?.profile?.role && !role) setRole(user.profile.role); }, [user?.profile?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  // Library papers chosen means the Library is a source.
  const effectiveGroups = library.length && !groups.includes('library') ? [...groups, 'library' as const] : groups;
  const credits = askCredits(depth, highQuality);
  const ready = question.trim().length >= 3;

  const changeRole = (value: string) => {
    setRole(value);
    // Signed in, the role is remembered as the default for next time.
    if (signedIn) api('/api/auth/me', { method: 'PATCH', body: JSON.stringify({ profile: { role: value || null } }) }).catch(() => {});
  };
  const toggleHighQuality = (on: boolean) => {
    if (limits.highQuality) setHighQuality(on);
    else openPricing('High-quality mode is part of the Pro plan.');
  };
  const submit = () => {
    if (!ready) return;
    const request: AskRequest = {
      question: question.trim(), depth, groups: effectiveGroups, filters, headings, high_quality: highQuality,
      library_document_ids: library.map((pick) => pick.id), attachments: files.map(({ name, text }) => ({ name, text })), role: role || null, project_id: null,
    };
    try { sessionStorage.setItem(PENDING_KEY, JSON.stringify(request)); } catch { /* blocked: Deep Research opens empty */ }
    window.location.assign(signedIn ? TARGET : signupHref(TARGET));
  };

  return (
    <form onSubmit={(event) => { event.preventDefault(); submit(); }} className="rounded-[20px] border border-line bg-surface p-2.5 text-left shadow-[0_24px_50px_-34px_rgba(15,23,42,.5)] sm:p-3">
      <label htmlFor="hero-question" className="sr-only">Your research question</label>
      <textarea id="hero-question" rows={2} value={question} onChange={(event) => setQuestion(event.target.value)}
        onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit(); } }}
        placeholder="Start with a research question…"
        className="w-full resize-none bg-transparent px-1 text-[16px] leading-relaxed text-ink outline-none placeholder:text-subtle" />
      <AttachmentList files={files} onFiles={setFiles} library={library} onLibrary={setLibrary} />
      {!question && (
        <div className="mb-1">
          <p className="px-1 pb-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-subtle">Try an example</p>
          <ul className="divide-y divide-line-2 overflow-hidden rounded-xl border border-line-2">
            {EXAMPLES.map((example) => (
              <li key={example}>
                <button type="button" onClick={() => setQuestion(example)}
                  className={`group flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[13.5px] leading-snug text-ink-2 transition-colors hover:bg-soft hover:text-ink ${focusRing}`}>
                  <LuCornerDownRight className="h-4 w-4 shrink-0 text-subtle group-hover:text-brand" aria-hidden="true" />
                  <span className="min-w-0 flex-1">{example}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <DepthSwitch value={depth} onChange={setDepth} detailedAllowed={limits.detailed} />
        <AttachMenu files={files} onFiles={setFiles} library={library} onLibrary={setLibrary}
          onBlocked={signedIn ? undefined : () => setNote('Create a free account to attach PDF, Word, text, data, web page and LaTeX files. Your question will wait for you.')} />
        {signedIn ? <SourcePicker value={effectiveGroups} onChange={setGroups} records /> : <SourceDropdown value={effectiveGroups} onChange={setGroups} />}
        <FiltersToggle value={filters} onChange={setFilters} />
        <div className="ml-auto flex items-center gap-2.5">
          <CreditCost credits={credits} className="hidden sm:inline" />
          <button type="submit" disabled={!ready} aria-label="Ask" className={`grid h-9 w-9 place-items-center rounded-full bg-accent text-white shadow-[0_6px_16px_-6px_rgba(194,65,12,.55)] transition-colors hover:bg-accent-600 disabled:bg-subtle disabled:shadow-none ${focusRing}`}>
            <LuArrowUp className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line-2 pt-2">
        <RoleSelect value={role} onChange={changeRole} />
        <Check size="sm" checked={headings} onChange={setHeadings}>With headings</Check>
        <Check size="sm" title="The stronger model and longer answers, for 3× the credits" checked={highQuality} onChange={toggleHighQuality}>
          High quality{!limits.highQuality && <LuLock className="h-3.5 w-3.5 text-muted" aria-label="Pro plan" />}
        </Check>
        <CreditCost credits={credits} className="sm:hidden" />
      </div>
      {note && <p role="status" className="mt-1.5 px-1 text-[13px] text-muted">{note}</p>}
    </form>
  );
}
