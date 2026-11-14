# AI for Research blog: articles for writers

The 30 articles from [the content plan](../../docs/content-plan-writers.md), written 6 November 2026. Each file has YAML
frontmatter (title, slug, description, keywords, cluster, pillar, author, dates, `faq` for `FAQPage` schema) and links to
other articles as `/blog/<slug>`.

## Before publishing

Search each file for HTML comments and resolve them:

- `<!-- VERIFY: … -->`: a fact that could not be confirmed (usually a competitor price, or whether self-hosting is
  offered publicly). Check it, fix the text, delete the comment.
- `<!-- TO RUN: … -->`: a test whose method and materials are in the article but whose results must be filled in by a
  person (articles 9 and 21).
- `<!-- SCREENSHOT: … -->`: what to capture from the product.

Also replace `[AUTHOR NAME]` in every file.

```
grep -n "<!-- \(VERIFY\|TO RUN\|SCREENSHOT\)" *.md
```

## Articles

| # | Cluster | Article |
| --- | --- | --- |
| 1 | A (pillar) | [Best AI writing assistant](01-best-ai-writing-assistant.md) |
| 2 | A | [Free AI writing assistant](02-free-ai-writing-assistant.md) |
| 3 | A | [AI tools for journalists](03-ai-tools-for-journalists.md) |
| 4 | B (pillar) | [AI fact checker](04-ai-fact-checker.md) |
| 5 | B | [How to fact-check AI](05-how-to-fact-check-ai.md) |
| 6 | B | [How to fact-check an article](06-how-to-fact-check-an-article.md) |
| 7 | C (pillar) | [AP style guide](07-ap-style-guide.md) |
| 8 | C | [AP style numbers, dates and times](08-ap-style-numbers-dates-times.md) |
| 9 | C | [AP style checker](09-ap-style-checker.md) |
| 10 | C | [AP vs. Chicago style](10-ap-vs-chicago-style.md) |
| 11 | C | [How to write a headline](11-how-to-write-a-headline.md) |
| 12 | C | [Inverted pyramid](12-inverted-pyramid.md) |
| 13 | C | [How to write a news article](13-how-to-write-a-news-article.md) |
| 14 | C | [How to write a press release](14-how-to-write-a-press-release.md) |
| 15 | D (pillar) | [Interview transcription](15-interview-transcription.md) |
| 16 | D | [From transcript to story](16-transcript-to-story.md) |
| 17 | E (pillar) | [Screenwriting software](17-screenwriting-software.md) |
| 18 | E | [Final Draft alternatives](18-final-draft-alternatives.md) |
| 19 | E | [Screenplay format](19-screenplay-format.md) |
| 20 | E | [Script coverage](20-script-coverage.md) |
| 21 | E | [AI script coverage](21-ai-script-coverage.md) |
| 22 | E | [AI screenplay writer](22-ai-screenplay-writer.md) |
| 23 | E | [How to research a screenplay](23-how-to-research-a-screenplay.md) |
| 24 | F (pillar) | [AI citation generator](24-ai-citation-generator.md) |
| 25 | F | [AI literature review tools](25-ai-literature-review-tools.md) |
| 26 | F | [How to write a research report](26-how-to-write-a-research-report.md) |
| 27 | F | [How to write a white paper](27-how-to-write-a-white-paper.md) |
| 28 | F | [Zotero vs. Mendeley](28-zotero-vs-mendeley.md) |
| 29 | F | [Zotero alternatives](29-zotero-alternatives.md) |
| 30 | F | [Chat with PDF](30-chat-with-pdf.md) |

## Articles 61 to 100: the research workspace

Written 12 November 2026 from [docs/redesign/04-content-plan.md](../../docs/redesign/04-content-plan.md), section 3. Credit figures follow `lib/server/lib/plans.ts` (Free 45, Plus 750, Pro 1,500; Summary 1, Deep 15, Detailed 45). Besides `VERIFY`, `TO RUN` and `SCREENSHOT`, these files carry `<!-- LINK: … -->` comments: where to add a link when a planned landing page (L11 to L66) ships.

| Posts | Cluster | Pillar |
| --- | --- | --- |
| 61–64 | G. Deep research | 61 what-is-deep-research-ai |
| 65, 66, 84 | H. Research tools compared | 64 best-ai-for-deep-research |
| 67–69, 83, 85 | I. Finding and checking sources | 67 levels-of-evidence-and-study-types |
| 70, 71, 78–80 | J. Planning a study and thesis | 70 how-to-write-a-research-question |
| 72–74 | K. Thesis defense | 72 thesis-defense-guide |
| 75–77, 86 | L. Research proposals | 75 how-to-write-a-research-proposal |
| 81, 82 | M. Reviewing and publishing | 82 how-to-respond-to-reviewer-comments |
| 87–92 | N. Systematic reviews | 87 what-is-a-systematic-review |
| 93–96 | O. Statistics for research | 93 which-statistical-test-to-use |
| 97–100 | P. Research by field | 97 ai-for-qualitative-research |

