# PRD status

Where WriteOrbit stands against `newfeatures.md` (the research platform PRD). Updated 2026-11-10.

Two kinds of public page, never mixed:

- **Feature pages** (`/features/[slug]`, data in `lib/features.ts`): things the editor already does. Each page explains one feature and its button opens it in the app.
- **Tools** (`/tools/[slug]`, data in `lib/tools.ts`): standalone tools that work **on their own page**, free without an account (AI tools: 3 runs a day per address; signed-in people use their plan's allowance). Results can open in the editor as a document with live citations.

Rule from the PRD: nothing is listed that does not work. Add a feature page or tool only when its route does.

## 1. Already had: now feature pages

Paper search (M02), research library (M04), Zotero/Mendeley/BibTeX/RIS import (M05), chat with PDF (M06), AI research chat, AI writing assistant (autocomplete, Write with AI), review matrix (part of M08), AI writing editor (M12), claim and citation check (M20), AI peer review (M18), authorship report, Word/PDF/LaTeX export.

## 2. Had, improved

| PRD | What changed |
| --- | --- |
| M19 Citation generator | Was editor-only. Now a working tool: DOI or title lookup, website/book/article by hand, any of 10,000+ CSL styles, copy with formatting. Ten style pages (APA, MLA, Chicago, Harvard, AMA, ACS, IEEE, Vancouver, Turabian, Bluebook) each embed it. |
| M01 Deep research | Was chat only. Now a tool that searches papers and writes a structured report (findings, disagreements, limits, open questions, evidence table), every claim cited. |
| M08 Literature review studio | Matrix kept; added a generator for thematic, chronological and RRL reviews from real papers. |
| P05 Help center | Now searchable, with topics the PRD lists: free tools, sources and reliability, plans/limits/payments/cancelling, account and privacy. |

## 3. Adapted from what existed (Write with AI / AI Edit) into tools

Research proposal (M09), thesis chapter planner (M10), research paper writer (M11), RRL (M14), essay writer (M15), abstract generator (M16), grant proposal writer (M17), thesis to manuscript (M13), paraphraser (M23), humanizer as a natural-style rewrite (M21, no detector-evasion claims).

Grounded tools search the index, give the model numbered abstracts, and keep only citations to papers that exist (`cleanMarkers`). Prompts: `lib/server/lib/toolPrompts.ts`. Route: `lib/server/routes/tools.ts`.

## 4. New tools

| PRD | Tool | Notes |
| --- | --- | --- |
| M03 Research gap finder | `/tools/research-gap-finder` | Gaps with type, reasons, cited sources and a confidence level |
| M22 AI detector | `/tools/ai-writing-checker` | Deliberately **not** a detector: highlights stock phrases and patterns, never gives an "AI probability" (PRD 9.5 #12; detectors are unreliable and harm students) |
| M25 Quick data analysis | `/tools/data-analysis` | Descriptives, Pearson, Welch and paired t-tests, one-way ANOVA, chi-square; calculated in the browser (`lib/stats.ts`, tested against hand-derived and closed-form values), APA write-ups |
| M07 PDF utilities | `/tools/pdf-tools` | Merge, extract, split, rotate with pdf-lib in the browser; nothing uploaded |

## 5. Other pages

| PRD | Status |
| --- | --- |
| P07/P08 Research directory | Done: `/research` search, paper pages (cite in 4 styles + BibTeX), author pages |
| P12 Legal | Added `/ai-use` and `/cookies`. **Need legal review.** Refund/billing policy still to write (depends on your Dodo terms). |
| P13 Comparison pages | Not started: claims must be dated and sourced |
| P09 Author profile claiming | Not started: needs a verification policy |

## Still to build (large modules)

| PRD | Why it is not a page yet |
| --- | --- |
| M24 Systematic review workspace | Needs projects, a protocol, two-reviewer screening, PRISMA flow and stored decisions |
| M26 Detailed data analysis | Regression, assumptions checks, transformations log; beyond the browser calculator |
| M27 Data collection / form builder | Needs public forms, response storage, consent and anonymity rules (PRD 9.5 #13–14) |
| 4.2 Projects | Documents and Library are not grouped into projects yet |

## Before launch

- **Rate limiting trusts `X-Forwarded-For`.** `lib/server/lib/rateLimit.ts` uses the first entry, which a client can set, so the free-run limit (and the existing sign-in limits) can be bypassed. Use the address your host sets (for example `CF-Connecting-IP` on Cloudflare, or the right-most trusted hop behind Google's load balancer).
- **Scholar search quality.** During testing the configured Scholar index returned no DOI matches and a single index page for some topic searches, while public OpenAlex answered well. The tools fall back to OpenAlex; the editor's own paper search does not.
