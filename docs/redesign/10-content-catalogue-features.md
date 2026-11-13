# Content for the catalogue features, 13 November 2026

Landing pages, field pages and blog posts for the features in the build spec of [09-features-from-catalogue.md](09-features-from-catalogue.md). This follows [04-content-plan.md](04-content-plan.md) and [06-content-new-features.md](06-content-new-features.md); their claim rules apply unchanged. Nothing is committed or deployed.

**State:**

- `node scripts/build-blog.mjs` compiles 125 posts and 63 landing pages.
- `tests/server/landingPages.test.ts` and `tests/server/discoverability.test.ts` pass (25 tests), and `tsc --noEmit` is clean.
- A link check over every page body, FAQ, `related` list and post body found no broken internal links.
- No page has been clicked through in a browser, and none of the features was live when the copy was written. The copy follows the build spec, plus the module catalogue code where a workstream had already merged it (`studioCatalog.ts`, `studioModules.ts`, `reviewerReferences.ts`).

## Keyword data

**Not checked.** The Ubersuggest account's 3 reports a day were already used on 13 November 2026, and the monthly difficulty refreshes (10 of 10) were used too. Every keyword below is **not checked**. No volume in this file is an estimate. Pull the seed terms in the appendix before promoting a page, and change a primary keyword if its figure is weak.

## The /fields section (new)

Field pages L34–L42 from 04-content-plan.md now have a section:

- `content/pages/fields/*.md`, compiled by `scripts/build-blog.mjs` (`fields` added to `SECTIONS`).
- `lib/landingPages.ts`: `fields` added to `LandingSection`, named "Research fields".
- `app/(marketing)/fields/[slug]/page.tsx`, a copy of the `/for` route, and `app/(marketing)/fields/page.tsx`, the index.
- `app/sitemap.ts` lists `/fields`. The pages themselves come in through `allLandingPages()`.

**Not done (outside this workstream):** links to `/fields` from the header, the footer or the home page. Without them the pages are reachable only from the sitemap and from the links in content.

## Landing pages

| URL | Primary keyword | Credits stated | CTA |
| --- | --- | --- | --- |
| `/features/conference-paper-writer` | conference paper writer | 15 | `/write?module=conference-paper` |
| `/features/journal-formatter` | manuscript formatting tool | 3 per 10,000 words, max 12; venue templates 0 | `/write?module=journal-format` |
| `/features/reference-list-formatter` | reference list formatter | 0; AI cleanup 1 | `/reviewer?module=references` |
| `/features/research-poster-maker` | research poster maker | 3 | `/slides?module=poster` |
| `/features/scientific-diagrams` | scientific diagram maker | 0; Draw with AI 1 | `/editor` |
| `/features/variable-operationalization` | operationalization of variables | 3 | `/thesis?module=operationalisation` |
| `/features/clinical-research-checklists` | clinical research checklists | blank 0, tailored 3 | `/proposals?module=study-checklist` |
| `/features/reporting-guideline-checker` (L69) | reporting guideline checker | 5 per 10,000 words | `/reviewer?module=guidelines` |
| `/features/qualitative-coding` | qualitative coding software | by hand 0; AI suggestions 3 | `/all-tools` (see below) |
| `/features/bayesian-statistics` | bayesian t test calculator | 0; AI write-up 2; PDF report 0 | `/data-lab` |
| `/features/document-converter` | pdf to markdown converter | 0 | `/all-tools` (see below) |
| `/fields/medicine-and-health` (L34) | ai for clinical research | as each tool | `/deep-research` |
| `/fields/life-sciences` (L35) | ai for biology research | Summary 1, Deep 15 | `/deep-research` |
| `/fields/chemistry-and-materials` (L36) | ai for chemistry research | Summary 1, Deep 15 | `/deep-research` |
| `/fields/engineering-and-computing` (L37) | ai for computer science research | DBLP 0; conference paper 15 | `/papers` |
| `/fields/social-sciences` (L39) | ai for social science research | coding 3; operationalization 3 | `/data-lab` |
| `/fields/business-and-economics` (L41) | ai for economics research | Official Sources 0 | `/data-lab` |
| `/fields/law-and-patents` (L42) | patent search tool | PatentsView 0 | `/deep-research` |

