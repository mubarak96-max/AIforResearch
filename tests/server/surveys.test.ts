import { beforeEach, describe, expect, it, vi } from 'vitest';

const fake = await vi.hoisted(async () => (await import('./fakeFirestore.js')).createFakeFirestore());
vi.mock('../../lib/server/firebase.js', async (original) => ({ ...(await original<typeof import('../../lib/server/firebase.js')>()), ...fake.module }));

import { Hono } from 'hono';
import type { LlmSlot } from '../../lib/server/slots/types.js';
import { breakingChanges, checkAnswers, codebookCsv, codeFrom, dataTemplateCsv, emptySurvey, likertOptions, questionnaireMarkdown, responsesCsv, surveyProblems, type SurveyDefinition } from '../../lib/surveyModel';
import { INSTRUMENTS, instrument, instrumentBlock } from '../../lib/surveyInstruments';
import { applyScoring, bandOf, scoreRow } from '../../lib/surveyScoring';
import { draftToSections, publicSurveyRoutes, surveyRoutes } from '../../lib/server/routes/surveys.js';
import { creditSummary, forgetPlans } from '../../lib/server/lib/plans.js';
import { cronbachAlpha } from '../../lib/statsMore';
import { parseCsv } from '../../lib/stats';
import { analysisColumns } from '../../lib/dataLabReproducibility';

let n = 0;
const id = () => `id${n++}`;

function sample(): SurveyDefinition {
  const survey = emptySurvey('Student wellbeing');
  survey.consent = 'I understand that taking part is voluntary and anonymous.';
  survey.sections[0].questions = [
    { id: 'q-age', code: 'age', type: 'number', text: 'How old are you?', required: true, min: 16, max: 99, integer: true },
    { id: 'q-year', code: 'year', type: 'single', text: 'Year of study', required: true, options: [{ value: '1', label: 'First' }, { value: '2', label: 'Second' }, { value: 'other', label: 'Other' }] },
    { id: 'q-help', code: 'support', type: 'multiple', text: 'Which services have you used?', required: false, options: [{ value: 'counsel', label: 'Counselling' }, { value: 'gp', label: 'GP' }] },
    { id: 'q-free', code: 'comments', type: 'long_text', text: 'Anything else?', required: false },
  ];
  const { section, scale } = instrumentBlock(instrument('gad7')!, new Set(['age', 'year', 'support', 'comments']), id);
  survey.sections.push(section);
  survey.scales.push(scale);
  return survey;
}

