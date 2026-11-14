import type { Tool } from '../tools';

const faq: Tool['faq'] = [
  {
    q: 'How do I sort references alphabetically in APA?',
    a: 'Sort by the first author’s surname, letter by letter, so Brown comes before Browning. For the same first author, put one-author works first, then works with co-authors ordered by the next author’s surname. For identical authors, order by year with n.d. first and in press last. Works with no author are filed under the first significant word of the title.',
  },
  {
    q: 'Does APA order by year or by author?',
    a: 'By author first. The year only decides the order when the author lists are the same, in the same order. So Baddeley, A. (2012) comes before Baddeley, A. D., & Hitch, G. (1974), because a one-author entry comes before any entry where the same name is followed by co-authors, whatever the years.',
  },
  {
    q: 'How do you alphabetize references with no author?',
    a: 'Move the title into the author position and file it under its first significant word. Skip A, An and The, so a title beginning “The ethics of data sharing” files under “ethics”. When a group, such as the World Health Organization, is responsible for the work, use the group as the author, because a group author is an author.',
  },
  {
    q: 'How are works by the same author ordered in MLA?',
    a: 'By title, ignoring A, An and The, not by year. In the printed list the author’s name appears in the first entry only and is replaced by three hyphens in the entries after it. Works the author wrote alone come before works written with co-authors. The sorter orders the entries; add the hyphens yourself.',
  },
  {
    q: 'Is my reference list uploaded anywhere?',
    a: 'No. The sorter runs in your browser. The list you paste is not sent to a server or saved, so it is gone when you close the page. Copy the sorted list before you leave, and paste it over the old list in your paper. Nothing is stored in an account either.',
  },
];

