'use client';

/** The public survey form: anonymous, no account, no analytics. Answers go to /api/public/surveys/:id/responses. */
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Answer, SurveyQuestion, SurveySection } from '@/lib/surveyModel';

type View = { status: 'open' | 'closed' | 'draft'; title: string; intro?: string; consent?: string; sections?: SurveySection[] };

const field = 'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[15px] text-ink focus:border-brand focus:outline-none focus:shadow-[0_0_0_4px_var(--color-brand-50)]';

/** Consecutive rating questions with the same answers, shown as one grid. */
function groups(questions: SurveyQuestion[]): SurveyQuestion[][] {
  const out: SurveyQuestion[][] = [];
  for (const question of questions) {
    const last = out[out.length - 1];
    const same = last && question.type === 'likert' && last[0].type === 'likert' && JSON.stringify(last[0].options) === JSON.stringify(question.options);
    if (same) last.push(question); else out.push([question]);
  }
  return out;
}

function Paragraphs({ text }: { text: string }) {
  return <>{text.split(/\n\s*\n/).map((paragraph, i) => <p key={i} className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-ink-2">{paragraph}</p>)}</>;
}

function Question({ question, value, onChange, number }: { question: SurveyQuestion; value: Answer | undefined; onChange: (value: Answer) => void; number: number }) {
  const legend = <legend className="text-[15.5px] font-semibold text-ink">{number}. {question.text}{!question.required && <span className="ml-1 text-[13px] font-normal text-muted">(optional)</span>}</legend>;
  const help = question.help ? <p className="mt-0.5 text-[13.5px] text-muted">{question.help}</p> : null;
  if (question.type === 'single' || question.type === 'likert') {
    return (
      <fieldset>{legend}{help}
        <div className="mt-2 space-y-1.5">
          {question.options!.map((option) => (
            <label key={option.value} className="flex cursor-pointer items-center gap-3 rounded-lg border border-line px-3.5 py-2.5 hover:bg-soft has-[:checked]:border-brand has-[:checked]:bg-brand-50">
              <input type="radio" name={question.code} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} required={question.required} className="h-4 w-4 accent-[var(--color-brand)]" />
              <span className="text-[15px]">{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }
  if (question.type === 'multiple') {
    const chosen = Array.isArray(value) ? value : [];
    return (
      <fieldset>{legend}{help}<p className="text-[13px] text-muted">Choose all that apply.</p>
        <div className="mt-2 space-y-1.5">
          {question.options!.map((option) => (
            <label key={option.value} className="flex cursor-pointer items-center gap-3 rounded-lg border border-line px-3.5 py-2.5 hover:bg-soft has-[:checked]:border-brand has-[:checked]:bg-brand-50">
              <input type="checkbox" checked={chosen.includes(option.value)} onChange={(event) => onChange(event.target.checked ? [...chosen, option.value] : chosen.filter((item) => item !== option.value))} className="h-4 w-4 accent-[var(--color-brand)]" />
              <span className="text-[15px]">{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }
  return (
    <label className="block">
      <span className="block text-[15.5px] font-semibold text-ink">{number}. {question.text}{!question.required && <span className="ml-1 text-[13px] font-normal text-muted">(optional)</span>}</span>
      {help}
      {question.type === 'long_text'
        ? <textarea value={typeof value === 'string' ? value : ''} onChange={(event) => onChange(event.target.value)} rows={4} maxLength={5000} required={question.required} className={`${field} mt-2`} />
        : <input type={question.type === 'number' ? 'number' : 'text'} inputMode={question.type === 'number' ? 'decimal' : undefined} step={question.type === 'number' ? (question.integer ? 1 : 'any') : undefined} min={question.min ?? undefined} max={question.max ?? undefined}
            value={value === undefined ? '' : String(value)} onChange={(event) => onChange(event.target.value)} maxLength={question.type === 'text' ? 500 : undefined} required={question.required} className={`${field} mt-2`} />}
    </label>
  );
}

function Grid({ questions, answers, onChange, start }: { questions: SurveyQuestion[]; answers: Record<string, Answer>; onChange: (code: string, value: Answer) => void; start: number }) {
  const options = questions[0].options!;
  return (
    <div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-[14px]">
          <thead><tr><th className="w-[40%]" />{options.map((option) => <th key={option.value} scope="col" className="px-1.5 pb-2 text-center align-bottom text-[12.5px] font-semibold text-ink-2">{option.label}</th>)}</tr></thead>
          <tbody>
            {questions.map((question, i) => (
              <tr key={question.id} className="border-t border-line-2">
                <th scope="row" className="py-2.5 pr-3 text-left font-normal text-ink">{start + i}. {question.text}{!question.required && <span className="text-[12.5px] text-muted"> (optional)</span>}</th>
                {options.map((option) => (
                  <td key={option.value} className="text-center">
                    <input type="radio" name={question.code} value={option.value} checked={answers[question.code] === option.value} onChange={() => onChange(question.code, option.value)} required={question.required} aria-label={`${question.text}: ${option.label}`} className="h-4 w-4 accent-[var(--color-brand)]" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-6 md:hidden">
        {questions.map((question, i) => <Question key={question.id} question={question} value={answers[question.code]} onChange={(value) => onChange(question.code, value)} number={start + i} />)}
      </div>
    </div>
  );
}

export default function Page() {
  const { id } = useParams<{ id: string }>();
  const [view, setView] = useState<View | null>(null);
  const [error, setError] = useState('');
  const [consent, setConsent] = useState(false);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [website, setWebsite] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState('');

  useEffect(() => {
    fetch(`/api/public/surveys/${encodeURIComponent(id)}`).then(async (response) => {
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.detail || 'This survey could not be loaded.');
      setView(body);
    }).catch((reason) => setError(reason.message));
  }, [id]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true); setError('');
    try {
      const response = await fetch(`/api/public/surveys/${encodeURIComponent(id)}/responses`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ answers, consent, website }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.detail || 'Your answers could not be sent. Try again.');
      setDone(body.thank_you || 'Thank you for taking part.');
      window.scrollTo({ top: 0 });
    } catch (reason) { setError((reason as Error).message); } finally { setSending(false); }
  };

  let number = 0;
  return (
    <main className="min-h-screen bg-page px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-[720px]">
        {!view && !error && <p className="text-center text-[15px] text-muted">Loading…</p>}
        {!view && error && <div className="rounded-2xl border border-line bg-surface p-6 text-center"><p className="text-[16px] font-semibold text-ink">{error}</p></div>}
        {view && view.status !== 'open' && <div className="rounded-2xl border border-line bg-surface p-6 text-center"><h1 className="text-[22px] font-bold text-ink">{view.title}</h1><p className="mt-2 text-[15px] text-muted">This survey is not taking responses.</p></div>}
        {view?.status === 'open' && done && <div className="rounded-2xl border border-line bg-surface p-6" role="status"><h1 className="text-[22px] font-bold text-ink">{view.title}</h1><Paragraphs text={done} /></div>}
        {view?.status === 'open' && !done && (
          <form onSubmit={submit} className="space-y-6">
            <header className="rounded-2xl border border-line bg-surface p-6">
              <h1 className="text-[24px] font-bold leading-tight text-ink">{view.title}</h1>
              {view.intro && <Paragraphs text={view.intro} />}
            </header>
            {view.consent && (
              <section className="rounded-2xl border border-line bg-surface p-6">
                <h2 className="text-[17px] font-bold text-ink">Consent</h2>
                <Paragraphs text={view.consent} />
                <label className="mt-4 flex cursor-pointer items-start gap-3 text-[15px] font-semibold"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required className="mt-1 h-4 w-4 accent-[var(--color-brand)]" />I agree to take part.</label>
              </section>
            )}
            {(!view.consent || consent) && view.sections?.map((section) => (
              <section key={section.id} className="rounded-2xl border border-line bg-surface p-6">
                {section.title && <h2 className="text-[18px] font-bold text-ink">{section.title}</h2>}
                {section.description && <Paragraphs text={section.description} />}
                <div className="mt-5 space-y-7">
                  {groups(section.questions).map((group) => {
                    const start = number + 1;
                    number += group.length;
                    return group.length > 1
                      ? <Grid key={group[0].id} questions={group} answers={answers} start={start} onChange={(code, value) => setAnswers({ ...answers, [code]: value })} />
                      : <Question key={group[0].id} question={group[0]} value={answers[group[0].code]} number={start} onChange={(value) => setAnswers({ ...answers, [group[0].code]: value })} />;
                  })}
                </div>
              </section>
            ))}
            <input type="text" name="website" value={website} onChange={(event) => setWebsite(event.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute left-[-9999px] h-px w-px opacity-0" />
            {error && <p className="rounded-xl bg-amber-50 px-4 py-3 text-[14.5px] text-amber-900" role="alert">{error}</p>}
            {(!view.consent || consent) && <button type="submit" disabled={sending} className="h-12 w-full rounded-xl bg-brand text-[16px] font-semibold text-on-brand disabled:opacity-60">{sending ? 'Sending…' : 'Send my answers'}</button>}
            <p className="text-center text-[12.5px] leading-relaxed text-subtle">Your answers are stored without your name, email or IP address. Never enter passwords or payment details in a survey. Made with AI for Research.</p>
          </form>
        )}
      </div>
    </main>
  );
}
