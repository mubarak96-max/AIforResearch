---
title: "AI-Generated Research Papers: Detection, Risks and Rules"
slug: "ai-generated-research-papers"
description: "What happens to an AI-generated research paper: real retractions, how AI detectors work and why they misfire, hallucinated citations, and using AI openly."
primary_keyword: "ai generated research paper"
secondary_keywords: ["ai written paper", "paper written by ai", "ai generated paper", "research paper written by ai", "can journals tell if a paper is written by ai", "ai detector false positives", "hallucinated citations"]
cluster: "S. Writing research papers"
pillar: "/blog/how-to-write-a-research-paper"
author: "Mubarak"
compares_tools: false
published: "2026-11-12"
updated: "2026-11-12"
faq:
  - q: "Can journals tell if a paper is written by AI?"
    a: "Not reliably from the prose alone. Detection tools give probability scores that are wrong in both directions, and publishers do not treat a score as proof. What editors and readers do catch are concrete traces: leftover chatbot phrases such as 'Regenerate response', references that do not exist, garbled AI-made figures, and claims the cited papers do not support. Those have led to retractions."
  - q: "What happens if you submit an AI-written paper?"
    a: "If the use is undisclosed or the paper contains fabricated references, data or images, it can be desk-rejected, or retracted after publication, and the case may go to your institution as possible misconduct. Retraction notices are permanent and linked to your name. If AI use is disclosed and the content is accurate and yours, most journals treat it like any other submission."
  - q: "How accurate are AI detectors?"
    a: "Accuracy varies by tool, text length and language. OpenAI withdrew its own classifier in 2023, citing its low accuracy. A 2023 study found popular detectors flagged more than half of essays by non-native English writers as AI-written. Turnitin reports a document-level false positive rate below 1% for documents with at least 20% AI writing, and about 4% at the sentence level."
  - q: "Why do AI-generated papers have fake citations?"
    a: "Language models write text that is statistically likely, not text checked against a database. A reference is a pattern of plausible authors, title, journal and year, so a model can produce one that looks right but points to nothing, or mixes details from several real papers. Tools that retrieve papers before writing reduce this, but every reference still needs checking."
  - q: "Is it wrong to use AI to help write a paper?"
    a: "No, if you follow your journal's and institution's rules. Most publishers allow AI assistance when a human author checks and takes responsibility for the content and the use is disclosed. What is wrong is hiding substantive AI use where disclosure is required, or submitting AI-invented data, images or references as genuine."
---

# AI-generated research papers: how they get caught, and the rules

*Last updated: 12 November 2026*

An AI-generated research paper is one where a language model wrote substantial parts of the text, figures or references. Such papers are not reliably caught by detectors. They are caught by evidence: leftover chatbot phrases, references that do not exist, impossible figures. Undisclosed use and fabricated content have led to retractions; disclosed, checked use is allowed by most journals.

This guide is for researchers, students, supervisors and editors who want the facts: real cases, what detection tools can and can't do, and how to use AI without risking a retraction. It is part of our series on [the structure of a research paper](/blog/how-to-write-a-research-paper).

## What counts as an AI-generated research paper?

**An AI-generated paper is a manuscript in which a generative AI tool produced substantial text, data, images or references that are presented as the authors' own work.** The line most policies draw is not "AI touched it" but whether the use was substantive, disclosed and checked by an accountable human [1][2].

| Use | How journals usually treat it |
| --- | --- |
| Grammar, spelling, language polishing | Allowed; often no disclosure needed |
| Literature search, outlining, drafting from your notes | Allowed with disclosure |
| AI-written sections the authors did not check | Breach of responsibility; risky even if disclosed |
| AI-made images presented as results | Not allowed |
| References to papers that do not exist | Treated as fabrication |

See our [policy summary for AI in academia](/blog/ai-in-academic-research-policies) for what each publisher says.

## What are real cases of AI-written papers?

Several have been published, then caught by readers, sleuths or the publishers themselves. In each case below the evidence was concrete, not a detector score.

### "Regenerate response" in Physica Scripta (2023)

