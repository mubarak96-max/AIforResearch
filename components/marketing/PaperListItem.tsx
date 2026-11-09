import Link from 'next/link';
import type { RichPaper } from '@/lib/server/slots/papers';
import { focusRing } from './styles';

const authorLine = (paper: RichPaper) => {
  const names = paper.authors.map((author) => author.name);
  const extra = (paper.extra_author_count ?? 0) > 0;
  if (names.length > 3 || extra) return `${names.slice(0, 3).join(', ')} et al.`;
  return names.join(', ');
};

/** One paper in a directory list: title (to its page), authors, venue and year, counts. */
export function PaperListItem({ paper, showAbstract = false }: { paper: RichPaper; showAbstract?: boolean }) {
  return (
    <article className="border-b border-line py-5">
      <h3 className="text-[17px] font-semibold leading-snug">
        <Link href={`/research/papers/${paper.id}`} className={`rounded text-ink hover:text-brand ${focusRing}`}>{paper.title}</Link>
      </h3>
      <p className="mt-1 text-[14px] text-muted">
        {[authorLine(paper), paper.venue, paper.year].filter(Boolean).join(' · ')}
      </p>
      {showAbstract && paper.abstract && <p className="mt-2 line-clamp-2 text-[14.5px] leading-[1.55] text-ink-2">{paper.abstract}</p>}
      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-subtle">
        <span>Cited by {(paper.cited_by_count ?? 0).toLocaleString('en-US')}</span>
        {paper.is_oa && <span className="text-positive">Open access</span>}
        {paper.is_retracted && <span className="font-medium text-red-700">Retracted</span>}
      </p>
    </article>
  );
}
