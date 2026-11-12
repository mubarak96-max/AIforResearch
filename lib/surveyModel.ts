/**
 * Surveys as data: questions with variable codes, validated instruments, scale scoring, answer
 * checking, the CSV that Data Lab reads, the codebook and the printable questionnaire. Shared by
 * the Survey builder, the public form (/s/[id]) and the server (lib/server/routes/surveys.ts). Pure.
 */
import { scaleProblems, type ScaleScoring } from './surveyScoring';

export type QuestionType = 'single' | 'multiple' | 'likert' | 'number' | 'text' | 'long_text';
export type ChoiceOption = { value: string; label: string };
export type SurveyQuestion = {
  id: string;
  /** The variable name in the data: letters, digits and underscores. */
  code: string;
  type: QuestionType;
  text: string;
  help?: string;
  required: boolean;
  /** single, multiple and likert. Likert values are numbers (as text). */
  options?: ChoiceOption[];
  /** number */
  min?: number | null;
  max?: number | null;
  integer?: boolean;
  /** The validated instrument this item belongs to (its wording must not be changed). */
  instrument?: string;
};
export type SurveySection = { id: string; title: string; description?: string; instrument?: string; questions: SurveyQuestion[] };
export type SurveyDefinition = {
  title: string;
  /** Participant information shown first. */
  intro: string;
  /** When set, people must agree to this before they can answer. */
  consent: string;
  thank_you: string;
  sections: SurveySection[];
  scales: ScaleScoring[];
};
export type Answer = string | number | string[];
export type Answers = Record<string, Answer>;

export const QUESTION_TYPES: { id: QuestionType; label: string }[] = [
  { id: 'single', label: 'One choice' }, { id: 'multiple', label: 'Several choices' }, { id: 'likert', label: 'Rating scale (Likert)' },
  { id: 'number', label: 'Number' }, { id: 'text', label: 'Short text' }, { id: 'long_text', label: 'Long text' },
];

export const LIMITS = { sections: 30, questions: 200, options: 30, text: 1000, help: 500, intro: 6000, shortAnswer: 500, longAnswer: 5000, scales: 20 };
const CODE = /^[A-Za-z][A-Za-z0-9_]{0,31}$/;

/** A variable code from question text: "How old are you?" → how_old_are_you (unique among `taken`). */
export function codeFrom(text: string, taken: Set<string>): string {
  const base = text.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/^(\d)/, 'q$1').slice(0, 24).replace(/_+$/, '') || 'q';
  let code = base; let n = 2;
  while (taken.has(code.toLowerCase())) code = `${base.slice(0, 28)}_${n++}`;
  taken.add(code.toLowerCase());
  return code;
}