const guide = `To sort references alphabetically, order every entry by the surname of its first author, letter by letter, so that "Brown" comes before "Browning" because nothing precedes something. Entries with the same first author go one-author works first, then by co-author, then by year, with "n.d." before dated works. Entries with no author go under the first significant word of the title, skipping A, An and The. The sorter above applies these APA 7 rules, or MLA 9 rules if you choose them, and finds duplicates you can remove.

## How do you alphabetize an APA reference list?

**Sort by the first author's surname, letter by letter, then use the initials, the co-authors and the year to break ties.** The APA Publication Manual sets out the order in its section on the reference list [1][4]. <!-- VERIFY: section numbers for "order of works in the reference list" in APA 7 (about 9.44 to 9.49) -->

The rules, in the order the sorter applies them:

1. **First author's surname, letter by letter.** Spaces and punctuation inside a name do not count, so "De Vries" files as "devries". <!-- VERIFY: APA 7 wording on spaces, hyphens and apostrophes in surnames -->
2. **Nothing precedes something.** A shorter name that matches the start of a longer one comes first. APA's own illustration is "Brown, J. R." before "Browning, A. R." [1].
3. **Same surname, different initials.** Use the initials, with the same rule: "Baddeley, A." before "Baddeley, A. D."
4. **Same first author.** One-author works come before works with co-authors. Works with co-authors are ordered by the second author's surname, then the third, and so on.
5. **Same author or authors.** Order by year, oldest first. "n.d." (no date) comes before dated works and "in press" comes last.
6. **Same authors and same year.** Order by title and label the years 2020a, 2020b. The sorter keeps the letters you already have and orders by them. <!-- VERIFY: APA 7 exception for works in a series with the same date -->
7. **No author.** Move the title into the author position and file it under the first significant word, ignoring A, An and The.

### Worked example (APA 7)

Pasted in this order:

- Walker, M. P., & Stickgold, R. (2004). Sleep-dependent learning and memory consolidation. *Neuron, 44*(1), 121–133. https://doi.org/10.1016/j.neuron.2004.08.031
- Baddeley, A. D., & Hitch, G. (1974). Working memory. In G. H. Bower (Ed.), *Psychology of learning and motivation* (Vol. 8, pp. 47–89). Academic Press. https://doi.org/10.1016/S0079-7421(08)60452-1
- Walker, M. P. (2017). *Why we sleep*. Scribner.
- Baddeley, A. (2012). Working memory: Theories, models, and controversies. *Annual Review of Psychology, 63*, 1–29. https://doi.org/10.1146/annurev-psych-120710-100422
- Baddeley, A. (2000). The episodic buffer: A new component of working memory? *Trends in Cognitive Sciences, 4*(11), 417–423. https://doi.org/10.1016/S1364-6613(00)01538-2

Sorted:

1. Baddeley, A. (2000): one author, earliest year.
2. Baddeley, A. (2012)
3. Baddeley, A. D., & Hitch, G. (1974): "A." is shorter than "A. D.", and the entry has a co-author, so it follows both one-author entries even though its year is the earliest.
4. Walker, M. P. (2017): one author.
5. Walker, M. P., & Stickgold, R. (2004): co-authored, so after the one-author Walker entry.

Entries 3 and 5 are the ones people get wrong most. The year only decides the order when the author lists are identical.

## How is an MLA Works Cited list ordered?

**MLA 9 also sorts by the first element of each entry, which is usually the author's surname, and ignores A, An and The at the start of a title** [2]. The differences from APA are in the tie-breaks.

- Several works by the same author are ordered by title, not by year. In the printed list, the second and later entries replace the name with three hyphens [2][3].
- A work by one author comes before works that author wrote with others.
- Entries that start with a title are filed under the first word other than A, An or The.

<!-- VERIFY: whether MLA 9 states letter-by-letter or word-by-word alphabetization -->

### Worked example (MLA 9)

| Pasted order | MLA 9 order | Why |
| --- | --- | --- |
| Morrison, Toni. *Song of Solomon*. Alfred A. Knopf, 1977. | Morrison, Toni. *Beloved*. Alfred A. Knopf, 1987. | Same author: by title |
| Morrison, Toni. *The Bluest Eye*. Holt, Rinehart and Winston, 1970. | ---. *The Bluest Eye*. Holt, Rinehart and Winston, 1970. | "The" is skipped, so it files under "Bluest" |
| Morrison, Toni. *Beloved*. Alfred A. Knopf, 1987. | ---. *Song of Solomon*. Alfred A. Knopf, 1977. | The year plays no part |

The sorter does not add the three hyphens. Add them after sorting if your instructor asks for them.

## APA and MLA order side by side

| Situation | APA 7 | MLA 9 |
| --- | --- | --- |
| Main key | First author's surname | First element (usually the author's surname) |
| Same author, several works | By year, oldest first | By title |
| No date | "n.d." before dated works | Not a sort key |
| Same author and year | Title order, with 2020a, 2020b | Title order |
| One author vs. co-authored | One author first | One author first |
| Starts with "The", "A", "An" | Ignored in titles | Ignored in titles |
| Group author | Full name, filed as written | Filed as written |

## How does the duplicate check work?

**Two entries are flagged as duplicates when they share a DOI, are the same entry with different punctuation, or have the same title and year.** Entries with the same title but different years, or very similar titles by the same first author in the same year, are flagged as likely duplicates for you to check.

Duplicates usually come from merging lists, for example a Zotero export and a list typed by a co-author. Paste the Walker and Stickgold (2004) entry above twice, once in sentence case and once in title case without the DOI. The titles and years match, so the tool flags the pair as a duplicate and offers to remove the second copy.

Likely duplicates need a person to decide. A conference paper and the later journal article often share a title but are different works with different years. You may need to cite both, or only the one you read. Two entries with different DOIs are never paired, however alike their titles look.

## Common mistakes

- **Sorting by year first.** APA uses the year only after the author list.
- **Treating "The" as the first word.** "The ethics of data sharing" files under "ethics".
- **Mixing up one person's initials.** "Baddeley, A." and "Baddeley, A. D." sort as different names. If they are the same person, use the same initials in every entry, as the source gives them.
- **Guessing at prefixes.** Follow how the person writes their own name. The sorter treats a capitalized prefix written first ("De Vries") as part of the surname.
- **Numbering an author-date list.** APA and MLA lists are not numbered. The sorter removes [1] and 1. from the start of each entry.
- **Keeping both copies of a duplicate.** Reference managers merge items on import, but pasted lists do not.
- **Expecting the sorter to fix the format.** It changes the order only. To reformat entries, use the [citation formatter](/tools/citation-formatter).

## What the sorter cannot do

It reads names and years from the text of each entry. Unusual layouts can confuse it: a list with no years, names in all capitals, or an entry that wraps without a full stop at the end. Check any entry that lands in an odd place. It also cannot tell whether two people with the same surname and initials are the same person.

## How to keep a reference list tidy with AI for Research

Build the list in the free [citation generator](/tools/citation-generator) by pasting a DOI or title, then sort it here. To check that each citation in your paper has a list entry, paste the paper into the [citation coverage checker](/tools/citation-coverage-checker). In the editor, [import from Zotero or Mendeley](/features/reference-manager-import) and the list is ordered for you in any of 10,000+ styles. Citations, search and the free tools cost nothing. The Free plan also has 45 credits a month for the AI features.

## FAQ

${faq.map((item) => `### ${item.q}\n\n${item.a}`).join('\n\n')}

