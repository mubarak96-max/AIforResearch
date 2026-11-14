---
title: "Probability vs Non-Probability Sampling: Methods and Examples"
slug: "probability-vs-non-probability-sampling"
description: "Probability and non-probability sampling compared: ten methods with examples, a decision table, sampling error vs bias, and what to write in your methods section."
primary_keyword: "probability and non probability sampling"
secondary_keywords: ["probability sampling", "non-probability sampling", "types of sampling methods", "stratified sampling", "cluster sampling", "convenience sampling", "purposive sampling", "snowball sampling", "sampling bias"]
cluster: "U. Research methods and design"
pillar: "/blog/types-of-research-design"
author: "Mubarak"
compares_tools: false
published: "2026-11-14"
updated: "2026-11-14"
faq:
  - q: "What is the difference between probability and non-probability sampling?"
    a: "In probability sampling, every member of the population has a known, non-zero chance of being selected, and chance decides who is chosen. That lets you estimate sampling error and generalize to the population with stated precision. In non-probability sampling, the researcher or the participants decide who takes part, so the chances are unknown and you cannot calculate a valid margin of error for the population."
  - q: "What are the 5 types of probability sampling?"
    a: "The five main types are simple random sampling (every unit has an equal chance), systematic sampling (every kth unit from a list after a random start), stratified sampling (random samples within subgroups such as region or year of study), cluster sampling (randomly chosen groups such as schools, with everyone or a sample inside them), and multistage sampling, which combines these in stages."
  - q: "Is convenience sampling ever acceptable?"
    a: "Yes, for pilot studies, instrument testing, early exploratory work and experiments where the question is whether an effect exists rather than how common something is. It is not acceptable when you want to estimate a population figure such as prevalence. If you use it, describe who was reached and how, compare your sample with known population figures, and limit your claims about generalization."
  - q: "What is the difference between quota and stratified sampling?"
    a: "Both divide the population into subgroups and fill each one. In stratified sampling, people within each stratum are chosen at random from a list, so it is a probability method. In quota sampling, interviewers or online panels fill each quota with whoever is available and willing until the target is reached, so selection within groups is not random and the method is non-probability."
  - q: "How do you choose a sampling method?"
    a: "Start from your aim. If you need to estimate a population value, such as a percentage or mean, use a probability method and choose the type from the sampling frame you have and the budget: simple random with a full list, stratified when subgroups matter, cluster when the population is spread out. If you need depth, theory or access to a hidden group, use purposive, theoretical or snowball sampling."
---

# Probability vs non-probability sampling: methods, examples and a decision table

*Last updated: 14 November 2026*

In probability sampling, every member of the population has a known, non-zero chance of selection and chance decides who is chosen, so you can generalize and calculate a margin of error. In non-probability sampling, people are chosen by judgment, availability or referral, so the chances are unknown. Use probability methods to estimate how common something is, and non-probability methods for depth, theory, pilots or hard-to-reach groups.

This guide covers the five probability methods and five non-probability methods with examples from several fields, a decision table, the difference between sampling error and sampling bias, and what to write in a methods section. It is part of our series on [types of research design](/blog/types-of-research-design).

## What is the difference between probability and non-probability sampling?

**The difference is who decides who is in the sample: chance, with known probabilities, or a person, with unknown ones.** That one difference decides what you can claim.

| | Probability sampling | Non-probability sampling |
| --- | --- | --- |
| Who chooses | A random process | The researcher, interviewers or participants |
| Each unit's chance of selection | Known and above zero | Unknown; some units have no chance |
| Needs a sampling frame (a list) | Yes, at some stage | No |
| Margin of error | Can be calculated | Cannot be calculated validly for the population |
| Generalizes to the population | Statistically, with stated precision | Only by argument (theoretical or analytic generalization) |
| Typical uses | Surveys of prevalence, opinion polls, national statistics, audits | Qualitative studies, pilots, hidden populations, many lab experiments |
| Cost and speed | Higher and slower | Lower and faster |

