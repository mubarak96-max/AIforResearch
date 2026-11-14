import type { Tool } from '../tools';

const guide = `A PICO question names four things: the **P**opulation, the **I**ntervention or exposure, the **C**omparison and the **O**utcome. Written as one sentence, it tells you what evidence to look for and how to search for it [1]. Use PICOT when time matters, PCC (Population, Concept, Context) for scoping reviews [3], and SPIDER for qualitative questions about experiences [4]. The builder above turns your elements into the question, checks it for gaps and gives you a concept table ready for searching.

## Which framework should you use?

**Use PICO or PICOT when you ask whether something works or causes something, PCC when you want to map what is known, and SPIDER when you want to understand experiences.** The framework follows the question, not the field: a business or engineering question can be a PICO question.

| Framework | Elements | Best for | Typical study or review |
| --- | --- | --- | --- |
| PICO | Population, Intervention, Comparison, Outcome | Effect of an intervention, test or exposure | Trials, cohort studies, systematic reviews of effectiveness [1] |
| PICOT | PICO plus Time | Effect questions where the time frame changes the answer | Clinical and nursing questions, follow-up studies [2] |
| PCC | Population, Concept, Context | Mapping a topic: what has been studied, how and where | Scoping reviews [3] |
| SPIDER | Sample, Phenomenon of Interest, Design, Evaluation, Research type | Experiences, views and meanings | Qualitative and mixed-methods evidence syntheses [4] |

If you are still choosing a topic or testing whether a question is worth asking, start with the [research question guide](/blog/how-to-write-a-research-question), which covers FINER and turning a topic into a question.

## How do you write a PICO question?

**Fill in each element with specific words, pick the question type, then read the sentence aloud and fix anything vague.** The question type changes the phrasing and the study design that can answer it.

1. **Population.** Who or what, with the details that matter: age, condition, level, setting or sector.
2. **Intervention or exposure.** What is done, used or experienced. In a diagnosis question, this is the test.
3. **Comparison.** What you compare against. It can be usual practice, no intervention or another method. Some questions have none.
4. **Outcome.** The thing you will measure, with its measure if you can.

### Phrasings by question type

The builder gives two or three phrasings for each type. These are the first ones.

| Question type | First phrasing | Design that usually answers it |
| --- | --- | --- |
| Therapy or intervention | In [P], what is the effect of [I] compared with [C] on [O]? | Randomized controlled trial |
| Prognosis or prediction | In [P], does [I] compared with [C] predict [O]? | Cohort study |
| Diagnosis or test accuracy | In [P], how accurate is [I] compared with [C] for detecting [O]? | Diagnostic accuracy study |
| Aetiology or harm | Are [P] exposed to [I] at higher risk of [O] than those exposed to [C]? | Cohort or case-control study |

### Worked example 1: health (illustrative)

- P: adults with type 2 diabetes in primary care
- I: text-message reminders
- C: usual care
- O: HbA1c

Therapy question: *In adults with type 2 diabetes in primary care, what is the effect of text-message reminders compared with usual care on HbA1c?*

### Worked example 2: education (illustrative)

- P: Year 3 pupils reading below grade level
- I: daily paired reading
- C: independent silent reading
- O: reading fluency (words correct per minute)

Therapy question: *In Year 3 pupils reading below grade level, what is the effect of daily paired reading compared with independent silent reading on reading fluency (words correct per minute)?*

### Worked example 3: engineering (illustrative)

- P: steel pipeline welds
- I: ultrasonic testing
- C: radiographic inspection (the reference standard)
- O: cracks

Diagnosis question: *In steel pipeline welds, how accurate is ultrasonic testing compared with radiographic inspection (the reference standard) for detecting cracks?* In a diagnosis question the comparison is the reference test and the outcome is the condition you want to detect.

## What is a PICOT question?

**A PICOT question is a PICO question with a time frame: over what period the outcome is measured or the intervention runs.** It is common in nursing and clinical practice, where "does it work?" often depends on "by when?" [2].

Business example (illustrative): *In small retail firms, what is the effect of a four-day working week compared with a five-day working week on staff turnover rate over 12 months?*

Add the time only when it is part of the question. A time frame you would apply anyway belongs in your inclusion criteria, not in the search.

## What is the PCC framework?

**PCC stands for Population, Concept and Context; JBI recommends it for scoping reviews, which map evidence rather than measure an effect** [3]. There is no comparison or outcome, because you are not asking what works.

Social science example (illustrative): Population *residents*, Concept *participatory budgeting*, Context *cities in low- and middle-income countries*. The builder gives: *What is known about participatory budgeting among residents in cities in low- and middle-income countries?*, plus two variants that ask how the topic has been studied and what types of evidence exist.

## When should you use SPIDER?

**Use SPIDER for qualitative questions, where you want to understand how people experience something rather than measure an effect** [4]. It swaps population for a smaller *sample* and adds the design and research type, so the search can find qualitative studies.

Education example (illustrative): Sample *first-generation university students*, Phenomenon of interest *sense of belonging*, Design *interviews, focus groups*, Evaluation *experiences and perceptions*, Research type *qualitative*. Question: *How do first-generation university students experience a sense of belonging, as reported in qualitative research (interviews, focus groups)?*

A comparison of the three tools found SPIDER searches more specific but less sensitive than PICO, so they can miss relevant studies [6]. For a full qualitative review, many teams search with fewer SPIDER elements and screen for the rest.

## How do you turn the question into a search?

**Search the population and the intervention (or concept, or phenomenon), add synonyms for each, and leave most outcomes and time frames to screening.** The Cochrane Handbook advises that outcomes are often not described in titles and abstracts, so adding them can lose relevant studies [5].

The concept table above marks each element as *Search*, *Optional* or *Usually not*. Add other words for each concept (synonyms, spellings, abbreviations), tick what to send, and press **Build the search string**. The [Boolean search string builder](/tools/boolean-search-string-builder) opens with your concepts filled in and writes the string for PubMed, Europe PMC and most other databases. For MeSH, testing and translating a search, read the [search strategy guide](/blog/systematic-review-search-strategy).

## Common mistakes

- **A vague outcome.** "Impact on learning" or "better results" cannot be measured. Name the measure: exam score, words correct per minute, HbA1c, turnover rate. The check list flags words such as *impact*, *effect* and *improve*.
- **A population that is everyone.** "Students" or "patients" alone gives you thousands of irrelevant studies. Add the level, setting or condition.
- **No comparison, by accident.** Some questions have none, but "is X effective?" always means "compared with what?". Decide, then write it down.
- **Two questions in one.** If an element has several "and"s, split it into a main question and sub-questions.
- **The wrong framework.** A question about experiences forced into PICO ends up with an empty comparison and an outcome like "views". Use SPIDER.
- **Searching every element.** Each AND makes the search narrower. Search two or three concepts and screen for the rest.

## How to build your question with AI for Research

This builder runs in your browser and saves your answers only on this device. It is free, with no account. When you have a question:

- Send the concepts to the [Boolean search string builder](/tools/boolean-search-string-builder) and copy the string into the database you need.
- Use the [research gap finder](/tools/research-gap-finder) to see whether recent papers already answer your question.
- With a free account, [paper search](/features/paper-search) looks across 250M+ scholarly works, and you can collect what you find in a [literature review matrix](/tools/literature-review-matrix-builder).

Citations, paper search and the free tools cost nothing. Signed-in AI features use credits; the Free plan has 45 credits a month.

## Next steps

- [How to write a research question](/blog/how-to-write-a-research-question): FINER and more worked examples
- [Systematic review search strategy](/blog/systematic-review-search-strategy): from concepts to a tested search
- [What is a systematic review?](/blog/what-is-a-systematic-review)
- [Boolean search string builder](/tools/boolean-search-string-builder)

## Sources

1. Richardson, W. S., Wilson, M. C., Nishikawa, J., & Hayward, R. S. (1995). The well-built clinical question: a key to evidence-based decisions. *ACP Journal Club, 123*(3), A12–A13. https://doi.org/10.7326/ACPJC-1995-123-3-A12
2. Riva, J. J., Malik, K. M. P., Burnie, S. J., Endicott, A. R., & Busse, J. W. (2012). What is your research question? An introduction to the PICOT format for clinicians. *Journal of the Canadian Chiropractic Association, 56*(3), 167–171. https://pmc.ncbi.nlm.nih.gov/articles/PMC3430448/
3. Pollock, D., Peters, M. D. J., Tricco, A. C., Munn, Z., et al. Scoping reviews. In E. Aromataris et al. (Eds.), *JBI Manual for Evidence Synthesis*. JBI, 2024. https://doi.org/10.46658/JBIMES-24-09 <!-- VERIFY: the JBI page lists more than one year in its citation block; confirm the year, authors and DOI to cite -->
4. Cooke, A., Smith, D., & Booth, A. (2012). Beyond PICO: the SPIDER tool for qualitative evidence synthesis. *Qualitative Health Research, 22*(10), 1435–1443. https://doi.org/10.1177/1049732312452938
5. Lefebvre, C., Glanville, J., Briscoe, S., et al. Chapter 4: Searching for and selecting studies. In J. P. T. Higgins et al. (Eds.), *Cochrane Handbook for Systematic Reviews of Interventions*. Cochrane. https://training.cochrane.org/handbook/current/chapter-04
6. Methley, A. M., Campbell, S., Chew-Graham, C., McNally, R., & Cheraghi-Sohi, S. (2014). PICO, PICOS and SPIDER: a comparison study of specificity and sensitivity in three search tools for qualitative systematic reviews. *BMC Health Services Research, 14*, 579. https://doi.org/10.1186/s12913-014-0579-0
`;

