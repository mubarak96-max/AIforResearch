---
title: "Chat with PDF: Ask Long Reports Questions and Check Answers"
slug: "chat-with-pdf"
description: "How chat with PDF tools work, where they fail, and how to check every answer against the cited page. Compares ChatPDF, Acrobat AI, NotebookLM and more."
primary_keyword: "chat with pdf"
secondary_keywords: ["chat with pdf ai", "ai chat with pdf", "chat with pdf free", "chat with pdf multiple files", "chat with pdf for research", "chat with pdf privacy"]
cluster: "F. Research and citations"
pillar: "/blog/ai-citation-generator"
author: "[AUTHOR NAME]"
published: "2026-11-06"
updated: "2026-11-06"
faq:
  - q: "How does chat with PDF work?"
    a: "Most tools use retrieval-augmented generation. The tool extracts the PDF's text, splits it into passages, and indexes them. When you ask a question, it finds the passages most related to it and gives only those to a language model, which writes an answer from them. Good tools show which passage and page each claim came from."
  - q: "Is there a free way to chat with a PDF?"
    a: "Yes. ChatPDF, AskYourPDF, SciSpace, Gemini Notebook (formerly NotebookLM) and WriteOrbit all have free tiers. Free plans cap the number of documents per day, pages or file size, and questions. Gemini Notebook's free tier is the most generous for many files: up to 50 sources per notebook. Check each tool's pricing page, because limits change often."
  - q: "Can I chat with multiple PDFs at once?"
    a: "Yes, in most tools. ChatPDF uses folders, AskYourPDF has multi-document chat on paid plans, Adobe Acrobat uses PDF Spaces, and Gemini Notebook treats each notebook as a set of sources. Cross-document answers are harder to check, so ask the tool to name the file and page for every claim."
  - q: "Is it safe to upload confidential PDFs to an AI chat tool?"
    a: "Only if the tool's terms fit the document. Check whether uploads are used for training, how long they are kept, whether staff can review them, and where they are stored. Adobe says customer content is never used to train its AI models, and Google says personal Gemini Notebook uploads aren't used for training unless you send feedback. Court-sealed or source-protected material may need a self-hosted tool."
  - q: "Why does a PDF chat tool give wrong answers?"
    a: "The usual causes are retrieval misses, where the right passage was never shown to the model; scanned pages without readable text; tables and multi-column layouts that extract badly; and questions that need the whole document, like 'list every mention.' The model may then answer from general knowledge. Always open the cited page before you use an answer."
---

# Chat with PDF: how to ask questions of long reports, filings and papers (and check the answers)

*Last updated: 6 November 2026*

Chat with PDF tools find the passages in your document most related to your question and have a language model answer from them. That works well for finding and summarizing, and fails when the right passage isn't retrieved or the text didn't extract. Use a tool that cites the page for every claim, and open that page before you rely on the answer.

This article is part of our guide to [AI citation generators that point to real sources](/blog/ai-citation-generator). It explains how PDF chat works in plain terms, where it fails, how to check answers, and how the main tools compare on limits, price and privacy.

**Chat with PDF is a tool that lets you ask questions in plain language about a PDF and get answers drawn from its text.**

## How chat with PDF works: retrieval plus a language model

Almost every PDF chat tool uses a method called retrieval-augmented generation. **Retrieval-augmented generation (RAG) is a method in which a system first retrieves passages related to a question from a set of documents, then gives those passages to a language model to write the answer.** The idea was set out in a 2020 research paper by Patrick Lewis and colleagues.

In plain terms, the tool works like a research assistant who has an index of your document but only reads the pages the index points to:

1. **Extract.** The tool pulls the text out of the PDF. Scanned pages need optical character recognition (OCR) first; without it there is no text to search.
2. **Split.** It cuts the text into passages, often a few hundred words each, and records the page each came from.
3. **Index.** It turns each passage into a numerical representation of its meaning, so it can find passages on the same topic even when they use different words.
4. **Retrieve.** When you ask a question, it finds the handful of passages closest to your question.
5. **Generate.** It sends those passages and your question to a language model, which writes the answer.
6. **Cite.** Good tools link each part of the answer back to the passage and page it came from.

