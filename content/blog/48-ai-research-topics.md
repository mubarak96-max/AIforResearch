---
title: "100 AI Research Topics for 2026 (by Field and Level)"
slug: "ai-research-topics"
description: "100 specific AI research topics for 2026, grouped by field and tagged for undergraduate, master's or PhD level, plus how to choose one and check it is new."
primary_keyword: "ai research topics"
secondary_keywords: ["research topic about ai", "research on artificial intelligence", "ai research projects", "paper on ai", "thesis about ai", "ai research topics for students", "artificial intelligence research topics"]
cluster: "Q. AI research tools"
pillar: "/blog/best-ai-for-research"
author: "Mubarak"
compares_tools: false
published: "2026-11-12"
updated: "2026-11-12"
faq:
  - q: "What are good research topics on AI?"
    a: "Good AI research topics are narrow, use data you can get, and answer a question someone needs answered. 'AI in healthcare' is a theme; 'How well does a chest X-ray classifier trained on one hospital's images perform on another's?' is a topic. Strong areas in 2026 include evaluation of language models, AI in education and assessment, fairness audits, energy use of models, and AI regulation."
  - q: "What are AI research topics for students?"
    a: "Undergraduates do best with topics that use public datasets or pretrained models and a clear comparison, such as testing two open models on a public benchmark, surveying how students at one college use chatbots, or auditing a classifier for bias across groups. Avoid topics that need training large models, private data or ethics approval you cannot get in one semester."
  - q: "How do I narrow down an AI research topic?"
    a: "Fix four things: one task or application, one population or dataset, one method or model family, and one outcome you can measure. Then write it as a question. 'AI and climate' becomes 'Can a model trained on Sentinel-2 imagery map small farm boundaries in Kenya as accurately as manual digitizing?' Check that a dataset exists before you commit."
  - q: "Can I do AI research without a powerful GPU?"
    a: "Yes. Many strong topics need no training at all: evaluating existing models through their APIs or free open weights, fine-tuning small models, auditing datasets, studying how people use AI tools, or analyzing AI policy. Free notebook services and university clusters cover modest compute. Pick a question where the contribution is the design of the study, not the size of the model."
  - q: "How do I know if an AI topic has already been researched?"
    a: "Search for it in a scholarly index such as OpenAlex, Semantic Scholar or your library's databases, plus arXiv for recent preprints, and read the two or three closest papers. Look at their limitations and future work sections. A topic is still open if you change the population, the data, the setting or the method in a way those papers flag as untested."
---

# 100 AI research topics for 2026, by field and level

*Last updated: 12 November 2026*

