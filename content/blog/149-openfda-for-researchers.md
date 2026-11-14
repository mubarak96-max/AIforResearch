---
title: "openFDA for Researchers: Adverse Events, Labels and Recalls"
slug: "openfda-for-researchers"
description: "openFDA for researchers: what the drug adverse event, label, recall and device endpoints hold, what FAERS reports cannot show, and how to use and cite them."
primary_keyword: "openfda"
secondary_keywords: ["openfda api", "faers data", "fda adverse event reporting system", "openfda drug event", "fda drug label api", "fda recall data", "pharmacovigilance research"]
cluster: "P. Research by field"
pillar: "/blog/ai-for-qualitative-research"
author: "Mubarak"
compares_tools: false
published: "2026-11-13"
updated: "2026-11-13"
faq:
  - q: "What is openFDA?"
    a: "openFDA is the US Food and Drug Administration's public API and download service for FDA datasets. It covers drugs, medical devices, foods, animal and veterinary products and tobacco, including adverse event reports, product labels, recalls and enforcement reports, and registration data. It is free; an API key raises the daily request limit."
  - q: "Can openFDA adverse event data show that a drug causes a side effect?"
    a: "No. An adverse event report says that an event happened while a person was taking a product, not that the product caused it. The FDA states that a causal relationship cannot be established from the reports. Reports are voluntary for patients and clinicians, incomplete and influenced by publicity, so the data can raise a question for further study but cannot answer it."
  - q: "Can I calculate how common a side effect is from FAERS?"
    a: "No. FAERS has no denominator: you do not know how many people took the drug, and most events are never reported. Report counts therefore cannot give an incidence or a risk. Researchers use disproportionality measures, such as the reporting odds ratio, to compare reporting patterns, but these show signals for further study, not rates."
  - q: "How do I cite openFDA data in a thesis?"
    a: "Cite the dataset as data from the US Food and Drug Administration accessed through openFDA, naming the endpoint (for example, drug adverse events), the exact query or download, the date range of the data and the date you accessed it. Put the full query URLs in an appendix so others can rerun them, and note that results change as reports are added."
  - q: "Does openFDA need an API key?"
    a: "No. You can query openFDA without a key, up to 240 requests a minute and 1,000 requests a day per IP address. A free key raises the daily limit to 120,000 requests. For very large analyses, download the bulk data files instead of paging through the API."
---

# openFDA for researchers: adverse events, labels and recalls, and what they cannot show

*Last updated: 13 November 2026*

openFDA is the US Food and Drug Administration's free public API for FDA data on drugs, medical devices, foods and other products: adverse event reports, drug labels, recalls and enforcement reports, and registration data. Researchers use it to describe reporting patterns, find safety signals and check label wording. Adverse event reports cannot show that a product caused an event or how often events happen, so treat them as signals for further study, never as findings about risk.

This guide is for pharmacy, medicine, public health and regulatory science students and researchers using FDA data in a thesis, review or paper. It is part of our series on [research by field](/blog/ai-for-qualitative-research).

**This is general information about a research data source, not medical advice.** Nothing in openFDA, or in this guide, should guide decisions about anyone's treatment. Those belong to a clinician.

## What does openFDA offer?

**openFDA is a set of public APIs and bulk downloads that serve FDA datasets in a common JSON format** [1]. The endpoints are grouped by product type:

| Category | Endpoints (selection) | What they hold |
| --- | --- | --- |
| Drugs | Adverse events, product labeling, NDC directory, Drugs@FDA, drug shortages, recall enforcement reports | FAERS reports; structured product label text; product and application records; recalls |
| Devices | Adverse events, 510(k), PMA, classification, recalls, enforcement, registration and listing, UDI | Device problem reports (from MAUDE); clearance and approval records; recalls |
| Foods | Adverse events, enforcement reports | Reports on foods and dietary supplements; food recalls |
| Animal and veterinary | Adverse events | Reports on animal drugs |
| Tobacco | Problem reports | Reports about tobacco products |
| Other | Substance data, UNII, NSDE | Substance identifiers and listings |

<!-- VERIFY: full openFDA endpoint list and names on open.fda.gov (checked November 2026: drug event, label, NDC, drugsfda, shortages, enforcement; device 510k, classification, enforcement, event, PMA, recall, registrationlisting, UDI; food enforcement and event; animal and veterinary event; tobacco problem; other substance, UNII, NSDE) -->