**Dropped or merged under "one keyword, one page":**

- **Research email generator.** `/templates/research-emails` already holds "email to professor for research". It now sends its CTA to the Research email module, so it is that module's landing page.
- **Ethics statement generator.** `/templates/ethics-approval-statement` holds the keyword. It now points to `/proposals?module=ethics-statement`.
- **DBLP.** Folded into `/fields/engineering-and-computing` and post 146.
- **Progress tracker, screening documents and the Data Lab PDF report.** These are covered on existing pages: `/templates/research-progress-tracker`, the two screening templates, and `/features/bayesian-statistics`. `/features/data-lab` was not changed; see the list below.
- **L38 environmental studies and L40 humanities.** The build spec adds no sources for them, so they are not written.

**CTA routes the test does not allow yet.** The `APP_ROUTE` pattern in `tests/server/landingPages.test.ts` has no `/convert`, `/workbooks`, `/official-sources` or `/surveys`. The qualitative coding and document converter pages therefore send their button to `/all-tools`, and name the real route in the body text. When the lead adds those routes to `APP_ROUTE`, change the two CTAs to `/workbooks` and `/convert`. The law page's CTA could then move to `/official-sources`.

## Existing pages updated

| Page | Change |
| --- | --- |
| `/templates/research-emails` | CTA `/write?module=research-email` (1 credit). Plan note, FAQ and the how-to steps describe the six kinds |
| `/templates/research-poster` | CTA `/slides?module=poster` (3 credits), new build-the-poster steps; "no PowerPoint file to download" removed |
| `/templates/research-progress-tracker` | CTA `/projects`. The how-to section is now the Progress tab (log, supervisor comments, AI summary 1 credit) |
| `/templates/screening-forms`, `/templates/screening-decision-log` | Word and PDF export of the form, the exclusion reasons and the decision log from the Report step (0 credits) |
| `/templates/ethics-approval-statement` | CTA `/proposals?module=ethics-statement` (1 credit), a new ethics statement section, and the IRB checklist in Checklists |
| `/templates/reporting-checklists` | CTA `/reviewer?module=guidelines`, a SAGER row, a new "Check the finished manuscript in the Reviewer" section, links to posts 139 and 140 |
| `/for/*` (all six) | A paragraph under "Who else it is for" and `related` entries linking the new feature and field pages. In `/for/medicine`, "does not search trial registries" now names ClinicalTrials.gov and openFDA. In `/for/industry`, "no patent search" now names PatentsView and SEC filings |
| Post 97 ai-for-qualitative-research | "No qualitative coding feature" is replaced by the workbook coding |
| Post 99 patent-search-for-researchers | "No patent search" is replaced by PatentsView (US only, not an opinion) |

## Blog posts

| # | Slug | Primary keyword | Cluster |
| --- | --- | --- | --- |
| 132 | how-to-write-a-conference-paper | how to write a conference paper | R (pillar) |
| 133 | how-to-format-a-paper-for-a-journal | how to format a paper for journal submission | R |
| 134 | how-to-format-a-reference-list | how to format a reference list | R |
| 135 | how-to-make-a-research-poster | how to make a research poster | R |
| 136 | how-to-draw-a-conceptual-framework-diagram | conceptual framework diagram | R |
| 137 | site-initiation-visit-checklist | site initiation visit checklist | S (pillar) |
| 138 | clinicaltrials-gov-results-reporting | clinicaltrials.gov results reporting | S |
| 139 | sager-guidelines | sager guidelines | S |
| 140 | sampl-guidelines | sampl guidelines | S |
| 141 | how-to-code-qualitative-data | how to code qualitative data | P |
| 142 | inductive-vs-deductive-coding | inductive vs deductive coding | P |
| 143 | operational-definition-of-variables | operational definition of variables | J |
| 144 | bayes-factor-explained | bayes factor | O |
| 145 | bayesian-t-test | bayesian t test | O |
| 146 | dblp-computer-science-literature-search | dblp search | P |
| 147 | gene-and-protein-databases-for-literature-review | gene and protein databases | P |
| 148 | fred-economic-data-for-research | fred economic data | P |
| 149 | openfda-for-researchers | openfda | P |

