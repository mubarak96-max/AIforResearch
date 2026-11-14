'use client';

/** The browser utilities (lib/utilityTools), looked up by tool slug. Each loads only on its own page. */
import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

const loading = () => <p className="py-10 text-center text-[14px] text-muted">Loading the tool…</p>;

const UTILITIES: Record<string, ComponentType> = {
  'citation-formatter': dynamic(() => import('./CitationFormatter').then((m) => m.CitationFormatter), { loading }),
  'in-text-citation-generator': dynamic(() => import('./InTextCitationGenerator').then((m) => m.InTextCitationGenerator), { loading }),
  'bibtex-to-apa': dynamic(() => import('./BibtexToApa').then((m) => m.BibtexToApa), { loading }),
  'reference-list-sorter': dynamic(() => import('./ReferenceListSorter').then((m) => m.ReferenceListSorter), { loading }),
  'citation-coverage-checker': dynamic(() => import('./CitationCoverageChecker').then((m) => m.CitationCoverageChecker), { loading }),
  'pico-question-builder': dynamic(() => import('./PicoQuestionBuilder').then((m) => m.PicoQuestionBuilder), { loading }),
  'boolean-search-string-builder': dynamic(() => import('./BooleanSearchStringBuilder').then((m) => m.BooleanSearchStringBuilder), { loading }),
  'literature-review-matrix-builder': dynamic(() => import('./LiteratureReviewMatrixBuilder').then((m) => m.LiteratureReviewMatrixBuilder), { loading }),
  'thesis-defence-timeline-planner': dynamic(() => import('./ThesisDefenceTimelinePlanner').then((m) => m.ThesisDefenceTimelinePlanner), { loading }),
};

export function UtilityTool({ slug }: { slug: string }) {
  const Component = UTILITIES[slug];
  if (!Component) return <p className="text-[14px] text-muted">This tool is not available.</p>;
  return <Component />;
}