Without an API key, you can make 240 requests a minute and 1,000 a day per IP address; a free key raises the daily limit to 120,000 [2]. For large analyses, use the bulk downloads.

## The drug adverse event endpoint (FAERS)

**The drug adverse event endpoint serves reports from the FDA Adverse Event Reporting System (FAERS), a database of reports of adverse events and medication errors submitted to the FDA** [3]. Records run from 2004 and are updated quarterly, with a lag of three months or more [3]. <!-- VERIFY: FAERS coverage start (2004) and update lag in openFDA -->

Each report can include:

- The patient's age, sex and weight, where given.
- One or more drugs, each marked as suspect, concomitant or interacting.
- One or more reactions, coded as MedDRA preferred terms.
- Seriousness and outcome (hospitalization, death and so on).
- Who reported it (health professional, consumer) and the country.

Reporting is voluntary for health professionals and patients in the US; manufacturers must forward the reports they receive [3].

## What adverse event reports can and cannot show

The FDA is explicit: a causal relationship cannot be established between a product and the reactions listed in a report [3]. The limits come from how the data are made.

| Limit | What it means for your analysis |
| --- | --- |
| No causation | A report says an event happened while a person was taking a product. The event may come from the illness, another drug or chance. |
| No denominator | You do not know how many people took the drug, so counts cannot become incidence or risk. |
| Underreporting | Most adverse events are never reported, and not at a constant rate. |
| Reporting bias | Publicity, lawsuits, safety alerts and a product's time on the market change reporting. Rising counts can mean more reporting, not more events [3]. |
| Duplicates and incomplete reports | The same event can arrive from a patient, a doctor and a manufacturer; many fields are empty. |
| Unverified "suspect" drugs | The drug flagged as suspect is the reporter's view, not a finding [3]. |
| Confounding by use | Widely used drugs appear often simply because many people take them [3]. |

What reports can show:

- **Reporting patterns:** which reactions are reported most often for a drug, and how reports changed over time.
- **Signals:** combinations reported more often than expected, which merit study with better designs.
- **Case series:** descriptions of serious or unusual reported events.

### Disproportionality analysis

Pharmacovigilance researchers compare how often a reaction is reported for one drug against all other drugs in the database, using measures such as the reporting odds ratio (ROR) or the proportional reporting ratio (PRR). A high ROR is a signal of disproportionate reporting, not a measure of risk, and it inherits every bias in the table above. Report it with that wording. <!-- VERIFY: optionally cite READUS-PV (2024) reporting guideline for disproportionality analyses -->

## Where FAERS sits in the evidence

Spontaneous reports are near the bottom of the evidence hierarchy for questions about harm, below cohort and case-control studies and randomized trials. They are good at generating hypotheses and detecting rare events that trials are too small to see; they are poor at testing them. Our guide to [levels of evidence and study types](/blog/levels-of-evidence-and-study-types) explains the hierarchy.

## How to use openFDA in a thesis or review

1. **Define the question as a reporting question.** "Which reactions are most often reported for drug X?" is answerable. "Does drug X cause reaction Y?" is not.
2. **Fix the drug and reaction terms.** Use generic names and the openFDA harmonized fields (for example `patient.drug.openfda.generic_name`), and MedDRA preferred terms for reactions. <!-- VERIFY: openFDA harmonized field names -->
3. **Set the date range** and record it.
4. **Run count queries** to tabulate reactions, for example `count=patient.reaction.reactionmeddrapt.exact`. <!-- VERIFY: count query syntax -->
5. **Deal with duplicates and missing data.** Say how you handled them, or that you could not.
6. **Check the label.** Use the drug label endpoint to see whether a reaction is already listed in the labeling.
7. **Put it next to stronger evidence.** Search trials and observational studies on the same drug and reaction, and discuss where they agree or disagree.
8. **Log every query.** Keep the full query URLs, dates and result counts in an appendix.
9. **Write the limitations first.** Causation, denominators and reporting bias belong in your methods, not only your discussion.

### A worked example (invented)

Example (invented for illustration): a pharmacy master's student reviews reported adverse events for a class of diabetes drugs between 2019 and 2025.

