/**
 * The studio modules as data: Writing Studio, Thesis Suite, Proposal Studio and Slides. Each
 * module has its form, whether it searches papers first, what it costs and what it returns. Pure
 * and free of server imports, so the pages draw the forms from it and the server validates
 * against it (prompts live in studioModules.ts).
 */
import type { CreditAction } from './plans.js';
import { POSTER_MODULE } from './posterModule.js';

export type StudioWorkspace = 'write' | 'thesis' | 'proposals' | 'slides';
export type StudioTaskKind = 'writing' | 'thesis' | 'proposal' | 'slides';

export type StudioField = {
  name: string;
  label: string;
  kind: 'text' | 'textarea' | 'select';
  /** select: [value, label]; the first is the default. */
  options?: [string, string][];
  placeholder?: string;
  help?: string;
  max: number;
  min?: number;
  required?: boolean;
  /** A textarea that can be filled from an uploaded file (PDF, Word, Markdown, text). */
  upload?: boolean;
};

/**
 * - markdown: a cited text (streamed).
 * - compare: paragraph by paragraph, the original beside the revision (Improve document).
 * - slides: a deck as JSON (Slides).
 * - papers: a list of papers, no AI writing (Similar papers finder).
 */
export type StudioOutput = 'markdown' | 'compare' | 'slides' | 'papers' | 'poster';

export type StudioModule = {
  id: string;
  workspace: StudioWorkspace;
  label: string;
  short: string;
  fields: StudioField[];
  /** false: no search; 'single': one search; 'multi': the question split into several searches. */
  grounded: false | 'single' | 'multi';
  output: StudioOutput;
  /** The field the search and the task title come from. */
  topicField: string;
  /** The credits: an action from CREDIT_COSTS and how many units (words / 2,000 for rewrites). */
  cost: (inputs: Record<string, string>) => { action: CreditAction | null; units: number };
  /** Lets people choose length and headings. */
  lengthOption?: boolean;
  /** A heading the workspace's module list shows above this module (and the ones after it). */
  group?: string;
};

export const STUDIO_KIND: Record<StudioWorkspace, StudioTaskKind> = { write: 'writing', thesis: 'thesis', proposals: 'proposal', slides: 'slides' };

export const STUDIO_WORKSPACES: Record<StudioWorkspace, { title: string; subtitle: string; path: string }> = {
  write: { title: 'Writing Studio', subtitle: 'Drafts with real citations, rewrites that keep your meaning, and templates to start from.', path: '/write' },
  thesis: { title: 'Thesis Suite', subtitle: 'From topic to defence: questions, outline, methodology, gaps, timeline and examiner questions.', path: '/thesis' },
  proposals: { title: 'Proposal Studio', subtitle: 'Research and grant proposals, ethics applications and data management plans.', path: '/proposals' },
  slides: { title: 'Slides', subtitle: 'A deck from your research, a document or a topic, ready for PowerPoint.', path: '/slides' },
};

/** Words in a text, for rewrite pricing. */
export const wordCount = (text: string) => (text.match(/\S+/g) || []).length;
/** One credit unit per 2,000 words, at least 1, at most 10 (a 20,000-word document). */
export const rewriteUnits = (text: string) => Math.min(10, Math.max(1, Math.ceil(wordCount(text) / 2000)));

const topic = (label: string, placeholder: string): StudioField => ({ name: 'topic', label, kind: 'text', placeholder, max: 400, min: 3, required: true });
const notes = (label = 'Anything to include (optional)', placeholder = 'Your angle, required points, data you have, word limits…'): StudioField => ({ name: 'notes', label, kind: 'textarea', placeholder, max: 6000 });
const text = (label: string, placeholder: string, max = 140_000, min = 40): StudioField => ({ name: 'text', label, kind: 'textarea', placeholder, max, min, required: true, upload: true });
const select = (name: string, label: string, options: [string, string][], help?: string): StudioField => ({ name, label, kind: 'select', options, max: 60, help });
const DEGREE = select('degree', 'Degree', [['masters', 'Master’s'], ['phd', 'PhD'], ['honours', 'Honours'], ['undergraduate', 'Undergraduate']]);

const fixed = (action: CreditAction) => () => ({ action, units: 1 });

/** The kinds of white paper the White paper module writes; the prompt gives each its own structure. */
export const WHITE_PAPER_TYPES: { id: string; label: string }[] = [
  { id: 'problem-solution', label: 'Problem–solution (business or B2B)' },
  { id: 'scientific', label: 'Scientific or research white paper' },
  { id: 'technical', label: 'Technical white paper (how it works)' },
  { id: 'policy', label: 'Policy or government white paper' },
  { id: 'industry', label: 'Industry or market report (trends and outlook)' },
  { id: 'backgrounder', label: 'Backgrounder (a product, technology or programme)' },
  { id: 'numbered', label: 'Numbered list (key questions or points)' },
];

