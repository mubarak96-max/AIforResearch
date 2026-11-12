# Sample documents for testing

Two test inputs for every feature, on two real-world topics:

- **Sleep and memory in university students**: psychology, a master's thesis.
- **Urban green space and student wellbeing in Nairobi**: environmental studies, a proposal and a PhD.

Every paper cited is real, and all the DOIs were checked against Crossref on 12 November 2026, except a few planted errors. The planted errors are listed under each feature, so you know what the app should catch.

To remake the Word, PDF and survey files after editing the Markdown, run `node samples/build.mjs` from the repository root.

## What is real and what is not

| Real | Made up for testing |
| --- | --- |
| Every cited paper, its authors, year and DOI (apart from the planted errors) | The thesis chapter, proposal, drafts, abstracts and claims (written for these tests) |
| `data-lab/student-sleep-1908.csv`: the classic sleep data from Cushny and Peebles, published by "Student" (1908) | `data-lab/green-space-wellbeing-survey.csv`: simulated, from a fixed seed, with planted relations |
| The papers in the systematic-review exports | Their abstracts, which are short summaries rather than the publishers' text |
| | The funding call (a fictional fund), "Kamau & Otieno (2021)" and "Wanjiru & Ochieng (2022)" (they do not exist) |

## Feature by feature

### Deep Research (`/deep-research`)

**Questions to ask:**

1. *Does sleep after learning improve memory consolidation in students?* Use Deep depth, All papers. Expect a cited report, and a consensus line where most studies support the claim.
2. *Is living near urban green space associated with better mental health?* Use Deep depth, Medical + All papers. Also try the Study type filter set to Systematic review + Meta-analysis.

**Attachments** (Attach → Upload a file):

- `reviewer/thesis-chapter-2-sleep-memory.pdf` with *What gaps does my chapter leave open?* The answer should cite the file (as "Your file") as well as papers.
- `reviewer/research-proposal-green-space-nairobi.docx` with *Which studies could I add to my background section?*

**Also try:**

- Summary vs Detailed depth. On Free, Detailed should open the upgrade dialog.
- Headings off.
- High quality: Pro only.
- A follow-up question: *What about naps?*

### Find Papers (`/papers`)

- Search *napping night shift workers alertness* with sources Medical + Preprints, then the filters Last 10 years and Randomized controlled trial.
- Search *green space cortisol* with All papers, Journal "High-impact and above", sorted by Most cited. Ulrich (1984), Roe et al. (2013) and Twohig-Bennett and Jones (2018) should appear near the top.

### Reviewer (`/reviewer`)

**1. `reviewer/thesis-chapter-2-sleep-memory.docx`** (also `.pdf`, `.md`). Document type Thesis, level Master's, checks all on.

Planted problems the review should find:

- Section 2.2 overclaims: "sleep after learning **proves** that memories are permanently stored".
- Section 2.5 has a sweeping uncited claim: "Everyone needs eight hours of sleep… will always perform worse".
- Wrong year: "Stickgold (2003)" is a 2005 paper (Nature 437:1272).
- A citation to a paper that does not exist: Kamau and Otieno (2021).
- Section 2.4 lists studies without synthesising them. The gap in 2.6 is good, but Chapter 3's method is not linked to it.

**2. `reviewer/research-proposal-green-space-nairobi.docx`** (also `.pdf`). Document type Proposal, level Master's. Try once in Standard and once in High quality (Pro).

Planted problems:

- Overclaim: green space is "**proven to cure** stress and depression in all populations".
- Convenience sampling with "about 250 students is considered adequate", and no sample size calculation.
- The analysis plan is vague: "appropriate statistical tests", no confounders, no handling of campus clustering.
- The ethics section is one line: no approval route, consent or data protection.
- The expected outcome assumes the result. There is no timeline and no limitations.
- The budget leaves out NDVI processing.

On the Free plan, both files should produce the free preview: the first 3,000 words, the full scorecard and the top 3 comments.

### Claim check (`/reviewer?module=claims`)

Paste the contents of either file:

- `claim-check/claims-sleep-and-learning.txt`
  - **Supported:** sentences 1–3. Sources: Jenkins and Dallenbach 1924 / Diekelmann and Born 2010 for sentence 1, Mednick et al. 2003 for sentence 2, Xie et al. 2013 for sentence 3.
  - **Not supported:** sentence 4. Lim and Dinges (2010) found simple attention is the most affected.
  - **No evidence or overstated:** sentences 5 and 6.
- `claim-check/claims-green-space-health.txt`
  - **Supported:** sentences 1–3. Sources: Ulrich 1984, Bratman et al. 2015, White et al. 2019.
  - **Supported or partly supported:** sentence 4 (Roe et al. 2013; Twohig-Bennett and Jones 2018).
  - **Not supported:** sentences 5 and 6. "Completely eliminates" and "always… within one year" are overstated; Kuo and Sullivan (2001) is cross-sectional.

### Citation check (`/reviewer?module=citations`)

**`citation-check/references-apa-mixed.txt`** (10 references):

| Reference | Expected result |
| --- | --- |
| Obokata et al. (2014) | **Retracted** (Crossref shows the retraction) |
| Wakefield et al. (1998) | **Retracted**, also with a correction notice |
| Kamau and Otieno (2021) | **Not found** (does not exist) |
| Stickgold (2003) | **Year mismatch**: the DOI resolves to 2005 |
| Xie et al. (2013) | **DOI not found**: the planted DOI ends `1241999`; the real one ends `1241224` |
| Vaswani et al. (2017) | **Preprint** (arXiv) |
| Diekelmann, Lim, Mednick, Walker | Found, no problems |

**`citation-check/references-vancouver-health.txt`** (10 references, numbered style):

