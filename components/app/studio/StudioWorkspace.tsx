'use client';

/**
 * One workspace of the studio (Writing Studio, Thesis Suite, Proposal Studio, Slides): its
 * modules in a list, the chosen module's form with sources, filters, role and output options,
 * the credits it costs, and its result (cited text, before/after revisions, slides or papers).
 * Opened from History (?task=), from Home or a research result (?module=…&from=<task>).
 * The work it was opened from goes with the person: its topic and text fill each module's form,
 * runs cite its sources and build on its text, and a finished result becomes what the next
 * module (or template) continues from.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { LuArrowRight, LuCheck, LuCopy, LuDownload, LuFileInput, LuFilePen, LuLoaderCircle, LuLock, LuPlay, LuQuote, LuRuler, LuUpload, LuX } from 'react-icons/lu';
import { Check, Select } from '@/components/app/research/controls';
import { AppFrame } from '@/components/app/AppFrame';
import { Button, Card } from '@/components/app/ui';
import { useSignedIn } from '@/components/app/useSignedIn';
import { api } from '@/lib/session';
import { openPricing, useCredits } from '@/lib/billing';
import { usePlanLimits } from '@/components/app/research/AskComposer';
import {
  AttachMenu, AttachmentList, CitedMarkdown, CreditCost, FiltersToggle, RoleSelect, SourcePicker, SourceRow, creditsChanged, showError,
  type Attachment, type Filters, type LibraryPick, type Source, type SourceGroup,
} from '@/components/app/research/parts';
import { followOnLinks, loadFromTask, openResultInEditor, withoutMarkers, type TaskRecord } from '@/components/app/research/handoff';
import { fileText, postStream } from '@/components/app/research/stream';
import {
  STUDIO_WORKSPACES, studioCredits, studioModule, template as findTemplate, workspaceModules, type StudioField, type StudioModule, type StudioWorkspace as WorkspaceId,
} from '@/lib/server/lib/studioCatalog';
import { wordDiff } from './diff';
import { downloadPptx, type Deck } from './pptx';

type Pair = { before: string; after: string; note: string };
type Result = {
  taskId: string | null; module: string; running: boolean; status: string | null; error: string | null;
  markdown: string; sources: Source[]; allSources: Source[]; pairs: Pair[]; deck: Deck | null; lockedSlides: number; title: string;
};
const emptyResult = (module: string, title = ''): Result => ({ taskId: null, module, running: false, status: null, error: null, markdown: '', sources: [], allSources: [], pairs: [], deck: null, lockedSlides: 0, title });

const STYLES: [string, string][] = [['apa', 'APA 7'], ['mla', 'MLA 9'], ['chicago', 'Chicago'], ['harvard', 'Harvard']];

/** Words of an editor document's blocks, for "From a document". */
function blocksText(blocks: any[]): string {
  const out: string[] = [];
  const walk = (items: any[]) => {
    for (const block of items ?? []) {
      const text = Array.isArray(block?.content) ? block.content.map((part: any) => part?.text ?? '').join('') : '';
      if (text.trim()) out.push(block?.type === 'heading' ? `## ${text}` : text);
      if (Array.isArray(block?.children)) walk(block.children);
    }
  };
  walk(blocks);
  return out.join('\n\n');
}

