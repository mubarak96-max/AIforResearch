---
title: "Independent vs Dependent Variables: Definitions, Examples, Quiz"
slug: "independent-vs-dependent-variables"
description: "What independent and dependent variables are, how to spot them in any study or sentence, how control, confounding, mediating and moderating variables fit in, plus a quiz."
primary_keyword: "what are dependent and independent variables"
secondary_keywords: ["independent vs dependent variables", "independent variable definition", "dependent variable definition", "control variable", "confounding variable", "mediating vs moderating variable", "independent and dependent variable examples"]
cluster: "U. Research methods and design"
pillar: "/blog/types-of-research-design"
author: "Mubarak"
compares_tools: false
published: "2026-11-14"
updated: "2026-11-14"
faq:
  - q: "What is the difference between an independent and a dependent variable?"
    a: "The independent variable is the one the researcher changes, assigns or uses to group participants: the presumed cause. The dependent variable is the outcome the researcher measures: the presumed effect. The dependent variable is so called because its value is expected to depend on the independent variable. In 'Does caffeine improve reaction time?', caffeine is independent and reaction time is dependent."
  - q: "How do you identify the independent and dependent variable?"
    a: "Rewrite the study as 'the effect of ___ on ___'. The first blank is the independent variable and the second is the dependent variable. You can also ask which variable the researcher changed or grouped people by (independent), and which was measured at the end to see what happened (dependent). On a graph, the independent variable usually goes on the x-axis and the dependent variable on the y-axis."
  - q: "Can a study have more than one independent or dependent variable?"
    a: "Yes. A factorial experiment can test two or more independent variables at once, such as dose and timing of a drug, and see whether they interact. A study can also measure several dependent variables, such as test scores, attendance and well-being. Name one primary outcome in advance, so you are not tempted to report only the results that came out significant."
  - q: "What is the difference between a control variable and a control group?"
    a: "A control variable is a factor kept the same for everyone, or adjusted for in the analysis, so it cannot explain the result, such as room temperature in a plant experiment or age in a regression. A control group is a set of participants who do not receive the treatment, so their outcome shows what would have happened without it. A good experiment usually has both."
  - q: "What is the difference between a mediator and a moderator?"
    a: "A mediator explains how or why the independent variable affects the dependent variable: it sits on the path between them. A moderator changes the strength or direction of that effect: it decides for whom or when the effect is larger. Exercise may reduce depression through better sleep (mediator), and the effect may be larger in older adults (moderator)."
---

# Independent vs dependent variables: how to tell them apart

*Last updated: 14 November 2026*

An independent variable is the factor a researcher changes, assigns or groups by, the presumed cause. A dependent variable is the outcome the researcher measures to see whether it changes, the presumed effect. In "Does extra sleep improve exam scores?", sleep is the independent variable and exam score is the dependent variable, because the score is expected to depend on sleep.

This guide shows how to find both in any study or sentence, explains control, confounding, mediating and moderating variables, gives examples from five fields, and ends with a quiz. It is part of our [types of research design](/blog/types-of-research-design) series.

## What is an independent variable?

**An independent variable (IV) is the variable a researcher manipulates or uses to define groups, in order to see its effect on an outcome.** In an experiment the researcher sets its values, called levels or conditions: a drug or placebo, 0, 50 or 100 grams of fertilizer, a new or old teaching method. In an observational study the researcher cannot set it, but treats it as the explanatory factor: smoking status, years of education, firm size.

The IV is "independent" because, in the study, nothing else in the model is assumed to cause it.

## What is a dependent variable?

**A dependent variable (DV) is the outcome a researcher measures to see whether it changes when the independent variable changes.** Its value is assumed to depend on the IV. Examples are blood pressure, exam score, sales per month, tensile strength or a burnout score.

Every DV needs an exact measure: the instrument, the scoring and the unit. Our guide to the [operational definition of variables](/blog/operational-definition-of-variables) shows how to write one.

## What other names do they go by?

**Different fields use different names for the same two roles, so learn to recognize all of them.**