describe('survey model', () => {
  it('builds valid instruments with their published scoring', () => {
    for (const item of INSTRUMENTS) {
      const survey = emptySurvey('t');
      const { section, scale } = instrumentBlock(item, new Set(), id);
      survey.sections = [section]; survey.scales = [scale];
      expect(surveyProblems(survey)).toEqual([]);
    }
    expect(INSTRUMENTS.map((item) => [item.id, item.items.length])).toEqual([['phq9', 9], ['gad7', 7], ['who5', 5], ['pss10', 10], ['rses', 10], ['sus', 10]]);
    // SUS: all "agree" on odd items and "disagree" on even items is the best score, 100.
    const sus = instrumentBlock(instrument('sus')!, new Set(), id).scale;
    expect(scoreRow(sus, [5, 1, 5, 1, 5, 1, 5, 1, 5, 1])).toBe(100);
    expect(scoreRow(sus, [3, 3, 3, 3, 3, 3, 3, 3, 3, 3])).toBe(50);
    // PSS-10 reverse-scores items 4, 5, 7 and 8.
    const pss = instrumentBlock(instrument('pss10')!, new Set(), id).scale;
    expect(pss.reverse).toEqual(['pss4', 'pss5', 'pss7', 'pss8']);
    expect(scoreRow(pss, [0, 0, 0, 4, 4, 0, 4, 4, 0, 0])).toBe(0);
    // WHO-5 is reported as a percentage.
    expect(scoreRow(instrumentBlock(instrument('who5')!, new Set(), id).scale, [5, 5, 5, 5, 5])).toBe(100);
    expect(instrument('phq9')!.cautions[0]).toMatch(/Item 9/);
  });

  it('gives instruments fresh codes when the same one is added twice', () => {
    const taken = new Set<string>();
    const first = instrumentBlock(instrument('gad7')!, taken, id);
    const second = instrumentBlock(instrument('gad7')!, taken, id);
    expect(first.scale.items[0]).toBe('gad1');
    expect(second.scale.items[0]).toBe('gad2_1');
    expect(second.scale.name).toBe('gad2');
  });

  it('bands prorated scores by the band they fall under', () => {
    const bands = instrument('phq9')!.scoring.bands;
    expect(bandOf(bands, 9.4)).toBe('Mild');
    expect(bandOf(bands, 10)).toBe('Moderate');
    expect(bandOf(bands, 30)).toBe('');
  });

  it('finds problems, makes codes and refuses changes that break collected data', () => {
    const survey = sample();
    expect(surveyProblems(survey)).toEqual([]);
    const broken = structuredClone(survey);
    broken.sections[0].questions[1].code = 'age';
    broken.sections[0].questions[0].options = undefined;
    expect(surveyProblems(broken)[0]).toMatch(/share the variable name/);
    expect(codeFrom('How old are you?', new Set(['how_old_are_you']))).toBe('how_old_are_you_2');
    expect(codeFrom('2nd language', new Set())).toBe('q2nd_language');
    const changed = structuredClone(survey);
    changed.sections[0].questions[0].text = 'Your age in years';
    changed.sections[0].questions[1].options = changed.sections[0].questions[1].options!.slice(0, 2);
    changed.sections[0].questions.splice(3, 1);
    expect(breakingChanges(survey, changed)).toEqual(['“year” lost the answer code other', '“comments” was removed']);
  });

  it('checks answers, writes CSV for Data Lab, the codebook and the questionnaire', () => {
    const survey = sample();
    expect(checkAnswers(survey, { age: '17', year: '1' })).toMatchObject({ error: expect.stringMatching(/Please answer: Feeling nervous/) });
    const gad = Object.fromEntries(Array.from({ length: 7 }, (_, i) => [`gad${i + 1}`, String(i % 4)]));
    expect(checkAnswers(survey, { ...gad, age: '15', year: '1' })).toMatchObject({ error: expect.stringMatching(/from 16 to 99/) });
    expect(checkAnswers(survey, { ...gad, age: '20', year: '9' })).toMatchObject({ error: expect.stringMatching(/Choose one/) });
    const ok = checkAnswers(survey, { ...gad, age: '20', year: '2', support: ['gp'], comments: '  fine ' });
    expect(ok).toMatchObject({ answers: { age: 20, year: '2', support: ['gp'], comments: 'fine', gad1: 0, gad2: 1 } });
    const csv = responsesCsv(survey, [{ id: 'r1', submitted_at: '2026-11-13T10:00:00.000Z', answers: (ok as any).answers }]);
    expect(csv.split('\n')[0]).toBe('response_id,submitted_at,age,year,support_counsel,support_gp,comments,gad1,gad2,gad3,gad4,gad5,gad6,gad7');
    expect(csv.split('\n')[1]).toBe('r1,2026-11-13T10:00:00.000Z,20,2,0,1,fine,0,1,2,3,0,1,2');
    expect(dataTemplateCsv(survey).startsWith('respondent_id,age,year,support_counsel')).toBe(true);
    expect(codebookCsv(survey)).toContain('year,Year of study,One choice,1 = First; 2 = Second; other = Other,yes');
    expect(codebookCsv(survey)).toContain('GAD7_score');
    expect(questionnaireMarkdown(survey)).toContain('☐ I agree to take part.');
  });

  it('scores the CSV in Data Lab and the items feed Cronbach’s alpha', () => {
    const survey = sample();
    const rows = [[0, 0, 1, 0, 0, 1, 0], [2, 2, 3, 2, 1, 2, 2], [1, 1, 1, 2, 1, 1, 0], [3, 3, 3, 3, 2, 3, 3], [1, 0, 1, 1, '', 0, 1]];
    const responses = rows.map((values, r) => ({ id: `r${r}`, submitted_at: '2026-11-13T10:00:00.000Z', answers: Object.fromEntries(values.map((value, i) => [`gad${i + 1}`, value])) as any }));
    const scored = applyScoring(responsesCsv(survey, responses), survey.scales);
    expect(scored.added).toEqual(['GAD7_score', 'GAD7_band']);
    const parsed = parseCsv(scored.csv);
    const scoreAt = parsed.header.indexOf('GAD7_score');
    expect(parsed.rows.map((row) => row[scoreAt])).toEqual(['2', '14', '7', '20', '']);
    expect(parsed.rows.map((row) => row[scoreAt + 1])).toEqual(['Minimal', 'Moderate', 'Mild', 'Severe', '']);
    expect(scored.warnings[0]).toMatch(/1 respondent answered too few items/);
    // Data Lab marks scored items as numeric (an item where everyone chose one of two answers would otherwise look categorical).
    const columns = analysisColumns(scored.csv, Object.fromEntries(survey.scales[0].items.map((code) => [code, 'numeric' as const])));
    const alpha = cronbachAlpha(survey.scales[0].items.map((code) => ({ name: code, values: columns.find((column) => column.name === code)!.values })));
    expect(alpha.rows[0][0]).toBe('Cronbach’s α');
    expect(alpha.rows.find(([label]) => label.startsWith('Respondents'))?.[1]).toBe('4 of 5');
  });

  it('keeps only usable drafted questions, with codes that do not clash', () => {
    const taken = new Set(['age']);
    const sections = draftToSections({ sections: [{ title: 'Background', questions: [
      { text: 'Age', type: 'number' }, { text: 'Gender', type: 'single', options: ['Woman', 'Man', 'Prefer not to say'] },
      { text: 'Broken', type: 'single', options: ['Only one'] }, { text: '', type: 'text' },
    ] }] }, taken, id);
    expect(sections[0].questions.map((question) => [question.code, question.type])).toEqual([['age_2', 'number'], ['gender', 'single']]);
    expect(likertOptions(['No', 'Yes'], 0)).toEqual([{ value: '0', label: 'No' }, { value: '1', label: 'Yes' }]);
  });
});