The best AI research topics name one task, one dataset or population, one method and one measurable outcome. Below are 100 specific topics across ten fields, each tagged UG (undergraduate), MA (master's) or PhD by the scope and resources it needs. Pick one close to data you can get, then check that the exact question is not already answered.

This list is for students choosing a thesis about AI, a capstone or an AI research project, and for supervisors suggesting topics. It is part of our series on [the best AI for research](/blog/best-ai-for-research).

## What makes a good AI research topic?

**A researchable AI topic is a question narrow enough to answer with data and methods you can access in the time you have, whose answer would change what someone does or believes.** Themes such as "AI in healthcare" are starting points, not topics.

| Vague theme | Researchable topic |
| --- | --- |
| AI in education | Do feedback comments from a language model change revision quality in first-year essays compared with peer feedback? |
| AI and bias | Does a public face-detection model's miss rate differ by skin tone on a balanced benchmark? |

## How do you choose an AI research topic?

Pick the topic that passes all five checks, not the most exciting one.

1. **Start from data.** List the datasets, documents or participants you can actually get. A topic without data is a wish.
2. **Check compute.** Evaluating or fine-tuning small models is possible on a laptop or a free notebook; training large models is not.
3. **Check ethics.** Anything with human participants, health records or personal data needs approval. Allow time for it.
4. **Match your supervisor.** A topic near their expertise gets better feedback.
5. **Check novelty.** Search the exact question; read the two or three closest papers and their future-work sections.

Then write the topic as one research question. See [how to write a research question](/blog/how-to-write-a-research-question) for FINER and PICO, and [how to find a research gap](/blog/how-to-find-a-research-gap) for methods.

## AI in healthcare

Clinical topics need a professional's review and usually ethics approval; public datasets such as MIMIC-IV [1] and CheXpert [2] require registration and a data use agreement.

1. Does a chest X-ray classifier trained on CheXpert keep its accuracy on images from a different hospital? (MA)
2. How often do chatbot answers to common patient questions about medication interactions match pharmacist answers? (UG)
3. Can a model predict ICU readmission within 72 hours from MIMIC-IV notes better than from structured data alone? (PhD)
4. How do clinicians rate AI-drafted discharge summaries against human-written ones for omissions? (MA)
5. Do skin-lesion classifiers perform differently on darker skin tones in public dermatology datasets? (MA)
6. What share of AI-generated answers to health questions cite a source that exists and supports the claim? (UG)
7. Can speech features from smartphone recordings flag early Parkinson's symptoms in a public voice dataset? (PhD)
8. How do nurses in one hospital use AI scribes, and what errors do they correct? (MA, qualitative)
9. Does uncertainty reporting in a diagnostic model change radiology residents' decisions in a simulated reading task? (PhD)
10. How accurately do language models extract adverse events from published case reports in PubMed? (MA)

## AI in education

11. Do language-model feedback comments improve revision quality in first-year essays compared with peer feedback? (MA)
12. How do students at one university describe their own use of chatbots for coursework? (UG, survey)
13. Can a model grade short-answer physics questions with agreement close to two human graders (Cohen's kappa)? (MA)
14. Do AI tutors that ask questions instead of giving answers lead to better test scores in an algebra unit? (PhD)
15. How do university AI policies differ between disciplines in one country? (UG, document analysis)
16. Do AI-generated multiple-choice questions match teacher-written ones on difficulty and discrimination? (MA)
17. How accurately do AI-text detectors classify essays by non-native English writers? (MA)
18. Does access to an AI writing assistant change the vocabulary diversity of student essays over a term? (PhD)
19. What do secondary teachers use AI for in lesson planning, and what do they reject? (UG, interviews)
20. Can learning analytics models predict course dropout by week 4 in an open online course dataset? (MA)

## AI in law, governance and policy

21. How do AI-generated summaries of contracts differ from lawyer summaries on clause coverage? (MA)
22. Which uses of AI in education does the EU AI Act class as high-risk, and how are universities preparing? (MA) [3]
23. How do national AI strategies in five countries define "trustworthy AI"? (UG, document analysis)
24. How often do language models cite case law that does not exist when asked legal research questions? (UG)
25. How do companies map their AI risk processes to the NIST AI Risk Management Framework? (MA, interviews) [4]
26. Can a model classify privacy policy clauses by data-sharing practice as accurately as trained annotators? (MA)
27. How do courts in one jurisdiction treat algorithmic risk scores in sentencing decisions? (PhD, legal analysis)
28. What disclosure of AI use do the top 50 journals in one field require from authors? (UG)
29. Do public-sector algorithm registers in European cities give enough detail to audit the systems listed? (MA)
30. How do copyright claims against generative AI developers frame "fair use" and "text and data mining"? (PhD, legal analysis)

## AI for climate and the environment

31. How much energy does running an open 7B-parameter model on one GPU use per 1,000 summaries? (UG)
32. Can a model trained on Sentinel-2 imagery map smallholder farm boundaries as accurately as manual digitizing? (MA)
33. Do machine-learning precipitation nowcasts beat persistence forecasts for one-hour rainfall in one region? (PhD)
34. How accurately can a model detect illegal deforestation from monthly satellite composites? (MA)
35. Does scheduling model training to low-carbon hours reduce emissions for a university cluster? (MA)
36. Can audio classifiers identify bird species from field recordings in a public dataset under rain noise? (MA)
37. How well do language models answer questions about national climate pledges compared with the source documents? (UG)
38. Can a graph neural network predict electricity demand at substation level better than a seasonal baseline? (PhD)
39. How do wildfire risk models perform when tested on a fire season outside their training years? (PhD)
40. What do companies report about the carbon footprint of their AI models in sustainability reports? (UG)

## AI in finance and economics

41. Do language-model sentiment scores from earnings call transcripts predict next-day returns better than dictionary methods? (MA)
42. Can a model detect boilerplate changes in risk-factor sections of SEC EDGAR 10-K filings year to year? (MA)
43. How do loan approval models change approval rates across groups when protected attributes are removed? (MA)
44. How accurate are language models at extracting figures from tables in annual reports? (UG)
45. Do small businesses in one region use generative AI, and for which tasks? (UG, survey)
46. Can anomaly detection flag card fraud in a public dataset with fewer false alarms than rules? (UG)
47. How does generative AI adoption relate to job postings for writing-heavy roles in one country? (PhD)
48. Can AI explanations of credit decisions satisfy the "specific reasons" customers are owed? (MA)
49. Do AI-written stock recommendations on social media move prices of small-cap shares? (PhD)
50. How consistent are language models when answering the same personal-finance question phrased five ways? (UG)

## AI ethics, safety and society

51. Does a public face-detection model's miss rate differ by skin tone on a balanced benchmark? (UG)
52. How complete are model cards on a public model hub against the original model-card template? (UG) [5]
53. How often do dataset cards document consent and licensing, based on the datasheets framework? (UG) [6]
54. Do users trust AI answers more when they include citations, even if the citations are wrong? (MA, experiment)
55. How do red-teaming results differ between English and a low-resource language for the same open model? (PhD)
56. What do content moderators report about working alongside automated moderation tools? (MA, interviews)
57. Do language models give different career advice when a prompt changes only the name's apparent gender? (UG)
58. How do newsrooms label AI-assisted articles, and do readers notice the labels? (MA)
59. Can watermark detectors identify AI-generated images after common edits such as cropping and compression? (MA)
60. How does sycophancy (agreeing with the user's stated view) vary across open models of different sizes? (PhD)

## Natural language processing

61. How well do open language models translate medical instructions into Swahili, scored on the FLORES-200 benchmark and by native speakers? (MA)
62. Does retrieval from a curated corpus reduce unsupported claims in model answers about one scientific field? (MA)
63. How accurately do language models summarize long court judgments compared with official headnotes? (MA)
64. Can a small fine-tuned model match a large general model on classifying customer complaints in one domain? (UG)
65. How stable are model rankings on a reasoning benchmark when the questions are paraphrased? (PhD)
66. Do language models detect sarcasm in social media posts as well as human annotators? (UG)
67. How much does test-set contamination inflate scores on popular coding benchmarks? (PhD)
68. Can speech recognition trained on Mozilla Common Voice handle accented English in lecture recordings? (MA)
69. How accurately do language models extract study design and sample size from abstracts? (UG)
70. Does chain-of-thought prompting improve accuracy on arithmetic word problems for small open models? (UG)

## Computer vision

71. How much does a pedestrian detector's recall drop at night and in rain in a public driving dataset? (MA)
72. Can a model count cars in parking lots from aerial images within 5% of manual counts? (UG)
73. Do image classifiers rely on background rather than object features in a controlled test set? (MA)
74. How well do vision-language models describe charts and figures for blind readers, rated by users? (PhD)
75. Can a model detect cracks in bridge inspection photos with accuracy close to a trained inspector? (MA)
76. How does training-set size affect plant disease classification accuracy for one crop? (UG)
77. Can synthetic images reduce the labeled data needed for a defect detector by half? (PhD)
78. How robust are deepfake detectors to videos from generators released after their training data? (PhD)
79. Can pose estimation from a phone camera measure knee angle during squats as accurately as a lab system? (MA)
80. How do document OCR models perform on handwritten historical records from one archive? (UG)

## Robotics and autonomous systems

81. Does training a grasping policy in simulation transfer to a low-cost robot arm for household objects? (PhD)
82. Can a delivery robot's path planner handle crowded corridors as well as a human teleoperator? (MA)
83. How do people's walking paths change around a mobile robot that signals its intent with lights? (MA, experiment)
84. Can a drone detect and avoid power lines using a single camera in a public dataset? (MA)
85. How well do language-model planners turn spoken instructions into steps for a simulated kitchen robot? (PhD)
86. Do warehouse workers' reports of strain change after cobots take over lifting tasks? (MA, mixed methods)
87. How does sensor noise affect a self-driving stack's lane keeping in a driving simulator? (UG)
88. Can a robot learn a new pick-and-place task from fewer than ten human demonstrations? (PhD)
89. How do older adults rate a social robot's reminders versus phone reminders over four weeks? (MA)
90. What failures do agricultural robots report in field trials, according to published studies? (UG, review)

## Human-computer interaction

91. Do people edit AI-drafted emails less when the draft appears already in their own writing style? (MA, experiment)
92. How do programmers verify code suggested by AI assistants, observed in think-aloud sessions? (MA)
93. Does showing a confidence score change how often users accept AI recommendations? (MA)
94. How do screen-reader users experience AI chatbots compared with search engines? (MA, interviews)
95. What do researchers check before citing a paper an AI tool suggested? (UG, survey)
96. Does a "show sources" button reduce over-reliance on AI answers in a quiz task? (MA, experiment)
97. How do designers use image generators in early concept work, and what do they discard? (UG, interviews)
98. Can explanations tailored to expertise level improve trust calibration in a medical decision aid? (PhD)
99. How do older adults learn to use voice assistants, and where do they give up? (UG)
100. Does an AI writing assistant change who contributes to shared documents in student groups? (PhD)

## AI research topics for students, by level

Each tag reflects the resources the topic usually needs.

| Level | Typical length | Good topic types | Count above |
| --- | --- | --- | --- |
| UG (undergraduate) | One semester to one year | Evaluate existing models on public data; surveys; document analysis; small audits | 31 |
| MA (master's) | 6 to 12 months | Fine-tune small models; controlled user studies; interviews; cross-dataset tests | 45 |
| PhD | 3 to 5 years | New methods; long-term field studies; multi-study programs that can grow into three papers | 24 |

A topic can move between levels: a master's topic becomes a PhD chapter when you add a new method or a second setting, and an undergraduate version when you narrow it to one model and one dataset.

## Check an AI research topic in AI for Research

AI moves fast, so a topic that was open last year may now have five papers. Outside any tool, check a scholarly index, arXiv for preprints, and the AI Index report for trends [7]. AI for Research shows how crowded a topic is and where the gaps are, using real papers.

1. **Size the field (0 credits).** Landscape shows works per year, top topics, journals, authors and the open-access share for a topic, and compares two topics side by side.
2. **Find the closest papers (0 credits).** Search in [Find Papers](/features/paper-search) with the Preprints source for arXiv, or paste a draft title into Similar papers.
3. **Find gaps (3 credits).** The [research gap finder](/tools/research-gap-finder) reads recent and highly cited papers on your topic and suggests possible gaps, each linked to the papers behind it. Signed out, it allows 3 runs a day.
4. **Turn the gap into a question (3 credits).** The Research question module in the Thesis Suite applies FINER or PICO and suggests sub-questions.

<!-- SCREENSHOT: Landscape comparing two topics ("LLM evaluation in education" vs "AI feedback on student writing"), showing works per year and top journals -->

The free plan includes 45 credits a month; search, Landscape and Similar papers cost nothing. See [pricing](/pricing). Limits: gap suggestions are leads, not proof, so read the papers before you claim a gap, and the tool cannot judge whether you can get the data.

## FAQ

### What are good research topics on AI?

Good AI research topics are narrow, use data you can get, and answer a question someone needs answered. 'AI in healthcare' is a theme; 'How well does a chest X-ray classifier trained on one hospital's images perform on another's?' is a topic. Strong areas in 2026 include evaluation of language models, AI in education and assessment, fairness audits, energy use of models, and AI regulation.

### What are AI research topics for students?

Undergraduates do best with topics that use public datasets or pretrained models and a clear comparison, such as testing two open models on a public benchmark, surveying how students at one college use chatbots, or auditing a classifier for bias across groups. Avoid topics that need training large models, private data or ethics approval you cannot get in one semester.

### How do I narrow down an AI research topic?

Fix four things: one task or application, one population or dataset, one method or model family, and one outcome you can measure. Then write it as a question. 'AI and climate' becomes 'Can a model trained on Sentinel-2 imagery map small farm boundaries in Kenya as accurately as manual digitizing?' Check that a dataset exists before you commit.

### Can I do AI research without a powerful GPU?

Yes. Many strong topics need no training at all: evaluating existing models through their APIs or free open weights, fine-tuning small models, auditing datasets, studying how people use AI tools, or analyzing AI policy. Free notebook services and university clusters cover modest compute. Pick a question where the contribution is the design of the study, not the size of the model.

### How do I know if an AI topic has already been researched?

Search for it in a scholarly index such as OpenAlex, Semantic Scholar or your library's databases, plus arXiv for recent preprints, and read the two or three closest papers. Look at their limitations and future work sections. A topic is still open if you change the population, the data, the setting or the method in a way those papers flag as untested.

## Next steps

- Compare the tools for researching your topic: [best AI for research](/blog/best-ai-for-research).
- Find the gap in the literature: [how to find a research gap](/blog/how-to-find-a-research-gap).
- Turn the topic into a question: [how to write a research question](/blog/how-to-write-a-research-question).
- Keep up with new work: [latest AI research papers](/blog/latest-ai-research-papers).

## Sources

1. Johnson, A. E. W., et al. (2023). MIMIC-IV, a freely accessible electronic health record dataset. *Scientific Data, 10*, Article 1. https://doi.org/10.1038/s41597-022-01899-x
2. Irvin, J., et al. (2019). CheXpert: A large chest radiograph dataset with uncertainty labels and expert comparison. *Proceedings of the AAAI Conference on Artificial Intelligence, 33*(01), 590–597. https://doi.org/10.1609/aaai.v33i01.3301590
3. Regulation (EU) 2024/1689 of the European Parliament and of the Council of 13 June 2024 laying down harmonised rules on artificial intelligence (Artificial Intelligence Act). https://eur-lex.europa.eu/eli/reg/2024/1689/oj
4. National Institute of Standards and Technology. (2023). *Artificial Intelligence Risk Management Framework (AI RMF 1.0)* (NIST AI 100-1). https://doi.org/10.6028/NIST.AI.100-1
5. Mitchell, M., et al. (2019). Model cards for model reporting. In *Proceedings of the Conference on Fairness, Accountability, and Transparency* (pp. 220–229). ACM. https://doi.org/10.1145/3287560.3287596
6. Gebru, T., et al. (2021). Datasheets for datasets. *Communications of the ACM, 64*(12), 86–92. https://doi.org/10.1145/3458723
7. Stanford Institute for Human-Centered Artificial Intelligence. AI Index Report. https://hai.stanford.edu/ai-index