A paper published in Physica Scripta in August 2023 contained the phrase "Regenerate response", the label of a button in the ChatGPT interface. Computer scientist Guillaume Cabanac spotted it. The authors confirmed they had used ChatGPT, and IOP Publishing retracted the paper for undeclared use; its head of peer review and research integrity called it "a breach of our ethical policies" [3]. Retraction Watch later reported that Cabanac had flagged more than 30 papers containing the same phrase on PubPeer [4].

### AI-made figures in Frontiers in Cell and Developmental Biology (2024)

A review article published on 13 February 2024 included figures made with Midjourney, among them an anatomically impossible rat and labels in nonsense text. The authors had disclosed the tool. Frontiers retracted the article on 16 February 2024, saying it "does not meet the standards of editorial and scientific rigor" for the journal, after concerns about the AI-generated figures [5]. The lesson: disclosure does not make inaccurate content acceptable.

### Unverifiable references in a Springer Nature book (2025)

In 2025 Retraction Watch reported that a machine learning book published by Springer Nature cited works that did not exist or had substantial errors. Springer Nature retracted it, stating it "was unable to verify the source of 25 out of 46 references in this book" [6]. Retraction Watch noted the book carried no AI-use declaration.

### Hallucinated citations at NeurIPS 2025

In January 2026 GPTZero reported more than 100 hallucinated citations across roughly 50 papers accepted at NeurIPS 2025, each checked by hand, and around 50 in papers under review for ICLR 2026 [7][8]. NeurIPS policy treats hallucinated citations as grounds for rejection or revocation, according to GPTZero's report [8].

## Can journals tell if a paper is written by AI?

Not reliably from the writing alone. They can tell when the paper contains traces that a careful reader can verify: chatbot phrases, fake references, impossible images, and claims that do not match the cited sources.

**An AI text detector is software that estimates how likely a passage is to have been produced by a language model, usually as a probability or percentage.** It is a statistical guess, not evidence of who wrote the text.

### How do AI detectors work?

Most detectors use one or both of these approaches:

1. **Predictability measures.** Language models choose likely next words. Text where each word is highly predictable to a model (low "perplexity"), with little variation in sentence length and structure (low "burstiness"), scores as more machine-like.
2. **Trained classifiers.** A model is trained on labeled examples of human and AI text and learns features that separate them. It works best on text like its training data.

A third approach, watermarking, would embed a hidden statistical signal when the text is generated. It only works if the generating tool adds the watermark and the checker can read it.

### Why do detectors give false positives?

**A false positive is a human-written text that a detector labels as AI-generated.** It happens because careful, plain, formulaic writing is also predictable, and academic writing is often exactly that.

| Evidence | What it found |
| --- | --- |
| OpenAI's classifier (2023) | Identified 26% of AI-written text as "likely AI-written" and wrongly labeled human text 9% of the time on its challenge set; withdrawn on 20 July 2023 for low accuracy [9] |
| Liang et al., *Patterns* (2023) | Seven detectors flagged more than half of TOEFL essays by non-native English writers as AI-generated, while classifying US students' essays almost perfectly [10] |
| Weber-Wulff et al. (2023) | Tested 14 tools; concluded they were "neither accurate nor reliable" and that light editing of AI text made detection worse [11] |
| Turnitin (vendor figures) | Document-level false positive rate below 1% for documents with 20% or more AI writing; about 4% at the sentence level [12] |

Two practical consequences. First, non-native English writers and people with a plain style are more exposed to false flags. Second, a detector score should start a conversation, not end one. Turnitin itself says false positives cannot be eliminated entirely [12]. <!-- VERIFY: Turnitin false-positive figures date from 2023; check for a newer published rate -->

### What do editors look for instead?

Editors, reviewers and research-integrity sleuths rely on checkable signals:

- Chatbot residue: "Regenerate response", "As an AI language model", "Certainly, here is".
- References that do not resolve, or real titles with the wrong authors, year or journal.
- Citations that exist but do not support the sentence they follow.
- Figures with garbled labels or impossible anatomy, and images duplicated or altered.
- Methods that could not produce the results reported.

## Why are hallucinated citations the most common giveaway?

Because they are cheap to check and impossible to explain away. A reader can paste a DOI or title into a search and find nothing.

