---
title: "Gene and Protein Databases for a Literature Review"
slug: "gene-and-protein-databases-for-literature-review"
description: "Gene and protein databases for a literature review: NCBI Gene, UniProt, Ensembl, Reactome, PDB, AlphaFold DB, GWAS Catalog and ClinVar, IDs and how to cite."
primary_keyword: "gene and protein databases"
secondary_keywords: ["biological databases", "ncbi gene", "uniprot", "ensembl", "protein data bank", "alphafold database", "gwas catalog", "clinvar", "how to cite a database"]
cluster: "P. Research by field"
pillar: "/blog/ai-for-qualitative-research"
author: "Mubarak"
compares_tools: false
published: "2026-11-13"
updated: "2026-11-13"
faq:
  - q: "What are the main gene and protein databases?"
    a: "For genes, NCBI Gene and Ensembl; for proteins, UniProt; for pathways, Reactome; for experimental 3D structures, the Protein Data Bank (PDB); for predicted structures, the AlphaFold Protein Structure Database; for trait associations, the GWAS Catalog; and for the clinical significance of variants, ClinVar. Each uses its own stable identifiers, which you should record and cite."
  - q: "Should I cite a database or the original paper?"
    a: "Usually both. Cite the original paper for any specific finding, such as a crystal structure or a variant's association with a disease, because the database record summarizes that work. Cite the database, with its recommended reference and the release or access date, when you used it as a resource, for example to retrieve sequences or annotations. Give the record identifiers in the text or a supplementary table."
  - q: "How do I cite UniProt or another biological database?"
    a: "Use the reference the database recommends on its 'cite us' or 'about' page, which is usually its most recent paper in the Nucleic Acids Research database issue. For UniProt that is 'UniProt: the Universal Protein Knowledgebase in 2025'. Add the release number or the date you accessed it, and list the accession numbers you used, such as P04637."
  - q: "Can ClinVar be used to make clinical decisions?"
    a: "No. ClinVar is a public archive of interpretations that laboratories and others submit; it does not verify them, and submitters can disagree. It is a research resource. Clinical decisions about a patient's variant need a certified laboratory and a clinical geneticist or genetic counselor. In a literature review, report ClinVar classifications with their review status and date."
  - q: "What is the difference between PDB and AlphaFold DB?"
    a: "The Protein Data Bank archives structures determined by experiment, such as X-ray crystallography, cryo-electron microscopy or NMR. The AlphaFold Protein Structure Database holds structures predicted by the AlphaFold model, each with a per-residue confidence score. Treat predicted structures as models, check the confidence in the region you discuss, and prefer an experimental structure when one exists."
---

# Gene and protein databases for a literature review: what each holds and how to cite it

*Last updated: 13 November 2026*

Gene and protein databases give you curated facts about a gene or protein, such as its sequence, function, structure, pathways and known variants, each tied to a stable identifier and to the papers behind it. In a literature review, use them to fix exactly which gene, protein or variant you mean, to find the primary papers, and to report current annotations. Cite the original paper for a finding and the database, with its release or access date, for the resource.

This guide covers eight databases that life science students and researchers use most often in reviews and theses: NCBI Gene, UniProt, Ensembl, Reactome, PDB, AlphaFold DB, the GWAS Catalog and ClinVar. It is part of our series on [research by field](/blog/ai-for-qualitative-research).

## Why use databases in a literature review?

Papers use inconsistent names. One protein can have several aliases, gene symbols change, and a variant can be written in three notations. Databases solve three problems:

1. **Identity.** A stable identifier (NCBI Gene ID 7157, UniProt P04637, Ensembl ENSG00000141510) says exactly which entity you mean: here, human TP53 and its protein p53. <!-- VERIFY: TP53 identifiers in NCBI Gene, UniProt and Ensembl -->
2. **Discovery.** Curated records list the key literature, so they are a good starting point for snowballing.
3. **Currency.** Annotations are updated as evidence changes, so a record shows the current consensus better than a ten-year-old review.

