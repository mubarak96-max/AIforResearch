# AI for Research content plan: researchers, students and academic writers

30 blog posts and 10 landing pages to win organic search and AI-answer traffic for the queries in the three Keyword Planner exports from 10 November 2026.

- **Keyword data:** Google Keyword Planner, 1 Oct 2025 to 30 Sep 2026, three exports (research seeds, writing seeds, paper-writer seeds). Bids are in AED.
- **Columns used:** Vol = average monthly searches. Comp = **paid** competition (Low / Medium / High). It is not SEO difficulty, so check the top 10 results before writing each piece. YoY = year-over-year change.
- **Follows on from** [content-plan-writers.md](content-plan-writers.md). Blog posts here are numbered **31 to 60** so they sit after the existing 30 in `content/blog/`.
- **Length:** blog posts are 1,400 to 2,500 words. Landing pages are 900 to 1,500 words of copy plus product visuals.

---

## 0. Things to know about this data

1. **Keyword Planner groups close variants.** Rows with identical numbers count the same searches once, not twice. Treat each group as one keyword and give it one page:
   - "ai for research" = "ai in research" = "ai for researchers" = "research on/into/of artificial intelligence" (5,400)
   - "research paper ai" = "ai research papers" (1,600)
   - "ai paper writer" (1,000) and "research paper writer" (1,000) are separate rows. Both go on one page.
   - "ai tools for research" = "ai tool for research" = "ai tools for researchers" (880)
   - "thesis ai" = "ai thesis" = "thesis about ai" (1,300)
   - "find sources" = "source finding" (1,300)
