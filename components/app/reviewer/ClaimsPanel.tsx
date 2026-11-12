'use client';

/** Claim check: each claim in a paragraph, set against papers from the scholarly and medical indexes. */
import { useState } from 'react';
import { LuLoaderCircle } from 'react-icons/lu';
import { api } from '@/lib/session';
import { Button, Card } from '@/components/app/ui';
import { Chips, CreditCost, SourceRow, Tag, creditsChanged, showError, type Source } from '@/components/app/research/parts';

type ClaimPaper = Omit<Source, 'marker' | 'kind' | 'more_authors' | 'providers' | 'tldr'>;
export type ClaimsResult = {
  task_id?: string; summary: string; counts: Record<string, number>;
  claims: { claim: string; verdict: 'supported' | 'partly' | 'not_supported' | 'no_evidence'; explanation: string; strength: 'strong' | 'moderate' | 'weak' | null; papers: ClaimPaper[]; cited: number[] }[];
};

const VERDICT = {
  supported: { label: 'Supported', tone: 'positive' }, partly: { label: 'Partly supported', tone: 'warning' },
  not_supported: { label: 'Not supported', tone: 'negative' }, no_evidence: { label: 'No evidence found', tone: 'neutral' },
} as const;
const STRENGTH = { strong: 'Strong evidence (meta-analysis, systematic review or trial)', moderate: 'Moderate evidence (trials, cohorts or reviews)', weak: 'Weak evidence (smaller or unclassified studies)' };

const asSource = (paper: ClaimPaper): Source => ({ ...paper, marker: `S${paper.n}`, kind: 'paper', more_authors: 0, providers: [], tldr: null });

export function ClaimResults({ result }: { result: ClaimsResult }) {
  return (
    <div className="space-y-4">
      <p className="text-[15px] font-semibold text-ink">{result.summary}</p>
      {result.claims.map((claim, index) => {
        const cited = claim.papers.filter((paper) => claim.cited.includes(paper.n));
        const others = claim.papers.filter((paper) => !claim.cited.includes(paper.n));
        return (
          <Card key={index} className="p-4">
            <p className="text-[15.5px] font-medium text-ink">{claim.claim}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Tag tone={VERDICT[claim.verdict].tone}>{VERDICT[claim.verdict].label}</Tag>
              {claim.strength && <Tag>{STRENGTH[claim.strength]}</Tag>}
            </div>
            <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">{claim.explanation}</p>
            {cited.length > 0 && <ul className="mt-2">{cited.map((paper) => <SourceRow key={paper.n} source={asSource(paper)} />)}</ul>}
            {others.length > 0 && (
              <details className="mt-1">
                <summary className="cursor-pointer text-[13.5px] font-semibold text-brand">Other papers found ({others.length})</summary>
                <ul className="mt-1">{others.map((paper) => <SourceRow key={paper.n} source={asSource(paper)} />)}</ul>
              </details>
            )}
          </Card>
        );
      })}
    </div>
  );
}

export function ClaimsPanel({ onDone, initialText = '' }: { onDone: (result: ClaimsResult) => void; initialText?: string }) {
  const [text, setText] = useState(initialText);
  const [groups, setGroups] = useState<('papers' | 'medical')[]>(['papers', 'medical']);
  const [busy, setBusy] = useState(false);
  const start = async () => {
    setBusy(true);
    try {
      onDone(await api<ClaimsResult>('/api/reviewer/claims', { method: 'POST', body: JSON.stringify({ text, groups }) }));
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
      creditsChanged();
    }
  };
  return (
    <Card className="p-5">
      <label htmlFor="claims" className="block text-[13px] font-semibold text-ink-2">Claims to check</label>
      <textarea id="claims" value={text} onChange={(event) => setText(event.target.value)} rows={7}
        placeholder="Paste a claim or a paragraph, e.g. Sleep after learning improves recall compared with the same time awake."
        className="mt-1.5 w-full rounded-xl border border-line px-3.5 py-3 text-[15px] leading-relaxed focus:border-brand focus:outline-none" />
      <p className="mt-1 text-[13px] text-muted">Up to 10 claims at a time. Each is checked against the papers found for it, from their abstracts. It does not check news or opinions.</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Chips label="Search in" value={groups} onChange={setGroups} options={[{ value: 'papers', label: 'All papers' }, { value: 'medical', label: 'Medical' }]} />
        <div className="ml-auto flex items-center gap-3">
          <CreditCost credits={2} />
          <Button variant="primary" onClick={start} disabled={busy || text.trim().length < 10}>{busy ? <><LuLoaderCircle className="h-4 w-4 animate-spin" />Checking…</> : 'Check claims'}</Button>
        </div>
      </div>
    </Card>
  );
}
