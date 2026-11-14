import type { Tool } from '../tools';

const faq: Tool['faq'] = [
  {
    q: 'How far before the defence do examiners need the thesis?',
    a: 'It depends on your university, so check its regulations or ask your graduate office. Many give examiners several weeks to read, and six weeks is a common planning figure, which is why the planner starts there. Some programs ask for less and some for more. Put your own rule in the planner and every earlier date moves with it.',
  },
  {
    q: 'How do I plan backward from my defence date?',
    a: 'Start from the defence and subtract the time each step needs, in reverse order: the examiners’ reading time gives the submission date, the final checks end the day before it, your revisions come before those, and your supervisor’s reading time comes before your revisions. The result is the date your full draft must reach your supervisor.',
  },
  {
    q: 'What if a deadline has already passed?',
    a: 'The planner marks it and lists it at the top. It does not mean the defence must move, but it is worth a conversation with your supervisor now. Ask which steps can run in parallel, whether your supervisor can read chapter by chapter, and what the true minimum notice for the examiners is under your rules.',
  },
  {
    q: 'How do I add the timeline to my calendar?',
    a: 'Click “Download calendar (.ics)”. The file adds each step as an all-day event on its due date, with the start date in the event notes. Open it with Google Calendar, Outlook or Apple Calendar, or import it from the calendar’s settings. The file is made in your browser and is not uploaded anywhere.',
  },
  {
    q: 'Is it “defence” or “defense”?',
    a: 'Both are correct. “Defence” is the British and Commonwealth spelling and “defense” is the US spelling. Many UK universities call the exam a viva or viva voce instead, and North American universities usually say thesis or dissertation defense. The steps to plan are the same whatever your university calls it.',
  },
];

const guide = `To plan a thesis defence (defense in US spelling), start from the defence date and work backward. Subtract the weeks your examiners need to read the thesis to get the submission date, then the final checks, your revisions, and your supervisor's reading time, to get the date your full draft is due. The planner above does this with dates, marks today, warns you when a step is already late, and saves the plan to your calendar.

## Why plan backward from the defence date?

**Because the defence date is the one fixed point, and every other deadline depends on it.** Planning forward ("I'll finish chapter 5, then see") hides how little time is left. Planning backward shows the latest safe date for each step.

It also guards against a known bias. People tend to underestimate how long their own tasks will take, even when they know similar tasks ran late before. Buehler, Griffin and Ross called this the planning fallacy and studied it with students predicting when they would finish their theses [1]. <!-- VERIFY: that Buehler, Griffin & Ross (1994) Study 1 concerned honors thesis completion --> A backward plan built from fixed rules is less exposed to wishful thinking than an estimate.

## The steps, in reverse order

| Step | Planner default | When to change it |
| --- | --- | --- |
| Examiners read the thesis | 6 weeks before the defence | Use your university's rule, which can be shorter or longer |
| Format check | 5 days, ending the day before submission | Longer if your graduate school checks the format for you |
| Similarity (plagiarism) report | 3 days, in parallel with the format check | Longer if your school runs it and returns the report |
| Ethics close-out | 14 days, ending before submission | Turn off if your study did not need ethics approval |
| Revisions after supervisor feedback | 14 days | More for a first full draft, fewer for a second round |
| Supervisor reads the full draft | 3 weeks | Ask your supervisor; agree on it in writing |
| Defence slides | 14 days, done the day before the mock | Shorter for a short presentation |
| Mock defence | 7 days before the defence | Leave time to act on the feedback |

Examiner reading time varies more than any other step. Some programs ask for the thesis a few weeks before the defence, and others set the defence only after the examiners have the thesis. <!-- VERIFY: typical notice periods; add two or three named university regulations as examples --> Check your own regulations before you trust any default, including ours. National frameworks describe what a doctorate is, not the dates, so the rules come from your university [2].

## Worked example

A doctoral candidate has a defence on Friday 30 April 2027 and plans on 14 November 2026 with the defaults (illustrative). The planner gives:

1. **Fri 5 Feb 2027:** full draft to the supervisor.
2. **Sat 6 Feb to Fri 26 Feb:** the supervisor reads it (3 weeks).
3. **Sat 27 Feb to Fri 12 Mar:** revisions (14 days).
4. **Fri 5 Mar to Thu 18 Mar:** ethics close-out.
5. **Sun 14 Mar to Thu 18 Mar:** format check, with the similarity report from Tue 16 Mar.
6. **Fri 19 Mar:** thesis to the examiners, six weeks before the defence.
7. **Fri 9 Apr to Thu 22 Apr:** slides.
8. **Fri 23 Apr:** mock defence.
9. **Fri 30 Apr:** defence.

With weekends avoided, a deadline that would fall on a Saturday or Sunday moves to the Friday before. Here the end of the revisions moved from Saturday 13 March to Friday 12 March, and every step before it moved with it.

Now the same candidate with a defence on Friday 18 December 2026. Six weeks before is Friday 6 November, which has already passed on 14 November. The planner lists the submission and the draft as passed deadlines and shows them in red. That is the signal to talk to your supervisor, not to compress the examiners' time on your own.

## What each step involves

**Full draft to your supervisor.** Every chapter, the abstract, the front matter and the reference list, in one file. A draft missing a chapter is not a full draft, and the reading time starts again when the chapter arrives. Our guide on [how long a thesis is](/blog/how-long-is-a-thesis) helps you judge how much reading you are asking for.

**Revisions.** Agree with your supervisor which comments must be addressed before submission and which can wait for corrections after the defence.

**Format check.** Margins, title page, declarations, page numbers, table and figure lists and the reference list against your university's thesis template. A [reference list sorter](/tools/reference-list-sorter) and a [citation coverage check](/tools/citation-coverage-checker) cover two common problems in minutes.

**Similarity report.** Many universities require a similarity report, from Turnitin or iThenticate for example, before submission. A report is not a verdict. Your supervisor reads the matches, and quoted and cited text is expected to match. <!-- VERIFY: whether to name specific similarity tools -->

**Ethics close-out.** If your study had ethics approval, the committee may require a final report or closure form when data collection ends. The Declaration of Helsinki, for example, asks researchers to send a final report to the research ethics committee after a study ends [3]. <!-- VERIFY: paragraph number in the 2024 Declaration of Helsinki --> Your committee's own form and deadline apply.

**Slides and mock defence.** Build the slides while the examiners read, then present them to your supervisor or peers a week before. Viva guides recommend practising answers aloud with someone who will ask hard questions [5]. See our guides to the [defence presentation](/blog/thesis-defense-presentation) and the [questions examiners ask](/blog/thesis-defense-questions).

## Common mistakes

- **Counting the supervisor's time as yours.** Three weeks of reading is three weeks you cannot use for that draft. Work on the slides or the next paper instead.
- **Forgetting holidays.** The planner skips weekends but not public holidays or university closures. Move steps that land on one.
- **Planning to the day with no buffer.** Add a week of slack wherever you can. Printing, binding and portal uploads often take longer than expected.
- **Leaving ethics paperwork to the end.** Some committees take weeks to confirm a closure.
- **Assuming the default notice period.** Six weeks is a planning figure, not a rule.

## How the calendar file works

The .ics file follows the iCalendar standard [4]. Each step is an all-day event on its due date, and the start date is in the event's notes. The file is created in your browser. Import it once; if your plan changes, delete the old events and import the new file.

## How to prepare your defence with AI for Research

Use the free [thesis chapter planner](/tools/thesis-chapter-planner) to outline what is left to write, and write and revise chapters in the [AI writing editor](/features/ai-writing-editor), with citations from your library and export to Word, PDF or LaTeX. Citations, search and the free tools cost nothing. The Free plan has 45 credits a month for the AI features. For the day itself, read the [thesis defence guide](/blog/thesis-defense-guide).

## FAQ

${faq.map((item) => `### ${item.q}\n\n${item.a}`).join('\n\n')}

