---
title: "How to Write a Conference Paper: Structure, Limits, Camera-Ready"
slug: "how-to-write-a-conference-paper"
description: "How to write a conference paper: choosing a venue, page limits, the contribution list, a section-by-section structure, double-blind rules and camera-ready."
primary_keyword: "how to write a conference paper"
secondary_keywords: ["conference paper structure", "conference paper format", "conference paper vs journal paper", "ieee conference paper template", "acm conference paper template", "double blind review anonymization", "camera ready paper"]
cluster: "R. Writing and publishing papers"
pillar: "/blog/how-to-write-a-conference-paper"
author: "Mubarak"
compares_tools: false
published: "2026-11-13"
updated: "2026-11-13"
faq:
  - q: "How long is a conference paper?"
    a: "Most full conference papers run 4 to 10 pages in a two-column template, and short papers 2 to 4. The call for papers sets the limit and says whether references and appendices count toward it. Treat the limit as fixed: many venues reject papers that exceed it without review."
  - q: "What is the difference between a conference paper and a journal paper?"
    a: "A conference paper is shorter, written to a fixed deadline and page limit, and reviewed in one round, sometimes with a short rebuttal. A journal paper has no deadline, more space, and several rounds of revision. In computer science and parts of engineering, full conference papers are archival and count as major publications; in most other fields, conferences take abstracts and the paper goes to a journal later."
  - q: "How do I anonymize a paper for double-blind review?"
    a: "Remove author names, affiliations and acknowledgments, cite your own earlier work in the third person as you would anyone else's, strip names from file metadata, and replace links to your own code or data with anonymized ones. Follow the venue's own anonymity policy, because some ask you to omit self-citations entirely and others do not."
  - q: "Can I publish a conference paper in a journal later?"
    a: "Often, yes, as an extended version. Many journals accept extended conference papers if the new version adds substantial new material, commonly described as around 30% new content, and cites the conference version. Check the journal's policy and the conference's copyright terms before you start, because the rules differ."
  - q: "Can AI write a conference paper?"
    a: "AI can draft the structure, the related work and wording from your own results, but it cannot supply your contribution or your data. Use a tool that cites real papers, give it your actual method and numbers, and check every claim and citation before submission. Read the venue's policy on AI use too: many require you to disclose it."
---

# How to write a conference paper

*Last updated: 13 November 2026*

To write a conference paper, pick the venue first, then write to its page limit and template from the start. Open with a clear list of contributions, back each one with evidence in the method and evaluation, place your work against related research, and state the limitations. Anonymize for double-blind review if the venue asks, and leave time for the camera-ready version after acceptance.

This is the pillar guide of our series on writing and publishing papers. It is written for students and researchers submitting full papers to peer-reviewed conferences, especially in computer science, engineering and other fields where conference proceedings count as publications. The related guides cover [formatting a paper for a journal](/blog/how-to-format-a-paper-for-a-journal), [formatting a reference list](/blog/how-to-format-a-reference-list), [making a research poster](/blog/how-to-make-a-research-poster) and [drawing a conceptual framework diagram](/blog/how-to-draw-a-conceptual-framework-diagram).

## Conference paper vs journal paper

Both report original research, but they are written under different constraints.

| | Conference paper | Journal paper |
| --- | --- | --- |
| Length | Fixed page limit, often 4 to 10 pages | Word limit, usually more generous |
| Timing | Hard submission deadline | Submit when ready |
| Review | One round, sometimes with a short author rebuttal | Several rounds of revision |
| Decision time | Weeks to a few months | Months, sometimes a year or more |
| Presentation | You present it as a talk or poster | No presentation |
| Standing | Archival and highly valued in computer science and parts of engineering | The main venue in most other fields |

In medicine, the life sciences, the social sciences and the humanities, most conferences accept abstracts, not full papers. You present the work and then publish the full paper in a journal. If that is your field, see [how to write a research paper](/blog/how-to-write-a-research-paper) and [how to format a paper for a journal](/blog/how-to-format-a-paper-for-a-journal) instead.

## Step 1: Choose the venue before you write

The venue decides your page limit, your template, your review model and your audience. Choose it first.

1. **Match the scope.** Read the call for papers, then five or six papers from recent proceedings. If none looks like yours, the reviewers may not either.
2. **Check the deadlines.** Many venues have an abstract registration deadline a week before the full paper. Missing it can block your submission.
3. **Check the paper types.** Full, short, demo and workshop papers have different limits and weight.
4. **Look at standing.** Ranking lists (for example, the CORE rankings in computing) and your supervisor's view help. A workshop at a major conference suits early work. <!-- VERIFY: CORE rankings remain the commonly cited list for computing conferences -->
5. **Note the review model.** Single-blind, double-blind or open review changes how you write the first draft.

## Step 2: Write to the page limit from the first draft

Download the venue's template on day one and write in it. A draft poured into a two-column template late is usually far too long, and cutting under deadline pressure hurts the method and evaluation most.

Check four things in the call:

- **The page limit** and whether references, appendices and an ethics statement count toward it.
- **The template.** Do not change margins, fonts or spacing; many venues reject papers that do.
- **Required sections.** Some venues now require a limitations section, an ethics statement or a reproducibility checklist.

