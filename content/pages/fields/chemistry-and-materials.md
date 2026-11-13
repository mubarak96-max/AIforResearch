---
slug: "chemistry-and-materials"
seo_title: "AI for Chemistry Research: PubChem, ChEMBL, Papers"
description: "AI for chemistry research: Deep Research reads PubChem compound records and ChEMBL bioactivity data next to the literature, and the editor cites in ACS style."
heading: "AI for chemistry research, with compound and bioactivity records cited"
intro: "Ask about a compound, a target or a class of reactions and get a cited answer that draws on PubChem and ChEMBL as well as papers and preprints. Write it up with ACS style references."
primary_keyword: "ai for chemistry research"
secondary_keywords: ["chemical compound search", "bioactivity data", "pubchem search"]
hero: "cta"
cta:
  label: "Ask a chemistry question"
  href: "/deep-research"
plan_note: "The Free plan has 45 credits a month. A Summary answer with the Chemistry sources costs 1 credit and a Deep report 15; paper search and statistics are free."
related: ["/features/deep-research", "/features/paper-search", "/features/journal-formatter", "/citation-styles", "/features/data-lab", "/fields/life-sciences", "/fields/engineering-and-computing"]
updated: "2026-11-13"
faq:
  - q: "Can I search PubChem with AI for Research?"
    a: "Deep Research has a Chemistry source group that looks up PubChem and ChEMBL. Ask about a compound by name or in a question, and the answer cites the PubChem record next to papers, with a link to each record. For a structure or substructure search, use PubChem's own interface."
  - q: "What bioactivity data does ChEMBL add?"
    a: "ChEMBL holds bioactivity measurements, such as IC50 or Ki values against targets, curated from the literature. Deep Research can summarize what ChEMBL reports for a compound or a target and cite the records, so you can trace a value back to the assay and the paper it came from."
  - q: "Does it cover materials science databases?"
    a: "No. There is no materials property database among the sources, so crystal structures, band gaps and similar data are not looked up. Materials science papers are covered through the normal paper sources (OpenAlex, Semantic Scholar and arXiv preprints)."
  - q: "Can it do molecular modeling or virtual screening?"
    a: "No. It does not run docking, molecular dynamics, quantum chemistry, QSAR models or virtual screening, and it does not predict properties. It reads and cites what databases and papers already report."
  - q: "Can I cite in ACS style?"
    a: "Yes. The editor formats references in more than 10,000 citation styles, including ACS. The journal formatter can also check a manuscript against a chemistry journal's section order and limits, and lists what still breaks its author guidelines."
---
AI for chemistry research should tell you where a number came from. In AI for Research, Deep Research has a **Chemistry** source group that looks up PubChem compound records and ChEMBL bioactivity data, and writes a cited answer that puts those records next to journal papers and preprints. A reported IC50 value points back to the ChEMBL record, and the record points to the assay and the paper.

<!-- SCREENSHOT: a Deep Research answer about a compound with the Cited tab showing a PubChem record, two ChEMBL activity records and papers -->

## Sources for chemistry and materials

| Source | What it holds | Where in the product | Credits |
| --- | --- | --- | --- |
| PubChem | Compound records: identifiers, names and synonyms, computed properties <!-- VERIFY: which PubChem fields the Chemistry source returns --> | Deep Research, Chemistry | As the run's depth |
| ChEMBL | Bioactivity measurements against targets, curated from the literature | Deep Research, Chemistry | As the run's depth |
| OpenAlex and Semantic Scholar | 250M+ scholarly works, including chemistry and materials journals | All papers source; Find Papers | Search 0 |
| arXiv and other preprint servers | Preprints, flagged as not peer reviewed (ChemRxiv is not listed among the sources) | Preprints source | As the run's depth |
| PubMed and Europe PMC | Medicinal chemistry and pharmacology articles | Medical source | As the run's depth |
| My Library | Your own PDFs, including papers behind your institution's access | My Library source | As the run's depth |

