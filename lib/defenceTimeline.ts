/**
 * Thesis defence timeline: plan backward from the defence date. Dates are calendar dates
 * ("YYYY-MM-DD") handled in UTC so a daylight-saving change never moves a day. Also writes the
 * plan as plain text and as an iCalendar (.ics) file (RFC 5545). Pure functions, no I/O.
 */

export type ExtraId = 'format' | 'similarity' | 'ethics' | 'slides' | 'mock';

export type ExtraItem = {
  id: ExtraId;
  label: string;
  enabled: boolean;
  /** Working time in days (for the mock defence: days before the defence). */
  days: number;
};

export type TimelineInput = {
  /** "YYYY-MM-DD". */
  defenceDate: string;
  /** Weeks the examiners need the thesis before the defence. */
  examinerWeeks: number;
  /** Weeks the supervisor needs to read the full draft. */
  supervisorWeeks: number;
  /** Days to make the supervisor's changes before the final checks. */
  revisionDays: number;
  extras: ExtraItem[];
  /** Move a deadline that falls on a Saturday or Sunday to the Friday before. */
  avoidWeekends: boolean;
};

export type StepStatus = 'done' | 'now' | 'upcoming' | 'late' | 'start-late';

export type TimelineStep = {
  id: string;
  label: string;
  detail: string;
  /** First day to work on it ("YYYY-MM-DD"); equals `due` for one-day milestones. */
  start: string;
  due: string;
  milestone: boolean;
  status: StepStatus;
};

export type Timeline = {
  steps: TimelineStep[];
  today: string;
  /** Plain-language problems, such as a deadline that has already passed. */
  warnings: string[];
  /** Days from today to the earliest start; negative when the plan should already have begun. */
  slackDays: number;
};

export const DEFAULT_EXTRAS: ExtraItem[] = [
  { id: 'ethics', label: 'Ethics close-out (final report to the ethics committee)', enabled: true, days: 14 },
  { id: 'format', label: 'Format check against the thesis rules', enabled: true, days: 5 },
  { id: 'similarity', label: 'Plagiarism / similarity report', enabled: true, days: 3 },
  { id: 'slides', label: 'Defence slides', enabled: true, days: 14 },
  { id: 'mock', label: 'Mock defence (days before the defence)', enabled: true, days: 7 },
];

export const DEFAULT_INPUT: Omit<TimelineInput, 'defenceDate'> = {
  examinerWeeks: 6,
  supervisorWeeks: 3,
  revisionDays: 14,
  extras: DEFAULT_EXTRAS,
  avoidWeekends: true,
};

// ------------------------------------------------------------------ dates

const DAY = 86_400_000;

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === value;
}

const toTime = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const toIso = (time: number) => new Date(time).toISOString().slice(0, 10);

export function addDays(iso: string, days: number): string {
  return toIso(toTime(iso) + Math.round(days) * DAY);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toTime(to) - toTime(from)) / DAY);
}

/** Saturday or Sunday -> the Friday before. */
export function weekdayOnOrBefore(iso: string): string {
  const day = new Date(toTime(iso)).getUTCDay();
  return day === 6 ? addDays(iso, -1) : day === 0 ? addDays(iso, -2) : iso;
}

