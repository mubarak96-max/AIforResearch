---
slug: "citation-map"
seo_title: "Citation Map: Find Papers Through References and Citations"
description: "Build a citation map from one paper: its references and citing papers as a graph, snowballing rounds across your set, and reviews that cite it. Free."
heading: "Citation map: follow a paper's references and citations to what you missed"
intro: "Paste a DOI or a title and see what the paper cites and what cites it, as a graph and as lists. Build a set, run snowballing rounds across it, and export it. No credits."
primary_keyword: "citation map"
secondary_keywords: ["citation graph", "citation snowballing", "find similar papers", "cited articles", "backward and forward citation search", "papers citing a paper"]
hero: "cta"
cta:
  label: "Map a paper"
  href: "/citation-map"
plan_note: "Citation Map costs no credits on any plan, the free plan included. You need a free account to save maps to your History."
related: ["/blog/citation-snowballing", "/blog/how-to-find-who-cited-a-paper", "/features/deep-research", "/features/systematic-review", "/features/research-library"]
updated: "2026-11-12"
faq:
  - q: "What is a citation map?"
    a: "A citation map is a picture of how papers link through their references. It starts from one or more seed papers and shows the papers they cite (backward) and the papers that cite them (forward). In AI for Research the map is a graph where circle size shows citations, with the same papers in sortable lists you can filter and export."
  - q: "Is the Citation Map free?"
    a: "Yes. Building a map, running snowballing rounds, finding reviews that cite your set, and exporting to RIS or CSV cost no credits on any plan. You need a free account so the map and your set are saved to your History. Requests share a fair-use limit of 300 an hour."
  - q: "Where does the citation data come from?"
    a: "From OpenAlex, an open index of scholarly works. When OpenAlex has no reference links for a paper, the map falls back to Semantic Scholar. Coverage follows those indexes: recent journal articles with DOIs are well covered, while books, theses and older or non-English papers may have fewer links."
  - q: "How does snowballing work in the Citation Map?"
    a: "Add the papers that matter to your set, then press Backward, Forward or Both. Each round reads the references or citing papers of up to 25 papers in your set and lists up to 60 candidates, ranked by how many of your papers link to each one. Papers you have already seen are hidden unless you turn that off."
  - q: "Can I export my citation map to Zotero or EndNote?"
    a: "You can export your set as an RIS file, which Zotero, Mendeley and EndNote import, or as a CSV with the OpenAlex id, title, authors, year, journal, DOI, citation count and the round each paper was added. You can also save the whole set to your AI for Research Library in one click."
---
A citation map shows the papers a seed paper cites and the papers that cite it, so you find related work a keyword search misses. AI for Research's Citation Map draws it from one paper or several, runs snowballing rounds across your set and finds reviews that cite it: useful for starting or checking a literature review.

<!-- SCREENSHOT: the Map tab with an orange seed paper in the middle, references and citing papers around it, circle size by citations -->

## What you can do with it

