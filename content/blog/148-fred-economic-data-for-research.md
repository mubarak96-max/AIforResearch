---
title: "FRED Economic Data for Research: Series, Units and Citing"
slug: "fred-economic-data-for-research"
description: "FRED economic data for research: series IDs, units, frequency, seasonal adjustment, ALFRED vintages, how to cite a series, and OECD and World Bank alternatives."
primary_keyword: "fred economic data"
secondary_keywords: ["fred database", "federal reserve economic data", "fred series id", "alfred vintage data", "how to cite fred data", "seasonally adjusted vs not seasonally adjusted", "oecd data", "treasury fiscal data"]
cluster: "P. Research by field"
pillar: "/blog/ai-for-qualitative-research"
author: "Mubarak"
compares_tools: false
published: "2026-11-13"
updated: "2026-11-13"
faq:
  - q: "What is FRED economic data?"
    a: "FRED (Federal Reserve Economic Data) is a free database of economic time series run by the Research Division of the Federal Reserve Bank of St. Louis. It gathers hundreds of thousands of US and international series from many sources, such as the Bureau of Labor Statistics and the Bureau of Economic Analysis, and gives each a series ID, units, frequency and notes. You can graph, download or query the data through an API."
  - q: "How do I cite a FRED series?"
    a: "Credit the original source, then FRED. A typical citation names the source agency, the series title and ID, 'retrieved from FRED, Federal Reserve Bank of St. Louis', the series URL and the date you retrieved it. Each series page has a suggested citation, which is the safest starting point. Then format it in your required style."
  - q: "What is the difference between FRED and ALFRED?"
    a: "FRED shows the latest version of each series, after all revisions. ALFRED (Archival FRED) stores earlier versions, called vintages, so you can see the data as it was published on a given date. Use ALFRED when you need to know what was known at the time, for example to evaluate a forecast or to reproduce an older paper."
  - q: "Should I use seasonally adjusted or not seasonally adjusted data?"
    a: "For most analyses of trends and month-to-month changes, use seasonally adjusted data, because it removes regular calendar patterns such as holiday hiring. Use not seasonally adjusted data when the seasonal pattern is what you study, when you apply your own adjustment, or when you compare the same month across years. Never mix the two in one comparison."
  - q: "Where can I find economic data for countries other than the US?"
    a: "FRED includes many international series, but for cross-country work go to the source. The OECD publishes comparable indicators for its member and partner countries, the World Bank's World Development Indicators cover nearly every country, and national statistics offices and central banks publish their own series. Check that definitions match before you compare countries."
---

# FRED economic data for research: series, units, vintages and citing

*Last updated: 13 November 2026*

FRED economic data are free time series from the Federal Reserve Bank of St. Louis, covering US and international indicators such as GDP, inflation, unemployment and interest rates. Each series has an ID, units, a frequency and a seasonal-adjustment status; read all four before you use it. Cite the original source and FRED with the series ID and retrieval date, and use ALFRED when you need the data as first published.

This guide is for economics, finance, business and public policy students and researchers who need macroeconomic data in a thesis, paper or report. It is part of our series on [research by field](/blog/ai-for-qualitative-research).

## What is FRED?

**FRED (Federal Reserve Economic Data) is a free online database of economic time series maintained by the Research Division of the Federal Reserve Bank of St. Louis** [1]. It brings together series from many producers, including the Bureau of Labor Statistics, the Bureau of Economic Analysis, the Federal Reserve Board, the Census Bureau and international organizations, in one format. It holds more than 800,000 series from over 100 sources. <!-- VERIFY: current series and source counts on the FRED "What is FRED" page -->

FRED is a distributor, not a producer. The Bureau of Labor Statistics produces the unemployment rate; FRED republishes it. That matters for definitions, revisions and citation.

## How to read a FRED series

Every series page shows the same fields. Read them before you download anything.

| Field | What it tells you | Example |
| --- | --- | --- |
| Series ID | A short, stable code you cite and query | `UNRATE` |
| Title | What is measured | Unemployment Rate |
| Units | The measure and scale | Percent; Billions of Dollars; Index 1982-1984=100 |
| Frequency | How often observations occur | Daily, weekly, monthly, quarterly, annual |
| Seasonal adjustment | Whether calendar effects are removed | Seasonally Adjusted (SA), Not Seasonally Adjusted (NSA), Seasonally Adjusted Annual Rate (SAAR) |
| Source and release | Who produces it and in which release | U.S. Bureau of Labor Statistics, Employment Situation |
| Notes | Definitions, breaks in the series, copyright | Read every time |

