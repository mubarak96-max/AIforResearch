# Product opportunity implementation

This is the implementation companion to [the opportunity audit](product-opportunity-audit-2026-11-12.md). It describes code added to the existing product, not a claim that every proposed market, provider or production configuration has been validated.

## Revision after code review (12 November 2026)

A review found that the first pass built every expansion branch at once, against the audit's "P3: choose one" advice, and left the workbooks disconnected from the literature-review chain. Changes:

- **Scope.** Research and qualitative workbooks are the supported product. Study, policy, finance, humanities and R&D workbooks, and the World Bank, ReliefWeb and SEC connectors, are switched off by `WORKBOOK_FEATURES.expansionWorkbooks` in `lib/workflows.ts` (a code constant, not an environment variable). Existing workbooks of any kind stay readable and editable. Trial registries remain available because they serve the medical literature review.
- **One chain, not parallel tools.** A research workbook can import studies included at full text from a systematic review, build an evidence matrix from its Library sources, and open a draft literature review (evidence table, appraisal table, outline with quotations) in the existing editor. A qualitative workbook opens a findings report: codebook, then each theme with supporting excerpts and, separately, negative and mixed cases. The workbook records each matrix, document and review it is connected to.
- **Navigation.** One sidebar entry ("Workbooks"); trial registries and saved searches sit under Find Papers with a shared sub-navigation. Home has one main action (Ask); "Plan a deliverable" is a task tile. The catalog has one Workbooks entry instead of seven.
- **Naming.** URLs and the API are `/workbooks` and `/api/workbooks`. The Firestore collection keeps its `workflows` name, so no data migration is needed.
- **Storage.** Source texts are stored one per record beside the workbook, so a workbook no longer fills up after about five long sources. Recall practice is stored per person and never changes the shared revision, so practising cannot block an editor's save.
- **Reliability fixes.** Stuck research tasks can be deleted; the background-job time limit fails once with one refund instead of three paid retries; superseded storage objects are deleted; a late agreeing title vote no longer erases full-text work; votes lock once other decisions are visible; departed members' matrix sources are frozen as snapshots; Auth-trigger deletion completes for Team owners; shared workbooks and monitors pass to the project owner when a member deletes their account; saved-search runs with no changes no longer wait for review. See the tests added alongside each change.

## Product and compatibility rules

- Workflows follow audiences, methods and deliverables. There is no country, nationality, university or location eligibility rule. Language, currency, source collection and geographic evidence scope are task settings.
- The existing Next.js/Hono/Firebase application, editor, converter, collaboration service, accounts, plans and project roles remain in use. No hosting migration, framework replacement or broad refactor was performed.
- Existing personal libraries and documents stay personal until a user explicitly shares or imports their material into a project/workbook. Existing individual pricing and payment-provider configuration remain unchanged.
- New source integrations, OCR, institutional identity and background research are optional. Deployment configuration was not changed by this implementation.

## Where the new work connects

