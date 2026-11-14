/**
 * PICO, PICOT, PCC and SPIDER: the elements, example values from several fields, question
 * phrasings by question type, a check for missing or vague parts, and a search concept table.
 * Pure functions, used by the PICO question builder (components/tools/utilities/PicoQuestionBuilder).
 */

export type Framework = 'pico' | 'picot' | 'pcc' | 'spider';

export type ElementDef = {
  key: string;
  letter: string;
  label: string;
  hint: string;
  /** Illustrative values from several fields. */
  examples: { field: string; value: string }[];
  /** Missing it is a gap in the question, not just a choice. */
  required: boolean;
  /** How often this element goes into the search string. */
  search: 'yes' | 'maybe' | 'no';
  searchNote: string;
};

export type QuestionType = { id: string; label: string; help: string };

export type FrameworkDef = { id: Framework; name: string; use: string; elements: ElementDef[]; types: QuestionType[] };

const P: ElementDef = {
  key: 'p', letter: 'P', label: 'Population or problem', required: true, search: 'yes',
  hint: 'Who or what you study. Add the details that matter: age, condition, setting, level, industry.',
  searchNote: 'Almost always a search concept.',
  examples: [
    { field: 'Health', value: 'adults with type 2 diabetes in primary care' },
    { field: 'Education', value: 'Year 3 pupils reading below grade level' },
    { field: 'Business', value: 'small retail firms' },
    { field: 'Engineering', value: 'concrete bridge decks in freeze-thaw climates' },
    { field: 'Psychology', value: 'first-year university students' },
  ],
};
const I: ElementDef = {
  key: 'i', letter: 'I', label: 'Intervention or exposure', required: true, search: 'yes',
  hint: 'What is done, given, used or experienced. For a diagnosis question, the test; for a prognosis question, the factor.',
  searchNote: 'Almost always a search concept.',
  examples: [
    { field: 'Health', value: 'text-message reminders' },
    { field: 'Education', value: 'daily paired reading' },
    { field: 'Business', value: 'a four-day working week' },
    { field: 'Engineering', value: 'silane sealer' },
    { field: 'Psychology', value: 'a mindfulness app' },
  ],
};
const C: ElementDef = {
  key: 'c', letter: 'C', label: 'Comparison', required: false, search: 'maybe',
  hint: 'What you compare against: usual care, no intervention, placebo, another method. For a diagnosis question, the reference standard.',
  searchNote: 'Often left out of the search: studies of the intervention usually mention the comparison anyway.',
  examples: [
    { field: 'Health', value: 'usual care' },
    { field: 'Education', value: 'independent silent reading' },
    { field: 'Business', value: 'a five-day working week' },
    { field: 'Engineering', value: 'untreated decks' },
    { field: 'Psychology', value: 'a waiting list' },
  ],
};
const O: ElementDef = {
  key: 'o', letter: 'O', label: 'Outcome', required: true, search: 'no',
  hint: 'What you will measure, and how. Name the measure, not a direction ("HbA1c", not "better control").',
  searchNote: 'Usually not searched: outcomes are often missing from titles and abstracts, so adding them loses studies.',
  examples: [
    { field: 'Health', value: 'HbA1c' },
    { field: 'Education', value: 'reading fluency (words correct per minute)' },
    { field: 'Business', value: 'staff turnover rate' },
    { field: 'Engineering', value: 'chloride penetration depth' },
    { field: 'Psychology', value: 'perceived stress (PSS-10 score)' },
  ],
};
const T: ElementDef = {
  key: 't', letter: 'T', label: 'Time', required: true, search: 'no',
  hint: 'Over what period the outcome is measured, or how long the intervention runs.',
  searchNote: 'Not a search concept. Apply it when you screen studies.',
  examples: [
    { field: 'Health', value: '6 months' },
    { field: 'Education', value: 'one school term' },
    { field: 'Business', value: '12 months' },
    { field: 'Engineering', value: '5 years' },
    { field: 'Psychology', value: '8 weeks' },
  ],
};

