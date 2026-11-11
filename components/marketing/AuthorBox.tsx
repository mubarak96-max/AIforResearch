import Link from 'next/link';
import { authorPath, type Author } from '@/lib/authors';
import { focusRing } from './styles';

/** "About the author" card shown at the end of each article. */
export function AuthorBox({ author }: { author: Author }) {
  return (
    <aside aria-label="About the author" className="mt-16 flex flex-col gap-5 rounded-2xl border border-line p-6 sm:flex-row sm:p-7">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={author.image} alt={author.name} width={88} height={88} className="h-[88px] w-[88px] shrink-0 rounded-full object-cover" />
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[.12em] text-subtle">About the author</p>
        <p className="mt-1 text-[18px] font-bold tracking-[-0.01em] text-ink">
          <Link href={authorPath(author)} className={`rounded hover:text-brand ${focusRing}`}>{author.name}</Link>
        </p>
        <p className="text-[14px] text-muted">{author.jobTitle}</p>
        <p className="mt-3 text-[15.5px] leading-relaxed text-ink-2">{author.shortBio}</p>
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[14px]">
          <Link href={authorPath(author)} className={`rounded text-ink underline underline-offset-4 hover:text-brand ${focusRing}`}>More about {author.name.split(' ')[0]}</Link>
          {author.sameAs.map((profile) => (
            <a key={profile.url} href={profile.url} target="_blank" rel="noopener me" className={`rounded text-ink underline underline-offset-4 hover:text-brand ${focusRing}`}>{profile.label}</a>
          ))}
        </p>
      </div>
    </aside>
  );
}
