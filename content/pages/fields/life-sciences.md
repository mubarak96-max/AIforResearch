---
slug: "life-sciences"
seo_title: "AI for Biology Research: Genes, Proteins and Papers"
description: "AI for biology research: Deep Research reads NCBI Gene, UniProt, Ensembl, Reactome, PDB, AlphaFold DB, GWAS Catalog and ClinVar next to papers and bioRxiv."
heading: "AI for biology research that reads the databases, not only the papers"
intro: "Ask a question about a gene, a protein or a pathway and get a cited answer that draws on the public biology databases and the literature together. It looks records up; it does not analyze your sequences."
primary_keyword: "ai for biology research"
secondary_keywords: ["bioinformatics ai", "gene and protein lookup", "protein database search"]
hero: "cta"
cta:
  label: "Ask a biology question"
  href: "/deep-research"
plan_note: "The Free plan has 45 credits a month. A Summary answer with the Life sciences sources costs 1 credit and a Deep report 15; searching papers is free."
related: ["/features/deep-research", "/features/paper-search", "/features/literature-review", "/features/data-lab", "/fields/medicine-and-health", "/fields/chemistry-and-materials", "/blog/gene-and-protein-databases-for-literature-review"]
updated: "2026-11-13"
faq:
  - q: "Which biology databases does it use?"
    a: "The Life sciences source group in Deep Research looks up NCBI Gene, UniProt, Ensembl, Reactome, PDB, AlphaFold DB, the GWAS Catalog and ClinVar. Records from these databases appear next to papers from PubMed, Europe PMC, OpenAlex and Semantic Scholar, and preprints from bioRxiv, each with a link to the original record."
  - q: "Can it analyze my sequences or RNA-seq data?"
    a: "No. It does not run sequence alignment, BLAST, variant calling, RNA-seq or single-cell analysis, structure prediction or workflow pipelines. It reads what public databases already hold about a gene, protein or variant. For your own data, use your lab's pipelines; Data Lab handles tabular statistics such as t-tests, ANOVA and regression."
  - q: "Does AlphaFold DB mean it predicts protein structures?"
    a: "No. AlphaFold DB is a database of structures already predicted by AlphaFold. Deep Research can tell you whether a predicted structure exists for a UniProt entry, and link to it, next to any experimental structure in PDB. It does not run a prediction for a new sequence."
  - q: "Can I use ClinVar results for a clinical decision?"
    a: "No. ClinVar collects submitted interpretations of variants, which can conflict and change over time. Deep Research shows what ClinVar records say for a literature review or a grant. A clinical interpretation of a variant belongs to an accredited laboratory and a qualified professional."
  - q: "What does a Life sciences answer cost?"
    a: "The same as any Deep Research run, by depth: Summary 1 credit, Deep 15, Detailed 45 on paid plans. The database lookups are included. The Free plan has 45 credits a month."
---
AI for biology research is useful when it can read what the field's databases say, not only what papers say. In AI for Research, Deep Research has a **Life sciences** source group that looks up NCBI Gene, UniProt, Ensembl, Reactome, PDB, AlphaFold DB, the GWAS Catalog and ClinVar, then writes a cited answer that puts those records next to the published literature and bioRxiv preprints. You see which statement came from a database record and which from a paper.

<!-- SCREENSHOT: a Deep Research answer on a gene with the Cited tab showing a UniProt entry, a Reactome pathway and three papers -->

## Sources for life sciences

| Source | What it holds | Where in the product | Credits |
| --- | --- | --- | --- |
| NCBI Gene | Gene records: names, aliases, location, function summary | Deep Research, Life sciences | As the run's depth |
| UniProt | Protein entries: function, domains, sequence features | Deep Research, Life sciences | As the run's depth |
| Ensembl | Genes, transcripts and genome annotation across species | Deep Research, Life sciences | As the run's depth |
| Reactome | Curated biological pathways and reactions | Deep Research, Life sciences | As the run's depth |
| PDB | Experimentally determined 3D structures | Deep Research, Life sciences | As the run's depth |
| AlphaFold DB | Structures already predicted by AlphaFold | Deep Research, Life sciences | As the run's depth |
| GWAS Catalog | Published genome-wide association results | Deep Research, Life sciences | As the run's depth |
| ClinVar | Submitted interpretations of human variants | Deep Research, Life sciences | As the run's depth |
| bioRxiv and medRxiv | Preprints, flagged as not peer reviewed | Preprints source | As the run's depth |
| PubMed, Europe PMC, OpenAlex, Semantic Scholar | Journal articles, 250M+ scholarly works | Medical and All papers; also Find Papers | Search 0 |

