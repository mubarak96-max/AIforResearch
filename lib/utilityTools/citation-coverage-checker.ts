import type { Tool } from '../tools';

const faq: Tool['faq'] = [
  {
    q: 'How do I check that all my citations are in the reference list?',
    a: 'Paste the text of your paper and your reference list into the checker, or paste the whole paper with the list after a “References” heading. It finds each in-text citation, looks for a list entry with the same first author and year, and lists every citation without a match, every entry that is never cited and every year that differs.',
  },
  {
    q: 'Does every reference have to be cited in the text?',
    a: 'In APA, yes: every work cited in the text must appear in the reference list, and every work in the list must be cited in the text. The main exception is a personal communication, such as an email or an interview you did not record, which is cited in the text only. A bibliography of further reading follows other rules, so check what your style or course asks for.',
  },
  {
    q: 'Does this tool check whether my sources support my claims?',
    a: 'No. It only checks that your citations and your reference list match: names, years and numbers. It does not open the sources or read what they say. To check whether the studies you cite support the sentences that cite them, use the citation checker in the AI for Research editor, which reads the cited papers against your claims.',
  },
  {
    q: 'Which citation styles does it read?',
    a: 'Author-date citations as used in APA, Harvard and Chicago author-date, in brackets or in the sentence, such as (Smith, 2020), (Smith & Lee, 2019; Wu et al., 2021, p. 4), Smith (2020) and Smith and Lee (2019). It also reads numbered citations in square brackets, such as [1] and [2–4]. Superscript numbers are skipped, because pasted text often loses them.',
  },
  {
    q: 'Is my paper uploaded anywhere?',
    a: 'No. The check runs in your browser, and the text you paste is not sent to a server or saved. It is gone when you close or reload the page. Nothing is stored in an account, so you can check unpublished work, a thesis chapter or a manuscript under review without sharing it.',
  },
];

const guide = `A citation coverage check matches every in-text citation in a paper to an entry in its reference list. It answers three questions: which works are cited but missing from the list, which list entries are never cited, and where the year in the text differs from the year in the list. Paste your paper and list above and the checker answers all three in your browser. It checks that the citations and the list agree. It does not check what the sources say.

## Why does every citation need a list entry?

**Because a reader uses the list to find the work behind each citation, and an orphan on either side breaks that link.** APA states the rule in both directions: each work cited in the text must appear in the reference list, and each work in the list must be cited in the text [1]. <!-- VERIFY: APA 7 section number for this rule (chapter 8, about 8.4) --> Numbered styles work the same way, with each number in the text pointing to one numbered entry [3][4].

Mismatches creep in during revision. A paragraph is cut but its sources stay in the list. A co-author adds a citation and forgets the entry. A preprint from 2023 is replaced by the 2024 journal version in the list but not in the text. Editors and examiners notice these, and some journals return a manuscript for them before review. <!-- VERIFY: an editorial or author guideline that names citation and list mismatches as a reason for return -->

## What the checker reports

| Report | What it means | Usual fix |
| --- | --- | --- |
| Cited but not in the list | A citation has no entry with that first author | Add the entry, or correct the spelling of the name |
| In the list but never cited | No citation points to this entry | Cite it where you used it, or delete it |
| Year mismatch | The author is listed, but with another year | Make the year in the text and the list the same |
| Counts | Citations found, by type, and list entries | A quick check that nothing was missed |

The text is shown with each citation highlighted: green when it matches, red when the work is not in the list and amber when the year differs.

## Worked example

This short passage cites real papers on sleep and memory:

> Sleep supports memory consolidation (Walker, 2017; Diekelmann & Born, 2010). Rasch and Born (2013) reviewed the evidence, and Stickgold et al. (2001, p. 1052) described the role of REM sleep. Sleep also changes with age (Mander et al., 2017).

Its list has five entries: Diekelmann and Born (2010), Rasch and Born (2013), Stickgold, Hobson, Fosse and Fosse with the year typed as 2002, Tononi and Cirelli (2014) and Walker (2017). The checker reports:

- **Cited but not in the list:** Mander et al., 2017. The entry for Mander, Winer and Walker's 2017 review in *Neuron* (https://doi.org/10.1016/j.neuron.2017.02.004) was never added. <!-- VERIFY: DOI of Mander, Winer & Walker (2017), Sleep and human aging, Neuron 94(1) -->
- **Year mismatch:** Stickgold et al., 2001; the list has 2002. The paper appeared in *Science* in 2001 (https://doi.org/10.1126/science.1063530), so the list is wrong. <!-- VERIFY: DOI of Stickgold, Hobson, Fosse & Fosse (2001), Science 294(5544) -->
- **In the list but never cited:** Tononi and Cirelli (2014), *Neuron* (https://doi.org/10.1016/j.neuron.2013.12.025). Either cite it or remove it.

Click "Try an example" in the tool to run this yourself.

## How are citations recognized?

**The checker looks for a surname and a year in brackets, or a surname followed by a year in brackets, and for numbers in square brackets.** Each kind is read like this:

| In your text | Read as |
| --- | --- |
| (Smith, 2020) or (Smith 2020) | Smith, 2020 |
| (Smith & Lee, 2019; Wu et al., 2021, p. 4) | Smith and Lee, 2019; Wu et al., 2021 |
| (see Brown, 2018, 2020a) | Brown, 2018 and Brown, 2020a |
| Smith (2020), Smith and Lee (2019), Wu et al. (2021) | narrative citations, same matching |
| (World Health Organization [WHO], 2023) | World Health Organization, 2023 |
| ("Title of Work," 2020) | a work with no author, matched on the title |
| [1], [2–4], [6, 8] | entries 1; 2, 3 and 4; 6 and 8 |

A citation matches a list entry when the first author's surname, or the group name, is the same and the year is the same. For two-author citations the second surname is used to choose between entries. A year with a letter, such as 2020a, must match the letter in the list. For numbered styles, the number is matched to the entry's own number, or to its position when the list is not numbered.

Some brackets look like citations but are not, such as "(n = 40, 2020 cohort)" or "(see Figure 2)". The checker skips brackets without a name and a year, and common words such as "Results" or "Table" before a year.

## Common mistakes the check finds

- **Spelling a name two ways.** "Müller" in the text and "Muller" in the list are matched, because accents are ignored, but "Mueller" and "Muller" are not.
- **Online-first and issue years.** A paper published online in 2023 and in an issue in 2024 is often cited with one year and listed with the other. APA asks for the year of the version you used. <!-- VERIFY: APA 7 guidance on advance online publication dates -->
- **Forgetting the a and b.** If the list has Lee (2020a) and Lee (2020b), a citation to "Lee, 2020" matches neither and shows as a year mismatch.
- **Leftover entries after cutting text.** Delete sources you no longer cite, or cite them where you used them.
- **Et al. that hides a different first author.** "Wu et al." must start with the same first author as the list entry.
- **Personal communications.** In APA these are cited in the text only, so they will show as cited but not listed. That is correct for them.

## What this check does not do

It does not read your sources, and it cannot tell you whether a source says what you cite it for. Studies of published papers find that a share of citations do not support the statement they are attached to [5]. That is a separate check. To check your claims against the papers you cite, use the [citation checker in the editor](/features/citation-checker).

It also cannot read citations that are only images or superscripts lost in pasting, footnote citations in Chicago notes and bibliography style, or names in all capitals.

## How to check citations with AI for Research

Fix what this check finds, then put the list in order with the free [reference list sorter](/tools/reference-list-sorter). Write missing in-text citations in the right form with the [in-text citation generator](/tools/in-text-citation-generator), and create missing entries from a DOI or title with the [citation generator](/tools/citation-generator). In the editor, citations you insert come from your library, so the list stays in step with the text, and the [citation checker](/features/citation-checker) reads cited papers against your claims. Citations, search and the free tools cost nothing. The Free plan has 45 credits a month for the AI features.

## FAQ

${faq.map((item) => `### ${item.q}\n\n${item.a}`).join('\n\n')}