Some tools with large context windows skip retrieval for short files and give the model the whole document. That helps, but research has found that language models use information at the start and end of a long input better than information in the middle, so long documents still get uneven attention.

### Where it fails

| Failure | What you see | How to catch it |
| --- | --- | --- |
| Retrieval miss | "The document doesn't mention X" when it does | Search the PDF for a keyword yourself |
| Answer from general knowledge | A plausible answer with no citation, or a citation to an unrelated page | Open every cited page; reject uncited claims |
| Scanned PDF with no text layer | Vague answers, or "I can't find that" | Try selecting text in the PDF; if you can't, run OCR first |
| Tables and multi-column layouts | Numbers attached to the wrong row or year | Check figures against the table on the page |
| Whole-document questions | "List every time the defendant is named" returns five of twenty | Use keyword search for exhaustive lists |
| Footnotes and exhibits | Claims attributed to the main text that come from a footnote, or missed entirely | Read the page, including notes |
| Wrong page number | The page cited is off by the PDF's front matter (printed page 12 is PDF page 14) | Check which numbering the tool uses |

The rule that follows: **treat a PDF chat answer as a pointer to a page, not as a fact.**

## What journalists, analysts and writers use it for

| Document | Good questions | Watch for |
| --- | --- | --- |
| Court filings and transcripts | "Where does the witness describe the meeting? Quote it with the page." | Exhibits filed separately; sealed material |
| Annual reports and 10-Ks | "What does the company list as its top three risk factors this year?" | Numbers in tables; restated figures |
| Government budgets | "How much is allocated to transit in 2027, and on which page?" | Proposed vs. enacted figures |
| Scientific studies | "What was the sample size and the main limitation the authors state?" | Abstract claims stronger than the results |
| Policy and NGO reports | "What evidence supports recommendation 4?" | The report's own sources may be weak |
| Interview transcripts | "Where did anyone mention the warehouse?" | Transcription errors; see [from transcript to story](/blog/transcript-to-story) |
| Scripts and archive files | "On which pages does this character appear?" | Scene headings that extract oddly; see [how to research a screenplay](/blog/how-to-research-a-screenplay) |

## Step by step: upload, ask, check the cited page

1. **Check the file.** Open the PDF and try to select a sentence. If you can't, it is a scan without a text layer: run OCR (Acrobat and many free tools do this) before uploading.
2. **Upload it** to a tool whose privacy terms fit the document (see below).
3. **Start with an orientation question.** "What is this document, who wrote it, when, and how is it organized?" This shows whether the tool read it correctly.
4. **Ask narrow questions.** One fact per question, and ask for the page: "What was the 2025 operating loss? Give the page and quote the line."
5. **Open every cited page.** Read the sentence the answer relies on, plus the paragraph around it. Confirm the number, the year and who is speaking.
6. **Ask what's missing.** "What does the document say that contradicts this?" or "Which sections did you not use?"
7. **Record what you checked.** Note the claim, the page, and the exact quote in your draft or notes, so an editor can check it too.

## Asking across many PDFs at once

Multi-file chat is where these tools save the most time and where errors hide best. When a tool searches twenty files, the answer may blend passages from different documents, years or parties.

- **Ask for the file name and page for every claim.** "For each point, give the document name and page."
- **Group files by question.** Put the five budget years in one folder or notebook and the court filings in another. Smaller sets retrieve better.
- **Name files clearly before upload:** `2025-budget-enacted.pdf`, not `doc(3).pdf`. Tools often cite by file name.
- **Compare explicitly.** "Compare the transit allocation in the 2024 and 2025 budgets, citing the page in each."
- **Use keyword search for completeness.** Chat finds the most related passages, not all of them.

For reviewing a body of studies, see [AI literature review tools](/blog/ai-literature-review-tools), which cover search and screening as well as PDF chat.

## Privacy and confidentiality: where your files go

Before uploading anything sensitive (unpublished filings, leaked documents, client reports, unproduced scripts), check:

- [ ] **Training.** Are uploads or chats used to train models?
- [ ] **Retention.** How long are files kept, and are they deleted when you delete the chat?
- [ ] **Human review.** Can staff read uploads, for example when you send feedback?
- [ ] **Sub-processors.** Is the file sent to a third-party model provider?
- [ ] **Location and account type.** Business and education accounts often have stricter terms than personal ones.