Depth costs are Summary 1 credit, Deep 15 and Detailed 45 (paid plans). Lookups do not cost extra.

## Tools for life sciences

| Tool | What it does | Credits |
| --- | --- | --- |
| [Deep Research](/features/deep-research) | Cited answers from the Life sciences group plus papers and preprints | Summary 1, Deep 15, Detailed 45 (paid) |
| [Find Papers](/features/paper-search) | Search journals and preprints with filters | 0 |
| [Review matrix](/features/literature-review) | Papers side by side: aims, methods, samples and findings, each cell with its quote and page | 1 a paper |
| [Data Lab](/features/data-lab) | t-tests, ANOVA, regression, Bayesian t-tests on your tabular data, calculated in the browser | 0; AI write-up 2 |
| [Reporting guideline check](/features/reporting-guideline-checker) | SAGER for sex and gender reporting, SAMPL for statistical reporting | 5 per 10,000 words |
| [Scientific diagrams](/features/scientific-diagrams) | Flowcharts and study designs as Mermaid diagrams in the editor | 0; Draw with AI 1 |
| [Study checklists](/features/clinical-research-checklists) | A genomics incidental-findings plan, blank or tailored to your study | Blank 0, tailored 3 |

The ARRIVE guidelines for animal research are not in the guideline check; use the published ARRIVE checklist by hand.

## A worked example

*Example (invented for illustration):* a master's student is writing the background chapter on a kinase that her lab studies in zebrafish.

1. Deep Research, sources Life sciences and Preprints, Summary depth: "What is known about the function of this kinase, its pathways and its human disease associations?" The answer cites the NCBI Gene and UniProt entries, two Reactome pathways and six papers. 1 credit.
2. She asks a follow-up on structure. The answer notes one experimental structure in PDB for the kinase domain and an AlphaFold DB model for the full protein, with links to both. 1 credit.
3. She asks about variants; the answer summarizes what ClinVar records say, including two variants with conflicting interpretations. She uses this only as background, not as a clinical statement. 1 credit.
4. She runs one Deep report on the kinase's role in development across species: 15 credits.
5. Her qPCR fold changes go into Data Lab for a Welch t-test, free; the AI results paragraph costs 2.

Total: 20 credits, inside the Free plan's 45 a month.

## Citation styles and reporting standards

Biology journals use a wide range of reference styles, from numbered styles such as Nature's to author-year styles; the editor formats references in 10,000+ styles, and the journal formatter has a Nature preset with a blank Nature template. For reporting, the guideline check covers SAGER (sex and gender in research, which applies to cell lines and animals as well as people) and SAMPL (basic statistical reporting). For a human genetic association study, STROBE 2007 applies to the observational design. Database records should be cited with their accession number and the release or date you read them.

## What it does not do

- No sequence analysis: no BLAST, alignment, primer design or variant calling.
- No RNA-seq, single-cell or proteomics pipelines, and no workflow runners.
- No structure prediction. AlphaFold DB records are looked up, not computed.
- No docking or molecular simulation.
- ClinVar is shown for research. It is not for clinical decisions, and interpretations in ClinVar can conflict and change.
- Database records change with each release. Cite the record and the date you read it, and check it at the source.

## Who uses it

- Master's and PhD students in biology: see [AI for master's students](/for/masters) and [AI for PhD students](/for/phd).
- Principal investigators and lab members: see [AI for academics](/for/academics).
- Biotech and pharma research teams: see [AI for industry](/for/industry).

For compounds and bioactivity, see [chemistry and materials](/fields/chemistry-and-materials). For trials and clinical reporting, see [medicine and health](/fields/medicine-and-health).

## Learn more

- [Gene and protein databases for a literature review](/blog/gene-and-protein-databases-for-literature-review)
- [How to write a literature review](/blog/how-to-write-a-literature-review)
- [How to search PubMed](/blog/how-to-search-pubmed)
- [What is deep research AI?](/blog/what-is-deep-research-ai)
