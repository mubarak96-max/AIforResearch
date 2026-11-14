import type { Tool } from '../tools';

const guide = `A Boolean search string joins the synonyms for each concept with OR, joins the concepts with AND, and puts each OR group in parentheses: \`(teacher* OR educator*) AND (burnout OR "emotional exhaustion")\`. OR widens the search, AND narrows it, and NOT removes records. The builder above writes the string for PubMed, Europe PMC and a generic form most databases accept, and checks it for unbalanced quotes, stray operators and other errors before you paste it.

## How do Boolean operators work?

**AND finds records that contain every concept, OR finds records that contain any of the terms, and NOT removes records that contain a term.** Most databases read the operators only in capitals [2].

| Operator | What it does | Example | Effect on results |
| --- | --- | --- | --- |
| OR | Any of these terms | \`burnout OR "emotional exhaustion"\` | More results: use it between synonyms |
| AND | All of these concepts | \`nurse* AND burnout\` | Fewer results: use it between concepts |
| NOT | Remove records with this term | \`burnout NOT rats\` | Fewer results, and it can remove relevant ones |
| ( ) | Group terms | \`(nurse* OR midwi*) AND burnout\` | Makes the order of operations explicit |
| " " | Exact phrase | \`"night shift"\` | The words together, in that order |
| * | Truncation | \`nurs*\` | nurse, nurses, nursing |

Parentheses matter because databases differ in how they read a mix of AND and OR. PubMed reads a search from left to right [2], so \`nurse OR midwife AND burnout\` is not the same as \`nurse OR (midwife AND burnout)\`. Put every OR group in brackets and every database reads it the same way.

## How do you build a search string step by step?

**Split your question into two or three concepts, list the words authors use for each, join the words with OR and the concepts with AND.** The Cochrane Handbook describes the same structure for review searches [1].

1. **Pick the concepts.** Usually the population and the intervention or exposure. The [PICO question builder](/tools/pico-question-builder) gives you a concept table and sends it here.
2. **List synonyms for each concept.** Include spellings (behavior, behaviour), abbreviations (SMS, text message), plural forms and older terms. Read the titles and keywords of two or three papers you already know are relevant.
3. **Decide on truncation and phrases.** Truncate where the word stem is distinctive (\`midwi*\`). Quote multi-word terms you want kept together.
4. **Choose the fields.** Title and abstract is the usual choice for free-text terms. Searching all fields finds more, with more noise.
5. **Add subject headings where the database has them.** In PubMed, add MeSH headings next to your free-text words.
6. **Check the string, run it, and test it.** Make sure the papers you already know turn up. If one is missing, find out which term it uses and add it.

## Worked examples across fields (illustrative)

### Health: PubMed with MeSH

Concepts: nurses, night shift work, burnout. With the title and abstract field and MeSH rows, the builder writes:

\`("Nurses"[MeSH Terms] OR nurse*[tiab] OR "nursing staff"[tiab] OR midwi*[tiab]) AND ("Shift Work Schedule"[MeSH Terms] OR "night shift*"[tiab] OR "shift work*"[tiab]) AND ("Burnout, Professional"[MeSH Terms] OR burnout[tiab] OR "emotional exhaustion"[tiab])\`

<!-- VERIFY: check that "Shift Work Schedule" and "Burnout, Professional" are current MeSH headings in the MeSH Browser -->

### Education: generic form

Concepts: teachers, burnout, mentoring. Generic output, ready for an education database:

\`(teacher* OR educator* OR "school staff") AND (burnout OR "emotional exhaustion" OR "teacher stress") AND (mentor* OR coaching OR induction)\`

### Engineering: generic form, title only

Concepts: digital twins, maintenance, bridges. With *Title only*, the generic form stays the same and you add the database's title field code after you paste; PubMed would get \`[ti]\` and Europe PMC \`TITLE:\`.

\`("digital twin*" OR "virtual replica*") AND (maintenance OR "condition monitoring") AND (bridge* OR "civil infrastructure")\`

### Psychology: Europe PMC

Concepts: mindfulness apps, university students. Europe PMC output with the title and abstract field:

\`(TITLE_ABS:mindfulness OR TITLE_ABS:"meditation app*") AND (TITLE_ABS:student* OR TITLE_ABS:undergraduate*)\`

## Syntax for PubMed, Europe PMC and other databases

**The concepts and the logic stay the same in every database; the field tags, subject headings and some operators change.**

| Feature | PubMed [2] | Europe PMC [3] | Generic form |
| --- | --- | --- | --- |
| Title and abstract | \`nurse*[tiab]\` | \`TITLE_ABS:nurse*\` | \`nurse*\`, then add the database's field code |
| Title only | \`nurse*[ti]\` | \`TITLE:nurse*\` | \`nurse*\` |
| Subject heading | \`"Nurses"[MeSH Terms]\` | \`MESH:"Nurses"\` | not included |
| Truncation | \`nurs*\` | \`nurs*\` | \`nurs*\` in most databases |
| Phrase | \`"night shift"[tiab]\` | \`TITLE_ABS:"night shift"\` | \`"night shift"\` |

<!-- VERIFY: confirm TITLE_ABS: and MESH: against the current Europe PMC search syntax reference, and that Europe PMC accepts * inside a quoted phrase -->

In PubMed, a MeSH heading also searches the narrower headings under it, and typing a field tag, quotes or truncation switches off PubMed's automatic term mapping for that term [2]. That is why the builder adds MeSH headings as their own terms next to the free-text words. For subscription databases your library provides, start from the generic form and use that database's help pages for field codes; the [search strategy guide](/blog/systematic-review-search-strategy) shows a full translation.

## Truncation, phrases and NOT: when to use them

**Truncate distinctive stems, quote phrases you need intact, and avoid NOT unless you have tested what it removes.**

- **Truncation.** \`child*\` finds child, children and childhood. Very short stems match unrelated words: \`cat*\` finds category and catalyst. Some databases also refuse or cap very short stems. <!-- VERIFY: PubMed's current minimum stem length and variant limit for truncation in the PubMed User Guide -->
- **Phrases.** \`"night shift"\` keeps the words together. Without quotes, PubMed may map the words to other terms, and other databases search each word anywhere in the field. With phrases switched off, the builder writes \`(night[tiab] AND shift[tiab])\`, so both words must still be there.
- **NOT.** \`burnout NOT rats\` removes every record that mentions rats, including a human study that says "unlike studies in rats". Review search guidance treats NOT with caution for this reason [1]. If you use it, run the search with and without NOT and look at what was removed.

## What does the syntax check look for?

**It flags errors that make a database reject or misread the string, and warnings that are legal but often a mistake.**

| Check | Error or warning | Example |
| --- | --- | --- |
| Odd number of quote marks | Error | \`"night shift AND nurse\` |
| Curly quotes from a word processor | Error | \`“night shift”\` |
| Unbalanced or empty parentheses | Error | \`(nurse OR nurses AND burnout\` |
| Operator at the start or end, or two in a row | Error | \`nurse AND OR burnout\` |
| Lower-case operators | Warning | \`nurse and burnout\` |
| AND and OR mixed without brackets | Warning | \`nurse OR midwife AND burnout\` |
| Very short truncation | Warning | \`ca*\` |
| NOT anywhere | Warning | \`burnout NOT rats\` |
| A very long string (over 4,000 characters) | Warning | Split into numbered lines |

<!-- VERIFY: there is no single published length limit; 4,000 characters is a rule of thumb, check before stating any database's limit -->

You can paste any string, including one you edited by hand, into **Check any search string**.

## Common mistakes

- **No brackets around synonyms.** \`nurse OR midwife AND burnout\` is read differently by different databases. Write \`(nurse OR midwife) AND burnout\`.
- **Too many concepts joined with AND.** Each AND narrows the search. Searching outcomes and time frames often loses relevant studies [1]; screen for them instead.
- **Too few synonyms.** One term per concept misses papers that use another word. Collect words from known relevant papers.
- **Copying from a word processor.** Curly quotes and dashes break searches. Paste into a plain-text box first.
- **One string for every database.** Field tags and subject headings differ. Keep the concepts and translate the syntax.
- **Not recording the search.** Save the exact string, the database, the date and the number of results. The numbered lines view gives you a log you can report, as PRISMA-S asks [4], and a librarian can review it with the PRESS checklist [5].

## How to search with AI for Research

The builder runs in your browser and costs nothing. To go further:

- **Search these terms in AI for Research** runs the main term of each concept as a keyword search in [paper search](/features/paper-search), across 250M+ scholarly works, with filters for year, study type and open access. It needs a free account. Search, citations and the free tools cost nothing; signed-in AI features use credits, and the Free plan has 45 credits a month.
- Save the papers you find to your [research library](/features/research-library) and compare them in the [literature review matrix builder](/tools/literature-review-matrix-builder).
- New to PubMed? Read [how to search PubMed](/blog/how-to-search-pubmed).

## Next steps

- [PICO question builder](/tools/pico-question-builder): turn a question into search concepts
- [Systematic review search strategy](/blog/systematic-review-search-strategy): MeSH, testing and translating a search
- [How to make a PRISMA flow diagram](/blog/how-to-make-a-prisma-flow-diagram)
- [Literature review matrix builder](/tools/literature-review-matrix-builder)

## Sources

1. Lefebvre, C., Glanville, J., Briscoe, S., et al. Chapter 4: Searching for and selecting studies. In J. P. T. Higgins et al. (Eds.), *Cochrane Handbook for Systematic Reviews of Interventions*. Cochrane. https://training.cochrane.org/handbook/current/chapter-04
2. National Library of Medicine. PubMed User Guide (Boolean operators, field tags, MeSH, truncation, automatic term mapping). https://pubmed.ncbi.nlm.nih.gov/help/
3. Europe PMC. Search syntax reference. https://europepmc.org/searchsyntax <!-- VERIFY: URL of the current Europe PMC search syntax page -->
4. Rethlefsen, M. L., Kirtley, S., Waffenschmidt, S., et al. (2021). PRISMA-S: an extension to the PRISMA Statement for Reporting Literature Searches in Systematic Reviews. *Systematic Reviews, 10*, 39. https://doi.org/10.1186/s13643-020-01542-z
5. McGowan, J., Sampson, M., Salzwedel, D. M., Cogo, E., Foerster, V., & Lefebvre, C. (2016). PRESS Peer Review of Electronic Search Strategies: 2015 guideline statement. *Journal of Clinical Epidemiology, 75*, 40–46. https://doi.org/10.1016/j.jclinepi.2016.01.021
`;