/** Starting documents for the editor: headings and short prompts, no AI (and the sections the "template" module writes). */
export const TEMPLATES: { id: string; label: string; short: string; sections: [string, string][]; /** A blank starting document only; a dedicated module writes it. */ blankOnly?: boolean }[] = [
  { id: 'imrad', label: 'Research paper (IMRaD)', short: 'Title, abstract, introduction, methods, results, discussion.', sections: [['Abstract', 'Background, aim, methods, results and conclusion in 150–250 words.'], ['Introduction', 'The problem, what is known, the gap, and your aim.'], ['Methods', 'Design, participants or data, measures, procedure and analysis.'], ['Results', 'What you found, in the order of your aims. Tables and figures here.'], ['Discussion', 'What the results mean, how they fit the literature, limits, and implications.'], ['Conclusion', 'The answer to your question in a few sentences.'], ['References', '']] },
  { id: 'literature-review', label: 'Literature review', short: 'Introduction, search approach, themes, gaps, conclusion.', sections: [['Introduction', 'The topic, why it matters, and the scope of the review.'], ['How the literature was found', 'Databases, search terms, years and inclusion criteria.'], ['Theme 1', 'What studies show, where they agree and disagree.'], ['Theme 2', ''], ['Theme 3', ''], ['Gaps and future research', 'What is not yet known.'], ['Conclusion', ''], ['References', '']] },
  { id: 'thesis-chapter', label: 'Thesis chapter', short: 'Chapter introduction, sections, summary.', sections: [['Chapter introduction', 'What this chapter does and how it links to the previous one.'], ['Section 1', ''], ['Section 2', ''], ['Section 3', ''], ['Chapter summary', 'The main points and how they lead to the next chapter.']] },
  { id: 'research-proposal', label: 'Research proposal', short: 'Aims, background, methods, timeline, budget, ethics.', sections: [['Title', ''], ['Aims and objectives', 'The research question and 2–4 objectives.'], ['Background and significance', 'Why this matters and what is known.'], ['Literature review', ''], ['Methods', 'Design, sample, data collection, analysis.'], ['Timeline', 'Phases and milestones.'], ['Budget', ''], ['Ethical considerations', ''], ['References', '']] },
  { id: 'grant', label: 'Grant proposal', short: 'Summary, aims, significance, approach, impact, budget.', sections: [['Summary', 'The project in 200 words for a non-specialist reviewer.'], ['Aims', ''], ['Significance and innovation', ''], ['Approach and work plan', 'Work packages, methods, milestones, risks and mitigations.'], ['Team', ''], ['Impact and dissemination', ''], ['Budget justification', ''], ['References', '']] },
  { id: 'conference-abstract', label: 'Conference abstract', short: 'Background, methods, results, conclusions in 250–300 words.', sections: [['Title', ''], ['Background', ''], ['Methods', ''], ['Results', ''], ['Conclusions', '']] },
  { id: 'poster', label: 'Poster text', short: 'Short blocks for a research poster.', sections: [['Title and authors', ''], ['Introduction', '3–4 sentences.'], ['Methods', 'A short list or diagram.'], ['Results', 'Your key figure and 2–3 findings.'], ['Conclusions', '2–3 bullet points.'], ['References and contact', '']] },
  { id: 'case-report', blankOnly: true, label: 'Case report (CARE)', short: 'The CARE headings for a clinical case report.', sections: [['Title', 'The words “case report” and the area of focus.'], ['Abstract', 'Introduction, main symptoms and findings, diagnoses and interventions, outcomes, conclusion.'], ['Keywords', '2–5 keywords.'], ['Introduction', 'Why the case matters, with references.'], ['Patient information', 'De-identified demographics, main concerns, history, past interventions.'], ['Clinical findings', ''], ['Timeline', 'A table of key dates as relative days.'], ['Diagnostic assessment', 'Methods, challenges, diagnosis and differentials, prognosis.'], ['Therapeutic intervention', 'Types, doses and duration, changes with reasons.'], ['Follow-up and outcomes', 'Outcomes, test results, adherence, adverse events.'], ['Discussion', 'Strengths and limitations, the literature, the rationale for conclusions.'], ['Patient perspective', ''], ['Informed consent', 'A statement that the patient consented to publication.'], ['References', '']] },
  { id: 'clinical-audit', blankOnly: true, label: 'Clinical audit', short: 'Standard, criteria, method, results against target, action plan and re-audit.', sections: [['Title', ''], ['Background', 'Why this audit, and the standard it measures against.'], ['Aim and objectives', ''], ['Standard, criteria and targets', 'A table: criterion, target, exceptions, source.'], ['Method', 'Sample, period, data source, who collected the data, the data collection form.'], ['Results', 'Each criterion against its target.'], ['Discussion', 'Why practice differed from the standard.'], ['Action plan', 'A table: action, owner, deadline.'], ['Re-audit', 'When and how the cycle will be closed.'], ['References', '']] },
  { id: 'evaluation-report', blankOnly: true, label: 'Evaluation report', short: 'Executive summary, methodology, findings by criterion, recommendations.', sections: [['Executive summary', ''], ['Background and programme description', ''], ['Evaluation purpose, scope and questions', ''], ['Methodology', 'Design, data sources, sampling, analysis, limitations, ethics.'], ['Findings', 'By criterion or evaluation question.'], ['Conclusions', ''], ['Recommendations', 'A table: recommendation, addressed to, priority, timeframe.'], ['Lessons learned', ''], ['Annexes', 'Terms of reference, evaluation matrix, tools, people consulted.']] },
  { id: 'policy-brief', blankOnly: true, label: 'Policy brief', short: 'Key messages, the problem, evidence, options and recommendations.', sections: [['Key messages', '3–5 bullet points a busy reader can act on.'], ['The problem', ''], ['What the evidence says', ''], ['Policy options', 'A table: option, benefits, costs and risks, strength of evidence.'], ['Recommendations', ''], ['Implementation considerations', 'Feasibility, cost, equity and who must act.'], ['References', '']] },
  { id: 'white-paper', blankOnly: true, label: 'White paper', short: 'Executive summary, the problem, the evidence, the approach and recommendations.', sections: [['Title and subtitle', 'A title that names the problem or the outcome, and a subtitle that names the approach.'], ['Executive summary', 'The problem, why it matters now, the approach and the main recommendation, in 150–250 words.'], ['Introduction', 'Who this paper is for, what it covers and what the reader will be able to decide.'], ['The problem', 'What is wrong or changing, who it affects and what it costs, with cited numbers.'], ['What the evidence says', 'The research and data, with how strong each finding is.'], ['The approach', 'The principles or method that address the problem; your product or programme only after the principles.'], ['Implementation', 'Steps, timeline, costs, risks and what the reader needs to start.'], ['Recommendations', 'Numbered, specific actions for the reader.'], ['Conclusion and next step', 'The case in three sentences and one clear next step.'], ['About the author or organisation', ''], ['References', '']] },
  { id: 'annotated-bibliography', blankOnly: true, label: 'Annotated bibliography', short: 'An introduction, then each source with its annotation.', sections: [['Introduction', 'The topic, the scope and how the sources were chosen.'], ['Source 1', 'Full reference, then summary, evaluation and relevance.'], ['Source 2', ''], ['Source 3', '']] },

  // Venue layouts (the Journal formatter restructures an existing manuscript into these). Limits change: check the venue's current author guide.
  { id: 'venue-ieee', blankOnly: true, label: 'IEEE paper', short: 'IEEE conference or journal layout: abstract, index terms, numbered sections, numbered references.', sections: [['Title', 'Capitalise the main words; no abbreviations unless widely known.'], ['Authors and affiliations', ''], ['Abstract', 'One paragraph, no citations, no abbreviations left undefined; check the venue’s word limit.'], ['Index Terms', 'Keywords in alphabetical order.'], ['I. Introduction', 'The problem, the gap and the contributions, often as a short list.'], ['II. Related Work', ''], ['III. Method', ''], ['IV. Experiments and Results', 'Set-up, data, metrics, results with tables and figures.'], ['V. Discussion', ''], ['VI. Conclusion', ''], ['Acknowledgment', 'Funding and help; IEEE uses the American spelling without an “e”.'], ['References', 'IEEE style: numbered in square brackets [1] in the order first cited.']] },
  { id: 'venue-acm', blankOnly: true, label: 'ACM paper', short: 'ACM layout (acmart): abstract, CCS concepts, keywords, sections, ACM reference format.', sections: [['Title', ''], ['Authors and affiliations', ''], ['Abstract', 'One paragraph.'], ['CCS Concepts', 'Terms from the ACM Computing Classification System.'], ['Keywords', ''], ['1 Introduction', 'The problem, the gap and the contributions.'], ['2 Related Work', ''], ['3 Approach', ''], ['4 Evaluation', ''], ['5 Discussion', 'Including limitations and threats to validity.'], ['6 Conclusion', ''], ['Acknowledgments', 'Funding and help.'], ['References', 'ACM Reference Format; numbered or author–year citations, as the venue sets.']] },
  { id: 'venue-apa', blankOnly: true, label: 'APA 7 manuscript', short: 'APA 7th edition: title page, abstract, introduction, method, results, discussion, references.', sections: [['Title page', 'Title, authors, affiliations and the author note (ORCID, disclosures, correspondence).'], ['Abstract', 'One paragraph, usually up to 250 words, then keywords.'], ['Introduction', 'Starts under the paper’s title, not a heading “Introduction”.'], ['Method', 'Participants, Materials or Measures, Procedure, and the transparency details the JARS standards ask for.'], ['Results', ''], ['Discussion', ''], ['References', 'APA 7 author–date style, alphabetical, hanging indent, DOIs as URLs.'], ['Tables and figures', 'Numbered, each with a title and a note.']] },
  { id: 'venue-nature', blankOnly: true, label: 'Nature-style article', short: 'Nature-family layout: a referenced summary paragraph, main text, Methods at the end, availability statements.', sections: [['Title', 'Short, without jargon or abbreviations.'], ['Summary paragraph', 'Referenced, for readers outside the field, without headings; check the journal’s word limit.'], ['Main text', 'Opens without an “Introduction” heading; short subheadings after it.'], ['Methods', 'At the end, with enough detail to repeat the work.'], ['Data availability', ''], ['Code availability', ''], ['References', 'Numbered in the order cited, superscript in the text; Methods references follow on.'], ['Acknowledgements', ''], ['Author contributions', ''], ['Competing interests', ''], ['Figure legends', 'A short bold title sentence, then the description.']] },
  { id: 'venue-vancouver', blankOnly: true, label: 'Medical journal (ICMJE / Vancouver)', short: 'ICMJE recommendations: structured abstract, IMRaD, declarations, Vancouver references.', sections: [['Title page', 'Title, authors, affiliations, corresponding author, word count, number of tables and figures.'], ['Abstract', 'Structured: Background, Methods, Results, Conclusions; trial registration number for trials.'], ['Keywords', 'MeSH terms where possible.'], ['Introduction', ''], ['Methods', 'Including ethics approval, consent and trial registration.'], ['Results', ''], ['Discussion', 'Including limitations.'], ['Acknowledgments', 'People who helped but do not meet authorship criteria.'], ['Funding', ''], ['Competing interests', 'The ICMJE disclosure form for each author.'], ['Data sharing statement', 'Required by ICMJE for clinical trials.'], ['References', 'Vancouver style: numbered in the order first cited, journal names abbreviated as in NLM.'], ['Tables and figure legends', '']] },

  // Study checklists (paraphrased from public guidance; the Study checklist module tailors them to a study).
  { id: 'checklist-irb-submission', blankOnly: true, label: 'Checklist: IRB or ethics submission', short: 'What an ethics committee or IRB application package usually needs.', sections: [['Application form', 'The committee’s current form, complete, signed by the principal investigator and by the department or sponsor if required.'], ['Protocol', 'Version number and date; background, aims, design, eligibility, procedures, risks and benefits, analysis and data management.'], ['Investigator qualifications', 'CVs and human-subjects or GCP training certificates for the principal investigator and key staff.'], ['Recruitment materials', 'Adverts, emails, scripts, flyers and social media posts exactly as participants will see them.'], ['Consent documents', 'Information sheet and consent form, assent forms for minors, translated versions, the consent process; or a request for a waiver or alteration of consent with its justification.'], ['Data collection instruments', 'Questionnaires, interview guides, case report forms and scales.'], ['Risks and safety', 'Each risk and how it is reduced; data and safety monitoring; how adverse events are reported.'], ['Privacy and confidentiality', 'Identifiers collected, storage, access, retention, de-identification and data sharing; authorisation or waiver for health records where the law requires it.'], ['Vulnerable participants', 'Extra safeguards for children, prisoners, pregnant people, people with impaired decision-making capacity, and the researcher’s own students or staff.'], ['Payment and costs', 'Amount and schedule of any payment, and costs to participants.'], ['Conflicts of interest', 'Financial and other interests of the investigators and how they are managed.'], ['Other approvals', 'Site permissions, reliance agreements with other committees, and radiation, biosafety or drug and device regulatory approvals where they apply.'], ['Funding', 'The grant or contract, so the committee can check it matches the protocol.'], ['Version control', 'Every document carries a version and date; keep a list of what was submitted.']] },
  { id: 'checklist-site-initiation-visit', blankOnly: true, label: 'Checklist: site initiation visit', short: 'Essential documents, training and set-up to confirm before a trial site opens.', sections: [['Approvals and agreements', 'Ethics approval of the protocol and consent form, regulatory approval or notification, the signed clinical trial agreement and budget.'], ['Investigator site file', 'Set up in the agreed index: signed protocol and amendments, investigator brochure, CVs, GCP certificates, licences, financial disclosures, lab certification and normal ranges.'], ['Delegation log', 'Signed by the principal investigator; every delegated task matches the person’s training.'], ['Protocol training', 'Objectives, design, eligibility, visit schedule, procedures, prohibited medication and endpoints; a training log signed by each attendee.'], ['Informed consent process', 'The current approved version, who may take consent, how it is documented, re-consent after amendments, translated versions.'], ['Investigational product', 'Receipt, storage and temperature monitoring, accountability, dispensing and returns, randomisation and unblinding.'], ['Safety reporting', 'Definitions of adverse events and serious adverse events, reporting timelines, forms and contacts.'], ['Data collection', 'Case report forms or EDC access and training, what counts as source documents, how queries are handled.'], ['Monitoring', 'The monitoring plan, visit frequency, source data verification and access to medical records.'], ['Samples and laboratory', 'Collection, processing, storage and shipping; lab kits and manuals.'], ['Equipment and facilities', 'Calibrated equipment, secure storage, pharmacy arrangements.'], ['Recruitment', 'Screening and enrolment logs, targets and the recruitment plan.'], ['Close of the visit', 'Open questions, actions with owners and dates, the visit report, and the site activation once actions are closed.']] },
  { id: 'checklist-ctgov-results', blankOnly: true, label: 'Checklist: ClinicalTrials.gov results', short: 'The results sections of the PRS record, in order, with what each needs.', sections: [['Before you start', 'The protocol section is current: overall status, actual enrolment, actual primary completion date. Results are usually due within one year of the primary completion date for applicable clinical trials.'], ['Participant Flow', 'Recruitment details, pre-assignment details, arms or groups, and numbers started, completed and not completed for each period, with reasons for not completing.'], ['Baseline Characteristics', 'Arms or groups, overall number of baseline participants, age and sex or gender, race and ethnicity where collected, and other prespecified measures.'], ['Outcome Measures', 'Every primary and secondary outcome as registered: title, description, time frame, unit, measure type and dispersion, number analysed, and the data for each arm.'], ['Statistical Analyses', 'For each analysis: the groups compared, hypothesis, method, p-value or estimate with its confidence interval.'], ['Adverse Event Information', 'Time frame, how adverse events were defined and collected, all-cause mortality, serious adverse events and other adverse events above the frequency threshold, by arm.'], ['Limitations and Caveats', 'Problems that limit the results, such as early termination or measurement issues.'], ['Certain Agreements', 'Whether there is an agreement restricting the principal investigator’s right to publish or discuss the results.'], ['Results Point of Contact', 'Name or title, organisation, phone and email.'], ['Documents', 'The protocol and the statistical analysis plan (and an informed consent form where required) as PDF/A.'], ['Review', 'Check against the PRS review criteria, answer reviewer comments, and release.']] },
  { id: 'checklist-consent-translation', blankOnly: true, label: 'Checklist: translating consent forms', short: 'Forward and back translation, review, attestation and approval of a translated consent form.', sections: [['Source version', 'Translate only the current approved version; record its version number and date.'], ['Translator', 'A qualified translator fluent in the target language, or a certified service; keep a record of qualifications.'], ['Forward translation', 'Plain language at the participants’ reading level; meaning over word-for-word.'], ['Back translation or independent review', 'A second translator, who has not seen the original, translates back; or an independent review of accuracy, as the committee requires.'], ['Reconciliation', 'Differences reviewed and resolved; the decisions recorded.'], ['Local and cultural review', 'Terms, examples, units, contact numbers and local legal requirements fit the participants; reviewed by someone from the community or the local investigator.'], ['Attestation', 'A statement of accuracy signed and dated by the translator.'], ['Ethics approval', 'Submit the translated documents and the attestation; use them only once approved.'], ['Version control', 'Translated versions match the source version; every amendment to the source is translated and approved again.'], ['Short form process (if used)', 'For participants whose language was not expected: a short form in their language, the approved written summary, an interpreter and a witness, as the regulations allow.'], ['Interpreters and witnesses', 'Who interprets during consent, an impartial witness for participants who cannot read, and how this is documented.'], ['Other study materials', 'Questionnaires, diaries and contact information for questions available in the same language.']] },
  { id: 'checklist-incidental-findings', blankOnly: true, label: 'Checklist: incidental findings plan', short: 'Anticipate, decide and communicate incidental and secondary findings.', sections: [['Anticipate', 'Which incidental or secondary findings the methods may reveal: imaging, genomic sequencing, laboratory tests, screening questionnaires such as suicidal ideation items.'], ['What will be returned', 'Which findings will and will not be returned, and why: clinical significance, whether action is possible, and analytic validity.'], ['Expertise', 'Who reviews the data for findings (for example a radiologist for research scans), or a clear statement that research data are not reviewed clinically.'], ['Consent', 'Participants are told what may be found, what will and will not be returned, and can choose where options exist.'], ['Confirmation', 'Results confirmed in a certified clinical laboratory before they are returned, where required.'], ['Communication', 'Who tells the participant, how and how quickly, with counselling or clinical follow-up offered.'], ['Referral and costs', 'The referral route to the participant’s own doctor, and who pays for follow-up.'], ['Urgent findings', 'The process and timelines for findings that need immediate action.'], ['Records', 'How findings and their disclosure are documented, and whether they enter the medical record.'], ['Special situations', 'Children (and when they reach adulthood), relatives, participants who have withdrawn, died or cannot be reached.'], ['Ethics review', 'The plan is in the protocol and the consent form, and approved by the committee.']] },
];

