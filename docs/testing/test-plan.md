# AI for Research: feature test plan

Every feature of the app, with test data and the expected behaviour, written for whoever tests the app by hand before launch.

Each case gives an input and what should happen. Work through a section top to bottom. Where a case says **(Free)**, **(Plus)** or **(Pro)**, use that account.

**Sample files:** paths like `samples/…` are in the repository. [samples/README.md](../../samples/README.md) explains them and lists the errors planted in each.

**Numbers you can trust:**

- **Statistics:** every expected value quoted for Data Lab has a test behind it (`tests/server/data-lab-stats.test.ts`, `tests/server/sample-files.test.ts`).
- **AI output varies,** so for AI features the expected behaviour describes what must be true of the result, not its exact wording.

---

## 0. Before you start

### 0.1 Environment

| Step | Expected |
| --- | --- |
| `pnpm install`, then `pnpm dev:all` (Firebase emulators plus the app) | The app runs at the address the script prints. The emulator UI opens. Sign-in, Firestore and Storage use the emulators, not production. |
| `.env.local` has an LLM provider key and paper-source keys | `GET /api/health` returns `{ ok: true, llm: "<provider>", … }`. If the LLM is missing, AI buttons fail with a clear "not available" message and **no credits are taken**. |
| Dodo Payments in test mode | Checkout opens Dodo's test page. Test cards complete without real money. |
| Optional services (converter for Word/PDF/OCR, collaboration server, Functions for background research and scheduled monitors) | Covered in their own cases below. Without them, the features that need them say so clearly instead of failing silently. |

### 0.2 Test accounts

Make these accounts once and reuse them throughout:

| Account | How | Used for |
| --- | --- | --- |
| **Free A** | Sign up with email and password | Limits, previews, upgrade prompts |
| **Free B** | A second free account | Sharing, collaboration, blinded review |
| **Plus** | Free account, then upgrade with a Dodo test card | Paid features, top-ups |
| **Pro** | Upgrade to Pro | High quality, parallel jobs |
| **Team owner** and **Team member** | A Team plan, provisioned by a platform admin (see [team-seat-management.md](../team-seat-management.md)) | Pooled credits, roles |
| **Signed out** | A private browser window | Public site, free tools, survey form |

### 0.3 Checking credits

- **Where to look:** the credit meter at the bottom of the left navigation shows credits left and the renewal date.
- **Before a job:** every AI start button shows its cost first.
- **Refunds:** for every paid job, note the meter before and after. A job that fails must give its credits back. Test this at least once per area: stop the LLM, or disconnect the network mid-job.

### 0.4 Current prices and limits

From `lib/server/lib/plans.ts`:

| Job | Credits |
| --- | --- |
| Summary answer, chat, PDF question, AI edit, Deep Research follow-up | 1 |
| Editor check, claim check, AI citation sentence check, survey questionnaire check | 2 |
| Section, abstract, thesis module, survey question draft, clinical-audit plan, Data Lab AI report (2) | 3 |
| Deep Research report | 15 |
| Detailed report (paid plans only) | 45 |
| Whole draft (paper, proposal, literature review, case report, policy brief, evaluation report, annotated bibliography) | 15 |
| Document review, standard / high quality / Free preview | 10 / 30 / 3 per 10,000 words |
| Reporting-guideline check | 5 per 10,000 words |
| Slide deck | 10 |
| Systematic review AI screening | 1 per 25 records |
| High quality (Pro) | × 3 |

| Limit | Free | Plus | Pro |
| --- | --- | --- | --- |
| Credits a month | 45 | 750 | 1,500 |
| Deep or Detailed reports a day / at once | 2 / 1 | 15 / 1 | 40 / 3 |
| Autocompletes | 10 a day | 5,000 a month | 20,000 a month |
| Library PDFs, file size | 25, 10 MB | unlimited, 50 MB | unlimited, 100 MB |
| Projects, people per project | 1, 1 | 10, 3 | unlimited, 10 |
| Systematic reviews, records | 1, 50 | many, 10,000 | many, 10,000 |
| Surveys, responses per survey | 3, 100 | many, 5,000 | many, 5,000 |
| LaTeX and PowerPoint export, Zotero and Mendeley | no | yes | yes |
| Free tools without an account | 3 runs a day | | |

---

## 1. Accounts and sign-in