### Common series IDs

| Series ID | Title | Units | Frequency |
| --- | --- | --- | --- |
| `GDP` | Gross Domestic Product | Billions of dollars, SAAR | Quarterly |
| `GDPC1` | Real Gross Domestic Product | Billions of chained 2017 dollars, SAAR | Quarterly |
| `CPIAUCSL` | Consumer Price Index for All Urban Consumers: All Items | Index 1982-1984=100, SA | Monthly |
| `UNRATE` | Unemployment Rate | Percent, SA | Monthly |
| `FEDFUNDS` | Federal Funds Effective Rate | Percent, NSA | Monthly |
| `DGS10` | 10-Year Treasury Constant Maturity Rate | Percent, NSA | Daily |

<!-- VERIFY: units, base year (chained 2017 dollars) and frequency for each series ID -->

### Units, frequency and seasonal adjustment

- **Nominal vs real.** `GDP` is in current dollars; `GDPC1` is adjusted for inflation. Growth in nominal GDP mixes real growth and price changes.
- **Annual rates.** US quarterly GDP is reported as a seasonally adjusted annual rate: the quarter's value multiplied up to a yearly pace. Do not add four quarters of SAAR together.
- **Frequency conversion.** FRED can convert a monthly series to quarterly or annual by average, sum or end of period. Choose the method that fits the variable: average for rates and prices, sum for flows such as monthly sales, end of period for stocks. <!-- VERIFY: FRED frequency aggregation methods -->
- **Seasonal adjustment.** Seasonally adjusted data remove regular calendar patterns. Use them for trends; use not seasonally adjusted data only when the seasonal pattern is your subject or when you compare the same month across years.
- **Transformations.** FRED can show a series as a change, a percent change, a percent change from a year ago or a log. Record which you used.

## Vintages and ALFRED

Economic data are revised. The first estimate of a quarter's GDP is revised months and years later. **ALFRED (Archival FRED) stores each earlier version of a series, called a vintage, so you can retrieve the data as it was available on a given date** [2].

Use ALFRED when:

- You evaluate a forecast or a policy decision against what was known at the time.
- You reproduce an older paper whose results depend on the data then available.
- You study revisions themselves.

For most descriptive work, the latest vintage in FRED is correct. Either way, record the retrieval date, because the "latest" data change.

## How to cite FRED data

Credit the original producer first, then FRED. The St. Louis Fed recommends using the citation shown for each series, which includes the source, the series title and ID, "retrieved from FRED, Federal Reserve Bank of St. Louis", the URL and the retrieval date [3]. An example:

> U.S. Bureau of Labor Statistics, Unemployment Rate [UNRATE], retrieved from FRED, Federal Reserve Bank of St. Louis; https://fred.stlouisfed.org/series/UNRATE, November 13, 2026.

Format it in your required style (APA, Harvard, Chicago) as a dataset. Some series are copyrighted by their producers; the notes say so and may require permission for reuse beyond citation [3]. <!-- VERIFY: FRED citation format and copyright note wording -->

## Alternatives for non-US data

FRED carries many international series, but for cross-country work the original source is usually better documented.

| Source | Best for | Access |
| --- | --- | --- |
| OECD Data Explorer | Comparable indicators for OECD members and partners: national accounts, prices, labor, productivity, education, health | Web, downloads and an SDMX API <!-- VERIFY: OECD Data Explorer and SDMX API --> |
| World Bank World Development Indicators | Long annual series for nearly every country, including low- and middle-income countries | Web, downloads and an API |
| US Treasury Fiscal Data | US federal finances: debt, receipts, outlays, interest rates on Treasury securities | Web and an API without a key <!-- VERIFY: Fiscal Data API requires no key --> |
| National statistics offices and central banks | The most detailed, official national series | Varies |

When you compare countries, check that definitions match. Unemployment, for example, follows international guidelines in OECD harmonized series but national definitions in many national releases.

## A worked example (invented)

Example (invented for illustration): a master's student studies how US inflation and the federal funds rate moved between 2015 and 2025.

1. She takes `FEDFUNDS` (monthly, percent, NSA) and `CPIAUCSL` (monthly, index, SA).
2. CPI is an index, not inflation, so she uses FRED's "percent change from year ago" transformation to get annual inflation in percent.
3. For a comparison with quarterly `GDPC1`, she converts both monthly series to quarterly by averaging, because they are a rate and a price index.
4. To compare with the euro area, she uses the OECD's harmonized consumer price series rather than mixing CPI definitions.
5. To show the price level relative to the start of her period, she rebases CPI to 2015 = 100: each value divided by the 2015 average, times 100.
6. She records each series ID, transformation and retrieval date in a data appendix and cites each series.
7. She loads the CSV into a statistics tool and runs the analysis there. The results are computed from the data, not written by hand.

