'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LuArrowLeft, LuHistory, LuSearch, LuSlidersHorizontal, LuSparkles, LuX } from 'react-icons/lu';
import { toast } from 'react-hot-toast';
import PaperCard from './PaperCard';
import { AssistError, papersForText, searchPapers, type Paper, type PaperFilters } from '../../../lib/aiEditor/assistApi';
import CreditsUpsell from './CreditsUpsell';
import { addPaperToLibrary, copyReference } from '../../../lib/aiEditor/references';

const RECENT_KEY = 'ce-editor-recent-paper-searches';
const THIS_YEAR = new Date().getFullYear();
const YEAR_PRESETS: { label: string; from: number | null }[] = [
  { label: 'Any time', from: null },
  { label: `Since ${THIS_YEAR - 1}`, from: THIS_YEAR - 1 },
  { label: `Since ${THIS_YEAR - 5}`, from: THIS_YEAR - 5 },
  { label: `Since ${THIS_YEAR - 10}`, from: THIS_YEAR - 10 },
];
const CITED_PRESETS = [0, 5, 20, 50];

function readRecent(): string[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(value) ? value.filter((item) => typeof item === 'string').slice(0, 6) : [];
  } catch {
    return [];
  }
}

function writeRecent(items: string[]) {
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(items.slice(0, 6)));
  } catch {
    /* storage blocked: recent searches are a convenience */
  }
}

export type ParagraphTarget = { blockId: string; text: string };

type Props = {
  suggestedQueries?: string[];
  documentTitle?: string;
  /** Set when opened from a paragraph's "Find citations": results cite into that paragraph. */
  paragraph?: ParagraphTarget | null;
  onClearParagraph?: () => void;
  /** In a document: cite into it. Elsewhere "Copy" puts the reference on the clipboard. */
  onCite?: (paper: Paper, paragraph: ParagraphTarget | null) => void;
  /** Defaults to importing the paper into the Library. */
  onSave?: (paper: Paper) => Promise<boolean>;
  savedKeys?: Set<string>;
  isMobile?: boolean;
};

const EXAMPLES = ['Sleep and memory consolidation', 'Malaria in pregnancy', 'Climate change and food security'];

export const paperKey = (paper: Pick<Paper, 'doi' | 'id' | 'title'>) =>
  (paper.doi || paper.id || paper.title || '').toLowerCase();