/** Today's date where the browser is, as "YYYY-MM-DD". */
export function localToday(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** "Fri 30 Oct 2026". */
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(iso: string): string {
  const date = new Date(toTime(iso));
  return `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

const clampDays = (value: number, max = 365) => (Number.isFinite(value) ? Math.min(max, Math.max(0, Math.round(value))) : 0);

// ------------------------------------------------------------------ planning

/**
 * Plan backward from the defence:
 * defence <- mock defence <- slides; defence <- thesis to examiners (examinerWeeks) <- format
 * check and similarity report (in parallel) <- revisions <- supervisor reads the full draft.
 * The ethics close-out runs alongside and must end by the submission date.
 */
export function planTimeline(input: TimelineInput, today: string): Timeline {
  const fix = (iso: string) => (input.avoidWeekends ? weekdayOnOrBefore(iso) : iso);
  const extra = (id: ExtraId) => input.extras.find((item) => item.id === id && item.enabled);
  const steps: Omit<TimelineStep, 'status'>[] = [];
  const defence = input.defenceDate;

  steps.push({ id: 'defence', label: 'Defence', detail: 'The day of the defence (viva).', start: defence, due: defence, milestone: true });

  const mock = extra('mock');
  const mockDate = mock ? fix(addDays(defence, -Math.max(1, clampDays(mock.days)))) : null;
  if (mock && mockDate) steps.push({ id: 'mock', label: 'Mock defence', detail: 'A practice run with your supervisor or peers, with time left to act on the feedback.', start: mockDate, due: mockDate, milestone: true });

  const slides = extra('slides');
  if (slides) {
    const due = fix(addDays(mockDate ?? defence, -1));
    steps.push({ id: 'slides', label: 'Defence slides', detail: mockDate ? 'Ready the day before the mock defence.' : 'Ready the day before the defence.', start: addDays(due, -Math.max(1, clampDays(slides.days)) + 1), due, milestone: false });
  }

  const submit = fix(addDays(defence, -clampDays(input.examinerWeeks, 52) * 7));
  steps.push({ id: 'submit', label: 'Thesis to the examiners', detail: `Submit the final thesis ${clampDays(input.examinerWeeks, 52)} weeks before the defence.`, start: submit, due: submit, milestone: true });

  // Final checks end the working day before submission and run in parallel.
  const checksDue = fix(addDays(submit, -1));
  const checks = (['format', 'similarity'] as const).map(extra).filter((item): item is ExtraItem => Boolean(item));
  let checksStart = addDays(checksDue, 1);
  for (const item of checks) {
    const start = addDays(checksDue, -Math.max(1, clampDays(item.days)) + 1);
    if (start < checksStart) checksStart = start;
    steps.push({
      id: item.id,
      label: item.id === 'format' ? 'Format check' : 'Similarity report',
      detail: item.id === 'format' ? 'Check margins, front matter, numbering and the reference list against your university’s thesis rules.' : 'Run the similarity (plagiarism) check your university requires and deal with any matches.',
      start,
      due: checksDue,
      milestone: false,
    });
  }

  const ethics = extra('ethics');
  if (ethics) steps.push({ id: 'ethics', label: 'Ethics close-out', detail: 'Send the final report or closure form to the ethics committee, if your study needed approval.', start: addDays(checksDue, -Math.max(1, clampDays(ethics.days)) + 1), due: checksDue, milestone: false });

  const revisionsDue = fix(addDays(checksStart, -1));
  const revisionDays = clampDays(input.revisionDays);
  const revisionsStart = revisionDays > 0 ? addDays(revisionsDue, -revisionDays + 1) : addDays(revisionsDue, 1);
  if (revisionDays > 0) steps.push({ id: 'revisions', label: 'Revisions after supervisor feedback', detail: 'Make the changes your supervisor asked for.', start: revisionsStart, due: revisionsDue, milestone: false });

  const supervisorWeeks = clampDays(input.supervisorWeeks, 52);
  const draftDue = fix(addDays(revisionsStart, -supervisorWeeks * 7 - 1));
  if (supervisorWeeks > 0) {
    steps.push({ id: 'supervisor', label: 'Supervisor reads the full draft', detail: `${supervisorWeeks} week${supervisorWeeks === 1 ? '' : 's'} for your supervisor to read and comment.`, start: addDays(draftDue, 1), due: addDays(revisionsStart, -1), milestone: false });
  }
  steps.push({ id: 'draft', label: 'Full draft to your supervisor', detail: 'Every chapter, the abstract and the reference list, in one file.', start: draftDue, due: draftDue, milestone: true });

  const ordered = steps.sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  const warnings: string[] = [];
  const withStatus: TimelineStep[] = ordered.map((step) => {
    let status: StepStatus;
    if (step.id === 'defence') status = step.due < today ? 'done' : step.due === today ? 'now' : 'upcoming';
    else if (step.due < today) status = 'late';
    else if (step.start < today && !step.milestone) status = step.due === today ? 'now' : 'start-late';
    else if (step.start <= today) status = 'now';
    else status = 'upcoming';
    return { ...step, status };
  });

  if (defence < today) warnings.push('The defence date is in the past.');
  else {
    const late = withStatus.filter((step) => step.status === 'late');
    if (late.length) warnings.push(`${late.length} deadline${late.length === 1 ? ' has' : 's have'} already passed: ${late.map((step) => `${step.label} (${formatDate(step.due)})`).join('; ')}. Talk to your supervisor about the date, or shorten the steps that can be shortened.`);
    const startLate = withStatus.filter((step) => step.status === 'start-late');
    if (startLate.length) warnings.push(`Should already have started: ${startLate.map((step) => `${step.label} (from ${formatDate(step.start)})`).join('; ')}.`);
  }
  const earliest = withStatus.reduce((min, step) => (step.start < min ? step.start : min), defence);
  return { steps: withStatus, today, warnings, slackDays: daysBetween(today, earliest) };
}

// ------------------------------------------------------------------ export

export function timelineText(timeline: Timeline, defenceDate: string): string {
  const lines = [`Thesis defence timeline (defence ${formatDate(defenceDate)})`, ''];
  for (const step of timeline.steps) {
    const when = step.milestone || step.start === step.due ? formatDate(step.due) : `${formatDate(step.start)} to ${formatDate(step.due)}`;
    lines.push(`${when}: ${step.label}${step.status === 'late' ? ' (deadline passed)' : ''}`);
  }
  if (timeline.warnings.length) lines.push('', ...timeline.warnings.map((warning) => `Note: ${warning}`));
  return lines.join('\n');
}

/** Escape text for an iCalendar TEXT value. */
export function icsEscape(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Fold a content line at 75 octets, continuing with CRLF and a space (RFC 5545, 3.1). */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = '';
  let size = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74; // continuation lines start with a space
    if (size + bytes > limit) {
      parts.push(current);
      current = '';
      size = 0;
    }
    current += char;
    size += bytes;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

const compact = (iso: string) => iso.replace(/-/g, '');

/**
 * The timeline as an .ics file: one all-day event per step on its due date (the start date is
 * in the description). `stamp` is the creation time, "YYYYMMDDTHHMMSSZ".
 */
export function timelineIcs(timeline: Timeline, stamp: string): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AI for Research//Thesis defence timeline//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const step of timeline.steps) {
    const description = step.milestone || step.start === step.due ? step.detail : `Start by ${formatDate(step.start)}. ${step.detail}`;
    lines.push(
      'BEGIN:VEVENT',
      `UID:${step.id}-${compact(step.due)}@aiforresearch.app`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(step.due)}`,
      `DTEND;VALUE=DATE:${compact(addDays(step.due, 1))}`,
      `SUMMARY:${icsEscape(step.milestone ? step.label : `Due: ${step.label}`)}`,
      `DESCRIPTION:${icsEscape(description)}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

/** "20261114T093000Z" for a Date. */
export function icsStamp(date = new Date()): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}