## The eight databases at a glance

| Database | Run by | What it holds | Identifier example |
| --- | --- | --- | --- |
| NCBI Gene | US National Center for Biotechnology Information | Gene-centered records: names, aliases, location, function summary, links to literature and sequences | Gene ID `7157` |
| UniProt | UniProt Consortium (EMBL-EBI, SIB, PIR) | Protein sequences and function; Swiss-Prot entries are manually reviewed, TrEMBL entries are automatically annotated | Accession `P04637` |
| Ensembl | EMBL-EBI | Genome annotation: genes, transcripts, regulatory features, variation and comparative genomics | `ENSG00000141510` |
| Reactome | Reactome consortium | Curated, peer-reviewed biological pathways and reactions | Stable ID `R-HSA-` followed by digits |
| Protein Data Bank (PDB) | Worldwide PDB (wwPDB) partners | Experimentally determined 3D structures of proteins and nucleic acids | PDB ID `1TUP` |
| AlphaFold DB | Google DeepMind and EMBL-EBI | Structures predicted by AlphaFold, with per-residue confidence (pLDDT) | `AF-P04637-F1` |
| GWAS Catalog | NHGRI and EMBL-EBI | Published genome-wide association studies and their variant-trait associations | Study accession `GCST` followed by digits |
| ClinVar | NCBI | Submitted interpretations of the clinical significance of variants | Variation ID; VCV and RCV accessions |

<!-- VERIFY: operators of each database, and the example identifiers (1TUP as a p53 core domain-DNA structure; AF-P04637-F1 format) -->

## What each database is good for

### NCBI Gene

Start here when a paper names a gene by an alias. The record lists the official symbol, all aliases, the organism, the genomic location and a curated summary, and links to publications through its GeneRIF and bibliography sections. Use it to confirm you have the right gene and species before you search the literature. <!-- VERIFY: NCBI Gene bibliography and GeneRIF sections -->

### UniProt

Use UniProt for protein function, domains, post-translational modifications, subcellular location and disease associations. Check whether an entry is reviewed (Swiss-Prot) or unreviewed (TrEMBL): reviewed entries are curated from the literature, with evidence codes for each statement. Each annotation links to the papers behind it.

### Ensembl

Use Ensembl when transcripts, isoforms or genome coordinates matter, for example to say which transcript a variant falls in, or to compare a gene across species. Record the Ensembl release and genome assembly (such as GRCh38), because coordinates change between assemblies.

### Reactome

Use Reactome to place a gene or protein in a pathway and to find the papers that support each reaction. Pathways are curated and reviewed by experts, and each reaction cites its literature. It is useful for the background section of a review on a signaling or metabolic process.

### Protein Data Bank (PDB)

Use the PDB when you discuss a structure. Each entry gives the method, resolution, organism and the primary citation. Report the PDB ID and the method and resolution, and cite the primary publication for the structure.

### AlphaFold DB

Use AlphaFold DB when no experimental structure exists, or to see a full-length model. Every prediction carries a per-residue confidence score (pLDDT), and low-confidence regions should not be interpreted as structure. Say clearly in your text that a structure is predicted.

### GWAS Catalog

Use the GWAS Catalog to find published associations between variants and traits, with the study, sample size, ancestry, effect size and p-value. It is a good way to check whether a reported association has been replicated, and to see how much of the evidence comes from populations of European ancestry.

### ClinVar

Use ClinVar to see how laboratories have classified a variant (for example pathogenic, likely benign or of uncertain significance), how many submitters agree and the review status. Classifications change as evidence accumulates, so report the date you checked.

**ClinVar is a research archive, not a diagnostic tool.** It records what submitters say; it does not verify it, and submitters can conflict. Do not use ClinVar, or a literature review based on it, to make decisions about a patient's care. Those need a certified laboratory and a clinical geneticist or genetic counselor.

## Cite the database record or the paper?