export const LIKERT_PRESETS: { id: string; label: string; options: string[] }[] = [
  { id: 'agree5', label: 'Agreement, 5 points', options: ['Strongly disagree', 'Disagree', 'Neither agree nor disagree', 'Agree', 'Strongly agree'] },
  { id: 'agree7', label: 'Agreement, 7 points', options: ['Strongly disagree', 'Disagree', 'Somewhat disagree', 'Neither agree nor disagree', 'Somewhat agree', 'Agree', 'Strongly agree'] },
  { id: 'frequency5', label: 'Frequency, 5 points', options: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'] },
  { id: 'satisfaction5', label: 'Satisfaction, 5 points', options: ['Very dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very satisfied'] },
  { id: 'importance5', label: 'Importance, 5 points', options: ['Not at all important', 'Slightly important', 'Moderately important', 'Very important', 'Extremely important'] },
];
export const likertOptions = (labels: string[], start = 1): ChoiceOption[] => labels.map((label, i) => ({ value: String(start + i), label }));

/** Every question in order. */
export const allQuestions = (survey: Pick<SurveyDefinition, 'sections'>) => survey.sections.flatMap((section) => section.questions);

/** Problems that stop a survey being saved or opened, in plain words. */
export function surveyProblems(survey: SurveyDefinition): string[] {
  const problems: string[] = [];
  const questions = allQuestions(survey);
  if (!survey.title.trim()) problems.push('Give the survey a title.');
  if (survey.sections.length > LIMITS.sections) problems.push(`Up to ${LIMITS.sections} sections.`);
  if (questions.length > LIMITS.questions) problems.push(`Up to ${LIMITS.questions} questions.`);
  const codes = new Set<string>();
  for (const question of questions) {
    const name = `“${question.text.slice(0, 40) || question.code}”`;
    if (!question.text.trim()) problems.push(`A question in the survey has no text (${question.code}).`);
    if (!CODE.test(question.code)) problems.push(`The variable name “${question.code}” must start with a letter and use only letters, digits and underscores (up to 32).`);
    if (codes.has(question.code.toLowerCase())) problems.push(`Two questions share the variable name “${question.code}”.`);
    codes.add(question.code.toLowerCase());
    if (question.text.length > LIMITS.text || (question.help?.length ?? 0) > LIMITS.help) problems.push(`${name} is too long.`);
    if (['single', 'multiple', 'likert'].includes(question.type)) {
      const options = question.options ?? [];
      if (options.length < 2) problems.push(`${name} needs at least two answers to choose from.`);
      if (options.length > LIMITS.options) problems.push(`${name} has more than ${LIMITS.options} answers.`);
      if (new Set(options.map((option) => option.value)).size !== options.length) problems.push(`${name} has two answers with the same code.`);
      if (options.some((option) => !option.label.trim() || !/^[A-Za-z0-9_.-]{1,40}$/.test(option.value))) problems.push(`${name}: every answer needs a label and a short code (letters, digits, _ . -).`);
      if (question.type === 'likert' && options.some((option) => !Number.isFinite(Number(option.value)))) problems.push(`${name}: rating-scale answers must be coded as numbers.`);
      if (question.type === 'multiple' && options.some((option) => !CODE.test(`${question.code}_${option.value}`.replace(/[.-]/g, '_')))) problems.push(`${name}: answer codes must make valid column names.`);
    }
    if (question.type === 'number' && question.min != null && question.max != null && question.min > question.max) problems.push(`${name}: the minimum is above the maximum.`);
  }
  if (survey.scales.length > LIMITS.scales) problems.push(`Up to ${LIMITS.scales} scales.`);
  for (const scale of survey.scales) {
    problems.push(...scaleProblems(scale, questions.map((question) => question.code)));
    const nonNumeric = scale.items.filter((code) => { const question = questions.find((item) => item.code === code); return question && question.type !== 'likert' && question.type !== 'number'; });
    if (nonNumeric.length) problems.push(`${scale.name}: only rating-scale or number questions can be scored (${nonNumeric.join(', ')}).`);
  }
  return problems;
}

/**
 * Changes that would break data already collected: a question removed, its code or type changed,
 * or an answer code removed or recoded. Wording and new questions are fine.
 */
export function breakingChanges(before: SurveyDefinition, after: SurveyDefinition): string[] {
  const later = allQuestions(after);
  const next = new Map(later.map((question) => [question.id, question]));
  const byCode = new Map(later.map((question) => [question.code.toLowerCase(), question]));
  const out: string[] = [];
  for (const old of allQuestions(before)) {
    // The same question by id, or (after a re-added block) by its variable name.
    const now = next.get(old.id) ?? byCode.get(old.code.toLowerCase());
    if (!now) { out.push(`“${old.code}” was removed`); continue; }
    if (now.code !== old.code) out.push(`“${old.code}” was renamed to “${now.code}”`);
    if (now.type !== old.type) out.push(`“${old.code}” changed type`);
    const values = new Set((now.options ?? []).map((option) => option.value));
    const lost = (old.options ?? []).filter((option) => !values.has(option.value));
    if (lost.length) out.push(`“${old.code}” lost the answer code${lost.length === 1 ? '' : 's'} ${lost.map((option) => option.value).join(', ')}`);
  }
  return out;
}

/** Checks one person's answers against the survey; returns the cleaned answers or the first problem. */
export function checkAnswers(survey: SurveyDefinition, raw: Record<string, unknown>): { answers: Answers } | { error: string } {
  const answers: Answers = {};
  for (const question of allQuestions(survey)) {
    const value = raw[question.code];
    const empty = value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length);
    if (empty) {
      if (question.required) return { error: `Please answer: ${question.text}` };
      continue;
    }
    const values = new Set((question.options ?? []).map((option) => option.value));
    switch (question.type) {
      case 'single': case 'likert':
        if (typeof value !== 'string' || !values.has(value)) return { error: `Choose one of the answers for: ${question.text}` };
        answers[question.code] = question.type === 'likert' ? Number(value) : value;
        break;
      case 'multiple':
        if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !values.has(item))) return { error: `Choose from the answers for: ${question.text}` };
        answers[question.code] = [...new Set(value as string[])];
        break;
      case 'number': {
        const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.replace(',', '.')) : NaN;
        if (!Number.isFinite(n) || (question.integer && !Number.isInteger(n)) || (question.min != null && n < question.min) || (question.max != null && n > question.max)) {
          return { error: `Enter ${question.integer ? 'a whole number' : 'a number'}${question.min != null ? ` from ${question.min}` : ''}${question.max != null ? ` to ${question.max}` : ''} for: ${question.text}` };
        }
        answers[question.code] = n;
        break;
      }
      default: {
        if (typeof value !== 'string') return { error: `Answer in words for: ${question.text}` };
        const max = question.type === 'text' ? LIMITS.shortAnswer : LIMITS.longAnswer;
        answers[question.code] = value.trim().slice(0, max);
      }
    }
  }
  return { answers };
}