function DocumentPicker({ onPick, onClose }: { onPick: (title: string, text: string) => void; onClose: () => void }) {
  const [docs, setDocs] = useState<{ id: string; title: string }[] | null>(null);
  useEffect(() => { api<{ documents: { id: string; title: string }[] }>('/api/ai-editor/documents').then((result) => setDocs(result.documents)).catch((error) => { showError(error); setDocs([]); }); }, []);
  const pick = async (id: string) => {
    try {
      const doc = await api<{ title: string; blocks: any[] }>(`/api/ai-editor/documents/${id}`);
      onPick(doc.title || 'Untitled document', blocksText(doc.blocks));
    } catch (error) { showError(error); }
  };
  return (
    <div role="dialog" aria-modal="true" aria-label="Choose a document" className="fixed inset-0 z-[80] grid place-items-center bg-ink/30 p-4" onClick={onClose}>
      <div className="flex max-h-[70dvh] w-full max-w-md flex-col rounded-2xl bg-surface shadow-float" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center border-b border-line-2 px-5 py-4"><h2 className="flex-1 text-[17px] font-bold">Choose a document</h2><button type="button" aria-label="Close" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-soft"><LuX className="h-4 w-4" /></button></div>
        <ul className="min-h-0 flex-1 overflow-y-auto p-2">
          {docs === null && <li className="px-3 py-6 text-center text-[14px] text-muted">Loading…</li>}
          {docs?.length === 0 && <li className="px-3 py-6 text-center text-[14px] text-muted">No documents yet.</li>}
          {docs?.map((doc) => <li key={doc.id}><button type="button" onClick={() => pick(doc.id)} className="w-full truncate rounded-lg px-3 py-2.5 text-left text-[14.5px] hover:bg-soft">{doc.title || 'Untitled document'}</button></li>)}
        </ul>
      </div>
    </div>
  );
}

const inputClass = 'w-full rounded-[10px] border border-line bg-surface px-3 text-[15px] text-ink outline-none focus:border-brand';

function Field({ field, value, onChange }: { field: StudioField; value: string; onChange: (value: string) => void }) {
  const [reading, setReading] = useState(false);
  const [picker, setPicker] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const id = `field-${field.name}`;
  const upload = async (list: FileList | null) => {
    const chosen = list?.[0];
    if (!chosen) return;
    setReading(true);
    try {
      const read = await fileText(chosen);
      onChange(read.text);
      toast.success(`${read.name}: ${read.words.toLocaleString('en-US')} words${read.truncated ? ' (shortened)' : ''}`);
    } catch (error) { showError(error); } finally { setReading(false); }
  };
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <label htmlFor={id} className="flex-1 text-[14px] font-semibold text-ink-2">{field.label}</label>
        {field.upload && (
          <>
            <button type="button" onClick={() => file.current?.click()} disabled={reading} className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand hover:underline disabled:opacity-60">
              {reading ? <LuLoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <LuUpload className="h-3.5 w-3.5" />}Upload file
            </button>
            <button type="button" onClick={() => setPicker(true)} className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand hover:underline"><LuFileInput className="h-3.5 w-3.5" />From a document</button>
            <input ref={file} type="file" accept=".pdf,.doc,.docx,.odt,.rtf,.md,.markdown,.txt" className="hidden" onChange={(event) => { upload(event.target.files); event.target.value = ''; }} />
          </>
        )}
      </div>
      {field.kind === 'select' ? (
        <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className={`${inputClass} h-10`}>
          {(field.options ?? []).map(([option, label]) => <option key={option} value={option}>{label}</option>)}
        </select>
      ) : field.kind === 'textarea' ? (
        <textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={field.placeholder} maxLength={field.max} rows={field.upload ? 8 : 3} className={`${inputClass} py-2.5 leading-relaxed`} />
      ) : (
        <input id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={field.placeholder} maxLength={field.max} className={`${inputClass} h-10`} />
      )}
      {field.upload && value && <p className="mt-1 text-[12.5px] text-muted">{(value.match(/\S+/g) || []).length.toLocaleString('en-US')} words</p>}
      {field.help && <p className="mt-1 text-[12.5px] text-muted">{field.help}</p>}
      {picker && <DocumentPicker onClose={() => setPicker(false)} onPick={(_title, text) => { onChange(text); setPicker(false); }} />}
    </div>
  );
}

function defaults(module: StudioModule): Record<string, string> {
  return Object.fromEntries(module.fields.map((field) => [field.name, field.kind === 'select' ? field.options?.[0]?.[0] ?? '' : '']));
}

/** The work a workspace continues: a research answer, or the result of the module before. */
export type FromWork = { id: string; title: string; topic: string; markdown: string; sources: Source[] };