## Next steps

- Read what happens on the day in the [thesis defence guide](/blog/thesis-defense-guide).
- Prepare answers with [thesis defence questions](/blog/thesis-defense-questions).
- Build the talk with the [defence presentation guide](/blog/thesis-defense-presentation).

## Sources

1. Buehler, R., Griffin, D., & Ross, M. (1994). Exploring the "planning fallacy": Why people underestimate their task completion times. *Journal of Personality and Social Psychology, 67*(3), 366–381. https://doi.org/10.1037/0022-3514.67.3.366
2. Quality Assurance Agency for Higher Education. (2020). *Characteristics statement: Doctoral degree*. QAA. https://www.qaa.ac.uk/the-quality-code/characteristics-statements <!-- VERIFY: direct link to the doctoral degree characteristics statement -->
3. World Medical Association. (2024). *WMA Declaration of Helsinki: Ethical principles for medical research involving human participants*. https://www.wma.net/policies-post/wma-declaration-of-helsinki/
4. Desruisseaux, B. (Ed.). (2009). *Internet calendaring and scheduling core object specification (iCalendar)* (RFC 5545). Internet Engineering Task Force. https://www.rfc-editor.org/rfc/rfc5545
5. Murray, R. (2015). *How to survive your viva: Defending a thesis in an oral examination* (3rd ed.). Open University Press. <!-- VERIFY: subtitle, edition and year -->
`;

export const thesisDefenceTimelinePlanner: Tool = {
  slug: 'thesis-defence-timeline-planner',
  name: 'Thesis defence timeline planner',
  category: 'research',
  kind: 'utility',
  seoTitle: 'Thesis defence timeline planner: plan back from your date',
  description: 'Enter your defence date and rules. Get a dated backward plan: full draft, supervisor review, final checks, submission, slides and mock. Free, with an .ics file.',
  short: 'Plan back from your defence date to the day your draft is due.',
  heading: 'Plan your thesis defence timeline',
  intro: 'Enter your defence date and how long each step takes. You get every deadline, from the full draft to the mock defence, worked back from the day, with warnings for anything already late and a calendar file.',
  keywords: ['thesis defence timeline', 'thesis defense timeline', 'dissertation defense timeline', 'thesis defense planner', 'viva preparation timeline', 'thesis submission timeline', 'phd defense timeline'],
  steps: [
    { title: 'Enter the date and rules', body: 'Your defence date, the weeks your examiners need the thesis, and your supervisor’s reading time.' },
    { title: 'Adjust the steps', body: 'Turn the format check, similarity report, ethics close-out, slides and mock defence on or off, and set their days.' },
    { title: 'Save the plan', body: 'Copy it as text or download an .ics file for Google Calendar, Outlook or Apple Calendar.' },
  ],
  limitations: [
    'The defaults are planning figures, not rules. Your university’s regulations decide the notice examiners need.',
    'Weekends can be skipped, but public holidays and university closures are not. Move steps that fall on them.',
    'The plan is not saved. Copy it or download the calendar file before you leave the page.',
  ],
  faq,
  features: ['ai-writing-editor', 'word-latex-export'],
  related: ['thesis-chapter-planner', 'thesis-to-manuscript', 'abstract-generator'],
  guide,
  reviewed: '2026-11-14',
};
