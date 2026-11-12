---
title: "What Is Deep Research AI? How It Works, When to Trust It"
slug: "what-is-deep-research-ai"
description: "What is deep research AI? How a run plans, searches, reads and writes, how long it takes, and three checks to make before you trust or cite the report."
primary_keyword: "what is deep research ai"
secondary_keywords: ["deep research", "deep research ai", "ai research", "ai research assistant", "automated research", "ai powered research tool", "how does deep research work", "is deep research accurate"]
cluster: "G. Deep research"
pillar: "/blog/what-is-deep-research-ai"
author: "Mubarak"
compares_tools: true
published: "2026-11-12"
updated: "2026-11-12"
faq:
  - q: "What is deep research in AI?"
    a: "Deep research is an AI mode that works through a question in several steps instead of answering at once. It writes a search plan, runs many searches, reads the pages or papers it finds, and writes a report with citations. ChatGPT, Gemini, Perplexity and Claude all offer a version for web sources; scholarly tools run the same loop over an index of papers."
  - q: "How long does deep research take?"
    a: "It depends on the tool and the depth you choose. OpenAI says a ChatGPT deep research run can take 5 to 30 minutes. Google says Gemini usually takes about 5 to 10 minutes. Perplexity says most of its research tasks finish in under 3 minutes. Shorter modes in scholarly tools, with one search, return in well under a minute."
  - q: "Is deep research accurate?"
    a: "It is more accurate than a plain chatbot answer, because each claim is tied to a source it retrieved. It still makes errors: it can misread a paper, cite a weak source, or miss studies it could not open. Treat the report as a well-organized first draft and check every claim you plan to repeat against the source it cites."
  - q: "What is the difference between deep research and normal search?"
    a: "A normal search returns a list of links for one query, and you read and judge them yourself. Deep research runs many queries, reads the results for you and writes a synthesis with citations. You save reading time, but you also hand over choices about what to search and what to keep, so you need to check what it read and what it left out."
  - q: "Can I cite a deep research report in my paper?"
    a: "No. Cite the papers the report points to, after you have opened and read them. A deep research report is a generated summary, not a published source, and most style guides ask you to cite the work you actually relied on. Keep the report in your notes as a record of how you found the papers."
---

# What is deep research AI, and when can you trust it?

*Last updated: 12 November 2026*

Deep research AI is a mode in which an AI model answers a question by running a multi-step search: it plans queries, searches the web or a paper index, reads the sources, and writes a cited report. It saves hours of finding and skimming. It does not replace reading the key sources yourself, because it can misread papers and cannot see what it could not open.

This guide is for students, researchers and analysts deciding whether to use a deep research tool on a real question. It is the pillar of our deep research series: when you know what a run does, read how [ChatGPT deep research](/blog/chatgpt-deep-research-for-academic-work) and [Gemini deep research](/blog/gemini-deep-research-for-literature-search) handle academic questions, and which is the [best AI for deep research](/blog/best-ai-for-deep-research) for your work.

## What is deep research AI?

**Deep research is an AI mode that answers a question by planning several searches, reading the sources it finds, and writing a report that cites them.** It is a form of automated research: the model makes the search decisions you would otherwise make one query at a time.

The term became common in 2025, when OpenAI, Google and Perplexity each launched a feature with this name [1][2][3]. Anthropic calls its version Research [4]. All four mainly search the open web. Scholarly tools, including AI for Research, run the same loop over an index of papers instead.

Three things separate deep research from an ordinary AI chat answer:

- **It retrieves before it writes.** A chatbot without search answers from what it learned in training. A deep research run fetches sources first, then writes from them.
- **It runs many searches, not one.** The model writes extra queries for angles you did not name.
- **It shows its sources.** Each claim carries a citation you can open.

The third point is why it matters. In a 2023 study, researchers asked ChatGPT (without search) to write short literature reviews on 42 topics. Of the citations it produced, 55% from GPT-3.5 and 18% from GPT-4 were fabricated [5]. Retrieval makes that kind of invented reference much rarer, but it does not make the report correct by itself.

## How does deep research work?

