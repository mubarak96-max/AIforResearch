# White papers: feature and content, 13 November 2026

A dedicated white paper feature, with landing pages and blog posts to capture search traffic. Nothing is committed or deployed.

**State:** `tsc` is clean and all tests pass (568 at the time of writing, including the new white paper cases in `tests/server/deliverables.test.ts`). `node scripts/build-blog.mjs` compiles 107 posts and 45 landing pages. Every internal link in the new files resolves. No page has been clicked through in a browser.

## Keyword data (Ubersuggest, global, monthly, pulled 13 November 2026)

| Keyword | Volume | Target |
| --- | --- | --- |
| what is white paper | 22,200 | post 125 |
| white paper example | 5,400 | post 126 |
| white paper template | 2,400 | `/templates/white-paper` |
| white paper format | 1,600 | post 127, `/templates/white-paper` |
| how to write a white paper | 1,000 | post 27 (existing) |
| ai white paper | 720 | `/features/white-paper-writer` |
| white paper example pdf | 480 | post 126 |
| technical white paper | 390 | post 129, `/templates/technical-white-paper` |
| policy white paper | 320 | post 131, `/templates/policy-white-paper` |
| white paper vs research paper | 260 | post 130 |
| scientific white paper / science white paper | 170 each | post 128, `/features/scientific-white-paper` |
| ai white paper generator / white paper generator | 70 / 50 | `/tools/white-paper-generator` |

"white paper" (201,000) is mostly about paper products and isn't a target.

## The feature

**White paper module** (`/write?module=white-paper`) is the first entry under "Deliverables" in the Writing Studio:

- **Seven kinds, each with its own structure:** problem–solution, scientific, technical, policy or government, industry trends, backgrounder, and numbered list.
  - The definitions are in `WHITE_PAPER_TYPES` (`lib/server/lib/studioCatalog.ts`).
  - The sections for each kind are in `WHITE_PAPER_SECTIONS` (`lib/server/lib/studioModules.ts`).
- **Reader:** decision makers, technical readers, policy makers, scientists, funders, or an informed general reader.
- **Voice:** educational and vendor-neutral, or "make the case for our approach". In the second voice, the writer's own claims are attributed to them unless a source supports them, and the paper states the approach's limits.
- **Scope:** the whole paper costs 15 credits (`draft`). One part costs 3 credits (`section`): executive summary, problem, evidence, approach, or recommendations.
- **Your material:** an optional upload with your approach, product or data, up to 30,000 characters, used exactly as given. Missing figures become `[placeholders]`.
- **Sources:** it searches several times (grounded `multi`) and has the length option. The whole paper runs on the review model.
- **Output:** a title and subtitle first, then a "Suggested figures" section at the end, with only figures backed by a source or the writer's data.
- **Rules in the prompt:** no superlatives, no invented statistics, case studies or quotations, and evidence strength stated.

**Elsewhere:**

- **Blank editor template** `white-paper`. It is blank-only, so "Fill a template" doesn't offer it.
- **Build on this:** "Write a white paper" now appears after a research result (`components/app/research/handoff.ts`) and reuses that result's sources.
- **Catalog entry** in `lib/catalog.ts`.
- **Free public tool** `/tools/white-paper-generator`, in `lib/tools.ts` with its prompt in `toolPrompts.ts`:
  - It drafts about 1,500 words in 5 kinds and is grounded in sources.
  - Signed-out visitors get the usual daily allowance.

## Content

**Landing pages:**

- `/features/white-paper-writer`
- `/features/scientific-white-paper`
- `/templates/white-paper`
- `/templates/technical-white-paper`
- `/templates/policy-white-paper`

**Blog posts** (cluster "Q. White papers", pillar 125):

| # | Slug |
| --- | --- |
| 125 | what-is-a-white-paper |
| 126 | white-paper-examples |
| 127 | white-paper-format |
| 128 | how-to-write-a-scientific-white-paper |
| 129 | how-to-write-a-technical-white-paper |
| 130 | white-paper-vs-research-paper |
| 131 | government-white-paper |

**Updated:** post 27 (how-to-write-a-white-paper) now describes and links to the module, the tool, the template and the new posts.

## Before publishing

- **Claim rule 1:** the landing pages and the tool go live only after the feature is deployed and clicked through.
- **Resolve the `<!-- VERIFY -->` comments** (about 16 across posts 125–131 and 27):
  - Astro2020 and Snowmass white paper calls, and the BAAS volume.
  - URLs for the EU AI white paper, the UK Parliament glossary, and Australia's 2017 Foreign Policy White Paper.
  - Military white paper formats (AR 25-50, SECNAV M-5216.5).
  - The APA "[White paper]" descriptor.
  - IPCC uncertainty language.
  - The origin of the term "white paper", and parliamentary procedure terms.
- **Replace the `<!-- SCREENSHOT -->` comments** with product images.
- **Planned post 120** (how-to-write-a-policy-brief): when it ships, link it from post 131.
- **Signed-out run limit:** the pages say "a few runs a day". Confirm the real limit in `lib/server/routes/tools.ts` if you want a number.
