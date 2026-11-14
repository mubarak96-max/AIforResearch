# Content calendar, 14 Nov to 15 Dec 2026: what is built

Source: the content calendar screenshot of 14 November 2026 (49 items). Volumes (Vol) and difficulty (KD)
are the calendar's own figures and have not been re-checked.

## What was left out, and why

| Calendar item | Why it is not built | What to do instead |
| --- | --- | --- |
| Systematic Review vs. Meta-Analysis | Duplicate of post 88 | Refresh post 88 |
| What Is a Scoping Review? | Covered by post 89 | Add a "what is a scoping review" section to post 89 |
| How to Word a Hypothesis | Duplicate of post 71 | Refresh post 71 |
| How to Write a Focused Research Question | Duplicate of post 70 | Refresh post 70 |
| How to Write an Operational Definition in Psychology | Duplicate of post 143 | Add a psychology section to post 143 |
| How to Find and Adapt a Theoretical Framework Example | Covered by post 79 | Add examples to post 79 |
| How to Choose an AI Research Assistant | Covered by best-ai-for-research | Refresh that post |
| MLA Reference List Generator, AMA Citation Generator, Chicago and Turabian generator | Tool-intent keywords; the generator pages already exist at /tools/citation-generator/[style] | Point these keywords at the existing style pages |
| MLA Essay Format (19 Nov) | Merged into "MLA format" (post 154) with MLA Heading | |
| How Long Should a Thesis Statement Be? and Strong and Weak Thesis Statement Examples | Merged into post 167 | |
| Sacubitril/Valsartan, Rivaroxaban, Adalimumab, Immunoglobulin | Drug explainers dropped (medical-claim risk, low volume) | |

## Articles (content/blog)

All by "Mubarak", published and updated "2026-11-14". New clusters: **T. Citation styles** (pillar
/blog/apa-reference-list), **U. Research methods and design** (pillar /blog/types-of-research-design),
**V. Essays, theses and sources** (pillar /blog/what-is-a-thesis-statement).

| # | Slug | Primary keyword (Vol · KD) | Cluster | Calendar date |
| --- | --- | --- | --- | --- |
| 150 | apa-reference-list | references in apa (450k · 24) | T (pillar) | 17 Nov |
| 151 | how-to-cite-two-or-three-authors-apa | how to apa two authors (27.1k · 17) | T | 14 Nov |
| 152 | et-al-in-citations | how to use et al (90.5k · 3) | T | 14 Dec |
| 153 | apa-essay-sample | apa essay sample (22.2k · 15) | T | 15 Dec |
| 154 | mla-format | mla heading (135k · 3); mla essay format (40.5k · 8) | T | 15 + 19 Nov |
| 155 | mla-works-cited | mla citations and works cited (110k · 24) | T | 14 Nov |
| 156 | ieee-citation-format | ieee cite (8.1k · 12) | T | 27 Nov |
| 157 | acs-citation-format | american chemical society citation (6.6k · 7) | T | 15 Nov |
| 158 | cse-citation-format | cse reference (3.6k · 0) | T | 16 Nov |
| 159 | types-of-research-design | types of research design (1.6k · 0) | U (pillar) | 22 Nov |
| 160 | quantitative-qualitative-mixed-methods | types of research methods (2.9k · 0) | U | 17 Nov |
| 161 | independent-vs-dependent-variables | what are dependent and independent variables (90.5k · 3) | U | 19 Nov |
| 162 | controlled-experiment | a controlled experiment is one in which (110k · 0) | U | 21 Nov |
| 163 | reliability-vs-validity | reliability vs validity (8.1k · 8) | U | 20 Nov |
| 164 | cohort-study | cohort research (8.1k · 8) | U | 24 Nov |
| 165 | probability-vs-non-probability-sampling | probability and non probability sampling (1.9k · 0) | U | 25 Nov |
| 166 | dichotomous-questions | dichotomous survey questions (301k · 0, suspect) | U | 3 Dec |
| 167 | what-is-a-thesis-statement | what is a thesis statement (60.5k · 16) | V (pillar) | 5 + 6 Dec, 29 Nov |
| 168 | how-long-is-a-thesis | how long is a thesis or dissertation (3.6k · 6) | V | 7 Dec |
| 169 | primary-vs-secondary-sources | primary vs secondary sources (18.1k · 18) | V | 1 Dec |
| 170 | how-to-evaluate-source-credibility | credible sources (6.6k · 4) | V | 29 Nov |
| 171 | synthesis-essay | how to write a synthesis essay (6.6k · 0) | V | 16 Nov |
| 172 | rhetorical-analysis | rhetorical analysis (14.8k · 0) | V | 30 Nov |