Depth costs are Summary 1 credit, Deep 15 and Detailed 45 (paid plans). CAS SciFinder and Reaxys are not searched.

## Tools for chemistry and materials

The Chemistry group works best for questions that name a compound or a target: what has been reported, in which assays, and in which papers. For broad questions about a reaction class or a materials system, the paper sources do most of the work, and the answer says so by citing papers rather than records.


| Tool | What it does | Credits |
| --- | --- | --- |
| [Deep Research](/features/deep-research) | Cited answers from PubChem, ChEMBL, papers and preprints | Summary 1, Deep 15, Detailed 45 (paid) |
| [Find Papers](/features/paper-search) | Search the literature with filters for year and journal tier | 0 |
| [Journal formatter](/features/journal-formatter) | Section order, word and abstract limits and reference style for a journal, plus what still breaks its guidelines | 3 per 10,000 words, at most 12 |
| [Citation styles](/citation-styles) | ACS among 10,000+ styles in the editor | 0 |
| [Data Lab](/features/data-lab) | Regression, ANOVA and t-tests on your measurements, calculated in the browser | 0; AI write-up 2 |
| [Scientific diagrams](/features/scientific-diagrams) | Process flowcharts and study designs in the editor | 0; Draw with AI 1 |
| [Reporting guideline check](/features/reporting-guideline-checker) | SAMPL for statistical reporting | 5 per 10,000 words |

## A worked example

*Example (invented for illustration):* a PhD student in medicinal chemistry is writing the introduction to a paper on a series of kinase inhibitors.

1. Deep Research, sources Chemistry and All papers, Summary depth: "What bioactivity has been reported for the parent compound against its main kinase target, and in which assays?" The answer cites the PubChem record and four ChEMBL activity records with their assay types, and three papers. 1 credit.
2. A follow-up asks which close analogs have published activity on the same target. 1 credit.
3. One Deep report reviews selectivity problems for this inhibitor class: 15 credits.
4. Her dose-response summary values go into Data Lab for a one-way ANOVA across the series, free.
5. She writes the paper in the editor with ACS references, then runs the journal formatter on the 6,000-word draft: 3 credits.

Total: 20 credits, inside the Free plan's 45 a month.

## Citation styles and reporting standards

Most chemistry journals use ACS style, and many materials journals use numbered styles from Elsevier, Wiley or RSC; the editor formats references in 10,000+ citation styles, ACS and RSC among them. <!-- VERIFY: RSC style is available in the CSL style list --> When you cite a compound or an activity value, give the PubChem CID or the ChEMBL identifier as well as the paper, so a reader can trace it. For statistical reporting, the SAMPL guidelines in the guideline check apply to dose-response and assay comparisons as much as to clinical work.

## What it does not do

- No molecular modeling: no docking, molecular dynamics or quantum chemistry.
- No virtual screening, QSAR models or property prediction.
- No structure or substructure search; it looks up records by name and identifier.
- No materials property databases. Crystal structures, band gaps and similar materials data are not looked up; materials papers come through the normal paper sources.
- No reaction planning or retrosynthesis.
- It does not check safety data for laboratory use. Read the safety data sheet and follow your institution's rules.
- Bioactivity values vary with the assay. Compare like with like, and read the original paper before you cite a number.

## Who uses it

- PhD students and postdocs in chemistry: see [AI for PhD students](/for/phd).
- Academic groups and supervisors: see [AI for academics](/for/academics).
- Pharma, chemicals and materials R&D teams: see [AI for industry](/for/industry).

For genes, proteins and pathways, see [life sciences](/fields/life-sciences). For engineering and computing sources, see [engineering and computing](/fields/engineering-and-computing).

## Learn more

- [How to find sources for a research paper](/blog/how-to-find-sources-for-a-research-paper)
- [How to format a paper for a journal](/blog/how-to-format-a-paper-for-a-journal)
- [How to write a research paper](/blog/how-to-write-a-research-paper)
- [What is deep research AI?](/blog/what-is-deep-research-ai)
