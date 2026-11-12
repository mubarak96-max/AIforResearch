**AI for Research: product opportunities and gaps**

Prepared 12 November 2026. Based on a static review of the current repository and official product/source documentation. This is a product strategy audit, not a production acceptance test. Competitor features are vendor-documented capabilities; demand, willingness to pay, and proposed priorities remain hypotheses to validate with users.

**Recommendation**

Build the product around a completed, defensible piece of work: a literature review, dissertation evidence table, journal-club appraisal, or supervisor review pack. Start with research-active medical students, master's/PhD researchers, and small research teams. They can use the same evidence infrastructure and much of the existing app.

The strongest product promise to work toward is: **Turn your sources into work you can inspect, discuss, and submit—with the evidence preserved.**

There is already substantial breadth. The next commercial step is depth, reliability, and continuity: finding sources, understanding what they actually establish, making decisions, producing a usable deliverable, and updating it later. Adding more audience-specific generators will not by itself complete those jobs.


**What exists today**

The repository implements multi-source scholarly search, PubMed/Europe PMC, preprints, optional web search, Library/PDF chat, reference imports, Deep Research, evidence matrices, citation checks, writing and thesis modules, proposal/ethics drafting, slides, document collaboration, project roles, systematic-review workflows, and browser statistics. Word/PDF/LaTeX exports, mobile layouts, editor offline persistence, account deletion, subscriptions, top-ups, and a Defence Pass already exist.

Deep Research already plans searches, follows citations, screens and ranks papers, retrieves some full texts, checks claims, and produces figures. The systematic-review workspace already has protocol fields, database searches, imports, deduplication, screening decisions, conflicts, agreement statistics, extraction, and PRISMA output. Neither should be proposed as a completely missing feature.

Evidence matrices already contain quote/page functionality. The opportunity is to extend that stronger evidence model across reports, systematic reviews, shared projects, and exports.

Important inventory warning: `docs/prd-status.md` is stale. Even the newer build report is not an exact description of all current limits. Use the implementation and observed end-to-end behavior as the source of truth.

**Audience opportunities**

Implementation requirement: audiences and work requirements determine workflows. All workflows are available regardless of geography. Language, source collections, currencies, and the geographic scope of evidence are user-selected task settings; they never restrict product access or assign pricing based on location.

The table describes proposed jobs and additions. “Missing” means no complete implementation was found in the inspected app/backend; it does not rule out accomplishing part of the task manually with existing tools.

