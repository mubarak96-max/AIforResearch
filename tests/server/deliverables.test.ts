import { describe, expect, it } from 'vitest';
import { STUDIO_MODULES, TEMPLATES, studioCredits, studioModule, workspaceModules } from '../../lib/server/lib/studioCatalog';
import { buildStudioPrompt, hasStudioPrompt, type StudioContext } from '../../lib/server/lib/studioModules';
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
    expect(workspaceModules('write').map((module) => module.id).slice(-6)).toEqual(NEW);
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
    expect(blank).toEqual(['case-report', 'clinical-audit', 'evaluation-report', 'policy-brief', 'white-paper', 'annotated-bibliography']);
    const fill = studioModule('template')!.fields[0].options!.map(([id]) => id);
    expect(fill.some((id) => blank.includes(id))).toBe(false);
  });
});
