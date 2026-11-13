# What was built: the research workspace

Build report, 12 November 2026. It follows [01-product-structure.md](01-product-structure.md) (phases 1 to 3), [02-services-and-apis.md](02-services-and-apis.md) and [03-pricing.md](03-pricing.md). The UI keeps the current look: the same colours, type and components, with a new navigation and new pages.

**State:** `tsc` is clean, 240 tests pass across 23 files (up from 168), and `next build` passes. Every new page answers 200 on a local production server. Nothing is committed yet. The pages have not been clicked through in a browser with real data; do that in the emulators before launch (`pnpm dev:all`).

## 1. The app now

New navigation, the same on every signed-in page and in the editor:

```
New research (button)
Home · Deep Research · Find Papers · My Library · Documents
Workspaces: Writing Studio · Thesis Suite · Proposal Studio · Systematic Review · Reviewer · Data Lab
More: All tools · History · Projects
Account · Help · credit meter (credits left, renewal date)
```

On phones: a menu sheet with the same items, and a tab bar (Home, Research, New research, Library, Docs). Sign-in now lands on **Home** instead of the editor.

## 2. Features and how they work

### Research

| Feature | Where | How it works | Credits |
| --- | --- | --- | --- |
| **Ask box** | Home, Deep Research, marketing home | Question, depth (Summary / Deep / Detailed), sources (All papers, Medical, Preprints, Web, My Library), filters, attachments (PDF, Word, Markdown, text; from the Library; Zotero/Mendeley import), role, headings on or off, High quality. Shows the cost before you start. | – |
| **Deep Research** | `/deep-research` | Plans 1, 3 or 6 searches (the model writes the extra angles). Searches every chosen source at once and merges duplicates. Finds open full texts through Unpaywall. Gives the model numbered sources and streams a cited answer. Drops any citation marker that points at no real source. Labels how each cited study bears on the question, then counts the consensus line ("2 of 4 studies that test the question support it…") from those labels. Results have three source tabs (Cited, All read, Web), follow-up questions, Open in editor with live citations, Save cited papers, and "Build on this" links into the other workspaces. | Summary 1 · Deep 5 · Detailed 20 (paid) · High quality ×3 (Pro) · follow-up 1 |
| **Find Papers** | `/papers` | One search across the chosen sources, with filters for year, study type, journal quality, citations, open access, peer-reviewed only and retractions, plus sorting. Each row shows the study type, journal tier, citations, preprint and retracted flags, open access, abstract, PDF, Save to Library and Citation map. | 0 |
| **Citation Map** | `/citation-map` | References and citing papers of a paper (OpenAlex, with Semantic Scholar as fallback), shown as a graph (years across) and a list. Snowballing: add papers to a set, expand the next round from the whole set, rank by how many set papers link to each one. Finds reviews and meta-analyses citing the set. Exports RIS and CSV. | 0 |
| **Landscape** | `/landscape` | For a topic, from OpenAlex: works per year, top topics, journals, authors, institutions, open-access share and most-cited works; two topics can be compared. | 0 |

**Filters, honestly:** study type comes from PubMed, Europe PMC and Semantic Scholar labels first, then from the title. Journal quality is a tier from the journal's h-index in OpenAlex (top ≥ 200, high ≥ 80, established ≥ 25). Retracted papers are left out by default.

### Write

| Feature | Where | How it works | Credits |
| --- | --- | --- | --- |
| **Writing Studio** | `/write` | Article with evidence, Literature review (thematic, chronological, methodological), Research paper (IMRaD), Section writer, Abstract, Improve document (word-level before/after per paragraph, pick each), Paraphrase (natural style, no detector claims). Grounded drafts search first, or reuse a research result's sources. Also: "Write in the editor" (co-writing with autocomplete and citations) and 7 templates that open a new editor document. | Section and abstract 3 · whole drafts 15 · Improve and Paraphrase 1 per 2,000 words |
| **Thesis Suite** | `/thesis` | Similar papers (Semantic Scholar recommendations), Research question (FINER, PICO, PICOT, SPIDER), Hypotheses, Thesis outline (with a word budget that adds up), Methodology builder, Theoretical framework, Research gaps, Timeline, Defence preparation (examiner questions by chapter), Autonomous proposal (refines the question, searches 3 times, writes the whole proposal). | Similar papers 0 · modules 3 · Autonomous proposal 15 |
| **Proposal Studio** | `/proposals` | Research proposal, Grant proposal (generic, NIH, NSF, ERC, Wellcome), Ethics application (IRB, UK REC, HREC), Data management plan. Whole document or one section. | Section 3 · whole 15 |
| **Slides** | `/slides` | A deck from a topic, a research result, an editor document or a file, including a thesis-defence preset. Shown on screen; the .pptx is made in the browser (pptxgenjs) with speaker notes and a references slide. Free plans see the first 5 slides. | 10 (free preview 3) |