export default function FindPapersPanel({ suggestedQueries = [], documentTitle, paragraph = null, onClearParagraph = () => {}, onCite, onSave, savedKeys, isMobile }: Props) {
  const [savedHere, setSavedHere] = useState<Set<string>>(() => new Set());
  const saved = savedKeys || savedHere;
  const save = onSave || (async (paper: Paper) => {
    try {
      await addPaperToLibrary(paper);
      setSavedHere((current) => new Set(current).add(paperKey(paper)));
      toast.success('Saved to your Library');
      return true;
    } catch (caught) {
      toast.error((caught as Error).message || 'Could not save to your Library.');
      return false;
    }
  });
  const cite = (paper: Paper) => {
    if (onCite) {
      onCite(paper, paragraph);
      return;
    }
    copyReference(paper.bibtex)
      .then(() => toast.success('Reference copied'))
      .catch(() => toast.error('The reference could not be copied.'));
  };
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [filters, setFilters] = useState<PaperFilters>({ sort: 'relevance' });
  const [showFilters, setShowFilters] = useState(false);
  const [results, setResults] = useState<Paper[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outOfCredits, setOutOfCredits] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [paragraphQueries, setParagraphQueries] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => setRecent(readRecent()), []);

  const run = useCallback(async (text: string, nextFilters: PaperFilters, nextPage = 1) => {
    const trimmed = text.trim();
    if (trimmed.length < 2) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    setSubmitted(trimmed);
    try {
      const response = await searchPapers(trimmed, { ...nextFilters, page: nextPage, perPage: 10 }, controller.signal);
      setResults((current) => (nextPage > 1 ? [...current, ...response.results] : response.results));
      setTotal(response.total);
      setPage(nextPage);
      if (nextPage === 1) {
        const nextRecent = [trimmed, ...readRecent().filter((item) => item.toLowerCase() !== trimmed.toLowerCase())];
        writeRecent(nextRecent);
        setRecent(nextRecent.slice(0, 6));
      }
    } catch (caught) {
      if ((caught as Error).name !== 'AbortError') setError((caught as Error).message || 'Search failed.');
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  }, []);

  // "Find citations" for a paragraph: the server writes the searches from the paragraph.
  useEffect(() => {
    if (!paragraph) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setOutOfCredits(false);
    setResults([]);
    setParagraphQueries([]);
    papersForText(paragraph.text, documentTitle)
      .then((response) => {
        if (cancelled) return;
        setResults(response.results);
        setTotal(response.results.length);
        setParagraphQueries(response.queries);
        setSubmitted('');
      })
      .catch((caught) => {
        if (cancelled) return;
        if (caught instanceof AssistError && caught.outOfCredits) setOutOfCredits(true);
        else setError(caught.message || 'Could not find citations.');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [documentTitle, paragraph]);

  const updateFilters = (patch: Partial<PaperFilters>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    if (submitted) void run(submitted, next);
  };

  const showingStart = !paragraph && !submitted && !loading;
  const yearFrom = filters.yearFrom ?? null;
  const filterCount = useMemo(
    () => [filters.yearFrom, filters.minCited, filters.openAccess, filters.sort && filters.sort !== 'relevance' ? 1 : null].filter(Boolean).length,
    [filters],
  );

  const quickYear = THIS_YEAR - 10;
  const chip = (on: boolean) =>
    `inline-flex h-7 shrink-0 items-center rounded-full border px-2.5 text-[12.5px] font-medium transition-colors ${
      on ? 'border-brand-100 bg-brand-50 text-brand-600' : 'border-line bg-surface text-ink-3 hover:bg-soft'
    }`;
  // "Sleep and memory" and "Sleep and Memory in Adults" are one suggestion, not two.
  const suggestions = suggestedQueries.filter((item, index) =>
    !suggestedQueries.slice(0, index).some((earlier) => {
      const [a, b] = [earlier.toLowerCase(), item.toLowerCase()];
      return a.includes(b) || b.includes(a);
    }),
  );
  const option = (on: boolean) =>
    `h-8 rounded-[9px] border text-[12.5px] transition-colors ${on ? 'border-brand-100 bg-brand-50 font-semibold text-brand-600' : 'border-line bg-surface text-ink-2 hover:bg-soft'}`;

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="px-3 pb-2 pt-3">
        {paragraph ? (
          <div className="mb-2 flex items-start gap-2 rounded-[10px] bg-soft px-2.5 py-2">
            <button type="button" onClick={onClearParagraph} aria-label="Back to search" className="mt-0.5 text-muted hover:text-ink">
              <LuArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0 text-[12.5px] text-ink-2">
              <div className="font-semibold text-ink">Citations for this paragraph</div>
              <div className="line-clamp-2">{paragraph.text}</div>

            </div>
          </div>
        ) : null}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (paragraph) onClearParagraph();
            void run(query, filters);
          }}
          className="flex items-center gap-2"
        >
          <div className="group relative min-w-0 flex-1">
            <LuSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle group-focus-within:text-[var(--theme-primary,var(--color-brand))]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search papers"
              aria-label="Search papers"
              className="h-9 w-full rounded-[10px] border border-line bg-surface pl-9 pr-8 text-[14px] text-ink outline-none transition-[border,box-shadow] placeholder:text-subtle focus:border-[var(--theme-primary,var(--color-brand))] focus:shadow-[0_0_0_3px_var(--color-brand-50)]"
            />
            {query ? (
              <button type="button" aria-label="Clear search" onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle hover:text-ink-2">
                <LuX className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((value) => !value)}
            aria-label="Filters"
            aria-pressed={showFilters}
            className={`relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] transition-colors ${showFilters ? 'bg-brand-50 text-brand-600' : 'text-subtle hover:bg-line-2 hover:text-ink'}`}
          >
            <LuSlidersHorizontal className="h-4 w-4" />
            {filterCount ? <span className="absolute right-0.5 top-0.5 h-[15px] min-w-[15px] rounded-full bg-[var(--theme-primary,var(--color-brand))] px-1 text-[10px] font-semibold leading-[15px] text-white">{filterCount}</span> : null}
          </button>
        </form>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button type="button" aria-pressed={yearFrom === quickYear} onClick={() => updateFilters({ yearFrom: yearFrom === quickYear ? null : quickYear })} className={chip(yearFrom === quickYear)}>
            Since {quickYear}
          </button>
          <button type="button" aria-pressed={Boolean(filters.openAccess)} onClick={() => updateFilters({ openAccess: !filters.openAccess })} className={chip(Boolean(filters.openAccess))}>
            Open access
          </button>
          <button type="button" aria-pressed={(filters.minCited || 0) === 50} onClick={() => updateFilters({ minCited: (filters.minCited || 0) === 50 ? null : 50 })} className={chip((filters.minCited || 0) === 50)}>
            Cited 50+
          </button>
        </div>
        {showFilters ? (
          <div className="mt-2 space-y-2.5 rounded-[12px] bg-soft p-3 text-[12.5px]">
            <div>
              <div className="mb-1.5 font-semibold text-muted">Published</div>
              <div className="grid grid-cols-2 gap-1.5">
                {YEAR_PRESETS.map((preset) => (
                  <button key={preset.label} type="button" onClick={() => updateFilters({ yearFrom: preset.from })} className={option(yearFrom === preset.from)}>
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1.5 font-semibold text-muted">Cited by</div>
              <div className="flex gap-1.5">
                {CITED_PRESETS.map((value) => (
                  <button key={value} type="button" onClick={() => updateFilters({ minCited: value || null })} className={`flex-1 ${option((filters.minCited || 0) === value)}`}>
                    {value ? `${value}+` : 'All'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-1">
        {outOfCredits ? <CreditsUpsell feature="Find citations" isMobile={isMobile} onDismiss={() => setOutOfCredits(false)} /> : null}
        {showingStart ? (
          <div className="space-y-4 pt-1">
            {suggestions.length ? (
              <section>
                <h4 className="mb-1 px-1 text-[12px] font-medium text-subtle">Suggested</h4>
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setQuery(suggestion);
                      void run(suggestion, filters);
                    }}
                    className="flex w-full items-center gap-2 rounded-[10px] px-2 py-2 text-left text-[13.5px] text-ink-2 transition-colors hover:bg-soft hover:text-ink"
                  >
                    <LuSparkles className="h-[15px] w-[15px] shrink-0 text-[var(--theme-primary,var(--color-brand))]" />
                    <span className="truncate">{suggestion}</span>
                  </button>
                ))}
              </section>
            ) : null}
            {recent.length ? (
              <section>
                <h4 className="mb-1 px-1 text-[12px] font-medium text-subtle">Recent</h4>
                {recent.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setQuery(item);
                      void run(item, filters);
                    }}
                    className="flex w-full items-center gap-2 rounded-[10px] px-2 py-2 text-left text-[13.5px] text-ink-2 transition-colors hover:bg-soft hover:text-ink"
                  >
                    <LuHistory className="h-[15px] w-[15px] shrink-0 text-subtle" />
                    <span className="truncate">{item}</span>
                  </button>
                ))}
              </section>
            ) : null}
            {!suggestions.length ? (
              <section>
                <h4 className="mb-1 px-1 text-[12px] font-medium text-subtle">Try</h4>
                {EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => {
                      setQuery(example);
                      void run(example, filters);
                    }}
                    className="flex w-full items-center gap-2 rounded-[10px] px-2 py-2 text-left text-[13.5px] text-ink-2 transition-colors hover:bg-soft hover:text-ink"
                  >
                    <LuSearch className="h-[15px] w-[15px] shrink-0 text-subtle" />
                    <span className="truncate">{example}</span>
                  </button>
                ))}
              </section>
            ) : null}
          </div>
        ) : null}

        {error ? <div className="rounded-[12px] border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[13px] text-[#991b1b]">{error}</div> : null}
        {!showingStart && !loading && !error && !outOfCredits && results.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-subtle">No papers found</p>
        ) : null}

        {submitted && !paragraph && results.length > 0 ? (
          <div className="mb-1.5 flex items-center justify-between px-0.5 text-[12.5px] text-muted">
            <span>{total > results.length ? `${total.toLocaleString()} results` : `${results.length} result${results.length === 1 ? '' : 's'}`}</span>
            <select
              value={filters.sort || 'relevance'}
              onChange={(event) => updateFilters({ sort: event.target.value as PaperFilters['sort'] })}
              aria-label="Sort results"
              className="h-7 rounded-[8px] bg-transparent px-1 font-medium text-ink-2 outline-none hover:bg-line-2"
            >
              <option value="relevance">Most relevant</option>
              <option value="cited">Most cited</option>
              <option value="newest">Newest</option>
            </select>
          </div>
        ) : null}
        <div className="flex flex-col gap-2">
          {results.map((paper) => (
            <PaperCard
              key={`${paperKey(paper)}-${paper.id}`}
              paper={paper}
              actions={{
                onCite: () => cite(paper),
                citeLabel: paragraph ? 'Cite here' : onCite ? 'Cite' : 'Copy',
                onView: paper.doi || paper.oa_url ? () => window.open(paper.oa_url || (String(paper.doi).startsWith('http') ? String(paper.doi) : `https://doi.org/${paper.doi}`), '_blank', 'noopener') : undefined,
                onSave: async () => {
                  await save(paper);
                },
                saved: saved.has(paperKey(paper)),
              }}
            />
          ))}
        </div>
        {loading ? (
          <div className="flex flex-col gap-3 pt-3" aria-label="Loading papers">
            {[0, 1, 2].map((index) => (
              <div key={index} className="h-[112px] animate-pulse rounded-[12px] bg-soft" />
            ))}
          </div>
        ) : null}
        {!loading && submitted && results.length > 0 && results.length < total && page < 10 ? (
          <button
            type="button"
            onClick={() => void run(submitted, filters, page + 1)}
            className="mt-2 h-9 w-full rounded-[10px] text-[13px] font-medium text-muted hover:bg-soft hover:text-ink"
          >
            More results
          </button>
        ) : null}
      </div>
    </div>
  );
}
