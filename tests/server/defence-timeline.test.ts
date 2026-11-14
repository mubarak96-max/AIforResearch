import { describe, expect, it } from 'vitest';
import { DEFAULT_INPUT, addDays, foldLine, icsEscape, isIsoDate, planTimeline, timelineIcs, timelineText, weekdayOnOrBefore } from '../../lib/defenceTimeline.js';

const input = (defenceDate: string, overrides = {}) => ({ ...DEFAULT_INPUT, defenceDate, ...overrides });
const byId = (timeline: ReturnType<typeof planTimeline>) => Object.fromEntries(timeline.steps.map((step) => [step.id, step]));

describe('dates', () => {
  it('validates, adds days and avoids weekends', () => {
    expect(isIsoDate('2027-02-29')).toBe(false);
    expect(isIsoDate('2028-02-29')).toBe(true);
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30'); // across a daylight-saving change
    expect(weekdayOnOrBefore('2026-11-14')).toBe('2026-11-13'); // Saturday -> Friday
    expect(weekdayOnOrBefore('2026-11-15')).toBe('2026-11-13'); // Sunday -> Friday
    expect(weekdayOnOrBefore('2026-11-16')).toBe('2026-11-16');
  });
});

describe('backward plan', () => {
  it('plans from the defence with the default rules', () => {
    // Defence Friday 30 April 2027.
    const steps = byId(planTimeline(input('2027-04-30'), '2026-11-14'));
    expect(steps.submit.due).toBe('2027-03-19'); // 6 weeks before
    expect(steps.mock.due).toBe('2027-04-23'); // 7 days before
    expect(steps.slides).toMatchObject({ due: '2027-04-22', start: '2027-04-09' });
    expect(steps.format).toMatchObject({ due: '2027-03-18', start: '2027-03-14' });
    expect(steps.similarity).toMatchObject({ due: '2027-03-18', start: '2027-03-16' });
    expect(steps.ethics).toMatchObject({ due: '2027-03-18', start: '2027-03-05' });
    expect(steps.revisions).toMatchObject({ due: '2027-03-12', start: '2027-02-27' });
    expect(steps.draft.due).toBe('2027-02-05'); // 3 weeks of reading before the revisions start
    expect(Object.values(steps).every((step) => step.status === 'upcoming')).toBe(true);
  });

  it('skips items that are turned off', () => {
    const extras = DEFAULT_INPUT.extras.map((item) => ({ ...item, enabled: item.id !== 'mock' }));
    const steps = byId(planTimeline(input('2027-04-30', { extras }), '2026-11-14'));
    expect(steps.mock).toBeUndefined();
    expect(steps.slides.due).toBe('2027-04-29');
  });

  it('warns when deadlines have already passed', () => {
    const timeline = planTimeline(input('2026-12-18'), '2026-11-14');
    const steps = byId(timeline);
    expect(steps.draft.status).toBe('late');
    expect(steps.submit.status).toBe('late');
    expect(timeline.warnings[0]).toMatch(/already passed/);
    expect(timeline.slackDays).toBeLessThan(0);
    expect(planTimeline(input('2026-01-01'), '2026-11-14').warnings).toEqual(['The defence date is in the past.']);
  });
});

describe('export', () => {
  const timeline = planTimeline(input('2027-04-30'), '2026-11-14');

  it('writes plain text in date order', () => {
    const text = timelineText(timeline, '2027-04-30');
    expect(text.split('\n')[0]).toBe('Thesis defence timeline (defence Fri 30 Apr 2027)');
    expect(text).toContain('Fri 19 Mar 2027: Thesis to the examiners');
    expect(text.trim().split('\n').pop()).toBe('Fri 30 Apr 2027: Defence');
  });

  it('writes a valid iCalendar file', () => {
    const ics = timelineIcs(timeline, '20261114T090000Z');
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)?.length).toBe(timeline.steps.length);
    expect(ics).toContain('DTSTART;VALUE=DATE:20270430\r\nDTEND;VALUE=DATE:20270501');
    for (const line of ics.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(icsEscape('a, b; c\nd')).toBe('a\\, b\\; c\\nd');
    expect(foldLine('x'.repeat(80))).toBe(`${'x'.repeat(75)}\r\n ${'x'.repeat(5)}`);
  });
});
