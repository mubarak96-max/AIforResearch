---
title: "Dichotomous Questions: 24 Survey Examples and How to Analyze Them"
slug: "dichotomous-questions"
description: "What dichotomous survey questions are, when to use and avoid yes/no items, 24 examples by field, writing rules, and how to analyze them with proportions, chi-square and logistic regression."
primary_keyword: "dichotomous survey questions"
secondary_keywords: ["dichotomous questions", "yes no survey questions", "closed-ended questions", "true false questions", "dichotomous variable", "chi-square for yes no data", "logistic regression binary outcome", "dichotomous vs likert"]
cluster: "U. Research methods and design"
pillar: "/blog/types-of-research-design"
author: "Mubarak"
compares_tools: false
published: "2026-11-14"
updated: "2026-11-14"
faq:
  - q: "What is a dichotomous question?"
    a: "A dichotomous question is a closed-ended survey question with exactly two possible answers, such as yes or no, true or false, agree or disagree, or used or did not use. It produces a binary variable, usually coded 1 and 0, which you summarize as a proportion. It works best for facts and clear-cut behaviors that really do have only two states."
  - q: "When should you not use a dichotomous question?"
    a: "Avoid it when the true answer has degrees, such as satisfaction, frequency or strength of opinion, because two options force people with mild and strong views into the same box. Avoid it too when many respondents could honestly answer 'not sure' or 'does not apply' and you have not offered those options. In those cases a Likert scale, a frequency scale or a multiple-choice item measures better."
  - q: "How do you analyze yes/no survey data?"
    a: "Start with the proportion answering yes and its 95% confidence interval. To compare two or more groups, use a chi-square test of independence, or Fisher's exact test when expected counts are small. For the same people asked twice, use McNemar's test. To relate a yes/no outcome to several predictors at once, use binary logistic regression and report odds ratios with confidence intervals."
  - q: "Are agree/disagree questions dichotomous?"
    a: "Only if they offer exactly two options, agree or disagree. Most agree-disagree items in research use five or seven points, which makes them Likert-type items, not dichotomous. Two-option agree-disagree items are also prone to acquiescence, the tendency to agree regardless of content, so survey methodologists often recommend item-specific wording instead, such as asking directly how often or how much."
  - q: "What is the difference between dichotomous and Likert questions?"
    a: "A dichotomous question has two answer options and gives a binary variable; a Likert item has an ordered scale, usually five or seven points from strongly disagree to strongly agree, and gives an ordinal variable. Dichotomous items are faster and easier to answer and analyze, but lose information about intensity. Likert items capture degree, and several of them can be combined into a scale score."
---

# Dichotomous questions: 24 survey examples and how to analyze them

*Last updated: 14 November 2026*

A dichotomous question is a closed-ended survey question with exactly two answer options, such as yes/no, true/false or agree/disagree. Use it for facts and behaviors that really have two states ("Have you ever smoked?"), and avoid it for attitudes, frequency or intensity, where two options throw information away. Analyze the answers as proportions, compare groups with a chi-square test, and model them with logistic regression.

This guide covers when to use and avoid dichotomous questions, 24 examples across six fields, the writing rules, how to analyze the data, and how they compare with Likert and multiple-choice items. It is part of our series on [types of research design](/blog/types-of-research-design).

## What is a dichotomous question?

**A dichotomous question offers exactly two mutually exclusive answers, and it produces a binary variable.** The three common forms:

| Form | Example (illustrative) | Typical code |
| --- | --- | --- |
| Yes / no | Did you attend any lectures online this semester? | Yes = 1, No = 0 |
| True / false | True or false: antibiotics kill viruses. | Correct = 1, Incorrect = 0 |
| Agree / disagree (two options only) | I would recommend this course to a friend. Agree / Disagree | Agree = 1, Disagree = 0 |

Other two-option forms work the same way: used or did not use, passed or failed, present or absent, before or after a date.

A question is dichotomous only if both options cover every honest answer. "Are you employed? Yes / No" seems binary, but a retired person, a full-time student and someone on unpaid leave may all hesitate. If a sizable group could not answer truthfully, the question needs a third option or a different form.