| Audience | Concrete job and deliverable | Existing starting point | Missing depth or capability | Who might pay / return trigger |
| --- | --- | --- | --- | --- |
| Medical student doing research | Prepare a journal-club appraisal or dissertation evidence table that a supervisor can check | Medical search, PICO tools, review workspace, slides | Full-text extraction with page anchors; study-specific appraisal; effect-size interpretation; trial-registry discovery/import; local guideline sources; supervisor approval | Student or department; recurring journal club, dissertation milestones |
| Medical student studying for examinations | Learn course material and identify misconceptions | PDF chat, explanations, document uploads | Syllabus/learning-objective mapping, question practice, source-linked explanations for wrong answers, spaced revision, progress history | Student; repeated revision sessions. Validate separately from research demand |
| PhD researcher | Maintain a defensible literature review and prepare supervisor meetings | Deep Research, Library, matrix, thesis tools, projects, editor | One shared evidence collection; stable quote-to-claim links; supervisor decision log; incremental literature updates; reliable reference-manager continuity; submission-quality document round trips | Student, grant, or lab; monthly meetings, chapter submission, revisions |
| College student | Understand readings and complete a rubric-based assignment | Search, chat, writing, citations, multilingual generation | Rubric/syllabus ingestion; argument outline; formative feedback; explanations at the student's level; course AI-use constraints; original-language evidence alongside translation | Student or course; assignments. Do not assume they lack institutional tools |
| Undergraduate doing research | Produce an original argument, research assistant memo, or honours thesis | Scholarly discovery, citation tools, editor, reviewer | Counterargument map; primary-versus-secondary source distinction; rubric-aware feedback; authorship/AI-use record across tools; continuity with Word/Docs/Zotero | Student, research group, or department; coursework and research projects. University label is not a pricing signal |
| UN or international-agency official | Produce a country brief with dated facts, policy options, and traceable evidence | Web/paper search, writing, slides, shared tasks | UN/agency and regional sources; country/date filters; indicator definitions and units; Multilingual retrieval and original quotations; source versions; brief approval and update workflow | Agency/team; periodic briefings and changing conditions |
| NGO programme or monitoring/evaluation worker | Turn evaluations, interviews, field data, and literature into a donor report or programme recommendation | Library, proposal tools, Data Lab, projects | Theory-of-change/logframe objects; indicator dictionary; baseline/target/actual tracking; qualitative coding; disaggregation; evidence attachments; import from field-data tools; redaction and access controls | NGO/project budget; reporting cycles and programme reviews |
| Government analyst | Compare policy options for a jurisdiction and prepare an approval-ready memo | Research and document generation | Official statistics and policy sources; jurisdiction/effective-date metadata; option/cost/implementation/equity comparison; version comparison; reviewer sign-off and audit export | Department; policy cycles and updates. Procurement requirements differ from individual subscriptions |
| Financial analyst | Compare company filings and produce an auditable company/sector memo | File uploads, tables, research, writing | Filing/transcript ingestion; reliable table extraction; fiscal period, currency, units and restatements; comparable metrics; scenario assumptions; Excel handoff; local market coverage | Analyst/team; quarterly reporting. Broad licensed market data is a separate investment |
| Qualitative researcher, social scientist, or UX researcher | Analyse interviews and write findings with inspectable participant evidence | Document ingestion and literature research | Transcript/speaker/line objects; editable codebook; coded excerpts; researcher memos; negative cases; theme development; consent/redaction; appropriate collaboration for the chosen method | Researcher/team; interview projects and reuse of findings |
| Humanities researcher | Develop an interpretation from primary texts, archives, and scholarship | Search, Library, writing | Books/chapters/archives as first-class sources; edition/page references; multilingual OCR; close reading and annotations; primary/secondary distinction; discipline-appropriate retrieval | Researcher/library/team; long projects. Clinical evidence rankings are unsuitable defaults |
| Supervisor, lab manager, or university librarian | Review multiple projects and keep shared evidence usable when people leave | Project roles, editor collaboration, imports | Shared Library/matrices; review inbox; permissions and ownership transfer; group reference libraries; organisation administration; reproducibility exports | Lab/department/library; repeated supervision and team continuity |
| Independent consultant or evidence-review agency | Deliver a client report and respond to challenges about its evidence | Research, reviews, exports | Client-separated workspaces; approved evidence bundles; review/sign-off; source snapshots; repeatable templates; controlled external sharing | Consultant/company; repeated engagements |
| Engineer or R&D researcher | Assess technical feasibility and prior work | Papers, preprints, citation maps | Patent families and claims; standards/version metadata; experiment/benchmark comparison; dataset/code links | R&D team; project decisions. Patent analysis needs its own source coverage and expert review |

**Where the present product falls short of paid expectations**

1. **A failed check can appear successful.** In `lib/server/lib/researchPipeline.ts:435`, claim verification defaults to `yes`. Missing, malformed, and failed model responses can retain that verdict, and the result summary counts them as supported. Verification also covers a capped set of cited claims. Introduce `unverified`; record attempted versus completed checks; expose coverage and source basis. Detect factual claims without citations separately. A real DOI, an AI-supported claim, and a human-checked conclusion must have distinct statuses.

2. **Saved output does not always preserve its full evidence.** `lib/server/lib/history.ts:42` truncates large results, including source arrays, and can fall back to markdown. `researchPipeline.ts:970` removes long passages from saved/public sources. Preserve an evidence bundle in object storage: source/version, permitted supporting excerpts, page/section, extraction, claim, reviewer decisions, and generation settings. Respect source rights when deciding what content to retain. Report prose alone is insufficient to reproduce a serious finding.

3. **The systematic-review workflow needs stronger methodology support.** AI screening at the full-text stage receives abstracts (`lib/server/routes/systematicReview.ts:366`), and extraction also uses abstracts (`:391`). Other reviewers' votes are visible in `components/app/systematic-review/ScreeningTab.tsx:144`. Risk-of-bias fields are limited and decisions overwrite current state. Add record-linked PDFs, page/quote evidence, blinded independent human decisions where required, adjudication, appropriate appraisal forms, and append-only decision history. Keep an AI suggestion distinct from a second independent human reviewer. The review-type dropdown alone cannot implement different review methods.

4. **One evidence-ranking formula serves incompatible disciplines.** `researchPipeline.ts:230` gives more weight to meta-analyses and RCTs, then incorporates citations, recency, and journal standing. `researchReport.ts:48` generalises this hierarchy in report instructions. Make appraisal depend on the question: intervention effect, experience, historical interpretation, policy transferability, diagnostic accuracy, or economic analysis. Show journal metrics as metadata; do not imply they establish a paper's validity. Explain the sampled basis of a consensus count and avoid confusing it with pooled effect or certainty.