A deep research run follows the same four stages in every tool, with a check at the end in the better ones.

1. **Plan.** The model reads your question and breaks it into sub-questions and search queries. Gemini shows you this plan and lets you edit it before it starts [2].
2. **Search.** It runs the queries against its sources: the web, a paper index, your uploaded files or connected apps.
3. **Read.** It opens the results it judges relevant. For web pages, it reads the page. For papers, it reads the full text if one is openly available, and often only the abstract if not.
4. **Write.** It writes a report from what it read, with numbered citations.
5. **Verify (in some tools).** It checks that each citation points to a source it actually retrieved, and removes or flags the rest.

The planning step is where most of the value and most of the risk sit. A good plan adds the search terms you forgot. A bad plan drifts from your question, and the report will answer a slightly different one with confidence.

## Deep research vs normal search vs a chatbot

**Normal search** gives you links for one query. **A chatbot** gives you an answer from its training. **Deep research** gives you a cited synthesis built from many searches.

| | Normal search | AI chatbot (no search) | Deep research |
| --- | --- | --- | --- |
| What you get | A ranked list of links | A written answer | A written report with citations |
| Sources | The index you searched | Training data, no live sources | Web pages, papers or files it retrieved |
| Searches per question | 1 (you run the rest) | 0 | Several to dozens |
| Time | Seconds, then your reading time | Seconds | About 1 to 30 minutes |
| Who judges relevance | You | The model, invisibly | The model, with sources you can check |
| Main risk | You miss studies | Invented facts and references | Misread or weak sources, gaps it hides |

Use normal search when you know what you are looking for. Use deep research when you need a map of an unfamiliar question quickly. Do not use a chatbot without search for anything you will cite.

## How long does deep research take?

**A deep research run takes from under a minute to about half an hour, depending on the tool and the depth.** The vendors' own figures, checked November 2026:

- **ChatGPT:** OpenAI says a run can take 5 to 30 minutes [1].
- **Gemini:** Google says a report "usually takes about 5-10 minutes" [2].
- **Perplexity:** Perplexity says most research tasks finish in under 3 minutes [3].
- **Claude:** Anthropic's help page does not give a time [4].

Longer is not automatically better. A longer run reads more sources, but if the plan was off, it reads more of the wrong ones. Start with a short run, check that the plan matches your question, then go deeper.

## Is deep research accurate?

**Deep research is more reliable than an AI answer without sources, but it is not accurate enough to trust without checks.** Its typical errors are different from a chatbot's:

- **Misreading.** It attributes a finding to a paper that says something narrower, or reports a subgroup result as the main result.
- **Weak sources ranked high.** On the open web, a blog post or press release can carry the same weight as a trial.
- **Silent gaps.** It reports what it read. It does not tell you about the paywalled papers it could not open, the studies in another language, or the search terms it never tried.
- **False balance or false consensus.** Three small studies that agree can read as stronger than one large study that disagrees.

None of these is visible from the report alone. That is why the next section matters more than which tool you pick.

## Three checks before you trust a deep research report

Run these three checks on every report before you rely on it. They take 15 to 30 minutes for a typical report and catch most of the problems above.

### Check 1: are the sources real?

Open every source the report cites for the claims you plan to use. Confirm it exists, that the title, authors and year match, and that it is the kind of source you can cite (a paper, a guideline, an official report, not a content-farm page). For academic references, a citation checker that looks each reference up in Crossref or OpenAlex does this in bulk.

### Check 2: does the source say that?

For each claim you will repeat, find the passage in the source that supports it. Check the population, the outcome and the size of the effect. A report that says "practice testing improves exam scores" may be summarizing a lab study with word lists. If you only have the abstract, say so in your notes.

### Check 3: what was not read?

Look at the full source list, not only the cited ones. Ask:

1. Did it find the papers you already know are central to this question?
2. How many sources were full texts, and how many abstracts or web pages?
3. Are there study types missing (for example, no randomized trials, only reviews)?
4. Does anything in the list disagree with the report's conclusion, and did the report mention it?

### A worked example

