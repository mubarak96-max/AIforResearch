---
slug: "document-converter"
seo_title: "PDF to Markdown Converter for Papers, Word and Slides"
description: "A free PDF to Markdown converter: turn a PDF, Word file or PowerPoint deck into Markdown or an editable document in the editor. No credits on any plan."
heading: "A PDF to Markdown converter for research documents"
intro: "Drop in a PDF, a Word file or a PowerPoint deck and get it back as Markdown or as a document you can edit in the editor. It costs no credits."
primary_keyword: "pdf to markdown converter"
secondary_keywords: ["word to markdown", "powerpoint to markdown", "convert pdf to editable document", "docx to markdown"]
hero: "cta"
cta:
  label: "Open the tools"
  href: "/convert"
plan_note: "The Free plan has 45 credits a month. Converting a document costs 0 credits on every plan."
related: ["/tools/pdf-tools", "/features/ai-writing-editor", "/features/chat-with-pdf", "/features/research-library", "/features/word-latex-export", "/blog/chat-with-pdf", "/blog/how-to-organize-research-papers", "/for/academics"]
updated: "2026-11-13"
faq:
  - q: "How do I convert a PDF to Markdown?"
    a: "Open the document converter at /convert, add the PDF and choose Markdown as the output. You get the text with its headings, paragraphs and lists as Markdown, which you can copy. Check the result against the original, especially tables, equations and footnotes, which are the parts most likely to need fixing after any conversion."
  - q: "Can it convert Word and PowerPoint files to Markdown?"
    a: "Yes. Word documents (.docx) and PowerPoint decks (.pptx) convert the same way as PDFs, to Markdown or to an editor document. A deck becomes text slide by slide; the layout and design of the slides are not kept."
  - q: "Does it convert scanned PDFs?"
    a: "The converter reads the text layer of a PDF. A scanned PDF that is only an image of each page may come back empty or partial. Run the scan through OCR software first, or check the result carefully, before you rely on it."
  - q: "Is this the same as the PDF tools page?"
    a: "No. The free PDF tools merge, split, extract and rotate PDF pages, and keep the result as a PDF. The document converter changes the format: it turns a PDF, Word or PowerPoint file into Markdown or an editable document."
  - q: "Does it convert audio or images?"
    a: "No. Audio recordings and image files (PNG, JPG and so on) are not converted. For interviews, transcribe the audio first; for figures, keep the image file and insert it in the editor."
---
A PDF to Markdown converter is the quickest way to get text out of a file that was made to be printed. The **document converter** in AI for Research takes a PDF, a Word document or a PowerPoint deck and returns it as Markdown, or as a document in the editor that you can change, cite in and export. It costs no credits. It is for researchers who need to quote, restructure or reuse text from a paper, a report, a thesis draft or a lecture deck, and for anyone who keeps notes in Markdown.

<!-- SCREENSHOT: the document converter at /convert with a PDF added, "Markdown" selected as the output, and the converted Markdown shown beside the original file name -->

## What it does

| In | Out | What comes across |
| --- | --- | --- |
| PDF (.pdf) | Markdown, or an editor document | The text layer: headings, paragraphs and lists where the converter can recognize them |
| Word (.docx) | Markdown, or an editor document | Headings, paragraphs, lists and tables from the document's structure |
| PowerPoint (.pptx) | Markdown, or an editor document | The text on each slide, in slide order; not the layout or design |

<!-- VERIFY: which elements each format keeps (tables in PDF, speaker notes in PPTX, footnotes, images) once the /convert feature is built; adjust this table to match -->

**Markdown** is plain text with simple marks for headings, lists, emphasis and tables. It opens in any text editor, note-taking app or code repository, and it is easy to search, compare and paste into another tool.

**An editor document** opens in the AI for Research editor, where you can rewrite with the [AI writing editor](/features/ai-writing-editor), add live citations from your Library, and export to Word or PDF (LaTeX export is on paid plans; see [Word and LaTeX export](/features/word-latex-export)).

### Not converted

