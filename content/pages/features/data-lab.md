---
slug: "data-lab"
seo_title: "AI Data Analysis for Research: Statistics in Your Browser"
description: "AI data analysis for research: upload a CSV, run t-tests, ANOVA, chi-square or regression in your browser, then get an APA results section from those numbers."
heading: "Data Lab: AI data analysis for research where the numbers are calculated, not written"
intro: "Upload or paste your data, describe and chart it, run the test that fits and get each result in APA style. The statistics are computed in your browser for free; the AI only writes up the numbers you calculated."
primary_keyword: "ai data analysis for research"
secondary_keywords: ["data analysis for research", "statistical analysis tool", "charts from csv", "apa results section", "statistics for thesis", "statistical test", "ai data analysis"]
hero: "cta"
cta:
  label: "Open Data Lab"
  href: "/data-lab"
plan_note: "Descriptive statistics, charts, tests, the test chooser and sample size are free on every plan. An AI-written results section costs 2 credits; the Free plan has 45 a month."
related: ["/blog/which-statistical-test-to-use", "/blog/t-test-vs-anova-vs-chi-square", "/blog/statistical-power-and-sample-size", "/tools/data-analysis", "/features/methodology-builder"]
updated: "2026-11-12"
faq:
  - q: "Does the AI calculate my statistics?"
    a: "No. Every statistic in Data Lab, from means to p-values, is calculated by code in your browser, so the same data always gives the same numbers. The AI is used only for the optional results section, and it receives the finished numbers. It is instructed to use them exactly as given and never to compute, round or add a number. Check the write-up against your result cards."
  - q: "Is my data uploaded to a server?"
    a: "Your file is read in your browser and the tests run there. Nothing is sent when you describe, chart or test the data. If you save to History, the results and variable summaries are saved, not the data. If you ask for a results section, the results and variable summaries go to the AI, never the raw rows. Remove names and identifiers before you work with personal data anyway."
  - q: "Which statistical tests does Data Lab run?"
    a: "Seven: the independent t-test (Welch), the Mann-Whitney U test, the paired t-test, one-way ANOVA, Pearson correlation, simple linear regression with one predictor, and the chi-square test of independence. It also gives descriptive statistics, four chart types and sample size for t-tests and two proportions. Tests it does not run, such as Kruskal-Wallis or logistic regression, need SPSS, R, jamovi or JASP."
  - q: "Can Data Lab open Excel files?"
    a: "Not directly. Save the sheet as CSV first (File, Save as, CSV) and upload that, or copy the cells and paste them into the box with the header row. Data Lab takes CSV, TSV and text files up to 20 MB and reads the first 50,000 rows. You can switch any column between numeric and categorical after loading."
  - q: "Is Data Lab free for students?"
    a: "Yes. Loading data, descriptive statistics, charts, all seven tests, the 'Which test?' chooser, the sample size calculator, saving to History and CSV exports cost no credits on any plan, including Free. Only the AI-written results section uses credits: 2 per write-up, from the 45 credits a month on the Free plan."
---
Data Lab brings AI data analysis for research into one browser tab. Load a CSV, describe and chart it, run a statistical test and get each result as a table with an APA sentence. The numbers are calculated in your browser; the AI only writes up what you computed. It is for thesis, survey and lab data.

<!-- SCREENSHOT: Data Lab Tests tab with "Independent t-test (Welch)" selected, the Outcome and Group menus, and a result card showing the table, the APA sentence and the small-groups warning -->

## What you can do with it

Data Lab has six tabs: Data, Describe and chart, Tests, Which test?, Sample size and Report.

- **Data:** upload a CSV or TSV file, paste rows from Excel, Google Sheets or SPSS, or press "Use sample data". Each column is read as numeric or categorical, and you can switch it.
- **Describe and chart:** for each numeric variable, n, missing values, mean, SD, median and range; for each categorical variable, counts and percentages. Charts: histogram, bar chart, box plot by group, and scatter plot with a fitted line. Export the descriptives as CSV.
- **Tests:** pick a test and two variables, press Run. Results stack up, can be removed, saved to History or exported as CSV.
- **Which test?:** answer up to five questions and get a recommended test, why, the assumptions to check first, an APA reporting template and the alternative if assumptions fail.
- **Sample size:** for a t-test (two independent groups, paired, or one sample) from Cohen's d, alpha and power, or for two proportions. Or enter the sample you have and see its power.
- **Report:** an AI-written results section from your results (2 credits).

## Exactly which tests it runs

