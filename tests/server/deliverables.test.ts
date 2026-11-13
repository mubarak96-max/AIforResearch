import { describe, expect, it } from 'vitest';
import { JOURNAL_STYLES, STUDIO_MODULES, STUDY_CHECKLISTS, TEMPLATES, studioCredits, studioModule, workspaceModules } from '../../lib/server/lib/studioCatalog';
import { SURVEY_SCALES, buildStudioPrompt, hasStudioPrompt, type StudioContext } from '../../lib/server/lib/studioModules';
import { INSTRUMENTS } from '../../lib/surveyInstruments';
import { checkInputs } from '../../lib/server/routes/studio';
import { CREDIT_COSTS } from '../../lib/server/lib/plans';

const NEW = ['case-report', 'clinical-audit', 'evaluation-report', 'policy-brief', 'annotated-bibliography', 'reading-prep'];
const context = (inputs: Record<string, string>, sources = 0): StudioContext => ({
  inputs, role: 'masters', field: null, headings: true, length: 'standard', language: null, highQuality: false,
  sources: Array.from({ length: sources }, (_, i) => ({ n: i + 1, marker: `S${i + 1}`, kind: 'paper', id: `p${i}`, title: `Paper ${i + 1}`, authors: [], more_authors: 0, year: 2020, venue: null, doi: null, url: null, pdf_url: null, is_oa: false, cited_by_count: 0, study_type: null, study_type_label: null, journal_tier: null, is_preprint: false, is_retracted: false, providers: [], abstract: 'An abstract.', tldr: null } as any)),
});
const prompt = (id: string, inputs: Record<string, string>, sources = 0) => {
  const module = studioModule(id)!;
  const built = buildStudioPrompt(module, context(checkInputs(module, inputs), sources));
  return { system: built.messages[0].content, user: built.messages[1].content };
};

