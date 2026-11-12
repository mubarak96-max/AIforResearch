---
slug: "research-poster"
seo_title: "Research Poster Template: PowerPoint and LaTeX Layouts"
description: "A research poster template with two layouts, the sections a conference expects, word and font budgets, PowerPoint setup steps and a LaTeX file to copy."
heading: "Research poster template: layouts, sections and a LaTeX file to copy"
intro: "A research poster template you can build in PowerPoint or LaTeX: two layouts, the sections a conference expects, how many words and what font size each needs, and a tikzposter file to copy and compile."
primary_keyword: "research poster template"
secondary_keywords: ["academic poster template", "conference poster", "scientific poster template", "poster presentation template", "latex poster template", "powerpoint poster size"]
hero: "cta"
cta:
  label: "Write the poster text"
  href: "/write"
plan_note: "The template is free. A blank poster outline in Writing Studio costs nothing; having it written from your topic with citations costs 15 credits."
related: ["/features/research-slides", "/templates/research-proposal", "/blog/how-to-write-a-research-proposal", "/features/ai-writing-editor", "/blog/which-statistical-test-to-use"]
updated: "2026-11-12"
faq:
  - q: "What size should a research poster be?"
    a: "Use the size the conference states, which is usually in the call for abstracts or the presenter instructions. Common sizes are A0 portrait (841 by 1189 mm) at European meetings and 48 by 36 inches landscape at many North American ones. Set the size before you start designing, because scaling a finished poster changes font sizes and spacing."
  - q: "What sections does a research poster need?"
    a: "Most conferences expect a title banner with authors and affiliations, a short introduction, the objective or question, methods, results, conclusions, references and contact details. Results usually take the most space, often 40% of the poster. A QR code to the full paper or slides helps readers who want detail you left off."
  - q: "How many words should a research poster have?"
    a: "Aim for 500 to 800 words in total, not counting the references and figure labels. A reader should get the main finding from a few meters away in under a minute. If you have more, move it to a handout or a page behind a QR code rather than shrinking the font."
  - q: "Can I make a research poster in PowerPoint?"
    a: "Yes. Make one slide, then set Design, Slide Size, Custom Slide Size to the poster's dimensions before adding anything. PowerPoint allows up to 56 inches on each side, so A0 and 48 by 36 inches both fit. Export to PDF for printing and check the figures at 100% zoom first."
  - q: "Can AI make my research poster?"
    a: "AI can write the poster text. In AI for Research, Writing Studio's Poster text template writes short blocks for each section from your topic or results, with real citations, for 15 credits. It does not lay out or design the poster. You place the text and your own figures in PowerPoint, LaTeX or a design tool."
---
This research poster template is for students and researchers presenting at a conference or poster session. It gives two layouts, the sections organizers expect, a word and font budget for each, PowerPoint setup steps and a LaTeX file you can copy. Write the text here or in Writing Studio, then lay it out in the tool you prefer.

## The sections a research poster needs

Every conference poster carries the same core blocks. The table gives a word budget for a 600-word poster and a type size for a 48 by 36 inch print; scale both for A0.

| Section | What goes in it | Words | Type size |
| --- | --- | --- | --- |
| Title banner | Title as a finding or question; authors, affiliations, logos | 10 to 20 | 72 to 100 pt |
| Introduction | The problem and the gap, 3 to 4 sentences | 80 to 100 | 28 to 36 pt |
| Objective | The question or hypothesis, one sentence | 20 to 30 | 32 to 40 pt |
| Methods | Design, sample, measures, analysis; a flow diagram if you can | 80 to 120 | 28 to 32 pt |
| Results | Your key figure or table and 2 to 3 findings | 120 to 180 | 28 to 32 pt |
| Conclusions | 2 to 3 bullet points: the answer and what it means | 50 to 80 | 32 to 40 pt |
| References | 3 to 6, in a small font | n/a | 18 to 24 pt |
| Contact and links | Email, QR code to the paper or slides, funding | 20 | 24 pt |

Section headings sit at 40 to 60 pt. Anything under 24 pt is hard to read from a meter away.

## Two research poster template layouts to copy

### Layout A: landscape, three columns (48 x 36 in)

```text
+--------------------------------------------------------------+
|  TITLE (as a finding)               logos                    |
|  Authors, affiliations                                       |
+--------------------+--------------------+--------------------+
| INTRODUCTION       | RESULTS            | RESULTS (cont.)    |
|                    |                    |                    |
| OBJECTIVE          |  [key figure,      | CONCLUSIONS        |
|                    |   largest item]    |  - finding 1       |
| METHODS            |                    |  - finding 2       |
|  [flow diagram]    |  finding 1, 2      | REFERENCES         |
|                    |                    | CONTACT  [QR]      |
+--------------------+--------------------+--------------------+
```

### Layout B: portrait, two columns (A0, 841 x 1189 mm)

```text
+------------------------------------+
| TITLE                       logos  |
| Authors, affiliations              |
+-----------------+------------------+
| INTRODUCTION    | OBJECTIVE        |
| METHODS         |                  |
+-----------------+------------------+
|      RESULTS: key figure, full     |
|      width, findings beneath       |
+-----------------+------------------+
| CONCLUSIONS     | REFERENCES       |
|                 | CONTACT [QR]     |
+-----------------+------------------+
```