- **See both directions at once**: the references of a paper (backward) and the papers citing it (forward), most-cited first.
- **Build a set** of the papers that matter, by adding them from the map or the lists.
- **Snowball across the whole set**, round after round, with each candidate ranked by how many of your papers link to it.
- **Find reviews and meta-analyses** that cite your set, to check what you might have missed.
<!-- LINK: /tools/similar-papers-finder when L29 ships (the Thesis Suite's Similar papers finds related papers from pasted text) -->
- **Export the set** to RIS or CSV, or save it to your Library to ask questions of it in Deep Research.

## How it works, step by step

1. **Choose your seed.** Paste a DOI, an OpenAlex id or a paper title and press Map it. Or press From my Library and pick up to 10 saved papers.
2. **Read the map.** The Map tab draws your seed papers in orange, with circle size showing citations. Click a circle to see the paper. The References and Citing tabs show the same papers as lists: about 40 in each direction, most-cited first.
3. **Filter the lists** by year range, minimum citations or study type (meta-analysis, systematic review, randomized controlled trial, cohort and others).
4. **Add papers to your set.** Press + next to any paper. Your seeds are already in the set. Each paper in the panel shows the round it was added in (R0 for seeds, R1, R2 and so on).
5. **Run a snowballing round.** In the Your set panel, press Backward, Forward or Both. The round reads up to 25 papers of your set and lists up to 60 candidates. Papers linked to several of your papers come first, tagged "Linked to 3 of your set". For backward rounds this finds the papers your set cites in common.
6. **Repeat** until a round brings nothing new worth adding. Keep "Hide papers already seen" on so each round shows only new papers.
7. **Press Find reviews citing the set** to list review articles and meta-analyses that cite your papers, with the most links first.
8. **Export or save.** Download RIS or CSV, or press Save to Library. The map and your set are saved in your History, so you can reopen them and continue.

<!-- SCREENSHOT: the Snowball tab after a backward round, with "Linked to 3 of your set" tags and the Your set panel showing rounds R0 to R2 -->

## The views at a glance

| View | What it shows | Limit |
| --- | --- | --- |
| Map | Seeds, references and citing papers as a graph; circle size by citations; your set in dark blue | About 40 references and 40 citing papers, shared across up to 10 seeds |
| References | Papers the seeds cite, most-cited first | Same as the map |
| Citing | Papers that cite the seeds, most-cited first | Same as the map |
| Snowball | Candidates from the latest round, ranked by links into your set | Reads up to 25 set papers; up to 60 candidates a round |
| Reviews | Reviews and meta-analyses citing your set, most links first | Checks up to 50 set papers; up to 40 results |
| Your set | The papers you kept, with the round each was added | Up to 500 papers |

Each paper shows its authors, year, journal, study type, citation count, an Open access tag and a Retracted tag where it applies, with links to open it, open its PDF when one is free, or save it to your Library.

## Example: snowballing from one trial

*This is an example of the steps, not a real result.*

A PhD student studying exercise and depression pastes the DOI of one well-known trial. The map shows its references and the papers that cite it. She adds eight papers that study the same question to her set, then runs a backward round: the candidates at the top are the older trials that several of her papers cite in common. She adds five, runs a forward round to find newer studies that cite her set, adds four more, and presses Find reviews citing the set, which lists two meta-analyses she had not seen. She exports the 18 papers as RIS into Zotero. Credits used: none.

## What it costs

The Citation Map costs **0 credits** on every plan, including the free plan. Building maps, snowballing, finding reviews, exporting and saving to your Library are all free. Map requests share a fair-use limit of 300 an hour. If you then want a cited answer from the papers in your set, save them to your Library and choose My Library as a source in [Deep Research](/features/deep-research): a Summary costs 1 credit and a Deep report 15.

## What it does not do

- **It only knows the links in its indexes.** Citation data comes from OpenAlex, with Semantic Scholar where OpenAlex has no links. Papers missing from both, or indexed without reference lists, will not appear.
- **The first map is capped.** A highly cited paper may have thousands of citing papers; the map shows the most-cited 40 in each direction. Use the year and citation filters, and snowballing rounds, to go further.
- **It does not judge relevance.** Ranking is by the number of links into your set, then by citations. You decide what belongs in the set.
- **It does not read the papers.** For what the papers say, use Deep Research or ask questions of PDFs in your [Library](/features/research-library).
- **Snowballing is not a substitute for a database search** in a systematic review. Use it as a supplementary search and report it as such. The [Systematic Review](/features/systematic-review) workspace imports the RIS file.

## Who uses it

- PhD candidates building a literature review chapter from a few key papers: see [AI tools for PhD students](/for/phd).
- Master's students checking that they have not missed a central study: see [AI for a master's thesis](/for/masters).
- Review teams running backward and forward citation searches after the database search: see [Systematic Review](/features/systematic-review).

Comparing citation-graph tools? Our [comparison of three citation mapping tools](/blog/connected-papers-vs-researchrabbit-vs-litmaps) covers how they differ.

## Learn more

- [Citation snowballing: backward and forward searching explained](/blog/citation-snowballing)
- [How to find who cited a paper](/blog/how-to-find-who-cited-a-paper)
- [How to build a search strategy for a systematic review](/blog/systematic-review-search-strategy)
