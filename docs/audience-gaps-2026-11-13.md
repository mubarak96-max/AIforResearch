# What would make people pay: gaps by audience

13 November 2026. **Status:** items 6, 7, 11 and 12 below were built the same day (see [the build notes](redesign/07-built-2026-11-13.md)); content suggestions are in [06-content-new-features.md](redesign/06-content-new-features.md). This builds on [the 12 November opportunity audit](product-opportunity-audit-2026-11-12.md) and [its implementation](product-opportunity-implementation-2026-11-12.md), and does not repeat them. It is a planning document. Nothing here has been built. Each external source or API named here needs its access and terms checked first.

Audiences are defined by **role and task**, not by country. Any feature below is for anyone, anywhere, who does that work.

## The short version

The app already covers a lot: Deep Research, Find Papers, citation maps, systematic reviews, matrices, workbooks, the studios, the Reviewer, Data Lab, projects and teams. What it lacks is less about new features and more about three things:

- **Daily habit:** people pay monthly for a tool they open every day. Right now they open this app when a big task comes up.
- **Breadth of work types:** many common deliverables (case reports, survey theses, evaluation reports, seminar prep, data from field surveys or interviews) are not supported yet.
- **Meeting people where they work:** their reader, their word processor, their browser, their university library, their language.

## Five gaps that hurt every audience

1. **There is no place to read.** The app has no PDF reader with highlights and notes. The Library is a side panel in the editor, and a PDF is something you ask questions about, not something you read. Highlights should feed the evidence chain that already exists (quote → finding → matrix → draft).
2. **Paywalled papers stay locked.** Full text comes from Unpaywall (open access only). Anyone with a university or hospital library can read paywalled papers through it, but the app cannot open them. A per-user setting for their library's access link (EZproxy, OpenAthens or an OpenURL link resolver) fixes this without partnerships.
3. **The app doesn't reach the tools people use.** People write in Word, Google Docs and Overleaf, and find papers in the browser. There is no Word add-in, no Docs add-on and no browser extension.
4. **The app works in English only.** The UI is English only (`lang="en"`, no i18n library), search queries are planned in English, OCR reads English only, and prices are in US dollars only. This limits every audience that works in another language, whatever the country.
5. **Nothing brings people back.** Monitors and saved searches alert only inside the app. Email is sent only for sign-in (`lib/server/lib/mail.ts`). A weekly digest ("4 new papers on your topic, 1 retraction in your library, chapter 2 due Friday") is what brings people back.

## By audience

"Have" lists what exists and fits this audience. "Missing" lists what's absent. Items marked *flag* exist only behind `NEXT_PUBLIC_EXPANSION_WORKBOOKS`.

### Medical and health students

- **Their work:** a required thesis or dissertation, case reports (often the first publication), journal clubs, clinical audits and exam revision.
- **Have:** PubMed/Europe PMC search, PICO, trial registries, systematic reviews, Data Lab, the Reviewer, slides, recall cards (*flag*).
- **Missing:**
  - A case report writer that follows the CARE checklist.
  - Checks against reporting guidelines (CONSORT, STROBE, PRISMA, CARE, STARD, COREQ, SRQR). The code has none.
  - Statistics for clinical theses: diagnostic accuracy (sensitivity, specificity, PPV, NPV, ROC), survival curves, logistic regression, Fisher's exact test, and sample size for prevalence and cross-sectional studies.
  - Ethics templates beyond IRB, UK REC and HREC: a generic ethics committee application that adapts to the user's committee form.
  - A clinical audit / quality improvement project template.

### Master's and doctoral researchers

