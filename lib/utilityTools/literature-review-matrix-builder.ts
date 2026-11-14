import type { Tool } from '../tools';

const guide = `A literature review matrix, also called a synthesis matrix, is a table with one row per source and one column per question you ask of every source: its aim, design, sample, findings, limitations and themes. Filling it in makes you read each paper the same way. Reading down the columns then shows where studies agree, where they differ and what nobody has studied, which is the raw material of synthesis [1][2]. The builder above gives you an editable matrix in the browser, fills the citation from a DOI or title, and exports it as CSV or a table.

## What is a literature review matrix?

**It is a grid that puts the same questions to every source, so you can compare sources instead of summarizing them one at a time.** Garrard's Matrix Method made it a standard step in health sciences reviews [1], and Webster and Watson describe a concept matrix (concepts across, articles down) for information systems reviews [2]. The idea works in any field.

A summary describes one paper. Synthesis says what several papers show together: "three of the four surveys found X, but the only trial found Y". The matrix is the step in between.

## Which columns should a literature review matrix have?

**Start with the default columns, then add the ones your question needs.** The defaults cover what most reviews compare.

| Column | What to write | Example (illustrative) |
| --- | --- | --- |
| Citation | Author, year, title, journal, DOI | Study A (2021). Peer mentoring for new teachers. |
| Aim | The study's question, in one line | Does peer mentoring reduce first-year teacher burnout? |
| Design | Method and design | Cluster randomized trial |
| Sample/setting | Who, how many, where | 42 schools, 310 teachers, urban districts |
| Key findings | The main result, with numbers | Burnout scores lower at 12 months; no change in retention |
| Limitations | What weakens the result | Self-reported burnout; high attrition |
| Theme(s) | Your labels, separated by ; | Mentoring; Retention |

Add columns such as *Theory used*, *Country*, *Measure* or *Funding* when they matter to your question. Rename or remove any column from its header; the builder saves your changes in this browser.

## How do you fill in a review matrix?

**Read each source with the columns in front of you, write short notes in your own words, and add a page number next to anything you may quote.**

1. **Add the source.** Paste a DOI or title and choose the match. The builder fills the citation (authors, year, title, journal and DOI), and fills Authors, Year or Title columns too if you add them.
2. **Fill one row at a time.** Keep each cell short: a phrase or a number, not a paragraph.
3. **Tag themes as you go.** Write one or more labels in Theme(s), separated by semicolons. Reuse the same words so rows group together.
4. **Leave gaps visible.** If a paper does not report its sample size, write "not reported". Missing information is a finding.

## Worked examples across fields (illustrative)

These rows are invented to show the format; "Study A" and so on are not real papers.

### Education: teacher burnout

| Citation | Design | Key findings | Theme(s) |
| --- | --- | --- | --- |
| Study A (2021) | Cluster randomized trial | Lower burnout at 12 months | Mentoring; Wellbeing |
| Study B (2019) | Survey, 1,200 teachers | Workload predicted burnout more than pay | Workload |
| Study C (2022) | Interviews, 24 teachers | Mentors helped most with behavior management | Mentoring |

Reading down *Theme(s)*: two studies on mentoring, one on workload. Grouping by theme puts Study A and Study C side by side, a trial and an interview study that point the same way.

### Engineering: sensors for bridge monitoring

| Citation | Sample/setting | Key findings | Limitations |
| --- | --- | --- | --- |
| Study D (2020) | 3 steel bridges, 18 months | Fiber-optic sensors detected strain changes early | One climate zone |
| Study E (2023) | Lab tests on 40 beams | Wireless sensors drifted after 6 months | Lab only |

Reading down *Limitations* shows a gap: no field study compares the two sensor types in the same bridges.

### Business: remote work and productivity

A matrix with an added *Measure* column showed that studies measuring output found small gains, while studies using self-reports found larger ones. That contrast is a synthesis point no single paper makes.

## How do you go from a matrix to written synthesis?

**Write one paragraph per theme, not one per paper, and use the columns to say how the studies compare.**

1. Group the matrix by theme (tick **Group by theme**).
2. For each theme, read down Design, Sample and Key findings. Where do the studies agree? Where do they differ, and does design or setting explain it?
3. Write a topic sentence that states the pattern, then cite the studies that support it, then the exceptions.
4. Use the Limitations column to say how strong the evidence is.

From the education rows above: *Mentoring was linked to lower burnout in both a trial (Study A, 2021) and an interview study (Study C, 2022), though neither followed teachers past the first year.*

For structured approaches to synthesis, such as narrative synthesis, see Popay et al. [4] and Snyder's overview of review methods [3]. For the full writing process, read [how to write a literature review](/blog/how-to-write-a-literature-review).

## What is a synthesis matrix for an essay?

**For a synthesis essay, rows are sources and columns are the ideas your essay discusses; each cell says what that source says about that idea.** Choose the *Synthesis essay (sources × ideas)* template. It has columns for the main claim, three ideas you rename to your own, a quote and page, how you will use the source, and themes. Reading down an idea column tells you which sources agree, which disagree and where you need another source. The [synthesis essay guide](/blog/synthesis-essay) shows how to turn the grid into paragraphs.

## Common mistakes

- **Writing summaries in the cells.** Long cells are hard to compare. Write phrases, numbers and labels.
- **Different words for the same theme.** "Mentoring", "mentorship" and "peer support" will not group together. Settle on one label.
- **Only one kind of column.** Findings alone hide why studies differ. Keep Design, Sample and Limitations.
- **Copying the abstract.** The abstract is the authors' summary. Fill the cells from the methods and results.
- **No page numbers.** Note the page next to anything you may quote, or you will hunt for it later.
- **Keeping the only copy in a browser.** The matrix is saved in this browser only. Download the CSV regularly.

## How to build your matrix with AI for Research

The builder is free, runs in your browser and needs no account. DOI and title lookup uses the same index as the [citation generator](/tools/citation-generator). Export the matrix as CSV for a spreadsheet, or copy it as a Markdown or HTML table to paste into a document.

When you are signed in, the next step is the [evidence matrix](/features/literature-review): add PDFs from your [research library](/features/research-library), choose your columns, and AI for Research fills each cell from the paper, with the quote and page behind every answer so you can check it. Citations, search and the free tools cost nothing; signed-in AI features use credits, and the Free plan has 45 credits a month. To draft a review from real papers, try the [literature review generator](/tools/literature-review-generator).

## Next steps

- [How to write a literature review](/blog/how-to-write-a-literature-review)
- [How to organize research papers](/blog/how-to-organize-research-papers)
- [Boolean search string builder](/tools/boolean-search-string-builder): find the papers to put in the matrix
- [Evidence matrix in the app](/features/literature-review)

## Sources

1. Garrard, J. *Health Sciences Literature Review Made Easy: The Matrix Method*. Jones & Bartlett Learning. <!-- VERIFY: cite the current edition and year (6th edition, 2020, at last check) -->
2. Webster, J., & Watson, R. T. (2002). Analyzing the past to prepare for the future: writing a literature review. *MIS Quarterly, 26*(2), xiii–xxiii. https://www.jstor.org/stable/4132319
3. Snyder, H. (2019). Literature review as a research methodology: an overview and guidelines. *Journal of Business Research, 104*, 333–339. https://doi.org/10.1016/j.jbusres.2019.07.039
4. Popay, J., Roberts, H., Sowden, A., et al. (2006). *Guidance on the Conduct of Narrative Synthesis in Systematic Reviews*. ESRC Methods Programme. <!-- VERIFY: publisher line and a stable URL or DOI for the Popay et al. narrative synthesis guidance -->
`;