Two terms come first. The **target population** is everyone you want to draw conclusions about. The **sampling frame** is the list you actually draw from, such as an enrollment register, a staff list or a map of households. Gaps between the two cause coverage error, whatever method you use [1].

## What are the types of probability sampling?

**The five main types are simple random, systematic, stratified, cluster and multistage sampling** [1], [2].

### Simple random sampling

**Every unit, and every possible sample of the same size, has the same chance of being chosen.** Number the frame, then use a random number generator to pick the sample.

**Example (illustrative), education:** a university has 8,400 undergraduates on its enrollment list. A researcher uses a random number generator to select 400 for an online survey about study habits.

Best when you have a complete list and the population is not spread out geographically. It can, by chance, under-represent small subgroups.

### Systematic sampling

**Choose a random start, then take every kth unit from the list, where k = population size ÷ sample size.**

**Example (illustrative), health:** a clinic wants 250 of its 5,000 patient records from last year for an audit. k = 5,000 / 250 = 20. A random number between 1 and 20 gives 7, so records 7, 27, 47 and so on are selected.

It is simple to run in the field. The risk is a list with a repeating pattern that matches k, such as a shift rota where every 20th record is a weekend.

### Stratified sampling

**Divide the population into non-overlapping subgroups (strata), then draw a random sample within each.** Strata are groups you want represented precisely: region, year of study, company size.

**Example (illustrative), business:** a survey of 2,000 firms stratifies by size. In **proportional allocation**, each stratum gets the same share of the sample as in the population. In **disproportionate allocation**, small strata are oversampled so they can be analyzed on their own, and the results are then weighted back.

| Firm size | Firms in population | Share | Proportional sample (n = 400) |
| --- | --- | --- | --- |
| Small (< 50 staff) | 1,400 | 70% | 280 |
| Medium (50 to 249) | 500 | 25% | 100 |
| Large (250+) | 100 | 5% | 20 |

Stratification usually reduces sampling error compared with simple random sampling of the same size, because it removes the chance of a lopsided mix [2].

### Cluster sampling

**Randomly select whole groups (clusters), such as schools, villages or hospital wards, then include everyone in them or a random sample inside them.** You need a list of clusters, not of individuals.

**Example (illustrative), social science:** to survey households in a district with no household register, a team randomly selects 30 of 210 villages and interviews every household in them.

Cluster sampling saves travel and listing costs, but people in the same cluster tend to be alike, which increases sampling error. Kish's **design effect** measures the loss [1]:

> deff = 1 + (m − 1) × ICC

where m is the average number of people per cluster and ICC is the intraclass correlation of the outcome within clusters. With 20 people per cluster and an ICC of 0.05, deff = 1 + 19 × 0.05 = 1.95. You need about twice the sample: if a simple random sample of 400 would give your target precision, the cluster sample needs 400 × 1.95 = 780.

### Multistage sampling

**Sample in stages, using a different method at each.** Most national surveys work this way.

**Example (illustrative), engineering:** to estimate how many road bridges in a country show corrosion, inspectors (1) stratify regions by climate, (2) randomly select 12 districts per climate zone, (3) randomly select 15 bridges per district from the district's asset register, and (4) inspect a systematic sample of girders on each bridge.

Each stage adds its own sampling error, and the analysis must take the design into account. Analyzing a multistage sample as if it were simple random gives confidence intervals that are too narrow.

## What are the types of non-probability sampling?

**The five main types are convenience, purposive, quota, snowball and theoretical sampling.**

### Convenience sampling

**Include whoever is easiest to reach: students in your class, visitors to a website, patients in one clinic that week** [3].

**Example (illustrative), health:** a nursing student surveys the 85 staff on duty in one hospital during the two weeks of data collection.

Useful for pilots, for testing a questionnaire and for early exploration. It is the method most open to bias, because people who are easy to reach often differ from those who are not.

### Purposive sampling

**Choose participants deliberately because they have the experience or characteristics the study needs** [3], [4]. Patton describes many forms, among them maximum variation, typical case, extreme or deviant case, and criterion sampling [4].