/** The checklists the Study checklist module tailors; each is also a blank template `checklist-<id>`. */
export const STUDY_CHECKLISTS: { id: string; label: string }[] = [
  { id: 'irb-submission', label: 'IRB or ethics committee submission' },
  { id: 'site-initiation-visit', label: 'Site initiation visit (clinical trial)' },
  { id: 'ctgov-results', label: 'ClinicalTrials.gov results submission' },
  { id: 'consent-translation', label: 'Translating consent forms' },
  { id: 'incidental-findings', label: 'Incidental findings plan' },
];

/** Target styles for the Journal formatter; each named style has its blank venue template where one exists. */
export const JOURNAL_STYLES: { id: string; label: string; template: string | null }[] = [
  { id: 'nature', label: 'Nature and Nature-family journals', template: 'venue-nature' },
  { id: 'science', label: 'Science', template: null },
  { id: 'ieee', label: 'IEEE', template: 'venue-ieee' },
  { id: 'acm', label: 'ACM', template: 'venue-acm' },
  { id: 'apa', label: 'APA 7th edition', template: 'venue-apa' },
  { id: 'vancouver', label: 'Medical journal (ICMJE / Vancouver)', template: 'venue-vancouver' },
  { id: 'custom', label: 'Another journal (paste its author guidelines)', template: null },
];