Posts 101–124 are reserved for the plan in [docs/redesign/06-content-new-features.md](../../docs/redesign/06-content-new-features.md). Posts 125–131 (cluster Q. White papers, pillar 125 what-is-a-white-paper) are described in [08-white-papers.md](../../docs/redesign/08-white-papers.md).

## Articles 132 to 149: the catalogue features

Written 13 November 2026 for the features in the build spec of [docs/redesign/09-features-from-catalogue.md](../../docs/redesign/09-features-from-catalogue.md). Keywords, the matching landing pages and the checklist before publishing are in [docs/redesign/10-content-catalogue-features.md](../../docs/redesign/10-content-catalogue-features.md). Most of these posts teach a method, so by claim rule 1 they may publish before the features ship only if their product section is removed or the linked feature is live.

| Posts | Cluster | Pillar |
| --- | --- | --- |
| 132–136 | R. Writing and publishing papers | 132 how-to-write-a-conference-paper |
| 137–140 | S. Clinical studies and reporting | 137 site-initiation-visit-checklist |
| 141, 142, 146–149 | P. Research by field (existing) | 97 ai-for-qualitative-research |
| 143 | J. Planning a study and thesis (existing) | 70 how-to-write-a-research-question |
| 144, 145 | O. Statistics for research (existing) | 93 which-statistical-test-to-use |

| # | Article | Feature page it supports |
| --- | --- | --- |
| 132 | [How to write a conference paper](132-how-to-write-a-conference-paper.md) | /features/conference-paper-writer |
| 133 | [How to format a paper for a journal](133-how-to-format-a-paper-for-a-journal.md) | /features/journal-formatter |
| 134 | [How to format a reference list](134-how-to-format-a-reference-list.md) | /features/reference-list-formatter |
| 135 | [How to make a research poster](135-how-to-make-a-research-poster.md) | /features/research-poster-maker |
| 136 | [Conceptual framework diagram](136-how-to-draw-a-conceptual-framework-diagram.md) | /features/scientific-diagrams |
| 137 | [Site initiation visit checklist](137-site-initiation-visit-checklist.md) | /features/clinical-research-checklists |
| 138 | [ClinicalTrials.gov results reporting](138-clinicaltrials-gov-results-reporting.md) | /features/clinical-research-checklists |
| 139 | [SAGER guidelines](139-sager-guidelines.md) | /features/reporting-guideline-checker |
| 140 | [SAMPL guidelines](140-sampl-guidelines.md) | /features/reporting-guideline-checker |
| 141 | [How to code qualitative data](141-how-to-code-qualitative-data.md) | /features/qualitative-coding |
| 142 | [Inductive vs deductive coding](142-inductive-vs-deductive-coding.md) | /features/qualitative-coding |
| 143 | [Operational definition of variables](143-operational-definition-of-variables.md) | /features/variable-operationalization |
| 144 | [Bayes factor explained](144-bayes-factor-explained.md) | /features/bayesian-statistics |
| 145 | [Bayesian t-test](145-bayesian-t-test.md) | /features/bayesian-statistics |
| 146 | [DBLP search](146-dblp-computer-science-literature-search.md) | /fields/engineering-and-computing |
| 147 | [Gene and protein databases](147-gene-and-protein-databases-for-literature-review.md) | /fields/life-sciences |
| 148 | [FRED economic data](148-fred-economic-data-for-research.md) | /fields/business-and-economics |
| 149 | [openFDA for researchers](149-openfda-for-researchers.md) | /fields/medicine-and-health |

## Articles 150 to 172: the November–December content calendar

Written 14 November 2026 from the content calendar; the plan, what was left out (duplicates and drug explainers) and the writing rules are in [docs/redesign/12-content-calendar-nov-dec.md](../../docs/redesign/12-content-calendar-nov-dec.md). The nine free browser tools from the same calendar live in `lib/utilityTools/`.

| Posts | Cluster | Pillar |
| --- | --- | --- |
| 150–158 | T. Citation styles | 150 apa-reference-list |
| 159–166 | U. Research methods and design | 159 types-of-research-design |
| 167–172 | V. Essays, theses and sources | 167 what-is-a-thesis-statement |