What two of the large vendors say, as of November 2026:

- **Adobe** says customer content in Acrobat's AI features "is never used to train Adobe's AI models."
- **Google** says that for personal accounts, Gemini Notebook data is not used for training unless you provide feedback, and that feedback may be reviewed with its full context. For Workspace accounts, uploads are not reviewed by humans and not used to train models.

For documents that must not leave your organization, the options are an enterprise plan with a data agreement, or a tool you can run in your own cloud account. For a journalist protecting a source, a document's metadata can identify the source even if the content is safe to share; strip it before uploading anywhere.

## Chat with PDF tools compared

Prices and limits as of November 2026. They change often; check each pricing page before you choose.

| Tool | Free tier | Paid (as of November 2026) | Multiple files | Citations | Notes |
| --- | --- | --- | --- | --- | --- |
| ChatPDF | 2 documents a day, no account needed | Plus plan, unlimited documents <!-- VERIFY: ChatPDF Plus price and page/MB limits; no pricing page was reachable --> | Folders (free account) | Clickable citations that scroll to the source passage | Also chats with Word, PowerPoint, websites and YouTube |
| AskYourPDF | 1 document a day, 100 pages, 15 MB, 50 questions a day | Premium about $11.99/month and Pro about $14.99/month, billed yearly | Multi-document chat (paid) | Can pull exact quotes | Zotero plugin, Chrome extension, API |
| Adobe Acrobat AI Assistant | Not part of free Acrobat Reader in most plans <!-- VERIFY: whether Acrobat Reader includes any free AI Assistant questions --> | Acrobat Express about $9.99/month and Acrobat Studio about $24.99/month (annual plans, billed monthly) include AI features <!-- VERIFY: price of the standalone AI Assistant add-on for Acrobat Pro/Standard --> | PDF Spaces | Answers cite the source text | Strong PDF tools (OCR, edit, redact); says content isn't used to train its models |
| SciSpace | Limited daily PDFs and questions <!-- VERIFY: SciSpace free tier (its comparison page listed 2 PDFs a day, 120 pages each, 50 questions a day) --> | Premium about $12/month billed yearly <!-- VERIFY: SciSpace Premium price on scispace.com/pricing --> | Yes <!-- VERIFY: SciSpace multi-PDF chat and page-level citations --> | Yes | Built for research papers; also a paper search engine |
| Gemini Notebook (formerly NotebookLM) | 100 notebooks, 50 sources each; up to 500,000 words or 200 MB per source | Higher limits with Google AI plans (Pro: 300 sources per notebook) | Yes: every notebook is a source set | Inline citations to source passages | Renamed by Google on 16 July 2026; many source types, including audio and YouTube |
| WriteOrbit | 10 PDFs up to 10 MB each, 5 chat messages a day | Plus $12/month: unlimited PDFs up to 50 MB, 500 chat messages a month | Library chat | Answers carry page numbers | Write and cite in the same editor; can run in your own cloud account |

Fair notes: Gemini Notebook is the strongest free option for large sets of sources. Acrobat is the best choice if you already pay for it and need OCR, redaction and editing in the same tool. SciSpace is built around research papers. ChatPDF is the fastest way to ask a question with no sign-up.

## Good questions vs. bad questions

| Bad question | Why it fails | Better question |
| --- | --- | --- |
| "Summarize this." | Too broad; the summary reflects what was retrieved | "Summarize section 3 in five bullets, with a page for each." |
| "Is the company in trouble?" | Asks for judgment the document doesn't contain | "What does the report say about liquidity and debt due in the next 12 months? Quote with pages." |
| "List every mention of Smith." | Retrieval returns the closest passages, not all | Use keyword search, then ask about specific pages |
| "What's the latest figure?" | The model may answer from general knowledge | "According to this document only, what figure is given for 2025?" |
| "What did the study prove?" | Invites overstatement | "What do the authors say their results show, and what limitations do they list?" |
| "Why did the judge rule this way?" | May blend the ruling and the arguments | "Quote the paragraph where the court states its reasoning, with the page." |

Add one line to any prompt: **"If the document doesn't say, answer 'not in the document'."**

## Chatting with PDFs in WriteOrbit

