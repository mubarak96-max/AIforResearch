# E-E-A-T test kit: what to test, screenshot and check

This is the hands-on work that proves a real person used the tools the blog writes about.
Do the parts in order. Each part says which articles it improves.

When you finish a part, send Claude the results (numbers, notes, screenshot files) and it will
write them into the articles.

---

## Part 1. Fact-checker test (biggest win)

**Improves:** 04 AI fact checker, 01 Best AI writing assistant, 02 Free AI writing assistant, 05 How to fact-check AI

### What to do

1. Copy the test draft below exactly.
2. Paste it into each tool on the list. Use a free or normal plan, default settings.
3. For each tool, take **one screenshot** of its results.
4. Use the answer key to count:
   - **Errors caught:** how many of the 6 planted errors the tool flagged.
   - **False alarms:** how many of the 6 true claims the tool wrongly flagged as false.
5. Write the results in the table at the end of this part.

Run AI chatbots (ChatGPT, Claude) twice in new chats, and record the **lower** score.
For ChatGPT and Claude, use this prompt: *"Fact-check every claim in this text. For each claim, say
whether it is true, false or unverifiable, and give a source."*

### Tools to test

| Tool | Where |
| --- | --- |
| AI for Research (AI review, claim check) | your app |
| Originality.ai Fact Checker | originality.ai |
| Facticity.AI | facticity.ai |
| Perplexity | perplexity.ai |
| ChatGPT | chatgpt.com |
| Claude | claude.ai |
| Google Fact Check Explorer | toolbox.google.com/factcheck/explorer (paste claims one at a time; expect it to find few) |

### Test draft (copy everything in the box)

```text
A short guide to our place in space

Space exploration has changed what we know about Earth and its neighbours. Water covers about 71% of Earth's surface, and the highest point on land, Mount Everest, stands 8,849 metres above sea level. Sunlight takes a little over eight minutes to reach us.

Our nearest neighbour, the Moon, orbits about 38,000 kilometres from Earth. Neil Armstrong became the first person to walk on it in July 1971. Contrary to what many people think, the Great Wall of China is easy to see from the Moon with the naked eye.

Mars, the next planet out, has three small moons. The Hubble Space Telescope, launched in 1990, has photographed all of them. Its successor, the James Webb Space Telescope, launched in December 2021 and observes mainly in infrared light.

Scientists now believe the public underrates these missions. A 2021 study in Nature by Patel and Okonkwo found that 64% of adults could not name a single active space telescope. As Albert Einstein put it, "Two things are infinite: the universe and human stupidity; and I'm not sure about the universe."

Voyager 1, launched in 1977, is now the most distant human-made object.
```

### Answer key (do not paste this)

**The 6 planted errors (a good tool should flag these):**

| # | Claim in the draft | The truth |
| --- | --- | --- |
| E1 | The Moon is about 38,000 km from Earth | About 384,400 km on average (10 times more) |
| E2 | Armstrong walked on the Moon in July 1971 | July 1969 (Apollo 11) |
| E3 | The Great Wall is easy to see from the Moon | A myth; it can't be seen from the Moon with the naked eye |
| E4 | Mars has three moons | Two: Phobos and Deimos |
| E5 | "2021 study in Nature by Patel and Okonkwo… 64%" | Invented. The study doesn't exist. A good tool says "no source found" |
| E6 | The Einstein quote | No evidence Einstein said it; it is a well-known misattribution |

Bonus check: "Hubble has photographed all of them" leans on the wrong moon count. Note it if a tool spots it, but don't score it.

**The 6 true claims (a tool should not flag these):**

| # | Claim | Why it's true |
| --- | --- | --- |
| T1 | Water covers about 71% of Earth's surface | Standard figure (USGS, NOAA) |
| T2 | Everest is 8,849 m | Official 2020 China–Nepal survey: 8,848.86 m |
| T3 | Sunlight takes a little over 8 minutes | About 8 minutes 20 seconds on average |
| T4 | Hubble launched in 1990 | April 1990 |
| T5 | JWST launched December 2021, observes mainly in infrared | 25 December 2021; it's an infrared telescope |
| T6 | Voyager 1 launched 1977, most distant human-made object | Launched September 1977; still the most distant |

### Results table (fill in)