**Example (illustrative), education:** a study of how schools introduce AI policies selects six schools for maximum variation: public and private, urban and rural, early and late adopters.

Purposive sampling is the default in qualitative research. The aim is information-rich cases, not representativeness.

### Quota sampling

**Set targets for subgroups that match the population's make-up, then fill each quota with whoever is available.**

**Example (illustrative), business:** a market research firm needs 500 online respondents matching national figures for age and gender, and stops recruiting in each age-gender group when its quota is full.

Quota samples look like stratified samples on the chosen variables, but selection inside each group is not random. People who join online panels, or who are at home when interviewers call, can differ from others in the same group on things the quotas do not control.

### Snowball sampling

**Start with a few eligible participants and ask each to refer others.** Goodman described an early form of the method in 1961 [5].

**Example (illustrative), social science:** a study of informal motorcycle-taxi drivers starts with five drivers met at a depot, each of whom introduces up to three colleagues.

It reaches hidden or stigmatized groups that have no list. The sample is shaped by people's social networks, so well-connected people are over-represented. **Respondent-driven sampling** adds referral coupons and network-size questions so that the results can be weighted, under strong assumptions [6].

### Theoretical sampling

**Choose the next participants or cases based on what the analysis so far shows you need to learn, until new data stop adding to the theory.** It comes from grounded theory [7].

**Example (illustrative), health:** after 10 interviews with patients who stopped a rehabilitation program, early codes suggest that transport cost matters. The researcher then recruits patients who live far from the clinic and some who live close, to test and refine that category.

Sampling and analysis happen at the same time. You stop at **theoretical saturation**, when new interviews no longer change the categories. In one well-known study, Guest, Bunce and Johnson found that most themes in their interview data had appeared within the first 12 interviews [8]. That is a finding from one study, not a rule; describe how you judged saturation in your own data.

## Which sampling method should you use? A decision table

**Start from your aim, then from the frame and resources you have.**

| Your situation | Method | Why |
| --- | --- | --- |
| Need a population estimate; have a full list; population in one place | Simple random | Simplest probability method; easy to analyze |
| Need a population estimate; have an ordered list; field team picks units | Systematic | Easy to apply on site; check the list for cycles |
| Subgroups must be compared or represented precisely | Stratified | Guarantees each subgroup; often more precise |
| Population spread out; no list of individuals, but a list of groups | Cluster | Cuts travel and listing costs; plan for the design effect |
| Large national or regional survey | Multistage | Combines stratification and clustering at each level |
| Pilot study or testing a questionnaire | Convenience | Fast; generalization is not the aim |
| Qualitative study needing information-rich cases | Purposive | Selects the experiences the question needs |
| Need a sample that matches population figures quickly, without a frame | Quota | Matches the make-up on chosen variables; still non-random |
| Hidden or hard-to-reach group with no list | Snowball or respondent-driven | Uses social networks to find participants |
| Grounded theory study | Theoretical | Sampling follows the emerging theory |

If you are still choosing between a survey and an interview study, our guide to [quantitative, qualitative and mixed methods](/blog/quantitative-qualitative-mixed-methods) comes first.

## Sampling error vs sampling bias

**Sampling error is random and shrinks as the sample grows; sampling bias is systematic and does not.**

| | Sampling error | Sampling bias |
| --- | --- | --- |
| Cause | Chance: any sample differs a little from the population | The way units were selected, or who responded |
| Direction | Random, both ways | One direction |
| Effect of a bigger sample | Gets smaller | Stays the same |
| Can be measured | Yes, with a probability sample (standard error, margin of error) | Not from the sample alone |
| Remedy | Bigger sample; stratification | Better frame; probability selection; follow-up of non-responders; weighting |

**Margin of error, worked (illustrative):** in a simple random sample of 400 students, 50% say they work part time. The 95% margin of error is 1.96 × √(0.5 × 0.5 / 400) = 1.96 × 0.025 = 0.049, about ±4.9 percentage points. To get ±5 points at the most conservative proportion (50%), you need n = 1.96² × 0.25 / 0.05² ≈ 384, before allowing for non-response or a design effect. For tests between groups, see [statistical power and sample size](/blog/statistical-power-and-sample-size).