/** The Journal formatter's units: one per 10,000 words, at least 1, at most 4. */
export const journalFormatUnits = (text: string) => Math.min(4, Math.max(1, Math.ceil(wordCount(text) / 10_000)));
export const template = (id: string) => TEMPLATES.find((item) => item.id === id) ?? null;

export const STUDIO_MODULES: StudioModule[] = [
  // ---------------------------------------------------------------- Writing Studio
  {
    id: 'article', workspace: 'write', label: 'Article with evidence', short: 'An article or essay where every claim cites a real paper.',
    fields: [topic('Topic or thesis', 'e.g. Why sleep matters for learning'), select('audience', 'Written for', [['academic', 'An academic reader'], ['general', 'A general reader'], ['policy', 'Policy makers']]), notes()],
    grounded: 'multi', output: 'markdown', topicField: 'topic', cost: fixed('draft'), lengthOption: true,
  },
  {
    id: 'literature-review', workspace: 'write', label: 'Literature review', short: 'A review of the research on a topic, organised by theme, time or method.',
    fields: [topic('Topic', 'e.g. Sleep and memory consolidation in adults'), select('structure', 'Organise by', [['thematic', 'Theme'], ['chronological', 'Time (how the field developed)'], ['methodological', 'Method']]), notes('Scope (optional)', 'Population, years, settings, what to leave out…')],
    grounded: 'multi', output: 'markdown', topicField: 'topic', cost: fixed('draft'), lengthOption: true,
  },
  {
    id: 'paper', workspace: 'write', label: 'Research paper', short: 'A first draft in IMRaD: introduction, methods, results and discussion.',
    fields: [topic('Title or research question', 'e.g. Sleep quality and exam performance in first-year students'), { name: 'study', label: 'Your study (optional)', kind: 'textarea', placeholder: 'What you did and found: design, sample, measures, main results. Leave empty for a structure with placeholders.', max: 12_000, upload: true }, notes()],
    grounded: 'multi', output: 'markdown', topicField: 'topic', cost: fixed('draft'), lengthOption: true,
  },
  {
    id: 'conference-paper', workspace: 'write', label: 'Conference paper', short: 'A 4–8 page conference paper with contribution statements, in IEEE, ACM or a general format.',
    fields: [
      topic('Title or research question', 'e.g. Lightweight anomaly detection for edge sensor networks'),
      { name: 'venue', label: 'Conference (optional)', kind: 'text', placeholder: 'e.g. IEEE ICC 2027, CHI 2027', max: 200 },
      select('format', 'Format', [['ieee', 'IEEE (two columns, numbered references)'], ['acm', 'ACM (acmart, CCS concepts)'], ['generic', 'General conference format']]),
      select('pages', 'Page limit', [['6', '6 pages'], ['4', '4 pages'], ['8', '8 pages']]),
      { name: 'study', label: 'Your study (optional)', kind: 'textarea', placeholder: 'What you built or did and what you found: method, data, set-up, metrics, results. Upload a draft or notes. Leave empty for a structure with placeholders.', max: 30_000, upload: true },
      notes('Anything to include (optional)', 'The call’s topics, required sections, double-blind rules, figures you have…'),
    ],
    grounded: 'multi', output: 'markdown', topicField: 'topic', cost: fixed('draft'), lengthOption: true,
  },
  {
    id: 'section', workspace: 'write', label: 'Section writer', short: 'One section of a paper or thesis, grounded in the literature.',
    fields: [select('section', 'Section', [['introduction', 'Introduction'], ['literature', 'Literature review'], ['methods', 'Methods'], ['results', 'Results'], ['discussion', 'Discussion'], ['conclusion', 'Conclusion']]), topic('Topic of the paper', 'e.g. Remote work and team creativity'), { name: 'context', label: 'Your notes or data (optional)', kind: 'textarea', placeholder: 'Points to make, findings to discuss, the rest of your draft…', max: 20_000, upload: true }],
    grounded: 'single', output: 'markdown', topicField: 'topic', cost: fixed('section'), lengthOption: true,
  },
  {
    id: 'abstract', workspace: 'write', label: 'Abstract', short: 'A structured or unstructured abstract from your paper.',
    fields: [text('Your paper or summary', 'Paste the paper, or its main points, or upload the file.'), select('format', 'Format', [['structured', 'Structured (Background, Methods, Results, Conclusions)'], ['unstructured', 'One paragraph']]), select('words', 'Length', [['250', 'About 250 words'], ['150', 'About 150 words'], ['300', 'About 300 words']])],
    grounded: false, output: 'markdown', topicField: 'text', cost: fixed('section'),
  },
  {
    id: 'improve', workspace: 'write', label: 'Improve document', short: 'Proofread, clarify, expand or restructure; your original stays beside each change.',
    fields: [text('Your text', 'Paste your draft or upload the file.'), select('goal', 'What to do', [['proofread', 'Proofread (grammar, spelling, punctuation)'], ['clarity', 'Make it clearer and tighter'], ['expand', 'Expand thin paragraphs'], ['shorten', 'Shorten'], ['restructure', 'Improve the flow between paragraphs'], ['formal', 'More formal, academic tone'], ['plain', 'Simpler, plainer language']]), notes('Instructions (optional)', 'e.g. Keep British spelling; do not change the quotations.')],
    grounded: false, output: 'compare', topicField: 'text', cost: (inputs) => ({ action: 'ai_edit', units: rewriteUnits(inputs.text || '') }),
  },
  {
    id: 'paraphrase', workspace: 'write', label: 'Paraphrase', short: 'Rewrite a passage in your own natural style, keeping its meaning and citations.',
    fields: [text('Text to paraphrase', 'Paste the passage.', 40_000, 20), select('strength', 'How much to change', [['standard', 'Standard'], ['light', 'Light: keep the structure'], ['strong', 'Strong: new sentence structure']])],
    grounded: false, output: 'markdown', topicField: 'text', cost: (inputs) => ({ action: 'ai_edit', units: rewriteUnits(inputs.text || '') }),
  },
  {
    id: 'journal-format', workspace: 'write', label: 'Journal formatter', short: 'Your manuscript in a journal’s section order and reference style, with what still breaks its guidelines.',
    fields: [
      text('Your manuscript', 'Upload the manuscript (Word or PDF) or paste it.', 300_000, 200),
      select('style', 'Target journal style', JOURNAL_STYLES.map(({ id, label }): [string, string] => [id, label])),
      { name: 'guidelines', label: 'Author guidelines (optional)', kind: 'textarea', placeholder: 'Paste the journal’s instructions for authors: word and abstract limits, section order, required statements, reference style. Needed for “Another journal”.', max: 30_000, upload: true },
      { name: 'journal', label: 'Journal name (optional)', kind: 'text', placeholder: 'e.g. Nature Communications, IEEE Access, BMJ Open', max: 200 },
    ],
    grounded: false, output: 'markdown', topicField: 'text', cost: (inputs) => ({ action: 'section', units: journalFormatUnits(inputs.text || '') }),
  },
  {
    id: 'template', workspace: 'write', label: 'Fill a template', short: 'A template written out section by section from your topic or research, with real citations.',
    fields: [select('template', 'Template', TEMPLATES.filter((item) => !item.blankOnly).map((item): [string, string] => [item.id, item.label])), topic('Topic or title', 'e.g. Sleep and memory consolidation in adults'), notes()],
    grounded: 'multi', output: 'markdown', topicField: 'topic', cost: fixed('draft'), lengthOption: true,
  },

  // ---------------------------------------------------------------- Writing Studio: deliverables
  {
    id: 'white-paper', workspace: 'write', group: 'Deliverables', label: 'White paper', short: 'A scientific, technical, policy or business white paper built on real research, with your own data and approach.',
    fields: [
      topic('Topic or working title', 'e.g. Why mid-size hospitals should adopt remote patient monitoring'),
      select('type', 'Kind of white paper', WHITE_PAPER_TYPES.map(({ id, label }): [string, string] => [id, label])),
      select('audience', 'Written for', [['executives', 'Decision makers and executives'], ['technical', 'Engineers and technical buyers'], ['policy', 'Policy makers and officials'], ['scientists', 'Scientists and specialists'], ['funders', 'Investors, funders and partners'], ['public', 'An informed general reader']]),
      select('stance', 'Voice', [['educate', 'Educational and neutral: teach the reader, recommend no product'], ['position', 'Make the case for our approach, backed by evidence']]),
      select('part', 'Write', [['whole', 'The whole white paper'], ['summary', 'Executive summary'], ['problem', 'The problem and why it matters'], ['evidence', 'What the evidence says'], ['approach', 'The approach or solution'], ['recommendations', 'Recommendations and next steps']]),
      { name: 'material', label: 'Your approach, product or data (optional)', kind: 'textarea', placeholder: 'What you propose or offer, how it works, and your own results: pilot figures, case studies, survey numbers, benchmarks. Used exactly as given; anything missing becomes a [placeholder].', max: 30_000, upload: true },
      notes('Anything to include (optional)', 'Organisation name, the call to action, house style, word limit, sections you must have…'),
    ],
    grounded: 'multi', output: 'markdown', topicField: 'topic', cost: (inputs) => ({ action: (inputs.part || 'whole') === 'whole' ? 'draft' : 'section', units: 1 }), lengthOption: true,
  },
  {
    id: 'case-report', workspace: 'write', group: 'Deliverables', label: 'Case report (CARE)', short: 'A clinical case report in the CARE structure, from your case notes, with the literature in the discussion.',
    fields: [
      topic('Condition or focus of the case', 'e.g. Kikuchi disease presenting as fever of unknown origin'),
      { name: 'case', label: 'The case', kind: 'textarea', placeholder: 'De-identified notes: age and sex, presenting complaint, history, examination, investigations with results, diagnosis, treatment with doses, follow-up and outcome. Use relative days (day 1, day 14), not dates.', max: 20_000, min: 80, required: true, upload: true },
      select('journal', 'Format', [['standard', 'Journal case report (about 1,500 words)'], ['short', 'Short case or clinical image (about 600 words)'], ['poster', 'Conference abstract (about 300 words)']]),
      notes('Journal instructions (optional)', 'Word limit, required headings, number of references, the journal’s name…'),
    ],
    grounded: 'single', output: 'markdown', topicField: 'topic', cost: fixed('draft'),
  },
  {
    id: 'clinical-audit', workspace: 'write', group: 'Deliverables', label: 'Clinical audit', short: 'An audit plan (standard, criteria, targets, sample, data form) or the report of a completed audit cycle.',
    fields: [
      topic('What is being audited', 'e.g. VTE risk assessment within 24 hours of admission to medical wards'),
      select('stage', 'Write', [['plan', 'The audit plan (before data collection)'], ['report', 'The audit report (with my results)']]),
      { name: 'standard', label: 'The standard (optional)', kind: 'textarea', placeholder: 'The guideline or policy you audit against, with its recommendation, e.g. NICE NG89 1.1.1. Leave empty and the literature is searched for it.', max: 6000 },
      { name: 'results', label: 'Your data and results (for a report)', kind: 'textarea', placeholder: 'Sample, period, and for each criterion how many met it, e.g. "Criterion 1: 38 of 52 patients (73%)". Paste or upload your data summary.', max: 20_000, upload: true },
      notes('Setting (optional)', 'Department, hospital type, who is on the audit team, the re-audit date…'),
    ],
    grounded: 'single', output: 'markdown', topicField: 'topic', cost: (inputs) => ({ action: inputs.stage === 'report' ? 'draft' : 'section', units: 1 }),
  },
  {
    id: 'evaluation-report', workspace: 'write', group: 'Deliverables', label: 'Evaluation report', short: 'A programme or project evaluation against OECD-DAC criteria, from your description, questions and findings.',
    fields: [
      topic('Programme or project', 'e.g. Community health worker programme for maternal care, 2022–2025'),
      { name: 'description', label: 'About the programme', kind: 'textarea', placeholder: 'Aims, activities, target group, place, budget and timeframe, and the theory of change or logframe if you have one.', max: 20_000, min: 60, required: true, upload: true },
      { name: 'findings', label: 'What the evaluation found', kind: 'textarea', placeholder: 'Your data and findings: indicators with baseline, target and actual; survey results; interview themes; documents reviewed. Empty sections become placeholders.', max: 40_000, upload: true },
      select('framework', 'Criteria', [['dac', 'OECD-DAC: relevance, coherence, effectiveness, efficiency, impact, sustainability'], ['questions', 'Organised by my evaluation questions'], ['logframe', 'Against the logframe (outputs, outcomes, impact)']]),
      notes('Evaluation questions and audience (optional)', 'The evaluation questions, who commissioned it, who will read it…'),
    ],
    grounded: false, output: 'markdown', topicField: 'topic', cost: fixed('draft'),
  },
  {
    id: 'policy-brief', workspace: 'write', group: 'Deliverables', label: 'Policy brief', short: 'Key messages, the evidence, policy options compared, and recommendations, cited to real research.',
    fields: [
      topic('Policy question', 'e.g. Should school meals be universal rather than means-tested?'),
      select('audience', 'Written for', [['government', 'Government officials and ministers'], ['legislators', 'Legislators and their staff'], ['agency', 'Agency or international organisation staff'], ['ngo', 'NGOs and advocates'], ['public', 'The general public']]),
      select('stance', 'Approach', [['options', 'Compare options neutrally'], ['recommend', 'Recommend one option']]),
      { name: 'context', label: 'Context (optional)', kind: 'text', placeholder: 'The country, region or organisation the brief is for', max: 200 },
      notes('Local facts to include (optional)', 'Figures, current policy, budgets or constraints you know; they are used as given.'),
    ],
    grounded: 'multi', output: 'markdown', topicField: 'topic', cost: fixed('draft'), lengthOption: true,
  },
  {
    id: 'annotated-bibliography', workspace: 'write', group: 'Deliverables', label: 'Annotated bibliography', short: 'Real sources on your topic, each with a summary, an evaluation and why it matters for your work.',
    fields: [
      topic('Topic or research question', 'e.g. Peer tutoring and maths achievement in secondary school'),
      select('kind', 'Annotations', [['combined', 'Summary, evaluation and relevance'], ['descriptive', 'Summary only (descriptive)'], ['critical', 'Critical evaluation']]),
      select('size', 'Length of each annotation', [['standard', 'About 120 words'], ['short', 'About 60 words'], ['long', 'About 200 words']]),
      notes('Your project (optional)', 'What the bibliography is for, so the relevance notes fit it.'),
    ],
    grounded: 'multi', output: 'markdown', topicField: 'topic', cost: fixed('draft'),
  },
  {
    id: 'reading-prep', workspace: 'write', group: 'Deliverables', label: 'Seminar reading prep', short: 'This week’s readings: each argument, its weak points, how they connect, and questions to bring to class.',
    fields: [
      { name: 'text', label: 'The readings', kind: 'textarea', placeholder: 'Upload or paste the readings (one or several). Start each with its title or author if you paste several.', max: 140_000, min: 200, required: true, upload: true },
      notes('The course and the seminar (optional)', 'Course, week topic, the lecturer’s questions, the essay you are working towards…'),
      select('depth', 'Depth', [['standard', 'Standard'], ['quick', 'Quick: the essentials'], ['deep', 'Deep: with counter-arguments and connections']]),
    ],
    grounded: false, output: 'markdown', topicField: 'text', cost: (inputs) => ({ action: 'section', units: Math.min(5, Math.max(1, Math.ceil(wordCount(inputs.text || '') / 10_000))) }),
  },

  // ---------------------------------------------------------------- Writing Studio: correspondence
  {
    id: 'research-email', workspace: 'write', group: 'Correspondence', label: 'Researcher email', short: 'A short, clear email to a co-author, a data holder, an author or a prospective supervisor.',
    fields: [
      select('kind', 'Email', [['coauthor', 'Invite a co-author'], ['meeting', 'Invite to a meeting or talk'], ['data', 'Request data or materials'], ['paper', 'Request a paper (full text)'], ['supervisor', 'Enquire with a prospective supervisor'], ['followup', 'Follow up on an earlier email']]),
      { name: 'recipient', label: 'To (optional)', kind: 'text', placeholder: 'Their name and role, e.g. Dr Ana Ruiz, epidemiologist at the study’s coordinating centre', max: 300 },
      topic('The study or paper it is about', 'e.g. Sleep and exam performance in first-year students'),
      { name: 'purpose', label: 'What you want', kind: 'textarea', placeholder: 'What you ask for and why: their role, the dataset or paper, the meeting time, your research interests…', max: 4000 },
      { name: 'deadline', label: 'Deadline or date (optional)', kind: 'text', placeholder: 'e.g. reply by 15 January; meeting on 3 February at 14:00 CET', max: 200 },
      notes('About you and anything else (optional)', 'Your name, position, institution, how you know them, what you attach…'),
    ],
    grounded: false, output: 'markdown', topicField: 'topic', cost: fixed('short'),
  },

  // ---------------------------------------------------------------- Thesis Suite
  {
    id: 'similar', workspace: 'thesis', label: 'Similar papers', short: 'Papers like yours, from a title or abstract. No credits.',
    fields: [text('Your title or abstract', 'Paste the title or abstract of your thesis or a key paper.', 6000, 8)],
    grounded: false, output: 'papers', topicField: 'text', cost: () => ({ action: null, units: 0 }),
  },
  {
    id: 'question', workspace: 'thesis', label: 'Research question', short: 'A focused, researchable question checked against FINER, PICO or PICOT.',
    fields: [topic('Your topic or draft question', 'e.g. Does mindfulness help nurses with burnout?'), select('framework', 'Framework', [['finer', 'FINER (feasible, interesting, novel, ethical, relevant)'], ['pico', 'PICO (population, intervention, comparison, outcome)'], ['picot', 'PICOT (adds time)'], ['spider', 'SPIDER (qualitative)']]), notes('Context (optional)', 'Your field, setting, time and resources.')],
    grounded: 'single', output: 'markdown', topicField: 'topic', cost: fixed('section'),
  },
  {
    id: 'hypothesis', workspace: 'thesis', label: 'Hypotheses', short: 'Testable hypotheses with their variables, from your question and the literature.',
    fields: [topic('Research question', 'e.g. How does screen time affect sleep in teenagers?'), notes()],
    grounded: 'single', output: 'markdown', topicField: 'topic', cost: fixed('section'),
  },
  {
    id: 'outline', workspace: 'thesis', label: 'Thesis outline', short: 'Chapters, sections and a word budget per chapter, ready to open in the editor.',
    fields: [topic('Thesis topic or title', 'e.g. Community health workers and maternal outcomes in rural Kenya'), DEGREE,
      select('words', 'Total length', [['20000', '20,000 words'], ['10000', '10,000 words'], ['40000', '40,000 words'], ['80000', '80,000 words'], ['100000', '100,000 words']]),
      select('structure', 'Structure', [['traditional', 'Traditional (introduction, literature, methods, results, discussion)'], ['publication', 'Thesis by publication'], ['humanities', 'Humanities (argument-led chapters)']]), notes()],
    grounded: 'single', output: 'markdown', topicField: 'topic', cost: fixed('section'),
  },
  {
    id: 'methodology', workspace: 'thesis', label: 'Methodology builder', short: 'Design, sampling, instruments, analysis, validity and ethics for your question.',
    fields: [topic('Research question', 'e.g. What explains low uptake of solar irrigation among smallholders?'), select('design', 'Approach', [['auto', 'Suggest one for me'], ['quantitative', 'Quantitative'], ['qualitative', 'Qualitative'], ['mixed', 'Mixed methods']]), notes('Context (optional)', 'Population, setting, time, budget, data you can get.')],
    grounded: 'single', output: 'markdown', topicField: 'topic', cost: fixed('section'),
  },
  {
    id: 'framework', workspace: 'thesis', label: 'Theoretical framework', short: 'Theories that fit your study, their constructs and how your variables relate.',
    fields: [topic('Topic or question', 'e.g. Why do employees resist new hospital software?'), notes()],
    grounded: 'single', output: 'markdown', topicField: 'topic', cost: fixed('section'),
  },
  {
    id: 'operationalisation', workspace: 'thesis', label: 'Operationalising variables', short: 'Each construct defined and made measurable: indicators, instrument, level of measurement, validity and reliability.',
    fields: [
      topic('Research question', 'e.g. Does perceived stress predict sleep quality in nursing students?'),
      { name: 'constructs', label: 'Constructs or variables', kind: 'textarea', placeholder: 'One per line, e.g.\nPerceived stress\nSleep quality\nSocial support', max: 4000, min: 3, required: true },
      select('design', 'Approach', [['quantitative', 'Quantitative (survey, experiment, secondary data)'], ['qualitative', 'Qualitative (how each concept is recognised in the data)'], ['mixed', 'Mixed methods']]),
      notes('Context (optional)', 'Population, setting, language of the instruments, data you already have…'),
    ],
    grounded: 'single', output: 'markdown', topicField: 'topic', cost: fixed('section'),
  },
  {
    id: 'gaps', workspace: 'thesis', label: 'Research gaps', short: 'Open questions in a field, each with its reason, sources and a confidence level.',
    fields: [topic('Field or topic', 'e.g. Microplastics in freshwater fish'), notes()],
    grounded: 'multi', output: 'markdown', topicField: 'topic', cost: fixed('section'),
  },
  {
    id: 'timeline', workspace: 'thesis', label: 'Research timeline', short: 'Phases, milestones and risks over the months you have.',
    fields: [topic('Project', 'e.g. PhD on drought resilience, fieldwork in year 2'), select('months', 'Time available', [['12', '12 months'], ['6', '6 months'], ['18', '18 months'], ['24', '24 months'], ['36', '36 months'], ['48', '48 months']]), { name: 'start', label: 'Start (optional)', kind: 'text', placeholder: 'e.g. January 2027', max: 40 }, notes('Fixed dates (optional)', 'Ethics approval, fieldwork window, submission deadline…')],
    grounded: false, output: 'markdown', topicField: 'topic', cost: fixed('section'),
  },
  {
    id: 'defence', workspace: 'thesis', label: 'Defence preparation', short: 'Likely examiner questions, chapter by chapter, with how to answer them.',
    fields: [text('Your thesis or its abstract', 'Upload the thesis (PDF or Word) or paste the abstract and chapter summaries.', 140_000, 80), notes('About the defence (optional)', 'Examiners’ fields, known weak points, format and length.')],
    grounded: false, output: 'markdown', topicField: 'text', cost: fixed('section'),
  },
  {
    id: 'auto-proposal', workspace: 'thesis', label: 'Autonomous proposal', short: 'One run: refines your question, searches the literature and writes the full proposal.',
    fields: [topic('Your idea', 'e.g. The effect of school feeding on attendance in Malawi'), DEGREE, notes()],
    grounded: 'multi', output: 'markdown', topicField: 'topic', cost: fixed('draft'),
  },

  // ---------------------------------------------------------------- Proposal Studio
  {
    id: 'research-proposal', workspace: 'proposals', label: 'Research proposal', short: 'Aims, background, significance, methods, timeline and budget outline.',
    fields: [topic('Topic or working title', 'e.g. Telehealth follow-up after heart surgery'), DEGREE,
      select('part', 'Write', [['whole', 'The whole proposal'], ['aims', 'Title, aims and objectives'], ['background', 'Background and significance'], ['literature', 'Literature review'], ['methods', 'Methods'], ['timeline', 'Timeline'], ['budget', 'Budget outline'], ['ethics', 'Ethical considerations']]), notes()],
    grounded: 'multi', output: 'markdown', topicField: 'topic', cost: (inputs) => ({ action: (inputs.part || 'whole') === 'whole' ? 'draft' : 'section', units: 1 }),
  },
  {
    id: 'grant', workspace: 'proposals', label: 'Grant proposal', short: 'A proposal in your funder’s format, from the call and your idea.',
    fields: [select('funder', 'Funder format', [['generic', 'Generic'], ['nih', 'NIH (Specific Aims and Research Strategy)'], ['nsf', 'NSF (Project Description)'], ['erc', 'ERC (Extended Synopsis)'], ['wellcome', 'Wellcome']]),
      topic('Project idea', 'e.g. Low-cost sensors for early flood warning in informal settlements'),
      { name: 'call', label: 'The call (optional)', kind: 'textarea', placeholder: 'Paste the funding call, its criteria and limits.', max: 30_000, upload: true },
      select('part', 'Write', [['whole', 'The whole proposal'], ['summary', 'Summary or specific aims'], ['significance', 'Significance and innovation'], ['approach', 'Approach and work plan'], ['impact', 'Impact and dissemination'], ['budget', 'Budget justification']]), notes()],
    grounded: 'multi', output: 'markdown', topicField: 'topic', cost: (inputs) => ({ action: (inputs.part || 'whole') === 'whole' ? 'draft' : 'section', units: 1 }),
  },
  {
    id: 'ethics', workspace: 'proposals', label: 'Ethics application', short: 'An ethics board or IRB application: risks, consent, data protection.',
    fields: [{ name: 'topic', label: 'Your study', kind: 'textarea', placeholder: 'Aim, design, who takes part, how they are recruited, what they do, what data you collect.', max: 12_000, min: 40, required: true, upload: true },
      select('board', 'Board', [['generic', 'Generic ethics committee'], ['irb', 'US IRB'], ['rec', 'UK Research Ethics Committee'], ['hrec', 'Australian HREC']]),
      select('risk', 'Participants', [['adults', 'Adults, low risk'], ['vulnerable', 'Children or vulnerable groups'], ['patients', 'Patients or clinical data'], ['online', 'Online or secondary data']])],
    grounded: false, output: 'markdown', topicField: 'topic', cost: fixed('draft'),
  },
  {
    id: 'ethics-statement', workspace: 'proposals', label: 'Ethics statement', short: 'The ethics approval and consent statement for your manuscript, in journal wording.',
    fields: [
      topic('Study title', 'e.g. Sleep quality and exam performance in first-year students'),
      select('approval', 'Ethics review', [['approved', 'Approved by a committee or IRB'], ['exempt', 'Exempt, or a waiver granted by a committee'], ['not-required', 'Review not required (e.g. public or anonymous data)']]),
      { name: 'committee', label: 'Committee and institution (optional)', kind: 'text', placeholder: 'e.g. Research Ethics Committee, University of Leeds', max: 300 },
      { name: 'reference', label: 'Reference number (optional)', kind: 'text', placeholder: 'e.g. MREC 24-017', max: 120 },
      { name: 'date', label: 'Date of approval (optional)', kind: 'text', placeholder: 'e.g. 12 March 2026', max: 80 },
      select('consent', 'Consent', [['written', 'Written informed consent'], ['verbal', 'Verbal or online consent, documented'], ['parental', 'Parental consent and child assent'], ['waived', 'Consent waived by the committee'], ['na', 'Not applicable (no human participants or records)']]),
      select('animals', 'Animal work', [['none', 'No animals'], ['animals', 'Animals were used']]),
      notes('Anything else (optional)', 'The journal, trial registration, the guideline followed (e.g. Declaration of Helsinki, ARRIVE), the reason a review was not required…'),
    ],
    grounded: false, output: 'markdown', topicField: 'topic', cost: fixed('short'),
  },
  {
    id: 'dmp', workspace: 'proposals', label: 'Data management plan', short: 'How data is collected, stored, shared and kept, in your funder’s format.',
    fields: [{ name: 'topic', label: 'Your project', kind: 'textarea', placeholder: 'What data you collect or reuse, its formats and size, and any personal data.', max: 12_000, min: 30, required: true, upload: true },
      select('funder', 'Format', [['generic', 'Generic'], ['nih', 'NIH Data Management and Sharing Plan'], ['nsf', 'NSF'], ['horizon', 'Horizon Europe'], ['ukri', 'UKRI']])],
    grounded: false, output: 'markdown', topicField: 'topic', cost: fixed('section'),
  },

  // ---------------------------------------------------------------- Proposal Studio: checklists
  {
    id: 'study-checklist', workspace: 'proposals', group: 'Checklists', label: 'Study checklist', short: 'An IRB, site initiation, ClinicalTrials.gov results, consent translation or incidental findings checklist, fitted to your study.',
    fields: [
      select('kind', 'Checklist', STUDY_CHECKLISTS.map(({ id, label }): [string, string] => [id, label])),
      { name: 'topic', label: 'Your study', kind: 'textarea', placeholder: 'Design, population, sites, what you collect, the intervention or product, languages, the committee or registry involved.', max: 12_000, min: 40, required: true, upload: true },
      notes('Anything else (optional)', 'Deadlines, what is already done, the institution’s own requirements…'),
    ],
    grounded: false, output: 'markdown', topicField: 'topic', cost: fixed('section'),
  },

  // ---------------------------------------------------------------- Slides
  {
    id: 'slides', workspace: 'slides', label: 'Slide deck', short: 'Slides with speaker notes from a topic, a document or a research result.',
    fields: [
      { name: 'topic', label: 'Topic or title', kind: 'text', placeholder: 'e.g. Sleep and memory: what the evidence says', max: 400, min: 3, required: true },
      { name: 'text', label: 'Content (optional)', kind: 'textarea', placeholder: 'Paste the paper, thesis chapter or notes the slides are made from, or upload a file. Leave empty to build from the literature.', max: 140_000, upload: true },
      select('preset', 'Kind of talk', [['research', 'Research talk'], ['defence', 'Thesis defence'], ['conference', 'Conference presentation (12–15 minutes)'], ['journal', 'Journal club'], ['lecture', 'Lecture']]),
      select('count', 'Slides', [['12', 'About 12'], ['8', 'About 8'], ['16', 'About 16'], ['20', 'About 20']]),
    ],
    grounded: 'single', output: 'slides', topicField: 'topic', cost: fixed('slides'),
  },
  POSTER_MODULE,
];

export const studioModule = (id: string) => STUDIO_MODULES.find((module) => module.id === id) ?? null;
export const workspaceModules = (workspace: StudioWorkspace) => STUDIO_MODULES.filter((module) => module.workspace === workspace);

/** Credits for a run, given the price list (CREDIT_COSTS, or the `costs` of /api/billing/credits). */
export function studioCredits(module: StudioModule, inputs: Record<string, string>, costs: Record<string, number>, highQuality = false): number {
  const { action, units } = module.cost(inputs);
  if (!action) return 0;
  return (costs[action] ?? 0) * Math.max(1, units) * (highQuality ? 3 : 1);
}
