# WriteOrbit on LinkedIn: 30 posts and articles

23 short posts and 7 long-form LinkedIn articles, set out as a six-week calendar (5 a week). Each one comes with an image prompt.

**Before you publish**
- Replace `[NAME]` with the person posting. Founder-voice posts do better than company-page posts, so post from a personal profile and reshare from the WriteOrbit page.
- LinkedIn shows posts with outside links to fewer people. Put the link in the **first comment** and write "Link in the first comment" in the post. Links inside articles are fine.
- The paper count isn't consistent on the site: the homepage says **300M+** and the feature pages say **250M+**. These posts use 250M+. Pick one figure and use it everywhere.
- Where a post says "screenshot", use a real capture from the app (`docs/images/editor.png`, `public/screenshots/`) rather than an AI image. AI-generated UI looks fake, and it misrepresents the product.

---

## Visual system (use with every image prompt)

Add this style block to the end of each prompt so the whole series looks like one set:

> **STYLE:** editorial illustration on warm cream paper (#FFFDF9, #F6F2EC), deep navy ink (#1E3A5F) as the main color, burnt-orange (#C2410C) used sparingly for marks, underlines and margin notes, like an editor's red pen. Faint ruled notebook lines, subtle paper grain, soft natural shadow. Serif typography feel (Source Serif). Calm, scholarly, modern, uncluttered, lots of negative space. No stock-photo people, no glowing robots, no neon, no purple gradients, no garbled text.

**Sizes:** feed posts 1080×1350 (portrait, takes up the most space in the feed) or 1200×1200. Article covers 1920×1080.
**Text on images:** generate the image without text, then add the headline yourself in Canva or Figma (Source Serif 4, navy). Image models still misspell words.

---

## Calendar

| Wk | Mon | Tue | Wed | Thu | Fri |
|---|---|---|---|---|---|
| 1 | 1 Launch | 2 Fake citations | 3 Autocomplete | **4 Article** | 5 @-cite |
| 2 | 6 Chat with PDF | 7 Citation generator | 8 Claim check | **9 Article** | 10 Authorship report |
| 3 | 11 Word & LaTeX | 12 Review matrix | **13 Article** | 14 Gap finder | 15 Zotero import |
| 4 | 16 For supervisors | **17 Article** | 18 Pattern checker | 19 Thesis → paper | 20 Grant writer |
| 5 | **21 Article** | 22 Labs & teams | 23 On your phone | 24 Privacy | **25 Article** |
| 6 | 26 Data analysis | 27 Developer API | 28 PDF tools | **29 Article** | 30 Founder note |

---

# WEEK 1

## 1 · Post · Launch

Every AI writing tool can write you a paragraph.

Very few can tell you where that paragraph came from.

That's why I built WriteOrbit, an AI editor for academic writing with one rule: every claim needs a real source.

What it does:
→ Suggests your next sentence and cites the paper it came from
→ Type @ to cite from 250M+ scholarly works
→ Ask your PDFs questions and get answers with page numbers
→ Checks your draft for unsupported claims, retracted papers and wrong DOIs
→ Opens your Word template, exports Word, PDF or LaTeX

It's free to start. No credit card.

If you write with sources (thesis, paper, report, grant), I'd love for you to try it and tell me what's missing.

Link in the first comment.

#AcademicWriting #PhDLife #AcademicTwitter #Research #EdTech

**First comment:** https://writeorbit.app

**Image prompt:** A single sheet of manuscript paper seen from slightly above, lying on a desk, with handwritten-style navy text lines (illegible, abstract) and one sentence underlined in burnt-orange pen with a small superscript footnote marker beside it. A thin orange line runs from the marker into the margin, where it ends at a tiny stacked-paper icon that stands for a source. [STYLE]

---

## 2 · Post · The fake-citation problem

You ask an AI chatbot for sources. It gives you five.

Author, journal, year, DOI. They all look perfect.

Two of the papers don't exist.

<!-- If you have a real story (yours or a user's, with permission), use it here instead. It will do better. -->


This happens all the time. A language model writes text that *looks* like a citation, so it produces things that look like citations. It isn't looking anything up.

The fix isn't "use AI less". It's to keep the citations out of the AI's memory altogether.

In WriteOrbit, every citation comes from a scholarly database. The AI can suggest the sentence, but the reference is a real record you can click to open the paper.

If you can't click through to it, it doesn't go in your reference list.

Have you been caught out by a made-up citation? What happened?

#AIinEducation #ResearchIntegrity #AcademicWriting #ChatGPT

**Image prompt:** Two index cards side by side on cream paper. The left card is a citation drawn in faded, ghostly dotted lines that dissolve into nothing at the edges. The right card is the same citation in solid navy ink, with a small burnt-orange tick in the corner and a thin thread connecting it to a real bound journal volume. [STYLE]

---

## 3 · Post · Autocomplete with citations

Autocomplete for code changed how developers work.

Academic writing never got its own version. Until now.

In WriteOrbit, you start typing and the editor suggests your next sentence, *with the citation it's based on*.

→ Press Tab to accept
→ Refine it if it's close but not quite right
→ Ask it to conclude a section when you're stuck

The citation isn't decoration. It points to the actual paper, so you can check that the sentence says what the source says.

You stay the author. It does the hunting.

Try it free (link in comments) and tell me how the suggestions hold up in your field.

#AcademicWriting #AItools #PhD #ResearchProductivity

**Image prompt:** SCREENSHOT recommended: the editor with a grey ghost-text suggestion and its citation chip visible. AI alternative: a close-up of a typed line on a page with the next line appearing in pale, translucent navy ink, ending in a small burnt-orange bracketed citation marker, and a keyboard Tab key in soft focus at the bottom edge. [STYLE]

---

## 4 · ARTICLE · Why AI invents citations, and how to write with AI without risking your reputation

**Headline:** Why AI Invents Citations (and How to Write With AI Without Risking Your Name)
**Subtitle:** A practical workflow for students, researchers and anyone whose work gets checked.

If you have asked a chatbot for sources, you have probably seen a citation that looked perfect and led nowhere. The author sounds right, the journal is real and the year is plausible, but the paper does not exist. Or it exists and says something else.

This isn't a rare glitch. It follows from how these tools work, and once you see why, the fix is simple.

### Why it happens

A large language model predicts the next word. It has read millions of reference lists, so it knows what a citation *looks like*: surname, initial, year, title in sentence case, journal in italics, volume, pages, DOI. When you ask for a source, it produces text with that shape.

Nothing in that process checks a database. A model can be very good at the form of a citation and still have no link to any real paper. Bigger models make up fewer citations, but they never get to zero, and the made-up ones get harder to spot because they look so convincing.

### Why it matters more than it seems

A made-up reference in a student essay can mean a failed assignment or a misconduct hearing. In a submitted manuscript it can mean desk rejection, and after publication it can mean a correction notice with your name on it. In a policy brief or news story it damages trust in everything else you wrote.

The worst part is that checking afterwards takes a long time. You have to search for every reference by hand, and the convincing fakes are exactly the ones you won't think to check.

### A workflow that removes the risk

**1. Keep citations out of the AI's memory.** Use AI for wording, structure and drafting, but take every reference from a scholarly database: OpenAlex, Crossref, PubMed, your library catalogue or your reference manager. If a tool can't show you where a citation came from, don't use it.

**2. Cite while you write, not at the end.** Adding references after drafting is how unsupported claims get through. When the source sits next to the sentence, you notice at once when a claim goes further than the paper does.

**3. Read the passage, not just the abstract.** A real paper can still be cited wrongly. Check that the specific claim appears in the source, ideally with a page number.

**4. Check source quality before you submit.** Retracted papers, preprints you've presented as peer-reviewed, and wrong DOIs are all common and all embarrassing. Check them on purpose, as a final step.

**5. Keep a record of how you used AI.** More universities and journals now ask for an AI-use statement. It's much easier to write one honestly if your tools have kept a record as you worked.

### How WriteOrbit does this

I built WriteOrbit around that workflow. The AI can suggest your next sentence, but every citation it attaches comes from a database of 250M+ scholarly works, and each one opens the paper behind it. Chat with your PDFs and answers quote the passage and give the page. Before you submit, the claim check flags unsupported or overstated claims, retracted papers, preprints and wrong DOIs, as comments in your text. An authorship report can show a supervisor how the document was written.

It's free to start at writeorbit.app.

### The short version

Let the AI help with the writing, but always take the reference from a real database.

*How do you check references in your own work? I'd like to hear in the comments.*

#AcademicWriting #ResearchIntegrity #AIinEducation #HigherEducation

**Cover image prompt (1920×1080):** A wide editorial still life: an open bound journal on the right, solid and real, and on the left a stack of index cards whose top card is fading into scattered dotted particles drifting away. A burnt-orange pen lies diagonally between them like a dividing line. Long, soft morning shadows. [STYLE]

---

## 5 · Post · @-cite

Small feature, big time saver:

Type **@** in WriteOrbit and start typing a topic, author or title.

You're searching 250M+ scholarly works without leaving your sentence.

Pick one and it's cited in your style (APA 7, MLA 9, Chicago, Harvard, IEEE, Vancouver or 10,000+ journal styles) and added to the reference list.

Change the style later and every citation and the whole reference list update.

No tab-switching. No copy-pasting from Google Scholar. No reformatting the night before the deadline.

What's your current citing setup? I'm curious how many people still format references by hand.

#AcademicWriting #CitationStyles #APA #GradSchool

**Image prompt:** A minimalist close-up of a single line of serif text on paper with a large burnt-orange "@" symbol at the cursor position, from which a neat fan of small index cards opens upward like a dropdown, each card showing abstract navy lines. [STYLE]

---

# WEEK 2

## 6 · Post · Chat with your PDFs

"Which of these 40 papers used a longitudinal design?"

That question used to take an afternoon.

In WriteOrbit, upload your PDFs (or import them) and just ask. One paper or a whole folder.

The part I care about most: **every answer quotes the passage it used and gives the page number.**

So you're not trusting a summary. You're reading the evidence and deciding for yourself.

Good for:
→ Literature reviews
→ Checking a claim before you cite it
→ Getting into a new field fast
→ Long reports you have to brief on

Link in the first comment.

#PhD #LiteratureReview #ResearchTools #AcademicLife

**Image prompt:** A neat stack of PDF documents with a speech-bubble shaped paper note on top. Inside the bubble a short highlighted quote is marked with burnt-orange brackets and a small "p. 14"-style page tab sticking out of the side of the stack where the quote comes from. [STYLE] (Add "p. 14" yourself afterwards.)

---

## 7 · Post · Free citation generator

Free tool, no sign-up needed:

Paste a DOI or a paper title → get the citation in APA, MLA, Chicago, Harvard, or any of 10,000+ styles.

Websites and books work too. Fill in the fields and it formats them.

No pop-ups and no "sign up to copy." Just the citation.

Bookmark it for the next time you need one reference fast. And if your department uses some obscure journal style, test it and tell me whether we have it.

Link in comments.

#CitationGenerator #APA7 #StudentLife #AcademicWriting

**First comment:** https://writeorbit.app/tools/citation-generator

**Image prompt:** A clean flat-lay: a single DOI-style slip of paper on the left with an arrow drawn in burnt-orange pen pointing to a perfectly formatted reference card on the right, with a hanging indent visible as navy lines. A few loose style-guide tabs (unlabelled) sit around it. [STYLE]

---

## 8 · Post · Claim check

Before you submit anything, here are four things worth checking that most people never do:

1. **Unsupported claims.** Sentences that state a fact with no citation.
2. **Overstated claims.** "X causes Y" when the paper only found a correlation.
3. **Retracted papers.** They're still cited thousands of times after retraction.
4. **Wrong DOIs and preprints.** A typo'd DOI, or a preprint presented as peer-reviewed.

WriteOrbit's claim and source check looks for all four and leaves comments right in your text, the way a careful co-author would.

It doesn't rewrite your argument. It points to the weak spots.

Which of these four would catch you out most often?

#ResearchIntegrity #PeerReview #AcademicWriting #Retraction

**Image prompt:** A manuscript page with four margin annotations in burnt-orange pen: a question mark, a wavy underline, a small strike-through on a reference, and a circled number. Navy text lines remain neat and abstract. A red-pen cap lies on the corner of the page. [STYLE]

---

## 9 · ARTICLE · The pre-submission checklist

**Headline:** The Pre-Submission Checklist: 10 Things to Fix Before a Reviewer Finds Them
**Subtitle:** Most desk rejections and painful reviews are avoidable. Here's what to look for.

Reviewers are busy and editors are busier. A manuscript that looks careless in its first two pages rarely gets read generously. Most of what draws harsh comments can be caught in an hour, before you click submit.

Here is the checklist I wish I'd had.

### The argument

**1. Can you state the contribution in one sentence?** If the abstract, the last paragraph of the introduction and the first paragraph of the discussion each describe a slightly different contribution, reviewers will notice.

**2. Does every research question get an answer?** List your questions and find the paragraph in the results or discussion that answers each one. Any question without an answer is a major comment waiting to happen.

**3. Do the claims match the evidence?** Look for causal language ("leads to", "drives", "causes") resting on correlational data. That's the most common reason for a major comment.

### The sources

**4. Is every factual claim cited?** Read only the sentences without citations. If one states a fact about the world, it needs a source.

**5. Does each source say what you say it says?** Spot-check your most important citations against the paper itself, not the abstract.

**6. Are any of your sources retracted?** Retracted papers keep getting cited for years. Check your reference list against retraction databases.

**7. Are your DOIs right, and are preprints labelled as preprints?** One wrong digit in a DOI breaks the link and looks careless.

### The presentation

**8. Is the reference style exactly the journal's?** Not "APA-ish". The journal's actual style, which is usually one of thousands of named variants.

**9. Is the methods section reproducible?** Could a competent stranger repeat your study from it? Sample, materials, procedure and analysis, with no gaps.

**10. Is the prose clear?** Long sentences, stacked nouns and unexplained abbreviations tire a reviewer out before they reach your findings.

### Do it faster

Doing this by hand takes most of a day, and that's why it often gets skipped. I built WriteOrbit's review tools for exactly this step:

- **AI peer review** gives referee-style major and minor comments on argument, methods, evidence and clarity, placed in your text.
- **Claim check** flags unsupported or overstated claims and citations the source doesn't back up.
- **Source quality** flags retracted papers, preprints and wrong DOIs.
- **Proofreading** suggests grammar and word-choice fixes as tracked changes you accept or reject.

None of this replaces a real colleague's read. But it means that colleague spends their time on your ideas rather than your typos.

Try it free at writeorbit.app.

*What's the harshest reviewer comment you've ever received that you could have caught yourself? Share it below. Everyone has one.*

#PeerReview #AcademicPublishing #PhD #ResearchWriting #ScholarlyPublishing

**Cover image prompt (1920×1080):** A manuscript lying on a desk with a vertical checklist clipped to its left side, ten short lines, the top seven ticked in burnt-orange pen and the last three empty. A fountain pen rests across the lower right. Soft window light from the left. [STYLE]

---

## 10 · Post · Authorship report

"Did you actually write this?"

More and more students, freelancers and researchers are being asked this, and an AI detector score isn't a fair answer. They get it wrong, and they disproportionately flag non-native English writers.

So WriteOrbit takes the opposite approach: **show how the document was written.**

The authorship report shows:
→ Time spent writing
→ Text typed vs. pasted
→ Text accepted from AI suggestions
→ A shareable link a teacher, supervisor or client can verify, no account needed

You choose when to share it, and you can withdraw the link at any time.

It's evidence, not a guess.

Teachers and supervisors: would this help you? I'd value your honest take.

#AcademicIntegrity #AIinEducation #HigherEd #Teaching

**Image prompt:** An elegant stacked bar of three paper strips in different tones of navy and one burnt-orange segment, arranged like a timeline across a cream page, with a small wax-seal style stamp (blank) in the corner suggesting verification. [STYLE]

---

# WEEK 3

## 11 · Post · Word in, LaTeX out

Things academic writers shouldn't have to do in 2026:

✗ Rebuild their university's thesis template by hand
✗ Copy-paste from Google Docs into Word and fix every heading
✗ Re-type equations and tables to move to Overleaf

In WriteOrbit:
✓ Open your .docx template and it keeps its styles, headers and page setup
✓ Export to Word, PDF, or a **full LaTeX project** for Overleaf
✓ Headings, tables, equations and references come with it

Write in a modern editor. Hand in whatever format your committee or journal wants.

#LaTeX #Overleaf #Thesis #AcademicWriting #PhDLife

**Image prompt:** Three documents fanned out side by side: one with a Word-like blue-grey ribbon header (no logo), one plain PDF page, one page of monospace LaTeX-style markup lines, all showing the same heading and equation layout. A burnt-orange curved arrow loops between them. [STYLE] (No real product logos.)

---

## 12 · Post · The literature review matrix

The most useful literature review tool isn't a tool. It's a table.

Rows: papers.
Columns: research question, method, sample, key finding, limitations.

Researchers have built these in Excel for decades because it works: once you can see the papers side by side, the themes, gaps and contradictions show up.

The problem is filling it in. 40 papers × 6 columns is 240 cells of careful reading.

WriteOrbit's review matrix fills the cells from your PDFs, **with the quote and page number for every cell** so you can check each one.

Then it drafts your literature review from the matrix, with real citations.

Full how-to article coming Wednesday.

#LiteratureReview #SystematicReview #PhD #ResearchMethods

**Image prompt:** A large grid table drawn on cream paper, like a hand-ruled spreadsheet, with abstract navy text in the cells. A few cells have tiny burnt-orange page-number tabs sticking out, and one column is highlighted with a soft orange wash. [STYLE]

---

## 13 · ARTICLE · How to build a literature review matrix

**Headline:** How to Build a Literature Review Matrix (and Why It Saves Weeks)
**Subtitle:** The simple table that turns a pile of papers into an argument.

Most literature reviews that struggle don't lack reading. They're summaries in a row: paper A found this, paper B found that. Examiners and reviewers want a synthesis: what the field agrees on, where it disagrees, and what nobody has studied yet.

The easiest way I know to get from summary to synthesis is a **review matrix**.

### What it is

A review matrix is a table. Each row is a paper. Each column is something you want to compare across papers. Once the table is filled in, you read *down the columns* instead of across the rows, and patterns appear.

### Step 1: Choose your columns from your question

Don't use a generic template. Pick columns that serve your research question. A good starting set:

- **Citation** (author, year)
- **Aim / research question**
- **Design and method**
- **Sample and setting**
- **Key findings**
- **Limitations**
- **Relevance to my study**

Then add two or three columns specific to your topic. If you're studying an intervention, add "intervention dose". If context matters, add "country / income level".

### Step 2: Fill it in from the papers, not the abstracts

Abstracts sell. Results sections tell. For each cell, find the actual passage and note the page. It feels slow, but it's what lets you defend every sentence of your review later.

### Step 3: Read down the columns

This is where the matrix earns its keep. Sort and scan each column:

- **Methods column:** Are 80% of studies cross-sectional? That's a gap: there's little longitudinal evidence.
- **Sample column:** All university students in high-income countries? A gap, and a limitation for the whole field.
- **Findings column:** Do studies split into two camps? Look at their methods and samples; the split often explains itself.

### Step 4: Turn patterns into themes

Each pattern becomes a paragraph or section: "Evidence for X is consistent in short-term studies but mixed over longer follow-up (Author, 2021; Author, 2023)." That's synthesis: one claim, several sources, a clear position.

### Step 5: Name the gap

Your gap should come straight out of the matrix: the empty cells, the under-studied groups, the conflicting results. A gap you can point to in a table is much easier to defend in a viva.

### Doing this faster

The method is old and it works, but filling in 200+ cells is the bottleneck. In WriteOrbit's literature review tool you add your PDFs, choose your columns, and the matrix fills from the papers, **with the quote and page for every cell**, so you check the evidence rather than trust a summary. From there it can draft the review with real citations in your style, for you to edit into your own argument.

There's also a free research gap finder at writeorbit.app/tools/research-gap-finder if you want a first pass at the gaps in a topic.

*Do you use a matrix, or a different system? I'd like to know what works in your field.*

#LiteratureReview #ResearchMethods #PhD #AcademicWriting #GradSchool

**Cover image prompt (1920×1080):** A bird's-eye view of a large hand-ruled table spread across a wooden desk, papers fanned out above it with thin burnt-orange threads connecting individual papers to specific cells in the table, like an evidence board but neat and orderly. [STYLE]

---

## 14 · Post · Research gap finder

"What's your research gap?"

It's the question that stalls most new PhD students, and it's hard because you need to have read everything to answer it.

I built a free tool for the first pass:

Enter a topic → get possible research gaps:
→ Unanswered questions
→ Under-studied groups and methods
→ Conflicting results

**Each one linked to the real papers behind it.**

It won't hand you a thesis. It gives you a reading list pointed at the edges of the field, which is where gaps are.

Try it on your topic and tell me if it found something you hadn't seen.

#PhD #ResearchGap #GradSchool #ResearchMethods

**First comment:** https://writeorbit.app/tools/research-gap-finder

**Image prompt:** A paper map of connected nodes (circles linked by fine navy lines, like a citation network) with one clear empty space in the middle circled in burnt-orange pen with a small dashed outline where a node is missing. [STYLE]

---

## 15 · Post · Bring your Zotero library

"I'd switch, but my whole library is in Zotero."

Fair. Nobody wants to rebuild 600 references.

So you don't have to. WriteOrbit imports from **Zotero, Mendeley, BibTeX and RIS**.

Once they're in:
→ Cite any of them in 10,000+ styles
→ Sort them into collections
→ Ask questions about the PDFs, with page numbers
→ Use them as the sources for AI drafting, so it only cites what *you* chose

Your references, plus an editor that knows what's in them.

(I wrote a fair comparison of Zotero vs Mendeley too. Link in comments.)

#Zotero #Mendeley #ReferenceManager #PhDLife

**First comment:** https://writeorbit.app/blog/zotero-vs-mendeley

**Image prompt:** A long row of index-card file drawers on the left with cards flowing in a smooth arc to an open notebook on the right, where they land neatly as footnotes. The arc of cards is drawn with a burnt-orange motion line. [STYLE]

---

# WEEK 4

## 16 · Post · For supervisors and teachers

A note for supervisors, teachers and examiners.

Your students are using AI. Banning it hasn't worked, and AI detectors make you choose between false accusations and missed cases.

There's a better question than "did they use AI?":

**"Can they show me how they wrote it, and do their sources hold up?"**

Two things in WriteOrbit help with exactly that:

1. **Authorship report.** The student shares a link showing writing time, typed vs. pasted text, and AI-accepted text. You open it without an account.
2. **Real citations only.** References come from scholarly databases and open the source, so a made-up reference can't get in through the tool.

I'm looking for a few supervisors and course leads to try this with a cohort and give me blunt feedback. Comment or DM if that's you.

#HigherEducation #AcademicIntegrity #AIPolicy #Teaching

**Image prompt:** A teacher's desk scene without people: a student's essay on top with a small fold-out paper "receipt" attached by a paperclip, showing three neat horizontal bars. A burnt-orange pen and a mug sit nearby. [STYLE]

---

## 17 · ARTICLE · A policy-friendly AI workflow

**Headline:** Using AI in Academic Writing Without Breaking the Rules: A Workflow for Students and Supervisors
**Subtitle:** Most AI policies come down to three things: be open about it, stay the author, and only cite real sources.

University AI policies vary a lot, from outright bans to "use it, but disclose it." But when you read enough of them, most come down to the same three expectations:

1. **Be open about it.** Say what you used AI for.
2. **Stay the author.** The ideas, argument and final wording are yours.
3. **Only cite real sources.** You stand behind every claim and citation.

Here's a workflow that satisfies all three and makes life easier for the student and the supervisor.

### For students

**Read your policy first.** Find your course's or department's actual rule. "Allowed with disclosure" and "not allowed in assessed work" are very different. If it's unclear, ask in writing.

**Use AI for the process, not the thinking.** Good uses: finding papers, summarising a PDF so you can decide whether to read it, getting feedback on clarity, checking grammar, drafting a structure you then rewrite. Risky uses: generating your argument, writing whole sections you submit unchanged, and anything to do with citations from a chatbot's memory.

**Keep citations real.** Take every reference from a database and open it. If you can't click through to the paper, it doesn't go in.

**Keep a record as you go.** Writing an AI-use statement from memory at the end is hard and often inaccurate. Use tools that log how the document was written.

**Write a specific disclosure.** "I used AI" says nothing. Better: "I used WriteOrbit's paper search to find sources, the PDF chat to summarise six papers before reading them in full, and the proofreading tool for grammar suggestions, which I reviewed individually."

### For supervisors and teachers

**Ask for process evidence, not detector scores.** AI detectors have well-documented false positives, especially for non-native English writers. A record of how a document was written is fairer to students and gives you more to go on.

**Check the sources, not the style.** Made-up or wrongly cited references are the clearest signs of careless AI use, and they're objective. A spot-check of five references tells you more than any "AI probability."

**Talk to them.** A ten-minute conversation about the argument confirms authorship better than any software.

### Where WriteOrbit fits

I built WriteOrbit with this workflow in mind:

- **Citations come from scholarly databases** (250M+ works), never from the AI's memory, and every one opens the source.
- **The authorship report** records writing time and typed, pasted and AI-accepted text. The student decides when to share the link, and the supervisor opens it without an account.
- **The AI writing pattern checker** helps students find stock AI phrasing in their own drafts. It's an editing aid, deliberately not a detector.
- **Your documents are not used to train AI.**

There's a full page on how WriteOrbit handles AI use at writeorbit.app/ai-use.

*Supervisors: what would make you trust a student's AI disclosure? Students: what makes the rules confusing? Both views welcome below.*

#AcademicIntegrity #AIinEducation #HigherEducation #AIPolicy #Students

**Cover image prompt (1920×1080):** A balanced composition of two desks facing each other across the frame, one with a student's laptop and notebook, the other with a supervisor's marked manuscript, connected across the middle by a single sheet of paper with three ticked boxes on it in burnt-orange. No people, warm and calm. [STYLE]

---

## 18 · Post · Pattern checker (not a detector)

"Delve." "Tapestry." "In today's fast-paced world." "It's important to note that…"

You know the phrases. So do your readers, and once they spot one, they stop trusting the rest.

I built a free **AI writing pattern checker**. Paste your text and it highlights:
→ Stock words and phrases
→ Filler and throat-clearing
→ Formulaic sentence patterns
→ Overused punctuation habits

To be clear: **it is not an AI detector.** It doesn't give a score or a verdict. It shows you the habits that make writing sound generic, so you can fix them in your own voice.

Run this post through it. I dare you.

#Writing #Editing #AIWriting #ContentWriting

**First comment:** https://writeorbit.app/tools/ai-writing-checker

**Image prompt:** A paragraph of abstract navy text lines on cream paper where four short word-shaped blocks are highlighted with a translucent burnt-orange marker, like a highlighter pen pass. A highlighter lies at the bottom edge. [STYLE]

---

## 19 · Post · Thesis to journal article

You finished the thesis. Congratulations.

Now the hard part nobody warns you about: turning an 80-page chapter into an 8,000-word journal article.

It's not just cutting. The structure is different, the audience is different, and the "why this matters" has to land in two paragraphs, not twenty pages.

WriteOrbit's **thesis-to-manuscript** tool takes a chapter and gives you:
→ A tighter IMRaD structure
→ A target word count per section
→ A clear list: what to cut, what to keep, what to add

Then you write it, in the same editor, with your citations intact.

Full guide coming next week. How many chapters are sitting unpublished on your hard drive?

#PhD #AcademicPublishing #EarlyCareerResearcher #Thesis

**Image prompt:** A thick bound thesis on the left and a slim, neat journal offprint on the right. Between them a pair of burnt-orange editor's scissors and a few trimmed paper strips lie in a tidy pile. [STYLE]

---

## 20 · Post · Grant proposal writer

Grant writing is a strange genre: part research, part sales, all deadline.

The structure is fairly standard (summary, aims, significance, approach, outcomes, timeline), so a first draft shouldn't take a week.

WriteOrbit's grant proposal writer drafts that structure from your idea, and the **significance section comes with real citations**, because that's the part reviewers check first.

Then you open it in the editor and rewrite it to your funder's rules and your own voice.

Not a substitute for knowing your funder. A way to get past the blank page in an afternoon.

Researchers who write grants: which section always takes you longest?

#GrantWriting #ResearchFunding #Academia #Proposals

**Image prompt:** An architectural-style blueprint drawn on cream paper rather than blue, showing a proposal as building blocks stacked in tiers (foundation, columns, roof), each block blank. The keystone block is outlined in burnt-orange. [STYLE]

---

# WEEK 5

## 21 · ARTICLE · From thesis chapter to journal article

**Headline:** From Thesis Chapter to Journal Article: A Practical Conversion Guide
**Subtitle:** Your thesis is full of papers. Here's how to get them out.

Many theses never become publications, and the research is rarely the reason. The work is done. What stops people is that turning a chapter into an article is a different writing task, and nobody teaches it.

Here's how to approach it.

### 1. Change who you're writing for

A thesis is written for examiners. It shows you know the whole field and did everything right. An article is written for busy peers. It shows one finding matters, as quickly as possible. Nearly every change follows from this.

### 2. Find the one contribution

A chapter often makes three or four points. An article makes one, maybe two. Write it in a sentence: "We show that X, which matters because Y." If you can't, you may have two articles, not one.

### 3. Rebuild in IMRaD

Most journals expect Introduction, Methods, Results, Discussion. A rough budget for an 8,000-word article:

- **Introduction (~1,000):** the problem, the gap, your contribution. Not a literature review.
- **Methods (~1,500):** enough to reproduce, no more. Move detail to supplementary material.
- **Results (~2,500):** the findings that support your one contribution. Leave the others for article two.
- **Discussion (~2,000):** what it means, how it fits the literature, limitations, implications.

### 4. Cut on purpose

Things to cut from a thesis chapter almost every time:
- The long literature review. Keep the 15–25 references that set up *this* gap.
- Explaining why you chose each method over every alternative.
- Results that don't serve the main contribution.
- Signposting written for examiners ("In this chapter, I will first…").

### 5. Add what the thesis didn't need

- A sharper "why this matters" in the first two paragraphs.
- A comparison with work published *since* you wrote the chapter.
- Implications for practice or policy, which journals increasingly want.

### 6. Choose the journal before you finish

Journal scope, word limits and reference style should shape the draft, not come at the end. Read three recent articles from your target journal and copy their structure.

### 7. Get a hostile read before submitting

Ask a colleague, or a tool, to review it as a referee would. Fix the major comments before a real reviewer finds them.

### How WriteOrbit helps

The **thesis-to-manuscript** tool takes your chapter and proposes a tighter IMRaD structure, a target word count per section, and a list of what to cut, keep and add. You then write the article in the editor with your citations intact. Change the reference style to your journal's (10,000+ available) in one click, run **AI peer review** for referee-style comments, and export Word or LaTeX for submission.

Start free at writeorbit.app.

*If you've published from your thesis: what was the hardest part to cut? Advice welcome below for those still stuck.*

#AcademicPublishing #PhD #EarlyCareerResearcher #Thesis #ResearchWriting

**Cover image prompt (1920×1080):** A wide shot of a thick thesis volume open on the left whose pages turn into loose sheets that fly in a gentle arc to the right and stack into a slim, neat article. The arc is traced with a dashed burnt-orange line. [STYLE]

---

## 22 · Post · For labs and writing groups

Academic writing is rarely solo, but the tools usually assume it is.

Five co-authors. One Word file called `manuscript_FINAL_v7_JS_edits_REAL.docx`. You know how this goes.

WriteOrbit is built for the way labs actually write:
→ Real-time editing in the same document
→ Comments and suggestions (tracked changes)
→ Version history
→ Invite as editor, commenter or viewer
→ A shared reference style, so no one's citations look different

There's a **Team plan** for labs, departments and writing groups. If you run one, message me and I'll set you up.

#ResearchLab #Collaboration #Academia #PI

**Image prompt:** A single manuscript page with five small cursors in different muted tones (navy, slate, sand, teal, burnt-orange), each with a tiny blank name flag, positioned at different paragraphs as if several people are editing at once. [STYLE]

---

## 23 · Post · On your phone

Some of my best paragraphs got written on a train.

Most "mobile apps" for writing are viewers that let you fix a typo. WriteOrbit on your phone is **the full editor**:

→ Write and edit
→ Cite with @
→ Search papers
→ Chat with your PDFs
→ Everything syncs with your laptop

It runs in the browser on phones, tablets and computers. Nothing to install.

Waiting rooms, commutes, the 20 minutes before a supervision meeting: you can write in them now.

#Productivity #AcademicWriting #PhDLife #MobileFirst

**Image prompt:** SCREENSHOT recommended (mobile editor). AI alternative: a smartphone lying on an open paper notebook, its screen showing abstract navy lines of text with one burnt-orange citation marker, the notebook's ruled lines visibly continuing the screen's lines as if it's one document. [STYLE]

---

## 24 · Post · Privacy

A question I get a lot: "Will my thesis be used to train AI?"

No.

WriteOrbit doesn't train AI on your documents. Your drafts stay private to you and the people you choose to share them with.

This matters more in academia than most places:
→ Unpublished findings are your competitive edge
→ Grant ideas are intellectual property
→ Student work deserves privacy
→ Some data has ethics-board conditions attached

If a free writing tool can't tell you clearly what happens to your text, assume the worst.

What's your rule for which writing tools you'll trust with unpublished work?

#Privacy #ResearchData #AcademicWriting #DataProtection

**Image prompt:** A manuscript tucked into a clean paper envelope sealed with a plain burnt-orange wax seal, resting on a cream desk with soft shadow. Quiet, secure, no padlock clichés. [STYLE]

---

## 25 · ARTICLE · Choosing a reference workflow in 2026

**Headline:** Zotero, Mendeley, or Something New? Choosing a Reference Workflow in 2026
**Subtitle:** A reference manager stores papers. A good workflow gets them into your writing correctly.

For years, the reference-management question was "Zotero or Mendeley?" It still matters, but it's now one part of a bigger question: how do sources get from the database into your sentences, correctly cited and actually supporting what you say?

Here's a fair look at the options.

### Zotero

**Strengths:** free and open source, a browser connector that captures almost anything, a huge library of citation styles, strong group libraries and a large plugin community. It's respected for good reason.

**Trade-offs:** the word-processor plugin works well but can be fiddly with complex documents. Storage beyond the free tier costs extra. AI features depend on third-party plugins.

### Mendeley

**Strengths:** a clean reader, good PDF annotation, and familiar to many in the sciences.

**Trade-offs:** owned by Elsevier, which matters to some researchers. Over the years some features have been retired or changed, so check what's currently supported before you commit.

*(I've written a longer side-by-side at writeorbit.app/blog/zotero-vs-mendeley.)*

### The gap both leave

Traditional reference managers are excellent at **storing** references and **formatting** them. They weren't designed for the steps in between:

- Finding the right paper *while* you write a sentence
- Checking that the paper actually supports that sentence
- Asking questions across a folder of PDFs
- Catching retracted papers and wrong DOIs before submission

That's where most citation errors happen, and where AI now helps or hurts depending on how it's used.

### What to look for in a 2026 workflow

1. **Import without lock-in.** BibTeX and RIS in and out, so your library can always move.
2. **Citations from real records.** Not generated text, ever.
3. **Search inside the editor.** Fewer tabs means fewer errors.
4. **Evidence with page numbers.** When AI summarises a paper, you should see the passage.
5. **Pre-submission checks.** Retractions, preprints, DOIs, unsupported claims.
6. **Your target format.** Word templates, LaTeX for Overleaf, 10,000+ styles.

### Where WriteOrbit fits

WriteOrbit isn't trying to replace your reference manager. It's the writing environment around it. Import your Zotero or Mendeley library (or BibTeX/RIS), then @-cite while you write, search 250M+ works, chat with your PDFs with page numbers, check claims and sources before you submit, and export Word, PDF or LaTeX.

Many people keep Zotero for collecting and use WriteOrbit for writing. That's a perfectly good setup.

Free to start at writeorbit.app.

*What's your current setup, and what's the most annoying part of it?*

#Zotero #Mendeley #ReferenceManagement #PhD #ResearchTools

**Cover image prompt (1920×1080):** A long wooden library card catalogue on the left, its drawers slightly open, with a gentle stream of index cards flowing right into an open manuscript where they become neatly placed footnotes. Warm, nostalgic but modern, burnt-orange used only on the footnote markers. [STYLE]

---

# WEEK 6

## 26 · Post · Quick data analysis

Need a quick t-test for a report and don't want to open SPSS?

WriteOrbit has a free **quick data analysis** tool:

Upload a CSV → get:
→ Descriptive statistics
→ Correlations
→ t-tests
→ Chi-square tests

**Results are written up in APA style**, ready to paste into your results section.

And it's calculated **in your browser**. Your data isn't uploaded.

Not a replacement for R or a proper stats package on a big study. Very handy for a coursework report, a pilot, or a sanity check.

#Statistics #DataAnalysis #APA #ResearchMethods #Students

**First comment:** https://writeorbit.app/tools/data-analysis

**Image prompt:** A small CSV-style grid of numbers (abstract dots, not real digits) on the left flowing into a neat bell curve and a minimal bar chart drawn in navy ink on the right, with a single burnt-orange line marking a mean. [STYLE]

---

## 27 · Post · Developer API

For edtech builders, research-tool developers and anyone building with AI:

WriteOrbit has a **developer API**: one key for:

→ Scholarly paper search and lookup
→ Full text and PDFs (where a copy is available, with source and licence)
→ Research tools over **MCP** or JSON
→ Reference checks: validate DOIs and PubMed IDs before they go in a reference list
→ OpenAI-compatible chat completions
→ Structured AI peer review of a manuscript
→ Word, LaTeX and PDF conversion

Pay only for what you use. Paper search, full text, research tools and reference checks come with daily free credits.

If you're building an AI agent that cites sources, the reference-check endpoint alone will save you a lot of embarrassment.

#API #MCP #EdTech #AIAgents #DeveloperTools

**First comment:** https://writeorbit.app/developers

**Image prompt:** A clean isometric illustration of a single key on cream paper, its teeth shaped like small blocks, with seven thin navy lines branching out from the key's bow to seven small icons (magnifier, document, wrench, shield-tick, speech bubble, open book, file). One line is burnt-orange. [STYLE]

---

## 28 · Post · PDF tools, nothing uploaded

Every academic has dropped a PDF into a random "free PDF merger" site and quietly wondered where it went.

WriteOrbit's free PDF tools let you:
→ Merge
→ Split
→ Extract pages
→ Rotate

**Nothing is uploaded.** It all runs in your browser.

Signed consent forms, reviewer reports, unpublished manuscripts: they stay on your machine.

Bookmark it. You'll need it the night before a deadline.

#PDF #Privacy #Productivity #Academia

**First comment:** https://writeorbit.app/tools/pdf-tools

**Image prompt:** Several PDF pages being neatly merged into one stack inside the outline of a browser window drawn in thin navy lines, with the stack staying firmly inside the frame. A small burnt-orange dotted boundary emphasises that nothing leaves the window. [STYLE]

---

## 29 · ARTICLE · Fact-checking in the age of AI

**Headline:** Fact-Checking in the Age of AI: A Workflow for Journalists, Analysts and Report Writers
**Subtitle:** AI makes it easier to write confidently. That makes checking more important, not less.

AI tools now help draft news copy, briefings, policy papers and white papers. They're fast and fluent, and sometimes confidently wrong. A misattributed quote, a statistic with no source, a study that says something slightly different from your summary. Each one damages trust.

Here's a fact-checking workflow suited to how people write today.

### 1. Mark every checkable claim

Before checking anything, go through the draft and mark each claim that could be true or false: numbers, dates, names, quotes, causal statements, superlatives ("the largest", "the first"). That's your checklist.

### 2. Sort claims by risk

Not every claim needs the same scrutiny. Prioritise:
- Anything that could harm someone's reputation
- Numbers in headlines and opening paragraphs
- Causal claims ("X led to Y")
- Anything you remember but haven't sourced

### 3. Go to the primary source

A news article citing a study is not the study. A press release about a report is not the report. Trace each claim back to the original and read the actual passage. Note where you found it.

### 4. Watch for overstatement

The most common error isn't a made-up fact. It's a real finding stretched too far: "may be associated with" becomes "causes"; "in one region" becomes "nationwide." Compare your wording with the source's wording.

### 5. Treat AI output as an unverified tip

If an AI tool supplied a fact, quote or citation, treat it as a lead to check, never as a source. AI tools can invent citations and quotes that look entirely plausible.

### 6. Check the source's status

Is the study peer-reviewed or a preprint? Has it been retracted or corrected? Is the DOI right? These are quick to check and embarrassing to miss.

### 7. Record your sourcing

Keep notes linking each claim to its source. When an editor, client or reader asks "where's this from?", you can answer in seconds.

### Tools that help

I built WriteOrbit for writing with sources. For fact-checking it helps in three ways:

- **Claim check** reads your draft and flags claims that are unsupported or overstated, and shows where a citation is needed.
- **Source quality** flags retracted papers, preprints and wrong DOIs.
- **Chat with PDF** lets you ask a long report a question, and the answer quotes the passage with its page number, so you check the original, not a summary.

There's also a **neutral-tone check** for copy that needs to read as objective, and real-time comments so a desk or review team can work in the same document.

More on this at writeorbit.app/blog/ai-fact-checker. Free to start.

*Journalists and analysts: what's your fastest fact-checking habit? Let's build a list in the comments.*

#FactChecking #Journalism #Misinformation #PolicyAnalysis #AI

**Cover image prompt (1920×1080):** A newsroom-style desk from above: a printed article with several phrases circled and numbered in burnt-orange pen, each number linked by a thin line to a source document laid out around it: a report, a journal page, a printed dataset. Orderly, investigative but calm. [STYLE]

---

## 30 · Post · Founder note

Six weeks ago I started posting about WriteOrbit here. Thank you to everyone who tried it, broke it and told me.

A quick recap of what it is:

**An AI editor for academic writing where every claim has a real source.**

→ Autocomplete that cites real papers
→ @-cite from 250M+ works, in 10,000+ styles
→ Chat with your PDFs, with page numbers
→ A review matrix for literature reviews
→ Claim checks, AI peer review, retraction and DOI checks
→ An authorship report that shows how you wrote it
→ Word templates in. Word, PDF or LaTeX out.

**Pricing:**
Free: the full editor, citation generator and a daily AI allowance. No card.
Plus: $12/month, for students writing every week.
Pro: $29/month, unlimited, for theses and papers.
Team: for labs and departments. Message me.

What should I build next? The most-requested feature in the comments goes to the top of the list.

#AcademicWriting #BuildInPublic #EdTech #PhD #Startup

**First comment:** https://writeorbit.app/pricing

**Image prompt:** A simple, warm desk still life: a closed notebook with a burnt-orange ribbon bookmark, a fountain pen, a coffee cup and a single finished manuscript with a small orange tick at the top, morning light. Feels like a calm "done" moment. [STYLE]

---

## Image prompt quick tips

- **Midjourney:** paste the prompt + style block, then add `--ar 4:5 --style raw --v 7` (feed) or `--ar 16:9` (article cover).
- **ChatGPT / DALL·E or Gemini:** paste as is, and add "no text, no letters, no logos."
- **Consistency:** generate the first 3 images, keep the one you like best, and use it as a style or image reference for the rest.
- **Carousels** (optional: 9, 13, 17, 21 and 25 work well as PDF carousels): one point per slide in Source Serif on #FFFDF9, navy text, one orange accent per slide.