A rough page budget for a 6-page two-column paper:

| Section | Pages |
| --- | --- |
| Abstract and introduction | 1 |
| Related work | 0.5 to 0.75 |
| Method or system | 1.5 to 2 |
| Evaluation or results | 1.5 to 2 |
| Discussion and limitations | 0.5 |
| Conclusion | 0.25 |
| References | As allowed |

## Step 3: Write the contribution list first

Before you draft anything else, write three or four bullet points that start "We..." and say what is new. This list becomes the end of your introduction, and it is the thing reviewers judge.

*Example (invented for illustration):*

> Our contributions are:
> - A lightweight anomaly detector for edge sensor nodes that runs in under 64 KB of memory.
> - An evaluation on three public sensor datasets against four baselines, measuring F1 score, latency and energy use.
> - An open-source implementation and the scripts to reproduce every table.

Good contributions are specific, checkable and backed later in the paper. "We study anomaly detection" is a topic. "We show that X reduces Y by Z on dataset W" is a contribution. Every contribution should map to a section or table that supports it; if you cannot point to one, cut the claim or do the work.

## Step 4: Draft the sections in a useful order

Write the method and evaluation first, then the introduction, related work, discussion and conclusion, and the abstract and title last.

### Title

Name the problem and the approach, or the main finding. Avoid "Towards" and "A Novel" unless the venue's culture expects them.

### Abstract

Four to six sentences, usually 150 to 250 words: the problem, why existing approaches fall short, what you did, the main result with a number, and why it matters. Many venues ask you to paste the abstract into the submission system separately, so it must stand alone.

### Introduction with contributions

Roughly four paragraphs: the problem and why it matters; what current work does and where it falls short (the gap); your idea in one or two sentences; then the contribution list and, optionally, a one-line roadmap of the paper. Reviewers often decide their recommendation by the end of page one.

### Related work

Group prior work by approach, not by paper, and say how yours differs from each group: "Unlike [3], [7], which assume labeled data, our method...". Our guide to [citation snowballing](/blog/citation-snowballing) helps you find what you missed.

### Method or approach

Enough detail for an expert to reimplement it: the problem setup, your design and the reasoning behind each choice, and a figure showing the system or pipeline. Put long proofs and parameter tables in an appendix if the venue allows one.

### Evaluation or results

State the research questions, datasets, baselines, metrics and setup before the results. Then report results that answer each contribution, with tables and figures that a reviewer can read without the text. Include an ablation or sensitivity analysis if the method has several parts. Report variance or confidence intervals, not single runs; [which statistical test to use](/blog/which-statistical-test-to-use) helps when you compare methods.

### Discussion and limitations

Say what the results mean, when your method does not work, and what threats to validity remain (dataset bias, small samples, hardware differences). A frank limitations section earns trust; hiding limitations invites a reviewer to find them.

### Conclusion

Three to five sentences: what you did, what you found, what comes next. Do not introduce new results.

## Step 5: Anonymize for double-blind review

If the venue is double-blind, a reviewer must not be able to identify you from the paper. Common requirements:

- Remove author names, affiliations, emails and acknowledgments (including funding).
- Cite your own earlier work in the third person: "Smith et al. [4] showed" rather than "in our previous work [4]". Some venues ask you to replace the citation with "Anonymous" and supply the paper separately; follow the venue's policy.
- Replace links to your GitHub, lab page or dataset with an anonymized repository or a note that the link will be added.
- Strip your name from the PDF metadata and from figure files.
- Avoid phrases that identify you, such as the name of your system if it is already well known.

With acmart, the class options `review` and `anonymous` hide author details and add line numbers. With IEEEtran, you remove the author block yourself. <!-- VERIFY: current acmart documentation for the review and anonymous options -->

## Step 6: Use the venue's LaTeX template correctly

Most computing and engineering venues provide LaTeX classes (and often a Word template). The two most common:

```latex
% IEEE conference paper
\documentclass[conference]{IEEEtran}
\begin{document}
\title{Lightweight Anomaly Detection for Edge Sensor Networks}
\author{\IEEEauthorblockN{First Author}
\IEEEauthorblockA{Department, University \\ email@example.org}}
\maketitle
\begin{abstract}
...
\end{abstract}
\begin{IEEEkeywords}
anomaly detection, edge computing
\end{IEEEkeywords}
\section{Introduction}
...
\end{document}
```

```latex
% ACM conference paper, anonymous submission
\documentclass[sigconf,review,anonymous]{acmart}
\begin{document}
\title{Lightweight Anomaly Detection for Edge Sensor Networks}
\author{First Author}
\affiliation{\institution{University}\country{Country}}
\begin{abstract}
...
\end{abstract}
\keywords{anomaly detection, edge computing}
\maketitle
\section{Introduction}
...
\end{document}
```

