---
slug: "journal-formatter"
seo_title: "Manuscript Formatting Tool for Journal Submission"
description: "A manuscript formatting tool: put your paper in Nature, Science, IEEE, ACM, APA or Vancouver style, with a list of what still breaks the author guidelines."
heading: "A manuscript formatting tool that tells you what is still wrong"
intro: "Upload your manuscript and pick the target journal or style. The Journal formatter puts it in that section order and reference style, checks the word and abstract limits, and lists what still breaks the author guidelines, so you know what to fix before you submit."
primary_keyword: "manuscript formatting tool"
secondary_keywords: ["journal formatting", "format manuscript for journal", "ieee paper format", "vancouver format", "apa manuscript format", "nature formatting guidelines"]
hero: "cta"
cta:
  label: "Open the Journal formatter"
  href: "/write?module=journal-format"
plan_note: "The Free plan has 45 credits a month. Formatting costs 3 credits per 10,000 words of manuscript, at most 12 credits. The blank venue templates in the editor are free."
related: ["/blog/how-to-format-a-paper-for-a-journal", "/features/reference-list-formatter", "/features/conference-paper-writer", "/features/ai-writing-editor", "/features/word-latex-export", "/tools/thesis-to-manuscript", "/features/ai-peer-review", "/citation-styles"]
updated: "2026-11-13"
faq:
  - q: "Which journals and styles can it format for?"
    a: "Six named styles and one open option: Nature and Nature-family journals, Science, IEEE, ACM, APA 7th edition, and medical journals that follow the ICMJE recommendations with Vancouver references. For any other journal, choose \"Another journal\" and paste its instructions for authors; the formatter works from those. Without them it falls back to a general IMRaD order and says that the guidelines are needed for a proper check."
  - q: "Does it submit my paper to the journal?"
    a: "No. It reformats the manuscript and lists what still breaks the author guidelines. You make those fixes, read the journal's current instructions for authors, and submit through the journal's own system. Journals change their rules, so the instructions on the journal's site win over anything here."
  - q: "Does a formatted manuscript get accepted?"
    a: "Formatting does not decide acceptance; reviewers and editors judge the science. What formatting does is avoid a desk return for reasons that have nothing to do with your work, such as a missing data availability statement or an abstract over the limit. Nothing in AI for Research guarantees acceptance."
  - q: "How much does it cost?"
    a: "3 credits for each 10,000 words of manuscript, rounded up, with a maximum of 4 units. A typical 6,000-word article costs 3 credits; a 25,000-word manuscript costs 9; anything over 30,000 words costs 12. The blank venue templates in the editor (IEEE, ACM, APA, Nature, Vancouver) cost nothing."
  - q: "Will it change my wording or results?"
    a: "Its job is structure, not rewriting. It moves sections into the target order, renames headings, adds the statements the style expects as [placeholders] where you have not written them, and puts the references in the target style. Your results and numbers stay as you wrote them. Compare the output with your original before you use it."
---
The Journal formatter is the manuscript formatting tool in AI for Research. It is for authors who have a finished or nearly finished paper and a target journal: PhD students sending out their first article, academics resubmitting to a second journal after a rejection, and clinicians writing for a medical journal. You upload the manuscript and pick the journal or style. It returns the paper in that section order and reference style, and a list of what still breaks the author guidelines, which is the part you fix yourself.

<!-- SCREENSHOT: the Writing Studio with "Journal formatter" selected, a Word manuscript uploaded and "Medical journal (ICMJE / Vancouver)" chosen -->

## What it does

Each target style has its own section order, front matter, required statements and reference style. The formatter knows these for six styles and works from your pasted instructions for any other journal.

| Target style | What the formatter applies |
| --- | --- |
| Nature and Nature-family journals | A referenced summary paragraph, main text without an "Introduction" heading, Methods at the end, data and code availability, numbered references |
| Science | One-paragraph abstract, short subheadings, methods summarized with detail moved to supplementary materials, numbered references and notes |
| IEEE | Abstract and Index Terms, sections numbered in Roman numerals, IEEE reference style with bracketed numbers |
| ACM | Abstract, CCS Concepts, keywords, numbered sections, ACM Reference Format with DOIs |
| APA 7th edition | Title page, abstract with keywords, Method, Results and Discussion, author-date references, APA heading levels |
| Medical journal (ICMJE / Vancouver) | Title page with word count, structured abstract, ethics and registration in Methods, funding, competing interests, data sharing statement, Vancouver references |
| Another journal | The order, limits and statements in the instructions for authors you paste |

<!-- VERIFY: each style summary above against the journal's current instructions for authors (Nature, Science, IEEE, ACM, APA 7, ICMJE) before publishing -->