const cell = (value: string) => (/[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

/** The CSV column names, in order: one per question, one per answer of a several-choice question. */
export function dataColumns(survey: Pick<SurveyDefinition, 'sections'>): string[] {
  return allQuestions(survey).flatMap((question) => (question.type === 'multiple' ? (question.options ?? []).map((option) => `${question.code}_${option.value}`.replace(/[.-]/g, '_')) : [question.code]));
}

/** Responses as CSV for Data Lab, SPSS, R or Excel: codes as column names, several-choice answers as 0/1 columns. */
export function responsesCsv(survey: Pick<SurveyDefinition, 'sections'>, responses: { id: string; submitted_at: string; answers: Answers }[]): string {
  const questions = allQuestions(survey);
  const lines = [['response_id', 'submitted_at', ...dataColumns(survey)].join(',')];
  for (const response of responses) {
    const row = [response.id, response.submitted_at];
    for (const question of questions) {
      const value = response.answers[question.code];
      if (question.type === 'multiple') {
        const chosen = Array.isArray(value) ? value : null;
        for (const option of question.options ?? []) row.push(chosen ? (chosen.includes(option.value) ? '1' : '0') : '');
      } else row.push(value === undefined ? '' : String(value));
    }
    lines.push(row.map(cell).join(','));
  }
  return lines.join('\n');
}

/** A blank data file with the right header, for data entered from paper questionnaires. */
export const dataTemplateCsv = (survey: Pick<SurveyDefinition, 'sections'>) => ['respondent_id', ...dataColumns(survey)].join(',');

/** The codebook: every variable, its question, its type and the meaning of each code. */
export function codebookCsv(survey: SurveyDefinition): string {
  const rows = [['variable', 'question', 'type', 'codes', 'required', 'instrument', 'scale', 'reverse_scored']];
  const scaleOf = (code: string) => survey.scales.filter((scale) => scale.items.includes(code));
  for (const question of allQuestions(survey)) {
    const scales = scaleOf(question.code);
    const reverse = scales.some((scale) => scale.reverse.includes(question.code));
    if (question.type === 'multiple') {
      for (const option of question.options ?? []) rows.push([`${question.code}_${option.value}`.replace(/[.-]/g, '_'), `${question.text} — ${option.label}`, 'yes/no', '1 = chosen; 0 = not chosen', question.required ? 'yes' : 'no', question.instrument ?? '', '', '']);
      continue;
    }
    const codes = question.options?.length ? question.options.map((option) => `${option.value} = ${option.label}`).join('; ')
      : question.type === 'number' ? `number${question.min != null ? ` from ${question.min}` : ''}${question.max != null ? ` to ${question.max}` : ''}${question.integer ? ', whole' : ''}` : 'free text';
    rows.push([question.code, question.text, QUESTION_TYPES.find((type) => type.id === question.type)!.label, codes, question.required ? 'yes' : 'no', question.instrument ?? '', scales.map((scale) => scale.name).join('; '), reverse ? 'yes' : '']);
  }
  for (const scale of survey.scales) {
    rows.push([`${scale.name}_score`, `${scale.name}: ${scale.method} of ${scale.items.length} items${scale.rescale ? ` (then +${scale.rescale.add} and ×${scale.rescale.multiply})` : ''}`, 'computed score', scale.bands?.map((band) => `${band.from}–${band.to} = ${band.label}`).join('; ') ?? '', '', '', scale.name, '']);
  }
  return rows.map((row) => row.map(cell).join(',')).join('\n');
}

/** The questionnaire as Markdown, for the editor (Word, PDF, paper copies) and for the ethics application. */
export function questionnaireMarkdown(survey: SurveyDefinition): string {
  const lines = [`# ${survey.title}`, ''];
  if (survey.intro.trim()) lines.push(survey.intro.trim(), '');
  if (survey.consent.trim()) lines.push('## Consent', '', survey.consent.trim(), '', '☐ I agree to take part.', '');
  let n = 0;
  for (const section of survey.sections) {
    if (section.title.trim()) lines.push(`## ${section.title}`, '');
    if (section.description?.trim()) lines.push(section.description.trim(), '');
    for (const question of section.questions) {
      n += 1;
      lines.push(`**${n}. ${question.text}**${question.required ? '' : ' (optional)'}`, '');
      if (question.help?.trim()) lines.push(`*${question.help.trim()}*`, '');
      if (question.options?.length) lines.push(...question.options.map((option) => `- ${question.type === 'multiple' ? '☐' : '○'} ${option.label}${question.type === 'likert' ? ` (${option.value})` : ''}`), '');
      else if (question.type === 'number') lines.push(`Answer: ________${question.min != null || question.max != null ? ` (${question.min ?? ''}–${question.max ?? ''})` : ''}`, '');
      else lines.push(question.type === 'long_text' ? '______________________________________________\n\n______________________________________________' : 'Answer: ______________________________', '');
    }
  }
  if (survey.thank_you.trim()) lines.push('---', '', survey.thank_you.trim());
  return lines.join('\n');
}

export const emptySurvey = (title = 'Untitled survey'): SurveyDefinition => ({
  title, intro: '', consent: '', thank_you: 'Thank you for taking part.',
  sections: [{ id: 's1', title: 'About you', questions: [] }], scales: [],
});