## Tools (lib/utilityTools + components/tools/utilities)

All run in the browser with no AI call, free and without an account.

| Slug | What it does | Calendar date |
| --- | --- | --- |
| citation-formatter | Paste a reference list in any style; each line is looked up (GET /api/tools/cite) and re-formatted in the chosen style; unmatched lines are flagged | 18 Nov |
| in-text-citation-generator | Authors, year, page → parenthetical and narrative citations in APA, MLA, Chicago author-date and Harvard, with the et al. rules | 26 Nov |
| bibtex-to-apa | Paste BibTeX → APA 7 (or any CSL style) with citation-js | 22 Nov |
| reference-list-sorter | Sort a pasted list alphabetically by APA/MLA rules and find duplicates | 30 Nov |
| citation-coverage-checker | Matches in-text citations to the reference list: cited but not listed, listed but never cited, year mismatches | 20 Nov |
| pico-question-builder | PICO, PICOT, PCC or SPIDER fields → the question, variants and a search concept table | 28 Nov |
| boolean-search-string-builder | Concept groups and synonyms → a search string for PubMed, Europe PMC or general databases | 2 Dec |
| literature-review-matrix-builder | Editable synthesis matrix in the browser, DOI lookup to fill a row, CSV and table export | 24 Nov |
| thesis-defence-timeline-planner | Defence date and rules → a backward timeline with dates, as a list and a calendar file | 4 Dec |

Also: a CSE entry in lib/citationStyles.ts, so /tools/citation-generator/cse exists for post 158.

## Writing rules for every article and tool guide

These add to the product-claim rules in [04-content-plan.md](04-content-plan.md) section 0, which all apply.

1. **Answer first.** The paragraph under the H1 answers the search in two to four sentences that make
   sense if quoted alone. Every H2 that is a question opens with a one-sentence bold answer, then detail.
   This is what AI answer engines quote.
2. **Plain English.** Short sentences, active voice, no filler ("in today's world", "delve", "crucial",
   "landscape", "it's important to note"), no em dashes, US spelling in posts unless a style's own terms
   differ.
3. **Show, do not tell.** Every rule gets a worked example. Citation posts show correct and incorrect
   versions side by side and use real, checkable sources (real DOIs) in examples. Methods posts use
   labelled "(illustrative)" examples across several fields (health, education, business, engineering,
   social science), because the audience is every kind of researcher, not one field or country.
4. **Tables** for comparisons and decision rules; a short checklist or "common mistakes" section.
5. **Sources.** A numbered "## Sources" list at the end with real, primary sources (style manuals,
   official style sites, textbooks, peer-reviewed papers with DOIs). Cite them in the text as [1], [2].
   Never invent a source, an edition, a page or a section number. If you are not sure of a detail,
   write the safe version and add `<!-- VERIFY: what to check -->`.
6. **Length.** 1,800 to 3,000 words for posts; 1,000 to 1,800 words for tool guides.
7. **Product section.** One section near the end, "How to … with AI for Research", that links only to
   features and tools that exist (see the list below) and states costs plainly: citations, search and the
   free tools cost nothing; Free plan has 45 credits a month. No invented numbers or testimonials.
8. **Links.** 4 to 8 internal links to existing posts (`ls content/blog`), the new posts in the table
   above, tools (`/tools/<slug>`) and the style pages (`/tools/citation-generator/<apa|mla|chicago|harvard|ieee|vancouver|ama|acs|turabian|cse>`).
   Close with "## Next steps" linking onward.
9. **FAQ.** Four to six questions in the frontmatter `faq` (they become FAQPage schema), repeated as
   "## FAQ" with `### question` headings in the body, each answer 40 to 80 words and self-contained.

### Pages that exist and may be linked

- Tools: /tools/citation-generator, /tools/deep-research, /tools/research-gap-finder,
  /tools/literature-review-generator, /tools/research-proposal-generator, /tools/essay-writer,
  /tools/research-paper-writer, /tools/thesis-chapter-planner, /tools/abstract-generator,
  /tools/paraphrasing-tool, /tools/data-analysis, plus the nine new tools above.
- Features: /features/research-assistant, /features/paper-search, /features/research-library,
  /features/chat-with-pdf, /features/reference-manager-import, /features/literature-review,
  /features/ai-writing-editor, /features/citation-checker, /features/ai-peer-review,
  /features/word-latex-export. Also /pricing, /signup, /citation-styles.