| Test | Variables | What the result shows | Built-in warnings |
| --- | --- | --- | --- |
| Independent t-test (Welch) | Numeric outcome, group with exactly two levels | M, SD and n per group; t, df, two-tailed p; Cohen's d | Groups under 15: check normality |
| Mann-Whitney U | Numeric outcome, two groups | Median and n per group; U, z, p; r effect size | Under 20 cases: the normal approximation is rough |
| Paired t-test | Two numeric measures on the same cases | M and SD of each, mean difference, t, df, p; Cohen's dz | |
| One-way ANOVA | Numeric outcome, group with 2 to 30 levels | M, SD and n per group; F, df, p; η² | |
| Pearson correlation | Two numeric variables | r, N, df, p | Under 30 cases: imprecise |
| Linear regression | One numeric predictor, one numeric outcome | Slope, intercept, SE of slope, t, df, p, R², N | Association, not cause; check residuals |
| Chi-square test of independence | Two categorical variables | χ², df, N, p; Cramér's V | Over 20% of cells with expected count under 5 |

Every result also has an APA 7 sentence you can copy. That is the full list. Data Lab does not run Shapiro-Wilk or other formal normality tests, Levene's test, Welch's ANOVA, post-hoc comparisons, the Wilcoxon signed-rank, Kruskal-Wallis, Friedman or McNemar tests, Fisher's exact test, Spearman correlation, repeated-measures ANOVA, multiple or logistic regression, or Fleiss' kappa and Krippendorff's alpha. When the chooser recommends one of these, it says so and points you to SPSS, R, jamovi or JASP.

## How it works, step by step

1. Open Data Lab and upload your file or paste your data with a header row.
2. Check the column types in the preview and switch any that are wrong, such as a group coded 1 and 2 that should be categorical.
3. On Describe and chart, read the summaries and look at a histogram or box plot of your outcome. Skew and outliers show here.
4. If you are unsure which test fits, open **Which test?** and answer the questions.
5. On Tests, choose the test and the two variables and press **Run**. Repeat for each analysis.
6. Press **Save to History** to keep the results, or **Results as CSV** to export them.
7. On Report, add your research question if you like and press **Write the results section** (2 credits). Open it in the editor or copy it.

<!-- SCREENSHOT: the "Which test?" tab with answers chosen on the left and the Recommended card on the right: test name, why, "Check first" assumptions and the APA template -->

## A worked example

*Example:* the built-in sample data has 12 students, six with tutoring and six without, and their exam scores. Run "Independent t-test (Welch)" with score as the outcome and group as the group. Data Lab returns:

- tutoring: M = 78.67, SD = 8.71, n = 6; control: M = 66.17, SD = 6.31, n = 6
- t(9.11) = 2.85, p = .019, Cohen's d = 1.64
- A warning: "Small groups: check that the values are roughly normal."

The APA sentence reads: "score was significantly different between tutoring (M = 78.67, SD = 8.71) and control (M = 66.17, SD = 6.31), t(9.11) = 2.85, p = .019, d = 1.64." With six per group, you would look at the box plot before trusting it, and report the small sample as a limitation. These numbers come from running the sample data through Data Lab's own code.

## How the AI write-up stays tied to your numbers

The results section is written from the result tables, their APA sentences, their warnings and the variable summaries. The raw rows are never sent. The AI is instructed to use only the numbers given, exactly as written, and to add no test or variable. It writes four parts: Sample, Results (one paragraph per result), Interpretation (without claiming causation from correlations) and Limitations (from the warnings, sample size and tests used). The numbers are not re-checked automatically after writing, so compare each one with your result cards before you use the text.

<!-- SCREENSHOT: the Report tab with a written results section and the Open in editor button -->

## What it does not do

- It runs the seven tests above and no others, and it does not test assumptions formally. It warns on small samples and sparse tables and tells you what to check.
- No multivariable models: one predictor per regression, no covariates.
- No Excel files: save as CSV first. Files up to 20 MB, first 50,000 rows.
- Saved analyses keep results, not data. Upload the data again to run more tests.
- It does not decide what your results mean for your field. Clinical or policy conclusions need a qualified professional's review.

## Who uses it

Undergraduates and master's students analyzing a dissertation dataset (see [AI for college students](/for/undergraduates) and [AI for master's students](/for/masters)), PhD candidates checking results before a chapter (see [AI for PhD students](/for/phd)), and clinicians running a first look at audit data (see [AI for medical research](/for/medicine)). For a quick check without signing in, the free [data analysis tool](/tools/data-analysis) runs descriptives, correlations, t-tests and chi-square. To plan the analysis before you collect data, use the [Methodology Builder](/features/methodology-builder).

<!-- LINK: /tools/statistical-test-chooser when L31 ships; /tools/sample-size-calculator when L32 ships -->

## Learn more

- [Which statistical test to use: a decision guide](/blog/which-statistical-test-to-use)
- [T-test vs ANOVA vs chi-square: when to use each](/blog/t-test-vs-anova-vs-chi-square)
- [Statistical power and sample size, explained](/blog/statistical-power-and-sample-size)
- [How to test for normality, and what to do when data fail](/blog/how-to-test-for-normality)