In the [levels of measurement](/blog/operational-definition-of-variables), a dichotomous variable is nominal with two categories. When it is the outcome of a study, it is a binary dependent variable; see [independent vs dependent variables](/blog/independent-vs-dependent-variables).

## When should you use dichotomous questions?

**Use them when the thing you measure really has two states, when you need a quick screening or routing question, or when respondents need a fast, easy item.**

Good uses:

1. **Facts and past behavior:** "Have you received a flu vaccine in the past 12 months?"
2. **Eligibility and screening:** "Are you 18 or older?" decides who continues.
3. **Routing (skip logic):** "Do you own a car?" Yes leads to questions about the car.
4. **Knowledge tests:** true/false items scored correct or incorrect.
5. **Checklists of presence or absence:** "Does the lab have a written spill procedure?" in an audit.
6. **Short mobile surveys** and surveys of children or people with low literacy, where fewer options lower the effort.

## When should you avoid them?

**Avoid them when the answer has degrees, when many people would honestly say "it depends", or when you need to detect small changes.**

| Situation | Problem with yes/no | Better form |
| --- | --- | --- |
| Attitudes and satisfaction | Mild and strong views look the same | A 5- or 7-point rating or Likert item |
| Frequency | "Do you exercise?" means once a year to every day | A frequency scale: never, monthly, weekly, daily |
| Change over time | Small improvements do not move people from no to yes | A numeric or rating scale |
| Sensitive topics with real middle ground | Forces a choice people resent, raising drop-out | Add "prefer not to say"; use ranges |
| Many people lack the knowledge | Guessing adds noise | Add "don't know", or ask first whether they know |

Two-option agree/disagree items have a specific weakness: **acquiescence**, the tendency of some respondents to agree with statements whatever they say, which is stronger when people are tired or less engaged [2]. Saris and colleagues compared agree/disagree questions with item-specific ones (for example, "How satisfied are you…" with answers about satisfaction) and found the item-specific versions measured better [3]. Where you can, ask about the thing directly.

## 24 dichotomous question examples by field

All examples are illustrative, written for this guide.

### Health and clinical research

1. Have you smoked at least 100 cigarettes in your life? (Yes / No)
2. In the past 12 months, have you had a flu vaccination? (Yes / No)
3. Has a doctor or nurse ever told you that you have high blood pressure? (Yes / No)
4. Did the patient receive a falls-risk assessment within 24 hours of admission? (Yes / No; from the record)

### Education

5. Did you use the university library's online databases this semester? (Yes / No)
6. Have you ever repeated a course? (Yes / No)
7. True or false: the mean is always larger than the median. (True / False; knowledge item)
8. Does your school have a written policy on students' use of generative AI? (Yes / No / Don't know)

### Business and management