**The classic lesson in bias:** in 1936 the *Literary Digest* mailed about 10 million straw-poll ballots and received roughly 2.4 million back. It predicted that Alf Landon would beat Franklin Roosevelt; Roosevelt won in a landslide. Squire's analysis of a 1937 Gallup survey concluded that a biased frame and, above all, differences in who chose to respond caused the failure [9]. A huge sample did not fix a biased one.

Non-response turns a probability sample into a partly self-selected one. Report your response rate, compare responders with the frame on known variables, and weight if you can. Dillman and colleagues set out practical steps to raise response in mail and online surveys [10].

## What to write in your methods section

**State the population, the frame, the method, the size and how it was justified, the response rate, and what the method lets you claim.**

1. **Target population and sampling frame,** with the frame's source, date and any known gaps.
2. **Method,** named precisely (for example, "stratified random sampling with proportional allocation by faculty").
3. **Sample size and justification:** a power calculation or margin of error for quantitative work; saturation or information power for qualitative work.
4. **Recruitment:** how and when people were contacted, and inclusion and exclusion criteria.
5. **Response:** numbers invited, responding and analyzed; a flow diagram helps.
6. **Analysis:** weights, design effect or survey-design methods used.
7. **Limits:** who might be missing, and how that limits generalization.

**Example write-up (illustrative), probability:** "We drew a stratified random sample of 600 from the 9,320 undergraduates on the university's enrollment list (March 2026), with proportional allocation across five faculties. A sample of 384 was needed for a margin of error of ±5 percentage points; we invited 600 to allow for a 65% response rate. Of those invited, 412 responded (68.7%). Responders were similar to the enrollment list on sex and faculty but included fewer part-time students (8% vs 14%), so results were weighted by faculty and mode of study."

**Example write-up (illustrative), non-probability:** "We used purposive sampling for maximum variation in hospital type and years of experience, recruiting 18 ward managers through professional networks. Recruitment continued until three successive interviews added no new codes. Findings describe this group's experience and are not intended to estimate how common these views are."

## Common mistakes

- **Calling a convenience sample "random"** because people were not hand-picked. Random means a documented random process.
- **Reporting a margin of error for an online opt-in or quota sample** as if it were a probability sample.
- **Ignoring the design effect** in cluster or multistage samples, which gives confidence intervals that are too narrow.
- **Treating a big sample as a cure for bias.** See the *Literary Digest*.
- **Not reporting the response rate,** or reporting only completed surveys.
- **Claiming qualitative results are representative.** Claim transferability and describe the context instead.

## How to plan your sample with AI for Research

AI for Research can help you see how others sampled similar populations and plan your own. Choosing and justifying the sample is still your decision, with your supervisor.

1. **See how others sampled (0 credits).** In [Find Papers](/features/paper-search), search your population and topic, and filter by study type (for example cross-sectional or qualitative). Open the methods in [Chat with PDF](/features/chat-with-pdf) and ask "How was the sample selected, and what was the response rate?"
2. **Get a cited overview.** Ask [Deep Research](/tools/deep-research) "What sampling methods have been used to reach [population]?" A Summary run costs 1 credit.
3. **Compare methods across papers.** The free [literature review matrix builder](/tools/literature-review-matrix-builder) lets you add a "sampling method" column and fill rows by DOI.
4. **Check your sample against the frame.** The free [data analysis tool](/tools/data-analysis) runs a chi-square test in your browser, so you can compare your sample's mix of, say, faculties with the frame's. It does not compute survey weights or design effects; use R's survey package, Stata or SPSS Complex Samples.
5. **Draft the section.** The **Methodology builder** in the Thesis Suite (3 credits) drafts the sampling section around the numbers you supply.

The Free plan includes 45 credits a month; search and the free tools cost nothing. See [pricing](/pricing).

