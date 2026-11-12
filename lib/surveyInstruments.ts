/**
 * Validated questionnaires that are free to use in research, with their published wording,
 * response options, scoring and citation. Adding one to a survey inserts its items unchanged and
 * the scale definition Data Lab uses to score it. Instruments that need a licence (SF-36, BDI and
 * others) are deliberately not here. Pure.
 */
import type { ScaleScoring } from './surveyScoring';
import { likertOptions, type ChoiceOption, type SurveyQuestion, type SurveySection } from './surveyModel';

export type Instrument = {
  id: string;
  name: string;
  full: string;
  measures: string;
  /** The instruction shown before the items. */
  prompt: string;
  options: ChoiceOption[];
  items: string[];
  /** 1-based positions of reverse-scored items. */
  reverse: number[];
  scoring: Omit<ScaleScoring, 'items' | 'reverse' | 'name' | 'min' | 'max'>;
  scoreText: string;
  citation: string;
  licence: string;
  source: string;
  cautions: string[];
  /** Short variable-name prefix, e.g. phq → phq1 … phq9. */
  prefix: string;
};

const PHQ_OPTIONS = likertOptions(['Not at all', 'Several days', 'More than half the days', 'Nearly every day'], 0);

export const INSTRUMENTS: Instrument[] = [
  {
    id: 'phq9', name: 'PHQ-9', full: 'Patient Health Questionnaire-9', measures: 'Depression severity', prefix: 'phq',
    prompt: 'Over the last 2 weeks, how often have you been bothered by any of the following problems?',
    options: PHQ_OPTIONS,
    items: [
      'Little interest or pleasure in doing things',
      'Feeling down, depressed, or hopeless',
      'Trouble falling or staying asleep, or sleeping too much',
      'Feeling tired or having little energy',
      'Poor appetite or overeating',
      'Feeling bad about yourself — or that you are a failure or have let yourself or your family down',
      'Trouble concentrating on things, such as reading the newspaper or watching television',
      'Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual',
      'Thoughts that you would be better off dead or of hurting yourself in some way',
    ],
    reverse: [],
    scoring: { method: 'sum', bands: [{ label: 'Minimal', from: 0, to: 4 }, { label: 'Mild', from: 5, to: 9 }, { label: 'Moderate', from: 10, to: 14 }, { label: 'Moderately severe', from: 15, to: 19 }, { label: 'Severe', from: 20, to: 27 }] },
    scoreText: 'Sum of the 9 items, 0–27: 0–4 minimal, 5–9 mild, 10–14 moderate, 15–19 moderately severe, 20–27 severe.',
    citation: 'Kroenke K, Spitzer RL, Williams JBW. The PHQ-9: validity of a brief depression severity measure. J Gen Intern Med 2001;16:606–13.',
    licence: 'Free to use; no permission needed (developed by Spitzer, Williams, Kroenke and colleagues with an educational grant from Pfizer).',
    source: 'https://www.phqscreeners.com/',
    cautions: [
      'Item 9 asks about thoughts of self-harm. Your ethics application and survey must say how you will respond to a positive answer (for example, show helpline numbers to everyone and tell participants that answers are anonymous and not monitored, or have a clinician follow up if the survey is not anonymous).',
      'A screening score is not a diagnosis.',
    ],
  },
  {
    id: 'gad7', name: 'GAD-7', full: 'Generalized Anxiety Disorder-7', measures: 'Anxiety severity', prefix: 'gad',
    prompt: 'Over the last 2 weeks, how often have you been bothered by the following problems?',
    options: PHQ_OPTIONS,
    items: [
      'Feeling nervous, anxious, or on edge',
      'Not being able to stop or control worrying',
      'Worrying too much about different things',
      'Trouble relaxing',
      'Being so restless that it is hard to sit still',
      'Becoming easily annoyed or irritable',
      'Feeling afraid, as if something awful might happen',
    ],
    reverse: [],
    scoring: { method: 'sum', bands: [{ label: 'Minimal', from: 0, to: 4 }, { label: 'Mild', from: 5, to: 9 }, { label: 'Moderate', from: 10, to: 14 }, { label: 'Severe', from: 15, to: 21 }] },
    scoreText: 'Sum of the 7 items, 0–21: 0–4 minimal, 5–9 mild, 10–14 moderate, 15–21 severe.',
    citation: 'Spitzer RL, Kroenke K, Williams JBW, Löwe B. A brief measure for assessing generalized anxiety disorder: the GAD-7. Arch Intern Med 2006;166:1092–7.',
    licence: 'Free to use; no permission needed.',
    source: 'https://www.phqscreeners.com/',
    cautions: ['A screening score is not a diagnosis.'],
  },
  {
    id: 'who5', name: 'WHO-5', full: 'WHO-5 Well-Being Index', measures: 'Current mental wellbeing', prefix: 'who',
    prompt: 'Please indicate for each of the five statements which is closest to how you have been feeling over the last two weeks.',
    options: likertOptions(['At no time', 'Some of the time', 'Less than half of the time', 'More than half of the time', 'Most of the time', 'All of the time'], 0),
    items: [
      'I have felt cheerful and in good spirits',
      'I have felt calm and relaxed',
      'I have felt active and vigorous',
      'I woke up feeling fresh and rested',
      'My daily life has been filled with things that interest me',
    ],
    reverse: [],
    scoring: { method: 'sum', rescale: { add: 0, multiply: 4 }, bands: [{ label: 'Poor wellbeing (screen further)', from: 0, to: 50 }, { label: 'Not indicated', from: 51, to: 100 }] },
    scoreText: 'Sum of the 5 items (0–25) × 4 gives a percentage, 0–100. A score of 50 or below suggests poor wellbeing and further screening.',
    citation: 'Topp CW, Østergaard SD, Søndergaard S, Bech P. The WHO-5 Well-Being Index: a systematic review of the literature. Psychother Psychosom 2015;84:167–76.',
    licence: 'Free to use (WHO Collaborating Centre in Mental Health, Psychiatric Research Unit, Mental Health Centre North Zealand).',
    source: 'https://www.psykiatri-regionh.dk/who-5/',
    cautions: ['Cut-offs for screening vary between studies; cite the one you use.'],
  },
  {
    id: 'pss10', name: 'PSS-10', full: 'Perceived Stress Scale (10 items)', measures: 'Perceived stress', prefix: 'pss',
    prompt: 'The questions in this scale ask you about your feelings and thoughts during the last month. In each case, please indicate how often you felt or thought a certain way. In the last month, how often have you…',
    options: likertOptions(['Never', 'Almost never', 'Sometimes', 'Fairly often', 'Very often'], 0),
    items: [
      'been upset because of something that happened unexpectedly?',
      'felt that you were unable to control the important things in your life?',
      'felt nervous and “stressed”?',
      'felt confident about your ability to handle your personal problems?',
      'felt that things were going your way?',
      'found that you could not cope with all the things that you had to do?',
      'been able to control irritations in your life?',
      'felt that you were on top of things?',
      'been angered because of things that were outside of your control?',
      'felt difficulties were piling up so high that you could not overcome them?',
    ],
    reverse: [4, 5, 7, 8],
    scoring: { method: 'sum', bands: [{ label: 'Low stress', from: 0, to: 13 }, { label: 'Moderate stress', from: 14, to: 26 }, { label: 'High stress', from: 27, to: 40 }] },
    scoreText: 'Items 4, 5, 7 and 8 are reverse-scored; sum of the 10 items, 0–40. Common bands: 0–13 low, 14–26 moderate, 27–40 high (the scale has no official cut-offs).',
    citation: 'Cohen S, Kamarck T, Mermelstein R. A global measure of perceived stress. J Health Soc Behav 1983;24:385–96. Cohen S, Williamson G. Perceived stress in a probability sample of the United States. In: The Social Psychology of Health. Sage; 1988.',
    licence: 'Free for non-commercial research and education; check the copyright holder’s terms for other uses.',
    source: 'https://www.cmu.edu/dietrich/psychology/stress-immunity-disease-lab/scales/index.html',
    cautions: ['The bands are conventions, not clinical cut-offs.'],
  },
  {
    id: 'rses', name: 'RSES', full: 'Rosenberg Self-Esteem Scale', measures: 'Global self-esteem', prefix: 'rses',
    prompt: 'Below is a list of statements dealing with your general feelings about yourself. Please indicate how strongly you agree or disagree with each statement.',
    options: likertOptions(['Strongly disagree', 'Disagree', 'Agree', 'Strongly agree'], 0),
    items: [
      'On the whole, I am satisfied with myself.',
      'At times I think I am no good at all.',
      'I feel that I have a number of good qualities.',
      'I am able to do things as well as most other people.',
      'I feel I do not have much to be proud of.',
      'I certainly feel useless at times.',
      'I feel that I’m a person of worth, at least on an equal plane with others.',
      'I wish I could have more respect for myself.',
      'All in all, I am inclined to feel that I am a failure.',
      'I take a positive attitude toward myself.',
    ],
    reverse: [2, 5, 6, 8, 9],
    scoring: { method: 'sum' },
    scoreText: 'Items 2, 5, 6, 8 and 9 are reverse-scored; sum of the 10 items, 0–30. Higher scores mean higher self-esteem; scores below 15 are often read as low.',
    citation: 'Rosenberg M. Society and the Adolescent Self-Image. Princeton University Press; 1965.',
    licence: 'Free to use in research and education without permission; cite the source.',
    source: 'https://socy.umd.edu/about-us/using-rosenberg-self-esteem-scale',
    cautions: [],
  },
  {
    id: 'sus', name: 'SUS', full: 'System Usability Scale', measures: 'Perceived usability of a product or system', prefix: 'sus',
    prompt: 'For each statement, choose how much you agree, thinking about the system you have just used.',
    options: likertOptions(['Strongly disagree', 'Disagree', 'Neither agree nor disagree', 'Agree', 'Strongly agree'], 1),
    items: [
      'I think that I would like to use this system frequently.',
      'I found the system unnecessarily complex.',
      'I thought the system was easy to use.',
      'I think that I would need the support of a technical person to be able to use this system.',
      'I found the various functions in this system were well integrated.',
      'I thought there was too much inconsistency in this system.',
      'I would imagine that most people would learn to use this system very quickly.',
      'I found the system very cumbersome to use.',
      'I felt very confident using the system.',
      'I needed to learn a lot of things before I could get going with this system.',
    ],
    reverse: [2, 4, 6, 8, 10],
    scoring: { method: 'sum', rescale: { add: -10, multiply: 2.5 } },
    scoreText: 'Even items are reverse-scored; (sum of the 10 items − 10) × 2.5 gives 0–100. About 68 is average.',
    citation: 'Brooke J. SUS: a “quick and dirty” usability scale. In: Usability Evaluation in Industry. Taylor & Francis; 1996:189–94.',
    licence: 'Free to use; cite the source.',
    source: 'https://uxpajournal.org/sus-a-retrospective/',
    cautions: ['Replace “system” with your product’s name only if your study protocol allows; most studies keep the original wording.'],
  },
];

