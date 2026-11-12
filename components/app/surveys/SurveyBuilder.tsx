'use client';

/**
 * Survey builder: sections and questions (with variable codes), validated instruments, scale
 * scoring, AI drafting and checking, the public link, and responses handed to Data Lab.
 * The definition is edited locally and saved with its revision (lib/surveyModel.ts).
 */
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { LuArrowDown, LuArrowUp, LuChartBar, LuCopy, LuDownload, LuExternalLink, LuFilePen, LuLoaderCircle, LuLock, LuPlus, LuSave, LuSparkles, LuTrash2 } from 'react-icons/lu';
import { api } from '@/lib/session';
import { Button, Card, Segmented, StatusPill, inputClass } from '@/components/app/ui';
import { CreditCost, creditsChanged, showError, Tag } from '@/components/app/research/parts';
import { download } from '@/components/app/analysis/stats';
import { openInEditor } from '@/components/tools/editorHandoff';
import { markdownToHtml } from '@/components/tools/toolOutput';
import { INSTRUMENTS, instrument, instrumentBlock, type Instrument } from '@/lib/surveyInstruments';
import {
  LIKERT_PRESETS, QUESTION_TYPES, allQuestions, codeFrom, codebookCsv, dataTemplateCsv, likertOptions, questionnaireMarkdown, surveyProblems,
  type QuestionType, type SurveyDefinition, type SurveyQuestion, type SurveySection,
} from '@/lib/surveyModel';
import type { ScaleScoring } from '@/lib/surveyScoring';

export type SurveyRecord = SurveyDefinition & { id: string; status: 'draft' | 'open' | 'closed'; public_id: string | null; response_count: number; revision: number; project_id: string | null };
type Tab = 'questions' | 'scoring' | 'share' | 'check';