| Entry point | Working capability | Connection to the existing app |
| --- | --- | --- |
| Workbooks: plan a deliverable | Task, audience, deadline, available sources and success criteria; creates a saved workbook; in-app due/overdue milestone reminders | Existing Ask box and research-profile prompt remain; suggested next steps open the existing research, writing, appraisal and presentation tools |
| Workbooks | Research/appraisal and qualitative analysis (study, policy, finance, humanities and R&D behind the expansion flag) | Personal or shared using existing project roles; imports Library evidence; reviewed AI suggestions use existing credits; JSON, Markdown, CSV and Excel exports |
| Projects | Shared source snapshots, copied PDFs, exact quotations, reviewer decisions, connected workspace list and review inbox for findings, submitted workbooks, visible screening conflicts and pending updates | Existing tasks/members remain; matrices and workbooks can share the project; approved evidence opens in the current editor for Word/PDF handoff |
| Evidence updates | Saved searches, sampled changes, DOI correction/retraction notices, review journal and manual/scheduled checks | Existing scholarly/web/Library search adapters; in-app alerts and Home continuation; no automatic rewriting of conclusions |
| Official sources | Trial registrations with publication links and separate registered/posted outcome descriptions; indicator metadata/observations; configured humanitarian reports and company-filing/XBRL records | Explicit Library/workbook saves with provider, retrieval date, source dates, units, identifiers and snapshot digest |
| Systematic Review | Linked full text, page/quote extraction, blinded human decisions, adjudication, method-specific appraisal and decision history | Extends the existing protocol, screening, extraction, PRISMA and methods screens |
| Data Lab | Local XLSX reading, selected worksheet, dataset fingerprints, analysis specifications, missing-value counts, change notes and rerunnable bundles | Existing calculations and History; saving raw data is a separate opt-in, off by default |
| Library connections | Safe repeated imports with local-edit conflict preservation; explicit Zotero group selection | Existing import jobs, collections, checkpoints and provider credentials; no write-back or silent permission expansion |
| Account and sign-in | Consent settings and optional configured institutional sign-in | Existing Google/password flows and Firebase identity remain; private product events use content-free first-party aggregates |
| Account: Team | Managed roster, owner/admin/member roles, invited seat acceptance, safe leave/removal and complete membership audit export | Requires an already-provisioned Team plan; uses existing pooled credits without changing prices, payment provider or project/document access |

## Audience-specific data and actions

**Researchers, medical students and supervisors:** research questions, source-backed findings, study design/sample/comparison/outcomes, bias/applicability notes, deliverable outline and milestones. Reviewers can inspect the same shared source snapshot and record approval or requested revisions. A source with only an abstract is labeled accordingly. Research appraisal and trial discovery are not clinical decision support or validated pooled meta-analysis.

**Qualitative researchers:** editable codebook, inclusion/exclusion guidance, exact coded excerpts, participant/speaker labels, transcript line anchors, negative cases, themes, memos and redaction. Transcript import previews the text and proposed anchors before saving. Source edits that would detach saved quotations are refused. There is no speech-to-text service or automatic claim that generated themes are final findings.

**Students:** learning objectives, rubric criteria, course AI-use rules, argument/counterargument plans, source-linked practice cards and private spaced-recall history. Saved cards are presented without their answers first. This is an editable learning workflow, not a licensed question bank, validated examination predictor or institution-specific grading service.

**Policy, government and NGO analysts:** option/benefit/cost/risk/equity/implementation records, indicator definitions and units, baseline/target/actual comparisons, disaggregation, theory-of-change entries, brief sections and reviewer decisions. CSV/TSV imports provide a preview and validate all proposed entries before an atomic save. Geographic scope describes the evidence rather than the user's access.

**Financial analysts:** source-linked reported metrics with accounting definition, currency, unit/scale, period, filing date and restatement status; compatible comparison groups; separate scenario assumptions and analytical memos. SEC is a source collection, not a claim of worldwide licensed coverage. Currency conversion, price feeds and full filing-table extraction are not silently inferred.

**Humanities researchers:** primary/secondary sources, editions, original-language quotations, separate translations, close-reading annotations, interpretations and counter-readings. Method-specific retrieval removes the universal clinical ranking default.

**Engineers and R&D teams:** patent family/claim references linked to exact supplied passages, standards/version/clause records, benchmark environment/data/code/split notes and technical tradeoffs. These records organize evidence; they do not establish patent validity, freedom to operate or comprehensive patent-family coverage.

## Reliability and evidence changes