## Next steps

- Read the full rules for [APA reference lists](/blog/apa-reference-list) and [MLA Works Cited](/blog/mla-works-cited).
- See [how to format a reference list](/blog/how-to-format-a-reference-list) in APA, Vancouver, IEEE and Harvard.
- Check your in-text citations against the list with the [citation coverage checker](/tools/citation-coverage-checker).

## Sources

1. American Psychological Association. (2020). *Publication manual of the American Psychological Association* (7th ed.). https://doi.org/10.1037/0000165-000
2. Modern Language Association of America. (2021). *MLA handbook* (9th ed.). Modern Language Association of America.
3. MLA Style Center. Modern Language Association. https://style.mla.org/ <!-- VERIFY: link the MLA Style Center page on ordering several works by the same author -->
4. American Psychological Association. *References*. APA Style. https://apastyle.apa.org/style-grammar-guidelines/references <!-- VERIFY: link the APA Style page on the order of works in the reference list -->
`;

export const referenceListSorter: Tool = {
  slug: 'reference-list-sorter',
  name: 'Reference list sorter',
  category: 'citations',
  kind: 'utility',
  seoTitle: 'Sort references alphabetically: APA and MLA list sorter',
  description: 'Paste a reference list and sort it alphabetically by APA 7 or MLA 9 rules. Finds duplicate entries by DOI and title. Free, in your browser.',
  short: 'Alphabetize a reference list by APA or MLA rules and remove duplicates.',
  heading: 'Sort a reference list alphabetically',
  intro: 'Paste your references. They are put in APA 7 or MLA 9 order, letter by letter, and duplicates are flagged so you can remove them. Then copy the list back into your paper.',
  keywords: ['sort references alphabetically', 'alphabetize references', 'alphabetize reference list', 'apa reference list order', 'alphabetize works cited', 'reference list sorter', 'remove duplicate references'],
  steps: [
    { title: 'Paste the list', body: 'One entry per line, or entries separated by blank lines. Wrapped lines are joined.' },
    { title: 'Pick the rules', body: 'APA 7 orders the same author by year; MLA 9 by title. Check the flagged duplicates and remove the copies.' },
    { title: 'Copy', body: 'Copy the sorted list and paste it over the old one in your paper.' },
  ],
  limitations: [
    'The sorter reads names and years from the text. Entries without years, or with names in capitals, may sort oddly: check them.',
    'It changes the order only, not the format. List numbers are removed because APA and MLA lists are not numbered.',
    'Likely duplicates need your judgement: a conference paper and the later journal article can share a title.',
  ],
  faq,
  features: ['reference-manager-import', 'research-library'],
  related: ['citation-generator', 'citation-formatter', 'citation-coverage-checker'],
  guide,
  reviewed: '2026-11-14',
};
