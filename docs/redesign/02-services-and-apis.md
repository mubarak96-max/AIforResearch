# Services and APIs the new product needs

Proposal, 11 November 2026. What each part of [the structure](01-product-structure.md) needs from outside, what you already have, and what it costs in kind (free, paid per use, licence). Prices and limits change: every figure and term here must be checked on the provider's page before you commit. I have not called any of these services for this document.

**Have** means the repository already uses it (see the slots in `README.md`).

## 1. Papers and scholarly data

| Service | Used for | Cost | Have | Phase | Notes |
| --- | --- | --- | --- | --- | --- |
| CitedEvidence Scholar | Main paper index, full text where open | Free key, daily credits | Yes | 1 | `docs/prd-status.md` reports weak results on some searches. Measure it against OpenAlex before it stays the default. |
| OpenAlex | Paper, author, journal and citation data (250M+ works); the fallback index | Free tier | Yes | 1 | Also gives journal-level metrics for the quality filter and the citation links for Citation Map and Landscape. |
| Semantic Scholar API | Citation graph, "similar papers", short summaries, paper embeddings | Free with a key, rate-limited | No | 1–2 | Read its licence for commercial use. Strong for the similar-papers finder and snowballing. |
| Crossref | DOI look-up, reference checking, retraction notices (Retraction Watch data) | Free | Partly (citation tool) | 1 | Powers "exclude retracted" and the citation check. |
| PubMed (NCBI E-utilities) | The Medical source; MeSH terms; reproducible searches for systematic reviews | Free, key raises the rate | No | 1 | |
| Europe PMC | Biomedical full text, preprints | Free | No | 1 | |
| Unpaywall | Finds the legal open copy of a paper | Free | No | 1 | The cheapest way to raise the share of answers built on full text. |
| arXiv, bioRxiv/medRxiv | Preprints | Free | No | 1–2 | Label as preprints everywhere. |
| CORE | Open-access full text | Free tier with a key | No | 2 | |
| DBLP, SSRN, Zenodo, DOAJ, OpenCitations | Field coverage and open journals | Free | No | 2–4 | Add when a field pack needs them. |
| ClinicalTrials.gov | Registered trials | Free | No | 4 | Medicine pack. |
| **Scopus** (Elsevier) | Systematic-review searches | Licence only | No | 3 | API keys belong to subscribing institutions and the terms do not allow reselling results. Proposal: "connect your institution's key", or let users upload the export file. Do not advertise "search Scopus" without one of these. |
| Web of Science | Same | Licence only | No | — | Same answer as Scopus: upload the export. |
| **Google Scholar** | — | No API | No | — | There is no official API and scraping breaks its terms. Third-party scrapers exist; building on them puts the product at risk. Offer an "open in Google Scholar" link instead. |
| Scite | "Supporting / contrasting" citation labels | Commercial partnership | No | later | Optional. The consensus line can be built in-house from abstracts first. |
| Lens.org | Patents and scholarly records in one API | Paid for commercial use | No | 4 | The simplest route to patent search across offices. Free alternatives: PatentsView (US), EPO Open Patent Services. |
| Journal ranking data (SCImago SJR) | Quartile filter | Check the licence | No | 1 | If the licence does not fit, derive quality tiers from OpenAlex journal metrics. |

## 2. Web as a source

| Service | Used for | Cost | Phase | Notes |
| --- | --- | --- | --- | --- |
| A search API (Exa, Tavily, Brave Search or Serper; pick one) | The Web source in Deep Research | Paid per query | 1 | Web results are labelled as web pages and kept apart from papers in the source list. |
| Page reader (your own fetch plus a readability parser, or Jina Reader / Firecrawl) | Turning a page into clean text | Free or paid per page | 1 | Start with your own; `lib/server/lib/safeUrl.ts` already guards outbound requests. |

## 3. AI models

| Need | Proposal | Have | Notes |
| --- | --- | --- | --- |
| Routing by job | Two tiers behind the existing `LLM_PROVIDER` slot: an **economy** model for reading, extraction, screening, summaries and autocomplete; a **premium** model for the final synthesis in High-quality mode | The slot exists; one model today | This is what makes the pricing work: most tokens are reading, and reading is cheap. |
| Structured output | JSON schemas for extraction tables, review scorecards, screening decisions | Partly | |
| Embeddings | Library and passage search | Yes (`EMBEDDINGS_PROVIDER`) | |
| Re-ranking | Ordering passages before they reach the model (Cohere, Voyage or Jina re-rankers) | No | Small cost, large gain in answer quality. |
| Evaluation | A fixed set of questions with known sources, run on every prompt or model change | No | Tracks invented or wrong citations as a number. |