**A hallucinated citation is a reference produced by a language model that points to a work that does not exist, or that combines details from several real works into one false reference.** Models produce them because a reference is a pattern of plausible names, titles and journals, and the model generates plausible patterns without checking a database.

How to catch them in your own draft:

1. Resolve every DOI. If there is no DOI, search the exact title in a scholarly database.
2. Check authors, year, journal, volume and pages against the record.
3. Open the paper and confirm it says what your sentence claims.
4. Check for retractions and corrections.
5. Delete any reference you cannot find. Never keep one "to check later."

Our guides on [how to find references for a claim](/blog/how-to-find-references-for-a-claim) and [how to check a claim against the research](/blog/how-to-check-a-claim-against-the-research) cover steps 3 and 4.

## What happens if you submit an AI-written paper?

It depends on disclosure and accuracy. Disclosed, checked use is treated like any other submission at most journals. Undisclosed use, fabricated content, or both, carry these risks:

| Stage | Possible outcome |
| --- | --- |
| Before review | Desk rejection; editor asks for an AI statement or raw data |
| After publication | Correction, expression of concern or retraction, publicly linked to the authors |
| Institution | Referral for a misconduct or academic integrity investigation |
| Funders | NIH may treat applications substantially developed by AI as not original; UKRI lists rejection and bars on future applications as possible outcomes of upheld misconduct [13][14] |

## How to use AI legitimately and document it

Use AI where it saves time and you can check the result, and keep a record as you go.

1. **Read the rules first:** your journal's author guidelines and your institution's policy.
2. **Draft from your own material.** Give the AI your notes, data and results, not just a topic.
3. **Check every reference and claim** before anyone else reads the draft.
4. **Never generate data, results images or quotations.**
5. **Write the disclosure statement while you work:** tool, task, sections, and that you reviewed the output.
6. **Keep evidence:** prompts, outputs, version history.

The full workflow is in [how to write a research paper with AI](/blog/how-to-write-a-research-paper-with-ai).

## Check your paper in AI for Research

AI for Research helps with the checks above. It does not judge whether text is AI-written and makes no claim about detectors.

- **Citation check** reads your reference list, confirms each reference exists in Crossref or OpenAlex, and flags retractions, corrections, expressions of concern, preprints and wrong years or authors. It costs 0 credits; the optional check that citing sentences match the abstract costs 2. See the [citation checker](/features/citation-checker).
- **Claim check** labels up to 10 claims from a paragraph as supported, partly supported, not supported or no evidence, with the papers (2 credits).
- **Reviewer** scores a manuscript criterion by criterion and quotes each passage with a fix (10 credits per 10,000 words).
- The **[AI writing checker](/tools/ai-writing-checker)** highlights stock phrases, filler and formulaic patterns so you can rewrite them. It is an editing aid that shows phrases, not an AI probability.
- The **authorship report** records time spent writing and how much text was typed, pasted or accepted from AI, shared as a link anyone can verify. It is evidence of how a document grew, not proof of authorship. See the [authorship report](/features/authorship-report).

<!-- SCREENSHOT: Citation check results with one reference flagged "not found" and one flagged "retracted" -->

The free plan has 45 credits a month; see [pricing](/pricing).

## FAQ

### Can journals tell if a paper is written by AI?

Not reliably from the prose alone. Detection tools give probability scores that are wrong in both directions, and publishers do not treat a score as proof. What editors and readers do catch are concrete traces: leftover chatbot phrases such as 'Regenerate response', references that do not exist, garbled AI-made figures, and claims the cited papers do not support. Those have led to retractions.

### What happens if you submit an AI-written paper?

If the use is undisclosed or the paper contains fabricated references, data or images, it can be desk-rejected, or retracted after publication, and the case may go to your institution as possible misconduct. Retraction notices are permanent and linked to your name. If AI use is disclosed and the content is accurate and yours, most journals treat it like any other submission.

### How accurate are AI detectors?

Accuracy varies by tool, text length and language. OpenAI withdrew its own classifier in 2023, citing its low accuracy. A 2023 study found popular detectors flagged more than half of essays by non-native English writers as AI-written. Turnitin reports a document-level false positive rate below 1% for documents with at least 20% AI writing, and about 4% at the sentence level.

