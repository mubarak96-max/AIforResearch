/**
 * Free browser utilities: one file per tool, each exporting its page data (a `Tool` with kind
 * 'utility'). The working component for each lives in components/tools/utilities/<Name>.tsx and is
 * looked up by slug in components/tools/utilities/index.tsx. Nothing here calls the AI.
 */
import type { Tool } from '../tools';
import { bibtexToApa } from './bibtex-to-apa';
import { booleanSearchStringBuilder } from './boolean-search-string-builder';
import { citationCoverageChecker } from './citation-coverage-checker';
import { citationFormatter } from './citation-formatter';
import { inTextCitationGenerator } from './in-text-citation-generator';
import { literatureReviewMatrixBuilder } from './literature-review-matrix-builder';
import { picoQuestionBuilder } from './pico-question-builder';
import { referenceListSorter } from './reference-list-sorter';
import { thesisDefenceTimelinePlanner } from './thesis-defence-timeline-planner';

export const UTILITY_TOOLS: Tool[] = [
  citationFormatter,
  inTextCitationGenerator,
  bibtexToApa,
  referenceListSorter,
  citationCoverageChecker,
  picoQuestionBuilder,
  booleanSearchStringBuilder,
  literatureReviewMatrixBuilder,
  thesisDefenceTimelinePlanner,
];