| Field or method | Independent variable | Dependent variable |
| --- | --- | --- |
| Experiments, psychology | Independent variable, treatment, factor | Dependent variable, outcome |
| Epidemiology, medicine | Exposure, intervention, risk factor | Outcome, endpoint |
| Regression, economics | Predictor, explanatory variable, regressor, covariate | Response, outcome, regressand |
| Machine learning | Features, inputs | Target, label |
| Older research texts | Stimulus | Response, criterion |

In observational research, "predictor" and "outcome" are often better words, because "independent" can suggest a causal claim the design cannot support.

## How do you identify the independent and dependent variable?

**Rewrite the study as "the effect of [IV] on [DV]"; if that sentence makes sense, you have them the right way round.** Then check with three questions.

1. **What did the researcher change, assign or group people by?** That is the IV.
2. **What was measured at the end to see what happened?** That is the DV.
3. **Which comes first in time?** The IV comes before, or is fixed before, the DV.

### Sentence patterns that give them away

| Sentence pattern | IV | DV |
| --- | --- | --- |
| The effect of **A** on **B** | A | B |
| Does **A** affect / increase / reduce **B**? | A | B |
| **B** as a function of **A** | A | B |
| **B** differs by **A** | A (the grouping) | B |
| Is **A** associated with **B**? | A (by convention, the first named) | B |
| **B** was measured under three levels of **A** | A | B |

**Worked example (illustrative), engineering.** "We tested whether curing temperature (10, 20 and 30 °C) changes the 28-day compressive strength of concrete cylinders." The researcher sets the temperature, so curing temperature is the IV, with three levels. Strength is measured at the end, so compressive strength is the DV.

**Worked example (illustrative), business.** "Customers who saw the free-shipping banner spent more per order than those who did not." The banner (shown or not) is the IV; spend per order is the DV.

### How to put them on a graph

By convention, the IV goes on the x-axis and the DV on the y-axis. If you plot dose against response, dose is on the x-axis.

## What is a control variable?

**A control variable is a factor that could affect the dependent variable, which the researcher holds constant or adjusts for so it cannot explain the result.** It is not the focus of the study.

There are two ways to control a variable:

- **By design:** keep it the same for everyone. In a plant experiment (illustrative), all pots get the same soil, light, water and pot size, so only fertilizer varies.
- **By analysis:** measure it and include it in the statistical model. In a survey of income and health (illustrative), age and sex are added to the regression so they cannot explain the association.

A control variable is not a control group. The difference is explained in our guide to the [controlled experiment](/blog/controlled-experiment).

## What is a confounding variable?

**A confounding variable (confounder) is a third variable that affects both the independent and the dependent variable, creating a false association or hiding a real one.** To be a confounder, it must be related to the IV, affect the DV, and not be a step on the path between them [1].

**Example (illustrative), health:** a study finds coffee drinkers have more lung cancer. Smoking is a likely confounder: in this population, smokers drink more coffee, and smoking causes lung cancer. Once smoking is accounted for, the link between coffee and cancer may disappear.

How to deal with confounders:

| Method | Stage | How it works |
| --- | --- | --- |
| Random assignment | Design | Balances confounders, known and unknown, across groups on average |
| Restriction | Design | Study only one level (only non-smokers) |
| Matching | Design | Pair each exposed person with an unexposed one who is similar on the confounder |
| Stratification | Analysis | Analyze within each level (smokers and non-smokers separately) |
| Statistical adjustment | Analysis | Include the confounder in a regression model |

Only randomization deals with confounders you did not measure. That is why experiments give stronger evidence of cause than observational studies [2].

## What are mediating and moderating variables?

**A mediator explains how or why the independent variable affects the dependent variable; a moderator changes how strongly, or in which direction, it does.** Baron and Kenny's 1986 paper set out the distinction, and it is still the standard reference for the terms [3].

| | Mediator | Moderator |
| --- | --- | --- |
| Question it answers | How or why does X affect Y? | When, or for whom, does X affect Y? |
| Position | On the path: X → M → Y | Outside the path, acting on the X → Y link |
| Example (illustrative) | Exercise reduces depression partly through better sleep | Exercise reduces depression more in older adults |
| Tested by | The indirect effect of X on Y through M | An interaction term (X × W) in a regression or ANOVA |