## FAQ

### What is the difference between probability and non-probability sampling?

In probability sampling, every member of the population has a known, non-zero chance of being selected, and chance decides who is chosen. That lets you estimate sampling error and generalize to the population with stated precision. In non-probability sampling, the researcher or the participants decide who takes part, so the chances are unknown and you cannot calculate a valid margin of error for the population.

### What are the 5 types of probability sampling?

The five main types are simple random sampling (every unit has an equal chance), systematic sampling (every kth unit from a list after a random start), stratified sampling (random samples within subgroups such as region or year of study), cluster sampling (randomly chosen groups such as schools, with everyone or a sample inside them), and multistage sampling, which combines these in stages.

### Is convenience sampling ever acceptable?

Yes, for pilot studies, instrument testing, early exploratory work and experiments where the question is whether an effect exists rather than how common something is. It is not acceptable when you want to estimate a population figure such as prevalence. If you use it, describe who was reached and how, compare your sample with known population figures, and limit your claims about generalization.

### What is the difference between quota and stratified sampling?

Both divide the population into subgroups and fill each one. In stratified sampling, people within each stratum are chosen at random from a list, so it is a probability method. In quota sampling, interviewers or online panels fill each quota with whoever is available and willing until the target is reached, so selection within groups is not random and the method is non-probability.

### How do you choose a sampling method?

Start from your aim. If you need to estimate a population value, such as a percentage or mean, use a probability method and choose the type from the sampling frame you have and the budget: simple random with a full list, stratified when subgroups matter, cluster when the population is spread out. If you need depth, theory or access to a hidden group, use purposive, theoretical or snowball sampling.

## Next steps

- Work out how many people you need: [statistical power and sample size](/blog/statistical-power-and-sample-size).
- Write questions your sample can answer well: [dichotomous survey questions](/blog/dichotomous-questions).
- Make sure your measures hold up: [reliability vs validity](/blog/reliability-vs-validity).
- For qualitative samples, plan the analysis: [how to code qualitative data](/blog/how-to-code-qualitative-data).
- Put it all in your [methodology chapter](/blog/how-to-write-a-methodology-chapter).

## Sources

1. Kish, L. (1965). *Survey Sampling*. John Wiley & Sons.
2. Cochran, W. G. (1977). *Sampling Techniques* (3rd ed.). John Wiley & Sons.
3. Etikan, I., Musa, S. A., & Alkassim, R. S. (2016). Comparison of convenience sampling and purposive sampling. *American Journal of Theoretical and Applied Statistics, 5*(1), 1–4. https://doi.org/10.11648/j.ajtas.20160501.11
4. Patton, M. Q. (2015). *Qualitative Research and Evaluation Methods* (4th ed.). SAGE.
5. Goodman, L. A. (1961). Snowball sampling. *The Annals of Mathematical Statistics, 32*(1), 148–170. https://doi.org/10.1214/aoms/1177705148
6. Heckathorn, D. D. (1997). Respondent-driven sampling: A new approach to the study of hidden populations. *Social Problems, 44*(2), 174–199. https://doi.org/10.2307/3096941
7. Glaser, B. G., & Strauss, A. L. (1967). *The Discovery of Grounded Theory: Strategies for Qualitative Research*. Aldine.
8. Guest, G., Bunce, A., & Johnson, L. (2006). How many interviews are enough? An experiment with data saturation and variability. *Field Methods, 18*(1), 59–82. https://doi.org/10.1177/1525822X05279903
9. Squire, P. (1988). Why the 1936 Literary Digest poll failed. *Public Opinion Quarterly, 52*(1), 125–133. https://doi.org/10.1086/269085 <!-- VERIFY: the ballot figures (about 10 million mailed, about 2.4 million returned) as given in Squire (1988) -->
10. Dillman, D. A., Smyth, J. D., & Christian, L. M. (2014). *Internet, Phone, Mail, and Mixed-Mode Surveys: The Tailored Design Method* (4th ed.). John Wiley & Sons.