1. Failed, missing and malformed verification responses remain **unverified**. Cited-sentence coverage records attempted/completed checks and depth limits. Uncited prose is a separate conservative review queue, not an exhaustive factual-claim classifier. DOI identity, notice lookup, model support and human approval remain distinct.
2. Large saved results use immutable, SHA-256-checked object-storage payloads instead of truncating source arrays. Permission checks precede hydration. Missing or corrupt evidence returns an explicit error. Existing small/legacy inline task results remain readable.
3. Optional background research saves inputs, uses leased Firebase jobs, saves partial progress, retries transient failures, checks cancellation and settles terminal refunds transactionally. Duplicate worker delivery does not charge or refund twice. Retries restart the pipeline from saved inputs; they are not exact resumption of the last model call. Submitting a separate new research request remains a separate job.
4. Project evidence copies source text and an available PDF into project storage. A later change to the creator's personal Library file does not replace that snapshot. Findings require an exact source quotation; an independent project reviewer records approval with a note. Project export includes decision histories and per-resource revisions.
5. Shared matrices follow current project permissions. Slow AI extraction cannot overwrite a newer manual correction. Model values without a matching source quotation are not presented as completed extraction. Source, structure and cell changes retain an audit history going forward. Opening a matrix in the existing editor preserves its table and adds a quotation/page/DOI appendix; it does not create dynamic word-processor citation fields.
6. Systematic-review full-text suggestions require an attached text snapshot; abstracts are not silently substituted. Source replacements invalidate dependent full-text decisions/extraction. Other human votes are concealed until the appropriate independent decision has been made. AI remains labeled as a suggestion.
7. Workbooks reject stale revisions and oversized imports rather than silently dropping records. Current bounds include 500 entries per workbook and 250 imported entries per operation. Full source text remains in JSON; spreadsheet exports disclose when raw text is excluded. Review decisions retain the reviewer, revision, date and rationale after later edits. Explicit redaction also scrubs historical rationale and records that redaction. Library source selectors provide search and unfiltered pagination; the existing search coverage limit is disclosed, and browsing can reach older sources.
8. Data Lab keeps raw data local by default. A saved dataset requires explicit consent and a matching hash. Reproduction imports reject altered data and incompatible calculation versions. Formula cells are never executed during XLSX import.
9. Consent is explicit, expires, and separates public analytics from public recordings. Private/auth/tool pages exclude GTM and Clarity. Allowlisted editor-event aggregates contain no source text, question, document, session, account or user identifier.

## Optional activation in the current infrastructure

| Capability | Configuration / deployment prerequisite | Default behavior |
| --- | --- | --- |
| Background research | Deploy `onResearchJobWritten` and `recoverStuckResearch` in the existing Functions project, with the same Storage/Firestore access and research-provider settings. Then set `researchJobsEnabled: true` in `lib/server/env.ts` (a code constant, not an environment variable). | Existing streaming research remains in use |
| Scheduled monitoring | Deploy `checkSavedResearch` in the existing Functions project. It calls the same adapters and needs their existing configuration. | Manual checks are available; code does not claim a scheduler is deployed |
| OCR | None: the converter image installs Tesseract (English) and OCR settings are fixed in code; add language packs in the Dockerfile. See [converter instructions](../services/convert/README.md). | On after the next converter build; without Tesseract, scanned pages are reported as unread |
| Institutional identity | Configure an actual Firebase SAML/OIDC provider, then expose its public ID through `FIREBASE_SSO_PROVIDERS`. | Existing sign-in choices remain |
| ReliefWeb | None: the approved appname `mutesasira-aiforresearch-nQO9kmOfXv` is set in code | Available whenever the expansion connectors are on |
| SEC | None: the User-Agent `AIforResearch support@aiforresearch.app` is set in code | Available whenever the expansion flag is on |
| Zotero groups | User explicitly supplies a key with the needed group read permissions | Existing personal-library read scopes unchanged |

New data uses the existing server-authorized Firestore/Storage paths. Browser access remains closed by the existing default rules. Collections include `workflows` with events, `research_monitors` with runs, `research_jobs`, project evidence/findings/reviews, matrix events and daily `product_event_totals`. Task payloads live under `tasks/{id}`, and shared snapshots under `project-evidence/{projectId}`. Project/account deletion handles the new owned records and detaches surviving collaborators' workspaces.

