# AI for Research: product structure for the new direction

Proposal, 11 November 2026. This file puts every feature you listed (the brief and `yyy.md`) into one structure, says what was merged and why, and adds what was missing. Nothing here is built yet.

Related files: [02-services-and-apis.md](02-services-and-apis.md) · [03-pricing.md](03-pricing.md) · [04-content-plan.md](04-content-plan.md) · UI proposals in [ui/](ui/).

## 1. The change in one paragraph

Today the product is an editor with research tools around it. A visitor lands on a writing tool and has to discover that it can also search papers. The new product is a **research workspace**: you start with a question, get an answer built from real papers, and carry that evidence into the next job (review it, analyse data, write the chapter, prepare the defence). The editor stays and gets better, but it becomes one of six workspaces instead of the front door.

New promise: **Research with real sources, from first question to defence.**

## 2. Six rules the whole product follows

1. **Every claim opens its source.** Citations come from search results, never from the model's memory. Where the full text is available, a claim links to the passage and page.
2. **Evidence quality is visible.** Study type, year, journal quality, citation count, preprint and retraction flags sit on every paper row.
3. **Work carries over.** Any result can become the input of the next tool with one click (answer to literature review, review to slides, table to chapter). No copy and paste between tools.
4. **Two ways of working, one document.** Research in chat when you want the AI to do the work; write in the editor when you want suggestions while you type. A chat result opens in the editor, and the editor can call the chat.
5. **Honest limits.** A page says what the tool does not do. No detector-evasion claims, no "guaranteed", no feature advertised before it works (the rule already in `docs/prd-status.md`).
6. **The user knows the cost before a job starts.** Every heavy job shows its credits and time up front.

## 3. Building blocks every module shares

These are built once and reused. Most of your "other notes" are here.

| Block | What it is | Your note it covers |
| --- | --- | --- |
| **Ask box** | One composer used on the landing page, Home and inside every workspace: question, depth mode, sources, attachments | "Chatbot space", "user can add PDF" |
| **Depth mode** | Summary (short cited answer) · Deep (structured report, 20–40 papers) · Detailed (long report with tables, 50+ papers) | "mode of summary, deep and detailed" |
| **Sources** | All papers · Medical (PubMed) · Web · My Library · Preprints · Patents (later). Can be combined. | "search from medical papers, or all or library", "web among the sources" |
| **Attachments** | PDF, DOC, DOCX, MD, TXT; add from Library; import from Zotero or Mendeley | "import/upload files", "add from their library" |
| **Filters** | Year, study type and methodology, journal quality (quartile), citations, open access, sample size, peer-reviewed or preprint, exclude retracted, field | "filtering of papers by years, quality, methodology and other metrics" |
| **Role and level** | Undergraduate, honours, master's, PhD, academic staff, researcher, clinician, industry. Set once at sign-up, changeable per task. Changes depth, tone, defaults and which tools Home suggests. | "User can select their role" |
| **Output options** | With or without headings, length, language, citation style, tables on or off | "results with headings or without" |
| **Project** | A folder for one piece of work: its questions, papers, documents, reviews and datasets. Everything is created inside a project. | "Project sharing" |
| **Sharing** | Invite by email or link: view, comment or edit. Supervisor mode is comment-only. | "Project sharing should be included" |
| **History** | Every job the user ran, with its inputs, so it can be reopened, rerun or continued | "History" |
| **Follow-on tools** | The same row of actions under every result: Improve document · Write a paper · Peer review · Find gaps · Check citations · Write abstract · Thesis outline · Systematic review · Make slides | The tool list under Deep research |
| **Research mode and Write mode** | Chat-led (like Consensus) and editor-led (the current collaborative editor with autocomplete and citations). Any generated text can be opened and edited in the editor. | The two modes in your notes |
| **Credits** | One allowance for all heavy jobs (see pricing) | |
| **Templates** | Starting documents and forms, used by Writing Studio, Proposal Studio and Systematic Review | "Templates" |

## 4. The structure

Six hubs. Each line is a module; "From" shows which of your items it absorbs. Status: **Have** (works today), **Upgrade** (exists, needs real work), **New**. Phases are in section 8.