2. **Some volumes are inflated by spikes.** "ai writing tool(s)" shows 60,500, but that comes from 450,000 searches in Dec 2025 and about 5,000 a month since. "ai assistant for writing" (40,500) and "ai powered writing assistant" (49,500) behave the same way. Don't plan around these numbers.
3. **Rising (good timing):** best ai for research (+50% YoY), cite evidence (+1,285% in 3 months), check your sources (+1,157% YoY), academic paper (+326%), academic research paper (+238%), ai research topics (+240% in 3 months), latest research in ai (+51%), best ai research (+1,082%).
4. **Falling:** most "ai paper/essay generator" and "ai research assistant" terms are down 45% to 90% YoY, so searches are moving toward "best ai for research" style queries. Use the generator terms as secondary keywords, not as the main target of a page.
5. **Skip:** competitor navigation (quillbot's, demis hassabis, openai founders, timnit gebru, andrew ng baidu), fiction tools (sudowrite), and off-topic AI terms (conscious ai, cons of ai, ai apps). They bring traffic that won't convert.

### Product claims (same rule as the writers' plan)

Only describe features that exist today: autocomplete with real citations; search 250M+ works and `@`-cite them; 10,000+ citation styles; a Library where you chat with PDFs and answers carry page numbers; AI review (peer review, claim checks, source quality, proofreading); real-time co-editing; Word, PDF and LaTeX in and out; Zotero and Mendeley import; and the tools in `lib/tools.ts` (deep research, research gap finder, literature review generator, research proposal generator, research paper writer, thesis chapter planner, grant proposal writer, abstract generator, thesis to manuscript, paraphrasing, AI writing checker, data analysis, PDF tools, citation generator).

**Do not claim:** automated systematic-review screening or PRISMA export, citation-map graphs (Research Rabbit / Connected Papers style), or "undetectable" writing. Where an article covers one of these, teach the method and point to the nearest real feature.

---

## 1. The 10 landing pages

Five are new pages and five upgrade pages that already exist. When a page is upgraded, keep its slug and rewrite the `seoTitle`, `heading`, `intro`, `keywords` and FAQ in `lib/features.ts` or `lib/tools.ts`.

| # | Page | Status | Primary keyword (Vol) | Secondary keywords |
| --- | --- | --- | --- | --- |
| L1 | `/` (home) | Upgrade | ai for research (5,400) | ai research (3,600), ai for researchers, ai in research, research ai |
| L2 | `/ai-research-tools` | **New** | ai research tools (1,600) | ai tools for research (880), research ai tools (720), ai tools for researchers, ai research platform (170) |
| L3 | `/academic-ai` | **New** | scholar ai (1,900) | academic ai (1,300), ai for science (1,600), ai for academic research (320), ai for scientific research (320), ai in academia (210) |
| L4 | `/features/paper-search` | Upgrade | research paper ai (1,600) | find sources (1,300), find references (1,300), ai source finder (320), ai for research papers (480), ai reference finder (90), ai literature search (90) |
| L5 | `/features/literature-review` | Upgrade | literature review ai (1,000) | literature review writer (720), ai for literature review (480), ai tool for literature review (320), literature review ai tool (170) |
| L6 | `/tools/research-paper-writer` | Upgrade | ai paper writer (1,000) | research paper writer (1,000), paper writer free (390), paper writer ai (210), ai paper generator (140), ai research paper writer (110) |
| L7 | `/tools/citation-generator` | Upgrade | ai citation generator (1,600) | citation ai (1,300), ai citation (880), ai cite (880), cite research paper (880), research cite (720) |
| L8 | `/features/ai-peer-review` | Upgrade | ai reviewer (3,600) | thesis reviewer (590), ai peer review (210), ai paper review (210), research paper review (170), check my research paper |
| L9 | `/thesis-ai` | **New** | thesis ai (1,300) | thesis writer (720), thesis writing assistance (480), ai thesis writer, ai for thesis writing, thesis writing software |
| L10 | `/alternatives/elicit` | **New** | elicit alternative | elicit ai (12,100; use the "vs" angle), elicit research assistant (480), elicit ai tool (390), consensus search engine (110), research rabbit app (170) |

**Avoiding cannibalisation:** `/tools/literature-review-generator` keeps "literature review generator" (70) and L5 takes the broader "literature review ai" queries. Link the two to each other. In the same way, L9 links to `/tools/thesis-chapter-planner` and `/tools/thesis-to-manuscript` without taking over their keywords.

### Shared landing page template

1. Hero: H1 with the primary keyword, a one-line promise, a primary CTA ("Start free") and a secondary CTA ("See how it works"), plus a product visual.
2. Proof strip: 250M+ works, 10,000+ citation styles, page-numbered answers, Word/LaTeX.
3. Problem: what goes wrong without the tool (made-up citations, tab overload, lost references).
4. Three to five feature blocks, each with an H2 that uses a secondary keyword, a visual, and the honest limits.
5. How it works in three steps.
6. Who it's for: students, PhD candidates, faculty, R&D teams.
7. Comparison table (where it makes sense).
8. FAQ with 5 to 8 questions taken from the secondary keywords, marked up with `FAQPage` schema.
9. A final CTA and links to related features, tools and blog posts.

### Landing page outlines

#### L1. Home: "AI for Research: the AI editor that cites real papers"
- **Title:** AI for Research: Search Papers, Write and Cite with AI · **Meta:** ~155 characters covering "AI for research", 250M papers, real citations, free start.
- H1 **AI for research that cites real papers**
- H2 Search 250M+ scholarly works without leaving your draft
- H2 Autocomplete that cites the papers it draws on
- H2 Chat with your PDFs and get answers with page numbers
- H2 An AI reviewer that checks claims, citations and retractions
- H2 Write together, export to Word, PDF or LaTeX
- H2 Who uses AI for Research (students, PhD, faculty, industry R&D)
- H2 Is AI for research allowed? (short answer; link to the post 38 policy guide)
- FAQ: What is the best AI for research? · Is it free? · Does it make up citations? · Can I import Zotero? · Is my data used for training?
- **Note:** the brand name matches the head keyword, so put "AI for Research" in the H1, the title tag and the first sentence of the copy.

#### L2. `/ai-research-tools`: "AI research tools in one workspace"
- H1 **AI research tools for every step from question to citation**
- H2 Find papers: AI search across 250M+ works → `/features/paper-search`
- H2 Read faster: chat with PDFs and summaries with page numbers → `/features/chat-with-pdf`
- H2 Spot gaps: research gap finder and deep research → `/tools/research-gap-finder`, `/tools/deep-research`
- H2 Write: autocomplete with citations, lit review and proposal generators
- H2 Check: AI peer review, claim and source checks
- H2 Why one workspace beats five separate AI tools (a table of the tool tabs people juggle versus this one workspace)
- H2 AI tools for researchers by role (student / PhD / lab / industry)
- FAQ: What AI tools do researchers use? · Are AI research tools accurate? · Free vs paid · Can they replace a literature search?
- Link to the post 31 listicle ("best ai for research").

#### L3. `/academic-ai`: "Academic AI built for scholarly work"
- H1 **Scholar AI for academic and scientific research**
- H2 Grounded in the scholarly record, not the open web
- H2 For the sciences: AI for science and scientific research (STEM workflows, LaTeX)
- H2 For the humanities and social sciences: long-form writing and Chicago/MLA
- H2 Academic integrity built in: authorship report, disclosure-friendly AI use → `/features/authorship-report`, `/ai-use`
- H2 Google Scholar vs academic AI (what each is good for)
- FAQ: Is there a Google Scholar AI? · Can academic AI cite correctly? · Do universities allow it?
- **Note:** "scholar ai" partly means people looking for a specific app called Scholar AI. Write an honest comparison and don't imply you are that app.

#### L4. `/features/paper-search` (upgrade): "Research paper AI: find sources and references"
- H1 **Research paper AI that finds sources you can actually cite**
- H2 Ask in plain language, get real papers (DOI, year, venue)
- H2 Find references for a claim you've already written
- H2 Source quality flags: retracted, preprint, wrong DOI
- H2 `@`-cite straight into your draft in 10,000+ styles
- H2 AI source finder vs Google Scholar vs a library database
- FAQ: How do I find sources for a research paper? · Can AI find references? · Is the AI source finder free?
- Link to posts 39, 40 and 41.

#### L5. `/features/literature-review` (upgrade): "Literature review AI"
- H1 **Literature review AI: from 50 PDFs to a structured review**
- H2 Gather: search and import papers (Zotero/Mendeley)
- H2 Read: ask questions across your Library and get page-numbered answers
- H2 Synthesise: themes, agreements and gaps → link to the generator tool
- H2 Write: draft the review with citations already in place
- H2 What literature review AI can't do (honest limits: judgement, screening protocols)
- FAQ: Can AI write a literature review? · Best AI tool for literature review · Is it plagiarism?
- Link to post 32 and existing post 25.

#### L6. `/tools/research-paper-writer` (upgrade): "AI paper writer"
- H1 **AI research paper writer that cites real sources**
- H2 Outline to draft: section by section, you stay the author
- H2 Every claim backed by a paper you can open
- H2 Free plan: what you can write for free (state the limits honestly)
- H2 Paper writer vs paper generator (why one-click papers get flagged)
- H2 Export to Word or LaTeX for your journal's template
- FAQ: Is there a free AI paper writer? · Will it be detected? (honest answer: write with it, disclose it) · Can it write a full research paper?
- Link to posts 37 and 59.

#### L7. `/tools/citation-generator` (upgrade): "AI citation generator"
- H1 **AI citation generator for APA, MLA, Chicago and 10,000+ styles**
- H2 Paste a title, DOI or URL and get a correct citation
- H2 Cite a research paper inside your draft with `@`
- H2 Checks your reference list for wrong DOIs and retracted papers
- H2 Style pages → `/tools/citation-generator/[style]` (APA, MLA, Chicago, IEEE, Harvard, Vancouver…)
- FAQ: Is there an AI that cites sources? · How do I cite a research paper? · Free?
- Link to post 42 and existing post 24.

#### L8. `/features/ai-peer-review` (upgrade): "AI reviewer for papers and theses"
- H1 **AI reviewer: get peer-review-style feedback before you submit**
- H2 Reviewer-style comments on argument, method and clarity
- H2 Claim checks: does the cited paper actually say that?
- H2 Source quality and citation checks
- H2 Thesis reviewer mode: chapter-by-chapter feedback
- H2 What it isn't: not a replacement for your supervisor or journal reviewers
- FAQ: Can AI peer review a paper? · Is it allowed to use AI review before submission? · How accurate is it?
- Link to post 50.

#### L9. `/thesis-ai` (new): "Thesis AI"
- H1 **Thesis AI: plan, research and write your thesis with citations**
- H2 Plan chapters → `/tools/thesis-chapter-planner`
- H2 Literature review chapter → L5
- H2 Write with autocomplete that cites; keep your supervisor in comments and tracked changes
- H2 Format: Word or LaTeX; your university's citation style
- H2 Turn the thesis into a journal manuscript → `/tools/thesis-to-manuscript`
- H2 Staying within your university's AI policy (authorship report)
- FAQ: Can AI write my thesis? (no, and here's what it can do) · Best thesis writing software · Is thesis AI free?
- Link to posts 45 and 46.

#### L10. `/alternatives/elicit` (new): "Elicit alternative"
- H1 **Looking for an Elicit alternative? Search, read and write in one place**
- H2 Elicit in one paragraph: what it's great at (fair and specific)
- H2 Where AI for Research differs: you write the paper in the same place, with citations, co-editing and Word/LaTeX
- H2 Feature table: AI for Research vs Elicit vs Consensus vs Research Rabbit vs SciSpace (only what can be verified on each product's site; date the table)
- H2 Which to pick for which job
- H2 Using them together (for example, Elicit for screening, AI for Research for writing)
- FAQ: Is Elicit free? · Elicit vs Consensus · Best Elicit alternative for writing
- **Note:** check competitor facts in November 2026 and re-check them every quarter. Later, use the same template for `/alternatives/consensus` and `/alternatives/scispace`.

---

## 2. The 30 blog posts

### Priority

| Wave | Posts | Why |
| --- | --- | --- |
| **1 (write first)** | 31, 33, 39, 40, 41, 42, 43, 48, 52, 60 | Real volume, low paid competition or a rising trend, and a direct product fit |
| **2** | 32, 34, 35, 36, 37, 38, 44, 45, 46, 49, 50, 51 | Strong product fit; harder or smaller |
| **3** | 47, 53, 54, 55, 56, 57, 58, 59 | They round out the topic clusters and the internal-link web |

### Index

| # | Slug | Primary keyword (Vol, Comp) | Cluster | Links to |
| --- | --- | --- | --- | --- |
| 31 | best-ai-for-research | best ai for research (3,600, Med, +50%) | Tools | L1, L2 |
| 32 | ai-for-literature-review | ai for literature review (480, High) | Lit review | L5 |
| 33 | elicit-ai-review | elicit ai (12,100, Med) | Competitors | L10 |
| 34 | research-rabbit-alternatives | rabbit research (590, Low) | Competitors | L4, L10 |
| 35 | ai-search-engines-for-research | ai search engine for research papers / ai literature search (90) | Tools | L4 |
| 36 | google-scholar-ai | scholar ai (1,900, Med) | Tools | L3, L4 |
| 37 | how-to-write-a-research-paper-with-ai | ai for writing research papers (70, High) / using ai to write papers | Writing | L6 |
| 38 | ai-in-academic-research-policies | ai in academia (210, Low) / use of ai in research | Ethics | L1, L3 |
| 39 | how-to-find-sources-for-a-research-paper | find sources (1,300, Low) / sources for research paper (320) | Sources | L4 |
| 40 | how-to-find-who-cited-a-paper | cited articles (4,400, Low) / find citations (480) | Sources | L4, L7 |
| 41 | how-to-find-references-for-a-claim | find references (1,300, Low) / ai reference finder | Sources | L4 |
| 42 | how-to-cite-a-research-paper | cite research paper (880, Low) / citation in research (720) | Citations | L7 |
| 43 | how-to-cite-evidence | cite evidence (2,400, Low, rising fast) | Citations | L7 |
| 44 | how-to-write-a-research-paper | structure of a research paper (260) / research paper (18,100 head) | Writing | L6 |
| 45 | how-to-write-a-thesis-statement-with-ai | ai thesis statement (110, Low) / ai thesis generator (90) | Thesis | L9 |
| 46 | dissertation-help-tools | dissertation helper (1,300, Med) | Thesis | L9 |
| 47 | how-to-write-a-literature-review | literature review writer (720, Low) / research literature review (590) | Lit review | L5 |
| 48 | ai-research-topics | ai research topics (170, Low, +240%) / research topic about ai | Topics | L2 |
| 49 | how-to-find-a-research-gap | find research gap / research question generator | Topics | gap finder tool |
| 50 | how-to-review-your-own-paper | research paper review (170) / check my research paper | Review | L8 |
| 51 | how-to-summarize-a-research-paper-with-ai | research paper summaries (210, Med) / ai paper summary | Reading | chat-with-pdf |
| 52 | how-to-read-a-research-paper | read paper (1,000, Low) / analyze research (480) / analyze articles (480) | Reading | chat-with-pdf |
| 53 | ai-for-systematic-reviews | systematic review ai (70, High) / ai for systematic review | Lit review | L5 |
| 54 | pubmed-ai | pubmed ai (590, Med) / ai in medical research (260) | Field | L3, L4 |
| 55 | best-ai-for-writing-papers | best ai for writing (6,600, Med) / ai tools for writing (880) | Writing | L6 |
| 56 | best-ai-tools-for-students | best ai tools for students (880, Low) | Tools | L2 |
| 57 | quillbot-alternatives-for-academic-writing | quillbot ai (33,100, Low) / wordtune (18,100) | Competitors | paraphrasing tool |
| 58 | ai-grant-writing | ai grant writing (210, High) / grant writing ai (140) | Writing | grant proposal tool |
| 59 | ai-generated-research-papers | ai generated research paper (50) / ai written paper (110) / paper written by ai | Ethics | L6, AI writing checker |
| 60 | latest-ai-research-papers | latest research in ai (210, +51%) / ai research papers (1,600) | Field | `/research` paper pages |

### Blog outlines

Every post includes:
- A 2–3 sentence answer under the H1, so AI assistants have something to quote.
- A "How to do this in AI for Research" section with real screenshots.
- A FAQ of 3 to 5 questions.
- At least 3 internal links: one landing page, one sibling post, and one tool or feature page.
- A byline and a last-updated date.

#### 31. Best AI for Research in 2026: 12 Tools Tested on Real Papers
- **Keywords:** best ai for research, best ai tools for research, best ai research tools (320), top ai tools for research, best ai tools for researchers
- How we tested (the same 3 research questions and the same PDFs in every tool; we checked whether citations were real)
- Quick picks table: best for search / reading / writing / citing / free
- Tool-by-tool: AI for Research, Elicit, Consensus, SciSpace, Scite, Research Rabbit, Semantic Scholar, Perplexity, ChatGPT, NotebookLM, Zotero + AI plugins, Connected Papers
- Which AI is best for your stage of research
- Red flags: fabricated citations and how to catch them
- FAQ: Is ChatGPT good for research? · Best free AI for research?

#### 32. How to Do a Literature Review with AI (Step by Step)
- **Keywords:** ai for literature review, using ai for literature review, literature review using ai, ai literature review tool (170)
- What AI can and can't do in a lit review
- Step 1: define the question and search strings
- Step 2: find papers with AI search and save them to a Library
- Step 3: read and extract with PDF chat (keep the page numbers)
- Step 4: build a synthesis matrix (template)
- Step 5: draft themes with citations
- Step 6: check every claim against its source
- Disclosure and university rules
- Different from existing post 25 (a tools listicle). This one is the method.

#### 33. Elicit AI Review (2026): Features, Pricing, Limits and Who It's For
- **Keywords:** elicit ai, elicit research assistant, elicit ai tool, elicit literature review (170), elicit review
- What Elicit is and how it works
- Hands-on test: search, extraction tables, reports
- Pricing and credits (verify on the date of writing)
- Strengths
- Limits: writing, citation styles, co-authoring
- Elicit vs Consensus vs AI for Research (short version; the full comparison is on L10)
- Verdict by user type

#### 34. Research Rabbit Alternatives: 7 Tools for Discovering Papers
- **Keywords:** rabbit research, research rabbit app, find similar research papers, connected ai (880; check what people mean by it)
- What Research Rabbit does (citation maps, collections)
- Alternatives: Connected Papers, Litmaps, Inciteful, Semantic Scholar feeds, Elicit, AI for Research (be honest: semantic search and a Library, not citation maps)
- Comparison table
- A workflow: discover in one tool, read and write in AI for Research

#### 35. AI Search Engines for Research Papers: Which Ones Give Real Sources?
- **Keywords:** ai literature search, ai paper search, consensus search engine, ai search engine for research
- Why general AI search engines get citations wrong
- How the scholarly AI search engines work (indexes such as OpenAlex and Semantic Scholar)
- Tested: Consensus, Elicit, Semantic Scholar, Perplexity Academic, AI for Research
- How to check any AI search result in 60 seconds
- Search operators that still work

#### 36. Google Scholar AI: What It Does, and Better Ways to Search with AI
- **Keywords:** scholar ai, google scholar artificial intelligence (1,900), google research ai, ai google research
- Google Scholar's built-in features in 2026 (verify)
- Where Scholar falls short: no reading, summarising or drafting
- Pair Scholar with an AI workspace: a workflow
- Scholar alerts plus a Library and PDF chat
- FAQ: Is there an AI version of Google Scholar?

#### 37. How to Write a Research Paper with AI (Without Getting Flagged)
- **Keywords:** ai for writing research papers, using ai to write papers, write a paper with ai, ai to write research paper
- Ground rules: you are the author, AI is the assistant; disclose it
- Outline with AI
- Find and read sources
- Draft section by section with cited autocomplete
- Revise with AI review
- Format and export (Word/LaTeX)
- What to disclose and how (sample statement)

#### 38. AI in Academic Research: University and Journal Policies, Explained (2026)
- **Keywords:** ai in academia, use of ai in research, ai in research, ai and research
- What major publishers allow (Elsevier, Springer Nature, Wiley, IEEE, APA). Check each before publishing.
- University patterns: allowed / allowed with disclosure / banned
- What counts as authorship
- How to write an AI disclosure statement (templates)
- Keeping a record: authorship reports and version history
- Update this post every quarter; it's a strong candidate for AI-answer citations.

#### 39. How to Find Sources for a Research Paper (Fast, Credible, Citable)
- **Keywords:** find sources, source finding, sources for research paper, ai source finder, best way to find sources for a research paper
- What counts as a credible source
- 7 places to look (library databases, Google Scholar, PubMed, arXiv, AI search, reference lists, citation trails)
- Using AI to find sources, and checking that they're real
- Snowballing: backward and forward citation search
- Saving and organising sources
- Template: source evaluation checklist

#### 40. How to Find Who Cited a Paper (and Why It Matters)
- **Keywords:** cited articles (4,400), find citations, find citations of a paper, find articles citing a paper, paper citation search
- Why forward citation search matters
- Google Scholar "Cited by"
- Semantic Scholar, Scopus, Web of Science
- Finding citing papers that disagree (Scite-style context)
- Doing it inside AI for Research
- Reading the citation count honestly

#### 41. How to Find References for a Claim You've Already Written
- **Keywords:** find references, ai reference finder, find cited references, reference tools for research
- The "I wrote it, now I need a source" problem, and its integrity risk
- Turn the claim into a search query
- Use AI search, then verify the paper actually supports the claim
- When no source exists: rewrite the claim
- Using claim checks in AI review
- FAQ: Can AI find references for my essay?

#### 42. How to Cite a Research Paper: APA, MLA, Chicago and IEEE Examples
- **Keywords:** cite research paper, citations for research paper, citation in research, research cite, academic citations (390)
- What you need: authors, year, title, journal, volume, issue, pages, DOI
- APA 7 examples (journal article, preprint, conference paper)
- MLA 9 examples
- Chicago (author-date and notes)
- IEEE and Vancouver
- In-text citation rules
- Common mistakes (DOI format, et al.)
- Generate them automatically → L7

#### 43. How to Cite Evidence: Examples, Sentence Starters and Rules
- **Keywords:** cite evidence (2,400, rising), check your sources (320, rising), cite evidence website
- What "cite evidence" means (school and college)
- Quote vs paraphrase vs summary
- 30 sentence starters for introducing evidence
- Explaining evidence (the claim–evidence–reasoning model)
- Citing the source correctly (MLA/APA examples)
- Checking your sources
- The search trend looks like a school-term spike, so publish before January and August.

#### 44. How to Write a Research Paper: Structure, Steps and Examples
- **Keywords:** structure of a research paper, research paper how to, steps to write a research paper, tips on writing a research paper (140), academic research paper (320)
- IMRaD structure explained
- Steps 1 to 10: topic → question → sources → outline → draft → revise → cite → format → proofread → submit
- Section-by-section tips with examples
- Common reviewer complaints
- Free outline template
- Where AI helps at each step
- This is the hub post for the writing cluster; link it from 37, 45 and 55.

#### 45. How to Write a Thesis Statement (with an AI Thesis Generator Workflow)
- **Keywords:** ai thesis statement, thesis statement ai, ai thesis generator, thesis generator ai
- What makes a strong thesis statement
- Formulas and 15 examples (argumentative, analytical, expository)
- Using AI to brainstorm and stress-test your thesis statement
- Checking it against evidence
- FAQ: Can AI write my thesis statement?

#### 46. Dissertation Help: The Tools and AI Workflow That Gets You to Submission
- **Keywords:** dissertation helper, thesis writing assistance, dissertation writing software, dissertation tools, phd research tools
- The dissertation bottlenecks (lit review, method, writing, formatting)
- Tools by stage: reference manager, AI search, PDF chat, editor, LaTeX/Word
- Working with your supervisor (comments, tracked changes)
- Staying within the rules
- A 12-week writing plan template

#### 47. How to Write a Literature Review: Structure, Example and Template
- **Keywords:** literature review writer, research literature review, help with literature review, literature review helper
- Types (narrative, systematic, scoping)
- Structure: intro, themes, gaps, conclusion
- Synthesis vs summary (with an example paragraph)
- Matrix template
- Worked example outline
- Speeding it up with AI → post 32, L5

#### 48. 100 AI Research Topics for 2026 (by Field and Level)
- **Keywords:** ai research topics, artificial intelligence research topic, research topic about artificial intelligence, research topics on ai
- How to choose a topic (scope, data, supervisor)
- Topics: AI in healthcare, education, law, climate, finance, ethics/policy, NLP, computer vision, robotics, HCI
- Topics for undergraduate / master's / PhD
- Checking a topic isn't already covered → research gap finder
- Refresh the list every year (put the year in the title).

#### 49. How to Find a Research Gap (5 Methods + AI)
- **Keywords:** find research gap, research question generator, research question ai, research question checker
- What a research gap is (types: evidence, method, population, theory)
- Method 1: "future research" sections
- Method 2: conflicting findings
- Method 3: citation trails
- Method 4: review articles
- Method 5: an AI gap finder, then verify
- Turning the gap into a research question (templates)

#### 50. How to Review Your Own Research Paper Before Submission (Checklist)
- **Keywords:** research paper review, check my research paper, review my research paper, research paper editor
- Structure check
- Argument check
- Citation and source check (retracted papers, wrong DOIs)
- Language and tone
- Journal fit
- A self-review checklist you can download
- Using an AI reviewer as a second reader → L8

#### 51. How to Summarize a Research Paper with AI (Accurately)
- **Keywords:** research paper summaries, ai paper summary, ai summarize research paper, research paper summary ai
- Why AI summaries go wrong (they miss limitations, mix up results)
- Prompts that work (per section)
- Ask follow-ups with page numbers
- A summary template (question, method, findings, limits, relevance)
- Batch-summarising a reading list

#### 52. How to Read a Research Paper (Quickly and Critically)
- **Keywords:** read paper (1,000), analyze research, analyze articles, paper analysis, research paper analysis
- The three-pass method
- What to read first (abstract, figures, conclusion)
- Critical appraisal questions
- Taking notes that turn into writing
- Using PDF chat to read faster without skipping the thinking

#### 53. AI for Systematic Reviews: What Works, What Doesn't
- **Keywords:** systematic review ai, ai for systematic review, ai systematic review
- The systematic review steps (PRISMA)
- Where AI helps today: search strings, screening assistants, data extraction, drafting
- Tools: Covidence, Rayyan, ASReview, Elicit, AI for Research (be honest about which steps each covers)
- Validation and reporting rules
- Disclosure in the methods section

#### 54. PubMed AI: How to Search and Read Medical Literature with AI
- **Keywords:** pubmed ai, ai in medical research, ai medical research, ai for medical research
- PubMed search basics (MeSH, filters)
- AI layers on top of PubMed
- Reading clinical papers: PDF chat with page numbers
- Evidence levels and AI's blind spots
- Citing in AMA/Vancouver → `/tools/citation-generator/ama`, `/vancouver`

#### 55. Best AI for Writing Papers and Essays (Tested on Academic Work)
- **Keywords:** best ai for writing, ai tools for writing, best ai writing tools (1,000), best ai for writers (260)
- **Different from existing post 01:** that one targets "ai writing assistant". This one targets "best ai for writing" with an academic test.
- Test: the same prompt and sources; scored on accuracy, citations, voice and policy-safety
- Tools: ChatGPT, Claude, Gemini, Grammarly, QuillBot, Jenni, Paperpal, AI for Research
- Best by use case
- FAQ: What is the best free AI for writing?

#### 56. 15 Best AI Tools for Students in 2026 (Free and Paid)
- **Keywords:** best ai tools for students, ai software for students, research tools for students, ai writing for students
- By job: research, reading, writing, citing, studying, presenting
- Free picks
- How to use AI without breaking academic integrity rules
- A stack for a typical semester

#### 57. QuillBot Alternatives for Academic Writing
- **Keywords:** quillbot ai, ai quillbot, quillbot ai writer, wordtune, quillbot paraphrasing
- What QuillBot does well
- Where it falls short for academic work (no sources, citation drift)
- Alternatives: Wordtune, Grammarly, Paperpal, AI for Research paraphrasing (keeps citations attached)
- Paraphrasing vs plagiarism: the rules
- **Note:** frame this as alternatives. Don't target "quillbot's", which is people trying to reach QuillBot itself.

#### 58. AI Grant Writing: A Practical Guide for Researchers
- **Keywords:** ai grant writing, grant writing ai, ai proposal writer, ai for proposal writing
- What funders say about AI (NIH, NSF, ERC, UKRI). Verify before publishing.
- Using AI for specific aims, the literature background, and budget justification
- Keeping it specific and checkable
- Review before submission
- → grant proposal writer tool, research proposal generator

#### 59. AI-Generated Research Papers: Detection, Risks and the Rules
- **Keywords:** ai generated research paper, ai written paper, paper written by ai, ai generated paper, research paper written by ai
- Recent cases of AI-written papers that slipped through (cite reporting)
- How detectors work, and their false positives
- Hallucinated citations: the most common giveaway
- How to use AI legitimately and document it
- → AI writing checker, authorship report
- **Note:** never promise "undetectable".

#### 60. Latest AI Research Papers: What Matters in 2026 and How to Keep Up
- **Keywords:** latest research in ai, latest ai research, ai research papers, latest ai research papers, new ai research, ai research papers for beginners
- How to keep up (arXiv lists, newsletters, conference proceedings: NeurIPS, ICML, ACL, CVPR)
- 20 papers that matter, with a plain-English summary of each, linking to `/research/papers/[id]` pages
- Starter reading list for beginners
- Reading AI papers with PDF chat
- Make it a monthly roundup (same URL, updated date). This builds freshness and internal links to the paper pages.

---

## 3. Internal linking map

```
                        L1 Home (ai for research)
        ┌──────────────┬──────┴───────┬──────────────┐
   L2 AI research   L3 Academic AI   L9 Thesis AI   L10 Elicit alt
     tools │            │              │               │
   31,48,56,60      36,38,54        45,46          33,34,35
        │
  ┌─────┼────────────┬─────────────┬─────────────┐
 L4 Paper search  L5 Lit review  L6 Paper writer  L7 Citations   L8 AI reviewer
 39,40,41,35,36   32,47,53       37,44,55,59      42,43           50
```

- Every post links up to its landing page using the landing page's primary keyword as anchor text, once.
- Sibling posts in a cluster link to each other.
- Landing pages link down to 2 or 3 posts in a "Learn more" block.
- Add new posts to the sitemap and to the blog's related-posts logic.

## 4. Schedule (2 posts a week, landing pages first)

| Weeks | Ship |
| --- | --- |
| 1–2 | L1, L2, L4, L7 upgrades; posts 31, 39 |
| 3–4 | L3, L5, L6, L8; posts 40, 42, 43 |
| 5–6 | L9, L10; posts 33, 41, 48, 52 |
| 7–10 | Posts 32, 34–38, 44–46 |
| 11–14 | Posts 47, 49–51, 53–60 |
| Every quarter | Re-check competitor facts (33, 34, 55, 57, L10), policies (38, 58) and post 60 |

## 5. Measurement

- In Search Console, track impressions and position for each page's primary keyword. Expect movement in 8 to 12 weeks.
- Check AI-answer visibility for "best ai for research", "elicit alternative" and "how to find sources for a research paper" in ChatGPT, Perplexity and Gemini every month.
- Conversion: signups from organic landing pages, and the click-through rate from blog posts to landing pages. Target 3% or more of post sessions reaching a landing page.