Project ownership transfer requires a request by the existing owner and acceptance by the named joined member before expiry. The previous owner becomes an editor. This transfers the project, not every participant's personal task/Library/document ownership. Retention settings currently record a review date and notes, with a due indicator; they do not enforce automatic deletion or certify a retention policy.

Managed Team governance is activated by a verified platform administrator for an existing eligible Team account. It cannot grant a paid plan or increase purchased seats. Joining requires an explicit invitation and verified acceptance; personal accounts with payment history, subscription entitlements or top-up balances are not silently migrated. Leaving restores the reserved personal/free account and retains existing project/document ACLs. At least one active owner must remain. Billing actions use designated ownership, and cached sign-ins reload account membership before metered requests. See [Team setup and limits](team-seat-management.md). No account was provisioned or invited during this code change.

Deleting a project freezes matrices that contain collaborator contributions into read-only archives, retaining recorded values and audit history with bounded source summaries. An archive cannot follow live references into another person's Library. Purely personal-source matrices can return to the creator's private workspace. The UI labels the archived state; new editing requires a new matrix.

## Acceptance and outstanding validation

Automated tests cover verification failures, multilingual identity, provider response contracts, source hashes, storage access, background-job settlement/races, exact quotes, shared-project permissions, transfer acceptance, blinded review behavior, source invalidation, import conflicts, dataset reproduction, bounded XLSX/CSV parsing, privacy and configured identity choices. The editor handoff now has a representative structural test and preserves escaped table separators.

The final integrated run passed **478 tests across 48 files**, including the final matrix handoff, project review inbox, trial links, workbook continuity and concurrent permission-change checks. App, Functions and collaboration-service TypeScript checks passed. `git diff --check` passed. The existing memory-hard imported-password test exceeds its default five-second limit on this machine; integration runs use `--testTimeout=20000` without changing the password implementation or that test's assertions.

Browser UI verification is outstanding: the browser access host is unavailable and read-only requests to the already-running local server timed out. A new preview server was not started because the existing port is occupied; that process was left untouched. Python/Docker and a reachable converter were unavailable, so actual OCR and real DOCX round trips were not executed. The DOCX fixture-generation check passed; [the compatibility runner](../tests/compat/README.md) exercises the real converter when configured.

The production build **did not pass validation**. An isolated copy with the original configuration and dependencies completed font loading, server compilation and edge compilation, then stalled during early client compilation. Its process accumulated roughly 8.6 GB of private memory without further completed trace events, and was stopped. The completed-event trace does not identify the failing loader; CSS/dependency processing needs diagnosis in a clean build environment. Temporary build copies were removed, the existing development server was left running, and the last trace is retained locally at `dist/product-build-validation-trace-20261112.jsonl`. No production configuration was changed or deployment performed.

The following audit ambitions are still separate acceptance or integration work, and must not be sold as implemented guarantees:

- Live identity-provider handshake, scheduled-function behavior, real OCR language packs and live connector access need testing in a configured environment.
- Multilingual retrieval quality needs a representative evaluation corpus; UI localization and region-specific database completeness are not established by language-aware query planning.
- Dynamic two-way reference synchronization, Word/Docs citation-field synchronization, annotations from every reference provider, licensed financial feeds and comprehensive patent/standards databases are not provided by one-way snapshots.
- Validated meta-analysis, formal certainty-of-evidence instruments, institutional procurement/compliance commitments, deployment residency choices and automatic retention enforcement need explicit requirements and acceptance work.
- User discovery, supervised pilots, willingness to pay, longitudinal retention and actual unit economics cannot be established by shipping code. The audit's validation plan remains necessary.

Detailed notes: [source extraction and references](reference-imports-and-extraction.md), [identity and analytics](optional-identity-and-analytics.md), [official-source adapters](official-source-connectors.md), [document compatibility](../tests/compat/README.md).