### Hub 1: Research (find and understand)

| Module | What the user does | From your lists | Status | Phase |
| --- | --- | --- | --- | --- |
| **Deep Research** | Asks a question, picks depth and sources, gets a cited answer or report with a consensus line and a filterable source list | Home chatbot, Deep research, "research fully with the AI chatbot", Web Research Agent, Research Lookup | Upgrade (`/chat`, `tools/deep-research`) | 1 |
| **Find Papers** | Searches papers and journals with filters; saves, cites, exports; finds the full text | Articles and Journals search, Find articles, Paper Lookup, the per-database search tools (PubMed, Europe PMC, arXiv, bioRxiv, Crossref, Semantic Scholar, CORE, DBLP, SSRN, Zenodo), find-full-text tools, citation export tools | Upgrade (`/papers`) | 1 |
| **Citation Map** | Sees a paper's references and citing papers as a graph; walks backward and forward (snowballing); finds the reviews that cite a set of papers | Citation graph, Citation snowballing, Review citation search, OpenAlex citation graphs | New | 2 |
| **Claim Check** | Pastes a claim or a paragraph; sees which studies support it, which do not, and how strong they are | Claim check, Check citations, cross-source fact verification | Upgrade (the editor's claim check becomes a tool of its own) | 2 |
| **Gap Finder** | Gets the open questions in a topic, each with its reason and sources | Find gaps, Research Gap Finder | Have (`tools/research-gap-finder`), upgrade | 2 |
| **Landscape** | Sees a field at a glance: trend over time, main clusters, most-cited work, leading authors and journals | Landscape, Bibliometric Analyst | New | 3 |
| **Question tools** | Refines a research question (FINER, PICO, PICOT), generates hypotheses, brainstorms directions | Research Question Refiner, Hypothesis Generator, Brainstorming Partner | New (small) | 2 |
| **Alerts** | Follows a topic or a preprint and gets new papers by email | Preprint Tracker | New | 4 |

### Hub 2: Library (keep and read)

| Module | What the user does | From your lists | Status | Phase |
| --- | --- | --- | --- | --- |
| **My Library** | Keeps papers, PDFs and their own works in collections with tags, notes and highlights; duplicates are merged | My library, Library, Citation Manager Agent | Upgrade (`/library`) | 1 |
| **Chat with PDF** | Asks one or many documents; answers show the page | Chat with PDF, PDF chat | Have, upgrade to many documents and DOCX/MD/TXT | 1 |
| **Import and sync** | Brings a library from Zotero, Mendeley, BibTeX, RIS, or a list of DOIs | Import from Zotero or Mendeley, Pyzotero, Zotero assistant | Have | 1 |
| **Evidence table** | Turns a set of papers into a table: population, intervention, outcomes, method, limitations, funding. Columns can be added. | The dozen "Extract … from research paper" tools | Upgrade (`/matrix`) | 2 |
| **Citation Generator** | Cites any source in 10,000+ styles | Citation generator | Have | 1 |
| **Document tools** | Converts PDF, DOCX and PPTX to editable text; merges and splits PDFs | Document Converter, PDF tools | Have (PDF tools), converter new | 2 |

### Hub 3: Write (draft and present)

| Module | What the user does | From your lists | Status | Phase |
| --- | --- | --- | --- | --- |
| **Writing Studio** | Writes in the editor. *Co-write*: suggestions and citations as you type. *Draft for me*: an article with evidence, a literature review with citations, a section, an abstract. | Writing studio, Write a paper, Improve document, Write abstract, Research Paper Writer, Abstract Writer, Conference Paper Writer, LaTeX agent, Document Improvement | Have (`/editor`), upgrade | 1–2 |
| **Thesis Suite** | Goes from topic to defended thesis: similar-papers finder, outline generator (chapters and word budget), methodology builder, theoretical framework, timeline, chapter drafting, defence preparation | AI thesis (autonomous proposal, similar papers finder, thesis outline generator, methodology builder), Thesis outline, Methodology, Dissertation Defense Prep, Theoretical Framework Builder, Variable Operationalization, Research Timeline Planner | Upgrade (`tools/thesis-chapter-planner` grows into this) | 2 |
| **Proposal Studio** | Writes a research proposal, a grant proposal in a funder's format, or an ethics application, section by section or in one run | Proposal writing, Proposal studio, autonomous proposal, Grant Proposal Writer, Ethics/IRB helper, data sharing plan | Upgrade (two tools become one workspace) | 2 |
| **Thesis to Manuscript** | Turns a thesis chapter into a journal article, formats it for a named journal, drafts the cover letter | Thesis to manuscript, Journal Submission Formatter, Venue Templates | Have, upgrade | 2 |
| **Slides and posters** | Makes a deck or a poster from a document or a research result; exports PowerPoint | Make slides, Build deck, Presentation Builder, research posters, Scientific Diagram Creator | New | 2 |
| **Rewrite tools** | Rewrites text in a natural style, paraphrases, shows stock AI phrases | Text humanizer, paraphraser | Have | 1 |
| **Templates** | Starts from a proposal skeleton, a university thesis template, a screening form, a checklist, an email | Templates, the 52 template listings in `yyy.md` | New | 2–3 |

### Hub 4: Review (check before someone else does)

| Module | What the user does | From your lists | Status | Phase |
| --- | --- | --- | --- | --- |
| **Reviewer** | Picks the document type (thesis, proposal, manuscript), the level (undergraduate, honours, master's, PhD) and the quality (standard, or high quality with tables and graphs). Gets a scorecard and comments placed in the text. | Reviewer, Peer review, Peer Review Agent, Scholar Evaluation, statistical reporting checklist, qualitative reporting checklist | Upgrade (the editor's peer review becomes a workspace) | 2 |
| **Citation check** | Checks that every reference exists, is not retracted, and says what the sentence claims | Check citations | Have (in the editor), surfaced as a tool | 1 |
| **Authorship report** | Shows how a document was written, for a supervisor or journal | (existing) | Have | 1 |

### Hub 5: Systematic Review (one workspace, not a hundred tools)

`yyy.md` lists about 120 systematic-review items that differ only by review type (scoping, mapping, realist, living, network meta-analysis and so on). They become **one workspace with a review-type preset** that changes the forms and wording.

| Step | What it does | From your lists |
| --- | --- | --- |
| Protocol | PRISMA-first setup; eligibility criteria (PICO, PCC, SPIDER); a PROSPERO-shaped protocol | Prisma first, Systematic Review Protocol, inclusion and exclusion criteria builders |
| Search | Builds and runs the search per database and records it for the report | Search Scopus, Search papers, the PubMed, Scopus, Semantic Scholar, Europe PMC and JSTOR search builders |
| Records | Uploads RIS, BibTeX or CSV, or takes results from Find Papers; removes duplicates | Upload papers, duplicate detectors |
| Screening | Title and abstract, then full text; two reviewers or one reviewer with AI as the second; pilot round; reasons for exclusion | Screening forms, pilot test planners, exclusion taxonomies, decision logs, screening rationale |
| Agreement | Cohen's kappa, Fleiss' kappa, Krippendorff's alpha, percent agreement; conflict list to resolve | The kappa, alpha and percent-agreement tools, conflict resolution agendas |
| Full texts | Tracks which papers still need a PDF and finds open copies | Full-text retrieval trackers |
| Extraction | The Evidence table from the Library, with quote and page for every cell | The "Extract …" tools |
| Quality | Risk-of-bias forms (blinding, allocation, randomisation) | Extract blinding, allocation concealment, randomisation |
| Report | PRISMA flow diagram, summary tables, a draft of the methods and results, optional meta-analysis with a forest plot | Systematic Review Agent, Systematic Literature Reviewer |

Status: New (the largest module). Phase 3.

### Hub 6: Data Lab (analyse and show)

| Module | What the user does | From your lists | Status | Phase |
| --- | --- | --- | --- | --- |
| **Data Lab** | Uploads data (CSV, Excel, SPSS, Stata), asks questions in plain words, gets tables, charts and a written report with the code shown | Data analysis, Data Analysis and Visualization, Exploratory Data Analysis, Statistical Testing, Econometrics, Publication Chart Creator, PDF Report Generator | Upgrade (`tools/data-analysis` is a browser calculator today) | 3 |
| **Statistical test chooser** | Answers a few questions and is told which test fits, with its assumptions and how to report it | Statistical test, Statistical Analysis Planner | New (small) | 2 |
| **Power and sample size** | Calculates the sample a study needs | Statistical Power and Sample Size | New (small) | 3 |
| **Methodology advisor** | Gets guidance on quantitative, qualitative or mixed designs; shared with Thesis Suite | Methodology, Methodology Advisor | New | 2 |
| **Qualitative analysis** | Codes interview text into themes with quotes | Qualitative Analysis Guide | New | 4 |

### Across everything

**Home** (the Ask box, quick tasks, what to continue) · **History** · **Projects and sharing** · **All tools** (the catalogue of every tool and template, searchable, grouped by hub) · **Account, plan and credits** · **Help**.

## 5. Items I had to interpret (please confirm)

| Your item | How I read it | Where it went |
| --- | --- | --- |
| Strategy | A research plan for a topic: which databases, which search strings, timeline and milestones | Thesis Suite (timeline) and Systematic Review (protocol and search). No separate module. |
| Landscape | A map of a field: trends, clusters, top work | Research › Landscape |
| Build deck | Slides from a document or result | Write › Slides and posters |
| Review Citation search | Find review articles that cite a set of papers | Research › Citation Map |
| FAQ | The public FAQ and the help centre | Landing page and `/help` |
| "Collabora editor" | The current collaborative editor (BlockNote with live editing) | Writing Studio |

## 6. The `yyy.md` catalogue: what to take

The catalogue has about 450 listings. Most are thin wrappers around a data source or a Python library. Copying them one by one would make the product look large and feel shallow.

| Group in `yyy.md` | Decision |
| --- | --- |
| Writing and planning agents (abstract, paper, grant, outline, hypothesis, timeline, defence prep, ethics) | **Take**, as modules of Writing Studio, Thesis Suite and Proposal Studio |
| Search connectors (PubMed, arXiv, bioRxiv, Crossref, Semantic Scholar, CORE, DBLP, SSRN, Zenodo, Europe PMC) | **Take**, as sources inside Find Papers and Deep Research, not as separate tools |
| Systematic-review tools and templates | **Take**, merged into the one workspace above |
| Statistics, charts, machine-learning basics | **Take**, inside Data Lab |
| Templates (posters, emails, checklists, forms) | **Take**, in the Templates library |
| Patent search across eight offices | **Later** (phase 4), as one "Patents" source with office filters |
| Field databases (genes, proteins, pathways, compounds, clinical trials, economic series) | **Later** (phase 4), as field packs: a field adds its sources and a few tools |
| Heavy science compute (deep-learning training, molecular docking, fluid dynamics, quantum simulation, single-cell pipelines) | **Do not build now.** High compute cost, small overlap with thesis and paper writers, and each needs expert validation. |
| Lab integrations (Benchling, Opentrons, LabArchives, OMERO) | **Do not build.** Different customer. |
| Clinical output (treatment plans, DICOM reading) | **Do not build.** Liability, and it needs clinical sign-off. |

**Field packs (phase 4).** A pack is a set of sources, filters, templates and prompts for one field. It is how the product serves "every field" without becoming eight products.

| Pack | Adds |
| --- | --- |
| Medicine and health | PubMed with MeSH, ClinicalTrials.gov, PICOT, CARE and CONSORT checklists, evidence levels |
| Life sciences | Gene, protein and pathway look-ups (UniProt, Reactome, AlphaFold DB), bioRxiv |
| Chemistry and materials | Compound and material look-ups (PubChem, ChEMBL, Materials Project) |
| Engineering and computing | arXiv, DBLP, IEEE and ACM styles, LaTeX first |
| Environmental studies | Public environmental data, maps in Data Lab |
| Social sciences | Qualitative analysis, survey design, SSRN |
| Humanities | Chicago and MLA first, archive and book sources, close-reading chat |
| Business and economics | Economic series (FRED, World Bank), case-study analysis, market reports |
| Law and patents | Patent search, Bluebook and OSCOLA |

## 7. What you did not list but the product needs

| Need | Why |
| --- | --- |
| Onboarding that asks role, field, level and citation style | Drives every default; three questions, skippable |
| Long jobs that survive closing the tab, with progress and an email when done | Detailed reports and thesis reviews take minutes |
| Passage-level provenance (quote and page behind each claim) | The main difference from general chat tools |
| Evidence signals: retracted, preprint, journal quartile, study type, sample size | Lets a student judge a source in a second |
| A consensus line on answers ("14 of 18 studies report…") | What Consensus is known for; it is also the fastest way to read an answer |
| Full-text access: open copies first, then the user's university login link | Abstract-only answers are the top complaint about research AI |
| A PDF reader with highlights and "explain this" | Reading is half of research |
| Exports everywhere: Word, PDF, LaTeX, PowerPoint, Excel/CSV, RIS/BibTeX | Work must leave the product cleanly |
| University thesis templates and house citation styles | A thesis must match the template |
| AI-use statement and authorship report | Universities now ask for it; you already have the base |
| Answers in the user's language, and translation of abstracts | A large share of students do not write in English first |
| Privacy controls: unpublished work is never used for training; delete everything | Theses and patient data |
| A credits meter and a cost shown before each job | Trust in pricing |
| Internal: cost logged per job, a citation-accuracy test set, thumbs up and down on answers | You cannot price or improve what you do not measure |
| Fix before launch: rate limit trusts `X-Forwarded-For`; Scholar index quality (both in `docs/prd-status.md`) | Free limits can be bypassed today |
| Later: browser extension (save and cite from any page), Word and Google Docs add-in, institution sign-on | Reach |

## 8. Phases

| Phase | Name | Ships |
| --- | --- | --- |
| 1 | Research core | New shell and Home with the Ask box; Deep Research with three depths, sources and filters; Find Papers with filters; Library and Chat with PDF upgrades; History; Projects and sharing; roles; credits and the new plans; the new landing page |
| 2 | Thesis and review | Reviewer; Thesis Suite; Proposal Studio; Writing Studio modes; Thesis to Manuscript upgrade; Citation Map; Claim Check; Evidence table; Slides; Templates; test chooser; Methodology advisor |
| 3 | Evidence and data | Systematic Review workspace; Data Lab; Landscape; power and sample size |
| 4 | Fields and teams | Field packs; patents; qualitative analysis; alerts; Team plan and institutions; browser extension |

Phase 1 changes what the product is. Phases 2 and 3 are where it becomes better than the competition for thesis writers. Phase 4 is breadth.

## 9. Site map

**Public:** `/` · `/features` and `/features/[slug]` · `/tools` and `/tools/[slug]` · `/for/[audience]` · `/fields/[field]` · `/templates` · `/pricing` · `/alternatives/[name]` · `/blog` · `/research` (paper and author pages) · `/help` · legal pages.

**App:**

```
Home
Deep Research
Find Papers
Library
Workspaces
  Writing Studio
  Thesis Suite
  Proposal Studio
  Systematic Review
  Reviewer
  Data Lab
More
  All tools
  History
```

Twelve destinations and a project switcher. Everything else (Citation Map, Claim Check, Slides, Templates, the small tools) is reached from All tools, from the follow-on row under a result, or from search. Current routes map over: `/chat` becomes Deep Research, `/papers` Find Papers, `/editor` Writing Studio, `/matrix` the Evidence table, `/authorship` stays.

## 10. Decisions I need from you

1. Confirm the readings in section 5, "Strategy" above all.
2. Confirm the "do not build" rows in section 6.
3. Scopus has no licence a product like this can use out of the box. The proposal is "bring your own institutional key" plus PubMed, Europe PMC and Semantic Scholar by default (details in the services file). Agree?
4. Keep the name "AI for Research" and the domain?
5. Which UI style (see [ui/](ui/)).