**Example (illustrative), education.** A mentoring program (IV) raises first-year retention (DV). Interviews and surveys suggest it works by raising students' sense of belonging (mediator). The effect is larger for first-generation students than for others (moderator: first-generation status).

A note on method: Baron and Kenny proposed testing mediation through a series of regression steps. Most methodologists now recommend estimating the indirect effect directly, with a bootstrap confidence interval, as set out by Hayes [4]. A mediation claim is also a causal claim, so cross-sectional data alone rarely supports it.

## Other variable types you may meet

- **Extraneous variable:** any variable other than the IV that could affect the DV. If it also relates to the IV, it is a confounder.
- **Covariate:** a variable included in the analysis to improve precision or adjust for differences, such as a pretest score in ANCOVA.
- **Categorical and continuous:** a variable's level of measurement decides which test you can run. See [which statistical test to use](/blog/which-statistical-test-to-use).

## Independent and dependent variable examples across fields

All examples below are illustrative.

| Field | Research question | IV | DV | A likely control or confounder |
| --- | --- | --- | --- | --- |
| Health | Does a 12-week walking program lower systolic blood pressure in adults with hypertension? | Walking program vs usual care | Systolic blood pressure (mmHg) | Medication changes |
| Education | Do students given worked examples solve more algebra problems than those given practice only? | Teaching method | Problems solved correctly (out of 20) | Prior math score |
| Business | Does offering a two-month free trial increase subscription sign-ups? | Trial length (none, one, two months) | Sign-up rate | Season, ad spend |
| Engineering | Does fiber content change the flexural strength of concrete beams? | Steel fiber content (0%, 0.5%, 1%) | Flexural strength (MPa) | Curing time and temperature |
| Psychology | Does social media use before bed relate to sleep duration in teenagers? | Minutes of use in the hour before bed | Sleep duration (hours) | Age, school start time |
| Environmental science | Does distance from a road affect lead concentration in soil? | Distance (m) | Lead concentration (mg/kg) | Soil type |
| Agriculture | Does irrigation frequency affect maize yield? | Irrigation schedule | Yield (t/ha) | Rainfall, soil fertility |

## Self-test quiz

Name the independent variable and the dependent variable in each study (all illustrative). Answers follow.

1. A researcher gives one group of mice a high-fat diet and another a normal diet for eight weeks, then weighs them.
2. A survey asks 2,000 adults how many hours they work per week and rates their stress on a 0 to 40 scale.
3. A website shows half its visitors a green "Buy" button and half a blue one, and records how many click.
4. A teacher compares the reading scores of pupils who had daily phonics lessons with those who had weekly ones.
5. An engineer measures how long batteries last at 0, 25 and 45 °C.
6. A study follows 5,000 smokers and non-smokers for 20 years to see who develops heart disease.
7. Nurses test whether patients given a printed leaflet before surgery report less anxiety than those given a verbal briefing.
8. Bonus: in question 7, the effect is stronger in patients having surgery for the first time. What kind of variable is "first surgery"?

### Answers

1. **IV:** diet (high-fat or normal). **DV:** body weight.
2. **IV (predictor):** hours worked per week. **DV (outcome):** stress score. This is correlational, so it shows association, not cause.
3. **IV:** button color. **DV:** click-through (clicked or not).
4. **IV:** phonics frequency (daily or weekly). **DV:** reading score.
5. **IV:** temperature, with three levels. **DV:** battery life.
6. **IV (exposure):** smoking status. **DV (outcome):** heart disease (yes or no). A cohort study; see [what a cohort study is](/blog/cohort-study).
7. **IV:** type of pre-surgery information (leaflet or verbal). **DV:** reported anxiety.
8. **Moderator.** It changes the strength of the effect of the IV on the DV.

## Common mistakes