5. **Long research jobs depend on an open connection.** `lib/server/routes/research.ts:157` aborts research when the stream disconnects. Imports already use background processing. Extend that approach to expensive research/review jobs: durable queue, checkpoints, resumable progress, idempotent charging, cancellation, and recoverable partial results. A laptop sleeping or a mobile connection dropping should not destroy paid work.

6. **Project sharing is not yet a complete shared evidence workspace.** Project pages primarily collect tasks; Library access remains user-scoped (`lib/server/routes/library.ts:70`) and matrices use ownership checks (`lib/server/routes/matrix.ts:95`). Add project-owned sources, PDFs, matrices, drafts, reviews, annotations, and consistent permissions. A supervisor should be able to inspect the same evidence behind a conclusion, not just the finished document.

7. **Reference integrations need continuity.** The existing Zotero/Mendeley connections are import-oriented; Zotero requests omit write/group/notes access and imports skip previously seen IDs. Pricing says “sync.” First make reliable incremental one-way updating explicit, with conflict handling and stable identifiers; add group libraries and annotations where demand warrants. Two-way sync is a separate engineering commitment. Verify exported citations in the user's existing writing tools instead of assuming successful file creation means a successful handoff.

8. **International generation is ahead of international retrieval.** Language-aware prompts exist, but planned keyword searches explicitly use English and the default local embedding model is English. UI localisation is separate. Add query expansion in relevant source languages, original/translated quotations side by side, multilingual retrieval evaluation, regional source coverage, and preservation of names, dates, and numbers. `services/convert/README.md:274` explicitly says there is no OCR; scanned reports and archives need page-preserving OCR plus extraction-quality warnings.

9. **Data Lab stores an answer rather than a rerunnable analysis.** Its UI says saved results do not include the dataset (`app/(workspace)/data-lab/page.tsx:272`); uploads require CSV/TSV and some suggested tests are unavailable. Offer an opt-in project dataset or downloadable reproducibility bundle with file hash, data dictionary, cleaning decisions, exclusions, missing-value handling, analysis specification, calculations/code, and software version. Start with XLSX and reliable implemented methods before expanding statistical breadth.

10. **Recurring research work is largely missing.** No complete saved-search, source-change, retraction-notification, or periodic evidence-refresh workflow was found. Add “what changed since last time,” reviewable new evidence, and an update draft that preserves previously approved conclusions. A generated timeline is not an active milestone/reminder system. These features give people a reason to renew after their first successful report.

11. **Institutional use needs more than Team billing.** Project roles, collaboration, and deletion already exist. Organisation admin, managed seats, SSO, shared-library ownership, configurable retention, audit exports, procurement documentation, and deployment/residency choices were not established by this audit. Build these against real institutional requirements. Reconcile privacy disclosures with globally loaded GTM/Clarity and verify private-workspace tracking behavior; this is a product consistency finding, not a legal compliance conclusion.

12. **Onboarding should start with a deliverable.** Role selection currently influences tone/level. Add task, deadline, available sources, intended audience, and success standard. Open a guided project with a concrete first outcome: a journal-club appraisal, a supervisor evidence table, or a country brief. Make progress reflect accepted evidence and completed work, not the number of AI runs.

**Useful competitive and methodological benchmarks**

These establish workflow expectations. They do not prove that users will pay this app for the same features.

