# Pricing proposal: plans, credits and the free plan

Proposal, 11 November 2026. Goal: a free plan that lets a user try every workspace and see real output, without the free plan costing more than it earns; paid plans that stay profitable even when a user spends every credit.

**The cost figures here are estimates, not measurements.** They rest on the assumptions in section 6. Log the real cost of every job in phase 1 and reprice from the data before the plans go live.

## 1. Why the current plans cannot carry the new product

Today: Free, Plus at $12, Pro at $29 with everything unlimited, Team on request (`lib/server/lib/plans.ts`). Limits are counts per feature (autocompletes, chats, reviews, drafts).

Two problems with the new features:

1. **Jobs no longer cost the same.** A short answer costs a fraction of a cent. A Detailed report or a high-quality thesis review reads hundreds of thousands of tokens. "5 chats a day" cannot price both.
2. **"Unlimited" Pro is open-ended risk.** One heavy user running Detailed reports all day costs more than $29.

## 2. The model: light work is free of counting, heavy work uses credits

- **Not counted** (within a fair-use ceiling per plan): paper search and filters, citations and the citation generator, the Library, reading PDFs, the editor, in-browser statistics, exports. These cost almost nothing and are the habit-forming part.
- **Credits**: one allowance for every job that calls a model at length. The price is shown before the job starts.

| Job | Credits | Notes |
| --- | --- | --- |
| Summary answer | 1 | |
| Chat with PDF question, AI edit, short rewrite | 1 | |
| Deep Research report | 7 | 20–40 papers; screened, ranked, every citation checked |
| Detailed report | 25 | 50+ papers, tables, plan reviewed first, citation chasing. Paid plans. |
| Section draft, abstract, outline, gap analysis | 3 | |
| Full paper, proposal or literature-review draft | 15 | |
| Document review, standard | 10 | Up to 10,000 words; 5 more per further 10,000 |
| Document review, high quality | 30 | Same length rule. Pro and above. |
| Slide deck | 10 | |
| Data Lab analysis with AI | 2 | In-browser tests cost nothing |
| Systematic review: AI screening | 1 per 25 records | |
| High-quality mode on any job | 3× | Pro and above |

Autocomplete stays a count, not credits, because it fires constantly: 10 a day on Free, 5,000 a month on Plus, 20,000 a month on Pro.

## 3. The plans

| | Free | Plus | Pro | Team |
| --- | --- | --- | --- | --- |
| Price, monthly | $0 | $12 | $29 | — |
| Price, yearly | $0 | $96 ($8 a month) | $228 ($19 a month) | $300 a seat ($25 a month), 3 seats or more |
| Credits each month | 30 | 500 | 1,500 | 2,000 a seat, pooled |
| Depth modes | Summary, Deep | + Detailed | + High quality | All |
| Library PDFs | 25, up to 10 MB each | Unlimited, 50 MB | Unlimited, 100 MB | Shared Library |
| Projects | 1 | 10 | Unlimited | Unlimited, shared |
| Sharing | 1 commenter | 3 collaborators | 10 collaborators | Whole team, roles |
| Zotero and Mendeley | One import of up to 100 references | Sync | Sync | Sync |
| Exports | Word, PDF | + LaTeX, PowerPoint | + LaTeX, PowerPoint | All |
| Queue | Standard | Standard | Priority | Priority |
| Support | Help centre | Email | Priority email | Onboarding, one invoice |

Prices for Plus and Pro are the ones you charge today, so current subscribers see no price change. What changes is that Pro gets a large allowance in place of "unlimited".

**Two extras that fit how students buy:**

- **Defence Pass, $49 once.** 90 days of Pro, no renewal. Students close to submission will not start a subscription, and will pay once. It also gives a calm answer to "I only need it for my thesis".
- **Top-ups.** 500 credits for $7, 2,000 for $24, valid 12 months, for any paid plan. A top-up is the release valve that lets every plan have a hard limit without a dead end.

## 4. What Free can taste in each workspace