const uid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`);
const area = 'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[14.5px] focus:border-brand focus:outline-none';
const small = 'h-9 rounded-lg border border-line bg-surface px-2.5 text-[14px]';
const definitionOf = (survey: SurveyRecord): SurveyDefinition => ({ title: survey.title, intro: survey.intro, consent: survey.consent, thank_you: survey.thank_you, sections: survey.sections, scales: survey.scales });

function newQuestion(type: QuestionType, taken: Set<string>): SurveyQuestion {
  const text = { single: 'New question', multiple: 'Which of these apply?', likert: 'New statement', number: 'How many?', text: 'Your answer', long_text: 'Please explain' }[type];
  const base: SurveyQuestion = { id: uid(), code: codeFrom(`q ${type}`, taken), type, text, required: true };
  if (type === 'single' || type === 'multiple') base.options = [{ value: '1', label: 'Option 1' }, { value: '2', label: 'Option 2' }];
  if (type === 'likert') base.options = likertOptions(LIKERT_PRESETS[0].options);
  if (type === 'multiple' || type === 'text' || type === 'long_text') base.required = false;
  return base;
}

function QuestionEditor({ question, locked, onChange, onMove, onRemove }: { question: SurveyQuestion; locked: boolean; onChange: (next: SurveyQuestion) => void; onMove: (by: -1 | 1) => void; onRemove: () => void }) {
  const set = (patch: Partial<SurveyQuestion>) => onChange({ ...question, ...patch });
  const options = question.options ?? [];
  const setOption = (index: number, patch: Partial<{ value: string; label: string }>) => set({ options: options.map((option, i) => (i === index ? { ...option, ...patch } : option)) });
  return (
    <div className="rounded-xl border border-line p-3.5">
      <div className="flex flex-wrap items-start gap-2">
        {locked
          ? <p className="min-w-0 flex-1 text-[14.5px] text-ink"><LuLock className="mr-1 inline h-3.5 w-3.5 text-muted" aria-label="Validated wording" />{question.text}</p>
          : <textarea value={question.text} onChange={(event) => set({ text: event.target.value })} rows={2} aria-label="Question" className={`${area} min-w-0 flex-1`} />}
        <div className="flex items-center gap-1">
          {!locked && <button type="button" aria-label="Move up" onClick={() => onMove(-1)} className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-soft"><LuArrowUp className="h-4 w-4" /></button>}
          {!locked && <button type="button" aria-label="Move down" onClick={() => onMove(1)} className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-soft"><LuArrowDown className="h-4 w-4" /></button>}
          {!locked && <button type="button" aria-label="Delete question" onClick={onRemove} className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-soft hover:text-red-700"><LuTrash2 className="h-4 w-4" /></button>}
        </div>
      </div>
      {!locked && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[13.5px]">
          <select aria-label="Answer type" value={question.type} onChange={(event) => { const type = event.target.value as QuestionType; const fresh = newQuestion(type, new Set()); set({ type, options: ['single', 'multiple', 'likert'].includes(type) ? (['single', 'multiple'].includes(question.type) && type !== 'likert' ? question.options : fresh.options) : undefined }); }} className={small}>
            {QUESTION_TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
          </select>
          <label className="inline-flex items-center gap-1.5">Variable<input value={question.code} onChange={(event) => set({ code: event.target.value.replace(/[^A-Za-z0-9_]/g, '_').slice(0, 32) })} aria-label="Variable name" className={`${small} w-36 font-mono text-[13px]`} /></label>
          <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={question.required} onChange={(event) => set({ required: event.target.checked })} />Required</label>
          {question.type === 'likert' && (
            <select aria-label="Rating scale" value="" onChange={(event) => { const preset = LIKERT_PRESETS.find((item) => item.id === event.target.value); if (preset) set({ options: likertOptions(preset.options, Number(options[0]?.value ?? 1) === 0 ? 0 : 1) }); }} className={small}>
              <option value="">Use a standard scale…</option>{LIKERT_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
            </select>
          )}
        </div>
      )}
      {locked && <p className="mt-1 font-mono text-[12.5px] text-muted">{question.code}</p>}
      {!locked && question.type === 'number' && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[13.5px]">
          <label className="inline-flex items-center gap-1.5">From<input type="number" value={question.min ?? ''} onChange={(event) => set({ min: event.target.value === '' ? null : Number(event.target.value) })} className={`${small} w-24`} /></label>
          <label className="inline-flex items-center gap-1.5">to<input type="number" value={question.max ?? ''} onChange={(event) => set({ max: event.target.value === '' ? null : Number(event.target.value) })} className={`${small} w-24`} /></label>
          <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={Boolean(question.integer)} onChange={(event) => set({ integer: event.target.checked })} />Whole numbers</label>
        </div>
      )}
      {!locked && ['single', 'multiple', 'likert'].includes(question.type) && (
        <div className="mt-2 space-y-1.5">
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <input value={option.value} onChange={(event) => setOption(index, { value: event.target.value.replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 40) })} aria-label="Code" title="The code stored in the data" className={`${small} w-16 text-center font-mono text-[13px]`} />
              <input value={option.label} onChange={(event) => setOption(index, { label: event.target.value })} aria-label="Answer" className={`${small} min-w-0 flex-1`} />
              <button type="button" aria-label="Remove answer" onClick={() => set({ options: options.filter((_, i) => i !== index) })} className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-soft"><LuTrash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { const next = question.type === 'likert' ? String(Math.max(...options.map((option) => Number(option.value) || 0), 0) + 1) : String(options.length + 1); set({ options: [...options, { value: next, label: `Option ${options.length + 1}` }] }); }} className="text-[13px] font-semibold text-brand hover:underline">Add answer</button>
            {question.type !== 'likert' && !options.some((option) => /prefer not/i.test(option.label)) && <button type="button" onClick={() => set({ options: [...options, { value: '99', label: 'Prefer not to say' }] })} className="text-[13px] font-semibold text-brand hover:underline">Add “Prefer not to say”</button>}
            {question.type !== 'likert' && !options.some((option) => /^other/i.test(option.label)) && <button type="button" onClick={() => set({ options: [...options, { value: 'other', label: 'Other' }] })} className="text-[13px] font-semibold text-brand hover:underline">Add “Other”</button>}
          </div>
        </div>
      )}
      {locked && question.options && <p className="mt-1 text-[12.5px] text-muted">{question.options.map((option) => `${option.value} = ${option.label}`).join(' · ')}</p>}
    </div>
  );
}

function InstrumentCard({ item, onAdd }: { item: Instrument; onAdd: () => void }) {
  return (
    <div className="rounded-xl border border-line p-3.5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-ink">{item.name} <span className="font-normal text-muted">· {item.full}</span></p>
          <p className="text-[13.5px] text-ink-2">{item.measures}. {item.items.length} items. {item.scoreText}</p>
        </div>
        <Button size="sm" variant="primary" onClick={onAdd}><LuPlus className="h-4 w-4" />Add</Button>
      </div>
      <p className="mt-1.5 text-[12.5px] text-muted">{item.licence} {item.citation}</p>
      {item.cautions.map((caution) => <p key={caution} className="mt-1 text-[12.5px] text-amber-800">{caution}</p>)}
    </div>
  );
}

function ScaleEditor({ scale, questions, onChange, onRemove }: { scale: ScaleScoring; questions: SurveyQuestion[]; onChange: (next: ScaleScoring) => void; onRemove: () => void }) {
  const scorable = questions.filter((question) => question.type === 'likert' || question.type === 'number');
  const set = (patch: Partial<ScaleScoring>) => onChange({ ...scale, ...patch });
  const toggle = (code: string) => set(scale.items.includes(code) ? { items: scale.items.filter((item) => item !== code), reverse: scale.reverse.filter((item) => item !== code) } : { items: [...scale.items, code] });
  const bands = scale.bands ?? [];
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-2">
        <input value={scale.name} onChange={(event) => set({ name: event.target.value.replace(/[^A-Za-z0-9_]/g, '_').slice(0, 40) })} aria-label="Scale name" className={`${small} w-44 font-semibold`} />
        <select aria-label="Score" value={scale.method} onChange={(event) => set({ method: event.target.value as 'sum' | 'mean' })} className={small}><option value="sum">Sum</option><option value="mean">Mean</option></select>
        <label className="inline-flex items-center gap-1.5 text-[13.5px]">Answers from<input type="number" value={scale.min} onChange={(event) => set({ min: Number(event.target.value) })} className={`${small} w-16`} /></label>
        <label className="inline-flex items-center gap-1.5 text-[13.5px]">to<input type="number" value={scale.max} onChange={(event) => set({ max: Number(event.target.value) })} className={`${small} w-16`} /></label>
        <button type="button" aria-label="Delete scale" onClick={onRemove} className="ml-auto grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-soft hover:text-red-700"><LuTrash2 className="h-4 w-4" /></button>
      </div>
      <p className="mt-3 text-[13px] font-semibold">Items <span className="font-normal text-muted">(R = reverse-scored)</span></p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {scorable.map((question) => {
          const on = scale.items.includes(question.code);
          const reversed = scale.reverse.includes(question.code);
          return (
            <span key={question.id} className={`inline-flex items-center overflow-hidden rounded-full border text-[13px] ${on ? 'border-brand bg-brand-50' : 'border-line'}`}>
              <button type="button" aria-pressed={on} onClick={() => toggle(question.code)} className="px-2.5 py-1 font-mono" title={question.text}>{question.code}</button>
              {on && <button type="button" aria-pressed={reversed} onClick={() => set({ reverse: reversed ? scale.reverse.filter((item) => item !== question.code) : [...scale.reverse, question.code] })} className={`border-l border-line px-2 py-1 font-semibold ${reversed ? 'bg-brand text-on-brand' : 'text-muted'}`} title="Reverse-scored">R</button>}
            </span>
          );
        })}
        {!scorable.length && <p className="text-[13px] text-muted">Add rating-scale or number questions to score them.</p>}
      </div>
      <details className="mt-3">
        <summary className="cursor-pointer text-[13px] font-semibold">Bands and rescaling{bands.length ? ` (${bands.length} bands)` : ''}</summary>
        <div className="mt-2 space-y-1.5">
          {bands.map((band, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2 text-[13.5px]">
              <input value={band.label} onChange={(event) => set({ bands: bands.map((item, i) => (i === index ? { ...item, label: event.target.value } : item)) })} aria-label="Band label" className={`${small} w-44`} />
              <input type="number" value={band.from} onChange={(event) => set({ bands: bands.map((item, i) => (i === index ? { ...item, from: Number(event.target.value) } : item)) })} aria-label="From" className={`${small} w-20`} />–
              <input type="number" value={band.to} onChange={(event) => set({ bands: bands.map((item, i) => (i === index ? { ...item, to: Number(event.target.value) } : item)) })} aria-label="To" className={`${small} w-20`} />
              <button type="button" aria-label="Remove band" onClick={() => set({ bands: bands.filter((_, i) => i !== index) })} className="text-muted hover:text-red-700"><LuTrash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          <button type="button" onClick={() => set({ bands: [...bands, { label: 'Band', from: 0, to: 0 }] })} className="text-[13px] font-semibold text-brand hover:underline">Add band</button>
          <div className="flex flex-wrap items-center gap-2 text-[13.5px]">
            <span>Then add</span><input type="number" value={scale.rescale?.add ?? 0} onChange={(event) => set({ rescale: { add: Number(event.target.value), multiply: scale.rescale?.multiply ?? 1 } })} className={`${small} w-20`} />
            <span>and multiply by</span><input type="number" value={scale.rescale?.multiply ?? 1} onChange={(event) => set({ rescale: { add: scale.rescale?.add ?? 0, multiply: Number(event.target.value) } })} className={`${small} w-20`} />
          </div>
        </div>
      </details>
    </Card>
  );
}

export function SurveyBuilder({ initial, canEdit }: { initial: SurveyRecord; canEdit: boolean }) {
  const [survey, setSurvey] = useState<SurveyRecord>(initial);
  const [definition, setDefinition] = useState<SurveyDefinition>(definitionOf(initial));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>('questions');
  const [showInstruments, setShowInstruments] = useState(false);
  const [draft, setDraft] = useState({ open: false, aims: '', population: '', count: 12, busy: false, notes: '', suggest: [] as string[] });
  const [review, setReview] = useState<{ busy: boolean; overall: string; comments: { code: string | null; severity: 'major' | 'minor'; issue: string; fix: string }[] } | null>(null);
  const questions = useMemo(() => allQuestions(definition), [definition]);
  const problems = useMemo(() => surveyProblems(definition), [definition]);
  const locked = !canEdit;

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const change = (next: SurveyDefinition) => { setDefinition(next); setDirty(true); };
  const taken = () => new Set(questions.map((question) => question.code.toLowerCase()));
  const setSection = (index: number, section: SurveySection) => change({ ...definition, sections: definition.sections.map((item, i) => (i === index ? section : item)) });
  const moveQuestion = (s: number, q: number, by: -1 | 1) => {
    const section = definition.sections[s];
    const target = q + by;
    if (target < 0 || target >= section.questions.length) return;
    const list = [...section.questions];
    [list[q], list[target]] = [list[target], list[q]];
    setSection(s, { ...section, questions: list });
  };
  const removeSection = (index: number) => {
    const gone = new Set(definition.sections[index].questions.map((question) => question.code));
    change({ ...definition, sections: definition.sections.filter((_, i) => i !== index), scales: definition.scales.filter((scale) => !scale.items.every((item) => gone.has(item))).map((scale) => ({ ...scale, items: scale.items.filter((item) => !gone.has(item)), reverse: scale.reverse.filter((item) => !gone.has(item)) })) });
  };
  const addInstrument = (item: Instrument) => {
    const block = instrumentBlock(item, taken(), uid);
    change({ ...definition, sections: [...definition.sections, block.section], scales: [...definition.scales, block.scale] });
    setShowInstruments(false);
    toast.success(`${item.name} added with its scoring.`);
  };

  const save = async () => {
    if (problems.length) { toast.error(problems[0]); return; }
    setSaving(true);
    try {
      const result = await api<{ revision: number }>(`/api/surveys/${survey.id}`, { method: 'PUT', body: JSON.stringify({ definition, revision: survey.revision }) });
      setSurvey({ ...survey, ...definition, revision: result.revision });
      setDirty(false);
      toast.success('Saved');
    } catch (error) { showError(error); } finally { setSaving(false); }
  };
  const setStatus = async (status: SurveyRecord['status']) => {
    if (dirty) { toast.error('Save your changes first.'); return; }
    try {
      const result = await api<{ status: SurveyRecord['status']; public_id: string | null }>(`/api/surveys/${survey.id}/status`, { method: 'POST', body: JSON.stringify({ status }) });
      setSurvey({ ...survey, ...result });
      toast.success(status === 'open' ? 'The survey is open. Share the link.' : status === 'closed' ? 'Closed. No more responses are accepted.' : 'Back to draft.');
    } catch (error) { showError(error); }
  };
  const runDraft = async () => {
    setDraft({ ...draft, busy: true });
    try {
      const result = await api<{ sections: SurveySection[]; suggest_instruments: string[]; notes: string }>(`/api/surveys/${survey.id}/ai/draft`, { method: 'POST', body: JSON.stringify({ aims: draft.aims, population: draft.population, count: draft.count }) });
      // Codes come back unique against the saved survey; make them unique against unsaved edits too.
      const codes = taken();
      const sections = result.sections.map((section) => ({ ...section, id: uid(), questions: section.questions.map((question) => ({ ...question, id: uid(), code: codes.has(question.code.toLowerCase()) ? codeFrom(question.text, codes) : (codes.add(question.code.toLowerCase()), question.code) })) }));
      change({ ...definition, sections: [...definition.sections, ...sections] });
      setDraft({ ...draft, busy: false, open: false, notes: result.notes, suggest: result.suggest_instruments });
      toast.success(`${sections.reduce((sum, section) => sum + section.questions.length, 0)} questions added. Edit them before you save.`);
    } catch (error) { showError(error); setDraft({ ...draft, busy: false }); } finally { creditsChanged(); }
  };
  const runReview = async () => {
    if (dirty) { toast.error('Save your changes first, so the check reads the current questions.'); return; }
    setReview({ busy: true, overall: '', comments: [] });
    try {
      const result = await api<{ overall: string; comments: { code: string | null; severity: 'major' | 'minor'; issue: string; fix: string }[] }>(`/api/surveys/${survey.id}/ai/review`, { method: 'POST', body: JSON.stringify({}) });
      setReview({ busy: false, ...result });
    } catch (error) { showError(error); setReview(null); } finally { creditsChanged(); }
  };
  const responses = async (action: 'download' | 'delete') => {
    try {
      if (action === 'delete') {
        if (!window.confirm(`Delete all ${survey.response_count} responses? This cannot be undone.`)) return;
        await api(`/api/surveys/${survey.id}/responses`, { method: 'DELETE' });
        setSurvey({ ...survey, response_count: 0 });
        toast.success('Responses deleted');
        return;
      }
      const result = await api<{ csv: string; count: number }>(`/api/surveys/${survey.id}/responses`);
      download(`${definition.title.replace(/[^\w-]+/g, '-').slice(0, 60) || 'survey'}-responses.csv`, result.csv, 'text/csv');
    } catch (error) { showError(error); }
  };

  const link = survey.public_id && typeof window !== 'undefined' ? `${window.location.origin}/s/${survey.public_id}` : '';
  const phq = definition.sections.some((section) => section.instrument === 'phq9');
  const identifying = questions.some((question) => /\b(name|e-?mail|phone|address|date of birth|student (id|number))\b/i.test(question.text));

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <input value={definition.title} disabled={locked} onChange={(event) => change({ ...definition, title: event.target.value })} aria-label="Survey title" className={`${inputClass} min-w-0 flex-1 text-[17px] font-bold`} />
          <StatusPill tone={survey.status === 'open' ? 'positive' : survey.status === 'closed' ? 'warning' : 'neutral'}>{survey.status === 'open' ? 'Collecting' : survey.status === 'closed' ? 'Closed' : 'Draft'}</StatusPill>
          <span className="text-[13.5px] text-muted">{survey.response_count} response{survey.response_count === 1 ? '' : 's'}</span>
          {canEdit && <Button variant="primary" onClick={save} disabled={!dirty || saving}>{saving ? <LuLoaderCircle className="h-4 w-4 animate-spin" /> : <LuSave className="h-4 w-4" />}{dirty ? 'Save' : 'Saved'}</Button>}
        </div>
        {problems.length > 0 && <p className="mt-2 text-[13px] text-amber-800">{problems[0]}{problems.length > 1 ? ` (and ${problems.length - 1} more)` : ''}</p>}
        {survey.response_count > 0 && canEdit && <p className="mt-2 text-[13px] text-muted">This survey has responses: you can reword questions and add new ones, but not remove questions or answer codes.</p>}
      </Card>

      <Segmented label="Survey" value={tab} onChange={setTab} options={[{ value: 'questions', label: `Questions (${questions.length})` }, { value: 'scoring', label: `Scoring (${definition.scales.length})` }, { value: 'share', label: 'Share and responses' }, { value: 'check', label: 'Check' }]} />

      {tab === 'questions' && (
        <div className="space-y-5">
          <Card className="p-4">
            <h2 className="text-[15px] font-bold">Before the questions</h2>
            <label className="mt-2 block text-[13px] font-semibold">Participant information<textarea value={definition.intro} disabled={locked} onChange={(event) => change({ ...definition, intro: event.target.value })} rows={4} placeholder="Who you are, what the study is for, how long it takes, that answers are anonymous, how data is stored, and who to contact." className={`${area} mt-1 font-normal`} /></label>
            <label className="mt-3 block text-[13px] font-semibold">Consent statement (people must agree before answering)<textarea value={definition.consent} disabled={locked} onChange={(event) => change({ ...definition, consent: event.target.value })} rows={3} placeholder="e.g. I have read the information above, I am 18 or older, and I agree to take part. I understand I can stop at any time." className={`${area} mt-1 font-normal`} /></label>
            <label className="mt-3 block text-[13px] font-semibold">Thank-you message<input value={definition.thank_you} disabled={locked} onChange={(event) => change({ ...definition, thank_you: event.target.value })} className={`${inputClass} mt-1 font-normal`} /></label>
            {phq && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-900">{instrument('phq9')!.cautions[0]} Add support contacts to the thank-you message.</p>}
            {identifying && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-900">Some questions ask for identifying details. Responses are then no longer anonymous: say so in the participant information and check your ethics approval and data protection plan.</p>}
          </Card>

          {definition.sections.map((section, s) => {
            const fromInstrument = section.instrument ? instrument(section.instrument) : null;
            return (
              <Card key={section.id} className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <input value={section.title} disabled={locked} onChange={(event) => setSection(s, { ...section, title: event.target.value })} aria-label="Section title" placeholder="Section title" className={`${inputClass} min-w-0 flex-1 font-semibold`} />
                  {fromInstrument && <Tag tone="brand">Validated: {fromInstrument.name}</Tag>}
                  {canEdit && <button type="button" aria-label="Delete section" onClick={() => removeSection(s)} className="grid h-9 w-9 place-items-center rounded-md text-muted hover:bg-soft hover:text-red-700"><LuTrash2 className="h-4 w-4" /></button>}
                </div>
                {fromInstrument
                  ? <p className="mt-2 text-[13.5px] text-ink-2">{section.description} <span className="text-muted">The items keep their published wording and order; {fromInstrument.citation}</span></p>
                  : <textarea value={section.description ?? ''} disabled={locked} onChange={(event) => setSection(s, { ...section, description: event.target.value })} rows={1} placeholder="Instructions for this section (optional)" className={`${area} mt-2`} />}
                <div className="mt-3 space-y-2.5">
                  {section.questions.map((question, q) => (
                    <QuestionEditor key={question.id} question={question} locked={locked || Boolean(question.instrument)}
                      onChange={(next) => setSection(s, { ...section, questions: section.questions.map((item, i) => (i === q ? next : item)) })}
                      onMove={(by) => moveQuestion(s, q, by)}
                      onRemove={() => setSection(s, { ...section, questions: section.questions.filter((_, i) => i !== q) })} />
                  ))}
                </div>
                {canEdit && !fromInstrument && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-[13px] text-muted">Add:</span>
                    {QUESTION_TYPES.map((type) => <button key={type.id} type="button" onClick={() => setSection(s, { ...section, questions: [...section.questions, newQuestion(type.id, taken())] })} className="rounded-full border border-line px-3 py-1 text-[13px] hover:bg-soft">{type.label}</button>)}
                  </div>
                )}
              </Card>
            );
          })}

          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => change({ ...definition, sections: [...definition.sections, { id: uid(), title: 'New section', questions: [] }] })}><LuPlus className="h-4 w-4" />Section</Button>
              <Button onClick={() => setShowInstruments(!showInstruments)}><LuPlus className="h-4 w-4" />Validated scale</Button>
              <Button onClick={() => setDraft({ ...draft, open: !draft.open })}><LuSparkles className="h-4 w-4" />Draft questions with AI</Button>
            </div>
          )}
          {showInstruments && (
            <Card className="p-4">
              <h2 className="text-[15px] font-bold">Validated scales</h2>
              <p className="mt-1 text-[13px] text-muted">Free to use in research. Each is added with its published wording and its scoring, so Data Lab can score it and check its reliability.</p>
              <div className="mt-3 space-y-2.5">{INSTRUMENTS.map((item) => <InstrumentCard key={item.id} item={item} onAdd={() => addInstrument(item)} />)}</div>
            </Card>
          )}
          {draft.open && (
            <Card className="p-4">
              <h2 className="text-[15px] font-bold">Draft questions from your aims</h2>
              <textarea value={draft.aims} onChange={(event) => setDraft({ ...draft, aims: event.target.value })} rows={3} placeholder="What should the survey find out? e.g. How first-year students’ sleep, screen time and study habits relate to their stress and grades." className={`${area} mt-2`} />
              <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
                <input value={draft.population} onChange={(event) => setDraft({ ...draft, population: event.target.value })} placeholder="Who answers it, e.g. undergraduates aged 18–25" className={inputClass} />
                <select value={draft.count} onChange={(event) => setDraft({ ...draft, count: Number(event.target.value) })} aria-label="How many questions" className={inputClass}>{[6, 12, 20, 30].map((count) => <option key={count} value={count}>About {count} questions</option>)}</select>
              </div>
              <div className="mt-3 flex items-center justify-end gap-3"><CreditCost credits={3} /><Button variant="primary" onClick={runDraft} disabled={draft.busy || draft.aims.trim().length < 10}>{draft.busy ? <LuLoaderCircle className="h-4 w-4 animate-spin" /> : <LuSparkles className="h-4 w-4" />}Draft</Button></div>
            </Card>
          )}
          {(draft.notes || draft.suggest.length > 0) && (
            <Card className="p-4">
              {draft.notes && <p className="text-[14px] text-ink-2">{draft.notes}</p>}
              {draft.suggest.length > 0 && <><p className="mt-2 text-[13px] font-semibold">Validated instruments worth considering</p><ul className="mt-1 list-disc pl-5 text-[13.5px] text-ink-2">{draft.suggest.map((item) => <li key={item}>{item}</li>)}</ul><p className="mt-1 text-[12.5px] text-muted">Check each one’s licence and published wording before you use it.</p></>}
            </Card>
          )}
        </div>
      )}

      {tab === 'scoring' && (
        <div className="space-y-4">
          <p className="text-[14px] text-muted">A scale adds a score column (and a band column, if it has bands) when you analyse the responses in Data Lab. Validated scales come with their scoring.</p>
          {definition.scales.map((scale, index) => (
            <ScaleEditor key={index} scale={scale} questions={questions}
              onChange={(next) => change({ ...definition, scales: definition.scales.map((item, i) => (i === index ? next : item)) })}
              onRemove={() => change({ ...definition, scales: definition.scales.filter((_, i) => i !== index) })} />
          ))}
          {canEdit && <Button onClick={() => change({ ...definition, scales: [...definition.scales, { name: `scale${definition.scales.length + 1}`, items: [], reverse: [], min: 1, max: 5, method: 'mean' }] })}><LuPlus className="h-4 w-4" />Scale</Button>}
        </div>
      )}

      {tab === 'share' && (
        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="text-[15px] font-bold">Collect responses online</h2>
            {survey.status === 'open' && link ? (
              <>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input readOnly value={link} aria-label="Survey link" className={`${inputClass} min-w-0 flex-1 font-mono text-[13.5px]`} onFocus={(event) => event.target.select()} />
                  <Button onClick={() => navigator.clipboard.writeText(link).then(() => toast.success('Link copied'))}><LuCopy className="h-4 w-4" />Copy</Button>
                  <a href={link} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1 px-2 text-[14px] font-semibold text-brand hover:underline">Open<LuExternalLink className="h-3.5 w-3.5" /></a>
                </div>
                <p className="mt-2 text-[13px] text-muted">Anyone with the link can answer once per visit, without an account. No names, emails or IP addresses are stored with responses.</p>
                {canEdit && <Button className="mt-3" onClick={() => setStatus('closed')}>Close the survey</Button>}
              </>
            ) : (
              <>
                <p className="mt-1 text-[13.5px] text-muted">{survey.status === 'closed' ? 'The survey is closed; the link no longer accepts responses.' : 'Opening the survey creates a private link you can share by email, message or QR code. Pilot it with a few people first, then delete their responses.'}</p>
                {canEdit && <div className="mt-3 flex flex-wrap gap-2"><Button variant="primary" onClick={() => setStatus('open')} disabled={Boolean(problems.length) || !questions.length}>{survey.status === 'closed' ? 'Reopen' : 'Open the survey'}</Button>{survey.status === 'closed' && survey.response_count === 0 && <Button onClick={() => setStatus('draft')}>Back to draft</Button>}</div>}
              </>
            )}
          </Card>
          <Card className="p-4">
            <h2 className="text-[15px] font-bold">Responses</h2>
            <p className="mt-1 text-[13.5px] text-muted">{survey.response_count} so far. The data has one column per question, named by its variable; several-choice questions become one yes/no column per answer.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/data-lab?survey=${survey.id}`} className="inline-flex h-10 items-center gap-2 rounded-[11px] bg-brand px-4 text-[14.5px] font-semibold text-on-brand"><LuChartBar className="h-4 w-4" />Analyse in Data Lab</Link>
              <Button onClick={() => responses('download')} disabled={!survey.response_count}><LuDownload className="h-4 w-4" />Responses CSV</Button>
              {canEdit && survey.response_count > 0 && <Button onClick={() => responses('delete')}><LuTrash2 className="h-4 w-4" />Delete all responses</Button>}
            </div>
          </Card>
          <Card className="p-4">
            <h2 className="text-[15px] font-bold">Paper copies and the ethics application</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={() => { const markdown = questionnaireMarkdown(definition); openInEditor({ title: definition.title, html: markdownToHtml(markdown), markdown, style: 'apa' }); }}><LuFilePen className="h-4 w-4" />Questionnaire in the editor (Word, PDF)</Button>
              <Button onClick={() => download('codebook.csv', codebookCsv(definition), 'text/csv')}><LuDownload className="h-4 w-4" />Codebook</Button>
              <Button onClick={() => download('data-entry-template.csv', dataTemplateCsv(definition), 'text/csv')}><LuDownload className="h-4 w-4" />Data entry template</Button>
              <Button onClick={() => download('survey.json', JSON.stringify(definition, null, 2), 'application/json')}><LuDownload className="h-4 w-4" />Survey file</Button>
            </div>
            <p className="mt-2 text-[13px] text-muted">For paper surveys, type the answers into the data entry template (one row per person, the codes from the codebook) and upload it to Data Lab.</p>
          </Card>
        </div>
      )}

      {tab === 'check' && (
        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="text-[15px] font-bold">Check the questionnaire before piloting</h2>
            <p className="mt-1 text-[13.5px] text-muted">Leading or double-barrelled questions, vague terms, overlapping or missing answers, unbalanced scales and missing “Prefer not to say” options. Validated items are not reworded.</p>
            <div className="mt-3 flex items-center gap-3"><Button variant="primary" onClick={runReview} disabled={review?.busy || !questions.length}>{review?.busy ? <LuLoaderCircle className="h-4 w-4 animate-spin" /> : <LuSparkles className="h-4 w-4" />}Check</Button><CreditCost credits={2} /></div>
          </Card>
          {review && !review.busy && (
            <Card className="p-4">
              {review.overall && <p className="text-[14.5px] text-ink">{review.overall}</p>}
              {!review.comments.length && <p className="mt-2 text-[14px] text-muted">No problems found.</p>}
              <ul className="mt-3 space-y-2.5">
                {review.comments.map((comment, index) => {
                  const question = comment.code ? questions.find((item) => item.code === comment.code) : null;
                  return (
                    <li key={index} className="rounded-xl border border-line p-3">
                      <div className="flex items-center gap-2"><Tag tone={comment.severity === 'major' ? 'negative' : 'warning'}>{comment.severity === 'major' ? 'Major' : 'Minor'}</Tag><span className="font-mono text-[12.5px] text-muted">{comment.code ?? 'Whole survey'}</span></div>
                      {question && <p className="mt-1.5 text-[13.5px] italic text-ink-2">“{question.text}”</p>}
                      <p className="mt-1.5 text-[14px]">{comment.issue}</p>
                      {comment.fix && <p className="mt-1 text-[14px]"><span className="font-semibold">Try:</span> {comment.fix}</p>}
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