- **Reversing them.** Check with "the effect of [IV] on [DV]". "The effect of exam scores on sleep" sounds wrong, so sleep is the IV.
- **Listing a level as a variable.** "Placebo" is a level; "treatment group (drug or placebo)" is the variable.
- **Calling a correlational predictor a cause.** Use "associated with" unless the design supports cause.
- **Forgetting confounders.** For every IV, ask what else could affect both it and the DV.
- **Calling a confounder a mediator.** A confounder causes both X and Y; a mediator is caused by X and then affects Y.

## How to define your variables with AI for Research

1. **Draft variables from your question (3 credits).** The **Hypotheses** module in the Thesis Suite takes your research question and drafts testable hypotheses, each with its independent, dependent and control variables, the expected direction with cited papers, and the null hypothesis.
2. **Operationalize them (3 credits).** The [variable operationalization](/features/variable-operationalization) module gives each construct an indicator, an instrument and a level of measurement.
3. **Check what others measured (0 credits).** In [Find Papers](/features/paper-search), search your topic, filter by study type, and read how similar studies defined and controlled their variables.
4. **Analyze the relationship (free).** The [data analysis tool](/tools/data-analysis) runs correlations, t-tests and chi-square on a CSV in your browser.

The Free plan has 45 credits a month; see [pricing](/pricing). Limits: the modules suggest variables and confounders from the literature they find, but they cannot know which ones you can measure in your setting. Check each with your supervisor.

## FAQ

### What is the difference between an independent and a dependent variable?

The independent variable is the one the researcher changes, assigns or uses to group participants: the presumed cause. The dependent variable is the outcome the researcher measures: the presumed effect. The dependent variable is so called because its value is expected to depend on the independent variable. In 'Does caffeine improve reaction time?', caffeine is independent and reaction time is dependent.

### How do you identify the independent and dependent variable?

Rewrite the study as 'the effect of ___ on ___'. The first blank is the independent variable and the second is the dependent variable. You can also ask which variable the researcher changed or grouped people by (independent), and which was measured at the end to see what happened (dependent). On a graph, the independent variable usually goes on the x-axis and the dependent variable on the y-axis.

### Can a study have more than one independent or dependent variable?

Yes. A factorial experiment can test two or more independent variables at once, such as dose and timing of a drug, and see whether they interact. A study can also measure several dependent variables, such as test scores, attendance and well-being. Name one primary outcome in advance, so you are not tempted to report only the results that came out significant.

### What is the difference between a control variable and a control group?

A control variable is a factor kept the same for everyone, or adjusted for in the analysis, so it cannot explain the result, such as room temperature in a plant experiment or age in a regression. A control group is a set of participants who do not receive the treatment, so their outcome shows what would have happened without it. A good experiment usually has both.

### What is the difference between a mediator and a moderator?

A mediator explains how or why the independent variable affects the dependent variable: it sits on the path between them. A moderator changes the strength or direction of that effect: it decides for whom or when the effect is larger. Exercise may reduce depression through better sleep (mediator), and the effect may be larger in older adults (moderator).

## Next steps

- Turn your variables into predictions: [how to write a hypothesis](/blog/how-to-write-a-hypothesis).
- Design a study that tests them: [what is a controlled experiment](/blog/controlled-experiment).
- Measure them well: [reliability vs validity](/blog/reliability-vs-validity).
- Choose the overall design: [types of research design](/blog/types-of-research-design).

## Sources

1. Hernán, M. A., & Robins, J. M. (2020). *Causal Inference: What If*. Chapman & Hall/CRC.
2. Shadish, W. R., Cook, T. D., & Campbell, D. T. (2002). *Experimental and Quasi-Experimental Designs for Generalized Causal Inference*. Houghton Mifflin.
3. Baron, R. M., & Kenny, D. A. (1986). The moderator–mediator variable distinction in social psychological research: conceptual, strategic, and statistical considerations. *Journal of Personality and Social Psychology, 51*(6), 1173–1182. https://doi.org/10.1037/0022-3514.51.6.1173
4. Hayes, A. F. (2018). *Introduction to Mediation, Moderation, and Conditional Process Analysis: A Regression-Based Approach* (2nd ed.). Guilford Press.
