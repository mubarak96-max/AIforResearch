# AI for Research content plan: the research workspace

56 new landing pages (L11 to L66) and 40 new blog posts (61 to 100) for the new direction: an AI research workspace, not a writing editor. Nothing here is built yet. Pages and posts are written after the UI is approved and each feature works.

- **Follows on from** [content-plan-writers.md](../content-plan-writers.md) (posts 1 to 30) and [content-plan-research.md](../content-plan-research.md) (L1 to L10, posts 31 to 60). Nothing in those plans is repeated here. Section 1 lists what changes in them.
- **Product source:** the owner's brief, `yyy.md` and [ui/CONTENT.md](ui/CONTENT.md) (names of workspaces, plans and credits).
- **Length:** landing pages 900 to 1,500 words plus product visuals. Blog posts 1,400 to 2,500 words. Alternatives pages 1,200 to 1,800 words with a dated table.

## 0. Things to know about the keyword data

1. **Two sources, marked in every table.**
   - **U** = Ubersuggest, United States (location 2840), pulled 11 November 2026. Shown as `volume · SD n`. SD is SEO difficulty, 0 to 100 (under 30 is easy, 30 to 45 is moderate, over 45 is hard).
   - **KP** = Google Keyword Planner figures already in content-plan-research.md (1 Oct 2025 to 30 Sep 2026). Volume only; its competition column is paid competition, not SEO difficulty.
2. **Most primary keywords are "not checked".** The Ubersuggest plan on this account allows 3 keyword reports a day and its monthly difficulty refreshes were already used up. All 3 reports were spent on 11 November 2026 on nine seed terms. About 45 keywords in this plan carry real figures (appendix A). Every other keyword says **not checked**. No volume in this file is an estimate.
3. **Check before writing.** Appendix B lists the seed terms to pull next, three a day. Check the primary keyword of a page before its brief is written, and change the primary keyword if the figure is weak.
4. **Best openings found so far (U):**

| Keyword | Volume | SD | Goes to |
| --- | --- | --- | --- |
| consensus ai | 18,100 | 29 | L43, post 65 |
| gemini deep research | 8,100 | 28 | post 63 |
| connected papers | 6,600 | 19 | L47 |
| research proposal example | 5,400 | 15 | L56, post 76 |
| difference between meta analysis and systematic review | 3,600 | 20 | post 88 |
| statistical test t test | 2,900 | 5 | post 94 |
| what is a systematic review | 2,400 | 25 | post 87 |
| prisma flow diagram | 1,900 | 22 | L30, post 90 |
| thesis defense | 1,900 | 27 | L20, post 72 |
| how write research proposal | 1,600 | 7 | post 75 |
| research proposal templates | 1,600 | 14 | L56 |
| research proposal apa style | 1,000 | 6 | post 77 |

5. **Hard terms, used as secondary only:** deep research (6,600 · SD 62), deep research ai (720 · SD 55), chat with pdf (480 · SD 54), statistical test (2,900 · SD 49), statistical test chi square (1,600 · SD 55).
6. **Skip:** "duck deep research" and its variants (a game), API and developer terms ("deep research api", "langchain deep research"), login and logo terms for competitors.

### Product-claim rules

These apply to every page and post in this plan.