*This is an example to show the method, not a test result.* Say your question is "Does practice testing improve long-term retention compared with rereading in university students?" Before you run anything, write down three papers any good search on this question should find: the review by Dunlosky and colleagues on learning techniques [6], Rowland's meta-analysis of the testing effect [7], and Adesope and colleagues' meta-analysis of practice testing [8].

Then run the report and score it:

| Check | What you look for | Example result to record |
| --- | --- | --- |
| Known papers found | Dunlosky 2013, Rowland 2014, Adesope 2017 | 2 of 3 found |
| Sources real | Every cited reference resolves to a real record | 14 of 14 real |
| Claims supported | Each claim you will reuse matches its source | 9 of 11 matched; 2 overstated |
| Full text vs abstract | How many sources were read in full | 6 full text, 8 abstracts |
| Disagreement shown | Studies with null or opposite results mentioned | One null study cited, not discussed |

A report that misses one of your known papers is not useless. It tells you the search plan was narrow, so you search that angle yourself.

## What deep research cannot see

Every deep research tool is limited by what it can open. Plan for four blind spots:

- **Paywalled full texts.** Tools that search the web read what is publicly readable. A tool that finds open copies (for example through Unpaywall, a database of legal open-access versions [9]) reads more full texts, but closed articles are often read as abstracts only.
- **Grey literature.** Theses, agency reports and conference posters are patchily indexed.
- **Recent work.** Paper indexes lag behind publication by days to weeks. Preprints may appear before the peer-reviewed version.
- **Your library's databases.** No general AI tool searches Scopus, Web of Science or your library's subscription databases on your behalf. Search those yourself through your institution.

## When to use deep research, and when not to

Use these decision rules:

- **Use it** to get oriented in a new topic, find the main reviews and key terms, draft a background section you will then check, or test whether a research question has been answered already.
- **Use it with care** for a literature review chapter. It is a fast first pass, not a search you can report in a methods section.
- **Do not use it** as the search for a systematic review. Those need documented, reproducible database searches and screening by people (see the PRISMA 2020 statement for what must be reported [10]).
- **Do not use it** for clinical, legal or patent decisions. Any output in those areas needs review by a qualified professional.

## Deep research in AI for Research: Summary, Deep and Detailed

AI for Research runs deep research over scholarly sources by default, with the web as one option. You type a question in the Ask box on Home or on the [Deep Research](/features/deep-research) page and choose a depth. The cost shows before you start.

| Depth | What you get | Credits | Who can use it | Use it for |
| --- | --- | --- | --- | --- |
| Summary | A short cited answer | 1 | All plans | A quick, cited overview of a narrow question |
| Deep | A 2,500 to 4,000-word report: 5 sub-questions, about 250 papers screened, 12 full texts read, every citation checked | 15 | All plans | A question with several angles |
| Detailed | A 5,000 to 8,000-word report with a study table: 7 sub-questions, citation chasing, 90+ papers, 25 full texts | 45 | Paid plans | A broad question or the first pass at a review chapter |

What a run does:

- **Sources you choose:** All papers, Medical (PubMed, Europe PMC), Preprints (arXiv, bioRxiv, medRxiv), Web, and My Library. Add filters such as year or study type.
- **Full text where it is open:** it looks for open full texts through Unpaywall, and reads the abstract otherwise.
- **Citations that point somewhere:** any citation marker that does not match a real retrieved source is dropped from the answer.
- **A consensus line counted from the studies:** for example, "2 of 4 studies that test the question support it", counted from a label on each cited study.
- **Three tabs:** Cited, All read and Web, so you can do check 3 (what was read) without guessing.
- **After the answer:** ask follow-ups (1 credit each), open the answer in the editor with live citations, or save the cited papers to your Library.

<!-- SCREENSHOT: a Deep run result showing the consensus line, numbered citations and the Cited / All read / Web tabs -->

Searching with [Find Papers](/features/paper-search), checking a reference list with the [citation checker](/features/citation-checker), and saving papers to the [Library](/features/research-library) cost 0 credits. The free plan includes 45 credits a month, enough for three Deep reports or dozens of Summary answers. Detailed runs need a paid plan; see [pricing](/pricing).