### Review

| Feature | Where | How it works | Credits |
| --- | --- | --- | --- |
| **Reviewer** | `/reviewer` | Document type (thesis, proposal, manuscript), level (undergraduate, honours, master's, PhD), Standard or High quality (tables and score charts), and which checks to run. Long documents are split by headings and reviewed in parts. The model scores each criterion out of 10 in structured data, which is then averaged by length. Comments carry the quoted passage, section and fix; a quote not found in the text is dropped. The free preview covers the first 3,000 words: the full scorecard and the top 3 comments. | Standard 10, High quality 30, per 10,000 words · free preview 3 |
| **Claim check** | `/reviewer?module=claims` | Splits a paragraph into up to 10 claims, searches papers and PubMed for each, and labels each supported, partly supported, not supported or no evidence, citing the papers. Evidence strength comes from the study types. | 2 |
| **Citation check** | `/reviewer?module=citations` | Reads a reference list, checks each reference exists (Crossref by DOI, OpenAlex by title), and flags retractions, corrections and expressions of concern (Crossref with Retraction Watch data). Also flags preprints and wrong years or authors. Optionally checks that citing sentences match the abstract. | 0 · AI sentence check 2 |
| Editor checks | editor | The existing review, claim check, peer review and AI comment replies now use credits. | 2 each · peer review 10 · reply 1 |

### Systematic Review (`/systematic-review`)

One workspace with 8 review-type presets (systematic, scoping, rapid, meta-analysis, mapping, qualitative evidence synthesis, realist, living):

- **Protocol:** question, framework (PICO, PCC, SPIDER), eligibility criteria, and an AI draft in PROSPERO's sections (3 credits).
- **Search:** builders for PubMed, Europe PMC and OpenAlex with a live record count, logged for the report. Uploads RIS, BibTeX, CSV and PubMed .nbib, which is how Scopus and Web of Science exports come in. Duplicates are found by DOI, PMID and title.
- **Screening:** title and abstract, then full text. Include, exclude with a reason, or maybe, with keyboard shortcuts. AI suggestions with a reason (1 credit per 25 records). Project editors act as second reviewers, or AI can be the second reviewer. Conflicts are listed, with Cohen's kappa and percent agreement.
- **Extraction:** a table of included studies with 9 standard columns plus custom ones, and risk-of-bias fields. AI fills cells from abstracts with the quoted words (3 credits per 10 studies).
- **Report:** a PRISMA 2020 diagram from the live counts (SVG and PNG), CSV and RIS exports, and an AI methods draft (3 credits).
- Free plan: 1 review, 50 records.

### Data Lab (`/data-lab`)

Upload CSV or TSV, or paste a table. Everything below runs in the browser and costs nothing:

- **Statistics:** descriptive statistics and charts (histogram, bar, box, scatter with a fitted line).
- **Tests:** Welch and paired t-tests, Mann-Whitney U, one-way ANOVA, Pearson correlation, chi-square, linear regression.
- **Which test?** A rule-based chooser that gives the assumptions and an APA reporting template.
- **Power and sample size:** for t-tests and two proportions (checked against G*Power).

The **AI report** writes the results section from the computed numbers only (2 credits).

### Across everything

- **History** (`/history`): every job is saved as a task with its inputs and result, to reopen, star, search, delete or move into a project. Home shows the latest.
- **Projects** (`/projects`): a folder for a thesis or review, shared by email as can edit, can comment (supervisors) or can view. Members see the project's work; people without an account join at their next sign-in.
- **Role and profile:** asked once on Home and changeable per task (undergraduate to clinician). It sets the level and tone of every prompt.
- **All tools** (`/all-tools`): every workspace and tool grouped by hub, with search and each one's credit cost.

### Marketing site

- **Home page, rebuilt in the current style.** In order:
  1. Hero with a working Ask box.
  2. Three callouts.
  3. How it works, drawn from interface fragments.
  4. Who it is for: six audiences linked to existing pages until the `/for/` pages are built, plus a line naming the fields.
  5. Features.
  6. Tools.
  7. Pricing.
  8. An FAQ that explains credits.
- **Pricing page and dialog:** the four plans with credits, the credit cost table, top-ups and the Defence Pass.
- `docs/messaging.md` rewritten for the new direction.

## 3. Plans and limits, enforced

The server enforces everything in `lib/server/lib/plans.ts`. The browser only displays it.

| | Free | Plus $12 / $96 yr | Pro $29 / $228 yr | Team |
| --- | --- | --- | --- | --- |
| Credits a month | 30 | 500 | 1,500 | 2,000 a seat |
| Detailed reports | – | ✓ | ✓ | ✓ |
| High quality (×3) | – | – | ✓ | ✓ |
| Autocomplete | 10 a day | 5,000 a month | 20,000 a month | unlimited |
| Library PDFs | 25 (10 MB) | unlimited (50 MB) | unlimited (100 MB) | unlimited |
| Projects / people on each | 1 / 1 | 10 / 3 | unlimited / 10 | unlimited |
| Zotero, Mendeley, LaTeX, PowerPoint | – | ✓ | ✓ | ✓ |

- **How credits are charged:** every AI job reserves its credits in one transaction before it runs, and gives them back if it fails or returns nothing. The month's allowance is used first, then top-up credits. Light work costs nothing: search, filters, citations, the Library, the editor, exports, statistics, PRISMA.
- **Top-ups:** 500 credits for $7 or 2,000 for $24, paid plans only. They are kept 12 months, oldest spent first, and refunds take back the unused part.
- **Defence Pass:** $49 once, 90 days of Pro. A second pass extends the first. On an account that already subscribes, the pass becomes 4,500 extra credits instead.
- **Free-plan safety:** the client address for signed-out limits is now read from the trusted end of `X-Forwarded-For` (or `CF-Connecting-IP`), so a forged header no longer resets the 3 free runs a day.

## 4. Outside services: links and costs

Prices were checked on 12 November 2026, mostly from third-party summaries. Confirm each on its own page before you budget.

| Service | Used for | Link | Cost | Setting |
| --- | --- | --- | --- | --- |
| OpenAlex | All papers, filters, journal tiers, Citation Map, Landscape | [openalex.org](https://openalex.org) · [pricing](https://help.openalex.org/access/pricing/) | Free key with about $1 of use a day (a search is about $0.001, a single lookup is free), then pay as you go. An API key is now required for normal limits. | `OPENALEX_API_KEY` (new), `OPENALEX_EMAIL` |
| CitedEvidence Scholar | The default paper index (existing), falls back to OpenAlex | [scholar.citedevidence.com](https://scholar.citedevidence.com) | Free key, 1,000 credits a day | `SCHOLAR_API_KEY` |
| Semantic Scholar | All papers, Similar papers, Citation Map fallback | [semanticscholar.org/product/api](https://www.semanticscholar.org/product/api) | Free. Without a key, all users share one limit (it answered 429 in testing); a free key gives 1 request a second. | `SEMANTIC_SCHOLAR_API_KEY` |
| PubMed (NCBI E-utilities) | Medical source, systematic-review searches | [ncbi.nlm.nih.gov/books/NBK25497](https://www.ncbi.nlm.nih.gov/books/NBK25497/) | Free. 3 requests a second, 10 with a free key. | `NCBI_API_KEY` |
| Europe PMC | Medical and preprints (bioRxiv, medRxiv) | [europepmc.org/RestfulWebService](https://europepmc.org/RestfulWebService) | Free | – |
| arXiv | Preprints | [info.arxiv.org/help/api](https://info.arxiv.org/help/api/) | Free; asks for one request every 3 seconds (answered 429 in testing when hit quickly) | – |
| CORE (added 13 Nov) | All papers: open-access papers and full texts from repositories | [core.ac.uk/services/api](https://core.ac.uk/services/api) | Free key; refuses requests without one (429), so it is skipped until set | `CORE_API_KEY` |
| ClinicalTrials.gov (added 13 Nov) | Clinical trials source | [clinicaltrials.gov/data-api/api](https://clinicaltrials.gov/data-api/api) | Free, no key | – |
| DataCite (added 13 Nov) | Datasets source | [support.datacite.org/docs/api](https://support.datacite.org/docs/api) | Free, no key | – |
| OpenCitations (added 13 Nov) | Citation Map: links when OpenAlex has none, before Semantic Scholar | [opencitations.net/accesstoken](https://opencitations.net/accesstoken) | Free; works without a token, a free token is asked for | `OPENCITATIONS_ACCESS_TOKEN` |
| Crossref | Citation check, retraction and correction notices (with Retraction Watch data) | [api.crossref.org](https://api.crossref.org) | Free; a contact email gets the faster "polite" pool | `CONTACT_EMAIL` |
| Unpaywall | Open full-text links in Deep Research | [unpaywall.org/products/api](https://unpaywall.org/products/api) | Free, 100,000 calls a day, email required | `CONTACT_EMAIL` |
| Web search: pick one | The Web source (off until set) | [Tavily](https://tavily.com/pricing) · [Brave](https://brave.com/search/api/) · [Exa](https://exa.ai/pricing) | Tavily about $0.008 a search (1,000 free a month); Brave about $5 per 1,000 ($5 free credit a month); Exa about $7 per 1,000 ($10 free a month) | `WEB_SEARCH_PROVIDER`, `WEB_SEARCH_API_KEY` |
| AI model (existing slot) | Every AI job | your provider (OpenRouter/DeepSeek by default) | Per token. Estimates in [03-pricing.md](03-pricing.md) §6; Deep and Detailed use the review model. | `LLM_*` |
| Dodo Payments (existing) | Plans, top-ups, Defence Pass | [dodopayments.com/pricing](https://dodopayments.com/pricing) | 4% + $0.40 a card payment, +1.5% outside the US | `DODO_PAYMENTS_*` |
| pptxgenjs | PowerPoint download | [github.com/gitbrent/PptxGenJS](https://github.com/gitbrent/PptxGenJS) | Free (MIT), runs in the browser | – |
| Converter (existing) | Text from attached PDFs and Word files | `services/convert` | Your Cloud Run | `CONVERT_URL` |

**Left out, as you asked:**

- **Google Scholar:** it has no API and scraping it breaks its terms.
- **Scopus and Web of Science:** their APIs need an institutional licence. For now, users upload their Scopus or Web of Science export (RIS or CSV) into a systematic review.

## 5. Before launch: your checklist

1. **Keys:** add `OPENALEX_API_KEY`, `SEMANTIC_SCHOLAR_API_KEY`, `NCBI_API_KEY` and `CONTACT_EMAIL`, and optionally `WEB_SEARCH_PROVIDER` with `WEB_SEARCH_API_KEY`. They are listed in `.env.example` and commented in `apphosting.yaml`.
2. **Firestore indexes:** run `pnpm run deploy:firebase`. History needs two new indexes, for `tasks` by user and by project, already in `firestore.indexes.json`.
3. **Dodo dashboard:** add the `payment.succeeded` and `refund.succeeded` webhook events. Then buy a top-up and a Defence Pass in test mode; the checkout code has only run against a fake client.
4. **Proxy hops:** set `TRUSTED_PROXY_HOPS` to match your hosting (1 for Cloud Run behind Google's front end, 2 behind an extra load balancer).
5. **Timeout:** `timeoutSeconds` is now 900 in `apphosting.yaml`, for long thesis reviews and Detailed reports.
6. **Click-through:** go through every workspace in the emulators with real keys. The Scholar index timed out in testing and searches fell back to OpenAlex after about 8 seconds; consider `PAPERS_PROVIDER=openalex` until that is fixed.
7. **Tell users:** per-feature limits became credits (03-pricing.md §8).

## 6. Not done yet

| Item | Note |
| --- | --- |
| Landing pages and blog posts | Planned in [04-content-plan.md](04-content-plan.md), to be built separately |
| Long reviews and studio drafts as background jobs | They run within the request (now allowed 15 minutes); closing the tab stops them |
| Field packs, patents, alerts, qualitative coding, institution sign-on | Phase 4 |
| Data Lab | Excel files must be saved as CSV first; no Spearman, Kruskal-Wallis, Wilcoxon or logistic regression; Mann-Whitney uses the normal approximation |
| Systematic Review | No meta-analysis or forest plot yet; "other sources" are counted with databases in the PRISMA diagram |
| Citation style in the studios | Applies when the result opens in the editor, not in the on-screen draft |
| Top-up expiry | Corrected whenever credits are read, not on a schedule |
| The client credit table | `components/billing/creditTable.ts` repeats the server's costs; a test fails if they drift apart |