The rule: **the user sees real output before the paywall, and the paywall sits on depth, length and export, never on a blank screen.**

| Workspace | Free gets | Paid adds |
| --- | --- | --- |
| Deep Research | Summary and Deep answers, all sources, all filters | Detailed reports, High quality |
| Find Papers | Unlimited search and filters, save to Library | Bulk export over 25 records, alerts |
| Library and Chat with PDF | 25 PDFs; ask one document at a time | Unlimited; ask many documents at once |
| Writing Studio | The full editor, 10 autocompletes a day, unlimited citations | Volume, LaTeX |
| Reviewer | **Preview review** for 3 credits: the full scorecard and the three most important comments on the first 3,000 words | The complete review, every comment in the text, High quality |
| Thesis Suite | Outline and similar-papers finder | Methodology builder in full, chapter drafting, defence preparation |
| Proposal Studio | Outline and the first section | The full draft, funder formats, ethics application |
| Systematic Review | One project, 50 records, AI suggestions on the first 25 | Unlimited records, two reviewers, PRISMA export |
| Data Lab | In-browser tests on files up to 2 MB | AI analysis, regression, charts for publication, the report |
| Slides | The first five slides on screen | The full deck and PowerPoint export |

Thirty credits is, for example, three Deep reports, one preview review, an outline and three quick answers. Enough to decide; not enough to write a thesis.

Signed-out visitors keep what exists today: free tool pages with three AI runs a day per address.

## 5. Why Free does not lose money

| Guard | Effect |
| --- | --- |
| 30 credits a month, no rollover, economy models only | A hard ceiling on what one free account can cost |
| Email confirmation before the first credit is spent; one free account per person | Stops throwaway accounts |
| The rate-limit fix (`X-Forwarded-For`, in `docs/prd-status.md`) | The signed-out limit can be bypassed today |
| Detailed and High quality are paid only | The two expensive job types never run for free |
| Answers to repeated public questions are cached | Popular landing-page questions cost once |
| In-browser statistics and PDF tools | Free Data Lab use costs nothing |
| Free jobs wait behind paid ones at busy times | Protects paid users and capacity |

Estimated worst case for a free account that spends everything, every month: about **$0.30** (credits about $0.18, autocomplete about $0.06, storage and hosting about $0.05). A typical free account uses far less. One Plus subscriber on a monthly plan pays for roughly twenty such worst-case accounts, so the free plan carries itself from a conversion rate of about 5% in the worst case and about 2% in a typical one.

## 6. Unit economics (estimates)

**Assumptions.** Economy model at about $0.30 per million input tokens and $1.20 per million output tokens; premium model at about $3 and $15. Paper APIs free; web search about one cent a run. Payment fees from Dodo's published pricing: 4% + $0.40, plus 1.5% for cards outside the US and a small surcharge on subscriptions; I use 6% + $0.40.

| Job | Tokens read / written | Estimated cost | Credits | Cost per credit |
| --- | --- | --- | --- | --- |
| Summary answer | 19k / 2k | $0.008 | 1 | $0.008 |
| Deep report | 110k / 9k | $0.044 | 7 | $0.0063 |
| Detailed report | 395k / 23k | $0.146 | 25 | $0.0058 |
| Standard review, 10,000 words | 70k / 8k | $0.03 | 10 | $0.003 |
| High-quality review (premium model writes the final pass) | 70k economy + 30k / 8k premium | $0.23 | 30 | $0.008 |
| Slide deck | 40k / 6k | $0.02 | 10 | $0.002 |

Target: **no more than $0.006 of cost per credit on average.**