9. Has your company introduced a four-day working week for any staff? (Yes / No)
10. Did you make a purchase on our website in the past 30 days? (Yes / No)
11. Does your organization employ a dedicated data protection officer? (Yes / No / Don't know)
12. Would you recommend our service to a colleague? (Yes / No)

### Engineering and technology

13. Was the component inspected before installation? (Yes / No; inspection log)
14. Does the building have an automatic fire sprinkler system? (Yes / No)
15. Have you used version control (for example Git) in a project in the past year? (Yes / No)
16. Did the test specimen fail before reaching the design load? (Yes / No)

### Social science and public policy

17. Did you vote in the most recent national election? (Yes / No / Prefer not to say)
18. Do you have access to the internet at home? (Yes / No)
19. In the past month, have you done any unpaid volunteer work? (Yes / No)
20. Have you ever moved to another region for work? (Yes / No)

### Psychology and behavior

21. In the past two weeks, have you had trouble falling asleep on most nights? (Yes / No)
22. Have you ever used a meditation or mindfulness app? (Yes / No)
23. Did you notice the second stimulus on the screen? (Yes / No; manipulation check)
24. Did you guess the purpose of this experiment? (Yes / No; debriefing check)

A few of these show the third-option rule at work: items 8, 11 and 17 add "Don't know" or "Prefer not to say" because many honest respondents would need it. Health screening items such as 21 are prompts for further assessment, not a diagnosis; interpreting them for a person is a job for a qualified professional.

## How do you write a good dichotomous question?

**One idea per question, neutral wording, a clear time frame, and two options that cover every honest answer.** Dillman and colleagues give these rules in fuller form for mail and online surveys [1].

| Rule | Poor (illustrative) | Better |
| --- | --- | --- |
| One idea per question (no double-barreled items) | Do you find the course useful and well organized? | Do you find the course useful? / Do you find the course well organized? |
| Neutral wording | Don't you agree that the new policy is unfair? | Do you support the new policy? |
| Give a time frame | Have you been to the dentist? | Have you been to a dentist in the past 12 months? |
| Define vague terms | Do you exercise regularly? | In the past 7 days, did you do at least 30 minutes of exercise on 3 or more days? |
| Avoid double negatives | Do you disagree that staff should not work weekends? | Should staff be required to work weekends? |
| Cover every honest answer | Are you married? | What is your marital status? (multiple choice), or add "Other" |
| Balance the question stem | Do you support the plan? | Do you support or oppose the plan? |
| Be careful with "forbid" and "allow" | Should the city allow street protests? | Pilot both wordings; report the one used |

The last row matters because logically equal wordings can give different results. In a classic split-ballot experiment in 1941, Rugg found that more Americans were willing to "not allow" speeches against democracy than to "forbid" them [4], and Schuman and Presser later reproduced the pattern [5]. <!-- VERIFY: Rugg (1941) percentages, commonly reported as 62% "not allow" vs 46% "forbid" --> Small wording changes in a two-option question can shift the answer.

**Before you field the survey,** pilot the questions with five to ten people from your population and ask them to think aloud. If anyone says "it depends" or hesitates between the options, the item needs work.

## How do you analyze dichotomous survey data?

**Summarize with proportions and confidence intervals, compare groups with chi-square, and model several predictors with logistic regression** [6].

### 1. Proportions with a confidence interval

Code yes as 1 and no as 0. The mean of that column is the proportion answering yes.

**Worked example (illustrative):** 120 of 200 first-year students say yes to "Did you use the library's online databases this semester?"

- p = 120 / 200 = 0.60
- SE = √(0.60 × 0.40 / 200) = 0.0346
- 95% CI = 0.60 ± 1.96 × 0.0346 = 0.53 to 0.67

This simple (Wald) interval is fine for moderate proportions and samples. For proportions near 0 or 1, or small samples, the Wilson interval is more accurate [6].

### 2. Comparing groups: chi-square test

**Worked example (illustrative):** the same question is asked of 200 final-year students, of whom 90 say yes.

| | Yes | No | Total |
| --- | --- | --- | --- |
| First year | 120 | 80 | 200 |
| Final year | 90 | 110 | 200 |
| Total | 210 | 190 | 400 |

For a 2 × 2 table, χ² = N(ad − bc)² / [(a + b)(c + d)(a + c)(b + d)]:

- ad − bc = 120 × 110 − 80 × 90 = 13,200 − 7,200 = 6,000
- χ² = 400 × 6,000² / (200 × 200 × 210 × 190) = 14,400,000,000 / 1,596,000,000 = 9.02
- df = 1, p ≈ .003
- Effect size φ = √(9.02 / 400) = 0.15

**Write-up:** "A higher proportion of first-year students (60%) than final-year students (45%) reported using the online databases, χ²(1, N = 400) = 9.02, p = .003, φ = 0.15."

Use **Fisher's exact test** when any expected count is below 5. Use **McNemar's test** when the same people answer twice, such as before and after a training session, because the answers are paired. Our [t-test vs ANOVA vs chi-square](/blog/t-test-vs-anova-vs-chi-square) guide covers when chi-square fits.

### 3. Several predictors: logistic regression

**Binary logistic regression models the odds of a yes answer from one or more predictors, and reports each effect as an odds ratio** [7].

In the table above, the unadjusted odds ratio is (120 × 110) / (80 × 90) = 1.83: first-year students had 1.83 times the odds of using the databases. A logistic model could then add age, faculty and part-time status, to see whether the year-of-study difference holds after accounting for them.

**Example interpretation (illustrative):** "After adjusting for faculty and part-time status, first-year students had higher odds of using the online databases (OR = 1.74, 95% CI 1.15 to 2.63)." Logistic regression needs enough events per predictor; a common rule of thumb is at least 10 of the less frequent outcome per predictor, though this is debated [7]. For sample size, see [statistical power and sample size](/blog/statistical-power-and-sample-size).

### 4. Scales made of yes/no items

If several yes/no items form a scale, such as a 20-item true/false knowledge test, sum them for a total score. Their internal consistency is measured with the Kuder-Richardson formula 20 (KR-20), which is Cronbach's alpha for binary items [8]. See [reliability vs validity](/blog/reliability-vs-validity) for thresholds.

## Dichotomous vs Likert vs multiple choice

**Choose by what you need to measure: a state (dichotomous), a degree (Likert or rating), or a category among several (multiple choice).**

| | Dichotomous | Likert or rating scale | Multiple choice |
| --- | --- | --- | --- |
| Options | Two | Usually 5 or 7 ordered points | Three or more categories, one or several chosen |
| Variable produced | Binary (nominal) | Ordinal; a sum of items is often treated as interval | Nominal (or ordinal if ordered) |
| Best for | Facts, behaviors, screening, routing, knowledge | Attitudes, satisfaction, agreement, intensity | Choices among options: mode of transport, main reason, faculty |
| Respondent effort | Lowest | Moderate | Moderate to high with long lists |
| Information captured | Least | Degree and direction | Which category |
| Main risk | Forcing nuanced answers into two boxes | Midpoint overuse; acquiescence with agree/disagree | Missing options; order effects |
| Typical analysis | Proportions, chi-square, logistic regression | Medians, nonparametric tests; scale scores with t-test or ANOVA | Frequencies, chi-square, multinomial logistic regression |

Likert described the summed rating method in 1932 [9]. A Likert item can always be collapsed into a dichotomy later (agree vs not), but a dichotomous item cannot be expanded. When in doubt during design, collect the finer measure.

## Common mistakes

- **Asking about attitudes with yes/no** and then reporting "60% are satisfied" when many were lukewarm.
- **Double-barreled items** that ask two things at once.
- **No time frame,** so "ever", "this year" and "usually" all get mixed.
- **Leaving out "don't know" or "not applicable"** where many people need them, which forces guesses.
- **Leading wording** that suggests the expected answer.
- **Treating paired before-and-after answers as independent groups;** use McNemar's test.
- **Running dozens of chi-square tests without a plan,** which inflates false positives. Decide your main comparisons in advance.

## How to write and analyze survey questions with AI for Research

AI for Research has tools for each step from question to write-up. They help you draft and calculate; the design choices stay yours.

1. **See how others asked it (0 credits).** In [Find Papers](/features/paper-search), search for validated questions on your topic, and open the questionnaire appendix in [Chat with PDF](/features/chat-with-pdf) to see the exact wording used.
2. **Build the survey.** The **Survey builder** creates questionnaires with one-choice (including yes/no), multiple-choice, rating-scale (Likert), number and text questions, and collects anonymous online responses. Building costs no credits; AI drafting costs 3 credits and an AI check of your questions costs 2.
3. **Analyze the answers.** The free [data analysis tool](/tools/data-analysis) gives proportions and runs a chi-square test from a CSV in your browser, and your data never leaves your device. **Data Lab**, the statistics workspace, adds Fisher's exact test, McNemar's test for paired yes/no answers, and logistic regression with odds ratios and 95% CIs, at 0 credits; an AI-written results section costs 2.
4. **Write it up.** The [research paper writer](/tools/research-paper-writer) can draft a results section around numbers you have calculated; check every figure against your output.

The Free plan includes 45 credits a month; search and the free tools cost nothing. See [pricing](/pricing). For health questionnaires, any screening cut-off or clinical interpretation needs review by a qualified professional.

## FAQ

### What is a dichotomous question?

A dichotomous question is a closed-ended survey question with exactly two possible answers, such as yes or no, true or false, agree or disagree, or used or did not use. It produces a binary variable, usually coded 1 and 0, which you summarize as a proportion. It works best for facts and clear-cut behaviors that really do have only two states.

### When should you not use a dichotomous question?

Avoid it when the true answer has degrees, such as satisfaction, frequency or strength of opinion, because two options force people with mild and strong views into the same box. Avoid it too when many respondents could honestly answer 'not sure' or 'does not apply' and you have not offered those options. In those cases a Likert scale, a frequency scale or a multiple-choice item measures better.

### How do you analyze yes/no survey data?

Start with the proportion answering yes and its 95% confidence interval. To compare two or more groups, use a chi-square test of independence, or Fisher's exact test when expected counts are small. For the same people asked twice, use McNemar's test. To relate a yes/no outcome to several predictors at once, use binary logistic regression and report odds ratios with confidence intervals.

### Are agree/disagree questions dichotomous?

Only if they offer exactly two options, agree or disagree. Most agree-disagree items in research use five or seven points, which makes them Likert-type items, not dichotomous. Two-option agree-disagree items are also prone to acquiescence, the tendency to agree regardless of content, so survey methodologists often recommend item-specific wording instead, such as asking directly how often or how much.

### What is the difference between dichotomous and Likert questions?

A dichotomous question has two answer options and gives a binary variable; a Likert item has an ordered scale, usually five or seven points from strongly disagree to strongly agree, and gives an ordinal variable. Dichotomous items are faster and easier to answer and analyze, but lose information about intensity. Likert items capture degree, and several of them can be combined into a scale score.

## Next steps

- Choose who answers your survey: [probability vs non-probability sampling](/blog/probability-vs-non-probability-sampling).
- Check that your items measure what you intend: [reliability vs validity](/blog/reliability-vs-validity).
- Pick the right test for your data: [which statistical test to use](/blog/which-statistical-test-to-use).
- Define each variable before you write the question: [operational definition of variables](/blog/operational-definition-of-variables).
- See how surveys fit other designs: [types of research design](/blog/types-of-research-design).

## Sources

1. Dillman, D. A., Smyth, J. D., & Christian, L. M. (2014). *Internet, Phone, Mail, and Mixed-Mode Surveys: The Tailored Design Method* (4th ed.). John Wiley & Sons.
2. Krosnick, J. A. (1991). Response strategies for coping with the cognitive demands of attitude measures in surveys. *Applied Cognitive Psychology, 5*(3), 213–236. https://doi.org/10.1002/acp.2350050305
3. Saris, W. E., Revilla, M., Krosnick, J. A., & Shaeffer, E. M. (2010). Comparing questions with agree/disagree response options to questions with item-specific response options. *Survey Research Methods, 4*(1), 61–79. https://doi.org/10.18148/srm/2010.v4i1.2682
4. Rugg, D. (1941). Experiments in wording questions: II. *Public Opinion Quarterly, 5*(1), 91–92. https://doi.org/10.1086/265467 <!-- VERIFY: DOI and page range for Rugg (1941) -->
5. Schuman, H., & Presser, S. (1981). *Questions and Answers in Attitude Surveys: Experiments on Question Form, Wording, and Context*. Academic Press.
6. Agresti, A. (2019). *An Introduction to Categorical Data Analysis* (3rd ed.). John Wiley & Sons. <!-- VERIFY: publication year of the 3rd edition (2018 or 2019) -->
7. Hosmer, D. W., Lemeshow, S., & Sturdivant, R. X. (2013). *Applied Logistic Regression* (3rd ed.). John Wiley & Sons.
8. Kuder, G. F., & Richardson, M. W. (1937). The theory of the estimation of test reliability. *Psychometrika, 2*(3), 151–160. https://doi.org/10.1007/BF02288391
9. Likert, R. (1932). A technique for the measurement of attitudes. *Archives of Psychology, 22*(140), 1–55.