## Next steps

- Read how [APA reference lists](/blog/apa-reference-list) are built and when to use [et al. in citations](/blog/et-al-in-citations).
- See [how to cite two or three authors in APA](/blog/how-to-cite-two-or-three-authors-apa).
- Format the list with [how to format a reference list](/blog/how-to-format-a-reference-list).

## Sources

1. American Psychological Association. (2020). *Publication manual of the American Psychological Association* (7th ed.). https://doi.org/10.1037/0000165-000
2. University of Chicago Press. (2024). *The Chicago manual of style* (18th ed.). University of Chicago Press. <!-- VERIFY: chapter number for author-date references in the 18th edition -->
3. Patrias, K. (2007). *Citing medicine: The NLM style guide for authors, editors, and publishers* (2nd ed.). National Library of Medicine. https://www.ncbi.nlm.nih.gov/books/NBK7256/ <!-- VERIFY: URL and edition date -->
4. IEEE. *IEEE reference guide*. IEEE Author Center. https://journals.ieeeauthorcenter.ieee.org/ <!-- VERIFY: direct link to the current IEEE Reference Guide PDF -->
5. Jergas, H., & Baethge, C. (2015). Quotation accuracy in medical journal articles: A systematic review and meta-analysis. *PeerJ, 3*, e1364. https://doi.org/10.7717/peerj.1364 <!-- VERIFY: DOI and the pooled error rate if a figure is added -->
`;

export const citationCoverageChecker: Tool = {
  slug: 'citation-coverage-checker',
  name: 'Citation coverage checker',
  category: 'citations',
  kind: 'utility',
  seoTitle: 'Check citations against your reference list, free',
  description: 'Match in-text citations to your reference list: works cited but not listed, entries never cited and year mismatches. APA, Harvard, Chicago and numbered. Free.',
  short: 'Find citations missing from your reference list, and entries never cited.',
  heading: 'Check your citations against your reference list',
  intro: 'Paste your paper and its reference list. Every in-text citation is matched to an entry, so you can see what is cited but not listed, what is listed but never cited, and where the years differ.',
  keywords: ['check citations against reference list', 'citation checker reference list', 'missing references checker', 'uncited references', 'match in-text citations to references', 'reference list checker', 'citation coverage'],
  steps: [
    { title: 'Paste your work', body: 'Put the text and the reference list in two boxes, or the whole paper in one with the list after a “References” heading.' },
    { title: 'Check', body: 'Each author-date or numbered citation is matched to the list by first author and year, or by number.' },
    { title: 'Fix', body: 'Add missing entries, remove or cite unused ones and make the years agree. The highlighted text shows where each citation is.' },
  ],
  limitations: [
    'It checks that citations and the list match. It does not read the sources or check whether they support your claims.',
    'Footnote citations, superscript numbers and names in all capitals are not read.',
    'Matching is by first author and year. Two different authors with the same surname and year may be matched to the same entry.',
  ],
  faq,
  features: ['citation-checker', 'reference-manager-import'],
  related: ['reference-list-sorter', 'in-text-citation-generator', 'citation-generator'],
  guide,
  reviewed: '2026-11-14',
};