The honest limits: where no open full text exists, the run reads the abstract, and the "All read" tab shows which. It does not search Google Scholar, Scopus or Web of Science. The consensus line counts studies; it does not weigh their design, so read the strongest ones yourself.

## FAQ

### What is deep research in AI?

Deep research is an AI mode that works through a question in several steps instead of answering at once. It writes a search plan, runs many searches, reads the pages or papers it finds, and writes a report with citations. ChatGPT, Gemini, Perplexity and Claude all offer a version for web sources; scholarly tools run the same loop over an index of papers.

### How long does deep research take?

It depends on the tool and the depth you choose. OpenAI says a ChatGPT deep research run can take 5 to 30 minutes. Google says Gemini usually takes about 5 to 10 minutes. Perplexity says most of its research tasks finish in under 3 minutes. Shorter modes in scholarly tools, with one search, return in well under a minute.

### Is deep research accurate?

It is more accurate than a plain chatbot answer, because each claim is tied to a source it retrieved. It still makes errors: it can misread a paper, cite a weak source, or miss studies it could not open. Treat the report as a well-organized first draft and check every claim you plan to repeat against the source it cites.

### What is the difference between deep research and normal search?

A normal search returns a list of links for one query, and you read and judge them yourself. Deep research runs many queries, reads the results for you and writes a synthesis with citations. You save reading time, but you also hand over choices about what to search and what to keep, so you need to check what it read and what it left out.

### Can I cite a deep research report in my paper?

No. Cite the papers the report points to, after you have opened and read them. A deep research report is a generated summary, not a published source, and most style guides ask you to cite the work you actually relied on. Keep the report in your notes as a record of how you found the papers.

## Next steps

- [ChatGPT deep research for academic work: what it reads and what it misses](/blog/chatgpt-deep-research-for-academic-work)
- [Gemini deep research for a literature search](/blog/gemini-deep-research-for-literature-search)
- [The best AI for deep research on scholarly questions](/blog/best-ai-for-deep-research)
- [AI literature review tools](/blog/ai-literature-review-tools)

## Sources

1. OpenAI. Introducing deep research (2 February 2025, with later updates). https://openai.com/index/introducing-deep-research/ (checked November 2026)
2. Google. Use Deep Research in Gemini Apps. Gemini Apps Help. https://support.google.com/gemini/answer/15719111 (checked November 2026); Gemini Deep Research overview: https://gemini.google/overview/deep-research/
3. Perplexity. Introducing Perplexity Deep Research (14 February 2025). https://www.perplexity.ai/hub/blog/introducing-perplexity-deep-research (checked November 2026)
4. Anthropic. Using Research on Claude. Claude Help Center. https://support.claude.com/en/articles/11088861-using-research-on-claude-ai (checked November 2026)
5. Walters, W. H., & Wilder, E. I. (2023). Fabrication and errors in the bibliographic citations generated by ChatGPT. *Scientific Reports, 13*, 14045. https://doi.org/10.1038/s41598-023-41032-5
6. Dunlosky, J., Rawson, K. A., Marsh, E. J., Nathan, M. J., & Willingham, D. T. (2013). Improving students' learning with effective learning techniques. *Psychological Science in the Public Interest, 14*(1), 4–58. https://doi.org/10.1177/1529100612453266
7. Rowland, C. A. (2014). The effect of testing versus restudy on retention: A meta-analytic review of the testing effect. *Psychological Bulletin, 140*(6), 1432–1463. https://doi.org/10.1037/a0037559
8. Adesope, O. O., Trevisan, D. A., & Sundararajan, N. (2017). Rethinking the use of tests: A meta-analysis of practice testing. *Review of Educational Research, 87*(3), 659–701. https://doi.org/10.3102/0034654316689306
9. Unpaywall. https://unpaywall.org/
10. Page, M. J., et al. (2021). The PRISMA 2020 statement: an updated guideline for reporting systematic reviews. *BMJ, 372*, n71. https://doi.org/10.1136/bmj.n71