All keywords are not checked. The "how to write an ethics statement" post from the brief was not written, because `/templates/ethics-approval-statement` already ranks for that intent.

## Before publishing

**Claim rule 1.** No page goes live before its feature is deployed and clicked through. Posts may go out earlier only with their product section cut or pointing at live features.

**Resolve the `<!-- VERIFY -->` comments** (about 125: 89 in posts 132–149, 36 in the pages). The main groups:

- **Regulatory facts:**
  - ICH E6(R3) status, 21 CFR Part 54 and Form FDA 1572 (post 137).
  - The 42 CFR Part 11 deadlines, definitions, penalties and QC process (post 138, and `/features/clinical-research-checklists`).
- **Guideline citations and numbering:**
  - SAGER, Heidari 2016 (139).
  - SAMPL, Lang and Altman 2013 (140).
  - COREQ and SRQR item counts (141).
  - Bayes factor category labels and the Rouder 2009 citation (144, 145).
- **Database facts:**
  - dblp coverage, operators and API (146).
  - Gene, protein and structure identifiers and recommended citations (147).
  - FRED series units and citation wording (148).
  - openFDA endpoints and FAERS coverage (149).
- **Post 145:** rerun the paired example in Data Lab and paste the real BF10. Values the writer computed by numerical integration (about 9.6 at r = 0.707) are inside the comment only.
- **Product details still being built:**
  - Whether poster PPTX and `.tex` downloads need a paid plan.
  - The Data Lab Bayesian defaults (JZS r, beta prior) and whether they can be changed.
  - Whether `/convert` runs OCR, and what each converted format keeps.
  - The exact sections from the conference-paper and journal-format prompts.
  - Mermaid rendering of the example in `/features/scientific-diagrams`.
  - Whether the Progress tab sends notifications.
  - What the Word and PDF screening exports contain.
  - Whether the ethics-statement module leaves placeholders.
  - Which fields Official Sources shows for FRED, PatentsView, openFDA and Treasury.
- **FAQ answers.** These can't carry comments, so check them against the live integrations:
  - FRED results show "title, unit, frequency and source" (`/fields/business-and-economics`).
  - ClinicalTrials.gov records show status, conditions, interventions, outcomes and posted results (`/fields/medicine-and-health`).
  - Official Sources shows source, unit and period (`/fields/social-sciences`).

**Other steps:**

- **Replace the `<!-- SCREENSHOT -->` comments** with product images.
- **CTAs:** move qualitative coding and document converter from `/all-tools` to `/workbooks` and `/convert` once `APP_ROUTE` allows them.
- **Navigation:** add `/fields` to the marketing navigation or footer, and to the home page's "Who it is for" area if wanted.
- **`/features/data-lab`:** add the Bayesian tests and the PDF report, linking `/features/bayesian-statistics`. It was left unchanged here.
- **Catalogue:** `lib/catalog.ts` (lead-owned) already points the guideline check at `/features/reporting-guideline-checker`. New catalogue entries can use the landing paths above.

## Appendix: seed terms to pull (three a day)

1. `operational definition`, `conference paper`, `research poster`
2. `qualitative coding`, `bayes factor`, `site initiation visit`
3. `clinicaltrials.gov results`, `sager guidelines`, `dblp`
4. `openfda`, `fred economic data`, `patent search tool`
5. `ai for clinical research`, `ai for biology research`, `pdf to markdown`