## Common mistakes

- **Mixing units.** Billions vs millions, percent vs index, SAAR vs quarterly level.
- **Treating an index as a rate.** A CPI level is not inflation; compute the change.
- **Mixing SA and NSA series** in one comparison.
- **Wrong frequency aggregation.** Summing monthly interest rates to "annual" values is meaningless.
- **Confusing percent and percentage points.** A rate moving from 2% to 3% rises by 1 percentage point, or 50 percent.
- **Rebasing carelessly.** Rebasing changes the level, not the growth rates; say which base period you used.
- **Ignoring revisions and breaks.** Read the notes for discontinued or redefined series.
- **Citing FRED alone.** Name the producer as well.

## FRED and economic data in AI for Research

Official Sources (the /official-sources route) looks up FRED, US Treasury Fiscal Data and the OECD alongside the World Bank, SEC EDGAR, ClinicalTrials.gov and ReliefWeb, at 0 credits. You see the series or record with a link back to the source, so you can check its units, frequency and notes before you use it. <!-- VERIFY: what fields Official Sources shows for a FRED series (ID, units, frequency, seasonal adjustment) -->

<!-- SCREENSHOT: Official Sources with a FRED series result showing its ID, units, frequency and source link -->

For the analysis, download the series as CSV and load it into [Data Lab](/features/data-lab). Descriptive statistics, charts and tests are calculated in your browser for free; an AI-written results section from the numbers you computed costs 2 credits. Data Lab is not an econometrics package: it does not fit time-series models such as ARIMA or VAR, so use R, Python or Stata for those. <!-- VERIFY: Data Lab has no time-series models --> The Free plan has 45 credits a month; see [pricing](/pricing). The [business and economics](/fields/business-and-economics) page lists the other tools for the field.

## FAQ

### What is FRED economic data?

FRED (Federal Reserve Economic Data) is a free database of economic time series run by the Research Division of the Federal Reserve Bank of St. Louis. It gathers hundreds of thousands of US and international series from many sources, such as the Bureau of Labor Statistics and the Bureau of Economic Analysis, and gives each a series ID, units, frequency and notes. You can graph, download or query the data through an API.

### How do I cite a FRED series?

Credit the original source, then FRED. A typical citation names the source agency, the series title and ID, "retrieved from FRED, Federal Reserve Bank of St. Louis", the series URL and the date you retrieved it. Each series page has a suggested citation, which is the safest starting point. Then format it in your required style.

### What is the difference between FRED and ALFRED?

FRED shows the latest version of each series, after all revisions. ALFRED (Archival FRED) stores earlier versions, called vintages, so you can see the data as it was published on a given date. Use ALFRED when you need to know what was known at the time, for example to evaluate a forecast or to reproduce an older paper.

### Should I use seasonally adjusted or not seasonally adjusted data?

For most analyses of trends and month-to-month changes, use seasonally adjusted data, because it removes regular calendar patterns such as holiday hiring. Use not seasonally adjusted data when the seasonal pattern is what you study, when you apply your own adjustment, or when you compare the same month across years. Never mix the two in one comparison.

### Where can I find economic data for countries other than the US?

FRED includes many international series, but for cross-country work go to the source. The OECD publishes comparable indicators for its member and partner countries, the World Bank's World Development Indicators cover nearly every country, and national statistics offices and central banks publish their own series. Check that definitions match before you compare countries.

## Learn more

- Choosing the right analysis: [which statistical test to use](/blog/which-statistical-test-to-use).
- Planning the study around the data: [how to write a research question](/blog/how-to-write-a-research-question).
- Writing up methods and data sources: [how to write a methodology chapter](/blog/how-to-write-a-methodology-chapter).
- Tools for the field: [business and economics](/fields/business-and-economics).

## Sources

1. Federal Reserve Bank of St. Louis. What is FRED? https://fredhelp.stlouisfed.org/fred/about/about-fred/what-is-fred
2. Federal Reserve Bank of St. Louis. ALFRED: Archival Federal Reserve Economic Data. https://alfred.stlouisfed.org/
3. Federal Reserve Bank of St. Louis. (2020). Data citations with FRED. *Page One Economics*. https://www.stlouisfed.org/publications/page-one-economics/2020/10/21/data-citations-with-fred