const PICO_TYPES: QuestionType[] = [
  { id: 'therapy', label: 'Therapy or intervention', help: 'Does it work? Best answered by randomized trials.' },
  { id: 'prognosis', label: 'Prognosis or prediction', help: 'What happens over time, and what predicts it? Cohort studies.' },
  { id: 'diagnosis', label: 'Diagnosis or test accuracy', help: 'How well does a test or measure detect something? Accuracy studies.' },
  { id: 'aetiology', label: 'Aetiology or harm', help: 'Does an exposure cause or raise the risk of something? Cohort and case-control studies.' },
];

export const FRAMEWORKS: Record<Framework, FrameworkDef> = {
  pico: { id: 'pico', name: 'PICO', use: 'Questions about the effect of an intervention, test or exposure.', elements: [P, I, C, O], types: PICO_TYPES },
  picot: { id: 'picot', name: 'PICOT', use: 'PICO with a time frame, common in nursing and clinical questions.', elements: [P, I, C, O, T], types: PICO_TYPES },
  pcc: {
    id: 'pcc', name: 'PCC', use: 'Scoping reviews and mapping questions: what is known, not what works.',
    types: [{ id: 'mapping', label: 'Mapping (scoping review)', help: 'What has been studied, how, and where?' }],
    elements: [
      { ...P, label: 'Population', hint: 'Who the evidence is about. Keep it as broad as your review needs.' },
      {
        key: 'concept', letter: 'C', label: 'Concept', required: true, search: 'yes', searchNote: 'Almost always a search concept.',
        hint: 'The idea, activity or phenomenon you want to map.',
        examples: [
          { field: 'Health', value: 'digital inclusion programmes' },
          { field: 'Education', value: 'feedback practices' },
          { field: 'Business', value: 'circular economy practices' },
          { field: 'Engineering', value: 'digital twins for maintenance' },
          { field: 'Social science', value: 'participatory budgeting' },
        ],
      },
      {
        key: 'context', letter: 'C', label: 'Context', required: true, search: 'maybe',
        searchNote: 'Search it only when the setting is a defining feature; otherwise screen for it.',
        hint: 'The setting: place, culture, sector, type of service or time period.',
        examples: [
          { field: 'Health', value: 'rural communities' },
          { field: 'Education', value: 'online doctoral supervision' },
          { field: 'Business', value: 'manufacturing firms in low- and middle-income countries' },
          { field: 'Engineering', value: 'water utilities' },
          { field: 'Social science', value: 'city governments' },
        ],
      },
    ],
  },
  spider: {
    id: 'spider', name: 'SPIDER', use: 'Qualitative and mixed-methods questions about experiences and views.',
    types: [{ id: 'qualitative', label: 'Experience or views (qualitative)', help: 'How do people experience or see something?' }],
    elements: [
      {
        key: 's', letter: 'S', label: 'Sample', required: true, search: 'yes', searchNote: 'Almost always a search concept.',
        hint: 'The group whose experiences you study. Qualitative samples are small, so "sample" replaces "population".',
        examples: [
          { field: 'Health', value: 'nurses working night shifts' },
          { field: 'Education', value: 'first-generation university students' },
          { field: 'Business', value: 'founders of failed start-ups' },
          { field: 'Engineering', value: 'open-source software maintainers' },
          { field: 'Social science', value: 'informal waste pickers' },
        ],
      },
      {
        key: 'pi', letter: 'PI', label: 'Phenomenon of interest', required: true, search: 'yes', searchNote: 'Almost always a search concept.',
        hint: 'The experience, behavior or decision you want to understand.',
        examples: [
          { field: 'Health', value: 'fatigue' },
          { field: 'Education', value: 'sense of belonging' },
          { field: 'Business', value: 'business failure' },
          { field: 'Engineering', value: 'burnout' },
          { field: 'Social science', value: 'formalisation policies' },
        ],
      },
      {
        key: 'd', letter: 'D', label: 'Design', required: true, search: 'maybe', searchNote: 'Optional in the search; adding it narrows results a lot.',
        hint: 'How data were collected: interviews, focus groups, ethnography, diaries.',
        examples: [
          { field: 'Any field', value: 'interviews, focus groups' },
          { field: 'Any field', value: 'ethnography, observation' },
          { field: 'Any field', value: 'diaries, photo-elicitation' },
        ],
      },
      {
        key: 'e', letter: 'E', label: 'Evaluation', required: true, search: 'maybe', searchNote: 'Optional in the search; often vague words, so screen for it instead.',
        hint: 'What is explored: views, experiences, attitudes, perceptions, coping.',
        examples: [
          { field: 'Any field', value: 'experiences and coping strategies' },
          { field: 'Any field', value: 'perceptions and attitudes' },
        ],
      },
      {
        key: 'r', letter: 'R', label: 'Research type', required: true, search: 'maybe', searchNote: 'Optional in the search ("qualitative" OR "mixed methods").',
        hint: 'Qualitative, quantitative or mixed methods.',
        examples: [
          { field: 'Any field', value: 'qualitative' },
          { field: 'Any field', value: 'mixed methods' },
        ],
      },
    ],
  },
};