The output has two parts:

- **The manuscript, reformatted.** Sections in the target order with the target headings, the word and abstract limits checked, and the references in the target style. Statements the style expects but your paper lacks (data availability, competing interests, author contributions) appear as [placeholders].
- **What still breaks the author guidelines.** A list of the problems the formatter could not fix for you: an abstract over the limit, a missing ethics statement, too many figures, a reference without the details the style needs. This list is your to-do list before submission.

## What the list of remaining problems catches

Editors return manuscripts before review for reasons that have nothing to do with the science. These are the kinds of problem the list is there to catch, so you fix them before an editor sees them:

- **Length.** Main text, abstract or title over the limit the guidelines set, with how far over.
- **Missing statements.** Ethics approval, consent, trial registration, funding, competing interests, author contributions, data and code availability.
- **Structure.** An abstract that should be structured but is not, sections in the wrong order, a methods section the style moves to the end.
- **References.** Entries that lack what the target style needs, such as a DOI for ACM or the journal abbreviation for Vancouver.
- **Figures and tables.** More than the journal allows, or legends missing.
<!-- VERIFY: these categories against what the journal-format prompt actually reports once its builder is merged -->

Many journals also ask for a reporting checklist with the submission, such as CONSORT 2010 for a randomized trial or STROBE 2007 for an observational study. That is a separate step: run the guideline check in the Reviewer.

The list only covers what it can see in your text and in the guidelines you chose or pasted. Anything set only in the journal's submission system, such as file formats, cover letters or suggested reviewers, is for you to check.

## How it works, step by step

1. Open the Writing Studio and choose **Journal formatter**, or start it from the Editor.
2. Upload the manuscript (Word or PDF) or paste it.
3. Pick the **Target journal style**. For a journal not listed, choose **Another journal** and paste its instructions for authors.
4. Optionally add the journal's name and paste its author guidelines even for a listed style: word limits differ between journals that share a reference style.
5. Press Run. The reformatted manuscript appears with the list of remaining problems.
6. Press **Open in editor**, work through the list, and export to Word (free) or LaTeX (paid plans).

Starting a new paper instead? The editor has blank venue templates for IEEE, ACM, APA, Nature and Vancouver, free on every plan, so you write in the right structure from the first page.

<!-- SCREENSHOT: the formatter's output, the "What still breaks the author guidelines" list above the reformatted manuscript -->

## A worked example

*Example (invented for illustration):* a clinician has a 5,400-word cohort study written in APA style for a psychology journal that rejected it. She now targets a general medical journal.

1. Journal formatter, style **Medical journal (ICMJE / Vancouver)**. She pastes the new journal's instructions for authors, which set a 3,500-word limit and a 250-word structured abstract. Cost: 3 credits (one unit of 10,000 words).
2. The output moves ethics approval into Methods, turns the abstract into Background, Methods, Results and Conclusions, renumbers the references in Vancouver style, and adds placeholders for funding and a data sharing statement.
3. The list of what still breaks the guidelines says the main text is about 1,900 words over the limit, the abstract is 40 words over, and the STROBE checklist is required.
4. She cuts the text, writes the statements, and runs the STROBE 2007 [reporting guideline check](/features/reporting-guideline-checker) in the Reviewer: 5 credits for her manuscript.

Total: 8 credits, inside the Free plan's 45 a month.

## What it does not do

- It does not submit to the journal or fill in the journal's submission system.
- It does not guarantee acceptance, or even that every guideline is met. The list of what still breaks the author guidelines is what you fix, and the journal's current instructions for authors are the final word.
- It does not lay out typeset pages. Journals typeset accepted papers themselves; for LaTeX-based venues, move the text into the official class file.
- It does not verify that your references exist. Run the [reference list formatter](/features/reference-list-formatter) (free) or [Citation check](/features/citation-checker) for that.
- It does not rewrite your science. Shortening to a word limit is your call; the list tells you how far over you are.

## Who uses it

- PhD students turning thesis chapters into articles: see [AI tools for PhD students](/for/phd), and the [thesis to manuscript](/tools/thesis-to-manuscript) tool for the first draft.
- Academics moving a paper between journals after a rejection: see [AI for academics](/for/academics).
- Clinicians writing for medical journals that follow ICMJE: see [AI for medicine](/for/medicine).

To check the paper as a reviewer would before you submit, use [AI peer review](/features/ai-peer-review). For the 10,000+ reference styles the editor supports, see [citation styles](/citation-styles).

## Learn more

- [How to format a paper for a journal](/blog/how-to-format-a-paper-for-a-journal)
- [How to format a reference list](/blog/how-to-format-a-reference-list)