## 4. Documents

| Need | Proposal | Have | Phase |
| --- | --- | --- | --- |
| PDF text | `services/convert` (pypdfium2) | Yes | 1 |
| Reference and section parsing from PDFs | GROBID, open source, runs beside the converter | No | 1–2 |
| Scanned PDFs | An OCR service (Google Document AI or similar) for files with no text layer | No | 2 |
| Word, LaTeX, PDF export | `services/convert`, `docx` | Yes | 1 |
| PowerPoint export | PptxGenJS in the app, or python-pptx in the converter | No | 2 |
| DOCX/PPTX/Markdown import for chat | mammoth (have), converter | Partly | 1 |
| Diagrams | Mermaid for flow and framework diagrams; the PRISMA flow drawn as SVG | No | 2–3 |

## 5. Data Lab

| Need | Proposal | Phase | Notes |
| --- | --- | --- | --- |
| Running analysis code safely | A sandbox per job: a hosted one (E2B, Modal) or your own Cloud Run job with Python (pandas, scipy, statsmodels, matplotlib) | 3 | The model writes the code, the sandbox runs it, the user sees code and result. Numbers are computed, never written by the model. |
| Free-plan analysis | Keep and extend the in-browser statistics (`lib/stats.ts`); optionally Pyodide | 1–3 | Runs on the user's device, so it costs nothing. |
| Charts | Vega-Lite or Plotly in the app; matplotlib in the sandbox for publication figures | 3 | |
| File formats | CSV and Excel first; SPSS and Stata through the sandbox (pyreadstat) | 3 | |

## 6. Visuals in the app

| Need | Proposal | Phase |
| --- | --- | --- |
| Citation Map and Landscape graphs | Cytoscape.js or Sigma.js | 2–3 |
| PDF reader with highlights | PDF.js | 2 |

## 7. Platform

| Need | Proposal | Have | Notes |
| --- | --- | --- | --- |
| Long jobs | Cloud Tasks feeding Cloud Run jobs, progress written to Firestore, email on completion | Cloud Functions jobs exist (`lib/server/jobs.ts`) | Detailed reports and thesis reviews will outlive a request. |
| Library search | Typesense or Algolia, or keep Firestore vector search | Vector search optional today | `README.md` already notes word-based search as a limit. |
| Reference managers | Zotero and Mendeley APIs | Yes | |
| Payments | Dodo Payments: subscriptions, credit entitlements, top-ups, one-time pass, regional pricing | Subscriptions yes; credits no | See [03-pricing.md](03-pricing.md). |
| Email | Resend or SMTP | Yes | |
| Rate limiting | Trust the host's client address, not `X-Forwarded-For` | Needs the fix in `docs/prd-status.md` | Required before the free plan is promoted. |
| Product analytics and errors | PostHog or similar; Sentry | No | Needed to see where free users stop and what each job costs. |
| University access links | A setting for the user's library proxy (EZproxy, LibKey) so "Get full text" opens through their login | No | Phase 2. No licence needed; it is a link pattern. |
| Institution sign-on | SAML through Firebase Identity Platform | No | Phase 4, Team plan. |
| Similarity check | A plagiarism API (for example Copyleaks), sold as an add-on | No | Optional. Do not promise "Turnitin"; it is sold to institutions only. |

## 8. Order of work

1. **Before phase 1 ships:** PubMed, Europe PMC, Unpaywall, Crossref retractions, one web search API, model routing, the rate-limit fix, job cost logging.
2. **Phase 2:** Semantic Scholar (similar papers, citation graph), GROBID, PowerPoint export, graph library, re-ranker.
3. **Phase 3:** the sandbox, the Scopus decision, chart stack.
4. **Phase 4:** Lens or the free patent APIs, the field databases, SAML.

## 9. Three risks to decide on early

1. **Scopus and Google Scholar cannot be promised.** Marketing copy must say what is really searched: OpenAlex, PubMed, Semantic Scholar, Europe PMC, preprint servers, the web and the user's Library.
2. **Answer quality depends on full text.** With abstracts only, Detailed mode will read thin. Unpaywall, Europe PMC and the user's own PDFs are the fix; measure the share of cited papers that had full text.
3. **Cost per job is unknown until measured.** The pricing file uses estimates. Log tokens and search calls per job from the first day of phase 1 and reprice credits from the data.