export const picoQuestionBuilder: Tool = {
  slug: 'pico-question-builder',
  name: 'PICO question builder',
  category: 'research',
  kind: 'utility',
  seoTitle: 'PICO question generator: PICO, PICOT, PCC and SPIDER',
  description: 'Free PICO question generator. Fill in PICO, PICOT, PCC or SPIDER and get your research question in several phrasings, a check for gaps and a search concept table.',
  short: 'PICO, PICOT, PCC or SPIDER fields into a clear question and search concepts.',
  heading: 'PICO question generator',
  intro: 'Choose PICO, PICOT, PCC or SPIDER and fill in each element. Get the question in two or three phrasings, a check list of what is missing or vague, and a concept table you can send straight to the Boolean search builder.',
  keywords: ['pico question generator', 'pico framework', 'picot question', 'pico question', 'pcc framework', 'spider framework', 'research question builder'],
  steps: [
    { title: 'Pick a framework', body: 'PICO or PICOT for effect questions, PCC for scoping reviews, SPIDER for qualitative questions.' },
    { title: 'Fill in the elements', body: 'Use the hints and examples, or start from an example in your field. Add other search words for each concept.' },
    { title: 'Check and search', body: 'Fix what the check list flags, copy the phrasing you like, then send the concepts to the Boolean search builder.' },
  ],
  limitations: [
    'The phrasings are templates. Read them aloud and adjust the grammar and wording to your question.',
    'The check list looks for missing elements and common vague words; it cannot tell whether a question is worth asking. Test it against FINER and with your supervisor.',
    'Your answers are saved in this browser only.',
  ],
  faq: [
    { q: 'What is a PICO question?', a: 'A PICO question is a one-sentence research question that names the population, the intervention or exposure, the comparison and the outcome. For example: in adults with type 2 diabetes, what is the effect of text-message reminders compared with usual care on HbA1c? Naming each part tells you which studies answer the question and which words to search for.' },
    { q: 'What is the difference between PICO and PICOT?', a: 'PICOT adds T, the time frame: how long the intervention runs or when the outcome is measured. Use it when the answer depends on timing, such as weight loss at six months versus two years. If the time frame is only a screening rule, keep the question as PICO and put the time in your inclusion criteria instead of the search.' },
    { q: 'When should I use PCC or SPIDER instead of PICO?', a: 'Use PCC (population, concept, context) for scoping reviews that map what is known about a topic, with no comparison or outcome. Use SPIDER (sample, phenomenon of interest, design, evaluation, research type) for qualitative questions about experiences and views. Use PICO when you want to know whether something works or causes something.' },
    { q: 'Does every PICO question need a comparison?', a: 'No. Some questions have no meaningful comparison, such as a prognosis question about one group over time. But a question that asks whether something is effective always implies "compared with what", whether that is usual practice, no intervention or another method. The builder flags a missing comparison so you decide on purpose rather than by accident.' },
    { q: 'Should I put every PICO element in my search?', a: 'Usually not. Search the population and the intervention with synonyms for each, and sometimes the comparison. Outcomes are often missing from titles and abstracts, so searching for them can lose relevant studies; apply them when you screen. The concept table marks each element as search, optional or usually not.' },
  ],
  features: ['paper-search', 'research-assistant'],
  related: ['boolean-search-string-builder', 'research-gap-finder', 'literature-review-matrix-builder'],
  guide,
  reviewed: '2026-11-14',
};