WriteOrbit puts PDF chat next to the document you are writing, so the answer, the page and your draft are on one screen.

1. **Upload PDFs to the Library**, or import them from Zotero or Mendeley on a paid plan.
2. **Open a PDF and choose Ask.** Answers carry page numbers, so you can turn to the passage and check it.
3. **Ask across your Library from the AI chat** beside your draft by choosing Library as a source. Its answers cite the papers they draw on; open the paper and use Ask on it when you need the exact page.
4. **Cite as you write.** Type `@` to cite a paper from the Library or from a search of 250M+ scholarly works.
5. **Check the draft.** AI review runs claim checks and flags retracted papers, preprints and wrong DOIs, as comments in the text.
6. **Keep sensitive files in your own cloud.** WriteOrbit can be deployed to your own Firebase / Google Cloud project, so documents stay in your own cloud account. <!-- VERIFY: confirm self-hosting is offered publicly before publishing -->

<!-- SCREENSHOT: the Library with a court filing PDF open, the chat panel answering "Where does the witness describe the meeting?" with a quoted line and a page-number link, and the draft document beside it -->

The free plan includes 10 PDFs and five chat messages a day. Check [/pricing](/pricing) for current limits.

## FAQ

### How does chat with PDF work?

Most tools use retrieval-augmented generation. The tool extracts the PDF's text, splits it into passages, and indexes them. When you ask a question, it finds the passages most related to it and gives only those to a language model, which writes an answer from them. Good tools show which passage and page each claim came from.

### Is there a free way to chat with a PDF?

Yes. ChatPDF, AskYourPDF, SciSpace, Gemini Notebook (formerly NotebookLM) and WriteOrbit all have free tiers. Free plans cap the number of documents per day, pages or file size, and questions. Gemini Notebook's free tier is the most generous for many files: up to 50 sources per notebook. Check each tool's pricing page, because limits change often.

### Can I chat with multiple PDFs at once?

Yes, in most tools. ChatPDF uses folders, AskYourPDF has multi-document chat on paid plans, Adobe Acrobat uses PDF Spaces, and Gemini Notebook treats each notebook as a set of sources. Cross-document answers are harder to check, so ask the tool to name the file and page for every claim.

### Is it safe to upload confidential PDFs to an AI chat tool?

Only if the tool's terms fit the document. Check whether uploads are used for training, how long they are kept, whether staff can review them, and where they are stored. Adobe says customer content is never used to train its AI models, and Google says personal Gemini Notebook uploads aren't used for training unless you send feedback. Court-sealed or source-protected material may need a self-hosted tool.

### Why does a PDF chat tool give wrong answers?

The usual causes are retrieval misses, where the right passage was never shown to the model; scanned pages without readable text; tables and multi-column layouts that extract badly; and questions that need the whole document, like "list every mention." The model may then answer from general knowledge. Always open the cited page before you use an answer.

## Where to go next

Page-cited answers are one half of trustworthy sourcing; real citations are the other. Read our guide to [AI citation generators that point to real sources](/blog/ai-citation-generator). If you are a reporter, see [AI tools for journalists](/blog/ai-tools-for-journalists) for the full newsroom workflow, from documents to publication.

## Sources

1. Lewis, P. et al., "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks" (2020): https://arxiv.org/abs/2005.11401
2. Liu, N. F. et al., "Lost in the Middle: How Language Models Use Long Contexts" (2023): https://arxiv.org/abs/2307.03172
3. ChatPDF: https://www.chatpdf.com/
4. AskYourPDF, pricing: https://askyourpdf.com/pricing
5. Adobe, Acrobat AI Assistant and plans: https://www.adobe.com/acrobat/generative-ai-pdf.html
6. Google, Gemini Notebook help, usage limits by plan: https://support.google.com/notebooklm/answer/16213268
7. Google, Gemini Notebook help, supported sources and per-source limits: https://support.google.com/notebooklm/answer/16215270
8. Google, Gemini Notebook help, privacy: https://support.google.com/notebooklm/answer/16164461
9. Google, "NotebookLM is now Gemini Notebook" (16 July 2026): https://blog.google/innovation-and-ai/products/gemini-notebook/notebooklm-gemini-notebook/
