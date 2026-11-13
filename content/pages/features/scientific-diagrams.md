---
slug: "scientific-diagrams"
seo_title: "Scientific Diagram Maker for Frameworks and Flowcharts"
description: "A scientific diagram maker in the editor: draw conceptual frameworks, research flowcharts and study designs as Mermaid, or describe one and let AI draw it."
heading: "A scientific diagram maker inside your document"
intro: "Add a diagram block in the editor and draw a conceptual framework, a methodology flowchart or a study design as Mermaid, or describe it in a sentence and press Draw with AI. Export it as SVG or PNG for your thesis, paper or poster."
primary_keyword: "scientific diagram maker"
secondary_keywords: ["conceptual framework diagram maker", "research flowchart maker", "study design diagram", "mermaid diagram", "methodology flowchart"]
hero: "cta"
cta:
  label: "Open the editor"
  href: "/editor"
plan_note: "The Free plan has 45 credits a month. Drawing a diagram yourself costs nothing; Draw with AI costs 1 credit a diagram. SVG and PNG export are free."
related: ["/blog/how-to-draw-a-conceptual-framework-diagram", "/blog/theoretical-vs-conceptual-framework", "/features/ai-writing-editor", "/features/methodology-builder", "/features/systematic-review", "/features/research-poster-maker", "/blog/how-to-make-a-prisma-flow-diagram", "/blog/how-to-write-a-methodology-chapter"]
updated: "2026-11-13"
faq:
  - q: "How do I draw a conceptual framework diagram?"
    a: "List your variables or concepts first, then the relationships between them: which one is expected to influence which, and which ones moderate or mediate. Draw each concept as a box and each relationship as an arrow, labeled with the hypothesis it stands for. In the editor, add a diagram block and either write it in Mermaid or describe it in a sentence and press Draw with AI, then correct the arrows against your hypotheses."
  - q: "What is Mermaid?"
    a: "Mermaid is a text format for diagrams: you write lines such as \"A --> B\" and it draws the boxes and arrows for you. Because the diagram is text, it is easy to change, it stays sharp at any size, and it can be versioned with your document. You do not need to learn it to use the editor, since Draw with AI writes it for you, but small fixes are quicker by hand once you have seen it."
  - q: "Can AI draw my research framework?"
    a: "It can draw what you describe. Draw with AI turns a sentence or a list of variables and relationships into a Mermaid diagram for 1 credit. It does not choose your theory or your hypotheses: if you describe a relationship wrongly, the diagram will show it wrongly. Check every arrow against your research questions before the diagram goes into a chapter."
  - q: "Can I make a PRISMA flow diagram here?"
    a: "Use the Systematic Review workspace for that. It builds the PRISMA 2020 flow diagram from your actual search, de-duplication and screening counts, free, so the numbers in the boxes match your review. The diagram block in the editor is for the other figures: frameworks, study designs and methodology flowcharts."
  - q: "Can I use the diagram in Word or LaTeX?"
    a: "Yes. Export the diagram as PNG for Word or PowerPoint, or as SVG for LaTeX (via a converter or the svg package), a poster or a journal that asks for vector figures. The diagram also stays inside your editor document and exports with it to Word or PDF."
---
The diagram block is the scientific diagram maker in AI for Research. It sits in the editor, so a conceptual framework, a research flowchart or a study design diagram lives in the same document as the chapter that explains it. You can draw the diagram yourself in Mermaid, a short text format, for free, or describe it in a sentence and press **Draw with AI** for 1 credit. Either way you can edit it, and export it as SVG or PNG for a thesis, a journal figure or a poster.

<!-- SCREENSHOT: the editor with a Mermaid diagram block open, the text on the left and the rendered conceptual framework on the right -->

## What it does

| Diagram | What it shows | Typical use |
| --- | --- | --- |
| Conceptual framework | Variables or concepts and the expected relationships between them, including moderators and mediators | Thesis chapter 2 or 3, a proposal, a paper's introduction |
| Methodology flowchart | The stages of the study in order: sampling, data collection, analysis | Methods chapter, ethics application, poster methods block |
| Study design diagram | Groups, allocation, measurement points and follow-up | Trials, cohort studies, experiments, pre-post designs |
| Process or system flowchart | Steps, decisions and outcomes | Engineering and computing papers, clinical pathways, policy processes |

Diagrams are Mermaid flowcharts, rendered by the editor. That makes them text you can change: rename a box, add an arrow or flip the direction from left-to-right to top-to-bottom, and the layout updates.

The diagram block can also be used from the framework module in the Thesis Suite, so a framework drafted there can be drawn without leaving the chapter. The Thesis Suite's [Methodology Builder](/features/methodology-builder) plans the study the flowchart describes.

## What a diagram looks like as text

This is a small conceptual framework written in Mermaid. Each line is one relationship; text in square brackets is the label in the box, and text between the bars is the label on the arrow.

