# Features to add from the CitedEvidence catalogue, 13 November 2026

This plan comes from the agents and templates listed in `yyy.md`. We will not build a marketplace. Each useful item becomes a module, checklist, source or export inside a workspace we already have. Nothing here is built yet.

## Already covered (no work)

Abstract writer, research paper writer, conference abstract, poster text, case report (CARE), grant proposal, ethics/IRB application, research proposal, research question refiner, hypothesis generator, methodology advisor, theoretical framework, research gap finder, timeline planner, thesis outline, defence prep, systematic review agent and protocol, screening forms, exclusion reasons, decision logs (all inside Systematic Review), peer review, fact verification (Claim check), citation validation (Citation check), statistical testing and test planning, charts, Excel export (Data Lab), presentation builder (Slides), the PubMed, OpenAlex, Crossref, arXiv, bioRxiv/medRxiv, Semantic Scholar and ClinicalTrials.gov sources, bibliometrics (Landscape, Citation Map), preprint tracking (Monitoring), and the qualitative, CONSORT, STROBE, PRISMA and STARD checklists (Reviewer).

## Tier 1: prompts, forms and checklists (small; fits existing code)

| Feature | Where | What it does | Credits |
| --- | --- | --- | --- |
| **Researcher emails** | Writing Studio, Deliverables | One module, four kinds: invite a co-author, invite people to a meeting, request data, request a paper. Fields: recipient role, purpose, study, deadline. A short draft with placeholders. | 1 |
| **Conference paper** | Writing Studio | A full 4–8 page paper with contribution statements and a venue page limit. The conference abstract module stays. | 15 |
| **Journal formatter** | Editor, plus Writing Studio | Pick a journal or style (Nature, Science, IEEE, ACM, APA, Vancouver, custom). The document gets the right section order, word and abstract limits and reference style, plus a list of what still breaks the author guidelines. Venue templates are the blank editor documents for the common styles. | 3 |
| **Ethics statement** | Proposal Studio | The approval statement for a manuscript (committee, reference number, consent, waiver), in the journal's wording. | 1 |
| **Study-site checklists** | Proposal Studio, new "Checklists" group | IRB submission checklist, site initiation visit checklist, ClinicalTrials.gov results-posting checklist, consent translation accuracy checklist, genomics incidental-findings plan. Each one is an editor template, with an AI module to tailor it to the study. | 0 blank · 3 tailored |
| **SAGER and SAMPL** | Reviewer guideline check | Add both to `lib/reportingGuidelines.ts` (paraphrased, numbered as published), at the same price as the other checklists. | 5 per 10k words |
| **Variable operationalisation** | Thesis Suite | Each construct becomes a definition, an indicator, an instrument, a scale level and its validity evidence, as a table. It links to the Survey builder's validated scales where one fits. | 3 |
| **Reference list formatter** | Reviewer, Citation check | Paste a messy reference list. It is deduplicated, checked (as now) and given back in the chosen style, ready to import as RIS or BibTeX. | 0 · 1 with AI cleanup |
| **Progress tracker** | Projects | A weekly or monthly log per project (done, blockers, next), shared with supervisors who can comment, with an AI summary for supervisor meetings. | 0 · summary 1 |
| **Screening documents** | Systematic Review, Report | Export the screening form, the exclusion-reason list and the decision log as Word/PDF for teams that screen elsewhere. The data is already there. | 0 |

## Tier 2: posters and output formats

| Feature | Where | Notes |
| --- | --- | --- |
| **PPTX poster** | Slides, new "Poster" preset | One large slide (A0 or 48×36 in) from poster text or a document, made in the browser with pptxgenjs, as the decks are now. |
| **LaTeX poster** | Slides | A `.tex` download (tikzposter) from the same content. LaTeX is already a paid-plan feature. |
| **PDF report** | Data Lab | The AI results section, the tables and the charts as one PDF. |
| **Diagrams** | Editor | Flowcharts, conceptual frameworks and study designs as Mermaid. The AI writes the diagram, the editor renders it, and it exports as SVG/PNG. Also usable from Thesis Suite's framework module. |
| **Document converter** | All tools | Exposes the existing `services/convert` service: PDF, Word or PowerPoint to Markdown or an editor document. Audio and images are left out at first. |

## Tier 3: new data sources (the planned phase-4 field packs)

These are free public APIs with no code sandbox. Each one is a source in Deep Research or Official Sources, so answers cite the records. Check each licence before launch.

| Field | Sources | Where | Replaces their |
| --- | --- | --- | --- |
| Computer science | DBLP | Find Papers, Deep Research | DBLP |
| Chemistry | PubChem, ChEMBL | Deep Research, "Chemistry" | Compound analyst, bioactive molecule explorer |
| Biology | NCBI Gene, UniProt, Ensembl, Reactome, PDB, AlphaFold DB, GWAS Catalog, ClinVar | Deep Research, "Life sciences" | Gene, protein, pathway, structure, GWAS and variant agents |
| Drugs and devices | openFDA | Official Sources | FDA regulatory analyst, drug information |
| Economics | FRED (free key), US Treasury Fiscal Data, OECD | Official Sources (next to World Bank) | Economic and Treasury data analysts |
| Patents | USPTO PatentsView (free key) | Official Sources | Patent search. Must say it is not a validity or freedom-to-operate opinion, as the R&D workbook already does |