| Benchmark | What its official documentation establishes | Implication for this product |
| --- | --- | --- |
| [Elicit systematic reviews](https://support.elicit.com/en/articles/14759154-systematic-reviews-in-elicit) | Staged search, screening and extraction, inspection of extraction quotes, and supported dual-review workflows | Make extracted values inspectable and review decisions persistent |
| [Covidence comparison and consensus](https://support.covidence.org/en/help/comparison-and-consensus) | Independent extraction can be compared and reconciled into final consensus data | Collaboration should happen on evidence and decisions as well as text |
| [Cochrane search guidance](https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-04) | Comprehensive intervention reviews use multiple sources, appropriate vocabulary and documented search methods; trial registers also matter | Distinguish exploratory Deep Research from a reproducible systematic search; support licensed database imports without claiming direct access |
| [Google's source-grounded learning features](https://workspaceupdates.googleblog.com/2025/09/flashcards-quizzes-reports-notebook-lm-google-education.html) | The 2025 announcement documents flashcards, quizzes and customised reports from uploaded material | Exam preparation needs a distinct learning outcome; generic study-aid generation is already a competitive category |
| [Zotero word processor integration](https://www.zotero.org/support/word_processor_integration) | Dynamic citations/bibliographies and reference updates in Word, LibreOffice and Google Docs | Preserve users' existing workflow and assess citation handoff fidelity |
| [Dovetail research repository](https://dovetail.com/solutions/research-repository/) | Vendor-described transcription, tags, themes, source clips/quotes and governed access to research | Qualitative analysis needs a data and annotation model, not another literature-review prompt |
| [AlphaSense financial data integration](https://help.alpha-sense.com/hc/en-us/articles/48564174120595-Financial-Data-Integration-into-Generative-Search) | Combines financial metrics with textual sources and source-linked verification | Finance requires numerical provenance, time periods and structured data |

For medical research, mature appraisal and certainty tools should be selected with qualified methods expertise and their applicable terms. Pooled meta-analysis is a separate validated capability: Deep Research already draws plots of individual estimates, but its own caption distinguishes those from pooled estimates (`lib/server/lib/researchReport.ts:338`).

**Expansion sources and the data they require**

| Expansion | Source opportunity | Product work required beyond a connector |
| --- | --- | --- |
| Humanitarian/country briefing | [ReliefWeb reports API](https://apidoc.reliefweb.int/read/resources/reports/) exposes reports, attachments and country/source/date/language metadata. Its [API documentation](https://apidoc.reliefweb.int/) requires an approved app name and describes reuse terms | Preserve organisation, reporting period, affected population, geography and document versions; distinguish current information from historical context |
| Development and policy indicators | [World Bank metadata APIs](https://datahelpdesk.worldbank.org/knowledgebase/articles/1886695-metadata-api-queries) provide definitions, sources and methodology | Carry indicator definition, unit, geography, period, release/retrieval date, missingness and comparability into every chart and claim |
| Latin American health evidence | [PAHO's BIREME overview](https://www.paho.org/en/bireme/about-latin-american-and-caribbean-center-health-sciences-information) describes LILACS and multilingual DeCS terminology | Evaluate regional coverage and language-specific retrieval; do not treat English-language scholarly discovery as exhaustive |
| Trial evidence | [ClinicalTrials.gov downloads](https://clinicaltrials.gov/data-api/how-download-study-records) support obtaining registry records | Link publications to registrations, separate planned from reported outcomes, track status and dates; assess other regional registries separately |
| Company research | [SEC EDGAR APIs](https://www.sec.gov/search-filings/edgar-application-programming-interfaces) provide US filing histories and XBRL financial data | Retain filing date, financial period, unit, currency, taxonomy and restatement status. SEC coverage is one source collection; broader market coverage requires additional sources |
| Policy briefs | [WHO's EVIPNet explanation](https://www.who.int/europe/news/item/02-12-2020-evipnet-europe-webinars-guide-countries-of-eastern-europe-and-central-asia-eeca-on-how-to-use-research-evidence-in-policy-making-and-develop-evidence-briefs-for-policy) describes evidence synthesis organised around policy options | Add applicability, options, implementation considerations, assumptions, evidence gaps and reviewer approval |

All source expansion requires checking access, licensing, cost, and retrieval quality. A publicly documented API is a feasibility signal, not permission to redistribute every attached document.

**A practical first paid workflow**

Target a researcher who has 25–50 papers and a supervisor deadline. Let them import their collection, choose a question and extraction fields, inspect page-linked evidence, correct the matrix, draft a literature review from accepted findings, invite supervisor feedback, and export a usable Word document plus evidence appendix. Save the whole project and offer a reviewed update when new literature appears.

The valuable unit is the accepted finding with its evidence. Keep these relationships intact:

`Source/version → passage/page → extracted finding → claim → human decision → document/table/slide`

This extends the existing matrix, Library, research, editor and project infrastructure. It offers a coherent first release without waiting for full financial analytics, clinical decision support, or an all-purpose qualitative research system.

Proposed acceptance conditions for this workflow:

- An unavailable or failed claim check is visibly unverified and never counted as support.
- Every extracted value has a source anchor or an explicit unavailable/not-reported status; generated interpretation is labelled separately.
- A supervisor can inspect shared evidence with their actual permission level.
- Closing the browser and returning preserves the job and completed work; retries do not double-charge.
- Large projects retain all referenced sources and review decisions.
- Word export preserves the essential structure, tables and references on a representative document corpus, with limitations shown.
- The user can export their evidence and decisions, so cancellation does not trap their research.

**Priorities and dependencies**

This is a sequence, not a calendar estimate. Effort is relative and should be revised after implementation scoping.

| Order | Work | Why now | Relative effort |
| --- | --- | --- | --- |
| P0 | Verification unknown states, coverage display, source-basis labels, accurate product claims | Trust underpins every audience and paid workflow | Small–medium |
| P0 | Durable jobs, complete result storage, evidence anchors | Protect paid work and make outputs inspectable | Medium–large |
| P1 | Project evidence collection and supervisor review; finish the literature-review deliverable | Closest shared need across existing target users | Large, but reuses substantial current work |
| P1 | OCR and robust document/citation handoff | Unlocks real source material and practical submission | Medium–large |
| P1 | Full-text screening/extraction, independent decisions, audit history for review teams | Makes the existing systematic-review workspace credible for serious use | Large; methods expertise required |
| P2 | Saved searches, evidence updates, incremental reference imports | Creates repeated use and reduces duplicated work | Medium–large |
| P2 | Multilingual retrieval and regional-source evaluation | Supports evidence coverage across countries and disciplines | Medium–large |
| P2 | Reproducible Data Lab projects, XLSX, clearly scoped methods | Helps dissertation and programme-analysis workflows | Medium–large |
| P3: choose one | Qualitative workspace OR policy/NGO evidence briefs | Adjacent expansion after user evidence identifies the stronger market | Large |
| P3: demand-led | Organisation administration, SSO, governance and procurement support | Necessary for some institutional buyers, less urgent for self-serve students | Large |
| Later | Broad financial platform, extensive licensed databases, patent intelligence, full exam-prep product | Separate source economics, workflows and competitors | Very large |

Do not build all expansion branches simultaneously. A narrow filings-to-memo pilot can be researched earlier without committing to broad financial coverage. Likewise, existing field-data tools can feed an NGO workflow before building a new form collection platform.

**Payment and packaging hypotheses**

The current code defines Plus at $12/month or $96/year and Pro at $29/month or $228/year (`lib/server/lib/plans.ts:163`). It also provides top-ups and a $49, 90-day Defence Pass. These are implemented prices, not evidence that they match demand; production configuration and checkout were not verified here.

Keep experiments centred on outcomes:

- **Individual research:** recurring literature work, enough capacity for a meaningful project, easy evidence export, predictable usage.
- **Project/semester pass:** build on the existing Defence Pass for deadline-driven users; test whether the period and allowance fit a dissertation or course project.
- **Research team:** shared evidence, reviewer workflow, ownership continuity, pooled administration and invoicing. Define permissions and ownership before promising an institutional Library.
- **Institution:** sell only after the organisation's identity, retention, procurement, and support requirements are concrete.

Test local-currency presentation, student affordability, and payment completion with users in the target markets. USD pricing and disabled purchasing-power pricing were found; local payment-method availability was not established. Do not infer that a payment provider lacks a specific rail such as UPI. Do not set prices from nationality or university prestige.

Explain credits through example jobs, likely cost, and a maximum before execution. Integrity, access to saved work, and honest verification states should be baseline qualities on every plan. Higher tiers can buy capacity, richer workflows and administration.

**Validation before a broad build**

Recruit a small discovery cohort: for example, five doctoral researchers, five medical students currently doing research, and three supervisors or small-team leads. Separately interview a few policy/NGO analysts and financial analysts to determine whether their sources and deliverables fit an adjacent pilot. These sample sizes are practical starting points, not statistical evidence of market demand.

Ask each person to bring a recent task, their sources, their current tools, the final deliverable, and the corrections they had to make. Establish who pays and which tools their institution already provides. Observe work rather than asking whether a feature sounds useful.

Run a manually supported pilot of the literature-review workflow and compare:

- Time to first usable evidence table and final export, including correction time.
- Source coverage, extraction accuracy, unsupported claims and explicit unknowns, assessed against a human-reviewed sample.
- Supervisor acceptance and the amount of citation/format repair required.
- Whether the person returns with another task or updates the same project.
- Actual paid conversion or paid pilot commitment, renewal, and cancellation reasons.
- Provider, compute, storage, payment and support costs per completed outcome.

Set quality gates before running the evaluation. Use representative tasks across fields and languages rather than a single impressive demo. The editor already has analytics hooks, but its host passes a no-op event callback (`components/app/EditorHost.tsx:31`); measure completed workflows while keeping research content out of analytics.

The immediate commercial hypothesis is that researchers will pay to reduce the work of assembling, checking, sharing and submitting evidence. The audit supports building and testing that hypothesis first; it does not yet establish product-market fit.