| Tool | Plan | Date tested | Errors caught (of 6) | Which missed (E#) | False alarms (of 6) | Price on test date | Screenshot file |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AI for Research | | | | | | | |
| Originality.ai | | | | | | | |
| Facticity.AI | | | | | | | |
| Perplexity | | | | | | | |
| ChatGPT | | | | | | | |
| Claude | | | | | | | |
| Google Fact Check Explorer | | | | | | | |

Write down honestly where AI for Research misses something. That line builds more trust than a perfect score.

---

## Part 2. AP style checker test (already written, just run it)

**Improves:** 09 AP style checker

The test paragraph, the answer key with 20 errors and 9 traps, the scoring rules and an empty results table are
all in `content/blog/09-ap-style-checker.md`. Readers can't see the table yet: it's hidden in a comment under
"### Results" until you fill it in.

1. Open the article and follow "The test" and "Scoring" sections.
2. Test the tools named in the hidden table. If you don't have PerfectIt, AP StyleGuard or Tansa,
   skip them and say "not tested" (free trials are usually enough).
3. Screenshot each tool's result.
4. Send Claude the filled-in table. Claude will publish it and put "(2026 Test)" back in the title.

---

## Part 3. Citation generator test

**Improves:** 24 AI citation generator, 29 Zotero alternatives, 28 Zotero vs Mendeley

1. Pick **5 real sources** you can open, one of each type:
   - a journal article with a DOI
   - a book
   - a web page
   - a report PDF from a government or organization
   - a news article
2. Write the correct **APA 7** citation for each, using the APA Style website (apastyle.apa.org) as the reference.
   This is your answer key.
3. Create each citation in: AI for Research, Scribbr, ZoteroBib, MyBib and QuillBot's citation generator.
4. For each tool and source, mark it: **correct**, **small error** (punctuation, italics, capitals), or **wrong**
   (missing author, wrong year, wrong title, or made-up details).
5. Screenshot one result per tool.

| Tool | Correct (of 5) | Small errors | Wrong | Notes |
| --- | --- | --- | --- | --- |
| AI for Research | | | | |
| Scribbr | | | | |
| ZoteroBib | | | | |
| MyBib | | | | |
| QuillBot | | | | |

---

## Part 4. Chat-with-PDF test

**Improves:** 30 Chat with PDF, 25 AI literature review tools, 03 AI tools for journalists

1. Pick one **public PDF of 50+ pages** that you're allowed to upload, for example a government budget or annual report.
2. Read it and write **5 questions whose answers you know**, with the page number of each. Include:
   - one number from a table
   - one fact from a footnote
   - one question the PDF does **not** answer (a good tool should say so)
3. Ask the same 5 questions in: AI for Research (Library, Ask), ChatPDF, Adobe Acrobat AI Assistant (if you have it),
   SciSpace and Gemini Notebook.
4. For each answer, mark **right answer**, **right page**, and for the trick question, **admitted it didn't know**.
5. Screenshot one answer per tool, showing the page reference.

| Tool | Right answers (of 4) | Right pages (of 4) | Said "not in the PDF" for Q5? | Notes |
| --- | --- | --- | --- | --- |
| AI for Research | | | | |
| ChatPDF | | | | |
| Acrobat AI Assistant | | | | |
| SciSpace | | | | |
| Gemini Notebook | | | | |

---

## Part 5. Product screenshots (one session in your own app)

**Improves:** almost every article. The articles mark where each screenshot goes with a `<!-- SCREENSHOT: … -->` comment.

Many articles need the same kind of shot, so you can take them in one sitting. Use **fictional** documents only,
never real user data. Save each file as `public/blog/<article-number>-<short-name>.png`, for example
`public/blog/04-claim-check.png`.

| Feature to show | Articles | What the screenshot needs |
| --- | --- | --- |
| Autocomplete with inline citations | 01, 26 | A grey suggestion with citations; for 01 the citation popover open |
| Claim check / AI review comments | 04, 06, 12, 14, 21, 22, 24, 25, 27 | Review comments in the margin; see each article's comment for the exact wording |
| Library Ask with a page-number answer | 03, 05, 13, 15, 16, 18, 20, 23, 25, 30 | A PDF open, the question asked, an answer with a clickable page number |
| Citation style dropdown | 02, 10 | The style picker open (02: APA 7 and a "Chicago" search; 10: switching Chicago styles) |
| AI chat panel with AP style help | 07, 09, 11 | Chat beside a news draft |
| Tracked changes / suggestions | 07, 19, 27 | A collaborator's suggestion visible |
| @ citation menu | 24, 29 | "Your Library" and "Papers" groups visible |
| Zotero / Mendeley import | 28 | Import options and an imported collection |
| Series bible with comments | 17 | Character section, a citation and a margin comment |

To see the exact description for every screenshot, run this from `content/blog/`:

```
grep -n "<!-- SCREENSHOT" *.md
```

---

## Part 6. Facts still marked VERIFY

These are facts the writer couldn't confirm, mostly competitor prices. Each one is hidden from readers as a comment,
but the sentence next to it **is** visible, so a wrong price is a live trust problem.

| Articles | Count |
| --- | --- |
| 28 Zotero vs Mendeley | 8 |
| 09 AP style checker, 29 Zotero alternatives | 5 each |
| 01, 17 | 4 each |
| 03, 15, 18, 24, 25, 30 | 3 each |
| 02, 04, 12, 22 | 2 each |
| 06, 07, 10, 11, 19, 20, 21, 27 | 1 each |

(The self-hosting claims in 02, 17, 29 and 30 were removed on 11 November 2026: AI for Research is SaaS only.)

To list them all, run this from `content/blog/`:

```
grep -n "<!-- VERIFY" *.md
```

Check each fact on the official website, then either tell Claude the correct value or fix it yourself and delete the comment.

---

## What to send back

For each part you finish:

- the filled-in table
- the screenshot files (or say where you saved them)
- the date you tested
- one or two sentences on anything that surprised you. First-hand notes like "Perplexity found the Moon
  distance error but cited a blog, not NASA" are exactly the kind of experience Google looks for.