export const instrument = (id: string) => INSTRUMENTS.find((item) => item.id === id) ?? null;

/** The instrument as a survey section (items unchanged, all required) and its scoring, with codes that avoid `taken`. */
export function instrumentBlock(item: Instrument, taken: Set<string>, newId: () => string): { section: SurveySection; scale: ScaleScoring } {
  let prefix = item.prefix; let n = 2;
  while (Array.from({ length: item.items.length }, (_, i) => `${prefix}${i + 1}`).some((code) => taken.has(code.toLowerCase()))) prefix = `${item.prefix}${n++}_`;
  const codes = item.items.map((_, i) => `${prefix}${i + 1}`);
  codes.forEach((code) => taken.add(code.toLowerCase()));
  const questions: SurveyQuestion[] = item.items.map((text, i) => ({ id: newId(), code: codes[i], type: 'likert', text, required: true, options: item.options.map((option) => ({ ...option })), instrument: item.id }));
  const values = item.options.map((option) => Number(option.value));
  return {
    section: { id: newId(), title: `${item.full} (${item.name})`, description: item.prompt, instrument: item.id, questions },
    scale: { name: prefix.replace(/_$/, '').toUpperCase() === item.prefix.toUpperCase() ? item.name.replace(/[^A-Za-z0-9]/g, '') : prefix.replace(/_$/, ''), items: codes, reverse: item.reverse.map((position) => codes[position - 1]), min: Math.min(...values), max: Math.max(...values), ...item.scoring },
  };
}
