# Official source connectors

The signed-in `/official-sources` workspace uses the existing Library and task workbooks. Discovery does not save records. An explicit save fetches the selected official identifier again and creates a deduplicated Library snapshot, with optional insertion into a selected workbook. Shared workbook members can read an inserted snapshot. Library sources can also be imported into project evidence.

| Source | Available workflow | Preserved distinctions | Scope |
| --- | --- | --- | --- |
| ClinicalTrials.gov | Search registrations, load outcome descriptions and linked publication references, save record snapshots | First registration/result-posting dates, registry update, estimated/actual enrollment, registered versus posted outcome descriptions, reference type and PMID | Registry records; numerical result tables, group denominators, statistical analyses and publication full text are not imported |
| World Bank | Search one indicator catalogue, read metadata and paged observations, export CSV/JSON | Dataset source, definition, period, area, unit, missing versus zero, footnote and update date | Source 2 defaults to World Development Indicators; other source IDs are selectable; partial catalogue/data pages are identified |
| ReliefWeb | Search published reports and save report body/metadata | Original publication, ReliefWeb ingestion/update, original publisher | Sends the approved appname set in code; attached files are not downloaded |
| SEC EDGAR | Read recent submission records by CIK and XBRL concept facts | Filing date, reporting interval, taxonomy, unit, accession, original/amended filing | SEC filer coverage; older submission archives and custom XBRL concepts are not searched; filing index records are not filing full text |

Geographic filters, when supplied, select source data. They do not restrict who can use the product. No exchange-rate conversion, averaging of different periods, imputation of missing observations, or automatic claim of global coverage is made.

## Optional deployment configuration

- ReliefWeb needs no configuration: requests send the approved application name `mutesasira-aiforresearch-nQO9kmOfXv` (`RELIEFWEB_APPNAME` in `lib/server/lib/officialSources.ts`). No API key is used.
- SEC EDGAR needs no configuration: requests identify the app with the fixed User-Agent `AIforResearch support@aiforresearch.app` (`SEC_USER_AGENT` in `lib/server/lib/officialSources.ts`). A Firestore admission counter allows at most five SEC network attempts per second across app instances. SEC requests do not retry automatically.

ClinicalTrials.gov and World Bank do not use additional application credentials in these adapters. Existing Library plan limits still apply to saved snapshots. Saved provenance includes the provider, record type, canonical URL, retrieval time, SHA-256 digest, labeled dates, source metadata, and stated limits. New source content creates a new snapshot instead of overwriting an earlier one.

Trial search results are explicitly partial previews. **Load registration details** retrieves the full record for separate registered/posted outcome descriptions and registry-linked PubMed references. A save always refetches these details. Background, result and automatically derived references retain the provider's labels; the app does not infer that every linked paper reports trial results. Empty lists do not prove that no outcomes or publications exist. See ClinicalTrials.gov's [guide to reading study results](https://www.clinicaltrials.gov/study-basics/how-to-read-study-results) for the distinction between outcome measures and publication links.

## Verification

`tests/server/official-sources.test.ts` checks representative official API responses, paging, missing values, unit/period retention, disabled-provider behavior, authentication, locator validation, source refetching, deduplication, and workbook revision protection. These are deterministic mocked API contract tests; they do not establish live provider availability or production credentials.

Primary references: [ClinicalTrials.gov API](https://clinicaltrials.gov/data-api/api), [World Bank call structure](https://datahelpdesk.worldbank.org/knowledgebase/articles/898581-api-basic-call-structures), [World Bank indicator metadata](https://datahelpdesk.worldbank.org/knowledgebase/articles/898599-indicator-api-queries), [ReliefWeb reports](https://apidoc.reliefweb.int/read/resources/reports/), [ReliefWeb appname requirement](https://apidoc.reliefweb.int/), [SEC data APIs](https://www.sec.gov/search-filings/edgar-application-programming-interfaces), and [SEC automated access](https://www.sec.gov/about/webmaster-frequently-asked-questions).