- **Their work:** a thesis over 1–4 years, a library of hundreds of papers, supervisor meetings, progress reviews, a defence, and papers.
- **Have:** Deep Research, matrices, the Thesis Suite, defence preparation, LaTeX export, Zotero import, projects with supervisor roles, evidence updates.
- **Missing:**
  - The reader (gap 1), library access (gap 2) and Word/Overleaf (gap 3).
  - A supervisor meeting log: agenda, notes, and actions that become tasks.
  - Thesis formatting to a chosen university template (front matter, numbering, declarations).
  - Speech-to-text for interviews.
  - A survey and questionnaire builder that uses validated instruments and feeds Data Lab, plus reliability analysis (Cronbach's alpha). Surveys are among the most common thesis designs.
  - Code export (R, Python or SPSS syntax) from Data Lab, because examiners ask how the results were produced.

### Undergraduates doing coursework

- **Their work:** weekly readings, essays argued from sources, group projects, course AI-use rules.
- **Have:** search, writing tools, citation styles, `/authorship` and AI-use pages, rubric and AI-rules fields (*flag*).
- **Missing:**
  - Reading prep: "summarize and challenge this week's readings, and give me 3 discussion questions".
  - Books and chapters treated as first-class sources. Search is built around articles.
  - An exportable AI-use statement tied to the course's rules.
  - A Google Docs add-on (gap 3).
- **Note:** sell "understand and argue", not "write it for me". Schools watch closely, and integrity is what makes this audience trust the app.

### Undergraduates doing research (honours or senior thesis, RA work)

- **Missing:** a lighter guided path than the Thesis Suite, primary-versus-secondary source labels, research-assistant deliverables (annotated bibliography, literature memo) and a supervisor's view of progress.

### Policy analysts and international-organisation staff

- **Their work:** briefs, policy notes and evaluations built on official statistics and evidence, often in more than one language, sent through approval chains.
- **Have:** policy workbook, World Bank and ReliefWeb connectors (*flag*), Deep Research, slides.
- **Missing:**
  - Search and output in the language of the sources, with side-by-side translation.
  - More official data sources: UN SDG data and regional statistics offices.
  - A fixed brief format with an approval step.
  - Procurement support: invoices, purchase orders, a data agreement and a no-training guarantee.
- **Note:** the flag is off, so this audience has nothing aimed at it today.

### NGO, monitoring-and-evaluation and government programme staff

- **Their work:** donor reports, evaluations, needs assessments, focus groups, logframes and field survey data.
- **Have:** logframes and indicators (*flag*), the qualitative workbook, Data Lab.
- **Missing:**
  - Import from field-survey tools (KoboToolbox, ODK).
  - Speech-to-text for focus groups and interviews, in many languages.
  - Evaluation report templates (OECD-DAC criteria and common donor formats).
  - Pages that work on slow or unreliable connections.
  - A per-project pass and nonprofit pricing, because budgets are per project.

### Financial and business analysts

- **Their work:** company and sector notes, comparable-company tables, sustainability (ESG) reports, earnings calls.
- **Have:** finance workbook and the SEC connector (*flag*).
- **Missing:**
  - Reading annual and sustainability reports from PDFs, and extracting their tables to Excel with units and periods. Uploads are the realistic way in, because most exchanges have no free API.
  - Earnings-call transcripts and multi-currency tables.
- **Note:** this is a separate market with strong, expensive competitors. ESG and annual-report analysis is the slice closest to the app's strength: extracting evidence from long PDFs.

### Other audiences

| Audience | What they'd use | Main gap |
| --- | --- | --- |
| Clinicians and residents | Journal club, audits, guideline lookups | Audit/QI template; guideline sources. Never present output as clinical advice. |
| Supervisors | Projects, the Reviewer | A dashboard across all their students; meeting log; review inbox across projects |
| Journal editors and peer reviewers | Reviewer, Citation check | Reporting-guideline checks; a confidential mode that stores nothing |
| Journalists and fact-checkers | Claim check, web search | Web-page snapshots and archive links as evidence; checking statistical claims |
| Grant offices and research managers | Proposal Studio | Finding funders and calls; a portfolio view across proposals |
| Consultants and think tanks | Deep Research, briefs, slides | Branded exports; workspaces kept separate per client |
| Market and UX researchers | Qualitative workbook | Speech-to-text; video clips as evidence; tagging across studies |
| Librarians | Search support, teaching | Institution plans; search-strategy coaching; usage reports |
| Teachers and lecturers | Slides, Reviewer | Reading lists, feedback on student drafts against a rubric |

## Cross-cutting features, ranked by how many audiences they help

| # | Feature | Helps | Size | Notes |
| --- | --- | --- | --- | --- |
| 1 | **PDF reader with highlights and notes that become evidence** | Everyone who reads | Large | Becomes the daily habit, and gives the existing evidence chain a front door |
| 2 | **Weekly email digest** of monitors, new papers, retractions and due milestones | Everyone | Small | Monitors already exist; only the email is missing |
| 3 | **Library access setting** (proxy or link resolver) | All university and hospital users | Small | Rewrites paper links through the user's own library |
| 4 | **Browser extension:** save a paper from any page, flag retractions, ask about the page | Everyone | Medium | Also brings in new users |
| 5 | **Word add-in, then Google Docs add-on** | Everyone who writes | Large | Removes the biggest switching cost |
| 6 | **More statistics in Data Lab:** diagnostic accuracy, survival, logistic regression, reliability, nonparametric tests, more sample-size designs, R/Python/SPSS code export | Students and researchers in health and social sciences | Medium | Runs in the browser, so no server cost |
| 7 | **Reporting-guideline checker** | Health researchers, editors, reviewers | Medium | Fits into the Reviewer |
| 8 | **Speech-to-text** with speaker labels | Qualitative, NGO, UX, students | Medium | Feeds the qualitative workbook's line anchors |
| 9 | **Multiple languages:** UI, search, OCR and output | Anyone not working in English | Medium–Large | Retrieval quality matters more than translating the UI |
| 10 | **Wider source coverage:** non-English and regional databases, official statistics | Policy, health, social science | Medium each | Check each API and its terms |
| 11 | **Survey builder** with validated instruments, connected to Data Lab | Students, NGOs, social scientists | Medium | |
| 12 | **New deliverable templates:** case report, clinical audit, evaluation report, annotated bibliography, policy brief, reading prep | Many audiences | Small each | Fits the existing studios |
| 13 | **Trust pack:** no-training statement, data agreement, sub-processors, data region, security page | Institutions, organisations, governments | Small to write; Large for real regional hosting | Buyers ask this before price |
| 14 | **Supervisor dashboard** across students and projects | Supervisors, labs | Medium | Builds on projects and review inbox |

## Pricing for a wide range of audiences

- **Passes by deliverable or period**, not only subscriptions: a thesis pass, a semester pass, a per-project pass for NGOs and consultants. The Defence Pass is a starting point.
- **Prices in the payer's currency** and local payment methods (check what Dodo supports).
- **Organisation buying:** invoices, purchase orders and nonprofit or education pricing.
- **Credits explained as outcomes:** "750 credits = one literature review and 20 reports".

## Qualities that matter as much as features

- **The production build has to pass.** The 12 November report says `next build` stalled at about 8.6 GB of memory. Fix this before anything else.
- **Turn on background jobs** (`RESEARCH_JOBS_ENABLED`) so slow connections and phones don't lose paid work.
- **Keep the honest limits:** unverified checks, abstract-only labels, "not clinical advice".
- **Less on screen.** There are now about 20 workspaces. Use the role chosen at onboarding to show each audience its own home screen and hide what doesn't apply.

## A suggested order

1. Prerequisites: fix the production build and turn on background jobs.
2. Quick wins: the weekly digest (#2), the library access setting (#3) and the trust pack text (#13).
3. Daily habit: the PDF reader (#1).
4. Breadth of deliverables: templates, statistics and guideline checks (#6, #7, #12). These are cheap and widen the audience the most.
5. Reach: browser extension, then Word add-in (#4, #5).
6. More audiences: languages, sources, speech-to-text and the survey builder (#8–#11). This is also when the policy and NGO workbooks come out from behind the flag.
7. Finance last, starting with an annual and ESG report pilot if demand appears.

## Questions for the owner

- **Focus for the next quarter:** academic audiences (students, researchers, supervisors) or professional ones (policy, NGO, analysts)? They need different sources, templates and ways of buying.
- **Expansion flag:** should the policy, NGO, study and finance workbooks stay off, or come out with the first new templates?
- **Add-ins:** should the app live inside Word and Docs, or stay the place where people write?
- **Pricing:** add per-deliverable passes and organisation invoicing alongside subscriptions?