KEGG and HMDB are left out because their licences limit commercial use.

## Tier 4: analysis (bigger)

| Feature | Where | Notes |
| --- | --- | --- |
| **Qualitative coding** | New Data Lab tab, or its own workspace | Upload transcripts, build a codebook, code passages, with AI-suggested codes that quote the text. Themes, code counts, and a COREQ/SRQR link into Reviewer. Already planned for phase 4. |
| **Bayesian basics** | Data Lab | Bayesian t-test and proportion (Bayes factor, credible interval) in the browser. Full MCMC models need a sandbox (below). |

## Not adding

These need a server-side Python sandbox with GPUs or heavy libraries, or carry clinical risk that a writing tool should not take on:

- Bulk and single-cell RNA-seq, CFD, quantum computing, deep learning training, distributed or Polars processing, DICOM imaging, biosignals, metabolic networks, molecular ML, virtual screening.
- Treatment plan generator.
- Hedge fund monitor.

If we want them later, the route is one sandbox service (Cloud Run job, Python) shared by all of them. That is a separate decision.

## Build spec (approved 13 November 2026: build tiers 1–4, with landing pages and blog posts)

This is the contract every workstream builds to. Ids, routes and prices are fixed here. If one has to change, the workstream reports it instead of changing it silently.

**New credit action:** `short: 1` in `CREDIT_COSTS` (already added, with its pricing-table row and sync test). It covers a research email, an ethics statement, a diagram and a progress summary.

**Qualitative coding** already exists as the qualitative workbook (`lib/workflows.ts`: codebook, coded excerpts, themes). Tier 4 extends it.

| # | Feature | Route / id | Credits |
| --- | --- | --- | --- |
| 1 | Researcher emails | `/write?module=research-email`, group "Correspondence". Kinds: co-author invitation, meeting invitation, data request, paper request, prospective-supervisor enquiry, follow-up | `short` 1 |
| 2 | Conference paper | `/write?module=conference-paper` | `draft` 15 |
| 3 | Journal formatter | `/write?module=journal-format`, plus blank venue templates `venue-ieee`, `venue-acm`, `venue-apa`, `venue-nature`, `venue-vancouver` | `section` 3 per 10,000 words, at most 4 units |
| 4 | Ethics statement | `/proposals?module=ethics-statement` | `short` 1 |
| 5 | Study checklists | `/proposals?module=study-checklist`, group "Checklists". Kinds: `irb-submission`, `site-initiation-visit`, `ctgov-results`, `consent-translation`, `incidental-findings`. Each also a blank template `checklist-<kind>` | blank 0 · tailored `section` 3 |
| 6 | SAGER and SAMPL | ids `sager`, `sampl` in `lib/reportingGuidelines.ts` | `guideline_check` 5 per 10,000 words |
| 7 | Variable operationalisation | `/thesis?module=operationalisation` | `section` 3 |
| 8 | Reference list formatter | `/reviewer?module=references` | 0 · AI cleanup `ai_edit` 1 |
| 9 | Progress tracker | Projects: a "Progress" tab on a project | 0 · AI summary `short` 1 |
| 10 | Screening documents | Systematic Review, Report step: screening form, exclusion reasons, decision log as Word and PDF | 0 |
| 11 | Posters | `/slides?module=poster`: PPTX (A0 portrait, A1, 48×36 in landscape) and a tikzposter `.tex` | `section` 3 |
| 12 | Data Lab PDF report | Data Lab: "Download PDF report" | 0 |
| 13 | Diagrams | Editor: Mermaid diagram block, SVG/PNG export; "Draw with AI" | 0 · AI `short` 1 |
| 14 | Document converter | `/convert`: PDF, Word, PowerPoint to Markdown or an editor document | 0 |
| 15 | DBLP | paper source id `dblp` (Find Papers, Deep Research) | 0 |
| 16 | Field sources | Deep Research source groups `life-sciences` (NCBI Gene, UniProt, Ensembl, Reactome, PDB, AlphaFold DB, GWAS Catalog, ClinVar) and `chemistry` (PubChem, ChEMBL) | as the run's depth |
| 17 | Official Sources | `/official-sources` adds openFDA, FRED (`FRED_API_KEY`), US Treasury Fiscal Data, OECD, USPTO PatentsView (`PATENTSVIEW_API_KEY`) | 0 |
| 18 | Qualitative coding | Qualitative workbook: transcript upload, select text to code, AI code suggestions that quote the text, code frequency by source | AI suggestions as now (3) |
| 19 | Bayesian basics | Data Lab: Bayesian t-tests (one-sample, paired, two-sample; JZS Bayes factor) and a Bayesian proportion (beta-binomial) | 0 |

**Shared files** (`plans.ts`, `creditTable.ts`, `lib/catalog.ts`, `AppNav.tsx`, `MobileTabBar.tsx`, the all-tools page) are edited only by the lead. Workstreams list the entries they need.

## Suggested order

1. Tier 1 (about 10 items, mostly catalogue entries, prompts and checklist data).
2. Tier 2, starting with posters.
3. Tier 3, starting with DBLP, openFDA and FRED, then the biology pack.
4. Tier 4.