### Why do AI-generated papers have fake citations?

Language models write text that is statistically likely, not text checked against a database. A reference is a pattern of plausible authors, title, journal and year, so a model can produce one that looks right but points to nothing, or mixes details from several real papers. Tools that retrieve papers before writing reduce this, but every reference still needs checking.

### Is it wrong to use AI to help write a paper?

No, if you follow your journal's and institution's rules. Most publishers allow AI assistance when a human author checks and takes responsibility for the content and the use is disclosed. What is wrong is hiding substantive AI use where disclosure is required, or submitting AI-invented data, images or references as genuine.

## Next steps

- Know what your journal requires: [AI in academia: university and journal policies](/blog/ai-in-academic-research-policies).
- Use AI the right way: [how to write a research paper with AI](/blog/how-to-write-a-research-paper-with-ai).
- Review your draft before submission: [how to review your own paper](/blog/how-to-review-your-own-paper).
- Back to the hub: [the structure of a research paper](/blog/how-to-write-a-research-paper).

## Sources

1. International Committee of Medical Journal Editors. Recommendations, Section V.A: Use of AI by authors. https://www.icmje.org/recommendations/browse/artificial-intelligence/ai-use-by-authors.html (checked November 2026)
2. Elsevier. Generative AI policies for journals. https://www.elsevier.com/about/policies-and-standards/generative-ai-policies-for-journals (checked November 2026)
3. Conroy G. Scientific sleuths spot dishonest ChatGPT use in papers. *Nature*. 2023. https://doi.org/10.1038/d41586-023-02477-w
4. Retraction Watch. Signs of undeclared ChatGPT use in papers mounting. 6 October 2023. https://retractionwatch.com/2023/10/06/signs-of-undeclared-chatgpt-use-in-papers-mounting/
5. Frontiers in Cell and Developmental Biology. Retraction: Cellular functions of spermatogonial stem cells in relation to JAK/STAT signaling pathway. 2024. https://doi.org/10.3389/fcell.2024.1386861 (retracts https://doi.org/10.3389/fcell.2023.1339390)
6. Retraction Watch. Springer Nature retracts book with fake citations. 4 August 2025. https://retractionwatch.com/2025/08/04/springer-nature-retracts-book-fake-citations-help-us-find-more
7. Goldman S. Fortune, 21 January 2026. https://fortune.com/2026/01/21/neurips-ai-conferences-research-papers-hallucinations/
8. GPTZero. NeurIPS investigation. https://gptzero.me/news/neurips/ (checked November 2026)
9. OpenAI. New AI classifier for indicating AI-written text (with 20 July 2023 update). https://openai.com/index/new-ai-classifier-for-indicating-ai-written-text/ <!-- VERIFY: openai.com blocked our fetch; figures and withdrawal date confirmed from multiple news reports -->
10. Liang W, Yuksekgonul M, Mao Y, Wu E, Zou J. GPT detectors are biased against non-native English writers. *Patterns*. 2023;4(7):100779. https://doi.org/10.1016/j.patter.2023.100779
11. Weber-Wulff D, Anohina-Naumeca A, Bjelobaba S, et al. Testing of detection tools for AI-generated text. *International Journal for Educational Integrity*. 2023;19:26. https://doi.org/10.1007/s40979-023-00146-z
12. Turnitin. Understanding the false positive rate for sentences of our AI writing detection capability. https://www.turnitin.co.uk/blog/understanding-the-false-positive-rate-for-sentences-of-our-ai-writing-detection-capability (checked November 2026)
13. National Institutes of Health. NOT-OD-25-132: Supporting Fairness and Originality in NIH Research Applications. https://grants.nih.gov/grants/guide/notice-files/NOT-OD-25-132.html (checked November 2026)
14. UK Research and Innovation. Use of generative artificial intelligence in application preparation and assessment. https://www.ukri.org/publications/generative-artificial-intelligence-in-application-and-assessment-policy/use-of-generative-artificial-intelligence-in-application-preparation-and-assessment/ (checked November 2026)