1. **Nothing is listed before it works.** A landing page goes live in the phase its feature ships (section 1). A blog post may publish earlier only if it teaches a method and links to a feature that already works.
2. **Text Humanizer is a natural-style rewrite.** No "AI detector", no "bypass detection", no "undetectable". The AI writing checker shows stock phrases and patterns; it never gives an "AI probability".
3. **Claim Check is not a fact checker.** It shows whether cited studies support a claim. Say "check your claims", never "fact-check".
4. **Scopus, Web of Science, JSTOR, ACM, Inspec and Google Scholar** appear only as "bring your own access" (your export file or your institution's key), or not at all, until a licensed source exists. Do not write "search Scopus" or "search Google Scholar" as a product feature.
5. **Competitor claims are dated and sourced.** Every fact about another product has a link to that product's own page and the month it was checked. Re-check every quarter. Write what the other product is good at first.
6. **No invented proof.** No customer names, quotes, ratings or user counts. Facts that may be stated: 250M+ scholarly works, 10,000+ citation styles, Word, PDF and LaTeX in and out, Zotero and Mendeley import.
7. **Medical, legal and patent pages** say that results need a professional's review. No treatment advice, no legal opinion on freedom to operate.

---

## 1. What changes

### Positioning

| | Before | After |
| --- | --- | --- |
| What it is | The AI writing editor that cites real sources | An AI research workspace: ask, read the evidence, then review, analyse, write and present |
| Core promise | Write faster, with a real source for every claim | Research with real sources, from first question to thesis defense |
| Home page target | AI writing editor, citation generator (messaging.md) | ai for research (KP 5,400), ai research assistant, with the Ask box as the hero |
| First thing a visitor does | Opens the editor | Asks a question |
| Audience on the home page | Academic writers; other writers on their own pages | Students, researchers, academic staff, clinicians, analysts, in every field |

`docs/messaging.md` needs a rewrite to match (promise, pillars, SEO targets, the "Not yet" list) before any page in this plan is written.

### Build phases

| Phase | What ships | Pages that may go live |
| --- | --- | --- |
| **1. Research core** | New Home with the Ask box; Deep Research (Summary, Deep, Detailed; sources: all papers, PubMed, web, Library); Find Papers with filters (year, study type, journal quality, citations, open access); Library; History; Projects and sharing; roles; credits | 9 landing pages, 9 posts |
| **2. Thesis and review** | Reviewer (thesis, proposal, manuscript; level; standard or high quality); Thesis Suite; Proposal Studio; Writing Studio modes; Thesis to Manuscript; Citation Map; Claim Check; Make slides; Templates | 24 landing pages, 17 posts |
| **3. Evidence and data** | Systematic Review workspace (PRISMA first); Data Lab; statistical test chooser; methodology advisor; Landscape | 14 landing pages, 10 posts |
| **4. Fields and teams** | Field packs; the agents-and-templates catalogue; Team plan | 9 landing pages, 4 posts |

### URL scheme

| Pattern | What lives there | Example |
| --- | --- | --- |
| `/for/<audience>` | One page per audience, linked from "Who it is for" on the home page | `/for/phd` |
| `/fields/<field>` | One page per field pack | `/fields/medicine-and-health` |
| `/features/<slug>` | Workspaces and features that need an account or a project | `/features/systematic-review` |
| `/tools/<slug>` | Tools that run on their own page, free to try without an account | `/tools/prisma-flow-diagram` |
| `/alternatives/<name>` | Comparison with one named product | `/alternatives/consensus` |
| `/templates/<slug>` | A template to download or fill in | `/templates/research-proposal` |
| `/blog/<slug>` | Posts | `/blog/thesis-defense-guide` |

One keyword, one page. When a feature page and a free tool cover the same job, the feature page takes the head keyword and the tool page takes the "generator", "calculator" or "free" form.

### Existing pages and posts that change

| Item | Change | Phase |
| --- | --- | --- |
| L1 `/` | New hero (Ask box), sections in the order of CONTENT.md. H1 keeps "AI for research". FAQ gains "What is a credit?" | 1 |
| L2 `/ai-research-tools` | Becomes the "All tools" catalogue, grouped by workspace. Keeps its keyword | 1 |
| L4 `/features/paper-search` | Add the filters and the four sources. Name in the product: Find Papers | 1 |
| `/tools/deep-research` | Redirect to L17 `/features/deep-research`, which carries a free Summary run on the page | 1 |
| `/features/research-library`, `/features/chat-with-pdf`, `/features/reference-manager-import` | Rewrite around the Library as the place every workspace reads from | 1 |
| `/pricing` | Plans with credits (Free, Plus, Pro, Team, Defense Pass). Keep "free citation generator" on L7 | 1 |
| L5 `/features/literature-review` | Link to the Systematic Review workspace when it ships; remove the "can't do screening" limit then | 2, then 3 |
| L8 `/features/ai-peer-review` | Becomes the Reviewer page: thesis, proposal, manuscript; four levels; standard or high quality. Keeps "ai reviewer" (KP 3,600) and "thesis reviewer" (KP 590) | 2 |
| L9 `/thesis-ai` | Becomes the Thesis Suite page: proposal, similar papers, outline, methodology, defense prep | 2 |
| `/features/ai-writing-editor`, `/features/ai-writing-assistant` | Merge into one Writing Studio page with two modes: research in chat, or write in the editor with suggestions and citations. Redirect the other slug | 2 |
| `/features/citation-checker` | Becomes Claim Check and citation check (claim rule 3) | 2 |
| `/tools/thesis-chapter-planner` | Keeps its slug; title becomes "Thesis outline generator and chapter planner" | 2 |
| `/tools/humanizer` | Named Text Humanizer in the product; copy follows claim rule 2 | 2 |
| `/tools/data-analysis` | Add "statistical test calculator" (2,400 · SD 30 U) and "statistical test t test" (2,900 · SD 5 U) as keywords. Link to Data Lab when it ships | 1, then 3 |
| L10 `/alternatives/elicit` | The table gains the new rows (Deep Research, Reviewer, Systematic Review) as each ships | 1 to 3 |
| content-plan-research.md, "Do not claim" | Citation maps may be claimed from Phase 2; screening and PRISMA from Phase 3. "Undetectable" writing: never | 2, 3 |
| Posts 1 to 23 (journalism, AP style, screenwriting) | Stay live and in the sitemap, as they are. They leave the main navigation and sit in the blog under "Writing with sources". No new posts in these clusters | 1 |
| Posts 34, 40, 46, 49, 50, 53, 54 | Add links to the new pages when each ships (34 to L47 and L48; 40 to L22; 46 to L20; 49 to L27; 50 to L8; 53 to L24; 54 to L15) | 2, 3 |

---

## 2. Landing pages

Every page follows the shared template in content-plan-research.md, with two changes: the hero carries the working control for that page (the Ask box, the tool's form, the template's first field) in place of a picture, and each page states what the free plan includes and what the action costs in credits.

Intent: **Com** = comparing options, **Trans** = ready to use a tool, **Info** = learning.

### 2.1 Audience pages

Each page shows the same product through one person's work: three jobs they do here, the workspaces they need, the plan that fits, and links to that audience's posts.

| # | URL | Primary keyword | Secondary keywords | Intent | Phase | The page must show |
| --- | --- | --- | --- | --- | --- | --- |
| L11 | `/for/undergraduates` | ai for college students (not checked) | best ai tools for students (KP 880), ai for essays, find sources (KP 1,300) | Com | 1 | Ask a question in Summary mode, find sources for an essay, cite in the course's style. What the free plan covers. A plain note on course rules for AI use, with the authorship report |
| L12 | `/for/masters` | ai for masters thesis (not checked) | thesis ai (KP 1,300), dissertation helper (KP 1,300), thesis reviewer (KP 590) | Com | 2 | Thesis outline, literature review chapter, Reviewer at Master's level, sharing a project with a supervisor. Plus plan and the Defense Pass |
| L13 | `/for/phd` | ai tools for phd students (not checked) | thesis defense phd (480 · SD 26 U), systematic review ai (KP 70), ai for academic research (KP 320) | Com | 2; update in 3 | Deep and Detailed reports, Citation Map, Reviewer at PhD level, defense prep, thesis to manuscript. Systematic Review and Data Lab added in Phase 3. Pro plan |
| L14 | `/for/academics` | ai for professors (not checked) | ai in academia (KP 210), ai for academic research (KP 320), ai grant writing (KP 210) | Com | 2 | Reviewing students' drafts with the Reviewer, grant proposals, manuscripts and journal formatting, shared projects. Team plan when it ships |
| L15 | `/for/medicine` | ai for medical research (not checked) | ai in medical research (KP 260), pubmed ai (KP 590), clinical research ai | Com | 1 | The Medical (PubMed) source, filters by study type (RCT, meta-analysis, cohort), "exclude retracted", answers with a consensus line. Claim rule 7 on the page |
| L16 | `/for/industry` | ai market research tool (not checked) | ai for scientific research (KP 320), ai research platform (KP 170), competitive research ai | Com | 1; update in 3 | Deep Research across papers and the web, reports with tables, slide decks from a report, project sharing. Landscape added in Phase 3 |

### 2.2 Workspace and feature pages

| # | URL | Primary keyword | Secondary keywords | Intent | Phase | The page must show |
| --- | --- | --- | --- | --- | --- | --- |
| L17 | `/features/deep-research` | deep research ai (720 · SD 55 U) | deep research (6,600 · SD 62 U), ai deep research, best ai for deep research, deep research tools (not checked) | Com | 1 | A free Summary run on the page. The three modes side by side with what each reads, returns and costs (1, 5, 20 credits). The four sources. A real report with its source list and filters. Limits: abstracts only where no full text is open |
| L18 | `/features/projects` | research project management tool (not checked) | share research with supervisor, research collaboration tool | Com | 1 | One project holding questions, papers, documents and reviews. Sharing with a supervisor or co-authors, with view, comment and edit rights. History of every task |
| L19 | `/features/proposal-studio` | research proposal (2,900 · SD 27 U) | how to do a research proposal (1,300 · SD 48 U), research proposal ai, grant proposal ai (not checked) | Trans | 2 | From a topic to a full proposal with real citations: aims, significance, method, timeline, ethics. Research, grant and ethics/IRB forms. Links to the free generators and to L56 |
| L20 | `/features/thesis-defense-prep` | thesis defense (1,900 · SD 27 U) | thesis defense phd (480 · SD 26 U), thesis defense questions, thesis defense presentation (not checked) | Trans | 2 | Likely examiner questions drawn from the user's own thesis, answer notes with the cited pages, a slide deck from the chapters. The Defense Pass ($49, 90 days) |
| L21 | `/features/methodology-builder` | research methodology (not checked) | research design, methodology chapter, qualitative vs quantitative | Trans | 2 | Pick a design from the research question, with the reasons, sampling, instruments and limits, each tied to cited method papers. Output opens in the editor |
| L22 | `/features/citation-map` | citation map (not checked) | citation graph, citation snowballing, find similar papers, cited articles (KP 4,400) | Trans | 2 | A graph built from one seed paper. Backward and forward snowballing as a list that can be saved to the Library. Review-citation search: reviews that cite the seed. Other products are named only on the alternatives pages |
| L23 | `/features/research-slides` | research presentation maker (not checked) | thesis defense presentation, slides from research paper, academic presentation ai | Trans | 2 | A deck built from a report, a paper or a chapter, with a source on every slide. Export to PowerPoint and PDF. 10 credits |
| L24 | `/features/systematic-review` | systematic review software (not checked) | systematic review (4,400 · SD 38 U), systematic review ai (KP 70), systematic review literature (1,000 · SD 59 U) | Com | 3 | The whole review in order: protocol, search (PubMed built in; Scopus and others from the user's export), duplicate removal, two-reviewer screening with agreement statistics, extraction, risk of bias, the PRISMA flow drawn from stored decisions. Who decides: the reviewers, not the AI |
| L25 | `/features/data-lab` | ai data analysis (not checked) | statistical test (2,900 · SD 49 U), data analysis for research, charts from csv | Trans | 3 | Upload data, get the test chosen with its assumptions checked, tables, charts and a written report. Numbers are calculated, not written by the model. Privacy of uploaded data |
| L26 | `/features/research-landscape` | research landscape analysis (not checked) | bibliometric analysis tool, research trends, literature mapping | Com | 3 | A field at a glance: output by year, main themes, most-cited work, active authors and venues, with the source records behind each figure |

### 2.3 New free-tool pages

Each runs on its own page without an account (AI tools: 3 runs a day per address, as today).

| # | URL | Primary keyword | Secondary keywords | Intent | Phase | The page must show |
| --- | --- | --- | --- | --- | --- | --- |
| L27 | `/tools/research-question-generator` | research question generator (not checked) | PICO question, FINER criteria, research question examples | Trans | 2 | Topic in, three to five questions out, each scored against FINER, with a PICO or PCC form where it fits |
| L28 | `/tools/hypothesis-generator` | hypothesis generator (not checked) | statistical test hypothesis (1,900 · SD 48 U), null and alternative hypothesis | Trans | 2 | Hypotheses from a question, each with its null form, the variables and the papers behind it |
| L29 | `/tools/similar-papers-finder` | find similar papers (not checked) | similar paper finder, related papers, papers like this one | Trans | 2 | Paste a DOI or title, get related papers with the reason each is related. Save to the Library. Link to L22 |
| L30 | `/tools/prisma-flow-diagram` | prisma flow diagram (1,900 · SD 22 U) | prisma flow diagram generator, prisma flow diagram template, create prisma flow diagram (not checked) | Trans | 3 | Enter the counts, see the PRISMA 2020 diagram, download as SVG, PNG or Word. A check that the counts add up. It needs no account and no AI, so it may ship before the rest of Phase 3 |
| L31 | `/tools/statistical-test-chooser` | which statistical test to use (not checked) | statistical test flow chart (260 · SD 25 U), statistical test types (720 · SD 43 U), statistical test (2,900 · SD 49 U) | Trans | 3 | Four questions (outcome type, groups, paired or not, distribution) lead to a test, its assumptions and how to report it. Link to the calculator |
| L32 | `/tools/sample-size-calculator` | sample size calculator (not checked) | power of statistical test (390 · SD 41 U), power analysis calculator | Trans | 3 | Sample size for means, proportions and correlations, with the formula and inputs shown |
| L33 | `/tools/inter-rater-agreement-calculator` | cohen's kappa calculator (not checked) | fleiss kappa, krippendorff alpha, percent agreement | Trans | 3 | Paste two or more raters' decisions, get Cohen's kappa, Fleiss' kappa, Krippendorff's alpha and percent agreement with a plain reading |

### 2.4 Field pages

All Phase 4, when the field pack works. Each page shows the pack's sources and tools, one worked question from the field, and the citation styles and reporting standards the field uses. Until then the field is served by its audience page and posts.

| # | URL | Primary keyword | Secondary keywords | Intent | The page must show |
| --- | --- | --- | --- | --- | --- |
| L34 | `/fields/medicine-and-health` | ai for clinical research (not checked) | clinical trial search, medical literature review ai | Com | PubMed and clinical-trial search, PICOT question builder, clinical report structures (CARE, SOAP), reporting checklists. Claim rule 7. Different from L15, which is the audience page for Phase 1 features |
| L35 | `/fields/life-sciences` | ai for biology research (not checked) | bioinformatics ai, gene and protein lookup | Com | Gene, protein, pathway and sequence lookups from public databases; preprints from bioRxiv; what is analysed on the user's own data |
| L36 | `/fields/chemistry-and-materials` | ai for chemistry research (not checked) | chemical compound search, materials science ai | Com | Compound and bioactivity lookups, materials data, ACS style |
| L37 | `/fields/engineering-and-computing` | ai for engineering research (not checked) | ai for computer science research, arxiv search | Com | arXiv and DBLP search, IEEE style, LaTeX in and out. ACM and Inspec only as bring your own access (claim rule 4) |
| L38 | `/fields/environmental-studies` | ai for environmental research (not checked) | geospatial analysis, public environmental data | Com | Public data sources, maps from the user's spatial data, reports with charts |
| L39 | `/fields/social-sciences` | ai for social science research (not checked) | ai for qualitative research, survey analysis | Com | Qualitative analysis guidance (themes, coding), survey statistics, public demographic and economic data, APA |
| L40 | `/fields/humanities` | ai for humanities research (not checked) | ai for history research, chicago and mla citations | Com | Long-form writing with Chicago and MLA, books and chapters as sources, work with the user's own PDFs. JSTOR only as bring your own access |
| L41 | `/fields/business-and-economics` | ai for economics research (not checked) | market research report ai, case study analysis | Com | Economic time series from public sources, market reports with frameworks, case-study analysis |
| L42 | `/fields/law-and-patents` | patent search tool (not checked) | prior art search, patent citation search | Com | Patent search across public offices, families, citations and legal status. Claim rule 7: no legal opinion |

### 2.5 Alternatives pages

Same template as L10: the other product in one fair paragraph, where AI for Research differs, a dated table built only from each product's own pages, which to pick for which job, how to use them together. Brand keywords are high volume and mostly navigational, so the page targets "alternative", "vs" and "review" forms and expects a small share.

| # | URL | Primary keyword | Secondary keywords | Intent | Phase | The page must show |
| --- | --- | --- | --- | --- | --- | --- |
| L43 | `/alternatives/consensus` | consensus ai alternative (not checked) | consensus ai (18,100 · SD 29 U), consensus ai for research (390 · SD 31 U), consensus ai search engine (210 · SD 36 U) | Com | 1 | Answers with a consensus line in both; what happens after the answer here (review, write, slides) |
| L44 | `/alternatives/scispace` | scispace alternative (not checked) | scispace ai, scispace vs elicit | Com | 1 | Reading and chat with PDF in both; projects, Reviewer and credits here |
| L45 | `/alternatives/perplexity` | perplexity for research (not checked) | perplexity deep research (1,000 · SD 48 U), perplexity academic | Com | 1 | Web answers there; scholarly sources, filters by study type and a Library here |
| L46 | `/alternatives/chatgpt-deep-research` | chatgpt deep research (4,400 · SD 39 U) | openai deep research (1,300 · SD 47 U), gemini deep research (8,100 · SD 28 U), claude deep research (880 · SD 41 U) | Com | 1 | One page for the general assistants' deep research modes: what they read, how they cite, where a scholarly index and source filters change the result |
| L47 | `/alternatives/connected-papers` | connected papers alternative (not checked) | connected papers (6,600 · SD 19 U), research rabbit vs connected papers | Com | 2 | Graph from a seed paper in both; snowballing lists, the Library and writing here |
| L48 | `/alternatives/researchrabbit` | research rabbit alternative (not checked) | research rabbit app (KP 170), rabbit research (KP 590) | Com | 2 | Links to existing post 34, which keeps the list of alternatives; this page is the one-to-one comparison |
| L49 | `/alternatives/litmaps` | litmaps alternative (not checked) | litmaps vs connected papers | Com | 2 | Maps and alerts there; map, review and draft in one project here |
| L50 | `/alternatives/scite` | scite ai alternative (not checked) | scite ai, citation context | Com | 2 | Citation statements there; Claim Check on the user's own draft here |
| L51 | `/alternatives/paperpal` | paperpal alternative (not checked) | paperpal ai | Com | 2 | Language editing there; research, review and writing in one place here |
| L52 | `/alternatives/jenni` | jenni ai alternative (not checked) | jenni ai | Com | 2 | Autocomplete with citations in both; Deep Research, Reviewer and Thesis Suite here |
| L53 | `/alternatives/covidence` | covidence alternative (not checked) | covidence systematic review | Com | 3 | Screening and extraction in both; search, writing and the PRISMA flow in the same project here |
| L54 | `/alternatives/rayyan` | rayyan alternative (not checked) | rayyan systematic review | Com | 3 | Screening in both; what happens before and after screening here |

### 2.6 Template pages

Each page gives the template itself (shown on the page, with Word and PDF download), a filled example marked as an example, and one button that opens it in the editor. A template is not a feature claim, but the "fill it with AI" button is, so pages go live with the Templates feature.

| # | URL | Primary keyword | Secondary keywords | Intent | Phase | The page must show |
| --- | --- | --- | --- | --- | --- | --- |
| L55 | `/templates` | research templates (not checked) | academic templates, thesis templates | Trans | 2 | The catalogue, grouped: proposals, thesis and defense, ethics, review forms, emails |
| L56 | `/templates/research-proposal` | research proposal templates (1,600 · SD 14 U) | research proposal example (5,400 · SD 15 U), example of a research proposal (4,400 · SD 31 U), sample format for research proposal (1,300 · SD 42 U), research proposal apa (880 · SD 28 U) | Trans | 2 | The skeleton (aims, significance, approach, timeline, budget), one worked example, APA formatting notes. Link to L19 |
| L57 | `/templates/thesis-defense-presentation` | thesis defense presentation template (not checked) | powerpoint template for thesis defense, thesis defense slides | Trans | 2 | A 12-slide structure with what goes on each slide. Link to L20 and L23 |
| L58 | `/templates/ethics-approval-statement` | ethics approval statement (not checked) | irb checklist, irb application template | Trans | 2 | Statement wordings by study type, an IRB submission checklist (risk, consent, data protection) |
| L59 | `/templates/research-poster` | research poster template (not checked) | academic poster template, conference poster | Trans | 2 | Poster layouts in PowerPoint and LaTeX with the sections a conference expects |
| L60 | `/templates/research-emails` | email to professor for research (not checked) | data request email, coauthor invitation email | Trans | 2 | Three emails ready to adapt: invite a co-author, request data from an author, set up a meeting |
| L61 | `/templates/research-progress-tracker` | research progress tracker (not checked) | thesis timeline template, research timeline | Trans | 2 | A weekly and monthly journal with blockers, wins and next actions; a thesis timeline with milestones |
| L62 | `/templates/systematic-review-protocol` | systematic review protocol template (not checked) | prospero systematic review, prisma guidelines systematic review | Trans | 3 | A PROSPERO-shaped protocol with each field explained |
| L63 | `/templates/screening-forms` | screening form systematic review (not checked) | title and abstract screening, full text screening form | Trans | 3 | Title and abstract form and full-text form, with versions for systematic, scoping and qualitative reviews |
| L64 | `/templates/screening-decision-log` | screening decision log (not checked) | exclusion reasons systematic review | Trans | 3 | The log, with a taxonomy of exclusion reasons and rules for settling disagreements |
| L65 | `/templates/inclusion-exclusion-criteria` | inclusion and exclusion criteria (not checked) | eligibility criteria systematic review, pico systematic review | Trans | 3 | A criteria builder table by PICO or PCC, with examples |
| L66 | `/templates/reporting-checklists` | prisma checklist (not checked) | sampl guidelines, qualitative research reporting checklist | Trans | 3 | PRISMA, SAMPL and qualitative reporting checklists, each as a fillable list |

---

## 3. Blog posts 61 to 100

**Phase** is when the post's landing page is live. A post that teaches a method may publish earlier if it links to a feature that already works (noted as "early" in the outlines).

### Index

| # | Slug | Title | Primary keyword | Cluster | Links to | Phase |
| --- | --- | --- | --- | --- | --- | --- |
| 61 | what-is-deep-research-ai | What deep research AI is, and when you can trust it | deep research (6,600 · SD 62 U); what is deep research (not checked) | Deep research | L17 | 1 |
| 62 | chatgpt-deep-research-for-academic-work | ChatGPT deep research for academic work: what it reads and what it misses | chatgpt deep research (4,400 · SD 39 U) | Deep research | L46, L17 | 1 |
| 63 | gemini-deep-research-for-literature-search | Gemini deep research for a literature search: a test on one question | gemini deep research (8,100 · SD 28 U) | Deep research | L46, L17 | 1 |
| 64 | best-ai-for-deep-research | The best AI for deep research on scholarly questions | best ai for deep research (not checked) | Deep research | L17, L45, L46 | 1 |
| 65 | consensus-ai-review | Consensus AI: what it does well and where it stops | consensus ai (18,100 · SD 29 U) | Competitors | L43 | 1 |
| 66 | scispace-review | SciSpace: an honest look for students and researchers | scispace (not checked) | Competitors | L44 | 1 |
| 67 | levels-of-evidence-and-study-types | Study types and levels of evidence: which papers to trust first | levels of evidence (not checked) | Sources | L4, L15 | 1 |
| 68 | how-to-search-pubmed | How to search PubMed: MeSH terms, filters and saved searches | how to search pubmed (not checked) | Sources | L15, L4 | 1 |
| 69 | how-to-organize-research-papers | How to organise research papers so you can find them again | how to organize research papers (not checked) | Library | `/features/research-library`, L18 | 1 |
| 70 | how-to-write-a-research-question | How to write a research question: FINER and PICO with examples | how to write a research question (not checked) | Planning | L27 | 2 |
| 71 | how-to-write-a-hypothesis | How to write a hypothesis, with the null form | statistical test of hypothesis (6,600 · SD 27 U); how to write a hypothesis (not checked) | Planning | L28, L31 | 2 |
| 72 | thesis-defense-guide | Thesis defense: what happens and how to prepare | thesis defense (1,900 · SD 27 U) | Thesis | L20, L13 | 2 |
| 73 | thesis-defense-questions | Thesis defense questions examiners ask, and how to answer them | thesis defense questions (not checked) | Thesis | L20 | 2 |
| 74 | thesis-defense-presentation | How to build a thesis defense presentation, slide by slide | thesis defense presentation (not checked) | Thesis | L23, L57 | 2 |
| 75 | how-to-write-a-research-proposal | How to write a research proposal, section by section | how write research proposal (1,600 · SD 7 U); research proposal (2,900 · SD 27 U) | Proposal | L19, L56 | 2 |
| 76 | research-proposal-example | A research proposal example, with notes on every section | research proposal example (5,400 · SD 15 U) | Proposal | L56, L19 | 2 |
| 77 | research-proposal-apa-format | Research proposal in APA style: title page, headings and references | research proposal apa style (1,000 · SD 6 U) | Proposal | L56, L7 | 2 |
| 78 | how-to-write-a-methodology-chapter | How to write a methodology chapter | how to write a methodology (not checked) | Thesis | L21 | 2 |
| 79 | theoretical-vs-conceptual-framework | Theoretical framework and conceptual framework: the difference, with examples | theoretical framework vs conceptual framework (not checked) | Thesis | L9, L21 | 2 |
| 80 | how-to-write-a-thesis-outline | How to write a thesis outline, with chapter word counts | thesis outline (not checked) | Thesis | `/tools/thesis-chapter-planner`, L9 | 2 |
| 81 | thesis-to-journal-article | How to turn a thesis into a journal article | thesis to journal article (not checked) | Publishing | `/tools/thesis-to-manuscript` | 2 |
| 82 | how-to-respond-to-reviewer-comments | How to respond to reviewer comments, with a response letter | how to respond to reviewer comments (not checked) | Publishing | L8 | 2 |
| 83 | citation-snowballing | Citation snowballing: backward and forward searching explained | citation snowballing (not checked) | Sources | L22, L29 | 2 |
| 84 | connected-papers-vs-researchrabbit-vs-litmaps | Connected Papers, ResearchRabbit and Litmaps compared | connected papers (6,600 · SD 19 U); research rabbit vs connected papers (not checked) | Competitors | L47, L48, L49, L22 | 2 |
| 85 | how-to-check-a-claim-against-the-research | How to check a claim against the research | does research support (not checked) | Review | `/features/citation-checker` | 2 |
| 86 | how-to-write-an-irb-application | How to write an IRB or ethics application | irb application (not checked) | Proposal | L58, L19 | 2 |
| 87 | what-is-a-systematic-review | What a systematic review is, with its strengths and limits | what is a systematic review (2,400 · SD 25 U); advantages and disadvantages of systematic review (880 · SD 41 U) | Systematic review | L24 | 3 |
| 88 | systematic-review-vs-meta-analysis | Systematic review and meta-analysis: the difference | difference between meta analysis and systematic review (3,600 · SD 20 U) | Systematic review | L24 | 3 |
| 89 | scoping-review-vs-systematic-review | Scoping review or systematic review: which one fits your question | scoping review vs systematic review (880 · SD 37 U) | Systematic review | L24, L63 | 3 |
| 90 | how-to-make-a-prisma-flow-diagram | How to make a PRISMA flow diagram | prisma flow diagram (1,900 · SD 22 U) | Systematic review | L30 | 3 |
| 91 | systematic-review-search-strategy | How to build a search strategy for a systematic review | systematic review search strategy (not checked) | Systematic review | L24, L62 | 3 |
| 92 | cohens-kappa-inter-rater-reliability | Cohen's kappa for screening: how to calculate and report it | cohen's kappa (not checked) | Systematic review | L33 | 3 |
| 93 | which-statistical-test-to-use | Which statistical test to use: a decision guide | statistical test (2,900 · SD 49 U); statistical test flow chart (260 · SD 25 U) | Statistics | L31, L25 | 3 |
| 94 | t-test-vs-anova-vs-chi-square | t-test, ANOVA and chi-square: when to use each | statistical test t test (2,900 · SD 5 U); statistical test chi square (1,600 · SD 55 U); anova statistical test (720 · SD 50 U) | Statistics | L31, `/tools/data-analysis` | 3 |
| 95 | statistical-power-and-sample-size | Statistical power and sample size, explained with one study | power of statistical test (390 · SD 41 U) | Statistics | L32 | 3 |
| 96 | how-to-test-for-normality | How to test for normality, and what to do when the data fail | statistical test for normality (210 · SD 34 U) | Statistics | `/tools/data-analysis`, L25 | 3 |
| 97 | ai-for-qualitative-research | AI for qualitative research: coding, themes and what stays human | ai for qualitative research (not checked) | Fields | L39 | 4 |
| 98 | ai-for-humanities-research | AI for humanities research: sources, books and long arguments | ai for humanities research (not checked) | Fields | L40 | 4 |
| 99 | patent-search-for-researchers | Patent search for researchers: prior art in plain steps | prior art search (not checked) | Fields | L42 | 4 |
| 100 | ai-tools-for-research-labs | AI tools for a research lab: shared library, shared rules | ai tools for research labs (not checked) | Teams | `/pricing`, L14 | 4 |

### Outlines

**Phase 1**

- **61.** Define the term; what a deep research run does step by step (plan, search, read, write); three checks before trusting a report (are the sources real, do they say that, what was not read); how Summary, Deep and Detailed differ.
- **62.** One research question run in ChatGPT deep research, dated; what it cited (web pages, papers); how to verify; when a scholarly index is the better tool. Facts sourced to OpenAI's own pages.
- **63.** The same question in Gemini deep research, dated; strengths (breadth, speed); gaps for a literature search (paywalled papers, study-type filters); how to move its findings into a Library.
- **64.** Criteria first (sources, citations you can open, filters, export), then five tools against them in a dated table; who should pick which. Links to post 31 for the wider "best AI for research" list.
- **65.** What Consensus is, its consensus meter and search, plans as dated; where it stops (writing, review, your own PDFs); using it with AI for Research. Same shape as post 33.
- **66.** What SciSpace does (reading, chat with PDF, literature tables), dated; limits; who it suits.
- **67.** RCT, cohort, case-control, cross-sectional, qualitative, review, meta-analysis in one table; the evidence pyramid and its limits; how to filter a search by study type. Early: links to Find Papers filters.
- **68.** MeSH terms, Boolean operators, field tags, filters, saving a search; a worked example; when to add other databases. Early if the PubMed source works.
- **69.** Folders or tags, naming files, notes that travel with the paper, deduplication, reading status; a weekly routine; importing from Zotero or Mendeley.

**Phase 2**

- **70.** Topic to question in four steps; FINER; PICO and PCC with two worked examples; five weak questions fixed.
- **71.** Research, null and alternative hypotheses; directional or not; five examples by field; how the hypothesis picks the test.
- **72.** What a defense is, who is in the room, how long it runs, the possible outcomes; a six-week preparation plan; master's and PhD differences. "Defense" and "defence" both used once for search.
- **73.** Thirty questions grouped by chapter (contribution, method, limits, future work); how to structure an answer; what to do when you do not know.
- **74.** A 12-slide structure with timing; one idea a slide; figures over text; backup slides; rehearsal. Links to the template.
- **75.** Each section with its purpose and length; common faults; how long the whole takes; funding-body differences in brief.
- **76.** One full example (marked as an example) with margin notes on why each part works; a short second example from another field.
- **77.** APA 7 title page, headings, in-text citations and references for a proposal; a formatted sample page.
- **78.** What examiners look for; design, sampling, instruments, analysis, ethics, limits; tense and voice; a paragraph-by-paragraph model.
- **79.** Definitions side by side; when a study needs which; how to draw the diagram; three examples.
- **80.** Standard chapter structures by field; word budgets; how to write the outline before the literature review is finished.
- **81.** What changes (length, audience, one question), choosing the journal, cutting the literature review, authorship with a supervisor, self-plagiarism rules.
- **82.** How to read a decision letter; the response table (comment, reply, change, location); tone; when to disagree; a sample letter.
- **83.** Backward and forward snowballing, when to stop, how to record it for a review's methods section. Early: links to post 40 until Citation Map ships.
- **84.** What each tool builds and from which data, dated; free and paid limits; which fits which stage. Links to post 34.
- **85.** Find the claim's source, read what the source says, look for studies that disagree, judge the weight of evidence; how Claim Check helps and what it cannot judge (claim rule 3).
- **86.** What an ethics board asks; risk, consent, data protection, vulnerable groups; common reasons for return; a checklist.

**Phase 3**

- **87.** Definition, the steps, how it differs from a narrative review, strengths and limits, how long one takes, who needs one.
- **88.** One table: aim, method, output; when a review has no meta-analysis; forest plot in one paragraph.
- **89.** A decision table (question type, breadth, appraisal, synthesis); PRISMA and PRISMA-ScR; two examples.
- **90.** The PRISMA 2020 boxes one by one; where each count comes from; the three mistakes that make counts not add up. Early if L30 ships first.
- **91.** Concepts to terms, controlled vocabulary, Boolean logic, translating a search between databases, documenting it. Scopus and others described as databases the reader accesses through their institution (claim rule 4).
- **92.** What kappa measures, the formula with a worked table, reading the value, Fleiss and Krippendorff for more raters, how to report it.
- **93.** The four questions that pick a test; a decision table; non-parametric alternatives; reporting. Early: links to `/tools/data-analysis`.
- **94.** What each test compares, assumptions, a worked example each, common misuses.
- **95.** Power, effect size, alpha and sample size with one running example; what to do with a small sample.
- **96.** Shapiro-Wilk and Q-Q plots, sample-size caveats, transformations, non-parametric routes.

**Phase 4**

- **97.** Where AI helps (first-pass codes, summaries, finding quotes) and where it must not decide (themes, interpretation); trustworthiness criteria; consent and data privacy.
- **98.** Working from books and archives, quotation and page references, Chicago and MLA, the limits of scholarly indexes for humanities.
- **99.** What prior art is, where to search for free, reading a patent, classification codes, families; when to call a professional (claim rule 7).
- **100.** A shared Library, one citation style, AI-use rules a lab can adopt, onboarding a new student, what a Team plan covers.

---

## 4. Internal linking map

```
                                 L1 Home (ai for research)
   ┌────────────┬───────────────┬──────────┴────┬───────────────┬──────────────┐
 /for/* (L11–16)  L17 Deep       L9 Thesis       L8 Reviewer     L24 Systematic   L25 Data Lab
 link to every    Research       Suite                           Review
 workspace page   61–64, 67, 68  72–74, 78–80    82, 85          87–92            93–96
                     │              │                               │                │
              L43–L46 alts    L19 Proposal Studio 75–77, 86   L30, L33, L62–66   L31, L32
              65, 66          L20–L23, L27–L29 70, 71, 83      L53, L54
                              L47–L52 alts 84
                              L55–L61 templates
```

| Cluster | Hub page | Posts | Sibling pages |
| --- | --- | --- | --- |
| Deep research | L17 | 61, 62, 63, 64 (and existing 31, 35) | L43, L44, L45, L46, L4 |
| Sources and Library | L4, `/features/research-library` | 67, 68, 69, 83 (and existing 39, 40, 41) | L15, L22, L29 |
| Competitors | L10 and L43 to L54 | 65, 66, 84 (and existing 33, 34) | Each alternatives page links to the next two |
| Planning | L27, L28 | 70, 71 (and existing 48, 49) | L21 |
| Thesis | L9 | 72, 73, 74, 78, 79, 80 (and existing 45, 46) | L12, L13, L20, L21, L23, L57 |
| Proposal | L19 | 75, 76, 77, 86 (and existing 58) | L56, L58, the two free generators |
| Review and publishing | L8 | 81, 82, 85 (and existing 50) | `/features/citation-checker`, `/tools/thesis-to-manuscript` |
| Systematic review | L24 | 87, 88, 89, 90, 91, 92 (and existing 53) | L30, L33, L53, L54, L62 to L66 |
| Statistics | L25 | 93, 94, 95, 96 | L31, L32, `/tools/data-analysis` |
| Fields and teams | L34 to L42 | 97, 98, 99, 100 (and existing 54) | L14, L15, L16 |

Rules, as in the earlier plans:

- Every post links up to its hub once, with the hub's primary keyword as the link text.
- Posts in a cluster link to each other. Hubs link down to two or three posts in a "Learn more" block.
- Each audience page links to every workspace page that audience uses, and each workspace page names its audiences.
- Each template page links to the workspace that fills it and to the post that teaches it.
- An alternatives page never links to another product's affiliate or tracking URL; it links to the product's own page as the source of each fact.
- New pages go in the sitemap; redirected slugs (section 1) are 301s.

---

## 5. Publishing order

Two posts a week, landing pages first in each phase. A phase starts when its features pass their own acceptance checks, not on a date.

| When | Ship |
| --- | --- |
| Before Phase 1 launches | Rewrite `docs/messaging.md`. Pull the keywords in appendix B. Write the briefs for L1, L17 and L43 |
| Phase 1, weeks 1–2 | L1 and `/pricing` rewrites, L2, L4, L17, L18; posts 61, 65 |
| Phase 1, weeks 3–4 | L11, L15, L16, L43, L46; posts 62, 63, 67 |
| Phase 1, weeks 5–6 | L44, L45; posts 64, 66, 68, 69. Move posts 1 to 23 under "Writing with sources" |
| Phase 2, weeks 1–2 | L8 and L9 rewrites, L19, L20, L56; posts 72, 75, 76 |
| Phase 2, weeks 3–4 | L12, L13, L14, L22, L23, L27; posts 70, 73, 74, 77 |
| Phase 2, weeks 5–8 | L21, L28, L29, L47 to L52, L55, L57 to L61; posts 71, 78 to 86 |
| Phase 3, weeks 1–2 | L24, L30, L31; posts 87, 88, 90, 93 |
| Phase 3, weeks 3–6 | L25, L26, L32, L33, L53, L54, L62 to L66; posts 89, 91, 92, 94, 95, 96 |
| Phase 4 | L34 to L42 as each field pack ships; posts 97 to 100 |
| Every quarter | Re-check every alternatives page and posts 62 to 66 and 84. Re-check policies cited in posts 72 and 86 |

**May ship early**, because they teach a method or need no account: posts 67, 68, 83, 90 and 93, and the PRISMA flow diagram tool (L30).

**Measure** as in content-plan-research.md section 5, and add: Ask-box runs started from each landing page, and signups per page. A landing page that brings visits but no runs gets its hero control fixed before more posts point to it.

---

## 6. Open questions for the owner

1. **Spelling.** The keyword data is United States ("defense", "organize"); CONTENT.md uses British spelling ("defence", "Defence Pass"). This plan uses US spelling in slugs and keywords. Should the site copy follow?
2. **Deep Research URL.** This plan moves it to `/features/deep-research` and redirects `/tools/deep-research`. The alternative is to keep the tool slug and have no feature page. Which do you prefer?
3. **Scopus and Google Scholar.** The brief lists both as sources. Neither has an open licence for this use. Is "bring your own access" (export file or institutional key) acceptable in copy until a licence exists?
4. **Brand keywords.** Twelve alternatives pages name other products. Are you content to name all of them, and who re-checks the facts each quarter?
5. **Text Humanizer.** The name stays in the product. The copy will not mention detectors at all. Agreed?
6. **`/for/medicine` and `/fields/medicine-and-health`.** Two pages, one for the audience now and one for the field pack later. If that reads as duplication, the field page can replace the audience page in Phase 4 with a redirect.
7. **Keyword budget.** The current Ubersuggest plan gives 3 reports a day. Checking appendix B takes about three weeks at that rate. Is a month of a higher plan, or a fresh Keyword Planner export, possible before Phase 1 briefs are written?
8. **Old clusters.** Posts 1 to 23 (journalism, AP style, screenwriting) stay live but leave the navigation. Should they stay indefinitely, or be reviewed after six months of traffic data?
9. **Team plan and field packs.** Phase 4 pages depend on both. If either slips, L34 to L42 and posts 97 to 100 wait.
10. **Languages.** All volumes are US English. Is a second market (for example the UK, India, Nigeria or Kenya) a target, so that keywords are pulled for it?

---

## Appendix A. Keywords with real figures

Ubersuggest, United States, 11 November 2026.

| Keyword | Volume | SD | Used in |
| --- | --- | --- | --- |
| consensus ai | 18,100 | 29 | L43, 65 |
| gemini deep research | 8,100 | 28 | L46, 63 |
| deep research | 6,600 | 62 | L17, 61 |
| connected papers | 6,600 | 19 | L47, 84 |
| statistical test of hypothesis | 6,600 | 27 | 71 |
| a systematic review | 5,400 | 33 | L24 |
| research proposal example | 5,400 | 15 | L56, 76 |
| systematic review | 4,400 | 38 | L24 |
| example of a research proposal | 4,400 | 31 | L56 |
| chatgpt deep research | 4,400 | 39 | L46, 62 |
| difference between meta analysis and systematic review | 3,600 | 20 | 88 |
| systematic review versus meta analysis | 3,600 | 37 | 88 |
| research proposal | 2,900 | 27 | L19, 75 |
| statistical test | 2,900 | 49 | L25, L31, 93 |
| statistical test t test | 2,900 | 5 | 94, `/tools/data-analysis` |
| what is a systematic review | 2,400 | 25 | 87 |
| statistical test calculator | 2,400 | 30 | `/tools/data-analysis` |
| prisma flow diagram | 1,900 | 22 | L30, 90 |
| thesis defense | 1,900 | 27 | L20, 72 |
| google deep research | 1,900 | 49 | L46 |
| statistical test hypothesis | 1,900 | 48 | L28 |
| how write research proposal | 1,600 | 7 | 75 |
| research proposal templates | 1,600 | 14 | L56 |
| statistical test chi square | 1,600 | 55 | 94 |
| openai deep research | 1,300 | 47 | L46 |
| how to do a research proposal | 1,300 | 48 | L19 |
| sample format for research proposal | 1,300 | 42 | L56 |
| systematic review literature | 1,000 | 59 | L24 |
| research proposal apa style | 1,000 | 6 | 77 |
| perplexity deep research | 1,000 | 48 | L45 |
| scoping review vs systematic review | 880 | 37 | 89 |
| research proposal apa | 880 | 28 | L56 |
| advantages and disadvantages of systematic review | 880 | 41 | 87 |
| claude deep research | 880 | 41 | L46 |
| deep research ai | 720 | 55 | L17 |
| statistical test types | 720 | 43 | L31 |
| anova statistical test | 720 | 50 | 94 |
| what is deep research chatgpt | 590 | 48 | 62 |
| chat with pdf | 480 | 54 | `/features/chat-with-pdf` |
| thesis defense phd | 480 | 26 | L13, L20 |
| power of statistical test | 390 | 41 | L32, 95 |
| consensus ai for research | 390 | 31 | L43 |
| statistical test flow chart | 260 | 25 | L31, 93 |
| consensus ai search engine | 210 | 36 | L43 |
| statistical test for normality | 210 | 34 | 96 |

## Appendix B. Seed terms to check next

Three seeds a report. In order of need:

1. ai research assistant · systematic review software · thesis defense presentation
2. consensus ai alternative · scispace · connected papers alternative
3. research question generator · hypothesis generator · sample size calculator
4. which statistical test to use · cohen's kappa calculator · ai data analysis
5. ai for medical research · ai tools for phd students · ai for college students
6. citation map · research methodology · literature mapping
7. research poster template · ethics approval statement · systematic review protocol template
8. covidence alternative · rayyan · litmaps
9. paperpal · jenni ai · scite ai
10. levels of evidence · how to search pubmed · theoretical framework vs conceptual framework
11. One seed per field page (L34 to L42), three a day