- **Audio** (interview recordings, lectures) is not transcribed. See [interview transcription](/blog/interview-transcription) for options.
- **Image files** (PNG, JPG and similar) are not converted to text.
- **Scanned PDFs:** the converter reads the text layer of a PDF. A scan with no text layer may come back empty or incomplete. <!-- VERIFY: whether /convert applies OCR to scanned PDF pages (lib/server/lib/fileText.ts has OCR fields); do not claim OCR unless it is enabled for /convert --> Check the result before you rely on it.

## When Markdown is the right format

Markdown is useful when you want the words, not the page. Some common cases in research:

- **Notes and literature matrices.** Keep extracted text from reports and papers in a notes app or folder where everything is searchable in one place.
- **Version control.** Plain text files work well with Git, so a lab can track changes to protocols, codebooks or documentation line by line.
- **Reusing your own text.** Pull the methods section from an earlier paper or the text from a conference deck into a new draft, then rewrite it.
- **Feeding other tools.** Many writing, publishing and documentation tools accept Markdown, so it is a simple bridge between formats.

Choose an editor document instead when you want to keep working on the text as a document: rewriting, adding citations and exporting to Word or PDF.

### Tips for a cleaner conversion

- Use the original born-digital PDF from the publisher or the author, not a printout that was scanned.
- For your own work, convert the Word file rather than the PDF made from it; Word keeps the heading structure.
- Expect to rebuild complex tables and equations by hand. Check every number you copy from a converted table against the original.
- Two-column PDFs and pages with sidebars can come across in an odd reading order. Skim the result once from top to bottom.

## How it works, step by step

1. Open the document converter from the tools page. Its route is /convert.
2. Add a file: a PDF, a Word document (.docx) or a PowerPoint deck (.pptx).
3. Choose the output: **Markdown** or **editor document**.
4. Convert. For Markdown, copy the result into your notes or another tool. For an editor document, it opens in the editor.
5. Compare the result with the original. Fix tables, equations, footnotes and headers or footers that came across out of place.

## A worked example

*Example (invented for illustration):* a PhD student in public health is writing a systematic review and keeps her notes in a Markdown folder.

1. She converts a 40-page government report (a born-digital PDF) to Markdown, so she can search it and quote passages in her notes. Cost: 0 credits.
2. A co-author sends comments on the protocol as a Word file. She converts it to an editor document, works through the comments, adds citations from her Library and exports the revised protocol to Word. Cost: 0 credits.
3. She converts her supervisor's methods lecture deck (.pptx) to Markdown to keep the slide text with her notes. The slide design is gone, which is what she wanted. Cost: 0 credits.
4. One old report is a scanned PDF and comes back almost empty. She runs it through OCR software elsewhere and converts the result.

Total: 0 credits.

## What it does not do

- It is not a PDF editor. To merge, split, extract or rotate PDF pages, use the free [PDF tools](/tools/pdf-tools), which keep the file as a PDF and run in your browser.
- It does not transcribe audio or read text in image files.
- It does not promise a perfect copy of the layout. Columns, tables, equations and footnotes in PDFs often need cleanup after any conversion.
- It does not convert to Word or LaTeX directly. Convert to an editor document, then export from the editor.
- It does not summarize or answer questions about the file. To ask questions of a paper, use [chat with PDF](/features/chat-with-pdf); to keep and tag papers, use the [Library](/features/research-library).

Converting a file you do not own does not change its copyright. Quote and reuse within the terms of the original's licence.

## Who uses it

- Academics reusing their own published text, slides and reports: see [AI for academics](/for/academics).
- PhD and master's students gathering material for a thesis: see [AI for PhD students](/for/phd) and [AI for master's students](/for/masters).
- Researchers in industry turning reports and decks into notes or documentation: see [AI for industry](/for/industry).

## Learn more

- [Chat with PDF: ask questions of a research paper](/blog/chat-with-pdf)
- [How to organize research papers](/blog/how-to-organize-research-papers)
- [How to read a research paper](/blog/how-to-read-a-research-paper)