- A count query on the drug adverse event endpoint returns the 20 most-reported reactions for each drug in the class. She reports these as reporting frequencies, not rates.
- One reaction rises sharply in 2023. She finds an FDA safety communication from that year and notes stimulated reporting as a likely reason.
- The drug label endpoint shows the reaction is already in the warnings section for two of the four drugs.
- She computes a reporting odds ratio against all other drugs, describes it as a signal of disproportionate reporting, and lists the biases.
- She then searches for cohort studies and trials on the same reaction and summarizes their findings separately.
- Her conclusion: the reporting pattern is consistent with the label and with two cohort studies; the data cannot estimate risk, and the review makes no recommendation about treatment.

## How to cite openFDA data

openFDA serves FDA data; credit the FDA as the producer and openFDA as the access route. A dataset citation in your style might read:

> U.S. Food and Drug Administration. (2026). *Drug adverse event data (FAERS), 2019–2025* [Data set]. openFDA. Retrieved November 13, 2026, from https://open.fda.gov/apis/drug/event/

<!-- VERIFY: whether FDA/openFDA publishes a recommended citation -->

Add the exact queries in an appendix and state that results change as reports are added and revised.

## Common mistakes

- **Writing "caused" or "associated with an increased risk"** from report counts.
- **Calculating rates** from FAERS counts.
- **Ignoring stimulated reporting** after news or safety alerts.
- **Comparing raw counts between drugs** with very different use.
- **Not logging queries,** so the analysis cannot be repeated.
- **Drawing treatment conclusions.** A review of reports can recommend further study, not a change in anyone's care.

## openFDA in AI for Research

Official Sources (the /official-sources route) looks up openFDA alongside ClinicalTrials.gov, FRED, US Treasury Fiscal Data and the OECD, at 0 credits. You see the FDA record with a link back to the source. <!-- VERIFY: which openFDA endpoints the Official Sources integration queries -->

<!-- SCREENSHOT: Official Sources showing an openFDA drug adverse event result with its source link -->

To put the reports next to the published evidence, run [Deep Research](/features/deep-research) on the same drug and reaction with the Medical sources (PubMed and Europe PMC). A run costs credits by depth: Summary 1, Deep 15. The report cites the studies it uses, so you can check each one. The Free plan has 45 credits a month; see [pricing](/pricing). Results are for research; any clinical question needs a health professional's review. The [medicine and health](/fields/medicine-and-health) page lists the other tools for the field.

## FAQ

### What is openFDA?

openFDA is the US Food and Drug Administration's public API and download service for FDA datasets. It covers drugs, medical devices, foods, animal and veterinary products and tobacco, including adverse event reports, product labels, recalls and enforcement reports, and registration data. It is free; an API key raises the daily request limit.

### Can openFDA adverse event data show that a drug causes a side effect?

No. An adverse event report says that an event happened while a person was taking a product, not that the product caused it. The FDA states that a causal relationship cannot be established from the reports. Reports are voluntary for patients and clinicians, incomplete and influenced by publicity, so the data can raise a question for further study but cannot answer it.

### Can I calculate how common a side effect is from FAERS?

No. FAERS has no denominator: you do not know how many people took the drug, and most events are never reported. Report counts therefore cannot give an incidence or a risk. Researchers use disproportionality measures, such as the reporting odds ratio, to compare reporting patterns, but these show signals for further study, not rates.

### How do I cite openFDA data in a thesis?

Cite the dataset as data from the US Food and Drug Administration accessed through openFDA, naming the endpoint (for example, drug adverse events), the exact query or download, the date range of the data and the date you accessed it. Put the full query URLs in an appendix so others can rerun them, and note that results change as reports are added.

### Does openFDA need an API key?

No. You can query openFDA without a key, up to 240 requests a minute and 1,000 requests a day per IP address. A free key raises the daily limit to 120,000 requests. For very large analyses, download the bulk data files instead of paging through the API.

## Learn more

- Where spontaneous reports sit: [levels of evidence and study types](/blog/levels-of-evidence-and-study-types).
- Finding the trials and cohort studies: [how to search PubMed](/blog/how-to-search-pubmed).
- Checking a safety claim against the literature: [how to check a claim against the research](/blog/how-to-check-a-claim-against-the-research).
- Tools for the field: [medicine and health](/fields/medicine-and-health).

## Sources

1. U.S. Food and Drug Administration. openFDA APIs. https://open.fda.gov/apis/
2. U.S. Food and Drug Administration. openFDA: Authentication and rate limits. https://open.fda.gov/apis/authentication/
3. U.S. Food and Drug Administration. openFDA: Drug adverse events overview. https://open.fda.gov/apis/drug/event/