/**
 * A module's form filled from the work it continues: the topic, and the text for modules that
 * take the writer's text. `replaceText` puts newer work over text carried from the module before.
 */
function fillFrom(module: StudioModule, inputs: Record<string, string>, work: FromWork, replaceText = false): Record<string, string> {
  const out = { ...inputs };
  for (const field of module.fields) {
    if (field.kind === 'select') continue;
    if (field.name === 'topic' && !out.topic?.trim()) out.topic = work.topic.slice(0, field.max);
    if (field.name === 'text' && (replaceText || !out.text?.trim())) {
      const text = module.id === 'similar' ? work.topic : module.id === 'slides' ? work.markdown : withoutMarkers(work.markdown);
      if (text.trim()) out.text = text.slice(0, field.max);
    }
  }
  return out;
}

/** What a workspace hands to its intro (Writing Studio's templates). */
export type StudioIntroContext = { from: FromWork | null; startTemplate: (id: string) => void };

/** Paragraph by paragraph: the original, the revision with its changes marked, and a choice. */
function CompareView({ pairs, title }: { pairs: Pair[]; title: string }) {
  const [keep, setKeep] = useState<boolean[]>(() => pairs.map(() => true));
  useEffect(() => setKeep(pairs.map(() => true)), [pairs]);
  const chosen = pairs.map((pair, index) => (keep[index] ? pair.after : pair.before)).join('\n\n');
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant="primary" size="sm" onClick={() => openResultInEditor(title, chosen, [])}><LuFilePen className="h-4 w-4" />Open in editor</Button>
        <Button size="sm" onClick={() => navigator.clipboard.writeText(chosen).then(() => toast.success('Copied'))}><LuCopy className="h-4 w-4" />Copy the result</Button>
        <Button size="sm" onClick={() => setKeep(pairs.map(() => false))}>Keep all originals</Button>
      </div>
      <ol className="space-y-3">
        {pairs.map((pair, index) => {
          const changed = pair.after !== pair.before;
          return (
            <li key={index} className="rounded-xl border border-line bg-surface p-4">
              {changed ? (
                <p className="text-[15.5px] leading-[1.7] text-ink">
                  {wordDiff(pair.before, pair.after).map((part, at) => (
                    part.kind === 'same' ? <span key={at}>{part.text}</span>
                      : part.kind === 'removed' ? <del key={at} className={`bg-red-50 text-red-700 ${keep[index] ? '' : 'no-underline'}`}>{part.text}</del>
                        : <ins key={at} className={`bg-green-100 text-green-800 no-underline ${keep[index] ? '' : 'opacity-40'}`}>{part.text}</ins>
                  ))}
                </p>
              ) : <p className="text-[15.5px] leading-[1.7] text-ink-2">{pair.before}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px]">
                <span className="text-muted">{changed ? pair.note || 'Revised' : pair.note || 'No change'}</span>
                {changed && (
                  <label className="ml-auto flex items-center gap-2 font-medium text-ink-2">
                    <input type="checkbox" checked={keep[index]} onChange={(event) => setKeep(keep.map((value, at) => (at === index ? event.target.checked : value)))} className="h-4 w-4 accent-[var(--color-brand)]" />Use the revision
                  </label>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function SlidesView({ deck, sources, locked }: { deck: Deck; sources: Source[]; locked: number }) {
  const [busy, setBusy] = useState(false);
  const download = async () => {
    setBusy(true);
    try {
      await api('/api/studio/slides/export-allowed');
      await downloadPptx(deck, sources);
    } catch (error) { showError(error); } finally { setBusy(false); }
  };
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="primary" size="sm" onClick={download} disabled={busy}>{busy ? <LuLoaderCircle className="h-4 w-4 animate-spin" /> : <LuDownload className="h-4 w-4" />}Download PowerPoint</Button>
        <span className="text-[13.5px] text-muted">{deck.slides.length + locked} slides with speaker notes</span>
      </div>
      <ol className="grid gap-3 sm:grid-cols-2">
        <li className="flex aspect-video flex-col justify-center rounded-xl bg-brand p-6 text-on-brand">
          <p className="font-serif text-[22px] font-semibold leading-tight">{deck.title}</p>
          {deck.subtitle && <p className="mt-2 text-[14px] opacity-80">{deck.subtitle}</p>}
        </li>
        {deck.slides.map((slide, index) => (
          <li key={index} className="flex flex-col rounded-xl border border-line bg-surface">
            <div className="aspect-video overflow-hidden border-b border-line-2 p-5">
              <p className="font-serif text-[17px] font-semibold leading-snug text-ink">{slide.title}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[13.5px] leading-snug text-ink-2">{slide.bullets.map((bullet, at) => <li key={at}><CitedMarkdown markdown={bullet} sources={sources} className="!text-[13.5px] !leading-snug [&_p]:!my-0" /></li>)}</ul>
              {slide.table && <p className="mt-2 text-[12.5px] font-medium text-muted">Table: {slide.table.headers.join(' · ')}</p>}
              {slide.chart && <p className="mt-2 text-[12.5px] font-medium text-muted">Chart: {slide.chart.label || slide.chart.labels.join(', ')}</p>}
            </div>
            {slide.notes && <p className="px-5 py-3 text-[13px] leading-relaxed text-muted"><span className="font-semibold text-ink-2">Notes: </span>{slide.notes}</p>}
          </li>
        ))}
        {locked > 0 && (
          <li className="flex aspect-video flex-col items-center justify-center gap-2 rounded-xl bg-soft p-6 text-center">
            <LuLock className="h-5 w-5 text-muted" aria-hidden="true" />
            <p className="text-[15px] font-semibold text-ink">{locked} more slide{locked === 1 ? '' : 's'}</p>
            <p className="text-[13.5px] text-muted">The full deck and PowerPoint download are part of the paid plans.</p>
            <Button size="sm" variant="primary" onClick={() => openPricing('The full deck and PowerPoint export are part of the paid plans.')}>Upgrade</Button>
          </li>
        )}
      </ol>
    </div>
  );
}

export function StudioWorkspace({ workspace, intro }: { workspace: WorkspaceId; intro?: (context: StudioIntroContext) => React.ReactNode }) {
  const { user } = useSignedIn();
  const params = useSearchParams();
  const info = STUDIO_WORKSPACES[workspace];
  const modules = workspaceModules(workspace);
  const credits = useCredits(Boolean(user));
  const limits = usePlanLimits();
  const [moduleId, setModuleId] = useState(() => (studioModule(params.get('module') || '')?.workspace === workspace ? params.get('module')! : modules[0].id));
  const module = studioModule(moduleId)!;
  const [inputs, setInputs] = useState<Record<string, string>>(() => defaults(module));
  const [groups, setGroups] = useState<SourceGroup[]>(['papers']);
  const [filters, setFilters] = useState<Filters>({});
  const [files, setFiles] = useState<Attachment[]>([]);
  const [library, setLibrary] = useState<LibraryPick[]>([]);
  const [role, setRole] = useState(user?.profile?.role ?? '');
  const [headings, setHeadings] = useState(true);
  const [length, setLength] = useState<'short' | 'standard' | 'long'>('standard');
  const [style, setStyle] = useState<'apa' | 'mla' | 'chicago' | 'harvard'>('apa');
  const [highQuality, setHighQuality] = useState(false);
  const [from, setFrom] = useState<FromWork | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const abort = useRef<AbortController | null>(null);
  const form = useRef<HTMLDivElement>(null);
  const runButton = useRef<HTMLButtonElement>(null);
  /** Briefly marks the form after a template is picked above it, so the eye lands on it. */
  const [picked, setPicked] = useState(false);
  useEffect(() => { if (user?.profile?.role && !role) setRole(user.profile.role); }, [user?.profile?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  /** The result on screen as work to continue, once it has finished with text. */
  const finished: FromWork | null = result && !result.running && !result.error && result.taskId && result.markdown.trim()
    ? { id: result.taskId, title: result.title || module.label, topic: inputs.topic || from?.topic || result.title, markdown: result.markdown, sources: result.allSources }
    : null;

  const choose = (id: string, preset: Record<string, string> = {}) => {
    const next = studioModule(id)!;
    // The result on screen goes with the person to the next module; otherwise the work it was opened from stays.
    const work = finished ?? from;
    if (finished) setFrom(finished);
    setModuleId(id);
    // Keep what was typed in fields both modules share (topic, text, notes), then fill the rest from the work.
    setInputs((current) => {
      const carried = { ...defaults(next), ...Object.fromEntries(Object.entries(current).filter(([key, value]) => value && next.fields.some((field) => field.name === key && field.kind !== 'select'))), ...preset };
      return work ? fillFrom(next, carried, work, Boolean(finished)) : carried;
    });
    setResult(null);
    const url = new URL(window.location.href);
    url.searchParams.set('module', id);
    url.searchParams.delete('task');
    if (work) url.searchParams.set('from', work.id);
    window.history.replaceState(null, '', url.toString());
  };

  const startTemplate = (id: string) => {
    choose('template', { template: id });
    setPicked(true);
    window.setTimeout(() => setPicked(false), 2400);
    requestAnimationFrame(() => {
      form.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      runButton.current?.focus({ preventScroll: true });
    });
  };

  const loadFrom = async (id: string): Promise<FromWork | null> => {
    const loaded = await loadFromTask(id);
    return loaded ? { id, title: loaded.task.title, topic: loaded.topic, markdown: loaded.markdown, sources: loaded.task.result?.all_sources ?? loaded.sources } : null;
  };

  // Reopen a saved task (and the work it continued), or continue from a research result or another module.
  useEffect(() => {
    if (!user) return;
    const taskId = params.get('task');
    if (taskId) {
      api<TaskRecord>(`/api/history/${encodeURIComponent(taskId)}`).then((task) => {
        const saved = studioModule(task.module || '');
        if (!saved) return;
        setModuleId(saved.id);
        setInputs({ ...defaults(saved), ...Object.fromEntries(Object.entries(task.inputs ?? {}).filter(([, value]) => typeof value === 'string')) as Record<string, string> });
        const data = task.result ?? {};
        setResult({
          ...emptyResult(saved.id, task.title), taskId: task.id, error: task.status === 'failed' ? task.error || 'This did not finish.' : null,
          markdown: String(data.markdown ?? ''), sources: data.sources ?? [], allSources: data.all_sources ?? [], pairs: saved.output === 'compare' ? data.pairs ?? [] : [],
          deck: data.deck ?? null, lockedSlides: data.locked_slides ?? 0,
        });
        if (typeof task.inputs?.from_task === 'string') loadFrom(task.inputs.from_task).then((work) => work && setFrom(work)).catch(() => undefined);
      }).catch(showError);
      return;
    }
    const fromId = params.get('from');
    if (fromId) {
      loadFrom(fromId).then((work) => {
        if (!work) return;
        setFrom(work);
        setInputs((current) => fillFrom(module, current, work));
      }).catch(showError);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => abort.current?.abort(), []);

  const stopBuilding = () => {
    setFrom(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('from');
    window.history.replaceState(null, '', url.toString());
  };

  const freePlan = Boolean(credits?.plan.is_default);
  // Plans without PowerPoint export get the five-slide preview, priced as a preview (as on the server).
  const cost = useMemo(() => (!credits ? 0 : module.output === 'slides' && freePlan ? credits.costs.review_preview ?? 3 : studioCredits(module, inputs, credits.costs, highQuality)), [module, inputs, credits, highQuality, freePlan]);
  const missing = module.fields.find((field) => field.required && (inputs[field.name] || '').trim().length < (field.min ?? 1));
  const running = Boolean(result?.running);
  const grounded = Boolean(module.grounded) && !(module.id === 'slides' && inputs.text?.trim());
  const chosenTemplate = module.id === 'template' ? findTemplate(inputs.template) : null;
  const runLabel = module.output === 'papers' ? 'Find papers' : chosenTemplate ? `Write the ${chosenTemplate.label.replace(/\s*\(.*\)$/, '').toLowerCase()}` : 'Run';

  const run = useCallback(async () => {
    if (missing) { toast.error(`Add ${missing.label.toLowerCase()}.`); return; }
    const title = (inputs[module.topicField] || module.label).split('\n')[0].slice(0, 160);
    if (module.output === 'papers') {
      setResult({ ...emptyResult(module.id, title), running: true, status: 'Finding similar papers' });
      try {
        const found = await api<{ task_id: string; sources: Source[] }>('/api/studio/similar', { method: 'POST', body: JSON.stringify({ text: inputs.text }) });
        setResult({ ...emptyResult(module.id, title), taskId: found.task_id, sources: found.sources, allSources: found.sources });
      } catch (error) {
        showError(error);
        setResult(null);
      }
      return;
    }
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setResult({ ...emptyResult(module.id, title), running: true, status: 'Starting' });
    try {
      await postStream(`/api/studio/run/${module.id}`, {
        inputs, groups, filters, role: role || null, headings, length, high_quality: highQuality, from_task: from?.id ?? null,
        library_document_ids: library.map((pick) => pick.id), attachments: files.map(({ name, text }) => ({ name, text })),
      }, (event, data) => {
        setResult((current) => {
          if (!current) return current;
          switch (event) {
            case 'task': {
              const url = new URL(window.location.href);
              url.searchParams.set('task', data.id);
              url.searchParams.delete('from');
              window.history.replaceState(null, '', url.toString());
              return { ...current, taskId: data.id };
            }
            case 'status': return { ...current, status: data.detail };
            case 'sources': return { ...current, allSources: data.sources };
            case 'delta': return { ...current, markdown: current.markdown + data.text };
            case 'pairs': return { ...current, pairs: data.pairs };
            case 'done': return { ...current, running: false, status: null, markdown: data.markdown ?? current.markdown, sources: data.sources ?? [], allSources: data.all_sources ?? current.allSources, pairs: data.pairs ?? current.pairs, deck: data.deck ?? null, lockedSlides: data.locked_slides ?? 0 };
            case 'error': return { ...current, running: false, status: null, error: data.detail };
            default: return current;
          }
        });
      }, controller.signal);
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        showError(error);
        setResult((current) => (current ? { ...current, running: false, status: null, error: (error as Error).message } : current));
      }
    } finally {
      setResult((current) => (current?.running ? { ...current, running: false, status: null } : current));
      creditsChanged();
    }
  }, [missing, inputs, module, groups, filters, role, headings, length, highQuality, from, library, files]);

  const shownSources = result?.sources.length ? result.sources : result?.allSources ?? [];

  return (
    <AppFrame wide title={info.title} subtitle={info.subtitle}>
      {intro?.({ from: from ?? finished, startTemplate })}
      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label={`${info.title} modules`} className="-mx-[18px] flex gap-1.5 overflow-x-auto px-[18px] pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
          {modules.map((item) => (
            <button key={item.id} type="button" onClick={() => choose(item.id)} aria-current={item.id === moduleId ? 'true' : undefined}
              className={`shrink-0 rounded-[10px] px-3 py-2 text-left text-[14px] font-medium lg:w-full ${item.id === moduleId ? 'bg-brand-50 text-brand' : 'text-ink-2 hover:bg-soft'}`}>
              {item.label}
            </button>
          ))}
        </nav>

        <div ref={form} className="min-w-0 scroll-mt-6">
          <Card className={`p-4 transition-shadow duration-500 sm:p-5 ${picked ? 'ring-2 ring-brand ring-offset-2 ring-offset-[var(--color-page)]' : ''}`}>
            {chosenTemplate ? (
              <>
                <p className="text-[12.5px] font-semibold uppercase tracking-[0.06em] text-brand">Template</p>
                <h2 className="text-[18px] font-bold tracking-[-0.01em] text-ink">{chosenTemplate.label}</h2>
                <p className="mt-0.5 text-[14.5px] text-muted">
                  {from
                    ? <>Every section is written for you from “{from.title}”, citing its sources. Check the topic, then press <strong className="font-semibold text-ink-2">{runLabel}</strong>.</>
                    : <>Add your topic, then press <strong className="font-semibold text-ink-2">{runLabel}</strong>. Every section is written for you with citations to real papers.</>}
                </p>
                <div className="mt-3 rounded-xl bg-soft px-4 py-3">
                  <p className="text-[13px] font-semibold text-ink-2">What gets written</p>
                  <ol className="mt-1.5 flex flex-wrap gap-1.5">
                    {chosenTemplate.sections.map(([heading]) => (
                      <li key={heading} className="inline-flex items-center gap-1 rounded-md bg-surface px-2 py-1 text-[13px] text-ink-2">
                        <LuCheck className="h-3.5 w-3.5 text-brand" aria-hidden="true" />{/^references/i.test(heading) ? `${heading} (from the citations)` : heading}
                      </li>
                    ))}
                  </ol>
                  <p className="mt-2 text-[12.5px] text-muted">Anything only you know (your data, sample, results, budget) is left as a [placeholder] to fill in. You can edit everything afterwards in the editor.</p>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-[18px] font-bold tracking-[-0.01em] text-ink">{module.label}</h2>
                <p className="mt-0.5 text-[14.5px] text-muted">{module.short}</p>
              </>
            )}
            {from && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-[13.5px] text-brand-600">
                <span className="min-w-0 flex-1 truncate">Building on “{from.title}”{from.sources.length ? ` and its ${from.sources.length} sources` : ''}</span>
                <button type="button" onClick={stopBuilding} className="font-semibold hover:underline">Start fresh</button>
              </div>
            )}
            <div className="mt-4 grid gap-4">
              {module.fields.map((field) => <Field key={`${module.id}-${field.name}`} field={field} value={inputs[field.name] ?? ''} onChange={(value) => setInputs((current) => ({ ...current, [field.name]: value }))} />)}
            </div>
            {grounded && !from && (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line-2 pt-4">
                <SourcePicker value={groups} onChange={setGroups} />
                <FiltersToggle value={filters} onChange={setFilters} />
              </div>
            )}
            {module.output === 'markdown' && module.grounded && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2"><span className="text-[13.5px] text-muted">Your own sources:</span><AttachMenu files={files} onFiles={setFiles} library={library} onLibrary={setLibrary} /></div>
                <AttachmentList files={files} onFiles={setFiles} library={library} onLibrary={setLibrary} />
              </div>
            )}
            {module.output !== 'papers' && (
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line-2 pt-4">
                <RoleSelect value={role} onChange={setRole} />
                {module.output === 'markdown' && (
                  <>
                    {!chosenTemplate && <Check size="sm" checked={headings} onChange={setHeadings}>With headings</Check>}
                    {module.lengthOption && (
                      <Select label="Length" prefix="Length" icon={<LuRuler />} value={length} onChange={(next) => setLength(next as typeof length)} active={length !== 'standard'}
                        options={[{ value: 'standard', label: 'Standard' }, { value: 'short', label: 'Shorter', detail: 'About half the usual length' }, { value: 'long', label: 'Longer', detail: 'More depth and detail' }]} />
                    )}
                    {module.grounded && (
                      <Select label="Citation style" prefix="Style" icon={<LuQuote />} value={style} onChange={(next) => setStyle(next as typeof style)}
                        options={STYLES.map(([id, label]) => ({ value: id, label }))} />
                    )}
                  </>
                )}
                <Check size="sm" title="The stronger model and longer answers, for 3× the credits" checked={highQuality} onChange={(on) => (limits.highQuality ? setHighQuality(on) : openPricing('High-quality mode is part of the Pro plan.'))}>
                  High quality{!limits.highQuality && <LuLock className="h-3.5 w-3.5 text-muted" aria-label="Pro plan" />}
                </Check>
              </div>
            )}
            <div className="mt-5 flex items-center gap-3">
              <Button ref={runButton} variant="primary" onClick={run} disabled={running}>{running ? <LuLoaderCircle className="h-4 w-4 animate-spin" /> : <LuPlay className="h-4 w-4" />}{running ? (chosenTemplate ? 'Writing…' : 'Working…') : runLabel}</Button>
              <CreditCost credits={cost} />
            </div>
          </Card>

          {result && (
            <section aria-label="Result" className="mt-6">
              {result.running && result.status && <p className="mb-3 flex items-center gap-2 text-[15px] font-medium text-ink-2" aria-live="polite"><LuLoaderCircle className="h-4 w-4 animate-spin text-brand" aria-hidden="true" />{result.status}…</p>}
              {result.error && <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-[14.5px] text-red-700">{result.error}</p>}
              {module.output === 'compare' && result.pairs.length > 0 && !result.running && <CompareView pairs={result.pairs} title={result.title || 'Improved document'} />}
              {module.output === 'slides' && result.deck && <SlidesView deck={result.deck} sources={result.allSources} locked={result.lockedSlides} />}
              {module.output === 'papers' && !result.running && (
                <Card><ul className="p-1.5">{result.sources.length ? result.sources.map((source) => <SourceRow key={source.n} source={source} />) : <li className="px-3 py-6 text-center text-[14px] text-muted">No similar papers found.</li>}</ul></Card>
              )}
              {module.output === 'markdown' && (result.markdown || shownSources.length > 0) && (
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
                  <div className="min-w-0">
                    {result.markdown && <Card className="px-5 py-2 sm:px-6"><CitedMarkdown markdown={result.markdown} sources={result.allSources} onCite={(n) => document.getElementById(`source-${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })} /></Card>}
                    {!result.running && result.markdown && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button variant="primary" size="sm" onClick={() => openResultInEditor(result.title || module.label, result.markdown, result.allSources, style)}><LuFilePen className="h-4 w-4" />Open in editor</Button>
                        <Button size="sm" onClick={() => navigator.clipboard.writeText(result.markdown).then(() => toast.success('Copied'))}><LuCopy className="h-4 w-4" />Copy</Button>
                      </div>
                    )}
                    {finished && (
                      <section aria-labelledby="studio-next-title" className="mt-6">
                        <h3 id="studio-next-title" className="text-[14.5px] font-bold text-ink">Build on this</h3>
                        <p className="mt-0.5 text-[13.5px] text-muted">Choose another module{workspace === 'write' ? ' or a template' : ''}, or continue elsewhere. This result and its sources go with you.</p>
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          {followOnLinks(finished.id).filter((link) => !link.href.startsWith(`${info.path}?`)).map((link) => (
                            <Link key={link.href} href={link.href} className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-line bg-surface px-3 text-[14px] font-medium text-ink-2 hover:bg-soft">
                              {link.label}<LuArrowRight className="h-3.5 w-3.5 text-subtle" aria-hidden="true" />
                            </Link>
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                  {shownSources.length > 0 && (
                    <aside aria-label="Sources" className="min-w-0">
                      <Card>
                        <p className="border-b border-line-2 px-4 py-3 text-[14px] font-semibold text-ink">{result.sources.length ? `Cited (${result.sources.length})` : `Sources read (${shownSources.length})`}</p>
                        <ul className="p-1.5">{shownSources.map((source) => <SourceRow key={source.n} source={source} />)}</ul>
                      </Card>
                    </aside>
                  )}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </AppFrame>
  );
}