export const booleanSearchStringBuilder: Tool = {
  slug: 'boolean-search-string-builder',
  name: 'Boolean search string builder',
  category: 'research',
  kind: 'utility',
  seoTitle: 'Boolean search string generator for PubMed and more',
  description: 'Free Boolean search string generator. Add concepts and synonyms and get a correctly bracketed search for PubMed, Europe PMC or most databases, with a syntax check.',
  short: 'Concepts and synonyms into a search string for PubMed, Europe PMC and more.',
  heading: 'Boolean search string generator',
  intro: 'Add each concept and its synonyms. Get the search string with OR within concepts, AND between them and the right brackets, for PubMed, Europe PMC and a generic form for most databases, checked for syntax errors.',
  keywords: ['boolean search string generator', 'boolean operators search', 'boolean search', 'search string', 'pubmed search string', 'search strategy builder'],
  steps: [
    { title: 'Add concepts', body: 'One row per concept, with its synonyms. Or send concepts from the PICO question builder.' },
    { title: 'Set the options', body: 'Truncation, phrase quotes, the fields to search and, for PubMed and Europe PMC, MeSH headings.' },
    { title: 'Copy and check', body: 'Copy the string for your database. Fix anything the syntax check flags, then test that known papers turn up.' },
  ],
  limitations: [
    'It writes the syntax; it does not choose your terms. Collect synonyms from relevant papers and, for a systematic review, ask a librarian to review the search.',
    'MeSH headings are added as you type them. Check each one in the MeSH Browser before you rely on it.',
    'The generic form has no field codes. Add the codes your database uses after you paste it.',
  ],
  faq: [
    { q: 'What is a Boolean search string?', a: 'A Boolean search string is a database search written with AND, OR and NOT. Synonyms for one concept are joined with OR inside parentheses, and the concepts are joined with AND, for example (teacher* OR educator*) AND (burnout OR "emotional exhaustion"). It lets you find every paper that uses any of your words for each idea, and only papers that cover all the ideas.' },
    { q: 'What is the difference between AND, OR and NOT?', a: 'AND narrows a search: every concept must appear. OR widens it: any of the terms may appear, so use it between synonyms. NOT removes records that contain a term. NOT is risky because it also removes relevant records that mention the term in passing, so most systematic review searches avoid it or test carefully what it removes.' },
    { q: 'Why do I need parentheses in a search string?', a: 'Parentheses tell the database which terms belong together. Without them, databases read a mix of AND and OR in different orders; PubMed, for example, reads from left to right. Writing (nurse OR midwife) AND burnout makes the meaning clear in every database, while nurse OR midwife AND burnout may return a different set of results.' },
    { q: 'Should I use MeSH terms or keywords in PubMed?', a: 'Use both. MeSH headings find indexed records that use different words, and include narrower headings automatically. Free-text keywords in the title and abstract find new records that are not yet indexed and terms MeSH does not cover. The builder puts each concept’s MeSH headings and keywords in one OR group, so a record matches if it has either.' },
    { q: 'Can I use the same search string in every database?', a: 'Keep the concepts, the synonyms and the AND and OR structure, but change the syntax. Field tags, subject headings and some operators differ: PubMed uses [tiab] and MeSH, Europe PMC uses TITLE_ABS: and MESH:. Start from the generic form for other databases and add their own field codes from their help pages.' },
  ],
  features: ['paper-search', 'research-library'],
  related: ['pico-question-builder', 'literature-review-matrix-builder', 'deep-research'],
  guide,
  reviewed: '2026-11-14',
};