export type Values = Record<string, string>;

const clean = (value: string | undefined) => (value ?? '').replace(/\s+/g, ' ').trim().replace(/[.?!]+$/, '');

/** The question in two or three phrasings for the chosen type. Missing required parts show as [brackets]. */
export function buildQuestions(framework: Framework, type: string, values: Values): string[] {
  const def = FRAMEWORKS[framework];
  const v = (key: string) => {
    const value = clean(values[key]);
    if (value) return value;
    const element = def.elements.find((e) => e.key === key);
    return element?.required ? `[${element.label.toLowerCase()}]` : '';
  };

  if (framework === 'pcc') {
    const [p, concept, context] = [v('p'), v('concept'), v('context')];
    return [
      `What is known about ${concept} among ${p} in ${context}?`,
      `How has ${concept} been studied in ${p} in ${context}, and what are the gaps?`,
      `What types of evidence exist on ${concept} for ${p} in ${context}?`,
    ];
  }

  if (framework === 'spider') {
    const [s, pi, d, e, r] = [v('s'), v('pi'), v('d'), v('e'), v('r')];
    return [
      `What are the ${e} of ${s} regarding ${pi}, in ${r} studies using ${d}?`,
      `How do ${s} experience ${pi}, as reported in ${r} research (${d})?`,
      `What do ${r} studies using ${d} tell us about the ${e} of ${s} in relation to ${pi}?`,
    ];
  }

  const [p, i, o] = [v('p'), v('i'), v('o')];
  const c = v('c');
  const t = framework === 'picot' ? v('t') : '';
  const vs = c ? ` compared with ${c}` : '';
  const over = t ? ` over ${t}` : '';
  const within = t ? ` within ${t}` : '';

  switch (type) {
    case 'prognosis':
      return [
        `In ${p}, does ${i}${vs} predict ${o}${over}?`,
        `For ${p} with ${i}, what is the risk of ${o}${within}${c ? `, compared with those with ${c}` : ''}?`,
        `How does ${i} influence ${o} in ${p}${over}?`,
      ];
    case 'diagnosis':
      return [
        `In ${p}, how accurate is ${i}${vs} for detecting ${o}?`,
        `Is ${i} as accurate as ${c || 'the reference standard'} for identifying ${o} in ${p}?`,
      ];
    case 'aetiology':
      return [
        `Are ${p} exposed to ${i} at higher risk of ${o}${c ? ` than those exposed to ${c}` : ' than those not exposed'}${over}?`,
        `In ${p}, is ${i}${vs} associated with ${o}${over}?`,
      ];
    default:
      return [
        `In ${p}, what is the effect of ${i}${vs} on ${o}${over}?`,
        c ? `Among ${p}, does ${i} lead to a different ${o} than ${c}${over}?` : `Among ${p}, does ${i} change ${o}${over}?`,
        `For ${p}, is ${i} more effective than ${c || 'no intervention'} at improving ${o}${within}?`,
      ];
  }
}

export type Issue = { level: 'missing' | 'vague' | 'tip'; element?: string; message: string };