**Research steps (12 November 2026).** Deep Research now runs seven steps the person watches: Plan, Search, Screen, Rank, Read, Write, Verify. Screen (titles and abstracts), Read (one finding per paper, plus open full texts: 4 on Deep, 8 on Detailed) and Verify (each cited sentence checked against its sources, overstated ones rewritten, each DOI checked at Crossref) add economy-model calls; Rank, citation chasing and the Crossref checks cost nothing. The old stance-labelling call is gone (Read does it). Deep went from 5 to 7 credits and Detailed from 20 to 25 to stay near the target. Summary stays at 1 credit as the free entry point, about $0.008 a credit; a user who spent a whole Plus allowance on Summary answers would cost about $4 instead of $3, and the plan stays positive. Allowances are unchanged: every job is now priced at its cost, so a month's credits buy a little fewer reports than before but each one does more. Measure the real tokens per step (meterTokens records `research:<depth>` and `research:plan`) and revisit after a month.

| Plan | Revenue a month | Fees | Credits at full use | Autocomplete, hosting | Left at full use | Left at typical use (40% of credits) |
| --- | --- | --- | --- | --- | --- | --- |
| Plus, monthly | $12.00 | $1.12 | $3.00 | $1.50 | $6.38 (53%) | $8.18 (68%) |
| Plus, yearly | $8.00 | $0.51 | $3.00 | $1.50 | $2.99 (37%) | $4.79 (60%) |
| Pro, monthly | $29.00 | $2.14 | $9.00 | $2.50 | $15.36 (53%) | $20.76 (72%) |
| Pro, yearly | $19.00 | $1.17 | $9.00 | $2.50 | $6.33 (33%) | $11.73 (62%) |
| Team seat, yearly | $25.00 | $1.53 | $12.00 | $2.50 | $8.97 (36%) | $16.17 (65%) |
| Top-up, 500 credits | $7.00 | $0.82 | $3.00 | — | $3.18 (45%) | — |
| Defence Pass (per month of three) | $16.33 | $1.11 | $9.00 | $2.50 | $3.72 (23%) | $9.12 (56%) |

Every row stays positive when a user spends every credit. The thinnest are the yearly plans and the Defence Pass at full use; if measured costs come in above the estimates, lower their credits before raising prices.

## 7. Regional and student pricing

Many of your users will be students in lower-income countries, and Dodo supports purchasing-power pricing by country. Be careful: **the model cost does not fall with the price.** Plus at 30% of list is $3.60 a month against up to $4.50 of cost at full use.

Proposal:

- Regional pricing on **yearly plans only**, with a floor of 50% of list price.
- For countries that need more than that, a separate **Student plan**: $5 a month billed yearly, 200 credits. Lower price and lower cost together.
- No public coupon codes on monthly plans.

## 8. Moving current subscribers

| Today | Becomes |
| --- | --- |
| Free (daily counts per feature) | Free with 30 credits a month. Tell users before the switch. |
| Plus $12 | Plus $12 with 500 credits. For most this is more than the old counts. |
| Pro $29 "unlimited" | Pro $29 with 1,500 credits. Keep current subscribers on unlimited light use until their next renewal, and say so by email. |
| Team | Unchanged until Team launches in phase 4 |

## 9. How it is built (short)

- One Dodo **credit entitlement** shared by the plans and the top-up products; plans issue credits each cycle, top-ups add to the balance (Dodo's credit-based billing supports both, with expiry and a low-balance webhook).
- `lib/server/lib/plans.ts` already counts usage per key. Add a `credits` balance and a price per job type next to the existing `planQuota` guard, and keep the count limits for autocomplete.
- Refund the credits when a job fails. Show the balance in the sidebar and the price on every start button.
- Write every job's token and search cost to a log from day one.

## 10. Numbers to watch after launch

Cost per credit by job type · share of free accounts that spend all 30 credits · free-to-paid conversion and which paywall triggered it · credits used as a share of the allowance per plan · top-up purchases per paying user · Defence Pass buyers who later subscribe.

## 11. Decisions for you

1. Credits in place of per-feature counts: agree?
2. The four plans and their prices; the Defence Pass and top-ups.
3. Thirty free credits a month. A leaner option is 20; a more generous one is 50 for the first month only.
4. Regional pricing as proposed, or list prices everywhere to start.
5. Whether Pro subscribers keep unlimited light use for good (goodwill) or only until renewal.