Two details matter. In acmart, the abstract and keywords go **before** `\maketitle`; in IEEEtran, they go after it. And ACM papers carry CCS Concepts (terms from the ACM Computing Classification System), which you generate from ACM's own tool and paste in. Springer's LNCS (`llncs` class) is the third template you are likely to meet. Use the version linked from the call for papers, not an old copy from a colleague. <!-- VERIFY: abstract placement relative to \maketitle in the current IEEEtran and acmart releases -->

## Step 7: Before you submit

Check the page limit in the unmodified template, that each contribution is backed by a section or table, that figures read in grayscale, that anonymity holds (including PDF metadata), and that the references are complete; see [how to format a reference list](/blog/how-to-format-a-reference-list). Disclose any AI use as the venue requires. Reading the paper as a reviewer would helps; [how to review your own paper](/blog/how-to-review-your-own-paper) gives a method.

## Step 8: Rebuttal and camera-ready

Some venues let you answer reviews in a short rebuttal before the decision. Answer the misunderstandings and factual errors first, briefly and politely; you cannot add new experiments in most rebuttals. The approach in [how to respond to reviewer comments](/blog/how-to-respond-to-reviewer-comments) works here in compressed form.

After acceptance you prepare the **camera-ready** version:

1. Restore author names, affiliations and acknowledgments.
2. Make the changes reviewers asked for and you promised.
3. Switch the template to its final mode (for acmart, remove `review` and `anonymous`, then add the rights information ACM sends you).
4. Complete the copyright or license form.
5. Run any PDF checks the publisher requires (IEEE conferences often use IEEE PDF eXpress to check fonts and format). <!-- VERIFY: IEEE PDF eXpress is still the standard check for IEEE conference camera-ready files -->
6. Register and confirm that an author will present; many venues remove papers that are not presented.

## Common mistakes

- **No clear contribution** that a reviewer can state in one sentence.
- **Drafting outside the template** and cutting to the page limit at the last minute.
- **Weak or untuned baselines.**
- **Related work as a list** of summaries, without saying how each differs from yours.
- **Breaking anonymity** through self-citations, links or acknowledgments.

## Write a conference paper in AI for Research

The **Conference paper** module in Writing Studio (**/write?module=conference-paper**) drafts a full paper of 4, 6 or 8 pages. You give it your title or research question, the venue name if you have one, the format (IEEE two-column with numbered references, ACM acmart with CCS concepts, or a general conference format), the page limit, and your study: what you built or did and what you found. You can upload a draft or notes, and add the call's topics, required sections or double-blind rules.

It searches the literature for related work and cites what it found, writes the contribution statements in the introduction, and builds the method and results from what you give it. Leave the study field empty and you get the structure with placeholders to fill. A draft costs 15 credits. The Free plan has 45 credits a month; see [pricing](/pricing). LaTeX export is on paid plans (Plus and up); Word and PDF export are free.

<!-- SCREENSHOT: Conference paper module with format set to IEEE, page limit 6 pages, and a draft introduction ending in a contribution list -->

If the same work later goes to a journal, the [journal formatter](/features/journal-formatter) reorders the extended version into the journal's section order and reference style and lists what still breaks its author guidelines. For a shorter submission, the existing conference abstract module stays available. See the [conference paper writer](/features/conference-paper-writer) page for details.

The draft is a starting point: you own the contribution and every claim, and should check each citation before submitting.

## FAQ

### How long is a conference paper?

Most full conference papers run 4 to 10 pages in a two-column template, and short papers 2 to 4. The call for papers sets the limit and says whether references and appendices count toward it. Treat the limit as fixed: many venues reject papers that exceed it without review.

### What is the difference between a conference paper and a journal paper?

A conference paper is shorter, written to a fixed deadline and page limit, and reviewed in one round, sometimes with a short rebuttal. A journal paper has no deadline, more space, and several rounds of revision. In computer science and parts of engineering, full conference papers are archival and count as major publications; in most other fields, conferences take abstracts and the paper goes to a journal later.

### How do I anonymize a paper for double-blind review?

Remove author names, affiliations and acknowledgments, cite your own earlier work in the third person as you would anyone else's, strip names from file metadata, and replace links to your own code or data with anonymized ones. Follow the venue's own anonymity policy, because some ask you to omit self-citations entirely and others do not.

### Can I publish a conference paper in a journal later?

Often, yes, as an extended version. Many journals accept extended conference papers if the new version adds substantial new material, commonly described as around 30% new content, and cites the conference version. Check the journal's policy and the conference's copyright terms before you start, because the rules differ. <!-- VERIFY: the "around 30% new content" figure is a common journal rule of thumb, not universal -->

### Can AI write a conference paper?

AI can draft the structure, the related work and wording from your own results, but it cannot supply your contribution or your data. Use a tool that cites real papers, give it your actual method and numbers, and check every claim and citation before submission. Read the venue's policy on AI use too: many require you to disclose it.

## Related

- [How to format a paper for a journal](/blog/how-to-format-a-paper-for-a-journal)
- [How to format a reference list](/blog/how-to-format-a-reference-list)
- [How to make a research poster](/blog/how-to-make-a-research-poster)
- [How to draw a conceptual framework diagram](/blog/how-to-draw-a-conceptual-framework-diagram)
- [Thesis to journal article](/blog/thesis-to-journal-article)
