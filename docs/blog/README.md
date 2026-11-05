# ResearchCove blog: articles for writers

The 30 articles from [the content plan](../content-plan-writers.md), written 6 November 2026. Each file has YAML
frontmatter (title, slug, description, keywords, cluster, pillar, author, dates, `faq` for `FAQPage` schema) and links to
other articles as `/blog/<slug>`.

## Before publishing

Search each file for HTML comments and resolve them:

- `<!-- VERIFY: … -->`: a fact that could not be confirmed (usually a competitor price, or whether self-hosting is
  offered publicly). Check it, fix the text, delete the comment.
- `<!-- TO RUN: … -->`: a test whose method and materials are in the article but whose results must be filled in by a
  person (articles 9 and 21).
- `<!-- SCREENSHOT: … -->`: what to capture from the product.

Also replace `[AUTHOR NAME]` in every file.

```
grep -n "<!-- \(VERIFY\|TO RUN\|SCREENSHOT\)" *.md
```

## Articles

| # | Cluster | Article |
| --- | --- | --- |
| 1 | A (pillar) | [Best AI writing assistant](01-best-ai-writing-assistant.md) |
| 2 | A | [Free AI writing assistant](02-free-ai-writing-assistant.md) |
| 3 | A | [AI tools for journalists](03-ai-tools-for-journalists.md) |
| 4 | B (pillar) | [AI fact checker](04-ai-fact-checker.md) |
| 5 | B | [How to fact-check AI](05-how-to-fact-check-ai.md) |
| 6 | B | [How to fact-check an article](06-how-to-fact-check-an-article.md) |
| 7 | C (pillar) | [AP style guide](07-ap-style-guide.md) |
| 8 | C | [AP style numbers, dates and times](08-ap-style-numbers-dates-times.md) |
| 9 | C | [AP style checker](09-ap-style-checker.md) |
| 10 | C | [AP vs. Chicago style](10-ap-vs-chicago-style.md) |
| 11 | C | [How to write a headline](11-how-to-write-a-headline.md) |
| 12 | C | [Inverted pyramid](12-inverted-pyramid.md) |
| 13 | C | [How to write a news article](13-how-to-write-a-news-article.md) |
| 14 | C | [How to write a press release](14-how-to-write-a-press-release.md) |
| 15 | D (pillar) | [Interview transcription](15-interview-transcription.md) |
| 16 | D | [From transcript to story](16-transcript-to-story.md) |
| 17 | E (pillar) | [Screenwriting software](17-screenwriting-software.md) |
| 18 | E | [Final Draft alternatives](18-final-draft-alternatives.md) |
| 19 | E | [Screenplay format](19-screenplay-format.md) |
| 20 | E | [Script coverage](20-script-coverage.md) |
| 21 | E | [AI script coverage](21-ai-script-coverage.md) |
| 22 | E | [AI screenplay writer](22-ai-screenplay-writer.md) |
| 23 | E | [How to research a screenplay](23-how-to-research-a-screenplay.md) |
| 24 | F (pillar) | [AI citation generator](24-ai-citation-generator.md) |
| 25 | F | [AI literature review tools](25-ai-literature-review-tools.md) |
| 26 | F | [How to write a research report](26-how-to-write-a-research-report.md) |
| 27 | F | [How to write a white paper](27-how-to-write-a-white-paper.md) |
| 28 | F | [Zotero vs. Mendeley](28-zotero-vs-mendeley.md) |
| 29 | F | [Zotero alternatives](29-zotero-alternatives.md) |
| 30 | F | [Chat with PDF](30-chat-with-pdf.md) |