describe('survey routes', () => {
  const llm = { provider: 'fake', complete: vi.fn(async () => ({ text: JSON.stringify({ overall: 'Mostly clear.', comments: [{ code: 'year', severity: 'minor', issue: 'Add a fourth-year option.', fix: 'Add “Third or later”.' }, { code: 'invented', issue: 'x' }] }), usage: { inputTokens: 1, outputTokens: 1 } })), stream: vi.fn() } as unknown as LlmSlot;
  const app = new Hono<{ Variables: { user: any } }>();
  app.use('/api/surveys/*', async (c, next) => { c.set('user', { id: 'u1', account_id: 'acc-1', email: 'a@b.c', full_name: 'A', is_admin: false }); await next(); });
  app.route('/api/surveys', surveyRoutes({ llm, papers: {} as any }) as any);
  app.route('/api/public/surveys', publicSurveyRoutes() as any);
  app.onError((error: any, c) => c.json({ detail: error.message }, error.status ?? 500));
  const call = (path: string, method = 'GET', body?: unknown) => app.request(path, { method, headers: { 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });

  beforeEach(() => {
    fake.clear();
    fake.put('accounts/acc-1', { plan: 'free', plan_status: 'none', plan_source: 'default' });
    fake.put('users/u1', { account_id: 'acc-1' });
    forgetPlans();
  });

  it('creates, opens and collects anonymous responses, then exports them for Data Lab', async () => {
    const created = await (await call('/api/surveys', 'POST', { title: 'Student wellbeing', definition: sample() })).json();
    const loaded = await (await call(`/api/surveys/${created.id}`)).json();
    expect(loaded).toMatchObject({ role: 'owner', can_edit: true, problems: [] });
    expect((await call(`/api/public/surveys/notopen123`)).status).toBe(404);
    const opened = await (await call(`/api/surveys/${created.id}/status`, 'POST', { status: 'open' })).json();
    expect(opened.public_id).toMatch(/^[A-Za-z0-9_-]{16}$/);
    const view = await (await call(`/api/public/surveys/${opened.public_id}`)).json();
    expect(view).toMatchObject({ status: 'open', title: 'Student wellbeing', consent: expect.any(String) });
    expect(view.scales).toBeUndefined();
    expect(view.user_id).toBeUndefined();
    const gad = Object.fromEntries(Array.from({ length: 7 }, (_, i) => [`gad${i + 1}`, '1']));
    expect((await call(`/api/public/surveys/${opened.public_id}/responses`, 'POST', { answers: { ...gad, age: 20, year: '1' } })).status).toBe(422); // no consent
    const sent = await call(`/api/public/surveys/${opened.public_id}/responses`, 'POST', { answers: { ...gad, age: 20, year: '1' }, consent: true });
    expect(await sent.json()).toMatchObject({ ok: true, thank_you: 'Thank you for taking part.' });
    // A bot that fills the hidden field is thanked but not stored.
    await call(`/api/public/surveys/${opened.public_id}/responses`, 'POST', { answers: {}, consent: true, website: 'spam' });
    const exported = await (await call(`/api/surveys/${created.id}/responses`)).json();
    expect(exported.count).toBe(1);
    expect(exported.csv.split('\n')[1]).toMatch(/,20,1,,,,1,1,1,1,1,1,1$/);
    expect(await (await call(`/api/surveys/${created.id}/scoring`)).json()).toMatchObject({ responses: 1, scales: [{ name: 'GAD7' }] });
  });

  it('refuses changes that would break collected data, stale saves and going back to draft', async () => {
    const created = await (await call('/api/surveys', 'POST', { title: 'S', definition: sample() })).json();
    const { public_id } = await (await call(`/api/surveys/${created.id}/status`, 'POST', { status: 'open' })).json();
    const gad = Object.fromEntries(Array.from({ length: 7 }, (_, i) => [`gad${i + 1}`, '2']));
    await call(`/api/public/surveys/${public_id}/responses`, 'POST', { answers: { ...gad, age: 30, year: '2' }, consent: true });
    const definition = sample();
    definition.title = 'S';
    definition.sections[0].questions[0].text = 'Age in years';
    expect((await call(`/api/surveys/${created.id}`, 'PUT', { definition, revision: 1 })).status).toBe(200);
    expect((await call(`/api/surveys/${created.id}`, 'PUT', { definition, revision: 1 })).status).toBe(409);
    definition.sections[0].questions.splice(0, 1);
    const broken = await call(`/api/surveys/${created.id}`, 'PUT', { definition, revision: 2 });
    expect(broken.status).toBe(409);
    expect((await broken.json()).detail).toMatch(/“age” was removed/);
    expect((await call(`/api/surveys/${created.id}/status`, 'POST', { status: 'draft' })).status).toBe(409);
    await call(`/api/surveys/${created.id}/status`, 'POST', { status: 'closed' });
    expect((await call(`/api/public/surveys/${public_id}/responses`, 'POST', { answers: { ...gad, age: 30, year: '2' }, consent: true })).status).toBe(404);
  });

  it('limits Free to three surveys and its response cap', async () => {
    for (let i = 0; i < 3; i += 1) expect((await call('/api/surveys', 'POST', { title: `S${i}` })).status).toBe(200);
    expect((await call('/api/surveys', 'POST', { title: 'S4' })).status).toBe(402);
    const listed = await (await call('/api/surveys')).json();
    expect(listed.surveys).toHaveLength(3);
  });

  it('checks the questionnaire for 2 credits, keeping comments on real questions', async () => {
    fake.put('accounts/acc-1', { plan: 'plus', plan_status: 'active', plan_source: 'dodo' });
    forgetPlans();
    const created = await (await call('/api/surveys', 'POST', { title: 'S', definition: sample() })).json();
    const review = await (await call(`/api/surveys/${created.id}/ai/review`, 'POST', {})).json();
    expect(review.comments).toEqual([{ code: 'year', severity: 'minor', issue: 'Add a fourth-year option.', fix: 'Add “Third or later”.' }, { code: null, severity: 'minor', issue: 'x', fix: '' }]);
    expect((await creditSummary('acc-1')).used).toBe(2);
  });
});