| # | Case | Input | Expected |
| --- | --- | --- | --- |
| 1.1 | Sign up with email | `tester+free@example.com`, password `Test-pass-2026!` | Account created, confirmation email sent (visible in the emulator), lands on **Home** |
| 1.2 | Weak password | `abc` | Refused with a reason; no account created |
| 1.3 | Existing email | Sign up again with the same email | A clear "already registered" message that offers sign-in |
| 1.4 | Sign in, wrong password | Correct email, wrong password | A generic error; the attempt is rate-limited after repeated tries |
| 1.5 | Google sign-in | Google account (emulator) | Signs in; a second Google sign-in reaches the same account |
| 1.6 | Forgot / reset password | Email from 1.1 | A reset email arrives; the link sets a new password; the old one stops working |
| 1.7 | Institutional sign-in | Only if `FIREBASE_SSO_PROVIDERS` is set | The institution button appears on sign-in; without the setting it does not |
| 1.8 | Imported (legacy) password | A user with an imported password hash | Signs in with the old password and is moved to a normal account; later sign-ins use the normal path |
| 1.9 | Sign-in methods | Account → Sign-in methods: add Google to an email account, then remove one | Both methods work; the last remaining method cannot be removed |
| 1.10 | Profile and role | Account: change the name and the research role (e.g. Master's → Clinician) | Saved; later AI output is pitched at the new level |
| 1.11 | Privacy choices | Change the cookie and analytics settings | Analytics (GTM, Clarity) load only on public marketing pages and only after consent; never on `/home`, `/editor`, tools or `/s/…` |
| 1.12 | Theme | Toggle dark mode | Every page, including charts, is readable in both themes |
| 1.13 | Delete account | Free B: Account → Delete | Documents, Library, history, surveys and their responses, and owned systematic reviews are deleted. Shared project work passes to the project owner. Signing in again fails. |
| 1.14 | Protected pages signed out | Open `/home` signed out | Redirected to sign-in, then back to `/home` after signing in |

## 2. Billing, credits and plans

| # | Case | Input | Expected |
| --- | --- | --- | --- |
| 2.1 | Pricing page | `/pricing` | Free, Plus ($12 a month / $96 a year), Pro ($29 / $228) and Team (contact). The credit table matches section 0.4, including "Reporting-guideline check 5". |
| 2.2 | Upgrade | Free A → Plus monthly, Dodo test card | The plan changes after payment; the credits allowance is 750; no double charge after a page refresh |
| 2.3 | Cards | Add a second card, make it the default, delete the old one | The list updates; the default card cannot be deleted while it is the only one |
| 2.4 | Customer portal | Billing → Manage | Opens Dodo's portal |
| 2.5 | Cancel and resume | Cancel, then resume before the period ends | Cancelling keeps the plan until the period ends; resuming clears the end date |
| 2.6 | Top-up | Plus: buy 500 credits ($7) | Credits rise by 500 and last 12 months; **Free** cannot buy top-ups (they are offered after upgrading) |
| 2.7 | Defence Pass | Free: buy the Defence Pass ($49) | 90 days of Pro, no renewal. On an account that already has a subscription it becomes 4,500 top-up credits instead. |
| 2.8 | Out of credits | Spend a Free account down to 2 credits, then start a Deep report | The upgrade or top-up dialog opens; the job does not start |
| 2.9 | Refund on failure | Start a Deep report, then stop the LLM (or go offline) | The task fails and the credits return |
| 2.10 | Feature gates | Free: Detailed depth, High quality, LaTeX export, PowerPoint download, Zotero | Each opens the upgrade dialog with the reason |
| 2.11 | Team | Owner invites a member's email; the member accepts | The member uses pooled credits; roles are owner, admin and member; the last owner cannot leave; the audit export lists membership changes |

## 3. Home, navigation and All tools

| # | Case | Input | Expected |
| --- | --- | --- | --- |
| 3.1 | First visit | New account → Home | A one-time role question; the Ask box; task tiles including "Plan a deliverable" |
| 3.2 | Ask box | *Does sleep after learning improve memory in students?*, depth Summary | Runs on `/deep-research` and shows its cost (1) first |
| 3.3 | Continue where you left off | After a few jobs | Home lists the latest tasks; each one reopens where it was made |
| 3.4 | Navigation | Click every item in the left navigation (including **Surveys**) | Every page loads; the current item is highlighted |
| 3.5 | Phone | Width 375 px | A tab bar (Home, Research, New research, Library, Docs) and a menu sheet; no sideways scrolling |
| 3.6 | All tools | `/all-tools`, search "CONSORT", then "kaplan" and "questionnaire" | Finds Reporting-guideline check, Data Lab and Survey builder; each card shows its credit cost and opens the right page |

## 4. Research

### 4.1 Deep Research (`/deep-research`)

| # | Case | Input | Expected |
| --- | --- | --- | --- |
| 4.1.1 | Summary | *Does sleep after learning improve memory consolidation in students?*, All papers | A short cited answer; [S1]-style markers link to real sources; cost 1 |
| 4.1.2 | Deep | Same question, Deep | A report with figures and a consensus line ("n of m studies…"); tabs Cited / All read / Web; cost 15 |
| 4.1.3 | Detailed (Plus) | *Is living near urban green space associated with better mental health?*, Medical + All papers | A plan to review first, then a 5,000+ word report with a study table; cost 45; Free gets the upgrade dialog |
| 4.1.4 | Filters | Study type: Systematic review + Meta-analysis; years from 2015 | The cited sources respect the filters; retracted papers are left out by default |
| 4.1.5 | File attachment | Attach `samples/reviewer/thesis-chapter-2-sleep-memory.pdf`, ask *What gaps does my chapter leave open?* | The answer cites the file as "Your file" alongside papers |
| 4.1.6 | Headings off, High quality (Pro) | Toggle each | No headings; HQ costs ×3 and is Pro-only |
| 4.1.7 | Follow-up | *What about naps?* | A follow-up answer for 1 credit that keeps the earlier sources |
| 4.1.8 | Verification states | Any Deep report | Each checked claim shows supported / partly / not supported / **unverified**. A failed check shows "unverified", never "supported". |
| 4.1.9 | Daily limit (Free) | A third Deep report in a day | Refused with the daily limit message; no credits taken |
| 4.1.10 | Cancel | Cancel mid-run | Stops; credits for an unfinished job are returned |
| 4.1.11 | Background jobs | Only if `RESEARCH_JOBS_ENABLED=1` and Functions are deployed: start a Deep report, close the tab, come back | The job finishes in the background and opens from History; one charge only |
| 4.1.12 | Build on this | From a report: Write a literature review / Make slides / Systematic review / Open in editor | Each opens with the report and its sources carried over; the editor has live citations |
| 4.1.13 | Save cited papers | Save | The papers appear in the Library, without duplicates on a second save |

### 4.2 Find Papers (`/papers`)

| # | Case | Input | Expected |
| --- | --- | --- | --- |
| 4.2.1 | Search | *green space cortisol*, All papers, sort Most cited | Ulrich 1984, Roe 2013 and Twohig-Bennett 2018 near the top; no credits |
| 4.2.2 | Filters | *napping night shift workers alertness*, Medical + Preprints, last 10 years, Randomized controlled trial | Every row is within the years and labelled with a study type; preprints are flagged |
| 4.2.3 | Retractions | Search *STAP cells Obokata* with "include retracted" on, then off | Shown with a Retracted flag when on; hidden when off |
| 4.2.4 | Save and cite | Save a paper; open its citation map | It appears in the Library; the citation map opens on that paper |
| 4.2.5 | Nonsense query | `zzqxv` | "No results", not an error |

### 4.3 Citation Map, Landscape, trial registries and saved searches

| # | Case | Input | Expected |
| --- | --- | --- | --- |
| 4.3.1 | Citation Map | DOI `10.1038/nrn2762` | A graph of references and citing papers by year, and a list; no credits |
| 4.3.2 | Snowball | Add 3 papers to the set, snowball both directions | Candidates ranked by how many set papers link to them; the set is saved with the task |
| 4.3.3 | Reviews citing the set | Button | Reviews and meta-analyses that cite the set |
| 4.3.4 | Export | RIS and CSV | The files open in Zotero and Excel |
| 4.3.5 | Landscape | *sleep memory consolidation*, from 2000; compare *urban green space mental health* with *blue space mental health* | Works per year, topics, journals, authors, institutions and open-access share; two series when comparing |
| 4.3.6 | Trial registries | `/official-sources`: *intermittent fasting type 2 diabetes* | ClinicalTrials.gov registrations, with registered and posted outcomes kept separate; save to Library with the retrieval date |
| 4.3.7 | Saved search | `/monitoring`: save *green space mental health adults*, run now | The first run records a baseline; a later run shows only what is new, plus DOI corrections and retractions; a run with no changes needs no review |
| 4.3.8 | Expansion sources | With `WORKBOOK_FEATURES.expansionWorkbooks = true` (lib/workflows.ts) only: World Bank indicator `SH.STA.SMSS.ZS`, ReliefWeb, SEC company `Apple` | Data with units, period and source date; with the flag off, these are hidden |

## 5. Library and reference import

| # | Case | Input | Expected |
| --- | --- | --- | --- |
| 5.1 | Upload a PDF | `samples/reviewer/research-proposal-green-space-nairobi.pdf` | Listed with its title; text extracted |
| 5.2 | Chat with PDF | Ask *What sample size does the proposal plan?* | "About 250", citing the page; 1 credit |
| 5.3 | Scanned PDF | A photographed or scanned page (any image-only PDF) | With the OCR converter: text is read, with a quality warning. Without it: "scanned pages could not be read". It never pretends to have read them. |
| 5.4 | Limits (Free) | A 26th PDF, or a file over 10 MB | Refused with the limit and an upgrade link |
| 5.5 | Folders | Create a folder, move papers into it | Kept after a reload |
| 5.6 | Import a file | `samples/systematic-review/green-space-wos-export.ris` | 10 references imported; a second import of the same file adds no duplicates |
| 5.7 | Import by IDs | Paste `10.1038/nrn2762` and `10.1126/science.6143402` | Two papers with metadata |
| 5.8 | Zotero (Plus) | Connect with an API key; import a collection; edit an item in Zotero; import again | The second import updates the item; a local edit you made is kept and the conflict is shown; group libraries appear only if the key has group access |
| 5.9 | Mendeley (Plus) | Connect with OAuth; import a folder | As for Zotero |
| 5.10 | Delete | Delete a paper | Removed; documents that cite it keep the citation text |

## 6. Editor and documents (`/editor`)

| # | Case | Input | Expected |
| --- | --- | --- | --- |
| 6.1 | New document and templates | New → Research proposal template | Opens with the proposal headings |
| 6.2 | Autocomplete with citations | Type *Sleep after learning improves* and wait | A suggestion with a real citation; Tab accepts it; Free stops after 10 a day |
| 6.3 | @-cite | Type `@Diekelmann` | Shows Library and paper search results; inserts a citation |
| 6.4 | Citation style | Switch APA → Vancouver → Chicago | Citations and the reference list reformat |
| 6.5 | AI edit | Select a paragraph of `samples/writing/draft-discussion-rough.md` → Improve | A suggestion shown as a change; accept or reject; 1 credit |
| 6.6 | AI chat panel | Ask about the open document | Answers with document context; 1 credit |
| 6.7 | Checks | Claim check / Proofread / Tone / Source quality on a paragraph | Results attached to the text; 2 credits each |
| 6.8 | Peer review | Whole document | Comments in the margin; 10 credits |
| 6.9 | Comments and AI replies | Add a comment, ask AI to reply | Reply threaded; 1 credit |
| 6.10 | Suggestions mode | Turn on suggestions and edit | Tracked insertions and deletions; accept or reject each |
| 6.11 | Versions | Save a named version, edit, restore it | The document returns to the saved version; the history lists both |
| 6.12 | Collaboration | Share with Free B as editor; both edit at once (needs the collab server) | Both see live cursors and changes; no lost text after both reload |
| 6.13 | Sharing roles | Share as viewer, then commenter | The viewer cannot edit; the commenter can only comment |
| 6.14 | Word import | `samples/reviewer/thesis-chapter-2-sleep-memory.docx` | Headings, paragraphs, tables and references come through (needs the converter) |
| 6.15 | Export | Word, PDF; LaTeX (Plus) | Files open correctly; tables and references are kept; Free gets the upgrade dialog for LaTeX |
| 6.16 | Write with AI | A heading plus "Write this section" | A draft streamed into the document, with citations |
| 6.17 | Authorship report | Write for a few minutes; create a report; open its `/verify/<id>` link signed out | The report shows how the document was written (typing and AI assistance); the public verify page confirms the report is genuine. Check that it shows no more of the document than the report intends. |
| 6.18 | Offline | Disconnect the network while typing, then reconnect | Edits are kept locally and sync afterwards |

## 7. Writing Studio (`/write`)

Run each module once. Every module should do four things:

- Show its cost before it runs.
- Stream the result.
- Save the result to History.
- Offer **Open in editor**.

| # | Module | Test data | Expected |
| --- | --- | --- | --- |
| 7.1 | Article with evidence | *Why sleep matters for learning*, general reader | Cited article; no invented sources; 15 credits |
| 7.2 | Literature review | *sleep and memory consolidation in university students*, organised by theme | Themes compared across studies, not summarised one by one; a gaps section |
| 7.3 | Research paper | Title only, with no study details | IMRaD with **[placeholders]** in Methods and Results; no invented data |
| 7.4 | Section writer | Discussion; paste `samples/writing/draft-discussion-rough.md` as notes | One section; 3 credits |
| 7.5 | Abstract | Paste the thesis chapter text; structured, 250 words | Uses only facts from the text; 5 keywords |
| 7.6 | Improve document | `samples/writing/draft-discussion-rough.md`, Proofread | Paragraph by paragraph, the original beside the change; fixes "results… shows" and "would of"; 1 credit per 2,000 words |
| 7.7 | Paraphrase | `samples/writing/draft-introduction-rough.txt` | Same meaning, numbers and citations; new wording |
| 7.8 | Fill a template | Template list | Lists IMRaD, Literature review, … Poster. It does **not** list the five blank-only templates (case report, clinical audit, evaluation report, policy brief, annotated bibliography). |
| 7.9 | **Case report (CARE)** | Topic *Kikuchi disease presenting as fever of unknown origin*; case = `samples/writing/case-notes-kikuchi.txt` | CARE headings, timeline table and differentials (TB, lymphoma, lupus). Doses and results exactly as in the notes. **The patient's name, hospital and date are left out**, with a "Check before submission: identifiers removed" line. [Placeholders] for patient perspective and consent. Literature appears only in the Introduction and Discussion. 15 credits. |
| 7.10 | Case report: short format | Same, format "Conference abstract" | About 300 words |
| 7.11 | **Clinical audit: plan** | *VTE risk assessment within 24 hours of admission*, Write = plan, standard empty | Criteria and targets table, data collection form, sample and period, re-audit; says to confirm the standard locally; **3 credits** |
| 7.12 | **Clinical audit: report** | Same, Write = report; results: *Criterion 1: 38 of 52 patients (73%); target 95%. Criterion 2: 45 of 52 (87%); target 90%.* | Results table with exactly these numbers, "not met" for both, action plan table; no invented numbers; **15 credits** |
| 7.13 | **Evaluation report** | Programme and findings from `samples/writing/programme-wash-schools.txt` (put the description part in "About the programme", the findings part in "What the evaluation found"); criteria OECD-DAC | Six DAC criteria sections. Indicator values exactly as given (absenteeism 10.1% against a target of 9%; handwashing 47% against 60%; 10 of 12 water points). Sustainability flags the unfunded maintenance and the stopped training. Recommendations table. No invented figures. |
| 7.14 | Evaluation: logframe | Same, criteria "Against the logframe" | Tables with indicator / baseline / target / achieved |
| 7.15 | Evaluation: no findings | Description only | Every finding is a [placeholder] |
| 7.16 | **Policy brief** | *Should school meals be universal rather than means-tested?*, legislators, Compare neutrally, context *Kenya* | Key messages, cited evidence, options table, "Weighing the options" (no single recommendation), [placeholders] for local figures |
| 7.17 | Policy brief: recommend | Same, Recommend one | A Recommendation section naming one option, with its reasons |
| 7.18 | **Annotated bibliography** | *Peer tutoring and maths achievement in secondary school*, Critical, about 60 words each | Introduction, at least 8 entries whose headings match the source titles, each ending with its [S#] marker, a Gaps section, then the reference list |
| 7.19 | **Seminar reading prep** | Upload `samples/reviewer/thesis-chapter-2-sleep-memory.pdf` and `research-proposal-green-space-nairobi.pdf` as the readings, depth Deep | At-a-glance table, one subsection per reading, connections, counter-arguments, 6 discussion questions and 3 points to raise; no page numbers invented; 3 credits per 10,000 words |
| 7.20 | Module list | Writing Studio left list | A "Deliverables" heading above the six new modules (on wide screens) |

## 8. Thesis Suite (`/thesis`)

| # | Module | Test data | Expected |
| --- | --- | --- | --- |
| 8.1 | Similar papers | *Sleep-dependent learning: a nap is as good as a night* | A list of papers; no credits |
| 8.2 | Research question | *Does napping help students remember lectures?*, FINER then PICO | A refined question, a framework table, alternatives and sub-questions |
| 8.3 | Hypotheses | *How does screen time affect sleep in teenagers?* | 3–5 hypotheses with variables and a test for each |
| 8.4 | Thesis outline | `samples/thesis/abstract-msc-sleep-lecture-recall.txt`, 20,000 words | Chapter word budgets that add up to 20,000 |
| 8.5 | Methodology builder | Same abstract | Design, sampling, instruments, analysis, validity and ethics |
| 8.6 | Theoretical framework | *Why do employees resist new hospital software?* | Named theories with constructs (e.g. TAM, UTAUT), cited |
| 8.7 | Research gaps | *urban green space and mental health in African cities* | Gaps, each with a reason, sources and a confidence level |
| 8.8 | Timeline | *PhD on drought resilience*, 36 months, start January 2027 | Phases and milestones by month; fixed dates respected |
| 8.9 | Defence preparation | `samples/thesis/abstract-phd-green-space-wellbeing.txt` | Questions on self-report, NDVI buffers, causality and mixed methods |
| 8.10 | Autonomous proposal | *Campus green space and exam stress among Kenyan undergraduates* | A refined question, then a full proposal from 3 searches; 15 credits |

## 9. Proposal Studio (`/proposals`)

| # | Module | Test data | Expected |
| --- | --- | --- | --- |
| 9.1 | Grant proposal | Call = `samples/proposals/call-early-career-research-grant.txt`; idea = `samples/proposals/idea-notes-nap-intervention.txt` | Follows the call's seven sections; sample size justified with d = 0.5 |
| 9.2 | Funder formats | NIH, NSF, ERC, Wellcome | The headings change to each funder's |
| 9.3 | Research proposal: one part | Idea notes, Write = Methods | Methods only; 3 credits (whole proposal 15) |
| 9.4 | Ethics application | Idea notes; board UK REC; participants Adults | Risks, consent, data protection and withdrawal for that board |
| 9.5 | Data management plan | Idea notes; Horizon Europe | Collection, storage, sharing and retention in that format |

## 10. Slides (`/slides`)

| # | Case | Test data | Expected |
| --- | --- | --- | --- |
| 10.1 | From a file | `samples/reviewer/research-proposal-green-space-nairobi.pdf`, research talk, about 12 slides | Slides with speaker notes and source markers; no invented numbers |
| 10.2 | From research | Deep report → Make slides, Thesis defence | Defence structure |
| 10.3 | Free preview | Free account | 5 slides shown for 3 credits; the PowerPoint download asks to upgrade |
| 10.4 | PowerPoint (Plus) | Download .pptx | Opens in PowerPoint, with notes and a references slide |

## 11. Reviewer (`/reviewer`)

### 11.1 Reviewer

| # | Case | Test data | Expected |
| --- | --- | --- | --- |
| 11.1.1 | Thesis chapter (Plus) | `samples/reviewer/thesis-chapter-2-sleep-memory.docx`, Thesis, Master's, all checks | Scorecard; comments quote real passages. Finds the planted problems: "proves" overclaim, "eight hours" uncited claim, Stickgold year (2003 vs 2005), Kamau and Otieno does not exist, list-like synthesis. 10 credits. |
| 11.1.2 | Proposal (Pro, High quality) | `samples/reviewer/research-proposal-green-space-nairobi.pdf` | Issues-by-section table and score chart; finds "proven to cure", no sample size calculation, vague analysis, one-line ethics; 30 credits |
| 11.1.3 | Free preview | Same file on Free | First 3,000 words, the full scorecard and the top 3 comments; 3 credits |
| 11.1.4 | Too short | 50 words | "Add at least 150 words"; no charge |
| 11.1.5 | Formatting check | Formatting on, rule *APA 7, tables titled above* | Formatting comments follow the rule |

### 11.2 Reporting-guideline check (new)

| # | Case | Test data | Expected |
| --- | --- | --- | --- |
| 11.2.1 | Suggestion | Paste `samples/reviewer/manuscript-cross-sectional-strobe.md` | **STROBE** is marked "Suggested" and selected; cost shown as **5** |
| 11.2.2 | Run STROBE | Check against STROBE | 34 items. The AI may judge borderline items differently, but these are clear-cut. **Must not be Reported:** 10 (no study size justification), 13c (no flow diagram), 22 (**no funding statement**), 12c (no missing-data handling). **Should be Reported, each with a quoted passage:** 1a ("cross-sectional study" in the title), 5 ("between March and May 2025"), 12a (ANOVA and regression). **Likely Not applicable:** 6b (matching), 14c (cohort follow-up). |
| 11.2.3 | Quote rule | Any item marked Reported | Its quote is copied word for word from the manuscript. Items without a matching passage show **Check by hand**, never Reported. |
| 11.2.4 | Filters and export | "To fix", "All", "Reported"; CSV; Open in editor | The CSV has a "Page or line" column; the editor shows a checklist table and the official checklist link |
| 11.2.5 | Other guidelines | CARE on the case report from 7.9; PRISMA on any systematic review text; COREQ on an interview study | Item counts: CARE 30, PRISMA 42, COREQ 32, CONSORT 37, STARD 34, SRQR 21, SQUIRE 22. CONSORT shows the note that CONSORT 2025 exists. |
| 11.2.6 | Too short | 100 words | "at least 300 words"; no charge |
| 11.2.7 | Failure refund | Stop the LLM, then run | Error; credits returned; History shows the task as failed |
| 11.2.8 | History | Reopen from History | Opens on the Guideline check module with the result |
| 11.2.9 | Long document | Paste over 40,000 words | Priced at most 20 credits; the result says only the first 40,000 words were checked |

### 11.3 Claim check and citation check

| # | Case | Test data | Expected |
| --- | --- | --- | --- |
| 11.3.1 | Claim check | `samples/claim-check/claims-sleep-and-learning.txt` | Sentences 1–3 supported (Jenkins and Dallenbach / Diekelmann and Born, Mednick, Xie); 4 not supported (Lim and Dinges); 5–6 no evidence or overstated; 2 credits |
| 11.3.2 | Claim check | `samples/claim-check/claims-green-space-health.txt` | 1–3 supported; 4 supported or partly; 5–6 not supported |
| 11.3.3 | Citation check | `samples/citation-check/references-apa-mixed.txt` | Obokata and Wakefield **Retracted**; Kamau **Not found**; Stickgold **year mismatch**; Xie **DOI not found**; Vaswani **Preprint**; the other four fine; no credits |
| 11.3.4 | Vancouver | `samples/citation-check/references-vancouver-health.txt` | No. 7 year mismatch (2016 vs 2018); no. 9 not found; the other eight fine |
| 11.3.5 | AI sentence check | Turn on, with the thesis chapter text | Whether each citing sentence matches its source; 2 credits |

## 12. Evidence matrix (`/matrix`)

| # | Case | Test data | Expected |
| --- | --- | --- | --- |
| 12.1 | Create | 5 Library papers from section 5; columns Design, Sample, Main finding | A table with one row per paper |
| 12.2 | AI fill | Fill | Each value has an exact quote and page; a value without a matching quote is not shown as filled |
| 12.3 | Manual edit wins | Edit a cell while AI fill is running | Your edit is kept; the audit history records both |
| 12.4 | Export and editor | CSV; Open in editor | The table plus a quote, page and DOI appendix |
| 12.5 | Shared in a project | Free B (project editor) opens it | Sees and edits the matrix by project role |

## 13. Systematic Review (`/systematic-review`)

| # | Case | Test data | Expected |
| --- | --- | --- | --- |
| 13.1 | Create | *Is exposure to urban green space associated with mental health in adults?*, Systematic review, PICO | Workspace with Protocol, Search, Screening, Extraction, Report and Audit |
| 13.2 | Protocol draft | AI draft | PROSPERO-style sections; 3 credits |
| 13.3 | PubMed builder | `(green space OR greenspace OR park*) AND (mental health OR wellbeing OR stress)` | A live count; running it adds records and logs the search |
| 13.4 | Import and duplicates | `samples/systematic-review/green-space-scopus-export.csv` (11) and `green-space-wos-export.ris` (10) | 21 in, **5 duplicates** (Gascon, Bratman, Twohig-Bennett, White, Engemann), 16 left |
| 13.5 | Title and abstract screening | Exclude Kuo and Sullivan, Diekelmann and Born, and Xie, each with a reason | Counts update; keyboard shortcuts work |
| 13.6 | Second reviewer, blinded | Add Free B through a project; both screen | Neither sees the other's vote until both have voted; conflicts are listed; Cohen's kappa and % agreement shown |
| 13.7 | Resolve | Resolve a conflict | The final decision is recorded with history |
| 13.8 | AI screening | Screen 16 records with AI | Suggestions with reasons, labelled AI; 1 credit (16 records = 1 batch of 25) |
| 13.9 | Full text | Attach a PDF to an included record | Full-text decisions and extraction use that text; without a PDF, AI says "abstract only" rather than pretending |
| 13.10 | Extraction | AI fill for included studies | Values with quotes; risk-of-bias fields per method; 3 credits per 10 studies |
| 13.11 | PRISMA | Report | 21 identified, 5 duplicates removed, 16 screened, exclusions with reasons; SVG and PNG download |
| 13.12 | Methods draft and exports | Methods; CSV and RIS | The methods section uses the logged searches and counts |
| 13.13 | Free limits | A second review, or over 50 records | Refused with the limit |
| 13.14 | Audit tab | After the above | Every decision with who, when and the revision |

## 14. Data Lab (`/data-lab`)

All statistics run in the browser and are free. Only the AI write-up costs credits (2). Expected values come from tested reference calculations.

### 14.1 Data and existing tests

| # | Case | Test data | Expected |
| --- | --- | --- | --- |
| 14.1.1 | Load CSV | `samples/data-lab/student-sleep-1908.csv` | 10 rows, 3 columns, types detected |
| 14.1.2 | Paired t-test | drug 1 vs drug 2 | Mean difference 1.58; t(9) ≈ 4.06; p ≈ .003; an APA sentence |
| 14.1.3 | Survey data | `samples/data-lab/green-space-wellbeing-survey.csv` | 240 rows. Correlations ndvi_500m–wellbeing and commute–stress positive; Welch stress by gender about 2 points higher for women; ANOVA wellbeing by campus with Kikuyu highest; chi-square campus × feels_safe_in_parks. Missing cells counted as omitted. |
| 14.1.4 | Excel | Save the survey CSV as .xlsx and upload; pick the sheet | Same results; the formulas are not executed; an old .xls is refused with advice |
| 14.1.5 | Column type | Switch a column numeric ↔ categorical | Logged in the change log; test choices update |
| 14.1.6 | Charts | Histogram, bar, box, scatter | Drawn correctly in light and dark mode |
| 14.1.7 | AI report | Write the results section | Uses only the computed numbers; 2 credits; Open in editor works |

### 14.2 New tests (sample files in `samples/data-lab/clinical/`)

| # | Test | File and columns | Expected |
| --- | --- | --- | --- |
| 14.2.1 | Survival (Kaplan-Meier, log-rank) | `leukaemia-remission-6mp.csv`: time `weeks_in_remission`, event `relapsed`, group `treatment` | Event detected as "relapsed = yes". 6-MP: n 21, 9 events, median **23**. Placebo: n 21, 21 events, median **8**. Log-rank **χ²(1) = 16.79, p < .001**. A step chart with two coloured curves, a legend and hover values. |
| 14.2.2 | Survival without groups | Leave the group empty | One curve; no log-rank row |
| 14.2.3 | Diagnostic accuracy | `diagnostic-test-2x2.csv`: test `rapid_test`, reference `biopsy` | Positive = positive / disease (auto-detected; or choose it). TP/FP 45/15, FN/TN 5/135. Sensitivity **90.0%**, specificity **90.0%**, PPV **75.0%**, NPV **96.4%**, LR+ **9.00**, all with exact 95% CIs. A note that predictive values depend on prevalence. |
| 14.2.4 | ROC | `roc-biomarker.csv`: score `biomarker`, reference `diagnosis` (case) | AUC **.875** (DeLong CI), best cut-off with sensitivity and specificity, a ROC chart with the diagonal |
| 14.2.5 | Fisher's exact | `fisher-tea-tasting.csv`: `poured_first` × `guess` | p = **.486**, odds ratio with CI |
| 14.2.6 | Wilcoxon signed-rank | `depression-scale-before-after.csv`: first vs second visit | V = **40.0**, exact p = **.039** |
| 14.2.7 | Kruskal-Wallis | `kruskal-three-groups.csv`: `score` by `group` | H = **0.77**, p = **.680** |
| 14.2.8 | McNemar | `mcnemar-before-after.csv` | Changes 9 and 2; exact p = **.065** |
| 14.2.9 | Spearman | `spearman-ranks.csv` | rs = **.93**, p < .001 |
| 14.2.10 | Logistic regression | `logistic-admission.csv`: outcome `readmitted` (event yes), predictors `age` + `ward` | Reference category ward = acute. Age B = **0.133** (SE 0.031), with an OR per year. Model χ²(3) = **33.90**, p < .001. Nagelkerke R² and % correctly classified shown. |
| 14.2.11 | Logistic: separation | Make a 6-row CSV `x,y` with `1,0 2,0 3,0 4,1 5,1 6,1`, outcome y, predictor x | A warning about separation; not a confident odds ratio |
| 14.2.12 | Reliability | `reliability-scale-items.csv`: items q1–q4 | Cronbach's α = **.88**; item-total r and α if deleted per item |
| 14.2.13 | Reversed item | q1, q2, q3, `q4_reversed_wording` | Warning: q4_reversed_wording correlates negatively and may need reverse-scoring |
| 14.2.14 | Wrong input | Kruskal with a numeric group; alpha with 1 item; Fisher with a 3-category column | A clear message for each; nothing added to results |
| 14.2.15 | Settings dropdowns | Diagnostic: choose the test column first | "Positive test result" lists that column's values; before a column is chosen it is disabled |

### 14.3 Sample size

| # | Design | Input | Expected |
| --- | --- | --- | --- |
| 14.3.1 | Prevalence | p 0.5, precision 0.05, alpha 0.05 | **385** people |
| 14.3.2 | Prevalence, finite population | Same, population 1000 | **278** |
| 14.3.3 | Design effect | p 0.5, d 0.05, design effect 2 | **769** |
| 14.3.4 | Correlation | r 0.3, alpha 0.05, power 0.8 | **85** |
| 14.3.5 | Diagnostic accuracy | Sensitivity 0.9, specificity 0.85, prevalence 0.2, precision 0.05 | **692** (692 for sensitivity, 245 for specificity) |
| 14.3.6 | t-test (existing) | d 0.5, two groups | 64 per group (matches G*Power to within a case) |

### 14.4 "Which test?" chooser

| Input | Expected |
| --- | --- |
| Relate; ranks or ratings | Spearman, "Run it here" |
| Predict; categories | Logistic regression, "Run it here" |
| Check how accurate a test is; positive/negative | Diagnostic accuracy |
| Same; score or measurement | ROC curve and AUC |
| Compare time until an event | Kaplan-Meier with log-rank |
| Reliability of a questionnaire scale | Cronbach's alpha |
| Compare; 3+ groups; not normal | Kruskal-Wallis, "Run it here" |

### 14.5 Reproducibility and code

| # | Case | Expected |
| --- | --- | --- |
| 14.5.1 | Run 3 tests (including survival) → Save to History → reopen from History | Results and charts come back; the specifications list the columns and settings |
| 14.5.2 | Download the reproducibility bundle; reload it with the CSV; Rerun | Same results. A changed CSV is refused ("does not match the fingerprint"). |
| 14.5.3 | Old analysis | Reopening an analysis saved before 13 November still reruns |
| 14.5.4 | Code export: R / Python / SPSS | Three files. R uses `survfit`, `glm`, `psych::alpha` etc.; SPSS lists renamed columns (e.g. "follow up (months) → follow_up__months_"). Running the R script on `dataset.csv` gives the same numbers. |
| 14.5.5 | Raw-data snapshot | Tick "save a raw-data snapshot" (up to 2 MB) | Saved only when ticked; project members can read it |

### 14.6 Questionnaire scale scoring

| # | Case | Test data | Expected |
| --- | --- | --- | --- |
| 14.6.1 | Define a scale | `reliability-scale-items.csv`; name *Wellbeing*; items q1–q4; 1 to 5; mean | Adds `Wellbeing_score`; the change log records it as a derived column |
| 14.6.2 | From a survey | See 15.10 | Adds the survey's scale scores and bands |

## 15. Survey builder (`/surveys`) — new

| # | Case | Test data | Expected |
| --- | --- | --- | --- |
| 15.1 | Create from a scale | Title *Student wellbeing survey*, start with GAD-7 | Opens with a GAD-7 section: 7 locked items (padlock), the published prompt, answers 0–3, and a GAD7 scale with bands |
| 15.2 | Own questions | Section "About you". Add: Number *How old are you?* from 16 to 99, whole numbers. One choice *Year of study* (First, Second, Third or later, plus **Add "Prefer not to say"**). Several choices *Which services have you used?* (Counselling, GP, Peer support). Long text *Anything else?* | Variable names are generated (editable); answer codes are editable; Save works |
| 15.3 | Validation | Give two questions the variable name `age`; leave a one-choice question with one answer | A problem message under the title; Save refused until fixed |
| 15.4 | Add another scale | Validated scale → PHQ-9, then PHQ-9 again | First items `phq1…phq9`, second `phq2_1…`. **The item-9 safety warning** appears under "Before the questions". |
| 15.5 | Consent and information | Fill in the participant information and the consent statement | Shown first on the public form; answering needs the tick |
| 15.6 | Identifying question | Add short text *What is your email address?* | A warning that the survey is no longer anonymous |
| 15.7 | AI draft | Aims *How first-year students' sleep, screen time and study habits relate to stress and grades*, undergraduates 18–25, about 12 questions | New questions with unique codes, "Prefer not to say" on sensitive items, suggested instruments listed; 3 credits; nothing saved until you press Save |
| 15.8 | AI check | Save, then Check | Comments only on real questions; validated items are not reworded; 2 credits; unsaved changes block the check |
| 15.9 | Scoring tab | Add a scale *Habits*, items from your Likert questions, mark one R, add bands 1–2.5 Low, 2.6–5 High | Saved; the codebook lists the scale |
| 15.10 | Open and share | Share → Open the survey | A link `/s/<16 characters>`; copy and open work; status Collecting |
| 15.11 | Public form (signed out, phone width) | Open the link in a private window at 375 px | Title, information, consent tick, then sections. On desktop the GAD-7 items show as a grid; on a phone, as stacked radio lists. No analytics scripts load. The page is noindex. |
| 15.12 | Required and range | Submit without GAD-7 answers; age 15 | "Please answer: …"; "Enter a whole number from 16 to 99" |
| 15.13 | Submit | Complete answers | The thank-you message; the builder shows 1 response |
| 15.14 | Bot field | Fill the hidden `website` field (e.g. with browser tools) | Thanked, but no response stored |
| 15.15 | Rate limit | More than 30 submissions from one address in an hour | "Too many requests" after 30 |
| 15.16 | Protected data | With responses: delete a question; remove an answer code; rename a variable | Save refused, naming the change ("“age” was removed"). Rewording a question and adding a new one still save. |
| 15.17 | Stale save | Open the survey in two tabs; save in one, then the other | The second is refused: "Someone else changed this survey" |
| 15.18 | Close | Close the survey; submit on the public link | "This survey is not taking responses"; back-to-draft is refused while responses exist |
| 15.19 | Responses CSV | Download | One column per question by variable; several-choice answers as `support_counsel`, `support_gp`… 0/1; GAD items 0–3 |
| 15.20 | Analyse in Data Lab | Analyse in Data Lab → Load the responses → Add the survey's scale scores | Adds `GAD7_score` and `GAD7_band` (and the others); items set to numeric; then Reliability on gad1–gad7 runs |
| 15.21 | Paper responses | From the survey's Data Lab link, upload `samples/surveys/gad7-paper-responses.csv` and add the scale scores | Scores 2 Minimal, 14 Moderate, 7 Mild, 20 Severe; respondent 5 (one blank) and 6 (an answer of 7, out of range) unscored. Warnings: "1 answer outside 0–3 treated as missing", "2 respondents answered too few items". |
| 15.22 | Exports | Questionnaire in the editor; codebook; data entry template; survey file | Paper questionnaire with ○/☐ boxes and the consent tick; codebook with codes, scales and reversed items; template header `respondent_id,age,…` |
| 15.23 | Delete responses | Delete all responses (after a pilot) | Count back to 0; structural changes allowed again |
| 15.24 | Free limits | 4th survey; 101st response | "The Free plan includes 3 surveys"; "reached its response limit" |
| 15.25 | Project sharing | Create from `/surveys?project=<id>`; Free B as viewer, then as editor | Viewer: read-only builder. Editor: can edit. Only the owner can delete. |
| 15.26 | Delete | Delete the survey | The survey and responses are gone; the public link returns not found |

## 16. Workbooks (`/workbooks`)

| # | Case | Test data | Expected |
| --- | --- | --- | --- |
| 16.1 | Plan a deliverable | Home → Plan a deliverable: task *Literature review chapter*, audience supervisor, deadline in 3 weeks | A research workbook with milestones and due reminders on Home |
| 16.2 | Research workbook | Add evidence from Library sources | Entries require an exact source quote; appraisal fields |
| 16.3 | Connections | Import included studies from the systematic review in section 13; build a matrix; open the draft literature review | Linked; the draft has an evidence table and quotes |
| 16.4 | Qualitative workbook | Import a transcript (paste ~1 page with "P1:" / "Interviewer:" lines); add codes and excerpts | A preview of line anchors before saving; editing the transcript in a way that breaks a saved quote is refused |
| 16.5 | Review and redact | Submit for review; reviewer approves with a note; redact a participant name | The decision keeps reviewer, date and revision; redaction also scrubs history |
| 16.6 | Exports | JSON, Markdown, CSV, Excel | Files open; spreadsheets say when raw text is excluded |
| 16.7 | Limits | More than 250 entries in one import | Refused, not silently cut |
| 16.8 | Expansion kinds | Study, policy, finance, humanities and R&D | Hidden unless `NEXT_PUBLIC_EXPANSION_WORKBOOKS=1`; existing ones still open |

## 17. Projects and History

| # | Case | Test data | Expected |
| --- | --- | --- | --- |
| 17.1 | Create | *MSc thesis: sleep and memory* | Project page with tasks, members, evidence and connected work |
| 17.2 | Move work | Move 2 History items into it | Shown in the project |
| 17.3 | Invite | Free B as "Can comment" | Free B sees the work, can comment, cannot delete; a second invitee on Free opens the upgrade dialog |
| 17.4 | Project evidence | Add a Library paper to the project; add a finding with an exact quote; Free B approves it | The snapshot is kept even if the owner later changes their Library copy; the approval has a note |
| 17.5 | Review inbox | Project page | Pending findings, workbooks, screening conflicts and monitor updates |
| 17.6 | Transfer ownership | Owner offers ownership to Free B; Free B accepts | Free B is the owner; the old owner becomes an editor; nothing changes until accepted |
| 17.7 | Bundle export | Export | Evidence, decisions and revisions as a bundle |
| 17.8 | Delete project | Delete | Shared matrices become read-only archives; personal work detaches |
| 17.9 | History | Search, star, delete, filter by kind (including "Guideline check") | Each item reopens on its own page |

## 18. Public site and free tools (signed out)

| # | Case | Test data | Expected |
| --- | --- | --- | --- |
| 18.1 | Pages | `/`, `/pricing`, `/about`, `/how-it-works`, `/features/*`, `/for/*`, `/alternatives/*`, `/templates/*`, `/blog`, a post, `/research`, `/help`, `/privacy`, `/terms`, `/cookies`, `/ai-use`, `/citation-styles` | All load, with titles and meta descriptions; no broken links (spot-check); the sitemap lists them; `/s/` pages are not in the sitemap |
| 18.2 | Citation generator | `/tools/citation-generator`, DOI `10.1038/nrn2762`, styles APA → MLA → Vancouver; also `/tools/citation-generator/apa` | Correct references; copy works; no account needed |
| 18.3 | AI tools | Each `/tools/<slug>`: deep-research, research-gap-finder, literature-review-generator, research-proposal-generator, essay-writer, research-paper-writer, thesis-chapter-planner, grant-proposal-writer, abstract-generator, thesis-to-manuscript, paraphrasing-tool, humanizer | Run 3 times signed out; the 4th asks for sign-up. The humanizer never claims to beat detectors. |
| 18.4 | AI writing checker | Paste `samples/writing/draft-discussion-rough.md` | Highlights stock phrases; **no AI-probability score** |
| 18.5 | Data analysis tool | `/tools/data-analysis` with `student-sleep-1908.csv` | Statistics in the browser; a link into Data Lab |
| 18.6 | PDF tools | Merge two sample PDFs; split; rotate | Done in the browser; nothing is uploaded (check the network tab) |
| 18.7 | Authorship verification | `/verify/<id>` from 6.17 | Confirms the report; no document text |
| 18.8 | Robots | `/robots.txt` | Disallows `/editor` and `/api/` |

## 19. Things to check everywhere

| # | Check | Expected |
| --- | --- | --- |
| 19.1 | Failed AI jobs | Credits are always returned; the task shows as failed with a reason |
| 19.2 | No invented sources | Every [S#] marker links to a real source; markers pointing nowhere are dropped |
| 19.3 | Phone (375 px) | Every page usable; no sideways scrolling (except wide tables, which scroll inside their box) |
| 19.4 | Dark mode | Every page and chart readable |
| 19.5 | Keyboard | Forms, tabs, the survey form and screening shortcuts usable without a mouse |
| 19.6 | Permissions | A viewer can never change, delete or spend credits on the owner's work |
| 19.7 | Errors | No raw stack traces; messages say what to do next |
| 19.8 | Speed | Pages open in under 3 s on a normal connection; long jobs show progress |

---

## Reporting a problem

For each failure, note:

- the case number (e.g. 15.16)
- the account and plan
- the input file
- what you expected and what happened
- the credits before and after
- a screenshot
- the browser console error, if any