```text
flowchart LR
  A[Workload] -->|H1 +| C[Burnout]
  B[Supervisor support] -->|H2 -| C
  C -->|H3 +| E[Intention to leave]
  F[Years in post] -.->|control| E
```

*Example (invented for illustration).* The dotted arrow marks a control variable, so it reads differently from the hypotheses. Change "LR" to "TB" and the same diagram runs top to bottom. Rename "Workload" to "Job demands" in one place and every arrow follows. This is why text diagrams are easier to keep in step with a changing thesis than a drawing in a slide program, where each box and arrow has to be moved by hand.

<!-- VERIFY: that the editor's Mermaid block renders this example as shown, including the dotted arrow -->

## Choosing the right diagram

- **Testing relationships between variables?** Draw a conceptual framework: concepts as boxes, hypotheses as labeled arrows. Keep moderators visually distinct from mediators.
- **Explaining what you will do, in order?** Draw a methodology flowchart: one box per stage, left to right or top to bottom, with the data or output of each stage.
- **Comparing groups over time?** Draw a study design diagram: groups as rows, measurement points as columns, the intervention between them.
- **Showing a theory you borrow rather than test?** That is a theoretical framework, and it is often clearer as a short paragraph with a citation than as a diagram. See [theoretical vs conceptual framework](/blog/theoretical-vs-conceptual-framework).

## How it works, step by step

1. Open a document in the editor and insert a **Diagram** block.
2. To draw it yourself, type Mermaid in the block. For example, a first line `flowchart LR` and a second line `A[Sleep quality] --> B[Exam performance]` draw two boxes joined by an arrow, left to right.
3. To have it drawn, press **Draw with AI** and describe it: the concepts, how they relate, and the direction you want. The block fills with the Mermaid text and the rendered diagram (1 credit).
4. Edit the text to fix labels, add a moderator or reorder the stages.
5. Export the diagram as **SVG** or **PNG**, or leave it in the document and export the whole document to Word or PDF.

<!-- VERIFY: the block's name in the editor's insert menu and where the SVG and PNG export buttons sit, once the diagram block ships -->

<!-- SCREENSHOT: the Draw with AI prompt box with a one-sentence description of a study design, and the rendered diagram below it -->

## A worked example

*Example (invented for illustration):* a master's student in education is writing a proposal on whether peer feedback improves writing quality, and whether self-efficacy explains the effect.

1. In her proposal document she inserts a diagram block and presses **Draw with AI**: "Peer feedback affects writing quality. Self-efficacy mediates the effect. Prior writing grade is a control." Cost: 1 credit.
2. The diagram shows peer feedback pointing to self-efficacy and to writing quality, self-efficacy pointing to writing quality, and prior grade as a separate box with an arrow to writing quality.
3. Her supervisor asks for the hypotheses on the arrows. She edits the Mermaid text by hand to add H1, H2 and H3 as arrow labels: free.
4. She inserts a second block for the methodology flowchart and writes it herself in six lines of Mermaid: free.
5. She exports both as PNG for the Word version and as SVG for the poster she makes later.

Total: 1 credit.

## What it does not do

- It does not decide your framework. Draw with AI draws what you describe; the theory, the variables and the hypotheses are your decisions, and your supervisor's.
- It does not draw data charts. For bar charts, scatter plots, survival curves and the like, use [Data Lab](/features/data-lab), which calculates the statistics in the browser and exports the chart.
- It does not build the PRISMA flow diagram. That is in the [Systematic Review workspace](/features/systematic-review), free, filled from your real screening counts.
- It is not a drawing program. Mermaid lays out boxes and arrows automatically; for freehand illustrations, molecular structures or anatomical drawings, use a dedicated tool.
- Very large diagrams get hard to read. Split a framework with more than about a dozen concepts into two figures.

## Who uses it

- Master's and PhD students drawing the conceptual framework for a proposal or thesis: see [AI for a master's thesis](/for/masters) and [AI tools for PhD students](/for/phd).
- Undergraduates who need a methods flowchart for a dissertation or lab report: see [AI for college students](/for/undergraduates).
- Academics and industry researchers drawing study designs and system flows for papers: see [AI for academics](/for/academics) and [AI for industry](/for/industry).

A diagram exported from here fits straight into a poster from the [research poster maker](/features/research-poster-maker). For the full set of editor features, see the [AI writing editor](/features/ai-writing-editor).

## Learn more

- [How to draw a conceptual framework diagram](/blog/how-to-draw-a-conceptual-framework-diagram)
- [Theoretical vs conceptual framework](/blog/theoretical-vs-conceptual-framework)
- [How to make a PRISMA flow diagram](/blog/how-to-make-a-prisma-flow-diagram)
- [How to write a methodology chapter](/blog/how-to-write-a-methodology-chapter)