| Reference | Expected result |
| --- | --- |
| Twohig-Bennett and Jones (number 7) | **Year mismatch**: written 2016, the DOI is 2018 |
| Wanjiru and Ochieng (number 9) | **Not found** (does not exist) |
| The other eight | Found, no problems |

Turn on the AI sentence check with the thesis chapter's text to see whether the citing sentences match the sources.

### Writing Studio (`/write`)

- **Improve document:** upload or paste `writing/draft-discussion-rough.md` (grammar such as "results… shows", "would of", "there/their"; wordy and informal). Try *Revise* and *Proofread*, then pick per paragraph.
- **Paraphrase:** paste `writing/draft-introduction-rough.txt`.
- **Literature review:** topic *sleep and memory consolidation in university students*, or start from a Deep Research result ("Build on this" → Write a literature review).
- **Abstract:** paste the thesis chapter's text.
- **Templates:** open "Research proposal" and check that the editor opens with the headings.

### Thesis Suite (`/thesis`)

| Module | Input |
| --- | --- |
| Similar papers | Title "Sleep-dependent learning: a nap is as good as a night" |
| Research question refiner | *Does napping help students remember lectures?* (FINER, then PICO) |
| Thesis outline and Methodology builder | `thesis/abstract-msc-sleep-lecture-recall.txt` |
| Research gaps | *urban green space and mental health in African cities* |
| Defence preparation | Upload `thesis/abstract-phd-green-space-wellbeing.txt` or the thesis chapter PDF. Expect questions on self-reported sleep, NDVI buffers, causality and the mixed-methods integration. |
| Autonomous proposal | *Campus green space and exam stress among Kenyan undergraduates* |

### Proposal Studio (`/proposals`)

- **Grant proposal:** paste `proposals/call-early-career-research-grant.txt` as the call and `proposals/idea-notes-nap-intervention.txt` as the idea. The draft should follow the call's seven sections and include a sample size justification (d = 0.5).
- **Research proposal:** paste the idea notes alone. Try the whole proposal, then only the methods section.
- **Ethics application:** the idea notes (students as participants, sleep and grade data).
- **Data management plan:** the idea notes (actigraphy data, grades).

### Slides (`/slides`)

- From an uploaded file: `reviewer/research-proposal-green-space-nairobi.pdf`, kind "Proposal presentation".
- From a research result ("Build on this" → Make slides), kind "Thesis defence". On Free you should see 5 slides for 3 credits, and the download should ask you to upgrade.

### Systematic Review (`/systematic-review`)

Create a review with the question *Is exposure to urban green space associated with mental health in adults?*, type Systematic review, framework PICO. Then in Search → Upload:

1. `systematic-review/green-space-scopus-export.csv` (11 records, labelled Scopus).
2. `systematic-review/green-space-wos-export.ris` (10 records, labelled Web of Science).

Expected results:

- **Duplicates:** 21 records in, 5 duplicates (Gascon, Bratman, Twohig-Bennett, White, Engemann), which leaves 16.
- **Screening:** 3 are off topic and should be excluded: Kuo and Sullivan (crime), Diekelmann and Born (sleep), Xie et al. (sleep).
- **Agreement:** to see kappa, add a second reviewer through a project, or turn on AI as second reviewer.
- **PRISMA:** the diagram should show 21 identified, 5 duplicates removed, 16 screened.

Also run a PubMed search in the builder, for example `(green space OR greenspace OR park*) AND (mental health OR wellbeing OR stress)`, and check the live count.

### Data Lab (`/data-lab`)

**`data-lab/student-sleep-1908.csv`**: real data, 10 patients, two sleep drugs.

- Paired t-test of drug 2 against drug 1: mean difference 1.58 hours, t(9) ≈ 4.06, p ≈ .003.
- "Which test?" should recommend the paired t-test, with Wilcoxon as the alternative.

**`data-lab/green-space-wellbeing-survey.csv`**: simulated, 240 students, 13 columns. It has two blank cells on purpose (one wellbeing score and one minutes value) to test missing data.

| Analysis | Expected result |
| --- | --- |
| Correlation of `ndvi_500m` with `wellbeing_wemwbs` | Positive |
| Correlation of `commute_minutes` with `stress_pss10` | Positive |
| Regression of wellbeing on park visits | Positive slope |
| Welch t-test of stress by gender (female vs male) | About 2 points higher for women |
| ANOVA of wellbeing by campus | Kikuyu highest |
| Chi-square of campus by `feels_safe_in_parks` | Kikuyu has the most students who feel safe (about 65%), Parklands the fewest (about 49%) |

Then write the AI report and open it in the editor.

### Citation Map and Landscape

- **Citation Map** (`/citation-map`): seed DOI `10.1038/nrn2762` (Diekelmann and Born 2010). Snowball one round, then "Find reviews citing this set". Second seed: `10.1126/science.6143402` (Ulrich 1984).
- **Landscape** (`/landscape`):
  - Topic *sleep memory consolidation*, from 2000.
  - Compare *urban green space mental health* with *blue space mental health*.

### Library and Chat with PDF

Upload `reviewer/thesis-chapter-2-sleep-memory.pdf` and `reviewer/research-proposal-green-space-nairobi.pdf` to the Library, then ask:

- *Which theory of consolidation does the chapter describe first?* The answer should give the page.
- *What sample size does the proposal plan?*

### History and Projects

1. Create a project called *MSc thesis: sleep and memory*.
2. Move two of the jobs above into it.
3. Invite a second account with "Can comment", then sign in as that person. They should see the work but not be able to delete it.
4. On Free, a second project or a second invitee should open the upgrade dialog.

### Credits

On a fresh Free account, a Deep report (5) plus a free Reviewer preview (3) should leave 22 of 30 credits. A failed job, such as a question with no results, should give its credits back.