/** Words that sound like an outcome but do not say what is measured. */
export const VAGUE_OUTCOME_WORDS = ['impact', 'impacts', 'effect', 'effects', 'affect', 'affects', 'outcome', 'outcomes', 'result', 'results', 'improve', 'improvement', 'better', 'success', 'effectiveness', 'efficacy', 'benefit', 'benefits', 'influence', 'quality'];
const BROAD_POPULATIONS = ['people', 'persons', 'patients', 'students', 'adults', 'children', 'employees', 'workers', 'users', 'women', 'men', 'teachers', 'firms', 'companies', 'participants', 'individuals', 'everyone', 'population'];

const words = (text: string) => text.toLowerCase().match(/[a-z0-9][a-z0-9'-]*/g) ?? [];

/** What is missing or vague, in the order a reader would fix it. */
export function checkQuestion(framework: Framework, values: Values): Issue[] {
  const def = FRAMEWORKS[framework];
  const issues: Issue[] = [];
  for (const element of def.elements) {
    const value = clean(values[element.key]);
    if (!value) {
      if (element.required) issues.push({ level: 'missing', element: element.key, message: `${element.label} is empty.` });
      else if (element.key === 'c') issues.push({ level: 'tip', element: 'c', message: 'No comparison. Name one (usual care, no intervention, another method) or decide that the question has none; a question without one cannot say "better than what?".' });
      continue;
    }
    const list = words(value);
    if (list.length > 12) issues.push({ level: 'tip', element: element.key, message: `${element.label} is long (${list.length} words). It may hold two ideas; split it, or move details to your inclusion criteria.` });
    if ((value.match(/\band\b/gi) ?? []).length >= 2) issues.push({ level: 'tip', element: element.key, message: `${element.label} joins several things with "and". Each one may need its own question.` });
  }

  const outcomeKey = framework === 'spider' ? 'e' : framework === 'pcc' ? '' : 'o';
  const outcome = outcomeKey ? clean(values[outcomeKey]) : '';
  if (outcome && framework !== 'spider') {
    const vague = words(outcome).filter((word) => VAGUE_OUTCOME_WORDS.includes(word));
    if (vague.length) issues.push({ level: 'vague', element: outcomeKey, message: `The outcome uses "${vague[0]}", which does not say what you will measure. Name the measure: "reading fluency (words correct per minute)" rather than "impact on reading".` });
  }

  const popKey = framework === 'spider' ? 's' : 'p';
  const population = words(clean(values[popKey]));
  if (population.length > 0 && population.length <= 2 && population.some((word) => BROAD_POPULATIONS.includes(word))) {
    issues.push({ level: 'vague', element: popKey, message: `"${clean(values[popKey])}" is very broad. Add who exactly: age, condition, level, setting or sector.` });
  }

  if (framework === 'pico' || framework === 'picot') {
    const i = clean(values.i).toLowerCase();
    const c = clean(values.c).toLowerCase();
    if (i && c && i === c) issues.push({ level: 'vague', element: 'c', message: 'The comparison is the same as the intervention.' });
  }
  return issues;
}

/** "a, b; c\n d OR e" -> ["a", "b", "c", "d", "e"], without repeats. */
export function splitTerms(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of text.split(/[,;\n]|\s+OR\s+/)) {
    const term = part.trim();
    if (term && !seen.has(term.toLowerCase())) { seen.add(term.toLowerCase()); out.push(term); }
  }
  return out;
}

export type ConceptRow = { key: string; label: string; text: string; terms: string[]; search: ElementDef['search']; note: string };

/** One row per filled element: its search terms (the synonyms, or the element text) and whether to search it. */
export function conceptTable(framework: Framework, values: Values, synonyms: Values): ConceptRow[] {
  return FRAMEWORKS[framework].elements.flatMap((element) => {
    const text = clean(values[element.key]);
    if (!text) return [];
    const extra = splitTerms(synonyms[element.key] ?? '');
    const terms = splitTerms([text, ...extra].join('\n'));
    return [{ key: element.key, label: element.label, text, terms, search: element.search, note: element.searchNote }];
  });
}