describe('deliverable templates', () => {
  it('are Writing Studio modules with prompts, grouped as deliverables', () => {
    for (const id of NEW) {
      const module = studioModule(id)!;
      expect(module).toMatchObject({ workspace: 'write', group: 'Deliverables' });
      expect(hasStudioPrompt(id)).toBe(true);
    }
    expect(workspaceModules('write').filter((module) => module.group === 'Deliverables').map((module) => module.id).slice(-6)).toEqual(NEW);
    expect(new Set(STUDIO_MODULES.map((module) => module.id)).size).toBe(STUDIO_MODULES.length);
  });

  it('a case report uses only the case notes, keeps the patient de-identified and cites the literature only for context', () => {
    const { system, user } = prompt('case-report', { topic: 'Kikuchi disease', case: '34-year-old woman, fever for 3 weeks, cervical lymph nodes; biopsy on day 10 showed histiocytic necrotising lymphadenitis; recovered with NSAIDs by day 30.' }, 4);
    expect(system).toMatch(/must come from the case notes/);
    expect(system).toMatch(/de-identified/);
    expect(system).toMatch(/\[S1\]/); // the citation rules are added because sources were found
    expect(user).toMatch(/Timeline/);
    expect(user).toMatch(/Informed consent/);
    expect(() => checkInputs(studioModule('case-report')!, { topic: 'Kikuchi', case: 'too short' })).toThrow(/case/);
  });

  it('a clinical audit plan is cheaper than a report, and a report never invents results', () => {
    const module = studioModule('clinical-audit')!;
    expect(studioCredits(module, { stage: 'plan' }, CREDIT_COSTS)).toBe(CREDIT_COSTS.section);
    expect(studioCredits(module, { stage: 'report' }, CREDIT_COSTS)).toBe(CREDIT_COSTS.draft);
    const report = prompt('clinical-audit', { topic: 'VTE assessment', stage: 'report', results: 'Criterion 1: 38 of 52 (73%)' }).user;
    expect(report).toMatch(/Never invent results/);
    expect(report).toContain('38 of 52');
    expect(prompt('clinical-audit', { topic: 'VTE assessment', stage: 'plan' }).user).toMatch(/data collection form/);
  });

  it('an evaluation report follows the chosen criteria and leaves placeholders when there are no findings', () => {
    const dac = prompt('evaluation-report', { topic: 'CHW programme', description: 'Community health workers visit pregnant women monthly in three districts.' });
    expect(dac.user).toMatch(/Relevance, Coherence, Effectiveness, Efficiency, Impact, Sustainability/);
    expect(dac.user).toMatch(/No findings were given/);
    expect(dac.system).toMatch(/Never invent data/);
    expect(prompt('evaluation-report', { topic: 'WASH project', description: 'A water, sanitation and hygiene programme in twelve rural primary schools.', framework: 'logframe' }).user).toMatch(/baseline \| target \| achieved/);
  });

  it('a policy brief compares options or recommends one, for the chosen audience and context', () => {
    const neutral = prompt('policy-brief', { topic: 'Universal school meals', context: 'Kenya' }, 3).user;
    expect(neutral).toMatch(/Weighing the options/);
    expect(neutral).toMatch(/for Kenya/);
    expect(prompt('policy-brief', { topic: 'Universal school meals', stance: 'recommend', audience: 'legislators' }, 3).user).toMatch(/legislators[\s\S]*Recommendation \(the option/);
  });

  it('an annotated bibliography annotates real sources only; reading prep is priced by length', () => {
    expect(prompt('annotated-bibliography', { topic: 'Peer tutoring', kind: 'critical', size: 'short' }, 10).user).toMatch(/critical annotation[\s\S]*about 60 words/);
    const module = studioModule('reading-prep')!;
    expect(studioCredits(module, { text: 'word '.repeat(5_000) }, CREDIT_COSTS)).toBe(CREDIT_COSTS.section);
    expect(studioCredits(module, { text: 'word '.repeat(25_000) }, CREDIT_COSTS)).toBe(CREDIT_COSTS.section * 3);
    expect(prompt('reading-prep', { text: 'Reading one argues that markets clear. '.repeat(10), depth: 'deep' }).user).toMatch(/Counter-arguments/);
  });

  it('a white paper is a deliverable with its own structure per kind, priced like a proposal', () => {
    const module = studioModule('white-paper')!;
    expect(module).toMatchObject({ workspace: 'write', group: 'Deliverables', grounded: 'multi' });
    expect(hasStudioPrompt('white-paper')).toBe(true);
    expect(studioCredits(module, {}, CREDIT_COSTS)).toBe(CREDIT_COSTS.draft);
    expect(studioCredits(module, { part: 'summary' }, CREDIT_COSTS)).toBe(CREDIT_COSTS.section);
    expect(prompt('white-paper', { topic: 'Remote patient monitoring', type: 'scientific' }, 4).user).toMatch(/state of the science[\s\S]*Suggested figures/);
    expect(prompt('white-paper', { topic: 'Event streaming', type: 'technical', audience: 'technical' }, 4).user).toMatch(/Architecture[\s\S]*engineers/);
    expect(prompt('white-paper', { topic: 'Bus lanes', type: 'policy' }, 4).user).toMatch(/Consultation questions/);
    expect(prompt('white-paper', { topic: 'Bus lanes', type: 'not-a-type' }, 4).user).toMatch(/problem–solution white paper/);
  });

  it('a white paper never invents figures, uses the writer’s data as given and keeps vendor claims attributed', () => {
    const neutral = prompt('white-paper', { topic: 'Cold-chain sensors' }, 3).user;
    expect(neutral).toMatch(/never invent figures/);
    expect(neutral).toMatch(/vendor-neutral/);
    expect(neutral).toMatch(/gave no material/);
    const position = prompt('white-paper', { topic: 'Cold-chain sensors', stance: 'position', material: 'Pilot: spoilage fell from 8% to 3% across 12 depots.' }, 3).user;
    expect(position).toMatch(/Organisation\] reports/);
    expect(position).toContain('spoilage fell from 8% to 3%');
    expect(prompt('white-paper', { topic: 'Cold-chain sensors', part: 'recommendations' }, 3).user).toMatch(/recommendations \(numbered/);
  });

  it('adds blank editor templates without offering them to “Fill a template”', () => {
    const blank = TEMPLATES.filter((item) => item.blankOnly).map((item) => item.id);
    expect(blank.slice(0, 6)).toEqual(['case-report', 'clinical-audit', 'evaluation-report', 'policy-brief', 'white-paper', 'annotated-bibliography']);
    const fill = studioModule('template')!.fields[0].options!.map(([id]) => id);
    expect(fill.some((id) => blank.includes(id))).toBe(false);
  });
});

describe('catalogue features: emails, conference papers, journal formatting, ethics statements, checklists, operationalisation', () => {
  const SPEC: [id: string, workspace: string, action: keyof typeof CREDIT_COSTS, grounded: false | 'single' | 'multi', group?: string][] = [
    ['research-email', 'write', 'short', false, 'Correspondence'],
    ['conference-paper', 'write', 'draft', 'multi'],
    ['journal-format', 'write', 'section', false],
    ['ethics-statement', 'proposals', 'short', false],
    ['study-checklist', 'proposals', 'section', false, 'Checklists'],
    ['operationalisation', 'thesis', 'section', 'single'],
  ];

  it('each module exists in its workspace with its price, grounding and prompt', () => {
    for (const [id, workspace, action, grounded, group] of SPEC) {
      const module = studioModule(id)!;
      expect(module, id).toMatchObject({ workspace, grounded });
      expect(module.group, id).toBe(group);
      expect(hasStudioPrompt(id), id).toBe(true);
      expect(module.cost({ text: 'word '.repeat(100) }).action, id).toBe(action);
      expect(studioCredits(module, { text: 'word '.repeat(100) }, CREDIT_COSTS), id).toBe(CREDIT_COSTS[action]);
    }
    expect(CREDIT_COSTS.short).toBe(1);
    expect(studioModule('conference-paper')!.lengthOption).toBe(true);
    // A grouped module comes last in its workspace, so its heading does not sit above ungrouped modules.
    expect(workspaceModules('write').at(-1)!.id).toBe('research-email');
    expect(workspaceModules('proposals').at(-1)!.id).toBe('study-checklist');
  });

  it('the journal formatter is priced per 10,000 words, capped at 4 units', () => {
    const module = studioModule('journal-format')!;
    const credits = (count: number) => studioCredits(module, { text: 'word '.repeat(count) }, CREDIT_COSTS);
    expect(credits(300)).toBe(CREDIT_COSTS.section);
    expect(credits(10_001)).toBe(CREDIT_COSTS.section * 2);
    expect(credits(35_000)).toBe(CREDIT_COSTS.section * 4);
    expect(credits(45_000)).toBe(CREDIT_COSTS.section * 4);
    expect(module.fields.find((field) => field.name === 'text')!.max).toBeGreaterThanOrEqual(200_000);
  });

  it('a researcher email has a subject line, placeholders and no invented facts', () => {
    const { system, user } = prompt('research-email', { kind: 'data', topic: 'Sleep and exam performance', purpose: 'The anonymised actigraphy data from your 2021 cohort.' });
    expect(system).toMatch(/Never invent names/);
    expect(system).toMatch(/No flattery, no superlatives/);
    expect(user).toMatch(/\*\*Subject:\*\*/);
    expect(user).toMatch(/request for data/);
    expect(user).toContain('[recipient’s name and title]');
    expect(user).toContain('actigraphy data');
    expect(prompt('research-email', { kind: 'supervisor', topic: 'Coral bleaching', recipient: 'Prof. Lee' }).user).toMatch(/prospective supervisor[\s\S]*To: Prof\. Lee/);
  });

  it('a conference paper states its contributions, fits the page limit and never invents results', () => {
    const ieee = prompt('conference-paper', { topic: 'Edge anomaly detection', pages: '4' }, 6).user;
    expect(ieee).toMatch(/Our contributions are:/);
    expect(ieee).toMatch(/4-page limit/);
    expect(ieee).toMatch(/Index Terms/);
    expect(ieee).toMatch(/never invent results/);
    expect(prompt('conference-paper', { topic: 'Edge anomaly detection', format: 'acm', study: 'F1 0.91 on the SWaT dataset.' }, 6).user).toMatch(/CCS Concepts[\s\S]*F1 0\.91/);
  });

  it('the journal formatter keeps the science, notes the reference style and lists what still breaks the guidelines', () => {
    const short = prompt('journal-format', { text: 'Results. We found X in 40 of 52 samples. '.repeat(20), style: 'vancouver' });
    expect(short.system).toMatch(/Never change the scientific content/);
    expect(short.user).toMatch(/## Formatted manuscript/);
    expect(short.user).toMatch(/## Reference style/);
    expect(short.user).toMatch(/## What still breaks the guidelines/);
    expect(short.user).toMatch(/ICMJE/);
    const long = prompt('journal-format', { text: 'word '.repeat(6000), style: 'custom', guidelines: 'Abstract at most 200 words.' });
    expect(long.user).toMatch(/## New structure/);
    expect(long.user).toContain('Abstract at most 200 words.');
    expect(JOURNAL_STYLES.map((style) => style.id)).toEqual(['nature', 'science', 'ieee', 'acm', 'apa', 'vancouver', 'custom']);
  });

  it('an ethics statement uses placeholders for every missing detail', () => {
    const empty = prompt('ethics-statement', { topic: 'Sleep in students' });
    expect(empty.user).toContain('[name of the committee, institution]');
    expect(empty.user).toContain('[approval reference number]');
    expect(empty.system).toMatch(/Never invent committee names/);
    expect(empty.user).not.toMatch(/Animal research/);
    const full = prompt('ethics-statement', { topic: 'Mouse model', committee: 'IACUC, Example University', reference: 'A-123', animals: 'animals', consent: 'na' });
    expect(full.user).toContain('A-123');
    expect(full.user).toMatch(/\*\*Animal research:\*\*/);
  });

  it('a study checklist starts from its blank template and tailors it', () => {
    expect(studioModule('study-checklist')!.fields[0].options!.map(([id]) => id)).toEqual(STUDY_CHECKLISTS.map((item) => item.id));
    const ctgov = prompt('study-checklist', { kind: 'ctgov-results', topic: 'A two-arm randomised trial of drug A versus placebo in 300 adults with asthma.' });
    expect(ctgov.user).toMatch(/Participant Flow[\s\S]*Baseline Characteristics[\s\S]*Outcome Measures[\s\S]*Adverse Event Information/);
    expect(ctgov.user).toMatch(/registered outcomes exactly/);
    expect(ctgov.system).toMatch(/Never invent regulations/);
    expect(prompt('study-checklist', { kind: 'not-a-kind', topic: 'A survey of nurses about burnout at three hospitals.' }).user).toMatch(/IRB or ethics/);
  });

  it('operationalisation tables each construct and points matching constructs to the Survey builder scales', () => {
    expect(SURVEY_SCALES.map(([name]) => name)).toEqual(INSTRUMENTS.map((item) => item.name));
    const { user } = prompt('operationalisation', { topic: 'Stress and sleep in nursing students', constructs: '- Perceived stress\n- Sleep quality' }, 5);
    expect(user).toContain('Construct | Conceptual definition | Operational definition | Indicators | Instrument | Level of measurement | Validity and reliability evidence');
    expect(user).toContain('- Perceived stress\n- Sleep quality');
    expect(user).toContain('PSS-10 (perceived stress)');
    expect(user).toMatch(/add it from the Survey builder/);
    expect(user).toMatch(/Never invent an instrument/);
  });

  it('adds blank venue and checklist templates that “Fill a template” does not offer', () => {
    const ids = ['venue-ieee', 'venue-acm', 'venue-apa', 'venue-nature', 'venue-vancouver', ...STUDY_CHECKLISTS.map((item) => `checklist-${item.id}`)];
    const fill = studioModule('template')!.fields[0].options!.map(([id]) => id);
    for (const id of ids) {
      const item = TEMPLATES.find((entry) => entry.id === id);
      expect(item, id).toBeDefined();
      expect(item!.blankOnly, id).toBe(true);
      expect(item!.sections.length, id).toBeGreaterThanOrEqual(8);
      expect(fill, id).not.toContain(id);
    }
    for (const style of JOURNAL_STYLES) if (style.template) expect(ids).toContain(style.template);
    expect(new Set(TEMPLATES.map((item) => item.id)).size).toBe(TEMPLATES.length);
  });
});