Readers scan top-left to bottom-right, column by column. Put the conclusions where the eye ends, or repeat the main finding in the title.

## The research poster template in PowerPoint

1. Open a blank presentation and delete all but one slide.
2. Go to **Design**, **Slide Size**, **Custom Slide Size**. Enter the width and height (for example 48 in by 36 in, or 84.1 cm by 118.9 cm for A0 portrait). PowerPoint allows up to 56 inches a side [1].
3. Turn on guides and draw the column grid from Layout A or B, with 1 inch margins and gutters.
4. Add text boxes per section at the type sizes in the table above. Insert figures as high-resolution images or vector files.
5. Export as PDF and view it at 100% zoom to check that figures are sharp before you send it to print.

## The research poster template in LaTeX (copy this)

This file uses the tikzposter class [2]. It compiles with pdfLaTeX in Overleaf or a local TeX installation. Change `landscape` to `portrait` and the column widths to get Layout B.

```latex
\documentclass[25pt, a0paper, landscape]{tikzposter}
\usepackage{graphicx}
\title{[Title stated as a finding]}
\author{[Author One, Author Two]}
\institute{[Department, University]}
\usetheme{Default}

\begin{document}
\maketitle

\begin{columns}
  \column{0.32}
  \block{Introduction}{[The problem and the gap in 3 to 4 sentences.]}
  \block{Objective}{[One sentence: the question or hypothesis.]}
  \block{Methods}{[Design, sample, measures, analysis.]}

  \column{0.36}
  \block{Results}{
    \includegraphics[width=0.95\linewidth]{figure1.pdf}\\
    [Finding 1 in one sentence. Finding 2 in one sentence.]
  }

  \column{0.32}
  \block{Conclusions}{
    \begin{itemize}
      \item [The answer to the question]
      \item [What it means, for whom]
    \end{itemize}
  }
  \block{References}{\small [3 to 6 references]}
  \block{Contact}{[email] \quad [QR code image]}
\end{columns}
\end{document}
```

<!-- SCREENSHOT: Writing Studio "Start from a template" grid with the Poster text template highlighted -->

## A filled example (invented)

> **Example only.** The study and numbers are invented to show the length of each block.

- **Title:** Peer tutoring halves first-year dropout in engineering
- **Objective:** Is weekly peer tutoring attendance associated with staying in the program into year two?
- **Methods:** Cohort of 640 first-year students, 2024 to 2025. Attendance logged by session. Logistic model adjusted for entry grades and gender.
- **Results:** Students attending 6 or more sessions left at 11% against 24% for non-attenders. The figure shows dropout by attendance band.
- **Conclusions:** Attendance is strongly linked to retention. A randomized invitation study is needed to rule out motivation as the cause.

## How to write the poster text in AI for Research

AI for Research writes the words for the poster. It does not lay out the poster itself.

1. Open **Writing Studio**.
2. For a blank outline, choose **Poster text** under **Start from a template**. A document opens with Title and authors, Introduction, Methods, Results, Conclusions, and References and contact, each with a hint. No credits.
3. For a draft, choose **Fill a template**, pick **Poster text** and enter your topic, with your results in the notes. It writes about 700 words under those headings, cites real papers and leaves [placeholders] where only you have the facts.
4. Edit it in the editor, cut each block to the word budget above and paste it into PowerPoint or the LaTeX file.

| Task | Where | Credits |
| --- | --- | --- |
| Copy the layouts or LaTeX file | This page | 0 |
| Blank Poster text outline | Writing Studio | 0 |
| Poster text written from your topic, with citations | Writing Studio, Fill a template | 15 |
| Run a statistical test for the results block | Data Lab | 0 |

The free plan has 45 credits a month. See [pricing](/pricing). If you also present the work as a talk, the [research presentation maker](/features/research-slides) builds a slide deck with speaker notes.

<!-- SCREENSHOT: a filled Poster text document in the editor, Results section with a [placeholder] for the figure -->

## What this template and the tool do not do

- There is no PowerPoint or PDF poster file to download. Copy the layouts and LaTeX code from this page.
- AI for Research does not design, lay out or print posters. You place the text and figures yourself.
- The AI does not know your results. Paste them in the notes, or it leaves placeholders; it never invents your numbers.
- Conference rules on size, orientation and printing win over this template. Check them first.

## Who it is for

Undergraduates at a research day, master's and PhD students at their first conference, and researchers who need a poster version of a paper. For more on what AI for Research does for each group, see [AI for college students](/for/undergraduates) and [AI tools for PhD students](/for/phd).

## Learn more

- [Which statistical test to use](/blog/which-statistical-test-to-use)
- [How to write a research question](/blog/how-to-write-a-research-question)
- [Thesis defense presentation, slide by slide](/blog/thesis-defense-presentation)

## Sources

Checked November 2026.

1. Microsoft Support. Change the size of your slides. https://support.microsoft.com/en-us/office/change-the-size-of-your-slides-040a811c-be43-40b9-8d04-0de5ed79987e
2. CTAN. tikzposter: create scientific posters using TikZ. https://ctan.org/pkg/tikzposter