export const literatureReviewMatrixBuilder: Tool = {
  slug: 'literature-review-matrix-builder',
  name: 'Literature review matrix builder',
  category: 'research',
  kind: 'utility',
  seoTitle: 'Literature review matrix template and synthesis matrix maker',
  description: 'Free literature review matrix template you edit in the browser. Look up papers by DOI, tag themes, group sources and export your synthesis matrix as CSV or a table.',
  short: 'An editable synthesis matrix with DOI lookup and CSV export.',
  heading: 'Literature review matrix template',
  intro: 'Compare your sources side by side. Add papers by DOI or title, fill in the aim, design, sample, findings and limitations, tag themes and group by them. Export as CSV, or copy as a Markdown or HTML table.',
  keywords: ['literature review matrix template', 'synthesis matrix', 'literature review matrix', 'review matrix', 'synthesis matrix template', 'literature matrix'],
  steps: [
    { title: 'Choose a template', body: 'The literature review matrix, or the synthesis essay matrix with sources down and ideas across. Rename, add or remove columns.' },
    { title: 'Add your sources', body: 'Paste a DOI or title to fill the citation, or add a row and type. Tag each row with one or more themes.' },
    { title: 'Compare and export', body: 'Filter or group by theme to see patterns. Download CSV, or copy the table into your document.' },
  ],
  limitations: [
    'The matrix is saved in this browser only. Clearing site data or switching device loses it, so download the CSV to keep a copy.',
    'Lookup fills the citation details; you fill the other columns from the papers. Signed in, the evidence matrix can fill them from your PDFs.',
    'Exports include every row, whatever theme filter is showing.',
  ],
  faq: [
    { q: 'What is a literature review matrix?', a: 'A literature review matrix is a table with one row for each source and one column for each thing you compare, such as aim, design, sample, key findings, limitations and themes. Filling it in makes you read every paper the same way, and reading down the columns shows patterns, disagreements and gaps that you then write up as synthesis rather than a list of summaries.' },
    { q: 'What is the difference between a literature review matrix and a synthesis matrix?', a: 'They are often the same thing. "Literature review matrix" usually means a row per study with columns for design, sample and findings. "Synthesis matrix", common in essay writing, often means sources down the side and ideas or themes across the top, with each cell saying what a source says about an idea. The builder has a template for each.' },
    { q: 'What columns should a review matrix have?', a: 'Start with citation, aim, design, sample or setting, key findings, limitations and themes. Then add the columns your question needs, such as theory used, country, measure or funding. Keep cells short, a phrase or a number, so you can compare down a column. Too many columns makes the matrix slow to fill; ten is plenty for most reviews.' },
    { q: 'Is my matrix saved?', a: 'Yes, in this browser, as you type. Nothing is sent to a server except the DOI or title you look up. Browser storage can be cleared, and it does not move between devices, so download the CSV regularly. If you sign in, the evidence matrix in the app keeps your matrix with your project and fills it from your PDFs.' },
    { q: 'Can I open the matrix in Excel or Google Sheets?', a: 'Yes. Download CSV gives a file that Excel, Google Sheets, LibreOffice and Numbers open directly, with one column per matrix column. Cells that start with =, +, - or @ get a leading apostrophe so a spreadsheet does not run them as formulas. To paste into Word or Google Docs as a table, use Copy as HTML table.' },
  ],
  features: ['literature-review', 'research-library', 'paper-search'],
  related: ['boolean-search-string-builder', 'literature-review-generator', 'citation-generator'],
  guide,
  reviewed: '2026-11-14',
};