| You used the database to... | Cite |
| --- | --- |
| Report a specific finding (a structure, an association, a function shown in an experiment) | The original paper. Give the record ID as well |
| Retrieve sequences, annotations or a set of records for your own analysis | The database's recommended reference, plus release or access date and the IDs |
| Summarize a curated classification (ClinVar significance, UniProt function) | The database with access date, and the key primary papers |
| Show a predicted structure | AlphaFold DB's recommended references and the model ID |

The rule of thumb: the database is a secondary source for findings and a primary source for its own curated data.

## How to cite gene and protein databases

Most databases ask you to cite their latest paper in the annual *Nucleic Acids Research* database issue. Check each database's "cite us" or "about" page, because the recommended paper changes every year or two.

| Database | Recommended citation (check the database's page) |
| --- | --- |
| NCBI Gene | Sayers, E. W., et al. Database resources of the National Center for Biotechnology Information in 2025. *Nucleic Acids Research*. <!-- VERIFY: NCBI's recommended citation for Gene and the latest year --> |
| UniProt | The UniProt Consortium. (2025). UniProt: the Universal Protein Knowledgebase in 2025. *Nucleic Acids Research, 53*(D1), D609–D617. https://doi.org/10.1093/nar/gkae1010 [1] |
| Ensembl | Dyer, S. C., et al. (2025). Ensembl 2025. *Nucleic Acids Research, 53*(D1). <!-- VERIFY: Ensembl 2025 citation --> |
| Reactome | Milacic, M., et al. (2024). The Reactome Pathway Knowledgebase 2024. *Nucleic Acids Research, 52*(D1). <!-- VERIFY: Reactome citation --> |
| PDB | The primary publication of the structure, the entry DOI (format 10.2210/pdbXXXX/pdb), and Berman, H. M., et al. (2000). The Protein Data Bank. *Nucleic Acids Research, 28*(1), 235–242. <!-- VERIFY: wwPDB citation policy and entry DOI format --> |
| AlphaFold DB | Jumper, J., et al. (2021). Highly accurate protein structure prediction with AlphaFold. *Nature, 596*, 583–589; and the latest AlphaFold DB paper by Varadi, M., et al. in *Nucleic Acids Research*. <!-- VERIFY: AlphaFold DB recommended citations --> |
| GWAS Catalog | The latest NHGRI-EBI GWAS Catalog paper in *Nucleic Acids Research* (for example Sollis, E., et al., 2023). <!-- VERIFY: current GWAS Catalog recommended citation --> |
| ClinVar | Landrum, M. J., et al. (2018). ClinVar: improving access to variant interpretations and supporting evidence. *Nucleic Acids Research, 46*(D1), D1062–D1067. <!-- VERIFY: ClinVar recommended citation --> |

In the text, give the identifiers: "human p53 (UniProt P04637; accessed 13 November 2026)". For many records, put them in a supplementary table with the database, ID, release or access date and what you took from each.

## A worked example (invented)

Example (invented for illustration): a PhD student writes the background chapter on a missense variant in a DNA repair gene.

1. **Fix identity.** NCBI Gene confirms the official symbol and two aliases used in older papers. She records the Gene ID, the UniProt accession and the Ensembl gene ID.
2. **Function.** The reviewed UniProt entry lists the domain the variant falls in and cites 12 papers. She reads the 5 that report experiments.
3. **Transcript.** Ensembl shows the canonical transcript on GRCh38, so she writes the variant in HGVS notation against that transcript.
4. **Structure.** The PDB has a crystal structure of the domain at 2.1 Å; she cites its primary paper. The full-length protein exists only as an AlphaFold model, with low confidence in a linker region she therefore does not interpret.
5. **Associations.** The GWAS Catalog lists 3 studies associating nearby variants with a cancer trait, all in European-ancestry samples, which she notes as a limitation.
6. **Clinical significance.** ClinVar shows conflicting classifications from 4 submitters; she reports the review status and access date and does not draw a clinical conclusion.
7. **Pathway.** Reactome places the protein in a repair pathway; she cites Reactome for the diagram and the primary papers for each step she discusses.

## Common mistakes

- **Using gene aliases without an ID.** Readers cannot tell which gene you mean.
- **Citing a database for a finding.** The database is not the source of the experiment; cite the paper.
- **No release or access date.** Annotations change; your statement may not match the record next year.
- **Treating predicted structures as experimental.** Say "predicted" and check pLDDT.
- **Mixing genome assemblies.** GRCh37 and GRCh38 coordinates differ.
- **Using ClinVar as a diagnosis.** It is an archive of submitted interpretations.

## Using these databases in AI for Research

In [Deep Research](/features/deep-research), the "Life sciences" source group adds NCBI Gene, UniProt, Ensembl, Reactome, PDB, AlphaFold DB, the GWAS Catalog and ClinVar to a run, next to the paper sources. A related "Chemistry" group adds PubChem and ChEMBL. The report cites its sources, so you can open the record or paper and check it. <!-- VERIFY: how Life sciences records are cited in the report (record ID and link) --> A run costs credits by depth: Summary 1, Deep 15. The Free plan has 45 credits a month and 2 Deep reports a day; see [pricing](/pricing).

<!-- SCREENSHOT: Deep Research source picker with the "Life sciences" group selected, and a report paragraph citing a UniProt accession and a PDB ID -->

Check every identifier and classification against the database itself before you cite it, and record the access date. Anything touching a patient's variant needs a clinical professional's review. The [life sciences](/fields/life-sciences) page lists the other tools for the field.

## FAQ

### What are the main gene and protein databases?

For genes, NCBI Gene and Ensembl; for proteins, UniProt; for pathways, Reactome; for experimental 3D structures, the Protein Data Bank (PDB); for predicted structures, the AlphaFold Protein Structure Database; for trait associations, the GWAS Catalog; and for the clinical significance of variants, ClinVar. Each uses its own stable identifiers, which you should record and cite.

### Should I cite a database or the original paper?

Usually both. Cite the original paper for any specific finding, such as a crystal structure or a variant's association with a disease, because the database record summarizes that work. Cite the database, with its recommended reference and the release or access date, when you used it as a resource, for example to retrieve sequences or annotations. Give the record identifiers in the text or a supplementary table.

### How do I cite UniProt or another biological database?

Use the reference the database recommends on its "cite us" or "about" page, which is usually its most recent paper in the Nucleic Acids Research database issue. For UniProt that is "UniProt: the Universal Protein Knowledgebase in 2025". Add the release number or the date you accessed it, and list the accession numbers you used, such as P04637.

### Can ClinVar be used to make clinical decisions?

No. ClinVar is a public archive of interpretations that laboratories and others submit; it does not verify them, and submitters can disagree. It is a research resource. Clinical decisions about a patient's variant need a certified laboratory and a clinical geneticist or genetic counselor. In a literature review, report ClinVar classifications with their review status and date.

### What is the difference between PDB and AlphaFold DB?

The Protein Data Bank archives structures determined by experiment, such as X-ray crystallography, cryo-electron microscopy or NMR. The AlphaFold Protein Structure Database holds structures predicted by the AlphaFold model, each with a per-residue confidence score. Treat predicted structures as models, check the confidence in the region you discuss, and prefer an experimental structure when one exists.

## Learn more

- Structuring the review itself: [how to write a literature review](/blog/how-to-write-a-literature-review).
- Finding the primary papers: [how to search PubMed](/blog/how-to-search-pubmed).
- Following a key paper's references: [citation snowballing](/blog/citation-snowballing).
- Tools for the field: [life sciences](/fields/life-sciences).

## Sources

1. The UniProt Consortium. (2025). UniProt: the Universal Protein Knowledgebase in 2025. *Nucleic Acids Research, 53*(D1), D609–D617. https://doi.org/10.1093/nar/gkae1010
